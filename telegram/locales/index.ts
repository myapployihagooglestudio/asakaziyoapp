/**
 * ASAKA ZIYO — Telegram Super Platform Complete 5-Language Localization Engine
 *
 * Strictly supports ALL 5 official ASAKA ZIYO languages:
 * 1. uz-Latn     (O‘zbek lotin)
 * 2. uz-Cyrl     (Ўзбек кирилл)
 * 3. uz-Latn-new (Yangi o‘zbek lotin — generated via existing official src/utils/newUzbekAlphabet.ts)
 * 4. ru          (Русский)
 * 5. en          (English)
 */

import { transformResourceObject } from '../../src/utils/newUzbekAlphabet';
import { TELEGRAM_SUPPORTED_LOCALES, TelegramLocale } from '../types';

export const TELEGRAM_LANGUAGE_NATIVE_NAMES: Record<TelegramLocale, string> = {
  'uz-Latn': 'Oʻzbekcha (Lotin)',
  'uz-Cyrl': 'Ўзбекча (Кирилл)',
  'uz-Latn-new': 'Özbekça (Yangi Lotin)',
  ru: 'Русский',
  en: 'English',
};

export interface TelegramLocaleDictionary {
  languageName: string;
  welcomeTitle: string;
  welcomeBody: string;
  onboardingPrompt: string;
  mainMenuTitle: string;
  mainMenuPrompt: string;
  helpTitle: string;
  helpBody: string;
  languageTitle: string;
  languagePrompt: string;
  languageChangedToast: string;
  languageChangedMessage: string;
  settingsTitle: string;
  settingsBody: string;
  settingsPrayerAlerts: string;
  settingsDailyWisdom: string;
  settingsAnnouncements: string;
  settingsCurrentLanguage: string;
  statusEnabled: string;
  statusDisabled: string;
  settingUpdatedToast: string;
  stopOptOutMessage: string;
  prayerTitle: string;
  prayerLocationLine: string;
  prayerDateLine: string;
  prayerHijriLine: string;
  prayerNextLabel: string;
  prayerFooterNote: string;
  prayerUnavailable: string;
  iqamahLabel: string;
  jumaSpecialNotice: string;
  ramadanTitle: string;
  saharlikLabel: string;
  iftorlikLabel: string;
  ramadanVerifiedNote: string;
  calendarTitle: string;
  azanReminderPrefix: string;
  quranTitle: string;
  quranSurahHeader: string;
  quranMeaningLabel: string;
  quranAyahCountLabel: string;
  quranRevelationLabel: string;
  quranPageLabel: string;
  quranFooterNote: string;
  tafsirTitle: string;
  khatmTitle: string;
  khatmNoPlanBody: string;
  khatmGoalDaysLabel: string;
  khatmDailyPagesLabel: string;
  khatmCompletedJuzLabel: string;
  khatmSetDaysPrompt: string;
  hadithTitle: string;
  hadithNarratorLabel: string;
  hadithSourceLabel: string;
  dhikrTitle: string;
  dhikrTasbehCounterLabel: string;
  tasbehTodayLabel: string;
  dhikrVirtueLabel: string;
  tasbehSetGoalPrompt: string;
  duaLibraryTitle: string;
  glossaryTitle: string;
  mediaLibraryTitle: string;
  mediaArticlesLabel: string;
  mediaNewsLabel: string;
  mediaAnnouncementsLabel: string;
  mediaAdhanLabel: string;
  mediaAudioLabel: string;
  mediaVideoLabel: string;
  mosqueInfoTitle: string;
  mosqueInfoBody: string;
  academyTitle: string;
  quizTitle: string;
  quizEmpty: string;
  quizFinishedTitle: string;
  leaderboardTitle: string;
  searchTitle: string;
  searchPrompt: string;
  searchNoResults: string;
  bookmarksTitle: string;
  bookmarksEmpty: string;
  bookmarkSavedToast: string;
  bookmarkRemovedToast: string;
  supportTitle: string;
  supportPrompt: string;
  supportWritePrompt: string;
  supportCreatedNotice: string;
  supportEmptyTickets: string;
  supportReplyHeader: string;
  profileTitle: string;
  profileUserLabel: string;
  profileIdLabel: string;
  profileLanguageLabel: string;
  profileJoinedLabel: string;
  profileInteractionsLabel: string;
  profileRoleLabel: string;
  aiTitle: string;
  aiPromptReady: string;
  aiDisabledNotice: string;
  aiMissingKeyNotice: string;
  aiBudgetExceededNotice: string;
  aiUserCapNotice: string;
  aiThinkingToast: string;
  aiExitedToast: string;
  aiClearHistoryToast: string;
  aiVoiceNotice: string;
  aiErrorNotice: string;
  adminTitle: string;
  adminAccessDenied: string;
  adminStatsUsers: string;
  adminStatsChannels: string;
  adminStatsPublications: string;
  adminStatsEmojis: string;
  adminChannelsTitle: string;
  adminEmojisTitle: string;
  channelsTitle: string;
  channelsBody: string;
  webAppTitle: string;
  webAppBody: string;
  rateLimitExceeded: string;
  maintenanceNotice: string;
  unknownCommand: string;
  genericError: string;
  // Bot 2.0: Registration, Profile Edit, Notifications, Daily Assistant, Qibla, Direct APK & HIFZ
  registerWelcomeIntro: string;
  registerAskFirstName: string;
  registerAskLastName: string;
  registerConfirmPrompt: string;
  registerInvalidName: string;
  registerCancelled: string;
  registerComplete: string;
  registerBtnConfirm: string;
  registerBtnRetry: string;
  registerBtnCancel: string;
  profileEditNameBtn: string;
  profileEditNameDone: string;
  profileRegisteredBadge: string;
  profileNotRegisteredBadge: string;
  profileNotifHistoryBtn: string;
  profileNotifHistoryTitle: string;
  profileNotifHistoryEmpty: string;
  dailyDigestTitle: string;
  dailyBtn: string;
  qiblaTitle: string;
  qiblaPromptLocation: string;
  qiblaCompassNotice: string;
  qiblaShareLocationBtn: string;
  prayerSettingsTitle: string;
  prayerSettingsBtn: string;
  adhanAudioTitle: string;
  adhanAudioBtn: string;
  quietHoursTitle: string;
  quietHoursBtn: string;
  androidSendDirectBtn: string;
  androidSendingToast: string;
  hifzMenuBtn: string;
  supportReplyUserBtn: string;
  replyButtons: {
    // Legacy 6 keys kept for full backward compatibility
    prayerTimes: string;
    quranCenter: string;
    aiAssistant: string;
    academyQuiz: string;
    support: string;
    menuMiniApp: string;
    // Complete 20-item Unified Ecosystem V4 Reply Keyboard
    home: string;
    ai: string;
    quran: string;
    hadiths: string;
    prayer: string;
    dhikrDua: string;
    articles: string;
    announcements: string;
    news: string;
    audioLibrary: string;
    videoLibrary: string;
    education: string;
    quizzes: string;
    androidApp: string;
    webApp: string;
    favorites: string;
    notifications: string;
    profile: string;
    contactAdmin: string;
    settings: string;
  };
  buttons: {
    prayerTimes: string;
    ramadanMode: string;
    religiousCalendar: string;
    mosqueInfo: string;
    quran: string;
    tafsirHilol: string;
    khatmPlanner: string;
    khatmStartPlan: string;
    khatmLogJuz: string;
    bookmarkToggle: string;
    myBookmarks: string;
    quranSearch: string;
    allSurahs: string;
    hadith: string;
    hadithAll: string;
    hadithBukhari: string;
    hadithMuslim: string;
    hadithNawawi: string;
    hadithSearch: string;
    dhikr: string;
    situationalDuas: string;
    glossary: string;
    tasbehSetGoal: string;
    academyLessons: string;
    academyMarkDone: string;
    dailyQuiz: string;
    leaderboard: string;
    mediaLibrary: string;
    globalSearch: string;
    supportCenter: string;
    supportImam: string;
    supportService: string;
    supportTech: string;
    supportMyTickets: string;
    aiAssistant: string;
    aiClearHistory: string;
    profile: string;
    adminPanel: string;
    language: string;
    settings: string;
    stopNotifications: string;
    channels: string;
    webApp: string;
    miniApp: string;
    masjidTv: string;
    help: string;
    backToMenu: string;
    refreshPrayer: string;
    nextItem: string;
    prevItem: string;
    surahList: string;
    tasbehPlus: string;
    tasbehReset: string;
    exitAiMode: string;
    togglePrayerAlerts: string;
    toggleDailyWisdom: string;
    toggleAnnouncements: string;
    changeLanguage: string;
    openChannelPrimary: string;
    openChannelSecondary: string;
    openWebApp: string;
    adminChannels: string;
    adminEmojis: string;
    adminDiagnostics: string;
    adminToggleAi: string;
    adminToggleMaintenance: string;
    adminVerifyEmojis: string;
    adminTestEmojiSend: string;
    adminCheckChannelPerms: string;
    adminPublishPrayerNow: string;
    adminToggleAutoPublish: string;
    adminBroadcasts: string;
    adminBroadcastNew: string;
    adminSupport: string;
    adminUsers: string;
    adminContent: string;
    adminAiControl: string;
    adminAiProbe: string;
    adminAiSwitchPrimary: string;
    adminAiToggleFallback: string;
    adminAiToggleVoice: string;
    adminAnalytics: string;
    androidApp: string;
    androidDownload: string;
    androidInstallGuide: string;
    androidCheckUpdates: string;
    androidReleaseHistory: string;
    audioLibrary: string;
    videoLibrary: string;
    hifzCenter: string;
    dailyAssistant: string;
    qiblaFinder: string;
    prayerAlertPrefs: string;
    adhanAudioPrefs: string;
    quietHoursPrefs: string;
    editProfileName: string;
    notifHistory: string;
    androidSendApkDirect: string;
    quranReadSurah: string;
    quranReciters: string;
    quranListenAudio: string;
  };
  prayerNames: {
    tahajjud: string;
    subh: string;
    bomdod: string;
    quyosh: string;
    peshin: string;
    asr: string;
    shom: string;
    xufton: string;
    juma: string;
  };
  commands: {
    start: string;
    menu: string;
    prayer: string;
    ramadan: string;
    calendar: string;
    quran: string;
    tafsir: string;
    khatm: string;
    hadith: string;
    dhikr: string;
    dua: string;
    glossary: string;
    academy: string;
    quiz: string;
    leaderboard: string;
    library: string;
    mosque: string;
    ask: string;
    support: string;
    search: string;
    bookmarks: string;
    profile: string;
    language: string;
    settings: string;
    stop: string;
    admin: string;
    help: string;
    hifz: string;
    daily: string;
    qibla: string;
    android: string;
  };
}

