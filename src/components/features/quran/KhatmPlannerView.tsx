import React, { useState, useEffect } from 'react';
import { KhatmPlan, KhatmDurationType } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { PageHero } from '../../ui/PageHero';
import {
  AnimatedProgressRing,
  ArchitecturalDivider,
  InteractiveCounter,
  SpatialTiltCard,
} from '../../ui/MotionPrimitives';
import {
  createInitialKhatmPlan,
  recordKhatmReading,
} from '../../../utils/khatmPlanner';
import {
  getStoredKhatmPlans,
  saveStoredKhatmPlan,
} from '../../../utils/databaseService';
import {
  BookOpen,
  Plus,
  Play,
  Pause,
  Award,
} from 'lucide-react';

export const KhatmPlannerView: React.FC = () => {
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
    <div className="max-w-5xl mx-auto pb-16 space-y-8">
      <PageHero
        variant="mushaf"
        kicker="Qurʼoni Karim · 604 Sahifa · 30 Juz"
        title="Xatm Rejasi va Kundalik Mutolaa"
        subtitle="Madinai Munavvara mushafining 604 sahifalik asl tuzilishi asosida kunlik oʻqish meʼyorini belgilang va yakuniy xatmga yeting."
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowNewPlanModal(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Yangi reja olish</span>
          </Button>
        }
        aside={
          activePlan ? (
            <div className="flex items-center justify-center lg:justify-end">
              <AnimatedProgressRing
                progress={percent}
                size={148}
                strokeWidth={8}
                trackClassName="stroke-white/12"
              >
                <div className="text-2xl font-display font-extrabold font-mono-numbers text-[#F7F4EC]">
                  {percent}%
                </div>
                <div className="text-[11px] text-[#A4B9B1] font-mono-numbers">
                  {activePlan.completedPages} / 604
                </div>
              </AnimatedProgressRing>
            </div>
          ) : undefined
        }
      />

      {activePlan ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Col 1 & 2: Progress & Daily Card */}
          <div className="lg:col-span-8 space-y-6">
            <Card elevated className="p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8B6B2E] dark:text-[#C8A85E]">
                    Amaldagi xatm
                  </span>
                  <h2 className="text-xl font-display font-bold text-[#091813] dark:text-[#F7F4EC]">
                    {activePlan.title}
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-bold ${
                      activePlan.status === 'completed'
                        ? 'text-[#064E3B] dark:text-[#34D399]'
                        : activePlan.status === 'paused'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-[#8B6B2E] dark:text-[#C8A85E]'
                    }`}
                  >
                    {activePlan.status === 'completed'
                      ? 'Xatm yakunlandi'
                      : activePlan.status === 'paused'
                      ? 'Vaqtincha toʻxtatilgan'
                      : 'Faol mutolaa'}
                  </span>
                  <button
                    type="button"
                    onClick={handleTogglePause}
                    className="w-10 h-10 rounded-xl az-liquid-glass-pill flex items-center justify-center cursor-pointer"
                    title={activePlan.status === 'paused' ? 'Davom ettirish' : 'Vaqtincha toʻxtatish'}
                    aria-label={activePlan.status === 'paused' ? 'Davom ettirish' : 'Vaqtincha toʻxtatish'}
                  >
                    {activePlan.status === 'paused' ? (
                      <Play className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Pause className="w-4 h-4 text-[#C8A85E]" />
                    )}
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#587068] dark:text-[#9CAFA7]">Umumiy xatm jarayoni</span>
                  <span className="font-bold font-mono-numbers text-[#091813] dark:text-[#C8A85E]">
                    {percent}% · {activePlan.completedPages} / 604 sahifa
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#C8A85E] to-[#10B981] rounded-full transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>

              {/* 3 Metrics Bento Grid */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-4 rounded-2xl bg-[#F4EFE3]/70 dark:bg-[#050E0B]/80 border border-black/[0.05] dark:border-white/[0.07]">
                  <div className="text-[11px] text-[#587068] dark:text-[#9CAFA7]">Kunlik reja</div>
                  <div className="text-lg font-display font-bold font-mono-numbers text-[#8B6B2E] dark:text-[#C8A85E] mt-0.5">
                    <InteractiveCounter value={activePlan.pagesPerDay} suffix=" sah" />
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[#F4EFE3]/70 dark:bg-[#050E0B]/80 border border-black/[0.05] dark:border-white/[0.07]">
                  <div className="text-[11px] text-[#587068] dark:text-[#9CAFA7]">Oʻqilgan poralar</div>
                  <div className="text-lg font-display font-bold font-mono-numbers text-[#064E3B] dark:text-[#34D399] mt-0.5">
                    {activePlan.completedJuz.length} / 30
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[#F4EFE3]/70 dark:bg-[#050E0B]/80 border border-black/[0.05] dark:border-white/[0.07]">
                  <div className="text-[11px] text-[#587068] dark:text-[#9CAFA7]">Tugash sanasi</div>
                  <div className="text-xs sm:text-sm font-bold font-mono-numbers text-[#091813] dark:text-[#F7F4EC] mt-1.5">
                    {activePlan.targetEndDate}
                  </div>
                </div>
              </div>

              <ArchitecturalDivider />

              {/* Quick Log Action */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-[#3B554D] dark:text-[#A4B9B1]">
                  Bugun oʻqilgan sahifalarni qayd qilish
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  {[1, 2, 5, 10, 20].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleLogPages(num)}
                      className="px-3.5 py-2 min-h-[42px] rounded-xl text-xs font-bold az-liquid-glass-pill text-[#091813] dark:text-[#F7F4EC] hover:bg-[#064E3B] hover:text-[#F7F4EC] dark:hover:bg-[#10B981] dark:hover:text-[#04120D] transition-all cursor-pointer font-mono-numbers"
                    >
                      +{num} sahifa
                    </button>
                  ))}
                  <div className="flex items-center gap-2 ml-auto">
                    <input
                      type="number"
                      min="1"
                      max="604"
                      value={pagesInput}
                      onChange={(e) => setPagesInput(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-18 px-2.5 py-2 min-h-[42px] text-center text-xs font-bold font-mono-numbers rounded-xl az-liquid-glass-pill text-[#091813] dark:text-[#F7F4EC]"
                    />
                    <Button
                      size="sm"
                      variant="emerald"
                      onClick={() => handleLogPages(pagesInput)}
                    >
                      Qoʻshish
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Col 3: 30 Juz Visual Matrix */}
          <div className="lg:col-span-4 space-y-5">
            <SpatialTiltCard maxTilt={3.5}>
              <Card elevated className="p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-[#091813] dark:text-[#F7F4EC] flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#C8A85E]" />
                    <span>30 Juz xaritasi</span>
                  </h3>
                  <span className="text-xs font-mono-numbers text-[#587068] dark:text-[#9CAFA7]">
                    {activePlan.completedJuz.length} / 30
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 30 }, (_, i) => i + 1).map((juzNum) => {
                    const isDone = activePlan.completedJuz.includes(juzNum);
                    return (
                      <div
                        key={juzNum}
                        className={`p-2.5 rounded-xl text-center text-xs font-bold font-mono-numbers transition-all ${
                          isDone
                            ? 'bg-[#064E3B] dark:bg-[#10B981] text-[#F7F4EC] dark:text-[#04120D] shadow-xs'
                            : 'bg-black/[0.04] dark:bg-white/[0.05] text-[#587068] dark:text-[#9CAFA7]'
                        }`}
                        title={`${juzNum}-pora`}
                      >
                        {juzNum}
                      </div>
                    );
                  })}
                </div>
              </Card>
            </SpatialTiltCard>

            <Card className="p-5 space-y-1.5">
              <div className="text-xs font-bold text-[#8B6B2E] dark:text-[#C8A85E] flex items-center gap-1.5">
                <Award className="w-4 h-4" />
                <span>Xatm fazilati</span>
              </div>
              <p className="text-xs italic text-[#3B554D] dark:text-[#A4B9B1] leading-relaxed">
                «Kim Allohning Kitobidan bir harf oʻqisa, unga bir savob berilur va u oʻn barobar koʻpaytirilur...» (Termiziy rivoyati)
              </p>
            </Card>
          </div>
        </div>
      ) : (
        <Card elevated className="p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#C8A85E]/15 text-[#8B6B2E] dark:text-[#C8A85E] mx-auto flex items-center justify-center">
            <BookOpen className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-display font-bold text-[#091813] dark:text-[#F7F4EC]">
            Faol xatm rejasi mavjud emas
          </h2>
          <p className="text-sm text-[#587068] dark:text-[#9CAFA7] max-w-md mx-auto">
            30, 60 yoki 90 kunlik xatm rejasini boshlang va Qurʼoni Karim tilovatini muntazam odatga aylantiring.
          </p>
          <Button variant="emerald" onClick={() => setShowNewPlanModal(true)}>
            Birinchi rejani yaratish
          </Button>
        </Card>
      )}

      {/* New Plan Selection Modal using NEO 2026 Modal */}
      <Modal
        isOpen={showNewPlanModal}
        onClose={() => setShowNewPlanModal(false)}
        title="Yangi xatm rejasini tanlang"
        maxWidth="md"
      >
        <div className="space-y-5">
          <div className="space-y-2.5">
            {[
              { id: '30_days', label: '30 Kunlik Xatm', sub: 'Kuniga ~20 sahifa (1 juz)' },
              { id: '60_days', label: '60 Kunlik Xatm', sub: 'Kuniga ~10 sahifa (yarim juz)' },
              { id: '90_days', label: '90 Kunlik Xatm', sub: 'Kuniga ~7 sahifa' },
              { id: 'custom', label: 'Moslashuvchan (Custom)', sub: 'Oʻzingiz belgilagan kunlar' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedDuration(opt.id as KhatmDurationType)}
                className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  selectedDuration === opt.id
                    ? 'border-[#C8A85E] bg-[#C8A85E]/12 text-[#091813] dark:text-[#F7F4EC]'
                    : 'border-black/[0.08] dark:border-white/[0.1] text-[#3B554D] dark:text-[#A4B9B1] hover:border-emerald-500/35'
                }`}
              >
                <div className="font-bold text-sm">{opt.label}</div>
                <div className="text-xs opacity-80">{opt.sub}</div>
              </button>
            ))}

            {selectedDuration === 'custom' && (
              <div className="p-3.5 rounded-2xl bg-[#F4EFE3]/70 dark:bg-[#050E0B]/80 border border-black/[0.06] dark:border-white/[0.08] space-y-2">
                <label className="text-xs font-semibold text-[#091813] dark:text-[#F7F4EC] block">
                  Kunlar sonini kiriting:
                </label>
                <input
                  type="number"
                  min="5"
                  max="365"
                  value={customDays}
                  onChange={(e) => setCustomDays(parseInt(e.target.value) || 45)}
                  className="w-full px-3 py-2 text-sm font-mono-numbers rounded-xl az-liquid-glass-pill text-[#091813] dark:text-[#F7F4EC]"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
            <Button variant="outline" size="sm" onClick={() => setShowNewPlanModal(false)}>
              Bekor qilish
            </Button>
            <Button variant="emerald" size="sm" onClick={handleCreatePlan}>
              Rejani boshlash
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
