import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImamQuestionItem, QuestionCategory } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { IslamicHairlineDivider, IslamicStarEmblem } from '../../ui/GeometricPattern';
import {
  getStoredImamQuestions,
  submitImamQuestion,
} from '../../../utils/databaseService';
import {
  MessageSquare,
  Send,
  HelpCircle,
  CheckCircle2,
  Lock,
  Clock,
  Shield,
  User,
} from 'lucide-react';

const CATEGORIES: { id: QuestionCategory; label: string }[] = [
  { id: 'ibodat', label: 'Ibodat & Namoz' },
  { id: 'oilaviy', label: 'Oila & Nikoh' },
  { id: 'muomala', label: 'Muomala & Tijorat' },
  { id: 'aqida', label: 'Aqiyda' },
  { id: 'ramazon', label: 'Ramazon & Roʻza' },
  { id: 'umumiy', label: 'Umumiy savollar' },
];

export const AskImamView: React.FC = () => {
  const { t } = useTranslation();
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
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-in fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#064e3b] via-[#052b22] to-[#041d18] border border-[#c5a869]/30 p-6 sm:p-8 text-white shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#d4af37]">
            <Lock className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>Xavfsiz & Maxfiy Diniy Muloqot</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-white">
            Imomga Savol Yoʻllash (Ask the Imam)
          </h1>
          <p className="text-xs sm:text-sm text-stone-200 leading-relaxed max-w-xl">
            Shariat va kundalik diniy masalalar boʻyicha Asaka jome masjidi ulamolariga savol yoʻllang. Barcha shaxsiy savollar mutlaqo maxfiy saqlanadi.
          </p>
        </div>
      </div>

      {submittedNotice && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{submittedNotice}</span>
        </div>
      )}

      {/* Ask Question Form */}
      <Card elevated className="p-6 sm:p-8 space-y-6 border-stone-200/90 dark:border-[#c5a869]/30 bg-white dark:bg-[#0B1F1C]">
        <h2 className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-2 border-b border-stone-200/80 dark:border-white/10 pb-3">
          <MessageSquare className="w-4 h-4 text-[#9E7F3C] dark:text-[#c5a869]" />
          <span>Yangi Savol Yozish</span>
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Savol yoʻnalishi (Boʻlim):
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as QuestionCategory)}
                className="w-full p-2.5 text-xs rounded-xl border border-stone-300 dark:border-emerald-800 bg-stone-50 dark:bg-[#071614] text-stone-900 dark:text-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Savol mavzusi (Qisqa sarlavha):
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Masalan: Safarda namoz oʻqish..."
                className="w-full p-2.5 text-xs rounded-xl border border-stone-300 dark:border-emerald-800 bg-stone-50 dark:bg-[#071614] text-stone-900 dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
              Savolingizning batafsil matni:
            </label>
            <textarea
              required
              rows={4}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Masalani aniq va tushunarli holda bayon eting..."
              className="w-full p-3 text-xs rounded-xl border border-stone-300 dark:border-emerald-800 bg-stone-50 dark:bg-[#071614] text-stone-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#c5a869]"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                id="anonQuestion"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="anonQuestion" className="text-stone-600 dark:text-stone-400 cursor-pointer">
                Savolni anonim (ismni yashirgan holda) yuborish
              </label>
            </div>

            <Button type="submit" variant="emerald" className="min-h-[40px] text-xs font-bold">
              <Send className="w-3.5 h-3.5 mr-1.5" />
              <span>Savolni Yuborish</span>
            </Button>
          </div>
        </form>
      </Card>

      {/* Answered Questions & Public Q&A */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
          Savol-Javoblar va Ochiq Fatvolar
        </h3>

        {questions.map((q) => (
          <Card
            key={q.id}
            elevated
            className="p-6 space-y-4 border-stone-200/90 dark:border-[#c5a869]/30 bg-white dark:bg-[#0B1F1C]"
          >
            <div className="flex items-center justify-between border-b border-stone-200/80 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#c5a869]/15 text-[#9E7F3C] dark:text-[#c5a869] text-xs font-bold border border-[#c5a869]/30">
                  {q.category}
                </span>
                <span className="text-xs text-stone-500 font-mono-numbers">
                  {q.submittedAt.split('T')[0]}
                </span>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  q.status === 'answered'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                }`}
              >
                {q.status === 'answered' ? 'Javob berilgan' : 'Koʻrib chiqilmoqda'}
              </span>
            </div>

            <div className="space-y-1.5">
              <h4 className="text-base font-bold text-stone-900 dark:text-white">
                {q.title}
              </h4>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                {q.questionText}
              </p>
            </div>

            {q.answerText && (
              <div className="p-4 rounded-2xl bg-[#F3EFE6]/70 dark:bg-[#071614] border border-stone-200/80 dark:border-emerald-950/80 space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-emerald-700 dark:text-emerald-400">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Ulamolar Javobi: ({q.assignedScholarName})</span>
                  </div>
                </div>
                <p className="text-stone-800 dark:text-stone-200 leading-relaxed">{q.answerText}</p>
                {q.sourceReferences && (
                  <p className="text-[11px] text-[#9E7F3C] dark:text-[#c5a869] font-mono-numbers pt-1 border-t border-stone-200/60 dark:border-white/5">
                    Manba: {q.sourceReferences}
                  </p>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};
