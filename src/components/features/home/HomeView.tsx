import React, { useState, useEffect } from 'react';
import { Ayah, HadithItem, NavigationTab, PrayerSchedule } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { GeometricPattern, IslamicStarEmblem } from '../../ui/GeometricPattern';
import {
  Clock,
  Compass,
  BookOpen,
  Sparkles,
  ArrowRight,
  Bookmark,
  Volume2,
  Calendar,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
  Share2,
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
}

export const HomeView: React.FC<HomeViewProps> = ({
  prayerSchedule,
  dailyAyah,
  dailyHadith,
  onNavigate,
  onToggleFavorite,
  isFavorited,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [playingAudio, setPlayingAudio] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        setCurrentTime(
          now.toLocaleTimeString('uz-UZ', {
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
  }, []);

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

  return (
    <div className="space-y-12 pb-16">
      {/* 1. HERO SECTION: Refined Editorial Presence */}
      <section className="relative rounded-3xl overflow-hidden border border-[#c5a869]/30 bg-stone-900 text-white min-h-[440px] flex items-center shadow-xl">
        {/* Background Photography Asset */}
        <img
          src="/src/assets/images/asaka_islamic_architecture_1793634657962.jpg"
          alt="Asaka Islomiy Meʼmoriyati va Madaniyat Maskani"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center brightness-75 transition-transform duration-1000"
        />

        {/* Measured Contrast Scrim & Subtle Geometric Tessellation */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#031d17]/95 via-[#031d17]/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#031d17] via-transparent to-transparent opacity-90" />
        <GeometricPattern opacity={0.06} />

        {/* Content Container */}
        <div className="relative z-10 max-w-4xl px-6 sm:px-10 lg:px-14 py-12 space-y-6">
          {/* Unboxed Metadata Header per §1.A */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#c5a869] tracking-wider uppercase">
            <span>Asaka shahri</span>
            <span aria-hidden="true">·</span>
            <span>Andijon viloyati</span>
            <span aria-hidden="true">·</span>
            <span>{prayerSchedule.formattedDateUz}</span>
            <span aria-hidden="true">·</span>
            <span>{prayerSchedule.hijriDate}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold tracking-tight text-white leading-tight text-balance">
            ASAKA ZIYO — Maʼrifat, Hikmat va Saxovat Maskani
          </h1>

          <p className="text-sm sm:text-base text-stone-200 max-w-2xl leading-relaxed">
            Qurʼoni Karim tilovati, moʻtabar hadislar toʻplami, Asaka shahri namoz vaqtlari jadvali hamda hududiy jamoat hayotini birlashtirgan zamonaviy raqamli platforma.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => onNavigate('prayer')}
              className="gap-2"
            >
              <Clock className="w-4 h-4" />
              <span>Namoz vaqtlarini koʻrish</span>
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => onNavigate('quran')}
              className="gap-2 bg-black/30 backdrop-blur-sm border-[#c5a869]/50 text-stone-100 hover:text-white"
            >
              <BookOpen className="w-4 h-4" />
              <span>Qurʼoni Karimni ochish</span>
            </Button>
          </div>
        </div>
      </section>

      {/* 2. PRAYER TIMES AREA: Administrator-Managed Schedule & Compliance */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#c5a869] uppercase tracking-wider font-semibold mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Namoz Vaqtlari</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-numbers">{currentTime} (Asaka)</span>
            </div>
            <h2 className="text-2xl font-display font-bold text-stone-900 dark:text-stone-100">
              Bugungi Ibodat Vaqtlari
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('prayer')}
              className="text-[#c5a869] hover:text-[#d4af37]"
            >
              <span>Toʻliq jadval va Qibla</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Administrator Verification Disclaimer per Strict Requirement */}
        <div className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs leading-relaxed">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            <span className="font-semibold">Meʼmoriy namuna maʼlumotlari: </span>
            {prayerSchedule.disclaimer}
          </div>
        </div>

        {/* Prayer Time Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {prayerSchedule.times.map((p, idx) => {
            const isHighlight = p.key === 'peshin'; // Sample highlighting
            return (
              <Card
                key={p.id}
                elevated={isHighlight}
                interactive
                onClick={() => onNavigate('prayer')}
                className={`p-4 transition-all ${
                  isHighlight
                    ? 'border-[#c5a869] bg-gradient-to-b from-[#c5a869]/10 to-transparent dark:from-[#c5a869]/15'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-1">
                  <span>{p.nameUz}</span>
                  <span className="font-arabic text-sm text-[#c5a869]">{p.nameAr}</span>
                </div>
                <div className="text-2xl font-bold font-mono-numbers text-stone-900 dark:text-stone-100 tracking-tight my-1">
                  {p.time}
                </div>
                {p.iqamahTime ? (
                  <div className="text-[11px] text-stone-500 dark:text-stone-400">
                    Jamoat: <span className="font-mono-numbers text-stone-700 dark:text-stone-300 font-medium">{p.iqamahTime}</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-stone-400 dark:text-stone-500 italic">
                    Chiqish vaqti
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      {/* 3. DAILY ISLAMIC CONTENT FEATURE: Ayat al-Kursi & Featured Hadith */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Quran Ayah */}
        <Card elevated className="p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
          <GeometricPattern opacity={0.03} />
          <div className="space-y-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                <span className="font-semibold text-[#c5a869]">Kun Oyati</span>
                <span aria-hidden="true">·</span>
                <span>{dailyAyah.surahNameUz} surasi</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-numbers">{dailyAyah.numberInSurah}-oyat</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handlePlayAudio(dailyAyah.audioUrl)}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    playingAudio
                      ? 'bg-[#c5a869] text-[#071614] border-[#c5a869]'
                      : 'text-stone-500 hover:text-[#c5a869] border-stone-200 dark:border-emerald-950'
                  }`}
                  title="Tilovatni tinglash"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() =>
                    onToggleFavorite({
                      id: dailyAyah.id,
                      type: 'ayah',
                      title: `${dailyAyah.surahNameUz} surasi, ${dailyAyah.numberInSurah}-oyat`,
                      subtitle: 'Oyatul Kursiy',
                      snippet: dailyAyah.translationUz,
                      routeTab: 'quran',
                      routeId: dailyAyah.id,
                    })
                  }
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    isFavorited(dailyAyah.id)
                      ? 'bg-[#c5a869]/20 text-[#c5a869] border-[#c5a869]'
                      : 'text-stone-500 hover:text-[#c5a869] border-stone-200 dark:border-emerald-950'
                  }`}
                  title="Sevimlilarga qoʻshish"
                >
                  <Bookmark className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Arabic Calligraphy Typography */}
            <p
              dir="rtl"
              className="font-arabic text-2xl sm:text-3xl text-stone-900 dark:text-amber-100/95 leading-loose text-right pt-2"
            >
              {dailyAyah.textAr}
            </p>

            {/* Translation */}
            <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed font-editorial italic pt-2">
              «{dailyAyah.translationUz}»
            </p>

            {dailyAyah.tafsirSummaryUz && (
              <p className="text-xs text-stone-500 dark:text-stone-400 border-t border-stone-100 dark:border-emerald-950/60 pt-3">
                <span className="font-semibold text-stone-700 dark:text-stone-300">Tafsir izohi: </span>
                {dailyAyah.tafsirSummaryUz}
              </p>
            )}
          </div>

          <div className="pt-6 relative z-10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('quran')}
              className="w-full sm:w-auto"
            >
              <span>Qurʼon boʻlimiga oʻtish</span>
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
                <span className="font-semibold text-[#c5a869]">Kun Hadisi</span>
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
                    snippet: dailyHadith.translationUz,
                    routeTab: 'hadith',
                    routeId: dailyHadith.id,
                  })
                }
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  isFavorited(dailyHadith.id)
                    ? 'bg-[#c5a869]/20 text-[#c5a869] border-[#c5a869]'
                    : 'text-stone-500 hover:text-[#c5a869] border-stone-200 dark:border-emerald-950'
                }`}
                title="Sevimlilarga qoʻshish"
              >
                <Bookmark className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-stone-500 dark:text-stone-400">
              Roviy: <span className="font-medium text-stone-800 dark:text-stone-200">{dailyHadith.narratorUz}</span>
            </div>

            {/* Arabic Hadith */}
            <p
              dir="rtl"
              className="font-arabic text-xl sm:text-2xl text-stone-900 dark:text-amber-100/95 leading-relaxed text-right pt-2"
            >
              {dailyHadith.textAr}
            </p>

            {/* Uzbek translation */}
            <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed font-editorial italic pt-2">
              {dailyHadith.translationUz}
            </p>

            <div className="text-xs text-stone-400 dark:text-stone-500 border-t border-stone-100 dark:border-emerald-950/60 pt-3">
              Manba: {dailyHadith.reference}
            </div>
          </div>

          <div className="pt-6 relative z-10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('hadith')}
              className="w-full sm:w-auto"
            >
              <span>Barcha hadislarni oʻqish</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      </section>

      {/* 4. QUICK-ACCESS SHORTCUTS: Thoughtful Islamic Tools */}
      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          Tezkor Maʼrifiy Xizmatlar
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
                Elektron Tasbeh
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                33 va 99 martalik zikrlar hisoblagichi va duolar
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
                Asaka Qiblasi
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                241° Gʻarb-Janubi-Gʻarb aniq kompas koʻrsatkichi
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
                Ilmiy Maqolalar
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                Aqoid, fiqh, axloq va vodiy allomalari merosi
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
                Jamoat Eʼlonlari
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                Juma suhbatlari, tajvid kurslari va xayriya
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* 5. EDITORIAL SHOWCASE: Asaka & Knowledge Legacy */}
      <section className="relative rounded-2xl overflow-hidden border border-stone-200 dark:border-emerald-950 bg-stone-100/50 dark:bg-[#0c1f1c] p-6 sm:p-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#c5a869] uppercase tracking-wider">
              <span>Ilm va Maʼrifat Buloqlari</span>
              <span aria-hidden="true">·</span>
              <span>Kutubxona</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-display font-bold text-stone-900 dark:text-stone-100 leading-snug">
              Movarounnahr va Fargʻona Vodiysi Allomalari Merosi
            </h3>
            <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              Asaka zamini qadimdan fiqh, tafsir va hadis ilmlarining markazlaridan biri boʻlib kelgan. Bizning vazifamiz — ajdodlarimizning boy maʼnaviy boyligini zamonaviy raqamli texnologiyalar vositasida xalqimizga yetkazishdir.
            </p>
            <div className="pt-2">
              <Button variant="primary" size="sm" onClick={() => onNavigate('articles')}>
                <span>Maqolalar bilan tanishish</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
          <div className="rounded-xl overflow-hidden border border-[#c5a869]/30 aspect-[4/3] shadow-md">
            <img
              src="/src/assets/images/islamic_scholarship_library_1793634659800.jpg"
              alt="Islomiy kutubxona va qadimiy qoʻlyozmalar"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>
    </div>
  );
};
