package com.phonelink.hub.remote

import android.content.Context
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.util.Log
import com.phonelink.hub.data.DevicePrefs
import org.json.JSONObject

/**
 * Remotely toggles phone flashlight (torch) ON or OFF.
 */
object TorchController {
    private const val TAG = "TorchController"
    var isTorchOn = false

    fun toggle(context: Context): JSONObject {
        return toggleTorch(context, !isTorchOn)
    }

    fun toggleTorch(context: Context, enabled: Boolean): JSONObject {
        val cameraManager = context.getSystemService(Context.CAMERA_SERVICE) as? CameraManager
        if (cameraManager == null) {
            return JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("success", false)
                put("error", "CameraManager service not available on device")
            }
        }

        try {
            var selectedId: String? = null
            for (id in cameraManager.cameraIdList) {
                val chars = cameraManager.getCameraCharacteristics(id)
                val hasFlash = chars.get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true
                val facing = chars.get(CameraCharacteristics.LENS_FACING)
                if (hasFlash && facing == CameraCharacteristics.LENS_FACING_BACK) {
                    selectedId = id
                    break
                }
                if (hasFlash && selectedId == null) {
                    selectedId = id
                }
            }

            if (selectedId == null) {
                return JSONObject().apply {
                    put("deviceId", DevicePrefs.deviceId)
                    put("success", false)
                    put("error", "No camera with flashlight/torch found on device")
                }
            }

            cameraManager.setTorchMode(selectedId, enabled)
            isTorchOn = enabled
            Log.i(TAG, "Torch set to $enabled on camera $selectedId")

            return JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("success", true)
                put("torchOn", enabled)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to set torch mode", e)
            return JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("success", false)
                put("error", e.message ?: "Failed to toggle flashlight")
            }
        }
    }

    private var strobeThread: Thread? = null
    @Volatile
    private var isStrobeRunning = false

    fun toggleStrobe(context: Context, enabled: Boolean, speedMs: Long = 150L, durationSec: Int = 30): JSONObject {
        isStrobeRunning = false
        strobeThread?.interrupt()
        strobeThread = null

        val cameraManager = context.getSystemService(Context.CAMERA_SERVICE) as? CameraManager
        if (cameraManager == null) {
            return JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("success", false)
                put("error", "CameraManager service not available")
            }
        }

        var selectedId: String? = null
        try {
            for (id in cameraManager.cameraIdList) {
                val chars = cameraManager.getCameraCharacteristics(id)
                val hasFlash = chars.get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true
                val facing = chars.get(CameraCharacteristics.LENS_FACING)
                if (hasFlash && facing == CameraCharacteristics.LENS_FACING_BACK) {
                    selectedId = id
                    break
                }
                if (hasFlash && selectedId == null) selectedId = id
            }
        } catch (e: Exception) {
            Log.e(TAG, "getCameraIdList error", e)
        }

        if (selectedId == null) {
            return JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("success", false)
                put("error", "No flash found on device")
            }
        }

        val targetCameraId = selectedId

        if (!enabled) {
            try {
                cameraManager.setTorchMode(targetCameraId, false)
                isTorchOn = false
            } catch (_: Exception) {}
            return JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("success", true)
                put("strobeActive", false)
            }
        }

        isStrobeRunning = true
        val thread = Thread {
            val endTime = System.currentTimeMillis() + (durationSec * 1000L)
            var state = false
            try {
                while (isStrobeRunning && System.currentTimeMillis() < endTime) {
                    state = !state
                    cameraManager.setTorchMode(targetCameraId, state)
                    Thread.sleep(speedMs.coerceIn(50L, 1000L))
                }
            } catch (_: InterruptedException) {
            } catch (e: Exception) {
                Log.e(TAG, "Strobe loop exception", e)
            } finally {
                try {
                    cameraManager.setTorchMode(targetCameraId, false)
                } catch (_: Exception) {}
                isStrobeRunning = false
            }
        }
        strobeThread = thread
        thread.start()

        return JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("success", true)
            put("strobeActive", true)
            put("durationSec", durationSec)
        }
    }
}

