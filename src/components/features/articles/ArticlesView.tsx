import React, { useState } from 'react';
import { Article, NavigationTab } from '../../../types';
import { EDITORIAL_ARTICLES } from '../../../data/articlesData';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { GeometricPattern } from '../../ui/GeometricPattern';
import { BookOpen, Clock, User, Bookmark, ArrowRight, Share2, Check } from 'lucide-react';

interface ArticlesViewProps {
  onToggleFavorite: (item: {
    id: string;
    type: 'article';
    title: string;
    subtitle: string;
    snippet: string;
    routeTab: NavigationTab;
    routeId: string;
  }) => void;
  isFavorited: (id: string) => boolean;
}

export const ArticlesView: React.FC<ArticlesViewProps> = ({
  onToggleFavorite,
  isFavorited,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [readingArticle, setReadingArticle] = useState<Article | null>(null);
  const [copied, setCopied] = useState(false);

  const categories = [
    { id: 'all', label: 'Barchasi' },
    { id: 'Axloq', label: 'Axloq va Maʼrifat' },
    { id: 'Tarix', label: 'Tarix va Meros' },
    { id: 'Hikmat', label: 'Hikmat' },
    { id: 'Fiqh', label: 'Fiqh' },
  ];

  const filteredArticles = EDITORIAL_ARTICLES.filter(
    (a) => selectedCategory === 'all' || a.category === selectedCategory
  );

  const handleShare = () => {
    if (!readingArticle) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard
          .writeText(
            `${readingArticle.title}\n\n${readingArticle.subtitle}\n— Asaka Ziyo Maqolalar toʻplami`
          )
          .catch(() => {});
      }
    } catch (e) {
      // ignore
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-[#c5a869]/30 bg-gradient-to-r from-[#031d17] to-[#071614] text-white p-6 sm:p-10">
        <GeometricPattern opacity={0.05} />
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#c5a869] uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Tahririyat Boʻlimi</span>
            <span aria-hidden="true">·</span>
            <span>Ilmiy Nashrlar</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-white">
            Islomiy Maqolalar va Risolalar
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            Aqoid, fiqh, goʻzal xulq, oilaviy maʼrifat hamda Movarounnahr allomalari boy merosiga bagʻishlangan tahliliy maqolalar.
          </p>
        </div>
      </div>

      {/* Category selector */}
      <div className="flex items-center gap-1.5 p-1 bg-stone-100 dark:bg-[#091a18] rounded-xl border border-stone-200 dark:border-emerald-950 overflow-x-auto w-fit">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-[#0d211e] text-[#c5a869] shadow-sm font-semibold border border-[#c5a869]/30'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Articles Grid: 3-tier salience per editorial reference */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredArticles.map((article) => {
          const isSaved = isFavorited(article.id);

          return (
            <Card
              key={article.id}
              elevated
              interactive
              onClick={() => setReadingArticle(article)}
              className="flex flex-col justify-between group"
            >
              <div className="space-y-4">
                {/* Image */}
                <div className="relative aspect-[16/10] overflow-hidden bg-stone-100 dark:bg-stone-900">
                  <img
                    src={article.featuredImage}
                    alt={article.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-white">
                    <span className="font-medium text-[#c5a869]">{article.category}</span>
                    <span className="flex items-center gap-1 font-mono-numbers opacity-80">
                      <Clock className="w-3 h-3" />
                      {article.readTimeMinutes} daqiqa
                    </span>
                  </div>
                </div>

                <div className="p-6 space-y-2.5">
                  {/* Unboxed metadata */}
                  <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                    <span>{article.author}</span>
                    <span aria-hidden="true">·</span>
                    <span>{article.publishedDate}</span>
                  </div>

                  <h3 className="text-lg font-bold font-display text-stone-900 dark:text-stone-100 group-hover:text-[#c5a869] transition-colors leading-snug">
                    {article.title}
                  </h3>

                  <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-3 leading-relaxed">
                    {article.excerpt}
                  </p>
                </div>
              </div>

              <div className="px-6 pb-6 pt-2 flex items-center justify-between border-t border-stone-100 dark:border-emerald-950/60 mt-auto">
                <span className="text-xs font-semibold text-[#c5a869] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Mutolaa qilish <ArrowRight className="w-3.5 h-3.5" />
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite({
                      id: article.id,
                      type: 'article',
                      title: article.title,
                      subtitle: article.author,
                      snippet: article.excerpt,
                      routeTab: 'articles',
                      routeId: article.id,
                    });
                  }}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    isSaved
                      ? 'bg-[#c5a869]/20 text-[#c5a869] border-[#c5a869]'
                      : 'text-stone-400 hover:text-[#c5a869] border-stone-200 dark:border-emerald-950'
                  }`}
                  title="Sevimlilarga qoʻshish"
                >
                  <Bookmark className="w-4 h-4" />
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Full Reading Modal with Drop Cap initial per §2 & §4 of editorial reference */}
      {readingArticle && (
        <Modal
          isOpen={!!readingArticle}
          onClose={() => setReadingArticle(null)}
          title={readingArticle.title}
          subtitle={`${readingArticle.author} · ${readingArticle.authorRole} · ${readingArticle.publishedDate}`}
          maxWidth="2xl"
        >
          <div className="space-y-6">
            {/* Header Image */}
            <div className="rounded-xl overflow-hidden aspect-[16/9] border border-[#c5a869]/20">
              <img
                src={readingArticle.featuredImage}
                alt={readingArticle.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Key Quote / Pull Quote per §4 */}
            {readingArticle.keyQuote && (
              <blockquote className="py-4 px-6 border-y border-stone-200 dark:border-[#c5a869]/30 bg-stone-50/50 dark:bg-[#071614]/50 my-4 text-center">
                <p className="font-editorial text-lg sm:text-xl italic text-stone-900 dark:text-[#c5a869]">
                  {readingArticle.keyQuote}
                </p>
              </blockquote>
            )}

            {/* Body paragraphs with initial drop cap */}
            <div className="space-y-4 text-sm sm:text-base text-stone-700 dark:text-stone-300 leading-relaxed font-editorial">
              {readingArticle.bodyParagraphs.map((p, idx) => (
                <p
                  key={idx}
                  className={
                    idx === 0
                      ? 'first-letter:text-5xl first-letter:font-serif first-letter:font-bold first-letter:text-[#c5a869] first-letter:float-left first-letter:mr-3 first-letter:mt-1'
                      : ''
                  }
                >
                  {p}
                </p>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-stone-200 dark:border-emerald-950 text-xs">
              <span className="text-stone-400">Rukn: {readingArticle.category}</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleShare}>
                  {copied ? <Check className="w-4 h-4 text-emerald-500 mr-1" /> : <Share2 className="w-4 h-4 mr-1" />}
                  <span>{copied ? "Nusxalandi" : "Ulashish"}</span>
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
