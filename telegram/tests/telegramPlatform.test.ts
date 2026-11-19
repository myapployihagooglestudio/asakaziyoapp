/**
 * ASAKA ZIYO — Telegram Platform (Phase 2) Comprehensive Audited Test Suite
 *
 * Deterministically tests every requirement without leaking secrets or touching
 * any existing Web App / Mobile App collections or files:
 *  1. Config safety & strict TELEGRAM_BOT_TOKEN1 binding (zero legacy fallback, zero secret leaks)
 *  2. Bot API connection (`getMe`, unconfigured safety, honest Premium Emoji eligibility check)
 *  3. Strictly 5 languages (`uz-Latn`, `uz-Cyrl`, `uz-Latn-new` with ş/ç/ö/ğ, `ru`, `en`)
 *  4. All 11 commands (`/start`, `/prayer`, `/quran`, `/hadith`, `/dhikr`, `/ask`, `/profile`, `/language`, `/settings`, `/admin`, `/help`)
 *  5. 100% Inline Keyboard Callback Audit (every `callback_data` from every keyboard factory verified `handled === true`)
 *  6. Quran (daily ayah + featured surah list + Surah 36), Hadith browser, Dhikr + interactive Tasbeh counter
 *  7. All 5 language switches, prayer timetable rendering, settings toggles & restart persistence
 *  8. Telegram Premium Custom Emoji Registry (43 slots, 0 invented IDs, sticker set import + live verification,
 *     UTF-16 entity boundary validation, anti-mixing, honest keyboard icon gating, live test message send)
 *  9. Channel permission pre-check (`getChat` + `getChatMember`) blocking unauthorized publish & succeeding when admin
 * 10. AI Islamic Assistant (`AI_DISABLED`, `API_KEY_MISSING`, active Q&A + `uz-Latn-new` conversion + conversational mode + `ai:exit`)
 * 11. Scheduled Azan reminder & 05:00 Tashkent daily channel auto-publish tick + per-day deduplication
 * 12. RBAC Admin Panel (non-admin denied + audit logged; admin executes full control suite)
 * 13. Security & Isolation (webhook secret, least-privilege Firestore allowlist, rate limiter, redaction, Mini App HMAC)
 * 14. Startup bootstrap (polling auto-clear webhook + 11 commands synced + scheduler) & live diagnostics
 */

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { INITIAL_ASAKA_PRAYER_SCHEDULE } from '../../src/data/prayerTimesData';
import { TelegramBotEngine } from '../bot/telegramBotEngine';
import { TelegramPlatformConfig, getSafeTelegramConfigSummary, loadTelegramPlatformConfig } from '../config';
import { FetchLike, TelegramApiClient } from '../api/telegramApiClient';
import { CustomEmojiRegistry } from '../emoji/customEmojiRegistry';
import { getTelegramLocaleBundle } from '../locales';
import { createScopedTelegramFirestoreBridge } from '../database/telegramRepository';
import { createTelegramLogger, redactSensitiveValue } from '../middlewares/logger';
import { TelegramRateLimiter } from '../middlewares/rateLimiter';
import { isValidTelegramUpdatePayload, verifyWebhookSecretHeader } from '../middlewares/securityMiddleware';
import { buildMiniAppEntryUrl, verifyTelegramMiniAppInitData } from '../miniapp/miniAppConfig';
import {
  buildAdminChannelsKeyboard,
  buildAdminEmojisKeyboard,
  buildAdminHomeKeyboard,
  buildAiModeKeyboard,
  buildBackOnlyKeyboard,
  buildChannelsKeyboard,
  buildDhikrKeyboard,
  buildHadithKeyboard,
  buildLanguageKeyboard,
  buildMainMenuKeyboard,
  buildPrayerKeyboard,
  buildProfileKeyboard,
  buildQuranKeyboard,
  buildSettingsKeyboard,
  buildSurahListKeyboard,
} from '../keyboards/keyboards';
import { handleCallbackQuery } from '../handlers/callbackHandlers';
import { TELEGRAM_SUPPORTED_LOCALES, TelegramInlineKeyboardMarkup, TelegramLocale } from '../types';

interface RecordedApiCall {
  method: string;
  body: Record<string, any>;
}

interface MockTelegramOptions {
  validCustomEmojiIds?: string[];
  channelMemberStatus?: 'administrator' | 'member' | 'left';
  channelCanPost?: boolean;
  stickerSetType?: 'custom_emoji' | 'regular';
  stickerSetItems?: Array<{ emoji: string; custom_emoji_id: string }>;
}

