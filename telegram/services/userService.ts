/**
 * ASAKA ZIYO — Telegram User Registration, Onboarding, Preference & Opt-Out Service
 *
 * Manages Telegram user records strictly inside `telegramUsers` without
 * touching existing Web App user records.
 */

import {
  TelegramApiUser,
  TelegramLocale,
  TelegramNotificationHistoryEntry,
  TelegramPrayerNotificationKey,
  TelegramUserFlowState,
  TelegramUserNotificationPreferences,
  TelegramUserRecord,
} from '../types';
import { TelegramRepository } from '../database/telegramRepository';
import { normalizeTelegramLocale } from '../locales';
import { isUserProfileRegistered, validateProfileName } from './profileValidation';

export function createDefaultNotificationPreferences(
  legacy?: Partial<Pick<TelegramUserRecord, 'prayerNotificationsEnabled' | 'dailyWisdomEnabled' | 'announcementsEnabled'>>
): TelegramUserNotificationPreferences {
  const prayerOn = legacy?.prayerNotificationsEnabled ?? true;
  const wisdomOn = legacy?.dailyWisdomEnabled ?? true;
  const annOn = legacy?.announcementsEnabled ?? true;
  return {
    prayers: {
      tahajjud: false,
      subh: false,
      bomdod: prayerOn,
      peshin: prayerOn,
      asr: prayerOn,
      shom: prayerOn,
      xufton: prayerOn,
      juma: prayerOn,
    },
    leadMinutes: [0],
    customLeadMinutes: null,
    timezone: 'Asia/Tashkent',
    adhanAudioTrackId: 'none',
    quietHoursEnabled: false,
    quietHoursStart: null,
    quietHoursEnd: null,
    dailyBriefEnabled: wisdomOn,
    verseOfDayEnabled: wisdomOn,
    hadithOfDayEnabled: wisdomOn,
    dhikrReminderEnabled: wisdomOn,
    hifzMurojaaEnabled: true,
    hifzNewEnabled: true,
    newContentEnabled: annOn,
    quranAudioUpdatesEnabled: annOn,
    appUpdatesEnabled: annOn,
    botUpdatesEnabled: annOn,
    adminRepliesEnabled: true,
  };
}

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
      const confirmedProfile = isUserProfileRegistered(existing);
      const updated: TelegramUserRecord = {
        ...existing,
        username: apiUser.username ?? existing.username,
        telegramFirstName: apiUser.first_name || existing.telegramFirstName || existing.firstName,
        telegramLastName: apiUser.last_name ?? existing.telegramLastName,
        // Preserve user-confirmed registered names! Never overwrite them with Telegram profile fields.
        firstName: confirmedProfile
          ? existing.registeredFirstName || existing.firstName
          : apiUser.first_name || existing.firstName || 'User',
        lastName: confirmedProfile
          ? existing.registeredLastName ?? existing.lastName
          : apiUser.last_name ?? existing.lastName,
        updatedAt: nowIso,
        lastActiveAt: nowIso,
        interactionCount: (existing.interactionCount || 0) + 1,
      };
      // Persist locally immediately; sync routine lastActiveAt touch to Firestore asynchronously
      // so every Telegram button tap does not stall on a synchronous network round-trip.
      void this.repo.saveUser(updated).catch(() => {});
      return { user: updated, isNew: false };
    }

    const defaultLang = this.repo.getSettings().defaultLanguage || 'uz-Latn';
    const inferredLocale = normalizeTelegramLocale(apiUser.language_code, defaultLang);

    const created: TelegramUserRecord = {
      telegramId: id,
      username: apiUser.username,
      firstName: apiUser.first_name || 'User',
      lastName: apiUser.last_name,
      telegramFirstName: apiUser.first_name || 'User',
      telegramLastName: apiUser.last_name,
      profileCompleted: false,
      language: inferredLocale,
      languageSelectedManually: false,
      prayerNotificationsEnabled: true,
      dailyWisdomEnabled: true,
      announcementsEnabled: true,
      notificationPreferences: createDefaultNotificationPreferences(),
      notificationHistory: [],
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

  async completeProfileRegistration(
    telegramId: string,
    rawFirstName: string,
    rawLastName: string
  ): Promise<{ ok: boolean; user?: TelegramUserRecord; errorCode?: string }> {
    const existing = this.repo.getUser(telegramId);
    if (!existing) return { ok: false, errorCode: 'USER_NOT_FOUND' };

    const firstVal = validateProfileName(rawFirstName);
    if (!firstVal.ok) return { ok: false, errorCode: `FIRST_${firstVal.errorCode}` };

    const lastVal = validateProfileName(rawLastName);
    if (!lastVal.ok) return { ok: false, errorCode: `LAST_${lastVal.errorCode}` };

    const nowIso = new Date().toISOString();
    const isInitialRegistration = !existing.profileCompleted;
    const updated: TelegramUserRecord = {
      ...existing,
      registeredFirstName: firstVal.value,
      registeredLastName: lastVal.value,
      firstName: firstVal.value,
      lastName: lastVal.value,
      profileCompleted: true,
      onboardingCompleted: true,
      profileRegisteredAt: existing.profileRegisteredAt || nowIso,
      profileUpdatedAt: nowIso,
      activeFlow: { type: 'idle' },
      updatedAt: nowIso,
      lastActiveAt: nowIso,
    };
    await this.repo.saveUser(updated);
    await this.repo.appendAuditLog({
      actorTelegramId: telegramId,
      actorRole: 'user',
      action: isInitialRegistration ? 'profile_registration_completed' : 'profile_name_updated',
      targetType: 'user',
      targetId: telegramId,
      metadata: { profileCompleted: true },
    });
    return { ok: true, user: updated };
  }

  async updateProfileName(
    telegramId: string,
    rawFirstName: string,
    rawLastName: string
  ): Promise<{ ok: boolean; user?: TelegramUserRecord; errorCode?: string }> {
    return this.completeProfileRegistration(telegramId, rawFirstName, rawLastName);
  }

  getEffectiveNotificationPreferences(user: TelegramUserRecord): TelegramUserNotificationPreferences {
    const base = createDefaultNotificationPreferences(user);
    if (!user.notificationPreferences) return base;
    const raw = user.notificationPreferences;
    const leadMinutes = Array.isArray(raw.leadMinutes)
      ? Array.from(new Set(raw.leadMinutes.filter((n) => Number.isFinite(n) && n >= 0 && n <= 120))).sort((a, b) => b - a)
      : base.leadMinutes;
    const quietEnabled =
      typeof raw.quietHoursEnabled === 'boolean'
        ? raw.quietHoursEnabled
        : Boolean(raw.quietHoursStart && raw.quietHoursEnd);
    return {
      ...base,
      ...raw,
      leadMinutes,
      timezone: raw.timezone || 'Asia/Tashkent',
      quietHoursEnabled: quietEnabled,
      prayers: {
        ...base.prayers,
        ...(raw.prayers || {}),
      },
    };
  }

  getNotificationPreferences(telegramId: string): TelegramUserNotificationPreferences {
    const user = this.repo.getUser(telegramId);
    if (!user) {
      return createDefaultNotificationPreferences({
        prayerNotificationsEnabled: true,
        dailyWisdomEnabled: true,
        announcementsEnabled: true,
      } as TelegramUserRecord);
    }
    return this.getEffectiveNotificationPreferences(user);
  }

  async togglePrayerNotification(
    telegramId: string,
    prayerKey: TelegramPrayerNotificationKey
  ): Promise<TelegramUserRecord | null> {
    const existing = this.repo.getUser(telegramId);
    if (!existing) return null;
    const prefs = this.getEffectiveNotificationPreferences(existing);
    const nextVal = !prefs.prayers[prayerKey];
    prefs.prayers[prayerKey] = nextVal;
    const anyPrayerEnabled = Object.values(prefs.prayers).some(Boolean);
    const updated: TelegramUserRecord = {
      ...existing,
      prayerNotificationsEnabled: anyPrayerEnabled,
      notificationPreferences: prefs,
      stoppedByUser: nextVal ? false : existing.stoppedByUser,
      updatedAt: new Date().toISOString(),
    };
    await this.repo.saveUser(updated);
    return updated;
  }

  async toggleLeadMinute(telegramId: string, minutes: number): Promise<TelegramUserRecord | null> {
    const existing = this.repo.getUser(telegramId);
    if (!existing) return null;
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 120) return existing;
    const prefs = this.getEffectiveNotificationPreferences(existing);
    const set = new Set<number>(prefs.leadMinutes || [0]);
    if (set.has(minutes)) {
      set.delete(minutes);
    } else {
      set.add(minutes);
    }
    prefs.leadMinutes = Array.from(set).sort((a, b) => b - a);
    const updated: TelegramUserRecord = {
      ...existing,
      notificationPreferences: prefs,
      updatedAt: new Date().toISOString(),
    };
    await this.repo.saveUser(updated);
    return updated;
  }

  async toggleNotificationLeadMinute(
    telegramId: string,
    minutes: number
  ): Promise<TelegramUserRecord | null> {
    return this.toggleLeadMinute(telegramId, minutes);
  }

  async toggleNotificationLeadMinutes(
    telegramId: string,
    minutes: number
  ): Promise<TelegramUserRecord | null> {
    return this.toggleLeadMinute(telegramId, minutes);
  }

  async setCustomLeadMinutes(
    telegramId: string,
    minutes: number | null
  ): Promise<{ ok: boolean; user?: TelegramUserRecord; error?: string }> {
    const existing = this.repo.getUser(telegramId);
    if (!existing) return { ok: false, error: 'USER_NOT_FOUND' };
    if (minutes !== null && (!Number.isInteger(minutes) || minutes < 1 || minutes > 120)) {
      return { ok: false, error: 'Custom lead time must be an integer between 1 and 120 minutes.' };
    }
    const prefs = this.getEffectiveNotificationPreferences(existing);
    prefs.customLeadMinutes = minutes;
    const updated: TelegramUserRecord = {
      ...existing,
      notificationPreferences: prefs,
      activeFlow: { type: 'idle' },
      updatedAt: new Date().toISOString(),
    };
    await this.repo.saveUser(updated);
    return { ok: true, user: updated };
  }

  async toggleNotificationPref(
    telegramId: string,
    key:
      | 'dailyBriefEnabled'
      | 'verseOfDayEnabled'
      | 'hadithOfDayEnabled'
      | 'dhikrReminderEnabled'
      | 'hifzMurojaaEnabled'
      | 'hifzNewEnabled'
      | 'newContentEnabled'
      | 'quranAudioUpdatesEnabled'
      | 'appUpdatesEnabled'
      | 'botUpdatesEnabled'
      | 'adminRepliesEnabled'
  ): Promise<TelegramUserRecord | null> {
    const existing = this.repo.getUser(telegramId);
    if (!existing) return null;
    const prefs = this.getEffectiveNotificationPreferences(existing);
    const nextVal = !Boolean(prefs[key]);
    prefs[key] = nextVal;
    const updated: TelegramUserRecord = {
      ...existing,
      dailyWisdomEnabled:
        key === 'dailyBriefEnabled' || key === 'hadithOfDayEnabled' || key === 'verseOfDayEnabled'
          ? Boolean(prefs.dailyBriefEnabled || prefs.hadithOfDayEnabled || prefs.verseOfDayEnabled)
          : existing.dailyWisdomEnabled,
      announcementsEnabled:
        key === 'newContentEnabled' || key === 'quranAudioUpdatesEnabled' || key === 'botUpdatesEnabled'
          ? Boolean(prefs.newContentEnabled || prefs.quranAudioUpdatesEnabled || prefs.botUpdatesEnabled)
          : existing.announcementsEnabled,
      notificationPreferences: prefs,
      stoppedByUser: nextVal ? false : existing.stoppedByUser,
      updatedAt: new Date().toISOString(),
    };
    await this.repo.saveUser(updated);
    return updated;
  }

  async setAdhanTrack(
    telegramId: string,
    trackId: 'none' | 'makkah' | 'madinah' | 'asaka'
  ): Promise<TelegramUserRecord | null> {
    const existing = this.repo.getUser(telegramId);
    if (!existing) return null;
    const prefs = this.getEffectiveNotificationPreferences(existing);
    prefs.adhanAudioTrackId = trackId;
    const updated: TelegramUserRecord = {
      ...existing,
      notificationPreferences: prefs,
      updatedAt: new Date().toISOString(),
    };
    await this.repo.saveUser(updated);
    return updated;
  }

  async setQuietHours(
    telegramId: string,
    startHHMM: string | null,
    endHHMM: string | null
  ): Promise<TelegramUserRecord | null> {
    const existing = this.repo.getUser(telegramId);
    if (!existing) return null;
    const prefs = this.getEffectiveNotificationPreferences(existing);
    prefs.quietHoursStart = startHHMM;
    prefs.quietHoursEnd = endHHMM;
    prefs.quietHoursEnabled = Boolean(startHHMM && endHHMM);
    const updated: TelegramUserRecord = {
      ...existing,
      notificationPreferences: prefs,
      updatedAt: new Date().toISOString(),
    };
    await this.repo.saveUser(updated);
    return updated;
  }

  async recordNotificationHistory(
    telegramId: string,
    entry: {
      kind: TelegramNotificationHistoryEntry['kind'];
      title: string;
      sentAt?: string;
      dateKey?: string;
    }
  ): Promise<void> {
    const existing = this.repo.getUser(telegramId);
    if (!existing) return;
    const nowIso = entry.sentAt || new Date().toISOString();
    const nextEntry: TelegramNotificationHistoryEntry = {
      id: `notif_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      kind: entry.kind,
      title: entry.title,
      sentAt: nowIso,
      dateKey: entry.dateKey || nowIso.slice(0, 10),
    };
    const history = [nextEntry, ...(existing.notificationHistory || [])].slice(0, 40);
    await this.repo.saveUser({
      ...existing,
      notificationHistory: history,
    });
  }

  listPersonalReminders(telegramId: string) {
    const existing = this.repo.getUser(telegramId);
    return existing?.personalReminders || [];
  }

  async addPersonalReminder(
    telegramId: string,
    arg1: string,
    arg2: string
  ): Promise<{ ok: boolean; user?: TelegramUserRecord; error?: string }> {
    const existing = this.repo.getUser(telegramId);
    if (!existing) return { ok: false, error: 'USER_NOT_FOUND' };
    // Accept either (timeHHMM, label) or (label, timeHHMM) cleanly
    const isArg1Time = /^([01]?\d|2[0-3]):[0-5]\d$/.test(arg1.trim());
    const rawTime = isArg1Time ? arg1.trim() : arg2.trim();
    const rawLabel = isArg1Time ? arg2.trim() : arg1.trim();
    const m = rawTime.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (!m) {
      return { ok: false, error: 'Invalid time format. Use HH:MM (e.g. 06:30 or 21:00).' };
    }
    const cleanTime = `${m[1].padStart(2, '0')}:${m[2]}`;
    const cleanLabel = rawLabel.slice(0, 80);
    if (cleanLabel.length < 2) {
      return { ok: false, error: 'Reminder title is too short.' };
    }
    const current = existing.personalReminders || [];
    if (current.length >= 10) {
      return { ok: false, error: 'Maximum 10 personal reminders reached.' };
    }
    const next = [
      ...current,
      {
        id: `rem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
        timeHHMM: cleanTime,
        label: cleanLabel,
        enabled: true,
        createdAt: new Date().toISOString(),
      },
    ];
    const updated: TelegramUserRecord = {
      ...existing,
      personalReminders: next,
      activeFlow: { type: 'idle' },
      updatedAt: new Date().toISOString(),
    };
    await this.repo.saveUser(updated);
    return { ok: true, user: updated };
  }

  async togglePersonalReminder(telegramId: string, reminderId: string): Promise<TelegramUserRecord | null> {
    const existing = this.repo.getUser(telegramId);
    if (!existing) return null;
    const next = (existing.personalReminders || []).map((r) =>
      r.id === reminderId ? { ...r, enabled: !r.enabled } : r
    );
    const updated: TelegramUserRecord = {
      ...existing,
      personalReminders: next,
      updatedAt: new Date().toISOString(),
    };
    await this.repo.saveUser(updated);
    return updated;
  }

  async deletePersonalReminder(telegramId: string, reminderId: string): Promise<TelegramUserRecord | null> {
    const existing = this.repo.getUser(telegramId);
    if (!existing) return null;
    const next = (existing.personalReminders || []).filter((r) => r.id !== reminderId);
    const updated: TelegramUserRecord = {
      ...existing,
      personalReminders: next,
      updatedAt: new Date().toISOString(),
    };
    await this.repo.saveUser(updated);
    return updated;
  }

  /**
   * Privacy-isolated personal data export for a single Telegram user.
   * Never includes other users' data, tokens, or admin secrets.
   */
  exportUserProfileJson(telegramId: string, hifzProfile?: unknown): string | null {
    const user = this.repo.getUser(telegramId);
    if (!user) return null;
    const engagement = this.repo.getUserEngagement(telegramId);
    const tickets = this.repo.listSupportTickets().filter((t) => t.userId === telegramId);
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        platform: 'ASAKA ZIYO Telegram Bot',
        profile: {
          telegramId: user.telegramId,
          username: user.username || null,
          registeredFirstName: user.registeredFirstName || null,
          registeredLastName: user.registeredLastName || null,
          firstName: user.firstName,
          lastName: user.lastName || null,
          language: user.language,
          profileCompleted: Boolean(user.profileCompleted),
          createdAt: user.createdAt,
          lastActiveAt: user.lastActiveAt,
          interactionCount: user.interactionCount,
        },
        notificationPreferences: this.getEffectiveNotificationPreferences(user),
        personalReminders: user.personalReminders || [],
        notificationHistory: (user.notificationHistory || []).slice(0, 30),
        engagement: engagement || null,
        supportTickets: tickets.map((t) => ({
          id: t.id,
          category: t.category,
          status: t.status,
          subject: t.subject,
          message: t.messages[0]?.text || t.subject,
          createdAt: t.createdAt,
        })),
        hifzProfile: hifzProfile || null,
      },
      null,
      2
    );
  }

  getRegistrationStats(): {
    totalUsers: number;
    registeredProfiles: number;
    unregisteredUsers: number;
    registeredLast7d: number;
    activeLast7d: number;
  } {
    const users = this.repo.listUsers();
    const weekAgo = Date.now() - 7 * 86_400_000;
    let registeredProfiles = 0;
    let registeredLast7d = 0;
    let activeLast7d = 0;
    for (const u of users) {
      if (isUserProfileRegistered(u)) {
        registeredProfiles++;
        const regMs = Date.parse(u.profileRegisteredAt || u.createdAt || '');
        if (regMs && regMs >= weekAgo) registeredLast7d++;
      }
      const actMs = Date.parse(u.lastActiveAt || u.updatedAt || '');
      if (actMs && actMs >= weekAgo) activeLast7d++;
    }
    return {
      totalUsers: users.length,
      registeredProfiles,
      unregisteredUsers: Math.max(0, users.length - registeredProfiles),
      registeredLast7d,
      activeLast7d,
    };
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
        const hay = `${u.telegramId} ${u.username || ''} ${u.registeredFirstName || ''} ${u.registeredLastName || ''} ${u.firstName} ${u.lastName || ''}`.toLowerCase();
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
