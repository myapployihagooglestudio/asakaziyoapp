import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowRight, Clock, Sparkles, BookOpen, Trash2 } from 'lucide-react';
import { NavigationTab } from '../../../types';
import { 
  performGlobalSearch, 
  SearchResultItem, 
  SearchCategory, 
  getSearchHistory, 
  saveSearchHistoryQuery, 
  removeSearchHistoryQuery 
} from '../../../utils/searchEngine';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavigationTab) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<string[]>(getSearchHistory());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setHistory(getSearchHistory());
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Global keyboard shortcut Ctrl+K or /
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Trigger search modal open from App if needed or handled by parent
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const results = performGlobalSearch(query, 'all').slice(0, 8);

  const handleSelectResult = (item: SearchResultItem) => {
    saveSearchHistoryQuery(query || item.title);
    onClose();
    onNavigate(item.routeTab);
  };

  const handleHistorySelect = (histText: string) => {
    setQuery(histText);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="bg-white dark:bg-stone-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/90">
          <Search size={20} className="text-emerald-600 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Qurʼon, hadis, maqola yoki kalit soʻz boʻyicha izlash..."
            className="w-full bg-transparent text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none text-base font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 mr-2"
            >
              <X size={16} />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2.5 py-1 rounded-lg bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold hover:bg-stone-300 transition-colors"
          >
            ESC
          </button>
        </div>

        {/* Results / History Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!query.trim() && history.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={13} className="text-emerald-600" /> Soʻnggi qidiruvlar
                </span>
                <button
                  onClick={() => {
                    removeSearchHistoryQuery();
                    setHistory([]);
                  }}
                  className="text-xs text-rose-600 hover:underline flex items-center gap-1"
                >
                  <Trash2 size={12} /> Tozalash
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {history.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => handleHistorySelect(h)}
                    className="text-xs bg-stone-100 dark:bg-stone-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-stone-700 dark:text-stone-300 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 transition-colors"
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!query.trim() && history.length === 0 && (
            <div className="text-center py-12 text-stone-400">
              <Sparkles size={36} className="mx-auto mb-3 text-emerald-600 opacity-60" />
              <p className="text-sm font-medium text-stone-700 dark:text-stone-300">Qidirish uchun kalit soʻz kiriting</p>
              <p className="text-xs text-stone-500 mt-1">Masalan: "Bomdod", "Oyatul Kursi", "Buxoriy"</p>
            </div>
          )}

          {query.trim() && results.length === 0 && (
            <div className="text-center py-12 text-stone-400">
              <p className="text-sm font-medium text-stone-700 dark:text-stone-300">"{query}" boʻyicha natija topilmadi</p>
              <p className="text-xs text-stone-500 mt-1">Boshqa soʻzlar yordamida qayta urinib koʻring</p>
            </div>
          )}

          {results.map((item) => (
            <div
              key={item.id}
              onClick={() => handleSelectResult(item)}
              className="group bg-stone-50 dark:bg-stone-800/60 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/30 border border-stone-200 dark:border-stone-700/80 hover:border-emerald-600 rounded-xl p-3.5 transition-all cursor-pointer flex items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                    {item.categoryLabelUz}
                  </span>
                  {item.sourceOrAuthor && (
                    <span className="text-[11px] text-stone-500 truncate">
                      • {item.sourceOrAuthor}
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-stone-900 dark:text-white truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                  {item.title}
                </h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 truncate mt-0.5">
                  {item.snippet}
                </p>
              </div>

              <div className="shrink-0 text-stone-400 group-hover:text-emerald-600 transition-colors">
                <ArrowRight size={16} />
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-stone-100 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-500">
          <span>ASAKA ZIYO Global Qidiruv</span>
          <span>Barcha boʻlimlar qamrab olingan</span>
        </div>
      </div>
    </div>
  );
};
