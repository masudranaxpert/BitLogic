package com.blumart.sync

import android.annotation.SuppressLint
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
import android.view.MotionEvent
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.blumart.sync.api.SyncApiClient
import com.blumart.sync.service.PaymentSyncService
import com.blumart.sync.util.OemBatteryHelper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
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
    private lateinit var tvNotificationStatus: TextView
    private lateinit var tvBatteryStatus: TextView
    private lateinit var tvServiceStatusPill: TextView
    private lateinit var tvConnectionPill: TextView
    private lateinit var tvStatSynced: TextView
    private lateinit var tvStatQueued: TextView
    private lateinit var tvStatLastSync: TextView
    private lateinit var tvLogsConsole: TextView
    private lateinit var btnCopyLogs: TextView
    private lateinit var btnClearLogs: TextView

    private var isKeyVisible = false
    private val activityScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    private val logReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == SyncApiClient.ACTION_LOG_EVENT) {
                refreshStatsAndLogs()
            }
        }
    }

    @SuppressLint("ClickableViewAccessibility")
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
        tvNotificationStatus = findViewById(R.id.tvNotificationStatus)
        tvBatteryStatus = findViewById(R.id.tvBatteryStatus)
        tvServiceStatusPill = findViewById(R.id.tvServiceStatusPill)
        tvConnectionPill = findViewById(R.id.tvConnectionPill)
        tvStatSynced = findViewById(R.id.tvStatSynced)
        tvStatQueued = findViewById(R.id.tvStatQueued)
        tvStatLastSync = findViewById(R.id.tvStatLastSync)
        tvLogsConsole = findViewById(R.id.tvLogsConsole)
        btnCopyLogs = findViewById(R.id.btnCopyLogs)
        btnClearLogs = findViewById(R.id.btnClearLogs)

        tvLogsConsole.movementMethod = ScrollingMovementMethod()
        // Allow scrolling inside the log console without the outer ScrollView hijacking drags.
        tvLogsConsole.setOnTouchListener { v, event ->
            v.parent.requestDisallowInterceptTouchEvent(event.action != MotionEvent.ACTION_UP)
            false
        }

        val prefs = getSharedPreferences(SyncApiClient.PREFS_NAME, Context.MODE_PRIVATE)
        editServerUrl.setText(prefs.getString("server_url", "https://blumartbd.com"))
        editApiKey.setText(prefs.getString("api_key", ""))

        requestAppPermissions()
        refreshAllUi()

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

        btnSave.setOnClickListener {
            if (!saveCurrentInputs()) return@setOnClickListener
            SyncApiClient.broadcastLog(this, "✓ Configuration saved.")
            Toast.makeText(this, "Configuration Saved!", Toast.LENGTH_SHORT).show()
        }

        btnTestPing.setOnClickListener {
            if (!saveCurrentInputs()) return@setOnClickListener
            btnTestPing.isEnabled = false
            btnTestPing.text = "Pinging..."
            SyncApiClient.broadcastLog(this, "Testing server connection...")

            activityScope.launch {
                val res = withContext(Dispatchers.IO) {
                    SyncApiClient.pingServer(this@MainActivity)
                }
                btnTestPing.isEnabled = true
                btnTestPing.text = "Test Ping"
                refreshStatsAndLogs()
                when {
                    res.ok -> Toast.makeText(this@MainActivity, "Connected (HTTP ${res.httpCode})!", Toast.LENGTH_SHORT).show()
                    res.isAuthError -> Toast.makeText(this@MainActivity, "Invalid Key or Paused Device (HTTP ${res.httpCode})", Toast.LENGTH_LONG).show()
                    else -> Toast.makeText(this@MainActivity, "Connection failed: ${res.message}", Toast.LENGTH_LONG).show()
                }
            }
        }

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

        btnScanInbox.setOnClickListener {
            if (!hasSmsPermissions()) {
                requestAppPermissions()
                Toast.makeText(this, "Please grant SMS read permission first", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            if (!saveCurrentInputs()) return@setOnClickListener

            btnScanInbox.isEnabled = false
            btnScanInbox.text = "Scanning..."
            SyncApiClient.broadcastLog(this, "Scanning phone SMS inbox (last 24 hours)...")

            activityScope.launch {
                val synced = withContext(Dispatchers.IO) {
                    SyncApiClient.scanRecentInboxMfsSms(this@MainActivity, 1440, onlyUnsynced = false)
                }
                btnScanInbox.isEnabled = true
                btnScanInbox.text = "Scan Inbox"
                refreshStatsAndLogs()
                Toast.makeText(
                    this@MainActivity,
                    if (synced > 0) "Synced $synced MFS SMS from last 24h!" else "No MFS SMS found in last 24h",
                    Toast.LENGTH_SHORT
                ).show()
            }
        }

        btnFlushQueue.setOnClickListener {
            if (!saveCurrentInputs()) return@setOnClickListener
            val queued = SyncApiClient.getQueueCount(this)
            if (queued == 0) {
                Toast.makeText(this, "Retry queue is empty (0 pending)", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            btnFlushQueue.isEnabled = false
            btnFlushQueue.text = "Retrying..."
            activityScope.launch {
                val flushed = withContext(Dispatchers.IO) {
                    SyncApiClient.flushQueue(this@MainActivity)
                }
                btnFlushQueue.isEnabled = true
                btnFlushQueue.text = "Retry Queue"
                refreshStatsAndLogs()
                Toast.makeText(this@MainActivity, "Flushed $flushed SMS from queue", Toast.LENGTH_SHORT).show()
            }
        }

        btnSimulateSms.setOnClickListener {
            if (!saveCurrentInputs()) return@setOnClickListener
            AlertDialog.Builder(this)
                .setTitle("Send Test bKash SMS?")
                .setMessage("This sends a dummy Tk 25.00 bKash SMS to your live Admin SMS Logs to verify the end-to-end pipeline.")
                .setNegativeButton("Cancel", null)
                .setPositiveButton("Send Test") { _, _ ->
                    val randomTrx = "SIM" + (1000000..9999999).random()
                    val sampleSms = "You have received Tk 25.00 from 01847474747. Ref BlumartTest. Fee Tk 0.00. Balance Tk 1,250.00. TrxID $randomTrx at 09/11/2026 13:20"
                    SyncApiClient.broadcastLog(this, "Simulating bKash SMS ($randomTrx)...")

                    activityScope.launch {
                        val ok = withContext(Dispatchers.IO) {
                            SyncApiClient.uploadSms(this@MainActivity, sampleSms, "bKash")
                        }
                        refreshStatsAndLogs()
                        Toast.makeText(
                            this@MainActivity,
                            if (ok) "Simulated SMS sent ($randomTrx)!" else "Simulation failed — check console",
                            Toast.LENGTH_SHORT
                        ).show()
                    }
                }
                .show()
        }

        btnGrantPermissions.setOnClickListener {
            requestAppPermissions()
        }

        btnBatterySettings.setOnClickListener {
            OemBatteryHelper.requestIgnoreBatteryOptimization(this)
            OemBatteryHelper.openOemAutoStartSettings(this)
            SyncApiClient.broadcastLog(this, "Opened battery & background protection settings.")
        }

        btnCopyLogs.setOnClickListener {
            val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            clipboard.setPrimaryClip(ClipData.newPlainText("BlumartSyncLogs", tvLogsConsole.text.toString()))
            Toast.makeText(this, "Logs copied to clipboard", Toast.LENGTH_SHORT).show()
        }

        btnClearLogs.setOnClickListener {
            prefs.edit().putString("persisted_logs", "[Console cleared]\n").apply()
            tvLogsConsole.text = "[Console cleared]\n"
        }

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
        getSharedPreferences(SyncApiClient.PREFS_NAME, Context.MODE_PRIVATE)
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
        val prefs = getSharedPreferences(SyncApiClient.PREFS_NAME, Context.MODE_PRIVATE)
        val synced = prefs.getInt("synced_count", 0)
        val queued = SyncApiClient.getQueueCount(this)
        val lastSync = prefs.getString("last_sync_time", "Never") ?: "Never"
        val connState = prefs.getString("connection_state", "unknown") ?: "unknown"
        val logs = prefs.getString("persisted_logs", "[Ready] Waiting for incoming bKash, Nagad, Rocket or Upay SMS...\n")

        tvStatSynced.text = synced.toString()
        tvStatQueued.text = queued.toString()
        tvStatLastSync.text = lastSync
        tvLogsConsole.text = logs

        when (connState) {
            "connected" -> {
                tvConnectionPill.text = "Connected"
                tvConnectionPill.setTextColor(0xFF065F46.toInt())
                tvConnectionPill.backgroundTintList = ColorStateList.valueOf(0xFFD1FAE5.toInt())
            }
            "auth_error" -> {
                tvConnectionPill.text = "Auth Rejected"
                tvConnectionPill.setTextColor(0xFF991B1B.toInt())
                tvConnectionPill.backgroundTintList = ColorStateList.valueOf(0xFFFEE2E2.toInt())
            }
            "offline" -> {
                tvConnectionPill.text = "Offline / Retry"
                tvConnectionPill.setTextColor(0xFF92400E.toInt())
                tvConnectionPill.backgroundTintList = ColorStateList.valueOf(0xFFFEF3C7.toInt())
            }
            else -> {
                tvConnectionPill.text = "Not tested"
                tvConnectionPill.setTextColor(0xFF475569.toInt())
                tvConnectionPill.backgroundTintList = ColorStateList.valueOf(0xFFF1F5F9.toInt())
            }
        }
    }

    private fun updateServiceRunningState(running: Boolean) {
        if (running) {
            tvServiceStatusPill.text = "● Active (24/7)"
            tvServiceStatusPill.setTextColor(0xFF34D399.toInt())
            tvServiceStatusPill.backgroundTintList = ColorStateList.valueOf(0xFF064E3B.toInt())

            btnToggleService.text = "Stop Auto-Sync"
            btnToggleService.backgroundTintList = ColorStateList.valueOf(0xFFDC2626.toInt())
        } else {
            tvServiceStatusPill.text = "● Stopped"
            tvServiceStatusPill.setTextColor(0xFFF87171.toInt())
            tvServiceStatusPill.backgroundTintList = ColorStateList.valueOf(0xFF232B47.toInt())

            btnToggleService.text = "Start Auto-Sync"
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

    private fun hasNotificationPermission(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true
        return ContextCompat.checkSelfPermission(
            this,
            android.Manifest.permission.POST_NOTIFICATIONS
        ) == PackageManager.PERMISSION_GRANTED
    }

    private fun refreshPermissionAndBatteryBadges() {
        if (hasSmsPermissions()) {
            tvPermissionStatus.text = "✓ SMS Permissions Granted"
            tvPermissionStatus.setTextColor(0xFF065F46.toInt())
            tvPermissionStatus.backgroundTintList = ColorStateList.valueOf(0xFFECFDF5.toInt())
        } else {
            tvPermissionStatus.text = "⚠ SMS Permission Missing — Tap Permissions"
            tvPermissionStatus.setTextColor(0xFF991B1B.toInt())
            tvPermissionStatus.backgroundTintList = ColorStateList.valueOf(0xFFFEF2F2.toInt())
        }

        if (hasNotificationPermission()) {
            tvNotificationStatus.text = "✓ Notifications Allowed"
            tvNotificationStatus.setTextColor(0xFF065F46.toInt())
            tvNotificationStatus.backgroundTintList = ColorStateList.valueOf(0xFFECFDF5.toInt())
        } else {
            tvNotificationStatus.text = "⚠ Notifications Off — Tap Permissions"
            tvNotificationStatus.setTextColor(0xFF92400E.toInt())
            tvNotificationStatus.backgroundTintList = ColorStateList.valueOf(0xFFFFFBEB.toInt())
        }

        if (OemBatteryHelper.isBatteryOptimizationIgnored(this)) {
            tvBatteryStatus.text = "✓ Battery Unrestricted"
            tvBatteryStatus.setTextColor(0xFF065F46.toInt())
            tvBatteryStatus.backgroundTintList = ColorStateList.valueOf(0xFFECFDF5.toInt())
        } else {
            tvBatteryStatus.text = "⚠ Battery Restricted — Tap Battery Mode"
            tvBatteryStatus.setTextColor(0xFF92400E.toInt())
            tvBatteryStatus.backgroundTintList = ColorStateList.valueOf(0xFFFFFBEB.toInt())
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

    override fun onDestroy() {
        super.onDestroy()
        activityScope.cancel()
    }
}
