/**
 * ASAKA ZIYO — Isolated Telegram Channel Configuration Service
 *
 * Manages official channel registrations (@Asaka_Ziyo, @muhiddinsahhofuz, etc.)
 * inside the isolated `telegramChannels` collection.
 */

import { TelegramChannelRecord, TelegramLocale } from '../types';
import { TelegramRepository } from '../database/telegramRepository';

export class TelegramChannelService {
  private readonly repo: TelegramRepository;

  constructor(repo: TelegramRepository) {
    this.repo = repo;
  }

  listChannels(): TelegramChannelRecord[] {
    return this.repo.listChannels();
  }

  listActiveChannels(): TelegramChannelRecord[] {
    return this.repo.listChannels().filter((c) => c.isActive);
  }

  getPrimaryChannel(): TelegramChannelRecord | null {
    const all = this.repo.listChannels();
    return all.find((c) => c.isPrimary && c.isActive) || all[0] || null;
  }

  async upsertChannel(
    actorTelegramId: string,
    input: {
      id: string;
      username: string;
      title: string;
      chatId?: string;
      isPrimary?: boolean;
      isActive?: boolean;
      autoPublishPrayerTimes?: boolean;
      autoPublishAnnouncements?: boolean;
      autoPublishWisdom?: boolean;
      language?: TelegramLocale;
    }
  ): Promise<TelegramChannelRecord> {
    const nowIso = new Date().toISOString();
    const existing = this.repo.getChannel(input.id);
    const normalizedUsername =
      input.username.startsWith('@') || /^-?\d+$/.test(input.username)
        ? input.username
        : `@${input.username}`;

    const record: TelegramChannelRecord = {
      id: input.id,
      username: normalizedUsername,
      chatId: input.chatId ?? existing?.chatId,
      title: input.title,
      isPrimary: input.isPrimary ?? existing?.isPrimary ?? false,
      isActive: input.isActive ?? existing?.isActive ?? true,
      autoPublishPrayerTimes:
        input.autoPublishPrayerTimes ?? existing?.autoPublishPrayerTimes ?? false,
      autoPublishAnnouncements:
        input.autoPublishAnnouncements ?? existing?.autoPublishAnnouncements ?? false,
      autoPublishWisdom:
        input.autoPublishWisdom ?? existing?.autoPublishWisdom ?? false,
      language: input.language ?? existing?.language ?? 'uz-Latn',
      createdAt: existing?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    await this.repo.saveChannel(record);
    await this.repo.appendAuditLog({
      actorTelegramId,
      actorRole: 'admin',
      action: existing ? 'channel_updated' : 'channel_created',
      targetType: 'channel',
      targetId: record.id,
      metadata: { username: record.username, isActive: record.isActive },
    });

    return record;
  }

  async removeChannel(actorTelegramId: string, channelId: string): Promise<boolean> {
    const existing = this.repo.getChannel(channelId);
    const deleted = await this.repo.deleteChannel(channelId);
    if (deleted) {
      await this.repo.appendAuditLog({
        actorTelegramId,
        actorRole: 'admin',
        action: 'channel_removed',
        targetType: 'channel',
        targetId: channelId,
        metadata: { username: existing?.username || channelId },
      });
    }
    return deleted;
  }
}
