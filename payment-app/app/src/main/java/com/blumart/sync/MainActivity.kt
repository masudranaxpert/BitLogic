package com.blumart.sync

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
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
    private lateinit var btnSave: Button
    private lateinit var btnTestPing: Button
    private lateinit var btnToggleService: Button
    private lateinit var btnBatterySettings: Button
    private lateinit var tvBatteryStatus: TextView
    private lateinit var tvServiceStatusPill: TextView
    private lateinit var tvLogsConsole: TextView
    private lateinit var btnClearLogs: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        editServerUrl = findViewById(R.id.editServerUrl)
        editApiKey = findViewById(R.id.editApiKey)
        btnSave = findViewById(R.id.btnSave)
        btnTestPing = findViewById(R.id.btnTestPing)
        btnToggleService = findViewById(R.id.btnToggleService)
        btnBatterySettings = findViewById(R.id.btnBatterySettings)
        tvBatteryStatus = findViewById(R.id.tvBatteryStatus)
        tvServiceStatusPill = findViewById(R.id.tvServiceStatusPill)
        tvLogsConsole = findViewById(R.id.tvLogsConsole)
        btnClearLogs = findViewById(R.id.btnClearLogs)

        tvLogsConsole.movementMethod = ScrollingMovementMethod()

        val prefs = getSharedPreferences("blumart_sync_prefs", Context.MODE_PRIVATE)
        editServerUrl.setText(prefs.getString("server_url", "https://yourdomain.com"))
        editApiKey.setText(prefs.getString("api_key", ""))

        refreshUiState()
        requestAppPermissions()

        btnSave.setOnClickListener {
            val url = editServerUrl.text.toString().trim()
            val key = editApiKey.text.toString().trim()
            prefs.edit().putString("server_url", url).putString("api_key", key).apply()
            logConsole("Settings saved successfully.")
            Toast.makeText(this, "Settings Saved!", Toast.LENGTH_SHORT).show()
        }

        btnTestPing.setOnClickListener {
            val url = editServerUrl.text.toString().trim()
            val key = editApiKey.text.toString().trim()
            if (url.isEmpty() || key.isEmpty()) {
                Toast.makeText(this, "Enter Server URL and API Key first", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            prefs.edit().putString("server_url", url).putString("api_key", key).apply()
            logConsole("Testing heartbeat ping to: $url ...")

            CoroutineScope(Dispatchers.IO).launch {
                val ok = SyncApiClient.uploadSms(
                    context = this@MainActivity,
                    rawSms = "Manual heartbeat check from Blumart Sync app",
                    sender = "TEST_PING"
                )
                withContext(Dispatchers.Main) {
                    if (ok) {
                        logConsole("✓ Server ping successful! Device verified.")
                        Toast.makeText(this@MainActivity, "Server Ping OK!", Toast.LENGTH_SHORT).show()
                    } else {
                        logConsole("✕ Server ping failed. Verify URL and API Key.")
                        Toast.makeText(this@MainActivity, "Ping failed!", Toast.LENGTH_LONG).show()
                    }
                }
            }
        }

        btnToggleService.setOnClickListener {
            PaymentSyncService.start(this)
            logConsole("▶ 24/7 Foreground SMS Listener started.")
            Toast.makeText(this, "Service Started!", Toast.LENGTH_SHORT).show()
            updatePillRunning(true)
        }

        btnBatterySettings.setOnClickListener {
            OemBatteryHelper.requestIgnoreBatteryOptimization(this)
            OemBatteryHelper.openOemAutoStartSettings(this)
            logConsole("Opened OEM battery & autostart manager.")
            refreshBatteryBadge()
        }

        btnClearLogs.setOnClickListener {
            tvLogsConsole.text = "[Console cleared]\n"
        }

        // Auto start if configured
        if (prefs.getString("api_key", "")?.isNotEmpty() == true) {
            PaymentSyncService.start(this)
            updatePillRunning(true)
            logConsole("Auto-resumed sync listener from saved credentials.")
        }
    }

    private fun logConsole(msg: String) {
        val current = tvLogsConsole.text.toString()
        val time = android.text.format.DateFormat.format("HH:mm:ss", java.util.Date())
        tvLogsConsole.text = "[$time] $msg\n$current"
    }

    private fun refreshUiState() {
        refreshBatteryBadge()
    }

    private fun updatePillRunning(running: Boolean) {
        if (running) {
            tvServiceStatusPill.text = "● Active & Syncing"
            tvServiceStatusPill.setTextColor(0xFF34D399.toInt())
            tvServiceStatusPill.backgroundTintList = android.content.res.ColorStateList.valueOf(0xFF064E3B.toInt())
        } else {
            tvServiceStatusPill.text = "● Stopped"
            tvServiceStatusPill.setTextColor(0xFFF87171.toInt())
            tvServiceStatusPill.backgroundTintList = android.content.res.ColorStateList.valueOf(0xFF1E293B.toInt())
        }
    }

    private fun refreshBatteryBadge() {
        val isIgnored = OemBatteryHelper.isBatteryOptimizationIgnored(this)
        if (isIgnored) {
            tvBatteryStatus.text = "✓ Battery Optimization Ignored (Safe from task-killer)"
            tvBatteryStatus.setTextColor(0xFF059669.toInt())
        } else {
            tvBatteryStatus.text = "⚠ Battery Optimization Active (Samsung/Honor may stop sync)"
            tvBatteryStatus.setTextColor(0xFFDC2626.toInt())
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
        }
    }

    override fun onResume() {
        super.onResume()
        refreshBatteryBadge()
    }
}
