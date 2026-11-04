import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavigationTab } from '../../types';
import { Home, BookOpen, Clock, FileText, Bell, MoreHorizontal } from 'lucide-react';

interface MobileNavProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onOpenMoreMenu: () => void;
  unreadNotificationsCount?: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenMoreMenu,
  unreadNotificationsCount = 0,
}) => {
  const { t } = useTranslation('navigation');

  const items: { id: NavigationTab; labelKey: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'home', labelKey: 'home', icon: <Home className="w-5 h-5" /> },
    { id: 'prayer', labelKey: 'prayer', icon: <Clock className="w-5 h-5" /> },
    { id: 'quran', labelKey: 'quran', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'articles', labelKey: 'articles', icon: <FileText className="w-5 h-5" /> },
    { id: 'notifications', labelKey: 'notifications', icon: <Bell className="w-5 h-5" />, badge: unreadNotificationsCount },
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
              <div className="mb-0.5 relative">
                {item.icon}
                {!!item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight whitespace-nowrap">
                {t(item.labelKey, item.id === 'notifications' ? 'Xabarlar' : item.id === 'articles' ? 'Maqolalar' : item.labelKey)}
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
