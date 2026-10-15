package com.phonelink.hub.remote

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.phonelink.hub.data.DevicePrefs
import org.json.JSONObject

/**
 * Injects text from the PC dashboard directly into the phone's system clipboard.
 */
object ClipboardWriter {
    private const val TAG = "ClipboardWriter"

    fun writeText(context: Context, text: String, callback: (JSONObject) -> Unit) {
        Handler(Looper.getMainLooper()).post {
            try {
                val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
                if (cm == null) {
                    callback(JSONObject().apply {
                        put("deviceId", DevicePrefs.deviceId)
                        put("success", false)
                        put("error", "ClipboardManager unavailable")
                    })
                    return@post
                }

                val clip = ClipData.newPlainText("PhoneLink PC", text)
                cm.setPrimaryClip(clip)
                Log.i(TAG, "Injected text into phone clipboard (${text.length} chars)")

                callback(JSONObject().apply {
                    put("deviceId", DevicePrefs.deviceId)
                    put("success", true)
                    put("text", text)
                    put("timestamp", System.currentTimeMillis())
                })
            } catch (e: Exception) {
                Log.e(TAG, "Failed to write clipboard", e)
                callback(JSONObject().apply {
                    put("deviceId", DevicePrefs.deviceId)
                    put("success", false)
                    put("error", e.message ?: "Failed to write clipboard")
                })
            }
        }
    }
}

