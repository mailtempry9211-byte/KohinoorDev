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
    private const val CHUNK_BYTES = 32 * 1024

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
            return Environment.isExternalStorageManager()
        }
        return context.checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE) ==
            android.content.pm.PackageManager.PERMISSION_GRANTED
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
        if (!hasFullStorageAccess()) {
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

        entries.put(
            JSONObject().apply {
                put("name", "Android")
                put("path", "/Android")
                put("isDirectory", true)
                put("size", JSONObject.NULL)
                put("lastModified", storageRoot().takeIf { it.exists() }?.lastModified())
                put("mimeType", JSONObject.NULL)
            }
        )

        return JSONObject().apply {
            put("path", "/" + dir.relativeTo(storageRoot()).path.trim('/'))
            put("entries", sortDirectoriesFirst(entries))
            put("error", if (dir.isDirectory) JSONObject.NULL else "Not a directory or does not exist")
        }
    }

    private fun sortDirectoriesFirst(array: org.json.JSONArray): org.json.JSONArray {
        val items = mutableListOf<JSONObject>()
        for (i in 0 until array.length()) items += array.getJSONObject(i)
        items.sortWith(compareBy<JSONObject> { it.optInt("isDirectory", 0) == 0 }.thenBy { it.optString("name").lowercase() })
        return org.json.JSONArray().apply { items.forEach { put(it) } }
    }

    private fun describe(file: File): JSONObject = JSONObject().apply {
        put("name", file.name.ifEmpty { "/" })
        put("path", "/" + file.relativeTo(storageRoot()).path.trim('/'))
        put("isDirectory", file.isDirectory)
        put("size", if (file.isDirectory) JSONObject.NULL else file.length())
        put("lastModified", file.lastModified())
        put("mimeType", if (file.isDirectory) JSONObject.NULL else mimeOf(file.name))
    }

    /**
     * Reads a file sequentially and hands back base64 chunks so a large file
     * never exceeds the socket frame size. [onChunk] receives (base64, isLast).
     */
    fun encodeInChunks(context: Context, path: String, onChunk: (String, Boolean) -> Unit): Boolean {
        if (!hasPermission(context)) return false
        val file = resolve(path)
        if (!file.isFile || !file.canRead()) return false

        return try {
            file.inputStream().use { stream ->
                val buffer = ByteArray(CHUNK_BYTES)
                var remaining = file.length()
                while (remaining > 0) {
                    val read = stream.read(buffer)
                    if (read <= 0) break
                    remaining -= read
                    val payload = Base64.encodeToString(buffer.copyOf(read), Base64.NO_WRAP)
                    onChunk(payload, remaining <= 0)
                }
                // Always terminate so the dashboard can finish the transfer.
                onChunk("", true)
            }
            true
        } catch (e: Exception) {
            Log.e(TAG, "encode failed for $path", e)
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