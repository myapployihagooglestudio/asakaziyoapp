/**
 * ASAKA ZIYO — Super Modules & Community Services Integration Test Suite
 *
 * Verifies:
 *  1. /services hub command & tools:hub callback with zero plain Unicode emojis
 *  2. /habits command & habits:toggle:five_prayers persistence across repository reload
 *  3. /umrah command & tools:umrah:rituals | checklist | duas views
 *  4. /verify_source command & tools:verify:search -> tools_verify_search interactive query flow
 *  5. /cybersafety command & tools:cyber:check -> tools_cyber_check (.apk file upload & punycode phishing URL)
 *  6. /regions command & tools:regions regional taqvim directory
 *  7. Admin Hijri controls: admin:hijri:offset:+1 / 0 and admin:hijri:boundary:toggle persisted in settings
 *  8. Support ticket user 1-5 quality rating callback (support:rate:{ticketId}:5) persisted in store
 *  9. Strict Zero-Plain-Unicode-Emoji verification across EVERY outgoing Telegram API payload
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { INITIAL_ASAKA_PRAYER_SCHEDULE } from '../../src/data/prayerTimesData';
import { TelegramBotEngine } from '../bot/telegramBotEngine';
import { TelegramPlatformConfig, loadTelegramPlatformConfig } from '../config';
import { FetchLike } from '../api/telegramApiClient';
import { findUncoveredPlainEmojis } from '../emoji/customEmojiRegistry';

interface SentCall {
  method: string;
  body: Record<string, any>;
}

function createMockFetch(sent: SentCall[]): FetchLike {
  return async (url: string, init?: RequestInit) => {
    const method = String(url).split('/').pop() || 'unknown';
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    sent.push({ method, body });
    if (method === 'getMe') {
      return new Response(
        JSON.stringify({
          ok: true,
          result: { id: 999111, is_bot: true, first_name: 'ASAKA ZIYO', username: 'asakaziyobot' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return new Response(
      JSON.stringify({ ok: true, result: { message_id: sent.length + 200 } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };
}

function makeTestConfig(): TelegramPlatformConfig {
  return {
    ...loadTelegramPlatformConfig({
      TELEGRAM_BOT_TOKEN1: '123456789:TEST_TOKEN_SUPER_MODULES_ONLY',
      TELEGRAM_MODE: 'webhook',
      TELEGRAM_WEBHOOK_URL: 'https://asakaziyo.ai.studio/api/telegram/platform/webhook',
      TELEGRAM_WEBHOOK_SECRET: 'test-secret-super',
      TELEGRAM_ADMIN_IDS: '800001',
    }),
  };
}

function assertAllPayloadsEmojiFree(sent: SentCall[], label: string): void {
  for (const call of sent) {
    if (typeof call.body?.text === 'string') {
      const leaks = findUncoveredPlainEmojis(
        call.body.text,
        Array.isArray(call.body.entities) ? call.body.entities : [],
      );
      assert.equal(
        leaks.length,
        0,
        `[${label}] ${call.method} text contained forbidden plain Unicode emoji(s): ${JSON.stringify(leaks)}`,
      );
    }
    if (call.body?.reply_markup?.inline_keyboard) {
      for (const row of call.body.reply_markup.inline_keyboard) {
        for (const btn of row) {
          if (typeof btn.text === 'string') {
            const leaks = findUncoveredPlainEmojis(btn.text, []);
            assert.equal(
              leaks.length,
              0,
              `[${label}] inline button "${btn.text}" contained plain Unicode emoji(s): ${JSON.stringify(leaks)}`,
            );
          }
        }
      }
    }
  }
}

async function run(): Promise<void> {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'asaka-super-modules-'));
  const storePath = path.join(tmpRoot, 'telegram_store.json');
  const outboxPath = path.join(tmpRoot, 'telegram_outbox.json');
  const sent: SentCall[] = [];
  let updateCounter = 1;
  let passed = 0;

  const makeEngine = () =>
    new TelegramBotEngine({
      config: makeTestConfig(),
      storePath,
      outboxPath,
      silentLogger: true,
      fetchImpl: createMockFetch(sent),
      readOnlyPrayerProvider: () => INITIAL_ASAKA_PRAYER_SCHEDULE,
    });

  const sendCmd = async (engine: TelegramBotEngine, userId: number, text: string) => {
    const before = sent.length;
    await engine.processUpdate({
      update_id: updateCounter++,
      message: {
        message_id: updateCounter,
        date: Math.floor(Date.now() / 1000),
        chat: { id: userId, type: 'private' },
        from: { id: userId, is_bot: false, first_name: 'Tester' },
        text,
      },
    } as any);
    return sent.slice(before);
  };

  const sendCb = async (engine: TelegramBotEngine, userId: number, data: string) => {
    const before = sent.length;
    await engine.processUpdate({
      update_id: updateCounter++,
      callback_query: {
        id: `cb_${updateCounter}`,
        from: { id: userId, is_bot: false, first_name: 'Tester' },
        data,
        message: {
          message_id: 500,
          date: Math.floor(Date.now() / 1000),
          chat: { id: userId, type: 'private' },
        },
      },
    } as any);
    return sent.slice(before);
  };

  try {
    const engine = makeEngine();
    const userId = 900101;
    const userIdStr = String(userId);
    const adminId = 800001;

    // Seed user & admin
    const { user: seededUser } = await engine.userService.registerOrTouchUser({
      id: userId,
      is_bot: false,
      first_name: 'Muslim',
    });
    await engine.userService.registerOrTouchUser({
      id: adminId,
      is_bot: false,
      first_name: 'Admin',
    });

    // 1. /services hub command & tools:hub callback
    {
      const calls = await sendCmd(engine, userId, '/services');
      const msg = calls.find((c) => c.method === 'sendMessage');
      assert.ok(msg, '/services must send hub message');
      assert.ok(msg.body.text.includes('ASAKA ZIYO'), 'Hub text should mention ASAKA ZIYO');
      const cbCalls = await sendCb(engine, userId, 'tools:hub');
      assert.ok(cbCalls.some((c) => c.method === 'editMessageText' || c.method === 'sendMessage'));
      passed++;
    }

    // 2. /habits + habits:toggle:five_prayers + reload persistence
    {
      const calls = await sendCmd(engine, userId, '/habits');
      assert.ok(calls.some((c) => c.method === 'sendMessage'));
      await sendCb(engine, userId, 'habits:toggle:five_prayers');
      const engAfter = engine.repository.getUserEngagement(userIdStr);
      assert.ok(engAfter?.worshipHabits, 'worshipHabits must be saved on user engagement');
      assert.ok(
        engAfter!.worshipHabits!.completedTodayIds.includes('five_prayers'),
        'five_prayers must be recorded as completed',
      );

      // Flush debounced disk cache (simulating graceful shutdown) and reload to prove persistence
      engine.repository.flushToDiskSync();
      const engineReloaded = makeEngine();
      const reloadedEng = engineReloaded.repository.getUserEngagement(userIdStr);
      assert.ok(
        reloadedEng?.worshipHabits?.completedTodayIds.includes('five_prayers'),
        'worshipHabits must persist after engine reload',
      );
      passed++;
    }

    // 3. /umrah + rituals / checklist / duas callbacks
    {
      const cmdCalls = await sendCmd(engine, userId, '/umrah');
      assert.ok(cmdCalls.some((c) => c.method === 'sendMessage'));
      for (const cb of ['tools:umrah:rituals', 'tools:umrah:checklist', 'tools:umrah:duas']) {
        const res = await sendCb(engine, userId, cb);
        assert.ok(
          res.some((c) => c.method === 'editMessageText' || c.method === 'sendMessage'),
          `${cb} must render umrah sub-view`,
        );
      }
      passed++;
    }

    // 4. /verify_source + interactive search query flow
    {
      const cmdCalls = await sendCmd(engine, userId, '/verify_source');
      assert.ok(cmdCalls.some((c) => c.body?.text?.includes('@dinuzbbot')));
      await sendCb(engine, userId, 'tools:verify:search');
      assert.equal(engine.repository.getUser(userIdStr)?.activeFlow?.type, 'tools_verify_search');

      const replyCalls = await sendCmd(engine, userId, 'https://muslim.uz/maqola');
      const replyMsg = replyCalls.find((c) => c.method === 'sendMessage');
      assert.ok(replyMsg, 'tools_verify_search must respond to user query');
      assert.ok(replyMsg.body.text.includes('@dinuzbbot'), 'Verification reply must include @dinuzbbot');
      assert.equal(engine.repository.getUser(userIdStr)?.activeFlow?.type, 'idle');
      passed++;
    }

    // 5. /cybersafety + .apk document inspection + punycode URL inspection
    {
      const cmdCalls = await sendCmd(engine, userId, '/cybersafety');
      assert.ok(cmdCalls.some((c) => c.body?.text?.includes('@cybershielduz_bot')));
      await sendCb(engine, userId, 'tools:cyber:check');
      assert.equal(engine.repository.getUser(userIdStr)?.activeFlow?.type, 'tools_cyber_check');

      // Test dangerous .apk document upload (static filename inspection only)
      const beforeDoc = sent.length;
      await engine.processUpdate({
        update_id: updateCounter++,
        message: {
          message_id: updateCounter,
          date: Math.floor(Date.now() / 1000),
          chat: { id: userId, type: 'private' },
          from: { id: userId, is_bot: false, first_name: 'Muslim' },
          document: { file_id: 'fake_doc_1', file_name: 'bank_bonus_update.apk' },
        },
      } as any);
      const docReply = sent.slice(beforeDoc).find((c) => c.method === 'sendMessage');
      assert.ok(docReply, 'Document upload in tools_cyber_check must reply');
      assert.ok(
        docReply.body.text.includes('.apk') || docReply.body.text.includes('YUQORI'),
        'APK upload must trigger high-risk warning',
      );

      // Test punycode phishing URL
      await sendCb(engine, userId, 'tools:cyber:check');
      const urlCalls = await sendCmd(engine, userId, 'http://xn--uzumbnk-9za.xyz/login');
      const urlReply = urlCalls.find((c) => c.method === 'sendMessage');
      assert.ok(urlReply && urlReply.body.text.includes('@cybershielduz_bot'));
      passed++;
    }

    // 6. /regions + tools:regions
    {
      const cmdCalls = await sendCmd(engine, userId, '/regions');
      const msg = cmdCalls.find((c) => c.method === 'sendMessage');
      assert.ok(msg && msg.body.text.includes('@fatvouz_taqvim_bot'));
      passed++;
    }

    // 7. Admin Hijri offset & Maghrib boundary toggle persisted in settings
    {
      await sendCb(engine, adminId, 'admin:hijri:offset:+1');
      assert.equal(engine.repository.getSettings().hijriDateOffsetDays, 1);

      await sendCb(engine, adminId, 'admin:hijri:boundary:toggle');
      assert.equal(engine.repository.getSettings().hijriBoundaryMode, 'maghrib');

      await sendCb(engine, adminId, 'admin:hijri:offset:0');
      assert.equal(engine.repository.getSettings().hijriDateOffsetDays, 0);
      passed++;
    }

    // 8. Support ticket user 1-5 quality rating callback
    {
      const ticket = await engine.supportService.createTicket({
        user: seededUser,
        category: 'imam_question',
        subject: 'Namoz vaqtlari haqida',
        text: 'Namoz vaqtlari haqida savol',
      });
      const rateCalls = await sendCb(engine, userId, `support:rate:${ticket.id}:5`);
      assert.ok(rateCalls.some((c) => c.method === 'answerCallbackQuery'));
      const updatedTicket = engine.repository.getSupportTicket(ticket.id);
      assert.equal(updatedTicket?.userRating, 5);
      assert.ok(Boolean(updatedTicket?.ratedAt));
      passed++;
    }

    // 9. Strict Zero-Plain-Unicode-Emoji check on ALL outgoing payloads
    {
      assertAllPayloadsEmojiFree(sent, 'superModules.test');
      passed++;
    }

    console.log(`superModules.test.ts: ${passed}/9 PASSED (${sent.length} Telegram payloads audited)`);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

run().catch((err) => {
  console.error('superModules.test.ts FAILED:', err);
  process.exit(1);
});
