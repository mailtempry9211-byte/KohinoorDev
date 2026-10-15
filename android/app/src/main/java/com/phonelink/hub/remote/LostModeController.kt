package com.phonelink.hub.remote

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import com.phonelink.hub.R
import com.phonelink.hub.data.DevicePrefs
import com.phonelink.hub.findphone.FindPhoneManager
import org.json.JSONObject

object LostModeController {
    private const val CHANNEL_ID = "phonelink_lost_mode"
    private const val NOTIFICATION_ID = 9999
    private var isActive = false
    private var currentMessage: String = ""
    private var currentPhone: String = ""

    fun activate(context: Context, payload: JSONObject): JSONObject {
        val message = payload.optString("message", "This phone is lost! Please contact owner.")
        val phone = payload.optString("phone", "")
        val soundAlarm = payload.optBoolean("soundAlarm", false)

        isActive = true
        currentMessage = message
        currentPhone = phone

        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Lost Mode Emergency Alert",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Emergency lockscreen banner when phone is marked lost"
                enableVibration(true)
                setShowBadge(true)
                lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
            }
            nm.createNotificationChannel(channel)
        }

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("⚠️ DEVICE IS LOST - OWNER CONTACT")
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText("$message\n\nContact: $phone"))
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)

        if (phone.isNotBlank()) {
            val callIntent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone")).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            val callPendingIntent = PendingIntent.getActivity(
                context,
                0,
                callIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            builder.addAction(android.R.drawable.ic_menu_call, "CALL OWNER ($phone)", callPendingIntent)
        }

        nm.notify(NOTIFICATION_ID, builder.build())

        if (soundAlarm) {
            FindPhoneManager.start(context)
        }

        return JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("active", true)
            put("message", message)
            put("phone", phone)
            put("success", true)
        }
    }

    fun deactivate(context: Context): JSONObject {
        isActive = false
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.cancel(NOTIFICATION_ID)
        FindPhoneManager.stop(context)

        return JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("active", false)
            put("success", true)
        }
    }

    fun getStatus(): JSONObject = JSONObject().apply {
        put("deviceId", DevicePrefs.deviceId)
        put("active", isActive)
        put("message", currentMessage)
        put("phone", currentPhone)
    }
}

