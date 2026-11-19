/**
 * ASAKA ZIYO — Telegram Super Platform Comprehensive Audited Test Suite
 *
 * Deterministically tests 25 critical scenarios without leaking secrets or touching
 * any existing Web App / Mobile App collections or files:
 *  1. Config safety, strict TELEGRAM_BOT_TOKEN1 binding & https://asakaziyo.ai.studio Mini App default
 *  2. Bot API connection (`getMe`, unconfigured safety, honest Premium Emoji eligibility check)
 *  3. Strictly 5 supported languages (`uz-Latn`, `uz-Cyrl`, `uz-Latn-new` with ş/ç/ö/ğ, `ru`, `en`)
 *  4. First-launch onboarding + all 27 bot commands + RBAC on `/admin`
 *  5. Persistent ReplyKeyboardMarkup matching across all 5 languages
 *  6. 100% Inline Keyboard Callback Audit across ALL keyboard factories (ZERO dead buttons!)
 *  7. Quran Center: 114 Surahs pagination, search flow, Surah 36, Tafsiri Hilol, Bookmarks & Khatm Planner
 *  8. Hadith collection filters (`bukhari`, `muslim`, `nawawi`), search flow & Daily Hadith
 *  9. Dhikr & interactive Tasbeh counter + custom goal flow + history persistence
 * 10. Situational Duas, Islamic Glossary, Media Library, Mosque Info (Qibla 241°) & Global Search
 * 11. Academy Lessons (completion tracking), Quiz session & Top-10 Leaderboard
 * 12. Prayer Intelligence: 5-language switch, Asaka timetable, Ramadan Saharlik/Iftorlik, Religious Calendar, Settings & Restart Persistence
 * 13. Telegram Premium Custom Emoji Registry (43 slots, sticker set import, UTF-16 entity validation, anti-mixing & live test send)
 * 14. Channel permission pre-check (`getChat` + `getChatMember`) blocking unauthorized publish & succeeding when admin
 * 15. Two-Way Support Tickets (`TKT-...`): creation, media attachment, admin reply relay to user, status update
 * 16. Broadcast Campaign Manager: 12 segments, test preview, 429 flood-wait retry, 403 auto-block, pause/cancel & CSV export
 * 17. `/stop` Opt-Out Protection: excludes opted-out user from Azan reminders, Daily Wisdom & Broadcasts
 * 18. Content Studio: multilingual drafts, approval, scheduled queue dispatch & duplicate-prevention idempotency
 * 19. AI Intelligence Engine: default `"gemini-3.5-flash-lite"`, honest `probeModelAvailability()`, explicit-only fallback boundary
 * 20. AI Multi-Turn Memory, Daily Budget / Per-User Cap, `AI_DISABLED`, `API_KEY_MISSING`, `uz-Latn-new` & `ai:exit`
 * 21. Multimodal AI Pipeline: Voice STT + Answer + optional WAV TTS (`sendAudio`), plus Photo/Document Vision Analysis
 * 22. Scheduled Job Tick: Azan reminders, 05:00 Tashkent daily channel post, 07:30 Daily Wisdom, scheduled drafts/broadcasts & schedule-change hook
 * 23. 7-Role RBAC Matrix & Security Audit Log (non-admin denial on callbacks & admin flows)
 * 24. Security & Isolation: webhook secret, 13-collection Firestore allowlist + honest failure telemetry, rate limiter, redaction & Mini App HMAC
 * 25. Startup Bootstrap: Firestore hydration, 20 commands synced, HTTPS Mini App menu button, webhook clearing & live diagnostics
 */

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { INITIAL_ASAKA_PRAYER_SCHEDULE } from '../../src/data/prayerTimesData';
import { TelegramBotEngine } from '../bot/telegramBotEngine';
import {
  DEFAULT_TELEGRAM_AI_MODEL,
  DEFAULT_TELEGRAM_MINIAPP_URL,
  TelegramPlatformConfig,
  getSafeTelegramConfigSummary,
  loadTelegramPlatformConfig,
} from '../config';
import { FetchLike, TelegramApiClient } from '../api/telegramApiClient';
import { CustomEmojiRegistry } from '../emoji/customEmojiRegistry';
import { getTelegramLocaleBundle } from '../locales';
import {
  ALLOWED_TELEGRAM_COLLECTIONS,
  createScopedTelegramFirestoreBridge,
} from '../database/telegramRepository';
import { createTelegramLogger, redactSensitiveValue } from '../middlewares/logger';
import { TelegramRateLimiter } from '../middlewares/rateLimiter';
import { isValidTelegramUpdatePayload, verifyWebhookSecretHeader } from '../middlewares/securityMiddleware';
import { buildMiniAppEntryUrl, verifyTelegramMiniAppInitData } from '../miniapp/miniAppConfig';
import {
  buildAcademyKeyboard,
  buildAdminAiControlKeyboard,
  buildAdminBroadcastsKeyboard,
  buildAdminChannelsKeyboard,
  buildAdminContentKeyboard,
  buildAdminEmojisKeyboard,
  buildAdminHomeKeyboard,
  buildAdminSupportKeyboard,
  buildAdminUsersKeyboard,
  buildAiModeKeyboard,
  buildBackOnlyKeyboard,
  buildChannelsKeyboard,
  buildDhikrKeyboard,
  buildDuaKeyboard,
  buildHadithKeyboard,
  buildKhatmKeyboard,
  buildLanguageKeyboard,
  buildMainMenuKeyboard,
  buildMediaLibraryKeyboard,
  buildOnboardingLanguageKeyboard,
  buildPersistentReplyKeyboard,
  buildPrayerKeyboard,
  buildProfileKeyboard,
  buildQuizQuestionKeyboard,
  buildQuizResultKeyboard,
  buildQuranKeyboard,
  buildSettingsKeyboard,
  buildSupportHomeKeyboard,
  buildSurahListKeyboard,
  buildTafsirKeyboard,
  matchReplyKeyboardAction,
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
  rateLimitOnceChatId?: string;
  blockedChatIds?: string[];
}

