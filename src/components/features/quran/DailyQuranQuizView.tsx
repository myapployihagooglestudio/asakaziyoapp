import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Flame,
  Trophy,
  CheckCircle2,
  XCircle,
  Headphones,
  Clock,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  History,
  BookOpen,
  Film,
  Sparkles,
  Download,
  Share2,
  X,
  ChevronDown,
  Calendar,
  Archive,
  FolderOpen,
  Search,
} from 'lucide-react';
import {
  getActiveQuranReciters,
  getQuranReciterAudioCapabilities,
} from '../../../data/quranData';
import { subscribeToDatabase } from '../../../utils/databaseService';
import { syncRecitersAndAudioFromFirestore } from '../../../utils/quranReciterStorageService';
import type {
  DailyQuranQuizSet,
  QuranQuizArchiveSummaryItem,
  QuranQuizAttempt,
  QuranQuizAttemptAnswer,
  QuranQuizQuestion,
  QuranReciter,
} from '../../../types';
import {
  QuranQuizApiError,
  QuranQuizClockAudio,
  cacheDailyQuranQuiz,
  calculateAttemptSummary,
  computeQuestionAudioSlice,
  enrichQuizQuestionFromQuranSection,
  fetchArchivedQuranQuizByDate,
  fetchOrCreateDailyQuranQuiz,
  fetchQuranQuizArchiveList,
  getAttemptsForDate,
  getBestAttemptForDate,
  getDefaultQuizReciterId,
  getStoredQuranQuizAttempts,
  getStoredQuranQuizReciterId,
  getStoredQuranQuizStreak,
  getTodayTashkentDateStr,
  getUsedAyahKeys,
  getYesterdayTashkentDateStr,
  normalizeDailyQuizSet,
  normalizeQuizQuestion,
  rebindQuizSetToReciter,
  saveQuranQuizAttemptToCloud,
  saveStoredQuranQuizReciterId,
} from '../../../utils/quranQuizService';
import {
  exportQuizPartMP4Video,
  formatQuizMp4Filename,
  shareServerMp4Video,
  triggerServerMp4Download,
  type QuizPartExportResult,
} from '../../../utils/cinemaQuizExporter';

type QuizPhase =
  | 'loading'
  | 'error'
  | 'ready'
  | 'playing_prefix'
  | 'countdown_waiting'
  | 'revealed_playing_tail'
  | 'finished';

type QuizArchiveSectionTab = 'today' | 'yesterday' | 'previous' | 'archive';

const UZBEK_MONTH_NAMES: Record<string, string> = {
  '01': 'Yanvar',
  '02': 'Fevral',
  '03': 'Mart',
  '04': 'Aprel',
  '05': 'May',
  '06': 'Iyun',
  '07': 'Iyul',
  '08': 'Avgust',
  '09': 'Sentabr',
  '10': 'Oktabr',
  '11': 'Noyabr',
  '12': 'Dekabr',
};

const TIMER_DURATION_MS = 3500;
const VISUALIZER_BAR_COUNT = 24;

interface QuizPartExportSlot {
  status: 'idle' | 'rendering' | 'ready' | 'error';
  progressPct: number;
  stageLabel: string;
  errorText: string;
  result: (QuizPartExportResult & { sizeMb: string; title: string }) | null;
}

const createInitialQuestionExports = (): Record<number, QuizPartExportSlot> => {
  const map: Record<number, QuizPartExportSlot> = {};
  for (let i = 1; i <= 10; i++) {
    map[i] = {
      status: 'idle',
      progressPct: 0,
      stageLabel: '',
      errorText: '',
      result: null,
    };
  }
  return map;
};

