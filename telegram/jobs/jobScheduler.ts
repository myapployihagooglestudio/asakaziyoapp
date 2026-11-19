/**
 * ASAKA ZIYO — Isolated Telegram Polling & Super Platform Job Scheduler
 *
 * Manages:
 * 1. Long-polling loop with explicit diagnostics, 401/409 handling, and backoff.
 * 2. Scheduled 60-second Asia/Tashkent job ticks:
 *    - Personal Azan reminders (honoring `stoppedByUser` & `prayerNotificationsEnabled`)
 *    - 05:00 Asia/Tashkent daily channel prayer timetable auto-publishing
 *    - Read-only prayer schedule change detection -> optional channel notification
 *    - Due scheduled Content Studio drafts -> idempotent channel publishing
 *    - Due scheduled Broadcast campaigns -> safe segmented dispatch
 *    - 07:30 Asia/Tashkent daily Islamic wisdom (hadith) for opted-in users
 */

import { TelegramApiUpdate } from '../types';
import { TelegramApiClient } from '../api/telegramApiClient';
import { TelegramLogger } from '../middlewares/logger';
import { TelegramPrayerAdapter, getTashkentNowParts } from '../prayer/prayerAdapter';
import { TelegramRepository } from '../database/telegramRepository';
import { CustomEmojiRegistry } from '../emoji/customEmojiRegistry';
import { TelegramPublishingService } from '../publishing/publishingService';
import { TelegramContentStudio } from '../content/contentStudio';
import { TelegramBroadcastManager } from '../broadcast/broadcastManager';
import { TelegramIslamicContentAdapter } from '../content/islamicContentAdapter';

export interface TelegramPollingStatus {
  pollingActive: boolean;
  schedulerActive: boolean;
  lastPollAt: string | null;
  lastSuccessfulPollAt: string | null;
  lastUpdateAt: string | null;
  updatesProcessedCount: number;
  azanRemindersDispatched: number;
  autoChannelPostsDispatched: number;
  scheduledDraftsDispatched: number;
  scheduledBroadcastsDispatched: number;
  dailyWisdomDispatched: number;
  scheduleChangePostsDispatched: number;
  consecutiveErrors: number;
  lastError: string | null;
  lastErrorCode: number | null;
  lastErrorAt: string | null;
}

export interface ScheduledTickTelemetry {
  azanSent: number;
  channelPostsSent: number;
  scheduledDraftsSent: number;
  scheduledBroadcastsRun: number;
  wisdomSent: number;
  scheduleChangePostsSent: number;
}

export class TelegramJobScheduler {
  private readonly apiClient: TelegramApiClient;
  private readonly onUpdate: (update: TelegramApiUpdate) => Promise<unknown>;
  private readonly logger: TelegramLogger;
  private readonly prayerAdapter?: TelegramPrayerAdapter;
  private readonly repository?: TelegramRepository;
  private readonly emojiRegistry?: CustomEmojiRegistry;
  private readonly publishingService?: TelegramPublishingService;
  private readonly contentStudio?: TelegramContentStudio;
  private readonly broadcastManager?: TelegramBroadcastManager;
  private readonly contentAdapter?: TelegramIslamicContentAdapter;

  private pollingActive = false;
  private schedulerActive = false;
  private offset: number | undefined;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private scheduleInterval: ReturnType<typeof setInterval> | null = null;

  private readonly dispatchedAzanKeys = new Set<string>();
  private readonly dispatchedDailyChannelKeys = new Set<string>();
  private readonly dispatchedDailyWisdomKeys = new Set<string>();

  private lastPollAt: string | null = null;
  private lastSuccessfulPollAt: string | null = null;
  private lastUpdateAt: string | null = null;
  private updatesProcessedCount = 0;
  private azanRemindersDispatched = 0;
  private autoChannelPostsDispatched = 0;
  private scheduledDraftsDispatched = 0;
  private scheduledBroadcastsDispatched = 0;
  private dailyWisdomDispatched = 0;
  private scheduleChangePostsDispatched = 0;
  private consecutiveErrors = 0;
  private lastError: string | null = null;
  private lastErrorCode: number | null = null;
  private lastErrorAt: string | null = null;

