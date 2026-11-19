/**
 * ASAKA ZIYO — Smart Mosque Display Persistence, Pairing, Heartbeat & Sync Service
 *
 * Architecture:
 * - Primary cloud store: Firebase Firestore (`displayMonitors`, `displayConnections`,
 *   `displaySchedules`, `displayAnnouncements`, linked to `schedules/asaka-main`).
 * - Secondary backup store: Supabase (`syncDisplaySystemToSupabase`) — non-blocking fallback.
 * - Offline resilience: Versioned localStorage snapshot with conflict resolution so
 *   internet drops never blank the TV or lose confirmed prayer times.
 * - Zero admin leakage: Monitor devices hold only scoped HMAC-signed monitor tokens
 *   (`asaka_disp_...`) and can NEVER access admin collections or other monitors.
 */

import {
  DEFAULT_SMART_DISPLAY_SETTINGS,
  DisplayAnnouncementItem,
  DisplayConnectionRecord,
  ScheduleValidationResult,
  SmartDisplayMonitor,
  SmartMosqueScheduleProfile,
  buildDisplayScheduleFromMainSchedule,
  resolveVersionedConflict,
  validateDisplaySchedule,
} from './smartMosqueDisplayEngine';
import {
  getActiveAdminToken,
  listenToFirestoreCollection,
  listenToFirestoreDoc,
} from './firebaseClient';
import { getStoredPrayerSchedule } from './databaseService';
import { syncDisplaySystemToSupabase } from './supabaseService';
import { PrayerSchedule, SupportedLocale } from '../types';

const MONITOR_SESSION_KEY = 'asaka_ziyo_display_session_v1';
const MONITOR_SNAPSHOT_CACHE_KEY = 'asaka_ziyo_display_snapshot_v1';

export interface PairedMonitorSession {
  monitorId: string;
  monitorToken: string;
  monitorName: string;
  pairedAt: string;
}

export interface DisplaySyncSnapshot {
  mode: 'paired' | 'preview';
  monitorStatus: 'active' | 'disabled' | 'blocked';
  monitor: SmartDisplayMonitor | null;
  schedule: SmartMosqueScheduleProfile;
  announcements: DisplayAnnouncementItem[];
  validation: ScheduleValidationResult;
  serverTimeIso: string;
  cachedAt: string;
}

export interface AdminDisplayOverview {
  monitors: SmartDisplayMonitor[];
  schedules: SmartMosqueScheduleProfile[];
  announcements: DisplayAnnouncementItem[];
  connections: DisplayConnectionRecord[];
  scheduleValidations: Record<string, ScheduleValidationResult>;
  mainSchedule: PrayerSchedule;
  firestoreConnected: boolean;
  serverTimeIso: string;
}

function getDisplayApiBaseUrl(): string {
  const configured = ((import.meta as any).env?.VITE_API_BASE_URL || '').replace(/\/+$/, '');
  if (configured) return configured;
  if (
    typeof window !== 'undefined' &&
    window.location?.origin?.startsWith('http') &&
    window.location.hostname !== 'appassets.androidplatform.net'
  ) {
    return window.location.origin;
  }
  if (typeof process !== 'undefined' && Boolean((process as any)?.versions?.node)) {
    return (process.env?.API_BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
  }
  return '';
}

function getAdminHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getActiveAdminToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

// ============================================================================
// MONITOR SESSION & OFFLINE CACHE (AUTO-RECOVERY ON REOPEN / OFFLINE)
// ============================================================================

export function getSavedMonitorSession(): PairedMonitorSession | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(MONITOR_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.monitorId === 'string' &&
      typeof parsed.monitorToken === 'string' &&
      parsed.monitorToken.startsWith('asaka_disp_')
    ) {
      return parsed as PairedMonitorSession;
    }
  } catch {
    // ignore corrupted cache
  }
  return null;
}

