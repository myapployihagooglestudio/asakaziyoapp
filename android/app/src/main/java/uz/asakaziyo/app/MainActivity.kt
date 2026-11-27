package uz.asakaziyo.app

import android.Manifest
import android.app.Activity
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.speech.RecognizerIntent
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Fingerprint
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.WindowCompat
import uz.asakaziyo.app.i18n.AsakaLocale
import uz.asakaziyo.app.i18n.LocalAsakaStrings
import uz.asakaziyo.app.i18n.resolveAsakaStrings
import uz.asakaziyo.app.ui.components.AsakaFloatingMiniPlayer
import uz.asakaziyo.app.ui.components.AsakaFullAudioPlayerSheet
import uz.asakaziyo.app.ui.components.AsakaGlobalSearchDialog
import uz.asakaziyo.app.ui.components.AsakaMainTab
import uz.asakaziyo.app.ui.components.AsakaPremiumGateDialog
import uz.asakaziyo.app.ui.components.AsakaV5BottomNavBar
import uz.asakaziyo.app.ui.screens.AudioScreen
import uz.asakaziyo.app.ui.screens.HomeScreen
import uz.asakaziyo.app.ui.screens.IslamicModuleRouterScreen
import uz.asakaziyo.app.ui.screens.LearnScreen
import uz.asakaziyo.app.ui.screens.ProfileScreen
import uz.asakaziyo.app.ui.screens.QuranScreen
import uz.asakaziyo.app.ui.screens.V6OnboardingOverlay
import uz.asakaziyo.app.ui.theme.Asaka3DSpatialAuraBackdrop
import uz.asakaziyo.app.ui.theme.AsakaZiyoTheme
import uz.asakaziyo.app.ui.theme.LocalAsakaColors
import uz.asakaziyo.app.viewmodel.AsakaAppViewModel
import java.util.Locale

/**
 * ASAKA ZIYO v5.0.0 — Ultimate New-Generation Native Jetpack Compose Activity
 *
 * Complete standalone native rebuild:
 * - Kotlin + Jetpack Compose + Material 3 + MVVM (StateFlow / AndroidViewModel)
 * - 5 Main Native Tabs: Home, Qur'on, O'rganish, Audio, Profil
 * - Native Islamic Modules: Prayer Times & Weather, Sensor Qibla, Haptic Tasbeh, Hadith/Duas, Offline Center, Voice AI Assistant
 * - Media3 ExoPlayer Background Service with Floating Mini Player & Full Player Sheet
 * - 5-Language Native Localization + Dark/Light/System Theme + Reduced Motion + BiometricPrompt Lock
 * - 4 Home Screen AppWidgets + 4 Launcher App Shortcuts + Deep Links + FCM Channels
 */
class MainActivity : AppCompatActivity() {

    private val appViewModel: AsakaAppViewModel by viewModels()
    private val pendingTargetRoute = mutableStateOf<String?>(null)
    private val biometricUnlocked = mutableStateOf(false)

    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { /* Permission result handled gracefully by Android NotificationManager */ }

    private val voiceSearchLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val matches = result.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
            val spokenText = matches?.firstOrNull()?.trim()
            if (!spokenText.isNullOrBlank()) {
                appViewModel.sendAiMessage(spokenText)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)

        WindowCompat.setDecorFitsSystemWindows(window, false)
        ensureNotificationChannels()
        requestNotificationPermissionIfNeeded()
        handleIncomingIntent(intent)

