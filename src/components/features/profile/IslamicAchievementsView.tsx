import React, { useState } from 'react';
import { PersonalProgressSummary } from '../../../types';
import { Card } from '../../ui/Card';
import { PageHero } from '../../ui/PageHero';
import {
  StaggerGrid,
  StaggerCard,
  InteractiveCounter,
  AnimatedProgressRing,
  SpatialTiltCard,
} from '../../ui/MotionPrimitives';
import { getStoredUserAchievements } from '../../../utils/databaseService';
import { Award, Lock, CheckCircle2 } from 'lucide-react';

export const IslamicAchievementsView: React.FC = () => {
  const userId = 'asaka_user_current';

  const [summary] = useState<PersonalProgressSummary>(() =>
    getStoredUserAchievements(userId)
  );

  const unlockedCount = summary.achievements.filter((a) => a.isUnlocked).length;
  const overallPercent =
    summary.achievements.length > 0
      ? Math.round((unlockedCount / summary.achievements.length) * 100)
      : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      <PageHero
        variant="sanctuary"
        kicker="Shaxsiy Maʼnaviy Rivojlanish · Yutuqlar"
        title="Islomiy Amallar va Foydali Odatlar"
        subtitle="Qurʼon mutolaasi, namoz intizomi va zikr odatlarini shaxsiy ragʻbat bilan rivojlantiring. Bu yutuqlar faqat oʻzingizning ruhiy kamolotingiz uchundir."
        aside={
          <div className="flex items-center justify-center sm:justify-end">
            <div className="rounded-3xl bg-white/[0.06] border border-white/[0.12] backdrop-blur-md p-4 flex items-center gap-4">
              <AnimatedProgressRing progress={overallPercent} size={96} strokeWidth={7}>
                <span className="font-mono-numbers text-lg font-extrabold text-[#F7F4EC]">
                  {overallPercent}%
                </span>
              </AnimatedProgressRing>
              <div className="space-y-0.5 pr-2">
                <div className="text-[11px] uppercase tracking-wider text-[#C8A85E] font-semibold">
                  Ochilgan bosqich
                </div>
                <div className="text-xl font-display font-bold text-[#F7F4EC] font-mono-numbers">
                  {unlockedCount} / {summary.achievements.length}
                </div>
                <div className="text-xs text-[#C2D4CD]">Shaxsiy ixlos daftari</div>
              </div>
            </div>
          </div>
        }
      />

      {/* Disclaimers & Ethics */}
      <Card elevated className="p-4 sm:p-5 space-y-1.5">
        <div className="text-xs font-bold text-[#9E7F3C] dark:text-[#C8A85E] flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" />
          <span>Ibodat Odobi va Riyo Xavfidan Himoya</span>
        </div>
        <p className="text-xs sm:text-sm text-[#3B554D] dark:text-[#A4B9B1] leading-relaxed">
          Amallar faqat Alloh taolo roziligi uchun qilinadi. Ushbu ilova foydalanuvchilar oʻrtasida diniy musobaqa yoki reyting oʻrnatmaydi. Maʼlumotlar toʻliq maxfiy boʻlib, kishining ixlosini saqlashga xizmat qiladi.
        </p>
      </Card>

      {/* 4 Stats Bento Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
        <Card elevated className="p-4 sm:p-5 text-center space-y-1">
          <div className="text-[11px] font-medium text-[#587068] dark:text-[#9CAFA7]">
            Sobitqadamlik (Streak)
          </div>
          <div className="text-xl sm:text-2xl font-display font-extrabold text-[#9E7F3C] dark:text-[#C8A85E]">
            <InteractiveCounter value={summary.streakDays} suffix=" kun" />
          </div>
        </Card>

        <Card elevated className="p-4 sm:p-5 text-center space-y-1">
          <div className="text-[11px] font-medium text-[#587068] dark:text-[#9CAFA7]">
            Qurʼon Sahifalari
          </div>
          <div className="text-xl sm:text-2xl font-display font-extrabold text-[#064E3B] dark:text-[#10B981]">
            <InteractiveCounter value={summary.quranPagesReadTotal} suffix=" bet" />
          </div>
        </Card>

        <Card elevated className="p-4 sm:p-5 text-center space-y-1">
          <div className="text-[11px] font-medium text-[#587068] dark:text-[#9CAFA7]">
            Jami Zikrlar
          </div>
          <div className="text-xl sm:text-2xl font-display font-extrabold text-[#091813] dark:text-[#F7F4EC]">
            <InteractiveCounter value={summary.dhikrsCountTotal} suffix=" marta" />
          </div>
        </Card>

        <Card elevated className="p-4 sm:p-5 text-center space-y-1">
          <div className="text-[11px] font-medium text-[#587068] dark:text-[#9CAFA7]">
            Ochilgan Bosqichlar
          </div>
          <div className="text-xl sm:text-2xl font-display font-extrabold text-[#9E7F3C] dark:text-[#C8A85E] font-mono-numbers">
            {unlockedCount} / {summary.achievements.length}
          </div>
        </Card>
      </div>

      {/* Milestones Grid */}
      <div className="space-y-4">
        <h2 className="az-type-overline text-[#587068] dark:text-[#9CAFA7] px-1">
          Shaxsiy Bosqichlar (Milestones)
        </h2>

        <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {summary.achievements.map((item) => {
            const percent = Math.min(100, Math.round((item.currentCount / item.targetCount) * 100));

            return (
              <StaggerCard key={item.id}>
                <SpatialTiltCard
                  maxTilt={3}
                  glowColor={
                    item.isUnlocked
                      ? 'rgba(16, 185, 129, 0.22)'
                      : 'rgba(200, 168, 94, 0.16)'
                  }
                >
                  <Card
                    elevated
                    className={`p-5 h-full space-y-4 ${
                      item.isUnlocked ? 'ring-1 ring-emerald-500/35' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                            item.isUnlocked
                              ? 'bg-emerald-500/15 text-[#064E3B] dark:text-[#10B981] border border-emerald-500/30'
                              : 'az-liquid-glass-pill text-[#587068] dark:text-[#9CAFA7]'
                          }`}
                        >
                          {item.isUnlocked ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <Award className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-sm sm:text-[15px] font-bold text-[#091813] dark:text-[#F7F4EC]">
                            {item.titleUz}
                          </h3>
                          <p className="text-xs text-[#587068] dark:text-[#9CAFA7] mt-0.5">
                            {item.descriptionUz}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-[11px] font-semibold shrink-0 ${
                          item.isUnlocked
                            ? 'text-[#064E3B] dark:text-[#10B981]'
                            : 'text-[#587068] dark:text-[#9CAFA7]'
                        }`}
                      >
                        {item.isUnlocked ? 'Erishildi' : 'Jarayonda'}
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between items-center text-[11px] font-mono-numbers text-[#587068] dark:text-[#9CAFA7]">
                        <span>
                          Natija: {item.currentCount} / {item.targetCount}
                        </span>
                        <span className="font-semibold text-[#091813] dark:text-[#F7F4EC]">
                          {percent}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            item.isUnlocked
                              ? 'bg-gradient-to-r from-[#064E3B] to-[#10B981]'
                              : 'bg-gradient-to-r from-[#9E7F3C] to-[#C8A85E]'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </Card>
                </SpatialTiltCard>
              </StaggerCard>
            );
          })}
        </StaggerGrid>
      </div>
    </div>
  );
};