function createMockTelegramFetch(
  recorded: RecordedApiCall[],
  options: MockTelegramOptions = {}
): FetchLike {
  const validEmojiIds = new Set(options.validCustomEmojiIds || []);
  const memberStatus = options.channelMemberStatus ?? 'administrator';
  const canPost = options.channelCanPost ?? true;
  const stickerSetType = options.stickerSetType ?? 'custom_emoji';

  return async (url, init) => {
    const methodMatch = url.match(/\/([a-zA-Z0-9_]+)$/);
    const method = methodMatch ? methodMatch[1] : 'unknown';
    const rawBody = typeof init?.body === 'string' ? init.body : '';
    const parsedBody = rawBody ? JSON.parse(rawBody) : {};
    recorded.push({ method, body: parsedBody });

    if (method === 'getMe') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          result: {
            id: 999000111,
            is_bot: true,
            first_name: 'ASAKA ZIYO Bot',
            username: 'AsakaZiyoTestBot',
            can_join_groups: true,
            can_read_all_group_messages: false,
            supports_inline_queries: false,
          },
        }),
      };
    }

    if (method === 'getStickerSet') {
      const items = options.stickerSetItems || [
        { emoji: '🕌', custom_emoji_id: '5368324170671202286' },
        { emoji: '🕰️', custom_emoji_id: '5368324170671202287' },
        { emoji: '📗', custom_emoji_id: '5368324170671202288' },
      ];
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          result: {
            name: parsedBody.name || 'asaka_ziyo_pack',
            title: 'ASAKA ZIYO Custom Pack',
            sticker_type: stickerSetType,
            stickers: items.map((item, idx) => ({
              file_id: `file_set_${idx}`,
              file_unique_id: `uniq_set_${idx}`,
              type: stickerSetType,
              width: 512,
              height: 512,
              is_animated: false,
              is_video: false,
              emoji: item.emoji,
              custom_emoji_id: stickerSetType === 'custom_emoji' ? item.custom_emoji_id : undefined,
            })),
          },
        }),
      };
    }

    if (method === 'getCustomEmojiStickers') {
      const requested: string[] = Array.isArray(parsedBody.custom_emoji_ids)
        ? parsedBody.custom_emoji_ids
        : [];
      const matched = requested
        .filter((id) => validEmojiIds.has(id))
        .map((id) => ({
          file_id: `file_${id}`,
          file_unique_id: `uniq_${id}`,
          type: 'custom_emoji',
          width: 512,
          height: 512,
          is_animated: false,
          is_video: false,
          custom_emoji_id: id,
          emoji: '🕌',
        }));
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, result: matched }),
      };
    }

    if (method === 'getChat') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          result: {
            id: -1001999888777,
            type: 'channel',
            title: 'ASAKA ZIYO Rasmiy Kanal',
            username: 'Asaka_Ziyo',
          },
        }),
      };
    }

    if (method === 'getChatMember') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          result: {
            status: memberStatus,
            can_post_messages: memberStatus === 'administrator' ? canPost : false,
          },
        }),
      };
    }

    if (method === 'getWebhookInfo') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          result: {
            url: '',
            has_custom_certificate: false,
            pending_update_count: 0,
          },
        }),
      };
    }

    if (method === 'sendMessage' || method === 'editMessageText') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          result: {
            message_id: 100 + recorded.length,
            chat: { id: parsedBody.chat_id, type: 'private' },
          },
        }),
      };
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, result: true }),
    };
  };
}

function createTestConfig(overrides: Partial<TelegramPlatformConfig> = {}): TelegramPlatformConfig {
  return {
    botToken: '123456789:TEST_TOKEN_SECRET_VALUE_ABCDEF',
    botUsername: 'AsakaZiyoTestBot',
    webhookSecret: 'super_secret_webhook_token_12345',
    webhookUrl: 'https://asakaziyo.uz/api/telegram/platform/webhook',
    ownerId: '777001',
    adminIds: ['777001', '777002'],
    mode: 'webhook',
    modeAutoSelected: false,
    apiBaseUrl: 'https://api.telegram.org',
    defaultChannelUsername: '@Asaka_Ziyo',
    webAppUrl: 'https://asakaziyo.uz',
    isConfigured: true,
    rateLimitMaxRequests: 100,
    rateLimitWindowMs: 60_000,
    ...overrides,
  };
}

const silentLogger = createTelegramLogger('TelegramTest', true);

function extractAllCallbacks(markups: TelegramInlineKeyboardMarkup[]): string[] {
  const set = new Set<string>();
  for (const m of markups) {
    for (const row of m.inline_keyboard) {
      for (const btn of row) {
        if (btn.callback_data) {
          set.add(btn.callback_data);
        }
      }
    }
  }
  return Array.from(set);
}

