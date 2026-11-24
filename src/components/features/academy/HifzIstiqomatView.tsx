import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SURAHS_LIST } from '../../../data/quranData';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { PageHero } from '../../ui/PageHero';
import {
  MorphingTabs,
  AnimatedProgressRing,
  InteractiveCounter,
  StaggerGrid,
  StaggerCard,
} from '../../ui/MotionPrimitives';
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

  return (
    <div className="space-y-8 pb-16">
      <PageHero
        variant="mushaf"
        kicker="Qurʼon Yodlash · 1 / 3 / 7 / 16 / 35 Kunlik Murojaʼa"
        title="Hifz, Murojaʼa va Istiqomat Markazi"
        subtitle="114 sura boʻyicha yodlash rejangiz, ilmiy intervalli takrorlash jadvali va kundalik ruhiy intizom — barchasi Firebase Firestore bazasida saqlanadi."
        aside={
          <div className="rounded-2xl bg-white/[0.06] border border-white/[0.12] p-4 sm:p-5 backdrop-blur-md flex items-center gap-4">
            <AnimatedProgressRing
              progress={(stats.habitDoneCount / 5) * 100}
              size={96}
              strokeWidth={7}
              trackClassName="stroke-white/12"
            >
              <span className="text-lg font-display font-extrabold font-mono-numbers text-[#F7F4EC]">
                {stats.habitDoneCount}/5
              </span>
              <span className="text-[10px] text-[#A4B9B1]">Bugun</span>
            </AnimatedProgressRing>

            <div className="space-y-1 text-xs min-w-0">
              <div className="flex items-center gap-1.5 text-[#C8A85E] font-bold">
                <Flame className="w-4 h-4 shrink-0" />
                <span className="font-mono-numbers">
                  <InteractiveCounter value={store.streakDays} /> kunlik istiqomat
                </span>
              </div>
              <div className="text-[#C2D4CD] font-mono-numbers">
                Yodlangan: <strong className="text-[#F7F4EC]">{stats.totalAyahsMemorized}</strong> / 6236 ({stats.progressPct}%)
              </div>
              <div className="text-[#C2D4CD] font-mono-numbers">
                Toʻliq suralar: <strong className="text-[#F7F4EC]">{stats.completedSurahs}</strong> / 114
              </div>
              <div className="flex items-center gap-1.5 pt-0.5">
                {syncStatus === 'synced' ? (
                  <>
                    <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Sinxronlangan</span>
                  </>
                ) : syncStatus === 'saving' || syncStatus === 'loading' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-[#C8A85E] animate-spin" />
                    <span className="text-[#C8A85E]">Sinxronlanmoqda...</span>
                  </>
                ) : (
                  <>
                    <CloudOff className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-amber-300">Oflayn kesh</span>
                  </>
                )}
              </div>
            </div>
          </div>
        }
      />

      {syncError && (
        <p className="text-xs text-amber-700 dark:text-amber-300 px-1">{syncError}</p>
      )}

      {/* Segmented Navigation Tabs */}
      <MorphingTabs
        items={[
          { id: 'hifz', label: 'Hifz — 114 Sura', icon: <BookOpen className="w-4 h-4" /> },
          {
            id: 'murojaa',
            label: 'Murojaʼa navbati',
            icon: <Clock className="w-4 h-4" />,
            count: stats.dueReviews.length,
          },
          { id: 'istiqomat', label: 'Istiqomat kundaligi', icon: <Flame className="w-4 h-4" /> },
        ]}
        activeId={activeSubTab}
        onChange={(id) => setActiveSubTab(id as 'hifz' | 'murojaa' | 'istiqomat')}
        layoutId="hifz-sub-tabs"
      />

      {/* TAB 1: HIFZ 114 SURAHS */}
      {activeSubTab === 'hifz' && (
        <div className="space-y-5">
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#587068] dark:text-[#9CAFA7] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sura nomi yoki raqami boʻyicha qidirish..."
                className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-2xl az-liquid-glass-pill text-sm text-[#091813] dark:text-[#F7F4EC] placeholder:text-[#6B827A] dark:placeholder:text-[#7E968D] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>

            <MorphingTabs
              items={[
                { id: 'all', label: 'Barchasi', count: 114 },
                { id: 'in_progress', label: 'Jarayonda' },
                { id: 'memorized', label: 'Yodlangan' },
              ]}
              activeId={filterMode}
              onChange={(id) => setFilterMode(id as 'all' | 'memorized' | 'in_progress')}
              layoutId="hifz-filter-tabs"
            />
          </div>

          {filteredSurahs.length === 0 ? (
            <Card className="p-10 text-center">
              <p className="text-sm text-[#587068] dark:text-[#9CAFA7]">
                Tanlangan filtr boʻyicha sura topilmadi. Boshqa soʻrov kiriting yoki «Barchasi»ni tanlang.
              </p>
            </Card>
          ) : (
            <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredSurahs.map((surah) => {
                const mem = store.memorized[surah.number];
                const memorizedAyahs = mem?.memorizedAyahs || 0;
                const pct = Math.round((memorizedAyahs / surah.numberOfAyahs) * 100);
                const isDone = memorizedAyahs >= surah.numberOfAyahs;

                return (
                  <StaggerCard key={surah.number}>
                    <Card elevated className="p-5 h-full flex flex-col justify-between gap-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-xs text-[#587068] dark:text-[#9CAFA7] font-mono-numbers">
                            {surah.number}-sura · {surah.numberOfAyahs} oyat · {surah.revelationType}
                          </div>
                          <h3 className="text-base font-display font-bold text-[#091813] dark:text-[#F7F4EC]">
                            {surah.nameUz}
                          </h3>
                          <p className="text-xs text-[#587068] dark:text-[#9CAFA7]">{surah.meaningUz}</p>
                        </div>
                        <span
                          className="font-arabic text-2xl text-[#064E3B] dark:text-[#C8A85E] shrink-0"
                          dir="rtl"
                        >
                          {surah.nameAr}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono-numbers">
                          <span className="text-[#587068] dark:text-[#9CAFA7]">
                            {memorizedAyahs} / {surah.numberOfAyahs} oyat
                          </span>
                          <span className={isDone ? 'text-[#064E3B] dark:text-[#34D399] font-bold' : 'font-semibold text-[#091813] dark:text-[#F7F4EC]'}>
                            {pct}%
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#C8A85E] to-[#10B981] transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateSurahProgress(surah.number, surah.numberOfAyahs, 5)}
                          disabled={isDone}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl text-xs font-semibold az-liquid-glass-pill text-[#091813] dark:text-[#F7F4EC] hover:border-emerald-500/40 disabled:opacity-40 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+5 oyat</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateSurahProgress(
                              surah.number,
                              surah.numberOfAyahs,
                              isDone ? 'reset' : 'full'
                            )
                          }
                          className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                            isDone
                              ? 'bg-[#064E3B] text-[#F7F4EC] hover:brightness-110'
                              : 'bg-[#064E3B] dark:bg-[#10B981] text-[#F7F4EC] dark:text-[#04120D] hover:brightness-105'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isDone ? 'Yodlangan' : 'Toʻliq yodladim'}</span>
                        </button>
                      </div>
                    </Card>
                  </StaggerCard>
                );
              })}
            </StaggerGrid>
          )}
        </div>
      )}

      {/* TAB 2: MUROJAA SPACED REPETITION */}
      {activeSubTab === 'murojaa' && (
        <div className="space-y-5">
          <Card className="p-6">
            <h2 className="text-lg font-display font-bold text-[#091813] dark:text-[#F7F4EC]">
              Aqlli Murojaʼa (1 · 3 · 7 · 16 · 35 kunlik takrorlash)
            </h2>
            <p className="text-sm text-[#587068] dark:text-[#9CAFA7] mt-1">
              Yodlangan suralar unutilmasligi uchun har bir takrorlashdan soʻng keyingi interval avtomatik uzayadi.
            </p>
          </Card>

          {stats.dueReviews.length === 0 ? (
            <Card elevated className="p-10 text-center space-y-3">
              <Award className="w-10 h-10 text-[#C8A85E] mx-auto" />
              <h3 className="text-base font-display font-bold text-[#091813] dark:text-[#F7F4EC]">
                Bugungi murojaʼa navbati boʻsh
              </h3>
              <p className="text-sm text-[#587068] dark:text-[#9CAFA7] max-w-md mx-auto">
                Avval «Hifz — 114 Sura» boʻlimida yodlagan suralaringizni belgilang — ular avtomatik ravishda 1, 3, 7, 16 va 35 kunlik murojaʼa jadvaliga tushadi.
              </p>
              <Button variant="emerald" onClick={() => setActiveSubTab('hifz')}>
                Suralarni belgilash
              </Button>
            </Card>
          ) : (
            <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.dueReviews.map((entry) => {
                const surah = SURAHS_LIST.find((s) => s.number === entry.surahNumber);
                const nextInterval =
                  MUROJAA_INTERVALS_DAYS[Math.min(entry.stage + 1, MUROJAA_INTERVALS_DAYS.length - 1)];
                return (
                  <StaggerCard key={entry.surahNumber}>
                    <Card elevated className="p-5 flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="text-xs text-[#8B6B2E] dark:text-[#C8A85E] font-semibold">
                          Bosqich {entry.stage + 1}/5 · Keyingi takrorlash: {nextInterval} kundan soʻng
                        </div>
                        <h3 className="text-base font-display font-bold text-[#091813] dark:text-[#F7F4EC]">
                          {entry.surahNumber}. {surah?.nameUz || `Sura ${entry.surahNumber}`} ({entry.memorizedAyahs} oyat)
                        </h3>
                        <p className="text-xs text-[#587068] dark:text-[#9CAFA7] font-mono-numbers">
                          Oxirgi takrorlash: {entry.lastReviewedAt}
                        </p>
                      </div>
                      <Button variant="emerald" onClick={() => handleCompleteMurojaa(entry.surahNumber)}>
                        Takrorladim
                      </Button>
                    </Card>
                  </StaggerCard>
                );
              })}
            </StaggerGrid>
          )}
        </div>
      )}

      {/* TAB 3: ISTIQOMAT DAILY TRACKER */}
      {activeSubTab === 'istiqomat' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card elevated className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-bold text-[#091813] dark:text-[#F7F4EC]">
                Bugungi Istiqomat Rejasi
              </h2>
              <span className="text-xs text-[#587068] dark:text-[#9CAFA7] font-mono-numbers">{today}</span>
            </div>

            <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
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
                    type="button"
                    onClick={() => handleToggleHabit(item.key)}
                    className="w-full py-3.5 flex items-center justify-between gap-4 text-left cursor-pointer group min-h-[56px]"
                  >
                    <div>
                      <div className="text-sm font-semibold text-[#091813] dark:text-[#F7F4EC] group-hover:text-[#064E3B] dark:group-hover:text-[#34D399]">
                        {item.title}
                      </div>
                      <div className="text-xs text-[#587068] dark:text-[#9CAFA7]">{item.desc}</div>
                    </div>
                    <span
                      className={`w-7 h-7 rounded-xl flex items-center justify-center border transition-colors shrink-0 ${
                        checked
                          ? 'bg-[#064E3B] dark:bg-[#10B981] border-transparent text-[#F7F4EC] dark:text-[#04120D]'
                          : 'border-black/20 dark:border-white/25'
                      }`}
                    >
                      {checked && <CheckCircle2 className="w-4 h-4" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card elevated className="p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#C8A85E]" />
              <h2 className="text-lg font-display font-bold text-[#091813] dark:text-[#F7F4EC]">
                Oxirgi 14 Kunlik Doimiylik
              </h2>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {last14Days.map((dayStr) => {
                const d = store.dailyHabits[dayStr];
                const score = d
                  ? [d.bomdod, d.tilovat, d.hifz, d.murojaa, d.zikr].filter(Boolean).length
                  : 0;
                const intensityClass =
                  score === 0
                    ? 'bg-black/[0.04] dark:bg-white/[0.05] text-[#587068] dark:text-[#9CAFA7]'
                    : score <= 2
                    ? 'bg-emerald-500/20 text-[#064E3B] dark:text-[#F7F4EC]'
                    : score <= 4
                    ? 'bg-emerald-600/75 text-white'
                    : 'bg-[#064E3B] dark:bg-[#10B981] text-[#F7F4EC] dark:text-[#04120D] font-bold';
                return (
                  <div
                    key={dayStr}
                    title={`${dayStr}: ${score}/5 amal bajarilgan`}
                    className={`rounded-xl p-2.5 text-center ${intensityClass}`}
                  >
                    <div className="text-[10px] opacity-80 font-mono-numbers">{dayStr.slice(5)}</div>
                    <div className="text-sm font-bold mt-0.5 font-mono-numbers">{score}/5</div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.08] text-xs text-[#587068] dark:text-[#9CAFA7] leading-relaxed">
              Rasululloh sollallohu alayhi vasallam: <em>«Allohga eng mahbub amal — oz boʻlsa ham davomli qilinganidir»</em> (Imom Buxoriy va Muslim rivoyati).
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
