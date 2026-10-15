package com.phonelink.hub.media

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Base64
import android.util.Log
import androidx.core.content.ContextCompat
import com.phonelink.hub.data.DevicePrefs
import org.json.JSONObject
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.concurrent.thread

/**
 * Streams real-time ambient audio chunks (16kHz PCM, 16-bit mono) from device microphone
 * to the dashboard web client via WebSockets with ultra-low latency.
 */
object AudioStreamer {
    private const val TAG = "AudioStreamer"
    const val SAMPLE_RATE = 16000
    private const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
    private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT

    private val isStreaming = AtomicBoolean(false)
    private var recordingThread: Thread? = null
    private var audioRecord: AudioRecord? = null

    val isActive: Boolean
        get() = isStreaming.get()

    @SuppressLint("MissingPermission")
    fun start(context: Context, onChunk: (JSONObject) -> Unit) {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            Log.e(TAG, "RECORD_AUDIO permission not granted")
            onChunk(JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("error", "RECORD_AUDIO permission not granted on phone")
            })
            return
        }

        if (isStreaming.get()) {
            stop()
        }

        val minBufSize = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT)
        val bufferSize = (minBufSize * 2).coerceAtLeast(2048)

        try {
            val record = AudioRecord(
                MediaRecorder.AudioSource.MIC,
                SAMPLE_RATE,
                CHANNEL_CONFIG,
                AUDIO_FORMAT,
                bufferSize
            )

            if (record.state != AudioRecord.STATE_INITIALIZED) {
                Log.e(TAG, "AudioRecord failed to initialize")
                record.release()
                onChunk(JSONObject().apply {
                    put("deviceId", DevicePrefs.deviceId)
                    put("error", "Failed to initialize microphone")
                })
                return
            }

            audioRecord = record
            record.startRecording()
            isStreaming.set(true)
            Log.i(TAG, "Live audio stream started @ ${SAMPLE_RATE}Hz mono")

            val chunkBuffer = ByteArray(2048) // ~64ms of 16kHz 16-bit mono audio

            recordingThread = thread(name = "LiveAudioStreamer") {
                while (isStreaming.get() && audioRecord != null) {
                    val bytesRead = audioRecord?.read(chunkBuffer, 0, chunkBuffer.size) ?: -1
                    if (bytesRead > 0) {
                        val base64Data = Base64.encodeToString(chunkBuffer, 0, bytesRead, Base64.NO_WRAP)
                        val payload = JSONObject().apply {
                            put("deviceId", DevicePrefs.deviceId)
                            put("sampleRate", SAMPLE_RATE)
                            put("channels", 1)
                            put("data", base64Data)
                            put("timestamp", System.currentTimeMillis())
                        }
                        onChunk(payload)
                    }
                }
            }

        } catch (e: Exception) {
            Log.e(TAG, "Exception starting live audio stream", e)
            stop()
            onChunk(JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("error", e.message ?: "Failed to start live listening")
            })
        }
    }

    fun stop() {
        if (!isStreaming.getAndSet(false)) return
        Log.i(TAG, "Stopping live audio stream...")
        try {
            audioRecord?.stop()
            audioRecord?.release()
        } catch (e: Exception) {
            Log.w(TAG, "Error stopping audioRecord", e)
        } finally {
            audioRecord = null
            recordingThread = null
        }
    }
}

