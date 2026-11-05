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
  PublishMode,
} from '../types';
import { INITIAL_ASAKA_PRAYER_SCHEDULE } from '../data/prayerTimesData';
import { triggerBrowserNotification, AppNotification } from './notificationService';
import {
  syncDocToFirestore,
  deleteDocFromFirestore,
  fetchDocFromFirestore,
  fetchCollectionFromFirestore,
  auth,
  db,
  isAdminAuthenticated,
  getActiveAdminSession,
  getActiveAdminToken,
} from './firebaseClient';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import {
  DailyIslamicBundle,
  getDailyBundleForDate,
} from '../data/dailyContentData';

// Storage Keys (v5_admin: strictly admin-approved Firestore records only, zero sample/demo data)
const KEYS = {
  PRAYER: 'asaka_ziyo_db_prayer_v5_admin',
  ARTICLES: 'asaka_ziyo_db_articles_v5_admin',
  MEDIA_POSTS: 'asaka_ziyo_db_media_posts_v5_admin',
  HADITHS: 'asaka_ziyo_db_hadiths_v5_admin',
  DHIKRS: 'asaka_ziyo_db_dhikrs_v5_admin',
  INQUIRIES: 'asaka_ziyo_db_inquiries_v5_admin',
  DRAFTS: 'asaka_ziyo_db_drafts_v5_admin',
  NOTIFICATIONS: 'asaka_ziyo_db_notifications_v5_admin',
  ANNOUNCEMENTS: 'asaka_ziyo_db_announcements_v5_admin',
  NEWS: 'asaka_ziyo_db_news_v5_admin',
};

// Purge legacy v1..v4 sample caches so only admin-approved data is ever shown
if (typeof window !== 'undefined' && window.localStorage) {
  const legacyPrefixes = [
    'asaka_ziyo_db_prayer_v2',
    'asaka_ziyo_db_articles_v2',
    'asaka_ziyo_db_media_posts_v2',
    'asaka_ziyo_db_hadiths_v2',
    'asaka_ziyo_db_dhikrs_v2',
    'asaka_ziyo_db_inquiries_v2',
    'asaka_ziyo_db_drafts_v2',
    'asaka_ziyo_db_notifications_v2',
    'asaka_ziyo_db_announcements_v2',
    'asaka_ziyo_db_news_v2',
  ];
  for (const k of legacyPrefixes) {
    try {
      window.localStorage.removeItem(k);
    } catch {
      // ignore
    }
  }
}

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
// RECOVERABLE DATA SNAPSHOTS (Pre-Sync & Pre-Migration Protection)
// --------------------------------------------------------------------------
export interface DataSnapshot {
  id: string;
  timestamp: string;
  reason: string;
  data: {
    prayerSchedule?: PrayerSchedule;
    articles?: Article[];
    mediaPosts?: MediaPost[];
    hadiths?: HadithItem[];
    dhikrs?: DhikrItem[];
    news?: NewsItem[];
    announcements?: AnnouncementItem[];
    inquiries?: SupportInquiry[];
  };
}

export function createDataSnapshot(reason = 'Avtomatik xavfsizlik zaxirasi'): DataSnapshot {
  const snapshot: DataSnapshot = {
    id: `snap-${Date.now()}`,
    timestamp: new Date().toISOString(),
    reason,
    data: {
      prayerSchedule: getStoredPrayerSchedule(),
      articles: getStoredArticles(),
      mediaPosts: getStoredMediaPosts(),
      hadiths: getStoredHadiths(),
      dhikrs: getStoredDhikrs(),
      news: getStoredNews(),
      announcements: getStoredAnnouncements(),
      inquiries: getStoredInquiries(),
    },
  };
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('asaka_ziyo_snapshot_latest', JSON.stringify(snapshot));
      const historyStr = localStorage.getItem('asaka_ziyo_snapshot_history');
      const history: DataSnapshot[] = historyStr ? JSON.parse(historyStr) : [];
      history.unshift(snapshot);
      // Keep last 5 snapshots for instant rollback
      localStorage.setItem('asaka_ziyo_snapshot_history', JSON.stringify(history.slice(0, 5)));
    }
  } catch {
    // Non-blocking
  }
  return snapshot;
}

export function getLatestDataSnapshot(): DataSnapshot | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('asaka_ziyo_snapshot_latest');
      if (saved) return JSON.parse(saved);
    }
  } catch {
    // fallback
  }
  return null;
}

// Smart non-destructive merger by ID and timestamp
export function mergeCollections<T extends { id: string; updatedAt?: string; isArchived?: boolean }>(
  localList: T[],
  remoteList: T[]
): T[] {
  if (!remoteList || !Array.isArray(remoteList) || remoteList.length === 0) return localList;
  const map = new Map<string, T>();
  // 1. Add all local items first
  for (const item of localList) {
    if (item && item.id) {
      map.set(item.id, item);
    }
  }
  // 2. Merge remote items: if remote has updatedAt >= local, remote takes precedence
  for (const remote of remoteList) {
    if (!remote || !remote.id) continue;
    const local = map.get(remote.id);
    if (!local) {
      map.set(remote.id, remote);
    } else {
      const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
      const remoteTime = remote.updatedAt ? new Date(remote.updatedAt).getTime() : 0;
      if (remoteTime >= localTime || !local.updatedAt) {
        map.set(remote.id, { ...local, ...remote });
      }
    }
  }
  return Array.from(map.values());
}

// --------------------------------------------------------------------------
// FIRESTORE SINGLE SOURCE OF TRUTH SYNCHRONIZATION
// Firestore is the SINGLE AUTHORITATIVE PRIMARY DATABASE.
// LocalStorage is strictly a read-through cache of Firestore, never a competing database.
let isSyncingFirestore = false;
let lastSyncTimestamp = 0;

function sortFirestoreDocs<T extends { id: string; updatedAt?: string; syncedAt?: string; createdAt?: string }>(
  docs: T[]
): T[] {
  return [...docs].sort((a, b) => {
    const timeA = Date.parse(a.updatedAt || (a as any).syncedAt || a.createdAt || '') || 0;
    const timeB = Date.parse(b.updatedAt || (b as any).syncedAt || b.createdAt || '') || 0;
    if (timeB !== timeA) return timeB - timeA;
    return String(b.id).localeCompare(String(a.id));
  });
}

function safeSetLocalCache(key: string, value: unknown) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // ignore quota or SSR errors
  }
}

