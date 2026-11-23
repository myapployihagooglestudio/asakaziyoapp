import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavigationTab } from '../../types';
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
} from 'lucide-react';

interface DesktopSidebarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onOpenTvMode?: () => void;
}

interface SidebarSection {
  title: string;
  items: { id: NavigationTab; labelKey: string; fallback: string; icon: React.ReactNode }[];
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenTvMode,
}) => {
  const { t } = useTranslation('navigation');

  const sections: SidebarSection[] = [
    {
      title: 'Asosiy',
      items: [
        { id: 'home', labelKey: 'home', fallback: 'Bosh sahifa', icon: <Home className="w-4 h-4" /> },
        { id: 'prayer', labelKey: 'prayer', fallback: 'Namoz vaqtlari', icon: <Clock className="w-4 h-4" /> },
        { id: 'quran', labelKey: 'quran', fallback: 'Qurʼon Markazi', icon: <BookOpen className="w-4 h-4" /> },
        { id: 'hadith', labelKey: 'hadith', fallback: 'Hadislar', icon: <ScrollText className="w-4 h-4" /> },
        { id: 'dhikr', labelKey: 'dhikr', fallback: 'Zikr va Duolar', icon: <Sparkles className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Qurʼon Taʼlimi',
      items: [
        { id: 'hifz_istiqomat', labelKey: 'hifz_istiqomat', fallback: 'Hifz va Istiqomat', icon: <Flame className="w-4 h-4" /> },
        { id: 'academy', labelKey: 'academy', fallback: 'Qurʼon Akademiyasi', icon: <GraduationCap className="w-4 h-4" /> },
        { id: 'khatm_planner', labelKey: 'khatm_planner', fallback: 'Xatm Rejasi', icon: <BookOpen className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Kutubxona va Media',
      items: [
        { id: 'scholars', labelKey: 'scholars', fallback: 'Ulamolar', icon: <Users className="w-4 h-4" /> },
        { id: 'library', labelKey: 'library', fallback: 'Elektron Kutubxona', icon: <Library className="w-4 h-4" /> },
        { id: 'media_center', labelKey: 'media_center', fallback: 'Media Markaz', icon: <Headphones className="w-4 h-4" /> },
        { id: 'articles', labelKey: 'articles', fallback: 'Maqolalar', icon: <Newspaper className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Islomiy Xizmatlar',
      items: [
        { id: 'mosques', labelKey: 'mosques', fallback: 'Masjidlar va Qibla', icon: <MapPin className="w-4 h-4" /> },
        { id: 'ask_imam', labelKey: 'ask_imam', fallback: 'Diniy Savol-Javob', icon: <MessageCircleQuestion className="w-4 h-4" /> },
        { id: 'calendar', labelKey: 'calendar', fallback: 'Hijriy Taqvim', icon: <Calendar className="w-4 h-4" /> },
        { id: 'ai_assistant', labelKey: 'ai_assistant', fallback: 'AI Yordamchi', icon: <Bot className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Shaxsiy va Boshqaruv',
      items: [
        { id: 'favorites', labelKey: 'favorites', fallback: 'Sevimlilar', icon: <Bookmark className="w-4 h-4" /> },
        { id: 'settings', labelKey: 'settings', fallback: 'Sozlamalar', icon: <Settings className="w-4 h-4" /> },
        { id: 'admin', labelKey: 'admin', fallback: 'Admin Portal', icon: <Shield className="w-4 h-4" /> },
      ],
    },
  ];

  return (
    <aside
      aria-label="Asosiy yon navigatsiya"
      className="hidden xl:flex flex-col w-64 shrink-0 border-r border-[#063D32]/12 dark:border-[#DFBD69]/20 bg-[#FFF8E8]/60 dark:bg-[#02120B]/80 px-3 py-5 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto"
    >
      <div className="space-y-6">
        {sections.map((sec) => (
          <div key={sec.title} className="space-y-1">
            <div className="px-3 text-[11px] font-bold tracking-wider uppercase text-[#526B62] dark:text-[#9CB5AC]">
              {sec.title}
            </div>
            {sec.items.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 min-h-[40px] rounded-xl text-sm font-medium transition-colors cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-[#DFBD69] ${
                    isActive
                      ? 'bg-[#063D32] text-[#FFF8E8] dark:bg-[#DFBD69] dark:text-[#010906] font-bold shadow-xs'
                      : 'text-[#1E3F35] dark:text-[#E6DFCE] hover:bg-[#063D32]/8 dark:hover:bg-[#092E1F]'
                  }`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="truncate">{t(item.labelKey, item.fallback)}</span>
                </button>
              );
            })}
          </div>
        ))}

        {onOpenTvMode && (
          <div className="pt-3 border-t border-[#063D32]/12 dark:border-[#DFBD69]/20">
            <button
              onClick={onOpenTvMode}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 min-h-[42px] rounded-xl bg-[#092E1F] text-[#FFF6C8] border border-[#DFBD69]/40 text-xs font-bold hover:border-[#DFBD69] transition-colors cursor-pointer"
            >
              <Tv className="w-4 h-4 text-[#DFBD69]" />
              <span>Masjid TV Tablosi</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
