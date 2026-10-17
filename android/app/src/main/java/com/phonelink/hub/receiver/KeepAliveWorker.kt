package com.phonelink.hub.receiver

import android.content.Context
import android.util.Log
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import com.phonelink.hub.service.PhoneLinkService
import java.util.concurrent.TimeUnit

/**
 * FEATURE D: safety net beyond START_STICKY. Every 15 min (the minimum
 * allowed) restarts the service if the OS killed it.
 */
class KeepAliveWorker(appContext: Context, params: WorkerParameters) : Worker(appContext, params) {

    override fun doWork(): Result {
        return try {
            com.phonelink.hub.data.DevicePrefs.init(applicationContext)
            if (com.phonelink.hub.data.DevicePrefs.serviceEnabled && com.phonelink.hub.data.DevicePrefs.serverIp.isNotBlank()) {
                if (PhoneLinkService.instance == null) {
                    Log.i(TAG, "service not running — restarting")
                    PhoneLinkService.start(applicationContext)
                }
            }
            Result.success()
        } catch (e: Exception) {
            Log.w(TAG, "keep-alive failed", e)
            Result.retry()
        }
    }

    companion object {
        private const val TAG = "KeepAliveWorker"
        private const val UNIQUE_NAME = "phonelink-keepalive"

        fun schedule(context: Context) {
            try {
                val request = PeriodicWorkRequestBuilder<KeepAliveWorker>(15, TimeUnit.MINUTES).build()
                WorkManager.getInstance(context.applicationContext).enqueueUniquePeriodicWork(
                    UNIQUE_NAME,
                    ExistingPeriodicWorkPolicy.KEEP,
                    request
                )
            } catch (e: Exception) {
                Log.w(TAG, "could not schedule keep-alive", e)
            }
        }

        fun scheduleImmediate(context: Context) {
            try {
                val request = androidx.work.OneTimeWorkRequestBuilder<KeepAliveWorker>()
                    .setExpedited(androidx.work.OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
                    .build()
                WorkManager.getInstance(context.applicationContext).enqueue(request)
            } catch (e: Exception) {
                Log.w(TAG, "could not schedule immediate keep-alive", e)
            }
        }
    }
}
