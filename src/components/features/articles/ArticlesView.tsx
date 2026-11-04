import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Article,
  AnnouncementItem,
  NewsItem,
  HadithItem,
  DhikrItem,
  NavigationTab,
  SupportedLocale,
} from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { GeometricPattern } from '../../ui/GeometricPattern';
import { getLocalizedField, getLocalizedParagraphs } from '../../../utils/localizedContent';
import { toNewUzbekAlphabet } from '../../../utils/newUzbekAlphabet';
import {
  getStoredArticles,
  getStoredHadiths,
  getStoredDhikrs,
  likeStoredArticle,
  rateStoredArticle,
  addArticleComment,
  subscribeToDatabase,
} from '../../../utils/databaseService';
import { COMMUNITY_ANNOUNCEMENTS, COMMUNITY_NEWS } from '../../../data/newsAndAnnouncementsData';
import {
  BookOpen,
  Clock,
  User,
  Bookmark,
  Share2,
  Check,
  Heart,
  Star,
  MessageCircle,
  Radio,
  Sparkles,
  Search,
  CheckCircle,
  Type,
  Eye,
  Calendar,
  MapPin,
  Send,
  Pin,
} from 'lucide-react';

export type ContentHubCategory = 'elonlar' | 'maqolalar' | 'yangiliklar' | 'hadislar' | 'zikrlar';

export type ReaderFontSize = 'sm' | 'base' | 'lg' | 'xl';

interface ArticlesViewProps {
  onToggleFavorite: (item: {
    id: string;
    type: 'article' | 'hadith' | 'dhikr';
    title: string;
    subtitle: string;
    snippet: string;
    routeTab: NavigationTab;
    routeId: string;
  }) => void;
  isFavorited: (id: string) => boolean;
  initialCategory?: ContentHubCategory;
}

