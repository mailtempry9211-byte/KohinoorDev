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

/**
 * Manages Out-of-Network Port Forwarding and Tunneling for PhoneLink Parent Hub.
 * Directly runs embedded Ngrok native executable binary without needing Termux or root.
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

    /**
     * Resolves the executable ngrok binary on device.
     */
    fun getNgrokExecutable(context: Context): File? {
        // 1. Check nativeLibraryDir (where Android extracts libngrok.so with execute permissions)
        try {
            val nativeDir = File(context.applicationInfo.nativeLibraryDir)
            val nativeSo = File(nativeDir, "libngrok.so")
            if (nativeSo.exists()) {
                Log.i(TAG, "Found native libngrok.so at: ${nativeSo.absolutePath} (len=${nativeSo.length()})")
                return nativeSo
            }
        } catch (e: Exception) {
            Log.w(TAG, "Native library dir probe error: ${e.message}")
        }

        // 2. Check internal filesDir fallback
        val internalBin = File(context.filesDir, "libngrok.so")
        if (internalBin.exists()) {
            internalBin.setExecutable(true, false)
            return internalBin
        }

        // 3. Try to copy from nativeLibraryDir to internal filesDir if needed
        try {
            val sourceSo = File(context.applicationInfo.nativeLibraryDir, "libngrok.so")
            if (sourceSo.exists()) {
                sourceSo.copyTo(internalBin, overwrite = true)
                internalBin.setExecutable(true, false)
                return internalBin
            }
        } catch (e: Exception) {
            Log.w(TAG, "Fallback extraction error: ${e.message}")
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
        val domain = prefs.getString(PREF_NGROK_DOMAIN, "")?.trim() ?: ""
        val token = prefs.getString(PREF_NGROK_TOKEN, "")?.trim() ?: ""

        if (isRunning && activeTunnelUrl != null && !activeTunnelUrl!!.startsWith("Connecting")) {
            onStatusChange?.invoke(true, activeTunnelUrl)
            return
        }

        scope.launch {
            try {
                val ngrokBin = getNgrokExecutable(context)
                if (ngrokBin == null) {
                    val err = "Ngrok native library not found. Supported ABIs: ${Build.SUPPORTED_ABIS.joinToString()}"
                    Log.e(TAG, err)
                    onStatusChange?.invoke(false, err)
                    return@launch
                }

                activeTunnelUrl = "Connecting tunnel..."
                isRunning = true
                onStatusChange?.invoke(true, activeTunnelUrl)

                val cmd = mutableListOf<String>()
                cmd.add(ngrokBin.absolutePath)
                cmd.add("http")
                cmd.add("$port")
                cmd.add("--log=stdout")
                cmd.add("--log-format=json")

                if (token.isNotEmpty()) {
                    cmd.add("--authtoken")
                    cmd.add(token)
                }

                if (domain.isNotEmpty()) {
                    val cleanDomain = if (domain.startsWith("http://") || domain.startsWith("https://")) {
                        domain
                    } else {
                        "https://$domain"
                    }
                    cmd.add("--url")
                    cmd.add(cleanDomain)
                }

                Log.i(TAG, "Launching Ngrok: ${cmd.joinToString(" ")}")

                val pb = ProcessBuilder(cmd)
                val env = pb.environment()
                env["HOME"] = context.filesDir.absolutePath
                env["TMPDIR"] = context.cacheDir.absolutePath
                pb.redirectErrorStream(true)

                val proc = pb.start()
                ngrokProcess = proc

                val reader = BufferedReader(InputStreamReader(proc.inputStream))
                var line: String?
                var foundUrl = false

                while (reader.readLine().also { line = it } != null) {
                    val l = line ?: continue
                    Log.d(TAG, "ngrok: $l")

                    try {
                        if (l.trim().startsWith("{") && l.trim().endsWith("}")) {
                            val json = JSONObject(l)
                            val msg = json.optString("msg")
                            val url = json.optString("url")

                            if (url.isNotEmpty() && (url.startsWith("http://") || url.startsWith("https://"))) {
                                activeTunnelUrl = url
                                isRunning = true
                                foundUrl = true
                                prefs.edit().putBoolean(PREF_TUNNEL_ENABLED, true).apply()
                                Log.i(TAG, "✅ Ngrok Tunnel LIVE: $url")
                                onStatusChange?.invoke(true, url)
                            } else if (msg.contains("started tunnel") && url.isNotEmpty()) {
                                activeTunnelUrl = url
                                isRunning = true
                                foundUrl = true
                                prefs.edit().putBoolean(PREF_TUNNEL_ENABLED, true).apply()
                                Log.i(TAG, "✅ Ngrok Tunnel LIVE: $url")
                                onStatusChange?.invoke(true, url)
                            } else if (json.optString("lvl") == "err") {
                                val err = json.optString("err", msg)
                                Log.e(TAG, "Ngrok error: $err")
                                if (!foundUrl) {
                                    onStatusChange?.invoke(false, "Ngrok Error: $err")
                                }
                            }
                        }
                    } catch (_: Exception) {}

                    // Fallback substring search
                    if (!foundUrl && (l.contains(".ngrok-free.app") || l.contains(".ngrok.io") || l.contains(".ngrok.app"))) {
                        val match = Regex("""https://[a-zA-Z0-9.-]+\.ngrok(?:-free)?\.(?:app|io|dev)""").find(l)
                        if (match != null) {
                            val url = match.value
                            activeTunnelUrl = url
                            isRunning = true
                            foundUrl = true
                            prefs.edit().putBoolean(PREF_TUNNEL_ENABLED, true).apply()
                            Log.i(TAG, "✅ Ngrok Tunnel Detected via Regex: $url")
                            onStatusChange?.invoke(true, url)
                        }
                    }
                }

                val exitCode = proc.waitFor()
                Log.w(TAG, "Ngrok process terminated with exit code: $exitCode")
                if (isRunning) {
                    isRunning = false
                    activeTunnelUrl = null
                    onStatusChange?.invoke(false, null)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Ngrok launch error: ${e.message}", e)
                isRunning = false
                activeTunnelUrl = null
                onStatusChange?.invoke(false, "Failed to start ngrok: ${e.message}")
            }
        }
    }

    fun stopTunnel(context: Context, onStatusChange: ((Boolean, String?) -> Unit)? = null) {
        try {
            ngrokProcess?.destroyForcibly()
            ngrokProcess = null
        } catch (_: Exception) {}
        isRunning = false
        activeTunnelUrl = null
        getPrefs(context).edit().putBoolean(PREF_TUNNEL_ENABLED, false).apply()
        Log.i(TAG, "Ngrok Tunnel stopped")
        onStatusChange?.invoke(false, null)
    }

    fun saveConfig(
        context: Context,
        token: String,
        domain: String,
        autoStart: Boolean
    ) {
        getPrefs(context).edit()
            .putString(PREF_NGROK_TOKEN, token.trim())
            .putString(PREF_NGROK_DOMAIN, domain.trim())
            .putBoolean(PREF_AUTO_START, autoStart)
            .apply()
    }
}
