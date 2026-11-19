/**
 * ASAKA ZIYO — Smart Mosque Display 5-Language Localization & Dynamic Text Safety Engine
 *
 * Strictly supports ONLY the 5 official project languages (zero Arabic script, zero 6th language):
 * 1. uz-Latn     (O‘zbek lotin)
 * 2. uz-Cyrl     (Ўзбек кирилл)
 * 3. uz-Latn-new (Yangi o‘zbek lotin — generated via project's official transliterator: sh->ş, ch->ç, oʻ->ö, gʻ->ğ)
 * 4. ru          (Русский)
 * 5. en          (English)
 *
 * Dynamic text safety guarantees:
 * - Any Arabic Unicode characters in dynamic fields (mosque name, location, announcements, Hijri date)
 *   are safely stripped (never rendered on screen, never blindly transliterated into garbled Latin).
 * - If stripping Arabic leaves empty text, a clean localized fallback is returned.
 */

import { PrayerKey, SupportedLocale } from '../types';
import { transformResourceObject, toNewUzbekAlphabet } from './newUzbekAlphabet';

/** Unicode ranges covering Arabic, Arabic Supplement, Arabic Extended-A, and Presentation Forms A/B */
export const DISPLAY_ARABIC_SCRIPT_REGEX =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g;

export interface SmartDisplayLocaleBundle {
  brandTitle: string;
  mosqueSubtitleDefault: string;
  dateLabel: string;
  clockLabel: string;
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
  prayerColumnLabel: string;
  sunriseLabel: string;
  ishraqLabel: string;
  duhaStartsAtLabel: string;
  nextAzanAfterLabel: string;
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
  hijriMonths: string[]; // 0 = Muharram .. 11 = Dhul-Hijjah
  templates: {
    royal_ivory: string;
    emerald_royal: string;
    modern_minimal: string;
    madina_portrait: string;
    sultan_royal: string;
    noor_classic: string;
    midnight_premium: string;
    vision_modern: string;
    islamic_heritage: string;
    masjid_al_nabawi: string;
    masjid_namoz_tablosa_uz_cyrl: string;
    classic_mosque: string;
    premium_emerald: string;
    minimal_modern: string;
  };
  admin: {
    headerTitle: string;
    headerBadge: string;
    headerSubtitle: string;
    openDisplayBtn: string;
    refreshBtn: string;
    addMonitorBtn: string;
    kpiTotalMonitors: string;
    kpiSchedulesCountSuffix: string;
    kpiOnlineScreens: string;
    kpiLiveHeartbeat: string;
    kpiOfflinePaused: string;
    kpiActiveAnnouncements: string;
    kpiScheduleAudit: string;
    kpiAccurate: string;
    kpiAlertsSuffix: string;
    kpiFirestoreConnected: string;
    kpiLocalFallback: string;
    tabMonitors: string;
    tabSchedules: string;
    tabAnnouncements: string;
    tabConnections: string;
    registerMonitorTitle: string;
    monitorNameLabel: string;
    mosqueNameLabel: string;
    locationLabel: string;
    assignedScheduleLabel: string;
    screenLanguageLabel: string;
    designProfileLabel: string;
    cancelBtn: string;
    creatingBtn: string;
    createAndGetQrBtn: string;
    optionalTag: string;
    azanEntryCol: string;
    iqamahCongregationCol: string;
    officialConfirmedLabel: string;
    settingsBtn: string;
    pauseBtn: string;
    activateBtn: string;
    onlineBadge: string;
    offlineBadge: string;
    blockedBadge: string;
    pausedBadge: string;
    scheduleCardLabel: string;
    langProfileCardLabel: string;
    lastSyncCardLabel: string;
    monitorSettingsTitle: string;
    saveBtn: string;
    savingBtn: string;
    newPremiumDesignsHeading: string;
    newPremiumDesignsSubtitle: string;
    classicDesignsHeading: string;
    dedicatedTabloHeading: string;
    selectDesignBtn: string;
    selectedDesignBadge: string;
    previewFullscreenBtn: string;
    restorePreviousDesignBtn: string;
    targetMonitorLabel: string;
    openMasjidTvBtn: string;
    profileDescriptions: {
      royal_ivory: string;
      emerald_royal: string;
      modern_minimal: string;
      madina_portrait: string;
      sultan_royal: string;
      noor_classic: string;
      midnight_premium: string;
      vision_modern: string;
      islamic_heritage: string;
      masjid_al_nabawi: string;
      masjid_namoz_tablosa_uz_cyrl: string;
    };
  };
}

