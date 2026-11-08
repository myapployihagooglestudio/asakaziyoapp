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
    { id: 'calendar', labelKey: 'calendar' },
    { id: 'khatm_planner', labelKey: 'khatm_planner' },
    { id: 'prayer_journal', labelKey: 'prayer_journal' },
    { id: 'mosque_events', labelKey: 'mosque_events' },
    { id: 'academy', labelKey: 'academy' },
    { id: 'library', labelKey: 'library' },
    { id: 'ask_imam', labelKey: 'ask_imam' },
    { id: 'charity', labelKey: 'charity' },
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
    <header className="sticky top-0 z-40 w-full border-b border-[#063D32]/12 dark:border-[#C6A45C]/20 bg-[#F8F5EC]/92 dark:bg-[#031814]/92 backdrop-blur-xl transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 sm:gap-4 h-16">
          {/* Zone 1: Architectural Brand Identity */}
          <button
            onClick={() => handleNavClick('home')}
            className="group flex items-center gap-2.5 text-left text-[#042B25] dark:text-[#F8F5EC] whitespace-nowrap shrink-0 focus-visible:outline-none cursor-pointer min-h-[42px]"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#063D32] to-[#042B25] dark:from-[#075747] dark:to-[#042B25] flex items-center justify-center border border-[#C6A45C]/50 group-hover:border-[#DCC58C] transition-all shadow-sm">
              <IslamicStarEmblem size={18} className="text-[#DCC58C] group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-sm sm:text-base font-bold tracking-[0.12em] text-[#042B25] dark:text-[#F8F5EC] group-hover:text-[#063D32] dark:group-hover:text-[#C6A45C] transition-colors leading-none">
                {t('common:appName', 'ASAKA ZIYO')}
              </span>
              <span className="hidden sm:inline-block text-[9px] uppercase tracking-[0.22em] text-[#5C746C] dark:text-[#C6A45C]/80 mt-0.5 font-semibold">
                Islomiy Super Ekotizim
              </span>
            </div>
          </button>

          {/* Zone 2: Desktop Primary Navigation with Animated Indicator */}
          <nav
            className="hidden lg:flex items-center gap-1 xl:gap-2 text-sm font-medium text-[#2C4A42] dark:text-[#D4CFC3]"
            aria-label={t('navigation:navigationMenu', 'Asosiy menyu')}
          >
            {primaryLinks.map((link) => {
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => handleNavClick(link.id)}
                  className={`relative px-3 py-2 rounded-xl whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    isActive
                      ? 'text-[#063D32] dark:text-[#DCC58C] font-bold'
                      : 'hover:text-[#042B25] dark:hover:text-[#F8F5EC] hover:bg-[#063D32]/5 dark:hover:bg-white/5'
                  }`}
                >
                  {t(`navigation:${link.labelKey}`)}
                  {isActive && (
                    <motion.span
                      layoutId="header-active-indicator"
                      className="absolute bottom-0.5 left-2.5 right-2.5 h-0.5 bg-gradient-to-r from-[#C6A45C] via-[#DCC58C] to-[#C6A45C] rounded-full"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    />
                  )}
                </button>
              );
            })}

            {/* Ecosystem Modules Megamenu Trigger */}
            <div className="relative pl-1.5 ml-1 border-l border-[#063D32]/15 dark:border-[#C6A45C]/20">
              <button
                onClick={() => setEcosystemDropdownOpen((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                  secondaryLinks.some((s) => s.id === activeTab) || ecosystemDropdownOpen
                    ? 'bg-[#063D32] text-[#F8F5EC] dark:bg-[#C6A45C]/20 dark:text-[#DCC58C] border border-[#C6A45C]/40'
                    : 'text-[#2C4A42] dark:text-[#D4CFC3] hover:bg-[#063D32]/8 dark:hover:bg-white/5'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 text-[#C6A45C]" />
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
                  <div className="absolute right-0 mt-2.5 w-[440px] rounded-2xl bg-[#F8F5EC] dark:bg-[#06241E] border border-[#C6A45C]/35 shadow-2xl p-4 z-40 animate-scale-up">
                    <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#063D32]/10 dark:border-[#C6A45C]/20">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-[#063D32] dark:text-[#C6A45C]">
                        ASAKA ZIYO — Barcha Xizmatlar va Boʻlimlar
                      </span>
                      <span className="text-[10px] font-mono-numbers text-[#5C746C] dark:text-[#8FA69E]">
                        14 ta modul
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
                                ? 'bg-[#063D32] text-[#F8F5EC] dark:bg-[#C6A45C] dark:text-[#042B25]'
                                : 'text-[#042B25] dark:text-[#F8F5EC] hover:bg-[#F1EBDD] dark:hover:bg-[#082E26]'
                            }`}
                          >
                            <span className="truncate">{t(`navigation:${link.labelKey}`)}</span>
                            <span className="text-[#C6A45C]">→</span>
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
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-bold rounded-xl bg-emerald-700/80 hover:bg-emerald-600 text-white transition-all shadow-xs cursor-pointer whitespace-nowrap"
                title="ASAKA ZIYO Bosh Ekranga Oʻrnatish (PWA)"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-300" />
                <span>Oʻrnatish (PWA)</span>
              </button>
            )}

            {onOpenInstallModal && (
              <button
                onClick={onOpenInstallModal}
                className="flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-bold rounded-xl bg-gradient-to-r from-[#C6A45C] to-[#B38F45] text-[#042B25] hover:brightness-105 transition-all shadow-xs cursor-pointer whitespace-nowrap"
                title="ASAKA ZIYO Android APK v2.0.0 va Oflayn Markaz"
              >
                <Download className="w-3.5 h-3.5" />
                <span>APK v2.0.0</span>
              </button>
            )}

            {onOpenSearch && (
              <button
                onClick={onOpenSearch}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-[#2C4A42] dark:text-[#D4CFC3] hover:bg-[#063D32]/8 dark:hover:bg-white/8 transition-colors cursor-pointer"
                title="Global Qidiruv (Ctrl+K)"
                aria-label="Global Qidiruv"
              >
                <Search className="w-[18px] h-[18px]" />
              </button>
            )}

            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl border border-[#063D32]/12 dark:border-[#C6A45C]/25 bg-[#F1EBDD]/70 dark:bg-[#06241E] hover:border-[#C6A45C] transition-colors cursor-pointer"
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

            {onOpenTvMode && (
              <button
                onClick={onOpenTvMode}
                className="hidden md:flex min-w-[40px] min-h-[40px] items-center justify-center rounded-xl text-[#2C4A42] dark:text-[#D4CFC3] hover:bg-[#063D32]/8 dark:hover:bg-white/8 transition-colors cursor-pointer"
                title="Smart TV va Masjid Ekrani Rejimi (Shift+T)"
                aria-label="Smart TV Ekrani Rejimi"
              >
                <Tv className="w-[18px] h-[18px]" />
              </button>
            )}

            <LanguageSelector variant="compact" />

            {onOpenChatModal && (
              <button
                onClick={onOpenChatModal}
                className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] text-xs font-semibold rounded-xl border border-[#C6A45C]/45 text-[#063D32] dark:text-[#DCC58C] hover:bg-[#C6A45C]/12 transition-colors cursor-pointer whitespace-nowrap"
                title="Maʼmuriyat bilan muloqot va savol-javob"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Savol</span>
              </button>
            )}

            {/* Messages / Channel feed button */}
            <button
              onClick={() => handleNavClick('messages')}
              className={`relative min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-[#2C4A42] dark:text-[#D4CFC3] hover:bg-[#063D32]/8 dark:hover:bg-white/8 transition-colors cursor-pointer ${
                activeTab === 'messages' ? 'text-[#063D32] dark:text-[#C6A45C] bg-[#063D32]/10 dark:bg-white/8' : ''
              }`}
              title="Rasmiy Xabarlar & Yangiliklar kanali"
              aria-label="Rasmiy Xabarlar kanali"
            >
              <MessageSquareText className="w-[18px] h-[18px]" />
              {unreadMessagesCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[#063D32] dark:bg-[#C6A45C] text-white dark:text-[#042B25] text-[9px] font-bold flex items-center justify-center leading-none tabular-nums">
                  {unreadMessagesCount}
                </span>
              )}
            </button>

            {/* User Profile button */}
            <button
              onClick={() => handleNavClick('profile')}
              className={`relative min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-[#2C4A42] dark:text-[#D4CFC3] hover:bg-[#063D32]/8 dark:hover:bg-white/8 transition-colors cursor-pointer ${
                activeTab === 'profile' ? 'text-[#063D32] dark:text-[#C6A45C] bg-[#063D32]/10 dark:bg-white/8' : ''
              }`}
              title="Shaxsiy Akkaunt & Profil"
              aria-label="Shaxsiy Akkaunt & Profil"
            >
              <User className="w-[18px] h-[18px]" />
            </button>

            {/* Notifications button */}
            <button
              onClick={() => handleNavClick('notifications')}
              className={`relative min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-[#2C4A42] dark:text-[#D4CFC3] hover:bg-[#063D32]/8 dark:hover:bg-white/8 transition-colors cursor-pointer ${
                activeTab === 'notifications' ? 'text-[#063D32] dark:text-[#C6A45C] bg-[#063D32]/10 dark:bg-white/8' : ''
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
              className={`hidden sm:flex relative min-w-[40px] min-h-[40px] items-center justify-center rounded-xl text-[#2C4A42] dark:text-[#D4CFC3] hover:bg-[#063D32]/8 dark:hover:bg-white/8 transition-colors cursor-pointer ${
                activeTab === 'favorites' ? 'text-[#063D32] dark:text-[#C6A45C] bg-[#063D32]/10 dark:bg-white/8' : ''
              }`}
              title={t('navigation:favorites', 'Sevimlilar')}
            >
              <Bookmark className="w-[18px] h-[18px]" />
              {favoritesCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[#063D32] dark:bg-[#C6A45C] text-white dark:text-[#042B25] text-[9px] font-bold flex items-center justify-center tabular-nums">
                  {favoritesCount}
                </span>
              )}
            </button>

            {/* Desktop Settings */}
            <button
              onClick={() => handleNavClick('settings')}
              className={`hidden sm:flex min-w-[40px] min-h-[40px] items-center justify-center rounded-xl text-[#2C4A42] dark:text-[#D4CFC3] hover:bg-[#063D32]/8 dark:hover:bg-white/8 transition-colors cursor-pointer ${
                activeTab === 'settings' ? 'text-[#063D32] dark:text-[#C6A45C] bg-[#063D32]/10 dark:bg-white/8' : ''
              }`}
              title={t('navigation:settings', 'Sozlamalar')}
            >
              <SettingsIcon className="w-[18px] h-[18px]" />
            </button>

            {/* Admin entry point (desktop) */}
            <button
              onClick={() => handleNavClick('admin')}
              className={`hidden md:flex items-center gap-1.5 px-3 min-h-[36px] text-xs font-bold rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'admin'
                  ? 'bg-[#063D32] text-[#F8F5EC] border-[#063D32] dark:bg-[#C6A45C] dark:text-[#042B25] dark:border-[#C6A45C]'
                  : 'bg-[#F1EBDD] text-[#063D32] dark:bg-[#06241E] dark:text-[#DCC58C] border-[#063D32]/20 dark:border-[#C6A45C]/30 hover:border-[#063D32] dark:hover:border-[#C6A45C]'
              }`}
              title={t('navigation:admin', 'Maʼmuriyat')}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{t('navigation:admin', 'Maʼmuriyat')}</span>
            </button>

            {/* Mobile hamburger menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden min-w-[40px] min-h-[40px] flex items-center justify-center text-[#042B25] dark:text-[#F8F5EC] hover:bg-[#063D32]/8 dark:hover:bg-white/8 rounded-xl transition-colors cursor-pointer"
              aria-label={mobileMenuOpen ? 'Menyuni yopish' : 'Menyuni ochish'}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-[#063D32]/15 dark:border-[#C6A45C]/25 bg-[#F8F5EC]/98 dark:bg-[#031814]/98 px-4 pt-3 pb-6 space-y-4 max-h-[82vh] overflow-y-auto animate-fade-in shadow-2xl">
          <div className="grid grid-cols-2 gap-2.5">
            {!isInstalled && (isInstallable || isIOS) && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (isInstallable) promptInstall();
                  else if (onOpenInstallModal) onOpenInstallModal();
                }}
                className="flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-emerald-300" />
                <span>Oʻrnatish (PWA)</span>
              </button>
            )}

            {onOpenInstallModal && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenInstallModal();
                }}
                className={`flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-xl bg-gradient-to-r from-[#C6A45C] to-[#B38F45] text-[#042B25] font-bold text-xs shadow-xs cursor-pointer ${
                  !isInstalled && (isInstallable || isIOS) ? '' : 'col-span-2'
                }`}
              >
                <Download className="w-4 h-4" />
                <span>Android APK v2.0.0</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm font-medium pt-2 border-t border-[#063D32]/10 dark:border-[#C6A45C]/20">
            {allMobileLinks.map((link) => {
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => handleNavClick(link.id)}
                  className={`text-left px-3.5 min-h-[44px] rounded-xl transition-colors cursor-pointer flex items-center justify-between ${
                    isActive
                      ? 'bg-[#063D32] text-[#F8F5EC] dark:bg-[#C6A45C] dark:text-[#042B25] font-bold'
                      : 'text-[#042B25] dark:text-[#D4CFC3] hover:bg-[#F1EBDD] dark:hover:bg-white/5'
                  }`}
                >
                  <span className="truncate">{t(`navigation:${link.labelKey}`, link.labelKey)}</span>
                  {link.id === 'favorites' && favoritesCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-[#C6A45C] text-[#042B25] text-[10px] font-bold flex items-center justify-center tabular-nums">
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
