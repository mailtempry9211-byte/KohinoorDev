package com.phonelink.hub.blocker

import android.content.Context
import android.content.SharedPreferences
import android.telephony.PhoneNumberUtils
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

object BlocklistStore {
    private const val TAG = "BlocklistStore"
    private const val PREFS_NAME = "phonelink_blocklist"
    private const val KEY_ENABLED = "blocker_enabled"
    private const val KEY_NUMBERS = "blocked_numbers"

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun isEnabled(context: Context): Boolean {
        return getPrefs(context).getBoolean(KEY_ENABLED, false)
    }

    fun setEnabled(context: Context, enabled: Boolean) {
        getPrefs(context).edit().putBoolean(KEY_ENABLED, enabled).apply()
        Log.d(TAG, "Blocklist enabled state set to: $enabled")
    }

    fun getBlockedNumbers(context: Context): Set<String> {
        return getPrefs(context).getStringSet(KEY_NUMBERS, emptySet()) ?: emptySet()
    }

    fun setBlocklist(context: Context, enabled: Boolean, numbers: List<String>) {
        val cleanSet = numbers.map { it.trim() }.filter { it.isNotBlank() }.toSet()
        getPrefs(context).edit()
            .putBoolean(KEY_ENABLED, enabled)
            .putStringSet(KEY_NUMBERS, cleanSet)
            .apply()
        Log.d(TAG, "Saved blocklist: enabled=$enabled count=${cleanSet.size}")
    }

    fun addNumber(context: Context, number: String): Boolean {
        val clean = number.trim()
        if (clean.isBlank()) return false
        val current = getBlockedNumbers(context).toMutableSet()
        current.add(clean)
        getPrefs(context).edit().putStringSet(KEY_NUMBERS, current).apply()
        return true
    }

    fun removeNumber(context: Context, number: String): Boolean {
        val clean = number.trim()
        val current = getBlockedNumbers(context).toMutableSet()
        val removed = current.remove(clean)
        if (removed) {
            getPrefs(context).edit().putStringSet(KEY_NUMBERS, current).apply()
        }
        return removed
    }

    fun isBlocked(context: Context, rawNumber: String?): Boolean {
        if (!isEnabled(context)) return false
        if (rawNumber.isNullOrBlank()) return false

        val blockedSet = getBlockedNumbers(context)
        if (blockedSet.isEmpty()) return false

        val cleanIncoming = rawNumber.replace(Regex("[^0-9+]"), "")

        for (blocked in blockedSet) {
            val cleanBlocked = blocked.replace(Regex("[^0-9+]"), "")
            if (cleanBlocked.isEmpty()) continue

            // Direct match or standard phone number comparison (matches last 7-10 digits)
            if (cleanIncoming == cleanBlocked ||
                PhoneNumberUtils.compare(cleanIncoming, cleanBlocked) ||
                cleanIncoming.endsWith(cleanBlocked) ||
                cleanBlocked.endsWith(cleanIncoming)
            ) {
                Log.i(TAG, "Incoming number $rawNumber MATCHED blocked rule $blocked")
                return true
            }
        }
        return false
    }

    fun toJson(context: Context): JSONObject {
        val numbers = getBlockedNumbers(context).toList().sorted()
        return JSONObject().apply {
            put("enabled", isEnabled(context))
            put("numbers", JSONArray(numbers))
            put("count", numbers.size)
        }
    }
}
