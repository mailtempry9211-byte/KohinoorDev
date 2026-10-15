package com.phonelink.hub.remote

import android.app.ActivityOptions
import android.app.PendingIntent
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.phonelink.hub.accessibility.FindPhoneAccessibilityService
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
                launchFocusActivity(context)

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
                                launchFocusActivity(context)
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

    private fun launchFocusActivity(context: Context) {
        val intent = Intent(context, ClipboardFocusActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NO_ANIMATION)
        }

        // Exemption 1: Accessibility service can start activity from background
        val acc = FindPhoneAccessibilityService.instance
        if (acc != null) {
            try {
                Log.d(TAG, "Launching focus activity via active AccessibilityService")
                acc.startActivity(intent)
                return
            } catch (e: Exception) {
                Log.w(TAG, "Failed to start activity via AccessibilityService", e)
            }
        }

        // Exemption 2: Android 14 PendingIntent with MODE_BACKGROUND_ACTIVITY_START_ALLOWED
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            try {
                val options = ActivityOptions.makeBasic().apply {
                    pendingIntentBackgroundActivityStartMode = ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED
                }
                val pi = PendingIntent.getActivity(
                    context,
                    8832,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                    options.toBundle()
                )
                pi.send()
                Log.d(TAG, "Launched focus activity via PendingIntent background start mode")
                return
            } catch (e: Exception) {
                Log.w(TAG, "Failed to send PendingIntent with background activity start mode", e)
            }
        }

        // Fallback: direct context start
        try {
            context.startActivity(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start ClipboardFocusActivity directly", e)
        }
    }

    fun release(context: Context) {
        setCaptureEnabled(context, false) {}
    }
}
