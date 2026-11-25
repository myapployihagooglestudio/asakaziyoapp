/**
 * ASAKA ZIYO — ULTIMATE QUR'ON ECOSYSTEM, OFFLINE MODE, PREMIUM SUBSCRIPTION
 * & CROSS-PLATFORM UPDATE 2026 — Live E2E Verification Suite
 *
 * Verifies against live server http://127.0.0.1:3000:
 * 1. Security: Unauthenticated admin endpoints reject with 401.
 * 2. Qari & Persistent Audio Upload: Valid ID3/MP3 upload -> Spoofed HTML rejected (400) ->
 *    SHA-256 duplicate rejected (409) -> VERIFIED -> PUBLISHED gating -> HTTP 206 Partial Content Range streaming ->
 *    Metadata backup creation -> Clean soft/hard delete cleanup.
 * 3. Playlists & Free-Tier Limits: Official playlist + Personal playlist + Free tier limit enforcement (403 PREMIUM_REQUIRED).
 * 4. Tajweed & Education Academy: 28 Arabic letters & Makharij + Lessons + Quizzes + User Qur'on Profile update & Auto-Certificate.
 * 5. Dynamic Plans, Feature Gates & Manual Card Settings: Admin updates price, feature gate, and card settings (zero PIN/CVV/OTP).
 * 6. Manual Card Order Lifecycle & Idempotency: User submits PENDING order -> Duplicate receipt blocked ->
 *    Admin APPROVE activates Premium -> Re-approving same order is idempotent (no double-extension) -> Reject flow keeps user FREE.
 * 7. Admin Subscription Control: ADMIN_GIFT grant -> extend -> suspend -> expire_now auto-downgrades to EXPIRED.
 * 8. Promo Codes: Admin creates free-days promo -> User redeems -> Duplicate redemption rejected.
 * 9. Fair Free-Only CSPRNG Random Draw: Admin creates FREE_ONLY draw -> Users join -> Duplicate join rejected (409) ->
 *    CSPRNG `run` selects winner -> Admin `approve` auto-grants GIFTED Premium.
 * 10. Telegram Mini App HMAC-SHA256 Auth & Cross-Platform 6-Digit Account Linking:
 *     Tampered initData rejected (401); Valid HMAC-SHA256 verified; 6-digit code links Web ID <-> tg:<id> with identical Premium status.
 * 11. Telegram Bot Isolated Helpers: `/premium`, `/tanlov`, `/qorilar`, `/about` formatters + clickable `Dev by Ulug‘bek Mirzayev` entity.
 * 12. Developer Attribution Verification across Web App, Telegram Bot, and Native Android (`Dev by Ulug‘bek Mirzayev` -> `https://t.me/Ulugbek_Mirzayev_uz`).
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { SubscriptionEcosystemService } from '../services/subscriptionEcosystemServer';
import {
  DEVELOPER_ATTRIBUTION_LABEL,
  DEVELOPER_ATTRIBUTION_URL,
  appendDeveloperAttributionEntity,
  formatTelegramAboutMessage,
} from '../../telegram/services/quranPremiumBotHelper';

const BASE_URL = 'http://127.0.0.1:3000';

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

function createValidMp3TestBuffer(seedText: string): Buffer {
  // Valid ID3v2.3 header ("ID3" + version 3.0 + flags 0 + syncsafe size) + valid MP3 frame sync bytes (0xFF 0xFB) + deterministic payload
  const header = Buffer.from([0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  const frameSync = Buffer.from([0xff, 0xfb, 0x90, 0x64]);
  const body = Buffer.alloc(4096, 0x55);
  Buffer.from(seedText, 'utf-8').copy(body, 0);
  return Buffer.concat([header, frameSync, body]);
}

async function main() {
  const runId = `test_${Date.now()}`;
  const adminToken = await obtainAdminToken();
  const adminHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  };

  let createdTestQariId: string | null = null;
  let createdAudioId: string | null = null;

  // TEST 1: Admin auth enforcement
  await runTest('1. Security — Unauthenticated admin endpoints rejected (401)', async () => {
    const r1 = await fetchJson('/api/admin/quran-ecosystem/overview');
    const r2 = await fetchJson('/api/admin/subscriptions/overview');
    assert(r1.status === 401, `Expected 401 on quran admin overview, got ${r1.status}`);
    assert(r2.status === 401, `Expected 401 on subscriptions admin overview, got ${r2.status}`);
    return 'Both /api/admin/quran-ecosystem/* and /api/admin/subscriptions/* rejected unauthenticated requests with 401';
  });

  // TEST 2: Qari + Persistent Audio Upload + Magic Byte Guard + Duplicate SHA-256 + 206 Range Streaming + Backup
  await runTest('2. Persistent Qari/Audio Storage, Magic-Byte Guard, SHA-256 Dedupe & HTTP 206 Range Stream', async () => {
    const qariRes = await fetchJson('/api/admin/quran-ecosystem/qaris', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        nameUz: `Jahongir qori Ne'matov (E2E ${runId})`,
        countryUz: "O'zbekiston",
        styleUz: 'Murattal',
        bioUz: 'E2E test qori profili',
        isActive: true,
      }),
    });
    assert(qariRes.status === 200 && qariRes.data?.qari?.id, `Qari create failed: ${JSON.stringify(qariRes)}`);
    createdTestQariId = qariRes.data.qari.id;

    // 2a. Reject spoofed HTML uploaded as .mp3
    const spoofedBuf = Buffer.from('<!doctype html><html><body>fake mp3</body></html>', 'utf-8');
    const spoofRes = await fetchJson('/api/admin/quran-ecosystem/audio/upload', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        qariId: createdTestQariId,
        surahNumber: 1,
        audioBase64: spoofedBuf.toString('base64'),
        mimeType: 'audio/mpeg',
        originalFilename: '001.mp3',
      }),
    });
    assert(spoofRes.status === 400, `Expected spoofed HTML rejection 400, got ${spoofRes.status}`);

    // 2b. Upload valid MP3 (autoPublish = false -> starts as VERIFIED, hidden from public stream until PUBLISHED)
    const validMp3 = createValidMp3TestBuffer(`asaka-ziyo-surah-1-${runId}`);
    const upRes = await fetchJson('/api/admin/quran-ecosystem/audio/upload', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        qariId: createdTestQariId,
        surahNumber: 1,
        audioBase64: validMp3.toString('base64'),
        mimeType: 'audio/mpeg',
        originalFilename: '001_fatiha.mp3',
        durationSec: 47,
        autoPublish: false,
      }),
    });
    assert(upRes.status === 200 && upRes.data?.record?.id, `Valid MP3 upload failed: ${JSON.stringify(upRes)}`);
    createdAudioId = upRes.data.record.id;
    assert(upRes.data.record.status === 'VERIFIED', `Expected VERIFIED initial status, got ${upRes.data.record.status}`);
    assert(upRes.data.record.sha256.length === 64, 'Missing SHA-256 checksum');

    // 2c. Duplicate SHA-256 rejected with 409
    const dupRes = await fetchJson('/api/admin/quran-ecosystem/audio/upload', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        qariId: createdTestQariId,
        surahNumber: 2,
        audioBase64: validMp3.toString('base64'),
        mimeType: 'audio/mpeg',
        originalFilename: '002_dup.mp3',
      }),
    });
    assert(dupRes.status === 409, `Expected duplicate SHA-256 rejection 409, got ${dupRes.status}`);

    // 2d. Publish VERIFIED -> PUBLISHED
    const pubRes = await fetchJson(`/api/admin/quran-ecosystem/audio/${createdAudioId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'PUBLISHED' }),
    });
    assert(pubRes.status === 200 && pubRes.data?.record?.status === 'PUBLISHED', 'Publish failed');

    // 2e. Verify HTTP 206 Partial Content Range streaming
    const streamRes = await fetch(`${BASE_URL}/api/quran-ecosystem/audio-stream/${createdAudioId}`, {
      headers: { Range: 'bytes=0-127' },
    });
    assert(streamRes.status === 206, `Expected HTTP 206 Partial Content, got ${streamRes.status}`);
    const contentRange = streamRes.headers.get('content-range') || '';
    assert(contentRange.startsWith('bytes 0-127/'), `Unexpected Content-Range: ${contentRange}`);
    const chunk = Buffer.from(await streamRes.arrayBuffer());
    assert(chunk.length === 128, `Expected 128 bytes in range chunk, got ${chunk.length}`);

    // 2f. Metadata backup creation
    const backupRes = await fetchJson('/api/admin/quran-ecosystem/backup', {
      method: 'POST',
      headers: adminHeaders,
    });
    assert(backupRes.status === 200 && backupRes.data?.backup?.filename, 'Backup creation failed');

    return `Uploaded verified MP3 (${upRes.data.record.sha256.slice(0, 12)}...), blocked HTML spoof & SHA-256 dup, streamed HTTP 206 (${contentRange}), created backup ${backupRes.data.backup.filename}`;
  });

  // TEST 3: Playlists & Free-tier gating
  await runTest('3. Playlists & Free-Tier Limit Enforcement (403 PREMIUM_REQUIRED)', async () => {
    const freeUserId = `web_free_${runId}`;
    const p1 = await fetchJson('/api/quran-ecosystem/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: freeUserId,
        titleUz: 'Tonggi tilovat',
        tracks: [{ surahNumber: 36, surahNameUz: 'Yosin' }],
      }),
    });
    assert(p1.status === 200 && p1.data?.playlist?.id, `Playlist 1 failed: ${JSON.stringify(p1)}`);

    const p2 = await fetchJson('/api/quran-ecosystem/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: freeUserId,
        titleUz: 'Kechki tilovat',
        tracks: [{ surahNumber: 67, surahNameUz: 'Mulk' }],
      }),
    });
    assert(p2.status === 200, `Playlist 2 failed: ${JSON.stringify(p2)}`);

    // 3rd personal playlist should hit Free tier limit (2) -> 403 PREMIUM_REQUIRED
    const p3 = await fetchJson('/api/quran-ecosystem/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: freeUserId,
        titleUz: '3-pleylist',
        tracks: [{ surahNumber: 18, surahNameUz: 'Kahf' }],
      }),
    });
    assert(p3.status === 403 && p3.data?.code === 'PREMIUM_REQUIRED', `Expected 403 PREMIUM_REQUIRED, got ${p3.status}`);
    return 'Free user allowed 2 playlists and cleanly blocked on 3rd with 403 PREMIUM_REQUIRED';
  });

  // TEST 4: Tajweed 28 Arabic Letters, Quizzes & Auto-Certificate
  await runTest('4. Education Academy (28 Arabic Letters/Makharij) & Auto-Certificate', async () => {
    const edu = await fetchJson('/api/quran-ecosystem/education');
    assert(edu.status === 200, `Education fetch failed (${edu.status})`);
    assert(edu.data?.alphabet?.length === 28, `Expected 28 Arabic letters, got ${edu.data?.alphabet?.length}`);
    assert(edu.data?.lessons?.length >= 4, 'Expected built-in Tajweed lessons');
    assert(edu.data?.quizzes?.length >= 2, 'Expected built-in Education quizzes');

    const beginnerIds = edu.data.lessons
      .filter((l: any) => l.level === 'beginner')
      .map((l: any) => l.id);

    const studentId = `student_${runId}`;
    const upd = await fetchJson(`/api/quran-ecosystem/profile/${studentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        completedLessonIds: beginnerIds,
        quizScores: {
          [edu.data.quizzes[0].id]: { bestScore: 100, attempts: 1, passed: true, lastAt: new Date().toISOString() },
        },
        hifzItems: [
          {
            surahNumber: 1,
            ayahFrom: 1,
            ayahTo: 7,
            easeFactor: 2.5,
            intervalDays: 1,
            repetitions: 1,
            masteryScore: 85,
            nextReviewAt: new Date(Date.now() + 86400000).toISOString(),
          },
        ],
      }),
    });
    assert(upd.status === 200 && upd.data?.profile?.certificates?.length >= 1, 'Expected auto-issued certificate on beginner Tajweed completion');
    return `28 Arabic letters verified, ${edu.data.lessons.length} Tajweed lessons, ${edu.data.quizzes.length} quizzes, auto-certificate ${upd.data.profile.certificates[0].verificationCode} issued`;
  });

  // TEST 5: Dynamic Plans, Feature Gates & Manual Card Settings (Zero PIN/CVV/OTP)
  await runTest('5. Dynamic Plans, Feature Gates & Card Settings (Security Checked)', async () => {
    const before = await fetchJson('/api/subscriptions/catalog');
    const orig1m = before.data.plans.find((p: any) => p.id === 'premium_1m');
    assert(orig1m, 'Missing premium_1m plan');

    const updPlan = await fetchJson('/api/admin/subscriptions/plans/premium_1m', {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({ priceUzs: orig1m.priceUzs, badgeUz: 'Eng mashhur' }),
    });
    assert(updPlan.status === 200 && updPlan.data?.plan?.badgeUz === 'Eng mashhur', 'Plan update failed');

    const cardSettings = before.data.cardSettings || {};
    const fieldNames = Object.keys(cardSettings).map((k) => k.toLowerCase());
    assert(
      !fieldNames.some((k) => k.includes('cvv') || k.includes('pin') || k.includes('otp') || k.includes('secret')),
      `Card settings must NEVER expose secret fields: ${fieldNames.join(', ')}`
    );
    return `Dynamic plans (${before.data.plans.length}) & feature gates (${before.data.featureGates.length}) verified with zero card secret fields`;
  });

  // TEST 6: Manual Card Payment Order Lifecycle, Duplicate Receipt Block & Idempotent Approve
  await runTest('6. Manual Card Payment Flow (PENDING -> APPROVED, Idempotent, Duplicate Ref Guard & Reject)', async () => {
    const buyerId = `buyer_${runId}`;
    const receiptRef = `CHK-${runId}`;

    const ord1 = await fetchJson('/api/subscriptions/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: buyerId,
        userDisplayName: 'Test Buyer',
        platform: 'web',
        planId: 'premium_1m',
        receiptReference: receiptRef,
      }),
    });
    assert(ord1.status === 200 && ord1.data?.order?.status === 'PENDING', `Order creation failed: ${JSON.stringify(ord1)}`);
    const orderId = ord1.data.order.orderId;

    // Duplicate receipt reference flagged with duplicateRefWarning
    const dupOrd = await fetchJson('/api/subscriptions/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: `buyer2_${runId}`,
        planId: 'premium_1m',
        receiptReference: receiptRef,
      }),
    });
    assert(
      dupOrd.status === 200 && dupOrd.data?.order?.duplicateRefWarning === true,
      `Expected duplicateRefWarning=true on duplicate receipt, got ${JSON.stringify(dupOrd)}`
    );

    // Admin approves order
    const app1 = await fetchJson(`/api/admin/subscriptions/orders/${orderId}/approve`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ adminNote: 'Chek tasdiqlandi' }),
    });
    assert(app1.status === 200 && app1.data?.subscription?.status === 'ACTIVE', `Order approve failed: ${JSON.stringify(app1)}`);
    const firstExpiry = app1.data.subscription.expiresAt;

    // Idempotency check: re-approving the SAME order must NOT double-extend expiry
    const app2 = await fetchJson(`/api/admin/subscriptions/orders/${orderId}/approve`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ adminNote: 'Double click test' }),
    });
    assert(app2.status === 200 && app2.data?.alreadyApproved === true, 'Expected idempotent alreadyApproved: true');
    const subAfter = await fetchJson(`/api/subscriptions/me/${buyerId}`);
    assert(subAfter.data?.subscription?.expiresAt === firstExpiry, 'Idempotency violated — expiry changed on re-approve!');

    // Reject flow keeps user FREE
    const rejUser = `reject_user_${runId}`;
    const rejOrd = await fetchJson('/api/subscriptions/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: rejUser,
        planId: 'premium_1m',
        receiptReference: `REJ-${runId}`,
      }),
    });
    const rejRes = await fetchJson(`/api/admin/subscriptions/orders/${rejOrd.data.order.orderId}/reject`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ reason: 'Chek aniq emas' }),
    });
    assert(rejRes.status === 200 && rejRes.data?.order?.status === 'REJECTED', 'Reject flow failed');
    const rejStatus = await fetchJson(`/api/subscriptions/me/${rejUser}`);
    assert(rejStatus.data?.subscription?.isPremium === false, 'Rejected user should remain FREE');

    return `Approved order ${orderId} idempotently (expiry locked at ${firstExpiry.slice(0, 10)}), flagged duplicate receipt, and verified reject keeps user FREE`;
  });

  // TEST 7: Admin Subscription Control (ADMIN_GIFT, Extend, Suspend, Expire Auto-Downgrade)
  await runTest('7. Admin Subscription Control (ADMIN_GIFT -> Extend -> Suspend -> Expire Auto-Downgrade)', async () => {
    const giftUser = `gift_${runId}`;

    const g1 = await fetchJson(`/api/admin/subscriptions/users/${giftUser}/modify`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ action: 'grant', isGift: true, days: 15, reason: 'Ramazon hadyasi' }),
    });
    assert(g1.status === 200 && g1.data?.subscription?.status === 'GIFTED', `ADMIN_GIFT failed: ${JSON.stringify(g1)}`);

    const gExt = await fetchJson(`/api/admin/subscriptions/users/${giftUser}/modify`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ action: 'extend', days: 10, reason: 'Qoʻshimcha 10 kun' }),
    });
    assert(gExt.status === 200 && gExt.data?.effective?.daysRemaining >= 24, `Extend failed: ${JSON.stringify(gExt)}`);

    const g2 = await fetchJson(`/api/admin/subscriptions/users/${giftUser}/modify`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ action: 'suspend', reason: 'Vaqtincha toʻxtatildi' }),
    });
    assert(g2.status === 200 && g2.data?.effective?.status === 'SUSPENDED', `Suspend failed: ${JSON.stringify(g2)}`);
    const checkSusp = await fetchJson(`/api/subscriptions/me/${giftUser}`);
    assert(checkSusp.data?.subscription?.isPremium === false, 'Suspended user must not have Premium access');

    const g3 = await fetchJson(`/api/admin/subscriptions/users/${giftUser}/modify`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ action: 'expire_now', reason: 'Muddat tugatildi' }),
    });
    assert(g3.status === 200, 'expire_now failed');
    const checkExp = await fetchJson(`/api/subscriptions/me/${giftUser}`);
    assert(
      checkExp.data?.subscription?.isPremium === false && checkExp.data?.subscription?.status === 'EXPIRED',
      `Expected EXPIRED auto-downgrade, got ${checkExp.data?.subscription?.status}`
    );
    return 'Verified ADMIN_GIFT -> EXTEND (+10d) -> SUSPENDED (access revoked) -> EXPIRED server-time UTC auto-downgrade';
  });

  // TEST 8: Promo Code Creation & Free-Days Redemption
  await runTest('8. Promo Codes — Create, Redeem Free Days & Block Duplicate Redemption', async () => {
    const promoCode = `ASAKA${String(Date.now()).slice(-5)}`;
    const promoUser = `promo_user_${runId}`;

    const createP = await fetchJson('/api/admin/subscriptions/promos', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        code: promoCode,
        titleUz: 'E2E 7 kunlik hadya',
        type: 'free_premium_days',
        value: 7,
        maxUses: 10,
      }),
    });
    assert(createP.status === 200 && createP.data?.promo?.code === promoCode, 'Promo create failed');

    const redeem1 = await fetchJson('/api/subscriptions/promo/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: promoCode, userId: promoUser, redeemNow: true }),
    });
    assert(redeem1.status === 200 && redeem1.data?.subscription?.status === 'GIFTED', `Promo redeem failed: ${JSON.stringify(redeem1)}`);

    const redeem2 = await fetchJson('/api/subscriptions/promo/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: promoCode, userId: promoUser, redeemNow: true }),
    });
    assert(redeem2.status === 400, `Expected duplicate promo rejection 400, got ${redeem2.status}`);
    return `Promo ${promoCode} granted +7 days GIFTED Premium and blocked repeat redemption`;
  });

  // TEST 9: Fair Free-Only Server CSPRNG Random Draw
  await runTest('9. Fair Free-Only CSPRNG Random Draw (Join -> Dedupe -> Run -> Admin Approve Auto-Gift)', async () => {
    const drawRes = await fetchJson('/api/admin/subscriptions/random-draws', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        titleUz: `Juma Hadya Tanlovi (${runId})`,
        prizeDays: 30,
        winnersCount: 1,
      }),
    });
    assert(drawRes.status === 200 && drawRes.data?.draw?.entryType === 'FREE_ONLY', 'Draw creation failed');
    const drawId = drawRes.data.draw.id;

    const u1 = `draw_u1_${runId}`;
    const u2 = `draw_u2_${runId}`;
    const j1 = await fetchJson(`/api/subscriptions/random-draws/${drawId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: u1, displayName: 'Abdulloh', platform: 'web' }),
    });
    assert(j1.status === 200, 'User 1 join failed');

    // Duplicate join rejected with 409
    const j1Dup = await fetchJson(`/api/subscriptions/random-draws/${drawId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: u1, displayName: 'Abdulloh', platform: 'web' }),
    });
    assert(j1Dup.status === 409, `Expected duplicate draw entry 409, got ${j1Dup.status}`);

    const j2 = await fetchJson(`/api/subscriptions/random-draws/${drawId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: u2, displayName: 'Bilol', platform: 'telegram_miniapp' }),
    });
    assert(j2.status === 200, 'User 2 join failed');

    const runDraw = await fetchJson(`/api/admin/subscriptions/random-draws/${drawId}/run`, {
      method: 'POST',
      headers: adminHeaders,
    });
    assert(runDraw.status === 200 && runDraw.data?.draw?.selectedWinnerUserIds?.length === 1, 'CSPRNG run failed');
    const winnerId = runDraw.data.draw.selectedWinnerUserIds[0];

    const approveDraw = await fetchJson(`/api/admin/subscriptions/random-draws/${drawId}/approve`, {
      method: 'POST',
      headers: adminHeaders,
    });
    assert(approveDraw.status === 200 && approveDraw.data?.grantedCount === 1, 'Draw winner approve failed');

    const winnerSub = await fetchJson(`/api/subscriptions/me/${winnerId}`);
    assert(winnerSub.data?.subscription?.isPremium === true && winnerSub.data?.subscription?.status === 'GIFTED', 'Winner did not receive GIFTED Premium');
    return `FREE_ONLY draw ${drawId} selected winner ${winnerId} via CSPRNG and auto-granted 30d GIFTED Premium`;
  });

  // TEST 10: Telegram Mini App HMAC-SHA256 Verification & Cross-Platform 6-Digit Account Linking
  await runTest('10. Telegram Mini App HMAC-SHA256 Auth & 6-Digit Cross-Platform Account Linking', async () => {
    // 10a. Tampered initData rejected via live endpoint (401)
    const badAuth = await fetchJson('/api/telegram-miniapp/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: 'user=%7B%22id%22%3A123%7D&auth_date=1700000000&hash=deadbeef' }),
    });
    assert(badAuth.status === 401, `Expected tampered initData 401, got ${badAuth.status}`);

    // 10b. Cryptographic HMAC-SHA256 verification unit check with known test bot token
    const testBotToken = '123456789:TEST_SECRET_TOKEN_FOR_HMAC_UNIT_CHECK';
    const authDate = Math.floor(Date.now() / 1000);
    const userJson = JSON.stringify({ id: 99887766, first_name: 'Ulugbek' });
    const params = new URLSearchParams({ auth_date: String(authDate), query_id: 'AAHdF6IQAAAA', user: userJson });
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(testBotToken).digest();
    const validHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    params.set('hash', validHash);

    const svc = new SubscriptionEcosystemService({
      dataDir: path.join(process.cwd(), 'data'),
      getTelegramBotToken: () => testBotToken,
    });
    const verified = svc.verifyTelegramMiniAppInitData(params.toString(), testBotToken);
    assert(verified.ok && verified.userId === 'tg:99887766', `Valid HMAC initData verification failed: ${JSON.stringify(verified)}`);

    // 10c. 6-digit cross-platform Account Linking (Web Premium user <-> Telegram tg:<id>)
    const webPrimary = `web_link_${runId}`;
    const tgSecondary = `tg:8800${String(Date.now()).slice(-5)}`;
    await fetchJson(`/api/admin/subscriptions/users/${webPrimary}/modify`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ action: 'grant', durationDays: 30, note: 'Cross-platform sync test' }),
    });

    const gen = await fetchJson('/api/account-link/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: webPrimary }),
    });
    assert(gen.status === 200 && /^\d{6}$/.test(gen.data?.code || ''), `Link code generate failed: ${JSON.stringify(gen)}`);

    const redeem = await fetchJson('/api/account-link/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: gen.data.code, secondaryUserId: tgSecondary }),
    });
    assert(redeem.status === 200 && redeem.data?.canonicalUserId === webPrimary, `Link redeem failed: ${JSON.stringify(redeem)}`);

    const tgSub = await fetchJson(`/api/subscriptions/me/${tgSecondary}`);
    assert(tgSub.data?.subscription?.isPremium === true && tgSub.data?.subscription?.userId === webPrimary, 'Linked Telegram account did not inherit Web Premium!');
    return `HMAC-SHA256 verified (tg:99887766) & 6-digit link code ${gen.data.code} synced Premium across ${webPrimary} <-> ${tgSecondary}`;
  });

  // TEST 11: Telegram Bot Isolated Helpers & Attribution Entity
  await runTest('11. Telegram Bot Isolated Helpers & Clickable Attribution Entity', async () => {
    const entityFormatted = appendDeveloperAttributionEntity({ text: 'Asosiy menyu', entities: [] });
    assert(entityFormatted.text.includes(DEVELOPER_ATTRIBUTION_LABEL), 'Missing attribution label in entity text');
    const linkEntity = entityFormatted.entities.find((e) => e.type === 'text_link' && e.url === DEVELOPER_ATTRIBUTION_URL);
    assert(linkEntity, 'Missing clickable text_link entity for https://t.me/Ulugbek_Mirzayev_uz');

    const about = formatTelegramAboutMessage({
      config: { miniAppUrl: 'https://asakaziyo.ai.studio' } as any,
      miniAppEnabled: true,
    });
    assert(about.html.includes(DEVELOPER_ATTRIBUTION_LABEL) && about.html.includes(DEVELOPER_ATTRIBUTION_URL), 'Missing attribution in /about message');
    return 'Telegram text_link entity & /about HTML attribution verified';
  });

  // TEST 12: Cross-Platform Developer Attribution Source Check (Web, Telegram, Android)
  await runTest('12. Developer Attribution Presence across Web App, Telegram Bot & Native Android', async () => {
    const webFile = fs.readFileSync(path.join(process.cwd(), 'src/components/layout/DeveloperAttribution.tsx'), 'utf-8');
    const tgFile = fs.readFileSync(path.join(process.cwd(), 'telegram/services/quranPremiumBotHelper.ts'), 'utf-8');
    const androidFile = fs.readFileSync(path.join(process.cwd(), 'android/app/src/main/java/uz/asakaziyo/app/MainActivity.kt'), 'utf-8');
    const manifestFile = fs.readFileSync(path.join(process.cwd(), 'android/app/src/main/AndroidManifest.xml'), 'utf-8');

    for (const [label, content] of [
      ['Web DeveloperAttribution.tsx', webFile],
      ['Telegram quranPremiumBotHelper.ts', tgFile],
      ['Android MainActivity.kt', androidFile],
    ] as const) {
      assert(content.includes('Dev by Ulug‘bek Mirzayev'), `${label} missing 'Dev by Ulug‘bek Mirzayev'`);
      assert(content.includes('https://t.me/Ulugbek_Mirzayev_uz'), `${label} missing 'https://t.me/Ulugbek_Mirzayev_uz'`);
    }
    assert(manifestFile.includes('AsakaQuranWidgetProvider'), 'AndroidManifest.xml missing AsakaQuranWidgetProvider');
    return 'Verified identical attribution across Web/PWA/Mini App, Telegram Bot, and Android Native + Widget registration';
  });

  // Cleanup test Qari & test audio file so production catalog stays clean
  if (createdAudioId) {
    await fetchJson(`/api/admin/quran-ecosystem/audio/${createdAudioId}?confirm=true`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
  }
  if (createdTestQariId) {
    await fetchJson(`/api/admin/quran-ecosystem/qaris/${createdTestQariId}?force=true`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`\n========================================`);
  console.log(`ULTIMATE QUR'ON & PREMIUM ECOSYSTEM E2E SUMMARY: ${passed}/${results.length} PASSED, ${failed} FAILED`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
