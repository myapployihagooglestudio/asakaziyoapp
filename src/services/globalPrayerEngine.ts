/**
 * ASAKA ZIYO — GLOBAL PRAYER TIMES ENGINE 2026
 * Deterministic astronomical ephemeris (Jean Meeus / PrayTimes formulation)
 * with full IANA timezone + Daylight Saving Time (DST) awareness,
 * 9 calculation methods (including Uzbekistan O'MI calibration & Umm al-Qura),
 * Hanafi/Standard Asr, High-Latitude adjustment, Midnight calculation,
 * Qibla spherical bearing, and strict Asaka MANUAL_ADMIN protection.
 */

import {
  ASAKA_CANONICAL_CITY_ID,
  AsrMethodId,
  CalculationMethodId,
  CityLocationDefinition,
  HighLatitudeRuleId,
  MidnightModeId,
  PrayerSourceMode,
} from '../data/globalLocationsData';
import { PrayerSchedule, PrayerTimeEntry } from '../types';

export interface CalculationMethodParams {
  id: CalculationMethodId;
  name: string;
  nameUz: string;
  fajrAngle: number;
  ishaAngle?: number;
  ishaMinutesAfterMaghrib?: number;
  maghribMinutesOffset?: number; // precaution minutes after sunset
  dhuhrMinutesOffset?: number;   // zenith precaution
  fajrMinutesOffset?: number;
  asrMinutesOffset?: number;
  ishaMinutesOffset?: number;
  defaultAsr: AsrMethodId;
  descriptionUz: string;
}

export const CALCULATION_METHODS: Record<CalculationMethodId, CalculationMethodParams> = {
  UZBEKISTAN_OMI: {
    id: 'UZBEKISTAN_OMI',
    name: 'Uzbekistan Muslim Board (O‘MI) Calibration',
    nameUz: 'O‘zbekiston Musulmonlari Idorasi (O‘MI) usuli',
    fajrAngle: 15.5,
    ishaAngle: 14.0,
    dhuhrMinutesOffset: 3,
    maghribMinutesOffset: 3,
    defaultAsr: 'HANAFI',
    descriptionUz: 'O‘MI taqvimiga moslashtirilgan Hanafiy hisoblash usuli (Bomdod 15.5°, Xufton 14°, Asr Hanafiy, Shom +3 daqiqa ehtiyot)',
  },
  UMM_AL_QURA: {
    id: 'UMM_AL_QURA',
    name: 'Umm al-Qura University, Makkah',
    nameUz: 'Ummul-Quro universiteti (Makka)',
    fajrAngle: 18.5,
    ishaMinutesAfterMaghrib: 90,
    dhuhrMinutesOffset: 1,
    maghribMinutesOffset: 1,
    defaultAsr: 'STANDARD',
    descriptionUz: 'Saudiya Arabistoni (Makka va Madina) rasmiy usuli (Bomdod 18.5°, Xufton Shomdan 90 daqiqa keyin)',
  },
  MWL: {
    id: 'MWL',
    name: 'Muslim World League (MWL)',
    nameUz: 'Islom Olami Ligasi (MWL)',
    fajrAngle: 18.0,
    ishaAngle: 17.0,
    dhuhrMinutesOffset: 1,
    maghribMinutesOffset: 1,
    defaultAsr: 'STANDARD',
    descriptionUz: 'Yevropa, Uzoq Sharq va xalqaro hududlarda keng qo‘llaniladigan usul (18° / 17°)',
  },
  KARACHI: {
    id: 'KARACHI',
    name: 'University of Islamic Sciences, Karachi',
    nameUz: 'Karachi Islom Fanlari Universiteti',
    fajrAngle: 18.0,
    ishaAngle: 18.0,
    dhuhrMinutesOffset: 1,
    maghribMinutesOffset: 1,
    defaultAsr: 'HANAFI',
    descriptionUz: 'Janubiy va Markaziy Osiyoda qo‘llaniladigan Hanafiy usuli (18° / 18°)',
  },
  ISNA: {
    id: 'ISNA',
    name: 'Islamic Society of North America (ISNA)',
    nameUz: 'Shimoliy Amerika Islom Jamiyati (ISNA)',
    fajrAngle: 15.0,
    ishaAngle: 15.0,
    dhuhrMinutesOffset: 1,
    maghribMinutesOffset: 1,
    defaultAsr: 'STANDARD',
    descriptionUz: 'AQSh va Kanada hududlari uchun rasmiy usul (15° / 15°)',
  },
  EGYPT: {
    id: 'EGYPT',
    name: 'Egyptian General Authority of Survey',
    nameUz: 'Misr Bosh Geodeziya Boshqarmasi',
    fajrAngle: 19.5,
    ishaAngle: 17.5,
    dhuhrMinutesOffset: 1,
    maghribMinutesOffset: 1,
    defaultAsr: 'STANDARD',
    descriptionUz: 'Afrika va Yaqin Sharq mamlakatlarida qo‘llaniladigan usul (19.5° / 17.5°)',
  },
  DIYANET_TURKEY: {
    id: 'DIYANET_TURKEY',
    name: 'Diyanet İşleri Başkanlığı (Turkey)',
    nameUz: 'Turkiya Diyonat Boshqarmasi (Diyanet)',
    fajrAngle: 18.0,
    ishaAngle: 17.0,
    dhuhrMinutesOffset: 5,
    asrMinutesOffset: 4,
    maghribMinutesOffset: 7,
    defaultAsr: 'STANDARD',
    descriptionUz: 'Turkiya shaharlari (Istanbul, Anqara) uchun Diyonat tamkinli hisobi',
  },
  DUBAI: {
    id: 'DUBAI',
    name: 'Dubai (IACAD / UAE Official)',
    nameUz: 'BAA (Dubay va Abu-Dabi rasmiy usuli)',
    fajrAngle: 18.2,
    ishaAngle: 18.2,
    dhuhrMinutesOffset: 3,
    maghribMinutesOffset: 3,
    defaultAsr: 'STANDARD',
    descriptionUz: 'Birlashgan Arab Amirliklari rasmiy hisoblash usuli (18.2° / 18.2°)',
  },
  RUSSIA_DUM: {
    id: 'RUSSIA_DUM',
    name: 'Spiritual Administration of Muslims of Russia (DUM RF)',
    nameUz: 'Rossiya Musulmonlari Diniy Boshqarmasi (DUM RF)',
    fajrAngle: 16.0,
    ishaAngle: 15.0,
    dhuhrMinutesOffset: 2,
    maghribMinutesOffset: 2,
    defaultAsr: 'HANAFI',
    descriptionUz: 'Rossiya va shimoliy kengliklar uchun moslashtirilgan usul (16° / 15°)',
  },
};

