/**
 * ASAKA ZIYO — Telegram Platform Independent Configuration
 *
 * Strictly reads ONLY from process.env (never hardcoded secrets, never exposed to frontend).
 * Preserves exclusive TELEGRAM_BOT_TOKEN1 binding (never falls back to legacy TELEGRAM_BOT_TOKEN).
 * Mini App URL defaults safely to https://asakaziyo.ai.studio while honoring valid HTTPS overrides.
 */

export type TelegramRuntimeMode = 'webhook' | 'polling' | 'disabled';

export const DEFAULT_TELEGRAM_MINIAPP_URL = 'https://asakaziyo.ai.studio';
export const DEFAULT_TELEGRAM_AI_MODEL = 'gemini-3.5-flash-lite';

export interface TelegramPlatformConfig {
  botToken: string;
  botUsername: string;
  webhookSecret: string;
  webhookUrl: string;
  ownerId: string | null;
  adminIds: string[];
  mode: TelegramRuntimeMode;
  modeAutoSelected: boolean;
  apiBaseUrl: string;
  webAppUrl: string;
  miniAppUrl: string;
  defaultChannelUsername: string;
  defaultAiModel: string;
  rateLimitMaxRequests: number;
  rateLimitWindowMs: number;
  isConfigured: boolean;
}

function parseIdList(raw: string | undefined): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(/[,\s;]+/)
        .map((s) => s.trim())
        .filter((s) => /^\d{4,20}$/.test(s))
    )
  );
}

function normalizeOwnerId(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  return /^\d{4,20}$/.test(trimmed) ? trimmed : null;
}

/**
 * Telegram InlineKeyboardButton.url & web_app.url reject non-HTTPS or localhost/loopback URLs
 * with `400 Bad Request: BUTTON_URL_INVALID`. Sanitize base URL to guarantee valid HTTPS.
 */
export function sanitizeTelegramButtonBaseUrl(rawUrl: string | undefined): string {
  const fallback = DEFAULT_TELEGRAM_MINIAPP_URL;
  const trimmed = (rawUrl || '').trim().replace(/\/+$/, '');
  if (!trimmed) return fallback;
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    const isLoopback =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.local');
    if (parsed.protocol !== 'https:' || isLoopback) {
      return fallback;
    }
    return trimmed;
  } catch {
    return fallback;
  }
}

function resolveMode(
  rawMode: string | undefined,
  botToken: string,
  webhookUrl: string,
  webhookSecret: string
): { mode: TelegramRuntimeMode; autoSelected: boolean } {
  const normalized = (rawMode || '').trim().toLowerCase();
  if (normalized === 'disabled' || normalized === 'off') {
    return { mode: 'disabled', autoSelected: false };
  }
  if (!botToken) {
    return { mode: 'disabled', autoSelected: true };
  }
  if (normalized === 'polling') {
    return { mode: 'polling', autoSelected: false };
  }
  if (normalized === 'webhook') {
    return { mode: 'webhook', autoSelected: false };
  }
  if (webhookUrl && webhookSecret) {
    return { mode: 'webhook', autoSelected: true };
  }
  return { mode: 'polling', autoSelected: true };
}

export function loadTelegramPlatformConfig(
  env: Record<string, string | undefined> = process.env
): TelegramPlatformConfig {
  // Strictly reads ONLY TELEGRAM_BOT_TOKEN1 (never falls back to legacy TELEGRAM_BOT_TOKEN)
  const botToken = (env.TELEGRAM_BOT_TOKEN1 || '').trim();
  const botUsername = (env.TELEGRAM_BOT_USERNAME || '').trim().replace(/^@+/, '');
  const webhookSecret = (env.TELEGRAM_WEBHOOK_SECRET || '').trim();
  const webhookUrl = (env.TELEGRAM_WEBHOOK_URL || '').trim();
  const ownerId = normalizeOwnerId(env.TELEGRAM_OWNER_ID);
  const adminIds = parseIdList(env.TELEGRAM_ADMIN_IDS);
  if (ownerId && !adminIds.includes(ownerId)) {
    adminIds.unshift(ownerId);
  }

  const miniAppUrl = sanitizeTelegramButtonBaseUrl(
    env.TELEGRAM_MINIAPP_URL || DEFAULT_TELEGRAM_MINIAPP_URL
  );
  const webAppUrl = miniAppUrl;
  const { mode, autoSelected } = resolveMode(env.TELEGRAM_MODE, botToken, webhookUrl, webhookSecret);

  return {
    botToken,
    botUsername,
    webhookSecret,
    webhookUrl,
    ownerId,
    adminIds,
    mode,
    modeAutoSelected: autoSelected,
    apiBaseUrl: 'https://api.telegram.org',
    webAppUrl,
    miniAppUrl,
    defaultChannelUsername: (env.TELEGRAM_CHANNEL_ID || '@Asaka_Ziyo').trim() || '@Asaka_Ziyo',
    defaultAiModel: (env.TELEGRAM_AI_MODEL || DEFAULT_TELEGRAM_AI_MODEL).trim() || DEFAULT_TELEGRAM_AI_MODEL,
    rateLimitMaxRequests: Math.max(5, Number(env.TELEGRAM_RATE_LIMIT_MAX || 30) || 30),
    rateLimitWindowMs: Math.max(5_000, Number(env.TELEGRAM_RATE_LIMIT_WINDOW_MS || 60_000) || 60_000),
    isConfigured: Boolean(botToken),
  };
}

/**
 * Returns a strictly sanitized public/admin config summary with ZERO secret material.
 */
export function getSafeTelegramConfigSummary(config: TelegramPlatformConfig) {
  const missingForWebhook: string[] = [];
  if (!config.isConfigured) missingForWebhook.push('TELEGRAM_BOT_TOKEN1');
  if (!config.webhookUrl) missingForWebhook.push('TELEGRAM_WEBHOOK_URL');
  if (!config.webhookSecret) missingForWebhook.push('TELEGRAM_WEBHOOK_SECRET');

  return {
    tokenEnvVar: 'TELEGRAM_BOT_TOKEN1',
    isConfigured: config.isConfigured,
    mode: config.mode,
    modeAutoSelected: config.modeAutoSelected,
    botUsername: config.botUsername || null,
    webhookConfigured: Boolean(config.webhookUrl),
    webhookSecretConfigured: Boolean(config.webhookSecret),
    missingForWebhook,
    ownerConfigured: Boolean(config.ownerId),
    adminCount: config.adminIds.length,
    defaultChannelUsername: config.defaultChannelUsername,
    miniAppUrl: config.miniAppUrl,
    defaultAiModel: config.defaultAiModel,
    rateLimitMaxRequests: config.rateLimitMaxRequests,
    rateLimitWindowMs: config.rateLimitWindowMs,
  };
}
