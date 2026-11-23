import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { NavigationTab } from '../../types';
import { LanguageSelector } from '../ui/LanguageSelector';
import { PREMIUM_EASE } from '../ui/MotionPrimitives';
import {
  Shield,
  Bookmark,
  Settings as SettingsIcon,
  Download,
  Smartphone,
  MessageSquare,
  Bell,
  MessageSquareText,
  User,
  Search,
  Tv,
  Sun,
  Moon,
  Monitor,
  Sparkles,
  Grid2x2,
  X,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface HeaderProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  favoritesCount: number;
  unreadNotificationsCount?: number;
  unreadMessagesCount?: number;
  theme?: 'dark' | 'light' | 'system';
  onToggleTheme?: () => void;
  onOpenInstallModal?: () => void;
  onOpenChatModal?: () => void;
  onOpenSearch?: () => void;
  onOpenTvMode?: () => void;
}

const SECTION_META: Partial<Record<NavigationTab, { labelKey: string; fallback: string }>> = {
  home: { labelKey: 'home', fallback: 'Bosh sahifa' },
  prayer: { labelKey: 'prayer', fallback: 'Namoz vaqtlari' },
  quran: { labelKey: 'quran', fallback: 'Qurʼoni Karim' },
  hadith: { labelKey: 'hadith', fallback: 'Hadislar' },
  dhikr: { labelKey: 'dhikr', fallback: 'Zikr va duolar' },
  ai_assistant: { labelKey: 'ai_assistant', fallback: 'AI Ustoz' },
  hifz_istiqomat: { labelKey: 'hifz_istiqomat', fallback: 'Hifz va Istiqomat' },
  academy: { labelKey: 'academy', fallback: 'Qurʼon Akademiyasi' },
  articles: { labelKey: 'articles', fallback: 'Maqolalar' },
  library: { labelKey: 'library', fallback: 'Kutubxona' },
  scholars: { labelKey: 'scholars', fallback: 'Ulamolar' },
  mosques: { labelKey: 'mosques', fallback: 'Masjidlar' },
  media_center: { labelKey: 'media_center', fallback: 'Media Markaz' },
  calendar: { labelKey: 'calendar', fallback: 'Hijriy Taqvim' },
  admin: { labelKey: 'admin', fallback: 'Admin Konsol' },
  settings: { labelKey: 'settings', fallback: 'Sozlamalar' },
  profile: { labelKey: 'profile', fallback: 'Profil' },
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  favoritesCount,
  unreadNotificationsCount = 0,
  unreadMessagesCount = 0,
  theme = 'dark',
  onToggleTheme,
  onOpenInstallModal,
  onOpenChatModal,
  onOpenSearch,
  onOpenTvMode,
}) => {
  const { t } = useTranslation(['navigation', 'common']);
  const [toolsOpen, setToolsOpen] = useState(false);
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();

  const handleNavClick = (tab: NavigationTab) => {
    onSelectTab(tab);
    setToolsOpen(false);
  };

  const activeSection = SECTION_META[activeTab];

  const getThemeIcon = () => {
    if (theme === 'light') return <Sun className="w-[17px] h-[17px] text-[#064E3B]" />;
    if (theme === 'system') return <Monitor className="w-[17px] h-[17px] text-[#C8A85E]" />;
    return <Moon className="w-[17px] h-[17px] text-[#C8A85E]" />;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#064E3B]/10 dark:border-white/[0.07] bg-[#F7F5F0]/86 dark:bg-[#060B09]/84 backdrop-blur-2xl pt-safe transition-colors">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2.5 sm:gap-4 h-16">
          {/* Zone 1: Minimalist Brand Identity + Live Active Section Context */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => handleNavClick('home')}
              className="group flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 cursor-pointer min-h-[42px]"
            >
              <div className="relative w-9 h-9 rounded-2xl overflow-hidden bg-white ring-1 ring-[#064E3B]/15 dark:ring-white/15 shadow-xs transition-transform duration-200 group-hover:scale-[1.03]">
                <img
                  src="/assets/aistudio/IMG_20261114_084331_924_8f6ccba1.jpg"
                  alt="ASAKA ZIYO"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-display text-[15px] font-extrabold tracking-[-0.02em] text-[#0B1B16] dark:text-[#F7F5F0] leading-none">
                  {t('common:appName', 'ASAKA ZIYO')}
                </span>
                <span className="hidden sm:inline-block text-[10px] tracking-[0.06em] text-[#5F776F] dark:text-[#8FA69D] mt-1 font-medium">
                  Asaka · Islomiy Ekotizim
                </span>
              </div>
            </button>

            {activeSection && activeTab !== 'home' && (
              <div className="hidden md:flex items-center gap-2.5 pl-3 border-l border-[#064E3B]/12 dark:border-white/[0.1] min-w-0">
                <span className="text-xs font-semibold text-[#334F46] dark:text-[#C5D4CE] truncate">
                  {t(`navigation:${activeSection.labelKey}`, activeSection.fallback)}
                </span>
              </div>
            )}
          </div>

          {/* Zone 2: Center Interactive Command Bar (2026 Apple/Linear/Raycast UX) */}
          {onOpenSearch && (
            <button
              type="button"
              onClick={onOpenSearch}
              className="hidden md:flex items-center justify-between gap-3 flex-1 max-w-md h-10 px-3.5 rounded-2xl border border-[#064E3B]/12 dark:border-white/[0.09] bg-white/80 dark:bg-white/[0.04] hover:bg-white dark:hover:bg-white/[0.07] hover:border-[#064E3B]/25 dark:hover:border-white/[0.18] text-left transition-all cursor-pointer group"
              aria-label="Global Qidiruv (Ctrl+K)"
            >
              <span className="flex items-center gap-2.5 text-xs text-[#5F776F] dark:text-[#8FA69D] group-hover:text-[#0B1B16] dark:group-hover:text-[#E8E4DA] truncate">
                <Search className="w-3.5 h-3.5 shrink-0 text-[#064E3B] dark:text-emerald-400" />
                <span className="truncate">Qurʼon, hadis, namoz yoki boʻlim qidirish...</span>
              </span>
              <kbd className="hidden lg:inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-[#F2EFE9] dark:bg-white/[0.07] border border-[#064E3B]/10 dark:border-white/[0.08] text-[10px] font-mono-numbers font-semibold text-[#5F776F] dark:text-[#9AB0A7] shrink-0">
                ⌘K
              </kbd>
            </button>
          )}

          {/* Zone 3: Calm, High-Craft Utility Cluster */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {onOpenSearch && (
              <button
                type="button"
                onClick={onOpenSearch}
                className="md:hidden min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-[#334F46] dark:text-[#D4DDD8] hover:bg-[#064E3B]/7 dark:hover:bg-white/[0.07] transition-colors cursor-pointer"
                aria-label="Global Qidiruv"
              >
                <Search className="w-[18px] h-[18px]" />
              </button>
            )}

            <button
              type="button"
              onClick={() => handleNavClick('ai_assistant')}
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 min-h-[38px] rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'ai_assistant'
                  ? 'bg-[#064E3B] text-[#F7F5F0] dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-500/30'
                  : 'bg-[#064E3B]/8 text-[#064E3B] hover:bg-[#064E3B]/14 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/18'
              }`}
              title="ASAKA ZIYO AI Ustoz"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">AI Ustoz</span>
            </button>

            <LanguageSelector variant="compact" />

            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl border border-[#064E3B]/10 dark:border-white/[0.09] bg-white/75 dark:bg-white/[0.04] hover:border-[#064E3B]/25 dark:hover:border-white/[0.2] transition-colors cursor-pointer"
                title={
                  theme === 'dark'
                    ? 'Mavzu: Qorongʻi'
                    : theme === 'light'
                    ? 'Mavzu: Yorugʻ'
                    : 'Mavzu: Tizim'
                }
                aria-label="Mavzuni almashtirish"
              >
                {getThemeIcon()}
              </button>
            )}

            {/* Notifications */}
            <button
              type="button"
              onClick={() => handleNavClick('notifications')}
              className={`relative min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
                activeTab === 'notifications'
                  ? 'bg-[#064E3B]/10 text-[#064E3B] dark:bg-white/[0.1] dark:text-white'
                  : 'text-[#334F46] dark:text-[#C5D4CE] hover:bg-[#064E3B]/7 dark:hover:bg-white/[0.07]'
              }`}
              aria-label="Bildirishnomalar"
              title="Bildirishnomalar"
            >
              <Bell className="w-[18px] h-[18px]" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center leading-none tabular-nums">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Quick Workspace Tools Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setToolsOpen((prev) => !prev)}
                className={`relative min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl border transition-colors cursor-pointer ${
                  toolsOpen
                    ? 'bg-[#064E3B] text-white border-[#064E3B] dark:bg-white/15 dark:border-white/25'
                    : 'border-[#064E3B]/10 dark:border-white/[0.09] bg-white/75 dark:bg-white/[0.04] text-[#334F46] dark:text-[#D4DDD8] hover:border-[#064E3B]/25 dark:hover:border-white/[0.2]'
                }`}
                aria-label="Tezkor xizmatlar va vositalar"
                title="Tezkor vositalar (TV, APK, Sevimlilar, Admin)"
              >
                {toolsOpen ? <X className="w-4 h-4" /> : <Grid2x2 className="w-4 h-4" />}
                {!toolsOpen && (unreadMessagesCount > 0 || favoritesCount > 0) && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
              </button>

              <AnimatePresence>
                {toolsOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setToolsOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      transition={{ duration: 0.18, ease: PREMIUM_EASE }}
                      className="absolute right-0 mt-2.5 w-72 rounded-3xl bg-[#FAF8F4] dark:bg-[#0D1714] border border-[#064E3B]/12 dark:border-white/[0.1] shadow-[0_28px_70px_-14px_rgba(0,0,0,0.55)] p-3 z-40 space-y-2"
                    >
                      <div className="px-2.5 pt-1 pb-2 border-b border-[#064E3B]/8 dark:border-white/[0.07] flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#5F776F] dark:text-[#8FA69D]">
                          Platforma vositalari
                        </span>
                        <span className="text-[10px] font-mono-numbers text-emerald-600 dark:text-emerald-400 font-semibold">
                          v4.0
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        {onOpenInstallModal && (
                          <button
                            type="button"
                            onClick={() => {
                              setToolsOpen(false);
                              onOpenInstallModal();
                            }}
                            className="flex flex-col items-start gap-1.5 p-3 rounded-2xl bg-[#064E3B] text-[#F7F5F0] dark:bg-[#C8A85E] dark:text-[#07110D] font-bold text-xs cursor-pointer hover:brightness-105 transition-all"
                          >
                            <Download className="w-4 h-4" />
                            <span>Android APK</span>
                          </button>
                        )}
                        {onOpenTvMode && (
                          <button
                            type="button"
                            onClick={() => {
                              setToolsOpen(false);
                              onOpenTvMode();
                            }}
                            className="flex flex-col items-start gap-1.5 p-3 rounded-2xl bg-[#F2EFE9] dark:bg-white/[0.06] text-[#0B1B16] dark:text-[#F7F5F0] border border-[#064E3B]/10 dark:border-white/[0.08] font-semibold text-xs cursor-pointer hover:border-[#064E3B]/25 dark:hover:border-white/20 transition-all"
                          >
                            <Tv className="w-4 h-4 text-[#064E3B] dark:text-[#C8A85E]" />
                            <span>Masjid TV</span>
                          </button>
                        )}
                      </div>

                      {!isInstalled && (isInstallable || isIOS) && (
                        <button
                          type="button"
                          onClick={() => {
                            setToolsOpen(false);
                            if (isInstallable) {
                              promptInstall();
                            } else {
                              onOpenInstallModal?.();
                            }
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-emerald-600/12 text-emerald-800 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-600/18 transition-colors cursor-pointer"
                        >
                          <Smartphone className="w-4 h-4 shrink-0" />
                          <span>Ilovani ekranga oʻrnatish (PWA)</span>
                        </button>
                      )}

                      <div className="space-y-0.5 pt-1">
                        {[
                          {
                            id: 'messages' as NavigationTab,
                            label: 'Rasmiy Xabarlar kanali',
                            icon: <MessageSquareText className="w-4 h-4" />,
                            badge: unreadMessagesCount,
                          },
                          {
                            id: 'favorites' as NavigationTab,
                            label: t('navigation:favorites', 'Sevimlilar'),
                            icon: <Bookmark className="w-4 h-4" />,
                            badge: favoritesCount,
                          },
                          {
                            id: 'profile' as NavigationTab,
                            label: 'Shaxsiy profil',
                            icon: <User className="w-4 h-4" />,
                          },
                          {
                            id: 'settings' as NavigationTab,
                            label: t('navigation:settings', 'Sozlamalar'),
                            icon: <SettingsIcon className="w-4 h-4" />,
                          },
                          {
                            id: 'admin' as NavigationTab,
                            label: t('navigation:admin', 'Maʼmuriyat konsoli'),
                            icon: <Shield className="w-4 h-4 text-[#C8A85E]" />,
                          },
                        ].map((row) => (
                          <button
                            key={row.id}
                            type="button"
                            onClick={() => handleNavClick(row.id)}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-medium text-[#1E3A32] dark:text-[#D4DDD8] hover:bg-[#064E3B]/7 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5">
                              {row.icon}
                              <span>{row.label}</span>
                            </span>
                            {row.badge ? (
                              <span className="px-1.5 py-0.5 rounded-md bg-[#064E3B] dark:bg-emerald-500/20 text-white dark:text-emerald-300 text-[10px] font-mono-numbers font-bold">
                                {row.badge}
                              </span>
                            ) : null}
                          </button>
                        ))}
                        {onOpenChatModal && (
                          <button
                            type="button"
                            onClick={() => {
                              setToolsOpen(false);
                              onOpenChatModal();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-[#1E3A32] dark:text-[#D4DDD8] hover:bg-[#064E3B]/7 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                          >
                            <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>Maʼmuriyatga murojaat</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
