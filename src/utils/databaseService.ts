/**
 * ASAKA ZIYO — Enterprise Real-time Database & Persistence Service
 * Multi-layer persistence: Persistent Server Backend API + File Storage (/data/asaka_ziyo_db.json)
 * + BroadcastChannel Cross-Tab Synchronization + LocalStorage Offline Cache.
 */

import {
  PrayerSchedule,
  Article,
  HadithItem,
  DhikrItem,
  MediaPost,
  CommentItem,
  SupportInquiry,
  TelegramDraftItem,
} from '../types';
import { INITIAL_ASAKA_PRAYER_SCHEDULE } from '../data/prayerTimesData';
import { EDITORIAL_ARTICLES } from '../data/articlesData';
import { AUTHENTIC_HADITHS } from '../data/hadithData';
import { AUTHENTIC_DHIKRS } from '../data/dhikrData';
import { triggerBrowserNotification } from './notificationService';

// Storage Keys
const KEYS = {
  PRAYER: 'asaka_ziyo_db_prayer_v2',
  ARTICLES: 'asaka_ziyo_db_articles_v2',
  MEDIA_POSTS: 'asaka_ziyo_db_media_posts_v2',
  HADITHS: 'asaka_ziyo_db_hadiths_v2',
  DHIKRS: 'asaka_ziyo_db_dhikrs_v2',
  INQUIRIES: 'asaka_ziyo_db_inquiries_v2',
  DRAFTS: 'asaka_ziyo_db_drafts_v2',
};

// Seed initial Media Posts & Reels for Asaka Ziyo
const INITIAL_MEDIA_POSTS: MediaPost[] = [
  {
    id: 'post-1',
    title: 'Asaka Jome Masjidi: Qalbni junbushga keltiruvchi xushovoz qiroat',
    type: 'reel',
    category: 'Qurʼon qiroati',
    author: 'Asaka Jome Masjidi Imomi',
    publishedDate: 'Bugun, 14:30',
    mediaUrl: 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=1200&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=600&q=80',
    caption: '«Qurʼon oʻqilganda unga jim turib quloq soling, shoyad rahm qilinsangiz». Asaka shahrida juma namozi oldidan oʻqilgan goʻzal tilovat.',
    likesCount: 142,
    commentsCount: 3,
    isPublished: true,
    comments: [
      {
        id: 'c-1',
        targetType: 'post',
        targetId: 'post-1',
        authorName: 'Muzaffarbek (Asaka)',
        text: 'MashaAlloh, juda chiroyli qiroat boʻlibdi. Alloh rozi boʻlsin!',
        createdAt: 'Bugun, 15:10',
        likesCount: 12,
      },
      {
        id: 'c-2',
        targetType: 'post',
        targetId: 'post-1',
        authorName: 'Hojiakbar',
        text: 'Asaka masjidimiz yanada obod boʻlsin, qorilarimiz koʻpaysin.',
        createdAt: 'Bugun, 15:45',
        likesCount: 8,
      },
    ],
  },
  {
    id: 'post-2',
    title: 'Tahajjud namozining fazilati va duolar qabul boʻladigan palla',
    type: 'video',
    category: 'Nasihat',
    author: 'Ustoz Maʼrufxon',
    publishedDate: 'Kecha',
    mediaUrl: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=1200&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=600&q=80',
    caption: 'Kechasi odamlar uxlaganda oʻqilgan ikki rakaat namoz dunyo va undagi barcha narsalardan yaxshiroqdir. Tahajjud vaqti Asaka jadvalida aks etdi.',
    likesCount: 98,
    commentsCount: 1,
    isPublished: true,
    comments: [
      {
        id: 'c-3',
        targetType: 'post',
        targetId: 'post-2',
        authorName: 'Dilshodbek',
        text: 'Tahajjud va Subh vaqtini ilovaga qoʻshganingiz juda ajoyib boʻlibdi!',
        createdAt: 'Kecha, 21:00',
        likesCount: 5,
      },
    ],
  },
  {
    id: 'post-3',
    title: 'Vodiy allomalari: Asakiy va Andijoniy ulamolar merosi haqida',
    type: 'image',
    category: 'Tarix',
    author: 'Tahririyat Hayʼati',
    publishedDate: '30-Oktabr',
    mediaUrl: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&w=1200&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&w=600&q=80',
    caption: 'Movarounnahr faqihlari va Fargʻona vodiysi ulamolari butun dunyo islom ilmiga ulkan hissa qoʻshganlar.',
    likesCount: 67,
    commentsCount: 0,
    isPublished: true,
    comments: [],
  },
];

