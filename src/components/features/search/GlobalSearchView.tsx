import React, { useState, useMemo } from 'react';
import {
  Search,
  BookOpen,
  Clock,
  X,
  ArrowRight,
  Sparkles,
  Trash2,
  FileText,
  Newspaper,
  Megaphone,
  HelpCircle,
  PlayCircle,
  Heart,
  ScrollText,
} from 'lucide-react';
import { NavigationTab } from '../../../types';
import { Card } from '../../ui/Card';
import { PageHero } from '../../ui/PageHero';
import {
  MorphingTabs,
  StaggerGrid,
  StaggerCard,
  InteractiveCounter,
  ScrambleText,
} from '../../ui/MotionPrimitives';
import {
  performGlobalSearch,
  SearchResultItem,
  SearchCategory,
  getSearchHistory,
  saveSearchHistoryQuery,
  removeSearchHistoryQuery,
} from '../../../utils/searchEngine';

interface GlobalSearchViewProps {
  onNavigate: (tab: NavigationTab) => void;
}

const CATEGORIES: { id: SearchCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'Barchasi', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: 'quran', label: 'Qurʼon', icon: <BookOpen className="w-3.5 h-3.5" /> },
  { id: 'hadith', label: 'Hadislar', icon: <ScrollText className="w-3.5 h-3.5" /> },
  { id: 'dhikr', label: 'Zikr va Duo', icon: <Heart className="w-3.5 h-3.5" /> },
  { id: 'articles', label: 'Maqolalar', icon: <FileText className="w-3.5 h-3.5" /> },
  { id: 'news', label: 'Yangiliklar', icon: <Newspaper className="w-3.5 h-3.5" /> },
  { id: 'announcements', label: 'Eʼlonlar', icon: <Megaphone className="w-3.5 h-3.5" /> },
  { id: 'quiz', label: 'Viktorina', icon: <HelpCircle className="w-3.5 h-3.5" /> },
  { id: 'media', label: 'Media & Video', icon: <PlayCircle className="w-3.5 h-3.5" /> },
];