export async function syncWithFirestore(force = false): Promise<void> {
  if (isSyncingFirestore) return;
  const now = Date.now();
  if (!force && now - lastSyncTimestamp < 2500) return; // Short 2.5s cooldown unless forced
  isSyncingFirestore = true;

  try {
    // Take safety snapshot before remote sync
    createDataSnapshot('Firestore sinxronlashdan oldingi zaxira');

    // 1. Fetch Prayer Schedule directly from Firestore (Authoritative Single Source of Truth)
    const scheduleRes = await fetchDocFromFirestore<PrayerSchedule>('schedules', 'asaka-main');
    if (
      scheduleRes.success &&
      scheduleRes.exists &&
      scheduleRes.data &&
      Array.isArray(scheduleRes.data.times) &&
      scheduleRes.data.times.length >= 6
    ) {
      safeSetLocalCache(KEYS.PRAYER, scheduleRes.data);
      safeSetLocalCache('asaka_ziyo_prayer_schedule', scheduleRes.data);
      broadcastEvent('PRAYER_UPDATED', scheduleRes.data);
    }

    // 2. Fetch Articles directly from Firestore (Authoritative — no competing localStorage merge)
    const remoteArticlesRes = await fetchCollectionFromFirestore<Article>('articles');
    if (remoteArticlesRes.success) {
      const authoritativeArticles = sortFirestoreDocs(remoteArticlesRes.data);
      safeSetLocalCache(KEYS.ARTICLES, authoritativeArticles);
      broadcastEvent('ARTICLES_UPDATED', authoritativeArticles);
    }

    // 3. Fetch Media Posts directly from Firestore
    const remoteMediaRes = await fetchCollectionFromFirestore<MediaPost>('mediaPosts');
    if (remoteMediaRes.success) {
      const authoritativeMedia = sortFirestoreDocs(remoteMediaRes.data);
      safeSetLocalCache(KEYS.MEDIA_POSTS, authoritativeMedia);
      broadcastEvent('POSTS_UPDATED', authoritativeMedia);
    }

    // 4. Fetch Hadiths directly from Firestore
    const remoteHadithsRes = await fetchCollectionFromFirestore<HadithItem>('hadiths');
    if (remoteHadithsRes.success) {
      const authoritativeHadiths = sortFirestoreDocs(remoteHadithsRes.data);
      safeSetLocalCache(KEYS.HADITHS, authoritativeHadiths);
      broadcastEvent('HADITHS_UPDATED', authoritativeHadiths);
    }

    // 5. Fetch Dhikrs directly from Firestore
    const remoteDhikrsRes = await fetchCollectionFromFirestore<DhikrItem>('dhikrs');
    if (remoteDhikrsRes.success) {
      const authoritativeDhikrs = sortFirestoreDocs(remoteDhikrsRes.data);
      safeSetLocalCache(KEYS.DHIKRS, authoritativeDhikrs);
      broadcastEvent('DHIKRS_UPDATED', authoritativeDhikrs);
    }

    // 6. Fetch News directly from Firestore
    const remoteNewsRes = await fetchCollectionFromFirestore<NewsItem>('news');
    if (remoteNewsRes.success) {
      const authoritativeNews = sortFirestoreDocs(remoteNewsRes.data);
      safeSetLocalCache(KEYS.NEWS, authoritativeNews);
      broadcastEvent('NEWS_UPDATED', authoritativeNews);
    }

    // 7. Fetch Announcements directly from Firestore
    const remoteAnnRes = await fetchCollectionFromFirestore<AnnouncementItem>('announcements');
    if (remoteAnnRes.success) {
      const authoritativeAnn = sortFirestoreDocs(remoteAnnRes.data);
      safeSetLocalCache(KEYS.ANNOUNCEMENTS, authoritativeAnn);
      broadcastEvent('ANNOUNCEMENTS_UPDATED', authoritativeAnn);
    }

    // 8. Fetch Broadcast Notifications directly from Firestore
    const remoteNotifRes = await fetchCollectionFromFirestore<AppNotification>('notifications');
    if (remoteNotifRes.success) {
      const authoritativeNotifs = sortFirestoreDocs(remoteNotifRes.data as any);
      safeSetLocalCache(KEYS.NOTIFICATIONS, authoritativeNotifs);
      broadcastEvent('NOTIFICATIONS_UPDATED', authoritativeNotifs);
    }

    // 9. Fetch Inquiries & Drafts directly from Firestore (Admin only)
    if (isAdminAuthenticated()) {
      const remoteInqRes = await fetchCollectionFromFirestore<SupportInquiry>('inquiries');
      if (remoteInqRes.success) {
        const authoritativeInquiries = sortFirestoreDocs(remoteInqRes.data);
        safeSetLocalCache(KEYS.INQUIRIES, authoritativeInquiries);
        broadcastEvent('INQUIRIES_UPDATED', authoritativeInquiries);
      }

      const remoteDraftsRes = await fetchCollectionFromFirestore<TelegramDraftItem>('drafts');
      if (remoteDraftsRes.success) {
        const authoritativeDrafts = sortFirestoreDocs(remoteDraftsRes.data);
        safeSetLocalCache(KEYS.DRAFTS, authoritativeDrafts);
        broadcastEvent('DRAFTS_UPDATED', authoritativeDrafts);
      }
    }

    lastSyncTimestamp = Date.now();
  } catch (err) {
    console.warn('[Firestore Sync] Resilient fallback notice:', err);
  } finally {
    isSyncingFirestore = false;
  }
}

export async function syncWithServer(): Promise<void> {
  // Firestore is the sole authoritative store; server JSON is never allowed to overwrite Firestore or local cache.
  return syncWithFirestore(false);
}

// Auto-trigger sync on module load and periodic interval (Firestore First)
if (typeof window !== 'undefined') {
  // 1. Initial Firestore primary sync
  syncWithFirestore(true);

  // 2. Periodic sync every 2 minutes
  setInterval(() => {
    syncWithFirestore(false);
  }, 120000);

  // 3. Tab focus sync with 30s cooldown
  window.addEventListener('focus', () => {
    syncWithFirestore(false);
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
  const canonicalSchedule: PrayerSchedule = {
    ...schedule,
    verifiedAt: schedule.verifiedAt || new Date().toISOString(),
  };

  // 1. Primary write to Firestore Cloud — must succeed before updating local cache
  const firestoreRes = await syncDocToFirestore('schedules', 'asaka-main', canonicalSchedule);
  if (!firestoreRes.success) {
    return {
      success: false,
      schedule: canonicalSchedule,
      error: `Firestore bazasiga yozish rad etildi: ${firestoreRes.error || 'Ruxsat berilmadi'}`,
    };
  }

  // 2. Update local cache only after confirmed Firestore persistence
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(KEYS.PRAYER, JSON.stringify(canonicalSchedule));
      localStorage.setItem('asaka_ziyo_prayer_schedule', JSON.stringify(canonicalSchedule));
    }
  } catch (e) {
    console.error('Error saving prayer schedule to local storage:', e);
  }

  broadcastEvent('PRAYER_UPDATED', canonicalSchedule);

  if (notifyUsers) {
    triggerBrowserNotification(
      'Asaka namoz vaqtlari yangilandi',
      `Asaka Jome Masjidi maʼmuriyati tomonidan ${canonicalSchedule.formattedDateUz} uchun 8 namoz vaqtlari tasdiqlandi.`
    );
  }

  return { success: true, schedule: canonicalSchedule };
}

// --------------------------------------------------------------------------
// 2. ARTICLES CMS METHODS
// --------------------------------------------------------------------------

export function getStoredArticles(): Article[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(KEYS.ARTICLES);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    }
  } catch {
    // ignore
  }
  return [];
}

