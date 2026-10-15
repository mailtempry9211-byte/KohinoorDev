package com.phonelink.hub.files

import android.Manifest
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import android.util.Base64
import android.util.Log
import android.webkit.MimeTypeMap
import org.json.JSONObject
import java.io.File

/** Browses shared storage and encodes files to base64 for the relay. */
object FileRepository {

    private const val TAG = "FileRepository"
    private const val CHUNK_BYTES = 64 * 1024

    fun hasFullStorageAccess(): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.R || Environment.isExternalStorageManager()

    /** Opens the system screen that grants MANAGE_EXTERNAL_STORAGE. */
    fun storageSettingsIntent(context: Context): Intent =
        Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION)
            .setData(Uri.fromParts("package", context.packageName, null))

    fun hasPermission(context: Context): Boolean {
        // On Android 11+ (R+), MANAGE_EXTERNAL_STORAGE (checked by
        // hasFullStorageAccess) is the only thing that matters — the legacy
        // READ_EXTERNAL_STORAGE permission is never requested on these
        // versions (see MainActivity.requestAppPermissions), so requiring it
        // here made hasPermission() always return false even after the user
        // granted "All files access".
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val ok = Environment.isExternalStorageManager()
            Log.d(TAG, "hasPermission: SDK=${Build.VERSION.SDK_INT} isExternalStorageManager=$ok")
            return ok
        }
        val granted = context.checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE) ==
            android.content.pm.PackageManager.PERMISSION_GRANTED
        Log.d(TAG, "hasPermission: SDK=${Build.VERSION.SDK_INT} READ_EXTERNAL_STORAGE granted=$granted")
        return granted
    }

    /** Root folder we expose in the dashboard. */
    fun storageRoot(): File = Environment.getExternalStorageDirectory()

    /** Normalises a dashboard path such as "/DCIM/Camera" to a real File. */
    fun resolve(path: String): File {
        val cleaned = path.trim().trimStart('/')
        if (cleaned.isEmpty()) return storageRoot()
        // Reject traversal so the phone's whole filesystem is not exposed.
        if (cleaned.split('/').any { it == ".." }) return storageRoot()
        return File(storageRoot(), cleaned)
    }

    fun list(path: String): JSONObject {
        val fullAccess = hasFullStorageAccess()
        Log.d(TAG, "list: path=$path SDK=${Build.VERSION.SDK_INT} hasFullStorageAccess=$fullAccess")
        if (!fullAccess) {
            return JSONObject().apply {
                put("path", "/")
                put("entries", org.json.JSONArray())
                put("error", "Storage permission not granted. Tap 'Grant storage access'.")
            }
        }

        val dir = resolve(path)
        val entries = org.json.JSONArray()

        if (dir.isDirectory) {
            dir.listFiles()?.forEach { file ->
                entries.put(describe(file))
            }
        }

        val relPath = if (dir == storageRoot()) "" else dir.relativeTo(storageRoot()).path.replace('\\', '/').trim('/')

        return JSONObject().apply {
            put("path", if (relPath.isEmpty()) "/" else "/$relPath")
            put("entries", sortDirectoriesFirst(entries))
            put("error", if (dir.isDirectory) JSONObject.NULL else "Not a directory or does not exist")
        }
    }

    private fun sortDirectoriesFirst(array: org.json.JSONArray): org.json.JSONArray {
        val items = mutableListOf<JSONObject>()
        for (i in 0 until array.length()) items += array.getJSONObject(i)
        items.sortWith(compareBy<JSONObject> { !it.optBoolean("isDirectory", false) }.thenBy { it.optString("name").lowercase() })
        return org.json.JSONArray().apply { items.forEach { put(it) } }
    }

    private fun describe(file: File): JSONObject = JSONObject().apply {
        val rel = file.relativeTo(storageRoot()).path.replace('\\', '/').trimStart('/')
        val isDir = try { file.isDirectory } catch (_: Exception) { false }
        val size = try { if (isDir) JSONObject.NULL else file.length() } catch (_: Exception) { 0L }
        put("name", file.name.ifEmpty { "/" })
        put("path", "/" + rel)
        put("isDirectory", isDir)
        put("size", size)
        put("lastModified", try { file.lastModified() } catch (_: Exception) { 0L })
        put("mimeType", if (isDir) JSONObject.NULL else mimeOf(file.name))
    }

    /**
     * Reads a file sequentially and hands back base64 chunks so a large file
     * never exceeds the socket frame size. [onChunk] receives (base64, isLast).
     */
    fun encodeInChunks(context: Context, path: String, onChunk: (String, Boolean) -> Unit): Boolean {
        val permitted = hasPermission(context)
        val file = resolve(path)
        Log.d(TAG, "encodeInChunks: path=$path resolved=${file.absolutePath} hasPermission=$permitted exists=${file.exists()} isDir=${file.isDirectory}")
        if (!permitted) return false
        if (!file.exists() || file.isDirectory) {
            Log.e(TAG, "encodeInChunks: file does not exist or is directory: ${file.absolutePath}")
            return false
        }
        if (file.length() == 0L) {
            Log.d(TAG, "encodeInChunks: empty file, sending single last chunk")
            onChunk("", true)
            return true
        }

        return try {
            file.inputStream().use { stream ->
                val buffer = ByteArray(CHUNK_BYTES)
                var remaining = file.length()
                var chunksSent = 0
                while (remaining > 0) {
                    // Backpressure flow control: wait if OkHttp socket buffer exceeds 256KB
                    while ((com.phonelink.hub.service.PhoneLinkService.instance?.webSocketQueueSize ?: 0L) > 256 * 1024L) {
                        try { Thread.sleep(15) } catch (_: InterruptedException) {}
                    }
                    val read = stream.read(buffer)
                    if (read <= 0) break
                    remaining -= read
                    val payload = Base64.encodeToString(buffer.copyOf(read), Base64.NO_WRAP)
                    onChunk(payload, remaining <= 0)
                    chunksSent++
                    if (chunksSent % 4 == 0) {
                        try { Thread.sleep(2) } catch (_: InterruptedException) {}
                    }
                }
            }
            true
        } catch (e: Exception) {
            Log.e(TAG, "encode failed for $path (${file.absolutePath})", e)
            false
        }
    }

    fun metaOf(path: String): JSONObject {
        val file = resolve(path)
        return JSONObject().apply {
            put("name", file.name)
            put("size", file.length())
            put("mimeType", mimeOf(file.name))
        }
    }

    /** Writes an uploaded base64 chunk into the destination path. */
    fun writeChunk(context: Context, path: String, base64: String, isLastChunk: Boolean): Boolean {
        if (!hasPermission(context)) return false
        return try {
            val target = resolve(path)
            target.parentFile?.mkdirs()
            val bytes = if (base64.isEmpty()) ByteArray(0) else Base64.decode(base64, Base64.NO_WRAP)
            target.appendBytes(bytes)
            true
        } catch (e: Exception) {
            Log.e(TAG, "writeChunk failed for $path", e)
            false
        }
    }

    fun mimeOf(fileName: String): String {
        val ext = fileName.substringAfterLast('.', "").lowercase()
        return MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext) ?: "application/octet-stream"
    }
}