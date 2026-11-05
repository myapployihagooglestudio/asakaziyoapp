/**
 * ASAKA ZIYO — Supabase Cloud Data Synchronization Service
 * 
 * Provides robust optional cloud database synchronization using Supabase JavaScript client,
 * replacing legacy direct JSON reliance while keeping Firebase Authentication and Firestore 
 * as the primary security and auth engine.
 */

import { getStoredSupabaseConfig, getSupabaseClient } from './supabaseClient';
import {
  Article,
  MediaPost,
  HadithItem,
  DhikrItem,
  PrayerSchedule,
  NewsItem,
  AnnouncementItem,
  SupportInquiry,
} from '../types';

export interface SupabaseSyncResult {
  success: boolean;
  syncedTables?: string[];
  failedTables?: { table: string; error: string }[];
  error?: string;
}

/**
 * Execute an operation with retry logic and exponential backoff
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  retries = 2,
  delayMs = 500
): Promise<T> {
  try {
    return await operation();
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise((res) => setTimeout(res, delayMs));
    return withRetry(operation, retries - 1, delayMs * 2);
  }
}

/**
 * Synchronize local application data to Supabase if configured and enabled.
 * Secondary backup store — errors here NEVER block primary Firestore or local UI operation.
 */
export async function syncDataToSupabase(payload: {
  articles?: Article[];
  mediaPosts?: MediaPost[];
  hadiths?: HadithItem[];
  dhikrs?: DhikrItem[];
  prayerSchedule?: PrayerSchedule;
  news?: NewsItem[];
  announcements?: AnnouncementItem[];
  inquiries?: SupportInquiry[];
}): Promise<SupabaseSyncResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase is not configured or disabled.' };
  }

  const syncedTables: string[] = [];
  const failedTables: { table: string; error: string }[] = [];

  // Helper for safe table sync with retry
  const safeSyncTable = async (tableName: string, syncFn: () => Promise<any>) => {
    try {
      await withRetry(syncFn, 1, 400);
      syncedTables.push(tableName);
    } catch (err: any) {
      console.warn(`[Supabase Backup] Sync failed for table '${tableName}':`, err?.message || err);
      failedTables.push({ table: tableName, error: err?.message || 'Unknown error' });
    }
  };

  // 1. Sync Articles
  if (payload.articles && payload.articles.length > 0) {
    await safeSyncTable('articles', async () => {
      const { error } = await client.from('articles').upsert(
        payload.articles!.map((art) => ({
          id: art.id,
          title: art.title,
          subtitle: art.subtitle,
          category: art.category,
          author: art.author,
          published_date: art.publishedDate,
          excerpt: art.excerpt,
          featured_image: art.featuredImage,
          likes_count: art.likesCount || 0,
          rating: art.rating || 5.0,
          is_archived: !!art.isArchived,
          updated_at: art.updatedAt || new Date().toISOString(),
        })),
        { onConflict: 'id' }
      );
      if (error) throw error;
    });
  }

  // 2. Sync Media Posts & Reels
  if (payload.mediaPosts && payload.mediaPosts.length > 0) {
    await safeSyncTable('media_posts', async () => {
      const { error } = await client.from('media_posts').upsert(
        payload.mediaPosts!.map((post) => ({
          id: post.id,
          title: post.title,
          type: post.type,
          category: post.category,
          author: post.author,
          media_url: post.mediaUrl,
          thumbnail: post.thumbnail,
          caption: post.caption,
          likes_count: post.likesCount || 0,
          is_archived: !!post.isArchived,
          updated_at: post.updatedAt || new Date().toISOString(),
        })),
        { onConflict: 'id' }
      );
      if (error) throw error;
    });
  }

  // 3. Sync Prayer Schedule
  if (payload.prayerSchedule) {
    await safeSyncTable('prayer_schedules', async () => {
      const { error } = await client.from('prayer_schedules').upsert(
        {
          id: 'asaka-main',
          date: payload.prayerSchedule!.date,
          formatted_date_uz: payload.prayerSchedule!.formattedDateUz,
          hijri_date: payload.prayerSchedule!.hijriDate,
          times: payload.prayerSchedule!.times,
          is_published: payload.prayerSchedule!.isAdministratorPublished,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      if (error) throw error;
    });
  }

  // 4. Sync Hadiths
  if (payload.hadiths && payload.hadiths.length > 0) {
    await safeSyncTable('hadiths', async () => {
      const { error } = await client.from('hadiths').upsert(
        payload.hadiths!.map((h) => ({
          id: h.id,
          collection: h.collection,
          number: h.number,
          chapter_uz: h.chapterUz,
          narrator_uz: h.narratorUz,
          text_ar: h.textAr,
          translation_uz: h.translationUz,
          grade: h.grade,
          reference: h.reference,
          is_archived: !!h.isArchived,
          updated_at: h.updatedAt || new Date().toISOString(),
        })),
        { onConflict: 'id' }
      );
      if (error) throw error;
    });
  }

  // 5. Sync Dhikrs
  if (payload.dhikrs && payload.dhikrs.length > 0) {
    await safeSyncTable('dhikrs', async () => {
      const { error } = await client.from('dhikrs').upsert(
        payload.dhikrs!.map((d) => ({
          id: d.id,
          category: d.category,
          title_uz: d.titleUz,
          text_ar: d.textAr,
          transliteration_uz: d.transliterationUz,
          translation_uz: d.translationUz,
          target_count: d.targetCount,
          virtue_uz: d.virtueUz,
          is_archived: !!d.isArchived,
          updated_at: d.updatedAt || new Date().toISOString(),
        })),
        { onConflict: 'id' }
      );
      if (error) throw error;
    });
  }

  // 6. Sync News
  if (payload.news && payload.news.length > 0) {
    await safeSyncTable('news', async () => {
      const { error } = await client.from('news').upsert(
        payload.news!.map((n) => ({
          id: n.id,
          title: n.title,
          category: n.category,
          summary: n.summary,
          content: n.content,
          source: n.source,
          image_url: n.imageUrl,
          is_important: !!n.isImportant,
          is_archived: !!n.isArchived,
          updated_at: n.updatedAt || new Date().toISOString(),
        })),
        { onConflict: 'id' }
      );
      if (error) throw error;
    });
  }

  // 7. Sync Announcements
  if (payload.announcements && payload.announcements.length > 0) {
    await safeSyncTable('announcements', async () => {
      const { error } = await client.from('announcements').upsert(
        payload.announcements!.map((a) => ({
          id: a.id,
          title: a.title,
          type: a.type,
          date: a.date,
          time: a.time,
          location: a.location,
          speaker: a.speaker,
          description: a.description,
          is_pinned: !!a.isPinned,
          is_archived: !!a.isArchived,
          updated_at: a.updatedAt || new Date().toISOString(),
        })),
        { onConflict: 'id' }
      );
      if (error) throw error;
    });
  }

  // 8. Sync Support Inquiries
  if (payload.inquiries && payload.inquiries.length > 0) {
    await safeSyncTable('inquiries', async () => {
      const { error } = await client.from('inquiries').upsert(
        payload.inquiries!.map((inq) => ({
          id: inq.id,
          user_name: inq.userName,
          user_phone: inq.userPhone,
          user_email: inq.userEmail,
          subject: inq.subject,
          message: inq.message,
          created_at: inq.createdAt,
          status: inq.status,
          admin_reply: inq.adminReply,
          replied_at: inq.repliedAt,
          replied_by: inq.repliedBy,
          is_archived: !!inq.isArchived,
          updated_at: inq.updatedAt || new Date().toISOString(),
        })),
        { onConflict: 'id' }
      );
      if (error) throw error;
    });
  }

  return {
    success: syncedTables.length > 0,
    syncedTables,
    failedTables: failedTables.length > 0 ? failedTables : undefined,
  };
}

/**
 * Fetch data from Supabase tables to hydrate client state if needed.
 */
export async function fetchAllFromSupabase(): Promise<{
  articles?: Article[];
  mediaPosts?: MediaPost[];
  news?: NewsItem[];
  announcements?: AnnouncementItem[];
  success: boolean;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase disabled or not configured' };
  }

  try {
    const [articlesRes, mediaRes, newsRes, annRes] = await Promise.allSettled([
      client.from('articles').select('*'),
      client.from('media_posts').select('*'),
      client.from('news').select('*'),
      client.from('announcements').select('*'),
    ]);

    const articlesData = articlesRes.status === 'fulfilled' ? articlesRes.value.data : null;
    const mediaData = mediaRes.status === 'fulfilled' ? mediaRes.value.data : null;
    const newsData = newsRes.status === 'fulfilled' ? newsRes.value.data : null;
    const annData = annRes.status === 'fulfilled' ? annRes.value.data : null;

    const articles: Article[] = articlesData
      ? articlesData.map((row: any) => ({
          id: row.id,
          title: row.title,
          subtitle: row.subtitle,
          category: row.category,
          author: row.author,
          authorRole: 'Tahririyat Hayʼati',
          publishedDate: row.published_date,
          readTimeMinutes: 5,
          featuredImage: row.featured_image || '/images/quran_illumination_art_1793634658336.jpg',
          excerpt: row.excerpt,
          bodyParagraphs: [row.excerpt || ''],
          likesCount: row.likes_count || 0,
          rating: row.rating || 5.0,
          ratingsCount: 1,
          isArchived: !!row.is_archived,
          comments: [],
        }))
      : [];

    const mediaPosts: MediaPost[] = mediaData
      ? mediaData.map((row: any) => ({
          id: row.id,
          title: row.title,
          type: row.type || 'reel',
          category: row.category || 'Qurʼon qiroati',
          author: row.author || 'Asaka Ziyo Studiyasi',
          publishedDate: 'Bugun',
          mediaUrl: row.media_url,
          thumbnail: row.thumbnail || row.media_url,
          caption: row.caption,
          likesCount: row.likes_count || 0,
          commentsCount: 0,
          isPublished: true,
          isArchived: !!row.is_archived,
          comments: [],
        }))
      : [];

    const news: NewsItem[] = newsData
      ? newsData.map((row: any) => ({
          id: row.id,
          title: row.title,
          publishedDate: 'Bugun',
          category: row.category || 'Xabarlar',
          summary: row.summary || '',
          content: row.content || '',
          source: row.source || 'Asaka Ziyo',
          imageUrl: row.image_url,
          isImportant: !!row.is_important,
          isArchived: !!row.is_archived,
        }))
      : [];

    const announcements: AnnouncementItem[] = annData
      ? annData.map((row: any) => ({
          id: row.id,
          title: row.title,
          type: row.type || 'juma',
          typeLabelUz: row.type === 'juma' ? 'Juma maʼruzasi' : 'Eʼlon',
          date: row.date || 'Bugun',
          time: row.time,
          location: row.location || 'Asaka',
          description: row.description || '',
          isPinned: !!row.is_pinned,
          isArchived: !!row.is_archived,
        }))
      : [];

    return {
      success: true,
      articles: articles.length > 0 ? articles : undefined,
      mediaPosts: mediaPosts.length > 0 ? mediaPosts : undefined,
      news: news.length > 0 ? news : undefined,
      announcements: announcements.length > 0 ? announcements : undefined,
    };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}