// Seed initial Inquiries
const INITIAL_INQUIRIES: SupportInquiry[] = [
  {
    id: 'inq-1',
    userName: 'Otabek Mirzayev',
    userPhone: '+998 91 123 45 67',
    subject: 'Asaka namoz vaqtlari boʻyicha savol',
    message: 'Assalomu alaykum. Masjidimizda juma namozi iqomati soat nechada aytiladi? Yangi taqvim boʻyicha maʼlumot bersangiz.',
    createdAt: 'Bugun, 09:30',
    status: 'answered',
    adminReply: 'Va alaykum assalom. Juma namozi Asaka markaziy jome masjidida Peshin vaqti kirishi bilan boshlanadi. Maʼruza 12:20 da, farz namozi 12:45 da oʻqiladi.',
    repliedAt: 'Bugun, 10:15',
    repliedBy: 'Asaka Jome Masjidi Imom-xatibi',
  },
  {
    id: 'inq-2',
    userName: 'Sobirjon',
    subject: 'Qiroat darslari va tajvid toʻgaragi',
    message: 'Yoshlar uchun tajvid va Qurʼon qiroati darslari qaysi kunlari boʻladi?',
    createdAt: 'Kecha, 16:40',
    status: 'new',
  },
];

// Seed initial Telegram channel drafts
const INITIAL_DRAFTS: TelegramDraftItem[] = [
  {
    id: 'draft-1',
    sourceChannel: '@Asaka_Ziyo',
    targetSection: 'prayer',
    title: 'Haftalik Asaka namoz vaqtlari yangilanishi',
    content: 'Hurmatli namozxonlar, Asaka jome masjidi uchun yangi tasdiqlangan taqvim: Bomdod 05:22, Peshin 12:05, Asr 15:10, Shom 17:21, Xufton 18:42, Tahajjud 03:45, Subh 04:40.',
    prayerTimesDraft: {
      tahajjud: '03:45',
      subh: '04:40',
      bomdod: '05:22',
      quyosh: '06:46',
      peshin: '12:05',
      asr: '15:10',
      shom: '17:21',
      xufton: '18:42',
    },
    receivedAt: 'Bugun, 08:30',
    status: 'pending',
  },
  {
    id: 'draft-2',
    sourceChannel: '@muhiddinsahhofuz',
    targetSection: 'articles',
    title: 'Ilm va odob: Ustoz Muhiddin Sahhof maʼruzalari asosida',
    content: 'Ilm talab qilish har bir musulmon erkak va ayolga farzdir. Ammo ilmdan oldin odob oʻrganilishi lozim. Abu Hanifa rahmatullohi alayh oʻz shogirdlariga avvalo goʻzal xulqni oʻrgatganlar...',
    mediaUrl: 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=1200&q=80',
    receivedAt: 'Bugun, 09:15',
    status: 'pending',
  },
];

// Broadcast channel setup
export type DBEventType =
  | 'PRAYER_UPDATED'
  | 'ARTICLES_UPDATED'
  | 'POSTS_UPDATED'
  | 'HADITHS_UPDATED'
  | 'DHIKRS_UPDATED'
  | 'INQUIRIES_UPDATED'
  | 'DRAFTS_UPDATED';

export interface DBMessage {
  type: DBEventType;
  payload?: unknown;
  timestamp: number;
}

let channel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    channel = new BroadcastChannel('asaka_ziyo_db_bus');
  }
} catch {
  channel = null;
}

const listeners = new Set<(event: DBMessage) => void>();

export function subscribeToDatabase(callback: (event: DBMessage) => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function broadcastEvent(type: DBEventType, payload?: unknown) {
  const message: DBMessage = { type, payload, timestamp: Date.now() };

  // Dispatch to local subscribers
  listeners.forEach((cb) => {
    try {
      cb(message);
    } catch (e) {
      console.warn('DB subscriber error:', e);
    }
  });

  // Cross-tab broadcast
  if (channel) {
    try {
      channel.postMessage(message);
    } catch {
      // ignore
    }
  }

  // Cross-tab storage fallback event
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('asaka:db-update', { detail: message })
      );
    }
  } catch {
    // ignore
  }
}

