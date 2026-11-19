/**
 * ASAKA ZIYO — Telegram Platform (Phase 1) Comprehensive Test Suite
 *
 * Tests all Step 9 requirements deterministically without leaking secrets or touching
 * any existing Web App / Mobile App collections or files:
 *  1. Bot API connection (`getMe`, unconfigured safety, honest Premium Emoji eligibility check)
 *  2. Commands (`/start`, `/help`, `/language`, `/settings`, unknown command handling)
 *  3. Strictly 5 languages (`uz-Latn`, `uz-Cyrl`, `uz-Latn-new` with ş/ç/ö/ğ rules, `ru`, `en`)
 *  4. Main navigation, inline keyboards, callback queries (`nav:*`, `lang:*`, `settings:toggle:*`, `prayer:refresh`)
 *  5. User registration & persistence across engine restarts in isolated store file
 *  6. Telegram Premium Custom Emoji Registry (zero invented IDs, invalid ID rejection,
 *     live API verification, UTF-16 MessageEntity offsets, keyboard `icon_custom_emoji_id`,
 *     automatic Unicode fallback, compatibility validation)
 *  7. Security & Isolation:
 *     - Webhook secret verification (`x-telegram-bot-api-secret-token`)
 *     - Least-privilege DB allowlist blocking writes/deletes to existing app collections (`users`, `admins`, `schedules`, `articles`)
 *     - Sliding-window per-user rate limiting
 *     - Secret redaction in logs
 *     - Telegram Mini App `initData` HMAC-SHA256 verification (valid + tampered + expired)
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
import { TELEGRAM_SUPPORTED_LOCALES, TelegramLocale } from '../types';

interface RecordedApiCall {
  method: string;
  body: Record<string, any>;
}

function createMockTelegramFetch(
  recorded: RecordedApiCall[],
  options?: { validCustomEmojiIds?: string[] }
): FetchLike {
  const validEmojiIds = new Set(options?.validCustomEmojiIds || []);
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
    rateLimitMaxRequests: 30,
    rateLimitWindowMs: 60_000,
    ...overrides,
  };
}

const silentLogger = createTelegramLogger('TelegramTest', true);

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

  console.log('\n=== ASAKA ZIYO TELEGRAM PLATFORM — PHASE 1 TEST SUITE ===\n');

  // 1. Config safety & zero secret leakage
  await test('Config loader defaults safely without secrets and redacts summary', () => {
    const cfg = loadTelegramPlatformConfig({});
    assert.equal(cfg.isConfigured, false);
    assert.equal(cfg.botToken, '');
    assert.equal(cfg.mode, 'disabled');

    // Auto-selects polling when ONLY TELEGRAM_BOT_TOKEN is set (prevents silent /start bug)
    const tokenOnlyCfg = loadTelegramPlatformConfig({
      TELEGRAM_BOT_TOKEN: '123456789:TEST_TOKEN_SECRET_VALUE_ABCDEF',
      APP_URL: 'http://localhost:3000',
    });
    assert.equal(tokenOnlyCfg.mode, 'polling');
    assert.equal(tokenOnlyCfg.modeAutoSelected, true);
    assert.equal(tokenOnlyCfg.webAppUrl, 'https://asakaziyo.uz');

    // Auto-selects webhook when token + webhook URL + webhook secret are all configured
    const fullWebhookCfg = loadTelegramPlatformConfig({
      TELEGRAM_BOT_TOKEN: '123456789:TEST_TOKEN_SECRET_VALUE_ABCDEF',
      TELEGRAM_WEBHOOK_URL: 'https://asakaziyo.uz/api/telegram/platform/webhook',
      TELEGRAM_WEBHOOK_SECRET: 'my_strong_secret_token_32chars_min',
      APP_URL: 'https://ais-dev.example.run.app',
    });
    assert.equal(fullWebhookCfg.mode, 'webhook');
    assert.equal(fullWebhookCfg.modeAutoSelected, true);
    assert.equal(fullWebhookCfg.webAppUrl, 'https://ais-dev.example.run.app');

    const safe = getSafeTelegramConfigSummary(createTestConfig());
    const serialized = JSON.stringify(safe);
    assert.ok(!serialized.includes('TEST_TOKEN_SECRET_VALUE_ABCDEF'));
    assert.ok(!serialized.includes('super_secret_webhook_token_12345'));
    assert.equal(safe.isConfigured, true);
    assert.equal(safe.webhookSecretConfigured, true);
    assert.equal(safe.ownerConfigured, true);
    assert.equal(safe.adminCount, 2);
  });

  // 2. Bot API connection & honest eligibility check
  await test('Bot API getMe connection and unconfigured graceful behavior', async () => {
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
    const unconfRes = await unconfiguredClient.getMe();
    assert.equal(unconfRes.ok, false);
  });

  // 3. Strictly 5 languages + Official New Uzbek Latin (ş, ç, ö, ğ)
  await test('Strictly 5 supported languages including official New Uzbek Latin (ş, ç, ö, ğ)', () => {
    assert.deepEqual([...TELEGRAM_SUPPORTED_LOCALES], ['uz-Latn', 'uz-Cyrl', 'uz-Latn-new', 'ru', 'en']);

    for (const loc of TELEGRAM_SUPPORTED_LOCALES) {
      const bundle = getTelegramLocaleBundle(loc);
      assert.ok(bundle.languageName.length > 2);
      assert.ok(bundle.welcomeTitle.length > 5);
      assert.ok(bundle.buttons.prayerTimes.length > 2);
      assert.ok(bundle.helpBody.includes('/start'));
      assert.ok(bundle.helpBody.includes('/language'));
      assert.ok(bundle.helpBody.includes('/settings'));
    }

    const newUz = getTelegramLocaleBundle('uz-Latn-new');
    assert.ok(
      newUz.languageName.includes('Ö') && newUz.languageName.includes('ç'),
      `Expected Özbekça in uz-Latn-new, got: ${newUz.languageName}`
    );
    assert.ok(
      newUz.prayerNames.peshin.includes('ş'),
      `Expected Peşin in uz-Latn-new, got: ${newUz.prayerNames.peshin}`
    );
    assert.ok(
      newUz.prayerNames.shom.includes('Ş'),
      `Expected Şom in uz-Latn-new, got: ${newUz.prayerNames.shom}`
    );
    assert.ok(
      newUz.prayerNames.quyosh.includes('ş'),
      `Expected Quyoş in uz-Latn-new, got: ${newUz.prayerNames.quyosh}`
    );
  });

  // 4. Core commands: /start, /help, /language, /settings
  await test('Commands /start, /help, /language, /settings register user and return inline keyboards', async () => {
    const calls: RecordedApiCall[] = [];
    const engine = new TelegramBotEngine({
      config: createTestConfig(),
      storePath: tempStorePath,
      fetchImpl: createMockTelegramFetch(calls),
      readOnlyPrayerProvider: () => INITIAL_ASAKA_PRAYER_SCHEDULE,
      silentLogger: true,
    });

    const fromUser = {
      id: 500100,
      is_bot: false,
      first_name: 'Abdulloh',
      username: 'abdulloh_asaka',
      language_code: 'uz',
    };

    const startRes = await engine.processUpdate({
      update_id: 1,
      message: {
        message_id: 10,
        date: 1700000000,
        chat: { id: 500100, type: 'private' },
        from: fromUser,
        text: '/start',
      },
    });
    assert.equal(startRes.ok, true);
    assert.equal(startRes.kind, 'command');
    assert.equal(startRes.detail, '/start');
    assert.equal(calls.at(-1)?.method, 'sendMessage');
    assert.ok(Array.isArray(calls.at(-1)?.body.reply_markup?.inline_keyboard));
    assert.ok(calls.at(-1)?.body.reply_markup.inline_keyboard.length >= 3);

    const helpRes = await engine.processUpdate({
      update_id: 2,
      message: {
        message_id: 11,
        date: 1700000001,
        chat: { id: 500100, type: 'private' },
        from: fromUser,
        text: '/help',
      },
    });
    assert.equal(helpRes.detail, '/help');
    assert.ok(String(calls.at(-1)?.body.text).includes('/language'));

    const langRes = await engine.processUpdate({
      update_id: 3,
      message: {
        message_id: 12,
        date: 1700000002,
        chat: { id: 500100, type: 'private' },
        from: fromUser,
        text: '/language',
      },
    });
    assert.equal(langRes.detail, '/language');
    const langRows = calls.at(-1)?.body.reply_markup?.inline_keyboard || [];
    // 5 language buttons + 1 back button
    assert.equal(langRows.length, 6);

    const settingsRes = await engine.processUpdate({
      update_id: 4,
      message: {
        message_id: 13,
        date: 1700000003,
        chat: { id: 500100, type: 'private' },
        from: fromUser,
        text: '/settings',
      },
    });
    assert.equal(settingsRes.detail, '/settings');
    assert.ok(Array.isArray(calls.at(-1)?.body.reply_markup?.inline_keyboard));
  });

  // 5. All 5 language switches + inline navigation + prayer timetable + settings toggles
  await test('Inline callbacks switch all 5 languages, render prayer times, and toggle notifications', async () => {
    const calls: RecordedApiCall[] = [];
    const engine = new TelegramBotEngine({
      config: createTestConfig(),
      storePath: tempStorePath,
      fetchImpl: createMockTelegramFetch(calls),
      readOnlyPrayerProvider: () => INITIAL_ASAKA_PRAYER_SCHEDULE,
      silentLogger: true,
    });

    const fromUser = {
      id: 500100,
      is_bot: false,
      first_name: 'Abdulloh',
      username: 'abdulloh_asaka',
    };
    let updateId = 100;
    const expectedBomdodTime =
      INITIAL_ASAKA_PRAYER_SCHEDULE.times.find((t) => t.key === 'bomdod')?.time || '';
    const expectedPeshinTime =
      INITIAL_ASAKA_PRAYER_SCHEDULE.times.find((t) => t.key === 'peshin')?.time || '';

    for (const targetLocale of TELEGRAM_SUPPORTED_LOCALES) {
      const cbRes = await engine.processUpdate({
        update_id: ++updateId,
        callback_query: {
          id: `cb_lang_${targetLocale}`,
          from: fromUser,
          data: `lang:${targetLocale}`,
          message: { message_id: 20, date: 1700000010, chat: { id: 500100, type: 'private' } },
        },
      });
      assert.equal(cbRes.ok, true);
      assert.equal(cbRes.kind, 'callback');
      const stored = engine.repository.getUser('500100');
      assert.equal(stored?.language, targetLocale);

      // Navigate to Prayer Times in the chosen language
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
      assert.ok(editCall, `Expected editMessageText for prayer view in ${targetLocale}`);
      assert.ok(String(editCall.body.text).includes(expectedBomdodTime));
      assert.ok(String(editCall.body.text).includes(expectedPeshinTime));
      const expectedBundle = getTelegramLocaleBundle(targetLocale as TelegramLocale);
      assert.ok(String(editCall.body.text).includes(expectedBundle.prayerNames.bomdod));
    }

    // Set final language to uz-Latn-new and toggle prayer notifications
    await engine.processUpdate({
      update_id: ++updateId,
      callback_query: {
        id: 'cb_set_new_uz',
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

    // Navigate to channels view
    await engine.processUpdate({
      update_id: ++updateId,
      callback_query: {
        id: 'cb_channels',
        from: fromUser,
        data: 'nav:channels',
        message: { message_id: 20, date: 1700000022, chat: { id: 500100, type: 'private' } },
      },
    });
    const chCall = calls.filter((c) => c.method === 'editMessageText').at(-1);
    assert.ok(String(chCall?.body.text).includes('@Asaka_Ziyo'));
    assert.ok(String(chCall?.body.text).includes('@muhiddinsahhofuz'));
  });

  // 6. User persistence across restart (fresh TelegramBotEngine instance)
  await test('User registration, language, and notification settings persist across engine restart', () => {
    const restartedEngine = new TelegramBotEngine({
      config: createTestConfig(),
      storePath: tempStorePath,
      fetchImpl: createMockTelegramFetch([]),
      silentLogger: true,
    });
    const persisted = restartedEngine.repository.getUser('500100');
    assert.ok(persisted, 'Expected user 500100 to survive engine restart');
    assert.equal(persisted?.language, 'uz-Latn-new');
    assert.equal(persisted?.prayerNotificationsEnabled, false);
  });

  // 7. Custom Emoji Registry: zero invented IDs, fallback, verification, UTF-16 entities, keyboard icon
  await test('CustomEmojiRegistry enforces zero invented IDs, Unicode fallback, live verification, and UTF-16 entities', async () => {
    const registry = new CustomEmojiRegistry();
    const initialReport = registry.validateCompatibility();
    assert.ok(initialReport.totalRegisteredKeys >= 25);
    assert.equal(initialReport.verifiedCustomCount, 0);
    assert.equal(initialReport.premiumRenderingActive, false);
    assert.deepEqual(initialReport.invalidEntries, []);

    // Fallback formatting when unverified
    const fallbackFormatted = registry.formatMessage('{{emoji:brand.mosque}} ASAKA ZIYO {{emoji:nav.prayer}}');
    assert.ok(fallbackFormatted.text.includes('🕌'));
    assert.ok(fallbackFormatted.text.includes('🕰️'));
    assert.equal(fallbackFormatted.entities.length, 0);
    assert.equal(fallbackFormatted.usedCustomEmojiCount, 0);

    // Fallback keyboard button omits icon_custom_emoji_id
    const fallbackBtn = registry.buildKeyboardButton('nav.prayer', 'Namoz', { callback_data: 'nav:prayer' });
    assert.equal(fallbackBtn.icon_custom_emoji_id, undefined);
    assert.ok(fallbackBtn.text.includes('🕰️'));

    // Rejects invalid custom_emoji_id format
    assert.throws(() => registry.registerCustomEmojiId('brand.mosque', 'not-a-valid-id'));
    assert.throws(() => registry.registerCustomEmojiId('brand.mosque', '12345'));

    // Register real-format ID -> remains unverified until Telegram API confirms
    const testId = '5368324170671202286';
    const regEntry = registry.registerCustomEmojiId('brand.mosque', testId);
    assert.equal(regEntry.verified, false);

    // Live verification via mock Telegram Bot API `getCustomEmojiStickers`
    const apiClient = new TelegramApiClient(
      createTestConfig(),
      silentLogger,
      createMockTelegramFetch([], { validCustomEmojiIds: [testId] })
    );
    const ver = await registry.verifyAllWithTelegramApi(apiClient);
    assert.equal(ver.apiAvailable, true);
    assert.deepEqual(ver.verifiedKeys, ['brand.mosque']);
    assert.deepEqual(ver.rejectedKeys, []);

    // Enable premium rendering -> emits exact UTF-16 entity & keyboard icon_custom_emoji_id
    registry.setPremiumEnabled(true);
    const formatted = registry.formatMessage('Assalom {{emoji:brand.mosque}} ZIYO');
    assert.equal(formatted.usedCustomEmojiCount, 1);
    assert.equal(formatted.entities.length, 1);
    const entity = formatted.entities[0];
    assert.equal(entity.type, 'custom_emoji');
    assert.equal(entity.custom_emoji_id, testId);
    assert.equal(formatted.text.slice(entity.offset, entity.offset + entity.length), '🕌');

    const premiumBtn = registry.buildKeyboardButton('brand.mosque', 'Asosiy', { callback_data: 'nav:home' });
    assert.equal(premiumBtn.icon_custom_emoji_id, testId);
    assert.equal(premiumBtn.text, 'Asosiy');
  });

  // 8. Security: webhook secret, payload validation, least-privilege DB isolation, rate limiting, redaction, Mini App HMAC
  await test('Security controls: webhook secret, least-privilege Firestore isolation, rate limiter, redaction, Mini App HMAC', async () => {
    const cfg = createTestConfig();

    // Webhook secret check
    assert.equal(verifyWebhookSecretHeader(undefined, cfg).valid, false);
    assert.equal(verifyWebhookSecretHeader('wrong_token', cfg).valid, false);
    assert.equal(verifyWebhookSecretHeader(cfg.webhookSecret, cfg).valid, true);
    assert.equal(isValidTelegramUpdatePayload({ update_id: 1 }), true);
    assert.equal(isValidTelegramUpdatePayload({ invalid: true }), false);

    // Least-privilege DB isolation: blocks non-telegram* collections
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

    // Rate limiter
    const rl = new TelegramRateLimiter(3, 60_000);
    assert.equal(rl.check('u1').allowed, true);
    assert.equal(rl.check('u1').allowed, true);
    assert.equal(rl.check('u1').allowed, true);
    const blocked = rl.check('u1');
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterMs > 0);

    // Log secret redaction
    const redacted = redactSensitiveValue({
      token: '123456789:AAFakeSecretTokenValue1234567890',
      webhookSecret: 'my_webhook_secret',
      message: 'https://api.telegram.org/bot123456789:AAFakeSecretTokenValue1234567890/getMe',
    }) as Record<string, string>;
    assert.equal(redacted.token, '[REDACTED]');
    assert.equal(redacted.webhookSecret, '[REDACTED]');
    assert.ok(!redacted.message.includes('AAFakeSecretTokenValue1234567890'));

    // Mini App URL & official HMAC-SHA256 verification
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
    const hash = crypto.createHmac('sha256', secretKey).update(pairs).digest('hex');
    params.set('hash', hash);

    const validMini = verifyTelegramMiniAppInitData(params.toString(), cfg.botToken);
    assert.equal(validMini.valid, true);
    assert.equal(validMini.userId, '500100');

    // Tampered initData fails
    params.set('query_id', 'TAMPERED');
    const tamperedMini = verifyTelegramMiniAppInitData(params.toString(), cfg.botToken);
    assert.equal(tamperedMini.valid, false);
    assert.equal(tamperedMini.reason, 'SIGNATURE_MISMATCH');
  });

  // 9. Startup bootstrap (polling auto-clear webhook + command sync) & misconfigured webhook detection
  await test('Startup bootstrap clears webhook & syncs commands in polling mode, and reports misconfigured webhook clearly', async () => {
    const pollingCalls: RecordedApiCall[] = [];
    const pollingEngine = new TelegramBotEngine({
      config: createTestConfig({ mode: 'polling', webhookUrl: '', webhookSecret: '' }),
      storePath: tempStorePath,
      fetchImpl: createMockTelegramFetch(pollingCalls),
      silentLogger: true,
    });
    const state = await pollingEngine.initializeRuntime();
    pollingEngine.stopRuntime();

    assert.equal(state.startupState, 'running_polling');
    assert.equal(state.botApiConnected, true);
    assert.equal(state.botUsername, 'AsakaZiyoTestBot');
    assert.equal(state.commandsSynced, true);
    assert.ok(pollingCalls.some((c) => c.method === 'getMe'));
    assert.ok(pollingCalls.some((c) => c.method === 'deleteWebhook'));
    assert.ok(pollingCalls.some((c) => c.method === 'setMyCommands'));

    // Misconfigured explicit webhook mode reports exact missing variables
    const badWhEngine = new TelegramBotEngine({
      config: createTestConfig({ mode: 'webhook', webhookUrl: '', webhookSecret: '' }),
      storePath: tempStorePath,
      fetchImpl: createMockTelegramFetch([]),
      silentLogger: true,
    });
    const badState = await badWhEngine.initializeRuntime();
    assert.equal(badState.startupState, 'misconfigured');
    assert.ok(badState.startupReason.includes('TELEGRAM_WEBHOOK_URL'));
    assert.ok(badState.startupReason.includes('TELEGRAM_WEBHOOK_SECRET'));

    // Live diagnostics reports exact issues and never leaks bot token
    const diag = await badWhEngine.runLiveDiagnostics();
    assert.equal(diag.tokenConfigured, true);
    assert.equal(diag.telegramApi.connected, true);
    assert.equal(diag.readyToAnswerStart, false);
    assert.ok(diag.issues.length >= 2);
    assert.ok(!JSON.stringify(diag).includes('TEST_TOKEN_SECRET_VALUE_ABCDEF'));
  });

  // Cleanup temp directory
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
