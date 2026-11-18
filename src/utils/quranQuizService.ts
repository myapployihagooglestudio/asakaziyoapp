import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db, ensureFirestoreConnectivityChecked } from './firebaseClient';
import {
  getActiveQuranReciters,
  getGlobalAyahNumber,
  getIslamicNetworkAyahUrl,
  getQuranReciterAudioCapabilities,
  getReciterAyahAudioUrl,
  getReciterSurahAudioUrl,
  resolveUnifiedAyahContent,
} from '../data/quranData';
import type {
  DailyQuranQuizSet,
  QuranQuizArchiveSummaryItem,
  QuranQuizAttempt,
  QuranQuizHidePosition,
  QuranQuizQuestion,
} from '../types';

export const QURAN_QUIZ_USED_AYAHS_KEY = 'asaka_ziyo_quran_quiz_used_ayahs_v1';
export const USED_VERSES_STORAGE_KEY = 'used_verses';
export const QURAN_QUIZ_DAILY_CACHE_KEY = 'asaka_ziyo_quran_quiz_daily_v1';
export const QURAN_QUIZ_ATTEMPTS_KEY = 'asaka_ziyo_quran_quiz_attempts_v1';
export const QURAN_QUIZ_STREAK_KEY = 'asaka_ziyo_quran_quiz_streak_v1';
export const QURAN_QUIZ_RECITER_PREF_KEY = 'asaka_ziyo_quran_quiz_reciter_v1';

export function getTodayTashkentDateStr(now = new Date()): string {
  try {
    return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

export function getPreviousDateStr(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return dateStr;
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function getYesterdayTashkentDateStr(todayDateStr = getTodayTashkentDateStr()): string {
  return getPreviousDateStr(todayDateStr);
}

export function getUsedAyahKeys(): string[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const primaryRaw = window.localStorage.getItem(USED_VERSES_STORAGE_KEY);
    const legacyRaw = window.localStorage.getItem(QURAN_QUIZ_USED_AYAHS_KEY);
    const primaryList = primaryRaw ? JSON.parse(primaryRaw) : [];
    const legacyList = legacyRaw ? JSON.parse(legacyRaw) : [];
    const merged = [
      ...(Array.isArray(primaryList) ? primaryList : []),
      ...(Array.isArray(legacyList) ? legacyList : []),
    ]
      .map((item) => String(item).trim())
      .filter(Boolean);
    return Array.from(new Set(merged));
  } catch {
    return [];
  }
}

export function archiveUsedAyahKeys(keys: string[]): string[] {
  const existing = getUsedAyahKeys();
  const merged = Array.from(
    new Set([...existing, ...keys.map((k) => String(k).trim()).filter(Boolean)])
  );
  // Retain up to 2,500 historical ayah keys in localStorage while Firestore holds the permanent archive
  const trimmed = merged.length > 2500 ? merged.slice(merged.length - 2500) : merged;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const json = JSON.stringify(trimmed);
      window.localStorage.setItem(USED_VERSES_STORAGE_KEY, json);
      window.localStorage.setItem(QURAN_QUIZ_USED_AYAHS_KEY, json);
    }
  } catch {
    // ignore storage quota failure
  }
  return trimmed;
}

function isValidTenQuestionSet(quizSet: DailyQuranQuizSet | null | undefined): quizSet is DailyQuranQuizSet {
  return Boolean(
    quizSet &&
      Array.isArray(quizSet.questions) &&
      quizSet.questions.length === 10
  );
}

/**
 * Dynamically binds the selected reciter's per-ayah audio URLs to an existing 10-question quiz set
 * WITHOUT changing the day's 10 canonical verses, masked words, or answer options.
 */
export function rebindQuizSetToReciter(
  quizSet: DailyQuranQuizSet,
  reciterId: string,
  recitersList = getActiveQuranReciters()
): DailyQuranQuizSet {
  const cleanReciterId = String(reciterId || quizSet?.reciterId || 'mishary').trim();
  const reciterObj = recitersList.find((r) => r.id === cleanReciterId);
  const reciterName = reciterObj?.name || quizSet?.reciterName || 'Mishary Rashid Alafasy';
  const canonicalDate = String(quizSet?.dateStr || quizSet?.id || '').slice(0, 10);

  const reboundQuestions = (Array.isArray(quizSet?.questions) ? quizSet.questions : []).map((q) => {
    const primaryUrl = getReciterAyahAudioUrl(cleanReciterId, q.surahNumber, q.ayahNumberInSurah);
    const islamicUrl = getIslamicNetworkAyahUrl(cleanReciterId, q.surahNumber, q.ayahNumberInSurah);
    return normalizeQuizQuestion({
      ...q,
      reciterId: cleanReciterId,
      reciterName,
      audioUrl: primaryUrl || q.audioUrl,
      fallbackAudioUrl: islamicUrl || '',
    });
  });

  return {
    ...quizSet,
    id: canonicalDate || quizSet.id,
    dateStr: canonicalDate || quizSet.dateStr,
    reciterId: cleanReciterId,
    reciterName,
    questions: reboundQuestions,
    schemaVersion: 2,
  };
}

