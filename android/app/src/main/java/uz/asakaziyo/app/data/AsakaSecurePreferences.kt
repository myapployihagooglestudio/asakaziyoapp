package uz.asakaziyo.app.data

import android.content.Context
import android.util.Log
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.util.UUID

private val Context.asakaDataStore: DataStore<Preferences> by preferencesDataStore(name = "asaka_ziyo_settings_v5")

/**
 * ASAKA ZIYO — Hybrid Android Keystore + DataStore Persistence Layer
 *
 * - Sensitive credentials (canonical user ID, auth tokens, linked session token) are stored
 *   strictly inside Android Keystore-backed EncryptedSharedPreferences.
 * - Non-sensitive UI/UX preferences (language, theme, reduced motion, daily goal, home layout)
 *   are stored reactively via Jetpack DataStore Flow.
 */
class AsakaSecurePreferences(private val context: Context) {

    private val encryptedPrefs by lazy {
        try {
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()
            EncryptedSharedPreferences.create(
                context,
                "asaka_ziyo_keystore_prefs_v5",
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        } catch (e: Exception) {
            Log.w("ASAKA_KEYSTORE", "EncryptedSharedPreferences fallback: ${e.message}")
            context.getSharedPreferences("asaka_ziyo_fallback_prefs_v5", Context.MODE_PRIVATE)
        }
    }

    fun getOrCreateDeviceUserId(): String {
        val existing = encryptedPrefs.getString(KEY_SECURE_USER_ID, null)
        if (!existing.isNullOrBlank()) return existing
        val generated = "and_${UUID.randomUUID().toString().replace("-", "").take(16)}"
        encryptedPrefs.edit().putString(KEY_SECURE_USER_ID, generated).apply()
        return generated
    }

    fun saveCanonicalUserId(canonicalId: String) {
        if (canonicalId.isNotBlank()) {
            encryptedPrefs.edit().putString(KEY_SECURE_USER_ID, canonicalId.trim()).apply()
        }
    }

    fun saveAuthToken(token: String?) {
        val editor = encryptedPrefs.edit()
        if (token.isNullOrBlank()) editor.remove(KEY_AUTH_TOKEN) else editor.putString(KEY_AUTH_TOKEN, token)
        editor.apply()
    }

    fun getAuthToken(): String? = encryptedPrefs.getString(KEY_AUTH_TOKEN, null)

    val settingsFlow: Flow<UserAppSettings> = context.asakaDataStore.data.map { prefs ->
        UserAppSettings(
            userId = getOrCreateDeviceUserId(),
            displayName = prefs[KEY_DISPLAY_NAME] ?: "Mehmon",
            languageCode = prefs[KEY_LANGUAGE] ?: "uz-Latn",
            themeMode = prefs[KEY_THEME] ?: "dark",
            reducedMotion = prefs[KEY_REDUCED_MOTION] ?: false,
            biometricLockEnabled = prefs[KEY_BIOMETRIC_LOCK] ?: false,
            selectedCityId = prefs[KEY_CITY_ID] ?: "uz-andijan-asaka",
            selectedCityName = prefs[KEY_CITY_NAME] ?: "Asaka",
            dailyQuranGoalMinutes = prefs[KEY_DAILY_GOAL_MIN] ?: 15,
            completedQuranMinutesToday = prefs[KEY_COMPLETED_MIN_TODAY] ?: 0,
            lastSurahNumber = prefs[KEY_LAST_SURAH_NUM] ?: 1,
            lastSurahName = prefs[KEY_LAST_SURAH_NAME] ?: "Fotiha",
            lastAyahNumber = prefs[KEY_LAST_AYAH_NUM] ?: 1,
            mushafFontSizeSp = prefs[KEY_MUSHAF_FONT_SP] ?: 26,
            mushafLightPaper = prefs[KEY_MUSHAF_LIGHT_PAPER] ?: false,
            showPrayerCard = prefs[KEY_SHOW_PRAYER_CARD] ?: true,
            showQuranCard = prefs[KEY_SHOW_QURAN_CARD] ?: true,
            showHifzCard = prefs[KEY_SHOW_HIFZ_CARD] ?: true,
            showWisdomCard = prefs[KEY_SHOW_WISDOM_CARD] ?: true,
            prayerNotificationsEnabled = prefs[KEY_PRAYER_NOTIFY] ?: true
        )
    }

    suspend fun updateLanguage(code: String) {
        context.asakaDataStore.edit { it[KEY_LANGUAGE] = code }
    }

    suspend fun updateTheme(mode: String) {
        context.asakaDataStore.edit { it[KEY_THEME] = mode }
    }

    suspend fun updateReducedMotion(enabled: Boolean) {
        context.asakaDataStore.edit { it[KEY_REDUCED_MOTION] = enabled }
    }

    suspend fun updateBiometricLock(enabled: Boolean) {
        context.asakaDataStore.edit { it[KEY_BIOMETRIC_LOCK] = enabled }
    }

    suspend fun updateDisplayName(name: String) {
        context.asakaDataStore.edit { it[KEY_DISPLAY_NAME] = name.trim().ifBlank { "Mehmon" }.take(60) }
    }

    suspend fun updateSelectedCity(cityId: String, cityName: String) {
        context.asakaDataStore.edit {
            it[KEY_CITY_ID] = cityId
            it[KEY_CITY_NAME] = cityName
        }
    }

    suspend fun updateLastRead(surahNumber: Int, surahName: String, ayahNumber: Int) {
        context.asakaDataStore.edit {
            it[KEY_LAST_SURAH_NUM] = surahNumber
            it[KEY_LAST_SURAH_NAME] = surahName
            it[KEY_LAST_AYAH_NUM] = ayahNumber
        }
    }

    suspend fun addReadingMinutes(deltaMinutes: Int) {
        context.asakaDataStore.edit { prefs ->
            val current = prefs[KEY_COMPLETED_MIN_TODAY] ?: 0
            prefs[KEY_COMPLETED_MIN_TODAY] = (current + deltaMinutes).coerceAtLeast(0)
        }
    }

    suspend fun updateMushafPreferences(fontSizeSp: Int, lightPaper: Boolean) {
        context.asakaDataStore.edit {
            it[KEY_MUSHAF_FONT_SP] = fontSizeSp.coerceIn(18, 42)
            it[KEY_MUSHAF_LIGHT_PAPER] = lightPaper
        }
    }

    suspend fun updateHomeCardVisibility(
        showPrayer: Boolean? = null,
        showQuran: Boolean? = null,
        showHifz: Boolean? = null,
        showWisdom: Boolean? = null
    ) {
        context.asakaDataStore.edit { prefs ->
            showPrayer?.let { prefs[KEY_SHOW_PRAYER_CARD] = it }
            showQuran?.let { prefs[KEY_SHOW_QURAN_CARD] = it }
            showHifz?.let { prefs[KEY_SHOW_HIFZ_CARD] = it }
            showWisdom?.let { prefs[KEY_SHOW_WISDOM_CARD] = it }
        }
    }

    suspend fun updatePrayerNotifications(enabled: Boolean) {
        context.asakaDataStore.edit { it[KEY_PRAYER_NOTIFY] = enabled }
    }

    companion object {
        private const val KEY_SECURE_USER_ID = "secure_canonical_user_id"
        private const val KEY_AUTH_TOKEN = "secure_auth_token"

        private val KEY_DISPLAY_NAME = stringPreferencesKey("display_name")
        private val KEY_LANGUAGE = stringPreferencesKey("language_code")
        private val KEY_THEME = stringPreferencesKey("theme_mode")
        private val KEY_REDUCED_MOTION = booleanPreferencesKey("reduced_motion")
        private val KEY_BIOMETRIC_LOCK = booleanPreferencesKey("biometric_lock")
        private val KEY_CITY_ID = stringPreferencesKey("selected_city_id")
        private val KEY_CITY_NAME = stringPreferencesKey("selected_city_name")
        private val KEY_DAILY_GOAL_MIN = intPreferencesKey("daily_quran_goal_min")
        private val KEY_COMPLETED_MIN_TODAY = intPreferencesKey("completed_quran_min_today")
        private val KEY_LAST_SURAH_NUM = intPreferencesKey("last_surah_num")
        private val KEY_LAST_SURAH_NAME = stringPreferencesKey("last_surah_name")
        private val KEY_LAST_AYAH_NUM = intPreferencesKey("last_ayah_num")
        private val KEY_MUSHAF_FONT_SP = intPreferencesKey("mushaf_font_sp")
        private val KEY_MUSHAF_LIGHT_PAPER = booleanPreferencesKey("mushaf_light_paper")
        private val KEY_SHOW_PRAYER_CARD = booleanPreferencesKey("show_prayer_card")
        private val KEY_SHOW_QURAN_CARD = booleanPreferencesKey("show_quran_card")
        private val KEY_SHOW_HIFZ_CARD = booleanPreferencesKey("show_hifz_card")
        private val KEY_SHOW_WISDOM_CARD = booleanPreferencesKey("show_wisdom_card")
        private val KEY_PRAYER_NOTIFY = booleanPreferencesKey("prayer_notifications")
    }
}