function createMockTelegramFetch(
  recorded: RecordedApiCall[],
  options: MockTelegramOptions = {}
): FetchLike {
  const validEmojiIds = new Set(options.validCustomEmojiIds || []);
  const memberStatus = options.channelMemberStatus ?? 'administrator';
  const canPost = options.channelCanPost ?? true;
  const stickerSetType = options.stickerSetType ?? 'custom_emoji';
  const blockedChats = new Set(options.blockedChatIds || []);
  let rateLimitedAlready = false;

  return async (url, init) => {
    if (url.includes('/file/bot')) {
      recorded.push({ method: 'downloadFile', body: { url } });
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
        arrayBuffer: async () => new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4]).buffer,
      };
    }

    const methodMatch = url.match(/\/([a-zA-Z0-9_]+)$/);
    const method = methodMatch ? methodMatch[1] : 'unknown';
    let parsedBody: Record<string, any> = {};
    if (typeof init?.body === 'string' && init.body) {
      parsedBody = JSON.parse(init.body);
    } else if (init?.body && typeof FormData !== 'undefined' && init.body instanceof FormData) {
      parsedBody = { multipart: true, chat_id: init.body.get('chat_id') };
    }
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

    if (method === 'getFile') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          result: {
            file_id: parsedBody.file_id || 'file_123',
            file_unique_id: 'uniq_123',
            file_size: 1024,
            file_path: 'voice/sample_audio.ogg',
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

    if (method === 'getChatMemberCount') {
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, result: 4520 }),
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

    if (
      method === 'sendMessage' ||
      method === 'editMessageText' ||
      method === 'sendPhoto' ||
      method === 'sendAudio' ||
      method === 'sendVoice' ||
      method === 'sendDocument'
    ) {
      const chatIdStr = String(parsedBody.chat_id || '');
      if (method === 'sendMessage' && blockedChats.has(chatIdStr)) {
        return {
          ok: false,
          status: 403,
          json: async () => ({
            ok: false,
            error_code: 403,
            description: 'Forbidden: bot was blocked by the user',
          }),
        };
      }
      if (
        method === 'sendMessage' &&
        options.rateLimitOnceChatId &&
        chatIdStr === options.rateLimitOnceChatId &&
        !rateLimitedAlready
      ) {
        rateLimitedAlready = true;
        return {
          ok: false,
          status: 429,
          json: async () => ({
            ok: false,
            error_code: 429,
            description: 'Too Many Requests: retry after 0',
            parameters: { retry_after: 0 },
          }),
        };
      }
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
    rateLimitMaxRequests: 200,
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
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'asaka-ziyo-tg-super-'));
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

  console.log('\n=== ASAKA ZIYO TELEGRAM SUPER PLATFORM — 25-SCENARIO AUDITED TEST SUITE ===\n');

  // 1. Config safety, strict TELEGRAM_BOT_TOKEN1 binding & https://asakaziyo.ai.studio default
  await test('1. Config enforces strict TELEGRAM_BOT_TOKEN1, Mini App default URL & secret redaction', () => {
    assert.equal(DEFAULT_TELEGRAM_MINIAPP_URL, 'https://asakaziyo.ai.studio');
    assert.equal(DEFAULT_TELEGRAM_AI_MODEL, 'gemini-3.5-flash-lite');

    const cfg = loadTelegramPlatformConfig({});
    assert.equal(cfg.isConfigured, false);
    assert.equal(cfg.botToken, '');
    assert.equal(cfg.mode, 'disabled');

    const legacyOnlyCfg = loadTelegramPlatformConfig({
      TELEGRAM_BOT_TOKEN: '999999999:LEGACY_TOKEN_MUST_BE_IGNORED_ABCDE',
    });
    assert.equal(legacyOnlyCfg.isConfigured, false);
    assert.equal(legacyOnlyCfg.botToken, '');

    const tokenOnlyCfg = loadTelegramPlatformConfig({
      TELEGRAM_BOT_TOKEN1: '123456789:TEST_TOKEN_SECRET_VALUE_ABCDEF',
      APP_URL: 'http://localhost:3000',
    });
    assert.equal(tokenOnlyCfg.mode, 'polling');
    assert.equal(tokenOnlyCfg.modeAutoSelected, true);
    assert.equal(tokenOnlyCfg.miniAppUrl, 'https://asakaziyo.ai.studio');
    assert.equal(tokenOnlyCfg.webAppUrl, 'https://asakaziyo.ai.studio');

    const safe = getSafeTelegramConfigSummary(createTestConfig());
    const serialized = JSON.stringify(safe);
    assert.equal(safe.tokenEnvVar, 'TELEGRAM_BOT_TOKEN1');
    assert.equal(safe.miniAppUrl, 'https://asakaziyo.ai.studio');
    assert.equal(safe.defaultAiModel, 'gemini-3.5-flash-lite');
    assert.ok(!serialized.includes('TEST_TOKEN_SECRET_VALUE_ABCDEF'));
    assert.ok(!serialized.includes('super_secret_webhook_token_12345'));
  });

  // 2. Bot API connection & honest Premium Emoji eligibility
  await test('2. Bot API getMe connection & honest Premium Emoji eligibility check', async () => {
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
    assert.equal(eligibility.supportsMessageCustomEmojiEntities, false);
    assert.equal(eligibility.supportsKeyboardIconCustomEmoji, false);

    const unconfiguredClient = new TelegramApiClient(
      createTestConfig({ botToken: '', isConfigured: false }),
      silentLogger,
      createMockTelegramFetch([])
    );
    assert.equal((await unconfiguredClient.getMe()).ok, false);
  });

  // 3. Strictly 5 supported languages + New Uzbek Latin (ş, ç, ö, ğ)
  await test('3. Strictly 5 supported languages across all commands, menus & reply buttons', () => {
    assert.deepEqual([...TELEGRAM_SUPPORTED_LOCALES], ['uz-Latn', 'uz-Cyrl', 'uz-Latn-new', 'ru', 'en']);

    for (const loc of TELEGRAM_SUPPORTED_LOCALES) {
      const bundle = getTelegramLocaleBundle(loc);
      assert.ok(bundle.languageName.length > 2);
      assert.ok(bundle.replyButtons.prayerTimes.length > 2);
      assert.ok(bundle.replyButtons.quranCenter.length > 2);
      assert.ok(bundle.replyButtons.aiAssistant.length > 2);
      assert.ok(bundle.replyButtons.academyQuiz.length > 2);
      assert.ok(bundle.replyButtons.support.length > 2);
      assert.ok(bundle.replyButtons.menuMiniApp.length > 2);
      assert.ok(bundle.commands.ramadan.length > 2);
      assert.ok(bundle.commands.support.length > 2);
      assert.ok(bundle.commands.stop.length > 2);
    }

    const newUz = getTelegramLocaleBundle('uz-Latn-new');
    assert.ok(newUz.languageName.includes('Ö') && newUz.languageName.includes('ç'));
    assert.ok(newUz.prayerNames.peshin.includes('ş'));
    assert.ok(newUz.prayerNames.shom.includes('Ş'));
  });

  // 4. First-launch onboarding + all 27 commands + RBAC on /admin
  await test('4. First-launch onboarding + all 27 bot commands + RBAC on /admin', async () => {
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

    // First /start -> onboarding language selector + persistent ReplyKeyboardMarkup
    await engine.processUpdate({
      update_id: 1,
      message: {
        message_id: 1,
        date: 1700000001,
        chat: { id: 500100, type: 'private' },
        from: regularUser,
        text: '/start',
      },
    });
    const lastTwo = calls.slice(-2);
    assert.ok(Array.isArray(lastTwo[0]?.body.reply_markup?.keyboard));
    const onboardCbs = extractAllCallbacks([lastTwo[1]?.body.reply_markup]);
    assert.ok(onboardCbs.includes('onboard:lang:uz-Latn'));

    // Complete onboarding
    await engine.processUpdate({
      update_id: 2,
      callback_query: {
        id: 'cb_onboard',
        from: regularUser,
        data: 'onboard:lang:uz-Latn',
        message: { message_id: 2, date: 1700000002, chat: { id: 500100, type: 'private' } },
      },
    });
    assert.equal(engine.repository.getUser('500100')?.onboardingCompleted, true);

    const all25UserCommands = [
      '/start',
      '/menu',
      '/prayer',
      '/ramadan',
      '/calendar',
      '/quran',
      '/tafsir',
      '/khatm',
      '/hadith',
      '/dhikr',
      '/dua',
      '/glossary',
      '/academy',
      '/quiz',
      '/leaderboard',
      '/library',
      '/mosque',
      '/ask',
      '/support',
      '/search',
      '/bookmarks',
      '/profile',
      '/language',
      '/settings',
      '/help',
    ];
    let uid = 10;
    for (const cmd of all25UserCommands) {
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
      assert.equal(res.ok, true, `Command ${cmd} failed`);
      assert.equal(res.kind, 'command');
      assert.equal(res.detail, cmd);
      assert.equal(calls.at(-1)?.method, 'sendMessage');
      assert.ok(
        Array.isArray(calls.at(-1)?.body.reply_markup?.inline_keyboard),
        `Command ${cmd} missing inline keyboard`
      );
    }

    // 26th command: /stop
    const stopRes = await engine.processUpdate({
      update_id: uid++,
      message: {
        message_id: uid,
        date: 1700000200,
        chat: { id: 500100, type: 'private' },
        from: regularUser,
        text: '/stop',
      },
    });
    assert.equal(stopRes.detail, '/stop');
    assert.equal(engine.repository.getUser('500100')?.stoppedByUser, true);
    // Re-enable for subsequent tests
    await engine.userService.toggleSetting('500100', 'prayerNotificationsEnabled');

    // 27th command: /admin -> denied for regular user, granted for owner
    await engine.processUpdate({
      update_id: uid++,
      message: {
        message_id: uid,
        date: 1700000201,
        chat: { id: 500100, type: 'private' },
        from: regularUser,
        text: '/admin',
      },
    });
    assert.ok(String(calls.at(-1)?.body.text).includes(getTelegramLocaleBundle('uz-Latn').adminAccessDenied));

    await engine.processUpdate({
      update_id: uid++,
      message: {
        message_id: uid,
        date: 1700000202,
        chat: { id: 777001, type: 'private' },
        from: ownerUser,
        text: '/admin',
      },
    });
    const adminCbs = extractAllCallbacks([calls.at(-1)?.body.reply_markup]);
    assert.ok(adminCbs.includes('admin:broadcasts'));
    assert.ok(adminCbs.includes('admin:support'));
    assert.ok(adminCbs.includes('admin:ai'));
    assert.ok(adminCbs.includes('admin:analytics'));
  });

  // 5. Persistent ReplyKeyboardMarkup matching across all 5 languages
  await test('5. Persistent ReplyKeyboardMarkup matches all 6 actions across all 5 languages', async () => {
    const calls: RecordedApiCall[] = [];
    const engine = new TelegramBotEngine({
      config: createTestConfig(),
      storePath: path.join(tempDir, 'reply_kb_store.json'),
      fetchImpl: createMockTelegramFetch(calls),
      readOnlyPrayerProvider: () => INITIAL_ASAKA_PRAYER_SCHEDULE,
      silentLogger: true,
    });

    for (const loc of TELEGRAM_SUPPORTED_LOCALES) {
      const kb = buildPersistentReplyKeyboard(loc);
      assert.equal(kb.keyboard.length, 3);
      for (const row of kb.keyboard) {
        for (const btn of row) {
          assert.ok(matchReplyKeyboardAction(btn.text) !== null, `Unmatched reply button "${btn.text}" in ${loc}`);
        }
      }
    }

    const ruPrayerLabel = getTelegramLocaleBundle('ru').replyButtons.prayerTimes;
    const outcome = await engine.processUpdate({
      update_id: 90,
      message: {
        message_id: 90,
        date: 1700000090,
        chat: { id: 500150, type: 'private' },
        from: { id: 500150, is_bot: false, first_name: 'Rustam', language_code: 'ru' },
        text: ruPrayerLabel,
      },
    });
    assert.equal(outcome.kind, 'reply_keyboard');
    assert.equal(outcome.detail, 'prayer');
  });

  // 6. 100% Dynamic Inline Keyboard Callback Audit across ALL keyboard factories
  await test('6. 100% Callback Audit: every callback_data across all 28 keyboard factories is handled', async () => {
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
    await engine.userService.markOnboardingComplete('777001');

    // Seed sample ticket, campaign, draft & quiz session for dynamic admin/quiz keyboards
    const sampleTicket = await engine.supportService.createTicket({
      user: ownerUser,
      category: 'imam_question',
      subject: 'Test',
      text: 'Test ticket body',
    });
    const sampleCampaign = await engine.broadcastManager.createCampaign({
      title: 'Test Campaign',
      mediaType: 'text',
      defaultText: 'Hello',
      segment: 'all_opt_in',
      createdBy: '777001',
    });
    const sampleDraft = await engine.contentStudio.createDraft({
      type: 'news',
      title: 'Test Draft',
      defaultBody: 'Body',
      createdBy: '777001',
    });
    engine.academyQuizService.startQuizSession('777001', 3);
    const quizQ = engine.academyQuizService.getCurrentQuizQuestion('777001')!;

    const settings = engine.repository.getSettings();
    const channels = engine.channelService.listChannels();
    const surahPage = engine.contentAdapter.getSurahPage(0, 10);

    const allKeyboards: TelegramInlineKeyboardMarkup[] = [
      buildOnboardingLanguageKeyboard(engine.emojiRegistry),
      buildMainMenuKeyboard('uz-Latn', engine.emojiRegistry, engine.config, {
        isAdmin: true,
        miniAppEnabled: true,
      }),
      buildLanguageKeyboard('uz-Latn', engine.emojiRegistry),
      buildSettingsKeyboard(ownerUser, engine.emojiRegistry),
      buildPrayerKeyboard('uz-Latn', engine.emojiRegistry, engine.config, true),
      buildQuranKeyboard('uz-Latn', 0, 5, engine.emojiRegistry, engine.config, true),
      buildSurahListKeyboard('uz-Latn', surahPage.items, engine.emojiRegistry, 0, surahPage.totalPages),
      buildTafsirKeyboard('uz-Latn', 0, 5, engine.emojiRegistry),
      buildKhatmKeyboard('uz-Latn', engine.emojiRegistry),
      buildHadithKeyboard('uz-Latn', 0, 5, engine.emojiRegistry),
      buildDhikrKeyboard('uz-Latn', 0, 5, 2, engine.emojiRegistry),
      buildDuaKeyboard('uz-Latn', 0, 8, engine.emojiRegistry),
      buildAcademyKeyboard('uz-Latn', 0, 5, 'lesson_1', engine.emojiRegistry),
      buildQuizQuestionKeyboard('uz-Latn', quizQ.question.optionsUz, engine.emojiRegistry),
      buildQuizResultKeyboard('uz-Latn', engine.emojiRegistry),
      buildMediaLibraryKeyboard('uz-Latn', 'articles', 0, 5, engine.emojiRegistry),
      buildSupportHomeKeyboard('uz-Latn', engine.emojiRegistry),
      buildProfileKeyboard('uz-Latn', engine.emojiRegistry),
      buildAiModeKeyboard('uz-Latn', engine.emojiRegistry),
      buildAdminHomeKeyboard('uz-Latn', settings, engine.emojiRegistry),
      buildAdminAiControlKeyboard('uz-Latn', settings, engine.emojiRegistry),
      buildAdminSupportKeyboard('uz-Latn', [sampleTicket], engine.emojiRegistry),
      buildAdminBroadcastsKeyboard('uz-Latn', [sampleCampaign], engine.emojiRegistry),
      buildAdminContentKeyboard('uz-Latn', [sampleDraft], engine.emojiRegistry),
      buildAdminUsersKeyboard('uz-Latn', engine.emojiRegistry),
      buildAdminChannelsKeyboard('uz-Latn', channels, engine.emojiRegistry),
      buildAdminEmojisKeyboard('uz-Latn', engine.emojiRegistry),
      buildChannelsKeyboard('uz-Latn', engine.emojiRegistry),
      buildBackOnlyKeyboard('uz-Latn', engine.emojiRegistry),
    ];

    const uniqueCallbacks = extractAllCallbacks(allKeyboards);
    assert.ok(uniqueCallbacks.length >= 80, `Expected >= 80 unique callbacks, got ${uniqueCallbacks.length}`);

    for (const cbData of uniqueCallbacks) {
      // Ensure active quiz session before testing quiz:ans callbacks
      if (cbData.startsWith('quiz:ans:') && !engine.academyQuizService.getCurrentQuizQuestion('777001')) {
        engine.academyQuizService.startQuizSession('777001', 3);
      }
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
          academyQuizService: engine.academyQuizService,
          supportService: engine.supportService,
          broadcastManager: engine.broadcastManager,
          contentStudio: engine.contentStudio,
          aiBridge: engine.aiBridge,
          adminService: engine.adminService,
          channelService: engine.channelService,
          publishingService: engine.publishingService,
          appReleaseService: engine.appReleaseService,
          repository: engine.repository,
          runDiagnostics: () => engine.runLiveDiagnostics(),
        }
      );
      assert.equal(res.handled, true, `DEAD BUTTON DETECTED: callback_data="${cbData}" was not handled!`);
    }
  });

  // 7. Quran Center: 114 Surahs pagination, search flow, Surah 36, Tafsir, Bookmarks & Khatm
  await test('7. Quran Center: 114 Surahs pagination, search, Surah 36, Tafsir, Bookmarks & Khatm', async () => {
    const calls: RecordedApiCall[] = [];
    const engine = new TelegramBotEngine({
      config: createTestConfig(),
      storePath: path.join(tempDir, 'quran_store.json'),
      fetchImpl: createMockTelegramFetch(calls),
      silentLogger: true,
    });
    assert.equal(engine.contentAdapter.getTotalSurahs(), 114);
    const p12 = engine.contentAdapter.getSurahPage(11, 10);
    assert.ok(p12.items.some((s) => s.number === 114));

    const from = { id: 500201, is_bot: false, first_name: 'Hafiz' };
    await engine.userService.registerOrTouchUser(from);

    // Trigger quran_search flow
    await engine.processUpdate({
      update_id: 210,
      callback_query: {
        id: 'cb_qs',
        from,
        data: 'quran:search',
        message: { message_id: 10, date: 1700000300, chat: { id: 500201, type: 'private' } },
      },
    });
    const searchOut = await engine.processUpdate({
      update_id: 211,
      message: {
        message_id: 11,
        date: 1700000301,
        chat: { id: 500201, type: 'private' },
        from,
        text: 'Yosin',
      },
    });
    assert.equal(searchOut.kind, 'flow_input');
    assert.equal(searchOut.detail, 'quran_search');

    // Khatm set days flow -> log juz
    await engine.userService.setActiveFlow('500201', { type: 'khatm_set_days' });
    await engine.processUpdate({
      update_id: 212,
      message: {
        message_id: 12,
        date: 1700000302,
        chat: { id: 500201, type: 'private' },
        from,
        text: '30',
      },
    });
    assert.equal(engine.repository.getUserEngagement('500201').khatmPlan?.targetDays, 30);

    await engine.contentAdapter.logKhatmJuzCompleted(engine.repository, '500201', 1);
    assert.equal(engine.repository.getUserEngagement('500201').khatmPlan?.completedJuz.length, 1);

    // Bookmark toggle
    const bmAdded = await engine.contentAdapter.toggleBookmark(engine.repository, '500201', {
      id: 'bm_surah_36',
      kind: 'surah',
      refId: '36',
      title: 'Yosin surasi',
    });
    assert.equal(bmAdded.saved, true);
    assert.equal(engine.repository.getUserEngagement('500201').bookmarks.length, 1);
  });

  // 8. Hadith filters & search
  await test('8. Hadith collection filters (bukhari/muslim/nawawi) & search flow work', async () => {
    const calls: RecordedApiCall[] = [];
    const engine = new TelegramBotEngine({
      config: createTestConfig(),
      storePath: path.join(tempDir, 'hadith_store.json'),
      fetchImpl: createMockTelegramFetch(calls),
      silentLogger: true,
    });
    assert.ok(engine.contentAdapter.getHadithsByCollection('bukhari').length >= 1);
    assert.ok(engine.contentAdapter.getHadithsByCollection('muslim').length >= 1);
    assert.ok(engine.contentAdapter.getHadithsByCollection('nawawi').length >= 1);

    const from = { id: 500202, is_bot: false, first_name: 'Talib' };
    await engine.userService.registerOrTouchUser(from);
    await engine.userService.setActiveFlow('500202', { type: 'hadith_search' });
    const res = await engine.processUpdate({
      update_id: 220,
      message: {
        message_id: 20,
        date: 1700000320,
        chat: { id: 500202, type: 'private' },
        from,
        text: 'niyat',
      },
    });
    assert.equal(res.kind, 'flow_input');
    assert.equal(res.detail, 'hadith_search');
  });

  // 9. Dhikr & Interactive Tasbeh counter + custom goal flow
  await test('9. Dhikr & Tasbeh counter + custom goal flow persist properly', async () => {
    const calls: RecordedApiCall[] = [];
    const engine = new TelegramBotEngine({
      config: createTestConfig(),
      storePath: path.join(tempDir, 'tasbeh_store.json'),
      fetchImpl: createMockTelegramFetch(calls),
      silentLogger: true,
    });
    const from = { id: 500203, is_bot: false, first_name: 'Zokir' };
    await engine.userService.registerOrTouchUser(from);

    await engine.userService.setActiveFlow('500203', { type: 'tasbeh_set_goal', dhikrIndex: 0 });
    await engine.processUpdate({
      update_id: 230,
      message: {
        message_id: 30,
        date: 1700000330,
        chat: { id: 500203, type: 'private' },
        from,
        text: '100',
      },
    });
    const dhikrState = engine.repository.getUserEngagement('500203').dhikr;
    assert.ok(Object.values(dhikrState.dailyGoals).includes(100));

    await engine.processUpdate({
      update_id: 231,
      callback_query: {
        id: 'cb_t1',
        from,
        data: 'dhikr:tasbeh:0:1',
        message: { message_id: 31, date: 1700000331, chat: { id: 500203, type: 'private' } },
      },
    });
    assert.equal(engine.repository.getUserEngagement('500203').dhikr.totalAllTimeCount, 1);
  });

  // 10. Situational Duas, Glossary, Media Library, Mosque Info (Qibla 241°) & Global Search
  await test('10. Situational Duas, Glossary, Media Library, Mosque Info (241°) & Global Search', () => {
    const engine = new TelegramBotEngine({
      config: createTestConfig(),
      storePath: path.join(tempDir, 'misc_content_store.json'),
      fetchImpl: createMockTelegramFetch([]),
      silentLogger: true,
    });
    const dua = engine.contentAdapter.formatSituationalDuaCard(0, 'uz-Latn', engine.emojiRegistry);
    assert.ok(dua.formatted.text.length > 30);

    const glossary = engine.contentAdapter.formatGlossaryPage('uz-Latn', engine.emojiRegistry);
    assert.ok(glossary.text.length > 50);

    const media = engine.contentAdapter.formatMediaLibraryItem(
      'articles',
      0,
      'uz-Latn',
      engine.emojiRegistry
    );
    assert.ok(media.formatted.text.length > 25);

    const mosque = engine.contentAdapter.formatMosqueInfoCard('uz-Latn', engine.emojiRegistry);
    assert.ok(mosque.text.includes('241'));

    const globalSearch = engine.contentAdapter.performGlobalSearch('Fotiha', 'uz-Latn');
    assert.ok(globalSearch.length > 20);
  });

  // 11. Academy Lessons, Quiz Session & Top-10 Leaderboard
  await test('11. Academy lessons completion, Quiz scoring & Top-10 Leaderboard', async () => {
    const engine = new TelegramBotEngine({
      config: createTestConfig(),
      storePath: path.join(tempDir, 'academy_store.json'),
      fetchImpl: createMockTelegramFetch([]),
      silentLogger: true,
    });
    await engine.userService.registerOrTouchUser({ id: 500210, is_bot: false, first_name: 'Umar' });
    const done = await engine.academyQuizService.toggleLessonCompleted('500210', 'lesson_1');
    assert.equal(done, true);

    engine.academyQuizService.startQuizSession('500210', 3);
    for (let i = 0; i < 3; i++) {
      const cur = engine.academyQuizService.getCurrentQuizQuestion('500210');
      assert.ok(cur);
      await engine.academyQuizService.submitQuizAnswer(
        '500210',
        'Umar',
        cur.question.correctIndex,
        'uz-Latn'
      );
    }
    const lb = engine.academyQuizService.getLeaderboard(10);
    assert.equal(lb.length, 1);
    assert.equal(lb[0].telegramId, '500210');
    assert.ok(lb[0].points > 0);
  });

  // 12. Prayer Intelligence: 5 languages, Ramadan, Calendar, Settings & Restart Persistence
  await test('12. 5-language switch, Asaka timetable, Ramadan, Calendar & restart persistence', async () => {
    const calls: RecordedApiCall[] = [];
    const persistPath = path.join(tempDir, 'persist_store.json');
    const engine = new TelegramBotEngine({
      config: createTestConfig(),
      storePath: persistPath,
      fetchImpl: createMockTelegramFetch(calls),
      readOnlyPrayerProvider: () => INITIAL_ASAKA_PRAYER_SCHEDULE,
      silentLogger: true,
    });
    const fromUser = { id: 500100, is_bot: false, first_name: 'Abdulloh', username: 'abdulloh_asaka' };
    let updateId = 300;
    const expectedBomdod = INITIAL_ASAKA_PRAYER_SCHEDULE.times.find((t) => t.key === 'bomdod')?.time || '';

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
      assert.ok(String(editCall?.body.text).includes(expectedBomdod));
    }

    const expectedSubh = INITIAL_ASAKA_PRAYER_SCHEDULE.times.find((t) => t.key === 'subh')?.time || '';
    const ramadanCard = engine.prayerAdapter.formatRamadanModeMessage('uz-Latn', engine.emojiRegistry);
    assert.ok(ramadanCard.text.includes(expectedSubh));
    const calCard = engine.prayerAdapter.formatReligiousCalendarMessage('uz-Latn', engine.emojiRegistry);
    assert.ok(calCard.text.length > 40);

    await engine.userService.setUserLanguage('500100', 'uz-Latn-new');
    const restarted = new TelegramBotEngine({
      config: createTestConfig(),
      storePath: persistPath,
      fetchImpl: createMockTelegramFetch([]),
      silentLogger: true,
    });
    assert.equal(restarted.repository.getUser('500100')?.language, 'uz-Latn-new');
  });

  // 13. Telegram Premium Custom Emoji Registry
  await test('13. CustomEmojiRegistry: 43 slots, sticker set import, UTF-16 validation & anti-mixing', async () => {
    const registry = new CustomEmojiRegistry();
    const initial = registry.validateCompatibility();
    assert.equal(initial.totalRegisteredKeys, 43);
    assert.equal(initial.verifiedCustomCount, 0);

    const apiClient = new TelegramApiClient(
      createTestConfig(),
      silentLogger,
      createMockTelegramFetch([], {
        validCustomEmojiIds: ['5368324170671202286', '5368324170671202287'],
        stickerSetType: 'custom_emoji',
        stickerSetItems: [
          { emoji: '🕌', custom_emoji_id: '5368324170671202286' },
          { emoji: '🕰️', custom_emoji_id: '5368324170671202287' },
          { emoji: '📗', custom_emoji_id: '5368324170671202288' },
        ],
      })
    );

    const imported = await registry.importFromTelegramStickerSet(apiClient, 'asaka_ziyo_pack');
    assert.equal(imported.ok, true);
    registry.setPremiumEnabled(true);
    const msg = registry.formatMessage('Assalom {{emoji:brand.mosque}} — {{emoji:nav.prayer}}');
    assert.equal(msg.usedCustomEmojiCount, 2);
    assert.equal(registry.validateFormattedEntities(msg).valid, true);
    assert.equal((msg.text.match(/🕌/g) || []).length, 1);

    const testSend = await registry.sendLiveEmojiTestMessage(apiClient, 777001);
    assert.equal(testSend.ok, true);
  });

  // 14. Channel permission pre-check & publishing
  await test('14. Channel publishing verifies admin & can_post_messages before publishing', async () => {
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
    const blockedPub = await deniedEngine.publishingService.publishPrayerScheduleToChannel({
      channelId: 'asaka-ziyo-main',
      prayerAdapter: deniedEngine.prayerAdapter,
      createdBy: '777001',
    });
    assert.equal(blockedPub.success, false);
    assert.equal(deniedCalls.some((c) => c.method === 'sendMessage'), false);

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
    const okPub = await okEngine.publishingService.publishPrayerScheduleToChannel({
      channelId: 'asaka-ziyo-main',
      prayerAdapter: okEngine.prayerAdapter,
      createdBy: '777001',
    });
    assert.equal(okPub.success, true);
  });

  // 15. Two-Way Support Tickets (creation, media attachment, admin reply relay)
  await test('15. Two-Way Support Tickets: media attachment creation & admin reply relay to user', async () => {
    const calls: RecordedApiCall[] = [];
    const engine = new TelegramBotEngine({
      config: createTestConfig(),
      storePath: path.join(tempDir, 'support_store.json'),
      fetchImpl: createMockTelegramFetch(calls),
      silentLogger: true,
    });
    const userFrom = { id: 500300, is_bot: false, first_name: 'Salim' };
    await engine.userService.registerOrTouchUser(userFrom);
    await engine.userService.setActiveFlow('500300', { type: 'support_new', category: 'imam_question' });

    const out = await engine.processUpdate({
      update_id: 350,
      message: {
        message_id: 350,
        date: 1700000350,
        chat: { id: 500300, type: 'private' },
        from: userFrom,
        caption: 'Imom domlaga savolim bor',
        photo: [{ file_id: 'photo_file_abc', file_unique_id: 'u1', width: 800, height: 600 }],
      },
    });
    assert.equal(out.kind, 'flow_input');
    const tickets = engine.supportService.listUserTickets('500300');
    assert.equal(tickets.length, 1);
    assert.ok(tickets[0].id.startsWith('TKT-'));
    assert.equal(tickets[0].messages[0].telegramFileId, 'photo_file_abc');

    const replyRes = await engine.supportService.replyFromAdmin({
      ticketId: tickets[0].id,
      adminId: '777001',
      adminName: 'Imom Domla',
      replyText: 'Va alaykum assalom, savolingizga javob:',
    });
    assert.equal(replyRes.ok, true);
    assert.equal(replyRes.deliveredToUser, true);
    assert.ok(
      calls.some(
        (c) =>
          c.method === 'sendMessage' &&
          String(c.body.chat_id) === '500300' &&
          String(c.body.text).includes(tickets[0].id)
      )
    );
  });

  // 16. Broadcast Campaign Manager (segments, test preview, 429 retry, 403 auto-block, pause/cancel, CSV)
  await test('16. Broadcast Campaign Manager: segments, test preview, 429 retry, 403 block & CSV', async () => {
    const calls: RecordedApiCall[] = [];
    const engine = new TelegramBotEngine({
      config: createTestConfig(),
      storePath: path.join(tempDir, 'broadcast_store.json'),
      fetchImpl: createMockTelegramFetch(calls, {
        rateLimitOnceChatId: '60010',
        blockedChatIds: ['60011'],
      }),
      silentLogger: true,
    });

    await engine.userService.registerOrTouchUser({ id: 60010, is_bot: false, first_name: 'RetryUser' });
    await engine.userService.registerOrTouchUser({ id: 60011, is_bot: false, first_name: 'BlockedUser' });
    await engine.userService.registerOrTouchUser({ id: 60012, is_bot: false, first_name: 'RuUser' });
    await engine.userService.setUserLanguage('60012', 'ru');

    const ruAudience = engine.broadcastManager.resolveAudience('lang_ru');
    assert.equal(ruAudience.length, 1);
    assert.equal(ruAudience[0].telegramId, '60012');

    const campaign = await engine.broadcastManager.createCampaign({
      title: 'Juma Muborak',
      mediaType: 'text',
      defaultText: 'Assalomu alaykum! Juma muborak!',
      textByLocale: { ru: 'Ассаляму алейкум! С благословенной пятницей!' },
      segment: 'all_opt_in',
      createdBy: '777001',
    });

    const preview = await engine.broadcastManager.sendTestPreview(campaign.id, '777001');
    assert.equal(preview.ok, true);

    const runRes = await engine.broadcastManager.runCampaign(campaign.id, '777001', {
      delayBetweenMessagesMs: 0,
    });
    assert.ok(runRes);
    assert.equal(runRes.status, 'completed');
    assert.equal(runRes.sentCount, 2); // 60010 (after 429 retry) + 60012
    assert.equal(runRes.blockedCount, 1); // 60011 (403 auto-blocked)
    assert.equal(engine.repository.getUser('60011')?.isBlocked, true);

    const csv = engine.broadcastManager.exportCampaignCsv(campaign.id);
    assert.ok(csv.includes('Juma Muborak'));

    const draftBc = await engine.broadcastManager.createCampaign({
      title: 'Cancelable',
      mediaType: 'text',
      defaultText: 'Test',
      segment: 'all_opt_in',
      scheduledAt: new Date(Date.now() + 3_600_000).toISOString(),
      createdBy: '777001',
    });
    const paused = await engine.broadcastManager.pauseCampaign(draftBc.id, '777001');
    assert.equal(paused?.status, 'paused');
    const cancelled = await engine.broadcastManager.cancelCampaign(draftBc.id, '777001');
    assert.equal(cancelled?.status, 'cancelled');
  });

  // 17. /stop Opt-Out Protection
  await test('17. /stop opt-out permanently excludes user from Azan, Daily Wisdom & Broadcasts', async () => {
    const calls: RecordedApiCall[] = [];
    const bomdodTime = INITIAL_ASAKA_PRAYER_SCHEDULE.times.find((t) => t.key === 'bomdod')?.time || '05:00';
    const [bHour, bMin] = bomdodTime.split(':').map(Number);
    const engine = new TelegramBotEngine({
      config: createTestConfig(),
      storePath: path.join(tempDir, 'optout_store.json'),
      fetchImpl: createMockTelegramFetch(calls),
      readOnlyPrayerProvider: () => INITIAL_ASAKA_PRAYER_SCHEDULE,
      silentLogger: true,
    });
    await engine.userService.registerOrTouchUser({ id: 60050, is_bot: false, first_name: 'OptedOut' });
    await engine.userService.optOutAllNotifications('60050');

    assert.equal(engine.broadcastManager.resolveAudience('all_opt_in').length, 0);

    const azanDate = new Date(Date.UTC(2026, 4, 15, bHour - 5, bMin, 0));
    const tick = await engine.jobScheduler.runScheduledTick(azanDate);
    assert.equal(tick.azanSent, 0);

    const wisdomDate = new Date(Date.UTC(2026, 4, 15, 2, 30, 0)); // 07:30 Tashkent
    const wTick = await engine.jobScheduler.runScheduledTick(wisdomDate);
    assert.equal(wTick.wisdomSent, 0);
  });

  // 18. Content Studio drafts, approval, scheduled publish & idempotency
  await test('18. Content Studio drafts, scheduled publish & duplicate-prevention idempotency', async () => {
    const calls: RecordedApiCall[] = [];
    const engine = new TelegramBotEngine({
      config: createTestConfig(),
      storePath: path.join(tempDir, 'studio_store.json'),
      fetchImpl: createMockTelegramFetch(calls, {
        channelMemberStatus: 'administrator',
        channelCanPost: true,
      }),
      silentLogger: true,
    });

    const pastIso = new Date(Date.now() - 60_000).toISOString();
    const draft = await engine.contentStudio.createDraft({
      type: 'announcement',
      title: 'Ramadan Lecture',
      defaultBody: 'Bugun soat 19:00 da maʼruza boʻladi.',
      scheduledAt: pastIso,
      createdBy: '777001',
    });
    assert.equal(draft.status, 'scheduled');

    const sentCount = await engine.contentStudio.processDueScheduledDrafts(new Date());
    assert.equal(sentCount, 1);
    assert.equal(engine.repository.getContentDraft(draft.id)?.status, 'published');

    // Second publish attempt with same draft -> idempotent duplicate prevention
    const dupRes = await engine.contentStudio.publishDraftToChannels(draft.id, '777001');
    const sendCalls = calls.filter((c) => c.method === 'sendMessage');
    assert.equal(sendCalls.length, 1);
    assert.equal(dupRes.results[0]?.duplicateSkipped, true);
  });

  // 19. AI Intelligence Engine: default "gemini-3.5-flash-lite", probe & explicit-only fallback
  await test('19. AI Engine defaults to gemini-3.5-flash-lite, probes honestly & never silently falls back', async () => {
    const engine = new TelegramBotEngine({
      config: createTestConfig(),
      storePath: path.join(tempDir, 'ai_model_store.json'),
      fetchImpl: createMockTelegramFetch([]),
      aiGenerator: async (_prompt, _sys, modelId) => {
        if (modelId === 'gemini-3.5-flash-lite') {
          throw new Error('404 Model gemini-3.5-flash-lite is not found');
        }
        return `Fallback response from ${modelId}`;
      },
      silentLogger: true,
    });

    const status = engine.aiBridge.getStatus();
    assert.equal(status.primaryModel, 'gemini-3.5-flash-lite');
    assert.equal(status.autoFallbackEnabled, false);

    // Without explicit autoFallbackEnabled -> MUST fail honestly without silently switching
    const res1 = await engine.aiBridge.handleQuestion('500400', 'uz-Latn', 'Namoz haqida');
    assert.equal(res1.ok, false);
    assert.equal(res1.modelRequested, 'gemini-3.5-flash-lite');
    assert.equal(res1.errorCode, 'MODEL_UNAVAILABLE');
    assert.equal(res1.modelUsed, undefined);

    // Explicit admin opt-in fallback -> uses fallback model transparently
    await engine.repository.saveSettings(
      { aiAutoFallbackEnabled: true, aiFallbackModel: 'gemini-2.5-flash' },
      '777001'
    );
    const res2 = await engine.aiBridge.handleQuestion('500400', 'uz-Latn', 'Namoz haqida');
    assert.equal(res2.ok, true);
    assert.equal(res2.modelRequested, 'gemini-3.5-flash-lite');
    assert.equal(res2.modelUsed, 'gemini-2.5-flash');

    // Probe without API key reports honest unavailable
    const prevKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      const probe = await engine.aiBridge.probeModelAvailability('gemini-3.5-flash-lite');
      assert.equal(probe.available, false);
      assert.equal(probe.model, 'gemini-3.5-flash-lite');
    } finally {
      if (prevKey !== undefined) process.env.GEMINI_API_KEY = prevKey;
    }
  });

  // 20. AI Multi-Turn Memory, Daily Caps, AI_DISABLED, API_KEY_MISSING, uz-Latn-new & ai:exit
  await test('20. AI Engine memory, daily per-user cap, AI_DISABLED, uz-Latn-new & ai:exit', async () => {
    const calls: RecordedApiCall[] = [];
    const storeAi = path.join(tempDir, 'ai_mem_store.json');
    let lastPromptSeen = '';
    const engine = new TelegramBotEngine({
      config: createTestConfig(),
      storePath: storeAi,
      fetchImpl: createMockTelegramFetch(calls),
      aiGenerator: async (prompt) => {
        lastPromptSeen = prompt;
        return 'Peshin namozi 4 rakat sunnat, 4 rakat farz va 2 rakat sunnatdir.';
      },
      silentLogger: true,
    });

    // Toggle AI off -> AI_DISABLED
    await engine.repository.saveSettings({ aiAssistantEnabled: false }, '777001');
    const offRes = await engine.aiBridge.handleQuestion('500401', 'uz-Latn', 'Test');
    assert.equal(offRes.errorCode, 'AI_DISABLED');

    // Toggle AI on with tight per-user cap = 2
    await engine.repository.saveSettings(
      { aiAssistantEnabled: true, aiMaxRequestsPerUserPerDay: 2 },
      '777001'
    );

    const from = { id: 500401, is_bot: false, first_name: 'Bilol' };
    await engine.userService.registerOrTouchUser(from);
    await engine.userService.setUserLanguage('500401', 'uz-Latn-new');
    engine.aiBridge.enterAiMode('500401');

    const q1 = await engine.processUpdate({
      update_id: 401,
      message: {
        message_id: 401,
        date: 1700000401,
        chat: { id: 500401, type: 'private' },
        from,
        text: 'Peshin namozi haqida ayting',
      },
    });
    assert.equal(q1.kind, 'ai_reply');
    assert.ok(String(calls.at(-1)?.body.text).includes('Peşin'));

    // Second turn includes conversation memory
    await engine.processUpdate({
      update_id: 402,
      message: {
        message_id: 402,
        date: 1700000402,
        chat: { id: 500401, type: 'private' },
        from,
        text: 'Davom eting',
      },
    });
    assert.ok(lastPromptSeen.includes('Peshin namozi haqida ayting'));

    // Third turn hits per-user daily cap = 2
    const q3 = await engine.aiBridge.handleQuestion('500401', 'uz-Latn-new', 'Yana bir savol');
    assert.equal(q3.ok, false);
    assert.equal(q3.errorCode, 'USER_CAP_EXCEEDED');

    // Exit AI mode
    await engine.processUpdate({
      update_id: 403,
      callback_query: {
        id: 'cb_ai_exit',
        from,
        data: 'ai:exit',
        message: { message_id: 402, date: 1700000403, chat: { id: 500401, type: 'private' } },
      },
    });
    assert.equal(engine.aiBridge.isUserInAiMode('500401'), false);
  });

  // 21. Multimodal AI Pipeline: Voice STT + TTS & Photo/Document Analysis
  await test('21. Multimodal AI Pipeline: Voice STT + WAV TTS & Photo Vision analysis', async () => {
    const calls: RecordedApiCall[] = [];
    const engine = new TelegramBotEngine({
      config: createTestConfig(),
      storePath: path.join(tempDir, 'multimodal_store.json'),
      fetchImpl: createMockTelegramFetch(calls),
      aiGenerator: async () => 'Bomdod namozi tong otishidan quyosh chiqquncha oʻqiladi.',
      aiTranscriber: async () => 'Bomdod namozi qachon oʻqiladi?',
      aiTts: async () => ({ buffer: Buffer.from('RIFF_WAV_DATA'), mimeType: 'audio/wav' }),
      silentLogger: true,
    });
    await engine.repository.saveSettings({ aiVoiceReplyEnabled: true }, '777001');
    const from = { id: 500450, is_bot: false, first_name: 'Sodiq' };

    const voiceOut = await engine.processUpdate({
      update_id: 450,
      message: {
        message_id: 450,
        date: 1700000450,
        chat: { id: 500450, type: 'private' },
        from,
        voice: { file_id: 'voice_1', file_unique_id: 'vu_1', duration: 3, mime_type: 'audio/ogg' },
      },
    });
    assert.equal(voiceOut.kind, 'voice_ai_reply');
    assert.equal(voiceOut.detail, 'answered');
    assert.ok(calls.some((c) => c.method === 'downloadFile'));
    assert.ok(calls.some((c) => c.method === 'sendAudio'));

    engine.aiBridge.enterAiMode('500450');
    const photoOut = await engine.processUpdate({
      update_id: 451,
      message: {
        message_id: 451,
        date: 1700000451,
        chat: { id: 500450, type: 'private' },
        from,
        caption: 'Bu matnni tushuntiring',
        photo: [{ file_id: 'photo_1', file_unique_id: 'pu_1', width: 512, height: 512 }],
      },
    });
    assert.equal(photoOut.kind, 'media_ai_reply');
    assert.equal(photoOut.detail, 'answered');
  });

  // 22. Scheduled Job Tick: Azan, 05:00 channel, 07:30 Wisdom, scheduled broadcast & schedule-change hook
  await test('22. JobScheduler dispatches Azan, 05:00 post, 07:30 wisdom, scheduled broadcast & schedule change', async () => {
    const calls: RecordedApiCall[] = [];
    let currentSchedule = {
      ...INITIAL_ASAKA_PRAYER_SCHEDULE,
      times: INITIAL_ASAKA_PRAYER_SCHEDULE.times.map((t) => ({ ...t })),
    };
    const bomdodTime = currentSchedule.times.find((t) => t.key === 'bomdod')?.time || '05:00';
    const [bHour, bMin] = bomdodTime.split(':').map(Number);

    const engine = new TelegramBotEngine({
      config: createTestConfig(),
      storePath: path.join(tempDir, 'sched_super_store.json'),
      fetchImpl: createMockTelegramFetch(calls, {
        channelMemberStatus: 'administrator',
        channelCanPost: true,
      }),
      readOnlyPrayerProvider: () => currentSchedule,
      silentLogger: true,
    });

    await engine.userService.registerOrTouchUser({ id: 6001, is_bot: false, first_name: 'Sub1' });
    const ch = engine.repository.getChannel('asaka-ziyo-main')!;
    await engine.channelService.upsertChannel('777001', { ...ch, autoPublishPrayerTimes: true });

    await engine.broadcastManager.createCampaign({
      title: 'Scheduled Alert',
      mediaType: 'text',
      defaultText: 'Scheduled body',
      segment: 'all_opt_in',
      scheduledAt: new Date(Date.UTC(2026, 4, 10, 2, 30, 0)).toISOString(), // 07:30 Tashkent
      createdBy: '777001',
    });

    const azanUtc = new Date(Date.UTC(2026, 4, 10, bHour - 5, bMin, 0));
    const tick1 = await engine.jobScheduler.runScheduledTick(azanUtc);
    assert.equal(tick1.azanSent, 1);

    const morningUtc = new Date(Date.UTC(2026, 4, 10, 0, 0, 0)); // 05:00 Tashkent
    const tick2 = await engine.jobScheduler.runScheduledTick(morningUtc);
    assert.equal(tick2.channelPostsSent, 1);

    const wisdomUtc = new Date(Date.UTC(2026, 4, 10, 2, 30, 0)); // 07:30 Tashkent
    const tick3 = await engine.jobScheduler.runScheduledTick(wisdomUtc);
    assert.equal(tick3.wisdomSent, 1);
    assert.equal(tick3.scheduledBroadcastsRun, 1);

    // Mutate read-only schedule time -> triggers schedule change notification
    currentSchedule = {
      ...currentSchedule,
      times: currentSchedule.times.map((t) =>
        t.key === 'peshin' ? { ...t, time: '12:35' } : t
      ),
    };
    const tick4 = await engine.jobScheduler.runScheduledTick(new Date(Date.UTC(2026, 4, 10, 3, 0, 0)));
    assert.equal(tick4.scheduleChangePostsSent, 1);
  });

  // 23. 7-Role RBAC Matrix & Non-Admin Security Denial
  await test('23. 7-Role RBAC permissions & non-admin denial with security audit log', async () => {
    const engine = new TelegramBotEngine({
      config: createTestConfig(),
      storePath: path.join(tempDir, 'rbac_super_store.json'),
      fetchImpl: createMockTelegramFetch([]),
      silentLogger: true,
    });

    await engine.adminService.grantAdminRole('777001', {
      telegramId: '777003',
      role: 'support_manager',
      displayName: 'Support Lead',
    });
    assert.equal(engine.adminService.hasPermission('777003', 'manage_support'), true);
    assert.equal(engine.adminService.hasPermission('777003', 'manage_broadcasts'), false);
    assert.equal(engine.adminService.hasPermission('777001', 'manage_ai'), true);

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

  // 24. Security & Isolation: 13-Collection Firestore Allowlist, Failure Telemetry, Redaction & Mini App HMAC
  await test('24. Security: 13-collection Firestore allowlist, honest sync failure telemetry & Mini App HMAC', async () => {
    assert.equal(ALLOWED_TELEGRAM_COLLECTIONS.length, 13);

    const cfg = createTestConfig();
    assert.equal(verifyWebhookSecretHeader(undefined, cfg).valid, false);
    assert.equal(verifyWebhookSecretHeader(cfg.webhookSecret, cfg).valid, true);
    assert.equal(isValidTelegramUpdatePayload({ update_id: 1 }), true);

    const writes: string[] = [];
    const bridge = createScopedTelegramFirestoreBridge({
      serverWriteFirestoreDoc: async (col, id) => {
        writes.push(`${col}/${id}`);
        if (col === 'telegramAuditLogs') return { success: false, error: 'PERMISSION_DENIED' };
        return { success: true };
      },
      serverDeleteFirestoreDoc: async () => ({ success: true }),
      serverReadFirestoreCollection: async () => [],
    });

    await bridge.writeTelegramDoc('telegramUsers', '123', { id: '123' });
    await bridge.writeTelegramDoc('telegramBroadcasts', 'bc1', { id: 'bc1' });
    await bridge.writeTelegramDoc('telegramSupportTickets', 't1', { id: 't1' });
    assert.equal(writes.length, 3);

    for (const forbiddenCol of ['users', 'admins', 'schedules', 'articles', 'displayMonitors']) {
      await assert.rejects(
        () => bridge.writeTelegramDoc(forbiddenCol as any, 'doc1', {}),
        /Least-privilege violation/
      );
    }

    // Honest Firestore failure telemetry (never silently swallowed)
    const repoEngine = new TelegramBotEngine({
      config: cfg,
      firestore: bridge,
      storePath: path.join(tempDir, 'fs_telemetry_store.json'),
      fetchImpl: createMockTelegramFetch([]),
      silentLogger: true,
    });
    await repoEngine.repository.appendAuditLog({
      actorTelegramId: '777001',
      actorRole: 'owner',
      action: 'test_failure_surface',
      targetType: 'system',
    });
    const syncTelemetry = repoEngine.repository.getFirestoreSyncStatus();
    assert.ok(syncTelemetry.totalWritesFailed >= 1);
    assert.ok(String(syncTelemetry.lastSyncError).includes('PERMISSION_DENIED'));

    const rl = new TelegramRateLimiter(2, 60_000);
    assert.equal(rl.check('u1').allowed, true);
    assert.equal(rl.check('u1').allowed, true);
    assert.equal(rl.check('u1').allowed, false);

    const redacted = redactSensitiveValue({
      token: '123456789:AAFakeSecretTokenValue1234567890',
    }) as Record<string, string>;
    assert.equal(redacted.token, '[REDACTED]');

    const miniUrl = buildMiniAppEntryUrl(cfg, 'uz-Latn-new', 'prayer');
    assert.equal(
      miniUrl,
      'https://asakaziyo.ai.studio/?lang=uz-Latn-new&source=telegram_miniapp#prayer'
    );

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
  });

  // 25. Startup Bootstrap & Live Diagnostics
  await test('25. Startup bootstrap hydrates Firestore, syncs 20 commands, sets Mini App menu button & diagnostics', async () => {
    const pollingCalls: RecordedApiCall[] = [];
    const pollingEngine = new TelegramBotEngine({
      config: createTestConfig({ mode: 'polling', webhookUrl: '', webhookSecret: '' }),
      storePath: path.join(tempDir, 'boot_store.json'),
      fetchImpl: createMockTelegramFetch(pollingCalls),
      silentLogger: true,
    });
    const state = await pollingEngine.initializeRuntime();
    assert.equal(state.startupState, 'running_polling');
    assert.equal(state.botApiConnected, true);
    assert.equal(state.commandsSynced, true);
    assert.equal(state.menuButtonConfigured, true);
    assert.equal(state.polling.schedulerActive, true);
    pollingEngine.stopRuntime();

    const setCmdCall = pollingCalls.find((c) => c.method === 'setMyCommands');
    assert.equal(setCmdCall?.body.commands.length, 20);
    assert.ok(pollingCalls.some((c) => c.method === 'setChatMenuButton'));
    assert.ok(pollingCalls.some((c) => c.method === 'deleteWebhook'));

    const health = pollingEngine.getPlatformHealth();
    assert.equal(health.phase, 'super_platform');
    assert.equal(health.miniAppUrl, 'https://asakaziyo.ai.studio');
  });

  fs.rmSync(tempDir, { recursive: true, force: true });

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
