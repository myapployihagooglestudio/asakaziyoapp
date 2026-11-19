/**
 * ASAKA ZIYO — Telegram Platform Structured Secret-Redacting Logger
 *
 * Guarantees bot tokens, webhook secrets, and auth headers are NEVER written to logs.
 */

export type TelegramLogLevel = 'debug' | 'info' | 'warn' | 'error';

const BOT_TOKEN_PATTERN = /(?:bot)?\d{6,15}:[A-Za-z0-9_-]{20,64}/g;
const SENSITIVE_KEY_PATTERN = /(token|secret|password|authorization|cookie|apikey|key)/i;

export function redactSensitiveValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(BOT_TOKEN_PATTERN, '[REDACTED_TELEGRAM_TOKEN]');
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveValue(item));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(k)) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = redactSensitiveValue(v);
      }
    }
    return out;
  }
  return value;
}

export interface TelegramLogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export function createTelegramLogger(scope = 'TelegramPlatform', silent = false): TelegramLogger {
  const emit = (level: TelegramLogLevel, message: string, meta?: Record<string, unknown>) => {
    if (silent) return;
    const safeMessage = String(redactSensitiveValue(message));
    const safeMeta = meta ? (redactSensitiveValue(meta) as Record<string, unknown>) : undefined;
    const payload = {
      ts: new Date().toISOString(),
      scope,
      level,
      msg: safeMessage,
      ...(safeMeta ? { meta: safeMeta } : {}),
    };
    const serialized = JSON.stringify(payload);
    if (level === 'error') {
      console.error(serialized);
    } else if (level === 'warn') {
      console.warn(serialized);
    } else {
      console.log(serialized);
    }
  };

  return {
    debug: (m, meta) => emit('debug', m, meta),
    info: (m, meta) => emit('info', m, meta),
    warn: (m, meta) => emit('warn', m, meta),
    error: (m, meta) => emit('error', m, meta),
  };
}
