import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'motion/react';
import { NavigationTab } from '../../types';
import { Home, BookOpen, Clock, Bot, LayoutGrid } from 'lucide-react';

interface MobileNavProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onOpenMoreMenu: () => void;
  unreadNotificationsCount?: number;
  unreadMessagesCount?: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenMoreMenu,
  unreadMessagesCount = 0,
}) => {
  const { t } = useTranslation('navigation');
  const prefersReduced = useReducedMotion();

  const items: { id: NavigationTab; labelKey: string; fallback: string; icon: React.ReactNode }[] = [
    { id: 'home', labelKey: 'home', fallback: 'Asosiy', icon: <Home className="w-[19px] h-[19px]" /> },
    { id: 'prayer', labelKey: 'prayer', fallback: 'Namoz', icon: <Clock className="w-[19px] h-[19px]" /> },
    { id: 'quran', labelKey: 'quran', fallback: 'Qurʼon', icon: <BookOpen className="w-[19px] h-[19px]" /> },
    { id: 'ai_assistant', labelKey: 'ai_assistant', fallback: 'AI Ustoz', icon: <Bot className="w-[19px] h-[19px]" /> },
  ];

  const isMoreSectionActive =
    !items.some((item) => item.id === activeTab) &&
    activeTab !== 'display' &&
    activeTab !== 'masjid_tv';

  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 pointer-events-none px-3 pb-safe pt-2">
      <nav
        className="pointer-events-auto max-w-md mx-auto rounded-full az-liquid-glass-dock px-2 py-1.5"
        aria-label="Mobil asosiy navigatsiya"
      >
        <div className="grid grid-cols-5 items-center gap-0.5">
          {items.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative flex flex-col items-center justify-center min-h-[48px] px-1 rounded-full transition-colors cursor-pointer ${
                  isActive
                    ? 'text-[#F7F5F0] dark:text-[#07110D] font-bold'
                    : 'text-[#526B62] dark:text-[#9AB0A7] hover:text-[#0B1B16] dark:hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="mobile-dock-active-pill"
                    className="absolute inset-0 rounded-full bg-[#064E3B]/92 dark:bg-[#C8A85E] shadow-[0_1px_0_rgba(255,255,255,0.34)_inset,0_10px_22px_-8px_rgba(6,78,59,0.58)] dark:shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_10px_22px_-8px_rgba(200,168,94,0.5)]"
                    transition={
                      prefersReduced
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 420, damping: 32 }
                    }
                  />
                )}
                <span className="relative z-10 mb-0.5">{item.icon}</span>
                <span className="relative z-10 text-[10px] tracking-tight whitespace-nowrap truncate max-w-full leading-none">
                  {t(item.labelKey, item.fallback)}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={onOpenMoreMenu}
            className={`relative flex flex-col items-center justify-center min-h-[48px] px-1 rounded-[20px] transition-colors cursor-pointer ${
              isMoreSectionActive
                ? 'bg-[#064E3B]/10 dark:bg-white/[0.1] text-[#064E3B] dark:text-[#C8A85E] font-bold'
                : 'text-[#526B62] dark:text-[#8FA69D] hover:text-[#0B1B16] dark:hover:text-white'
            }`}
            aria-label={t('allSections', 'Boʻlimlar')}
          >
            <div className="relative mb-0.5">
              <LayoutGrid className="w-[19px] h-[19px]" />
              {unreadMessagesCount > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] px-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center leading-none tabular-nums">
                  {unreadMessagesCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold tracking-tight whitespace-nowrap truncate max-w-full leading-none">
              {t('allSections', 'Boʻlimlar')}
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
};
