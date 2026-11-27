package uz.asakaziyo.app.ui.screens

import android.content.Context
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.Bookmark
import androidx.compose.material.icons.rounded.BookmarkBorder
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.EmojiEvents
import androidx.compose.material.icons.rounded.HistoryEdu
import androidx.compose.material.icons.rounded.LiveTv
import androidx.compose.material.icons.rounded.NotificationsActive
import androidx.compose.material.icons.rounded.Remove
import androidx.compose.material.icons.rounded.Share
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.asakaziyo.app.AsakaShareUtils
import uz.asakaziyo.app.BuildConfig
import uz.asakaziyo.app.data.AsakaCatalogData
import uz.asakaziyo.app.ui.theme.AsakaGlassCard
import uz.asakaziyo.app.ui.theme.LocalAsakaColors
import uz.asakaziyo.app.viewmodel.AsakaAppViewModel
import uz.asakaziyo.app.viewmodel.AsakaUiState

/**
 * ASAKA ZIYO v7.0.0 — Full Web App Parity Native Compose Screens
 *
 * Closes every remaining module from the 36-module Web App canonical inventory:
 * 1. DailyWisdomArchiveScreen (`daily_archive`)
 * 2. IslamicAchievementsScreen (`achievements`)
 * 3. PrayerJournalScreen (`prayer_journal`)
 * 4. ReminderDashboardScreen (`reminder_dashboard`)
 * 5. PublicDisplayScreen (`display`)
 */

@Composable
private fun V7ModuleTopBar(
    title: String,
    subtitle: String,
    onBack: () -> Unit
) {
    val palette = LocalAsakaColors.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 8.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(onClick = onBack) {
            Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Back", tint = palette.goldAccent)
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleMedium, color = palette.textPrimary)
            Text(subtitle, style = MaterialTheme.typography.labelMedium, color = palette.textSecondary)
        }
    }
}

// ---------------------------------------------------------------------------
// 1. Daily Wisdom Archive (`daily_archive`)
// ---------------------------------------------------------------------------
private data class WisdomArchiveCard(
    val id: String,
    val label: String,
    val arabic: String,
    val translation: String,
    val reference: String
)

