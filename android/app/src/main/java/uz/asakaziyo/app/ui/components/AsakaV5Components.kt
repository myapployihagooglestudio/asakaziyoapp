package uz.asakaziyo.app.ui.components

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.Book
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Headphones
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.Pause
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Repeat
import androidx.compose.material.icons.rounded.RepeatOne
import androidx.compose.material.icons.rounded.School
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Shuffle
import androidx.compose.material.icons.rounded.SkipNext
import androidx.compose.material.icons.rounded.SkipPrevious
import androidx.compose.material.icons.rounded.Timer
import androidx.compose.material.icons.rounded.WorkspacePremium
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import uz.asakaziyo.app.BuildConfig
import uz.asakaziyo.app.data.AsakaCatalogData
import uz.asakaziyo.app.data.FeatureCheckResult
import uz.asakaziyo.app.data.MediaPlaybackSnapshot
import uz.asakaziyo.app.data.QariProfile
import uz.asakaziyo.app.i18n.LocalAsakaStrings
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.graphicsLayer
import uz.asakaziyo.app.ui.theme.Asaka3DGeometricEmblem
import uz.asakaziyo.app.ui.theme.AsakaAudioWaveform
import uz.asakaziyo.app.ui.theme.AsakaGlassCard
import uz.asakaziyo.app.ui.theme.AsakaMotion
import uz.asakaziyo.app.ui.theme.LocalAsakaColors
import uz.asakaziyo.app.ui.theme.LocalReducedMotion

enum class AsakaMainTab(val route: String, val icon: ImageVector) {
    HOME("home", Icons.Rounded.Home),
    QURAN("quran", Icons.Rounded.Book),
    LEARN("learn", Icons.Rounded.School),
    AUDIO("audio", Icons.Rounded.Headphones),
    PROFILE("profile", Icons.Rounded.Person)
}

