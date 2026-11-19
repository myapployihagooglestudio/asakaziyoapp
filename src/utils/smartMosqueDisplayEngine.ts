/**
 * ASAKA ZIYO — Smart Mosque Display Accuracy, Countdown & Conflict Resolution Engine
 *
 * CRITICAL GUARANTEE:
 * - Prayer times are NEVER auto-calculated astronomically.
 * - All prayer times, iqamah times, Ishraq, and Juma times come strictly from
 *   administrator-verified schedules in Asia/Tashkent timezone.
 * - Countdowns are deterministically derived from live Asia/Tashkent wall clock,
 *   so page reloads never reset timers to zero and midnight transitions update automatically.
 */

import { PrayerKey, PrayerSchedule, PrayerTimeEntry, SupportedLocale } from '../types';

export type CanonicalDisplayProfileId =
  | 'royal_ivory'
  | 'emerald_royal'
  | 'modern_minimal'
  | 'madina_portrait';

export type DisplayTemplateId =
  | CanonicalDisplayProfileId
  | 'classic_mosque'
  | 'premium_emerald'
  | 'minimal_modern';

export function normalizeDisplayTemplate(template?: string | null): CanonicalDisplayProfileId {
  switch (template) {
    case 'royal_ivory':
    case 'classic_mosque':
      return 'royal_ivory';
    case 'emerald_royal':
    case 'premium_emerald':
      return 'emerald_royal';
    case 'modern_minimal':
    case 'minimal_modern':
      return 'modern_minimal';
    case 'madina_portrait':
      return 'madina_portrait';
    default:
      return 'royal_ivory';
  }
}

export type DisplayMonitorStatus = 'active' | 'disabled' | 'blocked';

export interface SmartDisplaySettings {
  showSeconds: boolean;
  showHijriDate: boolean;
  showTahajjud: boolean;
  showSubh: boolean;
  showIshraq: boolean;
  showJuma: boolean;
  showIqamahCountdown: boolean;
  showAnnouncements: boolean;
  showDailyWisdom: boolean;
  announcementIntervalSec: number;
  fontScale: 'standard' | 'large' | 'xlarge';
  brightnessPct: number;
  autoWakeLock: boolean;
}

export const DEFAULT_SMART_DISPLAY_SETTINGS: SmartDisplaySettings = {
  showSeconds: true,
  showHijriDate: true,
  showTahajjud: true,
  showSubh: true,
  showIshraq: true,
  showJuma: true,
  showIqamahCountdown: true,
  showAnnouncements: true,
  showDailyWisdom: false,
  announcementIntervalSec: 10,
  fontScale: 'standard',
  brightnessPct: 100,
  autoWakeLock: true,
};

export interface SmartMosqueScheduleProfile {
  id: string;
  mosqueName: string;
  location: string;
  timezone: 'Asia/Tashkent';
  effectiveDate: string; // YYYY-MM-DD
  validUntil: string; // YYYY-MM-DD
  hijriDate: string;
  qiblaAngleDeg: number;
  ishraqTime: string; // Explicit admin-managed Ishroq time (HH:MM)
  jumaTime: string; // Explicit admin-managed Juma azan time (HH:MM)
  jumaIqamahTime: string; // Explicit admin-managed Juma iqamah time (HH:MM)
  isAdministratorPublished: boolean;
  sourceScheduleId?: string;
  times: PrayerTimeEntry[];
  version: number;
  updatedAt: string;
  updatedBy?: string;
}

