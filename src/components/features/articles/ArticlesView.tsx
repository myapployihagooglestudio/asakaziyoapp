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
import {
  getStoredArticles,
  getStoredHadiths,
  getStoredDhikrs,
  getStoredAnnouncements,
  getStoredNews,
  likeStoredArticle,
  rateStoredArticle,
  addArticleComment,
  subscribeToDatabase,
  isPubliclyPublished,
  getDateCategoryInfo,
  getAllArchivedItems,
  ArchivedItemSummary,
} from '../../../utils/databaseService';
import {
  BookOpen,
  Clock,
  User,
  Bookmark,
  Share2,
  Heart,
  Star,
  MessageCircle,
  Radio,
  Sparkles,
  Search,
  CheckCircle,
  Type,
  Calendar,
  MapPin,
  Send,
  Pin,
  Archive,
  Film,
} from 'lucide-react';

export type ContentHubCategory =
  | 'elonlar'
  | 'maqolalar'
  | 'yangiliklar'
  | 'hadislar'
  | 'zikrlar'
  | 'arxiv';

export type DateFilterMode = 'all' | 'today' | 'yesterday' | 'archive';

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
  const { i18n } = useTranslation(['articles', 'common']);
  const currentLocale = (i18n.language as SupportedLocale) || 'uz-Latn';

  const [activeCategory, setActiveCategory] = useState<ContentHubCategory>(initialCategory);
  const [dateFilter, setDateFilter] = useState<DateFilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [articles, setArticles] = useState<Article[]>(() => getStoredArticles());
  const [hadiths, setHadiths] = useState<HadithItem[]>(() => getStoredHadiths());
  const [dhikrs, setDhikrs] = useState<DhikrItem[]>(() => getStoredDhikrs());
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(() => getStoredAnnouncements());
  const [newsList, setNewsList] = useState<NewsItem[]>(() => getStoredNews());
  const [archivedSummaries, setArchivedSummaries] = useState<ArchivedItemSummary[]>(() =>
    getAllArchivedItems()
  );

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

  // Sync articles, hadiths, dhikrs, announcements, news in real time from Firestore
  useEffect(() => {
    const unsubscribe = subscribeToDatabase((event) => {
      if (event.type === 'ARTICLES_UPDATED') {
        const fresh = getStoredArticles();
        setArticles(fresh);
        setArchivedSummaries(getAllArchivedItems());
        if (readingArticle) {
          const updated = fresh.find((a) => a.id === readingArticle.id);
          if (updated) setReadingArticle(updated);
        }
      }
      if (event.type === 'HADITHS_UPDATED') {
        setHadiths(getStoredHadiths());
        setArchivedSummaries(getAllArchivedItems());
      }
      if (event.type === 'DHIKRS_UPDATED') {
        setDhikrs(getStoredDhikrs());
        setArchivedSummaries(getAllArchivedItems());
      }
      if (event.type === 'ANNOUNCEMENTS_UPDATED') {
        setAnnouncements(getStoredAnnouncements());
        setArchivedSummaries(getAllArchivedItems());
      }
      if (event.type === 'NEWS_UPDATED') {
        setNewsList(getStoredNews());
        setArchivedSummaries(getAllArchivedItems());
      }
      if (event.type === 'POSTS_UPDATED') {
        setArchivedSummaries(getAllArchivedItems());
      }
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

  // Helper to filter an item by publish status + dateFilter
  const matchesDateAndPublishFilter = (item: {
    isArchived?: boolean;
    publishMode?: any;
    createdAtIso?: string;
    updatedAt?: string;
    publishedDate?: string;
    date?: string;
  }): boolean => {
    if (dateFilter === 'archive' || activeCategory === 'arxiv') {
      return Boolean(item.isArchived || item.publishMode === 'archived');
    }
    // Otherwise must be publicly published (not draft, not test, not archived)
    if (!isPubliclyPublished(item)) return false;

    if (dateFilter === 'all') return true;
    const info = getDateCategoryInfo(item);
    if (dateFilter === 'today') return info.bucket === 'today';
    if (dateFilter === 'yesterday') return info.bucket === 'yesterday';
    return true;
  };

  // Filtered collections based on search query + publish/date filter
  const q = searchQuery.toLowerCase().trim();

  const publishedAnnouncementsCount = announcements.filter(isPubliclyPublished).length;
  const publishedArticlesCount = articles.filter(isPubliclyPublished).length;
  const publishedNewsCount = newsList.filter(isPubliclyPublished).length;
  const publishedHadithsCount = hadiths.filter(isPubliclyPublished).length;
  const publishedDhikrsCount = dhikrs.filter(isPubliclyPublished).length;

  const filteredAnnouncements = announcements.filter(
    (a) =>
      matchesDateAndPublishFilter(a) &&
      (!q || a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q))
  );

  const filteredArticles = articles.filter(
    (a) =>
      matchesDateAndPublishFilter(a) &&
      (!q ||
        a.title.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q) ||
        a.author.toLowerCase().includes(q))
  );

  const filteredNews = newsList.filter(
    (n) =>
      matchesDateAndPublishFilter(n) &&
      (!q ||
        n.title.toLowerCase().includes(q) ||
        n.summary.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q))
  );

  const filteredHadiths = hadiths.filter(
    (h) =>
      matchesDateAndPublishFilter(h) &&
      (!q ||
        h.translationUz.toLowerCase().includes(q) ||
        h.narratorUz.toLowerCase().includes(q) ||
        h.collectionNameUz.toLowerCase().includes(q))
  );

  const filteredDhikrs = dhikrs.filter(
    (d) =>
      matchesDateAndPublishFilter(d) &&
      (!q ||
        d.titleUz.toLowerCase().includes(q) ||
        d.translationUz.toLowerCase().includes(q) ||
        d.categoryTitleUz.toLowerCase().includes(q))
  );

  const filteredArchived = archivedSummaries.filter(
    (item) => !q || item.title.toLowerCase().includes(q) || item.typeLabelUz.toLowerCase().includes(q)
  );

  const isVideoUrl = (url?: string, mediaType?: string) => {
    if (!url) return false;
    if (mediaType === 'video') return true;
    return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
  };

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto">
      {/* 1. Header Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-[#c5a869]/30 bg-gradient-to-r from-[#031d17] via-[#071614] to-[#04241d] p-6 sm:p-10 text-white shadow-xl">
        <img
          src="/images/islamic_scholarship_library_1793634659800.jpg"
          alt="Islamic Scholarship Library"
          className="absolute inset-0 w-full h-full object-cover object-center brightness-75"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#031d17]/95 via-[#031d17]/85 to-transparent" />
        <GeometricPattern opacity={0.06} />
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#c5a869] uppercase tracking-wider">
            <BookOpen className="w-4 h-4" />
            <span>Asaka Ziyo Maʼrifiy Ekotizimi</span>
            <span aria-hidden="true">·</span>
            <span>Ilm, Axloq va Hikmat Maskani</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-white">
            Maqolalar, Eʼlonlar, Manbalar va Arxiv
          </h1>
          <p className="text-xs sm:text-sm text-stone-200 leading-relaxed max-w-2xl">
            Asaka jome masjidi maʼmuriyati tomonidan tasdiqlangan yangiliklar, haftalik juma maʼruzalari eʼlonlari, moʻtabar maqolalar, sahih hadislar, zikrlar va sanalar boʻyicha toʻliq arxiv.
          </p>
        </div>
      </div>

      {/* 2. Unified Category Navigation Bar + Date & Archive Filter */}
      <div className="space-y-3 border-b border-stone-200 dark:border-emerald-950 pb-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Categories Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-stone-100 dark:bg-emerald-950/40 border border-stone-200/80 dark:border-emerald-900/40">
            {[
              { id: 'elonlar', label: '1. Eʼlonlar', count: publishedAnnouncementsCount, icon: <Radio className="w-3.5 h-3.5" /> },
              { id: 'maqolalar', label: '2. Maqolalar', count: publishedArticlesCount, icon: <BookOpen className="w-3.5 h-3.5" /> },
              { id: 'yangiliklar', label: '3. Yangiliklar', count: publishedNewsCount, icon: <Calendar className="w-3.5 h-3.5" /> },
              { id: 'hadislar', label: '4. Hadislar', count: publishedHadithsCount, icon: <Sparkles className="w-3.5 h-3.5" /> },
              { id: 'zikrlar', label: '5. Zikrlar', count: publishedDhikrsCount, icon: <Heart className="w-3.5 h-3.5" /> },
              { id: 'arxiv', label: '6. Arxiv', count: archivedSummaries.length, icon: <Archive className="w-3.5 h-3.5" /> },
            ].map((tab) => {
              const isActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveCategory(tab.id as ContentHubCategory);
                    if (tab.id === 'arxiv') {
                      setDateFilter('archive');
                    } else if (dateFilter === 'archive') {
                      setDateFilter('all');
                    }
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#c5a869] text-[#071614] shadow-md scale-[1.02]'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive
                        ? 'bg-[#071614] text-[#c5a869]'
                        : 'bg-stone-200 dark:bg-white/10 text-stone-600 dark:text-stone-400'
                    }`}
                  >
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

        {/* Date & Archive Filter Bar (Bugun, Kecha, Barcha sanalar, Arxiv) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#c5a869]" />
              <span>Sana va holat boʻyicha saralash:</span>
            </span>
            {[
              { id: 'all', label: 'Barcha sanalar' },
              { id: 'today', label: 'Bugun joylanganlar' },
              { id: 'yesterday', label: 'Kecha joylanganlar' },
              { id: 'archive', label: 'Arxiv boʻlimi' },
            ].map((df) => {
              const isSelected = dateFilter === df.id;
              return (
                <button
                  key={df.id}
                  onClick={() => {
                    setDateFilter(df.id as DateFilterMode);
                    if (df.id === 'archive') {
                      setActiveCategory('arxiv');
                    } else if (activeCategory === 'arxiv') {
                      setActiveCategory('maqolalar');
                    }
                  }}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-800 text-white border border-[#c5a869]/50 shadow-sm'
                      : 'bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-white/10'
                  }`}
                >
                  {df.label}
                </button>
              );
            })}
          </div>
          <span className="text-[11px] text-stone-400">
            Faqat administrator tomonidan tasdiqlangan rasmiy maʼlumotlar
          </span>
        </div>
      </div>

      {/* 3. CATEGORY 1: E'LONLAR */}
      {activeCategory === 'elonlar' && (
        <div className="space-y-4">
          {filteredAnnouncements.length === 0 ? (
            <Card className="p-10 text-center space-y-2 border-dashed border-stone-300 dark:border-emerald-950">
              <Radio className="w-8 h-8 text-[#c5a869] mx-auto opacity-80" />
              <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200">
                Hozircha ushbu sana boʻyicha eʼlonlar mavjud emas
              </h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Masjid maʼmuriyati (Administrator) tomonidan yangi rasmiy eʼlon kiritilishi bilan bu yerda doimiy ravishda aks etadi.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredAnnouncements.map((ann) => {
                const isRead = readItems.includes(ann.id);
                const dateInfo = getDateCategoryInfo(ann);
                const mediaSrc = ann.mediaUrl;
                return (
                  <Card
                    key={ann.id}
                    elevated
                    onClick={() => {
                      markAsRead(ann.id);
                      setReadingAnnouncement(ann);
                    }}
                    className="overflow-hidden flex flex-col justify-between hover:border-[#c5a869]/60 transition-all cursor-pointer group relative"
                  >
                    {mediaSrc && (
                      <div className="h-44 w-full overflow-hidden bg-stone-900 relative">
                        {isVideoUrl(mediaSrc, ann.mediaType) ? (
                          <video src={mediaSrc} className="w-full h-full object-cover" muted playsInline />
                        ) : (
                          <img src={mediaSrc} alt={ann.title} className="w-full h-full object-cover" />
                        )}
                      </div>
                    )}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2.5 py-0.5 rounded-full bg-[#c5a869]/15 text-[#c5a869] font-bold border border-[#c5a869]/30">
                              {ann.typeLabelUz}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold">
                              {dateInfo.label}
                            </span>
                          </div>
                          {ann.isPinned && (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-amber-500">
                              <Pin className="w-3.5 h-3.5" />
                              <span>Muhim</span>
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
                          <span>
                            {ann.date} {ann.time ? `· ${ann.time}` : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-[#c5a869]" />
                          <span className="truncate">{ann.location}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. CATEGORY 2: MAQOLALAR */}
      {activeCategory === 'maqolalar' && (
        <div className="space-y-6">
          {filteredArticles.length === 0 ? (
            <Card className="p-10 text-center space-y-2 border-dashed border-stone-300 dark:border-emerald-950">
              <BookOpen className="w-8 h-8 text-[#c5a869] mx-auto opacity-80" />
              <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200">
                Hozircha ushbu sana boʻyicha maqolalar kiritilmagan
              </h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Administrator tomonidan tasdiqlangan maqolalar (Bugun, Kecha va barcha sanalar boʻyicha) joylanishi bilan bu yerda doimiy koʻrinadi.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((art) => {
                const isRead = readItems.includes(art.id);
                const locTitle = getLocalizedField(art, 'title', currentLocale);
                const locSubtitle = getLocalizedField(art, 'subtitle', currentLocale);
                const locExcerpt = getLocalizedField(art, 'excerpt', currentLocale);
                const dateInfo = getDateCategoryInfo(art);
                const mediaSrc = art.mediaUrl || art.featuredImage;

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
                    {mediaSrc && (
                      <div className="relative h-48 w-full overflow-hidden bg-stone-900">
                        {isVideoUrl(mediaSrc, art.mediaType) ? (
                          <video
                            src={mediaSrc}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                          />
                        ) : (
                          <img
                            src={mediaSrc}
                            alt={locTitle}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#c5a869] text-[#071614] text-[10px] font-bold">
                            {art.category}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-700/90 text-white text-[10px] font-bold">
                            {dateInfo.label}
                          </span>
                        </div>
                        {isRead && (
                          <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-emerald-400 text-[10px] font-bold flex items-center gap-1 border border-emerald-500/30">
                            <CheckCircle className="w-3 h-3" />
                            <span>Oʻqilgan</span>
                          </span>
                        )}
                      </div>
                    )}

                    <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[11px] text-stone-400">
                          <span className="font-semibold text-[#c5a869]">{dateInfo.label}</span>
                          <span>·</span>
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
          )}
        </div>
      )}

      {/* 5. CATEGORY 3: YANGILIKLAR */}
      {activeCategory === 'yangiliklar' && (
        <div className="space-y-4">
          {filteredNews.length === 0 ? (
            <Card className="p-10 text-center space-y-2 border-dashed border-stone-300 dark:border-emerald-950">
              <Calendar className="w-8 h-8 text-[#c5a869] mx-auto opacity-80" />
              <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200">
                Hozircha yangiliklar kiritilmagan
              </h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Administrator tomonidan tasdiqlangan rasmiy yangiliklar shu boʻlimda eʼlon qilinadi.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredNews.map((news) => {
                const isRead = readItems.includes(news.id);
                const dateInfo = getDateCategoryInfo(news);
                const mediaSrc = news.mediaUrl || news.imageUrl;
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
                    {mediaSrc && (
                      <div className="h-44 w-full overflow-hidden bg-stone-900 relative">
                        {isVideoUrl(mediaSrc, news.mediaType) ? (
                          <video src={mediaSrc} className="w-full h-full object-cover" muted playsInline />
                        ) : (
                          <img
                            src={mediaSrc}
                            alt={news.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        )}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#c5a869] text-[#071614] text-[10px] font-bold">
                            {news.category}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-700/90 text-white text-[10px] font-bold">
                            {dateInfo.label}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="p-5 space-y-2.5 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-stone-400">
                          <span>
                            <strong className="text-[#c5a869]">{dateInfo.label}</strong> · {news.publishedDate}
                          </span>
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
        </div>
      )}

      {/* 6. CATEGORY 4: HADISLAR */}
      {activeCategory === 'hadislar' && (
        <div className="space-y-4">
          {filteredHadiths.length === 0 ? (
            <Card className="p-10 text-center space-y-2 border-dashed border-stone-300 dark:border-emerald-950">
              <Sparkles className="w-8 h-8 text-[#c5a869] mx-auto opacity-80" />
              <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200">
                Hozircha hadislar kiritilmagan
              </h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Administrator tomonidan tasdiqlangan sahih hadislar shu boʻlimda doimiy saqlanadi.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredHadiths.map((h) => {
                const dateInfo = getDateCategoryInfo(h);
                return (
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
                        <span className="text-[10px] text-[#c5a869] font-semibold">· {dateInfo.label}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-[#c5a869]/15 text-[#c5a869] text-[10px] font-bold">
                        {h.grade}
                      </span>
                    </div>

                    <p
                      dir="rtl"
                      className="font-arabic text-xl sm:text-2xl text-stone-900 dark:text-amber-100 leading-loose text-right"
                    >
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
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 7. CATEGORY 5: ZIKRLAR */}
      {activeCategory === 'zikrlar' && (
        <div className="space-y-4">
          {filteredDhikrs.length === 0 ? (
            <Card className="p-10 text-center space-y-2 border-dashed border-stone-300 dark:border-emerald-950">
              <Heart className="w-8 h-8 text-[#c5a869] mx-auto opacity-80" />
              <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200">
                Hozircha zikr va duolar kiritilmagan
              </h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Administrator tomonidan tasdiqlangan kundalik zikr va duolar shu boʻlimda joylanadi.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredDhikrs.map((d) => {
                const dateInfo = getDateCategoryInfo(d);
                return (
                  <Card
                    key={d.id}
                    elevated
                    onClick={() => setReadingDhikr(d)}
                    className="p-5 sm:p-6 space-y-4 hover:border-[#c5a869]/60 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#c5a869]/15 text-[#c5a869] font-bold border border-[#c5a869]/30">
                          {d.categoryTitleUz}
                        </span>
                        <span className="text-[10px] text-stone-400">· {dateInfo.label}</span>
                      </div>
                      <span className="font-mono-numbers px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold text-[11px]">
                        {d.targetCount} marta
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 group-hover:text-[#c5a869] transition-colors">
                      {d.titleUz}
                    </h4>

                    <p
                      dir="rtl"
                      className="font-arabic text-xl text-stone-900 dark:text-amber-100 leading-loose text-right"
                    >
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
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 8. CATEGORY 6: ARXIV BO'LIMI */}
      {activeCategory === 'arxiv' && (
        <div className="space-y-4">
          {filteredArchived.length === 0 ? (
            <Card className="p-10 text-center space-y-2 border-dashed border-stone-300 dark:border-emerald-950">
              <Archive className="w-8 h-8 text-[#c5a869] mx-auto opacity-80" />
              <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200">
                Arxiv boʻlimida hozircha materiallar yoʻq
              </h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Administrator tomonidan arxiv rejimiga oʻtkazilgan maqolalar, eʼlonlar, yangiliklar, hadislar va zikrlar shu yerda sanalari bilan saqlanadi.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredArchived.map((arch) => {
                const orig = arch.originalItem || {};
                const dateInfo = getDateCategoryInfo(orig);
                return (
                  <Card
                    key={`${arch.type}-${arch.id}`}
                    elevated
                    onClick={() => {
                      if (arch.type === 'article') setReadingArticle(orig);
                      if (arch.type === 'announcement') setReadingAnnouncement(orig);
                      if (arch.type === 'news') setReadingNews(orig);
                      if (arch.type === 'hadith') setReadingHadith(orig);
                      if (arch.type === 'dhikr') setReadingDhikr(orig);
                    }}
                    className="p-5 flex flex-col justify-between space-y-3 hover:border-[#c5a869]/60 transition-all cursor-pointer"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30">
                          Arxiv · {arch.typeLabelUz}
                        </span>
                        <span className="text-[11px] text-stone-400">{dateInfo.label}</span>
                      </div>
                      <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 leading-snug">
                        {arch.title}
                      </h3>
                      {orig.excerpt || orig.summary || orig.description || orig.translationUz ? (
                        <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-3">
                          {orig.excerpt || orig.summary || orig.description || orig.translationUz}
                        </p>
                      ) : null}
                    </div>
                    <div className="pt-3 border-t border-stone-100 dark:border-emerald-950/60 flex items-center justify-between text-[11px] text-stone-400">
                      <span>
                        Arxivlangan: {arch.archivedAt ? new Date(arch.archivedAt).toLocaleDateString('uz-UZ') : dateInfo.label}
                      </span>
                      <span className="text-[#c5a869] font-semibold">Oʻqish →</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 9. READER MODAL FOR FULL ARTICLE */}
      {readingArticle && (
        <Modal
          isOpen={!!readingArticle}
          onClose={() => setReadingArticle(null)}
          title={getLocalizedField(readingArticle, 'title', currentLocale)}
          subtitle={`${readingArticle.author} · ${getDateCategoryInfo(readingArticle).label} (${readingArticle.publishedDate})`}
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

            {/* Featured Media (Image / Video / Audio) */}
            {(readingArticle.mediaUrl || readingArticle.featuredImage) && (
              <div className="rounded-2xl overflow-hidden max-h-96 w-full bg-black">
                {isVideoUrl(readingArticle.mediaUrl || readingArticle.featuredImage, readingArticle.mediaType) ? (
                  <video
                    src={readingArticle.mediaUrl || readingArticle.featuredImage}
                    controls
                    className="w-full max-h-96 object-contain"
                  />
                ) : readingArticle.mediaType === 'audio' ? (
                  <div className="p-4">
                    <audio src={readingArticle.mediaUrl} controls className="w-full" />
                  </div>
                ) : (
                  <img
                    src={readingArticle.mediaUrl || readingArticle.featuredImage}
                    alt={readingArticle.title}
                    className="w-full h-full object-cover"
                  />
                )}
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
                  <Bookmark
                    className={`w-3.5 h-3.5 mr-1 ${
                      isFavorited(readingArticle.id) ? 'fill-[#c5a869] text-[#c5a869]' : ''
                    }`}
                  />
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

      {/* 10. READER MODAL FOR ANNOUNCEMENT */}
      {readingAnnouncement && (
        <Modal
          isOpen={!!readingAnnouncement}
          onClose={() => setReadingAnnouncement(null)}
          title={readingAnnouncement.title}
          subtitle={`${readingAnnouncement.date} · ${readingAnnouncement.location}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs sm:text-sm">
            {readingAnnouncement.mediaUrl && (
              <div className="rounded-xl overflow-hidden max-h-72 w-full bg-black">
                {isVideoUrl(readingAnnouncement.mediaUrl, readingAnnouncement.mediaType) ? (
                  <video src={readingAnnouncement.mediaUrl} controls className="w-full max-h-72" />
                ) : (
                  <img
                    src={readingAnnouncement.mediaUrl}
                    alt={readingAnnouncement.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            )}
            <div className="p-3.5 rounded-xl bg-[#c5a869]/10 border border-[#c5a869]/30 text-[#c5a869] font-bold flex items-center justify-between">
              <span>{readingAnnouncement.typeLabelUz}</span>
              {readingAnnouncement.time && <span>Vaqti: {readingAnnouncement.time}</span>}
            </div>

            <p className="text-stone-800 dark:text-stone-200 leading-relaxed whitespace-pre-line">
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

      {/* 11. READER MODAL FOR NEWS */}
      {readingNews && (
        <Modal
          isOpen={!!readingNews}
          onClose={() => setReadingNews(null)}
          title={readingNews.title}
          subtitle={`${readingNews.publishedDate} · ${readingNews.source}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs sm:text-sm">
            {(readingNews.mediaUrl || readingNews.imageUrl) && (
              <div className="rounded-xl overflow-hidden max-h-72 w-full bg-black">
                {isVideoUrl(readingNews.mediaUrl || readingNews.imageUrl, readingNews.mediaType) ? (
                  <video
                    src={readingNews.mediaUrl || readingNews.imageUrl}
                    controls
                    className="w-full max-h-72"
                  />
                ) : (
                  <img
                    src={readingNews.mediaUrl || readingNews.imageUrl}
                    alt={readingNews.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            )}
            <p className="font-semibold text-stone-900 dark:text-white leading-relaxed">
              {readingNews.summary}
            </p>
            <p className="text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-line">
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

      {/* 12. READER MODAL FOR HADITH */}
      {readingHadith && (
        <Modal
          isOpen={!!readingHadith}
          onClose={() => setReadingHadith(null)}
          title={`${readingHadith.collectionNameUz} · №${readingHadith.number}`}
          subtitle={`Roviy: ${readingHadith.narratorUz} · Darajasi: ${readingHadith.grade}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            {readingHadith.mediaUrl && (
              <div className="rounded-xl overflow-hidden max-h-64 w-full bg-black">
                {isVideoUrl(readingHadith.mediaUrl, readingHadith.mediaType) ? (
                  <video src={readingHadith.mediaUrl} controls className="w-full max-h-64" />
                ) : (
                  <img src={readingHadith.mediaUrl} alt="Hadis tasviri" className="w-full h-full object-cover" />
                )}
              </div>
            )}
            <p dir="rtl" className="font-arabic text-2xl text-stone-900 dark:text-amber-100 leading-loose text-right">
              {readingHadith.textAr}
            </p>
            <p className="text-sm text-stone-800 dark:text-stone-200 leading-relaxed">
              «{readingHadith.translationUz}»
            </p>
            <div className="pt-3 border-t border-stone-200 dark:border-emerald-950 flex justify-between items-center text-xs text-stone-400">
              <span>Manba: {readingHadith.reference}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleShare(readingHadith.collectionNameUz, readingHadith.translationUz)}
                className="text-xs"
              >
                <Share2 className="w-3.5 h-3.5 mr-1 text-[#c5a869]" />
                <span>{copied ? 'Nusxalandi!' : 'Ulashish'}</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 13. READER MODAL FOR DHIKR */}
      {readingDhikr && (
        <Modal
          isOpen={!!readingDhikr}
          onClose={() => setReadingDhikr(null)}
          title={readingDhikr.titleUz}
          subtitle={`${readingDhikr.categoryTitleUz} · ${readingDhikr.targetCount} marta`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            {readingDhikr.mediaUrl && (
              <div className="rounded-xl overflow-hidden max-h-64 w-full bg-black">
                {isVideoUrl(readingDhikr.mediaUrl, readingDhikr.mediaType) ? (
                  <video src={readingDhikr.mediaUrl} controls className="w-full max-h-64" />
                ) : (
                  <img src={readingDhikr.mediaUrl} alt={readingDhikr.titleUz} className="w-full h-full object-cover" />
                )}
              </div>
            )}
            <p dir="rtl" className="font-arabic text-2xl text-stone-900 dark:text-amber-100 leading-loose text-right">
              {readingDhikr.textAr}
            </p>
            {readingDhikr.transliterationUz && (
              <p className="text-xs text-[#c5a869] italic">{readingDhikr.transliterationUz}</p>
            )}
            <p className="text-sm text-stone-800 dark:text-stone-200 leading-relaxed">
              «{readingDhikr.translationUz}»
            </p>
            <div className="pt-3 border-t border-stone-200 dark:border-emerald-950 flex justify-between items-center text-xs text-stone-400">
              <span>Manba: {readingDhikr.source}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleShare(readingDhikr.titleUz, readingDhikr.translationUz)}
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
