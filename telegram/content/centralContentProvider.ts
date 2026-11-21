/**
 * ASAKA ZIYO — Unified Ecosystem Central Content Provider
 *
 * Single source of truth bridge connecting the central Firestore-backed database
 * (Web App + Android App) directly to the Telegram Bot Platform in real time.
 *
 * Guarantees:
 * - Same unified IDs across Web App, Android App, and Telegram Bot
 * - Only admin-approved `published` items are exposed to end users
 * - Archived (`isArchived === true` or `status === 'archived'`), `draft`, or future `scheduled`
 *   items are immediately excluded from end-user views
 * - Live edits in Admin Panel reflect immediately in Telegram Bot without restart
 */

import { Article, NewsItem, AnnouncementItem, MediaPost, HadithItem, DhikrItem, PrayerSchedule, QuranReciter } from '../../src/types';
import { EDITORIAL_ARTICLES } from '../../src/data/articlesData';
import {
  COMMUNITY_NEWS,
  COMMUNITY_ANNOUNCEMENTS,
} from '../../src/data/newsAndAnnouncementsData';
import { AUTHENTIC_HADITHS } from '../../src/data/hadithData';
import { AUTHENTIC_DHIKRS } from '../../src/data/dhikrData';
import { ADHAN_TRACKS } from '../../src/data/adhanTracksData';
import { QURAN_RECITERS } from '../../src/data/quranData';

export type UnifiedContentStatus = 'draft' | 'scheduled' | 'published' | 'archived';

export interface UnifiedAudioItem {
  id: string;
  title: string;
  author: string;
  category: string;
  mediaUrl: string;
  duration?: string;
  caption?: string;
  publishedDate?: string;
  status: UnifiedContentStatus;
  source: 'mediaPosts' | 'ownAudioLibrary' | 'adhanLibrary' | 'builtin';
}

export interface UnifiedVideoItem {
  id: string;
  title: string;
  author: string;
  category: string;
  mediaUrl: string;
  thumbnail?: string;
  caption?: string;
  publishedDate?: string;
  status: UnifiedContentStatus;
  source: 'mediaPosts';
}

export interface CentralDatabaseSnapshot {
  prayerSchedule?: PrayerSchedule | null;
  articles?: Array<Article & { status?: UnifiedContentStatus; isArchived?: boolean; updatedAt?: string }>;
  news?: Array<NewsItem & { status?: UnifiedContentStatus; isArchived?: boolean; updatedAt?: string }>;
  announcements?: Array<AnnouncementItem & { status?: UnifiedContentStatus; isArchived?: boolean; updatedAt?: string }>;
  hadiths?: Array<HadithItem & { status?: UnifiedContentStatus; isArchived?: boolean; updatedAt?: string }>;
  dhikrs?: Array<DhikrItem & { status?: UnifiedContentStatus; isArchived?: boolean; updatedAt?: string }>;
  mediaPosts?: Array<MediaPost & { status?: UnifiedContentStatus; isArchived?: boolean; updatedAt?: string }>;
  adhanLibrary?: Array<{
    id: string;
    name?: string;
    title?: string;
    muezzin?: string;
    origin?: string;
    audioUrl?: string;
    url?: string;
    duration?: string;
    isArchived?: boolean;
    status?: UnifiedContentStatus;
  }>;
  ownAudioLibrary?: Array<{
    id: string;
    title?: string;
    name?: string;
    author?: string;
    category?: string;
    audioUrl?: string;
    url?: string;
    duration?: string;
    description?: string;
    isArchived?: boolean;
    status?: UnifiedContentStatus;
  }>;
  quizQuestions?: Array<{
    id: string;
    questionUz: string;
    optionsUz: string[];
    correctIndex: number;
    explanationUz: string;
    source?: string;
    category?: string;
    isApproved?: boolean;
    isArchived?: boolean;
    status?: UnifiedContentStatus;
  }>;
  mosqueEvents?: Array<{
    id: string;
    title: string;
    date?: string;
    time?: string;
    location?: string;
    description?: string;
    isArchived?: boolean;
    status?: UnifiedContentStatus;
  }>;
  quranReciters?: QuranReciter[];
  quranAudioOverrides?: Record<string, any>;
  updatedAt?: string;
}

