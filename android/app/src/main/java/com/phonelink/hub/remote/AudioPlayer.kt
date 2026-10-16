package com.phonelink.hub.remote

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.util.Log
import com.phonelink.hub.data.DevicePrefs
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

class AudioPlayer(private val context: Context) {
    private var mediaPlayer: MediaPlayer? = null
    private var activeFis: FileInputStream? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private val executor = Executors.newSingleThreadExecutor()

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .followRedirects(true)
        .followSslRedirects(true)
        .build()

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

        // Run network downloading or base64 decoding off the main thread
        executor.execute {
            try {
                val tempFile = File(context.cacheDir, "temp_remote_play.mp3")
                if (tempFile.exists()) {
                    try { tempFile.delete() } catch (_: Exception) {}
                }

                if (!base64Data.isNullOrBlank()) {
                    val cleanBase64 = if (base64Data.contains(",")) base64Data.substringAfter(",") else base64Data
                    val bytes = Base64.decode(cleanBase64, Base64.DEFAULT)
                    tempFile.writeBytes(bytes)
                } else if (!url.isNullOrBlank()) {
                    if (url.startsWith("http://", ignoreCase = true) || url.startsWith("https://", ignoreCase = true)) {
                        val req = Request.Builder()
                            .url(url)
                            .header("User-Agent", "Mozilla/5.0 (Linux; Android PhoneLinkHub)")
                            .build()
                        val response = httpClient.newCall(req).execute()
                        if (!response.isSuccessful) {
                            callback(JSONObject().apply {
                                put("deviceId", DevicePrefs.deviceId)
                                put("success", false)
                                put("url", url)
                                put("error", "Download failed HTTP ${response.code}: ${response.message}")
                            })
                            return@execute
                        }
                        response.body?.byteStream()?.use { input ->
                            FileOutputStream(tempFile).use { output ->
                                input.copyTo(output)
                            }
                        } ?: run {
                            callback(JSONObject().apply {
                                put("deviceId", DevicePrefs.deviceId)
                                put("success", false)
                                put("url", url)
                                put("error", "Empty response body from audio URL")
                            })
                            return@execute
                        }
                    } else {
                        // Local path or file:// URI
                        val cleanPath = url.removePrefix("file://")
                        val localFile = File(cleanPath)
                        if (!localFile.exists() || !localFile.canRead()) {
                            callback(JSONObject().apply {
                                put("deviceId", DevicePrefs.deviceId)
                                put("success", false)
                                put("url", url)
                                put("error", "Local audio file not found or inaccessible: $cleanPath")
                            })
                            return@execute
                        }
                        localFile.copyTo(tempFile, overwrite = true)
                    }
                }

                if (!tempFile.exists() || tempFile.length() == 0L) {
                    callback(JSONObject().apply {
                        put("deviceId", DevicePrefs.deviceId)
                        put("success", false)
                        put("url", url)
                        put("error", "Failed to stage audio file for playback")
                    })
                    return@execute
                }

                // Switch to main thread to initialize and start MediaPlayer
                mainHandler.post {
                    stopCurrent()
                    try {
                        // Ensure alarm/audio volume is audible
                        try {
                            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
                            val currentVol = audioManager?.getStreamVolume(AudioManager.STREAM_ALARM) ?: 0
                            if (currentVol == 0) {
                                val maxVol = audioManager?.getStreamMaxVolume(AudioManager.STREAM_ALARM) ?: 10
                                audioManager?.setStreamVolume(AudioManager.STREAM_ALARM, (maxVol * 0.75).toInt().coerceAtLeast(1), 0)
                            }
                        } catch (e: Exception) {
                            Log.w(TAG, "Could not adjust audio volume", e)
                        }

                        val fis = FileInputStream(tempFile)
                        activeFis = fis

                        mediaPlayer = MediaPlayer().apply {
                            setAudioAttributes(
                                AudioAttributes.Builder()
                                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                                    .setUsage(AudioAttributes.USAGE_ALARM)
                                    .build()
                            )
                            setDataSource(fis.fd)
                            isLooping = loop
                            setOnPreparedListener { mp ->
                                mp.start()
                                Log.d(TAG, "Audio started playing (loop: $loop)")
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
                        Log.e(TAG, "Failed to initialize MediaPlayer", e)
                        callback(JSONObject().apply {
                            put("deviceId", DevicePrefs.deviceId)
                            put("success", false)
                            put("url", url)
                            put("error", e.message ?: "Failed to start audio")
                        })
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to download/prepare audio", e)
                callback(JSONObject().apply {
                    put("deviceId", DevicePrefs.deviceId)
                    put("success", false)
                    put("url", url)
                    put("error", "Audio preparation failed: ${e.message}")
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

        try {
            activeFis?.close()
        } catch (_: Exception) {}
        activeFis = null
    }

    fun release() {
        stopCurrent()
        try {
            executor.shutdownNow()
        } catch (_: Exception) {}
    }

    companion object {
        private const val TAG = "AudioPlayer"
    }
}
