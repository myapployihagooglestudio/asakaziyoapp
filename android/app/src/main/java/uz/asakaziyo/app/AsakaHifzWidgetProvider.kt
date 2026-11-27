package uz.asakaziyo.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

/**
 * ASAKA ZIYO v6.0.0 — Hifz & Muroja'a Progress Home Screen AppWidget (7th Widget)
 */
class AsakaHifzWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (id in appWidgetIds) updateAppWidget(context, appWidgetManager, id)
    }

    companion object {
        const val PREFS_NAME = "asaka_ziyo_hifz_widget_v6"
        const val KEY_HIFZ_COUNT = "hifz_count"
        const val KEY_HIFZ_AVG_MASTERY = "hifz_avg_mastery"
        const val KEY_HIFZ_LATEST = "hifz_latest"

        fun requestUpdate(context: Context) {
            val mgr = AppWidgetManager.getInstance(context)
            val ids = mgr.getAppWidgetIds(ComponentName(context, AsakaHifzWidgetProvider::class.java))
            for (id in ids) updateAppWidget(context, mgr, id)
        }

        private fun updateAppWidget(context: Context, manager: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_asaka_hifz)
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val count = prefs.getInt(KEY_HIFZ_COUNT, 0)
            val avg = prefs.getInt(KEY_HIFZ_AVG_MASTERY, 0).coerceIn(0, 100)
            val latest = prefs.getString(KEY_HIFZ_LATEST, null)?.ifBlank { null }
                ?: "Hifz va Murojaʼani boshlang"

            views.setTextViewText(R.id.widget_hifz_percent, "$avg%")
            views.setTextViewText(R.id.widget_hifz_latest, latest)
            views.setTextViewText(R.id.widget_hifz_summary, "$count ta boʻlim · Murojaʼaga tayyor")

            val intent = Intent(context, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                putExtra("targetView", "hifz")
            }
            val pi = PendingIntent.getActivity(
                context,
                appWidgetId + 7000,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_hifz_root, pi)
            manager.updateAppWidget(appWidgetId, views)
        }
    }
}
