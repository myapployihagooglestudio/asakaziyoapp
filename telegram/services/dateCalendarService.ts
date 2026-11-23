/**
 * ASAKA ZIYO — Single Authoritative Date, Timezone & Hijri Calendar Service
 *
 * Eliminates all hardcoded/stale Gregorian and Hijri dates across Telegram Bot,
 * Channel Posts, Scheduled Notifications, Web App, and Masjid TV.
 *
 * Rules:
 * 1. Canonical timezone is ALWAYS Asia/Tashkent (UTC+5) — never raw server UTC.
 * 2. Admin-verified Asaka prayer times are NEVER modified or recalculated here;
 *    this service resolves ONLY the Gregorian and Hijri calendar dates dynamically.
 * 3. Supports all 5 official ASAKA ZIYO locales with pure script integrity
 *    (uz-Latn, uz-Cyrl, uz-Latn-new, ru, en — zero mixed Cyrillic/Kazakh chars).
 * 4. Supports admin-configurable Hijri moon-sighting offset (-2..+2 days) and
 *    optional Maghrib sunset transition rule using Asaka's verified Shom time.
 * 5. Zero plain Unicode emojis in this module (strict Telegram Premium Emoji rule).
 */

import type { TelegramLocale } from '../types';

export type HijriBoundaryMode = 'civil' | 'maghrib';

export interface DateResolutionOptions {
  /** Admin-configurable moon-sighting offset in days (-2..+2). Default: 0 */
  hijriOffsetDays?: number;
  /** 'civil' switches Hijri date at 00:00 Asia/Tashkent; 'maghrib' switches at verified Shom time */
  hijriBoundaryMode?: HijriBoundaryMode;
  /** Verified Asaka Shom HH:MM time (used only when hijriBoundaryMode === 'maghrib') */
  shomTimeHHMM?: string;
}

export interface TashkentCalendarParts {
  year: number;
  month: number; // 1..12
  day: number; // 1..31
  hour: number; // 0..23
  minute: number; // 0..59
  second: number; // 0..59
  dayOfWeek: number; // 0=Sun..6=Sat
  dateKey: string; // YYYY-MM-DD
  hhmm: string; // HH:MM
  totalMinutes: number;
  isFriday: boolean;
}

export interface ResolvedHijriDate {
  day: number;
  monthNumber: number; // 1..12
  year: number;
  monthName: string;
  formatted: string;
  offsetDaysApplied: number;
  shiftedAfterMaghrib: boolean;
  source: 'icu_umalqura' | 'tabular_fallback';
}

export interface ResolvedAsakaDateContext {
  timezone: 'Asia/Tashkent';
  dateKey: string;
  hhmm: string;
  dayOfWeek: number;
  isFriday: boolean;
  gregorian: {
    year: number;
    month: number;
    day: number;
    monthName: string;
    weekdayName: string;
    formatted: string;
  };
  hijri: ResolvedHijriDate;
}

export const ASAKA_TIMEZONE = 'Asia/Tashkent' as const;

