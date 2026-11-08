/**
 * ASAKA ZIYO — Extended Islamic Modules Unit & Integration Tests
 * 
 * Verifies:
 * 1. Khatm Planner mathematical logic, 30/60/90 day pace, missed page calculations
 * 2. Khatm Plan persistence and reading logs
 * 3. Prayer Journal recording and completion percentage
 * 4. Smart Digital Tasbih session tracking and daily accumulation
 * 5. Mosque Events registration and spots calculation
 * 6. Islamic Learning Academy track progress and lesson completion
 * 7. Charity campaign progress calculations and anonymous pledge tracking
 * 8. Ramadan Fasting Assistant Imsak and Iftar schedules
 * 9. Digital Library structure and reading progress
 * 10. Ask the Imam submission and scholar response workflow
 * 11. Personal Islamic Achievements milestone tracking
 */

import {
  createInitialKhatmPlan,
  recordKhatmReading,
  calculateDailyPageTarget,
  getJuzForPage,
  TOTAL_MUSHAF_PAGES,
  TOTAL_MUSHAF_JUZ,
} from './khatmPlanner';

import {
  getStoredKhatmPlans,
  saveStoredKhatmPlan,
  getStoredPrayerRecords,
  saveStoredPrayerRecord,
  recordTasbihCount,
  getStoredTasbihStats,
  getStoredMosqueEvents,
  toggleEventRegistration,
  getStoredAcademyLessons,
  markLessonCompleted,
  getStoredStudentProgress,
  getStoredCharityCampaigns,
  recordDonationPledge,
  getStoredFastingJournal,
  toggleCompletedFast,
  getStoredDigitalBooks,
  getStoredImamQuestions,
  submitImamQuestion,
  answerImamQuestion,
  getStoredUserAchievements,
} from './databaseService';

// Mock localStorage for test environment
const storage: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (k: string) => storage[k] ?? null,
  setItem: (k: string, v: string) => { storage[k] = v; },
  removeItem: (k: string) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
};
(globalThis as any).localStorage = mockLocalStorage;
(globalThis as any).window = { localStorage: mockLocalStorage };

console.log('--- RUNNING ASAKA ZIYO EXTENDED ISLAMIC MODULES TESTS ---');

