/**
 * ASAKA ZIYO HIFZ — Intelligent Adaptive Spaced-Repetition & Lifelong Murojaa Algorithm
 *
 * Combines 5 evidence-backed memorization methods:
 * 1. Active Recall       — Prompts recitation from memory before checking text, rated 1–5.
 * 2. Spaced Repetition   — Adaptive intervals starting from 0 -> 1 -> 3 -> 7 -> 14 -> 30+ days,
 *                          dynamically scaled by easeFactor, strengthScore, and lapse history.
 * 3. Interleaved Practice — Alternates between weak/recent/older surahs so memory consolidates deeply.
 * 4. Error-Based Review  — Prioritizes unresolved difficult ayahs before standard review.
 * 5. Cumulative Review   — Pairs newly memorized portions with previously stabilized surahs.
 *
 * Plus Lifelong 30-Juz Maintenance Mode once all 6,236 ayahs are verified memorized.
 */

import {
  HifzDailyPlan,
  HifzDailyTask,
  HifzReviewQuality,
  HifzSurahProgress,
  TelegramHifzProfile,
} from './hifzTypes';
import {
  JUZ_META_MAP,
  TOTAL_QURAN_AYAHS,
  computeAllJuzProgress,
  estimatePagesForRange,
  findNextUnmemorizedRange,
  getJuzForAyah,
  getSurahMeta,
} from './quranMetadataMap';

const BASE_MILESTONE_INTERVALS = [1, 3, 7, 14, 30, 45, 60] as const;

export function addDaysToDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y || 2026, (m || 1) - 1, d || 1));
  dt.setUTCDate(dt.getUTCDate() + Math.round(days));
  return dt.toISOString().slice(0, 10);
}

export function diffDaysBetweenDateKeys(fromDateKey: string, toDateKey: string): number {
  const parse = (k: string) => {
    const [y, m, d] = k.split('-').map(Number);
    return Date.UTC(y || 2026, (m || 1) - 1, d || 1);
  };
  return Math.round((parse(toDateKey) - parse(fromDateKey)) / 86_400_000);
}

export interface IntervalUpdateResult {
  newIntervalDays: number;
  newEaseFactor: number;
  newStrengthScore: number;
  newStage: HifzSurahProgress['stage'];
  newRepetitions: number;
  newLapseCount: number;
  nextReviewDate: string;
  needsExtraErrorDrill: boolean;
}

/**
 * Computes the next adaptive spaced-repetition interval based on the user's 1..5 recall quality:
 * 1 = Juda yaxshi (flawless)
 * 2 = Yaxshi (minor hesitation)
 * 3 = O'rtacha (some forgotten parts)
 * 4 = Qiyin (many errors)
 * 5 = Qayta yodlash kerak (forgotten — reset to relearning)
 */
