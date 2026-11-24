import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Search, X, ArrowRight, Clock, Sparkles, Trash2 } from 'lucide-react';
import { NavigationTab } from '../../../types';
import { MOTION_SPRINGS, PREMIUM_EASE } from '../../ui/MotionPrimitives';
import {
  performGlobalSearch,
  SearchResultItem,
  getSearchHistory,
  saveSearchHistoryQuery,
  removeSearchHistoryQuery,
} from '../../../utils/searchEngine';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavigationTab) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const prefersReduced = useReducedMotion();
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<string[]>(getSearchHistory());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 60);
      setHistory(getSearchHistory());
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const results = query.trim() ? performGlobalSearch(query, 'all').slice(0, 8) : [];

  const handleSelectResult = (item: SearchResultItem) => {
    saveSearchHistoryQuery(query || item.title);
    onClose();
    onNavigate(item.routeTab);
  };

  const handleHistorySelect = (histText: string) => {
    setQuery(histText);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="az-global-search-backdrop"
          initial={prefersReduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: PREMIUM_EASE }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-24 px-4 bg-[#030706]/70 backdrop-blur-md"
        >
          <motion.div
            key="az-global-search-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="ASAKA ZIYO Global Qidiruv"
            initial={prefersReduced ? false : { opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -8 }}
            transition={prefersReduced ? { duration: 0 } : MOTION_SPRINGS.snappy}
            onClick={(e) => e.stopPropagation()}
            className="az-liquid-glass-modal w-full max-w-2xl rounded-[28px] overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Search Input Bar */}
            <div className="flex items-center px-4 sm:px-5 py-3.5 border-b border-black/[0.07] dark:border-white/[0.08]">
              <Search className="w-5 h-5 text-[#064E3B] dark:text-[#10B981] mr-3 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Qurʼon, hadis, maqola yoki kalit soʻz boʻyicha izlash..."
                className="w-full bg-transparent text-[#091813] dark:text-[#F7F4EC] placeholder-[#587068] dark:placeholder-[#9CAFA7] focus:outline-none text-sm sm:text-base font-medium"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Tozalash"
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-[#587068] dark:text-[#9CAFA7] hover:text-[#091813] dark:hover:text-[#F7F4EC] mr-1.5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-2.5 py-1.5 rounded-xl az-liquid-glass-pill text-[#091813] dark:text-[#F7F4EC] text-[11px] font-mono-numbers font-semibold hover:border-emerald-500/40 transition-colors cursor-pointer"
              >
                ESC
              </button>
            </div>

            {/* Results / History Container */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              {!query.trim() && history.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-[#587068] dark:text-[#9CAFA7] uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#064E3B] dark:text-[#10B981]" />
                      Soʻnggi qidiruvlar
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        removeSearchHistoryQuery();
                        setHistory([]);
                      }}
                      className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Tozalash
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {history.map((h, i) => (
                      <button
                        key={`${h}-${i}`}
                        type="button"
                        onClick={() => handleHistorySelect(h)}
                        className="text-xs az-liquid-glass-pill hover:border-emerald-500/45 text-[#091813] dark:text-[#F7F4EC] px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!query.trim() && history.length === 0 && (
                <div className="text-center py-12 space-y-2">
                  <div className="w-12 h-12 rounded-2xl az-liquid-glass-pill mx-auto flex items-center justify-center text-[#064E3B] dark:text-[#10B981]">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-[#091813] dark:text-[#F7F4EC]">
                    Qidirish uchun kalit soʻz kiriting
                  </p>
                  <p className="text-xs text-[#587068] dark:text-[#9CAFA7]">
                    Masalan: «Bomdod», «Oyatul Kursi», «Buxoriy»
                  </p>
                </div>
              )}

              {query.trim() && results.length === 0 && (
                <div className="text-center py-12 space-y-1.5">
                  <p className="text-sm font-semibold text-[#091813] dark:text-[#F7F4EC]">
                    «{query}» boʻyicha natija topilmadi
                  </p>
                  <p className="text-xs text-[#587068] dark:text-[#9CAFA7]">
                    Boshqa soʻzlar yordamida qayta urinib koʻring
                  </p>
                </div>
              )}

              {results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectResult(item)}
                  className="w-full text-left group az-liquid-glass-card rounded-2xl p-3.5 hover:border-emerald-500/45 transition-all cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="font-semibold uppercase tracking-wider text-[#064E3B] dark:text-[#10B981]">
                        {item.categoryLabelUz}
                      </span>
                      {item.sourceOrAuthor && (
                        <>
                          <span aria-hidden="true" className="text-[#587068]/50 dark:text-[#9CAFA7]/50">
                            ·
                          </span>
                          <span className="text-[#587068] dark:text-[#9CAFA7] truncate">
                            {item.sourceOrAuthor}
                          </span>
                        </>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-[#091813] dark:text-[#F7F4EC] truncate group-hover:text-[#064E3B] dark:group-hover:text-[#10B981] transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-xs text-[#587068] dark:text-[#9CAFA7] truncate">
                      {item.snippet}
                    </p>
                  </div>

                  <ArrowRight className="w-4 h-4 shrink-0 text-[#587068] dark:text-[#9CAFA7] group-hover:text-[#064E3B] dark:group-hover:text-[#10B981] group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>

            {/* Footer info */}
            <div className="px-5 py-3 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between text-[11px] text-[#587068] dark:text-[#9CAFA7]">
              <span className="font-medium">ASAKA ZIYO Global Qidiruv</span>
              <span>Barcha boʻlimlar qamrab olingan</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
