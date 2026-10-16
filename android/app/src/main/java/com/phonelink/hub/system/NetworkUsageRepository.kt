package com.phonelink.hub.system

import android.content.Context
import android.content.pm.ApplicationInfo
import android.net.TrafficStats
import android.util.Log
import com.phonelink.hub.data.DevicePrefs
import org.json.JSONArray
import org.json.JSONObject

object NetworkUsageRepository {
    private const val TAG = "NetworkUsageRepo"

    fun getNetworkUsageStats(context: Context): JSONObject {
        val totalRx = TrafficStats.getTotalRxBytes()
        val totalTx = TrafficStats.getTotalTxBytes()
        val mobileRx = TrafficStats.getMobileRxBytes()
        val mobileTx = TrafficStats.getMobileTxBytes()

        val wifiRx = if (totalRx > 0 && mobileRx >= 0) (totalRx - mobileRx).coerceAtLeast(0L) else 0L
        val wifiTx = if (totalTx > 0 && mobileTx >= 0) (totalTx - mobileTx).coerceAtLeast(0L) else 0L

        val pm = context.packageManager
        val appUsageList = mutableListOf<JSONObject>()

        try {
            val packages = pm.getInstalledPackages(0)
            for (pkg in packages) {
                val appInfo = pkg.applicationInfo ?: continue
                val uid = appInfo.uid
                val rx = TrafficStats.getUidRxBytes(uid)
                val tx = TrafficStats.getUidTxBytes(uid)

                if (rx > 0 || tx > 0) {
                    val isSystem = (appInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0
                    val appName = try { appInfo.loadLabel(pm).toString() } catch (_: Exception) { pkg.packageName }
                    val total = (rx.coerceAtLeast(0L) + tx.coerceAtLeast(0L))

                    appUsageList.add(
                        JSONObject().apply {
                            put("packageName", pkg.packageName)
                            put("appName", appName)
                            put("uid", uid)
                            put("rxBytes", rx.coerceAtLeast(0L))
                            put("txBytes", tx.coerceAtLeast(0L))
                            put("totalBytes", total)
                            put("isSystem", isSystem)
                        }
                    )
                }
            }
            appUsageList.sortByDescending { it.getLong("totalBytes") }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to inspect app network usage", e)
        }

        return JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("timestamp", System.currentTimeMillis())
            put("summary", JSONObject().apply {
                put("totalRxBytes", totalRx.coerceAtLeast(0L))
                put("totalTxBytes", totalTx.coerceAtLeast(0L))
                put("totalBytes", (totalRx.coerceAtLeast(0L) + totalTx.coerceAtLeast(0L)))
                put("mobileRxBytes", mobileRx.coerceAtLeast(0L))
                put("mobileTxBytes", mobileTx.coerceAtLeast(0L))
                put("mobileBytes", (mobileRx.coerceAtLeast(0L) + mobileTx.coerceAtLeast(0L)))
                put("wifiRxBytes", wifiRx)
                put("wifiTxBytes", wifiTx)
                put("wifiBytes", (wifiRx + wifiTx))
            })
            put("apps", JSONArray(appUsageList))
            put("count", appUsageList.size)
        }
    }
}
