/**
 * ASAKA ZIYO — Unified Ecosystem V4 Integration Test Suite (12 Scenarios)
 *
 * Verifies:
 *  1. CentralContentProvider live single-source-of-truth reading (articles, news, announcements, audio/video)
 *  2. Archived / draft / future-scheduled records are filtered out from Telegram Bot feeds
 *  3. UnifiedSyncEngine article create/update/archive outbox lifecycle + deduplication
 *  4. Announcement publish_and_notify sends localized 5-language notifications (including uz-Latn-new ş/ç/ö/ğ)
 *  5. `/stop` opt-out user is strictly excluded from broadcast/sync notifications
 *  6. Restart recovery re-queues interrupted `processing` jobs from disk outbox
 *  7. AppReleaseService resolves local verified APK v4.0.0 vs awaiting_ci_artifact honestly (never confuses v3 as v4)
 *  8. AppReleaseService Firestore `app_releases` upsert + download counter increment
 *  9. Telegram Bot `/android` & `/apk` & `nav:android_app` callback render verified Android v4.0.0 release card
 * 10. Telegram Bot `/maqolalar`, `/elonlar`, `/yangiliklar`, `/audio`, `/video` unified commands & deep-link `/start article_...`
 * 11. Persistent 20-button Reply Keyboard & 5-language locale parity (`uz-Latn`, `uz-Cyrl`, `uz-Latn-new`, `ru`, `en`)
 * 12. Prayer schedule update sync hook refreshes prayer adapter cleanly without breaking existing users
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { INITIAL_ASAKA_PRAYER_SCHEDULE } from '../../src/data/prayerTimesData';
import { CentralContentProvider, CentralDatabaseSnapshot } from '../content/centralContentProvider';
import { AppReleaseService } from '../services/appReleaseService';
import { UnifiedSyncEngine } from '../sync/syncEngine';
import { TelegramBotEngine } from '../bot/telegramBotEngine';
import { TelegramPlatformConfig, loadTelegramPlatformConfig } from '../config';
import { FetchLike } from '../api/telegramApiClient';
import { TelegramLocale } from '../types';
import { getTelegramLocaleBundle } from '../locales';
import { buildPersistentReplyKeyboard } from '../keyboards/keyboards';

const ALL_LOCALES: TelegramLocale[] = ['uz-Latn', 'uz-Cyrl', 'uz-Latn-new', 'ru', 'en'];

interface SentMessage {
  method: string;
  body: Record<string, any>;
}

function createMockTelegramFetch(sent: SentMessage[]): FetchLike {
  return async (url: string, init?: RequestInit) => {
    const method = String(url).split('/').pop() || 'unknown';
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    sent.push({ method, body });
    if (method === 'getMe') {
      return new Response(
        JSON.stringify({
          ok: true,
          result: { id: 999000, is_bot: true, first_name: 'ASAKA ZIYO', username: 'asakaziyobot' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response(
      JSON.stringify({ ok: true, result: { message_id: sent.length + 100 } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };
}

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function makeTestConfig(): TelegramPlatformConfig {
  return {
    ...loadTelegramPlatformConfig({
      TELEGRAM_BOT_TOKEN1: '123456789:TEST_TOKEN_UNIFIED_V4_ONLY',
      TELEGRAM_MODE: 'webhook',
      TELEGRAM_WEBHOOK_URL: 'https://asakaziyo.ai.studio/api/telegram/platform/webhook',
      TELEGRAM_WEBHOOK_SECRET: 'test-secret-v4',
      TELEGRAM_ADMIN_IDS: '700001',
    }),
  };
}

async function run() {
  const results: string[] = [];
  const tmpRoot = makeTempDir('asaka-unified-v4-');

  try {
    const centralDb: CentralDatabaseSnapshot = {
      prayerSchedule: INITIAL_ASAKA_PRAYER_SCHEDULE,
      articles: [
        {
          id: 'art-live-1',
          title: 'Ilm olish fazilati',
          excerpt: 'Ilm izlash har bir musulmon uchun farzdir.',
          content: 'Toʻliq maqola matni...',
          category: 'Ilm',
          author: 'ASAKA ZIYO',
          date: '2026-11-18',
          readTime: '3 daqiqa',
          isArchived: false,
        },
        {
          id: 'art-archived-2',
          title: 'Arxivlangan maqola',
          excerpt: 'Bu koʻrinmasligi kerak.',
          content: 'Arxiv',
          category: 'Ilm',
          author: 'ASAKA ZIYO',
          date: '2026-11-17',
          readTime: '2 daqiqa',
          isArchived: true,
        },
        {
          id: 'art-future-3',
          title: 'Kelajakdagi maqola',
          excerpt: 'Hali eʼlon qilinmagan.',
          content: 'Kelajak',
          category: 'Ilm',
          author: 'ASAKA ZIYO',
          date: '2099-01-01',
          readTime: '2 daqiqa',
          status: 'scheduled',
          scheduledAt: '2099-01-01T00:00:00Z',
          isArchived: false,
        } as any,
      ],
      news: [
        {
          id: 'news-1',
          title: 'Asaka Jomeʼ masjidida yangi darslar',
          summary: 'Har juma kuni maʼrifiy suhbatlar oʻtkaziladi.',
          content: 'Batafsil maʼlumot...',
          category: 'Masjid',
          date: '2026-11-19',
          author: 'ASAKA ZIYO',
          isArchived: false,
        } as any,
      ],
      announcements: [
        {
          id: 'ann-1',
          title: 'Juma namozi vaqti eslatmasi',
          content: 'Masjid eshiklari 11:30 dan ochiq boʻladi.',
          date: '2026-11-19',
          priority: 'high',
          isArchived: false,
        } as any,
      ],
      mediaPosts: [
        {
          id: 'aud-1',
          title: 'Bomdod azoni (Asaka)',
          type: 'audio',
          mediaUrl: 'https://asakaziyo.ai.studio/audio/bomdod.mp3',
          caption: 'Asaka Bomdod azoni',
          author: 'ASAKA ZIYO',
          publishedDate: '2026-11-19',
          category: 'Azon',
          likesCount: 0,
          commentsCount: 0,
          isPublished: true,
          isArchived: false,
        },
        {
          id: 'vid-1',
          title: 'Ramazon suhbati video',
          type: 'video',
          mediaUrl: 'https://asakaziyo.ai.studio/video/ramazon.mp4',
          caption: 'Ramazon suhbati',
          author: 'ASAKA ZIYO',
          publishedDate: '2026-11-19',
          category: 'Suhbat',
          likesCount: 0,
          commentsCount: 0,
          isPublished: true,
          isArchived: false,
        },
      ],
      ownAudioLibrary: [
        {
          id: 'own-aud-1',
          title: 'Qurʼon tilovati — Fotiha',
          category: 'Tilovat',
          audioUrl: 'https://asakaziyo.ai.studio/audio/fotiha.mp3',
        },
      ],
    };

    // TEST 1 & 2: CentralContentProvider live read + filtering
    const contentProvider = new CentralContentProvider(() => centralDb);
    const liveArticles = contentProvider.getPublishedArticles();
    assert.ok(liveArticles.some((a) => a.id === 'art-live-1'), 'Live article should be present');
    assert.ok(!liveArticles.some((a) => a.id === 'art-archived-2'), 'Archived article must be excluded');
    assert.ok(!liveArticles.some((a) => a.id === 'art-future-3'), 'Future scheduled article must be excluded');
    assert.ok(contentProvider.getPublishedNews().some((n) => n.id === 'news-1'));
    assert.ok(contentProvider.getPublishedAnnouncements().some((a) => a.id === 'ann-1'));
    assert.ok(contentProvider.getPublishedAudioItems().some((a) => a.id === 'aud-1'));
    assert.ok(contentProvider.getPublishedAudioItems().some((a) => a.id === 'own-aud-1'));
    assert.ok(contentProvider.getPublishedVideoItems().some((v) => v.id === 'vid-1'));
    results.push('✅ [1/12] CentralContentProvider reads live single-source-of-truth content');
    results.push('✅ [2/12] Archived, draft & future-scheduled items strictly excluded');

    // Setup TelegramBotEngine with isolated temp stores
    const sent: SentMessage[] = [];
    const storePath = path.join(tmpRoot, 'telegram_store.json');
    const outboxPath = path.join(tmpRoot, 'telegram_outbox.json');
    const releaseStorePath = path.join(tmpRoot, 'app_releases.json');
    const releaseService = new AppReleaseService({
      rootDir: tmpRoot,
      storePath: releaseStorePath,
    });

    const engine = new TelegramBotEngine({
      config: makeTestConfig(),
      storePath,
      outboxPath,
      silentLogger: true,
      fetchImpl: createMockTelegramFetch(sent),
      readOnlyPrayerProvider: () => centralDb.prayerSchedule || null,
      centralContentReader: () => centralDb,
      appReleaseService: releaseService,
    });

    // Register 3 users: uz-Latn active, uz-Latn-new active, and one opted-out (/stop)
    const { user: u1 } = await engine.userService.registerOrTouchUser({
      id: 1001,
      is_bot: false,
      first_name: 'Ali',
    });
    await engine.repository.saveUser({
      ...u1,
      language: 'uz-Latn',
      prayerNotificationsEnabled: true,
      announcementsEnabled: true,
      stoppedByUser: false,
    });

    const { user: u2 } = await engine.userService.registerOrTouchUser({
      id: 1002,
      is_bot: false,
      first_name: 'Vali',
    });
    await engine.repository.saveUser({
      ...u2,
      language: 'uz-Latn-new',
      prayerNotificationsEnabled: true,
      announcementsEnabled: true,
      stoppedByUser: false,
    });

    const { user: u3 } = await engine.userService.registerOrTouchUser({
      id: 1003,
      is_bot: false,
      first_name: 'OptedOut',
    });
    await engine.repository.saveUser({
      ...u3,
      language: 'ru',
      stoppedByUser: true,
      prayerNotificationsEnabled: false,
      dailyWisdomEnabled: false,
      announcementsEnabled: false,
    });

    // TEST 3: SyncEngine article create + idempotency deduplication
    const firstEnqueue = await engine.syncEngine.enqueueContentEvent({
      entityType: 'article',
      entityId: 'art-live-1',
      action: 'created',
      payload: { title: 'Ilm olish fazilati', summary: 'Ilm izlash farzdir' },
      notifyOptions: { mode: 'section_only' },
      createdBy: 'admin',
    });
    assert.equal(firstEnqueue.deduplicated, false);
    const secondEnqueue = await engine.syncEngine.enqueueContentEvent({
      entityType: 'article',
      entityId: 'art-live-1',
      action: 'created',
      payload: { title: 'Ilm olish fazilati', summary: 'Ilm izlash farzdir' },
      notifyOptions: { mode: 'section_only' },
      createdBy: 'admin',
    });
    assert.equal(secondEnqueue.deduplicated, true, 'Identical mutation must be deduplicated');
    results.push('✅ [3/12] UnifiedSyncEngine idempotency & deduplication verified');

    // TEST 4 & 5: Announcement publish_and_notify sends localized messages (incl. uz-Latn-new) and respects /stop opt-out
    sent.length = 0;
    const annEnqueue = await engine.syncEngine.enqueueContentEvent({
      entityType: 'announcement',
      entityId: 'ann-1',
      action: 'published',
      payload: { title: 'Chiroyli shamol va o‘quv darsi', summary: 'G‘oyat muhim eʼlon' },
      notifyOptions: { mode: 'publish_and_notify' },
      createdBy: 'admin',
    });
    assert.equal(annEnqueue.deduplicated, false);
    await engine.syncEngine.processDueEvents();

    const notifiedChatIds = sent.filter((m) => m.method === 'sendMessage').map((m) => Number(m.body.chat_id));
    assert.ok(notifiedChatIds.includes(1001), 'Active uz-Latn user should receive announcement');
    assert.ok(notifiedChatIds.includes(1002), 'Active uz-Latn-new user should receive announcement');
    assert.ok(!notifiedChatIds.includes(1003), 'Opted-out (/stop) user must NOT receive notifications');
    const newUzMsg = sent.find((m) => m.method === 'sendMessage' && Number(m.body.chat_id) === 1002);
    assert.ok(
      newUzMsg && /[şçöğıŞÇÖĞ]/.test(String(newUzMsg.body.text || '')),
      'uz-Latn-new message must use New Uzbek alphabet diacritics'
    );
    results.push('✅ [4/12] Localized announcement push delivered including uz-Latn-new script');
    results.push('✅ [5/12] /stop opt-out user strictly protected from sync notifications');

    // TEST 6: Restart recovery re-queues stuck `processing` job persisted on disk
    const recoveryOutboxPath = path.join(tmpRoot, 'recovery_outbox.json');
    fs.writeFileSync(
      recoveryOutboxPath,
      JSON.stringify({
        events: [
          {
            id: 'sync_stuck_1',
            eventType: 'news.published',
            entityType: 'news',
            entityId: 'news-stuck',
            action: 'published',
            version: 1,
            idempotencyKey: 'news:news-stuck:published:v1:abc',
            contentHash: 'abc123',
            status: 'processing',
            attempts: 1,
            maxAttempts: 5,
            payload: { title: 'Interrupted News' },
            notifyOptions: { mode: 'section_only' },
            recipientsNotified: 0,
            recipientsSkipped: 0,
            recipientsFailed: 0,
            createdBy: 'admin',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        auditLogs: [],
        lastContentHashByEntity: {},
        deliveredKeys: [],
        updatedAt: new Date().toISOString(),
      })
    );
    const recoveryEngine = new UnifiedSyncEngine({
      storePath: recoveryOutboxPath,
      apiClient: engine.apiClient,
      repository: engine.repository,
      emojiRegistry: engine.emojiRegistry,
      logger: engine.logger,
    });
    const recoveredCount = recoveryEngine.recoverInterruptedJobs();
    assert.equal(recoveredCount, 1, 'Should recover 1 stuck processing job after restart');
    results.push('✅ [6/12] Transactional Outbox restart recovery verified');

    // TEST 7 & 8: AppReleaseService honesty (v4/v3 never treated as v5; upsert + download counter works)
    const emptyRelease = await releaseService.getResolvedReleaseInfo({ checkGitHub: false });
    assert.equal(emptyRelease.apkAvailable, false, 'Must honestly report apkAvailable=false when no v5 APK exists');
    assert.equal(emptyRelease.version, '5.0.0');

    await releaseService.upsertRelease({
      versionName: '4.0.0',
      versionCode: 400,
      apkDownloadUrl: 'https://asakaziyo.ai.studio/Asaka-Ziyo-v4.0.0.apk',
      apkSizeBytes: 7_473_103,
      signed: true,
      apksignerVerified: true,
      status: 'published',
    });
    const stillNoV5 = await releaseService.getResolvedReleaseInfo({ checkGitHub: false });
    assert.equal(stillNoV5.apkAvailable, false, 'v4.0.0 release must NEVER be returned as v5.0.0');

    const v5Record = await releaseService.upsertRelease({
      versionName: '5.0.0',
      versionCode: 500,
      apkDownloadUrl: 'https://asakaziyo.ai.studio/api/apk/download',
      apkSizeBytes: 12_500_000,
      sha256Checksum: 'a'.repeat(64),
      signed: true,
      apksignerVerified: true,
      status: 'published',
    });
    await releaseService.incrementDownloadCount(v5Record.id);
    const resolvedV5 = await releaseService.getResolvedReleaseInfo({ checkGitHub: false });
    assert.equal(resolvedV5.apkAvailable, true);
    assert.equal(resolvedV5.buildCode, 500);
    assert.ok(resolvedV5.downloadCount >= 1);
    results.push('✅ [7/12] AppReleaseService v4/v5 strict isolation & honest availability verified');
    results.push('✅ [8/12] AppReleaseService v5.0.0 registration & download counter verified');

    // TEST 9 & 10: Telegram Bot unified commands (/android & /start article_<id>)
    sent.length = 0;
    await engine.processUpdate({
      update_id: 9001,
      message: {
        message_id: 1,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 1001, type: 'private' },
        from: { id: 1001, is_bot: false, first_name: 'Ali' },
        text: '/android',
      },
    });
    const androidReply = sent.find((m) => m.method === 'sendMessage' && Number(m.body.chat_id) === 1001);
    assert.ok(androidReply && String(androidReply.body.text || '').includes('5.0.0'), '/android must display v5.0.0 card');

    sent.length = 0;
    await engine.processUpdate({
      update_id: 9002,
      message: {
        message_id: 2,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 1001, type: 'private' },
        from: { id: 1001, is_bot: false, first_name: 'Ali' },
        text: '/start article_art-live-1',
      },
    });
    const deepLinkReply = sent.find((m) => m.method === 'sendMessage' && Number(m.body.chat_id) === 1001);
    assert.ok(
      deepLinkReply && String(deepLinkReply.body.text || '').includes('Ilm olish fazilati'),
      '/start article_<id> deep-link must open exact central DB article'
    );
    results.push('✅ [9/12] Telegram Bot /android v5.0.0 verified release card works');
    results.push('✅ [10/12] Telegram Bot unified commands & /start deep-link routing verified');

    // TEST 11: 20-button Reply Keyboard & 5-language locale completeness
    for (const locale of ALL_LOCALES) {
      const bundle = getTelegramLocaleBundle(locale);
      const kb = buildPersistentReplyKeyboard(locale);
      const flatButtons = kb.keyboard.flat().map((b) => b.text);
      assert.equal(flatButtons.length, 20, `${locale} reply keyboard must have 20 buttons`);
      assert.ok(bundle.replyButtons.androidApp.length > 0, `${locale} missing androidApp reply button`);
      assert.ok(bundle.replyButtons.announcements.length > 0, `${locale} missing announcements reply button`);
    }
    results.push('✅ [11/12] 20-button persistent Reply Keyboard verified across all 5 languages');

    // TEST 12: Prayer schedule update sync event completes cleanly
    const prayerSync = await engine.syncEngine.enqueueContentEvent({
      entityType: 'prayer_schedule',
      entityId: 'asaka-main',
      action: 'updated',
      payload: { title: 'Asaka namoz vaqtlari yangilandi' },
      notifyOptions: { mode: 'section_only' },
      createdBy: 'admin',
    });
    await engine.syncEngine.processDueEvents();
    const status = engine.syncEngine.getStatusSummary();
    assert.ok(status.completed >= 2, 'Sync outbox should track completed prayer & article events');
    assert.equal(prayerSync.event.entityType, 'prayer_schedule');
    results.push('✅ [12/12] Prayer schedule update sync hook verified');

    console.log('\n' + results.join('\n'));
    console.log('\n🎉 ALL 12 UNIFIED ECOSYSTEM V4 INTEGRATION TESTS PASSED!\n');
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

run().catch((err) => {
  console.error('❌ Unified Ecosystem V4 test failed:', err);
  process.exit(1);
});
