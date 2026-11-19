/**
 * ASAKA ZIYO — Telegram AI Islamic Assistant Bridge (Server-Side @google/genai)
 *
 * Uses the recommended @google/genai SDK with `gemini-4-hydrogen` on the server side.
 * Strictly honors `telegramSettings.aiAssistantEnabled` and `process.env.GEMINI_API_KEY`.
 * NEVER fakes or simulates AI responses when the API key is missing or upstream fails.
 */

import { GoogleGenAI } from '@google/genai';
import { toNewUzbekAlphabet } from '../../src/utils/newUzbekAlphabet';
import { TelegramLocale } from '../types';
import { TelegramRepository } from '../database/telegramRepository';
import { TelegramLogger } from '../middlewares/logger';
import { getTelegramLocaleBundle } from '../locales';

export const TELEGRAM_AI_MODEL = 'gemini-4-hydrogen';

export interface TelegramAiStatus {
  phase: 'active';
  model: string;
  enabled: boolean;
  apiKeyConfigured: boolean;
  ready: boolean;
  reason: string;
}

export interface TelegramAiAnswerResult {
  handled: boolean;
  ok: boolean;
  answerText?: string;
  errorCode?: 'AI_DISABLED' | 'API_KEY_MISSING' | 'EMPTY_PROMPT' | 'UPSTREAM_ERROR';
  reason?: string;
}

export type AiGenerateFn = (prompt: string, systemInstruction: string) => Promise<string>;

function buildSystemInstruction(locale: TelegramLocale): string {
  const langLabel: Record<TelegramLocale, string> = {
    'uz-Latn': 'Uzbek (Latin script)',
    'uz-Cyrl': 'Uzbek (Cyrillic script)',
    'uz-Latn-new': 'Uzbek (Latin script — will be converted to New Uzbek Latin)',
    ru: 'Russian',
    en: 'English',
  };
  return (
    'You are the respectful, scholarly ASAKA ZIYO Islamic Educational Assistant for MuhammadSolih Hoji Mosque (Asaka, Andijan, Uzbekistan, Hanafi jurisprudence / Muslim Board of Uzbekistan standards). ' +
    `Always reply concisely (under 1400 characters, suitable for Telegram), clearly, politely, and strictly in ${langLabel[locale]}. ` +
    'Cite Quran surah/ayah or Hadith sources accurately when relevant. Never issue extreme verdicts; for sensitive personal fatwa questions, advise consulting a local Imam. ' +
    'Do not use Markdown asterisks or HTML tags that break plain Telegram text; use clean paragraphs and bullet points.'
  );
}

export class TelegramAiBridge {
  private readonly repo: TelegramRepository;
  private readonly logger?: TelegramLogger;
  private readonly customGenerator?: AiGenerateFn;
  private readonly activeSessions = new Set<string>();

  constructor(
    repo: TelegramRepository,
    options?: { logger?: TelegramLogger; generator?: AiGenerateFn }
  ) {
    this.repo = repo;
    this.logger = options?.logger;
    this.customGenerator = options?.generator;
  }

  private getApiKey(): string {
    return (process.env.GEMINI_API_KEY || '').trim();
  }

  isUserInAiMode(telegramId: string): boolean {
    return this.activeSessions.has(telegramId);
  }

  enterAiMode(telegramId: string): void {
    this.activeSessions.add(telegramId);
  }

  exitAiMode(telegramId: string): void {
    this.activeSessions.delete(telegramId);
  }

  getStatus(): TelegramAiStatus {
    const settings = this.repo.getSettings();
    const apiKeyConfigured = Boolean(this.customGenerator || this.getApiKey().length > 5);
    const enabled = Boolean(settings.aiAssistantEnabled);
    const ready = enabled && apiKeyConfigured;

    let reason = 'AI Assistant is ready.';
    if (!enabled) {
      reason = 'AI Assistant is disabled in telegramSettings (toggle in Admin Panel).';
    } else if (!apiKeyConfigured) {
      reason = 'GEMINI_API_KEY is not configured in server environment variables.';
    }

    return {
      phase: 'active',
      model: TELEGRAM_AI_MODEL,
      enabled,
      apiKeyConfigured,
      ready,
      reason,
    };
  }

  async handleQuestion(
    telegramId: string,
    locale: TelegramLocale,
    rawPrompt: string
  ): Promise<TelegramAiAnswerResult> {
    const dict = getTelegramLocaleBundle(locale);
    const settings = this.repo.getSettings();
    const prompt = rawPrompt.trim().slice(0, 1000);

    if (!prompt) {
      return { handled: false, ok: false, errorCode: 'EMPTY_PROMPT', reason: 'Empty question.' };
    }

    if (!settings.aiAssistantEnabled) {
      return {
        handled: true,
        ok: false,
        errorCode: 'AI_DISABLED',
        answerText: dict.aiDisabledNotice,
        reason: 'AI Assistant disabled in telegramSettings.',
      };
    }

    const apiKey = this.getApiKey();
    if (!this.customGenerator && apiKey.length <= 5) {
      return {
        handled: true,
        ok: false,
        errorCode: 'API_KEY_MISSING',
        answerText: dict.aiMissingKeyNotice,
        reason: 'GEMINI_API_KEY missing in server environment.',
      };
    }

    const systemInstruction = buildSystemInstruction(locale);

    try {
      let text: string;
      if (this.customGenerator) {
        text = await this.customGenerator(prompt, systemInstruction);
      } else {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });
        const response = await ai.models.generateContent({
          model: TELEGRAM_AI_MODEL,
          contents: prompt,
          config: {
            systemInstruction,
          },
        });
        text = (response.text || '').trim();
      }

      if (!text) {
        return {
          handled: true,
          ok: false,
          errorCode: 'UPSTREAM_ERROR',
          answerText: dict.aiErrorNotice,
          reason: 'Empty response from Gemini API.',
        };
      }

      const finalText = locale === 'uz-Latn-new' ? toNewUzbekAlphabet(text) : text;
      const clamped = finalText.length > 3500 ? `${finalText.slice(0, 3490)}…` : finalText;

      await this.repo.appendAuditLog({
        actorTelegramId: telegramId,
        actorRole: 'user',
        action: 'ai_question_answered',
        targetType: 'ai',
        metadata: { locale, promptLength: prompt.length, answerLength: clamped.length },
      });

      return {
        handled: true,
        ok: true,
        answerText: clamped,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger?.error('Telegram AI Assistant Gemini API error', {
        error: msg,
        model: TELEGRAM_AI_MODEL,
      });
      return {
        handled: true,
        ok: false,
        errorCode: 'UPSTREAM_ERROR',
        answerText: dict.aiErrorNotice,
        reason: msg,
      };
    }
  }
}
