/**
 * ASAKA ZIYO — CENTRAL GLOBAL PRAYER & WEATHER ECOSYSTEM SERVICE (Backend Core)
 *
 * Architectural Invariants:
 * 1. ASAKA (uz-andijan-asaka) is STRICTLY `sourceMode = 'MANUAL_ADMIN'`.
 *    - Stored in its own isolated document (`schedules/asaka-main` + `asakaManualArchives`).
 *    - NEVER overwritten by AUTO calculations, global config changes, or external APIs.
 * 2. All other 14 Uzbekistan regions & Global cities operate in `sourceMode = 'AUTO_CALCULATED'`
 *    stored strictly in `globalPrayerConfigs`.
 * 3. Shared by Web App REST API, Android Native App, and Telegram Bot.
 */

import fs from 'fs';
import path from 'path';
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
  getAllBuiltInLocations,
} from '../data/globalLocationsData';
import {
  UnifiedPrayerRecord,
  buildAsakaManualUnifiedRecord,
  calculateGlobalPrayerRecord,
  calculateMonthlyGlobalCalendar,
  getLocalDateTimeInTimezone,
} from './globalPrayerEngine';
import {
  GlobalWeatherResponse,
  fetchGlobalWeather,
  getWeatherQuotaTelemetry,
  clearWeatherCache,
} from './globalWeatherService';
import {
  UzbekistanVerificationAuditReport,
  fetchNamozVaqtiUzJson,
  runUzbekistanVerificationAudit,
} from './uzbekistanVerificationService';
import { PrayerSchedule, PrayerTimeEntry } from '../types';

export interface AsakaManualVersionSnapshot {
  versionId: string;
  versionNumber: number;
  date: string;
  formattedDateUz: string;
  hijriDate: string;
  times: PrayerTimeEntry[];
  publishedBy: string;
  publishedAt: string;
  note?: string;
}

export interface GlobalEcosystemAuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  scope: 'ASAKA_MANUAL' | 'UZBEKISTAN_AUTO' | 'GLOBAL_AUTO' | 'WEATHER';
  action: string;
  details: string;
}

export interface GlobalEcosystemErrorEntry {
  id: string;
  timestamp: string;
  component: 'PRAYER_ENGINE' | 'UZBEKISTAN_VERIFY' | 'WEATHER_API' | 'ASAKA_MANUAL';
  message: string;
}

export interface StoredUserLocationPref {
  userId: string;
  cityId: string;
  districtId?: string;
  customLocation?: CityLocationDefinition | null;
  calculationMethod?: CalculationMethodId;
  asrMethod?: AsrMethodId;
  highLatitudeRule?: HighLatitudeRuleId;
  midnightMode?: MidnightModeId;
  syncAcrossDevices: boolean;
  platformSource?: 'web' | 'android' | 'telegram';
  updatedAt: string;
}

export interface GlobalPrayerEcosystemState {
  // STRICTLY ISOLATED ASAKA MANUAL ARCHIVE (never written by AUTO jobs)
  asakaManualArchive: {
    versions: AsakaManualVersionSnapshot[];
    futureDateSchedules: Record<string, { date: string; times: PrayerTimeEntry[]; updatedBy: string; updatedAt: string; note?: string }>;
    monthlyOverrideMonth?: string; // YYYY-MM
  };
  // STRICTLY ISOLATED AUTO GLOBAL & UZBEKISTAN CONFIG (never touches Asaka)
  globalAutoConfig: {
    defaultUzMethod: CalculationMethodId;
    defaultGlobalMethod: CalculationMethodId;
    defaultGlobalAsr: AsrMethodId;
    defaultHighLatitudeRule: HighLatitudeRuleId;
    defaultMidnightMode: MidnightModeId;
    preferOfficialUzLiveSync: boolean;
    customGlobalCities: CityLocationDefinition[];
    adminImportedUzTables: Record<
      string,
      Record<
        string,
        {
          fajr: string;
          sunrise: string;
          dhuhr: string;
          asr: string;
          maghrib: string;
          isha: string;
          sourceName: string;
          importedBy: string;
          importedAt: string;
        }
      >
    >;
    lastUzbekistanAudit: UzbekistanVerificationAuditReport | null;
    updatedAt: string;
    updatedBy: string;
  };
  userLocationPrefs: Record<string, StoredUserLocationPref>;
  auditLogs: GlobalEcosystemAuditEntry[];
  errorLogs: GlobalEcosystemErrorEntry[];
}

export interface EcosystemHostCallbacks {
  getAsakaSchedule: () => PrayerSchedule;
  saveAsakaSchedule: (schedule: PrayerSchedule, actor: string) => Promise<{ success: boolean; error?: string }>;
  writeFirestoreDoc?: (collectionName: string, docId: string, data: Record<string, any>) => Promise<{ success: boolean; error?: string }>;
}

