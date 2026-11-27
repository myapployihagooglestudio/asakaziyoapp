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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.CloudDone
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Share
import androidx.compose.material.icons.rounded.Speed
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import uz.asakaziyo.app.AsakaShareUtils
import uz.asakaziyo.app.BuildConfig
import uz.asakaziyo.app.data.AsakaApiClient
import uz.asakaziyo.app.data.AsakaEcosystemApiClient
import uz.asakaziyo.app.i18n.AsakaLocale
import uz.asakaziyo.app.ui.theme.AsakaGlassCard
import uz.asakaziyo.app.ui.theme.LocalAsakaColors
import uz.asakaziyo.app.viewmodel.AsakaAppViewModel
import uz.asakaziyo.app.viewmodel.AsakaUiState
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * ASAKA ZIYO v6.0.0 — Exclusive Android Native Screens:
 * 1. Smart Personal Ibadat Planner (`planner`)
 * 2. App Performance & Sync Diagnostics Center (`performance`)
 * 3. First-Launch Native Onboarding Flow (`V6OnboardingOverlay`)
 */

@Composable
fun SmartIbadatPlannerScreen(
    state: AsakaUiState,
    vm: AsakaAppViewModel,
    onBack: () -> Unit
) {
    val palette = LocalAsakaColors.current
    val context = LocalContext.current
    val goalMin = state.settings.dailyQuranGoalMinutes.coerceAtLeast(5)
    val doneMin = state.settings.completedQuranMinutesToday
    val quranPct = ((doneMin.toFloat() / goalMin.toFloat()).coerceIn(0f, 1f))
    val dhikrGoal = state.settings.dailyDhikrGoal.coerceAtLeast(33)
    val dhikrPct = ((state.tasbehTotalToday.toFloat() / dhikrGoal.toFloat()).coerceIn(0f, 1f))
    val ist = state.istiqomatToday
    val completedPrayers = listOf(ist.fajr, ist.dhuhr, ist.asr, ist.maghrib, ist.isha).count { it }

    Column(modifier = Modifier.fillMaxSize()) {
        V6TopBar(
            title = "Aqlli Ibodat Rejalashtirgichi",
            subtitle = "Kunlik Qurʼon · Zikr · Hifz · Murojaʼa rejasi",
            onBack = onBack
        )
        LazyColumn(
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 110.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                AsakaGlassCard(elevated = true, borderColor = palette.goldAccent) {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Rounded.CalendarMonth, contentDescription = null, tint = palette.goldAccent)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Bugungi Ibodat Hisoboti", style = MaterialTheme.typography.titleMedium, color = palette.goldAccent)
                            }
                            IconButton(onClick = {
                                AsakaShareUtils.shareText(
                                    context,
                                    "ASAKA ZIYO — Bugungi Ibodat Natijam",
                                    "Namoz: $completedPrayers/5\nQurʼon: $doneMin/$goalMin daqiqa\nZikr: ${state.tasbehTotalToday}/$dhikrGoal\nHifz boʻlimlari: ${state.hifzItems.size} ta",
                                    "planner"
                                )
                            }) {
                                Icon(Icons.Rounded.Share, contentDescription = "Ulashish", tint = palette.goldAccent)
                            }
                        }

                        Text("Qurʼon tilovati: $doneMin / $goalMin daqiqa (${(quranPct * 100).toInt()}%)", style = MaterialTheme.typography.bodyMedium, color = palette.textPrimary)
                        LinearProgressIndicator(
                            progress = { quranPct },
                            color = palette.goldAccent,
                            trackColor = palette.glassSurface,
                            modifier = Modifier.fillMaxWidth().height(8.dp)
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                            listOf(10, 15, 30, 60).forEach { m ->
                                val active = goalMin == m
                                Surface(
                                    shape = RoundedCornerShape(10.dp),
                                    color = if (active) palette.goldSoftBg else palette.glassSurface,
                                    border = BorderStroke(1.dp, if (active) palette.goldAccent else palette.luminousBorder),
                                    modifier = Modifier.weight(1f).clickable { vm.updateDailyGoal(m) }
                                ) {
                                    Text("$m daq", color = if (active) palette.goldAccent else palette.textSecondary, style = MaterialTheme.typography.labelMedium, modifier = Modifier.padding(vertical = 8.dp, horizontal = 6.dp))
                                }
                            }
                        }
                        OutlinedButton(onClick = { vm.logReadingMinutes(5) }, modifier = Modifier.fillMaxWidth()) {
                            Text("+5 daqiqa Qurʼon tilovatini belgilash", color = palette.emeraldAccent)
                        }
                    }
                }
            }

            item {
                AsakaGlassCard {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text("Kunlik Zikr Maqsadi: ${state.tasbehTotalToday} / $dhikrGoal", style = MaterialTheme.typography.titleSmall, color = palette.textPrimary)
                        LinearProgressIndicator(
                            progress = { dhikrPct },
                            color = palette.emeraldAccent,
                            trackColor = palette.glassSurface,
                            modifier = Modifier.fillMaxWidth().height(8.dp)
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                            listOf(33, 99, 300, 1000).forEach { target ->
                                val active = dhikrGoal == target
                                Surface(
                                    shape = RoundedCornerShape(10.dp),
                                    color = if (active) palette.emeraldSoftBg else palette.glassSurface,
                                    border = BorderStroke(1.dp, if (active) palette.emeraldAccent else palette.luminousBorder),
                                    modifier = Modifier.weight(1f).clickable { vm.updateDailyDhikrGoal(target) }
                                ) {
                                    Text("$target", color = if (active) palette.emeraldAccent else palette.textSecondary, style = MaterialTheme.typography.labelMedium, modifier = Modifier.padding(vertical = 8.dp, horizontal = 6.dp))
                                }
                            }
                        }
                    }
                }
            }

            item {
                AsakaGlassCard {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("5 Vaqt Namoz & Istiqomat ($completedPrayers/5)", style = MaterialTheme.typography.titleSmall, color = palette.goldAccent)
                        val items = listOf(
                            "fajr" to ("Bomdod" to ist.fajr),
                            "dhuhr" to ("Peshin" to ist.dhuhr),
                            "asr" to ("Asr" to ist.asr),
                            "maghrib" to ("Shom" to ist.maghrib),
                            "isha" to ("Xufton" to ist.isha),
                            "quranRead" to ("Kunlik Qurʼon oʻqildi" to ist.quranRead),
                            "morningDhikr" to ("Tonggi va kechki zikrlar" to ist.morningDhikr),
                            "charity" to ("Sadaqa / Yaxshilik" to ist.charity)
                        )
                        items.forEach { (field, pair) ->
                            val (label, done) = pair
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { vm.toggleIstiqomatField(field) }
                                    .padding(vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(label, style = MaterialTheme.typography.bodyMedium, color = if (done) palette.emeraldAccent else palette.textPrimary)
                                Icon(
                                    Icons.Rounded.CheckCircle,
                                    contentDescription = null,
                                    tint = if (done) palette.emeraldAccent else palette.textMuted
                                )
                            }
                        }
                    }
                }
            }

            item {
                AsakaGlassCard {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Aqlli Bildirishnoma Markazi (V6)", style = MaterialTheme.typography.titleSmall, color = palette.goldAccent)
                        PlannerToggle("Namoz va Azon eslatmalari", state.settings.prayerNotificationsEnabled) { vm.updatePrayerNotifications(it) }
                        PlannerToggle("Kunlik Qurʼon oʻqish eslatmasi", state.settings.quranReminderEnabled) { vm.updateSmartReminders(quran = it) }
                        PlannerToggle("Hifz va Murojaʼa jadvali", state.settings.hifzReminderEnabled) { vm.updateSmartReminders(hifz = it) }
                        PlannerToggle("Tonggi va kechki zikrlar", state.settings.dhikrReminderEnabled) { vm.updateSmartReminders(dhikr = it) }
                    }
                }
            }
        }
    }
}

