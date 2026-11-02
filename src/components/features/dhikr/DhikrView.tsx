import React, { useState, useEffect } from 'react';
import { DhikrItem, NavigationTab } from '../../../types';
import { AUTHENTIC_DHIKRS } from '../../../data/dhikrData';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { GeometricPattern } from '../../ui/GeometricPattern';
import {
  Sparkles,
  RotateCcw,
  Volume2,
  VolumeX,
  Smartphone,
  Bookmark,
  Check,
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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeDhikr, setActiveDhikr] = useState<DhikrItem>(AUTHENTIC_DHIKRS[1]);
  const [count, setCount] = useState<number>(0);
  const [totalCompletedRounds, setTotalCompletedRounds] = useState<number>(0);
  const [soundActive, setSoundActive] = useState<boolean>(soundEnabled);
  const [hapticActive, setHapticActive] = useState<boolean>(hapticEnabled);

  const categories = [
    { id: 'all', label: 'Barcha zikrlar' },
    { id: 'namozdan_keyin', label: 'Namozdan keyin' },
    { id: 'tonggi', label: 'Tonggi zikrlar' },
    { id: 'kechki', label: 'Kechki zikrlar' },
    { id: 'sayyidul_istigfor', label: 'Sayyidul Istigʻfor' },
  ];

  const filteredDhikrs = AUTHENTIC_DHIKRS.filter(
    (d) => selectedCategory === 'all' || d.category === selectedCategory
  );

  // Synthesized click tone via Web Audio API (zero external asset latency)
  const playClickSound = () => {
    if (!soundActive) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.05);
    } catch (e) {
      // AudioContext policy fallback
    }
  };

  const handleIncrement = () => {
    playClickSound();
    if (hapticActive && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(30);
      } catch (e) {
        // ignore
      }
    }

    const nextCount = count + 1;
    if (nextCount >= activeDhikr.targetCount) {
      setCount(0);
      setTotalCompletedRounds((prev) => prev + 1);
      if (hapticActive && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([60, 50, 60]);
        } catch (e) {
          // ignore
        }
      }
    } else {
      setCount(nextCount);
    }
  };

  const handleReset = () => {
    setCount(0);
  };

  const progressPercent = Math.min(
    100,
    Math.round((count / activeDhikr.targetCount) * 100)
  );

  return (
    <div className="space-y-8 pb-16">
      {/* Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-[#c5a869]/30 bg-gradient-to-r from-[#031d17] to-[#071614] text-white p-6 sm:p-10">
        <GeometricPattern opacity={0.05} />
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#c5a869] uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Zikrulloh</span>
            <span aria-hidden="true">·</span>
            <span>Qalblar Oromi</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-white">
            Zikr va Duolar
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            «Albatta, Allohning zikri ila qalblar orom olur» (Raʼd surasi, 28-oyat). Kundalik mashhur tasbehlar va duolar toʻplami.
          </p>
        </div>
      </div>

      {/* Main Grid: Interactive Tasbih (5 cols) + Dua Cards (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Interactive Digital Tasbih */}
        <div className="lg:col-span-5 space-y-4">
          <Card elevated className="p-6 sm:p-8 text-center space-y-6 relative overflow-hidden border-[#c5a869]/30">
            <GeometricPattern opacity={0.03} />

            {/* Header */}
            <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
              <span className="font-semibold text-[#c5a869]">Elektron Tasbeh</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSoundActive(!soundActive)}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    soundActive
                      ? 'text-[#c5a869] border-[#c5a869]/40 bg-[#c5a869]/10'
                      : 'text-stone-400 border-stone-200 dark:border-emerald-950'
                  }`}
                  title={soundActive ? 'Ovoz yoqilgan' : 'Ovoz oʻchirilgan'}
                >
                  {soundActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setHapticActive(!hapticActive)}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    hapticActive
                      ? 'text-[#c5a869] border-[#c5a869]/40 bg-[#c5a869]/10'
                      : 'text-stone-400 border-stone-200 dark:border-emerald-950'
                  }`}
                  title={hapticActive ? 'Vibratsiya yoqilgan' : 'Vibratsiya oʻchirilgan'}
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Active Dhikr Title & Arabic Preview */}
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">
                {activeDhikr.titleUz}
              </h3>
              <p className="font-arabic text-2xl text-[#c5a869]">{activeDhikr.textAr}</p>
              <p className="text-xs text-stone-400 dark:text-stone-500">
                Maqsad: <span className="font-mono-numbers">{activeDhikr.targetCount}</span> marta
              </p>
            </div>

            {/* Circular Progress & Touch Counter Button */}
            <div className="flex flex-col items-center justify-center py-2">
              <button
                onClick={handleIncrement}
                className="group relative w-48 h-48 sm:w-56 sm:h-56 rounded-full flex flex-col items-center justify-center bg-gradient-to-b from-[#0e2723] to-[#061815] border-4 border-[#c5a869]/40 hover:border-[#c5a869] shadow-2xl active:scale-95 transition-all cursor-pointer focus:outline-none"
                aria-label="Tasbeh hisoblash"
              >
                {/* Visual SVG Progress Ring */}
                <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                  <circle
                    cx="50%"
                    cy="50%"
                    r="46%"
                    className="stroke-emerald-950/60 fill-none"
                    strokeWidth="4"
                  />
                  <circle
                    cx="50%"
                    cy="50%"
                    r="46%"
                    className="stroke-[#c5a869] fill-none transition-all duration-150"
                    strokeWidth="5"
                    strokeDasharray="290"
                    strokeDashoffset={290 - (290 * progressPercent) / 100}
                    strokeLinecap="round"
                  />
                </svg>

                <span className="text-5xl sm:text-6xl font-bold font-mono-numbers text-white tracking-tight group-hover:text-[#c5a869] transition-colors">
                  {count}
                </span>
                <span className="text-[11px] uppercase tracking-widest text-[#c5a869]/80 mt-1 font-medium">
                  {progressPercent}% / {activeDhikr.targetCount}
                </span>
              </button>
            </div>

            {/* Bottom Controls */}
            <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 pt-2 border-t border-stone-100 dark:border-emerald-950/60">
              <div className="flex items-center gap-1.5 font-mono-numbers">
                <Award className="w-4 h-4 text-[#c5a869]" />
                <span>Tugatilgan doiralar: <strong>{totalCompletedRounds}</strong></span>
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-1 hover:text-[#c5a869] transition-colors cursor-pointer"
                title="Qayta boshlash"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Nollash</span>
              </button>
            </div>
          </Card>
        </div>

        {/* Right Column: Dhikr & Dua Library (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-stone-100 dark:bg-[#091a18] rounded-xl border border-stone-200 dark:border-emerald-950 overflow-x-auto">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-[#0d211e] text-[#c5a869] shadow-sm font-semibold border border-[#c5a869]/30'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Dhikr Cards List */}
          <div className="space-y-4">
            {filteredDhikrs.map((dhikr) => {
              const isSelected = activeDhikr.id === dhikr.id;
              const isSaved = isFavorited(dhikr.id);

              return (
                <Card
                  key={dhikr.id}
                  className={`p-6 space-y-4 transition-all ${
                    isSelected
                      ? 'border-[#c5a869] ring-1 ring-[#c5a869]/40 bg-[#c5a869]/5'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 border-b border-stone-100 dark:border-emerald-950/60 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-stone-900 dark:text-stone-200">
                        {dhikr.categoryTitleUz}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-numbers">{dhikr.targetCount} marta</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant={isSelected ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setActiveDhikr(dhikr);
                          setCount(0);
                        }}
                      >
                        {isSelected ? 'Faol zikr' : 'Tasbehga olish'}
                      </Button>

                      <button
                        onClick={() =>
                          onToggleFavorite({
                            id: dhikr.id,
                            type: 'dhikr',
                            title: dhikr.titleUz,
                            subtitle: dhikr.categoryTitleUz,
                            snippet: dhikr.translationUz,
                            routeTab: 'dhikr',
                            routeId: dhikr.id,
                          })
                        }
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          isSaved
                            ? 'bg-[#c5a869]/20 text-[#c5a869] border-[#c5a869]'
                            : 'text-stone-500 hover:text-[#c5a869] border-stone-200 dark:border-emerald-950'
                        }`}
                        title="Sevimlilarga qoʻshish"
                      >
                        <Bookmark className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                    {dhikr.titleUz}
                  </h4>

                  {/* Arabic text */}
                  <p
                    dir="rtl"
                    className="font-arabic text-xl sm:text-2xl text-stone-900 dark:text-amber-100/95 leading-relaxed text-right"
                  >
                    {dhikr.textAr}
                  </p>

                  {/* Transliteration */}
                  <p className="text-xs text-stone-400 dark:text-stone-500 italic">
                    {dhikr.transliterationUz}
                  </p>

                  {/* Uzbek Translation */}
                  <p className="text-sm text-stone-700 dark:text-stone-300 font-editorial leading-relaxed">
                    {dhikr.translationUz}
                  </p>

                  {/* Virtue & Source */}
                  <div className="text-xs text-stone-500 dark:text-stone-400 border-t border-stone-100 dark:border-emerald-950/40 pt-2.5 space-y-1">
                    <div>
                      <span className="font-semibold text-stone-700 dark:text-stone-300">Fazilati: </span>
                      {dhikr.virtueUz}
                    </div>
                    <div className="text-stone-400 dark:text-stone-500">
                      Manba: {dhikr.source}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
