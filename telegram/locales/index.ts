/**
 * ASAKA ZIYO — Telegram Platform 5-Language Localization Engine
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
  prayerFooterNote: string;
  prayerUnavailable: string;
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
    language: string;
    settings: string;
    channels: string;
    webApp: string;
    help: string;
    backToMenu: string;
    refreshPrayer: string;
    openWebApp: string;
    openChannelPrimary: string;
    openChannelSecondary: string;
    togglePrayerAlerts: string;
    toggleDailyWisdom: string;
    toggleAnnouncements: string;
    changeLanguage: string;
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
    help: string;
    language: string;
    settings: string;
  };
}

const UZ_LATN: TelegramLocaleDictionary = {
  languageName: TELEGRAM_LANGUAGE_NATIVE_NAMES['uz-Latn'],
  welcomeTitle: '{{emoji:brand.mosque}} ASAKA ZIYO — Rasmiy Telegram Platformasi',
  welcomeBody:
    'Assalomu alaykum! Oʻzbekiston Musulmonlari Idorasi Andijon viloyati, Asaka tumani «MuhammadSolih Hoji» jomeʼ masjidi rasmiy raqamli platformasiga xush kelibsiz.\n\nQuyidagi asosiy menyu orqali Asaka namoz vaqtlari, til sozlamalari, bildirishnomalar va rasmiy kanallardan foydalanishingiz mumkin.',
  mainMenuTitle: '{{emoji:nav.home}} ASAKA ZIYO — Asosiy Menyu',
  mainMenuPrompt: 'Kerakli boʻlimni tanlang:',
  helpTitle: '{{emoji:nav.help}} Yordam va Buyruqlar',
  helpBody:
    'Mavjud bot buyruqlari:\n• /start — Asosiy menyu va boshlash\n• /language — 5 ta tildan birini tanlash\n• /settings — Bildirishnoma va til sozlamalari\n• /help — Yordam maʼlumotnomasi\n\nAsosiy veb va mobil ilova: https://asakaziyo.uz',
  languageTitle: '{{emoji:language.globe}} Tilni Tanlang',
  languagePrompt: 'Bot menyulari, tugmalari va bildirishnomalari uchun tilni tanlang:',
  languageChangedToast: 'Til yangilandi: Oʻzbekcha (Lotin)',
  languageChangedMessage: '{{emoji:status.ok}} Tanlangan til saqlandi: Oʻzbekcha (Lotin).',
  settingsTitle: '{{emoji:settings.gear}} Shaxsiy Sozlamalar',
  settingsBody: 'Quyidagi parametrlar sizning Telegram profilingizga alohida saqlanadi:',
  settingsPrayerAlerts: 'Namoz vaqtlari eslatmasi',
  settingsDailyWisdom: 'Kunlik oyat va hadis',
  settingsAnnouncements: 'Masjid eʼlonlari',
  settingsCurrentLanguage: 'Joriy til',
  statusEnabled: 'Yoqilgan',
  statusDisabled: 'Oʻchirilgan',
  settingUpdatedToast: 'Sozlama saqlandi',
  prayerTitle: '{{emoji:nav.prayer}} Asaka Namoz Vaqtlari',
  prayerLocationLine: 'Manzil',
  prayerDateLine: 'Sana',
  prayerHijriLine: 'Hijriy sana',
  prayerFooterNote: 'Vaqtlar «MuhammadSolih Hoji» jomeʼ masjidi rasmiy jadvalidan olinadi.',
  prayerUnavailable: 'Namoz vaqtlari jadvali hozircha yuklanmadi. Keyinroq qayta urinib koʻring.',
  channelsTitle: '{{emoji:nav.channels}} Rasmiy Telegram Kanallar',
  channelsBody:
    'Masjid va ilmiy-maʼrifiy loyihaning rasmiy Telegram kanallariga obuna boʻling:\n• @Asaka_Ziyo — Asosiy rasmiy kanal\n• @muhiddinsahhofuz — Ilmiy-maʼrifiy kanal',
  webAppTitle: '{{emoji:nav.web}} ASAKA ZIYO Web va Mobil Ilova',
  webAppBody:
    'Qurʼoni Karim, sahih hadislar, tasbeh va zikrlar, Asaka namoz vaqtlari va Smart Masjid Tablosi bitta yagona platformada.',
  rateLimitExceeded: '{{emoji:status.warn}} Juda koʻp soʻrov yuborildi. Iltimos, biroz kutib qayta urinib koʻring.',
  maintenanceNotice: '{{emoji:status.warn}} Telegram platformasida texnik xizmat koʻrsatilmoqda. Tez orada qayta ishga tushadi.',
  unknownCommand: 'Nomaʼlum buyruq. Asosiy menyu uchun /start yoki yordam uchun /help ni yuboring.',
  genericError: '{{emoji:status.warn}} Kutilmagan xatolik yuz berdi. Iltimos, qayta urinib koʻring.',
  buttons: {
    prayerTimes: 'Namoz vaqtlari',
    language: 'Tilni oʻzgartirish',
    settings: 'Sozlamalar',
    channels: 'Rasmiy kanallar',
    webApp: 'Web / Mobil ilova',
    help: 'Yordam',
    backToMenu: 'Asosiy menyu',
    refreshPrayer: 'Yangilash',
    openWebApp: 'ASAKA ZIYO ilovasini ochish',
    openChannelPrimary: '@Asaka_Ziyo kanali',
    openChannelSecondary: '@muhiddinsahhofuz kanali',
    togglePrayerAlerts: 'Namoz eslatmasi',
    toggleDailyWisdom: 'Kunlik hikmat',
    toggleAnnouncements: 'Masjid eʼlonlari',
    changeLanguage: 'Tilni oʻzgartirish',
  },
  prayerNames: {
    tahajjud: 'Tahajjud',
    subh: 'Subh',
    bomdod: 'Bomdod',
    quyosh: 'Quyosh',
    peshin: 'Peshin',
    asr: 'Asr',
    shom: 'Shom',
    xufton: 'Xufton',
    juma: 'Juma',
  },
  commands: {
    start: 'Asosiy menyu va boshlash',
    help: 'Yordam va buyruqlar',
    language: 'Tilni tanlash (5 ta til)',
    settings: 'Shaxsiy sozlamalar',
  },
};

const UZ_CYRL: TelegramLocaleDictionary = {
  languageName: TELEGRAM_LANGUAGE_NATIVE_NAMES['uz-Cyrl'],
  welcomeTitle: '{{emoji:brand.mosque}} ASAKA ZIYO — Расмий Telegram Платформаси',
  welcomeBody:
    'Ассалому алайкум! Ўзбекистон Мусулмонлари Идораси Андижон вилояти, Асака тумани «МуҳаммадСолиҳ Ҳожи» жомеъ масжиди расмий рақамли платформасига хуш келибсиз.\n\nҚуйидаги асосий меню орқали Асака намоз вақтлари, тил созламалари, билдиришномалар ва расмий каналлардан фойдаланишингиз мумкин.',
  mainMenuTitle: '{{emoji:nav.home}} ASAKA ZIYO — Асосий Меню',
  mainMenuPrompt: 'Керакли бўлимни танланг:',
  helpTitle: '{{emoji:nav.help}} Ёрдам ва Буйруқлар',
  helpBody:
    'Мавжуд бот буйруқлари:\n• /start — Асосий меню ва бошлаш\n• /language — 5 та тилдан бирини танлаш\n• /settings — Билдиришнома ва тил созламалари\n• /help — Ёрдам маълумотномаси\n\nАсосий веб ва мобил илова: https://asakaziyo.uz',
  languageTitle: '{{emoji:language.globe}} Тилни Танланг',
  languagePrompt: 'Бот менюлари, тугмалари ва билдиришномалари учун тилни танланг:',
  languageChangedToast: 'Тил янгиланди: Ўзбекча (Кирилл)',
  languageChangedMessage: '{{emoji:status.ok}} Танланган тил сақланди: Ўзбекча (Кирилл).',
  settingsTitle: '{{emoji:settings.gear}} Шахсий Созламалар',
  settingsBody: 'Қуйидаги параметрлар сизнинг Telegram профилингизга алоҳида сақланади:',
  settingsPrayerAlerts: 'Намоз вақтлари эслатмаси',
  settingsDailyWisdom: 'Кунлик оят ва ҳадис',
  settingsAnnouncements: 'Масжид эълонлари',
  settingsCurrentLanguage: 'Жорий тил',
  statusEnabled: 'Ёқилган',
  statusDisabled: 'Ўчирилган',
  settingUpdatedToast: 'Созлама сақланди',
  prayerTitle: '{{emoji:nav.prayer}} Асака Намоз Вақтлари',
  prayerLocationLine: 'Манзил',
  prayerDateLine: 'Сана',
  prayerHijriLine: 'Ҳижрий сана',
  prayerFooterNote: 'Вақтлар «МуҳаммадСолиҳ Ҳожи» жомеъ масжиди расмий жадвалидан олинади.',
  prayerUnavailable: 'Намоз вақтлари жадвали ҳозирча юкланмади. Кейинроқ қайта уриниб кўринг.',
  channelsTitle: '{{emoji:nav.channels}} Расмий Telegram Каналлар',
  channelsBody:
    'Масжид ва илмий-маърифий лойиҳанинг расмий Telegram каналларига обуна бўлинг:\n• @Asaka_Ziyo — Асосий расмий канал\n• @muhiddinsahhofuz — Илмий-маърифий канал',
  webAppTitle: '{{emoji:nav.web}} ASAKA ZIYO Веб ва Мобил Илова',
  webAppBody:
    'Қуръони Карим, саҳиҳ ҳадислар, тасбеҳ ва зикрлар, Асака намоз вақтлари ва Смарт Масжид Таблоси битта ягона платформада.',
  rateLimitExceeded: '{{emoji:status.warn}} Жуда кўп сўров юборилди. Илтимос, бироз кутиб қайта уриниб кўринг.',
  maintenanceNotice: '{{emoji:status.warn}} Telegram платформасида техник хизмат кўрсатилмоқда. Тез орада қайта ишга тушади.',
  unknownCommand: 'Номаълум буйруқ. Асосий меню учун /start ёки ёрдам учун /help ни юборинг.',
  genericError: '{{emoji:status.warn}} Кутилмаган хатолик юз берди. Илтимос, қайта уриниб кўринг.',
  buttons: {
    prayerTimes: 'Намоз вақтлари',
    language: 'Тилни ўзгартириш',
    settings: 'Созламалар',
    channels: 'Расмий каналлар',
    webApp: 'Веб / Мобил илова',
    help: 'Ёрдам',
    backToMenu: 'Асосий меню',
    refreshPrayer: 'Янгилаш',
    openWebApp: 'ASAKA ZIYO иловасини очиш',
    openChannelPrimary: '@Asaka_Ziyo канали',
    openChannelSecondary: '@muhiddinsahhofuz канали',
    togglePrayerAlerts: 'Намоз эслатмаси',
    toggleDailyWisdom: 'Кунлик ҳикмат',
    toggleAnnouncements: 'Масжид эълонлари',
    changeLanguage: 'Тилни ўзгартириш',
  },
  prayerNames: {
    tahajjud: 'Таҳажжуд',
    subh: 'Субҳ',
    bomdod: 'Бомдод',
    quyosh: 'Қуёш',
    peshin: 'Пешин',
    asr: 'Аср',
    shom: 'Шом',
    xufton: 'Хуфтон',
    juma: 'Жума',
  },
  commands: {
    start: 'Асосий меню ва бошлаш',
    help: 'Ёрдам ва буйруқлар',
    language: 'Тилни танлаш (5 та тил)',
    settings: 'Шахсий созламалар',
  },
};

const RU: TelegramLocaleDictionary = {
  languageName: TELEGRAM_LANGUAGE_NATIVE_NAMES.ru,
  welcomeTitle: '{{emoji:brand.mosque}} ASAKA ZIYO — Официальная Telegram-платформа',
  welcomeBody:
    'Ассаламу алейкум! Добро пожаловать на официальную цифровую платформу соборной мечети «МухаммадСолих Ходжи» (Асака, Андижанская область).\n\nИспользуйте главное меню ниже для просмотра расписания намаза в Асаке, выбора языка, настроек уведомлений и перехода к официальным каналам.',
  mainMenuTitle: '{{emoji:nav.home}} ASAKA ZIYO — Главное меню',
  mainMenuPrompt: 'Выберите нужный раздел:',
  helpTitle: '{{emoji:nav.help}} Помощь и команды',
  helpBody:
    'Доступные команды бота:\n• /start — Главное меню\n• /language — Выбор одного из 5 языков\n• /settings — Настройки уведомлений и языка\n• /help — Справка\n\nВеб и мобильное приложение: https://asakaziyo.uz',
  languageTitle: '{{emoji:language.globe}} Выберите язык',
  languagePrompt: 'Выберите язык меню, кнопок и уведомлений бота:',
  languageChangedToast: 'Язык обновлён: Русский',
  languageChangedMessage: '{{emoji:status.ok}} Язык интерфейса сохранён: Русский.',
  settingsTitle: '{{emoji:settings.gear}} Личные настройки',
  settingsBody: 'Эти параметры сохраняются отдельно для вашего Telegram-профиля:',
  settingsPrayerAlerts: 'Напоминания о времени намаза',
  settingsDailyWisdom: 'Ежедневный аят и хадис',
  settingsAnnouncements: 'Объявления мечети',
  settingsCurrentLanguage: 'Текущий язык',
  statusEnabled: 'Включено',
  statusDisabled: 'Выключено',
  settingUpdatedToast: 'Настройка сохранена',
  prayerTitle: '{{emoji:nav.prayer}} Время намаза в Асаке',
  prayerLocationLine: 'Локация',
  prayerDateLine: 'Дата',
  prayerHijriLine: 'Хиджра',
  prayerFooterNote: 'Расписание синхронизировано с официальным графиком мечети «МухаммадСолих Ходжи».',
  prayerUnavailable: 'Расписание намаза временно недоступно. Попробуйте чуть позже.',
  channelsTitle: '{{emoji:nav.channels}} Официальные Telegram-каналы',
  channelsBody:
    'Подпишитесь на официальные каналы проекта:\n• @Asaka_Ziyo — Основной официальный канал\n• @muhiddinsahhofuz — Научно-просветительский канал',
  webAppTitle: '{{emoji:nav.web}} Веб и мобильное приложение ASAKA ZIYO',
  webAppBody:
    'Священный Коран, достоверные хадисы, зикры, точное время намаза в Асаке и табло мечети в одной экосистеме.',
  rateLimitExceeded: '{{emoji:status.warn}} Слишком много запросов. Пожалуйста, подождите немного и повторите попытку.',
  maintenanceNotice: '{{emoji:status.warn}} На Telegram-платформе проводятся технические работы. Скоро всё возобновится.',
  unknownCommand: 'Неизвестная команда. Отправьте /start для главного меню или /help для справки.',
  genericError: '{{emoji:status.warn}} Произошла непредвиденная ошибка. Пожалуйста, попробуйте снова.',
  buttons: {
    prayerTimes: 'Время намаза',
    language: 'Сменить язык',
    settings: 'Настройки',
    channels: 'Официальные каналы',
    webApp: 'Веб / Мобильное приложение',
    help: 'Помощь',
    backToMenu: 'Главное меню',
    refreshPrayer: 'Обновить',
    openWebApp: 'Открыть ASAKA ZIYO',
    openChannelPrimary: 'Канал @Asaka_Ziyo',
    openChannelSecondary: 'Канал @muhiddinsahhofuz',
    togglePrayerAlerts: 'Напоминания о намазе',
    toggleDailyWisdom: 'Ежедневная мудрость',
    toggleAnnouncements: 'Объявления мечети',
    changeLanguage: 'Сменить язык',
  },
  prayerNames: {
    tahajjud: 'Тахаджуд',
    subh: 'Субх',
    bomdod: 'Фаджр (Бомдод)',
    quyosh: 'Восход',
    peshin: 'Зухр (Пешин)',
    asr: 'Аср',
    shom: 'Магриб (Шом)',
    xufton: 'Иша (Хуфтон)',
    juma: 'Джума',
  },
  commands: {
    start: 'Главное меню и запуск',
    help: 'Помощь и список команд',
    language: 'Выбор языка (5 языков)',
    settings: 'Личные настройки',
  },
};

const EN: TelegramLocaleDictionary = {
  languageName: TELEGRAM_LANGUAGE_NATIVE_NAMES.en,
  welcomeTitle: '{{emoji:brand.mosque}} ASAKA ZIYO — Official Telegram Platform',
  welcomeBody:
    'Assalamu alaykum! Welcome to the official digital platform of the «MuhammadSolih Hoji» Jome Mosque in Asaka, Andijan region.\n\nUse the main menu below to access Asaka prayer times, five-language preferences, notification settings, and official channels.',
  mainMenuTitle: '{{emoji:nav.home}} ASAKA ZIYO — Main Menu',
  mainMenuPrompt: 'Select a section below:',
  helpTitle: '{{emoji:nav.help}} Help & Commands',
  helpBody:
    'Available bot commands:\n• /start — Open the main menu\n• /language — Choose from 5 supported languages\n• /settings — Manage notifications and language\n• /help — Show this help guide\n\nWeb & Mobile App: https://asakaziyo.uz',
  languageTitle: '{{emoji:language.globe}} Select Language',
  languagePrompt: 'Choose your preferred language for all menus, buttons, and notifications:',
  languageChangedToast: 'Language updated: English',
  languageChangedMessage: '{{emoji:status.ok}} Language preference saved: English.',
  settingsTitle: '{{emoji:settings.gear}} Personal Settings',
  settingsBody: 'These preferences are stored privately for your Telegram profile:',
  settingsPrayerAlerts: 'Prayer time reminders',
  settingsDailyWisdom: 'Daily Ayah & Hadith',
  settingsAnnouncements: 'Mosque announcements',
  settingsCurrentLanguage: 'Current language',
  statusEnabled: 'Enabled',
  statusDisabled: 'Disabled',
  settingUpdatedToast: 'Setting updated',
  prayerTitle: '{{emoji:nav.prayer}} Asaka Prayer Times',
  prayerLocationLine: 'Location',
  prayerDateLine: 'Date',
  prayerHijriLine: 'Hijri Date',
  prayerFooterNote: 'Schedule synced read-only from the official «MuhammadSolih Hoji» Mosque timetable.',
  prayerUnavailable: 'Prayer schedule is temporarily unavailable. Please try again shortly.',
  channelsTitle: '{{emoji:nav.channels}} Official Telegram Channels',
  channelsBody:
    'Follow the official ASAKA ZIYO Telegram channels:\n• @Asaka_Ziyo — Primary official channel\n• @muhiddinsahhofuz — Educational & spiritual channel',
  webAppTitle: '{{emoji:nav.web}} ASAKA ZIYO Web & Mobile App',
  webAppBody:
    'Access the Noble Quran, authentic Hadiths, Dhikr & Tasbih, verified Asaka prayer times, and Smart Mosque Display in one ecosystem.',
  rateLimitExceeded: '{{emoji:status.warn}} Too many requests. Please wait a moment and try again.',
  maintenanceNotice: '{{emoji:status.warn}} The Telegram platform is currently under maintenance. Please check back shortly.',
  unknownCommand: 'Unknown command. Send /start for the main menu or /help for assistance.',
  genericError: '{{emoji:status.warn}} An unexpected error occurred. Please try again.',
  buttons: {
    prayerTimes: 'Prayer Times',
    language: 'Change Language',
    settings: 'Settings',
    channels: 'Official Channels',
    webApp: 'Web / Mobile App',
    help: 'Help',
    backToMenu: 'Main Menu',
    refreshPrayer: 'Refresh',
    openWebApp: 'Open ASAKA ZIYO App',
    openChannelPrimary: '@Asaka_Ziyo Channel',
    openChannelSecondary: '@muhiddinsahhofuz Channel',
    togglePrayerAlerts: 'Prayer Alerts',
    toggleDailyWisdom: 'Daily Wisdom',
    toggleAnnouncements: 'Announcements',
    changeLanguage: 'Change Language',
  },
  prayerNames: {
    tahajjud: 'Tahajjud',
    subh: 'Subh',
    bomdod: 'Fajr',
    quyosh: 'Sunrise',
    peshin: 'Dhuhr',
    asr: 'Asr',
    shom: 'Maghrib',
    xufton: 'Isha',
    juma: 'Jumuah',
  },
  commands: {
    start: 'Open main menu',
    help: 'Help and commands',
    language: 'Select language (5 languages)',
    settings: 'Personal settings',
  },
};

// Strictly generated using the project's official New Uzbek Latin alphabet utility
// (sh->ş, ch->ç, oʻ->ö, gʻ->ğ, preserving URLs and {{emoji:...}} tokens)
const UZ_LATN_NEW: TelegramLocaleDictionary = {
  ...transformResourceObject(UZ_LATN),
  languageName: TELEGRAM_LANGUAGE_NATIVE_NAMES['uz-Latn-new'],
  languageChangedToast: 'Til yangilandi: Özbekça (Yangi Lotin)',
  languageChangedMessage: '{{emoji:status.ok}} Tanlangan til saqlandi: Özbekça (Yangi Lotin).',
};

const BUNDLES: Record<TelegramLocale, TelegramLocaleDictionary> = {
  'uz-Latn': UZ_LATN,
  'uz-Cyrl': UZ_CYRL,
  'uz-Latn-new': UZ_LATN_NEW,
  ru: RU,
  en: EN,
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
    const lower = value.toLowerCase().trim();
    if (lower.startsWith('ru')) return 'ru';
    if (lower.startsWith('en')) return 'en';
    if (lower === 'uz-cyrl' || lower === 'uz_cyrl') return 'uz-Cyrl';
    if (lower === 'uz-latn-new' || lower === 'uz_new') return 'uz-Latn-new';
    if (lower.startsWith('uz')) return 'uz-Latn';
  }
  return fallback;
}

export function getTelegramLocaleBundle(locale: TelegramLocale): TelegramLocaleDictionary {
  return BUNDLES[locale] || BUNDLES['uz-Latn'];
}
