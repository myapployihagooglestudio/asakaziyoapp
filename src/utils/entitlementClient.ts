/**
 * ASAKA ZIYO — Unified Cross-Platform Client Entitlement Manager (2026)
 *
 * - Fetches live server-authoritative subscription & feature entitlements from
 *   `/api/subscriptions/entitlements/:userId`.
 * - Calls `/api/subscriptions/entitlements/check` for real server-side quota enforcement.
 * - Maintains a read-only offline fallback cache (never authoritative for paid writes).
 * - Broadcasts instant updates across all open views via `asaka_entitlements_updated`.
 */

import { useCallback, useEffect, useState } from 'react';
import { detectClientPlatform, getActiveEcosystemUserId } from './userIdentityClient';

export interface ClientFeatureDecision {
  allowed: boolean;
  featureKey: string;
  module: string;
  reasonCode:
    | 'OK'
    | 'PREMIUM_REQUIRED'
    | 'USAGE_LIMIT_REACHED'
    | 'FEATURE_DISABLED'
    | 'PLATFORM_RESTRICTED'
    | 'AUDIENCE_RESTRICTED'
    | 'PLAN_TIER_REQUIRED'
    | 'UNKNOWN_FEATURE';
  messageUz: string;
  access: 'free' | 'premium';
  isPremiumUser: boolean;
  subscriptionStatus: string;
  limitPeriod: 'daily' | 'weekly' | 'monthly' | 'unlimited';
  limit: number;
  used: number;
  remaining: number;
  feature?: {
    key: string;
    module: string;
    labelUz: string;
    descriptionUz: string;
    userNoticeUz?: string;
    access: 'free' | 'premium';
    limitPeriod: string;
    freeLimit: number;
    premiumLimit: number;
    isEnabled: boolean;
  };
}

export interface UserEntitlementSnapshot {
  userId: string;
  platform: string;
  subscription: {
    userId: string;
    status: string;
    planId: string;
    isPremium: boolean;
    daysRemaining: number;
    expiresAt: string | null;
    startsAt: string | null;
    source: string;
    pendingOrderId?: string | null;
    linkedAliases?: string[];
  };
  moduleLabelsUz: Record<string, string>;
  features: Record<string, ClientFeatureDecision>;
  serverTimeUtc: string;
  fetchedAt?: number;
}

const CACHE_KEY = 'asaka_ziyo_entitlements_cache_v2';
export const ENTITLEMENTS_UPDATED_EVENT = 'asaka_entitlements_updated';
export const NAVIGATE_TAB_EVENT = 'asaka_navigate_tab';

export function dispatchNavigateToPremium(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(NAVIGATE_TAB_EVENT, { detail: { tab: 'premium' } }));
}

export function notifyEntitlementsChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ENTITLEMENTS_UPDATED_EVENT));
}

function readCachedSnapshot(userId: string): UserEntitlementSnapshot | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserEntitlementSnapshot;
    if (parsed && parsed.userId === userId && parsed.subscription) {
      return parsed;
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

function writeCachedSnapshot(snapshot: UserEntitlementSnapshot): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ ...snapshot, fetchedAt: Date.now() }));
  } catch {
    // ignore storage errors
  }
}

export async function fetchUserEntitlements(overrideUserId?: string): Promise<UserEntitlementSnapshot | null> {
  const userId = overrideUserId || getActiveEcosystemUserId();
  const platform = detectClientPlatform();
  try {
    const res = await fetch(
      `/api/subscriptions/entitlements/${encodeURIComponent(userId)}?platform=${encodeURIComponent(platform)}`
    );
    const json = await res.json();
    if (json?.success && json.subscription) {
      const snap: UserEntitlementSnapshot = {
        userId: json.userId || userId,
        platform: json.platform || platform,
        subscription: json.subscription,
        moduleLabelsUz: json.moduleLabelsUz || {},
        features: json.features || {},
        serverTimeUtc: json.serverTimeUtc || new Date().toISOString(),
        fetchedAt: Date.now(),
      };
      writeCachedSnapshot(snap);
      return snap;
    }
  } catch {
    // Offline fallback read-only snapshot
    return readCachedSnapshot(userId);
  }
  return readCachedSnapshot(userId);
}

export async function checkServerFeatureEntitlement(
  featureKey: string,
  consume = false,
  overrideUserId?: string
): Promise<{ ok: boolean; status: number; decision?: ClientFeatureDecision; error?: string }> {
  const userId = overrideUserId || getActiveEcosystemUserId();
  const platform = detectClientPlatform();
  try {
    const res = await fetch('/api/subscriptions/entitlements/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, featureKey, platform, consume }),
    });
    const json = await res.json();
    if (res.ok && json?.success) {
      if (consume) notifyEntitlementsChanged();
      return { ok: true, status: res.status, decision: json.decision };
    }
    return {
      ok: false,
      status: res.status,
      decision: json?.decision,
      error: json?.error || json?.decision?.messageUz || 'Bu funksiya uchun Premium obuna talab qilinadi.',
    };
  } catch {
    const cached = readCachedSnapshot(userId);
    const decision = cached?.features?.[featureKey];
    if (decision?.allowed) {
      return { ok: true, status: 200, decision };
    }
    return {
      ok: false,
      status: 503,
      decision,
      error: 'Internet aloqasi mavjud emas — obuna holatini tasdiqlash uchun ulaning.',
    };
  }
}

export function useUserEntitlements() {
  const [userId] = useState<string>(() => getActiveEcosystemUserId());
  const [snapshot, setSnapshot] = useState<UserEntitlementSnapshot | null>(() => readCachedSnapshot(userId));
  const [loading, setLoading] = useState<boolean>(!snapshot);

  const refresh = useCallback(async () => {
    const next = await fetchUserEntitlements(userId);
    if (next) setSnapshot(next);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
    const onUpdated = () => void refresh();
    const onOnline = () => void refresh();
    window.addEventListener(ENTITLEMENTS_UPDATED_EVENT, onUpdated);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener(ENTITLEMENTS_UPDATED_EVENT, onUpdated);
      window.removeEventListener('online', onOnline);
    };
  }, [refresh]);

  const checkFeature = useCallback(
    async (featureKey: string, consume = false) => {
      const out = await checkServerFeatureEntitlement(featureKey, consume, userId);
      if (consume) void refresh();
      return out;
    },
    [userId, refresh]
  );

  return {
    userId,
    loading,
    snapshot,
    subscription: snapshot?.subscription || null,
    isPremium: Boolean(snapshot?.subscription?.isPremium),
    status: snapshot?.subscription?.status || 'FREE',
    daysRemaining: snapshot?.subscription?.daysRemaining || 0,
    expiresAt: snapshot?.subscription?.expiresAt || null,
    features: snapshot?.features || {},
    moduleLabelsUz: snapshot?.moduleLabelsUz || {},
    refresh,
    checkFeature,
  };
}