export const ArticlesView: React.FC<ArticlesViewProps> = ({
  onToggleFavorite,
  isFavorited,
  initialCategory = 'maqolalar',
}) => {
  const { t, i18n } = useTranslation(['articles', 'common']);
  const currentLocale = (i18n.language as SupportedLocale) || 'uz-Latn';

  const [activeCategory, setActiveCategory] = useState<ContentHubCategory>(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [articles, setArticles] = useState<Article[]>(() => getStoredArticles());
  const [hadiths, setHadiths] = useState<HadithItem[]>(() => getStoredHadiths());
  const [dhikrs, setDhikrs] = useState<DhikrItem[]>(() => getStoredDhikrs());
  const [announcements] = useState<AnnouncementItem[]>(COMMUNITY_ANNOUNCEMENTS);
  const [newsList] = useState<NewsItem[]>(COMMUNITY_NEWS);

  // Active Reader item
  const [readingArticle, setReadingArticle] = useState<Article | null>(null);
  const [readingAnnouncement, setReadingAnnouncement] = useState<AnnouncementItem | null>(null);
  const [readingNews, setReadingNews] = useState<NewsItem | null>(null);
  const [readingHadith, setReadingHadith] = useState<HadithItem | null>(null);
  const [readingDhikr, setReadingDhikr] = useState<DhikrItem | null>(null);

  // Reader Font Size (Kichik, O'rtacha, Katta, Juda katta) with localStorage persistence
  const [fontSize, setFontSize] = useState<ReaderFontSize>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('asaka_ziyo_reading_font_size') as ReaderFontSize;
        if (saved && ['sm', 'base', 'lg', 'xl'].includes(saved)) return saved;
      }
    } catch {
      // fallback
    }
    return 'base';
  });

  // Read memory (list of IDs read by the user)
  const [readItems, setReadItems] = useState<string[]>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('asaka_ziyo_read_articles');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch {
      // fallback
    }
    return [];
  });

  const [copied, setCopied] = useState(false);
  const [commentName, setCommentName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [userRating, setUserRating] = useState<number | null>(null);

  // Sync articles, hadiths, dhikrs in real time
  useEffect(() => {
    const unsubscribe = subscribeToDatabase((event) => {
      if (event.type === 'ARTICLES_UPDATED') {
        const fresh = getStoredArticles();
        setArticles(fresh);
        if (readingArticle) {
          const updated = fresh.find((a) => a.id === readingArticle.id);
          if (updated) setReadingArticle(updated);
        }
      }
      if (event.type === 'HADITHS_UPDATED') setHadiths(getStoredHadiths());
      if (event.type === 'DHIKRS_UPDATED') setDhikrs(getStoredDhikrs());
    });
    return unsubscribe;
  }, [readingArticle]);

  // Persist font size change
  const handleChangeFontSize = (size: ReaderFontSize) => {
    setFontSize(size);
    try {
      localStorage.setItem('asaka_ziyo_reading_font_size', size);
    } catch {
      // ignore
    }
  };

  // Mark item as read
  const markAsRead = (id: string) => {
    if (!readItems.includes(id)) {
      const updated = [...readItems, id];
      setReadItems(updated);
      try {
        localStorage.setItem('asaka_ziyo_read_articles', JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
  };

  const handleShare = (title: string, subtitle?: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard
          .writeText(`${title}\n${subtitle ? subtitle + '\n' : ''}— ASAKA ZIYO`)
          .catch(() => {});
      }
    } catch {
      // ignore
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLike = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    likeStoredArticle(id);
  };

  const handleRate = (id: string, stars: number) => {
    setUserRating(stars);
    rateStoredArticle(id, stars);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!readingArticle || !commentText.trim()) return;
    addArticleComment(readingArticle.id, {
      authorName: commentName.trim() || 'Foydalanuvchi',
      text: commentText.trim(),
    });
    setCommentText('');
  };

  // Font size classes for Reader View
  const getBodyTextClass = (sz: ReaderFontSize) => {
    switch (sz) {
      case 'sm':
        return 'text-sm leading-relaxed';
      case 'lg':
        return 'text-lg leading-loose';
      case 'xl':
        return 'text-xl leading-loose';
      case 'base':
      default:
        return 'text-base leading-relaxed';
    }
  };

  // Filtered collections based on search query
  const q = searchQuery.toLowerCase().trim();

  const filteredAnnouncements = announcements.filter(
    (a) => !q || a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)
  );

  const filteredArticles = articles.filter(
    (a) => !q || a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q) || a.author.toLowerCase().includes(q)
  );

  const filteredNews = newsList.filter(
    (n) => !q || n.title.toLowerCase().includes(q) || n.summary.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
  );

  const filteredHadiths = hadiths.filter(
    (h) => !q || h.translationUz.toLowerCase().includes(q) || h.narratorUz.toLowerCase().includes(q) || h.collectionNameUz.toLowerCase().includes(q)
  );

  const filteredDhikrs = dhikrs.filter(
    (d) => !q || d.titleUz.toLowerCase().includes(q) || d.translationUz.toLowerCase().includes(q) || d.categoryTitleUz.toLowerCase().includes(q)
  );

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto">
      {/* 1. Header Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-[#c5a869]/30 bg-gradient-to-r from-[#031d17] via-[#071614] to-[#04241d] p-6 sm:p-10 text-white shadow-xl">
        <GeometricPattern opacity={0.06} />
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#c5a869] uppercase tracking-wider">
            <BookOpen className="w-4 h-4" />
            <span>Asaka Ziyo Maʼrifiy Ekotizimi</span>
            <span aria-hidden="true">·</span>
            <span>Ilm, Axloq va Hikmat Maskani</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-white">
            Maqolalar, Eʼlonlar va Manbalar
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed max-w-2xl">
            Asaka jome masjidi yangiliklari, haftalik juma maʼruzalari eʼlonlari, moʻtabar ulamolar maqolalari, sahih hadislar va kundalik zikrlar toʻplami.
          </p>
        </div>
      </div>

      {/* 2. Unified 5 Category Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-emerald-950 pb-4">
        {/* 5 Categories Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-stone-100 dark:bg-emerald-950/40 border border-stone-200/80 dark:border-emerald-900/40">
          {[
            { id: 'elonlar', label: '1. Eʼlonlar', count: announcements.length, icon: <Radio className="w-3.5 h-3.5" /> },
            { id: 'maqolalar', label: '2. Maqolalar', count: articles.length, icon: <BookOpen className="w-3.5 h-3.5" /> },
            { id: 'yangiliklar', label: '3. Yangiliklar', count: newsList.length, icon: <Calendar className="w-3.5 h-3.5" /> },
            { id: 'hadislar', label: '4. Hadislar', count: hadiths.length, icon: <Sparkles className="w-3.5 h-3.5" /> },
            { id: 'zikrlar', label: '5. Zikrlar', count: dhikrs.length, icon: <Heart className="w-3.5 h-3.5" /> },
          ].map((tab) => {
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id as ContentHubCategory)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#c5a869] text-[#071614] shadow-md scale-[1.02]'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isActive ? 'bg-[#071614] text-[#c5a869]' : 'bg-stone-200 dark:bg-white/10 text-stone-600 dark:text-stone-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Qidirish (mavzu, matn, muallif)..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18] text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#c5a869]"
          />
        </div>
      </div>

      {/* 3. CATEGORY 1: E'LONLAR */}
      {activeCategory === 'elonlar' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAnnouncements.map((ann) => {
              const isRead = readItems.includes(ann.id);
              return (
                <Card
                  key={ann.id}
                  elevated
                  onClick={() => {
                    markAsRead(ann.id);
                    setReadingAnnouncement(ann);
                  }}
                  className="p-5 flex flex-col justify-between hover:border-[#c5a869]/60 transition-all cursor-pointer group space-y-4 relative"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#c5a869]/15 text-[#c5a869] font-bold border border-[#c5a869]/30">
                        {ann.typeLabelUz}
                      </span>
                      {ann.isPinned && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-500">
                          <Pin className="w-3.5 h-3.5" />
                          <span>Biriktirilgan</span>
                        </span>
                      )}
                      {isRead && (
                        <span className="flex items-center gap-1 text-[10px] text-stone-400">
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                          <span>Oʻqilgan</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 group-hover:text-[#c5a869] transition-colors leading-snug">
                      {ann.title}
                    </h3>

                    <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-3 leading-relaxed">
                      {ann.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-stone-100 dark:border-emerald-950/60 space-y-1.5 text-[11px] text-stone-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#c5a869]" />
                      <span>{ann.date} {ann.time ? `· ${ann.time}` : ''}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-[#c5a869]" />
                      <span className="truncate">{ann.location}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. CATEGORY 2: MAQOLALAR */}
      {activeCategory === 'maqolalar' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((art) => {
              const isRead = readItems.includes(art.id);
              const locTitle = getLocalizedField(art, 'title', currentLocale);
              const locSubtitle = getLocalizedField(art, 'subtitle', currentLocale);
              const locExcerpt = getLocalizedField(art, 'excerpt', currentLocale);

              return (
                <Card
                  key={art.id}
                  elevated
                  onClick={() => {
                    markAsRead(art.id);
                    setReadingArticle(art);
                  }}
                  className="overflow-hidden flex flex-col justify-between hover:border-[#c5a869]/60 transition-all cursor-pointer group"
                >
                  <div className="relative h-48 w-full overflow-hidden bg-stone-900">
                    <img
                      src={art.featuredImage}
                      alt={locTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#c5a869] text-[#071614] text-[10px] font-bold">
                        {art.category}
                      </span>
                      {art.isFeatured && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                          Yangi
                        </span>
                      )}
                    </div>
                    {isRead && (
                      <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-emerald-400 text-[10px] font-bold flex items-center gap-1 border border-emerald-500/30">
                        <CheckCircle className="w-3 h-3" />
                        <span>Oʻqilgan</span>
                      </span>
                    )}
                  </div>

                  <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[11px] text-stone-400">
                        <span>{art.publishedDate}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{art.readTimeMinutes} daqiqa</span>
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 group-hover:text-[#c5a869] transition-colors leading-snug">
                        {locTitle}
                      </h3>

                      <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2 leading-relaxed">
                        {locExcerpt || locSubtitle}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-stone-100 dark:border-emerald-950/60 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-stone-600 dark:text-stone-400 truncate">
                        <User className="w-3.5 h-3.5 text-[#c5a869] shrink-0" />
                        <span className="truncate font-medium">{art.author}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="flex items-center gap-1 text-[11px] text-stone-400">
                          <Heart className="w-3 h-3 text-rose-500" />
                          <span>{art.likesCount || 0}</span>
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-amber-500 font-bold">
                          <Star className="w-3 h-3 fill-amber-500" />
                          <span>{art.rating || 5.0}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. CATEGORY 3: YANGILIKLAR */}
      {activeCategory === 'yangiliklar' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredNews.map((news) => {
            const isRead = readItems.includes(news.id);
            return (
              <Card
                key={news.id}
                elevated
                onClick={() => {
                  markAsRead(news.id);
                  setReadingNews(news);
                }}
                className="overflow-hidden flex flex-col justify-between hover:border-[#c5a869]/60 transition-all cursor-pointer group"
              >
                {news.imageUrl && (
                  <div className="h-44 w-full overflow-hidden bg-stone-900 relative">
                    <img
                      src={news.imageUrl}
                      alt={news.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#c5a869] text-[#071614] text-[10px] font-bold">
                        {news.category}
                      </span>
                    </div>
                  </div>
                )}
                <div className="p-5 space-y-2.5 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-stone-400">
                      <span>{news.publishedDate}</span>
                      {isRead && (
                        <span className="flex items-center gap-1 text-emerald-500 text-[10px] font-bold">
                          <CheckCircle className="w-3 h-3" />
                          <span>Oʻqilgan</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 group-hover:text-[#c5a869] transition-colors leading-snug">
                      {news.title}
                    </h3>
                    <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-3 leading-relaxed">
                      {news.summary}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-stone-100 dark:border-emerald-950/60 text-[11px] text-stone-400 flex items-center justify-between">
                    <span>Manba: {news.source}</span>
                    <span className="text-[#c5a869] font-bold group-hover:underline">Batafsil →</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 6. CATEGORY 4: HADISLAR */}
      {activeCategory === 'hadislar' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredHadiths.map((h) => (
              <Card
                key={h.id}
                elevated
                onClick={() => setReadingHadith(h)}
                className="p-5 sm:p-6 space-y-4 hover:border-[#c5a869]/60 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
                      {h.collectionNameUz}
                    </span>
                    <span className="font-mono-numbers text-stone-400">№{h.number}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#c5a869]/15 text-[#c5a869] text-[10px] font-bold">
                    {h.grade}
                  </span>
                </div>

                <p dir="rtl" className="font-arabic text-xl sm:text-2xl text-stone-900 dark:text-amber-100 leading-loose text-right">
                  {h.textAr}
                </p>

                <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed italic line-clamp-3">
                  «{h.translationUz}»
                </p>

                <div className="pt-3 border-t border-stone-100 dark:border-emerald-950/60 flex items-center justify-between text-[11px] text-stone-400">
                  <span>Roviy: {h.narratorUz}</span>
                  <span className="text-[#c5a869] font-semibold">{h.reference}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 7. CATEGORY 5: ZIKRLAR */}
      {activeCategory === 'zikrlar' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredDhikrs.map((d) => (
            <Card
              key={d.id}
              elevated
              onClick={() => setReadingDhikr(d)}
              className="p-5 sm:p-6 space-y-4 hover:border-[#c5a869]/60 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="px-2.5 py-0.5 rounded-full bg-[#c5a869]/15 text-[#c5a869] font-bold border border-[#c5a869]/30">
                  {d.categoryTitleUz}
                </span>
                <span className="font-mono-numbers px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold text-[11px]">
                  {d.targetCount} marta
                </span>
              </div>

              <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 group-hover:text-[#c5a869] transition-colors">
                {d.titleUz}
              </h4>

              <p dir="rtl" className="font-arabic text-xl text-stone-900 dark:text-amber-100 leading-loose text-right">
                {d.textAr}
              </p>

              <p className="text-xs text-stone-600 dark:text-stone-400 italic line-clamp-2">
                {d.transliterationUz}
              </p>

              <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed line-clamp-2">
                «{d.translationUz}»
              </p>

              <div className="pt-2 border-t border-stone-100 dark:border-emerald-950/60 text-[11px] text-stone-400">
                Manba: {d.source}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 8. READER MODAL FOR FULL ARTICLE */}
      {readingArticle && (
        <Modal
          isOpen={!!readingArticle}
          onClose={() => setReadingArticle(null)}
          title={getLocalizedField(readingArticle, 'title', currentLocale)}
          subtitle={`${readingArticle.author} · ${readingArticle.publishedDate}`}
          maxWidth="2xl"
        >
          <div className="space-y-6">
            {/* Font Size Toolbar */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-stone-100 dark:bg-emerald-950/40 border border-stone-200 dark:border-emerald-900/40">
              <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-300 font-medium">
                <Type className="w-4 h-4 text-[#c5a869]" />
                <span>Matn oʻlchami:</span>
              </div>

              <div className="flex items-center gap-1.5">
                {[
                  { id: 'sm', label: 'Kichik (A-)' },
                  { id: 'base', label: 'Oʻrtacha (A)' },
                  { id: 'lg', label: 'Katta (A+)' },
                  { id: 'xl', label: 'Juda katta (A++)' },
                ].map((sz) => (
                  <button
                    key={sz.id}
                    onClick={() => handleChangeFontSize(sz.id as ReaderFontSize)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      fontSize === sz.id
                        ? 'bg-[#c5a869] text-[#071614] shadow-sm'
                        : 'bg-white dark:bg-white/5 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
                    }`}
                  >
                    {sz.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Featured Image */}
            {readingArticle.featuredImage && (
              <div className="rounded-2xl overflow-hidden max-h-72 w-full">
                <img
                  src={readingArticle.featuredImage}
                  alt={readingArticle.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Subtitle / Key Quote */}
            {readingArticle.keyQuote && (
              <blockquote className="p-4 rounded-xl border-l-4 border-[#c5a869] bg-[#c5a869]/10 text-[#c5a869] font-editorial italic text-sm">
                {readingArticle.keyQuote}
              </blockquote>
            )}

            {/* Article Body Paragraphs with adjustable font size */}
            <div className={`space-y-4 text-stone-800 dark:text-stone-200 ${getBodyTextClass(fontSize)}`}>
              {getLocalizedParagraphs(readingArticle, currentLocale).map((para, idx) => (
                <p key={idx} className="leading-relaxed">
                  {para}
                </p>
              ))}
            </div>

            {/* Interactions: Like, Rating, Share */}
            <div className="pt-4 border-t border-stone-200 dark:border-emerald-950 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLike(readingArticle.id)}
                  className="text-xs"
                >
                  <Heart className="w-3.5 h-3.5 mr-1 text-rose-500 fill-rose-500" />
                  <span>Yoqdi ({readingArticle.likesCount || 0})</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onToggleFavorite({
                      id: readingArticle.id,
                      type: 'article',
                      title: readingArticle.title,
                      subtitle: readingArticle.author,
                      snippet: readingArticle.excerpt,
                      routeTab: 'articles',
                      routeId: readingArticle.id,
                    })
                  }
                  className="text-xs"
                >
                  <Bookmark className={`w-3.5 h-3.5 mr-1 ${isFavorited(readingArticle.id) ? 'fill-[#c5a869] text-[#c5a869]' : ''}`} />
                  <span>{isFavorited(readingArticle.id) ? 'Saqlangan' : 'Sevimlilarga'}</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleShare(readingArticle.title, readingArticle.excerpt)}
                  className="text-xs"
                >
                  <Share2 className="w-3.5 h-3.5 mr-1 text-[#c5a869]" />
                  <span>{copied ? 'Nusxalandi!' : 'Ulashish'}</span>
                </Button>
              </div>

              {/* Star Rating */}
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRate(readingArticle.id, star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        (userRating || Math.round(readingArticle.rating || 5)) >= star
                          ? 'text-amber-500 fill-amber-500'
                          : 'text-stone-400'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Comments List & Add Form */}
            <div className="pt-4 border-t border-stone-200 dark:border-emerald-950 space-y-3">
              <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-[#c5a869]" />
                <span>Fikr-mulohazalar ({readingArticle.comments?.length || 0})</span>
              </h4>

              {readingArticle.comments && readingArticle.comments.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {readingArticle.comments.map((comm) => (
                    <div key={comm.id} className="p-3 rounded-xl bg-stone-50 dark:bg-[#091a18] text-xs space-y-1">
                      <div className="flex items-center justify-between text-stone-500 text-[10px]">
                        <span className="font-bold text-stone-800 dark:text-stone-200">{comm.authorName}</span>
                        <span>{comm.createdAt}</span>
                      </div>
                      <p className="text-stone-700 dark:text-stone-300">{comm.text}</p>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleAddComment} className="space-y-2 pt-2">
                <input
                  type="text"
                  placeholder="Ismingiz (ixtiyoriy)..."
                  value={commentName}
                  onChange={(e) => setCommentName(e.target.value)}
                  className="w-full p-2 text-xs rounded-lg border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614] text-stone-900 dark:text-white"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Munosabatingizni yozing..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="flex-1 p-2 text-xs rounded-lg border border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614] text-stone-900 dark:text-white"
                  />
                  <Button type="submit" variant="primary" size="sm" className="text-xs">
                    <Send className="w-3.5 h-3.5 mr-1" />
                    <span>Yuborish</span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </Modal>
      )}

      {/* 9. READER MODAL FOR ANNOUNCEMENT */}
      {readingAnnouncement && (
        <Modal
          isOpen={!!readingAnnouncement}
          onClose={() => setReadingAnnouncement(null)}
          title={readingAnnouncement.title}
          subtitle={`${readingAnnouncement.date} · ${readingAnnouncement.location}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs sm:text-sm">
            <div className="p-3.5 rounded-xl bg-[#c5a869]/10 border border-[#c5a869]/30 text-[#c5a869] font-bold flex items-center justify-between">
              <span>{readingAnnouncement.typeLabelUz}</span>
              {readingAnnouncement.time && <span>Vaqti: {readingAnnouncement.time}</span>}
            </div>

            <p className="text-stone-800 dark:text-stone-200 leading-relaxed">
              {readingAnnouncement.description}
            </p>

            {readingAnnouncement.speaker && (
              <div className="p-3 rounded-lg bg-stone-100 dark:bg-[#091a18] text-xs">
                <span className="font-bold text-[#c5a869]">Soʻzlovchi: </span>
                <span>{readingAnnouncement.speaker}</span>
              </div>
            )}

            {readingAnnouncement.contact && (
              <div className="p-3 rounded-lg bg-stone-100 dark:bg-[#091a18] text-xs">
                <span className="font-bold text-[#c5a869]">Bogʻlanish: </span>
                <span>{readingAnnouncement.contact}</span>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleShare(readingAnnouncement.title, readingAnnouncement.description)}
                className="text-xs"
              >
                <Share2 className="w-3.5 h-3.5 mr-1 text-[#c5a869]" />
                <span>{copied ? 'Nusxalandi!' : 'Ulashish'}</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 10. READER MODAL FOR NEWS */}
      {readingNews && (
        <Modal
          isOpen={!!readingNews}
          onClose={() => setReadingNews(null)}
          title={readingNews.title}
          subtitle={`${readingNews.publishedDate} · ${readingNews.source}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs sm:text-sm">
            {readingNews.imageUrl && (
              <div className="rounded-xl overflow-hidden max-h-60 w-full">
                <img src={readingNews.imageUrl} alt={readingNews.title} className="w-full h-full object-cover" />
              </div>
            )}
            <p className="font-semibold text-stone-900 dark:text-white leading-relaxed">
              {readingNews.summary}
            </p>
            <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
              {readingNews.content}
            </p>
            <div className="pt-2 flex justify-between items-center text-xs text-stone-400 border-t border-stone-200 dark:border-emerald-950">
              <span>Manba: {readingNews.source}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleShare(readingNews.title, readingNews.summary)}
                className="text-xs"
              >
                <Share2 className="w-3.5 h-3.5 mr-1 text-[#c5a869]" />
                <span>{copied ? 'Nusxalandi!' : 'Ulashish'}</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
