package com.phonelink.parent.tunnel

import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.io.BufferedReader
import java.io.File
import java.io.InputStreamReader
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Manages Out-of-Network Port Forwarding and Tunneling for PhoneLink Parent Hub.
 * Directly runs embedded Ngrok native executable binary without needing Termux or root.
 * Captures full real-time logs for live diagnostic inspection in the UI.
 */
object TunnelManager {

    private const val TAG = "TunnelManager"
    private const val PREFS_NAME = "phonelink_tunnel_prefs"
    const val PREF_TUNNEL_ENABLED = "tunnel_enabled"
    const val PREF_NGROK_TOKEN = "ngrok_authtoken"
    const val PREF_NGROK_DOMAIN = "ngrok_domain"
    const val PREF_AUTO_START = "tunnel_auto_start"

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var activeTunnelUrl: String? = null
    private var isRunning = false
    private var ngrokProcess: Process? = null
    private var currentPid: Long = -1

    // Detailed status text for UI (e.g., "Starting", "Live", "Failed with exit code 1", etc.)
    private var detailedStatus: String = "Stopped"

    // Real-time log buffer (stores last 500 lines)
    private val logHistory = mutableListOf<String>()
    var onLogListener: ((String) -> Unit)? = null
    var onStatusListener: ((Boolean, String?, String) -> Unit)? = null

    fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun isEnabled(context: Context): Boolean {
        return getPrefs(context).getBoolean(PREF_TUNNEL_ENABLED, false)
    }

    fun isAutoStart(context: Context): Boolean {
        return getPrefs(context).getBoolean(PREF_AUTO_START, true)
    }

    fun getNgrokDomain(context: Context): String {
        return getPrefs(context).getString(PREF_NGROK_DOMAIN, "") ?: ""
    }

    fun getNgrokToken(context: Context): String {
        return getPrefs(context).getString(PREF_NGROK_TOKEN, "") ?: ""
    }

    fun getActiveUrl(): String? = activeTunnelUrl

    fun isTunnelRunning(): Boolean = isRunning

    fun getDetailedStatus(): String = detailedStatus

    fun getRecentLogs(): String {
        synchronized(logHistory) {
            return logHistory.joinToString("\n")
        }
    }

    fun clearLogs() {
        synchronized(logHistory) {
            logHistory.clear()
        }
        appendLog("Logs cleared.")
    }

    private fun appendLog(msg: String) {
        val timestamp = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
        val entry = "[$timestamp] $msg"
        Log.i(TAG, entry)
        synchronized(logHistory) {
            logHistory.add(entry)
            if (logHistory.size > 500) {
                logHistory.removeAt(0)
            }
        }
        onLogListener?.invoke(entry)
    }

    private fun updateStatus(running: Boolean, url: String?, detail: String) {
        isRunning = running
        activeTunnelUrl = url
        detailedStatus = detail
        onStatusListener?.invoke(running, url, detail)
    }

    /**
     * Resolves the executable ngrok binary on device.
     */
    fun getNgrokExecutable(context: Context): File? {
        try {
            val nativeDir = File(context.applicationInfo.nativeLibraryDir)
            val nativeSo = File(nativeDir, "libngrok.so")
            if (nativeSo.exists()) {
                appendLog("Found native libngrok.so in nativeLibraryDir: ${nativeSo.absolutePath} (${nativeSo.length()} bytes, canExec=${nativeSo.canExecute()})")
                return nativeSo
            } else {
                appendLog("Warning: libngrok.so not found in nativeLibraryDir (${nativeDir.absolutePath})")
            }
        } catch (e: Exception) {
            appendLog("Error probing nativeLibraryDir: ${e.message}")
        }

        // Fallback: internal files directory
        val internalBin = File(context.filesDir, "libngrok.so")
        if (internalBin.exists()) {
            internalBin.setExecutable(true, false)
            appendLog("Found fallback libngrok.so in filesDir: ${internalBin.absolutePath} (${internalBin.length()} bytes)")
            return internalBin
        }

        return null
    }