/**
 * Unified Prayer Times Data Architecture Record (Section 6 specification)
 */
export interface UnifiedPrayerRecord {
  countryCode: string;
  countryName: string;
  regionId: string;
  regionName: string;
  cityId: string;
  cityName: string;
  districtId: string;
  districtName: string;
  latitude: number;
  longitude: number;
  timezone: string;
  utcOffsetMinutes: number;
  isDstActive: boolean;
  localDate: string; // YYYY-MM-DD in city's own IANA timezone
  localTimeNow: string; // HH:mm:ss in city's own IANA timezone
  formattedLocalDate: string;
  hijriDate: string;
  qiblaAngleDeg: number;
  tahajjud: string;
  subh: string;
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  midnight: string;
  times: PrayerTimeEntry[];
  sourceMode: PrayerSourceMode;
  sourceName: string;
  calculationMethod: CalculationMethodId | 'MANUAL_ADMIN';
  calculationMethodLabel: string;
  asrMethod: AsrMethodId | 'MANUAL_ADMIN';
  highLatitudeRule: HighLatitudeRuleId;
  midnightMode: MidnightModeId;
  verified: boolean;
  verificationNote?: string;
  lastUpdatedAt: string;
  scheduleVersion: number;
  adminApproved: boolean;
  isStale?: boolean;
  staleWarning?: string;
  nextPrayer: {
    key: string;
    nameUz: string;
    time: string;
    secondsRemaining: number;
    countdownText: string;
    isTomorrow: boolean;
    currentPrayerKey: string;
    progressPercent: number;
  };
}

export interface PrayerCalculationOptions {
  method?: CalculationMethodId;
  asrMethod?: AsrMethodId;
  highLatitudeRule?: HighLatitudeRuleId;
  midnightMode?: MidnightModeId;
  minuteAdjustments?: Partial<Record<'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha', number>>;
  verifiedOverride?: boolean;
  sourceNameOverride?: string;
  verificationNote?: string;
  officialDailyTimesOverride?: {
    fajr: string;
    sunrise: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
    sourceName: string;
    verified: boolean;
    verificationNote?: string;
  };
}

// ---------------------------------------------------------------------------
// Trigonometric & Julian Ephemeris Helpers (Degrees)
// ---------------------------------------------------------------------------
const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

const dsin = (d: number) => Math.sin(d * D2R);
const dcos = (d: number) => Math.cos(d * D2R);
const dtan = (d: number) => Math.tan(d * D2R);
const darcsin = (x: number) => Math.asin(Math.max(-1, Math.min(1, x))) * R2D;
const darccos = (x: number) => Math.acos(Math.max(-1, Math.min(1, x))) * R2D;
const darctan2 = (y: number, x: number) => Math.atan2(y, x) * R2D;
const darccot = (x: number) => Math.atan(1 / x) * R2D;

