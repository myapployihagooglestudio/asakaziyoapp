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
import uz.asakaziyo.app.AsakaNextPrayerWidgetProvider
import uz.asakaziyo.app.AsakaPrayerWidgetProvider
import uz.asakaziyo.app.AsakaQuranWidgetProvider
import java.util.concurrent.TimeUnit

/**
 * ASAKA ZIYO v5.0.0 — WorkManager Offline-First Background Sync Worker
 *
 * Automatically runs when network connectivity returns:
 * 1. Replays pending offline Hifz, bookmark, and reading progress mutations to central backend.
 * 2. Refreshes today's Prayer Schedule (preserving Asaka MANUAL_ADMIN) & Open-Meteo weather.
 * 3. Updates all Android Home Screen Widgets efficiently without draining battery.
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
                if (actionType == "PROFILE_SYNC") {
                    val ok = AsakaApiClient.syncUserQuranProfile(settings.userId, JSONObject(payloadStr))
                    if (ok) db.removeSyncItem(rowId)
                } else {
                    db.removeSyncItem(rowId)
                }
            } catch (e: Exception) {
                Log.w("ASAKA_SYNC", "Deferred sync item #$rowId failed: ${e.message}")
            }
        }

        // 2. Refresh prayer schedule & weather for selected city -> update widgets
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

                AsakaPrayerWidgetProvider.requestUpdate(applicationContext)
                AsakaNextPrayerWidgetProvider.requestUpdate(applicationContext)
                AsakaQuranWidgetProvider.requestUpdate(applicationContext)
            }
        } catch (e: Exception) {
            Log.w("ASAKA_SYNC", "Background prayer/widget refresh skipped: ${e.message}")
        }

        return Result.success()
    }

    companion object {
        private const val PERIODIC_WORK_NAME = "asaka_ziyo_periodic_sync_v5"

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
