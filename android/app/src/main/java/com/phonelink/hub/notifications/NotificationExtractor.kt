package com.phonelink.hub.notifications

import android.app.Notification
import android.content.Context
import android.content.pm.PackageManager
import android.os.Bundle
import android.service.notification.StatusBarNotification
import android.text.TextUtils
import android.util.Log
import org.json.JSONObject

/**
 * Pulls human-readable text out of a notification.
 *
 * Android has no single source of truth here: a plain notification uses
 * EXTRA_TITLE/EXTRA_TEXT, a messaging app puts the message in EXTRA_TEXT only
 * after collapsing EXTRA_MESSAGES, a music player may show only media metadata,
 * and group summaries nest their children. So we try each shape in order.
 */
object NotificationExtractor {

    fun extract(context: Context, sbn: StatusBarNotification): JSONObject? {
        val extras: Bundle = sbn.notification.extras ?: return null

        val title = firstNonBlank(
            sbn.notification.extras.getCharSequence(Notification.EXTRA_TITLE)?.toString(),
            extras.getCharSequence(Notification.EXTRA_CONVERSATION_TITLE)?.toString(),
            sbn.notification.extras.getCharSequence(Notification.EXTRA_TITLE_BIG)?.toString()
        )

        val body = firstNonBlank(
            readMessagingStyle(extras),
            extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString(),
            extras.getCharSequence(Notification.EXTRA_TEXT)?.toString(),
            readMediaMetadata(extras),
            extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString(),
            extras.getCharSequence(Notification.EXTRA_INFO_TEXT)?.toString(),
            // A "Loading…" style notification is still worth surfacing.
            extras.getCharSequence(Notification.EXTRA_TEXT_LINES)
                ?.let { TextUtils.join(" · ", it as Array<CharSequence>).toString() }
        )

        if (title.isNullOrBlank() && body.isNullOrBlank()) return null

        return JSONObject().apply {
            put("key", sbn.key)
            put("packageName", sbn.packageName)
            put("appName", appLabel(context, sbn.packageName))
            put("title", title ?: "")
            put("text", body ?: "")
            put("postTime", sbn.postTime)
            put("ongoing", isOngoing(sbn))
            put("summary", isGroupSummary(sbn))
        }
    }

    /** MessagingStyle keeps recent messages in EXTRA_MESSAGES as Parcelable objects. */
    private fun readMessagingStyle(extras: Bundle): String? {
        if (extras.containsKey(Notification.EXTRA_MESSAGES)) {
            @Suppress("DEPRECATION")
            val messages = extras.getParcelableArray(Notification.EXTRA_MESSAGES) ?: return null
            val parts = messages.takeLast(3).mapNotNull { message ->
                val bundle = (message as? Bundle) ?: return@mapNotNull null
                val text = bundle.getCharSequence("text")?.toString()
                val sender = bundle.getCharSequence("sender")?.toString()
                when {
                    !text.isNullOrBlank() && !sender.isNullOrBlank() -> "$sender: $text"
                    !text.isNullOrBlank() -> text
                    else -> null
                }
            }
            return parts.takeIf { it.isNotEmpty() }?.joinToString("\n")
        }

        // Extras are typed as CharSequence, so this cast is unchecked but safe here.
        val lines = extras.getCharSequenceArrayList(Notification.EXTRA_TEXT_LINES)
        return lines?.takeIf { it.isNotEmpty() }?.joinToString("\n")
    }

    /** Music players often leave title/text empty and use media metadata. */
    private fun readMediaMetadata(extras: Bundle): String? {
        val artist = extras.getCharSequence("android.artist")?.toString()
        val track = extras.getCharSequence("android.title")?.toString()
        return when {
            !track.isNullOrBlank() && !artist.isNullOrBlank() -> "$track — $artist"
            !track.isNullOrBlank() -> track
            !artist.isNullOrBlank() -> artist
            else -> null
        }
    }

    private fun isOngoing(sbn: StatusBarNotification): Boolean =
        sbn.notification.flags and Notification.FLAG_ONGOING_EVENT != 0 ||
            sbn.notification.flags and Notification.FLAG_FOREGROUND_SERVICE != 0

    /** True for the parent of a grouped notification, whose children also fire. */
    private fun isGroupSummary(sbn: StatusBarNotification): Boolean =
        sbn.notification.flags and Notification.FLAG_GROUP_SUMMARY != 0

    fun appLabel(context: Context, packageName: String): String = try {
        val pm = context.packageManager
        pm.getApplicationLabel(pm.getApplicationInfo(packageName, 0)).toString()
    } catch (e: PackageManager.NameNotFoundException) {
        packageName
    }

    private fun firstNonBlank(vararg values: String?): String? =
        values.firstOrNull { !it.isNullOrBlank() }?.trim()

    fun debugDump(sbn: StatusBarNotification) {
        if (!DEBUG) return
        Log.d(TAG, "--- ${sbn.packageName} ---")
        sbn.notification.extras?.keySet()?.forEach { key ->
            Log.d(TAG, "  $key = ${sbn.notification.extras.get(key)}")
        }
    }

    private const val TAG = "NotificationExtractor"
    private const val DEBUG = false
}