export function computeNextSpacedInterval(
  current: Pick<
    HifzSurahProgress,
    'intervalDays' | 'easeFactor' | 'strengthScore' | 'repetitions' | 'lapseCount' | 'stage'
  >,
  quality: HifzReviewQuality,
  todayDateKey: string
): IntervalUpdateResult {
  const prevInterval = Math.max(0, current.intervalDays || 0);
  let ease = Math.max(1.3, Math.min(2.8, current.easeFactor || 2.1));
  let strength = Math.max(0, Math.min(100, current.strengthScore || 20));
  let reps = Math.max(0, current.repetitions || 0);
  let lapses = Math.max(0, current.lapseCount || 0);

  let newIntervalDays = 1;
  let newStage: HifzSurahProgress['stage'] = 'consolidation';
  let needsExtraErrorDrill = false;

  if (quality === 1) {
    // Flawless recall -> advance milestone or multiply by easeFactor
    ease = Math.min(2.8, Number((ease + 0.12).toFixed(2)));
    strength = Math.min(100, strength + (strength < 60 ? 18 : 10));
    if (reps < BASE_MILESTONE_INTERVALS.length) {
      newIntervalDays = BASE_MILESTONE_INTERVALS[reps];
    } else {
      newIntervalDays = Math.min(90, Math.max(30, Math.round(prevInterval * ease)));
    }
    reps += 1;
    newStage = strength >= 85 && newIntervalDays >= 30 ? 'mastered' : newIntervalDays >= 7 ? 'spaced_review' : 'consolidation';
  } else if (quality === 2) {
    // Good recall with small hesitation -> steady growth
    ease = Math.min(2.6, Number((ease + 0.04).toFixed(2)));
    strength = Math.min(95, strength + 10);
    if (reps === 0) {
      newIntervalDays = 1;
    } else if (reps === 1) {
      newIntervalDays = 3;
    } else if (reps === 2) {
      newIntervalDays = 7;
    } else {
      newIntervalDays = Math.min(60, Math.max(3, Math.round(Math.max(prevInterval, 5) * Math.max(1.35, ease - 0.25))));
    }
    reps += 1;
    newStage = newIntervalDays >= 7 ? 'spaced_review' : 'consolidation';
  } else if (quality === 3) {
    // Average -> shorten interval to consolidate weak links
    ease = Math.max(1.3, Number((ease - 0.14).toFixed(2)));
    strength = Math.max(20, strength - 6);
    newIntervalDays = prevInterval <= 3 ? 1 : Math.max(2, Math.round(prevInterval * 0.5));
    newStage = 'consolidation';
    needsExtraErrorDrill = true;
  } else if (quality === 4) {
    // Difficult -> immediate next-day repeat + extra error drill
    ease = Math.max(1.3, Number((ease - 0.25).toFixed(2)));
    strength = Math.max(10, strength - 18);
    lapses += 1;
    reps = Math.max(0, reps - 1);
    newIntervalDays = 1;
    newStage = 'relearning';
    needsExtraErrorDrill = true;
  } else {
    // quality === 5 -> Forgotten: full reset to relearning stage (same day / next day)
    ease = Math.max(1.3, Number((ease - 0.35).toFixed(2)));
    strength = Math.max(5, Math.min(25, strength - 30));
    lapses += 1;
    reps = 0;
    newIntervalDays = 1;
    newStage = 'relearning';
    needsExtraErrorDrill = true;
  }

  return {
    newIntervalDays,
    newEaseFactor: ease,
    newStrengthScore: Math.round(strength),
    newStage,
    newRepetitions: reps,
    newLapseCount: lapses,
    nextReviewDate: addDaysToDateKey(todayDateKey, newIntervalDays),
    needsExtraErrorDrill,
  };
}

/**
 * Estimates realistic minutes required to review a slice of ayahs based on average ayah density.
 */
function estimateReviewMinutes(surahNumber: number, ayahCount: number, isNew: boolean): number {
  const meta = getSurahMeta(surahNumber);
  const pagesForSurah = meta ? Math.max(0.25, meta.pageEnd - meta.pageStart + 1) : 1;
  const ayahsPerPage = meta ? Math.max(1, meta.numberOfAyahs / pagesForSurah) : 15;
  const approxPages = ayahCount / ayahsPerPage;
  const baseMin = isNew ? Math.ceil(approxPages * 18) : Math.ceil(approxPages * 3.5);
  return Math.max(isNew ? 5 : 2, Math.min(isNew ? 45 : 30, baseMin));
}

/**
 * Selects the next surah for new memorization following the user's chosen direction.
 */
function selectNextSurahForNewMemorization(profile: TelegramHifzProfile): {
  surahNumber: number;
  startAyah: number;
  endAyah: number;
} | null {
  const order: number[] = [];
  const start = Math.max(1, Math.min(114, profile.startSurahNumber || 114));

  if (profile.startDirection === 'juz_amma_first') {
    for (let s = start; s >= 1; s--) order.push(s);
    for (let s = 114; s > start; s--) order.push(s);
  } else {
    for (let s = start; s <= 114; s++) order.push(s);
    for (let s = 1; s < start; s++) order.push(s);
  }

  for (const sn of order) {
    const prog = profile.surahs[String(sn)];
    if (prog?.isComplete) continue;
    const nextRange = findNextUnmemorizedRange(
      sn,
      prog?.memorizedRanges || [],
      Math.max(1, profile.dailyNewAyahsGoal || 5)
    );
    if (nextRange) {
      return { surahNumber: sn, startAyah: nextRange.startAyah, endAyah: nextRange.endAyah };
    }
  }
  return null;
}

/**
 * Interleaves review candidates: alternates between weaker/relearning surahs and stronger/older surahs
 * so the brain actively retrieves across distinct contexts (Interleaved Practice).
 */