const UZ_LATN_BUNDLE: SmartDisplayLocaleBundle = {
  brandTitle: 'ASAKA ZIYO',
  mosqueSubtitleDefault: '«MuhammadSolih Hoji» Jomeʼ Masjidi',
  dateLabel: 'Sana',
  clockLabel: 'Soat',
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
  timeColumnLabel: 'Namoz',
  prayerColumnLabel: 'Namoz',
  sunriseLabel: 'Quyosh chiqishi',
  ishraqLabel: 'Ishroq',
  duhaStartsAtLabel: 'Zuho vaqti',
  nextAzanAfterLabel: 'Keyingi azongacha',
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
  templateLabel: 'Profil',
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
  hijriMonths: [
    'Muharram',
    'Safar',
    'Rabiul avval',
    'Rabiul soniy',
    'Jumodul avval',
    'Jumodul oxir',
    'Rajab',
    'Shaʼbon',
    'Ramazon',
    'Shavvol',
    'Zulqaʼda',
    'Zulhijja',
  ],
  templates: {
    royal_ivory: 'Royal Ivory',
    emerald_royal: 'Emerald Royal',
    modern_minimal: 'Modern Minimal',
    madina_portrait: 'Madina Portrait',
    sultan_royal: 'Sultan Royal',
    noor_classic: 'Noor Classic',
    midnight_premium: 'Midnight Premium',
    vision_modern: 'Vision Modern',
    islamic_heritage: 'Islamic Heritage',
    masjid_al_nabawi: 'Masjid Al-Nabawi',
    masjid_namoz_tablosa_uz_cyrl: 'Masjid Namoz Tablosi (Kirill)',
    classic_mosque: 'Royal Ivory',
    premium_emerald: 'Emerald Royal',
    minimal_modern: 'Modern Minimal',
  },
  admin: {
    headerTitle: 'ASAKA ZIYO — Smart Mosque Display Boshqaruvi',
    headerBadge: '24/7 TV & LED Ekranlar',
    headerSubtitle:
      'Masjid va madrasalardagi barcha televizor monitorlarini QR/6-xonali kod bilan ulang, administrator tasdiqlagan aniq namoz jadvallari, 5 til, 11 ta dizayn profili va eʼlonlarni markazlashgan holda boshqaring.',
    openDisplayBtn: '/display Ekranini Ochish',
    refreshBtn: 'Yangilash',
    addMonitorBtn: 'Monitor Qoʻshish',
    kpiTotalMonitors: 'Jami Monitorlar',
    kpiSchedulesCountSuffix: 'ta namoz jadvali mavjud',
    kpiOnlineScreens: 'Onlayn Ekranlar',
    kpiLiveHeartbeat: 'Jonli heartbeat aloqada',
    kpiOfflinePaused: 'Oflayn / Toʻxtatilgan',
    kpiActiveAnnouncements: 'Faol eʼlonlar',
    kpiScheduleAudit: 'Jadval Nazorati',
    kpiAccurate: 'Aniq',
    kpiAlertsSuffix: 'ogoh',
    kpiFirestoreConnected: 'Firestore: Ulangan',
    kpiLocalFallback: 'Mahalliy zaxira rejimi',
    tabMonitors: 'Monitorlar',
    tabSchedules: 'Namoz Jadvallari',
    tabAnnouncements: 'TV Eʼlonlar va Media',
    tabConnections: 'Ulanishlar Tarixi',
    registerMonitorTitle: 'Yangi Smart TV / LED Monitor Roʻyxatdan Oʻtkazish',
    monitorNameLabel: 'Monitor Nomi (noyob nom) *',
    mosqueNameLabel: 'Masjid / Madrasa Nomi',
    locationLabel: 'Joylashuv / Zal Belgisi',
    assignedScheduleLabel: 'Biriktirilgan Namoz Jadvali',
    screenLanguageLabel: 'Ekran Tili (5 til)',
    designProfileLabel: 'Dizayn Profili',
    cancelBtn: 'Bekor qilish',
    creatingBtn: 'Yaratilmoqda...',
    createAndGetQrBtn: 'Yaratish va QR/Kod Olish',
    optionalTag: '(ixtiyoriy)',
    azanEntryCol: 'Azon / Kirish Vaqti (HH:MM)',
    iqamahCongregationCol: 'Iqomat / Jamoat Vaqti (HH:MM)',
    officialConfirmedLabel: 'Rasmiy tasdiqlangan (TV ekranlarida faol koʻrsatilsin)',
    settingsBtn: 'Sozlamalar',
    pauseBtn: 'Toʻxtatish',
    activateBtn: 'Faollashtirish',
    onlineBadge: 'Onlayn',
    offlineBadge: 'Oflayn',
    blockedBadge: 'Bloklangan',
    pausedBadge: 'Toʻxtatilgan',
    scheduleCardLabel: 'Jadval',
    langProfileCardLabel: 'Til va Profil',
    lastSyncCardLabel: 'Oxirgi sinxronlash',
    monitorSettingsTitle: 'Monitor Sozlamalari',
    saveBtn: 'Saqlash',
    savingBtn: 'Saqlanmoqda...',
    newPremiumDesignsHeading: 'YANGI PREMIUM DIZAYNLAR',
    newPremiumDesignsSubtitle:
      'Har bir monitor uchun mustaqil premium dizayn tanlang, toʻliq ekranda oldindan koʻring va namoz jadvalini yoʻqotmasdan Firestoreʼda saqlang.',
    classicDesignsHeading: 'Asosiy Klassik Dizaynlar (4 ta)',
    dedicatedTabloHeading: 'Maxsus Oʻzbek Kirill Masjid Tablosi (/masjid-tv)',
    selectDesignBtn: 'Dizaynni tanlash',
    selectedDesignBadge: 'Faol tanlangan',
    previewFullscreenBtn: 'Toʻliq ekranda koʻrish',
    restorePreviousDesignBtn: 'Oldingi dizaynga qaytarish',
    targetMonitorLabel: 'Dizayn qoʻllaniladigan monitor',
    openMasjidTvBtn: '/masjid-tv Tablosini Ochish',
    profileDescriptions: {
      royal_ivory: 'Yorugʻ va nafis ivory fon, oltin chiziq va qirollik yashil hisoblagich tasmasi',
      emerald_royal: 'Toʻq zumrad premium 2 ustunli kompozitsiya — yirik soat va yuqori kontrast',
      modern_minimal: 'Ortiqcha bezaksiz, 5 ustunli zamonaviy arxitekturaviy namoz jadvali',
      madina_portrait: 'Vertikal 1080×1920 monitorlar uchun maxsus ustun kompozitsiyasi',
      sultan_royal: 'Shohona toʻq zumrad va oltin geometrik hoshiyali premium masjid tablosi',
      noor_classic: 'Yorugʻ marmar va iliq ivory fonli, masofadan ravshan oʻqiladigan hashamatli dizayn',
      midnight_premium: 'Tungi koʻzga yoqimli toʻq koʻk va zumrad uygʻunligi, kumush va oq yirik raqamlar',
      vision_modern: 'Zamonaviy minimalist ustunli arxitektura — asosiy eʼtibor namoz jadvalida',
      islamic_heritage: 'Toʻq zumrad va iliq ivory ramkali, nafis islomiy meʼmoriy naqshli dizayn',
      masjid_al_nabawi: 'Masjid an-Nabaviy namunaviy monitori asosida: markaziy soat, 5 qator va yashil pastki panel',
      masjid_namoz_tablosa_uz_cyrl: 'Faqat oʻzbek kirill yozuvidagi mustaqil /masjid-tv namoz vaqtlari tablosi',
    },
  },
};