    /**
     * Starts Ngrok tunnel on the given local port (default 5000).
     */
    fun startTunnel(
        context: Context,
        port: Int = 5000,
        onStatusChange: ((Boolean, String?) -> Unit)? = null
    ) {
        val prefs = getPrefs(context)
        val rawDomain = prefs.getString(PREF_NGROK_DOMAIN, "")?.trim() ?: ""
        val token = prefs.getString(PREF_NGROK_TOKEN, "")?.trim() ?: ""

        // Clean domain: remove any http://, https://, and trailing slashes
        val cleanDomain = rawDomain
            .removePrefix("https://")
            .removePrefix("http://")
            .trimEnd('/')
            .trim()

        // If already actively connected to the domain, notify immediately
        if (isRunning && activeTunnelUrl != null && !activeTunnelUrl!!.startsWith("Connecting")) {
            onStatusChange?.invoke(true, activeTunnelUrl)
            return
        }

        // Kill existing process if restarting
        stopProcessInternal()

        scope.launch {
            try {
                appendLog("========================================")
                appendLog("🚀 Initializing PhoneLink Ngrok Tunnel Engine")
                appendLog("Device ABI: ${Build.SUPPORTED_ABIS.joinToString(", ")}")
                appendLog("Target local port: $port")
                appendLog("Claimed domain: ${if (cleanDomain.isNotEmpty()) cleanDomain else "(random sub-domain)"}")
                appendLog("Auth token provided: ${if (token.isNotEmpty()) "Yes (len=${token.length})" else "No"}")

                val ngrokBin = getNgrokExecutable(context)
                if (ngrokBin == null || !ngrokBin.exists()) {
                    val err = "Fatal: Ngrok native binary not found on device. ABIs: ${Build.SUPPORTED_ABIS.joinToString()}"
                    appendLog("❌ $err")
                    updateStatus(false, null, "Error: Binary not found")
                    onStatusChange?.invoke(false, err)
                    return@launch
                }

                // Prepare HOME and config directories
                val homeDir = context.filesDir
                val configDir = File(homeDir, ".config/ngrok")
                if (!configDir.exists()) {
                    configDir.mkdirs()
                }

                // Detect system DNS servers + Google & Cloudflare fallbacks (solves Android lack of /etc/resolv.conf)
                val dnsList = mutableListOf("8.8.8.8", "1.1.1.1", "8.8.4.4", "1.0.0.1")
                try {
                    val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? android.net.ConnectivityManager
                    val activeNet = cm?.activeNetwork
                    val linkProps = cm?.getLinkProperties(activeNet)
                    val sysDns = linkProps?.dnsServers?.mapNotNull { it.hostAddress } ?: emptyList()
                    for (dns in sysDns.reversed()) {
                        if (!dns.contains(":") && !dnsList.contains(dns)) {
                            dnsList.add(0, dns) // prioritize current cellular/wifi ISP DNS
                        }
                    }
                } catch (_: Exception) {}

                appendLog("Configuring DNS resolvers for Android kernel: ${dnsList.joinToString(", ")}")

                val configFile = File(configDir, "ngrok.yml")
                val sbConfig = StringBuilder()
                sbConfig.append("version: \"2\"\n")
                if (token.isNotEmpty()) {
                    sbConfig.append("authtoken: \"$token\"\n")
                }
                sbConfig.append("dns_resolver_ips:\n")
                for (dns in dnsList) {
                    sbConfig.append("  - \"$dns\"\n")
                }
                configFile.writeText(sbConfig.toString())
                appendLog("Generated ngrok config at: ${configFile.absolutePath}")

                updateStatus(true, "Connecting tunnel...", "Connecting to Ngrok cloud...")
                onStatusChange?.invoke(true, "Connecting tunnel...")

                // Build Command Arguments
                val cmd = mutableListOf<String>()
                cmd.add(ngrokBin.absolutePath)
                cmd.add("http")
                cmd.add("$port")
                cmd.add("--config=${configFile.absolutePath}")
                cmd.add("--log=stdout")
                cmd.add("--log-format=term")

                if (token.isNotEmpty()) {
                    cmd.add("--authtoken=$token")
                }

                if (cleanDomain.isNotEmpty()) {
                    cmd.add("--url=$cleanDomain")
                }

                appendLog("Executing: ${cmd.joinToString(" ")}")

                val pb = ProcessBuilder(cmd)
                val env = pb.environment()
                env["HOME"] = homeDir.absolutePath
                env["TMPDIR"] = context.cacheDir.absolutePath
                env["PATH"] = "/sbin:/system/sbin:/system/bin:/system/xbin:/vendor/bin"
                pb.redirectErrorStream(true)

                val proc = pb.start()
                ngrokProcess = proc

                // Extract PID if supported
                try {
                    val pidField = proc.javaClass.getDeclaredField("pid")
                    pidField.isAccessible = true
                    currentPid = pidField.getLong(proc)
                    appendLog("Process spawned successfully! PID: $currentPid")
                } catch (_: Exception) {
                    appendLog("Process spawned successfully!")
                }

                val reader = BufferedReader(InputStreamReader(proc.inputStream))
                var line: String?
                var foundUrl = false

                while (reader.readLine().also { line = it } != null) {
                    val l = line ?: continue
                    appendLog(l)

                    // 1. JSON output parser (if ngrok uses json)
                    if (l.trim().startsWith("{") && l.trim().endsWith("}")) {
                        try {
                            val json = JSONObject(l)
                            val msg = json.optString("msg")
                            val url = json.optString("url")

                            if (url.isNotEmpty() && (url.startsWith("http://") || url.startsWith("https://"))) {
                                activeTunnelUrl = url
                                foundUrl = true
                                prefs.edit().putBoolean(PREF_TUNNEL_ENABLED, true).apply()
                                updateStatus(true, url, "🟢 Active & Online")
                                onStatusChange?.invoke(true, url)
                            } else if (msg.contains("started tunnel") && url.isNotEmpty()) {
                                activeTunnelUrl = url
                                foundUrl = true
                                prefs.edit().putBoolean(PREF_TUNNEL_ENABLED, true).apply()
                                updateStatus(true, url, "🟢 Active & Online")
                                onStatusChange?.invoke(true, url)
                            } else if (json.optString("lvl") == "err") {
                                val err = json.optString("err", msg)
                                updateStatus(false, null, "Error: $err")
                            }
                        } catch (_: Exception) {}
                    }

                    // 2. Regex Search for public URL
                    if (!foundUrl && (l.contains(".ngrok-free.app") || l.contains(".ngrok.io") || l.contains(".ngrok.app") || l.contains("url="))) {
                        val match = Regex("""https://[a-zA-Z0-9.-]+\.ngrok(?:-free)?\.(?:app|io|dev)""").find(l)
                        if (match != null) {
                            val url = match.value
                            activeTunnelUrl = url
                            foundUrl = true
                            prefs.edit().putBoolean(PREF_TUNNEL_ENABLED, true).apply()
                            appendLog("🎉 PUBLIC URL DETECTED: $url")
                            updateStatus(true, url, "🟢 Active & Online")
                            onStatusChange?.invoke(true, url)
                        }
                    }

                    // 3. Error detection in plaintext
                    if (l.contains("ERR_NGROK_") || l.contains("ERROR:") || l.contains("panic:") || l.contains("fatal:")) {
                        val errorSnippet = l.substring(0.coerceAtLeast(l.length.coerceAtMost(100)))
                        updateStatus(false, null, errorSnippet)
                    }
                }

                val exitCode = proc.waitFor()
                appendLog("⚠️ Ngrok process terminated. Exit code: $exitCode")

                if (!foundUrl) {
                    val failMsg = "Ngrok stopped unexpectedly (exit code $exitCode). Check logs above."
                    updateStatus(false, null, failMsg)
                    onStatusChange?.invoke(false, failMsg)
                } else {
                    updateStatus(false, null, "Stopped (Exit code: $exitCode)")
                    onStatusChange?.invoke(false, null)
                }

            } catch (e: Exception) {
                val err = "Failed to launch Ngrok process: ${e.message}"
                appendLog("❌ $err")
                updateStatus(false, null, err)
                onStatusChange?.invoke(false, err)
            } finally {
                currentPid = -1
            }
        }
    }

    private fun stopProcessInternal() {
        try {
            ngrokProcess?.destroyForcibly()
            ngrokProcess = null
        } catch (_: Exception) {}
        isRunning = false
        activeTunnelUrl = null
    }

    fun stopTunnel(context: Context, onStatusChange: ((Boolean, String?) -> Unit)? = null) {
        appendLog("Stopping Ngrok tunnel process...")
        stopProcessInternal()
        getPrefs(context).edit().putBoolean(PREF_TUNNEL_ENABLED, false).apply()
        updateStatus(false, null, "⚪ Stopped")
        appendLog("Ngrok Tunnel stopped successfully.")
        onStatusChange?.invoke(false, null)
    }

    fun saveConfig(
        context: Context,
        token: String,
        domain: String,
        autoStart: Boolean
    ) {
        val cleanDomain = domain.removePrefix("https://").removePrefix("http://").trimEnd('/').trim()
        getPrefs(context).edit()
            .putString(PREF_NGROK_TOKEN, token.trim())
            .putString(PREF_NGROK_DOMAIN, cleanDomain)
            .putBoolean(PREF_AUTO_START, autoStart)
            .apply()
        appendLog("Saved configuration: domain='$cleanDomain', autoStart=$autoStart")
    }
}