function interleaveSurahCandidates(candidates: HifzSurahProgress[]): HifzSurahProgress[] {
  if (candidates.length <= 2) return candidates;
  const weak = candidates
    .filter((c) => c.strengthScore < 65 || c.stage === 'relearning' || c.lapseCount > 0)
    .sort((a, b) => a.strengthScore - b.strengthScore);
  const stable = candidates
    .filter((c) => !(c.strengthScore < 65 || c.stage === 'relearning' || c.lapseCount > 0))
    .sort((a, b) => (a.nextReviewDate || '').localeCompare(b.nextReviewDate || ''));

  const out: HifzSurahProgress[] = [];
  let wi = 0;
  let si = 0;
  while (wi < weak.length || si < stable.length) {
    if (wi < weak.length) out.push(weak[wi++]);
    if (si < stable.length) out.push(stable[si++]);
  }
  return out;
}

/**
 * Generates an adaptive, workload-balanced daily Hifz & Murojaa plan for `todayDateKey` (Asia/Tashkent).
 * - Respects user's daily time budget (`dailyReviewMinutesGoal`) to prevent burnout.
 * - Handles missed tasks from previous day automatically (re-queued cleanly without flooding).
 * - Switches automatically to Lifelong 30-Juz Maintenance Rotation if full Hifz is verified.
 */
