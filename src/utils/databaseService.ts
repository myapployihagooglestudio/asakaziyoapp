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
  AnnouncementItem,
  NewsItem,
} from '../types';
import { INITIAL_ASAKA_PRAYER_SCHEDULE } from '../data/prayerTimesData';
import { EDITORIAL_ARTICLES } from '../data/articlesData';
import { AUTHENTIC_HADITHS } from '../data/hadithData';
import { AUTHENTIC_DHIKRS } from '../data/dhikrData';
import { COMMUNITY_ANNOUNCEMENTS, COMMUNITY_NEWS } from '../data/newsAndAnnouncementsData';
import { triggerBrowserNotification, AppNotification } from './notificationService';
import {
  syncDocToFirestore,
  deleteDocFromFirestore,
  fetchDocFromFirestore,
  fetchCollectionFromFirestore,
  auth,
  db,
} from './firebaseClient';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import {
  DailyIslamicBundle,
  getDailyBundleForDate,
  getDailyArchiveBundles,
} from '../data/dailyContentData';

// Storage Keys
const KEYS = {
  PRAYER: 'asaka_ziyo_db_prayer_v2',
  ARTICLES: 'asaka_ziyo_db_articles_v2',
  MEDIA_POSTS: 'asaka_ziyo_db_media_posts_v2',
  HADITHS: 'asaka_ziyo_db_hadiths_v2',
  DHIKRS: 'asaka_ziyo_db_dhikrs_v2',
  INQUIRIES: 'asaka_ziyo_db_inquiries_v2',
  DRAFTS: 'asaka_ziyo_db_drafts_v2',
  NOTIFICATIONS: 'asaka_ziyo_db_notifications_v2',
  ANNOUNCEMENTS: 'asaka_ziyo_db_announcements_v2',
  NEWS: 'asaka_ziyo_db_news_v2',
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
    commentsCount: 2,
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
  | 'DRAFTS_UPDATED'
  | 'NOTIFICATIONS_UPDATED'
  | 'ANNOUNCEMENTS_UPDATED'
  | 'NEWS_UPDATED';

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
      if (e.key === KEYS.PRAYER) broadcastEvent('PRAYER_UPDATED');
      if (e.key === KEYS.ARTICLES) broadcastEvent('ARTICLES_UPDATED');
      if (e.key === KEYS.MEDIA_POSTS) broadcastEvent('POSTS_UPDATED');
      if (e.key === KEYS.HADITHS) broadcastEvent('HADITHS_UPDATED');
      if (e.key === KEYS.DHIKRS) broadcastEvent('DHIKRS_UPDATED');
      if (e.key === KEYS.INQUIRIES) broadcastEvent('INQUIRIES_UPDATED');
      if (e.key === KEYS.DRAFTS) broadcastEvent('DRAFTS_UPDATED');
      if (e.key === KEYS.NOTIFICATIONS) broadcastEvent('NOTIFICATIONS_UPDATED');
      if (e.key === KEYS.ANNOUNCEMENTS) broadcastEvent('ANNOUNCEMENTS_UPDATED');
      if (e.key === KEYS.NEWS) broadcastEvent('NEWS_UPDATED');
    }
  });
}

// --------------------------------------------------------------------------
// FIRESTORE & SERVER BIDIRECTIONAL SYNCHRONIZATION
// Firestore is the PRIMARY permanent cloud database.
let isSyncingFirestore = false;

