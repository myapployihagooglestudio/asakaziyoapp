package uz.asakaziyo.app.viewmodel

import android.app.Application
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import uz.asakaziyo.app.AsakaDailyAyahWidgetProvider
import uz.asakaziyo.app.AsakaDailyHadithWidgetProvider
import uz.asakaziyo.app.AsakaDhikrWidgetProvider
import uz.asakaziyo.app.AsakaHifzWidgetProvider
import uz.asakaziyo.app.AsakaMediaPlaybackService
import uz.asakaziyo.app.AsakaNextPrayerWidgetProvider
import uz.asakaziyo.app.AsakaOfflineDownloadManager
import uz.asakaziyo.app.AsakaPrayerWidgetProvider
import uz.asakaziyo.app.AsakaQuranWidgetProvider
import uz.asakaziyo.app.data.AdminFeatureFlag
import uz.asakaziyo.app.data.AdminHomeConfig
import uz.asakaziyo.app.data.AdminOrderItem
import uz.asakaziyo.app.data.AdminSession
import uz.asakaziyo.app.data.AiChatMessage
import uz.asakaziyo.app.data.ArabicLetterItem
import uz.asakaziyo.app.data.AsakaApiClient
import uz.asakaziyo.app.data.AsakaCatalogData
import uz.asakaziyo.app.data.AsakaEcosystemApiClient
import uz.asakaziyo.app.data.AsakaLocalDatabase
import uz.asakaziyo.app.data.AsakaOfflineSyncWorker
import uz.asakaziyo.app.data.AsakaSecurePreferences
import uz.asakaziyo.app.data.BookmarkItem
import uz.asakaziyo.app.data.CentralDatabaseSnapshot
import uz.asakaziyo.app.data.CityOption
import uz.asakaziyo.app.data.DailyQuranQuizItem
import uz.asakaziyo.app.data.DownloadTaskState
import uz.asakaziyo.app.data.EffectiveSubscription
import uz.asakaziyo.app.data.FeatureCheckResult
import uz.asakaziyo.app.data.FeatureEntitlementItem
import uz.asakaziyo.app.data.HifzItem
import uz.asakaziyo.app.data.IstiqomatDay
import uz.asakaziyo.app.data.ManualCardConfig
import uz.asakaziyo.app.data.MediaPlaybackSnapshot
import uz.asakaziyo.app.data.MosqueItem
import uz.asakaziyo.app.data.MushafAyah
import uz.asakaziyo.app.data.PrayerScheduleSnapshot
import uz.asakaziyo.app.data.QariProfile
import uz.asakaziyo.app.data.QariSurahTrack
import uz.asakaziyo.app.data.QuranPlaylist
import uz.asakaziyo.app.data.RandomDrawItem
import uz.asakaziyo.app.data.ScholarItem
import uz.asakaziyo.app.data.SubscriptionPlan
import uz.asakaziyo.app.data.TajweedLesson
import uz.asakaziyo.app.data.UserAppSettings
import uz.asakaziyo.app.data.WeatherSnapshot
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

data class AsakaUiState(
    val settings: UserAppSettings = UserAppSettings(),
    val prayerSchedule: PrayerScheduleSnapshot? = null,
    val weather: WeatherSnapshot? = null,
    val availableCities: List<CityOption> = emptyList(),
    val isLoadingPrayer: Boolean = true,

    // Qur'on & Mushaf
    val activeSurahNumber: Int? = null,
    val activeSurahAyahs: List<MushafAyah> = emptyList(),
    val isLoadingMushaf: Boolean = false,
    val cachedMushafSurahs: Set<Int> = emptySet(),
    val bookmarks: List<BookmarkItem> = emptyList(),

    // Qorilar & Native Audio
    val qaris: List<QariProfile> = emptyList(),
    val selectedQari: QariProfile? = null,
    val qariTracks: List<QariSurahTrack> = emptyList(),
    val isLoadingQaris: Boolean = false,
    val playlists: List<QuranPlaylist> = emptyList(),
    val playback: MediaPlaybackSnapshot = MediaPlaybackSnapshot(),
    val activeTrackIndex: Int = -1,
    val showFullPlayer: Boolean = false,

    // Offline Center & Sync
    val downloadTasks: Map<String, DownloadTaskState> = emptyMap(),
    val downloadedTracks: List<Pair<String, Long>> = emptyList(),
    val freeStorageMb: Long = 0L,
    val isLowStorage: Boolean = false,
    val pendingSyncCount: Int = 0,

    // Learn: Hifz, Muroja'a & Tajweed
    val hifzItems: List<HifzItem> = emptyList(),
    val arabicAlphabet: List<ArabicLetterItem> = emptyList(),
    val tajweedLessons: List<TajweedLesson> = emptyList(),

    // Tasbeh
    val tasbehIndex: Int = 0,
    val tasbehCount: Int = 0,
    val tasbehTotalToday: Int = 0,

    // AI Assistant
    val aiMessages: List<AiChatMessage> = emptyList(),
    val isAiThinking: Boolean = false,

    // Unified Free & Premium Subscription + 26 Cross-Module Entitlements
    val subscription: EffectiveSubscription? = null,
    val entitlements: List<FeatureEntitlementItem> = emptyList(),
    val plans: List<SubscriptionPlan> = emptyList(),
    val cardConfig: ManualCardConfig = ManualCardConfig(),
    val randomDraws: List<RandomDrawItem> = emptyList(),
    val telegramLinkCode: String? = null,
    val premiumGatePrompt: FeatureCheckResult? = null,
    val statusToast: String? = null,

    // Full Web App Feature Parity + Real-Time Admin Manifest Auto-Sync
    val contentVersion: String = "",
    val contentEtag: String = "",
    val lastSyncTimestampMs: Long = 0L,
    val isRefreshingContent: Boolean = false,
    val adminHomeConfig: AdminHomeConfig = AdminHomeConfig(),
    val centralDb: CentralDatabaseSnapshot = CentralDatabaseSnapshot(),
    val scholars: List<ScholarItem> = emptyList(),
    val mosques: List<MosqueItem> = emptyList(),
    val dailyQuranQuiz: DailyQuranQuizItem? = null,
    val istiqomatToday: IstiqomatDay = IstiqomatDay(dateIso = ""),
    val readNotificationIds: Set<String> = emptySet(),
    val favorites: List<Triple<String, String, Pair<String, String>>> = emptyList(),

    // Role-Protected Native Super Admin Panel
    val adminSession: AdminSession = AdminSession(),
    val adminOrders: List<AdminOrderItem> = emptyList(),
    val adminFeatureFlags: List<AdminFeatureFlag> = emptyList(),
    val isAdminBusy: Boolean = false
)

class AsakaAppViewModel(application: Application) : AndroidViewModel(application) {
    private val appContext: Context = application.applicationContext
    private val prefs = AsakaSecurePreferences(appContext)
    private val db = AsakaLocalDatabase(appContext)

    private val _uiState = MutableStateFlow(AsakaUiState())
    val uiState: StateFlow<AsakaUiState> = _uiState.asStateFlow()

    private val todayIso: String
        get() = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

    init {
        AsakaOfflineSyncWorker.schedulePeriodicSync(appContext)
        observeSettings()
        observeMediaPlayback()
        observeDownloads()
        loadLocalCaches()
        restoreAdminSession()
        refreshAllBackendData()
        startLiveManifestPolling()
    }

