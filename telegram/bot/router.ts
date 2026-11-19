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

  // 6. Admin-Protected Isolated Channels, Publications & Audit Logs
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

  return { router, engine };
}
