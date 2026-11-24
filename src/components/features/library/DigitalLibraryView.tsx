import React, { useState } from 'react';
import { DigitalBookItem } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { PageHero } from '../../ui/PageHero';
import {
  MorphingTabs,
  StaggerGrid,
  StaggerCard,
  SpatialTiltCard,
  InteractiveCounter,
} from '../../ui/MotionPrimitives';
import { getStoredDigitalBooks } from '../../../utils/databaseService';
import {
  BookOpen,
  Search,
  Eye,
  ShieldCheck,
} from 'lucide-react';

const CATEGORIES: { id: string; label: string }[] = [
  { id: 'all', label: 'Barcha kitoblar' },
  { id: 'aqida', label: 'Aqiyda' },
  { id: 'hadith', label: 'Hadis' },
  { id: 'tarbiya', label: 'Oila va Tarbiya' },
];

export const DigitalLibraryView: React.FC = () => {
  const [books] = useState<DigitalBookItem[]>(() => getStoredDigitalBooks());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [readingBook, setReadingBook] = useState<DigitalBookItem | null>(null);

  const filteredBooks = books.filter((b) => {
    const matchesCat = selectedCategory === 'all' || b.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      !q ||
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      b.description.toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  return (
    <div className="max-w-6xl mx-auto pb-16 space-y-8">
      <PageHero
        variant="editorial"
        kicker="ASAKA ZIYO · Islomiy Raqamli Kutubxona"
        title="Moʻtabar Islomiy Kitoblar va Asarlar"
        subtitle="Mualliflik huquqlari va ruxsatlariga qatʼiy rioya qilingan holda taqdim etilayotgan nodir asarlar va maʼrifiy qoʻllanmalar."
        imageSrc="/images/islamic_scholarship_library_1793634659800.jpg"
        imageAlt="Islomiy kutubxona"
        aside={
          <div className="rounded-2xl bg-[#064E3B]/[0.06] dark:bg-white/[0.06] border border-[#064E3B]/15 dark:border-white/[0.12] p-5 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#8B6B2E] dark:text-[#C8A85E]">
              <BookOpen className="w-4 h-4" />
              <span>Kutubxona fondi</span>
            </div>
            <div className="text-3xl font-display font-extrabold font-mono-numbers text-[#091813] dark:text-[#F7F4EC]">
              <InteractiveCounter value={filteredBooks.length} />
              <span className="text-sm font-normal text-[#587068] dark:text-[#A4B9B1] ml-2">asar</span>
            </div>
            <p className="text-xs text-[#587068] dark:text-[#9CAFA7]">
              Ruxsat etilgan · Ochiq mutolaa rejimi
            </p>
          </div>
        }
      />

      {/* Filter and Search */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <MorphingTabs
          items={CATEGORIES}
          activeId={selectedCategory}
          onChange={setSelectedCategory}
          layoutId="library-category-tabs"
        />

        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#587068] dark:text-[#9CAFA7] pointer-events-none" />
          <input
            type="text"
            placeholder="Kitob yoki muallif..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 min-h-[44px] text-sm rounded-2xl az-liquid-glass-pill text-[#091813] dark:text-[#F7F4EC] placeholder:text-[#6B827A] dark:placeholder:text-[#7E968D] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </div>
      </div>

      {/* Books Grid */}
      {filteredBooks.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-[#587068] dark:text-[#9CAFA7]">
            Tanlangan filtr boʻyicha kitob topilmadi.
          </p>
        </Card>
      ) : (
        <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBooks.map((book) => (
            <StaggerCard key={book.id}>
              <SpatialTiltCard maxTilt={3.5}>
                <Card elevated className="p-5 space-y-4 h-full flex flex-col justify-between">
                  <div className="space-y-4">
                    {book.coverImageUrl && (
                      <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 relative">
                        <img
                          src={book.coverImageUrl}
                          alt={book.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <div className="text-xs font-semibold text-[#8B6B2E] dark:text-[#C8A85E]">
                        {book.categoryTitleUz} · {book.pagesCount} bet
                      </div>
                      <h3 className="text-base sm:text-lg font-display font-bold text-[#091813] dark:text-[#F7F4EC] leading-snug">
                        {book.title}
                      </h3>
                      <p className="text-xs font-medium text-[#3B554D] dark:text-[#A4B9B1]">
                        {book.author} · {book.publisher}
                      </p>
                    </div>

                    <p className="text-sm text-[#3B554D] dark:text-[#A4B9B1] line-clamp-3 leading-relaxed">
                      {book.description}
                    </p>
                  </div>

                  <div className="pt-3.5 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-2">
                    <span className="text-xs text-[#064E3B] dark:text-[#34D399] font-semibold inline-flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Ruxsat etilgan</span>
                    </span>
                    <Button
                      size="sm"
                      variant="emerald"
                      onClick={() => setReadingBook(book)}
                    >
                      <Eye className="w-4 h-4 mr-1.5" />
                      <span>Mutolaa</span>
                    </Button>
                  </div>
                </Card>
              </SpatialTiltCard>
            </StaggerCard>
          ))}
        </StaggerGrid>
      )}

      {/* Book Reader Modal — NEO 2026 Spatial Modal */}
      <Modal
        isOpen={Boolean(readingBook)}
        onClose={() => setReadingBook(null)}
        title={readingBook?.title || ''}
        subtitle={readingBook ? `${readingBook.categoryTitleUz} · ${readingBook.author}` : ''}
        maxWidth="2xl"
      >
        {readingBook && (
          <div className="space-y-6">
            <div className="space-y-4">
              {readingBook.sampleChapters?.map((ch, idx) => (
                <div
                  key={idx}
                  className="space-y-2 p-5 rounded-2xl bg-[#F4EFE3]/70 dark:bg-[#050E0B]/85 border border-black/[0.06] dark:border-white/[0.08]"
                >
                  <h3 className="font-display font-bold text-base text-[#064E3B] dark:text-[#C8A85E]">
                    {ch.title}
                  </h3>
                  <p className="font-editorial text-sm sm:text-[15px] text-[#091813] dark:text-[#F7F4EC]/90 leading-[1.85]">
                    {ch.contentText}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap justify-between items-center gap-3 pt-4 border-t border-black/[0.06] dark:border-white/[0.08] text-xs text-[#587068] dark:text-[#9CAFA7]">
              <span>{readingBook.permissionNote}</span>
              <Button size="sm" variant="outline" onClick={() => setReadingBook(null)}>
                Yopish
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
