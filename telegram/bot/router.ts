/**
 * ASAKA ZIYO — Isolated Express Router for Telegram Super Platform
 *
 * Mounted exclusively under `/api/telegram/platform/*` without modifying any
 * existing Web App, Mobile App, or legacy `/api/telegram/broadcast` routes.
 */

import express, { NextFunction, Request, Response, Router } from 'express';
import { TelegramBotEngine } from './telegramBotEngine';
import {
  isValidTelegramUpdatePayload,
  verifyWebhookSecretHeader,
} from '../middlewares/securityMiddleware';
import { CUSTOM_EMOJI_ID_REGEX, CUSTOM_EMOJI_KEY_REGEX } from '../emoji/customEmojiRegistry';
import { normalizeTelegramLocale } from '../locales';
import {
  ScopedFirestoreBridge,
  createScopedTelegramFirestoreBridge,
} from '../database/telegramRepository';
import { ReadOnlyPrayerScheduleProvider } from '../prayer/prayerAdapter';
import { CentralDatabaseReader } from '../content/centralContentProvider';
import { AppReleaseService } from '../services/appReleaseService';
import {
  SyncActionType,
  SyncAudienceSegment,
  SyncEntityType,
  SyncNotifyMode,
} from '../sync/syncEngine';
import { TelegramPlatformConfig } from '../config';
import { verifyTelegramMiniAppInitData } from '../miniapp/miniAppConfig';
import {
  TelegramBroadcastMediaType,
  TelegramBroadcastSegment,
  TelegramCentralAdminWriter,
  TelegramContentStatus,
  TelegramContentType,
  TelegramSupportStatus,
} from '../types';

export interface TelegramPlatformRouterDeps {
  requireAdminAuth: (req: Request, res: Response, next: NextFunction) => void;
  sensitiveActionLimiter?: (req: Request, res: Response, next: NextFunction) => void;
  serverWriteFirestoreDoc?: (
    collectionName: string,
    docId: string,
    data: Record<string, any>
  ) => Promise<{ success: boolean; error?: string }>;
  serverDeleteFirestoreDoc?: (
    collectionName: string,
    docId: string
  ) => Promise<{ success: boolean; error?: string }>;
  serverReadFirestoreCollection?: (collectionName: string) => Promise<any[]>;
  readOnlyPrayerProvider?: ReadOnlyPrayerScheduleProvider;
  centralContentReader?: CentralDatabaseReader;
  centralAdminWriter?: TelegramCentralAdminWriter;
  appReleaseService?: AppReleaseService;
  config?: TelegramPlatformConfig;
  storePath?: string;
}

