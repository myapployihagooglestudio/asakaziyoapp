package uz.asakaziyo.app

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat

/**
 * ASAKA ZIYO — Exact Prayer & Adhan Notification Alarm Receiver
 */
class AsakaPrayerAlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val alarmId = intent.getIntExtra(EXTRA_ALARM_ID, 0)
        val title = intent.getStringExtra(EXTRA_TITLE) ?: "ASAKA ZIYO — Namoz Vaqti"
        val body = intent.getStringExtra(EXTRA_BODY) ?: "Namoz vaqti kirdi."
        val channelId = intent.getStringExtra(EXTRA_CHANNEL_ID) ?: "asaka_ziyo_prayer_adhan"

        try {
            ensureChannels(context)
            val openIntent = Intent(context, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                putExtra("targetView", "prayer")
            }
            val contentPendingIntent = PendingIntent.getActivity(
                context,
                alarmId,
                openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val notification = NotificationCompat.Builder(context, channelId)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setAutoCancel(true)
                .setContentIntent(contentPendingIntent)
                .build()

            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.notify(20000 + alarmId, notification)
        } catch (e: Exception) {
            Log.e("ASAKA_ZIYO_ALARM", "Failed to post scheduled prayer notification", e)
        }
    }

    private fun ensureChannels(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            listOf(
                NotificationChannel(
                    "asaka_ziyo_prayer_pre_reminder",
                    "Namoz Oldidan Eslatmalar (5–30 daqiqa)",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply { enableVibration(true) },
                NotificationChannel(
                    "asaka_ziyo_prayer_adhan",
                    "Namoz Vaqti va Azon Eslatmalari",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply { enableVibration(true) }
            ).forEach { manager.createNotificationChannel(it) }
        }
    }

    companion object {
        const val PREFS_NAME = "asaka_prayer_alarms_v1"
        const val EXTRA_ALARM_ID = "alarm_id"
        const val EXTRA_TITLE = "title"
        const val EXTRA_BODY = "body"
        const val EXTRA_CHANNEL_ID = "channel_id"
        const val EXTRA_PLAY_ADHAN = "play_adhan"

        fun scheduleExactAlarm(
            context: Context,
            alarmId: Int,
            triggerAtMillis: Long,
            title: String,
            body: String,
            channelId: String,
            playAdhan: Boolean
        ) {
            if (triggerAtMillis <= System.currentTimeMillis()) return

            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intent = Intent(context, AsakaPrayerAlarmReceiver::class.java).apply {
                putExtra(EXTRA_ALARM_ID, alarmId)
                putExtra(EXTRA_TITLE, title)
                putExtra(EXTRA_BODY, body)
                putExtra(EXTRA_CHANNEL_ID, channelId)
                putExtra(EXTRA_PLAY_ADHAN, playAdhan)
            }
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                alarmId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val serialized = listOf(
                alarmId.toString(),
                triggerAtMillis.toString(),
                title.replace("|", " "),
                body.replace("|", " "),
                channelId.ifBlank { "asaka_ziyo_prayer_adhan" },
                playAdhan.toString()
            ).joinToString("|")
            val activeIds = prefs.getStringSet("active_ids", emptySet())?.toMutableSet() ?: mutableSetOf()
            activeIds.add(alarmId.toString())
            prefs.edit()
                .putStringSet("active_ids", activeIds)
                .putString("alarm_$alarmId", serialized)
                .apply()

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
                } else {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
                }
            } catch (secEx: SecurityException) {
                Log.w("ASAKA_ZIYO_ALARM", "Exact alarm permission denied, using inexact while-idle fallback: ${secEx.message}")
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
            }
        }

        fun cancelAllAlarms(context: Context) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val activeIds = prefs.getStringSet("active_ids", emptySet()) ?: emptySet()
            val editor = prefs.edit()
            for (idStr in activeIds) {
                val alarmId = idStr.toIntOrNull() ?: continue
                val intent = Intent(context, AsakaPrayerAlarmReceiver::class.java)
                val pendingIntent = PendingIntent.getBroadcast(
                    context,
                    alarmId,
                    intent,
                    PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
                )
                if (pendingIntent != null) {
                    alarmManager.cancel(pendingIntent)
                    pendingIntent.cancel()
                }
                editor.remove("alarm_$alarmId")
            }
            editor.remove("active_ids").apply()
        }
    }
}