export async function syncWithFirestore(): Promise<void> {
  if (typeof window === 'undefined' || isSyncingFirestore) return;
  isSyncingFirestore = true;
  try {
    // 1. Fetch Prayer Schedule from Firestore
    const schedule = await fetchDocFromFirestore<PrayerSchedule>('schedules', 'asaka-main');
    if (schedule && Array.isArray(schedule.times) && schedule.times.length >= 6) {
      const cur = localStorage.getItem(KEYS.PRAYER);
      const next = JSON.stringify(schedule);
      if (cur !== next) {
        localStorage.setItem(KEYS.PRAYER, next);
        localStorage.setItem('asaka_ziyo_prayer_schedule', next);
        broadcastEvent('PRAYER_UPDATED', schedule);
      }
    }

    // 2. Fetch Articles from Firestore
    const articles = await fetchCollectionFromFirestore<Article>('articles');
    if (articles && articles.length > 0) {
      const cur = localStorage.getItem(KEYS.ARTICLES);
      const next = JSON.stringify(articles);
      if (cur !== next) {
        localStorage.setItem(KEYS.ARTICLES, next);
        broadcastEvent('ARTICLES_UPDATED', articles);
      }
    }

    // 3. Fetch Media Posts from Firestore
    const media = await fetchCollectionFromFirestore<MediaPost>('mediaPosts');
    if (media && media.length > 0) {
      const cur = localStorage.getItem(KEYS.MEDIA_POSTS);
      const next = JSON.stringify(media);
      if (cur !== next) {
        localStorage.setItem(KEYS.MEDIA_POSTS, next);
        broadcastEvent('POSTS_UPDATED', media);
      }
    }

    // 4. Fetch Hadiths from Firestore
    const hadiths = await fetchCollectionFromFirestore<HadithItem>('hadiths');
    if (hadiths && hadiths.length > 0) {
      const cur = localStorage.getItem(KEYS.HADITHS);
      const next = JSON.stringify(hadiths);
      if (cur !== next) {
        localStorage.setItem(KEYS.HADITHS, next);
        broadcastEvent('HADITHS_UPDATED', hadiths);
      }
    }

    // 5. Fetch Dhikrs from Firestore
    const dhikrs = await fetchCollectionFromFirestore<DhikrItem>('dhikrs');
    if (dhikrs && dhikrs.length > 0) {
      const cur = localStorage.getItem(KEYS.DHIKRS);
      const next = JSON.stringify(dhikrs);
      if (cur !== next) {
        localStorage.setItem(KEYS.DHIKRS, next);
        broadcastEvent('DHIKRS_UPDATED', dhikrs);
      }
    }

    // 6. Fetch Inquiries from Firestore (if permitted)
    const inquiries = await fetchCollectionFromFirestore<SupportInquiry>('inquiries');
    if (inquiries && inquiries.length > 0) {
      const cur = localStorage.getItem(KEYS.INQUIRIES);
      const next = JSON.stringify(inquiries);
      if (cur !== next) {
        localStorage.setItem(KEYS.INQUIRIES, next);
        broadcastEvent('INQUIRIES_UPDATED', inquiries);
      }
    }
  } catch (err) {
    // Non-blocking offline fallback
    console.warn('Firestore primary sync resilient note:', err);
  } finally {
    isSyncingFirestore = false;
  }
}

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

      // 4. Sync Hadiths
      if (Array.isArray(data.hadiths) && data.hadiths.length > 0) {
        const cur = localStorage.getItem(KEYS.HADITHS);
        const next = JSON.stringify(data.hadiths);
        if (cur !== next) {
          localStorage.setItem(KEYS.HADITHS, next);
          broadcastEvent('HADITHS_UPDATED', data.hadiths);
        }
      }

      // 5. Sync Dhikrs
      if (Array.isArray(data.dhikrs) && data.dhikrs.length > 0) {
        const cur = localStorage.getItem(KEYS.DHIKRS);
        const next = JSON.stringify(data.dhikrs);
        if (cur !== next) {
          localStorage.setItem(KEYS.DHIKRS, next);
          broadcastEvent('DHIKRS_UPDATED', data.dhikrs);
        }
      }

      // 6. Sync Inquiries
      if (Array.isArray(data.inquiries)) {
        const cur = localStorage.getItem(KEYS.INQUIRIES);
        const next = JSON.stringify(data.inquiries);
        if (cur !== next) {
          localStorage.setItem(KEYS.INQUIRIES, next);
          broadcastEvent('INQUIRIES_UPDATED', data.inquiries);
        }
      }

      // 7. Sync Drafts
      if (Array.isArray(data.drafts)) {
        const cur = localStorage.getItem(KEYS.DRAFTS);
        const next = JSON.stringify(data.drafts);
        if (cur !== next) {
          localStorage.setItem(KEYS.DRAFTS, next);
          broadcastEvent('DRAFTS_UPDATED', data.drafts);
        }
      }

      // 8. Sync Notifications
      if (Array.isArray(data.notifications)) {
        const cur = localStorage.getItem(KEYS.NOTIFICATIONS);
        const next = JSON.stringify(data.notifications);
        if (cur !== next) {
          localStorage.setItem(KEYS.NOTIFICATIONS, next);
          broadcastEvent('NOTIFICATIONS_UPDATED', data.notifications);
        }
      }
    }
  } catch {
    // Server or network transient; offline localStorage acts as active layer
  }
}

