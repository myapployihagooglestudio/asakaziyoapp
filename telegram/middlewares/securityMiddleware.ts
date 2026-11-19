/**
 * ASAKA ZIYO — Telegram Platform Security Middleware & Validation Helpers
 *
 * - Timing-safe verification of X-Telegram-Bot-Api-Secret-Token webhook header
 * - Strict update payload validation & sanitization
 * - Owner / Admin RBAC authorization helper
 */

import crypto from 'crypto';
import { TelegramApiUpdate } from '../types';
import { TelegramPlatformConfig } from '../config';

export function safeCompareSecret(provided: string | undefined, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function verifyWebhookSecretHeader(
  headerValue: string | string[] | undefined,
  config: TelegramPlatformConfig
): { valid: boolean; reason?: string } {
  if (!config.webhookSecret) {
    // Reject webhook delivery if TELEGRAM_WEBHOOK_SECRET is not configured in production
    return {
      valid: false,
      reason: 'TELEGRAM_WEBHOOK_SECRET_NOT_CONFIGURED',
    };
  }
  const token = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (!token) {
    return {
      valid: false,
      reason: 'MISSING_SECRET_TOKEN_HEADER',
    };
  }
  if (!safeCompareSecret(token.trim(), config.webhookSecret)) {
    return {
      valid: false,
      reason: 'INVALID_SECRET_TOKEN_HEADER',
    };
  }
  return { valid: true };
}

export function isValidTelegramUpdatePayload(body: unknown): body is TelegramApiUpdate {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
  const candidate = body as Record<string, unknown>;
  if (typeof candidate.update_id !== 'number' || !Number.isFinite(candidate.update_id)) {
    return false;
  }
  return true;
}

export function isTelegramOwner(telegramId: string | number, config: TelegramPlatformConfig): boolean {
  if (!config.ownerId) return false;
  return String(telegramId) === config.ownerId;
}

export function isTelegramAdminFromConfig(
  telegramId: string | number,
  config: TelegramPlatformConfig
): boolean {
  const idStr = String(telegramId);
  return isTelegramOwner(idStr, config) || config.adminIds.includes(idStr);
}

export function sanitizeTelegramInputText(raw: string | undefined, maxLen = 1024): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLen);
}
