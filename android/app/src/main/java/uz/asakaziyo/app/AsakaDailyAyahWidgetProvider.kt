package uz.asakaziyo.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

/**
 * ASAKA ZIYO v6.0.0 — Daily Ayah Home Screen AppWidget (5th Widget)
 */
class AsakaDailyAyahWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (id in appWidgetIds) updateAppWidget(context, appWidgetManager, id)
    }

    companion object {
        const val PREFS_NAME = "asaka_ziyo_wisdom_widgets_v6"
        const val KEY_AYAH_TEXT = "daily_ayah_text"
        const val KEY_AYAH_REF = "daily_ayah_ref"

        fun requestUpdate(context: Context) {
            val mgr = AppWidgetManager.getInstance(context)
            val ids = mgr.getAppWidgetIds(ComponentName(context, AsakaDailyAyahWidgetProvider::class.java))
            for (id in ids) updateAppWidget(context, mgr, id)
        }

        private fun updateAppWidget(context: Context, manager: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_asaka_daily_ayah)
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val text = prefs.getString(KEY_AYAH_TEXT, null)?.ifBlank { null }
                ?: "Albatta, qiyinchilik bilan birga yengillik bordir."
            val ref = prefs.getString(KEY_AYAH_REF, null)?.ifBlank { null }
                ?: "Sharh surasi, 5–6-oyat"

            views.setTextViewText(R.id.widget_daily_ayah_text, text)
            views.setTextViewText(R.id.widget_daily_ayah_ref, ref)

            val intent = Intent(context, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                putExtra("targetView", "quran")
            }
            val pi = PendingIntent.getActivity(
                context,
                appWidgetId + 5000,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_daily_ayah_root, pi)
            manager.updateAppWidget(appWidgetId, views)
        }
    }
}
