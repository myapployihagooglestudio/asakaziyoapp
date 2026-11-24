import React, { useState } from 'react';
import { FastingDayEntry, UserFastingJournal } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { PageHero } from '../../ui/PageHero';
import { StaggerGrid, StaggerCard, ScrollReveal } from '../../ui/MotionPrimitives';
import {
  getStoredFastingJournal,
  toggleCompletedFast,
} from '../../../utils/databaseService';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Moon,
} from 'lucide-react';

const SAMPLE_FASTING_DAYS: FastingDayEntry[] = [
  {
    date: '2026-11-09',
    hijriDate: '29 Jumadul avval, 1448',
    imsakTime: '05:08',
    fajrTime: '05:18',
    iftarTime: '17:09',
    suhoorDuaAr: 'نَوَيْتُ أَنْ أَصُومَ صَوْمَ شَهْرِ رَمَضَانَ مِنَ الْفَجْرِ إِلَى الْمَغْرِبِ، خَالِصًا لِلَّهِ تَعَالَى',
    suhoorDuaUz: 'Navaytu an asuma sovma shahri ramazona minal fajri ilal magʻribi, xolisan lillahi taʼala.',
    iftarDuaAr: 'اللَّهُمَّ لَكَ صُمْتُ وَبِكَ آمَنْتُ وَعَلَيْكَ تَوَكَّلْتُ وَعَلَى رِزْقِكَ أَفْطَرْتُ',
    iftarDuaUz: 'Allohumma laka sumtu va bika amantu va aʼlayka tavakkaltu va aʼla rizqika aftartu.',
  },
  {
    date: '2026-11-12',
    hijriDate: '2 Jumadus soni, 1448 (Payshanba)',
    imsakTime: '05:11',
    fajrTime: '05:21',
    iftarTime: '17:06',
    suhoorDuaAr: 'نَوَيْتُ أَنْ أَصُومَ صَوْمَ النَّفْلِ خَالِصًا لِلَّهِ تَعَالَى',
    suhoorDuaUz: 'Navaytu an asuma sovman nafli xolisan lillahi taʼala.',
    iftarDuaAr: 'اللَّهُمَّ لَكَ صُمْتُ وَعَلَى رِزْقِكَ أَفْطَرْتُ',
    iftarDuaUz: 'Allohumma laka sumtu va aʼla rizqika aftartu.',
  },
  {
    date: '2026-11-16',
    hijriDate: '6 Jumadus soni, 1448 (Dushanba)',
    imsakTime: '05:16',
    fajrTime: '05:26',
    iftarTime: '17:02',
    suhoorDuaAr: 'نَوَيْتُ أَنْ أَصُومَ صَوْمَ النَّفْلِ خَالِصًا لِلَّهِ تَعَالَى',
    suhoorDuaUz: 'Navaytu an asuma sovman nafli xolisan lillahi taʼala.',
    iftarDuaAr: 'اللَّهُمَّ لَكَ صُمْتُ وَعَلَى رِزْقِكَ أَفْطَرْتُ',
    iftarDuaUz: 'Allohumma laka sumtu va aʼla rizqika aftartu.',
  },
];

