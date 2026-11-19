/**
 * ASAKA ZIYO — Smart Mosque Display 5-Language Localization Engine
 *
 * Supports all 5 project languages:
 * 1. uz-Latn (O‘zbek lotin)
 * 2. uz-Cyrl (Ўзбек кирилл)
 * 3. uz-Latn-new (Yangi o‘zbek lotin alifbosi — generated via project's official transliterator)
 * 4. ru (Русский)
 * 5. en (English)
 *
 * Arabic sacred texts (Quran, Hadith, prayer Arabic names, mosque phrases) are NEVER modified.
 */

import { PrayerKey, SupportedLocale } from '../types';
import { transformResourceObject, toNewUzbekAlphabet } from './newUzbekAlphabet';

export interface SmartDisplayLocaleBundle {
  brandTitle: string;
  mosqueSubtitleDefault: string;
  tashkentTimeLabel: string;
  milodiyLabel: string;
  hijriyLabel: string;
  nextAzanLabel: string;
  iqamahLabel: string;
  iqamahWaitingLabel: string;
  iqamahPrepareNotice: string;
  currentPrayerBadge: string;
  nextPrayerBadge: string;
  azanColumnLabel: string;
  iqamahColumnLabel: string;
  timeColumnLabel: string;
  sunriseLabel: string;
  ishraqLabel: string;
  jumaLabel: string;
  tahajjudLabel: string;
  subhLabel: string;
  qiblaLabel: string;
  announcementsHeader: string;
  defaultAnnouncementTitle: string;
  defaultAnnouncementBody: string;
  etiquetteTitle: string;
  etiquetteSubtitle: string;
  onlineLabel: string;
  offlineLabel: string;
  offlineNotice: string;
  scheduleExpiredWarning: string;
  scheduleUnpublishedNotice: string;
  monitorDisabledTitle: string;
  monitorDisabledSubtitle: string;
  monitorBlockedTitle: string;
  monitorBlockedSubtitle: string;
  pairScreenTitle: string;
  pairScreenSubtitle: string;
  pairCodePlaceholder: string;
  pairButtonLabel: string;
  pairPreviewButtonLabel: string;
  pairInvalidError: string;
  fullscreenEnter: string;
  fullscreenExit: string;
  templateLabel: string;
  languageLabel: string;
  pairMonitorButton: string;
  exitDisplayButton: string;
  wakeLockActive: string;
  lastSyncLabel: string;
  tomorrowPrefix: string;
  fridayTag: string;
  dailyWisdomTitle: string;
  prayerNames: Record<PrayerKey | 'ishroq' | 'juma', string>;
  weekdays: string[]; // 0 = Sunday .. 6 = Saturday
  months: string[]; // 0 = January .. 11 = December
  templates: {
    royal_ivory: string;
    emerald_royal: string;
    modern_minimal: string;
    madina_portrait: string;
    classic_mosque: string;
    premium_emerald: string;
    minimal_modern: string;
  };
}

