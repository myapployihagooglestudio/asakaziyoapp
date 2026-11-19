/**
 * ASAKA ZIYO — Telegram Channel Publishing, Idempotency & Permission Service
 *
 * Verifies bot administrator + `can_post_messages` rights via Telegram Bot API
 * (`getMe` + `getChat` + `getChatMember`) BEFORE dispatching posts to any channel,
 * prevents duplicate dispatches via idempotencyKey, and records full history.
 */

import { TelegramLocale, TelegramPublicationRecord } from '../types';
import { TelegramApiClient } from '../api/telegramApiClient';
import { CustomEmojiRegistry } from '../emoji/customEmojiRegistry';
import { TelegramRepository } from '../database/telegramRepository';
import { TelegramPrayerAdapter } from '../prayer/prayerAdapter';

export interface ChannelPermissionCheckResult {
  ok: boolean;
  channelId: string;
  targetChat: string;
  botId?: number;
  botStatus?: string;
  canPostMessages: boolean;
  chatTitle?: string;
  reason: string;
}

export class TelegramPublishingService {
  private readonly apiClient: TelegramApiClient;
  private readonly repo: TelegramRepository;
  private readonly emojiRegistry: CustomEmojiRegistry;

  constructor(
    apiClient: TelegramApiClient,
    repo: TelegramRepository,
    emojiRegistry: CustomEmojiRegistry
  ) {
    this.apiClient = apiClient;
    this.repo = repo;
    this.emojiRegistry = emojiRegistry;
  }

  listHistory(limit = 50): TelegramPublicationRecord[] {
    return this.repo.listPublications(limit);
  }

  async verifyChannelPermissions(channelId: string): Promise<ChannelPermissionCheckResult> {
    const channel = this.repo.getChannel(channelId);
    if (!channel) {
      return {
        ok: false,
        channelId,
        targetChat: channelId,
        canPostMessages: false,
        reason: `Channel "${channelId}" is not registered in telegramChannels.`,
      };
    }

    const targetChat = channel.chatId || channel.username;
    if (!this.apiClient.isConfigured) {
      return {
        ok: false,
        channelId: channel.id,
        targetChat,
        canPostMessages: false,
        reason: 'TELEGRAM_BOT_TOKEN1 is not configured.',
      };
    }

    const me = await this.apiClient.getMe();
    if (!me.ok || !me.result) {
      return {
        ok: false,
        channelId: channel.id,
        targetChat,
        canPostMessages: false,
        reason: `Cannot identify bot (getMe failed): ${me.description || 'unknown error'}`,
      };
    }

    const chatRes = await this.apiClient.getChat(targetChat);
    if (!chatRes.ok || !chatRes.result) {
      return {
        ok: false,
        channelId: channel.id,
        targetChat,
        botId: me.result.id,
        canPostMessages: false,
        reason: `Bot cannot access channel ${targetChat}: ${chatRes.description || 'chat not found or bot not added'}`,
      };
    }

    const memberRes = await this.apiClient.getChatMember(targetChat, me.result.id);
    if (!memberRes.ok || !memberRes.result) {
      return {
        ok: false,
        channelId: channel.id,
        targetChat,
        botId: me.result.id,
        chatTitle: chatRes.result.title,
        canPostMessages: false,
        reason: `getChatMember failed for ${targetChat}: ${memberRes.description || 'unknown error'}`,
      };
    }

    const status = memberRes.result.status;
    const isAdmin = status === 'administrator' || status === 'creator';
    const canPost =
      status === 'creator' ||
      (status === 'administrator' && memberRes.result.can_post_messages !== false);

    if (!isAdmin) {
      return {
        ok: false,
        channelId: channel.id,
        targetChat,
        botId: me.result.id,
        botStatus: status,
        chatTitle: chatRes.result.title,
        canPostMessages: false,
        reason: `Bot status in ${targetChat} is "${status}" — add the bot as channel administrator with Post Messages permission.`,
      };
    }

    if (!canPost) {
      return {
        ok: false,
        channelId: channel.id,
        targetChat,
        botId: me.result.id,
        botStatus: status,
        chatTitle: chatRes.result.title,
        canPostMessages: false,
        reason: `Bot is administrator in ${targetChat}, but "can_post_messages" is disabled.`,
      };
    }

    return {
      ok: true,
      channelId: channel.id,
      targetChat,
      botId: me.result.id,
      botStatus: status,
      chatTitle: chatRes.result.title,
      canPostMessages: true,
      reason: `Verified: bot is ${status} in ${targetChat} with posting permission.`,
    };
  }

