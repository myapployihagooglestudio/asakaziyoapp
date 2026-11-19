/**
 * ASAKA ZIYO — Telegram AI Integration Seam (Phase 2+ Foundation)
 *
 * Intentionally remains inactive in Phase 1 until explicitly enabled in `telegramSettings`,
 * guaranteeing zero unintended LLM API calls during Phase 1 foundation operation.
 */

import { TelegramLocale } from '../types';
import { TelegramRepository } from '../database/telegramRepository';

export interface TelegramAiStatus {
  phase: 'foundation_seam';
  enabled: boolean;
  reason: string;
}

export class TelegramAiBridge {
  private readonly repo: TelegramRepository;

  constructor(repo: TelegramRepository) {
    this.repo = repo;
  }

  getStatus(): TelegramAiStatus {
    const settings = this.repo.getSettings();
    return {
      phase: 'foundation_seam',
      enabled: Boolean(settings.aiAssistantEnabled),
      reason: settings.aiAssistantEnabled
        ? 'AI bridge flag enabled; ready for Phase 2+ handler binding.'
        : 'Disabled in Phase 1 foundation (no external LLM calls executed).',
    };
  }

  async handleQuestion(_telegramId: string, _locale: TelegramLocale, _prompt: string): Promise<{
    handled: boolean;
    reason: string;
  }> {
    return {
      handled: false,
      reason: 'AI conversational module is scheduled for a subsequent phase.',
    };
  }
}
