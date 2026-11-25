package uz.asakaziyo.app.data

/**
 * ASAKA ZIYO v5.0.0 — Canonical Domain Models
 * 100% aligned with the single central ASAKA ZIYO backend (Firestore + Express API).
 */

data class UserAppSettings(
    val userId: String = "",
    val displayName: String = "Mehmon",
    val languageCode: String = "uz-Latn",
    val themeMode: String = "dark", // dark | light | system
    val reducedMotion: Boolean = false,
    val biometricLockEnabled: Boolean = false,
    val selectedCityId: String = "uz-andijan-asaka",
    val selectedCityName: String = "Asaka",
    val dailyQuranGoalMinutes: Int = 15,
    val completedQuranMinutesToday: Int = 0,
    val lastSurahNumber: Int = 1,
    val lastSurahName: String = "Fotiha",
    val lastAyahNumber: Int = 1,
    val mushafFontSizeSp: Int = 26,
    val mushafLightPaper: Boolean = false,
    val showPrayerCard: Boolean = true,
    val showQuranCard: Boolean = true,
    val showHifzCard: Boolean = true,
    val showWisdomCard: Boolean = true,
    val prayerNotificationsEnabled: Boolean = true
)

data class PrayerScheduleSnapshot(
    val cityId: String,
    val cityName: String,
    val regionName: String,
    val sourceMode: String, // MANUAL_ADMIN (Asaka) | AUTO_CALCULATED
    val localDate: String,
    val hijriDate: String,
    val fajr: String,
    val sunrise: String,
    val dhuhr: String,
    val asr: String,
    val maghrib: String,
    val isha: String,
    val tahajjud: String = "",
    val nextPrayerName: String = "",
    val nextPrayerTime: String = "",
    val isStaleCache: Boolean = false,
    val fetchedAt: String = ""
)

data class WeatherSnapshot(
    val cityName: String,
    val tempC: Double,
    val conditionUz: String,
    val humidity: Int = 0,
    val windKmh: Double = 0.0,
    val isStale: Boolean = false,
    val attribution: String = "Open-Meteo (CC BY 4.0)"
)

data class CityOption(
    val id: String,
    val cityName: String,
    val regionName: String,
    val countryName: String,
    val latitude: Double,
    val longitude: Double,
    val isManualAdmin: Boolean = false
)

data class SurahSummary(
    val number: Int,
    val nameUz: String,
    val nameAr: String,
    val ayahCount: Int,
    val revelationType: String,
    val juzStart: Int
)

data class MushafAyah(
    val numberInSurah: Int,
    val arabicText: String,
    val translationUz: String
)

data class QariProfile(
    val id: String,
    val nameUz: String,
    val nameAr: String,
    val countryUz: String,
    val styleUz: String,
    val bioUz: String,
    val publishedSurahsCount: Int,
    val externalSurahBaseUrl: String? = null
)

data class QariSurahTrack(
    val trackKey: String,
    val qariId: String,
    val qariName: String,
    val surahNumber: Int,
    val surahNameUz: String,
    val audioId: String?,
    val streamUrl: String,
    val sha256: String? = null,
    val durationSec: Int = 0,
    val isServerHosted: Boolean = false,
    val isDownloadedOffline: Boolean = false
)

data class QuranPlaylist(
    val id: String,
    val titleUz: String,
    val descriptionUz: String,
    val isOfficial: Boolean,
    val trackCount: Int,
    val firstSurahNumber: Int = 1
)

data class ArabicLetterItem(
    val order: Int,
    val letter: String,
    val nameUz: String,
    val makhrajUz: String,
    val pronunciationUz: String
)

data class TajweedLesson(
    val id: String,
    val titleUz: String,
    val level: String,
    val summaryUz: String,
    val contentUz: String
)

data class HifzItem(
    val surahNumber: Int,
    val surahNameUz: String,
    val ayahFrom: Int,
    val ayahTo: Int,
    val masteryScore: Int,
    val nextReviewIso: String,
    val repetitions: Int
)

data class SubscriptionPlan(
    val id: String,
    val nameUz: String,
    val durationDays: Int,
    val priceUzs: Long,
    val badgeUz: String = "",
    val descriptionUz: String = ""
)

data class ManualCardConfig(
    val isActive: Boolean = false,
    val cardholderName: String = "",
    val cardNumber: String = "",
    val bankName: String = "",
    val instructionsUz: String = "",
    val supportTelegramUrl: String = ""
)

data class RandomDrawItem(
    val id: String,
    val titleUz: String,
    val descriptionUz: String,
    val prizeDays: Int,
    val winnersCount: Int,
    val entriesCount: Int,
    val status: String
)

data class EffectiveSubscription(
    val userId: String,
    val status: String, // FREE | PENDING | ACTIVE | EXPIRED | CANCELLED | SUSPENDED | GIFTED
    val planId: String,
    val isPremium: Boolean,
    val daysRemaining: Int,
    val expiresAt: String?,
    val linkedAliases: List<String> = emptyList()
)

data class FeatureEntitlementItem(
    val key: String,
    val module: String,
    val titleUz: String,
    val descriptionUz: String,
    val access: String, // free | premium
    val isEnabled: Boolean = true,
    val allowed: Boolean = true,
    val reasonCode: String = "OK",
    val limit: Int? = null, // null = unlimited
    val limitPeriod: String = "daily", // daily | weekly | monthly | unlimited
    val usedCount: Int = 0,
    val remaining: Int? = null,
    val userNoticeUz: String = ""
)

data class FeatureCheckResult(
    val allowed: Boolean,
    val featureKey: String,
    val reasonCode: String, // OK | PREMIUM_REQUIRED | USAGE_LIMIT_REACHED | FEATURE_DISABLED | NETWORK_ERROR
    val messageUz: String,
    val isPremium: Boolean = false,
    val limit: Int? = null,
    val usedCount: Int = 0,
    val remaining: Int? = null
)

data class AiChatMessage(
    val id: String,
    val role: String, // user | assistant
    val text: String,
    val timestampMs: Long = System.currentTimeMillis()
)

data class HadithItem(
    val titleUz: String,
    val textUz: String,
    val source: String
)

data class DuaItem(
    val titleUz: String,
    val arabic: String,
    val transliteration: String,
    val translationUz: String
)
