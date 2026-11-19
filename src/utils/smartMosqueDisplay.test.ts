/**
 * ASAKA ZIYO — Smart Mosque Display Automated Unit & Zero-Arabic Verification Suite
 *
 * Verifies:
 * 1. Exact admin prayer schedule preservation (zero astronomical auto-calculation)
 * 2. Refresh-safe deterministic Asia/Tashkent countdowns & Azan->Iqamah waiting window
 * 3. Friday Juma automatic slot replacement
 * 4. Midnight transition rollover (23:59:59 -> 00:00:01 Asia/Tashkent)
 * 5. Schedule validity / expiry / chronological / Iqamah-before-Azan auditing
 * 6. Offline/Online versioned conflict resolution
 * 7. Complete 5-language localization (uz-Latn, uz-Cyrl, uz-Latn-new, ru, en)
 * 8. Official New Uzbek Alphabet transliteration (sh->ş, ch->ç, oʻ->ö, gʻ->ğ)
 * 9. Dynamic text & Hijri date Arabic-script sanitization (zero Arabic leaks on screen)
 * 10. All 4 canonical design profiles + legacy alias normalization
 * 11. Automated source-code Unicode Arabic & RTL audit across ALL Smart Mosque Display files
 */

import fs from 'node:fs';
import path from 'node:path';
import { INITIAL_ASAKA_PRAYER_SCHEDULE } from '../data/prayerTimesData';
import {
  ALL_CANONICAL_DISPLAY_PROFILE_IDS,
  ORIGINAL_DISPLAY_PROFILE_IDS,
  PHASE2_PREMIUM_PROFILE_IDS,
  SmartMosqueScheduleProfile,
  buildDisplayScheduleFromMainSchedule,
  computeSmartDisplayTimeline,
  formatTimeForClockFormat,
  getTashkentClockParts,
  isMonitorOnline,
  normalizeDisplayTemplate,
  resolveVersionedConflict,
  validateDisplaySchedule,
} from './smartMosqueDisplayEngine';
import { computeDisplayLayoutProfile } from './smartMosqueResponsiveEngine';
import {
  DISPLAY_ARABIC_SCRIPT_REGEX,
  DISPLAY_SUPPORTED_LOCALES,
  adaptDisplayTextForLocale,
  containsArabicScript,
  formatDisplayGregorianDate,
  getDisplayLocaleBundle,
  localizeHijriDate,
  sanitizeDisplayDynamicText,
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
console.log('ASAKA ZIYO — SMART MOSQUE DISPLAY UNIT & ZERO-ARABIC TEST SUITE');
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

// 9. Complete 5-Language Localization Audit (Strictly 5 Project Languages, Zero Arabic)
const locales: SupportedLocale[] = ['uz-Latn', 'uz-Cyrl', 'uz-Latn-new', 'ru', 'en'];
assert(
  DISPLAY_SUPPORTED_LOCALES.length === 5 &&
    locales.every((l) => DISPLAY_SUPPORTED_LOCALES.includes(l)),
  'Smart Mosque Display supports strictly the 5 official project languages (no 6th language)'
);

for (const loc of locales) {
  const dict = getDisplayLocaleBundle(loc);
  const clock = getTashkentClockParts(thursdayNoon);
  const formattedDate = formatDisplayGregorianDate(clock, loc);
  const serialized = JSON.stringify(dict);
  assert(
    Boolean(
      dict.prayerNames.bomdod &&
        dict.prayerNames.peshin &&
        dict.prayerNames.asr &&
        dict.prayerNames.shom &&
        dict.prayerNames.xufton &&
        dict.prayerNames.ishroq &&
        dict.prayerNames.juma &&
        dict.prayerNames.tahajjud &&
        dict.prayerNames.subh &&
        dict.weekdays.length === 7 &&
        dict.months.length === 12 &&
        dict.hijriMonths.length === 12 &&
        dict.fullscreenEnter &&
        dict.pairMonitorButton &&
        dict.offlineNotice &&
        dict.monitorDisabledTitle &&
        dict.monitorBlockedTitle &&
        formattedDate.length > 6 &&
        !containsArabicScript(serialized)
    ),
    `Locale "${loc}" provides complete prayer names, 7 weekdays, 12 Gregorian & Hijri months, status/UI strings, and ZERO Arabic script (${formattedDate})`
  );
}

// 10. Official New Uzbek Alphabet Transliteration (sh->ş, ch->ç, oʻ->ö, gʻ->ğ)
const newUzStrings = getDisplayLocaleBundle('uz-Latn-new');
assert(
  newUzStrings.prayerNames.quyosh.includes('ş') &&
    newUzStrings.prayerNames.ishroq.includes('ş') &&
    newUzStrings.weekdays[3].includes('Ç') &&
    newUzStrings.fullscreenEnter.includes('ö') &&
    newUzStrings.scheduleUnpublishedNotice.includes('ğ') &&
    !newUzStrings.prayerNames.quyosh.includes('sh') &&
    !newUzStrings.weekdays[3].includes('Ch') &&
    adaptDisplayTextForLocale('Oʻzbekiston shahri gʻalabasi chiroyli oʻgʻlim', 'uz-Latn-new') ===
      'Özbekiston şahri ğalabasi çiroyli öğlim',
  'uz-Latn-new applies official transliterator (sh->ş, ch->ç, oʻ->ö, gʻ->ğ) cleanly without mixing with uz-Latn'
);

// 11. Dynamic Text & Hijri Date Arabic Sanitization Safety
const pureArabicSample = 'حَيَّ عَلَى الصَّلَاةِ';
for (const loc of locales) {
  const dict = getDisplayLocaleBundle(loc);
  const fallbackResult = sanitizeDisplayDynamicText(pureArabicSample, loc, dict.defaultAnnouncementTitle);
  assert(
    fallbackResult === dict.defaultAnnouncementTitle && !containsArabicScript(fallbackResult),
    `Pure Arabic dynamic input in "${loc}" never leaks Arabic and falls back cleanly to localized default`
  );
}

const mixedDynamic = sanitizeDisplayDynamicText(
  'Asaka Jome Masjidi — مسجد الفجر',
  'uz-Latn-new',
  'Standart'
);
assert(
  mixedDynamic === 'Asaka Jome Masjidi' && !containsArabicScript(mixedDynamic),
  'Mixed Arabic + Latin dynamic string strips Arabic cleanly without corrupt transliteration'
);

assert(
  localizeHijriDate('22 Jumodul avval 1448', 'uz-Latn') === '22 Jumodul avval 1448' &&
    localizeHijriDate('22 Jumodul avval 1448', 'uz-Cyrl') === '22 Жумодул аввал 1448' &&
    localizeHijriDate('22 Jumodul avval 1448', 'ru') === '22 Джумада аль-уля 1448' &&
    localizeHijriDate('22 Jumodul avval 1448', 'en') === '22 Jumada al-Ula 1448' &&
    localizeHijriDate('15 Ramazon 1448', 'uz-Latn-new') === '15 Ramazon 1448' &&
    localizeHijriDate('10 Shaʼbon 1448', 'uz-Latn-new') === '10 Şaʼbon 1448' &&
    localizeHijriDate('جمادى الأولى ١٤٤٨', 'uz-Latn') === '' &&
    !containsArabicScript(localizeHijriDate('جمادى الأولى 1448', 'en')),
  'Hijri dates localize accurately across all 5 languages and never emit Arabic script'
);

// 12. All 11 Canonical Design Profiles (4 Original + 6 Phase 2 + 1 Dedicated Tablo) & Legacy Aliases
const expectedCanonical: string[] = [
  'royal_ivory',
  'emerald_royal',
  'modern_minimal',
  'madina_portrait',
  'sultan_royal',
  'noor_classic',
  'midnight_premium',
  'vision_modern',
  'islamic_heritage',
  'masjid_al_nabawi',
  'masjid_namoz_tablosa_uz_cyrl',
];

assert(
  ALL_CANONICAL_DISPLAY_PROFILE_IDS.length === 11 &&
    ORIGINAL_DISPLAY_PROFILE_IDS.length === 4 &&
    PHASE2_PREMIUM_PROFILE_IDS.length === 6 &&
    expectedCanonical.every((id) => normalizeDisplayTemplate(id) === id) &&
    normalizeDisplayTemplate('classic_mosque') === 'royal_ivory' &&
    normalizeDisplayTemplate('premium_emerald') === 'emerald_royal' &&
    normalizeDisplayTemplate('minimal_modern') === 'modern_minimal' &&
    normalizeDisplayTemplate('unknown_value') === 'royal_ivory',
  'All 11 canonical design profiles (4 original + 6 Phase 2 + 1 dedicated /masjid-tv tablo) and legacy aliases normalize deterministically'
);

assert(
  locales.every((loc) => {
    const bundle = getDisplayLocaleBundle(loc);
    return ALL_CANONICAL_DISPLAY_PROFILE_IDS.every(
      (id) => Boolean(bundle.templates[id]) && Boolean(bundle.admin.profileDescriptions[id])
    );
  }),
  'All 5 display languages provide localized names and descriptions for all 11 Smart Mosque Display profiles'
);

// 13. 12h / 24h Clock Formatter Verification
assert(
  formatTimeForClockFormat('00:05', '24h') === '00:05' &&
    formatTimeForClockFormat('00:05', '12h') === '12:05' &&
    formatTimeForClockFormat('12:06', '12h') === '12:06' &&
    formatTimeForClockFormat('15:15', '12h') === '03:15' &&
    formatTimeForClockFormat('19:07', '12h') === '07:07' &&
    formatTimeForClockFormat('19:07', '24h') === '19:07',
  '12h and 24h time formatter converts midnight, noon, afternoon, and evening accurately'
);

// 14. Universal Responsive Layout Engine across ALL 16+ Required Viewports (Independent of Design Profile)
const TEST_VIEWPORTS: Array<{
  name: string;
  w: number;
  h: number;
  expectedOrientation: 'portrait' | 'landscape';
}> = [
  { name: 'Small phone portrait 320x568', w: 320, h: 568, expectedOrientation: 'portrait' },
  { name: 'Android compact 360x640', w: 360, h: 640, expectedOrientation: 'portrait' },
  { name: 'Phone 375x667', w: 375, h: 667, expectedOrientation: 'portrait' },
  { name: 'Modern phone 390x844', w: 390, h: 844, expectedOrientation: 'portrait' },
  { name: 'Large phone 412x915', w: 412, h: 915, expectedOrientation: 'portrait' },
  { name: 'Mobile landscape 640x360', w: 640, h: 360, expectedOrientation: 'landscape' },
  { name: 'Tablet portrait 768x1024', w: 768, h: 1024, expectedOrientation: 'portrait' },
  { name: 'Tablet landscape 1024x768', w: 1024, h: 768, expectedOrientation: 'landscape' },
  { name: 'HD TV 1280x720', w: 1280, h: 720, expectedOrientation: 'landscape' },
  { name: 'Laptop 1366x768', w: 1366, h: 768, expectedOrientation: 'landscape' },
  { name: '16:10 laptop 1440x900', w: 1440, h: 900, expectedOrientation: 'landscape' },
  { name: 'HD+ monitor 1600x900', w: 1600, h: 900, expectedOrientation: 'landscape' },
  { name: 'Full HD TV 1920x1080', w: 1920, h: 1080, expectedOrientation: 'landscape' },
  { name: 'QHD monitor 2560x1440', w: 2560, h: 1440, expectedOrientation: 'landscape' },
  { name: '4K UHD TV 3840x2160', w: 3840, h: 2160, expectedOrientation: 'landscape' },
  { name: 'Portrait FHD TV 1080x1920', w: 1080, h: 1920, expectedOrientation: 'portrait' },
  { name: 'Portrait 4K TV 2160x3840', w: 2160, h: 3840, expectedOrientation: 'portrait' },
  { name: 'Ultrawide 21:9 2560x1080', w: 2560, h: 1080, expectedOrientation: 'landscape' },
];

const layoutFailures: string[] = [];
for (const vp of TEST_VIEWPORTS) {
  const layout = computeDisplayLayoutProfile(vp.w, vp.h, 1, 'auto');
  if (layout.orientation !== vp.expectedOrientation) {
    layoutFailures.push(`${vp.name}: expected ${vp.expectedOrientation}, got ${layout.orientation}`);
  }
  if (!(layout.typeScaleMultiplier > 0 && layout.typeScaleMultiplier <= 1.6)) {
    layoutFailures.push(`${vp.name}: invalid typeScaleMultiplier ${layout.typeScaleMultiplier}`);
  }
}

const forcedPortraitOnTv = computeDisplayLayoutProfile(1920, 1080, 1, 'portrait');
const forcedLandscapeOnPhone = computeDisplayLayoutProfile(390, 844, 2, 'landscape');
const ultrawideLayout = computeDisplayLayoutProfile(2560, 1080, 1, 'auto');

assert(
  layoutFailures.length === 0 &&
    forcedPortraitOnTv.orientation === 'portrait' &&
    forcedLandscapeOnPhone.orientation === 'landscape' &&
    ultrawideLayout.isUltraWide === true &&
    ultrawideLayout.contentMaxWidthPx === Math.round(1080 * 1.92),
  layoutFailures.length === 0
    ? `Universal Responsive Layout Engine validated across all ${TEST_VIEWPORTS.length} viewports (320px -> 4K UHD & 21:9 ultrawide) + orientation overrides cleanly`
    : `Responsive layout failures: ${layoutFailures.join('; ')}`
);

// 15. Strict Uzbek Cyrillic Check for /masjid-tv Dedicated Tablo
const uzCyrlBundle = getDisplayLocaleBundle('uz-Cyrl');
assert(
  uzCyrlBundle.prayerNames.bomdod === 'Бомдод' &&
    uzCyrlBundle.prayerNames.peshin === 'Пешин' &&
    uzCyrlBundle.prayerNames.asr === 'Аср' &&
    uzCyrlBundle.prayerNames.shom === 'Шом' &&
    uzCyrlBundle.prayerNames.xufton === 'Хуфтон' &&
    uzCyrlBundle.duhaStartsAtLabel === 'Зуҳо вақти' &&
    uzCyrlBundle.sunriseLabel === 'Қуёш чиқиши' &&
    uzCyrlBundle.jumaLabel === 'Жума намози' &&
    uzCyrlBundle.nextAzanAfterLabel === 'Кейинги азонгача' &&
    !containsArabicScript(JSON.stringify(uzCyrlBundle)),
  'Dedicated /masjid-tv Uzbek Cyrillic labels match exact Mosque Tablo wording with zero Arabic'
);

// 16. Automated Source-Code Unicode Arabic & RTL Audit across ALL 18 Smart Mosque Display Files
const SMART_DISPLAY_SOURCE_FILES = [
  'src/components/features/tv/SmartMosqueDisplayPage.tsx',
  'src/components/features/tv/MasjidTvTabloPage.tsx',
  'src/components/features/tv/SmartTvModal.tsx',
  'src/components/features/tv/display/displayProfiles.ts',
  'src/components/features/tv/display/DisplayClockHeader.tsx',
  'src/components/features/tv/display/DisplayPrayerLedger.tsx',
  'src/components/features/tv/display/DisplayCountdownBand.tsx',
  'src/components/features/tv/display/DisplayAnnouncementBar.tsx',
  'src/components/features/tv/display/DisplayPairingModal.tsx',
  'src/components/features/tv/display/MasjidAlNabawiDisplay.tsx',
  'src/components/features/tv/display/Phase2PremiumDisplayRenderer.tsx',
  'src/components/features/admin/SmartMosqueDisplayAdmin.tsx',
  'src/components/features/admin/DisplayDesignThumbnail.tsx',
  'src/utils/smartMosqueDisplayEngine.ts',
  'src/utils/smartMosqueResponsiveEngine.ts',
  'src/utils/smartMosqueDisplayI18n.ts',
  'src/utils/smartMosqueDisplayService.ts',
  'server/smartMosqueDisplayRouter.ts',
];

const arabicUnicodeRegex = new RegExp(DISPLAY_ARABIC_SCRIPT_REGEX.source);
const forbiddenRtlOrFontRegex = /dir\s*=\s*["']rtl["']|font-arabic/i;
const sourceViolations: string[] = [];

for (const relFile of SMART_DISPLAY_SOURCE_FILES) {
  const fullPath = path.resolve(process.cwd(), relFile);
  if (!fs.existsSync(fullPath)) {
    sourceViolations.push(`Missing expected source file: ${relFile}`);
    continue;
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  if (arabicUnicodeRegex.test(content)) {
    sourceViolations.push(`Arabic Unicode character found in ${relFile}`);
  }
  if (forbiddenRtlOrFontRegex.test(content)) {
    sourceViolations.push(`Forbidden RTL or Arabic font class found in ${relFile}`);
  }
}

assert(
  sourceViolations.length === 0,
  sourceViolations.length === 0
    ? `Automated Unicode audit verified ZERO Arabic characters, ZERO dir="rtl", and ZERO font-arabic classes across all ${SMART_DISPLAY_SOURCE_FILES.length} Smart Mosque Display source files`
    : `Source audit failed: ${sourceViolations.join('; ')}`
);

console.log('\n================================================================');
console.log(`SMART MOSQUE DISPLAY UNIT TESTS: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================');
if (failed > 0) process.exit(1);
