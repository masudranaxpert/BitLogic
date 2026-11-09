package com.blumart.sync.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import com.blumart.sync.api.SyncApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

class PaymentSyncService : Service() {
    companion object {
        private const val TAG = "PaymentSyncService"
        private const val CHANNEL_ID = "blumart_mfs_sync_channel"
        private const val NOTIFICATION_ID = 101

        @Volatile
        var isRunning: Boolean = false

        fun start(context: Context) {
            val intent = Intent(context, PaymentSyncService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, PaymentSyncService::class.java)
            context.stopService(intent)
        }
    }

    private var wakeLock: PowerManager.WakeLock? = null
    private var connectivityManager: ConnectivityManager? = null
    private var networkCallback: ConnectivityManager.NetworkCallback? = null
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onCreate() {
        super.onCreate()
        isRunning = true
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildForegroundNotification())

        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "BlumartSync::CpuWakeLock").apply {
            acquire(24 * 60 * 60 * 1000L)
        }

        registerAutoReconnectMonitor()
        triggerRecoverySweep("Service startup")
        Log.i(TAG, "Foreground service started, WakeLock & NetworkCallback registered")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        isRunning = true
        triggerRecoverySweep("Service command")
        return START_STICKY
    }

    private fun registerAutoReconnectMonitor() {
        try {
            val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            connectivityManager = cm
            val request = NetworkRequest.Builder()
                .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .build()

            val callback = object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) {
                    super.onAvailable(network)
                    Log.i(TAG, "Internet connection restored — running automatic queue flush & 24h inbox recovery")
                    triggerRecoverySweep("Network restored")
                }
            }
            networkCallback = callback
            cm.registerNetworkCallback(request, callback)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to register NetworkCallback", e)
        }
    }

    private fun triggerRecoverySweep(reason: String) {
        serviceScope.launch {
            try {
                val flushed = SyncApiClient.flushQueue(applicationContext)
                val recovered = SyncApiClient.scanRecentInboxMfsSms(
                    context = applicationContext,
                    minutesBack = 1440,
                    onlyUnsynced = true
                )
                if (flushed > 0 || recovered > 0) {
                    SyncApiClient.broadcastLog(
                        applicationContext,
                        "⚡ Auto-Recovery ($reason): Flushed $flushed queued, recovered $recovered inbox SMS."
                    )
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error during auto-recovery sweep ($reason)", e)
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        try {
            networkCallback?.let { connectivityManager?.unregisterNetworkCallback(it) }
        } catch (_: Exception) {
        }
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing wakeLock", e)
        }
        serviceScope.cancel()
        Log.i(TAG, "Service destroyed")
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Blumart MFS Sync Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps MFS SMS verification active 24/7"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun buildForegroundNotification(): Notification {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
                .setContentTitle("Blumartbd Sync Active (24/7)")
                .setContentText("Auto-syncing bKash, Nagad & Rocket SMS with offline recovery")
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setOngoing(true)
                .build()
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
                .setContentTitle("Blumartbd Sync Active (24/7)")
                .setContentText("Auto-syncing bKash, Nagad & Rocket SMS with offline recovery")
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setOngoing(true)
                .build()
        }
    }
}