        setContent {
            val state by appViewModel.uiState.collectAsState()
            val locale = remember(state.settings.languageCode) {
                AsakaLocale.fromCode(state.settings.languageCode)
            }
            val strings = remember(locale) { resolveAsakaStrings(locale) }

            AsakaZiyoTheme(
                themeMode = state.settings.themeMode,
                reducedMotion = state.settings.reducedMotion
            ) {
                val palette = LocalAsakaColors.current

                SideEffect {
                    val controller = WindowCompat.getInsetsController(window, window.decorView)
                    controller.isAppearanceLightStatusBars = !palette.isDark
                    controller.isAppearanceLightNavigationBars = !palette.isDark
                }

                CompositionLocalProvider(LocalAsakaStrings provides strings) {
                    val needsBiometric = state.settings.biometricLockEnabled && !biometricUnlocked.value
                    if (needsBiometric) {
                        BiometricLockGateScreen(
                            onAuthenticate = { triggerBiometricUnlock() }
                        )
                        LaunchedEffect(Unit) {
                            triggerBiometricUnlock()
                        }
                    } else {
                        AsakaV5RootApp(
                            viewModel = appViewModel,
                            pendingTargetRoute = pendingTargetRoute.value,
                            onConsumePendingRoute = { pendingTargetRoute.value = null },
                            onRequestVoiceInput = { launchVoiceRecognition() }
                        )
                    }
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        appViewModel.checkManifestAndRefresh(force = false)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIncomingIntent(intent)
    }

    private fun handleIncomingIntent(incoming: Intent?) {
        if (incoming == null) return
        val extraTarget = incoming.getStringExtra("targetView")?.trim()?.lowercase(Locale.US)
        if (!extraTarget.isNullOrBlank()) {
            pendingTargetRoute.value = extraTarget
            return
        }
        val uri = incoming.data ?: return
        val path = (uri.path ?: "").trim('/').lowercase(Locale.US)
        val queryView = uri.getQueryParameter("view")?.trim()?.lowercase(Locale.US)
        val resolved = queryView?.ifBlank { null } ?: path.ifBlank { null }
        if (!resolved.isNullOrBlank()) {
            pendingTargetRoute.value = resolved
        }
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val granted = ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
            if (!granted) {
                notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }

    private fun launchVoiceRecognition() {
        try {
            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, "uz-UZ")
                putExtra(RecognizerIntent.EXTRA_PROMPT, "AI Ustozga savolingizni ayting...")
            }
            voiceSearchLauncher.launch(intent)
        } catch (_: Exception) {
            // Device without speech recognizer falls back cleanly to keyboard input
        }
    }

    private fun triggerBiometricUnlock() {
        val biometricManager = BiometricManager.from(this)
        val authenticators = BiometricManager.Authenticators.BIOMETRIC_WEAK or
            BiometricManager.Authenticators.DEVICE_CREDENTIAL
        if (biometricManager.canAuthenticate(authenticators) != BiometricManager.BIOMETRIC_SUCCESS) {
            biometricUnlocked.value = true
            return
        }
        val executor = ContextCompat.getMainExecutor(this)
        val prompt = BiometricPrompt(
            this,
            executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    biometricUnlocked.value = true
                }
            }
        )
        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle("ASAKA ZIYO")
            .setSubtitle("Shaxsiy profil va maʼlumotlarni ochish uchun tasdiqlang")
            .setAllowedAuthenticators(authenticators)
            .build()
        prompt.authenticate(promptInfo)
    }

    private fun ensureNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channels = listOf(
            NotificationChannel(
                "asaka_ziyo_prayer_pre",
                getString(R.string.channel_prayer_pre_reminder),
                NotificationManager.IMPORTANCE_HIGH
            ),
            NotificationChannel(
                "asaka_ziyo_prayer_adhan",
                getString(R.string.channel_prayer_adhan),
                NotificationManager.IMPORTANCE_HIGH
            ),
            NotificationChannel(
                "asaka_ziyo_announcements",
                getString(R.string.channel_announcements),
                NotificationManager.IMPORTANCE_HIGH
            ),
            NotificationChannel(
                "asaka_ziyo_news",
                getString(R.string.channel_news_articles),
                NotificationManager.IMPORTANCE_DEFAULT
            ),
            NotificationChannel(
                "asaka_ziyo_chat",
                getString(R.string.channel_chat_messages),
                NotificationManager.IMPORTANCE_HIGH
            ),
            NotificationChannel(
                "asaka_ziyo_daily_wisdom",
                getString(R.string.channel_daily_wisdom),
                NotificationManager.IMPORTANCE_DEFAULT
            )
        )
        channels.forEach { manager.createNotificationChannel(it) }
    }
}

@Composable
private fun BiometricLockGateScreen(onAuthenticate: () -> Unit) {
    val palette = LocalAsakaColors.current
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(palette.backgroundGradient),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier.padding(32.dp)
        ) {
            Icon(
                imageVector = Icons.Rounded.Fingerprint,
                contentDescription = "Biometric Lock",
                tint = palette.goldAccent,
                modifier = Modifier.size(64.dp)
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "ASAKA ZIYO",
                style = MaterialTheme.typography.headlineSmall,
                color = palette.goldAccent
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "Ilova biometrik qulf bilan himoyalangan",
                style = MaterialTheme.typography.bodyMedium,
                color = palette.textSecondary
            )
            Spacer(modifier = Modifier.height(22.dp))
            Button(
                onClick = onAuthenticate,
                colors = ButtonDefaults.buttonColors(
                    containerColor = palette.goldAccent,
                    contentColor = Color(0xFF031814)
                )
            ) {
                Text("Barmoq izi / PIN bilan ochish")
            }
        }
    }
}

