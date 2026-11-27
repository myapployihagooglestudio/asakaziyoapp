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
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import uz.asakaziyo.app.data.MediaPlaybackSnapshot
import java.io.File

/**
 * ASAKA ZIYO v5.0.0 — Native Media3 ExoPlayer Background Playback Service
 *
 * Exposes reactive StateFlow<MediaPlaybackSnapshot> directly to Jetpack Compose Mini Player
 * & Full-Screen Audio Player while providing uninterrupted Lock Screen, Notification, Bluetooth,
 * AudioFocus, Headphone-Disconnect Pause, Seek, Speed (0.5x–2.0x), Repeat, Shuffle & Sleep Timer.
 */
class AsakaMediaPlaybackService : MediaSessionService() {
    private var mediaSession: MediaSession? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private var sleepTimerRunnable: Runnable? = null
    private var progressPollerRunnable: Runnable? = null

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

        player.addListener(object : Player.Listener {
            override fun onIsPlayingChanged(isPlaying: Boolean) {
                syncStateFromPlayer(player)
                if (isPlaying) startProgressPoller(player) else stopProgressPoller()
            }

            override fun onPlaybackStateChanged(playbackState: Int) {
                syncStateFromPlayer(player)
            }
        })

        mediaSession = MediaSession.Builder(this, player).build()
    }

    private fun startProgressPoller(player: Player) {
        stopProgressPoller()
        val runnable = object : Runnable {
            override fun run() {
                syncStateFromPlayer(player)
                if (player.isPlaying) {
                    mainHandler.postDelayed(this, 500L)
                }
            }
        }
        progressPollerRunnable = runnable
        mainHandler.post(runnable)
    }

    private fun stopProgressPoller() {
        progressPollerRunnable?.let { mainHandler.removeCallbacks(it) }
        progressPollerRunnable = null
    }

    private fun syncStateFromPlayer(player: Player) {
        val dur = player.duration.takeIf { it > 0 && it != C.TIME_UNSET } ?: 0L
        val pos = player.currentPosition.coerceAtLeast(0L)
        _playbackState.update { current ->
            current.copy(
                isPlaying = player.isPlaying,
                positionMs = pos,
                durationMs = dur,
                speed = player.playbackParameters.speed,
                shuffleEnabled = player.shuffleModeEnabled,
                repeatMode = when (player.repeatMode) {
                    Player.REPEAT_MODE_ONE -> "one"
                    Player.REPEAT_MODE_ALL -> "all"
                    else -> "off"
                }
            )
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        super.onStartCommand(intent, flags, startId)
        val player = mediaSession?.player ?: return START_STICKY
        when (intent?.action) {
            ACTION_PLAY_AUDIO -> {
                val trackKey = intent.getStringExtra(EXTRA_TRACK_KEY).orEmpty().trim()
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
                    _playbackState.update {
                        it.copy(
                            trackKey = trackKey.ifBlank { title },
                            title = title,
                            artist = artist,
                            isPlaying = true,
                            positionMs = 0L,
                            speed = speed
                        )
                    }
                    startProgressPoller(player)
                }
            }
            ACTION_PAUSE -> {
                player.playWhenReady = false
                syncStateFromPlayer(player)
            }
            ACTION_RESUME -> {
                player.playWhenReady = true
                syncStateFromPlayer(player)
            }
            ACTION_SEEK_TO -> {
                val targetMs = intent.getLongExtra(EXTRA_POSITION_MS, 0L).coerceAtLeast(0L)
                player.seekTo(targetMs)
                syncStateFromPlayer(player)
            }
            ACTION_SET_SPEED -> {
                val speed = intent.getFloatExtra(EXTRA_SPEED, 1.0f).coerceIn(0.5f, 2.0f)
                player.playbackParameters = PlaybackParameters(speed)
                syncStateFromPlayer(player)
            }
            ACTION_SET_REPEAT_MODE -> {
                val mode = intent.getStringExtra(EXTRA_REPEAT_MODE).orEmpty().lowercase()
                player.repeatMode = when (mode) {
                    "one" -> Player.REPEAT_MODE_ONE
                    "all" -> Player.REPEAT_MODE_ALL
                    else -> Player.REPEAT_MODE_OFF
                }
                syncStateFromPlayer(player)
            }
            ACTION_SET_SHUFFLE -> {
                val enabled = intent.getBooleanExtra(EXTRA_SHUFFLE, false)
                player.shuffleModeEnabled = enabled
                syncStateFromPlayer(player)
            }
            ACTION_SET_SLEEP_TIMER -> {
                val minutes = intent.getIntExtra(EXTRA_SLEEP_MINUTES, 0)
                cancelSleepTimer()
                _playbackState.update { it.copy(sleepTimerMinutes = minutes.coerceAtLeast(0)) }
                if (minutes > 0) {
                    val runnable = Runnable {
                        mediaSession?.player?.playWhenReady = false
                        _playbackState.update { it.copy(sleepTimerMinutes = 0, isPlaying = false) }
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
        stopProgressPoller()
        cancelSleepTimer()
        mediaSession?.run {
            player.release()
            release()
            mediaSession = null
        }
        super.onDestroy()
    }

    companion object {
        private val _playbackState = MutableStateFlow(MediaPlaybackSnapshot())
        val playbackState: StateFlow<MediaPlaybackSnapshot> = _playbackState.asStateFlow()

        const val ACTION_PLAY_AUDIO = "uz.asakaziyo.app.action.PLAY_AUDIO"
        const val ACTION_PAUSE = "uz.asakaziyo.app.action.PAUSE"
        const val ACTION_RESUME = "uz.asakaziyo.app.action.RESUME"
        const val ACTION_SEEK_TO = "uz.asakaziyo.app.action.SEEK_TO"
        const val ACTION_SET_SPEED = "uz.asakaziyo.app.action.SET_SPEED"
        const val ACTION_SET_REPEAT_MODE = "uz.asakaziyo.app.action.SET_REPEAT_MODE"
        const val ACTION_SET_SHUFFLE = "uz.asakaziyo.app.action.SET_SHUFFLE"
        const val ACTION_SET_SLEEP_TIMER = "uz.asakaziyo.app.action.SET_SLEEP_TIMER"

        const val EXTRA_TRACK_KEY = "extra_track_key"
        const val EXTRA_AUDIO_URL = "extra_audio_url"
        const val EXTRA_LOCAL_PATH = "extra_local_path"
        const val EXTRA_TITLE = "extra_title"
        const val EXTRA_ARTIST = "extra_artist"
        const val EXTRA_POSITION_MS = "extra_position_ms"
        const val EXTRA_SPEED = "extra_speed"
        const val EXTRA_REPEAT_MODE = "extra_repeat_mode"
        const val EXTRA_SHUFFLE = "extra_shuffle"
        const val EXTRA_SLEEP_MINUTES = "extra_sleep_minutes"
    }
}
