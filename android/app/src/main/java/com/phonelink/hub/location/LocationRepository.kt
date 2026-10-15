package com.phonelink.hub.location

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.os.Looper
import android.util.Log
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

    companion object {
        private const val TAG = "LocationRepository"
    }

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
                    requestFreshFix(onFix)
                }
            }.addOnFailureListener {
                requestFreshFix(onFix)
            }
        } catch (_: SecurityException) {
            fallbackNativeLocation(onFix)
        }
    }

    @SuppressLint("MissingPermission")
    private fun requestFreshFix(onFix: (JSONObject) -> Unit) {
        try {
            val cancellationToken = CancellationTokenSource()
            fused.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, cancellationToken.token)
                .addOnSuccessListener { location ->
                    if (location != null) {
                        emit(location, onFix)
                    } else {
                        fallbackNativeLocation(onFix)
                    }
                }
                .addOnFailureListener {
                    fallbackNativeLocation(onFix)
                }
        } catch (_: Exception) {
            fallbackNativeLocation(onFix)
        }
    }

    @SuppressLint("MissingPermission")
    private fun fallbackNativeLocation(onFix: (JSONObject) -> Unit) {
        try {
            val lm = context.getSystemService(Context.LOCATION_SERVICE) as? android.location.LocationManager ?: return
            val gps = lm.getLastKnownLocation(android.location.LocationManager.GPS_PROVIDER)
            val net = lm.getLastKnownLocation(android.location.LocationManager.NETWORK_PROVIDER)
            val pass = lm.getLastKnownLocation(android.location.LocationManager.PASSIVE_PROVIDER)
            val best = listOfNotNull(gps, net, pass).maxByOrNull { it.time }
            if (best != null) {
                emit(best, onFix)
            } else {
                val provider = when {
                    lm.isProviderEnabled(android.location.LocationManager.GPS_PROVIDER) -> android.location.LocationManager.GPS_PROVIDER
                    lm.isProviderEnabled(android.location.LocationManager.NETWORK_PROVIDER) -> android.location.LocationManager.NETWORK_PROVIDER
                    else -> null
                }
                if (provider != null) {
                    val listener = object : android.location.LocationListener {
                        override fun onLocationChanged(location: android.location.Location) {
                            emit(location, onFix)
                        }
                        @Deprecated("Deprecated in Java")
                        override fun onStatusChanged(provider: String?, status: Int, extras: android.os.Bundle?) {}
                        override fun onProviderEnabled(provider: String) {}
                        override fun onProviderDisabled(provider: String) {}
                    }
                    lm.requestSingleUpdate(provider, listener, Looper.getMainLooper())
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Native location fallback failed", e)
        }
    }

    private var lastRecordedLocation: android.location.Location? = null
    private var lastRecordedTimeMs: Long = 0L

    fun resetTrackingAnchor() {
        lastRecordedLocation = null
        lastRecordedTimeMs = 0L
    }

    private fun emit(location: android.location.Location, onFix: (JSONObject) -> Unit) {
        val id = try { com.phonelink.hub.data.DevicePrefs.deviceId } catch (_: Exception) { null }
        val now = if (location.time > 0) location.time else System.currentTimeMillis()

        var isTimelinePoint = false
        if (com.phonelink.hub.data.DevicePrefs.timelineTrackingEnabled) {
            val lastLoc = lastRecordedLocation
            val minRadius = com.phonelink.hub.data.DevicePrefs.timelineMinRadiusMeters
            val minDwellMs = com.phonelink.hub.data.DevicePrefs.timelineDwellMinutes * 60_000L

            if (lastLoc == null) {
                isTimelinePoint = true
                lastRecordedLocation = location
                lastRecordedTimeMs = now
            } else {
                val dist = lastLoc.distanceTo(location)
                val elapsed = now - lastRecordedTimeMs
                if (dist >= minRadius) {
                    isTimelinePoint = true
                    lastRecordedLocation = location
                    lastRecordedTimeMs = now
                } else if (elapsed >= minDwellMs && dist >= 25f) {
                    isTimelinePoint = true
                    lastRecordedLocation = location
                    lastRecordedTimeMs = now
                }
            }
        }

        onFix(
            JSONObject().apply {
                put("latitude", location.latitude)
                put("longitude", location.longitude)
                put("accuracy", location.accuracy.toDouble())
                put("speed", location.speed.toDouble())
                put("altitude", location.altitude)
                put("bearing", location.bearing.toDouble())
                put("timestamp", now)
                put("isTimelinePoint", isTimelinePoint)
                if (!id.isNullOrBlank()) put("deviceId", id)
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
                emit(location, onFix)
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