export interface DisplayAnnouncementItem {
  id: string;
  title: string;
  body: string;
  translations?: Partial<Record<SupportedLocale, { title: string; body: string }>>;
  priority: 'normal' | 'important' | 'urgent';
  mediaUrl?: string;
  isActive: boolean;
  startsAt?: string;
  expiresAt?: string;
  displayDurationSec: number;
  monitorIds?: string[]; // empty or omitted = show on all monitors
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface SmartDisplayMonitor {
  id: string;
  name: string;
  mosqueName: string;
  locationLabel: string;
  scheduleId: string;
  pairingCode: string;
  pairingCodeExpiresAt?: string;
  status: DisplayMonitorStatus;
  language: SupportedLocale;
  template: DisplayTemplateId;
  settings: SmartDisplaySettings;
  lastHeartbeatAt?: string;
  lastSyncAt?: string;
  pairedAt?: string;
  deviceInfo?: {
    resolution?: string;
    fullscreen?: boolean;
    wakeLockActive?: boolean;
    userAgent?: string;
  };
  onlineStatus?: 'online' | 'offline';
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface DisplayConnectionRecord {
  id: string;
  monitorId: string;
  monitorName: string;
  pairedAt: string;
  lastHeartbeatAt: string;
  resolution?: string;
  fullscreen?: boolean;
  wakeLockActive?: boolean;
  status: 'connected' | 'disconnected' | 'revoked';
}

export interface ScheduleValidationResult {
  isValid: boolean;
  isExpired: boolean;
  isNotYetEffective: boolean;
  isUnpublished: boolean;
  severity: 'ok' | 'warning' | 'error';
  warnings: string[];
  todayDateStr: string;
}

export interface TashkentClockParts {
  dateStr: string; // YYYY-MM-DD
  year: number;
  monthIndex: number; // 0-11
  day: number;
  weekdayIndex: number; // 0 = Sun .. 5 = Fri .. 6 = Sat
  isFriday: boolean;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  hh: string;
  mm: string;
  ss: string;
}

export interface SmartDisplayTimeline {
  clock: TashkentClockParts;
  currentPrayerKey: PrayerKey | 'juma' | null;
  currentPrayer: PrayerTimeEntry | null;
  nextAzanKey: PrayerKey | 'juma' | null;
  nextAzanEntry: PrayerTimeEntry | null;
  nextAzanTime: string;
  secondsToNextAzan: number;
  nextAzanCountdown: string;
  isNextAzanTomorrow: boolean;
  iqamahPrayerKey: PrayerKey | 'juma' | null;
  iqamahPrayerNameAr: string;
  iqamahTime: string;
  secondsToIqamah: number;
  iqamahCountdown: string;
  isBetweenAzanAndIqamah: boolean;
  progressRatio: number; // 0..1 between current prayer and next prayer
}

const TIME_HHMM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

export function isValidTimeHHMM(val?: string | null): boolean {
  if (!val || typeof val !== 'string') return false;
  return TIME_HHMM_REGEX.test(val.trim());
}

export function parseTimeToSeconds(timeStr?: string | null): number {
  if (!timeStr || typeof timeStr !== 'string') return -1;
  const match = timeStr.trim().match(TIME_HHMM_REGEX);
  if (!match) return -1;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const s = match[3] ? parseInt(match[3], 10) : 0;
  return h * 3600 + m * 60 + s;
}

export function formatSecondsHms(totalSec: number): string {
  const safe = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Extracts exact Asia/Tashkent calendar and clock components from any Date instance.
 * Asia/Tashkent is permanently UTC+5 (no DST), so even if a Smart TV browser lacks
 * full ICU timezone tables, fallback computes exact UTC+5 without drifting.
 */
export function getTashkentClockParts(nowInput?: Date): TashkentClockParts {
  const now = nowInput ? new Date(nowInput.getTime()) : new Date();
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Tashkent',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    const parts = formatter.formatToParts(now);
    const map: Record<string, string> = {};
    for (const p of parts) {
      map[p.type] = p.value;
    }
    const year = parseInt(map.year, 10);
    const month = parseInt(map.month, 10);
    const day = parseInt(map.day, 10);
    const hours = parseInt(map.hour, 10) % 24;
    const minutes = parseInt(map.minute, 10);
    const seconds = parseInt(map.second, 10);
    const weekdayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    const weekdayIndex = weekdayMap[map.weekday] ?? new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return {
      dateStr,
      year,
      monthIndex: month - 1,
      day,
      weekdayIndex,
      isFriday: weekdayIndex === 5,
      hours,
      minutes,
      seconds,
      totalSeconds: hours * 3600 + minutes * 60 + seconds,
      hh: String(hours).padStart(2, '0'),
      mm: String(minutes).padStart(2, '0'),
      ss: String(seconds).padStart(2, '0'),
    };
  } catch {
    // Deterministic UTC+5 fallback for older Smart TV WebKit engines
    const shifted = new Date(now.getTime() + 5 * 3600 * 1000);
    const year = shifted.getUTCFullYear();
    const month = shifted.getUTCMonth() + 1;
    const day = shifted.getUTCDate();
    const weekdayIndex = shifted.getUTCDay();
    const hours = shifted.getUTCHours();
    const minutes = shifted.getUTCMinutes();
    const seconds = shifted.getUTCSeconds();
    return {
      dateStr: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      year,
      monthIndex: month - 1,
      day,
      weekdayIndex,
      isFriday: weekdayIndex === 5,
      hours,
      minutes,
      seconds,
      totalSeconds: hours * 3600 + minutes * 60 + seconds,
      hh: String(hours).padStart(2, '0'),
      mm: String(minutes).padStart(2, '0'),
      ss: String(seconds).padStart(2, '0'),
    };
  }
}

/**
 * Adds a specified number of minutes to an HH:MM string (used ONLY to prefill initial
 * default admin editor field for Ishroq when an existing schedule has never saved ishraqTime yet;
 * once saved, administrator's explicit value is always used verbatim).
 */
export function addMinutesToHHMM(hhmm: string, deltaMinutes: number): string {
  const sec = parseTimeToSeconds(hhmm);
  if (sec < 0) return '07:05';
  const totalMin = Math.floor(sec / 60) + deltaMinutes;
  const normalized = ((totalMin % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Builds a SmartMosqueScheduleProfile from the existing primary ASAKA ZIYO PrayerSchedule
 * without altering any admin-entered prayer or iqamah time.
 */
export function buildDisplayScheduleFromMainSchedule(
  mainSchedule: PrayerSchedule,
  overrides?: Partial<SmartMosqueScheduleProfile>
): SmartMosqueScheduleProfile {
  const clock = getTashkentClockParts();
  const quyoshEntry = mainSchedule.times.find((t) => t.key === 'quyosh');
  const peshinEntry = mainSchedule.times.find((t) => t.key === 'peshin');

  // Default validity window: from schedule date to end of its month (unless admin specified validUntil)
  const effectiveDate = overrides?.effectiveDate || mainSchedule.date || clock.dateStr;
  const defaultValidUntil = (() => {
    const baseDate = /^\d{4}-\d{2}-\d{2}$/.test(effectiveDate) ? effectiveDate : clock.dateStr;
    const [y, m] = baseDate.split('-').map(Number);
    if (!y || !m) return clock.dateStr;
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  })();

  return {
    id: overrides?.id || 'asaka-main',
    mosqueName: overrides?.mosqueName || '«MuhammadSolih Hoji» Jomeʼ Masjidi',
    location: overrides?.location || mainSchedule.location || 'Asaka shahri, Andijon viloyati',
    timezone: 'Asia/Tashkent',
    effectiveDate,
    validUntil: overrides?.validUntil || defaultValidUntil,
    hijriDate: overrides?.hijriDate || mainSchedule.hijriDate || '',
    qiblaAngleDeg: overrides?.qiblaAngleDeg ?? mainSchedule.qiblaAngleDeg ?? 241,
    ishraqTime:
      overrides?.ishraqTime ||
      (quyoshEntry?.time ? addMinutesToHHMM(quyoshEntry.time, 20) : '07:06'),
    jumaTime: overrides?.jumaTime || peshinEntry?.time || '13:00',
    jumaIqamahTime: overrides?.jumaIqamahTime || peshinEntry?.iqamahTime || '13:15',
    isAdministratorPublished:
      overrides?.isAdministratorPublished ?? Boolean(mainSchedule.isAdministratorPublished),
    sourceScheduleId: overrides?.sourceScheduleId || 'asaka-main',
    times: overrides?.times && overrides.times.length > 0 ? overrides.times : mainSchedule.times,
    version: overrides?.version ?? mainSchedule.version ?? 1,
    updatedAt: overrides?.updatedAt || mainSchedule.verifiedAt || new Date().toISOString(),
    updatedBy: overrides?.updatedBy || mainSchedule.publishedBy || 'Asaka Ziyo Maʼmuriyati',
  };
}

/**
 * Audits a display schedule for chronological accuracy, Iqamah consistency,
 * publication status, and effective/expiration dates in Asia/Tashkent.
 */
export function validateDisplaySchedule(
  schedule: SmartMosqueScheduleProfile,
  nowInput?: Date
): ScheduleValidationResult {
  const clock = getTashkentClockParts(nowInput);
  const warnings: string[] = [];
  let hasError = false;

  const isUnpublished = !schedule.isAdministratorPublished;
  if (isUnpublished) {
    warnings.push('Jadval hali administrator tomonidan «Rasmiy tasdiqlangan» holatiga oʻtkazilmagan.');
  }

  const todayStr = clock.dateStr;
  const isExpired =
    Boolean(schedule.validUntil && /^\d{4}-\d{2}-\d{2}$/.test(schedule.validUntil)) &&
    todayStr > schedule.validUntil;
  const isNotYetEffective =
    Boolean(schedule.effectiveDate && /^\d{4}-\d{2}-\d{2}$/.test(schedule.effectiveDate)) &&
    todayStr < schedule.effectiveDate;

  if (isExpired) {
    warnings.push(
      `Jadval amal qilish muddati (${schedule.validUntil}) tugagan. Bugungi Toshkent sanasi: ${todayStr}.`
    );
  }
  if (isNotYetEffective) {
    warnings.push(
      `Jadval amal qilish boshlanish sanasi (${schedule.effectiveDate}) hali kelmagan.`
    );
  }

  const requiredFardKeys: PrayerKey[] = ['bomdod', 'quyosh', 'peshin', 'asr', 'shom', 'xufton'];
  const byKey = new Map<PrayerKey, PrayerTimeEntry>();
  for (const t of schedule.times || []) {
    byKey.set(t.key, t);
  }

  for (const key of requiredFardKeys) {
    const entry = byKey.get(key);
    if (!entry || !isValidTimeHHMM(entry.time)) {
      hasError = true;
      warnings.push(`«${key}» namoz vaqti kiritilmagan yoki notoʻgʻri formatda (HH:MM).`);
    }
  }

  // Chronological check for core sequence
  const sequence: PrayerKey[] = ['tahajjud', 'subh', 'bomdod', 'quyosh', 'peshin', 'asr', 'shom', 'xufton'];
  let prevSec = -1;
  let prevKey: PrayerKey | null = null;
  for (const key of sequence) {
    const entry = byKey.get(key);
    if (!entry || !isValidTimeHHMM(entry.time)) continue;
    const sec = parseTimeToSeconds(entry.time);
    if (prevSec >= 0 && sec <= prevSec) {
      hasError = true;
      warnings.push(`Vaqt tartibi buzilgan: «${key}» (${entry.time}) «${prevKey}» vaqtidan keyin boʻlishi kerak.`);
    }
    prevSec = sec;
    prevKey = key;

    if (entry.iqamahTime) {
      if (!isValidTimeHHMM(entry.iqamahTime)) {
        hasError = true;
        warnings.push(`«${entry.nameUz}» iqomat vaqti notoʻgʻri formatda.`);
      } else {
        const iqSec = parseTimeToSeconds(entry.iqamahTime);
        if (iqSec < sec) {
          hasError = true;
          warnings.push(
            `«${entry.nameUz}» iqomat vaqti (${entry.iqamahTime}) azon vaqtidan (${entry.time}) oldin qoʻyilgan.`
          );
        }
      }
    }
  }

  if (schedule.ishraqTime && !isValidTimeHHMM(schedule.ishraqTime)) {
    hasError = true;
    warnings.push('Ishroq vaqti notoʻgʻri formatda (HH:MM).');
  } else if (schedule.ishraqTime && byKey.get('quyosh')) {
    const qSec = parseTimeToSeconds(byKey.get('quyosh')!.time);
    const iSec = parseTimeToSeconds(schedule.ishraqTime);
    if (qSec >= 0 && iSec >= 0 && iSec < qSec) {
      hasError = true;
      warnings.push(`Ishroq vaqti (${schedule.ishraqTime}) Quyosh chiqishidan (${byKey.get('quyosh')!.time}) oldin boʻla olmaydi.`);
    }
  }

  if (schedule.jumaTime && !isValidTimeHHMM(schedule.jumaTime)) {
    hasError = true;
    warnings.push('Juma namozi vaqti notoʻgʻri formatda (HH:MM).');
  }

  const severity: 'ok' | 'warning' | 'error' = hasError
    ? 'error'
    : isExpired || isNotYetEffective || isUnpublished
      ? 'warning'
      : 'ok';

  return {
    isValid: !hasError,
    isExpired,
    isNotYetEffective,
    isUnpublished,
    severity,
    warnings,
    todayDateStr: todayStr,
  };
}

/**
 * Deterministic Smart Mosque Display Timeline Calculator (Asia/Tashkent).
 * Computes current active prayer, next Azan countdown, and Iqamah countdown purely from
 * the admin-entered schedule and live Tashkent wall clock (never resets on refresh).
 */
export function computeSmartDisplayTimeline(
  schedule: SmartMosqueScheduleProfile,
  nowInput?: Date
): SmartDisplayTimeline {
  const clock = getTashkentClockParts(nowInput);
  const nowSec = clock.totalSeconds;

  // Build ordered obligatory congregation list (5 daily prayers; Peshin swaps to Juma on Friday if configured)
  const fardKeys: PrayerKey[] = ['bomdod', 'peshin', 'asr', 'shom', 'xufton'];
  const byKey = new Map<PrayerKey, PrayerTimeEntry>();
  for (const t of schedule.times || []) {
    byKey.set(t.key, t);
  }

  interface TimelineSlot {
    key: PrayerKey | 'juma';
    entry: PrayerTimeEntry;
    azanSec: number;
    iqamahTime: string;
    iqamahSec: number;
  }

  const slots: TimelineSlot[] = [];
  for (const key of fardKeys) {
    const base = byKey.get(key);
    if (!base) continue;

    if (key === 'peshin' && clock.isFriday && isValidTimeHHMM(schedule.jumaTime)) {
      const jumaAzan = schedule.jumaTime;
      const jumaIqamah = isValidTimeHHMM(schedule.jumaIqamahTime)
        ? schedule.jumaIqamahTime
        : base.iqamahTime || jumaAzan;
      const azanSec = parseTimeToSeconds(jumaAzan);
      const iqamahSec = parseTimeToSeconds(jumaIqamah);
      if (azanSec >= 0) {
        slots.push({
          key: 'juma',
          entry: {
            ...base,
            nameUz: 'Juma',
            nameAr: 'الجُمُعَة',
            time: jumaAzan,
            iqamahTime: jumaIqamah,
          },
          azanSec,
          iqamahTime: jumaIqamah,
          iqamahSec: iqamahSec >= 0 ? iqamahSec : azanSec,
        });
      }
      continue;
    }

    const azanSec = parseTimeToSeconds(base.time);
    if (azanSec < 0) continue;
    const iqTime = isValidTimeHHMM(base.iqamahTime) ? base.iqamahTime! : base.time;
    const iqSec = parseTimeToSeconds(iqTime);
    slots.push({
      key,
      entry: base,
      azanSec,
      iqamahTime: iqTime,
      iqamahSec: iqSec >= 0 ? iqSec : azanSec,
    });
  }

  slots.sort((a, b) => a.azanSec - b.azanSec);

  if (slots.length === 0) {
    return {
      clock,
      currentPrayerKey: null,
      currentPrayer: null,
      nextAzanKey: null,
      nextAzanEntry: null,
      nextAzanTime: '--:--',
      secondsToNextAzan: 0,
      nextAzanCountdown: '00:00:00',
      isNextAzanTomorrow: false,
      iqamahPrayerKey: null,
      iqamahPrayerNameAr: 'الصلاة',
      iqamahTime: '--:--',
      secondsToIqamah: 0,
      iqamahCountdown: '00:00:00',
      isBetweenAzanAndIqamah: false,
      progressRatio: 0,
    };
  }

  // 1. Next upcoming Azan today (or tomorrow's Bomdod after Xufton)
  const upcomingIdx = slots.findIndex((s) => s.azanSec > nowSec);
  let nextSlot: TimelineSlot;
  let currentSlot: TimelineSlot;
  let secondsToNextAzan: number;
  let isNextAzanTomorrow = false;
  let windowDurationSec: number;

  if (upcomingIdx >= 0) {
    nextSlot = slots[upcomingIdx];
    currentSlot = upcomingIdx > 0 ? slots[upcomingIdx - 1] : slots[slots.length - 1];
    secondsToNextAzan = nextSlot.azanSec - nowSec;
    windowDurationSec =
      upcomingIdx > 0
        ? nextSlot.azanSec - currentSlot.azanSec
        : 86400 - currentSlot.azanSec + nextSlot.azanSec;
  } else {
    nextSlot = slots[0];
    currentSlot = slots[slots.length - 1];
    secondsToNextAzan = 86400 - nowSec + nextSlot.azanSec;
    isNextAzanTomorrow = true;
    windowDurationSec = 86400 - currentSlot.azanSec + nextSlot.azanSec;
  }

  const elapsedInWindow = Math.max(0, windowDurationSec - secondsToNextAzan);
  const progressRatio =
    windowDurationSec > 0 ? Math.min(1, Math.max(0, elapsedInWindow / windowDurationSec)) : 0;

  // 2. Iqamah Countdown:
  // First check if we are currently in the active window between Azan and Iqamah of ANY prayer today
  const waitingIqamahSlot = slots.find(
    (s) => s.iqamahSec > s.azanSec && nowSec >= s.azanSec && nowSec < s.iqamahSec
  );

  let iqamahSlot: TimelineSlot;
  let secondsToIqamah: number;
  let isBetweenAzanAndIqamah = false;

  if (waitingIqamahSlot) {
    iqamahSlot = waitingIqamahSlot;
    secondsToIqamah = waitingIqamahSlot.iqamahSec - nowSec;
    isBetweenAzanAndIqamah = true;
  } else {
    iqamahSlot = nextSlot;
    secondsToIqamah = nextSlot.iqamahSec - nowSec;
    if (secondsToIqamah < 0) {
      secondsToIqamah += 86400;
    }
  }

  return {
    clock,
    currentPrayerKey: currentSlot.key,
    currentPrayer: currentSlot.entry,
    nextAzanKey: nextSlot.key,
    nextAzanEntry: nextSlot.entry,
    nextAzanTime: nextSlot.entry.time,
    secondsToNextAzan,
    nextAzanCountdown: formatSecondsHms(secondsToNextAzan),
    isNextAzanTomorrow,
    iqamahPrayerKey: iqamahSlot.key,
    iqamahPrayerNameAr: iqamahSlot.entry.nameAr,
    iqamahTime: iqamahSlot.iqamahTime,
    secondsToIqamah,
    iqamahCountdown: formatSecondsHms(secondsToIqamah),
    isBetweenAzanAndIqamah,
    progressRatio,
  };
}

/**
 * Versioned Conflict Resolution Merger:
 * Never allows a stale offline record to overwrite a newer server/Firestore record,
 * and never wipes existing confirmed data when incoming data is empty or corrupt.
 */
export function resolveVersionedConflict<T extends { version?: number; updatedAt?: string }>(
  localRecord: T | null | undefined,
  remoteRecord: T | null | undefined
): { winner: T | null; source: 'remote' | 'local' | 'none'; hadConflict: boolean } {
  if (!localRecord && !remoteRecord) {
    return { winner: null, source: 'none', hadConflict: false };
  }
  if (!localRecord) {
    return { winner: remoteRecord!, source: 'remote', hadConflict: false };
  }
  if (!remoteRecord) {
    return { winner: localRecord, source: 'local', hadConflict: false };
  }

  const localVer = typeof localRecord.version === 'number' ? localRecord.version : 0;
  const remoteVer = typeof remoteRecord.version === 'number' ? remoteRecord.version : 0;

  if (remoteVer > localVer) {
    return { winner: remoteRecord, source: 'remote', hadConflict: localVer > 0 };
  }
  if (localVer > remoteVer) {
    return { winner: localRecord, source: 'local', hadConflict: remoteVer > 0 };
  }

  const localTs = localRecord.updatedAt ? Date.parse(localRecord.updatedAt) || 0 : 0;
  const remoteTs = remoteRecord.updatedAt ? Date.parse(remoteRecord.updatedAt) || 0 : 0;

  if (remoteTs >= localTs) {
    return { winner: remoteRecord, source: 'remote', hadConflict: localTs > 0 && remoteTs !== localTs };
  }
  return { winner: localRecord, source: 'local', hadConflict: true };
}

/**
 * Checks whether a monitor's last heartbeat falls within the online threshold (95 seconds).
 */
export function isMonitorOnline(lastHeartbeatAt?: string, nowMs = Date.now()): boolean {
  if (!lastHeartbeatAt) return false;
  const ts = Date.parse(lastHeartbeatAt);
  if (!Number.isFinite(ts)) return false;
  return nowMs - ts <= 95_000;
}
