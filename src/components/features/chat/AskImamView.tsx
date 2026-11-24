import React, { useState } from 'react';
import { ImamQuestionItem, QuestionCategory } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { PageHero } from '../../ui/PageHero';
import { StaggerGrid, StaggerCard, ScrollReveal } from '../../ui/MotionPrimitives';
import {
  getStoredImamQuestions,
  submitImamQuestion,
} from '../../../utils/databaseService';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  Shield,
} from 'lucide-react';

const CATEGORIES: { id: QuestionCategory; label: string }[] = [
  { id: 'ibodat', label: 'Ibodat va Namoz' },
  { id: 'oilaviy', label: 'Oila va Nikoh' },
  { id: 'muomala', label: 'Muomala va Tijorat' },
  { id: 'aqida', label: 'Aqiyda' },
  { id: 'ramazon', label: 'Ramazon va Roʻza' },
  { id: 'umumiy', label: 'Umumiy savollar' },
];

export const AskImamView: React.FC = () => {
  const userId = 'asaka_user_current';

  const [questions, setQuestions] = useState<ImamQuestionItem[]>(() =>
    getStoredImamQuestions(userId)
  );

  const [category, setCategory] = useState<QuestionCategory>('ibodat');
  const [title, setTitle] = useState<string>('');
  const [questionText, setQuestionText] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [submittedNotice, setSubmittedNotice] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !questionText.trim()) return;

    const newQ: ImamQuestionItem = {
      id: `q_${Date.now()}`,
      userId,
      userDisplayName: isAnonymous ? 'Anonim foydalanuvchi' : 'Asaka ahli',
      isAnonymous,
      category,
      title: title.trim(),
      questionText: questionText.trim(),
      submittedAt: new Date().toISOString(),
      status: 'submitted',
      isPubliclyVisible: false,
    };

    submitImamQuestion(newQ);
    setQuestions([newQ, ...questions]);
    setTitle('');
    setQuestionText('');
    setSubmittedNotice(
      'Savolingiz Asaka bosh imom-xatibi va fatvo hayʼatiga muvaffaqiyatli yoʻllandi. Javob tayyor boʻlganda bildirishnoma orqali xabar beriladi.'
    );
    setTimeout(() => setSubmittedNotice(null), 6000);
  };

  return (
    <div className="max-w-5xl mx-auto pb-16 space-y-8">
      <PageHero
        variant="sanctuary"
        kicker="Xavfsiz va Maxfiy Diniy Muloqot"
        title="Imomga Savol Yoʻllash"
        subtitle="Shariat va kundalik diniy masalalar boʻyicha Asaka jome masjidi ulamolariga savol yoʻllang. Barcha shaxsiy savollar mutlaqo maxfiy saqlanadi."
      />

      {submittedNotice && (
        <div className="p-4 rounded-2xl bg-emerald-500/12 border border-emerald-500/30 text-[#064E3B] dark:text-[#34D399] text-sm font-semibold flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{submittedNotice}</span>
        </div>
      )}

      {/* Ask Question Form */}
      <ScrollReveal>
        <Card elevated className="p-6 sm:p-8 space-y-6">
          <h2 className="text-base sm:text-lg font-display font-bold text-[#091813] dark:text-[#F7F4EC] flex items-center gap-2 border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
            <MessageSquare className="w-4 h-4 text-[#C8A85E]" />
            <span>Yangi savol yozish</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#3B554D] dark:text-[#A4B9B1] block">
                  Savol yoʻnalishi (Boʻlim)
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as QuestionCategory)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] text-sm rounded-2xl az-liquid-glass-pill text-[#091813] dark:text-[#F7F4EC] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id} className="text-black">
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#3B554D] dark:text-[#A4B9B1] block">
                  Savol mavzusi
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Masalan: Safarda namoz oʻqish..."
                  className="w-full px-3.5 py-2.5 min-h-[44px] text-sm rounded-2xl az-liquid-glass-pill text-[#091813] dark:text-[#F7F4EC] placeholder:text-[#6B827A] dark:placeholder:text-[#7E968D] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#3B554D] dark:text-[#A4B9B1] block">
                Savolingizning batafsil matni
              </label>
              <textarea
                required
                rows={4}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Masalani aniq va tushunarli holda bayon eting..."
                className="w-full p-3.5 text-sm rounded-2xl az-liquid-glass-pill text-[#091813] dark:text-[#F7F4EC] placeholder:text-[#6B827A] dark:placeholder:text-[#7E968D] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <label htmlFor="anonQuestion" className="flex items-center gap-2.5 text-xs text-[#3B554D] dark:text-[#A4B9B1] cursor-pointer">
                <input
                  type="checkbox"
                  id="anonQuestion"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#064E3B]"
                />
                <span>Savolni anonim (ismni yashirgan holda) yuborish</span>
              </label>

              <Button type="submit" variant="emerald">
                <Send className="w-4 h-4 mr-1.5" />
                <span>Savolni yuborish</span>
              </Button>
            </div>
          </form>
        </Card>
      </ScrollReveal>

      {/* Answered Questions & Public Q&A */}
      <div className="space-y-4">
        <h3 className="az-type-overline text-[#587068] dark:text-[#9CAFA7] px-1">
          Savol-Javoblar va Ochiq Fatvolar
        </h3>

        <StaggerGrid className="space-y-4">
          {questions.map((q) => (
            <StaggerCard key={q.id}>
              <Card elevated className="p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/[0.06] dark:border-white/[0.08] pb-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#8B6B2E] dark:text-[#C8A85E] uppercase">
                      {q.category}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#587068] dark:text-[#9CAFA7] font-mono-numbers">
                      {q.submittedAt.split('T')[0]}
                    </span>
                  </div>
                  <span
                    className={`font-bold ${
                      q.status === 'answered'
                        ? 'text-[#064E3B] dark:text-[#34D399]'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {q.status === 'answered' ? 'Javob berilgan' : 'Koʻrib chiqilmoqda'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-base sm:text-lg font-display font-bold text-[#091813] dark:text-[#F7F4EC]">
                    {q.title}
                  </h4>
                  <p className="text-sm text-[#3B554D] dark:text-[#A4B9B1] leading-relaxed">
                    {q.questionText}
                  </p>
                </div>

                {q.answerText && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#F4EFE3]/75 dark:bg-[#050E0B]/85 border border-emerald-500/20 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#064E3B] dark:text-[#34D399]">
                      <Shield className="w-4 h-4" />
                      <span>Ulamolar javobi · {q.assignedScholarName}</span>
                    </div>
                    <p className="text-sm text-[#091813] dark:text-[#F7F4EC]/92 leading-relaxed">
                      {q.answerText}
                    </p>
                    {q.sourceReferences && (
                      <p className="text-xs text-[#8B6B2E] dark:text-[#C8A85E] font-mono-numbers pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
                        Manba: {q.sourceReferences}
                      </p>
                    )}
                  </div>
                )}
              </Card>
            </StaggerCard>
          ))}
        </StaggerGrid>
      </div>
    </div>
  );
};
