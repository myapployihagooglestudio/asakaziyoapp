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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AdminPanelSettings
import androidx.compose.material.icons.rounded.Apps
import androidx.compose.material.icons.rounded.Bookmark
import androidx.compose.material.icons.rounded.Fingerprint
import androidx.compose.material.icons.rounded.Gavel
import androidx.compose.material.icons.rounded.Language
import androidx.compose.material.icons.rounded.Link
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.Palette
import androidx.compose.material.icons.rounded.WorkspacePremium
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
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
import androidx.compose.ui.unit.dp
import uz.asakaziyo.app.i18n.AsakaLocale
import uz.asakaziyo.app.i18n.LocalAsakaStrings
import uz.asakaziyo.app.ui.components.AsakaDeveloperAttributionFooter
import uz.asakaziyo.app.ui.theme.AsakaGlassCard
import uz.asakaziyo.app.ui.theme.LocalAsakaColors
import uz.asakaziyo.app.viewmodel.AsakaUiState

@Composable
fun ProfileScreen(
    state: AsakaUiState,
    onUpdateDisplayName: (String) -> Unit,
    onUpdateLanguage: (String) -> Unit,
    onUpdateTheme: (String) -> Unit,
    onUpdateReducedMotion: (Boolean) -> Unit,
    onUpdateBiometricLock: (Boolean) -> Unit,
    onUpdatePrayerNotify: (Boolean) -> Unit,
    onUpdateSmartReminders: (Boolean?, Boolean?, Boolean?) -> Unit,
    onSubmitCardOrder: (String, String, String) -> Unit,
    onRedeemPromo: (String) -> Unit,
    onJoinDraw: (String) -> Unit,
    onGenerateLinkCode: () -> Unit,
    onRedeemLinkCode: (String) -> Unit,
    onOpenModule: (String) -> Unit
) {
    val palette = LocalAsakaColors.current
    val strings = LocalAsakaStrings.current

    var nameInput by remember(state.settings.displayName) { mutableStateOf(state.settings.displayName) }
    var selectedPlanId by remember { mutableStateOf("premium_1m") }
    var receiptRef by remember { mutableStateOf("") }
    var promoInput by remember { mutableStateOf("") }
    var linkCodeInput by remember { mutableStateOf("") }
    var showAllFeatures by remember { mutableStateOf(false) }

    val isPrem = state.subscription?.isPremium == true

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 14.dp, bottom = 110.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // 1. User Profile Identity Card
        item {
            AsakaGlassCard(elevated = true) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Shaxsiy Profil · Yagona Ekotizim", style = MaterialTheme.typography.titleMedium, color = palette.goldAccent)
                    Text("Hisob ID: ${state.settings.userId}", style = MaterialTheme.typography.labelMedium, color = palette.textMuted)
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = nameInput,
                            onValueChange = { nameInput = it },
                            label = { Text("Ismingiz") },
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                        Button(
                            onClick = { onUpdateDisplayName(nameInput) },
                            colors = ButtonDefaults.buttonColors(containerColor = palette.goldAccent, contentColor = Color(0xFF031814))
                        ) { Text("Saqlash") }
                    }
                    OutlinedButton(onClick = onGenerateLinkCode, modifier = Modifier.fillMaxWidth()) {
                        Icon(Icons.Rounded.Link, contentDescription = null, tint = palette.goldAccent)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            state.telegramLinkCode?.let { "Telegram bogʻlash kodi: $it (/link $it)" } ?: strings.linkTelegram,
                            color = palette.goldAccent
                        )
                    }
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = linkCodeInput,
                            onValueChange = { linkCodeInput = it.filter { ch -> ch.isDigit() }.take(6) },
                            label = { Text("Web/Telegram 6 xonali kod") },
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedButton(
                            onClick = {
                                if (linkCodeInput.length == 6) {
                                    onRedeemLinkCode(linkCodeInput)
                                    linkCodeInput = ""
                                }
                            }
                        ) { Text("Bogʻlash", color = palette.emeraldAccent) }
                    }
                }
            }
        }

        // 2. Unified Cross-Module Free & Premium Subscription Hub
        item {
            AsakaGlassCard(elevated = true, borderColor = palette.goldAccent) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Rounded.WorkspacePremium, contentDescription = null, tint = palette.goldAccent)
                        Spacer(modifier = Modifier.width(8.dp))
                        Column {
                            Text(strings.premiumHub, style = MaterialTheme.typography.titleMedium, color = palette.goldAccent)
                            Text(
                                if (isPrem) "Faol: ${state.subscription?.status} · ${state.subscription?.daysRemaining ?: 0} kun qoldi"
                                else "Bepul (Free) · Barcha 17 boʻlim boʻyicha yagona obuna",
                                style = MaterialTheme.typography.bodySmall,
                                color = palette.textSecondary
                            )
                        }
                    }

                    // Show dynamic plans from backend
                    val paidPlans = state.plans.filter { it.id != "free" }
                    if (paidPlans.isNotEmpty() && !isPrem) {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                            paidPlans.forEach { plan ->
                                val active = selectedPlanId == plan.id
                                Surface(
                                    shape = RoundedCornerShape(14.dp),
                                    color = if (active) palette.goldSoftBg else palette.glassSurface,
                                    border = BorderStroke(1.dp, if (active) palette.goldAccent else palette.luminousBorder),
                                    modifier = Modifier.weight(1f).clickable { selectedPlanId = plan.id }
                                ) {
                                    Column(modifier = Modifier.padding(10.dp)) {
                                        Text(plan.nameUz, style = MaterialTheme.typography.labelMedium, color = palette.goldAccent, fontWeight = FontWeight.Bold)
                                        Text("${plan.priceUzs} soʻm", style = MaterialTheme.typography.titleSmall, color = palette.textPrimary)
                                        Text("${plan.durationDays} kun", style = MaterialTheme.typography.labelMedium, color = palette.textMuted)
                                    }
                                }
                            }
                        }

                        if (state.cardConfig.isActive && state.cardConfig.cardNumber.isNotBlank()) {
                            Surface(shape = RoundedCornerShape(12.dp), color = palette.emeraldSoftBg, modifier = Modifier.fillMaxWidth()) {
                                Column(modifier = Modifier.padding(10.dp)) {
                                    Text("${state.cardConfig.bankName} · ${state.cardConfig.cardholderName}", style = MaterialTheme.typography.labelMedium, color = palette.emeraldAccent)
                                    Text(state.cardConfig.cardNumber, style = MaterialTheme.typography.titleSmall, color = palette.textPrimary, fontWeight = FontWeight.Bold)
                                    Text("PIN, CVV yoki SMS kod hech qachon soʻralmaydi!", style = MaterialTheme.typography.labelMedium, color = palette.textMuted)
                                }
                            }
                        }

                        OutlinedTextField(
                            value = receiptRef,
                            onValueChange = { receiptRef = it },
                            label = { Text("Toʻlov cheki / izoh raqami") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        Button(
                            onClick = {
                                if (receiptRef.isNotBlank()) {
                                    onSubmitCardOrder(selectedPlanId, receiptRef, promoInput)
                                    receiptRef = ""
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = palette.goldAccent, contentColor = Color(0xFF031814)),
                            modifier = Modifier.fillMaxWidth()
                        ) { Text("Premium soʻrovini yuborish") }
                    }

                    // Promo Code Redemption
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = promoInput,
                            onValueChange = { promoInput = it },
                            label = { Text("Promokod") },
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedButton(onClick = {
                            if (promoInput.isNotBlank()) {
                                onRedeemPromo(promoInput)
                                promoInput = ""
                            }
                        }) { Text("Faollashtirish", color = palette.goldAccent) }
                    }

                    // Fair Random Draws
                    state.randomDraws.take(2).forEach { draw ->
                        Surface(shape = RoundedCornerShape(12.dp), color = palette.glassSurfaceElevated, modifier = Modifier.fillMaxWidth()) {
                            Row(modifier = Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(draw.titleUz, style = MaterialTheme.typography.titleSmall, color = palette.textPrimary)
                                    Text("${draw.prizeDays} kun Premium · ${draw.entriesCount} ishtirokchi", style = MaterialTheme.typography.labelMedium, color = palette.textSecondary)
                                }
                                OutlinedButton(onClick = { onJoinDraw(draw.id) }) { Text("Qatnashish", color = palette.emeraldAccent) }
                            }
                        }
                    }

                    // Cross-Module Entitlements Preview (All 17 modules)
                    OutlinedButton(onClick = { showAllFeatures = !showAllFeatures }, modifier = Modifier.fillMaxWidth()) {
                        Text(
                            if (showAllFeatures) "Funksiyalar roʻyxatini yopish" else "Barcha ${state.entitlements.size} funksiya huquqlarini koʻrish",
                            color = palette.textPrimary
                        )
                    }
                    if (showAllFeatures) {
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            state.entitlements.forEach { f ->
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text(f.titleUz, style = MaterialTheme.typography.bodySmall, color = palette.textPrimary, modifier = Modifier.weight(1f))
                                    val badge = when {
                                        !f.isEnabled -> "Oʻchiq"
                                        f.allowed && f.limit == null -> "Cheksiz"
                                        f.allowed -> "${f.remaining ?: 0}/${f.limit}"
                                        else -> "Premium"
                                    }
                                    Text(badge, style = MaterialTheme.typography.labelMedium, color = if (f.allowed) palette.emeraldAccent else palette.goldAccent)
                                }
                            }
                        }
                    }
                }
            }
        }

        // 3. 5-Language Switcher (incl. Yangi O'zbek Lotin: ş ç ö ğ)
        item {
            AsakaGlassCard {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Rounded.Language, contentDescription = null, tint = palette.goldAccent)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(strings.languageLabel, style = MaterialTheme.typography.titleSmall, color = palette.textPrimary)
                    }
                    AsakaLocale.entries.forEach { loc ->
                        val active = state.settings.languageCode.equals(loc.code, ignoreCase = true)
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = if (active) palette.goldSoftBg else Color.Transparent,
                            border = BorderStroke(1.dp, if (active) palette.goldAccent else palette.luminousBorder),
                            modifier = Modifier.fillMaxWidth().clickable { onUpdateLanguage(loc.code) }
                        ) {
                            Text(
                                loc.nativeLabel,
                                color = if (active) palette.goldAccent else palette.textPrimary,
                                style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp)
                            )
                        }
                    }
                }
            }
        }

        // 4. Theme (Dark OLED / Light Ivory / System) & Motion
        item {
            AsakaGlassCard {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Rounded.Palette, contentDescription = null, tint = palette.goldAccent)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(strings.themeLabel, style = MaterialTheme.typography.titleSmall, color = palette.textPrimary)
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        listOf("dark" to strings.darkMode, "light" to strings.lightMode, "system" to strings.systemMode).forEach { (mode, lbl) ->
                            val active = state.settings.themeMode == mode
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = if (active) palette.goldSoftBg else Color.Transparent,
                                border = BorderStroke(1.dp, if (active) palette.goldAccent else palette.luminousBorder),
                                modifier = Modifier.weight(1f).clickable { onUpdateTheme(mode) }
                            ) {
                                Text(lbl, color = if (active) palette.goldAccent else palette.textSecondary, style = MaterialTheme.typography.labelMedium, modifier = Modifier.padding(horizontal = 8.dp, vertical = 10.dp))
                            }
                        }
                    }
                    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(strings.reducedMotion, style = MaterialTheme.typography.bodyMedium, color = palette.textPrimary, modifier = Modifier.weight(1f))
                        Switch(checked = state.settings.reducedMotion, onCheckedChange = onUpdateReducedMotion)
                    }
                }
            }
        }

        // 5. Security (Biometric Lock) & Smart Notifications
        item {
            AsakaGlassCard {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                            Icon(Icons.Rounded.Fingerprint, contentDescription = null, tint = palette.goldAccent)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(strings.biometricLock, style = MaterialTheme.typography.bodyMedium, color = palette.textPrimary)
                        }
                        Switch(checked = state.settings.biometricLockEnabled, onCheckedChange = onUpdateBiometricLock)
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Rounded.Notifications, contentDescription = null, tint = palette.emeraldAccent)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Aqlli Bildirishnomalar", style = MaterialTheme.typography.titleSmall, color = palette.textPrimary)
                    }
                    SettingToggleRow("Namoz vaqtlari eslatmasi", state.settings.prayerNotificationsEnabled, onUpdatePrayerNotify)
                    SettingToggleRow("Kunlik Qurʼon oʻqish eslatmasi", state.settings.quranReminderEnabled) { onUpdateSmartReminders(it, null, null) }
                    SettingToggleRow("Hifz va Murojaʼa eslatmasi", state.settings.hifzReminderEnabled) { onUpdateSmartReminders(null, it, null) }
                    SettingToggleRow("Kunlik Zikr eslatmasi", state.settings.dhikrReminderEnabled) { onUpdateSmartReminders(null, null, it) }
                }
            }
        }

        // 5.5 Full Ecosystem Hub, Notifications, Favorites, Legal & Role-Protected Admin Panel
        item {
            AsakaGlassCard(elevated = true) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Ekotizim, Sevimlilar & Boshqaruv", style = MaterialTheme.typography.titleSmall, color = palette.goldAccent)
                    OutlinedButton(onClick = { onOpenModule("all_services") }, modifier = Modifier.fillMaxWidth()) {
                        Icon(Icons.Rounded.Apps, contentDescription = null, tint = palette.goldAccent)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Barcha 32+ Xizmat (v7.0.0 Web Parity)", color = palette.textPrimary)
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        OutlinedButton(onClick = { onOpenModule("notifications") }, modifier = Modifier.weight(1f)) {
                            Icon(Icons.Rounded.Notifications, contentDescription = null, tint = palette.emeraldAccent)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Xabarlar", color = palette.textPrimary)
                        }
                        OutlinedButton(onClick = { onOpenModule("favorites") }, modifier = Modifier.weight(1f)) {
                            Icon(Icons.Rounded.Bookmark, contentDescription = null, tint = palette.goldAccent)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Sevimlilar", color = palette.textPrimary)
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        OutlinedButton(onClick = { onOpenModule("planner") }, modifier = Modifier.weight(1f)) {
                            Text("Ibodat Rejasi", color = palette.goldAccent)
                        }
                        OutlinedButton(onClick = { onOpenModule("performance") }, modifier = Modifier.weight(1f)) {
                            Text("Sync & Holat", color = palette.emeraldAccent)
                        }
                    }
                    OutlinedButton(onClick = { onOpenModule("legal") }, modifier = Modifier.fillMaxWidth()) {
                        Icon(Icons.Rounded.Gavel, contentDescription = null, tint = palette.textSecondary)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Maxfiylik siyosati va Hisobni oʻchirish", color = palette.textSecondary)
                    }
                    Button(
                        onClick = { onOpenModule("admin") },
                        colors = ButtonDefaults.buttonColors(containerColor = palette.goldSoftBg, contentColor = palette.goldAccent),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Rounded.AdminPanelSettings, contentDescription = null, tint = palette.goldAccent)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            if (state.adminSession.isAuthenticated) "Admin Panel (Faol: ${state.adminSession.username})"
                            else "Administrator Paneli (Rol bilan himoyalangan)",
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }

        // 6. About ASAKA ZIYO (Single Source of Truth: Android BuildConfig)
        item {
            AsakaGlassCard {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        text = strings.aboutTitle,
                        style = MaterialTheme.typography.titleSmall,
                        color = palette.goldAccent
                    )
                    Text(
                        text = "ASAKA ZIYO v${uz.asakaziyo.app.BuildConfig.VERSION_NAME} (Build ${uz.asakaziyo.app.BuildConfig.VERSION_CODE})",
                        style = MaterialTheme.typography.titleMedium,
                        color = palette.textPrimary
                    )
                    Text(
                        text = "Paket: ${uz.asakaziyo.app.BuildConfig.APPLICATION_ID} · Native Jetpack Compose (Material 3)",
                        style = MaterialTheme.typography.bodySmall,
                        color = palette.textSecondary
                    )
                    Text(
                        text = "Server: ${uz.asakaziyo.app.BuildConfig.BACKEND_BASE_URL}",
                        style = MaterialTheme.typography.labelMedium,
                        color = palette.textMuted
                    )
                }
            }
        }

        item { AsakaDeveloperAttributionFooter() }
    }
}

@Composable
private fun SettingToggleRow(label: String, checked: Boolean, onChange: (Boolean) -> Unit) {
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
