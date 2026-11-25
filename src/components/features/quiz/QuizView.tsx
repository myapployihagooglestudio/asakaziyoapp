import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { PageHero } from '../../ui/PageHero';
import {
  MorphingTabs,
  InteractiveCounter,
  AnimatedProgressRing,
  SpatialTiltCard,
  MagneticWrapper,
} from '../../ui/MotionPrimitives';
import {
  QuizQuestionItem,
  QuizCategory,
  QUIZ_CATEGORIES,
  DailyQuizSet,
  getDailyQuizQuestionsForDate,
} from '../../../data/quizQuestionsData';
import {
  getOrCreateDailyQuizForDate,
  fetchAllDailyQuizzesArchive,
  saveStoredQuizAttempt,
  getStoredQuizAttempts,
} from '../../../utils/databaseService';
import {
  Award,
  CheckCircle2,
  XCircle,
  RotateCcw,
  BookOpen,
  Calendar,
  Sparkles,
  Flame,
  ChevronRight,
  Share2,
  Check,
  History,
  Trophy,
  Clock,
  Filter,
  ShieldCheck,
  Crown,
} from 'lucide-react';
import {
  useUserEntitlements,
  ClientFeatureDecision,
  dispatchNavigateToPremium,
} from '../../../utils/entitlementClient';
import { PremiumGateModal } from '../../ui/PremiumGateModal';

interface AttemptRecord {
  id: string;
  dateStr: string;
  score: number;
  incorrectCount: number;
  total: number;
  completionTimeSeconds: number;
  isArchiveAttempt: boolean;
  completedAt: string;
}

