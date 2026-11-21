/**
 * ASAKA ZIYO HIFZ — Core Quran Memorization, Spaced-Repetition & Lifelong Murojaa Service
 *
 * Strictly per-user isolated via `telegramHifzProfiles/hifz_<telegramId>`.
 * Key guarantees:
 * - Never auto-marks any ayah/surah as memorized without explicit user confirmation.
 * - Partial surahs NEVER count as complete surahs or complete juzs.
 * - Lifelong 30-Juz Maintenance Mode unlocks ONLY when all 6,236 ayahs across all 30 juzs are verified.
 * - AI Hifz Coach & Audio Recitation Check ALWAYS carry honest disclaimers (they assist memory
 *   and word recall, and NEVER replace a qualified Qur'an teacher / Qori for tajwid & makhraj).
 * - Preserves Arabic Quran script verbatim (never AI-generates Quran text).
 */

import crypto from 'crypto';
import { TelegramLocale } from '../types';
import { TelegramRepository } from '../database/telegramRepository';
import { TelegramAiEngine } from '../ai/aiEngine';
import { getTashkentDateParts } from '../services/qiblaHijriService';
import { toNewUzbekAlphabet } from '../../src/utils/newUzbekAlphabet';
import {
  HifzAchievement,
  HifzAudioCheckResult,
  HifzDailyPlan,
  HifzDifficultAyah,
  HifzGroupPlan,
  HifzReminderSettings,
  HifzReviewQuality,
  HifzStatsSummary,
  HifzSurahProgress,
  TelegramHifzProfile,
} from './hifzTypes';
import {
  JUZ_META_MAP,
  TOTAL_QURAN_AYAHS,
  TOTAL_QURAN_JUZS,
  TOTAL_QURAN_SURAHS,
  computeAllJuzProgress,
  countAyahsInRanges,
  getJuzMeta,
  getSurahMeta,
  getVerifiedArabicAyahsForRange,
  normalizeAyahRanges,
} from './quranMetadataMap';
import {
  addDaysToDateKey,
  computeNextSpacedInterval,
  diffDaysBetweenDateKeys,
  generateAdaptiveDailyPlan,
} from './hifzSpacedRepetition';

