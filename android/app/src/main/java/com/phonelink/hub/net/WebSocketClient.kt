package com.phonelink.hub.net

import android.util.Log
import com.phonelink.hub.data.Events
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Owns the socket to the Node relay. Reconnects with backoff and exposes
 * [listener] callbacks for server commands.
 */
class WebSocketClient(
    private val prefsProvider: () -> Pair<String, Int>,
    private val listener: Listener
) {

    interface Listener {
        fun onOpen()
        fun onClosed()
        fun onFailure(message: String)
        fun onCommand(event: String, payload: JSONObject)
    }

    private val client = OkHttpClient.Builder()
        .pingInterval(20, TimeUnit.SECONDS)
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .connectTimeout(10, TimeUnit.SECONDS)
        .build()

    private var socket: WebSocket? = null
    private var closedByUser = false
    private var connected = false
    private var reconnectPending = false
    private var retryAttempt = 0

    fun connect() {
        closedByUser = false
        openSocket()
    }

    fun disconnect() {
        closedByUser = true
        reconnectPending = false
        connected = false
        socket?.close(1000, "user stopped")
        socket = null
    }

    val isOpen: Boolean
        get() = connected && socket != null

    private fun openSocket() {
        if (closedByUser) return
        // A live socket or a queued reconnect means we are already connecting.
        if (socket != null || reconnectPending) return

        val (ip, port) = prefsProvider()
        if (ip.isBlank()) {
            listener.onFailure("Server IP not configured")
            return
        }

        val url = buildUrl(ip, port)
        Log.i(TAG, "connecting to $url")

        val request = Request.Builder().url(url).build()
        socket = client.newWebSocket(request, object : WebSocketListener() {

            override fun onOpen(ws: WebSocket, response: Response) {
                Log.i(TAG, "socket open")
                retryAttempt = 0
                reconnectPending = false
                connected = true
                listener.onOpen()
            }

            override fun onMessage(ws: WebSocket, text: String) {
                handleMessage(text)
            }

            override fun onClosing(ws: WebSocket, code: Int, reason: String) {
                ws.close(1000, null)
            }

            override fun onClosed(ws: WebSocket, code: Int, reason: String) {
                Log.i(TAG, "socket closed ($code)")
                connected = false
                socket = null
                if (!closedByUser) {
                    listener.onClosed()
                    scheduleReconnect()
                }
            }

            override fun onFailure(ws: WebSocket, t: Throwable, response: Response?) {
                Log.w(TAG, "socket failure: ${t.message}")
                connected = false
                socket = null
                if (!closedByUser) {
                    listener.onFailure(t.message ?: "connection failed")
                    scheduleReconnect()
                }
            }
        })
    }

    private fun scheduleReconnect() {
        if (closedByUser) return
        val delayMs = RECONNECT_BASE_MS.coerceAtLeast(retryAttempt * retryAttempt * 1000L)
            .coerceAtMost(RECONNECT_MAX_MS)
        retryAttempt += 1
        reconnectPending = true
        Log.i(TAG, "reconnecting in ${delayMs}ms (attempt $retryAttempt)")
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            reconnectPending = false
            openSocket()
        }, delayMs)
    }

    private fun handleMessage(text: String) {
        try {
            val json = JSONObject(text)
            val event = json.optString("event").ifEmpty { return }
            val payload = json.optJSONObject("payload") ?: JSONObject()
            listener.onCommand(event, payload)
        } catch (e: Exception) {
            Log.e(TAG, "bad message from server", e)
        }
    }

    /**
     * Builds the final ws(s):// URL from whatever the user typed.
     * Accepts: bare IP (ws://ip:port), bare domain (wss://domain — ngrok
     * default), host:port, or a full ws://|wss://|http://|https:// URL.
     */
    private fun buildUrl(raw: String, port: Int): String {
        val s = raw.trim().trimEnd('/')
        // Full URLs pass straight through (scheme-normalised for http(s)).
        val lower = s.lowercase()
        return when {
            lower.startsWith("wss://") -> s
            lower.startsWith("ws://") -> s
            lower.startsWith("https://") -> "wss://" + s.substring(8)
            lower.startsWith("http://") -> "ws://" + s.substring(7)
            // host:port — treat as ws with the given port (local dev).
            s.contains(':') && s.substringAfterLast(':').all { it.isDigit() } -> "ws://$s"
            // Bare IPv4 address — use the configured default port.
            s.matches(Regex("""^\d{1,3}(\.\d{1,3}){3}$""")) -> "ws://$s:$port"
            // Bare domain (e.g. ngrok) — default to secure wss on 443.
            else -> "wss://$s"
        }
    }

    /** Sends [{event, payload}] on the socket. */
    fun send(event: String, payload: JSONObject): Boolean {
        val body = JSONObject().apply {
            put("event", event)
            put("payload", payload)
        }.toString()
        val ok = socket?.send(body) ?: false
        if (!ok) Log.w(TAG, "send($event) dropped — socket not open")
        return ok
    }

    companion object {
        private const val TAG = "PhoneLinkWS"
        private const val RECONNECT_BASE_MS = 1_000L
        private const val RECONNECT_MAX_MS = 30_000L
    }
}