export function getCachedDailyQuranQuiz(
  dateStr: string,
  reciterId: string
): DailyQuranQuizSet | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(QURAN_QUIZ_DAILY_CACHE_KEY);
    if (!raw) return null;
    const cacheMap = JSON.parse(raw);
    const canonicalEntry = cacheMap?.[dateStr] || cacheMap?.[`${dateStr}_${reciterId}`];
    if (canonicalEntry && isValidTenQuestionSet(canonicalEntry)) {
      return rebindQuizSetToReciter(canonicalEntry as DailyQuranQuizSet, reciterId);
    }
    // Check if any reciter variant for this dateStr exists in cache
    for (const [k, val] of Object.entries(cacheMap || {})) {
      if (k.startsWith(`${dateStr}_`) && isValidTenQuestionSet(val as DailyQuranQuizSet)) {
        return rebindQuizSetToReciter(val as DailyQuranQuizSet, reciterId);
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function cacheDailyQuranQuiz(quizSet: DailyQuranQuizSet): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage || !isValidTenQuestionSet(quizSet)) return;
    const raw = window.localStorage.getItem(QURAN_QUIZ_DAILY_CACHE_KEY);
    const cacheMap: Record<string, DailyQuranQuizSet> = raw ? JSON.parse(raw) || {} : {};
    const canonicalDate = String(quizSet.dateStr || quizSet.id || '').slice(0, 10);
    if (!canonicalDate) return;

    // Keep only the last 7 daily quiz caches in localStorage (permanent archive lives in Firestore)
    const dateKeys = Object.keys(cacheMap).filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort();
    while (dateKeys.length >= 7 && !cacheMap[canonicalDate]) {
      const oldestKey = dateKeys.shift();
      if (oldestKey && oldestKey !== canonicalDate) {
        delete cacheMap[oldestKey];
      }
    }
    cacheMap[canonicalDate] = {
      ...quizSet,
      id: canonicalDate,
      dateStr: canonicalDate,
    };
    window.localStorage.setItem(QURAN_QUIZ_DAILY_CACHE_KEY, JSON.stringify(cacheMap));
  } catch {
    // ignore
  }
}

export function getDefaultQuizReciterId(recitersList = getActiveQuranReciters()): string {
  const readyReciters = recitersList.filter(
    (r) => getQuranReciterAudioCapabilities(r).quizReady
  );
  const stored = (() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(QURAN_QUIZ_RECITER_PREF_KEY) || '';
      }
    } catch {
      // ignore
    }
    return '';
  })();
  if (stored && readyReciters.some((r) => r.id === stored)) {
    return stored;
  }
  return readyReciters[0]?.id || recitersList[0]?.id || 'mishary';
}

export function getStoredQuranQuizReciterId(): string {
  return getDefaultQuizReciterId();
}

export function saveStoredQuranQuizReciterId(reciterId: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(QURAN_QUIZ_RECITER_PREF_KEY, reciterId);
    }
  } catch {
    // ignore
  }
}

export function getStoredQuranQuizAttempts(): QuranQuizAttempt[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = window.localStorage.getItem(QURAN_QUIZ_ATTEMPTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getAttemptsForDate(
  dateStr: string,
  attempts = getStoredQuranQuizAttempts()
): QuranQuizAttempt[] {
  const cleanDate = String(dateStr || '').slice(0, 10);
  return attempts.filter(
    (a) => String(a?.dateStr || a?.quizId || '').slice(0, 10) === cleanDate
  );
}

export function getBestAttemptForDate(
  dateStr: string,
  attempts = getStoredQuranQuizAttempts()
): QuranQuizAttempt | null {
  const list = getAttemptsForDate(dateStr, attempts);
  if (list.length === 0) return null;
  return list.reduce((best, curr) => (curr.score > best.score ? curr : best), list[0]);
}

export function getStoredQuranQuizStreak(): { count: number; lastDate: string } {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { count: 0, lastDate: '' };
    }
    const raw = window.localStorage.getItem(QURAN_QUIZ_STREAK_KEY);
    if (!raw) return { count: 0, lastDate: '' };
    const parsed = JSON.parse(raw);
    return {
      count: Number(parsed?.count) || 0,
      lastDate: String(parsed?.lastDate || ''),
    };
  } catch {
    return { count: 0, lastDate: '' };
  }
}

export function updateQuranQuizStreak(dateStr: string): { count: number; lastDate: string } {
  const current = getStoredQuranQuizStreak();
  if (current.lastDate === dateStr) {
    return current;
  }
  const yesterday = getPreviousDateStr(dateStr);
  const nextCount = current.lastDate === yesterday ? current.count + 1 : 1;
  const updated = { count: nextCount, lastDate: dateStr };
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(QURAN_QUIZ_STREAK_KEY, JSON.stringify(updated));
    }
  } catch {
    // ignore
  }
  return updated;
}

export function calculateAttemptSummary(
  questions: QuranQuizQuestion[],
  selectedAnswers: Record<number, { selectedIndex: number | null; responseTimeMs: number }>
): {
  score: number;
  incorrectCount: number;
  total: number;
  percentage: number;
} {
  const total = questions.length || 10;
  let score = 0;
  questions.forEach((q, idx) => {
    const pick = selectedAnswers[idx]?.selectedIndex;
    if (pick !== null && pick !== undefined && pick === q.correctIndex) {
      score += 1;
    }
  });
  const incorrectCount = Math.max(0, total - score);
  const percentage = Math.round((score / total) * 100);
  return { score, incorrectCount, total, percentage };
}

export class QuranQuizApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly retryAfterSeconds?: number;
  public readonly fallbackQuizzes: DailyQuranQuizSet[];

  constructor(params: {
    message: string;
    status: number;
    code?: string;
    retryAfterSeconds?: number;
    fallbackQuizzes?: DailyQuranQuizSet[];
  }) {
    super(params.message);
    this.name = 'QuranQuizApiError';
    this.status = params.status;
    this.code = params.code || 'QURAN_QUIZ_ERROR';
    this.retryAfterSeconds = params.retryAfterSeconds;
    this.fallbackQuizzes = Array.isArray(params.fallbackQuizzes) ? params.fallbackQuizzes : [];
  }
}

const inFlightQuizRequests = new Map<
  string,
  Promise<{ quizSet: DailyQuranQuizSet; source: string }>
>();

