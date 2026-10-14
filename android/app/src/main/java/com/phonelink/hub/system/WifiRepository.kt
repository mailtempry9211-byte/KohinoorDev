package com.phonelink.hub.system

import android.content.Context
import android.net.wifi.WifiManager
import android.text.format.Formatter
import android.util.Log
import com.phonelink.hub.data.DevicePrefs
import org.json.JSONArray
import org.json.JSONObject

object WifiRepository {
    private const val TAG = "WifiRepository"

    fun getWifiInfo(context: Context): JSONObject {
        val wm = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
        if (wm == null) {
            return JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("enabled", false)
                put("error", "WifiManager not available")
            }
        }

        val isEnabled = wm.isWifiEnabled
        val info = wm.connectionInfo

        val ssid = info?.ssid?.trim('\"') ?: "Unknown"
        val bssid = info?.bssid ?: ""
        val rssi = info?.rssi ?: -127
        val linkSpeed = info?.linkSpeed ?: 0
        val frequency = info?.frequency ?: 0
        @Suppress("DEPRECATION")
        val ipAddress = Formatter.formatIpAddress(info?.ipAddress ?: 0)

        val scanList = try {
            val results = wm.scanResults ?: emptyList()
            results.map { r ->
                JSONObject().apply {
                    put("ssid", r.SSID ?: "")
                    put("bssid", r.BSSID ?: "")
                    put("level", r.level)
                    put("frequency", r.frequency)
                    put("capabilities", r.capabilities ?: "")
                }
            }.sortedByDescending { it.getInt("level") }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to get scan results", e)
            emptyList()
        }

        return JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("enabled", isEnabled)
            put("connected", ssid != "Unknown" && ssid != "<unknown ssid>" && bssid.isNotBlank())
            put("ssid", ssid)
            put("bssid", bssid)
            put("rssi", rssi)
            put("linkSpeedMbps", linkSpeed)
            put("frequencyMHz", frequency)
            put("ipAddress", ipAddress)
            put("scanResults", JSONArray(scanList))
        }
    }
}

