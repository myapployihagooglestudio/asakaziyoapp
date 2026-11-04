import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Ayah, HadithItem, NavigationTab, PrayerSchedule, SupportedLocale, Article } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { GeometricPattern } from '../../ui/GeometricPattern';
import { toNewUzbekAlphabet } from '../../../utils/newUzbekAlphabet';
import { getNextPrayerCalculation } from '../../../utils/prayerTimeUtils';
import {
  getActiveDailyBundle,
  getDailyBundleForDate,
  getDailyArchiveBundles,
  DailyIslamicBundle,
} from '../../../data/dailyContentData';
import {
  getStoredBroadcastNotifications,
  getStoredArticles,
} from '../../../utils/databaseService';
import {
  Clock,
  BookOpen,
  Sparkles,
  ArrowRight,
  Bookmark,
  Volume2,
  Calendar,
  AlertCircle,
  ChevronRight,
  Smartphone,
  Download,
  Bell,
  Heart,
  History,
  CheckCircle,
  ExternalLink,
  Pin,
} from 'lucide-react';

interface HomeViewProps {
  prayerSchedule: PrayerSchedule;
  dailyAyah: Ayah;
  dailyHadith: HadithItem;
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

  // Daily Islamic Bundle (Ayah, Hadith, Dhikr) deterministic for Tashkent date
  const [dailyBundle, setDailyBundle] = useState<DailyIslamicBundle>(() => getActiveDailyBundle());
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

  // Latest notifications & featured content
  const [notifications] = useState(() => getStoredBroadcastNotifications());
  const [articles] = useState<Article[]>(() => getStoredArticles());

  const unreadNotifs = notifications.filter((n) => !n.read);
  const featuredArticle = articles.find((a) => a.isFeatured) || articles[0];

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

