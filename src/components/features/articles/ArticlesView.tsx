import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Article, NavigationTab, SupportedLocale } from '../../../types';
import { EDITORIAL_ARTICLES } from '../../../data/articlesData';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { GeometricPattern } from '../../ui/GeometricPattern';
import { getLocalizedField, getLocalizedParagraphs } from '../../../utils/localizedContent';
import { toNewUzbekAlphabet } from '../../../utils/newUzbekAlphabet';
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
  const { t, i18n } = useTranslation();
  const currentLocale = (i18n.language as SupportedLocale) || 'uz-Latn';

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [readingArticle, setReadingArticle] = useState<Article | null>(null);
  const [copied, setCopied] = useState(false);

  const categories = [
    { id: 'all', label: t('articles:allArticles') },
    { id: 'Axloq', label: t('articles:catMorals') },
    { id: 'Tarix', label: t('articles:catHistory') },
    { id: 'Hikmat', label: t('articles:catWisdom') },
    { id: 'Fiqh', label: t('articles:catFiqh') },
  ];

  const filteredArticles = EDITORIAL_ARTICLES.filter(
    (a) => selectedCategory === 'all' || a.category === selectedCategory
  );

  const handleShare = () => {
    if (!readingArticle) return;
    const locTitle = getLocalizedField(readingArticle, 'title', currentLocale);
    const locSubtitle = getLocalizedField(readingArticle, 'subtitle', currentLocale);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard
          .writeText(`${locTitle}\n\n${locSubtitle}\n— Asaka Ziyo`)
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
            <span>{t('articles:ilmZiyo')}</span>
            <span aria-hidden="true">·</span>
            <span>{t('articles:editorialBoard')}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-white">
            {t('articles:title')}
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            {t('articles:subtitle')}
          </p>
        </div>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => {
          const isSelected = selectedCategory === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'border-[#c5a869] bg-[#c5a869] text-[#071614] font-semibold shadow-sm'
                  : 'border-stone-200/80 dark:border-emerald-950 bg-white dark:bg-[#0d211e]/70 text-stone-700 dark:text-stone-300 hover:border-[#c5a869]/40'
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredArticles.map((article) => {
          const isSaved = isFavorited(article.id);
          const locTitle = getLocalizedField(article, 'title', currentLocale);
          const locSubtitle = getLocalizedField(article, 'subtitle', currentLocale);
          const locExcerpt = getLocalizedField(article, 'excerpt', currentLocale);
          const locAuthor = currentLocale === 'uz-Latn-new' ? toNewUzbekAlphabet(article.author) : article.author;

          return (
            <Card
              key={article.id}
              elevated
              className="flex flex-col justify-between p-6 space-y-4 hover:border-[#c5a869]/50 transition-all group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                  <span className="font-semibold text-[#c5a869]">{article.category}</span>
                  <div className="flex items-center gap-1 font-mono-numbers">
                    <Clock className="w-3 h-3" />
                    <span>{article.readTimeMinutes} {t('articles:minRead')}</span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 group-hover:text-[#c5a869] transition-colors line-clamp-2">
                  {locTitle}
                </h3>

                <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-3 leading-relaxed">
                  {locExcerpt}
                </p>
              </div>

              <div className="pt-4 border-t border-stone-100 dark:border-emerald-950/60 space-y-3">
                <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-stone-400" />
                    <span className="truncate max-w-[140px]">{locAuthor}</span>
                  </div>

                  <button
                    onClick={() =>
                      onToggleFavorite({
                        id: article.id,
                        type: 'article',
                        title: locTitle,
                        subtitle: locSubtitle,
                        snippet: locExcerpt,
                        routeTab: 'articles',
                        routeId: article.id,
                      })
                    }
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      isSaved
                        ? 'bg-[#c5a869]/20 text-[#c5a869] border-[#c5a869]'
                        : 'text-stone-400 hover:text-[#c5a869] border-stone-200 dark:border-emerald-950'
                    }`}
                    title={t('common:save')}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                  </button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-center gap-1.5"
                  onClick={() => setReadingArticle(article)}
                >
                  <span>{t('articles:readFullArticle')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Reader Modal */}
      {readingArticle && (
        <Modal
          isOpen={true}
          onClose={() => setReadingArticle(null)}
          title={getLocalizedField(readingArticle, 'title', currentLocale)}
          size="2xl"
        >
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
            {/* Metadata banner */}
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-[#071614] border border-stone-200/60 dark:border-emerald-950/60 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500 dark:text-stone-400">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-[#c5a869]">{readingArticle.category}</span>
                <span aria-hidden="true">·</span>
                <span>{currentLocale === 'uz-Latn-new' ? toNewUzbekAlphabet(readingArticle.author) : readingArticle.author}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-numbers">{readingArticle.publishedDate}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleShare}
                  className="p-1.5 rounded-lg border border-stone-200 dark:border-emerald-950 hover:text-[#c5a869] transition-colors cursor-pointer flex items-center gap-1"
                  title={t('common:share')}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span className="text-[11px]">{copied ? t('common:copied') : t('common:share')}</span>
                </button>
              </div>
            </div>

            {/* Subtitle / Excerpt */}
            <p className="text-sm font-semibold text-stone-700 dark:text-stone-300 italic border-l-2 border-[#c5a869] pl-3">
              {getLocalizedField(readingArticle, 'subtitle', currentLocale)}
            </p>

            {/* Body paragraphs with localized fallback */}
            <div className="space-y-4 text-sm sm:text-base text-stone-800 dark:text-stone-200 font-editorial leading-relaxed">
              {getLocalizedParagraphs(readingArticle, currentLocale).map((para, idx) => (
                <p key={idx}>{para}</p>
              ))}
            </div>

            {/* Verification Footer */}
            <div className="pt-4 border-t border-stone-100 dark:border-emerald-950/60 text-xs text-stone-400 flex items-center justify-between">
              <span>{t('articles:verifiedArticle')}</span>
              <span className="font-mono-numbers">ID: {readingArticle.id}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
