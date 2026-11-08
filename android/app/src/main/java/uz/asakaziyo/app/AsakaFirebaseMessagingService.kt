package uz.asakaziyo.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/**
 * ASAKA ZIYO — Firebase Cloud Messaging Service
 * Handles real Android push notifications for Prayer Reminders, Adhan Alerts,
 * Quran & Hadith Daily Wisdom, and Mosque Announcements.
 */
class AsakaFirebaseMessagingService : FirebaseMessagingService() {

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        val title = remoteMessage.notification?.title ?: remoteMessage.data["title"] ?: "ASAKA ZIYO"
        val body = remoteMessage.notification?.body ?: remoteMessage.data["body"] ?: ""
        val channelId = remoteMessage.data["channelId"] ?: CHANNEL_PRAYER_ADHAN

        showNotification(title, body, channelId)
    }

    private fun showNotification(title: String, messageBody: String, channelId: String) {
        val intent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
        )

        val notificationBuilder = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(android.R.drawable.ic_popup_reminder)
            .setContentTitle(title)
            .setContentText(messageBody)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)

        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify((System.currentTimeMillis() % 100000).toInt(), notificationBuilder.build())
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val channels = listOf(
                NotificationChannel(
                    CHANNEL_PRAYER_ADHAN,
                    "Namoz va Azon Eslatmalari",
                    NotificationManager.IMPORTANCE_HIGH
                ),
                NotificationChannel(
                    CHANNEL_DAILY_WISDOM,
                    "Kunlik Oyat, Hadis va Zikrlar",
                    NotificationManager.IMPORTANCE_DEFAULT
                ),
                NotificationChannel(
                    CHANNEL_ANNOUNCEMENTS,
                    "Masjid Eʼlonlari va Yangiliklar",
                    NotificationManager.IMPORTANCE_HIGH
                )
            )
            channels.forEach { manager.createNotificationChannel(it) }
        }
    }

    companion object {
        const val CHANNEL_PRAYER_ADHAN = "asaka_ziyo_prayer_adhan"
        const val CHANNEL_DAILY_WISDOM = "asaka_ziyo_daily_wisdom"
        const val CHANNEL_ANNOUNCEMENTS = "asaka_ziyo_announcements"
    }
}
