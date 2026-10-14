package com.phonelink.hub.media

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.MediaRecorder
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.util.Log
import androidx.core.content.ContextCompat
import com.phonelink.hub.data.DevicePrefs
import org.json.JSONObject
import java.io.File
import kotlin.concurrent.thread

object MicRecorder {
    private const val TAG = "MicRecorder"
    private val mainHandler = Handler(Looper.getMainLooper())
    private var activeRecorder: MediaRecorder? = null
    private var currentFile: File? = null
    private var stopRunnable: Runnable? = null
    private var isRecording = false

    fun record(context: Context, durationSec: Int, callback: (JSONObject) -> Unit) {
        val clampedSec = durationSec.coerceIn(5, 60)

        // Permission check
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            Log.e(TAG, "RECORD_AUDIO permission not granted")
            callback(JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("success", false)
                put("error", "RECORD_AUDIO permission not granted on device")
            })
            return
        }

        mainHandler.post {
            cancel()

            val tempFile = File(context.cacheDir, "mic_rec_${System.currentTimeMillis()}.m4a")
            currentFile = tempFile

            try {
                @Suppress("DEPRECATION")
                val recorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    MediaRecorder(context)
                } else {
                    MediaRecorder()
                }

                recorder.apply {
                    setAudioSource(MediaRecorder.AudioSource.MIC)
                    setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                    setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                    setAudioEncodingBitRate(128000)
                    setAudioSamplingRate(44100)
                    setOutputFile(tempFile.absolutePath)
                    prepare()
                    start()
                }

                activeRecorder = recorder
                isRecording = true
                Log.d(TAG, "Recording started for $clampedSec seconds to ${tempFile.name}")

                val runnable = Runnable {
                    finishRecording(tempFile, clampedSec, callback)
                }
                stopRunnable = runnable
                mainHandler.postDelayed(runnable, clampedSec * 1000L)

            } catch (e: Exception) {
                Log.e(TAG, "Error starting MediaRecorder", e)
                cancel()
                callback(JSONObject().apply {
                    put("deviceId", DevicePrefs.deviceId)
                    put("success", false)
                    put("error", e.message ?: "Failed to start audio recording")
                })
            }
        }
    }

    private fun finishRecording(file: File, durationSec: Int, callback: (JSONObject) -> Unit) {
        thread {
            try {
                mainHandler.post {
                    try {
                        activeRecorder?.apply {
                            stop()
                            reset()
                            release()
                        }
                    } catch (e: Exception) {
                        Log.w(TAG, "Error stopping recorder", e)
                    } finally {
                        activeRecorder = null
                        isRecording = false
                    }
                }

                // Wait briefly for recorder flush
                Thread.sleep(300)

                if (file.exists() && file.length() > 0) {
                    val bytes = file.readBytes()
                    val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                    Log.d(TAG, "Recording finished: ${bytes.size} bytes encoded")

                    callback(JSONObject().apply {
                        put("deviceId", DevicePrefs.deviceId)
                        put("success", true)
                        put("mimeType", "audio/mp4")
                        put("durationSec", durationSec)
                        put("data", base64)
                        put("sizeBytes", bytes.size)
                        put("timestamp", System.currentTimeMillis())
                    })
                } else {
                    callback(JSONObject().apply {
                        put("deviceId", DevicePrefs.deviceId)
                        put("success", false)
                        put("error", "Recorded audio file was empty")
                    })
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error processing recorded file", e)
                callback(JSONObject().apply {
                    put("deviceId", DevicePrefs.deviceId)
                    put("success", false)
                    put("error", e.message ?: "Failed to process audio recording")
                })
            } finally {
                try {
                    file.delete()
                } catch (_: Exception) {
                }
            }
        }
    }

    fun cancel() {
        stopRunnable?.let { mainHandler.removeCallbacks(it) }
        stopRunnable = null

        try {
            activeRecorder?.apply {
                if (isRecording) stop()
                reset()
                release()
            }
        } catch (_: Exception) {
        } finally {
            activeRecorder = null
            isRecording = false
        }

        try {
            currentFile?.delete()
        } catch (_: Exception) {
        }
        currentFile = null
    }
}
