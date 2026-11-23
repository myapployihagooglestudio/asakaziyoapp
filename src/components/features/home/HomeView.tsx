import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import {
  Ayah,
  HadithItem,
  NavigationTab,
  PrayerSchedule,
  SupportedLocale,
  Article,
  AnnouncementItem,
  NewsItem,
  FavoriteItem,
} from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import {
  GeometricPattern,
  IslamicMihrabArch,
  CalligraphyBasmalahBadge,
  IslamicStarEmblem,
  ArabesqueCornerOrnaments,
  RubElHizbBadge,
  VolumetricGodRays,
} from '../../ui/GeometricPattern';
import { toNewUzbekAlphabet } from '../../../utils/newUzbekAlphabet';
import {
  getNextPrayerCalculation,
  timeStringToSeconds,
  getCurrentTashkentSeconds,
} from '../../../utils/prayerTimeUtils';
import {
  getActiveDailyBundle,
  getDailyBundleForDate,
  getDailyArchiveBundles,
  DailyIslamicBundle,
} from '../../../data/dailyContentData';
import {
  getStoredBroadcastNotifications,
  getStoredArticles,
  getStoredAnnouncements,
  getStoredNews,
  getStoredHadiths,
  getStoredDhikrs,
  getStoredQuizQuestions,
  getStoredMosqueEvents,
  getStoredDigitalBooks,
  getStoredMediaPosts,
  getStoredImamQuestions,
  getStoredKhatmPlans,
  getStoredQuranProgress,
  subscribeToDatabase,
  isPubliclyPublished,
} from '../../../utils/databaseService';
import {
  toggleAdhanAudio,
  subscribeToAdhanPlayerState,
  ADHAN_TRACKS,
} from '../../../utils/notificationService';
import {
  SURAHS_LIST,
  QURAN_RECITERS,
  getActiveQuranReciters,
  getReciterSurahAudioUrl,
} from '../../../data/quranData';
import {
  QuranReciter,
  DhikrItem,
  MosqueEventItem,
  DigitalBookItem,
  MediaPost,
  ImamQuestionItem,
  KhatmPlan,
} from '../../../types';
import {
  Clock,
  BookOpen,
  Sparkles,
  ArrowRight,
  Bookmark,
  Volume2,
  Calendar,
  Smartphone,
  Download,
  Bell,
  History,
  CheckCircle,
  Compass,
  Play,
  Pause,
  Headphones,
  Megaphone,
  Newspaper,
  Bot,
  GraduationCap,
  Award,
  MessageCircleQuestion,
  Tv,
  Film,
  HeartHandshake,
  Library,
  MapPin,
  Users,
  Moon,
  Flame,
  Trophy,
} from 'lucide-react';

