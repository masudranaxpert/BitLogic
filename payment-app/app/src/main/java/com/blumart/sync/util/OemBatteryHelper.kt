package com.blumart.sync.util

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Log

object OemBatteryHelper {
    private const val TAG = "OemBatteryHelper"

    /**
     * Checks if app is whitelisted from battery optimization.
     */
    fun isBatteryOptimizationIgnored(context: Context): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
            return pm.isIgnoringBatteryOptimizations(context.packageName)
        }
        return true
    }

    /**
     * Requests battery optimization exemption intent.
     */
    fun requestIgnoreBatteryOptimization(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:${context.packageName}")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(intent)
            } catch (e: Exception) {
                Log.e(TAG, "Error requesting battery optimization exemption", e)
            }
        }
    }

    /**
     * Opens manufacturer-specific auto-start settings for Samsung, Honor, Huawei, Xiaomi.
     */
    fun openOemAutoStartSettings(context: Context) {
        val manufacturer = Build.MANUFACTURER.lowercase()
        val intent = Intent()
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK

        try {
            when {
                // Samsung: Device Care
                manufacturer.contains("samsung") -> {
                    intent.setClassName("com.samsung.android.lool", "com.samsung.android.sm.ui.battery.BatteryActivity")
                }
                // Honor / Huawei: App Launch / Startup Manager
                manufacturer.contains("honor") || manufacturer.contains("huawei") -> {
                    intent.setClassName(
                        "com.huawei.systemmanager",
                        "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"
                    )
                }
                // Xiaomi / Redmi / Poco: Autostart
                manufacturer.contains("xiaomi") || manufacturer.contains("redmi") -> {
                    intent.setClassName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity")
                }
                else -> {
                    intent.action = Settings.ACTION_APPLICATION_DETAILS_SETTINGS
                    intent.data = Uri.parse("package:${context.packageName}")
                }
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            // Fallback to standard app details settings
            val fallback = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:${context.packageName}")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(fallback)
        }
    }
}
