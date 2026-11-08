import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DigitalBookItem, BookCategory } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { IslamicHairlineDivider, IslamicStarEmblem } from '../../ui/GeometricPattern';
import {
  getStoredDigitalBooks,
} from '../../../utils/databaseService';
import {
  BookOpen,
  Search,
  Eye,
  Bookmark,
  CheckCircle2,
  FileText,
  ShieldCheck,
} from 'lucide-react';

const CATEGORIES: { id: string; label: string }[] = [
  { id: 'all', label: 'Barcha kitoblar' },
  { id: 'aqida', label: 'Aqiyda' },
  { id: 'hadith', label: 'Hadis' },
  { id: 'tarbiya', label: 'Oila & Tarbiya' },
];

export const DigitalLibraryView: React.FC = () => {
  const { t } = useTranslation();
  const userId = 'asaka_user_current';

  const [books, setBooks] = useState<DigitalBookItem[]>(() => getStoredDigitalBooks());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [readingBook, setReadingBook] = useState<DigitalBookItem | null>(null);

  const filteredBooks = books.filter((b) => {
    const matchesCat = selectedCategory === 'all' || b.category === selectedCategory;
    const matchesQuery =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-in fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#064e3b] via-[#052b22] to-[#041d18] border border-[#c5a869]/30 p-6 sm:p-8 text-white shadow-xl">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#d4af37]">
            <BookOpen className="w-4 h-4 text-[#d4af37]" />
            <span>Asaka Ziyo Islomiy Raqamli Kutubxonasi</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-white">
            Moʻtabar Islomiy Kitoblar & Asarlar
          </h1>
          <p className="text-xs sm:text-sm text-stone-200 leading-relaxed">
            Mualliflik huquqlari va ruxsatlariga qatʼiy rioya qilingan holda taqdim etilayotgan nodir asarlar va qoʻllanmalar.
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === c.id
                  ? 'bg-[#c5a869] text-[#071614] shadow-xs'
                  : 'bg-white dark:bg-[#0B1F1C] border border-stone-200 dark:border-emerald-950 text-stone-700 dark:text-stone-300'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
          <input
            type="text"
            placeholder="Kitob yoki muallif..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#0B1F1C] text-stone-900 dark:text-white"
          />
        </div>
      </div>

      {/* Books Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredBooks.map((book) => (
          <Card
            key={book.id}
            elevated
            className="p-5 space-y-4 border-stone-200/90 dark:border-[#c5a869]/30 bg-white dark:bg-[#0B1F1C] flex flex-col justify-between"
          >
            <div className="space-y-3">
              {book.coverImageUrl && (
                <div className="aspect-[4/3] rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-900 relative">
                  <img
                    src={book.coverImageUrl}
                    alt={book.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[#d4af37] text-[10px] font-bold">
                    {book.categoryTitleUz}
                  </span>
                </div>
              )}

              <div className="space-y-1">
                <h3 className="text-base font-bold text-stone-900 dark:text-white leading-snug">
                  {book.title}
                </h3>
                <p className="text-xs text-[#9E7F3C] dark:text-[#c5a869] font-medium">
                  {book.author}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-stone-500 font-mono-numbers">
                  <span>Nashriyot: {book.publisher}</span>
                  <span aria-hidden="true">·</span>
                  <span>{book.pagesCount} bet</span>
                </div>
              </div>

              <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-3 leading-relaxed">
                {book.description}
              </p>
            </div>

            <div className="pt-3 border-t border-stone-200/80 dark:border-white/10 flex items-center justify-between">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Ruxsat etilgan</span>
              </span>
              <Button
                size="sm"
                variant="emerald"
                onClick={() => setReadingBook(book)}
                className="min-h-[38px] text-xs font-bold"
              >
                <Eye className="w-3.5 h-3.5 mr-1" />
                <span>Mutolaa</span>
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Book Reader Modal */}
      {readingBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#0B1F1C] border border-stone-200 dark:border-[#c5a869]/30 p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-white/10 pb-4">
              <div>
                <span className="text-xs text-[#9E7F3C] dark:text-[#c5a869] font-bold uppercase">
                  {readingBook.categoryTitleUz}
                </span>
                <h2 className="text-xl font-bold text-stone-900 dark:text-white">
                  {readingBook.title}
                </h2>
                <p className="text-xs text-stone-500">{readingBook.author}</p>
              </div>
              <button
                onClick={() => setReadingBook(null)}
                className="text-stone-400 hover:text-stone-100 p-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Book Chapters Content */}
            <div className="space-y-6 text-stone-800 dark:text-stone-200 text-xs sm:text-sm leading-relaxed">
              {readingBook.sampleChapters?.map((ch, idx) => (
                <div key={idx} className="space-y-2 p-4 rounded-2xl bg-[#F3EFE6]/50 dark:bg-[#071614] border border-stone-200/80 dark:border-white/5">
                  <h3 className="font-bold text-base text-stone-900 dark:text-white text-[#064e3b] dark:text-[#c5a869]">
                    {ch.title}
                  </h3>
                  <p className="leading-relaxed">{ch.contentText}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-stone-200 dark:border-white/10 text-xs text-stone-500">
              <span>{readingBook.permissionNote}</span>
              <Button size="sm" variant="outline" onClick={() => setReadingBook(null)}>
                Yopish
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
