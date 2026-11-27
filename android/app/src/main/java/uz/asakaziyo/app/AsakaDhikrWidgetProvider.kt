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
 * ASAKA ZIYO v5.0.0 — Daily Dhikr & Qur'an Goal Home Screen AppWidget (4th Widget)
 */
class AsakaDhikrWidgetProvider : AppWidgetProvider() {

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
            val component = ComponentName(context, AsakaDhikrWidgetProvider::class.java)
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
            val views = RemoteViews(context.packageName, R.layout.widget_asaka_dhikr)
            val prefs = context.getSharedPreferences(AsakaQuranWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE)
            val raw = prefs.getString(AsakaQuranWidgetProvider.KEY_QURAN_SNAPSHOT, null)

            var goalText = "Kunlik Qurʼon: 0 / 15 daqiqa"
            var dhikrText = "Subhanalloh · Bugungi zikr: 0"
            if (!raw.isNullOrBlank()) {
                try {
                    val obj = JSONObject(raw)
                    val goal = obj.optInt("dailyGoalMinutes", 15)
                    val completed = obj.optInt("completedMinutes", 0)
                    val tasbeh = obj.optInt("tasbehToday", 0)
                    goalText = "Kunlik Qurʼon: $completed / $goal daqiqa"
                    dhikrText = "Kunlik zikr: $tasbeh marta · Tasbehni davom ettiring"
                } catch (_: Exception) {}
            }

            views.setTextViewText(R.id.widget_dhikr_goal, goalText)
            views.setTextViewText(R.id.widget_dhikr_counter, dhikrText)

            val launchIntent = Intent(context, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                putExtra("targetView", "tasbeh")
            }
            val pendingIntent = PendingIntent.getActivity(
                context,
                appWidgetId + 5000,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_dhikr_root, pendingIntent)
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