export async function saveStoredArticle(
  article: Article
): Promise<{ success: boolean; article: Article; error?: string }> {
  const articles = getStoredArticles();
  const index = articles.findIndex((a) => a.id === article.id);
  let updated: Article[];

  const nowIso = new Date().toISOString();
  const mode: PublishMode = article.publishMode || (article.isArchived ? 'archived' : 'published');
  const canonicalArticle: Article = {
    ...article,
    publishMode: mode,
    isArchived: mode === 'archived' || Boolean(article.isArchived),
    createdAtIso: article.createdAtIso || nowIso,
    updatedAt: nowIso,
    updatedBy: auth.currentUser?.email || 'Administrator',
  };

  if (index >= 0) {
    updated = [...articles];
    updated[index] = canonicalArticle;
  } else {
    updated = [canonicalArticle, ...articles];
  }

  // 1. Primary write to Firestore Cloud
  const firestoreRes = await syncDocToFirestore('articles', canonicalArticle.id, canonicalArticle);
  if (!firestoreRes.success) {
    return {
      success: false,
      article: canonicalArticle,
      error: `Firestore bazasiga yozish rad etildi: ${firestoreRes.error || 'Ruxsat berilmadi'}. Maʼlumot yoʻqotilmadi.`,
    };
  }

  // 2. Update local storage only after cloud write succeeds
  try {
    localStorage.setItem(KEYS.ARTICLES, JSON.stringify(updated));
  } catch {
    // ignore
  }

  broadcastEvent('ARTICLES_UPDATED', updated);

  return { success: true, article: canonicalArticle };
}

export async function archiveStoredArticle(
  id: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const articles = getStoredArticles();
  const target = articles.find((a) => a.id === id);
  if (!target) return { success: false, error: 'Maqola topilmadi' };

  const archived: Article = {
    ...target,
    isArchived: true,
    archivedAt: new Date().toISOString(),
    archivedBy: auth.currentUser?.email || 'Administrator',
    archiveReason: reason || 'Administrator tomonidan arxivlandi',
    updatedAt: new Date().toISOString(),
  };

  const firestoreRes = await syncDocToFirestore('articles', id, archived);
  if (!firestoreRes.success) {
    return {
      success: false,
      error: `Firestore arxivlash rad etildi: ${firestoreRes.error || 'Ruxsat yo‘q'}`,
    };
  }

  const updated = articles.map((a) => (a.id === id ? archived : a));
  try {
    localStorage.setItem(KEYS.ARTICLES, JSON.stringify(updated));
  } catch {
    // ignore
  }

  broadcastEvent('ARTICLES_UPDATED', updated);

  return { success: true };
}

export async function restoreStoredArticle(id: string): Promise<{ success: boolean; error?: string }> {
  const articles = getStoredArticles();
  const target = articles.find((a) => a.id === id);
  if (!target) return { success: false, error: 'Maqola topilmadi' };

  const restored: Article = {
    ...target,
    isArchived: false,
    archivedAt: undefined,
    updatedAt: new Date().toISOString(),
  };

  const firestoreRes = await syncDocToFirestore('articles', id, restored);
  if (!firestoreRes.success) {
    return {
      success: false,
      error: `Firestore tiklash rad etildi: ${firestoreRes.error || 'Ruxsat yo‘q'}`,
    };
  }

  const updated = articles.map((a) => (a.id === id ? restored : a));
  try {
    localStorage.setItem(KEYS.ARTICLES, JSON.stringify(updated));
  } catch {
    // ignore
  }

  broadcastEvent('ARTICLES_UPDATED', updated);

  return { success: true };
}

export async function deleteStoredArticle(id: string): Promise<{ success: boolean; error?: string }> {
  // Always perform safe soft-delete archiving to prevent accidental data destruction
  return archiveStoredArticle(id, 'O‘chirish buyrug‘i orqali xavfsiz arxivga o‘tkazildi');
}

export async function likeStoredArticle(id: string): Promise<void> {
  const articles = getStoredArticles();
  let targetArticle: Article | undefined;
  const updated = articles.map((art) => {
    if (art.id === id) {
      targetArticle = { ...art, likesCount: (art.likesCount || 0) + 1 };
      return targetArticle;
    }
    return art;
  });
  if (targetArticle) {
    try {
      await setDoc(doc(db, 'articles', id), { likesCount: targetArticle.likesCount }, { merge: true });
    } catch {
      // non-blocking
    }
  }
  safeSetLocalCache(KEYS.ARTICLES, updated);
  broadcastEvent('ARTICLES_UPDATED', updated);
}

export async function rateStoredArticle(id: string, stars: number): Promise<void> {
  const articles = getStoredArticles();
  let targetArticle: Article | undefined;
  const updated = articles.map((art) => {
    if (art.id === id) {
      const currentCount = art.ratingsCount || 0;
      const currentAvg = art.rating || 5;
      const newCount = currentCount + 1;
      const newAvg = Number(((currentAvg * currentCount + stars) / newCount).toFixed(1));
      targetArticle = { ...art, rating: newAvg, ratingsCount: newCount };
      return targetArticle;
    }
    return art;
  });
  if (targetArticle) {
    try {
      await setDoc(
        doc(db, 'articles', id),
        { rating: targetArticle.rating, ratingsCount: targetArticle.ratingsCount },
        { merge: true }
      );
    } catch {
      // non-blocking
    }
  }
  safeSetLocalCache(KEYS.ARTICLES, updated);
  broadcastEvent('ARTICLES_UPDATED', updated);
}

export async function addArticleComment(
  articleId: string,
  comment: { authorName: string; text: string }
): Promise<void> {
  const articles = getStoredArticles();
  let targetArticle: Article | undefined;
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
      targetArticle = {
        ...art,
        comments: [...(art.comments || []), newComment],
      };
      return targetArticle;
    }
    return art;
  });

  if (targetArticle) {
    try {
      await setDoc(doc(db, 'articles', articleId), { comments: targetArticle.comments }, { merge: true });
    } catch {
      // non-blocking
    }
  }
  safeSetLocalCache(KEYS.ARTICLES, updated);
  broadcastEvent('ARTICLES_UPDATED', updated);
}

// --------------------------------------------------------------------------
// 3. MEDIA & REELS CMS METHODS
// --------------------------------------------------------------------------

export function getStoredMediaPosts(): MediaPost[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(KEYS.MEDIA_POSTS);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    }
  } catch {
    // ignore
  }
  return [];
}

export async function saveStoredMediaPost(
  post: MediaPost
): Promise<{ success: boolean; post: MediaPost; error?: string }> {
  const posts = getStoredMediaPosts();
  const index = posts.findIndex((p) => p.id === post.id);
  let updated: MediaPost[];

  const nowIso = new Date().toISOString();
  const mode: PublishMode = post.publishMode || (post.isArchived ? 'archived' : 'published');
  const canonicalPost: MediaPost = {
    ...post,
    publishMode: mode,
    isArchived: mode === 'archived' || Boolean(post.isArchived),
    isPublished: mode === 'published',
    createdAtIso: post.createdAtIso || nowIso,
    updatedAt: nowIso,
  };

  if (index >= 0) {
    updated = [...posts];
    updated[index] = canonicalPost;
  } else {
    updated = [canonicalPost, ...posts];
  }

  // 1. Primary write to Firestore Cloud
  const firestoreRes = await syncDocToFirestore('mediaPosts', canonicalPost.id, canonicalPost);
  if (!firestoreRes.success) {
    return {
      success: false,
      post: canonicalPost,
      error: `Firestore media saqlash rad etildi: ${firestoreRes.error || 'Ruxsat berilmadi'}. Maʼlumot yoʻqotilmadi.`,
    };
  }

  try {
    localStorage.setItem(KEYS.MEDIA_POSTS, JSON.stringify(updated));
  } catch {
    // ignore
  }

  broadcastEvent('POSTS_UPDATED', updated);

  return { success: true, post: canonicalPost };
}

