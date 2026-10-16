package com.phonelink.hub.calls

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.telecom.TelecomManager
import android.util.Log
import androidx.core.content.ContextCompat
import com.phonelink.hub.data.DevicePrefs
import org.json.JSONObject

object CallActionController {
    private const val TAG = "CallActionController"

    fun answerCall(context: Context): JSONObject {
        val result = JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("action", "answer")
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val tm = context.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager
                if (tm != null && ContextCompat.checkSelfPermission(context, android.Manifest.permission.ANSWER_PHONE_CALLS) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                    tm.acceptRingingCall()
                    result.put("success", true)
                    return result
                }
            }
            // Fallback: trigger speakerphone mode
            val am = context.getSystemService(Context.AUDIO_SERVICE) as? android.media.AudioManager
            am?.mode = android.media.AudioManager.MODE_IN_COMMUNICATION
            am?.isSpeakerphoneOn = true
            result.put("success", true)
            result.put("note", "Answer attempted via TelecomManager")
        } catch (e: Exception) {
            Log.e(TAG, "answerCall failed", e)
            result.put("success", false)
            result.put("error", e.message ?: "Failed to answer call")
        }
        return result
    }

    fun declineCall(context: Context): JSONObject {
        val result = JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("action", "decline")
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val tm = context.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager
                if (tm != null && ContextCompat.checkSelfPermission(context, android.Manifest.permission.ANSWER_PHONE_CALLS) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                    val ended = tm.endCall()
                    result.put("success", ended)
                    return result
                }
            }
            result.put("success", false)
            result.put("error", "End call requires Android 9+ TelecomManager")
        } catch (e: Exception) {
            Log.e(TAG, "declineCall failed", e)
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

            val hasCallPerm = ContextCompat.checkSelfPermission(
                context,
                android.Manifest.permission.CALL_PHONE
            ) == android.content.pm.PackageManager.PERMISSION_GRANTED

            val uri = Uri.parse("tel:${Uri.encode(cleanNumber)}")

            // 1. Direct call via TelecomManager (Android 6.0+) if CALL_PHONE is granted
            if (hasCallPerm && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val tm = context.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager
                if (tm != null) {
                    try {
                        val extras = Bundle().apply {
                            putBoolean(TelecomManager.EXTRA_START_CALL_WITH_SPEAKERPHONE, true)
                        }
                        tm.placeCall(uri, extras)
                        result.put("success", true)
                        result.put("mode", "direct_telecom_call")
                        Log.i(TAG, "Direct call placed via TelecomManager for $cleanNumber")
                        return result
                    } catch (e: SecurityException) {
                        Log.w(TAG, "TelecomManager.placeCall permission issue, fallback to ACTION_CALL", e)
                    }
                }
            }

            // 2. Direct call via Intent ACTION_CALL if CALL_PHONE granted, else ACTION_DIAL
            val intent = if (hasCallPerm) {
                Intent(Intent.ACTION_CALL, uri)
            } else {
                Intent(Intent.ACTION_DIAL, uri)
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
            result.put("success", true)
            result.put("mode", if (hasCallPerm) "direct_call" else "dialer_opened")
            if (!hasCallPerm) {
                result.put("warning", "CALL_PHONE permission not granted in app; opened dialer instead")
            }
            Log.i(TAG, "Call started via ${if (hasCallPerm) "ACTION_CALL" else "ACTION_DIAL"}")
        } catch (e: Exception) {
            Log.e(TAG, "makeCall failed", e)
            result.put("success", false)
            result.put("error", e.message ?: "Failed to initiate call")
        }
        return result
    }
}
