package com.phonelink.hub.remote

import android.content.Context
import android.media.AudioManager
import android.util.Log
import com.phonelink.hub.data.DevicePrefs
import org.json.JSONObject

/**
 * Reads and adjusts phone audio stream volumes and ringer profiles remotely.
 */
object VolumeController {
    private const val TAG = "VolumeController"

    fun getVolumeInfo(context: Context): JSONObject {
        val am = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
        if (am == null) {
            return JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("error", "AudioManager unavailable")
            }
        }

        val ringerModeStr = when (am.ringerMode) {
            AudioManager.RINGER_MODE_SILENT -> "silent"
            AudioManager.RINGER_MODE_VIBRATE -> "vibrate"
            else -> "normal"
        }

        return JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("mediaVolume", am.getStreamVolume(AudioManager.STREAM_MUSIC))
            put("mediaMax", am.getStreamMaxVolume(AudioManager.STREAM_MUSIC))
            put("ringVolume", am.getStreamVolume(AudioManager.STREAM_RING))
            put("ringMax", am.getStreamMaxVolume(AudioManager.STREAM_RING))
            put("alarmVolume", am.getStreamVolume(AudioManager.STREAM_ALARM))
            put("alarmMax", am.getStreamMaxVolume(AudioManager.STREAM_ALARM))
            put("notificationVolume", am.getStreamVolume(AudioManager.STREAM_NOTIFICATION))
            put("notificationMax", am.getStreamMaxVolume(AudioManager.STREAM_NOTIFICATION))
            put("ringerMode", ringerModeStr)
            put("success", true)
        }
    }

    fun setVolume(context: Context, stream: String, level: Int): JSONObject {
        val am = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
            ?: return JSONObject().apply { put("success", false); put("error", "AudioManager unavailable") }

        val streamType = when (stream.lowercase()) {
            "ring" -> AudioManager.STREAM_RING
            "alarm" -> AudioManager.STREAM_ALARM
            "notification" -> AudioManager.STREAM_NOTIFICATION
            else -> AudioManager.STREAM_MUSIC
        }

        val max = am.getStreamMaxVolume(streamType)
        val clamped = level.coerceIn(0, max)

        return try {
            am.setStreamVolume(streamType, clamped, 0)
            Log.d(TAG, "Stream $stream set to $clamped/$max")
            getVolumeInfo(context)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to set volume", e)
            JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("success", false)
                put("error", e.message ?: "Failed to set volume")
            }
        }
    }

    fun setRingerMode(context: Context, mode: String): JSONObject {
        val am = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
            ?: return JSONObject().apply { put("success", false); put("error", "AudioManager unavailable") }

        val targetMode = when (mode.lowercase()) {
            "silent" -> AudioManager.RINGER_MODE_SILENT
            "vibrate" -> AudioManager.RINGER_MODE_VIBRATE
            else -> AudioManager.RINGER_MODE_NORMAL
        }

        return try {
            am.ringerMode = targetMode
            Log.d(TAG, "Ringer mode set to $mode")
            getVolumeInfo(context)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to set ringer mode", e)
            JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("success", false)
                put("error", e.message ?: "Failed to set ringer mode")
            }
        }
    }
}