// Auto-trigger sync on module load, on window focus, and periodic interval
if (typeof window !== 'undefined') {
  syncWithFirestore();
  syncWithServer();
  setInterval(() => {
    syncWithFirestore();
    syncWithServer();
  }, 60000);
  window.addEventListener('focus', () => {
    syncWithFirestore();
    syncWithServer();
  });
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

export async function saveStoredPrayerSchedule(
  schedule: PrayerSchedule,
  notifyUsers = true
): Promise<{ success: boolean; schedule: PrayerSchedule; error?: string }> {
  // 1. Primary write to Firestore Cloud
  const firestoreRes = await syncDocToFirestore('schedules', 'asaka-main', schedule);

  // If authenticated in Firebase and cloud write failed, do NOT falsely report success
  if (auth.currentUser && !firestoreRes.success) {
    return {
      success: false,
      schedule,
      error: `Firestore bazasiga yozish rad etildi: ${firestoreRes.error || 'Ruxsat berilmadi'}`,
    };
  }

  // 2. Update local cache
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(KEYS.PRAYER, JSON.stringify(schedule));
      localStorage.setItem('asaka_ziyo_prayer_schedule', JSON.stringify(schedule));
    }
  } catch (e) {
    console.error('Error saving prayer schedule to local storage:', e);
  }

  broadcastEvent('PRAYER_UPDATED', schedule);

  if (notifyUsers) {
    triggerBrowserNotification(
      'Asaka namoz vaqtlari yangilandi',
      `Asaka Jome Masjidi maʼmuriyati tomonidan ${schedule.formattedDateUz} uchun 8 namoz vaqtlari tasdiqlandi.`
    );
  }

  // 3. Mirror to server backend cache
  try {
    const res = await fetch('/api/database/prayer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedule }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: firestoreRes.success, schedule, error: json.error || 'Server keshiga yozishda xato' };
    }
    return { success: true, schedule: json.schedule || schedule };
  } catch (err: any) {
    return { success: firestoreRes.success, schedule, error: firestoreRes.success ? undefined : 'Oflayn rejimda saqlandi' };
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

export async function saveStoredArticle(article: Article): Promise<{ success: boolean; article: Article; error?: string }> {
  const articles = getStoredArticles();
  const index = articles.findIndex((a) => a.id === article.id);
  let updated: Article[];

  if (index >= 0) {
    updated = [...articles];
    updated[index] = article;
  } else {
    updated = [article, ...articles];
  }

  // Primary write to Firestore Cloud
  const firestoreRes = await syncDocToFirestore('articles', article.id, article);
  if (auth.currentUser && !firestoreRes.success) {
    return {
      success: false,
      article,
      error: `Firestore maqola saqlash rad etildi: ${firestoreRes.error || 'Ruxsat berilmadi'}`,
    };
  }

  try {
    localStorage.setItem(KEYS.ARTICLES, JSON.stringify(updated));
  } catch {
    // ignore
  }

  broadcastEvent('ARTICLES_UPDATED', updated);

  try {
    const res = await fetch('/api/database/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save', article }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: firestoreRes.success, article, error: json.error || 'Maqolani serverga yozishda eslatma' };
    }
    return { success: true, article };
  } catch {
    return { success: firestoreRes.success, article, error: firestoreRes.success ? undefined : 'Oflayn rejimda saqlandi' };
  }
}