const UZ_CYRL_BUNDLE: SmartDisplayLocaleBundle = {
  brandTitle: 'ASAKA ZIYO',
  mosqueSubtitleDefault: '«МуҳаммадСолиҳ Ҳожи» Жомеъ Масжиди',
  dateLabel: 'Сана',
  clockLabel: 'Соат',
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
  timeColumnLabel: 'Намоз',
  prayerColumnLabel: 'Намоз',
  sunriseLabel: 'Қуёш чиқиши',
  ishraqLabel: 'Ишроқ',
  duhaStartsAtLabel: 'Зуҳо вақти',
  nextAzanAfterLabel: 'Кейинги азонгача',
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
  templateLabel: 'Профил',
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
  hijriMonths: [
    'Муҳаррам',
    'Сафар',
    'Рабиул аввал',
    'Рабиул соний',
    'Жумодул аввал',
    'Жумодул охир',
    'Ражаб',
    'Шаъбон',
    'Рамазон',
    'Шаввол',
    'Зулқаъда',
    'Зулҳижжа',
  ],
  templates: {
    royal_ivory: 'Royal Ivory (Оқ)',
    emerald_royal: 'Emerald Royal (Зумрад)',
    modern_minimal: 'Modern Minimal',
    madina_portrait: 'Madina Portrait (Вертикал)',
    sultan_royal: 'Sultan Royal (Шоҳона)',
    noor_classic: 'Noor Classic (Мармар)',
    midnight_premium: 'Midnight Premium (Тунги)',
    vision_modern: 'Vision Modern (Замонавий)',
    islamic_heritage: 'Islamic Heritage (Мерос)',
    masjid_al_nabawi: 'Масжид ан-Набавий',
    masjid_namoz_tablosa_uz_cyrl: 'Масжид Намоз Таблоси (Кирилл)',
    classic_mosque: 'Royal Ivory (Оқ)',
    premium_emerald: 'Emerald Royal (Зумрад)',
    minimal_modern: 'Modern Minimal',
  },
  admin: {
    headerTitle: 'ASAKA ZIYO — Smart Mosque Display Бошқаруви',
    headerBadge: '24/7 TV ва LED Экранлар',
    headerSubtitle:
      'Масжид ва мадрасалардаги барча телевизор мониторларини QR/6-хонали код билан уланг, администратор тасдиқлаган аниқ намоз жадваллари, 5 тил, 11 та дизайн профили ва эълонларни марказлашган ҳолда бошқаринг.',
    openDisplayBtn: '/display Экранини Очиш',
    refreshBtn: 'Янгилаш',
    addMonitorBtn: 'Монитор Қўшиш',
    kpiTotalMonitors: 'Жами Мониторлар',
    kpiSchedulesCountSuffix: 'та намоз жадвали мавжуд',
    kpiOnlineScreens: 'Онлайн Экранлар',
    kpiLiveHeartbeat: 'Жонли heartbeat алоқада',
    kpiOfflinePaused: 'Офлайн / Тўхтатилган',
    kpiActiveAnnouncements: 'Фаол эълонлар',
    kpiScheduleAudit: 'Жадвал Назорати',
    kpiAccurate: 'Аниқ',
    kpiAlertsSuffix: 'огоҳ',
    kpiFirestoreConnected: 'Firestore: Уланган',
    kpiLocalFallback: 'Маҳаллий захира режими',
    tabMonitors: 'Мониторлар',
    tabSchedules: 'Намоз Жадваллари',
    tabAnnouncements: 'TV Эълонлар ва Медиа',
    tabConnections: 'Уланишлар Тарихи',
    registerMonitorTitle: 'Янги Smart TV / LED Монитор Рўйхатдан Ўтказиш',
    monitorNameLabel: 'Монитор Номи (ноёб ном) *',
    mosqueNameLabel: 'Масжид / Мадраса Номи',
    locationLabel: 'Жойлашув / Зал Белгиси',
    assignedScheduleLabel: 'Бириктирилган Намоз Жадвали',
    screenLanguageLabel: 'Экран Тили (5 тил)',
    designProfileLabel: 'Дизайн Профили',
    cancelBtn: 'Бекор қилиш',
    creatingBtn: 'Яратилмоқда...',
    createAndGetQrBtn: 'Яратиш ва QR/Код Олиш',
    optionalTag: '(ихтиёрий)',
    azanEntryCol: 'Азон / Кириш Вақти (HH:MM)',
    iqamahCongregationCol: 'Иқомат / Жамоат Вақти (HH:MM)',
    officialConfirmedLabel: 'Расмий тасдиқланган (TV экранларида фаол кўрсатилсин)',
    settingsBtn: 'Созламалар',
    pauseBtn: 'Тўхтатиш',
    activateBtn: 'Фаоллаштириш',
    onlineBadge: 'Онлайн',
    offlineBadge: 'Офлайн',
    blockedBadge: 'Блокланган',
    pausedBadge: 'Тўхтатилган',
    scheduleCardLabel: 'Жадвал',
    langProfileCardLabel: 'Тил ва Профил',
    lastSyncCardLabel: 'Охирги синхронлаш',
    monitorSettingsTitle: 'Монитор Созламалари',
    saveBtn: 'Сақлаш',
    savingBtn: 'Сақланмоқда...',
    newPremiumDesignsHeading: 'ЯНГИ ПРЕМИУМ ДИЗАЙНЛАР',
    newPremiumDesignsSubtitle:
      'Ҳар бир монитор учун мустақил премиум дизайн танланг, тўлиқ экранда олдиндан кўринг ва намоз жадвалини йўқотмасдан Firestoreʼда сақланг.',
    classicDesignsHeading: 'Асосий Классик Дизайнлар (4 та)',
    dedicatedTabloHeading: 'Махсус Ўзбек Кирилл Масжид Таблоси (/masjid-tv)',
    selectDesignBtn: 'Дизайнни танлаш',
    selectedDesignBadge: 'Фаол танланган',
    previewFullscreenBtn: 'Тўлиқ экранда кўриш',
    restorePreviousDesignBtn: 'Олдинги дизайнга қайтариш',
    targetMonitorLabel: 'Дизайн қўлланиладиган монитор',
    openMasjidTvBtn: '/masjid-tv Таблосини Очиш',
    profileDescriptions: {
      royal_ivory: 'Ёруғ ва нафис ivory фон, олтин чизиқ ва қироллик яшил ҳисоблагич тасмаси',
      emerald_royal: 'Тўқ зумрад премиум 2 устунли композиция — йирик соат ва юқори контраст',
      modern_minimal: 'Ортиқча безаксиз, 5 устунли замонавий архитектуравий намоз жадвали',
      madina_portrait: 'Вертикал 1080×1920 мониторлар учун махсус устун композицияси',
      sultan_royal: 'Шоҳона тўқ зумрад ва олтин геометрик ҳошияли премиум масжид таблоси',
      noor_classic: 'Ёруғ мармар ва илиқ оқ фонли, масофадан равшан ўқиладиган ҳашаматли дизайн',
      midnight_premium: 'Тунги кўзга ёқимли тўқ кўк ва зумрад уйғунлиги, кумуш ва оқ йирик рақамлар',
      vision_modern: 'Замонавий минималист устунли архитектура — асосий эътибор намоз жадвалида',
      islamic_heritage: 'Тўқ зумрад ва илиқ оқ рамкали, нафис исломий меъморий нақшли дизайн',
      masjid_al_nabawi: 'Масжид ан-Набавий намунавий монитори асосида: марказий соат, 5 қатор ва яшил пастки панел',
      masjid_namoz_tablosa_uz_cyrl: 'Фақат ўзбек кирилл ёзувидаги мустақил /masjid-tv намоз вақтлари таблоси',
    },
  },
};

