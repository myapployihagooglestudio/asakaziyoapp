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
  CustomEmojiEntry,
  TelegramAdminRecord,
  TelegramAiLogRecord,
  TelegramAuditLogRecord,
  TelegramBotSettingsRecord,
  TelegramBroadcastRecord,
  TelegramChannelRecord,
  TelegramContentDraftRecord,
  TelegramPublicationRecord,
  TelegramQuizAttemptRecord,
  TelegramSupportTicketRecord,
  TelegramUserEngagementRecord,
  TelegramUserRecord,
} from '../types';
import { DEFAULT_TELEGRAM_AI_MODEL, DEFAULT_TELEGRAM_MINIAPP_URL } from '../config';
import { TelegramLogger } from '../middlewares/logger';

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
  broadcasts: Record<string, TelegramBroadcastRecord>;
  supportTickets: Record<string, TelegramSupportTicketRecord>;
  contentDrafts: Record<string, TelegramContentDraftRecord>;
  userEngagement: Record<string, TelegramUserEngagementRecord>;
  aiLogs: TelegramAiLogRecord[];
  quizAttempts: TelegramQuizAttemptRecord[];
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
  };
}

export interface FirestoreSyncTelemetry {
  bridgeActive: boolean;
  hydratedFromFirestore: boolean;
  lastHydratedAt: string | null;
  totalWritesAttempted: number;
  totalWritesSucceeded: number;
  totalWritesFailed: number;
  lastSyncAt: string | null;
  lastSyncError: string | null;
}

export class TelegramRepository {
  private readonly storePath: string;
  private readonly firestore?: ScopedFirestoreBridge;
  private readonly logger: TelegramLogger;
  private state: TelegramLocalStoreShape;

  private hydratedFromFirestore = false;
  private lastHydratedAt: string | null = null;
  private totalWritesAttempted = 0;
  private totalWritesSucceeded = 0;
  private totalWritesFailed = 0;
  private lastSyncAt: string | null = null;
  private lastSyncError: string | null = null;

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
          broadcasts: parsed.broadcasts || {},
          supportTickets: parsed.supportTickets || {},
          contentDrafts: parsed.contentDrafts || {},
          userEngagement: parsed.userEngagement || {},
          aiLogs: Array.isArray(parsed.aiLogs) ? parsed.aiLogs : [],
          quizAttempts: Array.isArray(parsed.quizAttempts) ? parsed.quizAttempts : [],
        };
      }
    } catch (err) {
      this.logger.warn('Failed reading isolated Telegram local store; initializing fresh defaults', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
    return createDefaultStore();
  }

  private persistToDisk(): void {
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
        this.lastSyncAt = new Date().toISOString();
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
   */
  async hydrateFromFirestore(): Promise<{ ok: boolean; collectionsLoaded: number; error?: string }> {
    if (!this.firestore?.readTelegramCollection) {
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
      ]);

      if (Array.isArray(users) && users.length > 0) {
        collectionsLoaded++;
        for (const u of users as unknown as TelegramUserRecord[]) {
          if (u?.telegramId) this.state.users[u.telegramId] = u;
        }
      }
      if (Array.isArray(settingsDocs)) {
        const def = (settingsDocs as unknown as TelegramBotSettingsRecord[]).find(
          (s) => s.id === 'default'
        );
        if (def) {
          collectionsLoaded++;
          this.state.settings = { ...this.state.settings, ...def };
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
      if (Array.isArray(customEmojis) && customEmojis.length > 0) {
        collectionsLoaded++;
        for (const e of customEmojis as unknown as CustomEmojiEntry[]) {
          if (e?.key) this.state.customEmojis[e.key] = e;
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

      this.hydratedFromFirestore = true;
      this.lastHydratedAt = new Date().toISOString();
      this.persistToDisk();
      return { ok: true, collectionsLoaded };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.lastSyncError = `Hydrate failed: ${msg}`;
      this.logger.warn('TelegramRepository Firestore hydration warning', { error: msg });
      return { ok: false, collectionsLoaded, error: msg };
    }
  }

  getFirestoreSyncStatus(): FirestoreSyncTelemetry {
    return {
      bridgeActive: Boolean(this.firestore),
      hydratedFromFirestore: this.hydratedFromFirestore,
      lastHydratedAt: this.lastHydratedAt,
      totalWritesAttempted: this.totalWritesAttempted,
      totalWritesSucceeded: this.totalWritesSucceeded,
      totalWritesFailed: this.totalWritesFailed,
      lastSyncAt: this.lastSyncAt,
      lastSyncError: this.lastSyncError,
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
    this.persistToDisk();
    await Promise.all([
      this.deleteDocFromFirestore('telegramUsers', `tg_${telegramId}`),
      this.deleteDocFromFirestore('telegramUserEngagement', `tg_eng_${telegramId}`),
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
    const next: TelegramBotSettingsRecord = {
      ...this.state.settings,
      ...patch,
      id: 'default',
      updatedAt: new Date().toISOString(),
      updatedBy,
    };
    this.state.settings = next;
    this.persistToDisk();
    await this.syncDocToFirestore(
      'telegramSettings',
      'default',
      next as unknown as Record<string, unknown>
    );
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
    this.state.customEmojis[entry.key] = entry;
    this.persistToDisk();
    const safeDocId = entry.key.replace(/[^a-zA-Z0-9_-]/g, '_');
    await this.syncDocToFirestore(
      'telegramCustomEmojis',
      safeDocId,
      entry as unknown as Record<string, unknown>
    );
    return entry;
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

  getStats() {
    const tickets = Object.values(this.state.supportTickets);
    const broadcasts = Object.values(this.state.broadcasts);
    return {
      usersCount: Object.keys(this.state.users).length,
      activeUsersCount: Object.values(this.state.users).filter((u) => !u.isBlocked && !u.stoppedByUser).length,
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
