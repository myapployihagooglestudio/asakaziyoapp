/**
 * ASAKA ZIYO — Unified Ecosystem Real-Time Sync Engine (Transactional Outbox + Queue + DLQ)
 *
 * Guarantees reliable, idempotent, restart-safe synchronization from Web App / Admin Panel
 * to Telegram Bot sections & subscribed users across all 5 official languages:
 *
 * - Transactional Outbox persisted to disk (`data/telegram_sync_outbox.json`) AND Firestore
 *   (`sync_outbox` + `sync_audit_logs`)
 * - Event states: `pending` -> `processing` -> `completed` | `failed` -> `dead_letter` (DLQ)
 * - Deterministic idempotency keys + SHA-256 content hash change detection
 * - Exponential backoff retries (2s, 4s, 8s, 16s, 32s) + manual Admin retry
 * - Automatic restart recovery (re-queues stuck `processing` and pending/due `failed` jobs)
 * - Localized 5-language notifications respecting `/stop` opt-out, blocked status, and category flags
 * - Inline deep-link / open-item button on every dispatched notification
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  TelegramInlineKeyboardMarkup,
  TelegramLocale,
  TelegramUserRecord,
} from '../types';
import { TelegramApiClient } from '../api/telegramApiClient';
import { TelegramRepository } from '../database/telegramRepository';
import { CustomEmojiRegistry } from '../emoji/customEmojiRegistry';
import { TelegramLogger } from '../middlewares/logger';
import { toNewUzbekAlphabet } from '../../src/utils/newUzbekAlphabet';

export type SyncEntityType =
  | 'article'
  | 'news'
  | 'announcement'
  | 'hadith'
  | 'dhikr'
  | 'audio'
  | 'video'
  | 'prayer_schedule'
  | 'quiz'
  | 'course'
  | 'app_release';

export type SyncActionType = 'created' | 'updated' | 'published' | 'archived' | 'restored';

export type SyncOutboxStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter';

export type SyncNotifyMode = 'section_only' | 'notify_only' | 'publish_and_notify' | 'scheduled';

export type SyncAudienceSegment =
  | 'all_opt_in'
  | 'active_7d'
  | 'prayer_subscribers'
  | 'announcement_subscribers'
  | 'wisdom_subscribers'
  | 'lang_uz-Latn'
  | 'lang_uz-Cyrl'
  | 'lang_uz-Latn-new'
  | 'lang_ru'
  | 'lang_en';

export interface SyncNotifyOptions {
  mode: SyncNotifyMode;
  segment?: SyncAudienceSegment;
  scheduledAt?: string;
  customMessageUz?: string;
  deepLinkCallback?: string;
  externalUrl?: string;
}

export interface SyncOutboxEvent {
  id: string;
  eventType: string;
  entityType: SyncEntityType;
  entityId: string;
  action: SyncActionType;
  version: number;
  idempotencyKey: string;
  contentHash: string;
  status: SyncOutboxStatus;
  attempts: number;
  maxAttempts: number;
  nextRetryAt?: string;
  lastError?: string;
  payload: {
    title: string;
    summary?: string;
    category?: string;
    url?: string;
    meta?: Record<string, string | number | boolean>;
  };
  notifyOptions: SyncNotifyOptions;
  recipientsNotified: number;
  recipientsSkipped: number;
  recipientsFailed: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface SyncAuditLogEntry {
  id: string;
  eventId: string;
  entityType: SyncEntityType;
  entityId: string;
  action: SyncActionType;
  status: string;
  recipientsNotified: number;
  deduplicated: boolean;
  error?: string;
  timestamp: string;
}

interface OutboxStoreShape {
  events: SyncOutboxEvent[];
  auditLogs: SyncAuditLogEntry[];
  lastContentHashByEntity: Record<string, { hash: string; version: number }>;
  deliveredKeys: string[];
  updatedAt: string;
}

export interface UnifiedSyncEngineOptions {
  storePath?: string;
  apiClient: TelegramApiClient;
  repository: TelegramRepository;
  emojiRegistry: CustomEmojiRegistry;
  logger: TelegramLogger;
  miniAppUrl?: string;
  botUsername?: string | null;
  serverWriteFirestoreDoc?: (
    collectionName: string,
    docId: string,
    data: Record<string, any>
  ) => Promise<{ success: boolean; error?: string }>;
  onPrayerScheduleSynced?: () => void;
  onContentSynced?: (event: SyncOutboxEvent) => void;
  retryBaseDelayMs?: number;
}

function sha256Short(input: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(input ?? {})).digest('hex');
}

const NOTIFICATION_HEADERS: Record<SyncEntityType, Record<Exclude<TelegramLocale, 'uz-Latn-new'>, string>> = {
  article: {
    'uz-Latn': '📰 Yangi maqola qoʻshildi!',
    'uz-Cyrl': '📰 Янги мақола қўшилди!',
    ru: '📰 Добавлена новая статья!',
    en: '📰 New Article Published!',
  },
  news: {
    'uz-Latn': '🌍 Yangi xabar joylandi!',
    'uz-Cyrl': '🌍 Янги хабар жойланди!',
    ru: '🌍 Опубликована новая новость!',
    en: '🌍 New Mosque News!',
  },
  announcement: {
    'uz-Latn': '📢 Yangi eʼlon joylandi!',
    'uz-Cyrl': '📢 Янги эълон жойланди!',
    ru: '📢 Новое объявление!',
    en: '📢 New Announcement!',
  },
  hadith: {
    'uz-Latn': '📚 Yangi sahih hadis joylandi!',
    'uz-Cyrl': '📚 Янги саҳиҳ ҳадис жойланди!',
    ru: '📚 Добавлен новый достоверный хадис!',
    en: '📚 New Authentic Hadith!',
  },
  dhikr: {
    'uz-Latn': '📿 Yangi zikr va duo qoʻshildi!',
    'uz-Cyrl': '📿 Янги зикр ва дуо қўшилди!',
    ru: '📿 Добавлен новый зикр и дуа!',
    en: '📿 New Dhikr & Dua Added!',
  },
  audio: {
    'uz-Latn': '🎧 Yangi audio material qoʻshildi!',
    'uz-Cyrl': '🎧 Янги аудио материал қўшилди!',
    ru: '🎧 Добавлен новый аудиоматериал!',
    en: '🎧 New Audio Track Added!',
  },
  video: {
    'uz-Latn': '🎬 Yangi video material qoʻshildi!',
    'uz-Cyrl': '🎬 Янги видео материал қўшилди!',
    ru: '🎬 Добавлен новый видеоматериал!',
    en: '🎬 New Video Added!',
  },
  prayer_schedule: {
    'uz-Latn': '🕌 Asaka namoz vaqtlari yangilandi!',
    'uz-Cyrl': '🕌 Асака намоз вақтлари янгиланди!',
    ru: '🕌 Обновлено расписание намазов Асаки!',
    en: '🕌 Official Asaka Prayer Times Updated!',
  },
  quiz: {
    'uz-Latn': '🧠 Yangi islomiy viktorina qoʻshildi!',
    'uz-Cyrl': '🧠 Янги исломий викторина қўшилди!',
    ru: '🧠 Добавлена новая исламская викторина!',
    en: '🧠 New Islamic Quiz Available!',
  },
  course: {
    'uz-Latn': '🎓 Taʼlim markaziga yangi dars qoʻshildi!',
    'uz-Cyrl': '🎓 Таълим марказига янги дарс қўшилди!',
    ru: '🎓 Добавлен новый урок в Академию!',
    en: '🎓 New Lesson Added to Academy!',
  },
  app_release: {
    'uz-Latn': '📱 ASAKA ZIYO Android ilovasining yangi versiyasi chiqdi!',
    'uz-Cyrl': '📱 ASAKA ZIYO Android иловасининг янги версияси чиқди!',
    ru: '📱 Вышла новая версия приложения ASAKA ZIYO для Android!',
    en: '📱 New ASAKA ZIYO Android App Update Available!',
  },
};

const OPEN_BUTTON_LABELS: Record<TelegramLocale, string> = {
  'uz-Latn': '🔎 Botda ochish',
  'uz-Cyrl': '🔎 Ботда очиш',
  'uz-Latn-new': '🔎 Botda oçiş',
  ru: '🔎 Открыть в боте',
  en: '🔎 Open in Bot',
};

const DEFAULT_CALLBACK_FOR_ENTITY: Record<SyncEntityType, string> = {
  article: 'library:view:articles:0',
  news: 'library:view:news:0',
  announcement: 'library:view:announcements:0',
  hadith: 'nav:hadith',
  dhikr: 'nav:dhikr',
  audio: 'library:view:audio:0',
  video: 'library:view:video:0',
  prayer_schedule: 'nav:prayer',
  quiz: 'quiz:start',
  course: 'nav:academy',
  app_release: 'nav:android_app',
};

export class UnifiedSyncEngine {
  private readonly storePath: string;
  private readonly apiClient: TelegramApiClient;
  private readonly repository: TelegramRepository;
  private readonly emojiRegistry: CustomEmojiRegistry;
  private readonly logger: TelegramLogger;
  private readonly miniAppUrl: string;
  private readonly serverWriteFirestoreDoc?: UnifiedSyncEngineOptions['serverWriteFirestoreDoc'];
  private readonly onPrayerScheduleSynced?: () => void;
  private readonly onContentSynced?: (event: SyncOutboxEvent) => void;
  private readonly retryBaseDelayMs: number;

  private store: OutboxStoreShape;
  private workerTimer: ReturnType<typeof setInterval> | null = null;
  private processingLock = false;

  constructor(options: UnifiedSyncEngineOptions) {
    this.storePath =
      options.storePath || path.resolve(process.cwd(), 'data', 'telegram_sync_outbox.json');
    this.apiClient = options.apiClient;
    this.repository = options.repository;
    this.emojiRegistry = options.emojiRegistry;
    this.logger = options.logger;
    this.miniAppUrl = options.miniAppUrl || 'https://asakaziyo.ai.studio/';
    this.serverWriteFirestoreDoc = options.serverWriteFirestoreDoc;
    this.onPrayerScheduleSynced = options.onPrayerScheduleSynced;
    this.onContentSynced = options.onContentSynced;
    this.retryBaseDelayMs = options.retryBaseDelayMs ?? 2000;
    this.store = this.loadStore();
  }

  private loadStore(): OutboxStoreShape {
    try {
      if (fs.existsSync(this.storePath)) {
        const parsed = JSON.parse(fs.readFileSync(this.storePath, 'utf-8'));
        return {
          events: Array.isArray(parsed.events) ? parsed.events : [],
          auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
          lastContentHashByEntity: parsed.lastContentHashByEntity || {},
          deliveredKeys: Array.isArray(parsed.deliveredKeys) ? parsed.deliveredKeys : [],
          updatedAt: parsed.updatedAt || new Date().toISOString(),
        };
      }
    } catch (err) {
      this.logger.warn('Failed loading sync outbox store; starting fresh', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
    return {
      events: [],
      auditLogs: [],
      lastContentHashByEntity: {},
      deliveredKeys: [],
      updatedAt: new Date().toISOString(),
    };
  }

  private persistStore(): void {
    try {
      const dir = path.dirname(this.storePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      if (this.store.events.length > 500) {
        this.store.events = this.store.events.slice(0, 500);
      }
      if (this.store.auditLogs.length > 1000) {
        this.store.auditLogs = this.store.auditLogs.slice(0, 1000);
      }
      if (this.store.deliveredKeys.length > 2000) {
        this.store.deliveredKeys = this.store.deliveredKeys.slice(-2000);
      }
      this.store.updatedAt = new Date().toISOString();
      const tmp = `${this.storePath}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.store, null, 2), 'utf-8');
      fs.renameSync(tmp, this.storePath);
    } catch (err) {
      this.logger.error('Failed persisting sync outbox store', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private async persistEventToFirestore(event: SyncOutboxEvent): Promise<void> {
    if (!this.serverWriteFirestoreDoc) return;
    await this.serverWriteFirestoreDoc('sync_outbox', event.id, {
      id: event.id,
      eventType: event.eventType,
      entityType: event.entityType,
      entityId: event.entityId,
      action: event.action,
      version: event.version,
      idempotencyKey: event.idempotencyKey,
      contentHash: event.contentHash,
      status: event.status,
      attempts: event.attempts,
      maxAttempts: event.maxAttempts,
      lastError: event.lastError || '',
      recipientsNotified: event.recipientsNotified,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    }).catch(() => {});
  }

  private async appendAuditLog(entry: Omit<SyncAuditLogEntry, 'id' | 'timestamp'>): Promise<SyncAuditLogEntry> {
    const full: SyncAuditLogEntry = {
      ...entry,
      id: `sync_log_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`,
      timestamp: new Date().toISOString(),
    };
    this.store.auditLogs.unshift(full);
    this.persistStore();
    if (this.serverWriteFirestoreDoc) {
      await this.serverWriteFirestoreDoc('sync_audit_logs', full.id, {
        id: full.id,
        eventId: full.eventId,
        entityType: full.entityType,
        entityId: full.entityId,
        status: full.status,
        recipientsNotified: full.recipientsNotified,
        deduplicated: full.deduplicated,
        error: full.error || '',
        timestamp: full.timestamp,
      }).catch(() => {});
    }
    return full;
  }

  /**
   * Starts the background outbox worker and immediately recovers any interrupted
   * `processing` or pending jobs from disk (restart resilience).
   */
  startWorker(intervalMs = 5000): void {
    this.recoverInterruptedJobs();
    if (this.workerTimer) return;
    this.workerTimer = setInterval(() => {
      void this.processDueEvents().catch(() => {});
    }, intervalMs);
  }

  stopWorker(): void {
    if (this.workerTimer) {
      clearInterval(this.workerTimer);
      this.workerTimer = null;
    }
  }

  /**
   * Recovers any jobs that were mid-flight (`processing`) when the server stopped.
   */
  recoverInterruptedJobs(): number {
    let recovered = 0;
    const nowIso = new Date().toISOString();
    for (const ev of this.store.events) {
      if (ev.status === 'processing') {
        ev.status = 'pending';
        ev.nextRetryAt = nowIso;
        ev.updatedAt = nowIso;
        recovered++;
      }
    }
    if (recovered > 0) {
      this.persistStore();
      this.logger.info('Recovered interrupted sync outbox jobs on startup', { recovered });
    }
    return recovered;
  }

  /**
   * Enqueues a content mutation into the transactional outbox with deterministic idempotency.
   */
  async enqueueContentEvent(input: {
    entityType: SyncEntityType;
    entityId: string;
    action: SyncActionType;
    payload: SyncOutboxEvent['payload'];
    notifyOptions?: Partial<SyncNotifyOptions>;
    idempotencyKey?: string;
    createdBy?: string;
    processImmediately?: boolean;
  }): Promise<{ event: SyncOutboxEvent; deduplicated: boolean }> {
    const entityKey = `${input.entityType}:${input.entityId}`;
    const contentHash = sha256Short({
      action: input.action,
      payload: input.payload,
      notifyMode: input.notifyOptions?.mode || 'section_only',
    });
    const prevTracker = this.store.lastContentHashByEntity[entityKey];
    const isSameHash = prevTracker && prevTracker.hash === contentHash;
    const version = isSameHash ? prevTracker.version : (prevTracker?.version || 0) + 1;

    const idempotencyKey =
      input.idempotencyKey ||
      `${input.entityType}:${input.entityId}:${input.action}:v${version}:${contentHash.slice(0, 12)}`;

    // Deduplication check (idempotency guard against double-submits & duplicate alerts)
    const existing = this.store.events.find((e) => e.idempotencyKey === idempotencyKey);
    if (existing || this.store.deliveredKeys.includes(idempotencyKey)) {
      const target = existing || this.store.events[0];
      await this.appendAuditLog({
        eventId: target?.id || idempotencyKey,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        status: 'deduplicated',
        recipientsNotified: 0,
        deduplicated: true,
      });
      return { event: existing!, deduplicated: true };
    }

    const nowIso = new Date().toISOString();
    const mode: SyncNotifyMode = input.notifyOptions?.mode || 'section_only';
    const event: SyncOutboxEvent = {
      id: `sync_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`,
      eventType: `${input.entityType}.${input.action}`,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      version,
      idempotencyKey,
      contentHash,
      status: 'pending',
      attempts: 0,
      maxAttempts: 5,
      nextRetryAt:
        mode === 'scheduled' && input.notifyOptions?.scheduledAt
          ? input.notifyOptions.scheduledAt
          : nowIso,
      payload: input.payload,
      notifyOptions: {
        mode,
        segment: input.notifyOptions?.segment || 'all_opt_in',
        scheduledAt: input.notifyOptions?.scheduledAt,
        customMessageUz: input.notifyOptions?.customMessageUz,
        deepLinkCallback:
          input.notifyOptions?.deepLinkCallback || DEFAULT_CALLBACK_FOR_ENTITY[input.entityType],
        externalUrl: input.notifyOptions?.externalUrl,
      },
      recipientsNotified: 0,
      recipientsSkipped: 0,
      recipientsFailed: 0,
      createdBy: input.createdBy || 'admin',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.store.lastContentHashByEntity[entityKey] = { hash: contentHash, version };
    this.store.events.unshift(event);
    this.persistStore();
    await this.persistEventToFirestore(event);

    if (input.processImmediately !== false && mode !== 'scheduled') {
      await this.processEventById(event.id);
    }

    return { event, deduplicated: false };
  }

  /**
   * Filters eligible Telegram users respecting `/stop`, blocked status, and segment/opt-in flags.
   */
  resolveTargetUsers(entityType: SyncEntityType, segment: SyncAudienceSegment): TelegramUserRecord[] {
    const all = this.repository.listUsers();
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 3600_000;

    return all.filter((u) => {
      // Strict consent & block enforcement
      if (u.isBlocked || u.stoppedByUser) return false;

      // Respect category-specific opt-out toggles
      if (entityType === 'prayer_schedule' && !u.prayerNotificationsEnabled) return false;
      if (
        (entityType === 'announcement' ||
          entityType === 'news' ||
          entityType === 'article' ||
          entityType === 'audio' ||
          entityType === 'video' ||
          entityType === 'app_release') &&
        !u.announcementsEnabled
      ) {
        return false;
      }
      if ((entityType === 'hadith' || entityType === 'dhikr') && !u.dailyWisdomEnabled) {
        return false;
      }

      switch (segment) {
        case 'active_7d':
          return now - Date.parse(u.lastActiveAt || u.updatedAt || '') <= sevenDaysMs;
        case 'prayer_subscribers':
          return u.prayerNotificationsEnabled;
        case 'announcement_subscribers':
          return u.announcementsEnabled;
        case 'wisdom_subscribers':
          return u.dailyWisdomEnabled;
        case 'lang_uz-Latn':
          return u.language === 'uz-Latn';
        case 'lang_uz-Cyrl':
          return u.language === 'uz-Cyrl';
        case 'lang_uz-Latn-new':
          return u.language === 'uz-Latn-new';
        case 'lang_ru':
          return u.language === 'ru';
        case 'lang_en':
          return u.language === 'en';
        case 'all_opt_in':
        default:
          return true;
      }
    });
  }

  /**
   * Formats a localized notification message in the exact user language across all 5 locales.
   * Never transliterates Arabic script.
   */
  formatLocalizedNotification(event: SyncOutboxEvent, locale: TelegramLocale): {
    text: string;
    entities: ReturnType<CustomEmojiRegistry['formatMessage']>['entities'];
    reply_markup: TelegramInlineKeyboardMarkup;
  } {
    const headerBase =
      locale === 'uz-Latn-new'
        ? toNewUzbekAlphabet(NOTIFICATION_HEADERS[event.entityType]['uz-Latn'])
        : NOTIFICATION_HEADERS[event.entityType][locale] ||
          NOTIFICATION_HEADERS[event.entityType]['uz-Latn'];

    const rawTitle = event.payload.title || '';
    const rawSummary = event.notifyOptions.customMessageUz || event.payload.summary || '';

    const adaptUserText = (s: string) =>
      locale === 'uz-Latn-new' ? toNewUzbekAlphabet(s) : s;

    const lines = [headerBase, '', `📌 ${adaptUserText(rawTitle)}`];
    if (rawSummary) {
      lines.push('', adaptUserText(rawSummary).slice(0, 500));
    }

    const formatted = this.emojiRegistry.formatMessage(lines.join('\n'));

    const row: TelegramInlineKeyboardMarkup['inline_keyboard'][number] = [
      {
        text: OPEN_BUTTON_LABELS[locale] || OPEN_BUTTON_LABELS['uz-Latn'],
        callback_data:
          event.notifyOptions.deepLinkCallback || DEFAULT_CALLBACK_FOR_ENTITY[event.entityType],
      },
    ];
    if (event.notifyOptions.externalUrl && event.notifyOptions.externalUrl.startsWith('https://')) {
      row.push({
        text: locale === 'ru' ? '🌐 Открыть' : locale === 'en' ? '🌐 Open' : '🌐 Ochish',
        url: event.notifyOptions.externalUrl,
      });
    } else if (this.miniAppUrl.startsWith('https://')) {
      row.push({
        text: '🌐 Web App',
        web_app: { url: this.miniAppUrl },
      });
    }

    return {
      text: formatted.text,
      entities: formatted.entities,
      reply_markup: { inline_keyboard: [row] },
    };
  }

  async processDueEvents(): Promise<{ processed: number; completed: number; failed: number }> {
    if (this.processingLock) return { processed: 0, completed: 0, failed: 0 };
    this.processingLock = true;
    let processed = 0;
    let completed = 0;
    let failed = 0;

    try {
      const now = Date.now();
      const due = this.store.events.filter((ev) => {
        if (ev.status !== 'pending' && ev.status !== 'failed') return false;
        if (ev.nextRetryAt && Date.parse(ev.nextRetryAt) > now) return false;
        return true;
      });

      for (const ev of due) {
        const ok = await this.processEventById(ev.id);
        processed++;
        if (ok) completed++;
        else failed++;
      }
    } finally {
      this.processingLock = false;
    }

    return { processed, completed, failed };
  }

  async processEventById(eventId: string): Promise<boolean> {
    const ev = this.store.events.find((e) => e.id === eventId);
    if (!ev || ev.status === 'completed') return true;

    ev.status = 'processing';
    ev.attempts += 1;
    ev.updatedAt = new Date().toISOString();
    this.persistStore();

    try {
      // 1. Trigger in-process synchronization hooks (cache refresh / prayer rescheduling)
      if (ev.entityType === 'prayer_schedule') {
        this.onPrayerScheduleSynced?.();
      }
      this.onContentSynced?.(ev);

      // 2. Dispatch user notifications when mode allows it and item is not archived
      const shouldNotify =
        ev.action !== 'archived' &&
        (ev.notifyOptions.mode === 'notify_only' ||
          ev.notifyOptions.mode === 'publish_and_notify' ||
          ev.notifyOptions.mode === 'scheduled');

      if (shouldNotify) {
        const targets = this.resolveTargetUsers(
          ev.entityType,
          ev.notifyOptions.segment || 'all_opt_in'
        );

        let sent = 0;
        let failedCount = 0;
        let fatalTransportError: string | null = null;

        for (const user of targets) {
          const msg = this.formatLocalizedNotification(ev, user.language);
          const res = await this.apiClient.sendMessage({
            chat_id: user.telegramId,
            text: msg.text,
            ...(msg.entities.length > 0 ? { entities: msg.entities } : {}),
            reply_markup: msg.reply_markup,
            disable_web_page_preview: true,
          });

          if (res.ok) {
            sent++;
          } else if (res.error_code === 403) {
            // User blocked the bot — respect Telegram policy and mark user blocked
            await this.repository.saveUser({ ...user, isBlocked: true, updatedAt: new Date().toISOString() });
            ev.recipientsSkipped += 1;
          } else {
            failedCount++;
            fatalTransportError = res.description || `HTTP ${res.error_code || 'error'}`;
          }
        }

        ev.recipientsNotified += sent;
        ev.recipientsFailed += failedCount;

        // If all targeted deliveries failed due to transport error, retry via backoff
        if (targets.length > 0 && sent === 0 && failedCount > 0 && fatalTransportError) {
          throw new Error(fatalTransportError);
        }
      }

      ev.status = 'completed';
      ev.completedAt = new Date().toISOString();
      ev.updatedAt = ev.completedAt;
      ev.lastError = undefined;
      if (!this.store.deliveredKeys.includes(ev.idempotencyKey)) {
        this.store.deliveredKeys.push(ev.idempotencyKey);
      }
      this.persistStore();
      await this.persistEventToFirestore(ev);
      await this.appendAuditLog({
        eventId: ev.id,
        entityType: ev.entityType,
        entityId: ev.entityId,
        action: ev.action,
        status: 'completed',
        recipientsNotified: ev.recipientsNotified,
        deduplicated: false,
      });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      ev.lastError = msg;
      ev.updatedAt = new Date().toISOString();
      if (ev.attempts >= ev.maxAttempts) {
        ev.status = 'dead_letter';
        ev.nextRetryAt = undefined;
      } else {
        ev.status = 'failed';
        const delayMs = this.retryBaseDelayMs * Math.pow(2, ev.attempts - 1);
        ev.nextRetryAt = new Date(Date.now() + delayMs).toISOString();
      }
      this.persistStore();
      await this.persistEventToFirestore(ev);
      await this.appendAuditLog({
        eventId: ev.id,
        entityType: ev.entityType,
        entityId: ev.entityId,
        action: ev.action,
        status: ev.status,
        recipientsNotified: ev.recipientsNotified,
        deduplicated: false,
        error: msg,
      });
      return false;
    }
  }

  async retryEvent(eventId: string): Promise<{ ok: boolean; event: SyncOutboxEvent | null }> {
    const ev = this.store.events.find((e) => e.id === eventId);
    if (!ev) return { ok: false, event: null };
    ev.status = 'pending';
    ev.attempts = Math.min(ev.attempts, ev.maxAttempts - 1);
    ev.nextRetryAt = new Date().toISOString();
    ev.updatedAt = new Date().toISOString();
    this.persistStore();
    const ok = await this.processEventById(ev.id);
    return { ok, event: ev };
  }

  async retryAllFailed(): Promise<{ retried: number; succeeded: number }> {
    const candidates = this.store.events.filter(
      (e) => e.status === 'failed' || e.status === 'dead_letter'
    );
    let succeeded = 0;
    for (const ev of candidates) {
      const res = await this.retryEvent(ev.id);
      if (res.ok) succeeded++;
    }
    return { retried: candidates.length, succeeded };
  }

  getStatusSummary() {
    const events = this.store.events;
    return {
      totalEvents: events.length,
      pending: events.filter((e) => e.status === 'pending').length,
      processing: events.filter((e) => e.status === 'processing').length,
      completed: events.filter((e) => e.status === 'completed').length,
      failed: events.filter((e) => e.status === 'failed').length,
      deadLetter: events.filter((e) => e.status === 'dead_letter').length,
      totalRecipientsNotified: events.reduce((acc, e) => acc + (e.recipientsNotified || 0), 0),
      recentEvents: events.slice(0, 30),
      recentAuditLogs: this.store.auditLogs.slice(0, 40),
      updatedAt: this.store.updatedAt,
    };
  }
}
