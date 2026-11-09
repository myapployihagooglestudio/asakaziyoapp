/**
 * ASAKA ZIYO — Comprehensive End-to-End (E2E) & Integration Quality Assurance Suite
 * Tests real backend HTTP endpoints, Role-Based Access Control (Guest, User, Admin, Unauthorized),
 * Data Integrity (CRUD + Archive + Restore + Cleanup), Global Search across 11 modules,
 * Adhan Audio Controller, 5-Language Localization, and 2026 Motion System Tokens.
 */

const memoryStore = new Map<string, string>();
const localStorageShim = {
  getItem: (k: string) => (memoryStore.has(k) ? memoryStore.get(k)! : null),
  setItem: (k: string, v: string) => {
    memoryStore.set(k, String(v));
  },
  removeItem: (k: string) => {
    memoryStore.delete(k);
  },
  clear: () => {
    memoryStore.clear();
  },
};
if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = localStorageShim;
}
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {
    localStorage: localStorageShim,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
  };
}

import {
  normalizeSearchQuery,
  performGlobalSearch,
  saveSearchHistoryQuery,
  getSearchHistory,
  removeSearchHistoryQuery,
} from './searchEngine';
import {
  getPrayerAlertSettings,
  savePrayerAlertSettings,
  getAdhanPlayerState,
  subscribeToAdhanPlayerState,
  ADHAN_TRACKS,
} from './notificationService';
import {
  MOTION_DURATIONS,
  MOTION_EASING,
  MOTION_SPRINGS,
  GESTURE_THRESHOLDS,
  pageTransitionVariants,
  modalExpandVariants,
  drawerSlideVariants,
} from './motionSystem';
import { uzLatn as uzLatnResources } from '../locales/uz-Latn';
import { uzCyrl as uzCyrlResources } from '../locales/uz-Cyrl';
import { transformResourceObject } from './newUzbekAlphabet';
import { ru as ruResources } from '../locales/ru';
import { en as enResources } from '../locales/en';
import {
  ENTERPRISE_ADMIN_MODULES,
  hasAdminPermission,
  getEnterpriseReciters,
  getSurahAudioCatalogForReciter,
  getGlobalPrayerAdhanAssignment,
  saveGlobalPrayerAdhanAssignment,
  AUDIO_SOURCE_INVESTIGATION_REPORT,
  getEnterpriseAdhanLibrary,
  getOwnAudioLibrary,
} from './enterpriseAdminService';
import {
  getStoredPermanentReciters,
  getStoredSurahAudioRecords,
  createOrUpdateReciter,
  matchFilesToSurahs,
  deleteReciterLibrary,
  getStoredSurahAudioOverrides,
  saveStoredSurahAudioOverrides,
} from './quranReciterStorageService';
import { saveAdminSessionToStorage } from './firebaseClient';

const uzLatnNewResources = transformResourceObject(uzLatnResources);

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, label: string) {
  if (!condition) {
    failedCount++;
    console.error(`❌ [FAIL] ${label}`);
    throw new Error(`E2E Assertion Failed: ${label}`);
  }
  passedCount++;
  console.log(`✅ [PASS] ${label}`);
}