const GREGORIAN_MONTHS: Record<TelegramLocale, readonly string[]> = {
  'uz-Latn': [
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
  'uz-Cyrl': [
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
  'uz-Latn-new': [
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
  ru: [
    'января',
    'февраля',
    'марта',
    'апреля',
    'мая',
    'июня',
    'июля',
    'августа',
    'сентября',
    'октября',
    'ноября',
    'декабря',
  ],
  en: [
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
};

// Pure Uzbek Cyrillic weekdays (explicitly fixes "Дүшанба" -> "Душанба")
const GREGORIAN_WEEKDAYS: Record<TelegramLocale, readonly string[]> = {
  'uz-Latn': [
    'Yakshanba',
    'Dushanba',
    'Seshanba',
    'Chorshanba',
    'Payshanba',
    'Juma',
    'Shanba',
  ],
  'uz-Cyrl': [
    'Якшанба',
    'Душанба',
    'Сешанба',
    'Чоршанба',
    'Пайшанба',
    'Жума',
    'Шанба',
  ],
  'uz-Latn-new': [
    'Yakşanba',
    'Duşanba',
    'Seşanba',
    'Çorşanba',
    'Payşanba',
    'Juma',
    'Şanba',
  ],
  ru: [
    'Воскресенье',
    'Понедельник',
    'Вторник',
    'Среда',
    'Четверг',
    'Пятница',
    'Суббота',
  ],
  en: [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ],
};

const HIJRI_MONTHS: Record<TelegramLocale, readonly string[]> = {
  'uz-Latn': [
    'Muharram',
    'Safar',
    'Rabiul avval',
    'Rabiul oxir',
    'Jumodul avval',
    'Jumodul oxir',
    'Rajab',
    'Shaʼbon',
    'Ramazon',
    'Shavvol',
    'Zulqaʼda',
    'Zulhijja',
  ],
  'uz-Cyrl': [
    'Муҳаррам',
    'Сафар',
    'Рабиул аввал',
    'Рабиул охир',
    'Жумодул аввал',
    'Жумодул охир',
    'Ражаб',
    'Шаъбон',
    'Рамазон',
    'Шаввол',
    'Зулқаъда',
    'Зулҳижжа',
  ],
  'uz-Latn-new': [
    'Muharram',
    'Safar',
    'Rabiul avval',
    'Rabiul oxir',
    'Jumodul avval',
    'Jumodul oxir',
    'Rajab',
    'Şaʼbon',
    'Ramazon',
    'Şavvol',
    'Zulqaʼda',
    'Zulhijja',
  ],
  ru: [
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
  en: [
    'Muharram',
    'Safar',
    'Rabi al-Awwal',
    'Rabi al-Thani',
    'Jumada al-Ula',
    'Jumada al-Akhirah',
    'Rajab',
    'Shaban',
    'Ramadan',
    'Shawwal',
    'Dhul Qadah',
    'Dhul Hijjah',
  ],
};

function normalizeLocale(locale?: string): TelegramLocale {
  if (
    locale === 'uz-Latn' ||
    locale === 'uz-Cyrl' ||
    locale === 'uz-Latn-new' ||
    locale === 'ru' ||
    locale === 'en'
  ) {
    return locale;
  }
  return 'uz-Latn';
}

export function clampHijriOffset(offset?: number): number {
  if (typeof offset !== 'number' || !Number.isFinite(offset)) return 0;
  return Math.max(-2, Math.min(2, Math.trunc(offset)));
}

function parseHHMMToMinutes(value?: string): number | null {
  if (!value) return null;
  const m = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Extracts exact local date & time parts in Asia/Tashkent (UTC+5) using Intl.
 */
export function getTashkentCalendarParts(now: Date = new Date()): TashkentCalendarParts {
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: ASAKA_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      weekday: 'short',
    });
    const parts = fmt.formatToParts(now);
    const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
    const year = Number(get('year')) || now.getUTCFullYear();
    const month = Number(get('month')) || now.getUTCMonth() + 1;
    const day = Number(get('day')) || now.getUTCDate();
    const rawHour = Number(get('hour'));
    const hour = Number.isFinite(rawHour) ? rawHour % 24 : 0;
    const minute = Number(get('minute')) || 0;
    const second = Number(get('second')) || 0;
    const wkMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    const dayOfWeek = wkMap[get('weekday')] ?? new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    const dateKey = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const hhmm = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    return {
      year,
      month,
      day,
      hour,
      minute,
      second,
      dayOfWeek,
      dateKey,
      hhmm,
      totalMinutes: hour * 60 + minute,
      isFriday: dayOfWeek === 5,
    };
  } catch {
    // Deterministic UTC+5 arithmetic fallback
    const tashkent = new Date(now.getTime() + 5 * 3600_000);
    const year = tashkent.getUTCFullYear();
    const month = tashkent.getUTCMonth() + 1;
    const day = tashkent.getUTCDate();
    const hour = tashkent.getUTCHours();
    const minute = tashkent.getUTCMinutes();
    const second = tashkent.getUTCSeconds();
    const dayOfWeek = tashkent.getUTCDay();
    return {
      year,
      month,
      day,
      hour,
      minute,
      second,
      dayOfWeek,
      dateKey: `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      hhmm: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      totalMinutes: hour * 60 + minute,
      isFriday: dayOfWeek === 5,
    };
  }
}

/**
 * Parses a YYYY-MM-DD calendar date key into a Date pinned to midday Asia/Tashkent
 * so timezone boundaries never accidentally roll it backward or forward.
 */
export function dateKeyToTashkentMidday(dateKey: string): Date {
  const m = dateKey.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return new Date();
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  // 12:00 Asia/Tashkent === 07:00 UTC
  return new Date(Date.UTC(y, mo - 1, d, 7, 0, 0));
}

/**
 * Formats Gregorian date cleanly in any of the 5 ASAKA ZIYO locales.
 */
export function formatGregorianDateForLocale(
  now: Date = new Date(),
  locale: TelegramLocale = 'uz-Latn'
): {
  year: number;
  month: number;
  day: number;
  monthName: string;
  weekdayName: string;
  formatted: string;
} {
  const loc = normalizeLocale(locale);
  const parts = getTashkentCalendarParts(now);
  const monthIdx = Math.max(0, Math.min(11, parts.month - 1));
  const wkIdx = Math.max(0, Math.min(6, parts.dayOfWeek));
  const monthName = GREGORIAN_MONTHS[loc][monthIdx];
  const weekdayName = GREGORIAN_WEEKDAYS[loc][wkIdx];

  let formatted: string;
  if (loc === 'ru') {
    formatted = `${parts.day} ${monthName}, ${weekdayName}, ${parts.year}`;
  } else if (loc === 'en') {
    formatted = `${parts.day} ${monthName}, ${weekdayName}, ${parts.year}`;
  } else {
    formatted = `${parts.day}-${monthName}, ${weekdayName}, ${parts.year}`;
  }

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    monthName,
    weekdayName,
    formatted,
  };
}

/**
 * Kuwaiti tabular Islamic calendar fallback (pure math, zero external dependency).
 * Used ONLY if the runtime lacks ICU `islamic-umalqura` calendar data.
 */
function gregorianToTabularHijri(year: number, month: number, day: number): {
  year: number;
  month: number;
  day: number;
} {
  const m = month > 2 ? month : month + 12;
  const y = month > 2 ? year : year - 1;
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  const jd =
    Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524;

  const l0 = jd - 1948440 + 10632;
  const n = Math.floor((l0 - 1) / 10631);
  const l1 = l0 - 10631 * n + 354;
  const j =
    Math.floor((10985 - l1) / 5316) * Math.floor((50 * l1) / 17719) +
    Math.floor(l1 / 5670) * Math.floor((43 * l1) / 15238);
  const l2 =
    l1 -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const hMonth = Math.floor((24 * l2) / 709);
  const hDay = l2 - Math.floor((709 * hMonth) / 24);
  const hYear = 30 * n + j - 30;
  return {
    year: hYear,
    month: Math.max(1, Math.min(12, hMonth)),
    day: Math.max(1, Math.min(30, hDay)),
  };
}

/**
 * Resolves live Hijri date in Asia/Tashkent with optional admin day offset (-2..+2)
 * and optional Maghrib sunset boundary transition.
 */
export function resolveDynamicHijriDate(
  now: Date = new Date(),
  locale: TelegramLocale = 'uz-Latn',
  options?: DateResolutionOptions
): ResolvedHijriDate {
  const loc = normalizeLocale(locale);
  const offsetDays = clampHijriOffset(options?.hijriOffsetDays);
  const boundaryMode: HijriBoundaryMode = options?.hijriBoundaryMode || 'civil';
  const parts = getTashkentCalendarParts(now);

  let shiftedAfterMaghrib = false;
  if (boundaryMode === 'maghrib' && options?.shomTimeHHMM) {
    const shomMin = parseHHMMToMinutes(options.shomTimeHHMM);
    if (shomMin !== null && parts.totalMinutes >= shomMin) {
      shiftedAfterMaghrib = true;
    }
  }

  const totalDayShift = offsetDays + (shiftedAfterMaghrib ? 1 : 0);
  // Anchor to Tashkent local calendar date at 12:00 Tashkent time, then apply day shift cleanly
  const shiftedDate = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + totalDayShift, 7, 0, 0)
  );

  let hDay = 1;
  let hMonth = 1;
  let hYear = 1448;
  let source: 'icu_umalqura' | 'tabular_fallback' = 'icu_umalqura';

  try {
    const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      timeZone: ASAKA_TIMEZONE,
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
    const hParts = fmt.formatToParts(shiftedDate);
    const parsedDay = Number(hParts.find((p) => p.type === 'day')?.value);
    const parsedMonth = Number(hParts.find((p) => p.type === 'month')?.value);
    const parsedYear = Number(hParts.find((p) => p.type === 'year')?.value);
    if (
      Number.isFinite(parsedDay) &&
      parsedDay >= 1 &&
      parsedDay <= 30 &&
      Number.isFinite(parsedMonth) &&
      parsedMonth >= 1 &&
      parsedMonth <= 12 &&
      Number.isFinite(parsedYear) &&
      parsedYear >= 1400 &&
      parsedYear <= 1600
    ) {
      hDay = parsedDay;
      hMonth = parsedMonth;
      hYear = parsedYear;
    } else {
      throw new Error('ICU islamic-umalqura returned out-of-range parts');
    }
  } catch {
    source = 'tabular_fallback';
    const shiftedParts = getTashkentCalendarParts(shiftedDate);
    const tab = gregorianToTabularHijri(shiftedParts.year, shiftedParts.month, shiftedParts.day);
    hDay = tab.day;
    hMonth = tab.month;
    hYear = tab.year;
  }

  const monthName = HIJRI_MONTHS[loc][Math.max(0, Math.min(11, hMonth - 1))];
  return {
    day: hDay,
    monthNumber: hMonth,
    year: hYear,
    monthName,
    formatted: `${hDay} ${monthName}, ${hYear}`,
    offsetDaysApplied: offsetDays,
    shiftedAfterMaghrib,
    source,
  };
}

/**
 * Single canonical resolver returning both Gregorian and Hijri dates for `now` in Asia/Tashkent.
 */
export function resolveAsakaDateContext(
  now: Date = new Date(),
  locale: TelegramLocale = 'uz-Latn',
  options?: DateResolutionOptions
): ResolvedAsakaDateContext {
  const loc = normalizeLocale(locale);
  const parts = getTashkentCalendarParts(now);
  const gregorian = formatGregorianDateForLocale(now, loc);
  const hijri = resolveDynamicHijriDate(now, loc, options);

  return {
    timezone: ASAKA_TIMEZONE,
    dateKey: parts.dateKey,
    hhmm: parts.hhmm,
    dayOfWeek: parts.dayOfWeek,
    isFriday: parts.isFriday,
    gregorian,
    hijri,
  };
}

/**
 * Convenience helper for resolving localized date strings for a YYYY-MM-DD key
 * (used by Daily Content Archive, Web App Home, and Scheduler records).
 */
export function resolveAsakaDateContextForDateKey(
  dateKey: string,
  locale: TelegramLocale = 'uz-Latn',
  options?: DateResolutionOptions
): ResolvedAsakaDateContext {
  return resolveAsakaDateContext(dateKeyToTashkentMidday(dateKey), locale, options);
}
