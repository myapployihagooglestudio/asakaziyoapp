package uz.asakaziyo.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/**
 * ASAKA ZIYO — Firebase Cloud Messaging Service (v4.0.0)
 * Handles real Android push notifications with Telegram-style High-Importance Heads-Up banners
 * for Prayer Pre-Reminders (5/10/15/30 min), Exact Adhan Alerts, Mosque Announcements,
 * News/Articles, and Community Chat Messages.
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
        val targetView = remoteMessage.data["targetView"] ?: "home"

        showNotification(title, body, channelId, targetView)
    }

    private fun showNotification(title: String, messageBody: String, channelId: String, targetView: String) {
        val intent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            putExtra("targetView", targetView)
        }
        val pendingIntent = PendingIntent.getActivity(
            this, (System.currentTimeMillis() % 10000).toInt(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val largeIcon = AsakaIconUtils.renderLauncherBitmap(this)
        val notificationBuilder = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_stat_asaka_ziyo)
            .setLargeIcon(largeIcon)
            .setColor(ContextCompat.getColor(this, R.color.asaka_emerald_primary))
            .setContentTitle(title)
            .setContentText(messageBody)
            .setStyle(NotificationCompat.BigTextStyle().bigText(messageBody))
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setContentIntent(pendingIntent)

        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify((System.currentTimeMillis() % 100000).toInt(), notificationBuilder.build())
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val channels = listOf(
                NotificationChannel(
                    CHANNEL_PRAYER_PRE_REMINDER,
                    "Namoz Oldidan Eslatmalar (5–30 daqiqa)",
                    NotificationManager.IMPORTANCE_HIGH
                ),
                NotificationChannel(
                    CHANNEL_PRAYER_ADHAN,
                    "Namoz va Azon Eslatmalari",
                    NotificationManager.IMPORTANCE_HIGH
                ),
                NotificationChannel(
                    CHANNEL_ANNOUNCEMENTS,
                    "Masjid Eʼlonlari va Muhim Xabarlar",
                    NotificationManager.IMPORTANCE_HIGH
                ),
                NotificationChannel(
                    CHANNEL_NEWS_ARTICLES,
                    "Yangiliklar va Ilmiy Maqolalar",
                    NotificationManager.IMPORTANCE_HIGH
                ),
                NotificationChannel(
                    CHANNEL_CHAT_MESSAGES,
                    "Suhbat va Imom Savol-Javob Xabarlari",
                    NotificationManager.IMPORTANCE_HIGH
                ),
                NotificationChannel(
                    CHANNEL_DAILY_WISDOM,
                    "Kunlik Oyat, Hadis va Zikrlar",
                    NotificationManager.IMPORTANCE_DEFAULT
                )
            )
            channels.forEach { manager.createNotificationChannel(it) }
        }
    }

    companion object {
        const val CHANNEL_PRAYER_PRE_REMINDER = "asaka_ziyo_prayer_pre_reminder"
        const val CHANNEL_PRAYER_ADHAN = "asaka_ziyo_prayer_adhan"
        const val CHANNEL_ANNOUNCEMENTS = "asaka_ziyo_announcements"
        const val CHANNEL_NEWS_ARTICLES = "asaka_ziyo_news_articles"
        const val CHANNEL_CHAT_MESSAGES = "asaka_ziyo_chat_messages"
        const val CHANNEL_DAILY_WISDOM = "asaka_ziyo_daily_wisdom"
    }
}