const UZ_LATN_BUNDLE: SmartDisplayLocaleBundle = {
  brandTitle: 'ASAKA ZIYO',
  mosqueSubtitleDefault: '«MuhammadSolih Hoji» Jomeʼ Masjidi',
  tashkentTimeLabel: 'Toshkent / Asaka vaqti',
  milodiyLabel: 'Milodiy',
  hijriyLabel: 'Hijriy',
  nextAzanLabel: 'Keyingi azon',
  iqamahLabel: 'Jamoat (Iqomat)',
  iqamahWaitingLabel: 'Iqomatgacha qoldi',
  iqamahPrepareNotice: 'Jamoat namoziga tayyorlaning · Safni tekislang',
  currentPrayerBadge: 'Hozirgi namoz',
  nextPrayerBadge: 'Keyingi namoz',
  azanColumnLabel: 'Azon',
  iqamahColumnLabel: 'Iqomat',
  timeColumnLabel: 'Vaqt',
  sunriseLabel: 'Quyosh chiqishi',
  ishraqLabel: 'Ishroq',
  jumaLabel: 'Juma namozi',
  tahajjudLabel: 'Tahajjud',
  subhLabel: 'Subh (Saharlik)',
  qiblaLabel: 'Qibla',
  announcementsHeader: 'Masjid eʼlonlari va axborotlar',
  defaultAnnouncementTitle: 'Jamoat namozi odoblari',
  defaultAnnouncementBody:
    'Masjidga kirganda telefonlarni ovozsiz rejimga oʻtkazing va safni tekis qilib turing. Alloh ibodatlarimizni qabul qilsin.',
  etiquetteTitle: 'Safni tekislang va telefonni ovozsiz qiling',
  etiquetteSubtitle: 'Jamoat namozi xushuʼsini saqlang',
  onlineLabel: 'Sinxronlangan',
  offlineLabel: 'Oflayn rejim',
  offlineNotice: 'Internet uzildi · Oxirgi tasdiqlangan jadval koʻrsatilmoqda',
  scheduleExpiredWarning: 'Diqqat: Namoz jadvali muddati tugagan — administrator yangilashi lozim',
  scheduleUnpublishedNotice: 'Namoz jadvali administrator tasdigʻini kutmoqda',
  monitorDisabledTitle: 'Monitor vaqtincha oʻchirilgan',
  monitorDisabledSubtitle:
    'Ushbu ekran ASAKA ZIYO maʼmuriyati tomonidan vaqtincha toʻxtatildi. Faollashtirilganda avtomatik tiklanadi.',
  monitorBlockedTitle: 'Monitor bloklangan',
  monitorBlockedSubtitle:
    'Ushbu qurilma ruxsati administrator tomonidan cheklangan. Masjid maʼmuriyatiga murojaat qiling.',
  pairScreenTitle: 'Smart Mosque Display — Monitorni Ulash',
  pairScreenSubtitle:
    'Admin paneldagi 6 xonali ulash kodini kiriting yoki QR-kodni skanerlang',
  pairCodePlaceholder: '6 xonali kod (masalan: 482915)',
  pairButtonLabel: 'Monitorni Ulash',
  pairPreviewButtonLabel: 'Asaka asosiy jadvalini ochish',
  pairInvalidError: 'Ulash kodi notoʻgʻri yoki muddati tugagan.',
  fullscreenEnter: 'Toʻliq ekran',
  fullscreenExit: 'Ekrandan chiqish',
  templateLabel: 'Shablon',
  languageLabel: 'Til',
  pairMonitorButton: 'Monitorni ulash',
  exitDisplayButton: 'Ilovaga qaytish',
  wakeLockActive: 'Ekran faol (24/7)',
  lastSyncLabel: 'Oxirgi sinxronlash',
  tomorrowPrefix: 'Ertaga',
  fridayTag: 'Juma kuni',
  dailyWisdomTitle: 'Kun hikmati',
  prayerNames: {
    tahajjud: 'Tahajjud',
    subh: 'Subh',
    bomdod: 'Bomdod',
    quyosh: 'Quyosh',
    ishroq: 'Ishroq',
    peshin: 'Peshin',
    juma: 'Juma',
    asr: 'Asr',
    shom: 'Shom',
    xufton: 'Xufton',
  },
  weekdays: [
    'Yakshanba',
    'Dushanba',
    'Seshanba',
    'Chorshanba',
    'Payshanba',
    'Juma',
    'Shanba',
  ],
  months: [
    'Yanvar',
    'Fevral',
    'Mart',
    'Aprel',
    'May',
    'Iyun',
    'Iyul',
    'Avgust',
    'Sentabr',
    'Oktabr',
    'Noyabr',
    'Dekabr',
  ],
  templates: {
    royal_ivory: 'Royal Ivory',
    emerald_royal: 'Emerald Royal',
    modern_minimal: 'Modern Minimal',
    madina_portrait: 'Madina Portrait',
    classic_mosque: 'Royal Ivory',
    premium_emerald: 'Emerald Royal',
    minimal_modern: 'Modern Minimal',
  },
};

