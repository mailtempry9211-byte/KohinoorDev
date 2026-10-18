package com.phonelink.hub.sms

import android.Manifest
import android.app.PendingIntent
import android.content.Context
import android.content.pm.PackageManager
import android.telephony.SmsManager
import androidx.core.content.ContextCompat

/** Reads the SMS inbox and sends SMS that the dashboard asks for. */
object SmsRepository {

    fun hasReadPermission(context: Context): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED

    fun hasSendPermission(context: Context): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED

    /** Reads the newest inbox messages. type 1 = received, 2 = sent. */
    fun readInbox(context: Context, limit: Int = 500): List<org.json.JSONObject> {
        if (!hasReadPermission(context)) return emptyList()

        val out = mutableListOf<org.json.JSONObject>()
        val projection = arrayOf(
            android.provider.Telephony.Sms._ID,
            android.provider.Telephony.Sms.ADDRESS,
            android.provider.Telephony.Sms.BODY,
            android.provider.Telephony.Sms.DATE,
            android.provider.Telephony.Sms.TYPE
        )

        try {
            val cursor = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                try {
                    val bundle = android.os.Bundle().apply {
                        putInt(android.content.ContentResolver.QUERY_ARG_LIMIT, limit)
                        putStringArray(android.content.ContentResolver.QUERY_ARG_SORT_COLUMNS, arrayOf(android.provider.Telephony.Sms.DATE))
                        putInt(android.content.ContentResolver.QUERY_ARG_SORT_DIRECTION, android.content.ContentResolver.QUERY_SORT_DIRECTION_DESCENDING)
                    }
                    context.contentResolver.query(android.provider.Telephony.Sms.Inbox.CONTENT_URI, projection, bundle, null)
                } catch (_: Exception) {
                    context.contentResolver.query(android.provider.Telephony.Sms.Inbox.CONTENT_URI, projection, null, null, "${android.provider.Telephony.Sms.DATE} DESC")
                }
            } else {
                context.contentResolver.query(android.provider.Telephony.Sms.Inbox.CONTENT_URI, projection, null, null, "${android.provider.Telephony.Sms.DATE} DESC")
            }

            cursor?.use { c ->
                while (c.moveToNext() && out.size < limit) {
                    val id = c.getLong(0)
                    val address = c.getString(1) ?: ""
                    val body = c.getString(2) ?: ""
                    val date = c.getLong(3)
                    val type = c.getInt(4)

                    out += org.json.JSONObject().apply {
                        put("id", "sms-$id")
                        put("address", address)
                        put("body", body)
                        put("date", date)
                        put("type", if (type == android.provider.Telephony.Sms.MESSAGE_TYPE_SENT) 2 else 1)
                    }
                }
            }
        } catch (e: Exception) {
            android.util.Log.w("SmsRepository", "readInbox error: ${e.message}")
        }
        return out
    }

    /** Reads the whole SMS store (inbox + sent) for the conversation view. */
    fun readAll(context: Context, limit: Int = 1000): List<org.json.JSONObject> {
        if (!hasReadPermission(context)) return emptyList()

        val out = mutableListOf<org.json.JSONObject>()
        val projection = arrayOf(
            android.provider.Telephony.Sms._ID,
            android.provider.Telephony.Sms.ADDRESS,
            android.provider.Telephony.Sms.BODY,
            android.provider.Telephony.Sms.DATE,
            android.provider.Telephony.Sms.TYPE
        )

        try {
            val cursor = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                try {
                    val bundle = android.os.Bundle().apply {
                        putInt(android.content.ContentResolver.QUERY_ARG_LIMIT, limit)
                        putStringArray(android.content.ContentResolver.QUERY_ARG_SORT_COLUMNS, arrayOf(android.provider.Telephony.Sms.DATE))
                        putInt(android.content.ContentResolver.QUERY_ARG_SORT_DIRECTION, android.content.ContentResolver.QUERY_SORT_DIRECTION_DESCENDING)
                    }
                    context.contentResolver.query(android.provider.Telephony.Sms.CONTENT_URI, projection, bundle, null)
                } catch (_: Exception) {
                    context.contentResolver.query(android.provider.Telephony.Sms.CONTENT_URI, projection, null, null, "${android.provider.Telephony.Sms.DATE} DESC")
                }
            } else {
                context.contentResolver.query(android.provider.Telephony.Sms.CONTENT_URI, projection, null, null, "${android.provider.Telephony.Sms.DATE} DESC")
            }

            cursor?.use { c ->
                while (c.moveToNext() && out.size < limit) {
                    val id = c.getLong(0)
                    val address = c.getString(1) ?: ""
                    val body = c.getString(2) ?: ""
                    val date = c.getLong(3)
                    val type = c.getInt(4)

                    out += org.json.JSONObject().apply {
                        put("id", "sms-$id")
                        put("address", address)
                        put("body", body)
                        put("date", date)
                        put("type", if (type == android.provider.Telephony.Sms.MESSAGE_TYPE_SENT) 2 else 1)
                    }
                }
            }
        } catch (e: Exception) {
            android.util.Log.w("SmsRepository", "readAll error: ${e.message}")
        }
        return out
    }

    /**
     * Sends an SMS directly. Multipart messages are split by the platform so
     * long messages are not truncated.
     */
    fun sendSms(context: Context, recipient: String, message: String): Boolean {
        if (!hasSendPermission(context)) return false
        return try {
            val smsManager = if (android.os.Build.VERSION.SDK_INT >= 31) {
                context.getSystemService(SmsManager::class.java)
            } else {
                @Suppress("DEPRECATION")
                SmsManager.getDefault()
            }

            val parts = smsManager.divideMessage(message)
            if (parts.size <= 1) {
                smsManager.sendTextMessage(recipient, null, message, null, null)
            } else {
                val sentIntents = ArrayList<PendingIntent>()
                val deliveryIntents = ArrayList<PendingIntent>()
                repeat(parts.size) {
                    sentIntents.add(emptyPendingIntent(context))
                    deliveryIntents.add(emptyPendingIntent(context))
                }
                smsManager.sendMultipartTextMessage(recipient, null, parts, sentIntents, deliveryIntents)
            }
            true
        } catch (e: Exception) {
            android.util.Log.e("SmsRepository", "sendSms failed", e)
            false
        }
    }

    private fun emptyPendingIntent(context: Context): PendingIntent = PendingIntent.getBroadcast(
        context,
        0,
        android.content.Intent(),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )
}