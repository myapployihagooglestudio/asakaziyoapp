import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AcademyLesson, AcademyTrackKey, StudentProgress } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { IslamicHairlineDivider, IslamicStarEmblem } from '../../ui/GeometricPattern';
import {
  getStoredAcademyLessons,
  getStoredStudentProgress,
  markLessonCompleted,
} from '../../../utils/databaseService';
import {
  BookOpen,
  GraduationCap,
  CheckCircle2,
  Clock,
  Award,
  ChevronRight,
  Shield,
  HelpCircle,
} from 'lucide-react';

const TRACKS: { id: AcademyTrackKey; titleUz: string; subtext: string }[] = [
  { id: 'aqida', titleUz: 'Aqiyda & Tavhid', subtext: 'Ahli sunna val jamoa eʼtiqodi' },
  { id: 'fiqh', titleUz: 'Hanafiy Fiqhi', subtext: 'Tahorat, namoz va ibodat ahkomlari' },
  { id: 'tajwid', titleUz: 'Tajvid & Tartil', subtext: 'Qurʼon qiroati qoidalari' },
  { id: 'seerah', titleUz: 'Nabaviy Siyrat', subtext: 'Paygʻambarimiz (s.a.v.) hayotlari' },
];

export const AcademyView: React.FC = () => {
  const { t } = useTranslation();
  const userId = 'asaka_user_current';

  const [lessons, setLessons] = useState<AcademyLesson[]>(() => getStoredAcademyLessons());
  const [selectedTrack, setSelectedTrack] = useState<AcademyTrackKey>('aqida');
  const [activeLesson, setActiveLesson] = useState<AcademyLesson | null>(() => {
    const list = getStoredAcademyLessons().filter((l) => l.trackId === 'aqida');
    return list[0] || null;
  });
  const [progress, setProgress] = useState<StudentProgress>(() => getStoredStudentProgress(userId));
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);

  const handleSelectTrack = (trackId: AcademyTrackKey) => {
    setSelectedTrack(trackId);
    const trackLessons = lessons.filter((l) => l.trackId === trackId);
    setActiveLesson(trackLessons[0] || null);
    setSelectedQuizAnswer(null);
    setQuizSubmitted(false);
  };

  const handleCompleteLesson = (lesson: AcademyLesson) => {
    const updated = markLessonCompleted(userId, lesson.id, lesson.trackId);
    setProgress(updated);
  };

  const trackLessons = lessons.filter((l) => l.trackId === selectedTrack);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-in fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#064e3b] via-[#052b22] to-[#041d18] border border-[#c5a869]/30 p-6 sm:p-8 text-white shadow-xl">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#d4af37]">
            <GraduationCap className="w-4 h-4 text-[#d4af37]" />
            <span>Asaka Ziyo Islomiy Akademiyasi</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-white">
            Tizimli Diniy Taʼlim & Kurslar
          </h1>
          <p className="text-xs sm:text-sm text-stone-200 leading-relaxed">
            Ahli sunna val jamoa eʼtiqodi, Hanafiy mazhabi fiqhi, moʻtabar tajvid va nabaviy siyrat boʻyicha tekshirilgan darslar.
          </p>
        </div>
      </div>

      {/* Tracks Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {TRACKS.map((tr) => {
          const isSelected = selectedTrack === tr.id;
          const completedInTrack = progress.trackProgress[tr.id]?.completedCount || 0;
          return (
            <button
              key={tr.id}
              onClick={() => handleSelectTrack(tr.id)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'border-[#c5a869] bg-[#c5a869]/15 shadow-sm'
                  : 'border-stone-200 dark:border-[#c5a869]/20 bg-white dark:bg-[#0B1F1C] hover:border-[#c5a869]/50'
              }`}
            >
              <h3 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white">
                {tr.titleUz}
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 line-clamp-1">
                {tr.subtext}
              </p>
              <div className="mt-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono-numbers">
                Tugallandi: {completedInTrack} ta dars
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Lesson Reader & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Lessons Outline (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <Card elevated className="p-4 space-y-3 border-stone-200/90 dark:border-[#c5a869]/30 bg-white dark:bg-[#0B1F1C]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-white border-b border-stone-200/80 dark:border-white/10 pb-2">
              Darslar Roʻyxati
            </h3>
            <div className="space-y-1.5">
              {trackLessons.map((l, idx) => {
                const isActive = activeLesson?.id === l.id;
                const isDone = progress.completedLessons.includes(l.id);
                return (
                  <button
                    key={l.id}
                    onClick={() => {
                      setActiveLesson(l);
                      setSelectedQuizAnswer(null);
                      setQuizSubmitted(false);
                    }}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between text-xs transition-all cursor-pointer ${
                      isActive
                        ? 'border-[#c5a869] bg-[#c5a869]/10 text-stone-900 dark:text-white font-bold'
                        : 'border-transparent hover:bg-stone-100 dark:hover:bg-white/5 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-stone-200 dark:bg-emerald-950 flex items-center justify-center text-[10px] font-mono-numbers">
                        {idx + 1}
                      </span>
                      <span className="line-clamp-1">{l.title}</span>
                    </div>
                    {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right: Lesson Content (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {activeLesson ? (
            <Card elevated className="p-6 sm:p-8 space-y-6 border-stone-200/90 dark:border-[#c5a869]/30 bg-white dark:bg-[#0B1F1C]">
              <div className="space-y-2 border-b border-stone-200/80 dark:border-white/10 pb-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#9E7F3C] dark:text-[#c5a869] font-bold uppercase tracking-wider">
                    {activeLesson.trackTitleUz}
                  </span>
                  <div className="flex items-center gap-1.5 text-stone-500 font-mono-numbers">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{activeLesson.durationMinutes} daqiqa</span>
                  </div>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-white">
                  {activeLesson.title}
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Manba: <strong>{activeLesson.verifiedSource}</strong>
                </p>
              </div>

              {/* Lesson Text */}
              <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm text-stone-700 dark:text-stone-200 leading-relaxed whitespace-pre-line">
                {activeLesson.contentMarkdown}
              </div>

              {/* Interactive Lesson Quiz */}
              {activeLesson.quizQuestions && activeLesson.quizQuestions.length > 0 && (
                <div className="p-5 rounded-2xl bg-[#F3EFE6]/60 dark:bg-[#071614] border border-stone-200 dark:border-[#c5a869]/20 space-y-4">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900 dark:text-white uppercase tracking-wider">
                    <HelpCircle className="w-4 h-4 text-[#9E7F3C] dark:text-[#c5a869]" />
                    <span>Mavzu Yuzasidan Savol:</span>
                  </div>
                  {activeLesson.quizQuestions.map((q, qIdx) => (
                    <div key={qIdx} className="space-y-3">
                      <p className="text-xs sm:text-sm font-semibold text-stone-800 dark:text-stone-200">
                        {q.question}
                      </p>
                      <div className="space-y-2">
                        {q.options.map((opt, optIdx) => (
                          <button
                            key={optIdx}
                            onClick={() => {
                              setSelectedQuizAnswer(optIdx);
                              setQuizSubmitted(true);
                            }}
                            className={`w-full p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                              quizSubmitted
                                ? optIdx === q.correctIndex
                                  ? 'border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-bold'
                                  : selectedQuizAnswer === optIdx
                                  ? 'border-rose-500 bg-rose-500/15 text-rose-700'
                                  : 'border-stone-200 dark:border-white/5 opacity-60'
                                : selectedQuizAnswer === optIdx
                                ? 'border-[#c5a869] bg-[#c5a869]/10'
                                : 'border-stone-200 dark:border-white/10 hover:bg-stone-50 dark:hover:bg-white/5'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>

                      {quizSubmitted && (
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-stone-700 dark:text-stone-300 space-y-1">
                          <div className="font-bold text-emerald-600 dark:text-emerald-400">Izoh:</div>
                          <p>{q.explanation}</p>
                          <p className="text-[10px] text-stone-500 font-mono-numbers">
                            Manba: {q.sourceReference}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <IslamicHairlineDivider />

              {/* Complete Lesson Action */}
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-stone-500">
                  {progress.completedLessons.includes(activeLesson.id)
                    ? 'Ushbu dars oʻzlashtirilgan'
                    : 'Darsni toʻliq oʻqib boʻlgach tasdiqlang'}
                </span>
                <Button
                  variant="emerald"
                  size="sm"
                  onClick={() => handleCompleteLesson(activeLesson)}
                  className="min-h-[40px] text-xs font-bold"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  <span>
                    {progress.completedLessons.includes(activeLesson.id)
                      ? 'Dars Oʻzlashtirildi'
                      : 'Darsni Yakunlash'}
                  </span>
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-12 text-center text-stone-500">Dars tanlang</Card>
          )}
        </div>
      </div>
    </div>
  );
};
