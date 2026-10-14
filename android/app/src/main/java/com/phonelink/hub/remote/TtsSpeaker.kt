package com.phonelink.hub.remote

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.speech.tts.TextToSpeech
import android.util.Log
import com.phonelink.hub.data.DevicePrefs
import org.json.JSONObject
import java.util.Locale

class TtsSpeaker(private val context: Context) {
    private var tts: TextToSpeech? = null
    private var isInitialized = false
    private val pendingQueue = mutableListOf<PendingTts>()
    private val mainHandler = Handler(Looper.getMainLooper())

    private data class PendingTts(
        val text: String,
        val speed: Float,
        val pitch: Float,
        val callback: (JSONObject) -> Unit
    )

    private fun initTts() {
        if (tts != null) return
        mainHandler.post {
            tts = TextToSpeech(context.applicationContext) { status ->
                if (status == TextToSpeech.SUCCESS) {
                    isInitialized = true
                    try {
                        tts?.language = Locale.getDefault()
                    } catch (e: Exception) {
                        Log.w(TAG, "Error setting TTS language", e)
                    }
                    Log.d(TAG, "TTS initialized successfully")
                    synchronized(pendingQueue) {
                        for (item in pendingQueue) {
                            speakInternal(item.text, item.speed, item.pitch, item.callback)
                        }
                        pendingQueue.clear()
                    }
                } else {
                    Log.e(TAG, "TTS initialization failed: $status")
                    synchronized(pendingQueue) {
                        for (item in pendingQueue) {
                            item.callback(JSONObject().apply {
                                put("deviceId", DevicePrefs.deviceId)
                                put("success", false)
                                put("error", "TTS initialization failed with code $status")
                            })
                        }
                        pendingQueue.clear()
                    }
                }
            }
        }
    }

    fun speak(payload: JSONObject, callback: (JSONObject) -> Unit) {
        val text = payload.optString("text", "")
        if (text.isBlank()) {
            callback(JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("success", false)
                put("error", "Text is empty")
            })
            return
        }
        val speed = payload.optDouble("speed", 1.0).toFloat().coerceIn(0.25f, 4.0f)
        val pitch = payload.optDouble("pitch", 1.0).toFloat().coerceIn(0.25f, 2.0f)

        if (tts == null) {
            synchronized(pendingQueue) {
                pendingQueue.add(PendingTts(text, speed, pitch, callback))
            }
            initTts()
            return
        }

        if (!isInitialized) {
            synchronized(pendingQueue) {
                pendingQueue.add(PendingTts(text, speed, pitch, callback))
            }
            return
        }

        speakInternal(text, speed, pitch, callback)
    }

    private fun speakInternal(text: String, speed: Float, pitch: Float, callback: (JSONObject) -> Unit) {
        mainHandler.post {
            try {
                tts?.setSpeechRate(speed)
                tts?.setPitch(pitch)
                val utteranceId = "tts_${System.currentTimeMillis()}"
                val result = tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, utteranceId)
                if (result == TextToSpeech.SUCCESS) {
                    Log.d(TAG, "TTS speaking: $text")
                    callback(JSONObject().apply {
                        put("deviceId", DevicePrefs.deviceId)
                        put("success", true)
                        put("text", text)
                    })
                } else {
                    callback(JSONObject().apply {
                        put("deviceId", DevicePrefs.deviceId)
                        put("success", false)
                        put("error", "TTS speak returned error code: $result")
                    })
                }
            } catch (e: Exception) {
                Log.e(TAG, "TTS speak failed", e)
                callback(JSONObject().apply {
                    put("deviceId", DevicePrefs.deviceId)
                    put("success", false)
                    put("error", e.message ?: "TTS speak failed")
                })
            }
        }
    }

    fun shutdown() {
        mainHandler.post {
            try {
                tts?.stop()
                tts?.shutdown()
            } catch (e: Exception) {
                Log.w(TAG, "Error shutting down TTS", e)
            } finally {
                tts = null
                isInitialized = false
            }
        }
    }

    companion object {
        private const val TAG = "TtsSpeaker"
    }
}

