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
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (messages.isNullOrEmpty()) return

        val rawSender = (messages[0].originatingAddress ?: "").trim()
        if (!SyncApiClient.isWhitelistedMfsSender(rawSender)) {
            Log.d(TAG, "Ignored SMS from non-MFS sender: $rawSender")
            return
        }

        val fullBody = StringBuilder()
        for (m in messages) {
            fullBody.append(m.messageBody)
        }
        val rawSms = fullBody.toString()

        Log.i(TAG, "Authentic MFS SMS received from $rawSender")

        val pendingResult = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                SyncApiClient.uploadSms(context, rawSms, rawSender)
            } catch (e: Exception) {
                Log.e(TAG, "Error posting SMS to server", e)
            } finally {
                pendingResult.finish()
            }
        }
    }
}
