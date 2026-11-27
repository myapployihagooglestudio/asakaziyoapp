package uz.asakaziyo.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.MenuBook
import androidx.compose.material.icons.rounded.Apps
import androidx.compose.material.icons.rounded.ArrowDownward
import androidx.compose.material.icons.rounded.ArrowUpward
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.Campaign
import androidx.compose.material.icons.rounded.CloudDone
import androidx.compose.material.icons.rounded.Explore
import androidx.compose.material.icons.rounded.Forum
import androidx.compose.material.icons.rounded.Headphones
import androidx.compose.material.icons.rounded.LibraryBooks
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.NotificationsActive
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Quiz
import androidx.compose.material.icons.rounded.School
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.TouchApp
import androidx.compose.material.icons.rounded.Tune
import androidx.compose.material.icons.rounded.WorkspacePremium
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.asakaziyo.app.data.AsakaCatalogData
import uz.asakaziyo.app.i18n.LocalAsakaStrings
import uz.asakaziyo.app.ui.components.AsakaDeveloperAttributionFooter
import uz.asakaziyo.app.ui.theme.AsakaGlassCard
import uz.asakaziyo.app.ui.theme.AsakaProgressRing
import uz.asakaziyo.app.ui.theme.AsakaShimmerBox
import uz.asakaziyo.app.ui.theme.LocalAsakaColors
import uz.asakaziyo.app.viewmodel.AsakaUiState
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    state: AsakaUiState,
    onOpenSearch: () -> Unit,
    onOpenModule: (String) -> Unit,
    onContinueQuran: (Int) -> Unit,
    onLogMinutes: () -> Unit,
    onOpenAudio: () -> Unit,
    onOpenLearn: () -> Unit,
    onOpenPremium: () -> Unit,
    onToggleBlock: (String, Boolean) -> Unit,
    onMoveBlock: (String, Int) -> Unit
) {
    val palette = LocalAsakaColors.current
    val strings = LocalAsakaStrings.current
    var showCustomizeSheet by remember { mutableStateOf(false) }

    val todayLabel = remember { SimpleDateFormat("d MMMM yyyy", Locale.getDefault()).format(Date()) }
    val dayIndex = remember { (System.currentTimeMillis() / 86_400_000L).toInt() }
    val todayHadith = AsakaCatalogData.sahihHadiths[dayIndex % AsakaCatalogData.sahihHadiths.size]
    val todayDua = AsakaCatalogData.authenticDuas[dayIndex % AsakaCatalogData.authenticDuas.size]

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // 1. Personal Spatial Header
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .clip(CircleShape)
                            .background(palette.goldSoftBg),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = state.settings.displayName.take(1).uppercase(),
                            color = palette.goldAccent,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = "${strings.greeting}, ${state.settings.displayName}",
                            style = MaterialTheme.typography.titleMedium,
                            color = palette.textPrimary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        val hijri = state.prayerSchedule?.hijriDate?.takeIf { it.isNotBlank() }
                        Text(
                            text = if (hijri != null) "$hijri · $todayLabel" else todayLabel,
                            style = MaterialTheme.typography.bodySmall,
                            color = palette.textSecondary
                        )
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    val unread = state.centralDb.notifications.count { it.id !in state.readNotificationIds }
                    IconButton(onClick = { onOpenModule("notifications") }) {
                        Icon(
                            Icons.Rounded.Notifications,
                            contentDescription = "Notifications",
                            tint = if (unread > 0) palette.emeraldAccent else palette.textSecondary
                        )
                    }
                    IconButton(onClick = onOpenSearch) {
                        Icon(Icons.Rounded.Search, contentDescription = "Search", tint = palette.goldAccent)
                    }
                    IconButton(onClick = { showCustomizeSheet = true }) {
                        Icon(Icons.Rounded.Tune, contentDescription = strings.customizeHome, tint = palette.textSecondary)
                    }
                }
            }
        }

        // 1.5 Admin-Controlled Real-Time Global Banner (Zero-Rebuild Sync!)
        if (state.adminHomeConfig.bannerVisible && state.adminHomeConfig.bannerTitleUz.isNotBlank()) {
            item(key = "admin_global_banner") {
                AsakaGlassCard(
                    elevated = true,
                    cornerRadius = 18.dp,
                    borderColor = palette.emeraldAccent,
                    onClick = { onOpenModule(state.adminHomeConfig.bannerCtaModule.ifBlank { "announcements" }) }
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Icon(Icons.Rounded.Campaign, contentDescription = null, tint = palette.emeraldAccent)
                        Column(modifier = Modifier.weight(1f)) {
                            Text(state.adminHomeConfig.bannerTitleUz, style = MaterialTheme.typography.titleSmall, color = palette.goldAccent)
                            if (state.adminHomeConfig.bannerBodyUz.isNotBlank()) {
                                Text(state.adminHomeConfig.bannerBodyUz, style = MaterialTheme.typography.bodySmall, color = palette.textPrimary, maxLines = 2, overflow = TextOverflow.Ellipsis)
                            }
                        }
                    }
                }
            }
        }

        // 2. Unified Premium Status Banner (Subtle for Premium, Clean CTA for Free)
        item {
            val isPrem = state.subscription?.isPremium == true
            AsakaGlassCard(
                cornerRadius = 18.dp,
                borderColor = if (isPrem) palette.goldAccent else palette.luminousBorder,
                onClick = onOpenPremium
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                        Icon(
                            imageVector = Icons.Rounded.WorkspacePremium,
                            contentDescription = null,
                            tint = palette.goldAccent,
                            modifier = Modifier.size(22.dp)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(
                                text = if (isPrem) "ASAKA ZIYO Premium Faol" else "ASAKA ZIYO Bepul Tarif",
                                style = MaterialTheme.typography.titleSmall,
                                color = palette.goldAccent
                            )
                            Text(
                                text = if (isPrem) "${state.subscription?.daysRemaining ?: 0} kun qoldi · Barcha 17 boʻlim ochiq"
                                else "Cheksiz AI Ustoz, Oflayn Qori va Hifz tahlilini ochish",
                                style = MaterialTheme.typography.bodySmall,
                                color = palette.textSecondary,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                    Text(
                        text = if (isPrem) "Holat" else "Ochish",
                        color = palette.goldAccent,
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        // 3. Personalized & Reorderable Home Command Blocks
        state.settings.homeBlockOrder.forEach { blockId ->
            when (blockId) {
                "prayer" -> if (state.settings.showPrayerCard) {
                    item(key = "home_prayer") {
                        PrayerHeroBentoCard(
                            state = state,
                            onClick = { onOpenModule("prayer") }
                        )
                    }
                }
                "quran" -> if (state.settings.showQuranCard) {
                    item(key = "home_quran") {
                        QuranGoalAndContinueCard(
                            state = state,
                            onContinue = { onContinueQuran(state.settings.lastSurahNumber) },
                            onAddMinutes = onLogMinutes
                        )
                    }
                }
                "audio" -> if (state.settings.showAudioCard) {
                    item(key = "home_audio") {
                        LastPlayedAudioCard(
                            state = state,
                            onOpenAudio = onOpenAudio
                        )
                    }
                }
                "hifz" -> if (state.settings.showHifzCard) {
                    item(key = "home_hifz") {
                        HifzMurojaaBentoRow(
                            state = state,
                            onOpenLearn = onOpenLearn
                        )
                    }
                }
                "wisdom" -> if (state.settings.showWisdomCard) {
                    item(key = "home_wisdom") {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            AsakaGlassCard(onClick = { onOpenModule("hadith") }) {
                                Column {
                                    Text(strings.dailyHadith.uppercase(), style = MaterialTheme.typography.labelMedium, color = palette.goldAccent)
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(todayHadith.textUz, style = MaterialTheme.typography.bodyMedium, color = palette.textPrimary)
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(todayHadith.source, style = MaterialTheme.typography.bodySmall, color = palette.textMuted)
                                }
                            }
                            AsakaGlassCard(onClick = { onOpenModule("hadith") }) {
                                Column {
                                    Text(strings.dailyDua.uppercase(), style = MaterialTheme.typography.labelMedium, color = palette.emeraldAccent)
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(todayDua.arabic, style = MaterialTheme.typography.titleMedium, color = palette.goldAccent, fontSize = 19.sp)
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(todayDua.translationUz, style = MaterialTheme.typography.bodySmall, color = palette.textSecondary)
                                }
                            }
                        }
                    }
                }
                "ai" -> if (state.settings.showAiCard) {
                    item(key = "home_ai") {
                        AsakaGlassCard(
                            elevated = true,
                            borderColor = palette.emeraldAccent.copy(alpha = 0.55f),
                            onClick = { onOpenModule("ai") }
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Rounded.AutoAwesome, contentDescription = null, tint = palette.emeraldAccent, modifier = Modifier.size(18.dp))
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(strings.aiAssistant, style = MaterialTheme.typography.titleSmall, color = palette.textPrimary)
                                    }
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = "Qurʼon, hadis, tajvid, hifz va namoz boʻyicha savol bering",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = palette.textSecondary
                                    )
                                }
                                Surface(shape = RoundedCornerShape(12.dp), color = palette.emeraldSoftBg) {
                                    Text("Soʻrash", color = palette.emeraldAccent, style = MaterialTheme.typography.labelMedium, modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp))
                                }
                            }
                        }
                    }
                }
            }
        }

        // 4. Native Android Modules Dock + Full Web App Parity Hub (27 Modules)
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Islomiy Modullar & Xizmatlar", style = MaterialTheme.typography.titleSmall, color = palette.textSecondary)
                TextButton(onClick = { onOpenModule("all_services") }) {
                    Text("Barchasi (27) →", color = palette.goldAccent, style = MaterialTheme.typography.labelMedium)
                }
            }
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                    HomeModuleTile("Qibla kompasi", "241° Sensor", Icons.Rounded.Explore, Modifier.weight(1f)) { onOpenModule("qibla") }
                    HomeModuleTile("Tasbeh & Zikr", "${state.tasbehTotalToday} bugun", Icons.Rounded.TouchApp, Modifier.weight(1f)) { onOpenModule("tasbeh") }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                    HomeModuleTile("Maqola & Eʼlon", "${state.centralDb.articles.size + state.centralDb.news.size} ta", Icons.AutoMirrored.Rounded.MenuBook, Modifier.weight(1f)) { onOpenModule("articles") }
                    HomeModuleTile("Hamjamiyat", "Chat & Imom Q&A", Icons.Rounded.Forum, Modifier.weight(1f)) { onOpenModule("community") }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                    HomeModuleTile("Viktorina & Xatm", "30 Juz · Istiqomat", Icons.Rounded.Quiz, Modifier.weight(1f)) { onOpenModule("quiz") }
                    HomeModuleTile("Kutubxona & Azon", "Kitob · Media · TV", Icons.Rounded.LibraryBooks, Modifier.weight(1f)) { onOpenModule("library") }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                    HomeModuleTile("Oflayn Markaz", "${state.downloadedTracks.size} audio · ${state.cachedMushafSurahs.size} sura", Icons.Rounded.CloudDone, Modifier.weight(1f)) { onOpenModule("offline") }
                    HomeModuleTile("Barcha Xizmatlar", "Allomalar · Masjid · Admin", Icons.Rounded.Apps, Modifier.weight(1f)) { onOpenModule("all_services") }
                }
            }
        }

        item { AsakaDeveloperAttributionFooter() }
        item { Spacer(modifier = Modifier.height(84.dp)) }
    }

    if (showCustomizeSheet) {
        ModalBottomSheet(
            onDismissRequest = { showCustomizeSheet = false },
            containerColor = palette.navBarSurface,
            contentColor = palette.textPrimary
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 8.dp)
                    .navigationBarsPadding(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text(strings.customizeHome, style = MaterialTheme.typography.titleMedium, color = palette.goldAccent)
                Text(
                    "Bosh sahifa bloklarini yashiring yoki oʻrnini yuqoriga/pastga oʻzgartiring:",
                    style = MaterialTheme.typography.bodySmall,
                    color = palette.textSecondary
                )
                val labels = mapOf(
                    "prayer" to "Namoz vaqtlari va Ob-havo",
                    "quran" to "Kunlik Qurʼon maqsadi & Davom ettirish",
                    "audio" to "Oxirgi tinglangan qori & Audio",
                    "hifz" to "Hifz va Murojaʼa progressi",
                    "wisdom" to "Kunlik Hadis va Duo",
                    "ai" to "AI Islomiy Yordamchi"
                )
                state.settings.homeBlockOrder.forEachIndexed { index, id ->
                    val checked = when (id) {
                        "prayer" -> state.settings.showPrayerCard
                        "quran" -> state.settings.showQuranCard
                        "audio" -> state.settings.showAudioCard
                        "hifz" -> state.settings.showHifzCard
                        "wisdom" -> state.settings.showWisdomCard
                        "ai" -> state.settings.showAiCard
                        else -> true
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                            IconButton(onClick = { onMoveBlock(id, -1) }, enabled = index > 0) {
                                Icon(Icons.Rounded.ArrowUpward, contentDescription = "Up", tint = palette.goldAccent, modifier = Modifier.size(18.dp))
                            }
                            IconButton(onClick = { onMoveBlock(id, 1) }, enabled = index < state.settings.homeBlockOrder.lastIndex) {
                                Icon(Icons.Rounded.ArrowDownward, contentDescription = "Down", tint = palette.goldAccent, modifier = Modifier.size(18.dp))
                            }
                            Text(labels[id] ?: id, style = MaterialTheme.typography.bodyMedium, color = palette.textPrimary)
                        }
                        Switch(checked = checked, onCheckedChange = { onToggleBlock(id, it) })
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
            }
        }
    }
}

