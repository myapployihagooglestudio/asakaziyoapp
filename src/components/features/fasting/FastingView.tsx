import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FastingDayEntry, UserFastingJournal } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { IslamicHairlineDivider, IslamicStarEmblem } from '../../ui/GeometricPattern';
import {
  getStoredFastingJournal,
  toggleCompletedFast,
} from '../../../utils/databaseService';
import {
  Moon,
  Sun,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  BookOpen,
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
  const { t } = useTranslation();
  const userId = 'asaka_user_current';

  const [journal, setJournal] = useState<UserFastingJournal>(() => getStoredFastingJournal(userId));

  const handleToggleFast = (dateStr: string) => {
    const updated = toggleCompletedFast(userId, dateStr);
    setJournal(updated);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-in fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#064e3b] via-[#052b22] to-[#041d18] border border-[#c5a869]/30 p-6 sm:p-8 text-white shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#d4af37]">
            <Moon className="w-4 h-4 text-[#d4af37]" />
            <span>Ramazon & Nafl Roʻzalar Yordamchisi</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-white">
            Roʻza Taqvim va Duo Yordamchisi
          </h1>
          <p className="text-xs sm:text-sm text-stone-200 leading-relaxed max-w-xl">
            Asaka shahri rasmiy taqvimi boʻyicha Saharlik (ogʻiz yopish) va Iftorlik (ogʻiz ochish) vaqtlari hamda sunnat duolar.
          </p>
        </div>
      </div>

      {/* Distinction Note */}
      <div className="p-4 rounded-2xl bg-[#F3EFE6]/70 dark:bg-[#071614] border border-stone-200/80 dark:border-[#c5a869]/20 text-xs text-stone-700 dark:text-stone-300 space-y-1">
        <div className="font-bold text-[#9E7F3C] dark:text-[#c5a869] flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>Imsak va Bomdod vaqti farqi:</span>
        </div>
        <p className="leading-relaxed">
          Ehtiyot yuzasidan <strong>ogʻiz yopish (Imsak)</strong> vaqti Bomdod namozi kirishidan 10 daqiqa oldin belgilangan. Ogʻiz ochish esa Shom namozi azonining ayni vaqtiga toʻgʻri keladi.
        </p>
      </div>

      {/* Fasting Days List */}
      <div className="space-y-4">
        {SAMPLE_FASTING_DAYS.map((day) => {
          const isDone = journal.completedFasts.includes(day.date);

          return (
            <Card
              key={day.date}
              elevated
              className="p-6 space-y-5 border-stone-200/90 dark:border-[#c5a869]/30 bg-white dark:bg-[#0B1F1C]"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/80 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-[#c5a869]/20 text-[#9E7F3C] dark:text-[#c5a869] flex items-center justify-center font-bold text-xs">
                    📅
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                      {day.hijriDate}
                    </h3>
                    <p className="text-[11px] text-stone-500 font-mono-numbers">
                      Milodiy: {day.date}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono-numbers">
                  <div className="text-center">
                    <span className="text-[10px] text-stone-500 block uppercase">Ogʻiz Yopish (Imsak)</span>
                    <strong className="text-[#9E7F3C] dark:text-[#c5a869] text-sm">{day.imsakTime}</strong>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-stone-500 block uppercase">Ogʻiz Ochish (Iftor)</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 text-sm">{day.iftarTime}</strong>
                  </div>
                </div>
              </div>

              {/* Duas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-[#071614] border border-stone-200 dark:border-white/5 space-y-1.5">
                  <div className="font-bold text-[#9E7F3C] dark:text-[#c5a869]">Saharlik Niyati:</div>
                  <p dir="rtl" className="font-arabic text-sm text-right leading-loose text-stone-800 dark:text-stone-100">{day.suhoorDuaAr}</p>
                  <p className="italic text-stone-600 dark:text-stone-300">{day.suhoorDuaUz}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-[#071614] border border-stone-200 dark:border-white/5 space-y-1.5">
                  <div className="font-bold text-emerald-600 dark:text-emerald-400">Iftorlik Duosi:</div>
                  <p dir="rtl" className="font-arabic text-sm text-right leading-loose text-stone-800 dark:text-stone-100">{day.iftarDuaAr}</p>
                  <p className="italic text-stone-600 dark:text-stone-300">{day.iftarDuaUz}</p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-stone-500">
                  {isDone ? 'Ushbu kungi roʻza qayd etildi' : 'Roʻza tutgan boʻlsangiz tasdiqlang'}
                </span>
                <Button
                  size="sm"
                  variant={isDone ? 'outline' : 'emerald'}
                  onClick={() => handleToggleFast(day.date)}
                  className="min-h-[38px] text-xs font-bold"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  <span>{isDone ? 'Roʻza Tutildi (Bekor qilish)' : 'Roʻzani Qayd Qilish'}</span>
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
