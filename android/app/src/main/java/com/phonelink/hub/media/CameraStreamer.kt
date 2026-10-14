package com.phonelink.hub.media

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.ImageFormat
import android.hardware.camera2.CameraCaptureSession
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraDevice
import android.hardware.camera2.CameraManager
import android.hardware.camera2.CameraMetadata
import android.hardware.camera2.CaptureRequest
import android.media.ImageReader
import android.os.Handler
import android.os.HandlerThread
import android.os.Looper
import android.util.Base64
import android.util.Log
import android.util.Size
import androidx.core.content.ContextCompat
import com.phonelink.hub.data.DevicePrefs
import org.json.JSONObject
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Streams live camera frames (5-30 FPS) with front/back lens selection and multiple quality tiers.
 * Used for live monitoring (pets, security, diagnostics).
 */
object CameraStreamer {

    private const val TAG = "CameraStreamer"

    private val isStreaming = AtomicBoolean(false)
    private val isFrameBusy = AtomicBoolean(false)

    private var handlerThread: HandlerThread? = null
    private var backgroundHandler: Handler? = null
    private var cameraDevice: CameraDevice? = null
    private var captureSession: CameraCaptureSession? = null
    private var imageReader: ImageReader? = null
    private var activeCallback: ((JSONObject) -> Unit)? = null

    val isActive: Boolean
        get() = isStreaming.get()

    @SuppressLint("MissingPermission")
    fun start(
        context: Context,
        facing: String = "back",
        quality: String = "low",
        requestedFps: Int = 15,
        onFrame: (JSONObject) -> Unit
    ) {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            Log.e(TAG, "CAMERA permission not granted")
            return
        }

        if (isStreaming.get()) {
            stop()
        }

        activeCallback = onFrame
        val fps = requestedFps.coerceIn(1, 30)
        val isFront = facing.equals("front", ignoreCase = true)
        val targetFacing = if (isFront) CameraCharacteristics.LENS_FACING_FRONT else CameraCharacteristics.LENS_FACING_BACK

        val cameraManager = context.getSystemService(Context.CAMERA_SERVICE) as? CameraManager ?: return

        var selectedCameraId: String? = null
        var selectedCharacteristics: CameraCharacteristics? = null

        try {
            for (id in cameraManager.cameraIdList) {
                val chars = cameraManager.getCameraCharacteristics(id)
                if (chars.get(CameraCharacteristics.LENS_FACING) == targetFacing) {
                    selectedCameraId = id
                    selectedCharacteristics = chars
                    break
                }
            }
            if (selectedCameraId == null && cameraManager.cameraIdList.isNotEmpty()) {
                selectedCameraId = cameraManager.cameraIdList[0]
                selectedCharacteristics = cameraManager.getCameraCharacteristics(selectedCameraId)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error enumerating camera IDs", e)
            return
        }

        if (selectedCameraId == null || selectedCharacteristics == null) return

        val map = selectedCharacteristics.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP)
        val sizes = map?.getOutputSizes(ImageFormat.JPEG) ?: emptyArray()

        // Choose resolution based on quality tier:
        // low: ~640x480 (fastest, smooth 15-30fps streaming)
        // medium: ~1280x720 (720p HD)
        // high: ~1920x1080 (1080p FHD)
        val targetSize: Size = when (quality.lowercase()) {
            "high" -> sizes.filter { it.width in 1280..1920 }.minByOrNull { kotlin.math.abs(it.width - 1920) }
                ?: sizes.firstOrNull() ?: Size(1280, 720)
            "medium" -> sizes.filter { it.width in 800..1280 }.minByOrNull { kotlin.math.abs(it.width - 1280) }
                ?: sizes.firstOrNull() ?: Size(800, 600)
            else -> sizes.filter { it.width in 480..800 }.minByOrNull { kotlin.math.abs(it.width - 640) }
                ?: sizes.lastOrNull() ?: Size(640, 480)
        }

        val thread = HandlerThread("CameraStreamThread").apply { start() }
        handlerThread = thread
        val handler = Handler(thread.looper)
        backgroundHandler = handler

        isStreaming.set(true)
        isFrameBusy.set(false)

