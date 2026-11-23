/**
 * ASAKA ZIYO — Qibla Bearing & Dynamic Hijri Calendar Service
 *
 * - Calculates exact great-circle Qibla bearing from any GPS coordinate to the Kaaba (21.4225°N, 39.8262°E).
 * - Defaults to official Asaka Mosque coordinates (40.6415°N, 72.2387°E -> 241° SW).
 * - Honest sensor note: Telegram chat messages cannot access a phone's magnetometer; live compass needle
 *   requires the Web/Mini App compass interface.
 * - Provides accurate Asia/Tashkent date/time helpers and dynamic Gregorian-to-Hijri formatting.
 */

import { TelegramLocale } from '../types';
import { DateResolutionOptions, resolveDynamicHijriDate } from './dateCalendarService';

export const KAABA_COORDS = { lat: 21.422487, lon: 39.826206 } as const;
export const ASAKA_COORDS = { lat: 40.6415, lon: 72.2387 } as const;

export interface QiblaCalculationResult {
  bearingDeg: number;
  bearingDegrees: number;
  distanceKm: number;
  cardinalCode: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
  latitude: number;
  longitude: number;
  isDefaultAsaka: boolean;
}

export function calculateQiblaFromCoordinates(
  latitude: number,
  longitude: number,
  isDefaultAsaka = false
): QiblaCalculationResult {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const phi1 = toRad(latitude);
  const phi2 = toRad(KAABA_COORDS.lat);
  const deltaLambda = toRad(KAABA_COORDS.lon - longitude);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const bearingDeg = Math.round(((toDeg(Math.atan2(y, x)) % 360) + 360) % 360);

  // Haversine distance in km
  const dLat = phi2 - phi1;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = Math.round(6371 * c);

  const dirs: Array<QiblaCalculationResult['cardinalCode']> = [
    'N',
    'NE',
    'E',
    'SE',
    'S',
    'SW',
    'W',
    'NW',
  ];
  const cardinalCode = dirs[Math.round(bearingDeg / 45) % 8];

  return {
    bearingDeg,
    bearingDegrees: bearingDeg,
    distanceKm,
    cardinalCode,
    latitude,
    longitude,
    isDefaultAsaka,
  };
}

const ASAKA_DEFAULT_QIBLA = calculateQiblaFromCoordinates(
  ASAKA_COORDS.lat,
  ASAKA_COORDS.lon,
  true
);
export const ASAKA_DEFAULT_QIBLA_BEARING = ASAKA_DEFAULT_QIBLA.bearingDeg;
export const ASAKA_DISTANCE_TO_KAABA_KM = ASAKA_DEFAULT_QIBLA.distanceKm;

export function getCardinalDirectionLabel(
  code: QiblaCalculationResult['cardinalCode'],
  locale: TelegramLocale
): string {
  const map: Record<TelegramLocale, Record<QiblaCalculationResult['cardinalCode'], string>> = {
    'uz-Latn': {
      N: 'Shimol',
      NE: 'Shimoli-Sharq',
      E: 'Sharq',
      SE: 'Janubi-Sharq',
      S: 'Janub',
      SW: 'Janubi-Gʻarb',
      W: 'Gʻarb',
      NW: 'Shimoli-Gʻarb',
    },
    'uz-Cyrl': {
      N: 'Шимол',
      NE: 'Шимоли-Шарқ',
      E: 'Шарқ',
      SE: 'Жануби-Шарқ',
      S: 'Жануб',
      SW: 'Жануби-Ғарб',
      W: 'Ғарб',
      NW: 'Шимоли-Ғарб',
    },
    'uz-Latn-new': {
      N: 'Şimol',
      NE: 'Şimoli-Şarq',
      E: 'Şarq',
      SE: 'Janubi-Şarq',
      S: 'Janub',
      SW: 'Janubi-Ğarb',
      W: 'Ğarb',
      NW: 'Şimoli-Ğarb',
    },
    ru: {
      N: 'Север',
      NE: 'Северо-Восток',
      E: 'Восток',
      SE: 'Юго-Восток',
      S: 'Юг',
      SW: 'Юго-Запад',
      W: 'Запад',
      NW: 'Северо-Запад',
    },
    en: {
      N: 'North',
      NE: 'Northeast',
      E: 'East',
      SE: 'Southeast',
      S: 'South',
      SW: 'Southwest',
      W: 'West',
      NW: 'Northwest',
    },
  };
  return (map[locale] || map['uz-Latn'])[code];
}

export function getCompassDirectionLabel(
  bearingDegrees: number,
  locale: TelegramLocale
): string {
  const dirs: Array<QiblaCalculationResult['cardinalCode']> = [
    'N',
    'NE',
    'E',
    'SE',
    'S',
    'SW',
    'W',
    'NW',
  ];
  const normalized = ((bearingDegrees % 360) + 360) % 360;
  const code = dirs[Math.round(normalized / 45) % 8];
  return getCardinalDirectionLabel(code, locale);
}

export function getTashkentDateParts(now = new Date()): {
  dateKey: string; // YYYY-MM-DD
  hhmm: string; // HH:MM
  hour: number;
  minute: number;
  dayOfWeek: number; // 0=Sun..6=Sat
  dayOfYear: number;
} {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  });
  const parts = formatter.formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '00';
  const year = Number(get('year'));
  const month = Number(get('month'));
  const day = Number(get('day'));
  const hour = Number(get('hour')) % 24;
  const minute = Number(get('minute'));
  const weekdayStr = get('weekday');
  const wkMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dayOfWeek = wkMap[weekdayStr] ?? now.getUTCDay();
  const startOfYear = Date.UTC(year, 0, 1);
  const currentDayUtc = Date.UTC(year, month - 1, day);
  const dayOfYear = Math.floor((currentDayUtc - startOfYear) / 86_400_000) + 1;

  return {
    dateKey: `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    hhmm: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    hour,
    minute,
    dayOfWeek,
    dayOfYear,
  };
}

export function isWithinQuietHours(
  currentHhmm: string,
  quietStart?: string,
  quietEnd?: string
): boolean {
  if (!quietStart || !quietEnd) return false;
  const toMin = (v: string) => {
    const m = v.match(/^(\d{2}):(\d{2})$/);
    if (!m) return -1;
    return Number(m[1]) * 60 + Number(m[2]);
  };
  const cur = toMin(currentHhmm);
  const start = toMin(quietStart);
  const end = toMin(quietEnd);
  if (cur < 0 || start < 0 || end < 0 || start === end) return false;

  if (start < end) {
    return cur >= start && cur < end;
  }
  // Overnight window (e.g., 22:30 -> 05:00)
  return cur >= start || cur < end;
}

export function getDynamicHijriDate(
  now = new Date(),
  locale: TelegramLocale = 'uz-Latn',
  options?: DateResolutionOptions
): { day: number; monthNumber: number; year: number; formatted: string } {
  const res = resolveDynamicHijriDate(now, locale, options);
  return {
    day: res.day,
    monthNumber: res.monthNumber,
    year: res.year,
    formatted: res.formatted,
  };
}
