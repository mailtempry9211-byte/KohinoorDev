package com.phonelink.hub.media

import android.content.Context
import android.content.res.Resources
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.ImageReader
import android.os.Handler
import android.os.HandlerThread
import android.os.Looper
import android.util.Base64
import android.util.Log
import com.phonelink.hub.data.DevicePrefs
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Streams low-latency screen frames (~1-5 fps) over WebSocket for live preview.
 * Reuses MediaProjectionHolder for projection access.
 */
object ScreenRecorder {

    private const val TAG = "ScreenRecorder"

    private val isRunning = AtomicBoolean(false)
    private var handlerThread: HandlerThread? = null
    private var backgroundHandler: Handler? = null
    private var virtualDisplay: VirtualDisplay? = null
    private var imageReader: ImageReader? = null
    private var frameRunnable: Runnable? = null
    private var activeCallback: ((JSONObject) -> Unit)? = null

    val isActive: Boolean
        get() = isRunning.get()

    fun start(context: Context, requestedFps: Int = 2, onFrame: (JSONObject) -> Unit) {
        val fps = requestedFps.coerceIn(1, 5)
        val intervalMs = (1000L / fps)

        if (isRunning.get()) {
            Log.d(TAG, "Screen recorder already active, updating callback and fps")
            activeCallback = onFrame
            return
        }

        activeCallback = onFrame

        if (!MediaProjectionHolder.hasConsent) {
            Log.d(TAG, "MediaProjection consent required for screen streaming")
            ScreenshotConsentActivity.launch(context)
            // Wait for consent or user interaction
            Handler(Looper.getMainLooper()).postDelayed({
                if (!isRunning.get() && MediaProjectionHolder.hasConsent) {
                    startStreaming(context, intervalMs, fps)
                }
            }, 1500)
            return
        }

        startStreaming(context, intervalMs, fps)
    }

    private fun startStreaming(context: Context, intervalMs: Long, fps: Int) {
        val proj = MediaProjectionHolder.getOrCreateProjection(context)
        if (proj == null) {
            Log.e(TAG, "Could not acquire MediaProjection")
            return
        }

        isRunning.set(true)

        val metrics = Resources.system.displayMetrics
        val screenWidth = metrics.widthPixels
        val screenHeight = metrics.heightPixels
        val density = metrics.densityDpi

        // Scale down to 540p or 720p for fast transmission and low overhead
        val targetWidth = if (screenWidth > 540) 540 else screenWidth
        val targetHeight = (screenHeight.toDouble() * (targetWidth.toDouble() / screenWidth.toDouble())).toInt()

        val thread = HandlerThread("ScreenStreamThread").apply { start() }
        handlerThread = thread
        val handler = Handler(thread.looper)
        backgroundHandler = handler

        val reader = ImageReader.newInstance(targetWidth, targetHeight, PixelFormat.RGBA_8888, 2)
        imageReader = reader

        try {
            virtualDisplay = proj.createVirtualDisplay(
                "PhoneLink_Stream",
                targetWidth,
                targetHeight,
                density,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                reader.surface,
                null,
                handler
            )
            Log.d(TAG, "Virtual display initialized for screen recording ($targetWidth x $targetHeight @ ${fps}fps)")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to create virtual display for streaming", e)
            stop()
            return
        }

        val runnable = object : Runnable {
            override fun run() {
                if (!isRunning.get()) return

                try {
                    val image = reader.acquireLatestImage()
                    if (image != null) {
                        val planes = image.planes
                        val buffer = planes[0].buffer
                        val pixelStride = planes[0].pixelStride
                        val rowStride = planes[0].rowStride
                        val rowPadding = rowStride - pixelStride * targetWidth

                        val rawBitmap = Bitmap.createBitmap(
                            targetWidth + rowPadding / pixelStride,
                            targetHeight,
                            Bitmap.Config.ARGB_8888
                        )
                        rawBitmap.copyPixelsFromBuffer(buffer)
                        image.close()

                        val finalBitmap = if (rowPadding > 0) {
                            Bitmap.createBitmap(rawBitmap, 0, 0, targetWidth, targetHeight).also {
                                rawBitmap.recycle()
                            }
                        } else {
                            rawBitmap
                        }

                        val outStream = ByteArrayOutputStream()
                        finalBitmap.compress(Bitmap.CompressFormat.JPEG, 65, outStream)
                        finalBitmap.recycle()

                        val bytes = outStream.toByteArray()
                        val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)

                        activeCallback?.invoke(JSONObject().apply {
                            put("deviceId", DevicePrefs.deviceId)
                            put("data", base64)
                            put("mimeType", "image/jpeg")
                            put("width", targetWidth)
                            put("height", targetHeight)
                            put("fps", fps)
                            put("sizeBytes", bytes.size)
                            put("timestamp", System.currentTimeMillis())
                        })
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Frame capture error: ${e.message}")
                }

                if (isRunning.get()) {
                    handler.postDelayed(this, intervalMs)
                }
            }
        }

        frameRunnable = runnable
        handler.postDelayed(runnable, intervalMs)
    }

    fun stop() {
        if (!isRunning.compareAndSet(true, false)) return

        Log.d(TAG, "Stopping screen recorder")
        frameRunnable?.let { backgroundHandler?.removeCallbacks(it) }
        frameRunnable = null

        try { virtualDisplay?.release() } catch (_: Exception) {}
        virtualDisplay = null

        try { imageReader?.close() } catch (_: Exception) {}
        imageReader = null

        try { handlerThread?.quitSafely() } catch (_: Exception) {}
        handlerThread = null
        backgroundHandler = null
        activeCallback = null
    }
}