export async function deleteStoredArticle(id: string): Promise<{ success: boolean; error?: string }> {
  const firestoreRes = await deleteDocFromFirestore('articles', id);
  if (auth.currentUser && !firestoreRes.success) {
    return {
      success: false,
      error: `Firestore maqola oʻchirish rad etildi: ${firestoreRes.error || 'Ruxsat berilmadi'}`,
    };
  }

  const articles = getStoredArticles().filter((a) => a.id !== id);
  try {
    localStorage.setItem(KEYS.ARTICLES, JSON.stringify(articles));
  } catch {
    // ignore
  }

  broadcastEvent('ARTICLES_UPDATED', articles);

  try {
    const res = await fetch('/api/database/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    });
    const json = await res.json();
    return { success: res.ok && json.success };
  } catch {
    return { success: true };
  }
}

export async function likeStoredArticle(id: string): Promise<void> {
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

  broadcastEvent('ARTICLES_UPDATED', updated);

  fetch('/api/database/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'like', id }),
  }).catch(() => {});
}

export async function rateStoredArticle(id: string, stars: number): Promise<void> {
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

  broadcastEvent('ARTICLES_UPDATED', updated);

  fetch('/api/database/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'rate', id, rating: stars }),
  }).catch(() => {});
}

export async function addArticleComment(
  articleId: string,
  comment: { authorName: string; text: string }
): Promise<void> {
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

  broadcastEvent('ARTICLES_UPDATED', updated);

  fetch('/api/database/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'comment', id: articleId, comment }),
  }).catch(() => {});
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

export async function saveStoredMediaPost(post: MediaPost): Promise<{ success: boolean; post: MediaPost; error?: string }> {
  const posts = getStoredMediaPosts();
  const index = posts.findIndex((p) => p.id === post.id);
  let updated: MediaPost[];

  if (index >= 0) {
    updated = [...posts];
    updated[index] = post;
  } else {
    updated = [post, ...posts];
  }

  // Primary write to Firestore Cloud
  const firestoreRes = await syncDocToFirestore('mediaPosts', post.id, post);
  if (auth.currentUser && !firestoreRes.success) {
    return {
      success: false,
      post,
      error: `Firestore media saqlash rad etildi: ${firestoreRes.error || 'Ruxsat berilmadi'}`,
    };
  }

  try {
    localStorage.setItem(KEYS.MEDIA_POSTS, JSON.stringify(updated));
  } catch {
    // ignore
  }

  broadcastEvent('POSTS_UPDATED', updated);

  try {
    const res = await fetch('/api/database/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save', post }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: firestoreRes.success, post, error: json.error || 'Server keshiga yozishda eslatma' };
    }
    return { success: true, post };
  } catch {
    return { success: firestoreRes.success, post, error: firestoreRes.success ? undefined : 'Oflayn rejimda saqlandi' };
  }
}

export async function deleteStoredMediaPost(id: string): Promise<{ success: boolean; error?: string }> {
  const firestoreRes = await deleteDocFromFirestore('mediaPosts', id);
  if (auth.currentUser && !firestoreRes.success) {
    return {
      success: false,
      error: `Firestore media oʻchirish rad etildi: ${firestoreRes.error || 'Ruxsat berilmadi'}`,
    };
  }

  const posts = getStoredMediaPosts().filter((p) => p.id !== id);
  try {
    localStorage.setItem(KEYS.MEDIA_POSTS, JSON.stringify(posts));
  } catch {
    // ignore
  }

  broadcastEvent('POSTS_UPDATED', posts);

  try {
    const res = await fetch('/api/database/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    });
    const json = await res.json();
    return { success: res.ok && json.success };
  } catch {
    return { success: true };
  }
}

export async function likeStoredMediaPost(id: string): Promise<void> {
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

  broadcastEvent('POSTS_UPDATED', updated);

  fetch('/api/database/media', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'like', id }),
  }).catch(() => {});
}

export async function addMediaPostComment(
  postId: string,
  comment: { authorName: string; text: string }
): Promise<void> {
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

  broadcastEvent('POSTS_UPDATED', updated);

  fetch('/api/database/media', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'comment', id: postId, comment }),
  }).catch(() => {});
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