export async function archiveStoredMediaPost(
  id: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const posts = getStoredMediaPosts();
  const target = posts.find((p) => p.id === id);
  if (!target) return { success: false, error: 'Media topilmadi' };

  const archived: MediaPost = {
    ...target,
    isArchived: true,
    archivedAt: new Date().toISOString(),
    archivedBy: auth.currentUser?.email || 'Administrator',
    archiveReason: reason || 'Administrator tomonidan arxivlandi',
    updatedAt: new Date().toISOString(),
  };

  const firestoreRes = await syncDocToFirestore('mediaPosts', id, archived);
  if (!firestoreRes.success) {
    return { success: false, error: `Firestore arxivlash rad etildi: ${firestoreRes.error}` };
  }

  const updated = posts.map((p) => (p.id === id ? archived : p));
  try {
    localStorage.setItem(KEYS.MEDIA_POSTS, JSON.stringify(updated));
  } catch {
    // ignore
  }

  broadcastEvent('POSTS_UPDATED', updated);

  return { success: true };
}

export async function restoreStoredMediaPost(id: string): Promise<{ success: boolean; error?: string }> {
  const posts = getStoredMediaPosts();
  const target = posts.find((p) => p.id === id);
  if (!target) return { success: false, error: 'Media topilmadi' };

  const restored: MediaPost = {
    ...target,
    isArchived: false,
    archivedAt: undefined,
    updatedAt: new Date().toISOString(),
  };

  const firestoreRes = await syncDocToFirestore('mediaPosts', id, restored);
  if (!firestoreRes.success) {
    return { success: false, error: `Firestore tiklash rad etildi: ${firestoreRes.error}` };
  }

  const updated = posts.map((p) => (p.id === id ? restored : p));
  try {
    localStorage.setItem(KEYS.MEDIA_POSTS, JSON.stringify(updated));
  } catch {
    // ignore
  }

  broadcastEvent('POSTS_UPDATED', updated);

  return { success: true };
}

export async function deleteStoredMediaPost(id: string): Promise<{ success: boolean; error?: string }> {
  return archiveStoredMediaPost(id, 'O‘chirish buyrug‘i orqali xavfsiz arxivga o‘tkazildi');
}

export async function likeStoredMediaPost(id: string): Promise<void> {
  const posts = getStoredMediaPosts();
  let targetPost: MediaPost | undefined;
  const updated = posts.map((p) => {
    if (p.id === id) {
      targetPost = { ...p, likesCount: p.likesCount + 1 };
      return targetPost;
    }
    return p;
  });
  if (targetPost) {
    try {
      await setDoc(doc(db, 'mediaPosts', id), { likesCount: targetPost.likesCount }, { merge: true });
    } catch {
      // non-blocking
    }
  }
  safeSetLocalCache(KEYS.MEDIA_POSTS, updated);
  broadcastEvent('POSTS_UPDATED', updated);
}

export async function addMediaPostComment(
  postId: string,
  comment: { authorName: string; text: string }
): Promise<void> {
  const posts = getStoredMediaPosts();
  let targetPost: MediaPost | undefined;
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
      targetPost = {
        ...p,
        commentsCount: p.commentsCount + 1,
        comments: [newComment, ...(p.comments || [])],
      };
      return targetPost;
    }
    return p;
  });

  if (targetPost) {
    try {
      await setDoc(
        doc(db, 'mediaPosts', postId),
        { commentsCount: targetPost.commentsCount, comments: targetPost.comments },
        { merge: true }
      );
    } catch {
      // non-blocking
    }
  }
  safeSetLocalCache(KEYS.MEDIA_POSTS, updated);
  broadcastEvent('POSTS_UPDATED', updated);
}

// --------------------------------------------------------------------------
// 4. HADITHS & DHIKRS CMS METHODS
// --------------------------------------------------------------------------

export function getStoredHadiths(): HadithItem[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(KEYS.HADITHS);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {
    // ignore
  }
  return [];
}

export async function saveStoredHadith(
  hadith: HadithItem
): Promise<{ success: boolean; hadith: HadithItem; error?: string }> {
  const hadiths = getStoredHadiths();
  const nowIso = new Date().toISOString();
  const mode: PublishMode = hadith.publishMode || (hadith.isArchived ? 'archived' : 'published');
  const canonicalHadith: HadithItem = {
    ...hadith,
    publishMode: mode,
    isArchived: mode === 'archived' || Boolean(hadith.isArchived),
    createdAtIso: hadith.createdAtIso || nowIso,
    updatedAt: nowIso,
  };
  const index = hadiths.findIndex((h) => h.id === hadith.id);
  const updated = index >= 0 ? [...hadiths] : [canonicalHadith, ...hadiths];
  if (index >= 0) updated[index] = canonicalHadith;

  // Primary write to Firestore Cloud
  const firestoreRes = await syncDocToFirestore('hadiths', canonicalHadith.id, canonicalHadith);
  if (!firestoreRes.success) {
    return {
      success: false,
      hadith: canonicalHadith,
      error: `Firestore bazasiga hadis saqlash rad etildi: ${firestoreRes.error || 'Ruxsat berilmadi'}`,
    };
  }

  try {
    localStorage.setItem(KEYS.HADITHS, JSON.stringify(updated));
  } catch {
    // ignore
  }

  broadcastEvent('HADITHS_UPDATED', updated);

  return { success: true, hadith: canonicalHadith };
}

export async function archiveStoredHadith(
  id: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const hadiths = getStoredHadiths();
  const target = hadiths.find((h) => h.id === id);
  if (!target) return { success: false, error: 'Hadis topilmadi' };

  const archived: HadithItem = {
    ...target,
    isArchived: true,
    archivedAt: new Date().toISOString(),
    archivedBy: auth.currentUser?.email || 'Administrator',
    archiveReason: reason || 'Administrator tomonidan arxivlandi',
  };

  const firestoreRes = await syncDocToFirestore('hadiths', id, archived);
  if (!firestoreRes.success) {
    return { success: false, error: `Firestore arxivlash rad etildi: ${firestoreRes.error}` };
  }

  const updated = hadiths.map((h) => (h.id === id ? archived : h));
  try {
    localStorage.setItem(KEYS.HADITHS, JSON.stringify(updated));
  } catch {
    // ignore
  }

  broadcastEvent('HADITHS_UPDATED', updated);

  return { success: true };
}

export async function restoreStoredHadith(id: string): Promise<{ success: boolean; error?: string }> {
  const hadiths = getStoredHadiths();
  const target = hadiths.find((h) => h.id === id);
  if (!target) return { success: false, error: 'Hadis topilmadi' };

  const restored: HadithItem = {
    ...target,
    isArchived: false,
    archivedAt: undefined,
  };

  const firestoreRes = await syncDocToFirestore('hadiths', id, restored);
  if (!firestoreRes.success) {
    return { success: false, error: `Firestore tiklash rad etildi: ${firestoreRes.error}` };
  }

  const updated = hadiths.map((h) => (h.id === id ? restored : h));
  try {
    localStorage.setItem(KEYS.HADITHS, JSON.stringify(updated));
  } catch {
    // ignore
  }

  broadcastEvent('HADITHS_UPDATED', updated);

  return { success: true };
}

export async function deleteStoredHadith(id: string): Promise<{ success: boolean; error?: string }> {
  return archiveStoredHadith(id, 'O‘chirish buyrug‘i orqali xavfsiz arxivga o‘tkazildi');
}

export function getStoredDhikrs(): DhikrItem[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(KEYS.DHIKRS);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {
    // ignore
  }
  return [];
}

