package com.phonelink.hub.remote

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.util.Log
import com.phonelink.hub.data.DevicePrefs
import org.json.JSONArray
import org.json.JSONObject
import android.os.Vibrator as SystemVibrator

object VibratorController {
    private const val TAG = "VibratorController"

    fun vibrate(context: Context, payload: JSONObject): JSONObject {
        val durationMs = payload.optLong("durationMs", 500L)
        val patternArray: JSONArray? = payload.optJSONArray("pattern")

        return try {
            val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? SystemVibrator
            if (vibrator == null || !vibrator.hasVibrator()) {
                return JSONObject().apply {
                    put("deviceId", DevicePrefs.deviceId)
                    put("success", false)
                    put("error", "No vibrator hardware available")
                }
            }

            if (patternArray != null && patternArray.length() > 0) {
                val pattern = LongArray(patternArray.length()) { i -> patternArray.getLong(i) }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1))
                } else {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(pattern, -1)
                }
            } else {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createOneShot(durationMs, VibrationEffect.DEFAULT_AMPLITUDE))
                } else {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(durationMs)
                }
            }
            Log.d(TAG, "Vibrated successfully (duration: $durationMs ms)")
            JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("success", true)
                put("durationMs", durationMs)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Vibration failed", e)
            JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("success", false)
                put("error", e.message ?: "Vibration failed")
            }
        }
    }
}