const UZ_LATN_DICT: TelegramLocaleDictionary = {
  languageName: TELEGRAM_LANGUAGE_NATIVE_NAMES['uz-Latn'],
  welcomeTitle: '{{emoji:brand.mosque}} ASAKA ZIYO — Rasmiy Telegram Super Platformasi',
  welcomeBody:
    'Assalomu alaykum! Andijon viloyati, Asaka tumani «MuhammadSolih Hoji» jomeʼ masjidi rasmiy ASAKA ZIYO platformasiga xush kelibsiz.\n\n' +
    '{{emoji:brand.star}} Asosiy imkoniyatlar:\n' +
    '• Rasmiy Asaka namoz vaqtlari, Iqomat, Juma va Ramazon taqvimi\n' +
    '• 114 sura, Tafsiri Hilol, Xatm rejalovchi va Sahih hadislar\n' +
    '• Zikr, Duolar, Tasbeh maqsadi, Akademiya va Islomiy Viktorina\n' +
    '• Ovozli va matnli AI Islomiy Yordamchi (Gemini) va Imomga murojaat',
  onboardingPrompt:
    '{{emoji:brand.mosque}} Xush kelibsiz! Qulay muloqot uchun rasmiy tillingizni tanlang (5 tildan biri):',
  mainMenuTitle: '{{emoji:brand.mosque}} ASAKA ZIYO — Asosiy Boshqaruv Menyusi',
  mainMenuPrompt: 'Kerakli boʻlimni tanlang yoki pastdagi tezkor tugmalardan foydalaning:',
  helpTitle: '{{emoji:nav.help}} Yordam va Barcha Komandalar',
  helpBody:
    'Asosiy komandalar:\n' +
    '• /start, /menu — Asosiy menyu va Mini App\n' +
    '• /prayer, /ramadan, /calendar — Namoz vaqtlari, Ramazon va Diniy taqvim\n' +
    '• /quran, /tafsir, /khatm — Qurʼon (114 sura), Tafsiri Hilol va Xatm\n' +
    '• /hadith, /dhikr, /dua, /glossary — Hadislar, Zikr-Tasbeh, Duolar, Lugʻat\n' +
    '• /academy, /quiz, /leaderboard — Akademiya, Viktorina va Reyting\n' +
    '• /library, /mosque, /search, /bookmarks — Kutubxona, Masjid, Qidiruv, Xatchoʻplar\n' +
    '• /ask <savol> — AI Yordamchi (matn, ovoz, rasm)\n' +
    '• /support — Imomga savol va Murojaat markazi\n' +
    '• /profile, /language, /settings, /stop — Profil, 5 til, Sozlamalar, Eslatmani toʻxtatish\n' +
    '• /admin — Super Admin Boshqaruv Markazi\n\n' +
    'Rasmiy kanallar: @Asaka_Ziyo va @muhiddinsahhofuz',
  languageTitle: '{{emoji:language.globe}} Tilni tanlang',
  languagePrompt: 'Platforma 5 ta rasmiy tilni qoʻllab-quvvatlaydi. Tanlovingiz avtomatik saqlanadi:',
  languageChangedToast: 'Til saqlandi',
  languageChangedMessage: '{{emoji:status.ok}} Til muvaffaqiyatli oʻzgartirildi: Oʻzbekcha (Lotin).',
  settingsTitle: '{{emoji:settings.gear}} Sozlamalar va Bildirishnomalar',
  settingsBody: 'Azon eslatmalari va kunlik xabarlarni quyidagi tugmalar orqali boshqaring:',
  settingsPrayerAlerts: 'Namoz va azon eslatmalari',
  settingsDailyWisdom: 'Kunlik oyat va hadislar',
  settingsAnnouncements: 'Masjid va Juma eʼlonlari',
  settingsCurrentLanguage: 'Joriy til',
  statusEnabled: 'Yoqilgan',
  statusDisabled: 'Oʻchirilgan',
  settingUpdatedToast: 'Sozlama yangilandi',
  stopOptOutMessage:
    '{{emoji:status.ok}} Barcha ommaviy xabarlar va avtomatik bildirishnomalar toʻxtatildi. Istagan vaqtda /settings orqali qayta yoqishingiz mumkin.',
  prayerTitle: '{{emoji:nav.prayer}} Asaka tumani — Rasmiy Namoz Vaqtlari',
  prayerLocationLine: 'Hudud',
  prayerDateLine: 'Sana',
  prayerHijriLine: 'Hijriy sana',
  prayerNextLabel: 'Keyingi namoz',
  prayerFooterNote: 'Manba: ASAKA ZIYO rasmiy masjid jadvali (Oʻzbekiston Musulmonlari Idorasi).',
  prayerUnavailable: 'Namoz jadvali hozircha mavjud emas. Birozdan soʻng qayta urinib koʻring.',
  iqamahLabel: 'Iqomat',
  jumaSpecialNotice: 'Bugun muborak Juma kuni! Juma namozi va Kahf surasini unutmang.',
  ramadanTitle: '{{emoji:brand.crescent}} Ramazon Taqvim — Saharlik va Iftorlik (Asaka)',
  saharlikLabel: 'Saharlik (Ogʻiz yopish)',
  iftorlikLabel: 'Iftorlik (Ogʻiz ochish)',
  ramadanVerifiedNote: 'Eslatma: Vaqtlar faqat Asaka rasmiy masjid jadvalidan olinadi.',
  calendarTitle: '{{emoji:calendar.date}} Hijriy va Diniy Muhim Kunlar Taqvimi',
  azanReminderPrefix: '{{emoji:brand.mosque}} Namoz vaqti kirdi',
  quranTitle: '{{emoji:nav.quran}} Qurʼoni Karim — Kunlik Oyat',
  quranSurahHeader: '{{emoji:brand.book}} Sura maʼlumoti',
  quranMeaningLabel: 'Maʼnosi',
  quranAyahCountLabel: 'Oyatlar soni',
  quranRevelationLabel: 'Nozil boʻlgan joyi',
  quranPageLabel: 'Mushaf sahifasi',
  quranFooterNote: 'Toʻliq qiroat va tafsir uchun ASAKA ZIYO Mini App / Web Appni oching.',
  tafsirTitle: '{{emoji:brand.book}} Tafsiri Hilol — Qisqa Sharh',
  khatmTitle: '{{emoji:brand.book}} Shaxsiy Xatmi Qurʼon Rejalovchisi',
  khatmNoPlanBody: 'Sizda hali Xatm rejasi yoʻq. Kunlik sahifa maqsadini belgilash uchun boshlang:',
  khatmGoalDaysLabel: 'Reja muddati (kun)',
  khatmDailyPagesLabel: 'Kunlik oʻqish maqsadi',
  khatmCompletedJuzLabel: 'Yakunlangan juzlar',
  khatmSetDaysPrompt: 'Xatmni necha kunda tugatmoqchisiz? (7 dan 365 gacha raqam yuboring, masalan: 30)',
  hadithTitle: '{{emoji:nav.hadith}} Sahih Hadislar',
  hadithNarratorLabel: 'Roviy',
  hadithSourceLabel: 'Manba',
  dhikrTitle: '{{emoji:nav.dhikr}} Zikrlar, Duolar va Tasbeh',
  dhikrTasbehCounterLabel: 'Tasbeh hisoblagichi',
  tasbehTodayLabel: 'Bugungi jami zikr',
  dhikrVirtueLabel: 'Fazilati',
  tasbehSetGoalPrompt: 'Yangi kunlik tasbeh maqsadini yuboring (masalan: 33, 99, 100 yoki 1000):',
  duaLibraryTitle: '{{emoji:content.dua}} Kundalik Vaziyat Duolari',
  glossaryTitle: '{{emoji:brand.book}} Qisqacha Islomiy Atamalar Lugʻati',
  mediaLibraryTitle: '{{emoji:brand.book}} ASAKA ZIYO Maʼrifiy Kutubxonasi',
  mediaArticlesLabel: 'Maqolalar',
  mediaNewsLabel: 'Masjid yangiliklari',
  mediaAnnouncementsLabel: 'Eʼlonlar',
  mediaAdhanLabel: 'Azon audio qiroatlari',
  mediaAudioLabel: 'Audio kutubxonasi',
  mediaVideoLabel: 'Video kutubxonasi',
  mosqueInfoTitle: '{{emoji:brand.mosque}} «MuhammadSolih Hoji» Jomeʼ Masjidi Haqida',
  mosqueInfoBody:
    'Besh vaqt jamoat namozlari, Juma maʼruzalari va maʼrifiy suhbatlar manzili.\nSavol va murojaatlar uchun: /support',
  academyTitle: '{{emoji:brand.book}} ASAKA ZIYO Islomiy Akademiya',
  quizTitle: '{{emoji:brand.star}} Kunlik Islomiy Viktorina',
  quizEmpty: 'Hozircha tasdiqlangan viktorina savollari topilmadi.',
  quizFinishedTitle: '{{emoji:status.ok}} Viktorina Yakunlandi!',
  leaderboardTitle: '{{emoji:brand.star}} ASAKA ZIYO Bilimdonlar Reytingi (Top 10)',
  searchTitle: '{{emoji:brand.book}} Global Qidiruv',
  searchPrompt: 'Qurʼon surasi, hadis, zikr, maqola yoki atama nomini yozib yuboring:',
  searchNoResults: 'Soʻrovingiz boʻyicha natija topilmadi. Boshqa kalit soʻz bilan urinib koʻring.',
  bookmarksTitle: '{{emoji:brand.star}} Saqlangan Xatchoʻplarim',
  bookmarksEmpty: 'Sizda hali saqlangan xatchoʻplar yoʻq. Oyat yoki hadis tagidagi «Saqlash» tugmasini bosing.',
  bookmarkSavedToast: 'Xatchoʻpga saqlandi',
  bookmarkRemovedToast: 'Xatchoʻpdan olib tashlandi',
  supportTitle: '{{emoji:admin.shield}} Murojaat va Imomga Savol Markazi',
  supportPrompt: 'Murojaat turini tanlang. Javoblar toʻgʻridan-toʻgʻri Telegram orqali yuboriladi:',
  supportWritePrompt: 'Savol yoki murojaatingizni batafsil yozib yuboring (rasm/hujjat/ovoz ham ilova qilishingiz mumkin):',
  supportCreatedNotice: '{{emoji:status.ok}} Murojaatingiz qabul qilindi! Masʼul xodim tez orada javob beradi.',
  supportEmptyTickets: 'Sizda hozircha yuborilgan murojaatlar mavjud emas.',
  supportReplyHeader: '{{emoji:admin.shield}} ASAKA ZIYO — Murojaatga Rasmiy Javob',
  profileTitle: '{{emoji:profile.user}} Shaxsiy Profil',
  profileUserLabel: 'Foydalanuvchi',
  profileIdLabel: 'Telegram ID',
  profileLanguageLabel: 'Tanlangan til',
  profileJoinedLabel: 'Roʻyxatdan oʻtgan',
  profileInteractionsLabel: 'Faollik soni',
  profileRoleLabel: 'Huquq darajasi',
  aiTitle: '{{emoji:nav.ai}} ASAKA ZIYO — AI Islomiy Yordamchi',
  aiPromptReady:
    '{{emoji:ai.spark}} AI suhbat rejimi faol!\n\nSavolingizni matn, ovozli xabar yoki rasm koʻrinishida yuboring (yoki /ask <savol>).\nChiqish uchun pastdagi tugmani bosing.',
  aiDisabledNotice:
    '{{emoji:status.warn}} AI Yordamchi hozircha administrator tomonidan oʻchirib qoʻyilgan. Admin paneldan yoqilgach ishlaydi.',
  aiMissingKeyNotice:
    '{{emoji:status.warn}} Serverda GEMINI_API_KEY sozlanmagan. AI javob berishi uchun server muhitida API kalit boʻlishi zarur.',
  aiBudgetExceededNotice:
    '{{emoji:status.warn}} Bugungi umumiy AI token limiti tugadi. Ertaga qayta urinib koʻring.',
  aiUserCapNotice:
    '{{emoji:status.warn}} Sizning bugungi AI soʻrovlar cheklovingiz tugadi. Ertaga davom etishingiz mumkin.',
  aiThinkingToast: 'Javob tayyorlanmoqda...',
  aiExitedToast: 'AI rejimidan chiqildi',
  aiClearHistoryToast: 'AI suhbat tarixi tozalandi',
  aiVoiceNotice: '{{emoji:quran_mp3}} Ovozli xabar qabul qilindi, tahlil qilinmoqda...',
  aiErrorNotice: '{{emoji:status.warn}} AI javob olishda xatolik yuz berdi.',
  adminTitle: '{{emoji:admin.shield}} ASAKA ZIYO — Super Admin Boshqaruv Markazi',
  adminAccessDenied: 'Ruxsat yoʻq: bu boʻlim faqat Telegram administratorlari uchun.',
  adminStatsUsers: 'Foydalanuvchilar',
  adminStatsChannels: 'Kanallar',
  adminStatsPublications: 'Nashrlar',
  adminStatsEmojis: 'Tasdiqlangan Premium Emoji',
  adminChannelsTitle: '{{emoji:channel.broadcast}} Kanallar Boshqaruvi va Avto-Nashr',
  adminEmojisTitle: '{{emoji:brand.star}} Telegram Premium Custom Emoji Boshqaruvi',
  channelsTitle: '{{emoji:nav.channels}} Rasmiy Telegram Kanallari',
  channelsBody:
    'ASAKA ZIYO rasmiy axborot va maʼrifat kanallari:\n\n' +
    '1. @Asaka_Ziyo — Asosiy masjid va maʼrifat kanali\n' +
    '2. @muhiddinsahhofuz — Ilmiy-maʼrifiy maqolalar va qiroatlar',
  webAppTitle: '{{emoji:nav.web}} ASAKA ZIYO Web va Mini App',
  webAppBody: 'Qurʼon tilovati, Smart Mosque Display va barcha xizmatlar bitta ilovada.',
  rateLimitExceeded: '{{emoji:status.warn}} Juda koʻp soʻrov yuborildi. Iltimos, bir necha soniya kuting.',
  maintenanceNotice: '{{emoji:status.lock}} Texnik yangilanish ishlari olib borilmoqda. Tez orada qaytamiz.',
  unknownCommand: '{{emoji:status.warn}} Nomaʼlum buyruq. Quyidagi menyudan foydalaning:',
  genericError: '{{emoji:status.warn}} Kutilmagan xatolik yuz berdi. Qayta urinib koʻring.',
  registerWelcomeIntro:
    '{{emoji:brand.mosque}} Assalomu alaykum! ASAKA ZIYO shaxsiy profilingizni yaratish uchun qisqa roʻyxatdan oʻtamiz.',
  registerAskFirstName:
    '{{emoji:profile.user}} 1/2-qadam: Iltimos, ismingizni yozib yuboring (masalan: Abdulloh):',
  registerAskLastName:
    '{{emoji:profile.user}} 2/2-qadam: Endi familiyangizni yozib yuboring (masalan: Karimov):',
  registerConfirmPrompt:
    '{{emoji:status.ok}} Maʼlumotlaringizni tekshiring:\n\n• Ism: {firstName}\n• Familiya: {lastName}\n\nTasdiqlaysizmi?',
  registerInvalidName:
    '{{emoji:status.warn}} Iltimos, toʻgʻri ism yoki familiya kiriting (2–40 ta harf, raqam va maxsus belgilar ishlatmang).',
  registerCancelled:
    '{{emoji:status.warn}} Roʻyxatdan oʻtish bekor qilindi. Istagan vaqtda /start yoki /profile orqali davom ettirishingiz mumkin.',
  registerComplete:
    '{{emoji:status.ok}} Xush kelibsiz, {fullName}! Shaxsiy profilingiz muvaffaqiyatli yaratildi va doimiy saqlandi.',
  registerBtnConfirm: '{{emoji:success}} Tasdiqlash',
  registerBtnRetry: '{{emoji:settings}} Qayta kiritish',
  registerBtnCancel: '{{emoji:error}} Bekor qilish',
  profileEditNameBtn: '{{emoji:settings}} Ism-familiyani tahrirlash',
  profileEditNameDone: '{{emoji:status.ok}} Ism va familiyangiz muvaffaqiyatli yangilandi: {fullName}.',
  profileRegisteredBadge: '{{emoji:success}} Tasdiqlangan profil',
  profileNotRegisteredBadge: '{{emoji:quran}} Roʻyxatdan oʻtish yakunlanmagan',
  profileNotifHistoryBtn: '{{emoji:notifications}} Bildirishnomalar tarixi',
  profileNotifHistoryTitle: '{{emoji:settings.bell_on}} Oxirgi bildirishnomalar tarixi',
  profileNotifHistoryEmpty: 'Hozircha sizga yuborilgan bildirishnomalar tarixi boʻsh.',
  dailyDigestTitle: '{{emoji:brand.star}} ASAKA ZIYO — Bugungi Aqlli Kunlik Xulosa',
  dailyBtn: '{{emoji:prayer}} Kunlik yordamchi',
  qiblaTitle: '{{emoji:brand.mosque}} Qibla Yoʻnalishi Aniqlagich',
  qiblaPromptLocation:
    'Aniq Qibla burchagini bilish uchun pastdagi tugma orqali GPS joylashuvingizni yuboring (Asaka uchun standart burchak: 241° Janubi-Gʻarb).',
  qiblaCompassNotice:
    '{{emoji:warning}} Eslatma: Telegram bot ichida telefonning jonli magnitometr kompasi ishlamaydi. Aniq burchak (daraja) GPS orqali hisoblanadi; jonli kompas uchun Web / Android ilovamizdan foydalaning.',
  qiblaShareLocationBtn: '{{emoji:prayer}} Joylashuvni yuborish (Qibla)',
  prayerSettingsTitle: '{{emoji:settings.bell_on}} Har bir namoz uchun alohida bildirishnoma',
  prayerSettingsBtn: '{{emoji:prayer}} Namoz eslatmalari (alohida)',
  adhanAudioTitle: '{{emoji:nav.prayer}} Azon audio tanlash (eslatma bilan)',
  adhanAudioBtn: '{{emoji:quran_mp3}} Azon audio tanlash',
  quietHoursTitle: '{{emoji:settings.gear}} Tinch soatlar (Asia/Tashkent)',
  quietHoursBtn: '{{emoji:brand}} Tinch soatlar',
  androidSendDirectBtn: '{{emoji:brand}} APK faylni shu yerda olish',
  androidSendingToast: 'APK fayl Telegram orqali yuborilmoqda...',
  hifzMenuBtn: '{{emoji:hifz}} HIFZ (Qurʼon yodlash)',
  supportReplyUserBtn: '{{emoji:support}} Javob yozish',
  replyButtons: {
 prayerTimes: 'Namoz vaqtlari',
 quranCenter: 'Qurʼon & Hadis',
 aiAssistant: 'AI Yordamchi',
 academyQuiz: 'Akademiya & Test',
 support: 'Murojaat / Imom',
 menuMiniApp: 'Menyu & Sozlama',
 home: 'Bosh sahifa',
 ai: 'ASAKA ZIYO AI',
 quran: 'Qur’on',
 hadiths: 'Hadislar',
 prayer: 'Namoz vaqtlari',
 dhikrDua: 'Zikrlar va duolar',
 articles: 'Maqolalar',
 announcements: 'E’lonlar',
 news: 'Yangiliklar',
 audioLibrary: 'Audio kutubxonasi',
 videoLibrary: 'Video kutubxonasi',
 education: 'Ta’lim markazi',
 quizzes: 'Viktorinalar',
 androidApp: 'Rasmiy Android ilova',
 webApp: 'Web App',
 favorites: 'Sevimlilar',
 notifications: 'Bildirishnomalar',
 profile: 'Shaxsiy kabinet',
 contactAdmin: 'Administrator bilan aloqa',
 settings: 'Sozlamalar',
  },
  buttons: {
    prayerTimes: 'Namoz vaqtlari',
    ramadanMode: 'Ramazon Taqvim',
    religiousCalendar: 'Diniy Taqvim',
    mosqueInfo: 'Masjid & Qibla',
    quran: 'Qurʼon',
    tafsirHilol: 'Tafsiri Hilol',
    khatmPlanner: 'Xatm Rejam',
    khatmStartPlan: 'Reja tuzish',
    khatmLogJuz: '+1 Juz oʻqidim',
    bookmarkToggle: 'Saqlash / Olib tashlash',
    myBookmarks: 'Xatchoʻplarim',
    quranSearch: 'Sura qidirish',
    allSurahs: '114 Sura roʻyxati',
    hadith: 'Hadislar',
    hadithAll: 'Barchasi',
    hadithBukhari: 'Buxoriy',
    hadithMuslim: 'Muslim',
    hadithNawawi: 'Navaviy',
    hadithSearch: 'Hadis qidirish',
    dhikr: 'Zikr va Duo',
    situationalDuas: 'Vaziyat Duolari',
    glossary: 'Atamalar lugʻati',
    tasbehSetGoal: 'Maqsadni sozlash',
    academyLessons: 'Islomiy Akademiya',
    academyMarkDone: 'Tugatildi / Bekor qilish',
    dailyQuiz: 'Viktorina',
    leaderboard: 'Reyting (Top 10)',
    mediaLibrary: 'Kutubxona & Azon',
    globalSearch: 'Global Qidiruv',
    supportCenter: 'Imom / Murojaat',
    supportImam: 'Imomga savol',
    supportService: 'Masjid xizmatlari',
    supportTech: 'Texnik yordam',
    supportMyTickets: 'Mening murojaatlarim',
    aiAssistant: 'AI Yordamchi',
    aiClearHistory: 'Tarixni tozalash',
    profile: 'Profil',
    adminPanel: 'Admin Panel',
    language: 'Til (5 til)',
    settings: 'Sozlamalar',
    stopNotifications: 'Barcha xabarlarni toʻxtatish',
    channels: 'Kanallar',
    webApp: 'ASAKA ZIYO Ilovasi',
    miniApp: 'Mini App ochish',
    masjidTv: 'Masjid TV Ekran',
    help: 'Yordam',
    backToMenu: 'Asosiy menyu',
    refreshPrayer: 'Yangilash',
    nextItem: 'Keyingi',
    prevItem: 'Oldingi',
    surahList: '114 Sura',
    tasbehPlus: 'Tasbeh +1',
    tasbehReset: 'Nollash',
    exitAiMode: 'AI rejimidan chiqish',
    togglePrayerAlerts: 'Azon eslatmalari',
    toggleDailyWisdom: 'Kunlik oyat/hadis',
    toggleAnnouncements: 'Eʼlonlar',
    changeLanguage: 'Tilni oʻzgartirish',
    openChannelPrimary: '@Asaka_Ziyo kanaliga kirish',
    openChannelSecondary: '@muhiddinsahhofuz kanaliga kirish',
    openWebApp: 'Ilovada ochish',
    adminChannels: 'Kanallar & Nashr',
    adminEmojis: 'Premium Emoji',
    adminDiagnostics: 'Diagnostika',
    adminToggleAi: 'AI Yordamchi',
    adminToggleMaintenance: 'Texnik rejim',
    adminVerifyEmojis: 'IDlarni API orqali tekshirish',
    adminTestEmojiSend: 'Test Emoji xabar yuborish',
    adminCheckChannelPerms: 'Bot huquqini tekshirish',
    adminPublishPrayerNow: 'Namoz jadvalini yuborish',
    adminToggleAutoPublish: 'Avto-nashr',
    adminBroadcasts: 'Broadcast',
    adminBroadcastNew: 'Yangi Broadcast',
    adminSupport: 'Murojaatlar',
    adminUsers: 'Foydalanuvchilar',
    adminContent: 'Content Studio',
    adminAiControl: 'AI Nazorati',
    adminAiProbe: 'Modelni jonli tekshirish',
    adminAiSwitchPrimary: 'Primary Modelni almashtirish',
    adminAiToggleFallback: 'Auto-Fallback',
    adminAiToggleVoice: 'Ovozli javob (TTS)',
    adminAnalytics: 'Analitika',
    androidApp: 'Rasmiy Android ilova',
    androidDownload: 'APK v4.0.0 yuklab olish',
    androidInstallGuide: 'Oʻrnatish qoʻllanmasi',
    androidCheckUpdates: 'Yangilanishni tekshirish',
    androidReleaseHistory: 'Versiyalar tarixi',
    audioLibrary: 'Audio kutubxonasi',
    videoLibrary: 'Video kutubxonasi',
 hifzCenter: 'HIFZ (Qurʼon yodlash)',
 dailyAssistant: 'Kunlik yordamchi',
 qiblaFinder: 'Qibla yoʻnalishi',
 prayerAlertPrefs: 'Namozlar boʻyicha sozlash',
 adhanAudioPrefs: 'Azon audio tanlash',
 quietHoursPrefs: 'Tinch soatlar',
 editProfileName: 'Ism-familiyani tahrirlash',
 notifHistory: 'Bildirishnomalar tarixi',
 androidSendApkDirect: 'APK faylni Telegramda olish',
 quranReadSurah: 'Oyatlarini oʻqish',
 quranReciters: 'Qorini tanlash',
 quranListenAudio: 'Audio tilovatni tinglash',
  },
  prayerNames: {
    tahajjud: 'Tahajjud',
    subh: 'Subh (Saharlik)',
    bomdod: 'Bomdod',
    quyosh: 'Quyosh',
    peshin: 'Peshin',
    asr: 'Asr',
    shom: 'Shom (Iftorlik)',
    xufton: 'Xufton',
    juma: 'Juma',
  },
  commands: {
    start: 'Asosiy menyuni ochish',
    menu: 'Asosiy boshqaruv menyusi',
    prayer: 'Asaka namoz vaqtlari',
    ramadan: 'Ramazon saharlik va iftorlik',
    calendar: 'Hijriy va diniy taqvim',
    quran: 'Qurʼoni Karim (114 sura)',
    tafsir: 'Tafsiri Hilol sharhlari',
    khatm: 'Shaxsiy Xatm rejalovchi',
    hadith: 'Sahih hadislar',
    dhikr: 'Zikr va interaktiv tasbeh',
    dua: 'Kundalik vaziyat duolari',
    glossary: 'Islomiy atamalar lugʻati',
    academy: 'Islomiy Akademiya darslari',
    quiz: 'Kunlik viktorina',
    leaderboard: 'Bilimdonlar reytingi',
    library: 'Maqolalar, yangilik va azonlar',
    mosque: 'Masjid maʼlumoti va Qibla',
    ask: 'AI Islomiy Yordamchiga savol',
    support: 'Imomga savol va murojaat',
    search: 'Global qidiruv',
    bookmarks: 'Saqlangan xatchoʻplar',
    profile: 'Shaxsiy profil',
    language: 'Tilni tanlash (5 til)',
    settings: 'Bildirishnomalar va sozlamalar',
    stop: 'Barcha xabarlarni toʻxtatish',
    admin: 'Super Admin boshqaruv markazi',
    help: 'Yordam va komandalar',
    hifz: 'Qurʼon yodlash va Murojaa (HIFZ)',
    daily: 'Bugungi aqlli kunlik xulosa',
    qibla: 'Qibla yoʻnalishi (GPS)',
    android: 'Rasmiy Android APK v4.0.0',
  },
};