export async function saveStoredDhikr(
  dhikr: DhikrItem
): Promise<{ success: boolean; dhikr: DhikrItem; error?: string }> {
  const dhikrs = getStoredDhikrs();
  const nowIso = new Date().toISOString();
  const mode: PublishMode = dhikr.publishMode || (dhikr.isArchived ? 'archived' : 'published');
  const canonicalDhikr: DhikrItem = {
    ...dhikr,
    publishMode: mode,
    isArchived: mode === 'archived' || Boolean(dhikr.isArchived),
    createdAtIso: dhikr.createdAtIso || nowIso,
    updatedAt: nowIso,
  };
  const index = dhikrs.findIndex((d) => d.id === dhikr.id);
  const updated = index >= 0 ? [...dhikrs] : [canonicalDhikr, ...dhikrs];
  if (index >= 0) updated[index] = canonicalDhikr;

  // Primary write to Firestore Cloud
  const firestoreRes = await syncDocToFirestore('dhikrs', canonicalDhikr.id, canonicalDhikr);
  if (!firestoreRes.success) {
    return {
      success: false,
      dhikr: canonicalDhikr,
      error: `Firestore bazasiga zikr saqlash rad etildi: ${firestoreRes.error || 'Ruxsat berilmadi'}`,
    };
  }

  try {
    localStorage.setItem(KEYS.DHIKRS, JSON.stringify(updated));
  } catch {
    // ignore
  }

  broadcastEvent('DHIKRS_UPDATED', updated);

  return { success: true, dhikr: canonicalDhikr };
}

export async function archiveStoredDhikr(
  id: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const dhikrs = getStoredDhikrs();
  const target = dhikrs.find((d) => d.id === id);
  if (!target) return { success: false, error: 'Zikr topilmadi' };

  const archived: DhikrItem = {
    ...target,
    isArchived: true,
    archivedAt: new Date().toISOString(),
    archivedBy: auth.currentUser?.email || 'Administrator',
    archiveReason: reason || 'Administrator tomonidan arxivlandi',
  };

  const firestoreRes = await syncDocToFirestore('dhikrs', id, archived);
  if (!firestoreRes.success) {
    return { success: false, error: `Firestore arxivlash rad etildi: ${firestoreRes.error}` };
  }

  const updated = dhikrs.map((d) => (d.id === id ? archived : d));
  try {
    localStorage.setItem(KEYS.DHIKRS, JSON.stringify(updated));
  } catch {
    // ignore
  }

  broadcastEvent('DHIKRS_UPDATED', updated);

  return { success: true };
}

export async function restoreStoredDhikr(id: string): Promise<{ success: boolean; error?: string }> {
  const dhikrs = getStoredDhikrs();
  const target = dhikrs.find((d) => d.id === id);
  if (!target) return { success: false, error: 'Zikr topilmadi' };

  const restored: DhikrItem = {
    ...target,
    isArchived: false,
    archivedAt: undefined,
  };

  const firestoreRes = await syncDocToFirestore('dhikrs', id, restored);
  if (!firestoreRes.success) {
    return { success: false, error: `Firestore tiklash rad etildi: ${firestoreRes.error}` };
  }

  const updated = dhikrs.map((d) => (d.id === id ? restored : d));
  try {
    localStorage.setItem(KEYS.DHIKRS, JSON.stringify(updated));
  } catch {
    // ignore
  }

  broadcastEvent('DHIKRS_UPDATED', updated);

  return { success: true };
}

export async function deleteStoredDhikr(id: string): Promise<{ success: boolean; error?: string }> {
  return archiveStoredDhikr(id, 'O‘chirish buyrug‘i orqali xavfsiz arxivga o‘tkazildi');
}

// --------------------------------------------------------------------------
// 5. SUPPORT INQUIRIES & CHAT (Admin <-> User)
// --------------------------------------------------------------------------

export function getStoredInquiries(): SupportInquiry[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(KEYS.INQUIRIES);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {
    // ignore
  }
  return [];
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
    isArchived: false,
  };

  // Primary write to Firestore Cloud
  await syncDocToFirestore('inquiries', newInquiry.id, newInquiry);

  const list = [newInquiry, ...getStoredInquiries()];
  try {
    localStorage.setItem(KEYS.INQUIRIES, JSON.stringify(list));
  } catch {
    // ignore
  }

  broadcastEvent('INQUIRIES_UPDATED', list);

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

  let targetInquiry: SupportInquiry | undefined;
  const list = getStoredInquiries().map((inq) => {
    if (inq.id === id) {
      targetInquiry = {
        ...inq,
        status: 'answered' as const,
        adminReply,
        repliedAt: formattedTime,
        repliedBy: adminName,
      };
      return targetInquiry;
    }
    return inq;
  });

  if (!targetInquiry) return { success: false, error: 'Murojaat topilmadi' };

  // Primary write to Firestore Cloud
  const firestoreRes = await syncDocToFirestore('inquiries', id, targetInquiry);
  if (!firestoreRes.success) {
    return {
      success: false,
      error: `Firestore javob yozish rad etildi: ${firestoreRes.error || 'Ruxsat berilmadi'}`,
    };
  }

  try {
    localStorage.setItem(KEYS.INQUIRIES, JSON.stringify(list));
  } catch {
    // ignore
  }

  broadcastEvent('INQUIRIES_UPDATED', list);

  return { success: true };
}

export async function archiveStoredInquiry(
  id: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const inquiries = getStoredInquiries();
  const target = inquiries.find((i) => i.id === id);
  if (!target) return { success: false, error: 'Murojaat topilmadi' };

  const archived: SupportInquiry = {
    ...target,
    isArchived: true,
    archivedAt: new Date().toISOString(),
    archivedBy: auth.currentUser?.email || 'Administrator',
    archiveReason: reason || 'Arxivlandi',
  };

  const firestoreRes = await syncDocToFirestore('inquiries', id, archived);
  if (!firestoreRes.success) {
    return { success: false, error: `Firestore arxivlash rad etildi: ${firestoreRes.error}` };
  }

  const updated = inquiries.map((i) => (i.id === id ? archived : i));
  try {
    localStorage.setItem(KEYS.INQUIRIES, JSON.stringify(updated));
  } catch {
    // ignore
  }

  broadcastEvent('INQUIRIES_UPDATED', updated);

  return { success: true };
}

export async function restoreStoredInquiry(id: string): Promise<{ success: boolean; error?: string }> {
  const inquiries = getStoredInquiries();
  const target = inquiries.find((i) => i.id === id);
  if (!target) return { success: false, error: 'Murojaat topilmadi' };

  const restored: SupportInquiry = {
    ...target,
    isArchived: false,
    archivedAt: undefined,
  };

  const firestoreRes = await syncDocToFirestore('inquiries', id, restored);
  if (!firestoreRes.success) {
    return { success: false, error: `Firestore tiklash rad etildi: ${firestoreRes.error}` };
  }

  const updated = inquiries.map((i) => (i.id === id ? restored : i));
  try {
    localStorage.setItem(KEYS.INQUIRIES, JSON.stringify(updated));
  } catch {
    // ignore
  }

  broadcastEvent('INQUIRIES_UPDATED', updated);

  return { success: true };
}

export async function deleteStoredInquiry(id: string): Promise<{ success: boolean; error?: string }> {
  return archiveStoredInquiry(id, 'O‘chirish buyrug‘i orqali xavfsiz arxivga o‘tkazildi');
}