const UZ_CYRL_BUNDLE: SmartDisplayLocaleBundle = {
  brandTitle: 'ASAKA ZIYO',
  mosqueSubtitleDefault: '«МуҳаммадСолиҳ Ҳожи» Жомеъ Масжиди',
  tashkentTimeLabel: 'Тошкент / Асака вақти',
  milodiyLabel: 'Милодий',
  hijriyLabel: 'Ҳижрий',
  nextAzanLabel: 'Кейинги азон',
  iqamahLabel: 'Жамоат (Иқомат)',
  iqamahWaitingLabel: 'Иқоматгача қолди',
  iqamahPrepareNotice: 'Жамоат намозига тайёрланинг · Сафни текисланг',
  currentPrayerBadge: 'Ҳозирги намоз',
  nextPrayerBadge: 'Кейинги намоз',
  azanColumnLabel: 'Азон',
  iqamahColumnLabel: 'Иқомат',
  timeColumnLabel: 'Вақт',
  sunriseLabel: 'Қуёш чиқиши',
  ishraqLabel: 'Ишроқ',
  jumaLabel: 'Жума намози',
  tahajjudLabel: 'Таҳажжуд',
  subhLabel: 'Субҳ (Саҳарлик)',
  qiblaLabel: 'Қибла',
  announcementsHeader: 'Масжид эълонлари ва ахборотлар',
  defaultAnnouncementTitle: 'Жамоат намози одоблари',
  defaultAnnouncementBody:
    'Масжидга кирганда телефонларни овозсиз режимга ўтказинг ва сафни текис қилиб туринг. Аллоҳ ибодатларимизни қабул қилсин.',
  etiquetteTitle: 'Сафни текисланг ва телефонни овозсиз қилинг',
  etiquetteSubtitle: 'Жамоат намози хушуъсини сақланг',
  onlineLabel: 'Синхронланган',
  offlineLabel: 'Офлайн режим',
  offlineNotice: 'Интернет узилди · Охирги тасдиқланган жадвал кўрсатилмоқда',
  scheduleExpiredWarning: 'Диққат: Намоз жадвали муддати тугаган — администратор янгилаши лозим',
  scheduleUnpublishedNotice: 'Намоз жадвали администратор тасдиғини кутмоқда',
  monitorDisabledTitle: 'Монитор вақтинча ўчирилган',
  monitorDisabledSubtitle:
    'Ушбу экран ASAKA ZIYO маъмурияти томонидан вақтинча тўхтатилди. Фаоллаштирилганда автоматик тикланади.',
  monitorBlockedTitle: 'Монитор блокланган',
  monitorBlockedSubtitle:
    'Ушбу қурилма рухсати администратор томонидан чекланган. Масжид маъмуриятига мурожаат қилинг.',
  pairScreenTitle: 'Smart Mosque Display — Мониторни Улаш',
  pairScreenSubtitle:
    'Админ панелдаги 6 хонали улаш кодини киритинг ёки QR-кодни сканерланг',
  pairCodePlaceholder: '6 хонали код (масалан: 482915)',
  pairButtonLabel: 'Мониторни Улаш',
  pairPreviewButtonLabel: 'Асака асосий жадвалини очиш',
  pairInvalidError: 'Улаш коди нотўғри ёки муддати тугаган.',
  fullscreenEnter: 'Тўлиқ экран',
  fullscreenExit: 'Экрандан чиқиш',
  templateLabel: 'Шаблон',
  languageLabel: 'Тил',
  pairMonitorButton: 'Мониторни улаш',
  exitDisplayButton: 'Иловага қайтиш',
  wakeLockActive: 'Экран фаол (24/7)',
  lastSyncLabel: 'Охирги синхронлаш',
  tomorrowPrefix: 'Эртага',
  fridayTag: 'Жума куни',
  dailyWisdomTitle: 'Кун ҳикмати',
  prayerNames: {
    tahajjud: 'Таҳажжуд',
    subh: 'Субҳ',
    bomdod: 'Бомдод',
    quyosh: 'Қуёш',
    ishroq: 'Ишроқ',
    peshin: 'Пешин',
    juma: 'Жума',
    asr: 'Аср',
    shom: 'Шом',
    xufton: 'Хуфтон',
  },
  weekdays: [
    'Якшанба',
    'Душанба',
    'Сешанба',
    'Чоршанба',
    'Пайшанба',
    'Жума',
    'Шанба',
  ],
  months: [
    'Январь',
    'Февраль',
    'Март',
    'Апрель',
    'Май',
    'Июнь',
    'Июль',
    'Август',
    'Сентябрь',
    'Октябрь',
    'Ноябрь',
    'Декабрь',
  ],
  templates: {
    royal_ivory: 'Royal Ivory (Оқ)',
    emerald_royal: 'Emerald Royal (Зумрад)',
    modern_minimal: 'Modern Minimal',
    madina_portrait: 'Madina Portrait (Вертикал)',
    classic_mosque: 'Royal Ivory (Оқ)',
    premium_emerald: 'Emerald Royal (Зумрад)',
    minimal_modern: 'Modern Minimal',
  },
};

