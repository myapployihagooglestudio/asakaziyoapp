import React, { useState, useMemo } from 'react';
import { 
  Search, 
  BookOpen, 
  Bookmark, 
  Clock, 
  Filter, 
  X, 
  ArrowRight, 
  Sparkles, 
  ExternalLink, 
  Trash2, 
  FileText, 
  CheckCircle2, 
  MessageSquare, 
  Calendar 
} from 'lucide-react';
import { NavigationTab } from '../../../types';
import { 
  performGlobalSearch, 
  SearchResultItem, 
  SearchCategory, 
  getSearchHistory, 
  saveSearchHistoryQuery, 
  removeSearchHistoryQuery 
} from '../../../utils/searchEngine';

interface GlobalSearchViewProps {
  onNavigate: (tab: NavigationTab) => void;
}

const CATEGORIES: { id: SearchCategory; label: string; icon: string }[] = [
  { id: 'all', label: 'Barchasi', icon: '✨' },
  { id: 'quran', label: 'Qurʼon', icon: '📖' },
  { id: 'hadith', label: 'Hadislar', icon: '📜' },
  { id: 'dhikr', label: 'Zikr va Duo', icon: '📿' },
  { id: 'articles', label: 'Maqolalar', icon: '📝' },
  { id: 'news', label: 'Yangiliklar', icon: '📰' },
  { id: 'announcements', label: 'Eʼlonlar', icon: '📢' },
  { id: 'quiz', label: 'Viktorina', icon: '❓' },
  { id: 'media', label: 'Media & Video', icon: '🎥' },
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
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute right-4 top-4 opacity-10 pointer-events-none">
          <Search size={160} />
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 bg-emerald-800/60 px-3 py-1 rounded-full w-fit text-xs font-medium text-amber-200 mb-3 border border-amber-400/30">
            <Sparkles size={14} className="text-amber-300 animate-pulse" />
            ASAKA ZIYO Global Qidiruv Tizimi
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight mb-3">Butun Ekotizim Boʻylab Qidirish</h1>
          <p className="text-emerald-100 text-sm sm:text-base leading-relaxed">
            Qurʼon oyatlari, hadislar, zikrlar, maqolalar, masjid eʼlonlari va barcha maʼrifiy manbalar orasidan bir zumda toping.
          </p>

          {/* Search Bar */}
          <div className="mt-6 relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-stone-400">
              <Search size={20} />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearchSubmit(e.target.value)}
              placeholder="Qidiruv soʻzini kiriting (masalan: Bomdod, Oyatul Kursi, Buxoriy)..."
              className="w-full bg-white dark:bg-stone-900 text-stone-900 dark:text-white pl-12 pr-12 py-4 rounded-2xl shadow-lg border border-stone-200 dark:border-stone-700 focus:outline-none focus:border-emerald-500 text-base sm:text-lg font-medium"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute inset-y-0 right-4 flex items-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setSelectedCategory(cat.id);
              setCurrentPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer shadow-xs ${
              selectedCategory === cat.id
                ? 'bg-emerald-700 text-white shadow-md'
                : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:border-emerald-500/50'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Search History / Suggestions if query is empty */}
      {!query.trim() && history.length > 0 && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 border border-stone-200 dark:border-stone-800 shadow-md mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200 flex items-center gap-2">
              <Clock size={16} className="text-emerald-600" />
              Soʻnggi qidiruvlar
            </h3>
            <button
              onClick={handleClearHistory}
              className="text-xs text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Trash2 size={13} />
              Tarixni tozalash
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.map((histItem, idx) => (
              <button
                key={idx}
                onClick={() => handleSearchSubmit(histItem)}
                className="group flex items-center gap-2 bg-stone-100 dark:bg-stone-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-stone-700 dark:text-stone-300 px-3.5 py-1.5 rounded-xl text-xs font-medium border border-stone-200 dark:border-stone-700 transition-colors cursor-pointer"
              >
                <span>{histItem}</span>
                <span
                  onClick={(e) => handleRemoveHistoryItem(histItem, e)}
                  className="text-stone-400 hover:text-rose-600 p-0.5 rounded"
                >
                  <X size={12} />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Results Header */}
      {query.trim() && (
        <div className="flex items-center justify-between mb-6 px-1">
          <p className="text-sm text-stone-600 dark:text-stone-400 font-medium">
            <span className="font-bold text-stone-900 dark:text-white">{results.length}</span> ta natija topildi ("{query}")
          </p>
          <div className="text-xs text-stone-500">
            Sariq / yashil belgilar mos kelish darajasini koʻrsatadi
          </div>
        </div>
      )}

      {/* Results List */}
      {query.trim() && results.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center mx-auto mb-4 text-stone-400">
            <Search size={32} />
          </div>
          <h3 className="text-lg font-bold text-stone-800 dark:text-stone-200 mb-1">Hech qanday natija topilmadi</h3>
          <p className="text-sm text-stone-500 max-w-md mx-auto px-4">
            Iltimos, soʻz yozilishini tekshirib koʻring yoki boshqa kalit soʻzlar yordamida qidiring (masalan: Qurʼon, Namoz, Buxoriy).
          </p>
        </div>
      )}

      <div className="space-y-4">
        {paginatedResults.map((item) => (
          <div
            key={item.id}
            onClick={() => handleResultClick(item)}
            className="group bg-white dark:bg-stone-900 hover:border-emerald-600 dark:hover:border-emerald-500 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                  {item.categoryLabelUz}
                </span>
                {item.sourceOrAuthor && (
                  <span className="text-xs text-stone-500 font-medium flex items-center gap-1">
                    • {item.sourceOrAuthor}
                  </span>
                )}
              </div>
              {item.date && (
                <span className="text-xs text-stone-400">{item.date}</span>
              )}
            </div>

            <h3 className="text-lg font-bold text-stone-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors mb-1">
              {item.title}
            </h3>

            {item.arabicText && (
              <div className="font-arabic text-xl text-emerald-800 dark:text-emerald-300 my-2 dir-rtl text-right">
                {item.arabicText}
              </div>
            )}

            <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed mb-3">
              {item.snippet}
            </p>

            <div className="flex items-center justify-between text-xs pt-3 border-t border-stone-100 dark:border-stone-800 text-stone-500">
              <span className="text-stone-400">{item.subtitle}</span>
              <span className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
                <span>Ochish</span>
                <ArrowRight size={14} />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          {Array.from({ length: totalPages }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentPage(idx + 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`w-10 h-10 rounded-xl font-bold text-sm transition-colors cursor-pointer ${
                currentPage === idx + 1
                  ? 'bg-emerald-700 text-white shadow-md'
                  : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
