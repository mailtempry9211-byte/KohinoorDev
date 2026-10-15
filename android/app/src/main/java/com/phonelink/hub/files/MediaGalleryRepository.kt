package com.phonelink.hub.files

import android.content.ContentUris
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import android.provider.MediaStore
import android.util.Base64
import android.util.Log
import android.util.Size
import com.phonelink.hub.data.DevicePrefs
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.File

object MediaGalleryRepository {
    private const val TAG = "MediaGalleryRepo"

    fun getRecentPhotos(context: Context, limit: Int = 36): JSONObject {
        val result = JSONArray()
        val projection = arrayOf(
            MediaStore.Images.Media._ID,
            MediaStore.Images.Media.DISPLAY_NAME,
            MediaStore.Images.Media.DATE_ADDED,
            MediaStore.Images.Media.SIZE,
            MediaStore.Images.Media.DATA
        )

        try {
            val sortOrder = "${MediaStore.Images.Media.DATE_ADDED} DESC"
            val cursor = context.contentResolver.query(
                MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                projection,
                null,
                null,
                sortOrder
            )

            cursor?.use { c ->
                val idCol = c.getColumnIndexOrThrow(MediaStore.Images.Media._ID)
                val nameCol = c.getColumnIndexOrThrow(MediaStore.Images.Media.DISPLAY_NAME)
                val dateCol = c.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_ADDED)
                val sizeCol = c.getColumnIndexOrThrow(MediaStore.Images.Media.SIZE)
                val dataCol = c.getColumnIndex(MediaStore.Images.Media.DATA)

                var count = 0
                val root = FileRepository.storageRoot()

                while (c.moveToNext() && count < limit) {
                    val id = c.getLong(idCol)
                    val name = c.getString(nameCol) ?: "photo_$id.jpg"
                    val dateAdded = c.getLong(dateCol)
                    val size = c.getLong(sizeCol)
                    val rawPath = if (dataCol != -1) c.getString(dataCol) else null

                    val contentUri = ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, id)

                    val relPath = if (rawPath != null) {
                        try {
                            val f = File(rawPath)
                            if (f.startsWith(root)) {
                                "/" + f.relativeTo(root).path.replace('\\', '/')
                            } else {
                                "/" + f.name
                            }
                        } catch (_: Exception) {
                            "/" + name
                        }
                    } else {
                        "/DCIM/Camera/$name"
                    }

                    val thumbBase64 = loadThumbnailBase64(context, contentUri, rawPath)

                    val item = JSONObject().apply {
                        put("id", id)
                        put("name", name)
                        put("path", relPath)
                        put("size", size)
                        put("date", dateAdded * 1000)
                        put("thumbnail", thumbBase64 ?: "")
                    }
                    result.put(item)
                    count++
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error querying media gallery", e)
        }

        return JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("photos", result)
            put("count", result.length())
        }
    }

    private fun loadThumbnailBase64(context: Context, uri: android.net.Uri, rawPath: String?): String? {
        try {
            val bitmap: Bitmap? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                try {
                    context.contentResolver.loadThumbnail(uri, Size(160, 160), null)
                } catch (_: Exception) {
                    decodeSampledFromFile(rawPath, 160, 160)
                }
            } else {
                decodeSampledFromFile(rawPath, 160, 160)
            }

            if (bitmap != null) {
                val stream = ByteArrayOutputStream()
                bitmap.compress(Bitmap.CompressFormat.JPEG, 70, stream)
                val bytes = stream.toByteArray()
                return "data:image/jpeg;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to load thumbnail for $uri", e)
        }
        return null
    }

    private fun decodeSampledFromFile(path: String?, reqWidth: Int, reqHeight: Int): Bitmap? {
        if (path == null) return null
        val file = File(path)
        if (!file.exists()) return null

        val options = BitmapFactory.Options().apply {
            inJustDecodeBounds = true
        }
        BitmapFactory.decodeFile(path, options)

        var inSampleSize = 1
        if (options.outHeight > reqHeight || options.outWidth > reqWidth) {
            val halfHeight: Int = options.outHeight / 2
            val halfWidth: Int = options.outWidth / 2
            while ((halfHeight / inSampleSize) >= reqHeight && (halfWidth / inSampleSize) >= reqWidth) {
                inSampleSize *= 2
            }
        }

        val decodeOptions = BitmapFactory.Options().apply {
            this.inSampleSize = inSampleSize
        }
        return BitmapFactory.decodeFile(path, decodeOptions)
    }
}
