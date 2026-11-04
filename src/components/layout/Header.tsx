import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavigationTab } from '../../types';
import { IslamicStarEmblem } from '../ui/GeometricPattern';
import { LanguageSelector } from '../ui/LanguageSelector';
import { Menu, X, Shield, Bookmark, Settings as SettingsIcon, Download, MessageSquare, Bell } from 'lucide-react';

interface HeaderProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  favoritesCount: number;
  unreadNotificationsCount?: number;
  onOpenInstallModal?: () => void;
  onOpenChatModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  favoritesCount,
  unreadNotificationsCount = 0,
  onOpenInstallModal,
  onOpenChatModal,
}) => {
  const { t } = useTranslation(['navigation', 'common']);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const primaryLinks: { id: NavigationTab; labelKey: string }[] = [
    { id: 'home', labelKey: 'home' },
    { id: 'quran', labelKey: 'quran' },
    { id: 'hadith', labelKey: 'hadith' },
    { id: 'dhikr', labelKey: 'dhikr' },
    { id: 'prayer', labelKey: 'prayer' },
  ];

  const secondaryLinks: { id: NavigationTab; labelKey: string }[] = [
    { id: 'articles', labelKey: 'articles' },
    { id: 'news', labelKey: 'news' },
    { id: 'announcements', labelKey: 'announcements' },
    { id: 'quiz', labelKey: 'quiz' },
    { id: 'calendar', labelKey: 'calendar' },
  ];

  const allMobileLinks: { id: NavigationTab; labelKey: string }[] = [
    ...primaryLinks,
    ...secondaryLinks,
    { id: 'favorites', labelKey: 'favorites' },
    { id: 'settings', labelKey: 'settings' },
    { id: 'admin', labelKey: 'admin' },
  ];

  const handleNavClick = (tab: NavigationTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-200 dark:border-[#c5a869]/20 bg-white/95 dark:bg-[#071614]/95 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 sm:gap-6 h-16 sm:h-18">
          {/* Zone 1: Brand Wordmark */}
          <button
            onClick={() => handleNavClick('home')}
            className="group flex items-center gap-2 text-left text-stone-900 dark:text-stone-100 whitespace-nowrap shrink-0 focus-visible:outline-none cursor-pointer"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-950/20 dark:bg-emerald-950/60 flex items-center justify-center border border-[#c5a869]/30 group-hover:border-[#c5a869] transition-colors">
              <IslamicStarEmblem size={16} className="text-[#c5a869]" />
            </div>
            <span className="font-display text-base sm:text-xl font-bold tracking-wider text-stone-900 dark:text-stone-100 group-hover:text-[#c5a869] transition-colors">
              {t('common:appName', 'ASAKA ZIYO')}
            </span>
          </button>

          {/* Zone 2: Desktop Nav Links */}
          <nav
            className="hidden lg:flex items-center gap-6 text-sm font-medium text-stone-600 dark:text-stone-300"
            aria-label={t('navigation:navigationMenu', 'Asosiy menyu')}
          >
            {primaryLinks.map((link) => {
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => handleNavClick(link.id)}
                  className={`relative py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    isActive
                      ? 'text-[#c5a869] font-semibold'
                      : 'hover:text-stone-900 dark:hover:text-stone-100'
                  }`}
                >
                  {t(`navigation:${link.labelKey}`)}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#c5a869] rounded-full" />
                  )}
                </button>
              );
            })}

            <div className="flex items-center gap-4 text-stone-400 dark:text-stone-500 pl-2 border-l border-stone-200 dark:border-emerald-950">
              {secondaryLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => handleNavClick(link.id)}
                  className={`py-1 text-xs uppercase tracking-wider whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    activeTab === link.id
                      ? 'text-[#c5a869] font-semibold'
                      : 'hover:text-stone-700 dark:hover:text-stone-300'
                  }`}
                >
                  {t(`navigation:${link.labelKey}`)}
                </button>
              ))}
            </div>
          </nav>

          {/* Zone 3: Actions (Responsive) */}
          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
            {/* Desktop APK Install Action */}
            {onOpenInstallModal && (
              <button
                onClick={onOpenInstallModal}
                className="hidden md:flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-[#c5a869] to-[#d8bd7e] text-[#071614] hover:brightness-105 transition-all shadow-sm cursor-pointer whitespace-nowrap"
                title="ASAKA ZIYO APK Version 1 yuklab olish"
              >
                <Download className="w-3.5 h-3.5" />
                <span>APK v1.0</span>
              </button>
            )}

            {/* Language Selector */}
            <LanguageSelector variant="compact" />

            {/* Desktop Chat */}
            {onOpenChatModal && (
              <button
                onClick={onOpenChatModal}
                className="hidden md:flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-[#c5a869]/40 text-[#c5a869] hover:bg-[#c5a869]/10 transition-colors cursor-pointer"
                title="Maʼmuriyat bilan muloqot va savol-javob"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Savol / Chat</span>
              </button>
            )}

            {/* Notifications button */}
            <button
              onClick={() => handleNavClick('notifications')}
              className={`relative p-2 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5 transition-colors cursor-pointer ${
                activeTab === 'notifications' ? 'text-[#c5a869]' : ''
              }`}
              title="Bildirishnomalar markazi"
              aria-label="Bildirishnomalar markazi"
            >
              <Bell className="w-5 h-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Desktop Favorites */}
            <button
              onClick={() => handleNavClick('favorites')}
              className={`hidden sm:flex relative p-2 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5 transition-colors cursor-pointer ${
                activeTab === 'favorites' ? 'text-[#c5a869]' : ''
              }`}
              title={t('navigation:favorites', 'Sevimlilar')}
            >
              <Bookmark className="w-5 h-5" />
              {favoritesCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#c5a869] text-[#071614] text-[10px] font-bold flex items-center justify-center">
                  {favoritesCount}
                </span>
              )}
            </button>

            {/* Desktop Settings */}
            <button
              onClick={() => handleNavClick('settings')}
              className={`hidden sm:flex p-2 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5 transition-colors cursor-pointer ${
                activeTab === 'settings' ? 'text-[#c5a869]' : ''
              }`}
              title={t('navigation:settings', 'Sozlamalar')}
            >
              <SettingsIcon className="w-5 h-5" />
            </button>

            {/* Admin entry point (desktop) */}
            <button
              onClick={() => handleNavClick('admin')}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-[#c5a869] text-[#071614] border-[#c5a869]'
                  : 'bg-emerald-950/20 text-emerald-800 dark:text-[#c5a869] border-emerald-800/30 dark:border-[#c5a869]/30 hover:border-[#c5a869]'
              }`}
              title={t('navigation:admin', 'Maʼmuriyat')}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{t('navigation:admin', 'Maʼmuriyat')}</span>
            </button>

            {/* Mobile hamburger menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              aria-label={mobileMenuOpen ? 'Menyuni yopish' : 'Menyuni ochish'}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer (Fully responsive and scrollable) */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-stone-200 dark:border-emerald-950 bg-stone-50/98 dark:bg-[#071614]/98 px-4 pt-3 pb-6 space-y-4 max-h-[85vh] overflow-y-auto animate-fade-in shadow-2xl">
          <div className="grid grid-cols-2 gap-2">
            {onOpenInstallModal && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenInstallModal();
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#c5a869] to-[#d8bd7e] text-[#071614] font-bold text-xs shadow-md cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>APK v1.0 Oʻrnatish</span>
              </button>
            )}

            {onOpenChatModal && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenChatModal();
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-[#c5a869]/50 text-[#c5a869] bg-[#c5a869]/10 font-bold text-xs cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Savol / Chat</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm font-medium pt-2 border-t border-stone-200 dark:border-emerald-950">
            {allMobileLinks.map((link) => {
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => handleNavClick(link.id)}
                  className={`text-left px-3.5 py-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-between ${
                    isActive
                      ? 'bg-[#c5a869]/15 text-[#c5a869] font-semibold'
                      : 'text-stone-700 dark:text-stone-300 hover:bg-stone-200/50 dark:hover:bg-white/5'
                  }`}
                >
                  <span>{t(`navigation:${link.labelKey}`, link.labelKey)}</span>
                  {link.id === 'favorites' && favoritesCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-[#c5a869] text-[#071614] text-[10px] font-bold flex items-center justify-center">
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