@Composable
fun DailyWisdomArchiveScreen(
    state: AsakaUiState,
    vm: AsakaAppViewModel,
    onBack: () -> Unit
) {
    val palette = LocalAsakaColors.current
    val context = LocalContext.current
    val favKeys = remember(state.favorites) { state.favorites.map { it.first }.toSet() }

    val itemsList = remember(state.centralDb) {
        val list = mutableListOf<WisdomArchiveCard>()
        val live = state.centralDb.dailyWisdom
        if (live != null && live.ayahTranslation.isNotBlank()) {
            list.add(
                WisdomArchiveCard(
                    id = "wisdom_live_ayah",
                    label = "Bugungi Kun Oyati · ${live.dateIso.ifBlank { "Jonli" }}",
                    arabic = live.ayahArabic,
                    translation = live.ayahTranslation,
                    reference = live.ayahRef.ifBlank { "Qurʼoni Karim" }
                )
            )
        }
        if (live != null && live.hadithText.isNotBlank()) {
            list.add(
                WisdomArchiveCard(
                    id = "wisdom_live_hadith",
                    label = "Bugungi Kun Hadisi",
                    arabic = "",
                    translation = live.hadithText,
                    reference = live.hadithSource.ifBlank { "Sahih Hadis" }
                )
            )
        }
        list.addAll(
            listOf(
                WisdomArchiveCard(
                    id = "wisdom_sharh_5",
                    label = "Qurʼon Hikmati",
                    arabic = "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ الْعُسْرِ يُسْرًا",
                    translation = "Albatta, qiyinchilik bilan birga yengillik bordir. Haqiqatan, qiyinchilik bilan birga yengillik bordir.",
                    reference = "Sharh surasi, 5–6-oyatlar"
                ),
                WisdomArchiveCard(
                    id = "wisdom_baqara_152",
                    label = "Zikr va Shukr",
                    arabic = "فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ",
                    translation = "Bas, Meni eslangiz, Men ham sizlarni eslayman. Menga shukr qilingiz va noshukrlik qilmangiz!",
                    reference = "Baqara surasi, 152-oyat"
                ),
                WisdomArchiveCard(
                    id = "wisdom_raad_28",
                    label = "Qalb Xotirjamligi",
                    arabic = "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ",
                    translation = "Ogoh boʻlingizki, Allohni zikr etish bilan qalblar orom olur!",
                    reference = "Raʼd surasi, 28-oyat"
                ),
                WisdomArchiveCard(
                    id = "wisdom_hadith_quran",
                    label = "Nabaviy Hadis",
                    arabic = "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ",
                    translation = "Sizlarning eng yaxshilaringiz Qurʼonni oʻrganib, uni boshqalarga oʻrgatganlaringizdir.",
                    reference = "Imom Buxoriy rivoyati"
                )
            )
        )
        state.centralDb.dynamicHadiths.take(10).forEach { h ->
            list.add(
                WisdomArchiveCard(
                    id = "wisdom_dyn_${h.id}",
                    label = h.title.ifBlank { "Hadis Arxivi" },
                    arabic = h.arabic,
                    translation = h.text,
                    reference = h.source
                )
            )
        }
        list
    }

    Column(modifier = Modifier.fillMaxSize()) {
        V7ModuleTopBar(
            title = "Kunlik Hikmatlar Arxivi",
            subtitle = "Tekshirilgan oyat, hadis va duolar · ASAKA ZIYO v${BuildConfig.VERSION_NAME}",
            onBack = onBack
        )
        LazyColumn(
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 110.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(itemsList, key = { it.id }) { card ->
                val isFav = favKeys.contains(card.id)
                AsakaGlassCard(elevated = card.id.startsWith("wisdom_live"), cornerRadius = 18.dp) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Rounded.HistoryEdu, contentDescription = null, tint = palette.goldAccent, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(card.label, style = MaterialTheme.typography.labelMedium, color = palette.goldAccent, fontWeight = FontWeight.Bold)
                            }
                            Row {
                                IconButton(onClick = {
                                    vm.toggleFavoriteItem(card.id, "wisdom", card.reference, card.translation)
                                }) {
                                    Icon(
                                        imageVector = if (isFav) Icons.Rounded.Bookmark else Icons.Rounded.BookmarkBorder,
                                        contentDescription = "Sevimli",
                                        tint = if (isFav) palette.goldAccent else palette.textMuted
                                    )
                                }
                                IconButton(onClick = {
                                    AsakaShareUtils.shareText(
                                        context,
                                        "ASAKA ZIYO — ${card.label}",
                                        listOf(card.arabic, card.translation, "— ${card.reference}").filter { it.isNotBlank() }.joinToString("\n\n"),
                                        "daily_archive"
                                    )
                                }) {
                                    Icon(Icons.Rounded.Share, contentDescription = "Ulashish", tint = palette.emeraldAccent)
                                }
                            }
                        }
                        if (card.arabic.isNotBlank()) {
                            Text(
                                text = card.arabic,
                                style = MaterialTheme.typography.titleMedium.copy(lineHeight = 32.sp),
                                color = palette.textPrimary,
                                textAlign = TextAlign.End,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                        Text(card.translation, style = MaterialTheme.typography.bodyMedium, color = palette.textPrimary)
                        Text("Manba: ${card.reference}", style = MaterialTheme.typography.labelMedium, color = palette.emeraldAccent)
                    }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// 2. Islamic Achievements & Worship Level (`achievements`)
// ---------------------------------------------------------------------------
private data class AchievementSpec(
    val id: String,
    val title: String,
    val subtitle: String,
    val unlocked: Boolean,
    val progressText: String,
    val xp: Int
)

@Composable
fun IslamicAchievementsScreen(
    state: AsakaUiState,
    onBack: () -> Unit
) {
    val palette = LocalAsakaColors.current
    val context = LocalContext.current
    val ist = state.istiqomatToday
    val prayersDone = listOf(ist.fajr, ist.dhuhr, ist.asr, ist.maghrib, ist.isha).count { it }
    val quranMin = state.settings.completedQuranMinutesToday
    val hifzCount = state.hifzItems.size
    val tasbehTotal = state.tasbehTotalToday
    val offlineSurahs = state.cachedMushafSurahs.size
    val favCount = state.favorites.size
    val bookmarkCount = state.bookmarks.size

    val badges = remember(prayersDone, quranMin, hifzCount, tasbehTotal, offlineSurahs, favCount, bookmarkCount) {
        listOf(
            AchievementSpec("five_prayers", "Besh Vaqt Istiqomat", "Bugungi 5 vaqt namozni toʻliq belgilash", prayersDone >= 5, "$prayersDone/5 namoz", 150),
            AchievementSpec("quran_reader", "Qurʼon Oshnosi", "Kunlik kamida 15 daqiqa tilovat qilish", quranMin >= 15, "$quranMin/15 daq", 120),
            AchievementSpec("hifz_starter", "Hifz Yoʻlovchisi", "Kamida 1 ta sura yoki oyatni Hifz rejasiga qoʻshish", hifzCount >= 1, "$hifzCount ta boʻlim", 100),
            AchievementSpec("hifz_master", "Hofiz Intilishi", "Kamida 5 ta Hifz boʻlimini faol murojaʼa qilish", hifzCount >= 5, "$hifzCount/5 boʻlim", 250),
            AchievementSpec("dhikr_100", "Zokir Qalb", "Kunlik 99+ zikr va tasbeh aytish", tasbehTotal >= 99, "$tasbehTotal/99 zikr", 100),
            AchievementSpec("offline_ready", "Oflayn Tayyorgarlik", "Kamida 3 ta surani oflayn Mushafga saqlash", offlineSurahs >= 3, "$offlineSurahs/3 sura", 80),
            AchievementSpec("bookmarks", "Ilm Yigʻuvchi", "Oyat xatchoʻpi yoki Sevimlilar toʻplamini shakllantirish", (favCount + bookmarkCount) >= 3, "${favCount + bookmarkCount}/3 saqlangan", 70),
            AchievementSpec("ecosystem_member", "ASAKA ZIYO v7 Ekotizimi", "Yagona ekotizim foydalanuvchisi", true, "Faol", 50)
        )
    }

    val totalXp = badges.filter { it.unlocked }.sumOf { it.xp }
    val level = (totalXp / 150) + 1
    val levelPct = ((totalXp % 150) / 150f).coerceIn(0f, 1f)
    val unlockedCount = badges.count { it.unlocked }

    Column(modifier = Modifier.fillMaxSize()) {
        V7ModuleTopBar(
            title = "Islomiy Yutuqlar & Darajalar",
            subtitle = "Daraja $level · $totalXp XP · $unlockedCount/${badges.size} nishon",
            onBack = onBack
        )
        LazyColumn(
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 110.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            item {
                AsakaGlassCard(elevated = true, borderColor = palette.goldAccent) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Rounded.EmojiEvents, contentDescription = null, tint = palette.goldAccent, modifier = Modifier.size(28.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Column {
                                    Text("Daraja $level · ${state.settings.displayName}", style = MaterialTheme.typography.titleMedium, color = palette.goldAccent)
                                    Text("$totalXp XP · $unlockedCount ta nishon ochildi", style = MaterialTheme.typography.bodySmall, color = palette.textSecondary)
                                }
                            }
                            IconButton(onClick = {
                                AsakaShareUtils.shareText(
                                    context,
                                    "ASAKA ZIYO — Islomiy Yutuqlarim",
                                    "Daraja $level ($totalXp XP) · $unlockedCount/${badges.size} ta nishon ochildi!",
                                    "achievements"
                                )
                            }) {
                                Icon(Icons.Rounded.Share, contentDescription = "Ulashish", tint = palette.goldAccent)
                            }
                        }
                        LinearProgressIndicator(
                            progress = { levelPct },
                            color = palette.goldAccent,
                            trackColor = palette.glassSurface,
                            modifier = Modifier.fillMaxWidth().height(8.dp)
                        )
                    }
                }
            }
            items(badges, key = { it.id }) { b ->
                AsakaGlassCard(
                    cornerRadius = 16.dp,
                    borderColor = if (b.unlocked) palette.emeraldAccent else null
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                            Icon(
                                imageVector = if (b.unlocked) Icons.Rounded.CheckCircle else Icons.Rounded.AutoAwesome,
                                contentDescription = null,
                                tint = if (b.unlocked) palette.emeraldAccent else palette.textMuted,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text(b.title, style = MaterialTheme.typography.titleSmall, color = if (b.unlocked) palette.textPrimary else palette.textSecondary)
                                Text(b.subtitle, style = MaterialTheme.typography.bodySmall, color = palette.textMuted)
                            }
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text("+${b.xp} XP", style = MaterialTheme.typography.labelMedium, color = if (b.unlocked) palette.goldAccent else palette.textMuted, fontWeight = FontWeight.Bold)
                            Text(b.progressText, style = MaterialTheme.typography.labelSmall, color = if (b.unlocked) palette.emeraldAccent else palette.textMuted)
                        }
                    }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// 3. Prayer Journal & Qazo Tracker (`prayer_journal`)
// ---------------------------------------------------------------------------
@Composable
fun PrayerJournalScreen(
    state: AsakaUiState,
    vm: AsakaAppViewModel,
    onBack: () -> Unit
) {
    val palette = LocalAsakaColors.current
    val context = LocalContext.current
    val qazoPrefs = remember { context.getSharedPreferences("asaka_qazo_journal_v7", Context.MODE_PRIVATE) }

    var qFajr by remember { mutableIntStateOf(qazoPrefs.getInt("fajr", 0)) }
    var qDhuhr by remember { mutableIntStateOf(qazoPrefs.getInt("dhuhr", 0)) }
    var qAsr by remember { mutableIntStateOf(qazoPrefs.getInt("asr", 0)) }
    var qMaghrib by remember { mutableIntStateOf(qazoPrefs.getInt("maghrib", 0)) }
    var qIsha by remember { mutableIntStateOf(qazoPrefs.getInt("isha", 0)) }
    var qWitr by remember { mutableIntStateOf(qazoPrefs.getInt("witr", 0)) }

    fun updateQazo(key: String, nextVal: Int): Int {
        val safe = nextVal.coerceAtLeast(0)
        qazoPrefs.edit().putInt(key, safe).apply()
        return safe
    }

    val ist = state.istiqomatToday
    val fardRows = listOf(
        Triple("fajr", "Bomdod (Fajr)", ist.fajr),
        Triple("dhuhr", "Peshin (Dhuhr)", ist.dhuhr),
        Triple("asr", "Asr", ist.asr),
        Triple("maghrib", "Shom (Maghrib)", ist.maghrib),
        Triple("isha", "Xufton (Isha)", ist.isha)
    )
    val doneToday = fardRows.count { it.third }
    val totalQazo = qFajr + qDhuhr + qAsr + qMaghrib + qIsha + qWitr

    Column(modifier = Modifier.fillMaxSize()) {
        V7ModuleTopBar(
            title = "Namoz Kundaligi & Qazo Hisobi",
            subtitle = "Bugun: $doneToday/5 farz · Qolgan qazo: $totalQazo",
            onBack = onBack
        )
        LazyColumn(
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 110.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                AsakaGlassCard(elevated = true, borderColor = palette.goldAccent) {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("Bugungi 5 Vaqt Farz Namozlari (Bulut bilan sinxron)", style = MaterialTheme.typography.titleSmall, color = palette.goldAccent)
                        LinearProgressIndicator(
                            progress = { doneToday / 5f },
                            color = palette.emeraldAccent,
                            trackColor = palette.glassSurface,
                            modifier = Modifier.fillMaxWidth().height(8.dp)
                        )
                        fardRows.forEach { (field, label, checked) ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { vm.toggleIstiqomatField(field) }
                                    .padding(vertical = 2.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Checkbox(checked = checked, onCheckedChange = { vm.toggleIstiqomatField(field) })
                                Text(label, style = MaterialTheme.typography.bodyMedium, color = palette.textPrimary)
                            }
                        }
                    }
                }
            }

            item {
                AsakaGlassCard(cornerRadius = 18.dp) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Qazo Namozlar Hisoblagichi (Jami: $totalQazo)", style = MaterialTheme.typography.titleSmall, color = palette.goldAccent)
                        Text("Oʻqilgan har bir qazo namozni «-» tugmasi orqali kamaytiring.", style = MaterialTheme.typography.labelMedium, color = palette.textSecondary)
                        val qazoItems = listOf(
                            Triple("Bomdod qazo", qFajr) { d: Int -> qFajr = updateQazo("fajr", qFajr + d) },
                            Triple("Peshin qazo", qDhuhr) { d: Int -> qDhuhr = updateQazo("dhuhr", qDhuhr + d) },
                            Triple("Asr qazo", qAsr) { d: Int -> qAsr = updateQazo("asr", qAsr + d) },
                            Triple("Shom qazo", qMaghrib) { d: Int -> qMaghrib = updateQazo("maghrib", qMaghrib + d) },
                            Triple("Xufton qazo", qIsha) { d: Int -> qIsha = updateQazo("isha", qIsha + d) },
                            Triple("Vitr qazo", qWitr) { d: Int -> qWitr = updateQazo("witr", qWitr + d) }
                        )
                        qazoItems.forEach { (label, count, updater) ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(label, style = MaterialTheme.typography.bodyMedium, color = palette.textPrimary)
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    IconButton(onClick = { updater(-1) }) {
                                        Icon(Icons.Rounded.Remove, contentDescription = "Kamaytirish", tint = palette.emeraldAccent)
                                    }
                                    Text("$count", style = MaterialTheme.typography.titleSmall, color = palette.goldAccent, fontWeight = FontWeight.Bold)
                                    IconButton(onClick = { updater(1) }) {
                                        Icon(Icons.Rounded.Add, contentDescription = "Qoʻshish", tint = palette.textSecondary)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// 4. Smart Reminder Dashboard (`reminder_dashboard`)
// ---------------------------------------------------------------------------
@Composable
fun ReminderDashboardScreen(
    state: AsakaUiState,
    vm: AsakaAppViewModel,
    onBack: () -> Unit,
    onOpenPlanner: () -> Unit
) {
    val palette = LocalAsakaColors.current

    Column(modifier = Modifier.fillMaxSize()) {
        V7ModuleTopBar(
            title = "Aqlli Eslatmalar Markazi",
            subtitle = "Azon · Qurʼon · Hifz · Zikr · WorkManager fon jadvali",
            onBack = onBack
        )
        LazyColumn(
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 110.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                AsakaGlassCard(elevated = true, borderColor = palette.goldAccent) {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Rounded.NotificationsActive, contentDescription = null, tint = palette.goldAccent)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Barcha Eslatma Kanallari", style = MaterialTheme.typography.titleMedium, color = palette.goldAccent)
                        }
                        ReminderSwitchRow(
                            title = "5 Vaqt Namoz & Azon Eslatmasi",
                            subtitle = "Tanlangan hudud (${state.settings.selectedCityName}) jadvali boʻyicha",
                            checked = state.settings.prayerNotificationsEnabled,
                            onChange = { vm.updatePrayerNotifications(it) }
                        )
                        ReminderSwitchRow(
                            title = "Kunlik Qurʼon Tilovati Eslatmasi",
                            subtitle = "Kunlik maqsad: ${state.settings.dailyQuranGoalMinutes} daqiqa",
                            checked = state.settings.quranReminderEnabled,
                            onChange = { vm.updateSmartReminders(quran = it) }
                        )
                        ReminderSwitchRow(
                            title = "Hifz va Murojaʼa Eslatmasi",
                            subtitle = "Faol Hifz boʻlimlari: ${state.hifzItems.size} ta",
                            checked = state.settings.hifzReminderEnabled,
                            onChange = { vm.updateSmartReminders(hifz = it) }
                        )
                        ReminderSwitchRow(
                            title = "Tonggi va Kechki Zikr Eslatmasi",
                            subtitle = "Kunlik zikr maqsadi: ${state.settings.dailyDhikrGoal}",
                            checked = state.settings.dhikrReminderEnabled,
                            onChange = { vm.updateSmartReminders(dhikr = it) }
                        )
                        OutlinedButton(onClick = onOpenPlanner, modifier = Modifier.fillMaxWidth()) {
                            Text("Ibodat Rejalashtirgichini Ochish", color = palette.goldAccent)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ReminderSwitchRow(
    title: String,
    subtitle: String,
    checked: Boolean,
    onChange: (Boolean) -> Unit
) {
    val palette = LocalAsakaColors.current
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Column(modifier = Modifier.weight(1f).padding(end = 8.dp)) {
            Text(title, style = MaterialTheme.typography.bodyMedium, color = palette.textPrimary)
            Text(subtitle, style = MaterialTheme.typography.labelMedium, color = palette.textSecondary)
        }
        Switch(checked = checked, onCheckedChange = onChange)
    }
}

// ---------------------------------------------------------------------------
// 5. Mosque Public Display (`display`)
// ---------------------------------------------------------------------------
@Composable
fun PublicDisplayScreen(
    state: AsakaUiState,
    onBack: () -> Unit
) {
    val palette = LocalAsakaColors.current
    val pr = state.prayerSchedule
    val times = listOf(
        "Bomdod" to (pr?.fajr ?: "--:--"),
        "Quyosh" to (pr?.sunrise ?: "--:--"),
        "Peshin" to (pr?.dhuhr ?: "--:--"),
        "Asr" to (pr?.asr ?: "--:--"),
        "Shom" to (pr?.maghrib ?: "--:--"),
        "Xufton" to (pr?.isha ?: "--:--")
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF040A08))
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.LiveTv, contentDescription = null, tint = palette.goldAccent, modifier = Modifier.size(26.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Column {
                    Text("ASAKA ZIYO · Ommaviy Masjid Ekrani", style = MaterialTheme.typography.titleMedium, color = palette.goldAccent, fontWeight = FontWeight.Bold)
                    Text("${pr?.cityName ?: "Asaka"} · ${pr?.localDate ?: ""} · ${pr?.sourceMode ?: "MANUAL_ADMIN"}", style = MaterialTheme.typography.labelMedium, color = palette.emeraldAccent)
                }
            }
            OutlinedButton(onClick = onBack) { Text("Yopish", color = palette.goldAccent) }
        }

        AsakaGlassCard(elevated = true, borderColor = palette.goldAccent) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                Text("Keyingi Namoz", style = MaterialTheme.typography.labelMedium, color = palette.textSecondary)
                Text(
                    "${pr?.nextPrayerName ?: "Namoz"} · ${pr?.nextPrayerTime ?: "--:--"}",
                    style = MaterialTheme.typography.headlineMedium,
                    color = palette.goldAccent,
                    fontWeight = FontWeight.ExtraBold
                )
            }
        }

        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            times.chunked(2).forEach { pair ->
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    pair.forEach { (name, t) ->
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = palette.glassSurfaceElevated,
                            border = BorderStroke(1.dp, palette.luminousBorder),
                            modifier = Modifier.weight(1f)
                        ) {
                            Column(modifier = Modifier.padding(14.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(name, style = MaterialTheme.typography.labelMedium, color = palette.textSecondary)
                                Text(t, style = MaterialTheme.typography.headlineSmall, color = palette.textPrimary, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }

        val dailyAyah = state.centralDb.dailyWisdom?.ayahTranslation?.ifBlank { null }
            ?: AsakaCatalogData.allSurahs.firstOrNull()?.let { "Albatta, qiyinchilik bilan birga yengillik bordir. (Sharh, 5–6)" }
            ?: ""
        AsakaGlassCard(cornerRadius = 16.dp) {
            Text(dailyAyah, style = MaterialTheme.typography.bodyMedium, color = palette.textPrimary, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
        }
    }
}
