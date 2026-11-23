import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import { SURAHS_LIST } from '../../../data/quranData';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import {
  BookOpen,
  CheckCircle2,
  Flame,
  RefreshCw,
  Search,
  Cloud,
  CloudOff,
  Clock,
  Award,
  Plus,
  Check,
  Calendar,
} from 'lucide-react';

interface MemorizedSurahEntry {
  surahNumber: number;
  memorizedAyahs: number;
  totalAyahs: number;
  stage: number; // Spaced repetition stage index into [1, 3, 7, 16, 35]
  lastReviewedAt: string;
  nextReviewAt: string;
}

interface IstiqomatHabitState {
  date: string;
  tilovat: boolean;
  hifz: boolean;
  murojaa: boolean;
  zikr: boolean;
  bomdod: boolean;
}

interface HifzIstiqomatStore {
  memorized: Record<number, MemorizedSurahEntry>;
  dailyHabits: Record<string, IstiqomatHabitState>;
  dailyGoalAyahs: number;
  streakDays: number;
  updatedAt: string;
}

const MUROJAA_INTERVALS_DAYS = [1, 3, 7, 16, 35];
const LOCAL_CACHE_KEY = 'asaka_ziyo_hifz_istiqomat_cache_v1';

function getTodayIso(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
}

function addDaysIso(baseIso: string, days: number): string {
  const dt = new Date(`${baseIso}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

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

function computeStreak(habits: Record<string, IstiqomatHabitState>): number {
  let streak = 0;
  const today = getTodayIso();
  for (let i = 0; i < 60; i++) {
    const dayKey = addDaysIso(today, -i);
    const entry = habits[dayKey];
    const completedAny =
      entry && (entry.tilovat || entry.hifz || entry.murojaa || entry.zikr || entry.bomdod);
    if (completedAny) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

const DEFAULT_STORE: HifzIstiqomatStore = {
  memorized: {},
  dailyHabits: {},
  dailyGoalAyahs: 5,
  streakDays: 0,
  updatedAt: new Date().toISOString(),
};

export const HifzIstiqomatView: React.FC = () => {
  const [userId] = useState<string>(() => getOrCreateUserId());
  const [activeSubTab, setActiveSubTab] = useState<'hifz' | 'murojaa' | 'istiqomat'>('hifz');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'memorized' | 'in_progress'>('all');
  const [store, setStore] = useState<HifzIstiqomatStore>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_CACHE_KEY);
      if (cached) return { ...DEFAULT_STORE, ...JSON.parse(cached) };
    } catch {
      // ignore
    }
    return DEFAULT_STORE;
  });
  const [syncStatus, setSyncStatus] = useState<'loading' | 'synced' | 'saving' | 'pending_offline'>('loading');
  const [syncError, setSyncError] = useState<string | null>(null);

  // Hydrate authoritative progress from Firestore via server endpoint
  useEffect(() => {
    let active = true;
    const loadFromFirestore = async () => {
      try {
        const res = await fetch(`/api/database/istiqomat?userId=${encodeURIComponent(userId)}`);
        if (!res.ok) throw new Error('Server bilan aloqa uzildi');
        const json = await res.json();
        if (!active) return;
        if (json?.success && json?.data) {
          const merged: HifzIstiqomatStore = {
            memorized: json.data.memorized || {},
            dailyHabits: json.data.dailyHabits || {},
            dailyGoalAyahs: Number(json.data.dailyGoalAyahs) || 5,
            streakDays: computeStreak(json.data.dailyHabits || {}),
            updatedAt: json.data.updatedAt || new Date().toISOString(),
          };
          setStore(merged);
          try {
            localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(merged));
          } catch {
            // ignore
          }
        }
        setSyncStatus('synced');
      } catch (err: any) {
        if (!active) return;
        setSyncStatus('pending_offline');
        setSyncError(err?.message || 'Oflayn keshdan oʻqildi');
      }
    };
    loadFromFirestore();
    return () => {
      active = false;
    };
  }, [userId]);

  const persistStore = useCallback(
    async (next: HifzIstiqomatStore) => {
      const normalized: HifzIstiqomatStore = {
        ...next,
        streakDays: computeStreak(next.dailyHabits),
        updatedAt: new Date().toISOString(),
      };
      setStore(normalized);
      try {
        localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(normalized));
      } catch {
        // ignore
      }
      setSyncStatus('saving');
      setSyncError(null);
      try {
        const res = await fetch('/api/database/istiqomat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, data: normalized }),
        });
        const json = await res.json();
        if (!res.ok || !json?.firestoreSynced) {
          throw new Error(json?.error || 'Firestore saqlash tasdiqlanmadi');
        }
        setSyncStatus('synced');
      } catch (err: any) {
        setSyncStatus('pending_offline');
        setSyncError(err?.message || 'Oʻzgarish oflayn keshda saqlandi, internet tiklanganda sinxronlanadi.');
      }
    },
    [userId]
  );

  const today = getTodayIso();
  const todayHabits: IstiqomatHabitState = store.dailyHabits[today] || {
    date: today,
    tilovat: false,
    hifz: false,
    murojaa: false,
    zikr: false,
    bomdod: false,
  };

  const stats = useMemo(() => {
    const entries = Object.values(store.memorized) as MemorizedSurahEntry[];
    const totalAyahsMemorized = entries.reduce((sum, e) => sum + Math.min(e.memorizedAyahs, e.totalAyahs), 0);
    const completedSurahs = entries.filter((e) => e.memorizedAyahs >= e.totalAyahs).length;
    const dueReviews = entries.filter((e) => e.memorizedAyahs > 0 && e.nextReviewAt <= today);
    const habitDoneCount = [
      todayHabits.tilovat,
      todayHabits.hifz,
      todayHabits.murojaa,
      todayHabits.zikr,
      todayHabits.bomdod,
    ].filter(Boolean).length;
    return {
      totalAyahsMemorized,
      completedSurahs,
      dueReviews,
      progressPct: Math.min(100, Math.round((totalAyahsMemorized / 6236) * 1000) / 10),
      habitDoneCount,
    };
  }, [store.memorized, today, todayHabits]);

  const filteredSurahs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return SURAHS_LIST.filter((s) => {
      const mem = store.memorized[s.number];
      if (filterMode === 'memorized' && !(mem && mem.memorizedAyahs >= s.numberOfAyahs)) return false;
      if (filterMode === 'in_progress' && !(mem && mem.memorizedAyahs > 0 && mem.memorizedAyahs < s.numberOfAyahs)) {
        return false;
      }
      if (!q) return true;
      return (
        s.nameUz.toLowerCase().includes(q) ||
        s.meaningUz.toLowerCase().includes(q) ||
        s.nameAr.includes(q) ||
        String(s.number) === q
      );
    });
  }, [searchQuery, filterMode, store.memorized]);

  const handleUpdateSurahProgress = (surahNumber: number, totalAyahs: number, deltaOrFull: number | 'full' | 'reset') => {
    const existing = store.memorized[surahNumber];
    let nextAyahs = existing?.memorizedAyahs || 0;
    if (deltaOrFull === 'full') nextAyahs = totalAyahs;
    else if (deltaOrFull === 'reset') nextAyahs = 0;
    else nextAyahs = Math.max(0, Math.min(totalAyahs, nextAyahs + deltaOrFull));

    const nextMemorized = { ...store.memorized };
    if (nextAyahs === 0) {
      delete nextMemorized[surahNumber];
    } else {
      const stage = existing?.stage ?? 0;
      nextMemorized[surahNumber] = {
        surahNumber,
        memorizedAyahs: nextAyahs,
        totalAyahs,
        stage,
        lastReviewedAt: today,
        nextReviewAt: addDaysIso(today, MUROJAA_INTERVALS_DAYS[Math.min(stage, MUROJAA_INTERVALS_DAYS.length - 1)]),
      };
    }

    const nextHabits = {
      ...store.dailyHabits,
      [today]: { ...todayHabits, hifz: nextAyahs > 0 ? true : todayHabits.hifz },
    };
    void persistStore({ ...store, memorized: nextMemorized, dailyHabits: nextHabits });
  };

  const handleCompleteMurojaa = (surahNumber: number) => {
    const existing = store.memorized[surahNumber];
    if (!existing) return;
    const nextStage = Math.min(existing.stage + 1, MUROJAA_INTERVALS_DAYS.length - 1);
    const nextDays = MUROJAA_INTERVALS_DAYS[nextStage];
    const nextMemorized = {
      ...store.memorized,
      [surahNumber]: {
        ...existing,
        stage: nextStage,
        lastReviewedAt: today,
        nextReviewAt: addDaysIso(today, nextDays),
      },
    };
    const nextHabits = {
      ...store.dailyHabits,
      [today]: { ...todayHabits, murojaa: true },
    };
    void persistStore({ ...store, memorized: nextMemorized, dailyHabits: nextHabits });
  };

  const handleToggleHabit = (field: keyof Omit<IstiqomatHabitState, 'date'>) => {
    const updatedDay: IstiqomatHabitState = {
      ...todayHabits,
      [field]: !todayHabits[field],
    };
    void persistStore({
      ...store,
      dailyHabits: { ...store.dailyHabits, [today]: updatedDay },
    });
  };

  const last14Days = useMemo(
    () => Array.from({ length: 14 }, (_, idx) => addDaysIso(today, -(13 - idx))),
    [today]
  );

  const ringRadius = 42;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - stats.habitDoneCount / 5);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-[#03170F] text-[#FFF8E8] border border-[#DFBD69]/35 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <p className="text-xs font-semibold tracking-widest uppercase text-[#DFBD69]">
              Qurʼon yodlash va doimiylik tizimi · 1 / 3 / 7 / 16 / 35 kunlik Murojaʼa
            </p>
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-balance">
              Hifz, Murojaʼa va Istiqomat Markazi
            </h1>
            <p className="text-sm sm:text-base text-[#E6DFCE]/85 leading-relaxed">
              114 sura boʻyicha yodlash rejangiz, ilmiy intervalli takrorlash jadvali va kundalik ruhiy intizom — barchasi Firebase Firestore asosiy bazasida saqlanadi.
            </p>
          </div>

          {/* Animated Daily Istiqomat Progress Ring */}
          <div className="flex items-center gap-5 shrink-0 bg-[#092E1F]/80 border border-[#DFBD69]/25 rounded-2xl p-4 sm:p-5">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={ringRadius} fill="none" stroke="rgba(223,189,105,0.18)" strokeWidth="8" />
                <motion.circle
                  cx="50"
                  cy="50"
                  r={ringRadius}
                  fill="none"
                  stroke="#DFBD69"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  animate={{ strokeDashoffset: ringOffset }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-extrabold tabular-nums text-[#FFF6C8]">
                  {stats.habitDoneCount}/5
                </span>
                <span className="text-[10px] text-[#9CB5AC]">Bugun</span>
              </div>
            </div>

            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2 text-[#DFBD69] font-bold">
                <Flame className="w-4 h-4" />
                <span className="tabular-nums">{store.streakDays} kunlik istiqomat</span>
              </div>
              <div className="text-xs text-[#E6DFCE]/80 tabular-nums">
                Yodlangan: <strong className="text-[#FFF8E8]">{stats.totalAyahsMemorized}</strong> / 6236 oyat ({stats.progressPct}%)
              </div>
              <div className="text-xs text-[#E6DFCE]/80 tabular-nums">
                Toʻliq suralar: <strong className="text-[#FFF8E8]">{stats.completedSurahs}</strong> / 114
              </div>
              <div className="flex items-center gap-1.5 text-xs pt-1">
                {syncStatus === 'synced' ? (
                  <>
                    <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Firestore bilan sinxronlangan</span>
                  </>
                ) : syncStatus === 'saving' || syncStatus === 'loading' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-[#DFBD69] animate-spin" />
                    <span className="text-[#DFBD69]">Sinxronlanmoqda...</span>
                  </>
                ) : (
                  <>
                    <CloudOff className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-amber-300">Oflayn kutilmoqda (Pending)</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        {syncError && (
          <p className="mt-3 text-xs text-amber-200/90 border-t border-[#DFBD69]/20 pt-2.5">
            {syncError}
          </p>
        )}
      </section>

      {/* Segmented Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#063D32]/15 dark:border-[#DFBD69]/20 pb-3">
        {[
          { id: 'hifz' as const, label: 'Hifz — 114 Sura', icon: <BookOpen className="w-4 h-4" /> },
          {
            id: 'murojaa' as const,
            label: `Murojaʼa navbati (${stats.dueReviews.length})`,
            icon: <Clock className="w-4 h-4" />,
          },
          { id: 'istiqomat' as const, label: 'Istiqomat kundaligi', icon: <Flame className="w-4 h-4" /> },
        ].map((tab) => {
          const active = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-[#063D32] text-[#FFF8E8] dark:bg-[#DFBD69] dark:text-[#010906] shadow-sm'
                  : 'text-[#1E3F35] dark:text-[#E6DFCE] hover:bg-[#063D32]/8 dark:hover:bg-white/5'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: HIFZ 114 SURAHS */}
      {activeSubTab === 'hifz' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#526B62] dark:text-[#9CB5AC] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sura nomi yoki raqami boʻyicha qidirish..."
                className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-xl bg-white dark:bg-[#041D13] border border-[#063D32]/15 dark:border-[#DFBD69]/25 text-sm text-[#03170F] dark:text-[#FFF8E8] focus:outline-none focus:border-[#DFBD69]"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-[#F1EBDD] dark:bg-[#041D13] p-1 rounded-xl">
              {[
                { id: 'all' as const, label: 'Barchasi (114)' },
                { id: 'in_progress' as const, label: 'Jarayonda' },
                { id: 'memorized' as const, label: 'Yodlangan' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterMode(f.id)}
                  className={`px-3 py-2 min-h-[38px] rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    filterMode === f.id
                      ? 'bg-white dark:bg-[#092E1F] text-[#03170F] dark:text-[#FFF6C8] shadow-xs'
                      : 'text-[#526B62] dark:text-[#9CB5AC]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredSurahs.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-sm text-[#526B62] dark:text-[#9CB5AC]">
                Tanlangan filtr boʻyicha sura topilmadi. Boshqa soʻrov kiriting yoki «Barchasi»ni tanlang.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredSurahs.map((surah) => {
                const mem = store.memorized[surah.number];
                const memorizedAyahs = mem?.memorizedAyahs || 0;
                const pct = Math.round((memorizedAyahs / surah.numberOfAyahs) * 100);
                const isDone = memorizedAyahs >= surah.numberOfAyahs;

                return (
                  <Card
                    key={surah.number}
                    className="p-5 flex flex-col justify-between gap-4 border border-[#063D32]/12 dark:border-[#DFBD69]/20"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-xs text-[#526B62] dark:text-[#9CB5AC] tabular-nums">
                          {surah.number}-sura · {surah.numberOfAyahs} oyat · {surah.revelationType}
                        </div>
                        <h3 className="text-base font-bold text-[#03170F] dark:text-[#FFF8E8]">
                          {surah.nameUz}
                        </h3>
                        <p className="text-xs text-[#526B62] dark:text-[#9CB5AC]">{surah.meaningUz}</p>
                      </div>
                      <span
                        className="font-arabic text-2xl text-[#063D32] dark:text-[#DFBD69] shrink-0"
                        dir="rtl"
                      >
                        {surah.nameAr}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs tabular-nums">
                        <span className="text-[#526B62] dark:text-[#9CB5AC]">
                          {memorizedAyahs} / {surah.numberOfAyahs} oyat
                        </span>
                        <span className={isDone ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'font-semibold'}>
                          {pct}%
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[#F1EBDD] dark:bg-[#092E1F] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#063D32] dark:bg-[#DFBD69] transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleUpdateSurahProgress(surah.number, surah.numberOfAyahs, 5)}
                        disabled={isDone}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl text-xs font-semibold bg-[#F1EBDD] dark:bg-[#092E1F] text-[#03170F] dark:text-[#FFF8E8] hover:bg-[#DFBD69]/25 disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+5 oyat</span>
                      </button>
                      <button
                        onClick={() =>
                          handleUpdateSurahProgress(
                            surah.number,
                            surah.numberOfAyahs,
                            isDone ? 'reset' : 'full'
                          )
                        }
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          isDone
                            ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                            : 'bg-[#063D32] dark:bg-[#DFBD69] text-[#FFF8E8] dark:text-[#010906] hover:brightness-105'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isDone ? 'Yodlangan' : 'Toʻliq yodladim'}</span>
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MUROJAA SPACED REPETITION */}
      {activeSubTab === 'murojaa' && (
        <div className="space-y-5">
          <Card className="p-6 border border-[#063D32]/12 dark:border-[#DFBD69]/20">
            <h2 className="text-lg font-bold text-[#03170F] dark:text-[#FFF8E8]">
              Aqlli Murojaʼa (1 · 3 · 7 · 16 · 35 kunlik takrorlash)
            </h2>
            <p className="text-sm text-[#526B62] dark:text-[#9CB5AC] mt-1">
              Yodlangan suralar unutilmasligi uchun har bir takrorlashdan soʻng keyingi interval avtomatik uzayadi.
            </p>
          </Card>

          {stats.dueReviews.length === 0 ? (
            <Card className="p-8 text-center space-y-3">
              <Award className="w-10 h-10 text-[#DFBD69] mx-auto" />
              <h3 className="text-base font-bold text-[#03170F] dark:text-[#FFF8E8]">
                Bugungi murojaʼa navbati boʻsh
              </h3>
              <p className="text-sm text-[#526B62] dark:text-[#9CB5AC] max-w-md mx-auto">
                Avval «Hifz — 114 Sura» boʻlimida yodlagan suralaringizni belgilang — ular avtomatik ravishda 1, 3, 7, 16 va 35 kunlik murojaʼa jadvaliga tushadi.
              </p>
              <Button onClick={() => setActiveSubTab('hifz')}>Suralarni belgilash</Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.dueReviews.map((entry) => {
                const surah = SURAHS_LIST.find((s) => s.number === entry.surahNumber);
                const nextInterval =
                  MUROJAA_INTERVALS_DAYS[Math.min(entry.stage + 1, MUROJAA_INTERVALS_DAYS.length - 1)];
                return (
                  <Card
                    key={entry.surahNumber}
                    className="p-5 flex items-center justify-between gap-4 border border-[#DFBD69]/35"
                  >
                    <div className="space-y-1">
                      <div className="text-xs text-[#8A6621] dark:text-[#DFBD69] font-semibold">
                        Bosqich {entry.stage + 1}/5 · Keyingi takrorlash: {nextInterval} kundan soʻng
                      </div>
                      <h3 className="text-base font-bold text-[#03170F] dark:text-[#FFF8E8]">
                        {entry.surahNumber}. {surah?.nameUz || `Sura ${entry.surahNumber}`} ({entry.memorizedAyahs} oyat)
                      </h3>
                      <p className="text-xs text-[#526B62] dark:text-[#9CB5AC] tabular-nums">
                        Oxirgi takrorlash: {entry.lastReviewedAt}
                      </p>
                    </div>
                    <Button onClick={() => handleCompleteMurojaa(entry.surahNumber)}>
                      Takrorladim
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ISTIQOMAT DAILY TRACKER */}
      {activeSubTab === 'istiqomat' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4 border border-[#063D32]/12 dark:border-[#DFBD69]/20">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#03170F] dark:text-[#FFF8E8]">
                Bugungi Istiqomat Rejasi
              </h2>
              <span className="text-xs text-[#526B62] dark:text-[#9CB5AC] tabular-nums">{today}</span>
            </div>

            <div className="divide-y divide-[#063D32]/10 dark:divide-[#DFBD69]/15">
              {[
                { key: 'bomdod' as const, title: 'Bomdod namozi va tonggi baraka', desc: 'Vaqti kirganda ado etish' },
                { key: 'tilovat' as const, title: 'Kunlik Qurʼon tilovati', desc: 'Kamida 1 sahifa yoki 10 oyat' },
                { key: 'hifz' as const, title: 'Yangi oyat yodlash (Hifz)', desc: `Kunlik maqsad: ${store.dailyGoalAyahs} oyat` },
                { key: 'murojaa' as const, title: 'Murojaʼa (Eski yodlanganlarni takrorlash)', desc: 'Kamida 15 daqiqa mustahkamlash' },
                { key: 'zikr' as const, title: 'Tonggi va kechki zikrlar', desc: 'Hisnul Muslim asosida zikr va duo' },
              ].map((item) => {
                const checked = todayHabits[item.key];
                return (
                  <button
                    key={item.key}
                    onClick={() => handleToggleHabit(item.key)}
                    className="w-full py-3.5 flex items-center justify-between gap-4 text-left cursor-pointer group min-h-[56px]"
                  >
                    <div>
                      <div className="text-sm font-semibold text-[#03170F] dark:text-[#FFF8E8] group-hover:text-[#063D32] dark:group-hover:text-[#DFBD69]">
                        {item.title}
                      </div>
                      <div className="text-xs text-[#526B62] dark:text-[#9CB5AC]">{item.desc}</div>
                    </div>
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-colors shrink-0 ${
                        checked
                          ? 'bg-[#063D32] dark:bg-[#DFBD69] border-transparent text-white dark:text-[#010906]'
                          : 'border-[#063D32]/30 dark:border-[#DFBD69]/40'
                      }`}
                    >
                      {checked && <CheckCircle2 className="w-4 h-4" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="p-6 space-y-5 border border-[#063D32]/12 dark:border-[#DFBD69]/20">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#DFBD69]" />
              <h2 className="text-lg font-bold text-[#03170F] dark:text-[#FFF8E8]">
                Oxirgi 14 Kunlik Doimiylik
              </h2>
            </div>

            <div className="grid grid-cols-7 gap-2.5">
              {last14Days.map((dayStr) => {
                const d = store.dailyHabits[dayStr];
                const score = d
                  ? [d.bomdod, d.tilovat, d.hifz, d.murojaa, d.zikr].filter(Boolean).length
                  : 0;
                const intensityClass =
                  score === 0
                    ? 'bg-[#F1EBDD] dark:bg-[#041D13] text-[#526B62] dark:text-[#9CB5AC]'
                    : score <= 2
                    ? 'bg-[#063D32]/30 dark:bg-[#DFBD69]/25 text-[#03170F] dark:text-[#FFF8E8]'
                    : score <= 4
                    ? 'bg-[#063D32]/70 dark:bg-[#DFBD69]/65 text-white dark:text-[#010906]'
                    : 'bg-[#063D32] dark:bg-[#DFBD69] text-white dark:text-[#010906] font-bold';
                return (
                  <div
                    key={dayStr}
                    title={`${dayStr}: ${score}/5 amal bajarilgan`}
                    className={`rounded-xl p-2.5 text-center border border-[#063D32]/10 dark:border-[#DFBD69]/15 ${intensityClass}`}
                  >
                    <div className="text-[10px] opacity-80 tabular-nums">{dayStr.slice(5)}</div>
                    <div className="text-sm font-bold mt-0.5 tabular-nums">{score}/5</div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[#063D32]/10 dark:border-[#DFBD69]/15 text-xs text-[#526B62] dark:text-[#9CB5AC] leading-relaxed">
              Rasululloh sollallohu alayhi vasallam: <em>«Allohga eng mahbub amal — oz boʻlsa ham davomli qilinganidir»</em> (Imom Buxoriy va Muslim rivoyati).
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
