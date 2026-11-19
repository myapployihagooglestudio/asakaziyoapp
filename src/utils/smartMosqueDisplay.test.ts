/**
 * ASAKA ZIYO — Smart Mosque Display Automated Unit Verification Suite
 *
 * Verifies:
 * 1. Exact admin prayer schedule preservation (zero astronomical auto-calculation)
 * 2. Refresh-safe deterministic Asia/Tashkent countdowns & Azan->Iqamah waiting window
 * 3. Friday Juma automatic slot replacement
 * 4. Midnight transition rollover (23:59:59 -> 00:00:01 Asia/Tashkent)
 * 5. Schedule validity / expiry / chronological / Iqamah-before-Azan auditing
 * 6. Offline/Online versioned conflict resolution
 * 7. All 5 languages (uz-Latn, uz-Cyrl, uz-Latn-new, ru, en) + verbatim Arabic script
 */

import { INITIAL_ASAKA_PRAYER_SCHEDULE } from '../data/prayerTimesData';
import {
  SmartMosqueScheduleProfile,
  buildDisplayScheduleFromMainSchedule,
  computeSmartDisplayTimeline,
  getTashkentClockParts,
  isMonitorOnline,
  normalizeDisplayTemplate,
  resolveVersionedConflict,
  validateDisplaySchedule,
} from './smartMosqueDisplayEngine';
import {
  adaptDisplayTextForLocale,
  formatDisplayGregorianDate,
  getDisplayLocaleBundle,
} from './smartMosqueDisplayI18n';
import { SupportedLocale } from '../types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
    console.log(`✅ PASS | ${label}`);
  } else {
    failed++;
    console.error(`❌ FAIL | ${label}`);
    process.exitCode = 1;
  }
}

console.log('================================================================');
console.log('ASAKA ZIYO — SMART MOSQUE DISPLAY UNIT TEST SUITE');
console.log('================================================================\n');

// 1. Exact Admin Prayer Time Preservation (Zero Auto-Calculation)
const customAdminSchedule = buildDisplayScheduleFromMainSchedule(INITIAL_ASAKA_PRAYER_SCHEDULE, {
  id: 'asaka-main',
  effectiveDate: '2026-03-01',
  validUntil: '2026-12-31',
  ishraqTime: '06:48',
  jumaTime: '13:05',
  jumaIqamahTime: '13:25',
  isAdministratorPublished: true,
  times: INITIAL_ASAKA_PRAYER_SCHEDULE.times.map((t) => {
    if (t.key === 'bomdod') return { ...t, time: '05:11', iqamahTime: '05:31' };
    if (t.key === 'peshin') return { ...t, time: '12:41', iqamahTime: '13:01' };
    if (t.key === 'asr') return { ...t, time: '16:33', iqamahTime: '16:48' };
    if (t.key === 'shom') return { ...t, time: '18:52', iqamahTime: '18:57' };
    if (t.key === 'xufton') return { ...t, time: '20:14', iqamahTime: '20:29' };
    return t;
  }),
});

assert(
  customAdminSchedule.times.find((t) => t.key === 'bomdod')?.time === '05:11' &&
    customAdminSchedule.times.find((t) => t.key === 'bomdod')?.iqamahTime === '05:31' &&
    customAdminSchedule.ishraqTime === '06:48' &&
    customAdminSchedule.jumaTime === '13:05',
  'Admin-entered Azan, Iqamah, Ishraq, and Juma times are preserved verbatim without astronomical recalculation'
);

assert(
  customAdminSchedule.times.some((t) => t.key === 'tahajjud') &&
    customAdminSchedule.times.some((t) => t.key === 'subh'),
  'Tahajjud and Subh compatibility with existing ASAKA ZIYO schedule is preserved'
);

// 2. Deterministic Countdown & Refresh Safety (Asia/Tashkent UTC+5)
// 2026-04-09 is a Thursday; 12:30:00+05:00 -> 11 minutes (660s) before Peshin 12:41
const thursdayNoon = new Date('2026-04-09T12:30:00+05:00');
const timelineA = computeSmartDisplayTimeline(customAdminSchedule, thursdayNoon);
const timelineB = computeSmartDisplayTimeline(customAdminSchedule, new Date('2026-04-09T12:30:00+05:00'));

assert(
  timelineA.nextAzanKey === 'peshin' &&
    timelineA.nextAzanCountdown === '00:11:00' &&
    timelineA.nextAzanCountdown === timelineB.nextAzanCountdown,
  'Countdown is deterministic across refreshes: Thursday 12:30 -> Peshin (12:41) in 00:11:00'
);

