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
} from 'lucide-react';
import {
  getActiveQuranReciters,
  getQuranReciterAudioCapabilities,
} from '../../../data/quranData';
import { subscribeToDatabase } from '../../../utils/databaseService';
import { syncRecitersAndAudioFromFirestore } from '../../../utils/quranReciterStorageService';
import type {
  DailyQuranQuizSet,
  QuranQuizAttempt,
  QuranQuizAttemptAnswer,
  QuranQuizQuestion,
  QuranReciter,
} from '../../../types';
import {
  QuranQuizApiError,
  QuranQuizClockAudio,
  calculateAttemptSummary,
  computeQuestionAudioSlice,
  enrichQuizQuestionFromQuranSection,
  fetchOrCreateDailyQuranQuiz,
  getDefaultQuizReciterId,
  getStoredQuranQuizAttempts,
  getStoredQuranQuizReciterId,
  getStoredQuranQuizStreak,
  getTodayTashkentDateStr,
  getUsedAyahKeys,
  normalizeDailyQuizSet,
  normalizeQuizQuestion,
  saveQuranQuizAttemptToCloud,
  saveStoredQuranQuizReciterId,
} from '../../../utils/quranQuizService';
import {
  exportQuizPartMP4Video,
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

const TIMER_DURATION_MS = 3500;
const VISUALIZER_BAR_COUNT = 24;

export const DailyQuranQuizView: React.FC = () => {
  const todayDateStr = useMemo(() => getTodayTashkentDateStr(), []);
  const [reciters, setReciters] = useState<QuranReciter[]>(() => getActiveQuranReciters());

  const [selectedReciterId, setSelectedReciterId] = useState<string>(() =>
    getStoredQuranQuizReciterId()
  );
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

interface QuizPartExportSlot {
  status: 'idle' | 'rendering' | 'ready' | 'error';
  progressPct: number;
  stageLabel: string;
  errorText: string;
  result: (QuizPartExportResult & { sizeMb: string; title: string }) | null;
}

const createInitialPartExports = (): Record<1 | 2, QuizPartExportSlot> => ({
  1: { status: 'idle', progressPct: 0, stageLabel: '', errorText: '', result: null },
  2: { status: 'idle', progressPct: 0, stageLabel: '', errorText: '', result: null },
});

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

  // Independent 5-Question 1080x1920 Video Export Slots (Part 1: 1-5, Part 2: 6-10)
  const [partExports, setPartExports] = useState<Record<1 | 2, QuizPartExportSlot>>(
    createInitialPartExports
  );
  const [isBufferingAudio, setIsBufferingAudio] = useState<boolean>(false);
  const partAbortRefs = useRef<Record<1 | 2, AbortController | null>>({ 1: null, 2: null });

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

  const isAnyVideoRendering =
    partExports[1].status === 'rendering' || partExports[2].status === 'rendering';

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

  // Subtle drifting golden light particles inside the 9:16 Cinema Stage
  useEffect(() => {
    const canvas = particleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const width = 420;
    const height = 746;
    canvas.width = width;
    canvas.height = height;

    const particles = Array.from({ length: 30 }).map((_, i) => ({
      x: (i * 53) % width,
      y: (i * 97) % height,
      r: 0.9 + (i % 3) * 0.75,
      speedY: 0.22 + (i % 5) * 0.12,
      driftPhase: i * 0.65,
      alpha: 0.18 + (i % 4) * 0.11,
    }));

    let animId = 0;
    let tick = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      tick += 0.016;
      for (const p of particles) {
        if (!prefersReducedMotion) {
          p.y -= p.speedY;
          if (p.y < -8) p.y = height + 8;
        }
        const px = p.x + Math.sin(tick + p.driftPhase) * 6;
        ctx.fillStyle = `rgba(220, 197, 140, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(px, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
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
      partAbortRefs.current[1]?.abort();
      partAbortRefs.current[2]?.abort();
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

  const loadQuiz = useCallback(
    async (reciterId: string, forceRefresh = false) => {
      partAbortRefs.current[1]?.abort();
      partAbortRefs.current[2]?.abort();
      stopAllActiveTimersAndAudio();
      clockAudioRef.current?.setActiveReciter(reciterId);
      setPhase('loading');
      setErrorMessage('');
      setPartExports(createInitialPartExports());
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

      try {
        const result = await fetchOrCreateDailyQuranQuiz({
          dateStr: todayDateStr,
          reciterId,
          forceRefresh,
        });
        setQuizSet(normalizeDailyQuizSet(result.quizSet));
        setQuizSource(result.source);
        setUsedVersesCount(getUsedAyahKeys().length);
        setPhase('ready');
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
    [stopAllActiveTimersAndAudio, todayDateStr]
  );

  useEffect(() => {
    void loadQuiz(selectedReciterId, false);
  }, [loadQuiz, selectedReciterId]);

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
  };

  const handleExportQuizPartVideo = async (partIndex: 1 | 2) => {
    if (!quizSet?.questions?.length) return;
    if (partExports[partIndex].status === 'rendering') return;

    const sliceStart = partIndex === 1 ? 0 : 5;
    const sliceEnd = partIndex === 1 ? 5 : 10;
    const partSlice = quizSet.questions.slice(sliceStart, sliceEnd);
    const rangeLabel = partIndex === 1 ? '1–5' : '6–10';

    if (partSlice.length === 0) {
      setPartExports((prev) => ({
        ...prev,
        [partIndex]: {
          status: 'error',
          progressPct: 0,
          stageLabel: '',
          errorText: `${partIndex}-video (${rangeLabel}) uchun savollar topilmadi.`,
          result: null,
        },
      }));
      return;
    }

    stopAllActiveTimersAndAudio();
    partAbortRefs.current[partIndex]?.abort();
    const controller = new AbortController();
    partAbortRefs.current[partIndex] = controller;

    setPartExports((prev) => ({
      ...prev,
      [partIndex]: {
        status: 'rendering',
        progressPct: 1,
        stageLabel: `${partIndex}-video (${rangeLabel}): Qurʼon tarjimalari tekshirilmoqda...`,
        errorText: '',
        result: null,
      },
    }));

    try {
      const hydratedPart = await Promise.all(
        partSlice.map(async (raw) => {
          const base = enrichedById[raw.id] || normalizeQuizQuestion(raw);
          return base.translationUz ? base : enrichQuizQuestionFromQuranSection(base);
        })
      );

      if (controller.signal.aborted) {
        throw new DOMException('Eksport bekor qilindi.', 'AbortError');
      }

      const reciterDisplayName =
        quizSet.reciterName ||
        reciters.find((r) => r.id === selectedReciterId)?.name ||
        hydratedPart[0]?.reciterName ||
        'Qori';

      const result = await exportQuizPartMP4Video({
        questionsPart: hydratedPart,
        partIndex,
        partRangeLabel: rangeLabel,
        globalStartNumber: sliceStart + 1,
        totalQuizQuestions: quizSet.questions.length,
        reciterName: reciterDisplayName,
        quizDateStr: quizSet.dateStr,
        scoreSummary: phase === 'finished' ? finishedSummary : null,
        countdownMs: TIMER_DURATION_MS,
        signal: controller.signal,
        onProgress: (pct, label) => {
          setPartExports((prev) => ({
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
      setPartExports((prev) => ({
        ...prev,
        [partIndex]: {
          status: 'ready',
          progressPct: 100,
          stageLabel: `${partIndex}-video (${rangeLabel}-savollar, ${sizeMb} MB) yuklab olishga tayyor!`,
          errorText: '',
          result: {
            ...result,
            sizeMb,
            title: `Kunlik Qurʼon Viktorinasi · ${rangeLabel}-savollar (${reciterDisplayName})`,
          },
        },
      }));
      triggerServerMp4Download({
        downloadUrl: result.downloadUrl,
        filename: result.filename,
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setPartExports((prev) => ({
          ...prev,
          [partIndex]: {
            status: 'idle',
            progressPct: 0,
            stageLabel: '',
            errorText: '',
            result: prev[partIndex].result,
          },
        }));
      } else {
        setPartExports((prev) => ({
          ...prev,
          [partIndex]: {
            status: 'error',
            progressPct: 0,
            stageLabel: '',
            errorText:
              err?.message || `${partIndex}-videoni (${rangeLabel}) tayyorlashda xatolik yuz berdi.`,
            result: null,
          },
        }));
      }
    } finally {
      if (partAbortRefs.current[partIndex] === controller) {
        partAbortRefs.current[partIndex] = null;
      }
    }
  };

  const handleCancelQuizPartExport = (partIndex: 1 | 2) => {
    partAbortRefs.current[partIndex]?.abort();
  };

  const handleShareQuizPartVideo = async (partIndex: 1 | 2) => {
    const slot = partExports[partIndex];
    if (slot.status !== 'ready' || !slot.result) return;
    await shareServerMp4Video({
      previewUrl: slot.result.previewUrl,
      downloadUrl: slot.result.downloadUrl,
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

  return (
    <div className="max-w-6xl mx-auto pb-24 px-1 sm:px-3">
      <div className="grid grid-cols-1 lg:grid-cols-[430px_1fr] gap-6 items-start justify-center">
        {/* LEFT COLUMN: 9:16 PRO QURAN CINEMA SHORTS STAGE */}
        <div className="w-full max-w-[430px] mx-auto">
          <div
            className="relative w-full aspect-[9/16] min-h-[690px] sm:min-h-[735px] rounded-[30px] overflow-hidden border border-[#C6A45C]/45 text-[#F8F5EC] shadow-2xl flex flex-col justify-between p-4 sm:p-5"
            style={{
              background: 'linear-gradient(180deg, #02140c 0%, #07291a 52%, #010a06 100%)',
            }}
          >
            {/* Layer 1: Slowly Rotating Transparent Islamic Geometric Mandala SVG */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-30"
            >
              <svg
                viewBox="0 0 400 400"
                className="w-[480px] h-[480px] animate-mandala-slow text-[#C6A45C]"
                fill="none"
              >
                <circle cx="200" cy="200" r="188" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.45" />
                <circle cx="200" cy="200" r="154" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.35" />
                <circle cx="200" cy="200" r="112" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.3" />
                <circle cx="200" cy="200" r="68" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.28" />
                {Array.from({ length: 12 }).map((_, i) => (
                  <g key={i} transform={`rotate(${i * 30} 200 200)`}>
                    <polygon
                      points="200,18 228,110 200,152 172,110"
                      stroke="currentColor"
                      strokeWidth="0.8"
                      strokeOpacity="0.35"
                    />
                  </g>
                ))}
                <rect
                  x="96"
                  y="96"
                  width="208"
                  height="208"
                  stroke="currentColor"
                  strokeWidth="0.8"
                  strokeOpacity="0.3"
                />
                <rect
                  x="96"
                  y="96"
                  width="208"
                  height="208"
                  transform="rotate(45 200 200)"
                  stroke="currentColor"
                  strokeWidth="0.8"
                  strokeOpacity="0.3"
                />
              </svg>
            </div>

            {/* Layer 2: Drifting Golden Light Particles Canvas */}
            <canvas
              ref={particleCanvasRef}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 w-full h-full"
            />

            {/* Layer 3: Subtle Radial Illumination Halo */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at 50% 24%, rgba(220,197,140,0.16) 0%, rgba(16,185,129,0.06) 44%, transparent 74%)',
              }}
            />

            {/* 1. TOP PROGRESS BAR & SHORTS HEADER */}
            <header className="relative z-10 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2" aria-label="Viktorina bosqichlari">
                  {[0, 1, 2, 3].map((circleIdx) => {
                    const thresholdQuestion = circleIdx * 3;
                    const isCompleted =
                      phase === 'finished' || currentIndex > thresholdQuestion + 1;
                    const isActive =
                      phase !== 'finished' && circleIdx === activeGroupIdx;
                    return (
                      <span
                        key={circleIdx}
                        className={`w-3 h-3 rounded-full transition-all duration-300 border ${
                          isCompleted
                            ? 'bg-emerald-400 border-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.65)]'
                            : isActive
                              ? 'bg-[#DCC58C] border-[#F8F5EC] scale-110 shadow-[0_0_10px_rgba(220,197,140,0.75)]'
                              : 'bg-white/10 border-[#C6A45C]/40'
                        }`}
                      />
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono-numbers tabular-nums px-2.5 py-1 rounded-lg bg-[#063D32]/80 border border-[#C6A45C]/35 text-[#DCC58C]">
                    {phase === 'finished' ? '10 / 10' : `${currentIndex + 1} / 10`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsTickMuted((prev) => !prev)}
                    aria-label={isTickMuted ? 'Soat ovozini yoqish' : 'Soat ovozini oʻchirish'}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white/8 hover:bg-white/15 border border-[#C6A45C]/25 text-[#DCC58C] transition-colors cursor-pointer"
                  >
                    {isTickMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 10-question micro-segments */}
              <div className="grid grid-cols-10 gap-1">
                {Array.from({ length: 10 }).map((_, idx) => {
                  const ans = answersMap[idx];
                  const q = quizSet?.questions?.[idx];
                  let segClass = 'bg-white/12';
                  if (ans && q) {
                    segClass =
                      ans.selectedIndex === q.correctIndex
                        ? 'bg-emerald-400'
                        : 'bg-rose-400/90';
                  } else if (idx === currentIndex && phase !== 'finished') {
                    segClass = 'bg-[#DCC58C]';
                  }
                  return (
                    <div
                      key={idx}
                      className={`h-1 rounded-full transition-colors duration-300 ${segClass}`}
                    />
                  );
                })}
              </div>

              {/* Title + Reciter + Streak */}
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <div className="min-w-0">
                  <h1 className="text-sm sm:text-base font-display font-bold tracking-wide text-[#F8F5EC] truncate">
                    Pro Quran Cinema Quiz
                  </h1>
                  <p className="text-[11px] text-[#C6A45C] truncate">
                    {quizSet?.reciterName ||
                      reciters.find((r) => r.id === selectedReciterId)?.name ||
                      'Shayx Mishariy al-Afosiy'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold tabular-nums text-amber-300 shrink-0">
                  <Flame className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{streak.count}</span>
                </div>
              </div>
            </header>

            {/* 2. CENTER BODY BY PHASE */}
            {phase === 'loading' && (
              <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 space-y-4">
                <div className="w-16 h-16 rounded-2xl cinema-gold-glass border border-[#C6A45C]/50 flex items-center justify-center">
                  <Headphones className="w-8 h-8 text-[#DCC58C] animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-base font-display font-bold text-[#F8F5EC]">
                    10 ta noyob Shorts tayyorlanmoqda
                  </h2>
                  <p className="text-xs text-[#D4CFC3]/85 leading-relaxed max-w-xs mx-auto">
                    Gemini AI tilovat audiosini tahlil qilib pauza nuqtalari va javob variantlarini tayyorlamoqda, oyat tarjimasi va tafsiri esa Qurʼon boʻlimi bazasidan olinmoqda...
                  </p>
                </div>
              </div>
            )}

            {phase === 'error' && (
              <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 space-y-4">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${
                    isQuotaLimited
                      ? 'bg-amber-500/15 border-amber-400/40'
                      : 'bg-rose-500/15 border-rose-400/40'
                  }`}
                >
                  <AlertTriangle
                    className={`w-7 h-7 ${isQuotaLimited ? 'text-amber-300' : 'text-rose-300'}`}
                  />
                </div>
                <div className="space-y-2">
                  <h2 className="text-base font-display font-bold text-[#F8F5EC]">
                    {isQuotaLimited
                      ? 'Kunlik AI kvotasi vaqtincha tugadi'
                      : 'Audio tahlilni yuklab boʻlmadi'}
                  </h2>
                  <p className="text-xs text-[#F8F5EC]/85 leading-relaxed max-w-xs mx-auto">
                    {errorMessage}
                  </p>
                </div>
                <div className="flex flex-col items-center gap-2.5 w-full max-w-[260px]">
                  {quotaFallbackQuizzes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const archived = quotaFallbackQuizzes[0];
                        if (!archived) return;
                        stopAllActiveTimersAndAudio();
                        setQuizSet(archived);
                        setQuizSource('archive');
                        setCurrentIndex(0);
                        setSelectedOption(null);
                        setAnswersMap({});
                        setTimerRemainingMs(TIMER_DURATION_MS);
                        setIsPaused(false);
                        setErrorMessage('');
                        setPhase('ready');
                      }}
                      className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#031814] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <History className="w-4 h-4 shrink-0" />
                      <span>Mavjud arxiv viktorinani ochish</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void loadQuiz(selectedReciterId, true)}
                    className="w-full min-h-[44px] px-5 py-2.5 rounded-xl bg-[#C6A45C] hover:bg-[#DCC58C] text-[#031814] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <RefreshCw className="w-4 h-4 shrink-0" />
                    <span>Qayta urinish</span>
                  </button>
                </div>
              </div>
            )}

            {phase === 'finished' && quizSet && (
              <div className="relative z-10 flex-1 flex flex-col justify-between py-2.5 overflow-y-auto pr-1 space-y-3">
                <div className="rounded-2xl cinema-gold-glass border border-[#C6A45C]/45 p-4 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#C6A45C]/20 border border-[#C6A45C]/50 mx-auto flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-[#DCC58C]" />
                  </div>
                  <div>
                    <p className="text-[11px] tracking-widest text-[#C6A45C] font-semibold">
                      Kunlik viktorina yakunlandi
                    </p>
                    <h2 className="text-2xl font-display font-bold text-[#F8F5EC] tabular-nums mt-0.5">
                      {finishedSummary.score} / {finishedSummary.total} ({finishedSummary.percentage}%)
                    </h2>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="py-1.5 border-r border-[#C6A45C]/20">
                      <div className="text-sm font-bold text-emerald-300 tabular-nums">
                        {finishedSummary.score}
                      </div>
                      <div className="text-[11px] text-emerald-200/80">Toʻgʻri</div>
                    </div>
                    <div className="py-1.5 border-r border-[#C6A45C]/20">
                      <div className="text-sm font-bold text-rose-300 tabular-nums">
                        {finishedSummary.incorrectCount}
                      </div>
                      <div className="text-[11px] text-rose-200/80">Notoʻgʻri</div>
                    </div>
                    <div className="py-1.5">
                      <div className="text-sm font-bold text-[#DCC58C] tabular-nums">
                        {streak.count} kun
                      </div>
                      <div className="text-[11px] text-[#D4CFC3]/80">Muntazamlik</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-[285px] overflow-y-auto pr-1">
                  {quizSet.questions.map((rawQ, idx) => {
                    const q = enrichedById[rawQ.id] || normalizeQuizQuestion(rawQ);
                    const ans = answersMap[idx];
                    const isRight = ans?.selectedIndex === q.correctIndex;
                    return (
                      <div
                        key={q.id}
                        className="rounded-xl cinema-gold-glass border border-[#C6A45C]/25 p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-[#DCC58C]">
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
                          className="font-arabic-cinema text-base leading-loose text-[#F8F5EC] text-right"
                        >
                          {q.fullArabicText}
                        </p>
                        {q.translationUz ? (
                          <div className="text-[11px] text-[#D4CFC3] leading-relaxed border-t border-[#C6A45C]/15 pt-1.5 space-y-0.5">
                            <p>{q.translationUz}</p>
                            <p className="text-[10px] text-[#C6A45C]/90">
                              Tarjima: {q.translatorName || 'Shayx Muhammad Sodiq Muhammad Yusuf'}
                            </p>
                          </div>
                        ) : (
                          <p className="text-[10px] text-[#8FA69E] border-t border-[#C6A45C]/15 pt-1.5">
                            Tarjima matni hozircha yuklanmadi.
                          </p>
                        )}
                        <div className="text-[10px] text-[#D4CFC3]/85 leading-relaxed bg-black/20 rounded-lg p-2">
                          <span className="font-semibold text-[#DCC58C]">
                            {q.tafsirScope === 'ayah'
                              ? 'Oyat tafsiri: '
                              : q.tafsirScope === 'surah'
                                ? 'Sura sharhi (Tafsiri Hilol): '
                                : 'Tafsir: '}
                          </span>
                          {q.tafsirTextUz
                            ? q.tafsirTextUz
                            : 'Ushbu oyat uchun tafsir matni bazada hozircha mavjud emas'}
                        </div>
                        <div className="flex items-center justify-between pt-1 gap-2">
                          <span className="text-[10px] text-[#8FA69E] truncate">
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
                              className="min-h-[36px] px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 border border-[#C6A45C]/30 text-[#F8F5EC] text-[11px] font-semibold cursor-pointer whitespace-nowrap"
                            >
                              Tafsir
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePlayReviewAyah(q, idx)}
                              className="min-h-[36px] px-3 py-1 rounded-lg bg-[#C6A45C]/20 hover:bg-[#C6A45C]/30 border border-[#C6A45C]/40 text-[#DCC58C] text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={partExports[1].status === 'rendering'}
                      onClick={() => void handleExportQuizPartVideo(1)}
                      className="min-h-[44px] rounded-xl bg-gradient-to-r from-[#C6A45C] to-[#DCC58C] hover:brightness-105 disabled:opacity-55 text-[#031814] font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg cursor-pointer px-3 whitespace-nowrap"
                    >
                      <Film className="w-4 h-4 shrink-0" />
                      <span className="truncate">
                        {partExports[1].status === 'rendering'
                          ? `1-Video (${partExports[1].progressPct}%)`
                          : '1-Videoni yuklab olish (1–5)'}
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={partExports[2].status === 'rendering' || (quizSet?.questions?.length || 0) <= 5}
                      onClick={() => void handleExportQuizPartVideo(2)}
                      className="min-h-[44px] rounded-xl bg-gradient-to-r from-[#C6A45C] to-[#DCC58C] hover:brightness-105 disabled:opacity-55 text-[#031814] font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg cursor-pointer px-3 whitespace-nowrap"
                    >
                      <Film className="w-4 h-4 shrink-0" />
                      <span className="truncate">
                        {partExports[2].status === 'rendering'
                          ? `2-Video (${partExports[2].progressPct}%)`
                          : '2-Videoni yuklab olish (6–10)'}
                      </span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleRestartQuiz}
                    className="w-full min-h-[44px] rounded-xl bg-white/10 hover:bg-white/15 border border-[#C6A45C]/35 text-[#F8F5EC] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Qayta ishlash</span>
                  </button>
                </div>
              </div>
            )}

            {/* ACTIVE CINEMA QUIZ STAGE */}
            {currentQuestion &&
              phase !== 'loading' &&
              phase !== 'error' &&
              phase !== 'finished' && (
                <>
                  <main className="relative z-10 flex-1 flex flex-col justify-center my-2.5 space-y-3">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentQuestion.id}
                        initial={{ opacity: 0, scale: 0.94, y: 14 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: -10 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                        className="p-[1px] rounded-[22px] bg-gradient-to-br from-[#DCC58C]/65 via-[#C6A45C]/25 to-[#DCC58C]/50 shadow-2xl"
                      >
                        <div className="rounded-[21px] cinema-gold-glass p-4 sm:p-5 space-y-2.5">
                          {/* Card Address Header */}
                          <div className="flex items-center justify-between text-xs border-b border-[#C6A45C]/20 pb-2">
                            <span className="font-semibold text-[#DCC58C]">
                              {currentQuestion.surahNameUz} surasi, {currentQuestion.ayahNumberInSurah}-oyat
                            </span>
                            <span className="font-arabic-cinema text-base text-[#C6A45C]" dir="rtl">
                              {currentQuestion.surahNameAr}
                            </span>
                          </div>

                          {/* Arabic Ayah Text with Gold-White Glow + Animated Reveal supporting start/middle/end */}
                          <div
                            dir="rtl"
                            className="font-arabic-cinema text-[clamp(1.4rem,4.4vw,1.98rem)] leading-[2.2] text-center py-1.5 select-text"
                          >
                            {currentQuestion.hidePos !== 'start' &&
                              (currentQuestion.maskedArabicBefore || currentQuestion.maskedArabicPrefix) && (
                                <span className="cinema-gold-text-glow">
                                  {currentQuestion.maskedArabicBefore || currentQuestion.maskedArabicPrefix}{' '}
                                </span>
                              )}
                            {phase === 'revealed_playing_tail' ? (
                              <motion.span
                                initial={{ y: -16, scale: 0.8, opacity: 0 }}
                                animate={{ y: 0, scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 360, damping: 18 }}
                                className="inline-block px-2.5 py-0.5 rounded-xl bg-emerald-500/25 border border-emerald-400 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.45)] mx-1"
                              >
                                {currentQuestion.hiddenWord}
                                {currentQuestion.hidePos === 'end' && currentQuestion.trailingMarker
                                  ? ` ${currentQuestion.trailingMarker}`
                                  : ''}
                              </motion.span>
                            ) : (
                              <span
                                className={`inline-block px-3 py-0.5 mx-1 rounded-xl border border-dashed text-base align-middle transition-colors duration-200 ${
                                  phase === 'countdown_waiting'
                                    ? 'border-[#DCC58C] bg-[#C6A45C]/20 text-[#DCC58C]'
                                    : 'border-[#C6A45C]/50 bg-white/5 text-[#C6A45C]/75'
                                }`}
                              >
                                [ . . . ]
                              </span>
                            )}
                            {currentQuestion.maskedArabicAfter && (
                              <span className="cinema-gold-text-glow">
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

                          {/* Uzbek Translation Subtitle (Shown cleanly on reveal so hidden word isn't spoiled prematurely) */}
                          {phase === 'revealed_playing_tail' && currentQuestion.translationUz && (
                            <p className="text-[11px] sm:text-xs text-[#D4CFC3]/95 text-center leading-relaxed line-clamp-3 px-1">
                              {currentQuestion.translationUz}
                            </p>
                          )}

                          {/* Real-time Web Audio Frequency Visualizer */}
                          <div
                            aria-hidden="true"
                            className="flex items-end justify-center gap-1 h-7 pt-1"
                          >
                            {waveBins.map((amp, bIdx) => {
                              const mirrorWeight =
                                1 - Math.abs(bIdx - VISUALIZER_BAR_COUNT / 2) / (VISUALIZER_BAR_COUNT / 2) * 0.35;
                              const barHeightPx = isWaveformActive
                                ? Math.max(4, Math.round(amp * 26 * mirrorWeight))
                                : 4;
                              return (
                                <span
                                  key={bIdx}
                                  className={`w-1 rounded-full transition-[height,background-color] duration-75 ${
                                    phase === 'revealed_playing_tail'
                                      ? 'bg-emerald-400/85'
                                      : isWaveformActive
                                        ? 'bg-gradient-to-t from-[#C6A45C] to-[#F5E6BE]'
                                        : 'bg-[#C6A45C]/30'
                                  }`}
                                  style={{ height: `${barHeightPx}px` }}
                                />
                              );
                            })}
                          </div>

                          {/* Playback Status & Transport Controls */}
                          <div className="flex items-center justify-between pt-1.5 border-t border-[#C6A45C]/15">
                            <div className="flex items-center gap-1.5 text-[11px] text-[#D4CFC3]">
                              {isBufferingAudio ? (
                                <span className="flex items-center gap-1.5 text-[#DCC58C] font-semibold animate-pulse">
                                  <Headphones className="w-3.5 h-3.5" />
                                  Audio yuklanmoqda...
                                </span>
                              ) : isWaveformActive ? (
                                <span className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                                  <Sparkles className="w-3.5 h-3.5" />
                                  {phase === 'revealed_playing_tail'
                                    ? 'Toʻliq oyat eshittirilmoqda'
                                    : 'Qori tilovat qilmoqda'}
                                </span>
                              ) : phase === 'countdown_waiting' && !isPaused ? (
                                <span className="flex items-center gap-1.5 text-[#DCC58C] font-semibold">
                                  <Clock className="w-3.5 h-3.5" />
                                  {currentQuestion.hidePos === 'start'
                                    ? 'Oyat boshidagi soʻzni toping'
                                    : currentQuestion.hidePos === 'middle'
                                      ? 'Tushib qolgan soʻzni toping'
                                      : 'Oxirgi soʻzni toping'}
                                </span>
                              ) : isPaused ? (
                                <span className="text-amber-300 font-semibold">Pauza qilindi</span>
                              ) : (
                                <span className="text-[#C6A45C]">Boshlashga tayyor</span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={handleReplayCurrentPrefix}
                                disabled={phase === 'revealed_playing_tail'}
                                aria-label="Oyat boshidan qayta tinglash"
                                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white/8 hover:bg-white/15 disabled:opacity-40 border border-[#C6A45C]/25 text-[#F8F5EC] cursor-pointer"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={handleTogglePlayPause}
                                disabled={phase === 'revealed_playing_tail'}
                                aria-label={isPaused || phase === 'ready' ? 'Ijro etish' : 'Pauza'}
                                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#C6A45C] hover:bg-[#DCC58C] disabled:opacity-40 text-[#031814] font-bold cursor-pointer"
                              >
                                {isPaused || phase === 'ready' ? (
                                  <Play className="w-4 h-4 fill-current" />
                                ) : (
                                  <Pause className="w-4 h-4 fill-current" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    {/* 3.5-SECOND GOLDEN NEON CIRCULAR RING + LINEAR PROGRESS BAR */}
                    <div className="flex items-center gap-3 px-1">
                      <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 60 60">
                          <circle
                            cx="30"
                            cy="30"
                            r={ringRadius}
                            fill="none"
                            stroke="rgba(255,255,255,0.12)"
                            strokeWidth="4.5"
                          />
                          <circle
                            cx="30"
                            cy="30"
                            r={ringRadius}
                            fill="none"
                            stroke={phase === 'revealed_playing_tail' ? '#10b981' : '#DCC58C'}
                            strokeWidth="4.5"
                            strokeLinecap="round"
                            strokeDasharray={ringCircumference}
                            strokeDashoffset={ringDashOffset}
                            style={{
                              filter:
                                phase === 'revealed_playing_tail'
                                  ? 'drop-shadow(0 0 8px rgba(16,185,129,0.75))'
                                  : 'drop-shadow(0 0 8px rgba(220,197,140,0.75))',
                            }}
                          />
                        </svg>
                        <span className="absolute text-[11px] font-mono-numbers tabular-nums font-bold text-[#F8F5EC]">
                          {phase === 'revealed_playing_tail'
                            ? '✓'
                            : `${(timerRemainingMs / 1000).toFixed(1)}s`}
                        </span>
                      </div>

                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-medium">
                          <span className="text-[#D4CFC3]/90">
                            {phase === 'countdown_waiting'
                              ? 'Javob tanlash vaqti'
                              : phase === 'revealed_playing_tail'
                                ? 'Toʻgʻri javob aniqlandi'
                                : 'Pauza nuqtasida 3.5s taymer yoqiladi'}
                          </span>
                          <span className="font-mono-numbers tabular-nums text-[#DCC58C]">
                            {Math.round(timerProgressPct)}%
                          </span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden border border-[#C6A45C]/25">
                          <div
                            className={`h-full rounded-full transition-colors duration-200 ${
                              phase === 'revealed_playing_tail'
                                ? 'bg-emerald-400'
                                : timerRemainingMs <= 1200 && phase === 'countdown_waiting'
                                  ? 'bg-amber-400'
                                  : 'bg-gradient-to-r from-[#C6A45C] to-[#F5E6BE]'
                            }`}
                            style={{
                              width: `${phase === 'revealed_playing_tail' ? 100 : timerProgressPct}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </main>

                  {/* BOTTOM: 4 GLASSMORPHIC ANSWER BUTTONS OR START CTA */}
                  <footer className="relative z-10 space-y-2.5">
                    {phase === 'ready' && currentIndex === 0 ? (
                      <button
                        type="button"
                        onClick={() => startQuestionPlayback(0)}
                        className="w-full min-h-[56px] rounded-2xl bg-gradient-to-r from-[#C6A45C] via-[#DCC58C] to-[#C6A45C] text-[#031814] font-display font-bold text-base shadow-xl flex items-center justify-center gap-2.5 hover:brightness-105 transition-transform duration-200 cinema-spring active:scale-[0.98] cursor-pointer"
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

                          let btnStyle =
                            'cinema-gold-glass border-[#C6A45C]/35 text-[#F8F5EC] hover:border-[#DCC58C] hover:-translate-y-0.5';

                          if (isRevealed) {
                            if (isCorrectOption) {
                              btnStyle =
                                'bg-emerald-600/95 border-emerald-300 text-white shadow-[0_0_24px_rgba(16,185,129,0.55)] scale-[1.02]';
                            } else if (isSelected && !isCorrectOption) {
                              btnStyle =
                                'bg-rose-600/80 border-rose-300 text-white';
                            } else {
                              btnStyle =
                                'bg-[#06241E]/45 border-white/10 text-white/40';
                            }
                          } else if (isSelected) {
                            btnStyle =
                              'bg-[#C6A45C]/25 border-[#DCC58C] text-[#DCC58C] shadow-[0_0_16px_rgba(198,164,92,0.35)]';
                          }

                          return (
                            <button
                              key={`${currentQuestion.id}_opt_${idx}`}
                              type="button"
                              disabled={isRevealed}
                              onClick={() => handleSelectOption(idx)}
                              dir="rtl"
                              className={`min-h-[60px] px-3 py-2.5 rounded-2xl border font-arabic-cinema text-xl sm:text-[22px] leading-relaxed flex items-center justify-center gap-2 text-center transition-all duration-300 cinema-spring cursor-pointer active:scale-[0.97] ${btnStyle}`}
                            >
                              {isRevealed && isCorrectOption && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-100 shrink-0" />
                              )}
                              <span>{optWord}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {phase === 'revealed_playing_tail' && quizSet && (
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setAutoAdvanceEnabled((prev) => !prev)}
                          className={`min-h-[44px] px-3 py-2 rounded-xl border text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                            autoAdvanceEnabled
                              ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                              : 'bg-white/8 border-[#C6A45C]/30 text-[#D4CFC3] hover:border-[#DCC58C]'
                          }`}
                        >
                          {autoAdvanceEnabled ? 'Avto-oʻtish: Yoqilgan' : 'Avto-oʻtish: Oʻchiq'}
                        </button>
                        <button
                          type="button"
                          onClick={handleProceedToNextQuestion}
                          className={`flex-1 min-h-[44px] px-4 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                            isTailFinishedWaitingNext
                              ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-[#031814] shadow-lg'
                              : 'bg-[#C6A45C] hover:bg-[#DCC58C] text-[#031814]'
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
                {todayDateStr}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-[#2C4A42] dark:text-[#D4CFC3] leading-relaxed">
              Har kuni turli juz va suralardan takrorlanmas 10 ta oyat tanlanadi. Video eksport ikkita mustaqil qismga (1–5 va 6–10-savollar) ajratilgan — Android Chrome va PWA ilovasida tez render va toʻgʻridan-toʻgʻri MP4 yuklab olish bilan ishlaydi.
            </p>

            {/* Primary Generator */}
            <button
              type="button"
              disabled={phase === 'loading' || isAnyVideoRendering}
              onClick={() => void loadQuiz(selectedReciterId, true)}
              className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-[#063D32] hover:bg-[#075747] disabled:opacity-50 text-[#F8F5EC] border border-[#C6A45C]/45 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4 text-[#DCC58C] shrink-0" />
              <span>Kunlik 10 ta Shorts yaratish</span>
            </button>

            {/* Dual Independent 5-Question Video Export Cards (1-5 and 6-10) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([1, 2] as const).map((partNum) => {
                const slot = partExports[partNum];
                const rangeLabel = partNum === 1 ? '1–5' : '6–10';
                const partQuestionsCount =
                  partNum === 1
                    ? Math.min(5, quizSet?.questions?.length || 0)
                    : Math.max(0, (quizSet?.questions?.length || 0) - 5);
                const buttonTitle =
                  partNum === 1
                    ? '1-Videoni yuklab olish (1–5)'
                    : '2-Videoni yuklab olish (6–10)';
                const isDisabled =
                  !quizSet?.questions?.length ||
                  partQuestionsCount === 0 ||
                  phase === 'loading' ||
                  phase === 'error';

                return (
                  <div
                    key={partNum}
                    className="rounded-2xl bg-white/75 dark:bg-[#041D18] border border-[#063D32]/15 dark:border-[#C6A45C]/30 p-3.5 space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-[#042B25] dark:text-[#DCC58C]">
                          {partNum}-Qism ({rangeLabel}-savollar)
                        </span>
                        <span className="font-mono-numbers tabular-nums text-[11px] text-[#5C746C] dark:text-[#8FA69E]">
                          {partQuestionsCount} ta savol · 9:16
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5C746C] dark:text-[#8FA69E]">
                        {partNum === 1
                          ? 'Dastlabki 5 ta savoldan iborat mustaqil MP4.'
                          : 'Keyingi 5 ta savoldan iborat mustaqil MP4.'}
                      </p>
                    </div>

                    {slot.status !== 'rendering' ? (
                      <button
                        type="button"
                        disabled={isDisabled}
                        onClick={() => void handleExportQuizPartVideo(partNum)}
                        className="w-full min-h-[46px] px-3 py-2 rounded-xl bg-gradient-to-r from-[#C6A45C] to-[#DCC58C] hover:brightness-105 disabled:opacity-45 text-[#031814] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                      >
                        <Film className="w-4 h-4 shrink-0" />
                        <span className="truncate">{buttonTitle}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCancelQuizPartExport(partNum)}
                        className="w-full min-h-[46px] px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <X className="w-4 h-4 shrink-0" />
                        <span>Toʻxtatish ({slot.progressPct}%)</span>
                      </button>
                    )}

                    {slot.status === 'rendering' && (
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
                      </div>
                    )}

                    {slot.status === 'error' && slot.errorText && (
                      <div className="rounded-xl px-3 py-2 text-[11px] flex items-start gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span className="leading-snug">{slot.errorText}</span>
                      </div>
                    )}

                    {slot.status === 'ready' && slot.result && (
                      <div className="rounded-xl bg-[#041D18] border border-emerald-400/40 p-3 space-y-2.5 text-[#F8F5EC]">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-emerald-300">
                            Tayyor ({rangeLabel})
                          </span>
                          <span className="font-mono-numbers tabular-nums text-[#8FA69E]">
                            {slot.result.sizeMb} MB · MP4
                          </span>
                        </div>
                        <video
                          src={slot.result.previewUrl}
                          controls
                          playsInline
                          className="w-full max-w-[190px] mx-auto aspect-[9/16] rounded-xl border border-[#C6A45C]/35 bg-black object-contain"
                        />
                        <div className="grid grid-cols-1 gap-1.5">
                          <a
                            href={slot.result.downloadUrl}
                            download={slot.result.filename}
                            className="min-h-[42px] px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#C6A45C] to-[#DCC58C] hover:brightness-105 text-[#031814] font-bold text-xs flex items-center justify-center gap-1.5 whitespace-nowrap"
                          >
                            <Download className="w-3.5 h-3.5 shrink-0" />
                            <span>MP4 faylni yuklab olish</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => void handleShareQuizPartVideo(partNum)}
                            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#063D32] hover:bg-[#075747] text-[#F8F5EC] border border-[#C6A45C]/45 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
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
                  <span>Qorini tanlash (Qurʼon boʻlimi yagona bazasi)</span>
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
                    ? 'Gemini Audio + JSON'
                    : quizSource === 'archive'
                      ? 'Arxiv viktorina'
                      : 'Saqlangan toʻplam'}
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
                <span>Soʻnggi Natijalar</span>
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
                {attempts.slice(0, 6).map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-white/75 dark:bg-[#041D18] border border-[#063D32]/10 dark:border-[#C6A45C]/15"
                  >
                    <div>
                      <div className="font-semibold text-[#042B25] dark:text-[#F8F5EC]">
                        {att.dateStr}
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
