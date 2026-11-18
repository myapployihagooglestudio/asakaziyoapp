import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { NavigationTab } from '../../types';
import { IslamicStarEmblem } from '../ui/GeometricPattern';
import { LanguageSelector } from '../ui/LanguageSelector';
import {
  Menu,
  X,
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
  LayoutGrid,
  ChevronDown,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [ecosystemDropdownOpen, setEcosystemDropdownOpen] = useState(false);
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();

  const primaryLinks: { id: NavigationTab; labelKey: string }[] = [
    { id: 'home', labelKey: 'home' },
    { id: 'prayer', labelKey: 'prayer' },
    { id: 'quran', labelKey: 'quran' },
    { id: 'hadith', labelKey: 'hadith' },
    { id: 'dhikr', labelKey: 'dhikr' },
    { id: 'articles', labelKey: 'articles' },
  ];

  const secondaryLinks: { id: NavigationTab; labelKey: string }[] = [
    { id: 'ai_assistant', labelKey: 'ai_assistant' },
    { id: 'news', labelKey: 'news' },
    { id: 'announcements', labelKey: 'announcements' },
    { id: 'quiz', labelKey: 'quiz' },
    { id: 'quran_quiz', labelKey: 'quran_quiz' },
    { id: 'calendar', labelKey: 'calendar' },
    { id: 'khatm_planner', labelKey: 'khatm_planner' },
    { id: 'prayer_journal', labelKey: 'prayer_journal' },
    { id: 'mosque_events', labelKey: 'mosque_events' },
    { id: 'library', labelKey: 'library' },
    { id: 'ask_imam', labelKey: 'ask_imam' },
    { id: 'fasting', labelKey: 'fasting' },
    { id: 'achievements', labelKey: 'achievements' },
  ];

  const allMobileLinks: { id: NavigationTab; labelKey: string }[] = [
    ...primaryLinks,
    { id: 'search', labelKey: 'search' },
    { id: 'messages', labelKey: 'messages' },
    ...secondaryLinks,
    { id: 'favorites', labelKey: 'favorites' },
    { id: 'settings', labelKey: 'settings' },
    { id: 'admin', labelKey: 'admin' },
  ];

  const handleNavClick = (tab: NavigationTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
    setEcosystemDropdownOpen(false);
  };

  const getThemeIcon = () => {
    if (theme === 'light') return <Sun className="w-[17px] h-[17px] text-[#063D32]" />;
    if (theme === 'system') return <Monitor className="w-[17px] h-[17px] text-[#C6A45C]" />;
    return <Moon className="w-[17px] h-[17px] text-[#C6A45C]" />;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#063D32]/15 dark:border-[#DFBD69]/28 bg-[#FFF8E8]/92 dark:bg-[#010906]/90 backdrop-blur-2xl transition-colors shadow-[0_8px_30px_rgba(1,9,6,0.06)] dark:shadow-[0_10px_36px_rgba(0,0,0,0.65)]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 sm:gap-4 h-16">
          {/* Zone 1: Architectural Brand Identity with Official Mosque Emblem */}
          <button
            onClick={() => handleNavClick('home')}
            className="group flex items-center gap-2.5 text-left text-[#03170F] dark:text-[#FFF8E8] whitespace-nowrap shrink-0 focus-visible:outline-none cursor-pointer min-h-[42px]"
          >
            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[radial-gradient(circle_at_30%_25%,#092E1F_0%,#041D13_60%,#010906_100%)] flex items-center justify-center border-2 border-[#DFBD69]/80 group-hover:border-[#FFF6C8] transition-all shadow-[0_4px_16px_rgba(212,175,55,0.32),inset_0_1px_0_rgba(255,246,200,0.3)]">
              <img
                src="/assets/aistudio/file_0000000087dc8246a5c928f8312a5a0e_6755725a.png"
                alt="ASAKA ZIYO Official Brand Logo"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-sm sm:text-base font-extrabold tracking-[0.14em] text-[#03170F] dark:text-[#FFF8E8] group-hover:text-[#063D32] dark:group-hover:text-[#DFBD69] transition-colors leading-none">
                {t('common:appName', 'ASAKA ZIYO')}
              </span>
              <span className="hidden sm:inline-block text-[9px] uppercase tracking-[0.2em] text-[#8A6621] dark:text-[#DFBD69]/90 mt-1 font-bold">
                MuhammadSolih Hoji Jomeʼ Masjidi
              </span>
            </div>
          </button>

          {/* Zone 2: Desktop Primary Navigation with Animated Metallic Gold Indicator */}
          <nav
            className="hidden lg:flex items-center gap-1 xl:gap-1.5 text-sm font-semibold text-[#1E3F35] dark:text-[#E6DFCE]"
            aria-label={t('navigation:navigationMenu', 'Asosiy menyu')}
          >
            {primaryLinks.map((link) => {
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => handleNavClick(link.id)}
                  className={`relative px-3.5 py-2 rounded-xl whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                    isActive
                      ? 'text-[#063D32] dark:text-[#FFF6C8] font-bold bg-[#063D32]/8 dark:bg-[#DFBD69]/12'
                      : 'hover:text-[#03170F] dark:hover:text-[#FFF8E8] hover:bg-[#063D32]/5 dark:hover:bg-white/5'
                  }`}
                >
                  {t(`navigation:${link.labelKey}`)}
                  {isActive && (
                    <motion.span
                      layoutId="header-active-indicator"
                      className="absolute bottom-0.5 left-3 right-3 h-[2.5px] az-gold-foil-bg rounded-full shadow-[0_0_10px_rgba(223,189,105,0.75)]"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    />
                  )}
                </button>
              );
            })}

            {/* Ecosystem Modules Megamenu Trigger */}
            <div className="relative pl-1.5 ml-1 border-l border-[#063D32]/15 dark:border-[#DFBD69]/25">
              <button
                onClick={() => setEcosystemDropdownOpen((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
                  secondaryLinks.some((s) => s.id === activeTab) || ecosystemDropdownOpen
                    ? 'bg-[#063D32] text-[#FFF8E8] dark:bg-[#DFBD69]/20 dark:text-[#FFF6C8] border border-[#DFBD69]/55 shadow-[0_0_16px_rgba(223,189,105,0.2)]'
                    : 'text-[#1E3F35] dark:text-[#E6DFCE] hover:bg-[#063D32]/8 dark:hover:bg-white/5 border border-transparent'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 text-[#DFBD69]" />
                <span>Ekotizim</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    ecosystemDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {ecosystemDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setEcosystemDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2.5 w-[460px] rounded-2xl bg-[#FFF8E8] dark:bg-[linear-gradient(155deg,#041D13_0%,#03170F_60%,#010906_100%)] border border-[#DFBD69]/45 shadow-[0_28px_70px_rgba(0,0,0,0.85)] p-4 z-40 animate-scale-up">
                    <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#063D32]/12 dark:border-[#DFBD69]/25">
                      <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#063D32] dark:text-[#DFBD69]">
                        ASAKA ZIYO — Barcha Xizmatlar va Boʻlimlar
                      </span>
                      <span className="text-[10px] font-mono-numbers text-[#526B62] dark:text-[#9CB5AC]">
                        13 ta modul
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {secondaryLinks.map((link) => {
                        const isActive = activeTab === link.id;
                        return (
                          <button
                            key={link.id}
                            onClick={() => handleNavClick(link.id)}
                            className={`text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                              isActive
                                ? 'az-gold-foil-bg text-[#010906] font-extrabold shadow-md'
                                : 'text-[#03170F] dark:text-[#FFF8E8] hover:bg-[#F1EBDD] dark:hover:bg-[#092E1F]/70 border border-transparent hover:border-[#DFBD69]/30'
                            }`}
                          >
                            <span className="truncate">{t(`navigation:${link.labelKey}`)}</span>
                            <span className={isActive ? 'text-[#010906]' : 'text-[#DFBD69]'}>→</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </nav>

          {/* Zone 3: Quick Utility Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {!isInstalled && (isInstallable || isIOS) && (
              <button
                onClick={isInstallable ? promptInstall : onOpenInstallModal}
                className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-bold rounded-xl bg-emerald-700/85 hover:bg-emerald-600 text-white transition-all shadow-xs cursor-pointer whitespace-nowrap border border-emerald-400/30"
                title="ASAKA ZIYO Bosh Ekranga Oʻrnatish (PWA)"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-300" />
                <span>Oʻrnatish (PWA)</span>
              </button>
            )}

            {onOpenInstallModal && (
              <button
                onClick={onOpenInstallModal}
                className="flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-extrabold rounded-xl az-gold-foil-bg text-[#010906] hover:brightness-105 transition-all shadow-[0_4px_14px_rgba(212,175,55,0.35)] cursor-pointer whitespace-nowrap border border-[#FFF6C8]/60"
                title="ASAKA ZIYO Android APK v3.0.0 va Oflayn Markaz"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">APK</span>
                <span className="hidden sm:inline">v3.0.0</span>
              </button>
            )}

            {onOpenTvMode && (
              <button
                onClick={onOpenTvMode}
                className="flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] rounded-xl border border-[#DFBD69]/45 bg-[#063D32]/10 dark:bg-[#092E1F]/70 text-[#063D32] dark:text-[#FFF6C8] hover:border-[#FFF6C8] hover:bg-[#DFBD69]/20 transition-all cursor-pointer text-xs font-bold"
                title="Masjid Jamoat Ekrani va Smart TV Rejimi (Shift+T)"
                aria-label="Masjid Jamoat Ekrani va Smart TV Rejimi"
              >
                <Tv className="w-4 h-4 text-[#DFBD69]" />
                <span className="hidden md:inline">Masjid TV</span>
              </button>
            )}

            {onOpenSearch && (
              <button
                onClick={onOpenSearch}
                className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl text-[#1E3F35] dark:text-[#E6DFCE] hover:bg-[#063D32]/8 dark:hover:bg-white/8 transition-colors cursor-pointer"
                title="Global Qidiruv (Ctrl+K)"
                aria-label="Global Qidiruv"
              >
                <Search className="w-[18px] h-[18px]" />
              </button>
            )}

            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl border border-[#063D32]/15 dark:border-[#DFBD69]/30 bg-[#F1EBDD]/80 dark:bg-[#041D13] hover:border-[#DFBD69] transition-colors cursor-pointer"
                title={
                  theme === 'dark'
                    ? 'Mavzu: Qorongʻi (Yorugʻ rejimga oʻtish)'
                    : theme === 'light'
                    ? 'Mavzu: Yorugʻ (Tizim rejimiga oʻtish)'
                    : 'Mavzu: Tizim avto (Qorongʻi rejimga oʻtish)'
                }
                aria-label="Mavzuni almashtirish"
              >
                {getThemeIcon()}
              </button>
            )}

            <LanguageSelector variant="compact" />

            {onOpenChatModal && (
              <button
                onClick={onOpenChatModal}
                className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] text-xs font-bold rounded-xl border border-[#DFBD69]/45 text-[#063D32] dark:text-[#DFBD69] hover:bg-[#DFBD69]/15 transition-colors cursor-pointer whitespace-nowrap"
                title="Maʼmuriyat bilan muloqot va savol-javob"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Savol</span>
              </button>
            )}

            {/* Messages / Channel feed button */}
            <button
              onClick={() => handleNavClick('messages')}
              className={`relative min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl text-[#1E3F35] dark:text-[#E6DFCE] hover:bg-[#063D32]/8 dark:hover:bg-white/8 transition-colors cursor-pointer ${
                activeTab === 'messages' ? 'text-[#063D32] dark:text-[#DFBD69] bg-[#063D32]/10 dark:bg-white/8' : ''
              }`}
              title="Rasmiy Xabarlar & Yangiliklar kanali"
              aria-label="Rasmiy Xabarlar kanali"
            >
              <MessageSquareText className="w-[18px] h-[18px]" />
              {unreadMessagesCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[#063D32] dark:bg-[#DFBD69] text-white dark:text-[#010906] text-[9px] font-extrabold flex items-center justify-center leading-none tabular-nums">
                  {unreadMessagesCount}
                </span>
              )}
            </button>

            {/* User Profile button */}
            <button
              onClick={() => handleNavClick('profile')}
              className={`hidden sm:flex relative min-w-[38px] min-h-[38px] items-center justify-center rounded-xl text-[#1E3F35] dark:text-[#E6DFCE] hover:bg-[#063D32]/8 dark:hover:bg-white/8 transition-colors cursor-pointer ${
                activeTab === 'profile' ? 'text-[#063D32] dark:text-[#DFBD69] bg-[#063D32]/10 dark:bg-white/8' : ''
              }`}
              title="Shaxsiy Akkaunt & Profil"
              aria-label="Shaxsiy Akkaunt & Profil"
            >
              <User className="w-[18px] h-[18px]" />
            </button>

            {/* Notifications button */}
            <button
              onClick={() => handleNavClick('notifications')}
              className={`relative min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl text-[#1E3F35] dark:text-[#E6DFCE] hover:bg-[#063D32]/8 dark:hover:bg-white/8 transition-colors cursor-pointer ${
                activeTab === 'notifications' ? 'text-[#063D32] dark:text-[#DFBD69] bg-[#063D32]/10 dark:bg-white/8' : ''
              }`}
              title="Bildirishnomalar markazi"
              aria-label="Bildirishnomalar markazi"
            >
              <Bell className="w-[18px] h-[18px]" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center leading-none tabular-nums">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Desktop Favorites */}
            <button
              onClick={() => handleNavClick('favorites')}
              className={`hidden md:flex relative min-w-[38px] min-h-[38px] items-center justify-center rounded-xl text-[#1E3F35] dark:text-[#E6DFCE] hover:bg-[#063D32]/8 dark:hover:bg-white/8 transition-colors cursor-pointer ${
                activeTab === 'favorites' ? 'text-[#063D32] dark:text-[#DFBD69] bg-[#063D32]/10 dark:bg-white/8' : ''
              }`}
              title={t('navigation:favorites', 'Sevimlilar')}
            >
              <Bookmark className="w-[18px] h-[18px]" />
              {favoritesCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[#063D32] dark:bg-[#DFBD69] text-white dark:text-[#010906] text-[9px] font-extrabold flex items-center justify-center tabular-nums">
                  {favoritesCount}
                </span>
              )}
            </button>

            {/* Desktop Settings */}
            <button
              onClick={() => handleNavClick('settings')}
              className={`hidden md:flex min-w-[38px] min-h-[38px] items-center justify-center rounded-xl text-[#1E3F35] dark:text-[#E6DFCE] hover:bg-[#063D32]/8 dark:hover:bg-white/8 transition-colors cursor-pointer ${
                activeTab === 'settings' ? 'text-[#063D32] dark:text-[#DFBD69] bg-[#063D32]/10 dark:bg-white/8' : ''
              }`}
              title={t('navigation:settings', 'Sozlamalar')}
            >
              <SettingsIcon className="w-[18px] h-[18px]" />
            </button>

            {/* Admin entry point (desktop) */}
            <button
              onClick={() => handleNavClick('admin')}
              className={`hidden md:flex items-center gap-1.5 px-3 min-h-[36px] text-xs font-extrabold rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'admin'
                  ? 'az-gold-foil-bg text-[#010906] border-[#FFF6C8]'
                  : 'bg-[#FFF8E8] text-[#063D32] dark:bg-[#041D13] dark:text-[#DFBD69] border-[#063D32]/20 dark:border-[#DFBD69]/35 hover:border-[#DFBD69]'
              }`}
              title={t('navigation:admin', 'Maʼmuriyat')}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{t('navigation:admin', 'Maʼmuriyat')}</span>
            </button>

            {/* Mobile hamburger menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden min-w-[38px] min-h-[38px] flex items-center justify-center text-[#03170F] dark:text-[#FFF8E8] hover:bg-[#063D32]/8 dark:hover:bg-white/8 rounded-xl transition-colors cursor-pointer"
              aria-label={mobileMenuOpen ? 'Menyuni yopish' : 'Menyuni ochish'}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-[#063D32]/15 dark:border-[#DFBD69]/30 bg-[#FFF8E8]/98 dark:bg-[#010906]/98 px-4 pt-3 pb-6 space-y-4 max-h-[82vh] overflow-y-auto animate-fade-in shadow-2xl">
          <div className="grid grid-cols-2 gap-2.5">
            {onOpenTvMode && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenTvMode();
                }}
                className="flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-xl bg-[#092E1F] border border-[#DFBD69]/50 text-[#FFF6C8] font-bold text-xs shadow-sm cursor-pointer"
              >
                <Tv className="w-4 h-4 text-[#DFBD69]" />
                <span>Masjid TV Ekrani</span>
              </button>
            )}

            {onOpenInstallModal && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenInstallModal();
                }}
                className={`flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-xl az-gold-foil-bg text-[#010906] font-extrabold text-xs shadow-xs cursor-pointer ${
                  onOpenTvMode ? '' : 'col-span-2'
                }`}
              >
                <Download className="w-4 h-4" />
                <span>Android APK v3.0.0</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm font-semibold pt-2 border-t border-[#063D32]/12 dark:border-[#DFBD69]/25">
            {allMobileLinks.map((link) => {
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => handleNavClick(link.id)}
                  className={`text-left px-3.5 min-h-[44px] rounded-xl transition-all cursor-pointer flex items-center justify-between ${
                    isActive
                      ? 'az-gold-foil-bg text-[#010906] font-extrabold shadow-sm'
                      : 'text-[#03170F] dark:text-[#E6DFCE] bg-[#F8F5EC] dark:bg-[#041D13]/80 border border-[#063D32]/10 dark:border-[#DFBD69]/18 hover:border-[#DFBD69]/45'
                  }`}
                >
                  <span className="truncate">{t(`navigation:${link.labelKey}`, link.labelKey)}</span>
                  {link.id === 'favorites' && favoritesCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-[#DFBD69] text-[#010906] text-[10px] font-bold flex items-center justify-center tabular-nums">
                      {favoritesCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};

