package com.phonelink.parent.utils

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.wifi.WifiManager
import android.os.Build
import java.net.Inet4Address
import java.net.NetworkInterface
import java.util.Collections

object NetworkUtils {

    /**
     * Finds the most suitable IP address for connecting from other devices:
     * - Checks Wi-Fi network
     * - Checks Mobile Hotspot (e.g. wlan0, ap0, rndis0)
     * - Falls back to first non-loopback IPv4
     */
    fun getLocalIpAddress(context: Context): String {
        try {
            // First attempt: check active network interfaces
            val interfaces = Collections.list(NetworkInterface.getNetworkInterfaces())
            
            // Prioritize Wi-Fi and Hotspot interfaces
            val preferredNames = listOf("wlan", "ap", "rndis", "softap", "p2p")
            for (pref in preferredNames) {
                for (intf in interfaces) {
                    if (intf.name.contains(pref, ignoreCase = true) && intf.isUp && !intf.isLoopback) {
                        for (addr in Collections.list(intf.inetAddresses)) {
                            if (addr is Inet4Address && !addr.isLoopbackAddress) {
                                val ip = addr.hostAddress ?: ""
                                if (ip.isNotEmpty() && !ip.startsWith("127.")) {
                                    return ip
                                }
                            }
                        }
                    }
                }
            }

            // Fallback: any non-loopback IPv4
            for (intf in interfaces) {
                if (intf.isUp && !intf.isLoopback) {
                    for (addr in Collections.list(intf.inetAddresses)) {
                        if (addr is Inet4Address && !addr.isLoopbackAddress) {
                            val ip = addr.hostAddress ?: ""
                            if (ip.isNotEmpty() && !ip.startsWith("127.")) {
                                return ip
                            }
                        }
                    }
                }
            }
        } catch (_: Exception) {}

        return "127.0.0.1"
    }

    /**
     * Returns true if device is connected to Wi-Fi.
     */
    fun isWifiConnected(context: Context): Boolean {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return false
        val activeNetwork = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(activeNetwork) ?: return false
        return caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
    }
}
