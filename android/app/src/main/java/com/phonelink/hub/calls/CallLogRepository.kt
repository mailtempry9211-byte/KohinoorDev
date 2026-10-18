package com.phonelink.hub.calls

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.provider.CallLog
import androidx.core.content.ContextCompat
import org.json.JSONObject

object CallLogRepository {

    fun hasPermission(context: Context): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED

    /** Reads the most recent call log entries, newest first. */
    fun readCalls(context: Context, limit: Int = 200): List<JSONObject> {
        if (!hasPermission(context)) return emptyList()

        val results = mutableListOf<JSONObject>()
        val projection = arrayOf(
            CallLog.Calls._ID,
            CallLog.Calls.NUMBER,
            CallLog.Calls.CACHED_NAME,
            CallLog.Calls.TYPE,
            CallLog.Calls.DURATION,
            CallLog.Calls.DATE
        )

        try {
            val cursor = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                try {
                    val bundle = android.os.Bundle().apply {
                        putInt(android.content.ContentResolver.QUERY_ARG_LIMIT, limit)
                        putStringArray(android.content.ContentResolver.QUERY_ARG_SORT_COLUMNS, arrayOf(CallLog.Calls.DATE))
                        putInt(android.content.ContentResolver.QUERY_ARG_SORT_DIRECTION, android.content.ContentResolver.QUERY_SORT_DIRECTION_DESCENDING)
                    }
                    context.contentResolver.query(CallLog.Calls.CONTENT_URI, projection, bundle, null)
                } catch (_: Exception) {
                    context.contentResolver.query(CallLog.Calls.CONTENT_URI, projection, null, null, "${CallLog.Calls.DATE} DESC")
                }
            } else {
                context.contentResolver.query(CallLog.Calls.CONTENT_URI, projection, null, null, "${CallLog.Calls.DATE} DESC")
            }

            cursor?.use { c ->
                while (c.moveToNext() && results.size < limit) {
                    val id = c.getLong(0)
                    val number = c.getString(1) ?: ""
                    val name = c.getString(2)
                    val rawType = c.getInt(3)
                    val duration = c.getLong(4).toInt()
                    val timestamp = c.getLong(5)

                    results += JSONObject().apply {
                        put("id", "call-$id")
                        put("number", number)
                        put("name", name ?: JSONObject.NULL)
                        put("type", normalizeType(rawType))
                        put("duration", duration)
                        put("timestamp", timestamp)
                    }
                }
            }
        } catch (e: Exception) {
            android.util.Log.w("CallLogRepository", "readCalls error: ${e.message}")
        }
        return results
    }

    /** Maps the platform call type to the dashboard filter values. */
    fun normalizeType(type: Int): String = when (type) {
        CallLog.Calls.INCOMING_TYPE -> "incoming"
        CallLog.Calls.OUTGOING_TYPE -> "outgoing"
        CallLog.Calls.MISSED_TYPE -> "missed"
        CallLog.Calls.VOICEMAIL_TYPE -> "missed"
        CallLog.Calls.REJECTED_TYPE -> "missed"
        else -> "incoming"
    }
}