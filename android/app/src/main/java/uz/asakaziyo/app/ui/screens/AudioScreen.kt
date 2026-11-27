package uz.asakaziyo.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.QueueMusic
import androidx.compose.material.icons.rounded.CloudDone
import androidx.compose.material.icons.rounded.CloudDownload
import androidx.compose.material.icons.rounded.Pause
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import uz.asakaziyo.app.data.QariProfile
import uz.asakaziyo.app.data.QariSurahTrack
import uz.asakaziyo.app.ui.theme.AsakaGlassCard
import uz.asakaziyo.app.ui.theme.AsakaShimmerBox
import uz.asakaziyo.app.ui.theme.LocalAsakaColors
import uz.asakaziyo.app.viewmodel.AsakaUiState

@Composable
fun AudioScreen(
    state: AsakaUiState,
    onSelectQari: (QariProfile) -> Unit,
    onPlayTrack: (QariSurahTrack) -> Unit,
    onTogglePlay: () -> Unit,
    onDownloadTrack: (QariSurahTrack) -> Unit,
    onOpenFullPlayer: () -> Unit
) {
    val palette = LocalAsakaColors.current
    var subTab by remember { mutableIntStateOf(0) } // 0=Qorilar & 114 Sura, 1=Pleylistlar

    Column(modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 12.dp)) {
        Text("Qurʼon Audio & Qorilar", style = MaterialTheme.typography.headlineSmall, color = palette.textPrimary)
        Text("Media3 fon pleeri · Lock Screen & Bluetooth boshqaruvi", style = MaterialTheme.typography.bodySmall, color = palette.textSecondary)
        Spacer(modifier = Modifier.height(10.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            listOf("Qorilar (114 Sura)", "Pleylistlar (${state.playlists.size})").forEachIndexed { idx, lbl ->
                val active = subTab == idx
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = if (active) palette.goldSoftBg else palette.glassSurface,
                    border = BorderStroke(1.dp, if (active) palette.goldAccent else palette.luminousBorder),
                    modifier = Modifier.weight(1f).clickable { subTab = idx }
                ) {
                    Text(lbl, color = if (active) palette.goldAccent else palette.textSecondary, style = MaterialTheme.typography.labelMedium, textAlign = TextAlign.Center, modifier = Modifier.padding(vertical = 9.dp))
                }
            }
        }
        Spacer(modifier = Modifier.height(10.dp))

        if (subTab == 0) {
            if (state.isLoadingQaris && state.qaris.isEmpty()) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    repeat(4) { AsakaShimmerBox(modifier = Modifier.fillMaxWidth().height(64.dp)) }
                }
            } else {
                // Horizontal Qari Selector
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(state.qaris, key = { it.id }) { qari ->
                        val selected = state.selectedQari?.id == qari.id
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = if (selected) palette.goldSoftBg else palette.glassSurface,
                            border = BorderStroke(1.dp, if (selected) palette.goldAccent else palette.luminousBorder),
                            modifier = Modifier.clickable { onSelectQari(qari) }
                        ) {
                            Column(modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp)) {
                                Text(qari.nameUz, style = MaterialTheme.typography.titleSmall, color = if (selected) palette.goldAccent else palette.textPrimary, fontWeight = FontWeight.Bold)
                                val readyText = when {
                                    qari.isCompleteReady || !qari.externalSurahBaseUrl.isNullOrBlank() -> "114/114 sura tayyor"
                                    qari.publishedSurahsCount > 0 -> "${qari.publishedSurahsCount}/114 sura tayyor"
                                    else -> "0/114 (yuklanmoqda)"
                                }
                                Text("${qari.countryUz} · $readyText", style = MaterialTheme.typography.labelMedium, color = palette.textSecondary)
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))

                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp), contentPadding = PaddingValues(bottom = 120.dp)) {
                    items(state.qariTracks, key = { it.trackKey }) { track ->
                        val isCurrent = state.playback.trackKey == track.trackKey
                        val dlTask = state.downloadTasks[track.trackKey]
                        AsakaGlassCard(
                            cornerRadius = 16.dp,
                            borderColor = if (isCurrent) palette.goldAccent else null,
                            onClick = {
                                if (track.isAvailable && track.streamUrl.isNotBlank()) {
                                    if (isCurrent) onOpenFullPlayer() else onPlayTrack(track)
                                }
                            }
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                    Surface(shape = RoundedCornerShape(10.dp), color = palette.goldSoftBg) {
                                        Text("${track.surahNumber}", color = palette.goldAccent, style = MaterialTheme.typography.labelMedium, modifier = Modifier.padding(horizontal = 9.dp, vertical = 6.dp))
                                    }
                                    Spacer(modifier = Modifier.width(10.dp))
                                    Column {
                                        Text(track.surahNameUz, style = MaterialTheme.typography.titleSmall, color = palette.textPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                        val subLabel = when {
                                            !track.isAvailable || track.streamUrl.isBlank() -> "Hali yuklanmagan · ${track.qariName}"
                                            dlTask?.status == "DOWNLOADING" -> "Yuklanmoqda: ${dlTask.progressPercent}%"
                                            track.isDownloadedOffline -> "Oflayn tayyor · ${track.qariName}"
                                            track.isServerHosted -> "Doimiy Server MP3 (v${track.version}) · ${track.qariName}"
                                            else -> track.qariName
                                        }
                                        Text(subLabel, style = MaterialTheme.typography.labelMedium, color = if (track.isDownloadedOffline) palette.emeraldAccent else palette.textSecondary, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                    }
                                }
                                if (track.isAvailable && track.streamUrl.isNotBlank()) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        IconButton(onClick = { onDownloadTrack(track) }) {
                                            Icon(
                                                imageVector = if (track.isDownloadedOffline) Icons.Rounded.CloudDone else Icons.Rounded.CloudDownload,
                                                contentDescription = "Download",
                                                tint = if (track.isDownloadedOffline) palette.emeraldAccent else palette.textMuted,
                                                modifier = Modifier.size(19.dp)
                                            )
                                        }
                                        IconButton(onClick = { if (isCurrent) onTogglePlay() else onPlayTrack(track) }) {
                                            Icon(
                                                imageVector = if (isCurrent && state.playback.isPlaying) Icons.Rounded.Pause else Icons.Rounded.PlayArrow,
                                                contentDescription = "Play",
                                                tint = palette.goldAccent
                                            )
                                        }
                                    }
                                } else {
                                    Text("Kutilmoqda", style = MaterialTheme.typography.labelMedium, color = palette.textMuted)
                                }
                            }
                        }
                    }
                }
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp), contentPadding = PaddingValues(bottom = 120.dp)) {
                items(state.playlists, key = { it.id }) { pl ->
                    AsakaGlassCard(cornerRadius = 16.dp, onClick = {
                        val targetTrack = state.qariTracks.firstOrNull { it.surahNumber == pl.firstSurahNumber }
                            ?: state.qariTracks.firstOrNull()
                        if (targetTrack != null) onPlayTrack(targetTrack)
                    }) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.AutoMirrored.Rounded.QueueMusic, contentDescription = null, tint = palette.goldAccent, modifier = Modifier.size(26.dp))
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(pl.titleUz, style = MaterialTheme.typography.titleSmall, color = palette.textPrimary)
                                Text(pl.descriptionUz.ifBlank { "${pl.trackCount} ta sura" }, style = MaterialTheme.typography.bodySmall, color = palette.textSecondary)
                            }
                            Text(if (pl.isOfficial) "RASMIY" else "SHAXSIY", style = MaterialTheme.typography.labelMedium, color = palette.emeraldAccent)
                        }
                    }
                }
            }
        }
    }
}
