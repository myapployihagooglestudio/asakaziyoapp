package uz.asakaziyo.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Restores scheduled prayer reminders after device reboot.
 */
class AsakaBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return

        val prefs = context.getSharedPreferences(AsakaPrayerAlarmReceiver.PREFS_NAME, Context.MODE_PRIVATE)
        val activeIds = prefs.getStringSet("active_ids", emptySet()) ?: return
        val now = System.currentTimeMillis()

        for (idStr in activeIds) {
            val raw = prefs.getString("alarm_$idStr", null) ?: continue
            val parts = raw.split("|")
            if (parts.size < 6) continue
            val alarmId = parts[0].toIntOrNull() ?: continue
            val triggerAt = parts[1].toLongOrNull() ?: continue
            if (triggerAt <= now) continue
            AsakaPrayerAlarmReceiver.scheduleExactAlarm(
                context = context,
                alarmId = alarmId,
                triggerAtMillis = triggerAt,
                title = parts[2],
                body = parts[3],
                channelId = parts[4],
                playAdhan = parts[5].toBoolean()
            )
        }
    }
}
