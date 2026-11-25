/**
 * ASAKA ZIYO — Unified Global Prayer & Weather Client SDK
 * Used across Web App & Android Native WebView for:
 * - Fetching unified prayer schedules (Asaka MANUAL_ADMIN vs Uzbekistan 14 regions vs Global AUTO)
 * - Fetching cached Open-Meteo Weather (current + 24h hourly + 7d/16d daily)
 * - GPS geolocation resolution + manual city/district selection
 * - Offline cache with strict stale-data labeling (never mislabels stale date as today!)
 * - Cross-platform user location preference sync (with per-device override toggle)
 */

import {
  ASAKA_CANONICAL_CITY_ID,
  AsrMethodId,
  CalculationMethodId,
  CityLocationDefinition,
  HighLatitudeRuleId,
  MidnightModeId,
  UZBEKISTAN_14_REGIONS,
  GLOBAL_CANONICAL_CITIES,
  findBuiltInLocationById,
} from '../data/globalLocationsData';
import {
  UnifiedPrayerRecord,
  buildAsakaManualUnifiedRecord,
  calculateGlobalPrayerRecord,
  calculateMonthlyGlobalCalendar,
} from '../services/globalPrayerEngine';
import type { GlobalWeatherResponse, GeocodedCityResult } from '../services/globalWeatherService';
import { PrayerSchedule } from '../types';

export interface UserLocationPreference {
  cityId: string;
  districtId?: string;
  customLocation?: CityLocationDefinition | null;
  calculationMethod?: CalculationMethodId;
  asrMethod?: AsrMethodId;
  highLatitudeRule?: HighLatitudeRuleId;
  midnightMode?: MidnightModeId;
  syncAcrossDevices: boolean;
  updatedAt: string;
}

const PREF_STORAGE_KEY = 'asaka_ziyo_global_location_pref_v1';
const PRAYER_OFFLINE_CACHE_KEY = 'asaka_ziyo_global_prayer_cache_v1';
const WEATHER_OFFLINE_CACHE_KEY = 'asaka_ziyo_global_weather_cache_v1';

export const DEFAULT_LOCATION_PREF: UserLocationPreference = {
  cityId: ASAKA_CANONICAL_CITY_ID,
  districtId: 'asaka-tumani',
  customLocation: null,
  syncAcrossDevices: true,
  updatedAt: new Date().toISOString(),
};

function safeReadJson<T>(key: string): T | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function safeWriteJson(key: string, value: unknown): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded or restricted storage
  }
}

export function loadLocalLocationPreference(): UserLocationPreference {
  const stored = safeReadJson<UserLocationPreference>(PREF_STORAGE_KEY);
  if (stored && typeof stored.cityId === 'string' && stored.cityId.length > 0) {
    return {
      ...DEFAULT_LOCATION_PREF,
      ...stored,
    };
  }
  return { ...DEFAULT_LOCATION_PREF };
}

export function saveLocalLocationPreference(pref: UserLocationPreference): void {
  safeWriteJson(PREF_STORAGE_KEY, { ...pref, updatedAt: new Date().toISOString() });
  // Notify Android native widget/bridge if running inside Android WebView
  try {
    const win = window as any;
    if (win.AsakaAndroidBridge?.syncSelectedLocation) {
      win.AsakaAndroidBridge.syncSelectedLocation(
        JSON.stringify({
          cityId: pref.cityId,
          districtId: pref.districtId || '',
          cityName: pref.customLocation?.cityName || findBuiltInLocationById(pref.cityId)?.cityName || 'Asaka',
        })
      );
    }
  } catch {
    // ignore
  }
}

export async function syncLocationPreferenceToServer(
  userId: string | null,
  pref: UserLocationPreference
): Promise<void> {
  saveLocalLocationPreference(pref);
  if (!userId || !pref.syncAcrossDevices) return;
  try {
    await fetch('/api/user/location-pref', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-asaka-user-id': userId,
      },
      body: JSON.stringify({ userId, preference: pref }),
    });
  } catch {
    // Offline — local preference remains saved
  }
}