function fixAngle(a: number): number {
  let r = a - 360 * Math.floor(a / 360);
  if (r < 0) r += 360;
  return r;
}

function fixHour(h: number): number {
  let r = h - 24 * Math.floor(h / 24);
  if (r < 0) r += 24;
  return r;
}

function julianDate(year: number, month: number, day: number): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + B - 1524.5;
}

function sunPosition(jd: number): { declination: number; equationOfTime: number } {
  const D = jd - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * D);
  const q = fixAngle(280.459 + 0.98564736 * D);
  const L = fixAngle(q + 1.915 * dsin(g) + 0.020 * dsin(2 * g));
  const e = 23.439 - 0.00000036 * D;
  const RA = darctan2(dcos(e) * dsin(L), dcos(L)) / 15;
  const eqt = q / 15 - fixHour(RA);
  const decl = darcsin(dsin(e) * dsin(L));
  return { declination: decl, equationOfTime: eqt };
}

// ---------------------------------------------------------------------------
// IANA Timezone & Daylight Saving Time (DST) Accurate Local Date Utilities
// ---------------------------------------------------------------------------

/**
 * Returns local calendar date (YYYY-MM-DD), time (HH:mm:ss), and exact UTC offset in minutes
 * for ANY IANA timezone (including automatic DST detection!).
 */
export function getLocalDateTimeInTimezone(
  timezone: string,
  now: Date = new Date()
): {
  localDate: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  localTimeNow: string;
  totalSeconds: number;
  utcOffsetMinutes: number;
  isDstActive: boolean;
} {
  let safeTz = timezone || 'Asia/Tashkent';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: safeTz }).format(now);
  } catch {
    safeTz = 'Asia/Tashkent';
  }

  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: safeTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = fmt.formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hour = get('hour') % 24;
  const minute = get('minute');
  const second = get('second');

  const utcOffsetMinutes = getTimezoneOffsetMinutesForDate(safeTz, year, month, day, hour, minute);
  const janOffset = getTimezoneOffsetMinutesForDate(safeTz, year, 1, 15, 12, 0);
  const julOffset = getTimezoneOffsetMinutesForDate(safeTz, year, 7, 15, 12, 0);
  const standardOffset = Math.min(janOffset, julOffset);
  const isDstActive = janOffset !== julOffset && utcOffsetMinutes > standardOffset;

  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    localDate: `${year}-${pad(month)}-${pad(day)}`,
    year,
    month,
    day,
    hour,
    minute,
    second,
    localTimeNow: `${pad(hour)}:${pad(minute)}:${pad(second)}`,
    totalSeconds: hour * 3600 + minute * 60 + second,
    utcOffsetMinutes,
    isDstActive,
  };
}

/**
 * Computes exact UTC offset in minutes for a specific calendar date (YYYY-MM-DD) in an IANA timezone,
 * ensuring future/past dates accurately reflect Daylight Saving Time transitions.
 */
export function getTimezoneOffsetMinutesForDate(
  timezone: string,
  year: number,
  month: number,
  day: number,
  hour = 12,
  minute = 0
): number {
  let safeTz = timezone || 'Asia/Tashkent';
  try {
    const probeUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: safeTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    const parts = fmt.formatToParts(probeUtc);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0);
    const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
    return Math.round((asUtc - probeUtc.getTime()) / 60000);
  } catch {
    return 300; // Asia/Tashkent fallback (+5h)
  }
}

/**
 * Great-circle Qibla bearing from any coordinate to Kaaba (21.4225° N, 39.8262° E).
 */
export function calculateQiblaBearing(latitude: number, longitude: number): number {
  const kaabaLat = 21.4225 * D2R;
  const kaabaLon = 39.8262 * D2R;
  const lat = latitude * D2R;
  const lon = longitude * D2R;
  const dLon = kaabaLon - lon;
  const y = Math.sin(dLon);
  const x = Math.cos(lat) * Math.tan(kaabaLat) - Math.sin(lat) * Math.cos(dLon);
  const brng = Math.atan2(y, x) * R2D;
  return Math.round(((brng % 360) + 360) % 360);
}

/**
 * Formats fractional local hour (0..24) into "HH:MM" rounded to nearest minute.
 */
