import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { DhikrItem, NavigationTab, SupportedLocale } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import {
  GeometricPattern,
  IslamicMihrabArch,
} from '../../ui/GeometricPattern';
import { PageHero } from '../../ui/PageHero';
import {
  AnimatedProgressRing,
  ScrollReveal,
  StaggerCard,
  StaggerGrid,
} from '../../ui/MotionPrimitives';
import { triggerTactileHaptic } from '../../../utils/motionSystem';
import { toNewUzbekAlphabet } from '../../../utils/newUzbekAlphabet';
import {
  getStoredDhikrs,
  subscribeToDatabase,
  isPubliclyPublished,
  getStoredTasbihStats,
  recordTasbihCount,
} from '../../../utils/databaseService';
import {
  Sparkles,
  RotateCcw,
  Volume2,
  VolumeX,
  Smartphone,
  Bookmark,
  Award,
} from 'lucide-react';

const DEFAULT_COUNTER_DHIKR: DhikrItem = {
  id: 'default-tasbeh',
  category: 'namozdan_keyin',
  categoryTitleUz: 'Tasbeh',
  titleUz: 'Subhanalloh',
  textAr: 'سُبْحَانَ اللَّهِ',
  transliterationUz: 'Subhanalloh',
  translationUz: 'Alloh barcha nuqsonlardan pokdir.',
  targetCount: 33,
  virtueUz: 'Har namozdan keyin 33 marta aytiladigan tasbeh.',
  source: 'Tasbeh hisoblagich',
};

interface DhikrViewProps {
  onToggleFavorite: (item: {
    id: string;
    type: 'dhikr';
    title: string;
    subtitle: string;
    snippet: string;
    routeTab: NavigationTab;
    routeId: string;
  }) => void;
  isFavorited: (id: string) => boolean;
  hapticEnabled: boolean;
  soundEnabled: boolean;
}

