package com.phonelink.hub.remote

import android.annotation.SuppressLint
import android.content.Context
import android.os.PowerManager
import android.util.Log
import com.phonelink.hub.data.DevicePrefs
import org.json.JSONObject

/**
 * Remotely wakes up the phone display from sleep using PowerManager WakeLock.
 */
object ScreenWakeController {
    private const val TAG = "ScreenWakeController"

    @SuppressLint("InvalidWakeLockTag")
    fun wakeScreen(context: Context): JSONObject {
        val result = JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
        }
        try {
            val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
            if (pm == null) {
                result.put("success", false)
                result.put("error", "PowerManager service unavailable")
                return result
            }

            @Suppress("DEPRECATION")
            val wakeLock = pm.newWakeLock(
                PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP or PowerManager.ON_AFTER_RELEASE,
                "PhoneLink:ScreenWakeLock"
            )
            wakeLock.acquire(4000)
            result.put("success", true)
            result.put("message", "Screen wake signal dispatched")
            Log.i(TAG, "Screen wakeLock successfully triggered")
        } catch (e: Exception) {
            Log.e(TAG, "Screen wake failed", e)
            result.put("success", false)
            result.put("error", e.message ?: "Failed to wake screen")
        }
        return result
    }
}