assert(
  timelineA.currentPrayerKey === 'bomdod' && !timelineA.isBetweenAzanAndIqamah,
  'Active prayer highlights Bomdod before Peshin Azan and isBetweenAzanAndIqamah is false'
);

// 3. Active Azan-to-Iqamah Window Detection
// Thursday 12:46:30+05:00 is between Peshin Azan (12:41) and Iqamah (13:01) -> 14m 30s left
const duringIqamahWait = new Date('2026-04-09T12:46:30+05:00');
const timelineIq = computeSmartDisplayTimeline(customAdminSchedule, duringIqamahWait);
assert(
  timelineIq.isBetweenAzanAndIqamah === true &&
    timelineIq.iqamahPrayerKey === 'peshin' &&
    timelineIq.iqamahCountdown === '00:14:30' &&
    timelineIq.currentPrayerKey === 'peshin',
  'Active Azan-to-Iqamah window detected accurately (Peshin Iqamah in 00:14:30)'
);

// 4. Friday Juma Automatic Replacement on Peshin Slot
// 2026-04-10 is Friday; at 12:50:00+05:00 -> Juma Azan is 13:05 (15 min away), Iqamah is 13:25
const fridayMidday = new Date('2026-04-10T12:50:00+05:00');
const timelineFri = computeSmartDisplayTimeline(customAdminSchedule, fridayMidday);
assert(
  timelineFri.clock.isFriday === true &&
    timelineFri.nextAzanKey === 'juma' &&
    timelineFri.nextAzanTime === '13:05' &&
    timelineFri.nextAzanCountdown === '00:15:00' &&
    timelineFri.iqamahTime === '13:25',
  'Friday automatically activates admin-defined Juma Azan (13:05) and Juma Iqamah (13:25)'
);

// 5. Midnight Transition Rollover in Asia/Tashkent
const beforeMidnight = new Date('2026-04-09T23:59:59+05:00');
const afterMidnight = new Date('2026-04-10T00:00:01+05:00');
const tlBefore = computeSmartDisplayTimeline(customAdminSchedule, beforeMidnight);
const tlAfter = computeSmartDisplayTimeline(customAdminSchedule, afterMidnight);

assert(
  tlBefore.clock.dateStr === '2026-04-09' &&
    tlAfter.clock.dateStr === '2026-04-10' &&
    tlBefore.isNextAzanTomorrow === true &&
    tlAfter.isNextAzanTomorrow === false &&
    tlBefore.nextAzanKey === 'bomdod' &&
    tlAfter.nextAzanKey === 'bomdod' &&
    Math.abs(tlBefore.secondsToNextAzan - tlAfter.secondsToNextAzan - 2) === 0,
  'Midnight rollover (23:59:59 -> 00:00:01 Asia/Tashkent) advances date seamlessly with continuous Bomdod countdown'
);

// 6. Schedule Validation & Expiry Auditing
const validAudit = validateDisplaySchedule(customAdminSchedule, new Date('2026-04-09T10:00:00+05:00'));
assert(
  validAudit.isValid === true && validAudit.severity === 'ok' && !validAudit.isExpired,
  'Valid active schedule passes audit with severity=ok'
);

const expiredSchedule: SmartMosqueScheduleProfile = {
  ...customAdminSchedule,
  validUntil: '2026-03-31',
};
const expiredAudit = validateDisplaySchedule(expiredSchedule, new Date('2026-04-09T10:00:00+05:00'));
assert(
  expiredAudit.isExpired === true && expiredAudit.severity === 'warning',
  'Expired schedule triggers administrator warning (isExpired=true)'
);

const brokenSchedule: SmartMosqueScheduleProfile = {
  ...customAdminSchedule,
  times: customAdminSchedule.times.map((t) =>
    t.key === 'bomdod' ? { ...t, time: '05:30', iqamahTime: '05:15' } : t
  ),
};
const brokenAudit = validateDisplaySchedule(brokenSchedule, new Date('2026-04-09T10:00:00+05:00'));
assert(
  brokenAudit.isValid === false && brokenAudit.severity === 'error',
  'Iqamah earlier than Azan is rejected by validator with severity=error'
);

// 7. Offline / Online Versioned Conflict Resolution
const localV2 = { version: 2, updatedAt: '2026-04-09T09:00:00Z', tag: 'local-v2' };
const remoteV5 = { version: 5, updatedAt: '2026-04-09T10:00:00Z', tag: 'remote-v5' };
const resolvedRemote = resolveVersionedConflict(localV2, remoteV5);
assert(
  resolvedRemote.winner?.tag === 'remote-v5' && resolvedRemote.source === 'remote' && resolvedRemote.hadConflict,
  'Conflict resolver selects newer server version (v5 over v2)'
);