// Global listener for incoming channel messages
if (typeof window !== 'undefined') {
  if (channel) {
    channel.onmessage = (evt) => {
      if (evt.data && evt.data.type) {
        listeners.forEach((cb) => {
          try {
            cb(evt.data);
          } catch {
            // ignore
          }
        });
      }
    };
  }

  window.addEventListener('storage', (e) => {
    if (e.key && Object.values(KEYS).includes(e.key)) {
      broadcastEvent('PRAYER_UPDATED');
    }
  });
}

// --------------------------------------------------------------------------
// SERVER BIDIRECTIONAL SYNCHRONIZATION
// --------------------------------------------------------------------------
export async function syncWithServer(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const res = await fetch('/api/database');
    if (!res.ok) return;
    const json = await res.json();
    if (json.success && json.data) {
      const data = json.data;

      // 1. Sync Prayer Schedule
      if (data.prayerSchedule && Array.isArray(data.prayerSchedule.times)) {
        const cur = localStorage.getItem(KEYS.PRAYER);
        const next = JSON.stringify(data.prayerSchedule);
        if (cur !== next) {
          localStorage.setItem(KEYS.PRAYER, next);
          localStorage.setItem('asaka_ziyo_prayer_schedule', next);
          broadcastEvent('PRAYER_UPDATED', data.prayerSchedule);
        }
      }

      // 2. Sync Articles
      if (Array.isArray(data.articles)) {
        const cur = localStorage.getItem(KEYS.ARTICLES);
        const next = JSON.stringify(data.articles);
        if (cur !== next) {
          localStorage.setItem(KEYS.ARTICLES, next);
          broadcastEvent('ARTICLES_UPDATED', data.articles);
        }
      }

      // 3. Sync Media Posts
      if (Array.isArray(data.mediaPosts)) {
        const cur = localStorage.getItem(KEYS.MEDIA_POSTS);
        const next = JSON.stringify(data.mediaPosts);
        if (cur !== next) {
          localStorage.setItem(KEYS.MEDIA_POSTS, next);
          broadcastEvent('POSTS_UPDATED', data.mediaPosts);
        }
      }

      // 4. Sync Inquiries
      if (Array.isArray(data.inquiries)) {
        const cur = localStorage.getItem(KEYS.INQUIRIES);
        const next = JSON.stringify(data.inquiries);
        if (cur !== next) {
          localStorage.setItem(KEYS.INQUIRIES, next);
          broadcastEvent('INQUIRIES_UPDATED', data.inquiries);
        }
      }

      // 5. Sync Drafts
      if (Array.isArray(data.drafts)) {
        const cur = localStorage.getItem(KEYS.DRAFTS);
        const next = JSON.stringify(data.drafts);
        if (cur !== next) {
          localStorage.setItem(KEYS.DRAFTS, next);
          broadcastEvent('DRAFTS_UPDATED', data.drafts);
        }
      }
    }
  } catch {
    // Server or network transient; offline localStorage acts as active layer
  }
}

// Auto-trigger sync on module load and every 8 seconds
if (typeof window !== 'undefined') {
  syncWithServer();
  setInterval(syncWithServer, 8000);
  window.addEventListener('focus', () => syncWithServer());
}

// --------------------------------------------------------------------------
// 1. PRAYER SCHEDULE METHODS
// --------------------------------------------------------------------------

export function getStoredPrayerSchedule(): PrayerSchedule {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(KEYS.PRAYER);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.times) && parsed.times.length >= 6) {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.warn('Error reading prayer schedule:', e);
  }
  return INITIAL_ASAKA_PRAYER_SCHEDULE;
}

export function saveStoredPrayerSchedule(
  schedule: PrayerSchedule,
  notifyUsers = true
): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(KEYS.PRAYER, JSON.stringify(schedule));
      localStorage.setItem('asaka_ziyo_prayer_schedule', JSON.stringify(schedule));
    }
  } catch (e) {
    console.error('Error saving prayer schedule to local storage:', e);
  }

  // Persist permanently on full-stack server
  fetch('/api/database/prayer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schedule }),
  }).catch((err) => console.warn('Server sync failed:', err));

  broadcastEvent('PRAYER_UPDATED', schedule);

  if (notifyUsers) {
    triggerBrowserNotification(
      'Asaka namoz vaqtlari yangilandi',
      `Asaka Jome Masjidi maʼmuriyati tomonidan ${schedule.formattedDateUz} uchun 8 namoz vaqtlari tasdiqlandi.`
    );
  }
}

