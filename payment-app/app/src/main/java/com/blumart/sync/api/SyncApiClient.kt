package com.blumart.sync.api

import android.content.Context
import android.content.Intent
import android.os.BatteryManager
import android.provider.Telephony
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

object SyncApiClient {
    private const val TAG = "SyncApiClient"
    const val ACTION_LOG_EVENT = "com.blumart.sync.ACTION_LOG_EVENT"
    const val EXTRA_LOG_MESSAGE = "extra_log_message"

    private val WHITELIST = listOf("bkash", "16216", "nagad", "16167", "rocket", "16221", "dbbl", "upay", "16268")

    private fun computeSmsKey(sender: String, body: String, date: Long): String {
        val raw = "${sender.trim().lowercase()}|${body.trim()}|${date / 60000L}"
        return try {
            val md = MessageDigest.getInstance("SHA-256")
            md.digest(raw.toByteArray()).joinToString("") { "%02x".format(it) }.take(16)
        } catch (_: Exception) {
            raw.hashCode().toString()
        }
    }

    private fun getSyncedHashes(context: Context): MutableSet<String> {
        val prefs = context.getSharedPreferences("blumart_sync_prefs", Context.MODE_PRIVATE)
        val raw = prefs.getString("synced_sms_hashes", "") ?: ""
        if (raw.isEmpty()) return mutableSetOf()
        return raw.split(",").filter { it.isNotEmpty() }.toMutableSet()
    }

    private fun recordSyncedHashes(context: Context, newHashes: Collection<String>) {
        if (newHashes.isEmpty()) return
        val prefs = context.getSharedPreferences("blumart_sync_prefs", Context.MODE_PRIVATE)
        val combined = (getSyncedHashes(context) + newHashes).toList().takeLast(300)
        prefs.edit().putString("synced_sms_hashes", combined.joinToString(",")).apply()
    }

    fun broadcastLog(context: Context, message: String) {
        val prefs = context.getSharedPreferences("blumart_sync_prefs", Context.MODE_PRIVATE)
        val time = android.text.format.DateFormat.format("HH:mm:ss", java.util.Date())
        val line = "[$time] $message"
        val existing = prefs.getString("persisted_logs", "") ?: ""
        val updated = (line + "\n" + existing).lines().take(60).joinToString("\n")
        prefs.edit().putString("persisted_logs", updated).apply()

        val intent = Intent(ACTION_LOG_EVENT).apply {
            setPackage(context.packageName)
            putExtra(EXTRA_LOG_MESSAGE, line)
        }
        context.sendBroadcast(intent)
    }

    fun uploadSms(context: Context, rawSms: String, sender: String, timestamp: Long = System.currentTimeMillis()): Boolean {
        val prefs = context.getSharedPreferences("blumart_sync_prefs", Context.MODE_PRIVATE)
        val serverUrl = prefs.getString("server_url", "")?.trim() ?: ""
        val apiKey = prefs.getString("api_key", "")?.trim() ?: ""

        if (serverUrl.isEmpty() || apiKey.isEmpty()) {
            Log.w(TAG, "Sync skipped: Server URL or API Key not configured")
            broadcastLog(context, "⚠ Sync skipped: Configure Domain & API Key first.")
            return false
        }

        val item = JSONObject().apply {
            put("rawSms", rawSms)
            put("sender", sender)
            put("timestamp", timestamp)
        }

        val ok = sendBatchToServer(context, serverUrl, apiKey, JSONArray().apply { put(item) })
        if (ok) {
            if (!sender.equals("TEST_PING", ignoreCase = true)) {
                recordSyncedHashes(context, listOf(computeSmsKey(sender, rawSms, timestamp)))
            }
            val syncedCount = prefs.getInt("synced_count", 0) + 1
            val timeStr = android.text.format.DateFormat.format("hh:mm a", java.util.Date()).toString()
            prefs.edit()
                .putInt("synced_count", syncedCount)
                .putString("last_sync_time", timeStr)
                .apply()
            broadcastLog(context, "✓ Forwarded [$sender] -> HTTP 200 OK")
            // Also flush any pending offline queue items
            flushQueue(context)
        } else {
            if (!sender.equals("TEST_PING", ignoreCase = true)) {
                enqueueFailedSms(context, item)
                broadcastLog(context, "⏳ Network unavailable. Saved [$sender] to Offline Retry Queue.")
            } else {
                broadcastLog(context, "✕ Connection test failed: Server unreachable.")
            }
        }
        return ok
    }

