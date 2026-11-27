package uz.asakaziyo.app.ui.screens

import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
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
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.Send
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material.icons.rounded.Mic
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Share
import androidx.compose.material.icons.rounded.Sync
import androidx.compose.material.icons.rounded.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.asakaziyo.app.data.AsakaCatalogData
import uz.asakaziyo.app.data.CityOption
import uz.asakaziyo.app.data.DownloadTaskState
import uz.asakaziyo.app.ui.theme.AsakaGlassCard
import uz.asakaziyo.app.ui.theme.AsakaProgressRing
import uz.asakaziyo.app.ui.theme.LocalAsakaColors
import uz.asakaziyo.app.viewmodel.AsakaAppViewModel
import uz.asakaziyo.app.viewmodel.AsakaUiState
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin

@Composable
fun IslamicModuleRouterScreen(
    moduleId: String,
    state: AsakaUiState,
    vm: AsakaAppViewModel,
    onBack: () -> Unit,
    onOpenModule: (String) -> Unit,
    onSelectCity: (CityOption) -> Unit,
    onTasbehTap: () -> Unit,
    onTasbehReset: () -> Unit,
    onTasbehPreset: (Int) -> Unit,
    onSendAi: (String) -> Unit,
    onRequestVoiceInput: () -> Unit,
    onCancelDownload: (String) -> Unit,
    onRetryDownload: (DownloadTaskState) -> Unit,
    onDeleteDownloaded: (String) -> Unit,
    onClearAllDownloads: () -> Unit,
    onSyncNow: () -> Unit
) {
    when (moduleId) {
        "prayer" -> PrayerTimesModuleScreen(state, onBack, onSelectCity)
        "qibla" -> QiblaCompassModuleScreen(state, onBack)
        "tasbeh" -> TasbehModuleScreen(state, onBack, onTasbehTap, onTasbehReset, onTasbehPreset)
        "hadith" -> HadithDuaModuleScreen(state, onBack)
        "offline" -> OfflineCenterModuleScreen(
            state,
            onBack,
            onCancelDownload,
            onRetryDownload,
            onDeleteDownloaded,
            onClearAllDownloads,
            onSyncNow
        )
        "ai" -> AiAssistantModuleScreen(state, onBack, onSendAi, onRequestVoiceInput)
        "all_services" -> AllServicesHubScreen(
            state = state,
            onBack = onBack,
            onOpenModule = onOpenModule,
            onRefresh = { vm.checkManifestAndRefresh(force = true) }
        )
        "articles", "news", "announcements" -> ArticlesNewsScreen(
            initialTab = moduleId,
            state = state,
            vm = vm,
            onBack = onBack
        )
        "community", "charity" -> CommunityScreen(
            initialTab = if (moduleId == "charity") "charity" else "chat",
            state = state,
            vm = vm,
            onBack = onBack
        )
        "quiz", "khatm" -> QuizAndKhatmScreen(
            initialTab = moduleId,
            state = state,
            vm = vm,
            onBack = onBack
        )
        "library", "academy", "media", "tv" -> LibraryMediaScreen(
            initialTab = moduleId,
            state = state,
            vm = vm,
            onBack = onBack
        )
        "scholars", "mosques", "calendar", "fasting", "notifications", "favorites", "legal" -> KnowledgeAndToolsScreen(
            moduleId = moduleId,
            state = state,
            vm = vm,
            onBack = onBack
        )
        "planner" -> SmartIbadatPlannerScreen(state = state, vm = vm, onBack = onBack)
        "performance" -> AppPerformanceCenterScreen(state = state, vm = vm, onBack = onBack)
        "daily_archive" -> DailyWisdomArchiveScreen(state = state, vm = vm, onBack = onBack)
        "achievements" -> IslamicAchievementsScreen(state = state, onBack = onBack)
        "prayer_journal" -> PrayerJournalScreen(state = state, vm = vm, onBack = onBack)
        "reminder_dashboard" -> ReminderDashboardScreen(
            state = state,
            vm = vm,
            onBack = onBack,
            onOpenPlanner = { onOpenModule("planner") }
        )
        "display" -> PublicDisplayScreen(state = state, onBack = onBack)
        "admin" -> AdminPanelScreen(state = state, vm = vm, onBack = onBack)
        else -> AllServicesHubScreen(
            state = state,
            onBack = onBack,
            onOpenModule = onOpenModule,
            onRefresh = { vm.checkManifestAndRefresh(force = true) }
        )
    }
}

