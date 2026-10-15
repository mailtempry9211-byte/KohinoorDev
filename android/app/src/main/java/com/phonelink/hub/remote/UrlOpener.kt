package com.phonelink.hub.remote

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import com.phonelink.hub.data.DevicePrefs
import org.json.JSONObject

/**
 * Remotely opens a web URL or link in the phone's default browser.
 */
object UrlOpener {
    private const val TAG = "UrlOpener"

    fun open(context: Context, rawUrl: String): JSONObject {
        var cleanUrl = rawUrl.trim()
        if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
            cleanUrl = "https://$cleanUrl"
        }

        return try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(cleanUrl)).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            Log.i(TAG, "Opened URL on phone: $cleanUrl")

            JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("success", true)
                put("url", cleanUrl)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to open URL", e)
            JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("success", false)
                put("error", e.message ?: "Failed to open URL")
            }
        }
    }
}