const RU_BUNDLE: SmartDisplayLocaleBundle = {
  brandTitle: 'ASAKA ZIYO',
  mosqueSubtitleDefault: 'Соборная мечеть «МухаммадСолих Хожи»',
  dateLabel: 'Дата',
  clockLabel: 'Часы',
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
  timeColumnLabel: 'Намаз',
  prayerColumnLabel: 'Намаз',
  sunriseLabel: 'Восход солнца',
  ishraqLabel: 'Ишрак',
  duhaStartsAtLabel: 'Время Духа',
  nextAzanAfterLabel: 'До следующего азана',
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
  templateLabel: 'Профиль',
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
  hijriMonths: [
    'Мухаррам',
    'Сафар',
    'Раби аль-авваль',
    'Раби ас-сани',
    'Джумада аль-уля',
    'Джумада ас-сани',
    'Раджаб',
    'Шаабан',
    'Рамадан',
    'Шавваль',
    'Зуль-каада',
    'Зуль-хиджа',
  ],
  templates: {
    royal_ivory: 'Royal Ivory (Светлый)',
    emerald_royal: 'Emerald Royal (Изумруд)',
    modern_minimal: 'Modern Minimal',
    madina_portrait: 'Madina Portrait (Вертикальный)',
    sultan_royal: 'Sultan Royal (Королевский)',
    noor_classic: 'Noor Classic (Мрамор)',
    midnight_premium: 'Midnight Premium (Ночной)',
    vision_modern: 'Vision Modern (Современный)',
    islamic_heritage: 'Islamic Heritage (Наследие)',
    masjid_al_nabawi: 'Масджид ан-Набави',
    masjid_namoz_tablosa_uz_cyrl: 'Табло мечети (Узб. кириллица)',
    classic_mosque: 'Royal Ivory (Светлый)',
    premium_emerald: 'Emerald Royal (Изумруд)',
    minimal_modern: 'Modern Minimal',
  },
  admin: {
    headerTitle: 'ASAKA ZIYO — Управление Smart Mosque Display',
    headerBadge: '24/7 TV и LED Экраны',
    headerSubtitle:
      'Подключайте экраны мечетей и медресе по QR/6-значному коду, централизованно управляйте точным расписанием намаза, 5 языками, 11 профилями дизайна и объявлениями.',
    openDisplayBtn: 'Открыть экран /display',
    refreshBtn: 'Обновить',
    addMonitorBtn: 'Добавить монитор',
    kpiTotalMonitors: 'Всего мониторов',
    kpiSchedulesCountSuffix: 'расписаний намаза',
    kpiOnlineScreens: 'Онлайн экраны',
    kpiLiveHeartbeat: 'Активный heartbeat',
    kpiOfflinePaused: 'Офлайн / Приостановлено',
    kpiActiveAnnouncements: 'Активные объявления',
    kpiScheduleAudit: 'Контроль расписания',
    kpiAccurate: 'Точно',
    kpiAlertsSuffix: 'предупр.',
    kpiFirestoreConnected: 'Firestore: Подключено',
    kpiLocalFallback: 'Локальный резервный режим',
    tabMonitors: 'Мониторы',
    tabSchedules: 'Расписание намаза',
    tabAnnouncements: 'TV Объявления и Медиа',
    tabConnections: 'История подключений',
    registerMonitorTitle: 'Регистрация нового Smart TV / LED монитора',
    monitorNameLabel: 'Название монитора (уникальное) *',
    mosqueNameLabel: 'Название мечети / медресе',
    locationLabel: 'Расположение / Зал',
    assignedScheduleLabel: 'Привязанное расписание',
    screenLanguageLabel: 'Язык экрана (5 языков)',
    designProfileLabel: 'Профиль дизайна',
    cancelBtn: 'Отмена',
    creatingBtn: 'Создание...',
    createAndGetQrBtn: 'Создать и получить QR/Код',
    optionalTag: '(необязательно)',
    azanEntryCol: 'Время азана (HH:MM)',
    iqamahCongregationCol: 'Время икамата (HH:MM)',
    officialConfirmedLabel: 'Официально подтверждено (отображать на TV экранах)',
    settingsBtn: 'Настройки',
    pauseBtn: 'Приостановить',
    activateBtn: 'Активировать',
    onlineBadge: 'Онлайн',
    offlineBadge: 'Офлайн',
    blockedBadge: 'Заблокирован',
    pausedBadge: 'Приостановлен',
    scheduleCardLabel: 'Расписание',
    langProfileCardLabel: 'Язык и профиль',
    lastSyncCardLabel: 'Последняя синхронизация',
    monitorSettingsTitle: 'Настройки монитора',
    saveBtn: 'Сохранить',
    savingBtn: 'Сохранение...',
    newPremiumDesignsHeading: 'НОВЫЕ ПРЕМИУМ ДИЗАЙНЫ',
    newPremiumDesignsSubtitle:
      'Выбирайте независимый премиум-дизайн для каждого монитора, просматривайте на полном экране и сохраняйте в Firestore без потери расписания.',
    classicDesignsHeading: 'Классические профили (4 шт.)',
    dedicatedTabloHeading: 'Независимое табло на узбекской кириллице (/masjid-tv)',
    selectDesignBtn: 'Выбрать дизайн',
    selectedDesignBadge: 'Активный дизайн',
    previewFullscreenBtn: 'Полный экран',
    restorePreviousDesignBtn: 'Вернуть прежний дизайн',
    targetMonitorLabel: 'Целевой монитор для применения',
    openMasjidTvBtn: 'Открыть табло /masjid-tv',
    profileDescriptions: {
      royal_ivory: 'Светлый фон слоновой кости, золотая линия и зелёная панель отсчёта',
      emerald_royal: 'Глубокий изумрудный 2-колоночный премиум макет с крупными часами',
      modern_minimal: 'Чистая 5-колоночная таблица намаза без лишнего декора',
      madina_portrait: 'Специальная вертикальная композиция для 1080×1920 экранов',
      sultan_royal: 'Глубокий изумруд, золотая геометрия и величественная типографика намаза',
      noor_classic: 'Светлый мрамор и слоновая кость с тонкими золотыми линиями для дальнего чтения',
      midnight_premium: 'Ночной режим: глубокий синий и тёмный изумруд, серебро и контрастные белые цифры',
      vision_modern: 'Современный минимализм с выверенными колонками и фокусом на расписании',
      islamic_heritage: 'Изумрудно-кремовая архитектурная рамка с деликатными геометрическими узорами',
      masjid_al_nabawi: 'На основе монитора Масджид ан-Набави: центральные часы, 5 строк и зелёный баннер',
      masjid_namoz_tablosa_uz_cyrl: 'Независимое табло намаза /masjid-tv строго на узбекской кириллице',
    },
  },
};