@Composable
private fun PrayerHeroBentoCard(state: AsakaUiState, onClick: () -> Unit) {
    val palette = LocalAsakaColors.current
    val prayer = state.prayerSchedule
    val weather = state.weather
    AsakaGlassCard(elevated = true, onClick = onClick) {
        if (prayer == null && state.isLoadingPrayer) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                AsakaShimmerBox(modifier = Modifier.fillMaxWidth(0.55f).height(20.dp))
                AsakaShimmerBox(modifier = Modifier.fillMaxWidth().height(54.dp))
            }
        } else {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = prayer?.cityName ?: state.settings.selectedCityName,
                                style = MaterialTheme.typography.titleMedium,
                                color = palette.textPrimary
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = if (prayer?.sourceMode == "MANUAL_ADMIN") palette.goldSoftBg else palette.emeraldSoftBg
                            ) {
                                Text(
                                    text = if (prayer?.sourceMode == "MANUAL_ADMIN") "RASMIY MANUAL" else "GLOBAL AUTO",
                                    color = if (prayer?.sourceMode == "MANUAL_ADMIN") palette.goldAccent else palette.emeraldAccent,
                                    style = MaterialTheme.typography.labelMedium,
                                    modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp)
                                )
                            }
                        }
                        val nextStr = if (!prayer?.nextPrayerName.isNullOrBlank()) {
                            "Keyingi: ${prayer?.nextPrayerName} · ${prayer?.nextPrayerTime}"
                        } else {
                            prayer?.localDate ?: ""
                        }
                        Text(nextStr, style = MaterialTheme.typography.bodySmall, color = palette.goldAccent)
                    }
                    if (weather != null) {
                        Column(horizontalAlignment = Alignment.End) {
                            Text("${Math.round(weather.tempC)}°C", style = MaterialTheme.typography.titleMedium, color = palette.goldAccent)
                            Text(weather.conditionUz, style = MaterialTheme.typography.labelMedium, color = palette.textSecondary, maxLines = 1)
                        }
                    }
                }
                if (prayer?.isStaleCache == true) {
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "Oflayn kesh (${prayer.localDate}) — internet ulanganda avtomatik yangilanadi.",
                        style = MaterialTheme.typography.labelMedium,
                        color = palette.danger
                    )
                }
                Spacer(modifier = Modifier.height(12.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    PrayerMiniSlot("Bomdod", prayer?.fajr ?: "--:--")
                    PrayerMiniSlot("Peshin", prayer?.dhuhr ?: "--:--")
                    PrayerMiniSlot("Asr", prayer?.asr ?: "--:--")
                    PrayerMiniSlot("Shom", prayer?.maghrib ?: "--:--")
                    PrayerMiniSlot("Xufton", prayer?.isha ?: "--:--")
                }
            }
        }
    }
}

