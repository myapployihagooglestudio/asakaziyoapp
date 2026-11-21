/**
 * ASAKA ZIYO HIFZ — Domain Types for Professional Quran Memorization & Lifelong Murojaa Platform
 *
 * Covers:
 * - Full 114-surah, 30-juz, 6,236-ayah user memorization profile
 * - Exact partial ayah-range tracking (partial surahs NEVER count as complete)
 * - Adaptive Spaced Repetition + Active Recall + Interleaved + Error-Based + Cumulative Review
 * - Daily automated Murojaa & New Memorization planning (Asia/Tashkent)
 * - Lifelong 30-Juz Maintenance Rotation after verified full Hifz
 * - AI Hifz Coach & Audio Recitation Check (honest STT comparison)
 * - Per-user Firestore persistence (`telegramHifzProfiles/hifz_<telegramId>`)
 */

export type HifzReviewQuality = 1 | 2 | 3 | 4 | 5;
// 1 = Juda yaxshi (flawless recall)
// 2 = Yaxshi (minor hesitation)
// 3 = O'rtacha (forgot some parts)
// 4 = Qiyin (many mistakes)
// 5 = Qayta yodlash kerak (needs re-memorization)

export type HifzItemStage =
  | 'new_memorization'
  | 'consolidation'
  | 'spaced_review'
  | 'mastered'
  | 'relearning';

export interface HifzAyahRange {
  startAyah: number;
  endAyah: number;
}

export interface HifzSurahProgress {
  surahNumber: number; // 1..114
  memorizedRanges: HifzAyahRange[]; // merged non-overlapping ranges within 1..numberOfAyahs
  memorizedAyahCount: number;
  totalAyahCount: number;
  isComplete: boolean; // strictly memorizedAyahCount === totalAyahCount
  strengthScore: number; // 0..100 (based on real review outcomes, not just checkmarks)
  stage: HifzItemStage;
  intervalDays: number; // adaptive spaced-repetition interval
  easeFactor: number; // 1.3..2.8 (SM-2 inspired adaptive multiplier)
  repetitions: number;
  reviewCount: number;
  lapseCount: number;
  lastReviewedAt?: string;
  nextReviewDate?: string; // YYYY-MM-DD (Asia/Tashkent)
  memorizedAt?: string;
  teacherVerified?: boolean;
}

export interface HifzDifficultAyah {
  id: string; // e.g. "2:255"
  surahNumber: number;
  ayahNumber: number;
  note?: string;
  errorCount: number;
  resolved: boolean;
  lastErrorAt: string;
  nextDrillDate: string; // YYYY-MM-DD
}

export interface HifzReviewHistoryEntry {
  id: string;
  dateKey: string; // YYYY-MM-DD (Asia/Tashkent)
  surahNumber: number;
  startAyah: number;
  endAyah: number;
  taskType: 'new_memorization' | 'spaced_review' | 'error_drill' | 'cumulative' | 'lifelong_juz';
  quality: HifzReviewQuality;
  durationMinutes: number;
  previousIntervalDays: number;
  newIntervalDays: number;
  createdAt: string;
}

export interface HifzDailyTask {
  id: string;
  taskType: 'error_drill' | 'new_memorization' | 'spaced_review' | 'cumulative' | 'lifelong_juz';
  surahNumber: number;
  juzNumber: number;
  startAyah: number;
  endAyah: number;
  pageStart: number;
  pageEnd: number;
  estimatedMinutes: number;
  priority: number;
  reasonKey: string;
  completed: boolean;
  completedAt?: string;
  quality?: HifzReviewQuality;
}

export interface HifzDailyPlan {
  dateKey: string; // YYYY-MM-DD (Asia/Tashkent)
  generatedAt: string;
  isLifelongMode: boolean;
  totalEstimatedMinutes: number;
  completedTaskCount: number;
  tasks: HifzDailyTask[];
  carriedOverCount: number;
}

export interface HifzReminderSettings {
  morningEnabled: boolean;
  morningTime: string; // HH:MM (Asia/Tashkent), default "06:30"
  middayEnabled: boolean;
  middayTime: string; // HH:MM, default "13:30"
  eveningEnabled: boolean;
  eveningTime: string; // HH:MM, default "20:30"
  newMemorizationReminderEnabled: boolean;
  dueReviewAlertEnabled: boolean;
  quietHoursStart?: string; // e.g. "22:30"
  quietHoursEnd?: string; // e.g. "05:00"
  lastDispatchedSlots?: Record<string, string>; // slotKey -> YYYY-MM-DD
}

export interface HifzLifelongConfig {
  active: boolean; // true ONLY when all 30 juzs (6,236 ayahs) are verified memorized
  unlockedAt?: string;
  dailyJuzTarget: number; // e.g. 1, 2, 3 (or fractional like 0.5 / 1.5)
  currentJuzCursor: number; // 1..30
  juzLastReviewedDate: Record<string, string>; // "1".."30" -> YYYY-MM-DD
  juzStrength: Record<string, number>; // "1".."30" -> 0..100
  completedFullCycles: number;
}

export interface HifzAchievement {
  id: string;
  code: string;
  earnedAt: string;
}

export interface HifzGroupPlan {
  groupName: string;
  weeklyAyahTarget: number;
  joinedAt: string;
}

export interface TelegramHifzProfile {
  id: string; // hifz_<telegramId>
  telegramId: string;
  startSurahNumber: number; // e.g. 114 (Juz Amma) or 1 (Al-Fatiha)
  startDirection: 'juz_amma_first' | 'beginning_first' | 'custom';
  dailyNewAyahsGoal: number; // e.g. 5
  dailyReviewMinutesGoal: number; // e.g. 25
  preferredReciterId: string; // from QURAN_RECITERS
  surahs: Record<string, HifzSurahProgress>; // keyed by String(surahNumber)
  difficultAyahs: HifzDifficultAyah[];
  reviewHistory: HifzReviewHistoryEntry[]; // bounded latest 250 entries
  currentDailyPlan?: HifzDailyPlan | null;
  reminders: HifzReminderSettings;
  lifelong: HifzLifelongConfig;
  streakDays: number;
  longestStreakDays: number;
  lastActiveDateKey?: string;
  weeklyGoalAyahs: number;
  achievements: HifzAchievement[];
  groupPlan?: HifzGroupPlan | null;
  createdAt: string;
  updatedAt: string;
}

export interface HifzStatsSummary {
  totalSurahsInQuran: 114;
  totalJuzsInQuran: 30;
  totalAyahsInQuran: number; // 6236
  completedSurahsCount: number;
  partialSurahsCount: number;
  memorizedAyahsCount: number;
  remainingAyahsCount: number;
  memorizedPercent: number;
  completedJuzsCount: number;
  partialJuzsCount: number;
  masteredSurahsCount: number;
  difficultAyahsCount: number;
  todayCompletedTasks: number;
  todayTotalTasks: number;
  weeklyReviewsCount: number;
  monthlyReviewsCount: number;
  reviewSuccessRatePercent: number;
  streakDays: number;
  isFullHifz: boolean;
}

export interface HifzAudioCheckResult {
  ok: boolean;
  surahNumber: number;
  startAyah: number;
  endAyah: number;
  transcript?: string;
  expectedSnippet?: string;
  matchedWordRatio?: number; // 0..1
  potentiallyMissingWords: string[];
  potentiallySubstitutedWords: string[];
  hasVerifiedArabicReference: boolean;
  disclaimerApplied: true;
  error?: string;
}
