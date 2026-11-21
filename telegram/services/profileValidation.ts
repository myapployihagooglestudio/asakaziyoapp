/**
 * ASAKA ZIYO — Telegram User Profile Name Validation & Formatting Utility
 *
 * Strictly validates user-supplied First Name & Last Name across all 5 supported scripts
 * (Uzbek Latin, Uzbek Cyrillic, New Uzbek Latin ş/ç/ö/ğ, Russian, English) while rejecting
 * commands, URLs, HTML tags, digits-only, and emoji-only inputs.
 */

import { TelegramUserRecord } from '../types';

export interface ProfileNameValidationResult {
  valid: boolean;
  ok: boolean;
  sanitized: string;
  value: string;
  errorCode?: 'EMPTY' | 'TOO_SHORT' | 'TOO_LONG' | 'FORBIDDEN_PATTERN' | 'INVALID_CHARS';
}

const URL_OR_LINK_REGEX = /(https?:\/\/|www\.|t\.me\/|@[a-z0-9_]+)/i;
const HTML_TAG_REGEX = /<[^>]*>/;
// Allows Unicode letters across Latin/Cyrillic/Extended (including ş, ç, ö, ğ, ў, қ, ғ, ҳ, ё),
// single spaces, hyphens, and Uzbek apostrophe variants
const ALLOWED_NAME_REGEX = /^[\p{L}][\p{L}\s'\-ʻʼ’`]*[\p{L}]$/u;

export function validateProfileName(raw: string | undefined): ProfileNameValidationResult {
  const cleaned = String(raw || '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return { valid: false, ok: false, sanitized: '', value: '', errorCode: 'EMPTY' };
  }
  if (cleaned.startsWith('/') || URL_OR_LINK_REGEX.test(cleaned) || HTML_TAG_REGEX.test(cleaned)) {
    return { valid: false, ok: false, sanitized: '', value: '', errorCode: 'FORBIDDEN_PATTERN' };
  }
  if (cleaned.length < 2) {
    return { valid: false, ok: false, sanitized: '', value: '', errorCode: 'TOO_SHORT' };
  }
  if (cleaned.length > 64) {
    return { valid: false, ok: false, sanitized: '', value: '', errorCode: 'TOO_LONG' };
  }
  if (!ALLOWED_NAME_REGEX.test(cleaned)) {
    return { valid: false, ok: false, sanitized: '', value: '', errorCode: 'INVALID_CHARS' };
  }

  return { valid: true, ok: true, sanitized: cleaned, value: cleaned };
}

export const validateRegistrationName = validateProfileName;

/**
 * Resolves the user's authoritative display name:
 * Always prefers user-confirmed registration/profile name over raw Telegram metadata.
 */
export function getUserDisplayFullName(user: TelegramUserRecord): string {
  const first = (user.registeredFirstName || user.firstName || user.telegramFirstName || '').trim();
  const last = (user.registeredLastName || user.lastName || user.telegramLastName || '').trim();
  const combined = [first, last].filter(Boolean).join(' ').trim();
  return combined || (user.username ? `@${user.username}` : `ID ${user.telegramId}`);
}

export function getUserDisplayFirstName(user: TelegramUserRecord): string {
  return (
    (user.registeredFirstName || user.firstName || user.telegramFirstName || '').trim() ||
    (user.username ? `@${user.username}` : 'Foydalanuvchi')
  );
}

export function isUserProfileRegistered(user: TelegramUserRecord | null | undefined): boolean {
  if (!user) return false;
  return Boolean(
    user.profileCompleted &&
      user.registeredFirstName &&
      user.registeredFirstName.trim().length >= 2 &&
      user.registeredLastName &&
      user.registeredLastName.trim().length >= 2
  );
}