const EN_BUNDLE: SmartDisplayLocaleBundle = {
  brandTitle: 'ASAKA ZIYO',
  mosqueSubtitleDefault: 'MuhammadSolih Hoji Jome Mosque',
  dateLabel: 'Date',
  clockLabel: 'Clock',
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
  timeColumnLabel: 'Prayer',
  prayerColumnLabel: 'Prayer',
  sunriseLabel: 'Sunrise',
  ishraqLabel: 'Ishraq',
  duhaStartsAtLabel: 'Duha Starts At',
  nextAzanAfterLabel: 'Next Azan After',
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
  templateLabel: 'Profile',
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
  hijriMonths: [
    'Muharram',
    'Safar',
    'Rabi al-Awwal',
    'Rabi al-Thani',
    'Jumada al-Ula',
    'Jumada al-Thani',
    'Rajab',
    'Shaban',
    'Ramadan',
    'Shawwal',
    'Dhu al-Qadah',
    'Dhu al-Hijjah',
  ],
  templates: {
    royal_ivory: 'Royal Ivory',
    emerald_royal: 'Emerald Royal',
    modern_minimal: 'Modern Minimal',
    madina_portrait: 'Madina Portrait',
    sultan_royal: 'Sultan Royal',
    noor_classic: 'Noor Classic',
    midnight_premium: 'Midnight Premium',
    vision_modern: 'Vision Modern',
    islamic_heritage: 'Islamic Heritage',
    masjid_al_nabawi: 'Masjid Al-Nabawi',
    masjid_namoz_tablosa_uz_cyrl: 'Masjid Timetable (Uzbek Cyrillic)',
    classic_mosque: 'Royal Ivory',
    premium_emerald: 'Emerald Royal',
    minimal_modern: 'Modern Minimal',
  },
  admin: {
    headerTitle: 'ASAKA ZIYO — Smart Mosque Display Management',
    headerBadge: '24/7 TV & LED Screens',
    headerSubtitle:
      'Connect mosque and madrasa TV monitors via QR/6-digit code and centrally manage admin-verified prayer schedules, 5 languages, 11 design profiles, and announcements.',
    openDisplayBtn: 'Open /display Screen',
    refreshBtn: 'Refresh',
    addMonitorBtn: 'Add Monitor',
    kpiTotalMonitors: 'Total Monitors',
    kpiSchedulesCountSuffix: 'prayer schedules available',
    kpiOnlineScreens: 'Online Screens',
    kpiLiveHeartbeat: 'Live heartbeat connected',
    kpiOfflinePaused: 'Offline / Paused',
    kpiActiveAnnouncements: 'Active announcements',
    kpiScheduleAudit: 'Schedule Audit',
    kpiAccurate: 'Accurate',
    kpiAlertsSuffix: 'alerts',
    kpiFirestoreConnected: 'Firestore: Connected',
    kpiLocalFallback: 'Local fallback mode',
    tabMonitors: 'Monitors',
    tabSchedules: 'Prayer Schedules',
    tabAnnouncements: 'TV Announcements & Media',
    tabConnections: 'Connection History',
    registerMonitorTitle: 'Register New Smart TV / LED Monitor',
    monitorNameLabel: 'Monitor Name (unique) *',
    mosqueNameLabel: 'Mosque / Madrasa Name',
    locationLabel: 'Location / Hall Label',
    assignedScheduleLabel: 'Assigned Prayer Schedule',
    screenLanguageLabel: 'Screen Language (5 languages)',
    designProfileLabel: 'Design Profile',
    cancelBtn: 'Cancel',
    creatingBtn: 'Creating...',
    createAndGetQrBtn: 'Create & Get QR/Code',
    optionalTag: '(optional)',
    azanEntryCol: 'Adhan Time (HH:MM)',
    iqamahCongregationCol: 'Iqamah / Congregation (HH:MM)',
    officialConfirmedLabel: 'Officially verified (show actively on TV screens)',
    settingsBtn: 'Settings',
    pauseBtn: 'Pause',
    activateBtn: 'Activate',
    onlineBadge: 'Online',
    offlineBadge: 'Offline',
    blockedBadge: 'Blocked',
    pausedBadge: 'Paused',
    scheduleCardLabel: 'Schedule',
    langProfileCardLabel: 'Language & Profile',
    lastSyncCardLabel: 'Last sync',
    monitorSettingsTitle: 'Monitor Settings',
    saveBtn: 'Save',
    savingBtn: 'Saving...',
    newPremiumDesignsHeading: 'NEW PREMIUM DESIGNS',
    newPremiumDesignsSubtitle:
      'Select an independent premium design per monitor, preview fullscreen, and persist cleanly to Firestore without affecting prayer schedules.',
    classicDesignsHeading: 'Original Classic Profiles (4)',
    dedicatedTabloHeading: 'Dedicated Uzbek Cyrillic Mosque Board (/masjid-tv)',
    selectDesignBtn: 'Select Design',
    selectedDesignBadge: 'Active Design',
    previewFullscreenBtn: 'Preview Full Screen',
    restorePreviousDesignBtn: 'Restore Previous Design',
    targetMonitorLabel: 'Target monitor for design assignment',
    openMasjidTvBtn: 'Open /masjid-tv Board',
    profileDescriptions: {
      royal_ivory: 'Luminous warm ivory canvas with gold accent line and royal green countdown band',
      emerald_royal: 'Deep velvet mosque emerald 2-column composition with oversized clock',
      modern_minimal: 'Zero-ornament 5-column architectural prayer timetable',
      madina_portrait: 'Dedicated vertical pillar layout for 1080×1920 portrait monitors',
      sultan_royal: 'Deep royal emerald & gold architectural geometry with monumental prayer times',
      noor_classic: 'Bright luxury warm ivory & white marble styling engineered for long-distance legibility',
      midnight_premium: 'Calm night-mode deep navy & dark emerald with crisp silver and high-contrast white numerals',
      vision_modern: 'Clean Swiss-minimalist ivory architecture placing the prayer timetable center stage',
      islamic_heritage: 'Deep emerald & warm ivory architectural framing with restrained gold geometric motifs',
      masjid_al_nabawi: 'Faithful Masjid Al-Nabawi monitor composition: centered clock, 5 prayer rows & rich green banner',
      masjid_namoz_tablosa_uz_cyrl: 'Independent Uzbek Cyrillic-only prayer timetable screen at /masjid-tv',
    },
  },
};

