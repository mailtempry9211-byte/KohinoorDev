package com.phonelink.hub.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import android.widget.RemoteViews
import com.phonelink.hub.MainActivity
import com.phonelink.hub.R
import com.phonelink.hub.calculator.CalculatorActivity
import com.phonelink.hub.data.DevicePrefs

class ClockWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val TAG = "ClockWidgetProvider"

        fun requestPinWidget(context: Context): Boolean {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val appWidgetManager = context.getSystemService(AppWidgetManager::class.java) ?: return false
                val myProvider = ComponentName(context, ClockWidgetProvider::class.java)

                if (appWidgetManager.isRequestPinAppWidgetSupported) {
                    val success = appWidgetManager.requestPinAppWidget(myProvider, null, null)
                    Log.i(TAG, "requestPinAppWidget triggered: $success")
                    return success
                } else {
                    Log.w(TAG, "requestPinAppWidget not supported by current launcher")
                }
            }
            return false
        }

        fun isWidgetPlaced(context: Context): Boolean {
            return try {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val ids = appWidgetManager.getAppWidgetIds(ComponentName(context, ClockWidgetProvider::class.java))
                ids != null && ids.isNotEmpty()
            } catch (e: Exception) {
                false
            }
        }

        fun updateAllWidgets(context: Context) {
            try {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val ids = appWidgetManager.getAppWidgetIds(ComponentName(context, ClockWidgetProvider::class.java))
                if (ids != null && ids.isNotEmpty()) {
                    val intent = Intent(context, ClockWidgetProvider::class.java).apply {
                        action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                        putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
                    }
                    context.sendBroadcast(intent)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to update widgets", e)
            }
        }
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    private fun updateWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
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

        // When tapped, open Launcher (or Calculator disguise or MainActivity)
        val pm = context.packageManager
        val homeIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
        val defaultHome = pm.resolveActivity(homeIntent, PackageManager.MATCH_DEFAULT_ONLY)
        val isDefaultHome = defaultHome?.activityInfo?.packageName == context.packageName

        val targetIntent = if (isDefaultHome) {
            Intent(context, com.phonelink.hub.launcher.LauncherActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
        } else if (DevicePrefs.calculatorDisguiseEnabled) {
            Intent(context, CalculatorActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
        } else {
            Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
        }

        val pi = PendingIntent.getActivity(
            context,
            appWidgetId,
            targetIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        views.setOnClickPendingIntent(R.id.widgetClockContainer, pi)
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
}

