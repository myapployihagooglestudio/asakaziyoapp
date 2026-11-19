import express, { Request, Response, NextFunction, Router } from 'express';
import crypto from 'crypto';
import {
  DEFAULT_SMART_DISPLAY_SETTINGS,
  DisplayAnnouncementItem,
  DisplayConnectionRecord,
  SmartDisplayMonitor,
  SmartMosqueScheduleProfile,
  buildDisplayScheduleFromMainSchedule,
  isMonitorOnline,
  resolveVersionedConflict,
  validateDisplaySchedule,
} from '../src/utils/smartMosqueDisplayEngine';

export interface SmartDisplayRouterDeps {
  requireAdminAuth: (req: Request, res: Response, next: NextFunction) => void;
  sensitiveActionLimiter: (req: Request, res: Response, next: NextFunction) => void;
  sessionSecret: string;
  readDatabase: () => any;
  writeDatabase: (data: any) => boolean;
  serverWriteFirestoreDoc: (
    collectionName: string,
    docId: string,
    data: Record<string, any>
  ) => Promise<{ success: boolean; error?: string; code?: string; path: string }>;
  serverDeleteFirestoreDoc: (
    collectionName: string,
    docId: string
  ) => Promise<{ success: boolean; error?: string; code?: string; path: string }>;
  serverReadFirestoreCollection: (collectionName: string) => Promise<any[]>;
}

const VALID_LANGUAGES = new Set(['uz-Latn', 'uz-Cyrl', 'uz-Latn-new', 'ru', 'en']);
const VALID_TEMPLATES = new Set(['classic_mosque', 'premium_emerald', 'minimal_modern']);
const VALID_STATUSES = new Set(['active', 'disabled', 'blocked']);
const VALID_PRIORITIES = new Set(['normal', 'important', 'urgent']);

function safeCompareHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'utf-8'), Buffer.from(b, 'utf-8'));
  } catch {
    return a === b;
  }
}

function generateSixDigitCode(existingCodes: Set<string>): string {
  for (let i = 0; i < 30; i++) {
    const code = String(crypto.randomInt(100000, 1000000));
    if (!existingCodes.has(code)) return code;
  }
  return String(crypto.randomInt(100000, 1000000));
}

function issueDisplayMonitorToken(monitorId: string, secret: string): string {
  const nonce = crypto.randomBytes(18).toString('hex');
  const sig = crypto
    .createHmac('sha256', secret)
    .update(`display_monitor:${monitorId}:${nonce}`)
    .digest('hex');
  return `asaka_disp_${monitorId}.${nonce}.${sig}`;
}

function verifyDisplayMonitorToken(token: string, secret: string): { monitorId: string } | null {
  if (!token || !token.startsWith('asaka_disp_')) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [prefixAndId, nonce, sig] = parts;
  const monitorId = prefixAndId.slice('asaka_disp_'.length);
  if (!monitorId || !nonce || !sig) return null;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`display_monitor:${monitorId}:${nonce}`)
    .digest('hex');
  if (!safeCompareHex(sig, expectedSig)) return null;
  return { monitorId };
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function sanitizeMonitorForDevice(monitor: any): SmartDisplayMonitor {
  return {
    id: monitor.id,
    name: monitor.name,
    mosqueName: monitor.mosqueName || '«MuhammadSolih Hoji» Jomeʼ Masjidi',
    locationLabel: monitor.locationLabel || 'Asaka shahri',
    scheduleId: monitor.scheduleId || 'asaka-main',
    pairingCode: '', // Never leak pairing code back on device sync
    status: monitor.status || 'active',
    language: VALID_LANGUAGES.has(monitor.language) ? monitor.language : 'uz-Latn',
    template: VALID_TEMPLATES.has(monitor.template) ? monitor.template : 'classic_mosque',
    settings: { ...DEFAULT_SMART_DISPLAY_SETTINGS, ...(monitor.settings || {}) },
    lastHeartbeatAt: monitor.lastHeartbeatAt,
    lastSyncAt: monitor.lastSyncAt,
    pairedAt: monitor.pairedAt,
    deviceInfo: monitor.deviceInfo,
    onlineStatus: isMonitorOnline(monitor.lastHeartbeatAt) ? 'online' : 'offline',
    version: typeof monitor.version === 'number' ? monitor.version : 1,
    createdAt: monitor.createdAt || new Date().toISOString(),
    updatedAt: monitor.updatedAt || new Date().toISOString(),
  };
}

