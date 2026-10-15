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
    private var isTorchOn = false

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
}