        try {
            val reader = ImageReader.newInstance(targetSize.width, targetSize.height, ImageFormat.JPEG, 2)
            imageReader = reader

            var lastFrameTime = 0L
            val frameMinIntervalMs = 1000L / fps

            reader.setOnImageAvailableListener({ r ->
                if (!isStreaming.get()) return@setOnImageAvailableListener

                val now = System.currentTimeMillis()
                if (now - lastFrameTime < frameMinIntervalMs) {
                    try { r.acquireLatestImage()?.close() } catch (_: Exception) {}
                    return@setOnImageAvailableListener
                }

                if (!isFrameBusy.compareAndSet(false, true)) {
                    try { r.acquireLatestImage()?.close() } catch (_: Exception) {}
                    return@setOnImageAvailableListener
                }

                try {
                    val image = r.acquireLatestImage()
                    if (image != null) {
                        val buffer = image.planes[0].buffer
                        val bytes = ByteArray(buffer.remaining())
                        buffer.get(bytes)
                        image.close()

                        lastFrameTime = now
                        val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)

                        activeCallback?.invoke(JSONObject().apply {
                            put("deviceId", DevicePrefs.deviceId)
                            put("data", base64)
                            put("mimeType", "image/jpeg")
                            put("facing", if (isFront) "front" else "back")
                            put("quality", quality)
                            put("width", targetSize.width as Int)
                            put("height", targetSize.height as Int)
                            put("fps", fps as Int)
                            put("sizeBytes", bytes.size as Int)
                            put("timestamp", now as Long)
                        })
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Frame stream error: ${e.message}")
                } finally {
                    isFrameBusy.set(false)
                }
            }, handler)

            val sessionCallback = object : CameraCaptureSession.StateCallback() {
                override fun onConfigured(session: CameraCaptureSession) {
                    if (!isStreaming.get()) return
                    captureSession = session
                    val device = cameraDevice ?: return
                    try {
                        val builder = device.createCaptureRequest(CameraDevice.TEMPLATE_PREVIEW).apply {
                            addTarget(reader.surface)
                            set(CaptureRequest.CONTROL_MODE, CameraMetadata.CONTROL_MODE_AUTO)
                            set(CaptureRequest.CONTROL_AF_MODE, CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_PICTURE)
                            set(CaptureRequest.CONTROL_AE_MODE, CaptureRequest.CONTROL_AE_MODE_ON)

                            val sensorOrientation = selectedCharacteristics.get(CameraCharacteristics.SENSOR_ORIENTATION) ?: 0
                            set(CaptureRequest.JPEG_ORIENTATION, sensorOrientation)
                        }

                        session.setRepeatingRequest(builder.build(), null, handler)
                        Log.d(TAG, "Live camera streaming started ($facing, $quality, ${targetSize.width}x${targetSize.height} @ ${fps}fps)")
                    } catch (e: Exception) {
                        Log.e(TAG, "Error setting repeating preview request", e)
                        stop()
                    }
                }

                override fun onConfigureFailed(session: CameraCaptureSession) {
                    Log.e(TAG, "CameraCaptureSession configuration failed for streaming")
                    stop()
                }
            }

            val deviceStateCallback = object : CameraDevice.StateCallback() {
                override fun onOpened(camera: CameraDevice) {
                    if (!isStreaming.get()) {
                        camera.close()
                        return
                    }
                    cameraDevice = camera
                    try {
                        @Suppress("DEPRECATION")
                        camera.createCaptureSession(listOf(reader.surface), sessionCallback, handler)
                    } catch (e: Exception) {
                        Log.e(TAG, "Error creating camera stream session", e)
                        stop()
                    }
                }

                override fun onDisconnected(camera: CameraDevice) {
                    Log.w(TAG, "Camera disconnected during stream")
                    stop()
                }

                override fun onError(camera: CameraDevice, error: Int) {
                    Log.e(TAG, "Camera error during stream: $error")
                    stop()
                }
            }

            cameraManager.openCamera(selectedCameraId, deviceStateCallback, handler)

        } catch (e: Exception) {
            Log.e(TAG, "Exception starting camera stream", e)
            stop()
        }
    }

    fun stop() {
        if (!isStreaming.compareAndSet(true, false)) return

        Log.d(TAG, "Stopping camera stream")
        try { captureSession?.stopRepeating() } catch (_: Exception) {}
        try { captureSession?.close() } catch (_: Exception) {}
        captureSession = null

        try { cameraDevice?.close() } catch (_: Exception) {}
        cameraDevice = null

        try { imageReader?.close() } catch (_: Exception) {}
        imageReader = null

        try { handlerThread?.quitSafely() } catch (_: Exception) {}
        handlerThread = null
        backgroundHandler = null
        activeCallback = null
        isFrameBusy.set(false)
    }
}