export async function fetchOrCreateDailyQuranQuiz(params: {
  dateStr?: string;
  reciterId?: string;
  forceRefresh?: boolean;
  createIfMissing?: boolean;
}): Promise<{ quizSet: DailyQuranQuizSet; source: string }> {
  const dateStr = params.dateStr || getTodayTashkentDateStr();
  const reciterId = params.reciterId || getStoredQuranQuizReciterId() || getDefaultQuizReciterId();
  const dedupeKey = `${dateStr}:${reciterId}:${Boolean(params.forceRefresh)}`;

  const existingPromise = inFlightQuizRequests.get(dedupeKey);
  if (existingPromise) {
    return existingPromise;
  }

  const run = async (): Promise<{ quizSet: DailyQuranQuizSet; source: string }> => {
    if (!params.forceRefresh) {
      const localCached = getCachedDailyQuranQuiz(dateStr, reciterId);
      if (localCached) {
        const hydratedLocal = await hydrateQuizSetFromQuranSection(
          rebindQuizSetToReciter(localCached, reciterId)
        );
        cacheDailyQuranQuiz(hydratedLocal);
        return { quizSet: hydratedLocal, source: 'localStorage' };
      }

      // Check Firestore directly first (canonical YYYY-MM-DD then legacy YYYY-MM-DD_reciterId)
      try {
        if (await ensureFirestoreConnectivityChecked()) {
          const canonicalSnap = await getDoc(doc(db, 'dailyQuranQuizzes', dateStr));
          if (canonicalSnap.exists()) {
            const remoteRaw = canonicalSnap.data() as DailyQuranQuizSet;
            if (isValidTenQuestionSet(remoteRaw)) {
              const rebound = rebindQuizSetToReciter(remoteRaw, reciterId);
              const hydratedRemote = await hydrateQuizSetFromQuranSection(rebound);
              cacheDailyQuranQuiz(hydratedRemote);
              archiveUsedAyahKeys(hydratedRemote.questions.map((q) => q.ayahKey));
              return { quizSet: hydratedRemote, source: 'firestore' };
            }
          }
          const legacySnap = await getDoc(doc(db, 'dailyQuranQuizzes', `${dateStr}_${reciterId}`));
          if (legacySnap.exists()) {
            const legacyRaw = legacySnap.data() as DailyQuranQuizSet;
            if (isValidTenQuestionSet(legacyRaw)) {
              const rebound = rebindQuizSetToReciter(legacyRaw, reciterId);
              const hydratedLegacy = await hydrateQuizSetFromQuranSection(rebound);
              cacheDailyQuranQuiz(hydratedLegacy);
              archiveUsedAyahKeys(hydratedLegacy.questions.map((q) => q.ayahKey));
              return { quizSet: hydratedLegacy, source: 'firestore' };
            }
          }
        }
      } catch {
        // Fallback gracefully to server API
      }
    }

    const usedAyahKeys = getUsedAyahKeys();
    const resp = await fetch('/api/quran-quiz/daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateStr,
        reciterId,
        usedAyahKeys,
        forceRefresh: Boolean(params.forceRefresh),
        createIfMissing: params.createIfMissing !== false,
      }),
    });

    const payload = await resp.json().catch(() => ({}));
    if (!resp.ok || !payload?.success || !payload?.quizSet) {
      throw new QuranQuizApiError({
        message:
          payload?.error ||
          `Kunlik Qurʼon viktorinasini tayyorlab boʻlmadi (HTTP ${resp.status}).`,
        status: resp.status,
        code: payload?.code,
        retryAfterSeconds: payload?.retryAfterSeconds,
        fallbackQuizzes: payload?.fallbackQuizzes,
      });
    }

    const quizSet: DailyQuranQuizSet = await hydrateQuizSetFromQuranSection(
      rebindQuizSetToReciter(normalizeDailyQuizSet(payload.quizSet), reciterId)
    );
    cacheDailyQuranQuiz(quizSet);
    archiveUsedAyahKeys(quizSet.questions.map((q) => q.ayahKey));
    return { quizSet, source: payload.source || 'gemini_audio' };
  };

  const promise = run().finally(() => {
    if (inFlightQuizRequests.get(dedupeKey) === promise) {
      inFlightQuizRequests.delete(dedupeKey);
    }
  });
  inFlightQuizRequests.set(dedupeKey, promise);
  return promise;
}

export async function fetchArchivedQuranQuizByDate(
  dateStr: string,
  reciterId = getStoredQuranQuizReciterId()
): Promise<{
  exists: boolean;
  quizSet: DailyQuranQuizSet | null;
  source: string;
  error?: string;
}> {
  const cleanDate = String(dateStr || '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
    return {
      exists: false,
      quizSet: null,
      source: 'none',
      error: 'Sana formati YYYY-MM-DD boʻlishi shart.',
    };
  }

  // 1. Check localStorage cache first
  const localCached = getCachedDailyQuranQuiz(cleanDate, reciterId);
  if (localCached) {
    const hydrated = await hydrateQuizSetFromQuranSection(
      rebindQuizSetToReciter(localCached, reciterId)
    );
    return { exists: true, quizSet: hydrated, source: 'localStorage' };
  }

  // 2. Check server permanent archive API (`/api/quran-quiz/by-date/:dateStr`)
  try {
    const resp = await fetch(
      `/api/quran-quiz/by-date/${encodeURIComponent(cleanDate)}?reciterId=${encodeURIComponent(reciterId)}`
    );
    const payload = await resp.json().catch(() => ({}));
    if (resp.ok && payload?.success && payload?.quizSet && isValidTenQuestionSet(payload.quizSet)) {
      const hydrated = await hydrateQuizSetFromQuranSection(
        rebindQuizSetToReciter(normalizeDailyQuizSet(payload.quizSet), reciterId)
      );
      cacheDailyQuranQuiz(hydrated);
      archiveUsedAyahKeys(hydrated.questions.map((q) => q.ayahKey));
      return { exists: true, quizSet: hydrated, source: payload.source || 'archive' };
    }
  } catch {
    // Fallback to direct Firestore check if server is offline
  }

  // 3. Direct Firestore fallback (`dailyQuranQuizzes/{YYYY-MM-DD}`)
  try {
    if (await ensureFirestoreConnectivityChecked()) {
      const snap = await getDoc(doc(db, 'dailyQuranQuizzes', cleanDate));
      if (snap.exists()) {
        const raw = snap.data() as DailyQuranQuizSet;
        if (isValidTenQuestionSet(raw)) {
          const hydrated = await hydrateQuizSetFromQuranSection(
            rebindQuizSetToReciter(normalizeDailyQuizSet(raw), reciterId)
          );
          cacheDailyQuranQuiz(hydrated);
          return { exists: true, quizSet: hydrated, source: 'firestore' };
        }
      }
    }
  } catch {
    // ignore
  }

  return {
    exists: false,
    quizSet: null,
    source: 'none',
    error: `${cleanDate} sanasi uchun Qurʼon viktorinasi arxivda mavjud emas.`,
  };
}