export function saveMonitorSession(session: PairedMonitorSession): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(MONITOR_SESSION_KEY, JSON.stringify(session));
    }
  } catch {
    // ignore storage quota errors
  }
}

export function clearMonitorSession(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(MONITOR_SESSION_KEY);
    }
  } catch {
    // ignore
  }
}

export function getCachedDisplaySnapshot(): DisplaySyncSnapshot | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(MONITOR_SNAPSHOT_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.schedule && Array.isArray(parsed.schedule.times)) {
      return {
        ...parsed,
        validation: validateDisplaySchedule(parsed.schedule),
      } as DisplaySyncSnapshot;
    }
  } catch {
    // ignore
  }
  return null;
}

export function saveCachedDisplaySnapshot(incoming: DisplaySyncSnapshot): DisplaySyncSnapshot {
  const existing = getCachedDisplaySnapshot();
  let mergedSchedule = incoming.schedule;
  if (existing?.schedule && existing.schedule.id === incoming.schedule.id) {
    const resolved = resolveVersionedConflict(existing.schedule, incoming.schedule);
    if (resolved.winner) {
      mergedSchedule = resolved.winner;
    }
  }

  let mergedMonitor = incoming.monitor;
  if (existing?.monitor && incoming.monitor && existing.monitor.id === incoming.monitor.id) {
    const resolvedMonitor = resolveVersionedConflict(existing.monitor, incoming.monitor);
    if (resolvedMonitor.winner) {
      mergedMonitor = resolvedMonitor.winner;
    }
  }

  const finalSnapshot: DisplaySyncSnapshot = {
    ...incoming,
    monitor: mergedMonitor,
    schedule: mergedSchedule,
    validation: validateDisplaySchedule(mergedSchedule),
    cachedAt: new Date().toISOString(),
  };

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(MONITOR_SNAPSHOT_CACHE_KEY, JSON.stringify(finalSnapshot));
    }
  } catch {
    // ignore
  }

  return finalSnapshot;
}

export function buildFallbackLocalSnapshot(): DisplaySyncSnapshot {
  const cached = getCachedDisplaySnapshot();
  if (cached) return cached;
  const mainSchedule = getStoredPrayerSchedule();
  const profile = buildDisplayScheduleFromMainSchedule(mainSchedule);
  return {
    mode: 'preview',
    monitorStatus: 'active',
    monitor: null,
    schedule: profile,
    announcements: [],
    validation: validateDisplaySchedule(profile),
    serverTimeIso: new Date().toISOString(),
    cachedAt: new Date().toISOString(),
  };
}

// ============================================================================
// MONITOR DEVICE RUNTIME API (PAIR, SYNC, HEARTBEAT, LIVE FIRESTORE LISTENERS)
// ============================================================================

