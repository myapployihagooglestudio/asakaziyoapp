import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DailyPrayerRecord, PrayerKey, PrayerStatus } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { IslamicHairlineDivider, IslamicStarEmblem } from '../../ui/GeometricPattern';
import {
  getStoredPrayerRecords,
  saveStoredPrayerRecord,
} from '../../../utils/databaseService';
import {
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  HelpCircle,
  TrendingUp,
  FileText,
  Lock,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';

const PRAYER_KEYS: { key: PrayerKey; nameUz: string; nameAr: string }[] = [
  { key: 'bomdod', nameUz: 'Bomdod', nameAr: 'الفَجْر' },
  { key: 'peshin', nameUz: 'Peshin', nameAr: 'الظُّهْر' },
  { key: 'asr', nameUz: 'Asr', nameAr: 'العَصْر' },
  { key: 'shom', nameUz: 'Shom', nameAr: 'المَغْرِب' },
  { key: 'xufton', nameUz: 'Xufton', nameAr: 'العِشَاء' },
];

export const PrayerJournalView: React.FC = () => {
  const { t } = useTranslation();
  const userId = 'asaka_user_current';

  const [selectedDate, setSelectedDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [records, setRecords] = useState<Record<string, DailyPrayerRecord>>(() =>
    getStoredPrayerRecords(userId)
  );
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    const data = getStoredPrayerRecords(userId);
    setRecords(data);
    if (data[selectedDate]?.notes) {
      setNotes(data[selectedDate].notes || '');
    } else {
      setNotes('');
    }
  }, [selectedDate]);

  const currentRecord: DailyPrayerRecord = records[selectedDate] || {
    date: selectedDate,
    userId,
    prayers: {
      bomdod: { status: 'not_recorded' },
      peshin: { status: 'not_recorded' },
      asr: { status: 'not_recorded' },
      shom: { status: 'not_recorded' },
      xufton: { status: 'not_recorded' },
      tahajjud: { status: 'not_recorded' },
      subh: { status: 'not_recorded' },
      quyosh: { status: 'not_recorded' },
    },
    dailyGoalMet: false,
    updatedAt: new Date().toISOString(),
  };

  const handleUpdateStatus = (key: PrayerKey, status: PrayerStatus) => {
    const updatedPrayers = {
      ...currentRecord.prayers,
      [key]: {
        status,
        loggedAt: new Date().toISOString(),
      },
    };

    const completedCount = PRAYER_KEYS.filter(
      (p) => updatedPrayers[p.key]?.status === 'completed'
    ).length;

    const updated: DailyPrayerRecord = {
      ...currentRecord,
      date: selectedDate,
      userId,
      prayers: updatedPrayers,
      notes,
      dailyGoalMet: completedCount === 5,
      updatedAt: new Date().toISOString(),
    };

    saveStoredPrayerRecord(updated);
    setRecords({ ...records, [selectedDate]: updated });
  };

  const handleSaveNotes = () => {
    const updated: DailyPrayerRecord = {
      ...currentRecord,
      notes,
      updatedAt: new Date().toISOString(),
    };
    saveStoredPrayerRecord(updated);
    setRecords({ ...records, [selectedDate]: updated });
  };

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const completedTodayCount = PRAYER_KEYS.filter(
    (p) => currentRecord.prayers[p.key]?.status === 'completed'
  ).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-in fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#064e3b] via-[#052b22] to-[#041d18] border border-[#c5a869]/30 p-6 sm:p-8 text-white shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#d4af37]">
            <Lock className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>Shaxsiy & Maxfiy Ibodat Kundaligi</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-white">
            Namoz Kundaligi (Prayer Journal)
          </h1>
          <p className="text-xs sm:text-sm text-stone-200 leading-relaxed max-w-xl">
            Besh vaqt farz namozlaringizni shaxsiy intizom bilan qayd qilib boring. Bu maʼlumotlar toʻliq maxfiy boʻlib, faqat oʻzingizga tegishlidir.
          </p>
        </div>
      </div>

      {/* Date Navigation & Today's Summary */}
      <Card elevated className="p-6 space-y-6 border-stone-200/90 dark:border-[#c5a869]/30 bg-white dark:bg-[#0B1F1C]">
        <div className="flex items-center justify-between border-b border-stone-200/80 dark:border-white/10 pb-4">
          <button
            onClick={handlePrevDay}
            className="flex items-center gap-1 px-3 py-2 min-h-[38px] rounded-lg text-xs font-bold border border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Oldingi kun</span>
          </button>

          <div className="text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#9E7F3C] dark:text-[#c5a869]">
              Tanlangan Sana
            </span>
            <div className="text-base sm:text-lg font-bold font-mono-numbers text-stone-900 dark:text-white">
              {selectedDate}
            </div>
          </div>

          <button
            onClick={handleNextDay}
            className="flex items-center gap-1 px-3 py-2 min-h-[38px] rounded-lg text-xs font-bold border border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5 cursor-pointer"
          >
            <span>Keyingi kun</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 5 Daily Prayers Checklist */}
        <div className="space-y-3">
          {PRAYER_KEYS.map((p) => {
            const currentStatus = currentRecord.prayers[p.key]?.status || 'not_recorded';
            return (
              <div
                key={p.key}
                className="flex items-center justify-between p-4 rounded-2xl border border-stone-200/90 dark:border-emerald-950/80 bg-[#F3EFE6]/40 dark:bg-[#071614] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm font-arabic ${
                      currentStatus === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : currentStatus === 'missed'
                        ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                        : 'bg-stone-100 dark:bg-white/5 text-stone-400'
                    }`}
                  >
                    {p.nameAr.slice(0, 3)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                      {p.nameUz} namozi
                    </h3>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      Holat: {currentStatus === 'completed' ? 'Oʻqildi' : currentStatus === 'missed' ? 'Qazo boʻldi' : 'Qayd qilinmagan'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateStatus(p.key, 'completed')}
                    className={`px-3 py-2 min-h-[38px] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      currentStatus === 'completed'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-stone-100 dark:bg-white/5 text-stone-700 dark:text-stone-300 hover:bg-emerald-500/10'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Oʻqildi</span>
                  </button>

                  <button
                    onClick={() => handleUpdateStatus(p.key, 'missed')}
                    className={`px-3 py-2 min-h-[38px] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      currentStatus === 'missed'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-stone-100 dark:bg-white/5 text-stone-700 dark:text-stone-300 hover:bg-rose-500/10'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Qazo</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Daily Summary */}
        <div className="p-4 rounded-2xl bg-stone-50 dark:bg-[#071614] border border-stone-200/80 dark:border-[#c5a869]/20 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-stone-600 dark:text-stone-400">Kunlik natija:</span>
            <span className="font-bold text-stone-900 dark:text-white font-mono-numbers">
              {completedTodayCount} / 5 namoz ado etildi
            </span>
          </div>
          {completedTodayCount === 5 ? (
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">
              Alhamdulillah, toʻliq ado etildi!
            </span>
          ) : (
            <span className="text-stone-500">Ibodatda sobitqadam boʻlaylik</span>
          )}
        </div>

        <IslamicHairlineDivider />

        {/* Personal Notes */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-[#9E7F3C] dark:text-[#c5a869]" />
            <span>Kungi Shaxsiy Qaydlar & Xotiralar:</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Bugungi jamoat namozi, ruhiy kechinmalar yoki qazo niyatlari haqida qayd qoldiring..."
            rows={3}
            className="w-full p-3 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614] text-stone-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#c5a869]"
          />
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={handleSaveNotes} className="min-h-[38px] text-xs">
              Qaydni Saqlash
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
