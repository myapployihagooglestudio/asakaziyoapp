/**
 * ASAKA ZIYO — GLOBAL WEATHER CENTER SERVICE (Open-Meteo Integration)
 * Official API Docs: https://open-meteo.com/en/docs
 * License & Attribution: Weather data by Open-Meteo.com (CC BY 4.0)
 * Free-Tier Non-Commercial Limits: 10,000 calls/day, 5,000 calls/hour, 600 calls/min.
 *
 * Features:
 * - Current Weather (temp, apparent temp, condition, humidity, wind speed/direction, pressure, visibility, precip prob, sunrise, sunset, UV)
 * - 24-Hour Hourly Forecast + 7-Day & 16-Day Daily Forecast (rain, snow, wind, min/max temps)
 * - In-memory SWR cache (15 min TTL), request deduplication, exponential backoff retry
 * - Explicit stale-data guard: never mislabels stale/cached weather as live current weather
 * - Quota & error telemetry for Admin Control Center
 */

export interface WeatherCurrentSnapshot {
  temperatureC: number;
  apparentTemperatureC: number;
  weatherCode: number;
  conditionUz: string;
  conditionRu: string;
  conditionEn: string;
  conditionIcon: 'sun' | 'partly_cloudy' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';
  humidityPct: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  windDirectionLabel: string;
  surfacePressureHpa: number;
  visibilityKm: number | null;
  precipitationProbabilityPct: number | null;
  uvIndex: number | null;
  sunrise: string | null;
  sunset: string | null;
  isDay: boolean;
  observedAtLocal: string;
}

export interface WeatherHourlyItem {
  timeLocal: string; // e.g. "2026-11-25T14:00"
  hourLabel: string; // "14:00"
  temperatureC: number;
  apparentTemperatureC: number;
  precipitationProbabilityPct: number;
  rainMm: number;
  snowfallCm: number;
  windSpeedKmh: number;
  weatherCode: number;
  conditionUz: string;
  conditionIcon: WeatherCurrentSnapshot['conditionIcon'];
}

export interface WeatherDailyItem {
  date: string; // YYYY-MM-DD
  tempMaxC: number;
  tempMinC: number;
  precipitationProbabilityMaxPct: number;
  rainSumMm: number;
  snowfallSumCm: number;
  windSpeedMaxKmh: number;
  uvIndexMax: number | null;
  sunrise: string | null;
  sunset: string | null;
  weatherCode: number;
  conditionUz: string;
  conditionIcon: WeatherCurrentSnapshot['conditionIcon'];
}

export interface GlobalWeatherResponse {
  locationLabel: string;
  latitude: number;
  longitude: number;
  timezone: string;
  elevationM: number | null;
  current: WeatherCurrentSnapshot;
  hourly24: WeatherHourlyItem[];
  daily7: WeatherDailyItem[];
  daily16: WeatherDailyItem[];
  fetchedAt: string; // ISO UTC timestamp when actually fetched from Open-Meteo
  cacheHit: boolean;
  cacheTtlSeconds: number;
  isStale: boolean;
  staleNotice?: string;
  provider: 'Open-Meteo';
  attribution: string;
  licenseUrl: string;
  freeTierNotice: string;
}

export interface WeatherQuotaTelemetry {
  provider: 'Open-Meteo';
  status: 'healthy' | 'degraded' | 'offline';
  callsToday: number;
  dailyFreeTierLimit: number;
  callsThisHour: number;
  hourlyFreeTierLimit: number;
  cacheHits: number;
  cacheMisses: number;
  activeCacheEntries: number;
  deduplicatedRequests: number;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  attributionRequired: string;
  freeTierTerms: string;
}

interface CacheEntry {
  data: GlobalWeatherResponse;
  cachedAtMs: number;
}

const WEATHER_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const GEOCODE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_ENTRIES = 250;

const weatherCache = new Map<string, CacheEntry>();
const inflightWeatherRequests = new Map<string, Promise<GlobalWeatherResponse>>();
const geocodeCache = new Map<string, { results: GeocodedCityResult[]; cachedAtMs: number }>();

const telemetryState = {
  dayKey: new Date().toISOString().slice(0, 10),
  hourKey: new Date().toISOString().slice(0, 13),
  callsToday: 0,
  callsThisHour: 0,
  cacheHits: 0,
  cacheMisses: 0,
  deduplicatedRequests: 0,
  lastSuccessAt: null as string | null,
  lastErrorAt: null as string | null,
  lastErrorMessage: null as string | null,
};

