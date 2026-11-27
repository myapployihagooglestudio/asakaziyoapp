package uz.asakaziyo.app.i18n

import androidx.compose.runtime.staticCompositionLocalOf

/**
 * ASAKA ZIYO — Complete 5-Language Native Localization System
 *
 * Supported Locales:
 * 1. uz-Latn — Oʻzbek lotin
 * 2. uz-Cyrl — Ўзбек кирилл
 * 3. uz-New  — Yangi oʻzbek lotin (strict rules: sh→ş, ch→ç, oʻ→ö, gʻ→ğ)
 * 4. ru      — Русский
 * 5. en      — English
 *
 * CRITICAL: Arabic Qur'an text is NEVER transliterated or altered.
 */
enum class AsakaLocale(val code: String, val nativeLabel: String) {
    UZ_LATN("uz-Latn", "Oʻzbek (Lotin)"),
    UZ_CYRL("uz-Cyrl", "Ўзбек (Кирилл)"),
    UZ_NEW("uz-New", "Yangi oʻzbek (ş ç ö ğ)"),
    RU("ru", "Русский"),
    EN("en", "English");

    companion object {
        fun fromCode(raw: String?): AsakaLocale {
            return entries.firstOrNull { it.code.equals(raw, ignoreCase = true) } ?: UZ_LATN
        }
    }
}

/**
 * Exact New Uzbek Latin transliterator matching the ASAKA ZIYO Web App standard:
 * sh -> ş, ch -> ç, oʻ/o'/o‘ -> ö, gʻ/g'/g‘ -> ğ (preserving capitalization).
 */
fun toNewUzbekLatin(input: String): String {
    return input
        .replace(Regex("O[ʻ’'‘`]"), "Ö")
        .replace(Regex("o[ʻ’'‘`]"), "ö")
        .replace(Regex("G[ʻ’'‘`]"), "Ğ")
        .replace(Regex("g[ʻ’'‘`]"), "ğ")
        .replace("SH", "Ş")
        .replace("Sh", "Ş")
        .replace("sh", "ş")
        .replace("CH", "Ç")
        .replace("Ch", "Ç")
        .replace("ch", "ç")
}

data class AsakaStrings(
    val locale: AsakaLocale,
    val appTitle: String,
    val greeting: String,
    val navHome: String,
    val navQuran: String,
    val navLearn: String,
    val navAudio: String,
    val navProfile: String,
    val navPrayer: String,
    val navOffline: String,
    val prayerTimes: String,
    val nextPrayer: String,
    val continueQuran: String,
    val dailyGoal: String,
    val qarisLibrary: String,
    val mushaf: String,
    val playlists: String,
    val hifzMurojaa: String,
    val tajweedAcademy: String,
    val qiblaCompass: String,
    val tasbeh: String,
    val dailyHadith: String,
    val dailyDua: String,
    val aiAssistant: String,
    val offlineCenter: String,
    val premiumHub: String,
    val settings: String,
    val languageLabel: String,
    val themeLabel: String,
    val darkMode: String,
    val lightMode: String,
    val systemMode: String,
    val reducedMotion: String,
    val biometricLock: String,
    val aboutTitle: String,
    val linkTelegram: String,
    val downloadOffline: String,
    val downloadedBadge: String,
    val syncNow: String,
    val openAdminPortal: String,
    val globalSearch: String,
    val customizeHome: String,
    val developerAttribution: String = "Dev by Ulug‘bek Mirzayev"
)

