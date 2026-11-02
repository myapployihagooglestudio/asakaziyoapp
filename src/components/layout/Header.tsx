import React, { useState } from 'react';
import { NavigationTab } from '../../types';
import { IslamicStarEmblem } from '../ui/GeometricPattern';
import { Menu, X, Shield, Bookmark, Settings as SettingsIcon } from 'lucide-react';

interface HeaderProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  favoritesCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  favoritesCount,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Top Bar Contract: 4-5 core concise nav links in Zone 2
  const primaryLinks: { id: NavigationTab; label: string }[] = [
    { id: 'home', label: 'Bosh sahifa' },
    { id: 'quran', label: 'Qurʼon' },
    { id: 'hadith', label: 'Hadislar' },
    { id: 'dhikr', label: 'Zikr va duolar' },
    { id: 'prayer', label: 'Namoz vaqtlari' },
  ];

  const secondaryLinks: { id: NavigationTab; label: string }[] = [
    { id: 'articles', label: 'Maqolalar' },
    { id: 'news', label: 'Yangiliklar' },
    { id: 'announcements', label: 'Eʼlonlar' },
  ];

  const handleNavClick = (tab: NavigationTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-200 dark:border-[#c5a869]/20 bg-white/95 dark:bg-[#071614]/95 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-18">
          {/* Zone 1: Single element brand wordmark */}
          <button
            onClick={() => handleNavClick('home')}
            className="group flex items-center gap-2.5 text-left text-stone-900 dark:text-stone-100 whitespace-nowrap shrink-0 focus-visible:outline-none cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-950/20 dark:bg-emerald-950/60 flex items-center justify-center border border-[#c5a869]/30 group-hover:border-[#c5a869] transition-colors">
              <IslamicStarEmblem size={18} className="text-[#c5a869]" />
            </div>
            <span className="font-display text-xl font-bold tracking-wider text-stone-900 dark:text-stone-100 group-hover:text-[#c5a869] transition-colors">
              ASAKA ZIYO
            </span>
          </button>

          {/* Zone 2: 4-5 concise single-line nav links with subtle hover underlines */}
          <nav
            className="hidden lg:flex items-center gap-7 text-sm font-medium text-stone-600 dark:text-stone-300"
            aria-label="Asosiy menyu"
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
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#c5a869] rounded-full" />
                  )}
                </button>
              );
            })}

            {/* Overflow dropdown or secondary links */}
            <div className="flex items-center gap-5 text-stone-400 dark:text-stone-500 pl-2 border-l border-stone-200 dark:border-emerald-950">
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
                  {link.label}
                </button>
              ))}
            </div>
          </nav>

          {/* Zone 3: 1 primary action + utility links */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Favorites shortcut */}
            <button
              onClick={() => handleNavClick('favorites')}
              className={`relative p-2 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5 transition-colors cursor-pointer ${
                activeTab === 'favorites' ? 'text-[#c5a869]' : ''
              }`}
              title="Sevimlilar"
              aria-label="Sevimlilar"
            >
              <Bookmark className="w-5 h-5" />
              {favoritesCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#c5a869] text-[#071614] text-[10px] font-bold flex items-center justify-center">
                  {favoritesCount}
                </span>
              )}
            </button>

            {/* Settings shortcut */}
            <button
              onClick={() => handleNavClick('settings')}
              className={`p-2 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5 transition-colors cursor-pointer ${
                activeTab === 'settings' ? 'text-[#c5a869]' : ''
              }`}
              title="Sozlamalar"
              aria-label="Sozlamalar"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>

            {/* Admin entry point - distinct institutional portal */}
            <button
              onClick={() => handleNavClick('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-[#c5a869] text-[#071614] border-[#c5a869]'
                  : 'bg-emerald-950/20 text-emerald-800 dark:text-[#c5a869] border-emerald-800/30 dark:border-[#c5a869]/30 hover:border-[#c5a869]'
              }`}
              title="Maʼmuriyat konsoli"
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Maʼmuriyat</span>
            </button>

            {/* Mobile menu button */}
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

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-stone-200 dark:border-emerald-950 bg-stone-50/98 dark:bg-[#071614]/98 px-4 pt-3 pb-6">
          <div className="grid grid-cols-2 gap-2 text-sm font-medium">
            {[...primaryLinks, ...secondaryLinks].map((link) => {
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => handleNavClick(link.id)}
                  className={`text-left px-3.5 py-2.5 rounded-lg transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#c5a869]/15 text-[#c5a869] font-semibold'
                      : 'text-stone-700 dark:text-stone-300 hover:bg-stone-200/50 dark:hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
