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
  syncPrayerScheduleAlarms,
  SchedulablePrayerKey,
} from './utils/notificationService';
import { TelegramHeadsUpBanner } from './components/ui/TelegramHeadsUpBanner';
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
import { DesktopSidebar } from './components/layout/DesktopSidebar';
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
import { DailyQuranQuizView } from './components/features/quran/DailyQuranQuizView';
import { CalendarView } from './components/features/calendar/CalendarView';
import { ReminderDashboard } from './components/features/prayer/ReminderDashboard';
import { MessagesView } from './components/features/messages/MessagesView';
import { KhatmPlannerView } from './components/features/quran/KhatmPlannerView';
import { PrayerJournalView } from './components/features/prayer/PrayerJournalView';
import { MosqueEventsView } from './components/features/calendar/MosqueEventsView';
import { FastingView } from './components/features/fasting/FastingView';
import { DigitalLibraryView } from './components/features/library/DigitalLibraryView';
import { AskImamView } from './components/features/chat/AskImamView';
import { AiAssistantView } from './components/features/chat/AiAssistantView';
import { GlobalSearchView } from './components/features/search/GlobalSearchView';
import { GlobalSearchModal } from './components/features/search/GlobalSearchModal';
import { IslamicAchievementsView } from './components/features/profile/IslamicAchievementsView';
import { SmartTvModal } from './components/features/tv/SmartTvModal';
import { SmartMosqueDisplayPage } from './components/features/tv/SmartMosqueDisplayPage';
import { MasjidTvTabloPage } from './components/features/tv/MasjidTvTabloPage';
import { HifzIstiqomatView } from './components/features/academy/HifzIstiqomatView';
import { QuranAcademyView } from './components/features/academy/QuranAcademyView';
import { ScholarsView } from './components/features/scholars/ScholarsView';
import { MosquesDirectoryView } from './components/features/mosques/MosquesDirectoryView';
import { MediaCenterView } from './components/features/media/MediaCenterView';
import { OnboardingModal } from './components/ui/OnboardingModal';
import { PersistentAudioPlayer } from './components/ui/PersistentAudioPlayer';
import { PrivacyPolicyModal } from './components/features/legal/PrivacyPolicyModal';
import { pageTransitionVariants } from './utils/motionSystem';
import {
  subscribeToMessages,
  getUnreadMessagesCount,
  syncMessagesWithFirestore,
} from './utils/messagesService';
import {
  initTelegramMiniApp,
  applyTelegramThemeChrome,
  syncTelegramBackButton,
  triggerTelegramHaptic,
  resolveInitialDeepLinkTab,
} from './utils/telegramMiniApp';
import { navigateWithViewTransition } from './utils/viewTransitions';
import { Search, Download, Tv, MessageCircle, ChevronRight } from 'lucide-react';

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
    const deepLinkTab = resolveInitialDeepLinkTab();
    if (deepLinkTab) return deepLinkTab;
    if (typeof window !== 'undefined') {
      const pathName = (window.location.pathname || '').toLowerCase();
      const hashVal = (window.location.hash || '').toLowerCase();
      if (pathName.startsWith('/masjid-tv') || hashVal === '#masjid-tv' || hashVal === '#masjid_tv') {
        return 'masjid_tv';
      }
      if (pathName.startsWith('/display') || hashVal === '#display') {
        return 'display';
      }
      if (pathName.startsWith('/admin') || hashVal.includes('admin')) {
        return 'admin';
      }
      if (pathName.startsWith('/ai') || hashVal.includes('ai_assistant')) {
        return 'ai_assistant';
      }
      if (pathName.startsWith('/quran-quiz') || hashVal.includes('quran_quiz')) {
        return 'quran_quiz';
      }
    }
    return 'home';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileMenuSearch, setMobileMenuSearch] = useState('');
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isTvModalOpen, setIsTvModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isOffline, setIsOffline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine === false : false
  );

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

  // Reactive cross-tab and cross-session synchronization + Admin schedule/broadcast heads-up triggers
  useEffect(() => {
    const unsubscribeDb = subscribeToDatabase((event) => {
      if (event.type === 'PRAYER_UPDATED') {
        const updatedSchedule = getStoredPrayerSchedule();
        setPrayerSchedule(updatedSchedule);
        syncPrayerScheduleAlarms(updatedSchedule, true);
      }
      if (event.type === 'NOTIFICATIONS_UPDATED') {
        const latestNotifs = getStoredBroadcastNotifications();
        setNotifications(latestNotifs);
        const newest = latestNotifs[0];
        if (newest && !newest.read) {
          const alertSettings = getPrayerAlertSettings();
          if (alertSettings.announcementsPushEnabled !== false) {
            triggerBrowserNotification(
              newest.title,
              newest.message,
              newest.category || 'announcement',
              undefined,
              false,
              `admin_broadcast_${newest.id}`,
              newest.routeTab || 'notifications'
            );
          }
        }
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
      applyTelegramThemeChrome(shouldBeDark);
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
    navigateWithViewTransition(() => {
      setActiveTab(tab);
    });
    if (settings.hapticFeedback) {
      triggerTelegramHaptic('selection');
    }
    try {
      if (typeof window !== 'undefined' && window.history?.pushState) {
        if (tab === 'masjid_tv') {
          window.history.pushState({ tab }, '', '/masjid-tv');
        } else if (tab === 'display') {
          const nextPath =
            window.location.pathname === '/display' && window.location.search
              ? `/display${window.location.search}`
              : '/display';
          window.history.pushState({ tab }, '', nextPath);
        } else if (
          window.location.pathname.startsWith('/display') ||
          window.location.pathname.startsWith('/masjid-tv')
        ) {
          window.history.pushState({ tab }, '', `/#${tab}`);
        } else {
          window.history.pushState({ tab }, '', `#${tab}`);
        }
      }
    } catch {
      // ignore
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsMobileMenuOpen(false);
    setMobileMenuSearch('');
  };

  // Initialize Telegram Mini App native bridge (ready, expand, safe-area insets, deep links)
  useEffect(() => {
    const isDarkNow = document.documentElement.classList.contains('dark');
    const cleanup = initTelegramMiniApp(isDarkNow, (startTab) => {
      setActiveTab(startTab);
    });
    return cleanup;
  }, []);

  // Sync Telegram native BackButton with active screen
  useEffect(() => {
    syncTelegramBackButton(activeTab !== 'home', () => {
      handleNavigate('home');
    });
  }, [activeTab]);

  // Preserve browser back/forward navigation history & global keyboard shortcuts (Ctrl+K, Shift+T)
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (window.location.pathname.toLowerCase().startsWith('/masjid-tv')) {
        setActiveTab('masjid_tv');
        return;
      }
      if (window.location.pathname.toLowerCase().startsWith('/display')) {
        setActiveTab('display');
        return;
      }
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

    const handleOpenPrivacyModal = () => setIsPrivacyModalOpen(true);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('asaka-open-privacy-modal', handleOpenPrivacyModal);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('asaka-open-privacy-modal', handleOpenPrivacyModal);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Background prayer time & real Adhan alert scheduler (Asia/Tashkent aware + deterministic reschedule)
  useEffect(() => {
    syncPrayerScheduleAlarms(prayerSchedule);

    const checkPrayerAlert = () => {
      try {
        const alertSettings = getPrayerAlertSettings();
        if (!alertSettings.enabled) return;

        const nextInfo = getNextPrayerCalculation(prayerSchedule.times);
        if (!nextInfo.nextPrayer) return;

        const prayerKey = nextInfo.nextPrayer.key as SchedulablePrayerKey;
        const isSchedulable = [
          'tahajjud',
          'subh',
          'bomdod',
          'peshin',
          'asr',
          'shom',
          'xufton',
        ].includes(prayerKey);
        if (!isSchedulable) return;

        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
        const minutesRemaining = Math.ceil(nextInfo.secondsRemaining / 60);
        const preMins =
          alertSettings.perPrayerPreReminderMinutes?.[prayerKey] ?? alertSettings.minutesBefore ?? 10;

        // 1. Exact prayer time arrival (plays selected full Adhan or Chime based on per-prayer mode)
        if (
          nextInfo.secondsRemaining <= 45 &&
          alertSettings.notifyOnExactTime !== false &&
          alertSettings.individualPrayerAlerts?.[prayerKey] !== false &&
          alertSettings.individualPrayerModes?.[prayerKey] !== 'off'
        ) {
          const exactKey = `asaka_prayer_${today}_${prayerKey}_exact_${nextInfo.nextPrayer.time}`;
          const mode = alertSettings.individualPrayerModes?.[prayerKey] || 'sound';
          const newNotif = triggerBrowserNotification(
            `🕌 ${nextInfo.nextPrayer.nameUz} namozi vaqti kirdi (${nextInfo.nextPrayer.time})`,
            `Asaka shahri («MuhammadSolih Hoji» jomeʼ masjidi) jadvali boʻyicha ${nextInfo.nextPrayer.nameUz} vaqti kirdi.`,
            'prayer',
            prayerKey,
            mode === 'sound',
            exactKey,
            'prayer'
          );
          setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)]);
          return;
        }

        // 2. Pre-prayer advance reminder (5, 10, 15, or 30 minutes before — separate event!)
        if (preMins > 0 && minutesRemaining > 0 && minutesRemaining <= preMins) {
          const preKey = `asaka_prayer_${today}_${prayerKey}_pre_${preMins}m_${nextInfo.nextPrayer.time}`;
          const newNotif = triggerBrowserNotification(
            `⏳ ${nextInfo.nextPrayer.nameUz} namoziga ${minutesRemaining} daqiqa qoldi`,
            `Asaka shahrida soat ${nextInfo.nextPrayer.time} da ${nextInfo.nextPrayer.nameUz} vaqti kiradi.`,
            'prayer',
            prayerKey,
            false,
            preKey,
            'prayer'
          );
          setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)]);
        }
      } catch {
        // ignore
      }
    };

    checkPrayerAlert();
    const interval = setInterval(checkPrayerAlert, 15000);
    return () => clearInterval(interval);
  }, [prayerSchedule]);

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  // Standalone Uzbek Cyrillic Masjid Namoz Vaqtlari Tablosi (/masjid-tv)
  if (activeTab === 'masjid_tv') {
    return (
      <MotionConfig reducedMotion="user">
        <MasjidTvTabloPage
          onExitToApp={() => {
            try {
              window.history.pushState({ tab: 'home' }, '', '/');
            } catch {
              // ignore
            }
            setActiveTab('home');
          }}
        />
      </MotionConfig>
    );
  }

  // Standalone full-bleed 24/7 Smart Mosque Display screen (/display)
  if (activeTab === 'display') {
    return (
      <MotionConfig reducedMotion="user">
        <SmartMosqueDisplayPage
          onExitToApp={() => {
            try {
              window.history.pushState({ tab: 'home' }, '', '/');
            } catch {
              // ignore
            }
            setActiveTab('home');
          }}
        />
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-screen flex flex-col bg-[#F7F5F0] text-[#0B1B16] dark:bg-[#060B09] dark:text-[#F7F5F0] transition-colors duration-200 overflow-x-hidden max-w-full">
        {/* Restrained 2026 Ambient Obsidian-Emerald Top Glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 top-0 h-[380px] opacity-30 dark:opacity-100 -z-10"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 50% -15%, rgba(16, 185, 129, 0.14) 0%, rgba(200, 168, 94, 0.04) 45%, transparent 80%)',
          }}
        />

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

        {/* Telegram-Style Top Heads-Up Notification Banner */}
        <TelegramHeadsUpBanner onNavigate={handleNavigate} />

        {/* Graceful Offline Mode Banner */}
        {isOffline && (
          <div
            role="status"
            className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-3"
          >
            <div className="px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-200 text-xs font-semibold flex items-center justify-between gap-2">
              <span>
                Oflayn rejim: internet aloqasi yoʻq. Namoz vaqtlari, Qurʼon matnlari, hadis va zikrlar saqlangan keshdan ishlamoqda.
              </span>
            </div>
          </div>
        )}

        {/* Desktop Sidebar + Main Content Area */}
        <div className="flex-1 flex w-full max-w-[1600px] mx-auto">
          <DesktopSidebar
            activeTab={activeTab}
            onSelectTab={handleNavigate}
            onOpenTvMode={() => setIsTvModalOpen(true)}
            prayerSchedule={prayerSchedule}
          />
          <main className="flex-1 min-w-0 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-24 lg:pb-12">
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
            onOpenTvMode={() => setIsTvModalOpen(true)}
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
            onOpenTvMode={() => setIsTvModalOpen(true)}
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

        {activeTab === 'quiz' && (
          <QuizView onOpenQuranQuiz={() => handleNavigate('quran_quiz')} />
        )}

        {activeTab === 'quran_quiz' && <DailyQuranQuizView />}

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

        {activeTab === 'fasting' && <FastingView />}

        {activeTab === 'library' && <DigitalLibraryView />}

        {activeTab === 'ask_imam' && <AskImamView />}

        {activeTab === 'ai_assistant' && <AiAssistantView />}

        {activeTab === 'search' && <GlobalSearchView onNavigate={handleNavigate} />}

        {activeTab === 'achievements' && <IslamicAchievementsView />}

        {activeTab === 'hifz_istiqomat' && <HifzIstiqomatView />}

        {activeTab === 'academy' && <QuranAcademyView />}

        {activeTab === 'scholars' && <ScholarsView onNavigate={handleNavigate} />}

        {activeTab === 'mosques' && <MosquesDirectoryView />}

        {activeTab === 'media_center' && <MediaCenterView />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

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

      {/* 2026 Categorized & Searchable Mobile Ecosystem Sheet */}
      <Modal
        isOpen={isMobileMenuOpen}
        onClose={() => {
          setIsMobileMenuOpen(false);
          setMobileMenuSearch('');
        }}
        title="Barcha boʻlimlar"
        subtitle="ASAKA ZIYO — Islomiy raqamli ekotizim"
        maxWidth="md"
      >
        <div className="space-y-4">
          {/* Quick Live Filter */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#5F736C] dark:text-[#8EA39B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={mobileMenuSearch}
              onChange={(e) => setMobileMenuSearch(e.target.value)}
              placeholder="Boʻlim nomini qidiring (masalan: Qurʼon, Qibla, Roʻza)..."
              className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-xl bg-[#F7F5F0] dark:bg-[#0F1A16] border border-[#064E3B]/[0.12] dark:border-white/[0.1] text-xs text-[#0B1B16] dark:text-[#F7F5F0] placeholder-[#5F736C] dark:placeholder-[#7A9088] focus:outline-none focus:border-[#064E3B] dark:focus:border-[#10B981]"
            />
          </div>

          {/* Primary Platform Quick Actions */}
          {!mobileMenuSearch.trim() && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsInstallModalOpen(true);
                }}
                className="w-full min-h-[48px] flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#064E3B] dark:bg-[#10B981] text-white dark:text-[#04120D] font-semibold text-xs cursor-pointer transition-opacity hover:opacity-95"
              >
                <span className="flex items-center gap-2">
                  <Download className="w-4 h-4 shrink-0" />
                  <span>Android APK yuklab olish</span>
                </span>
                <span className="text-[11px] font-mono-numbers opacity-85">v4.0</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsTvModalOpen(true);
                }}
                className="w-full min-h-[48px] flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#0B1713] border border-white/[0.12] text-[#F7F5F0] font-semibold text-xs cursor-pointer hover:border-[#10B981]/50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Tv className="w-4 h-4 text-[#C8A85E] shrink-0" />
                  <span>Masjid Jamoat Ekrani (TV)</span>
                </span>
                <ChevronRight className="w-4 h-4 text-[#8EA39B]" />
              </button>
            </div>
          )}

          {/* Categorized Modules */}
          <div className="space-y-4">
            {[
              {
                group: 'Ibodat va Vaqt',
                items: [
                  { id: 'home', label: 'Bosh sahifa' },
                  { id: 'prayer', label: 'Namoz vaqtlari' },
                  { id: 'mosques', label: 'Masjidlar va Qibla' },
                  { id: 'calendar', label: 'Hijriy taqvim' },
                  { id: 'dhikr', label: 'Zikr va duolar' },
                  { id: 'fasting', label: 'Roʻza yordamchisi' },
                  { id: 'prayer_journal', label: 'Namoz kundaligi' },
                  { id: 'display', label: 'Smart Mosque Display (TV)' },
                ],
              },
              {
                group: 'Qurʼon va Ilm',
                items: [
                  { id: 'quran', label: 'Qurʼoni Karim' },
                  { id: 'hifz_istiqomat', label: 'Hifz va Istiqomat' },
                  { id: 'academy', label: 'Qurʼon Akademiyasi' },
                  { id: 'khatm_planner', label: 'Qurʼon xatmi rejasi' },
                  { id: 'hadith', label: 'Hadislar toʻplami' },
                  { id: 'scholars', label: 'Ulamolar va meros' },
                  { id: 'library', label: 'Raqamli kutubxona' },
                  { id: 'articles', label: 'Ilmiy maqolalar' },
                ],
              },
              {
                group: 'AI, Media va Jamiyat',
                items: [
                  { id: 'ai_assistant', label: 'Islomiy AI yordamchi' },
                  { id: 'quran_quiz', label: 'Qurʼon viktorinasi (9:16)' },
                  { id: 'quiz', label: 'Kunlik viktorina' },
                  { id: 'media_center', label: 'Media markazi' },
                  { id: 'ask_imam', label: 'Imomga savol' },
                  { id: 'mosque_events', label: 'Masjid tadbirlari' },
                  { id: 'messages', label: 'Xabarlar kanali' },
                  { id: 'news', label: 'Yangiliklar' },
                  { id: 'announcements', label: 'Eʼlonlar' },
                ],
              },
              {
                group: 'Shaxsiy va Tizim',
                items: [
                  { id: 'notifications', label: 'Bildirishnomalar' },
                  { id: 'achievements', label: 'Shaxsiy yutuqlar' },
                  { id: 'favorites', label: 'Sevimlilar' },
                  { id: 'profile', label: 'Shaxsiy profil' },
                  { id: 'settings', label: 'Sozlamalar' },
                  { id: 'admin', label: 'Maʼmuriyat konsoli' },
                ],
              },
            ].map((section) => {
              const q = mobileMenuSearch.trim().toLowerCase();
              const visible = q
                ? section.items.filter(
                    (it) =>
                      it.label.toLowerCase().includes(q) ||
                      section.group.toLowerCase().includes(q)
                  )
                : section.items;

              if (visible.length === 0) return null;

              return (
                <div key={section.group} className="space-y-2">
                  <div className="text-[11px] font-semibold text-[#5F736C] dark:text-[#8EA39B] px-0.5">
                    {section.group}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {visible.map((item) => {
                      const isCurrent = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleNavigate(item.id as NavigationTab)}
                          className={`min-h-[44px] px-3 py-2.5 rounded-xl border text-left transition-colors cursor-pointer font-medium ${
                            isCurrent
                              ? 'bg-[#064E3B] dark:bg-[#10B981] text-white dark:text-[#04120D] border-[#064E3B] dark:border-[#10B981] font-semibold'
                              : 'border-[#064E3B]/[0.08] dark:border-white/[0.08] bg-[#F7F5F0] dark:bg-[#0F1A16] text-[#0B1B16] dark:text-[#E5ECE9] hover:border-[#064E3B]/30 dark:hover:border-white/20'
                          }`}
                        >
                          <span className="line-clamp-1">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsChatModalOpen(true);
              }}
              className="w-full min-h-[48px] flex items-center justify-between px-4 py-3 rounded-xl bg-[#F2EFE9] dark:bg-[#0F1A16] border border-[#064E3B]/[0.12] dark:border-white/[0.1] text-[#0B1B16] dark:text-[#F7F5F0] font-semibold text-xs cursor-pointer hover:border-[#064E3B]/35 dark:hover:border-[#10B981]/40 transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <MessageCircle className="w-4 h-4 text-[#064E3B] dark:text-[#10B981] shrink-0" />
                <span>Maʼmuriyat bilan muloqot va yordam</span>
              </span>
              <span className="text-xs font-semibold text-[#064E3B] dark:text-[#10B981]">
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
        onOpenSmartDisplay={(profile) => {
          setIsTvModalOpen(false);
          try {
            const targetUrl = profile ? `/display?template=${encodeURIComponent(profile)}` : '/display';
            window.history.pushState({}, '', targetUrl);
          } catch {
            // ignore history error
          }
          handleNavigate('display');
        }}
      />

      {/* First-Launch Skippable Onboarding & Personalization Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />

      {/* Privacy Policy & Data Safety Modal */}
      <PrivacyPolicyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        onOpenAccountDelete={() => handleNavigate('profile')}
      />

      {/* Persistent Global Audio Mini/Expanded Player */}
      <PersistentAudioPlayer />
      </div>
    </MotionConfig>
  );
}