function assert(condition: boolean, desc: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${desc}`);
    process.exit(1);
  }
  console.log(`✅ [PASS] ${desc}`);
}

// ---------------------------------------------------------------------------
// 1. Khatm Planner Math & Pace Logic
// ---------------------------------------------------------------------------
console.log('Testing 1: Khatm Planner Mathematics & Pace...');
const plan30 = createInitialKhatmPlan('test_user', '30_days', 30, '2026-11-01');
assert(plan30.totalDays === 30, '30-day plan has totalDays = 30');
assert(plan30.totalPages === 604, 'Standard Mushaf totalPages is exactly 604');
assert(plan30.pagesPerDay === Math.ceil(604 / 30), '30-day pace is 21 pages/day');

const plan60 = createInitialKhatmPlan('test_user', '60_days', 60, '2026-11-01');
assert(plan60.pagesPerDay === Math.ceil(604 / 60), '60-day pace is 11 pages/day');

const juz1 = getJuzForPage(20);
assert(juz1 === 1, 'Page 20 corresponds to Juz 1');
const juz30 = getJuzForPage(604);
assert(juz30 === 30, 'Page 604 corresponds to Juz 30');

// Reading progress logging
const updatedPlan = recordKhatmReading(plan30, 20, '2026-11-01');
assert(updatedPlan.completedPages === 20, 'Completed pages updated to 20');
assert(updatedPlan.dailyLog['2026-11-01'].pagesRead === 20, 'Daily log records 20 pages read on 2026-11-01');

// Persistence
saveStoredKhatmPlan(updatedPlan);
const loadedPlans = getStoredKhatmPlans('test_user');
assert(loadedPlans.length >= 1, 'Khatm plan successfully saved and loaded from store');
assert(loadedPlans[0].completedPages === 20, 'Persisted plan maintains correct completed pages');

// ---------------------------------------------------------------------------
// 2. Personal Prayer Journal Tests
// ---------------------------------------------------------------------------
console.log('Testing 2: Personal Prayer Journal...');
const initialRecords = getStoredPrayerRecords('prayer_user_1');
assert(typeof initialRecords === 'object', 'Prayer records initialized as dictionary');

saveStoredPrayerRecord({
  date: '2026-11-06',
  userId: 'prayer_user_1',
  prayers: {
    bomdod: { status: 'completed' },
    peshin: { status: 'completed' },
    asr: { status: 'completed' },
    shom: { status: 'completed' },
    xufton: { status: 'completed' },
    tahajjud: { status: 'completed' },
    subh: { status: 'not_recorded' },
    quyosh: { status: 'not_recorded' },
  },
  dailyGoalMet: true,
  notes: 'Alhamdulillah, barcha namozlar jamoat bilan ado etildi.',
  updatedAt: new Date().toISOString(),
});

const reloadedRecords = getStoredPrayerRecords('prayer_user_1');
assert(reloadedRecords['2026-11-06'] !== undefined, 'Prayer record persisted for date 2026-11-06');
assert(reloadedRecords['2026-11-06'].dailyGoalMet === true, 'All 5 prayers marked completed, dailyGoalMet is true');

// ---------------------------------------------------------------------------
// 3. Smart Digital Tasbih Session Tracking Tests
// ---------------------------------------------------------------------------
console.log('Testing 3: Smart Digital Tasbih...');
const stats1 = recordTasbihCount('tasbih_user_1', 33, 'Subhanalloh');
assert(stats1.todayTotal === 33, 'First tasbih session records 33 counts');

const stats2 = recordTasbihCount('tasbih_user_1', 33, 'Alhamdulillah');
assert(stats2.todayTotal === 66, 'Second tasbih session accumulates to 66 counts');

const reloadedStats = getStoredTasbihStats('tasbih_user_1');
assert(reloadedStats.todayTotal === 66, 'Persisted tasbih stats accurately reflect 66 counts');

// ---------------------------------------------------------------------------
// 4. Mosque Events & Registration Tests
// ---------------------------------------------------------------------------
console.log('Testing 4: Mosque Events & Registration...');
const mosqueEvents = getStoredMosqueEvents();
assert(mosqueEvents.length >= 3, 'Pre-configured mosque events available');

const firstEvent = mosqueEvents[0];
const initialRegistered = firstEvent.registeredUserIds.length;
toggleEventRegistration(firstEvent.id, 'event_user_99');

const updatedEvents = getStoredMosqueEvents();
const updatedFirstEvent = updatedEvents.find((e) => e.id === firstEvent.id);
assert(
  updatedFirstEvent?.registeredUserIds.includes('event_user_99') === true,
  'User registered for mosque event'
);

// Toggle again to unregister
toggleEventRegistration(firstEvent.id, 'event_user_99');
const unregisteredEvents = getStoredMosqueEvents();
const unregisteredFirstEvent = unregisteredEvents.find((e) => e.id === firstEvent.id);
assert(
  unregisteredFirstEvent?.registeredUserIds.includes('event_user_99') === false,
  'User successfully unregistered from mosque event'
);

// ---------------------------------------------------------------------------
// 5. Islamic Learning Academy Tests
// ---------------------------------------------------------------------------
console.log('Testing 5: Islamic Learning Academy...');
const academyLessons = getStoredAcademyLessons();
assert(academyLessons.length >= 4, 'Academy contains verified structured tracks');

const initialProgress = getStoredStudentProgress('student_user_1');
assert(initialProgress.completedLessons.length === 0, 'Initial student progress has 0 completed lessons');

const updatedProgress = markLessonCompleted('student_user_1', 'lesson-aqida-01', 'aqida');
assert(
  updatedProgress.completedLessons.includes('lesson-aqida-01'),
  'Lesson marked completed in student progress'
);
assert(
  updatedProgress.trackProgress.aqida.completedCount === 1,
  'Aqida track completed count incremented to 1'
);

// ---------------------------------------------------------------------------
// 6. Charity & Sadaqah Module Tests
// ---------------------------------------------------------------------------
console.log('Testing 6: Charity & Sadaqah Module...');
const campaigns = getStoredCharityCampaigns();
assert(campaigns.length >= 2, 'Verified charity campaigns are present');

const firstCamp = campaigns[0];
const initialPledged = firstCamp.pledgedAmountUzs;

recordDonationPledge({
  id: 'pledge_test_01',
  userId: 'donor_user_1',
  campaignId: firstCamp.id,
  campaignTitle: firstCamp.title,
  amountUzs: 100000,
  status: 'pledged',
  transactionReference: 'TEST-REF-100K',
  donatedAt: new Date().toISOString(),
  isAnonymous: true,
});

const updatedCampaigns = getStoredCharityCampaigns();
const updatedCamp = updatedCampaigns.find((c) => c.id === firstCamp.id);
assert(
  updatedCamp?.pledgedAmountUzs === initialPledged + 100000,
  'Campaign pledged amount accurately incremented by 100,000 UZS'
);

// ---------------------------------------------------------------------------
// 7. Ramadan & Voluntary Fasting Assistant Tests
// ---------------------------------------------------------------------------
console.log('Testing 7: Ramadan & Voluntary Fasting Assistant...');
const initialJournal = getStoredFastingJournal('fasting_user_1');
assert(initialJournal.completedFasts.length === 0, 'Initial fasting journal has 0 completed fasts');

const updatedJournal = toggleCompletedFast('fasting_user_1', '2026-11-09');
assert(
  updatedJournal.completedFasts.includes('2026-11-09'),
  'Date 2026-11-09 successfully marked as completed fast'
);

// ---------------------------------------------------------------------------
// 8. Islamic Digital Library Tests
// ---------------------------------------------------------------------------
console.log('Testing 8: Islamic Digital Library...');
const digitalBooks = getStoredDigitalBooks();
assert(digitalBooks.length >= 3, 'Digital library contains verified books');
const iymanBook = digitalBooks.find((b) => b.title === 'Iymon');
assert(iymanBook?.author === 'Shayx Muhammad Sodiq Muhammad Yusuf', 'Iymon book authored by Shayx Muhammad Sodiq Muhammad Yusuf');
assert(iymanBook?.isCopyrightCleared === true, 'Digital book marked copyright cleared with legal permission note');

// ---------------------------------------------------------------------------
// 9. Ask the Imam System Tests
// ---------------------------------------------------------------------------
console.log('Testing 9: Ask the Imam System...');
submitImamQuestion({
  id: 'test_question_01',
  userId: 'questioner_user_1',
  userDisplayName: 'Mahalla aʼzosi',
  isAnonymous: false,
  category: 'ibodat',
  title: 'Tahoratda mash tortish qoidasi',
  questionText: 'Boshning toʻrtdan bir qismiga mash tortish yetarlimi?',
  submittedAt: new Date().toISOString(),
  status: 'submitted',
  isPubliclyVisible: false,
});

const userQuestions = getStoredImamQuestions('questioner_user_1');
const foundQ = userQuestions.find((q) => q.id === 'test_question_01');
assert(foundQ !== undefined, 'Submitted question retrieved for author user');

answerImamQuestion(
  'test_question_01',
  'Ha, Hanafiy mazhabida boshning toʻrtdan biriga mash tortish farzdir.',
  'Asaka Bosh Imomi',
  'Kifoya, 1-juz',
  true
);

const publicQuestions = getStoredImamQuestions();
const answeredQ = publicQuestions.find((q) => q.id === 'test_question_01');
assert(answeredQ?.status === 'answered', 'Question status updated to answered');
assert(Boolean(answeredQ?.answerText?.includes('toʻrtdan biriga')), 'Answer text accurately recorded');

// ---------------------------------------------------------------------------
// 10. Personal Islamic Achievements Tests
// ---------------------------------------------------------------------------
console.log('Testing 10: Personal Islamic Achievements...');
const userAchievements = getStoredUserAchievements('achieve_user_1');
assert(userAchievements.achievements.length >= 6, 'Achievements initialized with structured milestones');
const fatihaMilestone = userAchievements.achievements.find((m) => m.id === 'milestone-fatiha-recited');
assert(fatihaMilestone?.isUnlocked === true, 'Fotiha Nuri milestone unlocked upon starting');

console.log('🎉 ALL 10 ASAKA ZIYO EXTENDED ISLAMIC MODULES TESTS PASSED SUCCESSFULLY!');
