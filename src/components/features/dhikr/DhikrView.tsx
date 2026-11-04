import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DhikrItem, NavigationTab, SupportedLocale } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { GeometricPattern } from '../../ui/GeometricPattern';
import { toNewUzbekAlphabet } from '../../../utils/newUzbekAlphabet';
import { getStoredDhikrs, subscribeToDatabase } from '../../../utils/databaseService';
import {
  Sparkles,
  RotateCcw,
  Volume2,
  VolumeX,
  Smartphone,
  Bookmark,
  Award,
} from 'lucide-react';

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

  const [dhikrs, setDhikrs] = useState<DhikrItem[]>(() => getStoredDhikrs());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeDhikr, setActiveDhikr] = useState<DhikrItem>(() => {
    const list = getStoredDhikrs();
    return list[1] || list[0];
  });
  const [count, setCount] = useState<number>(0);
  const [totalCompletedRounds, setTotalCompletedRounds] = useState<number>(0);
  const [soundActive, setSoundActive] = useState<boolean>(soundEnabled);
  const [hapticActive, setHapticActive] = useState<boolean>(hapticEnabled);

  useEffect(() => {
    const unsubscribe = subscribeToDatabase((event) => {
      if (event.type === 'DHIKRS_UPDATED') {
        const fresh = getStoredDhikrs();
        setDhikrs(fresh);
        if (!fresh.some((d) => d.id === activeDhikr.id) && fresh.length > 0) {
          setActiveDhikr(fresh[0]);
        }
      }
    });
    return unsubscribe;
  }, [activeDhikr.id]);

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

  const handleIncrement = () => {
    playClickSound();
    triggerHaptic();

    const nextCount = count + 1;
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
    setCount(0);
  };

  const isCurrentSaved = isFavorited(activeDhikr.id);
  const activeTitle = getLocalizedText(activeDhikr.titleUz);
  const activeTranslit = getLocalizedText(activeDhikr.transliterationUz);
  const activeTranslation = getLocalizedText(activeDhikr.translationUz);
  const activeVirtue = getLocalizedText(activeDhikr.virtueUz);

  return (
    <div className="space-y-8 pb-16">
      {/* Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-[#c5a869]/30 bg-gradient-to-r from-[#031d17] to-[#071614] text-white p-6 sm:p-10">
        <GeometricPattern opacity={0.05} />
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#c5a869] uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('dhikr:bannerPretitle')}</span>
            <span aria-hidden="true">·</span>
            <span>{t('dhikr:bannerSource')}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-white">
            {t('dhikr:title')}
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            {t('dhikr:subtitle')}
          </p>
        </div>
      </div>

      {/* Main Grid: Counter Instrument + Dhikrs Library */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Interactive Counter (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card elevated className="p-6 text-center space-y-6 border-[#c5a869]/30 relative overflow-hidden">
            <GeometricPattern opacity={0.03} />

            {/* Instrument Header */}
            <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
              <span className="font-semibold text-[#c5a869]">
                {t('dhikr:counterTitle')}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSoundActive(!soundActive)}
                  className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
                    soundActive
                      ? 'border-[#c5a869] text-[#c5a869] bg-[#c5a869]/10'
                      : 'border-stone-200 dark:border-emerald-950 text-stone-400'
                  }`}
                  title={t('dhikr:soundToggle')}
                >
                  {soundActive ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setHapticActive(!hapticActive)}
                  className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
                    hapticActive
                      ? 'border-[#c5a869] text-[#c5a869] bg-[#c5a869]/10'
                      : 'border-stone-200 dark:border-emerald-950 text-stone-400'
                  }`}
                  title={t('dhikr:hapticToggle')}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleReset}
                  className="p-1.5 rounded-lg border border-stone-200 dark:border-emerald-950 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
                  title={t('dhikr:reset')}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Primary Tap Area */}
            <div className="py-4">
              <button
                onClick={handleIncrement}
                className="w-48 h-48 sm:w-56 sm:h-56 mx-auto rounded-full bg-gradient-to-b from-[#071e19] to-[#04110e] border-4 border-[#c5a869] shadow-2xl flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-transform group select-none ring-8 ring-[#c5a869]/10"
              >
                <span className="text-5xl sm:text-6xl font-mono-numbers font-bold text-white group-hover:text-[#c5a869] transition-colors">
                  {count}
                </span>
                <span className="text-xs font-mono-numbers text-stone-400 mt-1">
                  / {activeDhikr.targetCount} {t('dhikr:countTargetSuffix')}
                </span>
                <span className="text-[11px] font-semibold text-[#c5a869] uppercase tracking-widest mt-2">
                  {t('dhikr:tapToCount')}
                </span>
              </button>
            </div>

            {/* Total Rounds Finished */}
            <div className="flex items-center justify-center gap-2 text-xs text-stone-500 dark:text-stone-400 font-mono-numbers">
              <Award className="w-4 h-4 text-[#c5a869]" />
              <span>{t('dhikr:roundsCompleted')}: <strong className="text-stone-800 dark:text-stone-200">{totalCompletedRounds}</strong></span>
            </div>

            {/* Active Dhikr Summary */}
            <div className="pt-4 border-t border-stone-100 dark:border-emerald-950/60 text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                  {activeTitle}
                </span>
                <button
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
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    isCurrentSaved
                      ? 'bg-[#c5a869]/20 text-[#c5a869] border-[#c5a869]'
                      : 'text-stone-500 hover:text-[#c5a869] border-stone-200 dark:border-emerald-950'
                  }`}
                  title={t('common:save')}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                </button>
              </div>

              <p dir="rtl" className="font-arabic text-xl text-stone-900 dark:text-amber-100/95 text-right">
                {activeDhikr.textAr}
              </p>

              <p className="text-xs text-stone-500 dark:text-stone-400 italic">
                {activeTranslit}
              </p>

              <p className="text-xs text-stone-700 dark:text-stone-300">
                «{activeTranslation}»
              </p>

              <div className="p-3 rounded-xl bg-stone-50 dark:bg-[#071614] border border-stone-200/60 dark:border-emerald-950/60 text-[11px] text-stone-500 dark:text-stone-400">
                <strong className="text-[#c5a869]">{t('dhikr:virtue')}: </strong>
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
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#c5a869] bg-[#c5a869] text-[#071614] font-semibold shadow-sm'
                      : 'border-stone-200/80 dark:border-emerald-950 bg-white dark:bg-[#0d211e]/70 text-stone-700 dark:text-stone-300 hover:border-[#c5a869]/40'
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* List of Dhikrs */}
          <div className="space-y-3">
            {filteredDhikrs.map((dhikr) => {
              const isSelected = activeDhikr.id === dhikr.id;
              const title = getLocalizedText(dhikr.titleUz);
              const translit = getLocalizedText(dhikr.transliterationUz);
              const translation = getLocalizedText(dhikr.translationUz);

              return (
                <button
                  key={dhikr.id}
                  onClick={() => {
                    setActiveDhikr(dhikr);
                    setCount(0);
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#c5a869] bg-[#c5a869]/10 shadow-sm'
                      : 'border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#0d211e]/60 hover:border-[#c5a869]/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-2">
                    <span className="font-semibold text-[#c5a869]">
                      {getLocalizedText(dhikr.categoryTitleUz)}
                    </span>
                    <span className="font-mono-numbers bg-stone-100 dark:bg-emerald-950 px-2 py-0.5 rounded text-stone-600 dark:text-stone-300 font-bold">
                      {dhikr.targetCount}x
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-1">
                    {title}
                  </h4>

                  <p dir="rtl" className="font-arabic text-base text-stone-900 dark:text-amber-100/90 text-right my-1">
                    {dhikr.textAr}
                  </p>

                  <p className="text-xs text-stone-400 dark:text-stone-500 italic line-clamp-1">
                    {translit}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
