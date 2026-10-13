package com.phonelink.hub.notifications

import org.json.JSONObject

/**
 * Decides which notifications are worth mirroring.
 *
 * Without filtering the feed is dominated by noise: our own app, low-priority
 * ongoing rows (music players, navigation, download bars), group summaries that
 * duplicate their children, and cleanup rows that carry no text.
 */
object NotificationFilter {

    /** Our own app's service notification would otherwise spawn on every connect. */
    private val IGNORED_PACKAGES = setOf(
        "com.phonelink.hub",
        "com.android.systemui",
        "android"
    )

    fun isIgnored(packageName: String, payload: JSONObject): Boolean {
        if (packageName in IGNORED_PACKAGES) return true
        // Group summaries repeat what their children already carry.
        if (payload.optBoolean("summary")) return true
        // Ongoing rows (media players, navigation, download progress) never go away.
        if (payload.optBoolean("ongoing")) return true
        return false
    }
}