  constructor(options: {
    apiClient: TelegramApiClient;
    onUpdate: (update: TelegramApiUpdate) => Promise<unknown>;
    logger: TelegramLogger;
    prayerAdapter?: TelegramPrayerAdapter;
    repository?: TelegramRepository;
    emojiRegistry?: CustomEmojiRegistry;
    publishingService?: TelegramPublishingService;
    contentStudio?: TelegramContentStudio;
    broadcastManager?: TelegramBroadcastManager;
    contentAdapter?: TelegramIslamicContentAdapter;
  }) {
    this.apiClient = options.apiClient;
    this.onUpdate = options.onUpdate;
    this.logger = options.logger;
    this.prayerAdapter = options.prayerAdapter;
    this.repository = options.repository;
    this.emojiRegistry = options.emojiRegistry;
    this.publishingService = options.publishingService;
    this.contentStudio = options.contentStudio;
    this.broadcastManager = options.broadcastManager;
    this.contentAdapter = options.contentAdapter;
  }

  isPolling(): boolean {
    return this.pollingActive;
  }

  getPollingStatus(): TelegramPollingStatus {
    return {
      pollingActive: this.pollingActive,
      schedulerActive: this.schedulerActive,
      lastPollAt: this.lastPollAt,
      lastSuccessfulPollAt: this.lastSuccessfulPollAt,
      lastUpdateAt: this.lastUpdateAt,
      updatesProcessedCount: this.updatesProcessedCount,
      azanRemindersDispatched: this.azanRemindersDispatched,
      autoChannelPostsDispatched: this.autoChannelPostsDispatched,
      scheduledDraftsDispatched: this.scheduledDraftsDispatched,
      scheduledBroadcastsDispatched: this.scheduledBroadcastsDispatched,
      dailyWisdomDispatched: this.dailyWisdomDispatched,
      scheduleChangePostsDispatched: this.scheduleChangePostsDispatched,
      consecutiveErrors: this.consecutiveErrors,
      lastError: this.lastError,
      lastErrorCode: this.lastErrorCode,
      lastErrorAt: this.lastErrorAt,
    };
  }

  startPolling(): void {
    if (this.pollingActive) return;
    if (!this.apiClient.isConfigured) {
      this.lastError = 'Cannot start polling: TELEGRAM_BOT_TOKEN1 is not configured.';
      this.lastErrorAt = new Date().toISOString();
      this.logger.warn(this.lastError);
      return;
    }
    this.pollingActive = true;
    this.consecutiveErrors = 0;
    this.logger.info('Telegram polling loop started');
    this.scheduleNextPoll(150);
  }

  stopPolling(): void {
    this.pollingActive = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.logger.info('Telegram polling loop stopped');
  }