const UZ_CYRL_DICT: TelegramLocaleDictionary = {
  languageName: TELEGRAM_LANGUAGE_NATIVE_NAMES['uz-Cyrl'],
  welcomeTitle: '{{emoji:brand.mosque}} ASAKA ZIYO — Расмий Telegram Супер Платформаси',
  welcomeBody:
    'Ассалому алайкум! Андижон вилояти, Асака тумани «МуҳаммадСолиҳ Ҳожи» жомеъ масжиди расмий ASAKA ZIYO платформасига хуш келибсиз.\n\n' +
    '{{emoji:brand.star}} Асосий имкониятлар:\n' +
    '• Расмий Асака намоз вақтлари, Иқомат, Жума ва Рамазон тақвими\n' +
    '• 114 сура, Тафсири Ҳилол, Хатм режаловчи ва Саҳиҳ ҳадислар\n' +
    '• Зикр, Дуолар, Тасбеҳ мақсади, Академия ва Исломий Викторина\n' +
    '• Овозли ва матнли AI Исломий Ёрдамчи (Gemini) ва Имомга мурожаат',
  onboardingPrompt:
    '{{emoji:brand.mosque}} Хуш келибсиз! Қулай мулоқот учун расмий тилингизни танланг (5 тилдан бири):',
  mainMenuTitle: '{{emoji:brand.mosque}} ASAKA ZIYO — Асосий Меню',
  mainMenuPrompt: 'Керакли бўлимни танланг ёки пастдаги тезкор тугмалардан фойдаланинг:',
  helpTitle: '{{emoji:nav.help}} Ёрдам ва Барча Командалар',
  helpBody:
    'Асосий командалар:\n' +
    '• /start, /menu — Асосий меню ва Mini App\n' +
    '• /prayer, /ramadan, /calendar — Намоз вақтлари, Рамазон ва Диний тақвим\n' +
    '• /quran, /tafsir, /khatm — Қуръон (114 сура), Тафсири Ҳилол ва Хатм\n' +
    '• /hadith, /dhikr, /dua, /glossary — Ҳадислар, Зикр-Тасбеҳ, Дуолар, Луғат\n' +
    '• /academy, /quiz, /leaderboard — Академия, Викторина ва Рейтинг\n' +
    '• /library, /mosque, /search, /bookmarks — Кутубхона, Масжид, Қидирув, Хатчўплар\n' +
    '• /ask <савол> — AI Ёрдамчи (матн, овоз, расм)\n' +
    '• /support — Имомга савол ва Мурожаат маркази\n' +
    '• /profile, /language, /settings, /stop — Профил, 5 тил, Созламалар\n' +
    '• /admin — Супер Админ Бошқарув Маркази\n\n' +
    'Расмий каналлар: @Asaka_Ziyo ва @muhiddinsahhofuz',
  languageTitle: '{{emoji:language.globe}} Тилни танланг',
  languagePrompt: 'Платформа 5 та расмий тилни қўллаб-қувватлайди. Танловингиз автоматик сақланади:',
  languageChangedToast: 'Тил сақланди',
  languageChangedMessage: '{{emoji:status.ok}} Тил муваффақиятли ўзгартирилди: Ўзбекча (Кирилл).',
  settingsTitle: '{{emoji:settings.gear}} Созламалар ва Билдиришномалар',
  settingsBody: 'Азон эслатмалари ва кунлик хабарларни қуйидаги тугмалар орқали бошқаринг:',
  settingsPrayerAlerts: 'Намоз ва азон эслатмалари',
  settingsDailyWisdom: 'Кунлик оят ва ҳадислар',
  settingsAnnouncements: 'Масжид ва Жума эълонлари',
  settingsCurrentLanguage: 'Жорий тил',
  statusEnabled: 'Ёқилган',
  statusDisabled: 'Ўчирилган',
  settingUpdatedToast: 'Созлама янгиланди',
  stopOptOutMessage:
    '{{emoji:status.ok}} Барча оммавий хабарлар ва автоматик билдиришномалар тўхтатилди. Истаган вақтда /settings орқали қайта ёқишингиз мумкин.',
  prayerTitle: '{{emoji:nav.prayer}} Асака тумани — Расмий Намоз Вақтлари',
  prayerLocationLine: 'Ҳудуд',
  prayerDateLine: 'Сана',
  prayerHijriLine: 'Ҳижрий сана',
  prayerNextLabel: 'Кейинги намоз',
  prayerFooterNote: 'Манба: ASAKA ZIYO расмий масжид жадвали (Ўзбекистон Мусулмонлари Идораси).',
  prayerUnavailable: 'Намоз жадвали ҳозирча мавжуд эмас. Бироздан сўнг қайта уриниб кўринг.',
  iqamahLabel: 'Иқомат',
  jumaSpecialNotice: 'Бугун муборак Жума куни! Жума намози ва Каҳф сурасини унутманг.',
  ramadanTitle: '{{emoji:brand.crescent}} Рамазон Тақвими — Саҳарлик ва Ифторлик (Асака)',
  saharlikLabel: 'Саҳарлик (Оғиз ёпиш)',
  iftorlikLabel: 'Ифторлик (Оғиз очиш)',
  ramadanVerifiedNote: 'Эслатма: Вақтлар фақат Асака расмий масжид жадвалидан олинади.',
  calendarTitle: '{{emoji:calendar.date}} Ҳижрий ва Диний Муҳим Кунлар Тақвими',
  azanReminderPrefix: '{{emoji:brand.mosque}} Намоз вақти кирди',
  quranTitle: '{{emoji:nav.quran}} Қуръони Карим — Кунлик Оят',
  quranSurahHeader: '{{emoji:brand.book}} Сура маълумоти',
  quranMeaningLabel: 'Маъноси',
  quranAyahCountLabel: 'Оятлар сони',
  quranRevelationLabel: 'Нозил бўлган жойи',
  quranPageLabel: 'Мусҳаф саҳифаси',
  quranFooterNote: 'Тўлиқ қироат ва тафсир учун ASAKA ZIYO Mini App / Web Appни очинг.',
  tafsirTitle: '{{emoji:brand.book}} Тафсири Ҳилол — Қисқа Шарҳ',
  khatmTitle: '{{emoji:brand.book}} Шахсий Хатми Қуръон Режаловчиси',
  khatmNoPlanBody: 'Сизда ҳали Хатм режаси йўқ. Кунлик саҳифа мақсадини белгилаш учун бошланг:',
  khatmGoalDaysLabel: 'Режа муддати (кун)',
  khatmDailyPagesLabel: 'Кунлик ўқиш мақсади',
  khatmCompletedJuzLabel: 'Якунланган жузлар',
  khatmSetDaysPrompt: 'Хатмни неча кунда тугатмоқчисиз? (7 дан 365 гача рақам юборинг, масалан: 30)',
  hadithTitle: '{{emoji:nav.hadith}} Саҳиҳ Ҳадислар',
  hadithNarratorLabel: 'Ровий',
  hadithSourceLabel: 'Манба',
  dhikrTitle: '{{emoji:nav.dhikr}} Зикрлар, Дуолар ва Тасбеҳ',
  dhikrTasbehCounterLabel: 'Тасбеҳ ҳисоблагичи',
  tasbehTodayLabel: 'Бугунги жами зикр',
  dhikrVirtueLabel: 'Фазилати',
  tasbehSetGoalPrompt: 'Янги кунлик тасбеҳ мақсадини юборинг (масалан: 33, 99, 100 ёки 1000):',
  duaLibraryTitle: '{{emoji:content.dua}} Кундалик Вазият Дуолари',
  glossaryTitle: '{{emoji:brand.book}} Қисқача Исломий Атамалар Луғати',
  mediaLibraryTitle: '{{emoji:brand.book}} ASAKA ZIYO Маърифий Кутубхонаси',
  mediaArticlesLabel: 'Мақолалар',
  mediaNewsLabel: 'Масжид янгиликлари',
  mediaAnnouncementsLabel: 'Эълонлар',
  mediaAdhanLabel: 'Азон аудио қироатлари',
  mediaAudioLabel: 'Аудио кутубхонаси',
  mediaVideoLabel: 'Видео кутубхонаси',
  mosqueInfoTitle: '{{emoji:brand.mosque}} «МуҳаммадСолиҳ Ҳожи» Жомеъ Масжиди Ҳақида',
  mosqueInfoBody:
    'Беш вақт жамоат намозлари, Жума маърузалари ва маърифий суҳбатлар манзили.\nСавол ва мурожаатлар учун: /support',
  academyTitle: '{{emoji:brand.book}} ASAKA ZIYO Исломий Академия',
  quizTitle: '{{emoji:brand.star}} Кунлик Исломий Викторина',
  quizEmpty: 'Ҳозирча тасдиқланган викторина саволлари топилмади.',
  quizFinishedTitle: '{{emoji:status.ok}} Викторина Якунланди!',
  leaderboardTitle: '{{emoji:brand.star}} ASAKA ZIYO Билимдонлар Рейтинги (Топ 10)',
  searchTitle: '{{emoji:brand.book}} Глобал Қидирув',
  searchPrompt: 'Қуръон сураси, ҳадис, зикр, мақола ёки атама номини ёзиб юборинг:',
  searchNoResults: 'Сўровингиз бўйича натижа топилмади. Бошқа калит сўз билан уриниб кўринг.',
  bookmarksTitle: '{{emoji:brand.star}} Сақланган Хатчўпларим',
  bookmarksEmpty: 'Сизда ҳали сақланган хатчўплар йўқ. Оят ёки ҳадис тагидаги «Сақлаш» тугмасини босинг.',
  bookmarkSavedToast: 'Хатчўпга сақланди',
  bookmarkRemovedToast: 'Хатчўпдан олиб ташланди',
  supportTitle: '{{emoji:admin.shield}} Мурожаат ва Имомга Савол Маркази',
  supportPrompt: 'Мурожаат турини танланг. Жавоблар тўғридан-тўғри Telegram орқали юборилади:',
  supportWritePrompt: 'Савол ёки мурожаатингизни батафсил ёзиб юборинг (расм/ҳужжат/овоз ҳам илова қилишингиз мумкин):',
  supportCreatedNotice: '{{emoji:status.ok}} Мурожаатингиз қабул қилинди! Масъул ходим тез орада жавоб беради.',
  supportEmptyTickets: 'Сизда ҳозирча юборилган мурожаатлар мавжуд эмас.',
  supportReplyHeader: '{{emoji:admin.shield}} ASAKA ZIYO — Мурожаатга Расмий Жавоб',
  profileTitle: '{{emoji:profile.user}} Шахсий Профил',
  profileUserLabel: 'Фойдаланувчи',
  profileIdLabel: 'Telegram ID',
  profileLanguageLabel: 'Танланган тил',
  profileJoinedLabel: 'Рўйхатдан ўтган',
  profileInteractionsLabel: 'Фаоллик сони',
  profileRoleLabel: 'Ҳуқуқ даражаси',
  aiTitle: '{{emoji:nav.ai}} ASAKA ZIYO — AI Исломий Ёрдамчи',
  aiPromptReady:
    '{{emoji:ai.spark}} AI суҳбат режими фаол!\n\nСаволингизни матн, овозли хабар ёки расм кўринишида юборинг (ёки /ask <савол>). Чиқиш учун пастдаги тугмани босинг.',
  aiDisabledNotice:
    '{{emoji:status.warn}} AI Ёрдамчи ҳозирча администратор томонидан ўчириб қўйилган.',
  aiMissingKeyNotice:
    '{{emoji:status.warn}} Серверда GEMINI_API_KEY созланмаган. AI ишлаши учун сервер муҳитида API калит зарур.',
  aiBudgetExceededNotice:
    '{{emoji:status.warn}} Бугунги умумий AI токен лимити тугади. Эртага қайта уриниб кўринг.',
  aiUserCapNotice:
    '{{emoji:status.warn}} Сизнинг бугунги AI сўровлар чекловингиз тугади. Эртага давом этишингиз мумкин.',
  aiThinkingToast: 'Жавоб тайёрланмоқда...',
  aiExitedToast: 'AI режимидан чиқилди',
  aiClearHistoryToast: 'AI суҳбат тарихи тозаланди',
  aiVoiceNotice: '{{emoji:quran_mp3}} Овозли хабар қабул қилинди, таҳлил қилинмоқда...',
  aiErrorNotice: '{{emoji:status.warn}} AI жавоб олишда хатолик юз берди.',
  adminTitle: '{{emoji:admin.shield}} ASAKA ZIYO — Супер Админ Бошқарув Маркази',
  adminAccessDenied: 'Рухсат йўқ: бу бўлим фақат Telegram администраторлари учун.',
  adminStatsUsers: 'Фойдаланувчилар',
  adminStatsChannels: 'Каналлар',
  adminStatsPublications: 'Нашрлар',
  adminStatsEmojis: 'Тасдиқланган Premium Emoji',
  adminChannelsTitle: '{{emoji:channel.broadcast}} Каналлар Бошқаруви ва Авто-Нашр',
  adminEmojisTitle: '{{emoji:brand.star}} Telegram Premium Custom Emoji Бошқаруви',
  channelsTitle: '{{emoji:nav.channels}} Расмий Telegram Каналлари',
  channelsBody:
    'ASAKA ZIYO расмий ахборот ва маърифат каналлари:\n\n' +
    '1. @Asaka_Ziyo — Асосий масжид ва маърифат канали\n' +
    '2. @muhiddinsahhofuz — Илмий-маърифий мақолалар ва қироатлар',
  webAppTitle: '{{emoji:nav.web}} ASAKA ZIYO Web ва Mini App',
  webAppBody: 'Қуръон тиловати, Smart Mosque Display ва барча хизматлар битта иловада.',
  rateLimitExceeded: '{{emoji:status.warn}} Жуда кўп сўров юборилди. Илтимос, бир неча сония кутинг.',
  maintenanceNotice: '{{emoji:status.lock}} Техник янгиланиш ишлари олиб борилмоқда.',
  unknownCommand: '{{emoji:status.warn}} Номаълум буйруқ. Қуйидаги менюдан фойдаланинг:',
  genericError: '{{emoji:status.warn}} Кутилмаган хатолик юз берди. Қайта уриниб кўринг.',
  registerWelcomeIntro:
    '{{emoji:brand.mosque}} Ассалому алайкум! ASAKA ZIYO шахсий профилингизни яратиш учун қисқа рўйхатдан ўтамиз.',
  registerAskFirstName:
    '{{emoji:profile.user}} 1/2-қадам: Илтимос, исмингизни ёзиб юборинг (масалан: Абдуллоҳ):',
  registerAskLastName:
    '{{emoji:profile.user}} 2/2-қадам: Энди фамилиянгизни ёзиб юборинг (масалан: Каримов):',
  registerConfirmPrompt:
    '{{emoji:status.ok}} Маълумотларингизни текширинг:\n\n• Исм: {firstName}\n• Фамилия: {lastName}\n\nТасдиқлайсизми?',
  registerInvalidName:
    '{{emoji:status.warn}} Илтимос, тўғри исм ёки фамилия киритинг (2–40 та ҳарф, рақам ва махсус белгилар ишлатманг).',
  registerCancelled:
    '{{emoji:status.warn}} Рўйхатдан ўтиш бекор қилинди. Истаган вақтда /start ёки /profile орқали давом эттиришингиз мумкин.',
  registerComplete:
    '{{emoji:status.ok}} Хуш келибсиз, {fullName}! Шахсий профилингиз муваффақиятли яратилди ва доимий сақланди.',
  registerBtnConfirm: '{{emoji:success}} Тасдиқлаш',
  registerBtnRetry: '{{emoji:settings}} Қайта киритиш',
  registerBtnCancel: '{{emoji:error}} Бекор қилиш',
  profileEditNameBtn: '{{emoji:settings}} Исм-фамилияни таҳрирлаш',
  profileEditNameDone: '{{emoji:status.ok}} Исм ва фамилиянгиз муваффақиятли янгиланди: {fullName}.',
  profileRegisteredBadge: '{{emoji:success}} Тасдиқланган профил',
  profileNotRegisteredBadge: '{{emoji:quran}} Рўйхатдан ўтиш якунланмаган',
  profileNotifHistoryBtn: '{{emoji:notifications}} Билдиришномалар тарихи',
  profileNotifHistoryTitle: '{{emoji:settings.bell_on}} Охирги билдиришномалар тарихи',
  profileNotifHistoryEmpty: 'Ҳозирча сизга юборилган билдиришномалар тарихи бўш.',
  dailyDigestTitle: '{{emoji:brand.star}} ASAKA ZIYO — Бугунги Ақлли Кунлик Хулоса',
  dailyBtn: '{{emoji:prayer}} Кунлик ёрдамчи',
  qiblaTitle: '{{emoji:brand.mosque}} Қибла Йўналиши Аниқлагич',
  qiblaPromptLocation:
    'Аниқ Қибла бурчагини билиш учун пастдаги тугма орқали GPS жойлашувингизни юборинг (Асака учун стандарт бурчак: 241° Жануби-Ғарб).',
  qiblaCompassNotice:
    '{{emoji:warning}} Эслатма: Telegram бот ичида телефоннинг жонли магнитометр компаси ишламайди. Аниқ бурчак (даража) GPS орқали ҳисобланади; жонли компас учун Web / Android иловамиздан фойдаланинг.',
  qiblaShareLocationBtn: '{{emoji:prayer}} Жойлашувни юбориш (Қибла)',
  prayerSettingsTitle: '{{emoji:settings.bell_on}} Ҳар бир намоз учун алоҳида билдиришнома',
  prayerSettingsBtn: '{{emoji:prayer}} Намоз эслатмалари (алоҳида)',
  adhanAudioTitle: '{{emoji:nav.prayer}} Азон аудио танлаш (эслатма билан)',
  adhanAudioBtn: '{{emoji:quran_mp3}} Азон аудио танлаш',
  quietHoursTitle: '{{emoji:settings.gear}} Тинч соатлар (Asia/Tashkent)',
  quietHoursBtn: '{{emoji:brand}} Тинч соатлар',
  androidSendDirectBtn: '{{emoji:brand}} APK файлни шу ерда олиш',
  androidSendingToast: 'APK файл Telegram орқали юборилмоқда...',
  hifzMenuBtn: '{{emoji:hifz}} ҲИФЗ (Қуръон ёдлаш)',
  supportReplyUserBtn: '{{emoji:support}} Жавоб ёзиш',
  replyButtons: {
 prayerTimes: 'Намоз вақтлари',
 quranCenter: 'Қуръон & Ҳадис',
 aiAssistant: 'AI Ёрдамчи',
 academyQuiz: 'Академия & Тест',
 support: 'Мурожаат / Имом',
 menuMiniApp: 'Меню & Созлама',
 home: 'Бош саҳифа',
 ai: 'ASAKA ZIYO AI',
 quran: 'Қуръон',
 hadiths: 'Ҳадислар',
 prayer: 'Намоз вақтлари',
 dhikrDua: 'Зикрлар ва дуолар',
 articles: 'Мақолалар',
 announcements: 'Эълонлар',
 news: 'Янгиликлар',
 audioLibrary: 'Аудио кутубхонаси',
 videoLibrary: 'Видео кутубхонаси',
 education: 'Таълим маркази',
 quizzes: 'Викториналар',
 androidApp: 'Расмий Android илова',
 webApp: 'Web App',
 favorites: 'Севимлилар',
 notifications: 'Билдиришномалар',
 profile: 'Шахсий кабинет',
 contactAdmin: 'Администратор билан алоқа',
 settings: 'Созламалар',
  },
  buttons: {
    prayerTimes: 'Намоз вақтлари',
    ramadanMode: 'Рамазон Тақвим',
    religiousCalendar: 'Диний Тақвим',
    mosqueInfo: 'Масжид & Қибла',
    quran: 'Қуръон',
    tafsirHilol: 'Тафсири Ҳилол',
    khatmPlanner: 'Хатм Режам',
    khatmStartPlan: 'Режа тузиш',
    khatmLogJuz: '+1 Жуз ўқидим',
    bookmarkToggle: 'Сақлаш / Олиб ташлаш',
    myBookmarks: 'Хатчўпларим',
    quranSearch: 'Сура қидириш',
    allSurahs: '114 Сура рўйхати',
    hadith: 'Ҳадислар',
    hadithAll: 'Барчаси',
    hadithBukhari: 'Бухорий',
    hadithMuslim: 'Муслим',
    hadithNawawi: 'Нававий',
    hadithSearch: 'Ҳадис қидириш',
    dhikr: 'Зикр ва Дуо',
    situationalDuas: 'Вазият Дуолари',
    glossary: 'Атамалар луғати',
    tasbehSetGoal: 'Мақсадни созлаш',
    academyLessons: 'Исломий Академия',
    academyMarkDone: 'Тугатилди / Бекор қилиш',
    dailyQuiz: 'Викторина',
    leaderboard: 'Рейтинг (Топ 10)',
    mediaLibrary: 'Кутубхона & Азон',
    globalSearch: 'Глобал Қидирув',
    supportCenter: 'Имом / Мурожаат',
    supportImam: 'Имомга савол',
    supportService: 'Масжид хизматлари',
    supportTech: 'Техник ёрдам',
    supportMyTickets: 'Менинг мурожаатларим',
    aiAssistant: 'AI Ёрдамчи',
    aiClearHistory: 'Тарихни тозалаш',
    profile: 'Профил',
    adminPanel: 'Админ Панел',
    language: 'Тил (5 тил)',
    settings: 'Созламалар',
    stopNotifications: 'Барча хабарларни тўхтатиш',
    channels: 'Каналлар',
    webApp: 'ASAKA ZIYO Иловаси',
    miniApp: 'Mini App очиш',
    masjidTv: 'Масжид ТВ Экран',
    help: 'Ёрдам',
    backToMenu: 'Асосий меню',
    refreshPrayer: 'Янгилаш',
    nextItem: 'Кейинги',
    prevItem: 'Олдинги',
    surahList: '114 Сура',
    tasbehPlus: 'Тасбеҳ +1',
    tasbehReset: 'Ноллаш',
    exitAiMode: 'AI режимидан чиқиш',
    togglePrayerAlerts: 'Азон эслатмалари',
    toggleDailyWisdom: 'Кунлик оят/ҳадис',
    toggleAnnouncements: 'Эълонлар',
    changeLanguage: 'Тилни ўзгартириш',
    openChannelPrimary: '@Asaka_Ziyo каналига кириш',
    openChannelSecondary: '@muhiddinsahhofuz каналига кириш',
    openWebApp: 'Иловада очиш',
    adminChannels: 'Каналлар & Нашр',
    adminEmojis: 'Premium Emoji',
    adminDiagnostics: 'Диагностика',
    adminToggleAi: 'AI Ёрдамчи',
    adminToggleMaintenance: 'Техник режим',
    adminVerifyEmojis: 'IDларни API орқали текшириш',
    adminTestEmojiSend: 'Тест Emoji хабар юбориш',
    adminCheckChannelPerms: 'Бот ҳуқуқини текшириш',
    adminPublishPrayerNow: 'Намоз жадвалини юбориш',
    adminToggleAutoPublish: 'Авто-нашр',
    adminBroadcasts: 'Broadcast',
    adminBroadcastNew: 'Янги Broadcast',
    adminSupport: 'Мурожаатлар',
    adminUsers: 'Фойдаланувчилар',
    adminContent: 'Content Studio',
    adminAiControl: 'AI Назорати',
    adminAiProbe: 'Моделни жонли текшириш',
    adminAiSwitchPrimary: 'Primary Моделни алмаштириш',
    adminAiToggleFallback: 'Auto-Fallback',
    adminAiToggleVoice: 'Овозли жавоб (TTS)',
    adminAnalytics: 'Аналитика',
    androidApp: 'Расмий Android илова',
    androidDownload: 'APK v4.0.0 юклаб олиш',
    androidInstallGuide: 'Ўрнатиш қўлланмаси',
    androidCheckUpdates: 'Янгиланишни текшириш',
    androidReleaseHistory: 'Версиялар тарихи',
    audioLibrary: 'Аудио кутубхонаси',
    videoLibrary: 'Видео кутубхонаси',
 hifzCenter: 'ҲИФЗ (Қуръон ёдлаш)',
 dailyAssistant: 'Кунлик ёрдамчи',
 qiblaFinder: 'Қибла йўналиши',
 prayerAlertPrefs: 'Намозлар бўйича созлаш',
 adhanAudioPrefs: 'Азон аудио танлаш',
 quietHoursPrefs: 'Тинч соатлар',
 editProfileName: 'Исм-фамилияни таҳрирлаш',
 notifHistory: 'Билдиришномалар тарихи',
 androidSendApkDirect: 'APK файлни Telegramда олиш',
 quranReadSurah: 'Оятларини ўқиш',
 quranReciters: 'Қорини танлаш',
 quranListenAudio: 'Аудио тиловатни тинглаш',
  },
  prayerNames: {
    tahajjud: 'Таҳажжуд',
    subh: 'Субҳ (Саҳарлик)',
    bomdod: 'Бомдод',
    quyosh: 'Қуёш',
    peshin: 'Пешин',
    asr: 'Аср',
    shom: 'Шом (Ифторлик)',
    xufton: 'Хуфтон',
    juma: 'Жума',
  },
  commands: {
    start: 'Асосий менюни очиш',
    menu: 'Асосий бошқарув менюси',
    prayer: 'Асака намоз вақтлари',
    ramadan: 'Рамазон саҳарлик ва ифторлик',
    calendar: 'Ҳижрий ва диний тақвим',
    quran: 'Қуръони Карим (114 сура)',
    tafsir: 'Тафсири Ҳилол шарҳлари',
    khatm: 'Шахсий Хатм режаловчи',
    hadith: 'Саҳиҳ ҳадислар',
    dhikr: 'Зикр ва интерактив тасбеҳ',
    dua: 'Кундалик вазият дуолари',
    glossary: 'Исломий атамалар луғати',
    academy: 'Исломий Академия дарслари',
    quiz: 'Кунлик викторина',
    leaderboard: 'Билимдонлар рейтинги',
    library: 'Мақолалар, янгилик ва азонлар',
    mosque: 'Масжид маълумоти ва Қибла',
    ask: 'AI Исломий Ёрдамчига савол',
    support: 'Имомга савол ва мурожаат',
    search: 'Глобал қидирув',
    bookmarks: 'Сақланган хатчўплар',
    profile: 'Шахсий профил',
    language: 'Тилни танлаш (5 тил)',
    settings: 'Билдиришномалар ва созламалар',
    stop: 'Барча хабарларни тўхтатиш',
    admin: 'Супер Админ бошқарув маркази',
    help: 'Ёрдам ва командалар',
    hifz: 'Қуръон ёдлаш ва Мурожаа (ҲИФЗ)',
    daily: 'Бугунги ақлли кунлик хулоса',
    qibla: 'Қибла йўналиши (GPS)',
    android: 'Расмий Android APK v4.0.0',
  },
};