const RU_BUNDLE: SmartDisplayLocaleBundle = {
  brandTitle: 'ASAKA ZIYO',
  mosqueSubtitleDefault: 'Соборная мечеть «МухаммадСолих Хожи»',
  tashkentTimeLabel: 'Время Ташкент / Асака',
  milodiyLabel: 'Григорианский',
  hijriyLabel: 'Хиджра',
  nextAzanLabel: 'До следующего азана',
  iqamahLabel: 'Джамаат (Икамат)',
  iqamahWaitingLabel: 'До икамата',
  iqamahPrepareNotice: 'Приготовьтесь к коллективному намазу · Выровняйте ряды',
  currentPrayerBadge: 'Текущий намаз',
  nextPrayerBadge: 'Следующий намаз',
  azanColumnLabel: 'Азан',
  iqamahColumnLabel: 'Икамат',
  timeColumnLabel: 'Время',
  sunriseLabel: 'Восход солнца',
  ishraqLabel: 'Ишрак',
  jumaLabel: 'Джума намаз',
  tahajjudLabel: 'Тахаджуд',
  subhLabel: 'Субх (Сухур)',
  qiblaLabel: 'Кибла',
  announcementsHeader: 'Объявления и новости мечети',
  defaultAnnouncementTitle: 'Этикет коллективного намаза',
  defaultAnnouncementBody:
    'Пожалуйста, переведите мобильные телефоны в беззвучный режим при входе в мечеть и выровняйте ряды.',
  etiquetteTitle: 'Выровняйте ряды и отключите звук телефона',
  etiquetteSubtitle: 'Сохраняйте спокойствие и смирение в мечети',
  onlineLabel: 'Синхронизировано',
  offlineLabel: 'Офлайн режим',
  offlineNotice: 'Нет подключения · Показано последнее подтвержденное расписание',
  scheduleExpiredWarning: 'Внимание: Срок действия расписания истёк — требуется обновление администратором',
  scheduleUnpublishedNotice: 'Расписание ожидает подтверждения администратора',
  monitorDisabledTitle: 'Монитор временно отключён',
  monitorDisabledSubtitle:
    'Экран временно приостановлен администрацией ASAKA ZIYO. Отображение восстановится автоматически.',
  monitorBlockedTitle: 'Монитор заблокирован',
  monitorBlockedSubtitle:
    'Доступ данного устройства ограничен администратором. Обратитесь в администрацию мечети.',
  pairScreenTitle: 'Smart Mosque Display — Подключение монитора',
  pairScreenSubtitle:
    'Введите 6-значный код из панели администратора или отсканируйте QR-код',
  pairCodePlaceholder: '6-значный код (например: 482915)',
  pairButtonLabel: 'Подключить монитор',
  pairPreviewButtonLabel: 'Открыть основное расписание Асаки',
  pairInvalidError: 'Код подключения недействителен или срок его действия истёк.',
  fullscreenEnter: 'Полный экран',
  fullscreenExit: 'Выйти из полного экрана',
  templateLabel: 'Шаблон',
  languageLabel: 'Язык',
  pairMonitorButton: 'Подключить экран',
  exitDisplayButton: 'В приложение',
  wakeLockActive: 'Экран активен (24/7)',
  lastSyncLabel: 'Последняя синхронизация',
  tomorrowPrefix: 'Завтра',
  fridayTag: 'Пятница',
  dailyWisdomTitle: 'Мудрость дня',
  prayerNames: {
    tahajjud: 'Тахаджуд',
    subh: 'Субх',
    bomdod: 'Фаджр',
    quyosh: 'Восход',
    ishroq: 'Ишрак',
    peshin: 'Зухр',
    juma: 'Джума',
    asr: 'Аср',
    shom: 'Магриб',
    xufton: 'Иша',
  },
  weekdays: [
    'Воскресенье',
    'Понедельник',
    'Вторник',
    'Среда',
    'Четверг',
    'Пятница',
    'Суббота',
  ],
  months: [
    'Января',
    'Февраля',
    'Марта',
    'Апреля',
    'Мая',
    'Июня',
    'Июля',
    'Августа',
    'Сентября',
    'Октября',
    'Ноября',
    'Декабря',
  ],
  templates: {
    royal_ivory: 'Royal Ivory (Светлый)',
    emerald_royal: 'Emerald Royal (Изумруд)',
    modern_minimal: 'Modern Minimal',
    madina_portrait: 'Madina Portrait (Вертикальный)',
    classic_mosque: 'Royal Ivory (Светлый)',
    premium_emerald: 'Emerald Royal (Изумруд)',
    minimal_modern: 'Modern Minimal',
  },
};

