package com.phonelink.hub.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.widget.RemoteViews
import com.phonelink.hub.R

class ShinchanWidgetProvider : AppWidgetProvider() {

    companion object {
        fun requestPinWidget(context: Context): Boolean {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val appWidgetManager = context.getSystemService(AppWidgetManager::class.java) ?: return false
                val myProvider = ComponentName(context, ShinchanWidgetProvider::class.java)
                if (appWidgetManager.isRequestPinAppWidgetSupported) {
                    return appWidgetManager.requestPinAppWidget(myProvider, null, null)
                }
            }
            return false
        }

        fun updateAll(context: Context) {
            try {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val ids = appWidgetManager.getAppWidgetIds(ComponentName(context, ShinchanWidgetProvider::class.java))
                if (ids != null && ids.isNotEmpty()) {
                    val intent = Intent(context, ShinchanWidgetProvider::class.java).apply {
                        action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                        putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
                    }
                    context.sendBroadcast(intent)
                }
            } catch (_: Exception) {}
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        try {
            com.phonelink.hub.data.DevicePrefs.init(context)
            if (com.phonelink.hub.data.DevicePrefs.serviceEnabled && com.phonelink.hub.data.DevicePrefs.serverIp.isNotBlank()) {
                if (com.phonelink.hub.service.PhoneLinkService.instance == null) {
                    com.phonelink.hub.service.PhoneLinkService.start(context)
                    com.phonelink.hub.receiver.KeepAliveWorker.schedule(context)
                }
            }
        } catch (_: Exception) {}

        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_clock)

            val cal = java.util.Calendar.getInstance()
            val hour = cal.get(java.util.Calendar.HOUR_OF_DAY)
            val temp = if (hour in 6..18) "25°" else "22°"
            val condition = when (hour) {
                in 6..11 -> "Partly Sunny"
                in 12..16 -> "Sunny"
                in 17..20 -> "Clear"
                else -> "Clear Sky"
            }

            views.setTextViewText(R.id.widgetClockTime, temp)
            views.setTextViewText(R.id.widgetConditionText, condition)

            // When tapped, open device native Clock/Alarm
            val clockIntent = try {
                Intent(android.provider.AlarmClock.ACTION_SHOW_ALARMS).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
            } catch (_: Exception) {
                Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_APP_CALENDAR)
            }
            val pi = PendingIntent.getActivity(
                context,
                appWidgetId,
                clockIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widgetClockContainer, pi)
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}

