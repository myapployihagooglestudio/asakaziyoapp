package uz.asakaziyo.app.ui.screens

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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.MenuBook
import androidx.compose.material.icons.automirrored.rounded.Send
import androidx.compose.material.icons.rounded.AccountBalance
import androidx.compose.material.icons.rounded.AdminPanelSettings
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.Bookmark
import androidx.compose.material.icons.rounded.BookmarkBorder
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.Campaign
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.CloudDone
import androidx.compose.material.icons.rounded.CompassCalibration
import androidx.compose.material.icons.rounded.Flag
import androidx.compose.material.icons.rounded.Forum
import androidx.compose.material.icons.rounded.Gavel
import androidx.compose.material.icons.rounded.GraphicEq
import androidx.compose.material.icons.rounded.Headphones
import androidx.compose.material.icons.automirrored.rounded.LibraryBooks
import androidx.compose.material.icons.rounded.EmojiEvents
import androidx.compose.material.icons.rounded.HistoryEdu
import androidx.compose.material.icons.rounded.LiveTv
import androidx.compose.material.icons.rounded.NotificationsActive
import androidx.compose.material.icons.rounded.Speed
import androidx.compose.material.icons.rounded.Newspaper
import androidx.compose.material.icons.rounded.NightsStay
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Quiz
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material.icons.rounded.School
import androidx.compose.material.icons.rounded.Share
import androidx.compose.material.icons.rounded.VolunteerActivism
import androidx.compose.material.icons.rounded.WorkspacePremium
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.asakaziyo.app.data.ArticleItem
import uz.asakaziyo.app.ui.theme.AsakaGlassCard
import uz.asakaziyo.app.ui.theme.LocalAsakaColors
import uz.asakaziyo.app.viewmodel.AsakaAppViewModel
import uz.asakaziyo.app.viewmodel.AsakaUiState