export function createTelegramPlatformRouter(deps: TelegramPlatformRouterDeps): {
  router: Router;
  engine: TelegramBotEngine;
} {
  const firestoreBridge: ScopedFirestoreBridge = createScopedTelegramFirestoreBridge({
    serverWriteFirestoreDoc: deps.serverWriteFirestoreDoc,
    serverDeleteFirestoreDoc: deps.serverDeleteFirestoreDoc,
    serverReadFirestoreCollection: deps.serverReadFirestoreCollection,
  });

  const engine = new TelegramBotEngine({
    config: deps.config,
    firestore: firestoreBridge,
    storePath: deps.storePath,
    readOnlyPrayerProvider: deps.readOnlyPrayerProvider,
    centralContentReader: deps.centralContentReader,
    centralAdminWriter: deps.centralAdminWriter,
    appReleaseService: deps.appReleaseService,
    serverWriteFirestoreDoc: deps.serverWriteFirestoreDoc,
    serverReadFirestoreCollection: deps.serverReadFirestoreCollection,
  });

  engine.startRuntimeIfConfigured();

  const router = express.Router();
  const limitMiddleware =
    deps.sensitiveActionLimiter || ((_req: Request, _res: Response, next: NextFunction) => next());

  // 1. Safe Health Endpoint (zero secrets, zero PII)
  router.get('/health', (_req: Request, res: Response) => {
    res.json(engine.getPlatformHealth());
  });

  // 2. Secure Telegram Webhook Receiver
  router.post('/webhook', async (req: Request, res: Response) => {
    const secretCheck = verifyWebhookSecretHeader(
      req.headers['x-telegram-bot-api-secret-token'],
      engine.config
    );
    if (!secretCheck.valid) {
      engine.logger.warn('Rejected Telegram webhook call', { reason: secretCheck.reason });
      return res.status(403).json({
        ok: false,
        error: 'Forbidden: invalid or unconfigured webhook secret token.',
      });
    }

    if (!isValidTelegramUpdatePayload(req.body)) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid Telegram update payload.',
      });
    }

    if (req.query.sync === 'true') {
      const outcome = await engine.processUpdate(req.body);
      return res.status(200).json({
        ok: outcome.ok,
        updateId: outcome.updateId,
        kind: outcome.kind,
      });
    }

    const updateId = req.body.update_id;
    res.status(200).json({
      ok: true,
      accepted: true,
      updateId,
    });
    engine.processUpdate(req.body).catch((err) => {
      engine.logger.error('Async webhook update processing failed', {
        updateId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
    return;
  });

  // 3. Admin-Protected Platform Status & Live Bot Connection Verification
  router.get('/status', deps.requireAdminAuth, async (_req: Request, res: Response) => {
    const health = engine.getPlatformHealth();
    const diagnostics = await engine.runLiveDiagnostics();

    return res.json({
      success: true,
      ...health,
      botConnection: diagnostics.telegramApi.connected
        ? {
            connected: true,
            username: diagnostics.telegramApi.botUsername,
            firstName: diagnostics.telegramApi.botFirstName,
          }
        : {
            connected: false,
            reason: diagnostics.telegramApi.error,
          },
      diagnostics,
      settings: engine.repository.getSettings(),
      channels: engine.channelService.listChannels(),
    });
  });

  // 3B. Admin-Protected Dedicated Live Diagnostics Endpoint
  router.get('/diagnostics', deps.requireAdminAuth, async (_req: Request, res: Response) => {
    const diagnostics = await engine.runLiveDiagnostics();
    return res.json({
      success: true,
      diagnostics,
    });
  });

  // 4. Admin-Protected Webhook Registration
  router.post(
    '/webhook/register',
    limitMiddleware,
    deps.requireAdminAuth,
    async (_req: Request, res: Response) => {
      const result = await engine.registerConfiguredWebhook();
      return res.status(result.ok ? 200 : 400).json({
        success: result.ok,
        webhookUrl: result.webhookUrl,
        error: result.error,
      });
    }
  );

  // 5. Admin-Protected 100% Premium Custom Emoji Registry & Audit Management
  router.get('/emojis', deps.requireAdminAuth, (_req: Request, res: Response) => {
    return res.json({
      success: true,
      compatibility: engine.emojiRegistry.validateCompatibility(),
      entries: engine.emojiRegistry.listManagedSlots(),
      allEntries: engine.emojiRegistry.listAll(),
      missingCanonical: engine.emojiRegistry.listMissingCanonicalSlots(),
      ownerIdConfigured: Boolean(engine.config.ownerId),
    });
  });

  router.get('/emojis/audit', deps.requireAdminAuth, (_req: Request, res: Response) => {
    return res.json({
      success: true,
      audit: engine.emojiRegistry.buildFullAuditReport({ scanCodebase: true }),
    });
  });

  router.get('/emojis/history', deps.requireAdminAuth, async (req: Request, res: Response) => {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 40));
    const logs = await engine.repository.listEmojiAuditLogs(limit);
    return res.json({
      success: true,
      count: logs.length,
      logs,
    });
  });

  router.post(
    '/emojis',
    limitMiddleware,
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const key = String(req.body?.key || '').trim();
      const rawId = req.body?.customEmojiId;
      const customEmojiId = rawId === null || rawId === '' || rawId === undefined ? null : String(rawId).trim();

      if (!key || !engine.emojiRegistry.getEntry(key)) {
        return res.status(400).json({ success: false, error: 'Unknown semantic emoji key.' });
      }
      if (customEmojiId !== null && !CUSTOM_EMOJI_ID_REGEX.test(customEmojiId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid customEmojiId format. Must be numeric digits only (1–64 digits).',
        });
      }

      let verified = false;
      let stickerSetName =
        typeof req.body?.stickerSetName === 'string'
          ? req.body.stickerSetName.slice(0, 100)
          : undefined;
      let verificationNote: string | undefined;

      if (customEmojiId && req.body?.verifyNow !== false && engine.apiClient.isConfigured) {
        const stickerRes = await engine.apiClient.getCustomEmojiStickers([customEmojiId]);
        const matchedSticker =
          stickerRes.ok && Array.isArray(stickerRes.result)
            ? stickerRes.result.find((s) => String(s.custom_emoji_id || '') === customEmojiId)
            : undefined;
        if (matchedSticker) {
          verified = true;
          if (matchedSticker.set_name) stickerSetName = matchedSticker.set_name;
        } else {
          verificationNote =
            stickerRes.description || 'Telegram API getCustomEmojiStickers did not confirm this ID.';
        }
      }

      const existing = engine.emojiRegistry.getEntry(key)!;
      const updated = engine.emojiRegistry.createOrUpdateSlot({
        key,
        category: typeof req.body?.category === 'string' && req.body.category.trim()
          ? req.body.category.trim()
          : existing.category,
        description: typeof req.body?.description === 'string' && req.body.description.trim()
          ? req.body.description.trim()
          : existing.description,
        semanticPurpose: typeof req.body?.semanticPurpose === 'string' && req.body.semanticPurpose.trim()
          ? req.body.semanticPurpose.trim()
          : existing.semanticPurpose,
        usedIn: Array.isArray(req.body?.usedIn) ? req.body.usedIn.map(String) : existing.usedIn,
        customEmojiId,
        verified,
        stickerSetName,
        enabled: typeof req.body?.enabled === 'boolean' ? req.body.enabled : true,
        updatedBy: 'web_admin',
      });
      await engine.repository.saveCustomEmoji(updated);
      if (verified) {
        engine.emojiRegistry.setPremiumEnabled(true);
        engine.emojiRegistry.setKeyboardIconsEnabled(true);
        await engine.repository.saveSettings(
          {
            premiumEmojiEnabled: true,
            premiumKeyboardIconsEnabled: true,
            premiumEmojiEligibilityVerified: true,
            premiumEmojiEligibilityCheckedAt: new Date().toISOString(),
          },
          'web_admin'
        );
      }
      await engine.repository.appendAuditLog({
        actorTelegramId: 'web_admin',
        actorRole: 'admin',
        action: customEmojiId ? 'custom_emoji_registered' : 'custom_emoji_cleared',
        targetType: 'emoji',
        targetId: key,
        metadata: { hasCustomId: Boolean(customEmojiId), verified },
      });

      return res.json({
        success: true,
        entry: updated,
        verified,
        ...(verificationNote ? { verificationNote } : {}),
        compatibility: engine.emojiRegistry.validateCompatibility(),
      });
    }
  );

  router.post(
    '/emojis/custom',
    limitMiddleware,
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const key = String(req.body?.key || '').trim().toLowerCase();
      const category = String(req.body?.category || 'custom').trim();
      const semanticPurpose = String(req.body?.semanticPurpose || req.body?.description || '').trim();
      const description = String(req.body?.description || semanticPurpose || key).trim();
      const rawId = req.body?.customEmojiId;
      const customEmojiId = rawId === null || rawId === '' || rawId === undefined ? null : String(rawId).trim();
      const usedIn = Array.isArray(req.body?.usedIn)
        ? req.body.usedIn.map(String).filter(Boolean).slice(0, 20)
        : ['Custom Admin Slot'];

      if (!CUSTOM_EMOJI_KEY_REGEX.test(key)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid key format. Use lowercase letters, digits, dot, underscore or hyphen (2–48 chars).',
        });
      }
      if (customEmojiId !== null && !CUSTOM_EMOJI_ID_REGEX.test(customEmojiId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid customEmojiId format. Must be numeric digits only (1–64 digits).',
        });
      }

      let verified = false;
      let stickerSetName: string | undefined;
      if (customEmojiId && engine.apiClient.isConfigured) {
        const stickerRes = await engine.apiClient.getCustomEmojiStickers([customEmojiId]);
        const matchedSticker =
          stickerRes.ok && Array.isArray(stickerRes.result)
            ? stickerRes.result.find((s) => String(s.custom_emoji_id || '') === customEmojiId)
            : undefined;
        if (matchedSticker) {
          verified = true;
          stickerSetName = matchedSticker.set_name;
        }
      }

      const created = engine.emojiRegistry.createOrUpdateSlot({
        key,
        category,
        description,
        semanticPurpose: semanticPurpose || description,
        usedIn,
        customEmojiId,
        verified,
        stickerSetName,
        enabled: typeof req.body?.enabled === 'boolean' ? req.body.enabled : true,
        updatedBy: 'web_admin',
      });
      await engine.repository.saveCustomEmoji(created);
      await engine.repository.appendAuditLog({
        actorTelegramId: 'web_admin',
        actorRole: 'admin',
        action: 'custom_emoji_slot_created',
        targetType: 'emoji',
        targetId: key,
        metadata: { category, hasCustomId: Boolean(customEmojiId), verified },
      });

      return res.json({
        success: true,
        entry: created,
        compatibility: engine.emojiRegistry.validateCompatibility(),
      });
    }
  );

  router.post(
    '/emojis/verify',
    limitMiddleware,
    deps.requireAdminAuth,
    async (_req: Request, res: Response) => {
      const verifyRes = await engine.emojiRegistry.verifyAllWithTelegramApi(engine.apiClient);
      for (const entry of engine.emojiRegistry.listAll()) {
        if (entry.customEmojiId) {
          await engine.repository.saveCustomEmoji(entry);
        }
      }
      const sampleVerified = engine.emojiRegistry
        .listAll()
        .find((e) => e.verified && e.customEmojiId)?.customEmojiId;
      const eligibility = await engine.apiClient.verifyPremiumEmojiEligibility(sampleVerified);

      const shouldEnablePremium = Boolean(
        eligibility.supportsMessageCustomEmojiEntities && verifyRes.verifiedKeys.length > 0
      );
      engine.emojiRegistry.setPremiumEnabled(shouldEnablePremium);

      await engine.repository.saveSettings(
        {
          premiumEmojiEnabled: shouldEnablePremium,
          premiumEmojiEligibilityVerified: eligibility.supportsMessageCustomEmojiEntities,
          premiumEmojiEligibilityCheckedAt: eligibility.checkedAt,
          premiumEmojiEligibilityReason: eligibility.reason,
        },
        'web_admin'
      );

      await engine.repository.appendAuditLog({
        actorTelegramId: 'web_admin',
        actorRole: 'admin',
        action: 'custom_emoji_verify_all',
        targetType: 'emoji',
        targetId: 'all',
        metadata: {
          verified: verifyRes.verifiedKeys.length,
          rejected: verifyRes.rejectedKeys.length,
        },
      });

      return res.json({
        success: true,
        eligibility,
        verification: verifyRes,
        compatibility: engine.emojiRegistry.validateCompatibility(),
      });
    }
  );

  router.post(
    '/emojis/import-set',
    limitMiddleware,
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const stickerSetName = String(req.body?.stickerSetName || '').trim();
      const explicitMapping =
        req.body?.mapping && typeof req.body.mapping === 'object'
          ? (req.body.mapping as Record<string, string>)
          : undefined;

      if (!stickerSetName) {
        return res.status(400).json({ success: false, error: 'stickerSetName is required.' });
      }

      const result = await engine.emojiRegistry.importFromTelegramStickerSet(
        engine.apiClient,
        stickerSetName,
        explicitMapping
      );

      if (result.ok) {
        for (const item of result.matchedKeys) {
          const entry = engine.emojiRegistry.getEntry(item.key);
          if (entry) {
            await engine.repository.saveCustomEmoji(entry);
          }
        }
        await engine.repository.appendAuditLog({
          actorTelegramId: 'web_admin',
          actorRole: 'admin',
          action: 'custom_emoji_set_imported',
          targetType: 'emoji',
          targetId: stickerSetName,
          metadata: {
            matchedCount: result.matchedKeys.length,
            verifiedCount: result.matchedKeys.filter((m) => m.verified).length,
          },
        });
      }

      return res.status(result.ok ? 200 : 400).json({
        success: result.ok,
        result,
        compatibility: engine.emojiRegistry.validateCompatibility(),
      });
    }
  );

  router.post(
    '/emojis/test-send',
    limitMiddleware,
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const chatId = String(req.body?.chatId || engine.config.ownerId || '').trim();
      if (!chatId) {
        return res.status(400).json({
          success: false,
          error: 'chatId is required (or configure TELEGRAM_OWNER_ID).',
        });
      }
      const testResult = await engine.emojiRegistry.sendLiveEmojiTestMessage(
        engine.apiClient,
        chatId
      );
      return res.status(testResult.ok ? 200 : 400).json({
        success: testResult.ok,
        ...testResult,
      });
    }
  );

  router.post(
    '/emojis/:key/preview',
    limitMiddleware,
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const chatId = String(req.body?.chatId || engine.config.ownerId || '').trim();
      if (!chatId) {
        return res.status(400).json({
          success: false,
          error: 'chatId is required (or configure TELEGRAM_OWNER_ID).',
        });
      }
      const preview = await engine.emojiRegistry.sendSingleEmojiPreview(
        engine.apiClient,
        chatId,
        req.params.key
      );
      return res.status(preview.ok ? 200 : 400).json({
        success: preview.ok,
        ...preview,
      });
    }
  );

  router.post(
    '/emojis/:key/toggle',
    limitMiddleware,
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const existing = engine.emojiRegistry.getEntry(req.params.key);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Emoji slot not found.' });
      }
      const nextEnabled =
        typeof req.body?.enabled === 'boolean' ? req.body.enabled : existing.enabled === false;
      const updated = engine.emojiRegistry.setEntryEnabled(req.params.key, nextEnabled, 'web_admin');
      if (updated) await engine.repository.saveCustomEmoji(updated);
      await engine.repository.appendAuditLog({
        actorTelegramId: 'web_admin',
        actorRole: 'admin',
        action: nextEnabled ? 'custom_emoji_enabled' : 'custom_emoji_disabled',
        targetType: 'emoji',
        targetId: req.params.key,
      });
      return res.json({
        success: true,
        entry: updated,
        compatibility: engine.emojiRegistry.validateCompatibility(),
      });
    }
  );

  router.post(
    '/emojis/:key/reset',
    limitMiddleware,
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const updated = engine.emojiRegistry.resetEntryToUnicodeFallback(req.params.key, 'web_admin');
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Emoji slot not found.' });
      }
      await engine.repository.saveCustomEmoji(updated);
      await engine.repository.appendAuditLog({
        actorTelegramId: 'web_admin',
        actorRole: 'admin',
        action: 'custom_emoji_cleared',
        targetType: 'emoji',
        targetId: req.params.key,
      });
      return res.json({
        success: true,
        entry: updated,
        compatibility: engine.emojiRegistry.validateCompatibility(),
      });
    }
  );

  router.delete(
    '/emojis/:key',
    limitMiddleware,
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const existing = engine.emojiRegistry.getEntry(req.params.key);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Emoji slot not found.' });
      }
      const outcome = engine.emojiRegistry.deleteSlot(req.params.key, 'web_admin');
      if (outcome.permanentlyRemoved) {
        await engine.repository.deleteCustomEmoji(req.params.key);
      } else if (outcome.entry) {
        await engine.repository.saveCustomEmoji(outcome.entry);
      }
      await engine.repository.appendAuditLog({
        actorTelegramId: 'web_admin',
        actorRole: 'admin',
        action: outcome.permanentlyRemoved ? 'custom_emoji_deleted' : 'custom_emoji_cleared',
        targetType: 'emoji',
        targetId: req.params.key,
      });
      return res.json({
        success: true,
        removed: outcome.permanentlyRemoved,
        entry: outcome.entry,
        compatibility: engine.emojiRegistry.validateCompatibility(),
      });
    }
  );

  // 5B. Admin-Protected Central Style Manager (Bot API 9.4–10.4)
  router.get('/style', deps.requireAdminAuth, (_req: Request, res: Response) => {
    return res.json({
      success: true,
      style: engine.styleManager.getConfig(),
      emojiCompatibility: engine.emojiRegistry.validateCompatibility(),
    });
  });

  router.post(
    '/style',
    limitMiddleware,
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const patch: Record<string, any> = {};
      if (typeof req.body?.buttonStylesEnabled === 'boolean') {
        patch.buttonStylesEnabled = req.body.buttonStylesEnabled;
      }
      if (typeof req.body?.richMessagesEnabled === 'boolean') {
        patch.richMessagesEnabled = req.body.richMessagesEnabled;
      }
      if (typeof req.body?.htmlWidgetsEnabled === 'boolean') {
        patch.htmlWidgetsEnabled = req.body.htmlWidgetsEnabled;
      }
      if (typeof req.body?.aiStreamingDraftsEnabled === 'boolean') {
        patch.aiStreamingDraftsEnabled = req.body.aiStreamingDraftsEnabled;
      }
      if (req.body?.buttonStyleOverrides && typeof req.body.buttonStyleOverrides === 'object') {
        patch.buttonStyleOverrides = req.body.buttonStyleOverrides;
      }
      if (req.body?.richMessageTemplates && typeof req.body.richMessageTemplates === 'object') {
        patch.richMessageTemplates = req.body.richMessageTemplates;
      }
      const saved = await engine.repository.saveSettings(patch, 'web_admin');
      engine.styleManager.syncFromSettings(saved);
      return res.json({ success: true, style: engine.styleManager.getConfig() });
    }
  );

  router.post(
    '/style/test-rich',
    limitMiddleware,
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const chatId = String(req.body?.chatId || engine.config.ownerId || '').trim();
      if (!chatId) {
        return res.status(400).json({ success: false, error: 'chatId is required.' });
      }
      const emojiEntries = engine.emojiRegistry.listCanonicalSlots();
      const result = await engine.styleManager.sendRichMessageTest(engine.apiClient, chatId, {
        verifiedEmojis: emojiEntries.filter((e) => e.verified && e.enabled !== false).length,
        totalEmojis: emojiEntries.length,
        recitersCount: engine.quranMp3Service.listReciters().length,
        usersCount: engine.repository.listUsers().length,
      });
      return res.status(result.ok ? 200 : 400).json({ success: result.ok, ...result });
    }
  );

  router.post(
    '/style/test-widget',
    limitMiddleware,
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const chatId = String(req.body?.chatId || engine.config.ownerId || '').trim();
      if (!chatId) {
        return res.status(400).json({ success: false, error: 'chatId is required.' });
      }
      const result = await engine.styleManager.sendWidgetTest(
        engine.apiClient,
        chatId,
        'private',
        engine.prayerAdapter
      );
      return res.status(result.ok ? 200 : 400).json({ success: result.ok, ...result });
    }
  );

  // 5C. Admin-Protected Quran MP3 Audio Management & Bulk Preview/Confirm
  router.get('/quran-audio/audit', deps.requireAdminAuth, (_req: Request, res: Response) => {
    return res.json({
      success: true,
      audit: engine.quranMp3Service.auditFullLibrary(),
      importHistory: engine.quranMp3Service.listImportLogs(20),
    });
  });

  router.post(
    '/quran-audio/reciters',
    limitMiddleware,
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const saved = await engine.quranMp3Service.upsertReciter(
        {
          id: typeof req.body?.id === 'string' ? req.body.id : undefined,
          nameUz: String(req.body?.nameUz || req.body?.name || ''),
          nameAr: typeof req.body?.nameAr === 'string' ? req.body.nameAr : undefined,
          country: typeof req.body?.country === 'string' ? req.body.country : undefined,
          styleUz: typeof req.body?.styleUz === 'string' ? req.body.styleUz : undefined,
          serverUrl: typeof req.body?.serverUrl === 'string' ? req.body.serverUrl : undefined,
          isActive: req.body?.isActive !== false,
        },
        'web_admin'
      );
      return res.status(saved.ok ? 200 : 400).json({ success: saved.ok, ...saved });
    }
  );

  router.post(
    '/quran-audio/bulk-preview',
    limitMiddleware,
    deps.requireAdminAuth,
    (req: Request, res: Response) => {
      const reciterId = String(req.body?.reciterId || '').trim();
      const entries = Array.isArray(req.body?.entries) ? req.body.entries : [];
      const preview = engine.quranMp3Service.createBulkImportPreview({
        reciterId,
        entries,
        actorId: 'web_admin',
      });
      return res.status(preview.ok ? 200 : 400).json({ success: preview.ok, ...preview });
    }
  );

  router.post(
    '/quran-audio/bulk-confirm/:planId',
    limitMiddleware,
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const result = await engine.quranMp3Service.commitBulkImportPlan(
        req.params.planId,
        'web_admin'
      );
      return res.status(result.ok ? 200 : 400).json({ success: result.ok, ...result });
    }
  );

  // 6. Admin-Protected Isolated Channels, Permissions, Publications & Audit Logs
  router.get('/channels', deps.requireAdminAuth, (_req: Request, res: Response) => {
    return res.json({ success: true, channels: engine.channelService.listChannels() });
  });

  router.post(
    '/channels',
    limitMiddleware,
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const id = String(req.body?.id || '').trim();
      const username = String(req.body?.username || '').trim();
      const title = String(req.body?.title || '').trim();
      if (!id || !username || !title) {
        return res
          .status(400)
          .json({ success: false, error: 'id, username, and title are required.' });
      }
      const saved = await engine.channelService.upsertChannel('web_admin', {
        id,
        username,
        title,
        chatId: typeof req.body?.chatId === 'string' ? req.body.chatId.trim() : undefined,
        isPrimary: Boolean(req.body?.isPrimary),
        isActive: req.body?.isActive !== false,
        autoPublishPrayerTimes: Boolean(req.body?.autoPublishPrayerTimes),
        autoPublishAnnouncements: Boolean(req.body?.autoPublishAnnouncements),
        language: normalizeTelegramLocale(req.body?.language, 'uz-Latn'),
      });
      return res.json({ success: true, channel: saved });
    }
  );

  router.post(
    '/channels/:id/check-permissions',
    limitMiddleware,
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const permissions = await engine.publishingService.verifyChannelPermissions(req.params.id);
      return res.json({
        success: permissions.canPostMessages,
        permissions,
      });
    }
  );

  router.post(
    '/channels/:id/publish-prayer',
    limitMiddleware,
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const result = await engine.publishingService.publishPrayerScheduleToChannel({
        channelId: req.params.id,
        prayerAdapter: engine.prayerAdapter,
        createdBy: 'web_admin',
      });
      return res.status(result.success ? 200 : 400).json(result);
    }
  );

  router.get('/publications', deps.requireAdminAuth, (_req: Request, res: Response) => {
    return res.json({
      success: true,
      publications: engine.publishingService.listHistory(50),
    });
  });

  router.get('/audit-logs', deps.requireAdminAuth, (_req: Request, res: Response) => {
    return res.json({
      success: true,
      auditLogs: engine.adminService.listAuditLogs(100),
    });
  });

  // 7. Super Admin — User Directory, CSV Export, Block & Delete
  router.get('/users', deps.requireAdminAuth, (req: Request, res: Response) => {
    const query = typeof req.query.q === 'string' ? req.query.q : undefined;
    const language =
      typeof req.query.language === 'string' && req.query.language
        ? normalizeTelegramLocale(req.query.language)
        : undefined;
    const onlyBlocked = req.query.blocked === 'true';
    const onlyOptIn = req.query.optIn === 'true';
    const activeWithinDays = req.query.activeDays
      ? Number.parseInt(String(req.query.activeDays), 10)
      : undefined;

    const users = engine.userService.searchUsers({
      query,
      language,
      onlyBlocked,
      onlyOptIn,
      activeWithinDays: Number.isFinite(activeWithinDays) ? activeWithinDays : undefined,
    });
    return res.json({ success: true, total: users.length, users });
  });

  router.get('/users/export.csv', deps.requireAdminAuth, (_req: Request, res: Response) => {
    const csv = engine.userService.exportUsersCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="asaka_ziyo_telegram_users.csv"');
    return res.send(csv);
  });

  router.post(
    '/users/:id/block',
    limitMiddleware,
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const blocked = req.body?.blocked !== false;
      const updated = await engine.userService.setUserBlocked('web_admin', req.params.id, blocked);
      if (!updated) return res.status(404).json({ success: false, error: 'User not found.' });
      return res.json({ success: true, user: updated });
    }
  );

  router.delete(
    '/users/:id',
    limitMiddleware,
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const removed = await engine.repository.deleteUser(req.params.id);
      if (!removed.ok) return res.status(404).json({ success: false, error: 'User not found.' });
      await engine.repository.appendAuditLog({
        actorTelegramId: 'web_admin',
        actorRole: 'admin',
        action: 'user_deleted',
        targetType: 'user',
        targetId: req.params.id,
      });
      return res.json({ success: true });
    }
  );

  // 8. Super Admin — Broadcast Campaign Manager
  router.get('/broadcasts', deps.requireAdminAuth, (_req: Request, res: Response) => {
    return res.json({ success: true, broadcasts: engine.repository.listBroadcasts() });
  });

  router.post(
    '/broadcasts',
    limitMiddleware,
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const title = String(req.body?.title || '').trim();
      const defaultText = String(req.body?.defaultText || '').trim();
      if (!title || !defaultText) {
        return res
          .status(400)
          .json({ success: false, error: 'title and defaultText are required.' });
      }
      const campaign = await engine.broadcastManager.createCampaign({
        title,
        mediaType: (req.body?.mediaType || 'text') as TelegramBroadcastMediaType,
        defaultText,
        textByLocale: req.body?.textByLocale,
        mediaUrlOrFileId: req.body?.mediaUrlOrFileId,
        sequenceItems: req.body?.sequenceItems,
        buttons: req.body?.buttons,
        segment: (req.body?.segment || 'all_opt_in') as TelegramBroadcastSegment,
        customUserIds: Array.isArray(req.body?.customUserIds) ? req.body.customUserIds : undefined,
        scheduledAt: typeof req.body?.scheduledAt === 'string' ? req.body.scheduledAt : undefined,
        createdBy: 'web_admin',
      });
      return res.json({ success: true, campaign });
    }
  );

  router.post(
    '/broadcasts/:id/test',
    limitMiddleware,
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const chatId = String(req.body?.chatId || engine.config.ownerId || '').trim();
      if (!chatId) {
        return res.status(400).json({ success: false, error: 'chatId is required.' });
      }
      const result = await engine.broadcastManager.sendTestPreview(req.params.id, chatId);
      return res.status(result.ok ? 200 : 400).json(result);
    }
  );

  router.post(
    '/broadcasts/:id/start',
    limitMiddleware,
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const campaign = await engine.broadcastManager.runCampaign(req.params.id, 'web_admin');
      if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found.' });
      return res.json({ success: true, campaign });
    }
  );

  router.post(
    '/broadcasts/:id/pause',
    limitMiddleware,
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const updated = await engine.broadcastManager.pauseCampaign(req.params.id, 'web_admin');
      if (!updated) return res.status(404).json({ success: false, error: 'Campaign not found.' });
      return res.json({ success: true, campaign: updated });
    }
  );

  router.post(
    '/broadcasts/:id/cancel',
    limitMiddleware,
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const updated = await engine.broadcastManager.cancelCampaign(req.params.id, 'web_admin');
      if (!updated) return res.status(404).json({ success: false, error: 'Campaign not found.' });
      return res.json({ success: true, campaign: updated });
    }
  );

  router.get(
    '/broadcasts/:id/export.csv',
    deps.requireAdminAuth,
    (req: Request, res: Response) => {
      const csv = engine.broadcastManager.exportCampaignCsv(req.params.id);
      if (!csv) return res.status(404).json({ success: false, error: 'Campaign not found.' });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="broadcast_${req.params.id}.csv"`
      );
      return res.send(csv);
    }
  );

  // 9. Super Admin — Two-Way Support Tickets
  router.get('/support', deps.requireAdminAuth, (req: Request, res: Response) => {
    const status =
      typeof req.query.status === 'string' && req.query.status
        ? (req.query.status as TelegramSupportStatus)
        : undefined;
    return res.json({ success: true, tickets: engine.supportService.listAllTickets(status) });
  });

  router.post(
    '/support/:id/reply',
    limitMiddleware,
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const replyText = String(req.body?.replyText || '').trim();
      if (!replyText) {
        return res.status(400).json({ success: false, error: 'replyText is required.' });
      }
      const result = await engine.supportService.replyFromAdmin({
        ticketId: req.params.id,
        adminId: 'web_admin',
        adminName: String(req.body?.adminName || 'ASAKA ZIYO Admin'),
        replyText,
        markStatus: req.body?.status as TelegramSupportStatus | undefined,
      });
      return res.status(result.ok ? 200 : 404).json(result);
    }
  );

  router.post(
    '/support/:id/status',
    limitMiddleware,
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const status = String(req.body?.status || '') as TelegramSupportStatus;
      if (!['new', 'in_progress', 'answered', 'closed'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid ticket status.' });
      }
      const updated = await engine.supportService.updateTicketStatus(
        req.params.id,
        'web_admin',
        status,
        typeof req.body?.assignedTo === 'string' ? req.body.assignedTo : undefined
      );
      if (!updated) return res.status(404).json({ success: false, error: 'Ticket not found.' });
      return res.json({ success: true, ticket: updated });
    }
  );

  // 10. Super Admin — Content Studio & Scheduled Queue
  router.get('/content-drafts', deps.requireAdminAuth, (_req: Request, res: Response) => {
    return res.json({ success: true, drafts: engine.repository.listContentDrafts() });
  });

  router.post(
    '/content-drafts',
    limitMiddleware,
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const title = String(req.body?.title || '').trim();
      const defaultBody = String(req.body?.defaultBody || '').trim();
      if (!title || !defaultBody) {
        return res
          .status(400)
          .json({ success: false, error: 'title and defaultBody are required.' });
      }
      const draft = await engine.contentStudio.createDraft({
        type: (req.body?.type || 'announcement') as TelegramContentType,
        title,
        defaultBody,
        bodyByLocale: req.body?.bodyByLocale,
        tags: Array.isArray(req.body?.tags) ? req.body.tags : [],
        targetChannelIds: Array.isArray(req.body?.targetChannelIds)
          ? req.body.targetChannelIds
          : undefined,
        scheduledAt: typeof req.body?.scheduledAt === 'string' ? req.body.scheduledAt : undefined,
        mediaUrl: typeof req.body?.mediaUrl === 'string' ? req.body.mediaUrl : undefined,
        createdBy: 'web_admin',
      });
      return res.json({ success: true, draft });
    }
  );

  router.post(
    '/content-drafts/:id/status',
    limitMiddleware,
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const status = String(req.body?.status || '') as TelegramContentStatus;
      if (!['draft', 'review', 'approved', 'scheduled', 'published', 'archived'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid draft status.' });
      }
      const updated = await engine.contentStudio.updateDraftStatus(
        req.params.id,
        status,
        'web_admin',
        typeof req.body?.scheduledAt === 'string' ? req.body.scheduledAt : undefined
      );
      if (!updated) return res.status(404).json({ success: false, error: 'Draft not found.' });
      return res.json({ success: true, draft: updated });
    }
  );

  router.post(
    '/content-drafts/:id/publish',
    limitMiddleware,
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const result = await engine.contentStudio.publishDraftToChannels(req.params.id, 'web_admin');
      return res.status(result.ok ? 200 : 400).json(result);
    }
  );

  // 11. Super Admin — AI Intelligence Center (Model Probe, Config, Logs, Helpers)
  router.get('/ai/status', deps.requireAdminAuth, (_req: Request, res: Response) => {
    return res.json({
      success: true,
      status: engine.aiBridge.getStatus(),
      settings: engine.repository.getSettings(),
    });
  });

  router.post(
    '/ai/probe',
    limitMiddleware,
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const modelId = typeof req.body?.model === 'string' ? req.body.model.trim() : undefined;
      const probe = await engine.aiBridge.probeModelAvailability(modelId);
      return res.json({ success: true, probe });
    }
  );

  router.post(
    '/ai/config',
    limitMiddleware,
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const patch: Record<string, any> = {};
      if (typeof req.body?.aiAssistantEnabled === 'boolean') {
        patch.aiAssistantEnabled = req.body.aiAssistantEnabled;
      }
      if (typeof req.body?.aiPrimaryModel === 'string' && req.body.aiPrimaryModel.trim()) {
        patch.aiPrimaryModel = req.body.aiPrimaryModel.trim();
      }
      if (req.body?.aiFallbackModel === null || typeof req.body?.aiFallbackModel === 'string') {
        patch.aiFallbackModel = req.body.aiFallbackModel
          ? String(req.body.aiFallbackModel).trim()
          : null;
      }
      if (typeof req.body?.aiAutoFallbackEnabled === 'boolean') {
        patch.aiAutoFallbackEnabled = req.body.aiAutoFallbackEnabled;
      }
      if (typeof req.body?.aiVoiceReplyEnabled === 'boolean') {
        patch.aiVoiceReplyEnabled = req.body.aiVoiceReplyEnabled;
      }
      if (typeof req.body?.aiDailyBudgetTokens === 'number' && req.body.aiDailyBudgetTokens > 0) {
        patch.aiDailyBudgetTokens = Math.floor(req.body.aiDailyBudgetTokens);
      }
      if (
        typeof req.body?.aiMaxRequestsPerUserPerDay === 'number' &&
        req.body.aiMaxRequestsPerUserPerDay > 0
      ) {
        patch.aiMaxRequestsPerUserPerDay = Math.floor(req.body.aiMaxRequestsPerUserPerDay);
      }
      if (typeof req.body?.aiSystemPromptOverride === 'string') {
        patch.aiSystemPromptOverride = req.body.aiSystemPromptOverride;
      }

      const saved = await engine.repository.saveSettings(patch, 'web_admin');
      return res.json({
        success: true,
        settings: saved,
        status: engine.aiBridge.getStatus(),
      });
    }
  );

  router.get('/ai/logs', deps.requireAdminAuth, (req: Request, res: Response) => {
    const limit = Math.min(200, Number.parseInt(String(req.query.limit || '50'), 10) || 50);
    return res.json({
      success: true,
      logs: engine.repository.listAiLogs(limit),
    });
  });

  router.post(
    '/ai/logs/:id/flag',
    limitMiddleware,
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const flagged = req.body?.flagged !== false;
      const reason = typeof req.body?.reason === 'string' ? req.body.reason : undefined;
      const updated = await engine.repository.flagAiLog(req.params.id, flagged, reason);
      if (!updated) return res.status(404).json({ success: false, error: 'AI log not found.' });
      return res.json({ success: true, log: updated });
    }
  );

  router.post(
    '/ai/draft-post',
    limitMiddleware,
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const topic = String(req.body?.topic || '').trim();
      const category = String(req.body?.category || 'announcement').trim();
      const locale = normalizeTelegramLocale(req.body?.locale, 'uz-Latn');
      if (!topic) return res.status(400).json({ success: false, error: 'topic is required.' });
      const result = await engine.aiBridge.draftAdminPost({
        adminId: 'web_admin',
        topic,
        category,
        locale,
      });
      return res.status(result.ok ? 200 : 400).json(result);
    }
  );

  router.post(
    '/ai/translate',
    limitMiddleware,
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const sourceText = String(req.body?.sourceText || '').trim();
      const sourceLocale = normalizeTelegramLocale(req.body?.sourceLocale, 'uz-Latn');
      if (!sourceText) {
        return res.status(400).json({ success: false, error: 'sourceText is required.' });
      }
      const result = await engine.aiBridge.translateAcrossFiveLocales({
        adminId: 'web_admin',
        sourceText,
        sourceLocale,
      });
      return res.status(result.ok ? 200 : 400).json(result);
    }
  );

  // 12. Super Admin — Unified Analytics Dashboard
  router.get('/analytics', deps.requireAdminAuth, (_req: Request, res: Response) => {
    return res.json({
      success: true,
      analytics: engine.adminService.getDashboardAnalytics(),
      firestoreSync: engine.repository.getFirestoreSyncStatus(),
      aiStatus: engine.aiBridge.getStatus(),
    });
  });

  // 13. Telegram Mini App initData Server-Side HMAC-SHA256 Verification & Context Sync
  router.post('/miniapp/verify', limitMiddleware, (req: Request, res: Response) => {
    if (!engine.config.isConfigured) {
      return res.status(503).json({
        valid: false,
        reason: 'TELEGRAM_BOT_TOKEN1_NOT_CONFIGURED',
      });
    }
    const initData = typeof req.body?.initData === 'string' ? req.body.initData : '';
    if (!initData.trim()) {
      return res.status(400).json({
        valid: false,
        reason: 'MISSING_INIT_DATA',
      });
    }
    const verified = verifyTelegramMiniAppInitData(initData, engine.config.botToken);
    return res.status(verified.valid ? 200 : 401).json(verified);
  });

  router.post('/miniapp/context', limitMiddleware, (req: Request, res: Response) => {
    if (!engine.config.isConfigured) {
      return res.status(503).json({ ok: false, reason: 'TELEGRAM_BOT_TOKEN1_NOT_CONFIGURED' });
    }
    const initData = typeof req.body?.initData === 'string' ? req.body.initData : '';
    const verified = verifyTelegramMiniAppInitData(initData, engine.config.botToken);
    if (!verified.valid || !verified.userId) {
      return res.status(401).json({ ok: false, reason: verified.reason || 'UNAUTHORIZED' });
    }

    const user = engine.repository.getUser(verified.userId);
    const locale = user?.language || 'uz-Latn';
    const engagement = engine.repository.getUserEngagement(verified.userId);
    return res.json({
      ok: true,
      miniAppUrl: engine.config.miniAppUrl,
      user: user
        ? {
            telegramId: user.telegramId,
            firstName: user.firstName,
            username: user.username,
            language: user.language,
          }
        : {
            telegramId: verified.userId,
            firstName: verified.firstName,
            username: verified.username,
            language: locale,
          },
      prayerSchedule: engine.prayerAdapter.getCurrentSchedule(),
      bookmarks: engagement.bookmarks,
      khatmPlan: engagement.khatmPlan || null,
      dhikrProgress: engagement.dhikr,
      quizSummary: {
        totalAttempts: engagement.quizTotalAttempts,
        bestScore: engagement.quizBestScore,
        totalPoints: engagement.quizTotalPoints,
        completedLessonIds: engagement.completedLessonIds,
      },
    });
  });

  // 14. Unified Ecosystem V4 — Real-Time Sync Outbox, Retries, Releases & Command Sync
  router.get('/sync/status', deps.requireAdminAuth, (_req: Request, res: Response) => {
    return res.json({
      success: true,
      sync: engine.syncEngine.getStatusSummary(),
      centralContent: engine.centralContent.getSummaryCounts(),
      auditLogs: engine.syncEngine.listAuditLogs(40),
    });
  });

  router.post(
    '/sync/retry/:id',
    limitMiddleware,
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const result = await engine.syncEngine.retryEvent(req.params.id);
      return res.status(result.ok ? 200 : 404).json({ success: result.ok, ...result });
    }
  );

  router.post(
    '/sync/retry-failed',
    limitMiddleware,
    deps.requireAdminAuth,
    async (_req: Request, res: Response) => {
      const result = await engine.syncEngine.retryAllFailed();
      return res.json({ success: true, ...result });
    }
  );

  router.post(
    '/sync/publish-event',
    limitMiddleware,
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const entityType = String(req.body?.entityType || 'announcement').trim() as SyncEntityType;
      const entityId = String(req.body?.entityId || `manual_${Date.now()}`).trim();
      const action = String(req.body?.action || 'published').trim() as SyncActionType;
      const notifyMode = String(req.body?.notifyMode || 'publish_and_notify').trim() as SyncNotifyMode;
      const title = String(req.body?.title || '').trim();
      const summary = String(req.body?.summary || '').trim();
      if (!title) {
        return res.status(400).json({ success: false, error: 'title is required.' });
      }
      const outcome = await engine.syncEngine.enqueueContentEvent({
        entityType,
        entityId,
        action,
        payload: {
          title,
          summary,
          url: typeof req.body?.webUrl === 'string' ? req.body.webUrl : undefined,
        },
        notifyOptions: {
          mode: notifyMode,
          scheduledAt: typeof req.body?.scheduledAt === 'string' ? req.body.scheduledAt : undefined,
          segment: req.body?.segment as SyncAudienceSegment | undefined,
          deepLinkCallback: typeof req.body?.deepLink === 'string' ? req.body.deepLink : undefined,
        },
        createdBy: 'web_admin',
      });
      return res.json({ success: true, ...outcome });
    }
  );

  router.get('/releases', deps.requireAdminAuth, async (req: Request, res: Response) => {
    const forceRefresh = req.query.refresh === 'true';
    const current = await engine.appReleaseService.getResolvedReleaseInfo({
      checkGitHub: true,
      forceRefresh,
    });
    return res.json({
      success: true,
      current,
      releases: engine.appReleaseService.listReleases(),
    });
  });

  router.post(
    '/releases',
    limitMiddleware,
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const versionName = String(req.body?.versionName || req.body?.version || '').trim();
      const versionCode = Number(req.body?.versionCode);
      const apkDownloadUrl = String(req.body?.apkDownloadUrl || req.body?.apkUrl || '').trim();
      if (
        !versionName ||
        !Number.isFinite(versionCode) ||
        versionCode < 1 ||
        (!apkDownloadUrl.startsWith('https://') && !apkDownloadUrl.startsWith('/'))
      ) {
        return res.status(400).json({
          success: false,
          error: 'Valid version, numeric versionCode, and HTTPS/local apkDownloadUrl are required.',
        });
      }
      const saved = await engine.appReleaseService.upsertRelease(
        {
          id: typeof req.body?.id === 'string' ? req.body.id : undefined,
          platform: 'android',
          appName: typeof req.body?.appName === 'string' ? req.body.appName : 'ASAKA ZIYO',
          packageId: typeof req.body?.packageId === 'string' ? req.body.packageId : 'uz.asakaziyo.app',
          versionName,
          versionCode: Math.floor(versionCode),
          releaseNotesUz: String(req.body?.releaseNotesUz || `ASAKA ZIYO v${versionName}`),
          apkDownloadUrl,
          githubReleaseUrl:
            typeof req.body?.githubReleaseUrl === 'string' ? req.body.githubReleaseUrl : undefined,
          apkFilename:
            typeof req.body?.apkFilename === 'string'
              ? req.body.apkFilename
              : `Asaka-Ziyo-v${versionName}.apk`,
          apkSizeBytes: Number(req.body?.apkSizeBytes || req.body?.fileSizeBytes) || 0,
          sha256Checksum:
            typeof req.body?.sha256Checksum === 'string'
              ? req.body.sha256Checksum
              : typeof req.body?.sha256 === 'string'
              ? req.body.sha256
              : undefined,
          signed: Boolean(req.body?.signed ?? true),
          apksignerVerified: Boolean(req.body?.apksignerVerified ?? req.body?.signed ?? true),
          minSdk: Number(req.body?.minSdk) || 24,
          targetSdk: Number(req.body?.targetSdk) || 36,
          status: req.body?.status === 'archived' ? 'archived' : 'published',
        },
        'web_admin'
      );

      let syncEvent = null;
      if (saved.status === 'published') {
        syncEvent = await engine.syncEngine.enqueueContentEvent({
          entityType: 'app_release',
          entityId: saved.id,
          action: 'published',
          payload: {
            title: `ASAKA ZIYO Android v${saved.versionName} chiqdi!`,
            summary: saved.releaseNotesUz,
          },
          notifyOptions: {
            mode: req.body?.notifyUsers ? 'publish_and_notify' : 'section_only',
            deepLinkCallback: 'nav:android_app',
          },
          createdBy: 'web_admin',
        });
      }

      return res.json({ success: true, release: saved, syncEvent });
    }
  );

  router.post(
    '/commands/sync',
    limitMiddleware,
    deps.requireAdminAuth,
    async (_req: Request, res: Response) => {
      const result = await engine.syncBotCommandsWithTelegram();
      return res.status(result.ok ? 200 : 400).json({ success: result.ok, ...result });
    }
  );

  return { router, engine };
}
