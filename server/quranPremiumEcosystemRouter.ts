/**
 * ASAKA ZIYO — Unified Qur'on Ecosystem, Persistent Audio Storage, Premium Subscription,
 * Manual Card Payment, Fair Random Draw, Telegram Mini App HMAC Auth & Account Link REST Router (2026)
 */

import fs from 'fs';
import { Router, Request, Response, NextFunction } from 'express';
import { QuranEcosystemService, AudioPublishStatus } from '../src/services/quranEcosystemServer';
import {
  SubscriptionEcosystemService,
  SubscriptionPlanId,
  PlatformId,
  ALL_PLATFORMS,
} from '../src/services/subscriptionEcosystemServer';
import { getPaymentGatewayStatus, verifyPaymeBasicAuth } from './paymentGatewayAdapter';

export interface QuranPremiumRouterDeps {
  quranService: QuranEcosystemService;
  subscriptionService: SubscriptionEcosystemService;
  requireAdminAuth: (req: Request, res: Response, next: NextFunction) => void;
  sensitiveActionLimiter: (req: Request, res: Response, next: NextFunction) => void;
  extractAdminEmail: (req: Request) => string;
}

const VALID_PLAN_IDS = new Set<string>(['free', 'premium_1m', 'premium_3m', 'premium_6m']);
const VALID_AUDIO_STATUSES = new Set<string>(['DRAFT', 'VERIFIED', 'PUBLISHED', 'ARCHIVED']);