const RU_DICT: TelegramLocaleDictionary = {
  languageName: TELEGRAM_LANGUAGE_NATIVE_NAMES.ru,
  welcomeTitle: '{{emoji:brand.mosque}} ASAKA ZIYO — Официальная Telegram Супер-Платформа',
  welcomeBody:
    'Ассаляму алейкум! Добро пожаловать на официальную платформу соборной мечети «МухаммадСолих Хожи» (Асака, Андижанская область).\n\n' +
    '{{emoji:brand.star}} Ключевые возможности:\n' +
    '• Официальное расписание намазов Асаки, Икамат, Джума и календарь Рамадана\n' +
    '• Все 114 сур Корана, Тафсир Хилал, планировщик Хатма и достоверные хадисы\n' +
    '• Зикры, дуа, тасбих с целями, Академия и Исламская викторина\n' +
    '• Голосовой и текстовый AI-помощник (Gemini) и обращения к имаму',
  onboardingPrompt:
    '{{emoji:brand.mosque}} Добро пожаловать! Выберите ваш язык общения (один из 5 официальных):',
  mainMenuTitle: '{{emoji:brand.mosque}} ASAKA ZIYO — Главное меню',
  mainMenuPrompt: 'Выберите раздел ниже или воспользуйтесь панелью быстрого доступа:',
  helpTitle: '{{emoji:nav.help}} Помощь и все команды',
  helpBody:
    'Основные команды:\n' +
    '• /start, /menu — Главное меню и Mini App\n' +
    '• /prayer, /ramadan, /calendar — Намаз, Рамадан и календарь\n' +
    '• /quran, /tafsir, /khatm — Коран (114 сур), Тафсир и Хатм\n' +
    '• /hadith, /dhikr, /dua, /glossary — Хадисы, Зикр, Дуа, Словарь\n' +
    '• /academy, /quiz, /leaderboard — Академия, Викторина и Рейтинг\n' +
    '• /library, /mosque, /search, /bookmarks — Библиотека, Мечеть, Поиск, Закладки\n' +
    '• /ask <вопрос> — AI-помощник (текст, голос, фото)\n' +
    '• /support — Вопрос имаму и поддержка\n' +
    '• /profile, /language, /settings, /stop — Профиль, Язык, Настройки\n' +
    '• /admin — Панель Супер-Администратора\n\n' +
    'Официальные каналы: @Asaka_Ziyo и @muhiddinsahhofuz',
  languageTitle: '{{emoji:language.globe}} Выбор языка',
  languagePrompt: 'Платформа поддерживает 5 официальных языков. Выбор сохраняется автоматически:',
  languageChangedToast: 'Язык сохранён',
  languageChangedMessage: '{{emoji:status.ok}} Язык успешно изменён: Русский.',
  settingsTitle: '{{emoji:settings.gear}} Настройки и уведомления',
  settingsBody: 'Управляйте напоминаниями об азане и ежедневными сообщениями:',
  settingsPrayerAlerts: 'Напоминания о намазе и азане',
  settingsDailyWisdom: 'Ежедневный аят и хадис',
  settingsAnnouncements: 'Объявления мечети и Джума',
  settingsCurrentLanguage: 'Текущий язык',
  statusEnabled: 'Включено',
  statusDisabled: 'Выключено',
  settingUpdatedToast: 'Настройка обновлена',
  stopOptOutMessage:
    '{{emoji:status.ok}} Все массовые рассылки и автоматические уведомления отключены. Вы можете включить их снова через /settings.',
  prayerTitle: '{{emoji:nav.prayer}} Асака — Официальное время намаза',
  prayerLocationLine: 'Регион',
  prayerDateLine: 'Дата',
  prayerHijriLine: 'Дата по Хиджре',
  prayerNextLabel: 'Следующий намаз',
  prayerFooterNote: 'Источник: официальное расписание мечети ASAKA ZIYO (УМУ).',
  prayerUnavailable: 'Расписание намаза временно недоступно. Попробуйте позже.',
  iqamahLabel: 'Икамат',
  jumaSpecialNotice: 'Сегодня благословенная пятница (Джума)! Не забудьте чтение суры Аль-Кахф и Джума-намаз.',
  ramadanTitle: '{{emoji:brand.crescent}} Календарь Рамадана — Сухур и Ифтар (Асака)',
  saharlikLabel: 'Сухур (Закрытие поста)',
  iftorlikLabel: 'Ифтар (Разговение)',
  ramadanVerifiedNote: 'Примечание: время берётся исключительно из официального расписания мечети Асаки.',
  calendarTitle: '{{emoji:calendar.date}} Исламский календарь и памятные даты',
  azanReminderPrefix: '{{emoji:brand.mosque}} Наступило время намаза',
  quranTitle: '{{emoji:nav.quran}} Священный Коран — Аят дня',
  quranSurahHeader: '{{emoji:brand.book}} Информация о суре',
  quranMeaningLabel: 'Значение',
  quranAyahCountLabel: 'Количество аятов',
  quranRevelationLabel: 'Место ниспослания',
  quranPageLabel: 'Страница мусхафа',
  quranFooterNote: 'Откройте ASAKA ZIYO Mini App / Web App для полного чтения и тафсира.',
  tafsirTitle: '{{emoji:brand.book}} Тафсир Хилал — Краткое толкование',
  khatmTitle: '{{emoji:brand.book}} Персональный трекер Хатма Корана',
  khatmNoPlanBody: 'У вас пока нет плана Хатма. Создайте план для ежедневного чтения:',
  khatmGoalDaysLabel: 'Срок плана (дней)',
  khatmDailyPagesLabel: 'Цель на день (стр.)',
  khatmCompletedJuzLabel: 'Завершённые джузы',
  khatmSetDaysPrompt: 'За сколько дней хотите завершить Хатм? (введите число от 7 до 365, например: 30)',
  hadithTitle: '{{emoji:nav.hadith}} Достоверные хадисы',
  hadithNarratorLabel: 'Передатчик',
  hadithSourceLabel: 'Источник',
  dhikrTitle: '{{emoji:nav.dhikr}} Зикры, Дуа и Тасбих',
  dhikrTasbehCounterLabel: 'Счётчик тасбиха',
  tasbehTodayLabel: 'Всего сегодня',
  dhikrVirtueLabel: 'Достоинство',
  tasbehSetGoalPrompt: 'Отправьте новую дневную цель тасбиха (например: 33, 99, 100 или 1000):',
  duaLibraryTitle: '{{emoji:content.dua}} Дуа для жизненных ситуаций',
  glossaryTitle: '{{emoji:brand.book}} Краткий словарь исламских терминов',
  mediaLibraryTitle: '{{emoji:brand.book}} Библиотека и медиатека ASAKA ZIYO',
  mediaArticlesLabel: 'Статьи',
  mediaNewsLabel: 'Новости мечети',
  mediaAnnouncementsLabel: 'Объявления',
  mediaAdhanLabel: 'Аудиозаписи азана',
  mediaAudioLabel: 'Аудиотека',
  mediaVideoLabel: 'Видеотека',
  mosqueInfoTitle: '{{emoji:brand.mosque}} О соборной мечети «МухаммадСолих Хожи»',
  mosqueInfoBody:
    'Пятикратные коллективные намазы, пятничные проповеди и просветительские встречи.\nДля вопросов имаму: /support',
  academyTitle: '{{emoji:brand.book}} Исламская Академия ASAKA ZIYO',
  quizTitle: '{{emoji:brand.star}} Ежедневная исламская викторина',
  quizEmpty: 'Подтверждённые вопросы викторины пока отсутствуют.',
  quizFinishedTitle: '{{emoji:status.ok}} Викторина завершена!',
  leaderboardTitle: '{{emoji:brand.star}} Рейтинг знатоков ASAKA ZIYO (Топ-10)',
  searchTitle: '{{emoji:brand.book}} Глобальный поиск',
  searchPrompt: 'Введите название суры, хадиса, зикра, статьи или термина:',
  searchNoResults: 'По вашему запросу ничего не найдено. Попробуйте другой запрос.',
  bookmarksTitle: '{{emoji:brand.star}} Мои закладки',
  bookmarksEmpty: 'У вас пока нет сохранённых закладок. Нажмите «Сохранить» под аятом или хадисом.',
  bookmarkSavedToast: 'Добавлено в закладки',
  bookmarkRemovedToast: 'Удалено из закладок',
  supportTitle: '{{emoji:admin.shield}} Центр обращений и вопросов имаму',
  supportPrompt: 'Выберите категорию обращения. Ответ придёт прямо сюда в Telegram:',
  supportWritePrompt: 'Подробно напишите ваш вопрос или обращение (можно прикрепить фото/документ/голос):',
  supportCreatedNotice: '{{emoji:status.ok}} Обращение принято! Ответственный сотрудник скоро ответит вам.',
  supportEmptyTickets: 'У вас пока нет отправленных обращений.',
  supportReplyHeader: '{{emoji:admin.shield}} ASAKA ZIYO — Официальный ответ на обращение',
  profileTitle: '{{emoji:profile.user}} Личный профиль',
  profileUserLabel: 'Пользователь',
  profileIdLabel: 'Telegram ID',
  profileLanguageLabel: 'Выбранный язык',
  profileJoinedLabel: 'Дата регистрации',
  profileInteractionsLabel: 'Активность',
  profileRoleLabel: 'Роль',
  aiTitle: '{{emoji:nav.ai}} ASAKA ZIYO — AI-помощник',
  aiPromptReady:
    '{{emoji:ai.spark}} Режим общения с AI активен!\n\nОтправьте ваш вопрос текстом, голосовым сообщением или изображением (или через /ask <вопрос>). Для выхода нажмите кнопку ниже.',
  aiDisabledNotice: '{{emoji:status.warn}} AI-помощник временно отключён администратором.',
  aiMissingKeyNotice: '{{emoji:status.warn}} На сервере не настроен GEMINI_API_KEY для работы AI.',
  aiBudgetExceededNotice: '{{emoji:status.warn}} Дневной общий лимит токенов AI исчерпан.',
  aiUserCapNotice: '{{emoji:status.warn}} Ваш дневной лимит обращений к AI исчерпан.',
  aiThinkingToast: 'Подготавливаю ответ...',
  aiExitedToast: 'Выход из режима AI',
  aiClearHistoryToast: 'История диалога с AI очищена',
  aiVoiceNotice: '{{emoji:quran_mp3}} Голосовое сообщение получено, обрабатываю...',
  aiErrorNotice: '{{emoji:status.warn}} Ошибка при обращении к AI.',
  adminTitle: '{{emoji:admin.shield}} ASAKA ZIYO — Супер-Админ панель',
  adminAccessDenied: 'Доступ запрещён: раздел только для администраторов Telegram.',
  adminStatsUsers: 'Пользователи',
  adminStatsChannels: 'Каналы',
  adminStatsPublications: 'Публикации',
  adminStatsEmojis: 'Проверенные Premium Emoji',
  adminChannelsTitle: '{{emoji:channel.broadcast}} Управление каналами и автопубликация',
  adminEmojisTitle: '{{emoji:brand.star}} Управление Telegram Premium Custom Emoji',
  channelsTitle: '{{emoji:nav.channels}} Официальные каналы Telegram',
  channelsBody:
    'Официальные каналы ASAKA ZIYO:\n\n' +
    '1. @Asaka_Ziyo — Основной канал мечети\n' +
    '2. @muhiddinsahhofuz — Просветительские материалы и чтения',
  webAppTitle: '{{emoji:nav.web}} ASAKA ZIYO Web и Mini App',
  webAppBody: 'Чтение Корана, Smart Mosque Display и все сервисы в одном приложении.',
  rateLimitExceeded: '{{emoji:status.warn}} Слишком много запросов. Подождите несколько секунд.',
  maintenanceNotice: '{{emoji:status.lock}} Ведутся технические работы. Скоро вернёмся.',
  unknownCommand: '{{emoji:status.warn}} Неизвестная команда. Воспользуйтесь меню ниже:',
  genericError: '{{emoji:status.warn}} Произошла ошибка. Попробуйте снова.',
  registerWelcomeIntro:
    '{{emoji:brand.mosque}} Ассаляму алейкум! Пройдём короткую регистрацию, чтобы создать ваш личный профиль ASAKA ZIYO.',
  registerAskFirstName:
    '{{emoji:profile.user}} Шаг 1/2: Пожалуйста, введите ваше имя (например: Абдулла):',
  registerAskLastName:
    '{{emoji:profile.user}} Шаг 2/2: Теперь введите вашу фамилию (например: Каримов):',
  registerConfirmPrompt:
    '{{emoji:status.ok}} Проверьте ваши данные:\n\n• Имя: {firstName}\n• Фамилия: {lastName}\n\nПодтвердить?',
  registerInvalidName:
    '{{emoji:status.warn}} Пожалуйста, введите корректное имя или фамилию (2–40 букв, без цифр и спецсимволов).',
  registerCancelled:
    '{{emoji:status.warn}} Регистрация отменена. Вы можете завершить её в любое время через /start или /profile.',
  registerComplete:
    '{{emoji:status.ok}} Добро пожаловать, {fullName}! Ваш личный профиль создан и надёжно сохранён.',
  registerBtnConfirm: '{{emoji:success}} Подтвердить',
  registerBtnRetry: '{{emoji:settings}} Ввести заново',
  registerBtnCancel: '{{emoji:error}} Отмена',
  profileEditNameBtn: '{{emoji:settings}} Изменить имя и фамилию',
  profileEditNameDone: '{{emoji:status.ok}} Имя и фамилия успешно обновлены: {fullName}.',
  profileRegisteredBadge: '{{emoji:success}} Подтверждённый профиль',
  profileNotRegisteredBadge: '{{emoji:quran}} Регистрация не завершена',
  profileNotifHistoryBtn: '{{emoji:notifications}} История уведомлений',
  profileNotifHistoryTitle: '{{emoji:settings.bell_on}} Последние уведомления',
  profileNotifHistoryEmpty: 'История уведомлений пока пуста.',
  dailyDigestTitle: '{{emoji:brand.star}} ASAKA ZIYO — Умная сводка дня',
  dailyBtn: '{{emoji:prayer}} Сводка дня',
  qiblaTitle: '{{emoji:brand.mosque}} Определение направления Киблы',
  qiblaPromptLocation:
    'Отправьте вашу геопозицию GPS кнопкой ниже для точного расчёта азимута Киблы (для Асаки по умолчанию: 241° ЮЗ).',
  qiblaCompassNotice:
    '{{emoji:warning}} Примечание: в Telegram-боте нет доступа к живому магнитометру телефона. Точный угол в градусах вычисляется по GPS; для живого компаса откройте Web / Android приложение.',
  qiblaShareLocationBtn: '{{emoji:prayer}} Отправить геолокацию (Кибла)',
  prayerSettingsTitle: '{{emoji:settings.bell_on}} Уведомления по каждому намазу',
  prayerSettingsBtn: '{{emoji:prayer}} Настройка по намазам',
  adhanAudioTitle: '{{emoji:nav.prayer}} Выбор аудио азана',
  adhanAudioBtn: '{{emoji:quran_mp3}} Аудио азана',
  quietHoursTitle: '{{emoji:settings.gear}} Тихие часы (Asia/Tashkent)',
  quietHoursBtn: '{{emoji:brand}} Тихие часы',
  androidSendDirectBtn: '{{emoji:brand}} Получить APK прямо здесь',
  androidSendingToast: 'Отправляю APK-файл в Telegram...',
  hifzMenuBtn: '{{emoji:hifz}} ХИФЗ (Заучивание Корана)',
  supportReplyUserBtn: '{{emoji:support}} Написать ответ',
  replyButtons: {
 prayerTimes: 'Время намаза',
 quranCenter: 'Коран и Хадис',
 aiAssistant: 'AI-помощник',
 academyQuiz: 'Академия и Тест',
 support: 'Вопрос имаму',
 menuMiniApp: 'Меню и Настройки',
 home: 'Главная',
 ai: 'ASAKA ZIYO AI',
 quran: 'Коран',
 hadiths: 'Хадисы',
 prayer: 'Время намаза',
 dhikrDua: 'Зикры и дуа',
 articles: 'Статьи',
 announcements: 'Объявления',
 news: 'Новости',
 audioLibrary: 'Аудиотека',
 videoLibrary: 'Видеотека',
 education: 'Центр обучения',
 quizzes: 'Викторины',
 androidApp: 'Приложение Android',
 webApp: 'Web App',
 favorites: 'Избранное',
 notifications: 'Уведомления',
 profile: 'Личный кабинет',
 contactAdmin: 'Связь с админом',
 settings: 'Настройки',
  },
  buttons: {
    prayerTimes: 'Время намаза',
    ramadanMode: 'Рамадан',
    religiousCalendar: 'Календарь',
    mosqueInfo: 'Мечеть и Кибла',
    quran: 'Коран',
    tafsirHilol: 'Тафсир Хилал',
    khatmPlanner: 'План Хатма',
    khatmStartPlan: 'Задать план',
    khatmLogJuz: '+1 Джуз',
    bookmarkToggle: 'Сохранить / Убрать',
    myBookmarks: 'Закладки',
    quranSearch: 'Поиск суры',
    allSurahs: 'Все 114 сур',
    hadith: 'Хадисы',
    hadithAll: 'Все',
    hadithBukhari: 'Бухари',
    hadithMuslim: 'Муслим',
    hadithNawawi: 'Навави',
    hadithSearch: 'Поиск хадиса',
    dhikr: 'Зикр и Дуа',
    situationalDuas: 'Дуа на случаи',
    glossary: 'Словарь терминов',
    tasbehSetGoal: 'Задать цель',
    academyLessons: 'Академия',
    academyMarkDone: 'Завершено / Снять',
    dailyQuiz: 'Викторина',
    leaderboard: 'Рейтинг (Топ-10)',
    mediaLibrary: 'Библиотека и Азан',
    globalSearch: 'Глобальный поиск',
    supportCenter: 'Имам / Поддержка',
    supportImam: 'Вопрос имаму',
    supportService: 'Услуги мечети',
    supportTech: 'Техподдержка',
    supportMyTickets: 'Мои обращения',
    aiAssistant: 'AI-помощник',
    aiClearHistory: 'Очистить память',
    profile: 'Профиль',
    adminPanel: 'Админ-панель',
    language: 'Язык (5)',
    settings: 'Настройки',
    stopNotifications: 'Отключить рассылки',
    channels: 'Каналы',
    webApp: 'Приложение ASAKA ZIYO',
    miniApp: 'Открыть Mini App',
    masjidTv: 'Экран Мечети ТВ',
    help: 'Помощь',
    backToMenu: 'Главное меню',
    refreshPrayer: 'Обновить',
    nextItem: 'Далее',
    prevItem: 'Назад',
    surahList: '114 сур',
    tasbehPlus: 'Тасбих +1',
    tasbehReset: 'Сброс',
    exitAiMode: 'Выйти из режима AI',
    togglePrayerAlerts: 'Напоминания об азане',
    toggleDailyWisdom: 'Аят и хадис дня',
    toggleAnnouncements: 'Объявления',
    changeLanguage: 'Сменить язык',
    openChannelPrimary: 'Перейти в @Asaka_Ziyo',
    openChannelSecondary: 'Перейти в @muhiddinsahhofuz',
    openWebApp: 'Открыть в приложении',
    adminChannels: 'Каналы и публикации',
    adminEmojis: 'Premium Emoji',
    adminDiagnostics: 'Диагностика',
    adminToggleAi: 'AI-помощник',
    adminToggleMaintenance: 'Техрежим',
    adminVerifyEmojis: 'Проверить ID через API',
    adminTestEmojiSend: 'Отправить тест Emoji',
    adminCheckChannelPerms: 'Проверить права бота',
    adminPublishPrayerNow: 'Опубликовать расписание',
    adminToggleAutoPublish: 'Автопубликация',
    adminBroadcasts: 'Рассылки',
    adminBroadcastNew: 'Новая рассылка',
    adminSupport: 'Обращения',
    adminUsers: 'Пользователи',
    adminContent: 'Content Studio',
    adminAiControl: 'Контроль AI',
    adminAiProbe: 'Проверить модель',
    adminAiSwitchPrimary: 'Сменить модель',
    adminAiToggleFallback: 'Auto-Fallback',
    adminAiToggleVoice: 'Голос (TTS)',
    adminAnalytics: 'Аналитика',
    androidApp: 'Приложение Android',
    androidDownload: 'Скачать APK v4.0.0',
    androidInstallGuide: 'Инструкция установки',
    androidCheckUpdates: 'Проверить обновления',
    androidReleaseHistory: 'История версий',
    audioLibrary: 'Аудиотека',
    videoLibrary: 'Видеотека',
 hifzCenter: 'ХИФЗ (Заучивание Корана)',
 dailyAssistant: 'Сводка дня',
 qiblaFinder: 'Направление Киблы',
 prayerAlertPrefs: 'Настройка по намазам',
 adhanAudioPrefs: 'Аудио азана',
 quietHoursPrefs: 'Тихие часы',
 editProfileName: 'Изменить имя/фамилию',
 notifHistory: 'История уведомлений',
 androidSendApkDirect: 'Получить APK в Telegram',
 quranReadSurah: 'Читать аяты',
 quranReciters: 'Выбрать чтеца',
 quranListenAudio: 'Слушать чтение',
  },
  prayerNames: {
    tahajjud: 'Тахаджуд',
    subh: 'Субх (Сухур)',
    bomdod: 'Фаджр',
    quyosh: 'Восход',
    peshin: 'Зухр',
    asr: 'Аср',
    shom: 'Магриб (Ифтар)',
    xufton: 'Иша',
    juma: 'Джума',
  },
  commands: {
    start: 'Открыть главное меню',
    menu: 'Главное меню',
    prayer: 'Время намаза в Асаке',
    ramadan: 'Сухур и Ифтар (Рамадан)',
    calendar: 'Исламский календарь',
    quran: 'Коран (114 сур)',
    tafsir: 'Тафсир Хилал',
    khatm: 'Персональный план Хатма',
    hadith: 'Достоверные хадисы',
    dhikr: 'Зикры и тасбих',
    dua: 'Дуа на все случаи',
    glossary: 'Исламский словарь',
    academy: 'Уроки Исламской Академии',
    quiz: 'Исламская викторина',
    leaderboard: 'Рейтинг знатоков',
    library: 'Статьи, новости и азан',
    mosque: 'Мечеть и Кибла',
    ask: 'Задать вопрос AI-помощнику',
    support: 'Обратиться к имаму',
    search: 'Глобальный поиск',
    bookmarks: 'Мои закладки',
    profile: 'Личный профиль',
    language: 'Выбрать язык (5 языков)',
    settings: 'Уведомления и настройки',
    stop: 'Отключить все рассылки',
    admin: 'Панель администратора',
    help: 'Помощь и команды',
    hifz: 'Заучивание Корана и Мураджаа (ХИФЗ)',
    daily: 'Ежедневная умная сводка',
    qibla: 'Направление Киблы (GPS)',
    android: 'Официальный Android APK v4.0.0',
  },
};