export const DailyQuranQuizView: React.FC = () => {
  const todayDateStr = useMemo(() => getTodayTashkentDateStr(), []);
  const yesterdayDateStr = useMemo(() => getYesterdayTashkentDateStr(todayDateStr), [todayDateStr]);
  const [reciters, setReciters] = useState<QuranReciter[]>(() => getActiveQuranReciters());

  const [selectedReciterId, setSelectedReciterId] = useState<string>(() =>
    getStoredQuranQuizReciterId()
  );
  const selectedReciterIdRef = useRef<string>(selectedReciterId);
  useEffect(() => {
    selectedReciterIdRef.current = selectedReciterId;
  }, [selectedReciterId]);

  const [activeSectionTab, setActiveSectionTab] = useState<QuizArchiveSectionTab>('today');
  const [activeQuizDateStr, setActiveQuizDateStr] = useState<string>(todayDateStr);
  const [archiveItems, setArchiveItems] = useState<QuranQuizArchiveSummaryItem[]>([]);
  const [archiveAvailableYears, setArchiveAvailableYears] = useState<string[]>([]);
  const [archiveMonthsByYear, setArchiveMonthsByYear] = useState<Record<string, string[]>>({});
  const [selectedArchiveYear, setSelectedArchiveYear] = useState<string>(() =>
    todayDateStr.slice(0, 4)
  );
  const [selectedArchiveMonth, setSelectedArchiveMonth] = useState<string>('all');
  const [selectedDatePickerStr, setSelectedDatePickerStr] = useState<string>(todayDateStr);
  const [archiveLoading, setArchiveLoading] = useState<boolean>(false);
  const [archiveStatusBanner, setArchiveStatusBanner] = useState<string>('');

  const [enrichedById, setEnrichedById] = useState<Record<string, QuranQuizQuestion>>({});
  const [quizSet, setQuizSet] = useState<DailyQuranQuizSet | null>(null);
  const [quizSource, setQuizSource] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isQuotaLimited, setIsQuotaLimited] = useState<boolean>(false);
  const [quotaFallbackQuizzes, setQuotaFallbackQuizzes] = useState<DailyQuranQuizSet[]>([]);
  const [usedVersesCount, setUsedVersesCount] = useState<number>(() => getUsedAyahKeys().length);

  const [phase, setPhase] = useState<QuizPhase>('loading');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isTickMuted, setIsTickMuted] = useState<boolean>(false);

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [timerRemainingMs, setTimerRemainingMs] = useState<number>(TIMER_DURATION_MS);
  const [waveBins, setWaveBins] = useState<number[]>(() =>
    new Array(VISUALIZER_BAR_COUNT).fill(0.08)
  );
  const [answersMap, setAnswersMap] = useState<
    Record<number, { selectedIndex: number | null; responseTimeMs: number }>
  >({});

  const [attempts, setAttempts] = useState<QuranQuizAttempt[]>(() =>
    getStoredQuranQuizAttempts()
  );
  const [streak, setStreak] = useState<{ count: number; lastDate: string }>(() =>
    getStoredQuranQuizStreak()
  );
  const [reviewPlayingIdx, setReviewPlayingIdx] = useState<number | null>(null);

  // Reading / Collapsible Translation & Tafsir Panel State
  const [revealedIndices, setRevealedIndices] = useState<number[]>([]);
  const [inspectedQuestionIndex, setInspectedQuestionIndex] = useState<number | null>(null);
  const [isTafsirPanelOpen, setIsTafsirPanelOpen] = useState<boolean>(true);
  const [isTailFinishedWaitingNext, setIsTailFinishedWaitingNext] = useState<boolean>(false);
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState<boolean>(false);

  // 10 Individual Question MP4 Video Export Slots (1.mp4 through 10.mp4)
  const [questionExports, setQuestionExports] = useState<Record<number, QuizPartExportSlot>>(() =>
    createInitialQuestionExports()
  );
  const [isBufferingAudio, setIsBufferingAudio] = useState<boolean>(false);
  const singleAbortRefs = useRef<Record<number, AbortController | null>>({});

  // Refs for precision Web Audio AudioBuffer slicing & particle canvas
  const particleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const clockAudioRef = useRef<QuranQuizClockAudio | null>(null);
  const playbackSessionRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const nextTimeoutRef = useRef<number | null>(null);
  const phaseRef = useRef<QuizPhase>('loading');
  const pausedBeforeFreezeRef = useRef<QuizPhase>('playing_prefix');
  const pauseAudioTimeSecRef = useRef<number>(0);
  const countdownDeadlineRef = useRef<number>(0);
  const countdownStartPerfRef = useRef<number>(0);
  const pausedRemainingMsRef = useRef<number>(TIMER_DURATION_MS);
  const selectedOptionRef = useRef<number | null>(null);
  const isTickMutedRef = useRef<boolean>(false);
  const autoAdvanceRef = useRef<boolean>(false);

  const isAnyVideoRendering = Object.values(questionExports).some(
    (slot) => slot?.status === 'rendering'
  );

  useEffect(() => {
    autoAdvanceRef.current = autoAdvanceEnabled;
  }, [autoAdvanceEnabled]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    selectedOptionRef.current = selectedOption;
  }, [selectedOption]);

  useEffect(() => {
    isTickMutedRef.current = isTickMuted;
    if (isTickMuted) {
      clockAudioRef.current?.stopTicking();
    }
  }, [isTickMuted]);

  // Ambient Golden Bokeh & Dust Particles inside the 9:16 Sacred Cinema Stage
  useEffect(() => {
    const canvas = particleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const width = 430;
    const height = 764;
    canvas.width = width;
    canvas.height = height;

    const particles = Array.from({ length: 36 }).map((_, i) => ({
      x: (i * 59) % width,
      y: (i * 103) % height,
      r: i % 5 === 0 ? 2.4 + (i % 3) * 0.9 : 0.9 + (i % 3) * 0.65,
      isBokeh: i % 5 === 0,
      speedY: 0.18 + (i % 5) * 0.11,
      driftPhase: i * 0.72,
      alpha: i % 5 === 0 ? 0.16 + (i % 3) * 0.08 : 0.24 + (i % 4) * 0.12,
    }));

    let animId = 0;
    let tick = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      tick += 0.015;
      for (const p of particles) {
        if (!prefersReducedMotion) {
          p.y -= p.speedY;
          if (p.y < -12) p.y = height + 12;
        }
        const px = p.x + Math.sin(tick + p.driftPhase) * (p.isBokeh ? 9 : 5);
        const pulseAlpha = p.alpha * (0.72 + 0.28 * Math.sin(tick * 2 + p.driftPhase));

        if (p.isBokeh) {
          const grad = ctx.createRadialGradient(px, p.y, 0, px, p.y, p.r * 3.2);
          grad.addColorStop(0, `rgba(255, 246, 200, ${pulseAlpha})`);
          grad.addColorStop(0.45, `rgba(223, 189, 105, ${pulseAlpha * 0.55})`);
          grad.addColorStop(1, 'rgba(212, 175, 55, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(px, p.y, p.r * 3.2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = `rgba(255, 246, 200, ${pulseAlpha})`;
          ctx.beginPath();
          ctx.arc(px, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (!prefersReducedMotion) {
        animId = window.requestAnimationFrame(draw);
      }
    };

    draw();
    return () => {
      if (animId) window.cancelAnimationFrame(animId);
    };
  }, []);

  const stopAllActiveTimersAndAudio = useCallback(() => {
    playbackSessionRef.current += 1;
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (nextTimeoutRef.current !== null) {
      window.clearTimeout(nextTimeoutRef.current);
      nextTimeoutRef.current = null;
    }
    clockAudioRef.current?.stopTicking();
    clockAudioRef.current?.stopVoice();
    setIsBufferingAudio(false);
    setWaveBins(new Array(VISUALIZER_BAR_COUNT).fill(0.08));
    setReviewPlayingIdx(null);
  }, []);

  useEffect(() => {
    clockAudioRef.current = new QuranQuizClockAudio();
    return () => {
      Object.values(singleAbortRefs.current).forEach((c) => c?.abort());
      stopAllActiveTimersAndAudio();
      clockAudioRef.current?.dispose();
    };
  }, [stopAllActiveTimersAndAudio]);

  useEffect(() => {
    let mounted = true;
    const refreshReciters = () => {
      const next = getActiveQuranReciters();
      if (!mounted) return;
      setReciters(next);
      setSelectedReciterId((curr) => {
        const currentObj = next.find((r) => r.id === curr);
        if (currentObj && getQuranReciterAudioCapabilities(currentObj).quizReady) {
          return curr;
        }
        const fallbackId = getDefaultQuizReciterId(next);
        saveStoredQuranQuizReciterId(fallbackId);
        return fallbackId;
      });
    };

    void syncRecitersAndAudioFromFirestore().then(refreshReciters);
    const unsub = subscribeToDatabase((event) => {
      if (event.type === 'QURAN_RECITERS_UPDATED' || event.type === 'QURAN_AUDIO_UPDATED') {
        refreshReciters();
      }
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  const refreshArchiveMetadata = useCallback(async () => {
    setArchiveLoading(true);
    try {
      const meta = await fetchQuranQuizArchiveList();
      setArchiveItems(meta.items);
      setArchiveAvailableYears(meta.availableYears);
      setArchiveMonthsByYear(meta.availableMonthsByYear);
      if (meta.availableYears.length > 0 && !meta.availableYears.includes(selectedArchiveYear)) {
        setSelectedArchiveYear(meta.availableYears[0]);
      }
      setUsedVersesCount(getUsedAyahKeys().length);
    } catch {
      // Best-effort archive refresh
    } finally {
      setArchiveLoading(false);
    }
  }, [selectedArchiveYear]);

  const loadQuiz = useCallback(
    async (reciterId: string, forceRefresh = false, targetDateStr = todayDateStr) => {
      Object.values(singleAbortRefs.current).forEach((c) => c?.abort());
      stopAllActiveTimersAndAudio();
      clockAudioRef.current?.setActiveReciter(reciterId);
      setPhase('loading');
      setErrorMessage('');
      setArchiveStatusBanner('');
      setQuestionExports(createInitialQuestionExports());
      setRevealedIndices([]);
      setInspectedQuestionIndex(null);
      setIsTailFinishedWaitingNext(false);
      setIsQuotaLimited(false);
      setQuotaFallbackQuizzes([]);
      setCurrentIndex(0);
      setSelectedOption(null);
      setAnswersMap({});
      setEnrichedById({});
      setTimerRemainingMs(TIMER_DURATION_MS);
      setIsPaused(false);
      setActiveQuizDateStr(targetDateStr);

      try {
        if (targetDateStr !== todayDateStr) {
          const archivedRes = await fetchArchivedQuranQuizByDate(targetDateStr, reciterId);
          if (!archivedRes.exists || !archivedRes.quizSet) {
            const msg = `${targetDateStr} sanasi uchun arxivda viktorina mavjud emas.`;
            setArchiveStatusBanner(msg);
            setErrorMessage(msg);
            setQuizSet(null);
            setPhase('error');
            return;
          }
          const bound = rebindQuizSetToReciter(
            normalizeDailyQuizSet(archivedRes.quizSet),
            reciterId,
            getActiveQuranReciters()
          );
          setQuizSet(bound);
          setQuizSource(archivedRes.source || 'archive_firestore');
          setUsedVersesCount(getUsedAyahKeys().length);
          setPhase('ready');
          void refreshArchiveMetadata();
          return;
        }

        const result = await fetchOrCreateDailyQuranQuiz({
          dateStr: todayDateStr,
          reciterId,
          forceRefresh,
        });
        const bound = rebindQuizSetToReciter(
          normalizeDailyQuizSet(result.quizSet),
          reciterId,
          getActiveQuranReciters()
        );
        setQuizSet(bound);
        setQuizSource(result.source);
        setUsedVersesCount(getUsedAyahKeys().length);
        setPhase('ready');
        void refreshArchiveMetadata();
      } catch (err: any) {
        if (err instanceof QuranQuizApiError) {
          setIsQuotaLimited(err.code === 'GEMINI_QUOTA_EXCEEDED' || err.status === 429);
          setQuotaFallbackQuizzes(err.fallbackQuizzes);
        }
        setErrorMessage(
          err?.message ||
            'Bugungi Qurʼon audio viktorinasini yuklashda xatolik yuz berdi.'
        );
        setPhase('error');
      }
    },
    [refreshArchiveMetadata, stopAllActiveTimersAndAudio, todayDateStr]
  );

  const initialLoadDoneRef = useRef<boolean>(false);
  useEffect(() => {
    if (initialLoadDoneRef.current) return;
    initialLoadDoneRef.current = true;
    void loadQuiz(selectedReciterIdRef.current, false, todayDateStr);
    void refreshArchiveMetadata();
  }, [loadQuiz, refreshArchiveMetadata, todayDateStr]);

  const handleSelectArchiveTab = useCallback(
    (tab: QuizArchiveSectionTab) => {
      if (isAnyVideoRendering) return;
      setActiveSectionTab(tab);
      setArchiveStatusBanner('');
      if (tab === 'today') {
        if (activeQuizDateStr !== todayDateStr || !quizSet || phase === 'error') {
          void loadQuiz(selectedReciterIdRef.current, false, todayDateStr);
        }
      } else if (tab === 'yesterday') {
        setSelectedDatePickerStr(yesterdayDateStr);
        void loadQuiz(selectedReciterIdRef.current, false, yesterdayDateStr);
      } else {
        void refreshArchiveMetadata();
      }
    },
    [activeQuizDateStr, isAnyVideoRendering, loadQuiz, phase, quizSet, refreshArchiveMetadata, todayDateStr, yesterdayDateStr]
  );

  const handleOpenArchiveDate = useCallback(
    (targetDateStr: string) => {
      const cleanDate = String(targetDateStr || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate) || isAnyVideoRendering) return;
      setSelectedDatePickerStr(cleanDate);
      if (cleanDate === todayDateStr) {
        setActiveSectionTab('today');
      } else if (cleanDate === yesterdayDateStr) {
        setActiveSectionTab('yesterday');
      }
      void loadQuiz(selectedReciterIdRef.current, false, cleanDate);
    },
    [isAnyVideoRendering, loadQuiz, todayDateStr, yesterdayDateStr]
  );

  const currentQuestion: QuranQuizQuestion | null = useMemo(() => {
    if (!quizSet?.questions?.length) return null;
    const raw = quizSet.questions[currentIndex];
    if (!raw) return null;
    const normalized = normalizeQuizQuestion(raw);
    return enrichedById[normalized.id] || normalized;
  }, [enrichedById, quizSet, currentIndex]);

  useEffect(() => {
    if (!currentQuestion || currentQuestion.translationUz) return;
    let cancelled = false;
    void enrichQuizQuestionFromQuranSection(currentQuestion).then((hydrated) => {
      if (cancelled) return;
      if (hydrated.translationUz && hydrated.translationUz !== currentQuestion.translationUz) {
        setEnrichedById((prev) => ({ ...prev, [hydrated.id]: hydrated }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [currentQuestion]);

  useEffect(() => {
    if (phase !== 'finished' || !quizSet?.questions?.length) return;
    let cancelled = false;
    const pending = quizSet.questions
      .map((q) => enrichedById[q.id] || normalizeQuizQuestion(q))
      .filter((q) => !q.translationUz);
    if (pending.length === 0) return;

    void Promise.all(pending.map((q) => enrichQuizQuestionFromQuranSection(q))).then((hydrated) => {
      if (cancelled) return;
      setEnrichedById((prev) => {
        const next = { ...prev };
        for (const item of hydrated) {
          next[item.id] = item;
        }
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [enrichedById, phase, quizSet]);

  const finishQuizAndSave = useCallback(
    async (
      finalMap: Record<number, { selectedIndex: number | null; responseTimeMs: number }>
    ) => {
      stopAllActiveTimersAndAudio();
      setPhase('finished');
      if (!quizSet) return;

      const summary = calculateAttemptSummary(quizSet.questions, finalMap);
      const answerRecords: QuranQuizAttemptAnswer[] = quizSet.questions.map((q, idx) => {
        const entry = finalMap[idx] || { selectedIndex: null, responseTimeMs: TIMER_DURATION_MS };
        const isCorrect = entry.selectedIndex !== null && entry.selectedIndex === q.correctIndex;
        return {
          questionId: q.id,
          ayahKey: q.ayahKey,
          selectedIndex: entry.selectedIndex,
          correctIndex: q.correctIndex,
          isCorrect,
          responseTimeMs: entry.responseTimeMs,
        };
      });

      const saved = await saveQuranQuizAttemptToCloud({
        quizId: quizSet.id,
        dateStr: quizSet.dateStr,
        reciterId: quizSet.reciterId,
        score: summary.score,
        incorrectCount: summary.incorrectCount,
        total: summary.total,
        percentage: summary.percentage,
        answers: answerRecords,
        completedAt: new Date().toISOString(),
      });
      setAttempts(saved.attempts);
      setStreak(saved.streak);
    },
    [quizSet, stopAllActiveTimersAndAudio]
  );

  const startQuestionPlaybackRef = useRef<(idx: number) => void>(() => {});

  const beginTailRevealPhase = useCallback(
    (question: QuranQuizQuestion, qIdx: number) => {
      const normalized = normalizeQuizQuestion(question);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      clockAudioRef.current?.stopTicking();
      clockAudioRef.current?.stopVoice();

      const chosen = selectedOptionRef.current;
      const isCorrect = chosen !== null && chosen === normalized.correctIndex;
      if (!isTickMutedRef.current) {
        clockAudioRef.current?.playRevealChime(isCorrect);
      }

      const elapsedMs = Math.max(
        0,
        Math.min(
          TIMER_DURATION_MS,
          Math.round(performance.now() - countdownStartPerfRef.current)
        )
      );

      setAnswersMap((prev) => ({
        ...prev,
        [qIdx]: {
          selectedIndex: chosen,
          responseTimeMs: chosen !== null ? elapsedMs : TIMER_DURATION_MS,
        },
      }));

      setTimerRemainingMs(0);
      setIsTailFinishedWaitingNext(false);
      setRevealedIndices((prev) => (prev.includes(qIdx) ? prev : [...prev, qIdx]));
      setInspectedQuestionIndex(qIdx);
      setIsTafsirPanelOpen(true);
      setPhase('revealed_playing_tail');
      phaseRef.current = 'revealed_playing_tail';

      const engine = clockAudioRef.current;
      const mySession = playbackSessionRef.current;
      if (!engine) return;

      const advanceAfterTail = () => {
        if (
          playbackSessionRef.current !== mySession ||
          phaseRef.current !== 'revealed_playing_tail'
        ) {
          return;
        }
        engine.stopVoice();
        setWaveBins(new Array(VISUALIZER_BAR_COUNT).fill(0.08));
        setIsTailFinishedWaitingNext(true);
        if (autoAdvanceRef.current) {
          nextTimeoutRef.current = window.setTimeout(() => {
            if (!quizSet || playbackSessionRef.current !== mySession) return;
            if (qIdx + 1 < quizSet.questions.length) {
              setCurrentIndex(qIdx + 1);
              startQuestionPlaybackRef.current(qIdx + 1);
            } else {
              setAnswersMap((latest) => {
                void finishQuizAndSave(latest);
                return latest;
              });
            }
          }, 2200);
        }
      };

      const monitorRevealVisualizer = () => {
        if (
          playbackSessionRef.current !== mySession ||
          phaseRef.current !== 'revealed_playing_tail'
        ) {
          return;
        }
        const bins = engine.getFrequencyBins(VISUALIZER_BAR_COUNT);
        if (bins) setWaveBins(bins);
        rafRef.current = window.requestAnimationFrame(monitorRevealVisualizer);
      };

      void engine
        .loadQuestionBuffer(normalized)
        .then((decodedBuffer) => {
          if (
            playbackSessionRef.current !== mySession ||
            phaseRef.current !== 'revealed_playing_tail'
          ) {
            return;
          }
          const rSlice = computeQuestionAudioSlice({
            durationSec: decodedBuffer.duration,
            hidePos: normalized.hidePos,
            pauseRatio: normalized.pauseRatio,
            resumeRatio: normalized.resumeRatio,
            pauseBeforeLastWordMs: normalized.pauseBeforeLastWordMs,
            phase: 'reveal',
          });
          engine.playBufferSlice({
            buffer: decodedBuffer,
            offsetSec: rSlice.offsetSec,
            durationSec: rSlice.durationSec,
            fadeInSec: 0.06,
            onEnded: advanceAfterTail,
          });
          rafRef.current = window.requestAnimationFrame(monitorRevealVisualizer);
        })
        .catch(() => {
          advanceAfterTail();
        });
    },
    [finishQuizAndSave, quizSet]
  );

  const beginCountdownPhase = useCallback(
    (question: QuranQuizQuestion, qIdx: number, resumeRemainingMs = TIMER_DURATION_MS) => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      clockAudioRef.current?.stopVoice();
      setIsBufferingAudio(false);
      setWaveBins(new Array(VISUALIZER_BAR_COUNT).fill(0.08));

      setPhase('countdown_waiting');
      phaseRef.current = 'countdown_waiting';
      setIsPaused(false);
      setTimerRemainingMs(resumeRemainingMs);

      if (resumeRemainingMs === TIMER_DURATION_MS) {
        countdownStartPerfRef.current = performance.now();
      }
      countdownDeadlineRef.current = performance.now() + resumeRemainingMs;

      if (!isTickMutedRef.current) {
        clockAudioRef.current?.startTicking();
      }

      const tickFrame = () => {
        if (phaseRef.current !== 'countdown_waiting') return;
        const left = Math.max(0, countdownDeadlineRef.current - performance.now());
        pausedRemainingMsRef.current = left;
        setTimerRemainingMs(left);
        if (left <= 0) {
          beginTailRevealPhase(question, qIdx);
          return;
        }
        rafRef.current = window.requestAnimationFrame(tickFrame);
      };

      rafRef.current = window.requestAnimationFrame(tickFrame);
    },
    [beginTailRevealPhase]
  );

  const startQuestionPlayback = useCallback(
    (qIdx: number, customStartOffsetSec?: number) => {
      if (!quizSet || !quizSet.questions[qIdx]) return;
      const question = normalizeQuizQuestion(quizSet.questions[qIdx]);

      stopAllActiveTimersAndAudio();
      const mySession = playbackSessionRef.current;
      const engine = clockAudioRef.current;
      if (!engine) return;

      engine.setActiveReciter(question.reciterId);
      engine.unlock();

      if (customStartOffsetSec === undefined) {
        setSelectedOption(null);
        selectedOptionRef.current = null;
        setTimerRemainingMs(TIMER_DURATION_MS);
        pausedRemainingMsRef.current = TIMER_DURATION_MS;
        setIsTailFinishedWaitingNext(false);
      }
      setIsPaused(false);
      setIsBufferingAudio(true);
      setPhase('playing_prefix');
      phaseRef.current = 'playing_prefix';

      const monitorQuestionVisualizer = () => {
        if (
          playbackSessionRef.current !== mySession ||
          phaseRef.current !== 'playing_prefix'
        ) {
          return;
        }
        const bins = engine.getFrequencyBins(VISUALIZER_BAR_COUNT);
        if (bins) setWaveBins(bins);
        rafRef.current = window.requestAnimationFrame(monitorQuestionVisualizer);
      };

      void engine
        .loadQuestionBuffer(question)
        .then((decodedBuffer) => {
          if (
            playbackSessionRef.current !== mySession ||
            phaseRef.current !== 'playing_prefix'
          ) {
            return;
          }
          setIsBufferingAudio(false);

          const qSlice = computeQuestionAudioSlice({
            durationSec: decodedBuffer.duration,
            hidePos: question.hidePos,
            pauseRatio: question.pauseRatio,
            resumeRatio: question.resumeRatio,
            pauseBeforeLastWordMs: question.pauseBeforeLastWordMs,
            phase: 'question',
          });

          const sliceEndSec = qSlice.offsetSec + qSlice.durationSec;
          const playOffsetSec =
            customStartOffsetSec !== undefined
              ? Math.max(qSlice.offsetSec, Math.min(sliceEndSec - 0.08, customStartOffsetSec))
              : qSlice.offsetSec;
          const playDurationSec = Math.max(0.08, sliceEndSec - playOffsetSec);

          engine.playBufferSlice({
            buffer: decodedBuffer,
            offsetSec: playOffsetSec,
            durationSec: playDurationSec,
            fadeOutSec: question.hidePos === 'start' ? 0 : 0.14,
            onEnded: () => {
              if (
                playbackSessionRef.current === mySession &&
                phaseRef.current === 'playing_prefix'
              ) {
                beginCountdownPhase(question, qIdx, TIMER_DURATION_MS);
              }
            },
          });

          rafRef.current = window.requestAnimationFrame(monitorQuestionVisualizer);
        })
        .catch((err: any) => {
          if (err?.name === 'AbortError' || playbackSessionRef.current !== mySession) {
            return;
          }
          setIsBufferingAudio(false);
          setErrorMessage(
            'Oyat audio faylini yuklab va dekodlab boʻlmadi. Internet aloqasini tekshiring yoki boshqa qorini tanlang.'
          );
          setPhase('error');
        });
    },
    [beginCountdownPhase, quizSet, stopAllActiveTimersAndAudio]
  );

  useEffect(() => {
    startQuestionPlaybackRef.current = (idx: number) => startQuestionPlayback(idx);
  }, [startQuestionPlayback]);

  const handleTogglePlayPause = () => {
    if (!currentQuestion) return;
    clockAudioRef.current?.unlock();

    if (phase === 'ready') {
      startQuestionPlayback(currentIndex);
      return;
    }

    if (!isPaused) {
      if (phase === 'playing_prefix' || phase === 'countdown_waiting') {
        pausedBeforeFreezeRef.current = phase;
        setIsPaused(true);
        if (rafRef.current !== null) {
          window.cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        if (phase === 'playing_prefix' && clockAudioRef.current) {
          pauseAudioTimeSecRef.current = clockAudioRef.current.getCurrentPlaybackOffsetSec();
          clockAudioRef.current.stopVoice();
        }
        if (phase === 'countdown_waiting') {
          clockAudioRef.current?.stopTicking();
        }
      }
    } else {
      setIsPaused(false);
      if (pausedBeforeFreezeRef.current === 'playing_prefix') {
        startQuestionPlayback(currentIndex, pauseAudioTimeSecRef.current);
      } else if (pausedBeforeFreezeRef.current === 'countdown_waiting') {
        beginCountdownPhase(currentQuestion, currentIndex, pausedRemainingMsRef.current);
      }
    }
  };

  const handleReplayCurrentPrefix = () => {
    if (!currentQuestion) return;
    if (phase === 'revealed_playing_tail') return;
    startQuestionPlayback(currentIndex);
  };

  const handleProceedToNextQuestion = useCallback(() => {
    if (!quizSet) return;
    stopAllActiveTimersAndAudio();
    setIsTailFinishedWaitingNext(false);
    if (currentIndex + 1 < quizSet.questions.length) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      startQuestionPlayback(nextIdx);
    } else {
      void finishQuizAndSave(answersMap);
    }
  }, [answersMap, currentIndex, finishQuizAndSave, quizSet, startQuestionPlayback, stopAllActiveTimersAndAudio]);

  const handleJumpToShort = (idx: number) => {
    if (!quizSet || !quizSet.questions[idx] || isAnyVideoRendering) return;
    stopAllActiveTimersAndAudio();
    setIsTailFinishedWaitingNext(false);
    setCurrentIndex(idx);
    setSelectedOption(null);
    selectedOptionRef.current = null;
    setTimerRemainingMs(TIMER_DURATION_MS);
    setIsPaused(false);
    setPhase('ready');
  };

  const handleSelectOption = (optIdx: number) => {
    if (phase !== 'playing_prefix' && phase !== 'countdown_waiting') return;
    setSelectedOption(optIdx);
    selectedOptionRef.current = optIdx;
  };

  const handleRestartQuiz = () => {
    if (!quizSet) return;
    stopAllActiveTimersAndAudio();
    setIsTailFinishedWaitingNext(false);
    setRevealedIndices([]);
    setInspectedQuestionIndex(null);
    setCurrentIndex(0);
    setSelectedOption(null);
    setAnswersMap({});
    setTimerRemainingMs(TIMER_DURATION_MS);
    setIsPaused(false);
    setPhase('ready');
  };

  const handlePlayReviewAyah = (q: QuranQuizQuestion, idx: number) => {
    const engine = clockAudioRef.current;
    if (!engine) return;
    stopAllActiveTimersAndAudio();
    const mySession = playbackSessionRef.current;
    const normalized = normalizeQuizQuestion(q);
    engine.setActiveReciter(normalized.reciterId);
    engine.unlock();
    setReviewPlayingIdx(idx);

    void engine
      .loadQuestionBuffer(normalized)
      .then((decodedBuffer) => {
        if (playbackSessionRef.current !== mySession) return;
        engine.playBufferSlice({
          buffer: decodedBuffer,
          offsetSec: 0,
          durationSec: decodedBuffer.duration,
          onEnded: () => {
            if (playbackSessionRef.current === mySession) {
              setReviewPlayingIdx(null);
            }
          },
        });
      })
      .catch(() => {
        if (playbackSessionRef.current === mySession) {
          setReviewPlayingIdx(null);
        }
      });
  };

  const handleReciterChange = (newReciterId: string) => {
    if (newReciterId === selectedReciterId || isAnyVideoRendering) return;
    const rec = reciters.find((r) => r.id === newReciterId);
    if (rec && !getQuranReciterAudioCapabilities(rec).quizReady) {
      return;
    }
    stopAllActiveTimersAndAudio();
    clockAudioRef.current?.setActiveReciter(newReciterId);
    saveStoredQuranQuizReciterId(newReciterId);
    setSelectedReciterId(newReciterId);
    selectedReciterIdRef.current = newReciterId;

    if (quizSet) {
      const rebound = rebindQuizSetToReciter(quizSet, newReciterId, reciters);
      setQuizSet(rebound);
      cacheDailyQuranQuiz(rebound);
      setQuestionExports(createInitialQuestionExports());
      setEnrichedById((prev) => {
        const next: Record<string, QuranQuizQuestion> = {};
        for (const q of rebound.questions) {
          const existing = prev[q.id];
          if (existing) {
            next[q.id] = {
              ...existing,
              reciterId: q.reciterId,
              reciterName: q.reciterName,
              audioUrl: q.audioUrl,
              fallbackAudioUrl: q.fallbackAudioUrl,
            };
          }
        }
        return next;
      });
      if (phase !== 'finished' && phase !== 'loading' && phase !== 'error') {
        setIsPaused(false);
        setTimerRemainingMs(TIMER_DURATION_MS);
        setPhase('ready');
      }
    } else {
      void loadQuiz(newReciterId, false, activeQuizDateStr);
    }
  };

  const handleExportSingleQuestionVideo = async (qIndex: number) => {
    if (!quizSet?.questions?.[qIndex]) return;
    const partIndex = qIndex + 1;
    const canonicalFilename = formatQuizMp4Filename(partIndex);
    if (questionExports[partIndex]?.status === 'rendering') return;

    const rawQ = quizSet.questions[qIndex];
    stopAllActiveTimersAndAudio();
    singleAbortRefs.current[partIndex]?.abort();
    const controller = new AbortController();
    singleAbortRefs.current[partIndex] = controller;

    setQuestionExports((prev) => ({
      ...prev,
      [partIndex]: {
        status: 'rendering',
        progressPct: 1,
        stageLabel: `${partIndex}-savol (${canonicalFilename}) tayyorlanmoqda...`,
        errorText: '',
        result: null,
      },
    }));

    try {
      const base = enrichedById[rawQ.id] || normalizeQuizQuestion(rawQ);
      const hydrated = base.translationUz ? base : await enrichQuizQuestionFromQuranSection(base);

      if (controller.signal.aborted) {
        throw new DOMException('Eksport bekor qilindi.', 'AbortError');
      }

      const reciterDisplayName =
        quizSet.reciterName ||
        reciters.find((r) => r.id === selectedReciterId)?.name ||
        hydrated.reciterName ||
        'Qori';

      const result = await exportQuizPartMP4Video({
        questionsPart: [hydrated],
        partIndex,
        partRangeLabel: `${partIndex}-savol`,
        globalStartNumber: partIndex,
        totalQuizQuestions: quizSet.questions.length,
        reciterName: reciterDisplayName,
        quizDateStr: quizSet.dateStr,
        scoreSummary: null,
        countdownMs: TIMER_DURATION_MS,
        signal: controller.signal,
        onProgress: (pct, label) => {
          setQuestionExports((prev) => ({
            ...prev,
            [partIndex]: {
              ...prev[partIndex],
              status: 'rendering',
              progressPct: pct,
              stageLabel: label,
            },
          }));
        },
      });

      const sizeMb = (result.sizeBytes / (1024 * 1024)).toFixed(2);
      const finalFilename = formatQuizMp4Filename(partIndex);
      const readyResult = {
        ...result,
        filename: finalFilename,
        sizeMb,
        title: `${partIndex}-savol (${hydrated.surahNameUz} surasi) — Asaka Ziyo`,
      };

      setQuestionExports((prev) => ({
        ...prev,
        [partIndex]: {
          status: 'ready',
          progressPct: 100,
          stageLabel: `${finalFilename} (${sizeMb} MB) yuklab olishga tayyor!`,
          errorText: '',
          result: readyResult,
        },
      }));
      await triggerServerMp4Download({
        downloadUrl: readyResult.downloadUrl,
        serverDownloadUrl: readyResult.serverDownloadUrl,
        filename: finalFilename,
        onProgress: (msg) => {
          setQuestionExports((prev) => ({
            ...prev,
            [partIndex]: {
              ...prev[partIndex],
              stageLabel: msg,
            },
          }));
        },
      });
    } catch (err: any) {
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        setQuestionExports((prev) => ({
          ...prev,
          [partIndex]: {
            ...prev[partIndex],
            status: 'idle',
            progressPct: 0,
            stageLabel: '',
          },
        }));
        return;
      }
      setQuestionExports((prev) => ({
        ...prev,
        [partIndex]: {
          status: 'error',
          progressPct: 0,
          stageLabel: '',
          errorText: err?.message || `${canonicalFilename} video eksportida xatolik yuz berdi.`,
          result: null,
        },
      }));
    } finally {
      if (singleAbortRefs.current[partIndex] === controller) {
        singleAbortRefs.current[partIndex] = null;
      }
    }
  };

  const handleDownloadReadyQuestionVideo = async (qIndex: number) => {
    const partIndex = qIndex + 1;
    const slot = questionExports[partIndex];
    if (slot?.status !== 'ready' || !slot.result) return;
    try {
      await triggerServerMp4Download({
        downloadUrl: slot.result.downloadUrl,
        serverDownloadUrl: slot.result.serverDownloadUrl,
        filename: slot.result.filename,
        onProgress: (msg) => {
          setQuestionExports((prev) => ({
            ...prev,
            [partIndex]: {
              ...prev[partIndex],
              stageLabel: msg,
            },
          }));
        },
      });
    } catch (err: any) {
      setQuestionExports((prev) => ({
        ...prev,
        [partIndex]: {
          ...prev[partIndex],
          errorText: err?.message || `${slot.result?.filename || 'MP4'} yuklab olishda xatolik.`,
        },
      }));
    }
  };

  const handleShareSingleQuestionVideo = async (qIndex: number) => {
    const partIndex = qIndex + 1;
    const slot = questionExports[partIndex];
    if (slot?.status !== 'ready' || !slot.result) return;
    await shareServerMp4Video({
      previewUrl: slot.result.previewUrl,
      downloadUrl: slot.result.downloadUrl,
      serverDownloadUrl: slot.result.serverDownloadUrl,
      filename: slot.result.filename,
      title: slot.result.title,
    });
  };

  const finishedSummary = useMemo(() => {
    if (!quizSet) return { score: 0, incorrectCount: 0, total: 10, percentage: 0 };
    return calculateAttemptSummary(quizSet.questions, answersMap);
  }, [answersMap, quizSet]);

  const timerProgressPct = Math.max(
    0,
    Math.min(100, (timerRemainingMs / TIMER_DURATION_MS) * 100)
  );
  const ringRadius = 25;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDashOffset =
    ringCircumference * (1 - (phase === 'revealed_playing_tail' ? 1 : timerProgressPct / 100));

  const activeGroupIdx = Math.min(3, Math.floor((currentIndex / 10) * 4));
  const isWaveformActive =
    (phase === 'playing_prefix' || phase === 'revealed_playing_tail') && !isPaused;

  const todayBestAttempt = useMemo(
    () => getBestAttemptForDate(todayDateStr, attempts),
    [attempts, todayDateStr]
  );
  const todayAttemptsCount = useMemo(
    () => getAttemptsForDate(todayDateStr, attempts).length,
    [attempts, todayDateStr]
  );
  const yesterdayBestAttempt = useMemo(
    () => getBestAttemptForDate(yesterdayDateStr, attempts),
    [attempts, yesterdayDateStr]
  );
  const yesterdayAttemptsCount = useMemo(
    () => getAttemptsForDate(yesterdayDateStr, attempts).length,
    [attempts, yesterdayDateStr]
  );
  const previousDaysItems = useMemo(
    () => archiveItems.filter((item) => item.dateStr !== todayDateStr),
    [archiveItems, todayDateStr]
  );
  const filteredArchiveItems = useMemo(() => {
    return archiveItems.filter((item) => {
      const [y, m] = item.dateStr.split('-');
      if (selectedArchiveYear && y !== selectedArchiveYear) return false;
      if (selectedArchiveMonth !== 'all' && m !== selectedArchiveMonth) return false;
      return true;
    });
  }, [archiveItems, selectedArchiveMonth, selectedArchiveYear]);

  return (
    <div className="max-w-6xl mx-auto pb-24 px-1 sm:px-3 space-y-5">
      {/* 4-TAB PERMANENT ARCHIVE & DAILY QUIZ NAVIGATION */}
      <section
        aria-label="Kunlik Qurʼon viktorinasi boʻlimlari va doimiy arxiv"
        className="rounded-3xl bg-[#F8F5EC] dark:bg-[#06241E] border border-[#063D32]/15 dark:border-[#C6A45C]/30 p-4 sm:p-5 shadow-sm space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-wider text-[#063D32] dark:text-[#C6A45C]">
              ASAKA ZIYO · DOIMIY QURʼON VIKTORINASI ARXIVI
            </p>
            <h2 className="text-base sm:text-lg font-display font-bold text-[#042B25] dark:text-[#F8F5EC]">
              Har kungi 10 ta savol abadiy saqlanadi — istalgan sanani qayta yeching
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono-numbers tabular-nums">
            <span className="px-3 py-1.5 rounded-xl bg-[#063D32] text-[#F8F5EC] border border-[#C6A45C]/40 font-semibold">
              Faol sana: {activeQuizDateStr}
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-white/80 dark:bg-[#041D18] text-[#042B25] dark:text-[#DCC58C] border border-[#063D32]/15 dark:border-[#C6A45C]/25 font-semibold">
              Arxiv: {archiveItems.length} kun
            </span>
          </div>
        </div>

        {/* 4 Section Tabs: 1. BUGUNGI | 2. KECHAGI | 3. OLDINGILAR | 4. ARXIVLAR */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(
            [
              {
                id: 'today' as QuizArchiveSectionTab,
                title: '1. BUGUNGI',
                sub: `${todayDateStr} · 10 savol`,
                icon: Sparkles,
              },
              {
                id: 'yesterday' as QuizArchiveSectionTab,
                title: '2. KECHAGI',
                sub: `${yesterdayDateStr} · 10 savol`,
                icon: Clock,
              },
              {
                id: 'previous' as QuizArchiveSectionTab,
                title: '3. OLDINGILAR',
                sub: `${previousDaysItems.length} ta kun`,
                icon: History,
              },
              {
                id: 'archive' as QuizArchiveSectionTab,
                title: '4. ARXIVLAR',
                sub: 'Sana · Yil · Oy',
                icon: Archive,
              },
            ]
          ).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSectionTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                disabled={isAnyVideoRendering}
                onClick={() => handleSelectArchiveTab(tab.id)}
                className={`min-h-[54px] px-3.5 py-2.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  isActive
                    ? 'bg-[#063D32] text-[#F8F5EC] border-[#C6A45C] shadow-md'
                    : 'bg-white/80 dark:bg-[#041D18] text-[#042B25] dark:text-[#F8F5EC] border-[#063D32]/15 dark:border-[#C6A45C]/20 hover:border-[#C6A45C]'
                }`}
              >
                <span
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive
                      ? 'bg-[#C6A45C]/25 text-[#DCC58C]'
                      : 'bg-[#063D32]/10 dark:bg-white/5 text-[#063D32] dark:text-[#C6A45C]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{tab.title}</div>
                  <div
                    className={`text-[10px] font-mono-numbers truncate ${
                      isActive ? 'text-[#DCC58C]' : 'text-[#5C746C] dark:text-[#8FA69E]'
                    }`}
                  >
                    {tab.sub}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Section 1: BUGUNGI Summary */}
        {activeSectionTab === 'today' && (
          <div className="rounded-2xl bg-white/80 dark:bg-[#041D18] border border-[#063D32]/12 dark:border-[#C6A45C]/25 p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-[#042B25] dark:text-[#F8F5EC] flex items-center gap-2">
                <span>Bugungi viktorina ({todayDateStr}) — 10 ta savol</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono-numbers">
                  10 savol
                </span>
              </div>
              <p className="text-xs text-[#5C746C] dark:text-[#8FA69E]">
                {todayBestAttempt
                  ? `Bugungi eng yaxshi natijangiz: ${todayBestAttempt.score} / ${todayBestAttempt.total} (${todayBestAttempt.percentage}%) · Urinishlar: ${todayAttemptsCount} marta`
                  : 'Bugungi 10 ta savol tayyor. Viktorinani boshlang yoki istalgan qori tilovatida tinglang.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {activeQuizDateStr !== todayDateStr ? (
                <button
                  type="button"
                  onClick={() => handleOpenArchiveDate(todayDateStr)}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-[#063D32] hover:bg-[#075747] text-[#F8F5EC] border border-[#C6A45C]/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 text-[#DCC58C]" />
                  <span>Bugungi 10 ta savolni ochish</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (phase === 'ready') startQuestionPlayback(0);
                    else handleRestartQuiz();
                  }}
                  disabled={phase === 'loading' || !quizSet}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-gradient-to-r from-[#C6A45C] to-[#DCC58C] text-[#031814] text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{phase === 'ready' ? 'Viktorinani boshlash' : 'Boshidan yechish'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Section 2: KECHAGI Summary */}
        {activeSectionTab === 'yesterday' && (
          <div className="rounded-2xl bg-white/80 dark:bg-[#041D18] border border-[#063D32]/12 dark:border-[#C6A45C]/25 p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-[#042B25] dark:text-[#F8F5EC] flex items-center gap-2">
                <span>Kechagi viktorina ({yesterdayDateStr})</span>
                <span className="px-2 py-0.5 rounded-md bg-[#C6A45C]/20 text-[#042B25] dark:text-[#DCC58C] text-[10px] font-mono-numbers">
                  10 savol
                </span>
              </div>
              <p className="text-xs text-[#5C746C] dark:text-[#8FA69E]">
                {archiveStatusBanner
                  ? archiveStatusBanner
                  : yesterdayBestAttempt
                    ? `Kechagi natijangiz: ${yesterdayBestAttempt.score} / ${yesterdayBestAttempt.total} (${yesterdayBestAttempt.percentage}%) · Urinishlar: ${yesterdayAttemptsCount} marta`
                    : 'Kechagi 10 ta savolni toʻliq qayta tinglab yechishingiz mumkin.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenArchiveDate(yesterdayDateStr)}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-[#063D32] hover:bg-[#075747] text-[#F8F5EC] border border-[#C6A45C]/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5 text-[#DCC58C]" />
                <span>Kechagi 10 ta savolni yuklash</span>
              </button>
              {quizSet && activeQuizDateStr === yesterdayDateStr && (
                <button
                  type="button"
                  onClick={() => {
                    if (phase === 'ready') startQuestionPlayback(0);
                    else handleRestartQuiz();
                  }}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-gradient-to-r from-[#C6A45C] to-[#DCC58C] text-[#031814] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Qayta yechish</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Section 3: OLDINGILAR (Previous Days List sorted descending) */}
        {activeSectionTab === 'previous' && (
          <div className="rounded-2xl bg-white/80 dark:bg-[#041D18] border border-[#063D32]/12 dark:border-[#C6A45C]/25 p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-[#042B25] dark:text-[#F8F5EC]">
                Oldingi kunlar viktorinalari (sana boʻyicha kamayish tartibida)
              </h3>
              <span className="text-[11px] font-mono-numbers text-[#5C746C] dark:text-[#8FA69E]">
                Jami: {archiveItems.length} kun
              </span>
            </div>

            {archiveLoading && archiveItems.length === 0 ? (
              <p className="text-xs text-[#5C746C] dark:text-[#8FA69E] py-3">
                Arxiv roʻyxati yuklanmoqda...
              </p>
            ) : archiveItems.length === 0 ? (
              <p className="text-xs text-[#5C746C] dark:text-[#8FA69E] py-3">
                Hozircha arxivlangan viktorinalar topilmadi.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[240px] overflow-y-auto pr-1">
                {archiveItems.map((item) => {
                  const bestAtt = getBestAttemptForDate(item.dateStr, attempts);
                  const attCount = getAttemptsForDate(item.dateStr, attempts).length;
                  const isOpened = activeQuizDateStr === item.dateStr;
                  return (
                    <div
                      key={item.dateStr}
                      className={`rounded-xl p-3 border transition-all flex flex-col justify-between gap-2 ${
                        isOpened
                          ? 'bg-[#063D32] text-[#F8F5EC] border-[#C6A45C]'
                          : 'bg-[#F8F5EC]/80 dark:bg-[#06241E] text-[#042B25] dark:text-[#F8F5EC] border-[#063D32]/15 dark:border-[#C6A45C]/20'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono-numbers text-xs font-bold">
                            {item.dateStr}
                            {item.dateStr === todayDateStr
                              ? ' (Bugun)'
                              : item.dateStr === yesterdayDateStr
                                ? ' (Kecha)'
                                : ''}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-mono-numbers font-bold ${
                              isOpened
                                ? 'bg-[#C6A45C]/25 text-[#DCC58C]'
                                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            }`}
                          >
                            {item.questionCount || 10} ta savol
                          </span>
                        </div>
                        {item.surahPreviewUz && (
                          <div
                            className={`text-[11px] truncate ${
                              isOpened ? 'text-[#D4CFC3]' : 'text-[#5C746C] dark:text-[#8FA69E]'
                            }`}
                          >
                            Suralar: {item.surahPreviewUz}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-current/10">
                        <span className="text-[11px] font-mono-numbers">
                          {bestAtt
                            ? `Natija: ${bestAtt.score}/${bestAtt.total} (${attCount}x)`
                            : 'Yechilmagan'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenArchiveDate(item.dateStr)}
                          className={`min-h-[34px] px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                            isOpened
                              ? 'bg-[#C6A45C] text-[#031814]'
                              : 'bg-[#063D32] text-[#F8F5EC] hover:bg-[#075747]'
                          }`}
                        >
                          {isOpened ? 'Ochilgan' : 'Ochish'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Section 4: ARXIVLAR (Full Historical Archive with Date Picker, Year & Month Navigation) */}
        {activeSectionTab === 'archive' && (
          <div className="rounded-2xl bg-white/80 dark:bg-[#041D18] border border-[#063D32]/12 dark:border-[#C6A45C]/25 p-3.5 sm:p-4 space-y-3.5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              {/* Date Picker */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#042B25] dark:text-[#DCC58C] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Aniq sana boʻyicha viktorinani ochish (Date Picker)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={selectedDatePickerStr}
                    max={todayDateStr}
                    onChange={(e) => setSelectedDatePickerStr(e.target.value)}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white dark:bg-[#06241E] border border-[#063D32]/20 dark:border-[#C6A45C]/35 text-xs font-mono-numbers text-[#042B25] dark:text-[#F8F5EC]"
                  />
                  <button
                    type="button"
                    onClick={() => handleOpenArchiveDate(selectedDatePickerStr)}
                    className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#063D32] hover:bg-[#075747] text-[#F8F5EC] border border-[#C6A45C]/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Search className="w-3.5 h-3.5 text-[#DCC58C]" />
                    <span>Sanani ochish</span>
                  </button>
                </div>
              </div>

              {/* Year & Month Filter */}
              <div className="flex flex-wrap items-center gap-2">
                {archiveAvailableYears.map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => {
                      setSelectedArchiveYear(yr);
                      setSelectedArchiveMonth('all');
                    }}
                    className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-mono-numbers font-bold border cursor-pointer ${
                      selectedArchiveYear === yr
                        ? 'bg-[#063D32] text-[#F8F5EC] border-[#C6A45C]'
                        : 'bg-white dark:bg-[#06241E] text-[#042B25] dark:text-[#D4CFC3] border-[#063D32]/15 dark:border-[#C6A45C]/25'
                    }`}
                  >
                    {yr}-yil
                  </button>
                ))}
              </div>
            </div>

            {/* Months Filter Row */}
            {(archiveMonthsByYear[selectedArchiveYear]?.length || 0) > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedArchiveMonth('all')}
                  className={`min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer shrink-0 ${
                    selectedArchiveMonth === 'all'
                      ? 'bg-[#C6A45C] text-[#031814] border-[#C6A45C]'
                      : 'bg-white/70 dark:bg-[#06241E] text-[#042B25] dark:text-[#D4CFC3] border-[#063D32]/15 dark:border-[#C6A45C]/20'
                  }`}
                >
                  Barcha oylar
                </button>
                {(archiveMonthsByYear[selectedArchiveYear] || []).map((mm) => (
                  <button
                    key={mm}
                    type="button"
                    onClick={() => setSelectedArchiveMonth(mm)}
                    className={`min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer shrink-0 ${
                      selectedArchiveMonth === mm
                        ? 'bg-[#C6A45C] text-[#031814] border-[#C6A45C]'
                        : 'bg-white/70 dark:bg-[#06241E] text-[#042B25] dark:text-[#D4CFC3] border-[#063D32]/15 dark:border-[#C6A45C]/20'
                    }`}
                  >
                    {UZBEK_MONTH_NAMES[mm] || `${mm}-oy`}
                  </button>
                ))}
              </div>
            )}

            {archiveStatusBanner && (
              <div className="rounded-xl px-3.5 py-2.5 bg-amber-500/15 border border-amber-500/35 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2">
                <span>{archiveStatusBanner}</span>
                <button
                  type="button"
                  onClick={() => handleOpenArchiveDate(todayDateStr)}
                  className="px-3 py-1 rounded-lg bg-[#063D32] text-[#F8F5EC] text-[11px] font-bold cursor-pointer shrink-0"
                >
                  Bugungi viktorinaga qaytish
                </button>
              </div>
            )}

            {filteredArchiveItems.length === 0 ? (
              <p className="text-xs text-[#5C746C] dark:text-[#8FA69E] py-2">
                Tanlangan yil/oy uchun arxivda viktorina mavjud emas.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[240px] overflow-y-auto pr-1">
                {filteredArchiveItems.map((item) => {
                  const bestAtt = getBestAttemptForDate(item.dateStr, attempts);
                  const attCount = getAttemptsForDate(item.dateStr, attempts).length;
                  const isOpened = activeQuizDateStr === item.dateStr;
                  return (
                    <div
                      key={item.dateStr}
                      className={`rounded-xl p-3 border transition-all flex flex-col justify-between gap-2 ${
                        isOpened
                          ? 'bg-[#063D32] text-[#F8F5EC] border-[#C6A45C]'
                          : 'bg-[#F8F5EC]/80 dark:bg-[#06241E] text-[#042B25] dark:text-[#F8F5EC] border-[#063D32]/15 dark:border-[#C6A45C]/20'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono-numbers text-xs font-bold">
                            {item.dateStr}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-mono-numbers font-bold ${
                              isOpened
                                ? 'bg-[#C6A45C]/25 text-[#DCC58C]'
                                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            }`}
                          >
                            {item.questionCount || 10} ta savol
                          </span>
                        </div>
                        {item.surahPreviewUz && (
                          <div
                            className={`text-[11px] truncate ${
                              isOpened ? 'text-[#D4CFC3]' : 'text-[#5C746C] dark:text-[#8FA69E]'
                            }`}
                          >
                            Suralar: {item.surahPreviewUz}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-current/10">
                        <span className="text-[11px] font-mono-numbers">
                          {bestAtt
                            ? `Natija: ${bestAtt.score}/${bestAtt.total} (${attCount}x)`
                            : 'Yechilmagan'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenArchiveDate(item.dateStr)}
                          className={`min-h-[34px] px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                            isOpened
                              ? 'bg-[#C6A45C] text-[#031814]'
                              : 'bg-[#063D32] text-[#F8F5EC] hover:bg-[#075747]'
                          }`}
                        >
                          {isOpened ? 'Ochilgan' : '10 savolni ochish'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[430px_1fr] gap-6 items-start justify-center">
        {/* LEFT COLUMN: 9:16 LUXURY SACRED CINEMA & MOTION VFX SHORTS STAGE */}
        <div className="w-full max-w-[430px] mx-auto">
          <div className="qz-stage relative w-full aspect-[9/16] min-h-[710px] sm:min-h-[755px] rounded-[32px] flex flex-col justify-between p-4 sm:p-5">
            {/* Layer 1: Volumetric God-Rays from Top Center (mix-blend-mode: screen) */}
            <div aria-hidden="true" className="qz-god-rays" />

            {/* Layer 2: Counter-Rotating 2-Layer Islamic Girih & 16-Pointed Star Mandalas (90s CW & 120s CCW, opacity 0.05) */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden z-[1]"
            >
              {/* Outer 16-Pointed Star Mandala (90s CW) */}
              <svg
                viewBox="0 0 500 500"
                className="w-[520px] h-[520px] qz-mandala-cw absolute"
                style={{ opacity: 0.06 }}
                fill="none"
              >
                <defs>
                  <linearGradient id="qzGoldMandalaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8A6621" />
                    <stop offset="25%" stopColor="#DFBD69" />
                    <stop offset="50%" stopColor="#FFF6C8" />
                    <stop offset="75%" stopColor="#D4AF37" />
                    <stop offset="100%" stopColor="#7A5818" />
                  </linearGradient>
                </defs>
                <circle cx="250" cy="250" r="236" stroke="url(#qzGoldMandalaGrad)" strokeWidth="1.4" />
                <circle cx="250" cy="250" r="204" stroke="url(#qzGoldMandalaGrad)" strokeWidth="1.1" />
                <circle cx="250" cy="250" r="158" stroke="url(#qzGoldMandalaGrad)" strokeWidth="1.1" />
                {Array.from({ length: 16 }).map((_, i) => (
                  <g key={`star16_${i}`} transform={`rotate(${i * 22.5} 250 250)`}>
                    <polygon
                      points="250,14 272,118 250,185 228,118"
                      stroke="url(#qzGoldMandalaGrad)"
                      strokeWidth="1.2"
                    />
                    <line
                      x1="250"
                      y1="14"
                      x2="250"
                      y2="250"
                      stroke="url(#qzGoldMandalaGrad)"
                      strokeWidth="0.6"
                    />
                  </g>
                ))}
              </svg>

              {/* Inner Mamluk/Timurid Girih Interlocking Rosette (120s CCW) */}
              <svg
                viewBox="0 0 420 420"
                className="w-[400px] h-[400px] qz-mandala-ccw absolute"
                style={{ opacity: 0.055 }}
                fill="none"
              >
                <circle cx="210" cy="210" r="190" stroke="#DFBD69" strokeWidth="1.2" />
                <circle cx="210" cy="210" r="126" stroke="#FFF6C8" strokeWidth="1" />
                <circle cx="210" cy="210" r="68" stroke="#D4AF37" strokeWidth="1.2" />
                {Array.from({ length: 8 }).map((_, i) => (
                  <g key={`girih8_${i}`} transform={`rotate(${i * 45} 210 210)`}>
                    <rect
                      x="92"
                      y="92"
                      width="236"
                      height="236"
                      rx="10"
                      stroke="#DFBD69"
                      strokeWidth="1.2"
                    />
                    <polygon
                      points="210,24 242,96 210,142 178,96"
                      stroke="#FFF6C8"
                      strokeWidth="1"
                    />
                  </g>
                ))}
              </svg>
            </div>

            {/* Layer 3: Ambient Golden Bokeh & Dust Particles Canvas */}
            <canvas
              ref={particleCanvasRef}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 w-full h-full z-[1]"
            />

            {/* Layer 4: Cinematic Dark Vignette on Edges */}
            <div aria-hidden="true" className="qz-vignette" />

            {/* Layer 5: Heartbeat Tension Glow in Final 1.5 Seconds */}
            {phase === 'countdown_waiting' && !isPaused && timerRemainingMs <= 1500 && (
              <div aria-hidden="true" className="qz-heartbeat-glow" />
            )}

            {/* Layer 6: Perimeter Golden Laser Line (Depletes smoothly along screen edge during countdown) */}
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 w-full h-full z-[5]"
              viewBox="0 0 430 764"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="qzPerimeterGoldLaser" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8A6621" />
                  <stop offset="25%" stopColor="#DFBD69" />
                  <stop offset="50%" stopColor="#FFF6C8" />
                  <stop offset="75%" stopColor="#D4AF37" />
                  <stop offset="100%" stopColor="#7A5818" />
                </linearGradient>
                <linearGradient id="qzPerimeterTensionLaser" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F59E0B" />
                  <stop offset="50%" stopColor="#FEF08A" />
                  <stop offset="100%" stopColor="#EF4444" />
                </linearGradient>
              </defs>
              <rect
                x="3"
                y="3"
                width="424"
                height="758"
                rx="30"
                ry="30"
                fill="none"
                stroke="rgba(223, 189, 105, 0.16)"
                strokeWidth="2"
              />
              <rect
                x="3"
                y="3"
                width="424"
                height="758"
                rx="30"
                ry="30"
                fill="none"
                pathLength={100}
                strokeDasharray="100"
                strokeDashoffset={
                  phase === 'revealed_playing_tail'
                    ? 0
                    : phase === 'countdown_waiting'
                      ? Math.max(0, 100 - timerProgressPct)
                      : 0
                }
                stroke={
                  phase === 'revealed_playing_tail'
                    ? '#10B981'
                    : phase === 'countdown_waiting' && timerRemainingMs <= 1500
                      ? 'url(#qzPerimeterTensionLaser)'
                      : 'url(#qzPerimeterGoldLaser)'
                }
                strokeWidth={phase === 'countdown_waiting' ? '3.5' : '2'}
                strokeLinecap="round"
                style={{
                  filter:
                    phase === 'revealed_playing_tail'
                      ? 'drop-shadow(0 0 10px rgba(16, 185, 129, 0.85))'
                      : phase === 'countdown_waiting' && timerRemainingMs <= 1500
                        ? 'drop-shadow(0 0 14px rgba(245, 158, 11, 0.95))'
                        : 'drop-shadow(0 0 8px rgba(223, 189, 105, 0.65))',
                  transition: 'stroke-dashoffset 60ms linear',
                }}
              />
            </svg>

            {/* 1. TOP PROGRESS BAR, LUMINOUS DIAMOND INDICATORS & SHORTS HEADER */}
            <header className="relative z-10 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                {/* 4 Luminous Diamond/Circle Stage Indicators */}
                <div className="flex items-center gap-2.5" aria-label="Viktorina bosqichlari">
                  {[0, 1, 2, 3].map((circleIdx) => {
                    const thresholdQuestion = circleIdx * 3;
                    const isCompleted =
                      phase === 'finished' || currentIndex > thresholdQuestion + 1;
                    const isActive =
                      phase !== 'finished' && circleIdx === activeGroupIdx;
                    return (
                      <span
                        key={circleIdx}
                        className={`w-3.5 h-3.5 rotate-45 rounded-[3px] transition-all duration-300 border flex items-center justify-center ${
                          isCompleted
                            ? 'bg-emerald-400 border-[#FFF6C8] shadow-[0_0_12px_rgba(52,211,153,0.85)]'
                            : isActive
                              ? 'qz-gold-foil-bg border-[#FFF6C8] scale-125 shadow-[0_0_14px_rgba(255,246,200,0.9)]'
                              : 'bg-black/40 border-[#DFBD69]/40'
                        }`}
                      >
                        {(isCompleted || isActive) && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FFFDF7]" />
                        )}
                      </span>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono-numbers tabular-nums px-2.5 py-1 rounded-lg bg-black/35 border border-[#DFBD69]/40 text-[#FFF8E8]">
                    {activeQuizDateStr}
                  </span>
                  <span className="text-xs font-mono-numbers tabular-nums px-2.5 py-1 rounded-lg bg-[#093322]/90 border border-[#DFBD69]/65 text-[#FFF6C8] font-bold shadow-[0_0_12px_rgba(223,189,105,0.2)]">
                    {phase === 'finished' ? '10 / 10' : `${currentIndex + 1} / 10`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsTickMuted((prev) => !prev)}
                    aria-label={isTickMuted ? 'Soat ovozini yoqish' : 'Soat ovozini oʻchirish'}
                    className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-black/35 hover:bg-black/55 border border-[#DFBD69]/40 text-[#DFBD69] transition-colors cursor-pointer"
                  >
                    {isTickMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 10-question Metallic Gold & Emerald Micro-Segments */}
              <div className="grid grid-cols-10 gap-1">
                {Array.from({ length: 10 }).map((_, idx) => {
                  const ans = answersMap[idx];
                  const q = quizSet?.questions?.[idx];
                  let segClass = 'bg-white/15';
                  if (ans && q) {
                    segClass =
                      ans.selectedIndex === q.correctIndex
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]'
                        : 'bg-rose-400/90';
                  } else if (idx === currentIndex && phase !== 'finished') {
                    segClass = 'qz-gold-foil-bg shadow-[0_0_10px_rgba(255,246,200,0.8)]';
                  }
                  return (
                    <div
                      key={idx}
                      className={`h-1.5 rounded-full transition-all duration-300 ${segClass}`}
                    />
                  );
                })}
              </div>

              {/* Brand Title + Reciter + Streak */}
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <div className="min-w-0">
                  <h1 className="text-[clamp(0.88rem,2.5vw,1.02rem)] font-display font-bold tracking-wider qz-gold-foil-text truncate">
                    ASAKA ZIYO · QURʼON VIKTORINASI
                  </h1>
                  <p className="text-[11px] text-[#FFF8E8]/80 truncate flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#DFBD69]" />
                    <span>
                      {quizSet?.reciterName ||
                        reciters.find((r) => r.id === selectedReciterId)?.name ||
                        'Shayx Mishariy al-Afosiy'}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/35 border border-[#DFBD69]/40 text-xs font-bold tabular-nums text-[#FFF6C8] shrink-0">
                  <Flame className="w-3.5 h-3.5 fill-[#DFBD69] text-[#DFBD69]" />
                  <span>{streak.count}</span>
                </div>
              </div>
            </header>

            {/* 2. CENTER BODY BY PHASE */}
            {phase === 'loading' && (
              <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 space-y-4">
                <div className="w-16 h-16 rounded-2xl qz-obsidian-card flex items-center justify-center">
                  <Headphones className="w-8 h-8 text-[#DFBD69] animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-base font-display font-bold qz-gold-foil-text">
                    {activeQuizDateStr === todayDateStr
                      ? '10 ta noyob Shorts tayyorlanmoqda'
                      : `${activeQuizDateStr} sanadagi arxiv yuklanmoqda`}
                  </h2>
                  <p className="text-xs text-[#FFF8E8]/80 leading-relaxed max-w-xs mx-auto">
                    {activeQuizDateStr === todayDateStr
                      ? 'Tilovat audiosi tahlil qilinib, pauza nuqtalari, yashirin kalima va Tafsiri Hilol maʼnolari tayyorlanmoqda...'
                      : 'Doimiy Firestore arxividan tanlangan sananing 10 ta oyat savoli va qori audiosi yuklanmoqda...'}
                  </p>
                </div>
              </div>
            )}

            {phase === 'error' && (
              <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 space-y-4">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${
                    isQuotaLimited || archiveStatusBanner
                      ? 'bg-amber-500/15 border-amber-400/40'
                      : 'bg-rose-500/15 border-rose-400/40'
                  }`}
                >
                  <AlertTriangle
                    className={`w-7 h-7 ${
                      isQuotaLimited || archiveStatusBanner ? 'text-amber-300' : 'text-rose-300'
                    }`}
                  />
                </div>
                <div className="space-y-2">
                  <h2 className="text-base font-display font-bold text-[#FFF8E8]">
                    {archiveStatusBanner
                      ? 'Tanlangan sanada viktorina topilmadi'
                      : isQuotaLimited
                        ? 'Kunlik AI kvotasi vaqtincha tugadi'
                        : 'Audio tahlilni yuklab boʻlmadi'}
                  </h2>
                  <p className="text-xs text-[#FFF8E8]/85 leading-relaxed max-w-xs mx-auto">
                    {errorMessage}
                  </p>
                </div>
                <div className="flex flex-col items-center gap-2.5 w-full max-w-[260px]">
                  {activeQuizDateStr !== todayDateStr && (
                    <button
                      type="button"
                      onClick={() => handleOpenArchiveDate(todayDateStr)}
                      className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#010805] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span>Bugungi viktorinani ochish ({todayDateStr})</span>
                    </button>
                  )}
                  {quotaFallbackQuizzes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const archived = quotaFallbackQuizzes[0];
                        if (!archived) return;
                        stopAllActiveTimersAndAudio();
                        setQuizSet(rebindQuizSetToReciter(archived, selectedReciterId, reciters));
                        setQuizSource('archive');
                        setCurrentIndex(0);
                        setSelectedOption(null);
                        setAnswersMap({});
                        setTimerRemainingMs(TIMER_DURATION_MS);
                        setIsPaused(false);
                        setErrorMessage('');
                        setPhase('ready');
                      }}
                      className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#010805] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <History className="w-4 h-4 shrink-0" />
                      <span>Mavjud arxiv viktorinani ochish</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      void loadQuiz(
                        selectedReciterId,
                        activeQuizDateStr === todayDateStr,
                        activeQuizDateStr
                      )
                    }
                    className="w-full min-h-[44px] px-5 py-2.5 rounded-xl qz-gold-foil-bg text-[#010805] font-bold text-xs flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    <RefreshCw className="w-4 h-4 shrink-0" />
                    <span>Qayta urinish</span>
                  </button>
                </div>
              </div>
            )}

            {phase === 'finished' && quizSet && (
              <div className="relative z-10 flex-1 flex flex-col justify-between py-2 overflow-y-auto pr-1 space-y-3">
                <div className="rounded-2xl qz-obsidian-card p-4 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl qz-gold-foil-bg mx-auto flex items-center justify-center shadow-[0_0_24px_rgba(223,189,105,0.45)]">
                    <Trophy className="w-6 h-6 text-[#010805]" />
                  </div>
                  <div>
                    <p className="text-[11px] tracking-widest text-[#DFBD69] font-semibold uppercase">
                      Viktorina yakunlandi · {quizSet.dateStr}
                    </p>
                    <h2 className="text-2xl font-display font-bold qz-gold-foil-text tabular-nums mt-0.5">
                      {finishedSummary.score} / {finishedSummary.total} ({finishedSummary.percentage}%)
                    </h2>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="py-1.5 border-r border-[#DFBD69]/25">
                      <div className="text-sm font-bold text-emerald-300 tabular-nums">
                        {finishedSummary.score}
                      </div>
                      <div className="text-[11px] text-emerald-200/80">Toʻgʻri</div>
                    </div>
                    <div className="py-1.5 border-r border-[#DFBD69]/25">
                      <div className="text-sm font-bold text-rose-300 tabular-nums">
                        {finishedSummary.incorrectCount}
                      </div>
                      <div className="text-[11px] text-rose-200/80">Notoʻgʻri</div>
                    </div>
                    <div className="py-1.5">
                      <div className="text-sm font-bold text-[#FFF6C8] tabular-nums">
                        {streak.count} kun
                      </div>
                      <div className="text-[11px] text-[#FFF8E8]/75">Muntazamlik</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-[275px] overflow-y-auto pr-1">
                  {quizSet.questions.map((rawQ, idx) => {
                    const q = enrichedById[rawQ.id] || normalizeQuizQuestion(rawQ);
                    const ans = answersMap[idx];
                    const isRight = ans?.selectedIndex === q.correctIndex;
                    return (
                      <div
                        key={q.id}
                        className="rounded-xl bg-black/35 border border-[#DFBD69]/35 p-3 space-y-2 backdrop-blur-md"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-[#FFF6C8]">
                            {idx + 1}. {q.surahNameUz} surasi, {q.ayahNumberInSurah}-oyat
                          </span>
                          <span
                            className={`flex items-center gap-1 font-semibold ${
                              isRight ? 'text-emerald-400' : 'text-rose-300'
                            }`}
                          >
                            {isRight ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" /> Toʻgʻri
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5" /> {q.hiddenWord}
                              </>
                            )}
                          </span>
                        </div>
                        <p
                          dir="rtl"
                          className="qz-arabic-calligraphy text-base leading-loose text-right"
                        >
                          {q.fullArabicText}
                        </p>
                        {q.translationUz ? (
                          <div className="text-[11px] text-[#FFF8E8]/90 leading-relaxed border-t border-[#DFBD69]/20 pt-1.5 space-y-0.5">
                            <p>{q.translationUz}</p>
                            <p className="text-[10px] text-[#DFBD69]">
                              Tafsiri Hilol — {q.translatorName || 'Shayx Muhammad Sodiq Muhammad Yusuf'}
                            </p>
                          </div>
                        ) : (
                          <p className="text-[10px] text-[#FFF8E8]/60 border-t border-[#DFBD69]/20 pt-1.5">
                            Tarjima matni hozircha yuklanmadi.
                          </p>
                        )}
                        <div className="flex items-center justify-between pt-1 gap-2">
                          <span className="text-[10px] text-[#FFF8E8]/70 truncate">
                            {q.reciterName} ·{' '}
                            {ans?.selectedIndex !== null && ans?.selectedIndex !== undefined
                              ? `Tanlov: ${q.options[ans.selectedIndex]}`
                              : 'Vaqt tugadi'}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setInspectedQuestionIndex(idx);
                                setIsTafsirPanelOpen(true);
                              }}
                              className="min-h-[34px] px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 border border-[#DFBD69]/35 text-[#FFF8E8] text-[11px] font-semibold cursor-pointer whitespace-nowrap"
                            >
                              Tafsir
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePlayReviewAyah(q, idx)}
                              className="min-h-[34px] px-3 py-1 rounded-lg bg-[#DFBD69]/20 hover:bg-[#DFBD69]/30 border border-[#DFBD69]/50 text-[#FFF6C8] text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                            >
                              <Play className="w-3 h-3" />
                              <span>
                                {reviewPlayingIdx === idx ? 'Ijro...' : 'Tinglash'}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold text-[#FFF6C8]">
                    10 ta savol uchun mustaqil MP4 video (quiz-01.mp4 – quiz-10.mp4)
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {quizSet.questions.map((_, idx) => {
                      const partNum = idx + 1;
                      const mp4Name = formatQuizMp4Filename(partNum);
                      const slot = questionExports[partNum];
                      const isRendering = slot?.status === 'rendering';
                      const isReady = slot?.status === 'ready';
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={isRendering}
                          onClick={() => {
                            if (isReady) {
                              void handleDownloadReadyQuestionVideo(idx);
                            } else {
                              void handleExportSingleQuestionVideo(idx);
                            }
                          }}
                          className={`min-h-[40px] px-1 rounded-xl font-mono-numbers text-[10px] font-bold border transition-all cursor-pointer flex flex-col items-center justify-center ${
                            isReady
                              ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400'
                              : isRendering
                                ? 'bg-[#DFBD69]/30 text-[#FFF6C8] border-[#DFBD69]'
                                : 'bg-black/40 hover:bg-black/60 text-[#FFF8E8] border-[#DFBD69]/35'
                          }`}
                        >
                          <span>{mp4Name}</span>
                          <span className="text-[9px] opacity-85">
                            {isRendering ? `${slot.progressPct}%` : isReady ? 'Yuklab ol' : 'Yaratish'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={handleRestartQuiz}
                    className="w-full min-h-[44px] rounded-xl qz-gold-foil-bg text-[#010805] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer mt-1 shadow-lg"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Qayta ishlash</span>
                  </button>
                </div>
              </div>
            )}

            {/* ACTIVE SACRED CINEMA QUIZ STAGE */}
            {currentQuestion &&
              phase !== 'loading' &&
              phase !== 'error' &&
              phase !== 'finished' && (
                <>
                  <main className="relative z-10 flex-1 flex flex-col justify-center my-1.5 space-y-2.5">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentQuestion.id}
                        initial={{ opacity: 0, scale: 0.95, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: -12 }}
                        transition={{ duration: 0.42, ease: [0.34, 1.56, 0.64, 1] }}
                        className="space-y-2.5"
                      >
                        {/* Stagger Step 1 (0ms): ORNAMENTAL GOLD SURAH CARTOUCHE */}
                        <motion.div
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0, duration: 0.38, ease: [0.34, 1.56, 0.64, 1] }}
                          className="qz-surah-cartouche rounded-2xl px-3.5 py-2 flex items-center justify-between gap-2"
                        >
                          {/* Left Arabesque Finial SVG */}
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 28 28"
                            className="w-5 h-5 shrink-0 text-[#DFBD69]"
                            fill="none"
                          >
                            <path
                              d="M14 2L17.5 10.5L26 14L17.5 17.5L14 26L10.5 17.5L2 14L10.5 10.5L14 2Z"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              fill="rgba(223,189,105,0.2)"
                            />
                            <circle cx="14" cy="14" r="3" fill="#FFF6C8" />
                          </svg>

                          <div className="text-center min-w-0 flex-1">
                            <div className="text-[clamp(0.75rem,2.2vw,0.86rem)] font-display font-bold qz-gold-foil-text truncate">
                              {currentQuestion.surahNameUz} surasi · {currentQuestion.ayahNumberInSurah}-oyat
                            </div>
                            <div className="text-[10px] text-[#FFF8E8]/70 font-mono-numbers">
                              Kanonik oyat: {currentQuestion.ayahKey}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              dir="rtl"
                              className="font-arabic-cinema text-lg text-[#FFF6C8] drop-shadow-[0_2px_8px_rgba(223,189,105,0.4)]"
                            >
                              {currentQuestion.surahNameAr}
                            </span>
                            {/* Right Arabesque Finial SVG */}
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 28 28"
                              className="w-5 h-5 shrink-0 text-[#DFBD69]"
                              fill="none"
                            >
                              <path
                                d="M14 2L17.5 10.5L26 14L17.5 17.5L14 26L10.5 17.5L2 14L10.5 10.5L14 2Z"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                fill="rgba(223,189,105,0.2)"
                              />
                              <circle cx="14" cy="14" r="3" fill="#FFF6C8" />
                            </svg>
                          </div>
                        </motion.div>

                        {/* Stagger Step 2 (65ms): FROSTED OBSIDIAN GLASS CARD WITH 4 ARABESQUE CORNERS & SPECULAR SWEEP */}
                        <motion.div
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.065, duration: 0.42, ease: [0.34, 1.56, 0.64, 1] }}
                          className="qz-obsidian-card rounded-[24px] p-4 sm:p-5 space-y-2.5"
                        >
                          {/* 4 Oriental Arabesque Corner Ornaments (SVG) */}
                          {[
                            'top-2 left-2 rotate-0',
                            'top-2 right-2 rotate-90',
                            'bottom-2 right-2 rotate-180',
                            'bottom-2 left-2 -rotate-90',
                          ].map((posClass, cIdx) => (
                            <svg
                              key={cIdx}
                              aria-hidden="true"
                              viewBox="0 0 32 32"
                              className={`pointer-events-none absolute w-5 h-5 text-[#DFBD69]/75 ${posClass}`}
                              fill="none"
                            >
                              <path
                                d="M2 20V6C2 3.79086 3.79086 2 6 2H20"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                              />
                              <path
                                d="M6 14V8C6 6.89543 6.89543 6 8 6H14"
                                stroke="#FFF6C8"
                                strokeWidth="1.1"
                                strokeLinecap="round"
                              />
                              <circle cx="6" cy="6" r="1.8" fill="#FFF6C8" />
                            </svg>
                          ))}

                          {/* 4. ARABIC AYAH WITH CALLIGRAPHIC RTL PERFECTION & HIDDEN WORD CAPSULE / 3D REVEAL */}
                          <div
                            dir="rtl"
                            className="font-arabic-cinema text-[clamp(1.38rem,4.3vw,1.92rem)] leading-[2.25] text-center py-1 px-1 select-text"
                          >
                            {currentQuestion.hidePos !== 'start' &&
                              (currentQuestion.maskedArabicBefore || currentQuestion.maskedArabicPrefix) && (
                                <span className="qz-arabic-calligraphy">
                                  {currentQuestion.maskedArabicBefore || currentQuestion.maskedArabicPrefix}{' '}
                                </span>
                              )}

                            {phase === 'revealed_playing_tail' ? (
                              <span className="relative inline-block mx-1.5 align-middle">
                                {/* Expanding Golden-Emerald Light Ring */}
                                <span aria-hidden="true" className="qz-reveal-ring" />
                                {/* 16 Golden-Emerald Sparkle Burst Particles */}
                                {Array.from({ length: 16 }).map((_, spIdx) => (
                                  <span
                                    key={spIdx}
                                    aria-hidden="true"
                                    className="qz-sparkle-dot"
                                    style={
                                      {
                                        '--spark-angle': `${spIdx * 22.5}deg`,
                                        '--spark-dist': `${28 + (spIdx % 3) * 12}px`,
                                      } as React.CSSProperties
                                    }
                                  />
                                ))}
                                {/* 3D Spring Revealed Arabic Word */}
                                <motion.span
                                  initial={{ rotateX: -85, scale: 0.65, y: -12, opacity: 0 }}
                                  animate={{ rotateX: 0, scale: 1, y: 0, opacity: 1 }}
                                  transition={{
                                    duration: 0.55,
                                    ease: [0.34, 1.56, 0.64, 1],
                                  }}
                                  className="inline-block px-3 py-0.5 rounded-full bg-gradient-to-r from-[#047857] via-[#059669] to-[#10B981] border border-[#FFF6C8] text-[#FFFDF7] shadow-[0_0_28px_rgba(16,185,129,0.75)]"
                                >
                                  {currentQuestion.hiddenWord}
                                  {currentQuestion.hidePos === 'end' && currentQuestion.trailingMarker
                                    ? ` ${currentQuestion.trailingMarker}`
                                    : ''}
                                </motion.span>
                              </span>
                            ) : (
                              <span
                                className="qz-hidden-capsule text-base sm:text-lg"
                                title="Berkitilgan oyat kalimasi"
                              >
                                [ &nbsp;؟&nbsp; ]
                              </span>
                            )}

                            {currentQuestion.maskedArabicAfter && (
                              <span className="qz-arabic-calligraphy">
                                {' '}
                                {currentQuestion.maskedArabicAfter}
                                {phase === 'revealed_playing_tail' &&
                                currentQuestion.hidePos !== 'end' &&
                                currentQuestion.trailingMarker
                                  ? ` ${currentQuestion.trailingMarker}`
                                  : ''}
                              </span>
                            )}
                          </div>

                          {/* 3. DELICATE GOLD DIVIDER & "TAFSIRI HILOL" MEANING PRESENTATION */}
                          <div className="space-y-1.5 pt-0.5">
                            <div
                              aria-hidden="true"
                              className="h-[1px] w-full"
                              style={{
                                background:
                                  'linear-gradient(90deg, transparent 0%, rgba(223,189,105,0.65) 50%, transparent 100%)',
                              }}
                            />
                            {phase === 'revealed_playing_tail' && currentQuestion.translationUz ? (
                              <motion.div
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.35 }}
                                className="text-center px-2 space-y-0.5"
                              >
                                <p className="text-[clamp(0.74rem,2.1vw,0.84rem)] text-[#FFFDF7] font-medium leading-relaxed line-clamp-3 drop-shadow-[0_1px_8px_rgba(255,246,200,0.25)]">
                                  «{currentQuestion.translationUz}»
                                </p>
                                <p className="text-[10px] font-semibold tracking-wider uppercase qz-gold-foil-text">
                                  Tafsiri Hilol · Shayx Muhammad Sodiq Muhammad Yusuf
                                </p>
                              </motion.div>
                            ) : (
                              <div className="text-center text-[10px] tracking-wider uppercase text-[#FFF8E8]/60 font-medium">
                                Javob ochilganda «Tafsiri Hilol» maʼno tarjimasi namoyon boʻladi
                              </div>
                            )}
                          </div>

                          {/* 5. DUAL-LAYER SYMMETRICAL LIQUID GOLD AUDIO VISUALIZER */}
                          <div
                            aria-hidden="true"
                            className="relative flex items-center justify-center gap-[3px] h-9 pt-1"
                          >
                            {/* Calm Golden Horizon Line when Paused/Idle */}
                            <div
                              className="pointer-events-none absolute left-6 right-6 h-[1.5px] rounded-full transition-opacity duration-300"
                              style={{
                                opacity: isWaveformActive ? 0.22 : 0.78,
                                background:
                                  'linear-gradient(90deg, transparent 0%, #DFBD69 25%, #FFF6C8 50%, #D4AF37 75%, transparent 100%)',
                                boxShadow: '0 0 10px rgba(223, 189, 105, 0.55)',
                              }}
                            />
                            {waveBins.map((amp, bIdx) => {
                              const half = VISUALIZER_BAR_COUNT / 2;
                              const symDist = Math.abs(bIdx - (half - 0.5)) / half;
                              const mirrorEnvelope = Math.max(0.25, Math.cos(symDist * Math.PI * 0.48));
                              const symmetricBinIdx = Math.min(
                                waveBins.length - 1,
                                Math.floor(symDist * (waveBins.length * 0.75))
                              );
                              const symAmp = waveBins[symmetricBinIdx] ?? amp;
                              const outerHeightPx = isWaveformActive
                                ? Math.max(4, Math.round(symAmp * 32 * mirrorEnvelope))
                                : 3;
                              const innerHeightPx = isWaveformActive
                                ? Math.max(2, Math.round(outerHeightPx * 0.58))
                                : 2;
                              return (
                                <div
                                  key={bIdx}
                                  className="relative flex items-center justify-center w-1.5 h-full"
                                >
                                  {/* Outer Liquid Gold Halo Bar */}
                                  <span
                                    className="w-1.5 rounded-full transition-[height] duration-75"
                                    style={{
                                      height: `${outerHeightPx}px`,
                                      background:
                                        phase === 'revealed_playing_tail'
                                          ? 'linear-gradient(180deg, #34D399 0%, #059669 50%, #34D399 100%)'
                                          : 'linear-gradient(180deg, #8A6621 0%, #DFBD69 30%, #FFF6C8 50%, #D4AF37 75%, #7A5818 100%)',
                                      boxShadow: isWaveformActive
                                        ? phase === 'revealed_playing_tail'
                                          ? '0 0 8px rgba(52,211,153,0.6)'
                                          : '0 0 8px rgba(223,189,105,0.55)'
                                        : 'none',
                                    }}
                                  />
                                  {/* Inner Bright Core Layer */}
                                  {isWaveformActive && (
                                    <span
                                      className="pointer-events-none absolute w-[3px] rounded-full bg-[#FFFDF7]/90 transition-[height] duration-75"
                                      style={{ height: `${innerHeightPx}px` }}
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Playback Status & Transport Controls */}
                          <div className="flex items-center justify-between pt-1.5 border-t border-[#DFBD69]/20">
                            <div className="flex items-center gap-1.5 text-[11px] text-[#FFF8E8]/90 min-w-0">
                              {isBufferingAudio ? (
                                <span className="flex items-center gap-1.5 text-[#FFF6C8] font-semibold animate-pulse truncate">
                                  <Headphones className="w-3.5 h-3.5 shrink-0 text-[#DFBD69]" />
                                  <span>Audio yuklanmoqda...</span>
                                </span>
                              ) : isWaveformActive ? (
                                <span className="flex items-center gap-1.5 text-emerald-300 font-semibold truncate">
                                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                                  <span>
                                    {phase === 'revealed_playing_tail'
                                      ? 'Toʻliq oyat tilovati'
                                      : 'Qori tilovat qilmoqda'}
                                  </span>
                                </span>
                              ) : phase === 'countdown_waiting' && !isPaused ? (
                                <span className="flex items-center gap-1.5 text-[#FFF6C8] font-semibold truncate">
                                  <Clock className="w-3.5 h-3.5 shrink-0 text-[#DFBD69]" />
                                  <span>
                                    {currentQuestion.hidePos === 'start'
                                      ? 'Oyat boshidagi kalimani toping'
                                      : currentQuestion.hidePos === 'middle'
                                        ? 'Yashiringan kalimani toping'
                                        : 'Oxirgi kalimani toping'}
                                  </span>
                                </span>
                              ) : isPaused ? (
                                <span className="text-amber-300 font-semibold">Pauza qilindi</span>
                              ) : (
                                <span className="text-[#DFBD69] font-medium">Boshlashga tayyor</span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={handleReplayCurrentPrefix}
                                disabled={phase === 'revealed_playing_tail'}
                                aria-label="Oyat boshidan qayta tinglash"
                                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-black/35 hover:bg-black/55 disabled:opacity-40 border border-[#DFBD69]/35 text-[#FFF8E8] cursor-pointer"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={handleTogglePlayPause}
                                disabled={phase === 'revealed_playing_tail'}
                                aria-label={isPaused || phase === 'ready' ? 'Ijro etish' : 'Pauza'}
                                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl qz-gold-foil-bg disabled:opacity-40 text-[#010805] font-bold cursor-pointer shadow-[0_0_14px_rgba(223,189,105,0.4)]"
                              >
                                {isPaused || phase === 'ready' ? (
                                  <Play className="w-4 h-4 fill-current" />
                                ) : (
                                  <Pause className="w-4 h-4 fill-current" />
                                )}
                              </button>
                            </div>
                          </div>
                        </motion.div>

                        {/* Stagger Step 3 (130ms): TENSION COUNTDOWN RING & LIQUID GOLD PROGRESS BAR */}
                        <motion.div
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.13, duration: 0.38, ease: [0.34, 1.56, 0.64, 1] }}
                          className="flex items-center gap-3 px-1.5 py-1 rounded-2xl bg-black/30 border border-[#DFBD69]/25 backdrop-blur-md"
                        >
                          <div className="relative w-13 h-13 shrink-0 flex items-center justify-center">
                            <svg className="w-13 h-13 -rotate-90" viewBox="0 0 60 60">
                              <circle
                                cx="30"
                                cy="30"
                                r={ringRadius}
                                fill="none"
                                stroke="rgba(255,248,232,0.12)"
                                strokeWidth="4.5"
                              />
                              <circle
                                cx="30"
                                cy="30"
                                r={ringRadius}
                                fill="none"
                                stroke={
                                  phase === 'revealed_playing_tail'
                                    ? '#10B981'
                                    : timerRemainingMs <= 1500 && phase === 'countdown_waiting'
                                      ? '#F59E0B'
                                      : '#DFBD69'
                                }
                                strokeWidth="4.5"
                                strokeLinecap="round"
                                strokeDasharray={ringCircumference}
                                strokeDashoffset={ringDashOffset}
                                style={{
                                  filter:
                                    phase === 'revealed_playing_tail'
                                      ? 'drop-shadow(0 0 8px rgba(16,185,129,0.85))'
                                      : timerRemainingMs <= 1500 && phase === 'countdown_waiting'
                                        ? 'drop-shadow(0 0 10px rgba(245,158,11,0.95))'
                                        : 'drop-shadow(0 0 8px rgba(223,189,105,0.8))',
                                }}
                              />
                            </svg>
                            <span
                              className={`absolute text-[11px] font-mono-numbers tabular-nums font-bold ${
                                phase === 'countdown_waiting' && timerRemainingMs <= 1500
                                  ? 'text-amber-300 scale-110'
                                  : 'text-[#FFF8E8]'
                              }`}
                            >
                              {phase === 'revealed_playing_tail'
                                ? '✓'
                                : `${(timerRemainingMs / 1000).toFixed(1)}s`}
                            </span>
                          </div>

                          <div className="flex-1 space-y-1.5 pr-1">
                            <div className="flex items-center justify-between text-[11px] font-semibold">
                              <span
                                className={
                                  phase === 'countdown_waiting' && timerRemainingMs <= 1500
                                    ? 'text-amber-300 animate-pulse'
                                    : 'text-[#FFF8E8]/90'
                                }
                              >
                                {phase === 'countdown_waiting'
                                  ? timerRemainingMs <= 1500
                                    ? 'Vaqt tugamoqda — tanlang!'
                                    : 'Javob tanlash vaqti'
                                  : phase === 'revealed_playing_tail'
                                    ? 'Toʻgʻri kalima ochildi'
                                    : 'Pauza nuqtasida 3.5s taymer'}
                              </span>
                              <span className="font-mono-numbers tabular-nums text-[#FFF6C8]">
                                {Math.round(timerProgressPct)}%
                              </span>
                            </div>
                            <div className="w-full h-2.5 rounded-full bg-black/50 overflow-hidden border border-[#DFBD69]/35 p-[1px]">
                              <div
                                className="h-full rounded-full transition-all duration-75"
                                style={{
                                  width: `${phase === 'revealed_playing_tail' ? 100 : timerProgressPct}%`,
                                  background:
                                    phase === 'revealed_playing_tail'
                                      ? 'linear-gradient(90deg, #047857 0%, #10B981 50%, #34D399 100%)'
                                      : timerRemainingMs <= 1500 && phase === 'countdown_waiting'
                                        ? 'linear-gradient(90deg, #D97706 0%, #FBBF24 50%, #EF4444 100%)'
                                        : 'linear-gradient(90deg, #8A6621 0%, #DFBD69 30%, #FFF6C8 60%, #D4AF37 100%)',
                                  boxShadow:
                                    phase === 'revealed_playing_tail'
                                      ? '0 0 12px rgba(16,185,129,0.75)'
                                      : '0 0 12px rgba(223,189,105,0.65)',
                                }}
                              />
                            </div>
                          </div>
                        </motion.div>
                      </motion.div>
                    </AnimatePresence>
                  </main>

                  {/* 7. BOTTOM: 4 ANSWER BUTTONS WITH RUB EL HIZB 8-POINTED STAR BADGES & 65MS STAGGER */}
                  <footer className="relative z-10 space-y-2">
                    {phase === 'ready' && currentIndex === 0 ? (
                      <button
                        type="button"
                        onClick={() => startQuestionPlayback(0)}
                        className="w-full min-h-[56px] rounded-2xl qz-gold-foil-bg text-[#010805] font-display font-bold text-base shadow-[0_12px_32px_rgba(212,175,55,0.4)] flex items-center justify-center gap-2.5 hover:brightness-105 transition-transform duration-200 cinema-spring active:scale-[0.98] cursor-pointer"
                      >
                        <Play className="w-5 h-5 fill-current" />
                        <span>Tilovatni boshlash</span>
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    ) : (
                      <div className="grid grid-cols-2 gap-2.5">
                        {currentQuestion.options.map((optWord, idx) => {
                          const isSelected = selectedOption === idx;
                          const isCorrectOption = idx === currentQuestion.correctIndex;
                          const isRevealed = phase === 'revealed_playing_tail';
                          const arabicNumerals = ['١', '٢', '٣', '٤'];

                          let stateClass = '';
                          if (isRevealed) {
                            if (isCorrectOption) {
                              stateClass = 'qz-answer-btn-correct';
                            } else if (isSelected && !isCorrectOption) {
                              stateClass = 'qz-answer-btn-wrong';
                            } else {
                              stateClass = 'qz-answer-btn-dimmed';
                            }
                          } else if (isSelected) {
                            stateClass = 'qz-answer-btn-selected';
                          }

                          return (
                            <motion.button
                              key={`${currentQuestion.id}_opt_${idx}`}
                              type="button"
                              disabled={isRevealed}
                              onClick={() => handleSelectOption(idx)}
                              initial={{ opacity: 0, y: 18 }}
                              animate={{
                                opacity: isRevealed && !isCorrectOption && !isSelected ? 0.35 : 1,
                                y: 0,
                                scale: isRevealed
                                  ? isCorrectOption
                                    ? 1.03
                                    : 0.96
                                  : 1,
                              }}
                              transition={{
                                delay: 0.195 + idx * 0.065,
                                duration: 0.38,
                                ease: [0.34, 1.56, 0.64, 1],
                              }}
                              className={`qz-answer-btn min-h-[60px] px-3 py-2 rounded-2xl flex items-center justify-between gap-2 cursor-pointer active:scale-[0.97] ${stateClass}`}
                            >
                              {/* Left 8-Pointed Islamic Star (Rub el Hizb) Number Badge */}
                              <span className="relative w-7 h-7 shrink-0 flex items-center justify-center">
                                <svg
                                  aria-hidden="true"
                                  viewBox="0 0 36 36"
                                  className="w-7 h-7"
                                  fill="none"
                                >
                                  <rect
                                    x="7"
                                    y="7"
                                    width="22"
                                    height="22"
                                    rx="2"
                                    stroke={isRevealed && isCorrectOption ? '#FFFDF7' : '#DFBD69'}
                                    strokeWidth="1.5"
                                    fill={
                                      isRevealed && isCorrectOption
                                        ? 'rgba(255,255,255,0.22)'
                                        : 'rgba(223,189,105,0.14)'
                                    }
                                  />
                                  <rect
                                    x="7"
                                    y="7"
                                    width="22"
                                    height="22"
                                    rx="2"
                                    transform="rotate(45 18 18)"
                                    stroke={isRevealed && isCorrectOption ? '#FFFDF7' : '#FFF6C8'}
                                    strokeWidth="1.5"
                                    fill={
                                      isRevealed && isCorrectOption
                                        ? 'rgba(255,255,255,0.22)'
                                        : 'rgba(138,102,33,0.28)'
                                    }
                                  />
                                </svg>
                                <span
                                  className={`absolute text-xs font-bold ${
                                    isRevealed && isCorrectOption ? 'text-white' : 'text-[#FFF6C8]'
                                  }`}
                                >
                                  {isRevealed && isCorrectOption ? '✓' : arabicNumerals[idx] || idx + 1}
                                </span>
                              </span>

                              {/* Arabic Option Word */}
                              <span
                                dir="rtl"
                                className="flex-1 font-arabic-cinema text-[clamp(1.22rem,3.6vw,1.45rem)] leading-relaxed text-center text-[#FFFDF7] truncate"
                              >
                                {optWord}
                              </span>
                            </motion.button>
                          );
                        })}
                      </div>
                    )}

                    {phase === 'revealed_playing_tail' && quizSet && (
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setAutoAdvanceEnabled((prev) => !prev)}
                          className={`min-h-[42px] px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                            autoAdvanceEnabled
                              ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                              : 'bg-black/40 border-[#DFBD69]/35 text-[#FFF8E8]/85 hover:border-[#FFF6C8]'
                          }`}
                        >
                          {autoAdvanceEnabled ? 'Avto-oʻtish: Yoqilgan' : 'Avto-oʻtish: Oʻchiq'}
                        </button>
                        <button
                          type="button"
                          onClick={handleProceedToNextQuestion}
                          className={`flex-1 min-h-[42px] px-4 py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                            isTailFinishedWaitingNext
                              ? 'bg-gradient-to-r from-[#047857] via-[#10B981] to-[#34D399] text-[#FFFDF7] border border-[#FFF6C8] shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                              : 'qz-gold-foil-bg text-[#010805]'
                          }`}
                        >
                          <span>
                            {currentIndex + 1 < quizSet.questions.length
                              ? 'Keyingi savol'
                              : 'Natijani koʻrish'}
                          </span>
                          <ChevronRight className="w-4 h-4 shrink-0" />
                        </button>
                      </div>
                    )}
                  </footer>
                </>
              )}
          </div>
        </div>

        {/* RIGHT COLUMN: COLLAPSIBLE TARJIMA VA TAFSIR PANEL + STUDIO & DUAL 5-QUESTION EXPORTS */}
        <aside className="space-y-4">
          {/* Dedicated Collapsible Translation & Tafsir Reading Panel */}
          {quizSet?.questions?.length ? (
            (() => {
              const selectableIndices =
                phase === 'finished'
                  ? quizSet.questions.map((_, i) => i)
                  : revealedIndices;
              const fallbackIdx =
                phase === 'finished'
                  ? 0
                  : phase === 'revealed_playing_tail'
                    ? currentIndex
                    : selectableIndices.length > 0
                      ? selectableIndices[selectableIndices.length - 1]
                      : null;
              const activeInfoIdx =
                inspectedQuestionIndex !== null &&
                (phase === 'finished' || selectableIndices.includes(inspectedQuestionIndex))
                  ? inspectedQuestionIndex
                  : fallbackIdx;
              const infoRaw = activeInfoIdx !== null ? quizSet.questions[activeInfoIdx] : null;
              const infoQuestion = infoRaw
                ? enrichedById[infoRaw.id] || normalizeQuizQuestion(infoRaw)
                : null;

              if (!infoQuestion || activeInfoIdx === null) return null;

              return (
                <section
                  aria-label="Oyat tarjimasi va tafsiri"
                  className="rounded-3xl bg-[#F8F5EC] dark:bg-[#06241E] border border-emerald-500/40 shadow-md overflow-hidden"
                >
                  <button
                    type="button"
                    aria-expanded={isTafsirPanelOpen}
                    onClick={() => setIsTafsirPanelOpen((prev) => !prev)}
                    className="w-full min-h-[60px] px-5 sm:px-6 py-4 flex items-center justify-between gap-3 text-left hover:bg-[#063D32]/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 shrink-0" />
                        <span>Tarjima va Tafsir (Qurʼon boʻlimi rasmiy bazasi)</span>
                      </div>
                      <h3 className="text-base sm:text-lg font-display font-bold text-[#042B25] dark:text-[#F8F5EC] truncate">
                        {activeInfoIdx + 1}-savol: {infoQuestion.surahNameUz} surasi ({infoQuestion.surahNameAr}), {infoQuestion.ayahNumberInSurah}-oyat
                      </h3>
                    </div>
                    <span className="min-w-[40px] min-h-[40px] rounded-xl bg-[#063D32]/10 dark:bg-white/10 flex items-center justify-center text-[#063D32] dark:text-[#DCC58C] shrink-0">
                      <ChevronDown
                        className={`w-5 h-5 transition-transform duration-200 ${
                          isTafsirPanelOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </span>
                  </button>

                  {isTafsirPanelOpen && (
                    <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-1 space-y-4 border-t border-[#063D32]/10 dark:border-[#C6A45C]/20">
                      {/* Switch between revealed ayahs comfortably */}
                      {selectableIndices.length > 1 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-2">
                          <span className="text-[11px] font-semibold text-[#5C746C] dark:text-[#8FA69E] mr-1 shrink-0">
                            Ochilgan oyatlar:
                          </span>
                          {selectableIndices.map((qIdx) => (
                            <button
                              key={qIdx}
                              type="button"
                              onClick={() => setInspectedQuestionIndex(qIdx)}
                              className={`min-w-[36px] min-h-[36px] px-2 rounded-lg text-xs font-mono-numbers font-bold border transition-colors cursor-pointer shrink-0 ${
                                qIdx === activeInfoIdx
                                  ? 'bg-[#063D32] text-[#F8F5EC] border-[#C6A45C]'
                                  : 'bg-white/70 dark:bg-[#041D18] text-[#042B25] dark:text-[#D4CFC3] border-[#063D32]/15 dark:border-[#C6A45C]/20 hover:border-[#C6A45C]'
                              }`}
                            >
                              {qIdx + 1}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Top Action & Surah Address Row */}
                      <div className="flex items-center justify-between gap-3 pt-1">
                        <div className="text-xs text-[#5C746C] dark:text-[#8FA69E]">
                          Sura: <strong className="text-[#042B25] dark:text-[#F8F5EC]">{infoQuestion.surahNameUz}</strong> · Oyat: <strong className="text-[#042B25] dark:text-[#F8F5EC]">{infoQuestion.ayahNumberInSurah}</strong> ({infoQuestion.ayahKey})
                        </div>
                        <button
                          type="button"
                          onClick={() => handlePlayReviewAyah(infoQuestion, activeInfoIdx)}
                          className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#063D32] hover:bg-[#075747] text-[#F8F5EC] border border-[#C6A45C]/40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <Play className="w-3.5 h-3.5 text-[#DCC58C]" />
                          <span>
                            {reviewPlayingIdx === activeInfoIdx ? 'Ijro etilmoqda...' : 'Toʻliq tinglash'}
                          </span>
                        </button>
                      </div>

                      {/* 1. Full Canonical Arabic Text */}
                      <div className="rounded-2xl bg-white/85 dark:bg-[#041D18] border border-[#063D32]/12 dark:border-[#C6A45C]/25 p-4 sm:p-5">
                        <div className="text-[11px] font-semibold text-[#5C746C] dark:text-[#8FA69E] mb-2">
                          Oyatning toʻliq arabcha matni
                        </div>
                        <p
                          dir="rtl"
                          className="font-arabic-cinema text-2xl sm:text-[26px] leading-[2.2] text-[#042B25] dark:text-[#FFFDF7] text-right select-text"
                        >
                          {infoQuestion.fullArabicText}
                        </p>
                      </div>

                      {/* 2. Official Uzbek Translation from Quran Section */}
                      <div className="rounded-2xl bg-white/70 dark:bg-[#041D18]/80 border border-[#063D32]/10 dark:border-[#C6A45C]/20 p-4 space-y-2">
                        <div className="text-xs font-bold text-[#063D32] dark:text-[#DCC58C]">
                          Oʻzbekcha maʼnolar tarjimasi
                        </div>
                        {infoQuestion.translationUz ? (
                          <p className="text-sm sm:text-[15px] text-[#042B25] dark:text-[#F8F5EC] leading-relaxed select-text">
                            {infoQuestion.translationUz}
                          </p>
                        ) : (
                          <p className="text-sm text-[#5C746C] dark:text-[#8FA69E]">
                            Ushbu oyat tarjimasi Qurʼon boʻlimi bazasida hozircha topilmadi.
                          </p>
                        )}
                      </div>

                      {/* 3. Full Existing Tafsir Text (Comfortable Scrollable Reading Box) */}
                      <div className="rounded-2xl bg-[#063D32]/5 dark:bg-[#041D18] border border-[#063D32]/15 dark:border-[#C6A45C]/25 p-4 space-y-2">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-bold text-[#063D32] dark:text-[#DCC58C]">
                            {infoQuestion.tafsirScope === 'ayah'
                              ? 'Oyat tafsiri (Tafsiri Hilol)'
                              : infoQuestion.tafsirScope === 'surah'
                                ? 'Sura tafsiri va fazilatlari (Tafsiri Hilol)'
                                : 'Tafsir'}
                          </span>
                        </div>
                        <div className="max-h-[340px] overflow-y-auto pr-2">
                          <p className="text-sm sm:text-[15px] text-[#1D3931] dark:text-[#E5E0D5] leading-[1.78] whitespace-pre-line select-text">
                            {infoQuestion.tafsirTextUz
                              ? infoQuestion.tafsirTextUz
                              : 'Ushbu oyat uchun tafsir matni Qurʼon boʻlimi bazasida hozircha mavjud emas.'}
                          </p>
                        </div>
                      </div>

                      {/* 5. Explicit Source Metadata Footer (shown honestly when available) */}
                      <div className="text-xs text-[#5C746C] dark:text-[#8FA69E] space-y-1 pt-2 border-t border-[#063D32]/10 dark:border-[#C6A45C]/15">
                        {infoQuestion.translationUz && (
                          <div>
                            Tarjima manbasi:{' '}
                            <span className="text-[#042B25] dark:text-[#D4CFC3] font-medium">
                              {infoQuestion.translatorName || 'Shayx Muhammad Sodiq Muhammad Yusuf'}
                              {infoQuestion.translationSource ? ` — ${infoQuestion.translationSource}` : ''}
                            </span>
                          </div>
                        )}
                        {infoQuestion.tafsirTextUz && infoQuestion.tafsirSource && (
                          <div>
                            Tafsir manbasi:{' '}
                            <span className="text-[#042B25] dark:text-[#D4CFC3] font-medium">
                              {infoQuestion.tafsirSource}
                            </span>
                          </div>
                        )}
                        <div>Qori: {infoQuestion.reciterName}</div>
                      </div>
                    </div>
                  )}
                </section>
              );
            })()
          ) : null}

          <div className="rounded-3xl bg-[#F8F5EC] dark:bg-[#06241E] border border-[#063D32]/15 dark:border-[#C6A45C]/25 p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-[#063D32] dark:text-[#C6A45C]">
                  1080×1920 YouTube Shorts · Reels Studio
                </p>
                <h2 className="text-xl font-display font-bold text-[#042B25] dark:text-[#F8F5EC] mt-0.5">
                  Pro Quran Cinema Quiz
                </h2>
              </div>
              <span className="text-xs font-mono-numbers tabular-nums text-[#063D32] dark:text-[#DCC58C] font-semibold">
                {activeQuizDateStr}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-[#2C4A42] dark:text-[#D4CFC3] leading-relaxed">
              Har kuni turli juz va suralardan takrorlanmas 10 ta oyat tanlanadi va doimiy arxivda saqlanadi. Har bir savol uchun mustaqil haqiqiy MP4 video (<code className="font-mono-numbers">quiz-01.mp4</code> – <code className="font-mono-numbers">quiz-10.mp4</code>, 1080×1920, H.264 + AAC) yaratiladi.
            </p>

            {/* Primary Reload / Today Selector */}
            <button
              type="button"
              disabled={phase === 'loading' || isAnyVideoRendering}
              onClick={() =>
                void loadQuiz(
                  selectedReciterId,
                  activeQuizDateStr === todayDateStr,
                  activeQuizDateStr
                )
              }
              className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-[#063D32] hover:bg-[#075747] disabled:opacity-50 text-[#F8F5EC] border border-[#C6A45C]/45 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4 text-[#DCC58C] shrink-0" />
              <span>
                {activeQuizDateStr === todayDateStr
                  ? 'Bugungi 10 ta savolni yangilash / tekshirish'
                  : `${activeQuizDateStr} sanadagi 10 ta savolni qayta yuklash`}
              </span>
            </button>

            {/* 10 Individual Question MP4 Video Export Cards (quiz-01.mp4 through quiz-10.mp4) */}
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {quizSet?.questions?.map((rawQ, qIdx) => {
                const partNum = qIdx + 1;
                const mp4Filename = formatQuizMp4Filename(partNum);
                const slot = questionExports[partNum];
                const isRendering = slot?.status === 'rendering';
                const isReady = slot?.status === 'ready';
                const isError = slot?.status === 'error';
                const q = enrichedById[rawQ.id] || normalizeQuizQuestion(rawQ);

                return (
                  <div
                    key={rawQ.id}
                    className="rounded-2xl bg-white/75 dark:bg-[#041D18] border border-[#063D32]/15 dark:border-[#C6A45C]/30 p-3.5 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-[#042B25] dark:text-[#DCC58C]">
                        {partNum}-savol: {q.surahNameUz} ({mp4Filename})
                      </span>
                      <span className="font-mono-numbers tabular-nums text-[11px] text-[#5C746C] dark:text-[#8FA69E]">
                        {isReady && slot.result ? `${slot.result.sizeMb} MB` : '9:16 · MP4'}
                      </span>
                    </div>

                    {!isRendering && !isReady && (
                      <button
                        type="button"
                        disabled={phase === 'loading'}
                        onClick={() => void handleExportSingleQuestionVideo(qIdx)}
                        className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-gradient-to-r from-[#C6A45C] to-[#DCC58C] hover:brightness-105 disabled:opacity-45 text-[#031814] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shadow-sm"
                      >
                        <Film className="w-4 h-4 shrink-0" />
                        <span>{mp4Filename} videoni yaratish</span>
                      </button>
                    )}

                    {isRendering && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-medium">
                          <span className="text-[#042B25] dark:text-[#F8F5EC] truncate pr-2">
                            {slot.stageLabel}
                          </span>
                          <span className="font-mono-numbers tabular-nums font-bold text-[#063D32] dark:text-[#DCC58C]">
                            {slot.progressPct}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[#063D32]/15 dark:bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#C6A45C] to-emerald-400 transition-all duration-150"
                            style={{ width: `${slot.progressPct}%` }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => singleAbortRefs.current[partNum]?.abort()}
                          className="w-full min-h-[38px] rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Toʻxtatish ({slot.progressPct}%)</span>
                        </button>
                      </div>
                    )}

                    {isError && slot.errorText && (
                      <div className="rounded-xl px-3 py-2 text-[11px] flex items-start gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span className="leading-snug">{slot.errorText}</span>
                      </div>
                    )}

                    {isReady && slot.result && (
                      <div className="rounded-xl bg-[#041D18] border border-emerald-400/40 p-3 space-y-2.5 text-[#F8F5EC]">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-emerald-300">
                            {slot.result.filename} tayyor ({slot.result.sizeMb} MB)
                          </span>
                          <span className="font-mono-numbers text-[10px] text-[#8FA69E]">
                            1080×1920 · MP4
                          </span>
                        </div>
                        <video
                          src={slot.result.previewUrl}
                          controls
                          playsInline
                          className="w-full max-w-[160px] mx-auto aspect-[9/16] rounded-xl border border-[#C6A45C]/35 bg-black object-contain"
                        />
                        <div className="grid grid-cols-1 gap-1.5">
                          <button
                            type="button"
                            onClick={() => void handleDownloadReadyQuestionVideo(qIdx)}
                            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#C6A45C] to-[#DCC58C] hover:brightness-105 text-[#031814] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                          >
                            <Download className="w-3.5 h-3.5 shrink-0" />
                            <span>{slot.result.filename} faylni yuklab olish</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleShareSingleQuestionVideo(qIdx)}
                            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#063D32] hover:bg-[#075747] text-[#F8F5EC] border border-[#C6A45C]/45 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                          >
                            <Share2 className="w-3.5 h-3.5 text-[#DCC58C] shrink-0" />
                            <span>Ulashish (Android/PWA)</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 10 Shorts Episode Selector */}
            {quizSet && quizSet.questions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#042B25] dark:text-[#DCC58C]">
                    10 ta Shorts roʻyxati (tanlash va eksport)
                  </span>
                  <span className="text-[#5C746C] dark:text-[#8FA69E] tabular-nums">
                    Ishlatilgan oyatlar: {usedVersesCount}
                  </span>
                </div>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                  {quizSet.questions.map((q, idx) => {
                    const isActiveShort = idx === currentIndex && phase !== 'finished';
                    return (
                      <button
                        key={q.id}
                        type="button"
                        disabled={isAnyVideoRendering}
                        onClick={() => handleJumpToShort(idx)}
                        title={`${q.surahNameUz} (${q.ayahKey})`}
                        className={`min-h-[40px] rounded-lg text-xs font-mono-numbers tabular-nums font-bold border transition-colors cursor-pointer ${
                          isActiveShort
                            ? 'bg-[#063D32] text-[#F8F5EC] border-[#C6A45C]'
                            : 'bg-white/70 dark:bg-[#041D18] text-[#042B25] dark:text-[#D4CFC3] border-[#063D32]/15 dark:border-[#C6A45C]/20 hover:border-[#C6A45C]'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reciter Selection (All Unified Quran Section Reciters with Honest Capability Check) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-[#042B25] dark:text-[#DCC58C] flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Qorini tanlash (savollar oʻzgarmaydi, faqat tilovat ovozi yangilanadi)</span>
                </label>
                <span className="text-[11px] text-[#5C746C] dark:text-[#8FA69E] tabular-nums">
                  {reciters.filter((r) => getQuranReciterAudioCapabilities(r).quizReady).length} / {reciters.length} tayyor
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {reciters.map((rec) => {
                  const caps = getQuranReciterAudioCapabilities(rec);
                  const active = rec.id === selectedReciterId;
                  return (
                    <button
                      key={rec.id}
                      type="button"
                      disabled={isAnyVideoRendering || !caps.quizReady}
                      onClick={() => handleReciterChange(rec.id)}
                      title={
                        caps.quizReady
                          ? caps.statusLabelUz
                          : `${rec.name}: ${caps.statusLabelUz}`
                      }
                      className={`min-h-[54px] px-3 py-2 rounded-xl border text-left transition-all ${
                        !caps.quizReady
                          ? 'bg-white/40 dark:bg-[#041D18]/50 text-[#5C746C] dark:text-[#8FA69E] border-[#063D32]/10 dark:border-[#C6A45C]/10 opacity-65 cursor-not-allowed'
                          : active
                            ? 'bg-[#063D32] text-[#F8F5EC] border-[#C6A45C] shadow-sm cursor-pointer'
                            : 'bg-white/70 dark:bg-[#041D18] text-[#042B25] dark:text-[#F8F5EC] border-[#063D32]/15 dark:border-[#C6A45C]/20 hover:border-[#C6A45C] cursor-pointer'
                      }`}
                    >
                      <div className="text-xs font-bold truncate">{rec.name}</div>
                      <div className="text-[10px] opacity-80 truncate">
                        {rec.country} · {rec.style}
                      </div>
                      <div
                        className={`text-[10px] mt-0.5 truncate ${
                          caps.quizReady
                            ? active
                              ? 'text-[#DCC58C]'
                              : 'text-emerald-700 dark:text-emerald-400'
                            : 'text-amber-700 dark:text-amber-300/90'
                        }`}
                      >
                        {caps.statusLabelUz}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {quizSource && (
              <div className="text-[11px] text-[#5C746C] dark:text-[#8FA69E] flex items-center justify-between pt-2 border-t border-[#063D32]/10 dark:border-[#C6A45C]/15">
                <span>
                  Manba:{' '}
                  {quizSource === 'gemini_audio'
                    ? 'Gemini Audio + JSON (Arxivlangan)'
                    : quizSource.includes('archive') || quizSource.includes('firestore')
                      ? 'Doimiy Firestore arxivi'
                      : 'Saqlangan kanonik toʻplam'}
                </span>
                <span>Kanonik matn: Uthmani</span>
              </div>
            )}
          </div>

          {/* Attempt History Card */}
          <div className="rounded-3xl bg-[#F8F5EC] dark:bg-[#06241E] border border-[#063D32]/15 dark:border-[#C6A45C]/25 p-5 sm:p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-display font-bold text-[#042B25] dark:text-[#F8F5EC] flex items-center gap-2">
                <History className="w-4 h-4 text-[#C6A45C]" />
                <span>Soʻnggi Natijalar va Urinishlar Tarixi</span>
              </h3>
              <span className="text-xs text-[#5C746C] dark:text-[#8FA69E] tabular-nums">
                {attempts.length} ta urinish
              </span>
            </div>

            {attempts.length === 0 ? (
              <p className="text-xs text-[#5C746C] dark:text-[#8FA69E]">
                Hali kunlik audio viktorina yakunlanmagan. Boshlash uchun chap tomondagi «Tilovatni boshlash» tugmasini bosing.
              </p>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {attempts.slice(0, 8).map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-white/75 dark:bg-[#041D18] border border-[#063D32]/10 dark:border-[#C6A45C]/15"
                  >
                    <div>
                      <div className="font-semibold text-[#042B25] dark:text-[#F8F5EC] flex items-center gap-1.5">
                        <span>{att.dateStr}</span>
                        {att.attemptNumber ? (
                          <span className="px-1.5 py-0.5 rounded bg-[#063D32]/10 dark:bg-white/10 text-[10px] font-mono-numbers">
                            {att.attemptNumber}-urinish
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[10px] text-[#5C746C] dark:text-[#8FA69E]">
                        {reciters.find((r) => r.id === att.reciterId)?.name || att.reciterId}
                      </div>
                    </div>
                    <div className="text-right font-mono-numbers tabular-nums">
                      <div className="font-bold text-emerald-700 dark:text-emerald-300">
                        {att.score} / {att.total}
                      </div>
                      <div className="text-[10px] text-[#5C746C] dark:text-[#8FA69E]">
                        {att.percentage}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
