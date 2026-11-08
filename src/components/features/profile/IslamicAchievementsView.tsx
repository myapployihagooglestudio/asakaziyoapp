import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PersonalProgressSummary, IslamicAchievementMilestone } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { IslamicHairlineDivider, IslamicStarEmblem } from '../../ui/GeometricPattern';
import {
  getStoredUserAchievements,
  saveStoredUserAchievements,
} from '../../../utils/databaseService';
import {
  Award,
  Sparkles,
  BookOpen,
  Clock,
  Heart,
  TrendingUp,
  Shield,
  Lock,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

export const IslamicAchievementsView: React.FC = () => {
  const { t } = useTranslation();
  const userId = 'asaka_user_current';

  const [summary, setSummary] = useState<PersonalProgressSummary>(() =>
    getStoredUserAchievements(userId)
  );

  const unlockedCount = summary.achievements.filter((a) => a.isUnlocked).length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-in fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#064e3b] via-[#052b22] to-[#041d18] border border-[#c5a869]/30 p-6 sm:p-8 text-white shadow-xl">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#d4af37]">
            <Award className="w-4 h-4 text-[#d4af37]" />
            <span>Shaxsiy Maʼnaviy Rivojlanish & Yutuqlar</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-white">
            Islomiy Amallar va Foydali Odatlar
          </h1>
          <p className="text-xs sm:text-sm text-stone-200 leading-relaxed">
            Qurʼon mutolaasi, namoz intizomi va zikr odatlarini shaxsiy ragʻbat bilan rivojlantiring. Bu yutuqlar faqat oʻzingizning ruhiy kamolotingiz uchundir.
          </p>
        </div>
      </div>

      {/* Disclaimers & Ethics */}
      <div className="p-4 rounded-2xl bg-[#F3EFE6]/70 dark:bg-[#071614] border border-stone-200/80 dark:border-[#c5a869]/20 text-xs text-stone-700 dark:text-stone-300 space-y-1">
        <div className="font-bold text-[#9E7F3C] dark:text-[#c5a869] flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" />
          <span>Ibodat Odobi va Riyo Xavfidan Himoya:</span>
        </div>
        <p className="leading-relaxed">
          Amallar faqat Alloh taolo roziligi uchun qilinadi. Ushbu ilova foydalanuvchilar oʻrtasida diniy musobaqa yoki reyting oʻrnatmaydi. Maʼlumotlar toʻliq maxfiy boʻlib, kishining ixlosini saqlashga xizmat qiladi.
        </p>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0B1F1C] border border-stone-200/90 dark:border-[#c5a869]/30 shadow-xs">
          <div className="text-[11px] text-stone-500 dark:text-stone-400">Sobitqadamlik (Streak)</div>
          <div className="text-xl sm:text-2xl font-bold font-mono-numbers text-[#9E7F3C] dark:text-[#c5a869] mt-1">
            {summary.streakDays} kun
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0B1F1C] border border-stone-200/90 dark:border-[#c5a869]/30 shadow-xs">
          <div className="text-[11px] text-stone-500 dark:text-stone-400">Qurʼon Sahifalari</div>
          <div className="text-xl sm:text-2xl font-bold font-mono-numbers text-emerald-600 dark:text-emerald-400 mt-1">
            {summary.quranPagesReadTotal} bet
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0B1F1C] border border-stone-200/90 dark:border-[#c5a869]/30 shadow-xs">
          <div className="text-[11px] text-stone-500 dark:text-stone-400">Jami Zikrlar</div>
          <div className="text-xl sm:text-2xl font-bold font-mono-numbers text-stone-800 dark:text-stone-200 mt-1">
            {summary.dhikrsCountTotal} marta
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0B1F1C] border border-stone-200/90 dark:border-[#c5a869]/30 shadow-xs">
          <div className="text-[11px] text-stone-500 dark:text-stone-400">Ochilgan Bosqichlar</div>
          <div className="text-xl sm:text-2xl font-bold font-mono-numbers text-[#9E7F3C] dark:text-[#c5a869] mt-1">
            {unlockedCount} / {summary.achievements.length}
          </div>
        </div>
      </div>

      {/* Milestones Grid */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
          Shaxsiy Bosqichlar (Milestones)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {summary.achievements.map((item) => {
            const percent = Math.min(100, Math.round((item.currentCount / item.targetCount) * 100));

            return (
              <Card
                key={item.id}
                elevated
                className="p-5 space-y-4 border-stone-200/90 dark:border-[#c5a869]/30 bg-white dark:bg-[#0B1F1C]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                        item.isUnlocked
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-stone-100 dark:bg-white/5 text-stone-400'
                      }`}
                    >
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-stone-900 dark:text-white">
                        {item.titleUz}
                      </h4>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400">
                        {item.descriptionUz}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      item.isUnlocked
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : 'bg-stone-100 dark:bg-white/5 text-stone-500'
                    }`}
                  >
                    {item.isUnlocked ? 'Erishildi' : 'Jarayonda'}
                  </span>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between items-center text-[11px] font-mono-numbers text-stone-500">
                    <span>Natija: {item.currentCount} / {item.targetCount}</span>
                    <span>{percent}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-emerald-950/80 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        item.isUnlocked ? 'bg-emerald-500' : 'bg-[#c5a869]'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