function rotateTelemetryWindows() {
  const nowIso = new Date().toISOString();
  const dk = nowIso.slice(0, 10);
  const hk = nowIso.slice(0, 13);
  if (telemetryState.dayKey !== dk) {
    telemetryState.dayKey = dk;
    telemetryState.callsToday = 0;
  }
  if (telemetryState.hourKey !== hk) {
    telemetryState.hourKey = hk;
    telemetryState.callsThisHour = 0;
  }
}

export function decodeWmoWeatherCode(code: number): {
  uz: string;
  ru: string;
  en: string;
  icon: WeatherCurrentSnapshot['conditionIcon'];
} {
  if (code === 0) return { uz: 'Ochiq osmon', ru: 'Ясно', en: 'Clear sky', icon: 'sun' };
  if (code === 1) return { uz: 'Asosan ochiq', ru: 'Преимущественно ясно', en: 'Mainly clear', icon: 'sun' };
  if (code === 2) return { uz: 'Qisman bulutli', ru: 'Переменная облачность', en: 'Partly cloudy', icon: 'partly_cloudy' };
  if (code === 3) return { uz: 'Bulutli', ru: 'Пасмурно', en: 'Overcast', icon: 'cloudy' };
  if (code === 45 || code === 48) return { uz: 'Tuman', ru: 'Туман', en: 'Fog', icon: 'fog' };
  if (code >= 51 && code <= 57) return { uz: 'Mayda yomg‘ir', ru: 'Морось', en: 'Drizzle', icon: 'drizzle' };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
    return { uz: 'Yomg‘ir', ru: 'Дождь', en: 'Rain', icon: 'rain' };
  }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return { uz: 'Qor', ru: 'Снег', en: 'Snow', icon: 'snow' };
  }
  if (code >= 95 && code <= 99) {
    return { uz: 'Momaqaldiroq', ru: 'Гроза', en: 'Thunderstorm', icon: 'storm' };
  }
  return { uz: 'O‘zgaruvchan ob-havo', ru: 'Переменная погода', en: 'Variable weather', icon: 'partly_cloudy' };
}

export function windDirectionToCompassUz(deg: number): string {
  const dirs = ['Shimol', 'Shimoliy-Sharq', 'Sharq', 'Janubiy-Sharq', 'Janub', 'Janubiy-G‘arb', 'G‘arb', 'Shimoliy-G‘arb'];
  const idx = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return dirs[idx];
}

async function fetchWithExponentialBackoff(url: string, maxRetries = 2): Promise<Response> {
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'ASAKA-ZIYO/4.0 (Non-Commercial Islamic Community App)',
        },
      });
      clearTimeout(timeout);
      if (res.ok) return res;
      if (res.status >= 500 || res.status === 429) {
        lastErr = new Error(`Open-Meteo HTTP ${res.status}`);
      } else {
        throw new Error(`Open-Meteo HTTP ${res.status}`);
      }
    } catch (err: any) {
      clearTimeout(timeout);
      lastErr = err instanceof Error ? err : new Error(String(err));
    }
    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, 350 * Math.pow(2, attempt)));
    }
  }
  throw lastErr || new Error('Open-Meteo network error');
}

function buildCacheKey(latitude: number, longitude: number, timezone: string): string {
  return `${latitude.toFixed(3)}:${longitude.toFixed(3)}:${timezone || 'auto'}`;
}

export function getWeatherQuotaTelemetry(): WeatherQuotaTelemetry {
  rotateTelemetryWindows();
  const status: WeatherQuotaTelemetry['status'] =
    telemetryState.lastErrorAt &&
    (!telemetryState.lastSuccessAt || telemetryState.lastErrorAt > telemetryState.lastSuccessAt)
      ? 'degraded'
      : 'healthy';

  return {
    provider: 'Open-Meteo',
    status,
    callsToday: telemetryState.callsToday,
    dailyFreeTierLimit: 10000,
    callsThisHour: telemetryState.callsThisHour,
    hourlyFreeTierLimit: 5000,
    cacheHits: telemetryState.cacheHits,
    cacheMisses: telemetryState.cacheMisses,
    activeCacheEntries: weatherCache.size,
    deduplicatedRequests: telemetryState.deduplicatedRequests,
    lastSuccessAt: telemetryState.lastSuccessAt,
    lastErrorAt: telemetryState.lastErrorAt,
    lastErrorMessage: telemetryState.lastErrorMessage,
    attributionRequired: 'Weather data by Open-Meteo.com (CC BY 4.0)',
    freeTierTerms: 'Bepul tarif faqat notijorat foydalanish uchun (kuniga 10,000 so‘rov chegarasi). Tijorat yoki yuqori yuklamada Open-Meteo pullik rejasi talab qilinadi.',
  };
}

