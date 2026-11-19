/**
 * ASAKA ZIYO — Isolated Express Router for Telegram Platform
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
import { ScopedFirestoreBridge, createScopedTelegramFirestoreBridge } from '../database/telegramRepository';
import { ReadOnlyPrayerScheduleProvider } from '../prayer/prayerAdapter';
import { TelegramPlatformConfig } from '../config';
import { verifyTelegramMiniAppInitData } from '../miniapp/miniAppConfig';

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
  });

  // Start optional polling ONLY when TELEGRAM_MODE=polling and token is configured
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

  // 7. Telegram Mini App initData Server-Side HMAC-SHA256 Verification
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

  return { router, engine };
}