@Composable
private fun ModuleTopBar(title: String, subtitle: String, onBack: () -> Unit) {
    val palette = LocalAsakaColors.current
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(onClick = onBack) {
            Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Back", tint = palette.goldAccent)
        }
        Column {
            Text(title, style = MaterialTheme.typography.titleMedium, color = palette.textPrimary)
            Text(subtitle, style = MaterialTheme.typography.labelMedium, color = palette.textSecondary)
        }
    }
}

@Composable
private fun PrayerTimesModuleScreen(
    state: AsakaUiState,
    onBack: () -> Unit,
    onSelectCity: (CityOption) -> Unit
) {
    val palette = LocalAsakaColors.current
    var cityQuery by remember { mutableStateOf("") }
    val prayer = state.prayerSchedule
    val weather = state.weather
    val filteredCities = remember(cityQuery, state.availableCities) {
        val q = cityQuery.trim().lowercase()
        if (q.isBlank()) state.availableCities.take(24)
        else state.availableCities.filter {
            it.cityName.lowercase().contains(q) || it.regionName.lowercase().contains(q) || it.countryName.lowercase().contains(q)
        }.take(30)
    }

    Column(modifier = Modifier.fillMaxSize()) {
        ModuleTopBar("Namoz Vaqtlari & Ob-havo", "Asaka MANUAL_ADMIN · 14 Hudud · Jahon Shaharlari", onBack)
        LazyColumn(
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 100.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                AsakaGlassCard(elevated = true) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Column {
                                Text(prayer?.cityName ?: state.settings.selectedCityName, style = MaterialTheme.typography.headlineSmall, color = palette.goldAccent)
                                Text(
                                    if (prayer?.sourceMode == "MANUAL_ADMIN") "Admin tomonidan tasdiqlangan (MANUAL_ADMIN)" else "Astronomik AUTO taqvim",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = palette.emeraldAccent
                                )
                            }
                            if (weather != null) {
                                Column(horizontalAlignment = Alignment.End) {
                                    Text("${Math.round(weather.tempC)}°C", style = MaterialTheme.typography.headlineSmall, color = palette.textPrimary)
                                    Text(weather.conditionUz, style = MaterialTheme.typography.labelMedium, color = palette.textSecondary)
                                }
                            }
                        }
                        if (prayer != null) {
                            val rows = listOf(
                                "Bomdod (Fajr)" to prayer.fajr,
                                "Quyosh chiqishi" to prayer.sunrise,
                                "Peshin (Dhuhr)" to prayer.dhuhr,
                                "Asr" to prayer.asr,
                                "Shom (Maghrib)" to prayer.maghrib,
                                "Xufton (Isha)" to prayer.isha
                            ) + if (prayer.tahajjud.isNotBlank()) listOf("Tahajjud" to prayer.tahajjud) else emptyList()

                            rows.forEach { (name, time) ->
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 3.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(name, style = MaterialTheme.typography.bodyMedium, color = palette.textSecondary)
                                    Text(time, style = MaterialTheme.typography.titleSmall, color = palette.textPrimary, fontWeight = FontWeight.Bold)
                                }
                            }
                            if (weather != null) {
                                Text(weather.attribution, style = MaterialTheme.typography.labelMedium, color = palette.textMuted)
                            }
                        }
                    }
                }
            }
            item {
                OutlinedTextField(
                    value = cityQuery,
                    onValueChange = { cityQuery = it },
                    placeholder = { Text("Shahar yoki viloyat izlash (Asaka, Toshkent, Makka...)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }
            items(filteredCities, key = { it.id }) { city ->
                val selected = city.id == state.settings.selectedCityId
                AsakaGlassCard(
                    cornerRadius = 14.dp,
                    borderColor = if (selected) palette.goldAccent else null,
                    onClick = { onSelectCity(city) }
                ) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Column {
                            Text(city.cityName, style = MaterialTheme.typography.titleSmall, color = palette.textPrimary)
                            Text("${city.regionName} · ${city.countryName}", style = MaterialTheme.typography.labelMedium, color = palette.textSecondary)
                        }
                        Text(
                            text = if (city.isManualAdmin) "MANUAL" else "AUTO",
                            color = if (city.isManualAdmin) palette.goldAccent else palette.emeraldAccent,
                            style = MaterialTheme.typography.labelMedium
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun QiblaCompassModuleScreen(state: AsakaUiState, onBack: () -> Unit) {
    val context = LocalContext.current
    val palette = LocalAsakaColors.current
    val haptics = LocalHapticFeedback.current
    var azimuthDeg by remember { mutableFloatStateOf(0f) }

    val selectedCity = state.availableCities.firstOrNull { it.id == state.settings.selectedCityId }
    val lat = selectedCity?.latitude ?: 40.6415
    val lon = selectedCity?.longitude ?: 72.2387
    val qiblaBearing = remember(lat, lon) { calculateQiblaBearing(lat, lon) }
    val delta = ((qiblaBearing - azimuthDeg + 540f) % 360f) - 180f
    val isAligned = abs(delta) <= 4f

    DisposableEffect(context) {
        val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
        val rotationSensor = sensorManager.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR)
        val listener = object : SensorEventListener {
            override fun onSensorChanged(event: SensorEvent) {
                if (event.sensor.type == Sensor.TYPE_ROTATION_VECTOR) {
                    val rotMatrix = FloatArray(9)
                    val orientation = FloatArray(3)
                    SensorManager.getRotationMatrixFromVector(rotMatrix, event.values)
                    SensorManager.getOrientation(rotMatrix, orientation)
                    val deg = ((Math.toDegrees(orientation[0].toDouble()).toFloat()) + 360f) % 360f
                    azimuthDeg = deg
                }
            }
            override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
        }
        if (rotationSensor != null) {
            sensorManager.registerListener(listener, rotationSensor, SensorManager.SENSOR_DELAY_UI)
        }
        onDispose { sensorManager.unregisterListener(listener) }
    }

    Column(modifier = Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally) {
        ModuleTopBar("Qibla Kompasi", "${state.settings.selectedCityName} · ${qiblaBearing.toInt()}° WSW", onBack)
        Spacer(modifier = Modifier.height(28.dp))
        Box(modifier = Modifier.size(260.dp), contentAlignment = Alignment.Center) {
            val ringColor = if (isAligned) palette.emeraldAccent else palette.goldAccent
            Canvas(modifier = Modifier.size(250.dp)) {
                drawCircle(color = ringColor.copy(alpha = 0.2f), style = androidx.compose.ui.graphics.drawscope.Stroke(width = 8f))
                rotate(degrees = qiblaBearing - azimuthDeg) {
                    drawLine(
                        color = ringColor,
                        start = Offset(size.width / 2f, size.height / 2f),
                        end = Offset(size.width / 2f, 26f),
                        strokeWidth = 10f
                    )
                    drawCircle(color = ringColor, radius = 14f, center = Offset(size.width / 2f, 26f))
                }
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("${qiblaBearing.toInt()}°", style = MaterialTheme.typography.displaySmall, color = ringColor)
                Text(if (isAligned) "QIBLA TOʻGʻRI!" else "Telefonni buring", style = MaterialTheme.typography.labelMedium, color = palette.textSecondary)
            }
        }
        Spacer(modifier = Modifier.height(22.dp))
        AsakaGlassCard(modifier = Modifier.padding(horizontal = 20.dp)) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                Text("Kaʼba yoʻnalishi (Makka: 21.4225°, 39.8262°)", style = MaterialTheme.typography.titleSmall, color = palette.goldAccent)
                Spacer(modifier = Modifier.height(4.dp))
                Text("Aniq ishlashi uchun telefoningizni 8-shaklida aylantirib magnit sensorni kalibrlang.", style = MaterialTheme.typography.bodySmall, color = palette.textSecondary)
                if (isAligned) {
                    haptics.performHapticFeedback(HapticFeedbackType.LongPress)
                }
            }
        }
    }
}

private fun calculateQiblaBearing(latDeg: Double, lonDeg: Double): Float {
    val kaabaLat = Math.toRadians(21.4225)
    val kaabaLon = Math.toRadians(39.8262)
    val lat = Math.toRadians(latDeg)
    val dLon = kaabaLon - Math.toRadians(lonDeg)
    val y = sin(dLon) * cos(kaabaLat)
    val x = cos(lat) * sin(kaabaLat) - sin(lat) * cos(kaabaLat) * cos(dLon)
    return ((Math.toDegrees(atan2(y, x)) + 360.0) % 360.0).toFloat()
}

@Composable
private fun TasbehModuleScreen(
    state: AsakaUiState,
    onBack: () -> Unit,
    onTap: () -> Unit,
    onReset: () -> Unit,
    onPreset: (Int) -> Unit
) {
    val palette = LocalAsakaColors.current
    val haptics = LocalHapticFeedback.current
    val preset = AsakaCatalogData.dhikrPresets[state.tasbehIndex]
    val progress = (state.tasbehCount.toFloat() / preset.third.toFloat()).coerceIn(0f, 1f)

    Column(modifier = Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally) {
        ModuleTopBar("Raqamli Tasbeh & Zikr", "Bugungi jami zikr: ${state.tasbehTotalToday}", onBack)
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            itemsIndexed(AsakaCatalogData.dhikrPresets) { idx, item ->
                val active = idx == state.tasbehIndex
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = if (active) palette.goldSoftBg else palette.glassSurface,
                    border = BorderStroke(1.dp, if (active) palette.goldAccent else palette.luminousBorder),
                    modifier = Modifier.clickable { onPreset(idx) }
                ) {
                    Text(item.first, color = if (active) palette.goldAccent else palette.textSecondary, style = MaterialTheme.typography.labelMedium, modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp))
                }
            }
        }
        Spacer(modifier = Modifier.height(20.dp))
        Text(preset.second, fontSize = 30.sp, color = palette.goldAccent, fontWeight = FontWeight.Bold)
        Text(preset.first, style = MaterialTheme.typography.titleMedium, color = palette.textPrimary)
        Spacer(modifier = Modifier.height(26.dp))

        Box(
            modifier = Modifier
                .size(220.dp)
                .clip(CircleShape)
                .background(palette.glassSurfaceElevated)
                .clickable {
                    haptics.performHapticFeedback(HapticFeedbackType.LongPress)
                    onTap()
                },
            contentAlignment = Alignment.Center
        ) {
            AsakaProgressRing(progress = progress, size = 204.dp, strokeWidth = 10.dp) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("${state.tasbehCount}", fontSize = 48.sp, fontWeight = FontWeight.Bold, color = palette.goldAccent)
                    Text("/ ${preset.third}", style = MaterialTheme.typography.titleSmall, color = palette.textSecondary)
                }
            }
        }
        Spacer(modifier = Modifier.height(24.dp))
        OutlinedButton(onClick = onReset) {
            Icon(Icons.Rounded.Refresh, contentDescription = null, tint = palette.goldAccent)
            Spacer(modifier = Modifier.width(6.dp))
            Text("Nolga tushirish", color = palette.goldAccent)
        }
    }
}

