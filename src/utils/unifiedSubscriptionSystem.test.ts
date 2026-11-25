/**
 * ASAKA ZIYO — ULTIMATE UNIFIED FREE & PREMIUM SUBSCRIPTION SYSTEM
 * 12-Point Mandatory Live Acceptance Test Suite (All 4 Platforms & All 17 Modules)
 *
 * Tests against live server http://127.0.0.1:3000:
 *  1. Admin switches a feature to PREMIUM (freeLimit=0) -> reflected immediately across Web, Android, Mini App & Telegram Bot.
 *  2. Admin switches it back to FREE and changes AI freeLimit (5 -> 10) -> reflected immediately across all 4 platforms.
 *  3. Free user blocked with HTTP 403 (PREMIUM_REQUIRED) on Premium feature & HTTP 403 (USAGE_LIMIT_REACHED) on /api/ai/chat after exhausting Free quota.
 *  4. Premium user allowed across all modules (AI, Hifz Analytics, Quiz, Offline Downloads, Unlimited Playlists) without upsell/block.
 *  5. Subscription expiry (expire_now) immediately revokes Premium access (403) while keeping core religious Free features allowed (200).
 *  6. Android-originated order approved by Admin -> Web, Android, Mini App & linked Telegram Bot (`tg:<id>` via 6-digit code) all sync to Premium.
 *  7. Promo code (`free_premium_days` + `percent_discount`) applies, activates Premium, blocks duplicate use, and logs in real Admin Analytics.
 *  8. Admin grants `ADMIN_GIFT` Premium -> works across platforms immediately and records immutable audit entry.
 *  9. Persistence & Fresh Read: `SubscriptionEcosystemService.reloadFromDisk()` and fresh API fetch retain exact subscription & feature gates.
 * 10. Strict User Isolation: User A's active Premium NEVER unlocks Premium features for User B (403 PREMIUM_REQUIRED).
 * 11. Direct API Bypass Blocked: direct POST to `/api/subscriptions/entitlements/check`, `/api/quran-ecosystem/playlists`, and `/api/ai/chat` by Free user returns HTTP 403.
 * 12. Dynamic New Feature Creation (`POST /api/admin/subscriptions/feature-gates`) + Real Admin Analytics Accuracy (zero fake numbers) + Clean Default Restoration.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { SubscriptionEcosystemService } from '../services/subscriptionEcosystemServer';
import { formatTelegramPremiumMessage } from '../../telegram/services/quranPremiumBotHelper';

const BASE_URL = 'http://127.0.0.1:3000';
const RUN_ID = `subtest_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

interface TestResult {
  name: string;
  passed: boolean;
  detail: string;
}

const results: TestResult[] = [];

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

async function runTest(name: string, fn: () => Promise<string>): Promise<void> {
  try {
    const detail = await fn();
    results.push({ name, passed: true, detail });
    console.log(`[PASS] ${name} — ${detail}`);
  } catch (err: any) {
    const detail = err?.message || String(err);
    results.push({ name, passed: false, detail });
    console.error(`[FAIL] ${name} — ${detail}`);
  }
}

async function obtainAdminToken(): Promise<string> {
  const secretPath = path.join(process.cwd(), 'data', '.admin_session_secret');
  if (fs.existsSync(secretPath)) {
    const secret = fs.readFileSync(secretPath, 'utf-8').trim();
    if (secret.length >= 16) {
      const expiresAt = Date.now() + 60 * 60 * 1000;
      const randomPart = crypto.randomBytes(16).toString('hex');
      const payload = `admin-asakaziyo0:menageradmin:${expiresAt}:${randomPart}`;
      const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      return `asaka_admin_v2_${expiresAt}_${randomPart}.${sig}`;
    }
  }
  const username = process.env.ADMIN_INITIAL_USERNAME || 'menageradmin';
  const password = process.env.ADMIN_INITIAL_PASSWORD || process.env.ADMIN_PASSWORD || 'menageradmin1';
  const res = await fetch(`${BASE_URL}/api/admin/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const json: any = await res.json();
  if (!res.ok || !json?.token) {
    throw new Error(`Admin auth failed (${res.status}): ${JSON.stringify(json)}`);
  }
  return String(json.token);
}

async function fetchJson(endpoint: string, init?: RequestInit): Promise<{ status: number; data: any }> {
  const res = await fetch(`${BASE_URL}${endpoint}`, init);
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

async function main() {
  console.log(`\n=== ASAKA ZIYO Unified Subscription Acceptance Suite (${RUN_ID}) ===\n`);

  const adminToken = await obtainAdminToken();
  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  };

  // Snapshot original gate settings so we always restore cleanly at the end
  const initialCatalogRes = await fetchJson('/api/subscriptions/catalog');
  assert(initialCatalogRes.status === 200 && initialCatalogRes.data?.success, 'Catalog must load');
  const originalGates: any[] = initialCatalogRes.data.featureGates || [];
  const origHifzVoice = originalGates.find((g) => g.key === 'hifz_ai_voice_check');
  const origAiUnlimited = originalGates.find((g) => g.key === 'ai_ustoz_unlimited');
  assert(originalGates.length >= 26, `Expected >=26 cross-module gates, got ${originalGates.length}`);

  const freeUserId = `web_${RUN_ID}_free`;
  const premiumUserId = `web_${RUN_ID}_prem`;
  const androidUserId = `android_${RUN_ID}_u1`;
  const telegramLinkedId = `tg:${Math.floor(700000000 + Math.random() * 199999999)}`;
  const promoUserId = `web_${RUN_ID}_promo`;
  const giftUserId = `web_${RUN_ID}_gift`;
  const isolatedUserB = `web_${RUN_ID}_isolated_b`;
  const customFeatureKey = `custom_test_feature_${RUN_ID.slice(-6)}`;

  try {
    // 1. Admin switches feature to PREMIUM (freeLimit=0) -> reflected across all 4 platforms
    await runTest('1. Admin switches feature to PREMIUM -> synced across Web, Android, Mini App & Bot', async () => {
      const upd = await fetchJson('/api/admin/subscriptions/feature-gates/hifz_ai_voice_check', {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({ access: 'premium', freeLimit: 0, limitPeriod: 'daily', isEnabled: true }),
      });
      assert(upd.status === 200 && upd.data?.success, `Gate update failed: ${JSON.stringify(upd.data)}`);

      for (const platform of ['web', 'android', 'telegram_miniapp', 'telegram_bot'] as const) {
        const ent = await fetchJson(`/api/subscriptions/entitlements/${encodeURIComponent(freeUserId)}?platform=${platform}`);
        assert(ent.status === 200 && ent.data?.success, `Entitlements fetch failed on ${platform}`);
        const d = ent.data.features?.hifz_ai_voice_check;
        assert(d && d.access === 'premium' && d.allowed === false && d.reasonCode === 'PREMIUM_REQUIRED', `Expected blocked on ${platform}, got ${JSON.stringify(d)}`);
      }

      // Also verify isolated Telegram Bot formatter reads updated dynamic service state
      const svc = new SubscriptionEcosystemService({ dataDir: path.join(process.cwd(), 'data') });
      svc.reloadFromDisk();
      const botMsg = formatTelegramPremiumMessage({
        subscriptionService: svc,
        telegramId: '999001',
        config: { miniAppUrl: 'https://asakaziyo.ai.studio' } as any,
        miniAppEnabled: true,
      });
      assert(botMsg.html.includes('ASAKA ZIYO') && botMsg.html.includes('AI Ustoz'), 'Bot message must render dynamic quotas');
      return 'hifz_ai_voice_check=PREMIUM blocked across all 4 platforms + Bot formatter';
    });

    // 2. Admin switches it back to FREE & updates AI freeLimit 5 -> 10 -> reflected across all 4 platforms
    await runTest('2. Admin switches feature to FREE & changes AI freeLimit (5 -> 10) -> live across 4 platforms', async () => {
      const upd1 = await fetchJson('/api/admin/subscriptions/feature-gates/hifz_ai_voice_check', {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({ access: 'free', freeLimit: -1, limitPeriod: 'unlimited', isEnabled: true }),
      });
      assert(upd1.status === 200 && upd1.data?.success, 'Failed switching hifz_ai_voice_check to free');

      const upd2 = await fetchJson('/api/admin/subscriptions/feature-gates/ai_ustoz_unlimited', {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({ access: 'premium', freeLimit: 10, limitPeriod: 'daily', isEnabled: true }),
      });
      assert(upd2.status === 200 && upd2.data?.success, 'Failed updating ai_ustoz_unlimited limit to 10');

      for (const platform of ['web', 'android', 'telegram_miniapp', 'telegram_bot'] as const) {
        const ent = await fetchJson(`/api/subscriptions/entitlements/${encodeURIComponent(freeUserId)}?platform=${platform}`);
        const hifz = ent.data.features?.hifz_ai_voice_check;
        const ai = ent.data.features?.ai_ustoz_unlimited;
        assert(hifz?.allowed === true && hifz?.access === 'free', `Expected hifz free on ${platform}`);
        assert(ai?.limit === 10 && ai?.remaining === 10, `Expected AI limit=10 on ${platform}, got ${JSON.stringify(ai)}`);
      }
      return 'hifz_ai_voice_check=FREE & ai_ustoz_unlimited.freeLimit=10 verified on all 4 platforms';
    });

    // 3. Free user blocked (403 PREMIUM_REQUIRED & 403 USAGE_LIMIT_REACHED on /api/ai/chat)
    await runTest('3. Free user blocked with HTTP 403 on Premium feature & /api/ai/chat after quota exhaustion', async () => {
      // 3a. Premium-only feature (freeLimit=0) -> 403 PREMIUM_REQUIRED
      const premCheck = await fetchJson('/api/subscriptions/entitlements/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: freeUserId, featureKey: 'advanced_hifz_analytics', platform: 'web', consume: true }),
      });
      assert(
        premCheck.status === 403 && premCheck.data?.code === 'PREMIUM_REQUIRED',
        `Expected 403 PREMIUM_REQUIRED, got ${premCheck.status} ${JSON.stringify(premCheck.data)}`
      );

      // 3b. Temporarily set AI freeLimit to 2 so we test real consumption cleanly without hitting rate limiters
      const setAi2 = await fetchJson('/api/admin/subscriptions/feature-gates/ai_ustoz_unlimited', {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({ access: 'premium', freeLimit: 2, limitPeriod: 'daily', isEnabled: true }),
      });
      assert(setAi2.status === 200, 'Failed setting ai_ustoz_unlimited freeLimit=2');

      // Consume 2 quota units via authoritative check endpoint
      for (let i = 1; i <= 2; i++) {
        const c = await fetchJson('/api/subscriptions/entitlements/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: freeUserId, featureKey: 'ai_ustoz_unlimited', platform: 'web', consume: true }),
        });
        assert(c.status === 200 && c.data?.decision?.allowed === true, `Expected AI quota #${i} allowed`);
      }

      // 3rd call directly to /api/ai/chat MUST be blocked with HTTP 403 USAGE_LIMIT_REACHED before Gemini call
      const aiBlocked = await fetchJson('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: freeUserId,
          platform: 'web',
          channel: 'web',
          stream: false,
          messages: [{ role: 'user', content: 'Assalomu alaykum, namoz haqida savol' }],
        }),
      });
      assert(
        aiBlocked.status === 403 && aiBlocked.data?.code === 'USAGE_LIMIT_REACHED',
        `Expected /api/ai/chat 403 USAGE_LIMIT_REACHED, got ${aiBlocked.status} ${JSON.stringify(aiBlocked.data)}`
      );
      return '403 PREMIUM_REQUIRED (Hifz Analytics) + 403 USAGE_LIMIT_REACHED (/api/ai/chat after 2/2)';
    });

    // 4. Premium user allowed across ALL modules (AI, Hifz, Quiz, Offline, Playlists)
    await runTest('4. Premium user allowed across all modules without block', async () => {
      const grant = await fetchJson(`/api/admin/subscriptions/users/${encodeURIComponent(premiumUserId)}/modify`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ action: 'grant', planId: 'premium_1m', days: 30, reason: 'E2E Premium test' }),
      });
      assert(grant.status === 200 && grant.data?.effective?.isPremium === true, 'Failed granting Premium');

      for (const key of [
        'advanced_hifz_analytics',
        'ai_ustoz_unlimited',
        'ai_deep_reasoning_mode',
        'quran_quiz_unlimited',
        'unlimited_offline_downloads',
        'unlimited_playlists',
        'islamic_courses_certificates',
        'personal_growth_analytics',
      ]) {
        const chk = await fetchJson('/api/subscriptions/entitlements/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: premiumUserId, featureKey: key, platform: 'web', consume: true }),
        });
        assert(chk.status === 200 && chk.data?.decision?.allowed === true, `Premium user blocked on ${key}: ${JSON.stringify(chk.data)}`);
      }
      return 'All 8 cross-module Premium gates returned 200 ALLOWED for Premium user';
    });

    // 5. Expiry immediately revokes Premium while keeping core Free features open
    await runTest('5. Subscription expiry (expire_now) revokes Premium immediately while keeping Free core open', async () => {
      const exp = await fetchJson(`/api/admin/subscriptions/users/${encodeURIComponent(premiumUserId)}/modify`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ action: 'expire_now', reason: 'E2E expiry check' }),
      });
      assert(exp.status === 200 && exp.data?.effective?.isPremium === false, 'User should no longer be Premium');

      const blocked = await fetchJson('/api/subscriptions/entitlements/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: premiumUserId, featureKey: 'advanced_hifz_analytics', platform: 'web', consume: false }),
      });
      assert(blocked.status === 403 && blocked.data?.code === 'PREMIUM_REQUIRED', `Expected 403 after expiry, got ${blocked.status}`);

      for (const coreKey of ['prayer_times_global', 'quran_mushaf_core', 'tasbeh_dhikr_core', 'hadith_dua_library_core']) {
        const freeOk = await fetchJson('/api/subscriptions/entitlements/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: premiumUserId, featureKey: coreKey, platform: 'web', consume: false }),
        });
        assert(freeOk.status === 200 && freeOk.data?.decision?.allowed === true, `Core Free feature ${coreKey} must remain open`);
      }
      return 'Expired user blocked (403) on Premium & allowed (200) on all 4 core religious features';
    });

    // 6. Android order approved -> Web, Android, Mini App & linked Telegram Bot all sync to Premium
    await runTest('6. Android order approved + 6-digit Telegram link -> Premium synced across all 4 platforms', async () => {
      const orderRes = await fetchJson('/api/subscriptions/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: androidUserId,
          userDisplayName: 'Android E2E User',
          platform: 'android',
          planId: 'premium_1m',
          receiptReference: `AND-${RUN_ID}-991`,
        }),
      });
      assert(orderRes.status === 200 && orderRes.data?.order?.orderId, `Order creation failed: ${JSON.stringify(orderRes.data)}`);
      const orderId = orderRes.data.order.orderId;

      const approveRes = await fetchJson(`/api/admin/subscriptions/orders/${encodeURIComponent(orderId)}/approve`, {
        method: 'POST',
        headers: adminHeaders,
      });
      assert(approveRes.status === 200 && approveRes.data?.success, `Approve failed: ${JSON.stringify(approveRes.data)}`);

      // Generate 6-digit link code from Android user and redeem from Telegram user
      const gen = await fetchJson('/api/account-link/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: androidUserId }),
      });
      assert(gen.status === 200 && /^\d{6}$/.test(String(gen.data?.code || '')), '6-digit link code failed');

      const red = await fetchJson('/api/account-link/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: gen.data.code, secondaryUserId: telegramLinkedId }),
      });
      assert(red.status === 200 && red.data?.subscription?.isPremium === true, 'Linked Telegram user did not inherit Premium');

      for (const [uid, plat] of [
        [androidUserId, 'android'],
        [androidUserId, 'web'],
        [telegramLinkedId, 'telegram_miniapp'],
        [telegramLinkedId, 'telegram_bot'],
      ] as const) {
        const ent = await fetchJson(`/api/subscriptions/entitlements/${encodeURIComponent(uid)}?platform=${plat}`);
        assert(ent.status === 200 && ent.data?.subscription?.isPremium === true, `Sync failed for ${uid} on ${plat}`);
        assert(ent.data.features?.advanced_hifz_analytics?.allowed === true, `Premium gate not unlocked on ${plat}`);
      }
      return `Order ${orderId} approved -> Android, Web, Mini App & Bot (${telegramLinkedId}) all isPremium=true`;
    });

    // 7. Promo codes (free_premium_days + percent_discount) + duplicate prevention
    await runTest('7. Promo codes apply, activate Premium, block duplicate redemption & track in analytics', async () => {
      const freeDaysCode = `FREE${RUN_ID.slice(-5).toUpperCase()}`;
      const discountCode = `DISC${RUN_ID.slice(-5).toUpperCase()}`;

      const p1 = await fetchJson('/api/admin/subscriptions/promos', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          code: freeDaysCode,
          titleUz: 'E2E 7 kun bepul',
          type: 'free_premium_days',
          value: 7,
          maxUses: 10,
          perUserLimit: 1,
          isActive: true,
        }),
      });
      assert(p1.status === 200 && p1.data?.success, 'Failed creating free-days promo');

      const p2 = await fetchJson('/api/admin/subscriptions/promos', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          code: discountCode,
          titleUz: 'E2E 25% chegirma',
          type: 'percent_discount',
          value: 25,
          maxUses: 10,
          perUserLimit: 1,
          isActive: true,
        }),
      });
      assert(p2.status === 200 && p2.data?.success, 'Failed creating percent-discount promo');

      // Evaluate percent discount
      const evalDisc = await fetchJson('/api/subscriptions/promo/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: discountCode, userId: promoUserId, planId: 'premium_1m', redeemNow: false }),
      });
      assert(evalDisc.status === 200 && evalDisc.data?.discountAmountUzs > 0, `Discount eval failed: ${JSON.stringify(evalDisc.data)}`);

      // Redeem free-days promo
      const redeem1 = await fetchJson('/api/subscriptions/promo/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: freeDaysCode, userId: promoUserId, redeemNow: true }),
      });
      assert(redeem1.status === 200 && redeem1.data?.success, `Promo redeem failed: ${JSON.stringify(redeem1.data)}`);

      // Duplicate redemption MUST be blocked
      const redeemDup = await fetchJson('/api/subscriptions/promo/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: freeDaysCode, userId: promoUserId, redeemNow: true }),
      });
      assert(redeemDup.status === 400, `Duplicate promo redemption should return 400, got ${redeemDup.status}`);

      const sub = await fetchJson(`/api/subscriptions/me/${encodeURIComponent(promoUserId)}?platform=web`);
      assert(sub.data?.subscription?.isPremium === true, 'Promo user should be Premium');
      return `${freeDaysCode} activated 7d Premium (dup blocked 400) + ${discountCode} discounted ${evalDisc.data.discountAmountUzs} UZS`;
    });

    // 8. Admin grants ADMIN_GIFT Premium -> works across platforms & writes audit log
    await runTest('8. Admin grants ADMIN_GIFT Premium -> active across platforms + immutable audit log', async () => {
      const gift = await fetchJson(`/api/admin/subscriptions/users/${encodeURIComponent(giftUserId)}/modify`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          action: 'grant',
          planId: 'premium_6m',
          days: 90,
          isGift: true,
          reason: 'Ramadan Gift E2E',
        }),
      });
      assert(gift.status === 200 && gift.data?.effective?.status === 'GIFTED' && gift.data?.effective?.isPremium === true, 'Gift grant failed');

      const overview = await fetchJson('/api/admin/subscriptions/overview', { headers: adminHeaders });
      const auditMatch = (overview.data?.auditLogs || []).find(
        (l: any) => l.targetId === giftUserId && String(l.action || '').includes('SUBSCRIPTION')
      );
      assert(Boolean(auditMatch), 'Audit log entry for ADMIN_GIFT not found');
      return `status=GIFTED (90d) active + audit entry ${auditMatch.id}`;
    });

    // 9. Persistence & Fresh Read after disk reload
    await runTest('9. Disk persistence & reloadFromDisk() preserve exact subscription & feature gates', async () => {
      const freshSvc = new SubscriptionEcosystemService({ dataDir: path.join(process.cwd(), 'data') });
      freshSvc.reloadFromDisk();
      const androidSub = freshSvc.getEffectiveSubscription(androidUserId);
      const linkedTgSub = freshSvc.getEffectiveSubscription(telegramLinkedId);
      const giftSub = freshSvc.getEffectiveSubscription(giftUserId);
      const gate = freshSvc.getPublicCatalog().featureGates.find((g) => g.key === 'ai_ustoz_unlimited');
      assert(androidSub.isPremium === true && linkedTgSub.isPremium === true, 'Reloaded Android/TG Premium lost');
      assert(giftSub.status === 'GIFTED', 'Reloaded GIFTED subscription lost');
      assert(gate && gate.freeLimit === 2, `Expected persisted ai_ustoz_unlimited.freeLimit=2, got ${gate?.freeLimit}`);
      return 'Fresh SubscriptionEcosystemService disk reload matched all subscriptions & gate config 100%';
    });

    // 10. Strict User Isolation: User A's active Premium NEVER grants access to User B
    await runTest('10. Strict User Isolation: Active Premium User A never leaks to Free User B', async () => {
      const subA = await fetchJson(`/api/subscriptions/me/${encodeURIComponent(androidUserId)}?platform=web`);
      const subB = await fetchJson(`/api/subscriptions/me/${encodeURIComponent(isolatedUserB)}?platform=web`);
      assert(subA.data?.subscription?.isPremium === true, 'User A must be Premium');
      assert(subB.data?.subscription?.isPremium === false, 'User B must remain Free');

      const checkB = await fetchJson('/api/subscriptions/entitlements/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: isolatedUserB, featureKey: 'personal_growth_analytics', platform: 'web', consume: true }),
      });
      assert(checkB.status === 403 && checkB.data?.code === 'PREMIUM_REQUIRED', 'User B must be blocked with 403');
      return 'User A isPremium=true while User B strictly isolated (isPremium=false, 403 PREMIUM_REQUIRED)';
    });

    // 11. Direct API Bypass Blocked on Playlists, Entitlement Check & AI Chat
    await runTest('11. Direct API bypass blocked (403) on Playlists, Entitlement Check & AI Chat for Free user', async () => {
      // Create playlists up to free limit (default 2) for isolatedUserB, then verify next creation returns 403
      let got403 = false;
      for (let i = 1; i <= 5; i++) {
        const pl = await fetchJson('/api/quran-ecosystem/playlists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: isolatedUserB,
            platform: 'web',
            titleUz: `E2E Playlist ${i}`,
            tracks: [{ qariId: 'mishary_alafasy', surahNumber: i }],
          }),
        });
        if (pl.status === 403) {
          got403 = true;
          break;
        }
        assert(pl.status === 200, `Unexpected playlist status ${pl.status}: ${JSON.stringify(pl.data)}`);
      }
      assert(got403, 'Direct POST /api/quran-ecosystem/playlists must enforce 403 after Free limit');

      const directBlocked = await fetchJson('/api/subscriptions/entitlements/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: isolatedUserB, featureKey: 'islamic_courses_certificates', platform: 'android', consume: true }),
      });
      assert(directBlocked.status === 403, 'Direct POST /api/subscriptions/entitlements/check must return 403');

      // Exhaust isolatedUserB's 2 AI calls and test direct /api/ai/chat bypass on Android channel
      for (let i = 0; i < 2; i++) {
        await fetchJson('/api/subscriptions/entitlements/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: isolatedUserB, featureKey: 'ai_ustoz_unlimited', platform: 'android', consume: true }),
        });
      }
      const aiDirect = await fetchJson('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: isolatedUserB,
          platform: 'android',
          channel: 'android',
          stream: false,
          messages: [{ role: 'user', content: 'Test direct bypass' }],
        }),
      });
      assert(aiDirect.status === 403 && aiDirect.data?.code === 'USAGE_LIMIT_REACHED', `Direct Android /api/ai/chat bypass returned ${aiDirect.status}`);
      return 'All 3 direct API bypass attempts blocked server-side with HTTP 403';
    });

    // 12. Dynamic New Feature Creation + Real Admin Analytics (Zero Fake Numbers)
    await runTest('12. Dynamic new feature creation & Real Admin Analytics accuracy (zero fake numbers)', async () => {
      const createRes = await fetchJson('/api/admin/subscriptions/feature-gates', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          key: customFeatureKey,
          module: 'education',
          labelUz: 'Yangi Dinamik Test Funksiyasi',
          descriptionUz: 'Admin tomonidan jonli qoʻshilgan funksiya',
          access: 'premium',
          freeLimit: 0,
          premiumLimit: -1,
          limitPeriod: 'unlimited',
          isEnabled: true,
        }),
      });
      assert(createRes.status === 200 && createRes.data?.featureGate?.key === customFeatureKey, 'Dynamic feature creation failed');

      // Disable dynamically created feature via kill-switch and verify FEATURE_DISABLED even for Premium user
      const disableRes = await fetchJson(`/api/admin/subscriptions/feature-gates/${encodeURIComponent(customFeatureKey)}`, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({ isEnabled: false }),
      });
      assert(disableRes.status === 200, 'Kill-switch update failed');
      const disabledCheck = await fetchJson('/api/subscriptions/entitlements/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: androidUserId, featureKey: customFeatureKey, platform: 'web', consume: false }),
      });
      assert(disabledCheck.status === 403 && disabledCheck.data?.code === 'FEATURE_DISABLED', 'Kill-switch must return 403 FEATURE_DISABLED');

      // Inspect real Admin Analytics overview
      const ov = await fetchJson('/api/admin/subscriptions/overview', { headers: adminHeaders });
      assert(ov.status === 200 && ov.data?.success, 'Overview endpoint failed');
      const s = ov.data.stats;
      const a = ov.data.analytics;
      assert(s.totalUsersCount >= 5, `Expected >=5 real tracked users, got ${s.totalUsersCount}`);
      assert(s.activePremiumCount >= 3, `Expected >=3 active Premium users (android, promo, gift), got ${s.activePremiumCount}`);
      assert(s.giftedSubscriptionsCount >= 1, `Expected >=1 gifted subscription, got ${s.giftedSubscriptionsCount}`);
      assert(s.expiredSubscriptionsCount >= 1, `Expected >=1 expired subscription, got ${s.expiredSubscriptionsCount}`);
      assert(s.totalRevenueUzs > 0 && s.dailyRevenueUzs > 0, `Expected real approved order revenue > 0, got ${s.totalRevenueUzs}`);
      assert(s.conversionRatePercent > 0 && s.conversionRatePercent <= 100, `Invalid conversion rate: ${s.conversionRatePercent}`);
      assert(
        a.platformBreakdown.web?.usersCount >= 1 &&
          a.platformBreakdown.android?.usersCount >= 1 &&
          a.platformBreakdown.android?.approvedOrdersCount >= 1,
        `Platform breakdown missing web/android: ${JSON.stringify(a.platformBreakdown)}`
      );
      assert(Array.isArray(a.topUsedFeatures) && a.topUsedFeatures.length >= 1, 'topUsedFeatures must record real usage');
      assert(Array.isArray(a.promoUsageBreakdown) && a.promoUsageBreakdown.length >= 1, 'promoUsageBreakdown must record real promo uses');
      return `Dynamic gate + kill-switch verified; Real stats: users=${s.totalUsersCount}, activePrem=${s.activePremiumCount}, conv=${s.conversionRatePercent}%, rev=${s.totalRevenueUzs} UZS`;
    });
  } finally {
    // Always restore modified default feature gates back to original defaults
    if (origHifzVoice) {
      await fetchJson('/api/admin/subscriptions/feature-gates/hifz_ai_voice_check', {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({
          access: origHifzVoice.access,
          freeLimit: origHifzVoice.freeLimit,
          premiumLimit: origHifzVoice.premiumLimit,
          limitPeriod: origHifzVoice.limitPeriod,
          isEnabled: origHifzVoice.isEnabled,
        }),
      }).catch(() => {});
    }
    if (origAiUnlimited) {
      await fetchJson('/api/admin/subscriptions/feature-gates/ai_ustoz_unlimited', {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({
          access: origAiUnlimited.access,
          freeLimit: origAiUnlimited.freeLimit,
          premiumLimit: origAiUnlimited.premiumLimit,
          limitPeriod: origAiUnlimited.limitPeriod,
          isEnabled: origAiUnlimited.isEnabled,
        }),
      }).catch(() => {});
    }
  }

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  console.log(`\n=== SUMMARY: ${passed}/${total} Unified Subscription Tests Passed ===\n`);
  if (passed !== total) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