export function createQuranPremiumEcosystemRouter(deps: QuranPremiumRouterDeps): Router {
  const router = Router();
  const { quranService, subscriptionService, requireAdminAuth, sensitiveActionLimiter, extractAdminEmail } = deps;

  // =========================================================================
  // A. QUR'ON ECOSYSTEM — PUBLIC / USER ROUTES
  // =========================================================================

  // List active Qorilar (verified + admin uploaded counts)
  router.get('/api/quran-ecosystem/qaris', (_req: Request, res: Response) => {
    try {
      return res.json({
        success: true,
        qaris: quranService.listQaris(false),
        storageStats: quranService.getSystemStorageStats(),
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Qorilar roʻyxatini olishda xatolik' });
    }
  });

  // Get 114-surah catalog for a specific Qari (published uploaded files + verified CDN URLs)
  router.get('/api/quran-ecosystem/qaris/:qariId/surahs', (req: Request, res: Response) => {
    try {
      const catalog = quranService.getQariSurahCatalog(req.params.qariId, false);
      if (!catalog) {
        return res.status(404).json({ success: false, error: 'Qori topilmadi.' });
      }
      return res.json({ success: true, ...catalog });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Suralar roʻyxatini olishda xatolik' });
    }
  });

  // HTTP Range-capable Persistent Audio Streaming Endpoint (supports seeking, ExoPlayer, PWA Cache, Telegram)
  router.get('/api/quran-ecosystem/audio-stream/:audioId', (req: Request, res: Response) => {
    try {
      const audioId = String(req.params.audioId || '').trim();
      const rec = quranService.getAudioRecord(audioId);
      if (!rec) {
        return res.status(404).json({ success: false, error: 'Audio fayl topilmadi.' });
      }
      // Unpublished files only allowed for preview if admin session cookie/header is present,
      // otherwise strictly require PUBLISHED or VERIFIED (for admin preview param)
      const isPreview = req.query.preview === '1';
      if (rec.status !== 'PUBLISHED' && !isPreview) {
        return res.status(403).json({ success: false, error: 'Ushbu audio hali eʼlon qilinmagan.' });
      }

      const absPath = quranService.resolveAudioFilePath(audioId, isPreview);
      if (!absPath || !fs.existsSync(absPath)) {
        return res.status(404).json({ success: false, error: 'Audio fayl server xotirasida topilmadi.' });
      }

      const stat = fs.statSync(absPath);
      const fileSize = stat.size;
      const range = req.headers.range;

      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Type', rec.mimeType || 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=604800');
      res.setHeader('ETag', `"${rec.sha256}"`);
      res.setHeader('X-Audio-SHA256', rec.sha256);

      if (range) {
        const match = /bytes=(\d*)-(\d*)/.exec(range);
        if (!match) {
          return res.status(416).end();
        }
        const start = match[1] ? parseInt(match[1], 10) : 0;
        const end = match[2] ? Math.min(parseInt(match[2], 10), fileSize - 1) : fileSize - 1;
        if (start >= fileSize || start > end) {
          res.setHeader('Content-Range', `bytes */${fileSize}`);
          return res.status(416).end();
        }
        const chunkSize = end - start + 1;
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        res.setHeader('Content-Length', chunkSize);
        return fs.createReadStream(absPath, { start, end }).pipe(res);
      }

      res.setHeader('Content-Length', fileSize);
      return fs.createReadStream(absPath).pipe(res);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Audio oqimida xatolik' });
    }
  });

  // Playlists (Official + Personal)
  router.get('/api/quran-ecosystem/playlists', (req: Request, res: Response) => {
    const rawUserId = String(req.query.userId || '').trim();
    const userId = rawUserId ? subscriptionService.resolveCanonicalUserId(rawUserId) : undefined;
    const data = quranService.listPlaylists(userId);
    return res.json({ success: true, ...data });
  });

  router.get('/api/quran-ecosystem/playlists/share/:slug', (req: Request, res: Response) => {
    const pl = quranService.getPlaylistBySlug(req.params.slug);
    if (!pl || !pl.isPublic) {
      return res.status(404).json({ success: false, error: 'Playlist topilmadi.' });
    }
    return res.json({ success: true, playlist: pl });
  });

  router.post('/api/quran-ecosystem/playlists', async (req: Request, res: Response) => {
    try {
      const { id, userId, titleUz, descriptionUz, category, isPublic, tracks } = req.body || {};
      if (!userId || !titleUz || typeof titleUz !== 'string') {
        return res.status(400).json({ success: false, error: 'userId va titleUz majburiy.' });
      }
      const canonicalUser = subscriptionService.resolveCanonicalUserId(String(userId));
      const reqPlatform: PlatformId = ALL_PLATFORMS.includes(req.body?.platform) ? req.body.platform : 'web';
      const existing = quranService.listPlaylists(canonicalUser).personal;
      if (!id) {
        const decision = subscriptionService.checkFeatureEntitlement(
          canonicalUser,
          'unlimited_playlists',
          reqPlatform,
          { consume: false }
        );
        if (!decision.allowed && decision.reasonCode !== 'USAGE_LIMIT_REACHED') {
          return res.status(403).json({
            success: false,
            code: decision.reasonCode,
            error: decision.messageUz,
            entitlement: decision,
          });
        }
        if (decision.limit >= 0 && existing.length >= decision.limit) {
          return res.status(403).json({
            success: false,
            code: 'PREMIUM_REQUIRED',
            error:
              decision.feature?.userNoticeUz ||
              `Bepul tarifda koʻpi bilan ${decision.limit} ta shaxsiy playlist yaratish mumkin. Cheksiz playlistlar uchun Premium faollashtiring.`,
            entitlement: decision,
          });
        }
      }

      const playlist = await quranService.upsertPlaylist({
        id,
        ownerUserId: canonicalUser,
        isOfficial: false,
        titleUz,
        descriptionUz,
        category,
        isPublic,
        tracks: Array.isArray(tracks) ? tracks : [],
      });
      return res.json({ success: true, playlist });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err?.message || 'Playlist saqlashda xatolik' });
    }
  });

  router.delete('/api/quran-ecosystem/playlists/:playlistId', (req: Request, res: Response) => {
    const rawUserId = String(req.query.userId || req.body?.userId || '').trim();
    if (!rawUserId) return res.status(400).json({ success: false, error: 'userId majburiy.' });
    const canonicalUser = subscriptionService.resolveCanonicalUserId(rawUserId);
    const out = quranService.deletePlaylist(req.params.playlistId, canonicalUser, false);
    if (!out.ok) return res.status(403).json({ success: false, error: out.error });
    return res.json({ success: true });
  });

  // Education Catalog (28 Arabic Letters + Makharij, Tajweed Courses/Lessons, Quiz Bank)
  router.get('/api/quran-ecosystem/education', (_req: Request, res: Response) => {
    return res.json({
      success: true,
      ...quranService.getEducationCatalog(false),
    });
  });

  // Cross-Platform User Qur'on Profile (Mushaf bookmarks/notes, Hifz, Tajweed progress, quiz scores)
  router.get('/api/quran-ecosystem/profile/:userId', (req: Request, res: Response) => {
    const canonical = subscriptionService.resolveCanonicalUserId(req.params.userId);
    return res.json({
      success: true,
      canonicalUserId: canonical,
      profile: quranService.getUserProfile(canonical),
    });
  });

  router.put('/api/quran-ecosystem/profile/:userId', async (req: Request, res: Response) => {
    try {
      const canonical = subscriptionService.resolveCanonicalUserId(req.params.userId);
      const profile = await quranService.updateUserProfile(canonical, req.body || {});
      return res.json({ success: true, canonicalUserId: canonical, profile });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err?.message || 'Profilni yangilashda xatolik' });
    }
  });

  // Unified Cross-Platform User Sync State (Web App + Android + Telegram Mini App + Telegram Bot)
  router.get('/api/user/sync-state/:userId', (req: Request, res: Response) => {
    const rawUserId = String(req.params.userId || '').trim();
    if (!rawUserId || rawUserId.length > 160) {
      return res.status(400).json({ success: false, error: 'Yaroqsiz userId.' });
    }
    const canonical = subscriptionService.resolveCanonicalUserId(rawUserId);
    const profile = quranService.getUserProfile(canonical);
    const subscription = subscriptionService.getEffectiveSubscription(canonical);
    return res.json({
      success: true,
      canonicalUserId: canonical,
      language: profile.preferredLanguage || null,
      theme: profile.preferredTheme || null,
      favorites: Array.isArray(profile.favoriteItems) ? profile.favoriteItems : [],
      bookmarks: Array.isArray(profile.bookmarks) ? profile.bookmarks : [],
      hifzRanges: Array.isArray(profile.hifzRanges) ? profile.hifzRanges : [],
      readingProgress: {
        lastReadSurah: profile.lastReadSurah,
        lastReadAyah: profile.lastReadAyah,
        lastReadPage: profile.lastReadPage,
        todayAyahsRead: profile.todayAyahsRead,
        dailyGoalAyahs: profile.dailyGoalAyahs,
        dailyGoalMinutes: profile.dailyGoalMinutes,
        streakDays: profile.streakDays,
      },
      subscription,
      lastPlatform: profile.lastPlatform || 'web',
      updatedAt: profile.updatedAt,
    });
  });

  router.put('/api/user/sync-state/:userId', async (req: Request, res: Response) => {
    try {
      const rawUserId = String(req.params.userId || '').trim();
      if (!rawUserId || rawUserId.length > 160) {
        return res.status(400).json({ success: false, error: 'Yaroqsiz userId.' });
      }
      const canonical = subscriptionService.resolveCanonicalUserId(rawUserId);
      const profile = await quranService.mergeUserSyncState(canonical, req.body || {});
      return res.json({
        success: true,
        canonicalUserId: canonical,
        language: profile.preferredLanguage || null,
        theme: profile.preferredTheme || null,
        favorites: Array.isArray(profile.favoriteItems) ? profile.favoriteItems : [],
        bookmarks: Array.isArray(profile.bookmarks) ? profile.bookmarks : [],
        hifzRanges: Array.isArray(profile.hifzRanges) ? profile.hifzRanges : [],
        readingProgress: {
          lastReadSurah: profile.lastReadSurah,
          lastReadAyah: profile.lastReadAyah,
          lastReadPage: profile.lastReadPage,
          todayAyahsRead: profile.todayAyahsRead,
          dailyGoalAyahs: profile.dailyGoalAyahs,
          dailyGoalMinutes: profile.dailyGoalMinutes,
          streakDays: profile.streakDays,
        },
        lastPlatform: profile.lastPlatform || 'web',
        updatedAt: profile.updatedAt,
      });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err?.message || 'Foydalanuvchi holatini sinxronlashda xatolik' });
    }
  });

  // =========================================================================
  // B. QUR'ON ECOSYSTEM — ADMIN ROUTES (Qorilar, 114-Surah Upload, Education)
  // =========================================================================

  router.get('/api/admin/quran-ecosystem/overview', requireAdminAuth, (_req: Request, res: Response) => {
    return res.json({
      success: true,
      qaris: quranService.listQaris(true),
      playlists: quranService.listPlaylists().official,
      education: quranService.getEducationCatalog(true),
      storageStats: quranService.getSystemStorageStats(),
      auditLogs: quranService.getAuditLogs(100),
    });
  });

  router.get('/api/admin/quran-ecosystem/qaris/:qariId/surahs', requireAdminAuth, (req: Request, res: Response) => {
    const catalog = quranService.getQariSurahCatalog(req.params.qariId, true);
    if (!catalog) return res.status(404).json({ success: false, error: 'Qori topilmadi.' });
    return res.json({ success: true, ...catalog });
  });

  router.post('/api/admin/quran-ecosystem/qaris', requireAdminAuth, sensitiveActionLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.body?.nameUz || typeof req.body.nameUz !== 'string') {
        return res.status(400).json({ success: false, error: 'Qori ismi (nameUz) majburiy.' });
      }
      const qari = await quranService.upsertQari(req.body, extractAdminEmail(req));
      return res.json({ success: true, qari });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err?.message || 'Qori saqlashda xatolik' });
    }
  });

  router.delete('/api/admin/quran-ecosystem/qaris/:qariId', requireAdminAuth, sensitiveActionLimiter, async (req: Request, res: Response) => {
    const force = req.query.force === 'true' || req.body?.force === true;
    const out = await quranService.deleteQari(req.params.qariId, extractAdminEmail(req), force);
    if (!out.ok) return res.status(400).json({ success: false, error: out.error });
    return res.json({ success: true });
  });

  // Upload a single Surah audio (base64 data URI or base64 payload) with SHA-256 & magic-byte validation
  router.post('/api/admin/quran-ecosystem/audio/upload', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { qariId, surahNumber, audioBase64, mimeType, originalFilename, durationSec, autoPublish, allowDuplicateChecksum } = req.body || {};
      if (!qariId || !surahNumber || !audioBase64 || typeof audioBase64 !== 'string') {
        return res.status(400).json({ success: false, error: 'qariId, surahNumber va audioBase64 majburiy.' });
      }
      const cleanedB64 = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;
      const buffer = Buffer.from(cleanedB64, 'base64');

      const result = await quranService.uploadQariSurahAudio({
        qariId: String(qariId),
        surahNumber: Number(surahNumber),
        buffer,
        mimeType: mimeType ? String(mimeType) : undefined,
        originalFilename: originalFilename ? String(originalFilename) : undefined,
        durationSec: durationSec ? Number(durationSec) : undefined,
        autoPublish: Boolean(autoPublish),
        allowDuplicateChecksum: Boolean(allowDuplicateChecksum),
        actor: extractAdminEmail(req),
      });

      if (!result.ok) {
        return res.status(result.duplicateOf ? 409 : 400).json({
          success: false,
          error: result.error,
          duplicateOf: result.duplicateOf,
        });
      }
      return res.json({ success: true, record: result.record });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Audio yuklashda xatolik' });
    }
  });

  router.patch('/api/admin/quran-ecosystem/audio/:audioId/status', requireAdminAuth, async (req: Request, res: Response) => {
    const status = String(req.body?.status || '').toUpperCase();
    if (!VALID_AUDIO_STATUSES.has(status)) {
      return res.status(400).json({ success: false, error: 'Yaroqsiz status (DRAFT, VERIFIED, PUBLISHED, ARCHIVED).' });
    }
    const result = await quranService.setAudioStatus(req.params.audioId, status as AudioPublishStatus, extractAdminEmail(req));
    if (!result.ok) return res.status(400).json({ success: false, error: result.error });
    return res.json({ success: true, record: result.record });
  });

  router.post('/api/admin/quran-ecosystem/qaris/:qariId/publish-all', requireAdminAuth, async (req: Request, res: Response) => {
    const out = await quranService.publishAllVerifiedForQari(req.params.qariId, extractAdminEmail(req));
    return res.json({ success: true, ...out });
  });

  router.post('/api/admin/quran-ecosystem/qaris/:qariId/avatar', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { imageBase64 } = req.body || {};
      if (!imageBase64 || typeof imageBase64 !== 'string') {
        return res.status(400).json({ success: false, error: 'imageBase64 majburiy.' });
      }
      const cleaned = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
      const buf = Buffer.from(cleaned, 'base64');
      const out = await quranService.uploadQariAvatar(req.params.qariId, buf, extractAdminEmail(req));
      if (!out.ok) return res.status(400).json({ success: false, error: out.error });
      return res.json({ success: true, avatarUrl: out.avatarUrl, qari: out.qari });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Profil rasmini yuklashda xatolik' });
    }
  });

  // Resumable Chunked Audio Upload (supports large surahs + automatic retry on interruption)
  router.post('/api/admin/quran-ecosystem/audio/upload-chunk', requireAdminAuth, (req: Request, res: Response) => {
    try {
      const { uploadId, chunkIndex, totalChunks, chunkBase64 } = req.body || {};
      if (!uploadId || chunkBase64 === undefined || totalChunks === undefined) {
        return res.status(400).json({ success: false, error: 'uploadId, chunkIndex, totalChunks va chunkBase64 majburiy.' });
      }
      const cleaned = String(chunkBase64).includes(',') ? String(chunkBase64).split(',')[1] : String(chunkBase64);
      const chunkBuffer = Buffer.from(cleaned, 'base64');
      const out = quranService.appendAudioUploadChunk({
        uploadId: String(uploadId),
        chunkIndex: Number(chunkIndex),
        totalChunks: Number(totalChunks),
        chunkBuffer,
      });
      if (!out.ok) return res.status(400).json({ success: false, error: out.error });
      return res.json({ success: true, ...out });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Chunk yuklashda xatolik' });
    }
  });

  router.post('/api/admin/quran-ecosystem/audio/upload-complete', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { uploadId, totalChunks, qariId, surahNumber, mimeType, originalFilename, durationSec, autoPublish, allowDuplicateChecksum } = req.body || {};
      if (!uploadId || !qariId || !surahNumber || !totalChunks) {
        return res.status(400).json({ success: false, error: 'uploadId, totalChunks, qariId va surahNumber majburiy.' });
      }
      const out = await quranService.completeChunkedAudioUpload({
        uploadId: String(uploadId),
        totalChunks: Number(totalChunks),
        qariId: String(qariId),
        surahNumber: Number(surahNumber),
        mimeType: mimeType ? String(mimeType) : undefined,
        originalFilename: originalFilename ? String(originalFilename) : undefined,
        durationSec: durationSec ? Number(durationSec) : undefined,
        autoPublish: Boolean(autoPublish),
        allowDuplicateChecksum: Boolean(allowDuplicateChecksum),
        actor: extractAdminEmail(req),
      });
      if (!out.ok) {
        return res.status(out.duplicateOf ? 409 : 400).json({
          success: false,
          error: out.error,
          duplicateOf: out.duplicateOf,
        });
      }
      return res.json({ success: true, record: out.record });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Yuklashni yakunlashda xatolik' });
    }
  });

  // Batch ZIP archive import (up to 114 surahs at once with magic-byte + SHA-256 verification)
  router.post('/api/admin/quran-ecosystem/qaris/:qariId/import-zip', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { zipBase64, autoPublish, allowDuplicateChecksum } = req.body || {};
      if (!zipBase64 || typeof zipBase64 !== 'string') {
        return res.status(400).json({ success: false, error: 'zipBase64 majburiy.' });
      }
      const cleaned = zipBase64.includes(',') ? zipBase64.split(',')[1] : zipBase64;
      const zipBuffer = Buffer.from(cleaned, 'base64');
      const result = await quranService.importQariZipArchive({
        qariId: req.params.qariId,
        zipBuffer,
        autoPublish: autoPublish !== false,
        allowDuplicateChecksum: Boolean(allowDuplicateChecksum),
        actor: extractAdminEmail(req),
      });
      if (!result.ok && result.importedCount === 0) {
        return res.status(400).json({ success: false, ...result });
      }
      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'ZIP arxiv importida xatolik' });
    }
  });

  // Live SHA-256 + Backup Integrity Verification
  router.post('/api/admin/quran-ecosystem/qaris/:qariId/verify-integrity', requireAdminAuth, (req: Request, res: Response) => {
    const report = quranService.verifyQariAudioIntegrity(req.params.qariId, extractAdminEmail(req));
    if (!report) return res.status(404).json({ success: false, error: 'Qori topilmadi.' });
    return res.json({ success: true, report });
  });

  // Independent Permanent Backup + Non-Destructive Restore Verification Test
  router.post('/api/admin/quran-ecosystem/qaris/:qariId/backup-restore-test', requireAdminAuth, sensitiveActionLimiter, (req: Request, res: Response) => {
    const report = quranService.runQariBackupAndRestoreTest(req.params.qariId, extractAdminEmail(req));
    if (!report) return res.status(404).json({ success: false, error: 'Qori topilmadi.' });
    return res.json({ success: true, report });
  });

  // Safe Archive (hide without erasing permanent files) & Restore
  router.post('/api/admin/quran-ecosystem/audio/:audioId/archive', requireAdminAuth, async (req: Request, res: Response) => {
    const out = await quranService.deleteAudio(req.params.audioId, extractAdminEmail(req), true);
    if (!out.ok) return res.status(400).json({ success: false, error: out.error });
    return res.json({ success: true, archivedOnly: true });
  });

  router.post('/api/admin/quran-ecosystem/audio/:audioId/restore', requireAdminAuth, async (req: Request, res: Response) => {
    const publishImmediately = req.body?.publishImmediately !== false;
    const out = await quranService.restoreArchivedAudio(req.params.audioId, extractAdminEmail(req), publishImmediately);
    if (!out.ok) return res.status(400).json({ success: false, error: out.error });
    return res.json({ success: true, record: out.record, restoredFromBackup: out.restoredFromBackup });
  });

  router.delete('/api/admin/quran-ecosystem/audio/:audioId', requireAdminAuth, sensitiveActionLimiter, async (req: Request, res: Response) => {
    const confirmDeletePublished = req.query.confirm === 'true' || req.body?.confirmDeletePublished === true;
    const out = await quranService.deleteAudio(req.params.audioId, extractAdminEmail(req), confirmDeletePublished);
    if (!out.ok) return res.status(400).json({ success: false, error: out.error });
    return res.json({ success: true, archivedOnly: out.archivedOnly });
  });

  router.post('/api/admin/quran-ecosystem/playlists/official', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { id, titleUz, descriptionUz, category, offlineRecommended, tracks } = req.body || {};
      if (!titleUz) return res.status(400).json({ success: false, error: 'titleUz majburiy.' });
      const playlist = await quranService.upsertPlaylist({
        id,
        ownerUserId: 'official_admin',
        isOfficial: true,
        titleUz,
        descriptionUz,
        category,
        offlineRecommended,
        tracks: Array.isArray(tracks) ? tracks : [],
      });
      return res.json({ success: true, playlist });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err?.message || 'Rasmiy playlist saqlanmadi' });
    }
  });

  router.post('/api/admin/quran-ecosystem/lessons', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      if (!req.body?.titleUz) return res.status(400).json({ success: false, error: 'Dars nomi (titleUz) majburiy.' });
      const lesson = await quranService.upsertTajweedLesson(req.body, extractAdminEmail(req));
      return res.json({ success: true, lesson });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err?.message || 'Dars saqlanmadi' });
    }
  });

  router.post('/api/admin/quran-ecosystem/quizzes', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { questionUz, optionsUz, correctIndex } = req.body || {};
      if (!questionUz || !Array.isArray(optionsUz) || optionsUz.length < 2) {
        return res.status(400).json({ success: false, error: 'Savol va kamida 2 ta javob varianti majburiy.' });
      }
      const quiz = await quranService.upsertEducationQuiz(
        { ...req.body, correctIndex: Number(correctIndex) || 0 },
        extractAdminEmail(req)
      );
      return res.json({ success: true, quiz });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err?.message || 'Test saqlanmadi' });
    }
  });

  router.post('/api/admin/quran-ecosystem/backup', requireAdminAuth, sensitiveActionLimiter, (req: Request, res: Response) => {
    const backup = quranService.createMetadataBackup(extractAdminEmail(req));
    return res.json({ success: true, backup });
  });

  // =========================================================================
  // C. PREMIUM SUBSCRIPTION, MANUAL CARD PAYMENTS, PROMO & RANDOM DRAWS (USER)
  // =========================================================================

  router.get('/api/subscriptions/catalog', (_req: Request, res: Response) => {
    return res.json({
      success: true,
      ...subscriptionService.getPublicCatalog(),
      paymentGateways: getPaymentGatewayStatus(),
    });
  });

  router.get('/api/subscriptions/me/:userId', (req: Request, res: Response) => {
    const rawPlatform = String(req.query.platform || 'web') as PlatformId;
    const platform: PlatformId = ALL_PLATFORMS.includes(rawPlatform) ? rawPlatform : 'web';
    const entitlementData = subscriptionService.getUserEntitlements(req.params.userId, platform);
    const orders = subscriptionService.getUserOrders(req.params.userId);
    return res.json({
      success: true,
      subscription: entitlementData.subscription,
      features: entitlementData.features,
      moduleLabelsUz: entitlementData.moduleLabelsUz,
      orders,
    });
  });

  // Unified Cross-Platform Entitlement Matrix (Web, Android, Telegram Mini App, Telegram Bot)
  router.get('/api/subscriptions/entitlements/:userId', (req: Request, res: Response) => {
    const rawPlatform = String(req.query.platform || 'web') as PlatformId;
    const platform: PlatformId = ALL_PLATFORMS.includes(rawPlatform) ? rawPlatform : 'web';
    const data = subscriptionService.getUserEntitlements(req.params.userId, platform);
    return res.json({ success: true, ...data });
  });

  // Authoritative Server-Side Feature Entitlement Check & Quota Consumption Endpoint
  router.post('/api/subscriptions/entitlements/check', (req: Request, res: Response) => {
    const { userId, featureKey, platform, consume } = req.body || {};
    if (!userId || !featureKey) {
      return res.status(400).json({ success: false, error: 'userId va featureKey majburiy.' });
    }
    const safePlatform: PlatformId = ALL_PLATFORMS.includes(platform) ? platform : 'web';
    const decision = subscriptionService.checkFeatureEntitlement(
      String(userId),
      String(featureKey),
      safePlatform,
      { consume: Boolean(consume) }
    );
    if (!decision.allowed) {
      return res.status(403).json({
        success: false,
        code: decision.reasonCode,
        error: decision.messageUz,
        decision,
      });
    }
    return res.json({ success: true, decision });
  });

  router.post('/api/subscriptions/orders', async (req: Request, res: Response) => {
    try {
      const { userId, userDisplayName, platform, planId, receiptReference, receiptImageUrl, userNote, promoCode } = req.body || {};
      if (!userId || !planId || !VALID_PLAN_IDS.has(String(planId))) {
        return res.status(400).json({ success: false, error: 'userId va yaroqli planId majburiy.' });
      }
      const result = await subscriptionService.createManualCardOrder({
        userId: String(userId),
        userDisplayName,
        platform: platform || 'web',
        planId: planId as SubscriptionPlanId,
        receiptReference: String(receiptReference || ''),
        receiptImageUrl,
        userNote,
        promoCode,
      });
      if (!result.ok) return res.status(400).json({ success: false, error: result.error });
      return res.json({ success: true, order: result.order });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Buyurtma yaratishda xatolik' });
    }
  });

  router.post('/api/subscriptions/promo/apply', async (req: Request, res: Response) => {
    try {
      const { code, userId, planId, redeemNow } = req.body || {};
      if (!code || !userId) {
        return res.status(400).json({ success: false, error: 'Promokod va userId majburiy.' });
      }
      if (redeemNow) {
        const out = await subscriptionService.redeemFreeDaysPromo(String(code), String(userId));
        if (!out.ok) return res.status(400).json({ success: false, error: out.error });
        return res.json({ success: true, ...out });
      }
      const catalog = subscriptionService.getPublicCatalog();
      const targetPlan = catalog.plans.find((p) => p.id === planId);
      const evalRes = subscriptionService.evaluatePromoCode(
        String(code),
        String(userId),
        planId as SubscriptionPlanId | undefined,
        targetPlan?.priceUzs || 0
      );
      if (!evalRes.ok) return res.status(400).json({ success: false, error: evalRes.error });
      return res.json({
        success: true,
        promo: {
          code: evalRes.promo?.code,
          titleUz: evalRes.promo?.titleUz,
          type: evalRes.promo?.type,
          value: evalRes.promo?.value,
        },
        discountAmountUzs: evalRes.discountAmountUzs || 0,
      });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err?.message || 'Promokod tekshirishda xatolik' });
    }
  });

  router.post('/api/subscriptions/random-draws/:drawId/join', (req: Request, res: Response) => {
    const { userId, displayName, platform } = req.body || {};
    if (!userId) return res.status(400).json({ success: false, error: 'userId majburiy.' });
    const out = subscriptionService.joinRandomDraw(
      req.params.drawId,
      String(userId),
      String(displayName || userId),
      platform || 'web'
    );
    if (!out.ok) return res.status(409).json({ success: false, error: out.error });
    return res.json({ success: true, entriesCount: out.entriesCount });
  });

  // Payme / Click Ready Webhook Endpoints (server-verified, inactive until credentials set)
  router.post('/api/payments/webhooks/payme', (req: Request, res: Response) => {
    const gw = getPaymentGatewayStatus();
    if (!gw.payme.configured) {
      return res.status(503).json({
        error: { code: -32504, message: 'Payme merchant credentials not configured yet.' },
      });
    }
    if (!verifyPaymeBasicAuth(req.headers.authorization)) {
      return res.status(401).json({
        error: { code: -32504, message: 'Unauthorized Payme webhook signature.' },
      });
    }
    return res.json({ result: { allow: true, serverTime: Date.now() } });
  });

  // =========================================================================
  // D. TELEGRAM MINI APP HMAC-SHA256 AUTH & 6-DIGIT ACCOUNT LINKING
  // =========================================================================

  router.post('/api/telegram-miniapp/auth', (req: Request, res: Response) => {
    const { initData } = req.body || {};
    const verified = subscriptionService.verifyTelegramMiniAppInitData(String(initData || ''));
    if (!verified.ok || !verified.userId) {
      return res.status(401).json({ success: false, error: verified.error || 'Telegram autentifikatsiyasi rad etildi.' });
    }
    const subscription = subscriptionService.getEffectiveSubscription(verified.userId);
    const quranProfile = quranService.getUserProfile(verified.userId);
    return res.json({
      success: true,
      userId: verified.userId,
      telegramUser: verified.telegramUser,
      subscription,
      quranProfile,
      favorites: Array.isArray(quranProfile.favoriteItems) ? quranProfile.favoriteItems : [],
      language: quranProfile.preferredLanguage || null,
    });
  });

  router.post('/api/account-link/generate', (req: Request, res: Response) => {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ success: false, error: 'userId majburiy.' });
    const issued = subscriptionService.generateAccountLinkCode(String(userId));
    return res.json({ success: true, ...issued });
  });

  router.post('/api/account-link/redeem', (req: Request, res: Response) => {
    const { code, secondaryUserId } = req.body || {};
    if (!code || !secondaryUserId) {
      return res.status(400).json({ success: false, error: 'code va secondaryUserId majburiy.' });
    }
    const out = subscriptionService.redeemAccountLinkCode(String(code), String(secondaryUserId));
    if (!out.ok) return res.status(400).json({ success: false, error: out.error });
    return res.json({
      success: true,
      canonicalUserId: out.canonicalUserId,
      subscription: subscriptionService.getEffectiveSubscription(out.canonicalUserId!),
    });
  });

  // =========================================================================
  // E. PREMIUM SUBSCRIPTION & RANDOM DRAW — ADMIN CONTROL ROUTES
  // =========================================================================

  router.get('/api/admin/subscriptions/overview', requireAdminAuth, (_req: Request, res: Response) => {
    return res.json({
      success: true,
      ...subscriptionService.getAdminOverview(),
      paymentGateways: getPaymentGatewayStatus(),
    });
  });

  router.put('/api/admin/subscriptions/plans/:planId', requireAdminAuth, sensitiveActionLimiter, async (req: Request, res: Response) => {
    try {
      const planId = req.params.planId;
      if (!VALID_PLAN_IDS.has(planId)) {
        return res.status(400).json({ success: false, error: 'Yaroqsiz planId.' });
      }
      const plan = await subscriptionService.updatePlan(planId as SubscriptionPlanId, req.body || {}, extractAdminEmail(req));
      return res.json({ success: true, plan });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err?.message || 'Tarif yangilanmadi' });
    }
  });

  router.post('/api/admin/subscriptions/feature-gates', requireAdminAuth, sensitiveActionLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.body?.key || !req.body?.labelUz) {
        return res.status(400).json({ success: false, error: 'Funksiya kaliti (key) va nomi (labelUz) majburiy.' });
      }
      const gate = await subscriptionService.createFeatureGate(req.body, extractAdminEmail(req));
      return res.json({ success: true, featureGate: gate });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err?.message || 'Yangi funksiya huquqi yaratilmadi' });
    }
  });

  router.put('/api/admin/subscriptions/feature-gates/:key', requireAdminAuth, sensitiveActionLimiter, async (req: Request, res: Response) => {
    try {
      const gate = await subscriptionService.updateFeatureGate(req.params.key, req.body || {}, extractAdminEmail(req));
      return res.json({ success: true, featureGate: gate });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err?.message || 'Funksiya huquqi yangilanmadi' });
    }
  });

  router.put('/api/admin/subscriptions/card-settings', requireAdminAuth, sensitiveActionLimiter, async (req: Request, res: Response) => {
    try {
      const cardSettings = await subscriptionService.updateCardSettings(req.body || {}, extractAdminEmail(req));
      return res.json({ success: true, cardSettings });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err?.message || 'Karta sozlamalari saqlanmadi' });
    }
  });

  router.post('/api/admin/subscriptions/orders/:orderId/approve', requireAdminAuth, sensitiveActionLimiter, async (req: Request, res: Response) => {
    const out = await subscriptionService.approvePaymentOrder(req.params.orderId, extractAdminEmail(req));
    if (!out.ok) return res.status(400).json({ success: false, error: out.error });
    return res.json({ success: true, ...out });
  });

  router.post('/api/admin/subscriptions/orders/:orderId/reject', requireAdminAuth, sensitiveActionLimiter, async (req: Request, res: Response) => {
    const out = await subscriptionService.rejectPaymentOrder(
      req.params.orderId,
      String(req.body?.reason || 'Toʻlov tasdiqlanmadi.'),
      extractAdminEmail(req)
    );
    if (!out.ok) return res.status(400).json({ success: false, error: out.error });
    return res.json({ success: true, order: out.order });
  });

  router.post('/api/admin/subscriptions/users/:userId/modify', requireAdminAuth, sensitiveActionLimiter, async (req: Request, res: Response) => {
    try {
      const { action, days, planId, reason, isGift } = req.body || {};
      const validActions = new Set(['grant', 'extend', 'shorten', 'suspend', 'unsuspend', 'cancel', 'expire_now']);
      if (!validActions.has(String(action))) {
        return res.status(400).json({ success: false, error: 'Yaroqsiz amal (action).' });
      }
      const sub = await subscriptionService.adminModifySubscription({
        userId: req.params.userId,
        action,
        days: days ? Number(days) : undefined,
        planId,
        reason,
        isGift: Boolean(isGift),
        actor: extractAdminEmail(req),
      });
      return res.json({
        success: true,
        subscription: sub,
        effective: subscriptionService.getEffectiveSubscription(req.params.userId),
      });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err?.message || 'Obunani oʻzgartirishda xatolik' });
    }
  });

  router.post('/api/admin/subscriptions/promos', requireAdminAuth, sensitiveActionLimiter, async (req: Request, res: Response) => {
    try {
      const promo = await subscriptionService.upsertPromoCode(req.body || {}, extractAdminEmail(req));
      return res.json({ success: true, promo });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err?.message || 'Promokod saqlanmadi' });
    }
  });

  router.post('/api/admin/subscriptions/campaigns', requireAdminAuth, sensitiveActionLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.body?.titleUz) return res.status(400).json({ success: false, error: 'Aksiya nomi (titleUz) majburiy.' });
      const campaign = await subscriptionService.upsertCampaign(req.body, extractAdminEmail(req));
      return res.json({ success: true, campaign });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err?.message || 'Aksiya saqlanmadi' });
    }
  });

  router.post('/api/admin/subscriptions/random-draws', requireAdminAuth, sensitiveActionLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.body?.titleUz) return res.status(400).json({ success: false, error: 'Tanlov nomi (titleUz) majburiy.' });
      const draw = await subscriptionService.createRandomDraw(req.body, extractAdminEmail(req));
      return res.json({ success: true, draw });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err?.message || 'Tanlov yaratilmadi' });
    }
  });

  router.post('/api/admin/subscriptions/random-draws/:drawId/run', requireAdminAuth, sensitiveActionLimiter, (req: Request, res: Response) => {
    const out = subscriptionService.runRandomDrawSelection(req.params.drawId, extractAdminEmail(req));
    if (!out.ok) return res.status(400).json({ success: false, error: out.error });
    return res.json({ success: true, draw: out.draw });
  });

  router.post('/api/admin/subscriptions/random-draws/:drawId/approve', requireAdminAuth, sensitiveActionLimiter, async (req: Request, res: Response) => {
    const out = await subscriptionService.approveRandomDrawWinners(req.params.drawId, extractAdminEmail(req));
    if (!out.ok) return res.status(400).json({ success: false, error: out.error });
    return res.json({ success: true, draw: out.draw, grantedCount: out.grantedCount });
  });

  return router;
}