const EN_DICT: TelegramLocaleDictionary = {
  languageName: TELEGRAM_LANGUAGE_NATIVE_NAMES.en,
  welcomeTitle: '{{emoji:brand.mosque}} ASAKA ZIYO — Official Telegram Super Platform',
  welcomeBody:
    'Assalamu Alaikum! Welcome to the official ASAKA ZIYO platform of MuhammadSolih Hoji Mosque (Asaka, Andijan).\n\n' +
    '{{emoji:brand.star}} Core Capabilities:\n' +
    '• Official Asaka prayer times, Iqamah, Juma & Ramadan Suhoor/Iftar schedule\n' +
    '• All 114 Quran Surahs, Tafsiri Hilol, Khatm planner & Authentic Hadiths\n' +
    '• Dhikr, Situational Duas, Tasbeh goals, Academy lessons & Islamic Quiz\n' +
    '• Text & Voice Islamic AI Assistant (Gemini) + 2-Way Imam Support Desk',
  onboardingPrompt:
    '{{emoji:brand.mosque}} Welcome! Please select your preferred language (5 official languages supported):',
  mainMenuTitle: '{{emoji:brand.mosque}} ASAKA ZIYO — Main Command Center',
  mainMenuPrompt: 'Choose a section below or use the quick-access keyboard:',
  helpTitle: '{{emoji:nav.help}} Help & All Commands',
  helpBody:
    'Available commands:\n' +
    '• /start, /menu — Main menu & Mini App\n' +
    '• /prayer, /ramadan, /calendar — Prayer times, Ramadan & Religious Calendar\n' +
    '• /quran, /tafsir, /khatm — Quran (114 Surahs), Tafsiri Hilol & Khatm\n' +
    '• /hadith, /dhikr, /dua, /glossary — Hadiths, Dhikr-Tasbeh, Duas, Glossary\n' +
    '• /academy, /quiz, /leaderboard — Academy, Quiz & Leaderboard\n' +
    '• /library, /mosque, /search, /bookmarks — Library, Mosque, Search, Bookmarks\n' +
    '• /ask <question> — AI Assistant (text, voice, image)\n' +
    '• /support — Imam Inquiry & Support Desk\n' +
    '• /profile, /language, /settings, /stop — Profile, 5 Languages, Settings, Opt-out\n' +
    '• /admin — Super Admin Control Center\n\n' +
    'Official channels: @Asaka_Ziyo & @muhiddinsahhofuz',
  languageTitle: '{{emoji:language.globe}} Choose Language',
  languagePrompt: 'The platform supports 5 official languages. Your preference is saved automatically:',
  languageChangedToast: 'Language saved',
  languageChangedMessage: '{{emoji:status.ok}} Language updated successfully: English.',
  settingsTitle: '{{emoji:settings.gear}} Settings & Notifications',
  settingsBody: 'Manage your Azan reminders and daily content alerts below:',
  settingsPrayerAlerts: 'Prayer & Azan reminders',
  settingsDailyWisdom: 'Daily Ayah & Hadith',
  settingsAnnouncements: 'Mosque & Juma announcements',
  settingsCurrentLanguage: 'Current language',
  statusEnabled: 'Enabled',
  statusDisabled: 'Disabled',
  settingUpdatedToast: 'Preference updated',
  stopOptOutMessage:
    '{{emoji:status.ok}} All broadcasts and automated notifications have been turned off. You can re-enable them anytime in /settings.',
  prayerTitle: '{{emoji:nav.prayer}} Asaka — Official Prayer Times',
  prayerLocationLine: 'Location',
  prayerDateLine: 'Date',
  prayerHijriLine: 'Hijri Date',
  prayerNextLabel: 'Next prayer',
  prayerFooterNote: 'Source: ASAKA ZIYO official mosque schedule (Muslim Board of Uzbekistan).',
  prayerUnavailable: 'Prayer schedule is temporarily unavailable. Please try again shortly.',
  iqamahLabel: 'Iqamah',
  jumaSpecialNotice: 'Blessed Friday (Jumuah)! Remember Surah Al-Kahf and Jumuah congregation.',
  ramadanTitle: '{{emoji:brand.crescent}} Ramadan Schedule — Suhoor & Iftar (Asaka)',
  saharlikLabel: 'Suhoor (Saharlik)',
  iftorlikLabel: 'Iftar (Iftorlik)',
  ramadanVerifiedNote: 'Note: Times come strictly from the verified Asaka mosque schedule.',
  calendarTitle: '{{emoji:calendar.date}} Hijri & Religious Calendar Milestones',
  azanReminderPrefix: '{{emoji:brand.mosque}} Prayer time has entered',
  quranTitle: '{{emoji:nav.quran}} Holy Quran — Daily Ayah',
  quranSurahHeader: '{{emoji:brand.book}} Surah Overview',
  quranMeaningLabel: 'Meaning',
  quranAyahCountLabel: 'Ayahs',
  quranRevelationLabel: 'Revelation',
  quranPageLabel: 'Mushaf Page',
  quranFooterNote: 'Open ASAKA ZIYO Mini App / Web App for full audio recitation and Tafsir.',
  tafsirTitle: '{{emoji:brand.book}} Tafsiri Hilol — Commentary',
  khatmTitle: '{{emoji:brand.book}} Personal Quran Khatm Planner',
  khatmNoPlanBody: 'You have not started a Khatm plan yet. Set your daily target below:',
  khatmGoalDaysLabel: 'Target Days',
  khatmDailyPagesLabel: 'Daily Pages Goal',
  khatmCompletedJuzLabel: 'Completed Juz',
  khatmSetDaysPrompt: 'In how many days would you like to complete Khatm? (Send a number 7–365, e.g. 30)',
  hadithTitle: '{{emoji:nav.hadith}} Authentic Hadiths',
  hadithNarratorLabel: 'Narrator',
  hadithSourceLabel: 'Source',
  dhikrTitle: '{{emoji:nav.dhikr}} Dhikr, Dua & Tasbeh',
  dhikrTasbehCounterLabel: 'Tasbeh counter',
  tasbehTodayLabel: 'Total today',
  dhikrVirtueLabel: 'Virtue',
  tasbehSetGoalPrompt: 'Send your new daily Tasbeh target number (e.g. 33, 99, 100 or 1000):',
  duaLibraryTitle: '{{emoji:content.dua}} Situational Duas',
  glossaryTitle: '{{emoji:brand.book}} Islamic Terms Glossary',
  mediaLibraryTitle: '{{emoji:brand.book}} ASAKA ZIYO Media Library',
  mediaArticlesLabel: 'Articles',
  mediaNewsLabel: 'Mosque News',
  mediaAnnouncementsLabel: 'Announcements',
  mediaAdhanLabel: 'Adhan Audio Tracks',
  mediaAudioLabel: 'Audio Library',
  mediaVideoLabel: 'Video Library',
  mosqueInfoTitle: '{{emoji:brand.mosque}} MuhammadSolih Hoji Jome Mosque',
  mosqueInfoBody:
    'Five daily congregational prayers, Jumuah sermons, and educational circles.\nQuestions or inquiries: /support',
  academyTitle: '{{emoji:brand.book}} ASAKA ZIYO Islamic Academy',
  quizTitle: '{{emoji:brand.star}} Daily Islamic Quiz',
  quizEmpty: 'No approved quiz questions are available right now.',
  quizFinishedTitle: '{{emoji:status.ok}} Quiz Completed!',
  leaderboardTitle: '{{emoji:brand.star}} ASAKA ZIYO Leaderboard (Top 10)',
  searchTitle: '{{emoji:brand.book}} Global Search',
  searchPrompt: 'Send a Surah name/number, Hadith keyword, Dhikr, Article, or Glossary term:',
  searchNoResults: 'No matching results found. Please try a different keyword.',
  bookmarksTitle: '{{emoji:brand.star}} My Saved Bookmarks',
  bookmarksEmpty: 'You have no saved bookmarks yet. Tap Save on any Ayah or Hadith.',
  bookmarkSavedToast: 'Saved to bookmarks',
  bookmarkRemovedToast: 'Removed from bookmarks',
  supportTitle: '{{emoji:admin.shield}} Imam Inquiry & Support Desk',
  supportPrompt: 'Choose a category below. Official replies are sent directly to your Telegram chat:',
  supportWritePrompt: 'Write your question or inquiry in detail (you can also attach a photo, document, or voice):',
  supportCreatedNotice: '{{emoji:status.ok}} Your ticket has been submitted! Our team will reply shortly.',
  supportEmptyTickets: 'You have not submitted any support tickets yet.',
  supportReplyHeader: '{{emoji:admin.shield}} ASAKA ZIYO — Official Support Reply',
  profileTitle: '{{emoji:profile.user}} User Profile',
  profileUserLabel: 'User',
  profileIdLabel: 'Telegram ID',
  profileLanguageLabel: 'Language',
  profileJoinedLabel: 'Joined',
  profileInteractionsLabel: 'Interactions',
  profileRoleLabel: 'Access Role',
  aiTitle: '{{emoji:nav.ai}} ASAKA ZIYO — Islamic AI Assistant',
  aiPromptReady:
    '{{emoji:ai.spark}} AI conversation mode is active!\n\nSend your question as text, voice message, or image (or use /ask <question>). Tap the button below to exit.',
  aiDisabledNotice: '{{emoji:status.warn}} AI Assistant is currently disabled by the administrator.',
  aiMissingKeyNotice: '{{emoji:status.warn}} GEMINI_API_KEY is not configured on the server.',
  aiBudgetExceededNotice: '{{emoji:status.warn}} Daily global AI token budget has been reached.',
  aiUserCapNotice: '{{emoji:status.warn}} Your daily AI request limit has been reached.',
  aiThinkingToast: 'Preparing answer...',
  aiExitedToast: 'Exited AI mode',
  aiClearHistoryToast: 'AI conversation memory cleared',
  aiVoiceNotice: '{{emoji:quran_mp3}} Voice message received, processing...',
  aiErrorNotice: '{{emoji:status.warn}} Error querying AI service.',
  adminTitle: '{{emoji:admin.shield}} ASAKA ZIYO — Super Admin Control Center',
  adminAccessDenied: 'Access denied: restricted to authorized Telegram administrators.',
  adminStatsUsers: 'Users',
  adminStatsChannels: 'Channels',
  adminStatsPublications: 'Publications',
  adminStatsEmojis: 'Verified Premium Emojis',
  adminChannelsTitle: '{{emoji:channel.broadcast}} Channel Management & Auto-Publishing',
  adminEmojisTitle: '{{emoji:brand.star}} Telegram Premium Custom Emoji Registry',
  channelsTitle: '{{emoji:nav.channels}} Official Telegram Channels',
  channelsBody:
    'Official ASAKA ZIYO channels:\n\n' +
    '1. @Asaka_Ziyo — Official Mosque & Knowledge Channel\n' +
    '2. @muhiddinsahhofuz — Educational Articles & Recitations',
  webAppTitle: '{{emoji:nav.web}} ASAKA ZIYO Web & Mini App',
  webAppBody: 'Quran audio, Smart Mosque Display, and all mosque services in one app.',
  rateLimitExceeded: '{{emoji:status.warn}} Too many requests. Please wait a few seconds.',
  maintenanceNotice: '{{emoji:status.lock}} Scheduled maintenance in progress. We will be right back.',
  unknownCommand: '{{emoji:status.warn}} Unknown command. Please use the menu below:',
  genericError: '{{emoji:status.warn}} An unexpected error occurred. Please try again.',
  registerWelcomeIntro:
    '{{emoji:brand.mosque}} Assalamu Alaikum! Let us complete a quick 2-step registration to set up your personal ASAKA ZIYO profile.',
  registerAskFirstName:
    '{{emoji:profile.user}} Step 1/2: Please type your first name (e.g., Abdullah):',
  registerAskLastName:
    '{{emoji:profile.user}} Step 2/2: Now please type your last name (e.g., Karimov):',
  registerConfirmPrompt:
    '{{emoji:status.ok}} Please confirm your details:\n\n• First Name: {firstName}\n• Last Name: {lastName}\n\nSave this profile?',
  registerInvalidName:
    '{{emoji:status.warn}} Please enter a valid name (2–40 letters, no digits or special symbols).',
  registerCancelled:
    '{{emoji:status.warn}} Registration cancelled. You can complete it anytime via /start or /profile.',
  registerComplete:
    '{{emoji:status.ok}} Welcome, {fullName}! Your personal profile has been created and saved.',
  registerBtnConfirm: '{{emoji:success}} Confirm',
  registerBtnRetry: '{{emoji:settings}} Re-enter',
  registerBtnCancel: '{{emoji:error}} Cancel',
  profileEditNameBtn: '{{emoji:settings}} Edit Name',
  profileEditNameDone: '{{emoji:status.ok}} Your name has been updated: {fullName}.',
  profileRegisteredBadge: '{{emoji:success}} Verified Profile',
  profileNotRegisteredBadge: '{{emoji:quran}} Registration Pending',
  profileNotifHistoryBtn: '{{emoji:notifications}} Notification History',
  profileNotifHistoryTitle: '{{emoji:settings.bell_on}} Recent Notification History',
  profileNotifHistoryEmpty: 'Your notification history is currently empty.',
  dailyDigestTitle: '{{emoji:brand.star}} ASAKA ZIYO — Daily Smart Briefing',
  dailyBtn: '{{emoji:prayer}} Daily Briefing',
  qiblaTitle: '{{emoji:brand.mosque}} Qibla Direction Finder',
  qiblaPromptLocation:
    'Tap the button below to share your GPS location for an exact Qibla bearing (default for Asaka: 241° WSW).',
  qiblaCompassNotice:
    '{{emoji:warning}} Note: Telegram bots do not have access to your phone magnetometer sensor. Exact Qibla degrees are calculated from GPS; use our Web / Android app for a live rotating compass.',
  qiblaShareLocationBtn: '{{emoji:prayer}} Share GPS Location (Qibla)',
  prayerSettingsTitle: '{{emoji:settings.bell_on}} Per-Prayer Alert Preferences',
  prayerSettingsBtn: '{{emoji:prayer}} Per-Prayer Alerts',
  adhanAudioTitle: '{{emoji:nav.prayer}} Select Adhan Audio Track',
  adhanAudioBtn: '{{emoji:quran_mp3}} Adhan Audio',
  quietHoursTitle: '{{emoji:settings.gear}} Quiet Hours (Asia/Tashkent)',
  quietHoursBtn: '{{emoji:brand}} Quiet Hours',
  androidSendDirectBtn: '{{emoji:brand}} Get APK Directly Here',
  androidSendingToast: 'Sending verified APK file in Telegram...',
  hifzMenuBtn: '{{emoji:hifz}} HIFZ (Quran Memorization)',
  supportReplyUserBtn: '{{emoji:support}} Send Follow-up Reply',
  replyButtons: {
 prayerTimes: 'Prayer Times',
 quranCenter: 'Quran & Hadith',
 aiAssistant: 'AI Assistant',
 academyQuiz: 'Academy & Quiz',
 support: 'Imam / Support',
 menuMiniApp: 'Menu & Settings',
 home: 'Home',
 ai: 'ASAKA ZIYO AI',
 quran: 'Quran',
 hadiths: 'Hadiths',
 prayer: 'Prayer Times',
 dhikrDua: 'Dhikr & Duas',
 articles: 'Articles',
 announcements: 'Announcements',
 news: 'News',
 audioLibrary: 'Audio Library',
 videoLibrary: 'Video Library',
 education: 'Education Center',
 quizzes: 'Quizzes',
 androidApp: 'Official Android App',
 webApp: 'Web App',
 favorites: 'Favorites',
 notifications: 'Notifications',
 profile: 'Personal Cabinet',
 contactAdmin: 'Contact Admin',
 settings: 'Settings',
  },
  buttons: {
    prayerTimes: 'Prayer Times',
    ramadanMode: 'Ramadan Times',
    religiousCalendar: 'Calendar',
    mosqueInfo: 'Mosque & Qibla',
    quran: 'Quran',
    tafsirHilol: 'Tafsiri Hilol',
    khatmPlanner: 'Khatm Plan',
    khatmStartPlan: 'Set Plan',
    khatmLogJuz: '+1 Juz Done',
    bookmarkToggle: 'Save / Remove',
    myBookmarks: 'Bookmarks',
    quranSearch: 'Search Surah',
    allSurahs: 'All 114 Surahs',
    hadith: 'Hadiths',
    hadithAll: 'All',
    hadithBukhari: 'Bukhari',
    hadithMuslim: 'Muslim',
    hadithNawawi: 'Nawawi',
    hadithSearch: 'Search Hadith',
    dhikr: 'Dhikr & Dua',
    situationalDuas: 'Situational Duas',
    glossary: 'Glossary',
    tasbehSetGoal: 'Set Goal',
    academyLessons: 'Islamic Academy',
    academyMarkDone: 'Toggle Completed',
    dailyQuiz: 'Daily Quiz',
    leaderboard: 'Leaderboard (Top 10)',
    mediaLibrary: 'Library & Adhan',
    globalSearch: 'Global Search',
    supportCenter: 'Imam / Support',
    supportImam: 'Ask an Imam',
    supportService: 'Mosque Services',
    supportTech: 'Technical Support',
    supportMyTickets: 'My Tickets',
    aiAssistant: 'AI Assistant',
    aiClearHistory: 'Clear Memory',
    profile: 'Profile',
    adminPanel: 'Admin Panel',
    language: 'Language (5)',
    settings: 'Settings',
    stopNotifications: 'Stop All Alerts',
    channels: 'Channels',
    webApp: 'ASAKA ZIYO App',
    miniApp: 'Open Mini App',
    masjidTv: 'Mosque TV Display',
    help: 'Help',
    backToMenu: 'Main Menu',
    refreshPrayer: 'Refresh',
    nextItem: 'Next',
    prevItem: 'Previous',
    surahList: '114 Surahs',
    tasbehPlus: 'Tasbeh +1',
    tasbehReset: 'Reset',
    exitAiMode: 'Exit AI Mode',
    togglePrayerAlerts: 'Azan Alerts',
    toggleDailyWisdom: 'Daily Ayah/Hadith',
    toggleAnnouncements: 'Announcements',
    changeLanguage: 'Change Language',
    openChannelPrimary: 'Open @Asaka_Ziyo',
    openChannelSecondary: 'Open @muhiddinsahhofuz',
    openWebApp: 'Open in App',
    adminChannels: 'Channels & Publish',
    adminEmojis: 'Premium Emojis',
    adminDiagnostics: 'Live Diagnostics',
    adminToggleAi: 'AI Assistant',
    adminToggleMaintenance: 'Maintenance',
    adminVerifyEmojis: 'Verify IDs via API',
    adminTestEmojiSend: 'Send Test Emoji Msg',
    adminCheckChannelPerms: 'Check Bot Rights',
    adminPublishPrayerNow: 'Publish Prayer Now',
    adminToggleAutoPublish: 'Auto-Publish',
    adminBroadcasts: 'Broadcasts',
    adminBroadcastNew: 'New Broadcast',
    adminSupport: 'Support Inbox',
    adminUsers: 'Users',
    adminContent: 'Content Studio',
    adminAiControl: 'AI Control',
    adminAiProbe: 'Probe Model Live',
    adminAiSwitchPrimary: 'Switch Primary Model',
    adminAiToggleFallback: 'Auto-Fallback',
    adminAiToggleVoice: 'Voice Reply (TTS)',
    adminAnalytics: 'Analytics',
    androidApp: 'Official Android App',
    androidDownload: 'Download APK v4.0.0',
    androidInstallGuide: 'Install Guide',
    androidCheckUpdates: 'Check Updates',
    androidReleaseHistory: 'Release History',
    audioLibrary: 'Audio Library',
    videoLibrary: 'Video Library',
 hifzCenter: 'HIFZ (Quran Memorization)',
 dailyAssistant: 'Daily Briefing',
 qiblaFinder: 'Qibla Direction',
 prayerAlertPrefs: 'Per-Prayer Alerts',
 adhanAudioPrefs: 'Adhan Audio',
 quietHoursPrefs: 'Quiet Hours',
 editProfileName: 'Edit Name',
 notifHistory: 'Notification History',
 androidSendApkDirect: 'Get APK Directly in Telegram',
 quranReadSurah: 'Read Ayahs',
 quranReciters: 'Choose Reciter',
 quranListenAudio: 'Listen Recitation',
  },
  prayerNames: {
    tahajjud: 'Tahajjud',
    subh: 'Subh (Suhoor)',
    bomdod: 'Fajr',
    quyosh: 'Sunrise',
    peshin: 'Dhuhr',
    asr: 'Asr',
    shom: 'Maghrib (Iftar)',
    xufton: 'Isha',
    juma: 'Juma',
  },
  commands: {
    start: 'Open main menu',
    menu: 'Main control center',
    prayer: 'Official Asaka prayer times',
    ramadan: 'Ramadan Suhoor & Iftar',
    calendar: 'Hijri & religious calendar',
    quran: 'Holy Quran (114 Surahs)',
    tafsir: 'Tafsiri Hilol commentary',
    khatm: 'Personal Khatm planner',
    hadith: 'Authentic Hadiths',
    dhikr: 'Dhikr & interactive Tasbeh',
    dua: 'Situational Duas',
    glossary: 'Islamic Terms Glossary',
    academy: 'Islamic Academy lessons',
    quiz: 'Daily Islamic Quiz',
    leaderboard: 'Top-10 Leaderboard',
    library: 'Articles, news & Adhan audio',
    mosque: 'Mosque info & Qibla',
    ask: 'Ask Islamic AI Assistant',
    support: 'Imam inquiry & support',
    search: 'Global search',
    bookmarks: 'My bookmarks',
    profile: 'User profile',
    language: 'Choose language (5 languages)',
    settings: 'Notifications & settings',
    stop: 'Stop all notifications',
    admin: 'Super Admin control center',
    help: 'Help & commands',
    hifz: 'Quran Memorization & Murojaa (HIFZ)',
    daily: 'Today smart Islamic briefing',
    qibla: 'Qibla direction (GPS)',
    android: 'Official Android APK v4.0.0',
  },
};

