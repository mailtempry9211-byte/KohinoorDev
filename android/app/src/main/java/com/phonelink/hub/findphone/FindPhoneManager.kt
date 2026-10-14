package com.phonelink.hub.findphone

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Log
import androidx.core.app.NotificationCompat
import com.phonelink.hub.R
import com.phonelink.hub.data.DevicePrefs
import com.phonelink.hub.data.Events
import com.phonelink.hub.notifications.WebSocketHolder
import org.json.JSONObject

/**
 * FEATURE C: loud alarm that bypasses silent/vibrate.
 * Trick: STREAM_ALARM at max volume (not muted by ringer mode on most OEMs).
 * Stop via notification action or 60s timeout; restores original volume.
 */
object FindPhoneManager {

    private const val TAG = "FindPhoneManager"
    private const val CHANNEL_ID = "find_phone_alert"
    private const val NOTIFICATION_ID = 4301
    private const val TIMEOUT_MS = 60_000L

    @Volatile private var player: MediaPlayer? = null
    @Volatile private var prevVolume = -1
    private val handler = Handler(Looper.getMainLooper())
    private val stopTask = Runnable { stop(null) }

    fun start(context: Context) {
        val app = context.applicationContext
        if (player != null) {
            handler.removeCallbacks(stopTask)
            handler.postDelayed(stopTask, TIMEOUT_MS)
            return
        }
        try {
            val audio = app.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            prevVolume = audio.getStreamVolume(AudioManager.STREAM_ALARM)
            val max = audio.getStreamMaxVolume(AudioManager.STREAM_ALARM)
            audio.setStreamVolume(AudioManager.STREAM_ALARM, max, 0)
            Log.d(TAG, "alarm volume: prev=$prevVolume max=$max")

            val mp = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                setDataSource(app, Settings.System.DEFAULT_ALARM_ALERT_URI)
                isLooping = true
                prepare()
                start()
            }
            player = mp
            showStopNotification(app)
            handler.postDelayed(stopTask, TIMEOUT_MS)
            Log.d(TAG, "find-phone alarm started")
        } catch (e: Exception) {
            Log.e(TAG, "could not start alarm", e)
            stop(app)
        }
    }

    fun stop(context: Context?) {
        handler.removeCallbacks(stopTask)
        try { player?.stop() } catch (_: Exception) { }
        try { player?.release() } catch (_: Exception) { }
        player = null
        val app = context?.applicationContext
        if (app != null) {
            try {
                val audio = app.getSystemService(Context.AUDIO_SERVICE) as AudioManager
                if (prevVolume >= 0) {
                    audio.setStreamVolume(AudioManager.STREAM_ALARM, prevVolume, 0)
                    prevVolume = -1
                }
                val nm = app.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                nm.cancel(NOTIFICATION_ID)
            } catch (e: Exception) {
                Log.w(TAG, "stop cleanup failed", e)
            }
            try {
                WebSocketHolder.webSocket?.send(
                    Events.FIND_PHONE_STOPPED,
                    JSONObject().apply { put("deviceId", DevicePrefs.deviceId) }
                )
            } catch (_: Exception) { }
            Log.d(TAG, "find-phone alarm stopped")
        }
    }

    private fun showStopNotification(context: Context) {
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            nm.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "Find phone alert", NotificationManager.IMPORTANCE_HIGH)
            )
        }
        val stopIntent = Intent(context, FindPhoneStopReceiver::class.java)
        val pi = PendingIntent.getBroadcast(
            context, 0, stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val note = NotificationCompat.Builder(context, CHANNEL_ID)
            .setContentTitle("Phone finder alert")
            .setContentText("Tap STOP to silence the alarm")
            .setSmallIcon(R.drawable.ic_notification)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .addAction(0, "STOP", pi)
            .build()
        nm.notify(NOTIFICATION_ID, note)
    }
}