// --------------------------------------------------------------------------
// 2. ARTICLES CMS METHODS
// --------------------------------------------------------------------------

export function getStoredArticles(): Article[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(KEYS.ARTICLES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch {
    // ignore
  }

  // Seed with default articles enriched with initial likes/ratings
  const seeded = EDITORIAL_ARTICLES.map((art, idx) => ({
    ...art,
    likesCount: art.likesCount ?? (idx === 0 ? 84 : 45),
    rating: art.rating ?? 4.9,
    ratingsCount: art.ratingsCount ?? 28,
    comments: art.comments ?? [
      {
        id: `c-art-${art.id}-1`,
        targetType: 'article' as const,
        targetId: art.id,
        authorName: 'Ibrohim Asakiy',
        text: 'Juda foydali va teran maqola boʻlibdi. Maʼrifiy tushunchalar sodda tilda yetkazilgan.',
        createdAt: '1-Noyabr, 2026',
        likesCount: 14,
      },
    ],
  }));

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(KEYS.ARTICLES, JSON.stringify(seeded));
    }
  } catch {
    // ignore
  }
  return seeded;
}

export function saveStoredArticle(article: Article): void {
  const articles = getStoredArticles();
  const index = articles.findIndex((a) => a.id === article.id);
  let updated: Article[];

  if (index >= 0) {
    updated = [...articles];
    updated[index] = article;
  } else {
    updated = [article, ...articles];
  }

  try {
    localStorage.setItem(KEYS.ARTICLES, JSON.stringify(updated));
  } catch {
    // ignore
  }

  // Persist permanently on server
  fetch('/api/database/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'save', article }),
  }).catch(() => {});

  broadcastEvent('ARTICLES_UPDATED', updated);
}

export function deleteStoredArticle(id: string): void {
  const articles = getStoredArticles().filter((a) => a.id !== id);
  try {
    localStorage.setItem(KEYS.ARTICLES, JSON.stringify(articles));
  } catch {
    // ignore
  }

  fetch('/api/database/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', id }),
  }).catch(() => {});

  broadcastEvent('ARTICLES_UPDATED', articles);
}

export function likeStoredArticle(id: string): void {
  const articles = getStoredArticles();
  const updated = articles.map((art) => {
    if (art.id === id) {
      return { ...art, likesCount: (art.likesCount || 0) + 1 };
    }
    return art;
  });
  try {
    localStorage.setItem(KEYS.ARTICLES, JSON.stringify(updated));
  } catch {
    // ignore
  }

  fetch('/api/database/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'like', id }),
  }).catch(() => {});

  broadcastEvent('ARTICLES_UPDATED', updated);
}

export function rateStoredArticle(id: string, stars: number): void {
  const articles = getStoredArticles();
  const updated = articles.map((art) => {
    if (art.id === id) {
      const currentCount = art.ratingsCount || 0;
      const currentAvg = art.rating || 5;
      const newCount = currentCount + 1;
      const newAvg = Number(((currentAvg * currentCount + stars) / newCount).toFixed(1));
      return { ...art, rating: newAvg, ratingsCount: newCount };
    }
    return art;
  });
  try {
    localStorage.setItem(KEYS.ARTICLES, JSON.stringify(updated));
  } catch {
    // ignore
  }

  fetch('/api/database/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'rate', id, rating: stars }),
  }).catch(() => {});

  broadcastEvent('ARTICLES_UPDATED', updated);
}

export function addArticleComment(
  articleId: string,
  comment: { authorName: string; text: string }
): void {
  const articles = getStoredArticles();
  const updated = articles.map((art) => {
    if (art.id === articleId) {
      const newComment: CommentItem = {
        id: `c-art-${Date.now()}`,
        targetType: 'article',
        targetId: articleId,
        authorName: comment.authorName || 'Foydalanuvchi',
        text: comment.text,
        createdAt: 'Hozirgina',
        likesCount: 0,
      };
      return {
        ...art,
        comments: [...(art.comments || []), newComment],
      };
    }
    return art;
  });

  try {
    localStorage.setItem(KEYS.ARTICLES, JSON.stringify(updated));
  } catch {
    // ignore
  }

  fetch('/api/database/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'comment', id: articleId, comment }),
  }).catch(() => {});

  broadcastEvent('ARTICLES_UPDATED', updated);
}