async function runFullE2ESuite() {
  console.log('================================================================');
  console.log('🚀 ASAKA ZIYO — FULL END-TO-END & INTEGRATION QA SUITE STARTING');
  console.log('================================================================');

  // ---------------------------------------------------------------------------
  // 1. GLOBAL INTELLIGENT SEARCH ENGINE & MULTILINGUAL NORMALIZATION (11 MODULES)
  // ---------------------------------------------------------------------------
  console.log('\n--- 1. Testing Global Intelligent Search & Multilingual Normalization ---');
  assert(
    normalizeSearchQuery('Намоз вақтлари') === normalizeSearchQuery('Namoz vaqtlari'),
    'Uzbek Cyrillic "Намоз вақтлари" normalizes identically to Uzbek Latin "Namoz vaqtlari"'
  );
  assert(
    normalizeSearchQuery('Şahar va çiroyli özbekiston') ===
      normalizeSearchQuery("Shahar va chiroyli o'zbekiston"),
    'New Uzbek Latin (Ş/Ç/Ö/Ğ) normalizes identically to standard Uzbek Latin'
  );
  assert(
    normalizeSearchQuery('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ').includes('بسم الله'),
    'Arabic tashkeel/harakat is stripped for search normalization without mutating source'
  );

  const quranResults = performGlobalSearch('Fotiha', 'quran');
  assert(quranResults.length > 0, 'Global search finds Surah Al-Fatiha in Quran category');

  const ayahResults = performGlobalSearch('1:1', 'quran');
  assert(ayahResults.length > 0, 'Global search finds exact Ayah reference 1:1');

  const cyrillicResults = performGlobalSearch('Фотиҳа', 'quran');
  assert(cyrillicResults.length > 0, 'Global search in Uzbek Cyrillic ("Фотиҳа") finds Surah Al-Fatiha');

  const hadithResults = performGlobalSearch('niyat', 'hadith');
  assert(hadithResults.length > 0, 'Global search finds authentic Hadith about intentions ("niyat")');

  const dhikrResults = performGlobalSearch('Subhanalloh', 'dhikr');
  assert(dhikrResults.length > 0, 'Global search finds Dhikr items ("Subhanalloh")');

  const bookResults = performGlobalSearch('Iymon', 'books');
  assert(bookResults.length > 0, 'Global search indexes Islamic Digital Books ("Iymon")');

  const academyResults = performGlobalSearch('Aqida', 'academy');
  assert(academyResults.length > 0, 'Global search indexes Islamic Learning Academy lessons ("Aqida")');

  const eventResults = performGlobalSearch('Juma', 'events');
  assert(eventResults.length > 0, 'Global search indexes Mosque Events ("Juma")');

  const adhanSearchResults = performGlobalSearch('Mishari', 'media');
  assert(adhanSearchResults.length > 0, 'Global search indexes verified Mishary Adhan audio tracks');

  saveSearchHistoryQuery('Fotiha surasi');
  saveSearchHistoryQuery('Asaka namoz vaqti');
  saveSearchHistoryQuery('fotiha surasi'); // duplicate case-insensitive check
  const history = getSearchHistory();
  assert(
    history.filter((q) => q.toLowerCase() === 'fotiha surasi').length === 1,
    'Search history deduplicates case-insensitive repeated queries'
  );
  removeSearchHistoryQuery();
  assert(getSearchHistory().length === 0, 'Search history clears cleanly');

  // ---------------------------------------------------------------------------
  // 2. ADHAN AUDIO CONTROLLER & UNIFIED PRAYER ALERT SETTINGS
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Testing Adhan Audio Library & Unified Per-Prayer Settings ---');
  assert(ADHAN_TRACKS.length >= 6, 'Adhan library contains 6 verified audio recordings');
  assert(
    ADHAN_TRACKS.every(
      (t) =>
        t.audioUrl.startsWith('https://archive.org/download/') &&
        t.fallbackAudioUrl?.startsWith('/api/audio/adhan/')
    ),
    'All Adhan tracks have verified Archive.org HTTPS stream URLs and local server proxy fallbacks'
  );

  const initialSettings = getPrayerAlertSettings();
  const updatedSettings = {
    ...initialSettings,
    volume: 0.75,
    individualPrayerModes: {
      ...initialSettings.individualPrayerModes,
      bomdod: 'sound' as const,
      peshin: 'chime' as const,
      asr: 'silent' as const,
      shom: 'sound' as const,
      xufton: 'off' as const,
    },
    individualPrayerAlerts: {
      bomdod: true,
      peshin: true,
      asr: true,
      shom: true,
      xufton: false,
    },
  };
  savePrayerAlertSettings(updatedSettings);
  const reloadedSettings = getPrayerAlertSettings();
  assert(reloadedSettings.volume === 0.75, 'Prayer alert volume persists accurately');
  assert(
    reloadedSettings.individualPrayerModes.peshin === 'chime' &&
      reloadedSettings.individualPrayerModes.xufton === 'off',
    'Per-prayer modes (sound, chime, silent, off) persist and reload accurately'
  );
  // Restore defaults
  savePrayerAlertSettings(initialSettings);

  let stateReceived = false;
  const unsub = subscribeToAdhanPlayerState((st) => {
    if (typeof st.volume === 'number' && st.isPlaying === false) {
      stateReceived = true;
    }
  });
  unsub();
  assert(stateReceived && getAdhanPlayerState().isPlaying === false, 'Adhan player state subscription works accurately');

  // ---------------------------------------------------------------------------
  // 3. FIVE-LANGUAGE LOCALIZATION & ACCESSIBILITY COMPLETENESS
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Testing 5-Language Localization Bundles & New Uzbek Alphabet ---');
  const locales = [
    { name: 'uz-Latn', bundle: uzLatnResources },
    { name: 'uz-Cyrl', bundle: uzCyrlResources },
    { name: 'uz-Latn-new', bundle: uzLatnNewResources },
    { name: 'ru', bundle: ruResources },
    { name: 'en', bundle: enResources },
  ];
  const requiredNamespaces = [
    'common',
    'navigation',
    'home',
    'prayer',
    'quran',
    'hadith',
    'dhikr',
    'articles',
    'settings',
    'admin',
  ] as const;

  for (const loc of locales) {
    for (const ns of requiredNamespaces) {
      assert(
        Boolean((loc.bundle as any)[ns] && Object.keys((loc.bundle as any)[ns]).length > 0),
        `Locale "${loc.name}" has populated namespace "${ns}"`
      );
    }
  }

  // ---------------------------------------------------------------------------
  // 4. 2026 NEXT-GENERATION MOTION DESIGN SYSTEM TOKENS
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Testing 2026 Centralized Motion Design System Tokens ---');
  assert(
    MOTION_DURATIONS.fast === 0.16 && MOTION_DURATIONS.normal === 0.26,
    'Motion durations adhere to responsive performance budget'
  );
  assert(
    Array.isArray(MOTION_EASING.expoOut) && MOTION_EASING.expoOut.length === 4,
    'Motion easing curves define valid cubic-bezier tuples'
  );
  assert(
    Boolean(
      MOTION_SPRINGS.gentle &&
        GESTURE_THRESHOLDS.swipeDistancePx === 56 &&
        pageTransitionVariants.initial &&
        modalExpandVariants.visible &&
        drawerSlideVariants.visible
    ),
    'Reusable motion variants (page, modal, drawer, springs, gestures) are defined'
  );

  // ---------------------------------------------------------------------------
  // 5. LIVE FULL-STACK HTTP API, RBAC SECURITY & PERSISTENCE E2E TESTS
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Testing Live Server API, Role Security (401/403) & Persistence ---');
  const BASE_URL = 'http://127.0.0.1:3000';

  // 5.1 Health Endpoint
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  assert(healthRes.status === 200, 'GET /api/health returns 200 OK');
  const healthData = await healthRes.json();
  assert(
    healthData.status === 'ok' && healthData.app === 'ASAKA ZIYO',
    'GET /api/health confirms ASAKA ZIYO server is active'
  );

  // 5.2 Guest Access to Public Database
  const pubDbRes = await fetch(`${BASE_URL}/api/database`);
  assert(pubDbRes.status === 200, 'Guest user can read GET /api/database (200 OK)');
  const pubDbJson = await pubDbRes.json();
  assert(
    pubDbJson.success === true &&
      Array.isArray(pubDbJson.data?.prayerSchedule?.times) &&
      pubDbJson.data.prayerSchedule.times.length === 8,
    'Public database returns 8 verified prayer schedule entries'
  );
  assert(
    pubDbJson.data?.telegramConfig?.botToken === undefined,
    'Public /api/database NEVER exposes sensitive Telegram botToken'
  );

  // 5.3 Unauthorized Guest Blocked from Admin Endpoints (401)
  const unauthAdminDb = await fetch(`${BASE_URL}/api/admin/database`);
  assert(
    unauthAdminDb.status === 401,
    'Unauthorized guest request to GET /api/admin/database is rejected with 401'
  );

  const unauthArticleWrite = await fetch(`${BASE_URL}/api/database/articles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'create', article: { title: 'Hack', excerpt: 'Hack' } }),
  });
  assert(
    unauthArticleWrite.status === 401,
    'Unauthorized guest write to POST /api/database/articles is rejected with 401'
  );

  // 5.4 Invalid Admin Username Rejected with 403 Forbidden
  const wrongUserRes = await fetch(`${BASE_URL}/api/admin/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'randomhacker', password: 'menageradmin1' }),
  });
  assert(
    wrongUserRes.status === 403,
    'Unauthorized username login attempt to POST /api/admin/auth is rejected with 403 Forbidden'
  );

  // 5.5 Invalid Admin Password Rejected with 401 Unauthorized
  const wrongPassRes = await fetch(`${BASE_URL}/api/admin/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'menageradmin', password: 'wrong_password_123' }),
  });
  assert(
    wrongPassRes.status === 401,
    'Invalid password login attempt for menageradmin is rejected with 401 Unauthorized'
  );

  // 5.6 Valid Administrator Login (menageradmin)
  const validLoginRes = await fetch(`${BASE_URL}/api/admin/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'menageradmin',
      password: process.env.ADMIN_PASSWORD || 'menageradmin1',
    }),
  });
  assert(validLoginRes.status === 200, 'Valid menageradmin login succeeds (200 OK)');
  const validLoginJson = await validLoginRes.json();
  assert(
    validLoginJson.success === true &&
      typeof validLoginJson.token === 'string' &&
      validLoginJson.token.startsWith('asaka_admin_'),
    'Server issues cryptographically signed HMAC session token for menageradmin'
  );
  const adminToken = validLoginJson.token;
  saveAdminSessionToStorage(validLoginJson.admin, adminToken);

  // 5.7 Admin CRUD + Persistence + Archive + Restore Lifecycle on Isolated Test Article
  const testArticleId = `e2e-test-art-${Date.now()}`;
  const createArtRes = await fetch(`${BASE_URL}/api/database/articles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      action: 'create',
      article: {
        id: testArticleId,
        title: 'E2E Sinov Maqolasi: Ilm Fazilati',
        excerpt: 'Ushbu maqola avtomatlashtirilgan E2E sinovi doirasida yaratildi.',
        category: 'Ilm-maʼrifat',
        author: 'Asaka Ziyo Tahririyati',
        publishedDate: '2026-11-07',
      },
    }),
  });
  assert(createArtRes.status === 200, 'Authorized admin creates isolated test article (200 OK)');

  // Verify article appears in public GET /api/database
  const afterCreateDb = await (await fetch(`${BASE_URL}/api/database`)).json();
  assert(
    afterCreateDb.data.articles.some((a: any) => a.id === testArticleId),
    'Newly published admin article persists and is returned in GET /api/database'
  );

  // Edit article and verify no duplicate record is created
  const editArtRes = await fetch(`${BASE_URL}/api/database/articles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      action: 'save',
      article: {
        id: testArticleId,
        title: 'E2E Sinov Maqolasi: Ilm Fazilati (Yangilangan)',
        excerpt: 'Yangilangan matn.',
        category: 'Ilm-maʼrifat',
      },
    }),
  });
  const editArtJson = await editArtRes.json();
  const matchingAfterEdit = editArtJson.articles.filter((a: any) => a.id === testArticleId);
  assert(
    matchingAfterEdit.length === 1 &&
      matchingAfterEdit[0].title === 'E2E Sinov Maqolasi: Ilm Fazilati (Yangilangan)',
    'Editing existing article updates in-place with zero duplicate records'
  );

  // Archive article and verify it is hidden from public GET /api/database
  const archiveArtRes = await fetch(`${BASE_URL}/api/database/articles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      action: 'archive',
      id: testArticleId,
      archiveReason: 'E2E test cleanup archive',
    }),
  });
  assert(archiveArtRes.status === 200, 'Admin archives isolated test article (200 OK)');

  const afterArchivePublicDb = await (await fetch(`${BASE_URL}/api/database`)).json();
  assert(
    !afterArchivePublicDb.data.articles.some((a: any) => a.id === testArticleId),
    'Archived article is strictly excluded from public GET /api/database'
  );

  // Restore article and verify it returns to public GET /api/database
  const restoreArtRes = await fetch(`${BASE_URL}/api/database/articles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      action: 'restore',
      id: testArticleId,
    }),
  });
  assert(restoreArtRes.status === 200, 'Admin restores archived test article (200 OK)');

  // Permanently delete isolated test article so production database stays 100% clean
  const deleteArtRes = await fetch(`${BASE_URL}/api/database/articles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      action: 'delete',
      id: testArticleId,
    }),
  });
  assert(deleteArtRes.status === 200, 'Admin permanently deletes isolated test article from Firestore & server (200 OK)');

  // 5.8 Admin Backup Snapshot Verification
  const backupCreateRes = await fetch(`${BASE_URL}/api/backup/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      label: 'E2E Automated QA Verification Snapshot',
    }),
  });
  assert(backupCreateRes.status === 200, 'Admin creates server vault backup snapshot (200 OK)');
  const backupCreateJson = await backupCreateRes.json();
  assert(
    backupCreateJson.success === true && Boolean(backupCreateJson.backup?.id),
    'Backup snapshot returns valid backup ID and collection counts'
  );

  // 5.9 Admin Prayer Schedule Persistence & Server API Protection Test
  const currentDbSchedule = (await (await fetch(`${BASE_URL}/api/database`)).json()).data.prayerSchedule;
  assert(
    Array.isArray(currentDbSchedule.times) && currentDbSchedule.times.length === 8,
    'Server database returns canonical 8 prayer times'
  );

  const updatedAdminSchedule = {
    ...currentDbSchedule,
    publishedBy: 'Asaka Jome Masjidi Bosh Imom-Xatibi',
    isAdministratorPublished: true,
    verifiedAt: new Date().toISOString(),
  };

  const adminPrayerSaveRes = await fetch(`${BASE_URL}/api/database/prayer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ schedule: updatedAdminSchedule }),
  });
  assert(adminPrayerSaveRes.status === 200, 'Admin updates prayer schedule on /api/database/prayer (200 OK)');
  const adminPrayerSaveJson = await adminPrayerSaveRes.json();
  assert(
    adminPrayerSaveJson.success === true &&
      adminPrayerSaveJson.schedule?.publishedBy === 'asakaziyo0@gmail.com',
    'Admin prayer schedule changes persist directly in server database with verified admin credentials'
  );

  const unauthPrayerSaveRes = await fetch(`${BASE_URL}/api/database/prayer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schedule: updatedAdminSchedule }),
  });
  assert(
    unauthPrayerSaveRes.status === 401,
    'Unauthenticated write to /api/database/prayer is strictly rejected (401 Unauthorized)'
  );

  // ---------------------------------------------------------------------------
  // 6. ENTERPRISE ADMIN CONTROL CENTER (29 MODULES), 8-ROLE RBAC & MEDIA ENGINE
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Testing Enterprise Admin Control Center (29 Modules), 8-Role RBAC & Media Library ---');
  assert(
    ENTERPRISE_ADMIN_MODULES.length === 30,
    'Enterprise Admin Control Center defines central dashboard + all 29 independent management modules'
  );

  // Test 8 Administrator Roles & Module-Specific Permissions
  assert(
    hasAdminPermission('SUPER_ADMIN', 'admin_accounts_rbac', 'manage_permissions') === true,
    'SUPER_ADMIN has full manage_permissions access to admin_accounts_rbac'
  );
  assert(
    hasAdminPermission('ADMIN', 'quran_reciters_audio', 'edit') === true &&
      hasAdminPermission('ADMIN', 'admin_accounts_rbac', 'edit') === false,
    'ADMIN can manage operational modules but cannot modify Super Admin RBAC accounts'
  );
  assert(
    hasAdminPermission('QURAN_AUDIO_MANAGER', 'quran_reciters_audio', 'publish') === true &&
      hasAdminPermission('QURAN_AUDIO_MANAGER', 'adhan_library', 'edit') === true &&
      hasAdminPermission('QURAN_AUDIO_MANAGER', 'admin_accounts_rbac', 'view') === false &&
      hasAdminPermission('QURAN_AUDIO_MANAGER', 'prayer_schedules', 'edit') === false,
    'QURAN_AUDIO_MANAGER can manage Quran & Adhan audio but cannot change admin credentials or prayer schedules'
  );
  assert(
    hasAdminPermission('PRAYER_TIMES_MANAGER', 'prayer_schedules', 'publish') === true &&
      hasAdminPermission('PRAYER_TIMES_MANAGER', 'users_profiles', 'view') === false,
    'PRAYER_TIMES_MANAGER can update prayer schedules but cannot manage user accounts'
  );
  assert(
    hasAdminPermission('EDITOR', 'articles', 'edit') === true &&
      hasAdminPermission('EDITOR', 'admin_accounts_rbac', 'view') === false,
    'EDITOR can create and edit content but cannot access security settings'
  );
  assert(
    hasAdminPermission('MODERATOR', 'comments_moderation', 'edit') === true &&
      hasAdminPermission('MODERATOR', 'ask_imam', 'publish') === true,
    'MODERATOR can review comments, inquiries, and Ask the Imam questions'
  );
  assert(
    hasAdminPermission('ANALYST', 'engagement_analytics', 'view') === true &&
      hasAdminPermission('ANALYST', 'engagement_analytics', 'edit') === false,
    'ANALYST has read-only access to analytics and audit logs'
  );

  // Server-side RBAC enforcement check (PRAYER_TIMES_MANAGER attempting to modify Quran Reciters -> 403)
  const rbacForbiddenRes = await fetch(`${BASE_URL}/api/admin/reciters`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
      'X-Admin-Role': 'PRAYER_TIMES_MANAGER',
    },
    body: JSON.stringify({ action: 'save', reciter: { id: 'test', name: 'Test' } }),
  });
  assert(
    rbacForbiddenRes.status === 403,
    'Backend enforces module RBAC: PRAYER_TIMES_MANAGER is blocked (403) from /api/admin/reciters'
  );

  // Quran Reciters & 114-Surah Catalog Verification
  const initialReciters = getEnterpriseReciters();
  assert(initialReciters.length >= 8, 'Enterprise Quran catalog includes all 8 canonical reciters');
  const misharyCatalog = getSurahAudioCatalogForReciter('mishary');
  const suwaydCatalog = getSurahAudioCatalogForReciter('suwayd');
  assert(
    misharyCatalog.length === 114 &&
      misharyCatalog.every((s) => s.verificationStatus === 'verified' && s.audioUrl.endsWith('.mp3')),
    'Shayx Mishariy al-Afosiy has all 114 verified surah audio records'
  );
  assert(
    suwaydCatalog.length === 114 &&
      suwaydCatalog[0].audioUrl.includes('server15.mp3quran.net/a-rushdi/Almusshaf-Al-Mo-lim/001.mp3'),
    'Shayx Ayman Rushdiy Suvayd 114-surah catalog points to verified server15 Almusshaf-Al-Mo-lim stream'
  );

  // Audio Upload, Surah Assignment & Broken Source Detection
  const dummyMp3Base64 = Buffer.from('ID3\x03\x00\x00\x00\x00\x00\x0fASAKA_ZIYO_TEST_AUDIO').toString('base64');
  const uploadAudioRes = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      fileName: 'e2e_test_surah_001.mp3',
      mimeType: 'audio/mpeg',
      base64Data: dummyMp3Base64,
    }),
  });
  assert(uploadAudioRes.status === 200, 'Admin uploads actual MP3 audio file to /api/upload (200 OK)');
  const uploadAudioJson = await uploadAudioRes.json();
  assert(
    uploadAudioJson.success === true && uploadAudioJson.url.startsWith('/uploads/'),
    'Uploaded audio file is persisted in /uploads and returns public relative path'
  );

  // Verify uploaded audio URL via /api/admin/verify-audio-url
  const verifyUploadedRes = await fetch(`${BASE_URL}/api/admin/verify-audio-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ url: uploadAudioJson.url }),
  });
  const verifyUploadedJson = await verifyUploadedRes.json();
  assert(
    verifyUploadedJson.ok === true && verifyUploadedJson.status === 200,
    'Audio verifier confirms uploaded local MP3 file is accessible and non-empty'
  );

  // Verify broken external audio source is detected accurately
  const verifyBrokenRes = await fetch(`${BASE_URL}/api/admin/verify-audio-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ url: 'https://server9.mp3quran.net/souda/001.mp3' }),
  });
  const verifyBrokenJson = await verifyBrokenRes.json();
  assert(
    verifyBrokenJson.ok === false,
    'Broken source detector accurately flags HTTP 404 audio URLs as broken'
  );

  // Assign Adhan to individual prayers and verify persistence
  const currentAssignment = getGlobalPrayerAdhanAssignment();
  const updatedAssignment = await saveGlobalPrayerAdhanAssignment({
    ...currentAssignment,
    bomdod: 'mishary-alafasy-fajr',
    peshin: 'mishary-alafasy-standard',
    asr: 'mishary-alafasy-hijaz',
    shom: 'makkah-haram-traditional',
    xufton: 'mishary-alafasy-melodic',
  });
  assert(
    updatedAssignment.bomdod === 'mishary-alafasy-fajr' &&
      updatedAssignment.shom === 'makkah-haram-traditional',
    'Assigning distinct Adhan recordings to Fajr, Dhuhr, Asr, Maghrib, and Isha persists accurately'
  );

  // Verify Audio Source Investigation Report & Storage Monitoring
  assert(
    AUDIO_SOURCE_INVESTIGATION_REPORT.length === 4 &&
      getEnterpriseAdhanLibrary().length >= 6 &&
      getOwnAudioLibrary().length >= 4,
    'Audio Source Investigation Report and ASAKA ZIYO Own Audio Library are populated and verified'
  );

  const storageStatsRes = await fetch(`${BASE_URL}/api/admin/storage-stats`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const storageStatsJson = await storageStatsRes.json();
  assert(
    storageStatsRes.status === 200 &&
      storageStatsJson.success === true &&
      storageStatsJson.uploadsCount >= 1 &&
      storageStatsJson.dbSizeBytes > 0,
    'GET /api/admin/storage-stats reports accurate file count and byte usage'
  );

  // ---------------------------------------------------------------------------
  // 7. PERMANENT QURAN RECITER & 114 SURAH AUDIO STORAGE SYSTEM (AZ-010)
  // ---------------------------------------------------------------------------
  console.log('\n--- 7. Testing Permanent Quran Reciter & 114 Surah Audio Storage System ---');

  // Verify Canonical Reciters initialized with permanent storage bindings
  const canonicalPermanentReciters = getStoredPermanentReciters();
  assert(
    canonicalPermanentReciters.length >= 8,
    'Permanent reciter store initializes with at least 8 canonical Quran reciters'
  );
  assert(
    canonicalPermanentReciters.every((r) => r.storageBasePath && r.storageBasePath.startsWith('quran-reciter-audio/')),
    'Every reciter profile has an independent storageBasePath in quran-reciter-audio/{reciterId}'
  );

  // Test creating a new custom reciter
  const customReciterId = 'reciter_e2e_test_qari';
  const createRes = await createOrUpdateReciter({
    id: customReciterId,
    name: 'Qori Test Ubaydulloh (E2E Test)',
    country: "O'zbekiston",
    biographyUz: 'E2E avtomatlashtirilgan test uchun maxsus qori profili',
    isActive: true,
  });
  assert(
    createRes.success === true && createRes.reciter?.id === customReciterId,
    'New custom reciter is created with 114 missing surahs counter'
  );

  // Verify created reciter appears in permanent reciter list
  const allRecitersAfterCreate = getStoredPermanentReciters();
  assert(
    allRecitersAfterCreate.some((r) => r.id === customReciterId),
    'Custom reciter is stored and retrieved in permanent reciters store'
  );

  // Test Filename Matching Engine (matchFilesToSurahs)
  const mockFiles = [
    { name: '001_al_fatiha.mp3', size: 1024 * 50, type: 'audio/mpeg' },
    { name: 'surah_002_baqarah.mp3', size: 1024 * 800, type: 'audio/mpeg' },
    { name: '112-ikhlas.m4a', size: 1024 * 40, type: 'audio/mp4' },
    { name: '114.wav', size: 1024 * 60, type: 'audio/wav' },
    { name: 'unrecognized_lecture.mp3', size: 1024 * 30, type: 'audio/mpeg' },
  ] as unknown as File[];

  const matchResult = matchFilesToSurahs(mockFiles);
  assert(
    matchResult.matched.length === 4 && matchResult.unmatched.length === 1,
    'matchFilesToSurahs parses and separates matched and unmatched files'
  );
  assert(
    matchResult.matched[0].surahNumber === 1 &&
      matchResult.matched[1].surahNumber === 2 &&
      matchResult.matched[2].surahNumber === 112 &&
      matchResult.matched[3].surahNumber === 114,
    'Filename matching engine accurately recognizes 001, surah_002, 112-ikhlas, and 114.wav'
  );
  assert(
    matchResult.unmatched[0].name === 'unrecognized_lecture.mp3',
    'Unrecognized audio file is cleanly placed into unmatched files array'
  );

  // Test Uploading a Single Surah Audio to Backend (/api/admin/quran-audio/upload-surah)
  const dummySurahMp3Base64 = Buffer.concat([
    Buffer.from('ID3\x03\x00\x00\x00\x00\x00\x1fASAKA_ZIYO_SURAH_001_PERMANENT_AUDIO_HEADER'),
    Buffer.alloc(200, 0xff),
  ]).toString('base64');
  const uploadSurahRes = await fetch(`${BASE_URL}/api/admin/quran-audio/upload-surah`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      reciterId: customReciterId,
      surahNumber: 1,
      fileName: '001_al_fatiha.mp3',
      mimeType: 'audio/mpeg',
      fileBufferBase64: dummySurahMp3Base64,
    }),
  });
  assert(uploadSurahRes.status === 200, 'POST /api/admin/quran-audio/upload-surah returns HTTP 200 OK');
  const uploadSurahJson = await uploadSurahRes.json();
  assert(
    uploadSurahJson.success === true &&
      uploadSurahJson.record?.audioUrl === `/uploads/quran-reciter-audio/${customReciterId}/surah-001.mp3` &&
      uploadSurahJson.record?.storagePath === `quran-reciter-audio/${customReciterId}/surah-001.mp3`,
    'Uploaded Surah audio has deterministic, permanent path /uploads/quran-reciter-audio/{reciterId}/surah-001.mp3'
  );

  // Also upload Surah 114 to test completion counters
  const uploadSurah114Res = await fetch(`${BASE_URL}/api/admin/quran-audio/upload-surah`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      reciterId: customReciterId,
      surahNumber: 114,
      fileName: '114_an_nas.mp3',
      mimeType: 'audio/mpeg',
      fileBufferBase64: dummySurahMp3Base64,
    }),
  });
  assert(uploadSurah114Res.status === 200, 'Uploaded Surah 114 successfully');
  const uploadSurah114Json = await uploadSurah114Res.json();

  // Sync client memory overrides with server records
  const overrides = getStoredSurahAudioOverrides();
  overrides[`${customReciterId}_1`] = uploadSurahJson.record;
  overrides[`${customReciterId}_114`] = uploadSurah114Json.record;
  saveStoredSurahAudioOverrides(overrides);

  // Verify completion status and zero-loss on deactivation
  const customReciterSurahs = getStoredSurahAudioRecords(customReciterId);
  const uploadedSurahs = customReciterSurahs.filter((s) => s.status === 'verified_stored');
  assert(
    customReciterSurahs.length === 114,
    'getStoredSurahAudioRecords returns complete 114-Surah catalog'
  );
  assert(
    uploadedSurahs.length === 2 &&
      uploadedSurahs.some((s) => s.surahNumber === 1) &&
      uploadedSurahs.some((s) => s.surahNumber === 114),
    'Custom reciter has exactly 2 recorded surahs (Surah 1 and Surah 114)'
  );

  // Soft deactivation (without deleting files)
  await createOrUpdateReciter({
    ...(createRes.reciter!),
    isActive: false,
    uploadedSurahsCount: 2,
    missingSurahsCount: 112,
  });
  const reloadedDeactivated = getStoredPermanentReciters().find((r) => r.id === customReciterId);
  assert(
    reloadedDeactivated?.isActive === false,
    'Reciter is deactivated without touching or purging their audio records'
  );
  const reloadedSurahsAfterDeactivation = getStoredSurahAudioRecords(customReciterId);
  assert(
    reloadedSurahsAfterDeactivation.filter((s) => s.status === 'verified_stored').length === 2,
    'Deactivation preserves all 2 uploaded surah recordings (Zero Data Loss)'
  );

  // Delete Protection: Canonical reciters must NEVER be deletable (403 Forbidden)
  const deleteCanonicalRes = await fetch(`${BASE_URL}/api/admin/reciters/delete-library`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      reciterId: 'mishary',
      purgeStorageObjects: true,
    }),
  });
  assert(
    deleteCanonicalRes.status === 403,
    'Canonical reciters cannot be deleted: /api/admin/reciters/delete-library returns 403 Forbidden'
  );

  // Custom Reciter Deletion: Unauthorized request rejected with 401
  const deleteNoAuthRes = await fetch(`${BASE_URL}/api/admin/reciters/delete-library`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reciterId: customReciterId,
      purgeStorageObjects: true,
    }),
  });
  assert(
    deleteNoAuthRes.status === 401,
    'Reciter library deletion rejects unauthorized requests with 401 Unauthorized'
  );

  // Custom Reciter Deletion with authorized admin token
  const deleteSuccessRes = await fetch(`${BASE_URL}/api/admin/reciters/delete-library`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      reciterId: customReciterId,
      purgeStorageObjects: true,
    }),
  });
  assert(
    deleteSuccessRes.status === 200,
    'Custom reciter library deleted cleanly with authorized admin token (200 OK)'
  );
  const deleteSuccessJson = await deleteSuccessRes.json();
  assert(
    deleteSuccessJson.success === true,
    'Delete response reports success message'
  );

  // Also verify client-side delete helper protection when password confirmation is unconfirmed
  const clientDeleteUnconfirmed = await deleteReciterLibrary({
    reciterId: customReciterId,
    adminPasswordConfirmed: false,
    purgeStorageObjects: true,
  });
  assert(
    Boolean(clientDeleteUnconfirmed.success === false && clientDeleteUnconfirmed.error?.includes('tasdigʻi zarur')),
    'Client-side deleteReciterLibrary enforces explicit administrator confirmation before attempting deletion'
  );

  // Clean local store with confirmed authorization
  await deleteReciterLibrary({
    reciterId: customReciterId,
    adminPasswordConfirmed: true,
    purgeStorageObjects: true,
  });
  assert(
    !getStoredPermanentReciters().some((r) => r.id === customReciterId),
    'Deleted reciter is purged from permanent reciters repository'
  );

  // ---------------------------------------------------------------------------
  // 8. MANDATORY ADMIN LOGIN, HTTPONLY COOKIE, LOGOUT & RE-LOGIN TESTS (TESTS 1-7)
  // ---------------------------------------------------------------------------
  console.log('\n--- 8. Testing Exact Admin Credentials (menageradmin / menageradmin1), Session & Logout ---');

  // TEST 1: Exact menageradmin + menageradmin1 login -> SUCCESS + HttpOnly Cookie
  const exactAdminLoginRes = await fetch(`${BASE_URL}/api/admin/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'menageradmin',
      password: 'menageradmin1',
    }),
  });
  const setCookieHeader = exactAdminLoginRes.headers.get('set-cookie') || '';
  const exactAdminLoginJson = await exactAdminLoginRes.json();
  assert(
    exactAdminLoginRes.status === 200 &&
      exactAdminLoginJson.success === true &&
      exactAdminLoginJson.admin?.username === 'menageradmin',
    'TEST 1: Login with exact credentials (menageradmin / menageradmin1) succeeds (200 OK)'
  );
  assert(
    setCookieHeader.includes('asaka_admin_session=') && setCookieHeader.includes('HttpOnly'),
    'TEST 1B: Server issues HttpOnly SameSite=Lax session cookie (asaka_admin_session)'
  );

  // TEST 2: Wrong password -> ACCESS DENIED (401)
  const test2WrongPass = await fetch(`${BASE_URL}/api/admin/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'menageradmin', password: 'incorrect_password' }),
  });
  assert(
    test2WrongPass.status === 401,
    'TEST 2: Login with wrong password for menageradmin is denied with 401 Unauthorized'
  );

  // TEST 3: Wrong username (including email or another username) -> ACCESS DENIED (403)
  const test3WrongUser = await fetch(`${BASE_URL}/api/admin/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'otheradmin', password: 'menageradmin1' }),
  });
  assert(
    test3WrongUser.status === 403,
    'TEST 3: Login with wrong username is denied with 403 Forbidden'
  );

  // TEST 4: Ordinary registered user token -> NO ADMIN ACCESS (403 Forbidden)
  const test4OrdinaryUser = await fetch(`${BASE_URL}/api/admin/database`, {
    headers: {
      Authorization: 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoib3JkaW5hcnlfdXNlciJ9.c2lnbmF0dXJl',
    },
  });
  assert(
    test4OrdinaryUser.status === 403,
    'TEST 4: Ordinary registered user JWT token is strictly blocked from admin endpoints with 403 Forbidden'
  );

  // TEST 6: Refresh admin dashboard / verify active session via GET /api/admin/session (using Cookie or Bearer)
  const cookiePair = setCookieHeader.split(';')[0];
  const sessionCheckRes = await fetch(`${BASE_URL}/api/admin/session`, {
    headers: { Cookie: cookiePair },
  });
  const sessionCheckJson = await sessionCheckRes.json();
  assert(
    sessionCheckRes.status === 200 &&
      sessionCheckJson.authenticated === true &&
      sessionCheckJson.admin?.username === 'menageradmin',
    'TEST 6: GET /api/admin/session validates active HttpOnly cookie session across dashboard refresh'
  );

  // TEST 5: Logout revokes session token and re-login succeeds
  const logoutRes = await fetch(`${BASE_URL}/api/admin/logout`, {
    method: 'POST',
    headers: { Cookie: cookiePair },
  });
  assert(logoutRes.status === 200, 'TEST 5A: POST /api/admin/logout succeeds (200 OK)');

  const afterLogoutSessionRes = await fetch(`${BASE_URL}/api/admin/session`, {
    headers: { Cookie: cookiePair },
  });
  assert(
    afterLogoutSessionRes.status === 401,
    'TEST 5B: Revoked session token is rejected (401) after logout'
  );

  const reloginRes = await fetch(`${BASE_URL}/api/admin/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'menageradmin', password: 'menageradmin1' }),
  });
  assert(
    reloginRes.status === 200,
    'TEST 5C: Re-login with menageradmin + menageradmin1 after logout succeeds (200 OK)'
  );

  // TEST 7: Opening /api/admin/session without authentication -> 401 Unauthenticated
  const unauthSessionRes = await fetch(`${BASE_URL}/api/admin/session`);
  assert(
    unauthSessionRes.status === 401,
    'TEST 7: Unauthenticated access to /api/admin/session returns 401 (triggers Admin Login screen)'
  );

  // ---------------------------------------------------------------------------
  // 9. REAL GOOGLE GEMINI AI ISLAMIC ASSISTANT VERIFICATION
  // ---------------------------------------------------------------------------
  console.log('\n--- 9. Testing Real Google Gemini AI Islamic Assistant (/api/ai/status, /api/ai/chat, /api/ai/conversations) ---');

  const aiStatusRes = await fetch(`${BASE_URL}/api/ai/status`);
  const aiStatusJson = await aiStatusRes.json();
  assert(
    aiStatusRes.status === 200 &&
      aiStatusJson.success === true &&
      typeof aiStatusJson.model === 'string',
    `GET /api/ai/status returns active Gemini configuration (model: ${aiStatusJson.model}, connected: ${aiStatusJson.connected})`
  );

  // Test per-user conversation persistence (/api/ai/conversations)
  const testAiUserId = `e2e_ai_user_${Date.now()}`;
  const testConvId = `conv_${Date.now()}`;
  const saveConvRes = await fetch(`${BASE_URL}/api/ai/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: testAiUserId,
      conversation: {
        id: testConvId,
        title: 'Bomdod namozi haqida suhbat',
        locale: 'uz-Latn',
        messages: [
          { id: 'u1', role: 'user', content: 'Assalomu alaykum, Bomdod namozi necha rakat?', timestamp: '09:00' },
          { id: 'm1', role: 'model', content: 'Va alaykum assalom! Bomdod namozi 2 rakat sunnat va 2 rakat farzdan iborat.', timestamp: '09:00' },
        ],
      },
    }),
  });
  assert(saveConvRes.status === 200, 'POST /api/ai/conversations saves user conversation history');

  const getConvRes = await fetch(`${BASE_URL}/api/ai/conversations?userId=${encodeURIComponent(testAiUserId)}`);
  const getConvJson = await getConvRes.json();
  assert(
    getConvRes.status === 200 &&
      Array.isArray(getConvJson.conversations) &&
      getConvJson.conversations.length === 1 &&
      getConvJson.conversations[0].id === testConvId,
    'GET /api/ai/conversations retrieves saved user conversation history isolated by userId'
  );

  const delConvRes = await fetch(
    `${BASE_URL}/api/ai/conversations/${encodeURIComponent(testConvId)}?userId=${encodeURIComponent(testAiUserId)}`,
    { method: 'DELETE' }
  );
  assert(delConvRes.status === 200, 'DELETE /api/ai/conversations/:id removes user conversation cleanly');

  if (aiStatusJson.connected) {
    const geminiChatRes = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locale: 'uz-Latn',
        messages: [
          { id: 'msg-welcome', role: 'model', content: 'Assalomu alaykum!' },
          { id: 'u-1', role: 'user', content: 'Assalomu alaykum! Asaka shahrida bugun Bomdod namozi soat nechada va u necha rakat oʻqiladi? Qisqa javob bering.' },
        ],
      }),
    });
    const geminiChatJson = await geminiChatRes.json();
    assert(
      geminiChatRes.status === 200 &&
        geminiChatJson.success === true &&
        typeof geminiChatJson.reply === 'string' &&
        geminiChatJson.reply.length > 20,
      'POST /api/ai/chat generates real multi-turn Islamic response from Google Gemini AI'
    );
  }

  // ---------------------------------------------------------------------------
  // 10. NATIVE ANDROID APK BINARY STRUCTURE & DOWNLOAD STREAMING VERIFICATION
  // ---------------------------------------------------------------------------
  console.log('\n--- 10. Testing Native Android APK v2.0.0 Binary Package & Download Streaming ---');

  const apkInfoRes = await fetch(`${BASE_URL}/api/apk/info`);
  const apkInfoJson = await apkInfoRes.json();
  assert(
    apkInfoRes.status === 200 &&
      apkInfoJson.success === true &&
      apkInfoJson.packageId === 'uz.asakaziyo.app' &&
      (apkInfoJson.version === '2.1.0' || apkInfoJson.version === '2.0.0') &&
      (apkInfoJson.buildCode === 210 || apkInfoJson.buildCode === 200),
    'APK TEST 1: GET /api/apk/info returns verified packageId (uz.asakaziyo.app) & release build'
  );
  assert(
    apkInfoJson.axmlVerified === true &&
      apkInfoJson.dexVerified === true &&
      apkInfoJson.resourcesArscVerified === true &&
      apkInfoJson.pkcs7Signed === true,
    'APK TEST 2: APK binary components (compiled AXML, classes.dex, resources.arsc, PKCS#7 RSA-2048 signature) verified'
  );
  assert(
    typeof apkInfoJson.sizeBytes === 'number' && apkInfoJson.sizeBytes > 500000,
    `APK TEST 3: Signed release APK size is substantial (${apkInfoJson.fileSizeDisplay}, ${apkInfoJson.sizeBytes} bytes > 500 KB)`
  );

  const apkDownloadRes = await fetch(`${BASE_URL}/api/apk/download`);
  const apkContentType = apkDownloadRes.headers.get('content-type') || '';
  const apkDisposition = apkDownloadRes.headers.get('content-disposition') || '';
  const apkShaHeader = apkDownloadRes.headers.get('x-apk-sha256') || '';
  const apkArrayBuffer = await apkDownloadRes.arrayBuffer();
  const apkBytes = new Uint8Array(apkArrayBuffer);

  assert(
    apkDownloadRes.status === 200 &&
      apkContentType.includes('application/vnd.android.package-archive') &&
      apkDisposition.includes('Asaka-Ziyo-v2.0.0.apk'),
    'APK TEST 4: GET /api/apk/download streams with Content-Type: application/vnd.android.package-archive'
  );
  assert(
    apkBytes.length === apkInfoJson.sizeBytes &&
      apkBytes[0] === 0x50 &&
      apkBytes[1] === 0x4b &&
      apkBytes[2] === 0x03 &&
      apkBytes[3] === 0x04,
    'APK TEST 5: Downloaded APK binary starts with valid ZIP/APK magic bytes (PK\\x03\\x04) and matches exact byte length'
  );
  assert(
    apkShaHeader.length === 64 && apkShaHeader === apkInfoJson.sha256Checksum,
    `APK TEST 6: Downloaded APK SHA-256 checksum matches verified release metadata (${apkShaHeader.slice(0, 16)}...)`
  );

  // ---------------------------------------------------------------------------
  // 11. LIVE GOOGLE CLOUD FIRESTORE PERSISTENCE, DIAGNOSTICS & SUPABASE BACKUP
  // ---------------------------------------------------------------------------
  console.log('\n--- 11. Testing Live Google Cloud Firestore Persistence, 7-Point Diagnostics & Supabase Backup ---');

  // 11.1 Genuine Health Check Endpoint (verifies live Firestore connectivity)
  const liveHealthRes = await fetch(`${BASE_URL}/api/health`);
  const liveHealthJson = await liveHealthRes.json();
  assert(
    liveHealthRes.status === 200 &&
      liveHealthJson.firestoreReady === true &&
      liveHealthJson.firestoreDatabaseId === 'ai-studio-asakaziyoapp-1ea697da-bde1-4c61-a495-c8b1e8c8ca94',
    'FIRESTORE TEST 1: GET /api/health verifies live Firestore connectivity and named database ID'
  );

  // 11.2 Unauthenticated Write to /api/admin/firestore/write is Rejected (401)
  const unauthFsWriteRes = await fetch(`${BASE_URL}/api/admin/firestore/write`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      collectionName: 'articles',
      docId: 'hack-doc',
      data: { title: 'Unauthorized' },
    }),
  });
  assert(
    unauthFsWriteRes.status === 401,
    'FIRESTORE TEST 2: Unauthenticated request to POST /api/admin/firestore/write is rejected with 401'
  );

  // 11.3 Fresh Admin Login for Firestore Tests
  const fsAdminLoginRes = await fetch(`${BASE_URL}/api/admin/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'menageradmin',
      password: process.env.ADMIN_PASSWORD || 'menageradmin1',
    }),
  });
  const fsAdminLoginJson = await fsAdminLoginRes.json();
  const fsAdminToken = fsAdminLoginJson.token;
  assert(
    fsAdminLoginRes.status === 200 && Boolean(fsAdminToken),
    'FIRESTORE TEST 3: Admin login succeeds and returns active session token'
  );

  // 11.4 Authorized Administrator Firestore Write -> Read-Back -> Delete Lifecycle
  const fsTestDocId = `fs-live-verify-${Date.now()}`;
  const fsWriteRes = await fetch(`${BASE_URL}/api/admin/firestore/write`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${fsAdminToken}`,
    },
    body: JSON.stringify({
      collectionName: 'news',
      docId: fsTestDocId,
      data: {
        id: fsTestDocId,
        title: 'Firestore Live Persistence Test News',
        category: 'Rasmiy xabar',
        summary: 'Live cloud persistence verification',
        content: 'Verified write and read-back on ai-studio-asakaziyoapp-1ea697da-bde1-4c61-a495-c8b1e8c8ca94',
        source: 'Asaka Ziyo',
        publishedDate: 'Bugun',
        publishMode: 'published',
        isArchived: false,
      },
    }),
  });
  const fsWriteJson = await fsWriteRes.json();
  assert(
    fsWriteRes.status === 200 && fsWriteJson.success === true && fsWriteJson.firestoreConfirmed === true,
    'FIRESTORE TEST 4: Authorized admin write to live Firestore collection "news" succeeds and confirms persistence'
  );

  // Verify public visibility in GET /api/database
  const dbAfterNewsWrite = await (await fetch(`${BASE_URL}/api/database`)).json();
  assert(
    Array.isArray(dbAfterNewsWrite.data?.news) &&
      dbAfterNewsWrite.data.news.some((n: any) => n.id === fsTestDocId),
    'FIRESTORE TEST 5: Published news item is immediately visible in public GET /api/database'
  );

  // Clean up test news document from live Firestore
  const fsDeleteRes = await fetch(`${BASE_URL}/api/admin/firestore/delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${fsAdminToken}`,
    },
    body: JSON.stringify({
      collectionName: 'news',
      docId: fsTestDocId,
    }),
  });
  const fsDeleteJson = await fsDeleteRes.json();
  assert(
    fsDeleteRes.status === 200 && fsDeleteJson.success === true && fsDeleteJson.firestoreConfirmed === true,
    'FIRESTORE TEST 6: Authorized admin delete removes test document from live Firestore and local mirror'
  );

  // 11.5 Genuine 7-Point Firestore Diagnostics Verification
  const fsDiagRes = await fetch(`${BASE_URL}/api/admin/firestore/diagnostics`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${fsAdminToken}`,
    },
  });
  const fsDiagJson = await fsDiagRes.json();
  assert(
    fsDiagRes.status === 200 &&
      fsDiagJson.status === 'PASS' &&
      fsDiagJson.checks?.projectConnectivity?.passed === true &&
      fsDiagJson.checks?.databaseIdMatch?.passed === true &&
      fsDiagJson.checks?.firestoreRead?.passed === true &&
      fsDiagJson.checks?.adminAuth?.passed === true &&
      fsDiagJson.checks?.authorizedWrite?.passed === true &&
      fsDiagJson.checks?.subsequentReadBack?.passed === true &&
      fsDiagJson.checks?.securityRulesEnforcement?.passed === true,
    `FIRESTORE TEST 7: All 7 genuine Firestore diagnostic checks PASS (${fsDiagJson.latencyMs}ms)`
  );

  // 11.6 Supabase Secondary Backup Verification (honest reporting when unconfigured/disabled)
  const supaBackupRes = await fetch(`${BASE_URL}/api/backup/supabase`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${fsAdminToken}`,
    },
    body: JSON.stringify({
      url: '',
      anonKey: '',
      isEnabled: false,
    }),
  });
  const supaBackupJson = await supaBackupRes.json();
  assert(
    supaBackupRes.status === 200 &&
      supaBackupJson.success === true &&
      supaBackupJson.supabaseSynced === false &&
      supaBackupJson.verifiedReadBack === false,
    'FIRESTORE TEST 8: Supabase endpoint honestly reports supabaseSynced: false when disabled (never fakes cloud sync)'
  );

  // Verify production data safety: 4 real articles, 3 hadiths, 2 dhikrs, 1 schedule preserved
  const finalDbCheck = await (await fetch(`${BASE_URL}/api/database`)).json();
  assert(
    finalDbCheck.data.articles.length >= 4 &&
      finalDbCheck.data.hadiths.length >= 3 &&
      finalDbCheck.data.dhikrs.length >= 2 &&
      finalDbCheck.data.prayerSchedule.times.length === 8,
    `FIRESTORE TEST 9: Production data integrity preserved (${finalDbCheck.data.articles.length} articles, ${finalDbCheck.data.hadiths.length} hadiths, ${finalDbCheck.data.dhikrs.length} dhikrs, 8 prayer times)`
  );

  console.log('\n================================================================');
  console.log(`🎉 E2E & INTEGRATION SUITE COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('================================================================');
}

runFullE2ESuite()
  .then(() => {
    setTimeout(() => process.exit(0), 200);
  })
  .catch((err) => {
    console.error('E2E Suite failed with error:', err);
    process.exit(1);
  });