@Composable
fun AppPerformanceCenterScreen(
    state: AsakaUiState,
    vm: AsakaAppViewModel,
    onBack: () -> Unit
) {
    val palette = LocalAsakaColors.current
    val formattedSyncTime = remember(state.lastSyncTimestampMs) {
        if (state.lastSyncTimestampMs <= 0L) "Hali bajarilmagan"
        else SimpleDateFormat("dd.MM.yyyy HH:mm:ss", Locale.US).format(Date(state.lastSyncTimestampMs))
    }
    val totalDownloadedMb = remember(state.downloadedTracks) {
        state.downloadedTracks.sumOf { it.second } / (1024L * 1024L)
    }

    Column(modifier = Modifier.fillMaxSize()) {
        V6TopBar(
            title = "Ishlash & Sinxronizatsiya Markazi",
            subtitle = "Real-time Backend · Offline Kesh · Diagnostika",
            onBack = onBack
        )
        LazyColumn(
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 110.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                AsakaGlassCard(elevated = true, borderColor = palette.emeraldAccent) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Rounded.CloudDone, contentDescription = null, tint = palette.emeraldAccent)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Markaziy Server Sinxronizatsiyasi", style = MaterialTheme.typography.titleMedium, color = palette.emeraldAccent)
                        }
                        DiagRow("Ilova versiyasi", "v${BuildConfig.VERSION_NAME} (Build ${BuildConfig.VERSION_CODE})")
                        DiagRow("Server manzili", BuildConfig.BACKEND_BASE_URL)
                        DiagRow("Oxirgi sinxronizatsiya", formattedSyncTime)
                        DiagRow("Content Version", state.contentVersion.ifBlank { "Tekshirilmoqda..." })
                        DiagRow("Manifest ETag", state.contentEtag.take(28).ifBlank { "—" })
                        DiagRow("API javob tezligi", "${AsakaApiClient.lastApiLatencyMs} ms · Sync: ${AsakaEcosystemApiClient.lastSyncLatencyMs} ms")
                        DiagRow("Navbatdagi oflayn yozuvlar", "${state.pendingSyncCount} ta")
                        val err = AsakaApiClient.lastApiError.ifBlank { AsakaEcosystemApiClient.lastSyncError }
                        DiagRow("Tarmoq holati", if (err.isBlank()) "Barqaror (HTTP 200 OK)" else err)

                        Button(
                            onClick = {
                                vm.checkManifestAndRefresh(force = true)
                                vm.triggerManualSync()
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = palette.goldAccent, contentColor = Color(0xFF031814)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Rounded.Refresh, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Hozir toʻliq sinxronlash", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            item {
                AsakaGlassCard {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Rounded.Speed, contentDescription = null, tint = palette.goldAccent)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Oflayn Kesh va Xotira Holati", style = MaterialTheme.typography.titleSmall, color = palette.goldAccent)
                        }
                        DiagRow("Keshlangan suralar (Mushaf)", "${state.cachedMushafSurahs.size} / 114 sura")
                        DiagRow("Yuklab olingan qiroatlar", "${state.downloadedTracks.size} ta ($totalDownloadedMb MB)")
                        DiagRow("Boʻsh xotira", "${state.freeStorageMb} MB")
                        DiagRow("Namoz rejimi", state.prayerSchedule?.sourceMode ?: "Kesh")
                        DiagRow("Mavjud shaharlar", "${state.availableCities.size} ta (UZ + Jahon)")
                        DiagRow("Maqola / Hadis / Yangilik", "${state.centralDb.articles.size} / ${state.centralDb.dynamicHadiths.size} / ${state.centralDb.news.size}")
                        DiagRow("Qorilar / Entitlements", "${state.qaris.size} / ${state.entitlements.size}")
                    }
                }
            }
        }
    }
}