const EN_BUNDLE: SmartDisplayLocaleBundle = {
  brandTitle: 'ASAKA ZIYO',
  mosqueSubtitleDefault: 'MuhammadSolih Hoji Jome Mosque',
  tashkentTimeLabel: 'Tashkent / Asaka Time',
  milodiyLabel: 'Gregorian',
  hijriyLabel: 'Hijri',
  nextAzanLabel: 'Next Adhan',
  iqamahLabel: 'Congregation (Iqamah)',
  iqamahWaitingLabel: 'Time Until Iqamah',
  iqamahPrepareNotice: 'Prepare for congregation prayer · Straighten the rows',
  currentPrayerBadge: 'Current Prayer',
  nextPrayerBadge: 'Next Prayer',
  azanColumnLabel: 'Adhan',
  iqamahColumnLabel: 'Iqamah',
  timeColumnLabel: 'Time',
  sunriseLabel: 'Sunrise',
  ishraqLabel: 'Ishraq',
  jumaLabel: 'Jumuah Prayer',
  tahajjudLabel: 'Tahajjud',
  subhLabel: 'Subh (Suhoor)',
  qiblaLabel: 'Qibla',
  announcementsHeader: 'Mosque Announcements & Notices',
  defaultAnnouncementTitle: 'Congregation Prayer Etiquette',
  defaultAnnouncementBody:
    'Please switch mobile phones to silent mode before entering the prayer hall and straighten the rows.',
  etiquetteTitle: 'Straighten the rows & silence mobile phones',
  etiquetteSubtitle: 'Preserve tranquility and reverence during prayer',
  onlineLabel: 'Synced',
  offlineLabel: 'Offline Mode',
  offlineNotice: 'Connection lost · Displaying last verified prayer schedule',
  scheduleExpiredWarning: 'Notice: Prayer schedule validity expired — administrator update required',
  scheduleUnpublishedNotice: 'Prayer schedule awaiting administrator confirmation',
  monitorDisabledTitle: 'Display Temporarily Paused',
  monitorDisabledSubtitle:
    'This monitor has been temporarily paused by ASAKA ZIYO administration. It will resume automatically once enabled.',
  monitorBlockedTitle: 'Monitor Access Restricted',
  monitorBlockedSubtitle:
    'This device token has been blocked by the administrator. Please contact mosque administration.',
  pairScreenTitle: 'Smart Mosque Display — Connect Monitor',
  pairScreenSubtitle:
    'Enter the 6-digit pairing code from the Admin Panel or scan the QR code',
  pairCodePlaceholder: '6-digit code (e.g. 482915)',
  pairButtonLabel: 'Connect Monitor',
  pairPreviewButtonLabel: 'Open Main Asaka Schedule',
  pairInvalidError: 'Pairing code is invalid or expired.',
  fullscreenEnter: 'Fullscreen',
  fullscreenExit: 'Exit Fullscreen',
  templateLabel: 'Template',
  languageLabel: 'Language',
  pairMonitorButton: 'Pair Monitor',
  exitDisplayButton: 'Back to App',
  wakeLockActive: 'Screen Awake (24/7)',
  lastSyncLabel: 'Last Sync',
  tomorrowPrefix: 'Tomorrow',
  fridayTag: 'Friday',
  dailyWisdomTitle: 'Daily Wisdom',
  prayerNames: {
    tahajjud: 'Tahajjud',
    subh: 'Subh',
    bomdod: 'Fajr',
    quyosh: 'Sunrise',
    ishroq: 'Ishraq',
    peshin: 'Dhuhr',
    juma: 'Jumuah',
    asr: 'Asr',
    shom: 'Maghrib',
    xufton: 'Isha',
  },
  weekdays: [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ],
  months: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  templates: {
    royal_ivory: 'Royal Ivory',
    emerald_royal: 'Emerald Royal',
    modern_minimal: 'Modern Minimal',
    madina_portrait: 'Madina Portrait',
    classic_mosque: 'Royal Ivory',
    premium_emerald: 'Emerald Royal',
    minimal_modern: 'Modern Minimal',
  },
};

