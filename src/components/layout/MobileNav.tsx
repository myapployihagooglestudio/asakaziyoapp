import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { NavigationTab } from '../../types';
import { Home, BookOpen, Clock, Sparkles, Newspaper, LayoutGrid } from 'lucide-react';

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
    { id: 'articles', labelKey: 'articles', fallback: 'Maqolalar', icon: <Newspaper className="w-5 h-5" /> },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FFF8E8]/95 dark:bg-[#010906]/94 backdrop-blur-2xl border-t border-[#063D32]/15 dark:border-[#DFBD69]/32 px-1.5 pt-1.5 pb-safe transition-colors shadow-[0_-10px_32px_rgba(3,23,15,0.1)] dark:shadow-[0_-12px_38px_rgba(0,0,0,0.78)]"
      aria-label="Mobil tezkor navigatsiya"
    >
      <div className="grid grid-cols-6 items-center max-w-lg mx-auto h-14">
        {items.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`relative flex flex-col items-center justify-center min-h-[46px] px-1 rounded-xl transition-colors cursor-pointer ${
                isActive
                  ? 'text-[#063D32] dark:text-[#FFF6C8] font-extrabold'
                  : 'text-[#526B62] dark:text-[#9CB5AC] hover:text-[#03170F] dark:hover:text-[#FFF8E8]'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="mobile-nav-active-pill"
                  className="absolute inset-x-1.5 inset-y-0.5 rounded-xl bg-[#063D32]/12 dark:bg-[#DFBD69]/18 border border-[#063D32]/25 dark:border-[#DFBD69]/45 shadow-[0_0_14px_rgba(223,189,105,0.2)] -z-10"
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
          className="relative flex flex-col items-center justify-center min-h-[46px] px-1 rounded-xl text-[#526B62] dark:text-[#9CB5AC] hover:text-[#03170F] dark:hover:text-[#FFF8E8] transition-colors cursor-pointer"
          aria-label={t('allSections', 'Boʻlimlar')}
        >
          <div className="mb-0.5 relative">
            <LayoutGrid className="w-5 h-5 text-[#DFBD69]" />
            {unreadMessagesCount > 0 && (
              <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[#063D32] dark:bg-[#DFBD69] text-white dark:text-[#010906] text-[9px] font-extrabold flex items-center justify-center leading-none tabular-nums">
                {unreadMessagesCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold tracking-tight whitespace-nowrap truncate max-w-full text-[#8A6621] dark:text-[#DFBD69]">
            {t('allSections', 'Boʻlimlar')}
          </span>
        </button>
      </div>
    </nav>
  );
};

