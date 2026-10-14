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
 * Headless camera capture for remote diagnostics.
 * Uses Camera2 API directly without requiring an active Activity or View preview.
 */
object CameraCapture {

    private const val TAG = "CameraCapture"
    private const val TIMEOUT_MS = 12_000L

    private val isCapturing = AtomicBoolean(false)

    @SuppressLint("MissingPermission")
    fun capture(context: Context, facing: String, callback: (JSONObject) -> Unit) {
        // Permission check
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            Log.e(TAG, "CAMERA permission not granted")
            callback(JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("success", false)
                put("error", "CAMERA permission not granted on device")
            })
            return
        }

        if (!isCapturing.compareAndSet(false, true)) {
            Log.w(TAG, "Camera capture already in progress")
            callback(JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("success", false)
                put("error", "Camera capture already in progress")
            })
            return
        }

        val cameraManager = context.getSystemService(Context.CAMERA_SERVICE) as? CameraManager
        if (cameraManager == null) {
            isCapturing.set(false)
            callback(JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("success", false)
                put("error", "CameraManager unavailable")
            })
            return
        }

        val isFront = facing.equals("front", ignoreCase = true)
        val targetFacing = if (isFront) {
            CameraCharacteristics.LENS_FACING_FRONT
        } else {
            CameraCharacteristics.LENS_FACING_BACK
        }

        var selectedCameraId: String? = null
        var selectedCharacteristics: CameraCharacteristics? = null

        try {
            for (id in cameraManager.cameraIdList) {
                val chars = cameraManager.getCameraCharacteristics(id)
                val lensFacing = chars.get(CameraCharacteristics.LENS_FACING)
                if (lensFacing == targetFacing) {
                    selectedCameraId = id
                    selectedCharacteristics = chars
                    break
                }
            }

            // Fallback to first available camera if requested facing not found
            if (selectedCameraId == null && cameraManager.cameraIdList.isNotEmpty()) {
                selectedCameraId = cameraManager.cameraIdList[0]
                selectedCharacteristics = cameraManager.getCameraCharacteristics(selectedCameraId)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error enumerating cameras", e)
            isCapturing.set(false)
            callback(JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("success", false)
                put("error", "Failed to access camera characteristics: ${e.message}")
            })
            return
        }

        if (selectedCameraId == null || selectedCharacteristics == null) {
            isCapturing.set(false)
            callback(JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("success", false)
                put("error", "No suitable camera found on device")
            })
            return
        }

        val handlerThread = HandlerThread("CameraCaptureThread").apply { start() }
        val backgroundHandler = Handler(handlerThread.looper)
        val mainHandler = Handler(Looper.getMainLooper())

        val map = selectedCharacteristics.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP)
        val jpegSizes: Array<Size> = map?.getOutputSizes(ImageFormat.JPEG) ?: emptyArray()

        // Pick a balanced resolution (~1280x720 or closest <= 1920px wide) for fast base64 upload
        val targetSize = jpegSizes
            .filter { it.width in 640..1920 && it.height in 480..1440 }
            .minByOrNull { kotlin.math.abs(it.width * it.height - 1280 * 720) }
            ?: jpegSizes.firstOrNull()
            ?: Size(1280, 720)

        var imageReader: ImageReader? = null
        var cameraDevice: CameraDevice? = null
        var captureSession: CameraCaptureSession? = null
        var hasReplied = false

        fun cleanup() {
            try { captureSession?.close() } catch (_: Exception) {}
            try { cameraDevice?.close() } catch (_: Exception) {}
            try { imageReader?.close() } catch (_: Exception) {}
            try {
                handlerThread.quitSafely()
            } catch (_: Exception) {}
            isCapturing.set(false)
        }

        val timeoutRunnable = Runnable {
            if (!hasReplied) {
                hasReplied = true
                Log.w(TAG, "Camera capture timed out after ${TIMEOUT_MS}ms")
                cleanup()
                callback(JSONObject().apply {
                    put("deviceId", DevicePrefs.deviceId)
                    put("success", false)
                    put("error", "Camera capture timed out")
                })
            }
        }
        mainHandler.postDelayed(timeoutRunnable, TIMEOUT_MS)

        try {
            imageReader = ImageReader.newInstance(targetSize.width, targetSize.height, ImageFormat.JPEG, 1)
            imageReader.setOnImageAvailableListener({ reader ->
                try {
                    val image = reader.acquireLatestImage()
                    if (image != null) {
                        val planes = image.planes
                        val buffer = planes[0].buffer
                        val bytes = ByteArray(buffer.remaining())
                        buffer.get(bytes)
                        image.close()

                        val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                        Log.d(TAG, "Image captured: ${bytes.size} bytes (${targetSize.width}x${targetSize.height})")

                        mainHandler.removeCallbacks(timeoutRunnable)
                        if (!hasReplied) {
                            hasReplied = true
                            cleanup()
                            callback(JSONObject().apply {
                                put("deviceId", DevicePrefs.deviceId)
                                put("success", true)
                                put("facing", if (isFront) "front" else "back")
                                put("mimeType", "image/jpeg")
                                put("data", base64)
                                put("width", targetSize.width)
                                put("height", targetSize.height)
                                put("sizeBytes", bytes.size)
                                put("timestamp", System.currentTimeMillis())
                            })
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error acquiring captured image", e)
                    mainHandler.removeCallbacks(timeoutRunnable)
                    if (!hasReplied) {
                        hasReplied = true
                        cleanup()
                        callback(JSONObject().apply {
                            put("deviceId", DevicePrefs.deviceId)
                            put("success", false)
                            put("error", "Error reading captured frame: ${e.message}")
                        })
                    }
                }
            }, backgroundHandler)

            val sessionCallback = object : CameraCaptureSession.StateCallback() {
                override fun onConfigured(session: CameraCaptureSession) {
                    captureSession = session
                    val device = cameraDevice ?: return
                    try {
                        val captureBuilder = device.createCaptureRequest(CameraDevice.TEMPLATE_STILL_CAPTURE).apply {
                            addTarget(imageReader.surface)
                            set(CaptureRequest.CONTROL_MODE, CameraMetadata.CONTROL_MODE_AUTO)
                            set(CaptureRequest.CONTROL_AF_MODE, CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_PICTURE)
                            set(CaptureRequest.CONTROL_AE_MODE, CaptureRequest.CONTROL_AE_MODE_ON)

                            // Apply sensor orientation for proper image rotation
                            val sensorOrientation = selectedCharacteristics.get(CameraCharacteristics.SENSOR_ORIENTATION) ?: 0
                            set(CaptureRequest.JPEG_ORIENTATION, sensorOrientation)
                        }

                        session.capture(captureBuilder.build(), null, backgroundHandler)
                        Log.d(TAG, "Still capture request dispatched")
                    } catch (e: Exception) {
                        Log.e(TAG, "Error dispatching capture request", e)
                        mainHandler.removeCallbacks(timeoutRunnable)
                        if (!hasReplied) {
                            hasReplied = true
                            cleanup()
                            callback(JSONObject().apply {
                                put("deviceId", DevicePrefs.deviceId)
                                put("success", false)
                                put("error", "Failed to capture picture: ${e.message}")
                            })
                        }
                    }
                }

                override fun onConfigureFailed(session: CameraCaptureSession) {
                    Log.e(TAG, "CameraCaptureSession configuration failed")
                    mainHandler.removeCallbacks(timeoutRunnable)
                    if (!hasReplied) {
                        hasReplied = true
                        cleanup()
                        callback(JSONObject().apply {
                            put("deviceId", DevicePrefs.deviceId)
                            put("success", false)
                            put("error", "Camera session configuration failed")
                        })
                    }
                }
            }

            val deviceStateCallback = object : CameraDevice.StateCallback() {
                override fun onOpened(camera: CameraDevice) {
                    cameraDevice = camera
                    try {
                        val surface = imageReader.surface
                        @Suppress("DEPRECATION")
                        camera.createCaptureSession(listOf(surface), sessionCallback, backgroundHandler)
                    } catch (e: Exception) {
                        Log.e(TAG, "Error creating capture session", e)
                        mainHandler.removeCallbacks(timeoutRunnable)
                        if (!hasReplied) {
                            hasReplied = true
                            cleanup()
                            callback(JSONObject().apply {
                                put("deviceId", DevicePrefs.deviceId)
                                put("success", false)
                                put("error", "Failed to create camera session: ${e.message}")
                            })
                        }
                    }
                }

                override fun onDisconnected(camera: CameraDevice) {
                    Log.w(TAG, "Camera disconnected")
                    mainHandler.removeCallbacks(timeoutRunnable)
                    if (!hasReplied) {
                        hasReplied = true
                        cleanup()
                        callback(JSONObject().apply {
                            put("deviceId", DevicePrefs.deviceId)
                            put("success", false)
                            put("error", "Camera was disconnected")
                        })
                    }
                }

                override fun onError(camera: CameraDevice, error: Int) {
                    Log.e(TAG, "Camera device error: $error")
                    mainHandler.removeCallbacks(timeoutRunnable)
                    if (!hasReplied) {
                        hasReplied = true
                        cleanup()
                        callback(JSONObject().apply {
                            put("deviceId", DevicePrefs.deviceId)
                            put("success", false)
                            put("error", "Camera device error code: $error")
                        })
                    }
                }
            }

            cameraManager.openCamera(selectedCameraId, deviceStateCallback, backgroundHandler)

        } catch (e: Exception) {
            Log.e(TAG, "Exception opening camera", e)
            mainHandler.removeCallbacks(timeoutRunnable)
            if (!hasReplied) {
                hasReplied = true
                cleanup()
                callback(JSONObject().apply {
                    put("deviceId", DevicePrefs.deviceId)
                    put("success", false)
                    put("error", "Error initiating camera capture: ${e.message}")
                })
            }
        }
    }
}