export async function saveStoredHadith(hadith: HadithItem): Promise<{ success: boolean; hadith: HadithItem; error?: string }> {
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
  syncDocToFirestore('hadiths', hadith.id, hadith).catch(() => {});

  try {
    const res = await fetch('/api/database/hadiths', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save', hadith }),
    });
    const json = await res.json();
    return { success: res.ok && json.success, hadith };
  } catch {
    return { success: true, hadith, error: 'Oflayn rejimda saqlandi' };
  }
}

export async function deleteStoredHadith(id: string): Promise<{ success: boolean; error?: string }> {
  const hadiths = getStoredHadiths().filter((h) => h.id !== id);
  try {
    localStorage.setItem(KEYS.HADITHS, JSON.stringify(hadiths));
  } catch {
    // ignore
  }

  broadcastEvent('HADITHS_UPDATED', hadiths);
  deleteDocFromFirestore('hadiths', id).catch(() => {});

  try {
    const res = await fetch('/api/database/hadiths', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    });
    const json = await res.json();
    return { success: res.ok && json.success };
  } catch {
    return { success: true };
  }
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

export async function saveStoredDhikr(dhikr: DhikrItem): Promise<{ success: boolean; dhikr: DhikrItem; error?: string }> {
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
  syncDocToFirestore('dhikrs', dhikr.id, dhikr).catch(() => {});

  try {
    const res = await fetch('/api/database/dhikrs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save', dhikr }),
    });
    const json = await res.json();
    return { success: res.ok && json.success, dhikr };
  } catch {
    return { success: true, dhikr, error: 'Oflayn rejimda saqlandi' };
  }
}

export async function deleteStoredDhikr(id: string): Promise<{ success: boolean; error?: string }> {
  const dhikrs = getStoredDhikrs().filter((d) => d.id !== id);
  try {
    localStorage.setItem(KEYS.DHIKRS, JSON.stringify(dhikrs));
  } catch {
    // ignore
  }

  broadcastEvent('DHIKRS_UPDATED', dhikrs);
  deleteDocFromFirestore('dhikrs', id).catch(() => {});

  try {
    const res = await fetch('/api/database/dhikrs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    });
    const json = await res.json();
    return { success: res.ok && json.success };
  } catch {
    return { success: true };
  }
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

export async function submitUserInquiry(
  inquiry: Omit<SupportInquiry, 'id' | 'createdAt' | 'status'>
): Promise<SupportInquiry> {
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

  broadcastEvent('INQUIRIES_UPDATED', list);

  fetch('/api/database/inquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'submit', inquiry: newInquiry }),
  }).catch(() => {});

  return newInquiry;
}

export async function replyToInquiry(
  id: string,
  adminReply: string,
  adminName = 'Asaka Ziyo Maʼmuriyati'
): Promise<{ success: boolean; error?: string }> {
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

  broadcastEvent('INQUIRIES_UPDATED', list);

  try {
    const res = await fetch('/api/database/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reply', id, replyText: adminReply }),
    });
    const json = await res.json();
    return { success: res.ok && json.success };
  } catch {
    return { success: true };
  }
}

