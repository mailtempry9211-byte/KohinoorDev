package com.phonelink.hub.media

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.res.Resources
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.Looper
import android.util.Base64
import android.util.Log
import androidx.core.app.NotificationCompat
import com.phonelink.hub.R
import com.phonelink.hub.data.DevicePrefs
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Captures a single screenshot using MediaProjection.
 * If consent is not yet granted, shows an interactive heads-up notification
 * and prompts the user via ScreenshotConsentActivity.
 */
object ScreenshotController {

    private const val TAG = "ScreenshotController"
    private const val CHANNEL_ID = "screenshot_consent_channel"
    private const val NOTIFICATION_ID = 5402
    private const val TIMEOUT_MS = 25_000L

    private val isBusy = AtomicBoolean(false)
    private var pendingCallback: ((JSONObject) -> Unit)? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private var timeoutRunnable: Runnable? = null

    fun capture(context: Context, callback: (JSONObject) -> Unit) {
        if (!isBusy.compareAndSet(false, true)) {
            callback(JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("success", false)
                put("error", "Screenshot capture already in progress")
            })
            return
        }

        pendingCallback = callback

        timeoutRunnable = Runnable {
            if (isBusy.get()) {
                Log.w(TAG, "Screenshot request timed out waiting for approval")
                dismissNotification(context)
                isBusy.set(false)
                val cb = pendingCallback
                pendingCallback = null
                cb?.invoke(JSONObject().apply {
                    put("deviceId", DevicePrefs.deviceId)
                    put("success", false)
                    put("error", "Screenshot request timed out waiting for user approval")
                })
            }
        }
        mainHandler.postDelayed(timeoutRunnable!!, TIMEOUT_MS)

        // 1. Accessibility Service Hardware Screenshot (Android 11+, zero consent needed!)
        val accService = com.phonelink.hub.accessibility.FindPhoneAccessibilityService.instance
        if (accService != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Log.d(TAG, "Attempting screenshot via privileged AccessibilityService...")
            accService.takeScreenshot { bmp ->
                if (bmp != null) {
                    mainHandler.post { dispatchSuccessBitmap(bmp) }
                } else {
                    mainHandler.post { fallbackMediaProjectionCapture(context) }
                }
            }
            return
        }

        // 2. Active ScreenRecorder live view frame reuse (zero duplicate virtual display)
        if (ScreenRecorder.isActive) {
            val cached = ScreenRecorder.getLatestFrameBitmap()
            if (cached != null) {
                Log.d(TAG, "Reusing active ScreenRecorder frame for screenshot")
                dispatchSuccessBitmap(cached)
                return
            }
        }