@Composable
private fun EcosystemTopBar(
    title: String,
    subtitle: String,
    onBack: () -> Unit,
    onRefresh: (() -> Unit)? = null
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
            Text(title, style = MaterialTheme.typography.titleMedium, color = palette.textPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(subtitle, style = MaterialTheme.typography.labelMedium, color = palette.textSecondary, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        if (onRefresh != null) {
            IconButton(onClick = onRefresh) {
                Icon(Icons.Rounded.Refresh, contentDescription = "Refresh", tint = palette.goldAccent)
            }
        }
    }
}

private data class ServiceTileSpec(
    val id: String,
    val title: String,
    val subtitle: String,
    val icon: ImageVector,
    val badge: String = ""
)

/**
 * Unified "Barcha 27 ta Xizmat" Native Launcher Grid — 100% Web App Feature Parity
 */
@Composable
fun AllServicesHubScreen(
    state: AsakaUiState,
    onBack: () -> Unit,
    onOpenModule: (String) -> Unit,
    onRefresh: () -> Unit
) {
    val palette = LocalAsakaColors.current
    var query by remember { mutableStateOf("") }
    val db = state.centralDb
    val unreadCount = db.notifications.count { it.id !in state.readNotificationIds }

    val allServices = remember(db, state.scholars, state.mosques, state.favorites, unreadCount, state.adminSession) {
        listOf(
            ServiceTileSpec("prayer", "Namoz Vaqtlari", "Asaka MANUAL + 14 Hudud + Jahon", Icons.Rounded.Schedule),
            ServiceTileSpec("qibla", "Qibla Kompasi", "3D Sensorli Kaʼba yoʻnalishi", Icons.Rounded.CompassCalibration),
            ServiceTileSpec("articles", "Maqolalar", "Ilmiy-maʼrifiy maqolalar", Icons.AutoMirrored.Rounded.MenuBook, if (db.articles.isNotEmpty()) "${db.articles.size}" else ""),
            ServiceTileSpec("news", "Yangiliklar", "Soʻnggi islomiy xabarlar", Icons.Rounded.Newspaper, if (db.news.isNotEmpty()) "${db.news.size}" else ""),
            ServiceTileSpec("announcements", "Eʼlonlar", "Masjid va tizim eʼlonlari", Icons.Rounded.Campaign, if (db.announcements.isNotEmpty()) "${db.announcements.size}" else ""),
            ServiceTileSpec("hadith", "Hadis va Duolar", "Sahih hadislar va duolar", Icons.Rounded.AutoAwesome, if (db.dynamicHadiths.isNotEmpty()) "+${db.dynamicHadiths.size}" else ""),
            ServiceTileSpec("tasbeh", "Zikr va Tasbeh", "Raqamli tasbeh + kunlik zikr", Icons.Rounded.GraphicEq),
            ServiceTileSpec("community", "Hamjamiyat & Chat", "Jonli suhbat va Imomga savol", Icons.Rounded.Forum, if (db.communityMessages.isNotEmpty()) "${db.communityMessages.size}" else ""),
            ServiceTileSpec("charity", "Xayriya & Tadbirlar", "Masjid tadbirlari va ehson", Icons.Rounded.VolunteerActivism),
            ServiceTileSpec("quiz", "Islomiy Viktorina", "Kunlik Qurʼon va bilim testi", Icons.Rounded.Quiz),
            ServiceTileSpec("khatm", "Xatm & Istiqomat", "30 juz reja va kunlik nazorat", Icons.Rounded.CheckCircle),
            ServiceTileSpec("library", "Raqamli Kutubxona", "Elektron kitoblar va darslar", Icons.AutoMirrored.Rounded.LibraryBooks, if (db.digitalBooks.isNotEmpty()) "${db.digitalBooks.size}" else ""),
            ServiceTileSpec("media", "Media & Azon", "Audio/Video va Azon kutubxonasi", Icons.Rounded.Headphones),
            ServiceTileSpec("academy", "Islom Akademiyasi", "Fiqh, aqiyda va tajvid kurslari", Icons.Rounded.School, if (db.academyLessons.isNotEmpty()) "${db.academyLessons.size}" else ""),
            ServiceTileSpec("scholars", "Allomalar", "Buyuk islom ulamolari merosi", Icons.Rounded.AccountBalance),
            ServiceTileSpec("mosques", "Masjidlar", "Asaka va Oʻzbekiston masjidlari", Icons.Rounded.AccountBalance),
            ServiceTileSpec("calendar", "Hijriy Taqvim", "Muhim kunlar va Ramazon", Icons.Rounded.CalendarMonth),
            ServiceTileSpec("fasting", "Roʻza & Saharlik", "Saharlik va Iftorlik taymeri", Icons.Rounded.NightsStay),
            ServiceTileSpec("prayer_journal", "Namoz Kundaligi", "5 vaqt farz va qazo hisobi", Icons.Rounded.CheckCircle),
            ServiceTileSpec("daily_archive", "Kunlik Hikmatlar", "Oyat, hadis va duolar arxivi", Icons.Rounded.HistoryEdu),
            ServiceTileSpec("achievements", "Islomiy Yutuqlar", "Daraja, XP va ibodat nishonlari", Icons.Rounded.EmojiEvents),
            ServiceTileSpec("reminder_dashboard", "Aqlli Eslatmalar", "Azon, Qurʼon, Hifz va Zikr jadvali", Icons.Rounded.NotificationsActive),
            ServiceTileSpec("planner", "Ibodat Rejalashtirgich", "Shaxsiy kunlik reja va statistika", Icons.Rounded.CalendarMonth),
            ServiceTileSpec("tv", "Masjid Smart TV", "Masjid ekrani rejimi", Icons.Rounded.LiveTv),
            ServiceTileSpec("display", "Ommaviy Ekran", "Toʻliq ekran masjid tablosi", Icons.Rounded.LiveTv),
            ServiceTileSpec("notifications", "Bildirishnomalar", "Push va tizim xabarlari", Icons.Rounded.Notifications, if (unreadCount > 0) "$unreadCount" else ""),
            ServiceTileSpec("favorites", "Sevimlilar", "Saqlangan maqola va hadislar", Icons.Rounded.Bookmark, if (state.favorites.isNotEmpty()) "${state.favorites.size}" else ""),
            ServiceTileSpec("offline", "Oflayn Markaz", "Mushaf, Qori MP3 va sinxron", Icons.Rounded.CloudDone),
            ServiceTileSpec("performance", "Sync & Diagnostika", "Sinxronizatsiya va tizim holati", Icons.Rounded.Speed),
            ServiceTileSpec("ai", "AI Islomiy Ustoz", "Server AI savol-javob", Icons.Rounded.AutoAwesome),
            ServiceTileSpec("legal", "Maxfiylik va Huquq", "Shartlar va hisobni oʻchirish", Icons.Rounded.Gavel),
            ServiceTileSpec("admin", "Admin Boshqaruv", if (state.adminSession.isAuthenticated) "Faol: ${state.adminSession.username}" else "Rol bilan himoyalangan kirish", Icons.Rounded.AdminPanelSettings)
        )
    }

    val filtered = remember(query, allServices) {
        val q = query.trim().lowercase()
        if (q.isBlank()) allServices
        else allServices.filter { it.title.lowercase().contains(q) || it.subtitle.lowercase().contains(q) }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        EcosystemTopBar(
            title = "ASAKA ZIYO — Barcha Xizmatlar",
            subtitle = "Web App bilan 100% sinxron · v${state.contentVersion.take(8).ifBlank { uz.asakaziyo.app.BuildConfig.VERSION_NAME }}",
            onBack = onBack,
            onRefresh = onRefresh
        )
        LazyColumn(
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 110.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            item {
                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it },
                    placeholder = { Text("Boʻlim yoki xizmat qidirish (Maqola, Masjid, Xatm...)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }
            val rows = filtered.chunked(2)
            items(rows) { pair ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    pair.forEach { svc ->
                        AsakaGlassCard(
                            modifier = Modifier.weight(1f),
                            cornerRadius = 18.dp,
                            onClick = { onOpenModule(svc.id) }
                        ) {
                            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(36.dp)
                                            .clip(CircleShape)
                                            .background(palette.goldSoftBg),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(svc.icon, contentDescription = null, tint = palette.goldAccent, modifier = Modifier.size(19.dp))
                                    }
                                    if (svc.badge.isNotBlank()) {
                                        Surface(
                                            shape = RoundedCornerShape(8.dp),
                                            color = palette.emeraldSoftBg
                                        ) {
                                            Text(
                                                svc.badge,
                                                color = palette.emeraldAccent,
                                                style = MaterialTheme.typography.labelMedium,
                                                modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp)
                                            )
                                        }
                                    }
                                }
                                Text(svc.title, style = MaterialTheme.typography.titleSmall, color = palette.textPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text(svc.subtitle, style = MaterialTheme.typography.labelMedium, color = palette.textSecondary, maxLines = 2, overflow = TextOverflow.Ellipsis)
                            }
                        }
                    }
                    if (pair.size == 1) Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

/**
 * Articles + News + Announcements Screen with Full Reader, Favorites, Share & UGC Report
 */
@Composable
fun ArticlesNewsScreen(
    initialTab: String,
    state: AsakaUiState,
    vm: AsakaAppViewModel,
    onBack: () -> Unit
) {
    val palette = LocalAsakaColors.current
    val context = LocalContext.current
    var activeTab by remember { mutableStateOf(initialTab) } // articles | news | announcements
    var search by remember { mutableStateOf("") }
    var openedArticle by remember { mutableStateOf<ArticleItem?>(null) }
    val favKeys = remember(state.favorites) { state.favorites.map { it.first }.toSet() }

    if (openedArticle != null) {
        val art = openedArticle!!
        val favKey = "article:${art.id}"
        val isFav = favKey in favKeys
        Column(modifier = Modifier.fillMaxSize()) {
            EcosystemTopBar(art.title, "${art.category} · ${art.author} · ${art.date}", onBack = { openedArticle = null })
            LazyColumn(
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 110.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item {
                    AsakaGlassCard(elevated = true) {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Text(art.title, style = MaterialTheme.typography.headlineSmall, color = palette.goldAccent)
                            Text(art.content.ifBlank { art.excerpt }, style = MaterialTheme.typography.bodyMedium, color = palette.textPrimary, lineHeight = 23.sp)
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedButton(onClick = { vm.toggleFavoriteItem(favKey, "Maqola", art.title, art.author) }) {
                                    Icon(if (isFav) Icons.Rounded.Bookmark else Icons.Rounded.BookmarkBorder, contentDescription = null, tint = palette.goldAccent, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(if (isFav) "Saqlangan" else "Saqlash", color = palette.goldAccent)
                                }
                                OutlinedButton(onClick = {
                                    val send = Intent(Intent.ACTION_SEND).apply {
                                        type = "text/plain"
                                        putExtra(Intent.EXTRA_TEXT, "${art.title}\n\n${art.content.take(400)}\n— ASAKA ZIYO")
                                    }
                                    context.startActivity(Intent.createChooser(send, "Maqolani ulashish"))
                                }) {
                                    Icon(Icons.Rounded.Share, contentDescription = null, tint = palette.emeraldAccent, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Ulashish", color = palette.emeraldAccent)
                                }
                                IconButton(onClick = { vm.reportUgcContent("article", art.id, "Foydalanuvchi shikoyati") }) {
                                    Icon(Icons.Rounded.Flag, contentDescription = "Report", tint = palette.textMuted)
                                }
                            }
                        }
                    }
                }
            }
        }
        return
    }

    Column(modifier = Modifier.fillMaxSize()) {
        EcosystemTopBar(
            title = "Maqolalar, Yangiliklar & Eʼlonlar",
            subtitle = "Admin yangilanishlari avtomatik sinxronlanadi",
            onBack = onBack,
            onRefresh = { vm.checkManifestAndRefresh(force = true) }
        )
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            val tabs = listOf(
                "articles" to "Maqolalar (${state.centralDb.articles.size})",
                "news" to "Yangiliklar (${state.centralDb.news.size})",
                "announcements" to "Eʼlonlar (${state.centralDb.announcements.size})"
            )
            items(tabs) { (key, label) ->
                val active = activeTab == key
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = if (active) palette.goldSoftBg else palette.glassSurface,
                    border = BorderStroke(1.dp, if (active) palette.goldAccent else palette.luminousBorder),
                    modifier = Modifier.clickable { activeTab = key }
                ) {
                    Text(label, color = if (active) palette.goldAccent else palette.textSecondary, style = MaterialTheme.typography.labelMedium, modifier = Modifier.padding(horizontal = 14.dp, vertical = 9.dp))
                }
            }
        }
        LazyColumn(
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 6.dp, bottom = 110.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            item {
                OutlinedTextField(
                    value = search,
                    onValueChange = { search = it },
                    placeholder = { Text("Sarlavha yoki mavzu boʻyicha qidirish...") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }
            when (activeTab) {
                "articles" -> {
                    val list = state.centralDb.articles.filter {
                        search.isBlank() || it.title.contains(search, true) || it.content.contains(search, true)
                    }
                    if (list.isEmpty()) {
                        item { EmptySyncCard("Hozircha maqolalar yuklanmoqda yoki boʻsh. Yangilash tugmasini bosing.") }
                    } else {
                        items(list, key = { it.id }) { art ->
                            AsakaGlassCard(cornerRadius = 18.dp, onClick = { openedArticle = art }) {
                                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text(art.category, style = MaterialTheme.typography.labelMedium, color = palette.emeraldAccent)
                                        Text(art.date, style = MaterialTheme.typography.labelMedium, color = palette.textMuted)
                                    }
                                    Text(art.title, style = MaterialTheme.typography.titleMedium, color = palette.textPrimary)
                                    Text(art.excerpt.ifBlank { art.content.take(120) }, style = MaterialTheme.typography.bodySmall, color = palette.textSecondary, maxLines = 3, overflow = TextOverflow.Ellipsis)
                                    Text("Muallif: ${art.author} · Oʻqish →", style = MaterialTheme.typography.labelMedium, color = palette.goldAccent)
                                }
                            }
                        }
                    }
                }
                "news" -> {
                    val list = state.centralDb.news.filter {
                        search.isBlank() || it.title.contains(search, true) || it.content.contains(search, true)
                    }
                    if (list.isEmpty()) {
                        item { EmptySyncCard("Hozircha yangiliklar mavjud emas.") }
                    } else {
                        items(list, key = { it.id }) { n ->
                            AsakaGlassCard(cornerRadius = 18.dp, borderColor = if (n.isUrgent) palette.danger else null) {
                                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text(if (n.isUrgent) "MUHIM YANGILIK" else n.category, style = MaterialTheme.typography.labelMedium, color = if (n.isUrgent) palette.danger else palette.goldAccent)
                                        Text(n.date, style = MaterialTheme.typography.labelMedium, color = palette.textMuted)
                                    }
                                    Text(n.title, style = MaterialTheme.typography.titleMedium, color = palette.textPrimary)
                                    Text(n.content.ifBlank { n.summary }, style = MaterialTheme.typography.bodySmall, color = palette.textSecondary)
                                }
                            }
                        }
                    }
                }
                else -> {
                    val list = state.centralDb.announcements.filter {
                        search.isBlank() || it.title.contains(search, true) || it.message.contains(search, true)
                    }
                    if (list.isEmpty()) {
                        item { EmptySyncCard("Faol eʼlonlar mavjud emas.") }
                    } else {
                        items(list, key = { it.id }) { ann ->
                            AsakaGlassCard(cornerRadius = 18.dp, borderColor = palette.goldAccent) {
                                Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text(ann.title, style = MaterialTheme.typography.titleSmall, color = palette.goldAccent, modifier = Modifier.weight(1f))
                                        Text(ann.date, style = MaterialTheme.typography.labelMedium, color = palette.textMuted)
                                    }
                                    Text(ann.message, style = MaterialTheme.typography.bodyMedium, color = palette.textPrimary)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/**
 * Community Chat, Imam Q&A, Mosque Events & Charity Campaigns
 */
@Composable
fun CommunityScreen(
    initialTab: String,
    state: AsakaUiState,
    vm: AsakaAppViewModel,
    onBack: () -> Unit
) {
    val palette = LocalAsakaColors.current
    var activeTab by remember { mutableStateOf(initialTab) } // chat | imam | events | charity
    var msgInput by remember { mutableStateOf("") }
    var imamQuestion by remember { mutableStateOf("") }

    Column(modifier = Modifier.fillMaxSize()) {
        EcosystemTopBar(
            title = "Hamjamiyat, Imom Q&A & Xayriya",
            subtitle = "Markaziy server bilan real-vaqt sinxron",
            onBack = onBack,
            onRefresh = { vm.checkManifestAndRefresh(force = true) }
        )
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            listOf(
                "chat" to "Suhbat (${state.centralDb.communityMessages.size})",
                "imam" to "Imomga Savol (${state.centralDb.imamInquiries.size})",
                "events" to "Tadbirlar (${state.centralDb.mosqueEvents.size})",
                "charity" to "Xayriya (${state.centralDb.charityCampaigns.size})"
            ).forEach { (k, label) ->
                item {
                    val active = activeTab == k
                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        color = if (active) palette.goldSoftBg else palette.glassSurface,
                        border = BorderStroke(1.dp, if (active) palette.goldAccent else palette.luminousBorder),
                        modifier = Modifier.clickable { activeTab = k }
                    ) {
                        Text(label, color = if (active) palette.goldAccent else palette.textSecondary, style = MaterialTheme.typography.labelMedium, modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp))
                    }
                }
            }
        }

        LazyColumn(
            modifier = Modifier.weight(1f),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            when (activeTab) {
                "chat" -> {
                    val msgs = state.centralDb.communityMessages
                    if (msgs.isEmpty()) item { EmptySyncCard("Hozircha hamjamiyat xabarlari yoʻq. Birinchi boʻlib salom yoʻllang!") }
                    items(msgs, key = { it.id }) { m ->
                        AsakaGlassCard(cornerRadius = 16.dp) {
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text(m.authorName, style = MaterialTheme.typography.titleSmall, color = palette.goldAccent)
                                    IconButton(
                                        onClick = { vm.reportUgcContent("message", m.id, "Nomaqbul xabar") },
                                        modifier = Modifier.size(22.dp)
                                    ) {
                                        Icon(Icons.Rounded.Flag, contentDescription = "Report", tint = palette.textMuted, modifier = Modifier.size(14.dp))
                                    }
                                }
                                Text(m.text, style = MaterialTheme.typography.bodyMedium, color = palette.textPrimary)
                                if (m.createdAt.isNotBlank()) Text(m.createdAt.take(16), style = MaterialTheme.typography.labelMedium, color = palette.textMuted)
                            }
                        }
                    }
                }
                "imam" -> {
                    item {
                        AsakaGlassCard(elevated = true) {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("Imom-xatibga savol yoʻllash", style = MaterialTheme.typography.titleSmall, color = palette.goldAccent)
                                OutlinedTextField(
                                    value = imamQuestion,
                                    onValueChange = { imamQuestion = it },
                                    placeholder = { Text("Sharʼiy yoki fiqhiy savolingizni yozing...") },
                                    modifier = Modifier.fillMaxWidth(),
                                    minLines = 2
                                )
                                Button(
                                    onClick = {
                                        if (imamQuestion.isNotBlank()) {
                                            vm.submitImamInquiry(imamQuestion)
                                            imamQuestion = ""
                                        }
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = palette.goldAccent, contentColor = Color(0xFF031814))
                                ) { Text("Savol yuborish") }
                            }
                        }
                    }
                    items(state.centralDb.imamInquiries, key = { it.id }) { inq ->
                        AsakaGlassCard(cornerRadius = 16.dp) {
                            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text("Savol (${inq.authorName}):", style = MaterialTheme.typography.labelMedium, color = palette.goldAccent)
                                Text(inq.question, style = MaterialTheme.typography.bodyMedium, color = palette.textPrimary)
                                if (inq.answer.isNotBlank()) {
                                    Text("Javob:", style = MaterialTheme.typography.labelMedium, color = palette.emeraldAccent)
                                    Text(inq.answer, style = MaterialTheme.typography.bodySmall, color = palette.textSecondary)
                                } else {
                                    Text("Holat: Imom javobi kutilmoqda", style = MaterialTheme.typography.labelMedium, color = palette.textMuted)
                                }
                            }
                        }
                    }
                }
                "events" -> {
                    val events = state.centralDb.mosqueEvents
                    if (events.isEmpty()) item { EmptySyncCard("Yaqin kunlarda rejalashtirilgan masjid tadbirlari yoʻq.") }
                    items(events, key = { it.id }) { ev ->
                        AsakaGlassCard(cornerRadius = 16.dp) {
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text(ev.title, style = MaterialTheme.typography.titleSmall, color = palette.goldAccent)
                                Text("${ev.mosqueName} · ${ev.date} ${ev.time}", style = MaterialTheme.typography.labelMedium, color = palette.emeraldAccent)
                                if (ev.description.isNotBlank()) Text(ev.description, style = MaterialTheme.typography.bodySmall, color = palette.textSecondary)
                            }
                        }
                    }
                }
                else -> {
                    val campaigns = state.centralDb.charityCampaigns
                    if (campaigns.isEmpty()) item { EmptySyncCard("Hozircha faol xayriya loyihalari yoʻq.") }
                    items(campaigns, key = { it.id }) { ch ->
                        val ratio = if (ch.targetAmount > 0) (ch.raisedAmount.toFloat() / ch.targetAmount.toFloat()).coerceIn(0f, 1f) else 0f
                        AsakaGlassCard(cornerRadius = 16.dp) {
                            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text(ch.title, style = MaterialTheme.typography.titleSmall, color = palette.goldAccent)
                                Text(ch.description, style = MaterialTheme.typography.bodySmall, color = palette.textSecondary)
                                LinearProgressIndicator(progress = { ratio }, modifier = Modifier.fillMaxWidth(), color = palette.emeraldAccent)
                                Text("Yigʻildi: ${ch.raisedAmount} / ${ch.targetAmount} soʻm", style = MaterialTheme.typography.labelMedium, color = palette.emeraldAccent)
                                if (ch.cardInfo.isNotBlank()) Text("Ehson kartasi: ${ch.cardInfo}", style = MaterialTheme.typography.labelMedium, color = palette.textPrimary)
                            }
                        }
                    }
                }
            }
        }

        if (activeTab == "chat") {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 12.dp, end = 12.dp, bottom = 92.dp, top = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = msgInput,
                    onValueChange = { msgInput = it },
                    placeholder = { Text("Hamjamiyatga xabar yozing...") },
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
                Spacer(modifier = Modifier.width(6.dp))
                IconButton(onClick = {
                    if (msgInput.isNotBlank()) {
                        vm.sendCommunityMessage(msgInput)
                        msgInput = ""
                    }
                }) {
                    Icon(Icons.AutoMirrored.Rounded.Send, contentDescription = "Send", tint = palette.goldAccent)
                }
            }
        }
    }
}

