package uz.asakaziyo.app

import android.annotation.SuppressLint
import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService

/**
 * ASAKA ZIYO v6.0.0 — 5 Native Android Quick Settings Tiles
 *
 * Allows users to launch Tasbeh, Qur'on Mushaf, Qur'on Audio, Namoz Vaqtlari,
 * and Qibla Compass directly from the Android Quick Settings shade (API 24–36).
 */
abstract class BaseAsakaQuickTileService(
    private val targetView: String,
    private val tileSubtitle: String
) : TileService() {

    override fun onStartListening() {
        super.onStartListening()
        qsTile?.apply {
            state = Tile.STATE_ACTIVE
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                subtitle = tileSubtitle
            }
            updateTile()
        }
    }

    @SuppressLint("StartActivityAndCollapseDeprecated")
    override fun onClick() {
        super.onClick()
        val intent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            putExtra("targetView", targetView)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            val pi = PendingIntent.getActivity(
                this,
                targetView.hashCode(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            startActivityAndCollapse(pi)
        } else {
            @Suppress("DEPRECATION")
            startActivityAndCollapse(intent)
        }
    }
}

class AsakaTasbehTileService : BaseAsakaQuickTileService("tasbeh", "Zikr va Tasbeh")
class AsakaQuranTileService : BaseAsakaQuickTileService("quran", "Madina Mushafi")
class AsakaAudioTileService : BaseAsakaQuickTileService("audio", "Qorilar MP3")
class AsakaPrayerTileService : BaseAsakaQuickTileService("prayer", "Namoz vaqti")
class AsakaQiblaTileService : BaseAsakaQuickTileService("qibla", "Qibla 241°")
