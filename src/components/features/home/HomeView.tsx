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
  subscribeToDatabase,
  isPubliclyPublished,
} from '../../../utils/databaseService';
import {
  toggleAdhanAudio,
  subscribeToAdhanPlayerState,
  ADHAN_TRACKS,
} from '../../../utils/notificationService';
import {
  QURAN_RECITERS,
  getActiveQuranReciters,
  getReciterSurahAudioUrl,
} from '../../../data/quranData';
import { QuranReciter } from '../../../types';
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
}

export const HomeView: React.FC<HomeViewProps> = ({
  prayerSchedule,
  favorites = [],
  onNavigate,
  onToggleFavorite,
  isFavorited,
  onOpenInstallModal,
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

  useEffect(() => {
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
    });

    const unsubAdhan = subscribeToAdhanPlayerState((state) => {
      setIsAdhanPreviewPlaying(state.isPlaying);
    });

    return () => {
      unsubscribe();
      unsubAdhan();
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

      {/* 2. 2026 ARCHITECTURAL HERO SECTION WITH ANIMATED CIRCULAR PRAYER COUNTDOWN */}
      <section className="relative rounded-[28px] overflow-hidden border border-[#C6A45C]/40 bg-[#042B25] text-[#F8F5EC] shadow-[0_28px_60px_-15px_rgba(4,43,37,0.45)]">
        <img
          src="/images/asaka_islamic_architecture_1793634657962.jpg"
          alt="Asaka Islamic Architecture"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-35 scale-105 transition-transform duration-1000"
        />

        <div className="absolute inset-0 bg-gradient-to-br from-[#042B25]/96 via-[#063D32]/90 to-[#075747]/82" />
        <GeometricPattern opacity={0.07} />
        <IslamicMihrabArch className="absolute right-4 top-0 h-full w-auto opacity-30 hidden lg:block" />

        <div className="relative z-10 px-5 sm:px-10 lg:px-12 py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left 7 Columns: Calligraphic Basmalah, Greeting, Hijri/Gregorian Dates & Primary Actions */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <CalligraphyBasmalahBadge />
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#031814]/65 border border-[#C6A45C]/30 text-xs text-[#DCC58C]">
                <Calendar className="w-3.5 h-3.5 text-[#C6A45C]" />
                <span>{dailyBundle.formattedDateUz}</span>
                <span className="text-[#C6A45C]/50">·</span>
                <span className="font-mono-numbers text-[#F8F5EC] font-semibold">
                  {dailyBundle.hijriDateUz}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#DCC58C] font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-[#C6A45C]" />
                <span>Assalomu alaykum wa rahmatullohi wa barakatuh · {t('common:location', 'Asaka')}</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold tracking-tight text-[#F8F5EC] leading-[1.12] text-balance">
                {t('home:heroTitle')}
              </h1>

              <p className="text-sm sm:text-base text-[#F1EBDD]/90 leading-relaxed max-w-2xl">
                {t('home:heroSubtitle')}
              </p>
            </div>

            {/* Live Tashkent Time + Location Pill */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="px-4 py-2.5 rounded-2xl bg-[#031814]/75 border border-[#C6A45C]/35 backdrop-blur-md flex items-center gap-3">
                <Clock className="w-4 h-4 text-[#C6A45C]" />
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[#DCC58C] block">
                    Toshkent / Asaka vaqti
                  </span>
                  <div className="text-lg font-mono-numbers font-bold text-[#F8F5EC] tracking-wider">
                    {clockHours}:{clockMinutes}:<span className="text-[#C6A45C]">{clockSeconds}</span>
                  </div>
                </div>
              </div>

              <div className="px-4 py-2.5 rounded-2xl bg-[#031814]/75 border border-[#C6A45C]/35 backdrop-blur-md flex items-center gap-3">
                <Compass className="w-4 h-4 text-[#C6A45C]" />
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[#DCC58C] block">
                    Qibla yoʻnalishi
                  </span>
                  <div className="text-sm font-mono-numbers font-bold text-[#F8F5EC]">
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
                className="gap-2 bg-[#031814]/50 backdrop-blur-sm border-[#C6A45C]/55 text-[#F8F5EC] hover:bg-[#C6A45C]/20"
              >
                <BookOpen className="w-4 h-4 text-[#DCC58C]" />
                <span>{t('home:heroQuranCta')}</span>
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => onNavigate('ai_assistant')}
                className="gap-2 bg-[#031814]/50 backdrop-blur-sm border-[#F8F5EC]/20 text-[#F1EBDD] hover:border-[#C6A45C]"
              >
                <Bot className="w-4 h-4 text-[#C6A45C]" />
                <span>AI Islomiy Yordamchi</span>
              </Button>
            </div>
          </div>

          {/* Right 5 Columns: Animated Circular Next-Prayer Countdown Mihrab Card */}
          <div className="lg:col-span-5">
            <div className="relative rounded-3xl bg-[#031814]/80 border border-[#C6A45C]/45 p-6 sm:p-7 backdrop-blur-xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between gap-2 pb-4 border-b border-[#C6A45C]/20">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#DCC58C] block">
                    Navbatdagi Namoz Vaqti
                  </span>
                  <h2 className="text-xl sm:text-2xl font-display font-bold text-[#F8F5EC] mt-0.5">
                    {nextPrayerInfo.nextPrayer
                      ? t(`prayer:${nextPrayerInfo.nextPrayer.key}`, nextPrayerInfo.nextPrayer.nameUz)
                      : 'Bomdod'}{' '}
                    <span className="font-arabic text-lg text-[#C6A45C] ml-1">
                      {nextPrayerInfo.nextPrayer?.nameAr || 'الفجر'}
                    </span>
                  </h2>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-wider text-[#8FA69E] block">
                    Kirish vaqti
                  </span>
                  <span className="text-2xl font-mono-numbers font-bold text-[#DCC58C]">
                    {nextPrayerInfo.nextPrayer?.time || '05:14'}
                  </span>
                </div>
              </div>

              {/* Circular Animated Progress Ring */}
              <div className="py-5 flex flex-col sm:flex-row items-center justify-around gap-5">
                <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 150 150">
                    <circle
                      cx="75"
                      cy="75"
                      r={ringRadius}
                      stroke="rgba(198, 164, 92, 0.16)"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    <circle
                      cx="75"
                      cy="75"
                      r={ringRadius}
                      stroke="url(#hero-countdown-gold)"
                      strokeWidth="8"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={ringStrokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-700 ease-out"
                    />
                    <defs>
                      <linearGradient id="hero-countdown-gold" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#DCC58C" />
                        <stop offset="100%" stopColor="#C6A45C" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
                    <span className="text-[10px] uppercase tracking-widest text-[#DCC58C]">
                      Qolgan vaqt
                    </span>
                    <span className="text-xl sm:text-2xl font-mono-numbers font-bold text-[#F8F5EC] tracking-tight mt-0.5">
                      {nextPrayerInfo.countdownText}
                    </span>
                    {nextPrayerInfo.currentPrayer && (
                      <span className="text-[10px] text-emerald-300 font-medium mt-1">
                        Hozir: {t(`prayer:${nextPrayerInfo.currentPrayer.key}`, nextPrayerInfo.currentPrayer.nameUz)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Adhan Preview & Schedule Details */}
                <div className="space-y-3 w-full sm:w-auto">
                  <div className="p-3 rounded-2xl bg-[#063D32]/60 border border-[#C6A45C]/25">
                    <div className="text-[11px] text-[#DCC58C] font-semibold">
                      Jamoat (Iqomat) vaqti:
                    </div>
                    <div className="text-lg font-mono-numbers font-bold text-[#F8F5EC]">
                      {nextPrayerInfo.nextPrayer?.iqamahTime || nextPrayerInfo.nextPrayer?.time || '05:40'}
                    </div>
                  </div>

                  <button
                    onClick={() => toggleAdhanAudio(ADHAN_TRACKS[0]?.id || 'mishary-alafasy-standard')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#C6A45C]/25 to-[#C6A45C]/10 hover:from-[#C6A45C] hover:to-[#B38F45] text-[#DCC58C] hover:text-[#042B25] border border-[#C6A45C]/45 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
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
              tab: 'academy' as NavigationTab,
              title: 'Islomiy Akademiya',
              subtitle: 'Tajvid, Aqida va Fiqh darslari',
              badge: 'Taʼlim',
              icon: <GraduationCap className="w-5 h-5 text-[#C6A45C]" />,
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
            className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden space-y-6 border-[#C6A45C]/35"
          >
            <GeometricPattern opacity={0.035} />
            <div className="relative z-10 space-y-5">
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#063D32]/10 dark:bg-[#C6A45C]/15 text-xs font-bold text-[#063D32] dark:text-[#DCC58C]">
                  <IslamicStarEmblem size={12} />
                  <span>Kun Oyati · {dailyBundle.ayah.surahNameUz} surasi, {dailyBundle.ayah.numberInSurah}-oyat</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handlePlayAudio(dailyBundle.ayah.audioUrl)}
                    className={`min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl border transition-colors cursor-pointer ${
                      playingAudio
                        ? 'bg-[#C6A45C] text-[#042B25] border-[#C6A45C]'
                        : 'text-[#063D32] dark:text-[#DCC58C] border-[#063D32]/20 dark:border-[#C6A45C]/30 hover:border-[#C6A45C]'
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
                    className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl border text-[#063D32] dark:text-[#DCC58C] border-[#063D32]/20 dark:border-[#C6A45C]/30 hover:border-[#C6A45C] transition-colors cursor-pointer"
                    title="Saqlash"
                  >
                    <Bookmark
                      className={`w-4 h-4 ${
                        isFavorited(dailyBundle.ayah.id) ? 'fill-[#C6A45C] text-[#C6A45C]' : ''
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="p-5 sm:p-6 rounded-2xl bg-[#F1EBDD]/75 dark:bg-[#041D18] border border-[#C6A45C]/25">
                <p
                  dir="rtl"
                  className="font-arabic text-2xl sm:text-3xl text-[#042B25] dark:text-[#F8F5EC] leading-[2.3] text-right"
                >
                  {dailyBundle.ayah.textAr}
                </p>
              </div>

              <p className="text-base sm:text-lg text-[#042B25] dark:text-[#F1EBDD] leading-relaxed font-editorial italic">
                «{ayahTranslation}»
              </p>
            </div>

            <div className="relative z-10 pt-4 border-t border-[#063D32]/12 dark:border-[#C6A45C]/20 text-xs text-[#5C746C] dark:text-[#8FA69E] flex items-center justify-between gap-2">
              <span className="truncate">Tafsiri Hilol · Shayx Muhammad Sodiq Muhammad Yusuf</span>
              <button
                onClick={() => onNavigate('quran')}
                className="text-[#063D32] dark:text-[#C6A45C] font-bold hover:underline shrink-0 cursor-pointer"
              >
                Qurʼoni Karimga oʻtish →
              </button>
            </div>
          </Card>

          {/* Right 5 Cols: Stacked Kun Hadisi & Kun Zikri */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Kun Hadisi */}
            <Card elevated className="p-6 flex-1 flex flex-col justify-between space-y-4">
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
            <div className="w-12 h-12 rounded-2xl bg-[#C6A45C]/20 border border-[#C6A45C]/45 flex items-center justify-center text-[#DCC58C] shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base font-display font-bold text-[#F8F5EC]">
                  ASAKA ZIYO Mobil Ilovasi
                </span>
                <span className="text-[10px] font-mono-numbers bg-[#C6A45C] text-[#042B25] px-2 py-0.5 rounded font-bold">
                  APK / PWA
                </span>
              </div>
              <p className="text-xs text-[#F1EBDD]/85 leading-relaxed max-w-md">
                Oflayn Qurʼoni Karim, Asaka namoz vaqtlari vidjeti va azon eslatmalarini smartfoningizga oʻrnating.
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
