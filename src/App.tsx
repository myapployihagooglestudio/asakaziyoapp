/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ASAKA ZIYO — Premium Islamic Digital Ecosystem
 * Phase 1: Product Foundation, Design System, and Application Shell
 */

import React, { useState, useEffect } from 'react';
import {
  AppSettings,
  FavoriteItem,
  NavigationTab,
  PrayerSchedule,
} from './types';
import { INITIAL_ASAKA_PRAYER_SCHEDULE } from './data/prayerTimesData';
import { DAILY_FEATURED_AYAH } from './data/quranData';
import { FEATURED_DAILY_HADITH } from './data/hadithData';

// Layout components
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { MobileNav } from './components/layout/MobileNav';
import { Modal } from './components/ui/Modal';
import { AppInstallModal } from './components/features/install/AppInstallModal';
import { AppInstallBanner } from './components/features/install/AppInstallBanner';

// Feature Views
import { HomeView } from './components/features/home/HomeView';
import { QuranView } from './components/features/quran/QuranView';
import { HadithView } from './components/features/hadith/HadithView';
import { DhikrView } from './components/features/dhikr/DhikrView';
import { PrayerTimesView } from './components/features/prayer/PrayerTimesView';
import { ArticlesView } from './components/features/articles/ArticlesView';
import { NewsView } from './components/features/news/NewsView';
import { AnnouncementsView } from './components/features/announcements/AnnouncementsView';
import { FavoritesView } from './components/features/favorites/FavoritesView';
import { SettingsView } from './components/features/settings/SettingsView';
import { AdminPortal } from './components/features/admin/AdminPortal';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  arabicFontSize: 'standard',
  showTransliteration: true,
  activeReciterId: 'mishary',
  hapticFeedback: true,
  tasbihSound: true,
  prayerAlertsEnabled: true,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  // Prayer schedule with local updates support and schema validation
  const [prayerSchedule, setPrayerSchedule] = useState<PrayerSchedule>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('asaka_ziyo_prayer_schedule');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed.times) && parsed.times.length > 0) {
            return parsed;
          }
        }
      }
    } catch (e) {
      // Storage access or parse error fallback
    }
    return INITIAL_ASAKA_PRAYER_SCHEDULE;
  });

  // Favorites state with array validation
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('asaka_ziyo_favorites');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch (e) {
      // Fallback
    }
    return [];
  });

  // App settings state with object validation
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('asaka_ziyo_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            return { ...DEFAULT_SETTINGS, ...parsed };
          }
        }
      }
    } catch (e) {
      // Fallback
    }
    return DEFAULT_SETTINGS;
  });

  // Synchronize Dark / Light Mode with <html> element per §1.F
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('asaka_ziyo_settings', JSON.stringify(settings));
    } catch (e) {
      // Storage policy
    }
  }, [settings]);

  // Synchronize favorites
  useEffect(() => {
    try {
      localStorage.setItem('asaka_ziyo_favorites', JSON.stringify(favorites));
    } catch (e) {
      // Storage policy
    }
  }, [favorites]);

  const handleUpdateSchedule = (newSchedule: PrayerSchedule) => {
    setPrayerSchedule(newSchedule);
    try {
      localStorage.setItem('asaka_ziyo_prayer_schedule', JSON.stringify(newSchedule));
    } catch (e) {
      // Storage policy
    }
  };

  const handleToggleFavorite = (item: {
    id: string;
    type: 'ayah' | 'hadith' | 'dhikr' | 'article';
    title: string;
    subtitle: string;
    snippet: string;
    routeTab: NavigationTab;
    routeId: string;
  }) => {
    const exists = favorites.some((f) => f.id === item.id);
    if (exists) {
      setFavorites((prev) => prev.filter((f) => f.id !== item.id));
    } else {
      const newFav: FavoriteItem = {
        ...item,
        timestamp: Date.now(),
      };
      setFavorites((prev) => [newFav, ...prev]);
    }
  };

  const isFavorited = (id: string) => favorites.some((f) => f.id === id);

  const handleRemoveFavorite = (id: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  };

  const handleClearAllFavorites = () => {
    setFavorites([]);
  };

  const handleUpdateSettings = (partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const handleNavigate = (tab: NavigationTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-[#071614] text-stone-900 dark:text-stone-100 transition-colors duration-200">
      {/* Top Header conforming to Top Bar Contract */}
      <Header
        activeTab={activeTab}
        onSelectTab={handleNavigate}
        favoritesCount={favorites.length}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {activeTab === 'home' && (
          <HomeView
            prayerSchedule={prayerSchedule}
            dailyAyah={DAILY_FEATURED_AYAH}
            dailyHadith={FEATURED_DAILY_HADITH}
            onNavigate={handleNavigate}
            onToggleFavorite={handleToggleFavorite}
            isFavorited={isFavorited}
          />
        )}

        {activeTab === 'quran' && (
          <QuranView
            onToggleFavorite={handleToggleFavorite}
            isFavorited={isFavorited}
            arabicFontSize={settings.arabicFontSize}
          />
        )}

        {activeTab === 'hadith' && (
          <HadithView
            onToggleFavorite={handleToggleFavorite}
            isFavorited={isFavorited}
          />
        )}

        {activeTab === 'dhikr' && (
          <DhikrView
            onToggleFavorite={handleToggleFavorite}
            isFavorited={isFavorited}
            hapticEnabled={settings.hapticFeedback}
            soundEnabled={settings.tasbihSound}
          />
        )}

        {activeTab === 'prayer' && (
          <PrayerTimesView
            schedule={prayerSchedule}
            onOpenAdmin={() => handleNavigate('admin')}
          />
        )}

        {activeTab === 'articles' && (
          <ArticlesView
            onToggleFavorite={handleToggleFavorite}
            isFavorited={isFavorited}
          />
        )}

        {activeTab === 'news' && <NewsView />}

        {activeTab === 'announcements' && <AnnouncementsView />}

        {activeTab === 'favorites' && (
          <FavoritesView
            favorites={favorites}
            onRemoveFavorite={handleRemoveFavorite}
            onClearAll={handleClearAllFavorites}
            onNavigate={handleNavigate}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onOpenAdmin={() => handleNavigate('admin')}
            onOpenInstallModal={() => setIsInstallModalOpen(true)}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPortal
            currentSchedule={prayerSchedule}
            onUpdateSchedule={handleUpdateSchedule}
            onExitAdmin={() => handleNavigate('home')}
          />
        )}
      </main>

      {/* Institutional Editorial Footer */}
      <Footer onSelectTab={handleNavigate} />

      {/* Mobile Bottom Navigation (12vh sticky cap) */}
      <MobileNav
        activeTab={activeTab}
        onSelectTab={handleNavigate}
        onOpenMoreMenu={() => setIsMobileMenuOpen(true)}
      />

      {/* Mobile More Sections Modal */}
      <Modal
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        title="Barcha Boʻlimlar"
        subtitle="Asaka Ziyo ekotizim navigatsiyasi"
        maxWidth="sm"
      >
        <div className="space-y-3">
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              setIsInstallModalOpen(true);
            }}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-[#c5a869] to-[#d8bd7e] text-[#071614] font-bold text-xs shadow-md cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-[#071614]/10">📥</span>
              <span>APK v1.0 Yuklab Olish / Oʻrnatish</span>
            </div>
            <span className="text-[10px] bg-[#071614] text-[#c5a869] px-2 py-0.5 rounded">
              v1.0.0
            </span>
          </button>

          <div className="grid grid-cols-2 gap-2.5 text-xs font-semibold">
            {[
              { id: 'home', label: 'Bosh sahifa' },
              { id: 'quran', label: 'Qurʼoni Karim' },
              { id: 'hadith', label: 'Hadislar toʻplami' },
              { id: 'dhikr', label: 'Zikr va duolar' },
              { id: 'prayer', label: 'Namoz vaqtlari' },
              { id: 'articles', label: 'Ilmiy maqolalar' },
              { id: 'news', label: 'Yangiliklar' },
              { id: 'announcements', label: 'Eʼlonlar' },
              { id: 'favorites', label: 'Sevimlilar' },
              { id: 'settings', label: 'Sozlamalar' },
              { id: 'admin', label: 'Maʼmuriyat konsoli' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id as NavigationTab)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  activeTab === item.id
                    ? 'border-[#c5a869] bg-[#c5a869]/15 text-[#c5a869]'
                    : 'border-stone-200 dark:border-emerald-950 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* Floating Smart App Installation Banner */}
      <AppInstallBanner onOpenInstallModal={() => setIsInstallModalOpen(true)} />

      {/* App Installation & APK v1.0 Download Modal */}
      <AppInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />
    </div>
  );
}
