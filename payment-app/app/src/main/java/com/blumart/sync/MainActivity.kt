package com.blumart.sync

import android.content.Context
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.blumart.sync.service.PaymentSyncService
import com.blumart.sync.util.OemBatteryHelper

class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val editServerUrl = findViewById<EditText>(R.id.editServerUrl)
        val editApiKey = findViewById<EditText>(R.id.editApiKey)
        val btnSave = findViewById<Button>(R.id.btnSave)
        val btnStartService = findViewById<Button>(R.id.btnStartService)
        val btnBatterySettings = findViewById<Button>(R.id.btnBatterySettings)
        val tvBatteryStatus = findViewById<TextView>(R.id.tvBatteryStatus)

        val prefs = getSharedPreferences("blumart_sync_prefs", Context.MODE_PRIVATE)
        editServerUrl.setText(prefs.getString("server_url", "https://yourdomain.com"))
        editApiKey.setText(prefs.getString("api_key", ""))

        fun refreshBatteryBadge() {
            val isIgnored = OemBatteryHelper.isBatteryOptimizationIgnored(this)
            if (isIgnored) {
                tvBatteryStatus.text = "✓ Battery Optimization Disabled (Safe)"
                tvBatteryStatus.setTextColor(0xFF10B981.toInt())
            } else {
                tvBatteryStatus.text = "⚠ Battery Optimization Active (May be killed)"
                tvBatteryStatus.setTextColor(0xFFEF4444.toInt())
            }
        }

        refreshBatteryBadge()

        btnSave.setOnClickListener {
            val url = editServerUrl.text.toString().trim()
            val key = editApiKey.text.toString().trim()
            prefs.edit().putString("server_url", url).putString("api_key", key).apply()
            Toast.makeText(this, "Settings Saved!", Toast.LENGTH_SHORT).show()
        }

        btnStartService.setOnClickListener {
            PaymentSyncService.start(this)
            Toast.makeText(this, "Foreground Sync Service Started!", Toast.LENGTH_SHORT).show()
        }

        btnBatterySettings.setOnClickListener {
            OemBatteryHelper.requestIgnoreBatteryOptimization(this)
            OemBatteryHelper.openOemAutoStartSettings(this)
            refreshBatteryBadge()
        }

        // Auto start foreground service on launch if keys present
        if (prefs.getString("api_key", "")?.isNotEmpty() == true) {
            PaymentSyncService.start(this)
        }
    }
}