function formatHourToHHMM(rawHour: number): string {
  if (!Number.isFinite(rawHour)) return '--:--';
  const normalized = fixHour(rawHour);
  let totalMinutes = Math.round(normalized * 60);
  totalMinutes = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function hhmmToMinutes(hhmm: string): number {
  const m = String(hhmm || '').trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return 0;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function minutesToHHMM(mins: number): string {
  const norm = ((Math.round(mins) % 1440) + 1440) % 1440;
  return `${String(Math.floor(norm / 60)).padStart(2, '0')}:${String(norm % 60).padStart(2, '0')}`;
}

function formatUzbekGregorianDate(year: number, month: number, day: number): string {
  const months = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
  ];
  const weekdays = [
    'Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba',
  ];
  const dt = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return `${day}-${months[(month - 1) % 12]}, ${weekdays[dt.getUTCDay()]}, ${year}`;
}

function computeHijriDateLabel(year: number, month: number, day: number): string {
  try {
    const dt = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
    const parts = fmt.formatToParts(dt);
    const hDay = Number(parts.find((p) => p.type === 'day')?.value || 1);
    const hMonth = Number(parts.find((p) => p.type === 'month')?.value || 1);
    const hYear = Number(parts.find((p) => p.type === 'year')?.value || 1448);
    const uzHijriMonths = [
      'Muharram', 'Safar', 'Rabiul avval', 'Rabiul oxir',
      'Jumodul avval', 'Jumodul oxir', 'Rajab', 'Sha‘bon',
      'Ramazon', 'Shavvol', 'Zulqa‘da', 'Zulhijja',
    ];
    return `${hDay} ${uzHijriMonths[(hMonth - 1) % 12]}, ${hYear}`;
  } catch {
    return '1448 Hijriy';
  }
}

/**
 * Core Astronomical Solar Prayer Time Solver (returns fractional hours in local timezone).
 */
export function computeAstronomicalPrayerHours(params: {
  year: number;
  month: number;
  day: number;
  latitude: number;
  longitude: number;
  utcOffsetHours: number;
  method: CalculationMethodId;
  asrMethod: AsrMethodId;
  highLatitudeRule: HighLatitudeRuleId;
  midnightMode: MidnightModeId;
  minuteAdjustments?: Partial<Record<'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha', number>>;
}): {
  tahajjud: string;
  subh: string;
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  midnight: string;
} {
  const cfg = CALCULATION_METHODS[params.method] || CALCULATION_METHODS.MWL;
  const jd = julianDate(params.year, params.month, params.day) - params.longitude / (15 * 24);
  const lat = params.latitude;

  // Iterative refinement (2 passes for sub-minute precision)
  let tFajr = 5 / 24;
  let tSunrise = 6 / 24;
  let tDhuhr = 12 / 24;
  let tAsr = 15 / 24;
  let tSunset = 18 / 24;
  let tIsha = 19.5 / 24;

  const midDay = (t: number) => {
    const { equationOfTime } = sunPosition(jd + t);
    return fixHour(12 - equationOfTime);
  };

  const sunAngleTime = (angle: number, t: number, ccw: boolean): number => {
    const { declination } = sunPosition(jd + t);
    const noon = midDay(t);
    const cosH =
      (-dsin(angle) - dsin(declination) * dsin(lat)) /
      (dcos(declination) * dcos(lat));
    if (cosH < -1 || cosH > 1) return Number.NaN;
    const h = darccos(cosH) / 15;
    return noon + (ccw ? -h : h);
  };

  const asrTime = (factor: number, t: number): number => {
    const { declination } = sunPosition(jd + t);
    const angle = -darccot(factor + dtan(Math.abs(lat - declination)));
    return sunAngleTime(angle, t, false);
  };

  const asrFactor = params.asrMethod === 'HANAFI' ? 2 : 1;
  const sunriseAngle = 0.833; // standard atmospheric refraction + solar semi-diameter

  for (let pass = 0; pass < 2; pass++) {
    const fajrH = sunAngleTime(cfg.fajrAngle, tFajr, true);
    const sunriseH = sunAngleTime(sunriseAngle, tSunrise, true);
    const dhuhrH = midDay(tDhuhr);
    const asrH = asrTime(asrFactor, tAsr);
    const sunsetH = sunAngleTime(sunriseAngle, tSunset, false);
    const ishaH =
      typeof cfg.ishaMinutesAfterMaghrib === 'number'
        ? sunsetH + cfg.ishaMinutesAfterMaghrib / 60
        : sunAngleTime(cfg.ishaAngle ?? 17, tIsha, false);

    if (Number.isFinite(fajrH)) tFajr = fajrH / 24;
    if (Number.isFinite(sunriseH)) tSunrise = sunriseH / 24;
    if (Number.isFinite(dhuhrH)) tDhuhr = dhuhrH / 24;
    if (Number.isFinite(asrH)) tAsr = asrH / 24;
    if (Number.isFinite(sunsetH)) tSunset = sunsetH / 24;
    if (Number.isFinite(ishaH)) tIsha = ishaH / 24;
  }

  const tzShift = params.utcOffsetHours - params.longitude / 15;
  let fajr = sunAngleTime(cfg.fajrAngle, tFajr, true) + tzShift;
  let sunrise = sunAngleTime(sunriseAngle, tSunrise, true) + tzShift;
  let dhuhr = midDay(tDhuhr) + tzShift + (cfg.dhuhrMinutesOffset || 0) / 60;
  let asr = asrTime(asrFactor, tAsr) + tzShift + (cfg.asrMinutesOffset || 0) / 60;
  let maghrib = sunAngleTime(sunriseAngle, tSunset, false) + tzShift + (cfg.maghribMinutesOffset || 0) / 60;
  let isha =
    typeof cfg.ishaMinutesAfterMaghrib === 'number'
      ? maghrib + cfg.ishaMinutesAfterMaghrib / 60
      : sunAngleTime(cfg.ishaAngle ?? 17, tIsha, false) + tzShift + (cfg.ishaMinutesOffset || 0) / 60;

  // High-latitude fallback adjustments (for northern cities in summer e.g. Astana, London, Moscow)
  const nightDuration = fixHour(sunrise - maghrib);
  if (params.highLatitudeRule !== 'NONE' && Number.isFinite(nightDuration)) {
    const nightPortion = (angle: number) => {
      if (params.highLatitudeRule === 'MIDDLE_OF_NIGHT') return 0.5 * nightDuration;
      if (params.highLatitudeRule === 'SEVENTH_OF_NIGHT') return (1 / 7) * nightDuration;
      return (angle / 60) * nightDuration; // ANGLE_BASED
    };

    const fajrMax = nightPortion(cfg.fajrAngle);
    if (!Number.isFinite(fajr) || fixHour(sunrise - fajr) > fajrMax) {
      fajr = sunrise - fajrMax;
    }

    const ishaAngleEff = cfg.ishaAngle ?? 17;
    const ishaMax = nightPortion(ishaAngleEff);
    if (
      typeof cfg.ishaMinutesAfterMaghrib !== 'number' &&
      (!Number.isFinite(isha) || fixHour(isha - maghrib) > ishaMax)
    ) {
      isha = maghrib + ishaMax;
    }
  }

  // Apply optional per-prayer fine-tuning offsets
  const adj = params.minuteAdjustments || {};
  fajr += ((cfg.fajrMinutesOffset || 0) + (adj.fajr || 0)) / 60;
  sunrise += (adj.sunrise || 0) / 60;
  dhuhr += (adj.dhuhr || 0) / 60;
  asr += (adj.asr || 0) / 60;
  maghrib += (adj.maghrib || 0) / 60;
  isha += (adj.isha || 0) / 60;

  // Midnight & Last Third of Night (Tahajjud)
  const nightEnd = params.midnightMode === 'JAFARI' ? fajr : sunrise;
  const fullNight = fixHour(nightEnd - maghrib);
  const midnight = fixHour(maghrib + fullNight / 2);
  const lastThirdStart = fixHour(fajr - fixHour(fajr - maghrib) / 3);
  const subhImsak = fixHour(fajr - 10 / 60);

  return {
    tahajjud: formatHourToHHMM(lastThirdStart),
    subh: formatHourToHHMM(subhImsak),
    fajr: formatHourToHHMM(fajr),
    sunrise: formatHourToHHMM(sunrise),
    dhuhr: formatHourToHHMM(dhuhr),
    asr: formatHourToHHMM(asr),
    maghrib: formatHourToHHMM(maghrib),
    isha: formatHourToHHMM(isha),
    midnight: formatHourToHHMM(midnight),
  };
}

/**
 * Computes next prayer countdown strictly in the target city's IANA timezone.
 */
export function computeNextPrayerInTimezone(
  times: PrayerTimeEntry[],
  timezone: string,
  now: Date = new Date()
): UnifiedPrayerRecord['nextPrayer'] {
  const localNow = getLocalDateTimeInTimezone(timezone, now);
  const coreKeys = new Set(['bomdod', 'quyosh', 'peshin', 'asr', 'shom', 'xufton']);
  const ordered = times
    .filter((t) => coreKeys.has(t.key))
    .map((entry) => ({ entry, seconds: hhmmToMinutes(entry.time) * 60 }))
    .sort((a, b) => a.seconds - b.seconds);

  if (ordered.length === 0) {
    return {
      key: 'bomdod',
      nameUz: 'Bomdod',
      time: '--:--',
      secondsRemaining: 0,
      countdownText: '00:00:00',
      isTomorrow: false,
      currentPrayerKey: 'xufton',
      progressPercent: 0,
    };
  }

  const upcomingIdx = ordered.findIndex((p) => p.seconds > localNow.totalSeconds);
  let nextItem = ordered[0];
  let currentItem = ordered[ordered.length - 1];
  let secondsRemaining = 0;
  let isTomorrow = false;
  let progressPercent = 50;

  if (upcomingIdx !== -1) {
    nextItem = ordered[upcomingIdx];
    currentItem = upcomingIdx > 0 ? ordered[upcomingIdx - 1] : ordered[ordered.length - 1];
    secondsRemaining = nextItem.seconds - localNow.totalSeconds;
    if (upcomingIdx > 0) {
      const span = Math.max(1, nextItem.seconds - currentItem.seconds);
      progressPercent = Math.min(100, Math.max(0, Math.round(((localNow.totalSeconds - currentItem.seconds) / span) * 100)));
    } else {
      const span = Math.max(1, 86400 - currentItem.seconds + nextItem.seconds);
      const elapsed = 86400 - currentItem.seconds + localNow.totalSeconds;
      progressPercent = Math.min(100, Math.max(0, Math.round((elapsed / span) * 100)));
    }
  } else {
    isTomorrow = true;
    nextItem = ordered[0];
    currentItem = ordered[ordered.length - 1];
    secondsRemaining = 86400 - localNow.totalSeconds + nextItem.seconds;
    const span = Math.max(1, 86400 - currentItem.seconds + nextItem.seconds);
    const elapsed = localNow.totalSeconds - currentItem.seconds;
    progressPercent = Math.min(100, Math.max(0, Math.round((elapsed / span) * 100)));
  }

  const h = Math.floor(secondsRemaining / 3600);
  const m = Math.floor((secondsRemaining % 3600) / 60);
  const s = secondsRemaining % 60;

  return {
    key: nextItem.entry.key,
    nameUz: nextItem.entry.nameUz,
    time: nextItem.entry.time,
    secondsRemaining,
    countdownText: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
    isTomorrow,
    currentPrayerKey: currentItem.entry.key,
    progressPercent,
  };
}

/**
 * HARD GUARD: Never allow AUTO mode engine to overwrite Asaka MANUAL_ADMIN schedule.
 */
export function buildAsakaManualUnifiedRecord(
  adminSchedule: PrayerSchedule,
  asakaLocation: CityLocationDefinition,
  now: Date = new Date()
): UnifiedPrayerRecord {
  const tz = adminSchedule.timezone || 'Asia/Tashkent';
  const localNow = getLocalDateTimeInTimezone(tz, now);
  const getT = (key: string, fallback = '--:--') =>
    adminSchedule.times.find((t) => t.key === key)?.time || fallback;

  const scheduleDate = adminSchedule.date || localNow.localDate;
  const isDateDifferent = scheduleDate !== localNow.localDate;

  const maghribM = hhmmToMinutes(getT('shom', '17:21'));
  const sunriseM = hhmmToMinutes(getT('quyosh', '06:46'));
  const nightMins = ((sunriseM - maghribM) % 1440 + 1440) % 1440;
  const midnight = minutesToHHMM(maghribM + nightMins / 2);

  return {
    countryCode: 'UZ',
    countryName: 'O‘zbekiston',
    regionId: 'uz-andijan',
    regionName: 'Andijon viloyati',
    cityId: ASAKA_CANONICAL_CITY_ID,
    cityName: 'Asaka',
    districtId: 'asaka-tumani',
    districtName: 'Asaka tumani',
    latitude: asakaLocation.latitude,
    longitude: asakaLocation.longitude,
    timezone: tz,
    utcOffsetMinutes: localNow.utcOffsetMinutes,
    isDstActive: localNow.isDstActive,
    localDate: scheduleDate,
    localTimeNow: localNow.localTimeNow,
    formattedLocalDate: adminSchedule.formattedDateUz || formatUzbekGregorianDate(localNow.year, localNow.month, localNow.day),
    hijriDate: adminSchedule.hijriDate || computeHijriDateLabel(localNow.year, localNow.month, localNow.day),
    qiblaAngleDeg: adminSchedule.qiblaAngleDeg || 241,
    tahajjud: getT('tahajjud', '03:45'),
    subh: getT('subh', '04:40'),
    fajr: getT('bomdod', '05:22'),
    sunrise: getT('quyosh', '06:46'),
    dhuhr: getT('peshin', '12:05'),
    asr: getT('asr', '15:10'),
    maghrib: getT('shom', '17:21'),
    isha: getT('xufton', '18:42'),
    midnight,
    times: adminSchedule.times.map((t) => ({ ...t })),
    sourceMode: 'MANUAL_ADMIN',
    sourceName: adminSchedule.publishedBy || 'ASAKA ZIYO Administrator (Rasmiy Masjid Jadvali)',
    calculationMethod: 'MANUAL_ADMIN',
    calculationMethodLabel: 'Administrator nazorati (MANUAL_ADMIN — avtomatik almashtirilmaydi)',
    asrMethod: 'MANUAL_ADMIN',
    highLatitudeRule: 'NONE',
    midnightMode: 'STANDARD',
    verified: Boolean(adminSchedule.isAdministratorPublished),
    verificationNote: adminSchedule.isAdministratorPublished
      ? `Administrator tomonidan tasdiqlangan (${adminSchedule.verifiedAt || adminSchedule.date})`
      : 'Administrator tasdig‘i kutilmoqda (oxirgi saqlangan jadval)',
    lastUpdatedAt: adminSchedule.verifiedAt || (adminSchedule as any).updatedAt || new Date().toISOString(),
    scheduleVersion: adminSchedule.version || 1,
    adminApproved: Boolean(adminSchedule.isAdministratorPublished),
    isStale: isDateDifferent,
    staleWarning: isDateDifferent
      ? `Diqqat: Ko‘rsatilayotgan jadval ${scheduleDate} sanasiga tegishli (bugun ${localNow.localDate}). Administrator yangi jadval e’lon qilgunga qadar oxirgi tasdiqlangan vaqtlar ko‘rsatilmoqda.`
      : undefined,
    nextPrayer: computeNextPrayerInTimezone(adminSchedule.times, tz, now),
  };
}

/**
 * Generates a UnifiedPrayerRecord for ANY non-Asaka Uzbekistan or Global city in AUTO_CALCULATED mode.
 */
export function calculateGlobalPrayerRecord(
  location: CityLocationDefinition,
  targetDateStr?: string,
  options: PrayerCalculationOptions = {},
  now: Date = new Date()
): UnifiedPrayerRecord {
  if (location.id === ASAKA_CANONICAL_CITY_ID || location.sourceMode === 'MANUAL_ADMIN') {
    throw new Error('SECURITY_INVARIANT: AUTO prayer engine is strictly forbidden from calculating or overwriting Asaka MANUAL_ADMIN schedule.');
  }

  const localNow = getLocalDateTimeInTimezone(location.timezone, now);
  let year = localNow.year;
  let month = localNow.month;
  let day = localNow.day;
  let localDate = localNow.localDate;

  if (targetDateStr && /^\d{4}-\d{2}-\d{2}$/.test(targetDateStr)) {
    const [y, m, d] = targetDateStr.split('-').map(Number);
    if (y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      year = y;
      month = m;
      day = d;
      localDate = targetDateStr;
    }
  }

  const utcOffsetMinutes = getTimezoneOffsetMinutesForDate(location.timezone, year, month, day, 12, 0);
  const janOffset = getTimezoneOffsetMinutesForDate(location.timezone, year, 1, 15, 12, 0);
  const julOffset = getTimezoneOffsetMinutesForDate(location.timezone, year, 7, 15, 12, 0);
  const isDstActive = janOffset !== julOffset && utcOffsetMinutes > Math.min(janOffset, julOffset);

  const method = options.method || location.defaultMethod || 'MWL';
  const methodCfg = CALCULATION_METHODS[method] || CALCULATION_METHODS.MWL;
  const asrMethod = options.asrMethod || location.defaultAsr || methodCfg.defaultAsr;
  const highLatitudeRule = options.highLatitudeRule || 'ANGLE_BASED';
  const midnightMode = options.midnightMode || 'STANDARD';

  const computed = computeAstronomicalPrayerHours({
    year,
    month,
    day,
    latitude: location.latitude,
    longitude: location.longitude,
    utcOffsetHours: utcOffsetMinutes / 60,
    method,
    asrMethod,
    highLatitudeRule,
    midnightMode,
    minuteAdjustments: options.minuteAdjustments,
  });

  // If official verified Uzbekistan daily times were supplied (e.g., from admin-imported O'MI table or verified cache)
  const off = options.officialDailyTimesOverride;
  const fajr = off?.fajr || computed.fajr;
  const sunrise = off?.sunrise || computed.sunrise;
  const dhuhr = off?.dhuhr || computed.dhuhr;
  const asr = off?.asr || computed.asr;
  const maghrib = off?.maghrib || computed.maghrib;
  const isha = off?.isha || computed.isha;
  const subh = off ? minutesToHHMM(hhmmToMinutes(fajr) - 10) : computed.subh;
  const tahajjud = computed.tahajjud;
  const midnight = computed.midnight;

  const times: PrayerTimeEntry[] = [
    {
      id: `${location.id}-tahajjud`,
      key: 'tahajjud',
      nameUz: 'Tahajjud',
      nameAr: 'التَّهَجُّد',
      time: tahajjud,
      descriptionUz: 'Tun oxirgi uchdan bir qismi (nafl ibodat vaqti)',
    },
    {
      id: `${location.id}-subh`,
      key: 'subh',
      nameUz: 'Subh (Saharlik)',
      nameAr: 'الصُّبْح',
      time: subh,
      descriptionUz: 'Saharlik (imsoq) ehtiyot vaqti (Bomdoddan 10 daqiqa oldin)',
    },
    {
      id: `${location.id}-bomdod`,
      key: 'bomdod',
      nameUz: 'Bomdod',
      nameAr: 'الفَجْر',
      time: fajr,
      descriptionUz: 'Tong yorishishidan quyosh chiqishigacha',
    },
    {
      id: `${location.id}-quyosh`,
      key: 'quyosh',
      nameUz: 'Quyosh',
      nameAr: 'الشُّرُوق',
      time: sunrise,
      descriptionUz: 'Quyosh chiqish vaqti',
    },
    {
      id: `${location.id}-peshin`,
      key: 'peshin',
      nameUz: 'Peshin',
      nameAr: 'الظُّهْر',
      time: dhuhr,
      descriptionUz: 'Quyosh zavoldan oqqandan Asrgacha',
    },
    {
      id: `${location.id}-asr`,
      key: 'asr',
      nameUz: 'Asr',
      nameAr: 'العَصْر',
      time: asr,
      descriptionUz: asrMethod === 'HANAFI' ? 'Hanafiy mazhabi bo‘yicha (ikki barobar soya)' : 'Standart (Shofe’iy/Molikiy/Hanbaliy — bir barobar soya)',
    },
    {
      id: `${location.id}-shom`,
      key: 'shom',
      nameUz: 'Shom',
      nameAr: 'المَغْرِب',
      time: maghrib,
      descriptionUz: 'Quyosh botishidan Xuftongacha',
    },
    {
      id: `${location.id}-xufton`,
      key: 'xufton',
      nameUz: 'Xufton',
      nameAr: 'العِشَاء',
      time: isha,
      descriptionUz: 'Kechki shafaq yo‘qolgandan tong otguncha',
    },
  ];

  const verified = Boolean(off?.verified ?? options.verifiedOverride ?? false);
  const sourceName =
    off?.sourceName ||
    options.sourceNameOverride ||
    `ASAKA ZIYO Global Engine (${methodCfg.name})`;

  return {
    countryCode: location.countryCode,
    countryName: location.countryName,
    regionId: location.regionId,
    regionName: location.regionName,
    cityId: location.id,
    cityName: location.cityName,
    districtId: location.districtId,
    districtName: location.districtName,
    latitude: location.latitude,
    longitude: location.longitude,
    timezone: location.timezone,
    utcOffsetMinutes,
    isDstActive,
    localDate,
    localTimeNow: localNow.localTimeNow,
    formattedLocalDate: formatUzbekGregorianDate(year, month, day),
    hijriDate: computeHijriDateLabel(year, month, day),
    qiblaAngleDeg: calculateQiblaBearing(location.latitude, location.longitude),
    tahajjud,
    subh,
    fajr,
    sunrise,
    dhuhr,
    asr,
    maghrib,
    isha,
    midnight,
    times,
    sourceMode: 'AUTO_CALCULATED',
    sourceName,
    calculationMethod: method,
    calculationMethodLabel: methodCfg.nameUz,
    asrMethod,
    highLatitudeRule,
    midnightMode,
    verified,
    verificationNote:
      off?.verificationNote ||
      options.verificationNote ||
      (verified
        ? 'Rasmiy taqvim bilan solishtirib tasdiqlangan'
        : 'Astronomik hisob-kitob (AUTO_CALCULATED). Rasmiy mahalliy masjid taqvimi bilan ±1–3 daqiqa farq bo‘lishi mumkin.'),
    lastUpdatedAt: now.toISOString(),
    scheduleVersion: 1,
    adminApproved: false,
    nextPrayer: computeNextPrayerInTimezone(times, location.timezone, now),
  };
}

/**
 * Generates a full monthly prayer calendar for any AUTO city in its own local timezone.
 */
export function calculateMonthlyGlobalCalendar(
  location: CityLocationDefinition,
  year: number,
  month: number, // 1..12
  options: PrayerCalculationOptions = {}
): Array<{
  day: number;
  localDate: string;
  hijriDate: string;
  tahajjud: string;
  subh: string;
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  isDstActive: boolean;
}> {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const rows = [];
  const pad = (n: number) => String(n).padStart(2, '0');

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${pad(month)}-${pad(day)}`;
    const rec = calculateGlobalPrayerRecord(location, dateStr, options);
    rows.push({
      day,
      localDate: dateStr,
      hijriDate: rec.hijriDate,
      tahajjud: rec.tahajjud,
      subh: rec.subh,
      fajr: rec.fajr,
      sunrise: rec.sunrise,
      dhuhr: rec.dhuhr,
      asr: rec.asr,
      maghrib: rec.maghrib,
      isha: rec.isha,
      isDstActive: rec.isDstActive,
    });
  }
  return rows;
}