  startScheduledJobs(): void {
    if (this.schedulerActive || !this.apiClient.isConfigured) return;
    this.schedulerActive = true;
    this.scheduleInterval = setInterval(() => {
      this.runScheduledTick(new Date()).catch((err) => {
        this.logger.error('Telegram scheduled job tick error', {
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }, 60_000);
    this.logger.info('Telegram Super Platform scheduler started (60s interval)');
  }

  stopScheduledJobs(): void {
    this.schedulerActive = false;
    if (this.scheduleInterval) {
      clearInterval(this.scheduleInterval);
      this.scheduleInterval = null;
    }
  }

  /**
   * Executes one deterministic scheduler tick (callable directly in automated tests).
   */
  async runScheduledTick(now: Date = new Date()): Promise<ScheduledTickTelemetry> {
    let azanSent = 0;
    let channelPostsSent = 0;
    let scheduledDraftsSent = 0;
    let scheduledBroadcastsRun = 0;
    let wisdomSent = 0;
    let scheduleChangePostsSent = 0;

    if (!this.apiClient.isConfigured || !this.prayerAdapter || !this.repository || !this.emojiRegistry) {
      return {
        azanSent,
        channelPostsSent,
        scheduledDraftsSent,
        scheduledBroadcastsRun,
        wisdomSent,
        scheduleChangePostsSent,
      };
    }

    // 1. Personal Azan reminders (strictly honors !isBlocked && !stoppedByUser && prayerNotificationsEnabled)
    const duePrayer = this.prayerAdapter.getDueAzanPrayerAt(now);
    if (duePrayer) {
      const dedupeKey = `${duePrayer.dateKey}:${duePrayer.key}`;
      if (!this.dispatchedAzanKeys.has(dedupeKey)) {
        this.dispatchedAzanKeys.add(dedupeKey);
        const subscribers = this.repository
          .listUsers()
          .filter((u) => !u.isBlocked && !u.stoppedByUser && u.prayerNotificationsEnabled);

        for (const sub of subscribers) {
          const formatted = this.prayerAdapter.formatAzanReminderMessage(
            duePrayer.key,
            duePrayer.time,
            sub.language,
            this.emojiRegistry
          );
          const res = await this.apiClient.sendMessage({
            chat_id: sub.telegramId,
            text: formatted.text,
            ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
          });
          if (res.ok) {
            azanSent++;
            this.azanRemindersDispatched++;
          } else if (res.error_code === 403) {
            await this.repository.saveUser({
              ...sub,
              isBlocked: true,
              announcementsEnabled: false,
              prayerNotificationsEnabled: false,
              dailyWisdomEnabled: false,
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    const parts = getTashkentNowParts(now);

    // 2. Daily automatic prayer timetable broadcast at 05:00 Asia/Tashkent
    if (parts.hhmm === '05:00' && this.publishingService) {
      const autoChannels = this.repository
        .listChannels()
        .filter((c) => c.isActive && c.autoPublishPrayerTimes);

      for (const ch of autoChannels) {
        const chKey = `${parts.dateKey}:${ch.id}`;
        if (this.dispatchedDailyChannelKeys.has(chKey)) continue;
        this.dispatchedDailyChannelKeys.add(chKey);

        const pub = await this.publishingService.publishPrayerScheduleToChannel({
          channelId: ch.id,
          prayerAdapter: this.prayerAdapter,
          createdBy: 'scheduler',
        });
        if (pub.success) {
          channelPostsSent++;
          this.autoChannelPostsDispatched++;
        }
      }
    }

    // 3. Prayer schedule change detection -> notify channels with autoPublishPrayerTimes
    if (this.publishingService && this.prayerAdapter.hasScheduleChangedSinceLastCheck()) {
      const autoChannels = this.repository
        .listChannels()
        .filter((c) => c.isActive && c.autoPublishPrayerTimes);
      for (const ch of autoChannels) {
        const pub = await this.publishingService.publishPrayerScheduleToChannel({
          channelId: ch.id,
          prayerAdapter: this.prayerAdapter,
          createdBy: 'schedule_change_hook',
        });
        if (pub.success) {
          scheduleChangePostsSent++;
          this.scheduleChangePostsDispatched++;
        }
      }
    }

    // 4. Content Studio due scheduled drafts
    if (this.contentStudio) {
      scheduledDraftsSent = await this.contentStudio.processDueScheduledDrafts(now);
      this.scheduledDraftsDispatched += scheduledDraftsSent;
    }

    // 5. Broadcast Manager due scheduled campaigns
    if (this.broadcastManager) {
      const nowMs = now.getTime();
      const dueCampaigns = this.repository
        .listBroadcasts()
        .filter(
          (bc) =>
            bc.status === 'scheduled' &&
            Boolean(bc.scheduledAt) &&
            Date.parse(bc.scheduledAt!) <= nowMs
        );
      for (const bc of dueCampaigns) {
        const runRes = await this.broadcastManager.runCampaign(bc.id, 'scheduler');
        if (runRes && (runRes.status === 'completed' || runRes.sentCount > 0)) {
          scheduledBroadcastsRun++;
          this.scheduledBroadcastsDispatched++;
        }
      }
    }

    // 6. Daily Islamic Wisdom at 07:30 Asia/Tashkent (deduped per day)
    if (parts.hhmm === '07:30' && this.contentAdapter) {
      const wisdomKey = `${parts.dateKey}:wisdom`;
      if (!this.dispatchedDailyWisdomKeys.has(wisdomKey)) {
        this.dispatchedDailyWisdomKeys.add(wisdomKey);
        const dayIndex = Math.floor(now.getTime() / 86_400_000);
        const wisdomSubs = this.repository
          .listUsers()
          .filter((u) => !u.isBlocked && !u.stoppedByUser && u.dailyWisdomEnabled);

        for (const sub of wisdomSubs) {
          const hadith = this.contentAdapter.formatHadithCard(
            dayIndex,
            sub.language,
            this.emojiRegistry
          );
          const res = await this.apiClient.sendMessage({
            chat_id: sub.telegramId,
            text: hadith.formatted.text,
            ...(hadith.formatted.entities.length > 0 ? { entities: hadith.formatted.entities } : {}),
          });
          if (res.ok) {
            wisdomSent++;
            this.dailyWisdomDispatched++;
          }
        }
      }
    }

    return {
      azanSent,
      channelPostsSent,
      scheduledDraftsSent,
      scheduledBroadcastsRun,
      wisdomSent,
      scheduleChangePostsSent,
    };
  }

  private scheduleNextPoll(delayMs: number): void {
    if (!this.pollingActive) return;
    this.timer = setTimeout(() => {
      this.pollOnce().catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.consecutiveErrors++;
        this.lastError = msg;
        this.lastErrorCode = null;
        this.lastErrorAt = new Date().toISOString();
        this.logger.error('Telegram polling tick exception', {
          error: msg,
          consecutiveErrors: this.consecutiveErrors,
        });
        const backoffMs = Math.min(30_000, 3_000 * this.consecutiveErrors);
        this.scheduleNextPoll(backoffMs);
      });
    }, delayMs);
  }

  private async pollOnce(): Promise<void> {
    if (!this.pollingActive) return;
    this.lastPollAt = new Date().toISOString();
    const res = await this.apiClient.getUpdates(this.offset, 10);

    if (res.ok && Array.isArray(res.result)) {
      this.lastSuccessfulPollAt = new Date().toISOString();
      this.consecutiveErrors = 0;
      this.lastError = null;
      this.lastErrorCode = null;

      for (const update of res.result) {
        this.offset = update.update_id + 1;
        this.lastUpdateAt = new Date().toISOString();
        this.updatesProcessedCount++;
        await this.onUpdate(update);
      }
      this.scheduleNextPoll(250);
      return;
    }

    this.consecutiveErrors++;
    this.lastErrorCode = res.error_code ?? null;
    this.lastError = res.description || 'Telegram getUpdates failed with unknown error';
    this.lastErrorAt = new Date().toISOString();

    if (res.error_code === 401) {
      this.logger.error(
        'Telegram polling stopped: 401 Unauthorized — TELEGRAM_BOT_TOKEN1 is invalid or revoked.',
        { errorCode: 401 }
      );
      this.stopPolling();
      return;
    }

    if (res.error_code === 409) {
      this.logger.error(
        'Telegram polling 409 Conflict: another bot instance is polling or a webhook is active for this token.',
        { errorCode: 409, description: this.lastError }
      );
    } else if (this.consecutiveErrors <= 3 || this.consecutiveErrors % 10 === 0) {
      this.logger.error('Telegram getUpdates failed', {
        errorCode: this.lastErrorCode,
        description: this.lastError,
        consecutiveErrors: this.consecutiveErrors,
      });
    }

    const backoffMs = Math.min(30_000, 5_000 * Math.min(this.consecutiveErrors, 6));
    this.scheduleNextPoll(backoffMs);
  }
}
