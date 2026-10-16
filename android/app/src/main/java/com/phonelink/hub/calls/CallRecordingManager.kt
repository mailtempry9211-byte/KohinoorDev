package com.phonelink.hub.calls

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.MediaRecorder
import android.os.Build
import android.os.Environment
import android.util.Log
import androidx.core.content.ContextCompat
import com.phonelink.hub.data.DevicePrefs
import com.phonelink.hub.data.Events
import com.phonelink.hub.notifications.WebSocketHolder
import org.json.JSONObject
import java.io.File

object CallRecordingManager {
    private const val TAG = "CallRecordingManager"

    @Volatile
    private var activeRecorder: MediaRecorder? = null
    @Volatile
    private var currentFile: File? = null
    @Volatile
    private var recordingStartTime: Long = 0L
    @Volatile
    private var currentCallNumber: String? = null

    val isRecording: Boolean
        get() = activeRecorder != null

    @Synchronized
    fun start(context: Context, phoneNumber: String?) {
        if (!DevicePrefs.callRecordingEnabled) {
            Log.d(TAG, "Call recording is disabled in settings")
            return
        }
        if (activeRecorder != null) {
            Log.w(TAG, "Recording is already active")
            return
        }
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            Log.w(TAG, "Cannot record call: RECORD_AUDIO permission missing")
            return
        }

        try {
            // Determine storage directory
            val baseDir = try {
                val miuiDir = File(Environment.getExternalStorageDirectory(), "MIUI/sound_recorder/call_rec")
                if (miuiDir.exists() || miuiDir.mkdirs()) {
                    miuiDir
                } else {
                    File(context.getExternalFilesDir(null), "CallRecordings").apply { mkdirs() }
                }
            } catch (_: Exception) {
                File(context.getExternalFilesDir(null), "CallRecordings").apply { mkdirs() }
            }

            val sanitizedNumber = (phoneNumber ?: "Unknown").replace(Regex("[^a-zA-Z0-9+]"), "_")
            val targetFile = File(baseDir, "Call_${System.currentTimeMillis()}_$sanitizedNumber.m4a")
            currentFile = targetFile
            currentCallNumber = phoneNumber
            recordingStartTime = System.currentTimeMillis()

            @Suppress("DEPRECATION")
            val recorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(context)
            } else {
                MediaRecorder()
            }

            // In Android, AudioSource.VOICE_COMMUNICATION captures voice in calls without requiring root
            try {
                recorder.setAudioSource(MediaRecorder.AudioSource.VOICE_COMMUNICATION)
            } catch (e: Exception) {
                Log.w(TAG, "VOICE_COMMUNICATION source failed, falling back to MIC", e)
                recorder.setAudioSource(MediaRecorder.AudioSource.MIC)
            }

            recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
            recorder.setAudioEncodingBitRate(64000)
            recorder.setAudioSamplingRate(44100)
            recorder.setOutputFile(targetFile.absolutePath)
            recorder.prepare()
            recorder.start()

            activeRecorder = recorder
            Log.i(TAG, "Call recording started -> ${targetFile.absolutePath}")

            WebSocketHolder.webSocket?.send(
                Events.CALL_RECORDING_STATUS,
                JSONObject().apply {
                    put("deviceId", DevicePrefs.deviceId)
                    put("status", "RECORDING")
                    put("number", phoneNumber ?: "")
                    put("filePath", targetFile.absolutePath)
                    put("timestamp", recordingStartTime)
                }
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start call recording", e)
            stop(context)
        }
    }

    @Synchronized
    fun stop(context: Context) {
        val recorder = activeRecorder ?: return
        val file = currentFile
        val durationMs = if (recordingStartTime > 0) System.currentTimeMillis() - recordingStartTime else 0L

        try {
            recorder.stop()
        } catch (e: Exception) {
            Log.w(TAG, "Error stopping recorder", e)
        } finally {
            try { recorder.release() } catch (_: Exception) {}
            activeRecorder = null
        }

        if (file != null && file.exists() && file.length() > 0) {
            Log.i(TAG, "Call recording completed (${file.length()} bytes, ${durationMs}ms) at ${file.absolutePath}")
            WebSocketHolder.webSocket?.send(
                Events.CALL_RECORDING_SAVED,
                JSONObject().apply {
                    put("deviceId", DevicePrefs.deviceId)
                    put("fileName", file.name)
                    put("filePath", file.absolutePath)
                    put("fileSize", file.length())
                    put("durationMs", durationMs)
                    put("number", currentCallNumber ?: "")
                    put("timestamp", System.currentTimeMillis())
                }
            )
        }

        currentFile = null
        currentCallNumber = null
        recordingStartTime = 0L

        WebSocketHolder.webSocket?.send(
            Events.CALL_RECORDING_STATUS,
            JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("status", "IDLE")
                put("timestamp", System.currentTimeMillis())
            }
        )
    }
}
