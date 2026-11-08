import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { HadithItem, NavigationTab, SupportedLocale } from '../../../types';
import { Card } from '../../ui/Card';
import { GeometricPattern, IslamicMihrabArch, CalligraphyBasmalahBadge } from '../../ui/GeometricPattern';
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
    } catch (e) {
      // ignore
    }
    setCopiedId(hadith.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* 2026 Luxury Architectural Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-[#C6A45C]/35 bg-gradient-to-br from-[#063D32] via-[#042B25] to-[#031814] text-white p-6 sm:p-10 shadow-2xl">
        <img
          src="/images/islamic_scholarship_library_1793634659800.jpg"
          alt="Islamic Scholarship Library"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-25 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#042B25]/95 via-[#063D32]/85 to-transparent" />
        <GeometricPattern opacity={0.07} />
        <IslamicMihrabArch opacity={0.14} className="right-6 max-w-[260px] ml-auto hidden md:block" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <CalligraphyBasmalahBadge />
            <div className="flex items-center gap-2 text-xs font-bold text-[#C6A45C] uppercase tracking-wider">
              <BookMarked className="w-3.5 h-3.5" />
              <span>{t('hadith:sunnah')}</span>
              <span aria-hidden="true">·</span>
              <span>{t('hadith:sources')}</span>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold tracking-tight text-[#F8F5EC]">
            {t('hadith:title')}
          </h1>
          <p className="text-xs sm:text-sm text-[#DCC58C]/90 leading-relaxed max-w-xl">
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
                    ? 'border-[#C6A45C] bg-gradient-to-r from-[#C6A45C] to-[#DCC58C] text-[#042B25] font-bold shadow-md'
                    : 'border-[#E2D9C5] dark:border-[#124237] bg-[#F8F5EC] dark:bg-[#06241E]/85 text-stone-700 dark:text-stone-300 hover:border-[#C6A45C]/50'
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('hadith:searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18] text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#c5a869]"
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
            <Card key={hadith.id} className="p-6 sm:p-8 space-y-5">
              {/* Top metadata row */}
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 border-b border-stone-100 dark:border-emerald-950/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#c5a869]">{locCollection}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-numbers">#{hadith.number}</span>
                  <span aria-hidden="true">·</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded">
                      {hadith.grade}
                    </span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Oflayn
                    </span>
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
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      isSaved
                        ? 'bg-[#c5a869]/20 text-[#c5a869] border-[#c5a869]'
                        : 'text-stone-500 hover:text-[#c5a869] border-stone-200 dark:border-emerald-950'
                    }`}
                    title={t('common:save')}
                  >
                    <Bookmark className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleCopyHadith(hadith)}
                    className="p-1.5 rounded-lg border border-stone-200 dark:border-emerald-950 text-stone-500 hover:text-[#c5a869] transition-colors cursor-pointer"
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
              <p
                dir="rtl"
                className="font-arabic text-stone-900 dark:text-amber-100/95 text-right text-xl sm:text-2xl leading-loose"
              >
                {hadith.textAr}
              </p>

              {/* Translation */}
              <div className="space-y-2 pt-1 border-t border-stone-100/60 dark:border-emerald-950/40">
                <p className="text-sm sm:text-base text-stone-800 dark:text-stone-200 font-editorial leading-relaxed">
                  «{locTranslation}»
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400 pt-1">
                  <span>
                    <strong>{t('hadith:narrator')}:</strong> {locNarrator}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    <strong>{t('hadith:chapter')}:</strong> {locChapter}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-numbers">
                    <strong>{t('hadith:reference')}:</strong> {hadith.reference}
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
