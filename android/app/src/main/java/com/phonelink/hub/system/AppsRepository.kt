package com.phonelink.hub.system

import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import com.phonelink.hub.data.DevicePrefs
import org.json.JSONArray
import org.json.JSONObject

object AppsRepository {
    private const val TAG = "AppsRepository"

    fun getInstalledApps(context: Context): JSONObject {
        val pm = context.packageManager
        val apps = try {
            val list = pm.getInstalledPackages(0)
            list.map { pkg ->
                val isSystem = (pkg.applicationInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0
                val appName = try { pkg.applicationInfo.loadLabel(pm).toString() } catch (_: Exception) { pkg.packageName }
                val versionCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    pkg.longVersionCode
                } else {
                    @Suppress("DEPRECATION")
                    pkg.versionCode.toLong()
                }
                JSONObject().apply {
                    put("packageName", pkg.packageName)
                    put("name", appName)
                    put("versionName", pkg.versionName ?: "")
                    put("versionCode", versionCode)
                    put("isSystem", isSystem)
                    put("firstInstallTime", pkg.firstInstallTime)
                    put("lastUpdateTime", pkg.lastUpdateTime)
                }
            }.sortedWith(compareBy({ it.getBoolean("isSystem") }, { it.getString("name").lowercase() }))
        } catch (e: Exception) {
            Log.e(TAG, "Error listing installed packages", e)
            emptyList()
        }

        return JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("apps", JSONArray(apps))
            put("count", apps.size)
        }
    }

    fun getAppPermissions(context: Context, packageName: String): JSONObject {
        val pm = context.packageManager
        return try {
            val pkg = pm.getPackageInfo(packageName, PackageManager.GET_PERMISSIONS)
            val requested = pkg.requestedPermissions ?: emptyArray()
            val flags = pkg.requestedPermissionsFlags ?: intArrayOf()
            val list = requested.mapIndexed { i, perm ->
                val isGranted = if (i < flags.size) (flags[i] and PackageInfo.REQUESTED_PERMISSION_GRANTED) != 0 else false
                JSONObject().apply {
                    put("permission", perm)
                    put("granted", isGranted)
                }
            }
            JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("packageName", packageName)
                put("permissions", JSONArray(list))
                put("success", true)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting permissions for $packageName", e)
            JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("packageName", packageName)
                put("permissions", JSONArray())
                put("success", false)
                put("error", e.message ?: "Could not get permissions")
            }
        }
    }

    fun getAppUsageStats(context: Context): JSONObject {
        val result = JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("success", true)
        }
        val usm = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
            context.getSystemService(Context.USAGE_STATS_SERVICE) as? android.app.usage.UsageStatsManager
        } else null

        val pm = context.packageManager
        val calendar = java.util.Calendar.getInstance()
        val endTime = calendar.timeInMillis
        calendar.set(java.util.Calendar.HOUR_OF_DAY, 0)
        calendar.set(java.util.Calendar.MINUTE, 0)
        calendar.set(java.util.Calendar.SECOND, 0)
        val startTime = calendar.timeInMillis

        val usageList = JSONArray()
        var totalForegroundMillis = 0L

        try {
            if (usm != null) {
                val stats = usm.queryUsageStats(android.app.usage.UsageStatsManager.INTERVAL_DAILY, startTime, endTime)
                val sorted = stats.filter { it.totalTimeInForeground > 60_000L } // only apps used > 1 min
                    .sortedByDescending { it.totalTimeInForeground }

                for (s in sorted) {
                    val appName = try {
                        val appInfo = pm.getApplicationInfo(s.packageName, 0)
                        pm.getApplicationLabel(appInfo).toString()
                    } catch (_: Exception) {
                        s.packageName
                    }
                    totalForegroundMillis += s.totalTimeInForeground
                    usageList.put(JSONObject().apply {
                        put("packageName", s.packageName)
                        put("name", appName)
                        put("foregroundTimeMs", s.totalTimeInForeground)
                        put("foregroundMinutes", (s.totalTimeInForeground / 60_000L).toInt())
                        put("lastTimeUsed", s.lastTimeUsed)
                    })
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error querying usage stats: ${e.message}")
        }

        result.put("apps", usageList)
        result.put("totalScreenTimeMinutes", (totalForegroundMillis / 60_000L).toInt())
        result.put("limitMinutes", DevicePrefs.screenTimeLimitMinutes)
        result.put("parentalControlEnabled", DevicePrefs.parentalControlEnabled)
        result.put("blockedPackages", JSONArray(DevicePrefs.blockedPackages))
        result.put("allowedPackagesDuringLimit", JSONArray(DevicePrefs.allowedPackagesDuringLimit))
        return result
    }
}