export async function deleteStoredInquiry(id: string): Promise<{ success: boolean; error?: string }> {
  const list = getStoredInquiries().filter((i) => i.id !== id);
  try {
    localStorage.setItem(KEYS.INQUIRIES, JSON.stringify(list));
  } catch {
    // ignore
  }

  broadcastEvent('INQUIRIES_UPDATED', list);

  try {
    const res = await fetch('/api/database/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    });
    const json = await res.json();
    return { success: res.ok && json.success };
  } catch {
    return { success: true };
  }
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
    await saveStoredPrayerSchedule(updatedSchedule);
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
    await saveStoredArticle(newArt);
  } else if (target.targetSection === 'media') {
    const newPost: MediaPost = {
      id: `post-${Date.now()}`,
      title: target.title,
      type: 'reel',
      category: 'Ijtimoiy',
      author: target.sourceChannel,
      publishedDate: 'Bugun',
      mediaUrl: target.mediaUrl || 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=800&q=80',
      thumbnail: target.mediaUrl || 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=600&q=80',
      caption: target.content,
      likesCount: 10,
      commentsCount: 0,
      isPublished: true,
      comments: [],
    };
    await saveStoredMediaPost(newPost);
  }

  // Push to server
  try {
    const res = await fetch('/api/database/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', id, reviewer }),
    });
    const json = await res.json();
    broadcastEvent('DRAFTS_UPDATED', drafts);
    return res.ok && json.success;
  } catch {
    broadcastEvent('DRAFTS_UPDATED', drafts);
    return true;
  }
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

  broadcastEvent('DRAFTS_UPDATED', drafts);

  try {
    const res = await fetch('/api/database/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', id, reviewer }),
    });
    const json = await res.json();
    return res.ok && json.success;
  } catch {
    return true;
  }
}

export async function deleteDraft(id: string): Promise<boolean> {
  const drafts = getStoredDrafts().filter((d) => d.id !== id);
  try {
    localStorage.setItem(KEYS.DRAFTS, JSON.stringify(drafts));
  } catch {
    // ignore
  }

  broadcastEvent('DRAFTS_UPDATED', drafts);

  try {
    const res = await fetch('/api/database/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    });
    const json = await res.json();
    return res.ok && json.success;
  } catch {
    return true;
  }
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

  broadcastEvent('DRAFTS_UPDATED', drafts);

  try {
    const res = await fetch('/api/database/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', draft: newDraft }),
    });
    const json = await res.json();
    return res.ok && json.success;
  } catch {
    return true;
  }
}

// --------------------------------------------------------------------------
// 7. BROADCAST NOTIFICATIONS PERSISTENCE
// --------------------------------------------------------------------------

export function getStoredBroadcastNotifications(): AppNotification[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(KEYS.NOTIFICATIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch {
    // ignore
  }
  return [];
}

export async function saveStoredNotification(
  notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>
): Promise<{ success: boolean; notification: AppNotification; error?: string }> {
  const newNotif: AppNotification = {
    ...notification,
    id: `notif-${Date.now()}`,
    timestamp: new Date().toLocaleDateString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
    read: false,
  };

  const list = [newNotif, ...getStoredBroadcastNotifications()];
  try {
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(list));
  } catch {
    // ignore
  }

  broadcastEvent('NOTIFICATIONS_UPDATED', list);

  try {
    const res = await fetch('/api/database/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save', notification: newNotif }),
    });
    const json = await res.json();
    return { success: res.ok && json.success, notification: newNotif };
  } catch {
    return { success: true, notification: newNotif };
  }
}

/**
 * Sync entire current local/server dataset directly to Firebase Firestore
 */
export async function syncAllToFirestore(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    let count = 0;
    const schedule = getStoredPrayerSchedule();
    await syncDocToFirestore('schedules', 'asaka-main', schedule);
    count++;

    const articles = getStoredArticles();
    for (const art of articles) {
      await syncDocToFirestore('articles', art.id, art);
      count++;
    }

    const media = getStoredMediaPosts();
    for (const m of media) {
      await syncDocToFirestore('mediaPosts', m.id, m);
      count++;
    }

    const hadiths = getStoredHadiths();
    for (const h of hadiths) {
      await syncDocToFirestore('hadiths', h.id, h);
      count++;
    }

    const dhikrs = getStoredDhikrs();
    for (const d of dhikrs) {
      await syncDocToFirestore('dhikrs', d.id, d);
      count++;
    }

    const inquiries = getStoredInquiries();
    for (const i of inquiries) {
      await syncDocToFirestore('inquiries', i.id, i);
      count++;
    }

    return { success: true, count };
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message || String(err) };
  }
}

// --------------------------------------------------------------------------
// 8. FIRESTORE DIAGNOSTIC UTILITY FUNCTION
// --------------------------------------------------------------------------