export type CentralDatabaseReader = () => CentralDatabaseSnapshot;

export function isRecordVisibleToEndUsers(record: {
  isArchived?: boolean;
  isPublished?: boolean;
  status?: string;
  scheduledAt?: string;
}): boolean {
  if (!record) return false;
  if (record.isArchived === true) return false;
  if (record.isPublished === false) return false;
  if (record.status) {
    const s = record.status.toLowerCase();
    if (s === 'draft' || s === 'archived' || s === 'rejected' || s === 'deleted') return false;
    if (s === 'scheduled') {
      if (!record.scheduledAt) return false;
      const ts = Date.parse(record.scheduledAt);
      if (Number.isNaN(ts) || ts > Date.now()) return false;
    }
  }
  return true;
}

/**
 * Merges live central records (primary) with built-in seed defaults while strictly
 * honoring admin updates and archive/draft tombstones on the same unified ID.
 */
function mergeLiveWithSeeds<T extends { id: string; isArchived?: boolean; status?: string; isPublished?: boolean; scheduledAt?: string }>(
  liveItems: T[] | undefined,
  seedItems: T[]
): T[] {
  const liveById = new Map<string, T>();
  const orderedLive: T[] = [];

  for (const item of liveItems || []) {
    if (!item || !item.id) continue;
    liveById.set(item.id, item);
    if (isRecordVisibleToEndUsers(item)) {
      orderedLive.push(item);
    }
  }

  // Append built-in seed items ONLY if they haven't been overridden or archived in central DB
  const remainingSeeds = seedItems.filter((seed) => !liveById.has(seed.id));
  return [...orderedLive, ...remainingSeeds];
}

export class CentralContentProvider {
  private reader: CentralDatabaseReader;

  constructor(reader?: CentralDatabaseReader) {
    this.reader = reader || (() => ({}));
  }

  setReader(reader: CentralDatabaseReader): void {
    this.reader = reader;
  }

  getSnapshot(): CentralDatabaseSnapshot {
    try {
      return this.reader() || {};
    } catch {
      return {};
    }
  }

  getPublishedArticles(): Article[] {
    const snap = this.getSnapshot();
    return mergeLiveWithSeeds(snap.articles, EDITORIAL_ARTICLES);
  }

  getArticleById(id: string): Article | null {
    return this.getPublishedArticles().find((a) => a.id === id) || null;
  }

  getPublishedNews(): NewsItem[] {
    const snap = this.getSnapshot();
    return mergeLiveWithSeeds(snap.news, COMMUNITY_NEWS);
  }

  getNewsById(id: string): NewsItem | null {
    return this.getPublishedNews().find((n) => n.id === id) || null;
  }

  getPublishedAnnouncements(): AnnouncementItem[] {
    const snap = this.getSnapshot();
    return mergeLiveWithSeeds(snap.announcements, COMMUNITY_ANNOUNCEMENTS);
  }

  getAnnouncementById(id: string): AnnouncementItem | null {
    return this.getPublishedAnnouncements().find((a) => a.id === id) || null;
  }

  getPublishedHadiths(): HadithItem[] {
    const snap = this.getSnapshot();
    return mergeLiveWithSeeds(snap.hadiths, AUTHENTIC_HADITHS);
  }

  getHadithById(id: string): HadithItem | null {
    return this.getPublishedHadiths().find((h) => h.id === id) || null;
  }

  getPublishedDhikrs(): DhikrItem[] {
    const snap = this.getSnapshot();
    return mergeLiveWithSeeds(snap.dhikrs, AUTHENTIC_DHIKRS);
  }