export async function fetchSyncedLocationPreference(
  userId: string
): Promise<UserLocationPreference | null> {
  try {
    const res = await fetch(`/api/user/location-pref?userId=${encodeURIComponent(userId)}`, {
      headers: { 'x-asaka-user-id': userId },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.success && json.preference?.cityId) {
      return json.preference as UserLocationPreference;
    }
  } catch {
    // offline
  }
  return null;
}

export async function fetchUnifiedPrayerScheduleClient(params: {
  pref: UserLocationPreference;
  date?: string;
  asakaFallbackSchedule: PrayerSchedule;
}): Promise<{ record: UnifiedPrayerRecord; fromOfflineCache: boolean }> {
  const { pref, date, asakaFallbackSchedule } = params;
  const query = new URLSearchParams();
  query.set('cityId', pref.cityId);
  if (pref.districtId) query.set('districtId', pref.districtId);
  if (date) query.set('date', date);
  if (pref.calculationMethod) query.set('method', pref.calculationMethod);
  if (pref.asrMethod) query.set('asr', pref.asrMethod);
  if (pref.highLatitudeRule) query.set('highLat', pref.highLatitudeRule);
  if (pref.midnightMode) query.set('midnight', pref.midnightMode);

  if (pref.customLocation && pref.cityId.startsWith('geo-')) {
    query.set('lat', String(pref.customLocation.latitude));
    query.set('lon', String(pref.customLocation.longitude));
    query.set('tz', pref.customLocation.timezone);
    query.set('cityName', pref.customLocation.cityName);
    query.set('countryName', pref.customLocation.countryName);
    query.set('countryCode', pref.customLocation.countryCode);
    query.set('regionName', pref.customLocation.regionName);
  }

  try {
    const res = await fetch(`/api/global-prayer/schedule?${query.toString()}`);
    if (res.ok) {
      const json = await res.json();
      if (json?.success && json.record) {
        const record = json.record as UnifiedPrayerRecord;
        const cacheMap = safeReadJson<Record<string, UnifiedPrayerRecord>>(PRAYER_OFFLINE_CACHE_KEY) || {};
        cacheMap[pref.cityId] = record;
        safeWriteJson(PRAYER_OFFLINE_CACHE_KEY, cacheMap);
        return { record, fromOfflineCache: false };
      }
    }
  } catch {
    // Offline fallback below
  }

  // Offline fallback: for Asaka, NEVER switch to AUTO — use last cached or admin schedule with explicit stale note
  if (pref.cityId === ASAKA_CANONICAL_CITY_ID) {
    const cachedMap = safeReadJson<Record<string, UnifiedPrayerRecord>>(PRAYER_OFFLINE_CACHE_KEY);
    if (cachedMap?.[ASAKA_CANONICAL_CITY_ID]) {
      const c = cachedMap[ASAKA_CANONICAL_CITY_ID];
      return {
        record: {
          ...c,
          isStale: true,
          staleWarning: `Oflayn rejim: Oxirgi tasdiqlangan Asaka jadvali (${c.localDate}) ko‘rsatilmoqda. Internet tiklanganda serverdan yangilanadi.`,
        },
        fromOfflineCache: true,
      };
    }
    const asakaLoc = findBuiltInLocationById(ASAKA_CANONICAL_CITY_ID)!;
    const rec = buildAsakaManualUnifiedRecord(asakaFallbackSchedule, asakaLoc);
    return { record: rec, fromOfflineCache: true };
  }

  // Offline fallback for AUTO cities: deterministic local astronomical calculation (still 100% timezone-accurate!)
  const loc =
    pref.customLocation ||
    findBuiltInLocationById(pref.cityId, pref.districtId) ||
    UZBEKISTAN_14_REGIONS[13].cities[0];

  const rec = calculateGlobalPrayerRecord(loc, date, {
    method: pref.calculationMethod,
    asrMethod: pref.asrMethod,
    highLatitudeRule: pref.highLatitudeRule,
    midnightMode: pref.midnightMode,
  });
  return {
    record: {
      ...rec,
      verificationNote: 'Oflayn rejimda qurilmada astronomik hisoblandi (AUTO_CALCULATED).',
    },
    fromOfflineCache: true,
  };
}

export async function fetchMonthlyPrayerCalendarClient(params: {
  pref: UserLocationPreference;
  year: number;
  month: number;
}): Promise<{
  rows: Array<{
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
    isDstActive?: boolean;
    sourceMode?: string;
  }>;
  sourceMode: string;
}> {
  const { pref, year, month } = params;
  const query = new URLSearchParams({
    cityId: pref.cityId,
    year: String(year),
    month: String(month),
  });
  if (pref.districtId) query.set('districtId', pref.districtId);
  if (pref.calculationMethod) query.set('method', pref.calculationMethod);
  if (pref.asrMethod) query.set('asr', pref.asrMethod);
  if (pref.customLocation && pref.cityId.startsWith('geo-')) {
    query.set('lat', String(pref.customLocation.latitude));
    query.set('lon', String(pref.customLocation.longitude));
    query.set('tz', pref.customLocation.timezone);
    query.set('cityName', pref.customLocation.cityName);
  }

  try {
    const res = await fetch(`/api/global-prayer/monthly?${query.toString()}`);
    if (res.ok) {
      const json = await res.json();
      if (json?.success && Array.isArray(json.rows)) {
        return { rows: json.rows, sourceMode: json.sourceMode || 'AUTO_CALCULATED' };
      }
    }
  } catch {
    // fallback locally for AUTO cities
  }

  if (pref.cityId !== ASAKA_CANONICAL_CITY_ID) {
    const loc =
      pref.customLocation ||
      findBuiltInLocationById(pref.cityId, pref.districtId) ||
      GLOBAL_CANONICAL_CITIES[0];
    return {
      rows: calculateMonthlyGlobalCalendar(loc, year, month, {
        method: pref.calculationMethod,
        asrMethod: pref.asrMethod,
      }),
      sourceMode: 'AUTO_CALCULATED',
    };
  }
  return { rows: [], sourceMode: 'MANUAL_ADMIN' };
}

export async function fetchGlobalWeatherClient(params: {
  cityId?: string;
  districtId?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  locationLabel: string;
  forceRefresh?: boolean;
}): Promise<{ weather: GlobalWeatherResponse | null; error?: string }> {
  const cacheKey = `${params.latitude.toFixed(2)}:${params.longitude.toFixed(2)}`;
  const query = new URLSearchParams({
    lat: String(params.latitude),
    lon: String(params.longitude),
    tz: params.timezone,
    label: params.locationLabel,
  });
  if (params.cityId) query.set('cityId', params.cityId);
  if (params.districtId) query.set('districtId', params.districtId);
  if (params.forceRefresh) query.set('refresh', '1');

  try {
    const res = await fetch(`/api/weather?${query.toString()}`);
    const json = await res.json();
    if (res.ok && json?.success && json.weather) {
      const cacheMap = safeReadJson<Record<string, GlobalWeatherResponse>>(WEATHER_OFFLINE_CACHE_KEY) || {};
      cacheMap[cacheKey] = json.weather;
      safeWriteJson(WEATHER_OFFLINE_CACHE_KEY, cacheMap);
      return { weather: json.weather as GlobalWeatherResponse };
    }
    throw new Error(json?.error || 'Ob-havo ma’lumoti olinmadi');
  } catch (err: any) {
    // Stale-safe offline fallback: NEVER show cached weather as live current weather!
    const cacheMap = safeReadJson<Record<string, GlobalWeatherResponse>>(WEATHER_OFFLINE_CACHE_KEY);
    if (cacheMap?.[cacheKey]) {
      const old = cacheMap[cacheKey];
      return {
        weather: {
          ...old,
          cacheHit: true,
          isStale: true,
          staleNotice: `Internet yoki Open-Meteo API ulanmadi. Oxirgi yangilangan vaqt: ${new Date(old.fetchedAt).toLocaleString()}. Bu joriy real-vaqt ko‘rsatkichi emas.`,
        },
        error: err?.message,
      };
    }
    return { weather: null, error: err?.message || 'Ob-havo xizmati vaqtincha mavjud emas' };
  }
}

export async function searchLocationsClient(query: string): Promise<{
  builtIn: CityLocationDefinition[];
  geocoded: GeocodedCityResult[];
}> {
  const q = query.trim();
  if (!q) return { builtIn: [], geocoded: [] };
  try {
    const res = await fetch(`/api/global-prayer/locations?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const json = await res.json();
      if (json?.success) {
        return {
          builtIn: Array.isArray(json.matches) ? json.matches : [],
          geocoded: Array.isArray(json.geocoded) ? json.geocoded : [],
        };
      }
    }
  } catch {
    // offline local filter
  }
  const lower = q.toLowerCase();
  const builtIn = [
    ...UZBEKISTAN_14_REGIONS.flatMap((r) => r.cities),
    ...GLOBAL_CANONICAL_CITIES,
  ].filter(
    (c) =>
      c.cityName.toLowerCase().includes(lower) ||
      c.regionName.toLowerCase().includes(lower) ||
      c.countryName.toLowerCase().includes(lower)
  );
  return { builtIn, geocoded: [] };
}

export async function resolveGpsLocationClient(): Promise<{
  ok: boolean;
  location?: CityLocationDefinition;
  distanceKm?: number;
  error?: string;
}> {
  // Check Android native bridge GPS first if present
  const win = typeof window !== 'undefined' ? (window as any) : null;
  let coords: { latitude: number; longitude: number } | null = null;

  try {
    if (win?.AsakaAndroidBridge?.getLastKnownLocationJson) {
      const raw = win.AsakaAndroidBridge.getLastKnownLocationJson();
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
          coords = { latitude: parsed.latitude, longitude: parsed.longitude };
        }
      }
    }
  } catch {
    // fallback to browser geolocation
  }

  if (!coords) {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return { ok: false, error: 'Qurilmada GPS joylashuv aniqlash qo‘llab-quvvatlanmaydi. Shaharni qo‘lda tanlang.' };
    }
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 300000,
        });
      });
      coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    } catch {
      return {
        ok: false,
        error: 'GPS ruxsati berilmadi yoki signal topilmadi. Hudud va shaharni qo‘lda tanlashingiz mumkin.',
      };
    }
  }

  try {
    const res = await fetch(
      `/api/global-prayer/resolve-gps?lat=${encodeURIComponent(coords.latitude)}&lon=${encodeURIComponent(coords.longitude)}`
    );
    const json = await res.json();
    if (res.ok && json?.success && json.location) {
      return {
        ok: true,
        location: json.location as CityLocationDefinition,
        distanceKm: json.distanceKm,
      };
    }
  } catch {
    // ignore
  }
  return { ok: false, error: 'Joylashuvni serverda aniqlab bo‘lmadi.' };
}