export const GlobalSearchView: React.FC<GlobalSearchViewProps> = ({ onNavigate }) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SearchCategory>('all');
  const [history, setHistory] = useState<string[]>(getSearchHistory());
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return performGlobalSearch(query, selectedCategory);
  }, [query, selectedCategory]);

  const totalPages = Math.ceil(results.length / pageSize);
  const paginatedResults = results.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSearchSubmit = (searchTxt: string) => {
    setQuery(searchTxt);
    if (searchTxt.trim().length >= 2) {
      saveSearchHistoryQuery(searchTxt);
      setHistory(getSearchHistory());
    }
    setCurrentPage(1);
  };

  const handleClearHistory = () => {
    removeSearchHistoryQuery();
    setHistory([]);
  };

  const handleRemoveHistoryItem = (item: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeSearchHistoryQuery(item);
    setHistory(getSearchHistory());
  };

  const handleResultClick = (item: SearchResultItem) => {
    saveSearchHistoryQuery(query || item.title);
    onNavigate(item.routeTab);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-7 pb-16">
      <PageHero
        variant="spatial"
        kicker="ASAKA ZIYO · Global Indeks Qidiruvi"
        title="Butun Ekotizim Boʻylab Qidirish"
        subtitle="Qurʼon oyatlari, hadislar, zikrlar, maqolalar, masjid eʼlonlari va barcha maʼrifiy manbalar orasidan bir zumda toping."
        aside={
          <div className="rounded-2xl bg-white/[0.06] border border-white/[0.12] backdrop-blur-md p-4 space-y-2">
            <div className="text-[11px] uppercase tracking-wider text-[#34D399] font-semibold">
              Tezkor Indeks Holati
            </div>
            <div className="text-lg font-display font-bold text-[#F7F4EC]">
              <ScrambleText text="9 BOʻLIM · REAL VAQT" durationMs={480} />
            </div>
            <p className="text-xs text-[#C2D4CD]">
              Kalit soʻzni kiriting — mos natijalar darhol saralanadi.
            </p>
          </div>
        }
      />

      {/* Elevated Liquid Glass Search Bar */}
      <Card elevated className="p-2 sm:p-2.5">
        <div className="relative flex items-center">
          <div className="pl-3.5 pr-2 text-[#064E3B] dark:text-[#10B981] pointer-events-none">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearchSubmit(e.target.value)}
            placeholder="Qidiruv soʻzini kiriting (masalan: Bomdod, Oyatul Kursi, Buxoriy)..."
            aria-label="Global qidiruv"
            className="w-full bg-transparent text-[#091813] dark:text-[#F7F4EC] placeholder-[#587068] dark:placeholder-[#9CAFA7] py-3.5 pr-12 focus:outline-none text-sm sm:text-base font-medium"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Qidiruvni tozalash"
              className="absolute right-2 w-10 h-10 rounded-xl flex items-center justify-center text-[#587068] dark:text-[#9CAFA7] hover:text-[#091813] dark:hover:text-[#F7F4EC] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </Card>

      {/* FLIP Morphing Category Filter */}
      <div className="overflow-x-auto pb-1 no-scrollbar">
        <MorphingTabs
          items={CATEGORIES}
          activeId={selectedCategory}
          onChange={(id) => {
            setSelectedCategory(id as SearchCategory);
            setCurrentPage(1);
          }}
          layoutId="az-global-search-cats"
        />
      </div>

      {/* Search History */}
      {!query.trim() && history.length > 0 && (
        <Card elevated className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#091813] dark:text-[#F7F4EC] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#064E3B] dark:text-[#10B981]" />
              <span>Soʻnggi qidiruvlar</span>
            </h3>
            <button
              type="button"
              onClick={handleClearHistory}
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer min-h-[36px] px-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Tarixni tozalash</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.map((histItem, idx) => (
              <div
                key={`${histItem}-${idx}`}
                className="inline-flex items-center rounded-xl az-liquid-glass-pill overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => handleSearchSubmit(histItem)}
                  className="px-3.5 py-2 text-xs font-medium text-[#091813] dark:text-[#F7F4EC] hover:text-[#064E3B] dark:hover:text-[#10B981] transition-colors cursor-pointer"
                >
                  {histItem}
                </button>
                <button
                  type="button"
                  onClick={(e) => handleRemoveHistoryItem(histItem, e)}
                  aria-label={`${histItem} soʻzini oʻchirish`}
                  className="pr-2.5 pl-1 py-2 text-[#587068] dark:text-[#9CAFA7] hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Search Results Summary */}
      {query.trim() && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <p className="text-sm text-[#3B554D] dark:text-[#A4B9B1] font-medium">
            <strong className="font-bold text-[#091813] dark:text-[#F7F4EC]">
              <InteractiveCounter value={results.length} />
            </strong>{' '}
            ta natija topildi («{query}»)
          </p>
          <span className="text-xs text-[#587068] dark:text-[#9CAFA7]">
            Boʻlim boʻyicha saralangan natijalar
          </span>
        </div>
      )}

      {/* Empty State */}
      {query.trim() && results.length === 0 && (
        <Card className="text-center py-14 px-6 space-y-3">
          <div className="w-14 h-14 rounded-2xl az-liquid-glass-pill flex items-center justify-center mx-auto text-[#587068] dark:text-[#9CAFA7]">
            <Search className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[#091813] dark:text-[#F7F4EC]">
            Hech qanday natija topilmadi
          </h3>
          <p className="text-xs sm:text-sm text-[#587068] dark:text-[#9CAFA7] max-w-md mx-auto leading-relaxed">
            Iltimos, soʻz yozilishini tekshirib koʻring yoki boshqa kalit soʻzlar yordamida qidiring (masalan: Qurʼon, Namoz, Buxoriy).
          </p>
        </Card>
      )}

      {/* Results List */}
      {paginatedResults.length > 0 && (
        <StaggerGrid className="space-y-3.5">
          {paginatedResults.map((item) => (
            <StaggerCard key={item.id}>
              <Card
                elevated
                interactive
                onClick={() => handleResultClick(item)}
                className="group p-5 cursor-pointer space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold uppercase tracking-wider text-[#064E3B] dark:text-[#10B981]">
                      {item.categoryLabelUz}
                    </span>
                    {item.sourceOrAuthor && (
                      <>
                        <span aria-hidden="true" className="text-[#587068]/50 dark:text-[#9CAFA7]/50">
                          ·
                        </span>
                        <span className="text-[#587068] dark:text-[#9CAFA7] font-medium">
                          {item.sourceOrAuthor}
                        </span>
                      </>
                    )}
                  </div>
                  {item.date && (
                    <span className="font-mono-numbers text-[#587068] dark:text-[#9CAFA7]">
                      {item.date}
                    </span>
                  )}
                </div>

                <h3 className="text-base sm:text-lg font-bold text-[#091813] dark:text-[#F7F4EC] group-hover:text-[#064E3B] dark:group-hover:text-[#10B981] transition-colors">
                  {item.title}
                </h3>

                {item.arabicText && (
                  <div
                    dir="rtl"
                    className="font-arabic text-xl text-[#064E3B] dark:text-[#C8A85E] my-1.5 text-right leading-loose"
                  >
                    {item.arabicText}
                  </div>
                )}

                <p className="text-xs sm:text-sm text-[#3B554D] dark:text-[#A4B9B1] leading-relaxed">
                  {item.snippet}
                </p>

                <div className="flex items-center justify-between text-xs pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
                  <span className="text-[#587068] dark:text-[#9CAFA7]">{item.subtitle}</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-[#064E3B] dark:text-[#10B981] group-hover:translate-x-1 transition-transform">
                    <span>Ochish</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Card>
            </StaggerCard>
          ))}
        </StaggerGrid>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          {Array.from({ length: totalPages }).map((_, idx) => {
            const isCurrent = currentPage === idx + 1;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setCurrentPage(idx + 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`w-11 h-11 rounded-xl font-mono-numbers font-bold text-sm transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-[#064E3B] dark:bg-[#10B981] text-[#F7F4EC] dark:text-[#04120D] shadow-md'
                    : 'az-liquid-glass-pill text-[#091813] dark:text-[#F7F4EC] hover:border-emerald-500/40'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