        // 3. MediaProjection fallback
        fallbackMediaProjectionCapture(context)
    }

    private fun fallbackMediaProjectionCapture(context: Context) {
        if (MediaProjectionHolder.hasConsent && MediaProjectionHolder.projection != null) {
            performCapture(context)
        } else {
            postConsentNotification(context)
            ScreenshotConsentActivity.launch(context)
        }
    }

    private fun dispatchSuccessBitmap(bitmap: Bitmap) {
        try {
            val screenWidth = bitmap.width
            val screenHeight = bitmap.height
            val targetWidth = if (screenWidth > 1080) 1080 else screenWidth
            val targetHeight = (screenHeight.toDouble() * (targetWidth.toDouble() / screenWidth.toDouble())).toInt()

            val scaled = if (targetWidth != screenWidth) {
                Bitmap.createScaledBitmap(bitmap, targetWidth, targetHeight, true).also {
                    bitmap.recycle()
                }
            } else {
                bitmap
            }

            val outStream = ByteArrayOutputStream()
            scaled.compress(Bitmap.CompressFormat.JPEG, 80, outStream)
            scaled.recycle()

            val bytes = outStream.toByteArray()
            val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
            Log.d(TAG, "Screenshot dispatched successfully: ${bytes.size} bytes (${targetWidth}x$targetHeight)")

            dismissNotification(null)
            timeoutRunnable?.let { mainHandler.removeCallbacks(it) }
            isBusy.set(false)
            val cb = pendingCallback
            pendingCallback = null
            cb?.invoke(JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("success", true)
                put("mimeType", "image/jpeg")
                put("data", base64)
                put("width", targetWidth)
                put("height", targetHeight)
                put("sizeBytes", bytes.size)
                put("timestamp", System.currentTimeMillis())
            })
        } catch (e: Exception) {
            Log.e(TAG, "Failed to encode screenshot bitmap", e)
            dismissNotification(null)
            timeoutRunnable?.let { mainHandler.removeCallbacks(it) }
            isBusy.set(false)
            val cb = pendingCallback
            pendingCallback = null
            cb?.invoke(JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("success", false)
                put("error", e.message ?: "Failed to process screenshot bitmap")
            })
        }
    }

    fun onConsentGranted(context: Context) {
        dismissNotification(context)
        if (isBusy.get()) {
            performCapture(context)
        }
    }

    fun onConsentDenied() {
        dismissNotification(null)
        timeoutRunnable?.let { mainHandler.removeCallbacks(it) }
        isBusy.set(false)
        val cb = pendingCallback
        pendingCallback = null
        cb?.invoke(JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("success", false)
            put("error", "Screen capture permission denied by user")
        })
    }

    private fun performCapture(context: Context) {
        val proj = MediaProjectionHolder.getOrCreateProjection(context)
        if (proj == null) {
            Log.w(TAG, "Active projection is null, re-prompting consent activity")
            postConsentNotification(context)
            ScreenshotConsentActivity.launch(context)
            return
        }

        val metrics = context.resources.displayMetrics
        val screenWidth = metrics.widthPixels
        val screenHeight = metrics.heightPixels
        val density = metrics.densityDpi

        // Scale down to max 1080p width to optimize base64 size and transmission
        val targetWidth: Int = if (screenWidth > 1080) 1080 else screenWidth
        val targetHeight: Int = (screenHeight.toDouble() * (targetWidth.toDouble() / screenWidth.toDouble())).toInt()

        val thread = HandlerThread("ScreenshotThread").apply { start() }
        val handler = Handler(thread.looper)

        val imageReader = ImageReader.newInstance(targetWidth, targetHeight, PixelFormat.RGBA_8888, 2)
        var virtualDisplay: VirtualDisplay? = null
        var hasCaptured = false

        fun cleanup() {
            try { virtualDisplay?.release() } catch (_: Exception) {}
            try { imageReader.close() } catch (_: Exception) {}
            try { thread.quitSafely() } catch (_: Exception) {}
            timeoutRunnable?.let { mainHandler.removeCallbacks(it) }
            isBusy.set(false)
        }

        val processImage: (android.media.Image) -> Unit = { image ->
            if (!hasCaptured) {
                hasCaptured = true
                try {
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
                    finalBitmap.compress(Bitmap.CompressFormat.JPEG, 80, outStream)
                    finalBitmap.recycle()

                    val bytes = outStream.toByteArray()
                    val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                    Log.d(TAG, "Screenshot captured successfully: ${bytes.size} bytes (${targetWidth}x$targetHeight)")

                    cleanup()

                    val cb = pendingCallback
                    pendingCallback = null
                    cb?.invoke(JSONObject().apply {
                        put("deviceId", DevicePrefs.deviceId)
                        put("success", true)
                        put("mimeType", "image/jpeg")
                        put("data", base64)
                        put("width", targetWidth as Int)
                        put("height", targetHeight as Int)
                        put("sizeBytes", bytes.size as Int)
                        put("timestamp", System.currentTimeMillis() as Long)
                    })
                } catch (e: Exception) {
                    Log.e(TAG, "Error encoding screenshot frame", e)
                    cleanup()
                    val cb = pendingCallback
                    pendingCallback = null
                    cb?.invoke(JSONObject().apply {
                        put("deviceId", DevicePrefs.deviceId)
                        put("success", false)
                        put("error", "Error capturing frame: ${e.message}")
                    })
                }
            } else {
                try { image.close() } catch (_: Exception) {}
            }
        }

        imageReader.setOnImageAvailableListener({ reader ->
            if (hasCaptured) return@setOnImageAvailableListener
            try {
                val image = reader.acquireLatestImage() ?: return@setOnImageAvailableListener
                processImage(image)
            } catch (e: Exception) {
                Log.w(TAG, "onImageAvailable exception", e)
            }
        }, handler)

        try {
            virtualDisplay = proj.createVirtualDisplay(
                "PhoneLink_Screenshot",
                targetWidth,
                targetHeight,
                density,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                imageReader.surface,
                null,
                handler
            )
            Log.d(TAG, "Virtual display created for screenshot ($targetWidth x $targetHeight)")

            // Immediate and delayed frame acquisition in case screen buffer is static
            handler.postDelayed({
                if (!hasCaptured) {
                    try {
                        val img = imageReader.acquireLatestImage()
                        if (img != null) processImage(img)
                    } catch (_: Exception) {}
                }
            }, 250)

            handler.postDelayed({
                if (!hasCaptured) {
                    try {
                        val img = imageReader.acquireLatestImage()
                        if (img != null) processImage(img)
                    } catch (_: Exception) {}
                }
            }, 750)

        } catch (e: Exception) {
            Log.e(TAG, "Error creating virtual display", e)
            cleanup()
            val cb = pendingCallback
            pendingCallback = null
            cb?.invoke(JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("success", false)
                put("error", "Failed to create virtual display: ${e.message}")
            })
        }
    }

    private fun postConsentNotification(context: Context) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return

        val channel = NotificationChannel(
            CHANNEL_ID,
            "Screen Capture Consent",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Prompts when remote screen capture is requested"
        }
        manager.createNotificationChannel(channel)

        val intent = Intent(context, ScreenshotConsentActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        val pi = PendingIntent.getActivity(
            context,
            5402,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notif = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("Remote Screenshot Request")
            .setContentText("Tap to approve remote screen view from Phone Link")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(true)
            .setContentIntent(pi)
            .build()

        manager.notify(NOTIFICATION_ID, notif)
    }

    private fun dismissNotification(context: Context?) {
        val ctx = context ?: return
        val manager = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        manager?.cancel(NOTIFICATION_ID)
    }
}