@Composable
private fun PrayerMiniSlot(label: String, time: String) {
    val palette = LocalAsakaColors.current
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, style = MaterialTheme.typography.labelMedium, color = palette.textMuted)
        Spacer(modifier = Modifier.height(2.dp))
        Text(time, style = MaterialTheme.typography.titleSmall, color = palette.textPrimary, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun QuranGoalAndContinueCard(
    state: AsakaUiState,
    onContinue: () -> Unit,
    onAddMinutes: () -> Unit
) {
    val palette = LocalAsakaColors.current
    val goal = state.settings.dailyQuranGoalMinutes.coerceAtLeast(1)
    val done = state.settings.completedQuranMinutesToday
    val progress = (done.toFloat() / goal.toFloat()).coerceIn(0f, 1f)

    AsakaGlassCard(onClick = onContinue) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            AsakaProgressRing(progress = progress, size = 62.dp, strokeWidth = 6.dp) {
                Text("${(progress * 100).toInt()}%", style = MaterialTheme.typography.labelMedium, color = palette.goldAccent, fontWeight = FontWeight.Bold)
            }
            Spacer(modifier = Modifier.width(14.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text("Qurʼonni davom ettirish", style = MaterialTheme.typography.labelMedium, color = palette.goldAccent)
                Text(
                    "${state.settings.lastSurahNumber}. ${state.settings.lastSurahName} · ${state.settings.lastAyahNumber}-oyat",
                    style = MaterialTheme.typography.titleSmall,
                    color = palette.textPrimary
                )
                Text(
                    "Kunlik maqsad: $done / $goal daqiqa",
                    style = MaterialTheme.typography.bodySmall,
                    color = palette.textSecondary
                )
            }
            TextButton(onClick = onAddMinutes) {
                Text("+5 min", color = palette.emeraldAccent, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun LastPlayedAudioCard(state: AsakaUiState, onOpenAudio: () -> Unit) {
    val palette = LocalAsakaColors.current
    val qariName = state.playback.artist.ifBlank { state.selectedQari?.nameUz ?: "Qorilar kutubxonasi" }
    val trackTitle = state.playback.title.ifBlank { "114 sura MP3 tilovat va oflayn yuklash" }
    AsakaGlassCard(onClick = onOpenAudio) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                Box(
                    modifier = Modifier.size(42.dp).clip(RoundedCornerShape(14.dp)).background(palette.goldSoftBg),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Rounded.Headphones, contentDescription = null, tint = palette.goldAccent)
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(qariName, style = MaterialTheme.typography.titleSmall, color = palette.textPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(trackTitle, style = MaterialTheme.typography.bodySmall, color = palette.textSecondary, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
            }
            Icon(Icons.Rounded.PlayArrow, contentDescription = "Audio", tint = palette.goldAccent)
        }
    }
}

@Composable
private fun HifzMurojaaBentoRow(state: AsakaUiState, onOpenLearn: () -> Unit) {
    val palette = LocalAsakaColors.current
    val avgMastery = if (state.hifzItems.isEmpty()) 0 else state.hifzItems.map { it.masteryScore }.average().toInt()
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
        AsakaGlassCard(modifier = Modifier.weight(1f), onClick = onOpenLearn) {
            Column {
                Icon(Icons.Rounded.School, contentDescription = null, tint = palette.goldAccent, modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.height(6.dp))
                Text("Hifz Progressi", style = MaterialTheme.typography.titleSmall, color = palette.textPrimary)
                Text("${state.hifzItems.size} boʻlim · $avgMastery%", style = MaterialTheme.typography.bodySmall, color = palette.emeraldAccent)
            }
        }
        AsakaGlassCard(modifier = Modifier.weight(1f), onClick = onOpenLearn) {
            Column {
                Icon(Icons.Rounded.NotificationsActive, contentDescription = null, tint = palette.emeraldAccent, modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.height(6.dp))
                Text("Tajvid & Murojaʼa", style = MaterialTheme.typography.titleSmall, color = palette.textPrimary)
                Text("${state.tajweedLessons.size.coerceAtLeast(6)} dars · 28 harf", style = MaterialTheme.typography.bodySmall, color = palette.textSecondary)
            }
        }
    }
}

@Composable
private fun HomeModuleTile(
    title: String,
    subtitle: String,
    icon: ImageVector,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    val palette = LocalAsakaColors.current
    AsakaGlassCard(modifier = modifier, cornerRadius = 18.dp, onClick = onClick) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier.size(36.dp).clip(RoundedCornerShape(12.dp)).background(palette.emeraldSoftBg),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = palette.emeraldAccent, modifier = Modifier.size(20.dp))
            }
            Spacer(modifier = Modifier.width(10.dp))
            Column {
                Text(title, style = MaterialTheme.typography.titleSmall, color = palette.textPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(subtitle, style = MaterialTheme.typography.labelMedium, color = palette.textMuted, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}