    private fun observeSettings() {
        viewModelScope.launch {
            var lastCityId = ""
            prefs.settingsFlow.collectLatest { settings ->
                _uiState.update { it.copy(settings = settings) }
                syncDhikrAndQuranWidgets(settings)
                if (settings.selectedCityId != lastCityId) {
                    lastCityId = settings.selectedCityId
                    loadPrayerAndWeather(settings.selectedCityId)
                }
            }
        }
    }

    private fun observeMediaPlayback() {
        viewModelScope.launch {
            AsakaMediaPlaybackService.playbackState.collectLatest { snap ->
                _uiState.update { it.copy(playback = snap) }
            }
        }
    }

    private fun observeDownloads() {
        viewModelScope.launch {
            AsakaOfflineDownloadManager.downloadTasks.collectLatest { tasks ->
                refreshOfflineStorageMetrics(tasks)
            }
        }
    }

    private fun loadLocalCaches() {
        viewModelScope.launch(Dispatchers.IO) {
            val cachedSurahs = db.listCachedMushafSurahNumbers()
            val bookmarks = db.listBookmarkItems()
            var hifz = db.listHifzItems()
            if (hifz.isEmpty()) {
                val seed = listOf(
                    HifzItem(1, "Fotiha", 1, 7, 100, todayIso, 5),
                    HifzItem(112, "Ixlos", 1, 4, 100, todayIso, 4),
                    HifzItem(113, "Falaq", 1, 5, 80, todayIso, 2),
                    HifzItem(114, "Nos", 1, 6, 75, todayIso, 2)
                )
                seed.forEach { db.upsertHifzItem(it) }
                hifz = db.listHifzItems()
            }
            val pending = db.getPendingSyncCount()
            val cachedCentral = db.getCentralCache("central_database")
            val parsedCentral = cachedCentral?.first?.let { AsakaEcosystemApiClient.parseCentralDatabaseJson(it) }
                ?: CentralDatabaseSnapshot()
            val readNotifs = db.listReadNotificationIds()
            val favs = db.listFavorites()
            _uiState.update {
                it.copy(
                    cachedMushafSurahs = cachedSurahs,
                    bookmarks = bookmarks,
                    hifzItems = hifz,
                    pendingSyncCount = pending,
                    centralDb = parsedCentral,
                    contentVersion = cachedCentral?.second ?: "",
                    readNotificationIds = readNotifs,
                    favorites = favs,
                    istiqomatToday = IstiqomatDay(dateIso = todayIso)
                )
            }
            refreshOfflineStorageMetrics(_uiState.value.downloadTasks)
        }
    }

    private fun startLiveManifestPolling() {
        viewModelScope.launch {
            while (isActive) {
                delay(45_000L)
                checkManifestAndRefresh(force = false)
            }
        }
    }

    /**
     * Real-Time Admin Content Auto-Sync:
     * Calls GET /api/content/manifest with ETag / If-None-Match.
     * Whenever Admin updates ANY category (Prayer, Qaris, Articles, News, Announcements,
     * Hadiths, Dhikrs, Subscriptions, Home Blocks) on Web or Android, this detects the
     * changed contentVersion and refreshes all live data without reinstalling the APK!
     */
    fun checkManifestAndRefresh(force: Boolean = false) {
        viewModelScope.launch {
            val currentEtag = if (force) "" else _uiState.value.contentEtag
            val manifest = AsakaEcosystemApiClient.fetchContentManifest(currentEtag) ?: return@launch
            if (!force && manifest.notModified) return@launch
            val changed = force || manifest.contentVersion.isNotBlank() && manifest.contentVersion != _uiState.value.contentVersion
            _uiState.update {
                it.copy(
                    contentVersion = manifest.contentVersion.ifBlank { it.contentVersion },
                    contentEtag = manifest.etag.ifBlank { it.contentEtag },
                    adminHomeConfig = manifest.homeConfig
                )
            }
            if (changed) {
                refreshAllBackendData(manifest.contentVersion)
                loadPrayerAndWeather(_uiState.value.settings.selectedCityId)
            }
        }
    }

    fun refreshOfflineStorageMetrics(tasks: Map<String, DownloadTaskState> = _uiState.value.downloadTasks) {
        viewModelScope.launch(Dispatchers.IO) {
            val downloaded = AsakaOfflineDownloadManager.listDownloadedTracks(appContext)
            val freeMb = AsakaOfflineDownloadManager.getUsableSpaceBytes(appContext) / (1024L * 1024L)
            val lowStorage = AsakaOfflineDownloadManager.isLowStorage(appContext)
            val pending = db.getPendingSyncCount()
            val cachedSurahs = db.listCachedMushafSurahNumbers()
            _uiState.update {
                it.copy(
                    downloadTasks = tasks,
                    downloadedTracks = downloaded,
                    freeStorageMb = freeMb,
                    isLowStorage = lowStorage,
                    pendingSyncCount = pending,
                    cachedMushafSurahs = cachedSurahs
                )
            }
        }
    }

    fun refreshAllBackendData(latestVersion: String = _uiState.value.contentVersion) {
        val userId = prefs.getOrCreateDeviceUserId()
        viewModelScope.launch {
            _uiState.update { it.copy(isRefreshingContent = true) }
            launch { loadCities() }
            launch { loadQarisAndPlaylists(userId) }
            launch { loadEducation() }
            launch { refreshSubscriptionsAndEntitlements(userId) }
            launch { loadCentralEcosystemData(latestVersion) }
            launch { loadScholarsMosquesAndDailyQuiz() }
            launch { pullUnifiedUserSyncState(userId) }
            _uiState.update { it.copy(isRefreshingContent = false) }
        }
    }

    private suspend fun pullUnifiedUserSyncState(userId: String) {
        val stateJson = AsakaApiClient.fetchUnifiedUserSyncState(userId) ?: return
        val allowedLocales = setOf("uz-Latn", "uz-Latn-new", "uz-Cyrl", "ru", "en")

        val cloudFavs = stateJson.optJSONArray("favorites")
        if (cloudFavs != null && cloudFavs.length() > 0) {
            withContext(Dispatchers.IO) {
                for (i in 0 until cloudFavs.length()) {
                    val f = cloudFavs.optJSONObject(i) ?: continue
                    val id = f.optString("id", "").trim()
                    if (id.isBlank()) continue
                    val category = f.optString("type", "article")
                    val title = f.optString("title", id)
                    val subtitle = f.optString("subtitle", f.optString("snippet", ""))
                    db.upsertFavorite(id, category, title, subtitle)
                }
            }
        }

        val cloudBookmarks = stateJson.optJSONArray("bookmarks")
        if (cloudBookmarks != null && cloudBookmarks.length() > 0) {
            withContext(Dispatchers.IO) {
                for (i in 0 until cloudBookmarks.length()) {
                    val b = cloudBookmarks.optJSONObject(i) ?: continue
                    val sNum = b.optInt("surahNumber", 0)
                    val aNum = b.optInt("ayahNumber", 0)
                    if (sNum in 1..114 && aNum >= 1) {
                        val surahName = AsakaCatalogData.allSurahs.firstOrNull { it.number == sNum }?.nameUz ?: "Sura #$sNum"
                        db.saveBookmark(sNum, surahName, aNum, b.optString("note", ""))
                    }
                }
            }
        }

        val cloudHifz = stateJson.optJSONArray("hifzRanges")
        if (cloudHifz != null && cloudHifz.length() > 0) {
            withContext(Dispatchers.IO) {
                for (i in 0 until cloudHifz.length()) {
                    val h = cloudHifz.optJSONObject(i) ?: continue
                    val sNum = h.optInt("surahNumber", 0)
                    if (sNum !in 1..114) continue
                    val surahName = AsakaCatalogData.allSurahs.firstOrNull { it.number == sNum }?.nameUz ?: "Sura #$sNum"
                    db.upsertHifzItem(
                        HifzItem(
                            surahNumber = sNum,
                            surahNameUz = surahName,
                            ayahFrom = h.optInt("startAyah", 1).coerceAtLeast(1),
                            ayahTo = h.optInt("endAyah", 1).coerceAtLeast(1),
                            masteryScore = h.optInt("masteryPercent", 0).coerceIn(0, 100),
                            nextReviewIso = h.optString("nextReviewDate", todayIso).ifBlank { todayIso },
                            repetitions = h.optInt("repeatCount", 1).coerceAtLeast(1)
                        )
                    )
                }
            }
        }

        val rp = stateJson.optJSONObject("readingProgress")
        if (rp != null) {
            val cloudSurah = rp.optInt("lastReadSurah", 0)
            val cloudAyah = rp.optInt("lastReadAyah", 1).coerceAtLeast(1)
            if (cloudSurah in 1..114) {
                val surahName = AsakaCatalogData.allSurahs.firstOrNull { it.number == cloudSurah }?.nameUz ?: "Sura #$cloudSurah"
                prefs.updateLastRead(cloudSurah, surahName, cloudAyah)
            }
        }

        val cloudLang = stateJson.optString("language", "").trim()
        if (cloudLang in allowedLocales && _uiState.value.settings.languageCode != cloudLang) {
            prefs.updateLanguage(cloudLang)
        }

        val mergedFavorites = withContext(Dispatchers.IO) { db.listFavorites() }
        val mergedBookmarks = withContext(Dispatchers.IO) { db.listBookmarkItems() }
        val mergedHifz = withContext(Dispatchers.IO) { db.listHifzItems() }
        _uiState.update {
            it.copy(
                favorites = mergedFavorites,
                bookmarks = mergedBookmarks,
                hifzItems = mergedHifz
            )
        }
        syncWisdomAndHifzWidgets(_uiState.value.centralDb, mergedHifz)
    }