const DATA_FILE_PATH = path.resolve(process.cwd(), 'data', 'global_prayer_ecosystem.json');

function createDefaultState(): GlobalPrayerEcosystemState {
  return {
    asakaManualArchive: {
      versions: [],
      futureDateSchedules: {},
    },
    globalAutoConfig: {
      defaultUzMethod: 'UZBEKISTAN_OMI',
      defaultGlobalMethod: 'MWL',
      defaultGlobalAsr: 'HANAFI',
      defaultHighLatitudeRule: 'ANGLE_BASED',
      defaultMidnightMode: 'STANDARD',
      preferOfficialUzLiveSync: true,
      customGlobalCities: [],
      adminImportedUzTables: {},
      lastUzbekistanAudit: null,
      updatedAt: new Date().toISOString(),
      updatedBy: 'system',
    },
    userLocationPrefs: {},
    auditLogs: [],
    errorLogs: [],
  };
}

export class GlobalPrayerEcosystemService {
  private state: GlobalPrayerEcosystemState;
  private host: EcosystemHostCallbacks;
  private prayerRecordCache = new Map<string, { record: UnifiedPrayerRecord; cachedAtMs: number }>();

  constructor(host: EcosystemHostCallbacks) {
    this.host = host;
    this.state = this.loadStateFromDisk();
    this.ensureInitialAsakaSnapshot();
  }

  private loadStateFromDisk(): GlobalPrayerEcosystemState {
    try {
      if (fs.existsSync(DATA_FILE_PATH)) {
        const raw = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        const def = createDefaultState();
        return {
          asakaManualArchive: {
            ...def.asakaManualArchive,
            ...(parsed.asakaManualArchive || {}),
          },
          globalAutoConfig: {
            ...def.globalAutoConfig,
            ...(parsed.globalAutoConfig || {}),
          },
          userLocationPrefs: parsed.userLocationPrefs || {},
          auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
          errorLogs: Array.isArray(parsed.errorLogs) ? parsed.errorLogs : [],
        };
      }
    } catch {
      // fall through to default
    }
    return createDefaultState();
  }

