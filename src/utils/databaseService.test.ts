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
  toggleContentLike,
  isContentLiked,
  getAnalyticsSummary,
  getOrCreateDailyQuizForDate,
  fetchAllDailyQuizzesArchive,
  saveStoredQuizAttempt,
  getStoredQuizAttempts,
} from './databaseService';
import {
  generateDeterministicDailyQuiz,
  isQuestionPublishable,
  VERIFIED_QUIZ_BANK,
  QuizQuestionItem,
} from '../data/quizQuestionsData';
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

  // Test 8: Engagement Tracking & Analytics Summary
  mockLocalStorage.clear();
  const testArt: Article = {
    id: 'engage-art-1',
    title: 'Engagement Test Article',
    subtitle: 'Sub',
    category: 'Fiqh',
    author: 'Author',
    authorRole: 'Role',
    publishedDate: '2026-11-05',
    readTimeMinutes: 3,
    featuredImage: '/img.jpg',
    excerpt: 'Exc',
    bodyParagraphs: ['P1'],
    likesCount: 0,
    publishMode: 'published',
    isArchived: false,
  };
  mockLocalStorage.setItem('asaka_ziyo_db_articles_v5_admin', JSON.stringify([testArt]));

  const likeRes1 = await toggleContentLike('articles', 'engage-art-1');
  assert(likeRes1.liked === true, 'First like toggle sets liked=true');
  assert(likeRes1.likesCount === 1, 'Likes count increments to 1');

  const likedCheck = await isContentLiked('articles', 'engage-art-1');
  assert(likedCheck === true, 'isContentLiked returns true after liking');

  // Second toggle (unlike)
  const likeRes2 = await toggleContentLike('articles', 'engage-art-1');
  assert(likeRes2.liked === false, 'Second like toggle sets liked=false (unlike)');
  assert(likeRes2.likesCount === 0, 'Likes count decrements back to 0');

  const analyticsSummary = await getAnalyticsSummary('7d');
  assert(typeof analyticsSummary.totalRegisteredUsers === 'number', 'Analytics summary returns totalRegisteredUsers');
  assert(typeof analyticsSummary.totalViews === 'number', 'Analytics summary returns totalViews');
  assert(Array.isArray(analyticsSummary.viewsByDate), 'Analytics summary returns viewsByDate array');

  // Test 9: Daily Islamic Quiz — 10 unique verified questions, no duplicates
  mockLocalStorage.clear();
  const daily10 = generateDeterministicDailyQuiz('2026-11-05');
  assert(daily10.questions.length === 10, 'generateDeterministicDailyQuiz selects exactly 10 questions');
  assert(
    new Set(daily10.questions.map((q) => q.id)).size === 10,
    'generateDeterministicDailyQuiz produces 10 unique questions with no duplicates'
  );
  assert(
    daily10.questions.every((q) => isQuestionPublishable(q)),
    'All selected daily quiz questions pass isQuestionPublishable verification'
  );

  // Test 10: Unverified or rejected questions are excluded
  const unverifiedQ: QuizQuestionItem = {
    ...VERIFIED_QUIZ_BANK[0],
    id: 'unverified-q-1',
    sourceVerified: false,
  };
  const noSourceQ: QuizQuestionItem = {
    ...VERIFIED_QUIZ_BANK[0],
    id: 'nosource-q-1',
    source: '',
  };
  const rejectedQ: QuizQuestionItem = {
    ...VERIFIED_QUIZ_BANK[0],
    id: 'rejected-q-1',
    status: 'rejected',
  };
  const unapprovedQ: QuizQuestionItem = {
    ...VERIFIED_QUIZ_BANK[0],
    id: 'unapproved-q-1',
    isApproved: false,
  };
  assert(isQuestionPublishable(unverifiedQ) === false, 'Unverified question (sourceVerified=false) is excluded');
  assert(isQuestionPublishable(noSourceQ) === false, 'Question without source is excluded');
  assert(isQuestionPublishable(rejectedQ) === false, 'Rejected question (status="rejected") is excluded');
  assert(isQuestionPublishable(unapprovedQ) === false, 'Unapproved question (isApproved=false) is excluded');

  const generatedWithBadPool = generateDeterministicDailyQuiz('2026-11-05', [
    unverifiedQ,
    noSourceQ,
    rejectedQ,
    unapprovedQ,
  ]);
  const badIds = new Set(['unverified-q-1', 'nosource-q-1', 'rejected-q-1', 'unapproved-q-1']);
  assert(
    generatedWithBadPool.questions.every((q) => !badIds.has(q.id)),
    'Unverified and rejected custom questions never appear in generated daily quiz'
  );

  // Test 11: Daily quiz does not change after page refresh (persisted in dailyQuizzes)
  mockLocalStorage.clear();
  const firstLoadSet = await getOrCreateDailyQuizForDate('2026-11-05');
  assert(firstLoadSet.questions.length === 10, 'getOrCreateDailyQuizForDate persists 10 questions');
  const firstIds = firstLoadSet.questions.map((q) => q.id).join(',');

  // Simulate adding new approved custom questions before a page refresh
  const extraApprovedQ: QuizQuestionItem = {
    ...VERIFIED_QUIZ_BANK[0],
    id: 'custom-approved-refresh-test',
    questionUz: 'Yangi tasdiqlangan savol?',
    sourceVerified: true,
    status: 'approved',
    isApproved: true,
  };
  mockLocalStorage.setItem('asaka_ziyo_quiz_questions_v1', JSON.stringify([extraApprovedQ]));

  const secondLoadSet = await getOrCreateDailyQuizForDate('2026-11-05');
  const secondIds = secondLoadSet.questions.map((q) => q.id).join(',');
  assert(
    firstIds === secondIds,
    'Daily quiz set remains identical after refresh even when new questions are added'
  );

  // Test 12: Archive records remain available & daily vs archive attempts are tracked separately
  const pastSet = await getOrCreateDailyQuizForDate('2026-11-04');
  assert(pastSet.questions.length === 10, 'Past date quiz is generated and archived');

  const archiveList = await fetchAllDailyQuizzesArchive();
  assert(archiveList.length >= 2, 'fetchAllDailyQuizzesArchive returns persisted daily quizzes');
  assert(
    archiveList.some((item) => item.dateStr === '2026-11-05') &&
      archiveList.some((item) => item.dateStr === '2026-11-04'),
    'Archive contains both 2026-11-05 and 2026-11-04 quiz sets'
  );

  await saveStoredQuizAttempt({
    id: 'att-daily-1',
    dateStr: '2026-11-05',
    score: 9,
    totalQuestions: 10,
    completedAt: new Date().toISOString(),
    completionTimeSeconds: 95,
    isArchiveAttempt: false,
  });
  await saveStoredQuizAttempt({
    id: 'att-archive-1',
    dateStr: '2026-11-04',
    score: 8,
    totalQuestions: 10,
    completedAt: new Date().toISOString(),
    completionTimeSeconds: 110,
    isArchiveAttempt: true,
  });

  const allAttempts = getStoredQuizAttempts();
  const dailyAttempts = allAttempts.filter((a) => !a.isArchiveAttempt);
  const archiveAttempts = allAttempts.filter((a) => Boolean(a.isArchiveAttempt));
  assert(dailyAttempts.length === 1 && dailyAttempts[0].score === 9, 'Daily attempt is tracked with isArchiveAttempt=false');
  assert(archiveAttempts.length === 1 && archiveAttempts[0].score === 8, 'Archive attempt is tracked separately with isArchiveAttempt=true');

  console.log('All database service, auth mapping, empty collection, and merge unit tests passed successfully!');
  process.exit(0);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