  getPublishedAudioItems(): UnifiedAudioItem[] {
    const snap = this.getSnapshot();
    const out: UnifiedAudioItem[] = [];
    const seen = new Set<string>();

    // 1. Live mediaPosts where type === 'audio'
    for (const p of snap.mediaPosts || []) {
      if (!p?.id || p.type !== 'audio' || !isRecordVisibleToEndUsers(p)) continue;
      seen.add(p.id);
      out.push({
        id: p.id,
        title: p.title,
        author: p.author || 'ASAKA ZIYO',
        category: p.category || 'Audio',
        mediaUrl: p.mediaUrl,
        caption: p.caption,
        publishedDate: p.publishedDate,
        status: 'published',
        source: 'mediaPosts',
      });
    }

    // 2. Live admin ownAudioLibrary
    for (const item of snap.ownAudioLibrary || []) {
      if (!item?.id || !isRecordVisibleToEndUsers(item) || seen.has(item.id)) continue;
      const url = item.audioUrl || item.url || '';
      if (!url) continue;
      seen.add(item.id);
      out.push({
        id: item.id,
        title: item.title || item.name || 'Audio material',
        author: item.author || 'ASAKA ZIYO',
        category: item.category || 'Maʼruza / Audio',
        mediaUrl: url,
        duration: item.duration,
        caption: item.description,
        status: 'published',
        source: 'ownAudioLibrary',
      });
    }

    // 3. Live admin adhanLibrary
    for (const adhan of snap.adhanLibrary || []) {
      if (!adhan?.id || !isRecordVisibleToEndUsers(adhan) || seen.has(adhan.id)) continue;
      const url = adhan.audioUrl || adhan.url || '';
      if (!url) continue;
      seen.add(adhan.id);
      out.push({
        id: adhan.id,
        title: adhan.name || adhan.title || 'Azon',
        author: adhan.muezzin || 'Muazzin',
        category: adhan.origin || 'Azon',
        mediaUrl: url,
        duration: adhan.duration,
        status: 'published',
        source: 'adhanLibrary',
      });
    }

    // 4. Built-in verified Adhan tracks (fallback if not overridden)
    for (const track of ADHAN_TRACKS) {
      if (seen.has(track.id)) continue;
      seen.add(track.id);
      out.push({
        id: track.id,
        title: track.titleUz,
        author: track.muezzinUz,
        category: track.styleUz,
        mediaUrl: track.audioUrl,
        duration: track.durationLabel,
        caption: track.descriptionUz,
        status: 'published',
        source: 'builtin',
      });
    }

    return out;
  }

  getPublishedVideoItems(): UnifiedVideoItem[] {
    const snap = this.getSnapshot();
    const out: UnifiedVideoItem[] = [];
    const seen = new Set<string>();

    for (const p of snap.mediaPosts || []) {
      if (!p?.id || p.type !== 'video' || !isRecordVisibleToEndUsers(p)) continue;
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push({
        id: p.id,
        title: p.title,
        author: p.author || 'ASAKA ZIYO',
        category: p.category || 'Video',
        mediaUrl: p.mediaUrl,
        thumbnail: p.thumbnail,
        caption: p.caption,
        publishedDate: p.publishedDate,
        status: 'published',
        source: 'mediaPosts',
      });
    }

    return out;
  }

  getPrayerSchedule(): PrayerSchedule | null {
    return this.getSnapshot().prayerSchedule || null;
  }

  getPublishedMosqueEvents() {
    const snap = this.getSnapshot();
    return (snap.mosqueEvents || []).filter((ev) => ev && ev.id && isRecordVisibleToEndUsers(ev));
  }

  getActiveQuranReciters(): QuranReciter[] {
    return [...QURAN_RECITERS];
  }

  getSummaryCounts() {
    return {
      articles: this.getPublishedArticles().length,
      news: this.getPublishedNews().length,
      announcements: this.getPublishedAnnouncements().length,
      hadiths: this.getPublishedHadiths().length,
      dhikrs: this.getPublishedDhikrs().length,
      audio: this.getPublishedAudioItems().length,
      video: this.getPublishedVideoItems().length,
      mosqueEvents: this.getPublishedMosqueEvents().length,
      hasPrayerSchedule: Boolean(this.getPrayerSchedule()),
    };
  }
}