    fun flushQueue(context: Context): Int {
        val prefs = context.getSharedPreferences("blumart_sync_prefs", Context.MODE_PRIVATE)
        val serverUrl = prefs.getString("server_url", "")?.trim() ?: ""
        val apiKey = prefs.getString("api_key", "")?.trim() ?: ""
        val rawQueue = prefs.getString("offline_queue_json", "[]") ?: "[]"

        val queueArray = try {
            JSONArray(rawQueue)
        } catch (e: Exception) {
            JSONArray()
        }

        if (queueArray.length() == 0 || serverUrl.isEmpty() || apiKey.isEmpty()) {
            return 0
        }

        val count = queueArray.length()
        val ok = sendBatchToServer(context, serverUrl, apiKey, queueArray)
        return if (ok) {
            val hashes = mutableListOf<String>()
            for (i in 0 until queueArray.length()) {
                val obj = queueArray.optJSONObject(i) ?: continue
                hashes.add(
                    computeSmsKey(
                        obj.optString("sender", ""),
                        obj.optString("rawSms", ""),
                        obj.optLong("timestamp", System.currentTimeMillis())
                    )
                )
            }
            recordSyncedHashes(context, hashes)

            val syncedCount = prefs.getInt("synced_count", 0) + count
            val timeStr = android.text.format.DateFormat.format("hh:mm a", java.util.Date()).toString()
            prefs.edit()
                .putString("offline_queue_json", "[]")
                .putInt("synced_count", syncedCount)
                .putString("last_sync_time", timeStr)
                .apply()
            broadcastLog(context, "✓ Flushed $count queued SMS to server!")
            count
        } else {
            broadcastLog(context, "✕ Retry failed for $count queued SMS.")
            0
        }
    }

    fun getQueueCount(context: Context): Int {
        val prefs = context.getSharedPreferences("blumart_sync_prefs", Context.MODE_PRIVATE)
        val rawQueue = prefs.getString("offline_queue_json", "[]") ?: "[]"
        return try {
            JSONArray(rawQueue).length()
        } catch (e: Exception) {
            0
        }
    }

