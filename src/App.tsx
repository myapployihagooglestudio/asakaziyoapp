/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ASAKA ZIYO — Premium Islamic Digital Ecosystem
 * Phase 1: Product Foundation, Design System, and Application Shell
 */

import React, { useState, useEffect } from 'react';
import { MotionConfig, AnimatePresence, motion } from 'motion/react';
import {
  AppSettings,
  FavoriteItem,
  NavigationTab,
  PrayerSchedule,
} from './types';
import { INITIAL_ASAKA_PRAYER_SCHEDULE } from './data/prayerTimesData';
import { DAILY_FEATURED_AYAH } from './data/quranData';
import { FEATURED_DAILY_HADITH } from './data/hadithData';
import { getNextPrayerCalculation } from './utils/prayerTimeUtils';
import {
  getPrayerAlertSettings,
  triggerBrowserNotification,
  playGentleChime,
} from './utils/notificationService';
import {
  getStoredPrayerSchedule,
  saveStoredPrayerSchedule,
  getStoredBroadcastNotifications,
  subscribeToDatabase,
} from './utils/databaseService';

// Layout components
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { MobileNav } from './components/layout/MobileNav';
import { Modal } from './components/ui/Modal';
import { AppInstallModal } from './components/features/install/AppInstallModal';
import { AppInstallBanner } from './components/features/install/AppInstallBanner';
import { SupportChatModal } from './components/features/chat/SupportChatModal';

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
import { UserProfileView } from './components/features/profile/UserProfileView';
import { SettingsView } from './components/features/settings/SettingsView';
import { AdminPortal } from './components/features/admin/AdminPortal';
import { NotificationsView } from './components/features/notifications/NotificationsView';
import { DailyArchiveView } from './components/features/daily/DailyArchiveView';
import { QuizView } from './components/features/quiz/QuizView';
import { CalendarView } from './components/features/calendar/CalendarView';
import { ReminderDashboard } from './components/features/prayer/ReminderDashboard';
import { MessagesView } from './components/features/messages/MessagesView';
import { KhatmPlannerView } from './components/features/quran/KhatmPlannerView';
import { PrayerJournalView } from './components/features/prayer/PrayerJournalView';
import { MosqueEventsView } from './components/features/calendar/MosqueEventsView';
import { AcademyView } from './components/features/academy/AcademyView';
import { CharityView } from './components/features/charity/CharityView';
import { FastingView } from './components/features/fasting/FastingView';
import { DigitalLibraryView } from './components/features/library/DigitalLibraryView';
import { AskImamView } from './components/features/chat/AskImamView';
import { AiAssistantView } from './components/features/chat/AiAssistantView';
import { GlobalSearchView } from './components/features/search/GlobalSearchView';
import { GlobalSearchModal } from './components/features/search/GlobalSearchModal';
import { IslamicAchievementsView } from './components/features/profile/IslamicAchievementsView';
import { SmartTvModal } from './components/features/tv/SmartTvModal';
import { OnboardingModal } from './components/ui/OnboardingModal';
import { PersistentAudioPlayer } from './components/ui/PersistentAudioPlayer';
import { pageTransitionVariants } from './utils/motionSystem';
import {
  subscribeToMessages,
  getUnreadMessagesCount,
  syncMessagesWithFirestore,
} from './utils/messagesService';

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
  const [activeTab, setActiveTab] = useState<NavigationTab>(() => {
    if (typeof window !== 'undefined') {
      const pathName = (window.location.pathname || '').toLowerCase();
      const hashVal = (window.location.hash || '').toLowerCase();
      if (pathName.startsWith('/admin') || hashVal.includes('admin')) {
        return 'admin';
      }
      if (pathName.startsWith('/ai') || hashVal.includes('ai_assistant')) {
        return 'ai_assistant';
      }
    }
    return 'home';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isTvModalOpen, setIsTvModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);

  // Prayer schedule with central database service
  const [prayerSchedule, setPrayerSchedule] = useState<PrayerSchedule>(() =>
    getStoredPrayerSchedule()
  );

  // Notifications with central database service
  const [notifications, setNotifications] = useState(() =>
    getStoredBroadcastNotifications()
  );

  // Messages unread count with real-time sync
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(() =>
    getUnreadMessagesCount()
  );

  // Reactive cross-tab and cross-session synchronization
  useEffect(() => {
    const unsubscribeDb = subscribeToDatabase((event) => {
      if (event.type === 'PRAYER_UPDATED') {
        setPrayerSchedule(getStoredPrayerSchedule());
      }
      if (event.type === 'NOTIFICATIONS_UPDATED') {
        setNotifications(getStoredBroadcastNotifications());
      }
    });

    const unsubscribeMessages = subscribeToMessages((msgs) => {
      setUnreadMessagesCount(msgs.filter((m) => !m.read).length);
    });

    // Cloud background sync
    syncMessagesWithFirestore().catch(() => {});

    return () => {
      unsubscribeDb();
      unsubscribeMessages();
    };
  }, []);

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

  // Synchronize Dark / Light / System Mode with <html> element
  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = () => {
      const isSystemDark =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldBeDark =
        settings.theme === 'dark' || (settings.theme === 'system' && isSystemDark);

      if (shouldBeDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();

    let mediaQuery: MediaQueryList | null = null;
    if (settings.theme === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener?.('change', applyTheme);
    }

    try {
      localStorage.setItem('asaka_ziyo_settings', JSON.stringify(settings));
    } catch (e) {
      // Storage policy
    }

    return () => {
      mediaQuery?.removeEventListener?.('change', applyTheme);
    };
  }, [settings]);

  const handleCycleTheme = () => {
    const nextTheme: AppSettings['theme'] =
      settings.theme === 'dark' ? 'light' : settings.theme === 'light' ? 'system' : 'dark';
    setSettings((prev) => ({ ...prev, theme: nextTheme }));
  };

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
    saveStoredPrayerSchedule(newSchedule, true);
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
    try {
      if (typeof window !== 'undefined' && window.history?.pushState) {
        window.history.pushState({ tab }, '', `#${tab}`);
      }
    } catch {
      // ignore
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsMobileMenuOpen(false);
  };

  // Preserve browser back/forward navigation history & global keyboard shortcuts (Ctrl+K, Shift+T)
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const stateTab = e.state?.tab as NavigationTab | undefined;
      if (stateTab) {
        setActiveTab(stateTab);
      } else if (window.location.hash) {
        const hashTab = window.location.hash.replace('#', '') as NavigationTab;
        if (hashTab) setActiveTab(hashTab);
      } else {
        setActiveTab('home');
      }
    };

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      } else if (!isInput && e.shiftKey && e.key.toUpperCase() === 'T') {
        e.preventDefault();
        setIsTvModalOpen((prev) => !prev);
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  // Background prayer time & real Adhan alert scheduler (Asia/Tashkent aware)
  useEffect(() => {
    const checkPrayerAlert = () => {
      try {
        const alertSettings = getPrayerAlertSettings();
        if (!alertSettings.enabled) return;

        const nextInfo = getNextPrayerCalculation(prayerSchedule.times);
        if (!nextInfo.nextPrayer) return;

        const prayerKey = nextInfo.nextPrayer.key;
        const isFiveDaily = ['bomdod', 'peshin', 'asr', 'shom', 'xufton'].includes(prayerKey);
        if (isFiveDaily) {
          const pKey = prayerKey as 'bomdod' | 'peshin' | 'asr' | 'shom' | 'xufton';
          if (
            alertSettings.individualPrayerAlerts?.[pKey] === false ||
            alertSettings.individualPrayerModes?.[pKey] === 'off'
          ) {
            return;
          }
        }

        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
        const minutesRemaining = Math.floor(nextInfo.secondsRemaining / 60);

        // 1. Exact prayer time arrival (plays selected full Adhan recording)
        if (nextInfo.secondsRemaining <= 45 && alertSettings.notifyOnExactTime !== false) {
          const exactKey = `adhan_exact_${today}_${prayerKey}`;
          if (!sessionStorage.getItem(exactKey)) {
            sessionStorage.setItem(exactKey, 'true');
            const newNotif = triggerBrowserNotification(
              `${nextInfo.nextPrayer.nameUz} namozi vaqti kirdi (${nextInfo.nextPrayer.time})`,
              `Asaka shahrida ${nextInfo.nextPrayer.nameUz} vaqti kirdi. Hayya 'alas-solah!`,
              'prayer',
              isFiveDaily ? (prayerKey as 'bomdod' | 'peshin' | 'asr' | 'shom' | 'xufton') : undefined,
              true
            );
            setNotifications((prev) => [newNotif, ...prev]);
          }
          return;
        }

        // 2. Pre-prayer advance reminder (gentle chime only, no full Adhan overlap)
        if (minutesRemaining > 0 && minutesRemaining <= alertSettings.minutesBefore) {
          const preKey = `alert_pre_${today}_${prayerKey}_${alertSettings.minutesBefore}`;
          if (!sessionStorage.getItem(preKey)) {
            sessionStorage.setItem(preKey, 'true');
            const newNotif = triggerBrowserNotification(
              `Namoz vaqti yaqinlashmoqda (${nextInfo.nextPrayer.nameUz})`,
              `Asaka shahrida ${nextInfo.nextPrayer.nameUz} namoziga ${minutesRemaining} daqiqa qoldi. Vaqti: ${nextInfo.nextPrayer.time}`,
              'prayer',
              isFiveDaily ? (prayerKey as 'bomdod' | 'peshin' | 'asr' | 'shom' | 'xufton') : undefined,
              false
            );
            setNotifications((prev) => [newNotif, ...prev]);
          }
        }
      } catch {
        // ignore
      }
    };

    checkPrayerAlert();
    const interval = setInterval(checkPrayerAlert, 15000);
    return () => clearInterval(interval);
  }, [prayerSchedule.times]);

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen flex flex-col bg-[#F8F5EC] text-[#042B25] dark:bg-[#031814] dark:text-[#F8F5EC] transition-colors duration-200 overflow-x-hidden max-w-full">
        {/* Top Header conforming to Top Bar Contract */}
        <Header
          activeTab={activeTab}
          onSelectTab={handleNavigate}
          favoritesCount={favorites.length}
          unreadNotificationsCount={unreadNotificationsCount}
          unreadMessagesCount={unreadMessagesCount}
          theme={settings.theme}
          onToggleTheme={handleCycleTheme}
          onOpenInstallModal={() => setIsInstallModalOpen(true)}
          onOpenChatModal={() => setIsChatModalOpen(true)}
          onOpenSearch={() => setIsSearchModalOpen(true)}
          onOpenTvMode={() => setIsTvModalOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24 lg:pb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={pageTransitionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
        {activeTab === 'home' && (
          <HomeView
            prayerSchedule={prayerSchedule}
            dailyAyah={DAILY_FEATURED_AYAH}
            dailyHadith={FEATURED_DAILY_HADITH}
            favorites={favorites}
            onNavigate={handleNavigate}
            onToggleFavorite={handleToggleFavorite}
            isFavorited={isFavorited}
            onOpenInstallModal={() => setIsInstallModalOpen(true)}
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
            onOpenReminderDashboard={() => handleNavigate('reminder_dashboard')}
          />
        )}

        {activeTab === 'messages' && (
          <MessagesView onNavigate={handleNavigate} />
        )}

        {activeTab === 'articles' && (
          <ArticlesView
            onToggleFavorite={handleToggleFavorite}
            isFavorited={isFavorited}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationsView onNavigate={handleNavigate} />
        )}

        {activeTab === 'daily_archive' && (
          <DailyArchiveView
            onBack={() => handleNavigate('home')}
            onNavigate={handleNavigate}
            onToggleFavorite={handleToggleFavorite}
            isFavorited={isFavorited}
          />
        )}

        {activeTab === 'news' && <NewsView />}

        {activeTab === 'announcements' && <AnnouncementsView />}

        {activeTab === 'quiz' && <QuizView />}

        {activeTab === 'calendar' && <CalendarView />}

        {activeTab === 'reminder_dashboard' && (
          <ReminderDashboard
            schedule={prayerSchedule}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onBack={() => handleNavigate('prayer')}
          />
        )}

        {activeTab === 'favorites' && (
          <FavoritesView
            favorites={favorites}
            onRemoveFavorite={handleRemoveFavorite}
            onClearAll={handleClearAllFavorites}
            onNavigate={handleNavigate}
          />
        )}

        {activeTab === 'profile' && (
          <UserProfileView
            favorites={favorites}
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

        {activeTab === 'khatm_planner' && <KhatmPlannerView />}

        {activeTab === 'prayer_journal' && <PrayerJournalView />}

        {activeTab === 'mosque_events' && <MosqueEventsView />}

        {activeTab === 'academy' && <AcademyView />}

        {activeTab === 'charity' && <CharityView />}

        {activeTab === 'fasting' && <FastingView />}

        {activeTab === 'library' && <DigitalLibraryView />}

        {activeTab === 'ask_imam' && <AskImamView />}

        {activeTab === 'ai_assistant' && <AiAssistantView />}

        {activeTab === 'search' && <GlobalSearchView onNavigate={handleNavigate} />}

        {activeTab === 'achievements' && <IslamicAchievementsView />}
            </motion.div>
          </AnimatePresence>
        </main>

      {/* Institutional Editorial Footer */}
      <Footer onSelectTab={handleNavigate} />

      {/* Mobile Bottom Navigation (12vh sticky cap) */}
      <MobileNav
        activeTab={activeTab}
        onSelectTab={handleNavigate}
        onOpenMoreMenu={() => setIsMobileMenuOpen(true)}
        unreadNotificationsCount={unreadNotificationsCount}
        unreadMessagesCount={unreadMessagesCount}
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
              { id: 'prayer', label: 'Namoz vaqtlari' },
              { id: 'quran', label: 'Qurʼoni Karim' },
              { id: 'messages', label: 'Xabarlar kanali' },
              { id: 'quiz', label: 'Kunlik Viktorina' },
              { id: 'articles', label: 'Maqolalar' },
              { id: 'notifications', label: 'Bildirishnomalar' },
              { id: 'hadith', label: 'Hadislar toʻplami' },
              { id: 'dhikr', label: 'Zikr va duolar' },
              { id: 'news', label: 'Yangiliklar' },
              { id: 'announcements', label: 'Eʼlonlar' },
              { id: 'calendar', label: 'Hijriy Taqvim' },
              { id: 'khatm_planner', label: 'Qurʼon Xatmi Rejasi' },
              { id: 'prayer_journal', label: 'Namoz Kundaligi' },
              { id: 'mosque_events', label: 'Masjid Tadbirlari' },
              { id: 'academy', label: 'Islomiy Akademiya' },
              { id: 'charity', label: 'Ehson va Sadaqa' },
              { id: 'fasting', label: 'Roʻza Yordamchisi' },
              { id: 'library', label: 'Raqamli Kutubxona' },
              { id: 'ask_imam', label: 'Imomga Savol' },
              { id: 'achievements', label: 'Shaxsiy Yutuqlar' },
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
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsChatModalOpen(true);
              }}
              className="col-span-2 w-full flex items-center justify-between p-3.5 rounded-xl bg-emerald-950/40 border border-[#c5a869]/40 text-[#c5a869] font-bold text-xs shadow-md cursor-pointer hover:bg-emerald-950/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-[#c5a869]/10">💬</span>
                <span>Maʼmuriyat bilan Muloqot & Chat</span>
              </div>
              <span className="text-[10px] bg-[#c5a869] text-[#071614] px-2 py-0.5 rounded">
                Yozish
              </span>
            </button>
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

      {/* Support Inquiry & Chat Modal */}
      <SupportChatModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
      />

      {/* Global Intelligent Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onNavigate={handleNavigate}
      />

      {/* Smart TV & Mosque 10-Foot Display Modal */}
      <SmartTvModal
        isOpen={isTvModalOpen}
        onClose={() => setIsTvModalOpen(false)}
        schedule={prayerSchedule}
        dailyAyah={DAILY_FEATURED_AYAH}
        dailyHadith={FEATURED_DAILY_HADITH}
      />

      {/* First-Launch Skippable Onboarding & Personalization Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />

      {/* Persistent Global Audio Mini/Expanded Player */}
      <PersistentAudioPlayer />
      </div>
    </MotionConfig>
  );
}