export interface FirestoreDiagnosticResult {
  status: 'PASS' | 'FAIL';
  latencyMs: number;
  operation: 'READ' | 'WRITE' | 'READ_WRITE';
  timestamp: string;
  details: string;
  authenticatedAs?: string | null;
  role?: string | null;
  documentId?: string;
  error?: string;
}

/**
 * Diagnostic utility function that attempts to read/write a test document to Firestore,
 * measures real round-trip latency in milliseconds, and returns full PASS/FAIL telemetry.
 */
export async function runFirestoreDiagnostics(): Promise<FirestoreDiagnosticResult> {
  const startTime = performance.now();
  const timestamp = new Date().toISOString();
  const testDocId = `diag-${Date.now()}`;
  const currentUser = auth.currentUser;

  try {
    if (currentUser) {
      // 1. Authenticated Admin: Real write then read test in _diagnostics collection
      const testData = {
        testId: testDocId,
        createdAt: timestamp,
        client: 'ASAKA ZIYO Admin Diagnostic Suite',
        authorUid: currentUser.uid,
        authorEmail: currentUser.email || 'admin@asaka.uz',
        purpose: 'Real-time Firestore latency & write integrity check',
        status: 'active_check',
      };

      const docRef = doc(db, '_diagnostics', testDocId);
      await setDoc(docRef, testData);

      // Read back to confirm data reached Google Cloud Firestore
      const snapshot = await getDoc(docRef);
      const latencyMs = Math.round(performance.now() - startTime);

      if (snapshot.exists()) {
        // Clean up test document
        try {
          await deleteDoc(docRef);
        } catch {
          // ignore cleanup errors
        }

        return {
          status: 'PASS',
          latencyMs,
          operation: 'READ_WRITE',
          timestamp,
          details: `Google Cloud Firestore bilan ikki tomonlama (yozish/oʻqish) aloqa ${latencyMs}ms tezlikda muvaffaqiyatli sinovdan oʻtdi. Hujjat ID: ${testDocId}.`,
          authenticatedAs: currentUser.email,
          documentId: testDocId,
        };
      } else {
        return {
          status: 'FAIL',
          latencyMs,
          operation: 'READ_WRITE',
          timestamp,
          details: 'Hujjat yozildi, biroq qayta oʻqishda topilmadi.',
          authenticatedAs: currentUser.email,
        };
      }
    } else {
      // 2. Unauthenticated: Test public read latency on schedules/asaka-main
      const schedRef = doc(db, 'schedules', 'asaka-main');
      const snapshot = await getDoc(schedRef);
      const latencyMs = Math.round(performance.now() - startTime);

      return {
        status: 'PASS',
        latencyMs,
        operation: 'READ',
        timestamp,
        details: `Firestore umumiy oʻqish soʻrovi ${latencyMs}ms tezlikda muvaffaqiyatli amalga oshirildi (${snapshot.exists() ? 'tasdiqlangan jadval mavjud' : 'baza tayyor'}). Yozish testini oʻtkazish uchun Google Admin orqali tizimga kiring.`,
        authenticatedAs: null,
      };
    }
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    const errorMsg = err?.message || String(err);
    return {
      status: 'FAIL',
      latencyMs,
      operation: currentUser ? 'READ_WRITE' : 'READ',
      timestamp,
      details: `Firestore ulanishida xatolik yuz berdi: ${errorMsg}`,
      authenticatedAs: currentUser?.email || null,
      error: errorMsg,
    };
  }
}

// --------------------------------------------------------------------------
// 9. NOTIFICATIONS MANAGEMENT HELPERS
// --------------------------------------------------------------------------

export function markAllNotificationsRead(): AppNotification[] {
  const current = getStoredBroadcastNotifications();
  const updated = current.map((n) => ({ ...n, read: true }));
  try {
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(updated));
  } catch {
    // ignore
  }
  broadcastEvent('NOTIFICATIONS_UPDATED', updated);
  return updated;
}

