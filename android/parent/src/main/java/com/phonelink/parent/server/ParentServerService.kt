package com.phonelink.parent.server

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Binder
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.phonelink.parent.R
import com.phonelink.parent.ui.ParentMainActivity
import com.phonelink.parent.utils.NetworkUtils

class ParentServerService : Service() {

    private val TAG = "ParentServerService"
    private val CHANNEL_ID = "phonelink_parent_hub_channel"
    private val NOTIF_ID = 9001

    private var server: EmbeddedHubServer? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private val binder = LocalBinder()

    inner class LocalBinder : Binder() {
        fun getService(): ParentServerService = this@ParentServerService
    }

    companion object {
        var instance: ParentServerService? = null
            private set

        fun start(context: Context) {
            val intent = Intent(context, ParentServerService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, ParentServerService::class.java)
            context.stopService(intent)
        }
    }

    override fun onCreate() {
        super.onCreate()
        instance = this
        createNotificationChannel()

        val notification = buildNotification("Initializing PhoneLink Parent Hub...")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIF_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else {
            startForeground(NOTIF_ID, notification)
        }

        acquireWakeLock()
        startServer()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        updateNotification()
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder = binder

    override fun onDestroy() {
        super.onDestroy()
        instance = null
        stopServer()
        releaseWakeLock()
    }

    private fun startServer() {
        try {
            server = EmbeddedHubServer(applicationContext, 5000)
            server?.start()
            updateNotification()
        } catch (e: Exception) {
            Log.e(TAG, "Failed starting embedded server: ${e.message}", e)
        }
    }

    private fun stopServer() {
        try {
            server?.stop()
            server = null
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping server: ${e.message}", e)
        }
    }

    fun getServer(): EmbeddedHubServer? = server

    fun updateNotification() {
        val ip = NetworkUtils.getLocalIpAddress(this)
        val connectedCount = server?.getConnectedDeviceCount() ?: 0
        val text = "Server: http://$ip:5000 • $connectedCount Devices Connected"
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(NOTIF_ID, buildNotification(text))
    }

    private fun buildNotification(contentText: String): Notification {
        val openIntent = Intent(this, ParentMainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("🟢 PhoneLink Parent Hub Online")
            .setContentText(contentText)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(pendingIntent)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                getString(R.string.notification_channel_name),
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = getString(R.string.notification_channel_desc)
                setShowBadge(false)
            }
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(channel)
        }
    }

    private fun acquireWakeLock() {
        try {
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "PhoneLinkParent:ServerWakeLock").apply {
                acquire(24 * 60 * 60 * 1000L) // 24 hours
            }
        } catch (e: Exception) {
            Log.w(TAG, "WakeLock acquire error: ${e.message}")
        }
    }

    private fun releaseWakeLock() {
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
            wakeLock = null
        } catch (_: Exception) {}
    }
}
