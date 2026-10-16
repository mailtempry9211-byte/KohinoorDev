package com.phonelink.hub.remote

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.phonelink.hub.data.DevicePrefs
import com.phonelink.hub.data.Events
import com.phonelink.hub.findphone.FindPhoneManager
import com.phonelink.hub.notifications.WebSocketHolder
import org.json.JSONObject
import kotlin.math.sqrt

/**
 * "Don't Touch My Phone" / Theft Motion Alarm.
 * When armed, monitors the physical accelerometer on the device.
 * If moved or picked up while armed, triggers a loud alarm and sends an immediate alert to PC.
 */
object TheftMotionAlarm : SensorEventListener {
    private const val TAG = "TheftMotionAlarm"

    @Volatile var isArmed: Boolean = false
        private set

    @Volatile var isTriggered: Boolean = false
        private set

    private var sensorManager: SensorManager? = null
    private var accelerometer: Sensor? = null
    private var lastMagnitude = 9.8f
    private var baselineEstablished = false
    private var triggerThreshold = 2.5f // m/s^2 change
    private var contextRef: Context? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    fun init(context: Context) {
        contextRef = context.applicationContext
        sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
        accelerometer = sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
    }

    fun arm(threshold: Float = 2.5f, delaySec: Int = 3): JSONObject {
        triggerThreshold = threshold
        isTriggered = false
        baselineEstablished = false

        val sm = sensorManager ?: return JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("success", false)
            put("error", "SensorManager unavailable")
        }
        val sensor = accelerometer ?: return JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("success", false)
            put("error", "Accelerometer sensor unavailable")
        }

        // Arm after delaySec so the user can place phone on table without false triggering
        mainHandler.postDelayed({
            if (isArmed) {
                baselineEstablished = true
                Log.i(TAG, "Theft motion alarm active (baseline established)")
            }
        }, (delaySec * 1000).toLong())

        sm.registerListener(this, sensor, SensorManager.SENSOR_DELAY_NORMAL)
        isArmed = true
        Log.i(TAG, "Theft motion alarm armed with threshold $threshold, delay $delaySec sec")

        pushStatus()

        return JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("success", true)
            put("armed", true)
            put("threshold", threshold)
            put("delaySec", delaySec)
        }
    }

    fun disarm(): JSONObject {
        isArmed = false
        isTriggered = false
        baselineEstablished = false
        sensorManager?.unregisterListener(this)
        contextRef?.let { FindPhoneManager.stop(it) }
        Log.i(TAG, "Theft motion alarm disarmed")

        pushStatus()

        return JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("success", true)
            put("armed", false)
        }
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (!isArmed || event == null || event.sensor.type != Sensor.TYPE_ACCELEROMETER) return

        val x = event.values[0]
        val y = event.values[1]
        val z = event.values[2]
        val magnitude = sqrt((x * x + y * y + z * z).toDouble()).toFloat()

        if (!baselineEstablished) {
            lastMagnitude = magnitude
            return
        }

        val delta = kotlin.math.abs(magnitude - lastMagnitude)
        lastMagnitude = magnitude

        if (delta > triggerThreshold && !isTriggered) {
            isTriggered = true
            Log.w(TAG, "THEFT MOTION DETECTED! Delta = $delta > $triggerThreshold")
            onAlarmTriggered(delta)
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    private fun onAlarmTriggered(delta: Float) {
        val ctx = contextRef ?: return
        // 1. Play loud siren through FindPhoneManager
        FindPhoneManager.start(ctx)

        // 2. Broadcast to PC Dashboard
        val payload = JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("event", "THEFT_MOTION_TRIGGERED")
            put("delta", delta)
            put("timestamp", System.currentTimeMillis())
            put("message", "Motion detected on device! Desk guard alarm sounding.")
        }
        WebSocketHolder.webSocket?.send(Events.MOTION_ALARM_TRIGGERED, payload)
        pushStatus()
    }

    fun pushStatus() {
        val payload = JSONObject().apply {
            put("deviceId", DevicePrefs.deviceId)
            put("armed", isArmed)
            put("triggered", isTriggered)
            put("threshold", triggerThreshold)
            put("hasSensor", accelerometer != null)
        }
        WebSocketHolder.webSocket?.send(Events.MOTION_ALARM_STATUS, payload)
    }
}

