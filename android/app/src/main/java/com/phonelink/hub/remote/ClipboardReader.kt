package com.phonelink.hub.remote

import android.content.ClipboardManager
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.phonelink.hub.data.DevicePrefs
import org.json.JSONObject

object ClipboardReader {
    private const val TAG = "ClipboardReader"
    private val mainHandler = Handler(Looper.getMainLooper())
    private var clipListener: ClipboardManager.OnPrimaryClipChangedListener? = null
    private var lastText: String? = null

    fun readCurrentText(context: Context, callback: (JSONObject) -> Unit) {
        mainHandler.post {
            try {
                val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
                val clip = cm?.primaryClip
                val text = if (clip != null && clip.itemCount > 0) {
                    clip.getItemAt(0)?.coerceToText(context)?.toString() ?: ""
                } else {
                    ""
                }
                Log.d(TAG, "Clipboard read length: ${text.length}")
                callback(JSONObject().apply {
                    put("deviceId", DevicePrefs.deviceId)
                    put("text", text)
                    put("success", true)
                })
            } catch (e: Exception) {
                Log.e(TAG, "Clipboard read error", e)
                callback(JSONObject().apply {
                    put("deviceId", DevicePrefs.deviceId)
                    put("text", "")
                    put("success", false)
                    put("error", e.message ?: "Failed to read clipboard")
                })
            }
        }
    }

    fun setCaptureEnabled(context: Context, enabled: Boolean, onUpdate: (String) -> Unit) {
        mainHandler.post {
            val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager ?: return@post
            if (enabled) {
                if (clipListener == null) {
                    clipListener = ClipboardManager.OnPrimaryClipChangedListener {
                        try {
                            val clip = cm.primaryClip
                            if (clip != null && clip.itemCount > 0) {
                                val text = clip.getItemAt(0)?.coerceToText(context)?.toString()
                                if (!text.isNullOrBlank() && text != lastText) {
                                    lastText = text
                                    Log.d(TAG, "Captured clipboard change (${text.length} chars)")
                                    onUpdate(text)
                                }
                            }
                        } catch (e: Exception) {
                            Log.w(TAG, "Error in primary clip listener", e)
                        }
                    }
                    cm.addPrimaryClipChangedListener(clipListener)
                    Log.d(TAG, "Clipboard capture listener registered")
                }
            } else {
                clipListener?.let {
                    cm.removePrimaryClipChangedListener(it)
                    clipListener = null
                    Log.d(TAG, "Clipboard capture listener unregistered")
                }
            }
        }
    }

    fun release(context: Context) {
        setCaptureEnabled(context, false) {}
    }
}

