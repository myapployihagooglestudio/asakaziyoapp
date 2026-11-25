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
 * ASAKA ZIYO — Global Prayer Times & Weather Home Screen AppWidget
 * Displays the user's currently selected city (Asaka MANUAL_ADMIN or any Uzbekistan/Global AUTO city),
 * next prayer indicator, 5 daily prayer times, date label (preventing silent stale display),
 * and current Open-Meteo temperature synced directly from the central backend via MainActivity.
 */
class AsakaPrayerWidgetProvider : AppWidgetProvider() {

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
        const val PREFS_NAME = "asaka_ziyo_prayer_prefs"
        const val KEY_SELECTED_LOCATION = "selected_location_json"
        const val KEY_WIDGET_SNAPSHOT = "widget_snapshot_json"
        const val KEY_WIDGET_UPDATED_AT = "widget_updated_at"

        fun requestUpdate(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val component = ComponentName(context, AsakaPrayerWidgetProvider::class.java)
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
            val views = RemoteViews(context.packageName, R.layout.widget_asaka_prayer)
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val rawSnapshot = prefs.getString(KEY_WIDGET_SNAPSHOT, null)

            var cityName = "Asaka"
            var sourceLabel = "ASAKA · MANUAL"
            var localDate = ""
            var nextPrayerLine = "Namoz vaqtlarini ko‘rish"
            var weatherLine = "Ob-havo yuklanmoqda"
            var fajr = "--:--"
            var dhuhr = "--:--"
            var asr = "--:--"
            var maghrib = "--:--"
            var isha = "--:--"

            if (!rawSnapshot.isNullOrBlank()) {
                try {
                    val obj = JSONObject(rawSnapshot)
                    cityName = obj.optString("cityName", "Asaka").ifBlank { "Asaka" }
                    val sourceMode = obj.optString("sourceMode", "MANUAL_ADMIN")
                    sourceLabel = if (sourceMode == "MANUAL_ADMIN") {
                        "RASMIY MANUAL"
                    } else {
                        "GLOBAL AUTO"
                    }
                    localDate = obj.optString("localDate", "")
                    fajr = obj.optString("fajr", "--:--")
                    dhuhr = obj.optString("dhuhr", "--:--")
                    asr = obj.optString("asr", "--:--")
                    maghrib = obj.optString("maghrib", "--:--")
                    isha = obj.optString("isha", "--:--")

                    val nextName = obj.optString("nextPrayerName", "")
                    val nextTime = obj.optString("nextPrayerTime", "")
                    nextPrayerLine = if (nextName.isNotBlank() && nextTime.isNotBlank()) {
                        "Keyingi: $nextName · $nextTime"
                    } else if (nextName.isNotBlank()) {
                        "Keyingi: $nextName"
                    } else {
                        "Asaka Ziyo · Namoz taqvimi"
                    }

                    val hasTemp = !obj.isNull("weatherTempC")
                    val condition = obj.optString("weatherCondition", "")
                    weatherLine = if (hasTemp) {
                        val tempRounded = Math.round(obj.optDouble("weatherTempC", 0.0))
                        if (condition.isNotBlank()) "${tempRounded}°C · $condition" else "${tempRounded}°C"
                    } else {
                        "Ob-havo: ilovani oching"
                    }
                } catch (_: Exception) {
                    // Use defaults if snapshot is malformed
                }
            }

            val titleLine = if (localDate.isNotBlank()) "$cityName · $localDate" else cityName
            views.setTextViewText(R.id.widget_city_title, titleLine)
            views.setTextViewText(R.id.widget_source_badge, sourceLabel)
            views.setTextViewText(R.id.widget_next_prayer, nextPrayerLine)
            views.setTextViewText(R.id.widget_weather_line, weatherLine)
            views.setTextViewText(R.id.widget_fajr_val, fajr)
            views.setTextViewText(R.id.widget_dhuhr_val, dhuhr)
            views.setTextViewText(R.id.widget_asr_val, asr)
            views.setTextViewText(R.id.widget_maghrib_val, maghrib)
            views.setTextViewText(R.id.widget_isha_val, isha)

            // Tap widget to launch Prayer Times screen inside MainActivity
            val launchIntent = Intent(context, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                putExtra("targetView", "prayer")
            }
            val pendingIntent = PendingIntent.getActivity(
                context,
                appWidgetId,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_prayer_root, pendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