const resolvedOfflineKeep = resolveVersionedConflict(localV2, null);
assert(
  resolvedOfflineKeep.winner?.tag === 'local-v2' && resolvedOfflineKeep.source === 'local',
  'Conflict resolver never wipes local cached schedule when remote is null/offline'
);

// 8. Monitor Online Heartbeat Detection
const nowMs = Date.now();
assert(
  isMonitorOnline(new Date(nowMs - 20_000).toISOString(), nowMs) === true &&
    isMonitorOnline(new Date(nowMs - 180_000).toISOString(), nowMs) === false,
  'Monitor online heartbeat window detects live (<95s) vs offline (>95s) accurately'
);

// 9. All 5 Languages + Official New Uzbek Alphabet + Arabic Preservation
const locales: SupportedLocale[] = ['uz-Latn', 'uz-Cyrl', 'uz-Latn-new', 'ru', 'en'];
for (const loc of locales) {
  const dict = getDisplayLocaleBundle(loc);
  const clock = getTashkentClockParts(thursdayNoon);
  const formattedDate = formatDisplayGregorianDate(clock, loc);
  assert(
    Boolean(dict.prayerNames.bomdod && dict.prayerNames.ishroq && dict.prayerNames.juma && formattedDate.length > 6),
    `Locale "${loc}" provides complete prayer labels and formatted Milodiy date (${formattedDate})`
  );
}

const newUzStrings = getDisplayLocaleBundle('uz-Latn-new');
assert(
  newUzStrings.prayerNames.quyosh.includes('ş') &&
    newUzStrings.prayerNames.ishroq.includes('ş') &&
    adaptDisplayTextForLocale('Oʻzbekiston shahri gʻalabasi chiroyli oʻgʻlim', 'uz-Latn-new').includes('Özbekiston') &&
    adaptDisplayTextForLocale('Oʻzbekiston shahri gʻalabasi chiroyli oʻgʻlim', 'uz-Latn-new').includes('ö') &&
    adaptDisplayTextForLocale('Oʻzbekiston shahri gʻalabasi chiroyli oʻgʻlim', 'uz-Latn-new').includes('ğ') &&
    adaptDisplayTextForLocale('Oʻzbekiston shahri gʻalabasi chiroyli oʻgʻlim', 'uz-Latn-new').includes('ç'),
  'uz-Latn-new applies official ASAKA ZIYO transliterator (sh->ş, ch->ç, Oʻ/oʻ->Ö/ö, gʻ->ğ)'
);

const arabicSample = 'حَيَّ عَلَى الصَّلَاةِ';
assert(
  adaptDisplayTextForLocale(arabicSample, 'uz-Latn-new') === arabicSample &&
    adaptDisplayTextForLocale(arabicSample, 'uz-Cyrl') === arabicSample &&
    adaptDisplayTextForLocale(arabicSample, 'ru') === arabicSample,
  'Arabic religious scripts remain 100% untouched across all 5 display languages'
);

// 10. Four Canonical Design Profiles & Legacy Alias Normalization
assert(
  normalizeDisplayTemplate('royal_ivory') === 'royal_ivory' &&
    normalizeDisplayTemplate('classic_mosque') === 'royal_ivory' &&
    normalizeDisplayTemplate('emerald_royal') === 'emerald_royal' &&
    normalizeDisplayTemplate('premium_emerald') === 'emerald_royal' &&
    normalizeDisplayTemplate('modern_minimal') === 'modern_minimal' &&
    normalizeDisplayTemplate('minimal_modern') === 'modern_minimal' &&
    normalizeDisplayTemplate('madina_portrait') === 'madina_portrait' &&
    normalizeDisplayTemplate('unknown_value') === 'royal_ivory',
  'All 4 canonical design profiles (royal_ivory, emerald_royal, modern_minimal, madina_portrait) and legacy aliases normalize deterministically'
);

assert(
  locales.every((loc) => {
    const tpls = getDisplayLocaleBundle(loc).templates;
    return Boolean(tpls.royal_ivory && tpls.emerald_royal && tpls.modern_minimal && tpls.madina_portrait);
  }),
  'All 5 display languages provide localized labels for all 4 Smart Mosque Display profiles'
);

console.log('\n================================================================');
console.log(`SMART MOSQUE DISPLAY UNIT TESTS: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================');
if (failed > 0) process.exit(1);
