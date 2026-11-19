/**
 * ASAKA ZIYO — Isolated Telegram Polling & Background Job Scheduler
 *
 * Manages long-polling mode with explicit diagnostics, error visibility,
 * conflict/unauthorized handling, and graceful backoff without blocking Express.
 */

import { TelegramApiUpdate } from '../types';
import { TelegramApiClient } from '../api/telegramApiClient';
import { TelegramLogger } from '../middlewares/logger';

export interface TelegramPollingStatus {
  pollingActive: boolean;
  lastPollAt: string | null;
  lastSuccessfulPollAt: string | null;
  lastUpdateAt: string | null;
  updatesProcessedCount: number;
  consecutiveErrors: number;
  lastError: string | null;
  lastErrorCode: number | null;
  lastErrorAt: string | null;
}

export class TelegramJobScheduler {
  private readonly apiClient: TelegramApiClient;
  private readonly onUpdate: (update: TelegramApiUpdate) => Promise<unknown>;
  private readonly logger: TelegramLogger;
  private pollingActive = false;
  private offset: number | undefined;
  private timer: ReturnType<typeof setTimeout> | null = null;

  private lastPollAt: string | null = null;
  private lastSuccessfulPollAt: string | null = null;
  private lastUpdateAt: string | null = null;
  private updatesProcessedCount = 0;
  private consecutiveErrors = 0;
  private lastError: string | null = null;
  private lastErrorCode: number | null = null;
  private lastErrorAt: string | null = null;

  constructor(options: {
    apiClient: TelegramApiClient;
    onUpdate: (update: TelegramApiUpdate) => Promise<unknown>;
    logger: TelegramLogger;
  }) {
    this.apiClient = options.apiClient;
    this.onUpdate = options.onUpdate;
    this.logger = options.logger;
  }

  isPolling(): boolean {
    return this.pollingActive;
  }

  getPollingStatus(): TelegramPollingStatus {
    return {
      pollingActive: this.pollingActive,
      lastPollAt: this.lastPollAt,
      lastSuccessfulPollAt: this.lastSuccessfulPollAt,
      lastUpdateAt: this.lastUpdateAt,
      updatesProcessedCount: this.updatesProcessedCount,
      consecutiveErrors: this.consecutiveErrors,
      lastError: this.lastError,
      lastErrorCode: this.lastErrorCode,
      lastErrorAt: this.lastErrorAt,
    };
  }

  startPolling(): void {
    if (this.pollingActive) return;
    if (!this.apiClient.isConfigured) {
      this.lastError = 'Cannot start polling: TELEGRAM_BOT_TOKEN is not configured.';
      this.lastErrorAt = new Date().toISOString();
      this.logger.warn(this.lastError);
      return;
    }
    this.pollingActive = true;
    this.consecutiveErrors = 0;
    this.logger.info('Telegram polling loop started');
    this.scheduleNextPoll(150);
  }

  stopPolling(): void {
    this.pollingActive = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.logger.info('Telegram polling loop stopped');
  }

  private scheduleNextPoll(delayMs: number): void {
    if (!this.pollingActive) return;
    this.timer = setTimeout(() => {
      this.pollOnce().catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.consecutiveErrors++;
        this.lastError = msg;
        this.lastErrorCode = null;
        this.lastErrorAt = new Date().toISOString();
        this.logger.error('Telegram polling tick exception', {
          error: msg,
          consecutiveErrors: this.consecutiveErrors,
        });
        const backoffMs = Math.min(30_000, 3_000 * this.consecutiveErrors);
        this.scheduleNextPoll(backoffMs);
      });
    }, delayMs);
  }

  private async pollOnce(): Promise<void> {
    if (!this.pollingActive) return;
    this.lastPollAt = new Date().toISOString();
    const res = await this.apiClient.getUpdates(this.offset, 10);

    if (res.ok && Array.isArray(res.result)) {
      this.lastSuccessfulPollAt = new Date().toISOString();
      this.consecutiveErrors = 0;
      this.lastError = null;
      this.lastErrorCode = null;

      for (const update of res.result) {
        this.offset = update.update_id + 1;
        this.lastUpdateAt = new Date().toISOString();
        this.updatesProcessedCount++;
        await this.onUpdate(update);
      }
      this.scheduleNextPoll(250);
      return;
    }

    this.consecutiveErrors++;
    this.lastErrorCode = res.error_code ?? null;
    this.lastError = res.description || 'Telegram getUpdates failed with unknown error';
    this.lastErrorAt = new Date().toISOString();

    if (res.error_code === 401) {
      this.logger.error(
        'Telegram polling stopped: 401 Unauthorized — TELEGRAM_BOT_TOKEN is invalid or revoked.',
        { errorCode: 401 }
      );
      this.stopPolling();
      return;
    }

    if (res.error_code === 409) {
      this.logger.error(
        'Telegram polling 409 Conflict: another bot instance is polling or a webhook is active for this token.',
        { errorCode: 409, description: this.lastError }
      );
    } else if (this.consecutiveErrors <= 3 || this.consecutiveErrors % 10 === 0) {
      this.logger.error('Telegram getUpdates failed', {
        errorCode: this.lastErrorCode,
        description: this.lastError,
        consecutiveErrors: this.consecutiveErrors,
      });
    }

    const backoffMs = Math.min(30_000, 5_000 * Math.min(this.consecutiveErrors, 6));
    this.scheduleNextPoll(backoffMs);
  }
}
