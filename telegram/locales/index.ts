/**
 * ASAKA ZIYO — Telegram Platform Complete 5-Language Localization Engine
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
  prayerTitle: string;
  prayerLocationLine: string;
  prayerDateLine: string;
  prayerHijriLine: string;
  prayerNextLabel: string;
  prayerFooterNote: string;
  prayerUnavailable: string;
  azanReminderPrefix: string;
  quranTitle: string;
  quranSurahHeader: string;
  quranMeaningLabel: string;
  quranAyahCountLabel: string;
  quranRevelationLabel: string;
  quranPageLabel: string;
  quranFooterNote: string;
  hadithTitle: string;
  hadithNarratorLabel: string;
  hadithSourceLabel: string;
  dhikrTitle: string;
  dhikrTasbehCounterLabel: string;
  dhikrVirtueLabel: string;
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
  aiThinkingToast: string;
  aiExitedToast: string;
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
  buttons: {
    prayerTimes: string;
    quran: string;
    hadith: string;
    dhikr: string;
    aiAssistant: string;
    profile: string;
    adminPanel: string;
    language: string;
    settings: string;
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
    prayer: string;
    quran: string;
    hadith: string;
    dhikr: string;
    ask: string;
    profile: string;
    language: string;
    settings: string;
    admin: string;
    help: string;
  };
}

const UZ_LATN_DICT: TelegramLocaleDictionary = {
  languageName: TELEGRAM_LANGUAGE_NATIVE_NAMES['uz-Latn'],
  welcomeTitle: '{{emoji:brand.mosque}} ASAKA ZIYO — Rasmiy Telegram Platformasi',
  welcomeBody:
    'Assalomu alaykum! Andijon viloyati, Asaka tumani «MuhammadSolih Hoji» jomeʼ masjidi rasmiy ASAKA ZIYO platformasiga xush kelibsiz.\n\n' +
    '{{emoji:brand.star}} Bu yerda siz:\n' +
    '• Rasmiy Asaka namoz vaqtlari va azon eslatmalarini olasiz\n' +
    '• Qurʼoni Karim oyatlari, Sahih hadislar va Zikr-duolarni oʻqiysiz\n' +
    '• AI Islomiy Yordamchiga savol berasiz\n' +
    '• 5 ta tilda shaxsiy profil va bildirishnomalarni boshqarasiz',
  mainMenuTitle: '{{emoji:brand.mosque}} ASAKA ZIYO — Asosiy Menyu',
  mainMenuPrompt: 'Kerakli boʻlimni tanlang:',
  helpTitle: '{{emoji:nav.help}} Yordam va Komandalar',
  helpBody:
    'Asosiy komandalar:\n' +
    '• /start — Asosiy menyu\n' +
    '• /prayer — Bugungi namoz vaqtlari\n' +
    '• /quran — Qurʼoni Karim va kunlik oyat\n' +
    '• /hadith — Sahih hadislar\n' +
    '• /dhikr — Zikr, duo va tasbeh\n' +
    '• /ask <savol> — AI Islomiy Yordamchi\n' +
    '• /profile — Shaxsiy profil\n' +
    '• /language — 5 ta tildan birini tanlash\n' +
    '• /settings — Bildirishnomalar va sozlamalar\n' +
    '• /admin — Administrator paneli (faqat adminlar)\n' +
    '• /help — Yordam\n\n' +
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
  prayerTitle: '{{emoji:nav.prayer}} Asaka tumani — Rasmiy Namoz Vaqtlari',
  prayerLocationLine: 'Hudud',
  prayerDateLine: 'Sana',
  prayerHijriLine: 'Hijriy sana',
  prayerNextLabel: 'Keyingi namoz',
  prayerFooterNote: 'Manba: ASAKA ZIYO rasmiy masjid jadvali (Oʻzbekiston Musulmonlari Idorasi).',
  prayerUnavailable: 'Namoz jadvali hozircha mavjud emas. Birozdan soʻng qayta urinib koʻring.',
  azanReminderPrefix: '{{emoji:brand.mosque}} Namoz vaqti kirdi',
  quranTitle: '{{emoji:nav.quran}} Qurʼoni Karim — Kunlik Oyat',
  quranSurahHeader: '{{emoji:brand.book}} Sura maʼlumoti',
  quranMeaningLabel: 'Maʼnosi',
  quranAyahCountLabel: 'Oyatlar soni',
  quranRevelationLabel: 'Nozil boʻlgan joyi',
  quranPageLabel: 'Mushaf sahifasi',
  quranFooterNote: 'Toʻliq qiroat va tafsir uchun ASAKA ZIYO Mini App / Web Appni oching.',
  hadithTitle: '{{emoji:nav.hadith}} Sahih Hadislar',
  hadithNarratorLabel: 'Roviy',
  hadithSourceLabel: 'Manba',
  dhikrTitle: '{{emoji:nav.dhikr}} Zikrlar, Duolar va Tasbeh',
  dhikrTasbehCounterLabel: 'Tasbeh hisoblagichi',
  dhikrVirtueLabel: 'Fazilati',
  profileTitle: '{{emoji:profile.user}} Shaxsiy Profil',
  profileUserLabel: 'Foydalanuvchi',
  profileIdLabel: 'Telegram ID',
  profileLanguageLabel: 'Tanlangan til',
  profileJoinedLabel: 'Roʻyxatdan oʻtgan',
  profileInteractionsLabel: 'Faollik soni',
  profileRoleLabel: 'Huquq darajasi',
  aiTitle: '{{emoji:nav.ai}} ASAKA ZIYO — AI Islomiy Yordamchi',
  aiPromptReady:
    '{{emoji:ai.spark}} AI suhbat rejimi faol!\n\nSavolingizni oddiy xabar sifatida yozib yuboring (yoki /ask <savol> yozing). Namoz, roʻza, odob-axloq va maʼrifiy mavzularda javob berishga tayyorman.\n\nChiqish uchun pastdagi tugmani bosing.',
  aiDisabledNotice:
    '{{emoji:status.warn}} AI Yordamchi hozircha administrator tomonidan oʻchirib qoʻyilgan. Admin paneldan yoqilgach ishlaydi.',
  aiMissingKeyNotice:
    '{{emoji:status.warn}} Serverda GEMINI_API_KEY sozlanmagan. AI javob berishi uchun server muhitida API kalit boʻlishi zarur.',
  aiThinkingToast: 'Javob tayyorlanmoqda...',
  aiExitedToast: 'AI rejimidan chiqildi',
  aiErrorNotice: '{{emoji:status.warn}} AI javob olishda vaqtinchalik xatolik yuz berdi. Birozdan soʻng qayta urinib koʻring.',
  adminTitle: '{{emoji:admin.shield}} ASAKA ZIYO — Telegram Admin Paneli',
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
  buttons: {
    prayerTimes: 'Namoz vaqtlari',
    quran: 'Qurʼon',
    hadith: 'Hadislar',
    dhikr: 'Zikr va Duo',
    aiAssistant: 'AI Yordamchi',
    profile: 'Profil',
    adminPanel: 'Admin Panel',
    language: 'Til (5 til)',
    settings: 'Sozlamalar',
    channels: 'Kanallar',
    webApp: 'ASAKA ZIYO Ilovasi',
    miniApp: 'Mini App ochish',
    masjidTv: 'Masjid TV Ekran',
    help: 'Yordam',
    backToMenu: 'Asosiy menyu',
    refreshPrayer: 'Yangilash',
    nextItem: 'Keyingi',
    prevItem: 'Oldingi',
    surahList: 'Mashhur suralar',
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
    adminDiagnostics: 'Jonli Diagnostika',
    adminToggleAi: 'AI Yordamchi',
    adminToggleMaintenance: 'Texnik rejim',
    adminVerifyEmojis: 'IDlarni API orqali tekshirish',
    adminTestEmojiSend: 'Test Emoji xabar yuborish',
    adminCheckChannelPerms: 'Bot huquqini tekshirish',
    adminPublishPrayerNow: 'Namoz jadvalini yuborish',
    adminToggleAutoPublish: 'Avto-nashr',
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
    prayer: 'Asaka namoz vaqtlari',
    quran: 'Qurʼoni Karim va kunlik oyat',
    hadith: 'Sahih hadislar',
    dhikr: 'Zikr, duo va tasbeh',
    ask: 'AI Islomiy Yordamchiga savol berish',
    profile: 'Shaxsiy profil',
    language: 'Tilni tanlash (5 til)',
    settings: 'Bildirishnomalar va sozlamalar',
    admin: 'Admin boshqaruv paneli',
    help: 'Yordam va komandalar',
  },
};

const UZ_CYRL_DICT: TelegramLocaleDictionary = {
  languageName: TELEGRAM_LANGUAGE_NATIVE_NAMES['uz-Cyrl'],
  welcomeTitle: '{{emoji:brand.mosque}} ASAKA ZIYO — Расмий Telegram Платформаси',
  welcomeBody:
    'Ассалому алайкум! Андижон вилояти, Асака тумани «МуҳаммадСолиҳ Ҳожи» жомеъ масжиди расмий ASAKA ZIYO платформасига хуш келибсиз.\n\n' +
    '{{emoji:brand.star}} Бу ерда сиз:\n' +
    '• Расмий Асака намоз вақтлари ва азон эслатмаларини оласиз\n' +
    '• Қуръони Карим оятлари, Саҳиҳ ҳадислар ва Зикр-дуоларни ўқийсиз\n' +
    '• AI Исломий Ёрдамчига савол берасиз\n' +
    '• 5 та тилда шахсий профил ва билдиришномаларни бошқарасиз',
  mainMenuTitle: '{{emoji:brand.mosque}} ASAKA ZIYO — Асосий Меню',
  mainMenuPrompt: 'Керакли бўлимни танланг:',
  helpTitle: '{{emoji:nav.help}} Ёрдам ва Командалар',
  helpBody:
    'Асосий командалар:\n' +
    '• /start — Асосий меню\n' +
    '• /prayer — Бугунги намоз вақтлари\n' +
    '• /quran — Қуръони Карим ва кунлик оят\n' +
    '• /hadith — Саҳиҳ ҳадислар\n' +
    '• /dhikr — Зикр, дуо ва тасбеҳ\n' +
    '• /ask <савол> — AI Исломий Ёрдамчи\n' +
    '• /profile — Шахсий профил\n' +
    '• /language — 5 та тилдан бирини танлаш\n' +
    '• /settings — Билдиришномалар ва созламалар\n' +
    '• /admin — Администратор панели\n' +
    '• /help — Ёрдам\n\n' +
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
  prayerTitle: '{{emoji:nav.prayer}} Асака тумани — Расмий Намоз Вақтлари',
  prayerLocationLine: 'Ҳудуд',
  prayerDateLine: 'Сана',
  prayerHijriLine: 'Ҳижрий сана',
  prayerNextLabel: 'Кейинги намоз',
  prayerFooterNote: 'Манба: ASAKA ZIYO расмий масжид жадвали (Ўзбекистон Мусулмонлари Идораси).',
  prayerUnavailable: 'Намоз жадвали ҳозирча мавжуд эмас. Бироздан сўнг қайта уриниб кўринг.',
  azanReminderPrefix: '{{emoji:brand.mosque}} Намоз вақти кирди',
  quranTitle: '{{emoji:nav.quran}} Қуръони Карим — Кунлик Оят',
  quranSurahHeader: '{{emoji:brand.book}} Сура маълумоти',
  quranMeaningLabel: 'Маъноси',
  quranAyahCountLabel: 'Оятлар сони',
  quranRevelationLabel: 'Нозил бўлган жойи',
  quranPageLabel: 'Мусҳаф саҳифаси',
  quranFooterNote: 'Тўлиқ қироат ва тафсир учун ASAKA ZIYO Mini App / Web Appни очинг.',
  hadithTitle: '{{emoji:nav.hadith}} Саҳиҳ Ҳадислар',
  hadithNarratorLabel: 'Ровий',
  hadithSourceLabel: 'Манба',
  dhikrTitle: '{{emoji:nav.dhikr}} Зикрлар, Дуолар ва Тасбеҳ',
  dhikrTasbehCounterLabel: 'Тасбеҳ ҳисоблагичи',
  dhikrVirtueLabel: 'Фазилати',
  profileTitle: '{{emoji:profile.user}} Шахсий Профил',
  profileUserLabel: 'Фойдаланувчи',
  profileIdLabel: 'Telegram ID',
  profileLanguageLabel: 'Танланган тил',
  profileJoinedLabel: 'Рўйхатдан ўтган',
  profileInteractionsLabel: 'Фаоллик сони',
  profileRoleLabel: 'Ҳуқуқ даражаси',
  aiTitle: '{{emoji:nav.ai}} ASAKA ZIYO — AI Исломий Ёрдамчи',
  aiPromptReady:
    '{{emoji:ai.spark}} AI суҳбат режими фаол!\n\nСаволингизни оддий хабар сифатида ёзиб юборинг (ёки /ask <савол> ёзинг). Чиқиш учун пастдаги тугмани босинг.',
  aiDisabledNotice:
    '{{emoji:status.warn}} AI Ёрдамчи ҳозирча администратор томонидан ўчириб қўйилган.',
  aiMissingKeyNotice:
    '{{emoji:status.warn}} Серверда GEMINI_API_KEY созланмаган. AI ишлаши учун сервер муҳитида API калит зарур.',
  aiThinkingToast: 'Жавоб тайёрланмоқда...',
  aiExitedToast: 'AI режимидан чиқилди',
  aiErrorNotice: '{{emoji:status.warn}} AI жавоб олишда вақтинчалик хатолик юз берди.',
  adminTitle: '{{emoji:admin.shield}} ASAKA ZIYO — Telegram Админ Панели',
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
  buttons: {
    prayerTimes: 'Намоз вақтлари',
    quran: 'Қуръон',
    hadith: 'Ҳадислар',
    dhikr: 'Зикр ва Дуо',
    aiAssistant: 'AI Ёрдамчи',
    profile: 'Профил',
    adminPanel: 'Админ Панел',
    language: 'Тил (5 тил)',
    settings: 'Созламалар',
    channels: 'Каналлар',
    webApp: 'ASAKA ZIYO Иловаси',
    miniApp: 'Mini App очиш',
    masjidTv: 'Масжид ТВ Экран',
    help: 'Ёрдам',
    backToMenu: 'Асосий меню',
    refreshPrayer: 'Янгилаш',
    nextItem: 'Кейинги',
    prevItem: 'Олдинги',
    surahList: 'Машҳур суралар',
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
    adminDiagnostics: 'Жонли Диагностика',
    adminToggleAi: 'AI Ёрдамчи',
    adminToggleMaintenance: 'Техник режим',
    adminVerifyEmojis: 'IDларни API орқали текшириш',
    adminTestEmojiSend: 'Тест Emoji хабар юбориш',
    adminCheckChannelPerms: 'Бот ҳуқуқини текшириш',
    adminPublishPrayerNow: 'Намоз жадвалини юбориш',
    adminToggleAutoPublish: 'Авто-нашр',
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
    prayer: 'Асака намоз вақтлари',
    quran: 'Қуръони Карим ва кунлик оят',
    hadith: 'Саҳиҳ ҳадислар',
    dhikr: 'Зикр, дуо ва тасбеҳ',
    ask: 'AI Исломий Ёрдамчига савол бериш',
    profile: 'Шахсий профил',
    language: 'Тилни танлаш (5 тил)',
    settings: 'Билдиришномалар ва созламалар',
    admin: 'Админ бошқарув панели',
    help: 'Ёрдам ва командалар',
  },
};

const RU_DICT: TelegramLocaleDictionary = {
  languageName: TELEGRAM_LANGUAGE_NATIVE_NAMES.ru,
  welcomeTitle: '{{emoji:brand.mosque}} ASAKA ZIYO — Официальная Telegram Платформа',
  welcomeBody:
    'Ассаляму алейкум! Добро пожаловать на официальную платформу соборной мечети «МухаммадСолих Хожи» (Асака, Андижанская область).\n\n' +
    '{{emoji:brand.star}} Здесь доступны:\n' +
    '• Официальное расписание намазов Асаки и напоминания об азане\n' +
    '• Аяты Священного Корана, достоверные хадисы и зикры с тасбихом\n' +
    '• Исламский AI-помощник\n' +
    '• Профиль и уведомления на 5 языках',
  mainMenuTitle: '{{emoji:brand.mosque}} ASAKA ZIYO — Главное меню',
  mainMenuPrompt: 'Выберите нужный раздел:',
  helpTitle: '{{emoji:nav.help}} Помощь и команды',
  helpBody:
    'Основные команды:\n' +
    '• /start — Главное меню\n' +
    '• /prayer — Время намаза сегодня\n' +
    '• /quran — Коран и аят дня\n' +
    '• /hadith — Достоверные хадисы\n' +
    '• /dhikr — Зикры, дуа и тасбих\n' +
    '• /ask <вопрос> — AI-помощник\n' +
    '• /profile — Личный профиль\n' +
    '• /language — Выбор языка (5 языков)\n' +
    '• /settings — Уведомления и настройки\n' +
    '• /admin — Панель администратора\n' +
    '• /help — Помощь\n\n' +
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
  prayerTitle: '{{emoji:nav.prayer}} Асака — Официальное время намаза',
  prayerLocationLine: 'Регион',
  prayerDateLine: 'Дата',
  prayerHijriLine: 'Дата по Хиджре',
  prayerNextLabel: 'Следующий намаз',
  prayerFooterNote: 'Источник: официальное расписание мечети ASAKA ZIYO (УМУ).',
  prayerUnavailable: 'Расписание намаза временно недоступно. Попробуйте позже.',
  azanReminderPrefix: '{{emoji:brand.mosque}} Наступило время намаза',
  quranTitle: '{{emoji:nav.quran}} Священный Коран — Аят дня',
  quranSurahHeader: '{{emoji:brand.book}} Информация о суре',
  quranMeaningLabel: 'Значение',
  quranAyahCountLabel: 'Количество аятов',
  quranRevelationLabel: 'Место ниспослания',
  quranPageLabel: 'Страница мусхафа',
  quranFooterNote: 'Откройте ASAKA ZIYO Mini App / Web App для полного чтения и тафсира.',
  hadithTitle: '{{emoji:nav.hadith}} Достоверные хадисы',
  hadithNarratorLabel: 'Передатчик',
  hadithSourceLabel: 'Источник',
  dhikrTitle: '{{emoji:nav.dhikr}} Зикры, Дуа и Тасбих',
  dhikrTasbehCounterLabel: 'Счётчик тасбиха',
  dhikrVirtueLabel: 'Достоинство',
  profileTitle: '{{emoji:profile.user}} Личный профиль',
  profileUserLabel: 'Пользователь',
  profileIdLabel: 'Telegram ID',
  profileLanguageLabel: 'Выбранный язык',
  profileJoinedLabel: 'Дата регистрации',
  profileInteractionsLabel: 'Активность',
  profileRoleLabel: 'Роль',
  aiTitle: '{{emoji:nav.ai}} ASAKA ZIYO — AI-помощник',
  aiPromptReady:
    '{{emoji:ai.spark}} Режим общения с AI активен!\n\nНапишите ваш вопрос обычным сообщением (или через /ask <вопрос>). Для выхода нажмите кнопку ниже.',
  aiDisabledNotice: '{{emoji:status.warn}} AI-помощник временно отключён администратором.',
  aiMissingKeyNotice: '{{emoji:status.warn}} На сервере не настроен GEMINI_API_KEY для работы AI.',
  aiThinkingToast: 'Подготавливаю ответ...',
  aiExitedToast: 'Выход из режима AI',
  aiErrorNotice: '{{emoji:status.warn}} Временная ошибка при обращении к AI. Попробуйте позже.',
  adminTitle: '{{emoji:admin.shield}} ASAKA ZIYO — Админ-панель Telegram',
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
  buttons: {
    prayerTimes: 'Время намаза',
    quran: 'Коран',
    hadith: 'Хадисы',
    dhikr: 'Зикр и Дуа',
    aiAssistant: 'AI-помощник',
    profile: 'Профиль',
    adminPanel: 'Админ-панель',
    language: 'Язык (5)',
    settings: 'Настройки',
    channels: 'Каналы',
    webApp: 'Приложение ASAKA ZIYO',
    miniApp: 'Открыть Mini App',
    masjidTv: 'Экран Мечети ТВ',
    help: 'Помощь',
    backToMenu: 'Главное меню',
    refreshPrayer: 'Обновить',
    nextItem: 'Далее',
    prevItem: 'Назад',
    surahList: 'Избранные суры',
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
    prayer: 'Время намаза в Асаке',
    quran: 'Коран и аят дня',
    hadith: 'Достоверные хадисы',
    dhikr: 'Зикры, дуа и тасбих',
    ask: 'Задать вопрос AI-помощнику',
    profile: 'Личный профиль',
    language: 'Выбрать язык (5 языков)',
    settings: 'Уведомления и настройки',
    admin: 'Панель администратора',
    help: 'Помощь и команды',
  },
};

const EN_DICT: TelegramLocaleDictionary = {
  languageName: TELEGRAM_LANGUAGE_NATIVE_NAMES.en,
  welcomeTitle: '{{emoji:brand.mosque}} ASAKA ZIYO — Official Telegram Platform',
  welcomeBody:
    'Assalamu Alaikum! Welcome to the official ASAKA ZIYO platform of MuhammadSolih Hoji Mosque (Asaka, Andijan).\n\n' +
    '{{emoji:brand.star}} Here you can:\n' +
    '• Check official Asaka prayer times & receive Azan reminders\n' +
    '• Read Daily Quran Ayahs, Authentic Hadiths, and Dhikr with interactive Tasbeh\n' +
    '• Ask the Islamic AI Assistant\n' +
    '• Manage your profile and alerts in 5 official languages',
  mainMenuTitle: '{{emoji:brand.mosque}} ASAKA ZIYO — Main Menu',
  mainMenuPrompt: 'Select a section below:',
  helpTitle: '{{emoji:nav.help}} Help & Commands',
  helpBody:
    'Available commands:\n' +
    '• /start — Main menu\n' +
    '• /prayer — Today’s official prayer times\n' +
    '• /quran — Quran & Daily Ayah\n' +
    '• /hadith — Authentic Hadiths\n' +
    '• /dhikr — Dhikr, Dua & Tasbeh\n' +
    '• /ask <question> — Islamic AI Assistant\n' +
    '• /profile — User profile\n' +
    '• /language — Choose language (5 languages)\n' +
    '• /settings — Notifications & preferences\n' +
    '• /admin — Admin control panel\n' +
    '• /help — Help\n\n' +
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
  prayerTitle: '{{emoji:nav.prayer}} Asaka — Official Prayer Times',
  prayerLocationLine: 'Location',
  prayerDateLine: 'Date',
  prayerHijriLine: 'Hijri Date',
  prayerNextLabel: 'Next prayer',
  prayerFooterNote: 'Source: ASAKA ZIYO official mosque schedule (Muslim Board of Uzbekistan).',
  prayerUnavailable: 'Prayer schedule is temporarily unavailable. Please try again shortly.',
  azanReminderPrefix: '{{emoji:brand.mosque}} Prayer time has entered',
  quranTitle: '{{emoji:nav.quran}} Holy Quran — Daily Ayah',
  quranSurahHeader: '{{emoji:brand.book}} Surah Overview',
  quranMeaningLabel: 'Meaning',
  quranAyahCountLabel: 'Ayahs',
  quranRevelationLabel: 'Revelation',
  quranPageLabel: 'Mushaf Page',
  quranFooterNote: 'Open ASAKA ZIYO Mini App / Web App for full audio recitation and Tafsir.',
  hadithTitle: '{{emoji:nav.hadith}} Authentic Hadiths',
  hadithNarratorLabel: 'Narrator',
  hadithSourceLabel: 'Source',
  dhikrTitle: '{{emoji:nav.dhikr}} Dhikr, Dua & Tasbeh',
  dhikrTasbehCounterLabel: 'Tasbeh counter',
  dhikrVirtueLabel: 'Virtue',
  profileTitle: '{{emoji:profile.user}} User Profile',
  profileUserLabel: 'User',
  profileIdLabel: 'Telegram ID',
  profileLanguageLabel: 'Language',
  profileJoinedLabel: 'Joined',
  profileInteractionsLabel: 'Interactions',
  profileRoleLabel: 'Access Role',
  aiTitle: '{{emoji:nav.ai}} ASAKA ZIYO — Islamic AI Assistant',
  aiPromptReady:
    '{{emoji:ai.spark}} AI conversation mode is active!\n\nType your question as a normal message (or use /ask <question>). Tap the button below to exit.',
  aiDisabledNotice: '{{emoji:status.warn}} AI Assistant is currently disabled by the administrator.',
  aiMissingKeyNotice: '{{emoji:status.warn}} GEMINI_API_KEY is not configured on the server.',
  aiThinkingToast: 'Preparing answer...',
  aiExitedToast: 'Exited AI mode',
  aiErrorNotice: '{{emoji:status.warn}} Temporary error querying AI. Please try again later.',
  adminTitle: '{{emoji:admin.shield}} ASAKA ZIYO — Telegram Admin Panel',
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
  buttons: {
    prayerTimes: 'Prayer Times',
    quran: 'Quran',
    hadith: 'Hadiths',
    dhikr: 'Dhikr & Dua',
    aiAssistant: 'AI Assistant',
    profile: 'Profile',
    adminPanel: 'Admin Panel',
    language: 'Language (5)',
    settings: 'Settings',
    channels: 'Channels',
    webApp: 'ASAKA ZIYO App',
    miniApp: 'Open Mini App',
    masjidTv: 'Mosque TV Display',
    help: 'Help',
    backToMenu: 'Main Menu',
    refreshPrayer: 'Refresh',
    nextItem: 'Next',
    prevItem: 'Previous',
    surahList: 'Featured Surahs',
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
    prayer: 'Official Asaka prayer times',
    quran: 'Holy Quran & Daily Ayah',
    hadith: 'Authentic Hadiths',
    dhikr: 'Dhikr, Dua & Tasbeh',
    ask: 'Ask Islamic AI Assistant',
    profile: 'User profile',
    language: 'Choose language (5 languages)',
    settings: 'Notifications & settings',
    admin: 'Admin control panel',
    help: 'Help & commands',
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