// --------------------------------------------------------------------------
// 6. TELEGRAM DRAFTS & MODERATION (Telegram -> Admin Approval -> Live App)
// --------------------------------------------------------------------------

export function getStoredDrafts(): TelegramDraftItem[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(KEYS.DRAFTS);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {
    // ignore
  }
  return [];
}

export async function approveDraft(id: string, reviewer = 'Bosh Administrator'): Promise<boolean> {
  const drafts = getStoredDrafts();
  const target = drafts.find((d) => d.id === id);
  if (!target) return false;

  const nowFormatted = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const updatedDraft: TelegramDraftItem = {
    ...target,
    status: 'approved',
    reviewedBy: reviewer,
    reviewedAt: nowFormatted,
  };

  const firestoreDraftRes = await syncDocToFirestore('drafts', id, updatedDraft);
  if (!firestoreDraftRes.success) {
    return false;
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
    const saveRes = await saveStoredPrayerSchedule(updatedSchedule);
    if (!saveRes.success) return false;
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
    const saveRes = await saveStoredArticle(newArt);
    if (!saveRes.success) return false;
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
    const saveRes = await saveStoredMediaPost(newPost);
    if (!saveRes.success) return false;
  }

  const updatedDrafts = drafts.map((d) => (d.id === id ? updatedDraft : d));
  try {
    localStorage.setItem(KEYS.DRAFTS, JSON.stringify(updatedDrafts));
  } catch {
    // ignore
  }

  broadcastEvent('DRAFTS_UPDATED', updatedDrafts);
  return true;
}

export async function rejectDraft(id: string, reviewer = 'Bosh Administrator'): Promise<boolean> {
  const existing = getStoredDrafts();
  const target = existing.find((d) => d.id === id);
  if (!target) return false;

  const rejectedDraft: TelegramDraftItem = {
    ...target,
    status: 'rejected' as const,
    reviewedBy: reviewer,
    reviewedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
  };

  const firestoreRes = await syncDocToFirestore('drafts', id, rejectedDraft);
  if (!firestoreRes.success) {
    return false;
  }

  const drafts = existing.map((d) => (d.id === id ? rejectedDraft : d));
  try {
    localStorage.setItem(KEYS.DRAFTS, JSON.stringify(drafts));
  } catch {
    // ignore
  }

  broadcastEvent('DRAFTS_UPDATED', drafts);
  return true;
}

export async function deleteDraft(id: string): Promise<boolean> {
  const firestoreRes = await deleteDocFromFirestore('drafts', id);
  if (!firestoreRes.success) {
    return false;
  }

  const drafts = getStoredDrafts().filter((d) => d.id !== id);
  try {
    localStorage.setItem(KEYS.DRAFTS, JSON.stringify(drafts));
  } catch {
    // ignore
  }

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

  const firestoreRes = await syncDocToFirestore('drafts', newDraft.id, newDraft);
  if (!firestoreRes.success) {
    return false;
  }

  const drafts = [newDraft, ...getStoredDrafts()];
  try {
    localStorage.setItem(KEYS.DRAFTS, JSON.stringify(drafts));
  } catch {
    // ignore
  }

  broadcastEvent('DRAFTS_UPDATED', drafts);
  return true;
}

// --------------------------------------------------------------------------
// 7. BROADCAST NOTIFICATIONS PERSISTENCE
// --------------------------------------------------------------------------

export function getStoredBroadcastNotifications(): AppNotification[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(KEYS.NOTIFICATIONS);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
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

  const firestoreRes = await syncDocToFirestore('notifications', newNotif.id, newNotif);
  if (!firestoreRes.success) {
    return {
      success: false,
      notification: newNotif,
      error: `Firestore bildirishnoma saqlash rad etildi: ${firestoreRes.error || 'Ruxsat berilmadi'}`,
    };
  }

  const list = [newNotif, ...getStoredBroadcastNotifications()];
  try {
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(list));
  } catch {
    // ignore
  }

  broadcastEvent('NOTIFICATIONS_UPDATED', list);

  return { success: true, notification: newNotif };
}

/**
 * Sync entire current local/server dataset directly to Firebase Firestore
 */
