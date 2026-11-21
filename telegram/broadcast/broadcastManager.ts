/**
 * ASAKA ZIYO — Telegram Broadcast Campaign Manager & Rate-Limited Async Queue Worker
 *
 * Guarantees:
 * - Strict opt-in enforcement (never messages blocked/stopped users)
 * - 12 audience segments (all_opt_in, active_7d, new_users_7d, 5 language cohorts, subscribers, custom)
 * - Multi-media support (text, html, photo, video, audio, voice, document, animation, sequence)
 * - Rate-limited async delivery respecting Telegram 429 `retry_after` flood waits
 * - Auto-opt-out on 403 "bot was blocked by the user" (never retries blocked users)
 * - Persistent idempotency (`sentUserIds`), pause / resume / cancel, per-language stats, and CSV export
 */

import crypto from 'crypto';
import {
  TelegramBroadcastButtonSpec,
  TelegramBroadcastMediaType,
  TelegramBroadcastRecord,
  TelegramBroadcastSegment,
  TelegramInlineKeyboardButton,
  TelegramLocale,
  TelegramUserRecord,
} from '../types';
import { TelegramRepository } from '../database/telegramRepository';
import { TelegramApiClient } from '../api/telegramApiClient';
import { CustomEmojiRegistry } from '../emoji/customEmojiRegistry';

function buildBroadcastInlineKeyboard(buttons?: TelegramBroadcastButtonSpec[]) {
  if (!buttons || buttons.length === 0) return undefined;
  const rows: TelegramInlineKeyboardButton[][] = buttons.map((b) => {
    if (b.webAppUrl) return [{ text: b.text, web_app: { url: b.webAppUrl } }];
    if (b.url) return [{ text: b.text, url: b.url }];
    return [{ text: b.text, callback_data: b.callbackData || 'nav:home' }];
  });
  return { inline_keyboard: rows };
}

export class TelegramBroadcastManager {
  private readonly repo: TelegramRepository;
  private readonly apiClient: TelegramApiClient;
  private readonly emojiRegistry: CustomEmojiRegistry;
  private readonly activeWorkers = new Set<string>();

  constructor(
    repo: TelegramRepository,
    apiClient: TelegramApiClient,
    emojiRegistry: CustomEmojiRegistry
  ) {
    this.repo = repo;
    this.apiClient = apiClient;
    this.emojiRegistry = emojiRegistry;
  }

  resolveAudience(
    segment: TelegramBroadcastSegment,
    customUserIds?: string[]
  ): TelegramUserRecord[] {
    const now = Date.now();
    const eligibleBase = this.repo
      .listUsers()
      .filter((u) => !u.isBlocked && !u.stoppedByUser && u.announcementsEnabled);

    switch (segment) {
      case 'all_opt_in':
        return eligibleBase;
      case 'active_7d':
        return eligibleBase.filter((u) => {
          const t = Date.parse(u.lastActiveAt || u.updatedAt || '');
          return Boolean(t && now - t <= 7 * 86_400_000);
        });
      case 'new_users_7d':
        return eligibleBase.filter((u) => {
          const t = Date.parse(u.createdAt || '');
          return Boolean(t && now - t <= 7 * 86_400_000);
        });
      case 'lang_uz-Latn':
        return eligibleBase.filter((u) => u.language === 'uz-Latn');
      case 'lang_uz-Cyrl':
        return eligibleBase.filter((u) => u.language === 'uz-Cyrl');
      case 'lang_uz-Latn-new':
        return eligibleBase.filter((u) => u.language === 'uz-Latn-new');
      case 'lang_ru':
        return eligibleBase.filter((u) => u.language === 'ru');
      case 'lang_en':
        return eligibleBase.filter((u) => u.language === 'en');
      case 'prayer_subscribers':
        return this.repo
          .listUsers()
          .filter((u) => !u.isBlocked && !u.stoppedByUser && u.prayerNotificationsEnabled);
      case 'wisdom_subscribers':
        return this.repo
          .listUsers()
          .filter((u) => !u.isBlocked && !u.stoppedByUser && u.dailyWisdomEnabled);
      case 'announcement_subscribers':
        return eligibleBase;
      case 'custom_ids': {
        const allow = new Set(customUserIds || []);
        return eligibleBase.filter((u) => allow.has(u.telegramId));
      }
      default:
        return eligibleBase;
    }
  }

