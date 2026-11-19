/**
 * ASAKA ZIYO — Telegram User Registration & Preference Service
 *
 * Manages Telegram user records and 5-language preferences strictly inside
 * the isolated `telegramUsers` collection without ever touching Web App user records.
 */

import { TelegramApiUser, TelegramLocale, TelegramUserRecord } from '../types';
import { TelegramRepository } from '../database/telegramRepository';
import { normalizeTelegramLocale } from '../locales';

export class TelegramUserService {
  private readonly repo: TelegramRepository;

  constructor(repo: TelegramRepository) {
    this.repo = repo;
  }

  /**
   * Ensures a Telegram user exists in `telegramUsers`, updating activity metadata
   * while preserving any manually chosen language preference.
   */
  async registerOrTouchUser(apiUser: TelegramApiUser): Promise<{
    user: TelegramUserRecord;
    isNew: boolean;
  }> {
    const id = String(apiUser.id);
    const nowIso = new Date().toISOString();
    const existing = this.repo.getUser(id);

    if (existing) {
      const updated: TelegramUserRecord = {
        ...existing,
        username: apiUser.username ?? existing.username,
        firstName: apiUser.first_name || existing.firstName || 'User',
        lastName: apiUser.last_name ?? existing.lastName,
        updatedAt: nowIso,
        lastActiveAt: nowIso,
        interactionCount: (existing.interactionCount || 0) + 1,
      };
      await this.repo.saveUser(updated);
      return { user: updated, isNew: false };
    }

    const defaultLang = this.repo.getSettings().defaultLanguage || 'uz-Latn';
    const inferredLocale = normalizeTelegramLocale(apiUser.language_code, defaultLang);

    const created: TelegramUserRecord = {
      telegramId: id,
      username: apiUser.username,
      firstName: apiUser.first_name || 'User',
      lastName: apiUser.last_name,
      language: inferredLocale,
      languageSelectedManually: false,
      prayerNotificationsEnabled: true,
      dailyWisdomEnabled: true,
      announcementsEnabled: true,
      isBlocked: false,
      createdAt: nowIso,
      updatedAt: nowIso,
      lastActiveAt: nowIso,
      interactionCount: 1,
    };

    await this.repo.saveUser(created);
    await this.repo.appendAuditLog({
      actorTelegramId: id,
      actorRole: 'user',
      action: 'user_registered',
      targetType: 'user',
      targetId: id,
      metadata: { initialLanguage: inferredLocale },
    });

    return { user: created, isNew: true };
  }

  async setUserLanguage(telegramId: string, locale: TelegramLocale): Promise<TelegramUserRecord | null> {
    const existing = this.repo.getUser(telegramId);
    if (!existing) return null;

    const nowIso = new Date().toISOString();
    const updated: TelegramUserRecord = {
      ...existing,
      language: locale,
      languageSelectedManually: true,
      updatedAt: nowIso,
      lastActiveAt: nowIso,
    };
    await this.repo.saveUser(updated);
    await this.repo.appendAuditLog({
      actorTelegramId: telegramId,
      actorRole: 'user',
      action: 'language_updated',
      targetType: 'user',
      targetId: telegramId,
      metadata: { language: locale },
    });
    return updated;
  }

  async toggleSetting(
    telegramId: string,
    field: 'prayerNotificationsEnabled' | 'dailyWisdomEnabled' | 'announcementsEnabled'
  ): Promise<TelegramUserRecord | null> {
    const existing = this.repo.getUser(telegramId);
    if (!existing) return null;

    const nowIso = new Date().toISOString();
    const nextValue = !existing[field];
    const updated: TelegramUserRecord = {
      ...existing,
      [field]: nextValue,
      updatedAt: nowIso,
      lastActiveAt: nowIso,
    };
    await this.repo.saveUser(updated);
    await this.repo.appendAuditLog({
      actorTelegramId: telegramId,
      actorRole: 'user',
      action: 'user_setting_toggled',
      targetType: 'user',
      targetId: telegramId,
      metadata: { field, enabled: nextValue },
    });
    return updated;
  }

  getUser(telegramId: string): TelegramUserRecord | null {
    return this.repo.getUser(telegramId);
  }
}
