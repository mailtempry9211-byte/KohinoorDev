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

    /** Our own app's service notification would otherwise loop back on every connect. */
    private const val OWN_PACKAGE = "com.phonelink.hub"

    private val IGNORED_EXACT = setOf(
        OWN_PACKAGE,
        "com.android.systemui",
        "android"
    )

    /** System / OEM UI packages whose notifications are never user content. */
    private val IGNORED_PREFIXES = emptyList<String>()

    fun isIgnored(packageName: String, payload: JSONObject): Boolean {
        if (packageName == OWN_PACKAGE) return true
        if (packageName in IGNORED_EXACT) return true
        if (IGNORED_PREFIXES.any { packageName.startsWith(it) }) return true
        // NOTE (BUG 3 fix): the old code dropped EVERY ongoing / group-summary
        // notification. That also killed legitimate user content (music apps,
        // messaging foreground notifications, grouped WhatsApp/Telegram chats),
        // so genuine app notifications never reached the dashboard while bare
        // system rows with text still came through. Only package-based noise is
        // dropped now; empty/text-less rows are already filtered by the
        // extractor returning null.
        return false
    }
}