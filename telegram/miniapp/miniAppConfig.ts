/**
 * ASAKA ZIYO — Telegram Mini App (WebApp) Bridge & initData HMAC Verifier
 *
 * Points directly to the live ASAKA ZIYO app (`https://asakaziyo.ai.studio/` or configured APP_URL)
 * and verifies official Telegram WebApp `initData` via HMAC-SHA256 on the server side.
 */

import crypto from 'crypto';
import { TelegramLocale } from '../types';
import { TelegramPlatformConfig } from '../config';

export interface VerifiedMiniAppInitData {
  valid: boolean;
  authDate?: number;
  userId?: string;
  firstName?: string;
  username?: string;
  reason?: string;
}

export function buildMiniAppEntryUrl(
  config: TelegramPlatformConfig,
  locale: TelegramLocale,
  section: string = 'home'
): string {
  const base = (config.miniAppUrl || config.webAppUrl).replace(/\/+$/, '');
  const cleanSection = String(section || 'home').trim().toLowerCase();
  if (cleanSection === 'masjid-tv' || cleanSection === 'masjid_tv') {
    return `${base}/masjid-tv?lang=${encodeURIComponent(locale)}&source=telegram_miniapp`;
  }
  const safeHash = cleanSection === 'home' || !cleanSection
    ? ''
    : `#${encodeURIComponent(cleanSection)}`;
  return `${base}/?lang=${encodeURIComponent(locale)}&source=telegram_miniapp${safeHash}`;
}

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
  let firstName: string | undefined;
  let username: string | undefined;
  const userJson = params.get('user');
  if (userJson) {
    try {
      const parsed = JSON.parse(userJson) as {
        id?: number | string;
        first_name?: string;
        username?: string;
      };
      if (parsed.id !== undefined) userId = String(parsed.id);
      if (parsed.first_name) firstName = parsed.first_name;
      if (parsed.username) username = parsed.username;
    } catch {
      // ignore malformed user JSON
    }
  }

  return { valid: true, authDate, userId, firstName, username };
}