// --------------------------------------------------------------------------
// 3. MEDIA & REELS CMS METHODS
// --------------------------------------------------------------------------

export function getStoredMediaPosts(): MediaPost[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(KEYS.MEDIA_POSTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch {
    // ignore
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(KEYS.MEDIA_POSTS, JSON.stringify(INITIAL_MEDIA_POSTS));
    }
  } catch {
    // ignore
  }
  return INITIAL_MEDIA_POSTS;
}

export function saveStoredMediaPost(post: MediaPost): void {
  const posts = getStoredMediaPosts();
  const index = posts.findIndex((p) => p.id === post.id);
  let updated: MediaPost[];

  if (index >= 0) {
    updated = [...posts];
    updated[index] = post;
  } else {
    updated = [post, ...posts];
  }

  try {
    localStorage.setItem(KEYS.MEDIA_POSTS, JSON.stringify(updated));
  } catch {
    // ignore
  }

  fetch('/api/database/media', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'save', post }),
  }).catch(() => {});

  broadcastEvent('POSTS_UPDATED', updated);
}

export function deleteStoredMediaPost(id: string): void {
  const posts = getStoredMediaPosts().filter((p) => p.id !== id);
  try {
    localStorage.setItem(KEYS.MEDIA_POSTS, JSON.stringify(posts));
  } catch {
    // ignore
  }

  fetch('/api/database/media', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', id }),
  }).catch(() => {});

  broadcastEvent('POSTS_UPDATED', posts);
}

export function likeStoredMediaPost(id: string): void {
  const posts = getStoredMediaPosts();
  const updated = posts.map((p) => {
    if (p.id === id) {
      return { ...p, likesCount: p.likesCount + 1 };
    }
    return p;
  });
  try {
    localStorage.setItem(KEYS.MEDIA_POSTS, JSON.stringify(updated));
  } catch {
    // ignore
  }

  fetch('/api/database/media', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'like', id }),
  }).catch(() => {});

  broadcastEvent('POSTS_UPDATED', updated);
}

export function addMediaPostComment(
  postId: string,
  comment: { authorName: string; text: string }
): void {
  const posts = getStoredMediaPosts();
  const updated = posts.map((p) => {
    if (p.id === postId) {
      const newComment: CommentItem = {
        id: `c-post-${Date.now()}`,
        targetType: 'post',
        targetId: postId,
        authorName: comment.authorName || 'Foydalanuvchi',
        text: comment.text,
        createdAt: 'Hozirgina',
        likesCount: 0,
      };
      return {
        ...p,
        commentsCount: p.commentsCount + 1,
        comments: [newComment, ...(p.comments || [])],
      };
    }
    return p;
  });

  try {
    localStorage.setItem(KEYS.MEDIA_POSTS, JSON.stringify(updated));
  } catch {
    // ignore
  }

  fetch('/api/database/media', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'comment', id: postId, comment }),
  }).catch(() => {});

  broadcastEvent('POSTS_UPDATED', updated);
}

// --------------------------------------------------------------------------
// 4. HADITHS & DHIKRS CMS METHODS
// --------------------------------------------------------------------------