export function generateAdaptiveDailyPlan(
  profile: TelegramHifzProfile,
  todayDateKey: string
): HifzDailyPlan {
  const prevPlan = profile.currentDailyPlan;
  const carriedOverCount =
    prevPlan && prevPlan.dateKey < todayDateKey
      ? prevPlan.tasks.filter((t) => !t.completed).length
      : 0;

  const tasks: HifzDailyTask[] = [];
  let minutesBudget = Math.max(10, Math.min(240, profile.dailyReviewMinutesGoal || 25));
  let usedMinutes = 0;

  // Check true full Hifz (all 6,236 ayahs across 30 juzs verified)
  const totalMemorizedAyahs = Object.values(profile.surahs).reduce(
    (sum, sp) => sum + sp.memorizedAyahCount,
    0
  );
  const juzStats = computeAllJuzProgress(profile.surahs);
  const all30JuzComplete =
    totalMemorizedAyahs >= TOTAL_QURAN_AYAHS && juzStats.every((j) => j.isComplete);
  const isLifelongMode = Boolean(profile.lifelong.active && all30JuzComplete);

  // 1. ERROR-BASED REVIEW: Unresolved difficult ayahs due today or overdue (highest priority, max 2 blocks)
  const dueDifficult = profile.difficultAyahs
    .filter((d) => !d.resolved && d.nextDrillDate <= todayDateKey)
    .sort((a, b) => b.errorCount - a.errorCount || a.nextDrillDate.localeCompare(b.nextDrillDate));

  if (dueDifficult.length > 0) {
    // Group by surah (up to 2 surahs so drill stays focused)
    const grouped = new Map<number, number[]>();
    for (const d of dueDifficult) {
      const list = grouped.get(d.surahNumber) || [];
      list.push(d.ayahNumber);
      grouped.set(d.surahNumber, list);
    }
    let errorBlocks = 0;
    for (const [sn, ayahs] of grouped.entries()) {
      if (errorBlocks >= 2) break;
      ayahs.sort((a, b) => a - b);
      const startAyah = ayahs[0];
      const endAyah = ayahs[ayahs.length - 1];
      const pages = estimatePagesForRange(sn, startAyah, endAyah);
      const est = Math.min(10, Math.max(3, ayahs.length * 2));
      tasks.push({
        id: `err_${todayDateKey}_${sn}_${startAyah}`,
        taskType: 'error_drill',
        surahNumber: sn,
        juzNumber: getJuzForAyah(sn, startAyah),
        startAyah,
        endAyah,
        pageStart: pages.pageStart,
        pageEnd: pages.pageEnd,
        estimatedMinutes: est,
        priority: 1,
        reasonKey: 'error_based',
        completed: false,
      });
      usedMinutes += est;
      errorBlocks++;
    }
  }

  // 2A. LIFELONG 30-JUZ MAINTENANCE MODE
  if (isLifelongMode) {
    const dailyJuzTarget = Math.max(1, Math.min(5, Math.round(profile.lifelong.dailyJuzTarget || 1)));
    const cursor = Math.max(1, Math.min(30, profile.lifelong.currentJuzCursor || 1));

    // Also find weakest juz (lowest strength or oldest review)
    const weakJuzCandidates = [...JUZ_META_MAP].sort((a, b) => {
      const sa = profile.lifelong.juzStrength[String(a.juzNumber)] ?? 80;
      const sb = profile.lifelong.juzStrength[String(b.juzNumber)] ?? 80;
      if (sa !== sb) return sa - sb;
      const da = profile.lifelong.juzLastReviewedDate[String(a.juzNumber)] || '1970-01-01';
      const db = profile.lifelong.juzLastReviewedDate[String(b.juzNumber)] || '1970-01-01';
      return da.localeCompare(db);
    });

    const selectedJuzs: number[] = [];
    for (let i = 0; i < dailyJuzTarget; i++) {
      const juzNum = ((cursor - 1 + i) % 30) + 1;
      if (!selectedJuzs.includes(juzNum)) selectedJuzs.push(juzNum);
    }

    // If any juz is weakened (<65 strength) and not already in today's rotation, inject 1 priority spot check
    const weakest = weakJuzCandidates[0];
    if (
      weakest &&
      (profile.lifelong.juzStrength[String(weakest.juzNumber)] ?? 80) < 65 &&
      !selectedJuzs.includes(weakest.juzNumber)
    ) {
      selectedJuzs.push(weakest.juzNumber);
    }

    for (const jn of selectedJuzs) {
      const jMeta = JUZ_META_MAP.find((j) => j.juzNumber === jn);
      if (!jMeta || !jMeta.segments.length) continue;
      const firstSeg = jMeta.segments[0];
      const lastSeg = jMeta.segments[jMeta.segments.length - 1];
      const pagesStart = estimatePagesForRange(firstSeg.surahNumber, firstSeg.startAyah, firstSeg.endAyah).pageStart;
      const pagesEnd = estimatePagesForRange(lastSeg.surahNumber, lastSeg.startAyah, lastSeg.endAyah).pageEnd;
      const est = 25;
      tasks.push({
        id: `life_${todayDateKey}_j${jn}`,
        taskType: 'lifelong_juz',
        surahNumber: firstSeg.surahNumber,
        juzNumber: jn,
        startAyah: firstSeg.startAyah,
        endAyah: firstSeg.endAyah,
        pageStart: pagesStart,
        pageEnd: pagesEnd,
        estimatedMinutes: est,
        priority: 2,
        reasonKey:
          (profile.lifelong.juzStrength[String(jn)] ?? 80) < 65
            ? 'lifelong_weak_reinforce'
            : 'lifelong_rotation',
        completed: false,
      });
      usedMinutes += est;
    }

    return {
      dateKey: todayDateKey,
      generatedAt: new Date().toISOString(),
      isLifelongMode: true,
      totalEstimatedMinutes: usedMinutes,
      completedTaskCount: 0,
      tasks,
      carriedOverCount,
    };
  }

  // 2B. STANDARD HIFZ + SPACED REPETITION + INTERLEAVED + CUMULATIVE MODE
  // Reserve space for spaced review first (protecting existing memory is ALWAYS top priority)
  const allMemorizedSurahs = Object.values(profile.surahs).filter(
    (s) => s.memorizedAyahCount > 0
  );

  const dueReviews = allMemorizedSurahs.filter(
    (s) => !s.nextReviewDate || s.nextReviewDate <= todayDateKey || s.stage === 'relearning'
  );
  const interleavedDue = interleaveSurahCandidates(dueReviews);

  // Cap review tasks so we respect daily time budget (at least 1 due review if any exist)
  let addedReviewSurahs = new Set<number>();
  for (const sp of interleavedDue) {
    const firstRange = sp.memorizedRanges[0];
    const lastRange = sp.memorizedRanges[sp.memorizedRanges.length - 1];
    if (!firstRange || !lastRange) continue;

    const est = estimateReviewMinutes(sp.surahNumber, sp.memorizedAyahCount, false);
    if (addedReviewSurahs.size >= 1 && usedMinutes + est > minutesBudget) {
      break;
    }
    const pages = estimatePagesForRange(sp.surahNumber, firstRange.startAyah, lastRange.endAyah);
    tasks.push({
      id: `rev_${todayDateKey}_s${sp.surahNumber}`,
      taskType: 'spaced_review',
      surahNumber: sp.surahNumber,
      juzNumber: getJuzForAyah(sp.surahNumber, firstRange.startAyah),
      startAyah: firstRange.startAyah,
      endAyah: lastRange.endAyah,
      pageStart: pages.pageStart,
      pageEnd: pages.pageEnd,
      estimatedMinutes: est,
      priority: sp.stage === 'relearning' ? 2 : 3,
      reasonKey: sp.stage === 'relearning' ? 'relearning_priority' : 'spaced_due',
      completed: false,
    });
    usedMinutes += est;
    addedReviewSurahs.add(sp.surahNumber);
    if (addedReviewSurahs.size >= 5) break;
  }

  // 3. CUMULATIVE REVIEW: If user has >= 3 memorized surahs and budget allows, pick 1 older stabilized surah
  if (allMemorizedSurahs.length >= 3 && usedMinutes + 5 <= minutesBudget) {
    const cumulativeCandidate = allMemorizedSurahs
      .filter((s) => !addedReviewSurahs.has(s.surahNumber))
      .sort((a, b) => (a.lastReviewedAt || '1970-01-01').localeCompare(b.lastReviewedAt || '1970-01-01'))[0];

    if (cumulativeCandidate && cumulativeCandidate.memorizedRanges.length > 0) {
      const r0 = cumulativeCandidate.memorizedRanges[0];
      const rLast = cumulativeCandidate.memorizedRanges[cumulativeCandidate.memorizedRanges.length - 1];
      const est = estimateReviewMinutes(
        cumulativeCandidate.surahNumber,
        cumulativeCandidate.memorizedAyahCount,
        false
      );
      if (usedMinutes + est <= minutesBudget + 5) {
        const pages = estimatePagesForRange(cumulativeCandidate.surahNumber, r0.startAyah, rLast.endAyah);
        tasks.push({
          id: `cum_${todayDateKey}_s${cumulativeCandidate.surahNumber}`,
          taskType: 'cumulative',
          surahNumber: cumulativeCandidate.surahNumber,
          juzNumber: getJuzForAyah(cumulativeCandidate.surahNumber, r0.startAyah),
          startAyah: r0.startAyah,
          endAyah: rLast.endAyah,
          pageStart: pages.pageStart,
          pageEnd: pages.pageEnd,
          estimatedMinutes: est,
          priority: 4,
          reasonKey: 'cumulative_bond',
          completed: false,
        });
        usedMinutes += est;
      }
    }
  }

  // 4. NEW MEMORIZATION TASK: Only assign new ayahs if user isn't overloaded with relearning/overdue backlog
  const relearningBacklog = dueReviews.filter((s) => s.stage === 'relearning').length;
  const allowNewTask = relearningBacklog < 3 && (usedMinutes < minutesBudget || tasks.length === 0);

  if (allowNewTask && profile.dailyNewAyahsGoal > 0) {
    const nextNew = selectNextSurahForNewMemorization(profile);
    if (nextNew) {
      const count = nextNew.endAyah - nextNew.startAyah + 1;
      const est = estimateReviewMinutes(nextNew.surahNumber, count, true);
      const pages = estimatePagesForRange(nextNew.surahNumber, nextNew.startAyah, nextNew.endAyah);
      tasks.push({
        id: `new_${todayDateKey}_s${nextNew.surahNumber}_${nextNew.startAyah}`,
        taskType: 'new_memorization',
        surahNumber: nextNew.surahNumber,
        juzNumber: getJuzForAyah(nextNew.surahNumber, nextNew.startAyah),
        startAyah: nextNew.startAyah,
        endAyah: nextNew.endAyah,
        pageStart: pages.pageStart,
        pageEnd: pages.pageEnd,
        estimatedMinutes: est,
        priority: 5,
        reasonKey: 'daily_new_memorization',
        completed: false,
      });
      usedMinutes += est;
    }
  }

  return {
    dateKey: todayDateKey,
    generatedAt: new Date().toISOString(),
    isLifelongMode: false,
    totalEstimatedMinutes: usedMinutes,
    completedTaskCount: 0,
    tasks,
    carriedOverCount,
  };
}
