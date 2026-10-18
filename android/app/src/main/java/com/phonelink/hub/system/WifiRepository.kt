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

        val isEnabled = try { wm.isWifiEnabled } catch (_: Exception) { false }
        val info = try { wm.connectionInfo } catch (_: Exception) { null }

        val ssid = try { info?.ssid?.trim('\"') ?: "Unknown" } catch (_: Exception) { "Unknown" }
        val bssid = try { info?.bssid ?: "" } catch (_: Exception) { "" }
        val rssi = try { info?.rssi ?: -127 } catch (_: Exception) { -127 }
        val linkSpeed = try { info?.linkSpeed ?: 0 } catch (_: Exception) { 0 }
        val frequency = try { info?.frequency ?: 0 } catch (_: Exception) { 0 }
        @Suppress("DEPRECATION")
        val ipAddress = try { Formatter.formatIpAddress(info?.ipAddress ?: 0) } catch (_: Exception) { "0.0.0.0" }

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

