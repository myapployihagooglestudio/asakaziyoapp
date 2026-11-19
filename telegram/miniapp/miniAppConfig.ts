/**
 * ASAKA ZIYO — Telegram Mini App (WebApp) Foundation & initData HMAC Verifier
 *
 * Implements the official Telegram WebApp `initData` HMAC-SHA256 verification algorithm
 * so future Mini App views can authenticate Telegram users securely without touching Web Auth.
 */

import crypto from 'crypto';
import { TelegramLocale } from '../types';
import { TelegramPlatformConfig } from '../config';

export interface VerifiedMiniAppInitData {
  valid: boolean;
  authDate?: number;
  userId?: string;
  reason?: string;
}

export function buildMiniAppEntryUrl(
  config: TelegramPlatformConfig,
  locale: TelegramLocale,
  section: 'home' | 'prayer' | 'quran' | 'masjid-tv' = 'home'
): string {
  const base = config.webAppUrl.replace(/\/+$/, '');
  if (section === 'masjid-tv') {
    return `${base}/masjid-tv`;
  }
  const hash = section === 'home' ? '' : `#${section}`;
  return `${base}/?lang=${encodeURIComponent(locale)}&source=telegram_miniapp${hash}`;
}

/**
 * Verifies Telegram Mini App `initData` per Telegram Bot API documentation:
 * secret_key = HMAC-SHA256("WebAppData", bot_token)
 * expected_hash = HMAC-SHA256(secret_key, data_check_string)
 */
export function verifyTelegramMiniAppInitData(
  initDataRaw: string,
  botToken: string,
  maxAgeSeconds = 86_400
): VerifiedMiniAppInitData {
  if (!initDataRaw || !botToken) {
    return { valid: false, reason: 'MISSING_INIT_DATA_OR_TOKEN' };
  }

  const params = new URLSearchParams(initDataRaw);
  const providedHash = params.get('hash');
  if (!providedHash || !/^[a-f0-9]{64}$/i.test(providedHash)) {
    return { valid: false, reason: 'MISSING_OR_INVALID_HASH' };
  }

  const pairs: string[] = [];
  for (const [key, value] of params.entries()) {
    if (key === 'hash') continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  const a = Buffer.from(providedHash.toLowerCase(), 'utf8');
  const b = Buffer.from(computedHash.toLowerCase(), 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { valid: false, reason: 'SIGNATURE_MISMATCH' };
  }

  const authDate = Number(params.get('auth_date') || 0);
  const nowSec = Math.floor(Date.now() / 1000);
  if (!authDate || Math.abs(nowSec - authDate) > maxAgeSeconds) {
    return { valid: false, reason: 'AUTH_DATE_EXPIRED' };
  }

  let userId: string | undefined;
  const userJson = params.get('user');
  if (userJson) {
    try {
      const parsed = JSON.parse(userJson) as { id?: number | string };
      if (parsed.id !== undefined) userId = String(parsed.id);
    } catch {
      // ignore malformed user JSON
    }
  }

  return { valid: true, authDate, userId };
}
