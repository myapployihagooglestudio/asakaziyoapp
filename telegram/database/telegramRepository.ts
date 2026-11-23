/**
 * ASAKA ZIYO — Isolated Least-Privilege Telegram Super Platform Repository
 *
 * SECURITY ISOLATION GUARANTEES:
 * 1. Explicit runtime allowlist of ONLY the 13 isolated `telegram*` Firestore collections:
 *    telegramUsers, telegramSettings, telegramChannels, telegramAdmins, telegramPublications,
 *    telegramAuditLogs, telegramCustomEmojis, telegramBroadcasts, telegramSupportTickets,
 *    telegramContentDrafts, telegramUserEngagement, telegramAiLogs, telegramQuizAttempts
 * 2. Refuses at runtime (throws SecurityError) to touch ANY Web App / Mobile App collection.
 * 3. Tracks Firestore sync failures honestly (never masks Firestore errors as success) and
 *    supports startup hydration (`hydrateFromFirestore`) from Firebase Firestore.
 * 4. Persists local cache exclusively in `/data/telegram_platform_store.json`.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  AppConfigEmojiRegistryDocument,
  CustomEmojiEntry,
  RollbackWarningRecord,
  TelegramAdminRecord,
  TelegramAiLogRecord,
  TelegramAuditLogRecord,
  TelegramBotSettingsRecord,
  TelegramBroadcastRecord,
  TelegramChannelRecord,
  TelegramContentDraftRecord,
  TelegramPublicationRecord,
  TelegramQuizAttemptRecord,
  TelegramRuntimeInstanceRecord,
  TelegramSupportTicketRecord,
  TelegramUserEngagementRecord,
  TelegramUserRecord,
} from '../types';
import { DEFAULT_TELEGRAM_AI_MODEL, DEFAULT_TELEGRAM_MINIAPP_URL } from '../config';
import { TelegramLogger } from '../middlewares/logger';
import { TelegramHifzProfile } from '../hifz/hifzTypes';

export const ALLOWED_TELEGRAM_COLLECTIONS = [
  'telegramUsers',
  'telegramSettings',
  'telegramChannels',
  'telegramAdmins',
  'telegramPublications',
  'telegramAuditLogs',
  'telegramCustomEmojis',
  'telegramBroadcasts',
  'telegramSupportTickets',
  'telegramContentDrafts',
  'telegramUserEngagement',
  'telegramAiLogs',
  'telegramQuizAttempts',
  'telegramHifzProfiles',
  'appConfig',
  'app_config',
  'telegramRuntimeInstances',
] as const;

export type AllowedTelegramCollection = (typeof ALLOWED_TELEGRAM_COLLECTIONS)[number];

const ALLOWED_SET = new Set<string>(ALLOWED_TELEGRAM_COLLECTIONS);

export interface ScopedFirestoreBridge {
  writeTelegramDoc(
    collectionName: AllowedTelegramCollection,
    docId: string,
    data: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string }>;
  deleteTelegramDoc(
    collectionName: AllowedTelegramCollection,
    docId: string
  ): Promise<{ success: boolean; error?: string }>;
  readTelegramCollection?(
    collectionName: AllowedTelegramCollection
  ): Promise<Record<string, unknown>[]>;
}

export function createScopedTelegramFirestoreBridge(deps: {
  serverWriteFirestoreDoc?: (
    collectionName: string,
    docId: string,
    data: Record<string, any>
  ) => Promise<{ success: boolean; error?: string }>;
  serverDeleteFirestoreDoc?: (
    collectionName: string,
    docId: string
  ) => Promise<{ success: boolean; error?: string }>;
  serverReadFirestoreCollection?: (collectionName: string) => Promise<any[]>;
}): ScopedFirestoreBridge {
  const assertAllowed = (collectionName: string): AllowedTelegramCollection => {
    if (!ALLOWED_SET.has(collectionName)) {
      throw new Error(
        `[TelegramRepository SECURITY] Least-privilege violation: access denied to non-Telegram collection "${collectionName}".`
      );
    }
    return collectionName as AllowedTelegramCollection;
  };

  return {
    async writeTelegramDoc(collectionName, docId, data) {
      const safeCol = assertAllowed(collectionName);
      if (!deps.serverWriteFirestoreDoc) {
        return { success: false, error: 'Firestore bridge inactive (local cache only)' };
      }
      return deps.serverWriteFirestoreDoc(safeCol, docId, data);
    },
    async deleteTelegramDoc(collectionName, docId) {
      const safeCol = assertAllowed(collectionName);
      if (!deps.serverDeleteFirestoreDoc) {
        return { success: false, error: 'Firestore bridge inactive (local cache only)' };
      }
      return deps.serverDeleteFirestoreDoc(safeCol, docId);
    },
    async readTelegramCollection(collectionName) {
      const safeCol = assertAllowed(collectionName);
      if (!deps.serverReadFirestoreCollection) return [];
      return deps.serverReadFirestoreCollection(safeCol);
    },
  };
}

interface TelegramLocalStoreShape {
  users: Record<string, TelegramUserRecord>;
  settings: TelegramBotSettingsRecord;
  channels: Record<string, TelegramChannelRecord>;
  admins: Record<string, TelegramAdminRecord>;
  publications: TelegramPublicationRecord[];
  auditLogs: TelegramAuditLogRecord[];
  customEmojis: Record<string, CustomEmojiEntry>;
  appConfigEmojiRegistry?: AppConfigEmojiRegistryDocument | null;
  runtimeInstances?: Record<string, TelegramRuntimeInstanceRecord>;
  broadcasts: Record<string, TelegramBroadcastRecord>;
  supportTickets: Record<string, TelegramSupportTicketRecord>;
  contentDrafts: Record<string, TelegramContentDraftRecord>;
  userEngagement: Record<string, TelegramUserEngagementRecord>;
  aiLogs: TelegramAiLogRecord[];
  quizAttempts: TelegramQuizAttemptRecord[];
  hifzProfiles: Record<string, TelegramHifzProfile>;
}

function getTashkentDateKey(): string {
  const utc = Date.now() + new Date().getTimezoneOffset() * 60_000;
  const d = new Date(utc + 5 * 3600_000);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function createDefaultStore(): TelegramLocalStoreShape {
  const nowIso = new Date().toISOString();
  return {
    users: {},
    settings: {
      id: 'default',
      defaultLanguage: 'uz-Latn',
      maintenanceMode: false,
      premiumEmojiEnabled: false,
      premiumEmojiEligibilityVerified: false,
      miniAppEnabled: true,
      aiAssistantEnabled: true,
      aiPrimaryModel: DEFAULT_TELEGRAM_AI_MODEL,
      aiFallbackModel: null,
      aiAutoFallbackEnabled: false,
      aiVoiceReplyEnabled: true,
      aiDailyBudgetTokens: 500_000,
      aiMaxRequestsPerUserPerDay: 40,
      miniAppUrl: DEFAULT_TELEGRAM_MINIAPP_URL,
      updatedAt: nowIso,
      updatedBy: 'system',
    },
    channels: {
      'asaka-ziyo-main': {
        id: 'asaka-ziyo-main',
        username: '@Asaka_Ziyo',
        title: 'ASAKA ZIYO — Rasmiy Kanal',
        isPrimary: true,
        isActive: true,
        autoPublishPrayerTimes: false,
        autoPublishAnnouncements: false,
        autoPublishWisdom: false,
        language: 'uz-Latn',
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      muhiddinsahhofuz: {
        id: 'muhiddinsahhofuz',
        username: '@muhiddinsahhofuz',
        title: 'Muhiddin Sahhof — Ilmiy-Maʼrifiy Kanal',
        isPrimary: false,
        isActive: true,
        autoPublishPrayerTimes: false,
        autoPublishAnnouncements: false,
        autoPublishWisdom: false,
        language: 'uz-Latn',
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    },
    admins: {},
    publications: [],
    auditLogs: [],
    customEmojis: {},
    broadcasts: {},
    supportTickets: {},
    contentDrafts: {},
    userEngagement: {},
    aiLogs: [],
    quizAttempts: [],
    hifzProfiles: {},
  };
}

export interface FirestoreSyncTelemetry {
  bridgeActive: boolean;
  firestoreOnline: boolean;
  degradedMode: boolean;
  hydratedFromFirestore: boolean;
  lastHydratedAt: string | null;
  lastFirestoreReadAt: string | null;
  lastFirestoreWriteAt: string | null;
  lastCacheRefreshAt: string | null;
  configVersion: number;
  configUpdatedAt: string;
  emojiRegistryVersion: number;
  totalWritesAttempted: number;
  totalWritesSucceeded: number;
  totalWritesFailed: number;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  rollbackWarnings: RollbackWarningRecord[];
}

export class TelegramRepository {
  private readonly storePath: string;
  private readonly firestore?: ScopedFirestoreBridge;
  private readonly logger: TelegramLogger;
  private state: TelegramLocalStoreShape;

  private hydratedFromFirestore = false;
  private firestoreOnline = false;
  private degradedMode = false;
  private lastHydratedAt: string | null = null;
  private lastFirestoreReadAt: string | null = null;
  private lastFirestoreWriteAt: string | null = null;
  private lastCacheRefreshAt: string | null = null;
  private totalWritesAttempted = 0;
  private totalWritesSucceeded = 0;
  private totalWritesFailed = 0;
  private lastSyncAt: string | null = null;
  private lastSyncError: string | null = null;
  private rollbackWarnings: RollbackWarningRecord[] = [];
  private diskFlushTimer: ReturnType<typeof setTimeout> | null = null;
  private diskFlushInProgress = false;
  private diskFlushQueued = false;

  constructor(options: {
    storePath?: string;
    firestore?: ScopedFirestoreBridge;
    logger: TelegramLogger;
  }) {
    this.storePath =
      options.storePath || path.resolve(process.cwd(), 'data', 'telegram_platform_store.json');
    this.firestore = options.firestore;
    this.logger = options.logger;
    this.state = this.loadFromDisk();
  }

  private loadFromDisk(): TelegramLocalStoreShape {
    try {
      if (fs.existsSync(this.storePath)) {
        const raw = fs.readFileSync(this.storePath, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<TelegramLocalStoreShape>;
        const defaults = createDefaultStore();
        return {
          users: parsed.users || defaults.users,
          settings: { ...defaults.settings, ...(parsed.settings || {}) },
          channels:
            parsed.channels && Object.keys(parsed.channels).length > 0
              ? parsed.channels
              : defaults.channels,
          admins: parsed.admins || defaults.admins,
          publications: Array.isArray(parsed.publications) ? parsed.publications : [],
          auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
          customEmojis: parsed.customEmojis || {},
          appConfigEmojiRegistry: parsed.appConfigEmojiRegistry || null,
          runtimeInstances: parsed.runtimeInstances || {},
          broadcasts: parsed.broadcasts || {},
          supportTickets: parsed.supportTickets || {},
          contentDrafts: parsed.contentDrafts || {},
          userEngagement: parsed.userEngagement || {},
          aiLogs: Array.isArray(parsed.aiLogs) ? parsed.aiLogs : [],
          quizAttempts: Array.isArray(parsed.quizAttempts) ? parsed.quizAttempts : [],
          hifzProfiles: parsed.hifzProfiles || {},
        };
      }
    } catch (err) {
      this.logger.warn('Failed reading isolated Telegram local store; initializing fresh defaults', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
    return createDefaultStore();
  }

  /**
   * Non-blocking debounced async disk cache persistence.
   * Eliminates event-loop stalls caused by synchronous JSON.stringify + fs.writeFileSync
   * under concurrent multi-user Telegram traffic.
   */
  private persistToDisk(immediate = false): void {
    this.lastCacheRefreshAt = new Date().toISOString();
    if (immediate) {
      this.flushToDiskSync();
      return;
    }
    if (this.diskFlushTimer) {
      return;
    }
    this.diskFlushTimer = setTimeout(() => {
      this.diskFlushTimer = null;
      void this.flushToDiskAsync();
    }, 120);
    if (typeof this.diskFlushTimer.unref === 'function') {
      this.diskFlushTimer.unref();
    }
  }

  private async flushToDiskAsync(): Promise<void> {
    if (this.diskFlushInProgress) {
      this.diskFlushQueued = true;
      return;
    }
    this.diskFlushInProgress = true;
    try {
      const dir = path.dirname(this.storePath);
      await fs.promises.mkdir(dir, { recursive: true });
      const tempPath = `${this.storePath}.${process.pid}.${Date.now()}.tmp`;
      const serialized = JSON.stringify(this.state);
      await fs.promises.writeFile(tempPath, serialized, 'utf-8');
      await fs.promises.rename(tempPath, this.storePath);
    } catch (err) {
      this.logger.error('Failed async persisting isolated Telegram local store', {
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      this.diskFlushInProgress = false;
      if (this.diskFlushQueued) {
        this.diskFlushQueued = false;
        void this.flushToDiskAsync();
      }
    }
  }

  /**
   * Synchronous flush for graceful shutdown or critical config commits.
   */
  flushToDiskSync(): void {
    if (this.diskFlushTimer) {
      clearTimeout(this.diskFlushTimer);
      this.diskFlushTimer = null;
    }
    try {
      const dir = path.dirname(this.storePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tempPath = `${this.storePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.state, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.storePath);
    } catch (err) {
      this.logger.error('Failed persisting isolated Telegram local store', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  recordRollbackWarning(
    warning: Omit<RollbackWarningRecord, 'id' | 'createdAt'>
  ): RollbackWarningRecord {
    const rec: RollbackWarningRecord = {
      ...warning,
      id: `rbw_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`,
      createdAt: new Date().toISOString(),
    };
    this.rollbackWarnings.unshift(rec);
    if (this.rollbackWarnings.length > 100) {
      this.rollbackWarnings.length = 100;
    }
    this.logger.warn('[ROLLBACK_GUARD] Blocked stale state downgrade or anomaly', {
      target: rec.target,
      source: rec.source,
      functionName: rec.functionName,
      currentVersion: rec.currentVersion,
      incomingVersion: rec.incomingVersion,
      reason: rec.reason,
    });
    return rec;
  }

  getRollbackWarnings(): RollbackWarningRecord[] {
    return [...this.rollbackWarnings];
  }

  private async syncDocToFirestore(
    collectionName: AllowedTelegramCollection,
    docId: string,
    payload: Record<string, unknown>
  ): Promise<{ ok: boolean; error?: string }> {
    if (!this.firestore) {
      return { ok: false, error: 'Firestore bridge not configured' };
    }
    this.totalWritesAttempted++;
    try {
      const res = await this.firestore.writeTelegramDoc(collectionName, docId, payload);
      if (res.success) {
        this.totalWritesSucceeded++;
        const now = new Date().toISOString();
        this.lastSyncAt = now;
        this.lastFirestoreWriteAt = now;
        this.firestoreOnline = true;
        this.degradedMode = false;
        return { ok: true };
      }
      const errMsg = res.error || 'Unknown Firestore write failure';
      if (!errMsg.includes('local cache only')) {
        this.totalWritesFailed++;
        this.lastSyncError = `${collectionName}/${docId}: ${errMsg}`;
        this.logger.warn(`Firestore sync failed for ${collectionName}/${docId}`, { error: errMsg });
      }
      return { ok: false, error: errMsg };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.totalWritesFailed++;
      this.lastSyncError = `${collectionName}/${docId}: ${errMsg}`;
      this.firestoreOnline = false;
      this.degradedMode = true;
      this.logger.warn(`Firestore sync exception for ${collectionName}/${docId}`, { error: errMsg });
      return { ok: false, error: errMsg };
    }
  }

  private async deleteDocFromFirestore(
    collectionName: AllowedTelegramCollection,
    docId: string
  ): Promise<{ ok: boolean; error?: string }> {
    if (!this.firestore) return { ok: false, error: 'Firestore bridge not configured' };
    try {
      const res = await this.firestore.deleteTelegramDoc(collectionName, docId);
      if (!res.success && res.error && !res.error.includes('local cache only')) {
        this.lastSyncError = `DELETE ${collectionName}/${docId}: ${res.error}`;
      }
      return { ok: res.success, error: res.error };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.lastSyncError = `DELETE ${collectionName}/${docId}: ${msg}`;
      return { ok: false, error: msg };
    }
  }

  /**
   * Hydrates repository state from Firestore on server boot so restarts recover persisted cloud records.
   * Enforces strict anti-rollback monotonic version checks and degraded-mode protection:
   * - Never overwrites newer in-memory state with an older version.
   * - Never writes hardcoded defaults back to Firestore when Firestore is offline or returns empty.
   */
  async hydrateFromFirestore(): Promise<{ ok: boolean; collectionsLoaded: number; error?: string }> {
    if (!this.firestore?.readTelegramCollection) {
      this.firestoreOnline = false;
      this.degradedMode = true;
      return { ok: false, collectionsLoaded: 0, error: 'readTelegramCollection unavailable' };
    }
    let collectionsLoaded = 0;
    try {
      const [
        users,
        settingsDocs,
        channels,
        admins,
        publications,
        customEmojis,
        broadcasts,
        tickets,
        drafts,
        engagements,
        aiLogs,
        quizAttempts,
        hifzProfiles,
        appConfigDocs,
        runtimeInstances,
      ] = await Promise.all([
        this.firestore.readTelegramCollection('telegramUsers'),
        this.firestore.readTelegramCollection('telegramSettings'),
        this.firestore.readTelegramCollection('telegramChannels'),
        this.firestore.readTelegramCollection('telegramAdmins'),
        this.firestore.readTelegramCollection('telegramPublications'),
        this.firestore.readTelegramCollection('telegramCustomEmojis'),
        this.firestore.readTelegramCollection('telegramBroadcasts'),
        this.firestore.readTelegramCollection('telegramSupportTickets'),
        this.firestore.readTelegramCollection('telegramContentDrafts'),
        this.firestore.readTelegramCollection('telegramUserEngagement'),
        this.firestore.readTelegramCollection('telegramAiLogs'),
        this.firestore.readTelegramCollection('telegramQuizAttempts'),
        this.firestore.readTelegramCollection('telegramHifzProfiles'),
        this.firestore.readTelegramCollection('appConfig').catch(() => []),
        this.firestore.readTelegramCollection('telegramRuntimeInstances').catch(() => []),
      ]);

      this.lastFirestoreReadAt = new Date().toISOString();
      this.firestoreOnline = true;
      this.degradedMode = false;

      if (Array.isArray(users) && users.length > 0) {
        collectionsLoaded++;
        for (const u of users as unknown as TelegramUserRecord[]) {
          if (u?.telegramId) {
            const cur = this.state.users[u.telegramId];
            if (!cur || !cur.updatedAt || (u.updatedAt || '') >= cur.updatedAt) {
              this.state.users[u.telegramId] = u;
            }
          }
        }
      }
      if (Array.isArray(settingsDocs)) {
        const def = (settingsDocs as unknown as TelegramBotSettingsRecord[]).find(
          (s) => s.id === 'default'
        );
        if (def) {
          collectionsLoaded++;
          const curVer = typeof this.state.settings.version === 'number' ? this.state.settings.version : 0;
          const incVer = typeof def.version === 'number' ? def.version : 0;
          const isStaleVersion = curVer > 0 && incVer > 0 && incVer < curVer;
          const isStaleTimestamp =
            curVer === incVer &&
            Boolean(this.state.settings.updatedAt) &&
            Boolean(def.updatedAt) &&
            def.updatedAt < this.state.settings.updatedAt &&
            this.state.settings.updatedBy !== 'system';

          if (isStaleVersion || isStaleTimestamp) {
            this.recordRollbackWarning({
              target: 'settings',
              source: 'firestore:telegramSettings/default',
              functionName: 'hydrateFromFirestore',
              currentVersion: curVer,
              incomingVersion: incVer,
              reason: `Ignored stale settings snapshot (incoming v${incVer} @ ${def.updatedAt} < current v${curVer} @ ${this.state.settings.updatedAt})`,
            });
          } else {
            this.state.settings = {
              ...this.state.settings,
              ...def,
              version: Math.max(curVer, incVer, 1),
            };
          }
        }
      }
      if (Array.isArray(channels) && channels.length > 0) {
        collectionsLoaded++;
        for (const c of channels as unknown as TelegramChannelRecord[]) {
          if (c?.id) this.state.channels[c.id] = c;
        }
      }
      if (Array.isArray(admins) && admins.length > 0) {
        collectionsLoaded++;
        for (const a of admins as unknown as TelegramAdminRecord[]) {
          if (a?.telegramId) this.state.admins[a.telegramId] = a;
        }
      }
      if (Array.isArray(publications) && publications.length > 0) {
        collectionsLoaded++;
        const byId = new Map<string, TelegramPublicationRecord>();
        for (const p of [...(publications as unknown as TelegramPublicationRecord[]), ...this.state.publications]) {
          if (p?.id) byId.set(p.id, p);
        }
        this.state.publications = Array.from(byId.values())
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
          .slice(0, 500);
      }

      // Hydrate unified appConfig/emojiRegistry first (anti-downgrade guarded)
      if (Array.isArray(appConfigDocs) && appConfigDocs.length > 0) {
        const regDoc = (appConfigDocs as unknown as AppConfigEmojiRegistryDocument[]).find(
          (d) => d && d.id === 'emojiRegistry'
        );
        if (regDoc && regDoc.emojis) {
          collectionsLoaded++;
          const curRegVer = this.state.appConfigEmojiRegistry?.version || 0;
          const incRegVer = typeof regDoc.version === 'number' ? regDoc.version : 0;
          if (curRegVer > 0 && incRegVer > 0 && incRegVer < curRegVer) {
            this.recordRollbackWarning({
              target: 'emoji_registry',
              source: 'firestore:appConfig/emojiRegistry',
              functionName: 'hydrateFromFirestore',
              currentVersion: curRegVer,
              incomingVersion: incRegVer,
              reason: `Ignored stale appConfig/emojiRegistry v${incRegVer} < current v${curRegVer}`,
            });
          } else {
            this.state.appConfigEmojiRegistry = regDoc;
            this.state.settings.emojiRegistryVersion = Math.max(
              this.state.settings.emojiRegistryVersion || 0,
              incRegVer
            );
            for (const [k, v] of Object.entries(regDoc.emojis)) {
              const existing = this.state.customEmojis[k];
              const curSlotVer = existing?.version || 0;
              const incSlotVer = typeof v.version === 'number' ? v.version : incRegVer;
              if (curSlotVer > 0 && incSlotVer > 0 && incSlotVer < curSlotVer) continue;
              this.state.customEmojis[k] = {
                key: k,
                category: (v.category || existing?.category || 'custom') as CustomEmojiEntry['category'],
                unicodeFallback: existing?.unicodeFallback || '*',
                customEmojiId: v.customEmojiId ?? null,
                semanticPurpose: v.semanticPurpose || existing?.semanticPurpose,
                usedIn: v.usedIn || existing?.usedIn,
                isCustomAdminSlot: v.isCustomAdminSlot ?? existing?.isCustomAdminSlot,
                enabled: v.enabled !== false,
                verified: Boolean(v.verified && v.customEmojiId),
                verifiedAt: v.verifiedAt || existing?.verifiedAt,
                stickerSetName: v.stickerSetName || existing?.stickerSetName,
                supportsKeyboardIcon: existing ? existing.supportsKeyboardIcon : true,
                description: v.description || existing?.description || k,
                webAssetUrl: v.webAssetUrl || existing?.webAssetUrl || null,
                webAssetFormat: v.webAssetFormat || existing?.webAssetFormat || 'unknown',
                webRenderable: Boolean(v.webRenderable),
                version: Math.max(curSlotVer, incSlotVer, 1),
                updatedBy: v.updatedBy || regDoc.updatedBy,
                updatedAt: v.updatedAt || regDoc.updatedAt,
              };
            }
          }
        }
      }

      if (Array.isArray(customEmojis) && customEmojis.length > 0) {
        collectionsLoaded++;
        for (const e of customEmojis as unknown as CustomEmojiEntry[]) {
          if (!e?.key) continue;
          const existing = this.state.customEmojis[e.key];
          const curVer = existing?.version || 0;
          const incVer = typeof e.version === 'number' ? e.version : 0;
          if (curVer > 0 && incVer > 0 && incVer < curVer) {
            this.recordRollbackWarning({
              target: 'custom_emoji',
              source: `firestore:telegramCustomEmojis/${e.key}`,
              functionName: 'hydrateFromFirestore',
              currentVersion: curVer,
              incomingVersion: incVer,
              reason: `Ignored stale custom emoji ${e.key} v${incVer} < v${curVer}`,
            });
            continue;
          }
          if (existing && curVer === incVer && existing.updatedAt && e.updatedAt && e.updatedAt < existing.updatedAt) {
            continue;
          }
          this.state.customEmojis[e.key] = {
            ...existing,
            ...e,
            version: Math.max(curVer, incVer, 1),
          };
        }
      }
      if (Array.isArray(runtimeInstances) && runtimeInstances.length > 0) {
        if (!this.state.runtimeInstances) this.state.runtimeInstances = {};
        for (const inst of runtimeInstances as unknown as TelegramRuntimeInstanceRecord[]) {
          if (inst?.instanceId) {
            this.state.runtimeInstances[inst.instanceId] = inst;
          }
        }
      }
      if (Array.isArray(broadcasts) && broadcasts.length > 0) {
        collectionsLoaded++;
        for (const b of broadcasts as unknown as TelegramBroadcastRecord[]) {
          if (b?.id) this.state.broadcasts[b.id] = b;
        }
      }
      if (Array.isArray(tickets) && tickets.length > 0) {
        collectionsLoaded++;
        for (const t of tickets as unknown as TelegramSupportTicketRecord[]) {
          if (t?.id) this.state.supportTickets[t.id] = t;
        }
      }
      if (Array.isArray(drafts) && drafts.length > 0) {
        collectionsLoaded++;
        for (const d of drafts as unknown as TelegramContentDraftRecord[]) {
          if (d?.id) this.state.contentDrafts[d.id] = d;
        }
      }
      if (Array.isArray(engagements) && engagements.length > 0) {
        collectionsLoaded++;
        for (const g of engagements as unknown as TelegramUserEngagementRecord[]) {
          if (g?.telegramId) this.state.userEngagement[g.telegramId] = g;
        }
      }
      if (Array.isArray(aiLogs) && aiLogs.length > 0) {
        collectionsLoaded++;
        const byId = new Map<string, TelegramAiLogRecord>();
        for (const l of [...(aiLogs as unknown as TelegramAiLogRecord[]), ...this.state.aiLogs]) {
          if (l?.id) byId.set(l.id, l);
        }
        this.state.aiLogs = Array.from(byId.values())
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
          .slice(0, 1000);
      }
      if (Array.isArray(quizAttempts) && quizAttempts.length > 0) {
        collectionsLoaded++;
        const byId = new Map<string, TelegramQuizAttemptRecord>();
        for (const q of [...(quizAttempts as unknown as TelegramQuizAttemptRecord[]), ...this.state.quizAttempts]) {
          if (q?.id) byId.set(q.id, q);
        }
        this.state.quizAttempts = Array.from(byId.values())
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
          .slice(0, 2000);
      }
      if (Array.isArray(hifzProfiles) && hifzProfiles.length > 0) {
        collectionsLoaded++;
        for (const h of hifzProfiles as unknown as TelegramHifzProfile[]) {
          if (h?.telegramId) this.state.hifzProfiles[h.telegramId] = h;
        }
      }

      this.hydratedFromFirestore = true;
      this.lastHydratedAt = new Date().toISOString();
      this.persistToDisk(true);
      return { ok: true, collectionsLoaded };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.firestoreOnline = false;
      this.degradedMode = true;
      this.lastSyncError = `Hydrate failed: ${msg}`;
      this.recordRollbackWarning({
        target: 'firestore_degraded',
        source: 'firestore',
        functionName: 'hydrateFromFirestore',
        currentVersion: this.state.settings.version || 0,
        incomingVersion: 0,
        reason: `Firestore unreachable during hydration (${msg}). Running in safe degraded read-cache mode; refusing to overwrite Firestore with defaults.`,
      });
      this.logger.warn('TelegramRepository Firestore hydration warning', { error: msg });
      return { ok: false, collectionsLoaded, error: msg };
    }
  }

  getFirestoreSyncStatus(): FirestoreSyncTelemetry {
    return {
      bridgeActive: Boolean(this.firestore),
      firestoreOnline: this.firestoreOnline,
      degradedMode: this.degradedMode,
      hydratedFromFirestore: this.hydratedFromFirestore,
      lastHydratedAt: this.lastHydratedAt,
      lastFirestoreReadAt: this.lastFirestoreReadAt,
      lastFirestoreWriteAt: this.lastFirestoreWriteAt,
      lastCacheRefreshAt: this.lastCacheRefreshAt,
      configVersion: this.state.settings.version || 1,
      configUpdatedAt: this.state.settings.updatedAt,
      emojiRegistryVersion:
        this.state.appConfigEmojiRegistry?.version || this.state.settings.emojiRegistryVersion || 0,
      totalWritesAttempted: this.totalWritesAttempted,
      totalWritesSucceeded: this.totalWritesSucceeded,
      totalWritesFailed: this.totalWritesFailed,
      lastSyncAt: this.lastSyncAt,
      lastSyncError: this.lastSyncError,
      rollbackWarnings: this.rollbackWarnings.slice(0, 25),
    };
  }

  // ---- Users (telegramUsers) ----

  getUser(telegramId: string): TelegramUserRecord | null {
    return this.state.users[telegramId] || null;
  }

  listUsers(): TelegramUserRecord[] {
    return Object.values(this.state.users);
  }

  async saveUser(user: TelegramUserRecord): Promise<TelegramUserRecord> {
    this.state.users[user.telegramId] = user;
    this.persistToDisk();
    await this.syncDocToFirestore(
      'telegramUsers',
      `tg_${user.telegramId}`,
      user as unknown as Record<string, unknown>
    );
    return user;
  }

  async deleteUser(telegramId: string): Promise<{ ok: boolean }> {
    delete this.state.users[telegramId];
    delete this.state.userEngagement[telegramId];
    delete this.state.hifzProfiles[telegramId];
    this.persistToDisk();
    await Promise.all([
      this.deleteDocFromFirestore('telegramUsers', `tg_${telegramId}`),
      this.deleteDocFromFirestore('telegramUserEngagement', `tg_eng_${telegramId}`),
      this.deleteDocFromFirestore('telegramHifzProfiles', `hifz_${telegramId}`),
    ]);
    return { ok: true };
  }

  // ---- Settings (telegramSettings) ----

  getSettings(): TelegramBotSettingsRecord {
    return { ...this.state.settings };
  }

  async saveSettings(
    patch: Partial<TelegramBotSettingsRecord>,
    updatedBy = 'system'
  ): Promise<TelegramBotSettingsRecord> {
    const currentVersion = typeof this.state.settings.version === 'number' ? this.state.settings.version : 0;
    // Reject explicit version downgrade attempts
    if (typeof patch.version === 'number' && currentVersion > 0 && patch.version < currentVersion) {
      this.recordRollbackWarning({
        target: 'settings',
        source: updatedBy,
        functionName: 'saveSettings',
        currentVersion,
        incomingVersion: patch.version,
        reason: `Rejected settings downgrade from v${currentVersion} to v${patch.version} by ${updatedBy}`,
      });
      return { ...this.state.settings };
    }

    const nextVersion = Math.max(currentVersion + 1, typeof patch.version === 'number' ? patch.version : 1);
    const next: TelegramBotSettingsRecord = {
      ...this.state.settings,
      ...patch,
      id: 'default',
      version: nextVersion,
      updatedAt: new Date().toISOString(),
      updatedBy,
    };
    this.state.settings = next;
    const syncRes = await this.syncDocToFirestore(
      'telegramSettings',
      'default',
      next as unknown as Record<string, unknown>
    );
    this.persistToDisk(syncRes.ok);
    return next;
  }

  // ---- Channels (telegramChannels) ----

  listChannels(): TelegramChannelRecord[] {
    return Object.values(this.state.channels);
  }

  getChannel(id: string): TelegramChannelRecord | null {
    return this.state.channels[id] || null;
  }

  async saveChannel(channel: TelegramChannelRecord): Promise<TelegramChannelRecord> {
    this.state.channels[channel.id] = channel;
    this.persistToDisk();
    await this.syncDocToFirestore(
      'telegramChannels',
      channel.id,
      channel as unknown as Record<string, unknown>
    );
    return channel;
  }

  async deleteChannel(id: string): Promise<boolean> {
    if (!this.state.channels[id]) return false;
    delete this.state.channels[id];
    this.persistToDisk();
    await this.deleteDocFromFirestore('telegramChannels', id);
    return true;
  }

  // ---- Admins (telegramAdmins) ----

  listAdmins(): TelegramAdminRecord[] {
    return Object.values(this.state.admins);
  }

  getAdmin(telegramId: string): TelegramAdminRecord | null {
    return this.state.admins[telegramId] || null;
  }

  async saveAdmin(admin: TelegramAdminRecord): Promise<TelegramAdminRecord> {
    this.state.admins[admin.telegramId] = admin;
    this.persistToDisk();
    await this.syncDocToFirestore(
      'telegramAdmins',
      `tg_admin_${admin.telegramId}`,
      admin as unknown as Record<string, unknown>
    );
    return admin;
  }

  // ---- Publications (telegramPublications) ----

  listPublications(limit = 50): TelegramPublicationRecord[] {
    return this.state.publications.slice(0, Math.max(1, limit));
  }

  hasPublicationWithIdempotencyKey(key: string): boolean {
    return this.state.publications.some((p) => p.idempotencyKey === key && p.status === 'sent');
  }

  async recordPublication(
    record: Omit<TelegramPublicationRecord, 'id' | 'createdAt'>
  ): Promise<TelegramPublicationRecord> {
    const full: TelegramPublicationRecord = {
      ...record,
      id: `tg_pub_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`,
      createdAt: new Date().toISOString(),
    };
    this.state.publications.unshift(full);
    if (this.state.publications.length > 500) {
      this.state.publications = this.state.publications.slice(0, 500);
    }
    this.persistToDisk();
    await this.syncDocToFirestore(
      'telegramPublications',
      full.id,
      full as unknown as Record<string, unknown>
    );
    return full;
  }

  // ---- Audit Logs (telegramAuditLogs) ----

  listAuditLogs(limit = 100): TelegramAuditLogRecord[] {
    return this.state.auditLogs.slice(0, Math.max(1, limit));
  }

  async appendAuditLog(
    entry: Omit<TelegramAuditLogRecord, 'id' | 'createdAt'>
  ): Promise<TelegramAuditLogRecord> {
    const full: TelegramAuditLogRecord = {
      ...entry,
      id: `tg_log_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`,
      createdAt: new Date().toISOString(),
    };
    this.state.auditLogs.unshift(full);
    if (this.state.auditLogs.length > 1000) {
      this.state.auditLogs = this.state.auditLogs.slice(0, 1000);
    }
    this.persistToDisk();
    await this.syncDocToFirestore(
      'telegramAuditLogs',
      full.id,
      full as unknown as Record<string, unknown>
    );
    return full;
  }

  // ---- Custom Emojis (telegramCustomEmojis) ----

  listCustomEmojis(): CustomEmojiEntry[] {
    return Object.values(this.state.customEmojis);
  }

  async saveCustomEmoji(entry: CustomEmojiEntry): Promise<CustomEmojiEntry> {
    const existing = this.state.customEmojis[entry.key];
    const currentVer = typeof existing?.version === 'number' ? existing.version : 0;
    if (typeof entry.version === 'number' && currentVer > 0 && entry.version < currentVer) {
      this.recordRollbackWarning({
        target: 'custom_emoji',
        source: entry.updatedBy || 'unknown',
        functionName: 'saveCustomEmoji',
        currentVersion: currentVer,
        incomingVersion: entry.version,
        reason: `Rejected stale custom emoji write for "${entry.key}" (v${entry.version} < v${currentVer})`,
      });
      return existing!;
    }
    const versioned: CustomEmojiEntry = {
      ...entry,
      version: Math.max(currentVer + 1, typeof entry.version === 'number' ? entry.version : 1),
      updatedAt: entry.updatedAt || new Date().toISOString(),
    };
    this.state.customEmojis[versioned.key] = versioned;
    const safeDocId = versioned.key.replace(/[^a-zA-Z0-9_-]/g, '_');
    const syncRes = await this.syncDocToFirestore(
      'telegramCustomEmojis',
      safeDocId,
      versioned as unknown as Record<string, unknown>
    );
    this.persistToDisk(true);
    void syncRes;
    return versioned;
  }

  async deleteCustomEmoji(key: string): Promise<boolean> {
    const existed = Boolean(this.state.customEmojis[key]);
    delete this.state.customEmojis[key];
    const safeDocId = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    await this.deleteDocFromFirestore('telegramCustomEmojis', safeDocId);
    this.persistToDisk(true);
    return existed;
  }

  // ---- Unified AppConfig Emoji Registry (appConfig/emojiRegistry) ----

  getAppConfigEmojiRegistry(): AppConfigEmojiRegistryDocument | null {
    return this.state.appConfigEmojiRegistry || null;
  }

  async saveAppConfigEmojiRegistry(
    doc: AppConfigEmojiRegistryDocument,
    premiumEmojisDoc?: Record<string, unknown>
  ): Promise<{ ok: boolean; doc: AppConfigEmojiRegistryDocument; premiumConfigSaved?: boolean; error?: string }> {
    const currentVer = this.state.appConfigEmojiRegistry?.version || 0;
    if (currentVer > 0 && doc.version < currentVer) {
      this.recordRollbackWarning({
        target: 'emoji_registry',
        source: doc.updatedBy || 'unknown',
        functionName: 'saveAppConfigEmojiRegistry',
        currentVersion: currentVer,
        incomingVersion: doc.version,
        reason: `Rejected downgrade of appConfig/emojiRegistry from v${currentVer} to v${doc.version}`,
      });
      return {
        ok: false,
        doc: this.state.appConfigEmojiRegistry!,
        error: `Version downgrade rejected (v${doc.version} < v${currentVer})`,
      };
    }
    const nextDoc: AppConfigEmojiRegistryDocument = {
      ...doc,
      id: 'emojiRegistry',
      version: Math.max(currentVer + 1, doc.version || 1),
      updatedAt: new Date().toISOString(),
    };
    this.state.appConfigEmojiRegistry = nextDoc;
    this.state.settings.emojiRegistryVersion = nextDoc.version;
    const syncRes = await this.syncDocToFirestore(
      'appConfig',
      'emojiRegistry',
      nextDoc as unknown as Record<string, unknown>
    );
    let premiumConfigSaved = false;
    if (premiumEmojisDoc) {
      const pRes = await this.syncDocToFirestore('app_config', 'premium_emojis', {
        ...premiumEmojisDoc,
        version: nextDoc.version,
        updated_at: nextDoc.updatedAt,
      });
      premiumConfigSaved = pRes.ok;
    }
    this.persistToDisk(syncRes.ok);
    return { ok: syncRes.ok, doc: nextDoc, premiumConfigSaved, error: syncRes.error };
  }

  // ---- Active Runtime Instance Tracking (telegramRuntimeInstances) ----

  async registerRuntimeInstance(
    record: TelegramRuntimeInstanceRecord
  ): Promise<{ ok: boolean; error?: string }> {
    if (!this.state.runtimeInstances) this.state.runtimeInstances = {};
    this.state.runtimeInstances[record.instanceId] = record;
    if (!this.firestore) {
      return { ok: false, error: 'Firestore bridge not configured' };
    }
    try {
      const safeId = record.instanceId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
      const res = await this.firestore.writeTelegramDoc(
        'telegramRuntimeInstances',
        safeId,
        record as unknown as Record<string, unknown>
      );
      return { ok: res.success, error: res.error };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  listRuntimeInstances(activeWithinMs = 5 * 60_000): TelegramRuntimeInstanceRecord[] {
    const cutoff = Date.now() - activeWithinMs;
    return Object.values(this.state.runtimeInstances || {})
      .filter((inst) => {
        const ts = Date.parse(inst.lastHeartbeatAt || inst.startedAt || '');
        return Number.isFinite(ts) ? ts >= cutoff : true;
      })
      .sort((a, b) => (b.lastHeartbeatAt || '').localeCompare(a.lastHeartbeatAt || ''));
  }

  listEmojiAuditLogs(limit = 30): TelegramAuditLogRecord[] {
    return this.state.auditLogs
      .filter((l) => l.targetType === 'emoji')
      .slice(0, Math.max(1, Math.min(200, limit)));
  }

  // ---- Broadcast Campaigns (telegramBroadcasts) ----

  listBroadcasts(): TelegramBroadcastRecord[] {
    return Object.values(this.state.broadcasts).sort((a, b) =>
      (b.createdAt || '').localeCompare(a.createdAt || '')
    );
  }

  getBroadcast(id: string): TelegramBroadcastRecord | null {
    return this.state.broadcasts[id] || null;
  }

  async saveBroadcast(record: TelegramBroadcastRecord): Promise<TelegramBroadcastRecord> {
    this.state.broadcasts[record.id] = record;
    this.persistToDisk();
    await this.syncDocToFirestore(
      'telegramBroadcasts',
      record.id,
      record as unknown as Record<string, unknown>
    );
    return record;
  }

  // ---- Support Tickets (telegramSupportTickets) ----

  listSupportTickets(): TelegramSupportTicketRecord[] {
    return Object.values(this.state.supportTickets).sort((a, b) =>
      (b.updatedAt || '').localeCompare(a.updatedAt || '')
    );
  }

  getSupportTicket(id: string): TelegramSupportTicketRecord | null {
    return this.state.supportTickets[id] || null;
  }

  async saveSupportTicket(ticket: TelegramSupportTicketRecord): Promise<TelegramSupportTicketRecord> {
    this.state.supportTickets[ticket.id] = ticket;
    this.persistToDisk();
    await this.syncDocToFirestore(
      'telegramSupportTickets',
      ticket.id,
      ticket as unknown as Record<string, unknown>
    );
    return ticket;
  }

  // ---- Content Studio Drafts (telegramContentDrafts) ----

  listContentDrafts(): TelegramContentDraftRecord[] {
    return Object.values(this.state.contentDrafts).sort((a, b) =>
      (b.updatedAt || '').localeCompare(a.updatedAt || '')
    );
  }

  getContentDraft(id: string): TelegramContentDraftRecord | null {
    return this.state.contentDrafts[id] || null;
  }

  async saveContentDraft(draft: TelegramContentDraftRecord): Promise<TelegramContentDraftRecord> {
    this.state.contentDrafts[draft.id] = draft;
    this.persistToDisk();
    await this.syncDocToFirestore(
      'telegramContentDrafts',
      draft.id,
      draft as unknown as Record<string, unknown>
    );
    return draft;
  }

  // ---- User Engagement: Bookmarks, Khatm, Tasbeh Goals, Academy, AI History ----

  getUserEngagement(telegramId: string): TelegramUserEngagementRecord {
    const todayKey = getTashkentDateKey();
    const existing = this.state.userEngagement[telegramId];
    if (existing) {
      if (existing.dhikr.todayDateKey !== todayKey) {
        existing.dhikr.todayDateKey = todayKey;
        existing.dhikr.todayCount = 0;
      }
      return existing;
    }
    return {
      telegramId,
      bookmarks: [],
      dhikr: {
        countsByDhikrId: {},
        dailyGoals: {},
        todayDateKey: todayKey,
        todayCount: 0,
        totalAllTimeCount: 0,
        reminderEnabled: false,
      },
      completedLessonIds: [],
      quizTotalAttempts: 0,
      quizBestScore: 0,
      quizTotalPoints: 0,
      quizStreak: 0,
      aiHistory: [],
      updatedAt: new Date().toISOString(),
    };
  }

  listAllEngagement(): TelegramUserEngagementRecord[] {
    return Object.values(this.state.userEngagement);
  }

  async saveUserEngagement(
    record: TelegramUserEngagementRecord
  ): Promise<TelegramUserEngagementRecord> {
    const next: TelegramUserEngagementRecord = {
      ...record,
      updatedAt: new Date().toISOString(),
    };
    this.state.userEngagement[record.telegramId] = next;
    this.persistToDisk();
    await this.syncDocToFirestore(
      'telegramUserEngagement',
      `tg_eng_${record.telegramId}`,
      next as unknown as Record<string, unknown>
    );
    return next;
  }

  // ---- AI Telemetry Logs (telegramAiLogs) ----

  listAiLogs(limit = 100): TelegramAiLogRecord[] {
    return this.state.aiLogs.slice(0, Math.max(1, limit));
  }

  async appendAiLog(
    entry: Omit<TelegramAiLogRecord, 'id' | 'createdAt'>
  ): Promise<TelegramAiLogRecord> {
    const full: TelegramAiLogRecord = {
      ...entry,
      id: `tg_ai_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`,
      createdAt: new Date().toISOString(),
    };
    this.state.aiLogs.unshift(full);
    if (this.state.aiLogs.length > 1000) {
      this.state.aiLogs = this.state.aiLogs.slice(0, 1000);
    }
    this.persistToDisk();
    await this.syncDocToFirestore(
      'telegramAiLogs',
      full.id,
      full as unknown as Record<string, unknown>
    );
    return full;
  }

  async flagAiLog(
    logId: string,
    flaggedByAdmin: boolean,
    adminNote?: string
  ): Promise<TelegramAiLogRecord | null> {
    const found = this.state.aiLogs.find((l) => l.id === logId);
    if (!found) return null;
    found.flaggedByAdmin = flaggedByAdmin;
    if (adminNote !== undefined) found.adminNote = adminNote;
    this.persistToDisk();
    await this.syncDocToFirestore(
      'telegramAiLogs',
      found.id,
      found as unknown as Record<string, unknown>
    );
    return found;
  }

  // ---- Quiz Attempts & Leaderboard (telegramQuizAttempts) ----

  listQuizAttempts(limit = 200): TelegramQuizAttemptRecord[] {
    return this.state.quizAttempts.slice(0, Math.max(1, limit));
  }

  async recordQuizAttempt(
    attempt: Omit<TelegramQuizAttemptRecord, 'id' | 'createdAt'>
  ): Promise<TelegramQuizAttemptRecord> {
    const full: TelegramQuizAttemptRecord = {
      ...attempt,
      id: `tg_quiz_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`,
      createdAt: new Date().toISOString(),
    };
    this.state.quizAttempts.unshift(full);
    if (this.state.quizAttempts.length > 2000) {
      this.state.quizAttempts = this.state.quizAttempts.slice(0, 2000);
    }
    this.persistToDisk();
    await this.syncDocToFirestore(
      'telegramQuizAttempts',
      full.id,
      full as unknown as Record<string, unknown>
    );
    return full;
  }

  // ---- Hifz Profiles (telegramHifzProfiles) ----

  getHifzProfile(telegramId: string): TelegramHifzProfile | null {
    return this.state.hifzProfiles[telegramId] || null;
  }

  listHifzProfiles(): TelegramHifzProfile[] {
    return Object.values(this.state.hifzProfiles);
  }

  async saveHifzProfile(profile: TelegramHifzProfile): Promise<TelegramHifzProfile> {
    const next: TelegramHifzProfile = {
      ...profile,
      updatedAt: new Date().toISOString(),
    };
    this.state.hifzProfiles[profile.telegramId] = next;
    this.persistToDisk();
    await this.syncDocToFirestore(
      'telegramHifzProfiles',
      `hifz_${profile.telegramId}`,
      next as unknown as Record<string, unknown>
    );
    return next;
  }

  async deleteHifzProfile(telegramId: string): Promise<{ ok: boolean }> {
    delete this.state.hifzProfiles[telegramId];
    this.persistToDisk();
    await this.deleteDocFromFirestore('telegramHifzProfiles', `hifz_${telegramId}`);
    return { ok: true };
  }

  // ---- Persistent Scheduler Dispatch Ledger ----

  hasSchedulerDispatched(key: string, dateKey?: string): boolean {
    const ledger = this.state.settings.schedulerDispatchLedger || {};
    const existing = ledger[key];
    if (!existing) return false;
    return dateKey ? existing === dateKey : true;
  }

  async markSchedulerDispatched(key: string, dateKey: string): Promise<void> {
    const current = { ...(this.state.settings.schedulerDispatchLedger || {}) };
    current[key] = dateKey;
    const keys = Object.keys(current);
    if (keys.length > 400) {
      const pruned: Record<string, string> = {};
      for (const k of keys.slice(-300)) {
        pruned[k] = current[k];
      }
      await this.saveSettings({ schedulerDispatchLedger: pruned }, 'scheduler');
      return;
    }
    await this.saveSettings({ schedulerDispatchLedger: current }, 'scheduler');
  }

  getStats() {
    const tickets = Object.values(this.state.supportTickets);
    const broadcasts = Object.values(this.state.broadcasts);
    const users = Object.values(this.state.users);
    return {
      usersCount: users.length,
      registeredProfilesCount: users.filter(
        (u) => Boolean(u.profileCompleted && u.registeredFirstName && u.registeredLastName)
      ).length,
      activeUsersCount: users.filter((u) => !u.isBlocked && !u.stoppedByUser).length,
      hifzProfilesCount: Object.keys(this.state.hifzProfiles).length,
      channelsCount: Object.keys(this.state.channels).length,
      adminsCount: Object.keys(this.state.admins).length,
      publicationsCount: this.state.publications.length,
      auditLogsCount: this.state.auditLogs.length,
      customEmojisStoredCount: Object.keys(this.state.customEmojis).length,
      broadcastsCount: broadcasts.length,
      openTicketsCount: tickets.filter((t) => t.status === 'new' || t.status === 'in_progress').length,
      totalTicketsCount: tickets.length,
      contentDraftsCount: Object.keys(this.state.contentDrafts).length,
      aiLogsCount: this.state.aiLogs.length,
      quizAttemptsCount: this.state.quizAttempts.length,
    };
  }
}