@Composable
fun V6OnboardingOverlay(
    state: AsakaUiState,
    onSelectLanguage: (String) -> Unit,
    onSelectTheme: (String) -> Unit,
    onComplete: () -> Unit
) {
    val palette = LocalAsakaColors.current
    var step by remember { mutableIntStateOf(0) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(palette.backgroundGradient)
            .padding(20.dp),
        contentAlignment = Alignment.Center
    ) {
        AsakaGlassCard(elevated = true, borderColor = palette.goldAccent) {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Rounded.AutoAwesome, contentDescription = null, tint = palette.goldAccent)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("ASAKA ZIYO v${BuildConfig.VERSION_NAME}", style = MaterialTheme.typography.titleMedium, color = palette.goldAccent, fontWeight = FontWeight.Bold)
                    }
                    TextButton(onClick = onComplete) {
                        Text("Oʻtkazib yuborish", color = palette.textSecondary)
                    }
                }

                when (step) {
                    0 -> {
                        Text("Assalomu alaykum! Tilni tanlang", style = MaterialTheme.typography.headlineSmall, color = palette.textPrimary)
                        Text("ASAKA ZIYO 5 ta til va Yangi Oʻzbek Lotin yozuvini toʻliq qoʻllab-quvvatlaydi.", style = MaterialTheme.typography.bodySmall, color = palette.textSecondary)
                        AsakaLocale.entries.forEach { loc ->
                            val active = state.settings.languageCode.equals(loc.code, ignoreCase = true)
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = if (active) palette.goldSoftBg else palette.glassSurface,
                                border = BorderStroke(1.dp, if (active) palette.goldAccent else palette.luminousBorder),
                                modifier = Modifier.fillMaxWidth().clickable { onSelectLanguage(loc.code) }
                            ) {
                                Text(loc.nativeLabel, color = if (active) palette.goldAccent else palette.textPrimary, modifier = Modifier.padding(12.dp))
                            }
                        }
                    }
                    1 -> {
                        Text("Koʻrinish va qulaylik", style = MaterialTheme.typography.headlineSmall, color = palette.textPrimary)
                        Text("OLED tungi rejim, fil suyagi kunduzgi rejim yoki tizim mavzusini tanlang.", style = MaterialTheme.typography.bodySmall, color = palette.textSecondary)
                        listOf("dark" to "Tungi (OLED Emerald & Gold)", "light" to "Kunduzgi (Fil suyagi)", "system" to "Tizim boʻyicha").forEach { (mode, lbl) ->
                            val active = state.settings.themeMode == mode
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = if (active) palette.goldSoftBg else palette.glassSurface,
                                border = BorderStroke(1.dp, if (active) palette.goldAccent else palette.luminousBorder),
                                modifier = Modifier.fillMaxWidth().clickable { onSelectTheme(mode) }
                            ) {
                                Text(lbl, color = if (active) palette.goldAccent else palette.textPrimary, modifier = Modifier.padding(12.dp))
                            }
                        }
                    }
                    else -> {
                        Text("Barcha imkoniyatlar tayyor!", style = MaterialTheme.typography.headlineSmall, color = palette.textPrimary)
                        Text(
                            "• Asaka shahri uchun rasmiy MANUAL_ADMIN va Oʻzbekiston + Jahon namoz vaqtlari\n" +
                                "• 114 suralik Madina Mushafi, Hifz/Murojaʼa, Tajvid akademiyasi\n" +
                                "• Fon Qurʼon MP3 pleeri, 7 ta Home Screen vidjeti va 5 ta Quick Settings plitkasi\n" +
                                "• Yagona Web + Android + Telegram ekotizimi va Real-time sinxronizatsiya",
                            style = MaterialTheme.typography.bodySmall,
                            color = palette.textSecondary
                        )
                    }
                }

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    if (step > 0) {
                        OutlinedButton(onClick = { step -= 1 }) { Text("Orqaga", color = palette.textPrimary) }
                    } else {
                        Spacer(modifier = Modifier.width(1.dp))
                    }
                    Button(
                        onClick = {
                            if (step < 2) step += 1 else onComplete()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = palette.goldAccent, contentColor = Color(0xFF031814))
                    ) {
                        Text(if (step < 2) "Keyingi" else "Boshlash", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
private fun V6TopBar(title: String, subtitle: String, onBack: () -> Unit) {
    val palette = LocalAsakaColors.current
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(onClick = onBack) {
            Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Orqaga", tint = palette.goldAccent)
        }
        Column {
            Text(title, style = MaterialTheme.typography.titleMedium, color = palette.textPrimary)
            Text(subtitle, style = MaterialTheme.typography.labelMedium, color = palette.textSecondary)
        }
    }
}

@Composable
private fun DiagRow(label: String, value: String) {
    val palette = LocalAsakaColors.current
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = palette.textSecondary)
        Text(value, style = MaterialTheme.typography.bodySmall, color = palette.textPrimary, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun PlannerToggle(label: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    val palette = LocalAsakaColors.current
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = palette.textSecondary, modifier = Modifier.weight(1f))
        Switch(checked = checked, onCheckedChange = onChange)
    }
}
