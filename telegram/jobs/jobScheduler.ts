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

import { TelegramApiUpdate, TelegramNotificationDispatchRecord, TelegramPrayerNotificationKey } from '../types';
import { TelegramApiClient } from '../api/telegramApiClient';
import { TelegramLogger } from '../middlewares/logger';
import { TelegramPrayerAdapter, getTashkentNowParts } from '../prayer/prayerAdapter';
import { TelegramRepository } from '../database/telegramRepository';
import { CustomEmojiRegistry } from '../emoji/customEmojiRegistry';
import { TelegramPublishingService } from '../publishing/publishingService';
import { TelegramContentStudio } from '../content/contentStudio';
import { TelegramBroadcastManager } from '../broadcast/broadcastManager';
import { TelegramIslamicContentAdapter } from '../content/islamicContentAdapter';
import { TelegramUserService } from '../services/userService';
import { TelegramHifzService } from '../hifz/hifzService';
import { AppReleaseService } from '../services/appReleaseService';
import { isWithinQuietHours } from '../services/qiblaHijriService';
import { getUserDisplayFirstName } from '../services/profileValidation';
import { ADHAN_TRACKS } from '../../src/data/adhanTracksData';

function parseHHMMToMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function resolveAdhanTrack(trackId?: string) {
  if (!trackId || trackId === 'none') return null;
  const exact = ADHAN_TRACKS.find((t) => t.id === trackId);
  if (exact) return exact;
  const lower = trackId.toLowerCase();
  return (
    ADHAN_TRACKS.find(
      (t) =>
        t.id.toLowerCase().includes(lower) ||
        t.titleUz.toLowerCase().includes(lower) ||
        t.muezzinUz.toLowerCase().includes(lower)
    ) || ADHAN_TRACKS[0] || null
  );
}

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
  conflictCount: number;
  lastConflictAt: string | null;
  multiInstanceConflictDetected: boolean;
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
  hifzRemindersSent: number;
  apkUpdateAlertsSent: number;
  personalRemindersSent: number;
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
  private readonly userService?: TelegramUserService;
  private readonly hifzService?: TelegramHifzService;
  private readonly appReleaseService?: AppReleaseService;

  private pollingActive = false;
  private schedulerActive = false;
  private offset: number | undefined;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private scheduleInterval: ReturnType<typeof setInterval> | null = null;

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
  private hifzRemindersDispatched = 0;
  private consecutiveErrors = 0;
  private conflictYieldCount = 0;
  private totalConflictCount = 0;
  private lastConflictAt: string | null = null;
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
    userService?: TelegramUserService;
    hifzService?: TelegramHifzService;
    appReleaseService?: AppReleaseService;
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
    this.userService = options.userService;
    this.hifzService = options.hifzService;
    this.appReleaseService = options.appReleaseService;
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
      conflictCount: this.totalConflictCount,
      lastConflictAt: this.lastConflictAt,
      multiInstanceConflictDetected: this.totalConflictCount > 0,
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
    let hifzRemindersSent = 0;
    let apkUpdateAlertsSent = 0;
    let personalRemindersSent = 0;

    if (!this.apiClient.isConfigured || !this.prayerAdapter || !this.repository || !this.emojiRegistry) {
      return {
        azanSent,
        channelPostsSent,
        scheduledDraftsSent,
        scheduledBroadcastsRun,
        wisdomSent,
        scheduleChangePostsSent,
        hifzRemindersSent,
        apkUpdateAlertsSent,
        personalRemindersSent,
      };
    }

    const parts = getTashkentNowParts(now);
    const nowMin = parseHHMMToMinutes(parts.hhmm);

    // 1. Personal Azan & Pre-Prayer Lead-Time Reminders (30/15/10/5/0 + custom min, Quiet Hours, Adhan audio, persistent dedupe & dispatch log)
    const todaySchedule = this.prayerAdapter.getCurrentSchedule();
    const getPrayerTime = (k: string): string =>
      todaySchedule.times.find((t) => t.key === k)?.time || '';
    const bomdodTime = getPrayerTime('bomdod');
    const peshinTime = getPrayerTime('peshin');
    const asrTime = getPrayerTime('asr');
    const shomTime = getPrayerTime('shom');
    const xuftonTime = getPrayerTime('xufton');
    const tahajjudTime = getPrayerTime('tahajjud');
    const subhTime = getPrayerTime('subh');
    const prayerSlots: Array<{ key: TelegramPrayerNotificationKey; time: string }> = [
      ...(tahajjudTime ? [{ key: 'tahajjud' as const, time: tahajjudTime }] : []),
      ...(subhTime ? [{ key: 'subh' as const, time: subhTime }] : []),
      ...(bomdodTime ? [{ key: 'bomdod' as const, time: bomdodTime }] : []),
      ...(peshinTime ? [{ key: 'peshin' as const, time: peshinTime }] : []),
      ...(asrTime ? [{ key: 'asr' as const, time: asrTime }] : []),
      ...(shomTime ? [{ key: 'shom' as const, time: shomTime }] : []),
      ...(xuftonTime ? [{ key: 'xufton' as const, time: xuftonTime }] : []),
    ];
    // Add Juma slot on Fridays aligned with Peshin
    const tashkentWeekday = new Date(now.getTime() + 5 * 3600_000).getUTCDay();
    if (tashkentWeekday === 5 && peshinTime) {
      prayerSlots.push({ key: 'juma', time: peshinTime });
    }

    if (nowMin !== null) {
      const subscribers = this.repository
        .listUsers()
        .filter((u) => !u.isBlocked && !u.stoppedByUser && u.prayerNotificationsEnabled);

      for (const slot of prayerSlots) {
        const slotMin = parseHHMMToMinutes(slot.time);
        if (slotMin === null) continue;
        const deltaMin = slotMin - nowMin;
        if (deltaMin < 0 || deltaMin > 120) continue;

        for (const sub of subscribers) {
          const prefs = this.userService?.getEffectiveNotificationPreferences(sub);
          const enabledLeads = new Set<number>(prefs?.leadMinutes && prefs.leadMinutes.length > 0 ? prefs.leadMinutes : [0]);
          if (prefs?.customLeadMinutes && prefs.customLeadMinutes > 0) {
            enabledLeads.add(prefs.customLeadMinutes);
          }
          if (!enabledLeads.has(deltaMin)) continue;

          if (prefs) {
            if (!prefs.prayers[slot.key]) continue;
            if (
              prefs.quietHoursEnabled &&
              isWithinQuietHours(parts.hhmm, prefs.quietHoursStart || undefined, prefs.quietHoursEnd || undefined)
            ) {
              continue;
            }
          }

          const dedupeKey = `azan:${parts.dateKey}:${slot.key}:lead${deltaMin}:${sub.telegramId}`;
          if (this.repository.hasSchedulerDispatched(dedupeKey)) continue;
          await this.repository.markSchedulerDispatched(dedupeKey, parts.dateKey);

          const formatted =
            deltaMin === 0
              ? this.prayerAdapter.formatAzanReminderMessage(
                  slot.key,
                  slot.time,
                  sub.language,
                  this.emojiRegistry,
                  now
                )
              : {
                  text:
                    sub.language === 'ru'
                      ? `{{emoji:notifications}} Напоминание о намазе (${deltaMin} мин до времени)\n{{emoji:prayer}} ${slot.key.toUpperCase()} — ${slot.time} (Асака · Asia/Tashkent)`
                      : sub.language === 'en'
                        ? `{{emoji:notifications}} Prayer Reminder (${deltaMin} min left)\n{{emoji:prayer}} ${slot.key.toUpperCase()} — ${slot.time} (Asaka · Asia/Tashkent)`
                        : `{{emoji:notifications}} Namoz eslatmasi (${deltaMin} daqiqa qoldi)\n{{emoji:prayer}} ${slot.key.toUpperCase()} — ${slot.time} (Asaka · Asia/Tashkent)`,
                  entities: [],
                };

          const { res, retryCount } = await this.sendMessageWithRetry({
            chat_id: sub.telegramId,
            text: formatted.text,
            ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
          });

          await this.recordDispatchLog({
            notificationId: dedupeKey,
            userId: sub.telegramId,
            kind: 'prayer',
            timezone: prefs?.timezone || 'Asia/Tashkent',
            scheduledTime: `${parts.dateKey}T${parts.hhmm}:00+05:00`,
            sentStatus: res.ok ? 'sent' : 'failed',
            retryCount,
            sentAt: res.ok ? new Date().toISOString() : undefined,
            error: res.ok ? undefined : res.description,
          });

          if (res.ok) {
            azanSent++;
            this.azanRemindersDispatched++;
            if (deltaMin === 0 && prefs?.adhanAudioTrackId && prefs.adhanAudioTrackId !== 'none') {
              const track = resolveAdhanTrack(prefs.adhanAudioTrackId);
              if (track?.audioUrl) {
                await this.apiClient
                  .sendAudio({
                    chat_id: sub.telegramId,
                    audio: track.audioUrl,
                    title: track.titleUz,
                    performer: track.muezzinUz,
                  })
                  .catch(() => {});
              }
            }
            if (this.userService) {
              await this.userService.recordNotificationHistory(sub.telegramId, {
                kind: 'prayer',
                title:
                  deltaMin === 0
                    ? `${slot.key.toUpperCase()} (${slot.time})`
                    : `${slot.key.toUpperCase()} (-${deltaMin} min · ${slot.time})`,
                dateKey: parts.dateKey,
              });
            }
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

    // 2. Daily automatic prayer timetable broadcast at 05:00 Asia/Tashkent
    if (parts.hhmm === '05:00' && this.publishingService) {
      const autoChannels = this.repository
        .listChannels()
        .filter((c) => c.isActive && c.autoPublishPrayerTimes);

      for (const ch of autoChannels) {
        const chKey = `daily_ch:${parts.dateKey}:${ch.id}`;
        if (this.repository.hasSchedulerDispatched(chKey)) continue;
        await this.repository.markSchedulerDispatched(chKey, parts.dateKey);

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

    // 6. Daily Smart Assistant & Islamic Wisdom at 07:30 Asia/Tashkent (persistent date dedupe)
    if (parts.hhmm === '07:30' && this.contentAdapter) {
      const wisdomKey = `daily_wisdom:${parts.dateKey}`;
      if (!this.repository.hasSchedulerDispatched(wisdomKey)) {
        await this.repository.markSchedulerDispatched(wisdomKey, parts.dateKey);
        const dayIndex = Math.floor(now.getTime() / 86_400_000);
        const wisdomSubs = this.repository
          .listUsers()
          .filter((u) => !u.isBlocked && !u.stoppedByUser && u.dailyWisdomEnabled);

        for (const sub of wisdomSubs) {
          const prefs = this.userService?.getEffectiveNotificationPreferences(sub);
          if (
            prefs?.quietHoursEnabled &&
            isWithinQuietHours(parts.hhmm, prefs.quietHoursStart || undefined, prefs.quietHoursEnd || undefined)
          ) {
            continue;
          }

          let textToSend: string;
          let entitiesToSend: any[] = [];
          if (prefs?.dailyBriefEnabled !== false) {
            const verse = this.contentAdapter.formatQuranDailyAyah(dayIndex, sub.language, this.emojiRegistry);
            const hadith = this.contentAdapter.formatHadithCard(dayIndex, sub.language, this.emojiRegistry);
            const dhikr = this.contentAdapter.formatDhikrCard(dayIndex, 0, sub.language, this.emojiRegistry);
            const latestAnn = this.contentAdapter.centralContent.getPublishedAnnouncements()[0];
            const digest = this.prayerAdapter.formatDailySmartDigest({
              locale: sub.language,
              emojiRegistry: this.emojiRegistry,
              userDisplayName: getUserDisplayFirstName(sub),
              verseSummary: `${verse.title}`,
              hadithSummary: `${hadith.title}`,
              dhikrSummary: dhikr.formatted.text.split('\n')[1] || 'SubhanAllah',
              announcementTitle: latestAnn?.title,
              now,
            });
            textToSend = digest.text;
            entitiesToSend = digest.entities;
          } else {
            const hadith = this.contentAdapter.formatHadithCard(
              dayIndex,
              sub.language,
              this.emojiRegistry
            );
            textToSend = hadith.formatted.text;
            entitiesToSend = hadith.formatted.entities;
          }

          const { res, retryCount } = await this.sendMessageWithRetry({
            chat_id: sub.telegramId,
            text: textToSend,
            ...(entitiesToSend.length > 0 ? { entities: entitiesToSend } : {}),
          });
          await this.recordDispatchLog({
            notificationId: `daily_wisdom:${parts.dateKey}:${sub.telegramId}`,
            userId: sub.telegramId,
            kind: 'daily_brief',
            timezone: prefs?.timezone || 'Asia/Tashkent',
            scheduledTime: `${parts.dateKey}T07:30:00+05:00`,
            sentStatus: res.ok ? 'sent' : 'failed',
            retryCount,
            sentAt: res.ok ? new Date().toISOString() : undefined,
            error: res.ok ? undefined : res.description,
          });
          if (res.ok) {
            wisdomSent++;
            this.dailyWisdomDispatched++;
            if (this.userService) {
              await this.userService.recordNotificationHistory(sub.telegramId, {
                kind: 'daily_brief',
                title: `Daily Briefing (${parts.dateKey})`,
                dateKey: parts.dateKey,
              });
            }
          }
        }
      }
    }

    // 7. ASAKA ZIYO HIFZ Scheduled Reminders (morning / midday / evening / due_review)
    if (this.hifzService) {
      const dueHifz = this.hifzService.findUsersDueForReminder(now);
      for (const item of dueHifz) {
        const user = this.repository.getUser(item.profile.telegramId);
        if (!user || user.isBlocked || user.stoppedByUser) continue;
        const prefs = this.userService?.getEffectiveNotificationPreferences(user);
        if (prefs) {
          if (item.slot === 'due_review' && prefs.hifzMurojaaEnabled === false) continue;
          if (item.slot !== 'due_review' && prefs.hifzNewEnabled === false && prefs.hifzMurojaaEnabled === false) continue;
          if (prefs.quietHoursEnabled && isWithinQuietHours(parts.hhmm, prefs.quietHoursStart || undefined, prefs.quietHoursEnd || undefined)) {
            continue;
          }
        }

        const msgText = this.hifzService.buildReminderMessage(
          item.profile,
          item.slot,
          user.language,
          now
        );
        const { res, retryCount } = await this.sendMessageWithRetry({
          chat_id: user.telegramId,
          text: msgText,
          reply_markup: {
 inline_keyboard: [[{ text: 'HIFZ — Bugungi murojaa', callback_data: 'hifz:today'}]],
          },
        });
        await this.recordDispatchLog({
          notificationId: `hifz:${item.dateKey}:${item.slotKey}:${user.telegramId}`,
          userId: user.telegramId,
          kind: 'hifz',
          timezone: prefs?.timezone || 'Asia/Tashkent',
          scheduledTime: `${item.dateKey}T${parts.hhmm}:00+05:00`,
          sentStatus: res.ok ? 'sent' : 'failed',
          retryCount,
          sentAt: res.ok ? new Date().toISOString() : undefined,
          error: res.ok ? undefined : res.description,
        });
        if (res.ok) {
          hifzRemindersSent++;
          this.hifzRemindersDispatched++;
          await this.hifzService.markReminderDispatched(
            item.profile.telegramId,
            item.slotKey,
            item.dateKey
          );
          if (this.userService) {
            await this.userService.recordNotificationHistory(user.telegramId, {
              kind: 'hifz',
              title: `HIFZ ${item.slot} (${item.dateKey})`,
              dateKey: item.dateKey,
            });
          }
        }
      }
    }

    // 8. Personal User Reminders (Asia/Tashkent HH:MM with daily persistent dedupe)
    const usersWithReminders = this.repository
      .listUsers()
      .filter((u) => !u.isBlocked && !u.stoppedByUser && Array.isArray(u.personalReminders) && u.personalReminders.length > 0);
    for (const user of usersWithReminders) {
      const prefs = this.userService?.getEffectiveNotificationPreferences(user);
      if (prefs?.quietHoursEnabled && isWithinQuietHours(parts.hhmm, prefs.quietHoursStart || undefined, prefs.quietHoursEnd || undefined)) {
        continue;
      }
      for (const rem of user.personalReminders || []) {
        if (!rem.enabled || rem.timeHHMM !== parts.hhmm) continue;
        const remKey = `prem:${parts.dateKey}:${user.telegramId}:${rem.id}`;
        if (this.repository.hasSchedulerDispatched(remKey)) continue;
        await this.repository.markSchedulerDispatched(remKey, parts.dateKey);
        const { res, retryCount } = await this.sendMessageWithRetry({
          chat_id: user.telegramId,
          text: `{{emoji:notifications}} ${rem.label}\n{{emoji:notifications}} ${rem.timeHHMM} (Asia/Tashkent)`,
        });
        await this.recordDispatchLog({
          notificationId: remKey,
          userId: user.telegramId,
          kind: 'reminder',
          timezone: prefs?.timezone || 'Asia/Tashkent',
          scheduledTime: `${parts.dateKey}T${rem.timeHHMM}:00+05:00`,
          sentStatus: res.ok ? 'sent' : 'failed',
          retryCount,
          sentAt: res.ok ? new Date().toISOString() : undefined,
          error: res.ok ? undefined : res.description,
        });
        if (res.ok) {
          personalRemindersSent++;
          if (this.userService) {
            await this.userService.recordNotificationHistory(user.telegramId, {
              kind: 'reminder',
              title: `${rem.label} (${rem.timeHHMM})`,
              dateKey: parts.dateKey,
            });
          }
        }
      }
    }

    // 9. Verified Android APK release update alert (fires once per new version+build)
    if (this.appReleaseService) {
      try {
        const info = await this.appReleaseService.getResolvedReleaseInfo({ checkGitHub: false });
        const releaseTag = `${info.version}+${info.buildCode}`;
        const settings = this.repository.getSettings();
        if (
          info.apkAvailable &&
          settings.lastNotifiedApkVersion &&
          settings.lastNotifiedApkVersion !== releaseTag
        ) {
          const apkKey = `apk_release:${releaseTag}`;
          if (!this.repository.hasSchedulerDispatched(apkKey)) {
            await this.repository.markSchedulerDispatched(apkKey, parts.dateKey);
            await this.repository.saveSettings({ lastNotifiedApkVersion: releaseTag }, 'scheduler');
            const subs = this.repository
              .listUsers()
              .filter((u) => !u.isBlocked && !u.stoppedByUser && u.announcementsEnabled);
            for (const sub of subs) {
              const prefs = this.userService?.getEffectiveNotificationPreferences(sub);
              if (prefs && !prefs.appUpdatesEnabled) continue;
              const { res } = await this.sendMessageWithRetry({
                chat_id: sub.telegramId,
                text: `{{emoji:brand}} ASAKA ZIYO Android v${info.version} (Build ${info.buildCode}) yangi versiyasi tayyor! /android orqali yuklab oling.`,
                reply_markup: {
 inline_keyboard: [[{ text: 'APK yuklab olish', callback_data: 'android:send_apk'}]],
                },
              });
              if (res.ok) {
                apkUpdateAlertsSent++;
                if (this.userService) {
                  await this.userService.recordNotificationHistory(sub.telegramId, {
                    kind: 'app_update',
                    title: `Android APK v${info.version}`,
                    dateKey: parts.dateKey,
                  });
                }
              }
            }
          }
        } else if (info.apkAvailable && !settings.lastNotifiedApkVersion) {
          await this.repository.saveSettings({ lastNotifiedApkVersion: releaseTag }, 'scheduler');
        }
      } catch {
        // Non-blocking release check
      }
    }

    return {
      azanSent,
      channelPostsSent,
      scheduledDraftsSent,
      scheduledBroadcastsRun,
      wisdomSent,
      scheduleChangePostsSent,
      hifzRemindersSent,
      apkUpdateAlertsSent,
      personalRemindersSent,
    };
  }

  private async sendMessageWithRetry(
    params: Parameters<TelegramApiClient['sendMessage']>[0]
  ): Promise<{ res: Awaited<ReturnType<TelegramApiClient['sendMessage']>>; retryCount: number }> {
    const first = await this.apiClient.sendMessage(params);
    if (first.ok || first.error_code === 403 || first.error_code === 400) {
      return { res: first, retryCount: 0 };
    }
    // Single transient retry on 429 / 5xx / network error
    const retry = await this.apiClient.sendMessage(params);
    return { res: retry, retryCount: 1 };
  }

  private async recordDispatchLog(record: TelegramNotificationDispatchRecord): Promise<void> {
    if (!this.repository) return;
    const settings = this.repository.getSettings();
    const next = [record, ...(settings.notificationDispatchLog || [])].slice(0, 250);
    await this.repository.saveSettings({ notificationDispatchLog: next }, 'scheduler').catch(() => {});
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
    const res = await this.apiClient.getUpdates(this.offset, 20);

    if (res.ok && Array.isArray(res.result)) {
      this.lastSuccessfulPollAt = new Date().toISOString();
      this.consecutiveErrors = 0;
      this.conflictYieldCount = 0;
      this.lastError = null;
      this.lastErrorCode = null;

      // Non-blocking concurrent update dispatch:
      // Each update is dispatched immediately into TelegramBotEngine's per-user sequential /
      // cross-user parallel queue so slow AI/audio tasks for User A NEVER block User B!
      for (const update of res.result) {
        this.offset = update.update_id + 1;
        this.lastUpdateAt = new Date().toISOString();
        this.updatesProcessedCount++;
        void Promise.resolve(this.onUpdate(update)).catch((err) => {
          this.logger.error('Concurrent update dispatch error', {
            updateId: update.update_id,
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }
      this.scheduleNextPoll(res.result.length > 0 ? 20 : 80);
      return;
    }

    if (res.error_code === 409) {
      // Explicit Multi-Instance Conflict Detection (critical anti-rollback telemetry!):
      // Another running container/deployment is polling the same TELEGRAM_BOT_TOKEN1.
      this.conflictYieldCount++;
      this.totalConflictCount++;
      this.lastConflictAt = new Date().toISOString();
      this.lastErrorCode = 409;
      this.lastError =
        '409 Conflict: Another bot instance is polling TELEGRAM_BOT_TOKEN1 concurrently. Switch production to webhook mode or stop duplicate polling containers.';
      this.lastErrorAt = this.lastConflictAt;

      if (this.conflictYieldCount === 1 || this.conflictYieldCount % 5 === 0) {
        this.logger.warn('[MULTI_INSTANCE_CONFLICT] Telegram 409 getUpdates conflict detected', {
          conflictYieldCount: this.conflictYieldCount,
          totalConflictCount: this.totalConflictCount,
          description: res.description,
        });
        this.repository?.recordRollbackWarning({
          target: 'polling_conflict',
          source: 'TelegramJobScheduler.pollOnce',
          functionName: 'pollOnce',
          currentVersion: this.repository.getSettings().version || 1,
          incomingVersion: 0,
          reason: `Telegram HTTP 409 getUpdates conflict (#${this.totalConflictCount}): another instance is competing for the same bot token.`,
        });
      }
      const jitterMs = Math.floor(Math.random() * 4_000);
      const conflictBackoffMs = Math.min(60_000, 15_000 * Math.min(this.conflictYieldCount, 4)) + jitterMs;
      this.scheduleNextPoll(conflictBackoffMs);
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

    if (this.consecutiveErrors <= 3 || this.consecutiveErrors % 10 === 0) {
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