export async function pairMonitorWithCode(
  pairingCode: string,
  deviceInfo?: { resolution?: string; userAgent?: string; fullscreen?: boolean; wakeLockActive?: boolean }
): Promise<{ success: boolean; session?: PairedMonitorSession; snapshot?: DisplaySyncSnapshot; error?: string }> {
  const cleanCode = pairingCode.replace(/\D/g, '').slice(0, 6);
  if (cleanCode.length !== 6) {
    return { success: false, error: '6 xonali ulash kodini toʻliq kiriting.' };
  }

  try {
    const resp = await fetch(`${getDisplayApiBaseUrl()}/api/display/pair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pairingCode: cleanCode,
        deviceInfo: {
          resolution:
            deviceInfo?.resolution ||
            (typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '1920x1080'),
          userAgent:
            deviceInfo?.userAgent ||
            (typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 160) : 'SmartTV'),
          fullscreen: Boolean(deviceInfo?.fullscreen),
          wakeLockActive: Boolean(deviceInfo?.wakeLockActive),
        },
      }),
    });

    const json = await resp.json().catch(() => ({}));
    if (!resp.ok || !json.success || !json.monitorToken) {
      return {
        success: false,
        error: json.error || 'Ulash kodi notoʻgʻri yoki muddati tugagan.',
      };
    }

    const session: PairedMonitorSession = {
      monitorId: json.monitor.id,
      monitorToken: json.monitorToken,
      monitorName: json.monitor.name,
      pairedAt: json.pairedAt || new Date().toISOString(),
    };
    saveMonitorSession(session);

    const snapshot = saveCachedDisplaySnapshot({
      mode: 'paired',
      monitorStatus: json.monitor.status || 'active',
      monitor: json.monitor,
      schedule: json.schedule,
      announcements: Array.isArray(json.announcements) ? json.announcements : [],
      validation: validateDisplaySchedule(json.schedule),
      serverTimeIso: json.serverTimeIso || new Date().toISOString(),
      cachedAt: new Date().toISOString(),
    });

    return { success: true, session, snapshot };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Server bilan aloqa oʻrnatilmadi. Internetni tekshiring.',
    };
  }
}

export async function syncDisplaySnapshotFromServer(options?: {
  monitorToken?: string;
  preview?: boolean;
}): Promise<{ success: boolean; snapshot?: DisplaySyncSnapshot; revoked?: boolean; error?: string }> {
  try {
    const headers: Record<string, string> = {};
    if (options?.monitorToken) {
      headers.Authorization = `Bearer ${options.monitorToken}`;
    }
    const query = options?.preview ? '?preview=1' : '';
    const resp = await fetch(`${getDisplayApiBaseUrl()}/api/display/sync${query}`, {
      method: 'GET',
      cache: 'no-store',
      headers,
    });

    const json = await resp.json().catch(() => ({}));
    if (resp.status === 401 || resp.status === 403) {
      if (json.code === 'MONITOR_REVOKED' || json.code === 'MONITOR_NOT_FOUND') {
        clearMonitorSession();
        return { success: false, revoked: true, error: json.error || 'Monitor sessiyasi bekor qilingan.' };
      }
    }
    if (!resp.ok || !json.success || !json.schedule) {
      return { success: false, error: json.error || 'Sinxronlashda xatolik yuz berdi.' };
    }

    const snapshot = saveCachedDisplaySnapshot({
      mode: json.mode === 'paired' ? 'paired' : 'preview',
      monitorStatus: json.monitorStatus || json.monitor?.status || 'active',
      monitor: json.monitor || null,
      schedule: json.schedule,
      announcements: Array.isArray(json.announcements) ? json.announcements : [],
      validation: validateDisplaySchedule(json.schedule),
      serverTimeIso: json.serverTimeIso || new Date().toISOString(),
      cachedAt: new Date().toISOString(),
    });

    return { success: true, snapshot };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Oflayn holat: keshdan foydalanilmoqda.',
    };
  }
}

export async function sendMonitorHeartbeat(
  monitorToken: string,
  telemetry: {
    resolution?: string;
    fullscreen?: boolean;
    wakeLockActive?: boolean;
    scheduleVersion?: number;
  }
): Promise<{ success: boolean; status?: 'active' | 'disabled' | 'blocked'; latestVersion?: number }> {
  try {
    const resp = await fetch(`${getDisplayApiBaseUrl()}/api/display/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${monitorToken}`,
      },
      body: JSON.stringify(telemetry),
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok || !json.success) {
      return { success: false };
    }
    return {
      success: true,
      status: json.status,
      latestVersion: json.latestVersion,
    };
  } catch {
    return { success: false };
  }
}

/**
 * Attaches real-time Firestore listeners to public display schedules and announcements
 * so changes made in AdminPortal appear on the TV screen within seconds.
 */
export function subscribeToLiveDisplayFirestoreUpdates(
  scheduleId: string,
  callbacks: {
    onScheduleUpdate: (schedule: SmartMosqueScheduleProfile) => void;
    onAnnouncementsUpdate: (announcements: DisplayAnnouncementItem[]) => void;
  }
): () => void {
  const unsubDisplaySchedule = listenToFirestoreDoc<SmartMosqueScheduleProfile>(
    'displaySchedules',
    scheduleId || 'asaka-main',
    (docData) => {
      if (docData && Array.isArray(docData.times) && docData.times.length > 0) {
        callbacks.onScheduleUpdate(docData);
      }
    }
  );

  // Also listen to primary main schedule if this monitor uses 'asaka-main'
  const unsubMainSchedule =
    (scheduleId || 'asaka-main') === 'asaka-main'
      ? listenToFirestoreDoc<PrayerSchedule>('schedules', 'asaka-main', (mainDoc) => {
          if (mainDoc && Array.isArray(mainDoc.times) && mainDoc.times.length > 0) {
            const cached = getCachedDisplaySnapshot();
            const merged = buildDisplayScheduleFromMainSchedule(mainDoc, {
              ishraqTime: cached?.schedule?.ishraqTime,
              jumaTime: cached?.schedule?.jumaTime,
              jumaIqamahTime: cached?.schedule?.jumaIqamahTime,
              validUntil: cached?.schedule?.validUntil,
              mosqueName: cached?.schedule?.mosqueName,
            });
            callbacks.onScheduleUpdate(merged);
          }
        })
      : () => {};

  const unsubAnnouncements = listenToFirestoreCollection<DisplayAnnouncementItem>(
    'displayAnnouncements',
    (items) => {
      if (Array.isArray(items)) {
        const active = items
          .filter((a) => a && a.isActive !== false)
          .sort((a, b) => {
            const pWeight = { urgent: 3, important: 2, normal: 1 };
            return (pWeight[b.priority] || 1) - (pWeight[a.priority] || 1);
          });
        callbacks.onAnnouncementsUpdate(active);
      }
    }
  );

  return () => {
    unsubDisplaySchedule();
    unsubMainSchedule();
    unsubAnnouncements();
  };
}

// ============================================================================
// ADMIN CONTROL PANEL API (STRICTLY ADMIN-AUTHENTICATED)
// ============================================================================

export async function fetchAdminDisplayOverview(): Promise<{
  success: boolean;
  data?: AdminDisplayOverview;
  error?: string;
}> {
  try {
    const resp = await fetch(`${getDisplayApiBaseUrl()}/api/admin/display/overview`, {
      method: 'GET',
      credentials: 'include',
      headers: getAdminHeaders(),
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok || !json.success) {
      return { success: false, error: json.error || `HTTP ${resp.status}: Maʼlumotlarni yuklab boʻlmadi.` };
    }
    return { success: true, data: json.data as AdminDisplayOverview };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Serverga ulanishda xatolik.' };
  }
}

export async function createAdminDisplayMonitor(payload: {
  name: string;
  mosqueName: string;
  locationLabel: string;
  scheduleId: string;
  language: SupportedLocale;
  template: 'classic_mosque' | 'premium_emerald' | 'minimal_modern';
  settings?: Partial<typeof DEFAULT_SMART_DISPLAY_SETTINGS>;
}): Promise<{ success: boolean; monitor?: SmartDisplayMonitor; error?: string }> {
  try {
    const resp = await fetch(`${getDisplayApiBaseUrl()}/api/admin/display/monitors`, {
      method: 'POST',
      credentials: 'include',
      headers: getAdminHeaders(),
      body: JSON.stringify(payload),
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok || !json.success) {
      return { success: false, error: json.error || 'Monitor yaratib boʻlmadi.' };
    }
    syncDisplaySystemToSupabase({ monitors: [json.monitor] }).catch(() => {});
    return { success: true, monitor: json.monitor };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Tarmoq xatoligi.' };
  }
}

export async function updateAdminDisplayMonitor(
  monitorId: string,
  payload: Partial<SmartDisplayMonitor> & { regeneratePairingCode?: boolean }
): Promise<{ success: boolean; monitor?: SmartDisplayMonitor; error?: string }> {
  try {
    const resp = await fetch(
      `${getDisplayApiBaseUrl()}/api/admin/display/monitors/${encodeURIComponent(monitorId)}`,
      {
        method: 'PUT',
        credentials: 'include',
        headers: getAdminHeaders(),
        body: JSON.stringify(payload),
      }
    );
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok || !json.success) {
      return { success: false, error: json.error || 'Monitor sozlamalari saqlanmadi.' };
    }
    syncDisplaySystemToSupabase({ monitors: [json.monitor] }).catch(() => {});
    return { success: true, monitor: json.monitor };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Tarmoq xatoligi.' };
  }
}

export async function deleteAdminDisplayMonitor(
  monitorId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resp = await fetch(
      `${getDisplayApiBaseUrl()}/api/admin/display/monitors/${encodeURIComponent(monitorId)}`,
      {
        method: 'DELETE',
        credentials: 'include',
        headers: getAdminHeaders(),
      }
    );
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok || !json.success) {
      return { success: false, error: json.error || 'Monitorni oʻchirib boʻlmadi.' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Tarmoq xatoligi.' };
  }
}

export async function saveAdminDisplaySchedule(
  schedule: SmartMosqueScheduleProfile
): Promise<{ success: boolean; schedule?: SmartMosqueScheduleProfile; validation?: ScheduleValidationResult; error?: string }> {
  try {
    const resp = await fetch(`${getDisplayApiBaseUrl()}/api/admin/display/schedules`, {
      method: 'POST',
      credentials: 'include',
      headers: getAdminHeaders(),
      body: JSON.stringify(schedule),
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok || !json.success) {
      return { success: false, error: json.error || 'Namoz jadvali saqlanmadi.' };
    }
    syncDisplaySystemToSupabase({ displaySchedules: [json.schedule] }).catch(() => {});
    return { success: true, schedule: json.schedule, validation: json.validation };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Tarmoq xatoligi.' };
  }
}

export async function deleteAdminDisplaySchedule(
  scheduleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resp = await fetch(
      `${getDisplayApiBaseUrl()}/api/admin/display/schedules/${encodeURIComponent(scheduleId)}`,
      {
        method: 'DELETE',
        credentials: 'include',
        headers: getAdminHeaders(),
      }
    );
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok || !json.success) {
      return { success: false, error: json.error || 'Jadvalni oʻchirib boʻlmadi.' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Tarmoq xatoligi.' };
  }
}

export async function saveAdminDisplayAnnouncement(
  announcement: Partial<DisplayAnnouncementItem> & { title: string; body: string }
): Promise<{ success: boolean; announcement?: DisplayAnnouncementItem; error?: string }> {
  try {
    const resp = await fetch(`${getDisplayApiBaseUrl()}/api/admin/display/announcements`, {
      method: 'POST',
      credentials: 'include',
      headers: getAdminHeaders(),
      body: JSON.stringify(announcement),
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok || !json.success) {
      return { success: false, error: json.error || 'Eʼlon saqlanmadi.' };
    }
    syncDisplaySystemToSupabase({ displayAnnouncements: [json.announcement] }).catch(() => {});
    return { success: true, announcement: json.announcement };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Tarmoq xatoligi.' };
  }
}

export async function deleteAdminDisplayAnnouncement(
  announcementId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resp = await fetch(
      `${getDisplayApiBaseUrl()}/api/admin/display/announcements/${encodeURIComponent(announcementId)}`,
      {
        method: 'DELETE',
        credentials: 'include',
        headers: getAdminHeaders(),
      }
    );
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok || !json.success) {
      return { success: false, error: json.error || 'Eʼlonni oʻchirib boʻlmadi.' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Tarmoq xatoligi.' };
  }
}
