import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Ayah, HadithItem, NavigationTab, PrayerSchedule, SupportedLocale } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { GeometricPattern } from '../../ui/GeometricPattern';
import { toNewUzbekAlphabet } from '../../../utils/newUzbekAlphabet';
import { getNextPrayerCalculation } from '../../../utils/prayerTimeUtils';
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
  Compass,
  Smartphone,
  Download,
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
  dailyAyah,
  dailyHadith,
  onNavigate,
  onToggleFavorite,
  isFavorited,
  onOpenInstallModal,
}) => {
  const { t, i18n } = useTranslation(['home', 'common', 'prayer', 'quran', 'hadith']);
  const currentLocale = (i18n.language as SupportedLocale) || 'uz-Latn';

  const [currentTime, setCurrentTime] = useState<string>('');
  const [playingAudio, setPlayingAudio] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        setCurrentTime(
          now.toLocaleTimeString(currentLocale === 'ru' ? 'ru-RU' : currentLocale === 'en' ? 'en-US' : 'uz-UZ', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
      } catch (e) {
        const now = new Date();
        setCurrentTime(now.toTimeString().slice(0, 8));
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [currentLocale]);

  const handlePlayAudio = (url?: string) => {
    if (!url) return;
    if (playingAudio && audioElement) {
      try {
        audioElement.pause();
      } catch (e) {
        // ignore
      }
      setPlayingAudio(false);
      return;
    }
    try {
      const audio = new Audio(url);
      audio.onended = () => setPlayingAudio(false);
      audio.onerror = () => setPlayingAudio(false);
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => setPlayingAudio(false));
      }
      setAudioElement(audio);
      setPlayingAudio(true);
    } catch (e) {
      setPlayingAudio(false);
    }
  };

  // Get localized ayah translation text safely
  const ayahTranslationText =
    dailyAyah.translations?.[currentLocale]?.text ||
    (currentLocale === 'uz-Latn-new'
      ? toNewUzbekAlphabet(dailyAyah.translationUz)
      : dailyAyah.translationUz);

  const ayahTranslatorName =
    dailyAyah.translations?.[currentLocale]?.translator ||
    'Shayx Muhammad Sodiq Muhammad Yusuf';

  // Get localized hadith translation safely
  const hadithTranslationText =
    currentLocale === 'uz-Latn-new'
      ? toNewUzbekAlphabet(dailyHadith.translationUz)
      : dailyHadith.translationUz;

  return (
    <div className="space-y-12 pb-16">
      {/* 1. HERO SECTION */}
      <section className="relative rounded-3xl overflow-hidden border border-[#c5a869]/30 bg-stone-900 text-white min-h-[440px] flex items-center shadow-xl">
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
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#c5a869] tracking-wider uppercase">
            <span>{t('common:location', 'Asaka shahri')}</span>
            <span aria-hidden="true">·</span>
            <span>{prayerSchedule.formattedDateUz}</span>
            <span aria-hidden="true">·</span>
            <span>{prayerSchedule.hijriDate}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold tracking-tight text-white leading-tight text-balance">
            {t('home:heroTitle')}
          </h1>

          <p className="text-sm sm:text-base text-stone-200 max-w-2xl leading-relaxed">
            {t('home:heroSubtitle')}
          </p>

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
          </div>
        </div>
      </section>

      {/* 2. PRAYER TIMES AREA */}
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

          <div className="flex items-center gap-2">
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
        </div>

        {/* Preview disclaimer */}
        <div className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs leading-relaxed">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            <span className="font-semibold">{t('prayer:previewNoticeTitle')}: </span>
            {prayerSchedule.disclaimer}
          </div>
        </div>

        {/* Prayer Time Cards Grid */}
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

      {/* QUICK SMARTPHONE INSTALL & APK CARD */}
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
                  ASAKA ZIYO Ilovasini Telefonga Oʻrnatish
                </span>
                <span className="text-[10px] font-mono-numbers bg-[#c5a869] text-[#071614] px-2 py-0.5 rounded font-bold">
                  v1.0.0
                </span>
              </div>
              <p className="text-xs text-stone-300 mt-0.5">
                Namoz vaqtlari, azon eslatmalari va 114 surani telefoningiz bosh ekranidan bir zumda oching.
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

      {/* 3. DAILY ISLAMIC CONTENT FEATURE */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Quran Ayah */}
        <Card elevated className="p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
          <GeometricPattern opacity={0.03} />
          <div className="space-y-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                <span className="font-semibold text-[#c5a869]">{t('home:dailyAyahKicker')}</span>
                <span aria-hidden="true">·</span>
                <span>{dailyAyah.surahNameUz}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-numbers">{dailyAyah.numberInSurah}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handlePlayAudio(dailyAyah.audioUrl)}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    playingAudio
                      ? 'bg-[#c5a869] text-[#071614] border-[#c5a869]'
                      : 'text-stone-500 hover:text-[#c5a869] border-stone-200 dark:border-emerald-950'
                  }`}
                  title={t('quran:listenAudio')}
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() =>
                    onToggleFavorite({
                      id: dailyAyah.id,
                      type: 'ayah',
                      title: `${dailyAyah.surahNameUz}, ${dailyAyah.numberInSurah}`,
                      subtitle: 'Ayat al-Kursi',
                      snippet: ayahTranslationText,
                      routeTab: 'quran',
                      routeId: dailyAyah.id,
                    })
                  }
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    isFavorited(dailyAyah.id)
                      ? 'bg-[#c5a869]/20 text-[#c5a869] border-[#c5a869]'
                      : 'text-stone-500 hover:text-[#c5a869] border-stone-200 dark:border-emerald-950'
                  }`}
                  title={t('quran:addToFavorites')}
                >
                  <Bookmark className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Arabic Calligraphy (Untouched) */}
            <p
              dir="rtl"
              className="font-arabic text-2xl sm:text-3xl text-stone-900 dark:text-amber-100/95 leading-loose text-right pt-2"
            >
              {dailyAyah.textAr}
            </p>

            {/* Translation */}
            <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed font-editorial italic pt-2">
              «{ayahTranslationText}»
            </p>

            <div className="text-xs text-stone-400 dark:text-stone-500 border-t border-stone-100 dark:border-emerald-950/60 pt-3">
              {ayahTranslatorName}
            </div>
          </div>

          <div className="pt-6 relative z-10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('quran')}
              className="w-full sm:w-auto"
            >
              <span>{t('home:heroQuranCta')}</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>

        {/* Daily Hadith Feature */}
        <Card elevated className="p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
          <GeometricPattern opacity={0.03} />
          <div className="space-y-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                <span className="font-semibold text-[#c5a869]">{t('home:dailyHadithKicker')}</span>
                <span aria-hidden="true">·</span>
                <span>{dailyHadith.collectionNameUz}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-numbers">№{dailyHadith.number}</span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{dailyHadith.grade}</span>
              </div>
              <button
                onClick={() =>
                  onToggleFavorite({
                    id: dailyHadith.id,
                    type: 'hadith',
                    title: `${dailyHadith.collectionNameUz}, №${dailyHadith.number}`,
                    subtitle: dailyHadith.narratorUz,
                    snippet: hadithTranslationText,
                    routeTab: 'hadith',
                    routeId: dailyHadith.id,
                  })
                }
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  isFavorited(dailyHadith.id)
                    ? 'bg-[#c5a869]/20 text-[#c5a869] border-[#c5a869]'
                    : 'text-stone-500 hover:text-[#c5a869] border-stone-200 dark:border-emerald-950'
                }`}
                title={t('common:save')}
              >
                <Bookmark className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-stone-500 dark:text-stone-400">
              {t('hadith:narratorLabel')}: <span className="font-medium text-stone-800 dark:text-stone-200">{dailyHadith.narratorUz}</span>
            </div>

            {/* Arabic Hadith (Untouched) */}
            <p
              dir="rtl"
              className="font-arabic text-xl sm:text-2xl text-stone-900 dark:text-amber-100/95 leading-relaxed text-right pt-2"
            >
              {dailyHadith.textAr}
            </p>

            <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed font-editorial italic pt-2">
              «{hadithTranslationText}»
            </p>

            <div className="text-xs text-stone-400 dark:text-stone-500 border-t border-stone-100 dark:border-emerald-950/60 pt-3">
              {t('hadith:referenceLabel')}: {dailyHadith.reference}
            </div>
          </div>

          <div className="pt-6 relative z-10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('hadith')}
              className="w-full sm:w-auto"
            >
              <span>{t('hadith:allCollections')}</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      </section>

      {/* 4. QUICK-ACCESS SHORTCUTS */}
      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          {t('home:quickServices')}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card
            interactive
            onClick={() => onNavigate('dhikr')}
            className="p-5 flex flex-col justify-between space-y-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-950/20 dark:bg-emerald-950/60 flex items-center justify-center text-[#c5a869] border border-[#c5a869]/20 group-hover:border-[#c5a869]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 group-hover:text-[#c5a869] transition-colors">
                {t('home:tasbihTitle')}
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                {t('home:tasbihSubtitle')}
              </p>
            </div>
          </Card>

          <Card
            interactive
            onClick={() => onNavigate('prayer')}
            className="p-5 flex flex-col justify-between space-y-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-950/20 dark:bg-emerald-950/60 flex items-center justify-center text-[#c5a869] border border-[#c5a869]/20 group-hover:border-[#c5a869]">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 group-hover:text-[#c5a869] transition-colors">
                {t('home:qiblaTitle')}
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                {t('home:qiblaSubtitle')}
              </p>
            </div>
          </Card>

          <Card
            interactive
            onClick={() => onNavigate('articles')}
            className="p-5 flex flex-col justify-between space-y-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-950/20 dark:bg-emerald-950/60 flex items-center justify-center text-[#c5a869] border border-[#c5a869]/20 group-hover:border-[#c5a869]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 group-hover:text-[#c5a869] transition-colors">
                {t('home:articlesTitle')}
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                {t('home:articlesSubtitle')}
              </p>
            </div>
          </Card>

          <Card
            interactive
            onClick={() => onNavigate('announcements')}
            className="p-5 flex flex-col justify-between space-y-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-950/20 dark:bg-emerald-950/60 flex items-center justify-center text-[#c5a869] border border-[#c5a869]/20 group-hover:border-[#c5a869]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 group-hover:text-[#c5a869] transition-colors">
                {t('home:announcementsTitle')}
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                {t('home:announcementsSubtitle')}
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* 5. EDITORIAL SHOWCASE */}
      <section className="relative rounded-2xl overflow-hidden border border-stone-200 dark:border-emerald-950 bg-stone-100/50 dark:bg-[#0c1f1c] p-6 sm:p-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#c5a869] uppercase tracking-wider">
              <span>{t('home:libraryKicker')}</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-display font-bold text-stone-900 dark:text-stone-100 leading-snug">
              {t('home:libraryTitle')}
            </h3>
            <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              {t('home:libraryDescription')}
            </p>
            <div className="pt-2">
              <Button variant="primary" size="sm" onClick={() => onNavigate('articles')}>
                <span>{t('home:libraryCta')}</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
          <div className="rounded-xl overflow-hidden border border-[#c5a869]/30 aspect-[4/3] shadow-md">
            <img
              src="/images/islamic_scholarship_library_1793634659800.jpg"
              alt="Islamic Library"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>
    </div>
  );
};