fun resolveAsakaStrings(locale: AsakaLocale): AsakaStrings {
    val uzLatn = AsakaStrings(
        locale = AsakaLocale.UZ_LATN,
        appTitle = "ASAKA ZIYO",
        greeting = "Assalomu alaykum",
        navHome = "Home",
        navQuran = "Qurʼon",
        navLearn = "Oʻrganish",
        navAudio = "Audio",
        navProfile = "Profil",
        navPrayer = "Namoz",
        navOffline = "Oflayn",
        prayerTimes = "Namoz vaqtlari",
        nextPrayer = "Keyingi namoz",
        continueQuran = "Qurʼonni davom ettirish",
        dailyGoal = "Kunlik Qurʼon maqsadi",
        qarisLibrary = "Qorilar kutubxonasi",
        mushaf = "Mushaf (114 sura)",
        playlists = "Pleylistlar",
        hifzMurojaa = "Hifz va Murojaʼa",
        tajweedAcademy = "Tajvid akademiyasi",
        qiblaCompass = "Qibla kompasi",
        tasbeh = "Tasbeh va Zikr",
        dailyHadith = "Kunlik Hadis",
        dailyDua = "Kunlik Duo",
        aiAssistant = "AI Yordamchi",
        offlineCenter = "Oflayn Markaz",
        premiumHub = "Premium Obuna",
        settings = "Sozlamalar",
        languageLabel = "Til / Yozuv",
        themeLabel = "Koʻrinish rejimi",
        darkMode = "Tungi (OLED)",
        lightMode = "Kunduzgi (Ivory)",
        systemMode = "Tizim boʻyicha",
        reducedMotion = "Yengil animatsiya (Quvvat tejash)",
        biometricLock = "Biometrik qulf (Barmoq izi)",
        aboutTitle = "ASAKA ZIYO haqida",
        linkTelegram = "Telegram hisobni bogʻlash",
        downloadOffline = "Oflayn yuklash",
        downloadedBadge = "Oflayn tayyor",
        syncNow = "Hozir sinxronlash",
        openAdminPortal = "Admin Boshqaruv Markazi",
        globalSearch = "Sura, qori, hadis, duo izlash...",
        customizeHome = "Bosh sahifani sozlash"
    )

    return when (locale) {
        AsakaLocale.UZ_LATN -> uzLatn
        AsakaLocale.UZ_NEW -> uzLatn.copy(
            locale = AsakaLocale.UZ_NEW,
            greeting = toNewUzbekLatin(uzLatn.greeting),
            navHome = "Home",
            navQuran = toNewUzbekLatin(uzLatn.navQuran),
            navLearn = toNewUzbekLatin(uzLatn.navLearn),
            navAudio = toNewUzbekLatin(uzLatn.navAudio),
            navProfile = toNewUzbekLatin(uzLatn.navProfile),
            navPrayer = toNewUzbekLatin(uzLatn.navPrayer),
            navOffline = toNewUzbekLatin(uzLatn.navOffline),
            prayerTimes = toNewUzbekLatin(uzLatn.prayerTimes),
            nextPrayer = toNewUzbekLatin(uzLatn.nextPrayer),
            continueQuran = toNewUzbekLatin(uzLatn.continueQuran),
            dailyGoal = toNewUzbekLatin(uzLatn.dailyGoal),
            qarisLibrary = toNewUzbekLatin(uzLatn.qarisLibrary),
            mushaf = toNewUzbekLatin(uzLatn.mushaf),
            playlists = toNewUzbekLatin(uzLatn.playlists),
            hifzMurojaa = toNewUzbekLatin(uzLatn.hifzMurojaa),
            tajweedAcademy = toNewUzbekLatin(uzLatn.tajweedAcademy),
            qiblaCompass = toNewUzbekLatin(uzLatn.qiblaCompass),
            tasbeh = toNewUzbekLatin(uzLatn.tasbeh),
            dailyHadith = toNewUzbekLatin(uzLatn.dailyHadith),
            dailyDua = toNewUzbekLatin(uzLatn.dailyDua),
            aiAssistant = toNewUzbekLatin(uzLatn.aiAssistant),
            offlineCenter = toNewUzbekLatin(uzLatn.offlineCenter),
            premiumHub = toNewUzbekLatin(uzLatn.premiumHub),
            settings = toNewUzbekLatin(uzLatn.settings),
            languageLabel = toNewUzbekLatin(uzLatn.languageLabel),
            themeLabel = toNewUzbekLatin(uzLatn.themeLabel),
            darkMode = toNewUzbekLatin(uzLatn.darkMode),
            lightMode = toNewUzbekLatin(uzLatn.lightMode),
            systemMode = toNewUzbekLatin(uzLatn.systemMode),
            reducedMotion = toNewUzbekLatin(uzLatn.reducedMotion),
            biometricLock = toNewUzbekLatin(uzLatn.biometricLock),
            aboutTitle = toNewUzbekLatin(uzLatn.aboutTitle),
            linkTelegram = toNewUzbekLatin(uzLatn.linkTelegram),
            downloadOffline = toNewUzbekLatin(uzLatn.downloadOffline),
            downloadedBadge = toNewUzbekLatin(uzLatn.downloadedBadge),
            syncNow = toNewUzbekLatin(uzLatn.syncNow),
            openAdminPortal = toNewUzbekLatin(uzLatn.openAdminPortal),
            globalSearch = toNewUzbekLatin(uzLatn.globalSearch),
            customizeHome = toNewUzbekLatin(uzLatn.customizeHome)
        )
        AsakaLocale.UZ_CYRL -> AsakaStrings(
            locale = AsakaLocale.UZ_CYRL,
            appTitle = "ASAKA ZIYO",
            greeting = "Ассалому алайкум",
            navHome = "Бош саҳифа",
            navQuran = "Қуръон",
            navLearn = "Ўрганиш",
            navAudio = "Аудио",
            navProfile = "Профил",
            navPrayer = "Намоз",
            navOffline = "Офлайн",
            prayerTimes = "Намоз вақтлари",
            nextPrayer = "Кейинги намоз",
            continueQuran = "Қуръонни давом эттириш",
            dailyGoal = "Кунлик Қуръон мақсади",
            qarisLibrary = "Қорилар кутубхонаси",
            mushaf = "Мусҳаф (114 сура)",
            playlists = "Плейлистлар",
            hifzMurojaa = "Ҳифз ва Мурожаъа",
            tajweedAcademy = "Тажвид академияси",
            qiblaCompass = "Қибла компаси",
            tasbeh = "Тасбеҳ ва Зикр",
            dailyHadith = "Кунлик Ҳадис",
            dailyDua = "Кунлик Дуо",
            aiAssistant = "AI Ёрдамчи",
            offlineCenter = "Офлайн Марказ",
            premiumHub = "Premium Обуна",
            settings = "Созламалар",
            languageLabel = "Тил / Ёзув",
            themeLabel = "Кўриниш режими",
            darkMode = "Тунги (OLED)",
            lightMode = "Кундузги (Ivory)",
            systemMode = "Тизим бўйича",
            reducedMotion = "Енгил анимация (Қувват тежаш)",
            biometricLock = "Биометрик қулф",
            aboutTitle = "ASAKA ZIYO ҳақида",
            linkTelegram = "Telegram ҳисобни боғлаш",
            downloadOffline = "Офлайн юклаш",
            downloadedBadge = "Офлайн тайёр",
            syncNow = "Ҳозир синхронлаш",
            openAdminPortal = "Админ Бошқарув Маркази",
            globalSearch = "Сура, қори, ҳадис, дуо излаш...",
            customizeHome = "Бош саҳифани созлаш"
        )
        AsakaLocale.RU -> AsakaStrings(
            locale = AsakaLocale.RU,
            appTitle = "ASAKA ZIYO",
            greeting = "Ассаламу алейкум",
            navHome = "Главная",
            navQuran = "Коран",
            navLearn = "Обучение",
            navAudio = "Аудио",
            navProfile = "Профиль",
            navPrayer = "Намаз",
            navOffline = "Офлайн",
            prayerTimes = "Время намаза",
            nextPrayer = "Следующий намаз",
            continueQuran = "Продолжить чтение",
            dailyGoal = "Дневная цель Корана",
            qarisLibrary = "Библиотека чтецов",
            mushaf = "Мусхаф (114 сур)",
            playlists = "Плейлисты",
            hifzMurojaa = "Хифз и Повторение",
            tajweedAcademy = "Академия Таджвида",
            qiblaCompass = "Компас Киблы",
            tasbeh = "Тасбих и Зикр",
            dailyHadith = "Хадис дня",
            dailyDua = "Дуа дня",
            aiAssistant = "AI Помощник",
            offlineCenter = "Офлайн Центр",
            premiumHub = "Premium Подписка",
            settings = "Настройки",
            languageLabel = "Язык",
            themeLabel = "Тема оформления",
            darkMode = "Тёмная (OLED)",
            lightMode = "Светлая (Ivory)",
            systemMode = "Системная",
            reducedMotion = "Уменьшение анимаций",
            biometricLock = "Биометрический замок",
            aboutTitle = "О приложении ASAKA ZIYO",
            linkTelegram = "Привязать Telegram",
            downloadOffline = "Скачать офлайн",
            downloadedBadge = "Доступно офлайн",
            syncNow = "Синхронизировать",
            openAdminPortal = "Панель Администратора",
            globalSearch = "Поиск сур, чтецов, хадисов, дуа...",
            customizeHome = "Настройка главной"
        )
        AsakaLocale.EN -> AsakaStrings(
            locale = AsakaLocale.EN,
            appTitle = "ASAKA ZIYO",
            greeting = "Assalamu Alaykum",
            navHome = "Home",
            navQuran = "Qur'an",
            navLearn = "Learn",
            navAudio = "Audio",
            navProfile = "Profile",
            navPrayer = "Prayer",
            navOffline = "Offline",
            prayerTimes = "Prayer Times",
            nextPrayer = "Next Prayer",
            continueQuran = "Continue Reading",
            dailyGoal = "Daily Qur'an Goal",
            qarisLibrary = "Qaris Library",
            mushaf = "Mushaf (114 Surahs)",
            playlists = "Playlists",
            hifzMurojaa = "Hifz & Review",
            tajweedAcademy = "Tajweed Academy",
            qiblaCompass = "Qibla Compass",
            tasbeh = "Tasbih & Dhikr",
            dailyHadith = "Daily Hadith",
            dailyDua = "Daily Dua",
            aiAssistant = "AI Assistant",
            offlineCenter = "Offline Center",
            premiumHub = "Premium Subscription",
            settings = "Settings",
            languageLabel = "Language",
            themeLabel = "Appearance",
            darkMode = "Dark (OLED)",
            lightMode = "Light (Ivory)",
            systemMode = "System Default",
            reducedMotion = "Reduced Motion (Low Power)",
            biometricLock = "Biometric App Lock",
            aboutTitle = "About ASAKA ZIYO",
            linkTelegram = "Link Telegram Account",
            downloadOffline = "Save Offline",
            downloadedBadge = "Offline Ready",
            syncNow = "Sync Now",
            openAdminPortal = "Admin Control Center",
            globalSearch = "Search Surahs, Qaris, Hadith, Duas...",
            customizeHome = "Customize Home"
        )
    }
}

val LocalAsakaStrings = staticCompositionLocalOf { resolveAsakaStrings(AsakaLocale.UZ_LATN) }
