package com.phonelink.hub.remote

import android.app.NotificationManager
import android.content.Context
import android.os.Build
import android.util.Log
import com.phonelink.hub.data.DevicePrefs
import org.json.JSONObject

/**
 * Reads and overrides Do Not Disturb (DND) mode remotely.
 */
object DndController {
    private const val TAG = "DndController"

    fun getDndStatus(context: Context): JSONObject {
        val result = JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
        }
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        if (nm == null) {
            result.put("success", false)
            result.put("error", "NotificationManager unavailable")
            return result
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val hasAccess = nm.isNotificationPolicyAccessGranted
                result.put("hasPolicyAccess", hasAccess)

                val filter = nm.currentInterruptionFilter
                val mode = when (filter) {
                    NotificationManager.INTERRUPTION_FILTER_ALL -> "OFF"
                    NotificationManager.INTERRUPTION_FILTER_PRIORITY -> "PRIORITY"
                    NotificationManager.INTERRUPTION_FILTER_NONE -> "TOTAL_SILENCE"
                    NotificationManager.INTERRUPTION_FILTER_ALARMS -> "ALARMS_ONLY"
                    else -> "UNKNOWN"
                }
                result.put("mode", mode)
                result.put("isDndActive", filter != NotificationManager.INTERRUPTION_FILTER_ALL)
                result.put("success", true)
            } else {
                result.put("mode", "OFF")
                result.put("isDndActive", false)
                result.put("hasPolicyAccess", true)
                result.put("success", true)
            }
        } catch (e: Exception) {
            Log.e(TAG, "getDndStatus failed", e)
            result.put("success", false)
            result.put("error", e.message ?: "Failed to get DND status")
        }
        return result
    }

    fun setDndMode(context: Context, mode: String): JSONObject {
        val result = JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("targetMode", mode)
        }
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        if (nm == null) {
            result.put("success", false)
            result.put("error", "NotificationManager unavailable")
            return result
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (!nm.isNotificationPolicyAccessGranted) {
                    result.put("success", false)
                    result.put("error", "DND Policy access not granted in phone settings")
                    return result
                }

                val filter = when (mode.uppercase()) {
                    "OFF", "NORMAL", "ALL" -> NotificationManager.INTERRUPTION_FILTER_ALL
                    "PRIORITY" -> NotificationManager.INTERRUPTION_FILTER_PRIORITY
                    "TOTAL_SILENCE", "NONE", "SILENT" -> NotificationManager.INTERRUPTION_FILTER_NONE
                    "ALARMS" -> NotificationManager.INTERRUPTION_FILTER_ALARMS
                    else -> NotificationManager.INTERRUPTION_FILTER_ALL
                }

                nm.setInterruptionFilter(filter)
                result.put("success", true)
                result.put("appliedMode", mode.uppercase())
                Log.i(TAG, "DND filter applied: $filter")
            } else {
                result.put("success", true)
            }
        } catch (e: Exception) {
            Log.e(TAG, "setDndMode failed", e)
            result.put("success", false)
            result.put("error", e.message ?: "Failed to set DND mode")
        }
        return result
    }
}