  async createCampaign(params: {
    title: string;
    mediaType: TelegramBroadcastMediaType;
    defaultText: string;
    textByLocale?: Partial<Record<TelegramLocale, string>>;
    mediaUrlOrFileId?: string;
    sequenceItems?: Array<{ text: string; delayMs?: number }>;
    buttons?: TelegramBroadcastButtonSpec[];
    segment: TelegramBroadcastSegment;
    customUserIds?: string[];
    scheduledAt?: string;
    createdBy: string;
  }): Promise<TelegramBroadcastRecord> {
    const nowIso = new Date().toISOString();
    const id = `bc_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
    const audience = this.resolveAudience(params.segment, params.customUserIds);

    const statsByLocale: TelegramBroadcastRecord['statsByLocale'] = {};
    for (const u of audience) {
      const cur = statsByLocale[u.language] || { targeted: 0, sent: 0, failed: 0, blocked: 0 };
      cur.targeted++;
      statsByLocale[u.language] = cur;
    }

    const record: TelegramBroadcastRecord = {
      id,
      title: params.title.slice(0, 180),
      mediaType: params.mediaType,
      textByLocale: params.textByLocale || {},
      defaultText: params.defaultText,
      mediaUrlOrFileId: params.mediaUrlOrFileId,
      sequenceItems: params.sequenceItems,
      buttons: params.buttons,
      segment: params.segment,
      customUserIds: params.customUserIds,
      status: params.scheduledAt ? 'scheduled' : 'draft',
      scheduledAt: params.scheduledAt,
      idempotencyKey: `bc_idem_${id}`,
      totalTargets: audience.length,
      sentCount: 0,
      failedCount: 0,
      blockedCount: 0,
      skippedCount: 0,
      sentUserIds: [],
      blockedUserIds: [],
      failedDetails: [],
      statsByLocale,
      createdBy: params.createdBy,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await this.repo.saveBroadcast(record);
    await this.repo.appendAuditLog({
      actorTelegramId: params.createdBy,
      actorRole: 'admin',
      action: 'broadcast_created',
      targetType: 'broadcast',
      targetId: record.id,
      metadata: { segment: params.segment, totalTargets: audience.length },
    });
    return record;
  }

  async sendTestPreview(campaignId: string, adminChatId: string | number) {
    const bc = this.repo.getBroadcast(campaignId);
    if (!bc) return { ok: false, error: 'Campaign not found' };
    const text = `[TEST PREVIEW: ${bc.title}]\n\n${bc.defaultText}`;
    const res = await this.dispatchToSingleChat(adminChatId, 'uz-Latn', bc, text);
    return { ok: res.ok, error: res.error };
  }

  private async dispatchToSingleChat(
    chatId: string | number,
    locale: TelegramLocale,
    bc: TelegramBroadcastRecord,
    overrideText?: string
  ): Promise<{ ok: boolean; errorCode?: number; error?: string; retryAfterSec?: number; isBlocked?: boolean }> {
    const rawText = overrideText || bc.textByLocale[locale] || bc.defaultText;
    const replyMarkup = buildBroadcastInlineKeyboard(bc.buttons);

    let res;
    if (bc.mediaType === 'html') {
      res = await this.apiClient.sendMessage({
        chat_id: chatId,
        text: rawText,
        parse_mode: 'HTML',
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
        disable_web_page_preview: true,
      });
    } else if (bc.mediaType === 'photo' && bc.mediaUrlOrFileId) {
      res = await this.apiClient.sendPhoto({
        chat_id: chatId,
        photo: bc.mediaUrlOrFileId,
        caption: rawText.slice(0, 1020),
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      });
    } else if (bc.mediaType === 'video' && bc.mediaUrlOrFileId) {
      res = await this.apiClient.sendVideo({
        chat_id: chatId,
        video: bc.mediaUrlOrFileId,
        caption: rawText.slice(0, 1020),
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      });
    } else if (bc.mediaType === 'audio' && bc.mediaUrlOrFileId) {
      res = await this.apiClient.sendAudio({
        chat_id: chatId,
        audio: bc.mediaUrlOrFileId,
        caption: rawText.slice(0, 1020),
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      });
    } else if (bc.mediaType === 'voice' && bc.mediaUrlOrFileId) {
      res = await this.apiClient.sendVoice({
        chat_id: chatId,
        voice: bc.mediaUrlOrFileId,
        caption: rawText.slice(0, 1020),
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      });
    } else if (bc.mediaType === 'document' && bc.mediaUrlOrFileId) {
      res = await this.apiClient.sendDocument({
        chat_id: chatId,
        document: bc.mediaUrlOrFileId,
        caption: rawText.slice(0, 1020),
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      });
    } else if (bc.mediaType === 'animation' && bc.mediaUrlOrFileId) {
      res = await this.apiClient.sendAnimation({
        chat_id: chatId,
        animation: bc.mediaUrlOrFileId,
        caption: rawText.slice(0, 1020),
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      });
    } else if (bc.mediaType === 'sequence' && bc.sequenceItems && bc.sequenceItems.length > 0) {
      let lastRes: any = { ok: false, description: 'Empty sequence' };
      for (const item of bc.sequenceItems) {
        const formatted = this.emojiRegistry.formatMessage(item.text);
        lastRes = await this.apiClient.sendMessage({
          chat_id: chatId,
          text: formatted.text,
          ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
          disable_web_page_preview: true,
        });
        if (!lastRes.ok) break;
      }
      res = lastRes;
    } else {
      const formatted = this.emojiRegistry.formatMessage(rawText);
      res = await this.apiClient.sendMessage({
        chat_id: chatId,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
        disable_web_page_preview: true,
      });
    }

    if (res.ok) {
      return { ok: true };
    }

    const desc = (res.description || '').toLowerCase();
    const isBlocked =
      res.error_code === 403 ||
      desc.includes('blocked') ||
      desc.includes('deactivated') ||
      desc.includes('chat not found');

    return {
      ok: false,
      errorCode: res.error_code,
      error: res.description,
      retryAfterSec: res.parameters?.retry_after,
      isBlocked,
    };
  }

  /**
   * Executes or resumes a broadcast campaign queue safely with rate limiting,
   * flood backoff, 403 block isolation, and idempotent progress checkpointing.
   */
  async runCampaign(
    campaignId: string,
    actorId: string,
    options?: { delayBetweenMessagesMs?: number }
  ): Promise<TelegramBroadcastRecord | null> {
    const bc = this.repo.getBroadcast(campaignId);
    if (!bc) return null;
    if (bc.status === 'cancelled' || bc.status === 'completed') return bc;
    if (this.activeWorkers.has(campaignId)) return bc;

    this.activeWorkers.add(campaignId);
    try {
      bc.status = 'running';
      bc.startedAt = bc.startedAt || new Date().toISOString();
      bc.updatedAt = new Date().toISOString();
      await this.repo.saveBroadcast(bc);

      const audience = this.resolveAudience(bc.segment, bc.customUserIds);
      const alreadySent = new Set(bc.sentUserIds);
      const alreadyBlocked = new Set(bc.blockedUserIds);
      const pacingMs = options?.delayBetweenMessagesMs ?? 45;
      let processedSinceCheckpoint = 0;

      for (const target of audience) {
        // Re-read status on every iteration so pause/cancel takes effect immediately
        const latest = this.repo.getBroadcast(campaignId);
        if (!latest || latest.status === 'paused' || latest.status === 'cancelled') {
          break;
        }

        if (alreadySent.has(target.telegramId) || alreadyBlocked.has(target.telegramId)) {
          latest.skippedCount++;
          continue;
        }

        let attemptRes = await this.dispatchToSingleChat(
          target.telegramId,
          target.language,
          latest
        );

        // Exponential / Telegram retry_after flood backoff (single safe retry)
        if (!attemptRes.ok && attemptRes.errorCode === 429 && attemptRes.retryAfterSec !== undefined) {
          const waitMs = Math.min(10_000, Math.max(0, attemptRes.retryAfterSec) * 1000);
          if (waitMs > 0) {
            await new Promise((r) => setTimeout(r, waitMs));
          }
          attemptRes = await this.dispatchToSingleChat(
            target.telegramId,
            target.language,
            latest
          );
        }

        const langStat = latest.statsByLocale[target.language] || {
          targeted: 1,
          sent: 0,
          failed: 0,
          blocked: 0,
        };

        if (attemptRes.ok) {
          latest.sentCount++;
          latest.sentUserIds.push(target.telegramId);
          alreadySent.add(target.telegramId);
          langStat.sent++;
        } else if (attemptRes.isBlocked) {
          latest.blockedCount++;
          latest.blockedUserIds.push(target.telegramId);
          alreadyBlocked.add(target.telegramId);
          langStat.blocked++;
          // Mark user opted out/blocked so we never retry messaging them
          target.isBlocked = true;
          target.updatedAt = new Date().toISOString();
          await this.repo.saveUser(target);
        } else {
          latest.failedCount++;
          langStat.failed++;
          latest.failedDetails.push({
            telegramId: target.telegramId,
            errorCode: attemptRes.errorCode,
            error: attemptRes.error || 'Unknown error',
          });
        }

        latest.statsByLocale[target.language] = langStat;
        latest.updatedAt = new Date().toISOString();
        processedSinceCheckpoint++;
        if (processedSinceCheckpoint >= 25) {
          await this.repo.saveBroadcast(latest);
          processedSinceCheckpoint = 0;
        }

        if (pacingMs > 0) {
          await new Promise((r) => setTimeout(r, pacingMs));
        }
      }

      const finalState = this.repo.getBroadcast(campaignId);
      if (finalState) {
        if (finalState.status === 'running') {
          finalState.status = 'completed';
          finalState.completedAt = new Date().toISOString();
          finalState.updatedAt = finalState.completedAt;
          await this.repo.saveBroadcast(finalState);
          await this.repo.appendAuditLog({
            actorTelegramId: actorId,
            actorRole: 'admin',
            action: 'broadcast_completed',
            targetType: 'broadcast',
            targetId: campaignId,
            metadata: {
              sent: finalState.sentCount,
              blocked: finalState.blockedCount,
              failed: finalState.failedCount,
            },
          });
        } else if (processedSinceCheckpoint > 0) {
          await this.repo.saveBroadcast(finalState);
        }
      }
      return this.repo.getBroadcast(campaignId);
    } finally {
      this.activeWorkers.delete(campaignId);
    }
  }

  async pauseCampaign(campaignId: string, actorId: string): Promise<TelegramBroadcastRecord | null> {
    const bc = this.repo.getBroadcast(campaignId);
    if (!bc) return null;
    if (bc.status === 'running' || bc.status === 'scheduled') {
      bc.status = 'paused';
      bc.updatedAt = new Date().toISOString();
      await this.repo.saveBroadcast(bc);
      await this.repo.appendAuditLog({
        actorTelegramId: actorId,
        actorRole: 'admin',
        action: 'broadcast_paused',
        targetType: 'broadcast',
        targetId: campaignId,
      });
    }
    return bc;
  }

  async cancelCampaign(campaignId: string, actorId: string): Promise<TelegramBroadcastRecord | null> {
    const bc = this.repo.getBroadcast(campaignId);
    if (!bc) return null;
    if (bc.status !== 'completed') {
      bc.status = 'cancelled';
      bc.updatedAt = new Date().toISOString();
      await this.repo.saveBroadcast(bc);
      await this.repo.appendAuditLog({
        actorTelegramId: actorId,
        actorRole: 'admin',
        action: 'broadcast_cancelled',
        targetType: 'broadcast',
        targetId: campaignId,
      });
    }
    return bc;
  }

  exportCampaignCsv(campaignId: string): string {
    const bc = this.repo.getBroadcast(campaignId);
    if (!bc) return '';
    const rows = [
      'metric,value',
      `id,"${bc.id}"`,
      `title,"${bc.title.replace(/"/g, '""')}"`,
      `segment,"${bc.segment}"`,
      `status,"${bc.status}"`,
      `totalTargets,${bc.totalTargets}`,
      `sentCount,${bc.sentCount}`,
      `blockedCount,${bc.blockedCount}`,
      `failedCount,${bc.failedCount}`,
      `skippedCount,${bc.skippedCount}`,
    ];
    return rows.join('\n');
  }
}