/**
 * Islamic Quiz + Daily Qur'an Quiz + 30-Day Khatm Planner + Daily Istiqomat Ibadah Tracker
 */
@Composable
fun QuizAndKhatmScreen(
    initialTab: String,
    state: AsakaUiState,
    vm: AsakaAppViewModel,
    onBack: () -> Unit
) {
    val palette = LocalAsakaColors.current
    var tab by remember { mutableStateOf(initialTab) } // quiz | khatm | istiqomat
    var quizIndex by remember { mutableIntStateOf(0) }
    var selectedAnswer by remember { mutableIntStateOf(-1) }
    var score by remember { mutableIntStateOf(0) }
    var dailyAnswer by remember { mutableIntStateOf(-1) }
    val completedJuz = remember { mutableStateListOf<Int>() }

    val fallbackQuiz = remember {
        listOf(
            uz.asakaziyo.app.data.QuizQuestionItem("q1", "Qurʼoni Karimda nechta sura bor?", listOf("110", "114", "120", "99"), 1, "Qurʼoni Karim 114 ta sura va 30 ta juzdan iborat."),
            uz.asakaziyo.app.data.QuizQuestionItem("q2", "Eng uzun sura qaysi?", listOf("Oli Imron", "Niso", "Baqara", "Moida"), 2, "Baqara surasi 286 oyatdan iborat eng uzun suradir."),
            uz.asakaziyo.app.data.QuizQuestionItem("q3", "Eng birinchi nozil boʻlgan sura qaysi?", listOf("Fotiha", "Alaq (ilk 5 oyat)", "Ixlos", "Muddassir"), 1, "Iqro bismi Robbikal-laziy xolaq — Alaq surasining ilk 5 oyati.")
        )
    }
    val questions = state.centralDb.quizQuestions.ifEmpty { fallbackQuiz }

    Column(modifier = Modifier.fillMaxSize()) {
        EcosystemTopBar("Viktorina, Xatm & Istiqomat", "Bilim sinovi · 30 Juz rejasi · Kunlik ibodat", onBack)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            listOf("quiz" to "Viktorina", "khatm" to "Xatm (30 Juz)", "istiqomat" to "Istiqomat").forEach { (k, label) ->
                val active = tab == k
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = if (active) palette.goldSoftBg else palette.glassSurface,
                    border = BorderStroke(1.dp, if (active) palette.goldAccent else palette.luminousBorder),
                    modifier = Modifier.weight(1f).clickable { tab = k }
                ) {
                    Text(label, color = if (active) palette.goldAccent else palette.textSecondary, style = MaterialTheme.typography.labelMedium, modifier = Modifier.padding(vertical = 10.dp), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                }
            }
        }

        LazyColumn(
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 110.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            when (tab) {
                "quiz" -> {
                    state.dailyQuranQuiz?.let { dq ->
                        item {
                            AsakaGlassCard(elevated = true, borderColor = palette.goldAccent) {
                                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text("BUGUNGI QURʼON SAVOLI (${dq.dateIso})", style = MaterialTheme.typography.labelMedium, color = palette.goldAccent)
                                    Text(dq.question, style = MaterialTheme.typography.titleMedium, color = palette.textPrimary)
                                    dq.options.forEachIndexed { idx, opt ->
                                        val picked = dailyAnswer == idx
                                        val isRight = dailyAnswer != -1 && idx == dq.correctIndex
                                        Surface(
                                            shape = RoundedCornerShape(12.dp),
                                            color = when {
                                                isRight -> palette.emeraldSoftBg
                                                picked -> palette.danger.copy(alpha = 0.2f)
                                                else -> palette.glassSurface
                                            },
                                            border = BorderStroke(1.dp, if (isRight) palette.emeraldAccent else palette.luminousBorder),
                                            modifier = Modifier.fillMaxWidth().clickable(enabled = dailyAnswer == -1) {
                                                dailyAnswer = idx
                                                vm.submitDailyQuranQuizAttempt(dq.id, idx, idx == dq.correctIndex)
                                            }
                                        ) {
                                            Text(opt, color = palette.textPrimary, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(12.dp))
                                        }
                                    }
                                    if (dailyAnswer != -1 && dq.explanation.isNotBlank()) {
                                        Text(dq.explanation, style = MaterialTheme.typography.bodySmall, color = palette.emeraldAccent)
                                    }
                                }
                            }
                        }
                    }

                    val currentQ = questions[quizIndex % questions.size]
                    item {
                        AsakaGlassCard(cornerRadius = 20.dp) {
                            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Savol ${(quizIndex % questions.size) + 1} / ${questions.size}", style = MaterialTheme.typography.labelMedium, color = palette.goldAccent)
                                    Text("Ball: $score", style = MaterialTheme.typography.labelMedium, color = palette.emeraldAccent)
                                }
                                Text(currentQ.question, style = MaterialTheme.typography.titleMedium, color = palette.textPrimary)
                                currentQ.options.forEachIndexed { idx, opt ->
                                    val chosen = selectedAnswer == idx
                                    val right = selectedAnswer != -1 && idx == currentQ.correctIndex
                                    Surface(
                                        shape = RoundedCornerShape(12.dp),
                                        color = when {
                                            right -> palette.emeraldSoftBg
                                            chosen -> palette.danger.copy(alpha = 0.2f)
                                            else -> palette.glassSurface
                                        },
                                        border = BorderStroke(1.dp, if (right) palette.emeraldAccent else palette.luminousBorder),
                                        modifier = Modifier.fillMaxWidth().clickable(enabled = selectedAnswer == -1) {
                                            selectedAnswer = idx
                                            if (idx == currentQ.correctIndex) score++
                                        }
                                    ) {
                                        Text(opt, color = palette.textPrimary, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(12.dp))
                                    }
                                }
                                if (selectedAnswer != -1) {
                                    if (currentQ.explanation.isNotBlank()) {
                                        Text(currentQ.explanation, style = MaterialTheme.typography.bodySmall, color = palette.textSecondary)
                                    }
                                    Button(
                                        onClick = {
                                            selectedAnswer = -1
                                            quizIndex = (quizIndex + 1) % questions.size
                                        },
                                        colors = ButtonDefaults.buttonColors(containerColor = palette.goldAccent, contentColor = Color(0xFF031814))
                                    ) { Text("Keyingi savol →") }
                                }
                            }
                        }
                    }
                }
                "khatm" -> {
                    item {
                        val progress = completedJuz.size / 30f
                        AsakaGlassCard(elevated = true) {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("30 Kunlik Xatm Rejasi", style = MaterialTheme.typography.titleMedium, color = palette.goldAccent)
                                Text("Yakunlangan juzlar: ${completedJuz.size} / 30 (${(progress * 100).toInt()}%)", style = MaterialTheme.typography.bodySmall, color = palette.textSecondary)
                                LinearProgressIndicator(progress = { progress }, modifier = Modifier.fillMaxWidth(), color = palette.goldAccent)
                            }
                        }
                    }
                    val juzRows = (1..30).toList().chunked(3)
                    items(juzRows) { row ->
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            row.forEach { juz ->
                                val done = juz in completedJuz
                                AsakaGlassCard(
                                    modifier = Modifier.weight(1f),
                                    cornerRadius = 14.dp,
                                    borderColor = if (done) palette.emeraldAccent else null,
                                    onClick = { if (done) completedJuz.remove(juz) else completedJuz.add(juz) }
                                ) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                                        Text("$juz-Juz", style = MaterialTheme.typography.titleSmall, color = if (done) palette.emeraldAccent else palette.textPrimary)
                                        Text(if (done) "✓ Oʻqildi" else "Rejada", style = MaterialTheme.typography.labelMedium, color = if (done) palette.emeraldAccent else palette.textMuted)
                                    }
                                }
                            }
                        }
                    }
                }
                else -> {
                    val day = state.istiqomatToday
                    val itemsList = listOf(
                        Triple("fajr", "Bomdod namozi", day.fajr),
                        Triple("dhuhr", "Peshin namozi", day.dhuhr),
                        Triple("asr", "Asr namozi", day.asr),
                        Triple("maghrib", "Shom namozi", day.maghrib),
                        Triple("isha", "Xufton namozi", day.isha),
                        Triple("quranRead", "Kunlik Qurʼon tilovati", day.quranRead),
                        Triple("morningDhikr", "Tonggi va kechki zikrlar", day.morningDhikr),
                        Triple("charity", "Sadaqa va yaxshilik", day.charity)
                    )
                    val doneCount = itemsList.count { it.third }
                    item {
                        AsakaGlassCard(elevated = true) {
                            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text("Kunlik Istiqomat Nazorati", style = MaterialTheme.typography.titleMedium, color = palette.goldAccent)
                                Text("Bajarildi: $doneCount / ${itemsList.size} · Bulut bilan sinxronlanadi", style = MaterialTheme.typography.bodySmall, color = palette.emeraldAccent)
                                LinearProgressIndicator(progress = { doneCount / itemsList.size.toFloat() }, modifier = Modifier.fillMaxWidth(), color = palette.emeraldAccent)
                            }
                        }
                    }
                    items(itemsList) { (key, label, checked) ->
                        AsakaGlassCard(cornerRadius = 14.dp, onClick = { vm.toggleIstiqomatField(key) }) {
                            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(label, style = MaterialTheme.typography.bodyMedium, color = palette.textPrimary)
                                Checkbox(checked = checked, onCheckedChange = { vm.toggleIstiqomatField(key) })
                            }
                        }
                    }
                }
            }
        }
    }
}

