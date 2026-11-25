import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'motion/react';
import { NavigationTab, PrayerSchedule } from '../../types';
import { getNextPrayerCalculation } from '../../utils/prayerTimeUtils';
import {
  Home,
  Clock,
  BookOpen,
  GraduationCap,
  Flame,
  ScrollText,
  Sparkles,
  Newspaper,
  Library,
  Users,
  MapPin,
  Headphones,
  Bot,
  MessageCircleQuestion,
  Calendar,
  Tv,
  Shield,
  Bookmark,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Compass,
  Award,
  Moon,
  Bell,
  Crown,
} from 'lucide-react';

import { triggerTactileHaptic } from '../../utils/motionSystem';

interface DesktopSidebarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onOpenTvMode?: () => void;
  prayerSchedule?: PrayerSchedule;
}

interface SidebarSection {
  title: string;
  items: { id: NavigationTab; labelKey: string; fallback: string; icon: React.ReactNode }[];
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenTvMode,
  prayerSchedule,
}) => {
  const { t } = useTranslation(['navigation', 'prayer']);
  const prefersReduced = useReducedMotion();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && localStorage.getItem('az_sidebar_collapsed') === '1';
    } catch {
      return false;
    }
  });

  const [nextPrayer, setNextPrayer] = useState(() =>
    prayerSchedule?.times ? getNextPrayerCalculation(prayerSchedule.times) : null,
  );

  useEffect(() => {
    if (!prayerSchedule?.times) return;
    const tick = () => setNextPrayer(getNextPrayerCalculation(prayerSchedule.times));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [prayerSchedule?.times]);

  const toggleCollapsed = () => {
    triggerTactileHaptic(6);
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('az_sidebar_collapsed', next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  };

  const sections: SidebarSection[] = [
    {
      title: 'Asosiy',
      items: [
        { id: 'home', labelKey: 'home', fallback: 'Bosh sahifa', icon: <Home className="w-[18px] h-[18px]" /> },
        { id: 'prayer', labelKey: 'prayer', fallback: 'Namoz vaqtlari', icon: <Clock className="w-[18px] h-[18px]" /> },
        { id: 'quran', labelKey: 'quran', fallback: 'Qurʼon Markazi', icon: <BookOpen className="w-[18px] h-[18px]" /> },
        { id: 'hadith', labelKey: 'hadith', fallback: 'Hadislar', icon: <ScrollText className="w-[18px] h-[18px]" /> },
        { id: 'dhikr', labelKey: 'dhikr', fallback: 'Zikr va Duolar', icon: <Sparkles className="w-[18px] h-[18px]" /> },
      ],
    },
    {
      title: 'Qurʼon va Taʼlim',
      items: [
        { id: 'hifz_istiqomat', labelKey: 'hifz_istiqomat', fallback: 'Hifz va Murojaʼa', icon: <Flame className="w-[18px] h-[18px]" /> },
        { id: 'academy', labelKey: 'academy', fallback: 'Tajvid Akademiyasi', icon: <GraduationCap className="w-[18px] h-[18px]" /> },
        { id: 'khatm_planner', labelKey: 'khatm_planner', fallback: 'Xatm Rejasi', icon: <BookOpen className="w-[18px] h-[18px]" /> },
        { id: 'quiz', labelKey: 'quiz', fallback: 'Dars va Testlar', icon: <Award className="w-[18px] h-[18px]" /> },
      ],
    },
    {
      title: 'Ilm va Media',
      items: [
        { id: 'articles', labelKey: 'articles', fallback: 'Maqola va Yangilik', icon: <Newspaper className="w-[18px] h-[18px]" /> },
        { id: 'library', labelKey: 'library', fallback: 'Islomiy Kutubxona', icon: <Library className="w-[18px] h-[18px]" /> },
        { id: 'scholars', labelKey: 'scholars', fallback: 'Ulamolar va Qorilar', icon: <Users className="w-[18px] h-[18px]" /> },
        { id: 'media_center', labelKey: 'media_center', fallback: 'Media va Video', icon: <Headphones className="w-[18px] h-[18px]" /> },
      ],
    },
    {
      title: 'Xizmatlar va AI',
      items: [
        { id: 'ai_assistant', labelKey: 'ai_assistant', fallback: 'AI Ustoz', icon: <Bot className="w-[18px] h-[18px]" /> },
        { id: 'mosques', labelKey: 'mosques', fallback: 'Masjidlar va Qibla', icon: <MapPin className="w-[18px] h-[18px]" /> },
        { id: 'calendar', labelKey: 'calendar', fallback: 'Hijriy Taqvim', icon: <Calendar className="w-[18px] h-[18px]" /> },
        { id: 'fasting', labelKey: 'fasting', fallback: 'Roʻza Yordamchisi', icon: <Moon className="w-[18px] h-[18px]" /> },
        { id: 'ask_imam', labelKey: 'ask_imam', fallback: 'Imomga Savol', icon: <MessageCircleQuestion className="w-[18px] h-[18px]" /> },
      ],
    },
    {
      title: 'Shaxsiy va Boshqaruv',
      items: [
        { id: 'premium', labelKey: 'premium', fallback: 'Premium & Tanlov', icon: <Crown className="w-[18px] h-[18px] text-[#C8A85E]" /> },
        { id: 'favorites', labelKey: 'favorites', fallback: 'Sevimlilar', icon: <Bookmark className="w-[18px] h-[18px]" /> },
        { id: 'notifications', labelKey: 'notifications', fallback: 'Bildirishnomalar', icon: <Bell className="w-[18px] h-[18px]" /> },
        { id: 'settings', labelKey: 'settings', fallback: 'Sozlamalar', icon: <Settings className="w-[18px] h-[18px]" /> },
        { id: 'admin', labelKey: 'admin', fallback: 'Admin Panel', icon: <Shield className="w-[18px] h-[18px]" /> },
      ],
    },
  ];

  return (
    <aside
      aria-label="Asosiy yon navigatsiya"
      className={`hidden lg:flex flex-col shrink-0 az-liquid-glass border-y-0 border-l-0 rounded-none py-4 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto transition-[width,padding] duration-200 ${
        collapsed ? 'w-[76px] px-2.5' : 'w-[266px] px-3.5'
      }`}
    >
      {/* Top Row: Live Asaka Next-Prayer Compact Card + Collapse Toggle */}
      <div className="mb-5 space-y-2.5">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between px-1'}`}>
          {!collapsed && (
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#5F776F] dark:text-[#8FA69D]">
              Ekotizim
            </span>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl text-[#5F776F] dark:text-[#8FA69D] hover:text-[#091813] dark:hover:text-[#F7F4EC] hover:bg-[#064E3B]/7 dark:hover:bg-white/[0.07] transition-colors cursor-pointer"
            title={collapsed ? 'Yon panelni kengaytirish' : 'Yon panelni yigʻish'}
            aria-label={collapsed ? 'Yon panelni kengaytirish' : 'Yon panelni yigʻish'}
          >
            {collapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {nextPrayer?.nextPrayer && !collapsed && (
          <button
            type="button"
            onClick={() => {
              triggerTactileHaptic(8);
              onSelectTab('prayer');
            }}
            className="w-full text-left rounded-2xl border border-emerald-500/22 bg-gradient-to-br from-[#072B21] via-[#061812] to-[#030706] text-[#F7F4EC] p-3.5 shadow-[0_14px_30px_-14px_rgba(0,0,0,0.65)] hover:border-emerald-400/45 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-emerald-300/90 font-semibold">
              <span>Asaka · Keyingi namoz</span>
              <span className="font-mono-numbers text-[#C8A85E] font-bold">
                {nextPrayer.nextPrayer.time}
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between gap-2">
              <span className="text-sm font-bold truncate">
                {t(`prayer:${nextPrayer.nextPrayer.key}`, nextPrayer.nextPrayer.nameUz)}
              </span>
              <span className="text-xs font-mono-numbers font-bold text-[#F7F4EC] tabular-nums shrink-0">
                {nextPrayer.countdownText}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-white/[0.08] flex items-center justify-between text-[10px] text-[#9AB0A7]">
              <span className="inline-flex items-center gap-1">
                <Compass className="w-3 h-3 text-[#C8A85E]" />
                <span>Qibla {prayerSchedule?.qiblaAngleDeg || 241}°</span>
              </span>
              <span className="font-mono-numbers">UTC+5</span>
            </div>
          </button>
        )}
      </div>

      <div className="space-y-5 flex-1">
        {sections.map((sec) => (
          <div key={sec.title} className="space-y-0.5">
            {!collapsed && (
              <div className="px-3 pb-1 text-[10px] font-bold tracking-[0.14em] uppercase text-[#5F776F] dark:text-[#7D968D]">
                {sec.title}
              </div>
            )}
            {sec.items.map((item) => {
              const isActive = activeTab === item.id;
              const label = t(`navigation:${item.labelKey}`, item.fallback);
              return (
                <button
                  key={item.id}
                  type="button"
                  title={collapsed ? label : undefined}
                  onClick={() => {
                    triggerTactileHaptic(6);
                    onSelectTab(item.id);
                  }}
                  className={`relative w-full flex items-center ${
                    collapsed ? 'justify-center px-0' : 'gap-3 px-3'
                  } py-2.5 min-h-[42px] rounded-xl text-[13px] font-medium transition-colors cursor-pointer text-left ${
                    isActive
                      ? 'text-[#F7F4EC] dark:text-[#030706] font-bold'
                      : 'text-[#2D4A41] dark:text-[#C5D4CE] hover:bg-[#064E3B]/7 dark:hover:bg-white/[0.06] hover:text-[#091813] dark:hover:text-[#F7F4EC]'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="desktop-sidebar-active"
                      transition={
                        prefersReduced
                          ? { duration: 0 }
                          : { type: 'spring', stiffness: 380, damping: 32 }
                      }
                      className="absolute inset-0 rounded-2xl bg-[#064E3B]/94 dark:bg-[#C8A85E] shadow-[0_1px_0_rgba(255,255,255,0.28)_inset,0_10px_24px_-10px_rgba(6,78,59,0.5)] dark:shadow-[0_1px_0_rgba(255,255,255,0.45)_inset,0_10px_24px_-10px_rgba(200,168,94,0.45)]"
                    />
                  )}
                  <span className="relative z-10 shrink-0">{item.icon}</span>
                  {!collapsed && <span className="relative z-10 truncate">{label}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {onOpenTvMode && (
        <div className="pt-4 mt-4 border-t border-[#064E3B]/10 dark:border-white/[0.08]">
          <button
            type="button"
            title="Masjid TV Tablosi"
            onClick={() => {
              triggerTactileHaptic(8);
              onOpenTvMode();
            }}
            className={`w-full flex items-center ${
              collapsed ? 'justify-center px-0' : 'gap-2.5 px-3'
            } py-2.5 min-h-[42px] rounded-xl bg-[#064E3B]/8 dark:bg-white/[0.05] text-[#064E3B] dark:text-[#EAE6DB] border border-[#064E3B]/12 dark:border-white/[0.08] text-xs font-semibold hover:bg-[#064E3B]/14 dark:hover:bg-white/[0.1] transition-colors cursor-pointer`}
          >
            <Tv className="w-4 h-4 text-[#064E3B] dark:text-[#C8A85E] shrink-0" />
            {!collapsed && <span>Masjid TV Tablosi</span>}
          </button>
        </div>
      )}
    </aside>
  );
};
