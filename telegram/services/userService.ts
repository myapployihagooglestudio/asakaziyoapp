/**
 * ASAKA ZIYO — Telegram User Registration, Onboarding, Preference & Opt-Out Service
 *
 * Manages Telegram user records strictly inside `telegramUsers` without
 * touching existing Web App user records.
 */

import {
  TelegramApiUser,
  TelegramLocale,
  TelegramUserFlowState,
  TelegramUserRecord,
} from '../types';
import { TelegramRepository } from '../database/telegramRepository';
import { normalizeTelegramLocale } from '../locales';

export interface UserSearchFilter {
  query?: string;
  language?: TelegramLocale;
  onlyBlocked?: boolean;
  onlyOptIn?: boolean;
  activeWithinDays?: number;
}

export class TelegramUserService {
  private readonly repo: TelegramRepository;

  constructor(repo: TelegramRepository) {
    this.repo = repo;
  }

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
      onboardingCompleted: false,
      stoppedByUser: false,
      activeFlow: { type: 'idle' },
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
      onboardingCompleted: true,
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

  async markOnboardingComplete(telegramId: string): Promise<TelegramUserRecord | null> {
    const existing = this.repo.getUser(telegramId);
    if (!existing || existing.onboardingCompleted) return existing;
    const updated: TelegramUserRecord = {
      ...existing,
      onboardingCompleted: true,
      updatedAt: new Date().toISOString(),
    };
    await this.repo.saveUser(updated);
    return updated;
  }

  async setActiveFlow(
    telegramId: string,
    flow: TelegramUserFlowState
  ): Promise<TelegramUserRecord | null> {
    const existing = this.repo.getUser(telegramId);
    if (!existing) return null;
    const updated: TelegramUserRecord = {
      ...existing,
      activeFlow: flow,
      updatedAt: new Date().toISOString(),
    };
    await this.repo.saveUser(updated);
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
      stoppedByUser: nextValue ? false : existing.stoppedByUser,
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

  async optOutAllNotifications(telegramId: string): Promise<TelegramUserRecord | null> {
    const existing = this.repo.getUser(telegramId);
    if (!existing) return null;
    const nowIso = new Date().toISOString();
    const updated: TelegramUserRecord = {
      ...existing,
      prayerNotificationsEnabled: false,
      dailyWisdomEnabled: false,
      announcementsEnabled: false,
      stoppedByUser: true,
      stoppedAt: nowIso,
      updatedAt: nowIso,
    };
    await this.repo.saveUser(updated);
    await this.repo.appendAuditLog({
      actorTelegramId: telegramId,
      actorRole: 'user',
      action: 'user_opted_out_all',
      targetType: 'user',
      targetId: telegramId,
    });
    return updated;
  }

  async setUserBlocked(
    actorTelegramId: string,
    targetTelegramId: string,
    blocked: boolean
  ): Promise<TelegramUserRecord | null> {
    const existing = this.repo.getUser(targetTelegramId);
    if (!existing) return null;
    const updated: TelegramUserRecord = {
      ...existing,
      isBlocked: blocked,
      updatedAt: new Date().toISOString(),
    };
    await this.repo.saveUser(updated);
    await this.repo.appendAuditLog({
      actorTelegramId,
      actorRole: 'admin',
      action: blocked ? 'user_blocked' : 'user_unblocked',
      targetType: 'user',
      targetId: targetTelegramId,
    });
    return updated;
  }

  searchUsers(filter: UserSearchFilter = {}): TelegramUserRecord[] {
    const now = Date.now();
    const q = (filter.query || '').trim().toLowerCase();
    return this.repo.listUsers().filter((u) => {
      if (filter.language && u.language !== filter.language) return false;
      if (filter.onlyBlocked && !u.isBlocked) return false;
      if (filter.onlyOptIn && (u.isBlocked || u.stoppedByUser || !u.announcementsEnabled)) {
        return false;
      }
      if (filter.activeWithinDays && filter.activeWithinDays > 0) {
        const lastMs = Date.parse(u.lastActiveAt || u.updatedAt || '');
        if (!lastMs || now - lastMs > filter.activeWithinDays * 86_400_000) return false;
      }
      if (q) {
        const hay = `${u.telegramId} ${u.username || ''} ${u.firstName} ${u.lastName || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  exportUsersCsv(): string {
    const header = [
      'telegramId',
      'username',
      'firstName',
      'lastName',
      'language',
      'prayerNotifications',
      'dailyWisdom',
      'announcements',
      'isBlocked',
      'stoppedByUser',
      'interactionCount',
      'createdAt',
      'lastActiveAt',
    ].join(',');
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = this.repo.listUsers().map((u) =>
      [
        u.telegramId,
        u.username || '',
        u.firstName,
        u.lastName || '',
        u.language,
        u.prayerNotificationsEnabled,
        u.dailyWisdomEnabled,
        u.announcementsEnabled,
        u.isBlocked,
        Boolean(u.stoppedByUser),
        u.interactionCount,
        u.createdAt,
        u.lastActiveAt,
      ]
        .map(esc)
        .join(',')
    );
    return [header, ...rows].join('\n');
  }

  getUser(telegramId: string): TelegramUserRecord | null {
    return this.repo.getUser(telegramId);
  }
}
