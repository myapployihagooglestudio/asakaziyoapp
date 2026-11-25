/**
 * ASAKA ZIYO — Unified Cross-Platform User Identity & Telegram Mini App Auth Client (2026)
 *
 * Ensures Web App, PWA, Android WebView, and Telegram Mini App share one consistent user ID,
 * with server-side HMAC-SHA256 verification whenever running inside Telegram Mini App.
 */

import { getTelegramWebApp } from './telegramMiniApp';

const LOCAL_USER_ID_KEY = 'asaka_ziyo_ecosystem_uid_v1';
const VERIFIED_TG_UID_KEY = 'asaka_ziyo_verified_tg_uid_v1';

export function getActiveEcosystemUserId(): string {
  if (typeof window === 'undefined') return 'web_ssr_guest';
  try {
    const verifiedTg = window.sessionStorage.getItem(VERIFIED_TG_UID_KEY);
    if (verifiedTg && verifiedTg.trim()) return verifiedTg.trim();

    let saved = window.localStorage.getItem(LOCAL_USER_ID_KEY);
    if (!saved || !saved.trim()) {
      const rand =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
          : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      saved = `web_${rand}`;
      window.localStorage.setItem(LOCAL_USER_ID_KEY, saved);
    }
    return saved;
  } catch {
    return 'web_guest_local';
  }
}

export function setCanonicalEcosystemUserId(userId: string): void {
  if (typeof window === 'undefined' || !userId.trim()) return;
  try {
    window.localStorage.setItem(LOCAL_USER_ID_KEY, userId.trim());
  } catch {
    // ignore storage restrictions
  }
}

/**
 * Cryptographically verifies Telegram Mini App `initData` with the server (`/api/telegram-miniapp/auth`).
 * Never trusts raw client-side Telegram IDs without server HMAC-SHA256 verification.
 */
export async function verifyAndSyncTelegramMiniAppSession(): Promise<{
  verified: boolean;
  userId: string;
  telegramUser?: any;
  isPremium?: boolean;
}> {
  const webApp = getTelegramWebApp();
  if (!webApp?.initData) {
    return { verified: false, userId: getActiveEcosystemUserId() };
  }

  try {
    const res = await fetch('/api/telegram-miniapp/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: webApp.initData }),
    });
    const json = await res.json();
    if (res.ok && json?.success && json?.userId) {
      try {
        window.sessionStorage.setItem(VERIFIED_TG_UID_KEY, json.userId);
      } catch {
        // ignore
      }
      return {
        verified: true,
        userId: json.userId,
        telegramUser: json.telegramUser,
        isPremium: Boolean(json.subscription?.isPremium),
      };
    }
  } catch {
    // Fallback cleanly when offline
  }

  return { verified: false, userId: getActiveEcosystemUserId() };
}

export function detectClientPlatform(): 'web' | 'android' | 'telegram_miniapp' {
  if (typeof window === 'undefined') return 'web';
  if (getTelegramWebApp()) return 'telegram_miniapp';
  if ((window as any).AsakaNativeBridge || /AsakaZiyoAndroid/i.test(navigator.userAgent || '')) {
    return 'android';
  }
  return 'web';
}
