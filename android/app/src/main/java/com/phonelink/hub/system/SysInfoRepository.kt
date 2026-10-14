package com.phonelink.hub.system

import android.app.ActivityManager
import android.content.Context
import android.os.Build
import android.os.Environment
import android.os.StatFs
import android.os.SystemClock
import com.phonelink.hub.data.DevicePrefs
import com.phonelink.hub.util.Battery
import org.json.JSONObject

object SysInfoRepository {

    fun getDeviceInfo(context: Context): JSONObject {
        val am = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
        val memInfo = ActivityManager.MemoryInfo()
        am?.getMemoryInfo(memInfo)

        val dataStat = try { StatFs(Environment.getDataDirectory().path) } catch (_: Exception) { null }
        val displayMetrics = context.resources.displayMetrics

        return JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("deviceName", DevicePrefs.deviceName)
            put("manufacturer", Build.MANUFACTURER)
            put("brand", Build.BRAND)
            put("model", Build.MODEL)
            put("product", Build.PRODUCT)
            put("board", Build.BOARD)
            put("hardware", Build.HARDWARE)
            put("androidVersion", Build.VERSION.RELEASE)
            put("sdkInt", Build.VERSION.SDK_INT)
            put("securityPatch", if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) Build.VERSION.SECURITY_PATCH else "unknown")
            put("bootloader", Build.BOOTLOADER)
            put("fingerprint", Build.FINGERPRINT)
            put("batteryLevel", Battery.level(context))
            put("isCharging", Battery.isCharging(context))
            put("uptimeMs", SystemClock.elapsedRealtime())
            put("adminActive", com.phonelink.hub.remote.LockController.isAdminActive(context))

            put("ram", JSONObject().apply {
                put("totalMem", memInfo.totalMem)
                put("availMem", memInfo.availMem)
                put("lowMemory", memInfo.lowMemory)
                put("threshold", memInfo.threshold)
            })

            put("storage", JSONObject().apply {
                val totalBytes = dataStat?.totalBytes ?: 0L
                val availBytes = dataStat?.availableBytes ?: 0L
                put("totalBytes", totalBytes)
                put("availableBytes", availBytes)
                put("usedBytes", (totalBytes - availBytes).coerceAtLeast(0L))
            })

            put("display", JSONObject().apply {
                put("widthPixels", displayMetrics.widthPixels)
                put("heightPixels", displayMetrics.heightPixels)
                put("density", displayMetrics.density.toDouble())
                put("densityDpi", displayMetrics.densityDpi)
            })
        }
    }
}