    /**
     * Scans the phone's SMS inbox for MFS messages received in the last [minutesBack] minutes
     * (default 24 hours = 1440m) and uploads any unsynced messages in a single batch so no payment
     * is ever missed if the phone was off overnight or disconnected.
     */
    fun scanRecentInboxMfsSms(
        context: Context,
        minutesBack: Int = 1440,
        onlyUnsynced: Boolean = false
    ): Int {
        val prefs = context.getSharedPreferences("blumart_sync_prefs", Context.MODE_PRIVATE)
        val serverUrl = prefs.getString("server_url", "")?.trim() ?: ""
        val apiKey = prefs.getString("api_key", "")?.trim() ?: ""
        if (serverUrl.isEmpty() || apiKey.isEmpty()) return -1

        val knownHashes = getSyncedHashes(context)
        val newHashes = mutableListOf<String>()
        val cutoff = System.currentTimeMillis() - (minutesBack * 60 * 1000L)
        val foundBatch = JSONArray()

        try {
            val cursor = context.contentResolver.query(
                Telephony.Sms.Inbox.CONTENT_URI,
                arrayOf(Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE),
                "${Telephony.Sms.DATE} >= ?",
                arrayOf(cutoff.toString()),
                "${Telephony.Sms.DATE} ASC"
            )

            cursor?.use { c ->
                val addrIdx = c.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)
                val bodyIdx = c.getColumnIndexOrThrow(Telephony.Sms.BODY)
                val dateIdx = c.getColumnIndexOrThrow(Telephony.Sms.DATE)

                while (c.moveToNext()) {
                    val address = c.getString(addrIdx) ?: ""
                    val body = c.getString(bodyIdx) ?: ""
                    val date = c.getLong(dateIdx)
                    val lowerAddr = address.lowercase()

                    val isMfs = WHITELIST.any { lowerAddr == it || lowerAddr.contains(it) }
                    if (isMfs && body.isNotBlank()) {
                        val hashKey = computeSmsKey(address, body, date)
                        if (onlyUnsynced && knownHashes.contains(hashKey)) {
                            continue
                        }
                        newHashes.add(hashKey)
                        foundBatch.put(JSONObject().apply {
                            put("rawSms", body)
                            put("sender", address)
                            put("timestamp", date)
                        })
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error scanning SMS inbox", e)
            if (!onlyUnsynced) {
                broadcastLog(context, "✕ Inbox scan error: ${e.message}")
            }
            return 0
        }

        if (foundBatch.length() == 0) {
            if (!onlyUnsynced) {
                broadcastLog(context, "ℹ Inbox scan complete: 0 MFS SMS in last ${minutesBack / 60}h.")
            }
            return 0
        }

        val ok = sendBatchToServer(context, serverUrl, apiKey, foundBatch)
        return if (ok) {
            recordSyncedHashes(context, newHashes)
            val syncedCount = prefs.getInt("synced_count", 0) + foundBatch.length()
            val timeStr = android.text.format.DateFormat.format("hh:mm a", java.util.Date()).toString()
            prefs.edit()
                .putInt("synced_count", syncedCount)
                .putString("last_sync_time", timeStr)
                .apply()
            broadcastLog(context, "✓ Inbox Recovery: Synced ${foundBatch.length()} MFS SMS (last ${minutesBack / 60}h).")
            foundBatch.length()
        } else {
            if (!onlyUnsynced) {
                broadcastLog(context, "✕ Inbox Scan upload failed (check connection).")
            }
            0
        }
    }

    private fun enqueueFailedSms(context: Context, item: JSONObject) {
        val prefs = context.getSharedPreferences("blumart_sync_prefs", Context.MODE_PRIVATE)
        val rawQueue = prefs.getString("offline_queue_json", "[]") ?: "[]"
        val arr = try {
            JSONArray(rawQueue)
        } catch (e: Exception) {
            JSONArray()
        }
        // Prevent duplicate queue entries for the exact same SMS
        val candidateRaw = item.optString("rawSms", "")
        for (i in 0 until arr.length()) {
            if (arr.optJSONObject(i)?.optString("rawSms", "") == candidateRaw) {
                return
            }
        }
        arr.put(item)
        prefs.edit().putString("offline_queue_json", arr.toString()).apply()
    }

    private fun sendBatchToServer(
        context: Context,
        serverUrl: String,
        apiKey: String,
        transactionsArray: JSONArray
    ): Boolean {
        val endpoint = if (serverUrl.endsWith("/")) "${serverUrl}api/gateway/sms/sync" else "${serverUrl}/api/gateway/sms/sync"
        return try {
            val batteryStatus = getBatteryInfo(context)
            val payload = JSONObject().apply {
                put("batteryPct", batteryStatus.first)
                put("isCharging", batteryStatus.second)
                put("transactions", transactionsArray)
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
            conn.disconnect()
            success
        } catch (e: Exception) {
            Log.e(TAG, "Network exception uploading batch to $endpoint", e)
            false
        }
    }

    fun getBatteryInfo(context: Context): Pair<Int, Boolean> {
        val bm = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        val level = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        val status = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_STATUS)
        val isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL
        return Pair(level, isCharging)
    }
}
