import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { GeometricPattern } from '../../ui/GeometricPattern';
import {
  DailyIslamicBundle,
  AUTHENTIC_DAILY_BUNDLES,
  getActiveDailyBundle,
} from '../../../data/dailyContentData';
import { db, auth } from '../../../utils/firebaseClient';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import {
  Calendar,
  Sparkles,
  BookOpen,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Copy,
  Check,
  Share2,
  Bookmark,
  ShieldCheck,
  Search,
  Filter,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Heart,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { NavigationTab, SupportedLocale } from '../../../types';
import { toNewUzbekAlphabet } from '../../../utils/newUzbekAlphabet';

interface DailyArchiveViewProps {
  onBack?: () => void;
  onNavigate?: (tab: NavigationTab) => void;
  onToggleFavorite?: (item: {
    id: string;
    type: 'ayah' | 'hadith' | 'dhikr' | 'article';
    title: string;
    subtitle: string;
    snippet: string;
    routeTab: NavigationTab;
    routeId: string;
  }) => void;
  isFavorited?: (id: string) => boolean;
}

export const DailyArchiveView: React.FC<DailyArchiveViewProps> = ({
  onBack,
  onNavigate,
  onToggleFavorite,
  isFavorited,
}) => {
  const { t, i18n } = useTranslation(['home', 'common', 'quran', 'hadith']);
  const currentLocale = (i18n.language as SupportedLocale) || 'uz-Latn';

  const [bundles, setBundles] = useState<DailyIslamicBundle[]>(() => AUTHENTIC_DAILY_BUNDLES);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'past' | 'today'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(() => getActiveDailyBundle().id);

  // Audio recitation state
  const [playingAyahId, setPlayingAyahId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Fetch verified bundles from Firestore on mount
  useEffect(() => {
    let isMounted = true;
    async function loadFirestoreArchive() {
      setLoading(true);
      try {
        if (db) {
          const snapshot = await getDocs(collection(db, 'dailyContent'));
          if (!snapshot.empty) {
            const firestoreBundles: DailyIslamicBundle[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as DailyIslamicBundle;
              if (data && data.dateKey && data.ayah && data.hadith && data.dhikr) {
                firestoreBundles.push({
                  ...data,
                  id: docSnap.id,
                });
              }
            });

            if (isMounted && firestoreBundles.length > 0) {
              // Merge with local verified bundles, avoiding duplicates
              const mergedMap = new Map<string, DailyIslamicBundle>();
              AUTHENTIC_DAILY_BUNDLES.forEach((b) => mergedMap.set(b.dateKey, b));
              firestoreBundles.forEach((b) => mergedMap.set(b.dateKey, b));

              const mergedList = Array.from(mergedMap.values()).sort(
                (a, b) => new Date(b.dateKey).getTime() - new Date(a.dateKey).getTime()
              );
              setBundles(mergedList);
            }
          }
        }
      } catch (err) {
        console.warn('Firestore dailyContent fetch notice:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadFirestoreArchive();
    return () => {
      isMounted = false;
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, []);

  const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });

  // Filter bundles
  const filteredBundles = bundles.filter((bundle) => {
    if (filterType === 'today' && bundle.dateKey !== todayKey) return false;
    if (filterType === 'past' && bundle.dateKey >= todayKey) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      bundle.formattedDateUz.toLowerCase().includes(q) ||
      bundle.hijriDateUz.toLowerCase().includes(q) ||
      bundle.ayah.surahNameUz.toLowerCase().includes(q) ||
      bundle.ayah.translationUz.toLowerCase().includes(q) ||
      bundle.hadith.reference.toLowerCase().includes(q) ||
      bundle.hadith.translationUz.toLowerCase().includes(q) ||
      bundle.dhikr.titleUz.toLowerCase().includes(q)
    );
  });

  const handleToggleAudio = (audioUrl: string, id: string) => {
    if (playingAyahId === id) {
      if (audioElement) {
        audioElement.pause();
      }
      setPlayingAyahId(null);
      return;
    }

    if (audioElement) {
      audioElement.pause();
    }

    const audio = new Audio(audioUrl);
    audio.play().catch(() => setPlayingAyahId(null));
    audio.onended = () => setPlayingAyahId(null);
    audio.onerror = () => setPlayingAyahId(null);
    setAudioElement(audio);
    setPlayingAyahId(id);
  };

  const handleCopyBundle = (bundle: DailyIslamicBundle) => {
    const text = `🌙 ASAKA ZIYO — KUNLIK ISLOMIY MEROS\n📅 ${bundle.formattedDateUz} (${bundle.hijriDateUz})\n\n📖 KUN OYATI: ${bundle.ayah.surahNameUz} surasi, ${bundle.ayah.numberInSurah}-oyat\n«${bundle.ayah.translationUz}»\nManba: Tafsiri Hilol (Shayx Muhammad Sodiq Muhammad Yusuf)\n\n✨ KUN HADISI: (${bundle.hadith.reference})\n«${bundle.hadith.translationUz}»\nRoviy: ${bundle.hadith.narratorUz || 'Sahoba'} (Sahih)\n\n📿 KUN ZIKRI:\n${bundle.dhikr.titleUz} (${bundle.dhikr.targetCount} marta)\n${bundle.dhikr.textAr}\n«${bundle.dhikr.virtueUz || bundle.dhikr.translationUz}»\n\n📲 Rasmiy ilova: @Asaka_Ziyo`;

    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
        setCopiedId(bundle.id);
        setTimeout(() => setCopiedId(null), 2500);
      }
    } catch {
      // fallback
    }
  };

  const handleShareBundle = async (bundle: DailyIslamicBundle) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Asaka Ziyo — ${bundle.formattedDateUz} Ilmiy Merosi`,
          text: `Kun Oyati: ${bundle.ayah.surahNameUz} surasi (${bundle.ayah.numberInSurah}-oyat) • Kun Hadisi: ${bundle.hadith.reference}`,
          url: window.location.href,
        });
      } catch {
        // ignore
      }
    } else {
      handleCopyBundle(bundle);
    }
  };

  const getLocalized = (text: string) => {
    if (currentLocale === 'uz-Latn-new') return toNewUzbekAlphabet(text);
    return text;
  };

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-[#c5a869]/30 bg-gradient-to-r from-[#031d17] via-[#071614] to-[#041a14] text-white p-6 sm:p-8 shadow-xl">
        <GeometricPattern opacity={0.06} />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#c5a869] transition-colors cursor-pointer"
                  title="Orqaga"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#c5a869] uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Tasdiqlangan Islomiy Meros Arxivi</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
              {getLocalized('Kunlik Oyat, Hadis va Zikrlar Arxivi')}
            </h1>

            <p className="text-xs sm:text-sm text-stone-300 max-w-2xl leading-relaxed">
              Oʻtgan va bugungi kunlar boʻyicha saralangan, Shayx Muhammad Sodiq Muhammad Yusuf (rahimahulloh) maʼnolar tarjimasi hamda moʻtabar hadis toʻplamlari bilan boyitilgan ishonchli xazina.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <span className="px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-bold font-mono">
              {bundles.length} ta Tasdiqlangan Kun
            </span>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50/60 dark:bg-[#071614]/60 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Oyat, hadis, zikr yoki sana boʻyicha qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18] text-stone-900 dark:text-stone-100 placeholder:text-stone-400"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0 ${
              filterType === 'all'
                ? 'bg-[#c5a869] text-[#071614] font-bold'
                : 'bg-white dark:bg-white/5 text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            Barchasi ({bundles.length})
          </button>
          <button
            onClick={() => setFilterType('today')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0 ${
              filterType === 'today'
                ? 'bg-[#c5a869] text-[#071614] font-bold'
                : 'bg-white dark:bg-white/5 text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            Bugungi Kun
          </button>
          <button
            onClick={() => setFilterType('past')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0 ${
              filterType === 'past'
                ? 'bg-[#c5a869] text-[#071614] font-bold'
                : 'bg-white dark:bg-white/5 text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            Oʻtgan Kunlar
          </button>
        </div>
      </div>

      {/* Bundles List */}
      <div className="space-y-6">
        {filteredBundles.length === 0 ? (
          <Card className="p-8 text-center text-stone-500 space-y-2">
            <Calendar className="w-8 h-8 text-stone-400 mx-auto" />
            <p className="text-sm">Qidiruv boʻyicha maʼlumot topilmadi.</p>
          </Card>
        ) : (
          filteredBundles.map((bundle) => {
            const isToday = bundle.dateKey === todayKey;
            const isExpanded = expandedId === bundle.id;

            return (
              <Card
                key={bundle.id}
                elevated
                className={`overflow-hidden transition-all border ${
                  isToday
                    ? 'border-[#c5a869] ring-2 ring-[#c5a869]/20'
                    : 'border-stone-200 dark:border-emerald-950'
                }`}
              >
                {/* Header Strip */}
                <div className="p-4 sm:p-5 bg-stone-50 dark:bg-[#091a18] border-b border-stone-200 dark:border-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#c5a869]/15 border border-[#c5a869]/30 flex items-center justify-center text-[#c5a869] shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm sm:text-base text-stone-900 dark:text-stone-100">
                          {getLocalized(bundle.formattedDateUz)}
                        </span>
                        {isToday && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-black font-black text-[10px] tracking-wide uppercase">
                            Bugungi
                          </span>
                        )}
                        <span className="text-[11px] font-mono-numbers text-[#c5a869]">
                          ({bundle.hijriDateUz})
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-500 flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Tasdiqlangan manbalar</span>
                        </span>
                        <span>•</span>
                        <span>Asia/Tashkent kalendari</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyBundle(bundle)}
                      className="text-xs"
                      title="Nusxa olish"
                    >
                      {copiedId === bundle.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                          <span>Nusxalandi</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 mr-1" />
                          <span>Nusxa</span>
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareBundle(bundle)}
                      className="text-xs"
                      title="Ulashish"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </Button>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : bundle.id)}
                      className="p-2 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer"
                      title={isExpanded ? 'Yopish' : 'Toʻliq koʻrish'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* 3-in-1 Daily Suite Body */}
                <div className="p-4 sm:p-6 space-y-6">
                  {/* SECTION 1: KUN OYATI */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#c5a869]/10 via-transparent to-transparent border border-[#c5a869]/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider block">
                            Kun Oyati
                          </span>
                          <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                            {bundle.ayah.surahNameUz} surasi, {bundle.ayah.numberInSurah}-oyat
                          </span>
                        </div>
                      </div>

                      {bundle.ayah.audioUrl && (
                        <button
                          onClick={() => handleToggleAudio(bundle.ayah.audioUrl!, `ayah-${bundle.id}`)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            playingAyahId === `ayah-${bundle.id}`
                              ? 'bg-emerald-500 text-black shadow-md'
                              : 'bg-stone-200 dark:bg-white/10 hover:bg-[#c5a869] hover:text-[#071614]'
                          }`}
                        >
                          {playingAyahId === `ayah-${bundle.id}` ? (
                            <>
                              <Pause className="w-3.5 h-3.5" />
                              <span>Toʻxtatish</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5" />
                              <span>Tilovatni Tinglash</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Arabic Text */}
                    <div
                      dir="rtl"
                      className="font-arabic text-xl sm:text-2xl text-right text-stone-900 dark:text-[#f4e8c1] leading-loose pt-1"
                    >
                      {bundle.ayah.textAr}
                    </div>

                    {/* Translation */}
                    <div className="pt-2 border-t border-stone-200/60 dark:border-white/5 space-y-1">
                      <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed font-serif">
                        «{getLocalized(bundle.ayah.translationUz)}»
                      </p>
                      {bundle.ayah.tafsirSummaryUz && (
                        <p className="text-[11px] text-[#c5a869] italic pt-1">
                          Sharh: {getLocalized(bundle.ayah.tafsirSummaryUz)}
                        </p>
                      )}
                      <div className="text-[10px] text-stone-400 pt-1">
                        Tarjima va sharh: Shayx Muhammad Sodiq Muhammad Yusuf (Tafsiri Hilol)
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: KUN HADISI */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-stone-50 dark:bg-[#071614]/80 border border-stone-200 dark:border-emerald-950 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider block">
                            Kun Hadisi
                          </span>
                          <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                            {bundle.hadith.reference}
                          </span>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                        {bundle.hadith.grade || 'Sahih'}
                      </span>
                    </div>

                    {/* Arabic Hadith */}
                    <div
                      dir="rtl"
                      className="font-arabic text-base sm:text-lg text-right text-[#c5a869] leading-relaxed"
                    >
                      {bundle.hadith.textAr}
                    </div>

                    {/* Translation */}
                    <div className="pt-2 border-t border-stone-200/60 dark:border-white/5 space-y-1">
                      <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                        «{getLocalized(bundle.hadith.translationUz)}»
                      </p>
                      <div className="text-[10px] text-stone-400 pt-1 flex items-center justify-between">
                        <span>Roviy: {bundle.hadith.narratorUz || 'Sahobai kirom'}</span>
                        <span>{bundle.hadith.collectionNameUz}</span>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: KUN ZIKRI */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-stone-50 dark:bg-[#071614]/80 border border-stone-200 dark:border-emerald-950 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#c5a869]/20 text-[#c5a869] flex items-center justify-center">
                          <Heart className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-[#c5a869] uppercase tracking-wider block">
                            Kun Zikri
                          </span>
                          <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                            {bundle.dhikr.titleUz}
                          </span>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-lg bg-[#c5a869] text-[#071614] text-xs font-black font-mono-numbers shadow-sm">
                        {bundle.dhikr.targetCount} marta
                      </span>
                    </div>

                    {/* Arabic Dhikr */}
                    <div
                      dir="rtl"
                      className="font-arabic text-lg sm:text-xl text-right text-stone-900 dark:text-stone-100 leading-relaxed"
                    >
                      {bundle.dhikr.textAr}
                    </div>

                    {bundle.dhikr.transliterationUz && (
                      <p className="text-xs text-stone-500 italic">
                        {bundle.dhikr.transliterationUz}
                      </p>
                    )}

                    <div className="pt-2 border-t border-stone-200/60 dark:border-white/5 space-y-2">
                      <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                        «{getLocalized(bundle.dhikr.translationUz)}»
                      </p>
                      {bundle.dhikr.virtueUz && (
                        <p className="text-xs text-stone-500">
                          <strong className="text-[#c5a869]">Fazilati:</strong> {getLocalized(bundle.dhikr.virtueUz)}
                        </p>
                      )}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-stone-400">{bundle.dhikr.source}</span>
                        {onNavigate && (
                          <button
                            onClick={() => onNavigate('dhikr')}
                            className="text-xs font-bold text-[#c5a869] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>Tasbehga oʻtish</span>
                            <span>→</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