  private persistToDisk(): void {
    try {
      const dir = path.dirname(DATA_FILE_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch {
      // non-fatal disk write error
    }
  }

  private ensureInitialAsakaSnapshot(): void {
    if (this.state.asakaManualArchive.versions.length === 0) {
      const current = this.host.getAsakaSchedule();
      if (current && Array.isArray(current.times) && current.times.length > 0) {
        this.state.asakaManualArchive.versions.push({
          versionId: `asaka-v${current.version || 1}-${Date.now()}`,
          versionNumber: current.version || 1,
          date: current.date,
          formattedDateUz: current.formattedDateUz,
          hijriDate: current.hijriDate,
          times: current.times.map((t) => ({ ...t })),
          publishedBy: current.publishedBy || 'ASAKA ZIYO Administrator',
          publishedAt: current.verifiedAt || new Date().toISOString(),
          note: 'Boshlang‘ich tasdiqlangan Asaka jadvali',
        });
        this.persistToDisk();
      }
    }
  }

  private recordAudit(
    actor: string,
    scope: GlobalEcosystemAuditEntry['scope'],
    action: string,
    details: string
  ): void {
    this.state.auditLogs.unshift({
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      actor,
      scope,
      action,
      details,
    });
    if (this.state.auditLogs.length > 200) {
      this.state.auditLogs = this.state.auditLogs.slice(0, 200);
    }
  }

  private recordError(
    component: GlobalEcosystemErrorEntry['component'],
    message: string
  ): void {
    this.state.errorLogs.unshift({
      id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      component,
      message,
    });
    if (this.state.errorLogs.length > 100) {
      this.state.errorLogs = this.state.errorLogs.slice(0, 100);
    }
    this.persistToDisk();
  }

  getAllLocations(): CityLocationDefinition[] {
    return getAllBuiltInLocations(this.state.globalAutoConfig.customGlobalCities);
  }

  /**
   * Resolves a UnifiedPrayerRecord for ANY city (Asaka MANUAL_ADMIN, 14 Uzbekistan regions, or Global cities).
   * STRICT RULE: Asaka ALWAYS returns `sourceMode = 'MANUAL_ADMIN'` from the admin-controlled store.
   */
  async resolvePrayerSchedule(params: {
    cityId?: string;
    districtId?: string;
    date?: string;
    method?: CalculationMethodId;
    asrMethod?: AsrMethodId;
    highLatitudeRule?: HighLatitudeRuleId;
    midnightMode?: MidnightModeId;
    customCoords?: {
      latitude: number;
      longitude: number;
      timezone: string;
      cityName: string;
      countryName?: string;
      countryCode?: string;
      regionName?: string;
    };
  }): Promise<UnifiedPrayerRecord> {
    const requestedCityId = (params.cityId || ASAKA_CANONICAL_CITY_ID).trim();

    // 1. ASAKA MANUAL_ADMIN PATH — STRICTLY ISOLATED, NEVER CALCULATED BY AUTO ENGINE
    if (requestedCityId === ASAKA_CANONICAL_CITY_ID || requestedCityId === 'asaka') {
      const asakaLoc = findBuiltInLocationById(ASAKA_CANONICAL_CITY_ID)!;
      const baseAdminSched = this.host.getAsakaSchedule();
      const targetDate = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : undefined;

      // Check if Admin entered a dedicated future/specific date schedule for Asaka
      if (targetDate && this.state.asakaManualArchive.futureDateSchedules[targetDate]) {
        const futureEntry = this.state.asakaManualArchive.futureDateSchedules[targetDate];
        const futureSched: PrayerSchedule = {
          ...baseAdminSched,
          date: targetDate,
          times: futureEntry.times.map((t) => ({ ...t })),
          publishedBy: futureEntry.updatedBy,
          verifiedAt: futureEntry.updatedAt,
          isAdministratorPublished: true,
        };
        return buildAsakaManualUnifiedRecord(futureSched, asakaLoc);
      }

      return buildAsakaManualUnifiedRecord(baseAdminSched, asakaLoc);
    }

    // 2. AUTO PATH (14 Uzbekistan Regions + Global Cities + Custom Geocoded Coordinates)
    let location = findBuiltInLocationById(
      requestedCityId,
      params.districtId,
      this.state.globalAutoConfig.customGlobalCities
    );

    if (!location && params.customCoords) {
      location = {
        id: requestedCityId.startsWith('geo-') ? requestedCityId : `geo-custom-${params.customCoords.latitude.toFixed(2)}-${params.customCoords.longitude.toFixed(2)}`,
        countryCode: params.customCoords.countryCode || 'XX',
        countryName: params.customCoords.countryName || 'Global',
        regionId: 'global-custom',
        regionName: params.customCoords.regionName || params.customCoords.countryName || 'Global',
        cityId: requestedCityId,
        cityName: params.customCoords.cityName || 'Tanlangan hudud',
        districtId: 'center',
        districtName: params.customCoords.cityName || 'Markaz',
        latitude: params.customCoords.latitude,
        longitude: params.customCoords.longitude,
        timezone: params.customCoords.timezone || 'UTC',
        sourceMode: 'AUTO_CALCULATED',
        defaultMethod: this.state.globalAutoConfig.defaultGlobalMethod,
        defaultAsr: this.state.globalAutoConfig.defaultGlobalAsr,
        featuredGroup: 'global',
      };
    }

    if (!location) {
      // Safe fallback to Tashkent if unknown cityId passed (never silently mutate Asaka)
      location = findBuiltInLocationById('uz-tashkent-city-main')!;
    }

    const localNow = getLocalDateTimeInTimezone(location.timezone);
    const effectiveDate = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : localNow.localDate;
    const isUzbekistan = location.countryCode === 'UZ';
    const effectiveMethod =
      params.method ||
      (isUzbekistan ? this.state.globalAutoConfig.defaultUzMethod : location.defaultMethod || this.state.globalAutoConfig.defaultGlobalMethod);
    const effectiveAsr =
      params.asrMethod ||
      (isUzbekistan ? 'HANAFI' : location.defaultAsr || this.state.globalAutoConfig.defaultGlobalAsr);

    const cacheKey = `${location.id}:${location.districtId}:${effectiveDate}:${effectiveMethod}:${effectiveAsr}:${params.highLatitudeRule || ''}:${params.midnightMode || ''}`;
    const cached = this.prayerRecordCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAtMs < 5 * 60 * 1000) {
      // Recompute live countdown seconds without recalculating ephemeris
      return {
        ...cached.record,
        localTimeNow: localNow.localTimeNow,
      };
    }

    // Check official Uzbekistan reference (Admin-imported O'MI table first, then live namoz-vaqti.uz JSON for today)
    let officialDailyTimesOverride:
      | {
          fajr: string;
          sunrise: string;
          dhuhr: string;
          asr: string;
          maghrib: string;
          isha: string;
          sourceName: string;
          verified: boolean;
          verificationNote?: string;
        }
      | undefined;

    if (isUzbekistan) {
      const importedRow = this.state.globalAutoConfig.adminImportedUzTables[location.regionId]?.[effectiveDate];
      if (importedRow) {
        officialDailyTimesOverride = {
          fajr: importedRow.fajr,
          sunrise: importedRow.sunrise,
          dhuhr: importedRow.dhuhr,
          asr: importedRow.asr,
          maghrib: importedRow.maghrib,
          isha: importedRow.isha,
          sourceName: importedRow.sourceName || 'O‘MI rasmiy jadvali (Admin Import)',
          verified: true,
          verificationNote: `Administrator tomonidan yuklangan O‘MI rasmiy taqvimi (${importedRow.importedAt.slice(0, 10)})`,
        };
      } else if (
        this.state.globalAutoConfig.preferOfficialUzLiveSync &&
        effectiveDate === localNow.localDate &&
        location.namozVaqtiSlug
      ) {
        try {
          const liveRef = await fetchNamozVaqtiUzJson(location.namozVaqtiSlug);
          if (liveRef && liveRef.date === effectiveDate) {
            officialDailyTimesOverride = {
              fajr: liveRef.times.fajr,
              sunrise: liveRef.times.sunrise,
              dhuhr: liveRef.times.dhuhr,
              asr: liveRef.times.asr,
              maghrib: liveRef.times.maghrib,
              isha: liveRef.times.isha,
              sourceName: 'Namoz-vaqti.uz (O‘MI hududiy taqvim JSON)',
              verified: true,
              verificationNote: `O‘MI taqvimi bilan sinxronlangan (Toshkentdan farq: ${liveRef.offsetMin ?? 0} daqiqa)`,
            };
          }
        } catch (err: any) {
          this.recordError('UZBEKISTAN_VERIFY', `Live UZ sync failed for ${location.cityName}: ${err?.message || 'error'}`);
        }
      }
    }

    const record = calculateGlobalPrayerRecord(location, effectiveDate, {
      method: effectiveMethod,
      asrMethod: effectiveAsr,
      highLatitudeRule: params.highLatitudeRule || this.state.globalAutoConfig.defaultHighLatitudeRule,
      midnightMode: params.midnightMode || this.state.globalAutoConfig.defaultMidnightMode,
      officialDailyTimesOverride,
    });

    if (this.prayerRecordCache.size > 300) {
      const oldest = this.prayerRecordCache.keys().next().value;
      if (oldest) this.prayerRecordCache.delete(oldest);
    }
    this.prayerRecordCache.set(cacheKey, { record, cachedAtMs: Date.now() });
    return record;
  }

  /**
   * Resolves a monthly prayer calendar for Asaka (MANUAL_ADMIN) or any AUTO city.
   */
  resolveMonthlyCalendar(params: {
    cityId?: string;
    districtId?: string;
    year: number;
    month: number;
    method?: CalculationMethodId;
    asrMethod?: AsrMethodId;
    customCoords?: { latitude: number; longitude: number; timezone: string; cityName: string };
  }) {
    const requestedCityId = (params.cityId || ASAKA_CANONICAL_CITY_ID).trim();
    const year = Math.min(2100, Math.max(2020, Number(params.year) || new Date().getFullYear()));
    const month = Math.min(12, Math.max(1, Number(params.month) || new Date().getMonth() + 1));
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const pad = (n: number) => String(n).padStart(2, '0');

    if (requestedCityId === ASAKA_CANONICAL_CITY_ID || requestedCityId === 'asaka') {
      const base = this.host.getAsakaSchedule();
      const getBaseT = (k: string) => base.times.find((t) => t.key === k)?.time || '--:--';
      const rows = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${pad(month)}-${pad(d)}`;
        const override = this.state.asakaManualArchive.futureDateSchedules[dateStr];
        const getT = (k: string) =>
          override?.times.find((t) => t.key === k)?.time || getBaseT(k);
        rows.push({
          day: d,
          localDate: dateStr,
          hijriDate: base.hijriDate,
          tahajjud: getT('tahajjud'),
          subh: getT('subh'),
          fajr: getT('bomdod'),
          sunrise: getT('quyosh'),
          dhuhr: getT('peshin'),
          asr: getT('asr'),
          maghrib: getT('shom'),
          isha: getT('xufton'),
          isCustomAdminDate: Boolean(override),
          sourceMode: 'MANUAL_ADMIN',
        });
      }
      return { sourceMode: 'MANUAL_ADMIN' as const, year, month, rows };
    }

    let location = findBuiltInLocationById(
      requestedCityId,
      params.districtId,
      this.state.globalAutoConfig.customGlobalCities
    );
    if (!location && params.customCoords) {
      location = {
        id: requestedCityId,
        countryCode: 'XX',
        countryName: 'Global',
        regionId: 'global-custom',
        regionName: 'Global',
        cityId: requestedCityId,
        cityName: params.customCoords.cityName || 'Global',
        districtId: 'center',
        districtName: params.customCoords.cityName || 'Global',
        latitude: params.customCoords.latitude,
        longitude: params.customCoords.longitude,
        timezone: params.customCoords.timezone || 'UTC',
        sourceMode: 'AUTO_CALCULATED',
        defaultMethod: this.state.globalAutoConfig.defaultGlobalMethod,
        defaultAsr: this.state.globalAutoConfig.defaultGlobalAsr,
      };
    }
    if (!location) {
      location = findBuiltInLocationById('uz-tashkent-city-main')!;
    }

    const rows = calculateMonthlyGlobalCalendar(location, year, month, {
      method: params.method || location.defaultMethod,
      asrMethod: params.asrMethod || location.defaultAsr,
    });
    return { sourceMode: 'AUTO_CALCULATED' as const, year, month, rows };
  }

  /**
   * Fetches weather for any cityId or explicit coordinates, using Open-Meteo with SWR cache.
   */
  async resolveWeather(params: {
    cityId?: string;
    districtId?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
    label?: string;
    forceRefresh?: boolean;
    simulateOfflineForTest?: boolean;
  }): Promise<GlobalWeatherResponse> {
    let lat = params.latitude;
    let lon = params.longitude;
    let tz = params.timezone;
    let label = params.label;

    if (params.cityId && (typeof lat !== 'number' || Number.isNaN(lat))) {
      const loc = findBuiltInLocationById(
        params.cityId,
        params.districtId,
        this.state.globalAutoConfig.customGlobalCities
      );
      if (loc) {
        lat = loc.latitude;
        lon = loc.longitude;
        tz = tz || loc.timezone;
        label = label || `${loc.cityName}, ${loc.countryName}`;
      }
    }

    if (typeof lat !== 'number' || typeof lon !== 'number' || Number.isNaN(lat) || Number.isNaN(lon)) {
      const asaka = findBuiltInLocationById(ASAKA_CANONICAL_CITY_ID)!;
      lat = asaka.latitude;
      lon = asaka.longitude;
      tz = tz || asaka.timezone;
      label = label || 'Asaka, O‘zbekiston';
    }

    try {
      return await fetchGlobalWeather({
        latitude: lat,
        longitude: lon,
        timezone: tz || 'Asia/Tashkent',
        locationLabel: label || 'Tanlangan hudud',
        forceRefresh: params.forceRefresh,
        simulateOfflineForTest: params.simulateOfflineForTest,
      });
    } catch (err: any) {
      this.recordError('WEATHER_API', `Weather fetch failed for ${label}: ${err?.message || 'error'}`);
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // ASAKA MANUAL_ADMIN OPERATIONS (Admin-Only, Versioned, Rollback, Audit)
  // ---------------------------------------------------------------------------

  async publishAsakaManualSchedule(params: {
    schedule?: Partial<PrayerSchedule>;
    futureDate?: string;
    futureTimes?: PrayerTimeEntry[];
    note?: string;
    actor: string;
  }): Promise<{ success: boolean; schedule?: PrayerSchedule; version?: AsakaManualVersionSnapshot; error?: string }> {
    const current = this.host.getAsakaSchedule();
    const nowIso = new Date().toISOString();

    // Case A: Adding/updating a future/specific date in Asaka monthly/future calendar
    if (params.futureDate && /^\d{4}-\d{2}-\d{2}$/.test(params.futureDate) && Array.isArray(params.futureTimes) && params.futureTimes.length >= 6) {
      this.state.asakaManualArchive.futureDateSchedules[params.futureDate] = {
        date: params.futureDate,
        times: params.futureTimes.map((t) => ({ ...t })),
        updatedBy: params.actor,
        updatedAt: nowIso,
        note: params.note,
      };
      this.recordAudit(
        params.actor,
        'ASAKA_MANUAL',
        'FUTURE_DATE_UPDATED',
        `Asaka ${params.futureDate} sanasi uchun qo‘lda jadval kiritildi`
      );
      this.persistToDisk();
      if (this.host.writeFirestoreDoc) {
        await this.host.writeFirestoreDoc('asakaManualArchives', `date-${params.futureDate}`, {
          id: `date-${params.futureDate}`,
          sourceMode: 'MANUAL_ADMIN',
          date: params.futureDate,
          times: params.futureTimes,
          updatedBy: params.actor,
          updatedAt: nowIso,
        });
      }
      return { success: true, schedule: current };
    }

    // Case B: Publishing active daily Asaka MANUAL_ADMIN schedule
    const nextVersionNumber = (current.version || 1) + 1;
    const nextSchedule: PrayerSchedule = {
      ...current,
      ...(params.schedule || {}),
      location: 'Asaka shahri, Andijon viloyati',
      timezone: 'Asia/Tashkent',
      qiblaAngleDeg: 241,
      isAdministratorPublished: true,
      publishedBy: params.actor,
      verifiedAt: nowIso,
      version: nextVersionNumber,
    };

    const saveRes = await this.host.saveAsakaSchedule(nextSchedule, params.actor);
    if (!saveRes.success) {
      this.recordError('ASAKA_MANUAL', `Failed to save Asaka schedule: ${saveRes.error}`);
      return { success: false, error: saveRes.error };
    }

    const snap: AsakaManualVersionSnapshot = {
      versionId: `asaka-v${nextVersionNumber}-${Date.now()}`,
      versionNumber: nextVersionNumber,
      date: nextSchedule.date,
      formattedDateUz: nextSchedule.formattedDateUz,
      hijriDate: nextSchedule.hijriDate,
      times: nextSchedule.times.map((t) => ({ ...t })),
      publishedBy: params.actor,
      publishedAt: nowIso,
      note: params.note || `Versiya #${nextVersionNumber} tasdiqlandi`,
    };

    this.state.asakaManualArchive.versions.unshift(snap);
    if (this.state.asakaManualArchive.versions.length > 50) {
      this.state.asakaManualArchive.versions = this.state.asakaManualArchive.versions.slice(0, 50);
    }
    this.recordAudit(
      params.actor,
      'ASAKA_MANUAL',
      'SCHEDULE_PUBLISHED',
      `Asaka rasmiy jadvali v${nextVersionNumber} (${nextSchedule.date}) saqlandi va barcha platformalarga uzatildi`
    );
    this.persistToDisk();

    if (this.host.writeFirestoreDoc) {
      await this.host.writeFirestoreDoc('asakaManualArchives', snap.versionId, {
        ...snap,
        id: snap.versionId,
        sourceMode: 'MANUAL_ADMIN',
      });
    }

    return { success: true, schedule: nextSchedule, version: snap };
  }

  async rollbackAsakaVersion(versionId: string, actor: string): Promise<{ success: boolean; schedule?: PrayerSchedule; error?: string }> {
    const target = this.state.asakaManualArchive.versions.find((v) => v.versionId === versionId);
    if (!target) {
      return { success: false, error: 'Tanlangan Asaka jadval versiyasi topilmadi.' };
    }
    const res = await this.publishAsakaManualSchedule({
      schedule: {
        date: target.date,
        formattedDateUz: target.formattedDateUz,
        hijriDate: target.hijriDate,
        times: target.times.map((t) => ({ ...t })),
      },
      note: `Oldingi tasdiqlangan versiyaga qaytildi (v${target.versionNumber} · ${target.date})`,
      actor,
    });
    if (res.success) {
      this.recordAudit(actor, 'ASAKA_MANUAL', 'ROLLBACK', `Asaka jadvali v${target.versionNumber} (${versionId}) versiyasiga qaytarildi`);
      this.persistToDisk();
    }
    return res;
  }

  async importAsakaScheduleEntries(
    entries: Array<{ date: string; times: PrayerTimeEntry[] }>,
    actor: string
  ): Promise<{ success: boolean; importedCount: number; error?: string }> {
    if (!Array.isArray(entries) || entries.length === 0) {
      return { success: false, importedCount: 0, error: 'Import qilinadigan sanalar ro‘yxati bo‘sh.' };
    }
    let count = 0;
    const nowIso = new Date().toISOString();
    for (const item of entries.slice(0, 90)) {
      if (!item?.date || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) continue;
      if (!Array.isArray(item.times) || item.times.length < 6) continue;
      this.state.asakaManualArchive.futureDateSchedules[item.date] = {
        date: item.date,
        times: item.times.map((t) => ({ ...t })),
        updatedBy: actor,
        updatedAt: nowIso,
        note: 'Admin JSON Import',
      };
      count += 1;
    }
    if (count > 0) {
      this.recordAudit(actor, 'ASAKA_MANUAL', 'IMPORT', `${count} kunlik Asaka jadvali import qilindi`);
      this.persistToDisk();
    }
    return { success: count > 0, importedCount: count };
  }

  // ---------------------------------------------------------------------------
  // GLOBAL AUTO CONFIG OPERATIONS (NEVER MODIFIES ASAKA MANUAL!)
  // ---------------------------------------------------------------------------

  async updateGlobalAutoConfig(
    patch: Partial<GlobalPrayerEcosystemState['globalAutoConfig']>,
    actor: string
  ): Promise<{ success: boolean; config: GlobalPrayerEcosystemState['globalAutoConfig'] }> {
    const safeCustomCities = Array.isArray(patch.customGlobalCities)
      ? patch.customGlobalCities.filter((c) => c.id !== ASAKA_CANONICAL_CITY_ID && c.sourceMode !== 'MANUAL_ADMIN')
      : this.state.globalAutoConfig.customGlobalCities;

    this.state.globalAutoConfig = {
      ...this.state.globalAutoConfig,
      ...(patch.defaultUzMethod ? { defaultUzMethod: patch.defaultUzMethod } : {}),
      ...(patch.defaultGlobalMethod ? { defaultGlobalMethod: patch.defaultGlobalMethod } : {}),
      ...(patch.defaultGlobalAsr ? { defaultGlobalAsr: patch.defaultGlobalAsr } : {}),
      ...(patch.defaultHighLatitudeRule ? { defaultHighLatitudeRule: patch.defaultHighLatitudeRule } : {}),
      ...(patch.defaultMidnightMode ? { defaultMidnightMode: patch.defaultMidnightMode } : {}),
      ...(typeof patch.preferOfficialUzLiveSync === 'boolean' ? { preferOfficialUzLiveSync: patch.preferOfficialUzLiveSync } : {}),
      customGlobalCities: safeCustomCities,
      updatedAt: new Date().toISOString(),
      updatedBy: actor,
    };

    // Clear ONLY AUTO prayer cache; Asaka MANUAL schedule is untouched!
    this.prayerRecordCache.clear();
    this.recordAudit(
      actor,
      'GLOBAL_AUTO',
      'CONFIG_UPDATED',
      `Global AUTO sozlamalari yangilandi (Method: ${this.state.globalAutoConfig.defaultGlobalMethod}, Asr: ${this.state.globalAutoConfig.defaultGlobalAsr}). Asaka MANUAL o‘zgarmadi.`
    );
    this.persistToDisk();

    if (this.host.writeFirestoreDoc) {
      await this.host.writeFirestoreDoc('globalPrayerConfigs', 'auto-settings', {
        id: 'auto-settings',
        sourceMode: 'AUTO_CALCULATED',
        defaultUzMethod: this.state.globalAutoConfig.defaultUzMethod,
        defaultGlobalMethod: this.state.globalAutoConfig.defaultGlobalMethod,
        defaultGlobalAsr: this.state.globalAutoConfig.defaultGlobalAsr,
        defaultHighLatitudeRule: this.state.globalAutoConfig.defaultHighLatitudeRule,
        defaultMidnightMode: this.state.globalAutoConfig.defaultMidnightMode,
        preferOfficialUzLiveSync: this.state.globalAutoConfig.preferOfficialUzLiveSync,
        updatedAt: this.state.globalAutoConfig.updatedAt,
        updatedBy: actor,
      });
    }

    return { success: true, config: this.state.globalAutoConfig };
  }

  async importOfficialUzbekistanTable(params: {
    regionId: string;
    sourceName: string;
    rows: Array<{ date: string; fajr: string; sunrise: string; dhuhr: string; asr: string; maghrib: string; isha: string }>;
    actor: string;
  }): Promise<{ success: boolean; importedCount: number; error?: string }> {
    const validRegion = UZBEKISTAN_14_REGIONS.find((r) => r.regionId === params.regionId);
    if (!validRegion) {
      return { success: false, importedCount: 0, error: 'Noto‘g‘ri O‘zbekiston hudud identifikatori.' };
    }
    if (!this.state.globalAutoConfig.adminImportedUzTables[params.regionId]) {
      this.state.globalAutoConfig.adminImportedUzTables[params.regionId] = {};
    }
    let count = 0;
    const nowIso = new Date().toISOString();
    for (const r of (params.rows || []).slice(0, 366)) {
      if (!r?.date || !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) continue;
      if (!r.fajr || !r.sunrise || !r.dhuhr || !r.asr || !r.maghrib || !r.isha) continue;
      this.state.globalAutoConfig.adminImportedUzTables[params.regionId][r.date] = {
        fajr: r.fajr,
        sunrise: r.sunrise,
        dhuhr: r.dhuhr,
        asr: r.asr,
        maghrib: r.maghrib,
        isha: r.isha,
        sourceName: params.sourceName || 'O‘MI rasmiy taqvimi (Admin Import)',
        importedBy: params.actor,
        importedAt: nowIso,
      };
      count += 1;
    }
    if (count > 0) {
      this.prayerRecordCache.clear();
      this.recordAudit(
        params.actor,
        'UZBEKISTAN_AUTO',
        'OFFICIAL_UZ_TABLE_IMPORTED',
        `${validRegion.regionName} uchun ${count} kunlik rasmiy taqvim yuklandi`
      );
      this.persistToDisk();
    }
    return { success: count > 0, importedCount: count };
  }

  async runAndStoreUzbekistanAudit(actor = 'system'): Promise<UzbekistanVerificationAuditReport> {
    const report = await runUzbekistanVerificationAudit(this.state.globalAutoConfig.adminImportedUzTables);
    this.state.globalAutoConfig.lastUzbekistanAudit = report;
    this.recordAudit(
      actor,
      'UZBEKISTAN_AUTO',
      'VERIFICATION_AUDIT_RUN',
      `14 hudud tekshirildi: ${report.verifiedRegionsCount}/${report.totalRegionsCount} tasdiqlangan (${report.auditedDate})`
    );
    this.persistToDisk();

    if (this.host.writeFirestoreDoc) {
      await this.host.writeFirestoreDoc('globalPrayerConfigs', 'uzbekistan-verification-latest', {
        id: 'uzbekistan-verification-latest',
        sourceMode: 'AUTO_CALCULATED',
        generatedAt: report.generatedAt,
        auditedDate: report.auditedDate,
        verifiedRegionsCount: report.verifiedRegionsCount,
        totalRegionsCount: report.totalRegionsCount,
      });
    }
    return report;
  }

  // ---------------------------------------------------------------------------
  // CROSS-PLATFORM USER LOCATION PREFERENCE SYNC (Web + Android + Telegram)
  // ---------------------------------------------------------------------------

  getUserLocationPref(userId: string): StoredUserLocationPref | null {
    const clean = String(userId || '').trim();
    if (!clean) return null;
    return this.state.userLocationPrefs[clean] || null;
  }

  async saveUserLocationPref(pref: StoredUserLocationPref): Promise<StoredUserLocationPref> {
    const cleanId = String(pref.userId || '').trim().slice(0, 120);
    const saved: StoredUserLocationPref = {
      ...pref,
      userId: cleanId,
      updatedAt: new Date().toISOString(),
    };
    this.state.userLocationPrefs[cleanId] = saved;
    this.persistToDisk();

    if (this.host.writeFirestoreDoc && /^[a-zA-Z0-9_\-.:]+$/.test(cleanId)) {
      await this.host.writeFirestoreDoc('userLocationPrefs', cleanId, {
        ...saved,
        id: cleanId,
      });
    }
    return saved;
  }

  // ---------------------------------------------------------------------------
  // ADMIN GLOBAL CONTROL CENTER OVERVIEW SNAPSHOT
  // ---------------------------------------------------------------------------

  getAdminOverview() {
    const asakaSchedule = this.host.getAsakaSchedule();
    return {
      asakaManual: {
        sourceMode: 'MANUAL_ADMIN',
        protectedFromAutoJobs: true,
        currentSchedule: asakaSchedule,
        versionsCount: this.state.asakaManualArchive.versions.length,
        versions: this.state.asakaManualArchive.versions.slice(0, 20),
        futureDatesCount: Object.keys(this.state.asakaManualArchive.futureDateSchedules).length,
        futureDates: Object.values(this.state.asakaManualArchive.futureDateSchedules).slice(0, 31),
      },
      uzbekistan14Regions: UZBEKISTAN_14_REGIONS.map((r) => {
        const auditRow = this.state.globalAutoConfig.lastUzbekistanAudit?.regionResults.find(
          (ar) => ar.regionId === r.regionId
        );
        return {
          regionId: r.regionId,
          regionName: r.regionName,
          capitalCityId: r.capitalCityId,
          citiesCount: r.cities.length,
          districtsCount: r.cities.reduce((sum, c) => sum + (c.districts?.length || 1), 0),
          timezone: r.timezone,
          namozVaqtiSlug: r.namozVaqtiSlug,
          verified: auditRow?.verified ?? false,
          maxAbsDiffMinutes: auditRow?.maxAbsDiffMinutes ?? null,
          referenceSource: auditRow?.referenceSource ?? 'Tekshirilmagan',
          importedDaysCount: Object.keys(this.state.globalAutoConfig.adminImportedUzTables[r.regionId] || {}).length,
        };
      }),
      globalCities: [...GLOBAL_CANONICAL_CITIES, ...this.state.globalAutoConfig.customGlobalCities],
      globalAutoConfig: {
        defaultUzMethod: this.state.globalAutoConfig.defaultUzMethod,
        defaultGlobalMethod: this.state.globalAutoConfig.defaultGlobalMethod,
        defaultGlobalAsr: this.state.globalAutoConfig.defaultGlobalAsr,
        defaultHighLatitudeRule: this.state.globalAutoConfig.defaultHighLatitudeRule,
        defaultMidnightMode: this.state.globalAutoConfig.defaultMidnightMode,
        preferOfficialUzLiveSync: this.state.globalAutoConfig.preferOfficialUzLiveSync,
        updatedAt: this.state.globalAutoConfig.updatedAt,
        updatedBy: this.state.globalAutoConfig.updatedBy,
      },
      lastUzbekistanAudit: this.state.globalAutoConfig.lastUzbekistanAudit,
      weatherTelemetry: getWeatherQuotaTelemetry(),
      prayerCacheSize: this.prayerRecordCache.size,
      syncedUsersCount: Object.keys(this.state.userLocationPrefs).length,
      auditLogs: this.state.auditLogs.slice(0, 50),
      errorLogs: this.state.errorLogs.slice(0, 30),
    };
  }

  clearAllCaches(actor: string) {
    const w = clearWeatherCache();
    const pCount = this.prayerRecordCache.size;
    this.prayerRecordCache.clear();
    this.recordAudit(actor, 'WEATHER', 'CACHE_CLEARED', `Weather (${w.clearedEntries}) va AUTO Prayer (${pCount}) keshlari tozalandi. Asaka MANUAL o‘zgarmadi.`);
    this.persistToDisk();
    return { weatherCleared: w.clearedEntries, prayerCleared: pCount };
  }
}
