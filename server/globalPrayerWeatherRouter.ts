/**
 * ASAKA ZIYO — Global Prayer Times & Weather Ecosystem REST Router
 * Mounted in server.ts and shared across Web App, Android Mobile App, and Telegram Bot.
 *
 * Security & Isolation:
 * - Public read routes validate & sanitize query params (coords, date, cityId).
 * - Admin routes strictly enforce `requireAdminAuth` (and sensitive rate limits).
 * - Asaka MANUAL_ADMIN schedule can ONLY be modified by authenticated Admin endpoints.
 * - Global AUTO configuration & verification routes NEVER modify Asaka's schedule.
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  ASAKA_CANONICAL_CITY_ID,
  AsrMethodId,
  CalculationMethodId,
  HighLatitudeRuleId,
  MidnightModeId,
  UZBEKISTAN_14_REGIONS,
  GLOBAL_CANONICAL_CITIES,
  findNearestLocation,
} from '../src/data/globalLocationsData';
import { CALCULATION_METHODS } from '../src/services/globalPrayerEngine';
import { searchGlobalCitiesOpenMeteo, getWeatherQuotaTelemetry } from '../src/services/globalWeatherService';
import { GlobalPrayerEcosystemService } from '../src/services/globalPrayerEcosystemServer';

export interface GlobalPrayerRouterDeps {
  ecosystem: GlobalPrayerEcosystemService;
  requireAdminAuth: (req: Request, res: Response, next: NextFunction) => void;
  sensitiveActionLimiter: (req: Request, res: Response, next: NextFunction) => void;
  extractAdminEmail: (req: Request) => string;
}

const VALID_METHODS = new Set<string>(Object.keys(CALCULATION_METHODS));
const VALID_ASR = new Set<string>(['HANAFI', 'STANDARD']);
const VALID_HIGH_LAT = new Set<string>(['ANGLE_BASED', 'MIDDLE_OF_NIGHT', 'SEVENTH_OF_NIGHT', 'NONE']);
const VALID_MIDNIGHT = new Set<string>(['STANDARD', 'JAFARI']);

export function createGlobalPrayerWeatherRouter(deps: GlobalPrayerRouterDeps): Router {
  const router = Router();
  const { ecosystem, requireAdminAuth, sensitiveActionLimiter, extractAdminEmail } = deps;

  // 1. Locations Directory + Worldwide City Search (Asaka MANUAL + 14 UZ Regions + Haramain + Global + Open-Meteo Geocoding)
  router.get('/api/global-prayer/locations', async (req: Request, res: Response) => {
    try {
      const q = String(req.query.q || '').trim();
      const all = ecosystem.getAllLocations();

      if (q.length > 0) {
        const lower = q.toLowerCase();
        const matches = all.filter(
          (c) =>
            c.cityName.toLowerCase().includes(lower) ||
            c.regionName.toLowerCase().includes(lower) ||
            c.countryName.toLowerCase().includes(lower) ||
            c.districtName.toLowerCase().includes(lower) ||
            (c.districts || []).some((d) => d.name.toLowerCase().includes(lower))
        );
        const geocoded = q.length >= 2 ? await searchGlobalCitiesOpenMeteo(q) : [];
        return res.json({
          success: true,
          query: q,
          matches,
          geocoded,
        });
      }

      return res.json({
        success: true,
        asakaCityId: ASAKA_CANONICAL_CITY_ID,
        uzbekistanRegionsCount: UZBEKISTAN_14_REGIONS.length,
        uzbekistanRegions: UZBEKISTAN_14_REGIONS,
        haramainFeatured: GLOBAL_CANONICAL_CITIES.filter((c) => c.featuredGroup === 'haramain'),
        centralAsiaCities: GLOBAL_CANONICAL_CITIES.filter((c) => c.featuredGroup === 'central_asia'),
        globalCities: all.filter((c) => c.countryCode !== 'UZ'),
        calculationMethods: Object.values(CALCULATION_METHODS),
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Hududlar ro‘yxatini olishda xatolik' });
    }
  });

  // 2. GPS Coordinates Resolver (maps WGS84 lat/lon to nearest Asaka/UZ/Global location or dynamic point)
  router.get('/api/global-prayer/resolve-gps', async (req: Request, res: Response) => {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({ success: false, error: 'Yaroqsiz GPS koordinatalari (lat/lon).' });
    }

    const customCities = ecosystem.getAllLocations().filter((c) => c.countryCode !== 'UZ' && !GLOBAL_CANONICAL_CITIES.some((g) => g.id === c.id));
    const nearest = findNearestLocation(lat, lon, customCities);

    return res.json({
      success: true,
      location: nearest.location,
      distanceKm: nearest.distanceKm,
      isWithinKnownCity: nearest.isWithinKnownCity,
      coordinates: { latitude: lat, longitude: lon },
    });
  });

  // 3. Unified Daily Prayer Times Schedule (Asaka = MANUAL_ADMIN, All Others = AUTO_CALCULATED)
  router.get('/api/global-prayer/schedule', async (req: Request, res: Response) => {
    try {
      const cityId = String(req.query.cityId || ASAKA_CANONICAL_CITY_ID).trim().slice(0, 120);
      const districtId = req.query.districtId ? String(req.query.districtId).trim().slice(0, 100) : undefined;
      const date = req.query.date ? String(req.query.date).trim().slice(0, 16) : undefined;
      const rawMethod = req.query.method ? String(req.query.method).trim() : undefined;
      const rawAsr = req.query.asr ? String(req.query.asr).trim() : undefined;
      const rawHighLat = req.query.highLat ? String(req.query.highLat).trim() : undefined;
      const rawMidnight = req.query.midnight ? String(req.query.midnight).trim() : undefined;

      const method = rawMethod && VALID_METHODS.has(rawMethod) ? (rawMethod as CalculationMethodId) : undefined;
      const asrMethod = rawAsr && VALID_ASR.has(rawAsr) ? (rawAsr as AsrMethodId) : undefined;
      const highLatitudeRule = rawHighLat && VALID_HIGH_LAT.has(rawHighLat) ? (rawHighLat as HighLatitudeRuleId) : undefined;
      const midnightMode = rawMidnight && VALID_MIDNIGHT.has(rawMidnight) ? (rawMidnight as MidnightModeId) : undefined;

      const lat = req.query.lat !== undefined ? Number(req.query.lat) : Number.NaN;
      const lon = req.query.lon !== undefined ? Number(req.query.lon) : Number.NaN;
      const tz = req.query.tz ? String(req.query.tz).trim().slice(0, 64) : undefined;
      const customCoords =
        Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
          ? {
              latitude: lat,
              longitude: lon,
              timezone: tz || 'UTC',
              cityName: String(req.query.cityName || 'Tanlangan shahar').slice(0, 100),
              countryName: String(req.query.countryName || 'Global').slice(0, 80),
              countryCode: String(req.query.countryCode || 'XX').slice(0, 4).toUpperCase(),
              regionName: String(req.query.regionName || '').slice(0, 80),
            }
          : undefined;

      const record = await ecosystem.resolvePrayerSchedule({
        cityId,
        districtId,
        date,
        method,
        asrMethod,
        highLatitudeRule,
        midnightMode,
        customCoords,
      });

      return res.json({
        success: true,
        record,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Namoz vaqtlarini hisoblashda xatolik yuz berdi.',
      });
    }
  });

  // 4. Monthly Prayer Calendar (Asaka MANUAL_ADMIN or AUTO city monthly calendar in local timezone)
  router.get('/api/global-prayer/monthly', (req: Request, res: Response) => {
    try {
      const cityId = String(req.query.cityId || ASAKA_CANONICAL_CITY_ID).trim().slice(0, 120);
      const districtId = req.query.districtId ? String(req.query.districtId).trim().slice(0, 100) : undefined;
      const now = new Date();
      const year = Number(req.query.year) || now.getFullYear();
      const month = Number(req.query.month) || now.getMonth() + 1;
      const rawMethod = req.query.method ? String(req.query.method).trim() : undefined;
      const rawAsr = req.query.asr ? String(req.query.asr).trim() : undefined;
      const method = rawMethod && VALID_METHODS.has(rawMethod) ? (rawMethod as CalculationMethodId) : undefined;
      const asrMethod = rawAsr && VALID_ASR.has(rawAsr) ? (rawAsr as AsrMethodId) : undefined;

      const lat = req.query.lat !== undefined ? Number(req.query.lat) : Number.NaN;
      const lon = req.query.lon !== undefined ? Number(req.query.lon) : Number.NaN;
      const tz = req.query.tz ? String(req.query.tz).trim().slice(0, 64) : undefined;
      const customCoords =
        Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
          ? {
              latitude: lat,
              longitude: lon,
              timezone: tz || 'UTC',
              cityName: String(req.query.cityName || 'Global').slice(0, 100),
            }
          : undefined;

      const cal = ecosystem.resolveMonthlyCalendar({
        cityId,
        districtId,
        year,
        month,
        method,
        asrMethod,
        customCoords,
      });

      return res.json({
        success: true,
        ...cal,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Oylik taqvim xatosi' });
    }
  });

  // 5. Global Weather Center (Open-Meteo cached Current + 24h Hourly + 7d/16d Daily + Attribution)
  router.get('/api/weather', async (req: Request, res: Response) => {
    try {
      const cityId = req.query.cityId ? String(req.query.cityId).trim().slice(0, 120) : undefined;
      const districtId = req.query.districtId ? String(req.query.districtId).trim().slice(0, 100) : undefined;
      const lat = req.query.lat !== undefined ? Number(req.query.lat) : Number.NaN;
      const lon = req.query.lon !== undefined ? Number(req.query.lon) : Number.NaN;
      const timezone = req.query.tz ? String(req.query.tz).trim().slice(0, 64) : undefined;
      const label = req.query.label ? String(req.query.label).trim().slice(0, 120) : undefined;
      const forceRefresh = req.query.refresh === '1' || req.query.refresh === 'true';

      if (
        (req.query.lat !== undefined && (!Number.isFinite(lat) || lat < -90 || lat > 90)) ||
        (req.query.lon !== undefined && (!Number.isFinite(lon) || lon < -180 || lon > 180))
      ) {
        return res.status(400).json({ success: false, error: 'Yaroqsiz ob-havo koordinatalari.' });
      }

      const weather = await ecosystem.resolveWeather({
        cityId,
        districtId,
        latitude: Number.isFinite(lat) ? lat : undefined,
        longitude: Number.isFinite(lon) ? lon : undefined,
        timezone,
        label,
        forceRefresh,
      });

      return res.json({
        success: true,
        weather,
        quotaTelemetry: getWeatherQuotaTelemetry(),
      });
    } catch (err: any) {
      return res.status(503).json({
        success: false,
        weatherUnavailable: true,
        error: err?.message || 'Ob-havo xizmati vaqtincha mavjud emas.',
        quotaTelemetry: getWeatherQuotaTelemetry(),
      });
    }
  });

  // 6. Cross-Platform User Location Preference Sync (Web + Android + Telegram)
  router.get('/api/user/location-pref', (req: Request, res: Response) => {
    const userId = String(req.query.userId || req.headers['x-asaka-user-id'] || '').trim();
    const headerUser = String(req.headers['x-asaka-user-id'] || '').trim();
    if (!userId || (headerUser && headerUser !== userId)) {
      return res.status(400).json({ success: false, error: 'Foydalanuvchi identifikatori mos emas.' });
    }
    const pref = ecosystem.getUserLocationPref(userId);
    return res.json({ success: true, preference: pref });
  });

  router.post('/api/user/location-pref', async (req: Request, res: Response) => {
    const { userId, preference, platformSource } = req.body || {};
    const cleanUser = String(userId || req.headers['x-asaka-user-id'] || '').trim();
    if (!cleanUser || !preference || typeof preference.cityId !== 'string') {
      return res.status(400).json({ success: false, error: 'Yaroqsiz hudud sozlamasi.' });
    }
    const saved = await ecosystem.saveUserLocationPref({
      userId: cleanUser,
      cityId: String(preference.cityId).slice(0, 120),
      districtId: preference.districtId ? String(preference.districtId).slice(0, 100) : undefined,
      customLocation: preference.customLocation || null,
      calculationMethod: VALID_METHODS.has(preference.calculationMethod) ? preference.calculationMethod : undefined,
      asrMethod: VALID_ASR.has(preference.asrMethod) ? preference.asrMethod : undefined,
      highLatitudeRule: VALID_HIGH_LAT.has(preference.highLatitudeRule) ? preference.highLatitudeRule : undefined,
      midnightMode: VALID_MIDNIGHT.has(preference.midnightMode) ? preference.midnightMode : undefined,
      syncAcrossDevices: preference.syncAcrossDevices !== false,
      platformSource: platformSource === 'android' || platformSource === 'telegram' ? platformSource : 'web',
      updatedAt: new Date().toISOString(),
    });
    return res.json({ success: true, preference: saved });
  });

  // ---------------------------------------------------------------------------
  // ADMIN GLOBAL CONTROL CENTER ROUTES (STRICTLY requireAdminAuth)
  // ---------------------------------------------------------------------------

  router.get('/api/admin/global-prayer/overview', requireAdminAuth, (_req: Request, res: Response) => {
    return res.json({
      success: true,
      overview: ecosystem.getAdminOverview(),
    });
  });

  router.post('/api/admin/global-prayer/asaka/publish', requireAdminAuth, sensitiveActionLimiter, async (req: Request, res: Response) => {
    const actor = extractAdminEmail(req);
    const { schedule, futureDate, futureTimes, note } = req.body || {};
    const result = await ecosystem.publishAsakaManualSchedule({
      schedule,
      futureDate,
      futureTimes,
      note: note ? String(note).slice(0, 300) : undefined,
      actor,
    });
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json({ ...result, overview: ecosystem.getAdminOverview() });
  });

  router.post('/api/admin/global-prayer/asaka/rollback', requireAdminAuth, sensitiveActionLimiter, async (req: Request, res: Response) => {
    const actor = extractAdminEmail(req);
    const versionId = String(req.body?.versionId || '').trim();
    if (!versionId) {
      return res.status(400).json({ success: false, error: 'versionId talab qilinadi.' });
    }
    const result = await ecosystem.rollbackAsakaVersion(versionId, actor);
    if (!result.success) {
      return res.status(404).json(result);
    }
    return res.json({ ...result, overview: ecosystem.getAdminOverview() });
  });

  router.post('/api/admin/global-prayer/asaka/import', requireAdminAuth, sensitiveActionLimiter, async (req: Request, res: Response) => {
    const actor = extractAdminEmail(req);
    const { entries } = req.body || {};
    const result = await ecosystem.importAsakaScheduleEntries(entries, actor);
    return res.status(result.success ? 200 : 400).json({ ...result, overview: ecosystem.getAdminOverview() });
  });

  router.post('/api/admin/global-prayer/config', requireAdminAuth, sensitiveActionLimiter, async (req: Request, res: Response) => {
    const actor = extractAdminEmail(req);
    const patch = req.body || {};
    const result = await ecosystem.updateGlobalAutoConfig(patch, actor);
    return res.json({ ...result, overview: ecosystem.getAdminOverview() });
  });

  router.post('/api/admin/global-prayer/uzbekistan/import', requireAdminAuth, sensitiveActionLimiter, async (req: Request, res: Response) => {
    const actor = extractAdminEmail(req);
    const { regionId, sourceName, rows } = req.body || {};
    const result = await ecosystem.importOfficialUzbekistanTable({
      regionId: String(regionId || ''),
      sourceName: String(sourceName || 'O‘MI rasmiy taqvim (Admin Import)'),
      rows,
      actor,
    });
    return res.status(result.success ? 200 : 400).json({ ...result, overview: ecosystem.getAdminOverview() });
  });

  router.post('/api/admin/global-prayer/verify-uzbekistan', requireAdminAuth, sensitiveActionLimiter, async (req: Request, res: Response) => {
    try {
      const actor = extractAdminEmail(req);
      const report = await ecosystem.runAndStoreUzbekistanAudit(actor);
      return res.json({
        success: true,
        report,
        overview: ecosystem.getAdminOverview(),
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Tekshiruvda xatolik yuz berdi' });
    }
  });

  router.post('/api/admin/global-prayer/weather-cache/clear', requireAdminAuth, sensitiveActionLimiter, (req: Request, res: Response) => {
    const actor = extractAdminEmail(req);
    const result = ecosystem.clearAllCaches(actor);
    return res.json({
      success: true,
      ...result,
      overview: ecosystem.getAdminOverview(),
    });
  });

  return router;
}
