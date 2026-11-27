package uz.asakaziyo.app.data

import android.content.Context
import android.util.Log
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import kotlinx.coroutines.flow.first
import org.json.JSONObject
import uz.asakaziyo.app.AsakaDailyAyahWidgetProvider
import uz.asakaziyo.app.AsakaDailyHadithWidgetProvider
import uz.asakaziyo.app.AsakaDhikrWidgetProvider
import uz.asakaziyo.app.AsakaHifzWidgetProvider
import uz.asakaziyo.app.AsakaNextPrayerWidgetProvider
import uz.asakaziyo.app.AsakaPrayerWidgetProvider
import uz.asakaziyo.app.AsakaQuranWidgetProvider
import java.util.concurrent.TimeUnit

/**
 * ASAKA ZIYO v6.0.0 — WorkManager Offline-First Background Sync Worker
 *
 * Automatically runs when network connectivity returns:
 * 1. Replays pending offline Hifz, bookmark, and reading progress mutations to central backend.
 * 2. Refreshes today's Prayer Schedule (preserving Asaka MANUAL_ADMIN) & Open-Meteo weather.
 * 3. Fetches central content manifest & daily wisdom (Ayah + Hadith) for offline cache.
 * 4. Updates ALL 7 native Android Home Screen Widgets without draining battery.
 */
