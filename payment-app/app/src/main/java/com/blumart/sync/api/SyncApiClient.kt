package com.blumart.sync.api

import android.content.Context
import android.os.BatteryManager
import android.os.Build
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

object SyncApiClient {
    private const val TAG = "SyncApiClient"

    fun uploadSms(context: Context, rawSms: String, sender: String): Boolean {
        val prefs = context.getSharedPreferences("blumart_sync_prefs", Context.MODE_PRIVATE)
        val serverUrl = prefs.getString("server_url", "")?.trim() ?: ""
        val apiKey = prefs.getString("api_key", "")?.trim() ?: ""

        if (serverUrl.isEmpty() || apiKey.isEmpty()) {
            Log.w(TAG, "Sync skipped: Server URL or API Key not configured")
            return false
        }

        val endpoint = if (serverUrl.endsWith("/")) "${serverUrl}api/gateway/sms/sync" else "${serverUrl}/api/gateway/sms/sync"

        return try {
            val batteryStatus = getBatteryInfo(context)
            val payload = JSONObject().apply {
                put("batteryPct", batteryStatus.first)
                put("isCharging", batteryStatus.second)
                put("transactions", JSONArray().apply {
                    put(JSONObject().apply {
                        put("rawSms", rawSms)
                        put("sender", sender)
                        put("timestamp", System.currentTimeMillis())
                    })
                })
            }

            val url = URL(endpoint)
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 15000
                readTimeout = 15000
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Authorization", "Bearer $apiKey")
            }

            OutputStreamWriter(conn.outputStream).use { writer ->
                writer.write(payload.toString())
                writer.flush()
            }

            val responseCode = conn.responseCode
            val success = responseCode in 200..299
            Log.i(TAG, "Server responded with HTTP $responseCode (success=$success)")
            conn.disconnect()
            success
        } catch (e: Exception) {
            Log.e(TAG, "Network exception while uploading SMS to $endpoint", e)
            false
        }
    }

    private fun getBatteryInfo(context: Context): Pair<Int, Boolean> {
        val bm = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        val level = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        val status = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_STATUS)
        val isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL
        return Pair(level, isCharging)
    }
}
