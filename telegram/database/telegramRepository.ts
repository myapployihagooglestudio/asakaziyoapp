/**
 * ASAKA ZIYO — Isolated Least-Privilege Telegram Database Repository
 *
 * SECURITY ISOLATION GUARANTEES:
 * 1. Maintains an explicit runtime allowlist of ONLY the 7 dedicated Telegram collections:
 *    - telegramUsers
 *    - telegramSettings
 *    - telegramChannels
 *    - telegramAdmins
 *    - telegramPublications
 *    - telegramAuditLogs
 *    - telegramCustomEmojis
 * 2. Refuses at runtime (throws SecurityError) to write or delete ANY existing
 *    Web App / Mobile App Firestore collection (`users`, `admins`, `schedules`, `articles`, etc.).
 * 3. Persists local state to its OWN isolated file (`/data/telegram_platform_store.json`),
 *    never touching `/data/asaka_ziyo_db.json`.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  CustomEmojiEntry,
  TelegramAdminRecord,
  TelegramAuditLogRecord,
  TelegramBotSettingsRecord,
  TelegramChannelRecord,
  TelegramPublicationRecord,
  TelegramUserRecord,
} from '../types';
import { TelegramLogger } from '../middlewares/logger';

export const ALLOWED_TELEGRAM_COLLECTIONS = [
  'telegramUsers',
  'telegramSettings',
  'telegramChannels',
  'telegramAdmins',
  'telegramPublications',
  'telegramAuditLogs',
  'telegramCustomEmojis',
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

/**
 * Wraps the server's generic Firestore helpers into a strictly least-privilege bridge
 * that blocks any non-telegram* collection at runtime.
 */
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
        return { success: false, error: 'Firestore bridge inactive (local store only)' };
      }
      return deps.serverWriteFirestoreDoc(safeCol, docId, data);
    },
    async deleteTelegramDoc(collectionName, docId) {
      const safeCol = assertAllowed(collectionName);
      if (!deps.serverDeleteFirestoreDoc) {
        return { success: false, error: 'Firestore bridge inactive (local store only)' };
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
      miniAppEnabled: false,
      aiAssistantEnabled: false,
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
        language: 'uz-Latn',
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      'muhiddinsahhofuz': {
        id: 'muhiddinsahhofuz',
        username: '@muhiddinsahhofuz',
        title: 'Muhiddin Sahhof — Ilmiy-Maʼrifiy Kanal',
        isPrimary: false,
        isActive: true,
        autoPublishPrayerTimes: false,
        autoPublishAnnouncements: false,
        language: 'uz-Latn',
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    },
    admins: {},
    publications: [],
    auditLogs: [],
    customEmojis: {},
  };
}

export class TelegramRepository {
  private readonly storePath: string;
  private readonly firestore?: ScopedFirestoreBridge;
  private readonly logger: TelegramLogger;
  private state: TelegramLocalStoreShape;

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
  ): Promise<void> {
    if (!this.firestore) return;
    try {
      const res = await this.firestore.writeTelegramDoc(collectionName, docId, payload);
      if (!res.success && res.error && !res.error.includes('local store only')) {
        this.logger.warn(`Firestore sync skipped for ${collectionName}/${docId}`, {
          error: res.error,
        });
      }
    } catch (err) {
      this.logger.warn(`Firestore sync exception for ${collectionName}/${docId}`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
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

  getStats() {
    return {
      usersCount: Object.keys(this.state.users).length,
      channelsCount: Object.keys(this.state.channels).length,
      adminsCount: Object.keys(this.state.admins).length,
      publicationsCount: this.state.publications.length,
      auditLogsCount: this.state.auditLogs.length,
      customEmojisStoredCount: Object.keys(this.state.customEmojis).length,
    };
  }
}