/**
 * Digital Books Library + Academy Lessons + Media Posts + Adhan Library (ExoPlayer) + Masjid Smart TV
 */
@Composable
fun LibraryMediaScreen(
    initialTab: String,
    state: AsakaUiState,
    vm: AsakaAppViewModel,
    onBack: () -> Unit
) {
    val palette = LocalAsakaColors.current
    var tab by remember { mutableStateOf(initialTab) } // library | academy | media | tv

    Column(modifier = Modifier.fillMaxSize()) {
        EcosystemTopBar("Kutubxona, Akademiya & Media", "Kitoblar · Kurslar · Azon (ExoPlayer) · Masjid TV", onBack, onRefresh = { vm.checkManifestAndRefresh(force = true) })
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            listOf(
                "library" to "Kitoblar (${state.centralDb.digitalBooks.size})",
                "academy" to "Akademiya (${state.centralDb.academyLessons.size})",
                "media" to "Media & Azon (${state.centralDb.mediaPosts.size + state.centralDb.adhanLibrary.size})",
                "tv" to "Masjid TV"
            ).forEach { (k, label) ->
                item {
                    val active = tab == k
                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        color = if (active) palette.goldSoftBg else palette.glassSurface,
                        border = BorderStroke(1.dp, if (active) palette.goldAccent else palette.luminousBorder),
                        modifier = Modifier.clickable { tab = k }
                    ) {
                        Text(label, color = if (active) palette.goldAccent else palette.textSecondary, style = MaterialTheme.typography.labelMedium, modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp))
                    }
                }
            }
        }

        LazyColumn(
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 110.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            when (tab) {
                "library" -> {
                    val books = state.centralDb.digitalBooks
                    if (books.isEmpty()) item { EmptySyncCard("Raqamli kutubxona kitoblari serverdan sinxronlanmoqda.") }
                    items(books, key = { it.id }) { b ->
                        AsakaGlassCard(cornerRadius = 16.dp) {
                            Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                                Text(b.category, style = MaterialTheme.typography.labelMedium, color = palette.emeraldAccent)
                                Text(b.title, style = MaterialTheme.typography.titleMedium, color = palette.goldAccent)
                                if (b.author.isNotBlank()) Text("Muallif: ${b.author}", style = MaterialTheme.typography.labelMedium, color = palette.textSecondary)
                                Text(b.description.ifBlank { b.contentPreview }, style = MaterialTheme.typography.bodySmall, color = palette.textPrimary)
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    TextButton(onClick = { vm.toggleFavoriteItem("book:${b.id}", "Kitob", b.title, b.author) }) {
                                        Text("Sevimlilarga qoʻshish", color = palette.goldAccent)
                                    }
                                }
                            }
                        }
                    }
                }
                "academy" -> {
                    val lessons = state.centralDb.academyLessons
                    if (lessons.isEmpty()) item { EmptySyncCard("Islom Akademiyasi darslari yuklanmoqda.") }
                    items(lessons, key = { it.id }) { ls ->
                        AsakaGlassCard(cornerRadius = 16.dp) {
                            Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("${ls.category} · ${ls.level}", style = MaterialTheme.typography.labelMedium, color = palette.emeraldAccent)
                                    Text(ls.duration, style = MaterialTheme.typography.labelMedium, color = palette.textMuted)
                                }
                                Text(ls.title, style = MaterialTheme.typography.titleMedium, color = palette.goldAccent)
                                Text(ls.content.ifBlank { ls.summary }, style = MaterialTheme.typography.bodySmall, color = palette.textPrimary)
                            }
                        }
                    }
                }
                "media" -> {
                    if (state.centralDb.adhanLibrary.isNotEmpty()) {
                        item { Text("Azon Kutubxonasi (Media3 ExoPlayer)", style = MaterialTheme.typography.titleSmall, color = palette.goldAccent) }
                        items(state.centralDb.adhanLibrary, key = { it.id }) { adhan ->
                            AsakaGlassCard(cornerRadius = 16.dp, onClick = {
                                vm.playExternalAudio("adhan_${adhan.id}", adhan.url, adhan.title, adhan.muezzin.ifBlank { adhan.city })
                            }) {
                                Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(adhan.title, style = MaterialTheme.typography.titleSmall, color = palette.textPrimary)
                                        Text("${adhan.muezzin} · ${adhan.city}".trim(' ', '·'), style = MaterialTheme.typography.labelMedium, color = palette.textSecondary)
                                    }
                                    Icon(Icons.Rounded.PlayArrow, contentDescription = "Play", tint = palette.goldAccent)
                                }
                            }
                        }
                    }
                    item { Text("Audio va Video Maʼruzalar", style = MaterialTheme.typography.titleSmall, color = palette.goldAccent) }
                    if (state.centralDb.mediaPosts.isEmpty()) {
                        item { EmptySyncCard("Hozircha media maʼruzalar mavjud emas.") }
                    } else {
                        items(state.centralDb.mediaPosts, key = { it.id }) { post ->
                            AsakaGlassCard(cornerRadius = 16.dp, onClick = {
                                if (post.url.isNotBlank()) vm.playExternalAudio("media_${post.id}", post.url, post.title, post.author)
                            }) {
                                Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(post.category, style = MaterialTheme.typography.labelMedium, color = palette.emeraldAccent)
                                        Text(post.title, style = MaterialTheme.typography.titleSmall, color = palette.textPrimary)
                                        Text(post.description.ifBlank { post.author }, style = MaterialTheme.typography.bodySmall, color = palette.textSecondary, maxLines = 2)
                                    }
                                    if (post.url.isNotBlank()) {
                                        Icon(Icons.Rounded.PlayArrow, contentDescription = "Play", tint = palette.goldAccent)
                                    }
                                }
                            }
                        }
                    }
                }
                else -> {
                    val p = state.prayerSchedule
                    item {
                        AsakaGlassCard(elevated = true, borderColor = palette.goldAccent) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                Text("ASAKA ZIYO · MASJID SMART TV", style = MaterialTheme.typography.labelMedium, color = palette.goldAccent)
                                Text(p?.cityName ?: "Asaka", style = MaterialTheme.typography.displaySmall, color = palette.textPrimary)
                                if (p != null) {
                                    Text(p.hijriDate.ifBlank { p.localDate }, style = MaterialTheme.typography.titleSmall, color = palette.emeraldAccent)
                                    Spacer(modifier = Modifier.height(6.dp))
                                    listOf("Bomdod" to p.fajr, "Quyosh" to p.sunrise, "Peshin" to p.dhuhr, "Asr" to p.asr, "Shom" to p.maghrib, "Xufton" to p.isha).forEach { (n, t) ->
                                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text(n, style = MaterialTheme.typography.titleMedium, color = palette.textSecondary)
                                            Text(t, style = MaterialTheme.typography.headlineSmall, color = palette.goldAccent)
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
}

/**
 * Scholars, Mosques, Hijri Calendar, Fasting (Saharlik/Iftorlik), Notifications Center, Favorites & Legal
 */
@Composable
fun KnowledgeAndToolsScreen(
    moduleId: String,
    state: AsakaUiState,
    vm: AsakaAppViewModel,
    onBack: () -> Unit
) {
    val palette = LocalAsakaColors.current
    var deleteReason by remember { mutableStateOf("") }

    val title = when (moduleId) {
        "scholars" -> "Buyuk Allomalar"
        "mosques" -> "Masjidlar Katalogi"
        "calendar" -> "Hijriy Taqvim"
        "fasting" -> "Roʻza — Saharlik & Iftorlik"
        "notifications" -> "Bildirishnomalar Markazi"
        "favorites" -> "Sevimlilar Toʻplami"
        else -> "Maxfiylik, Huquq & Hisob"
    }

    Column(modifier = Modifier.fillMaxSize()) {
        EcosystemTopBar(title, "ASAKA ZIYO v${uz.asakaziyo.app.BuildConfig.VERSION_NAME} Native", onBack, onRefresh = { vm.checkManifestAndRefresh(force = true) })
        LazyColumn(
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 110.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            when (moduleId) {
                "scholars" -> {
                    val list = state.scholars
                    if (list.isEmpty()) item { EmptySyncCard("Allomalar maʼlumotlari yuklanmoqda.") }
                    items(list, key = { it.id }) { s ->
                        AsakaGlassCard(cornerRadius = 16.dp) {
                            Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                                Text(s.name, style = MaterialTheme.typography.titleMedium, color = palette.goldAccent)
                                if (s.era.isNotBlank() || s.title.isNotBlank()) {
                                    Text("${s.title} · ${s.era}".trim(' ', '·'), style = MaterialTheme.typography.labelMedium, color = palette.emeraldAccent)
                                }
                                Text(s.bio, style = MaterialTheme.typography.bodySmall, color = palette.textPrimary)
                            }
                        }
                    }
                }
                "mosques" -> {
                    val list = state.mosques
                    if (list.isEmpty()) item { EmptySyncCard("Masjidlar roʻyxati serverdan yuklanmoqda.") }
                    items(list, key = { it.id }) { m ->
                        AsakaGlassCard(cornerRadius = 16.dp) {
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text(m.name, style = MaterialTheme.typography.titleMedium, color = palette.goldAccent)
                                Text("${m.city} · ${m.address}", style = MaterialTheme.typography.bodySmall, color = palette.textPrimary)
                                if (m.imam.isNotBlank()) Text("Imom-xatib: ${m.imam}", style = MaterialTheme.typography.labelMedium, color = palette.emeraldAccent)
                                if (m.phone.isNotBlank()) Text("Telefon: ${m.phone}", style = MaterialTheme.typography.labelMedium, color = palette.textSecondary)
                            }
                        }
                    }
                }
                "calendar" -> {
                    item {
                        AsakaGlassCard(elevated = true) {
                            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text("Bugungi Hijriy Sana", style = MaterialTheme.typography.labelMedium, color = palette.goldAccent)
                                Text(state.prayerSchedule?.hijriDate?.ifBlank { "1447-1448 Hijriy yil" } ?: "Hijriy taqvim", style = MaterialTheme.typography.headlineSmall, color = palette.textPrimary)
                                Text("Milodiy: ${state.prayerSchedule?.localDate ?: ""}", style = MaterialTheme.typography.bodySmall, color = palette.emeraldAccent)
                            }
                        }
                    }
                    val importantDates = listOf(
                        "Muharram (10-kun)" to "Ashuro kuni",
                        "Rabiul avval (12-kun)" to "Mavlidun-Nabiy (s.a.v.)",
                        "Rajab (27-kecha)" to "Isro va Meʼroj kechasi",
                        "Shaʼbon (15-kecha)" to "Baroat kechasi",
                        "Ramazon (1-30 kun)" to "Muborak Ramazon oyi va Qadr kechasi",
                        "Shavvol (1-kun)" to "Iyd al-Fitr (Ramazon Hayiti)",
                        "Zulhijja (9-10 kun)" to "Arafa kuni va Qurbon Hayiti"
                    )
                    items(importantDates) { (d, name) ->
                        AsakaGlassCard(cornerRadius = 14.dp) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(name, style = MaterialTheme.typography.titleSmall, color = palette.textPrimary, modifier = Modifier.weight(1f))
                                Text(d, style = MaterialTheme.typography.labelMedium, color = palette.goldAccent)
                            }
                        }
                    }
                }
                "fasting" -> {
                    val p = state.prayerSchedule
                    item {
                        AsakaGlassCard(elevated = true, borderColor = palette.goldAccent) {
                            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                Text("Roʻza Vaqtlari (${p?.cityName ?: "Asaka"})", style = MaterialTheme.typography.titleMedium, color = palette.goldAccent)
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Column {
                                        Text("Saharlik (Ogʻiz yopish)", style = MaterialTheme.typography.labelMedium, color = palette.textSecondary)
                                        Text(p?.fajr ?: "--:--", style = MaterialTheme.typography.displaySmall, color = palette.emeraldAccent)
                                    }
                                    Column(horizontalAlignment = Alignment.End) {
                                        Text("Iftorlik (Ogʻiz ochish)", style = MaterialTheme.typography.labelMedium, color = palette.textSecondary)
                                        Text(p?.maghrib ?: "--:--", style = MaterialTheme.typography.displaySmall, color = palette.goldAccent)
                                    }
                                }
                                Text("Saharlik duosi: Navaytu an asuma sovma shahri ramazona minal fajri ilal magʻribi, xolisan lillahi taʼala.", style = MaterialTheme.typography.bodySmall, color = palette.textPrimary)
                                Text("Iftorlik duosi: Allohumma laka sumtu va bika amantu va aʼlayka tavakkaltu va aʼla rizqika aftartu.", style = MaterialTheme.typography.bodySmall, color = palette.textSecondary)
                            }
                        }
                    }
                }
                "notifications" -> {
                    val list = state.centralDb.notifications
                    if (list.isEmpty()) item { EmptySyncCard("Hozircha yangi bildirishnomalar yoʻq.") }
                    items(list, key = { it.id }) { n ->
                        val isRead = n.id in state.readNotificationIds
                        AsakaGlassCard(
                            cornerRadius = 16.dp,
                            borderColor = if (!isRead) palette.goldAccent else null,
                            onClick = { vm.markNotificationRead(n.id) }
                        ) {
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text(n.title, style = MaterialTheme.typography.titleSmall, color = if (!isRead) palette.goldAccent else palette.textPrimary, modifier = Modifier.weight(1f))
                                    if (!isRead) Text("YANGI", style = MaterialTheme.typography.labelMedium, color = palette.emeraldAccent)
                                }
                                Text(n.body, style = MaterialTheme.typography.bodySmall, color = palette.textSecondary)
                                if (n.createdAt.isNotBlank()) Text(n.createdAt.take(16), style = MaterialTheme.typography.labelMedium, color = palette.textMuted)
                            }
                        }
                    }
                }
                "favorites" -> {
                    if (state.favorites.isEmpty() && state.bookmarks.isEmpty()) {
                        item { EmptySyncCard("Hozircha sevimlilarga hech narsa qoʻshilmagan.") }
                    }
                    items(state.favorites, key = { it.first }) { (key, cat, titleSub) ->
                        AsakaGlassCard(cornerRadius = 14.dp) {
                            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(cat, style = MaterialTheme.typography.labelMedium, color = palette.emeraldAccent)
                                    Text(titleSub.first, style = MaterialTheme.typography.titleSmall, color = palette.textPrimary)
                                    if (titleSub.second.isNotBlank()) Text(titleSub.second, style = MaterialTheme.typography.bodySmall, color = palette.textSecondary)
                                }
                                TextButton(onClick = { vm.toggleFavoriteItem(key, cat, titleSub.first, titleSub.second) }) {
                                    Text("Oʻchirish", color = palette.danger)
                                }
                            }
                        }
                    }
                }
                else -> {
                    item {
                        AsakaGlassCard(elevated = true) {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("Maxfiylik Siyosati va Foydalanish Shartlari", style = MaterialTheme.typography.titleMedium, color = palette.goldAccent)
                                Text("ASAKA ZIYO foydalanuvchilar shaxsiy maʼlumotlarini Android Keystore shifrlash tizimi va himoyalangan Firestore serverida saqlaydi. Hech qanday shaxsiy maʼlumot uchinchi tomon reklama tarmoqlariga sotilmaydi.", style = MaterialTheme.typography.bodySmall, color = palette.textPrimary)
                                Text("Developer: Dev by Ulugʻbek Mirzayev · https://t.me/Ulugbek_Mirzayev_uz", style = MaterialTheme.typography.labelMedium, color = palette.emeraldAccent)
                            }
                        }
                    }
                    item {
                        AsakaGlassCard(borderColor = palette.danger) {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("Hisobni Oʻchirish Soʻrovi (Google Play talabi)", style = MaterialTheme.typography.titleSmall, color = palette.danger)
                                OutlinedTextField(
                                    value = deleteReason,
                                    onValueChange = { deleteReason = it },
                                    placeholder = { Text("Sababini yozing (ixtiyoriy)...") },
                                    modifier = Modifier.fillMaxWidth()
                                )
                                OutlinedButton(onClick = {
                                    vm.requestAccountDeletion(deleteReason.ifBlank { "Foydalanuvchi talabi" })
                                    deleteReason = ""
                                }) {
                                    Text("Hisobni oʻchirish soʻrovini yuborish", color = palette.danger)
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
private fun EmptySyncCard(message: String) {
    val palette = LocalAsakaColors.current
    AsakaGlassCard(cornerRadius = 16.dp) {
        Text(message, style = MaterialTheme.typography.bodySmall, color = palette.textSecondary)
    }
}
