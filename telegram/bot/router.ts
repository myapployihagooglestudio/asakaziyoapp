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
import { CUSTOM_EMOJI_ID_REGEX } from '../emoji/customEmojiRegistry';
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

    const outcome = await engine.processUpdate(req.body);
    return res.status(200).json({
      ok: outcome.ok,
      updateId: outcome.updateId,
      kind: outcome.kind,
    });
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

  // 5. Admin-Protected Premium Custom Emoji Registry Management
  router.get('/emojis', deps.requireAdminAuth, (_req: Request, res: Response) => {
    return res.json({
      success: true,
      compatibility: engine.emojiRegistry.validateCompatibility(),
      entries: engine.emojiRegistry.listAll(),
    });
  });

  router.post(
    '/emojis',
    limitMiddleware,
    deps.requireAdminAuth,
    async (req: Request, res: Response) => {
      const key = String(req.body?.key || '').trim();
      const rawId = req.body?.customEmojiId;
      const customEmojiId = rawId === null || rawId === '' ? null : String(rawId).trim();

      if (!key || !engine.emojiRegistry.getEntry(key)) {
        return res.status(400).json({ success: false, error: 'Unknown semantic emoji key.' });
      }
      if (customEmojiId !== null && !CUSTOM_EMOJI_ID_REGEX.test(customEmojiId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid customEmojiId format. Must be 15–22 numeric digits.',
        });
      }

      const updated = engine.emojiRegistry.registerCustomEmojiId(key, customEmojiId, {
        verified: false,
        stickerSetName:
          typeof req.body?.stickerSetName === 'string'
            ? req.body.stickerSetName.slice(0, 100)
            : undefined,
      });
      await engine.repository.saveCustomEmoji(updated);
      await engine.repository.appendAuditLog({
        actorTelegramId: 'web_admin',
        actorRole: 'admin',
        action: 'custom_emoji_registered',
        targetType: 'emoji',
        targetId: key,
        metadata: { hasCustomId: Boolean(customEmojiId) },
      });

      return res.json({
        success: true,
        entry: updated,
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