export function getStoredHadiths(): HadithItem[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(KEYS.HADITHS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch {
    // ignore
  }
  return AUTHENTIC_HADITHS;
}

export function saveStoredHadith(hadith: HadithItem): void {
  const hadiths = getStoredHadiths();
  const index = hadiths.findIndex((h) => h.id === hadith.id);
  const updated = index >= 0 ? [...hadiths] : [hadith, ...hadiths];
  if (index >= 0) updated[index] = hadith;

  try {
    localStorage.setItem(KEYS.HADITHS, JSON.stringify(updated));
  } catch {
    // ignore
  }
  broadcastEvent('HADITHS_UPDATED', updated);
}

export function deleteStoredHadith(id: string): void {
  const hadiths = getStoredHadiths().filter((h) => h.id !== id);
  try {
    localStorage.setItem(KEYS.HADITHS, JSON.stringify(hadiths));
  } catch {
    // ignore
  }
  broadcastEvent('HADITHS_UPDATED', hadiths);
}

export function getStoredDhikrs(): DhikrItem[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(KEYS.DHIKRS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch {
    // ignore
  }
  return AUTHENTIC_DHIKRS;
}

export function saveStoredDhikr(dhikr: DhikrItem): void {
  const dhikrs = getStoredDhikrs();
  const index = dhikrs.findIndex((d) => d.id === dhikr.id);
  const updated = index >= 0 ? [...dhikrs] : [dhikr, ...dhikrs];
  if (index >= 0) updated[index] = dhikr;

  try {
    localStorage.setItem(KEYS.DHIKRS, JSON.stringify(updated));
  } catch {
    // ignore
  }
  broadcastEvent('DHIKRS_UPDATED', updated);
}

export function deleteStoredDhikr(id: string): void {
  const dhikrs = getStoredDhikrs().filter((d) => d.id !== id);
  try {
    localStorage.setItem(KEYS.DHIKRS, JSON.stringify(dhikrs));
  } catch {
    // ignore
  }
  broadcastEvent('DHIKRS_UPDATED', dhikrs);
}

// --------------------------------------------------------------------------
// 5. SUPPORT INQUIRIES & CHAT (Admin <-> User)
// --------------------------------------------------------------------------

export function getStoredInquiries(): SupportInquiry[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(KEYS.INQUIRIES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {
    // ignore
  }
  return INITIAL_INQUIRIES;
}

export function submitUserInquiry(
  inquiry: Omit<SupportInquiry, 'id' | 'createdAt' | 'status'>
): SupportInquiry {
  const now = new Date();
  const formattedTime = `Bugun, ${now.getHours().toString().padStart(2, '0')}:${now
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;

  const newInquiry: SupportInquiry = {
    ...inquiry,
    id: `inq-${Date.now()}`,
    createdAt: formattedTime,
    status: 'new',
  };

  const list = [newInquiry, ...getStoredInquiries()];
  try {
    localStorage.setItem(KEYS.INQUIRIES, JSON.stringify(list));
  } catch {
    // ignore
  }

  fetch('/api/database/inquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'submit', inquiry: newInquiry }),
  }).catch(() => {});

  broadcastEvent('INQUIRIES_UPDATED', list);
  return newInquiry;
}

export function replyToInquiry(
  id: string,
  adminReply: string,
  adminName = 'Asaka Ziyo Maʼmuriyati'
): void {
  const now = new Date();
  const formattedTime = `Bugun, ${now.getHours().toString().padStart(2, '0')}:${now
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;

  const list = getStoredInquiries().map((inq) => {
    if (inq.id === id) {
      return {
        ...inq,
        status: 'answered' as const,
        adminReply,
        repliedAt: formattedTime,
        repliedBy: adminName,
      };
    }
    return inq;
  });

  try {
    localStorage.setItem(KEYS.INQUIRIES, JSON.stringify(list));
  } catch {
    // ignore
  }

  fetch('/api/database/inquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'reply', id, replyText: adminReply }),
  }).catch(() => {});

  broadcastEvent('INQUIRIES_UPDATED', list);
}

export function deleteStoredInquiry(id: string): void {
  const list = getStoredInquiries().filter((i) => i.id !== id);
  try {
    localStorage.setItem(KEYS.INQUIRIES, JSON.stringify(list));
  } catch {
    // ignore
  }

  fetch('/api/database/inquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', id }),
  }).catch(() => {});

  broadcastEvent('INQUIRIES_UPDATED', list);
}

// --------------------------------------------------------------------------
// 6. TELEGRAM DRAFTS & MODERATION (Telegram -> Admin Approval -> Live App)
// --------------------------------------------------------------------------