async function runTests(): Promise<void> {
  const results: Array<{ name: string; ok: boolean; error?: string }> = [];
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'asaka-ziyo-tg-test-'));
  const tempStorePath = path.join(tempDir, 'telegram_platform_store.json');

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

  console.log('\n=== ASAKA ZIYO TELEGRAM PLATFORM — PHASE 2 AUDITED TEST SUITE ===\n');

  // 1. Config safety & strict TELEGRAM_BOT_TOKEN1 binding
  await test('Config loader enforces strict TELEGRAM_BOT_TOKEN1 binding & redacts secrets', () => {
    const cfg = loadTelegramPlatformConfig({});
    assert.equal(cfg.isConfigured, false);
    assert.equal(cfg.botToken, '');
    assert.equal(cfg.mode, 'disabled');

    const legacyOnlyCfg = loadTelegramPlatformConfig({
      TELEGRAM_BOT_TOKEN: '999999999:LEGACY_TOKEN_MUST_BE_IGNORED_ABCDE',
    });
    assert.equal(legacyOnlyCfg.isConfigured, false);
    assert.equal(legacyOnlyCfg.botToken, '');
    assert.equal(legacyOnlyCfg.mode, 'disabled');

    const tokenOnlyCfg = loadTelegramPlatformConfig({
      TELEGRAM_BOT_TOKEN1: '123456789:TEST_TOKEN_SECRET_VALUE_ABCDEF',
      APP_URL: 'http://localhost:3000',
    });
    assert.equal(tokenOnlyCfg.mode, 'polling');
    assert.equal(tokenOnlyCfg.modeAutoSelected, true);
    assert.equal(tokenOnlyCfg.webAppUrl, 'https://asakaziyo.uz');

    const fullWebhookCfg = loadTelegramPlatformConfig({
      TELEGRAM_BOT_TOKEN1: '123456789:TEST_TOKEN_SECRET_VALUE_ABCDEF',
      TELEGRAM_WEBHOOK_URL: 'https://asakaziyo.uz/api/telegram/platform/webhook',
      TELEGRAM_WEBHOOK_SECRET: 'my_strong_secret_token_32chars_min',
      APP_URL: 'https://ais-dev.example.run.app',
    });
    assert.equal(fullWebhookCfg.mode, 'webhook');
    assert.equal(fullWebhookCfg.modeAutoSelected, true);
    assert.equal(fullWebhookCfg.webAppUrl, 'https://ais-dev.example.run.app');

    const safe = getSafeTelegramConfigSummary(createTestConfig());
    const serialized = JSON.stringify(safe);
    assert.equal(safe.tokenEnvVar, 'TELEGRAM_BOT_TOKEN1');
    assert.ok(!serialized.includes('TEST_TOKEN_SECRET_VALUE_ABCDEF'));
    assert.ok(!serialized.includes('super_secret_webhook_token_12345'));
  });

  // 2. Bot API connection & honest eligibility check
  await test('Bot API getMe connection & honest Premium Emoji eligibility', async () => {
    const calls: RecordedApiCall[] = [];
    const client = new TelegramApiClient(
      createTestConfig(),
      silentLogger,
      createMockTelegramFetch(calls)
    );
    const me = await client.getMe();
    assert.equal(me.ok, true);
    assert.equal(me.result?.username, 'AsakaZiyoTestBot');

    const eligibility = await client.verifyPremiumEmojiEligibility();
    assert.equal(eligibility.checked, true);
    assert.equal(eligibility.botConnected, true);
    assert.equal(eligibility.canVerifyCustomEmojis, true);
    assert.equal(eligibility.supportsMessageCustomEmojiEntities, false);
    assert.equal(eligibility.supportsKeyboardIconCustomEmoji, false);

    const unconfiguredClient = new TelegramApiClient(
      createTestConfig({ botToken: '', isConfigured: false }),
      silentLogger,
      createMockTelegramFetch([])
    );
    assert.equal((await unconfiguredClient.getMe()).ok, false);
  });

  // 3. Strictly 5 languages + New Uzbek Latin (ş, ç, ö, ğ)
  await test('Strictly 5 supported languages across all 11 commands & sections', () => {
    assert.deepEqual([...TELEGRAM_SUPPORTED_LOCALES], ['uz-Latn', 'uz-Cyrl', 'uz-Latn-new', 'ru', 'en']);

    for (const loc of TELEGRAM_SUPPORTED_LOCALES) {
      const bundle = getTelegramLocaleBundle(loc);
      assert.ok(bundle.languageName.length > 2);
      assert.ok(bundle.welcomeTitle.length > 5);
      assert.ok(bundle.buttons.prayerTimes.length > 2);
      assert.ok(bundle.buttons.quran.length > 2);
      assert.ok(bundle.buttons.hadith.length > 2);
      assert.ok(bundle.buttons.dhikr.length > 2);
      assert.ok(bundle.buttons.aiAssistant.length > 2);
      assert.ok(bundle.buttons.profile.length > 2);
      assert.ok(bundle.helpBody.includes('/start'));
      assert.ok(bundle.helpBody.includes('/prayer'));
      assert.ok(bundle.helpBody.includes('/quran'));
      assert.ok(bundle.helpBody.includes('/hadith'));
      assert.ok(bundle.helpBody.includes('/dhikr'));
      assert.ok(bundle.helpBody.includes('/ask'));
      assert.ok(bundle.helpBody.includes('/profile'));
      assert.ok(bundle.helpBody.includes('/language'));
      assert.ok(bundle.helpBody.includes('/settings'));
    }

    const newUz = getTelegramLocaleBundle('uz-Latn-new');
    assert.ok(newUz.languageName.includes('Ö') && newUz.languageName.includes('ç'));
    assert.ok(newUz.prayerNames.peshin.includes('ş'));
    assert.ok(newUz.prayerNames.shom.includes('Ş'));
    assert.ok(newUz.prayerNames.quyosh.includes('ş'));
  });

  // 4. All 11 commands (including RBAC check on /admin)
  await test('All 11 bot commands respond with rich localized UI and enforce RBAC on /admin', async () => {
    const calls: RecordedApiCall[] = [];
    const engine = new TelegramBotEngine({
      config: createTestConfig(),
      storePath: tempStorePath,
      fetchImpl: createMockTelegramFetch(calls),
      readOnlyPrayerProvider: () => INITIAL_ASAKA_PRAYER_SCHEDULE,
      aiGenerator: async (prompt) => `Javob: ${prompt}`,
      silentLogger: true,
    });

    const regularUser = {
      id: 500100,
      is_bot: false,
      first_name: 'Abdulloh',
      username: 'abdulloh_asaka',
      language_code: 'uz',
    };
    const ownerUser = {
      id: 777001,
      is_bot: false,
      first_name: 'Masjid Admin',
      username: 'asaka_owner',
      language_code: 'uz',
    };

    const cmds = [
      '/start',
      '/prayer',
      '/quran',
      '/hadith',
      '/dhikr',
      '/ask',
      '/profile',
      '/language',
      '/settings',
      '/help',
    ];
    let uid = 1;
    for (const cmd of cmds) {
      const res = await engine.processUpdate({
        update_id: uid++,
        message: {
          message_id: uid,
          date: 1700000000 + uid,
          chat: { id: 500100, type: 'private' },
          from: regularUser,
          text: cmd,
        },
      });
      assert.equal(res.ok, true);
      assert.equal(res.kind, 'command');
      assert.equal(res.detail, cmd);
      assert.equal(calls.at(-1)?.method, 'sendMessage');
      assert.ok(Array.isArray(calls.at(-1)?.body.reply_markup?.inline_keyboard));
    }

    // Non-admin /admin -> denied cleanly
    await engine.processUpdate({
      update_id: uid++,
      message: {
        message_id: uid,
        date: 1700000100,
        chat: { id: 500100, type: 'private' },
        from: regularUser,
        text: '/admin',
      },
    });
    const deniedText = String(calls.at(-1)?.body.text || '');
    assert.ok(deniedText.includes(getTelegramLocaleBundle('uz-Latn').adminAccessDenied));

    // Owner /admin -> receives Admin Control Panel keyboard
    await engine.processUpdate({
      update_id: uid++,
      message: {
        message_id: uid,
        date: 1700000101,
        chat: { id: 777001, type: 'private' },
        from: ownerUser,
        text: '/admin',
      },
    });
    const adminMarkup = calls.at(-1)?.body.reply_markup as TelegramInlineKeyboardMarkup;
    const adminCbs = extractAllCallbacks([adminMarkup]);
    assert.ok(adminCbs.includes('admin:channels'));
    assert.ok(adminCbs.includes('admin:emojis'));
    assert.ok(adminCbs.includes('admin:diagnostics'));
  });

  // 5. 100% Dynamic Inline Keyboard Callback Audit (ZERO dead buttons!)
  await test('100% Callback Audit: every callback_data across all 15 keyboard factories is handled', async () => {
    const calls: RecordedApiCall[] = [];
    const engine = new TelegramBotEngine({
      config: createTestConfig(),
      storePath: path.join(tempDir, 'callback_audit_store.json'),
      fetchImpl: createMockTelegramFetch(calls),
      readOnlyPrayerProvider: () => INITIAL_ASAKA_PRAYER_SCHEDULE,
      aiGenerator: async () => 'Test AI response',
      silentLogger: true,
    });

    const ownerUser = (
      await engine.userService.registerOrTouchUser({
        id: 777001,
        is_bot: false,
        first_name: 'Owner',
        username: 'asaka_owner',
      })
    ).user;
    const settings = engine.repository.getSettings();
    const channels = engine.channelService.listChannels();
    const surahs = engine.contentAdapter.getFeaturedSurahs();

    const allKeyboards: TelegramInlineKeyboardMarkup[] = [
      buildMainMenuKeyboard('uz-Latn', engine.emojiRegistry, engine.config, {
        isAdmin: true,
        miniAppEnabled: true,
      }),
      buildLanguageKeyboard('uz-Latn', engine.emojiRegistry),
      buildSettingsKeyboard(ownerUser, engine.emojiRegistry),
      buildPrayerKeyboard('uz-Latn', engine.emojiRegistry, engine.config, true),
      buildQuranKeyboard('uz-Latn', 0, 5, engine.emojiRegistry, engine.config, true),
      buildSurahListKeyboard('uz-Latn', surahs, engine.emojiRegistry),
      buildHadithKeyboard('uz-Latn', 0, 5, engine.emojiRegistry),
      buildDhikrKeyboard('uz-Latn', 0, 5, 2, engine.emojiRegistry),
      buildProfileKeyboard('uz-Latn', engine.emojiRegistry),
      buildAiModeKeyboard('uz-Latn', engine.emojiRegistry),
      buildAdminHomeKeyboard('uz-Latn', settings, engine.emojiRegistry),
      buildAdminChannelsKeyboard('uz-Latn', channels, engine.emojiRegistry),
      buildAdminEmojisKeyboard('uz-Latn', engine.emojiRegistry),
      buildChannelsKeyboard('uz-Latn', engine.emojiRegistry),
      buildBackOnlyKeyboard('uz-Latn', engine.emojiRegistry),
    ];

    const uniqueCallbacks = extractAllCallbacks(allKeyboards);
    assert.ok(uniqueCallbacks.length >= 30, `Expected >= 30 unique callbacks, got ${uniqueCallbacks.length}`);

    for (const cbData of uniqueCallbacks) {
      const res = await handleCallbackQuery(
        {
          id: `audit_${cbData}`,
          from: { id: 777001, is_bot: false, first_name: 'Owner' },
          data: cbData,
          message: { message_id: 50, date: 1700000200, chat: { id: 777001, type: 'private' } },
        },
        ownerUser,
        {
          apiClient: engine.apiClient,
          config: engine.config,
          emojiRegistry: engine.emojiRegistry,
          userService: engine.userService,
          prayerAdapter: engine.prayerAdapter,
          contentAdapter: engine.contentAdapter,
          aiBridge: engine.aiBridge,
          adminService: engine.adminService,
          channelService: engine.channelService,
          publishingService: engine.publishingService,
          repository: engine.repository,
          runDiagnostics: () => engine.runLiveDiagnostics(),
        }
      );
      assert.equal(res.handled, true, `DEAD BUTTON DETECTED: callback_data="${cbData}" was not handled!`);
    }
  });

  // 6. Quran (Surah list + Surah 36), Hadith pagination, Dhikr + interactive Tasbeh counter
  await test('Quran, Hadith, and Dhikr + Interactive Tasbeh counter work end-to-end', async () => {
    const calls: RecordedApiCall[] = [];
    const engine = new TelegramBotEngine({
      config: createTestConfig(),
      storePath: tempStorePath,
      fetchImpl: createMockTelegramFetch(calls),
      readOnlyPrayerProvider: () => INITIAL_ASAKA_PRAYER_SCHEDULE,
      silentLogger: true,
    });
    const from = { id: 500100, is_bot: false, first_name: 'Abdulloh' };

    // Surah 36 (Yosin)
    await engine.processUpdate({
      update_id: 201,
      callback_query: {
        id: 'cb_surah_36',
        from,
        data: 'quran:surah:36',
        message: { message_id: 25, date: 1700000300, chat: { id: 500100, type: 'private' } },
      },
    });
    const surahEdit = calls.filter((c) => c.method === 'editMessageText').at(-1);
    assert.ok(String(surahEdit?.body.text || '').includes('36'));

    // Hadith page 1
    await engine.processUpdate({
      update_id: 202,
      callback_query: {
        id: 'cb_hadith_1',
        from,
        data: 'hadith:view:1',
        message: { message_id: 25, date: 1700000301, chat: { id: 500100, type: 'private' } },
      },
    });
    assert.ok(String(calls.filter((c) => c.method === 'editMessageText').at(-1)?.body.text).length > 40);

    // Interactive Tasbeh increment -> 1, then reset -> 0
    await engine.processUpdate({
      update_id: 203,
      callback_query: {
        id: 'cb_tasbeh_1',
        from,
        data: 'dhikr:tasbeh:0:1',
        message: { message_id: 25, date: 1700000302, chat: { id: 500100, type: 'private' } },
      },
    });
    const tasbeh1 = calls.filter((c) => c.method === 'editMessageText').at(-1);
    assert.ok(String(tasbeh1?.body.text || '').includes('1 /'));

    await engine.processUpdate({
      update_id: 204,
      callback_query: {
        id: 'cb_tasbeh_reset',
        from,
        data: 'dhikr:tasbeh:0:0',
        message: { message_id: 25, date: 1700000303, chat: { id: 500100, type: 'private' } },
      },
    });
    const tasbeh0 = calls.filter((c) => c.method === 'editMessageText').at(-1);
    assert.ok(String(tasbeh0?.body.text || '').includes('0 /'));
  });

  // 7. All 5 language switches + prayer timetable + settings toggle + restart persistence
  await test('5-language switch, Asaka prayer times, notification toggle, and restart persistence', async () => {
    const calls: RecordedApiCall[] = [];
    const engine = new TelegramBotEngine({
      config: createTestConfig(),
      storePath: tempStorePath,
      fetchImpl: createMockTelegramFetch(calls),
      readOnlyPrayerProvider: () => INITIAL_ASAKA_PRAYER_SCHEDULE,
      silentLogger: true,
    });
    const fromUser = { id: 500100, is_bot: false, first_name: 'Abdulloh', username: 'abdulloh_asaka' };
    let updateId = 300;
    const expectedBomdodTime =
      INITIAL_ASAKA_PRAYER_SCHEDULE.times.find((t) => t.key === 'bomdod')?.time || '';
    const expectedPeshinTime =
      INITIAL_ASAKA_PRAYER_SCHEDULE.times.find((t) => t.key === 'peshin')?.time || '';

    for (const targetLocale of TELEGRAM_SUPPORTED_LOCALES) {
      await engine.processUpdate({
        update_id: ++updateId,
        callback_query: {
          id: `cb_lang_${targetLocale}`,
          from: fromUser,
          data: `lang:${targetLocale}`,
          message: { message_id: 20, date: 1700000010, chat: { id: 500100, type: 'private' } },
        },
      });
      assert.equal(engine.repository.getUser('500100')?.language, targetLocale);

      await engine.processUpdate({
        update_id: ++updateId,
        callback_query: {
          id: `cb_prayer_${targetLocale}`,
          from: fromUser,
          data: 'nav:prayer',
          message: { message_id: 20, date: 1700000011, chat: { id: 500100, type: 'private' } },
        },
      });
      const editCall = calls.filter((c) => c.method === 'editMessageText').at(-1);
      assert.ok(String(editCall?.body.text).includes(expectedBomdodTime));
      assert.ok(String(editCall?.body.text).includes(expectedPeshinTime));
      assert.ok(
        String(editCall?.body.text).includes(
          getTelegramLocaleBundle(targetLocale as TelegramLocale).prayerNames.bomdod
        )
      );
    }

    // Set final language to uz-Latn-new & toggle prayer alert
    await engine.processUpdate({
      update_id: ++updateId,
      callback_query: {
        id: 'cb_final_lang',
        from: fromUser,
        data: 'lang:uz-Latn-new',
        message: { message_id: 20, date: 1700000020, chat: { id: 500100, type: 'private' } },
      },
    });
    const beforeToggle = engine.repository.getUser('500100')!.prayerNotificationsEnabled;
    await engine.processUpdate({
      update_id: ++updateId,
      callback_query: {
        id: 'cb_toggle_prayer',
        from: fromUser,
        data: 'settings:toggle:prayerNotificationsEnabled',
        message: { message_id: 20, date: 1700000021, chat: { id: 500100, type: 'private' } },
      },
    });
    const afterToggle = engine.repository.getUser('500100')!.prayerNotificationsEnabled;
    assert.equal(afterToggle, !beforeToggle);

    // Restart persistence
    const restarted = new TelegramBotEngine({
      config: createTestConfig(),
      storePath: tempStorePath,
      fetchImpl: createMockTelegramFetch([]),
      silentLogger: true,
    });
    const persisted = restarted.repository.getUser('500100');
    assert.equal(persisted?.language, 'uz-Latn-new');
    assert.equal(persisted?.prayerNotificationsEnabled, afterToggle);
  });

  // 8. Telegram Premium Custom Emoji Registry (43 slots, sticker set import, UTF-16 validation, anti-mixing, live test send)
  await test('CustomEmojiRegistry: 43 slots, sticker set import, UTF-16 entity validation, anti-mixing & live test send', async () => {
    const registry = new CustomEmojiRegistry();
    const initial = registry.validateCompatibility();
    assert.equal(initial.totalRegisteredKeys, 43);
    assert.equal(initial.verifiedCustomCount, 0);
    assert.equal(initial.premiumRenderingActive, false);
    assert.equal(initial.keyboardCustomIconsActive, false);
    assert.deepEqual(initial.invalidEntries, []);

    // Rejects non-custom_emoji sticker set
    const regularClient = new TelegramApiClient(
      createTestConfig(),
      silentLogger,
      createMockTelegramFetch([], { stickerSetType: 'regular' })
    );
    const badImport = await registry.importFromTelegramStickerSet(regularClient, 'regular_pack');
    assert.equal(badImport.ok, false);
    assert.ok(String(badImport.error).includes('not "custom_emoji"'));

    // Imports real custom_emoji sticker set & verifies via getCustomEmojiStickers
    const validIds = ['5368324170671202286', '5368324170671202287'];
    const apiCalls: RecordedApiCall[] = [];
    const apiClient = new TelegramApiClient(
      createTestConfig(),
      silentLogger,
      createMockTelegramFetch(apiCalls, {
        validCustomEmojiIds: validIds,
        stickerSetType: 'custom_emoji',
        stickerSetItems: [
          { emoji: '🕌', custom_emoji_id: '5368324170671202286' },
          { emoji: '🕰️', custom_emoji_id: '5368324170671202287' },
          { emoji: '📗', custom_emoji_id: '5368324170671202288' }, // intentionally NOT in validIds -> stays unverified
        ],
      })
    );

    const imported = await registry.importFromTelegramStickerSet(apiClient, 'asaka_ziyo_pack');
    assert.equal(imported.ok, true);
    assert.ok(imported.matchedKeys.some((m) => m.key === 'brand.mosque' && m.verified === true));
    assert.ok(imported.matchedKeys.some((m) => m.key === 'nav.prayer' && m.verified === true));
    assert.ok(imported.matchedKeys.some((m) => m.key === 'nav.quran' && m.verified === false));

    // UTF-16 offset accuracy with surrogate pairs (🕌 = 2 UTF-16 units) + variation selector (🕰️ = 3 UTF-16 units)
    registry.setPremiumEnabled(true);
    const msg = registry.formatMessage('Assalom {{emoji:brand.mosque}} — {{emoji:nav.prayer}} — {{emoji:nav.quran}}');
    assert.equal(msg.usedCustomEmojiCount, 2);
    assert.equal(msg.usedFallbackCount, 1);
    assert.equal(msg.entities.length, 2);
    assert.equal(registry.validateFormattedEntities(msg).valid, true);
    for (const ent of msg.entities) {
      const slice = msg.text.slice(ent.offset, ent.offset + ent.length);
      assert.ok(slice === '🕌' || slice === '🕰️', `Unexpected UTF-16 slice: "${slice}"`);
    }
    // Anti-mixing: each glyph appears strictly ONCE (never duplicated custom + Unicode)
    assert.equal((msg.text.match(/🕌/g) || []).length, 1);
    assert.equal((msg.text.match(/🕰️/g) || []).length, 1);

    // Honest keyboard button gating: default keyboardIconsEnabled=false omits icon_custom_emoji_id
    const honestBtn = registry.buildKeyboardButton('brand.mosque', 'Asosiy', { callback_data: 'nav:home' });
    assert.equal(honestBtn.icon_custom_emoji_id, undefined);
    assert.ok(honestBtn.text.includes('🕌'));

    // Explicit opt-in keyboardIconsEnabled=true attaches verified icon_custom_emoji_id without duplicating glyph
    registry.setKeyboardIconsEnabled(true);
    const optInBtn = registry.buildKeyboardButton('brand.mosque', 'Asosiy', { callback_data: 'nav:home' });
    assert.equal(optInBtn.icon_custom_emoji_id, '5368324170671202286');
    assert.equal(optInBtn.text, 'Asosiy');

    // Live emoji test message send
    const testSend = await registry.sendLiveEmojiTestMessage(apiClient, 777001);
    assert.equal(testSend.ok, true);
    assert.equal(testSend.usedCustomEmojiCount, 2);
    assert.ok(testSend.usedFallbackCount >= 1);
  });

  // 9. Channel permission pre-check & prayer schedule publication
  await test('Channel publishing verifies bot admin & can_post_messages before publishing', async () => {
    // Case A: Bot is NOT admin -> blocked before sendMessage!
    const deniedCalls: RecordedApiCall[] = [];
    const deniedEngine = new TelegramBotEngine({
      config: createTestConfig(),
      storePath: path.join(tempDir, 'ch_denied_store.json'),
      fetchImpl: createMockTelegramFetch(deniedCalls, {
        channelMemberStatus: 'member',
        channelCanPost: false,
      }),
      readOnlyPrayerProvider: () => INITIAL_ASAKA_PRAYER_SCHEDULE,
      silentLogger: true,
    });

    const permDenied = await deniedEngine.publishingService.verifyChannelPermissions('asaka-ziyo-main');
    assert.equal(permDenied.canPostMessages, false);
    assert.equal(permDenied.ok, false);

    const blockedPub = await deniedEngine.publishingService.publishPrayerScheduleToChannel({
      channelId: 'asaka-ziyo-main',
      prayerAdapter: deniedEngine.prayerAdapter,
      createdBy: '777001',
    });
    assert.equal(blockedPub.success, false);
    assert.equal(deniedCalls.some((c) => c.method === 'sendMessage'), false);

    // Case B: Bot IS admin with can_post_messages=true -> succeeds!
    const okCalls: RecordedApiCall[] = [];
    const okEngine = new TelegramBotEngine({
      config: createTestConfig(),
      storePath: path.join(tempDir, 'ch_ok_store.json'),
      fetchImpl: createMockTelegramFetch(okCalls, {
        channelMemberStatus: 'administrator',
        channelCanPost: true,
      }),
      readOnlyPrayerProvider: () => INITIAL_ASAKA_PRAYER_SCHEDULE,
      silentLogger: true,
    });

    const permOk = await okEngine.publishingService.verifyChannelPermissions('asaka-ziyo-main');
    assert.equal(permOk.canPostMessages, true);
    assert.equal(permOk.ok, true);

    const okPub = await okEngine.publishingService.publishPrayerScheduleToChannel({
      channelId: 'asaka-ziyo-main',
      prayerAdapter: okEngine.prayerAdapter,
      createdBy: '777001',
    });
    assert.equal(okPub.success, true);
    assert.ok(okPub.record.telegramMessageId);
    assert.ok(okCalls.some((c) => c.method === 'sendMessage' && c.body.chat_id === '@Asaka_Ziyo'));
  });

  // 10. AI Islamic Assistant (disabled, missing key, active Q&A + conversational mode + uz-Latn-new + ai:exit)
  await test('AI Islamic Assistant honors settings, API key, conversational mode, uz-Latn-new, and ai:exit', async () => {
    const calls: RecordedApiCall[] = [];
    const storeAi = path.join(tempDir, 'ai_store.json');
    const engine = new TelegramBotEngine({
      config: createTestConfig(),
      storePath: storeAi,
      fetchImpl: createMockTelegramFetch(calls),
      aiGenerator: async (prompt) => `Bomdod namozi 2 rakat sunnat va 2 rakat farzdir. (${prompt})`,
      silentLogger: true,
    });

    // Disabled by default -> returns AI_DISABLED honestly
    const disabledRes = await engine.aiBridge.handleQuestion('500200', 'uz-Latn', 'Bomdod necha rakat?');
    assert.equal(disabledRes.ok, false);
    assert.equal(disabledRes.errorCode, 'AI_DISABLED');

    // Enable AI in settings
    await engine.repository.saveSettings({ aiAssistantEnabled: true }, '777001');

    // Without generator and without GEMINI_API_KEY -> returns API_KEY_MISSING honestly
    const prevKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      const noKeyEngine = new TelegramBotEngine({
        config: createTestConfig(),
        storePath: storeAi,
        fetchImpl: createMockTelegramFetch([]),
        silentLogger: true,
      });
      const noKeyRes = await noKeyEngine.aiBridge.handleQuestion('500200', 'uz-Latn', 'Test savol');
      assert.equal(noKeyRes.ok, false);
      assert.equal(noKeyRes.errorCode, 'API_KEY_MISSING');
    } finally {
      if (prevKey !== undefined) process.env.GEMINI_API_KEY = prevKey;
    }

    // Active AI mode via /ask -> conversational follow-up -> uz-Latn-new conversion -> ai:exit
    const fromUser = { id: 500200, is_bot: false, first_name: 'Bilol' };
    await engine.userService.registerOrTouchUser(fromUser);
    await engine.userService.setUserLanguage('500200', 'uz-Latn-new');

    await engine.processUpdate({
      update_id: 401,
      message: {
        message_id: 401,
        date: 1700000400,
        chat: { id: 500200, type: 'private' },
        from: fromUser,
        text: '/ask',
      },
    });
    assert.equal(engine.aiBridge.isUserInAiMode('500200'), true);

    const followUp = await engine.processUpdate({
      update_id: 402,
      message: {
        message_id: 402,
        date: 1700000401,
        chat: { id: 500200, type: 'private' },
        from: fromUser,
        text: 'Peshin namozi haqida',
      },
    });
    assert.equal(followUp.kind, 'ai_reply');
    assert.equal(followUp.detail, 'answered');
    assert.ok(calls.some((c) => c.method === 'sendChatAction' && c.body.action === 'typing'));
    assert.ok(String(calls.at(-1)?.body.text).includes('Peşin'));

    await engine.processUpdate({
      update_id: 403,
      callback_query: {
        id: 'cb_ai_exit',
        from: fromUser,
        data: 'ai:exit',
        message: { message_id: 402, date: 1700000402, chat: { id: 500200, type: 'private' } },
      },
    });
    assert.equal(engine.aiBridge.isUserInAiMode('500200'), false);
  });

  // 11. Scheduled Azan Reminder & 05:00 Tashkent Daily Channel Auto-Publish + Deduplication
  await test('JobScheduler dispatches Tashkent Azan reminders & 05:00 auto channel post with deduplication', async () => {
    const calls: RecordedApiCall[] = [];
    const bomdodTime = INITIAL_ASAKA_PRAYER_SCHEDULE.times.find((t) => t.key === 'bomdod')?.time || '05:00';
    const [bHour, bMin] = bomdodTime.split(':').map(Number);

    const engine = new TelegramBotEngine({
      config: createTestConfig(),
      storePath: path.join(tempDir, 'sched_store.json'),
      fetchImpl: createMockTelegramFetch(calls, {
        channelMemberStatus: 'administrator',
        channelCanPost: true,
      }),
      readOnlyPrayerProvider: () => INITIAL_ASAKA_PRAYER_SCHEDULE,
      silentLogger: true,
    });

    await engine.userService.registerOrTouchUser({ id: 6001, is_bot: false, first_name: 'Sub1' });
    await engine.userService.registerOrTouchUser({ id: 6002, is_bot: false, first_name: 'Sub2' });
    await engine.userService.toggleSetting('6002', 'prayerNotificationsEnabled'); // Sub2 muted

    const ch = engine.repository.getChannel('asaka-ziyo-main')!;
    await engine.channelService.upsertChannel('777001', { ...ch, autoPublishPrayerTimes: true });

    // Construct exact Tashkent (UTC+5) Date for bomdodTime
    const azanUtcDate = new Date(Date.UTC(2026, 4, 10, bHour - 5, bMin, 0));
    const tick1 = await engine.jobScheduler.runScheduledTick(azanUtcDate);
    assert.equal(tick1.azanSent, 1);

    // Second tick at same minute -> deduplicated (0 sent)
    const tick1Dup = await engine.jobScheduler.runScheduledTick(azanUtcDate);
    assert.equal(tick1Dup.azanSent, 0);

    // Exact 05:00 Asia/Tashkent (00:00 UTC) -> daily channel auto-publish
    const morningUtcDate = new Date(Date.UTC(2026, 4, 10, 0, 0, 0));
    const tick2 = await engine.jobScheduler.runScheduledTick(morningUtcDate);
    assert.equal(tick2.channelPostsSent, 1);

    const tick2Dup = await engine.jobScheduler.runScheduledTick(morningUtcDate);
    assert.equal(tick2Dup.channelPostsSent, 0);
  });

  // 12. RBAC Admin callback denial for regular user
  await test('RBAC blocks non-admin users from admin:* callbacks and records security audit log', async () => {
    const calls: RecordedApiCall[] = [];
    const engine = new TelegramBotEngine({
      config: createTestConfig(),
      storePath: path.join(tempDir, 'rbac_store.json'),
      fetchImpl: createMockTelegramFetch(calls),
      silentLogger: true,
    });
    const res = await engine.processUpdate({
      update_id: 501,
      callback_query: {
        id: 'cb_hack_admin',
        from: { id: 888999, is_bot: false, first_name: 'RegularUser' },
        data: 'admin:maintenance:toggle',
        message: { message_id: 501, date: 1700000500, chat: { id: 888999, type: 'private' } },
      },
    });
    assert.equal(res.detail, 'admin:denied');
    assert.equal(engine.repository.getSettings().maintenanceMode, false);
    assert.ok(engine.adminService.listAuditLogs(20).some((a) => a.action === 'admin_callback_denied'));
  });

  // 13. Security & Isolation
  await test('Security controls: webhook secret, least-privilege Firestore allowlist, rate limiter, redaction, Mini App HMAC', async () => {
    const cfg = createTestConfig();
    assert.equal(verifyWebhookSecretHeader(undefined, cfg).valid, false);
    assert.equal(verifyWebhookSecretHeader('wrong_token', cfg).valid, false);
    assert.equal(verifyWebhookSecretHeader(cfg.webhookSecret, cfg).valid, true);
    assert.equal(isValidTelegramUpdatePayload({ update_id: 1 }), true);
    assert.equal(isValidTelegramUpdatePayload({ invalid: true }), false);

    const writes: string[] = [];
    const bridge = createScopedTelegramFirestoreBridge({
      serverWriteFirestoreDoc: async (col, id) => {
        writes.push(`${col}/${id}`);
        return { success: true };
      },
      serverDeleteFirestoreDoc: async () => ({ success: true }),
    });
    await bridge.writeTelegramDoc('telegramUsers', '123', { id: '123' });
    assert.deepEqual(writes, ['telegramUsers/123']);

    for (const forbiddenCol of ['users', 'admins', 'schedules', 'articles', 'displayMonitors']) {
      await assert.rejects(
        () => bridge.writeTelegramDoc(forbiddenCol as any, 'doc1', {}),
        /Least-privilege violation/
      );
      await assert.rejects(
        () => bridge.deleteTelegramDoc(forbiddenCol as any, 'doc1'),
        /Least-privilege violation/
      );
    }

    const rl = new TelegramRateLimiter(3, 60_000);
    assert.equal(rl.check('u1').allowed, true);
    assert.equal(rl.check('u1').allowed, true);
    assert.equal(rl.check('u1').allowed, true);
    assert.equal(rl.check('u1').allowed, false);

    const redacted = redactSensitiveValue({
      token: '123456789:AAFakeSecretTokenValue1234567890',
      webhookSecret: 'my_webhook_secret',
      message: 'https://api.telegram.org/bot123456789:AAFakeSecretTokenValue1234567890/getMe',
    }) as Record<string, string>;
    assert.equal(redacted.token, '[REDACTED]');
    assert.equal(redacted.webhookSecret, '[REDACTED]');
    assert.ok(!redacted.message.includes('AAFakeSecretTokenValue1234567890'));

    const miniUrl = buildMiniAppEntryUrl(cfg, 'uz-Latn-new', 'prayer');
    assert.equal(miniUrl, 'https://asakaziyo.uz/?lang=uz-Latn-new&source=telegram_miniapp#prayer');

    const nowSec = Math.floor(Date.now() / 1000);
    const params = new URLSearchParams({
      auth_date: String(nowSec),
      query_id: 'AAHdF6IQAAAAAN0XohDhrOrc',
      user: JSON.stringify({ id: 500100, first_name: 'Abdulloh' }),
    });
    const pairs = Array.from(params.entries())
      .map(([k, v]) => `${k}=${v}`)
      .sort()
      .join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(cfg.botToken).digest();
    params.set('hash', crypto.createHmac('sha256', secretKey).update(pairs).digest('hex'));

    const validMini = verifyTelegramMiniAppInitData(params.toString(), cfg.botToken);
    assert.equal(validMini.valid, true);
    assert.equal(validMini.userId, '500100');

    params.set('query_id', 'TAMPERED');
    assert.equal(verifyTelegramMiniAppInitData(params.toString(), cfg.botToken).reason, 'SIGNATURE_MISMATCH');
  });

  // 14. Startup bootstrap & live diagnostics
  await test('Startup bootstrap syncs all 11 commands, clears webhook, starts scheduler & reports diagnostics', async () => {
    const pollingCalls: RecordedApiCall[] = [];
    const pollingEngine = new TelegramBotEngine({
      config: createTestConfig({ mode: 'polling', webhookUrl: '', webhookSecret: '' }),
      storePath: tempStorePath,
      fetchImpl: createMockTelegramFetch(pollingCalls),
      silentLogger: true,
    });
    const state = await pollingEngine.initializeRuntime();
    assert.equal(state.startupState, 'running_polling');
    assert.equal(state.botApiConnected, true);
    assert.equal(state.commandsSynced, true);
    assert.equal(state.polling.schedulerActive, true);
    pollingEngine.stopRuntime();

    const setCmdCall = pollingCalls.find((c) => c.method === 'setMyCommands');
    assert.equal(setCmdCall?.body.commands.length, 11);
    assert.ok(pollingCalls.some((c) => c.method === 'deleteWebhook'));

    const badWhEngine = new TelegramBotEngine({
      config: createTestConfig({ mode: 'webhook', webhookUrl: '', webhookSecret: '' }),
      storePath: tempStorePath,
      fetchImpl: createMockTelegramFetch([]),
      silentLogger: true,
    });
    const badState = await badWhEngine.initializeRuntime();
    assert.equal(badState.startupState, 'misconfigured');
    const diag = await badWhEngine.runLiveDiagnostics();
    assert.equal(diag.readyToAnswerStart, false);
    assert.ok(!JSON.stringify(diag).includes('TEST_TOKEN_SECRET_VALUE_ABCDEF'));
  });

  fs.rmSync(tempDir, { recursive: true, force: true });

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  console.log(`\nSummary: ${passed}/${results.length} passed, ${failed} failed.\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