@Composable
private fun AsakaV5RootApp(
    viewModel: AsakaAppViewModel,
    pendingTargetRoute: String?,
    onConsumePendingRoute: () -> Unit,
    onRequestVoiceInput: () -> Unit
) {
    val state by viewModel.uiState.collectAsState()
    val palette = LocalAsakaColors.current
    val snackbarHostState = remember { SnackbarHostState() }

    var currentTab by remember { mutableStateOf(AsakaMainTab.HOME) }
    var activeModuleId by remember { mutableStateOf<String?>(null) }
    var showGlobalSearch by remember { mutableStateOf(false) }

    // Route Deep Links, Launcher Shortcuts, Widgets & Notifications
    LaunchedEffect(pendingTargetRoute) {
        val route = pendingTargetRoute ?: return@LaunchedEffect
        when {
            route.contains("prayer_journal") || route.contains("qazo") -> activeModuleId = "prayer_journal"
            route.contains("prayer") -> activeModuleId = "prayer"
            route.contains("qibla") -> activeModuleId = "qibla"
            route.contains("tasbeh") || route.contains("dhikr") -> activeModuleId = "tasbeh"
            route.contains("hadith") || route.contains("dua") -> activeModuleId = "hadith"
            route.contains("offline") || route.contains("download") -> activeModuleId = "offline"
            route.contains("ai") -> activeModuleId = "ai"
            route.contains("article") -> activeModuleId = "articles"
            route.contains("news") -> activeModuleId = "news"
            route.contains("announcement") -> activeModuleId = "announcements"
            route.contains("community") || route.contains("chat") -> activeModuleId = "community"
            route.contains("quiz") -> activeModuleId = "quiz"
            route.contains("khatm") -> activeModuleId = "khatm"
            route.contains("library") || route.contains("book") -> activeModuleId = "library"
            route.contains("media") || route.contains("adhan") -> activeModuleId = "media"
            route.contains("scholar") -> activeModuleId = "scholars"
            route.contains("mosque") -> activeModuleId = "mosques"
            route.contains("calendar") -> activeModuleId = "calendar"
            route.contains("fasting") || route.contains("ramadan") -> activeModuleId = "fasting"
            route.contains("daily_archive") || route.contains("wisdom") -> activeModuleId = "daily_archive"
            route.contains("achievement") || route.contains("yutuq") -> activeModuleId = "achievements"
            route.contains("reminder") -> activeModuleId = "reminder_dashboard"
            route.contains("display") -> activeModuleId = "display"
            route.contains("notification") -> activeModuleId = "notifications"
            route.contains("favorite") -> activeModuleId = "favorites"
            route.contains("planner") || route.contains("ibadat") -> activeModuleId = "planner"
            route.contains("performance") || route.contains("diagnostic") || route.contains("sync") -> activeModuleId = "performance"
            route.contains("admin") -> activeModuleId = "admin"
            route.contains("service") -> activeModuleId = "all_services"
            route.contains("quran") || route.contains("mushaf") -> {
                activeModuleId = null
                currentTab = AsakaMainTab.QURAN
                if (route.contains("mushaf")) {
                    viewModel.openMushafSurah(state.settings.lastSurahNumber)
                }
            }
            route.contains("learn") || route.contains("hifz") || route.contains("tajweed") -> {
                activeModuleId = null
                currentTab = AsakaMainTab.LEARN
            }
            route.contains("audio") || route.contains("qari") -> {
                activeModuleId = null
                currentTab = AsakaMainTab.AUDIO
            }
            route.contains("profile") || route.contains("premium") || route.contains("settings") -> {
                activeModuleId = null
                currentTab = AsakaMainTab.PROFILE
            }
            else -> {
                activeModuleId = null
                currentTab = AsakaMainTab.HOME
            }
        }
        onConsumePendingRoute()
    }

    // Show Snackbar status toasts reactively
    LaunchedEffect(state.statusToast) {
        val msg = state.statusToast
        if (!msg.isNullOrBlank()) {
            snackbarHostState.showSnackbar(msg)
            viewModel.clearStatusToast()
        }
    }

    // Native Hardware Back Handling
    val canHandleBack = state.showFullPlayer ||
        showGlobalSearch ||
        state.activeSurahNumber != null ||
        activeModuleId != null ||
        currentTab != AsakaMainTab.HOME

    BackHandler(enabled = canHandleBack) {
        when {
            state.showFullPlayer -> viewModel.setShowFullPlayer(false)
            showGlobalSearch -> showGlobalSearch = false
            state.activeSurahNumber != null -> viewModel.closeMushafReader()
            activeModuleId != null -> activeModuleId = null
            currentTab != AsakaMainTab.HOME -> currentTab = AsakaMainTab.HOME
        }
    }

    val isDistractionFreeMushaf = currentTab == AsakaMainTab.QURAN && state.activeSurahNumber != null && activeModuleId == null
    val isExpandedScreen = LocalConfiguration.current.screenWidthDp >= 720
    val strings = LocalAsakaStrings.current

    Scaffold(
        containerColor = Color.Transparent,
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) },
        bottomBar = {
            Column {
                if (!isDistractionFreeMushaf) {
                    AsakaFloatingMiniPlayer(
                        playback = state.playback,
                        onTogglePlay = { viewModel.togglePlayPause() },
                        onExpand = { viewModel.setShowFullPlayer(true) }
                    )
                }
                if (!isExpandedScreen && activeModuleId == null && !isDistractionFreeMushaf) {
                    AsakaV5BottomNavBar(
                        currentTab = currentTab,
                        onSelectTab = { tab ->
                            activeModuleId = null
                            currentTab = tab
                        }
                    )
                }
            }
        }
    ) { innerPadding ->
        Row(
            modifier = Modifier
                .fillMaxSize()
                .background(palette.backgroundGradient)
                .statusBarsPadding()
                .padding(bottom = innerPadding.calculateBottomPadding())
        ) {
            if (isExpandedScreen && activeModuleId == null && !isDistractionFreeMushaf) {
                NavigationRail(containerColor = palette.glassSurfaceElevated) {
                    AsakaMainTab.entries.forEach { tab ->
                        val label = when (tab) {
                            AsakaMainTab.HOME -> strings.navHome
                            AsakaMainTab.QURAN -> strings.navQuran
                            AsakaMainTab.LEARN -> strings.navLearn
                            AsakaMainTab.AUDIO -> strings.navAudio
                            AsakaMainTab.PROFILE -> strings.navProfile
                        }
                        NavigationRailItem(
                            selected = currentTab == tab,
                            onClick = {
                                activeModuleId = null
                                currentTab = tab
                            },
                            icon = { Icon(tab.icon, contentDescription = label) },
                            label = { Text(label) }
                        )
                    }
                }
            }
            Box(modifier = Modifier.weight(1f).fillMaxSize()) {
            Asaka3DSpatialAuraBackdrop()
            val transitionKey = activeModuleId ?: currentTab.route
            Crossfade(
                targetState = transitionKey,
                animationSpec = tween(if (state.settings.reducedMotion) 0 else 220),
                label = "asaka_v5_screen"
            ) { key ->
                if (activeModuleId != null) {
                    IslamicModuleRouterScreen(
                        moduleId = key,
                        state = state,
                        vm = viewModel,
                        onBack = { activeModuleId = null },
                        onOpenModule = { activeModuleId = it },
                        onSelectCity = { viewModel.selectCity(it) },
                        onTasbehTap = { viewModel.incrementTasbeh() },
                        onTasbehReset = { viewModel.resetTasbeh() },
                        onTasbehPreset = { viewModel.selectTasbehPreset(it) },
                        onSendAi = { viewModel.sendAiMessage(it) },
                        onRequestVoiceInput = onRequestVoiceInput,
                        onCancelDownload = { viewModel.cancelDownloadTask(it) },
                        onRetryDownload = { viewModel.retryDownloadTask(it) },
                        onDeleteDownloaded = { viewModel.deleteDownloadedTrack(it) },
                        onClearAllDownloads = { viewModel.clearAllDownloads() },
                        onSyncNow = { viewModel.triggerManualSync() }
                    )
                } else {
                    when (currentTab) {
                        AsakaMainTab.HOME -> HomeScreen(
                            state = state,
                            onOpenSearch = { showGlobalSearch = true },
                            onOpenModule = { activeModuleId = it },
                            onContinueQuran = { surahNum ->
                                currentTab = AsakaMainTab.QURAN
                                viewModel.openMushafSurah(surahNum)
                            },
                            onLogMinutes = { viewModel.logReadingMinutes(5) },
                            onOpenAudio = { currentTab = AsakaMainTab.AUDIO },
                            onOpenLearn = { currentTab = AsakaMainTab.LEARN },
                            onOpenPremium = { currentTab = AsakaMainTab.PROFILE },
                            onToggleBlock = { blockId, visible -> viewModel.updateHomeBlockVisibility(blockId, visible) },
                            onMoveBlock = { blockId, delta -> viewModel.moveHomeBlock(blockId, delta) }
                        )
                        AsakaMainTab.QURAN -> QuranScreen(
                            state = state,
                            onOpenSurah = { viewModel.openMushafSurah(it) },
                            onCloseReader = { viewModel.closeMushafReader() },
                            onDownloadSurahOffline = { viewModel.downloadSurahMushafOffline(it) },
                            onSaveBookmark = { s, name, a, note -> viewModel.saveAyahBookmark(s, name, a, note) },
                            onDeleteBookmark = { s, a -> viewModel.deleteAyahBookmark(s, a) },
                            onUpdateMushafDisplay = { fontSp, paper -> viewModel.updateMushafDisplay(fontSp, paper) }
                        )
                        AsakaMainTab.LEARN -> LearnScreen(
                            state = state,
                            onAddHifz = { s, f, t, m -> viewModel.addOrUpdateHifz(s, f, t, m) },
                            onRecordMurojaa = { item, mastery -> viewModel.recordMurojaaReview(item, mastery) },
                            onOpenSurah = { surahNum ->
                                currentTab = AsakaMainTab.QURAN
                                viewModel.openMushafSurah(surahNum)
                            }
                        )
                        AsakaMainTab.AUDIO -> AudioScreen(
                            state = state,
                            onSelectQari = { viewModel.selectQari(it) },
                            onPlayTrack = { viewModel.playTrack(it, openSheet = false) },
                            onTogglePlay = { viewModel.togglePlayPause() },
                            onDownloadTrack = { viewModel.downloadAudioTrackOffline(it) },
                            onOpenFullPlayer = { viewModel.setShowFullPlayer(true) }
                        )
                        AsakaMainTab.PROFILE -> ProfileScreen(
                            state = state,
                            onUpdateDisplayName = { viewModel.updateDisplayName(it) },
                            onUpdateLanguage = { viewModel.updateLanguage(it) },
                            onUpdateTheme = { viewModel.updateTheme(it) },
                            onUpdateReducedMotion = { viewModel.updateReducedMotion(it) },
                            onUpdateBiometricLock = { viewModel.updateBiometricLock(it) },
                            onUpdatePrayerNotify = { viewModel.updatePrayerNotifications(it) },
                            onUpdateSmartReminders = { q, h, d -> viewModel.updateSmartReminders(q, h, d) },
                            onSubmitCardOrder = { plan, ref, promo -> viewModel.submitCardOrder(plan, ref, promo) },
                            onRedeemPromo = { viewModel.redeemPromo(it) },
                            onJoinDraw = { viewModel.joinDraw(it) },
                            onGenerateLinkCode = { viewModel.generateTelegramLinkCode() },
                            onRedeemLinkCode = { viewModel.redeemAccountLinkCode(it) },
                            onOpenModule = { activeModuleId = it }
                        )
                    }
                }
            }
            }
        }
    }

    if (!state.settings.onboardingCompleted) {
        V6OnboardingOverlay(
            state = state,
            onSelectLanguage = { viewModel.updateLanguage(it) },
            onSelectTheme = { viewModel.updateTheme(it) },
            onComplete = { viewModel.completeOnboarding() }
        )
    }

    if (state.showFullPlayer) {
        AsakaFullAudioPlayerSheet(
            playback = state.playback,
            onDismiss = { viewModel.setShowFullPlayer(false) },
            onTogglePlay = { viewModel.togglePlayPause() },
            onPrevious = { viewModel.skipPreviousTrack() },
            onNext = { viewModel.skipNextTrack() },
            onSeek = { viewModel.seekTo(it) },
            onChangeSpeed = { viewModel.setPlaybackSpeed(it) },
            onCycleRepeat = { viewModel.cycleRepeatMode() },
            onToggleShuffle = { viewModel.toggleShuffle() },
            onSetSleepTimer = { viewModel.setSleepTimer(it) }
        )
    }

    if (showGlobalSearch) {
        AsakaGlobalSearchDialog(
            qaris = state.qaris,
            onDismiss = { showGlobalSearch = false },
            onOpenSurah = { surahNum ->
                activeModuleId = null
                currentTab = AsakaMainTab.QURAN
                viewModel.openMushafSurah(surahNum)
            },
            onSelectQari = { qari ->
                activeModuleId = null
                currentTab = AsakaMainTab.AUDIO
                viewModel.selectQari(qari)
            },
            onOpenModule = { moduleId ->
                activeModuleId = moduleId
            }
        )
    }

    val gatePrompt = state.premiumGatePrompt
    if (gatePrompt != null) {
        AsakaPremiumGateDialog(
            decision = gatePrompt,
            onDismiss = { viewModel.dismissPremiumGate() },
            onGoToPremium = {
                activeModuleId = null
                currentTab = AsakaMainTab.PROFILE
            }
        )
    }
}
