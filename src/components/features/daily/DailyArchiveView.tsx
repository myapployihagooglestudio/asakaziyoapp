import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { PageHero } from '../../ui/PageHero';
import {
  MorphingTabs,
  StaggerGrid,
  StaggerCard,
  AudioWaveformBars,
} from '../../ui/MotionPrimitives';
import {
  DailyIslamicBundle,
  AUTHENTIC_DAILY_BUNDLES,
  getActiveDailyBundle,
} from '../../../data/dailyContentData';
import { db, ensureFirestoreConnectivityChecked } from '../../../utils/firebaseClient';
import { collection, getDocs } from 'firebase/firestore';
import {
  Calendar,
  Sparkles,
  BookOpen,
  Play,
  Pause,
  Copy,
  Check,
  Share2,
  ShieldCheck,
  Search,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Heart,
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
}) => {
  const { i18n } = useTranslation(['home', 'common', 'quran', 'hadith']);
  const currentLocale = (i18n.language as SupportedLocale) || 'uz-Latn';

  const [bundles, setBundles] = useState<DailyIslamicBundle[]>(() => AUTHENTIC_DAILY_BUNDLES);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'past' | 'today'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(() => getActiveDailyBundle().id);

  const [playingAyahId, setPlayingAyahId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadFirestoreArchive() {
      try {
        if (db && (await ensureFirestoreConnectivityChecked())) {
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
      if (audioElement) audioElement.pause();
      setPlayingAyahId(null);
      return;
    }

    if (audioElement) audioElement.pause();

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
          text: `Kun Oyati: ${bundle.ayah.surahNameUz} surasi (${bundle.ayah.numberInSurah}-oyat) · Kun Hadisi: ${bundle.hadith.reference}`,
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
      <PageHero
        variant="mushaf"
        kicker="Tasdiqlangan Islomiy Meros Arxivi"
        title={getLocalized('Kunlik Oyat, Hadis va Zikrlar Arxivi')}
        subtitle="Oʻtgan va bugungi kunlar boʻyicha saralangan, Shayx Muhammad Sodiq Muhammad Yusuf (rahimahulloh) maʼnolar tarjimasi hamda moʻtabar hadis toʻplamlari bilan boyitilgan ishonchli xazina."
        actions={
          onBack ? (
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              <span>Orqaga</span>
            </Button>
          ) : undefined
        }
        aside={
          <div className="rounded-2xl bg-white/[0.06] border border-white/[0.12] p-5 backdrop-blur-md space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#C8A85E] uppercase tracking-[0.14em]">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Tasdiqlangan kunlar</span>
            </div>
            <div className="text-3xl font-display font-extrabold font-mono-numbers text-[#F7F4EC]">
              {bundles.length}
            </div>
            <p className="text-xs text-[#A4B9B1]">Asia/Tashkent kalendari boʻyicha</p>
          </div>
        }
      />

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <MorphingTabs
          items={[
            { id: 'all', label: 'Barchasi', count: bundles.length },
            { id: 'today', label: 'Bugungi kun' },
            { id: 'past', label: 'Oʻtgan kunlar' },
          ]}
          activeId={filterType}
          onChange={(id) => setFilterType(id as 'all' | 'past' | 'today')}
          layoutId="daily-archive-tabs"
        />

        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-[#587068] dark:text-[#9CAFA7] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Oyat, hadis, zikr yoki sana..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 min-h-[44px] text-sm rounded-2xl az-liquid-glass-pill text-[#091813] dark:text-[#F7F4EC] placeholder:text-[#6B827A] dark:placeholder:text-[#7E968D] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </div>
      </div>

      {/* Bundles List */}
      {filteredBundles.length === 0 ? (
        <Card className="p-10 text-center space-y-2">
          <Calendar className="w-8 h-8 text-[#C8A85E] mx-auto" />
          <p className="text-sm text-[#587068] dark:text-[#9CAFA7]">
            Qidiruv boʻyicha maʼlumot topilmadi.
          </p>
        </Card>
      ) : (
        <StaggerGrid className="space-y-6">
          {filteredBundles.map((bundle) => {
            const isToday = bundle.dateKey === todayKey;
            const isExpanded = expandedId === bundle.id;

            return (
              <StaggerCard key={bundle.id}>
                <Card
                  elevated
                  className={`overflow-hidden ${
                    isToday ? 'border-[#C8A85E]/55 ring-1 ring-[#C8A85E]/25' : ''
                  }`}
                >
                  {/* Header Strip */}
                  <div className="p-5 sm:p-6 border-b border-black/[0.06] dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#C8A85E]/15 text-[#8B6B2E] dark:text-[#C8A85E] flex items-center justify-center shrink-0">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="font-display font-bold text-base text-[#091813] dark:text-[#F7F4EC]">
                            {getLocalized(bundle.formattedDateUz)}
                          </span>
                          {isToday && (
                            <span className="text-xs font-bold text-[#064E3B] dark:text-[#34D399]">
                              · Bugungi
                            </span>
                          )}
                          <span className="text-xs font-mono-numbers text-[#8B6B2E] dark:text-[#C8A85E]">
                            · {bundle.hijriDateUz}
                          </span>
                        </div>
                        <div className="text-xs text-[#587068] dark:text-[#9CAFA7] flex items-center gap-1.5 mt-0.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#064E3B] dark:text-[#34D399]" />
                          <span>Tasdiqlangan manbalar · Asia/Tashkent</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button variant="outline" size="sm" onClick={() => handleCopyBundle(bundle)}>
                        {copiedId === bundle.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                            <span>Nusxalandi</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 mr-1" />
                            <span>Nusxa</span>
                          </>
                        )}
                      </Button>

                      <button
                        type="button"
                        onClick={() => handleShareBundle(bundle)}
                        className="w-9 h-9 rounded-xl az-liquid-glass-pill flex items-center justify-center text-[#3B554D] dark:text-[#C2D4CD] cursor-pointer"
                        title="Ulashish"
                        aria-label="Ulashish"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : bundle.id)}
                        className="w-9 h-9 rounded-xl az-liquid-glass-pill flex items-center justify-center text-[#3B554D] dark:text-[#C2D4CD] cursor-pointer"
                        title={isExpanded ? 'Yigʻish' : 'Toʻliq koʻrish'}
                        aria-label={isExpanded ? 'Yigʻish' : 'Toʻliq koʻrish'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* 3-in-1 Daily Suite Body */}
                  <div className="p-5 sm:p-6 space-y-5">
                    {/* SECTION 1: KUN OYATI */}
                    <div className="p-5 rounded-2xl bg-[#F4EFE3]/75 dark:bg-[#050E0B]/85 border border-[#C8A85E]/20 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-[#064E3B] dark:text-[#34D399] flex items-center justify-center">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[11px] font-bold text-[#064E3B] dark:text-[#34D399] uppercase tracking-wider block">
                              Kun oyati
                            </span>
                            <span className="text-xs font-bold text-[#091813] dark:text-[#F7F4EC]">
                              {bundle.ayah.surahNameUz} surasi, {bundle.ayah.numberInSurah}-oyat
                            </span>
                          </div>
                        </div>

                        {bundle.ayah.audioUrl && (
                          <button
                            type="button"
                            onClick={() => handleToggleAudio(bundle.ayah.audioUrl!, `ayah-${bundle.id}`)}
                            className={`px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                              playingAyahId === `ayah-${bundle.id}`
                                ? 'bg-[#064E3B] dark:bg-[#10B981] text-[#F7F4EC] dark:text-[#04120D]'
                                : 'az-liquid-glass-pill text-[#091813] dark:text-[#F7F4EC] hover:border-emerald-500/40'
                            }`}
                          >
                            {playingAyahId === `ayah-${bundle.id}` ? (
                              <>
                                <AudioWaveformBars isPlaying barCount={3} barClassName="bg-current" />
                                <Pause className="w-3.5 h-3.5" />
                                <span>Toʻxtatish</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5" />
                                <span>Tilovat</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      <div
                        dir="rtl"
                        className="font-arabic text-xl sm:text-2xl text-right text-[#091813] dark:text-[#F7F4EC] leading-[2.2]"
                      >
                        {bundle.ayah.textAr}
                      </div>

                      <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.07] space-y-1.5">
                        <p className="font-editorial text-sm sm:text-[15px] text-[#091813] dark:text-[#F7F4EC]/92 leading-relaxed">
                          «{getLocalized(bundle.ayah.translationUz)}»
                        </p>
                        {bundle.ayah.tafsirSummaryUz && (
                          <p className="text-xs text-[#8B6B2E] dark:text-[#C8A85E] italic">
                            Sharh: {getLocalized(bundle.ayah.tafsirSummaryUz)}
                          </p>
                        )}
                        <div className="text-[11px] text-[#587068] dark:text-[#9CAFA7]">
                          Tarjima va sharh: Shayx Muhammad Sodiq Muhammad Yusuf (Tafsiri Hilol)
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2: KUN HADISI */}
                    <div className="p-5 rounded-2xl bg-[#F4EFE3]/60 dark:bg-[#06120E]/80 border border-black/[0.06] dark:border-white/[0.08] space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#C8A85E]/15 text-[#8B6B2E] dark:text-[#C8A85E] flex items-center justify-center">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[11px] font-bold text-[#8B6B2E] dark:text-[#C8A85E] uppercase tracking-wider block">
                              Kun hadisi
                            </span>
                            <span className="text-xs font-bold text-[#091813] dark:text-[#F7F4EC]">
                              {bundle.hadith.reference}
                            </span>
                          </div>
                        </div>

                        <span className="text-xs font-bold text-[#064E3B] dark:text-[#34D399]">
                          {bundle.hadith.grade || 'Sahih'}
                        </span>
                      </div>

                      <div
                        dir="rtl"
                        className="font-arabic text-lg sm:text-xl text-right text-[#091813] dark:text-[#E5C983] leading-[2.1]"
                      >
                        {bundle.hadith.textAr}
                      </div>

                      <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.07] space-y-1">
                        <p className="font-editorial text-sm text-[#091813] dark:text-[#F7F4EC]/90 leading-relaxed">
                          «{getLocalized(bundle.hadith.translationUz)}»
                        </p>
                        <div className="text-xs text-[#587068] dark:text-[#9CAFA7] flex flex-wrap items-center justify-between gap-2 pt-1">
                          <span>Roviy: {bundle.hadith.narratorUz || 'Sahobai kirom'}</span>
                          <span>{bundle.hadith.collectionNameUz}</span>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 3: KUN ZIKRI */}
                    <div className="p-5 rounded-2xl bg-[#F4EFE3]/60 dark:bg-[#06120E]/80 border border-black/[0.06] dark:border-white/[0.08] space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#C8A85E]/15 text-[#8B6B2E] dark:text-[#C8A85E] flex items-center justify-center">
                            <Heart className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[11px] font-bold text-[#8B6B2E] dark:text-[#C8A85E] uppercase tracking-wider block">
                              Kun zikri
                            </span>
                            <span className="text-xs font-bold text-[#091813] dark:text-[#F7F4EC]">
                              {bundle.dhikr.titleUz}
                            </span>
                          </div>
                        </div>

                        <span className="text-xs font-extrabold font-mono-numbers text-[#8B6B2E] dark:text-[#C8A85E]">
                          {bundle.dhikr.targetCount} marta
                        </span>
                      </div>

                      <div
                        dir="rtl"
                        className="font-arabic text-lg sm:text-xl text-right text-[#091813] dark:text-[#F7F4EC] leading-[2.1]"
                      >
                        {bundle.dhikr.textAr}
                      </div>

                      {bundle.dhikr.transliterationUz && (
                        <p className="text-xs text-[#587068] dark:text-[#9CAFA7] italic">
                          {bundle.dhikr.transliterationUz}
                        </p>
                      )}

                      <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.07] space-y-2">
                        <p className="text-sm text-[#3B554D] dark:text-[#C2D4CD] leading-relaxed">
                          «{getLocalized(bundle.dhikr.translationUz)}»
                        </p>
                        {bundle.dhikr.virtueUz && (
                          <p className="text-xs text-[#587068] dark:text-[#9CAFA7]">
                            <strong className="text-[#8B6B2E] dark:text-[#C8A85E]">Fazilati:</strong>{' '}
                            {getLocalized(bundle.dhikr.virtueUz)}
                          </p>
                        )}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs text-[#587068] dark:text-[#9CAFA7]">{bundle.dhikr.source}</span>
                          {onNavigate && (
                            <button
                              type="button"
                              onClick={() => onNavigate('dhikr')}
                              className="text-xs font-bold text-[#064E3B] dark:text-[#34D399] hover:underline cursor-pointer"
                            >
                              Tasbehga oʻtish →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </StaggerCard>
            );
          })}
        </StaggerGrid>
      )}
    </div>
  );
};