function ensureDisplayArrays(db: any): void {
  if (!Array.isArray(db.displayMonitors)) db.displayMonitors = [];
  if (!Array.isArray(db.displayConnections)) db.displayConnections = [];
  if (!Array.isArray(db.displaySchedules)) db.displaySchedules = [];
  if (!Array.isArray(db.displayAnnouncements)) db.displayAnnouncements = [];
}

function mergeCollectionByVersion<T extends { id: string; version?: number; updatedAt?: string }>(
  localItems: T[],
  remoteItems: T[]
): T[] {
  const map = new Map<string, T>();
  for (const item of localItems || []) {
    if (item && item.id) map.set(item.id, item);
  }
  for (const remote of remoteItems || []) {
    if (!remote || !remote.id) continue;
    const existing = map.get(remote.id);
    if (!existing) {
      map.set(remote.id, remote);
    } else {
      const resolved = resolveVersionedConflict(existing, remote);
      if (resolved.winner) map.set(remote.id, resolved.winner);
    }
  }
  return Array.from(map.values());
}

function getEffectiveMainDisplaySchedule(db: any, schedules: SmartMosqueScheduleProfile[]): SmartMosqueScheduleProfile {
  const existingMain = schedules.find((s) => s.id === 'asaka-main');
  const mainPrayer = db.prayerSchedule;
  if (!existingMain) {
    return buildDisplayScheduleFromMainSchedule(mainPrayer);
  }
  // Keep admin-configured Ishroq, Juma, validity window, and mosque name;
  // if main ASAKA ZIYO prayerSchedule was updated more recently in AdminPortal, sync its exact prayer times!
  const mainUpdatedTs = mainPrayer?.verifiedAt ? Date.parse(mainPrayer.verifiedAt) || 0 : 0;
  const displayUpdatedTs = existingMain.updatedAt ? Date.parse(existingMain.updatedAt) || 0 : 0;
  if (mainUpdatedTs > displayUpdatedTs && Array.isArray(mainPrayer?.times) && mainPrayer.times.length > 0) {
    return {
      ...existingMain,
      times: mainPrayer.times,
      hijriDate: mainPrayer.hijriDate || existingMain.hijriDate,
      location: mainPrayer.location || existingMain.location,
      isAdministratorPublished: Boolean(mainPrayer.isAdministratorPublished),
      updatedAt: mainPrayer.verifiedAt || existingMain.updatedAt,
    };
  }
  return existingMain;
}

