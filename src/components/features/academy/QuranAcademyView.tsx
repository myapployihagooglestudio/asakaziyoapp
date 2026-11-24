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
import { PageHero } from '../../ui/PageHero';
import {
  MorphingTabs,
  SpatialTiltCard,
  StaggerGrid,
  StaggerCard,
} from '../../ui/MotionPrimitives';
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
    <div className="space-y-8 pb-16">
      <PageHero
        variant="spatial"
        kicker="ASAKA ZIYO Taʼlim Markazi · Arab Alifbosi · Maxrajlar · Tajvid · Muallimi Soniy"
        title="Qurʼon Taʼlim Akademiyasi"
        subtitle="Boshlangʻich harflardan tortib rangli tajvid qoidalari, Muallimi Soniy bosqichli darslari va bolalar boʻlimigacha — barcha oʻquv natijalaringiz Firestoreʼda saqlanadi."
        aside={
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-white/[0.06] border border-white/[0.12] px-4 py-3 backdrop-blur-md">
              <div className="text-[11px] text-[#A4B9B1]">Harflar</div>
              <div className="text-xl font-display font-bold font-mono-numbers text-[#F7F4EC]">
                {progress.masteredLetters.length}/28
              </div>
            </div>
            <div className="rounded-2xl bg-white/[0.06] border border-white/[0.12] px-4 py-3 backdrop-blur-md">
              <div className="text-[11px] text-[#A4B9B1]">Darslar</div>
              <div className="text-xl font-display font-bold font-mono-numbers text-[#F7F4EC]">
                {progress.completedLessons.length}/{MUALLIMI_SONIY_LESSONS.length}
              </div>
            </div>
            <div className="rounded-2xl bg-white/[0.06] border border-white/[0.12] px-4 py-3 backdrop-blur-md">
              <div className="text-[11px] text-[#A4B9B1]">Eng yaxshi test</div>
              <div className="text-xl font-display font-bold font-mono-numbers text-[#C8A85E]">
                {progress.quizBestScore}/{ACADEMY_QUIZ_QUESTIONS.length}
              </div>
            </div>
            <div className="rounded-2xl bg-white/[0.06] border border-white/[0.12] px-4 py-3 backdrop-blur-md">
              <div className="text-[11px] text-[#A4B9B1]">Holat</div>
              <div className="flex items-center gap-1.5 text-xs font-semibold mt-1">
                {syncState === 'synced' ? (
                  <>
                    <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Saqlangan</span>
                  </>
                ) : syncState === 'saving' || syncState === 'loading' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-[#C8A85E] animate-spin" />
                    <span className="text-[#C8A85E]">Yuklanmoqda</span>
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
        }
      />

      {/* Section Navigation */}
      <MorphingTabs
        items={[
          { id: 'alphabet', label: 'Arab alifbosi va Maxrajlar', icon: <BookOpen className="w-4 h-4" /> },
          { id: 'tajweed', label: 'Tajvid ranglari', icon: <Layers className="w-4 h-4" /> },
          { id: 'muallimi', label: 'Muallimi Soniy', icon: <GraduationCap className="w-4 h-4" /> },
          { id: 'kids', label: 'Bolalar uchun', icon: <Star className="w-4 h-4" /> },
          { id: 'quiz', label: 'Bilim testi', icon: <Award className="w-4 h-4" /> },
        ]}
        activeId={section}
        onChange={(id) => setSection(id as 'alphabet' | 'tajweed' | 'muallimi' | 'kids' | 'quiz')}
        layoutId="academy-main-tabs"
      />

      {/* 1. ARABIC ALPHABET & MAKHARIJ */}
      {section === 'alphabet' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-4">
            <MorphingTabs
              items={['Barchasi', 'Halq (Tomoq)', 'Lison (Til)', 'Shafatan (Lab)', 'Javf (Boʻshliq)', 'Xayshum (Dimogʻ)'].map(
                (zone) => ({ id: zone, label: zone })
              )}
              activeId={makhrajFilter}
              onChange={setMakhrajFilter}
              layoutId="academy-makhraj-tabs"
            />

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5" dir="rtl">
              {filteredLetters.map((item) => {
                const active = selectedLetter.id === item.id;
                const mastered = progress.masteredLetters.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedLetter(item)}
                    className={`relative p-3 min-h-[78px] rounded-2xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                      active
                        ? 'bg-gradient-to-br from-[#064E3B] to-[#052C22] text-[#F7F4EC] border-[#C8A85E]/60 shadow-lg scale-[1.02]'
                        : 'az-liquid-glass-card text-[#091813] dark:text-[#F7F4EC] hover:border-emerald-500/40'
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

          <div className="lg:col-span-5">
            <SpatialTiltCard maxTilt={3.5}>
              <Card elevated className="p-6 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-[#8B6B2E] dark:text-[#C8A85E] font-semibold">
                      {selectedLetter.order}-harf · {selectedLetter.makhrajZone}
                    </p>
                    <h2 className="text-2xl font-display font-bold text-[#091813] dark:text-[#F7F4EC] mt-1">
                      {selectedLetter.nameUz} ({selectedLetter.translit})
                    </h2>
                  </div>
                  <span className="font-arabic text-6xl text-[#064E3B] dark:text-[#C8A85E] leading-none" dir="rtl">
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
                      className="rounded-xl bg-[#F4EFE3]/75 dark:bg-[#050E0B]/80 border border-black/[0.06] dark:border-white/[0.08] p-2.5"
                    >
                      <div className="font-arabic text-2xl text-[#091813] dark:text-[#F7F4EC]">{form.glyph}</div>
                      <div className="text-[11px] text-[#587068] dark:text-[#9CAFA7] mt-1" dir="ltr">
                        {form.label}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-[#091813] dark:text-[#F7F4EC]">Maxraj (Chiqish oʻrni)</h3>
                  <p className="text-sm text-[#3B554D] dark:text-[#A4B9B1] leading-relaxed">
                    {selectedLetter.makhrajDetailUz}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#F4EFE3]/75 dark:bg-[#050E0B]/80 border border-[#C8A85E]/20 p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-[#587068] dark:text-[#9CAFA7]">Qurʼoniy misol</div>
                    <div className="text-sm font-semibold text-[#091813] dark:text-[#F7F4EC] mt-0.5">
                      {selectedLetter.exampleUz}
                    </div>
                  </div>
                  <span className="font-arabic text-3xl text-[#064E3B] dark:text-[#C8A85E]" dir="rtl">
                    {selectedLetter.exampleAr}
                  </span>
                </div>

                <Button
                  variant={progress.masteredLetters.includes(selectedLetter.id) ? 'outline' : 'emerald'}
                  onClick={() => toggleMasteredLetter(selectedLetter.id)}
                  className="w-full"
                >
                  {progress.masteredLetters.includes(selectedLetter.id)
                    ? 'Oʻzlashtirilgan (Bekor qilish)'
                    : 'Ushbu harfni oʻzlashtirdim'}
                </Button>
              </Card>
            </SpatialTiltCard>
          </div>
        </div>
      )}

      {/* 2. TAJWEED COLOR RULES */}
      {section === 'tajweed' && (
        <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {TAJWEED_COLOR_RULES.map((rule) => (
            <StaggerCard key={rule.id}>
              <Card elevated className="p-6 space-y-4 h-full">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <span
                        className="w-3 h-3 rounded-sm inline-block shrink-0"
                        style={{ backgroundColor: rule.colorHex }}
                      />
                      <span style={{ color: rule.colorHex }}>{rule.colorLabelUz}</span>
                    </div>
                    <h3 className="text-lg font-display font-bold text-[#091813] dark:text-[#F7F4EC] mt-1">
                      {rule.titleUz}
                    </h3>
                  </div>
                  <span className="font-arabic text-2xl text-[#064E3B] dark:text-[#C8A85E]" dir="rtl">
                    {rule.titleAr}
                  </span>
                </div>

                <p className="text-sm text-[#3B554D] dark:text-[#A4B9B1] leading-relaxed">{rule.summaryUz}</p>

                <div className="rounded-2xl bg-[#F4EFE3]/75 dark:bg-[#050E0B]/80 p-4 space-y-2 border border-black/[0.06] dark:border-white/[0.08]">
                  <div className="text-xs text-[#587068] dark:text-[#9CAFA7]">
                    Harflar: <span className="font-arabic text-lg ml-2 text-[#091813] dark:text-[#F7F4EC]">{rule.lettersAr}</span>
                  </div>
                  <div
                    className="font-arabic text-2xl sm:text-3xl leading-loose text-right py-1"
                    dir="rtl"
                    style={{ color: rule.colorHex }}
                  >
                    {rule.exampleAr}
                  </div>
                  <div className="text-xs text-[#587068] dark:text-[#9CAFA7]">{rule.exampleRef}</div>
                </div>

                <p className="text-xs text-[#587068] dark:text-[#9CAFA7]">
                  <strong className="text-[#091813] dark:text-[#F7F4EC]">Amaliy eslatma:</strong> {rule.practiceTipUz}
                </p>
              </Card>
            </StaggerCard>
          ))}
        </StaggerGrid>
      )}

      {/* 3. MUALLIMI SONIY STEP-BY-STEP LESSONS */}
      {section === 'muallimi' && (
        <StaggerGrid className="space-y-4">
          {MUALLIMI_SONIY_LESSONS.map((lesson) => {
            const isDone = progress.completedLessons.includes(lesson.id);
            return (
              <StaggerCard key={lesson.id}>
                <Card elevated className="p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-xs text-[#8B6B2E] dark:text-[#C8A85E] font-semibold">
                        {lesson.level}-bosqich · {lesson.durationMin} daqiqa
                        {lesson.isKidsFriendly ? ' · Bolalar uchun ham mos' : ''}
                      </div>
                      <h3 className="text-lg font-display font-bold text-[#091813] dark:text-[#F7F4EC]">
                        {lesson.titleUz}
                      </h3>
                      <p className="text-sm text-[#587068] dark:text-[#9CAFA7]">{lesson.subtitleUz}</p>
                    </div>

                    <Button
                      onClick={() => toggleLessonComplete(lesson.id, lesson.durationMin)}
                      variant={isDone ? 'outline' : 'emerald'}
                    >
                      {isDone ? 'Yakunlangan' : 'Darsni yakunlash'}
                    </Button>
                  </div>

                  <ul className="list-disc pl-5 text-sm text-[#3B554D] dark:text-[#A4B9B1] space-y-1">
                    {lesson.objectivesUz.map((obj, idx) => (
                      <li key={idx}>{obj}</li>
                    ))}
                  </ul>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {lesson.drillItems.map((drill, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl bg-[#F4EFE3]/75 dark:bg-[#050E0B]/80 border border-black/[0.06] dark:border-white/[0.08] p-4 space-y-1.5"
                      >
                        <div className="font-arabic text-2xl text-right text-[#064E3B] dark:text-[#C8A85E]" dir="rtl">
                          {drill.ar}
                        </div>
                        <div className="text-sm font-bold text-[#091813] dark:text-[#F7F4EC]">{drill.read}</div>
                        <div className="text-xs text-[#587068] dark:text-[#9CAFA7]">{drill.note}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              </StaggerCard>
            );
          })}
        </StaggerGrid>
      )}

      {/* 4. KIDS QURAN CORNER */}
      {section === 'kids' && (
        <div className="space-y-5">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-[#C8A85E] shrink-0" />
              <div>
                <h2 className="text-lg font-display font-bold text-[#091813] dark:text-[#F7F4EC]">
                  Bolalar uchun Qurʼon va Odob Maktabi
                </h2>
                <p className="text-sm text-[#587068] dark:text-[#9CAFA7]">
                  Katta yozuvlar, oson boʻgʻinlar va ota-ona bilan birgalikda takrorlash uchun qisqa suralar.
                </p>
              </div>
            </div>
          </Card>

          <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {kidsLessons.map((lesson) => {
              const done = progress.completedLessons.includes(lesson.id);
              return (
                <StaggerCard key={lesson.id}>
                  <Card elevated className="p-6 space-y-4 h-full flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold text-[#8B6B2E] dark:text-[#C8A85E]">
                            Bolalar mashgʻuloti · {lesson.durationMin} daqiqa
                          </div>
                          <h3 className="text-lg font-display font-bold text-[#091813] dark:text-[#F7F4EC] mt-1">
                            {lesson.titleUz}
                          </h3>
                        </div>
                        <Star
                          className={`w-6 h-6 shrink-0 ${done ? 'text-[#C8A85E] fill-[#C8A85E]' : 'text-[#587068]/40'}`}
                        />
                      </div>
                      <div className="space-y-2.5">
                        {lesson.drillItems.map((d, i) => (
                          <div
                            key={i}
                            className="rounded-xl bg-[#F4EFE3]/75 dark:bg-[#050E0B]/80 p-3.5 flex items-center justify-between gap-3"
                          >
                            <span className="text-sm font-bold text-[#091813] dark:text-[#F7F4EC]">{d.read}</span>
                            <span className="font-arabic text-2xl text-[#064E3B] dark:text-[#C8A85E]" dir="rtl">
                              {d.ar}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button
                      variant={done ? 'outline' : 'emerald'}
                      onClick={() => toggleLessonComplete(lesson.id, lesson.durationMin)}
                      className="w-full"
                    >
                      {done ? 'Yulduzcha olindi!' : 'Mashqni bajardik'}
                    </Button>
                  </Card>
                </StaggerCard>
              );
            })}
          </StaggerGrid>
        </div>
      )}

      {/* 5. INTERACTIVE QUIZ */}
      {section === 'quiz' && (
        <Card elevated className="p-6 sm:p-8 max-w-3xl mx-auto space-y-6">
          {quizFinished ? (
            <div className="text-center space-y-4 py-4">
              <Award className="w-12 h-12 text-[#C8A85E] mx-auto" />
              <h2 className="text-2xl font-display font-bold text-[#091813] dark:text-[#F7F4EC]">
                Test yakunlandi!
              </h2>
              <p className="text-base text-[#3B554D] dark:text-[#A4B9B1] font-mono-numbers">
                Sizning natijangiz: <strong className="text-[#091813] dark:text-[#F7F4EC]">{currentScore} / {ACADEMY_QUIZ_QUESTIONS.length}</strong> · Eng yaxshi natija:{' '}
                <strong className="text-[#064E3B] dark:text-[#34D399]">{Math.max(progress.quizBestScore, currentScore)}</strong>
              </p>
              <Button variant="emerald" onClick={resetQuiz}>Testni qaytadan topshirish</Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs text-[#587068] dark:text-[#9CAFA7] font-mono-numbers">
                <span>
                  Savol {quizIndex + 1} / {ACADEMY_QUIZ_QUESTIONS.length}
                </span>
                <span>Joriy ball: {currentScore}</span>
              </div>

              <h2 className="text-xl font-display font-bold text-[#091813] dark:text-[#F7F4EC]">
                {ACADEMY_QUIZ_QUESTIONS[quizIndex].questionUz}
              </h2>

              <div className="space-y-2.5">
                {ACADEMY_QUIZ_QUESTIONS[quizIndex].options.map((opt, idx) => {
                  const isSelected = selectedOption === idx;
                  const isCorrect = idx === ACADEMY_QUIZ_QUESTIONS[quizIndex].correctIndex;
                  let cls =
                    'az-liquid-glass-pill text-[#091813] dark:text-[#F7F4EC] hover:border-emerald-500/40';
                  if (selectedOption !== null) {
                    if (isCorrect) {
                      cls = 'bg-[#064E3B] text-[#F7F4EC] border-emerald-500';
                    } else if (isSelected) {
                      cls = 'bg-rose-700 text-white border-rose-500';
                    }
                  }
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleQuizAnswer(idx)}
                      className={`w-full text-left px-4 py-3.5 min-h-[48px] rounded-2xl border text-sm font-medium transition-colors cursor-pointer ${cls}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {selectedOption !== null && (
                <div className="space-y-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
                  <p className="text-sm text-[#3B554D] dark:text-[#A4B9B1]">
                    <strong className="text-[#091813] dark:text-[#F7F4EC]">Izoh:</strong> {ACADEMY_QUIZ_QUESTIONS[quizIndex].explanationUz}
                  </p>
                  <Button variant="emerald" onClick={handleQuizNext}>
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
