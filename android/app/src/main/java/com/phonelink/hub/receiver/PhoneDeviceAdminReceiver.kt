package com.phonelink.hub.receiver

import android.app.admin.DeviceAdminReceiver
import android.app.admin.DevicePolicyManager
import android.content.Context
import android.content.Intent
import android.util.Log
import com.phonelink.hub.data.DevicePrefs
import com.phonelink.hub.data.Events
import com.phonelink.hub.notifications.WebSocketHolder
import org.json.JSONObject

class PhoneDeviceAdminReceiver : DeviceAdminReceiver() {
    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
        Log.i(TAG, "Device Admin enabled")
    }

    override fun onDisabled(context: Context, intent: Intent) {
        super.onDisabled(context, intent)
        Log.i(TAG, "Device Admin disabled")
    }

    override fun onPasswordFailed(context: Context, intent: Intent) {
        super.onPasswordFailed(context, intent)
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager
        val attempts = dpm?.currentFailedPasswordAttempts ?: 1
        Log.w(TAG, "INTRUDER ALERT: Failed lockscreen PIN/pattern attempt #$attempts")

        try {
            val payload = JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("attempts", attempts)
                put("timestamp", System.currentTimeMillis())
                put("message", "Incorrect lockscreen password/pattern entered ($attempts failed attempt(s))")
            }
            WebSocketHolder.get()?.send(Events.INTRUDER_ALERT, payload)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to broadcast intruder alert", e)
        }
    }

    override fun onPasswordSucceeded(context: Context, intent: Intent) {
        super.onPasswordSucceeded(context, intent)
        Log.i(TAG, "Lockscreen unlocked successfully")
    }

    companion object {
        private const val TAG = "PhoneDeviceAdmin"
    }
}