export function getStoredDrafts(): TelegramDraftItem[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(KEYS.DRAFTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {
    // ignore
  }
  return INITIAL_DRAFTS;
}

export async function approveDraft(id: string, reviewer = 'Bosh Administrator'): Promise<boolean> {
  const drafts = getStoredDrafts();
  const target = drafts.find((d) => d.id === id);
  if (!target) return false;

  const nowFormatted = new Date().toISOString().replace('T', ' ').slice(0, 16);
  target.status = 'approved';
  target.reviewedBy = reviewer;
  target.reviewedAt = nowFormatted;

  try {
    localStorage.setItem(KEYS.DRAFTS, JSON.stringify(drafts));
  } catch {
    // ignore
  }

  // If draft is for prayer times, update live schedule
  if (target.targetSection === 'prayer' && target.prayerTimesDraft) {
    const curSchedule = getStoredPrayerSchedule();
    const updatedTimes = curSchedule.times.map((item) => {
      const draftVal = target.prayerTimesDraft?.[item.key as keyof typeof target.prayerTimesDraft];
      if (draftVal) {
        return { ...item, time: draftVal };
      }
      return item;
    });
    const updatedSchedule: PrayerSchedule = {
      ...curSchedule,
      times: updatedTimes,
      isAdministratorPublished: true,
      publishedBy: `${target.sourceChannel} orqali tasdiqlandi`,
      verifiedAt: nowFormatted,
    };
    saveStoredPrayerSchedule(updatedSchedule);
  } else if (target.targetSection === 'articles') {
    const newArt: Article = {
      id: `art-${Date.now()}`,
      title: target.title,
      subtitle: `${target.sourceChannel} rasmiy kanalidan tasdiqlangan nashr`,
      category: 'Axloq',
      author: target.sourceChannel === '@muhiddinsahhofuz' ? 'Ustoz Muhiddin Sahhof' : 'Asaka Jome Masjidi Imomi',
      authorRole: 'Rasmiy kanal tahririyati',
      publishedDate: 'Bugun',
      readTimeMinutes: 4,
      featuredImage: target.mediaUrl || '/images/quran_illumination_art_1793634658336.jpg',
      isFeatured: true,
      likesCount: 15,
      ratingsCount: 3,
      rating: 5.0,
      excerpt: target.content.slice(0, 160) + '...',
      keyQuote: '«Ilm va odob har bir moʻmin uchun fazilatdir».',
      bodyParagraphs: [target.content],
      comments: [],
    };
    saveStoredArticle(newArt);
  } else if (target.targetSection === 'media') {
    const newPost: MediaPost = {
      id: `reel-${Date.now()}`,
      title: target.title,
      type: 'image',
      category: 'Ijtimoiy',
      author: target.sourceChannel,
      publishedDate: 'Bugun',
      mediaUrl: target.mediaUrl || 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=800&q=80',
      caption: target.content,
      likesCount: 10,
      commentsCount: 0,
      isPublished: true,
      comments: [],
    };
    saveStoredMediaPost(newPost);
  }

  // Push to server
  fetch('/api/database/drafts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'approve', id, reviewer }),
  }).catch(() => {});

  broadcastEvent('DRAFTS_UPDATED', drafts);
  return true;
}

export async function rejectDraft(id: string, reviewer = 'Bosh Administrator'): Promise<boolean> {
  const drafts = getStoredDrafts().map((d) => {
    if (d.id === id) {
      return {
        ...d,
        status: 'rejected' as const,
        reviewedBy: reviewer,
        reviewedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      };
    }
    return d;
  });

  try {
    localStorage.setItem(KEYS.DRAFTS, JSON.stringify(drafts));
  } catch {
    // ignore
  }

  fetch('/api/database/drafts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'reject', id, reviewer }),
  }).catch(() => {});

  broadcastEvent('DRAFTS_UPDATED', drafts);
  return true;
}

export async function deleteDraft(id: string): Promise<boolean> {
  const drafts = getStoredDrafts().filter((d) => d.id !== id);
  try {
    localStorage.setItem(KEYS.DRAFTS, JSON.stringify(drafts));
  } catch {
    // ignore
  }

  fetch('/api/database/drafts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', id }),
  }).catch(() => {});

  broadcastEvent('DRAFTS_UPDATED', drafts);
  return true;
}

export async function createDraft(draft: Partial<TelegramDraftItem>): Promise<boolean> {
  const newDraft: TelegramDraftItem = {
    id: `draft-${Date.now()}`,
    sourceChannel: draft.sourceChannel || '@Asaka_Ziyo',
    targetSection: draft.targetSection || 'prayer',
    title: draft.title || 'Kanal xabari',
    content: draft.content || '',
    prayerTimesDraft: draft.prayerTimesDraft,
    mediaUrl: draft.mediaUrl,
    receivedAt: 'Bugun, ' + new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
    status: 'pending',
  };

  const drafts = [newDraft, ...getStoredDrafts()];
  try {
    localStorage.setItem(KEYS.DRAFTS, JSON.stringify(drafts));
  } catch {
    // ignore
  }

  fetch('/api/database/drafts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'create', draft: newDraft }),
  }).catch(() => {});

  broadcastEvent('DRAFTS_UPDATED', drafts);
  return true;
}