    private fun pushUnifiedSyncWithOfflineFallback(payload: JSONObject) {
        val userId = prefs.getOrCreateDeviceUserId()
        viewModelScope.launch(Dispatchers.IO) {
            val ok = AsakaApiClient.pushUnifiedUserSyncState(userId, payload)
            if (!ok) {
                db.enqueueSyncMutation("USER_SYNC_STATE", payload)
                _uiState.update { it.copy(pendingSyncCount = db.getPendingSyncCount()) }
                AsakaOfflineSyncWorker.enqueueImmediateSync(appContext)
            }
        }
    }

    private suspend fun loadCentralEcosystemData(latestVersion: String) {
        val raw = AsakaEcosystemApiClient.fetchCentralDatabaseRawJson() ?: return
        val parsed = AsakaEcosystemApiClient.parseCentralDatabaseJson(raw)
        withContext(Dispatchers.IO) {
            db.saveCentralCache("central_database", raw, latestVersion)
        }
        _uiState.update { it.copy(centralDb = parsed, lastSyncTimestampMs = System.currentTimeMillis()) }
        syncWisdomAndHifzWidgets(parsed, _uiState.value.hifzItems)
    }

    private suspend fun loadScholarsMosquesAndDailyQuiz() {
        val scholars = AsakaEcosystemApiClient.fetchScholars()
        val mosques = AsakaEcosystemApiClient.fetchMosques()
        val quiz = AsakaEcosystemApiClient.fetchDailyQuranQuiz(todayIso)
        _uiState.update {
            it.copy(
                scholars = if (scholars.isNotEmpty()) scholars else it.scholars,
                mosques = if (mosques.isNotEmpty()) mosques else it.mosques,
                dailyQuranQuiz = quiz ?: it.dailyQuranQuiz
            )
        }
    }

