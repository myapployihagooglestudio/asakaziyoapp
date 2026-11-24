import React, { useState, useEffect } from 'react';
import { DailyPrayerRecord, PrayerKey, PrayerStatus } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { PageHero } from '../../ui/PageHero';
import {
  AnimatedProgressRing,
  ArchitecturalDivider,
  ScrollReveal,
} from '../../ui/MotionPrimitives';
import {
  getStoredPrayerRecords,
  saveStoredPrayerRecord,
} from '../../../utils/databaseService';
import {
  CheckCircle2,
  XCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react';

const PRAYER_KEYS: { key: PrayerKey; nameUz: string; nameAr: string }[] = [
  { key: 'bomdod', nameUz: 'Bomdod', nameAr: 'الفَجْر' },
  { key: 'peshin', nameUz: 'Peshin', nameAr: 'الظُّهْر' },
  { key: 'asr', nameUz: 'Asr', nameAr: 'العَصْر' },
  { key: 'shom', nameUz: 'Shom', nameAr: 'المَغْرِب' },
  { key: 'xufton', nameUz: 'Xufton', nameAr: 'العِشَاء' },
];

export const PrayerJournalView: React.FC = () => {
  const userId = 'asaka_user_current';

  const [selectedDate, setSelectedDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [records, setRecords] = useState<Record<string, DailyPrayerRecord>>(() =>
    getStoredPrayerRecords(userId)
  );
  const [notes, setNotes] = useState<string>('');
  const [savedNotice, setSavedNotice] = useState(false);

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
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1800);
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
  const progressPercent = Math.round((completedTodayCount / 5) * 100);

  return (
    <div className="max-w-5xl mx-auto pb-16 space-y-8">
      <PageHero
        variant="sanctuary"
        kicker="Shaxsiy · Maxfiy Ibodat Kundaligi"
        title="Namoz Kundaligi"
        subtitle="Besh vaqt farz namozlaringizni shaxsiy intizom bilan qayd qilib boring. Maʼlumotlar faqat qurilmangizda va shaxsiy profilingizda saqlanadi."
        aside={
          <div className="flex items-center justify-center lg:justify-end">
            <AnimatedProgressRing
              progress={progressPercent}
              size={140}
              strokeWidth={8}
              trackClassName="stroke-white/12"
            >
              <div className="text-2xl font-display font-extrabold font-mono-numbers text-[#F7F4EC]">
                {completedTodayCount}/5
              </div>
              <div className="text-[11px] text-[#A4B9B1]">Kunlik ado</div>
            </AnimatedProgressRing>
          </div>
        }
      />

      <ScrollReveal>
        <Card elevated className="p-6 sm:p-8 space-y-6">
          {/* Date navigation */}
          <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
            <button
              type="button"
              onClick={handlePrevDay}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-bold az-liquid-glass-pill text-[#091813] dark:text-[#F7F4EC] hover:border-emerald-500/40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Oldingi kun</span>
            </button>

            <div className="text-center">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8B6B2E] dark:text-[#C8A85E] block">
                Tanlangan sana
              </span>
              <div className="text-base sm:text-lg font-display font-bold font-mono-numbers text-[#091813] dark:text-[#F7F4EC]">
                {selectedDate}
              </div>
            </div>

            <button
              type="button"
              onClick={handleNextDay}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-bold az-liquid-glass-pill text-[#091813] dark:text-[#F7F4EC] hover:border-emerald-500/40 cursor-pointer"
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
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl az-neumorphic-raised border border-black/[0.05] dark:border-white/[0.07] transition-all"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm font-arabic shrink-0 ${
                        currentStatus === 'completed'
                          ? 'bg-emerald-500/18 text-[#064E3B] dark:text-[#34D399] border border-emerald-500/35'
                          : currentStatus === 'missed'
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                          : 'bg-black/[0.04] dark:bg-white/[0.06] text-[#587068] dark:text-[#9CAFA7]'
                      }`}
                    >
                      {p.nameAr.slice(0, 3)}
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-[#091813] dark:text-[#F7F4EC]">
                        {p.nameUz} namozi
                      </h3>
                      <p className="text-xs text-[#587068] dark:text-[#9CAFA7]">
                        {currentStatus === 'completed'
                          ? 'Ado etildi'
                          : currentStatus === 'missed'
                          ? 'Qazo boʻldi'
                          : 'Qayd qilinmagan'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(p.key, 'completed')}
                      className={`px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                        currentStatus === 'completed'
                          ? 'bg-[#064E3B] dark:bg-[#10B981] text-[#F7F4EC] dark:text-[#04120D] shadow-sm'
                          : 'az-liquid-glass-pill text-[#3B554D] dark:text-[#C2D4CD] hover:border-emerald-500/40'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Oʻqildi</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(p.key, 'missed')}
                      className={`px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                        currentStatus === 'missed'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'az-liquid-glass-pill text-[#3B554D] dark:text-[#C2D4CD] hover:border-rose-500/40'
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
          <div className="p-4 rounded-2xl bg-[#F4EFE3]/70 dark:bg-[#050E0B]/80 border border-black/[0.06] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[#587068] dark:text-[#9CAFA7]">Kunlik natija:</span>
              <span className="font-bold text-[#091813] dark:text-[#F7F4EC] font-mono-numbers">
                {completedTodayCount} / 5 namoz ado etildi
              </span>
            </div>
            <span
              className={`font-bold ${
                completedTodayCount === 5
                  ? 'text-[#064E3B] dark:text-[#34D399]'
                  : 'text-[#587068] dark:text-[#9CAFA7]'
              }`}
            >
              {completedTodayCount === 5
                ? 'Alhamdulillah, toʻliq ado etildi!'
                : 'Ibodatda sobitqadam boʻlaylik'}
            </span>
          </div>

          <ArchitecturalDivider />

          {/* Personal Notes */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-[0.12em] text-[#3B554D] dark:text-[#A4B9B1] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#C8A85E]" />
              <span>Kungi shaxsiy qaydlar va xotiralar</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Bugungi jamoat namozi, ruhiy kechinmalar yoki qazo niyatlari haqida qayd qoldiring..."
              rows={3}
              className="w-full p-3.5 text-sm rounded-2xl az-liquid-glass-pill text-[#091813] dark:text-[#F7F4EC] placeholder:text-[#6B827A] dark:placeholder:text-[#7E968D] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
            <div className="flex justify-end">
              <Button size="sm" variant="emerald" onClick={handleSaveNotes}>
                {savedNotice ? (
                  <>
                    <Check className="w-4 h-4 mr-1.5" />
                    <span>Saqlandi</span>
                  </>
                ) : (
                  <span>Qaydni saqlash</span>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </ScrollReveal>
    </div>
  );
};
