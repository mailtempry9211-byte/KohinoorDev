package com.phonelink.hub.util

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.net.wifi.WifiManager
import androidx.core.content.ContextCompat

/** Reads battery level and charging state for the status card. */
object Battery {

    fun level(context: Context): Int {
        val bm = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        val level = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        return if (level in 0..100) level else 100
    }

    fun isCharging(context: Context): Boolean {
        val status = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
            ?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
        return status == BatteryManager.BATTERY_STATUS_CHARGING ||
            status == BatteryManager.BATTERY_STATUS_FULL
    }
}

/** Returns the SSID of the connected Wi-Fi, when the permission is granted. */
object WifiName {

    fun current(context: Context): String? {
        return try {
            val wifi = ContextCompat.getSystemService(context, WifiManager::class.java) ?: return null
            val info = wifi.connectionInfo ?: return null
            val ssid = info.ssid?.removeSurrounding("\"") ?: return null
            if (ssid.equals("<unknown ssid>", ignoreCase = true)) null else ssid
        } catch (e: Exception) {
            null
        }
    }
}