function createDefaultHifzProfile(telegramId: string): TelegramHifzProfile {
  const nowIso = new Date().toISOString();
  return {
    id: `hifz_${telegramId}`,
    telegramId,
    startSurahNumber: 114,
    startDirection: 'juz_amma_first',
    dailyNewAyahsGoal: 5,
    dailyReviewMinutesGoal: 25,
    preferredReciterId: 'mishary',
    surahs: {},
    difficultAyahs: [],
    reviewHistory: [],
    currentDailyPlan: null,
    reminders: {
      morningEnabled: true,
      morningTime: '06:30',
      middayEnabled: false,
      middayTime: '13:30',
      eveningEnabled: true,
      eveningTime: '20:30',
      newMemorizationReminderEnabled: true,
      dueReviewAlertEnabled: true,
      quietHoursStart: '22:30',
      quietHoursEnd: '05:00',
      lastDispatchedSlots: {},
    },
    lifelong: {
      active: false,
      dailyJuzTarget: 1,
      currentJuzCursor: 1,
      juzLastReviewedDate: {},
      juzStrength: {},
      completedFullCycles: 0,
    },
    streakDays: 0,
    longestStreakDays: 0,
    weeklyGoalAyahs: 35,
    achievements: [],
    groupPlan: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

/**
 * Normalizes Arabic script for forgiving STT word comparison:
 * removes harakat/diacritics, tatweel, punctuation, normalizes Alef/Ya/Ta-Marbuta forms.
 * Note: Used ONLY internally for comparing STT output against verified text — NEVER alters displayed Quran text!
 */
export function normalizeArabicForSttComparison(input: string): string[] {
  const stripped = (input || '')
    // Remove Arabic diacritics, small signs, pause marks, tatweel
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
    // Normalize Alef variants
    .replace(/[أإآٱ]/g, 'ا')
    // Normalize Ya / Alef Maqsura
    .replace(/[ىيئ]/g, 'ي')
    // Normalize Waw with hamza
    .replace(/ؤ/g, 'و')
    // Normalize Ta Marbuta -> Ha for spoken comparison
    .replace(/ة/g, 'ه')
    // Remove punctuation & digits
    .replace(/[^\u0621-\u064A\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!stripped) return [];
  return stripped.split(' ').filter((w) => w.length > 0);
}

export function compareArabicRecitationWords(
  expectedArabic: string,
  transcriptArabic: string
): {
  matchedWordRatio: number;
  potentiallyMissingWords: string[];
  potentiallySubstitutedWords: string[];
} {
  const expectedWords = normalizeArabicForSttComparison(expectedArabic);
  const spokenWords = normalizeArabicForSttComparison(transcriptArabic);
  if (expectedWords.length === 0) {
    return { matchedWordRatio: 0, potentiallyMissingWords: [], potentiallySubstitutedWords: [] };
  }

  // Greedy ordered alignment with lookahead window of 4 words
  let matched = 0;
  let si = 0;
  const missing: string[] = [];
  const substituted: string[] = [];

  for (let ei = 0; ei < expectedWords.length; ei++) {
    const ew = expectedWords[ei];
    if (si < spokenWords.length && spokenWords[si] === ew) {
      matched++;
      si++;
      continue;
    }
    // Look ahead in spokenWords
    let foundOffset = -1;
    for (let look = 1; look <= 4 && si + look < spokenWords.length; look++) {
      if (spokenWords[si + look] === ew) {
        foundOffset = look;
        break;
      }
    }
    if (foundOffset > 0) {
      for (let k = 0; k < foundOffset; k++) {
        substituted.push(spokenWords[si + k]);
      }
      matched++;
      si += foundOffset + 1;
    } else {
      missing.push(ew);
      // If next expected matches next spoken, advance spoken as a substitution
      if (
        ei + 1 < expectedWords.length &&
        si + 1 < spokenWords.length &&
        spokenWords[si + 1] === expectedWords[ei + 1]
      ) {
        substituted.push(spokenWords[si]);
        si++;
      }
    }
  }

  const ratio = Number((matched / expectedWords.length).toFixed(2));
  return {
    matchedWordRatio: Math.max(0, Math.min(1, ratio)),
    potentiallyMissingWords: missing.slice(0, 12),
    potentiallySubstitutedWords: substituted.slice(0, 12),
  };
}

export class TelegramHifzService {
  private readonly repo: TelegramRepository;
  private readonly aiEngine?: TelegramAiEngine;

  constructor(repo: TelegramRepository, aiEngine?: TelegramAiEngine) {
    this.repo = repo;
    this.aiEngine = aiEngine;
  }

  getTodayDateKey(): string {
    return getTashkentDateParts().dateKey;
  }

  async getOrCreateProfile(telegramId: string): Promise<TelegramHifzProfile> {
    const existing = this.repo.getHifzProfile(telegramId);
    if (existing) return existing;
    const fresh = createDefaultHifzProfile(telegramId);
    await this.repo.saveHifzProfile(fresh);
    return fresh;
  }

  getProfileIfExists(telegramId: string): TelegramHifzProfile | null {
    return this.repo.getHifzProfile(telegramId);
  }

  private evaluateMilestonesAndLifelong(profile: TelegramHifzProfile): void {
    const nowIso = new Date().toISOString();
    const have = new Set(profile.achievements.map((a) => a.code));
    const grant = (code: string) => {
      if (!have.has(code)) {
        have.add(code);
        profile.achievements.push({
          id: `ach_${code}`,
          code,
          earnedAt: nowIso,
        });
      }
    };

    const allSurahs = Object.values(profile.surahs);
    const totalAyahs = allSurahs.reduce((sum, s) => sum + s.memorizedAyahCount, 0);
    const completedSurahs = allSurahs.filter((s) => s.isComplete).length;
    const juzStats = computeAllJuzProgress(profile.surahs);
    const completedJuzs = juzStats.filter((j) => j.isComplete).length;

    if (totalAyahs >= 1) grant('first_ayah');
    if (completedSurahs >= 1) grant('first_surah');
    if (juzStats.find((j) => j.juzNumber === 30)?.isComplete) grant('juz_amma_complete');
    if (completedJuzs >= 1) grant('first_juz');
    if (completedJuzs >= 5) grant('five_juzs');
    if (completedJuzs >= 15) grant('half_quran');
    if (profile.streakDays >= 7) grant('streak_7d');
    if (profile.streakDays >= 30) grant('streak_30d');

    const isFullHifz = totalAyahs >= TOTAL_QURAN_AYAHS && completedJuzs === TOTAL_QURAN_JUZS;
    if (isFullHifz) {
      grant('full_quran_hifz');
      if (!profile.lifelong.active) {
        profile.lifelong.active = true;
        profile.lifelong.unlockedAt = profile.lifelong.unlockedAt || nowIso;
        profile.lifelong.currentJuzCursor = profile.lifelong.currentJuzCursor || 1;
        for (let j = 1; j <= 30; j++) {
          if (profile.lifelong.juzStrength[String(j)] === undefined) {
            profile.lifelong.juzStrength[String(j)] = 75;
          }
        }
      }
    } else {
      // Strictly never leave lifelong mode active if full 30 juzs are no longer complete
      profile.lifelong.active = false;
    }
  }

  private bumpStreak(profile: TelegramHifzProfile, todayDateKey: string): void {
    const prev = profile.lastActiveDateKey;
    if (prev === todayDateKey) return;
    if (prev && diffDaysBetweenDateKeys(prev, todayDateKey) === 1) {
      profile.streakDays = (profile.streakDays || 0) + 1;
    } else {
      profile.streakDays = 1;
    }
    profile.longestStreakDays = Math.max(profile.longestStreakDays || 0, profile.streakDays);
    profile.lastActiveDateKey = todayDateKey;
  }

  /**
   * Marks an explicit ayah range [startAyah..endAyah] inside a surah as memorized.
   * Strictly clamps & merges ranges; sets `isComplete` ONLY if all ayahs in the surah are covered.
   */
  async markAyahRangeMemorized(
    telegramId: string,
    surahNumber: number,
    startAyah: number,
    endAyah: number,
    dateKey = this.getTodayDateKey()
  ): Promise<{ ok: boolean; profile?: TelegramHifzProfile; surah?: HifzSurahProgress; error?: string }> {
    const meta = getSurahMeta(surahNumber);
    if (!meta) return { ok: false, error: 'INVALID_SURAH' };
    if (
      !Number.isFinite(startAyah) ||
      !Number.isFinite(endAyah) ||
      startAyah < 1 ||
      endAyah < startAyah ||
      endAyah > meta.numberOfAyahs
    ) {
      return { ok: false, error: 'INVALID_AYAH_RANGE' };
    }

    const profile = await this.getOrCreateProfile(telegramId);
    const key = String(surahNumber);
    const existing = profile.surahs[key];
    const nowIso = new Date().toISOString();

    const merged = normalizeAyahRanges(
      [...(existing?.memorizedRanges || []), { startAyah, endAyah }],
      meta.numberOfAyahs
    );
    const memorizedAyahCount = countAyahsInRanges(merged);
    const isComplete = memorizedAyahCount === meta.numberOfAyahs;

    const updatedSurah: HifzSurahProgress = existing
      ? {
          ...existing,
          memorizedRanges: merged,
          memorizedAyahCount,
          totalAyahCount: meta.numberOfAyahs,
          isComplete,
          nextReviewDate: existing.nextReviewDate || addDaysToDateKey(dateKey, 1),
          memorizedAt: existing.memorizedAt || nowIso,
        }
      : {
          surahNumber,
          memorizedRanges: merged,
          memorizedAyahCount,
          totalAyahCount: meta.numberOfAyahs,
          isComplete,
          strengthScore: 35,
          stage: 'consolidation',
          intervalDays: 1,
          easeFactor: 2.1,
          repetitions: 0,
          reviewCount: 0,
          lapseCount: 0,
          nextReviewDate: addDaysToDateKey(dateKey, 1),
          memorizedAt: nowIso,
        };

    profile.surahs[key] = updatedSurah;
    this.bumpStreak(profile, dateKey);
    this.evaluateMilestonesAndLifelong(profile);
    // Invalidate today's plan if a new range was manually marked so next view reflects fresh status
    if (profile.currentDailyPlan && profile.currentDailyPlan.dateKey === dateKey) {
      profile.currentDailyPlan = generateAdaptiveDailyPlan(profile, dateKey);
    }

    await this.repo.saveHifzProfile(profile);
    await this.repo.appendAuditLog({
      actorTelegramId: telegramId,
      actorRole: 'user',
      action: 'hifz_range_marked',
      targetType: 'hifz',
      targetId: `${surahNumber}:${startAyah}-${endAyah}`,
      metadata: { surahNumber, startAyah, endAyah, isComplete },
    });

    return { ok: true, profile, surah: updatedSurah };
  }

  async markFullSurahMemorized(
    telegramId: string,
    surahNumber: number,
    dateKey = this.getTodayDateKey()
  ): Promise<{ ok: boolean; profile?: TelegramHifzProfile; surah?: HifzSurahProgress; error?: string }> {
    const meta = getSurahMeta(surahNumber);
    if (!meta) return { ok: false, error: 'INVALID_SURAH' };
    return this.markAyahRangeMemorized(telegramId, surahNumber, 1, meta.numberOfAyahs, dateKey);
  }

  async unmarkSurah(
    telegramId: string,
    surahNumber: number
  ): Promise<{ ok: boolean; profile?: TelegramHifzProfile }> {
    const profile = await this.getOrCreateProfile(telegramId);
    delete profile.surahs[String(surahNumber)];
    this.evaluateMilestonesAndLifelong(profile);
    profile.currentDailyPlan = null;
    await this.repo.saveHifzProfile(profile);
    return { ok: true, profile };
  }

  async markJuzMemorized(
    telegramId: string,
    juzNumber: number,
    dateKey = this.getTodayDateKey()
  ): Promise<{ ok: boolean; profile?: TelegramHifzProfile; error?: string }> {
    const juz = getJuzMeta(juzNumber);
    if (!juz) return { ok: false, error: 'INVALID_JUZ' };
    const profile = await this.getOrCreateProfile(telegramId);
    const nowIso = new Date().toISOString();

    for (const seg of juz.segments) {
      const meta = getSurahMeta(seg.surahNumber);
      if (!meta) continue;
      const key = String(seg.surahNumber);
      const existing = profile.surahs[key];
      const merged = normalizeAyahRanges(
        [...(existing?.memorizedRanges || []), { startAyah: seg.startAyah, endAyah: seg.endAyah }],
        meta.numberOfAyahs
      );
      const memorizedAyahCount = countAyahsInRanges(merged);
      const isComplete = memorizedAyahCount === meta.numberOfAyahs;
      profile.surahs[key] = existing
        ? {
            ...existing,
            memorizedRanges: merged,
            memorizedAyahCount,
            totalAyahCount: meta.numberOfAyahs,
            isComplete,
            nextReviewDate: existing.nextReviewDate || addDaysToDateKey(dateKey, 1),
          }
        : {
            surahNumber: seg.surahNumber,
            memorizedRanges: merged,
            memorizedAyahCount,
            totalAyahCount: meta.numberOfAyahs,
            isComplete,
            strengthScore: 45,
            stage: 'consolidation',
            intervalDays: 1,
            easeFactor: 2.1,
            repetitions: 0,
            reviewCount: 0,
            lapseCount: 0,
            nextReviewDate: addDaysToDateKey(dateKey, 1),
            memorizedAt: nowIso,
          };
    }

    this.bumpStreak(profile, dateKey);
    this.evaluateMilestonesAndLifelong(profile);
    profile.currentDailyPlan = null;
    await this.repo.saveHifzProfile(profile);
    return { ok: true, profile };
  }

  async getOrGenerateTodayPlan(
    telegramId: string,
    dateKey = this.getTodayDateKey(),
    forceRegenerate = false
  ): Promise<{ profile: TelegramHifzProfile; plan: HifzDailyPlan }> {
    const profile = await this.getOrCreateProfile(telegramId);
    if (!forceRegenerate && profile.currentDailyPlan && profile.currentDailyPlan.dateKey === dateKey) {
      return { profile, plan: profile.currentDailyPlan };
    }
    this.evaluateMilestonesAndLifelong(profile);
    const plan = generateAdaptiveDailyPlan(profile, dateKey);
    profile.currentDailyPlan = plan;
    await this.repo.saveHifzProfile(profile);
    return { profile, plan };
  }

  /**
   * Completes a daily Hifz task with user's Active Recall quality score (1..5):
   * - Updates spaced-repetition interval, ease factor, strength score, and next review date.
   * - For `new_memorization`, explicitly records the newly memorized ayah range.
   * - For `error_drill`, resolves or reschedules difficult ayahs based on quality.
   * - For `lifelong_juz`, updates juz strength, last reviewed date, and advances the 30-juz cursor.
   */
  async completeDailyTaskWithRating(
    telegramId: string,
    taskId: string,
    quality: HifzReviewQuality,
    dateKey = this.getTodayDateKey()
  ): Promise<{
    ok: boolean;
    profile?: TelegramHifzProfile;
    nextReviewDate?: string;
    newIntervalDays?: number;
    error?: string;
  }> {
    const { profile, plan } = await this.getOrGenerateTodayPlan(telegramId, dateKey);
    const task = plan.tasks.find((t) => t.id === taskId);
    if (!task) return { ok: false, error: 'TASK_NOT_FOUND' };

    const nowIso = new Date().toISOString();
    let prevInterval = 0;
    let newInterval = 1;
    let nextReviewDate = addDaysToDateKey(dateKey, 1);

    if (task.taskType === 'new_memorization') {
      // Only add to memorized ranges if user did not rate 5 (needs re-memorization)
      if (quality <= 4) {
        const meta = getSurahMeta(task.surahNumber);
        if (meta) {
          const key = String(task.surahNumber);
          const existing = profile.surahs[key];
          const merged = normalizeAyahRanges(
            [...(existing?.memorizedRanges || []), { startAyah: task.startAyah, endAyah: task.endAyah }],
            meta.numberOfAyahs
          );
          const memorizedAyahCount = countAyahsInRanges(merged);
          const isComplete = memorizedAyahCount === meta.numberOfAyahs;
          const upd = computeNextSpacedInterval(
            existing || {
              intervalDays: 0,
              easeFactor: 2.1,
              strengthScore: 30,
              repetitions: 0,
              lapseCount: 0,
              stage: 'new_memorization',
            },
            quality,
            dateKey
          );
          prevInterval = existing?.intervalDays || 0;
          newInterval = upd.newIntervalDays;
          nextReviewDate = upd.nextReviewDate;

          profile.surahs[key] = {
            surahNumber: task.surahNumber,
            memorizedRanges: merged,
            memorizedAyahCount,
            totalAyahCount: meta.numberOfAyahs,
            isComplete,
            strengthScore: upd.newStrengthScore,
            stage: upd.newStage,
            intervalDays: upd.newIntervalDays,
            easeFactor: upd.newEaseFactor,
            repetitions: upd.newRepetitions,
            reviewCount: (existing?.reviewCount || 0) + 1,
            lapseCount: upd.newLapseCount,
            lastReviewedAt: nowIso,
            nextReviewDate: upd.nextReviewDate,
            memorizedAt: existing?.memorizedAt || nowIso,
          };
        }
      }
    } else if (task.taskType === 'lifelong_juz') {
      const jKey = String(task.juzNumber);
      const curStr = profile.lifelong.juzStrength[jKey] ?? 75;
      const delta = quality === 1 ? 10 : quality === 2 ? 4 : quality === 3 ? -8 : quality === 4 ? -18 : -28;
      profile.lifelong.juzStrength[jKey] = Math.max(15, Math.min(100, curStr + delta));
      profile.lifelong.juzLastReviewedDate[jKey] = dateKey;
      // Advance 30-juz cursor if this juz matched cursor
      if (task.juzNumber === profile.lifelong.currentJuzCursor) {
        const nextCursor = (profile.lifelong.currentJuzCursor % 30) + 1;
        if (nextCursor === 1) {
          profile.lifelong.completedFullCycles = (profile.lifelong.completedFullCycles || 0) + 1;
        }
        profile.lifelong.currentJuzCursor = nextCursor;
      }
      newInterval = quality <= 2 ? Math.ceil(30 / Math.max(1, profile.lifelong.dailyJuzTarget)) : 3;
      nextReviewDate = addDaysToDateKey(dateKey, newInterval);
    } else {
      // spaced_review | cumulative | error_drill
      const key = String(task.surahNumber);
      const existing = profile.surahs[key];
      if (existing) {
        prevInterval = existing.intervalDays;
        const upd = computeNextSpacedInterval(existing, quality, dateKey);
        newInterval = upd.newIntervalDays;
        nextReviewDate = upd.nextReviewDate;
        profile.surahs[key] = {
          ...existing,
          strengthScore: upd.newStrengthScore,
          stage: upd.newStage,
          intervalDays: upd.newIntervalDays,
          easeFactor: upd.newEaseFactor,
          repetitions: upd.newRepetitions,
          reviewCount: existing.reviewCount + 1,
          lapseCount: upd.newLapseCount,
          lastReviewedAt: nowIso,
          nextReviewDate: upd.nextReviewDate,
        };
      }

      if (task.taskType === 'error_drill') {
        for (const d of profile.difficultAyahs) {
          if (
            !d.resolved &&
            d.surahNumber === task.surahNumber &&
            d.ayahNumber >= task.startAyah &&
            d.ayahNumber <= task.endAyah
          ) {
            if (quality <= 2) {
              d.resolved = true;
            } else {
              d.errorCount += 1;
              d.lastErrorAt = nowIso;
              d.nextDrillDate = addDaysToDateKey(dateKey, 1);
            }
          }
        }
      } else if (quality >= 4) {
        // Automatically queue an error drill for difficult review
        this.upsertDifficultAyahInternal(profile, task.surahNumber, task.startAyah, dateKey, 'Qiyin murojaa');
      }
    }

    task.completed = true;
    task.completedAt = nowIso;
    task.quality = quality;
    plan.completedTaskCount = plan.tasks.filter((t) => t.completed).length;

    profile.reviewHistory.unshift({
      id: `hr_${Date.now().toString(36)}_${crypto.randomBytes(2).toString('hex')}`,
      dateKey,
      surahNumber: task.surahNumber,
      startAyah: task.startAyah,
      endAyah: task.endAyah,
      taskType: task.taskType,
      quality,
      durationMinutes: task.estimatedMinutes,
      previousIntervalDays: prevInterval,
      newIntervalDays: newInterval,
      createdAt: nowIso,
    });
    if (profile.reviewHistory.length > 250) {
      profile.reviewHistory = profile.reviewHistory.slice(0, 250);
    }

    this.bumpStreak(profile, dateKey);
    this.evaluateMilestonesAndLifelong(profile);
    await this.repo.saveHifzProfile(profile);

    return { ok: true, profile, nextReviewDate, newIntervalDays: newInterval };
  }

  private upsertDifficultAyahInternal(
    profile: TelegramHifzProfile,
    surahNumber: number,
    ayahNumber: number,
    dateKey: string,
    note?: string
  ): HifzDifficultAyah {
    const id = `${surahNumber}:${ayahNumber}`;
    const nowIso = new Date().toISOString();
    const existing = profile.difficultAyahs.find((d) => d.id === id);
    if (existing) {
      existing.errorCount += 1;
      existing.resolved = false;
      existing.lastErrorAt = nowIso;
      existing.nextDrillDate = addDaysToDateKey(dateKey, 1);
      if (note) existing.note = note.slice(0, 140);
      return existing;
    }
    const created: HifzDifficultAyah = {
      id,
      surahNumber,
      ayahNumber,
      note: note?.slice(0, 140),
      errorCount: 1,
      resolved: false,
      lastErrorAt: nowIso,
      nextDrillDate: dateKey,
    };
    profile.difficultAyahs.unshift(created);
    if (profile.difficultAyahs.length > 100) {
      profile.difficultAyahs = profile.difficultAyahs.slice(0, 100);
    }
    return created;
  }

  async logDifficultAyah(
    telegramId: string,
    surahNumber: number,
    ayahNumber: number,
    note?: string
  ): Promise<{ ok: boolean; entry?: HifzDifficultAyah; error?: string }> {
    const meta = getSurahMeta(surahNumber);
    if (!meta || ayahNumber < 1 || ayahNumber > meta.numberOfAyahs) {
      return { ok: false, error: 'INVALID_AYAH' };
    }
    const profile = await this.getOrCreateProfile(telegramId);
    const entry = this.upsertDifficultAyahInternal(
      profile,
      surahNumber,
      ayahNumber,
      this.getTodayDateKey(),
      note
    );
    await this.repo.saveHifzProfile(profile);
    return { ok: true, entry };
  }

  async resolveDifficultAyah(telegramId: string, ayahId: string): Promise<boolean> {
    const profile = await this.getOrCreateProfile(telegramId);
    const found = profile.difficultAyahs.find((d) => d.id === ayahId);
    if (!found) return false;
    found.resolved = true;
    await this.repo.saveHifzProfile(profile);
    return true;
  }

  async updateSettings(
    telegramId: string,
    patch: {
      startSurahNumber?: number;
      startDirection?: TelegramHifzProfile['startDirection'];
      dailyNewAyahsGoal?: number;
      dailyReviewMinutesGoal?: number;
      preferredReciterId?: string;
      weeklyGoalAyahs?: number;
      dailyJuzTarget?: number;
      reminders?: Partial<HifzReminderSettings>;
      groupPlan?: HifzGroupPlan | null;
    }
  ): Promise<TelegramHifzProfile> {
    const profile = await this.getOrCreateProfile(telegramId);
    if (patch.startSurahNumber !== undefined) {
      profile.startSurahNumber = Math.max(1, Math.min(114, Math.floor(patch.startSurahNumber)));
    }
    if (patch.startDirection) profile.startDirection = patch.startDirection;
    if (patch.dailyNewAyahsGoal !== undefined) {
      profile.dailyNewAyahsGoal = Math.max(1, Math.min(50, Math.floor(patch.dailyNewAyahsGoal)));
    }
    if (patch.dailyReviewMinutesGoal !== undefined) {
      profile.dailyReviewMinutesGoal = Math.max(10, Math.min(240, Math.floor(patch.dailyReviewMinutesGoal)));
    }
    if (patch.preferredReciterId) profile.preferredReciterId = patch.preferredReciterId;
    if (patch.weeklyGoalAyahs !== undefined) {
      profile.weeklyGoalAyahs = Math.max(5, Math.min(500, Math.floor(patch.weeklyGoalAyahs)));
    }
    if (patch.dailyJuzTarget !== undefined) {
      profile.lifelong.dailyJuzTarget = Math.max(1, Math.min(5, Math.floor(patch.dailyJuzTarget)));
    }
    if (patch.reminders) {
      profile.reminders = {
        ...profile.reminders,
        ...patch.reminders,
      };
    }
    if (patch.groupPlan !== undefined) {
      profile.groupPlan = patch.groupPlan;
    }
    profile.currentDailyPlan = null;
    await this.repo.saveHifzProfile(profile);
    return profile;
  }

  getStats(profile: TelegramHifzProfile, todayDateKey = this.getTodayDateKey()): HifzStatsSummary {
    const surahs = Object.values(profile.surahs);
    const completedSurahsCount = surahs.filter((s) => s.isComplete).length;
    const partialSurahsCount = surahs.filter((s) => s.memorizedAyahCount > 0 && !s.isComplete).length;
    const memorizedAyahsCount = surahs.reduce((sum, s) => sum + s.memorizedAyahCount, 0);
    const remainingAyahsCount = Math.max(0, TOTAL_QURAN_AYAHS - memorizedAyahsCount);
    const memorizedPercent = Number(((memorizedAyahsCount / TOTAL_QURAN_AYAHS) * 100).toFixed(2));
    const juzStats = computeAllJuzProgress(profile.surahs);
    const completedJuzsCount = juzStats.filter((j) => j.isComplete).length;
    const partialJuzsCount = juzStats.filter((j) => j.isPartial).length;
    const masteredSurahsCount = surahs.filter((s) => s.stage === 'mastered').length;
    const difficultAyahsCount = profile.difficultAyahs.filter((d) => !d.resolved).length;

    const todayPlan =
      profile.currentDailyPlan && profile.currentDailyPlan.dateKey === todayDateKey
        ? profile.currentDailyPlan
        : null;

    const weekAgoKey = addDaysToDateKey(todayDateKey, -7);
    const monthAgoKey = addDaysToDateKey(todayDateKey, -30);
    const weeklyReviews = profile.reviewHistory.filter((r) => r.dateKey >= weekAgoKey);
    const monthlyReviews = profile.reviewHistory.filter((r) => r.dateKey >= monthAgoKey);
    const goodReviews = monthlyReviews.filter((r) => r.quality <= 2).length;
    const reviewSuccessRatePercent =
      monthlyReviews.length > 0 ? Math.round((goodReviews / monthlyReviews.length) * 100) : 0;

    return {
      totalSurahsInQuran: TOTAL_QURAN_SURAHS,
      totalJuzsInQuran: TOTAL_QURAN_JUZS,
      totalAyahsInQuran: TOTAL_QURAN_AYAHS,
      completedSurahsCount,
      partialSurahsCount,
      memorizedAyahsCount,
      remainingAyahsCount,
      memorizedPercent,
      completedJuzsCount,
      partialJuzsCount,
      masteredSurahsCount,
      difficultAyahsCount,
      todayCompletedTasks: todayPlan ? todayPlan.tasks.filter((t) => t.completed).length : 0,
      todayTotalTasks: todayPlan ? todayPlan.tasks.length : 0,
      weeklyReviewsCount: weeklyReviews.length,
      monthlyReviewsCount: monthlyReviews.length,
      reviewSuccessRatePercent,
      streakDays: profile.streakDays || 0,
      isFullHifz: memorizedAyahsCount >= TOTAL_QURAN_AYAHS && completedJuzsCount === TOTAL_QURAN_JUZS,
    };
  }

  /**
   * Returns a 7-day upcoming murojaa schedule from the user's spaced-repetition dates or lifelong rotation.
   */
  getReviewCalendar(
    profile: TelegramHifzProfile,
    days = 7,
    todayDateKey = this.getTodayDateKey()
  ): Array<{ dateKey: string; items: string[] }> {
    const out: Array<{ dateKey: string; items: string[] }> = [];
    const surahs = Object.values(profile.surahs).filter((s) => s.memorizedAyahCount > 0);

    for (let i = 0; i < days; i++) {
      const dk = addDaysToDateKey(todayDateKey, i);
      const items: string[] = [];

      if (profile.lifelong.active) {
        const target = Math.max(1, Math.round(profile.lifelong.dailyJuzTarget || 1));
        const startJuz = ((profile.lifelong.currentJuzCursor - 1 + i * target) % 30) + 1;
        for (let k = 0; k < target; k++) {
          const jn = ((startJuz - 1 + k) % 30) + 1;
          const jMeta = JUZ_META_MAP.find((j) => j.juzNumber === jn);
          items.push(`${jn}-juz (${jMeta?.nameUz || ''})`);
        }
      } else {
        const due = surahs
          .filter((s) => {
            if (i === 0) return !s.nextReviewDate || s.nextReviewDate <= dk;
            return s.nextReviewDate === dk;
          })
          .sort((a, b) => a.strengthScore - b.strengthScore);

        for (const sp of due.slice(0, 5)) {
          const meta = getSurahMeta(sp.surahNumber);
          items.push(`${sp.surahNumber}. ${meta?.nameUz || ''} (${sp.strengthScore}%)`);
        }
      }

      out.push({ dateKey: dk, items });
    }
    return out;
  }

  /**
   * AI Hifz Coach — uses Gemini when enabled/configured, with an honest structured
   * pedagogical fallback when AI is unavailable. Always reminds about a qualified Qur'an teacher.
   */
  async askCoach(
    telegramId: string,
    locale: TelegramLocale,
    userQuestion?: string
  ): Promise<{ text: string; usedAi: boolean }> {
    const profile = await this.getOrCreateProfile(telegramId);
    const stats = this.getStats(profile);
    const weakSurahs = Object.values(profile.surahs)
      .filter((s) => s.memorizedAyahCount > 0 && (s.strengthScore < 65 || s.stage === 'relearning'))
      .sort((a, b) => a.strengthScore - b.strengthScore)
      .slice(0, 3)
      .map((s) => `${s.surahNumber}.${getSurahMeta(s.surahNumber)?.nameUz || ''} (${s.strengthScore}%)`);

    const contextSummary = [
      `Memorized ayahs: ${stats.memorizedAyahsCount}/${stats.totalAyahsInQuran} (${stats.memorizedPercent}%)`,
      `Completed surahs: ${stats.completedSurahsCount}/114, Partial surahs: ${stats.partialSurahsCount}, Completed juzs: ${stats.completedJuzsCount}/30`,
      `Daily goals: ${profile.dailyNewAyahsGoal} new ayahs/day, ${profile.dailyReviewMinutesGoal} review min/day`,
      `Streak: ${stats.streakDays} days, Monthly review success: ${stats.reviewSuccessRatePercent}%`,
      `Weak surahs: ${weakSurahs.length > 0 ? weakSurahs.join(', ') : 'None currently'}`,
      `Unresolved difficult ayahs: ${stats.difficultAyahsCount}`,
      `Lifelong 30-Juz mode: ${profile.lifelong.active ? 'ACTIVE' : 'Not unlocked yet'}`,
    ].join('\n');

    if (this.aiEngine) {
      const aiRes = await this.aiEngine.askHifzCoach({
        telegramId,
        locale,
        hifzContextSummary: contextSummary,
        userQuestion,
      });
      if (aiRes.ok && aiRes.advice) {
        return { text: aiRes.advice, usedAi: true };
      }
    }

    // Honest structured rule-based guidance when Gemini is disabled or unconfigured
    const weakLine =
      weakSurahs.length > 0
        ? weakSurahs.join(', ')
        : locale === 'ru'
          ? 'слабых сур пока нет'
          : locale === 'en'
            ? 'none right now'
            : 'hozircha zaif suralar yoʻq';

    const byLocale: Record<TelegramLocale, string> = {
      'uz-Latn':
        `{{emoji:hifz}} Shaxsiy Hifz Murabbiy tavsiyasi\n\n` +
        `{{emoji:statistics}} Holatingiz: ${stats.memorizedAyahsCount} oyat (${stats.memorizedPercent}%), ${stats.completedSurahsCount} toʻliq sura, seriya: ${stats.streakDays} kun.\n` +
        `{{emoji:warning}} Mustahkamlash zarur: ${weakLine}.\n\n` +
        `{{emoji:success}} Amaliy qadamlar:\n` +
        `1. Avval zaif suralar va qiyin oyatlarni Musʼhafga qaramasdan (Active Recall) takrorlang.\n` +
        `2. Yangi oyatlarni 3–5 ta kichik boʻlakka ajrating va oxirgi oyatni keyingi oyat boshi bilan bogʻlang.\n` +
        `3. Yangi yodlashdan avval kechagi qismni kamida 3 marta ravon oʻqib chiqing.\n\n` +
        `{{emoji:warning}} Eslatma: Ushbu tizim reja va takrorlashda yordam beradi, lekin tajvid va maxrajni toʻliq tekshirish uchun malakali Qurʼon ustozi (Qori) koʻrigining oʻrnini bosa olmaydi.`,
      'uz-Cyrl':
        `{{emoji:hifz}} Шахсий Ҳифз Мураббий тавсияси\n\n` +
        `{{emoji:statistics}} Ҳолатингиз: ${stats.memorizedAyahsCount} оят (${stats.memorizedPercent}%), ${stats.completedSurahsCount} тўлиқ сура, серия: ${stats.streakDays} кун.\n` +
        `{{emoji:warning}} Мустаҳкамлаш зарур: ${weakLine}.\n\n` +
        `{{emoji:success}} Амалий қадамлар:\n` +
        `1. Аввал заиф суралар ва қийин оятларни Мусҳафга қарамасдан (Active Recall) такрорланг.\n` +
        `2. Янги оятларни 3–5 та кичик бўлакка ажратинг ва оят охирини кейинги оят боши билан боғланг.\n` +
        `3. Янги ёдлашдан аввал кечаги қисмни камида 3 марта равон ўқиб чиқинг.\n\n` +
        `{{emoji:warning}} Эслатма: Ушбу тизим режа ва такрорлашда ёрдам беради, лекин тажвид ва махражни тўлиқ текшириш учун малакали Қуръон устози (Қори) кўригининг ўрнини боса олмайди.`,
      'uz-Latn-new': '',
      ru:
        `{{emoji:hifz}} Рекомендация тренера по Хифзу\n\n` +
        `{{emoji:statistics}} Прогресс: ${stats.memorizedAyahsCount} аятов (${stats.memorizedPercent}%), ${stats.completedSurahsCount} полных сур, серия: ${stats.streakDays} дн.\n` +
        `{{emoji:warning}} Требуют закрепления: ${weakLine}.\n\n` +
        `{{emoji:success}} Практические шаги:\n` +
        `1. Сначала повторите слабые суры по памяти (Active Recall) до открытия Мусхафа.\n` +
        `2. Делите новые аяты на небольшие связки и соединяйте конец аята с началом следующего.\n` +
        `3. Перед новым заучиванием прочтите вчерашний отрывок минимум 3 раза без ошибок.\n\n` +
        `{{emoji:warning}} Важно: бот помогает с планированием и мурожаа, но не заменяет квалифицированного учителя Корана (устаза/кари) для проверки таджвида и махраджа.`,
      en:
        `{{emoji:hifz}} Personal Hifz Coach Guidance\n\n` +
        `{{emoji:statistics}} Snapshot: ${stats.memorizedAyahsCount} ayahs (${stats.memorizedPercent}%), ${stats.completedSurahsCount} complete surahs, streak: ${stats.streakDays} days.\n` +
        `{{emoji:warning}} Focus areas: ${weakLine}.\n\n` +
        `{{emoji:success}} Practical Steps:\n` +
        `1. Review weak surahs from memory first (Active Recall) before opening the Mushaf.\n` +
        `2. Chunk new ayahs into small blocks and link each ayah ending to the next ayah's opening.\n` +
        `3. Recite yesterday's portion fluently at least 3 times before starting new ayahs.\n\n` +
        `{{emoji:warning}} Note: This assistant supports planning and murojaa, and does NOT replace a qualified Qur'an teacher (Ustoz/Qori) for tajwid and makhraj verification.`,
    };
    byLocale['uz-Latn-new'] = toNewUzbekAlphabet(byLocale['uz-Latn']);
    return { text: byLocale[locale] || byLocale['uz-Latn'], usedAi: false };
  }

  /**
   * Audio Recitation Check:
   * Transcribes Arabic recitation via `gemini-3.5-transcribe` and performs honest word-level
   * comparison against verified Arabic Quran text (`VERIFIED_AYAHS`).
   * Strictly sets `disclaimerApplied: true` (never claims full tajwid/makhraj certification).
   */
  async checkRecitationAudio(params: {
    telegramId: string;
    locale: TelegramLocale;
    surahNumber: number;
    startAyah: number;
    endAyah: number;
    audioBuffer: Buffer;
    mimeType?: string;
  }): Promise<HifzAudioCheckResult> {
    if (!this.aiEngine) {
      return {
        ok: false,
        surahNumber: params.surahNumber,
        startAyah: params.startAyah,
        endAyah: params.endAyah,
        potentiallyMissingWords: [],
        potentiallySubstitutedWords: [],
        hasVerifiedArabicReference: false,
        disclaimerApplied: true,
        error: 'AI transcription engine is not initialized.',
      };
    }

    const stt = await this.aiEngine.transcribeArabicRecitation({
      telegramId: params.telegramId,
      locale: params.locale,
      audioBuffer: params.audioBuffer,
      mimeType: params.mimeType,
    });

    if (!stt.ok || !stt.transcript) {
      return {
        ok: false,
        surahNumber: params.surahNumber,
        startAyah: params.startAyah,
        endAyah: params.endAyah,
        potentiallyMissingWords: [],
        potentiallySubstitutedWords: [],
        hasVerifiedArabicReference: false,
        disclaimerApplied: true,
        error: stt.reason || stt.errorCode || 'Could not transcribe recitation.',
      };
    }

    const verifiedAyahs = getVerifiedArabicAyahsForRange(
      params.surahNumber,
      params.startAyah,
      params.endAyah
    );
    if (verifiedAyahs.length === 0) {
      return {
        ok: true,
        surahNumber: params.surahNumber,
        startAyah: params.startAyah,
        endAyah: params.endAyah,
        transcript: stt.transcript,
        potentiallyMissingWords: [],
        potentiallySubstitutedWords: [],
        hasVerifiedArabicReference: false,
        disclaimerApplied: true,
      };
    }

    const expectedArabic = verifiedAyahs.map((a) => a.textAr).join(' ');
    const diff = compareArabicRecitationWords(expectedArabic, stt.transcript);

    return {
      ok: true,
      surahNumber: params.surahNumber,
      startAyah: params.startAyah,
      endAyah: params.endAyah,
      transcript: stt.transcript,
      expectedSnippet: expectedArabic.slice(0, 500),
      matchedWordRatio: diff.matchedWordRatio,
      potentiallyMissingWords: diff.potentiallyMissingWords,
      potentiallySubstitutedWords: diff.potentiallySubstitutedWords,
      hasVerifiedArabicReference: true,
      disclaimerApplied: true,
    };
  }

  /**
   * Finds Hifz users whose morning/midday/evening or due-review reminder matches the current Tashkent HH:MM.
   */
  findUsersDueForReminder(now = new Date()): Array<{
    profile: TelegramHifzProfile;
    slot: 'morning' | 'midday' | 'evening' | 'due_review';
    slotKey: string;
    dateKey: string;
  }> {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tashkent',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const get = (t: string) => parts.find((p) => p.type === t)?.value || '00';
    const dateKey = `${get('year')}-${get('month')}-${get('day')}`;
    const hhmm = `${String(Number(get('hour')) % 24).padStart(2, '0')}:${get('minute')}`;

    const due: Array<{
      profile: TelegramHifzProfile;
      slot: 'morning' | 'midday' | 'evening' | 'due_review';
      slotKey: string;
      dateKey: string;
    }> = [];

    for (const profile of this.repo.listHifzProfiles()) {
      const r = profile.reminders;
      if (!r) continue;
      const dispatched = r.lastDispatchedSlots || {};
      const checks: Array<{
        enabled: boolean;
        time: string;
        slot: 'morning' | 'midday' | 'evening' | 'due_review';
      }> = [
        { enabled: r.morningEnabled, time: r.morningTime || '06:30', slot: 'morning' },
        { enabled: r.middayEnabled, time: r.middayTime || '13:30', slot: 'midday' },
        { enabled: r.eveningEnabled, time: r.eveningTime || '20:30', slot: 'evening' },
      ];

      for (const c of checks) {
        if (!c.enabled || c.time !== hhmm) continue;
        const slotKey = `${c.slot}_${c.time}`;
        if (dispatched[slotKey] === dateKey) continue;
        due.push({ profile, slot: c.slot, slotKey, dateKey });
      }

      if (r.dueReviewAlertEnabled && hhmm === '18:00') {
        const slotKey = 'due_review_18:00';
        if (dispatched[slotKey] !== dateKey) {
          const hasDueReview = Object.values(profile.surahs).some(
            (s) => s.memorizedAyahCount > 0 && (!s.nextReviewDate || s.nextReviewDate <= dateKey)
          );
          if (hasDueReview) {
            due.push({ profile, slot: 'due_review', slotKey, dateKey });
          }
        }
      }
    }

    return due;
  }

  buildReminderMessage(
    profile: TelegramHifzProfile,
    slot: 'morning' | 'midday' | 'evening' | 'due_review',
    locale: TelegramLocale,
    _now = new Date()
  ): string {
    const stats = this.getStats(profile);
    const titleBySlot: Record<typeof slot, Record<TelegramLocale, string>> = {
      morning: {
        'uz-Latn': '{{emoji:prayer}} Tonggi HIFZ eslatmasi',
        'uz-Cyrl': '{{emoji:prayer}} Тонгги ҲИФЗ эслатмаси',
        'uz-Latn-new': '{{emoji:prayer}} Tonggi HIFZ eslatmasi',
        ru: '{{emoji:prayer}} Утреннее напоминание Хифза',
        en: '{{emoji:prayer}} Morning Hifz Reminder',
      },
      midday: {
        'uz-Latn': '{{emoji:prayer}} Peshin HIFZ murojaasi',
        'uz-Cyrl': '{{emoji:prayer}} Пешин ҲИФЗ мурожааси',
        'uz-Latn-new': '{{emoji:prayer}} Peşin HIFZ murojaasi',
        ru: '{{emoji:prayer}} Дневное повторение Хифза',
        en: '{{emoji:prayer}} Midday Hifz Review',
      },
      evening: {
        'uz-Latn': '{{emoji:brand}} Kechki HIFZ takrorlash vaqti',
        'uz-Cyrl': '{{emoji:brand}} Кечки ҲИФЗ такрорлаш вақти',
        'uz-Latn-new': '{{emoji:brand}} Keçki HIFZ takrorlaş vaqti',
        ru: '{{emoji:brand}} Вечернее повторение Хифза',
        en: '{{emoji:brand}} Evening Hifz Review',
      },
      due_review: {
        'uz-Latn': '{{emoji:notifications}} Bugungi murojaa muddati yetdi',
        'uz-Cyrl': '{{emoji:notifications}} Бугунги мурожаа муддати етди',
        'uz-Latn-new': '{{emoji:notifications}} Bugungi murojaa muddati yetdi',
        ru: '{{emoji:notifications}} Пора выполнить мурожаа по Хифзу',
        en: '{{emoji:notifications}} Hifz Murojaa Review Due Today',
      },
    };
    const header = titleBySlot[slot][locale] || titleBySlot[slot]['uz-Latn'];
    if (locale === 'ru') {
      return `${header}\n\n{{emoji:statistics}} Выучено: ${stats.memorizedAyahsCount}/6236 аятов (${stats.memorizedPercent}%) · Серия: ${stats.streakDays} дн.\nНажмите кнопку ниже, чтобы открыть сегодняшний план.`;
    }
    if (locale === 'en') {
      return `${header}\n\n{{emoji:statistics}} Memorized: ${stats.memorizedAyahsCount}/6236 ayahs (${stats.memorizedPercent}%) · Streak: ${stats.streakDays}d.\nTap below to open today's Hifz plan.`;
    }
    const text = `${header}\n\n{{emoji:statistics}} Yodlangan: ${stats.memorizedAyahsCount}/6236 oyat (${stats.memorizedPercent}%) · Seriya: ${stats.streakDays} kun.\nBugungi rejani ochish uchun tugmani bosing.`;
    return locale === 'uz-Latn-new' ? toNewUzbekAlphabet(text) : text;
  }

  async markReminderDispatched(
    telegramId: string,
    slotKey: string,
    dateKey: string
  ): Promise<void> {
    const profile = this.repo.getHifzProfile(telegramId);
    if (!profile) return;
    profile.reminders = {
      ...profile.reminders,
      lastDispatchedSlots: {
        ...(profile.reminders.lastDispatchedSlots || {}),
        [slotKey]: dateKey,
      },
    };
    profile.updatedAt = new Date().toISOString();
    await this.repo.saveHifzProfile(profile);
  }
}
