/**
 * ASAKA ZIYO — Dynamic Asia/Tashkent Gregorian & Hijri Date Calendar Test Suite
 * Verifies root-cause elimination of hardcoded static dates ("2-Noyabr", "22 Jumodul",
 * "4-Noyabr", Cyrillic "Дүшанба"), Asia/Tashkent midnight rollover, Hijri offset (-2..+2),
 * Maghrib sunset boundary mode, 5-locale script purity, and 100% preservation of admin times.
 */

import assert from 'node:assert/strict';
import {
  resolveAsakaDateContext,
  resolveAsakaDateContextForDateKey,
  clampHijriOffset,
  getTashkentCalendarParts,
} from '../services/dateCalendarService';
import { TelegramPrayerAdapter } from '../prayer/prayerAdapter';
import { TelegramStyleManager } from '../style/styleManager';
import { CustomEmojiRegistry, stripPlainUnicodeEmojis } from '../emoji/customEmojiRegistry';
import { getDailyBundleForDate } from '../../src/data/dailyContentData';
import { INITIAL_ASAKA_PRAYER_SCHEDULE } from '../../src/data/prayerTimesData';

const FORBIDDEN_STALE_PATTERNS = [
  '2-Noyabr',
  '2-Ноябрь',
  '22 Jumodul',
  '22 Жумадул',
  '4-Noyabr',
  'Дүшанба',
];

function assertNoStaleDateStrings(text: string, contextLabel: string): void {
  for (const forbidden of FORBIDDEN_STALE_PATTERNS) {
    assert.ok(
      !text.includes(forbidden),
      `[${contextLabel}] contained stale hardcoded date string "${forbidden}"`,
    );
  }
}

