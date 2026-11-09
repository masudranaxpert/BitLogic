package com.blumart.sync.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log
import com.blumart.sync.api.SyncApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class MfsSmsReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "MfsSmsReceiver"
        private val WHITELIST = listOf("bkash", "16216", "nagad", "16167", "rocket", "16221", "dbbl", "upay", "16268")
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (messages.isNullOrEmpty()) return

        val first = messages[0]
        val sender = (first.originatingAddress ?: "").trim().lowercase()

        // Strict Anti-Spoofing: Discard if sender is not an authentic MFS Telco ID
        val isWhitelisted = WHITELIST.any { sender == it || sender.contains(it) }
        if (!isWhitelisted) {
            Log.d(TAG, "Ignored SMS from non-MFS sender: $sender")
            return
        }

        val fullBody = StringBuilder()
        for (m in messages) {
            fullBody.append(m.messageBody)
        }
        val rawSms = fullBody.toString()

        Log.i(TAG, "Authentic MFS SMS received from $sender: $rawSms")

        val pendingResult = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                SyncApiClient.uploadSms(context, rawSms, first.originatingAddress ?: sender)
            } catch (e: Exception) {
                Log.e(TAG, "Error posting SMS to server", e)
            } finally {
                pendingResult.finish()
            }
        }
    }
}