class AsakaOfflineSyncWorker(
    appContext: Context,
    params: WorkerParameters
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val db = AsakaLocalDatabase(applicationContext)
        val prefs = AsakaSecurePreferences(applicationContext)
        val settings = prefs.settingsFlow.first()

        // 1. Replay offline sync queue
        val pending = db.listPendingSyncItems()
        for ((rowId, actionType, payloadStr) in pending) {
            try {
                when (actionType) {
                    "PROFILE_SYNC" -> {
                        val ok = AsakaApiClient.syncUserQuranProfile(settings.userId, JSONObject(payloadStr))
                        if (ok) db.removeSyncItem(rowId)
                    }
                    "USER_SYNC_STATE" -> {
                        val ok = AsakaApiClient.pushUnifiedUserSyncState(settings.userId, JSONObject(payloadStr))
                        if (ok) db.removeSyncItem(rowId)
                    }
                    else -> {
                        db.removeSyncItem(rowId)
                    }
                }
            } catch (e: Exception) {
                Log.w("ASAKA_SYNC", "Deferred sync item #$rowId failed: ${e.message}")
            }
        }

        // 2. Refresh prayer schedule & weather for selected city -> update prayer widgets
        try {
            val prayer = AsakaApiClient.fetchTodayPrayer(settings.selectedCityId)
            val weather = AsakaApiClient.fetchWeather(settings.selectedCityId)
            if (prayer != null) {
                db.savePrayerSnapshot(prayer)
                val widgetJson = JSONObject().apply {
                    put("cityName", prayer.cityName)
                    put("sourceMode", prayer.sourceMode)
                    put("localDate", prayer.localDate)
                    put("fajr", prayer.fajr)
                    put("dhuhr", prayer.dhuhr)
                    put("asr", prayer.asr)
                    put("maghrib", prayer.maghrib)
                    put("isha", prayer.isha)
                    put("nextPrayerName", prayer.nextPrayerName)
                    put("nextPrayerTime", prayer.nextPrayerTime)
                    if (weather != null) {
                        put("weatherTempC", weather.tempC)
                        put("weatherCondition", weather.conditionUz)
                    }
                }
                applicationContext.getSharedPreferences(
                    AsakaPrayerWidgetProvider.PREFS_NAME,
                    Context.MODE_PRIVATE
                ).edit()
                    .putString(AsakaPrayerWidgetProvider.KEY_WIDGET_SNAPSHOT, widgetJson.toString())
                    .putLong(AsakaPrayerWidgetProvider.KEY_WIDGET_UPDATED_AT, System.currentTimeMillis())
                    .apply()
            }
        } catch (e: Exception) {
            Log.w("ASAKA_SYNC", "Background prayer/widget refresh skipped: ${e.message}")
        }

        // 3. Refresh central database snapshot & daily Ayah/Hadith widgets
        try {
            val manifest = AsakaEcosystemApiClient.fetchContentManifest()
            val rawDb = AsakaEcosystemApiClient.fetchCentralDatabaseRawJson()
            if (!rawDb.isNullOrBlank()) {
                val version = manifest?.contentVersion.orEmpty()
                db.saveCentralCache("central_database", rawDb, version)
                val parsed = AsakaEcosystemApiClient.parseCentralDatabaseJson(rawDb)
                val ayahText = parsed.dailyWisdom?.ayahTranslation?.ifBlank { null }
                    ?: "Albatta, qiyinchilik bilan birga yengillik bordir."
                val ayahRef = parsed.dailyWisdom?.ayahRef?.ifBlank { null } ?: "Sharh surasi, 5-6-oyat"
                val hadithText = parsed.dailyWisdom?.hadithText?.ifBlank { null }
                    ?: parsed.dynamicHadiths.firstOrNull()?.text
                    ?: "Sizlarning eng yaxshilaringiz Qurʼonni oʻrganib, uni boshqalarga oʻrgatganlaringizdir."
                val hadithSource = parsed.dailyWisdom?.hadithSource?.ifBlank { null }
                    ?: parsed.dynamicHadiths.firstOrNull()?.source
                    ?: "Imom Buxoriy"

                applicationContext.getSharedPreferences(AsakaDailyAyahWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE)
                    .edit()
                    .putString(AsakaDailyAyahWidgetProvider.KEY_AYAH_TEXT, ayahText)
                    .putString(AsakaDailyAyahWidgetProvider.KEY_AYAH_REF, ayahRef)
                    .putString(AsakaDailyHadithWidgetProvider.KEY_HADITH_TEXT, hadithText)
                    .putString(AsakaDailyHadithWidgetProvider.KEY_HADITH_SOURCE, hadithSource)
                    .apply()
            }
        } catch (e: Exception) {
            Log.w("ASAKA_SYNC", "Background central content refresh skipped: ${e.message}")
        }

        // 4. Refresh Hifz snapshot & trigger all 7 widgets
        try {
            val hifz = db.listHifzItems()
            val avgMastery = if (hifz.isEmpty()) 0 else hifz.map { it.masteryScore }.average().toInt()
            val latest = hifz.firstOrNull()
            applicationContext.getSharedPreferences(AsakaHifzWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putInt(AsakaHifzWidgetProvider.KEY_HIFZ_COUNT, hifz.size)
                .putInt(AsakaHifzWidgetProvider.KEY_HIFZ_AVG_MASTERY, avgMastery)
                .putString(
                    AsakaHifzWidgetProvider.KEY_HIFZ_LATEST,
                    if (latest != null) "${latest.surahNameUz} (${latest.ayahFrom}–${latest.ayahTo})" else "Yangi hifz qoʻshing"
                )
                .apply()

            AsakaPrayerWidgetProvider.requestUpdate(applicationContext)
            AsakaNextPrayerWidgetProvider.requestUpdate(applicationContext)
            AsakaQuranWidgetProvider.requestUpdate(applicationContext)
            AsakaDhikrWidgetProvider.requestUpdate(applicationContext)
            AsakaDailyAyahWidgetProvider.requestUpdate(applicationContext)
            AsakaDailyHadithWidgetProvider.requestUpdate(applicationContext)
            AsakaHifzWidgetProvider.requestUpdate(applicationContext)
        } catch (_: Exception) {}

        return Result.success()
    }

    companion object {
        private const val PERIODIC_WORK_NAME = "asaka_ziyo_periodic_sync_v6"

        fun schedulePeriodicSync(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            val req = PeriodicWorkRequestBuilder<AsakaOfflineSyncWorker>(3, TimeUnit.HOURS)
                .setConstraints(constraints)
                .build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                PERIODIC_WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                req
            )
        }

        fun enqueueImmediateSync(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            val req = OneTimeWorkRequestBuilder<AsakaOfflineSyncWorker>()
                .setConstraints(constraints)
                .build()
            WorkManager.getInstance(context).enqueue(req)
        }
    }
}