// Dynamically generated using the project's official New Uzbek Alphabet transliterator
// (sh -> ş, ch -> ç, oʻ -> ö, gʻ -> ğ). Never mixed with standard uz-Latn.
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

export const DISPLAY_SUPPORTED_LOCALES: SupportedLocale[] = [
  'uz-Latn',
  'uz-Cyrl',
  'uz-Latn-new',
  'ru',
  'en',
];

export function getDisplayLocaleBundle(locale: SupportedLocale): SmartDisplayLocaleBundle {
  return DISPLAY_LOCALES[locale] || UZ_LATN_BUNDLE;
}

/**
 * Detects whether any character belongs to Unicode Arabic script blocks.
 */
export function containsArabicScript(text?: string | null): boolean {
  if (!text) return false;
  DISPLAY_ARABIC_SCRIPT_REGEX.lastIndex = 0;
  return DISPLAY_ARABIC_SCRIPT_REGEX.test(text);
}

/**
 * Strips all Arabic Unicode script characters from dynamic Smart Mosque Display text.
 * Never transliterates Arabic into garbled Latin; if no readable non-Arabic text remains,
 * falls back cleanly to the provided localized fallback string.
 */
export function sanitizeDisplayDynamicText(
  text: string | undefined | null,
  locale: SupportedLocale,
  fallback = ''
): string {
  const raw = typeof text === 'string' ? text : '';
  const stripped = raw
    .replace(DISPLAY_ARABIC_SCRIPT_REGEX, ' ')
    .replace(/\(\s*\)/g, ' ')
    .replace(/\[\s*\]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s·\-–—|,:;/]+|[\s·\-–—|,:;/]+$/g, '')
    .trim();

  const candidate = stripped || fallback;
  if (!candidate) return '';

  // Ensure fallback itself is also completely free of Arabic script
  const safeCandidate = candidate.replace(DISPLAY_ARABIC_SCRIPT_REGEX, '').trim();
  if (!safeCandidate) return '';

  if (locale === 'uz-Latn-new') {
    return toNewUzbekAlphabet(safeCandidate);
  }
  return safeCandidate;
}

