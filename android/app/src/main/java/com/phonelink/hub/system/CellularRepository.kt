package com.phonelink.hub.system

import android.annotation.SuppressLint
import android.content.Context
import android.os.Build
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager
import android.util.Log
import com.phonelink.hub.data.DevicePrefs
import org.json.JSONArray
import org.json.JSONObject

/**
 * Retrieves Dual-SIM carrier telemetry, cellular signal strength (bars/dBm),
 * and live network generation (5G/4G/3G/2G).
 */
object CellularRepository {
    private const val TAG = "CellularRepository"

    @SuppressLint("MissingPermission")
    fun getCellularInfo(context: Context): JSONObject {
        val result = JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("timestamp", System.currentTimeMillis())
        }

        val telephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
        if (telephonyManager == null) {
            result.put("error", "TelephonyManager unavailable")
            return result
        }

        try {
            result.put("networkOperatorName", telephonyManager.networkOperatorName ?: "Unknown")
            result.put("simOperatorName", telephonyManager.simOperatorName ?: "Unknown")
            result.put("networkCountryIso", telephonyManager.networkCountryIso ?: "")
            result.put("isNetworkRoaming", telephonyManager.isNetworkRoaming)
            result.put("phoneType", when (telephonyManager.phoneType) {
                TelephonyManager.PHONE_TYPE_GSM -> "GSM"
                TelephonyManager.PHONE_TYPE_CDMA -> "CDMA"
                TelephonyManager.PHONE_TYPE_SIP -> "SIP"
                else -> "NONE"
            })

            // Data State
            val dataState = try {
                when (telephonyManager.dataState) {
                    TelephonyManager.DATA_CONNECTED -> "CONNECTED"
                    TelephonyManager.DATA_CONNECTING -> "CONNECTING"
                    TelephonyManager.DATA_DISCONNECTED -> "DISCONNECTED"
                    TelephonyManager.DATA_SUSPENDED -> "SUSPENDED"
                    else -> "UNKNOWN"
                }
            } catch (_: Exception) { "UNKNOWN" }
            result.put("dataState", dataState)

            // Network Generation
            val netTypeInt = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                try { 
                    telephonyManager.dataNetworkType 
                } catch (_: Exception) { 
                    try { telephonyManager.networkType } catch (_: Exception) { TelephonyManager.NETWORK_TYPE_UNKNOWN }
                }
            } else {
                @Suppress("DEPRECATION")
                try { telephonyManager.networkType } catch (_: Exception) { TelephonyManager.NETWORK_TYPE_UNKNOWN }
            }

            val (gen, typeName) = when (netTypeInt) {
                20 -> Pair("5G", "NR (5G SA/NSA)") // TelephonyManager.NETWORK_TYPE_NR
                TelephonyManager.NETWORK_TYPE_LTE -> Pair("4G", "LTE (4G+)")
                TelephonyManager.NETWORK_TYPE_HSPAP,
                TelephonyManager.NETWORK_TYPE_HSPA,
                TelephonyManager.NETWORK_TYPE_HSDPA,
                TelephonyManager.NETWORK_TYPE_HSUPA,
                TelephonyManager.NETWORK_TYPE_UMTS -> Pair("3G", "HSPA/UMTS (3G)")
                TelephonyManager.NETWORK_TYPE_EDGE,
                TelephonyManager.NETWORK_TYPE_GPRS -> Pair("2G", "EDGE/2G")
                else -> Pair("Cellular", "Active")
            }
            result.put("networkGen", gen)
            result.put("networkTypeName", typeName)

            // Signal Strength
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                try {
                    val ss = telephonyManager.signalStrength
                    if (ss != null) {
                        result.put("signalLevel", ss.level) // 0 to 4
                    }
                } catch (_: Exception) {}
            }

            // Dual SIM Information via SubscriptionManager
            val simList = JSONArray()
            try {
                val sm = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? SubscriptionManager
                if (sm != null) {
                    val subs = sm.activeSubscriptionInfoList
                    if (subs != null) {
                        for (sub in subs) {
                            val simObj = JSONObject().apply {
                                put("slotIndex", sub.simSlotIndex)
                                put("simSlot", "SIM ${sub.simSlotIndex + 1}")
                                put("carrierName", sub.carrierName?.toString() ?: "Unknown")
                                put("displayName", sub.displayName?.toString() ?: "")
                                put("countryIso", sub.countryIso ?: "")
                                put("dataRoaming", sub.dataRoaming == SubscriptionManager.DATA_ROAMING_ENABLE)
                            }
                            simList.put(simObj)
                        }
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "SubscriptionManager warning: ${e.message}")
            }
            result.put("sims", simList)

        } catch (e: Exception) {
            Log.e(TAG, "getCellularInfo failed", e)
            result.put("error", e.message ?: "Failed to read cellular info")
        }

        return result
    }
}

