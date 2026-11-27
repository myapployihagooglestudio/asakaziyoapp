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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.asakaziyo.app.data.HifzItem
import uz.asakaziyo.app.ui.theme.AsakaGlassCard
import uz.asakaziyo.app.ui.theme.AsakaProgressRing
import uz.asakaziyo.app.ui.theme.LocalAsakaColors
import uz.asakaziyo.app.viewmodel.AsakaUiState

@Composable
fun LearnScreen(
    state: AsakaUiState,
    onAddHifz: (Int, Int, Int, Int) -> Unit,
    onRecordMurojaa: (HifzItem, Int) -> Unit,
    onOpenSurah: (Int) -> Unit
) {
    val palette = LocalAsakaColors.current
    var tab by remember { mutableIntStateOf(0) } // 0=Hifz, 1=Muroja'a, 2=Tajvid Akademiyasi
    var showAddHifz by remember { mutableStateOf(false) }
    var surahInput by remember { mutableStateOf("108") }
    var fromInput by remember { mutableStateOf("1") }
    var toInput by remember { mutableStateOf("3") }
    var quizAnswer by remember { mutableStateOf<Int?>(null) }

    Column(modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 12.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text("Oʻrganish Markazi", style = MaterialTheme.typography.headlineSmall, color = palette.textPrimary)
                Text("Hifz · Spaced Murojaʼa · Tajvid Akademiyasi", style = MaterialTheme.typography.bodySmall, color = palette.textSecondary)
            }
            if (tab == 0) {
                Button(
                    onClick = { showAddHifz = true },
                    colors = ButtonDefaults.buttonColors(containerColor = palette.goldAccent, contentColor = Color(0xFF031814))
                ) {
                    Icon(Icons.Rounded.Add, contentDescription = null)
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Qoʻshish")
                }
            }
        }
        Spacer(modifier = Modifier.height(10.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            listOf("Hifz", "Murojaʼa", "Tajvid (28 harf)").forEachIndexed { idx, lbl ->
                val active = tab == idx
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = if (active) palette.goldSoftBg else palette.glassSurface,
                    border = BorderStroke(1.dp, if (active) palette.goldAccent else palette.luminousBorder),
                    modifier = Modifier.weight(1f).clickable { tab = idx }
                ) {
                    Text(
                        lbl,
                        color = if (active) palette.goldAccent else palette.textSecondary,
                        style = MaterialTheme.typography.labelMedium,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(vertical = 9.dp)
                    )
                }
            }
        }
        Spacer(modifier = Modifier.height(12.dp))

        when (tab) {
            0 -> {
                val avg = if (state.hifzItems.isEmpty()) 0 else state.hifzItems.map { it.masteryScore }.average().toInt()
                LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp), contentPadding = PaddingValues(bottom = 95.dp)) {
                    item {
                        AsakaGlassCard(elevated = true) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                AsakaProgressRing(progress = avg / 100f, size = 64.dp) {
                                    Text("$avg%", style = MaterialTheme.typography.labelMedium, color = palette.goldAccent, fontWeight = FontWeight.Bold)
                                }
                                Spacer(modifier = Modifier.width(14.dp))
                                Column {
                                    Text("Umumiy Hifz oʻzlashtirish", style = MaterialTheme.typography.titleSmall, color = palette.textPrimary)
                                    Text("${state.hifzItems.size} ta yodlangan qism · Oflayn SQLite + Bulut sinxron", style = MaterialTheme.typography.bodySmall, color = palette.textSecondary)
                                }
                            }
                        }
                    }
                    items(state.hifzItems) { item ->
                        AsakaGlassCard(cornerRadius = 16.dp, onClick = { onOpenSurah(item.surahNumber) }) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Column {
                                    Text("${item.surahNumber}. ${item.surahNameUz} (${item.ayahFrom}–${item.ayahTo}-oyat)", style = MaterialTheme.typography.titleSmall, color = palette.textPrimary)
                                    Text("Takror: ${item.repetitions} marta · Keyingi: ${item.nextReviewIso}", style = MaterialTheme.typography.bodySmall, color = palette.textSecondary)
                                }
                                Surface(shape = RoundedCornerShape(10.dp), color = palette.emeraldSoftBg) {
                                    Text("${item.masteryScore}%", color = palette.emeraldAccent, style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp))
                                }
                            }
                        }
                    }
                }
            }
            1 -> {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp), contentPadding = PaddingValues(bottom = 95.dp)) {
                    item {
                        Text("Kunlik Murojaʼa (Takrorlash) vazifalari", style = MaterialTheme.typography.titleSmall, color = palette.goldAccent)
                    }
                    items(state.hifzItems) { item ->
                        AsakaGlassCard(cornerRadius = 16.dp) {
                            Column {
                                Text("${item.surahNumber}. ${item.surahNameUz} (${item.ayahFrom}–${item.ayahTo}-oyat)", style = MaterialTheme.typography.titleSmall, color = palette.textPrimary)
                                Text("Joriy oʻzlashtirish: ${item.masteryScore}% · ${item.repetitions} marta takrorlangan", style = MaterialTheme.typography.bodySmall, color = palette.textSecondary)
                                Spacer(modifier = Modifier.height(8.dp))
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    listOf(100 to "Aʼlo (100%)", 75 to "Yaxshi (75%)", 50 to "Qiyin (50%)").forEach { (score, lbl) ->
                                        Surface(
                                            shape = RoundedCornerShape(10.dp),
                                            color = if (score == 100) palette.emeraldSoftBg else palette.goldSoftBg,
                                            modifier = Modifier.clickable { onRecordMurojaa(item, score) }
                                        ) {
                                            Text(lbl, color = if (score == 100) palette.emeraldAccent else palette.goldAccent, style = MaterialTheme.typography.labelMedium, modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp))
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            2 -> {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp), contentPadding = PaddingValues(bottom = 95.dp)) {
                    item {
                        Text("Arab Alifbosi va Maxrajlar (${state.arabicAlphabet.size} harf)", style = MaterialTheme.typography.titleSmall, color = palette.goldAccent)
                    }
                    items(state.arabicAlphabet.chunked(2)) { pair ->
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                            pair.forEach { letter ->
                                AsakaGlassCard(modifier = Modifier.weight(1f), cornerRadius = 14.dp) {
                                    Column {
                                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                            Text(letter.nameUz, style = MaterialTheme.typography.titleSmall, color = palette.textPrimary)
                                            Text(letter.letter, fontSize = 24.sp, color = palette.goldAccent, fontWeight = FontWeight.Bold)
                                        }
                                        Text(letter.makhrajUz, style = MaterialTheme.typography.bodySmall, color = palette.textSecondary)
                                    }
                                }
                            }
                        }
                    }
                    item {
                        Spacer(modifier = Modifier.height(6.dp))
                        Text("Tajvid Darslari (Boshlangʻich · Oʻrta · Yuqori)", style = MaterialTheme.typography.titleSmall, color = palette.goldAccent)
                    }
                    items(state.tajweedLessons) { lesson ->
                        AsakaGlassCard(cornerRadius = 16.dp) {
                            Column {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text(lesson.titleUz, style = MaterialTheme.typography.titleSmall, color = palette.textPrimary, modifier = Modifier.weight(1f))
                                    Text(lesson.level.uppercase(), style = MaterialTheme.typography.labelMedium, color = palette.emeraldAccent)
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(lesson.summaryUz, style = MaterialTheme.typography.bodySmall, color = palette.textSecondary)
                            }
                        }
                    }
                    item {
                        AsakaGlassCard(cornerRadius = 16.dp, borderColor = palette.goldAccent) {
                            Column {
                                Text("Tajvid Mini-Testi", style = MaterialTheme.typography.titleSmall, color = palette.goldAccent)
                                Spacer(modifier = Modifier.height(4.dp))
                                Text("Sokin nun (نْ) dan keyin «ب» harfi kelsa qaysi tajvid qoidasi qoʻllaniladi?", style = MaterialTheme.typography.bodyMedium, color = palette.textPrimary)
                                Spacer(modifier = Modifier.height(8.dp))
                                listOf("Izhor", "Iqlob", "Idgʻom").forEachIndexed { idx, opt ->
                                    val chosen = quizAnswer == idx
                                    val correct = idx == 1
                                    Surface(
                                        shape = RoundedCornerShape(10.dp),
                                        color = when {
                                            chosen && correct -> palette.emeraldSoftBg
                                            chosen && !correct -> palette.danger.copy(alpha = 0.2f)
                                            else -> palette.glassSurfaceElevated
                                        },
                                        modifier = Modifier.fillMaxWidth().padding(vertical = 3.dp).clickable { quizAnswer = idx }
                                    ) {
                                        Row(modifier = Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text(opt, color = palette.textPrimary, style = MaterialTheme.typography.bodyMedium)
                                            if (chosen && correct) Icon(Icons.Rounded.CheckCircle, contentDescription = null, tint = palette.emeraldAccent)
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

    if (showAddHifz) {
        AlertDialog(
            onDismissRequest = { showAddHifz = false },
            title = { Text("Yangi Hifz qismini qoʻshish") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(value = surahInput, onValueChange = { surahInput = it }, label = { Text("Sura raqami (1–114)") })
                    OutlinedTextField(value = fromInput, onValueChange = { fromInput = it }, label = { Text("Boshlangʻich oyat") })
                    OutlinedTextField(value = toInput, onValueChange = { toInput = it }, label = { Text("Oxirgi oyat") })
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    val s = surahInput.toIntOrNull()?.coerceIn(1, 114) ?: 108
                    val f = fromInput.toIntOrNull()?.coerceAtLeast(1) ?: 1
                    val t = toInput.toIntOrNull()?.coerceAtLeast(f) ?: f
                    onAddHifz(s, f, t, 85)
                    showAddHifz = false
                }) { Text("Saqlash", color = palette.goldAccent) }
            },
            dismissButton = { TextButton(onClick = { showAddHifz = false }) { Text("Bekor qilish") } }
        )
    }
}
