package com.phonelink.hub.remote

import android.app.WallpaperManager
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.util.Log
import com.phonelink.hub.data.DevicePrefs
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

object WallpaperSetter {
    private const val TAG = "WallpaperSetter"

    fun setWallpaper(context: Context, payload: JSONObject, callback: (JSONObject) -> Unit) {
        val colorHex = payload.optString("color").takeIf { !it.isNullOrBlank() }
        val imageUrl = payload.optString("url").takeIf { !it.isNullOrBlank() }

        if (colorHex == null && imageUrl == null) {
            callback(JSONObject().apply {
                put("deviceId", DevicePrefs.deviceId)
                put("success", false)
                put("error", "Either color or url must be provided")
            })
            return
        }

        thread {
            try {
                val wm = WallpaperManager.getInstance(context)
                val metrics = context.resources.displayMetrics
                val width = metrics.widthPixels.coerceAtLeast(720)
                val height = metrics.heightPixels.coerceAtLeast(1280)

                val bitmap: Bitmap = if (colorHex != null) {
                    val cleanColor = if (colorHex.startsWith("#")) colorHex else "#$colorHex"
                    val color = Color.parseColor(cleanColor)
                    val bmp = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
                    val canvas = Canvas(bmp)
                    canvas.drawColor(color)
                    bmp
                } else {
                    val conn = URL(imageUrl).openConnection() as HttpURLConnection
                    conn.connectTimeout = 10000
                    conn.readTimeout = 15000
                    conn.doInput = true
                    conn.connect()
                    val input = conn.inputStream
                    val bmp = BitmapFactory.decodeStream(input)
                    input.close()
                    conn.disconnect()
                    bmp ?: throw IllegalArgumentException("Could not decode image from URL")
                }

                wm.setBitmap(bitmap)
                Log.d(TAG, "Wallpaper updated successfully")
                callback(JSONObject().apply {
                    put("deviceId", DevicePrefs.deviceId)
                    put("success", true)
                })
            } catch (e: Exception) {
                Log.e(TAG, "Failed to set wallpaper", e)
                callback(JSONObject().apply {
                    put("deviceId", DevicePrefs.deviceId)
                    put("success", false)
                    put("error", e.message ?: "Failed to set wallpaper")
                })
            }
        }
    }
}

