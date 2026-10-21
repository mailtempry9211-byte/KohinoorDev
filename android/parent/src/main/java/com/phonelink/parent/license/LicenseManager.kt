package com.phonelink.parent.license

import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import android.provider.Settings
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

/**
 * Commercial License Manager for PhoneLink Parent Hub Android App.
 * Handles HWID generation, Supabase online verification, and secret Owner God Mode.
 */
object LicenseManager {

    private const val TAG = "LicenseManager"
    private const val PREFS_NAME = "phonelink_license_prefs"

    // Supabase credentials (same as PC version)
    private const val SUPABASE_URL = "https://dhqqyinbtjttndxfeloa.supabase.co"
    private const val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRocXF5aW5idGp0dG5keGZlbG9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzODI3ODAsImV4cCI6MjEwNzk1ODc4MH0.w4K9J9Qrn-IA1uAL_qXtbQ626-lKZpEke3GLu7s6exE"
    const val SUPPORT_PHONE = "8418944572"

    // 👑 Secret Owner Master Passwords for Unrestricted God Mode
    private val MASTER_GOD_KEYS = setOf(
        "9211921192119211",
        "Humsafar@1998Humsafar@1998Humsafar@1998Humsafar@1998"
    )

    private const val KEY_ACTIVATED = "is_activated"
    private const val KEY_IS_GOD_MODE = "is_god_mode"
    private const val KEY_LICENSE_KEY = "license_key"
    private const val KEY_PLAN_TYPE = "plan_type"
    private const val KEY_VALID_UNTIL = "valid_until"
    private const val KEY_MAX_DEVICES = "max_devices"

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    /**
     * Generates a stable hardware identifier (HWID) based on Android ID and Hardware profile.
     */
    fun getMachineHwid(context: Context): String {
        return try {
            val androidId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID) ?: "UNKNOWN_DEV"
            val raw = "${androidId}_${Build.BOARD}_${Build.MANUFACTURER}_${Build.MODEL}"
            val md = MessageDigest.getInstance("SHA-256")
            val digest = md.digest(raw.toByteArray(Charsets.UTF_8))
            val hex = digest.joinToString("") { "%02x".format(it) }
            "AND-" + hex.substring(0, 16).uppercase()
        } catch (e: Exception) {
            "AND-" + Build.MODEL.replace(" ", "").take(12).uppercase()
        }
    }

    /**
     * Returns full license status for dashboard API /api/license/status.
     */
    fun getLicenseStatus(context: Context): Map<String, Any?> {
        val prefs = getPrefs(context)
        val activated = prefs.getBoolean(KEY_ACTIVATED, false)
        val isGodMode = prefs.getBoolean(KEY_IS_GOD_MODE, false)
        val licenseKey = prefs.getString(KEY_LICENSE_KEY, "") ?: ""
        val planType = prefs.getString(KEY_PLAN_TYPE, if (isGodMode) "👑 Owner God Mode (Unrestricted)" else "Pro Lifetime") ?: "Pro Lifetime"
        val validUntil = prefs.getString(KEY_VALID_UNTIL, "") ?: ""
        val maxDevices = prefs.getInt(KEY_MAX_DEVICES, if (isGodMode) 9999 else 5)
        val hwid = getMachineHwid(context)

        return mapOf(
            "activated" to activated,
            "isGodMode" to isGodMode,
            "licenseKey" to licenseKey,
            "planType" to planType,
            "hwid" to hwid,
            "validUntil" to validUntil,
            "maxDevices" to maxDevices,
            "supportPhone" to SUPPORT_PHONE,
            "features" to listOf("unlimited_devices", "full_telemetry", "remote_controls", "live_surveillance", "god_mode")
        )
    }

    /**
     * Activates the app using a License Key or Owner Master Password.
     */
    suspend fun activateLicense(context: Context, keyInput: String): Map<String, Any?> {
        val trimmed = keyInput.trim()
        val prefs = getPrefs(context)
        val hwid = getMachineHwid(context)

        // 1. 👑 MASTER GOD MODE BYPASS (Owner Superuser)
        if (MASTER_GOD_KEYS.any { it.equals(trimmed, ignoreCase = true) }) {
            Log.i(TAG, "👑 GOD MODE UNLOCKED BY OWNER IN ANDROID PARENT HUB!")
            prefs.edit()
                .putBoolean(KEY_ACTIVATED, true)
                .putBoolean(KEY_IS_GOD_MODE, true)
                .putString(KEY_LICENSE_KEY, "OWNER-GOD-MODE-ACTIVE")
                .putString(KEY_PLAN_TYPE, "👑 Owner God Mode (Unrestricted)")
                .putString(KEY_VALID_UNTIL, "2099-12-31T23:59:59Z")
                .putInt(KEY_MAX_DEVICES, 9999)
                .apply()

            return mapOf(
                "success" to true,
                "code" to "GOD_MODE_ACTIVATED",
                "message" to "👑 God Mode Activated! Running as Application Owner with full unrestricted access.",
                "isGodMode" to true,
                "planType" to "👑 Owner God Mode (Unrestricted)"
            )
        }

        // 2. Online verification with Supabase
        return withContext(Dispatchers.IO) {
            try {
                val queryUrl = "$SUPABASE_URL/rest/v1/license_keys?key=eq.$trimmed&select=*"
                val conn = URL(queryUrl).openConnection() as HttpURLConnection
                conn.requestMethod = "GET"
                conn.setRequestProperty("apikey", SUPABASE_ANON_KEY)
                conn.setRequestProperty("Authorization", "Bearer $SUPABASE_ANON_KEY")
                conn.setRequestProperty("Accept", "application/json")
                conn.connectTimeout = 8000
                conn.readTimeout = 8000

                val code = conn.responseCode
                if (code == 200) {
                    val reader = BufferedReader(InputStreamReader(conn.inputStream))
                    val response = reader.readText()
                    reader.close()

                    val arr = JSONArray(response)
                    if (arr.length() == 0) {
                        return@withContext mapOf(
                            "success" to false,
                            "message" to "Invalid license key. Please verify or contact support at $SUPPORT_PHONE."
                        )
                    }

                    val row = arr.getJSONObject(0)
                    val status = row.optString("status", "active")
                    if (status != "active") {
                        return@withContext mapOf(
                            "success" to false,
                            "message" to "This license is inactive or expired ($status)."
                        )
                    }

                    val planType = row.optString("plan_type", "Pro License")
                    val maxDevices = row.optInt("max_devices", 5)
                    val validUntil = row.optString("valid_until", "")

                    // Register this device HWID
                    registerHwidToSupabase(trimmed, hwid, row)

                    prefs.edit()
                        .putBoolean(KEY_ACTIVATED, true)
                        .putBoolean(KEY_IS_GOD_MODE, false)
                        .putString(KEY_LICENSE_KEY, trimmed)
                        .putString(KEY_PLAN_TYPE, planType)
                        .putString(KEY_VALID_UNTIL, validUntil)
                        .putInt(KEY_MAX_DEVICES, maxDevices)
                        .apply()

                    mapOf(
                        "success" to true,
                        "code" to "ACTIVATED",
                        "message" to "License successfully activated for $planType!",
                        "planType" to planType
                    )
                } else {
                    mapOf(
                        "success" to false,
                        "message" to "License server error ($code). Please check internet connection."
                    )
                }
            } catch (e: Exception) {
                Log.e(TAG, "License activation error: ${e.message}", e)
                mapOf(
                    "success" to false,
                    "message" to "Connection error: ${e.message ?: "Failed connecting to licensing authority"}"
                )
            }
        }
    }

    private fun registerHwidToSupabase(key: String, hwid: String, row: JSONObject) {
        try {
            val regDevices = row.optJSONArray("registered_devices") ?: JSONArray()
            var exists = false
            for (i in 0 until regDevices.length()) {
                val d = regDevices.optJSONObject(i)
                if (d?.optString("hwid") == hwid) {
                    exists = true
                    break
                }
            }
            if (!exists) {
                regDevices.put(JSONObject().apply {
                    put("hwid", hwid)
                    put("device_name", "${Build.MANUFACTURER} ${Build.MODEL} (Android Parent Hub)")
                    put("activated_at", java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US).format(java.util.Date()))
                })

                val patchUrl = "$SUPABASE_URL/rest/v1/license_keys?key=eq.$key"
                val patchConn = URL(patchUrl).openConnection() as HttpURLConnection
                patchConn.requestMethod = "POST"
                patchConn.setRequestProperty("X-HTTP-Method-Override", "PATCH")
                patchConn.setRequestProperty("apikey", SUPABASE_ANON_KEY)
                patchConn.setRequestProperty("Authorization", "Bearer $SUPABASE_ANON_KEY")
                patchConn.setRequestProperty("Content-Type", "application/json")
                patchConn.doOutput = true
                val writer = OutputStreamWriter(patchConn.outputStream)
                writer.write(JSONObject().apply {
                    put("registered_devices", regDevices)
                }.toString())
                writer.flush()
                writer.close()
                patchConn.responseCode
            }
        } catch (e: Exception) {
            Log.w(TAG, "HWID registration update warning: ${e.message}")
        }
    }

    /**
     * Deactivates the current license.
     */
    fun logout(context: Context): Map<String, Any?> {
        val prefs = getPrefs(context)
        prefs.edit().clear().apply()
        return mapOf("success" to true, "message" to "Logged out. License deactivated.")
    }
}

