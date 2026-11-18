import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { HadithItem, NavigationTab, SupportedLocale } from '../../../types';
import { Card } from '../../ui/Card';
import {
  GeometricPattern,
  IslamicMihrabArch,
  CalligraphyBasmalahBadge,
  ArabesqueCornerOrnaments,
  RubElHizbBadge,
  VolumetricGodRays,
} from '../../ui/GeometricPattern';
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
    { id: 'all', label: t('hadith:allHadiths') },
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
    const matchesSearch =
      hadith.translationUz.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hadith.narratorUz.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hadith.chapterUz.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hadith.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()));
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
      {/* Luxury Sacred Cinema Banner */}
      <div className="relative rounded-[32px] overflow-hidden border border-[#DFBD69]/55 az-hero-sanctuary text-[#FFF8E8] p-6 sm:p-10 shadow-[0_32px_90px_-15px_rgba(1,9,6,0.75)]">
        <img
          src="/images/islamic_scholarship_library_1793634659800.jpg"
          alt="Islamic Scholarship Library"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-25 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#010906]/95 via-[#041D13]/88 to-[#063D32]/75" />
        <VolumetricGodRays />
        <GeometricPattern opacity={0.07} />
        <IslamicMihrabArch opacity={0.14} className="right-6 max-w-[260px] ml-auto hidden md:block" />
        <ArabesqueCornerOrnaments size={28} />
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <CalligraphyBasmalahBadge />
            <div className="flex items-center gap-2 text-xs font-bold text-[#DFBD69] uppercase tracking-wider bg-[#010906]/70 px-3.5 py-1.5 rounded-xl border border-[#DFBD69]/40">
              <BookMarked className="w-3.5 h-3.5 text-[#DFBD69]" />
              <span>{t('hadith:sunnah')}</span>
              <span aria-hidden="true">·</span>
              <span>{t('hadith:sources')}</span>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold tracking-tight text-[#FFF8E8]">
            {t('hadith:title')}
          </h1>
          <p className="text-xs sm:text-sm text-[#FFF8E8]/85 leading-relaxed max-w-xl">
            {t('hadith:subtitle')}
          </p>
        </div>
      </div>

      {/* Collection filter tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {collections.map((c) => {
            const isSelected = activeCollection === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setActiveCollection(c.id)}
                className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#DFBD69] az-gold-foil-bg text-[#010906] font-bold shadow-md'
                    : 'border-[#DFBD69]/30 bg-[#FFF8E8] dark:bg-[#041D13]/90 text-[#03170F] dark:text-[#FFF8E8]/85 hover:border-[#DFBD69]/65'
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-[#8A6621] dark:text-[#DFBD69] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('hadith:searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-[#DFBD69]/35 bg-[#FFF8E8] dark:bg-[#03170F] text-[#03170F] dark:text-[#FFF8E8] placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#DFBD69]"
          />
        </div>
      </div>

      {/* Hadith list */}
      <div className="space-y-6">
        {filteredHadiths.map((hadith) => {
          const isSaved = isFavorited(hadith.id);
          const locTranslation = getLocalizedText(hadith.translationUz);
          const locCollection = getLocalizedText(hadith.collectionNameUz);
          const locNarrator = getLocalizedText(hadith.narratorUz);
          const locChapter = getLocalizedText(hadith.chapterUz);

          return (
            <Card key={hadith.id} elevated ornamental className="p-6 sm:p-8 space-y-5">
              {/* Top metadata row */}
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-[#FFF8E8]/70 border-b border-[#DFBD69]/20 pb-3">
                <div className="flex items-center gap-2.5">
                  <RubElHizbBadge size="md">{hadith.number}</RubElHizbBadge>
                  <div>
                    <span className="font-bold text-[#8A6621] dark:text-[#DFBD69] block">{locCollection}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded">
                        {hadith.grade}
                      </span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        Tasdiqlangan Manba
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
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
                    className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                      isSaved
                        ? 'az-gold-foil-bg text-[#010906] border-[#DFBD69]'
                        : 'text-[#8A6621] dark:text-[#DFBD69] hover:border-[#DFBD69] border-[#DFBD69]/30'
                    }`}
                    title={t('common:save')}
                  >
                    <Bookmark className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleCopyHadith(hadith)}
                    className="p-2 rounded-xl border border-[#DFBD69]/30 text-[#8A6621] dark:text-[#DFBD69] hover:border-[#DFBD69] transition-colors cursor-pointer"
                    title={t('common:copy')}
                  >
                    {copiedId === hadith.id ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Share2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Arabic text (Authentic source, strictly never changed by translation) */}
              <div className="p-5 rounded-2xl bg-[#F1EBDD]/75 dark:bg-[#010906]/70 border border-[#DFBD69]/25">
                <p
                  dir="rtl"
                  className="font-arabic text-[#03170F] dark:text-[#FFF8E8] text-right text-xl sm:text-2xl leading-loose"
                >
                  {hadith.textAr}
                </p>
              </div>

              {/* Translation */}
              <div className="space-y-2 pt-1">
                <p className="text-sm sm:text-base text-[#03170F] dark:text-[#FFF8E8]/90 font-editorial leading-relaxed">
                  «{locTranslation}»
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#5C746C] dark:text-[#FFF8E8]/65 pt-2 border-t border-[#DFBD69]/15">
                  <span>
                    <strong className="text-[#8A6621] dark:text-[#DFBD69]">{t('hadith:narrator')}:</strong> {locNarrator}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    <strong className="text-[#8A6621] dark:text-[#DFBD69]">{t('hadith:chapter')}:</strong> {locChapter}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-numbers">
                    <strong className="text-[#8A6621] dark:text-[#DFBD69]">{t('hadith:reference')}:</strong> {hadith.reference}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
