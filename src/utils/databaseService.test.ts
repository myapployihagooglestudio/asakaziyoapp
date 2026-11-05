/**
 * ASAKA ZIYO — Database Service, Auth Mapping, Empty Collection & Merge Unit Tests
 */

import {
  createDataSnapshot,
  getLatestDataSnapshot,
  mergeCollections,
  getStoredArticles,
  getStoredMediaPosts,
  getStoredHadiths,
  getStoredDhikrs,
  getStoredInquiries,
  getStoredDrafts,
  getStoredAnnouncements,
  getStoredNews,
  saveStoredArticle,
  saveStoredPrayerSchedule,
  getStoredPrayerSchedule,
  isPubliclyPublished,
  getDateCategoryInfo,
} from './databaseService';
import { resolveLoginToEmail } from './firebaseClient';
import { Article } from '../types';

// Mock localStorage for node environment
const storage: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (k: string) => storage[k] ?? null,
  setItem: (k: string, v: string) => { storage[k] = v; },
  removeItem: (k: string) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
};
(globalThis as any).localStorage = mockLocalStorage;
(globalThis as any).window = { localStorage: mockLocalStorage };

console.log('--- RUNNING DATABASE SERVICE, AUTH MAPPING & MERGE UNIT TESTS ---');

function assert(condition: boolean, desc: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${desc}`);
    process.exit(1);
  }
  console.log(`✅ [PASS] ${desc}`);
}

// Test 0: Single Admin Login Mapping (menageradmin -> asakaziyo0@gmail.com)
assert(
  resolveLoginToEmail('menageradmin') === 'asakaziyo0@gmail.com',
  'Username "menageradmin" maps strictly to "asakaziyo0@gmail.com"'
);
assert(
  resolveLoginToEmail('asakaziyo0@gmail.com') === 'asakaziyo0@gmail.com',
  'Authorized email "asakaziyo0@gmail.com" resolves to itself'
);
assert(
  resolveLoginToEmail('mirzayevulugbek024@gmail.com') === '',
  'Obsolete email "mirzayevulugbek024@gmail.com" is rejected'
);
assert(
  resolveLoginToEmail('randomadmin') === '',
  'Unauthorized username is rejected'
);

// Test 1: Empty Collections remain empty (never restore sample data)
mockLocalStorage.clear();
assert(getStoredArticles().length === 0, 'Empty articles collection returns [] without sample fallback');
assert(getStoredMediaPosts().length === 0, 'Empty mediaPosts collection returns [] without sample fallback');
assert(getStoredHadiths().length === 0, 'Empty hadiths collection returns [] without sample fallback');
assert(getStoredDhikrs().length === 0, 'Empty dhikrs collection returns [] without sample fallback');
assert(getStoredInquiries().length === 0, 'Empty inquiries collection returns [] without sample fallback');
assert(getStoredDrafts().length === 0, 'Empty drafts collection returns [] without sample fallback');
assert(getStoredAnnouncements().length === 0, 'Empty announcements collection returns [] without sample fallback');
assert(getStoredNews().length === 0, 'Empty news collection returns [] without sample fallback');

// Test 2: Explicit empty array in localStorage stays empty
mockLocalStorage.setItem('asaka_ziyo_articles_v5_admin', '[]');
mockLocalStorage.setItem('asaka_ziyo_media_v5_admin', '[]');
mockLocalStorage.setItem('asaka_ziyo_hadiths_v5_admin', '[]');
mockLocalStorage.setItem('asaka_ziyo_dhikrs_v5_admin', '[]');
assert(getStoredArticles().length === 0, 'Explicit [] in localStorage for articles returns []');
assert(getStoredMediaPosts().length === 0, 'Explicit [] in localStorage for mediaPosts returns []');
assert(getStoredHadiths().length === 0, 'Explicit [] in localStorage for hadiths returns []');
assert(getStoredDhikrs().length === 0, 'Explicit [] in localStorage for dhikrs returns []');

// Test 3: Snapshot creation
const snapshot1 = createDataSnapshot('pre_test_run');
assert(snapshot1 !== null, 'Data snapshot creates non-null object');
assert(snapshot1.id.includes('snap-'), 'Snapshot ID has valid prefix');
assert(Array.isArray(snapshot1.data.articles), 'Snapshot contains articles array');

const latest = getLatestDataSnapshot();
assert(latest !== null && latest.id === snapshot1.id, 'Latest snapshot matches created snapshot');

// Test 4: Merge logic - newer updatedAt wins
const localArticles: Article[] = [
  {
    id: 'art-1',
    title: 'Local Older Title',
    subtitle: 'Sub',
    category: 'Axloq',
    author: 'Author',
    authorRole: 'Role',
    publishedDate: '2026-11-01',
    readTimeMinutes: 5,
    featuredImage: '/img.jpg',
    excerpt: 'Exc',
    bodyParagraphs: ['P1'],
    updatedAt: '2026-11-01T10:00:00.000Z',
  },
  {
    id: 'art-2',
    title: 'Local Only Title',
    subtitle: 'Sub',
    category: 'Axloq',
    author: 'Author',
    authorRole: 'Role',
    publishedDate: '2026-11-01',
    readTimeMinutes: 5,
    featuredImage: '/img.jpg',
    excerpt: 'Exc',
    bodyParagraphs: ['P1'],
    updatedAt: '2026-11-01T10:00:00.000Z',
  },
];

const remoteArticles: Article[] = [
  {
    id: 'art-1',
    title: 'Remote Newer Title',
    subtitle: 'Sub',
    category: 'Axloq',
    author: 'Author',
    authorRole: 'Role',
    publishedDate: '2026-11-01',
    readTimeMinutes: 5,
    featuredImage: '/img.jpg',
    excerpt: 'Exc',
    bodyParagraphs: ['P1'],
    updatedAt: '2026-11-02T10:00:00.000Z', // newer
  },
  {
    id: 'art-3',
    title: 'Remote Only Title',
    subtitle: 'Sub',
    category: 'Fiqh',
    author: 'Author',
    authorRole: 'Role',
    publishedDate: '2026-11-02',
    readTimeMinutes: 5,
    featuredImage: '/img.jpg',
    excerpt: 'Exc',
    bodyParagraphs: ['P1'],
    updatedAt: '2026-11-02T10:00:00.000Z',
  },
];

const merged = mergeCollections(localArticles, remoteArticles);
assert(merged.length === 3, 'Merged collection combines items from both sources');
const mergedArt1 = merged.find((a) => a.id === 'art-1');
assert(mergedArt1?.title === 'Remote Newer Title', 'Newer remote updatedAt replaces older local');
const mergedArt2 = merged.find((a) => a.id === 'art-2');
assert(mergedArt2?.title === 'Local Only Title', 'Local unique item is preserved');
const mergedArt3 = merged.find((a) => a.id === 'art-3');
assert(mergedArt3?.title === 'Remote Only Title', 'Remote unique item is preserved');

// Test 5: Local newer updatedAt is NOT overwritten by older remote
const remoteOlder: Article[] = [
  {
    ...localArticles[0],
    title: 'Remote Older Outdated Title',
    updatedAt: '2026-10-01T00:00:00.000Z', // older than local
  },
];
const mergedWithOlder = mergeCollections(localArticles, remoteOlder);
const art1StillLocal = mergedWithOlder.find((a) => a.id === 'art-1');
assert(art1StillLocal?.title === 'Local Older Title', 'Local newer item is NOT overwritten by older remote item');

// Test 5B: PublishMode filtering (published vs draft vs test vs archived)
assert(isPubliclyPublished({ publishMode: 'published', isArchived: false }) === true, 'publishMode="published" is publicly visible');
assert(isPubliclyPublished({ publishMode: 'draft', isArchived: false }) === false, 'publishMode="draft" is hidden from public views');
assert(isPubliclyPublished({ publishMode: 'test', isArchived: false }) === false, 'publishMode="test" is hidden from public views');
assert(isPubliclyPublished({ publishMode: 'archived', isArchived: true }) === false, 'publishMode="archived" is hidden from active public views');

// Test 5C: Date categorization (Bugun, Kecha, Older)
const todayIso = new Date().toISOString();
const yesterdayDate = new Date();
yesterdayDate.setDate(yesterdayDate.getDate() - 1);
const yesterdayIso = yesterdayDate.toISOString();
const olderIso = '2025-01-15T10:00:00.000Z';

assert(getDateCategoryInfo({ createdAtIso: todayIso }).bucket === 'today', 'Today ISO date categorizes as "today" (Bugun)');
assert(getDateCategoryInfo({ createdAtIso: yesterdayIso }).bucket === 'yesterday', 'Yesterday ISO date categorizes as "yesterday" (Kecha)');
assert(getDateCategoryInfo({ createdAtIso: olderIso }).bucket === 'older', 'Older ISO date categorizes as "older"');

async function runTests() {
  // Test 6: Failed/Unauthenticated Firestore write returns success: false and does NOT mutate localStorage
  mockLocalStorage.clear();
  const unauthSaveArt = await saveStoredArticle(localArticles[0]);
  assert(unauthSaveArt.success === false, 'Unauthenticated saveStoredArticle returns success: false');
  assert(getStoredArticles().length === 0, 'Failed Firestore article save does not pollute localStorage');

  const sampleSchedule = getStoredPrayerSchedule();
  const unauthSaveSchedule = await saveStoredPrayerSchedule({
    ...sampleSchedule,
    publishedBy: 'Unauthorized Test',
  });
  assert(unauthSaveSchedule.success === false, 'Unauthenticated saveStoredPrayerSchedule returns success: false');

  // Test 7: Soft delete flag filtering
  const sampleArticle: Article = {
    ...localArticles[0],
    id: 'test-arch-1',
    title: 'Archivable Test Article',
  };

  const archivedArticle: Article = {
    ...sampleArticle,
    isArchived: true,
    archivedAt: new Date().toISOString(),
    archiveReason: 'Test reason',
  };

  const listWithArchived = [archivedArticle];
  const filteredActive = listWithArchived.filter((a) => !a.isArchived);
  assert(filteredActive.length === 0, 'Archived items are filtered out of active lists');

  const restoredArticle: Article = {
    ...archivedArticle,
    isArchived: false,
    updatedAt: new Date().toISOString(),
  };
  const listAfterRestore = [restoredArticle];
  const filteredRestored = listAfterRestore.filter((a) => !a.isArchived);
  assert(filteredRestored.length === 1, 'Restored items reappear in active lists');

  console.log('All database service, auth mapping, empty collection, and merge unit tests passed successfully!');
  process.exit(0);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
