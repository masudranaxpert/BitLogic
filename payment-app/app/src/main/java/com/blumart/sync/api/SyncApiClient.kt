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

data class SyncResult(
    val ok: Boolean,
    val httpCode: Int = 0,
    val message: String = "",
) {
    val isAuthError: Boolean get() = httpCode == 401 || httpCode == 403
}

object SyncApiClient {
    private const val TAG = "SyncApiClient"
    const val PREFS_NAME = "blumart_sync_prefs"
    const val ACTION_LOG_EVENT = "com.blumart.sync.ACTION_LOG_EVENT"
    const val EXTRA_LOG_MESSAGE = "extra_log_message"

    private val WHITELIST = listOf("bkash", "16216", "nagad", "16167", "rocket", "16221", "dbbl", "upay", "16268")
    private val PERSONAL_PHONE_REGEX = Regex("^(?:88)?01[3-9]\\d{8,9}$")

    fun isWhitelistedMfsSender(sender: String?): Boolean {
        val clean = (sender ?: "").trim().lowercase()
        if (clean.isEmpty()) return false
        val digitsOnly = clean.replace(Regex("\\D"), "")
        if (PERSONAL_PHONE_REGEX.matches(digitsOnly)) return false
        return WHITELIST.any { clean == it || clean.contains(it) }
    }

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
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val raw = prefs.getString("synced_sms_hashes", "") ?: ""
        if (raw.isEmpty()) return mutableSetOf()
        return raw.split(",").filter { it.isNotEmpty() }.toMutableSet()
    }

    private fun recordSyncedHashes(context: Context, newHashes: Collection<String>) {
        if (newHashes.isEmpty()) return
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val combined = (getSyncedHashes(context) + newHashes).toList().takeLast(300)
        prefs.edit().putString("synced_sms_hashes", combined.joinToString(",")).apply()
    }

    private fun updateConnectionState(context: Context, res: SyncResult) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val state = when {
            res.ok -> "connected"
            res.isAuthError -> "auth_error"
            else -> "offline"
        }
        val edit = prefs.edit().putString("connection_state", state)
        if (res.ok) {
            val timeStr = android.text.format.DateFormat.format("hh:mm a", java.util.Date()).toString()
            edit.putString("last_sync_time", timeStr)
        }
        edit.apply()
    }

    fun broadcastLog(context: Context, message: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val time = android.text.format.DateFormat.format("HH:mm:ss", java.util.Date())
        val line = "[$time] $message"
        val existing = prefs.getString("persisted_logs", "") ?: ""
        val updated = (line + "\n" + existing).lines().take(80).joinToString("\n")
        prefs.edit().putString("persisted_logs", updated).apply()

        val intent = Intent(ACTION_LOG_EVENT).apply {
            setPackage(context.packageName)
            putExtra(EXTRA_LOG_MESSAGE, line)
        }
        context.sendBroadcast(intent)
    }

    fun pingServer(context: Context): SyncResult {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val serverUrl = prefs.getString("server_url", "")?.trim() ?: ""
        val apiKey = prefs.getString("api_key", "")?.trim() ?: ""

        if (serverUrl.isEmpty() || apiKey.isEmpty()) {
            return SyncResult(ok = false, message = "Configure Domain & API Key first")
        }

        val item = JSONObject().apply {
            put("rawSms", "Heartbeat ping from Blumart Sync device")
            put("sender", "TEST_PING")
            put("timestamp", System.currentTimeMillis())
        }

        val res = sendBatchToServer(context, serverUrl, apiKey, JSONArray().apply { put(item) })
        updateConnectionState(context, res)
        when {
            res.ok -> broadcastLog(context, "✓ Server heartbeat OK (HTTP ${res.httpCode}).")
            res.isAuthError -> broadcastLog(context, "✕ Auth rejected (HTTP ${res.httpCode}): ${res.message}")
            else -> broadcastLog(context, "✕ Connection failed: ${res.message}")
        }
        return res
    }

    fun uploadSms(context: Context, rawSms: String, sender: String, timestamp: Long = System.currentTimeMillis()): Boolean {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
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

        val res = sendBatchToServer(context, serverUrl, apiKey, JSONArray().apply { put(item) })
        updateConnectionState(context, res)

        if (res.ok) {
            recordSyncedHashes(context, listOf(computeSmsKey(sender, rawSms, timestamp)))
            val syncedCount = prefs.getInt("synced_count", 0) + 1
            prefs.edit().putInt("synced_count", syncedCount).apply()
            broadcastLog(context, "✓ Forwarded [$sender] -> HTTP ${res.httpCode} OK")
            flushQueue(context)
        } else if (res.isAuthError) {
            broadcastLog(context, "✕ Auth rejected [$sender] (HTTP ${res.httpCode}): ${res.message}")
        } else {
            enqueueFailedSms(context, item)
            broadcastLog(context, "⏳ Network issue (${res.message}). Saved [$sender] to Retry Queue.")
        }
        return res.ok
    }

    fun flushQueue(context: Context): Int {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val serverUrl = prefs.getString("server_url", "")?.trim() ?: ""
        val apiKey = prefs.getString("api_key", "")?.trim() ?: ""
        val rawQueue = prefs.getString("offline_queue_json", "[]") ?: "[]"

        val queueArray = try {
            JSONArray(rawQueue)
        } catch (_: Exception) {
            JSONArray()
        }

        if (queueArray.length() == 0 || serverUrl.isEmpty() || apiKey.isEmpty()) {
            return 0
        }

        val count = queueArray.length()
        val res = sendBatchToServer(context, serverUrl, apiKey, queueArray)
        updateConnectionState(context, res)

        return if (res.ok) {
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
            prefs.edit()
                .putString("offline_queue_json", "[]")
                .putInt("synced_count", syncedCount)
                .apply()
            broadcastLog(context, "✓ Flushed $count queued SMS to server!")
            count
        } else {
            val reason = if (res.isAuthError) "Auth failed (${res.httpCode})" else res.message
            broadcastLog(context, "✕ Retry failed for $count queued SMS ($reason).")
            0
        }
    }

    fun getQueueCount(context: Context): Int {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val rawQueue = prefs.getString("offline_queue_json", "[]") ?: "[]"
        return try {
            JSONArray(rawQueue).length()
        } catch (_: Exception) {
            0
        }
    }

    fun scanRecentInboxMfsSms(
        context: Context,
        minutesBack: Int = 1440,
        onlyUnsynced: Boolean = false
    ): Int {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
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

                    if (isWhitelistedMfsSender(address) && body.isNotBlank()) {
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

        val res = sendBatchToServer(context, serverUrl, apiKey, foundBatch)
        updateConnectionState(context, res)

        return if (res.ok) {
            recordSyncedHashes(context, newHashes)
            val syncedCount = prefs.getInt("synced_count", 0) + foundBatch.length()
            prefs.edit().putInt("synced_count", syncedCount).apply()
            broadcastLog(context, "✓ Inbox Recovery: Synced ${foundBatch.length()} MFS SMS (last ${minutesBack / 60}h).")
            foundBatch.length()
        } else {
            if (!onlyUnsynced) {
                val reason = if (res.isAuthError) "Auth failed (${res.httpCode})" else res.message
                broadcastLog(context, "✕ Inbox Scan upload failed ($reason).")
            }
            0
        }
    }

    private fun enqueueFailedSms(context: Context, item: JSONObject) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val rawQueue = prefs.getString("offline_queue_json", "[]") ?: "[]"
        val arr = try {
            JSONArray(rawQueue)
        } catch (_: Exception) {
            JSONArray()
        }
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
    ): SyncResult {
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

            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val bodyText = stream?.bufferedReader()?.use { it.readText() } ?: ""
            conn.disconnect()

            val serverMsg = try {
                JSONObject(bodyText).optString("message", "")
            } catch (_: Exception) {
                ""
            }

            SyncResult(
                ok = code in 200..299,
                httpCode = code,
                message = serverMsg.ifEmpty { if (code in 200..299) "OK" else "HTTP $code" },
            )
        } catch (e: Exception) {
            Log.e(TAG, "Network exception uploading batch to $endpoint", e)
            SyncResult(ok = false, httpCode = 0, message = e.javaClass.simpleName)
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