export const DhikrView: React.FC<DhikrViewProps> = ({
  onToggleFavorite,
  isFavorited,
  hapticEnabled,
  soundEnabled,
}) => {
  const { t, i18n } = useTranslation();
  const currentLocale = (i18n.language as SupportedLocale) || 'uz-Latn';

  const [dhikrs, setDhikrs] = useState<DhikrItem[]>(() => getStoredDhikrs().filter(isPubliclyPublished));
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeDhikr, setActiveDhikr] = useState<DhikrItem>(() => {
    const list = getStoredDhikrs().filter(isPubliclyPublished);
    return list[0] || DEFAULT_COUNTER_DHIKR;
  });
  const [count, setCount] = useState<number>(0);
  const [totalCompletedRounds, setTotalCompletedRounds] = useState<number>(0);
  const [soundActive, setSoundActive] = useState<boolean>(soundEnabled);
  const [hapticActive, setHapticActive] = useState<boolean>(hapticEnabled);

  useEffect(() => {
    const unsubscribe = subscribeToDatabase((event) => {
      if (event.type === 'DHIKRS_UPDATED') {
        const fresh = getStoredDhikrs().filter(isPubliclyPublished);
        setDhikrs(fresh);
        if (fresh.length > 0 && (!activeDhikr || activeDhikr.id === 'default-tasbeh' || !fresh.some((d) => d.id === activeDhikr.id))) {
          setActiveDhikr(fresh[0]);
        } else if (fresh.length === 0) {
          setActiveDhikr(DEFAULT_COUNTER_DHIKR);
        }
      }
    });
    return unsubscribe;
  }, [activeDhikr?.id]);

  const categories = [
    { id: 'all', label: t('dhikr:allDhikrs') },
    { id: 'namozdan_keyin', label: t('dhikr:afterPrayer') },
    { id: 'tonggi', label: t('dhikr:morning') },
    { id: 'kechki', label: t('dhikr:evening') },
    { id: 'sayyidul_istigfor', label: t('dhikr:sayyidulIstighfar') },
  ];

  const getLocalizedText = (text: string) => {
    if (currentLocale === 'uz-Latn-new') {
      return toNewUzbekAlphabet(text);
    }
    return text;
  };

  const filteredDhikrs = dhikrs.filter(
    (d) => selectedCategory === 'all' || d.category === selectedCategory
  );

  // Synthesized click tone via Web Audio API (zero external asset latency)
  const playClickSound = () => {
    if (!soundActive) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
      // AudioContext unavailable or restricted in sandboxed iframe
    }
  };

  const triggerHaptic = () => {
    if (!hapticActive) return;
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(25);
      }
    } catch (e) {
      // Vibrate disallowed in iframe sandbox
    }
  };

  const [stats, setStats] = useState<any>(() => getStoredTasbihStats('asaka_user_current'));
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleIncrement = () => {
    playClickSound();
    triggerHaptic();

    const nextCount = count + 1;
    // Record to persistent tasbih stats engine
    const updatedStats = recordTasbihCount('asaka_user_current', 1, activeDhikr.titleUz);
    setStats(updatedStats);

    if (nextCount >= activeDhikr.targetCount) {
      setCount(0);
      setTotalCompletedRounds((prev) => prev + 1);
      // Double haptic on completion
      try {
        if (hapticActive && typeof window !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([40, 60, 40]);
        }
      } catch (e) {
        // ignore
      }
    } else {
      setCount(nextCount);
    }
  };

  const handleReset = () => {
    if (count > 0) {
      setShowResetConfirm(true);
    } else {
      setCount(0);
    }
  };

  const confirmReset = () => {
    setCount(0);
    setShowResetConfirm(false);
  };

  const isCurrentSaved = isFavorited(activeDhikr.id);
  const activeTitle = getLocalizedText(activeDhikr.titleUz);
  const activeTranslit = getLocalizedText(activeDhikr.transliterationUz);
  const activeTranslation = getLocalizedText(activeDhikr.translationUz);
  const activeVirtue = getLocalizedText(activeDhikr.virtueUz);

  const progressPercent = activeDhikr.targetCount > 0
    ? Math.min(100, Math.round((count / activeDhikr.targetCount) * 100))
    : 0;

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto">
      {/* NEO 2026 Sanctuary Hero */}
      <PageHero
        variant="sanctuary"
        kicker={t('dhikr:bannerPretitle')}
        title={t('dhikr:title')}
        subtitle={t('dhikr:subtitle')}
        meta={[t('dhikr:bannerSource'), `${dhikrs.length} ta zikr`]}
      />

      {/* Main Grid: Neumorphism 2.0 Tactile Counter Instrument + Dhikrs Library */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        {/* Left Column: Tactile Neumorphic Tasbih Counter (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card elevated className="p-6 text-center space-y-6 relative overflow-hidden">
            {/* Instrument Header */}
            <div className="flex items-center justify-between text-xs text-[#5F776F] dark:text-[#8FA69D]">
              <span className="az-type-overline text-[#064E3B] dark:text-[#C8A85E]">
                {t('dhikr:counterTitle')}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSoundActive(!soundActive)}
                  className={`p-2 rounded-xl border cursor-pointer transition-colors ${
                    soundActive
                      ? 'border-[#10B981]/50 text-[#064E3B] dark:text-[#10B981] bg-[#10B981]/12'
                      : 'border-[#064E3B]/10 dark:border-white/[0.1] text-[#5F776F] dark:text-[#8FA69D]'
                  }`}
                  title={t('dhikr:soundToggle')}
                  aria-label={t('dhikr:soundToggle')}
                >
                  {soundActive ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setHapticActive(!hapticActive)}
                  className={`p-2 rounded-xl border cursor-pointer transition-colors ${
                    hapticActive
                      ? 'border-[#10B981]/50 text-[#064E3B] dark:text-[#10B981] bg-[#10B981]/12'
                      : 'border-[#064E3B]/10 dark:border-white/[0.1] text-[#5F776F] dark:text-[#8FA69D]'
                  }`}
                  title={t('dhikr:hapticToggle')}
                  aria-label={t('dhikr:hapticToggle')}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-2 rounded-xl border border-[#064E3B]/10 dark:border-white/[0.1] text-[#5F776F] dark:text-[#8FA69D] hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                  title={t('dhikr:reset')}
                  aria-label={t('dhikr:reset')}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Primary Tactile Neumorphism 2.0 Tap Ring */}
            <div className="py-3 flex items-center justify-center">
              <AnimatedProgressRing
                progress={progressPercent}
                size={236}
                strokeWidth={8}
                trackClassName="stroke-[#064E3B]/10 dark:stroke-white/[0.08]"
                strokeColor="#10B981"
                secondaryStrokeColor="#C8A85E"
              >
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                  onClick={handleIncrement}
                  className="w-[196px] h-[196px] rounded-full az-neumorphic-raised flex flex-col items-center justify-center cursor-pointer select-none focus:outline-none group"
                >
                  <motion.span
                    key={count}
                    initial={{ scale: 0.92, opacity: 0.7 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.16 }}
                    className="text-5xl sm:text-6xl az-type-numeric font-extrabold text-[#064E3B] dark:text-[#F7F5F0]"
                  >
                    {count}
                  </motion.span>
                  <span className="text-xs az-type-numeric text-[#5F776F] dark:text-[#8FA69D] mt-1">
                    / {activeDhikr.targetCount} {t('dhikr:countTargetSuffix')}
                  </span>
                  <span className="az-type-overline text-[#10B981] dark:text-[#C8A85E] mt-2.5">
                    {t('dhikr:tapToCount')}
                  </span>
                </motion.button>
              </AnimatedProgressRing>
            </div>

            {/* Persistent Tasbih Stats */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#064E3B]/[0.08] dark:border-white/[0.08] text-center">
              <div className="p-3 rounded-2xl az-neumorphic-inset">
                <span className="text-[11px] text-[#5F776F] dark:text-[#8FA69D] block">Bugungi Jami Zikr</span>
                <span className="text-sm font-bold az-type-numeric text-[#064E3B] dark:text-[#C8A85E]">
                  {stats?.todayTotal || 0} marta
                </span>
              </div>
              <div className="p-3 rounded-2xl az-neumorphic-inset">
                <span className="text-[11px] text-[#5F776F] dark:text-[#8FA69D] block">Barcha Vaqtlar</span>
                <span className="text-sm font-bold az-type-numeric text-emerald-700 dark:text-emerald-400">
                  {stats?.allTimeTotal || 0} marta
                </span>
              </div>
            </div>

            {/* Total Rounds Finished */}
            <div className="flex items-center justify-center gap-2 text-xs text-[#5F776F] dark:text-[#8FA69D] az-type-numeric">
              <Award className="w-4 h-4 text-[#C8A85E]" />
              <span>
                {t('dhikr:roundsCompleted')}:{' '}
                <strong className="text-[#0B1B16] dark:text-[#F7F5F0]">{totalCompletedRounds}</strong>
              </span>
            </div>

            {/* Reset Confirmation Dialog */}
            {showResetConfirm && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2.5 text-[#0B1B16] dark:text-[#F7F5F0]">
                <p className="font-semibold text-center">Hisoblagichni nolga tushirishni tasdiqlaysizmi?</p>
                <div className="flex justify-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowResetConfirm(false)} className="text-xs">
                    Bekor qilish
                  </Button>
                  <Button size="sm" variant="primary" onClick={confirmReset} className="text-xs !bg-rose-600 hover:!bg-rose-700 !text-white">
                    Nollash
                  </Button>
                </div>
              </div>
            )}

            {/* Active Dhikr Summary (clean Arabic readability) */}
            <div className="pt-4 border-t border-[#064E3B]/[0.08] dark:border-white/[0.08] text-left space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-display font-bold text-[#0B1B16] dark:text-[#F7F5F0]">
                  {activeTitle}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onToggleFavorite({
                      id: activeDhikr.id,
                      type: 'dhikr',
                      title: activeTitle,
                      subtitle: activeTranslit,
                      snippet: activeTranslation,
                      routeTab: 'dhikr',
                      routeId: activeDhikr.id,
                    })
                  }
                  className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                    isCurrentSaved
                      ? 'bg-[#C8A85E]/20 text-[#9A7A3A] dark:text-[#C8A85E] border-[#C8A85E]/50'
                      : 'text-[#5F776F] hover:text-[#064E3B] dark:hover:text-[#C8A85E] border-[#064E3B]/10 dark:border-white/[0.1]'
                  }`}
                  title={t('common:save')}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                </button>
              </div>

              <p dir="rtl" className="font-arabic text-2xl text-[#0B1B16] dark:text-[#F7F5F0] text-right">
                {activeDhikr.textAr}
              </p>

              <p className="text-xs text-[#5F776F] dark:text-[#8FA69D] italic">
                {activeTranslit}
              </p>

              <p className="text-xs text-[#253C35] dark:text-[#D4DDD8] leading-relaxed">
                «{activeTranslation}»
              </p>

              <div className="p-3.5 rounded-xl bg-[#F7F5F0] dark:bg-[#0F1A16] border border-[#064E3B]/[0.08] dark:border-white/[0.07] text-[11px] text-[#4B635B] dark:text-[#9CAFA7]">
                <strong className="text-[#064E3B] dark:text-[#C8A85E]">{t('dhikr:virtue')}: </strong>
                {activeVirtue}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Dhikrs Library (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => {
              const isSelected = selectedCategory === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#064E3B] dark:border-[#10B981] bg-[#064E3B] dark:bg-[#10B981] text-white dark:text-[#04140F]'
                      : 'border-[#064E3B]/[0.1] dark:border-white/[0.08] bg-white dark:bg-[#0B1411] text-[#334F46] dark:text-[#D4DDD8] hover:border-[#10B981]/45'
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* List of Dhikrs */}
          <StaggerGrid className="space-y-3" staggerDelay={0.03}>
            {filteredDhikrs.map((dhikr) => {
              const isSelected = activeDhikr.id === dhikr.id;
              const title = getLocalizedText(dhikr.titleUz);
              const translit = getLocalizedText(dhikr.transliterationUz);

              return (
                <StaggerCard key={dhikr.id}>
                  <button
                    type="button"
                    onClick={() => {
                      triggerTactileHaptic(6);
                      setActiveDhikr(dhikr);
                      setCount(0);
                    }}
                    className={`w-full text-left p-5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#10B981]/60 bg-[#064E3B]/[0.06] dark:bg-[#10B981]/10 shadow-xs'
                        : 'az-liquid-glass hover:border-[#10B981]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-[#5F776F] dark:text-[#8FA69D] mb-2">
                      <span className="font-semibold text-[#064E3B] dark:text-[#C8A85E]">
                        {getLocalizedText(dhikr.categoryTitleUz)}
                      </span>
                      <span className="az-type-numeric font-bold text-[#064E3B] dark:text-emerald-300">
                        {dhikr.targetCount}×
                      </span>
                    </div>

                    <h4 className="text-sm font-display font-bold text-[#091813] dark:text-[#F7F4EC] mb-1">
                      {title}
                    </h4>

                    <p dir="rtl" className="font-arabic text-lg text-[#091813] dark:text-[#F7F4EC] text-right my-1.5">
                      {dhikr.textAr}
                    </p>

                    <p className="text-xs text-[#5F776F] dark:text-[#8FA69D] italic line-clamp-1">
                      {translit}
                    </p>
                  </button>
                </StaggerCard>
              );
            })}
          </StaggerGrid>
        </div>
      </div>
    </div>
  );
};