export async function fetchQuranQuizArchiveList(params?: {
  year?: string;
  month?: string;
}): Promise<{
  todayDateStr: string;
  yesterdayDateStr: string;
  totalArchivedDays: number;
  availableYears: string[];
  availableMonthsByYear: Record<string, string[]>;
  items: QuranQuizArchiveSummaryItem[];
}> {
  const todayDateStr = getTodayTashkentDateStr();
  const yesterdayDateStr = getYesterdayTashkentDateStr(todayDateStr);

  const query = new URLSearchParams();
  if (params?.year) query.set('year', params.year);
  if (params?.month) query.set('month', params.month);
  const qs = query.toString() ? `?${query.toString()}` : '';

  try {
    const resp = await fetch(`/api/quran-quiz/archive${qs}`);
    const payload = await resp.json().catch(() => ({}));
    if (resp.ok && payload?.success && Array.isArray(payload.items)) {
      return {
        todayDateStr: payload.todayDateStr || todayDateStr,
        yesterdayDateStr: payload.yesterdayDateStr || yesterdayDateStr,
        totalArchivedDays: Number(payload.totalArchivedDays) || payload.items.length,
        availableYears: Array.isArray(payload.availableYears) ? payload.availableYears : [],
        availableMonthsByYear: payload.availableMonthsByYear || {},
        items: payload.items,
      };
    }
  } catch {
    // Fallback to direct Firestore query if server endpoint is unreachable
  }

  try {
    if (await ensureFirestoreConnectivityChecked()) {
      const snap = await getDocs(collection(db, 'dailyQuranQuizzes'));
      const byDate = new Map<string, QuranQuizArchiveSummaryItem>();
      const yearsSet = new Set<string>();
      const monthsByYear: Record<string, string[]> = {};

      snap.docs.forEach((d) => {
        const data = d.data() as DailyQuranQuizSet;
        if (!isValidTenQuestionSet(data)) return;
        const dStr = String(data.dateStr || d.id || '').slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dStr)) return;
        const [yyyy, mm] = dStr.split('-');
        if (yyyy && mm) {
          yearsSet.add(yyyy);
          if (!monthsByYear[yyyy]) monthsByYear[yyyy] = [];
          if (!monthsByYear[yyyy].includes(mm)) monthsByYear[yyyy].push(mm);
        }
        if (!byDate.has(dStr) || d.id === dStr) {
          byDate.set(dStr, {
            id: dStr,
            dateStr: dStr,
            questionCount: data.questions.length,
            reciterId: data.reciterId || 'mishary',
            reciterName: data.reciterName || 'Mishary Rashid Alafasy',
            usedAyahKeys: Array.isArray(data.usedAyahKeys)
              ? data.usedAyahKeys
              : data.questions.map((q) => q.ayahKey),
            surahPreviewUz: Array.from(
              new Set(data.questions.map((q) => q.surahNameUz).filter(Boolean))
            ).slice(0, 4),
            createdAt: data.createdAt || `${dStr}T00:00:00.000Z`,
          });
        }
      });

      const items = Array.from(byDate.values()).sort((a, b) =>
        b.dateStr.localeCompare(a.dateStr)
      );
      return {
        todayDateStr,
        yesterdayDateStr,
        totalArchivedDays: items.length,
        availableYears: Array.from(yearsSet).sort((a, b) => b.localeCompare(a)),
        availableMonthsByYear: monthsByYear,
        items,
      };
    }
  } catch {
    // ignore
  }

  return {
    todayDateStr,
    yesterdayDateStr,
    totalArchivedDays: 0,
    availableYears: [],
    availableMonthsByYear: {},
    items: [],
  };
}

function getQuranQuizUserId(): string {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const existing =
        window.localStorage.getItem('asaka_ziyo_device_uid_v1') ||
        window.localStorage.getItem('asaka_ziyo_quiz_user_id');
      if (existing) return existing;
      const created = `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      window.localStorage.setItem('asaka_ziyo_device_uid_v1', created);
      return created;
    }
  } catch {
    // ignore
  }
  return `user-${Date.now().toString(36)}`;
}

export async function saveQuranQuizAttemptToCloud(
  attemptInput: Omit<QuranQuizAttempt, 'id' | 'userId'>
): Promise<{
  attempt: QuranQuizAttempt;
  attempts: QuranQuizAttempt[];
  streak: { count: number; lastDate: string };
}> {
  const userId = getQuranQuizUserId();
  const existing = getStoredQuranQuizAttempts();
  const cleanDate = String(attemptInput.dateStr || attemptInput.quizId || '').slice(0, 10);
  const sameDateCount = existing.filter(
    (a) => String(a?.dateStr || a?.quizId || '').slice(0, 10) === cleanDate
  ).length;

  const attempt: QuranQuizAttempt = {
    ...attemptInput,
    dateStr: cleanDate || attemptInput.dateStr,
    id: `qqa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userId,
    attemptNumber: attemptInput.attemptNumber || sameDateCount + 1,
  };

  const nextAttempts = [attempt, ...existing].slice(0, 100);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(QURAN_QUIZ_ATTEMPTS_KEY, JSON.stringify(nextAttempts));
    }
  } catch {
    // ignore
  }

  const streak = updateQuranQuizStreak(attempt.dateStr);

  // Sync to backend + Firestore cleanly (non-blocking if offline)
  try {
    await fetch('/api/quran-quiz/attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attempt }),
    });
  } catch {
    // Saved locally even if offline
  }

  return { attempt, attempts: nextAttempts, streak };
}

