/**
 * ASAKA ZIYO — Isolated Telegram Admin, 7-Role RBAC & Analytics Service
 *
 * Roles: owner | admin | editor | moderator | content_manager | support_manager | analyst
 */

import {
  TELEGRAM_SUPPORTED_LOCALES,
  TelegramAdminRecord,
  TelegramAdminRole,
  TelegramAuditLogRecord,
} from '../types';
import { TelegramPlatformConfig } from '../config';
import { TelegramRepository } from '../database/telegramRepository';
import { isTelegramAdminFromConfig, isTelegramOwner } from '../middlewares/securityMiddleware';

const ROLE_DEFAULT_PERMISSIONS: Record<TelegramAdminRole, string[]> = {
  owner: ['*'],
  admin: ['*'],
  editor: ['publish_channel', 'manage_content', 'view_stats'],
  moderator: ['moderate_users', 'manage_support', 'view_stats'],
  content_manager: ['publish_channel', 'manage_content', 'manage_emojis', 'view_stats'],
  support_manager: ['manage_support', 'moderate_users', 'view_stats'],
  analyst: ['view_stats', 'export_analytics'],
};

export class TelegramAdminService {
  private readonly config: TelegramPlatformConfig;
  private readonly repo: TelegramRepository;

  constructor(config: TelegramPlatformConfig, repo: TelegramRepository) {
    this.config = config;
    this.repo = repo;
  }

  getEffectiveRole(telegramId: string | number): TelegramAdminRole | null {
    const idStr = String(telegramId);
    if (isTelegramOwner(idStr, this.config)) return 'owner';
    if (isTelegramAdminFromConfig(idStr, this.config)) return 'admin';
    const stored = this.repo.getAdmin(idStr);
    if (stored && stored.isActive) {
      return stored.role;
    }
    return null;
  }

  hasPermission(telegramId: string | number, permission: string): boolean {
    const idStr = String(telegramId);
    const role = this.getEffectiveRole(idStr);
    if (!role) return false;
    if (role === 'owner' || role === 'admin') return true;
    const stored = this.repo.getAdmin(idStr);
    if (!stored?.isActive) return false;
    if (stored.permissions.includes('*') || stored.permissions.includes('manage_all')) return true;
    return stored.permissions.includes(permission);
  }

  async grantAdminRole(
    actorTelegramId: string,
    target: {
      telegramId: string;
      role: TelegramAdminRole;
      displayName: string;
      permissions?: string[];
    }
  ): Promise<TelegramAdminRecord> {
    const nowIso = new Date().toISOString();
    const existing = this.repo.getAdmin(target.telegramId);
    const record: TelegramAdminRecord = {
      telegramId: target.telegramId,
      role: target.role,
      displayName: target.displayName,
      isActive: true,
      permissions: target.permissions || ROLE_DEFAULT_PERMISSIONS[target.role] || ['view_stats'],
      createdAt: existing?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    await this.repo.saveAdmin(record);
    await this.repo.appendAuditLog({
      actorTelegramId,
      actorRole: this.getEffectiveRole(actorTelegramId) || 'admin',
      action: 'admin_role_updated',
      targetType: 'admin',
      targetId: target.telegramId,
      metadata: { role: target.role },
    });
    return record;
  }

  getDashboardAnalytics() {
    const users = this.repo.listUsers();
    const now = Date.now();
    const dayAgo = now - 86_400_000;
    const weekAgo = now - 7 * 86_400_000;

    const byLanguage: Record<string, number> = {};
    for (const loc of TELEGRAM_SUPPORTED_LOCALES) byLanguage[loc] = 0;

    let activeToday = 0;
    let activeWeek = 0;
    let blockedCount = 0;
    let stoppedCount = 0;
    let prayerSubCount = 0;

    for (const u of users) {
      byLanguage[u.language] = (byLanguage[u.language] || 0) + 1;
      const last = Date.parse(u.lastActiveAt || u.updatedAt || '');
      if (last >= dayAgo) activeToday++;
      if (last >= weekAgo) activeWeek++;
      if (u.isBlocked) blockedCount++;
      if (u.stoppedByUser) stoppedCount++;
      if (u.prayerNotificationsEnabled && !u.isBlocked && !u.stoppedByUser) prayerSubCount++;
    }

    const aiLogs = this.repo.listAiLogs(500);
    const aiOk = aiLogs.filter((l) => l.ok).length;
    const aiErr = aiLogs.length - aiOk;
    const avgLatencyMs =
      aiLogs.length > 0
        ? Math.round(aiLogs.reduce((sum, l) => sum + (l.latencyMs || 0), 0) / aiLogs.length)
        : 0;

    const tickets = this.repo.listSupportTickets();
    const broadcasts = this.repo.listBroadcasts();
    const publications = this.repo.listPublications(500);

    return {
      stats: this.repo.getStats(),
      users: {
        total: users.length,
        activeToday,
        activeWeek,
        blockedCount,
        stoppedCount,
        prayerSubCount,
        byLanguage,
      },
      ai: {
        totalCalls: aiLogs.length,
        succeeded: aiOk,
        errors: aiErr,
        avgLatencyMs,
      },
      support: {
        total: tickets.length,
        open: tickets.filter((t) => t.status === 'new' || t.status === 'in_progress').length,
        answered: tickets.filter((t) => t.status === 'answered').length,
        closed: tickets.filter((t) => t.status === 'closed').length,
      },
      broadcasts: {
        total: broadcasts.length,
        completed: broadcasts.filter((b) => b.status === 'completed').length,
        runningOrPaused: broadcasts.filter((b) => b.status === 'running' || b.status === 'paused').length,
      },
      publications: {
        total: publications.length,
        sent: publications.filter((p) => p.status === 'sent').length,
        failed: publications.filter((p) => p.status === 'failed').length,
      },
      firestoreSync: this.repo.getFirestoreSyncStatus(),
    };
  }

  listAdmins(): TelegramAdminRecord[] {
    return this.repo.listAdmins();
  }

  listAuditLogs(limit = 50): TelegramAuditLogRecord[] {
    return this.repo.listAuditLogs(limit);
  }
}