@Composable
private fun HadithDuaModuleScreen(state: AsakaUiState, onBack: () -> Unit) {
    val context = LocalContext.current
    val palette = LocalAsakaColors.current
    Column(modifier = Modifier.fillMaxSize()) {
        ModuleTopBar("Sahih Hadislar va Duolar", "Server bilan real-vaqt sinxron + Oflayn toʻplam", onBack)
        LazyColumn(
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 100.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            if (state.centralDb.dynamicHadiths.isNotEmpty()) {
                item { Text("Admin Hadislari (${state.centralDb.dynamicHadiths.size})", style = MaterialTheme.typography.titleSmall, color = palette.emeraldAccent) }
                items(state.centralDb.dynamicHadiths, key = { it.id }) { h ->
                    AsakaGlassCard(cornerRadius = 16.dp, borderColor = palette.emeraldAccent.copy(alpha = 0.4f)) {
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(h.title, style = MaterialTheme.typography.titleSmall, color = palette.goldAccent)
                            if (h.arabic.isNotBlank()) Text(h.arabic, fontSize = 19.sp, color = palette.textPrimary)
                            Text(h.text, style = MaterialTheme.typography.bodyMedium, color = palette.textSecondary)
                            if (h.source.isNotBlank()) Text(h.source, style = MaterialTheme.typography.labelMedium, color = palette.emeraldAccent)
                        }
                    }
                }
            }
            item { Text("Sahih Hadislar", style = MaterialTheme.typography.titleSmall, color = palette.goldAccent) }
            items(AsakaCatalogData.sahihHadiths) { h ->
                AsakaGlassCard(cornerRadius = 16.dp) {
                    Column {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text(h.titleUz, style = MaterialTheme.typography.titleSmall, color = palette.textPrimary, modifier = Modifier.weight(1f))
                            IconButton(onClick = {
                                val send = Intent(Intent.ACTION_SEND).apply {
                                    type = "text/plain"
                                    putExtra(Intent.EXTRA_TEXT, "${h.titleUz}\n\n${h.textUz}\n(${h.source}) — ASAKA ZIYO")
                                }
                                context.startActivity(Intent.createChooser(send, "Hadisni ulashish"))
                            }) { Icon(Icons.Rounded.Share, contentDescription = "Share", tint = palette.goldAccent, modifier = Modifier.size(18.dp)) }
                        }
                        Text(h.textUz, style = MaterialTheme.typography.bodyMedium, color = palette.textSecondary)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(h.source, style = MaterialTheme.typography.labelMedium, color = palette.emeraldAccent)
                    }
                }
            }
            if (state.centralDb.dynamicDhikrs.isNotEmpty()) {
                item { Text("Admin Zikr va Duolari (${state.centralDb.dynamicDhikrs.size})", style = MaterialTheme.typography.titleSmall, color = palette.emeraldAccent) }
                items(state.centralDb.dynamicDhikrs, key = { it.id }) { d ->
                    AsakaGlassCard(cornerRadius = 16.dp) {
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text("${d.title} (${d.count}x)", style = MaterialTheme.typography.titleSmall, color = palette.textPrimary)
                            if (d.arabic.isNotBlank()) Text(d.arabic, fontSize = 20.sp, color = palette.goldAccent)
                            if (d.transliteration.isNotBlank()) Text(d.transliteration, style = MaterialTheme.typography.bodySmall, color = palette.emeraldAccent)
                            if (d.translation.isNotBlank()) Text(d.translation, style = MaterialTheme.typography.bodySmall, color = palette.textSecondary)
                        }
                    }
                }
            }
            item { Text("Kundalik Duolar", style = MaterialTheme.typography.titleSmall, color = palette.goldAccent) }
            items(AsakaCatalogData.authenticDuas) { d ->
                AsakaGlassCard(cornerRadius = 16.dp) {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(d.titleUz, style = MaterialTheme.typography.titleSmall, color = palette.textPrimary)
                        Text(d.arabic, fontSize = 20.sp, color = palette.goldAccent)
                        Text(d.transliteration, style = MaterialTheme.typography.bodySmall, color = palette.emeraldAccent)
                        Text(d.translationUz, style = MaterialTheme.typography.bodySmall, color = palette.textSecondary)
                    }
                }
            }
        }
    }
}

