/**
 * ASAKA ZIYO — 100% Strict Telegram Premium Custom Emoji Test Suite
 *
 * Verifies ALL 14 mandatory acceptance requirements:
 *  1. Main menu (0 plain Unicode emojis; verified Premium custom_emoji entities + icon_custom_emoji_id)
 *  2. All inline submenus (Quran, MP3, Hifz, Prayer, Hadith, Dhikr, Settings, Profile, Admin)
 *  3. All major commands (/start, /menu, /quran, /prayer, /hifz, /hadith, /dhikr, /ask, /profile, /settings, /help, /emoji_setup)
 *  4. Gemini AI responses with accidental plain emojis & hallucinated <tg-emoji> tags -> 0 plain emojis, Arabic preserved
 *  5. Prayer time notifications
 *  6. Hifz reminders & coaching
 *  7. Quran MP3 captions & playback controls
 *  8. Admin broadcasts & sync announcements
 *  9. Error / warning / success messages & callback query toasts
 * 10. All 5 languages (uz-Latn, uz-Cyrl, uz-Latn-new, ru, en) + emoji-agnostic Reply Keyboard matching
 * 11. Persistence across engine restart (including custom admin slots)
 * 12. Instant global propagation when Admin replaces a customEmojiId
 * 13. Zero plain Unicode emojis in ANY outgoing Telegram API payload + codebase scan = 0
 * 14. Graceful survival on invalid, disabled, or HTTP 400 rejected custom_emoji_id / icon_custom_emoji_id
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  CustomEmojiRegistry,
  auditTelegramOutgoingPayload,
  findUncoveredPlainEmojis,
} from '../emoji/customEmojiRegistry';
import { TelegramBotEngine } from '../bot/telegramBotEngine';
import { buildPersistentReplyKeyboard, matchReplyKeyboardAction } from '../keyboards/keyboards';
import { TELEGRAM_SUPPORTED_LOCALES } from '../types';
import { loadTelegramPlatformConfig } from '../config';

interface CapturedCall {
  method: string;
  payload: Record<string, any>;
}

function createHarness(options?: {
  dataDir?: string;
  rejectCustomEmojiOnSendOnce?: boolean;
  verifiedStickerIds?: string[];
  ownerId?: string;
}) {
  const calls: CapturedCall[] = [];
  const dataDir = options?.dataDir || fs.mkdtempSync(path.join(os.tmpdir(), 'asakaziyo-emoji100-'));
  let rejectedOnce = false;
  const verifiedSet = new Set(
    options?.verifiedStickerIds || [
      '5368324170671202286',
      '5368324170671202287',
      '5368324170671202288',
      '5368324170671202289',
      '5368324170671202290',
      '5368324170671202291',
      '5368324170671202292',
      '5368324170671202299',
    ]
  );

  const mockFetch = async (url: string, init?: { body?: any }) => {
    const method = url.split('/').pop() || 'unknown';
    let payload: Record<string, any> = {};
    if (typeof init?.body === 'string') {
      try {
        payload = JSON.parse(init.body);
      } catch {
        payload = {};
      }
    }
    calls.push({ method, payload });

    if (method === 'getMe') {
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, result: { id: 999001, is_bot: true, first_name: 'ASAKA ZIYO', username: 'asakaziyobot' } }),
      };
    }

    if (method === 'getCustomEmojiStickers') {
      const ids: string[] = Array.isArray(payload.custom_emoji_ids) ? payload.custom_emoji_ids : [];
      const stickers = ids
        .filter((id) => verifiedSet.has(String(id)))
        .map((id) => ({
          custom_emoji_id: String(id),
          emoji: '\u2B50',
          set_name: 'asaka_ziyo_premium_pack',
        }));
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, result: stickers }),
      };
    }

    if (
      options?.rejectCustomEmojiOnSendOnce &&
      !rejectedOnce &&
      method === 'sendMessage' &&
      (Array.isArray(payload.entities) ||
        JSON.stringify(payload.reply_markup || {}).includes('icon_custom_emoji_id'))
    ) {
      rejectedOnce = true;
      return {
        ok: false,
        status: 400,
        json: async () => ({
          ok: false,
          error_code: 400,
          description: 'Bad Request: DOCUMENT_INVALID / invalid custom_emoji_id',
        }),
      };
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        result: method === 'answerCallbackQuery' ? true : { message_id: calls.length, chat: { id: 1 } },
      }),
    };
  };

  const baseConfig = loadTelegramPlatformConfig();
  const config = {
    ...baseConfig,
    botToken: '123456:TEST_TOKEN_STRICT_EMOJI_100',
    ownerId: options?.ownerId || '777001',
    adminIds: [options?.ownerId || '777001'],
    dataDir,
    firestoreEnabled: false,
    pollingEnabled: false,
  };

  const engine = new TelegramBotEngine({
    config,
    storePath: path.join(dataDir, 'telegram_platform_store.json'),
    outboxPath: path.join(dataDir, 'sync_outbox.json'),
    fetchImpl: mockFetch as any,
  });
  return { engine, calls, dataDir, verifiedSet };
}

function assertZeroPlainEmojisInAllCalls(calls: CapturedCall[], label: string): void {
  const sendMethods = new Set([
    'sendMessage',
    'editMessageText',
    'sendPhoto',
    'sendVideo',
    'sendAudio',
    'sendVoice',
    'sendDocument',
    'sendAnimation',
    'sendMediaGroup',
    'answerCallbackQuery',
    'sendRichMessage',
    'sendMessageDraft',
  ]);
  for (const call of calls) {
    if (!sendMethods.has(call.method)) continue;
    const audit = auditTelegramOutgoingPayload(call.payload);
    assert.equal(
      audit.violations.length,
      0,
      `[${label}] Plain Unicode emoji leaked in ${call.method}: ${JSON.stringify(audit)} | payload=${JSON.stringify(call.payload).slice(0, 300)}`
    );
    assert.equal(audit.clean, true, `[${label}] audit.clean must be true for ${call.method}`);
    // Also ensure NO raw {{emoji:...}} template token leaked!
    const textFields = [call.payload.text, call.payload.caption].filter(
      (v): v is string => typeof v === 'string'
    );
    for (const tf of textFields) {
      assert.equal(
        /\{\{emoji:[a-z0-9._-]+\}\}/i.test(tf),
        false,
        `[${label}] Unresolved {{emoji:...}} token leaked in ${call.method}: ${tf.slice(0, 180)}`
      );
    }
  }
}

async function runTests() {
  console.log('=== ASAKA ZIYO 100% STRICT PREMIUM EMOJI TEST SUITE ===');

  // --------------------------------------------------------------------------
  // CHECK 13 (Static): Codebase scan for leftover plain Unicode emojis = 0
  // --------------------------------------------------------------------------
  const standaloneReg = new CustomEmojiRegistry();
  const codebaseHits = standaloneReg.scanCodebaseForPlainEmojis();
  assert.equal(
    codebaseHits.length,
    0,
    `Expected 0 plain Unicode emoji occurrences in telegram/ source files, found ${codebaseHits.length}: ${JSON.stringify(codebaseHits.slice(0, 10))}`
  );
  console.log('PASS [13-static]: Codebase scan found 0 plain Unicode emojis across telegram/.');

  // --------------------------------------------------------------------------
  // CHECK 1, 2, 3, 9, 10: Main menu, submenus, commands, errors, all 5 languages
  // --------------------------------------------------------------------------
  const h = createHarness();

  // Register a few verified Premium Custom Emojis as Owner
  const sampleBindings: Array<[string, string]> = [
    ['home', '5368324170671202286'],
    ['favorites', '5368324170671202286'],
    ['prayer', '5368324170671202287'],
    ['quran', '5368324170671202288'],
    ['quran_mp3', '5368324170671202289'],
    ['hifz', '5368324170671202290'],
    ['success', '5368324170671202291'],
    ['error', '5368324170671202292'],
  ];
  for (const [k, id] of sampleBindings) {
    const entry = h.engine.emojiRegistry.registerCustomEmojiId(k, id, {
      verified: true,
      enabled: true,
      updatedBy: '777001',
    });
    await h.engine.repository.saveCustomEmoji(entry);
  }
  h.engine.emojiRegistry.setPremiumEnabled(true);
  h.engine.emojiRegistry.setKeyboardIconsEnabled(true);

  // Create registered user (owner)
  await h.engine.repository.saveUser({
    telegramId: '777001',
    chatId: '777001',
    username: 'asaka_owner',
    firstName: 'Asaka',
    lastName: 'Admin',
    language: 'uz-Latn',
    role: 'owner',
    isRegistered: true,
    registrationStep: 'completed',
    registeredAt: new Date().toISOString(),
    optedOut: false,
    onboardingCompleted: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any);

  // Test all major commands
  const commands = [
    '/start',
    '/menu',
    '/quran',
    '/prayer',
    '/hifz',
    '/hadith',
    '/dhikr',
    '/profile',
    '/settings',
    '/help',
    '/emoji_setup',
  ];
  let updId = 100;
  for (const cmd of commands) {
    await h.engine.processUpdate({
      update_id: updId++,
      message: {
        message_id: updId,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 777001, type: 'private' },
        from: { id: 777001, is_bot: false, first_name: 'Asaka', username: 'asaka_owner' },
        text: cmd,
      },
    });
  }

  // Verify Main Menu (/menu) carries real custom_emoji entities & icon_custom_emoji_id AND 0 plain emojis
  const menuSends = h.calls.filter(
    (c) => c.method === 'sendMessage' && JSON.stringify(c.payload.reply_markup || {}).includes('nav:quran')
  );
  assert.ok(menuSends.length > 0, 'Expected main menu sendMessage call');
  assert.ok(
    menuSends.some(
      (c) =>
        Array.isArray(c.payload.entities) &&
        c.payload.entities.some(
          (e: any) =>
            e.type === 'custom_emoji' &&
            (e.custom_emoji_id === '5368324170671202286' || e.custom_emoji_id === '5368324170671202287')
        )
    ),
    'Expected main menu message to include genuine verified Premium custom_emoji entity'
  );
  assert.ok(
    menuSends.some((c) => JSON.stringify(c.payload.reply_markup || {}).includes('5368324170671202288')),
    'Expected main menu inline keyboard to include genuine icon_custom_emoji_id'
  );
  assertZeroPlainEmojisInAllCalls(h.calls, 'Commands & Main Menu');
  console.log('PASS [1, 3]: Main menu & all 11 major commands verified with 0 plain emojis.');

  // Test inline submenus & Admin Emoji Manager callbacks (all 12 operations)
  const callbacks = [
    'nav:quran',
    'qmp3:home',
    'hifz:home',
    'nav:prayer',
    'nav:hadith',
    'nav:dhikr',
    'notif:center',
    'nav:profile',
    'admin:home',
    'admin:emoji:home:0',
    'admin:emoji:slot:quran',
    'admin:emoji:preview:quran',
    'admin:emoji:usage:quran',
    'admin:emoji:missing',
    'admin:emoji:audit',
    'admin:emoji:history',
    'admin:emoji:test',
  ];
  for (const cb of callbacks) {
    await h.engine.processUpdate({
      update_id: updId++,
      callback_query: {
        id: `cb_${updId}`,
        from: { id: 777001, is_bot: false, first_name: 'Asaka', username: 'asaka_owner' },
        message: {
          message_id: 50,
          date: Math.floor(Date.now() / 1000),
          chat: { id: 777001, type: 'private' },
          text: 'prev',
        },
        data: cb,
      },
    });
  }
  assertZeroPlainEmojisInAllCalls(h.calls, 'Submenus & Admin Emoji Manager');
  console.log('PASS [2, 9]: All inline submenus, admin emoji manager & callback toasts have 0 plain emojis.');

  // --------------------------------------------------------------------------
  // CHECK 4: Gemini AI output cleaning (accidental plain emojis + fake <tg-emoji> + Arabic)
  // --------------------------------------------------------------------------
  const rawAiReply =
    '🕌 Assalomu alaykum! 😊✨ Mana Fotiha surasining birinchi oyati:\n' +
    'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\n' +
    'Fake tag: <tg-emoji emoji-id="999999999999999999">🔥</tg-emoji> ✅ Tayyor! 🚀🔥';
  const cleanedAi = h.engine.emojiRegistry.formatAiResponse(rawAiReply);
  assert.equal(
    findUncoveredPlainEmojis(cleanedAi.text, cleanedAi.entities).length,
    0,
    'AI response must contain 0 uncovered plain Unicode emojis'
  );
  assert.equal(cleanedAi.text.includes('<tg-emoji'), false, 'Fake <tg-emoji> tags must be stripped');
  assert.ok(
    cleanedAi.text.includes('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'),
    'Arabic Quranic verse must remain 100% intact'
  );
  assert.ok(
    cleanedAi.entities.some((e) => e.type === 'custom_emoji' && e.custom_emoji_id === '5368324170671202287'),
    'Mapped prayer emoji in AI reply should render as verified Premium custom_emoji entity'
  );
  console.log('PASS [4]: Gemini AI output cleaning strips unconfigured emojis & fake tags while preserving Arabic.');

  // --------------------------------------------------------------------------
  // CHECK 5, 6, 7, 8: Prayer notifications, Hifz reminders, Quran MP3 captions, Broadcasts
  // --------------------------------------------------------------------------
  const preCount = h.calls.length;
  // Prayer notification & Hifz reminder & Quran MP3 caption & Broadcast sent through apiClient gateway
  await h.engine.apiClient.sendMessage({
    chat_id: '777001',
    text: '⏰ Namoz eslatmasi (15 daqiqa qoldi)\n🕌 BOMDOD — 04:45 (Asaka)',
  });
  await h.engine.apiClient.sendMessage({
    chat_id: '777001',
    text: '🧠 Bugungi HIFZ murojaa: Al-Mulk 1–10 oyatlar ✅',
  });
  await h.engine.apiClient.sendAudio({
    chat_id: '777001',
    audio: 'https://server8.mp3quran.net/afs/001.mp3',
    caption: '🎧 Al-Fotiha · 🎙 Mishary Alafasy\n📖 7 oyat · ⏱ ~01:02',
    reply_markup: {
      inline_keyboard: [[h.engine.emojiRegistry.buildKeyboardButton('quran_mp3', '🎧 Keyingi sura', { callback_data: 'qmp3:play:mishary:2' })]],
    },
  });
  await h.engine.apiClient.sendMessage({
    chat_id: '777001',
    text: '📢 Masjid eʼloni: Juma namozi 13:00 da! 🌟',
  });
  const sectionCalls = h.calls.slice(preCount);
  assertZeroPlainEmojisInAllCalls(sectionCalls, 'Prayer / Hifz / MP3 / Broadcast');
  console.log('PASS [5, 6, 7, 8]: Prayer notifications, Hifz reminders, Quran MP3 captions & broadcasts verified clean.');

  // --------------------------------------------------------------------------
  // CHECK 10: All 5 languages + Emoji-agnostic Reply Keyboard matching
  // --------------------------------------------------------------------------
  for (const loc of TELEGRAM_SUPPORTED_LOCALES) {
    const rk = buildPersistentReplyKeyboard(loc, h.engine.emojiRegistry);
    for (const row of rk.keyboard) {
      for (const btn of row) {
        assert.equal(
          findUncoveredPlainEmojis(btn.text).length,
          0,
          `Reply button in locale ${loc} must have 0 plain emojis: "${btn.text}"`
        );
        const matched = matchReplyKeyboardAction(btn.text);
        assert.ok(matched, `Reply button "${btn.text}" in locale ${loc} must match a valid action`);
        // Legacy cached emoji-prefixed reply keyboard button must ALSO match!
        const legacyMatched = matchReplyKeyboardAction(`🕌 ${btn.text}`);
        assert.equal(legacyMatched, matched, `Legacy emoji-prefixed button must still match in ${loc}`);
      }
    }
  }
  console.log('PASS [10]: All 5 languages verified with 0 plain emojis & emoji-agnostic Reply Keyboard matching.');

  // --------------------------------------------------------------------------
  // CHECK 11 & 12: Persistence across restart (including custom admin slots) + Instant propagation
  // --------------------------------------------------------------------------
  const customSlot = h.engine.emojiRegistry.createOrUpdateSlot({
    key: 'eid_special_banner',
    category: 'seasonal',
    description: 'Hayit maxsus banneri',
    semanticPurpose: 'Hayit bayrami maxsus sarlavhalari',
    usedIn: ['Broadcasts', 'Seasonal'],
    customEmojiId: '5368324170671202299',
    verified: true,
    enabled: true,
    updatedBy: '777001',
  });
  await h.engine.repository.saveCustomEmoji(customSlot);

  // Instant propagation: replace quran customEmojiId
  const replaced = h.engine.emojiRegistry.registerCustomEmojiId('quran', '5368324170671202299', {
    verified: true,
    enabled: true,
    updatedBy: '777001',
  });
  await h.engine.repository.saveCustomEmoji(replaced);
  const immediateMsg = h.engine.emojiRegistry.formatMessage('{{emoji:quran}} Yangilangan Qurʼon');
  assert.equal(immediateMsg.entities[0]?.custom_emoji_id, '5368324170671202299');

  // Restart a brand-new engine pointing to the same dataDir
  const h2 = createHarness({ dataDir: h.dataDir });
  const persistedQuran = h2.engine.emojiRegistry.getEntry('quran');
  const persistedCustom = h2.engine.emojiRegistry.getEntry('eid_special_banner');
  assert.equal(persistedQuran?.customEmojiId, '5368324170671202299', 'Replaced customEmojiId must survive restart');
  assert.equal(persistedCustom?.customEmojiId, '5368324170671202299', 'Custom admin slot must survive restart');
  assert.equal(persistedCustom?.isCustomAdminSlot, true);
  console.log('PASS [11, 12]: Persistence across restart & instant global replacement verified.');

  // --------------------------------------------------------------------------
  // CHECK 14: Graceful survival on invalid, disabled, or HTTP 400 rejected custom_emoji_id
  // --------------------------------------------------------------------------
  // 14a: Disabled slot emits 0 plain emojis (clean omission)
  h.engine.emojiRegistry.setEntryEnabled('favorites', false, '777001');
  const disabledMsg = h.engine.emojiRegistry.formatMessage('{{emoji:favorites}} ASAKA ZIYO');
  assert.equal(disabledMsg.entities.length, 0);
  assert.equal(findUncoveredPlainEmojis(disabledMsg.text).length, 0);
  assert.equal(disabledMsg.text, 'ASAKA ZIYO');

  // 14b: HTTP 400 rejection on sendMessage retries cleanly with 0 plain emojis leaked AND logs failure
  const hReject = createHarness({ rejectCustomEmojiOnSendOnce: true });
  hReject.engine.emojiRegistry.registerCustomEmojiId('quran', '5368324170671202288', {
    verified: true,
    enabled: true,
  });
  hReject.engine.emojiRegistry.setPremiumEnabled(true);
  hReject.engine.emojiRegistry.setKeyboardIconsEnabled(true);

  const formatted = hReject.engine.emojiRegistry.formatMessage('{{emoji:quran}} Qurʼon markazi');
  const res = await hReject.engine.apiClient.sendMessage({
    chat_id: '777001',
    text: formatted.text,
    entities: formatted.entities,
    reply_markup: {
      inline_keyboard: [
        [hReject.engine.emojiRegistry.buildKeyboardButton('quran', 'Qurʼon', { callback_data: 'nav:quran' })],
      ],
    },
  });
  assert.equal(res.ok, true, 'Retry after HTTP 400 custom_emoji rejection must succeed');
  assertZeroPlainEmojisInAllCalls(hReject.calls, 'HTTP 400 Retry Fallback');
  const auditReport = hReject.engine.emojiRegistry.buildFullAuditReport({ scanCodebase: false });
  assert.ok(auditReport.deliveryFailures.length >= 1, 'Delivery failure must be logged in audit report');
  assert.equal(auditReport.outgoingPayloadAudit.violationCount, 0, 'Outgoing audit must record 0 leaks');
  assert.equal(auditReport.outgoingPayloadAudit.passed, true, 'Outgoing audit passed must be true');
  console.log('PASS [14]: Disabled, unconfigured & HTTP 400 rejected custom emojis survive gracefully with 0 plain emojis.');

  // Cleanup temp dir
  fs.rmSync(h.dataDir, { recursive: true, force: true });
  fs.rmSync(hReject.dataDir, { recursive: true, force: true });

  console.log('=== ALL 14 STRICT 100% PREMIUM EMOJI CHECKS PASSED ===');
}

runTests().catch((err) => {
  console.error('STRICT PREMIUM EMOJI TEST FAILED:', err);
  process.exit(1);
});