// Dynamically generated using the project's official New Uzbek Alphabet transliterator
const UZ_LATN_NEW_BUNDLE: SmartDisplayLocaleBundle = transformResourceObject(UZ_LATN_BUNDLE);

export const DISPLAY_LOCALES: Record<SupportedLocale, SmartDisplayLocaleBundle> = {
  'uz-Latn': UZ_LATN_BUNDLE,
  'uz-Cyrl': UZ_CYRL_BUNDLE,
  'uz-Latn-new': UZ_LATN_NEW_BUNDLE,
  ru: RU_BUNDLE,
  en: EN_BUNDLE,
};

export const DISPLAY_LANGUAGE_LABELS: Record<SupportedLocale, string> = {
  'uz-Latn': 'Oʻzbekcha (Lotin)',
  'uz-Cyrl': 'Ўзбекча (Кирилл)',
  'uz-Latn-new': 'Özbekça (Yangi alifbo)',
  ru: 'Русский',
  en: 'English',
};

export function getDisplayLocaleBundle(locale: SupportedLocale): SmartDisplayLocaleBundle {
  return DISPLAY_LOCALES[locale] || UZ_LATN_BUNDLE;
}

/**
 * Formats any dynamic Uzbek Latin text (such as mosque name, announcement, or Hijri date)
 * cleanly for the New Uzbek Alphabet without touching Arabic script or URLs.
 */
export function adaptDisplayTextForLocale(text: string, locale: SupportedLocale): string {
  if (!text) return '';
  if (locale === 'uz-Latn-new') {
    return toNewUzbekAlphabet(text);
  }
  return text;
}

/**
 * Formats a Tashkent calendar date cleanly in any of the 5 supported languages.
 */
export function formatDisplayGregorianDate(
  dateParts: { year: number; monthIndex: number; day: number; weekdayIndex: number },
  locale: SupportedLocale
): string {
  const bundle = getDisplayLocaleBundle(locale);
  const weekday = bundle.weekdays[dateParts.weekdayIndex] || '';
  const month = bundle.months[dateParts.monthIndex] || '';
  if (locale === 'en') {
    return `${weekday}, ${month} ${dateParts.day}, ${dateParts.year}`;
  }
  if (locale === 'ru') {
    return `${weekday}, ${dateParts.day} ${month.toLowerCase()} ${dateParts.year} г.`;
  }
  return `${weekday}, ${dateParts.day}-${month}, ${dateParts.year}`;
}