export function createSmartMosqueDisplayRouter(deps: SmartDisplayRouterDeps): Router {
  const router = express.Router();

  async function loadMergedDisplayState(syncFromFirestore = false) {
    const db = deps.readDatabase();
    ensureDisplayArrays(db);

    let monitors: any[] = db.displayMonitors;
    let schedules: SmartMosqueScheduleProfile[] = db.displaySchedules;
    let announcements: DisplayAnnouncementItem[] = db.displayAnnouncements;
    let connections: DisplayConnectionRecord[] = db.displayConnections;
    let firestoreConnected = false;

    if (syncFromFirestore) {
      try {
        const [fsMonitors, fsSchedules, fsAnnouncements, fsConnections] = await Promise.all([
          deps.serverReadFirestoreCollection('displayMonitors'),
          deps.serverReadFirestoreCollection('displaySchedules'),
          deps.serverReadFirestoreCollection('displayAnnouncements'),
          deps.serverReadFirestoreCollection('displayConnections'),
        ]);
        firestoreConnected = true;
        monitors = mergeCollectionByVersion(monitors, fsMonitors);
        schedules = mergeCollectionByVersion(schedules, fsSchedules);
        announcements = mergeCollectionByVersion(announcements, fsAnnouncements);
        connections = mergeCollectionByVersion(connections as any, fsConnections as any) as any;

        db.displayMonitors = monitors;
        db.displaySchedules = schedules;
        db.displayAnnouncements = announcements;
        db.displayConnections = connections;
        deps.writeDatabase(db);
      } catch {
        firestoreConnected = false;
      }
    }

    const mainScheduleProfile = getEffectiveMainDisplaySchedule(db, schedules);
    if (!schedules.some((s) => s.id === 'asaka-main')) {
      schedules = [mainScheduleProfile, ...schedules];
      db.displaySchedules = schedules;
      deps.writeDatabase(db);
    } else {
      schedules = schedules.map((s) => (s.id === 'asaka-main' ? mainScheduleProfile : s));
    }

    return { db, monitors, schedules, announcements, connections, firestoreConnected };
  }

  // =========================================================================
  // 1. ADMIN OVERVIEW & FLEET MANAGEMENT (STRICTLY requireAdminAuth)
  // =========================================================================

  router.get('/api/admin/display/overview', deps.requireAdminAuth, async (_req: Request, res: Response) => {
    try {
      const { db, monitors, schedules, announcements, connections, firestoreConnected } =
        await loadMergedDisplayState(true);

      const nowMs = Date.now();
      const enrichedMonitors = monitors.map((m) => ({
        ...m,
        tokenHash: undefined,
        onlineStatus: isMonitorOnline(m.lastHeartbeatAt, nowMs) ? 'online' : 'offline',
      }));

      const scheduleValidations: Record<string, any> = {};
      for (const s of schedules) {
        scheduleValidations[s.id] = validateDisplaySchedule(s);
      }

      return res.json({
        success: true,
        data: {
          monitors: enrichedMonitors,
          schedules,
          announcements,
          connections: connections.slice(0, 50),
          scheduleValidations,
          mainSchedule: db.prayerSchedule,
          firestoreConnected,
          serverTimeIso: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Smart Mosque Display maʼlumotlarini yuklashda xatolik.',
      });
    }
  });

  // Create new monitor
  router.post('/api/admin/display/monitors', deps.requireAdminAuth, async (req: Request, res: Response) => {
    const body = req.body || {};
    const name = String(body.name || '').trim().slice(0, 160);
    if (!name) {
      return res.status(400).json({ success: false, error: 'Monitor nomi kiritilishi shart.' });
    }

    const { db, monitors } = await loadMergedDisplayState(false);
    const existingCodes = new Set<string>(monitors.map((m: any) => String(m.pairingCode || '')));
    const nowIso = new Date().toISOString();
    const monitorId = `mon-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
    const pairingCode = generateSixDigitCode(existingCodes);

    const newMonitor: SmartDisplayMonitor & { tokenHash?: string } = {
      id: monitorId,
      name,
      mosqueName: String(body.mosqueName || '«MuhammadSolih Hoji» Jomeʼ Masjidi').trim().slice(0, 200),
      locationLabel: String(body.locationLabel || 'Asaka shahri, Asosiy zal').trim().slice(0, 200),
      scheduleId: String(body.scheduleId || 'asaka-main').trim().slice(0, 128),
      pairingCode,
      pairingCodeExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: VALID_STATUSES.has(body.status) ? body.status : 'active',
      language: VALID_LANGUAGES.has(body.language) ? body.language : 'uz-Latn',
      template: VALID_TEMPLATES.has(body.template) ? body.template : 'classic_mosque',
      settings: {
        ...DEFAULT_SMART_DISPLAY_SETTINGS,
        ...(body.settings && typeof body.settings === 'object' ? body.settings : {}),
      },
      onlineStatus: 'offline',
      version: 1,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    db.displayMonitors = [newMonitor, ...db.displayMonitors.filter((m: any) => m.id !== monitorId)];
    deps.writeDatabase(db);

    await deps.serverWriteFirestoreDoc('displayMonitors', monitorId, newMonitor as any);

    return res.status(201).json({
      success: true,
      monitor: { ...newMonitor, tokenHash: undefined },
    });
  });

  // Update monitor settings / status / pairing code
  router.put(
    '/api/admin/display/monitors/:monitorId',
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const monitorId = String(req.params.monitorId || '').trim();
      const body = req.body || {};
      const { db } = await loadMergedDisplayState(false);

      const idx = db.displayMonitors.findIndex((m: any) => m.id === monitorId);
      if (idx < 0) {
        return res.status(404).json({ success: false, error: 'Monitor topilmadi.' });
      }

      const current = db.displayMonitors[idx];
      const existingCodes = new Set<string>(
        db.displayMonitors.filter((m: any) => m.id !== monitorId).map((m: any) => String(m.pairingCode || ''))
      );

      const nextPairingCode = body.regeneratePairingCode
        ? generateSixDigitCode(existingCodes)
        : current.pairingCode;

      const updated = {
        ...current,
        name: body.name !== undefined ? String(body.name).trim().slice(0, 160) || current.name : current.name,
        mosqueName:
          body.mosqueName !== undefined
            ? String(body.mosqueName).trim().slice(0, 200)
            : current.mosqueName,
        locationLabel:
          body.locationLabel !== undefined
            ? String(body.locationLabel).trim().slice(0, 200)
            : current.locationLabel,
        scheduleId:
          body.scheduleId !== undefined
            ? String(body.scheduleId).trim().slice(0, 128) || 'asaka-main'
            : current.scheduleId,
        status: VALID_STATUSES.has(body.status) ? body.status : current.status,
        language: VALID_LANGUAGES.has(body.language) ? body.language : current.language,
        template: VALID_TEMPLATES.has(body.template) ? body.template : current.template,
        settings:
          body.settings && typeof body.settings === 'object'
            ? { ...DEFAULT_SMART_DISPLAY_SETTINGS, ...(current.settings || {}), ...body.settings }
            : current.settings || DEFAULT_SMART_DISPLAY_SETTINGS,
        pairingCode: nextPairingCode,
        pairingCodeExpiresAt: body.regeneratePairingCode
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          : current.pairingCodeExpiresAt,
        tokenHash: body.status === 'blocked' || body.revokeToken ? '' : current.tokenHash || '',
        version: (typeof current.version === 'number' ? current.version : 1) + 1,
        updatedAt: new Date().toISOString(),
      };

      db.displayMonitors[idx] = updated;
      deps.writeDatabase(db);
      await deps.serverWriteFirestoreDoc('displayMonitors', monitorId, updated);

      return res.json({
        success: true,
        monitor: {
          ...updated,
          tokenHash: undefined,
          onlineStatus: isMonitorOnline(updated.lastHeartbeatAt) ? 'online' : 'offline',
        },
      });
    }
  );

  // Delete monitor
  router.delete(
    '/api/admin/display/monitors/:monitorId',
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const monitorId = String(req.params.monitorId || '').trim();
      const { db } = await loadMergedDisplayState(false);

      const existed = db.displayMonitors.some((m: any) => m.id === monitorId);
      if (!existed) {
        return res.status(404).json({ success: false, error: 'Monitor topilmadi.' });
      }

      db.displayMonitors = db.displayMonitors.filter((m: any) => m.id !== monitorId);
      deps.writeDatabase(db);
      await deps.serverDeleteFirestoreDoc('displayMonitors', monitorId);

      return res.json({ success: true, deletedId: monitorId });
    }
  );

  // Create or update Display Schedule (with conflict version increment + accuracy validation)
  router.post('/api/admin/display/schedules', deps.requireAdminAuth, async (req: Request, res: Response) => {
    const body = req.body || {};
    if (!Array.isArray(body.times) || body.times.length < 5) {
      return res.status(400).json({
        success: false,
        error: 'Namoz jadvali kamida 5 ta asosiy namoz vaqtini oʻz ichiga olishi shart.',
      });
    }

    const { db } = await loadMergedDisplayState(false);
    const scheduleId = String(body.id || `sched-${Date.now().toString(36)}`).trim().replace(/[^a-zA-Z0-9_\-.:]/g, '');
    const existing = db.displaySchedules.find((s: any) => s.id === scheduleId);

    // Optimistic version conflict protection
    if (
      existing &&
      typeof body.version === 'number' &&
      typeof existing.version === 'number' &&
      body.version < existing.version &&
      !body.forceOverwrite
    ) {
      return res.status(409).json({
        success: false,
        code: 'SCHEDULE_VERSION_CONFLICT',
        error: 'Jadval boshqa qurilmada yangilangan. Avval sahifani yangilab qayta saqlang.',
        serverVersion: existing.version,
      });
    }

    const nowIso = new Date().toISOString();
    const savedSchedule: SmartMosqueScheduleProfile = {
      id: scheduleId,
      mosqueName: String(body.mosqueName || '«MuhammadSolih Hoji» Jomeʼ Masjidi').trim().slice(0, 200),
      location: String(body.location || 'Asaka shahri, Andijon viloyati').trim().slice(0, 200),
      timezone: 'Asia/Tashkent',
      effectiveDate: String(body.effectiveDate || nowIso.slice(0, 10)).trim().slice(0, 32),
      validUntil: String(body.validUntil || nowIso.slice(0, 10)).trim().slice(0, 32),
      hijriDate: String(body.hijriDate || '').trim().slice(0, 120),
      qiblaAngleDeg: Number(body.qiblaAngleDeg) || 241,
      ishraqTime: String(body.ishraqTime || '07:06').trim().slice(0, 16),
      jumaTime: String(body.jumaTime || '13:00').trim().slice(0, 16),
      jumaIqamahTime: String(body.jumaIqamahTime || '13:15').trim().slice(0, 16),
      isAdministratorPublished: Boolean(body.isAdministratorPublished),
      sourceScheduleId: body.sourceScheduleId || scheduleId,
      times: body.times,
      version: (existing?.version || 0) + 1,
      updatedAt: nowIso,
      updatedBy: req.adminUser?.email || 'asakaziyo0@gmail.com',
    };

    const validation = validateDisplaySchedule(savedSchedule);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: validation.warnings[0] || 'Namoz vaqtlari tartibi yoki formati notoʻgʻri.',
        validation,
      });
    }

    const idx = db.displaySchedules.findIndex((s: any) => s.id === scheduleId);
    if (idx >= 0) {
      db.displaySchedules[idx] = savedSchedule;
    } else {
      db.displaySchedules.push(savedSchedule);
    }

    // If admin explicitly requested syncing back to main app schedule as well
    if (scheduleId === 'asaka-main' && body.syncToMainSchedule) {
      db.prayerSchedule = {
        ...db.prayerSchedule,
        date: savedSchedule.effectiveDate,
        hijriDate: savedSchedule.hijriDate || db.prayerSchedule.hijriDate,
        location: savedSchedule.location,
        times: savedSchedule.times,
        isAdministratorPublished: savedSchedule.isAdministratorPublished,
        verifiedAt: nowIso,
      };
      await deps.serverWriteFirestoreDoc('schedules', 'asaka-main', db.prayerSchedule);
    }

    deps.writeDatabase(db);
    await deps.serverWriteFirestoreDoc('displaySchedules', scheduleId, savedSchedule as any);

    return res.json({
      success: true,
      schedule: savedSchedule,
      validation,
    });
  });

  router.delete(
    '/api/admin/display/schedules/:scheduleId',
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const scheduleId = String(req.params.scheduleId || '').trim();
      if (scheduleId === 'asaka-main') {
        return res.status(400).json({
          success: false,
          error: 'Asosiy «asaka-main» namoz jadvalini oʻchirib boʻlmaydi.',
        });
      }
      const { db } = await loadMergedDisplayState(false);
      db.displaySchedules = db.displaySchedules.filter((s: any) => s.id !== scheduleId);
      deps.writeDatabase(db);
      await deps.serverDeleteFirestoreDoc('displaySchedules', scheduleId);
      return res.json({ success: true, deletedId: scheduleId });
    }
  );

  // Create or update Display Announcement
  router.post(
    '/api/admin/display/announcements',
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const body = req.body || {};
      const title = String(body.title || '').trim().slice(0, 240);
      const textBody = String(body.body || '').trim().slice(0, 1500);
      if (!title || !textBody) {
        return res.status(400).json({ success: false, error: 'Eʼlon sarlavhasi va matni shart.' });
      }

      const { db } = await loadMergedDisplayState(false);
      const annId = String(body.id || `dann-${Date.now().toString(36)}-${crypto.randomBytes(2).toString('hex')}`)
        .trim()
        .replace(/[^a-zA-Z0-9_\-.:]/g, '');
      const existing = db.displayAnnouncements.find((a: any) => a.id === annId);
      const nowIso = new Date().toISOString();

      const item: DisplayAnnouncementItem = {
        id: annId,
        title,
        body: textBody,
        translations: body.translations && typeof body.translations === 'object' ? body.translations : undefined,
        priority: VALID_PRIORITIES.has(body.priority) ? body.priority : 'normal',
        mediaUrl: body.mediaUrl ? String(body.mediaUrl).trim().slice(0, 1000) : undefined,
        isActive: body.isActive !== false,
        startsAt: body.startsAt ? String(body.startsAt).trim().slice(0, 32) : undefined,
        expiresAt: body.expiresAt ? String(body.expiresAt).trim().slice(0, 32) : undefined,
        displayDurationSec: Math.min(60, Math.max(5, Number(body.displayDurationSec) || 10)),
        monitorIds: Array.isArray(body.monitorIds) ? body.monitorIds.map(String) : undefined,
        version: (existing?.version || 0) + 1,
        createdAt: existing?.createdAt || nowIso,
        updatedAt: nowIso,
      };

      const idx = db.displayAnnouncements.findIndex((a: any) => a.id === annId);
      if (idx >= 0) {
        db.displayAnnouncements[idx] = item;
      } else {
        db.displayAnnouncements.unshift(item);
      }

      deps.writeDatabase(db);
      await deps.serverWriteFirestoreDoc('displayAnnouncements', annId, item as any);

      return res.json({ success: true, announcement: item });
    }
  );

  router.delete(
    '/api/admin/display/announcements/:announcementId',
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const announcementId = String(req.params.announcementId || '').trim();
      const { db } = await loadMergedDisplayState(false);
      db.displayAnnouncements = db.displayAnnouncements.filter((a: any) => a.id !== announcementId);
      deps.writeDatabase(db);
      await deps.serverDeleteFirestoreDoc('displayAnnouncements', announcementId);
      return res.json({ success: true, deletedId: announcementId });
    }
  );

  // =========================================================================
  // 2. MONITOR DEVICE RUNTIME API (ZERO ADMIN DATA ACCESS)
  // =========================================================================

  // Pair a TV / Monitor using 6-digit code
  router.post('/api/display/pair', deps.sensitiveActionLimiter, async (req: Request, res: Response) => {
    const body = req.body || {};
    const code = String(body.pairingCode || '').replace(/\D/g, '');
    if (code.length !== 6) {
      return res.status(400).json({
        success: false,
        error: '6 xonali ulash kodi toʻgʻri kiritilishi shart.',
      });
    }

    const { db, schedules, announcements } = await loadMergedDisplayState(false);
    const monitorIdx = db.displayMonitors.findIndex((m: any) => String(m.pairingCode) === code);
    if (monitorIdx < 0) {
      return res.status(404).json({
        success: false,
        error: 'Ushbu 6 xonali ulash kodi topilmadi yoki muddati tugagan.',
      });
    }

    const monitor = db.displayMonitors[monitorIdx];
    if (monitor.status === 'blocked') {
      return res.status(403).json({
        success: false,
        error: 'Ushbu monitor maʼmuriyat tomonidan bloklangan.',
      });
    }

    const nowIso = new Date().toISOString();
    const monitorToken = issueDisplayMonitorToken(monitor.id, deps.sessionSecret);
    const tokenHash = hashToken(monitorToken);

    const deviceInfo = {
      resolution: String(body.deviceInfo?.resolution || '1920x1080').slice(0, 64),
      userAgent: String(body.deviceInfo?.userAgent || req.headers['user-agent'] || '').slice(0, 160),
      fullscreen: Boolean(body.deviceInfo?.fullscreen),
      wakeLockActive: Boolean(body.deviceInfo?.wakeLockActive),
    };

    const updatedMonitor = {
      ...monitor,
      tokenHash,
      pairedAt: nowIso,
      lastHeartbeatAt: nowIso,
      lastSyncAt: nowIso,
      deviceInfo,
      version: (monitor.version || 1) + 1,
      updatedAt: nowIso,
    };
    db.displayMonitors[monitorIdx] = updatedMonitor;

    const connId = `conn-${monitor.id}`;
    const connRecord: DisplayConnectionRecord = {
      id: connId,
      monitorId: monitor.id,
      monitorName: monitor.name,
      pairedAt: nowIso,
      lastHeartbeatAt: nowIso,
      resolution: deviceInfo.resolution,
      fullscreen: deviceInfo.fullscreen,
      wakeLockActive: deviceInfo.wakeLockActive,
      status: 'connected',
    };

    db.displayConnections = [
      connRecord,
      ...db.displayConnections.filter((c: any) => c.id !== connId),
    ].slice(0, 100);
    deps.writeDatabase(db);

    await Promise.allSettled([
      deps.serverWriteFirestoreDoc('displayMonitors', monitor.id, updatedMonitor),
      deps.serverWriteFirestoreDoc('displayConnections', connId, connRecord as any),
    ]);

    const assignedSchedule =
      schedules.find((s) => s.id === updatedMonitor.scheduleId) ||
      getEffectiveMainDisplaySchedule(db, schedules);

    const activeAnnouncements = announcements.filter(
      (a) =>
        a.isActive !== false &&
        (!Array.isArray(a.monitorIds) ||
          a.monitorIds.length === 0 ||
          a.monitorIds.includes(updatedMonitor.id))
    );

    return res.json({
      success: true,
      monitorToken,
      pairedAt: nowIso,
      monitor: sanitizeMonitorForDevice(updatedMonitor),
      schedule: assignedSchedule,
      announcements: activeAnnouncements,
      serverTimeIso: nowIso,
    });
  });

  // Sync latest schedule, settings, and announcements for a paired monitor or public preview
  router.get('/api/display/sync', async (req: Request, res: Response) => {
    const authHeader = String(req.headers.authorization || '');
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const isPreview = req.query.preview === '1' || !bearerToken;

    const { db, schedules, announcements } = await loadMergedDisplayState(false);
    const nowIso = new Date().toISOString();

    if (bearerToken) {
      const verified = verifyDisplayMonitorToken(bearerToken, deps.sessionSecret);
      if (!verified) {
        return res.status(401).json({
          success: false,
          code: 'MONITOR_REVOKED',
          error: 'Monitor tokeni yaroqsiz.',
        });
      }

      const monitorIdx = db.displayMonitors.findIndex((m: any) => m.id === verified.monitorId);
      if (monitorIdx < 0) {
        return res.status(404).json({
          success: false,
          code: 'MONITOR_NOT_FOUND',
          error: 'Monitor roʻyxatdan oʻchirilgan.',
        });
      }

      const monitor = db.displayMonitors[monitorIdx];
      const expectedHash = hashToken(bearerToken);
      if (monitor.tokenHash && !safeCompareHex(monitor.tokenHash, expectedHash)) {
        return res.status(403).json({
          success: false,
          code: 'MONITOR_REVOKED',
          error: 'Monitor ulanishi qayta tiklanishi kerak.',
        });
      }

      monitor.lastSyncAt = nowIso;
      deps.writeDatabase(db);

      const assignedSchedule =
        schedules.find((s) => s.id === monitor.scheduleId) ||
        getEffectiveMainDisplaySchedule(db, schedules);

      const activeAnnouncements = announcements.filter(
        (a) =>
          a.isActive !== false &&
          (!Array.isArray(a.monitorIds) ||
            a.monitorIds.length === 0 ||
            a.monitorIds.includes(monitor.id))
      );

      return res.json({
        success: true,
        mode: 'paired',
        monitorStatus: monitor.status || 'active',
        monitor: sanitizeMonitorForDevice(monitor),
        schedule: assignedSchedule,
        announcements: activeAnnouncements,
        serverTimeIso: nowIso,
      });
    }

    if (isPreview) {
      const mainSchedule = getEffectiveMainDisplaySchedule(db, schedules);
      const activeAnnouncements = announcements.filter(
        (a) => a.isActive !== false && (!Array.isArray(a.monitorIds) || a.monitorIds.length === 0)
      );
      return res.json({
        success: true,
        mode: 'preview',
        monitorStatus: 'active',
        monitor: null,
        schedule: mainSchedule,
        announcements: activeAnnouncements,
        serverTimeIso: nowIso,
      });
    }

    return res.status(401).json({ success: false, error: 'Monitor autentifikatsiyasi talab qilinadi.' });
  });

  // Live Monitor Heartbeat Telemetry
  router.post('/api/display/heartbeat', async (req: Request, res: Response) => {
    const authHeader = String(req.headers.authorization || '');
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const verified = verifyDisplayMonitorToken(bearerToken, deps.sessionSecret);
    if (!verified) {
      return res.status(401).json({ success: false, error: 'Monitor tokeni notoʻgʻri.' });
    }

    const { db } = await loadMergedDisplayState(false);
    const idx = db.displayMonitors.findIndex((m: any) => m.id === verified.monitorId);
    if (idx < 0) {
      return res.status(404).json({ success: false, error: 'Monitor topilmadi.' });
    }

    const monitor = db.displayMonitors[idx];
    const expectedHash = hashToken(bearerToken);
    if (monitor.tokenHash && !safeCompareHex(monitor.tokenHash, expectedHash)) {
      return res.status(403).json({ success: false, status: 'blocked', error: 'Token bekor qilingan.' });
    }

    const nowIso = new Date().toISOString();
    const body = req.body || {};
    monitor.lastHeartbeatAt = nowIso;
    monitor.deviceInfo = {
      ...(monitor.deviceInfo || {}),
      resolution: body.resolution ? String(body.resolution).slice(0, 64) : monitor.deviceInfo?.resolution,
      fullscreen: typeof body.fullscreen === 'boolean' ? body.fullscreen : monitor.deviceInfo?.fullscreen,
      wakeLockActive:
        typeof body.wakeLockActive === 'boolean'
          ? body.wakeLockActive
          : monitor.deviceInfo?.wakeLockActive,
    };

    const connId = `conn-${monitor.id}`;
    const connIdx = db.displayConnections.findIndex((c: any) => c.id === connId);
    if (connIdx >= 0) {
      db.displayConnections[connIdx] = {
        ...db.displayConnections[connIdx],
        lastHeartbeatAt: nowIso,
        resolution: monitor.deviceInfo.resolution,
        fullscreen: monitor.deviceInfo.fullscreen,
        wakeLockActive: monitor.deviceInfo.wakeLockActive,
        status: monitor.status === 'blocked' ? 'revoked' : 'connected',
      };
    }

    deps.writeDatabase(db);

    // Non-blocking Firestore heartbeat sync
    deps
      .serverWriteFirestoreDoc('displayMonitors', monitor.id, monitor)
      .catch(() => {});

    return res.json({
      success: true,
      status: monitor.status || 'active',
      latestVersion: monitor.version || 1,
      serverTimeIso: nowIso,
    });
  });

  return router;
}
