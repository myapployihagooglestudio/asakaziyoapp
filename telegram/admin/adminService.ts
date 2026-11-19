/**
 * ASAKA ZIYO — Isolated Telegram Admin & RBAC Service
 *
 * Resolves Telegram platform roles (`owner`, `admin`, `editor`, `moderator`) from
 * environment configuration (`TELEGRAM_OWNER_ID`, `TELEGRAM_ADMIN_IDS`) and the
 * isolated `telegramAdmins` collection without modifying existing Web Admin RBAC.
 */

import { TelegramAdminRecord, TelegramAdminRole, TelegramAuditLogRecord } from '../types';
import { TelegramPlatformConfig } from '../config';
import { TelegramRepository } from '../database/telegramRepository';
import { isTelegramAdminFromConfig, isTelegramOwner } from '../middlewares/securityMiddleware';

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
    return Boolean(stored?.isActive && stored.permissions.includes(permission));
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
      permissions:
        target.permissions ||
        (target.role === 'editor'
          ? ['publish_channel', 'view_stats']
          : target.role === 'moderator'
            ? ['moderate_users', 'view_stats']
            : ['manage_all']),
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

  listAdmins(): TelegramAdminRecord[] {
    return this.repo.listAdmins();
  }

  listAuditLogs(limit = 50): TelegramAuditLogRecord[] {
    return this.repo.listAuditLogs(limit);
  }
}
