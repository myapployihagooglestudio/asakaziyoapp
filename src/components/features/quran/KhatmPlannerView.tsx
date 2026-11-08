import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { KhatmPlan, KhatmDurationType } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { IslamicHairlineDivider, IslamicStarEmblem } from '../../ui/GeometricPattern';
import {
  createInitialKhatmPlan,
  recordKhatmReading,
  TOTAL_MUSHAF_PAGES,
  TOTAL_MUSHAF_JUZ,
} from '../../../utils/khatmPlanner';
import {
  getStoredKhatmPlans,
  saveStoredKhatmPlan,
  deleteStoredKhatmPlan,
} from '../../../utils/databaseService';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  TrendingUp,
  RotateCcw,
  Plus,
  Play,
  Pause,
  Bell,
  Award,
} from 'lucide-react';

export const KhatmPlannerView: React.FC = () => {
  const { t } = useTranslation();
  const userId = 'asaka_user_current';

  const [plans, setPlans] = useState<KhatmPlan[]>(() => getStoredKhatmPlans(userId));
  const [activePlan, setActivePlan] = useState<KhatmPlan | null>(() => {
    const list = getStoredKhatmPlans(userId);
    return list[0] || null;
  });

  const [selectedDuration, setSelectedDuration] = useState<KhatmDurationType>('30_days');
  const [customDays, setCustomDays] = useState<number>(45);
  const [pagesInput, setPagesInput] = useState<number>(1);
  const [showNewPlanModal, setShowNewPlanModal] = useState<boolean>(false);

  useEffect(() => {
    const list = getStoredKhatmPlans(userId);
    setPlans(list);
    if (!activePlan && list.length > 0) {
      setActivePlan(list[0]);
    }
  }, []);

  const handleCreatePlan = () => {
    const newPlan = createInitialKhatmPlan(userId, selectedDuration, customDays);
    saveStoredKhatmPlan(newPlan);
    setPlans([newPlan, ...plans]);
    setActivePlan(newPlan);
    setShowNewPlanModal(false);
  };

  const handleLogPages = (amount: number) => {
    if (!activePlan) return;
    const updated = recordKhatmReading(activePlan, amount);
    saveStoredKhatmPlan(updated);
    setActivePlan(updated);
    setPlans(plans.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleTogglePause = () => {
    if (!activePlan) return;
    const nextStatus: 'active' | 'paused' = activePlan.status === 'paused' ? 'active' : 'paused';
    const updated: KhatmPlan = { ...activePlan, status: nextStatus, updatedAt: new Date().toISOString() };
    saveStoredKhatmPlan(updated);
    setActivePlan(updated);
  };

  const percent = activePlan
    ? Math.min(100, Math.round((activePlan.completedPages / activePlan.totalPages) * 100))
    : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-in fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-[#064e3b] to-[#041d18] border border-[#c5a869]/30 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#d4af37]">
              <IslamicStarEmblem size={14} className="text-[#d4af37]" />
              <span>Qurʼoni Karim Xatmi Rejalashtiruvchisi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-white">
              Xatm Rejasi & Kundalik Mutolaa
            </h1>
            <p className="text-xs sm:text-sm text-stone-200 leading-relaxed">
              Madinai Munavvara mushafining 604 sahifalik asl tuzilishi asosida kunlik oʻqish meʼyorini belgilang va yakuniy xatmga yeting.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNewPlanModal(true)}
              className="border-[#c5a869] text-[#c5a869] hover:bg-[#c5a869]/10 cursor-pointer min-h-[44px]"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Yangi Reja Olish</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Plan Overview or Empty State */}
      {activePlan ? (
        <div className="space-y-6">
          {/* Active Plan Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Col 1 & 2: Progress & Daily Card */}
            <div className="lg:col-span-2 space-y-6">
              <Card elevated className="p-6 sm:p-8 space-y-6 border-stone-200/90 dark:border-[#c5a869]/30 bg-white dark:bg-[#0B1F1C]">
                <div className="flex items-center justify-between border-b border-stone-200/80 dark:border-white/10 pb-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#9E7F3C] dark:text-[#c5a869]">
                      Amaldagi Xatm
                    </span>
                    <h2 className="text-xl font-bold text-stone-900 dark:text-white">
                      {activePlan.title}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        activePlan.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : activePlan.status === 'paused'
                          ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                          : 'bg-[#c5a869]/15 text-[#9E7F3C] dark:text-[#c5a869] border border-[#c5a869]/30'
                      }`}
                    >
                      {activePlan.status === 'completed'
                        ? 'Xatm Qilindi'
                        : activePlan.status === 'paused'
                        ? 'Toʻxtatilgan'
                        : 'Faol Mutolaa'}
                    </span>
                    <button
                      onClick={handleTogglePause}
                      className="p-2 rounded-lg border border-stone-200 dark:border-white/10 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5 cursor-pointer"
                      title={activePlan.status === 'paused' ? 'Davom ettirish' : 'Vaqtincha toʻxtatish'}
                    >
                      {activePlan.status === 'paused' ? (
                        <Play className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Pause className="w-4 h-4 text-amber-500" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Progress Bar & Stats */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-stone-600 dark:text-stone-400">Umumiy xatm foizi:</span>
                    <span className="font-bold font-mono-numbers text-stone-900 dark:text-[#c5a869]">
                      {percent}% ({activePlan.completedPages} / 604 sahifa)
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-stone-100 dark:bg-emerald-950/80 overflow-hidden border border-stone-200 dark:border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-[#c5a869] to-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* 3 Metrics Grid */}
                <div className="grid grid-cols-3 gap-3 pt-2 text-center">
                  <div className="p-3.5 rounded-xl bg-[#F3EFE6]/60 dark:bg-[#071614] border border-stone-200/80 dark:border-emerald-950/80">
                    <div className="text-[11px] text-stone-500 dark:text-stone-400">Kunlik Target</div>
                    <div className="text-lg font-bold font-mono-numbers text-[#9E7F3C] dark:text-[#c5a869] mt-0.5">
                      {activePlan.pagesPerDay} sahifa
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F3EFE6]/60 dark:bg-[#071614] border border-stone-200/80 dark:border-emerald-950/80">
                    <div className="text-[11px] text-stone-500 dark:text-stone-400">Oʻqilgan Poralar</div>
                    <div className="text-lg font-bold font-mono-numbers text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {activePlan.completedJuz.length} / 30 juz
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F3EFE6]/60 dark:bg-[#071614] border border-stone-200/80 dark:border-emerald-950/80">
                    <div className="text-[11px] text-stone-500 dark:text-stone-400">Tugash Sanasi</div>
                    <div className="text-xs font-bold font-mono-numbers text-stone-700 dark:text-stone-300 mt-1">
                      {activePlan.targetEndDate}
                    </div>
                  </div>
                </div>

                <IslamicHairlineDivider />

                {/* Quick Log Action */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                    Bugun Oʻqilgan Sahifalarni Qayd Qilish:
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    {[1, 2, 5, 10, 20].map((num) => (
                      <button
                        key={num}
                        onClick={() => handleLogPages(num)}
                        className="px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-bold border border-stone-200 dark:border-[#c5a869]/30 bg-stone-50 dark:bg-emerald-950/40 text-stone-800 dark:text-stone-200 hover:bg-[#c5a869] hover:text-black transition-all cursor-pointer"
                      >
                        +{num} sahifa
                      </button>
                    ))}
                    <div className="flex items-center gap-1.5 ml-auto">
                      <input
                        type="number"
                        min="1"
                        max="604"
                        value={pagesInput}
                        onChange={(e) => setPagesInput(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 p-2 text-center text-xs font-bold rounded-lg border border-stone-300 dark:border-emerald-800 bg-white dark:bg-[#071614]"
                      />
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleLogPages(pagesInput)}
                        className="min-h-[38px] text-xs"
                      >
                        Qoʻshish
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Col 3: 30 Juz Visual Matrix */}
            <div className="space-y-4">
              <Card elevated className="p-5 space-y-4 border-stone-200/90 dark:border-[#c5a869]/30 bg-white dark:bg-[#0B1F1C]">
                <div className="flex items-center justify-between border-b border-stone-200/80 dark:border-white/10 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-white flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#9E7F3C] dark:text-[#c5a869]" />
                    <span>30 Juz Xaritasi</span>
                  </h3>
                  <span className="text-[11px] font-mono-numbers text-stone-500 dark:text-stone-400">
                    {activePlan.completedJuz.length} / 30
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 30 }, (_, i) => i + 1).map((juzNum) => {
                    const isDone = activePlan.completedJuz.includes(juzNum);
                    return (
                      <div
                        key={juzNum}
                        className={`p-2 rounded-xl text-center text-xs font-bold font-mono-numbers transition-all ${
                          isDone
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-stone-100 dark:bg-emerald-950/40 text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-white/5'
                        }`}
                        title={`${juzNum}-pora`}
                      >
                        {juzNum}
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Islamic Reminder Note */}
              <div className="p-4 rounded-2xl bg-[#F3EFE6]/70 dark:bg-[#071614] border border-stone-200/80 dark:border-[#c5a869]/20 text-xs text-stone-700 dark:text-stone-300 space-y-1.5">
                <div className="font-bold text-[#9E7F3C] dark:text-[#c5a869] flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5" />
                  <span>Xatm Fazilati:</span>
                </div>
                <p className="italic leading-relaxed">
                  «Kim Allohning Kitobidan bir harf oʻqisa, unga bir savob berilur va u oʻn barobar koʻpaytirilur...» (Termiziy rivoyati)
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Card className="p-12 text-center space-y-4 border-stone-200/90 dark:border-[#c5a869]/30 bg-white dark:bg-[#0B1F1C]">
          <div className="w-16 h-16 rounded-2xl bg-[#c5a869]/15 text-[#9E7F3C] dark:text-[#c5a869] mx-auto flex items-center justify-center">
            <BookOpen className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-white">
            Faol Xatm Rejasi Mavjud Emas
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 max-w-md mx-auto">
            30, 60 yoki 90 kunlik xatm rejasini boshlang va Qurʼoni Karim tilovatini muntazam odatga aylantiring.
          </p>
          <Button variant="emerald" onClick={() => setShowNewPlanModal(true)} className="min-h-[44px]">
            Birinchi Rejani Yaratish
          </Button>
        </Card>
      )}

      {/* New Plan Selection Modal */}
      {showNewPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0B1F1C] border border-stone-200 dark:border-[#c5a869]/30 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-white/10 pb-3">
              <h3 className="text-lg font-bold text-stone-900 dark:text-white">
                Yangi Xatm Rejasini Tanlang
              </h3>
              <button
                onClick={() => setShowNewPlanModal(false)}
                className="text-stone-400 hover:text-stone-100 text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {[
                { id: '30_days', label: '30 Kunlik Xatm', sub: 'Kuniga ~20 sahifa (1 juz)' },
                { id: '60_days', label: '60 Kunlik Xatm', sub: 'Kuniga ~10 sahifa (yarim juz)' },
                { id: '90_days', label: '90 Kunlik Xatm', sub: 'Kuniga ~7 sahifa' },
                { id: 'custom', label: 'Moslashuvchan (Custom)', sub: 'Oʻzingiz belgilagan kunlar' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedDuration(opt.id as KhatmDurationType)}
                  className={`w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedDuration === opt.id
                      ? 'border-[#c5a869] bg-[#c5a869]/10 text-stone-900 dark:text-white'
                      : 'border-stone-200 dark:border-emerald-950 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <div className="font-bold text-xs">{opt.label}</div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400">{opt.sub}</div>
                </button>
              ))}

              {selectedDuration === 'custom' && (
                <div className="p-3 rounded-xl bg-stone-50 dark:bg-[#071614] border border-stone-200 dark:border-white/5 space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Kunlar sonini kiriting:
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="365"
                    value={customDays}
                    onChange={(e) => setCustomDays(parseInt(e.target.value) || 45)}
                    className="w-full p-2 text-xs rounded-lg border border-stone-300 dark:border-emerald-800 bg-white dark:bg-[#0B1F1C]"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-200 dark:border-white/10">
              <Button variant="outline" size="sm" onClick={() => setShowNewPlanModal(false)}>
                Bekor qilish
              </Button>
              <Button variant="emerald" size="sm" onClick={handleCreatePlan}>
                Rejani Boshlash
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
