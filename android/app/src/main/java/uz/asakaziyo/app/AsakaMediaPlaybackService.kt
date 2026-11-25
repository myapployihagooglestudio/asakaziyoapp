package uz.asakaziyo.app

import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import java.io.File

/**
 * ASAKA ZIYO — Native Media3 ExoPlayer Background Playback Service (v4.1.0)
 *
 * Features:
 * - Uninterrupted lock-screen & background Qur'on recitation and Adhan playback
 * - Playback speed control (0.5x – 2.0x)
 * - Repeat modes (OFF / ONE / ALL)
 * - Sleep timer (auto-pause after N minutes)
 * - Rich MediaMetadata (Qari name + Surah title) for lock screen & Bluetooth cars
 * - Offline-first file playback support when local cached MP3/M4A/OGG exists
 * - Full AudioFocus & automatic pause when headphones disconnect (`handleAudioBecomingNoisy`)
 */
class AsakaMediaPlaybackService : MediaSessionService() {
    private var mediaSession: MediaSession? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private var sleepTimerRunnable: Runnable? = null

    override fun onCreate() {
        super.onCreate()
        val audioAttributes = AudioAttributes.Builder()
            .setUsage(C.USAGE_MEDIA)
            .setContentType(C.AUDIO_CONTENT_TYPE_SPEECH)
            .build()

        val player = ExoPlayer.Builder(this)
            .setAudioAttributes(audioAttributes, true)
            .setHandleAudioBecomingNoisy(true)
            .build()

        mediaSession = MediaSession.Builder(this, player).build()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        super.onStartCommand(intent, flags, startId)
        val player = mediaSession?.player ?: return START_STICKY
        when (intent?.action) {
            ACTION_PLAY_AUDIO -> {
                val url = intent.getStringExtra(EXTRA_AUDIO_URL).orEmpty().trim()
                val localPath = intent.getStringExtra(EXTRA_LOCAL_PATH).orEmpty().trim()
                val title = intent.getStringExtra(EXTRA_TITLE).orEmpty().ifBlank { "Qurʼoni Karim" }
                val artist = intent.getStringExtra(EXTRA_ARTIST).orEmpty().ifBlank { "ASAKA ZIYO" }
                val speed = intent.getFloatExtra(EXTRA_SPEED, 1.0f).coerceIn(0.5f, 2.0f)

                val mediaUri = when {
                    localPath.isNotBlank() && File(localPath).exists() -> Uri.fromFile(File(localPath))
                    url.startsWith("https://") || url.startsWith("http://") -> Uri.parse(url)
                    else -> null
                }

                if (mediaUri != null) {
                    val metadata = MediaMetadata.Builder()
                        .setTitle(title)
                        .setArtist(artist)
                        .setAlbumTitle("ASAKA ZIYO — Qurʼon Ekotizimi")
                        .build()
                    val item = MediaItem.Builder()
                        .setUri(mediaUri)
                        .setMediaMetadata(metadata)
                        .build()
                    player.setMediaItem(item)
                    player.playbackParameters = PlaybackParameters(speed)
                    player.prepare()
                    player.playWhenReady = true
                }
            }
            ACTION_PAUSE -> {
                player.playWhenReady = false
            }
            ACTION_RESUME -> {
                player.playWhenReady = true
            }
            ACTION_SET_SPEED -> {
                val speed = intent.getFloatExtra(EXTRA_SPEED, 1.0f).coerceIn(0.5f, 2.0f)
                player.playbackParameters = PlaybackParameters(speed)
            }
            ACTION_SET_REPEAT_MODE -> {
                val mode = intent.getStringExtra(EXTRA_REPEAT_MODE).orEmpty().lowercase()
                player.repeatMode = when (mode) {
                    "one" -> Player.REPEAT_MODE_ONE
                    "all" -> Player.REPEAT_MODE_ALL
                    else -> Player.REPEAT_MODE_OFF
                }
            }
            ACTION_SET_SLEEP_TIMER -> {
                val minutes = intent.getIntExtra(EXTRA_SLEEP_MINUTES, 0)
                cancelSleepTimer()
                if (minutes > 0) {
                    val runnable = Runnable {
                        mediaSession?.player?.playWhenReady = false
                    }
                    sleepTimerRunnable = runnable
                    mainHandler.postDelayed(runnable, minutes * 60_000L)
                }
            }
        }
        return START_STICKY
    }

    private fun cancelSleepTimer() {
        sleepTimerRunnable?.let { mainHandler.removeCallbacks(it) }
        sleepTimerRunnable = null
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? {
        return mediaSession
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        val player = mediaSession?.player
        if (player == null || !player.playWhenReady || player.mediaItemCount == 0) {
            stopSelf()
        }
    }

    override fun onDestroy() {
        cancelSleepTimer()
        mediaSession?.run {
            player.release()
            release()
            mediaSession = null
        }
        super.onDestroy()
    }

    companion object {
        const val ACTION_PLAY_AUDIO = "uz.asakaziyo.app.action.PLAY_AUDIO"
        const val ACTION_PAUSE = "uz.asakaziyo.app.action.PAUSE"
        const val ACTION_RESUME = "uz.asakaziyo.app.action.RESUME"
        const val ACTION_SET_SPEED = "uz.asakaziyo.app.action.SET_SPEED"
        const val ACTION_SET_REPEAT_MODE = "uz.asakaziyo.app.action.SET_REPEAT_MODE"
        const val ACTION_SET_SLEEP_TIMER = "uz.asakaziyo.app.action.SET_SLEEP_TIMER"

        const val EXTRA_AUDIO_URL = "extra_audio_url"
        const val EXTRA_LOCAL_PATH = "extra_local_path"
        const val EXTRA_TITLE = "extra_title"
        const val EXTRA_ARTIST = "extra_artist"
        const val EXTRA_SPEED = "extra_speed"
        const val EXTRA_REPEAT_MODE = "extra_repeat_mode"
        const val EXTRA_SLEEP_MINUTES = "extra_sleep_minutes"
    }
}