const STORAGE_ATTEMPTS_KEY = 'asaka_ziyo_quiz_attempts_v2';
const STORAGE_STREAK_KEY = 'asaka_ziyo_quiz_streak_v1';

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '0 son';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs} son`;
  return `${mins} daq ${secs} son`;
}

function getDifficultyLabel(diff: string): string {
  if (diff === 'oson') return 'Oson';
  if (diff === 'murakkab') return 'Murakkab';
  return 'Oʻrta';
}

interface QuizViewProps {
  onOpenQuranQuiz?: () => void;
}

export const QuizView: React.FC<QuizViewProps> = ({ onOpenQuranQuiz }) => {
  const { t } = useTranslation();
  const { isPremium, features: userFeatures, checkFeature } = useUserEntitlements();
  const [gateDecision, setGateDecision] = useState<ClientFeatureDecision | null>(null);

  // Today's formatted ISO date for Asaka timezone
  const todayDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayDateStr);

  const [activeQuestions, setActiveQuestions] = useState<QuizQuestionItem[]>(() =>
    getDailyQuizQuestionsForDate(todayDateStr)
  );
  const [isLoadingQuiz, setIsLoadingQuiz] = useState<boolean>(false);

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [score, setScore] = useState<number>(0);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [quizStartTime, setQuizStartTime] = useState<number>(() => Date.now());
  const [lastCompletionSeconds, setLastCompletionSeconds] = useState<number>(0);

  const [activeTab, setActiveTab] = useState<'daily' | 'archive' | 'achievements'>('daily');

  // Archive filters & list
  const [archiveCategoryFilter, setArchiveCategoryFilter] = useState<'all' | QuizCategory>('all');
  const [archiveDifficultyFilter, setArchiveDifficultyFilter] = useState<'all' | 'oson' | 'orta' | 'murakkab'>('all');
  const [archivedQuizzes, setArchivedQuizzes] = useState<DailyQuizSet[]>([]);
  const [customArchiveDate, setCustomArchiveDate] = useState<string>('');

  // Permanent Attempt records & streak
  const [attempts, setAttempts] = useState<AttemptRecord[]>(() => {
    try {
      const cached = getStoredQuizAttempts();
      if (Array.isArray(cached) && cached.length > 0) {
        return cached.map((a: any) => ({
          id: a.id,
          dateStr: a.quizDate || a.dateStr || todayDateStr,
          score: Number(a.score) || 0,
          incorrectCount:
            typeof a.incorrectCount === 'number'
              ? a.incorrectCount
              : Math.max(0, (Number(a.totalQuestions || a.total) || 10) - (Number(a.score) || 0)),
          total: Number(a.totalQuestions || a.total) || 10,
          completionTimeSeconds: Number(a.completionTimeSeconds) || 0,
          isArchiveAttempt: Boolean(a.isArchiveAttempt),
          completedAt: a.completedAt || new Date().toISOString(),
        }));
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem(STORAGE_ATTEMPTS_KEY);
        if (saved) return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return [];
  });

  const [streakDays, setStreakDays] = useState<number>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem(STORAGE_STREAK_KEY);
        if (saved) return parseInt(saved, 10);
      }
    } catch {
      // fallback
    }
    return 1;
  });

  const [copiedNotice, setCopiedNotice] = useState(false);

  // Load persisted 10-question daily quiz from Firestore/cache so it NEVER changes on refresh
  useEffect(() => {
    let mounted = true;
    setIsLoadingQuiz(true);
    getOrCreateDailyQuizForDate(selectedDateStr)
      .then((dailySet) => {
        if (!mounted) return;
        if (dailySet && Array.isArray(dailySet.questions) && dailySet.questions.length > 0) {
          setActiveQuestions(dailySet.questions);
        }
        setIsLoadingQuiz(false);
      })
      .catch(() => {
        if (!mounted) return;
        setActiveQuestions(getDailyQuizQuestionsForDate(selectedDateStr));
        setIsLoadingQuiz(false);
      });

    setCurrentIndex(0);
    setSelectedOption(null);
    setUserAnswers({});
    setScore(0);
    setIsAnswered(false);
    setIsFinished(false);
    setQuizStartTime(Date.now());
    setLastCompletionSeconds(0);

    return () => {
      mounted = false;
    };
  }, [selectedDateStr]);

  // Load archive list when archive tab is opened
  useEffect(() => {
    if (activeTab === 'archive') {
      // Ensure last 10 days are generated & archived
      const datesToEnsure: string[] = [];
      for (let i = 0; i < 10; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        datesToEnsure.push(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' }));
      }
      Promise.all(datesToEnsure.map((dStr) => getOrCreateDailyQuizForDate(dStr)))
        .then(() => fetchAllDailyQuizzesArchive())
        .then((list) => setArchivedQuizzes(list))
        .catch(() => {});
    }
  }, [activeTab]);

  const currentQ = activeQuestions[currentIndex] || activeQuestions[0];

  const handleSelectOption = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);

    const isCorrect = idx === currentQ.correctIndex;
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }

    setUserAnswers((prev) => ({ ...prev, [currentIndex]: idx }));
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < activeQuestions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      // Quiz finished
      setIsFinished(true);
      const finalScore = score;
      const totalQ = activeQuestions.length;
      const incorrectCount = Math.max(0, totalQ - finalScore);
      const elapsedSeconds = Math.max(1, Math.round((Date.now() - quizStartTime) / 1000));
      setLastCompletionSeconds(elapsedSeconds);

      const isArchive = selectedDateStr !== todayDateStr;
      const nowIso = new Date().toISOString();

      const record: AttemptRecord = {
        id: `att-${Date.now()}`,
        dateStr: selectedDateStr,
        score: finalScore,
        incorrectCount,
        total: totalQ,
        completionTimeSeconds: elapsedSeconds,
        isArchiveAttempt: isArchive,
        completedAt: nowIso,
      };

      // Keep permanent quiz history (append new attempt, never overwrite)
      const updatedAttempts = [record, ...attempts];
      setAttempts(updatedAttempts);

      // Persist permanently to Firestore and update cache
      saveStoredQuizAttempt({
        id: record.id,
        quizDate: selectedDateStr,
        score: finalScore,
        incorrectCount,
        totalQuestions: totalQ,
        completionTimeSeconds: elapsedSeconds,
        isArchiveAttempt: isArchive,
        completedAt: nowIso,
        answers: userAnswers,
      }).catch(() => {});

      try {
        localStorage.setItem(STORAGE_ATTEMPTS_KEY, JSON.stringify(updatedAttempts));
        if (!isArchive) {
          const alreadyCompletedToday = attempts.some((a) => a.dateStr === todayDateStr && !a.isArchiveAttempt);
          if (!alreadyCompletedToday) {
            const newStreak = streakDays + 1;
            setStreakDays(newStreak);
            localStorage.setItem(STORAGE_STREAK_KEY, String(newStreak));
          }
        }
      } catch {
        // ignore
      }
    }
  };

  const handleRetake = async () => {
    const check = await checkFeature('quran_quiz_unlimited', true);
    if (!check.ok) {
      setGateDecision(
        check.decision || {
          allowed: false,
          featureKey: 'quran_quiz_unlimited',
          module: 'quiz',
          reasonCode: 'USAGE_LIMIT_REACHED',
          messageUz: check.error || 'Kunlik bepul viktorina urinishlaringiz tugadi.',
          access: 'premium',
          isPremiumUser: false,
          subscriptionStatus: 'FREE',
          limitPeriod: 'daily',
          limit: 3,
          used: 3,
          remaining: 0,
        }
      );
      return;
    }
    setCurrentIndex(0);
    setSelectedOption(null);
    setUserAnswers({});
    setScore(0);
    setIsAnswered(false);
    setIsFinished(false);
    setQuizStartTime(Date.now());
    setLastCompletionSeconds(0);
  };

  const handleShareResult = () => {
    const text = `Men ASAKA ZIYO ilovasida Islomiy Bilimlar Viktorinasini (${selectedDateStr}) ishladim!\nNatija: ${score}/${activeQuestions.length} ta toʻgʻri javob.\nVaqt: ${formatDuration(lastCompletionSeconds)}\nKunlik streak: ${streakDays} kun.\nSinab koʻring: https://asaka-ziyo.uz/quiz`;
    if (navigator.share) {
      navigator.share({ title: 'Asaka Ziyo Viktorina Natijam', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 2500);
    }
  };

  const personalBestScore = attempts.length > 0 ? Math.max(...attempts.map((a) => a.score)) : 0;
  const dailyAttemptsCount = attempts.filter((a) => !a.isArchiveAttempt).length;
  const archiveAttemptsCount = attempts.filter((a) => a.isArchiveAttempt).length;

  const quizSubTabs = [
    {
      id: 'daily',
      label: selectedDateStr === todayDateStr ? 'Bugungi Viktorina' : `Arxiv Test (${selectedDateStr})`,
    },
    { id: 'archive', label: 'Oldingi Kunlar Arxivi' },
    { id: 'achievements', label: 'Natijalarim & Tarix', count: attempts.length },
  ];

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      <PageHero
        variant="studio"
        kicker="Kunlik Diniy Bilim Testi · 10 Savol"
        title="Islomiy Bilimlar Viktorinasi"
        subtitle="Qurʼoni Karim, Sahih hadislar, Aqoid, Hanafiy fiqhi, Siyrat, Islom tarixi, Sahobalar va Axloq boʻyicha har kuni 10 ta moʻtabar manbali savol."
        aside={
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/[0.06] border border-[#C8A85E]/30 backdrop-blur-md p-4 flex items-center gap-3">
              <Flame className="w-6 h-6 text-[#E5C97B] shrink-0" />
              <div>
                <div className="text-lg font-display font-extrabold text-[#F7F4EC]">
                  <InteractiveCounter value={streakDays} suffix=" kun" />
                </div>
                <div className="text-[10px] text-[#C2D4CD] uppercase tracking-wider">Muntazamlik</div>
              </div>
            </div>
            <div className="rounded-2xl bg-white/[0.06] border border-emerald-400/30 backdrop-blur-md p-4 flex items-center gap-3">
              <Trophy className="w-6 h-6 text-[#34D399] shrink-0" />
              <div>
                <div className="text-lg font-display font-extrabold text-[#F7F4EC] font-mono-numbers">
                  {personalBestScore}/10
                </div>
                <div className="text-[10px] text-[#C2D4CD] uppercase tracking-wider">Eng yuqori</div>
              </div>
            </div>
          </div>
        }
      />

      {onOpenQuranQuiz && (
        <Card elevated className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ring-1 ring-[#C8A85E]/30">
          <div className="space-y-0.5">
            <div className="az-type-overline text-[#9E7F3C] dark:text-[#C8A85E]">
              Yangi · 9:16 Audio Shorts Viktorina
            </div>
            <p className="text-xs sm:text-sm text-[#3B554D] dark:text-[#A4B9B1]">
              Shayxlar tilovatini tinglab, oyatning yashirilgan oxirgi soʻzini 3.5 soniyada toping!
            </p>
          </div>
          <MagneticWrapper strength={4}>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onOpenQuranQuiz}
              className="min-h-[44px] shrink-0"
            >
              <span>Kunlik Qurʼon Viktorinasini Ochish →</span>
            </Button>
          </MagneticWrapper>
        </Card>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="overflow-x-auto pb-1 no-scrollbar">
          <MorphingTabs
            items={quizSubTabs}
            activeId={activeTab}
            onChange={(id) => setActiveTab(id as 'daily' | 'archive' | 'achievements')}
            layoutId="az-quiz-subtabs"
          />
        </div>

        {activeTab === 'daily' && (
          <div className="flex items-center gap-2.5 text-xs text-[#587068] dark:text-[#9CAFA7] font-mono-numbers">
            {selectedDateStr !== todayDateStr && (
              <button
                type="button"
                onClick={() => setSelectedDateStr(todayDateStr)}
                className="text-[#064E3B] dark:text-[#C8A85E] hover:underline font-sans font-semibold cursor-pointer"
              >
                Bugunga qaytish
              </button>
            )}
            <span>Sana: {selectedDateStr}</span>
          </div>
        )}
      </div>

      {/* Main Daily Quiz Panel */}
      {activeTab === 'daily' && (
        <>
          {isLoadingQuiz ? (
            <Card elevated className="p-10 text-center text-xs text-[#587068] dark:text-[#9CAFA7]">
              Viktorina savollari yuklanmoqda...
            </Card>
          ) : !isFinished ? (
            <Card elevated className="p-6 sm:p-8 space-y-6">
              {/* Question Header & Progress Bar */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[#9E7F3C] dark:text-[#C8A85E] font-bold font-mono-numbers">
                      Savol {currentIndex + 1} / {activeQuestions.length}
                    </span>
                    <span aria-hidden="true" className="text-[#587068]/50 dark:text-[#9CAFA7]/50">
                      ·
                    </span>
                    <span className="font-semibold text-[#064E3B] dark:text-[#10B981]">
                      {currentQ.category}
                    </span>
                    <span aria-hidden="true" className="text-[#587068]/50 dark:text-[#9CAFA7]/50">
                      ·
                    </span>
                    <span className="text-[#587068] dark:text-[#9CAFA7] font-medium">
                      {getDifficultyLabel(currentQ.difficulty)}
                    </span>
                    {currentQ.publishedDate && (
                      <span className="text-[11px] text-[#587068] dark:text-[#9CAFA7] font-mono-numbers">
                        ({currentQ.publishedDate})
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-bold text-[#064E3B] dark:text-[#10B981] font-mono-numbers">
                    Ball: {score}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-black/[0.06] dark:bg-white/[0.08] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#C8A85E] to-[#10B981] transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / activeQuestions.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question Text */}
              <div className="py-2">
                <h2 className="text-base sm:text-xl font-display font-bold text-[#091813] dark:text-[#F7F4EC] leading-snug">
                  {currentQ.questionUz}
                </h2>
              </div>

              {/* 4 Options */}
              <div className="space-y-2.5">
                {currentQ.optionsUz.map((opt, optIdx) => {
                  let buttonStyle =
                    'border-black/[0.08] dark:border-white/[0.1] bg-white/60 dark:bg-white/[0.03] hover:border-[#064E3B]/50 dark:hover:border-[#C8A85E]/55';
                  let icon = null;

                  if (isAnswered) {
                    if (optIdx === currentQ.correctIndex) {
                      buttonStyle =
                        'border-emerald-500 bg-emerald-500/14 text-[#064E3B] dark:text-emerald-200 font-semibold';
                      icon = <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />;
                    } else if (optIdx === selectedOption) {
                      buttonStyle =
                        'border-rose-500 bg-rose-500/14 text-rose-800 dark:text-rose-200';
                      icon = <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />;
                    } else {
                      buttonStyle = 'opacity-45 border-black/[0.06] dark:border-white/[0.06]';
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={isAnswered}
                      onClick={() => handleSelectOption(optIdx)}
                      className={`w-full p-4 min-h-[52px] rounded-2xl border text-left text-xs sm:text-sm transition-all flex items-center justify-between gap-3 cursor-pointer ${buttonStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-xl az-liquid-glass-pill flex items-center justify-center text-xs font-bold font-mono-numbers text-[#091813] dark:text-[#F7F4EC] shrink-0">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="text-[#091813] dark:text-[#F7F4EC]">{opt}</span>
                      </div>
                      {icon}
                    </button>
                  );
                })}
              </div>

              {/* Explanation & Verified Book Source */}
              {isAnswered && (
                <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-[#064E3B] dark:text-[#34D399]">
                      <BookOpen className="w-4 h-4" />
                      <span>Javob Izohi va Moʻtabar Manba</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#064E3B] dark:text-[#34D399]">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Tasdiqlangan manba</span>
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#091813] dark:text-[#F7F4EC] leading-relaxed">
                    {currentQ.explanationUz}
                  </p>
                  <div className="pt-1 text-[11px] text-[#3B554D] dark:text-[#A4B9B1] flex flex-wrap items-center gap-x-3 gap-y-1">
                    <div>
                      <span className="font-semibold text-[#9E7F3C] dark:text-[#C8A85E]">Kitob / Manba: </span>
                      <span>{currentQ.source}</span>
                    </div>
                    {currentQ.reference && (
                      <div>
                        <span className="font-semibold text-[#9E7F3C] dark:text-[#C8A85E]">Bob / Hadis: </span>
                        <span>{currentQ.reference}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Next Button */}
              {isAnswered && (
                <div className="pt-2 flex justify-end">
                  <Button variant="primary" size="md" className="min-h-[46px]" onClick={handleNextQuestion}>
                    <span>
                      {currentIndex + 1 < activeQuestions.length
                        ? 'Keyingi savol'
                        : 'Natijani koʻrish'}
                    </span>
                    <ChevronRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              )}
            </Card>
          ) : (
            /* Quiz Completed Summary Card */
            <div className="rounded-[28px] az-aurora-surface border border-white/[0.12] p-8 text-center space-y-6 text-[#F7F4EC]">
              <div className="flex justify-center">
                <AnimatedProgressRing
                  progress={Math.round((score / Math.max(1, activeQuestions.length)) * 100)}
                  size={132}
                  strokeWidth={8}
                >
                  <span className="font-mono-numbers text-2xl font-extrabold text-[#F7F4EC]">
                    {score}/{activeQuestions.length}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-[#C8A85E] font-semibold">
                    Natija
                  </span>
                </AnimatedProgressRing>
              </div>

              <div className="space-y-1.5">
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#F7F4EC]">
                  MashaAlloh! Viktorina yakunlandi
                </h2>
                <p className="text-xs sm:text-sm text-[#C2D4CD]">
                  {selectedDateStr === todayDateStr
                    ? 'Bugungi kunlik diniy bilim testidagi natijangiz:'
                    : `Arxivdagi (${selectedDateStr}) viktorina natijangiz:`}
                </p>
              </div>

              <div className="py-4 inline-flex flex-wrap justify-center items-center gap-6 px-8 rounded-2xl bg-white/[0.06] border border-white/[0.12] backdrop-blur-md">
                <div className="text-center">
                  <div className="text-3xl font-display font-extrabold font-mono-numbers text-[#C8A85E]">
                    {score} / {activeQuestions.length}
                  </div>
                  <div className="text-[11px] text-[#C2D4CD] uppercase tracking-wider pt-1">
                    Toʻgʻri javoblar
                  </div>
                </div>
                <div className="w-px h-10 bg-white/10 hidden sm:block" />
                <div className="text-center">
                  <div className="text-3xl font-display font-extrabold font-mono-numbers text-rose-400">
                    {Math.max(0, activeQuestions.length - score)}
                  </div>
                  <div className="text-[11px] text-[#C2D4CD] uppercase tracking-wider pt-1">
                    Notoʻgʻri javoblar
                  </div>
                </div>
                <div className="w-px h-10 bg-white/10 hidden sm:block" />
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-display font-extrabold font-mono-numbers text-[#34D399]">
                    {formatDuration(lastCompletionSeconds)}
                  </div>
                  <div className="text-[11px] text-[#C2D4CD] uppercase tracking-wider pt-1">
                    Sarflangan vaqt
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetake}
                  className="min-h-[44px] border-[#C8A85E]/45 text-[#F7F4EC] hover:bg-[#C8A85E]/15"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-[#C8A85E]" />
                  <span>Qayta topshirish</span>
                </Button>
                <Button variant="primary" size="sm" className="min-h-[44px]" onClick={handleShareResult}>
                  {copiedNotice ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Share2 className="w-3.5 h-3.5 mr-1.5" />}
                  <span>{copiedNotice ? 'Nusxalandi!' : 'Natijani ulashish'}</span>
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Archive Tab: Browse past dates, filter by category & difficulty, & retake */}
      {activeTab === 'archive' && (
        <div className="space-y-4">
          <Card className="p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#c5a869]" />
                  <span>Oʻtgan Kunlar Viktorina Arxivi</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Har bir kunning 10 ta savoli avtomatik arxivlanadi. Istalgan sanani tanlab ishlashingiz mumkin.
                </p>
              </div>

              {/* Jump to any date */}
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  max={todayDateStr}
                  value={customArchiveDate}
                  onChange={(e) => setCustomArchiveDate(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#091a18] text-xs"
                />
                {customArchiveDate && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setSelectedDateStr(customArchiveDate);
                      setActiveTab('daily');
                    }}
                  >
                    Ochish
                  </Button>
                )}
              </div>
            </div>

            {/* Category & Difficulty Filters */}
            <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-[#071614] border border-stone-200 dark:border-emerald-950/60 flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-stone-500 font-semibold">
                <Filter className="w-3.5 h-3.5 text-[#c5a869]" />
                <span>Saralash:</span>
              </div>

              <select
                value={archiveCategoryFilter}
                onChange={(e) => setArchiveCategoryFilter(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18] text-xs"
              >
                <option value="all">Barcha kategoriyalar</option>
                {QUIZ_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <select
                value={archiveDifficultyFilter}
                onChange={(e) => setArchiveDifficultyFilter(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18] text-xs"
              >
                <option value="all">Barcha qiyinlik darajalari</option>
                <option value="oson">Oson</option>
                <option value="orta">Oʻrta</option>
                <option value="murakkab">Murakkab</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {archivedQuizzes.map((dq) => {
                const isToday = dq.dateStr === todayDateStr;
                const dateAttempts = attempts.filter((a) => a.dateStr === dq.dateStr);
                const bestForDate = dateAttempts.length > 0 ? Math.max(...dateAttempts.map((a) => a.score)) : null;

                const matchingQuestions = dq.questions.filter((q) => {
                  const catOk = archiveCategoryFilter === 'all' || q.category === archiveCategoryFilter;
                  const diffOk = archiveDifficultyFilter === 'all' || q.difficulty === archiveDifficultyFilter;
                  return catOk && diffOk;
                });

                if (
                  (archiveCategoryFilter !== 'all' || archiveDifficultyFilter !== 'all') &&
                  matchingQuestions.length === 0
                ) {
                  return null;
                }

                return (
                  <button
                    key={dq.dateStr}
                    onClick={() => {
                      setSelectedDateStr(dq.dateStr);
                      setActiveTab('daily');
                    }}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer space-y-1.5 ${
                      selectedDateStr === dq.dateStr
                        ? 'border-[#c5a869] bg-[#c5a869]/10'
                        : 'border-stone-200 dark:border-emerald-950/60 hover:border-[#c5a869]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-stone-900 dark:text-stone-100 font-mono-numbers">
                        {dq.dateStr}
                      </span>
                      {isToday ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-bold">
                          Bugun
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-stone-200 dark:bg-white/10 text-stone-500 dark:text-stone-400">
                          Arxiv
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-stone-500">
                      {bestForDate !== null ? (
                        <span className="text-emerald-500 font-bold">
                          Eng yaxshi natija: {bestForDate}/10 ({dateAttempts.length} urinish)
                        </span>
                      ) : (
                        <span>Ishlanmagan · 10 savol</span>
                      )}
                    </div>

                    {(archiveCategoryFilter !== 'all' || archiveDifficultyFilter !== 'all') && (
                      <div className="text-[11px] text-[#c5a869]">
                        Mos savollar: {matchingQuestions.length} ta
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Achievements & Permanent History Tab */}
      {activeTab === 'achievements' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card elevated className="p-5 text-center space-y-1">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 mx-auto flex items-center justify-center text-amber-600 dark:text-amber-400 mb-2">
                <Flame className="w-5 h-5" />
              </div>
              <div className="text-2xl font-display font-extrabold text-[#091813] dark:text-[#F7F4EC]">
                <InteractiveCounter value={streakDays} suffix=" kun" />
              </div>
              <div className="text-xs text-[#587068] dark:text-[#9CAFA7]">Joriy Muntazamlik</div>
            </Card>

            <Card elevated className="p-5 text-center space-y-1">
              <div className="w-10 h-10 rounded-xl bg-[#C8A85E]/15 mx-auto flex items-center justify-center text-[#9E7F3C] dark:text-[#C8A85E] mb-2">
                <Trophy className="w-5 h-5" />
              </div>
              <div className="text-2xl font-display font-extrabold font-mono-numbers text-[#091813] dark:text-[#F7F4EC]">
                {personalBestScore} / 10
              </div>
              <div className="text-xs text-[#587068] dark:text-[#9CAFA7]">Shaxsiy Rekord</div>
            </Card>

            <Card elevated className="p-5 text-center space-y-1">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 mx-auto flex items-center justify-center text-[#064E3B] dark:text-[#10B981] mb-2">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-2xl font-display font-extrabold text-[#091813] dark:text-[#F7F4EC]">
                <InteractiveCounter value={dailyAttemptsCount} suffix=" ta" />
              </div>
              <div className="text-xs text-[#587068] dark:text-[#9CAFA7]">Kunlik Urinishlar</div>
            </Card>

            <Card elevated className="p-5 text-center space-y-1">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 mx-auto flex items-center justify-center text-sky-600 dark:text-sky-400 mb-2">
                <History className="w-5 h-5" />
              </div>
              <div className="text-2xl font-display font-extrabold text-[#091813] dark:text-[#F7F4EC]">
                <InteractiveCounter value={archiveAttemptsCount} suffix=" ta" />
              </div>
              <div className="text-xs text-[#587068] dark:text-[#9CAFA7]">Arxiv Urinishlari</div>
            </Card>
          </div>

          <Card elevated className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#091813] dark:text-[#F7F4EC] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#9E7F3C] dark:text-[#C8A85E]" />
              <span>Diniy Ilm Nishonlari</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                {
                  icon: <BookOpen className="w-4 h-4 text-[#064E3B] dark:text-[#10B981]" />,
                  title: 'Qurʼon Bilimdoni',
                  desc: 'Qurʼon suralari va oyatlari savollariga toʻliq javob',
                },
                {
                  icon: <Sparkles className="w-4 h-4 text-[#9E7F3C] dark:text-[#C8A85E]" />,
                  title: 'Hadis va Sahobalar Ixlosmandi',
                  desc: 'Sahihi Buxoriy, Muslim va Sahobalar tarixini yaxshi biluvchi',
                },
                {
                  icon: <Award className="w-4 h-4 text-[#9E7F3C] dark:text-[#C8A85E]" />,
                  title: 'Fiqh va Aqoid Bilimdoni',
                  desc: 'Tahorat, namoz, roʻza va aqoid hukmlari bilimdoni',
                },
                {
                  icon: <Flame className="w-4 h-4 text-[#064E3B] dark:text-[#10B981]" />,
                  title: 'Muntazam Talaba',
                  desc: 'Ketma-ket 3 kundan ortiq viktorinada qatnashgan',
                },
              ].map((b) => (
                <SpatialTiltCard key={b.title} maxTilt={3}>
                  <div className="p-4 rounded-2xl az-liquid-glass-card flex items-center gap-3 h-full">
                    <div className="w-9 h-9 rounded-xl az-liquid-glass-pill flex items-center justify-center shrink-0">
                      {b.icon}
                    </div>
                    <div>
                      <div className="font-bold text-[#091813] dark:text-[#F7F4EC]">{b.title}</div>
                      <div className="text-[#587068] dark:text-[#9CAFA7] text-[11px]">{b.desc}</div>
                    </div>
                  </div>
                </SpatialTiltCard>
              ))}
            </div>
          </Card>

          {/* Permanent Quiz History */}
          <Card elevated className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#091813] dark:text-[#F7F4EC] flex items-center gap-2">
              <History className="w-4 h-4 text-[#9E7F3C] dark:text-[#C8A85E]" />
              <span>Doimiy Viktorina Tarixi ({attempts.length})</span>
            </h3>

            {attempts.length === 0 ? (
              <p className="text-xs text-[#587068] dark:text-[#9CAFA7] py-4 text-center">
                Hozircha viktorina urinishlari yoʻq. Bugungi testni ishlab koʻring!
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {attempts.map((att) => (
                  <div
                    key={att.id}
                    className="p-3.5 rounded-2xl az-liquid-glass-card flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono-numbers text-[#091813] dark:text-[#F7F4EC]">
                        {att.dateStr}
                      </span>
                      <span aria-hidden="true" className="text-[#587068]/50 dark:text-[#9CAFA7]/50">
                        ·
                      </span>
                      <span
                        className={`text-[11px] font-semibold ${
                          att.isArchiveAttempt
                            ? 'text-sky-600 dark:text-sky-400'
                            : 'text-[#064E3B] dark:text-[#10B981]'
                        }`}
                      >
                        {att.isArchiveAttempt ? 'Arxiv' : 'Kunlik'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <span className="font-bold font-mono-numbers text-[#9E7F3C] dark:text-[#C8A85E]">
                        {att.score}/{att.total} toʻgʻri
                      </span>
                      <span className="text-[#587068] dark:text-[#9CAFA7] font-mono-numbers flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(att.completionTimeSeconds)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {!isPremium && userFeatures.quran_quiz_unlimited && userFeatures.quran_quiz_unlimited.limit > 0 && (
        <div className="p-3.5 rounded-2xl az-liquid-glass border border-[#C8A85E]/25 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="inline-flex items-center gap-2 text-[#5F776F] dark:text-[#C5D4CE]">
            <Crown className="w-4 h-4 text-[#C8A85E]" />
            <span>
              Bugungi viktorina doimo bepul · Qoʻshimcha urinishlar:{' '}
              <strong className="font-mono-numbers text-[#091813] dark:text-[#F7F4EC]">
                {userFeatures.quran_quiz_unlimited.remaining}/{userFeatures.quran_quiz_unlimited.limit}
              </strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => dispatchNavigateToPremium()}
            className="px-3 py-1 rounded-lg bg-[#C8A85E]/20 text-[#8A6B2D] dark:text-[#E6CE8A] font-bold cursor-pointer"
          >
            Cheksiz · Premium
          </button>
        </div>
      )}

      <PremiumGateModal
        open={Boolean(gateDecision)}
        decision={gateDecision}
        onClose={() => setGateDecision(null)}
      />
    </div>
  );
};
