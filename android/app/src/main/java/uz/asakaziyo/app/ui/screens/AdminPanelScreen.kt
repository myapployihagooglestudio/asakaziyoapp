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
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.Logout
import androidx.compose.material.icons.rounded.AdminPanelSettings
import androidx.compose.material.icons.rounded.Backup
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import uz.asakaziyo.app.data.AdminHomeConfig
import uz.asakaziyo.app.ui.theme.AsakaGlassCard
import uz.asakaziyo.app.ui.theme.LocalAsakaColors
import uz.asakaziyo.app.viewmodel.AsakaAppViewModel
import uz.asakaziyo.app.viewmodel.AsakaUiState

/**
 * ASAKA ZIYO v7.0.0 — Role-Protected Native Super Admin Control Panel
 *
 * Security:
 * - Zero hardcoded credentials in APK.
 * - Authenticates strictly via central backend `POST /api/admin/auth`.
 * - Persists verified Bearer token in Android Keystore `EncryptedSharedPreferences`.
 * - Every mutation immediately updates Firestore/Server AND broadcasts via `/api/content/manifest`
 *   so Web App, Android, and Telegram reflect changes in real time without rebuilding the APK!
 */
@Composable
fun AdminPanelScreen(
    state: AsakaUiState,
    vm: AsakaAppViewModel,
    onBack: () -> Unit
) {
    val palette = LocalAsakaColors.current
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var activeTab by remember { mutableStateOf("dashboard") }

    // Form states
    var fajr by remember(state.prayerSchedule) { mutableStateOf(state.prayerSchedule?.fajr ?: "04:40") }
    var sunrise by remember(state.prayerSchedule) { mutableStateOf(state.prayerSchedule?.sunrise ?: "06:00") }
    var dhuhr by remember(state.prayerSchedule) { mutableStateOf(state.prayerSchedule?.dhuhr ?: "12:25") }
    var asr by remember(state.prayerSchedule) { mutableStateOf(state.prayerSchedule?.asr ?: "16:35") }
    var maghrib by remember(state.prayerSchedule) { mutableStateOf(state.prayerSchedule?.maghrib ?: "19:05") }
    var isha by remember(state.prayerSchedule) { mutableStateOf(state.prayerSchedule?.isha ?: "20:25") }
    var tahajjud by remember(state.prayerSchedule) { mutableStateOf(state.prayerSchedule?.tahajjud ?: "03:30") }

    var artTitle by remember { mutableStateOf("") }
    var artCat by remember { mutableStateOf("Maʼrifat") }
    var artBody by remember { mutableStateOf("") }

    var newsTitle by remember { mutableStateOf("") }
    var newsBody by remember { mutableStateOf("") }
    var newsUrgent by remember { mutableStateOf(false) }

    var annTitle by remember { mutableStateOf("") }
    var annBody by remember { mutableStateOf("") }

    var hadithTitle by remember { mutableStateOf("") }
    var hadithText by remember { mutableStateOf("") }
    var hadithSource by remember { mutableStateOf("Imom Buxoriy") }

    var dhikrTitle by remember { mutableStateOf("") }
    var dhikrArabic by remember { mutableStateOf("") }
    var dhikrTrans by remember { mutableStateOf("") }

    var bannerTitle by remember(state.adminHomeConfig) { mutableStateOf(state.adminHomeConfig.bannerTitleUz) }
    var bannerBody by remember(state.adminHomeConfig) { mutableStateOf(state.adminHomeConfig.bannerBodyUz) }
    var bannerVisible by remember(state.adminHomeConfig) { mutableStateOf(state.adminHomeConfig.bannerVisible) }

    var qariNameUz by remember { mutableStateOf("") }
    var qariNameAr by remember { mutableStateOf("") }
    var qariCountry by remember { mutableStateOf("Oʻzbekiston") }
    var qariStyle by remember { mutableStateOf("Murattal") }
    var qariBio by remember { mutableStateOf("") }

    var grantUserId by remember { mutableStateOf("") }
    var grantDays by remember { mutableStateOf("30") }
    var promoCode by remember { mutableStateOf("") }
    var promoDiscount by remember { mutableStateOf("20") }
    var promoBonusDays by remember { mutableStateOf("7") }

    var pushTitle by remember { mutableStateOf("") }
    var pushBody by remember { mutableStateOf("") }
    var tgMessage by remember { mutableStateOf("") }

    Column(modifier = Modifier.fillMaxSize()) {
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
                Text("ASAKA ZIYO · Admin Panel", style = MaterialTheme.typography.titleMedium, color = palette.goldAccent)
                Text(
                    if (state.adminSession.isAuthenticated) "${state.adminSession.role} · ${state.adminSession.username}" else "Rol bilan himoyalangan kirish",
                    style = MaterialTheme.typography.labelMedium,
                    color = palette.emeraldAccent
                )
            }
            if (state.adminSession.isAuthenticated) {
                IconButton(onClick = { vm.adminRefreshConsole(); vm.checkManifestAndRefresh(force = true) }) {
                    Icon(Icons.Rounded.Refresh, contentDescription = "Refresh", tint = palette.goldAccent)
                }
                IconButton(onClick = { vm.adminSignOut() }) {
                    Icon(Icons.AutoMirrored.Rounded.Logout, contentDescription = "Logout", tint = palette.danger)
                }
            }
        }

        if (!state.adminSession.isAuthenticated) {
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item {
                    AsakaGlassCard(elevated = true, borderColor = palette.goldAccent) {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Icon(Icons.Rounded.AdminPanelSettings, contentDescription = null, tint = palette.goldAccent, modifier = Modifier.size(28.dp))
                                Text("Super Admin Autentifikatsiyasi", style = MaterialTheme.typography.titleMedium, color = palette.goldAccent)
                            }
                            Text("Kirish faqat markaziy ASAKA ZIYO serveri orqali tekshiriladi. Oddiy foydalanuvchilar uchun admin funksiyalari yopiq.", style = MaterialTheme.typography.bodySmall, color = palette.textSecondary)
                            OutlinedTextField(
                                value = username,
                                onValueChange = { username = it },
                                label = { Text("Admin login / email") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth()
                            )
                            OutlinedTextField(
                                value = password,
                                onValueChange = { password = it },
                                label = { Text("Parol") },
                                singleLine = true,
                                visualTransformation = PasswordVisualTransformation(),
                                modifier = Modifier.fillMaxWidth()
                            )
                            Button(
                                onClick = { vm.adminSignIn(username, password) },
                                enabled = !state.isAdminBusy,
                                colors = ButtonDefaults.buttonColors(containerColor = palette.goldAccent, contentColor = Color(0xFF031814)),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                if (state.isAdminBusy) {
                                    CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp, color = Color(0xFF031814))
                                } else {
                                    Text("Tizimga kirish", fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
            return
        }

        // Authenticated Admin Tabs
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            val tabs = listOf(
                "dashboard" to "Boshqaruv",
                "prayer" to "Asaka Namoz",
                "content" to "Kontent & Banner",
                "qaris" to "Qorilar",
                "subs" to "Obuna & Flaglar",
                "moderation" to "Savollar & Moderatsiya",
                "broadcast" to "Broadcast"
            )
            items(tabs) { (key, label) ->
                val active = activeTab == key
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = if (active) palette.goldSoftBg else palette.glassSurface,
                    border = BorderStroke(1.dp, if (active) palette.goldAccent else palette.luminousBorder),
                    modifier = Modifier.clickable { activeTab = key }
                ) {
                    Text(label, color = if (active) palette.goldAccent else palette.textSecondary, style = MaterialTheme.typography.labelMedium, modifier = Modifier.padding(horizontal = 12.dp, vertical = 9.dp))
                }
            }
        }

        LazyColumn(
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 110.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            when (activeTab) {
                "dashboard" -> {
                    item {
                        AsakaGlassCard(elevated = true) {
                            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text("Yagona Ekotizim Statistikasi", style = MaterialTheme.typography.titleMedium, color = palette.goldAccent)
                                Text("Content Manifest Version: ${state.contentVersion.take(12).ifBlank { "live" }}", style = MaterialTheme.typography.labelMedium, color = palette.emeraldAccent)
                                Text("Maqolalar: ${state.centralDb.articles.size} · Yangiliklar: ${state.centralDb.news.size} · Eʼlonlar: ${state.centralDb.announcements.size}", style = MaterialTheme.typography.bodySmall, color = palette.textPrimary)
                                Text("Qorilar: ${state.qaris.size} · Hadislar: ${state.centralDb.dynamicHadiths.size} · Zikrlar: ${state.centralDb.dynamicDhikrs.size}", style = MaterialTheme.typography.bodySmall, color = palette.textPrimary)
                                Text("Kutilayotgan toʻlov buyurtmalari: ${state.adminOrders.count { it.status == "PENDING" }} · Feature Flaglar: ${state.adminFeatureFlags.size}", style = MaterialTheme.typography.bodySmall, color = palette.textSecondary)
                                Spacer(modifier = Modifier.height(6.dp))
                                Button(
                                    onClick = { vm.adminCreateBackup() },
                                    colors = ButtonDefaults.buttonColors(containerColor = palette.goldAccent, contentColor = Color(0xFF031814))
                                ) {
                                    Icon(Icons.Rounded.Backup, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Bulut Backup Yaratish")
                                }
                            }
                        }
                    }
                }
                "prayer" -> {
                    item {
                        AsakaGlassCard(elevated = true, borderColor = palette.goldAccent) {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("Asaka Shahri — MANUAL_ADMIN Namoz Vaqtlari", style = MaterialTheme.typography.titleSmall, color = palette.goldAccent)
                                Text("Saqlangach Web App, Android ilova va Telegram Botda avtomatik yangilanadi.", style = MaterialTheme.typography.labelMedium, color = palette.textSecondary)
                                OutlinedTextField(value = tahajjud, onValueChange = { tahajjud = it }, label = { Text("Tahajjud (HH:MM)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                                OutlinedTextField(value = fajr, onValueChange = { fajr = it }, label = { Text("Bomdod (Fajr)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                                OutlinedTextField(value = sunrise, onValueChange = { sunrise = it }, label = { Text("Quyosh chiqishi") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                                OutlinedTextField(value = dhuhr, onValueChange = { dhuhr = it }, label = { Text("Peshin (Dhuhr)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                                OutlinedTextField(value = asr, onValueChange = { asr = it }, label = { Text("Asr") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                                OutlinedTextField(value = maghrib, onValueChange = { maghrib = it }, label = { Text("Shom (Maghrib)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                                OutlinedTextField(value = isha, onValueChange = { isha = it }, label = { Text("Xufton (Isha)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                                Button(
                                    onClick = { vm.adminSaveAsakaPrayer(fajr, sunrise, dhuhr, asr, maghrib, isha, tahajjud) },
                                    colors = ButtonDefaults.buttonColors(containerColor = palette.goldAccent, contentColor = Color(0xFF031814)),
                                    modifier = Modifier.fillMaxWidth()
                                ) { Text("Asaka vaqtlarini saqlash va sinxronlash", fontWeight = FontWeight.Bold) }
                            }
                        }
                    }
                }
                "content" -> {
                    item {
                        AsakaGlassCard(elevated = true) {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                    Text("Bosh Sahifa Global Banneri", style = MaterialTheme.typography.titleSmall, color = palette.goldAccent)
                                    Switch(checked = bannerVisible, onCheckedChange = { bannerVisible = it })
                                }
                                OutlinedTextField(value = bannerTitle, onValueChange = { bannerTitle = it }, label = { Text("Banner sarlavhasi") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                                OutlinedTextField(value = bannerBody, onValueChange = { bannerBody = it }, label = { Text("Banner matni") }, modifier = Modifier.fillMaxWidth())
                                Button(
                                    onClick = {
                                        vm.adminSaveHomeBlocks(
                                            AdminHomeConfig(
                                                bannerTitleUz = bannerTitle,
                                                bannerBodyUz = bannerBody,
                                                bannerVisible = bannerVisible,
                                                bannerCtaModule = "articles"
                                            )
                                        )
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = palette.goldAccent, contentColor = Color(0xFF031814))
                                ) { Text("Bannerni saqlash") }
                            }
                        }
                    }
                    item {
                        AsakaGlassCard(cornerRadius = 18.dp) {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("Yangi Maqola Chop Etish", style = MaterialTheme.typography.titleSmall, color = palette.goldAccent)
                                OutlinedTextField(value = artTitle, onValueChange = { artTitle = it }, label = { Text("Maqola sarlavhasi") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                                OutlinedTextField(value = artCat, onValueChange = { artCat = it }, label = { Text("Kategoriya") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                                OutlinedTextField(value = artBody, onValueChange = { artBody = it }, label = { Text("Maqola matni") }, minLines = 3, modifier = Modifier.fillMaxWidth())
                                Button(
                                    onClick = {
                                        if (artTitle.isNotBlank() && artBody.isNotBlank()) {
                                            vm.adminPublishArticle(artTitle, artCat, state.adminSession.username, artBody)
                                            artTitle = ""; artBody = ""
                                        }
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = palette.goldAccent, contentColor = Color(0xFF031814))
                                ) { Text("Maqolani chop etish") }
                            }
                        }
                    }
                    item {
                        AsakaGlassCard(cornerRadius = 18.dp) {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("Yangi Yangilik / Eʼlon", style = MaterialTheme.typography.titleSmall, color = palette.goldAccent)
                                OutlinedTextField(value = newsTitle, onValueChange = { newsTitle = it }, label = { Text("Yangilik sarlavhasi") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                                OutlinedTextField(value = newsBody, onValueChange = { newsBody = it }, label = { Text("Yangilik matni") }, minLines = 2, modifier = Modifier.fillMaxWidth())
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                                    Text("Shoshilinch (Urgent)", style = MaterialTheme.typography.bodySmall, color = palette.textSecondary)
                                    Switch(checked = newsUrgent, onCheckedChange = { newsUrgent = it })
                                }
                                Button(
                                    onClick = {
                                        if (newsTitle.isNotBlank() && newsBody.isNotBlank()) {
                                            vm.adminPublishNews(newsTitle, newsBody, newsUrgent)
                                            newsTitle = ""; newsBody = ""
                                        }
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = palette.goldAccent, contentColor = Color(0xFF031814))
                                ) { Text("Yangilikni eʼlon qilish") }
                                Spacer(modifier = Modifier.height(6.dp))
                                OutlinedTextField(value = annTitle, onValueChange = { annTitle = it }, label = { Text("Eʼlon sarlavhasi") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                                OutlinedTextField(value = annBody, onValueChange = { annBody = it }, label = { Text("Eʼlon matni") }, modifier = Modifier.fillMaxWidth())
                                OutlinedButton(onClick = {
                                    if (annTitle.isNotBlank() && annBody.isNotBlank()) {
                                        vm.adminPublishAnnouncement(annTitle, annBody, "info")
                                        annTitle = ""; annBody = ""
                                    }
                                }) { Text("Eʼlon qoʻshish", color = palette.goldAccent) }
                            }
                        }
                    }
                    item {
                        AsakaGlassCard(cornerRadius = 18.dp) {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("Yangi Hadis va Zikr Qoʻshish", style = MaterialTheme.typography.titleSmall, color = palette.goldAccent)
                                OutlinedTextField(value = hadithTitle, onValueChange = { hadithTitle = it }, label = { Text("Hadis mavzusi") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                                OutlinedTextField(value = hadithText, onValueChange = { hadithText = it }, label = { Text("Hadis matni") }, minLines = 2, modifier = Modifier.fillMaxWidth())
                                OutlinedTextField(value = hadithSource, onValueChange = { hadithSource = it }, label = { Text("Manba") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                                OutlinedButton(onClick = {
                                    if (hadithTitle.isNotBlank() && hadithText.isNotBlank()) {
                                        vm.adminPublishHadith(hadithTitle, hadithText, hadithSource)
                                        hadithTitle = ""; hadithText = ""
                                    }
                                }) { Text("Hadisni qoʻshish", color = palette.goldAccent) }
                                OutlinedTextField(value = dhikrTitle, onValueChange = { dhikrTitle = it }, label = { Text("Zikr nomi") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                                OutlinedTextField(value = dhikrArabic, onValueChange = { dhikrArabic = it }, label = { Text("Arabcha matni") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                                OutlinedTextField(value = dhikrTrans, onValueChange = { dhikrTrans = it }, label = { Text("Maʼnosi") }, modifier = Modifier.fillMaxWidth())
                                OutlinedButton(onClick = {
                                    if (dhikrTitle.isNotBlank()) {
                                        vm.adminPublishDhikr(dhikrTitle, dhikrArabic, dhikrTrans, 33)
                                        dhikrTitle = ""; dhikrArabic = ""; dhikrTrans = ""
                                    }
                                }) { Text("Zikrni qoʻshish", color = palette.emeraldAccent) }
                            }
                        }
                    }
                }
                "qaris" -> {
                    item {
                        AsakaGlassCard(elevated = true) {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("Yangi Qori Qoʻshish (Real-Vaqt Sinxron)", style = MaterialTheme.typography.titleSmall, color = palette.goldAccent)
                                OutlinedTextField(value = qariNameUz, onValueChange = { qariNameUz = it }, label = { Text("Qori ismi (Oʻzbekcha)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                                OutlinedTextField(value = qariNameAr, onValueChange = { qariNameAr = it }, label = { Text("Qori ismi (Arabcha)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                                OutlinedTextField(value = qariCountry, onValueChange = { qariCountry = it }, label = { Text("Davlati") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                                OutlinedTextField(value = qariStyle, onValueChange = { qariStyle = it }, label = { Text("Uslub (Murattal / Mujawwad)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                                OutlinedTextField(value = qariBio, onValueChange = { qariBio = it }, label = { Text("Qisqacha maʼlumot") }, modifier = Modifier.fillMaxWidth())
                                Button(
                                    onClick = {
                                        if (qariNameUz.isNotBlank()) {
                                            vm.adminAddQari(qariNameUz, qariNameAr, qariCountry, qariStyle, qariBio)
                                            qariNameUz = ""; qariNameAr = ""; qariBio = ""
                                        }
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = palette.goldAccent, contentColor = Color(0xFF031814)),
                                    modifier = Modifier.fillMaxWidth()
                                ) { Text("Qorini nashr qilish") }
                            }
                        }
                    }
                    items(state.qaris, key = { it.id }) { q ->
                        AsakaGlassCard(cornerRadius = 14.dp) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Column {
                                    Text(q.nameUz, style = MaterialTheme.typography.titleSmall, color = palette.textPrimary)
                                    Text("${q.countryUz} · ${q.styleUz} · ${q.publishedSurahsCount} sura", style = MaterialTheme.typography.labelMedium, color = palette.textSecondary)
                                }
                                Text(q.nameAr, color = palette.goldAccent)
                            }
                        }
                    }
                }
                "subs" -> {
                    item {
                        AsakaGlassCard(elevated = true) {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("Sovgʻa Premium Berish & Promokod", style = MaterialTheme.typography.titleSmall, color = palette.goldAccent)
                                OutlinedTextField(value = grantUserId, onValueChange = { grantUserId = it }, label = { Text("Foydalanuvchi ID (and_... / tg_...)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                                OutlinedTextField(value = grantDays, onValueChange = { grantDays = it }, label = { Text("Kunlar soni") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                                Button(
                                    onClick = {
                                        val d = grantDays.toIntOrNull() ?: 30
                                        if (grantUserId.isNotBlank()) {
                                            vm.adminGrantPremium(grantUserId, d, "Android Admin Grant")
                                            grantUserId = ""
                                        }
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = palette.goldAccent, contentColor = Color(0xFF031814))
                                ) { Text("Premium faollashtirish") }
                                Spacer(modifier = Modifier.height(6.dp))
                                OutlinedTextField(value = promoCode, onValueChange = { promoCode = it }, label = { Text("Yangi promokod (RAMAZON2026)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    OutlinedTextField(value = promoDiscount, onValueChange = { promoDiscount = it }, label = { Text("Chegirma %") }, singleLine = true, modifier = Modifier.weight(1f))
                                    OutlinedTextField(value = promoBonusDays, onValueChange = { promoBonusDays = it }, label = { Text("Bonus kun") }, singleLine = true, modifier = Modifier.weight(1f))
                                }
                                OutlinedButton(onClick = {
                                    if (promoCode.isNotBlank()) {
                                        vm.adminCreatePromoCode(promoCode, promoDiscount.toIntOrNull() ?: 20, promoBonusDays.toIntOrNull() ?: 0)
                                        promoCode = ""
                                    }
                                }) { Text("Promokod yaratish", color = palette.goldAccent) }
                            }
                        }
                    }
                    if (state.adminOrders.isNotEmpty()) {
                        item { Text("Karta Toʻlov Buyurtmalari (${state.adminOrders.size})", style = MaterialTheme.typography.titleSmall, color = palette.goldAccent) }
                        items(state.adminOrders.take(15), key = { it.orderId }) { ord ->
                            AsakaGlassCard(cornerRadius = 14.dp) {
                                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Text("${ord.userDisplayName} (${ord.platform}) · ${ord.status}", style = MaterialTheme.typography.titleSmall, color = palette.textPrimary)
                                    Text("Reja: ${ord.planId} · ${ord.finalPriceUzs} soʻm · Chek: ${ord.receiptReference}", style = MaterialTheme.typography.labelMedium, color = palette.textSecondary)
                                    if (ord.status == "PENDING") {
                                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            Button(
                                                onClick = { vm.adminReviewOrder(ord.orderId, true) },
                                                colors = ButtonDefaults.buttonColors(containerColor = palette.emeraldAccent, contentColor = Color(0xFF031814))
                                            ) {
                                                Icon(Icons.Rounded.CheckCircle, contentDescription = null, modifier = Modifier.size(16.dp))
                                                Spacer(modifier = Modifier.width(4.dp))
                                                Text("Tasdiqlash")
                                            }
                                            OutlinedButton(onClick = { vm.adminReviewOrder(ord.orderId, false) }) {
                                                Icon(Icons.Rounded.Close, contentDescription = null, tint = palette.danger, modifier = Modifier.size(16.dp))
                                                Spacer(modifier = Modifier.width(4.dp))
                                                Text("Rad etish", color = palette.danger)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if (state.adminFeatureFlags.isNotEmpty()) {
                        item { Text("26 ta Funksiya — Free ↔ Premium Boshqaruvi", style = MaterialTheme.typography.titleSmall, color = palette.goldAccent) }
                        items(state.adminFeatureFlags, key = { it.key }) { flag ->
                            val isPremium = flag.access == "premium"
                            AsakaGlassCard(cornerRadius = 14.dp) {
                                Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(flag.labelUz, style = MaterialTheme.typography.titleSmall, color = palette.textPrimary)
                                        Text("${flag.module} · ${flag.key}", style = MaterialTheme.typography.labelMedium, color = palette.textMuted)
                                    }
                                    OutlinedButton(onClick = {
                                        vm.adminToggleFeature(flag.key, if (isPremium) "free" else "premium", flag.isEnabled)
                                    }) {
                                        Text(if (isPremium) "PREMIUM" else "BEPUL", color = if (isPremium) palette.goldAccent else palette.emeraldAccent)
                                    }
                                }
                            }
                        }
                    }
                }
                "moderation" -> {
                    val inquiries = state.centralDb.imamInquiries
                    if (inquiries.isEmpty()) {
                        item {
                            AsakaGlassCard(cornerRadius = 16.dp) {
                                Text("Hozircha murojaatlar yoki shikoyatlar yoʻq.", style = MaterialTheme.typography.bodySmall, color = palette.textSecondary)
                            }
                        }
                    } else {
                        items(inquiries.take(30), key = { it.id }) { inq ->
                            var replyDraft by remember(inq.id) { mutableStateOf(inq.answer) }
                            AsakaGlassCard(
                                cornerRadius = 16.dp,
                                borderColor = if (inq.status == "pending") palette.goldAccent else null
                            ) {
                                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text("${inq.authorName} · ${inq.status.uppercase()}", style = MaterialTheme.typography.labelMedium, color = palette.goldAccent, fontWeight = FontWeight.Bold)
                                    Text(inq.question, style = MaterialTheme.typography.bodyMedium, color = palette.textPrimary)
                                    OutlinedTextField(
                                        value = replyDraft,
                                        onValueChange = { replyDraft = it },
                                        label = { Text("Imom / Admin javobi") },
                                        minLines = 2,
                                        modifier = Modifier.fillMaxWidth()
                                    )
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Button(
                                            onClick = {
                                                if (replyDraft.isNotBlank()) vm.adminReplyInquiry(inq.id, replyDraft)
                                            },
                                            colors = ButtonDefaults.buttonColors(containerColor = palette.emeraldAccent, contentColor = Color(0xFF031814))
                                        ) { Text("Javob berish") }
                                        OutlinedButton(onClick = { vm.adminArchiveInquiry(inq.id) }) {
                                            Text("Arxivlash", color = palette.danger)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                else -> {
                    item {
                        AsakaGlassCard(elevated = true) {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("Push Bildirishnoma Broadcast (Web + Android)", style = MaterialTheme.typography.titleSmall, color = palette.goldAccent)
                                OutlinedTextField(value = pushTitle, onValueChange = { pushTitle = it }, label = { Text("Bildirishnoma sarlavhasi") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                                OutlinedTextField(value = pushBody, onValueChange = { pushBody = it }, label = { Text("Bildirishnoma matni") }, minLines = 2, modifier = Modifier.fillMaxWidth())
                                Button(
                                    onClick = {
                                        if (pushTitle.isNotBlank() && pushBody.isNotBlank()) {
                                            vm.adminBroadcastPush(pushTitle, pushBody)
                                            pushTitle = ""; pushBody = ""
                                        }
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = palette.goldAccent, contentColor = Color(0xFF031814))
                                ) { Text("Push yuborish") }
                            }
                        }
                    }
                    item {
                        AsakaGlassCard(cornerRadius = 18.dp) {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("Telegram Bot Broadcast", style = MaterialTheme.typography.titleSmall, color = palette.goldAccent)
                                OutlinedTextField(value = tgMessage, onValueChange = { tgMessage = it }, label = { Text("Telegram xabar matni") }, minLines = 3, modifier = Modifier.fillMaxWidth())
                                Button(
                                    onClick = {
                                        if (tgMessage.isNotBlank()) {
                                            vm.adminBroadcastTelegram(tgMessage)
                                            tgMessage = ""
                                        }
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = palette.emeraldAccent, contentColor = Color(0xFF031814))
                                ) { Text("Telegramga yuborish") }
                            }
                        }
                    }
                }
            }
        }
    }
}
