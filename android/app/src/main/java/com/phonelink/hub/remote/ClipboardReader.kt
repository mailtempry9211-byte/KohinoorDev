package com.phonelink.hub.remote

import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
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

    private var pendingReadCallback: ((JSONObject) -> Unit)? = null
    private var activeCaptureCallback: ((String) -> Unit)? = null

    fun onFocusReadComplete(text: String) {
        mainHandler.post {
            lastText = text
            val cb = pendingReadCallback
            pendingReadCallback = null
            cb?.invoke(JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("text", text)
                put("success", true)
            })

            if (text.isNotBlank()) {
                activeCaptureCallback?.invoke(text)
            }
        }
    }

    fun readCurrentText(context: Context, callback: (JSONObject) -> Unit) {
        mainHandler.post {
            try {
                val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
                val clip = cm?.primaryClip
                val directText = if (clip != null && clip.itemCount > 0) {
                    clip.getItemAt(0)?.coerceToText(context)?.toString() ?: ""
                } else {
                    ""
                }

                if (directText.isNotEmpty()) {
                    lastText = directText
                    callback(JSONObject().apply {
                        put("deviceId", DevicePrefs.deviceId)
                        put("text", directText)
                        put("success", true)
                    })
                    return@post
                }

                // If empty or null on Android 10+ (API 29+), background apps cannot access clipboard.
                // Launch transparent focus activity to legally retrieve primaryClip.
                pendingReadCallback = callback
                val intent = Intent(context, ClipboardFocusActivity::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NO_ANIMATION)
                }
                context.startActivity(intent)

                // Timeout fallback if activity never opened
                mainHandler.postDelayed({
                    val pending = pendingReadCallback
                    if (pending != null) {
                        pendingReadCallback = null
                        pending.invoke(JSONObject().apply {
                            put("deviceId", DevicePrefs.deviceId)
                            put("text", lastText ?: "")
                            put("success", true)
                        })
                    }
                }, 2000)

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
            activeCaptureCallback = if (enabled) onUpdate else null

            if (enabled) {
                if (clipListener == null) {
                    clipListener = ClipboardManager.OnPrimaryClipChangedListener {
                        try {
                            val clip = cm.primaryClip
                            val text = if (clip != null && clip.itemCount > 0) {
                                clip.getItemAt(0)?.coerceToText(context)?.toString()
                            } else null

                            if (!text.isNullOrBlank() && text != lastText) {
                                lastText = text
                                Log.d(TAG, "Direct captured clipboard change (${text.length} chars)")
                                activeCaptureCallback?.invoke(text)
                            } else {
                                // Background listener might have received clip event without focus.
                                // Briefly launch focus activity to retrieve text.
                                val intent = Intent(context, ClipboardFocusActivity::class.java).apply {
                                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NO_ANIMATION)
                                }
                                context.startActivity(intent)
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