interface HomeViewProps {
  prayerSchedule: PrayerSchedule;
  dailyAyah: Ayah;
  dailyHadith: HadithItem;
  favorites?: FavoriteItem[];
  onNavigate: (tab: NavigationTab) => void;
  onToggleFavorite: (item: {
    id: string;
    type: 'ayah' | 'hadith' | 'dhikr' | 'article';
    title: string;
    subtitle: string;
    snippet: string;
    routeTab: NavigationTab;
    routeId: string;
  }) => void;
  isFavorited: (id: string) => boolean;
  onOpenInstallModal?: () => void;
  onOpenTvMode?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  prayerSchedule,
  favorites = [],
  onNavigate,
  onToggleFavorite,
  isFavorited,
  onOpenInstallModal,
  onOpenTvMode,
}) => {
  const { t, i18n } = useTranslation(['home', 'common', 'prayer', 'quran', 'hadith']);
  const currentLocale = (i18n.language as SupportedLocale) || 'uz-Latn';

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDateStr, setCurrentDateStr] = useState<string>('');
  const [clockHours, setClockHours] = useState('00');
  const [clockMinutes, setClockMinutes] = useState('00');
  const [clockSeconds, setClockSeconds] = useState('00');
  const [playingAudio, setPlayingAudio] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Featured Quran Recitation Mini-Studio State
  const [availableReciters, setAvailableReciters] = useState<QuranReciter[]>(() => getActiveQuranReciters());
  const [featuredReciterId, setFeaturedReciterId] = useState<string>('mishary');
  const [featuredSurahNum, setFeaturedSurahNum] = useState<number>(1);
  const [isRecitationPlaying, setIsRecitationPlaying] = useState(false);
  const [recitationAudioEl, setRecitationAudioEl] = useState<HTMLAudioElement | null>(null);
  const [isAdhanPreviewPlaying, setIsAdhanPreviewPlaying] = useState(false);

  // Daily Islamic Bundle (Ayah, Hadith, Dhikr) deterministic for Tashkent date
  const [dailyBundle, setDailyBundle] = useState<DailyIslamicBundle>(() => getActiveDailyBundle());
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

  // Live Next Prayer calculation
  const [nextPrayerInfo, setNextPrayerInfo] = useState(() =>
    getNextPrayerCalculation(prayerSchedule.times)
  );

  // Latest notifications, articles, announcements, and news from Firestore/Database
  const [notifications, setNotifications] = useState(() => getStoredBroadcastNotifications());
  const [articles, setArticles] = useState<Article[]>(() => getStoredArticles());
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(() =>
    getStoredAnnouncements().filter(isPubliclyPublished)
  );
  const [newsList, setNewsList] = useState<NewsItem[]>(() =>
    getStoredNews().filter(isPubliclyPublished)
  );

  // Full Platform Showcase live data states from Firestore / databaseService
  const [hadithCollection, setHadithCollection] = useState<HadithItem[]>(() =>
    getStoredHadiths().filter(isPubliclyPublished)
  );
  const [dhikrCollection, setDhikrCollection] = useState<DhikrItem[]>(() =>
    getStoredDhikrs().filter(isPubliclyPublished)
  );
  const [quizQuestions, setQuizQuestions] = useState<any[]>(() => getStoredQuizQuestions());
  const [mosqueEvents, setMosqueEvents] = useState<MosqueEventItem[]>(() =>
    getStoredMosqueEvents().filter((e) => e.isPublished !== false)
  );
  const [digitalBooks, setDigitalBooks] = useState<DigitalBookItem[]>(() =>
    getStoredDigitalBooks().filter((b) => b.isPublished !== false)
  );
  const [mediaPosts, setMediaPosts] = useState<MediaPost[]>(() =>
    getStoredMediaPosts().filter((m) => m.isPublished !== false)
  );
  const [imamQuestions, setImamQuestions] = useState<ImamQuestionItem[]>(() =>
    getStoredImamQuestions().filter((q) => q.isPubliclyVisible || q.status === 'answered')
  );
  const [khatmPlans, setKhatmPlans] = useState<KhatmPlan[]>(() => getStoredKhatmPlans());
  const [quranProgress] = useState(() => getStoredQuranProgress());
  const [homeTasbihCount, setHomeTasbihCount] = useState<number>(0);

  useEffect(() => {
    const refreshShowcaseData = () => {
      setHadithCollection(getStoredHadiths().filter(isPubliclyPublished));
      setDhikrCollection(getStoredDhikrs().filter(isPubliclyPublished));
      setQuizQuestions(getStoredQuizQuestions());
      setMosqueEvents(getStoredMosqueEvents().filter((e) => e.isPublished !== false));
      setDigitalBooks(getStoredDigitalBooks().filter((b) => b.isPublished !== false));
      setMediaPosts(getStoredMediaPosts().filter((m) => m.isPublished !== false));
      setImamQuestions(
        getStoredImamQuestions().filter((q) => q.isPubliclyVisible || q.status === 'answered')
      );
      setKhatmPlans(getStoredKhatmPlans());
    };

    const unsubscribe = subscribeToDatabase((event) => {
      if (event.type === 'ARTICLES_UPDATED') {
        setArticles(getStoredArticles());
      }
      if (event.type === 'NOTIFICATIONS_UPDATED') {
        setNotifications(getStoredBroadcastNotifications());
      }
      if (event.type === 'ANNOUNCEMENTS_UPDATED') {
        setAnnouncements(getStoredAnnouncements().filter(isPubliclyPublished));
      }
      if (event.type === 'NEWS_UPDATED') {
        setNewsList(getStoredNews().filter(isPubliclyPublished));
      }
      if (event.type === 'QURAN_RECITERS_UPDATED' || event.type === 'QURAN_AUDIO_UPDATED') {
        setAvailableReciters(getActiveQuranReciters());
      }
      refreshShowcaseData();
    });

    window.addEventListener('asaka_ziyo_db_updated', refreshShowcaseData);

    const unsubAdhan = subscribeToAdhanPlayerState((state) => {
      setIsAdhanPreviewPlaying(state.isPlaying);
    });

    return () => {
      unsubscribe();
      unsubAdhan();
      window.removeEventListener('asaka_ziyo_db_updated', refreshShowcaseData);
    };
  }, []);

  const unreadNotifs = notifications.filter((n) => !n.read);
  const publishedArticles = articles.filter((a) => isPubliclyPublished(a));
  const featuredArticle =
    publishedArticles.find((a) => a.isFeatured) || publishedArticles[0];

  const [completedPrayers, setCompletedPrayers] = useState<Record<string, boolean>>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('asaka_ziyo_completed_prayers_date');
        if (saved) {
          const parsed = JSON.parse(saved);
          return parsed.prayers || {};
        }
      }
    } catch {
      // fallback
    }
    return { bomdod: false, peshin: false, asr: false, shom: false, xufton: false };
  });

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(
          'asaka_ziyo_completed_prayers_date',
          JSON.stringify({ prayers: completedPrayers })
        );
      }
    } catch {
      // ignore
    }
  }, [completedPrayers]);

  const togglePrayerCompleted = (key: string) => {
    setCompletedPrayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const completedCount = Object.values(completedPrayers).filter(Boolean).length;
  const completionPercent = Math.round((completedCount / 5) * 100);

  // Dynamic Date, Clock & Next-Prayer Countdown ticker in Asia/Tashkent
  useEffect(() => {
    const updateClockAndDate = () => {
      try {
        const now = new Date();
        const tashkentDateKey = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });

        if (tashkentDateKey !== currentDateStr) {
          setCurrentDateStr(tashkentDateKey);
          setDailyBundle(getDailyBundleForDate(tashkentDateKey));
        }

        const timeStr = now.toLocaleTimeString('uz-UZ', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'Asia/Tashkent',
          hour12: false,
        });
        setCurrentTime(timeStr);

        const parts = timeStr.split(':');
        if (parts.length >= 3) {
          setClockHours(parts[0]);
          setClockMinutes(parts[1]);
          setClockSeconds(parts[2]);
        }

        setNextPrayerInfo(getNextPrayerCalculation(prayerSchedule.times));
      } catch {
        const now = new Date();
        const timeStr = now.toTimeString().slice(0, 8);
        setCurrentTime(timeStr);
      }
    };

    updateClockAndDate();
    const interval = setInterval(updateClockAndDate, 1000);
    return () => clearInterval(interval);
  }, [currentDateStr, prayerSchedule.times]);

  // Circular countdown progress calculation
  let prayerRingPercent = 68;
  try {
    const { totalSeconds } = getCurrentTashkentSeconds();
    if (nextPrayerInfo.currentPrayer && nextPrayerInfo.nextPrayer) {
      const curSec = timeStringToSeconds(nextPrayerInfo.currentPrayer.time);
      const nxtSec = timeStringToSeconds(nextPrayerInfo.nextPrayer.time);
      if (nxtSec > curSec) {
        const total = nxtSec - curSec;
        const elapsed = totalSeconds - curSec;
        prayerRingPercent = Math.min(100, Math.max(8, (elapsed / total) * 100));
      }
    }
  } catch {
    // fallback
  }

  const ringRadius = 64;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringStrokeDashoffset =
    ringCircumference - (prayerRingPercent / 100) * ringCircumference;

  const handlePlayAudio = (url?: string) => {
    if (!url) return;
    if (playingAudio && audioElement) {
      try {
        audioElement.pause();
      } catch {
        // ignore
      }
      setPlayingAudio(false);
      return;
    }
    try {
      const audio = new Audio(url);
      audio.onended = () => setPlayingAudio(false);
      audio.onerror = () => setPlayingAudio(false);
      audio.play().catch(() => setPlayingAudio(false));
      setAudioElement(audio);
      setPlayingAudio(true);
    } catch {
      setPlayingAudio(false);
    }
  };

  const handleToggleFeaturedRecitation = () => {
    if (isRecitationPlaying && recitationAudioEl) {
      try {
        recitationAudioEl.pause();
      } catch {
        // ignore
      }
      setIsRecitationPlaying(false);
      return;
    }
    try {
      const url = getReciterSurahAudioUrl(featuredReciterId, featuredSurahNum);
      const audio = new Audio(url);
      audio.onended = () => setIsRecitationPlaying(false);
      audio.onerror = () => setIsRecitationPlaying(false);
      audio.play().catch(() => setIsRecitationPlaying(false));
      setRecitationAudioEl(audio);
      setIsRecitationPlaying(true);
    } catch {
      setIsRecitationPlaying(false);
    }
  };

  const ayahTranslation =
    dailyBundle.ayah.translations?.[currentLocale]?.text ||
    (currentLocale === 'uz-Latn-new'
      ? toNewUzbekAlphabet(dailyBundle.ayah.translationUz)
      : dailyBundle.ayah.translationUz);

  const hadithTranslation =
    currentLocale === 'uz-Latn-new'
      ? toNewUzbekAlphabet(dailyBundle.hadith.translationUz)
      : dailyBundle.hadith.translationUz;

  const dhikrTranslation =
    currentLocale === 'uz-Latn-new'
      ? toNewUzbekAlphabet(dailyBundle.dhikr.translationUz)
      : dailyBundle.dhikr.translationUz;

  return (
    <div className="space-y-12 pb-16 max-w-7xl mx-auto">
      {/* 1. UNREAD BROADCAST NOTIFICATIONS RIBBON */}
      {unreadNotifs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => onNavigate('notifications')}
          className="p-3.5 sm:p-4 rounded-2xl bg-[#F1EBDD] dark:bg-[#06241E] border border-[#C6A45C]/45 text-[#042B25] dark:text-[#F8F5EC] flex items-center justify-between gap-3 shadow-sm cursor-pointer hover:border-[#C6A45C] transition-all group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#063D32] dark:bg-[#C6A45C]/20 flex items-center justify-center text-[#DCC58C] shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div className="text-xs sm:text-sm truncate">
              <span className="font-bold text-[#063D32] dark:text-[#C6A45C] tabular-nums">
                {unreadNotifs.length} ta yangi bildirishnoma:{' '}
              </span>
              <span className="text-[#2C4A42] dark:text-[#D4CFC3]">{unreadNotifs[0].title}</span>
            </div>
          </div>
          <span className="text-xs text-[#063D32] dark:text-[#DCC58C] font-bold group-hover:translate-x-0.5 transition-transform shrink-0 whitespace-nowrap">
            Koʻrish →
          </span>
        </motion.div>
      )}

      {/* 2. LUXURY SACRED CINEMA HERO SECTION WITH ANIMATED CIRCULAR PRAYER COUNTDOWN */}
      <section className="relative rounded-[32px] overflow-hidden border border-[#DFBD69]/55 az-hero-sanctuary text-[#FFF8E8] shadow-[0_32px_90px_-15px_rgba(1,9,6,0.75)]">
        <img
          src="/images/asaka_islamic_architecture_1793634657962.jpg"
          alt="Asaka Islamic Architecture"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-25 mix-blend-luminosity scale-105 transition-transform duration-1000"
        />

        <div className="absolute inset-0 bg-gradient-to-br from-[#010906]/92 via-[#041D13]/88 to-[#063D32]/82" />
        <VolumetricGodRays />
        <GeometricPattern opacity={0.07} />
        <IslamicMihrabArch className="absolute right-4 top-0 h-full w-auto opacity-30 hidden lg:block" />
        <ArabesqueCornerOrnaments size={30} />

        <div className="relative z-10 px-5 sm:px-10 lg:px-12 py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left 7 Columns: Calligraphic Basmalah, Greeting, Hijri/Gregorian Dates & Primary Actions */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2.5 pr-3.5 pl-1.5 py-1 rounded-full bg-[#010906]/85 border border-[#DFBD69]/65 shadow-lg">
                <img
                  src="/assets/aistudio/IMG_20261114_084331_924_8f6ccba1.jpg"
                  alt="MuhammadSolih Hoji Jome Masjidi"
                  className="w-7 h-7 rounded-full object-cover border border-[#DFBD69]"
                />
                <span className="text-[11px] font-extrabold tracking-wider text-[#FFF6C8]">
                  «MuhammadSolih Hoji» Jomeʼ Masjidi
                </span>
              </div>
              <CalligraphyBasmalahBadge />
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#010906]/75 border border-[#DFBD69]/40 text-xs text-[#DFBD69] shadow-inner">
                <Calendar className="w-3.5 h-3.5 text-[#DFBD69]" />
                <span>{dailyBundle.formattedDateUz}</span>
                <span className="text-[#DFBD69]/50">·</span>
                <span className="font-mono-numbers text-[#FFF8E8] font-bold">
                  {dailyBundle.hijriDateUz}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-[#DFBD69] font-bold">
                <Sparkles className="w-3.5 h-3.5 text-[#DFBD69]" />
                <span>Assalomu alaykum wa rahmatullohi wa barakatuh · {t('common:location', 'Asaka')}</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold tracking-tight text-[#FFF8E8] leading-[1.12] text-balance drop-shadow-[0_10px_28px_rgba(0,0,0,0.45)]">
                {t('home:heroTitle')}
              </h1>

              <p className="text-sm sm:text-base text-[#FFF8E8]/85 leading-relaxed max-w-2xl">
                {t('home:heroSubtitle')}
              </p>
            </div>

            {/* Live Tashkent Time + Location Pill */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="px-4 py-2.5 rounded-2xl bg-[#010906]/80 border border-[#DFBD69]/45 backdrop-blur-md flex items-center gap-3 shadow-lg">
                <Clock className="w-4 h-4 text-[#DFBD69]" />
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[#DFBD69] font-semibold block">
                    Toshkent / Asaka vaqti
                  </span>
                  <div className="text-lg font-mono-numbers font-bold text-[#FFF8E8] tracking-wider">
                    {clockHours}:{clockMinutes}:<span className="az-gold-foil-text">{clockSeconds}</span>
                  </div>
                </div>
              </div>

              <div className="px-4 py-2.5 rounded-2xl bg-[#010906]/80 border border-[#DFBD69]/45 backdrop-blur-md flex items-center gap-3 shadow-lg">
                <Compass className="w-4 h-4 text-[#DFBD69]" />
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[#DFBD69] font-semibold block">
                    Qibla yoʻnalishi
                  </span>
                  <div className="text-sm font-mono-numbers font-bold text-[#FFF8E8]">
                    {prayerSchedule.qiblaAngleDeg || 241}° Gʻarb-Janubi-Gʻarb
                  </div>
                </div>
              </div>
            </div>

            {/* Hero CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button
                variant="primary"
                size="md"
                onClick={() => onNavigate('prayer')}
                className="gap-2"
              >
                <Clock className="w-4 h-4" />
                <span>{t('home:heroPrayerCta')}</span>
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => onNavigate('quran')}
                className="gap-2 bg-[#010906]/65 backdrop-blur-md border-[#DFBD69]/60 text-[#FFF8E8] hover:bg-[#DFBD69]/20"
              >
                <BookOpen className="w-4 h-4 text-[#DFBD69]" />
                <span>{t('home:heroQuranCta')}</span>
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => onNavigate('quran_quiz')}
                className="gap-2 bg-[#010906]/65 backdrop-blur-md border-[#DFBD69]/60 text-[#DFBD69] hover:bg-[#DFBD69]/20"
              >
                <Film className="w-4 h-4 text-[#DFBD69]" />
                <span>Qurʼon Viktorinasi (9:16)</span>
              </Button>
              {onOpenTvMode && (
                <Button
                  variant="outline"
                  size="md"
                  onClick={onOpenTvMode}
                  className="gap-2 bg-[#063D32]/85 backdrop-blur-md border-[#DFBD69]/75 text-[#FFF8E8] hover:bg-[#DFBD69] hover:text-[#010906]"
                >
                  <Tv className="w-4 h-4 text-[#DFBD69]" />
                  <span>Masjid Jamoat Ekrani (TV)</span>
                </Button>
              )}
            </div>
          </div>

          {/* Right 5 Columns: Animated Circular Next-Prayer Countdown Mihrab Card */}
          <div className="lg:col-span-5">
            <div className="relative rounded-3xl bg-[#010906]/85 border border-[#DFBD69]/55 p-6 sm:p-7 backdrop-blur-2xl shadow-[0_24px_70px_rgba(0,0,0,0.65)] overflow-hidden">
              <ArabesqueCornerOrnaments size={22} />
              <div className="relative z-10 flex items-center justify-between gap-2 pb-4 border-b border-[#DFBD69]/25">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#DFBD69] block">
                    Navbatdagi Namoz Vaqti
                  </span>
                  <h2 className="text-xl sm:text-2xl font-display font-bold text-[#FFF8E8] mt-0.5">
                    {nextPrayerInfo.nextPrayer
                      ? t(`prayer:${nextPrayerInfo.nextPrayer.key}`, nextPrayerInfo.nextPrayer.nameUz)
                      : 'Bomdod'}{' '}
                    <span className="font-arabic text-lg az-gold-foil-text ml-1">
                      {nextPrayerInfo.nextPrayer?.nameAr || 'الفجر'}
                    </span>
                  </h2>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-wider text-[#FFF8E8]/60 block">
                    Azon vaqti
                  </span>
                  <span className="text-2xl font-mono-numbers font-bold az-gold-foil-text">
                    {nextPrayerInfo.nextPrayer?.time || '05:14'}
                  </span>
                </div>
              </div>

              {/* Circular Animated Progress Ring */}
              <div className="relative z-10 py-5 flex flex-col sm:flex-row items-center justify-around gap-5">
                <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 150 150">
                    <circle
                      cx="75"
                      cy="75"
                      r={ringRadius}
                      stroke="rgba(223, 189, 105, 0.16)"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    <circle
                      cx="75"
                      cy="75"
                      r={ringRadius}
                      stroke="url(#hero-countdown-gold)"
                      strokeWidth="8.5"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={ringStrokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-700 ease-out"
                    />
                    <defs>
                      <linearGradient id="hero-countdown-gold" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#8A6621" />
                        <stop offset="30%" stopColor="#DFBD69" />
                        <stop offset="55%" stopColor="#FFF6C8" />
                        <stop offset="80%" stopColor="#D4AF37" />
                        <stop offset="100%" stopColor="#7A5818" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
                    <span className="text-[10px] uppercase tracking-widest text-[#DFBD69] font-semibold">
                      Qolgan vaqt
                    </span>
                    <span className="text-xl sm:text-2xl font-mono-numbers font-bold text-[#FFF8E8] tracking-tight mt-0.5">
                      {nextPrayerInfo.countdownText}
                    </span>
                    {nextPrayerInfo.currentPrayer && (
                      <span className="text-[10px] text-emerald-300 font-semibold mt-1">
                        Hozir: {t(`prayer:${nextPrayerInfo.currentPrayer.key}`, nextPrayerInfo.currentPrayer.nameUz)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Adhan Preview & Schedule Details */}
                <div className="space-y-3 w-full sm:w-auto">
                  <div className="p-3 rounded-2xl bg-[#041D13]/90 border border-[#DFBD69]/35">
                    <div className="text-[11px] text-[#DFBD69] font-semibold">
                      Jamoat (Iqomat) vaqti:
                    </div>
                    <div className="text-lg font-mono-numbers font-bold text-[#FFF8E8]">
                      {nextPrayerInfo.nextPrayer?.iqamahTime || nextPrayerInfo.nextPrayer?.time || '05:40'}
                    </div>
                  </div>

                  <button
                    onClick={() => toggleAdhanAudio(ADHAN_TRACKS[0]?.id || 'mishary-alafasy-standard')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#DFBD69]/25 to-[#D4AF37]/15 hover:from-[#DFBD69] hover:to-[#D4AF37] text-[#FFF6C8] hover:text-[#010906] border border-[#DFBD69]/55 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                  >
                    {isAdhanPreviewPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>Azonni toʻxtatish</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Mishariy Azonini tinglash</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. TODAY'S 8 PRAYER TIMES ARCHITECTURAL RIBBON & 5-PRAYER COMPLETION TRACKER */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#063D32] dark:text-[#C6A45C] uppercase tracking-widest font-bold mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{t('navigation:prayer')}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-numbers">{currentTime} ({t('common:tashkentTime')})</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#042B25] dark:text-[#F8F5EC]">
              {t('home:todayPrayers')}
            </h2>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('prayer')}
            className="self-start sm:self-auto"
          >
            <span>{t('home:fullScheduleAndQibla')}</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* 8-Time Prayer Architectural Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
          {prayerSchedule.times.map((p) => {
            const isNext = nextPrayerInfo.nextPrayer?.key === p.key;
            const isCurrent = nextPrayerInfo.currentPrayer?.key === p.key;
            const translatedName = t(`prayer:${p.key}`, p.nameUz);

            return (
              <Card
                key={p.id}
                variant={isNext ? 'emerald' : 'elevated'}
                interactive
                onClick={() => onNavigate('prayer')}
                className={`p-4 transition-all ${
                  isNext
                    ? 'ring-2 ring-[#C6A45C] shadow-lg'
                    : isCurrent
                    ? 'border-[#063D32] dark:border-[#C6A45C]/60'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span
                    className={`font-semibold ${
                      isNext ? 'text-[#DCC58C]' : 'text-[#2C4A42] dark:text-[#D4CFC3]'
                    }`}
                  >
                    {translatedName}
                  </span>
                  <span className="font-arabic text-sm text-[#C6A45C]">{p.nameAr}</span>
                </div>
                <div
                  className={`text-2xl font-bold font-mono-numbers tracking-tight my-1 ${
                    isNext ? 'text-[#F8F5EC]' : 'text-[#042B25] dark:text-[#F8F5EC]'
                  }`}
                >
                  {p.time}
                </div>
                {p.iqamahTime ? (
                  <div
                    className={`text-[11px] ${
                      isNext ? 'text-[#F1EBDD]/85' : 'text-[#5C746C] dark:text-[#8FA69E]'
                    }`}
                  >
                    {t('prayer:iqamahTime')}:{' '}
                    <span className="font-mono-numbers font-semibold">{p.iqamahTime}</span>
                  </div>
                ) : (
                  <div
                    className={`text-[11px] italic ${
                      isNext ? 'text-[#DCC58C]' : 'text-[#5C746C] dark:text-[#8FA69E]'
                    }`}
                  >
                    {t('prayer:entryTime')}
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Daily 5-Prayer Completion Tracker Bar */}
        <Card elevated className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#063D32] dark:text-[#DCC58C] tracking-wide">
              <CheckCircle className="w-4 h-4 text-[#C6A45C] shrink-0" />
              <span>Bugungi 5 Vaqt Farz Namozlari Hisoblagichi</span>
            </div>
            <span className="text-xs font-mono-numbers text-[#063D32] dark:text-[#C6A45C] font-bold">
              {completedCount} / 5 ado etildi ({completionPercent}%)
            </span>
          </div>

          <div className="w-full h-2.5 rounded-full bg-[#F1EBDD] dark:bg-[#041D18] overflow-hidden p-0.5 border border-[#063D32]/10 dark:border-[#C6A45C]/20">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#063D32] via-[#075747] to-[#C6A45C] transition-all duration-500 ease-out"
              style={{ width: `${completionPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
            {[
              { key: 'bomdod', label: 'Bomdod' },
              { key: 'peshin', label: 'Peshin' },
              { key: 'asr', label: 'Asr' },
              { key: 'shom', label: 'Shom' },
              { key: 'xufton', label: 'Xufton' },
            ].map((item) => {
              const isDone = completedPrayers[item.key];
              return (
                <button
                  key={item.key}
                  onClick={() => togglePrayerCompleted(item.key)}
                  className={`px-3.5 min-h-[44px] rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    isDone
                      ? 'bg-[#063D32] text-[#F8F5EC] border-[#C6A45C]'
                      : 'bg-[#F8F5EC] dark:bg-[#041D18] border-[#063D32]/15 dark:border-[#C6A45C]/20 text-[#2C4A42] dark:text-[#D4CFC3] hover:border-[#C6A45C]'
                  }`}
                >
                  <span>{item.label}</span>
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                      isDone
                        ? 'bg-[#C6A45C] text-[#042B25] font-bold'
                        : 'border border-[#5C746C]'
                    }`}
                  >
                    {isDone ? '✓' : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      </section>

      {/* 4. QUICK-ACCESS SUPER APP BENTO NAVIGATION GRID */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#063D32] dark:text-[#C6A45C] block">
              ASAKA ZIYO — Super App Xizmatlari
            </span>
            <h2 className="text-2xl font-display font-bold text-[#042B25] dark:text-[#F8F5EC]">
              Tezkor Boʻlimlar va Ilmiy Manbalar
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
          {[
            {
              tab: 'quran' as NavigationTab,
              title: 'Qurʼoni Karim',
              subtitle: '114 sura · Tafsiri Hilol · 8 qori',
              badge: 'Mushaf',
              icon: <BookOpen className="w-5 h-5 text-[#C6A45C]" />,
              featured: true,
            },
            {
              tab: 'hadith' as NavigationTab,
              title: 'Sahih Hadislar',
              subtitle: 'Buxoriy, Muslim va Navaviy',
              badge: 'Sunnat',
              icon: <Sparkles className="w-5 h-5 text-[#C6A45C]" />,
            },
            {
              tab: 'dhikr' as NavigationTab,
              title: 'Zikr va Duolar',
              subtitle: 'Tonggi-kechki zikrlar va Tasbeh',
              badge: 'Tasbeh',
              icon: <Award className="w-5 h-5 text-[#C6A45C]" />,
            },
            {
              tab: 'ai_assistant' as NavigationTab,
              title: 'Islomiy AI Yordamchi',
              subtitle: 'Manbali ilmiy savol-javob',
              badge: '2026 AI',
              icon: <Bot className="w-5 h-5 text-[#C6A45C]" />,
            },
            {
              tab: 'khatm_planner' as NavigationTab,
              title: 'Qurʼon Xatmi Rejasi',
              subtitle: 'Kunlik juz va oyat hisobi',
              badge: 'Reja',
              icon: <Calendar className="w-5 h-5 text-[#C6A45C]" />,
            },
            {
              tab: 'library' as NavigationTab,
              title: 'Raqamli Kutubxona',
              subtitle: 'Moʻtabar kitoblar va ilmiy asarlar',
              badge: 'Mutolaa',
              icon: <Library className="w-5 h-5 text-[#C6A45C]" />,
            },
            {
              tab: 'ask_imam' as NavigationTab,
              title: 'Imomga Savol',
              subtitle: 'Rasmiy ilmiy javoblar',
              badge: 'Fatvo/Ilm',
              icon: <MessageCircleQuestion className="w-5 h-5 text-[#C6A45C]" />,
            },
            {
              tab: 'quiz' as NavigationTab,
              title: 'Kunlik Viktorina',
              subtitle: '10 ta ilmiy savol va reyting',
              badge: 'Sinov',
              icon: <CheckCircle className="w-5 h-5 text-[#C6A45C]" />,
            },
          ].map((card) => (
            <Card
              key={card.tab}
              variant={card.featured ? 'emerald' : 'elevated'}
              interactive
              onClick={() => onNavigate(card.tab)}
              className="p-5 flex flex-col justify-between gap-4 group"
            >
              <div className="flex items-center justify-between">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
                    card.featured
                      ? 'bg-[#042B25]/70 border-[#C6A45C]/45'
                      : 'bg-[#F1EBDD] dark:bg-[#082E26] border-[#C6A45C]/30'
                  }`}
                >
                  {card.icon}
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    card.featured
                      ? 'bg-[#C6A45C]/20 text-[#DCC58C] border-[#C6A45C]/40'
                      : 'bg-[#063D32]/8 dark:bg-[#C6A45C]/15 text-[#063D32] dark:text-[#DCC58C] border-[#C6A45C]/25'
                  }`}
                >
                  {card.badge}
                </span>
              </div>

              <div>
                <h3
                  className={`text-base font-display font-bold group-hover:text-[#C6A45C] transition-colors ${
                    card.featured ? 'text-[#F8F5EC]' : 'text-[#042B25] dark:text-[#F8F5EC]'
                  }`}
                >
                  {card.title}
                </h3>
                <p
                  className={`text-xs mt-1 leading-relaxed ${
                    card.featured ? 'text-[#F1EBDD]/85' : 'text-[#5C746C] dark:text-[#8FA69E]'
                  }`}
                >
                  {card.subtitle}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 5. FEATURED AUDIO & QURAN RECITATION STUDIO SHOWCASE */}
      <Card variant="emerald" className="p-6 sm:p-8 relative overflow-hidden">
        <GeometricPattern opacity={0.06} />
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#DCC58C]">
              <Headphones className="w-4 h-4 text-[#C6A45C]" />
              <span>Premium Audio va Qurʼon Tilovati Xazinasi</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#F8F5EC]">
              114 Sura Doimiy Qiroat va Azon Tinglash
            </h2>
            <p className="text-xs sm:text-sm text-[#F1EBDD]/85 max-w-xl leading-relaxed">
              Jahonning yetakchi qorilari — Shayx Mishariy al-Afosiy, Shayx Ayman Rushdiy Suvayd va Shayx Mahmud Xalil al-Husariy ijrosidagi tilovatlarni yuqori sifatda tinglang.
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              {availableReciters.slice(0, 8).map((reciter) => (
                <button
                  key={reciter.id}
                  onClick={() => {
                    setFeaturedReciterId(reciter.id);
                    if (isRecitationPlaying && recitationAudioEl) {
                      recitationAudioEl.pause();
                      setIsRecitationPlaying(false);
                    }
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    featuredReciterId === reciter.id
                      ? 'bg-[#C6A45C] text-[#042B25] border-[#DCC58C] font-bold'
                      : 'bg-[#042B25]/70 text-[#F8F5EC] border-[#C6A45C]/30 hover:border-[#C6A45C]'
                  }`}
                >
                  {reciter.name}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 bg-[#031814]/85 border border-[#C6A45C]/40 rounded-2xl p-5 space-y-4 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-[#DCC58C] block">
                  Tanlangan sura
                </span>
                <select
                  value={featuredSurahNum}
                  onChange={(e) => {
                    setFeaturedSurahNum(Number(e.target.value));
                    if (isRecitationPlaying && recitationAudioEl) {
                      recitationAudioEl.pause();
                      setIsRecitationPlaying(false);
                    }
                  }}
                  className="mt-1 bg-[#063D32] text-[#F8F5EC] text-xs font-bold px-3 py-2 rounded-xl border border-[#C6A45C]/40 focus:outline-none"
                >
                  <option value={1}>1. Al-Fotiha surasi</option>
                  <option value={36}>36. Yosin surasi</option>
                  <option value={55}>55. Ar-Rahmon surasi</option>
                  <option value={67}>67. Al-Mulk surasi</option>
                  <option value={112}>112. Al-Ixlos surasi</option>
                  <option value={114}>114. An-Nos surasi</option>
                </select>
              </div>

              <button
                onClick={handleToggleFeaturedRecitation}
                className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C6A45C] to-[#B38F45] text-[#042B25] flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer shrink-0"
                title={isRecitationPlaying ? 'Toʻxtatish' : 'Tilovatni tinglash'}
              >
                {isRecitationPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-[#D4CFC3] pt-2 border-t border-[#C6A45C]/20">
              <span>
                Qori:{' '}
                <strong className="text-[#DCC58C]">
                  {(availableReciters.find((r) => r.id === featuredReciterId) || QURAN_RECITERS[0])?.name}
                </strong>
              </span>
              <button
                onClick={() => onNavigate('quran')}
                className="text-[#C6A45C] font-bold hover:underline cursor-pointer"
              >
                Toʻliq Mushaf →
              </button>
            </div>

            <button
              onClick={() => onNavigate('quran_quiz')}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C6A45C]/25 to-[#DCC58C]/20 hover:from-[#C6A45C]/35 hover:to-[#DCC58C]/30 border border-[#C6A45C]/50 text-[#DCC58C] text-xs font-bold flex items-center justify-between transition-all cursor-pointer"
            >
              <span>Kunlik Qurʼon Viktorinasi (9:16 Audio Shorts)</span>
              <span>Boshlash →</span>
            </button>
          </div>
        </div>
      </Card>

      {/* 6. ASYMMETRIC DAILY ISLAMIC WISDOM SUITE (KUN OYATI, KUN HADISI, KUN ZIKRI) */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#063D32]/12 dark:border-[#C6A45C]/20 pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[#063D32] dark:text-[#C6A45C] uppercase tracking-widest">
              <Sparkles className="w-4 h-4" />
              <span>Har Kunlik Islomiy Maʼrifat</span>
              <span>·</span>
              <span className="font-mono-numbers">{dailyBundle.formattedDateUz}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#042B25] dark:text-[#F8F5EC]">
              Kun Oyati, Sahih Hadisi va Zikri
            </h2>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsArchiveModalOpen(true)}
            className="text-xs self-start sm:self-auto"
          >
            <History className="w-3.5 h-3.5 mr-1.5" />
            <span>Kunlik Arxivni Ochish</span>
          </Button>
        </div>

        {/* Asymmetric Layout: Left 7 Cols Illuminated Kun Oyati, Right 5 Cols Stacked Hadith & Dhikr */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Kun Oyati (7 Cols) */}
          <Card
            elevated
            ornamental
            className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden space-y-6 border-[#DFBD69]/45"
          >
            <GeometricPattern opacity={0.04} />
            <div className="relative z-10 space-y-5">
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#063D32]/10 dark:bg-[#DFBD69]/15 border border-[#DFBD69]/35 text-xs font-bold text-[#063D32] dark:text-[#FFF6C8]">
                  <IslamicStarEmblem size={12} />
                  <span>Kun Oyati · {dailyBundle.ayah.surahNameUz} surasi, {dailyBundle.ayah.numberInSurah}-oyat</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handlePlayAudio(dailyBundle.ayah.audioUrl)}
                    className={`min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl border transition-colors cursor-pointer ${
                      playingAudio
                        ? 'az-gold-foil-bg text-[#010906] border-[#DFBD69]'
                        : 'text-[#063D32] dark:text-[#DFBD69] border-[#063D32]/20 dark:border-[#DFBD69]/35 hover:border-[#DFBD69]'
                    }`}
                    title="Qiroatni tinglash"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() =>
                      onToggleFavorite({
                        id: dailyBundle.ayah.id,
                        type: 'ayah',
                        title: `${dailyBundle.ayah.surahNameUz}, ${dailyBundle.ayah.numberInSurah}`,
                        subtitle: 'Kun Oyati',
                        snippet: ayahTranslation,
                        routeTab: 'quran',
                        routeId: dailyBundle.ayah.id,
                      })
                    }
                    className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl border text-[#063D32] dark:text-[#DFBD69] border-[#063D32]/20 dark:border-[#DFBD69]/35 hover:border-[#DFBD69] transition-colors cursor-pointer"
                    title="Saqlash"
                  >
                    <Bookmark
                      className={`w-4 h-4 ${
                        isFavorited(dailyBundle.ayah.id) ? 'fill-[#DFBD69] text-[#DFBD69]' : ''
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="p-5 sm:p-6 rounded-2xl bg-[#F1EBDD]/80 dark:bg-[#010906]/75 border border-[#DFBD69]/35 shadow-inner">
                <p
                  dir="rtl"
                  className="font-arabic text-2xl sm:text-3xl text-[#03170F] dark:text-[#FFF8E8] leading-[2.3] text-right"
                >
                  {dailyBundle.ayah.textAr}
                </p>
              </div>

              <p className="text-base sm:text-lg text-[#03170F] dark:text-[#FFF8E8]/90 leading-relaxed font-editorial italic">
                «{ayahTranslation}»
              </p>
            </div>

            <div className="relative z-10 pt-4 border-t border-[#063D32]/12 dark:border-[#DFBD69]/20 text-xs text-[#5C746C] dark:text-[#FFF8E8]/65 flex items-center justify-between gap-2">
              <span className="truncate">Tafsiri Hilol · Shayx Muhammad Sodiq Muhammad Yusuf</span>
              <button
                onClick={() => onNavigate('quran')}
                className="text-[#063D32] dark:text-[#DFBD69] font-bold hover:underline shrink-0 cursor-pointer"
              >
                Qurʼoni Karimga oʻtish →
              </button>
            </div>
          </Card>

          {/* Right 5 Cols: Stacked Kun Hadisi & Kun Zikri */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Kun Hadisi */}
            <Card elevated ornamental className="p-6 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-[#063D32] dark:text-[#C6A45C]">
                    Kun Hadisi · {dailyBundle.hadith.collectionNameUz}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#063D32]/10 dark:bg-[#C6A45C]/20 text-[#063D32] dark:text-[#DCC58C] font-bold">
                    {dailyBundle.hadith.grade}
                  </span>
                </div>

                <p
                  dir="rtl"
                  className="font-arabic text-xl text-[#042B25] dark:text-[#F8F5EC] leading-relaxed text-right"
                >
                  {dailyBundle.hadith.textAr}
                </p>

                <p className="text-sm text-[#2C4A42] dark:text-[#D4CFC3] leading-relaxed font-editorial italic">
                  «{hadithTranslation}»
                </p>
              </div>

              <div className="pt-3 border-t border-[#063D32]/10 dark:border-[#C6A45C]/20 text-xs text-[#5C746C] dark:text-[#8FA69E] flex items-center justify-between">
                <span>Roviy: {dailyBundle.hadith.narratorUz}</span>
                <button
                  onClick={() => onNavigate('hadith')}
                  className="text-[#063D32] dark:text-[#C6A45C] font-bold hover:underline cursor-pointer"
                >
                  Hadislar →
                </button>
              </div>
            </Card>

            {/* Kun Zikri */}
            <Card elevated className="p-6 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-[#063D32] dark:text-[#C6A45C]">
                    Kun Zikri · {dailyBundle.dhikr.titleUz}
                  </span>
                  <span className="font-mono-numbers font-bold text-[#063D32] dark:text-[#DCC58C]">
                    {dailyBundle.dhikr.targetCount} marta
                  </span>
                </div>

                <p
                  dir="rtl"
                  className="font-arabic text-xl text-[#042B25] dark:text-[#F8F5EC] leading-relaxed text-right"
                >
                  {dailyBundle.dhikr.textAr}
                </p>

                <p className="text-xs text-[#2C4A42] dark:text-[#D4CFC3] leading-relaxed">
                  «{dhikrTranslation}»
                </p>
              </div>

              <div className="pt-3 border-t border-[#063D32]/10 dark:border-[#C6A45C]/20 text-xs text-[#5C746C] dark:text-[#8FA69E] flex items-center justify-between">
                <span>{dailyBundle.dhikr.source}</span>
                <button
                  onClick={() => onNavigate('dhikr')}
                  className="text-[#063D32] dark:text-[#C6A45C] font-bold hover:underline cursor-pointer"
                >
                  Raqamli Tasbeh →
                </button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* 7. EDITORIAL MAGAZINE SPLIT: FEATURED ARTICLES (LEFT) & ANNOUNCEMENTS + NEWS (RIGHT) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Cols: Featured Islamic Articles */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#063D32] dark:text-[#C6A45C] block">
                Ilmiy-Maʼrifiy Maqolalar
              </span>
              <h2 className="text-2xl font-display font-bold text-[#042B25] dark:text-[#F8F5EC]">
                Tanlangan Maqolalar va Nashrlar
              </h2>
            </div>
            <button
              onClick={() => onNavigate('articles')}
              className="text-xs font-bold text-[#063D32] dark:text-[#C6A45C] hover:underline cursor-pointer"
            >
              Barchasi ({publishedArticles.length}) →
            </button>
          </div>

          {featuredArticle && (
            <Card
              elevated
              interactive
              onClick={() => onNavigate('articles')}
              className="overflow-hidden group"
            >
              {featuredArticle.featuredImage && (
                <div className="aspect-[16/8] w-full overflow-hidden bg-[#042B25]">
                  <img
                    src={featuredArticle.featuredImage}
                    alt={featuredArticle.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              )}
              <div className="p-6 space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#5C746C] dark:text-[#8FA69E]">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#063D32] text-[#F8F5EC] dark:bg-[#C6A45C] dark:text-[#042B25] font-bold">
                    {featuredArticle.category}
                  </span>
                  <span>·</span>
                  <span className="tabular-nums">{featuredArticle.publishedDate}</span>
                  <span>·</span>
                  <span>{featuredArticle.author}</span>
                </div>

                <h3 className="text-xl sm:text-2xl font-editorial font-bold text-[#042B25] dark:text-[#F8F5EC] group-hover:text-[#063D32] dark:group-hover:text-[#C6A45C] transition-colors">
                  {featuredArticle.title}
                </h3>

                <p className="text-xs sm:text-sm text-[#2C4A42] dark:text-[#D4CFC3] line-clamp-2 leading-relaxed">
                  {featuredArticle.excerpt || featuredArticle.subtitle}
                </p>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {publishedArticles.slice(1, 3).map((art) => (
              <Card
                key={art.id}
                elevated
                interactive
                onClick={() => onNavigate('articles')}
                className="p-5 flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-[#063D32] dark:text-[#C6A45C]">
                    {art.category} · {art.publishedDate}
                  </span>
                  <h4 className="text-base font-display font-bold text-[#042B25] dark:text-[#F8F5EC] line-clamp-2">
                    {art.title}
                  </h4>
                  <p className="text-xs text-[#5C746C] dark:text-[#8FA69E] line-clamp-2">
                    {art.excerpt || art.subtitle}
                  </p>
                </div>
                <span className="text-xs font-bold text-[#063D32] dark:text-[#C6A45C]">
                  Oʻqish →
                </span>
              </Card>
            ))}
          </div>
        </div>

        {/* Right 5 Cols: Mosque Announcements & Regional News Feed */}
        <div className="lg:col-span-5 space-y-6">
          {/* Announcements Block */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-[#C6A45C]" />
                <h3 className="text-lg font-display font-bold text-[#042B25] dark:text-[#F8F5EC]">
                  Masjid Eʼlonlari
                </h3>
              </div>
              <button
                onClick={() => onNavigate('announcements')}
                className="text-xs font-bold text-[#063D32] dark:text-[#C6A45C] hover:underline cursor-pointer"
              >
                Barcha eʼlonlar →
              </button>
            </div>

            <div className="space-y-3">
              {announcements.slice(0, 2).map((ann) => (
                <Card
                  key={ann.id}
                  elevated
                  interactive
                  onClick={() => onNavigate('announcements')}
                  className="p-4 space-y-2"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#C6A45C]/20 text-[#063D32] dark:text-[#DCC58C] font-bold">
                      {ann.typeLabelUz}
                    </span>
                    <span className="font-mono-numbers text-[#5C746C] dark:text-[#8FA69E]">
                      {ann.date}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#042B25] dark:text-[#F8F5EC]">
                    {ann.title}
                  </h4>
                  <p className="text-xs text-[#2C4A42] dark:text-[#D4CFC3] line-clamp-2">
                    {ann.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>

          {/* News Block */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-[#C6A45C]" />
                <h3 className="text-lg font-display font-bold text-[#042B25] dark:text-[#F8F5EC]">
                  Soʻnggi Yangiliklar
                </h3>
              </div>
              <button
                onClick={() => onNavigate('news')}
                className="text-xs font-bold text-[#063D32] dark:text-[#C6A45C] hover:underline cursor-pointer"
              >
                Yangiliklar →
              </button>
            </div>

            <div className="space-y-3">
              {newsList.slice(0, 2).map((news) => (
                <Card
                  key={news.id}
                  elevated
                  interactive
                  onClick={() => onNavigate('news')}
                  className="p-4 flex items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <span className="text-[11px] font-bold text-[#063D32] dark:text-[#C6A45C]">
                      {news.category} · {news.publishedDate}
                    </span>
                    <h4 className="text-sm font-bold text-[#042B25] dark:text-[#F8F5EC] truncate">
                      {news.title}
                    </h4>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#C6A45C] shrink-0" />
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 8. SAVED FAVORITES & APK MOBILE INSTALLATION SHELF */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Saved Favorites Summary (5 Cols) */}
        <Card elevated className="lg:col-span-5 p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-[#C6A45C]" />
              <h3 className="text-base font-display font-bold text-[#042B25] dark:text-[#F8F5EC]">
                Saqlangan Sevimlilar ({favorites.length})
              </h3>
            </div>
            <button
              onClick={() => onNavigate('favorites')}
              className="text-xs font-bold text-[#063D32] dark:text-[#C6A45C] hover:underline cursor-pointer"
            >
              Ochish →
            </button>
          </div>

          {favorites.length > 0 ? (
            <div className="space-y-2">
              {favorites.slice(0, 2).map((fav) => (
                <div
                  key={fav.id}
                  onClick={() => onNavigate(fav.routeTab)}
                  className="p-3 rounded-xl bg-[#F1EBDD]/70 dark:bg-[#041D18] border border-[#063D32]/10 dark:border-[#C6A45C]/20 cursor-pointer hover:border-[#C6A45C] transition-all"
                >
                  <div className="text-xs font-bold text-[#042B25] dark:text-[#F8F5EC] truncate">
                    {fav.title}
                  </div>
                  <div className="text-[11px] text-[#5C746C] dark:text-[#8FA69E] truncate">
                    {fav.snippet}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#5C746C] dark:text-[#8FA69E] leading-relaxed">
              Oyatlar, sahih hadislar, zikrlar yoki maqolalarni xatchoʻp belgisini bosib saqlab qoʻyishingiz mumkin.
            </p>
          )}
        </Card>

        {/* Smartphone APK Promo (7 Cols) */}
        <Card
          variant="emerald"
          className="lg:col-span-7 p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
        >
          <GeometricPattern opacity={0.05} />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-white border-2 border-[#C6A45C]/75 flex items-center justify-center shrink-0 shadow-md">
              <img
                src="/assets/aistudio/IMG_20261114_084331_924_8f6ccba1.jpg"
                alt="ASAKA ZIYO Mobil Ilovasi Rasmiy Logosi"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base font-display font-bold text-[#F8F5EC]">
                  ASAKA ZIYO Mobil Ilovasi
                </span>
                <span className="text-[10px] font-mono-numbers bg-[#C6A45C] text-[#042B25] px-2 py-0.5 rounded font-bold">
                  APK v4.0.0 / PWA
                </span>
              </div>
              <p className="text-xs text-[#F1EBDD]/85 leading-relaxed max-w-md">
                Oflayn Qurʼoni Karim, Asaka namoz vaqtlari, Telegram uslubidagi Heads-up eslatmalar va azon bildirishnomalarini smartfoningizga oʻrnating.
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={onOpenInstallModal}
            className="relative z-10 w-full sm:w-auto justify-center"
          >
            <Download className="w-4 h-4 mr-1.5" />
            <span>Oʻrnatish</span>
          </Button>
        </Card>
      </section>

      {/* =======================================================================
          9. QUR'ONI KARIM MUSHAF & KUNLIK 9:16 AUDIO VIKTORINA SHOWCASE
          ======================================================================= */}
      <section className="space-y-5 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#063D32]/12 dark:border-[#DFBD69]/20 pb-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#063D32] dark:text-[#DFBD69] block">
              Kalomulloh Xazinasi va Hofiza Sinovi
            </span>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#042B25] dark:text-[#FFF8E8]">
              Qurʼoni Karim Mushafi va 9:16 Audio Viktorina
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button variant="outline" size="sm" onClick={() => onNavigate('quran')}>
              <span>114 Sura Mushaf</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <Button variant="primary" size="sm" onClick={() => onNavigate('quran_quiz')}>
              <Film className="w-4 h-4 mr-1.5" />
              <span>9:16 Viktorina va MP4 Eksport</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left 7 Cols: 114 Surah Explorer & Tafsiri Hilol Preview */}
          <Card elevated ornamental className="lg:col-span-7 p-6 sm:p-7 flex flex-col justify-between gap-5">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="px-3 py-1 rounded-full bg-[#063D32]/10 dark:bg-[#DFBD69]/15 border border-[#DFBD69]/35 text-xs font-bold text-[#063D32] dark:text-[#FFF6C8]">
                  Shayx Muhammad Sodiq Muhammad Yusuf · «Tafsiri Hilol»
                </span>
                <span className="text-xs font-mono-numbers text-[#5C746C] dark:text-[#DFBD69]">
                  Oxirgi oʻqilgan: {quranProgress.lastReadSurah}-sura, {quranProgress.lastReadAyah}-oyat
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {SURAHS_LIST.filter((s) => [1, 2, 18, 36, 55, 67].includes(s.number)).map((surah) => (
                  <div
                    key={surah.number}
                    onClick={() => onNavigate('quran')}
                    className="p-3.5 rounded-2xl bg-[#F8F5EC] dark:bg-[#041D13]/90 border border-[#063D32]/15 dark:border-[#DFBD69]/30 hover:border-[#DFBD69] transition-all cursor-pointer group flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <RubElHizbBadge size="sm">{surah.number}</RubElHizbBadge>
                      <span className="font-arabic text-lg text-[#063D32] dark:text-[#DFBD69]">
                        {surah.nameAr}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-display font-bold text-[#042B25] dark:text-[#FFF8E8] group-hover:text-[#063D32] dark:group-hover:text-[#DFBD69]">
                        {surah.nameUz} surasi
                      </div>
                      <div className="text-[11px] text-[#5C746C] dark:text-[#FFF8E8]/65">
                        {surah.meaningUz} · {surah.numberOfAyahs} oyat
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-[#063D32]/12 dark:border-[#DFBD69]/20 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-[#5C746C] dark:text-[#FFF8E8]/75">
                30 pora · 114 sura · 6236 oyat · Oyatma-oyat audio va maʼnolar tarjimasi
              </span>
              <button
                onClick={() => onNavigate('quran')}
                className="font-bold text-[#063D32] dark:text-[#DFBD69] hover:underline cursor-pointer"
              >
                Barcha 114 surani ochish →
              </button>
            </div>
          </Card>

          {/* Right 5 Cols: Luxury Sacred Cinema 9:16 Quran Quiz Live Preview */}
          <div
            onClick={() => onNavigate('quran_quiz')}
            className="lg:col-span-5 relative rounded-3xl qz-stage p-6 border-2 border-[#DFBD69]/65 shadow-[0_24px_70px_rgba(1,9,6,0.75)] flex flex-col justify-between gap-4 cursor-pointer group overflow-hidden"
          >
            <VolumetricGodRays />
            <ArabesqueCornerOrnaments size={22} />

            <div className="relative z-10 flex items-center justify-between gap-2">
              <span className="px-3 py-1 rounded-full bg-[#DFBD69]/20 border border-[#DFBD69]/55 text-[#FFF6C8] text-[11px] font-extrabold uppercase tracking-wider">
                9:16 Sacred Cinema Shorts
              </span>
              <span className="text-xs font-mono-numbers font-bold text-emerald-300">
                10 ta savol · MP4 Video
              </span>
            </div>

            <div className="relative z-10 p-4 rounded-2xl qz-obsidian-card border border-[#DFBD69]/45 space-y-2.5 text-center">
              <div className="text-[11px] font-bold text-[#DFBD69] uppercase tracking-widest">
                Ar-Rahmon surasi · 13-oyat
              </div>
              <p dir="rtl" className="font-arabic text-2xl text-[#FFF8E8] leading-relaxed">
                فَبِأَيِّ آلَاءِ رَبِّكُمَا <span className="qz-hidden-word-capsule mx-1">[  ؟  ]</span>
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {['تُكَذِّبَانِ', 'تَعْلَمُونَ', 'تَشْكُرُونَ', 'تُؤْمِنُونَ'].map((opt, idx) => (
                  <div
                    key={opt}
                    className={`px-3 py-2 rounded-xl border text-sm font-arabic flex items-center justify-between ${
                      idx === 0
                        ? 'bg-emerald-600/35 border-emerald-400 text-[#FFF8E8]'
                        : 'bg-[#041D13]/85 border-[#DFBD69]/35 text-[#FFF8E8]/85'
                    }`}
                  >
                    <span className="text-xs font-bold text-[#DFBD69]">
                      {['١', '٢', '٣', '٤'][idx]}
                    </span>
                    <span dir="rtl">{opt}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative z-10 flex items-center justify-between text-xs text-[#FFF8E8]/90 pt-1">
              <span>Qori tilovati + 3.5s taymer + Tafsiri Hilol</span>
              <span className="font-extrabold text-[#DFBD69] group-hover:translate-x-1 transition-transform">
                Viktorinani boshlash →
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =======================================================================
          10. SAHIH HADISLAR VA SUNNAT XAZINASI SHOWCASE (`hadith`)
          ======================================================================= */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#063D32]/12 dark:border-[#DFBD69]/20 pb-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#063D32] dark:text-[#DFBD69] block">
              Paygʻambarimiz ﷺ Sunnatlari
            </span>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#042B25] dark:text-[#FFF8E8]">
              Sahih Hadislar Toʻplami (Buxoriy, Muslim, Navaviy)
            </h2>
          </div>
          <Button variant="outline" size="sm" onClick={() => onNavigate('hadith')}>
            <span>Barcha Hadislar ({hadithCollection.length})</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {hadithCollection.slice(0, 3).map((item) => (
            <Card
              key={item.id}
              elevated
              ornamental
              interactive
              onClick={() => onNavigate('hadith')}
              className="p-6 flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <RubElHizbBadge size="sm">{item.number}</RubElHizbBadge>
                    <span className="text-xs font-bold text-[#063D32] dark:text-[#DFBD69]">
                      {item.collectionNameUz}
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                    {item.grade}
                  </span>
                </div>

                <p
                  dir="rtl"
                  className="font-arabic text-xl text-[#042B25] dark:text-[#FFF6C8] leading-relaxed text-right line-clamp-2"
                >
                  {item.textAr}
                </p>

                <p className="text-xs sm:text-sm text-[#2C4A42] dark:text-[#FFF8E8]/90 leading-relaxed line-clamp-3 font-editorial italic">
                  «{item.translationUz}»
                </p>
              </div>

              <div className="pt-3 border-t border-[#063D32]/10 dark:border-[#DFBD69]/20 flex items-center justify-between text-xs text-[#5C746C] dark:text-[#FFF8E8]/70">
                <span className="truncate">Roviy: {item.narratorUz}</span>
                <span className="font-bold text-[#063D32] dark:text-[#DFBD69] shrink-0">
                  Oʻqish →
                </span>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* =======================================================================
          11. ZIKR VA DUOLAR HAMDA INTERAKTIV RAQAMLI TASBEH SHOWCASE (`dhikr`)
          ======================================================================= */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#063D32]/12 dark:border-[#DFBD69]/20 pb-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#063D32] dark:text-[#DFBD69] block">
              Qalb Xotirjamligi va Kunlik Vazifalar
            </span>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#042B25] dark:text-[#FFF8E8]">
              Tonggi-Kechki Zikrlar, Duolar va Raqamli Tasbeh
            </h2>
          </div>
          <Button variant="outline" size="sm" onClick={() => onNavigate('dhikr')}>
            <span>Zikrlar va Tasbeh ({dhikrCollection.length})</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left 8 Cols: 2 Featured Dhikr Cards */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {dhikrCollection.slice(0, 2).map((dhikr) => (
              <Card
                key={dhikr.id}
                elevated
                ornamental
                interactive
                onClick={() => onNavigate('dhikr')}
                className="p-6 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-full bg-[#063D32]/10 dark:bg-[#DFBD69]/15 text-[#063D32] dark:text-[#FFF6C8] font-bold">
                      {dhikr.categoryTitleUz}
                    </span>
                    <span className="font-mono-numbers font-extrabold text-[#063D32] dark:text-[#DFBD69]">
                      {dhikr.targetCount} marta
                    </span>
                  </div>
                  <h3 className="text-base font-display font-bold text-[#042B25] dark:text-[#FFF8E8]">
                    {dhikr.titleUz}
                  </h3>
                  <p
                    dir="rtl"
                    className="font-arabic text-xl text-[#042B25] dark:text-[#FFF6C8] leading-relaxed text-right line-clamp-2"
                  >
                    {dhikr.textAr}
                  </p>
                  <p className="text-xs text-[#2C4A42] dark:text-[#FFF8E8]/85 line-clamp-2 leading-relaxed">
                    «{dhikr.translationUz}»
                  </p>
                </div>

                <div className="pt-3 border-t border-[#063D32]/10 dark:border-[#DFBD69]/20 flex items-center justify-between text-xs">
                  <span className="text-[#5C746C] dark:text-[#FFF8E8]/65 truncate">
                    {dhikr.source}
                  </span>
                  <span className="font-bold text-[#063D32] dark:text-[#DFBD69] shrink-0">
                    Zikr qilish →
                  </span>
                </div>
              </Card>
            ))}
          </div>

          {/* Right 4 Cols: Interactive Mini Digital Tasbih Counter */}
          <Card
            variant="emerald"
            className="lg:col-span-4 p-6 flex flex-col items-center justify-between text-center gap-4 relative overflow-hidden"
          >
            <ArabesqueCornerOrnaments size={20} />
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#DFBD69]">
                Tezkor Raqamli Tasbeh
              </span>
              <div className="font-arabic text-2xl text-[#FFF6C8]">سُبْحَانَ اللَّهِ وَبِحَمْدِهِ</div>
              <div className="text-xs text-[#FFF8E8]/80">Subhanallohi va bihamdihi</div>
            </div>

            <button
              type="button"
              onClick={() => setHomeTasbihCount((c) => c + 1)}
              className="w-28 h-28 rounded-full bg-[radial-gradient(circle_at_30%_25%,#092E1F_0%,#041D13_65%,#010906_100%)] border-2 border-[#DFBD69] shadow-[0_0_30px_rgba(223,189,105,0.35)] active:scale-95 transition-transform flex flex-col items-center justify-center cursor-pointer"
            >
              <span className="text-3xl font-mono-numbers tabular-nums font-extrabold text-[#FFF6C8]">
                {homeTasbihCount}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-[#DFBD69] mt-0.5">
                Bosing · / 33
              </span>
            </button>

            <div className="w-full flex items-center justify-between gap-2 pt-2 border-t border-[#DFBD69]/25 text-xs">
              <button
                type="button"
                onClick={() => setHomeTasbihCount(0)}
                className="text-[#FFF8E8]/70 hover:text-white cursor-pointer"
              >
                Nollash
              </button>
              <button
                type="button"
                onClick={() => onNavigate('dhikr')}
                className="font-bold text-[#DFBD69] hover:underline cursor-pointer"
              >
                Toʻliq Tasbeh Studiyasi →
              </button>
            </div>
          </Card>
        </div>
      </section>

      {/* =======================================================================
          12. RASMIY BREND IDENTIFIKATSIYASI VA MASJID JAMOAT TADBIRLARI SHOWCASE
          ======================================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Cols: Official Brand Logos & Mosque Identity */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b border-[#063D32]/12 dark:border-[#DFBD69]/20 pb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#063D32] dark:text-[#DFBD69] block">
                Oʻzbekiston Musulmonlari Idorasi · Andijon Viloyati, Asaka Tumani
              </span>
              <h2 className="text-2xl font-display font-bold text-[#042B25] dark:text-[#FFF8E8]">
                «MuhammadSolih Hoji» Jomeʼ Masjidi Rasmiy Ramzlari
              </h2>
            </div>
            <a
              href="https://t.me/Asaka_Ziyo"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-[#063D32] dark:text-[#DFBD69] hover:underline"
            >
              @Asaka_Ziyo →
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Card
              variant="emerald"
              ornamental
              className="p-5 flex flex-col items-center text-center justify-between gap-4"
            >
              <div className="w-36 h-36 rounded-full overflow-hidden border-2 border-[#DFBD69] shadow-[0_12px_32px_rgba(0,0,0,0.55)] bg-white p-1">
                <img
                  src="/assets/aistudio/IMG_20261114_084331_924_8f6ccba1.jpg"
                  alt="MuhammadSolih Hoji Jome Masjidi Rasmiy Muhr Logosi"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#DFBD69]">
                  Rasmiy Masjid Nishoni
                </span>
                <h3 className="text-base font-display font-bold text-[#FFF8E8]">
                  «MuhammadSolih Hoji» Jomeʼ Masjidi
                </h3>
                <p className="text-xs text-[#FFF8E8]/80 leading-relaxed">
                  Oʻzbekiston Musulmonlari Idorasi Andijon viloyati, Asaka tumani bosh jomeʼ masjidi rasmiy ramzi.
                </p>
              </div>
            </Card>

            <Card
              variant="emerald"
              ornamental
              className="p-5 flex flex-col items-center text-center justify-between gap-4"
            >
              <div className="w-36 h-36 rounded-full overflow-hidden border-2 border-[#DFBD69] shadow-[0_12px_32px_rgba(0,0,0,0.55)] bg-white p-1">
                <img
                  src="/assets/aistudio/IMG_20261114_084331_924_8f6ccba1.jpg"
                  alt="ASAKA ZIYO Rasmiy Brend Logotipi"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#DFBD69]">
                  Rasmiy Raqamli Ekotizim va Kanal
                </span>
                <h3 className="text-base font-display font-bold text-[#FFF8E8]">
                  ASAKA ZIYO Rasmiy Brendi
                </h3>
                <p className="text-xs text-[#FFF8E8]/80 leading-relaxed">
                  Ilmiy-maʼrifiy raqamli platforma, Android mobil ilovasi (v4.0.0) va @Asaka_Ziyo Telegram kanali.
                </p>
              </div>
            </Card>
          </div>
        </div>

        {/* Right 5 Cols: Masjid va Jamoat Tadbirlari (`mosque_events`) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#063D32]/12 dark:border-[#DFBD69]/20 pb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#063D32] dark:text-[#DFBD69] block">
                Juma Suhbatlari va Ilmiy Majlislar
              </span>
              <h2 className="text-2xl font-display font-bold text-[#042B25] dark:text-[#FFF8E8]">
                Masjid va Jamoat Tadbirlari
              </h2>
            </div>
            <button
              onClick={() => onNavigate('mosque_events')}
              className="text-xs font-bold text-[#063D32] dark:text-[#DFBD69] hover:underline cursor-pointer"
            >
              Tadbirlar →
            </button>
          </div>

          <div className="space-y-3.5">
            {mosqueEvents.slice(0, 3).map((ev) => (
              <Card
                key={ev.id}
                elevated
                interactive
                onClick={() => onNavigate('mosque_events')}
                className="p-5 space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-bold">
                    {ev.date} · {ev.time}
                  </span>
                  <span className="text-[11px] text-[#5C746C] dark:text-[#DFBD69] font-semibold flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>{ev.registeredUserIds?.length || 0} ishtirokchi</span>
                  </span>
                </div>
                <h3 className="text-base font-display font-bold text-[#042B25] dark:text-[#FFF8E8]">
                  {ev.title}
                </h3>
                <p className="text-xs text-[#2C4A42] dark:text-[#FFF8E8]/80 line-clamp-2">
                  {ev.description}
                </p>
                <div className="flex items-center justify-between text-[11px] text-[#5C746C] dark:text-[#FFF8E8]/70 pt-1">
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="w-3.5 h-3.5 text-[#DFBD69] shrink-0" />
                    <span>{ev.location}</span>
                  </span>
                  <span className="font-bold text-[#063D32] dark:text-[#DFBD69] shrink-0">
                    Roʻyxatdan oʻtish →
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* =======================================================================
          13. RAQAMLI KUTUBXONA VA MEDIA LAVHALAR SHOWCASE (`library` & `media`)
          ======================================================================= */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#063D32]/12 dark:border-[#DFBD69]/20 pb-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#063D32] dark:text-[#DFBD69] block">
              Moʻtabar Kitoblar va Audio/Video Maʼruzalar
            </span>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#042B25] dark:text-[#FFF8E8]">
              Raqamli Islomiy Kutubxona va Media Lavhalar
            </h2>
          </div>
          <Button variant="outline" size="sm" onClick={() => onNavigate('library')}>
            <Library className="w-4 h-4 mr-1.5" />
            <span>Kutubxonaga oʻtish ({digitalBooks.length} kitob)</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {digitalBooks.slice(0, 3).map((book) => (
            <Card
              key={book.id}
              elevated
              ornamental
              interactive
              onClick={() => onNavigate('library')}
              className="p-6 flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#063D32]/10 dark:bg-[#DFBD69]/15 text-[#063D32] dark:text-[#FFF6C8] font-bold">
                    {book.categoryTitleUz}
                  </span>
                  <span className="font-mono-numbers text-[#5C746C] dark:text-[#DFBD69]">
                    {book.pagesCount} bet
                  </span>
                </div>
                <h3 className="text-lg font-display font-bold text-[#042B25] dark:text-[#FFF8E8]">
                  {book.title}
                </h3>
                <div className="text-xs font-semibold text-[#063D32] dark:text-[#DFBD69]">
                  Muallif: {book.author}
                </div>
                <p className="text-xs text-[#2C4A42] dark:text-[#FFF8E8]/80 line-clamp-2 leading-relaxed">
                  {book.description}
                </p>
              </div>

              <div className="pt-3 border-t border-[#063D32]/10 dark:border-[#DFBD69]/20 flex items-center justify-between text-xs">
                <span className="text-[#5C746C] dark:text-[#FFF8E8]/65">
                  {book.publisher} · {book.year}
                </span>
                <span className="font-bold text-[#063D32] dark:text-[#DFBD69]">
                  Mutolaa qilish →
                </span>
              </div>
            </Card>
          ))}
        </div>

        {mediaPosts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            {mediaPosts.slice(0, 3).map((post) => (
              <Card
                key={post.id}
                elevated
                interactive
                onClick={() => onNavigate('articles')}
                className="p-4 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#063D32] dark:bg-[#DFBD69]/20 flex items-center justify-center text-[#FFF6C8] shrink-0">
                    <Play className="w-4 h-4 fill-current" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-[#063D32] dark:text-[#DFBD69]">
                      {post.category} · {post.type.toUpperCase()}
                    </div>
                    <div className="text-sm font-bold text-[#042B25] dark:text-[#FFF8E8] truncate">
                      {post.title}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#DFBD69] shrink-0" />
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* =======================================================================
          14. UMUMIY VIKTORINA VA SHAXSIY IBODAT REJALARI SHOWCASE
          ======================================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 6 Cols: Umumiy Islomiy Viktorina (`quiz`) */}
        <Card
          elevated
          ornamental
          interactive
          onClick={() => onNavigate('quiz')}
          className="lg:col-span-6 p-6 flex flex-col justify-between gap-4"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-[#063D32]/10 dark:bg-[#DFBD69]/15 text-xs font-bold text-[#063D32] dark:text-[#FFF6C8] flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-[#DFBD69]" />
                <span>Ilmiy Viktorina</span>
              </span>
              <span className="text-xs font-mono-numbers font-bold text-[#063D32] dark:text-[#DFBD69]">
                {quizQuestions.length || 10}+ savol
              </span>
            </div>
            <h3 className="text-xl font-display font-bold text-[#042B25] dark:text-[#FFF8E8]">
              Aqida, Fiqh, Siyrat va Hadis Bilim Sinovi
            </h3>
            <p className="text-xs text-[#2C4A42] dark:text-[#FFF8E8]/80 leading-relaxed">
              Moʻtabar manbalar asosida tuzilgan kunlik 10 talik test savollarini yeching va ilmiy darajangizni oshiring.
            </p>
          </div>
          <div className="pt-3 border-t border-[#063D32]/10 dark:border-[#DFBD69]/20 flex items-center justify-between text-xs font-bold text-[#063D32] dark:text-[#DFBD69]">
            <span>Manbali izohlar bilan</span>
            <span>Sinovni boshlash →</span>
          </div>
        </Card>

        {/* Right 6 Cols: Roʻza, Taqvim va Qurʼon Xatmi Rejasi (`khatm_planner`, `fasting`, `calendar`) */}
        <Card elevated ornamental className="lg:col-span-6 p-6 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <span className="px-3 py-1 rounded-full bg-[#063D32]/10 dark:bg-[#DFBD69]/15 text-xs font-bold text-[#063D32] dark:text-[#FFF6C8] inline-flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5 text-[#DFBD69]" />
              <span>Shaxsiy Ibodat Rejalari</span>
            </span>
            <h3 className="text-xl font-display font-bold text-[#042B25] dark:text-[#FFF8E8]">
              Xatm Rejasi, Roʻza Kundaligi va Hijriy Taqvim
            </h3>
            <div className="grid grid-cols-1 gap-2 pt-1">
              <button
                type="button"
                onClick={() => onNavigate('khatm_planner')}
                className="p-2.5 rounded-xl bg-[#F8F5EC] dark:bg-[#041D13] border border-[#063D32]/15 dark:border-[#DFBD69]/30 hover:border-[#DFBD69] flex items-center justify-between text-xs font-bold text-[#042B25] dark:text-[#FFF8E8] cursor-pointer"
              >
                <span>📖 Qurʼon Xatmi ({khatmPlans[0]?.completedPages || 0}/604 bet)</span>
                <span className="text-[#063D32] dark:text-[#DFBD69]">Ochish →</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('fasting')}
                className="p-2.5 rounded-xl bg-[#F8F5EC] dark:bg-[#041D13] border border-[#063D32]/15 dark:border-[#DFBD69]/30 hover:border-[#DFBD69] flex items-center justify-between text-xs font-bold text-[#042B25] dark:text-[#FFF8E8] cursor-pointer"
              >
                <span>🌙 Roʻza va Saharlik/Iftorlik Duolari</span>
                <span className="text-[#063D32] dark:text-[#DFBD69]">Ochish →</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('calendar')}
                className="p-2.5 rounded-xl bg-[#F8F5EC] dark:bg-[#041D13] border border-[#063D32]/15 dark:border-[#DFBD69]/30 hover:border-[#DFBD69] flex items-center justify-between text-xs font-bold text-[#042B25] dark:text-[#FFF8E8] cursor-pointer"
              >
                <span>📅 Hijriy-Milodiy Islomiy Taqvim</span>
                <span className="text-[#063D32] dark:text-[#DFBD69]">Ochish →</span>
              </button>
            </div>
          </div>
        </Card>
      </section>

      {/* =======================================================================
          14B. ASAKA ZIYO SUPER APP — HIFZ, AKADEMIYA, ULAMOLAR, MASJIDLAR, MEDIA
          ======================================================================= */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#8A6621] dark:text-[#DFBD69]">
              ASAKA ZIYO · Super Ekotizim Modullari
            </span>
            <h2 className="text-xl sm:text-2xl font-display font-bold text-[#042B25] dark:text-[#FFF8E8]">
              Taʼlim, Hifz, Ulamolar Merosi va Masjidlar Xizmati
            </h2>
          </div>
          <span className="text-xs text-[#526B62] dark:text-[#9CB5AC]">
            Firestore bilan real-time sinxronlangan
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            {
              id: 'hifz_istiqomat' as NavigationTab,
              title: 'Hifz va Istiqomat',
              subtitle: '1/3/7/16/35-kunlik Murojaʼa va 114 sura yodlash tizimi',
              badge: 'Murojaʼa',
              icon: <Flame className="w-5 h-5 text-[#DFBD69]" />,
            },
            {
              id: 'academy' as NavigationTab,
              title: 'Qurʼon Akademiyasi',
              subtitle: 'Arab alifbosi, Maxraj, rangli Tajvid, Muallimi Soniy va Bolalar',
              badge: 'Taʼlim',
              icon: <GraduationCap className="w-5 h-5 text-[#DFBD69]" />,
            },
            {
              id: 'scholars' as NavigationTab,
              title: 'Ulamolar va Meros',
              subtitle: 'Shayx MSMY, Hasanxon va Husaynxon domla, Shayx Alijon qori asarlari',
              badge: 'Ilmiy meros',
              icon: <Users className="w-5 h-5 text-[#DFBD69]" />,
            },
            {
              id: 'mosques' as NavigationTab,
              title: 'Masjidlar va Qibla',
              subtitle: 'Asaka va Andijon masjidlari xaritasi hamda jonli Qibla kompasi',
              badge: 'Xarita · 241°',
              icon: <MapPin className="w-5 h-5 text-[#DFBD69]" />,
            },
            {
              id: 'media_center' as NavigationTab,
              title: 'Media Markazi',
              subtitle: 'Audio suhbatlar, tilovatlar, video maʼruzalar va uyqu taymeri',
              badge: 'Audio · Video',
              icon: <Headphones className="w-5 h-5 text-[#DFBD69]" />,
            },
          ].map((mod) => (
            <Card
              key={mod.id}
              elevated
              interactive
              onClick={() => onNavigate(mod.id)}
              className="p-4 flex flex-col justify-between gap-3 border-[#063D32]/15 dark:border-[#DFBD69]/25 hover:border-[#DFBD69]"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="w-10 h-10 rounded-xl bg-[#063D32] dark:bg-[#092E1F] border border-[#DFBD69]/40 flex items-center justify-center shrink-0">
                    {mod.icon}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#063D32]/10 dark:bg-[#DFBD69]/15 text-[#063D32] dark:text-[#DFBD69]">
                    {mod.badge}
                  </span>
                </div>
                <h3 className="text-base font-display font-bold text-[#042B25] dark:text-[#FFF8E8]">
                  {mod.title}
                </h3>
                <p className="text-xs text-[#3C5850] dark:text-[#BFD1CA] leading-relaxed line-clamp-3">
                  {mod.subtitle}
                </p>
              </div>
              <div className="pt-2 border-t border-[#063D32]/10 dark:border-[#DFBD69]/15 flex items-center justify-between text-xs font-bold text-[#063D32] dark:text-[#DFBD69]">
                <span>Ochish</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* =======================================================================
          15. IMOMGA SAVOL VA ISLOMIY AI YORDAMCHI SHOWCASE (`ask_imam` & `ai_assistant`)
          ======================================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 6 Cols: Imomga Savol (`ask_imam`) */}
        <Card
          elevated
          ornamental
          interactive
          onClick={() => onNavigate('ask_imam')}
          className="lg:col-span-6 p-6 sm:p-7 flex flex-col justify-between gap-4"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-[#063D32]/10 dark:bg-[#DFBD69]/15 text-xs font-bold text-[#063D32] dark:text-[#FFF6C8] flex items-center gap-1.5">
                <MessageCircleQuestion className="w-4 h-4 text-[#DFBD69]" />
                <span>Imomga Savol · Ilmiy Javoblar</span>
              </span>
              <span className="text-xs font-mono-numbers text-[#5C746C] dark:text-[#DFBD69]">
                {imamQuestions.length} ta javob
              </span>
            </div>
            <h3 className="text-xl font-display font-bold text-[#042B25] dark:text-[#FFF8E8]">
              {imamQuestions[0]?.title || 'Ibodat, Fiqh va Oila Masalalari Boʻyicha Savol Yoʻllang'}
            </h3>
            <p className="text-xs sm:text-sm text-[#2C4A42] dark:text-[#FFF8E8]/85 line-clamp-2 leading-relaxed">
              {imamQuestions[0]?.answerText ||
                'Ahli sunna val jamoa — Hanafiy mazhabi moʻtabar manbalari asosida ilmiy javoblar oling.'}
            </p>
          </div>
          <div className="pt-3 border-t border-[#063D32]/10 dark:border-[#DFBD69]/20 flex items-center justify-between text-xs font-bold text-[#063D32] dark:text-[#DFBD69]">
            <span>{imamQuestions[0]?.assignedScholarName || 'Asaka Jome Masjidi Ilmiy Hayʼati'}</span>
            <span>Savol berish va javoblar →</span>
          </div>
        </Card>

        {/* Right 6 Cols: Islomiy AI Yordamchi (`ai_assistant`) */}
        <Card
          variant="emerald"
          interactive
          onClick={() => onNavigate('ai_assistant')}
          className="lg:col-span-6 p-6 sm:p-7 flex flex-col justify-between gap-4 relative overflow-hidden"
        >
          <ArabesqueCornerOrnaments size={20} />
          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-[#DFBD69]/20 border border-[#DFBD69]/45 text-xs font-bold text-[#FFF6C8] flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-[#DFBD69]" />
                <span>ASAKA ZIYO · Ilmiy AI Yordamchi</span>
              </span>
              <span className="text-xs font-mono-numbers text-emerald-300 font-bold">
                24/7 Manbali Yordam
              </span>
            </div>
            <h3 className="text-xl font-display font-bold text-[#FFF8E8]">
              Qurʼon Oyatlarini Qidirish, Hadis va Zikrlar Boʻyicha Aqlli Yordamchi
            </h3>
            <p className="text-xs sm:text-sm text-[#FFF8E8]/85 leading-relaxed">
              Tafsiri Hilol, Sahihul Buxoriy va Hanafiy fiqhi manbalariga tayangan holda tezkor maʼrifiy maʼlumot oling.
            </p>
          </div>
          <div className="relative z-10 pt-3 border-t border-[#DFBD69]/25 flex items-center justify-between text-xs font-bold text-[#DFBD69]">
            <span>Oyat, hadis va duo qidiruvi</span>
            <span>AI Yordamchini ochish →</span>
          </div>
        </Card>
      </section>

      {/* KUNLIK ARXIV MODAL */}
      <Modal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        title="Kunlik Islomiy Maʼlumotlar Arxivi"
        subtitle="Oʻtgan va kelgusi kunlar oyat, hadis va zikrlari"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#5C746C] dark:text-[#8FA69E]">
            Kun tanlang. Maʼlumotlar har kuni Toshkent vaqti bilan soat 00:00 da avtomatik yangilanadi.
          </p>

          <div className="space-y-2.5 max-h-96 overflow-y-auto">
            {getDailyArchiveBundles().map((bundle) => {
              const isCurrent = bundle.dateKey === dailyBundle.dateKey;
              return (
                <div
                  key={bundle.id}
                  onClick={() => {
                    setDailyBundle(bundle);
                    setIsArchiveModalOpen(false);
                  }}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                    isCurrent
                      ? 'border-[#C6A45C] bg-[#C6A45C]/15'
                      : 'border-[#063D32]/15 dark:border-[#C6A45C]/20 hover:bg-[#F1EBDD] dark:hover:bg-white/5'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#042B25] dark:text-[#F8F5EC]">
                        {bundle.formattedDateUz}
                      </span>
                      <span className="text-[11px] text-[#C6A45C] font-mono-numbers">
                        ({bundle.hijriDateUz})
                      </span>
                    </div>
                    <div className="text-xs text-[#5C746C] dark:text-[#8FA69E] space-x-2">
                      <span>Oyat: {bundle.ayah.surahNameUz} ({bundle.ayah.numberInSurah})</span>
                      <span>·</span>
                      <span>Hadis: {bundle.hadith.collectionNameUz} (№{bundle.hadith.number})</span>
                    </div>
                  </div>

                  <span className="text-xs text-[#063D32] dark:text-[#C6A45C] font-bold">Tanlash →</span>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>
    </div>
  );
};