/**
 * Adapts dynamic Smart Mosque Display text for the active locale while strictly
 * preventing any Arabic script from ever reaching the display screen.
 */
export function adaptDisplayTextForLocale(
  text: string,
  locale: SupportedLocale,
  fallback = ''
): string {
  return sanitizeDisplayDynamicText(text, locale, fallback);
}

/**
 * Matches known Hijri month spellings across Uzbek Latin, Uzbek Cyrillic, Russian, and English
 * to canonical index 0..11 so Hijri dates render accurately in all 5 display languages.
 */
const HIJRI_MONTH_MATCHERS: RegExp[] = [
  /muharram|муҳаррам|мухаррам/i,
  /safar|сафар/i,
  /rabi\w*\s*(al[- ]?|ul[- ]?)?(avval|awwal|awal|1|i\b)|раби\w*\s*(ал[ьъ]?[- ]?|ул[- ]?)?(аввал|1)/i,
  /rabi\w*\s*(as[- ]?|al[- ]?|ul[- ]?)?(soniy|sani|thani|oxir|akhir|2|ii\b)|раби\w*\s*(ас[- ]?|ул[- ]?)?(соний|сани|охир|2)/i,
  /jum[oa]d\w*\s*(al[- ]?|ul[- ]?)?(avval|awwal|ula|1|i\b)|жумод\w*\s*(ул[- ]?)?(аввал|1)|джумада\s*(аль[- ]?)?(уля|авваль|1)/i,
  /jum[oa]d\w*\s*(as[- ]?|al[- ]?|ul[- ]?)?(oxir|akhir|soniy|sani|thani|2|ii\b)|жумод\w*\s*(ул[- ]?)?(охир|соний|2)|джумада\s*(ас[- ]?|аль[- ]?)?(сани|ахира|2)/i,
  /rajab|ражаб|раджаб/i,
  /sha[ʻ'’`ʼъ]?b[oa]n|ша[ъ']?бон|шаабан|шабан/i,
  /ramaz[oa]n|ramad[oa]n|рамазон|рамадан/i,
  /shavv[oa]l|shaww[oa]l|шаввол|шавваль/i,
  /zulq[ao][ʻ'’`ʼъ]?da|dhu\s*al[- ]?q[ao]d|зулқаъда|зуль[- ]?каада/i,
  /zulhijj[ao]|dhu\s*al[- ]?hijj|зулҳижжа|зуль[- ]?хиджа/i,
];

/**
 * Formats a Hijri date string cleanly in the selected display language (uz-Latn, uz-Cyrl, uz-Latn-new, ru, en).
 * Never emits Arabic script or malformed fallback text when empty/unparseable.
 */
export function localizeHijriDate(
  rawHijri: string | undefined | null,
  locale: SupportedLocale
): string {
  const cleaned = sanitizeDisplayDynamicText(rawHijri, 'uz-Latn', '');
  if (!cleaned) return '';

  const bundle = getDisplayLocaleBundle(locale);

  // Extract day (1-2 digits) and Hijri year (4 digits, e.g. 1447/1448)
  const dayMatch = cleaned.match(/\b(\d{1,2})\b/);
  const yearMatch = cleaned.match(/\b(1[345]\d{2})\b/);
  const day = dayMatch ? dayMatch[1] : '';
  const year = yearMatch ? yearMatch[1] : '';

  const monthIdx = HIJRI_MONTH_MATCHERS.findIndex((re) => re.test(cleaned));
  if (monthIdx >= 0) {
    const localizedMonth = bundle.hijriMonths[monthIdx];
    const parts = [day, localizedMonth, year].filter(Boolean);
    return parts.join(' ');
  }

  // If raw string had readable non-Arabic text with no known month keyword, sanitize & adapt safely
  if (day || year) {
    return sanitizeDisplayDynamicText(cleaned, locale, '');
  }
  return '';
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
