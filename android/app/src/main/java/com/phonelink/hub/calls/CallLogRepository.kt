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

        context.contentResolver.query(
            CallLog.Calls.CONTENT_URI,
            projection,
            null,
            null,
            "${CallLog.Calls.DATE} DESC LIMIT $limit"
        )?.use { cursor ->
            while (cursor.moveToNext()) {
                val id = cursor.getLong(0)
                val number = cursor.getString(1) ?: ""
                val name = cursor.getString(2)
                val rawType = cursor.getInt(3)
                val duration = cursor.getLong(4).toInt()
                val timestamp = cursor.getLong(5)

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