@Composable
fun AsakaV5BottomNavBar(
    currentTab: AsakaMainTab,
    onSelectTab: (AsakaMainTab) -> Unit
) {
    val palette = LocalAsakaColors.current
    val strings = LocalAsakaStrings.current
    val haptics = LocalHapticFeedback.current
    val reducedMotion = LocalReducedMotion.current

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .padding(horizontal = 14.dp, vertical = 8.dp)
    ) {
        Surface(
            color = palette.navBarSurface.copy(alpha = if (palette.isDark) 0.86f else 0.92f),
            shape = RoundedCornerShape(28.dp),
            border = BorderStroke(
                1.dp,
                Brush.linearGradient(
                    listOf(
                        Color.White.copy(alpha = if (palette.isDark) 0.34f else 0.80f),
                        palette.goldAccent.copy(alpha = 0.42f),
                        Color.White.copy(alpha = 0.12f)
                    )
                )
            ),
            shadowElevation = 14.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.verticalGradient(
                            listOf(
                                Color.White.copy(alpha = if (palette.isDark) 0.10f else 0.55f),
                                Color.Transparent
                            )
                        )
                    )
                    .padding(horizontal = 8.dp, vertical = 7.dp),
                horizontalArrangement = Arrangement.SpaceAround,
                verticalAlignment = Alignment.CenterVertically
            ) {
                AsakaMainTab.entries.forEach { tab ->
                    val selected = tab == currentTab
                    val label = when (tab) {
                        AsakaMainTab.HOME -> strings.navHome
                        AsakaMainTab.QURAN -> strings.navQuran
                        AsakaMainTab.LEARN -> strings.navLearn
                        AsakaMainTab.AUDIO -> strings.navAudio
                        AsakaMainTab.PROFILE -> strings.navProfile
                    }
                    val tint by animateColorAsState(
                        targetValue = if (selected) palette.goldAccent else palette.textMuted,
                        animationSpec = tween(if (reducedMotion) 0 else 220),
                        label = "tab_tint_${tab.route}"
                    )
                    val bg by animateColorAsState(
                        targetValue = if (selected) palette.goldSoftBg else Color.Transparent,
                        animationSpec = tween(if (reducedMotion) 0 else 220),
                        label = "tab_bg_${tab.route}"
                    )
                    val tabScale by animateFloatAsState(
                        targetValue = if (selected && !reducedMotion) 1.07f else 1f,
                        animationSpec = AsakaMotion.liquidGlassSpring(),
                        label = "tab_scale_${tab.route}"
                    )
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier
                            .graphicsLayer {
                                scaleX = tabScale
                                scaleY = tabScale
                            }
                            .clip(RoundedCornerShape(20.dp))
                            .background(bg)
                            .clickable {
                                haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                onSelectTab(tab)
                            }
                            .padding(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Icon(
                            imageVector = tab.icon,
                            contentDescription = label,
                            tint = tint,
                            modifier = Modifier.size(22.dp)
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = label,
                            color = tint,
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                            maxLines = 1
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun AsakaFloatingMiniPlayer(
    playback: MediaPlaybackSnapshot,
    onTogglePlay: () -> Unit,
    onExpand: () -> Unit
) {
    val palette = LocalAsakaColors.current
    val visible = playback.title.isNotBlank()
    AnimatedVisibility(
        visible = visible,
        enter = slideInVertically { it } + fadeIn(),
        exit = slideOutVertically { it } + fadeOut()
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 6.dp)
                .clip(RoundedCornerShape(18.dp))
                .clickable { onExpand() },
            shape = RoundedCornerShape(18.dp),
            color = palette.glassSurfaceElevated,
            border = BorderStroke(1.dp, palette.goldAccent.copy(alpha = 0.55f)),
            shadowElevation = 8.dp
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                AsakaAudioWaveform(isPlaying = playback.isPlaying, barCount = 5)
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = playback.title,
                        color = palette.textPrimary,
                        style = MaterialTheme.typography.titleSmall,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = "${playback.artist} · ${playback.speed}x",
                        color = palette.textSecondary,
                        style = MaterialTheme.typography.bodySmall,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                IconButton(onClick = onTogglePlay) {
                    Icon(
                        imageVector = if (playback.isPlaying) Icons.Rounded.Pause else Icons.Rounded.PlayArrow,
                        contentDescription = "Play/Pause",
                        tint = palette.goldAccent
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AsakaFullAudioPlayerSheet(
    playback: MediaPlaybackSnapshot,
    onDismiss: () -> Unit,
    onTogglePlay: () -> Unit,
    onPrevious: () -> Unit,
    onNext: () -> Unit,
    onSeek: (Long) -> Unit,
    onChangeSpeed: (Float) -> Unit,
    onCycleRepeat: () -> Unit,
    onToggleShuffle: () -> Unit,
    onSetSleepTimer: (Int) -> Unit
) {
    val palette = LocalAsakaColors.current
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val speeds = listOf(0.75f, 1.0f, 1.25f, 1.5f, 2.0f)
    val timers = listOf(0, 15, 30, 60)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = palette.navBarSurface,
        contentColor = palette.textPrimary
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 22.dp, vertical = 8.dp)
                .navigationBarsPadding(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "ASAKA ZIYO · MEDIA3 NATIVE PLAYER",
                color = palette.goldAccent,
                style = MaterialTheme.typography.labelMedium,
                letterSpacing = 1.2.sp
            )
            Spacer(modifier = Modifier.height(16.dp))

            // 3D Specular Islamic Geometric Emblem + Live Waveform
            Box(
                modifier = Modifier.size(152.dp),
                contentAlignment = Alignment.Center
            ) {
                Asaka3DGeometricEmblem(size = 152.dp, isActive = playback.isPlaying)
                AsakaAudioWaveform(isPlaying = playback.isPlaying, barCount = 9)
            }

            Spacer(modifier = Modifier.height(18.dp))
            Text(
                text = playback.title.ifBlank { "Qurʼoni Karim Tilovati" },
                style = MaterialTheme.typography.headlineSmall,
                color = palette.textPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = playback.artist.ifBlank { "ASAKA ZIYO Qorilar Kutubxonasi" },
                style = MaterialTheme.typography.bodyMedium,
                color = palette.textSecondary
            )

            Spacer(modifier = Modifier.height(18.dp))
            val duration = playback.durationMs.coerceAtLeast(1L)
            val position = playback.positionMs.coerceIn(0L, duration)
            Slider(
                value = position.toFloat(),
                onValueChange = { onSeek(it.toLong()) },
                valueRange = 0f..duration.toFloat(),
                colors = SliderDefaults.colors(
                    thumbColor = palette.goldAccent,
                    activeTrackColor = palette.goldAccent,
                    inactiveTrackColor = palette.luminousBorder
                )
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(formatDurationMs(position), style = MaterialTheme.typography.bodySmall, color = palette.textMuted)
                Text(formatDurationMs(playback.durationMs), style = MaterialTheme.typography.bodySmall, color = palette.textMuted)
            }

            Spacer(modifier = Modifier.height(14.dp))
            // Transport Controls
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onToggleShuffle) {
                    Icon(
                        Icons.Rounded.Shuffle,
                        contentDescription = "Shuffle",
                        tint = if (playback.shuffleEnabled) palette.goldAccent else palette.textMuted
                    )
                }
                IconButton(onClick = onPrevious) {
                    Icon(Icons.Rounded.SkipPrevious, contentDescription = "Previous", tint = palette.textPrimary, modifier = Modifier.size(32.dp))
                }
                Surface(
                    shape = CircleShape,
                    color = palette.goldAccent,
                    modifier = Modifier
                        .size(64.dp)
                        .clickable { onTogglePlay() }
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = if (playback.isPlaying) Icons.Rounded.Pause else Icons.Rounded.PlayArrow,
                            contentDescription = "Play/Pause",
                            tint = Color(0xFF031814),
                            modifier = Modifier.size(34.dp)
                        )
                    }
                }
                IconButton(onClick = onNext) {
                    Icon(Icons.Rounded.SkipNext, contentDescription = "Next", tint = palette.textPrimary, modifier = Modifier.size(32.dp))
                }
                IconButton(onClick = onCycleRepeat) {
                    Icon(
                        imageVector = if (playback.repeatMode == "one") Icons.Rounded.RepeatOne else Icons.Rounded.Repeat,
                        contentDescription = "Repeat",
                        tint = if (playback.repeatMode != "off") palette.goldAccent else palette.textMuted
                    )
                }
            }

            Spacer(modifier = Modifier.height(18.dp))
            // Speed & Sleep Timer Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    speeds.forEach { spd ->
                        val active = kotlin.math.abs(playback.speed - spd) < 0.05f
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = if (active) palette.goldSoftBg else Color.Transparent,
                            border = BorderStroke(1.dp, if (active) palette.goldAccent else palette.luminousBorder),
                            modifier = Modifier.clickable { onChangeSpeed(spd) }
                        ) {
                            Text(
                                text = "${spd}x",
                                color = if (active) palette.goldAccent else palette.textSecondary,
                                style = MaterialTheme.typography.labelMedium,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp)
                            )
                        }
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.Timer, contentDescription = "Sleep", tint = palette.goldAccent, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    val nextTimer = timers[(timers.indexOf(playback.sleepTimerMinutes) + 1) % timers.size]
                    TextButton(onClick = { onSetSleepTimer(nextTimer) }) {
                        Text(
                            text = if (playback.sleepTimerMinutes > 0) "${playback.sleepTimerMinutes} min" else "Taymer",
                            color = palette.goldAccent
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

private fun formatDurationMs(ms: Long): String {
    val totalSec = (ms / 1000L).coerceAtLeast(0L)
    val mins = totalSec / 60
    val secs = totalSec % 60
    return "%02d:%02d".format(mins, secs)
}

@Composable
fun AsakaGlobalSearchDialog(
    qaris: List<QariProfile>,
    onDismiss: () -> Unit,
    onOpenSurah: (Int) -> Unit,
    onSelectQari: (QariProfile) -> Unit,
    onOpenModule: (String) -> Unit
) {
    val palette = LocalAsakaColors.current
    val strings = LocalAsakaStrings.current
    var query by remember { mutableStateOf("") }
    val q = query.trim().lowercase()

    val matchedSurahs = remember(q) {
        if (q.isBlank()) AsakaCatalogData.allSurahs.take(6)
        else AsakaCatalogData.allSurahs.filter {
            it.nameUz.lowercase().contains(q) || it.nameAr.contains(q) || it.number.toString() == q
        }.take(10)
    }
    val matchedQaris = remember(q, qaris) {
        if (q.isBlank()) qaris.take(3)
        else qaris.filter { it.nameUz.lowercase().contains(q) || it.countryUz.lowercase().contains(q) }.take(5)
    }
    val matchedHadiths = remember(q) {
        if (q.isBlank()) emptyList()
        else AsakaCatalogData.sahihHadiths.filter {
            it.titleUz.lowercase().contains(q) || it.textUz.lowercase().contains(q)
        }
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            shape = RoundedCornerShape(24.dp),
            color = palette.navBarSurface,
            border = BorderStroke(1.dp, palette.luminousBorder)
        ) {
            Column(modifier = Modifier.padding(18.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Global Qidiruv", style = MaterialTheme.typography.titleMedium, color = palette.goldAccent)
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Rounded.Close, contentDescription = "Close", tint = palette.textSecondary)
                    }
                }
                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it },
                    placeholder = { Text(strings.globalSearch, color = palette.textMuted) },
                    leadingIcon = { Icon(Icons.Rounded.Search, contentDescription = null, tint = palette.goldAccent) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(12.dp))
                LazyColumn(
                    modifier = Modifier.height(340.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    item {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf("prayer" to "Namoz", "qibla" to "Qibla", "tasbeh" to "Tasbeh", "ai" to "AI Ustoz", "offline" to "Oflayn").forEach { (id, lbl) ->
                                Surface(
                                    shape = RoundedCornerShape(10.dp),
                                    color = palette.emeraldSoftBg,
                                    modifier = Modifier.clickable {
                                        onDismiss()
                                        onOpenModule(id)
                                    }
                                ) {
                                    Text(lbl, color = palette.emeraldAccent, style = MaterialTheme.typography.labelMedium, modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp))
                                }
                            }
                        }
                    }
                    items(matchedSurahs) { s ->
                        AsakaGlassCard(
                            cornerRadius = 14.dp,
                            onClick = {
                                onDismiss()
                                onOpenSurah(s.number)
                            }
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("${s.number}. ${s.nameUz} (${s.ayahCount} oyat)", color = palette.textPrimary, style = MaterialTheme.typography.titleSmall)
                                Text(s.nameAr, color = palette.goldAccent, style = MaterialTheme.typography.titleMedium)
                            }
                        }
                    }
                    items(matchedQaris) { qari ->
                        AsakaGlassCard(
                            cornerRadius = 14.dp,
                            onClick = {
                                onDismiss()
                                onSelectQari(qari)
                            }
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Rounded.Headphones, contentDescription = null, tint = palette.goldAccent, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("${qari.nameUz} · ${qari.styleUz}", color = palette.textPrimary, style = MaterialTheme.typography.bodyMedium)
                            }
                        }
                    }
                    items(matchedHadiths) { h ->
                        AsakaGlassCard(
                            cornerRadius = 14.dp,
                            onClick = {
                                onDismiss()
                                onOpenModule("hadith")
                            }
                        ) {
                            Column {
                                Text(h.titleUz, color = palette.goldAccent, style = MaterialTheme.typography.titleSmall)
                                Text(h.textUz, color = palette.textSecondary, style = MaterialTheme.typography.bodySmall, maxLines = 2, overflow = TextOverflow.Ellipsis)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun AsakaPremiumGateDialog(
    decision: FeatureCheckResult,
    onDismiss: () -> Unit,
    onGoToPremium: () -> Unit
) {
    val palette = LocalAsakaColors.current
    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(24.dp),
            color = palette.navBarSurface,
            border = BorderStroke(1.dp, palette.goldAccent)
        ) {
            Column(
                modifier = Modifier.padding(22.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(
                    imageVector = Icons.Rounded.WorkspacePremium,
                    contentDescription = null,
                    tint = palette.goldAccent,
                    modifier = Modifier.size(44.dp)
                )
                Spacer(modifier = Modifier.height(10.dp))
                Text("ASAKA ZIYO Premium", style = MaterialTheme.typography.headlineSmall, color = palette.goldAccent)
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = decision.messageUz.ifBlank { "Ushbu kengaytirilgan imkoniyat Premium obunada ochiladi." },
                    style = MaterialTheme.typography.bodyMedium,
                    color = palette.textPrimary
                )
                Spacer(modifier = Modifier.height(18.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedButton(onClick = onDismiss, modifier = Modifier.weight(1f)) {
                        Text("Yopish", color = palette.textSecondary)
                    }
                    Button(
                        onClick = {
                            onDismiss()
                            onGoToPremium()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = palette.goldAccent, contentColor = Color(0xFF031814)),
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Rounded.AutoAwesome, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Premiumga oʻtish")
                    }
                }
            }
        }
    }
}

@Composable
fun AsakaDeveloperAttributionFooter(modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val palette = LocalAsakaColors.current
    val strings = LocalAsakaStrings.current
    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 14.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "${strings.developerAttribution} · v${BuildConfig.VERSION_NAME}",
            style = MaterialTheme.typography.labelMedium,
            color = palette.goldAccent.copy(alpha = 0.78f),
            modifier = Modifier
                .clip(RoundedCornerShape(8.dp))
                .clickable {
                    try {
                        context.startActivity(
                            Intent(Intent.ACTION_VIEW, Uri.parse(BuildConfig.DEVELOPER_TELEGRAM_URL))
                        )
                    } catch (_: Exception) {}
                }
                .padding(horizontal = 10.dp, vertical = 4.dp)
        )
    }
}
