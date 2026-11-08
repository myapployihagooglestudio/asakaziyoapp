import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { NavigationTab } from '../../types';
import { Home, BookOpen, Clock, Sparkles, LayoutGrid } from 'lucide-react';

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

  const items: { id: NavigationTab; labelKey: string; fallback: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'home', labelKey: 'home', fallback: 'Asosiy', icon: <Home className="w-5 h-5" /> },
    { id: 'prayer', labelKey: 'prayer', fallback: 'Namoz', icon: <Clock className="w-5 h-5" /> },
    { id: 'quran', labelKey: 'quran', fallback: 'Qurʼon', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'dhikr', labelKey: 'dhikr', fallback: 'Zikr/Duo', icon: <Sparkles className="w-5 h-5" /> },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#F8F5EC]/95 dark:bg-[#031814]/95 backdrop-blur-xl border-t border-[#063D32]/15 dark:border-[#C6A45C]/25 px-2 pt-1.5 pb-safe transition-colors shadow-[0_-8px_28px_rgba(4,43,37,0.08)]"
      aria-label="Mobil tezkor navigatsiya"
    >
      <div className="grid grid-cols-5 items-center max-w-md mx-auto h-14">
        {items.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`relative flex flex-col items-center justify-center min-h-[46px] px-1 rounded-xl transition-colors cursor-pointer ${
                isActive
                  ? 'text-[#063D32] dark:text-[#DCC58C] font-bold'
                  : 'text-[#5C746C] dark:text-[#8FA69E] hover:text-[#042B25] dark:hover:text-[#F8F5EC]'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="mobile-nav-active-pill"
                  className="absolute inset-x-2 inset-y-0.5 rounded-xl bg-[#063D32]/10 dark:bg-[#C6A45C]/15 border border-[#063D32]/20 dark:border-[#C6A45C]/30 -z-10"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <div className="mb-0.5 relative">
                {item.icon}
                {!!item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center leading-none tabular-nums">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight whitespace-nowrap truncate max-w-full">
                {t(item.labelKey, item.fallback)}
              </span>
            </button>
          );
        })}

        <button
          onClick={onOpenMoreMenu}
          className="relative flex flex-col items-center justify-center min-h-[46px] px-1 rounded-xl text-[#5C746C] dark:text-[#8FA69E] hover:text-[#042B25] dark:hover:text-[#F8F5EC] transition-colors cursor-pointer"
          aria-label={t('allSections', 'Boʻlimlar')}
        >
          <div className="mb-0.5 relative">
            <LayoutGrid className="w-5 h-5 text-[#C6A45C]" />
            {unreadMessagesCount > 0 && (
              <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[#063D32] dark:bg-[#C6A45C] text-white dark:text-[#042B25] text-[9px] font-bold flex items-center justify-center leading-none tabular-nums">
                {unreadMessagesCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-semibold tracking-tight whitespace-nowrap truncate max-w-full">
            {t('allSections', 'Boʻlimlar')}
          </span>
        </button>
      </div>
    </nav>
  );
};
