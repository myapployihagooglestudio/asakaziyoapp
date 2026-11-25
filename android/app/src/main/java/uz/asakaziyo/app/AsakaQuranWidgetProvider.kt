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
 * ASAKA ZIYO — Qur'on & Daily Goal Home Screen AppWidget (v4.1.0)
 *
 * Displays:
 * - "Qurʼonni davom ettirish" last read Surah & Ayah
 * - Daily reading / listening goal progress
 * - Quick launch buttons for Qur'on Reader and Daily Dhikr
 */
class AsakaQuranWidgetProvider : AppWidgetProvider() {

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
        const val PREFS_NAME = "asaka_ziyo_quran_widget_prefs"
        const val KEY_QURAN_SNAPSHOT = "quran_widget_snapshot_json"

        fun requestUpdate(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val component = ComponentName(context, AsakaQuranWidgetProvider::class.java)
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
            val views = RemoteViews(context.packageName, R.layout.widget_asaka_quran)
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val rawSnapshot = prefs.getString(KEY_QURAN_SNAPSHOT, null)

            var surahTitle = "Fotiha surasi · 1-oyat"
            var qariLine = "Qurʼonni davom ettirish"
            var goalLine = "Kunlik maqsad: 10 daqiqa · 0%"

            if (!rawSnapshot.isNullOrBlank()) {
                try {
                    val obj = JSONObject(rawSnapshot)
                    surahTitle = obj.optString("surahTitle", surahTitle).ifBlank { surahTitle }
                    qariLine = obj.optString("qariName", qariLine).ifBlank { qariLine }
                    val goalMinutes = obj.optInt("dailyGoalMinutes", 10)
                    val completedPct = obj.optInt("progressPercent", 0).coerceIn(0, 100)
                    goalLine = "Kunlik maqsad: ${goalMinutes} daqiqa · ${completedPct}%"
                } catch (_: Exception) {
                    // Fallback to defaults
                }
            }

            views.setTextViewText(R.id.widget_quran_surah, surahTitle)
            views.setTextViewText(R.id.widget_quran_qari, qariLine)
            views.setTextViewText(R.id.widget_quran_goal, goalLine)

            // Launch Qur'on tab
            val quranIntent = Intent(context, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                putExtra("targetView", "quran")
            }
            val quranPending = PendingIntent.getActivity(
                context,
                appWidgetId + 1000,
                quranIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_quran_root, quranPending)
            views.setOnClickPendingIntent(R.id.widget_btn_continue_quran, quranPending)

            // Launch Dhikr tab
            val dhikrIntent = Intent(context, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                putExtra("targetView", "dhikr")
            }
            val dhikrPending = PendingIntent.getActivity(
                context,
                appWidgetId + 2000,
                dhikrIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_btn_daily_dhikr, dhikrPending)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
