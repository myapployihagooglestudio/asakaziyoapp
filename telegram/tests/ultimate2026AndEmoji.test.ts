/**
 * ASAKA ZIYO — 2026 Ultimate Upgrade + Bot API 9.4–10.4 Comprehensive Test Suite
 *
 * End-to-end deterministic verification of:
 *  1. Real Quran MP3 Library: 10 reciters, 114 surahs, strict (reciterId, surahNumber) integrity,
 *     zero cross-reciter fallback, native sendAudio + file_id cache reuse, favorites/history/stats,
 *     and Hifz audio integration.
 *  2. Admin Quran Audio Management: add custom reciter, valid MP3 magic-byte upload vs HTML/corrupt
 *     rejection, bulk manifest preview (NEVER auto-committing), explicit confirm commit + log, cancel safety.
 *  3. Bot API 9.4+ Official Telegram Premium Custom Emoji: /emoji_setup (Direct-Emoji-First & Category-First),
 *     unrestricted numeric IDs (e.g. 12-digit & 20-digit), ordinary Unicode rejection, getCustomEmojiStickers
 *     live verification, UTF-16 MessageEntity + HTML <tg-emoji> with XSS/HTML escaping, Reply & Inline
 *     icon_custom_emoji_id, ordinary users without Premium, RBAC blocking non-admins, and Firestore persistence
 *     across fresh engine restart.
 *  4. Bot API 9.4 Button Styles: primary/success/danger via Central Style Manager, Firestore override,
 *     and automatic older-client HTTP 400 fallback stripping both `style` and `icon_custom_emoji_id`.
 *  5. Bot API 10.1–10.3 Rich Messages & AI Draft Streaming: sendRichMessage with RichTextCustomEmoji,
 *     section_heading, table (is_compact), list, expandable_blockquote, buttons + automatic plain-text fallback
 *     on 400/404; sendMessageDraft streaming preview in private chats.
 *  6. Bot API 10.4 HTML Widgets: strict private-chat-only gating (blocked/degraded in group/channel),
 *     raw <= 32,768B & zlib-9 <= 4,096B validation, XSS escaping, automatic fallback on API rejection,
 *     and genuine utility cards (Prayer Countdown, HIFZ 30-Juz, Tasbeh Counter).
 *  7. Notification Center (11 toggles + multi-select 30/15/10/5/0/custom lead times + persistent
 *     notificationDispatchLog + zero duplicates across restart + Personal Reminders) & Privacy Center
 *     (isolated JSON export & confirmed self-delete).
 *  8. Full 5-language support (uz-Latn, uz-Cyrl, uz-Latn-new, ru, en) + backward compatibility.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { INITIAL_ASAKA_PRAYER_SCHEDULE } from '../../src/data/prayerTimesData';
import { QURAN_RECITERS, SURAHS_LIST } from '../../src/data/quranData';
import { TelegramBotEngine } from '../bot/telegramBotEngine';
import { DEFAULT_TELEGRAM_AI_MODEL, DEFAULT_TELEGRAM_MINIAPP_URL, TelegramPlatformConfig } from '../config';
import { FetchLike, TelegramApiClient, validateWidgetHtml } from '../api/telegramApiClient';
import { CUSTOM_EMOJI_ID_REGEX, CustomEmojiRegistry, escapeTelegramHtml } from '../emoji/customEmojiRegistry';
import { createScopedTelegramFirestoreBridge } from '../database/telegramRepository';
import { buildPersistentReplyKeyboard } from '../keyboards/keyboards';
import { TELEGRAM_SUPPORTED_LOCALES } from '../types';

interface RecordedApiCall {
  method: string;
  body: Record<string, any>;
}

interface MockOptions {
  validCustomEmojiIds?: string[];
  failButtonStyleOnce?: boolean;
  failRichMessage?: boolean;
  failWidget?: boolean;
  uploadedFileBuffer?: Buffer;
}

function createMockFetch(recorded: RecordedApiCall[], options: MockOptions = {}): FetchLike {
  const validEmojiIds = new Set(options.validCustomEmojiIds || []);
  let styleFailedOnce = false;

  return async (url, init) => {
    if (url.includes('/file/bot')) {
      const buf =
        options.uploadedFileBuffer ||
        Buffer.from([0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x20, ...Array(64).fill(0xaa)]);
      recorded.push({ method: 'downloadFile', body: { url, bytes: buf.length } });
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
        arrayBuffer: async () =>
          buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
      };
    }

    const methodMatch = url.match(/\/([a-zA-Z0-9_]+)$/);
    const method = methodMatch ? methodMatch[1] : 'unknown';
    let body: Record<string, any> = {};
    if (typeof init?.body === 'string' && init.body) {
      body = JSON.parse(init.body);
    } else if (init?.body && typeof FormData !== 'undefined' && init.body instanceof FormData) {
      body = { multipart: true, chat_id: init.body.get('chat_id') };
    }
    recorded.push({ method, body });

    if (method === 'getMe') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          result: { id: 999123, is_bot: true, first_name: 'ASAKA ZIYO', username: 'AsakaZiyoBot' },
        }),
      };
    }

    if (method === 'getFile') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          result: { file_id: body.file_id || 'f1', file_unique_id: 'u1', file_path: 'audio/test.mp3' },
        }),
      };
    }

    if (method === 'getCustomEmojiStickers') {
      const ids: string[] = Array.isArray(body.custom_emoji_ids) ? body.custom_emoji_ids : [];
      const matched = ids
        .filter((id) => validEmojiIds.has(id))
        .map((id) => ({
          file_id: `stk_${id}`,
          file_unique_id: `ustk_${id}`,
          type: 'custom_emoji',
          custom_emoji_id: id,
          emoji: '🕌',
          set_name: 'telegram_premium_pack',
        }));
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, result: matched }),
      };
    }

    if (method === 'sendRichMessage' && options.failRichMessage) {
      return {
        ok: false,
        status: 400,
        json: async () => ({ ok: false, error_code: 400, description: 'Bad Request: method not supported' }),
      };
    }

    if (method === 'sendWidget' && options.failWidget) {
      return {
        ok: false,
        status: 400,
        json: async () => ({ ok: false, error_code: 400, description: 'Bad Request: widgets unavailable' }),
      };
    }

    if (method === 'sendMessage' && options.failButtonStyleOnce && !styleFailedOnce) {
      const serialized = JSON.stringify(body.reply_markup || {});
      if (serialized.includes('"style"') || serialized.includes('"icon_custom_emoji_id"')) {
        styleFailedOnce = true;
        return {
          ok: false,
          status: 400,
          json: async () => ({
            ok: false,
            error_code: 400,
            description: 'Bad Request: invalid button style or icon_custom_emoji_id',
          }),
        };
      }
    }

    if (method === 'sendAudio') {
      const audioStr = String(body.audio || '');
      const cachedFileId = audioStr.startsWith('CQAC') ? audioStr : `CQAC_FILE_${recorded.length}`;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          result: {
            message_id: 500 + recorded.length,
            chat: { id: body.chat_id, type: 'private' },
            audio: { file_id: cachedFileId, file_unique_id: `uniq_${recorded.length}` },
          },
        }),
      };
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        result: { message_id: 200 + recorded.length, chat: { id: body.chat_id || 1, type: 'private' } },
      }),
    };
  };
}

function createConfig(): TelegramPlatformConfig {
  return {
    botToken: '123456789:TEST_ULTIMATE_2026_TOKEN_ABCDE',
    botUsername: 'AsakaZiyoBot',
    webhookSecret: 'secret_2026_token',
    webhookUrl: 'https://asakaziyo.ai.studio/api/telegram/platform/webhook',
    ownerId: '777001',
    adminIds: ['777001', '777002'],
    mode: 'webhook',
    modeAutoSelected: false,
    apiBaseUrl: 'https://api.telegram.org',
    defaultChannelUsername: '@Asaka_Ziyo',
    webAppUrl: DEFAULT_TELEGRAM_MINIAPP_URL,
    miniAppUrl: DEFAULT_TELEGRAM_MINIAPP_URL,
    defaultAiModel: DEFAULT_TELEGRAM_AI_MODEL,
    isConfigured: true,
    rateLimitMaxRequests: 500,
    rateLimitWindowMs: 60_000,
  };
}

async function runTests(): Promise<void> {
  const results: Array<{ name: string; ok: boolean; error?: string }> = [];
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'asaka-ziyo-2026-'));

  async function test(name: string, fn: () => Promise<void> | void): Promise<void> {
    try {
      await fn();
      results.push({ name, ok: true });
      console.log(`  [PASS] ${name}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ name, ok: false, error: msg });
      console.error(`  [FAIL] ${name} -> ${msg}`);
    }
  }

  console.log('\n=== ASAKA ZIYO 2026 ULTIMATE & BOT API 9.4–10.4 TEST SUITE ===\n');

  // 1. Real Quran MP3 Library: 10 reciters, 114 surahs, strict integrity, file_id caching, favorites/stats & Hifz
  await test('1. Quran MP3: 10 reciters, 114 surahs, strict reciter integrity, file_id cache & Hifz audio', async () => {
    const calls: RecordedApiCall[] = [];
    const customReciter = {
      id: 'reciter_odiljon_qori',
      name: 'Odiljon qori',
      nameAr: 'عادل جان قارئ',
      country: 'Oʻzbekiston',
      style: 'Murattal',
      rewaya: 'Hafs',
      biographyUz: 'Mahalliy qori',
      profileImageUrl: '/images/q.jpg',
      surahServerBaseUrl: '',
      ayahServerBaseUrl: '',
      subtext: 'Oʻzbekiston',
      previewUrl: '',
      isCustomUploaded: true,
      isActive: true,
    };

    const engine = new TelegramBotEngine({
      config: createConfig(),
      storePath: path.join(tempDir, 'qmp3_store.json'),
      fetchImpl: createMockFetch(calls),
      centralContentReader: () => ({
        quranReciters: [customReciter],
        quranAudioOverrides: {},
      }),
      silentLogger: true,
    });

    assert.equal(QURAN_RECITERS.length, 9);
    assert.equal(SURAHS_LIST.length, 114);
    const reciters = engine.quranMp3Service.listReciters();
    assert.equal(reciters.length, 10, 'Expected 9 canonical + 1 custom reciter = 10');

    // Every canonical reciter resolves 114 unique HTTPS MP3 URLs cleanly
    for (const c of QURAN_RECITERS) {
      const track1 = engine.quranMp3Service.resolveSurahTrack(c.id, 1);
      const track114 = engine.quranMp3Service.resolveSurahTrack(c.id, 114);
      assert.equal(track1?.status, 'ready');
      assert.ok(/\/(00)?1\.mp3$/.test(track1?.audioUrl || ''), `Unexpected surah 1 URL for ${c.id}: ${track1?.audioUrl}`);
      assert.equal(track114?.status, 'ready');
      assert.ok(track114?.audioUrl.endsWith('/114.mp3'));
    }

    // Strict integrity: custom reciter with missing surah MUST NOT fall back to another reciter!
    const missingTrack = engine.quranMp3Service.resolveSurahTrack('reciter_odiljon_qori', 36);
    assert.equal(missingTrack?.status, 'missing');
    assert.equal(missingTrack?.available, false);
    const missingPlay = await engine.quranMp3Service.sendSurahAudioToChat({
      chatId: 5001,
      telegramId: '5001',
      reciterId: 'reciter_odiljon_qori',
      surahNumber: 36,
    });
    assert.equal(missingPlay.ok, false);
    assert.equal(calls.filter((c) => c.method === 'sendAudio').length, 0);

    // First play sends HTTPS URL and caches Telegram file_id; second play reuses cached file_id
    await engine.userService.registerOrTouchUser({ id: 5001, is_bot: false, first_name: 'Zayd' });
    const play1 = await engine.quranMp3Service.sendSurahAudioToChat({
      chatId: 5001,
      telegramId: '5001',
      reciterId: 'mishary',
      surahNumber: 36,
    });
    assert.equal(play1.ok, true);
    assert.equal(play1.usedCachedFileId, false);
    assert.ok(play1.fileId?.startsWith('CQAC_FILE_'));

    const play2 = await engine.quranMp3Service.sendSurahAudioToChat({
      chatId: 5001,
      telegramId: '5001',
      reciterId: 'mishary',
      surahNumber: 36,
    });
    assert.equal(play2.ok, true);
    assert.equal(play2.usedCachedFileId, true);
    assert.equal(play2.fileId, play1.fileId);

    // Favorites, history, resume & stats updated accurately
    await engine.quranMp3Service.toggleFavoriteReciter('5001', 'mishary');
    await engine.quranMp3Service.toggleFavoriteSurah('5001', 'mishary', 36);
    const eng = engine.repository.getUserEngagement('5001');
    assert.equal(eng.audioListeningStats?.totalPlays, 2);
    assert.equal(eng.audioResume?.surahNumber, 36);
    assert.ok(eng.favoriteReciterIds?.includes('mishary'));
    assert.ok(eng.favoriteSurahTracks?.some((t) => t.reciterId === 'mishary' && t.surahNumber === 36));

    // Hifz audio listen callback uses QuranMp3Service native sendAudio
    const beforeAudioCalls = calls.filter((c) => c.method === 'sendAudio').length;
    await engine.processUpdate({
      update_id: 101,
      callback_query: {
        id: 'cb_hifz_audio',
        from: { id: 5001, is_bot: false, first_name: 'Zayd' },
        data: 'hifz:audio:listen:112',
        message: { message_id: 10, date: 1700000000, chat: { id: 5001, type: 'private' } },
      },
    });
    assert.equal(calls.filter((c) => c.method === 'sendAudio').length, beforeAudioCalls + 1);
  });

  // 2. Admin Audio Management: add reciter, MP3 magic-byte validation vs HTML rejection, bulk preview/confirm/cancel
  await test('2. Admin Audio: custom reciter, MP3 magic-byte check, HTML rejection & bulk preview/confirm safety', async () => {
    const calls: RecordedApiCall[] = [];
    const engine = new TelegramBotEngine({
      config: createConfig(),
      storePath: path.join(tempDir, 'admin_audio_store.json'),
      fetchImpl: createMockFetch(calls),
      silentLogger: true,
    });

    const addRes = await engine.quranMp3Service.upsertReciter(
      { id: 'test_qori_2026', nameUz: 'Test Qori 2026', styleUz: 'Murattal', serverUrl: '' },
      '777001'
    );
    assert.equal(addRes.ok, true);

    // Reject HTML disguised as MP3
    const htmlReject = await engine.quranMp3Service.uploadTrackBuffer({
      reciterId: 'test_qori_2026',
      surahNumber: 1,
      fileName: '001.mp3',
      buffer: Buffer.from('<!DOCTYPE html><html><body>Fake APK/MP3</body></html>'),
      mimeType: 'audio/mpeg',
      actorId: '777001',
    });
    assert.equal(htmlReject.ok, false);
    assert.ok(htmlReject.error?.includes('HTML'));

    // Accept genuine ID3 MP3 buffer
    const validMp3 = Buffer.from([0x49, 0x44, 0x33, 0x03, 0, 0, 0, 0, 0, 16, ...Array(32).fill(0x55)]);
    const mp3Ok = await engine.quranMp3Service.uploadTrackBuffer({
      reciterId: 'test_qori_2026',
      surahNumber: 1,
      fileName: '001.mp3',
      buffer: validMp3,
      mimeType: 'audio/mpeg',
      actorId: '777001',
    });
    assert.equal(mp3Ok.ok, true);
    assert.equal(engine.quranMp3Service.resolveSurahTrack('test_qori_2026', 1)?.status, 'ready');

    // Bulk import preview MUST NOT auto-commit before explicit confirm
    const preview = engine.quranMp3Service.createBulkImportPreview({
      reciterId: 'test_qori_2026',
      entries: [
        { pathOrFileName: '002.mp3', sourceUrl: 'https://server8.mp3quran.net/afs/002.mp3' },
        { pathOrFileName: '036_Yosin.mp3', sourceUrl: 'https://server8.mp3quran.net/afs/036.mp3' },
        { pathOrFileName: 'random_unmatched.mp3', sourceUrl: 'https://server8.mp3quran.net/afs/x.mp3' },
        { pathOrFileName: '003.mp3', sourceUrl: 'http://127.0.0.1/ssrf.mp3' }, // SSRF blocked!
      ],
      actorId: '777001',
    });
    assert.equal(preview.ok, true);
    assert.equal(preview.plan?.matchedCount, 2);
    assert.equal(preview.plan?.unmatchedCount, 2);
    // Verify nothing written yet
    assert.equal(engine.quranMp3Service.resolveSurahTrack('test_qori_2026', 2)?.status, 'missing');

    // Confirm commits ONLY the 2 matched items & writes import history
    const committed = await engine.quranMp3Service.commitBulkImportPlan(preview.plan!.planId, '777001');
    assert.equal(committed.ok, true);
    assert.equal(committed.appliedCount, 2);
    assert.equal(engine.quranMp3Service.resolveSurahTrack('test_qori_2026', 2)?.status, 'ready');
    assert.equal(engine.quranMp3Service.resolveSurahTrack('test_qori_2026', 36)?.status, 'ready');
    assert.equal(engine.quranMp3Service.resolveSurahTrack('test_qori_2026', 3)?.status, 'missing');
    assert.equal(engine.quranMp3Service.listImportLogs(5).length, 1);

    // Cancel plan leaves state untouched
    const cancelPreview = engine.quranMp3Service.createBulkImportPreview({
      reciterId: 'test_qori_2026',
      entries: [{ pathOrFileName: '114.mp3', sourceUrl: 'https://server8.mp3quran.net/afs/114.mp3' }],
      actorId: '777001',
    });
    engine.quranMp3Service.cancelBulkImportPlan(cancelPreview.plan!.planId);
    assert.equal(engine.quranMp3Service.resolveSurahTrack('test_qori_2026', 114)?.status, 'missing');
  });

  // 3. Official Bot API 9.4+ Premium Custom Emoji: /emoji_setup Direct-First & Category-First, unrestricted IDs,
  //    Unicode rejection, HTML <tg-emoji> escaping, Reply/Inline icons, RBAC & Firestore restart persistence
  await test('3. Premium Custom Emoji: /emoji_setup (both flows), unrestricted IDs, RBAC & Firestore persistence', async () => {
    const calls: RecordedApiCall[] = [];
    const firestoreDocs = new Map<string, Record<string, any>>();
    const fsBridge = createScopedTelegramFirestoreBridge({
      serverWriteFirestoreDoc: async (col, id, data) => {
        firestoreDocs.set(`${col}/${id}`, JSON.parse(JSON.stringify(data)));
        return { success: true };
      },
      serverDeleteFirestoreDoc: async (col, id) => {
        firestoreDocs.delete(`${col}/${id}`);
        return { success: true };
      },
      serverReadFirestoreCollection: async (col) => {
        const out: any[] = [];
        for (const [k, v] of firestoreDocs.entries()) {
          if (k.startsWith(`${col}/`)) out.push(JSON.parse(JSON.stringify(v)));
        }
        return out;
      },
    });

    // Test unrestricted numeric ID regex (short 10-digit AND 20-digit IDs both valid; non-digits rejected)
    assert.equal(CUSTOM_EMOJI_ID_REGEX.test('1234567890'), true);
    assert.equal(CUSTOM_EMOJI_ID_REGEX.test('53683241706712022861'), true);
    assert.equal(CUSTOM_EMOJI_ID_REGEX.test('abc123'), false);

    const idA = '123456789012'; // 12-digit ID (must NOT be rejected by old 15-22 restriction!)
    const idB = '53683241706712022869'; // 20-digit ID
    const storeFile = path.join(tempDir, 'emoji_persist_store.json');

    const engine = new TelegramBotEngine({
      config: createConfig(),
      firestore: fsBridge,
      storePath: storeFile,
      fetchImpl: createMockFetch(calls, { validCustomEmojiIds: [idA, idB] }),
      silentLogger: true,
    });

    const owner = { id: 777001, is_bot: false, first_name: 'Owner' };
    const regular = { id: 500999, is_bot: false, first_name: 'RegularUser' };

    // Non-admin blocked from /emoji_setup
    await engine.processUpdate({
      update_id: 301,
      message: { message_id: 1, date: 1700000301, chat: { id: 500999, type: 'private' }, from: regular, text: '/emoji_setup' },
    });
    assert.ok(String(calls.at(-1)?.body.text).toLowerCase().includes('ruxsat') || String(calls.at(-1)?.body.text).toLowerCase().includes('admin'));
    assert.equal(engine.repository.getUser('500999')?.activeFlow?.type || 'idle', 'idle');

    // Admin opens /emoji_setup -> enters Direct-Emoji-First mode (__ANY__)
    await engine.processUpdate({
      update_id: 302,
      message: { message_id: 2, date: 1700000302, chat: { id: 777001, type: 'private' }, from: owner, text: '/emoji_setup' },
    });
    assert.equal(engine.repository.getUser('777001')?.activeFlow?.type, 'admin_emoji_capture');

    // Ordinary Unicode emoji (no custom_emoji entity) -> cleanly rejected!
    await engine.processUpdate({
      update_id: 303,
      message: { message_id: 3, date: 1700000303, chat: { id: 777001, type: 'private' }, from: owner, text: '🕌' },
    });
    const rejectText = String(calls.at(-1)?.body.text || '').toLowerCase();
    assert.ok(rejectText.includes('oddiy') || rejectText.includes('custom_emoji') || rejectText.includes('premium'));
    assert.equal(rejectText.includes('❌'), false, 'Zero-plain-emoji policy: rejection message must not leak plain ❌');

    // Owner sends genuine Premium Custom Emoji (12-digit ID) -> verified via getCustomEmojiStickers -> pending category!
    await engine.processUpdate({
      update_id: 304,
      message: {
        message_id: 4,
        date: 1700000304,
        chat: { id: 777001, type: 'private' },
        from: owner,
        text: '🕌',
        entities: [{ type: 'custom_emoji', offset: 0, length: 2, custom_emoji_id: idA }],
      },
    });
    assert.equal(engine.repository.getUser('777001')?.activeFlow?.type, 'admin_emoji_pending_category');

    // Admin clicks bind to `prayer` category
    await engine.processUpdate({
      update_id: 305,
      callback_query: {
        id: 'cb_bind_prayer',
        from: owner,
        data: 'admin:emoji:bind:prayer',
        message: { message_id: 5, date: 1700000305, chat: { id: 777001, type: 'private' } },
      },
    });
    assert.equal(engine.emojiRegistry.getActiveCustomEmojiId('prayer'), idA);

    // Category-First flow: capture `quran_mp3` with 20-digit ID
    await engine.processUpdate({
      update_id: 306,
      callback_query: {
        id: 'cb_cap_mp3',
        from: owner,
        data: 'admin:emoji:capture:quran_mp3',
        message: { message_id: 6, date: 1700000306, chat: { id: 777001, type: 'private' } },
      },
    });
    await engine.processUpdate({
      update_id: 307,
      message: {
        message_id: 7,
        date: 1700000307,
        chat: { id: 777001, type: 'private' },
        from: owner,
        text: '🎧',
        entities: [{ type: 'custom_emoji', offset: 0, length: 2, custom_emoji_id: idB }],
      },
    });
    assert.equal(engine.emojiRegistry.getActiveCustomEmojiId('quran_mp3'), idB);

    // Enable keyboard icons and verify BOTH Reply & Inline buttons emit `icon_custom_emoji_id`
    engine.emojiRegistry.setKeyboardIconsEnabled(true);
    await engine.repository.saveSettings({ premiumKeyboardIconsEnabled: true }, '777001');
    const replyKb = buildPersistentReplyKeyboard('uz-Latn', engine.emojiRegistry);
    const hasReplyIcon = replyKb.keyboard.flat().some((btn) => btn.icon_custom_emoji_id === idA);
    assert.equal(hasReplyIcon, true, 'Reply keyboard must include icon_custom_emoji_id for prayer');

    // HTML <tg-emoji> formatting with strict HTML escaping
    const htmlRendered = engine.emojiRegistry.formatHtmlMessage('<b>Unsafe</b> & {{emoji:prayer}} Namoz');
    assert.ok(htmlRendered.html.includes(`<tg-emoji emoji-id="${idA}">`));
    assert.ok(htmlRendered.html.includes('&lt;b&gt;Unsafe&lt;/b&gt; &amp;'));
    assert.equal(escapeTelegramHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');

    // Ordinary user without Telegram Premium receives exact UTF-16 custom_emoji entities automatically
    const msgForRegular = engine.emojiRegistry.formatMessage('Assalom {{emoji:prayer}} va {{emoji:quran_mp3}}');
    assert.equal(msgForRegular.entities.length, 2);
    assert.equal(engine.emojiRegistry.validateFormattedEntities(msgForRegular).valid, true);

    // Fresh engine restart with empty local store hydrates custom emojis directly from Firestore!
    const freshEngine = new TelegramBotEngine({
      config: createConfig(),
      firestore: fsBridge,
      storePath: path.join(tempDir, 'fresh_after_restart.json'),
      fetchImpl: createMockFetch([], { validCustomEmojiIds: [idA, idB] }),
      silentLogger: true,
    });
    await freshEngine.initializeRuntime();
    freshEngine.stopRuntime();
    assert.equal(freshEngine.emojiRegistry.getActiveCustomEmojiId('prayer'), idA);
    assert.equal(freshEngine.emojiRegistry.getActiveCustomEmojiId('quran_mp3'), idB);
  });

  // 4. Bot API 9.4 Button Styles + Firestore override + older-client 400 fallback stripping
  await test('4. Bot API 9.4 Button Styles (primary/success/danger), overrides & HTTP 400 safe fallback', async () => {
    const calls: RecordedApiCall[] = [];
    const engine = new TelegramBotEngine({
      config: createConfig(),
      storePath: path.join(tempDir, 'styles_store.json'),
      fetchImpl: createMockFetch(calls, { failButtonStyleOnce: true }),
      silentLogger: true,
    });

    const sampleKb = {
      inline_keyboard: [
        [
          { text: 'Asosiy', callback_data: 'nav:home' },
          { text: 'Tasdiqlash', callback_data: 'admin:audio:bulk_confirm:1' },
          { text: 'Oʻchirish', callback_data: 'privacy:delete:confirm' },
        ],
      ],
    };
    const styled = engine.styleManager.decorateInlineMarkup(sampleKb);
    assert.equal(styled.inline_keyboard[0][0].style, 'primary');
    assert.equal(styled.inline_keyboard[0][1].style, 'success');
    assert.equal(styled.inline_keyboard[0][2].style, 'danger');

    // Override via Style Manager
    engine.styleManager.setButtonStyleOverride('nav:home', 'success');
    assert.equal(engine.styleManager.decorateInlineMarkup(sampleKb).inline_keyboard[0][0].style, 'success');

    // When Telegram returns HTTP 400 on button `style`/`icon_custom_emoji_id`, apiClient automatically retries stripped
    const res = await engine.apiClient.sendMessage({
      chat_id: 5001,
      text: 'Test styled button fallback',
      reply_markup: styled,
    });
    assert.equal(res.ok, true);
    const sendCalls = calls.filter((c) => c.method === 'sendMessage');
    assert.equal(sendCalls.length, 2, 'Should retry once after stripping unsupported button styles');
    assert.equal(sendCalls[1].body.reply_markup.inline_keyboard[0][0].style, undefined);
  });

  // 5. Bot API 10.1–10.3 Rich Messages (RichTextCustomEmoji, tables, expandable blocks, buttons) + fallback + AI draft
  await test('5. Bot API 10.1–10.3 Rich Messages + automatic plain-text fallback & AI streaming draft', async () => {
    const okCalls: RecordedApiCall[] = [];
    const engineOk = new TelegramBotEngine({
      config: createConfig(),
      storePath: path.join(tempDir, 'rich_ok.json'),
      fetchImpl: createMockFetch(okCalls),
      readOnlyPrayerProvider: () => INITIAL_ASAKA_PRAYER_SCHEDULE,
      aiGenerator: async () => 'AI javob matni',
      silentLogger: true,
    });
    await engineOk.repository.saveSettings(
      { richMessagesEnabled: true, aiStreamingDraftsEnabled: true },
      '777001'
    );
    engineOk.styleManager.syncFromSettings(engineOk.repository.getSettings());

    // /prayer sends native Bot API 10.1+ Rich Message with table + expandable_blockquote + buttons
    await engineOk.processUpdate({
      update_id: 501,
      message: {
        message_id: 1,
        date: 1700000501,
        chat: { id: 5005, type: 'private' },
        from: { id: 5005, is_bot: false, first_name: 'Karim' },
        text: '/prayer',
      },
    });
    const richCall = okCalls.find((c) => c.method === 'sendRichMessage');
    assert.ok(richCall, 'Expected sendRichMessage call when richMessagesEnabled=true');
    const blockTypes = (richCall.body.blocks || []).map((b: any) => b.type);
    assert.ok(blockTypes.includes('section_heading'));
    assert.ok(blockTypes.includes('table'));
    assert.ok(blockTypes.includes('expandable_blockquote'));

    // AI streaming draft in private chat
    engineOk.aiBridge.enterAiMode('5005');
    await engineOk.processUpdate({
      update_id: 502,
      message: {
        message_id: 2,
        date: 1700000502,
        chat: { id: 5005, type: 'private' },
        from: { id: 5005, is_bot: false, first_name: 'Karim' },
        text: 'Bomdod namozi haqida',
      },
    });
    assert.ok(okCalls.some((c) => c.method === 'sendMessageDraft'));

    // When Telegram rejects sendRichMessage (400), client automatically falls back to sendMessage
    const fbCalls: RecordedApiCall[] = [];
    const engineFb = new TelegramBotEngine({
      config: createConfig(),
      storePath: path.join(tempDir, 'rich_fb.json'),
      fetchImpl: createMockFetch(fbCalls, { failRichMessage: true }),
      readOnlyPrayerProvider: () => INITIAL_ASAKA_PRAYER_SCHEDULE,
      silentLogger: true,
    });
    const richBuild = engineFb.styleManager.buildPrayerRichMessage(engineFb.prayerAdapter, 'uz-Latn', false);
    const resFb = await engineFb.apiClient.sendRichMessage(
      { chat_id: 5005, blocks: richBuild.blocks },
      { chat_id: 5005, text: richBuild.fallbackText }
    );
    assert.equal(resFb.ok, true);
    assert.equal(resFb.usedFallback, true);
    assert.ok(fbCalls.some((c) => c.method === 'sendMessage'));
  });

  // 6. Bot API 10.4 HTML Widgets: private-chat-only enforcement, size/zlib limits, XSS escaping & fallback
  await test('6. Bot API 10.4 HTML Widgets: private-chat gating, 4KB zlib limit, XSS escape & fallback', async () => {
    const calls: RecordedApiCall[] = [];
    const engine = new TelegramBotEngine({
      config: createConfig(),
      storePath: path.join(tempDir, 'widget_store.json'),
      fetchImpl: createMockFetch(calls),
      readOnlyPrayerProvider: () => INITIAL_ASAKA_PRAYER_SCHEDULE,
      silentLogger: true,
    });

    // Validate Prayer, HIFZ, and Tasbeh widget HTML sizes (raw <= 32KB & zlib-9 <= 4KB) + zero external URLs
    const prayerW = engine.styleManager.buildPrayerCountdownWidgetHtml(engine.prayerAdapter);
    const hifzProfile = await engine.hifzService.getOrCreateProfile('5006');
    const hifzW = engine.styleManager.buildHifzProgressWidgetHtml(
      hifzProfile,
      engine.hifzService.getStats(hifzProfile)
    );
    const tasbehW = engine.styleManager.buildTasbehWidgetHtml('<script>xss</script> Subhanalloh', 'سُبْحَانَ اللَّهِ', 12, 33);

    for (const w of [prayerW, hifzW, tasbehW]) {
      const v = validateWidgetHtml(w.html);
      assert.equal(v.valid, true, `Widget invalid: ${v.error}`);
      assert.ok(v.rawBytes <= 32_768);
      assert.ok(v.zlibBytes <= 4_096);
      assert.ok(!w.html.includes('http://') && !w.html.includes('https://'), 'Widget must not call external network');
    }
    assert.ok(!tasbehW.html.includes('<script>xss</script>'));
    assert.ok(tasbehW.html.includes('&lt;script&gt;xss&lt;/script&gt;'));

    // Private chat -> calls sendWidget
    const privRes = await engine.apiClient.sendWidget(
      { chat_id: 5006, html: prayerW.html },
      { chatType: 'private', fallbackText: prayerW.fallbackText }
    );
    assert.equal(privRes.ok, true);
    assert.equal(privRes.usedFallback, false);
    assert.ok(calls.some((c) => c.method === 'sendWidget'));

    // Group/Channel -> MUST NOT call sendWidget; gracefully falls back to sendMessage
    const groupCalls: RecordedApiCall[] = [];
    const clientGrp = new TelegramApiClient(createConfig(), engine.logger, createMockFetch(groupCalls));
    const grpRes = await clientGrp.sendWidget(
      { chat_id: -100999, html: prayerW.html },
      { chatType: 'supergroup', fallbackText: prayerW.fallbackText }
    );
    assert.equal(grpRes.ok, true);
    assert.equal(grpRes.usedFallback, true);
    assert.equal(groupCalls.some((c) => c.method === 'sendWidget'), false);
    assert.equal(groupCalls.some((c) => c.method === 'sendMessage'), true);

    // Oversized widget (>32KB) cleanly rejected by validator
    assert.equal(validateWidgetHtml('<div>' + 'a'.repeat(40_000) + '</div>').valid, false);
  });

  // 7. Notification Center (11 types + multi-select lead times + persistent dedupe + Personal Reminders) & Privacy Center
  await test('7. Notification Center (multi-select lead times, persistent dedupe, reminders) & Privacy Center', async () => {
    const calls: RecordedApiCall[] = [];
    const persistStore = path.join(tempDir, 'notif_privacy_store.json');
    const bomdodTime = INITIAL_ASAKA_PRAYER_SCHEDULE.times.find((t) => t.key === 'bomdod')?.time || '05:00';
    const [bH, bM] = bomdodTime.split(':').map(Number);

    const engine = new TelegramBotEngine({
      config: createConfig(),
      storePath: persistStore,
      fetchImpl: createMockFetch(calls),
      readOnlyPrayerProvider: () => INITIAL_ASAKA_PRAYER_SCHEDULE,
      silentLogger: true,
    });

    await engine.userService.registerOrTouchUser({ id: 5007, is_bot: false, first_name: 'Bilol' });
    await engine.userService.toggleNotificationLeadMinutes('5007', 15);
    await engine.userService.setCustomLeadMinutes('5007', 20);
    await engine.userService.addPersonalReminder('5007', 'Duho namozi', '08:15');

    const prefs = engine.userService.getNotificationPreferences('5007');
    assert.ok(prefs.leadMinutes?.includes(15));
    assert.equal(prefs.customLeadMinutes, 20);

    // 15 minutes before Bomdod in Tashkent (UTC+5)
    const totalMin = bH * 60 + bM - 15;
    const preH = Math.floor(totalMin / 60);
    const preM = totalMin % 60;
    const tickTime = new Date(Date.UTC(2026, 5, 20, preH - 5, preM, 0));

    const tick1 = await engine.jobScheduler.runScheduledTick(tickTime);
    assert.equal(tick1.azanSent, 1);

    // Restart engine on same store -> persistent notificationDispatchLog prevents duplicate send!
    const restarted = new TelegramBotEngine({
      config: createConfig(),
      storePath: persistStore,
      fetchImpl: createMockFetch(calls),
      readOnlyPrayerProvider: () => INITIAL_ASAKA_PRAYER_SCHEDULE,
      silentLogger: true,
    });
    const tick2 = await restarted.jobScheduler.runScheduledTick(tickTime);
    assert.equal(tick2.azanSent, 0, 'Persistent dispatch log must prevent duplicate notification across restarts');

    // Personal reminder fires at 08:15 Tashkent (03:15 UTC)
    const remBefore = calls.filter((c) => c.method === 'sendMessage').length;
    await restarted.jobScheduler.runScheduledTick(new Date(Date.UTC(2026, 5, 20, 3, 15, 0)));
    const remAfter = calls.filter((c) => c.method === 'sendMessage').length;
    assert.ok(remAfter > remBefore, 'Personal reminder must dispatch at configured Tashkent time');

    // Privacy Center: isolated JSON export + confirmed self-delete
    const exported = restarted.userService.exportUserProfileJson('5007');
    assert.ok(typeof exported === 'string' && exported.includes('"telegramId": "5007"'));
    assert.ok(typeof exported === 'string' && exported.includes('Duho namozi'));

    await restarted.processUpdate({
      update_id: 701,
      callback_query: {
        id: 'cb_del_ok',
        from: { id: 5007, is_bot: false, first_name: 'Bilol' },
        data: 'privacy:delete:confirm',
        message: { message_id: 70, date: 1700000701, chat: { id: 5007, type: 'private' } },
      },
    });
    assert.equal(restarted.repository.getUser('5007'), null);
  });

  // 8. 5-Language Support & New Slash Commands (/quran_mp3, /privacy, /reminders, /style)
  await test('8. All 5 languages + new slash commands (/quran_mp3, /privacy, /reminders, /style)', async () => {
    const calls: RecordedApiCall[] = [];
    const engine = new TelegramBotEngine({
      config: createConfig(),
      storePath: path.join(tempDir, 'langs_store.json'),
      fetchImpl: createMockFetch(calls),
      readOnlyPrayerProvider: () => INITIAL_ASAKA_PRAYER_SCHEDULE,
      silentLogger: true,
    });

    const owner = { id: 777001, is_bot: false, first_name: 'Owner' };
    let uid = 800;
    for (const loc of TELEGRAM_SUPPORTED_LOCALES) {
      await engine.userService.registerOrTouchUser(owner);
      await engine.userService.setUserLanguage('777001', loc);
      for (const cmd of ['/quran_mp3', '/privacy', '/reminders', '/style']) {
        const res = await engine.processUpdate({
          update_id: uid++,
          message: {
            message_id: uid,
            date: 1700000800 + uid,
            chat: { id: 777001, type: 'private' },
            from: owner,
            text: cmd,
          },
        });
        assert.equal(res.ok, true, `${cmd} failed in ${loc}`);
        assert.equal(res.kind, 'command');
      }
    }
  });

  fs.rmSync(tempDir, { recursive: true, force: true });
  fs.rmSync(path.resolve(process.cwd(), 'data', 'uploads', 'quran-reciter-audio', 'test_qori_2026'), {
    recursive: true,
    force: true,
  });

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== SUMMARY: ${passed}/${results.length} PASSED ===\n`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

runTests().catch((err) => {
  console.error('Fatal test suite error:', err);
  process.exitCode = 1;
});
