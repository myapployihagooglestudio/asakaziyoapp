package uz.asakaziyo.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import org.json.JSONObject

/**
 * ASAKA ZIYO v5.0.0 — Compact Next Prayer Countdown Home Screen AppWidget (2x1)
 * Reads the central prayer snapshot synced by MainActivity / AsakaOfflineSyncWorker
 * so Asaka MANUAL_ADMIN and all global AUTO cities stay 100% in sync.
 */
class AsakaNextPrayerWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        fun requestUpdate(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val component = ComponentName(context, AsakaNextPrayerWidgetProvider::class.java)
            val ids = manager.getAppWidgetIds(component)
            if (ids.isEmpty()) return
            for (id in ids) {
                updateAppWidget(context, manager, id)
            }
        }

        private fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val views = RemoteViews(context.packageName, R.layout.widget_asaka_next_prayer)
            val prefs = context.getSharedPreferences(
                AsakaPrayerWidgetProvider.PREFS_NAME,
                Context.MODE_PRIVATE
            )
            val rawSnapshot = prefs.getString(AsakaPrayerWidgetProvider.KEY_WIDGET_SNAPSHOT, null)

            var cityLine = "Asaka · Namoz"
            var nextName = "Keyingi namoz"
            var nextTime = "--:--"

            if (!rawSnapshot.isNullOrBlank()) {
                try {
                    val obj = JSONObject(rawSnapshot)
                    val cityName = obj.optString("cityName", "Asaka").ifBlank { "Asaka" }
                    val localDate = obj.optString("localDate", "")
                    cityLine = if (localDate.isNotBlank()) "$cityName · $localDate" else cityName
                    nextName = obj.optString("nextPrayerName", "Keyingi namoz").ifBlank { "Keyingi namoz" }
                    nextTime = obj.optString("nextPrayerTime", "--:--").ifBlank { "--:--" }
                } catch (_: Exception) {
                    // Fallback to safe defaults
                }
            }

            views.setTextViewText(R.id.widget_next_city, cityLine)
            views.setTextViewText(R.id.widget_next_name, nextName)
            views.setTextViewText(R.id.widget_next_time, nextTime)

            val launchIntent = Intent(context, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                putExtra("targetView", "prayer")
            }
            val pendingIntent = PendingIntent.getActivity(
                context,
                appWidgetId + 4000,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_next_prayer_root, pendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
