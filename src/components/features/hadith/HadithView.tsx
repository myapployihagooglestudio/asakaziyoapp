import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { HadithItem, NavigationTab, SupportedLocale } from '../../../types';
import { Card } from '../../ui/Card';
import { PageHero } from '../../ui/PageHero';
import { RubElHizbBadge } from '../../ui/GeometricPattern';
import {
  MorphingTabs,
  StaggerGrid,
  StaggerCard,
  InteractiveCounter,
} from '../../ui/MotionPrimitives';
import { toNewUzbekAlphabet } from '../../../utils/newUzbekAlphabet';
import { getStoredHadiths, subscribeToDatabase, isPubliclyPublished } from '../../../utils/databaseService';
import { Search, Bookmark, Check, Share2, BookMarked } from 'lucide-react';

interface HadithViewProps {
  onToggleFavorite: (item: {
    id: string;
    type: 'hadith';
    title: string;
    subtitle: string;
    snippet: string;
    routeTab: NavigationTab;
    routeId: string;
  }) => void;
  isFavorited: (id: string) => boolean;
}

export const HadithView: React.FC<HadithViewProps> = ({
  onToggleFavorite,
  isFavorited,
}) => {
  const { t, i18n } = useTranslation();
  const currentLocale = (i18n.language as SupportedLocale) || 'uz-Latn';

  const [hadiths, setHadiths] = useState<HadithItem[]>(() => getStoredHadiths().filter(isPubliclyPublished));
  const [activeCollection, setActiveCollection] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToDatabase((event) => {
      if (event.type === 'HADITHS_UPDATED') {
        setHadiths(getStoredHadiths().filter(isPubliclyPublished));
      }
    });
    return unsubscribe;
  }, []);

  const collections = [
    { id: 'all', label: t('hadith:allHadiths'), count: hadiths.length },
    { id: 'bukhari', label: t('hadith:sahihBukhari') },
    { id: 'muslim', label: t('hadith:sahihMuslim') },
    { id: 'nawawi', label: t('hadith:nawawi40') },
  ];

  const getLocalizedText = (text: string) => {
    if (currentLocale === 'uz-Latn-new') {
      return toNewUzbekAlphabet(text);
    }
    return text;
  };

  const filteredHadiths = hadiths.filter((hadith) => {
    const matchesCollection =
      activeCollection === 'all' || hadith.collection === activeCollection;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      hadith.translationUz.toLowerCase().includes(q) ||
      hadith.narratorUz.toLowerCase().includes(q) ||
      hadith.chapterUz.toLowerCase().includes(q) ||
      hadith.keywords.some((k) => k.toLowerCase().includes(q));
    return matchesCollection && matchesSearch;
  });

  const handleCopyHadith = (hadith: HadithItem) => {
    const locTranslation = getLocalizedText(hadith.translationUz);
    const locCollection = getLocalizedText(hadith.collectionNameUz);
    const locNarrator = getLocalizedText(hadith.narratorUz);
    const text = `${hadith.textAr}\n\n«${locTranslation}»\n(${locCollection}, ${locNarrator} ${t('hadith:narratedBy')}, ${hadith.reference})`;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text).catch(() => {});
      }
    } catch {
      // ignore
    }
    setCopiedId(hadith.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8 pb-16">
      <PageHero
        variant="mushaf"
        kicker={`${t('hadith:sunnah')} · ${t('hadith:sources')}`}
        title={t('hadith:title')}
        subtitle={t('hadith:subtitle')}
        imageSrc="/images/islamic_scholarship_library_1793634659800.jpg"
        imageAlt="Hadislar toʻplami"
        aside={
          <div className="rounded-2xl bg-white/[0.06] border border-white/[0.12] p-5 backdrop-blur-md space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#C8A85E]">
              <BookMarked className="w-4 h-4" />
              <span>Tasdiqlangan Sahih Manbalar</span>
            </div>
            <div className="text-3xl font-display font-extrabold text-[#F7F4EC] font-mono-numbers">
              <InteractiveCounter value={filteredHadiths.length} />
              <span className="text-sm font-normal text-[#A4B9B1] ml-2">hadis</span>
            </div>
            <p className="text-xs text-[#9CAFA7]">
              Sahih al-Buxoriy · Sahih Muslim · Imom Navaviy 40 hadisi
            </p>
          </div>
        }
      />

      {/* Collection filter tabs + Search */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <MorphingTabs
          items={collections}
          activeId={activeCollection}
          onChange={setActiveCollection}
          layoutId="hadith-collection-tabs"
        />

        <div className="relative min-w-[260px] lg:w-80">
          <Search className="w-4 h-4 text-[#587068] dark:text-[#9CAFA7] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={t('hadith:searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 min-h-[44px] text-sm rounded-2xl az-liquid-glass-pill text-[#091813] dark:text-[#F7F4EC] placeholder:text-[#6B827A] dark:placeholder:text-[#7E968D] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </div>
      </div>

      {/* Hadith list */}
      {filteredHadiths.length === 0 ? (
        <Card className="p-12 text-center space-y-2">
          <p className="text-base font-semibold text-[#091813] dark:text-[#F7F4EC]">
            Mos hadis topilmadi
          </p>
          <p className="text-sm text-[#587068] dark:text-[#9CAFA7]">
            Qidiruv soʻzini oʻzgartiring yoki barcha toʻplamlarni tanlang.
          </p>
        </Card>
      ) : (
        <StaggerGrid className="space-y-5">
          {filteredHadiths.map((hadith) => {
            const isSaved = isFavorited(hadith.id);
            const locTranslation = getLocalizedText(hadith.translationUz);
            const locCollection = getLocalizedText(hadith.collectionNameUz);
            const locNarrator = getLocalizedText(hadith.narratorUz);
            const locChapter = getLocalizedText(hadith.chapterUz);

            return (
              <StaggerCard key={hadith.id}>
                <Card elevated className="p-6 sm:p-8 space-y-5">
                  {/* Top metadata row — clean unboxed typography */}
                  <div className="flex items-start justify-between gap-4 border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
                    <div className="flex items-center gap-3">
                      <RubElHizbBadge size="md">{hadith.number}</RubElHizbBadge>
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold text-[#091813] dark:text-[#F7F4EC]">
                          {locCollection}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#587068] dark:text-[#9CAFA7]">
                          <span className="font-semibold text-[#064E3B] dark:text-[#34D399]">
                            {hadith.grade}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#8B6B2E] dark:text-[#C8A85E] font-medium">
                            Tasdiqlangan manba
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          onToggleFavorite({
                            id: hadith.id,
                            type: 'hadith',
                            title: `${locCollection}, #${hadith.number}`,
                            subtitle: `${locNarrator} ${t('hadith:narratedBy')}`,
                            snippet: locTranslation,
                            routeTab: 'hadith',
                            routeId: hadith.id,
                          })
                        }
                        className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
                          isSaved
                            ? 'bg-[#C8A85E] text-[#04120D] border-[#C8A85E] shadow-sm'
                            : 'az-liquid-glass-pill text-[#3B554D] dark:text-[#C2D4CD] hover:border-[#C8A85E]/50'
                        }`}
                        title={t('common:save')}
                        aria-label={t('common:save')}
                      >
                        <Bookmark className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyHadith(hadith)}
                        className="w-10 h-10 rounded-xl flex items-center justify-center az-liquid-glass-pill text-[#3B554D] dark:text-[#C2D4CD] hover:border-emerald-500/40 transition-all cursor-pointer"
                        title={t('common:copy')}
                        aria-label={t('common:copy')}
                      >
                        {copiedId === hadith.id ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Share2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Arabic text (Authentic source, strictly never altered) */}
                  <div className="p-5 sm:p-6 rounded-2xl bg-[#F4EFE3]/75 dark:bg-[#050E0B]/80 border border-[#C8A85E]/20">
                    <p
                      dir="rtl"
                      className="font-arabic text-[#091813] dark:text-[#F7F4EC] text-right text-xl sm:text-2xl leading-[2.25]"
                    >
                      {hadith.textAr}
                    </p>
                  </div>

                  {/* Translation */}
                  <div className="space-y-3">
                    <p className="text-[15px] sm:text-base text-[#091813] dark:text-[#F7F4EC]/92 font-editorial leading-[1.85]">
                      «{locTranslation}»
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#587068] dark:text-[#9CAFA7] pt-3 border-t border-black/[0.06] dark:border-white/[0.07]">
                      <span>
                        <strong className="text-[#8B6B2E] dark:text-[#C8A85E] font-semibold">
                          {t('hadith:narrator')}:
                        </strong>{' '}
                        {locNarrator}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        <strong className="text-[#8B6B2E] dark:text-[#C8A85E] font-semibold">
                          {t('hadith:chapter')}:
                        </strong>{' '}
                        {locChapter}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-numbers">
                        <strong className="text-[#8B6B2E] dark:text-[#C8A85E] font-semibold">
                          {t('hadith:reference')}:
                        </strong>{' '}
                        {hadith.reference}
                      </span>
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
