import React, { useState } from 'react';
import { HadithItem, NavigationTab } from '../../../types';
import { AUTHENTIC_HADITHS } from '../../../data/hadithData';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { GeometricPattern } from '../../ui/GeometricPattern';
import { Search, Bookmark, Check, Share2, BookMarked, Filter } from 'lucide-react';

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
  const [activeCollection, setActiveCollection] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const collections = [
    { id: 'all', label: 'Barcha hadislar' },
    { id: 'bukhari', label: 'Sahihi Buxoriy' },
    { id: 'muslim', label: 'Sahihi Muslim' },
    { id: 'nawawi', label: 'Navaviy (Arbaʼin)' },
  ];

  const filteredHadiths = AUTHENTIC_HADITHS.filter((hadith) => {
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
    const text = `${hadith.textAr}\n\n«${hadith.translationUz}»\n(${hadith.collectionNameUz}, ${hadith.narratorUz} rivoyati, ${hadith.reference})`;
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
      {/* Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-[#c5a869]/30 bg-gradient-to-r from-[#031d17] to-[#071614] text-white p-6 sm:p-10">
        <GeometricPattern opacity={0.05} />
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#c5a869] uppercase tracking-wider">
            <BookMarked className="w-3.5 h-3.5" />
            <span>Sunnati Nabaviya</span>
            <span aria-hidden="true">·</span>
            <span>Moʻtabar Manbalar</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-white">
            Hadislar Toʻplami
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            Rasululloh sollallohu alayhi vasallamning muborak hadisi shariflari. Barcha rivoyatlar asl arabiy matni, isnodi va manbasi bilan keltirilgan.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar per §1.A (Segmented functional buttons) */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Collection Filter Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 dark:bg-[#091a18] rounded-xl border border-stone-200 dark:border-emerald-950 overflow-x-auto">
          {collections.map((col) => {
            const isActive = activeCollection === col.id;
            return (
              <button
                key={col.id}
                onClick={() => setActiveCollection(col.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-[#0d211e] text-[#c5a869] shadow-sm font-semibold border border-[#c5a869]/30'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                {col.label}
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Hadis matni, roviy yoki mavzu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18] text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#c5a869]"
          />
        </div>
      </div>

      {/* Hadiths list */}
      <div className="space-y-6">
        {filteredHadiths.map((hadith) => {
          const isSaved = isFavorited(hadith.id);

          return (
            <Card key={hadith.id} elevated className="p-6 sm:p-8 space-y-4">
              {/* Unboxed Metadata row per §1.A */}
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 border-b border-stone-100 dark:border-emerald-950/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-stone-900 dark:text-stone-200">
                    {hadith.collectionNameUz}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-numbers">№{hadith.number}</span>
                  <span aria-hidden="true">·</span>
                  <span>{hadith.chapterUz}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{hadith.grade}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      onToggleFavorite({
                        id: hadith.id,
                        type: 'hadith',
                        title: `${hadith.collectionNameUz}, №${hadith.number}`,
                        subtitle: hadith.narratorUz,
                        snippet: hadith.translationUz,
                        routeTab: 'hadith',
                        routeId: hadith.id,
                      })
                    }
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      isSaved
                        ? 'bg-[#c5a869]/20 text-[#c5a869] border-[#c5a869]'
                        : 'text-stone-500 hover:text-[#c5a869] border-stone-200 dark:border-emerald-950'
                    }`}
                    title="Sevimlilarga qoʻshish"
                  >
                    <Bookmark className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleCopyHadith(hadith)}
                    className="p-1.5 rounded-lg border border-stone-200 dark:border-emerald-950 text-stone-500 hover:text-[#c5a869] transition-colors cursor-pointer"
                    title="Nusxa olish"
                  >
                    {copiedId === hadith.id ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Share2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Narrator */}
              <div className="text-xs text-stone-500 dark:text-stone-400">
                Roviy: <span className="font-medium text-stone-800 dark:text-stone-200">{hadith.narratorUz}</span>
              </div>

              {/* Arabic Hadith */}
              <p
                dir="rtl"
                className="font-arabic text-xl sm:text-2xl text-stone-900 dark:text-amber-100/95 leading-relaxed text-right pt-2"
              >
                {hadith.textAr}
              </p>

              {/* Translation */}
              <p className="text-sm sm:text-base text-stone-800 dark:text-stone-200 font-editorial leading-relaxed pt-2">
                {hadith.translationUz}
              </p>

              {/* Reference */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-400 dark:text-stone-500 border-t border-stone-100 dark:border-emerald-950/40 pt-3">
                <span>Manba: {hadith.reference}</span>
                <div className="flex items-center gap-1.5">
                  {hadith.keywords.map((k) => (
                    <span key={k} className="text-stone-500 dark:text-stone-400">
                      #{k}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
