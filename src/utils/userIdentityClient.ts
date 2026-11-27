/**
 * ASAKA ZIYO — Unified Cross-Platform User Identity, Telegram Mini App Auth & Sync Client (2026)
 *
 * Ensures Web App, PWA, Android Native App, and Telegram Mini App share one consistent user ID,
 * with server-side HMAC-SHA256 verification whenever running inside Telegram Mini App,
 * and automatic cross-platform synchronization of favorites, language, reading progress, and hifz.
 */

import { getTelegramWebApp } from './telegramMiniApp';

const LOCAL_USER_ID_KEY = 'asaka_ziyo_ecosystem_uid_v1';
const VERIFIED_TG_UID_KEY = 'asaka_ziyo_verified_tg_uid_v1';

export interface UnifiedSyncedFavoriteItem {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  snippet?: string;
  routeTab?: string;
  routeId?: string;
  timestamp: number;
}

export interface UnifiedUserSyncStatePayload {
  canonicalUserId: string;
  language: 'uz-Latn' | 'uz-Cyrl' | 'uz-Latn-new' | 'ru' | 'en' | null;
  theme: 'dark' | 'light' | 'system' | null;
  favorites: UnifiedSyncedFavoriteItem[];
  bookmarks: Array<{
    id: string;
    surahNumber: number;
    ayahNumber: number;
    pageNumber?: number;
    note?: string;
    createdAt: string;
  }>;
  hifzRanges: any[];
  readingProgress?: {
    lastReadSurah: number;
    lastReadAyah: number;
    lastReadPage: number;
    todayAyahsRead: number;
    dailyGoalAyahs: number;
    dailyGoalMinutes: number;
    streakDays: number;
  };
  updatedAt?: string;
}

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
  language?: string | null;
  favorites?: UnifiedSyncedFavoriteItem[];
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
        language: json.language || null,
        favorites: Array.isArray(json.favorites) ? json.favorites : [],
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

export async function pullUnifiedUserSyncState(
  userId: string = getActiveEcosystemUserId()
): Promise<UnifiedUserSyncStatePayload | null> {
  if (typeof window === 'undefined' || !userId || userId === 'web_ssr_guest') return null;
  try {
    const res = await fetch(`/api/user/sync-state/${encodeURIComponent(userId)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.success) return null;
    return {
      canonicalUserId: json.canonicalUserId || userId,
      language: json.language || null,
      theme: json.theme || null,
      favorites: Array.isArray(json.favorites) ? json.favorites : [],
      bookmarks: Array.isArray(json.bookmarks) ? json.bookmarks : [],
      hifzRanges: Array.isArray(json.hifzRanges) ? json.hifzRanges : [],
      readingProgress: json.readingProgress,
      updatedAt: json.updatedAt,
    };
  } catch {
    return null;
  }
}

export async function pushUnifiedUserSyncState(
  patch: {
    language?: string;
    theme?: string;
    mergeMode?: 'merge' | 'replace';
    favorites?: UnifiedSyncedFavoriteItem[];
    removeFavoriteIds?: string[];
    readingProgress?: Record<string, any>;
    bookmarks?: any[];
    hifzRanges?: any[];
  },
  userId: string = getActiveEcosystemUserId()
): Promise<boolean> {
  if (typeof window === 'undefined' || !userId || userId === 'web_ssr_guest') return false;
  try {
    const res = await fetch(`/api/user/sync-state/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...patch,
        platform: detectClientPlatform(),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