export function clearWeatherCache(): { clearedEntries: number } {
  const count = weatherCache.size;
  weatherCache.clear();
  return { clearedEntries: count };
}

/**
 * Fetches complete Current + 24h Hourly + 7d/16d Daily weather for any coordinates & timezone.
 * Strictly respects the city's own IANA timezone (never mixes prayer & weather timezones).
 */
export async function fetchGlobalWeather(params: {
  latitude: number;
  longitude: number;
  timezone: string;
  locationLabel: string;
  forceRefresh?: boolean;
  simulateOfflineForTest?: boolean;
}): Promise<GlobalWeatherResponse> {
  rotateTelemetryWindows();
  const { latitude, longitude, timezone, locationLabel, forceRefresh = false, simulateOfflineForTest = false } = params;
  const key = buildCacheKey(latitude, longitude, timezone);
  const cached = weatherCache.get(key);
  const nowMs = Date.now();

  if (!forceRefresh && !simulateOfflineForTest && cached && nowMs - cached.cachedAtMs < WEATHER_CACHE_TTL_MS) {
    telemetryState.cacheHits += 1;
    return {
      ...cached.data,
      locationLabel,
      cacheHit: true,
      isStale: false,
      staleNotice: undefined,
    };
  }

  // Request deduplication for concurrent identical coordinate calls
  if (!simulateOfflineForTest && inflightWeatherRequests.has(key)) {
    telemetryState.deduplicatedRequests += 1;
    const shared = await inflightWeatherRequests.get(key)!;
    return { ...shared, locationLabel };
  }

  const runFetch = async (): Promise<GlobalWeatherResponse> => {
    telemetryState.cacheMisses += 1;
    try {
      if (simulateOfflineForTest) {
        throw new Error('Simulated Open-Meteo outage for stale-cache verification');
      }

      const safeTz = encodeURIComponent(timezone || 'auto');
      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${encodeURIComponent(latitude.toFixed(4))}` +
        `&longitude=${encodeURIComponent(longitude.toFixed(4))}` +
        `&timezone=${safeTz}` +
        `&forecast_days=16` +
        `&current=temperature_2m,apparent_temperature,relative_humidity_2m,is_day,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m` +
        `&hourly=temperature_2m,apparent_temperature,precipitation_probability,rain,snowfall,weather_code,visibility,wind_speed_10m,uv_index` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,rain_sum,snowfall_sum,precipitation_probability_max,wind_speed_10m_max`;

      telemetryState.callsToday += 1;
      telemetryState.callsThisHour += 1;

      const res = await fetchWithExponentialBackoff(url, 2);
      const raw: any = await res.json();

      if (!raw || !raw.current) {
        throw new Error('Open-Meteo returned empty weather payload');
      }

      const cur = raw.current;
      const curCode = Number(cur.weather_code ?? 0);
      const decodedCur = decodeWmoWeatherCode(curCode);

      // Align current hour index in hourly array for visibility, precip prob, UV index
      const hourlyTimes: string[] = Array.isArray(raw.hourly?.time) ? raw.hourly.time : [];
      const curHourPrefix = String(cur.time || '').slice(0, 13);
      let startHourIdx = hourlyTimes.findIndex((t) => t.startsWith(curHourPrefix));
      if (startHourIdx < 0) startHourIdx = 0;

      const curVisibilityM = raw.hourly?.visibility?.[startHourIdx];
      const curPrecipProb = raw.hourly?.precipitation_probability?.[startHourIdx];
      const curUv = raw.hourly?.uv_index?.[startHourIdx];

      const dailyTimes: string[] = Array.isArray(raw.daily?.time) ? raw.daily.time : [];
      const todaySunrise = raw.daily?.sunrise?.[0] ? String(raw.daily.sunrise[0]).slice(11, 16) : null;
      const todaySunset = raw.daily?.sunset?.[0] ? String(raw.daily.sunset[0]).slice(11, 16) : null;

      const hourly24: WeatherHourlyItem[] = [];
      for (let i = startHourIdx; i < Math.min(hourlyTimes.length, startHourIdx + 24); i++) {
        const wCode = Number(raw.hourly?.weather_code?.[i] ?? 0);
        const wDec = decodeWmoWeatherCode(wCode);
        const tStr = String(hourlyTimes[i] || '');
        hourly24.push({
          timeLocal: tStr,
          hourLabel: tStr.slice(11, 16) || `${i % 24}:00`,
          temperatureC: Math.round((Number(raw.hourly?.temperature_2m?.[i] ?? 0)) * 10) / 10,
          apparentTemperatureC: Math.round((Number(raw.hourly?.apparent_temperature?.[i] ?? 0)) * 10) / 10,
          precipitationProbabilityPct: Math.round(Number(raw.hourly?.precipitation_probability?.[i] ?? 0)),
          rainMm: Math.round((Number(raw.hourly?.rain?.[i] ?? 0)) * 10) / 10,
          snowfallCm: Math.round((Number(raw.hourly?.snowfall?.[i] ?? 0)) * 10) / 10,
          windSpeedKmh: Math.round(Number(raw.hourly?.wind_speed_10m?.[i] ?? 0)),
          weatherCode: wCode,
          conditionUz: wDec.uz,
          conditionIcon: wDec.icon,
        });
      }

      const daily16: WeatherDailyItem[] = dailyTimes.map((dateStr, idx) => {
        const dCode = Number(raw.daily?.weather_code?.[idx] ?? 0);
        const dDec = decodeWmoWeatherCode(dCode);
        return {
          date: dateStr,
          tempMaxC: Math.round((Number(raw.daily?.temperature_2m_max?.[idx] ?? 0)) * 10) / 10,
          tempMinC: Math.round((Number(raw.daily?.temperature_2m_min?.[idx] ?? 0)) * 10) / 10,
          precipitationProbabilityMaxPct: Math.round(Number(raw.daily?.precipitation_probability_max?.[idx] ?? 0)),
          rainSumMm: Math.round((Number(raw.daily?.rain_sum?.[idx] ?? 0)) * 10) / 10,
          snowfallSumCm: Math.round((Number(raw.daily?.snowfall_sum?.[idx] ?? 0)) * 10) / 10,
          windSpeedMaxKmh: Math.round(Number(raw.daily?.wind_speed_10m_max?.[idx] ?? 0)),
          uvIndexMax:
            typeof raw.daily?.uv_index_max?.[idx] === 'number'
              ? Math.round(raw.daily.uv_index_max[idx] * 10) / 10
              : null,
          sunrise: raw.daily?.sunrise?.[idx] ? String(raw.daily.sunrise[idx]).slice(11, 16) : null,
          sunset: raw.daily?.sunset?.[idx] ? String(raw.daily.sunset[idx]).slice(11, 16) : null,
          weatherCode: dCode,
          conditionUz: dDec.uz,
          conditionIcon: dDec.icon,
        };
      });

      const fetchedAt = new Date().toISOString();
      const response: GlobalWeatherResponse = {
        locationLabel,
        latitude: Number(raw.latitude ?? latitude),
        longitude: Number(raw.longitude ?? longitude),
        timezone: String(raw.timezone || timezone || 'Asia/Tashkent'),
        elevationM: typeof raw.elevation === 'number' ? Math.round(raw.elevation) : null,
        current: {
          temperatureC: Math.round(Number(cur.temperature_2m ?? 0) * 10) / 10,
          apparentTemperatureC: Math.round(Number(cur.apparent_temperature ?? cur.temperature_2m ?? 0) * 10) / 10,
          weatherCode: curCode,
          conditionUz: decodedCur.uz,
          conditionRu: decodedCur.ru,
          conditionEn: decodedCur.en,
          conditionIcon: decodedCur.icon,
          humidityPct: Math.round(Number(cur.relative_humidity_2m ?? 0)),
          windSpeedKmh: Math.round(Number(cur.wind_speed_10m ?? 0) * 10) / 10,
          windDirectionDeg: Math.round(Number(cur.wind_direction_10m ?? 0)),
          windDirectionLabel: windDirectionToCompassUz(Number(cur.wind_direction_10m ?? 0)),
          surfacePressureHpa: Math.round(Number(cur.surface_pressure ?? 1013)),
          visibilityKm: typeof curVisibilityM === 'number' ? Math.round((curVisibilityM / 1000) * 10) / 10 : null,
          precipitationProbabilityPct: typeof curPrecipProb === 'number' ? Math.round(curPrecipProb) : null,
          uvIndex: typeof curUv === 'number' ? Math.round(curUv * 10) / 10 : null,
          sunrise: todaySunrise,
          sunset: todaySunset,
          isDay: Number(cur.is_day ?? 1) === 1,
          observedAtLocal: String(cur.time || ''),
        },
        hourly24,
        daily7: daily16.slice(0, 7),
        daily16,
        fetchedAt,
        cacheHit: false,
        cacheTtlSeconds: Math.round(WEATHER_CACHE_TTL_MS / 1000),
        isStale: false,
        provider: 'Open-Meteo',
        attribution: 'Weather data by Open-Meteo.com (CC BY 4.0)',
        licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
        freeTierNotice: 'Open-Meteo notijorat bepul API (kuniga 10,000 so‘rov chegarasi, 15 daqiqalik server keshi)',
      };

      // Evict oldest entry if cache is full
      if (weatherCache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = weatherCache.keys().next().value;
        if (oldestKey) weatherCache.delete(oldestKey);
      }
      weatherCache.set(key, { data: response, cachedAtMs: Date.now() });
      telemetryState.lastSuccessAt = fetchedAt;
      return response;
    } catch (err: any) {
      telemetryState.lastErrorAt = new Date().toISOString();
      telemetryState.lastErrorMessage = err?.message || 'Weather fetch failed';

      // STRICT STALE DATA GUARD: If cached snapshot exists, return it EXPLICITLY marked stale with original fetchedAt!
      if (cached) {
        return {
          ...cached.data,
          locationLabel,
          cacheHit: true,
          isStale: true,
          staleNotice: `Ob-havo API bilan aloqa uzildi. Oxirgi yangilangan vaqt: ${cached.data.fetchedAt}. Bu ma’lumot joriy real-vaqt ob-havosi emas.`,
        };
      }
      throw err;
    } finally {
      inflightWeatherRequests.delete(key);
    }
  };

  const promise = runFetch();
  if (!simulateOfflineForTest) {
    inflightWeatherRequests.set(key, promise);
  }
  return promise;
}

