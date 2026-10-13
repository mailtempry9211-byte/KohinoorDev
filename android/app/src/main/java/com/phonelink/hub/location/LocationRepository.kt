package com.phonelink.hub.location

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.os.Looper
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import org.json.JSONObject

/** Streams device location to the dashboard on a fixed interval. */
class LocationRepository(private val context: Context) {

    private val fused = LocationServices.getFusedLocationProviderClient(context)

    private var callback: LocationCallback? = null

    val hasPermission: Boolean
        get() = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED

    @SuppressLint("MissingPermission")
    fun currentFix(onFix: (JSONObject) -> Unit) {
        if (!hasPermission) return
        try {
            fused.lastLocation.addOnSuccessListener { location ->
                if (location != null) {
                    emit(location, onFix)
                } else {
                    // No cached fix yet (fresh boot, or nothing else has
                    // requested location recently) — lastLocation silently
                    // returns null in that case, so force a fresh GPS read
                    // instead of giving up.
                    requestFreshFix(onFix)
                }
            }.addOnFailureListener {
                requestFreshFix(onFix)
            }
        } catch (_: SecurityException) {
        }
    }

    @SuppressLint("MissingPermission")
    private fun requestFreshFix(onFix: (JSONObject) -> Unit) {
        try {
            val cancellationToken = CancellationTokenSource()
            fused.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, cancellationToken.token)
                .addOnSuccessListener { location ->
                    if (location != null) emit(location, onFix)
                }
        } catch (_: SecurityException) {
        }
    }

    private fun emit(location: android.location.Location, onFix: (JSONObject) -> Unit) {
        onFix(
            JSONObject().apply {
                put("latitude", location.latitude)
                put("longitude", location.longitude)
                put("accuracy", location.accuracy.toDouble())
                put("timestamp", System.currentTimeMillis())
            }
        )
    }

    @SuppressLint("MissingPermission")
    fun startUpdates(intervalMs: Long, onFix: (JSONObject) -> Unit) {
        if (!hasPermission) return
        if (callback != null) return

        val request = LocationRequest.Builder(Priority.PRIORITY_BALANCED_POWER_ACCURACY, intervalMs)
            .setMinUpdateIntervalMillis(intervalMs / 2)
            .setWaitForAccurateLocation(false)
            .build()

        val cb = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                val location = result.lastLocation ?: return
                onFix(
                    JSONObject().apply {
                        put("latitude", location.latitude)
                        put("longitude", location.longitude)
                        put("accuracy", location.accuracy.toDouble())
                        put("timestamp", System.currentTimeMillis())
                    }
                )
            }
        }
        callback = cb
        fused.requestLocationUpdates(request, cb, Looper.getMainLooper())
    }

    fun stopUpdates() {
        callback?.let { fused.removeLocationUpdates(it) }
        callback = null
    }
}