/**
 * Resolves reciter audio URL cleanly through local CORS-friendly byte-range proxy when needed.
 */
export function getQuizAudioPlayableUrl(rawUrl: string): string {
  const url = String(rawUrl || '').trim();
  if (!url) return '';
  if (url.startsWith('/') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  return `/api/quran-quiz/proxy-audio?url=${encodeURIComponent(url)}`;
}

/**
 * Strictly scopes decoded AudioBuffers by `${qariId}:${globalAyahNumber}` so changing reciters
 * never leaks stale buffers from a previous reciter.
 */
export function buildQuizAudioCacheKey(qariId: string, globalAyahNumber: number): string {
  return `${String(qariId || 'alijon').trim()}:${Math.max(1, Math.floor(Number(globalAyahNumber) || 1))}`;
}

export function normalizeQuizQuestion(q: QuranQuizQuestion): QuranQuizQuestion {
  const globalAyahNumber =
    Number(q.globalAyahNumber) > 0
      ? Math.floor(Number(q.globalAyahNumber))
      : getGlobalAyahNumber(q.surahNumber, q.ayahNumberInSurah);
  const durMs = Math.max(1000, Number(q.audioDurationMs) || Number(q.endTimeMs) || 4000);
  const hidePos: QuranQuizHidePosition =
    q.hidePos === 'start' || q.hidePos === 'middle' || q.hidePos === 'end'
      ? q.hidePos
      : 'end';
  const rawPauseRatio = Number(q.pauseRatio);
  const pauseRatio =
    Number.isFinite(rawPauseRatio) && rawPauseRatio > 0 && rawPauseRatio < 1
      ? rawPauseRatio
      : Math.max(0.15, Math.min(0.92, (Number(q.pauseBeforeLastWordMs) || durMs * 0.72) / durMs));
  const rawResumeRatio = Number(q.resumeRatio);
  const resumeRatio =
    Number.isFinite(rawResumeRatio) && rawResumeRatio > 0 && rawResumeRatio < 1
      ? rawResumeRatio
      : pauseRatio;

  const unified = resolveUnifiedAyahContent(q.surahNumber, q.ayahNumberInSurah, 'uz-Latn');
  const translationUz = (unified.translationUz || String(q.translationUz || '').trim()).trim();
  const translatorName =
    unified.translatorName ||
    q.translatorName ||
    (translationUz ? 'Shayx Muhammad Sodiq Muhammad Yusuf' : '');
  const translationSource =
    unified.translationSource ||
    q.translationSource ||
    (translationUz ? 'Tafsiri Hilol (Hilol Nashr)' : '');
  const tafsirTextUz = unified.tafsirTextUz || q.tafsirTextUz || '';
  const tafsirSource = unified.tafsirSource || q.tafsirSource || '';
  const tafsirScope =
    unified.tafsirScope !== 'none'
      ? unified.tafsirScope
      : q.tafsirScope || (tafsirTextUz ? 'ayah' : 'none');

  const reciterAyahPrimary = getReciterAyahAudioUrl(
    q.reciterId,
    q.surahNumber,
    q.ayahNumberInSurah
  );
  const reciterIslamicFallback = getIslamicNetworkAyahUrl(
    q.reciterId,
    q.surahNumber,
    q.ayahNumberInSurah
  );

  return {
    ...q,
    globalAyahNumber,
    hidePos,
    maskedArabicBefore:
      q.maskedArabicBefore !== undefined
        ? q.maskedArabicBefore
        : hidePos === 'start'
          ? ''
          : q.maskedArabicPrefix || '',
    maskedArabicAfter:
      q.maskedArabicAfter !== undefined
        ? q.maskedArabicAfter
        : hidePos === 'start'
          ? q.maskedArabicPrefix || ''
          : '',
    translationUz,
    translatorName,
    translationSource,
    tafsirTextUz,
    tafsirSource,
    tafsirScope,
    pauseRatio,
    resumeRatio,
    audioUrl: q.audioUrl || reciterAyahPrimary,
    fallbackAudioUrl:
      (q.fallbackAudioUrl &&
        (!q.fallbackAudioUrl.includes('ar.alafasy') || q.reciterId === 'mishary')
        ? q.fallbackAudioUrl
        : '') || reciterIslamicFallback,
  };
}

export function normalizeDailyQuizSet(quizSet: DailyQuranQuizSet): DailyQuranQuizSet {
  return {
    ...quizSet,
    questions: Array.isArray(quizSet?.questions)
      ? quizSet.questions.map(normalizeQuizQuestion)
      : [],
  };
}

const ayahTranslationFetchCache = new Map<string, { textAr: string; translationUz: string }>();

/**
 * Hydrates missing Shayx Muhammad Sodiq Muhammad Yusuf translation (`uz.sodik`)
 * directly from the Quran section's API source without ever invoking Gemini.
 */
export async function enrichQuizQuestionFromQuranSection(
  question: QuranQuizQuestion
): Promise<QuranQuizQuestion> {
  const normalized = normalizeQuizQuestion(question);
  if (normalized.translationUz && normalized.translationUz.trim().length > 0) {
    return normalized;
  }

  const key = `${normalized.surahNumber}:${normalized.ayahNumberInSurah}`;
  let cached = ayahTranslationFetchCache.get(key);
  if (!cached) {
    try {
      const resp = await fetch(
        `https://api.alquran.cloud/v1/ayah/${normalized.surahNumber}:${normalized.ayahNumberInSurah}/editions/quran-uthmani,uz.sodik`
      );
      if (resp.ok) {
        const payload = await resp.json();
        const editions = Array.isArray(payload?.data) ? payload.data : [];
        const arEdition =
          editions.find((e: any) => e?.edition?.identifier === 'quran-uthmani') || editions[0];
        const uzEdition =
          editions.find((e: any) => e?.edition?.identifier === 'uz.sodik') || editions[1];
        cached = {
          textAr: String(arEdition?.text || '').trim(),
          translationUz: String(uzEdition?.text || '').trim(),
        };
        if (cached.translationUz || cached.textAr) {
          ayahTranslationFetchCache.set(key, cached);
        }
      }
    } catch {
      // Keep honest empty state if offline
    }
  }

  if (!cached?.translationUz) {
    return normalized;
  }

  return {
    ...normalized,
    fullArabicText: normalized.fullArabicText || cached.textAr,
    translationUz: cached.translationUz,
    translatorName: 'Shayx Muhammad Sodiq Muhammad Yusuf',
    translationSource: 'Tafsiri Hilol (Hilol Nashr · uz.sodik)',
  };
}

/**
 * Hydrates every question in a quiz set with existing Quran section translation & tafsir.
 */
export async function hydrateQuizSetFromQuranSection(
  quizSet: DailyQuranQuizSet
): Promise<DailyQuranQuizSet> {
  const normalized = normalizeDailyQuizSet(quizSet);
  if (!normalized.questions.length) return normalized;
  const hydratedQuestions = await Promise.all(
    normalized.questions.map((q) => enrichQuizQuestionFromQuranSection(q))
  );
  return {
    ...normalized,
    questions: hydratedQuestions,
  };
}

/**
 * Computes exact Web Audio AudioBufferSourceNode.start(now, offsetSec, durationSec) bounds
 * for question & reveal phases according to hidePos ('start' | 'middle' | 'end').
 */
export function computeQuestionAudioSlice(params: {
  durationSec: number;
  hidePos?: QuranQuizHidePosition;
  pauseRatio?: number;
  resumeRatio?: number;
  pauseBeforeLastWordMs?: number;
  phase: 'question' | 'reveal';
}): { offsetSec: number; durationSec: number } {
  const dur = Math.max(0.25, Number(params.durationSec) || 0.25);
  const hidePos: QuranQuizHidePosition =
    params.hidePos === 'start' || params.hidePos === 'middle' || params.hidePos === 'end'
      ? params.hidePos
      : 'end';

  const fallbackRatio =
    Number(params.pauseBeforeLastWordMs) > 0
      ? Math.max(0.08, Math.min(0.93, Number(params.pauseBeforeLastWordMs) / (dur * 1000)))
      : 0.72;
  const pauseRatio =
    Number.isFinite(Number(params.pauseRatio)) &&
    Number(params.pauseRatio) > 0 &&
    Number(params.pauseRatio) < 1
      ? Math.max(0.06, Math.min(0.94, Number(params.pauseRatio)))
      : fallbackRatio;
  const resumeRatio =
    Number.isFinite(Number(params.resumeRatio)) &&
    Number(params.resumeRatio) > 0 &&
    Number(params.resumeRatio) < 1
      ? Math.max(0.06, Math.min(0.94, Number(params.resumeRatio)))
      : pauseRatio;

  if (params.phase === 'question') {
    if (hidePos === 'start') {
      const offsetSec = Math.min(Math.max(0.05, dur * resumeRatio), Math.max(0.05, dur - 0.15));
      return {
        offsetSec,
        durationSec: Math.max(0.1, dur - offsetSec),
      };
    }
    // Both 'end' and 'middle' play cleanly from 0 up to duration * pauseRatio
    const sliceDur = Math.min(dur, Math.max(0.15, dur * pauseRatio));
    return {
      offsetSec: 0,
      durationSec: sliceDur,
    };
  }

  // Reveal phase
  if (hidePos === 'end') {
    const offsetSec = Math.min(Math.max(0.05, dur * pauseRatio), Math.max(0.05, dur - 0.1));
    return {
      offsetSec,
      durationSec: Math.max(0.1, dur - offsetSec),
    };
  }

  // For 'start' and 'middle', reveal plays the complete ayah from 0 to end
  return {
    offsetSec: 0,
    durationSec: dur,
  };
}

export function buildQuizQuestionAudioCandidates(question: QuranQuizQuestion): string[] {
  const reciterResolvedPrimary = getReciterAyahAudioUrl(
    question.reciterId,
    question.surahNumber,
    question.ayahNumberInSurah
  );
  const islamicSlugUrl = getIslamicNetworkAyahUrl(
    question.reciterId,
    question.surahNumber,
    question.ayahNumberInSurah
  );
  const safeQuestionFallback =
    question.fallbackAudioUrl &&
    (!question.fallbackAudioUrl.includes('ar.alafasy') || question.reciterId === 'mishary')
      ? question.fallbackAudioUrl
      : '';

  // Strictly scope audio candidates to the selected reciter — never substitute Mishary for another reciter
  const rawUrls = [question.audioUrl, reciterResolvedPrimary, safeQuestionFallback || islamicSlugUrl]
    .map((u) => String(u || '').trim())
    .filter(Boolean);

  const uniqueRaw = Array.from(new Set(rawUrls));
  const candidates: string[] = [];
  for (const raw of uniqueRaw) {
    if (raw.startsWith('/') || raw.startsWith('blob:') || raw.startsWith('data:')) {
      candidates.push(raw);
      continue;
    }
    // Proxy same-origin URL guarantees clean CORS + ArrayBuffer access
    candidates.push(getQuizAudioPlayableUrl(raw));
    // Also keep direct CORS-enabled URL as secondary path
    if (raw.includes('cdn.islamic.network') || raw.includes('cdn.mp3quran.net')) {
      candidates.push(raw);
    }
  }
  return Array.from(new Set(candidates));
}

export async function fetchAndDecodeAudioBuffer(
  audioCtx: BaseAudioContext,
  candidateUrls: string[],
  signal?: AbortSignal
): Promise<AudioBuffer> {
  let lastError: unknown = null;
  for (const url of candidateUrls) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    try {
      const resp = await fetch(url, { signal });
      if (!resp.ok) {
        lastError = new Error(`Audio HTTP ${resp.status} for ${url}`);
        continue;
      }
      const arrayBuf = await resp.arrayBuffer();
      if (arrayBuf.byteLength < 512) {
        lastError = new Error(`Empty audio buffer (${arrayBuf.byteLength}B) for ${url}`);
        continue;
      }
      const decoded = await audioCtx.decodeAudioData(arrayBuf.slice(0));
      if (decoded && decoded.duration > 0.2) {
        return decoded;
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || signal?.aborted) {
        throw err;
      }
      lastError = err;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('Oyat audio faylini yuklab va dekodlab boʻlmadi.');
}

/**
 * Pure Web Audio API AudioBuffer Slicing & Quiz Sound Engine:
 * - Zero <audio> tag usage — prevents hidden word leaks via AudioBufferSourceNode.start(now, offset, duration)
 * - Strictly caches decoded AudioBuffers by `${qariId}:${globalAyahNumber}` and clears stale reciter keys
 * - Supports fallback CORS-enabled streams (`https://cdn.islamic.network/quran/audio/128/{reciter}/{globalAyahNumber}.mp3`)
 *   and 1-114 surah MP3 fetch + decodeAudioData (including Shayx Alijon qori)
 * - Connects reciter voice, tick-tock clock, and reveal bell chime through a unified masterGain
 */
export class QuranQuizClockAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private voiceGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private activeSource: AudioBufferSourceNode | null = null;
  private activePlaybackId = 0;
  private activeReciterId = '';
  private bufferCache = new Map<string, AudioBuffer>();
  private inFlightDecodes = new Map<string, Promise<AudioBuffer>>();
  private activeAbortController: AbortController | null = null;
  private tickIntervalId: number | null = null;
  private tickStep = 0;

  private playStartedAtCtxSec = 0;
  private playBaseOffsetSec = 0;
  private playRemainingDurationSec = 0;

  private ensureContext(): AudioContext | null {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      if (!this.ctx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 128;
        this.analyser.smoothingTimeConstant = 0.78;

        this.voiceGain = this.ctx.createGain();
        this.voiceGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        this.voiceGain.connect(this.analyser);
        this.analyser.connect(this.masterGain);
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public unlock(): void {
    this.ensureContext();
  }

  public async unlockAsync(): Promise<AudioContext | null> {
    const ctx = this.ensureContext();
    if (!ctx) return null;
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        // ignore
      }
    }
    return ctx;
  }

  /**
   * Invalidates and purges cached buffers from previous reciters cleanly whenever qari changes.
   */
  public setActiveReciter(reciterId: string): void {
    const cleanId = String(reciterId || '').trim();
    if (this.activeReciterId && this.activeReciterId !== cleanId) {
      this.stopVoice();
      this.stopTicking();
      try {
        this.activeAbortController?.abort();
      } catch {
        // ignore
      }
      this.activeAbortController = null;
      for (const key of Array.from(this.bufferCache.keys())) {
        if (!key.startsWith(`${cleanId}:`)) {
          this.bufferCache.delete(key);
        }
      }
      for (const key of Array.from(this.inFlightDecodes.keys())) {
        if (!key.startsWith(`${cleanId}:`)) {
          this.inFlightDecodes.delete(key);
        }
      }
    }
    this.activeReciterId = cleanId;
  }

  public getCachedBuffer(reciterId: string, globalAyahNumber: number): AudioBuffer | null {
    const key = buildQuizAudioCacheKey(reciterId, globalAyahNumber);
    return this.bufferCache.get(key) || null;
  }

  public async loadQuestionBuffer(question: QuranQuizQuestion): Promise<AudioBuffer> {
    const ctx = await this.unlockAsync();
    if (!ctx) {
      throw new Error('Web Audio API AudioContext yaratib boʻlmadi.');
    }

    const q = normalizeQuizQuestion(question);
    this.setActiveReciter(q.reciterId);

    const cacheKey = buildQuizAudioCacheKey(q.reciterId, q.globalAyahNumber);
    const cached = this.bufferCache.get(cacheKey);
    if (cached) return cached;

    const existingPromise = this.inFlightDecodes.get(cacheKey);
    if (existingPromise) return existingPromise;

    if (!this.activeAbortController) {
      this.activeAbortController = new AbortController();
    }
    const signal = this.activeAbortController.signal;
    const candidates = buildQuizQuestionAudioCandidates(q);

    const decodePromise = fetchAndDecodeAudioBuffer(ctx, candidates, signal)
      .then((decoded) => {
        // Only cache if reciter hasn't changed while fetching
        if (this.activeReciterId === q.reciterId) {
          this.bufferCache.set(cacheKey, decoded);
        }
        return decoded;
      })
      .finally(() => {
        if (this.inFlightDecodes.get(cacheKey) === decodePromise) {
          this.inFlightDecodes.delete(cacheKey);
        }
      });

    this.inFlightDecodes.set(cacheKey, decodePromise);
    return decodePromise;
  }

  /**
   * Fetches & decodes any full Surah (1..114) MP3 via Web Audio decodeAudioData (including Shayx Alijon qori).
   */
  public async loadSurahBuffer(reciterId: string, surahNumber: number): Promise<AudioBuffer> {
    const ctx = await this.unlockAsync();
    if (!ctx) {
      throw new Error('Web Audio API AudioContext yaratib boʻlmadi.');
    }
    const url = getReciterSurahAudioUrl(reciterId, surahNumber);
    if (!url) {
      throw new Error(`${reciterId} uchun ${surahNumber}-sura audiosi topilmadi.`);
    }
    const candidates = Array.from(new Set([url, getQuizAudioPlayableUrl(url)]));
    return fetchAndDecodeAudioBuffer(ctx, candidates);
  }

  public stopVoice(): void {
    this.activePlaybackId += 1;
    if (this.activeSource) {
      try {
        this.activeSource.onended = null;
        this.activeSource.stop();
        this.activeSource.disconnect();
      } catch {
        // already stopped
      }
      this.activeSource = null;
    }
    this.resetAudioGain();
  }

  public getCurrentPlaybackOffsetSec(): number {
    if (!this.ctx || !this.activeSource) return this.playBaseOffsetSec;
    const elapsed = Math.max(0, this.ctx.currentTime - this.playStartedAtCtxSec);
    return Math.min(
      this.playBaseOffsetSec + this.playRemainingDurationSec,
      this.playBaseOffsetSec + elapsed
    );
  }

  public playBufferSlice(params: {
    buffer: AudioBuffer;
    offsetSec: number;
    durationSec: number;
    fadeOutSec?: number;
    fadeInSec?: number;
    onEnded?: () => void;
  }): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.voiceGain) {
      params.onEnded?.();
      return;
    }

    this.stopVoice();
    const myPlaybackId = this.activePlaybackId;
    const dur = params.buffer.duration;
    const safeOffset = Math.max(0, Math.min(dur - 0.05, params.offsetSec));
    const safeDuration = Math.max(0.05, Math.min(dur - safeOffset, params.durationSec));

    const source = ctx.createBufferSource();
    source.buffer = params.buffer;
    source.connect(this.voiceGain);

    const now = ctx.currentTime;
    const g = this.voiceGain.gain;
    g.cancelScheduledValues(now);

    if (params.fadeInSec && params.fadeInSec > 0) {
      const fIn = Math.min(params.fadeInSec, safeDuration * 0.25);
      g.setValueAtTime(0.01, now);
      g.linearRampToValueAtTime(1.0, now + fIn);
    } else {
      g.setValueAtTime(1.0, now);
    }

    if (params.fadeOutSec && params.fadeOutSec > 0 && safeDuration > 0.25) {
      const fOut = Math.min(params.fadeOutSec, safeDuration * 0.25);
      g.setValueAtTime(1.0, now + Math.max(0, safeDuration - fOut));
      g.linearRampToValueAtTime(0.001, now + safeDuration);
    }

    this.playStartedAtCtxSec = now;
    this.playBaseOffsetSec = safeOffset;
    this.playRemainingDurationSec = safeDuration;
    this.activeSource = source;

    source.onended = () => {
      if (this.activePlaybackId !== myPlaybackId) return;
      this.activeSource = null;
      this.resetAudioGain();
      params.onEnded?.();
    };

    // Sample-accurate millisecond slice: stops strictly at safeOffset + safeDuration
    source.start(now, safeOffset, safeDuration);
  }

  public fadeAudioTo(targetGain: number, durationSec = 0.16): void {
    try {
      if (!this.ctx || !this.voiceGain) return;
      const now = this.ctx.currentTime;
      const gainParam = this.voiceGain.gain;
      gainParam.cancelScheduledValues(now);
      gainParam.setValueAtTime(Math.max(0.001, gainParam.value), now);
      gainParam.linearRampToValueAtTime(Math.max(0.0001, targetGain), now + durationSec);
    } catch {
      // ignore
    }
  }

  public resetAudioGain(): void {
    try {
      if (!this.ctx || !this.voiceGain) return;
      const now = this.ctx.currentTime;
      this.voiceGain.gain.cancelScheduledValues(now);
      this.voiceGain.gain.setValueAtTime(1.0, now);
    } catch {
      // ignore
    }
  }

  public getFrequencyBins(binCount = 24): number[] {
    const fallback = new Array(binCount).fill(0);
    if (!this.analyser) return fallback;
    try {
      const data = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(data);
      const out: number[] = [];
      const usableLen = Math.max(1, Math.min(data.length, 44));
      for (let i = 0; i < binCount; i++) {
        const idx = Math.floor((i / binCount) * usableLen);
        out.push((data[idx] || 0) / 255);
      }
      return out;
    } catch {
      return fallback;
    }
  }

  private playSingleTick(isAccent: boolean): void {
    try {
      const ctx = this.ensureContext();
      if (!ctx || ctx.state !== 'running' || !this.masterGain) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isAccent ? 1120 : 840, now);
      osc.frequency.exponentialRampToValueAtTime(isAccent ? 440 : 340, now + 0.042);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(isAccent ? 0.11 : 0.075, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.065);
    } catch {
      // ignore synthesis failure
    }
  }

  public startTicking(): void {
    this.stopTicking();
    this.tickStep = 0;
    this.playSingleTick(true);
    this.tickIntervalId = window.setInterval(() => {
      this.tickStep += 1;
      this.playSingleTick(this.tickStep % 2 === 0);
    }, 500);
  }

  public stopTicking(): void {
    if (this.tickIntervalId !== null) {
      window.clearInterval(this.tickIntervalId);
      this.tickIntervalId = null;
    }
  }

  public playRevealChime(isCorrect: boolean): void {
    try {
      const ctx = this.ensureContext();
      if (!ctx || ctx.state !== 'running' || !this.masterGain) return;

      const now = ctx.currentTime;
      const freqs = isCorrect ? [523.25, 659.25, 1046.5] : [440, 554.37, 880];
      freqs.forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startAt = now + idx * 0.045;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startAt);
        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.linearRampToValueAtTime(0.085 / (idx + 1), startAt + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.62);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(startAt);
        osc.stop(startAt + 0.65);
      });
    } catch {
      // ignore
    }
  }

  public dispose(): void {
    this.stopVoice();
    this.stopTicking();
    try {
      this.activeAbortController?.abort();
    } catch {
      // ignore
    }
    this.bufferCache.clear();
    this.inFlightDecodes.clear();
    try {
      this.voiceGain?.disconnect();
      this.analyser?.disconnect();
      this.masterGain?.disconnect();
    } catch {
      // ignore
    }
    this.voiceGain = null;
    this.analyser = null;
    this.masterGain = null;
    try {
      if (this.ctx && this.ctx.state !== 'closed') {
        void this.ctx.close();
      }
    } catch {
      // ignore
    }
    this.ctx = null;
  }
}
