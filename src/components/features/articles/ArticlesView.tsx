import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Article, MediaPost, NavigationTab, SupportedLocale } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { GeometricPattern } from '../../ui/GeometricPattern';
import { getLocalizedField, getLocalizedParagraphs } from '../../../utils/localizedContent';
import { toNewUzbekAlphabet } from '../../../utils/newUzbekAlphabet';
import {
  getStoredArticles,
  getStoredMediaPosts,
  likeStoredArticle,
  rateStoredArticle,
  addArticleComment,
  likeStoredMediaPost,
  addMediaPostComment,
  subscribeToDatabase,
} from '../../../utils/databaseService';
import {
  BookOpen,
  Clock,
  User,
  Bookmark,
  ArrowRight,
  Share2,
  Check,
  Heart,
  Star,
  MessageCircle,
  Video,
  Send,
  Play,
  Film,
} from 'lucide-react';

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

  const [mainTab, setMainTab] = useState<'articles' | 'reels'>('articles');
  const [articles, setArticles] = useState<Article[]>(() => getStoredArticles());
  const [mediaPosts, setMediaPosts] = useState<MediaPost[]>(() => getStoredMediaPosts());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [readingArticle, setReadingArticle] = useState<Article | null>(null);
  const [activeMediaPost, setActiveMediaPost] = useState<MediaPost | null>(null);
  const [copied, setCopied] = useState(false);

  // Comment input form states
  const [commentName, setCommentName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [userRating, setUserRating] = useState<number | null>(null);

  // Sync with central database in real time
  useEffect(() => {
    const unsubscribe = subscribeToDatabase((event) => {
      if (event.type === 'ARTICLES_UPDATED') {
        const fresh = getStoredArticles();
        setArticles(fresh);
        if (readingArticle) {
          const updatedCurrent = fresh.find((a) => a.id === readingArticle.id);
          if (updatedCurrent) setReadingArticle(updatedCurrent);
        }
      }
      if (event.type === 'POSTS_UPDATED') {
        const freshPosts = getStoredMediaPosts();
        setMediaPosts(freshPosts);
        if (activeMediaPost) {
          const updatedPost = freshPosts.find((p) => p.id === activeMediaPost.id);
          if (updatedPost) setActiveMediaPost(updatedPost);
        }
      }
    });
    return unsubscribe;
  }, [readingArticle, activeMediaPost]);

  const categories = [
    { id: 'all', label: t('articles:allArticles', 'Barcha maqolalar') },
    { id: 'Axloq', label: t('articles:catMorals', 'Axloq') },
    { id: 'Tarix', label: t('articles:catHistory', 'Tarix') },
    { id: 'Hikmat', label: t('articles:catWisdom', 'Hikmat') },
    { id: 'Fiqh', label: t('articles:catFiqh', 'Fiqh') },
  ];

  const filteredArticles = articles.filter(
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
    } catch {
      // ignore
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLikeArticle = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    likeStoredArticle(id);
  };

  const handleRateArticle = (id: string, stars: number) => {
    setUserRating(stars);
    rateStoredArticle(id, stars);
  };

  const handleAddArticleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!readingArticle || !commentText.trim()) return;

    addArticleComment(readingArticle.id, {
      authorName: commentName.trim() || 'Foydalanuvchi',
      text: commentText.trim(),
    });
    setCommentText('');
  };

  const handleLikeMedia = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    likeStoredMediaPost(id);
  };

  const handleAddMediaComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMediaPost || !commentText.trim()) return;

    addMediaPostComment(activeMediaPost.id, {
      authorName: commentName.trim() || 'Foydalanuvchi',
      text: commentText.trim(),
    });
    setCommentText('');
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-[#c5a869]/30 bg-gradient-to-r from-[#031d17] to-[#071614] text-white p-6 sm:p-10">
        <GeometricPattern opacity={0.05} />
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#c5a869] uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{t('articles:ilmZiyo', 'Ilm va Ziyo')}</span>
            <span aria-hidden="true">·</span>
            <span>{t('articles:editorialBoard', 'Tahririyat Hayʼati')}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-white">
            {t('articles:title', 'Islomiy Maqolalar, Postlar va Medialar')}
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            {t(
              'articles:subtitle',
              'Aqoid, fiqh, axloq, qisqa reels lavhalar va maʼrifiy manbalar'
            )}
          </p>
        </div>
      </div>

      {/* Main Switcher: Articles vs Reels/Media */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-stone-200 dark:border-emerald-950 pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setMainTab('articles')}
            className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              mainTab === 'articles'
                ? 'bg-[#c5a869] text-[#071614] shadow-md'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Ilmiy Maqolalar ({articles.length})</span>
          </button>

          <button
            onClick={() => setMainTab('reels')}
            className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              mainTab === 'reels'
                ? 'bg-[#c5a869] text-[#071614] shadow-md'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Reels, Video & Medialar ({mediaPosts.length})</span>
          </button>
        </div>
      </div>

      {/* ---------------- ARTICLES TAB ---------------- */}
      {mainTab === 'articles' && (
        <div className="space-y-6">
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
              const locAuthor =
                currentLocale === 'uz-Latn-new'
                  ? toNewUzbekAlphabet(article.author)
                  : article.author;

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
                        <span>
                          {article.readTimeMinutes} {t('articles:minRead', 'daqiqa')}
                        </span>
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
                    {/* Interaction toolbar: Rating & Likes */}
                    <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                      <div className="flex items-center gap-1.5 text-amber-500">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-bold text-stone-800 dark:text-stone-200">
                          {article.rating || 5.0}
                        </span>
                        <span className="text-[11px] text-stone-400">
                          ({article.ratingsCount || 1})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleLikeArticle(article.id, e)}
                          className="flex items-center gap-1 text-xs text-stone-500 hover:text-rose-500 transition-colors cursor-pointer"
                          title="Yoqdi"
                        >
                          <Heart className="w-3.5 h-3.5 text-rose-500" />
                          <span className="font-mono-numbers">{article.likesCount || 0}</span>
                        </button>

                        <div className="flex items-center gap-1 text-xs text-stone-500">
                          <MessageCircle className="w-3.5 h-3.5 text-[#c5a869]" />
                          <span className="font-mono-numbers">
                            {article.comments?.length || 0}
                          </span>
                        </div>
                      </div>
                    </div>

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
                        title={t('common:save', 'Saqlash')}
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
                      <span>{t('articles:readFullArticle', 'Toʻliq oʻqish va Izohlar')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------- REELS & MEDIA TAB ---------------- */}
      {mainTab === 'reels' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mediaPosts.map((post) => (
            <Card
              key={post.id}
              elevated
              interactive
              onClick={() => setActiveMediaPost(post)}
              className="overflow-hidden flex flex-col justify-between hover:border-[#c5a869]/60 transition-all group"
            >
              {/* Media Thumbnail */}
              <div className="relative h-48 w-full bg-black/60 overflow-hidden">
                <img
                  src={post.thumbnail || post.mediaUrl}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#c5a869] text-[#071614]">
                  {post.type}
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-[#c5a869]/90 text-[#071614] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Caption & Metadata */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-1">
                    <span className="font-semibold text-[#c5a869]">{post.category}</span>
                    <span>{post.publishedDate}</span>
                  </div>
                  <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 group-hover:text-[#c5a869] transition-colors line-clamp-2">
                    {post.title}
                  </h4>
                  <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 line-clamp-2 leading-relaxed">
                    {post.caption}
                  </p>
                </div>

                <div className="pt-3 border-t border-stone-200 dark:border-emerald-950/80 flex items-center justify-between text-xs text-stone-500">
                  <span>{post.author}</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => handleLikeMedia(post.id, e)}
                      className="flex items-center gap-1 hover:text-rose-500 transition-colors cursor-pointer"
                    >
                      <Heart className="w-3.5 h-3.5 text-rose-500" />
                      <span>{post.likesCount}</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5 text-[#c5a869]" />
                      <span>{post.commentsCount}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ---------------- READER MODAL (Interactive Rating + Comments) ---------------- */}
      {readingArticle && (
        <Modal
          isOpen={true}
          onClose={() => setReadingArticle(null)}
          title={getLocalizedField(readingArticle, 'title', currentLocale)}
          size="2xl"
        >
          <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2">
            {/* Metadata banner */}
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-[#071614] border border-stone-200/60 dark:border-emerald-950/60 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500 dark:text-stone-400">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-[#c5a869]">{readingArticle.category}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {currentLocale === 'uz-Latn-new'
                    ? toNewUzbekAlphabet(readingArticle.author)
                    : readingArticle.author}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-numbers">{readingArticle.publishedDate}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleShare}
                  className="p-1.5 rounded-lg border border-stone-200 dark:border-emerald-950 hover:text-[#c5a869] transition-colors cursor-pointer flex items-center gap-1"
                  title={t('common:share', 'Ulashish')}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span className="text-[11px]">{copied ? t('common:copied', 'Nusxalandi') : t('common:share', 'Ulashish')}</span>
                </button>
              </div>
            </div>

            {/* Subtitle / Excerpt */}
            <p className="text-sm font-semibold text-stone-700 dark:text-stone-300 italic border-l-2 border-[#c5a869] pl-3">
              {getLocalizedField(readingArticle, 'subtitle', currentLocale)}
            </p>

            {/* Body paragraphs */}
            <div className="space-y-4 text-sm sm:text-base text-stone-800 dark:text-stone-200 font-editorial leading-relaxed">
              {getLocalizedParagraphs(readingArticle, currentLocale).map((para, idx) => (
                <p key={idx}>{para}</p>
              ))}
            </div>

            {/* Interactive Rating & Like Section */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/30 to-[#071614] border border-[#c5a869]/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <div className="text-xs font-bold text-white">Maqolani baholang:</div>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleRateArticle(readingArticle.id, star)}
                      className="p-1 hover:scale-125 transition-transform cursor-pointer"
                      title={`${star} yulduz berish`}
                    >
                      <Star
                        className={`w-5 h-5 ${
                          star <= (userRating || Math.round(readingArticle.rating || 5))
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-stone-500'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-mono-numbers font-bold text-amber-400 ml-2">
                    {readingArticle.rating || 5.0} ({readingArticle.ratingsCount || 1} ta baho)
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleLikeArticle(readingArticle.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer font-bold text-xs"
              >
                <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                <span>Yoqdi ({readingArticle.likesCount || 0})</span>
              </button>
            </div>

            {/* Comments Section */}
            <div className="space-y-4 pt-4 border-t border-stone-200 dark:border-emerald-950">
              <h4 className="font-display font-bold text-base text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#c5a869]" />
                <span>Izohlar va Fikrlar ({readingArticle.comments?.length || 0})</span>
              </h4>

              {/* Add comment form */}
              <form onSubmit={handleAddArticleComment} className="space-y-2.5">
                <input
                  type="text"
                  placeholder="Ismingiz..."
                  value={commentName}
                  onChange={(e) => setCommentName(e.target.value)}
                  className="w-full p-2 text-xs rounded-lg border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614] text-stone-900 dark:text-stone-100"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Izohingizni yozing..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="flex-1 p-2 text-xs rounded-lg border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614] text-stone-900 dark:text-stone-100"
                  />
                  <Button type="submit" variant="primary" size="sm" className="shrink-0">
                    <Send className="w-3.5 h-3.5 mr-1" />
                    <span>Yuborish</span>
                  </Button>
                </div>
              </form>

              {/* Comments list */}
              <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                {!readingArticle.comments || readingArticle.comments.length === 0 ? (
                  <p className="text-xs text-stone-400 italic">Hozircha izohlar yoʻq. Birinchi boʻlib fikringizni bildiring!</p>
                ) : (
                  readingArticle.comments.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-xl bg-stone-100/70 dark:bg-black/20 border border-stone-200/60 dark:border-white/5 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-800 dark:text-stone-200">
                          {c.authorName}
                        </span>
                        <span className="text-[10px] text-stone-400">{c.createdAt}</span>
                      </div>
                      <p className="text-stone-600 dark:text-stone-300 leading-relaxed">
                        {c.text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ---------------- MEDIA / REEL MODAL ---------------- */}
      {activeMediaPost && (
        <Modal
          isOpen={true}
          onClose={() => setActiveMediaPost(null)}
          title={activeMediaPost.title}
          size="lg"
        >
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            <div className="rounded-2xl overflow-hidden bg-black max-h-80 relative flex items-center justify-center">
              <img
                src={activeMediaPost.mediaUrl}
                alt={activeMediaPost.title}
                className="w-full h-full max-h-80 object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-[#c5a869] text-[#071614] flex items-center justify-center shadow-xl">
                  <Play className="w-8 h-8 ml-1" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span>{activeMediaPost.author} · {activeMediaPost.publishedDate}</span>
                <button
                  onClick={() => handleLikeMedia(activeMediaPost.id)}
                  className="flex items-center gap-1 text-rose-500 font-bold cursor-pointer"
                >
                  <Heart className="w-4 h-4 fill-rose-500" />
                  <span>{activeMediaPost.likesCount} ta yoqdi</span>
                </button>
              </div>
              <p className="text-xs sm:text-sm text-stone-800 dark:text-stone-200 leading-relaxed">
                {activeMediaPost.caption}
              </p>
            </div>

            {/* Media Comments */}
            <div className="space-y-3 pt-3 border-t border-stone-200 dark:border-emerald-950">
              <h5 className="font-bold text-xs text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-[#c5a869]" />
                <span>Izohlar ({activeMediaPost.comments?.length || 0})</span>
              </h5>

              <form onSubmit={handleAddMediaComment} className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Izoh qoldiring..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 p-2 text-xs rounded-lg border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614] text-stone-900 dark:text-stone-100"
                />
                <Button type="submit" variant="primary" size="sm">
                  <Send className="w-3.5 h-3.5 mr-1" />
                  <span>Yuborish</span>
                </Button>
              </form>

              <div className="space-y-2 max-h-40 overflow-y-auto">
                {activeMediaPost.comments?.map((c) => (
                  <div
                    key={c.id}
                    className="p-2.5 rounded-lg bg-stone-100 dark:bg-white/5 text-xs space-y-0.5"
                  >
                    <div className="flex justify-between font-bold text-stone-700 dark:text-stone-300">
                      <span>{c.authorName}</span>
                      <span className="text-[10px] text-stone-400 font-normal">{c.createdAt}</span>
                    </div>
                    <p className="text-stone-600 dark:text-stone-400">{c.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
