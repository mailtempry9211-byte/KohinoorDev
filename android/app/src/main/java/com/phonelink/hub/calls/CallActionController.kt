package com.phonelink.hub.calls

import android.annotation.SuppressLint
import android.content.Context
import android.media.AudioManager
import android.os.Build
import android.telecom.TelecomManager
import android.util.Log
import com.phonelink.hub.data.DevicePrefs
import org.json.JSONObject

/**
 * Remotely answers or declines incoming phone calls.
 */
object CallActionController {
    private const val TAG = "CallActionController"

    @SuppressLint("MissingPermission")
    fun answerCall(context: Context, speakerOn: Boolean = true): JSONObject {
        val result = JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("action", "answer")
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val tm = context.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager
                if (tm != null) {
                    tm.acceptRingingCall()
                    if (speakerOn) {
                        try {
                            val am = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
                            am?.mode = AudioManager.MODE_IN_CALL
                            am?.isSpeakerphoneOn = true
                        } catch (e: Exception) {
                            Log.w(TAG, "Speakerphone toggle warning: ${e.message}")
                        }
                    }
                    result.put("success", true)
                    return result
                }
            }
            result.put("success", false)
            result.put("error", "Answering calls requires Android 8.0+ and phone permissions")
        } catch (e: Exception) {
            Log.e(TAG, "answerCall failed", e)
            result.put("success", false)
            result.put("error", e.message ?: "Failed to answer call")
        }
        return result
    }

    @SuppressLint("MissingPermission")
    fun endCall(context: Context): JSONObject {
        val result = JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("action", "decline")
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val tm = context.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager
                if (tm != null) {
                    val ended = tm.endCall()
                    result.put("success", ended)
                    return result
                }
            }
            result.put("success", false)
            result.put("error", "Declining call requires Android 9.0+")
        } catch (e: Exception) {
            Log.e(TAG, "endCall failed", e)
            result.put("success", false)
            result.put("error", e.message ?: "Failed to decline call")
        }
        return result
    }

    fun makeCall(context: Context, number: String): JSONObject {
        val result = JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("action", "call")
            put("number", number)
        }
        try {
            val cleanNumber = number.filter { it.isDigit() || it == '+' || it == '*' || it == '#' }
            if (cleanNumber.isBlank()) {
                result.put("success", false)
                result.put("error", "Phone number is empty or invalid")
                return result
            }

            val hasCallPerm = androidx.core.content.ContextCompat.checkSelfPermission(
                context,
                android.Manifest.permission.CALL_PHONE
            ) == android.content.pm.PackageManager.PERMISSION_GRANTED

            val intent = if (hasCallPerm) {
                android.content.Intent(android.content.Intent.ACTION_CALL, android.net.Uri.parse("tel:$cleanNumber"))
            } else {
                android.content.Intent(android.content.Intent.ACTION_DIAL, android.net.Uri.parse("tel:$cleanNumber"))
            }
            intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
            result.put("success", true)
            result.put("mode", if (hasCallPerm) "direct_call" else "dialer_opened")
        } catch (e: Exception) {
            Log.e(TAG, "makeCall failed", e)
            result.put("success", false)
            result.put("error", e.message ?: "Failed to initiate call")
        }
        return result
    }
}

