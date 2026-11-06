import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { GeometricPattern } from '../../ui/GeometricPattern';
import {
  VERIFIED_QUIZ_BANK,
  QuizQuestionItem,
  getDailyQuizQuestionsForDate,
} from '../../../data/quizQuestionsData';
import { syncDocToFirestore } from '../../../utils/firebaseClient';
import {
  Award,
  CheckCircle2,
  XCircle,
  RotateCcw,
  BookOpen,
  Calendar,
  Sparkles,
  Flame,
  ChevronLeft,
  ChevronRight,
  Share2,
  Check,
  History,
  Trophy,
  HelpCircle,
} from 'lucide-react';

interface AttemptRecord {
  id: string;
  dateStr: string;
  score: number;
  total: number;
  completedAt: string;
}

const STORAGE_ATTEMPTS_KEY = 'asaka_ziyo_quiz_attempts_v1';
const STORAGE_STREAK_KEY = 'asaka_ziyo_quiz_streak_v1';

export const QuizView: React.FC = () => {
  const { t } = useTranslation();

  // Today's formatted ISO date for Asaka timezone
  const todayDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayDateStr);

  const [activeQuestions, setActiveQuestions] = useState<QuizQuestionItem[]>(() =>
    getDailyQuizQuestionsForDate(todayDateStr)
  );

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [score, setScore] = useState<number>(0);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'daily' | 'archive' | 'achievements'>('daily');

  // Attempt records and streak
  const [attempts, setAttempts] = useState<AttemptRecord[]>(() => {
    try {
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

  // When selected date changes, reset question progress
  useEffect(() => {
    const qList = getDailyQuizQuestionsForDate(selectedDateStr);
    setActiveQuestions(qList);
    setCurrentIndex(0);
    setSelectedOption(null);
    setUserAnswers({});
    setScore(0);
    setIsAnswered(false);
    setIsFinished(false);
  }, [selectedDateStr]);

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
      const finalScore = score + (selectedOption === currentQ.correctIndex ? 1 : 0);

      const record: AttemptRecord = {
        id: `att-${Date.now()}`,
        dateStr: selectedDateStr,
        score: finalScore,
        total: activeQuestions.length,
        completedAt: new Date().toLocaleDateString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
      };

      const updatedAttempts = [record, ...attempts.filter((a) => a.dateStr !== selectedDateStr)];
      setAttempts(updatedAttempts);
      try {
        localStorage.setItem(STORAGE_ATTEMPTS_KEY, JSON.stringify(updatedAttempts));
        // Update streak
        const newStreak = streakDays + 1;
        setStreakDays(newStreak);
        localStorage.setItem(STORAGE_STREAK_KEY, String(newStreak));
      } catch {
        // ignore
      }

      // Persist to Firestore
      syncDocToFirestore('quizAttempts', record.id, {
        ...record,
        streakDays,
        answers: Object.entries(userAnswers).map(([qIdx, ansIdx]) => ({
          questionIndex: Number(qIdx),
          answeredOption: ansIdx,
        })),
      }).catch(() => {});
    }
  };

  const handleRetake = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setUserAnswers({});
    setScore(0);
    setIsAnswered(false);
    setIsFinished(false);
  };

  const handleShareResult = () => {
    const text = `Men bugun ASAKA ZIYO ilovasida Islomiy Bilimlar Viktorinasini ishladim!\nNatija: ${score}/${activeQuestions.length} ta toʻgʻri javob.\nKunlik streak: ${streakDays} kun.\nSinab koʻring: https://asaka-ziyo.uz/quiz`;
    if (navigator.share) {
      navigator.share({ title: 'Asaka Ziyo Viktorina Natijam', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 2500);
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      {/* Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-[#c5a869]/30 bg-gradient-to-r from-[#031d17] via-[#071614] to-[#04241d] p-6 sm:p-8 text-white shadow-xl">
        <GeometricPattern opacity={0.06} />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#c5a869] uppercase tracking-wider">
              <Award className="w-4 h-4 text-[#c5a869]" />
              <span>Kunlik Diniy Bilim Testi · 10 Savol</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-wide">
              Islomiy Bilimlar Viktorinasi
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 max-w-lg leading-relaxed">
              Qurʼoni Karim, Sahih hadislar, Hanafiy fiqhi va Islom tarixi boʻyicha har kuni 10 ta ishonchli manbali savol.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#c5a869]/15 border border-[#c5a869]/40 text-[#c5a869]">
              <Flame className="w-5 h-5 text-amber-400 fill-amber-400" />
              <div className="text-left">
                <div className="text-xs font-bold leading-tight">{streakDays} kun</div>
                <div className="text-[10px] text-stone-400 uppercase tracking-wider">Muntazamlik</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-stone-200 dark:border-emerald-950/80 pb-2">
        <div className="flex items-center gap-2 text-xs">
          {[
            { id: 'daily', label: 'Bugungi Viktorina' },
            { id: 'archive', label: 'Oldingi Kunlar Arxivi' },
            { id: 'achievements', label: 'Natijalarim & Yutuqlar' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#c5a869] text-[#071614] font-semibold shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'daily' && (
          <div className="text-xs text-stone-500 font-mono-numbers">
            Sana: {selectedDateStr}
          </div>
        )}
      </div>

      {/* Main Daily Quiz Panel */}
      {activeTab === 'daily' && (
        <>
          {!isFinished ? (
            <Card elevated className="p-6 sm:p-8 space-y-6 border-[#c5a869]/30 bg-white/70 dark:bg-[#071614]/80 backdrop-blur-md shadow-xl">
              {/* Question Header & Progress Bar */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[#c5a869] font-bold font-mono-numbers">
                      Savol {currentIndex + 1} / {activeQuestions.length}
                    </span>
                    <span aria-hidden="true" className="text-stone-400">·</span>
                    <span className="text-stone-500 dark:text-stone-400">{currentQ.category}</span>
                  </div>
                  <div className="text-xs font-semibold text-emerald-500 font-mono-numbers">
                    Ball: {score}
                  </div>
                </div>

                {/* Progress Ring / Bar */}
                <div className="w-full h-1.5 bg-stone-200 dark:bg-emerald-950/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#c5a869] to-emerald-500 transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / activeQuestions.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question Text */}
              <div className="py-2">
                <h2 className="text-base sm:text-xl font-bold text-stone-900 dark:text-stone-100 leading-snug">
                  {currentQ.questionUz}
                </h2>
              </div>

              {/* 4 Options */}
              <div className="space-y-2.5">
                {currentQ.optionsUz.map((opt, optIdx) => {
                  let buttonStyle = 'border-stone-200 dark:border-emerald-950/60 bg-stone-50/50 dark:bg-white/5 hover:border-[#c5a869]/60';
                  let icon = null;

                  if (isAnswered) {
                    if (optIdx === currentQ.correctIndex) {
                      buttonStyle = 'border-emerald-500 bg-emerald-500/15 text-emerald-300 font-semibold';
                      icon = <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
                    } else if (optIdx === selectedOption) {
                      buttonStyle = 'border-rose-500 bg-rose-500/15 text-rose-300';
                      icon = <XCircle className="w-4 h-4 text-rose-400 shrink-0" />;
                    } else {
                      buttonStyle = 'opacity-40 border-stone-200 dark:border-emerald-950/40';
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      disabled={isAnswered}
                      onClick={() => handleSelectOption(optIdx)}
                      className={`w-full p-4 rounded-xl border text-left text-xs sm:text-sm transition-all flex items-center justify-between gap-3 cursor-pointer ${buttonStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-stone-200 dark:bg-white/10 flex items-center justify-center text-xs font-bold font-mono-numbers shrink-0">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="text-stone-900 dark:text-stone-100">{opt}</span>
                      </div>
                      {icon}
                    </button>
                  );
                })}
              </div>

              {/* Explanation & Verified Book Source (Appears after answer) */}
              {isAnswered && (
                <div className="p-4 rounded-2xl bg-emerald-950/20 dark:bg-[#04241d]/40 border border-emerald-500/30 space-y-2 animate-fadeIn">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    <span>Javob Izohi va Manbasi:</span>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-200 leading-relaxed">
                    {currentQ.explanationUz}
                  </p>
                  <div className="pt-1 text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1">
                    <span className="font-semibold text-[#c5a869]">Manba:</span>
                    <span>{currentQ.source}</span>
                  </div>
                </div>
              )}

              {/* Next Button */}
              {isAnswered && (
                <div className="pt-2 flex justify-end">
                  <Button variant="primary" size="md" onClick={handleNextQuestion}>
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
            <Card elevated className="p-8 text-center space-y-6 border-[#c5a869]/40 bg-gradient-to-b from-[#071614] to-[#031d17] text-white shadow-2xl">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#c5a869] to-amber-600 mx-auto flex items-center justify-center text-[#071614] shadow-lg">
                <Trophy className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">
                  MashaAlloh! Viktorina yakunlandi
                </h2>
                <p className="text-xs sm:text-sm text-stone-300">
                  Bugungi kunlik diniy bilim testidagi natijangiz:
                </p>
              </div>

              <div className="py-4 inline-flex items-center gap-6 px-8 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold font-mono-numbers text-[#c5a869]">
                    {score} / {activeQuestions.length}
                  </div>
                  <div className="text-[11px] text-stone-400 uppercase tracking-wider pt-1">
                    Toʻgʻri javoblar
                  </div>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold font-mono-numbers text-emerald-400">
                    {Math.round((score / activeQuestions.length) * 100)}%
                  </div>
                  <div className="text-[11px] text-stone-400 uppercase tracking-wider pt-1">
                    Muvaffaqiyat
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={handleRetake} className="border-[#c5a869]/40 text-[#c5a869]">
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  <span>Qayta topshirish</span>
                </Button>
                <Button variant="primary" size="sm" onClick={handleShareResult}>
                  {copiedNotice ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Share2 className="w-3.5 h-3.5 mr-1.5" />}
                  <span>{copiedNotice ? 'Nusxalandi!' : 'Natijani ulashish'}</span>
                </Button>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Archive Tab: Browse past dates & retake */}
      {activeTab === 'archive' && (
        <div className="space-y-4">
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#c5a869]" />
                <span>Oʻtgan Kunlar Viktorina Arxivi</span>
              </h3>
              <span className="text-xs text-stone-500">Istalgan sanani tanlab ishlashingiz mumkin</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[0, 1, 2, 3, 4, 5].map((daysAgo) => {
                const d = new Date();
                d.setDate(d.getDate() - daysAgo);
                const dStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
                const isToday = daysAgo === 0;
                const pastAttempt = attempts.find((a) => a.dateStr === dStr);

                return (
                  <button
                    key={dStr}
                    onClick={() => {
                      setSelectedDateStr(dStr);
                      setActiveTab('daily');
                    }}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedDateStr === dStr
                        ? 'border-[#c5a869] bg-[#c5a869]/10'
                        : 'border-stone-200 dark:border-emerald-950/60 hover:border-[#c5a869]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs pb-1">
                      <span className="font-bold text-stone-900 dark:text-stone-100 font-mono-numbers">
                        {dStr}
                      </span>
                      {isToday && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-bold">
                          Bugun
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-stone-500">
                      {pastAttempt ? (
                        <span className="text-emerald-500 font-bold">
                          Natija: {pastAttempt.score}/{pastAttempt.total}
                        </span>
                      ) : (
                        <span>Ishlanmagan · 10 savol</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Achievements Tab */}
      {activeTab === 'achievements' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5 text-center space-y-1">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 mx-auto flex items-center justify-center text-amber-400 mb-2">
                <Flame className="w-5 h-5 fill-amber-400" />
              </div>
              <div className="text-2xl font-bold font-mono-numbers text-stone-900 dark:text-white">
                {streakDays} kun
              </div>
              <div className="text-xs text-stone-500">Joriy Muntazamlik</div>
            </Card>

            <Card className="p-5 text-center space-y-1">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 mx-auto flex items-center justify-center text-emerald-400 mb-2">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold font-mono-numbers text-stone-900 dark:text-white">
                {attempts.length} ta
              </div>
              <div className="text-xs text-stone-500">Tugallangan Viktorinalar</div>
            </Card>

            <Card className="p-5 text-center space-y-1">
              <div className="w-10 h-10 rounded-xl bg-[#c5a869]/15 mx-auto flex items-center justify-center text-[#c5a869] mb-2">
                <Trophy className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold font-mono-numbers text-stone-900 dark:text-white">
                {attempts.reduce((sum, a) => sum + a.score, 0)} ball
              </div>
              <div className="text-xs text-stone-500">Jami Toʻplangan Ball</div>
            </Card>
          </div>

          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#c5a869]" />
              <span>Diniy Ilm Nishonlari (Badges)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-stone-900 dark:text-white">Qurʼon Bilimdoni</div>
                  <div className="text-stone-500 text-[11px]">Qurʼon suralari va oyatlari savollariga toʻliq javob</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-stone-900 dark:text-white">Hadis Ixlosmandi</div>
                  <div className="text-stone-500 text-[11px]">Sahihi Buxoriy va Muslim hadislarini yaxshi biluvchi</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-[#c5a869]/30 bg-[#c5a869]/5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#c5a869]/20 text-[#c5a869] flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-stone-900 dark:text-white">Fiqh va Ibodat Bilimdoni</div>
                  <div className="text-stone-500 text-[11px]">Tahorat, namoz va roʻza hukmlari bilimdoni</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-stone-900 dark:text-white">Muntazam Talaba</div>
                  <div className="text-stone-500 text-[11px]">Ketma-ket 3 kundan ortiq viktorinada qatnashgan</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