export interface GeocodedCityResult {
  id: string;
  cityName: string;
  regionName: string;
  countryCode: string;
  countryName: string;
  latitude: number;
  longitude: number;
  timezone: string;
  population?: number;
}

/**
 * Searches any city worldwide via Open-Meteo Geocoding API (fixed allowlisted host, 24h cache).
 */
export async function searchGlobalCitiesOpenMeteo(query: string): Promise<GeocodedCityResult[]> {
  const clean = String(query || '').trim();
  if (clean.length < 2 || clean.length > 80) return [];
  const cacheKey = clean.toLowerCase();
  const cached = geocodeCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAtMs < GEOCODE_CACHE_TTL_MS) {
    return cached.results;
  }

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(clean)}&count=8&language=en&format=json`;
    const res = await fetchWithExponentialBackoff(url, 1);
    const json: any = await res.json();
    const list: GeocodedCityResult[] = Array.isArray(json?.results)
      ? json.results
          .filter((r: any) => typeof r.latitude === 'number' && typeof r.longitude === 'number' && r.timezone)
          .map((r: any) => ({
            id: `geo-${String(r.country_code || 'xx').toLowerCase()}-${r.id}`,
            cityName: String(r.name || ''),
            regionName: String(r.admin1 || r.country || ''),
            countryCode: String(r.country_code || 'XX').toUpperCase(),
            countryName: String(r.country || ''),
            latitude: Number(r.latitude),
            longitude: Number(r.longitude),
            timezone: String(r.timezone),
            population: typeof r.population === 'number' ? r.population : undefined,
          }))
      : [];

    if (geocodeCache.size >= 200) {
      const oldest = geocodeCache.keys().next().value;
      if (oldest) geocodeCache.delete(oldest);
    }
    geocodeCache.set(cacheKey, { results: list, cachedAtMs: Date.now() });
    return list;
  } catch {
    return [];
  }
}
