package uz.asakaziyo.app.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Bookmark
import androidx.compose.material.icons.rounded.BookmarkBorder
import androidx.compose.material.icons.rounded.CloudDone
import androidx.compose.material.icons.rounded.CloudDownload
import androidx.compose.material.icons.rounded.ContentCopy
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material.icons.rounded.FormatSize
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.asakaziyo.app.data.AsakaCatalogData
import uz.asakaziyo.app.data.MushafAyah
import uz.asakaziyo.app.ui.theme.AsakaGlassCard
import uz.asakaziyo.app.ui.theme.AsakaShimmerBox
import uz.asakaziyo.app.ui.theme.LocalAsakaColors
import uz.asakaziyo.app.viewmodel.AsakaUiState

@Composable
fun QuranScreen(
    state: AsakaUiState,
    onOpenSurah: (Int) -> Unit,
    onCloseReader: () -> Unit,
    onDownloadSurahOffline: (Int) -> Unit,
    onSaveBookmark: (Int, String, Int, String) -> Unit,
    onDeleteBookmark: (Int, Int) -> Unit,
    onUpdateMushafDisplay: (Int, Boolean) -> Unit
) {
    if (state.activeSurahNumber != null) {
        NativeMushafReader(
            state = state,
            surahNumber = state.activeSurahNumber,
            onBack = onCloseReader,
            onDownloadOffline = { onDownloadSurahOffline(state.activeSurahNumber) },
            onSaveBookmark = onSaveBookmark,
            onUpdateDisplay = onUpdateMushafDisplay
        )
        return
    }

    val palette = LocalAsakaColors.current
    var subTab by remember { mutableIntStateOf(0) } // 0=Sura, 1=Juz, 2=604 Sahifa, 3=Xatcho'p
    var query by remember { mutableStateOf("") }
    val tabs = listOf("114 Sura", "30 Juz", "604 Sahifa", "Xatchoʻp")

    val filteredSurahs = remember(query) {
        val q = query.trim().lowercase()
        if (q.isBlank()) AsakaCatalogData.allSurahs
        else AsakaCatalogData.allSurahs.filter {
            it.nameUz.lowercase().contains(q) || it.nameAr.contains(q) || it.number.toString() == q
        }
    }

    Column(modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 12.dp)) {
        Text("Qurʼoni Karim va Madina Mushafi", style = MaterialTheme.typography.headlineSmall, color = palette.textPrimary)
        Text(
            "Tekshirilgan Usmoniy arabiy matn · ${state.cachedMushafSurahs.size}/114 sura oflayn",
            style = MaterialTheme.typography.bodySmall,
            color = palette.textSecondary
        )
        Spacer(modifier = Modifier.height(10.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
            tabs.forEachIndexed { idx, label ->
                val active = subTab == idx
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = if (active) palette.goldSoftBg else palette.glassSurface,
                    border = BorderStroke(1.dp, if (active) palette.goldAccent else palette.luminousBorder),
                    modifier = Modifier.weight(1f).clickable { subTab = idx }
                ) {
                    Text(
                        text = label,
                        color = if (active) palette.goldAccent else palette.textSecondary,
                        style = MaterialTheme.typography.labelMedium,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(vertical = 8.dp)
                    )
                }
            }
        }
        Spacer(modifier = Modifier.height(10.dp))

        when (subTab) {
            0 -> {
                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it },
                    placeholder = { Text("Sura nomi yoki raqami (1–114)...", color = palette.textMuted) },
                    leadingIcon = { Icon(Icons.Rounded.Search, contentDescription = null, tint = palette.goldAccent) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(10.dp))
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    contentPadding = PaddingValues(bottom = 90.dp)
                ) {
                    items(filteredSurahs, key = { it.number }) { surah ->
                        val isOffline = state.cachedMushafSurahs.contains(surah.number)
                        AsakaGlassCard(cornerRadius = 16.dp, onClick = { onOpenSurah(surah.number) }) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                    Surface(shape = RoundedCornerShape(10.dp), color = palette.goldSoftBg) {
                                        Text(
                                            text = "${surah.number}",
                                            color = palette.goldAccent,
                                            style = MaterialTheme.typography.titleSmall,
                                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column {
                                        Text(surah.nameUz, style = MaterialTheme.typography.titleSmall, color = palette.textPrimary)
                                        Text(
                                            "${surah.revelationType} · ${surah.ayahCount} oyat · ${surah.juzStart}-juz · ${surah.startPage}-bet",
                                            style = MaterialTheme.typography.labelMedium,
                                            color = palette.textSecondary
                                        )
                                    }
                                }
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(surah.nameAr, style = MaterialTheme.typography.titleMedium, color = palette.goldAccent)
                                    Spacer(modifier = Modifier.width(6.dp))
                                    IconButton(onClick = { onDownloadSurahOffline(surah.number) }) {
                                        Icon(
                                            imageVector = if (isOffline) Icons.Rounded.CloudDone else Icons.Rounded.CloudDownload,
                                            contentDescription = "Offline",
                                            tint = if (isOffline) palette.emeraldAccent else palette.textMuted,
                                            modifier = Modifier.size(18.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
            1 -> {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp), contentPadding = PaddingValues(bottom = 90.dp)) {
                    items((1..30).toList()) { juz ->
                        val surahsInJuz = AsakaCatalogData.allSurahs.filter { it.juzStart == juz }
                        val firstSurah = surahsInJuz.firstOrNull() ?: AsakaCatalogData.allSurahs.first()
                        AsakaGlassCard(cornerRadius = 16.dp, onClick = { onOpenSurah(firstSurah.number) }) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Column {
                                    Text("$juz-Juz (Pora)", style = MaterialTheme.typography.titleSmall, color = palette.goldAccent)
                                    Text(
                                        surahsInJuz.joinToString(", ") { "${it.number}. ${it.nameUz}" }.ifBlank { "Davomiy sura" },
                                        style = MaterialTheme.typography.bodySmall,
                                        color = palette.textSecondary
                                    )
                                }
                                Text("${firstSurah.startPage}-bet", style = MaterialTheme.typography.labelMedium, color = palette.emeraldAccent)
                            }
                        }
                    }
                }
            }
            2 -> {
                val pages = remember { (1..604).toList() }
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp), contentPadding = PaddingValues(bottom = 90.dp)) {
                    items(pages.chunked(4)) { rowPages ->
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                            rowPages.forEach { pageNum ->
                                val surahForPage = AsakaCatalogData.allSurahs.lastOrNull { it.startPage <= pageNum }
                                    ?: AsakaCatalogData.allSurahs.first()
                                Surface(
                                    shape = RoundedCornerShape(14.dp),
                                    color = palette.glassSurface,
                                    border = BorderStroke(1.dp, palette.luminousBorder),
                                    modifier = Modifier.weight(1f).clickable { onOpenSurah(surahForPage.number) }
                                ) {
                                    Column(
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                        modifier = Modifier.padding(vertical = 10.dp, horizontal = 4.dp)
                                    ) {
                                        Text("$pageNum", style = MaterialTheme.typography.titleSmall, color = palette.goldAccent, fontWeight = FontWeight.Bold)
                                        Text(surahForPage.nameUz, style = MaterialTheme.typography.labelMedium, color = palette.textSecondary, maxLines = 1)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            3 -> {
                if (state.bookmarks.isEmpty()) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("Hozircha saqlangan xatchoʻplar yoʻq.", color = palette.textMuted)
                    }
                } else {
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp), contentPadding = PaddingValues(bottom = 90.dp)) {
                        items(state.bookmarks) { bm ->
                            AsakaGlassCard(cornerRadius = 16.dp, onClick = { onOpenSurah(bm.surahNumber) }) {
                                Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text("${bm.surahNumber}. ${bm.surahName} · ${bm.ayahNumber}-oyat", style = MaterialTheme.typography.titleSmall, color = palette.goldAccent)
                                        if (bm.note.isNotBlank()) {
                                            Text(bm.note, style = MaterialTheme.typography.bodySmall, color = palette.textSecondary)
                                        }
                                    }
                                    IconButton(onClick = { onDeleteBookmark(bm.surahNumber, bm.ayahNumber) }) {
                                        Icon(Icons.Rounded.Delete, contentDescription = "Delete", tint = palette.danger, modifier = Modifier.size(18.dp))
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

@Composable
private fun NativeMushafReader(
    state: AsakaUiState,
    surahNumber: Int,
    onBack: () -> Unit,
    onDownloadOffline: () -> Unit,
    onSaveBookmark: (Int, String, Int, String) -> Unit,
    onUpdateDisplay: (Int, Boolean) -> Unit
) {
    val context = LocalContext.current
    val palette = LocalAsakaColors.current
    val summary = AsakaCatalogData.allSurahs.firstOrNull { it.number == surahNumber }
    val lightPaper = state.settings.mushafLightPaper
    val fontSize = state.settings.mushafFontSizeSp
    var tajweedHighlight by remember { mutableStateOf(true) }
    var bookmarkAyahTarget by remember { mutableStateOf<MushafAyah?>(null) }
    var noteInput by remember { mutableStateOf("") }

    val paperBg = if (lightPaper) Color(0xFFFBF6E9) else Color.Transparent
    val arabicColor = if (lightPaper) Color(0xFF14241E) else palette.textPrimary
    val transColor = if (lightPaper) Color(0xFF42524C) else palette.textSecondary

    Column(modifier = Modifier.fillMaxSize().background(paperBg)) {
        // Reader Top Toolbar
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Back", tint = palette.goldAccent)
                }
                Column {
                    Text(
                        "${summary?.number ?: surahNumber}. ${summary?.nameUz ?: "Sura"}",
                        style = MaterialTheme.typography.titleMedium,
                        color = if (lightPaper) Color(0xFF14241E) else palette.textPrimary
                    )
                    Text(
                        "${summary?.nameAr ?: ""} · ${summary?.startPage ?: 1}-bet · ${summary?.ayahCount ?: 0} oyat",
                        style = MaterialTheme.typography.labelMedium,
                        color = palette.goldAccent
                    )
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = { tajweedHighlight = !tajweedHighlight }) {
                    Text(if (tajweedHighlight) "Tajvid ON" else "Tajvid", color = palette.emeraldAccent, style = MaterialTheme.typography.labelMedium)
                }
                IconButton(onClick = { onUpdateDisplay(if (fontSize >= 36) 22 else fontSize + 4, lightPaper) }) {
                    Icon(Icons.Rounded.FormatSize, contentDescription = "Font Size", tint = palette.goldAccent)
                }
                TextButton(onClick = { onUpdateDisplay(fontSize, !lightPaper) }) {
                    Text(if (lightPaper) "OLED" else "Qogʻoz", color = palette.goldAccent, style = MaterialTheme.typography.labelMedium)
                }
                IconButton(onClick = onDownloadOffline) {
                    Icon(
                        imageVector = if (state.cachedMushafSurahs.contains(surahNumber)) Icons.Rounded.CloudDone else Icons.Rounded.CloudDownload,
                        contentDescription = "Save Offline",
                        tint = palette.emeraldAccent
                    )
                }
            }
        }

        if (state.isLoadingMushaf) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                repeat(5) { AsakaShimmerBox(modifier = Modifier.fillMaxWidth().height(92.dp)) }
            }
        } else {
            LazyColumn(
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 100.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                if (surahNumber != 1 && surahNumber != 9) {
                    item {
                        Text(
                            text = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
                            color = palette.goldAccent,
                            fontSize = (fontSize + 2).sp,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)
                        )
                    }
                }
                items(state.activeSurahAyahs, key = { it.numberInSurah }) { ayah ->
                    val isBookmarked = state.bookmarks.any { it.surahNumber == surahNumber && it.ayahNumber == ayah.numberInSurah }
                    Surface(
                        shape = RoundedCornerShape(18.dp),
                        color = if (lightPaper) Color(0xFFFFFFFF) else palette.glassSurface,
                        border = BorderStroke(
                            1.dp,
                            if (tajweedHighlight && ayah.numberInSurah % 2 == 0) palette.emeraldAccent.copy(alpha = 0.4f) else palette.luminousBorder
                        )
                    ) {
                        Column(modifier = Modifier.fillMaxWidth().padding(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Surface(shape = RoundedCornerShape(8.dp), color = palette.goldSoftBg) {
                                    Text(
                                        "${surahNumber}:${ayah.numberInSurah}",
                                        color = palette.goldAccent,
                                        style = MaterialTheme.typography.labelMedium,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                    )
                                }
                                Row {
                                    IconButton(onClick = {
                                        val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                        cm.setPrimaryClip(ClipData.newPlainText("Oyat", "${ayah.arabicText}\n\n${ayah.translationUz}\n(${summary?.nameUz} ${ayah.numberInSurah})"))
                                    }) {
                                        Icon(Icons.Rounded.ContentCopy, contentDescription = "Copy", tint = palette.textMuted, modifier = Modifier.size(18.dp))
                                    }
                                    IconButton(onClick = {
                                        val send = Intent(Intent.ACTION_SEND).apply {
                                            type = "text/plain"
                                            putExtra(Intent.EXTRA_TEXT, "${ayah.arabicText}\n\n${ayah.translationUz}\n— ${summary?.nameUz} ${ayah.numberInSurah} (ASAKA ZIYO)")
                                        }
                                        context.startActivity(Intent.createChooser(send, "Oyatni ulashish"))
                                    }) {
                                        Icon(Icons.Rounded.Share, contentDescription = "Share", tint = palette.textMuted, modifier = Modifier.size(18.dp))
                                    }
                                    IconButton(onClick = {
                                        noteInput = state.bookmarks.firstOrNull { it.surahNumber == surahNumber && it.ayahNumber == ayah.numberInSurah }?.note.orEmpty()
                                        bookmarkAyahTarget = ayah
                                    }) {
                                        Icon(
                                            imageVector = if (isBookmarked) Icons.Rounded.Bookmark else Icons.Rounded.BookmarkBorder,
                                            contentDescription = "Bookmark",
                                            tint = if (isBookmarked) palette.goldAccent else palette.textMuted,
                                            modifier = Modifier.size(19.dp)
                                        )
                                    }
                                }
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                                Text(
                                    text = ayah.arabicText,
                                    color = arabicColor,
                                    fontSize = fontSize.sp,
                                    lineHeight = (fontSize * 1.75f).sp,
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                            Spacer(modifier = Modifier.height(10.dp))
                            Text(
                                text = ayah.translationUz,
                                color = transColor,
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                    }
                }
            }
        }
    }

    bookmarkAyahTarget?.let { target ->
        AlertDialog(
            onDismissRequest = { bookmarkAyahTarget = null },
            title = { Text("${summary?.nameUz ?: "Sura"} ${target.numberInSurah}-oyat eslatmasi") },
            text = {
                OutlinedTextField(
                    value = noteInput,
                    onValueChange = { noteInput = it },
                    placeholder = { Text("Shaxsiy eslatma (ixtiyoriy)...") },
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    onSaveBookmark(surahNumber, summary?.nameUz ?: "Sura", target.numberInSurah, noteInput)
                    bookmarkAyahTarget = null
                }) { Text("Saqlash", color = palette.goldAccent) }
            },
            dismissButton = {
                TextButton(onClick = { bookmarkAyahTarget = null }) { Text("Bekor qilish") }
            }
        )
    }
}
