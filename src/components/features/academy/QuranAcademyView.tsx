import React, { useState, useEffect, useCallback } from 'react';
import {
  ARABIC_ALPHABET,
  TAJWEED_COLOR_RULES,
  MUALLIMI_SONIY_LESSONS,
  ACADEMY_QUIZ_QUESTIONS,
  ArabicLetterItem,
} from '../../../data/superAppData';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import {
  BookOpen,
  GraduationCap,
  CheckCircle2,
  Sparkles,
  Cloud,
  CloudOff,
  RefreshCw,
  Award,
  Layers,
  Star,
} from 'lucide-react';

interface AcademyProgressState {
  completedLessons: string[];
  masteredLetters: string[];
  quizBestScore: number;
  quizAttempts: number;
  studyMinutes: number;
  updatedAt: string;
}

const LOCAL_ACADEMY_KEY = 'asaka_ziyo_academy_progress_v1';

function getOrCreateUserId(): string {
  try {
    const existing = localStorage.getItem('asaka_ziyo_device_uid');
    if (existing && /^[a-zA-Z0-9_-]{4,64}$/.test(existing)) return existing;
    const created = `user_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem('asaka_ziyo_device_uid', created);
    return created;
  } catch {
    return 'user_local_guest';
  }
}

const DEFAULT_PROGRESS: AcademyProgressState = {
  completedLessons: [],
  masteredLetters: [],
  quizBestScore: 0,
  quizAttempts: 0,
  studyMinutes: 0,
  updatedAt: new Date().toISOString(),
};

export const QuranAcademyView: React.FC = () => {
  const [userId] = useState<string>(() => getOrCreateUserId());
  const [section, setSection] = useState<'alphabet' | 'tajweed' | 'muallimi' | 'kids' | 'quiz'>('alphabet');
  const [selectedLetter, setSelectedLetter] = useState<ArabicLetterItem>(ARABIC_ALPHABET[0]);
  const [makhrajFilter, setMakhrajFilter] = useState<string>('Barchasi');
  const [progress, setProgress] = useState<AcademyProgressState>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_ACADEMY_KEY);
      if (saved) return { ...DEFAULT_PROGRESS, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return DEFAULT_PROGRESS;
  });
  const [syncState, setSyncState] = useState<'loading' | 'synced' | 'saving' | 'pending_offline'>('loading');

  // Quiz state
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [currentScore, setCurrentScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch(`/api/database/academy-progress?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((json) => {
        if (!mounted) return;
        if (json?.success && json?.progress) {
          const loaded: AcademyProgressState = {
            completedLessons: Array.isArray(json.progress.completedLessons) ? json.progress.completedLessons : [],
            masteredLetters: Array.isArray(json.progress.masteredLetters) ? json.progress.masteredLetters : [],
            quizBestScore: Number(json.progress.quizBestScore) || 0,
            quizAttempts: Number(json.progress.quizAttempts) || 0,
            studyMinutes: Number(json.progress.studyMinutes) || 0,
            updatedAt: json.progress.updatedAt || new Date().toISOString(),
          };
          setProgress(loaded);
          try {
            localStorage.setItem(LOCAL_ACADEMY_KEY, JSON.stringify(loaded));
          } catch {
            // ignore
          }
        }
        setSyncState('synced');
      })
      .catch(() => {
        if (mounted) setSyncState('pending_offline');
      });
    return () => {
      mounted = false;
    };
  }, [userId]);

  const saveProgress = useCallback(
    async (next: AcademyProgressState) => {
      const payload = { ...next, updatedAt: new Date().toISOString() };
      setProgress(payload);
      try {
        localStorage.setItem(LOCAL_ACADEMY_KEY, JSON.stringify(payload));
      } catch {
        // ignore
      }
      setSyncState('saving');
      try {
        const res = await fetch('/api/database/academy-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, progress: payload }),
        });
        const json = await res.json();
        setSyncState(res.ok && json?.firestoreSynced ? 'synced' : 'pending_offline');
      } catch {
        setSyncState('pending_offline');
      }
    },
    [userId]
  );

  const toggleMasteredLetter = (letterId: string) => {
    const exists = progress.masteredLetters.includes(letterId);
    const nextLetters = exists
      ? progress.masteredLetters.filter((id) => id !== letterId)
      : [...progress.masteredLetters, letterId];
    void saveProgress({
      ...progress,
      masteredLetters: nextLetters,
      studyMinutes: progress.studyMinutes + (exists ? 0 : 2),
    });
  };

  const toggleLessonComplete = (lessonId: string, durationMin: number) => {
    const exists = progress.completedLessons.includes(lessonId);
    const nextLessons = exists
      ? progress.completedLessons.filter((id) => id !== lessonId)
      : [...progress.completedLessons, lessonId];
    void saveProgress({
      ...progress,
      completedLessons: nextLessons,
      studyMinutes: progress.studyMinutes + (exists ? 0 : durationMin),
    });
  };

  const handleQuizAnswer = (optIdx: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(optIdx);
    const q = ACADEMY_QUIZ_QUESTIONS[quizIndex];
    if (optIdx === q.correctIndex) {
      setCurrentScore((s) => s + 1);
    }
  };

  const handleQuizNext = () => {
    if (quizIndex + 1 < ACADEMY_QUIZ_QUESTIONS.length) {
      setQuizIndex((i) => i + 1);
      setSelectedOption(null);
    } else {
      setQuizFinished(true);
      void saveProgress({
        ...progress,
        quizBestScore: Math.max(progress.quizBestScore, currentScore),
        quizAttempts: progress.quizAttempts + 1,
        studyMinutes: progress.studyMinutes + 5,
      });
    }
  };

  const resetQuiz = () => {
    setQuizIndex(0);
    setSelectedOption(null);
    setCurrentScore(0);
    setQuizFinished(false);
  };

  const filteredLetters =
    makhrajFilter === 'Barchasi'
      ? ARABIC_ALPHABET
      : ARABIC_ALPHABET.filter((l) => l.makhrajZone === makhrajFilter);

  const kidsLessons = MUALLIMI_SONIY_LESSONS.filter((l) => l.isKidsFriendly);

  return (
    <div className="space-y-8">
      {/* Hero Summary */}
      <section className="rounded-3xl bg-[#03170F] text-[#FFF8E8] border border-[#DFBD69]/35 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <p className="text-xs font-semibold tracking-widest uppercase text-[#DFBD69]">
              ASAKA ZIYO Taʼlim Markazi · Arab alifbosi · Maxrajlar · Tajvid · Muallimi Soniy
            </p>
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-balance">
              Qurʼon Taʼlim Akademiyasi
            </h1>
            <p className="text-sm sm:text-base text-[#E6DFCE]/85 leading-relaxed">
              Boshlangʻich harflardan tortib rangli tajvid qoidalari, Muallimi Soniy bosqichli darslari va bolalar boʻlimigacha — barcha oʻquv natijalaringiz Firestoreʼda saqlanadi.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 shrink-0">
            <div className="rounded-2xl bg-[#092E1F]/80 border border-[#DFBD69]/25 px-4 py-3">
              <div className="text-xs text-[#9CB5AC]">Harflar</div>
              <div className="text-xl font-bold tabular-nums text-[#FFF6C8]">
                {progress.masteredLetters.length}/28
              </div>
            </div>
            <div className="rounded-2xl bg-[#092E1F]/80 border border-[#DFBD69]/25 px-4 py-3">
              <div className="text-xs text-[#9CB5AC]">Darslar</div>
              <div className="text-xl font-bold tabular-nums text-[#FFF6C8]">
                {progress.completedLessons.length}/{MUALLIMI_SONIY_LESSONS.length}
              </div>
            </div>
            <div className="rounded-2xl bg-[#092E1F]/80 border border-[#DFBD69]/25 px-4 py-3">
              <div className="text-xs text-[#9CB5AC]">Eng yaxshi test</div>
              <div className="text-xl font-bold tabular-nums text-[#FFF6C8]">
                {progress.quizBestScore}/{ACADEMY_QUIZ_QUESTIONS.length}
              </div>
            </div>
            <div className="rounded-2xl bg-[#092E1F]/80 border border-[#DFBD69]/25 px-4 py-3">
              <div className="text-xs text-[#9CB5AC]">Sinxronizatsiya</div>
              <div className="flex items-center gap-1.5 text-xs font-semibold mt-1">
                {syncState === 'synced' ? (
                  <>
                    <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Saqlangan</span>
                  </>
                ) : syncState === 'saving' || syncState === 'loading' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-[#DFBD69] animate-spin" />
                    <span className="text-[#DFBD69]">Yuklanmoqda</span>
                  </>
                ) : (
                  <>
                    <CloudOff className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-amber-300">Oflayn kesh</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#063D32]/15 dark:border-[#DFBD69]/20 pb-3">
        {[
          { id: 'alphabet' as const, label: 'Arab alifbosi va Maxrajlar', icon: <BookOpen className="w-4 h-4" /> },
          { id: 'tajweed' as const, label: 'Tajvid ranglari', icon: <Layers className="w-4 h-4" /> },
          { id: 'muallimi' as const, label: 'Muallimi Soniy', icon: <GraduationCap className="w-4 h-4" /> },
          { id: 'kids' as const, label: 'Bolalar uchun', icon: <Star className="w-4 h-4" /> },
          { id: 'quiz' as const, label: 'Bilim testi', icon: <Award className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSection(tab.id)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              section === tab.id
                ? 'bg-[#063D32] text-[#FFF8E8] dark:bg-[#DFBD69] dark:text-[#010906]'
                : 'text-[#1E3F35] dark:text-[#E6DFCE] hover:bg-[#063D32]/8 dark:hover:bg-white/5'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 1. ARABIC ALPHABET & MAKHARIJ */}
      {section === 'alphabet' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {['Barchasi', 'Halq (Tomoq)', 'Lison (Til)', 'Shafatan (Lab)', 'Javf (Boʻshliq)', 'Xayshum (Dimogʻ)'].map(
                (zone) => (
                  <button
                    key={zone}
                    onClick={() => setMakhrajFilter(zone)}
                    className={`px-3 py-2 min-h-[38px] rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      makhrajFilter === zone
                        ? 'bg-[#063D32] text-white dark:bg-[#DFBD69] dark:text-[#010906]'
                        : 'bg-[#F1EBDD] dark:bg-[#041D13] text-[#1E3F35] dark:text-[#E6DFCE]'
                    }`}
                  >
                    {zone}
                  </button>
                )
              )}
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5" dir="rtl">
              {filteredLetters.map((item) => {
                const active = selectedLetter.id === item.id;
                const mastered = progress.masteredLetters.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedLetter(item)}
                    className={`relative p-3 min-h-[76px] rounded-2xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                      active
                        ? 'bg-[#063D32] text-[#FFF8E8] border-[#DFBD69] shadow-md'
                        : 'bg-white dark:bg-[#041D13] text-[#03170F] dark:text-[#FFF8E8] border-[#063D32]/12 dark:border-[#DFBD69]/20 hover:border-[#DFBD69]'
                    }`}
                  >
                    {mastered && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 absolute top-1.5 left-1.5" />
                    )}
                    <span className="font-arabic text-3xl leading-none">{item.letter}</span>
                    <span className="text-[11px] mt-1 opacity-80" dir="ltr">
                      {item.nameUz}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <Card className="lg:col-span-5 p-6 space-y-5 border border-[#063D32]/15 dark:border-[#DFBD69]/30">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-[#8A6621] dark:text-[#DFBD69] font-semibold">
                  {selectedLetter.order}-harf · {selectedLetter.makhrajZone}
                </p>
                <h2 className="text-2xl font-bold text-[#03170F] dark:text-[#FFF8E8] mt-1">
                  {selectedLetter.nameUz} ({selectedLetter.translit})
                </h2>
              </div>
              <span className="font-arabic text-6xl text-[#063D32] dark:text-[#DFBD69] leading-none" dir="rtl">
                {selectedLetter.letter}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center" dir="rtl">
              {[
                { label: 'Alohida', glyph: selectedLetter.isolated },
                { label: 'Boshida', glyph: selectedLetter.initial },
                { label: 'Oʻrtasida', glyph: selectedLetter.medial },
                { label: 'Oxirida', glyph: selectedLetter.final },
              ].map((form) => (
                <div
                  key={form.label}
                  className="rounded-xl bg-[#F8F5EC] dark:bg-[#092E1F]/70 border border-[#063D32]/10 dark:border-[#DFBD69]/18 p-2.5"
                >
                  <div className="font-arabic text-2xl text-[#03170F] dark:text-[#FFF6C8]">{form.glyph}</div>
                  <div className="text-[11px] text-[#526B62] dark:text-[#9CB5AC] mt-1" dir="ltr">
                    {form.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-[#03170F] dark:text-[#FFF8E8]">Maxraj (Chiqish oʻrni)</h3>
              <p className="text-sm text-[#1E3F35] dark:text-[#E6DFCE] leading-relaxed">
                {selectedLetter.makhrajDetailUz}
              </p>
            </div>

            <div className="rounded-2xl bg-[#F8F5EC] dark:bg-[#092E1F]/60 p-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs text-[#526B62] dark:text-[#9CB5AC]">Qurʼoniy misol</div>
                <div className="text-sm font-semibold text-[#03170F] dark:text-[#FFF8E8] mt-0.5">
                  {selectedLetter.exampleUz}
                </div>
              </div>
              <span className="font-arabic text-3xl text-[#063D32] dark:text-[#DFBD69]" dir="rtl">
                {selectedLetter.exampleAr}
              </span>
            </div>

            <Button
              onClick={() => toggleMasteredLetter(selectedLetter.id)}
              className="w-full"
            >
              {progress.masteredLetters.includes(selectedLetter.id)
                ? 'Oʻzlashtirilgan (Bekor qilish)'
                : 'Ushbu harfni oʻzlashtirdim'}
            </Button>
          </Card>
        </div>
      )}

      {/* 2. TAJWEED COLOR RULES */}
      {section === 'tajweed' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {TAJWEED_COLOR_RULES.map((rule) => (
            <Card
              key={rule.id}
              className="p-6 space-y-4 border border-[#063D32]/12 dark:border-[#DFBD69]/22"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span
                      className="w-3 h-3 rounded-sm inline-block shrink-0"
                      style={{ backgroundColor: rule.colorHex }}
                    />
                    <span style={{ color: rule.colorHex }}>{rule.colorLabelUz}</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#03170F] dark:text-[#FFF8E8] mt-1">
                    {rule.titleUz}
                  </h3>
                </div>
                <span className="font-arabic text-2xl text-[#063D32] dark:text-[#DFBD69]" dir="rtl">
                  {rule.titleAr}
                </span>
              </div>

              <p className="text-sm text-[#1E3F35] dark:text-[#E6DFCE] leading-relaxed">{rule.summaryUz}</p>

              <div className="rounded-2xl bg-[#F8F5EC] dark:bg-[#041D13] p-4 space-y-2 border border-[#063D32]/10 dark:border-[#DFBD69]/15">
                <div className="text-xs text-[#526B62] dark:text-[#9CB5AC]">
                  Harflar: <span className="font-arabic text-lg ml-2 text-[#03170F] dark:text-[#FFF6C8]">{rule.lettersAr}</span>
                </div>
                <div
                  className="font-arabic text-2xl sm:text-3xl leading-loose text-right py-1"
                  dir="rtl"
                  style={{ color: rule.colorHex }}
                >
                  {rule.exampleAr}
                </div>
                <div className="text-xs text-[#526B62] dark:text-[#9CB5AC]">{rule.exampleRef}</div>
              </div>

              <p className="text-xs text-[#526B62] dark:text-[#9CB5AC]">
                <strong>Amaliy eslatma:</strong> {rule.practiceTipUz}
              </p>
            </Card>
          ))}
        </div>
      )}

      {/* 3. MUALLIMI SONIY STEP-BY-STEP LESSONS */}
      {section === 'muallimi' && (
        <div className="space-y-4">
          {MUALLIMI_SONIY_LESSONS.map((lesson) => {
            const isDone = progress.completedLessons.includes(lesson.id);
            return (
              <Card
                key={lesson.id}
                className="p-6 space-y-4 border border-[#063D32]/12 dark:border-[#DFBD69]/22"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs text-[#8A6621] dark:text-[#DFBD69] font-semibold">
                      {lesson.level}-bosqich · {lesson.durationMin} daqiqa
                      {lesson.isKidsFriendly ? ' · Bolalar uchun ham mos' : ''}
                    </div>
                    <h3 className="text-lg font-bold text-[#03170F] dark:text-[#FFF8E8]">
                      {lesson.titleUz}
                    </h3>
                    <p className="text-sm text-[#526B62] dark:text-[#9CB5AC]">{lesson.subtitleUz}</p>
                  </div>

                  <Button
                    onClick={() => toggleLessonComplete(lesson.id, lesson.durationMin)}
                    variant={isDone ? 'secondary' : 'primary'}
                  >
                    {isDone ? 'Yakunlangan' : 'Darsni yakunlash'}
                  </Button>
                </div>

                <ul className="list-disc pl-5 text-sm text-[#1E3F35] dark:text-[#E6DFCE] space-y-1">
                  {lesson.objectivesUz.map((obj, idx) => (
                    <li key={idx}>{obj}</li>
                  ))}
                </ul>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {lesson.drillItems.map((drill, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl bg-[#F8F5EC] dark:bg-[#041D13] border border-[#063D32]/10 dark:border-[#DFBD69]/18 p-4 space-y-1.5"
                    >
                      <div className="font-arabic text-2xl text-right text-[#063D32] dark:text-[#DFBD69]" dir="rtl">
                        {drill.ar}
                      </div>
                      <div className="text-sm font-bold text-[#03170F] dark:text-[#FFF8E8]">{drill.read}</div>
                      <div className="text-xs text-[#526B62] dark:text-[#9CB5AC]">{drill.note}</div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 4. KIDS QURAN CORNER */}
      {section === 'kids' && (
        <div className="space-y-5">
          <Card className="p-6 bg-[#F8F5EC] dark:bg-[#092E1F]/50 border border-[#DFBD69]/35">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-[#DFBD69]" />
              <div>
                <h2 className="text-lg font-bold text-[#03170F] dark:text-[#FFF8E8]">
                  Bolalar uchun Qurʼon va Odob Maktabi
                </h2>
                <p className="text-sm text-[#526B62] dark:text-[#9CB5AC]">
                  Katta yozuvlar, oson boʻgʻinlar va ota-ona bilan birgalikda takrorlash uchun qisqa suralar.
                </p>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {kidsLessons.map((lesson) => {
              const done = progress.completedLessons.includes(lesson.id);
              return (
                <Card key={lesson.id} className="p-6 space-y-4 border border-[#063D32]/15 dark:border-[#DFBD69]/25">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-[#8A6621] dark:text-[#DFBD69]">
                        Bolalar mashgʻuloti · {lesson.durationMin} daqiqa
                      </div>
                      <h3 className="text-lg font-bold text-[#03170F] dark:text-[#FFF8E8] mt-1">
                        {lesson.titleUz}
                      </h3>
                    </div>
                    <Star
                      className={`w-6 h-6 shrink-0 ${done ? 'text-[#DFBD69] fill-[#DFBD69]' : 'text-[#526B62]/40'}`}
                    />
                  </div>
                  <div className="space-y-2.5">
                    {lesson.drillItems.map((d, i) => (
                      <div
                        key={i}
                        className="rounded-xl bg-[#F8F5EC] dark:bg-[#041D13] p-3.5 flex items-center justify-between gap-3"
                      >
                        <span className="text-sm font-bold text-[#03170F] dark:text-[#FFF8E8]">{d.read}</span>
                        <span className="font-arabic text-2xl text-[#063D32] dark:text-[#DFBD69]" dir="rtl">
                          {d.ar}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={() => toggleLessonComplete(lesson.id, lesson.durationMin)}
                    className="w-full"
                  >
                    {done ? 'Yulduzcha olindi!' : 'Mashqni bajardik'}
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. INTERACTIVE QUIZ */}
      {section === 'quiz' && (
        <Card className="p-6 sm:p-8 max-w-3xl mx-auto space-y-6 border border-[#063D32]/15 dark:border-[#DFBD69]/30">
          {quizFinished ? (
            <div className="text-center space-y-4 py-4">
              <Award className="w-12 h-12 text-[#DFBD69] mx-auto" />
              <h2 className="text-2xl font-bold text-[#03170F] dark:text-[#FFF8E8]">
                Test yakunlandi!
              </h2>
              <p className="text-base text-[#1E3F35] dark:text-[#E6DFCE] tabular-nums">
                Sizning natijangiz: <strong>{currentScore} / {ACADEMY_QUIZ_QUESTIONS.length}</strong> · Eng yaxshi natija:{' '}
                <strong>{Math.max(progress.quizBestScore, currentScore)}</strong>
              </p>
              <Button onClick={resetQuiz}>Testni qaytadan topshirish</Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs text-[#526B62] dark:text-[#9CB5AC] tabular-nums">
                <span>
                  Savol {quizIndex + 1} / {ACADEMY_QUIZ_QUESTIONS.length}
                </span>
                <span>Joriy ball: {currentScore}</span>
              </div>

              <h2 className="text-xl font-bold text-[#03170F] dark:text-[#FFF8E8]">
                {ACADEMY_QUIZ_QUESTIONS[quizIndex].questionUz}
              </h2>

              <div className="space-y-2.5">
                {ACADEMY_QUIZ_QUESTIONS[quizIndex].options.map((opt, idx) => {
                  const isSelected = selectedOption === idx;
                  const isCorrect = idx === ACADEMY_QUIZ_QUESTIONS[quizIndex].correctIndex;
                  let cls =
                    'bg-[#F8F5EC] dark:bg-[#041D13] border-[#063D32]/15 dark:border-[#DFBD69]/20 text-[#03170F] dark:text-[#FFF8E8]';
                  if (selectedOption !== null) {
                    if (isCorrect) {
                      cls = 'bg-emerald-700 text-white border-emerald-500';
                    } else if (isSelected) {
                      cls = 'bg-rose-700 text-white border-rose-500';
                    }
                  }
                  return (
                    <button
                      key={idx}
                      onClick={() => handleQuizAnswer(idx)}
                      className={`w-full text-left px-4 py-3.5 min-h-[48px] rounded-xl border text-sm font-medium transition-colors cursor-pointer ${cls}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {selectedOption !== null && (
                <div className="space-y-4 pt-2 border-t border-[#063D32]/12 dark:border-[#DFBD69]/20">
                  <p className="text-sm text-[#1E3F35] dark:text-[#E6DFCE]">
                    <strong>Izoh:</strong> {ACADEMY_QUIZ_QUESTIONS[quizIndex].explanationUz}
                  </p>
                  <Button onClick={handleQuizNext}>
                    {quizIndex + 1 < ACADEMY_QUIZ_QUESTIONS.length ? 'Keyingi savol' : 'Natijani koʻrish'}
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      )}
    </div>
  );
};
