package com.blumart.sync

import android.content.BroadcastReceiver
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.content.res.ColorStateList
import android.os.Build
import android.os.Bundle
import android.text.InputType
import android.text.method.ScrollingMovementMethod
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.blumart.sync.api.SyncApiClient
import com.blumart.sync.service.PaymentSyncService
import com.blumart.sync.util.OemBatteryHelper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : AppCompatActivity() {

    private lateinit var editServerUrl: EditText
    private lateinit var editApiKey: EditText
    private lateinit var btnPasteKey: TextView
    private lateinit var btnToggleKeyMask: TextView
    private lateinit var btnSave: Button
    private lateinit var btnTestPing: Button
    private lateinit var btnToggleService: Button
    private lateinit var btnScanInbox: Button
    private lateinit var btnFlushQueue: Button
    private lateinit var btnSimulateSms: Button
    private lateinit var btnGrantPermissions: Button
    private lateinit var btnBatterySettings: Button
    private lateinit var tvPermissionStatus: TextView
    private lateinit var tvBatteryStatus: TextView
    private lateinit var tvServiceStatusPill: TextView
    private lateinit var tvStatSynced: TextView
    private lateinit var tvStatQueued: TextView
    private lateinit var tvStatLastSync: TextView
    private lateinit var tvLogsConsole: TextView
    private lateinit var btnCopyLogs: TextView
    private lateinit var btnClearLogs: TextView

    private var isKeyVisible = false

    private val logReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == SyncApiClient.ACTION_LOG_EVENT) {
                refreshStatsAndLogs()
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        editServerUrl = findViewById(R.id.editServerUrl)
        editApiKey = findViewById(R.id.editApiKey)
        btnPasteKey = findViewById(R.id.btnPasteKey)
        btnToggleKeyMask = findViewById(R.id.btnToggleKeyMask)
        btnSave = findViewById(R.id.btnSave)
        btnTestPing = findViewById(R.id.btnTestPing)
        btnToggleService = findViewById(R.id.btnToggleService)
        btnScanInbox = findViewById(R.id.btnScanInbox)
        btnFlushQueue = findViewById(R.id.btnFlushQueue)
        btnSimulateSms = findViewById(R.id.btnSimulateSms)
        btnGrantPermissions = findViewById(R.id.btnGrantPermissions)
        btnBatterySettings = findViewById(R.id.btnBatterySettings)
        tvPermissionStatus = findViewById(R.id.tvPermissionStatus)
        tvBatteryStatus = findViewById(R.id.tvBatteryStatus)
        tvServiceStatusPill = findViewById(R.id.tvServiceStatusPill)
        tvStatSynced = findViewById(R.id.tvStatSynced)
        tvStatQueued = findViewById(R.id.tvStatQueued)
        tvStatLastSync = findViewById(R.id.tvStatLastSync)
        tvLogsConsole = findViewById(R.id.tvLogsConsole)
        btnCopyLogs = findViewById(R.id.btnCopyLogs)
        btnClearLogs = findViewById(R.id.btnClearLogs)

        tvLogsConsole.movementMethod = ScrollingMovementMethod()

        val prefs = getSharedPreferences("blumart_sync_prefs", Context.MODE_PRIVATE)
        editServerUrl.setText(prefs.getString("server_url", "https://blumartbd.com"))
        editApiKey.setText(prefs.getString("api_key", ""))

        requestAppPermissions()
        refreshAllUi()

        // Paste API Key button
        btnPasteKey.setOnClickListener {
            val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val clip = clipboard.primaryClip
            if (clip != null && clip.itemCount > 0) {
                val pasted = clip.getItemAt(0).coerceToText(this).toString().trim()
                if (pasted.isNotEmpty()) {
                    editApiKey.setText(pasted)
                    Toast.makeText(this, "API Key pasted", Toast.LENGTH_SHORT).show()
                }
            }
        }

        // Show / Hide API Key mask
        btnToggleKeyMask.setOnClickListener {
            isKeyVisible = !isKeyVisible
            if (isKeyVisible) {
                editApiKey.inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
                btnToggleKeyMask.text = "Hide"
            } else {
                editApiKey.inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
                btnToggleKeyMask.text = "Show"
            }
            editApiKey.setSelection(editApiKey.text.length)
        }

        // Save Configuration
        btnSave.setOnClickListener {
            saveCurrentInputs()
            SyncApiClient.broadcastLog(this, "✓ Configuration saved.")
            Toast.makeText(this, "Configuration Saved!", Toast.LENGTH_SHORT).show()
        }

        // Test Connection Ping
        btnTestPing.setOnClickListener {
            if (!saveCurrentInputs()) return@setOnClickListener
            btnTestPing.isEnabled = false
            btnTestPing.text = "Pinging..."
            SyncApiClient.broadcastLog(this, "Testing server connection...")

            CoroutineScope(Dispatchers.IO).launch {
                val ok = SyncApiClient.uploadSms(
                    context = this@MainActivity,
                    rawSms = "Heartbeat ping from Blumart Sync device",
                    sender = "TEST_PING"
                )
                withContext(Dispatchers.Main) {
                    btnTestPing.isEnabled = true
                    btnTestPing.text = "Test Connection"
                    refreshStatsAndLogs()
                    if (ok) {
                        Toast.makeText(this@MainActivity, "Server Connected (HTTP 200)!", Toast.LENGTH_SHORT).show()
                    } else {
                        Toast.makeText(this@MainActivity, "Connection failed! Check Domain & Key.", Toast.LENGTH_LONG).show()
                    }
                }
            }
        }

        // True Toggle Start / Stop 24/7 Service
        btnToggleService.setOnClickListener {
            if (PaymentSyncService.isRunning) {
                PaymentSyncService.stop(this)
                SyncApiClient.broadcastLog(this, "■ 24/7 Auto-Sync Service stopped by user.")
                updateServiceRunningState(false)
                Toast.makeText(this, "Sync Service Stopped", Toast.LENGTH_SHORT).show()
            } else {
                if (!saveCurrentInputs()) return@setOnClickListener
                PaymentSyncService.start(this)
                SyncApiClient.broadcastLog(this, "▶ 24/7 Foreground SMS Listener started.")
                updateServiceRunningState(true)
                Toast.makeText(this, "24/7 Sync Service Active!", Toast.LENGTH_SHORT).show()
            }
        }

        // Scan Last 30 Minutes Inbox MFS SMS
        btnScanInbox.setOnClickListener {
            if (!hasSmsPermissions()) {
                requestAppPermissions()
                Toast.makeText(this, "Please grant SMS read permission first", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            if (!saveCurrentInputs()) return@setOnClickListener

            btnScanInbox.isEnabled = false
            btnScanInbox.text = "Scanning..."
            SyncApiClient.broadcastLog(this, "Scanning phone SMS inbox (last 30 mins)...")

            CoroutineScope(Dispatchers.IO).launch {
                val synced = SyncApiClient.scanRecentInboxMfsSms(this@MainActivity, 30)
                withContext(Dispatchers.Main) {
                    btnScanInbox.isEnabled = true
                    btnScanInbox.text = "Scan Last 30m SMS"
                    refreshStatsAndLogs()
                    Toast.makeText(
                        this@MainActivity,
                        if (synced > 0) "Synced $synced MFS SMS!" else "No new MFS SMS found in last 30m",
                        Toast.LENGTH_SHORT
                    ).show()
                }
            }
        }

        // Flush Offline Retry Queue
        btnFlushQueue.setOnClickListener {
            if (!saveCurrentInputs()) return@setOnClickListener
            val queued = SyncApiClient.getQueueCount(this)
            if (queued == 0) {
                Toast.makeText(this, "Retry queue is empty (0 pending)", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            btnFlushQueue.isEnabled = false
            btnFlushQueue.text = "Retrying..."
            CoroutineScope(Dispatchers.IO).launch {
                val flushed = SyncApiClient.flushQueue(this@MainActivity)
                withContext(Dispatchers.Main) {
                    btnFlushQueue.isEnabled = true
                    btnFlushQueue.text = "Retry Queued SMS"
                    refreshStatsAndLogs()
                    Toast.makeText(this@MainActivity, "Flushed $flushed SMS from queue", Toast.LENGTH_SHORT).show()
                }
            }
        }

        // Simulate Test bKash SMS Pipeline
        btnSimulateSms.setOnClickListener {
            if (!saveCurrentInputs()) return@setOnClickListener
            val randomTrx = "SIM" + (1000000..9999999).random()
            val sampleSms = "You have received Tk 25.00 from 01847474747. Ref BlumartTest. Fee Tk 0.00. Balance Tk 1,250.00. TrxID $randomTrx at 09/11/2026 13:20"
            SyncApiClient.broadcastLog(this, "Simulating bKash SMS ($randomTrx)...")

            CoroutineScope(Dispatchers.IO).launch {
                val ok = SyncApiClient.uploadSms(this@MainActivity, sampleSms, "bKash")
                withContext(Dispatchers.Main) {
                    refreshStatsAndLogs()
                    Toast.makeText(
                        this@MainActivity,
                        if (ok) "Simulated SMS verified ($randomTrx)!" else "Simulation queued (offline)",
                        Toast.LENGTH_SHORT
                    ).show()
                }
            }
        }

        // Permissions Button
        btnGrantPermissions.setOnClickListener {
            requestAppPermissions()
        }

        // OEM Battery & Sleep Killer Settings
        btnBatterySettings.setOnClickListener {
            OemBatteryHelper.requestIgnoreBatteryOptimization(this)
            OemBatteryHelper.openOemAutoStartSettings(this)
            SyncApiClient.broadcastLog(this, "Opened battery & background protection settings.")
        }

        // Copy Console Logs
        btnCopyLogs.setOnClickListener {
            val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            clipboard.setPrimaryClip(ClipData.newPlainText("BlumartSyncLogs", tvLogsConsole.text.toString()))
            Toast.makeText(this, "Logs copied to clipboard", Toast.LENGTH_SHORT).show()
        }

        // Clear Console Logs
        btnClearLogs.setOnClickListener {
            prefs.edit().putString("persisted_logs", "[Console cleared]\n").apply()
            tvLogsConsole.text = "[Console cleared]\n"
        }

        // Auto-start if API key is already configured
        if (prefs.getString("api_key", "")?.isNotEmpty() == true && !PaymentSyncService.isRunning) {
            PaymentSyncService.start(this)
            updateServiceRunningState(true)
            SyncApiClient.broadcastLog(this, "Auto-started 24/7 listener from saved config.")
        }
    }

    private fun saveCurrentInputs(): Boolean {
        val rawUrl = editServerUrl.text.toString().trim().removeSuffix("/")
        val key = editApiKey.text.toString().trim()
        if (rawUrl.isEmpty() || key.isEmpty()) {
            Toast.makeText(this, "Please enter both Store Domain URL and Sync API Key", Toast.LENGTH_SHORT).show()
            return false
        }
        val normalizedUrl = if (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
            "https://$rawUrl"
        } else {
            rawUrl
        }
        editServerUrl.setText(normalizedUrl)
        getSharedPreferences("blumart_sync_prefs", Context.MODE_PRIVATE)
            .edit()
            .putString("server_url", normalizedUrl)
            .putString("api_key", key)
            .apply()
        return true
    }

    private fun refreshAllUi() {
        updateServiceRunningState(PaymentSyncService.isRunning)
        refreshPermissionAndBatteryBadges()
        refreshStatsAndLogs()
    }

    private fun refreshStatsAndLogs() {
        val prefs = getSharedPreferences("blumart_sync_prefs", Context.MODE_PRIVATE)
        val synced = prefs.getInt("synced_count", 0)
        val queued = SyncApiClient.getQueueCount(this)
        val lastSync = prefs.getString("last_sync_time", "Never") ?: "Never"
        val logs = prefs.getString("persisted_logs", "[Ready] Waiting for incoming bKash/Nagad/Rocket SMS...\n")

        tvStatSynced.text = synced.toString()
        tvStatQueued.text = queued.toString()
        tvStatLastSync.text = lastSync
        tvLogsConsole.text = logs
    }

    private fun updateServiceRunningState(running: Boolean) {
        if (running) {
            tvServiceStatusPill.text = "● Active (24/7)"
            tvServiceStatusPill.setTextColor(0xFF34D399.toInt())
            tvServiceStatusPill.backgroundTintList = ColorStateList.valueOf(0xFF064E3B.toInt())

            btnToggleService.text = "■ Stop 24/7 Auto-Sync Service"
            btnToggleService.backgroundTintList = ColorStateList.valueOf(0xFFDC2626.toInt())
        } else {
            tvServiceStatusPill.text = "● Stopped"
            tvServiceStatusPill.setTextColor(0xFFF87171.toInt())
            tvServiceStatusPill.backgroundTintList = ColorStateList.valueOf(0xFF1E293B.toInt())

            btnToggleService.text = "▶ Start 24/7 Auto-Sync Service"
            btnToggleService.backgroundTintList = ColorStateList.valueOf(0xFF059669.toInt())
        }
    }

    private fun hasSmsPermissions(): Boolean {
        val receiveGranted = ContextCompat.checkSelfPermission(
            this,
            android.Manifest.permission.RECEIVE_SMS
        ) == PackageManager.PERMISSION_GRANTED
        val readGranted = ContextCompat.checkSelfPermission(
            this,
            android.Manifest.permission.READ_SMS
        ) == PackageManager.PERMISSION_GRANTED
        return receiveGranted && readGranted
    }

    private fun refreshPermissionAndBatteryBadges() {
        if (hasSmsPermissions()) {
            tvPermissionStatus.text = "✓ SMS Read & Receive Permissions Granted"
            tvPermissionStatus.setTextColor(0xFF059669.toInt())
        } else {
            tvPermissionStatus.text = "⚠ SMS Permission Missing — Tap 'SMS Permissions' below"
            tvPermissionStatus.setTextColor(0xFFDC2626.toInt())
        }

        val isIgnored = OemBatteryHelper.isBatteryOptimizationIgnored(this)
        if (isIgnored) {
            tvBatteryStatus.text = "✓ Unrestricted Battery Mode Active (24/7 Safe)"
            tvBatteryStatus.setTextColor(0xFF059669.toInt())
        } else {
            tvBatteryStatus.text = "⚠ Battery Optimization Active — Tap 'Disable Sleep Killer'"
            tvBatteryStatus.setTextColor(0xFFD97706.toInt())
        }
    }

    private fun requestAppPermissions() {
        val permissions = mutableListOf(
            android.Manifest.permission.RECEIVE_SMS,
            android.Manifest.permission.READ_SMS
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(android.Manifest.permission.POST_NOTIFICATIONS)
        }

        val needed = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (needed.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, needed.toTypedArray(), 101)
        } else {
            refreshPermissionAndBatteryBadges()
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        refreshPermissionAndBatteryBadges()
    }

    override fun onResume() {
        super.onResume()
        val filter = IntentFilter(SyncApiClient.ACTION_LOG_EVENT)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(logReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(logReceiver, filter)
        }
        refreshAllUi()
    }

    override fun onPause() {
        super.onPause()
        try {
            unregisterReceiver(logReceiver)
        } catch (_: Exception) {
        }
    }
}