@Composable
private fun OfflineCenterModuleScreen(
    state: AsakaUiState,
    onBack: () -> Unit,
    onCancelDownload: (String) -> Unit,
    onRetryDownload: (DownloadTaskState) -> Unit,
    onDeleteDownloaded: (String) -> Unit,
    onClearAllDownloads: () -> Unit,
    onSyncNow: () -> Unit
) {
    val palette = LocalAsakaColors.current
    val totalMb = state.downloadedTracks.sumOf { it.second } / (1024.0 * 1024.0)

    Column(modifier = Modifier.fillMaxSize()) {
        ModuleTopBar("Oflayn Markaz & Download Manager", "Mushaf · Qori MP3 · SHA-256 · Bulut Sinxroni", onBack)
        LazyColumn(
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 100.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (state.isLowStorage) {
                item {
                    AsakaGlassCard(borderColor = palette.danger) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Rounded.Warning, contentDescription = null, tint = palette.danger)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Xotira kam qoldi (${state.freeStorageMb} MB). Yangi audio yuklash uchun joy boʻshating.", color = palette.danger, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
            item {
                AsakaGlassCard(elevated = true) {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("Oflayn Xotira Holati", style = MaterialTheme.typography.titleSmall, color = palette.goldAccent)
                        Text("Oflayn Mushaf suralari: ${state.cachedMushafSurahs.size} / 114", style = MaterialTheme.typography.bodyMedium, color = palette.textPrimary)
                        Text("Yuklangan Qori audiolari: ${state.downloadedTracks.size} ta (${"%.2f".format(totalMb)} MB)", style = MaterialTheme.typography.bodyMedium, color = palette.textPrimary)
                        Text("Boʻsh xotira: ${state.freeStorageMb} MB · Sinxron navbati: ${state.pendingSyncCount}", style = MaterialTheme.typography.bodySmall, color = palette.textSecondary)
                        Spacer(modifier = Modifier.height(6.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Button(
                                onClick = onSyncNow,
                                colors = ButtonDefaults.buttonColors(containerColor = palette.goldAccent, contentColor = Color(0xFF031814))
                            ) {
                                Icon(Icons.Rounded.Sync, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Hozir sinxronlash")
                            }
                            if (state.downloadedTracks.isNotEmpty()) {
                                OutlinedButton(onClick = onClearAllDownloads) {
                                    Text("Barchasini tozalash", color = palette.danger)
                                }
                            }
                        }
                    }
                }
            }

            val activeTasks = state.downloadTasks.values.filter { it.status != "COMPLETED" }
            if (activeTasks.isNotEmpty()) {
                item { Text("Yuklash Navbati (${activeTasks.size})", style = MaterialTheme.typography.titleSmall, color = palette.goldAccent) }
                items(activeTasks, key = { it.trackKey }) { task ->
                    AsakaGlassCard(cornerRadius = 14.dp) {
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Text(task.title, style = MaterialTheme.typography.titleSmall, color = palette.textPrimary, modifier = Modifier.weight(1f))
                                if (task.status == "DOWNLOADING" || task.status == "QUEUED") {
                                    IconButton(onClick = { onCancelDownload(task.trackKey) }) {
                                        Icon(Icons.Rounded.Close, contentDescription = "Pause", tint = palette.danger)
                                    }
                                } else {
                                    TextButton(onClick = { onRetryDownload(task) }) { Text("Qayta", color = palette.goldAccent) }
                                }
                            }
                            LinearProgressIndicator(
                                progress = { task.progressPercent / 100f },
                                modifier = Modifier.fillMaxWidth(),
                                color = palette.goldAccent
                            )
                            Text(task.error ?: "${task.status} · ${task.progressPercent}%", style = MaterialTheme.typography.labelMedium, color = if (task.error != null) palette.danger else palette.textSecondary)
                        }
                    }
                }
            }

            item { Text("Yuklangan Audio Fayllar (${state.downloadedTracks.size})", style = MaterialTheme.typography.titleSmall, color = palette.goldAccent) }
            items(state.downloadedTracks, key = { it.first }) { (key, bytes) ->
                AsakaGlassCard(cornerRadius = 14.dp) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(key, style = MaterialTheme.typography.titleSmall, color = palette.textPrimary)
                            Text("${"%.2f".format(bytes / (1024.0 * 1024.0))} MB · SHA-256 tekshirilgan", style = MaterialTheme.typography.labelMedium, color = palette.emeraldAccent)
                        }
                        IconButton(onClick = { onDeleteDownloaded(key) }) {
                            Icon(Icons.Rounded.Delete, contentDescription = "Delete", tint = palette.danger)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AiAssistantModuleScreen(
    state: AsakaUiState,
    onBack: () -> Unit,
    onSendAi: (String) -> Unit,
    onRequestVoiceInput: () -> Unit
) {
    val palette = LocalAsakaColors.current
    var prompt by remember { mutableStateOf("") }
    val aiEnt = state.entitlements.firstOrNull { it.key == "ai_ustoz_unlimited" }
    val quotaSubtitle = when {
        state.subscription?.isPremium == true -> "Premium · Cheksiz AI Ustoz"
        aiEnt != null && aiEnt.limit != null -> "Bepul kvota: ${aiEnt.remaining ?: 0}/${aiEnt.limit} qoldi"
        else -> "Xavfsiz markaziy server AI"
    }

    Column(modifier = Modifier.fillMaxSize()) {
        ModuleTopBar("AI Islomiy Yordamchi", quotaSubtitle, onBack)
        LazyColumn(
            modifier = Modifier.weight(1f),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            if (state.aiMessages.isEmpty()) {
                item {
                    AsakaGlassCard(cornerRadius = 16.dp) {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("Assalomu alaykum! Qanday savolingiz bor?", style = MaterialTheme.typography.titleSmall, color = palette.goldAccent)
                            Text("Qurʼon, hadis, tajvid, hifz rejasi va namoz vaqtlari boʻyicha savol bering.", style = MaterialTheme.typography.bodySmall, color = palette.textSecondary)
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                listOf("Tajvid nima?", "Mulk surasi fazilati").forEach { chip ->
                                    Surface(
                                        shape = RoundedCornerShape(10.dp),
                                        color = palette.goldSoftBg,
                                        modifier = Modifier.clickable { onSendAi(chip) }
                                    ) {
                                        Text(chip, color = palette.goldAccent, style = MaterialTheme.typography.labelMedium, modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp))
                                    }
                                }
                            }
                        }
                    }
                }
            }
            items(state.aiMessages, key = { it.id }) { msg ->
                val isUser = msg.role == "user"
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
                ) {
                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = if (isUser) palette.goldSoftBg else palette.glassSurfaceElevated,
                        border = BorderStroke(1.dp, if (isUser) palette.goldAccent else palette.luminousBorder),
                        modifier = Modifier.fillMaxWidth(0.86f)
                    ) {
                        Text(
                            text = msg.text,
                            color = palette.textPrimary,
                            style = MaterialTheme.typography.bodyMedium,
                            modifier = Modifier.padding(12.dp)
                        )
                    }
                }
            }
            if (state.isAiThinking) {
                item {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        CircularProgressIndicator(modifier = Modifier.size(18.dp), color = palette.goldAccent, strokeWidth = 2.dp)
                        Text("AI Ustoz javob tayyorlamoqda...", style = MaterialTheme.typography.bodySmall, color = palette.textSecondary)
                    }
                }
            }
        }
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onRequestVoiceInput) {
                Icon(Icons.Rounded.Mic, contentDescription = "Voice", tint = palette.goldAccent)
            }
            OutlinedTextField(
                value = prompt,
                onValueChange = { prompt = it },
                placeholder = { Text("Savolingizni yozing...") },
                modifier = Modifier.weight(1f),
                maxLines = 3
            )
            Spacer(modifier = Modifier.width(6.dp))
            IconButton(
                onClick = {
                    val text = prompt.trim()
                    if (text.isNotBlank()) {
                        prompt = ""
                        onSendAi(text)
                    }
                },
                enabled = !state.isAiThinking
            ) {
                Icon(Icons.AutoMirrored.Rounded.Send, contentDescription = "Send", tint = palette.goldAccent)
            }
        }
    }
}
