package com.phonelink.hub.files

import android.content.Context
import android.os.Environment
import android.util.Log
import com.phonelink.hub.data.DevicePrefs
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/**
 * Scans internal storage for APK installers, WhatsApp media forwards, and big junk files,
 * and performs remote 1-click cleanup to free storage.
 */
object JunkCleanerRepository {
    private const val TAG = "JunkCleanerRepository"

    data class JunkCategory(
        val id: String,
        val title: String,
        val description: String,
        var totalBytes: Long = 0L,
        val files: MutableList<File> = mutableListOf()
    )

    fun scan(context: Context): JSONObject {
        val result = JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("timestamp", System.currentTimeMillis())
        }

        val categories = mapOf(
            "apks" to JunkCategory("apks", "APK Package Installers", "Old downloaded .apk setup files"),
            "whatsapp_sent" to JunkCategory("whatsapp_sent", "WhatsApp Sent Videos & Media", "Forwarded media duplicates sent via WhatsApp"),
            "large_files" to JunkCategory("large_files", "Large Files (>50MB)", "Downloaded movies, archives, or large files"),
            "temp_cache" to JunkCategory("temp_cache", "Application Cache & Temp Logs", "Temporary system and app cached data")
        )

        try {
            val root = Environment.getExternalStorageDirectory()

            // 1. Scan APKs in Download and root
            val downloadDir = File(root, "Download")
            if (downloadDir.exists() && downloadDir.isDirectory) {
                downloadDir.walkTopDown().maxDepth(3).forEach { file ->
                    if (file.isFile && file.name.endsWith(".apk", ignoreCase = true)) {
                        categories["apks"]?.files?.add(file)
                        categories["apks"]?.let { it.totalBytes += file.length() }
                    }
                }
            }

            // 2. Scan WhatsApp Sent Media
            val waSentPaths = listOf(
                File(root, "Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Video/Sent"),
                File(root, "WhatsApp/Media/WhatsApp Video/Sent"),
                File(root, "Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Animated Gifs/Sent")
            )
            for (dir in waSentPaths) {
                if (dir.exists() && dir.isDirectory) {
                    dir.walkTopDown().maxDepth(2).forEach { file ->
                        if (file.isFile && file.length() > 0) {
                            categories["whatsapp_sent"]?.files?.add(file)
                            categories["whatsapp_sent"]?.let { it.totalBytes += file.length() }
                        }
                    }
                }
            }

            // 3. Scan Large Files > 50MB
            val checkDirs = listOf(downloadDir, File(root, "Documents"), File(root, "Movies"))
            for (dir in checkDirs) {
                if (dir.exists() && dir.isDirectory) {
                    dir.walkTopDown().maxDepth(3).forEach { file ->
                        if (file.isFile && file.length() > 50L * 1024L * 1024L) {
                            categories["large_files"]?.files?.add(file)
                            categories["large_files"]?.let { it.totalBytes += file.length() }
                        }
                    }
                }
            }

            // 4. App Cache
            val cacheDir = context.cacheDir
            if (cacheDir.exists() && cacheDir.isDirectory) {
                cacheDir.walkTopDown().maxDepth(3).forEach { file ->
                    if (file.isFile) {
                        categories["temp_cache"]?.files?.add(file)
                        categories["temp_cache"]?.let { it.totalBytes += file.length() }
                    }
                }
            }

            var totalAllBytes = 0L
            val catArray = JSONArray()
            for ((_, cat) in categories) {
                totalAllBytes += cat.totalBytes
                val catObj = JSONObject().apply {
                    put("id", cat.id)
                    put("title", cat.title)
                    put("description", cat.description)
                    put("totalBytes", cat.totalBytes)
                    put("count", cat.files.size)
                    val filesArray = JSONArray()
                    cat.files.take(15).forEach { f ->
                        filesArray.put(JSONObject().apply {
                            put("name", f.name)
                            put("path", f.absolutePath)
                            put("size", f.length())
                        })
                    }
                    put("sampleFiles", filesArray)
                }
                catArray.put(catObj)
            }

            result.put("totalJunkBytes", totalAllBytes)
            result.put("categories", catArray)
            result.put("success", true)

        } catch (e: Exception) {
            Log.e(TAG, "scan error", e)
            result.put("success", false)
            result.put("error", e.message ?: "Junk scan error")
        }

        return result
    }

    fun clean(context: Context, categoryId: String, targetPaths: List<String>? = null): JSONObject {
        val result = JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("categoryId", categoryId)
        }

        var deletedCount = 0
        var freedBytes = 0L

        try {
            if (targetPaths != null && targetPaths.isNotEmpty()) {
                for (path in targetPaths) {
                    val file = File(path)
                    if (file.exists() && file.isFile) {
                        val len = file.length()
                        if (file.delete()) {
                            deletedCount++
                            freedBytes += len
                        }
                    }
                }
            } else {
                // If clean entire category requested, re-scan and delete that category's files
                val root = Environment.getExternalStorageDirectory()
                val filesToDelete = mutableListOf<File>()

                when (categoryId) {
                    "apks" -> {
                        val downloadDir = File(root, "Download")
                        if (downloadDir.exists()) {
                            downloadDir.walkTopDown().maxDepth(3).forEach {
                                if (it.isFile && it.name.endsWith(".apk", ignoreCase = true)) filesToDelete.add(it)
                            }
                        }
                    }
                    "whatsapp_sent" -> {
                        listOf(
                            File(root, "Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Video/Sent"),
                            File(root, "WhatsApp/Media/WhatsApp Video/Sent")
                        ).forEach { dir ->
                            if (dir.exists()) dir.walkTopDown().maxDepth(2).forEach { if (it.isFile) filesToDelete.add(it) }
                        }
                    }
                    "temp_cache" -> {
                        context.cacheDir.walkTopDown().maxDepth(3).forEach { if (it.isFile) filesToDelete.add(it) }
                    }
                }

                for (f in filesToDelete) {
                    val len = f.length()
                    if (f.delete()) {
                        deletedCount++
                        freedBytes += len
                    }
                }
            }

            result.put("success", true)
            result.put("deletedCount", deletedCount)
            result.put("freedBytes", freedBytes)

        } catch (e: Exception) {
            Log.e(TAG, "clean failed", e)
            result.put("success", false)
            result.put("error", e.message ?: "Clean error")
        }

        return result
    }
}