async function run(): Promise<void> {
  let passed = 0;

  // Test 1: Asia/Tashkent UTC+5 midnight rollover
  {
    const beforeMidnightUtc = new Date('2026-11-22T18:59:30Z'); // 23:59:30 Tashkent
    const afterMidnightUtc = new Date('2026-11-22T19:00:30Z'); // 00:00:30 Tashkent (+1 day)
    const partsBefore = getTashkentCalendarParts(beforeMidnightUtc);
    const partsAfter = getTashkentCalendarParts(afterMidnightUtc);
    assert.equal(partsBefore.dateKey, '2026-11-22');
    assert.equal(partsAfter.dateKey, '2026-11-23');
    passed++;
  }

  // Test 2: All 5 locales render pure scripts & fix Cyrillic "Душанба"
  {
    const mondayUtc = new Date('2026-11-23T06:00:00Z'); // Monday 11:00 Tashkent
    const uzLatn = resolveAsakaDateContext(mondayUtc, 'uz-Latn');
    const uzCyrl = resolveAsakaDateContext(mondayUtc, 'uz-Cyrl');
    const uzNew = resolveAsakaDateContext(mondayUtc, 'uz-Latn-new');
    const ru = resolveAsakaDateContext(mondayUtc, 'ru');
    const en = resolveAsakaDateContext(mondayUtc, 'en');

    assert.equal(uzLatn.dateKey, '2026-11-23');
    assert.ok(
      uzLatn.gregorian.formatted.includes('23-Noyabr') &&
        uzLatn.gregorian.formatted.includes('Dushanba'),
    );
    assert.ok(
      uzCyrl.gregorian.formatted.includes('23-Ноябрь') &&
        uzCyrl.gregorian.formatted.includes('Душанба'),
    );
    assert.ok(
      !uzCyrl.gregorian.formatted.includes('Дүшанба'),
      'Cyrillic weekday must use Душанба, never Дүшанба',
    );
    assert.ok(uzNew.gregorian.formatted.includes('23-Noyabr'));
    assert.ok(
      ru.gregorian.formatted.includes('23 ноября') &&
        ru.gregorian.formatted.includes('Понедельник'),
    );
    assert.ok(
      en.gregorian.formatted.includes('23 November') &&
        en.gregorian.formatted.includes('Monday') &&
        en.gregorian.formatted.includes('2026'),
    );

    const localeContexts = [
      ['uz-Latn', uzLatn],
      ['uz-Cyrl', uzCyrl],
      ['uz-Latn-new', uzNew],
      ['ru', ru],
      ['en', en],
    ] as const;

    for (const [loc, ctx] of localeContexts) {
      assert.ok(ctx.hijri.formatted.length >= 8, `[${loc}] Hijri formatted date must be non-empty`);
      assert.ok(ctx.hijri.year >= 1445 && ctx.hijri.year <= 1455, `[${loc}] Hijri year realistic`);
      assertNoStaleDateStrings(ctx.gregorian.formatted, `ctx.gregorian:${loc}`);
      assertNoStaleDateStrings(ctx.hijri.formatted, `ctx.hijri:${loc}`);
    }
    passed++;
  }

  // Test 3: Hijri offset (-2..+2) shifts Hijri day deterministically without changing Gregorian date
  {
    assert.equal(clampHijriOffset(-5), -2);
    assert.equal(clampHijriOffset(9), 2);
    assert.equal(clampHijriOffset(1.4), 1);

    const sampleDate = new Date('2026-11-23T06:00:00Z');
    const base = resolveAsakaDateContext(sampleDate, 'uz-Latn', { hijriOffsetDays: 0 });
    const plusOne = resolveAsakaDateContext(sampleDate, 'uz-Latn', { hijriOffsetDays: 1 });
    const minusOne = resolveAsakaDateContext(sampleDate, 'uz-Latn', { hijriOffsetDays: -1 });

    assert.equal(base.dateKey, plusOne.dateKey);
    assert.equal(base.dateKey, minusOne.dateKey);
    assert.notEqual(base.hijri.formatted, plusOne.hijri.formatted);
    assert.notEqual(base.hijri.formatted, minusOne.hijri.formatted);
    passed++;
  }

  // Test 4: Maghrib sunset boundary mode advances Hijri date after Shom while preserving Gregorian date
  {
    const beforeShom = new Date('2026-11-23T11:30:00Z'); // 16:30 Tashkent (before 17:21 Shom)
    const afterShom = new Date('2026-11-23T13:00:00Z'); // 18:00 Tashkent (after 17:21 Shom)

    const ctxBefore = resolveAsakaDateContext(beforeShom, 'uz-Latn', {
      hijriBoundaryMode: 'maghrib',
      shomTimeHHMM: '17:21',
    });
    const ctxAfter = resolveAsakaDateContext(afterShom, 'uz-Latn', {
      hijriBoundaryMode: 'maghrib',
      shomTimeHHMM: '17:21',
    });

    assert.equal(ctxBefore.dateKey, '2026-11-23');
    assert.equal(ctxAfter.dateKey, '2026-11-23');
    assert.equal(ctxBefore.hijri.shiftedAfterMaghrib, false);
    assert.equal(ctxAfter.hijri.shiftedAfterMaghrib, true);
    assert.notEqual(ctxBefore.hijri.formatted, ctxAfter.hijri.formatted);
    passed++;
  }

  // Test 5: TelegramPrayerAdapter + TelegramStyleManager never leak stale schedule dates AND preserve admin prayer times
  {
    const staleSchedule = {
      ...INITIAL_ASAKA_PRAYER_SCHEDULE,
      date: '2026-11-02',
      formattedDateUz: '2-Noyabr, Dushanba, 2026',
      hijriDate: '22 Jumodul avval, 1448',
    };

    const emojiRegistry = new CustomEmojiRegistry();
    const adapter = new TelegramPrayerAdapter(
      () => staleSchedule,
      () => ({ hijriOffsetDays: 0, hijriBoundaryMode: 'civil' }),
    );

    const todayParts = getTashkentCalendarParts(new Date());

    // Confirm admin times are 100% untouched
    const loaded = adapter.getCurrentSchedule();
    assert.deepEqual(
      loaded.times.map((t) => `${t.key}:${t.time}:${t.iqamahTime || ''}`),
      INITIAL_ASAKA_PRAYER_SCHEDULE.times.map((t) => `${t.key}:${t.time}:${t.iqamahTime || ''}`),
      'Admin-entered Asaka prayer times must never be altered by date service',
    );

    const scheduleMsg = adapter.formatPrayerScheduleMessage('uz-Latn', emojiRegistry).text;
    const azanMsg = adapter.formatAzanReminderMessage('peshin', '12:18', 'uz-Latn', emojiRegistry).text;
    const ramadanMsg = adapter.formatRamadanModeMessage('uz-Latn', emojiRegistry).text;
    const calMsg = adapter.formatReligiousCalendarMessage('uz-Latn', emojiRegistry).text;
    const digestMsg = adapter.formatDailySmartDigest({
      locale: 'uz-Latn',
      emojiRegistry,
      userDisplayName: 'Asaka',
      verseSummary: 'Oyat matni',
      hadithSummary: 'Hadis matni',
      dhikrSummary: 'Zikr matni',
    }).text;

    const styleManager = new TelegramStyleManager(emojiRegistry);
    const richMsg = styleManager.buildPrayerRichMessage(adapter, 'uz-Latn');
    const widget = styleManager.buildPrayerCountdownWidgetHtml(adapter, 'uz-Latn');
    const widgetHtml = typeof widget === 'string' ? widget : widget.html;
    const widgetFallback = typeof widget === 'string' ? widget : widget.fallbackText;

    const outputs: Array<[string, string]> = [
      ['scheduleMsg', scheduleMsg],
      ['azanMsg', azanMsg],
      ['ramadanMsg', ramadanMsg],
      ['calMsg', calMsg],
      ['digestMsg', digestMsg],
      ['richMsg.fallbackText', richMsg.fallbackText],
      ['widget.fallbackText', widgetFallback],
    ];

    for (const [label, text] of outputs) {
      assertNoStaleDateStrings(text, label);
      const formatted = emojiRegistry.formatMessage(text);
      const validation = emojiRegistry.validateFormattedEntities(formatted);
      assert.equal(
        validation.valid,
        true,
        `[${label}] must contain ZERO uncovered plain Unicode emojis: ${validation.errors.join('; ')}`,
      );
    }

    assertNoStaleDateStrings(widgetHtml, 'widget.html');
    assert.equal(
      stripPlainUnicodeEmojis(widgetHtml),
      widgetHtml,
      '[widget.html] must contain ZERO plain Unicode emojis',
    );

    assert.ok(
      scheduleMsg.includes(`${todayParts.day}-`),
      `scheduleMsg must reflect live Tashkent day (${todayParts.dateKey})`,
    );
    passed++;
  }

  // Test 6: Web App getDailyBundleForDate returns dynamic date & Hijri for any date key
  {
    const bundleNov23 = getDailyBundleForDate('2026-11-23');
    const bundleMar15 = getDailyBundleForDate('2027-03-15');

    assert.equal(bundleNov23.dateKey, '2026-11-23');
    assert.ok(
      bundleNov23.formattedDateUz.includes('23-Noyabr') &&
        bundleNov23.formattedDateUz.includes('2026'),
    );
    assertNoStaleDateStrings(bundleNov23.formattedDateUz, 'dailyBundle.2026-11-23');
    assertNoStaleDateStrings(bundleNov23.hijriDateUz, 'dailyBundle.hijri.2026-11-23');

    assert.equal(bundleMar15.dateKey, '2027-03-15');
    assert.ok(
      bundleMar15.formattedDateUz.includes('15-Mart') &&
        bundleMar15.formattedDateUz.includes('2027'),
    );
    assert.notEqual(bundleNov23.hijriDateUz, bundleMar15.hijriDateUz);

    const ctxForKey = resolveAsakaDateContextForDateKey('2027-03-15', 'uz-Cyrl');
    assert.ok(ctxForKey.gregorian.formatted.includes('15-Март'));
    passed++;
  }

  console.log(`dateCalendarService.test.ts: ${passed}/6 PASSED`);
}

run().catch((err) => {
  console.error('dateCalendarService.test.ts FAILED:', err);
  process.exit(1);
});