    fun loadPrayerAndWeather(cityId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingPrayer = true) }
            val cached = withContext(Dispatchers.IO) { db.getCachedPrayerSnapshot(cityId, todayIso) }
            if (cached != null) {
                _uiState.update { it.copy(prayerSchedule = cached, isLoadingPrayer = false) }
            }
            val livePrayer = AsakaApiClient.fetchTodayPrayer(cityId)
            val liveWeather = AsakaApiClient.fetchWeather(cityId)
            if (livePrayer != null) {
                withContext(Dispatchers.IO) { db.savePrayerSnapshot(livePrayer) }
                updatePrayerWidgets(livePrayer, liveWeather)
            }
            _uiState.update {
                it.copy(
                    prayerSchedule = livePrayer ?: cached ?: it.prayerSchedule,
                    weather = liveWeather ?: it.weather,
                    isLoadingPrayer = false
                )
            }
        }
    }

    private suspend fun loadCities() {
        val cities = AsakaApiClient.fetchUzbekistanAndGlobalCities()
        if (cities.isNotEmpty()) {
            _uiState.update { it.copy(availableCities = cities) }
        }
    }

    fun selectCity(city: CityOption) {
        viewModelScope.launch {
            prefs.updateSelectedCity(city.id, city.cityName)
            loadPrayerAndWeather(city.id)
        }
    }

    // --- Qur'on & Madina Mushaf ---
    fun openMushafSurah(surahNumber: Int) {
        val safeNum = surahNumber.coerceIn(1, 114)
        val summary = AsakaCatalogData.allSurahs.firstOrNull { it.number == safeNum }
        viewModelScope.launch {
            _uiState.update { it.copy(activeSurahNumber = safeNum, isLoadingMushaf = true) }
            prefs.updateLastRead(safeNum, summary?.nameUz ?: "Sura #$safeNum", 1)
            val cached = withContext(Dispatchers.IO) { db.getCachedMushafSurah(safeNum) }
            if (!cached.isNullOrEmpty()) {
                _uiState.update { it.copy(activeSurahAyahs = cached, isLoadingMushaf = false) }
                return@launch
            }
            val fetched = AsakaApiClient.fetchMushafSurah(safeNum)
            if (!fetched.isNullOrEmpty()) {
                withContext(Dispatchers.IO) { db.saveMushafSurah(safeNum, fetched) }
                val updatedSet = withContext(Dispatchers.IO) { db.listCachedMushafSurahNumbers() }
                _uiState.update {
                    it.copy(
                        activeSurahAyahs = fetched,
                        cachedMushafSurahs = updatedSet,
                        isLoadingMushaf = false
                    )
                }
            } else {
                _uiState.update {
                    it.copy(
                        isLoadingMushaf = false,
                        statusToast = "Oflayn rejim: bu sura hali keshlanmagan. Internet ulanganda avtomatik yuklanadi."
                    )
                }
            }
        }
    }

    fun closeMushafReader() {
        _uiState.update { it.copy(activeSurahNumber = null) }
    }

    fun downloadSurahMushafOffline(surahNumber: Int) {
        viewModelScope.launch {
            val fetched = AsakaApiClient.fetchMushafSurah(surahNumber)
            if (!fetched.isNullOrEmpty()) {
                withContext(Dispatchers.IO) { db.saveMushafSurah(surahNumber, fetched) }
                val updatedSet = withContext(Dispatchers.IO) { db.listCachedMushafSurahNumbers() }
                _uiState.update {
                    it.copy(
                        cachedMushafSurahs = updatedSet,
                        statusToast = "$surahNumber-sura oflayn Mushafga saqlandi."
                    )
                }
            } else {
                _uiState.update { it.copy(statusToast = "Surani oflayn yuklab boʻlmadi. Internet aloqasini tekshiring.") }
            }
        }
    }

    fun saveAyahBookmark(surahNumber: Int, surahName: String, ayahNumber: Int, note: String) {
        viewModelScope.launch(Dispatchers.IO) {
            db.saveBookmark(surahNumber, surahName, ayahNumber, note)
            val syncPayload = JSONObject().apply {
                put(
                    "bookmarks",
                    org.json.JSONArray().put(
                        JSONObject().apply {
                            put("id", "$surahNumber:$ayahNumber")
                            put("surahNumber", surahNumber)
                            put("ayahNumber", ayahNumber)
                            put("note", note)
                        }
                    )
                )
                put(
                    "readingProgress",
                    JSONObject().apply {
                        put("lastReadSurah", surahNumber)
                        put("lastReadAyah", ayahNumber)
                    }
                )
            }
            val list = db.listBookmarkItems()
            _uiState.update {
                it.copy(
                    bookmarks = list,
                    statusToast = "$surahName $ayahNumber-oyat xatchoʻpga saqlandi."
                )
            }
            pushUnifiedSyncWithOfflineFallback(syncPayload)
        }
    }

    fun deleteAyahBookmark(surahNumber: Int, ayahNumber: Int) {
        viewModelScope.launch(Dispatchers.IO) {
            db.deleteBookmark(surahNumber, ayahNumber)
            val list = db.listBookmarkItems()
            _uiState.update { it.copy(bookmarks = list) }
        }
    }

    fun logReadingMinutes(minutes: Int = 5) {
        viewModelScope.launch {
            prefs.addReadingMinutes(minutes)
            _uiState.update { it.copy(statusToast = "+$minutes daqiqa kunlik Qurʼon maqsadiga qoʻshildi.") }
        }
    }

    fun updateMushafDisplay(fontSizeSp: Int, lightPaper: Boolean) {
        viewModelScope.launch { prefs.updateMushafPreferences(fontSizeSp, lightPaper) }
    }

    // --- Qorilar, Playlists & Media3 Background Audio Player ---
    private suspend fun loadQarisAndPlaylists(userId: String) {
        _uiState.update { it.copy(isLoadingQaris = true) }
        val qaris = AsakaApiClient.fetchQaris()
        val playlists = AsakaApiClient.fetchPlaylists(userId)
        val firstQari = qaris.firstOrNull()
        _uiState.update {
            it.copy(
                qaris = qaris,
                selectedQari = it.selectedQari ?: firstQari,
                playlists = playlists,
                isLoadingQaris = false
            )
        }
        val activeQari = _uiState.value.selectedQari
        if (activeQari != null) {
            loadQariSurahs(activeQari)
        }
    }

    fun selectQari(qari: QariProfile) {
        _uiState.update { it.copy(selectedQari = qari) }
        viewModelScope.launch { loadQariSurahs(qari) }
    }

    private suspend fun loadQariSurahs(qari: QariProfile) {
        val tracks = AsakaApiClient.fetchQariSurahs(qari).map { t ->
            t.copy(isDownloadedOffline = AsakaOfflineDownloadManager.isDownloaded(appContext, t.trackKey))
        }
        _uiState.update { it.copy(qariTracks = tracks) }
    }

    fun playTrack(track: QariSurahTrack, openSheet: Boolean = false) {
        val idx = _uiState.value.qariTracks.indexOfFirst { it.trackKey == track.trackKey }
        val intent = Intent(appContext, AsakaMediaPlaybackService::class.java).apply {
            action = AsakaMediaPlaybackService.ACTION_PLAY_AUDIO
            putExtra(AsakaMediaPlaybackService.EXTRA_TRACK_KEY, track.trackKey)
            putExtra(AsakaMediaPlaybackService.EXTRA_AUDIO_URL, track.streamUrl)
            putExtra(AsakaMediaPlaybackService.EXTRA_TITLE, "${track.surahNumber}. ${track.surahNameUz}")
            putExtra(AsakaMediaPlaybackService.EXTRA_ARTIST, track.qariName)
            putExtra(AsakaMediaPlaybackService.EXTRA_SPEED, _uiState.value.playback.speed)
            if (AsakaOfflineDownloadManager.isDownloaded(appContext, track.trackKey)) {
                putExtra(
                    AsakaMediaPlaybackService.EXTRA_LOCAL_PATH,
                    AsakaOfflineDownloadManager.getLocalFile(appContext, track.trackKey).absolutePath
                )
            }
        }
        ContextCompat.startForegroundService(appContext, intent)
        _uiState.update { it.copy(activeTrackIndex = idx, showFullPlayer = openSheet || it.showFullPlayer) }
    }

    fun togglePlayPause() {
        val playing = _uiState.value.playback.isPlaying
        val intent = Intent(appContext, AsakaMediaPlaybackService::class.java).apply {
            action = if (playing) AsakaMediaPlaybackService.ACTION_PAUSE else AsakaMediaPlaybackService.ACTION_RESUME
        }
        appContext.startService(intent)
    }

    fun seekTo(positionMs: Long) {
        val intent = Intent(appContext, AsakaMediaPlaybackService::class.java).apply {
            action = AsakaMediaPlaybackService.ACTION_SEEK_TO
            putExtra(AsakaMediaPlaybackService.EXTRA_POSITION_MS, positionMs)
        }
        appContext.startService(intent)
    }

    fun setPlaybackSpeed(speed: Float) {
        val intent = Intent(appContext, AsakaMediaPlaybackService::class.java).apply {
            action = AsakaMediaPlaybackService.ACTION_SET_SPEED
            putExtra(AsakaMediaPlaybackService.EXTRA_SPEED, speed)
        }
        appContext.startService(intent)
    }

    fun cycleRepeatMode() {
        val next = when (_uiState.value.playback.repeatMode) {
            "off" -> "one"
            "one" -> "all"
            else -> "off"
        }
        val intent = Intent(appContext, AsakaMediaPlaybackService::class.java).apply {
            action = AsakaMediaPlaybackService.ACTION_SET_REPEAT_MODE
            putExtra(AsakaMediaPlaybackService.EXTRA_REPEAT_MODE, next)
        }
        appContext.startService(intent)
    }

    fun toggleShuffle() {
        val next = !_uiState.value.playback.shuffleEnabled
        val intent = Intent(appContext, AsakaMediaPlaybackService::class.java).apply {
            action = AsakaMediaPlaybackService.ACTION_SET_SHUFFLE
            putExtra(AsakaMediaPlaybackService.EXTRA_SHUFFLE, next)
        }
        appContext.startService(intent)
    }

    fun setSleepTimer(minutes: Int) {
        val intent = Intent(appContext, AsakaMediaPlaybackService::class.java).apply {
            action = AsakaMediaPlaybackService.ACTION_SET_SLEEP_TIMER
            putExtra(AsakaMediaPlaybackService.EXTRA_SLEEP_MINUTES, minutes)
        }
        appContext.startService(intent)
    }

    fun skipNextTrack() {
        val tracks = _uiState.value.qariTracks
        if (tracks.isEmpty()) return
        val nextIdx = if (_uiState.value.playback.shuffleEnabled) {
            tracks.indices.random()
        } else {
            (_uiState.value.activeTrackIndex + 1).coerceAtMost(tracks.lastIndex)
        }
        playTrack(tracks[nextIdx])
    }

    fun skipPreviousTrack() {
        val tracks = _uiState.value.qariTracks
        if (tracks.isEmpty()) return
        val prevIdx = (_uiState.value.activeTrackIndex - 1).coerceAtLeast(0)
        playTrack(tracks[prevIdx])
    }

    fun setShowFullPlayer(show: Boolean) {
        _uiState.update { it.copy(showFullPlayer = show) }
    }

    // --- Offline Download Manager (Server Entitlement Enforced) ---
    fun downloadAudioTrackOffline(track: QariSurahTrack) {
        val userId = prefs.getOrCreateDeviceUserId()
        viewModelScope.launch {
            val check = AsakaApiClient.checkFeatureEntitlement(userId, "unlimited_offline_downloads", consume = true)
            if (!check.allowed && check.reasonCode != "NETWORK_ERROR") {
                _uiState.update { it.copy(premiumGatePrompt = check) }
                return@launch
            }
            AsakaOfflineDownloadManager.downloadTrackAsync(
                context = appContext,
                trackKey = track.trackKey,
                urlString = track.streamUrl,
                expectedSha256 = track.sha256,
                title = "${track.surahNumber}. ${track.surahNameUz} · ${track.qariName}"
            ) { ok, _, err ->
                viewModelScope.launch {
                    refreshOfflineStorageMetrics()
                    _uiState.value.selectedQari?.let { loadQariSurahs(it) }
                    _uiState.update {
                        it.copy(
                            statusToast = if (ok) "${track.surahNameUz} oflayn saqlandi." else (err ?: "Yuklab olishda xatolik")
                        )
                    }
                }
            }
        }
    }

    fun cancelDownloadTask(trackKey: String) {
        AsakaOfflineDownloadManager.cancelDownload(trackKey)
    }

    fun retryDownloadTask(task: DownloadTaskState) {
        AsakaOfflineDownloadManager.downloadTrackAsync(
            context = appContext,
            trackKey = task.trackKey,
            urlString = task.url,
            expectedSha256 = task.expectedSha256,
            title = task.title
        ) { _, _, _ ->
            refreshOfflineStorageMetrics()
        }
    }

    fun deleteDownloadedTrack(trackKey: String) {
        viewModelScope.launch(Dispatchers.IO) {
            AsakaOfflineDownloadManager.deleteTrack(appContext, trackKey)
            refreshOfflineStorageMetrics()
            _uiState.value.selectedQari?.let { loadQariSurahs(it) }
        }
    }

    fun clearAllDownloads() {
        viewModelScope.launch(Dispatchers.IO) {
            val removed = AsakaOfflineDownloadManager.clearAll(appContext)
            refreshOfflineStorageMetrics()
            _uiState.update { it.copy(statusToast = "$removed ta oflayn audio oʻchirildi.") }
        }
    }

    fun triggerManualSync() {
        AsakaOfflineSyncWorker.enqueueImmediateSync(appContext)
        refreshAllBackendData()
        _uiState.update { it.copy(statusToast = "Bulut bilan sinxronizatsiya boshlandi...") }
    }

    // --- Hifz, Muroja'a & Tajweed Academy ---
    private suspend fun loadEducation() {
        val (alphabet, lessons) = AsakaApiClient.fetchEducationCatalog()
        _uiState.update { it.copy(arabicAlphabet = alphabet, tajweedLessons = lessons) }
    }

    fun addOrUpdateHifz(surahNumber: Int, ayahFrom: Int, ayahTo: Int, masteryScore: Int) {
        val surah = AsakaCatalogData.allSurahs.firstOrNull { it.number == surahNumber }
        viewModelScope.launch(Dispatchers.IO) {
            val item = HifzItem(
                surahNumber = surahNumber,
                surahNameUz = surah?.nameUz ?: "Sura #$surahNumber",
                ayahFrom = ayahFrom.coerceAtLeast(1),
                ayahTo = ayahTo.coerceAtLeast(ayahFrom),
                masteryScore = masteryScore.coerceIn(0, 100),
                nextReviewIso = todayIso,
                repetitions = 1
            )
            db.upsertHifzItem(item)
            val syncPayload = JSONObject().apply {
                put(
                    "hifzRanges",
                    org.json.JSONArray().put(
                        JSONObject().apply {
                            put("id", "${item.surahNumber}:${item.ayahFrom}-${item.ayahTo}")
                            put("surahNumber", item.surahNumber)
                            put("startAyah", item.ayahFrom)
                            put("endAyah", item.ayahTo)
                            put("masteryPercent", item.masteryScore)
                            put("repeatCount", item.repetitions)
                            put("nextReviewDate", item.nextReviewIso)
                        }
                    )
                )
            }
            val updated = db.listHifzItems()
            _uiState.update {
                it.copy(
                    hifzItems = updated,
                    statusToast = "${item.surahNameUz} Hifz roʻyxatiga saqlandi."
                )
            }
            syncWisdomAndHifzWidgets(_uiState.value.centralDb, updated)
            pushUnifiedSyncWithOfflineFallback(syncPayload)
        }
    }

    fun recordMurojaaReview(item: HifzItem, newMastery: Int) {
        viewModelScope.launch(Dispatchers.IO) {
            val updatedItem = item.copy(
                masteryScore = newMastery.coerceIn(0, 100),
                repetitions = item.repetitions + 1,
                nextReviewIso = todayIso
            )
            db.upsertHifzItem(updatedItem)
            val list = db.listHifzItems()
            _uiState.update {
                it.copy(
                    hifzItems = list,
                    statusToast = "${item.surahNameUz} murojaʼasi belgilandi ($newMastery%)."
                )
            }
            syncWisdomAndHifzWidgets(_uiState.value.centralDb, list)
            pushUnifiedSyncWithOfflineFallback(
                JSONObject().apply {
                    put(
                        "hifzRanges",
                        org.json.JSONArray().put(
                            JSONObject().apply {
                                put("id", "${updatedItem.surahNumber}:${updatedItem.ayahFrom}-${updatedItem.ayahTo}")
                                put("surahNumber", updatedItem.surahNumber)
                                put("startAyah", updatedItem.ayahFrom)
                                put("endAyah", updatedItem.ayahTo)
                                put("masteryPercent", updatedItem.masteryScore)
                                put("repeatCount", updatedItem.repetitions)
                                put("nextReviewDate", updatedItem.nextReviewIso)
                            }
                        )
                    )
                }
            )
        }
    }

    // --- Digital Tasbeh ---
    fun selectTasbehPreset(index: Int) {
        val safe = index.coerceIn(0, AsakaCatalogData.dhikrPresets.lastIndex)
        _uiState.update { it.copy(tasbehIndex = safe, tasbehCount = 0) }
    }

    fun incrementTasbeh() {
        _uiState.update { st ->
            val target = AsakaCatalogData.dhikrPresets[st.tasbehIndex].third
            val next = if (st.tasbehCount + 1 > target) 1 else st.tasbehCount + 1
            st.copy(tasbehCount = next, tasbehTotalToday = st.tasbehTotalToday + 1)
        }
        syncDhikrAndQuranWidgets(_uiState.value.settings)
    }

    fun resetTasbeh() {
        _uiState.update { it.copy(tasbehCount = 0) }
    }

    // --- AI Islamic Assistant (Server-Side Gemini Proxy + Entitlement Enforcement) ---
    fun sendAiMessage(question: String) {
        val clean = question.trim()
        if (clean.isBlank()) return
        val userId = prefs.getOrCreateDeviceUserId()
        val lang = _uiState.value.settings.languageCode
        val userMsg = AiChatMessage(id = UUID.randomUUID().toString(), role = "user", text = clean)
        _uiState.update { it.copy(aiMessages = it.aiMessages + userMsg, isAiThinking = true) }

        viewModelScope.launch {
            val check = AsakaApiClient.checkFeatureEntitlement(userId, "ai_ustoz_unlimited", consume = false)
            if (!check.allowed && check.reasonCode != "NETWORK_ERROR") {
                _uiState.update {
                    it.copy(
                        isAiThinking = false,
                        premiumGatePrompt = check,
                        aiMessages = it.aiMessages + AiChatMessage(
                            id = UUID.randomUUID().toString(),
                            role = "assistant",
                            text = check.messageUz
                        )
                    )
                }
                return@launch
            }
            val reply = AsakaApiClient.askAiAssistant(clean, lang, userId)
            val botMsg = AiChatMessage(id = UUID.randomUUID().toString(), role = "assistant", text = reply)
            _uiState.update { it.copy(aiMessages = it.aiMessages + botMsg, isAiThinking = false) }
            refreshSubscriptionsAndEntitlements(userId)
        }
    }

    // --- Unified Free & Premium Subscription + 26 Feature Entitlements ---
    fun refreshSubscriptionsAndEntitlements(userId: String = prefs.getOrCreateDeviceUserId()) {
        viewModelScope.launch {
            val (plans, card, draws) = AsakaApiClient.fetchSubscriptionCatalog()
            val (sub, features) = AsakaApiClient.fetchUserEntitlements(userId)
            _uiState.update {
                it.copy(
                    plans = if (plans.isNotEmpty()) plans else it.plans,
                    cardConfig = card,
                    randomDraws = draws,
                    subscription = sub ?: it.subscription,
                    entitlements = if (features.isNotEmpty()) features else it.entitlements
                )
            }
        }
    }

    fun submitCardOrder(planId: String, receiptRef: String, promoCode: String) {
        val st = _uiState.value
        viewModelScope.launch {
            val (ok, msg) = AsakaApiClient.submitManualCardOrder(
                userId = st.settings.userId,
                displayName = st.settings.displayName,
                planId = planId,
                receiptReference = receiptRef,
                promoCode = promoCode.ifBlank { null }
            )
            _uiState.update { it.copy(statusToast = msg) }
            if (ok) refreshSubscriptionsAndEntitlements(st.settings.userId)
        }
    }

    fun redeemPromo(code: String) {
        val userId = _uiState.value.settings.userId
        viewModelScope.launch {
            val (ok, msg) = AsakaApiClient.redeemPromoCode(userId, code)
            _uiState.update { it.copy(statusToast = msg) }
            if (ok) refreshSubscriptionsAndEntitlements(userId)
        }
    }

    fun joinDraw(drawId: String) {
        val st = _uiState.value
        viewModelScope.launch {
            val (ok, msg) = AsakaApiClient.joinRandomDraw(drawId, st.settings.userId, st.settings.displayName)
            _uiState.update { it.copy(statusToast = msg) }
            if (ok) refreshSubscriptionsAndEntitlements(st.settings.userId)
        }
    }

    fun generateTelegramLinkCode() {
        val userId = prefs.getOrCreateDeviceUserId()
        viewModelScope.launch {
            val (code, err) = AsakaApiClient.generateTelegramLinkCode(userId)
            _uiState.update {
                it.copy(
                    telegramLinkCode = code,
                    statusToast = if (code != null) "6 xonali bogʻlash kodi yaratildi: $code" else (err ?: "Xatolik")
                )
            }
        }
    }

    fun redeemAccountLinkCode(codeInput: String) {
        val cleanCode = codeInput.filter { it.isDigit() }.take(6)
        if (cleanCode.length != 6) {
            _uiState.update { it.copy(statusToast = "6 xonali bogʻlash kodini toʻliq kiriting.") }
            return
        }
        val currentUserId = prefs.getOrCreateDeviceUserId()
        viewModelScope.launch {
            val (canonicalId, err) = AsakaApiClient.redeemAccountLinkCode(cleanCode, currentUserId)
            if (!canonicalId.isNullOrBlank()) {
                prefs.saveCanonicalUserId(canonicalId)
                _uiState.update {
                    it.copy(
                        settings = it.settings.copy(userId = canonicalId),
                        statusToast = "Hisob yagona ekotizimga muvaffaqiyatli bogʻlandi!"
                    )
                }
                refreshAllBackendData()
            } else {
                _uiState.update { it.copy(statusToast = err ?: "Kod bilan bogʻlab boʻlmadi.") }
            }
        }
    }

    // --- Settings, Home Customization & Widgets ---
    fun updateLanguage(code: String) = viewModelScope.launch {
        prefs.updateLanguage(code)
        pushUnifiedSyncWithOfflineFallback(JSONObject().apply { put("language", code) })
    }

    fun updateTheme(mode: String) = viewModelScope.launch {
        prefs.updateTheme(mode)
        pushUnifiedSyncWithOfflineFallback(JSONObject().apply { put("theme", mode) })
    }
    fun updateReducedMotion(enabled: Boolean) = viewModelScope.launch { prefs.updateReducedMotion(enabled) }
    fun updateBiometricLock(enabled: Boolean) = viewModelScope.launch { prefs.updateBiometricLock(enabled) }
    fun updateDisplayName(name: String) = viewModelScope.launch { prefs.updateDisplayName(name) }
    fun updateDailyGoal(minutes: Int) = viewModelScope.launch { prefs.updateDailyGoalMinutes(minutes) }
    fun updateDailyDhikrGoal(goal: Int) = viewModelScope.launch { prefs.updateDailyDhikrGoal(goal) }
    fun completeOnboarding() = viewModelScope.launch { prefs.setOnboardingCompleted(true) }
    fun updatePrayerNotifications(enabled: Boolean) = viewModelScope.launch { prefs.updatePrayerNotifications(enabled) }
    fun updateSmartReminders(quran: Boolean? = null, hifz: Boolean? = null, dhikr: Boolean? = null) =
        viewModelScope.launch { prefs.updateSmartReminders(quran, hifz, dhikr) }

    fun updateHomeBlockVisibility(blockId: String, visible: Boolean) {
        viewModelScope.launch {
            when (blockId) {
                "prayer" -> prefs.updateHomeCardVisibility(showPrayer = visible)
                "quran" -> prefs.updateHomeCardVisibility(showQuran = visible)
                "audio" -> prefs.updateHomeCardVisibility(showAudio = visible)
                "hifz" -> prefs.updateHomeCardVisibility(showHifz = visible)
                "wisdom" -> prefs.updateHomeCardVisibility(showWisdom = visible)
                "ai" -> prefs.updateHomeCardVisibility(showAi = visible)
            }
        }
    }

    fun moveHomeBlock(blockId: String, delta: Int) {
        val current = _uiState.value.settings.homeBlockOrder.toMutableList()
        val idx = current.indexOf(blockId)
        if (idx == -1) return
        val target = (idx + delta).coerceIn(0, current.lastIndex)
        if (target == idx) return
        current.removeAt(idx)
        current.add(target, blockId)
        viewModelScope.launch { prefs.updateHomeBlockOrder(current) }
    }

    fun dismissPremiumGate() {
        _uiState.update { it.copy(premiumGatePrompt = null) }
    }

    fun clearStatusToast() {
        _uiState.update { it.copy(statusToast = null) }
    }

    private fun updatePrayerWidgets(prayer: PrayerScheduleSnapshot, weather: WeatherSnapshot?) {
        try {
            val widgetJson = JSONObject().apply {
                put("cityName", prayer.cityName)
                put("sourceMode", prayer.sourceMode)
                put("localDate", prayer.localDate)
                put("fajr", prayer.fajr)
                put("dhuhr", prayer.dhuhr)
                put("asr", prayer.asr)
                put("maghrib", prayer.maghrib)
                put("isha", prayer.isha)
                put("nextPrayerName", prayer.nextPrayerName)
                put("nextPrayerTime", prayer.nextPrayerTime)
                if (weather != null) {
                    put("weatherTempC", weather.tempC)
                    put("weatherCondition", weather.conditionUz)
                }
            }
            appContext.getSharedPreferences(AsakaPrayerWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putString(AsakaPrayerWidgetProvider.KEY_WIDGET_SNAPSHOT, widgetJson.toString())
                .putLong(AsakaPrayerWidgetProvider.KEY_WIDGET_UPDATED_AT, System.currentTimeMillis())
                .apply()
            AsakaPrayerWidgetProvider.requestUpdate(appContext)
            AsakaNextPrayerWidgetProvider.requestUpdate(appContext)
        } catch (_: Exception) {}
    }

    private fun syncDhikrAndQuranWidgets(settings: UserAppSettings) {
        try {
            val quranJson = JSONObject().apply {
                put("lastSurahName", settings.lastSurahName)
                put("lastSurahNumber", settings.lastSurahNumber)
                put("lastAyahNumber", settings.lastAyahNumber)
                put("dailyGoalMinutes", settings.dailyQuranGoalMinutes)
                put("completedMinutes", settings.completedQuranMinutesToday)
                put("tasbehToday", _uiState.value.tasbehTotalToday)
            }
            appContext.getSharedPreferences(AsakaQuranWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putString(AsakaQuranWidgetProvider.KEY_QURAN_SNAPSHOT, quranJson.toString())
                .apply()
            AsakaQuranWidgetProvider.requestUpdate(appContext)
            AsakaDhikrWidgetProvider.requestUpdate(appContext)
        } catch (_: Exception) {}
    }

    private fun syncWisdomAndHifzWidgets(central: CentralDatabaseSnapshot, hifz: List<HifzItem>) {
        try {
            val ayahText = central.dailyWisdom?.ayahTranslation?.ifBlank { null }
                ?: "Albatta, qiyinchilik bilan birga yengillik bordir."
            val ayahRef = central.dailyWisdom?.ayahRef?.ifBlank { null } ?: "Sharh surasi, 5–6-oyat"
            val hadithText = central.dailyWisdom?.hadithText?.ifBlank { null }
                ?: central.dynamicHadiths.firstOrNull()?.text
                ?: "Sizlarning eng yaxshilaringiz Qurʼonni oʻrganib, uni boshqalarga oʻrgatganlaringizdir."
            val hadithSource = central.dailyWisdom?.hadithSource?.ifBlank { null }
                ?: central.dynamicHadiths.firstOrNull()?.source
                ?: "Imom Buxoriy"

            appContext.getSharedPreferences(AsakaDailyAyahWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putString(AsakaDailyAyahWidgetProvider.KEY_AYAH_TEXT, ayahText)
                .putString(AsakaDailyAyahWidgetProvider.KEY_AYAH_REF, ayahRef)
                .putString(AsakaDailyHadithWidgetProvider.KEY_HADITH_TEXT, hadithText)
                .putString(AsakaDailyHadithWidgetProvider.KEY_HADITH_SOURCE, hadithSource)
                .apply()

            val avg = if (hifz.isEmpty()) 0 else hifz.map { it.masteryScore }.average().toInt()
            val latest = hifz.firstOrNull()
            appContext.getSharedPreferences(AsakaHifzWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putInt(AsakaHifzWidgetProvider.KEY_HIFZ_COUNT, hifz.size)
                .putInt(AsakaHifzWidgetProvider.KEY_HIFZ_AVG_MASTERY, avg)
                .putString(
                    AsakaHifzWidgetProvider.KEY_HIFZ_LATEST,
                    if (latest != null) "${latest.surahNameUz} (${latest.ayahFrom}–${latest.ayahTo})" else "Yangi hifz qoʻshing"
                )
                .apply()

            AsakaDailyAyahWidgetProvider.requestUpdate(appContext)
            AsakaDailyHadithWidgetProvider.requestUpdate(appContext)
            AsakaHifzWidgetProvider.requestUpdate(appContext)
        } catch (_: Exception) {}
    }

    // --- Full Parity User Actions (Audio/Adhan, Chat, Imam Q&A, Quiz, Istiqomat, Notifications, Favorites, UGC) ---
    fun playExternalAudio(trackKey: String, url: String, title: String, artist: String) {
        if (url.isBlank()) {
            _uiState.update { it.copy(statusToast = "Audio manzili topilmadi.") }
            return
        }
        val intent = Intent(appContext, AsakaMediaPlaybackService::class.java).apply {
            action = AsakaMediaPlaybackService.ACTION_PLAY_AUDIO
            putExtra(AsakaMediaPlaybackService.EXTRA_TRACK_KEY, trackKey)
            putExtra(AsakaMediaPlaybackService.EXTRA_AUDIO_URL, url)
            putExtra(AsakaMediaPlaybackService.EXTRA_TITLE, title)
            putExtra(AsakaMediaPlaybackService.EXTRA_ARTIST, artist)
            putExtra(AsakaMediaPlaybackService.EXTRA_SPEED, _uiState.value.playback.speed)
        }
        ContextCompat.startForegroundService(appContext, intent)
        _uiState.update { it.copy(statusToast = "Ijro etilmoqda: $title") }
    }

    fun sendCommunityMessage(text: String) {
        val clean = text.trim()
        if (clean.isBlank()) return
        val st = _uiState.value
        viewModelScope.launch {
            val (ok, msg) = AsakaEcosystemApiClient.postCommunityMessage(
                userId = st.settings.userId,
                authorName = st.settings.displayName,
                text = clean
            )
            _uiState.update { it.copy(statusToast = msg) }
            if (ok) checkManifestAndRefresh(force = true)
        }
    }

    fun submitImamInquiry(question: String) {
        val clean = question.trim()
        if (clean.isBlank()) return
        val st = _uiState.value
        viewModelScope.launch {
            val (ok, msg) = AsakaEcosystemApiClient.submitImamInquiry(st.settings.displayName, clean)
            _uiState.update { it.copy(statusToast = msg) }
            if (ok) checkManifestAndRefresh(force = true)
        }
    }

    fun submitDailyQuranQuizAttempt(quizId: String, selectedIndex: Int, isCorrect: Boolean) {
        val userId = _uiState.value.settings.userId
        viewModelScope.launch {
            AsakaEcosystemApiClient.submitQuranQuizAttempt(userId, quizId, selectedIndex, isCorrect)
        }
    }

    fun toggleIstiqomatField(field: String) {
        val cur = _uiState.value.istiqomatToday.let { if (it.dateIso.isBlank()) it.copy(dateIso = todayIso) else it }
        val updated = when (field) {
            "fajr" -> cur.copy(fajr = !cur.fajr)
            "dhuhr" -> cur.copy(dhuhr = !cur.dhuhr)
            "asr" -> cur.copy(asr = !cur.asr)
            "maghrib" -> cur.copy(maghrib = !cur.maghrib)
            "isha" -> cur.copy(isha = !cur.isha)
            "quranRead" -> cur.copy(quranRead = !cur.quranRead)
            "morningDhikr" -> cur.copy(morningDhikr = !cur.morningDhikr)
            "charity" -> cur.copy(charity = !cur.charity)
            else -> cur
        }
        _uiState.update { it.copy(istiqomatToday = updated) }
        viewModelScope.launch {
            AsakaEcosystemApiClient.syncIstiqomatDay(_uiState.value.settings.userId, updated)
        }
    }

    fun markNotificationRead(id: String) {
        viewModelScope.launch(Dispatchers.IO) {
            db.markNotificationRead(id)
            val ids = db.listReadNotificationIds()
            _uiState.update { it.copy(readNotificationIds = ids) }
        }
    }

    fun toggleFavoriteItem(favKey: String, category: String, title: String, subtitle: String = "") {
        viewModelScope.launch(Dispatchers.IO) {
            val added = db.toggleFavorite(favKey, category, title, subtitle)
            val list = db.listFavorites()
            _uiState.update {
                it.copy(
                    favorites = list,
                    statusToast = if (added) "Sevimlilarga qoʻshildi." else "Sevimlilardan olib tashlandi."
                )
            }
            val syncPayload = if (added) {
                JSONObject().apply {
                    put("mergeMode", "merge")
                    put(
                        "favorites",
                        org.json.JSONArray().put(
                            JSONObject().apply {
                                put("id", favKey)
                                put("type", category)
                                put("title", title)
                                put("subtitle", subtitle)
                                put("timestamp", System.currentTimeMillis())
                            }
                        )
                    )
                }
            } else {
                JSONObject().apply {
                    put("mergeMode", "merge")
                    put("removeFavoriteIds", org.json.JSONArray().put(favKey))
                }
            }
            pushUnifiedSyncWithOfflineFallback(syncPayload)
        }
    }

    fun reportUgcContent(targetType: String, targetId: String, reason: String) {
        val userId = _uiState.value.settings.userId
        viewModelScope.launch {
            val (_, msg) = AsakaEcosystemApiClient.submitUgcReport(targetType, targetId, reason, userId)
            _uiState.update { it.copy(statusToast = msg) }
        }
    }

    fun requestAccountDeletion(reason: String) {
        val userId = _uiState.value.settings.userId
        viewModelScope.launch {
            val (_, msg) = AsakaEcosystemApiClient.requestAccountDeletion(userId, reason)
            _uiState.update { it.copy(statusToast = msg) }
        }
    }

    // --- Role-Protected Native Super Admin Panel Actions ---
    private fun restoreAdminSession() {
        val savedToken = prefs.getAdminToken() ?: return
        viewModelScope.launch {
            val session = AsakaEcosystemApiClient.verifyAdminSession(savedToken)
            if (session != null && session.isAuthenticated) {
                _uiState.update { it.copy(adminSession = session) }
                adminRefreshConsole()
            } else {
                prefs.clearAdminToken()
            }
        }
    }

    fun adminSignIn(username: String, password: String) {
        if (username.isBlank() || password.isBlank()) {
            _uiState.update { it.copy(statusToast = "Login va parolni kiriting.") }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isAdminBusy = true) }
            val (session, msg) = AsakaEcosystemApiClient.adminLogin(username, password)
            if (session != null && session.isAuthenticated) {
                prefs.saveAdminToken(session.token)
                _uiState.update { it.copy(adminSession = session, isAdminBusy = false, statusToast = msg) }
                adminRefreshConsole()
            } else {
                _uiState.update { it.copy(isAdminBusy = false, statusToast = msg) }
            }
        }
    }

    fun adminSignOut() {
        prefs.clearAdminToken()
        _uiState.update {
            it.copy(
                adminSession = AdminSession(),
                adminOrders = emptyList(),
                adminFeatureFlags = emptyList(),
                statusToast = "Admin sessiyasi yopildi."
            )
        }
    }

    fun adminRefreshConsole() {
        val token = _uiState.value.adminSession.token
        if (token.isBlank()) return
        viewModelScope.launch {
            _uiState.update { it.copy(isAdminBusy = true) }
            val (orders, flags) = AsakaEcosystemApiClient.adminFetchOrdersAndFeatures(token)
            _uiState.update {
                it.copy(
                    adminOrders = orders,
                    adminFeatureFlags = flags,
                    isAdminBusy = false
                )
            }
        }
    }

    private fun runAdminAction(block: suspend (String) -> Pair<Boolean, String>) {
        val token = _uiState.value.adminSession.token
        if (token.isBlank()) {
            _uiState.update { it.copy(statusToast = "Avval Admin sifatida tizimga kiring.") }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isAdminBusy = true) }
            val (ok, msg) = block(token)
            _uiState.update { it.copy(isAdminBusy = false, statusToast = msg) }
            if (ok) {
                checkManifestAndRefresh(force = true)
                adminRefreshConsole()
            }
        }
    }

    fun adminSaveAsakaPrayer(fajr: String, sunrise: String, dhuhr: String, asr: String, maghrib: String, isha: String, tahajjud: String) =
        runAdminAction { AsakaEcosystemApiClient.adminSaveAsakaPrayer(it, fajr, sunrise, dhuhr, asr, maghrib, isha, tahajjud) }

    fun adminPublishArticle(title: String, category: String, author: String, content: String) =
        runAdminAction { AsakaEcosystemApiClient.adminPublishArticle(it, title, category, author, content) }

    fun adminPublishNews(title: String, content: String, isUrgent: Boolean) =
        runAdminAction { AsakaEcosystemApiClient.adminPublishNews(it, title, content, isUrgent) }

    fun adminPublishAnnouncement(title: String, message: String, type: String) =
        runAdminAction { AsakaEcosystemApiClient.adminPublishAnnouncement(it, title, message, type) }

    fun adminPublishHadith(title: String, text: String, source: String) =
        runAdminAction { AsakaEcosystemApiClient.adminPublishHadith(it, title, text, source) }

    fun adminPublishDhikr(title: String, arabic: String, translation: String, count: Int) =
        runAdminAction { AsakaEcosystemApiClient.adminPublishDhikr(it, title, arabic, translation, count) }

    fun adminAddQari(nameUz: String, nameAr: String, countryUz: String, styleUz: String, bioUz: String) =
        runAdminAction { AsakaEcosystemApiClient.adminAddQari(it, nameUz, nameAr, countryUz, styleUz, bioUz) }

    fun adminSaveHomeBlocks(config: AdminHomeConfig) =
        runAdminAction { AsakaEcosystemApiClient.adminSaveHomeBlocks(it, config) }

    fun adminReviewOrder(orderId: String, approve: Boolean) =
        runAdminAction { AsakaEcosystemApiClient.adminReviewOrder(it, orderId, approve) }

    fun adminToggleFeature(featureKey: String, newAccess: String, isEnabled: Boolean) =
        runAdminAction { AsakaEcosystemApiClient.adminToggleFeature(it, featureKey, newAccess, isEnabled) }

    fun adminGrantPremium(targetUserId: String, days: Int, note: String) =
        runAdminAction { AsakaEcosystemApiClient.adminGrantPremium(it, targetUserId, days, note) }

    fun adminCreatePromoCode(code: String, discountPercent: Int, bonusDays: Int) =
        runAdminAction { AsakaEcosystemApiClient.adminCreatePromoCode(it, code, discountPercent, bonusDays) }

    fun adminBroadcastPush(title: String, bodyText: String) =
        runAdminAction { AsakaEcosystemApiClient.adminBroadcastPush(it, title, bodyText) }

    fun adminBroadcastTelegram(message: String) =
        runAdminAction { AsakaEcosystemApiClient.adminBroadcastTelegram(it, message) }

    fun adminCreateBackup() =
        runAdminAction { AsakaEcosystemApiClient.adminCreateBackup(it) }

    fun adminReplyInquiry(inquiryId: String, replyText: String) =
        runAdminAction { AsakaEcosystemApiClient.adminReplyInquiry(it, inquiryId, replyText) }

    fun adminArchiveInquiry(inquiryId: String) =
        runAdminAction { AsakaEcosystemApiClient.adminArchiveInquiry(it, inquiryId) }
}
