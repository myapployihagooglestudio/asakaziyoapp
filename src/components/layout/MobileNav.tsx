import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavigationTab } from '../../types';
import { Home, BookOpen, Clock, Sparkles, MoreHorizontal } from 'lucide-react';

interface MobileNavProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onOpenMoreMenu: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenMoreMenu,
}) => {
  const { t } = useTranslation('navigation');

  const items: { id: NavigationTab; labelKey: string; icon: React.ReactNode }[] = [
    { id: 'home', labelKey: 'home', icon: <Home className="w-5 h-5" /> },
    { id: 'quran', labelKey: 'quran', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'prayer', labelKey: 'prayer', icon: <Clock className="w-5 h-5" /> },
    { id: 'dhikr', labelKey: 'dhikr', icon: <Sparkles className="w-5 h-5" /> },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#071614]/95 backdrop-blur-md border-t border-stone-200 dark:border-emerald-950/80 px-2 py-1.5 transition-colors"
      style={{ maxHeight: '12vh' }}
      aria-label="Mobil tezkor navigatsiya"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {items.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg transition-colors cursor-pointer min-w-[56px] ${
                isActive
                  ? 'text-[#c5a869] font-medium'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <div className="mb-0.5">{item.icon}</div>
              <span className="text-[10px] tracking-tight whitespace-nowrap">
                {t(item.labelKey)}
              </span>
            </button>
          );
        })}
        <button
          onClick={onOpenMoreMenu}
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 transition-colors cursor-pointer min-w-[56px]"
          aria-label={t('allSections', 'Boʻlimlar')}
        >
          <div className="mb-0.5">
            <MoreHorizontal className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight whitespace-nowrap">
            {t('allSections', 'Boʻlimlar')}
          </span>
        </button>
      </div>
    </nav>
  );
};
