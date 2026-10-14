package com.phonelink.hub.remote

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.util.Log
import com.phonelink.hub.data.DevicePrefs
import com.phonelink.hub.receiver.PhoneDeviceAdminReceiver
import org.json.JSONObject

object LockController {
    private const val TAG = "LockController"

    fun isAdminActive(context: Context): Boolean {
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager ?: return false
        val compName = ComponentName(context, PhoneDeviceAdminReceiver::class.java)
        return dpm.isAdminActive(compName)
    }

    fun getAdminIntent(context: Context): Intent {
        val compName = ComponentName(context, PhoneDeviceAdminReceiver::class.java)
        return Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
            putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, compName)
            putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION, "Required to remotely lock the screen from the dashboard.")
        }
    }

    fun lockDevice(context: Context): JSONObject {
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager
        val compName = ComponentName(context, PhoneDeviceAdminReceiver::class.java)

        if (dpm == null || !dpm.isAdminActive(compName)) {
            Log.w(TAG, "Lock failed: Device Admin is not active")
            return JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("success", false)
                put("adminRequired", true)
                put("error", "Device Admin permission is not activated on this phone. Please tap 'Enable Remote Screen Lock' in the app.")
            }
        }

        return try {
            dpm.lockNow()
            Log.i(TAG, "Device screen locked successfully via DevicePolicyManager")
            JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("success", true)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error locking device", e)
            JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("success", false)
                put("error", e.message ?: "Failed to lock device")
            }
        }
    }
}