export async function syncAllToFirestore(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    let count = 0;
    const schedule = getStoredPrayerSchedule();
    const schedRes = await syncDocToFirestore('schedules', 'asaka-main', schedule);
    if (!schedRes.success) {
      return { success: false, count: 0, error: schedRes.error };
    }
    count++;

    const articles = getStoredArticles();
    for (const art of articles) {
      const r = await syncDocToFirestore('articles', art.id, art);
      if (!r.success) return { success: false, count, error: r.error };
      count++;
    }

    const media = getStoredMediaPosts();
    for (const m of media) {
      const r = await syncDocToFirestore('mediaPosts', m.id, m);
      if (!r.success) return { success: false, count, error: r.error };
      count++;
    }

    const hadiths = getStoredHadiths();
    for (const h of hadiths) {
      const r = await syncDocToFirestore('hadiths', h.id, h);
      if (!r.success) return { success: false, count, error: r.error };
      count++;
    }

    const dhikrs = getStoredDhikrs();
    for (const d of dhikrs) {
      const r = await syncDocToFirestore('dhikrs', d.id, d);
      if (!r.success) return { success: false, count, error: r.error };
      count++;
    }

    const news = getStoredNews();
    for (const n of news) {
      const r = await syncDocToFirestore('news', n.id, n);
      if (!r.success) return { success: false, count, error: r.error };
      count++;
    }

    const announcements = getStoredAnnouncements();
    for (const ann of announcements) {
      const r = await syncDocToFirestore('announcements', ann.id, ann);
      if (!r.success) return { success: false, count, error: r.error };
      count++;
    }

    const inquiries = getStoredInquiries();
    for (const i of inquiries) {
      const r = await syncDocToFirestore('inquiries', i.id, i);
      if (!r.success) return { success: false, count, error: r.error };
      count++;
    }

    const drafts = getStoredDrafts();
    for (const d of drafts) {
      const r = await syncDocToFirestore('drafts', d.id, d);
      if (!r.success) return { success: false, count, error: r.error };
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
  const activeAdmin = getActiveAdminSession();

  try {
    if (activeAdmin && isAdminAuthenticated()) {
      // 1. Authenticated Admin: Real write then read test in _diagnostics collection
      const testData = {
        testId: testDocId,
        createdAt: timestamp,
        client: 'ASAKA ZIYO Admin Diagnostic Suite',
        authorUid: activeAdmin.uid,
        authorUsername: activeAdmin.username || 'menageradmin',
        authorEmail: activeAdmin.email || 'asakaziyo0@gmail.com',
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
          details: `Google Cloud Firestore bilan ikki tomonlama (yozish/oʻqish) aloqa ${latencyMs}ms tezlikda muvaffaqiyatli sinovdan oʻtdi. Admin: ${activeAdmin.email} (${activeAdmin.username || 'menageradmin'}). Hujjat ID: ${testDocId}.`,
          authenticatedAs: `${activeAdmin.email} (${activeAdmin.username || 'menageradmin'})`,
          role: activeAdmin.role,
          documentId: testDocId,
        };
      } else {
        return {
          status: 'FAIL',
          latencyMs,
          operation: 'READ_WRITE',
          timestamp,
          details: 'Hujjat yozildi, biroq qayta oʻqishda topilmadi.',
          authenticatedAs: activeAdmin.email,
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
        details: `Firestore umumiy oʻqish soʻrovi ${latencyMs}ms tezlikda muvaffaqiyatli amalga oshirildi (${snapshot.exists() ? 'tasdiqlangan jadval mavjud' : 'baza tayyor'}). Yozish testini oʻtkazish uchun Administrator (asakaziyo0@gmail.com) sifatida tizimga kiring.`,
        authenticatedAs: null,
      };
    }
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    const errorMsg = err?.message || String(err);
    return {
      status: 'FAIL',
      latencyMs,
      operation: activeAdmin ? 'READ_WRITE' : 'READ',
      timestamp,
      details: `Firestore ulanishida xatolik yuz berdi: ${errorMsg}`,
      authenticatedAs: activeAdmin?.email || null,
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
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {}
  return [];
}

export async function saveStoredAnnouncement(announcement: AnnouncementItem): Promise<{ success: boolean; error?: string }> {
  const nowIso = new Date().toISOString();
  const mode: PublishMode = announcement.publishMode || (announcement.isArchived ? 'archived' : 'published');
  const canonicalAnn: AnnouncementItem = {
    ...announcement,
    publishMode: mode,
    isArchived: mode === 'archived' || Boolean(announcement.isArchived),
    createdAtIso: announcement.createdAtIso || nowIso,
    updatedAt: nowIso,
  };
  const list = getStoredAnnouncements();
  const idx = list.findIndex((a) => a.id === canonicalAnn.id);
  const updated = idx >= 0 ? list.map((a, i) => (i === idx ? canonicalAnn : a)) : [canonicalAnn, ...list];

  const firestoreRes = await syncDocToFirestore('announcements', canonicalAnn.id, canonicalAnn);
  if (!firestoreRes.success) {
    return { success: false, error: firestoreRes.error || 'Firestore eʼlon saqlash rad etildi' };
  }

  try {
    localStorage.setItem(KEYS.ANNOUNCEMENTS, JSON.stringify(updated));
  } catch {}
  broadcastEvent('ANNOUNCEMENTS_UPDATED', updated);
  return { success: true };
}

export async function deleteStoredAnnouncement(id: string): Promise<{ success: boolean; error?: string }> {
  return updateItemPublishMode('announcements', id, 'archived');
}

export function getStoredNews(): NewsItem[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(KEYS.NEWS);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {}
  return [];
}

export async function saveStoredNews(newsItem: NewsItem): Promise<{ success: boolean; error?: string }> {
  const nowIso = new Date().toISOString();
  const mode: PublishMode = newsItem.publishMode || (newsItem.isArchived ? 'archived' : 'published');
  const canonicalNews: NewsItem = {
    ...newsItem,
    publishMode: mode,
    isArchived: mode === 'archived' || Boolean(newsItem.isArchived),
    createdAtIso: newsItem.createdAtIso || nowIso,
    updatedAt: nowIso,
  };
  const list = getStoredNews();
  const idx = list.findIndex((n) => n.id === canonicalNews.id);
  const updated = idx >= 0 ? list.map((n, i) => (i === idx ? canonicalNews : n)) : [canonicalNews, ...list];

  const firestoreRes = await syncDocToFirestore('news', canonicalNews.id, canonicalNews);
  if (!firestoreRes.success) {
    return { success: false, error: firestoreRes.error || 'Firestore yangilik saqlash rad etildi' };
  }

  try {
    localStorage.setItem(KEYS.NEWS, JSON.stringify(updated));
  } catch {}
  broadcastEvent('NEWS_UPDATED', updated);
  return { success: true };
}

export async function deleteStoredNews(id: string): Promise<{ success: boolean; error?: string }> {
  return updateItemPublishMode('news', id, 'archived');
}

export function isPubliclyPublished(item?: { isArchived?: boolean; publishMode?: PublishMode }): boolean {
  if (!item) return false;
  if (item.isArchived) return false;
  if (item.publishMode && item.publishMode !== 'published') return false;
  return true;
}

export function getDateCategoryInfo(item: {
  createdAtIso?: string;
  updatedAt?: string;
  publishedDate?: string;
  date?: string;
}): { bucket: 'today' | 'yesterday' | 'older'; label: string } {
  const rawDateStr = item.createdAtIso || item.updatedAt;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

  if (rawDateStr) {
    const parsedTime = Date.parse(rawDateStr);
    if (!Number.isNaN(parsedTime)) {
      if (parsedTime >= todayStart) {
        return { bucket: 'today', label: 'Bugun' };
      }
      if (parsedTime >= yesterdayStart) {
        return { bucket: 'yesterday', label: 'Kecha' };
      }
      const d = new Date(parsedTime);
      return {
        bucket: 'older',
        label: d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      };
    }
  }

  const textDate = (item.publishedDate || item.date || '').toLowerCase();
  if (textDate.includes('bugun') || textDate.includes('hozir')) {
    return { bucket: 'today', label: 'Bugun' };
  }
  if (textDate.includes('kecha')) {
    return { bucket: 'yesterday', label: 'Kecha' };
  }
  return {
    bucket: 'older',
    label: item.publishedDate || item.date || 'Barcha sanalar',
  };
}

export interface ArchivedItemSummary {
  id: string;
  type: 'article' | 'media' | 'hadith' | 'dhikr' | 'inquiry' | 'news' | 'announcement';
  typeLabelUz: string;
  title: string;
  publishMode?: PublishMode;
  archivedAt?: string;
  archivedBy?: string;
  archiveReason?: string;
  originalItem: any;
}

export function getAllArchivedItems(): ArchivedItemSummary[] {
  const archives: ArchivedItemSummary[] = [];

  getStoredArticles()
    .filter((a) => a.isArchived || a.publishMode === 'archived')
    .forEach((a) => {
      archives.push({
        id: a.id,
        type: 'article',
        typeLabelUz: 'Maqola',
        title: a.title,
        publishMode: a.publishMode || 'archived',
        archivedAt: a.archivedAt || a.updatedAt,
        archivedBy: a.archivedBy,
        archiveReason: a.archiveReason,
        originalItem: a,
      });
    });

  getStoredNews()
    .filter((n) => n.isArchived || n.publishMode === 'archived')
    .forEach((n) => {
      archives.push({
        id: n.id,
        type: 'news',
        typeLabelUz: 'Yangilik',
        title: n.title,
        publishMode: n.publishMode || 'archived',
        archivedAt: n.archivedAt || n.updatedAt,
        archivedBy: n.archivedBy,
        archiveReason: n.archiveReason,
        originalItem: n,
      });
    });

  getStoredAnnouncements()
    .filter((ann) => ann.isArchived || ann.publishMode === 'archived')
    .forEach((ann) => {
      archives.push({
        id: ann.id,
        type: 'announcement',
        typeLabelUz: 'Eʼlon',
        title: ann.title,
        publishMode: ann.publishMode || 'archived',
        archivedAt: ann.archivedAt || ann.updatedAt,
        archivedBy: ann.archivedBy,
        archiveReason: ann.archiveReason,
        originalItem: ann,
      });
    });

  getStoredMediaPosts()
    .filter((m) => m.isArchived || m.publishMode === 'archived')
    .forEach((m) => {
      archives.push({
        id: m.id,
        type: 'media',
        typeLabelUz: 'Media / Reel',
        title: m.title,
        publishMode: m.publishMode || 'archived',
        archivedAt: m.archivedAt || m.updatedAt,
        archivedBy: m.archivedBy,
        archiveReason: m.archiveReason,
        originalItem: m,
      });
    });

  getStoredHadiths()
    .filter((h) => h.isArchived || h.publishMode === 'archived')
    .forEach((h) => {
      archives.push({
        id: h.id,
        type: 'hadith',
        typeLabelUz: 'Hadis',
        title: `${h.collectionNameUz}: ${h.reference || h.number}`,
        publishMode: h.publishMode || 'archived',
        archivedAt: h.archivedAt || h.updatedAt,
        archivedBy: h.archivedBy,
        archiveReason: h.archiveReason,
        originalItem: h,
      });
    });

  getStoredDhikrs()
    .filter((d) => d.isArchived || d.publishMode === 'archived')
    .forEach((d) => {
      archives.push({
        id: d.id,
        type: 'dhikr',
        typeLabelUz: 'Zikr / Duo',
        title: d.titleUz,
        publishMode: d.publishMode || 'archived',
        archivedAt: d.archivedAt || d.updatedAt,
        archivedBy: d.archivedBy,
        archiveReason: d.archiveReason,
        originalItem: d,
      });
    });

  getStoredInquiries()
    .filter((i) => i.isArchived)
    .forEach((i) => {
      archives.push({
        id: i.id,
        type: 'inquiry',
        typeLabelUz: 'Foydalanuvchi murojaati',
        title: `${i.userName}: ${i.subject || i.message.slice(0, 45)}`,
        archivedAt: i.archivedAt,
        archivedBy: i.archivedBy,
        archiveReason: i.archiveReason,
        originalItem: i,
      });
    });

  return archives;
}

export async function restoreArchivedItem(
  type: 'article' | 'media' | 'hadith' | 'dhikr' | 'inquiry' | 'news' | 'announcement',
  id: string
): Promise<{ success: boolean; error?: string }> {
  switch (type) {
    case 'article':
      return updateItemPublishMode('articles', id, 'published');
    case 'news':
      return updateItemPublishMode('news', id, 'published');
    case 'announcement':
      return updateItemPublishMode('announcements', id, 'published');
    case 'media':
      return updateItemPublishMode('mediaPosts', id, 'published');
    case 'hadith':
      return updateItemPublishMode('hadiths', id, 'published');
    case 'dhikr':
      return updateItemPublishMode('dhikrs', id, 'published');
    case 'inquiry':
      return restoreStoredInquiry(id);
    default:
      return { success: false, error: 'Nomaʼlum maʼlumot turi' };
  }
}

/**
 * Updates the publishMode ('published' | 'draft' | 'test' | 'archived') of any content item in Firestore
 */
export async function updateItemPublishMode(
  collectionName: 'articles' | 'news' | 'announcements' | 'mediaPosts' | 'hadiths' | 'dhikrs',
  id: string,
  mode: PublishMode
): Promise<{ success: boolean; error?: string }> {
  const nowIso = new Date().toISOString();
  const isArchived = mode === 'archived';
  const isPublished = mode === 'published';

  const getterMap = {
    articles: getStoredArticles,
    news: getStoredNews,
    announcements: getStoredAnnouncements,
    mediaPosts: getStoredMediaPosts,
    hadiths: getStoredHadiths,
    dhikrs: getStoredDhikrs,
  };
  const keyMap = {
    articles: KEYS.ARTICLES,
    news: KEYS.NEWS,
    announcements: KEYS.ANNOUNCEMENTS,
    mediaPosts: KEYS.MEDIA_POSTS,
    hadiths: KEYS.HADITHS,
    dhikrs: KEYS.DHIKRS,
  };
  const eventMap: Record<string, DBEventType> = {
    articles: 'ARTICLES_UPDATED',
    news: 'NEWS_UPDATED',
    announcements: 'ANNOUNCEMENTS_UPDATED',
    mediaPosts: 'POSTS_UPDATED',
    hadiths: 'HADITHS_UPDATED',
    dhikrs: 'DHIKRS_UPDATED',
  };

  const list = getterMap[collectionName]() as any[];
  const target = list.find((item) => item.id === id);
  if (!target) {
    return { success: false, error: 'Element topilmadi' };
  }

  const updatedItem = {
    ...target,
    publishMode: mode,
    isArchived,
    isPublished,
    archivedAt: isArchived ? nowIso : null,
    updatedAt: nowIso,
  };

  const firestoreRes = await syncDocToFirestore(collectionName, id, updatedItem);
  if (!firestoreRes.success) {
    return { success: false, error: firestoreRes.error || 'Firestore holatni yangilash rad etildi' };
  }

  const updatedList = list.map((item) => (item.id === id ? updatedItem : item));
  safeSetLocalCache(keyMap[collectionName], updatedList);
  broadcastEvent(eventMap[collectionName], updatedList);
  return { success: true };
}

/**
 * Permanently deletes an item from Firestore and local cache (Admin only)
 */
export async function permanentlyDeleteItem(
  collectionName: 'articles' | 'news' | 'announcements' | 'mediaPosts' | 'hadiths' | 'dhikrs',
  id: string
): Promise<{ success: boolean; error?: string }> {
  const firestoreRes = await deleteDocFromFirestore(collectionName, id);
  if (!firestoreRes.success) {
    return { success: false, error: firestoreRes.error || 'Firestore oʻchirish rad etildi' };
  }

  const getterMap = {
    articles: getStoredArticles,
    news: getStoredNews,
    announcements: getStoredAnnouncements,
    mediaPosts: getStoredMediaPosts,
    hadiths: getStoredHadiths,
    dhikrs: getStoredDhikrs,
  };
  const keyMap = {
    articles: KEYS.ARTICLES,
    news: KEYS.NEWS,
    announcements: KEYS.ANNOUNCEMENTS,
    mediaPosts: KEYS.MEDIA_POSTS,
    hadiths: KEYS.HADITHS,
    dhikrs: KEYS.DHIKRS,
  };
  const eventMap: Record<string, DBEventType> = {
    articles: 'ARTICLES_UPDATED',
    news: 'NEWS_UPDATED',
    announcements: 'ANNOUNCEMENTS_UPDATED',
    mediaPosts: 'POSTS_UPDATED',
    hadiths: 'HADITHS_UPDATED',
    dhikrs: 'DHIKRS_UPDATED',
  };

  const updatedList = (getterMap[collectionName]() as any[]).filter((item) => item.id !== id);
  safeSetLocalCache(keyMap[collectionName], updatedList);
  broadcastEvent(eventMap[collectionName], updatedList);
  return { success: true };
}

/**
 * Uploads an image, video, or audio file selected by the administrator from their device
 */
export async function uploadAdminMediaFile(file: File): Promise<{
  success: boolean;
  url?: string;
  mediaType?: 'image' | 'video' | 'audio';
  error?: string;
}> {
  try {
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Faylni oʻqishda xatolik'));
      reader.readAsDataURL(file);
    });

    const token = getActiveAdminToken();
    const resp = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type,
        base64Data,
      }),
    });

    const data = await resp.json().catch(() => ({}));
    if (resp.ok && data.success && data.url) {
      return {
        success: true,
        url: data.url,
        mediaType: data.mediaType,
      };
    }
    return {
      success: false,
      error: data.error || 'Faylni serverga yuklashda xatolik yuz berdi.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Fayl yuklash xatosi',
    };
  }
}




