/**
 * ASAKA ZIYO — Unified Web App & Android WebView Premium Emoji Service
 *
 * Reads the authoritative `appConfig/emojiRegistry` catalog (via Firestore realtime
 * listener when available, plus `/api/telegram/platform/emojis/public-catalog` fallback).
 *
 * ZERO-SECRET & ZERO-PLAIN-EMOJI GUARANTEES:
 * - Never touches or exposes Telegram Bot tokens in client code.
 * - Loads sticker/custom-emoji assets strictly via the server-side proxy
 *   `/api/telegram/platform/emojis/:key/asset`.
 * - Never silently substitutes plain Unicode emojis when an asset is unavailable or unrenderable.
 */

import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebaseClient';

export interface PublicPremiumEmojiItem {
  key: string;
  category: string;
  customEmojiId: string | null;
  enabled: boolean;
  verified: boolean;
  verifiedAt?: string;
  stickerSetName?: string;
  webAssetUrl: string | null;
  webAssetFormat: 'webp' | 'webm' | 'tgs' | 'png' | 'unknown';
  webRenderable: boolean;
  description: string;
  semanticPurpose?: string;
  version: number;
  updatedAt: string;
}

export interface PublicEmojiCatalogState {
  version: number;
  updatedAt: string | null;
  totalSlots: number;
  canonicalCount: number;
  verifiedCount: number;
  emojis: Record<string, PublicPremiumEmojiItem>;
  source: 'initial' | 'api' | 'firestore';
}

const STORAGE_CACHE_KEY = 'asaka_ziyo_premium_emoji_catalog_v1';

let currentCatalog: PublicEmojiCatalogState = loadCachedCatalog();
const listeners = new Set<(state: PublicEmojiCatalogState) => void>();
let initialized = false;
let firestoreUnsub: (() => void) | null = null;

function loadCachedCatalog(): PublicEmojiCatalogState {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PublicEmojiCatalogState;
        if (parsed && typeof parsed.emojis === 'object') {
          return parsed;
        }
      }
    }
  } catch {
    // ignore storage quota / private mode errors
  }
  return {
    version: 0,
    updatedAt: null,
    totalSlots: 0,
    canonicalCount: 28,
    verifiedCount: 0,
    emojis: {},
    source: 'initial',
  };
}

function saveCachedCatalog(next: PublicEmojiCatalogState): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(next));
    }
  } catch {
    // non-fatal
  }
}

function emitUpdate(next: PublicEmojiCatalogState): void {
  // Anti-downgrade guard in browser cache as well
  if (currentCatalog.version > 0 && next.version > 0 && next.version < currentCatalog.version) {
    return;
  }
  currentCatalog = next;
  saveCachedCatalog(next);
  for (const listener of listeners) {
    try {
      listener(currentCatalog);
    } catch {
      // isolate subscriber errors
    }
  }
}

export async function refreshPublicEmojiCatalog(): Promise<PublicEmojiCatalogState> {
  try {
    const res = await fetch('/api/telegram/platform/emojis/public-catalog', {
      cache: 'no-store',
    });
    if (res.ok) {
      const json = await res.json();
      if (json && json.emojis && typeof json.emojis === 'object') {
        emitUpdate({
          version: Number(json.version || 1),
          updatedAt: json.updatedAt || new Date().toISOString(),
          totalSlots: Number(json.totalSlots || Object.keys(json.emojis).length),
          canonicalCount: Number(json.canonicalCount || 28),
          verifiedCount: Number(json.verifiedCount || 0),
          emojis: json.emojis,
          source: 'api',
        });
      }
    }
  } catch {
    // keep cached catalog safely
  }
  return currentCatalog;
}

export function initPremiumEmojiSync(): void {
  if (initialized) return;
  initialized = true;
  void refreshPublicEmojiCatalog();

  try {
    if (db) {
      const ref = doc(db, 'appConfig', 'emojiRegistry');
      firestoreUnsub = onSnapshot(
        ref,
        (snap) => {
          if (!snap.exists()) return;
          const data = snap.data() as Record<string, any>;
          if (data && data.emojis && typeof data.emojis === 'object') {
            emitUpdate({
              version: Number(data.version || 1),
              updatedAt: data.updatedAt || new Date().toISOString(),
              totalSlots: Number(data.totalSlots || Object.keys(data.emojis).length),
              canonicalCount: Number(data.canonicalCount || 28),
              verifiedCount: Number(data.verifiedCount || 0),
              emojis: data.emojis,
              source: 'firestore',
            });
          }
        },
        () => {
          // If Firestore listener is offline, API catalog fallback remains active
        }
      );
    }
  } catch {
    // non-fatal
  }
}

export function stopPremiumEmojiSync(): void {
  if (firestoreUnsub) {
    firestoreUnsub();
    firestoreUnsub = null;
  }
  initialized = false;
}

export function getPublicEmojiCatalog(): PublicEmojiCatalogState {
  return currentCatalog;
}

export function subscribePublicEmojiCatalog(
  listener: (state: PublicEmojiCatalogState) => void
): () => void {
  initPremiumEmojiSync();
  listeners.add(listener);
  listener(currentCatalog);
  return () => {
    listeners.delete(listener);
  };
}
