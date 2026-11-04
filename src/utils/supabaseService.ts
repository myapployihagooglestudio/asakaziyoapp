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
} from '../types';

export interface SupabaseSyncResult {
  success: boolean;
  syncedTables?: string[];
  error?: string;
}

/**
 * Synchronize local application data to Supabase if configured and enabled.
 */
export async function syncDataToSupabase(payload: {
  articles?: Article[];
  mediaPosts?: MediaPost[];
  hadiths?: HadithItem[];
  dhikrs?: DhikrItem[];
  prayerSchedule?: PrayerSchedule;
}): Promise<SupabaseSyncResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase is not configured or disabled.' };
  }

  const syncedTables: string[] = [];

  try {
    // 1. Sync Articles
    if (payload.articles && payload.articles.length > 0) {
      const { error } = await client.from('articles').upsert(
        payload.articles.map((art) => ({
          id: art.id,
          title: art.title,
          subtitle: art.subtitle,
          category: art.category,
          author: art.author,
          published_date: art.publishedDate,
          excerpt: art.excerpt,
          featured_image: art.featuredImage,
          likes_count: art.likesCount,
          rating: art.rating,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: 'id' }
      );
      if (!error) syncedTables.push('articles');
    }

    // 2. Sync Media Posts & Reels
    if (payload.mediaPosts && payload.mediaPosts.length > 0) {
      const { error } = await client.from('media_posts').upsert(
        payload.mediaPosts.map((post) => ({
          id: post.id,
          title: post.title,
          type: post.type,
          category: post.category,
          author: post.author,
          media_url: post.mediaUrl,
          thumbnail: post.thumbnail,
          caption: post.caption,
          likes_count: post.likesCount,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: 'id' }
      );
      if (!error) syncedTables.push('media_posts');
    }

    // 3. Sync Prayer Schedule
    if (payload.prayerSchedule) {
      const { error } = await client.from('prayer_schedules').upsert(
        {
          id: 'asaka-main',
          date: payload.prayerSchedule.date,
          formatted_date_uz: payload.prayerSchedule.formattedDateUz,
          hijri_date: payload.prayerSchedule.hijriDate,
          times: payload.prayerSchedule.times,
          is_published: payload.prayerSchedule.isAdministratorPublished,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      if (!error) syncedTables.push('prayer_schedules');
    }

    return { success: true, syncedTables };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Supabase synchronization error' };
  }
}

/**
 * Fetch data from Supabase tables to hydrate client state if needed.
 */
export async function fetchAllFromSupabase(): Promise<{
  articles?: Article[];
  mediaPosts?: MediaPost[];
  success: boolean;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase disabled' };
  }

  try {
    const { data: articlesData, error: artErr } = await client.from('articles').select('*');
    const { data: mediaData, error: mediaErr } = await client.from('media_posts').select('*');

    const articles: Article[] =
      !artErr && articlesData
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
            comments: [],
          }))
        : [];

    const mediaPosts: MediaPost[] =
      !mediaErr && mediaData
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
            comments: [],
          }))
        : [];

    return {
      success: true,
      articles: articles.length > 0 ? articles : undefined,
      mediaPosts: mediaPosts.length > 0 ? mediaPosts : undefined,
    };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}