  // Dynamic Date & Clock ticker ensuring daily rollover in Asia/Tashkent
  useEffect(() => {
    const updateClockAndDate = () => {
      try {
        const now = new Date();
        const tashkentDateKey = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
        
        // If date rolled over, update daily bundle
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
      } catch {
        const now = new Date();
        const timeStr = now.toTimeString().slice(0, 8);
        setCurrentTime(timeStr);
        const parts = timeStr.split(':');
        if (parts.length >= 3) {
          setClockHours(parts[0]);
          setClockMinutes(parts[1]);
          setClockSeconds(parts[2]);
        }
      }
    };

    updateClockAndDate();
    const interval = setInterval(updateClockAndDate, 1000);
    return () => clearInterval(interval);
  }, [currentDateStr]);

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
    <div className="space-y-10 pb-16 max-w-7xl mx-auto">
      {/* 1. TOP NOTICE / UNREAD NOTIFICATIONS BAR */}
      {unreadNotifs.length > 0 && (
        <div
          onClick={() => onNavigate('notifications')}
          className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-[#071614] to-emerald-950/70 border border-[#c5a869]/40 text-white flex items-center justify-between gap-3 shadow-lg cursor-pointer hover:border-[#c5a869] transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#c5a869]/20 flex items-center justify-center text-[#c5a869] shrink-0">
              <Bell className="w-4 h-4 animate-pulse" />
            </div>
            <div className="text-xs">
              <span className="font-bold text-[#c5a869]">{unreadNotifs.length} ta yangi bildirishnoma: </span>
              <span className="text-stone-200">{unreadNotifs[0].title}</span>
            </div>
          </div>
          <span className="text-xs text-[#c5a869] font-bold group-hover:underline shrink-0">
            Koʻrish →
          </span>
        </div>
      )}

      {/* 2. HERO SECTION */}
      <section className="relative rounded-3xl overflow-hidden border border-[#c5a869]/30 bg-stone-900 text-white min-h-[440px] flex items-center shadow-2xl">
        <img
          src="/images/asaka_islamic_architecture_1793634657962.jpg"
          alt="Asaka Islamic Architecture"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center brightness-75 transition-transform duration-1000"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#031d17]/95 via-[#031d17]/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#031d17] via-transparent to-transparent opacity-90" />
        <GeometricPattern opacity={0.06} />

        <div className="relative z-10 max-w-4xl px-6 sm:px-10 lg:px-14 py-12 space-y-6">
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-[#c5a869] tracking-wider uppercase bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-[#c5a869]/30 w-fit shadow-lg">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#c5a869]" />
              <span>{dailyBundle.formattedDateUz}</span>
            </span>
            <span className="text-[#c5a869]/50" aria-hidden="true">|</span>
            <span className="text-stone-300 font-mono-numbers">{dailyBundle.hijriDateUz}</span>
            <span className="text-[#c5a869]/50" aria-hidden="true">|</span>
            <span className="text-emerald-400 font-semibold">{t('common:location', 'Asaka')}</span>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold tracking-tight text-white leading-tight text-balance">
                {t('home:heroTitle')}
              </h1>

              <p className="text-sm sm:text-base text-stone-200 leading-relaxed">
                {t('home:heroSubtitle')}
              </p>
            </div>

            {/* ANIMATED LIVE CLOCK WIDGET (Asia/Tashkent) */}
            <div className="bg-gradient-to-br from-[#051d18]/90 via-[#071614]/95 to-black/90 p-4 sm:p-5 rounded-2xl border border-[#c5a869]/50 shadow-2xl backdrop-blur-md flex items-center gap-3 shrink-0 mx-auto md:mx-0 w-full sm:w-auto justify-center">
              <div className="w-10 h-10 rounded-xl bg-[#c5a869]/20 flex items-center justify-center text-[#c5a869] shrink-0">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div className="text-center sm:text-left">
                <div className="text-[10px] uppercase font-semibold text-[#c5a869] tracking-widest flex items-center justify-center sm:justify-start gap-1">
                  <span>Oʻzbekiston vaqti</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                </div>
                <div className="text-2xl sm:text-3xl font-mono-numbers font-extrabold text-white tracking-wider flex items-center gap-1">
                  <span className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10">{clockHours}</span>
                  <span className="text-[#c5a869] animate-pulse">:</span>
                  <span className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10">{clockMinutes}</span>
                  <span className="text-[#c5a869] animate-pulse">:</span>
                  <span className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-[#c5a869]">{clockSeconds}</span>
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">Asia/Tashkent (UTC+5)</div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
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
              className="gap-2 bg-black/30 backdrop-blur-sm border-[#c5a869]/50 text-stone-100 hover:text-white"
            >
              <BookOpen className="w-4 h-4" />
              <span>{t('home:heroQuranCta')}</span>
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => onNavigate('articles')}
              className="gap-2 bg-black/30 backdrop-blur-sm border-white/20 text-stone-200 hover:text-white"
            >
              <span>Maqolalar va Eʼlonlar</span>
            </Button>
          </div>
        </div>
      </section>

      {/* 2.5. DAILY PRAYER COMPLETION PROGRESS BAR WIDGET */}
      <Card elevated className="p-6 bg-stone-900/70 backdrop-blur-md border-[#c5a869]/40 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-[#c5a869] uppercase tracking-wider">
            <CheckCircle className="w-4 h-4 text-[#c5a869]" />
            <span>Bugungi Namozlar Bajarilishi (Kunduzgi Hisoblagich)</span>
          </div>
          <span className="text-xs font-mono-numbers text-emerald-400 font-bold">
            {completedCount} / 5 bajarildi ({completionPercent}%)
          </span>
        </div>

        {/* Progress Bar with Shimmer-Gold Animation */}
        <div className="w-full h-3 rounded-full bg-stone-800 overflow-hidden p-0.5 border border-white/10">
          <div
            className="h-full rounded-full shimmer-gold transition-all duration-700 ease-out"
            style={{ width: `${completionPercent}%` }}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
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
                className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  isDone
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200 shadow'
                    : 'bg-black/30 border-white/10 text-stone-400 hover:text-white hover:border-[#c5a869]/50'
                }`}
              >
                <span>{item.label}</span>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${isDone ? 'bg-emerald-500 text-black font-extrabold' : 'border border-stone-500'}`}>
                  {isDone ? '✓' : ''}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* 3. FEATURED TOP CONTENT (PINNED / YANGI BLOCK) */}
      {featuredArticle && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-[#c5a869] uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Yangi va Muhim Nashr</span>
            </div>
            <button
              onClick={() => onNavigate('articles')}
              className="text-xs text-[#c5a869] hover:underline font-semibold"
            >
              Barcha maqolalar ({articles.length}) →
            </button>
          </div>

          <Card
            elevated
            onClick={() => onNavigate('articles')}
            className="p-5 sm:p-6 bg-gradient-to-r from-stone-900 via-[#071614] to-stone-900 text-white border-[#c5a869]/40 hover:border-[#c5a869] transition-all cursor-pointer group shadow-xl relative overflow-hidden"
          >
            <GeometricPattern opacity={0.04} />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                {featuredArticle.featuredImage && (
                  <img
                    src={featuredArticle.featuredImage}
                    alt={featuredArticle.title}
                    className="w-full sm:w-36 h-28 object-cover rounded-xl border border-white/10 shrink-0 group-hover:scale-105 transition-transform duration-300"
                  />
                )}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-black text-[10px] font-black uppercase tracking-wider">
                      Yangi
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#c5a869]/20 text-[#c5a869] text-[10px] font-bold">
                      {featuredArticle.category}
                    </span>
                    <span className="text-[11px] text-stone-400">
                      {featuredArticle.publishedDate}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-[#c5a869] transition-colors leading-snug">
                    {featuredArticle.title}
                  </h3>

                  <p className="text-xs text-stone-300 line-clamp-2 max-w-2xl leading-relaxed">
                    {featuredArticle.excerpt || featuredArticle.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                <Button variant="primary" size="sm" className="text-xs">
                  <span>Toʻliq Oʻqish</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* 4. TODAY'S PRAYER TIMES */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#c5a869] uppercase tracking-wider font-semibold mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{t('navigation:prayer')}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-numbers">{currentTime} ({t('common:tashkentTime')})</span>
            </div>
            <h2 className="text-2xl font-display font-bold text-stone-900 dark:text-stone-100">
              {t('home:todayPrayers')}
            </h2>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('prayer')}
            className="text-[#c5a869] hover:text-[#d4af37]"
          >
            <span>{t('home:fullScheduleAndQibla')}</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {(() => {
          const nextPrayerInfo = getNextPrayerCalculation(prayerSchedule.times);
          return (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
              {prayerSchedule.times.map((p) => {
                const isHighlight = nextPrayerInfo.nextPrayer?.key === p.key;
                const translatedName = t(`prayer:${p.key}`, p.nameUz);

                return (
                  <Card
                    key={p.id}
                    elevated={isHighlight}
                    interactive
                    onClick={() => onNavigate('prayer')}
                    className={`p-4 transition-all ${
                      isHighlight
                        ? 'border-[#c5a869] ring-2 ring-[#c5a869]/40 bg-gradient-to-b from-[#c5a869]/15 to-transparent'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-1">
                      <span>{translatedName}</span>
                      <span className="font-arabic text-sm text-[#c5a869]">{p.nameAr}</span>
                    </div>
                    <div className="text-2xl font-bold font-mono-numbers text-stone-900 dark:text-stone-100 tracking-tight my-1">
                      {p.time}
                    </div>
                    {p.iqamahTime ? (
                      <div className="text-[11px] text-stone-500 dark:text-stone-400">
                        {t('prayer:iqamahTime')}: <span className="font-mono-numbers text-stone-700 dark:text-stone-300 font-medium">{p.iqamahTime}</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-stone-400 dark:text-stone-500 italic">
                        {t('prayer:entryTime')}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          );
        })()}
      </section>

      {/* 5. HAR KUNLIK ISLOMIY MA'LUMOTLAR SUITE (KUN OYATI, KUN HADISI, KUN ZIKRI) */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 dark:border-emerald-950 pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[#c5a869] uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Har Kunlik Islomiy Maʼrifat</span>
              <span>·</span>
              <span className="font-mono text-stone-400">{dailyBundle.formattedDateUz}</span>
            </div>
            <h2 className="text-2xl font-display font-bold text-stone-900 dark:text-stone-100">
              Kun Oyati, Hadisi va Zikri
            </h2>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('daily_archive')}
            className="text-xs border-[#c5a869]/40 text-[#c5a869] hover:bg-[#c5a869]/10 self-start sm:self-auto cursor-pointer"
          >
            <History className="w-3.5 h-3.5 mr-1.5" />
            <span>Kunlik Arxivni Ochish</span>
          </Button>
        </div>

        {/* 3 Columns: Kun Oyati, Kun Hadisi, Kun Zikri */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: Kun Oyati */}
          <Card elevated className="p-6 flex flex-col justify-between relative overflow-hidden border-[#c5a869]/30 space-y-4 bg-stone-50/60 dark:bg-[#071614]/70">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-[#c5a869]/15 text-[#c5a869] text-[11px] font-bold border border-[#c5a869]/30">
                  Kun Oyati ({dailyBundle.ayah.surahNameUz}, {dailyBundle.ayah.numberInSurah})
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handlePlayAudio(dailyBundle.ayah.audioUrl)}
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      playingAudio ? 'bg-[#c5a869] text-[#071614] border-[#c5a869]' : 'text-stone-500 hover:text-[#c5a869] border-stone-200 dark:border-emerald-950'
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
                    className="p-1.5 rounded-lg border text-stone-500 hover:text-[#c5a869] border-stone-200 dark:border-emerald-950 transition-colors"
                  >
                    <Bookmark className={`w-4 h-4 ${isFavorited(dailyBundle.ayah.id) ? 'fill-[#c5a869] text-[#c5a869]' : ''}`} />
                  </button>
                </div>
              </div>

              <p dir="rtl" className="font-arabic text-xl sm:text-2xl text-stone-900 dark:text-amber-100 leading-loose text-right pt-1">
                {dailyBundle.ayah.textAr}
              </p>

              <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed font-editorial italic">
                «{ayahTranslation}»
              </p>
            </div>

            <div className="pt-3 border-t border-stone-200 dark:border-emerald-950/60 text-[11px] text-stone-400 flex items-center justify-between">
              <span>Shayx Muhammad Sodiq Muhammad Yusuf</span>
              <button onClick={() => onNavigate('quran')} className="text-[#c5a869] font-bold hover:underline">
                Qurʼonga oʻtish →
              </button>
            </div>
          </Card>

          {/* Card 2: Kun Hadisi */}
          <Card elevated className="p-6 flex flex-col justify-between relative overflow-hidden border-emerald-600/30 space-y-4 bg-stone-50/60 dark:bg-[#071614]/70">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[11px] font-bold border border-emerald-500/30">
                    Kun Hadisi ({dailyBundle.hadith.collectionNameUz})
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#c5a869]/15 text-[#c5a869] text-[10px] font-bold">
                  {dailyBundle.hadith.grade}
                </span>
              </div>

              <div className="text-[11px] text-stone-400">
                Roviy: <span className="font-semibold text-stone-700 dark:text-stone-200">{dailyBundle.hadith.narratorUz}</span>
              </div>

              <p dir="rtl" className="font-arabic text-xl text-stone-900 dark:text-amber-100 leading-relaxed text-right">
                {dailyBundle.hadith.textAr}
              </p>

              <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed italic">
                «{hadithTranslation}»
              </p>
            </div>

            <div className="pt-3 border-t border-stone-200 dark:border-emerald-950/60 text-[11px] text-stone-400 flex items-center justify-between">
              <span>{dailyBundle.hadith.reference}</span>
              <button onClick={() => onNavigate('hadith')} className="text-[#c5a869] font-bold hover:underline">
                Hadislarga oʻtish →
              </button>
            </div>
          </Card>

          {/* Card 3: Kun Zikri */}
          <Card elevated className="p-6 flex flex-col justify-between relative overflow-hidden border-blue-600/30 space-y-4 bg-stone-50/60 dark:bg-[#071614]/70">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 text-[11px] font-bold border border-blue-500/30">
                  Kun Zikri ({dailyBundle.dhikr.categoryTitleUz})
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-mono font-bold">
                  {dailyBundle.dhikr.targetCount} marta
                </span>
              </div>

              <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                {dailyBundle.dhikr.titleUz}
              </h4>

              <p dir="rtl" className="font-arabic text-xl text-stone-900 dark:text-amber-100 leading-relaxed text-right">
                {dailyBundle.dhikr.textAr}
              </p>

              <p className="text-xs text-stone-600 dark:text-stone-400 italic">
                {dailyBundle.dhikr.transliterationUz}
              </p>

              <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                «{dhikrTranslation}»
              </p>
            </div>

            <div className="pt-3 border-t border-stone-200 dark:border-emerald-950/60 text-[11px] text-stone-400 flex items-center justify-between">
              <span className="truncate">{dailyBundle.dhikr.source}</span>
              <button onClick={() => onNavigate('dhikr')} className="text-[#c5a869] font-bold hover:underline shrink-0">
                Tasbehga oʻtish →
              </button>
            </div>
          </Card>
        </div>
      </section>

      {/* 6. SMARTPHONE INSTALL / APK PROMO */}
      <section className="relative rounded-2xl overflow-hidden border border-[#c5a869]/40 bg-gradient-to-r from-[#031d17] via-[#091a18] to-[#071614] text-white p-5 sm:p-6 shadow-lg">
        <GeometricPattern opacity={0.06} />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#c5a869]/20 border border-[#c5a869]/40 flex items-center justify-center text-[#c5a869] shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-bold text-white">
                  ASAKA ZIYO Ilovasini Smartfonga Oʻrnatish
                </span>
                <span className="text-[10px] font-mono bg-[#c5a869] text-[#071614] px-2 py-0.5 rounded font-bold">
                  APK v1.0.0
                </span>
              </div>
              <p className="text-xs text-stone-300 mt-0.5">
                Namoz vaqtlari, bildirishnomalar va 114 surani telefoningiz bosh ekranidan bir zumda oching.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenInstallModal}
              className="flex-1 md:flex-none justify-center"
            >
              <Download className="w-4 h-4 mr-1.5" />
              <span>Oʻrnatish / APK Yuklab Olish</span>
            </Button>
          </div>
        </div>
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
          <p className="text-xs text-stone-500">
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
                      ? 'border-[#c5a869] bg-[#c5a869]/10'
                      : 'border-stone-200 dark:border-emerald-950 hover:bg-stone-50 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-stone-900 dark:text-white">
                        {bundle.formattedDateUz}
                      </span>
                      <span className="text-[11px] text-[#c5a869] font-mono">
                        ({bundle.hijriDateUz})
                      </span>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-black text-[9px] font-bold">
                          Tanlangan kun
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-stone-500 space-x-2">
                      <span>Oyat: {bundle.ayah.surahNameUz} ({bundle.ayah.numberInSurah})</span>
                      <span>·</span>
                      <span>Hadis: {bundle.hadith.collectionNameUz} (№{bundle.hadith.number})</span>
                    </div>
                  </div>

                  <span className="text-xs text-[#c5a869] font-bold">Tanlash →</span>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>
    </div>
  );
};