// Build uz-Latn-new automatically using the existing official ASAKA ZIYO transliterator
// while keeping {{emoji:...}} tokens, @handles, and /commands completely intact.
const UZ_LATN_NEW_RAW = transformResourceObject(UZ_LATN_DICT) as TelegramLocaleDictionary;
const UZ_LATN_NEW_DICT: TelegramLocaleDictionary = {
  ...UZ_LATN_NEW_RAW,
  languageName: TELEGRAM_LANGUAGE_NATIVE_NAMES['uz-Latn-new'],
  languageChangedMessage:
    '{{emoji:status.ok}} Til muvaffaqiyatli özgartirildi: Özbekça (Yangi Lotin).',
};

const LOCALE_BUNDLES: Record<TelegramLocale, TelegramLocaleDictionary> = {
  'uz-Latn': UZ_LATN_DICT,
  'uz-Cyrl': UZ_CYRL_DICT,
  'uz-Latn-new': UZ_LATN_NEW_DICT,
  ru: RU_DICT,
  en: EN_DICT,
};

export function isValidTelegramLocale(value: unknown): value is TelegramLocale {
  return (
    typeof value === 'string' &&
    (TELEGRAM_SUPPORTED_LOCALES as readonly string[]).includes(value)
  );
}

export function normalizeTelegramLocale(
  value: unknown,
  fallback: TelegramLocale = 'uz-Latn'
): TelegramLocale {
  if (isValidTelegramLocale(value)) return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower.startsWith('ru')) return 'ru';
    if (lower.startsWith('en')) return 'en';
    if (lower.startsWith('uz')) return 'uz-Latn';
  }
  return fallback;
}

export function getTelegramLocaleBundle(locale: TelegramLocale): TelegramLocaleDictionary {
  return LOCALE_BUNDLES[locale] || LOCALE_BUNDLES['uz-Latn'];
}