export const FastingView: React.FC = () => {
  const userId = 'asaka_user_current';
  const [journal, setJournal] = useState<UserFastingJournal>(() => getStoredFastingJournal(userId));

  const handleToggleFast = (dateStr: string) => {
    const updated = toggleCompletedFast(userId, dateStr);
    setJournal(updated);
  };

  return (
    <div className="max-w-5xl mx-auto pb-16 space-y-8">
      <PageHero
        variant="sanctuary"
        kicker="Ramazon · Nafl Roʻzalar · Asaka Rasmiy Vaqtlari"
        title="Roʻza Taqvimi va Duo Yordamchisi"
        subtitle="Asaka shahri rasmiy taqvimi boʻyicha Saharlik (ogʻiz yopish) va Iftorlik (ogʻiz ochish) vaqtlari hamda sunnat duolar."
        aside={
          <div className="rounded-2xl bg-white/[0.06] border border-white/[0.12] p-5 backdrop-blur-md space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#C8A85E]">
              <Moon className="w-4 h-4" />
              <span>Qayd etilgan roʻzalar</span>
            </div>
            <div className="text-3xl font-display font-extrabold font-mono-numbers text-[#F7F4EC]">
              {journal.completedFasts.length} <span className="text-sm font-normal text-[#A4B9B1]">kun</span>
            </div>
            <p className="text-xs text-[#A4B9B1]">Shaxsiy roʻza kundaligingizda saqlangan</p>
          </div>
        }
      />

      {/* Distinction Note */}
      <ScrollReveal>
        <Card className="p-5 space-y-1.5">
          <div className="font-bold text-xs uppercase tracking-wider text-[#8B6B2E] dark:text-[#C8A85E] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Imsak va Bomdod vaqti farqi</span>
          </div>
          <p className="text-sm text-[#3B554D] dark:text-[#A4B9B1] leading-relaxed">
            Ehtiyot yuzasidan <strong className="text-[#091813] dark:text-[#F7F4EC]">ogʻiz yopish (Imsak)</strong> vaqti Bomdod namozi kirishidan 10 daqiqa oldin belgilangan. Ogʻiz ochish esa Shom namozi azonining ayni vaqtiga toʻgʻri keladi.
          </p>
        </Card>
      </ScrollReveal>

      {/* Fasting Days List */}
      <StaggerGrid className="space-y-5">
        {SAMPLE_FASTING_DAYS.map((day) => {
          const isDone = journal.completedFasts.includes(day.date);

          return (
            <StaggerCard key={day.date}>
              <Card elevated className="p-6 sm:p-7 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#C8A85E]/15 text-[#8B6B2E] dark:text-[#C8A85E] flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-display font-bold text-[#091813] dark:text-[#F7F4EC]">
                        {day.hijriDate}
                      </h3>
                      <p className="text-xs text-[#587068] dark:text-[#9CAFA7] font-mono-numbers">
                        Milodiy: {day.date}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-5 font-mono-numbers">
                    <div>
                      <span className="text-[11px] text-[#587068] dark:text-[#9CAFA7] block">
                        Ogʻiz yopish (Imsak)
                      </span>
                      <strong className="text-[#8B6B2E] dark:text-[#C8A85E] text-base">
                        {day.imsakTime}
                      </strong>
                    </div>
                    <div className="h-7 w-px bg-black/10 dark:bg-white/10" aria-hidden="true" />
                    <div>
                      <span className="text-[11px] text-[#587068] dark:text-[#9CAFA7] block">
                        Ogʻiz ochish (Iftor)
                      </span>
                      <strong className="text-[#064E3B] dark:text-[#34D399] text-base">
                        {day.iftarTime}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Duas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-[#F4EFE3]/70 dark:bg-[#050E0B]/80 border border-[#C8A85E]/20 space-y-2">
                    <div className="text-xs font-bold text-[#8B6B2E] dark:text-[#C8A85E]">
                      Saharlik niyati
                    </div>
                    <p dir="rtl" className="font-arabic text-base text-right leading-[2.1] text-[#091813] dark:text-[#F7F4EC]">
                      {day.suhoorDuaAr}
                    </p>
                    <p className="text-xs italic text-[#3B554D] dark:text-[#A4B9B1] leading-relaxed">
                      {day.suhoorDuaUz}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F4EFE3]/70 dark:bg-[#050E0B]/80 border border-emerald-500/20 space-y-2">
                    <div className="text-xs font-bold text-[#064E3B] dark:text-[#34D399]">
                      Iftorlik duosi
                    </div>
                    <p dir="rtl" className="font-arabic text-base text-right leading-[2.1] text-[#091813] dark:text-[#F7F4EC]">
                      {day.iftarDuaAr}
                    </p>
                    <p className="text-xs italic text-[#3B554D] dark:text-[#A4B9B1] leading-relaxed">
                      {day.iftarDuaUz}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap justify-between items-center gap-3 pt-2">
                  <span className="text-xs text-[#587068] dark:text-[#9CAFA7]">
                    {isDone ? 'Ushbu kungi roʻza qayd etildi' : 'Roʻza tutgan boʻlsangiz tasdiqlang'}
                  </span>
                  <Button
                    size="sm"
                    variant={isDone ? 'outline' : 'emerald'}
                    onClick={() => handleToggleFast(day.date)}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    <span>{isDone ? 'Roʻza tutildi (Bekor qilish)' : 'Roʻzani qayd qilish'}</span>
                  </Button>
                </div>
              </Card>
            </StaggerCard>
          );
        })}
      </StaggerGrid>
    </div>
  );
};
