/**
 * ASAKA ZIYO — Telegram Channel Publishing & History Service
 *
 * Formats outgoing channel publications using CustomEmojiRegistry (with safe Unicode fallback),
 * dispatches via TelegramApiClient, and records full history in `telegramPublications`.
 */

import { TelegramLocale, TelegramPublicationRecord } from '../types';
import { TelegramApiClient } from '../api/telegramApiClient';
import { CustomEmojiRegistry } from '../emoji/customEmojiRegistry';
import { TelegramRepository } from '../database/telegramRepository';

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

  async publishToChannel(params: {
    channelId: string;
    category: TelegramPublicationRecord['category'];
    language: TelegramLocale;
    templateText: string;
    createdBy: string;
  }): Promise<{ success: boolean; record: TelegramPublicationRecord; error?: string }> {
    const channel = this.repo.getChannel(params.channelId);
    if (!channel || !channel.isActive) {
      const failed = await this.repo.recordPublication({
        channelId: params.channelId,
        channelUsername: channel?.username || params.channelId,
        category: params.category,
        language: params.language,
        textPreview: params.templateText.slice(0, 280),
        status: 'failed',
        errorMessage: 'Target channel is not registered or inactive.',
        createdBy: params.createdBy,
      });
      return { success: false, record: failed, error: failed.errorMessage };
    }

    const formatted = this.emojiRegistry.formatMessage(params.templateText);
    const targetChat = channel.chatId || channel.username;
    const sendRes = await this.apiClient.sendMessage({
      chat_id: targetChat,
      text: formatted.text,
      ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
      disable_web_page_preview: true,
    });

    const record = await this.repo.recordPublication({
      channelId: channel.id,
      channelUsername: channel.username,
      category: params.category,
      language: params.language,
      textPreview: formatted.text.slice(0, 280),
      telegramMessageId: sendRes.result?.message_id,
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
      error: record.errorMessage,
    };
  }
}
