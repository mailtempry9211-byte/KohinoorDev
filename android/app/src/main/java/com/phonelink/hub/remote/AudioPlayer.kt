package com.phonelink.hub.remote

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.phonelink.hub.data.DevicePrefs
import org.json.JSONObject

class AudioPlayer(private val context: Context) {
    private var mediaPlayer: MediaPlayer? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    fun play(payload: JSONObject, callback: (JSONObject) -> Unit) {
        val url = payload.optString("url")
        val base64Data = payload.optString("data")
        val loop = payload.optBoolean("loop", false)

        if (url.isNullOrBlank() && base64Data.isNullOrBlank()) {
            callback(JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("success", false)
                put("error", "Audio URL or audio file data is required")
            })
            return
        }

        mainHandler.post {
            stopCurrent()
            try {
                // Ensure alarm/audio volume is audible
                try {
                    val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? android.media.AudioManager
                    val currentVol = audioManager?.getStreamVolume(android.media.AudioManager.STREAM_ALARM) ?: 0
                    if (currentVol == 0) {
                        val maxVol = audioManager?.getStreamMaxVolume(android.media.AudioManager.STREAM_ALARM) ?: 10
                        audioManager?.setStreamVolume(android.media.AudioManager.STREAM_ALARM, (maxVol * 0.75).toInt().coerceAtLeast(1), 0)
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Could not adjust audio volume", e)
                }

                val sourcePath = if (!base64Data.isNullOrBlank()) {
                    val cleanBase64 = if (base64Data.contains(",")) base64Data.substringAfter(",") else base64Data
                    val bytes = android.util.Base64.decode(cleanBase64, android.util.Base64.DEFAULT)
                    val tempFile = java.io.File(context.cacheDir, "temp_remote_play.mp3")
                    tempFile.writeBytes(bytes)
                    tempFile.absolutePath
                } else {
                    url
                }

                mediaPlayer = MediaPlayer().apply {
                    setAudioAttributes(
                        AudioAttributes.Builder()
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .setUsage(AudioAttributes.USAGE_ALARM)
                            .build()
                    )
                    setDataSource(sourcePath)
                    isLooping = loop
                    setOnPreparedListener { mp ->
                        mp.start()
                        Log.d(TAG, "Audio started playing: $sourcePath (loop: $loop)")
                        callback(JSONObject().apply {
                            put("deviceId", DevicePrefs.deviceId)
                            put("success", true)
                            put("url", if (!url.isNullOrBlank()) url else "Uploaded Audio")
                            put("loop", loop)
                            put("playing", true)
                        })
                    }
                    setOnCompletionListener {
                        Log.d(TAG, "Audio playback completed: $url")
                        callback(JSONObject().apply {
                            put("deviceId", DevicePrefs.deviceId)
                            put("success", true)
                            put("url", url)
                            put("playing", false)
                        })
                        stopCurrent()
                    }
                    setOnErrorListener { _, what, extra ->
                        Log.e(TAG, "MediaPlayer error: what=$what extra=$extra")
                        callback(JSONObject().apply {
                            put("deviceId", DevicePrefs.deviceId)
                            put("success", false)
                            put("url", url)
                            put("error", "Playback error code: $what, $extra")
                        })
                        stopCurrent()
                        true
                    }
                    prepareAsync()
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start audio playback", e)
                callback(JSONObject().apply {
                    put("deviceId", DevicePrefs.deviceId)
                    put("success", false)
                    put("url", url)
                    put("error", e.message ?: "Failed to start audio")
                })
            }
        }
    }

    fun stop(callback: ((JSONObject) -> Unit)? = null) {
        mainHandler.post {
            stopCurrent()
            callback?.invoke(JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("success", true)
                put("playing", false)
            })
        }
    }

    private fun stopCurrent() {
        try {
            mediaPlayer?.let {
                if (it.isPlaying) it.stop()
                it.reset()
                it.release()
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error stopping MediaPlayer", e)
        } finally {
            mediaPlayer = null
        }
    }

    fun release() {
        stopCurrent()
    }

    companion object {
        private const val TAG = "AudioPlayer"
    }
}

