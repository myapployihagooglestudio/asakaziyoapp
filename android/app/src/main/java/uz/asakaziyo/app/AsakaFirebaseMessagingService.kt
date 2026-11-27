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
import uz.asakaziyo.app.data.AsakaOfflineSyncWorker

/**
 * Pure testable ring-buffer deduplicator for FCM push & reminder events.
 */
object AsakaNotificationDeduplicator {
    private const val MAX_SEEN = 60

    fun shouldAcceptAndRecord(existingIdsCsv: String, eventKey: String): Pair<Boolean, String> {
        val cleanKey = eventKey.trim()
        if (cleanKey.isBlank()) return true to existingIdsCsv
        val list = existingIdsCsv
            .split("|")
            .map { it.trim() }
            .filter { it.isNotBlank() }
            .toMutableList()
        if (list.contains(cleanKey)) {
            return false to list.joinToString("|")
        }
        list.add(cleanKey)
        while (list.size > MAX_SEEN) {
            list.removeAt(0)
        }
        return true to list.joinToString("|")
    }
}

/**
 * ASAKA ZIYO v6.0.0 — Smart Firebase Cloud Messaging Service
 *
 * Features:
 * - Event ID deduplication (zero duplicate push spam)
 * - Automatic background content manifest sync when Admin publishes new content
 * - Category-aware routing to 6 dedicated Android NotificationChannels
 */
class AsakaFirebaseMessagingService : FirebaseMessagingService() {

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        val data = remoteMessage.data
        // Trigger background manifest & widget sync whenever backend pushes content update signal
        if (data["type"] == "content_sync" || data["refreshManifest"] == "true") {
            AsakaOfflineSyncWorker.enqueueImmediateSync(applicationContext)
            if (remoteMessage.notification == null && data["title"].isNullOrBlank()) {
                return
            }
        }

        val title = remoteMessage.notification?.title ?: data["title"] ?: "ASAKA ZIYO"
        val body = remoteMessage.notification?.body ?: data["body"] ?: ""
        val channelId = data["channelId"] ?: CHANNEL_ANNOUNCEMENTS
        val targetView = data["targetView"] ?: "home"
        val eventId = data["eventId"]
            ?: remoteMessage.messageId
            ?: "${channelId}_${title.hashCode()}_${body.hashCode()}"

        val prefs = getSharedPreferences(PREFS_DEDUP, Context.MODE_PRIVATE)
        val existingCsv = prefs.getString(KEY_SEEN_IDS, "").orEmpty()
        val (accepted, updatedCsv) = AsakaNotificationDeduplicator.shouldAcceptAndRecord(existingCsv, eventId)
        if (!accepted) return
        prefs.edit().putString(KEY_SEEN_IDS, updatedCsv).apply()

        showNotification(title, body, channelId, targetView)
    }

    private fun showNotification(title: String, messageBody: String, channelId: String, targetView: String) {
        val intent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            putExtra("targetView", targetView)
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            (System.currentTimeMillis() % 10000).toInt(),
            intent,
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
        private const val PREFS_DEDUP = "asaka_fcm_dedup_v6"
        private const val KEY_SEEN_IDS = "seen_event_ids_csv"

        const val CHANNEL_PRAYER_PRE_REMINDER = "asaka_ziyo_prayer_pre_reminder"
        const val CHANNEL_PRAYER_ADHAN = "asaka_ziyo_prayer_adhan"
        const val CHANNEL_ANNOUNCEMENTS = "asaka_ziyo_announcements"
        const val CHANNEL_NEWS_ARTICLES = "asaka_ziyo_news_articles"
        const val CHANNEL_CHAT_MESSAGES = "asaka_ziyo_chat_messages"
        const val CHANNEL_DAILY_WISDOM = "asaka_ziyo_daily_wisdom"
    }
}