  async publishToChannel(params: {
    channelId: string;
    category: TelegramPublicationRecord['category'];
    language: TelegramLocale;
    templateText: string;
    createdBy: string;
    skipPermissionPrecheck?: boolean;
    idempotencyKey?: string;
  }): Promise<{
    success: boolean;
    duplicateSkipped?: boolean;
    record: TelegramPublicationRecord;
    permissionCheck?: ChannelPermissionCheckResult;
    error?: string;
  }> {
    if (
      params.idempotencyKey &&
      this.repo.hasPublicationWithIdempotencyKey(params.idempotencyKey)
    ) {
      const existing = this.repo
        .listPublications(100)
        .find((p) => p.idempotencyKey === params.idempotencyKey && p.status === 'sent');
      if (existing) {
        return {
          success: true,
          duplicateSkipped: true,
          record: existing,
        };
      }
    }

    const channel = this.repo.getChannel(params.channelId);
    if (!channel || !channel.isActive) {
      const failed = await this.repo.recordPublication({
        channelId: params.channelId,
        channelUsername: channel?.username || params.channelId,
        category: params.category,
        language: params.language,
        textPreview: params.templateText.slice(0, 280),
        idempotencyKey: params.idempotencyKey,
        status: 'failed',
        errorMessage: 'Target channel is not registered or inactive.',
        createdBy: params.createdBy,
      });
      return { success: false, record: failed, error: failed.errorMessage };
    }

    let permissionCheck: ChannelPermissionCheckResult | undefined;
    if (!params.skipPermissionPrecheck) {
      permissionCheck = await this.verifyChannelPermissions(channel.id);
      if (!permissionCheck.ok) {
        const failed = await this.repo.recordPublication({
          channelId: channel.id,
          channelUsername: channel.username,
          category: params.category,
          language: params.language,
          textPreview: params.templateText.slice(0, 280),
          idempotencyKey: params.idempotencyKey,
          status: 'failed',
          errorMessage: permissionCheck.reason,
          createdBy: params.createdBy,
        });
        await this.repo.appendAuditLog({
          actorTelegramId: params.createdBy,
          actorRole: 'admin',
          action: 'publication_blocked_no_channel_rights',
          targetType: 'publication',
          targetId: failed.id,
          metadata: { channelUsername: channel.username },
        });
        return {
          success: false,
          record: failed,
          permissionCheck,
          error: permissionCheck.reason,
        };
      }
    }

    const finalTemplate = [channel.templateHeader, params.templateText, channel.templateFooter]
      .filter(Boolean)
      .join('\n\n');
    const formatted = this.emojiRegistry.formatMessage(finalTemplate);
    const targetChat = channel.chatId || channel.username;
    let sendRes = await this.apiClient.sendMessage({
      chat_id: targetChat,
      text: formatted.text,
      ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
      disable_web_page_preview: true,
    });

    // Safe single retry on transient 429 flood error
    let retryCount = 0;
    if (!sendRes.ok && sendRes.error_code === 429 && sendRes.parameters?.retry_after) {
      retryCount = 1;
      await new Promise((r) => setTimeout(r, Math.min(5000, sendRes.parameters!.retry_after! * 1000)));
      sendRes = await this.apiClient.sendMessage({
        chat_id: targetChat,
        text: formatted.text,
        ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
        disable_web_page_preview: true,
      });
    }

    const record = await this.repo.recordPublication({
      channelId: channel.id,
      channelUsername: channel.username,
      category: params.category,
      language: params.language,
      textPreview: formatted.text.slice(0, 280),
      telegramMessageId: sendRes.result?.message_id,
      idempotencyKey: params.idempotencyKey,
      retryCount,
      status: sendRes.ok ? 'sent' : 'failed',
      errorMessage: sendRes.ok ? undefined : sendRes.description || 'Send failed',
      createdBy: params.createdBy,
      sentAt: sendRes.ok ? new Date().toISOString() : undefined,
    });

    await this.repo.appendAuditLog({
      actorTelegramId: params.createdBy,
      actorRole: 'admin',
      action: sendRes.ok ? 'publication_sent' : 'publication_failed',
      targetType: 'publication',
      targetId: record.id,
      metadata: {
        channelUsername: channel.username,
        category: params.category,
        usedCustomEmojis: formatted.usedCustomEmojiCount,
      },
    });

    return {
      success: sendRes.ok,
      record,
      permissionCheck,
      error: record.errorMessage,
    };
  }

  async publishPrayerScheduleToChannel(params: {
    channelId: string;
    prayerAdapter: TelegramPrayerAdapter;
    createdBy: string;
    idempotencyKey?: string;
  }) {
    const channel = this.repo.getChannel(params.channelId);
    const language: TelegramLocale = channel?.language || 'uz-Latn';
    const templateText = params.prayerAdapter.buildPrayerScheduleTemplate(language);
    return this.publishToChannel({
      channelId: params.channelId,
      category: 'prayer_times',
      language,
      templateText,
      createdBy: params.createdBy,
      idempotencyKey: params.idempotencyKey,
    });
  }
}
