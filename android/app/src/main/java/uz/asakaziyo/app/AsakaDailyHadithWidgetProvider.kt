package uz.asakaziyo.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

/**
 * ASAKA ZIYO v6.0.0 — Daily Hadith Home Screen AppWidget (6th Widget)
 */
class AsakaDailyHadithWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (id in appWidgetIds) updateAppWidget(context, appWidgetManager, id)
    }

    companion object {
        const val PREFS_NAME = AsakaDailyAyahWidgetProvider.PREFS_NAME
        const val KEY_HADITH_TEXT = "daily_hadith_text"
        const val KEY_HADITH_SOURCE = "daily_hadith_source"

        fun requestUpdate(context: Context) {
            val mgr = AppWidgetManager.getInstance(context)
            val ids = mgr.getAppWidgetIds(ComponentName(context, AsakaDailyHadithWidgetProvider::class.java))
            for (id in ids) updateAppWidget(context, mgr, id)
        }

        private fun updateAppWidget(context: Context, manager: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_asaka_daily_hadith)
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val text = prefs.getString(KEY_HADITH_TEXT, null)?.ifBlank { null }
                ?: "Sizlarning eng yaxshilaringiz Qurʼonni oʻrganib, uni boshqalarga oʻrgatganlaringizdir."
            val source = prefs.getString(KEY_HADITH_SOURCE, null)?.ifBlank { null }
                ?: "Imom Buxoriy rivoyati"

            views.setTextViewText(R.id.widget_daily_hadith_text, text)
            views.setTextViewText(R.id.widget_daily_hadith_source, source)

            val intent = Intent(context, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                putExtra("targetView", "hadith")
            }
            val pi = PendingIntent.getActivity(
                context,
                appWidgetId + 6000,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_daily_hadith_root, pi)
            manager.updateAppWidget(appWidgetId, views)
        }
    }
}
