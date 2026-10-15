package com.phonelink.hub.remote

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.media.MediaPlayer
import android.util.Base64
import android.util.Log
import com.phonelink.hub.data.DevicePrefs
import com.phonelink.hub.data.Events
import com.phonelink.hub.notifications.WebSocketHolder
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream

/**
 * Real-time Walkie-Talkie Intercom.
 * Allows the PC user to push-to-talk directly through the phone's speakerphone.
 */
object WalkieTalkieIntercom {
    private const val TAG = "WalkieTalkieIntercom"
    private const val SAMPLE_RATE = 16000

    @Volatile var isSpeaking: Boolean = false
        private set

    private var audioTrack: AudioTrack? = null

    fun startSession(context: Context): JSONObject {
        try {
            ensureAudioTrack(context)
            isSpeaking = true
            pushStatus(true)
            return JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("success", true)
                put("active", true)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start walkie-talkie session", e)
            return JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("success", false)
                put("error", e.message ?: "Failed to start audio track")
            }
        }
    }

    fun playChunk(context: Context, base64Data: String) {
        try {
            val bytes = Base64.decode(base64Data, Base64.DEFAULT)
            if (bytes.isEmpty()) return

            // If it's a WAV/OGG/MP3 header, play via fast temp MediaPlayer
            if (isEncodedAudio(bytes)) {
                playEncodedFile(context, bytes)
                return
            }

            // Raw PCM playback
            ensureAudioTrack(context)
            audioTrack?.let { track ->
                if (track.playState != AudioTrack.PLAYSTATE_PLAYING) {
                    track.play()
                }
                track.write(bytes, 0, bytes.size)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error playing walkie talkie chunk", e)
        }
    }

    fun stopSession(): JSONObject {
        isSpeaking = false
        try {
            audioTrack?.let { track ->
                if (track.playState == AudioTrack.PLAYSTATE_PLAYING) {
                    track.stop()
                }
                track.release()
            }
            audioTrack = null
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping walkie talkie", e)
        }
        pushStatus(false)
        return JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("success", true)
            put("active", false)
        }
    }

    private fun ensureAudioTrack(context: Context) {
        if (audioTrack != null && audioTrack?.state == AudioTrack.STATE_INITIALIZED) return

        val minBuf = AudioTrack.getMinBufferSize(
            SAMPLE_RATE,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        )
        val bufSize = (minBuf * 2).coerceAtLeast(4096)

        val attributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .build()

        val format = AudioFormat.Builder()
            .setSampleRate(SAMPLE_RATE)
            .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
            .build()

        audioTrack = AudioTrack.Builder()
            .setAudioAttributes(attributes)
            .setAudioFormat(format)
            .setBufferSizeInBytes(bufSize)
            .setTransferMode(AudioTrack.MODE_STREAM)
            .build()

        // Maximize stream volume for intercom clarity
        try {
            val am = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
            am?.isSpeakerphoneOn = true
        } catch (_: Exception) {}

        audioTrack?.play()
    }

    private fun isEncodedAudio(bytes: ByteArray): Boolean {
        if (bytes.size < 4) return false
        // "RIFF" for WAV
        if (bytes[0] == 'R'.code.toByte() && bytes[1] == 'I'.code.toByte() &&
            bytes[2] == 'F'.code.toByte() && bytes[3] == 'F'.code.toByte()) return true
        // "OggS" for OGG
        if (bytes[0] == 'O'.code.toByte() && bytes[1] == 'g'.code.toByte() &&
            bytes[2] == 'g'.code.toByte() && bytes[3] == 'S'.code.toByte()) return true
        // WebM header 0x1A 0x45 0xDF 0xA3
        if (bytes[0] == 0x1A.toByte() && bytes[1] == 0x45.toByte()) return true
        return false
    }

    private fun playEncodedFile(context: Context, bytes: ByteArray) {
        try {
            val tempFile = File.createTempFile("intercom_", ".tmp", context.cacheDir)
            FileOutputStream(tempFile).use { it.write(bytes) }
            val mp = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build()
                )
                setDataSource(tempFile.absolutePath)
                setOnCompletionListener {
                    it.release()
                    tempFile.delete()
                }
                prepare()
                start()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to play encoded intercom file", e)
        }
    }

    private fun pushStatus(active: Boolean) {
        val payload = JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("active", active)
        }
        WebSocketHolder.get()?.send(Events.WALKIE_TALKIE_STATUS, payload)
    }
}