export function markNotificationRead(id: string): AppNotification[] {
  const current = getStoredBroadcastNotifications();
  const updated = current.map((n) => (n.id === id ? { ...n, read: true } : n));
  try {
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(updated));
  } catch {
    // ignore
  }
  broadcastEvent('NOTIFICATIONS_UPDATED', updated);
  return updated;
}

export function deleteNotification(id: string): AppNotification[] {
  const current = getStoredBroadcastNotifications();
  const updated = current.filter((n) => n.id !== id);
  try {
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(updated));
  } catch {
    // ignore
  }
  broadcastEvent('NOTIFICATIONS_UPDATED', updated);
  return updated;
}

// --------------------------------------------------------------------------
// 10. DAILY ISLAMIC BUNDLE HELPERS
// --------------------------------------------------------------------------

const DAILY_KEY = 'asaka_ziyo_daily_bundle_cache';

export function getActiveDailyBundle(dateStr?: string): DailyIslamicBundle {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const cached = localStorage.getItem(DAILY_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const todayStr = dateStr || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
        if (parsed && parsed.dateKey === todayStr) {
          return parsed;
        }
      }
    }
  } catch {
    // ignore
  }
  const fresh = getDailyBundleForDate(dateStr);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(DAILY_KEY, JSON.stringify(fresh));
    }
  } catch {
    // ignore
  }
  return fresh;
}

// --------------------------------------------------------------------------
// 11. ANNOUNCEMENTS & NEWS CMS METHODS
// --------------------------------------------------------------------------

export function getStoredAnnouncements(): AnnouncementItem[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(KEYS.ANNOUNCEMENTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch {}
  return COMMUNITY_ANNOUNCEMENTS;
}

export async function saveStoredAnnouncement(announcement: AnnouncementItem): Promise<{ success: boolean; error?: string }> {
  const list = getStoredAnnouncements();
  const idx = list.findIndex((a) => a.id === announcement.id);
  const updated = idx >= 0 ? list.map((a, i) => (i === idx ? announcement : a)) : [announcement, ...list];

  const firestoreRes = await syncDocToFirestore('announcements', announcement.id, announcement);
  if (auth.currentUser && !firestoreRes.success) {
    return { success: false, error: firestoreRes.error };
  }

  try {
    localStorage.setItem(KEYS.ANNOUNCEMENTS, JSON.stringify(updated));
  } catch {}
  broadcastEvent('ANNOUNCEMENTS_UPDATED', updated);
  return { success: true };
}

export async function deleteStoredAnnouncement(id: string): Promise<{ success: boolean; error?: string }> {
  const firestoreRes = await deleteDocFromFirestore('announcements', id);
  const list = getStoredAnnouncements().filter((a) => a.id !== id);
  try {
    localStorage.setItem(KEYS.ANNOUNCEMENTS, JSON.stringify(list));
  } catch {}
  broadcastEvent('ANNOUNCEMENTS_UPDATED', list);
  return { success: true };
}

export function getStoredNews(): NewsItem[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(KEYS.NEWS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch {}
  return COMMUNITY_NEWS;
}

export async function saveStoredNews(newsItem: NewsItem): Promise<{ success: boolean; error?: string }> {
  const list = getStoredNews();
  const idx = list.findIndex((n) => n.id === newsItem.id);
  const updated = idx >= 0 ? list.map((n, i) => (i === idx ? newsItem : n)) : [newsItem, ...list];

  const firestoreRes = await syncDocToFirestore('news', newsItem.id, newsItem);
  if (auth.currentUser && !firestoreRes.success) {
    return { success: false, error: firestoreRes.error };
  }

  try {
    localStorage.setItem(KEYS.NEWS, JSON.stringify(updated));
  } catch {}
  broadcastEvent('NEWS_UPDATED', updated);
  return { success: true };
}

export async function deleteStoredNews(id: string): Promise<{ success: boolean; error?: string }> {
  const firestoreRes = await deleteDocFromFirestore('news', id);
  const list = getStoredNews().filter((n) => n.id !== id);
  try {
    localStorage.setItem(KEYS.NEWS, JSON.stringify(list));
  } catch {}
  broadcastEvent('NEWS_UPDATED', list);
  return { success: true };
}

