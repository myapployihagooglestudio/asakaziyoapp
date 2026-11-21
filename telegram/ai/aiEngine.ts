/**
 * ASAKA ZIYO — Telegram Super Platform AI Intelligence Engine (@google/genai)
 *
 * Capabilities:
 * - Default Primary Model: `gemini-3.1-flash-lite` (configurable in telegramSettings; Admin switchable)
 * - Live Model Availability Probe (`probeModelAvailability`) — NEVER fakes success or silently swaps models
 * - Multi-turn conversation memory persisted in `telegramUserEngagement`
 * - Daily global token budget & per-user daily request caps + latency & error telemetry (`telegramAiLogs`)
 * - 5-language responses (`uz-Latn`, `uz-Cyrl`, `uz-Latn-new` with Arabic preservation, `ru`, `en`)
 * - Voice message transcription (`gemini-3.5-transcribe`) + optional WAV TTS voice reply (`gemini-3.8-flash-lite-tts`)
 * - Image & document analysis (`inlineData`)
 * - Grounded search across ASAKA ZIYO datasets & direct service intent routing
 * - Admin AI Studio helpers (post drafting, 5-language translation, grammar polish, quiz generation, system summary)
 */

import { GoogleGenAI } from '@google/genai';
import { toNewUzbekAlphabet } from '../../src/utils/newUzbekAlphabet';
import { SURAHS_LIST } from '../../src/data/quranData';
import { AUTHENTIC_HADITHS } from '../../src/data/hadithData';
import { AUTHENTIC_DHIKRS } from '../../src/data/dhikrData';
import { EDITORIAL_ARTICLES } from '../../src/data/articlesData';
import { TAFSIRI_HILOL_ENTRIES } from '../../src/data/tafsirHilolData';
import { DEFAULT_TELEGRAM_AI_MODEL } from '../config';
import {
  TELEGRAM_SUPPORTED_LOCALES,
  TelegramAiLogRecord,
  TelegramLocale,
} from '../types';
import { TelegramRepository } from '../database/telegramRepository';
import { TelegramLogger } from '../middlewares/logger';
import { getTelegramLocaleBundle } from '../locales';

export const TELEGRAM_AI_MODEL = DEFAULT_TELEGRAM_AI_MODEL;
export const TELEGRAM_AI_TRANSCRIBE_MODEL = 'gemini-3.5-transcribe';
export const TELEGRAM_AI_TTS_MODEL = 'gemini-3.8-flash-lite-tts';

export interface TelegramAiStatus {
  phase: 'super_platform';
  model: string;
  primaryModel: string;
  fallbackModel: string | null;
  autoFallbackEnabled: boolean;
  voiceReplyEnabled: boolean;
  enabled: boolean;
  apiKeyConfigured: boolean;
  ready: boolean;
  dailyTokensUsed: number;
  dailyBudgetTokens: number;
  maxRequestsPerUserPerDay: number;
  lastProbe: TelegramAiProbeResult | null;
  reason: string;
}

export interface TelegramAiProbeResult {
  model: string;
  available: boolean;
  checkedAt: string;
  latencyMs: number;
  httpStatus?: number;
  reason: string;
}

export interface TelegramAiAnswerResult {
  handled: boolean;
  ok: boolean;
  answerText?: string;
  modelRequested: string;
  modelUsed?: string;
  routedIntent?:
    | 'prayer'
    | 'quran'
    | 'hadith'
    | 'dhikr'
    | 'quiz'
    | 'academy'
    | 'support'
    | 'mosque'
    | null;
  errorCode?:
    | 'AI_DISABLED'
    | 'API_KEY_MISSING'
    | 'EMPTY_PROMPT'
    | 'BUDGET_EXCEEDED'
    | 'USER_CAP_EXCEEDED'
    | 'MODEL_UNAVAILABLE'
    | 'UPSTREAM_ERROR';
  reason?: string;
  logId?: string;
}

export interface TelegramAiVoiceResult {
  ok: boolean;
  transcript?: string;
  answerText?: string;
  ttsAudioBuffer?: Buffer;
  ttsMimeType?: string;
  errorCode?: string;
  reason?: string;
}

export type AiGenerateFn = (
  prompt: string,
  systemInstruction: string,
  model?: string
) => Promise<string>;

export type AiTranscribeFn = (audioBuffer: Buffer, mimeType: string) => Promise<string>;
export type AiTtsFn = (text: string) => Promise<{ buffer: Buffer; mimeType: string } | null>;

function createGeminiClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil((text || '').length / 4));
}

/**
 * Wraps raw L16 PCM bytes returned by Gemini TTS into a standard RIFF WAV container if not already WAV.
 */
function ensureWavBuffer(raw: Buffer, sampleRate = 24000, channels = 1): Buffer {
  if (raw.length >= 12 && raw.subarray(0, 4).toString('ascii') === 'RIFF') {
    return raw;
  }
  const bitsPerSample = 16;
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + raw.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(raw.length, 40);
  return Buffer.concat([header, raw]);
}

function localizeOutput(text: string, locale: TelegramLocale): string {
  return locale === 'uz-Latn-new' ? toNewUzbekAlphabet(text) : text;
}

function buildSystemInstruction(
  locale: TelegramLocale,
  groundingSnippet?: string,
  customOverride?: string
): string {
  const langLabel: Record<TelegramLocale, string> = {
    'uz-Latn': 'Uzbek (Latin script)',
    'uz-Cyrl': 'Uzbek (Cyrillic script)',
    'uz-Latn-new': 'Uzbek (Latin script — will be converted safely to New Uzbek Latin)',
    ru: 'Russian',
    en: 'English',
  };

  const base =
    customOverride?.trim() ||
    'You are the respectful, scholarly ASAKA ZIYO Islamic Educational Assistant for MuhammadSolih Hoji Mosque (Asaka, Andijan, Uzbekistan — primarily Hanafi fiqh / Muslim Board of Uzbekistan standards). ' +
      `Reply clearly, warmly, and concisely (under 1400 characters) strictly in ${langLabel[locale]}. ` +
      'Cite authentic Quran Surah/Ayah or Hadith collection/number ONLY when accurate. Never invent Quran verses, religious rulings, or Hadith numbers. ' +
      'Where recognized Sunni madhhabs differ on a matter, mention the Hanafi view first and respectfully note that other scholarly opinions exist. ' +
      'Do NOT issue binding personal fatwas; for sensitive personal fiqh/fatwa questions (marriage/talaq, inheritance, disputes), politely advise consulting a qualified local Imam or opening a Support Ticket via /support. ' +
      'STRICT FORMATTING RULE: NEVER output any plain Unicode emojis, pictographs, or icon characters, and NEVER invent or emit <tg-emoji> tags or Telegram custom_emoji_id numbers. Use clean text, headings, and simple bullet points (•) only. ' +
      'Do not emit broken Markdown or unescaped HTML.';

  if (groundingSnippet) {
    return `${base}\n\n[VERIFIED ASAKA ZIYO KNOWLEDGE CONTEXT]\n${groundingSnippet}`;
  }
  return base;
}

export function detectIntentRoute(
  text: string
): TelegramAiAnswerResult['routedIntent'] {
  const q = text.toLowerCase();
  if (/(bomdod|peshin|asr|shom|xufton|namoz vaqt|time.*pray|время намаза|намаз|azon|iqomat)/i.test(q)) {
    return 'prayer';
  }
  if (/(surah|sura|oyat|ayah|qur'?on|коран|сура|tafsir|xatm|khatm|hifz|yodlash)/i.test(q)) {
    return 'quran';
  }
  if (/(hadis|hadith|buxoriy|bukhari|muslim|хадис)/i.test(q)) {
    return 'hadith';
  }
  if (/(zikr|dhikr|duo|dua|tasbeh|tasbih|зикр|дуа|истигфор)/i.test(q)) {
    return 'dhikr';
  }
  if (/(viktorina|quiz|test|savol-javob|musobaqa|викторина)/i.test(q)) {
    return 'quiz';
  }
  if (/(dars|akadem|lesson|academy|tahorat|академия|урок)/i.test(q)) {
    return 'academy';
  }
  if (/(imom|imam|murojaat|shikoyat|yordam|support|поддержк|помощ|имам)/i.test(q)) {
    return 'support';
  }
  if (/(masjid|qibla|manzil|adres|location|мечеть|кибла)/i.test(q)) {
    return 'mosque';
  }
  return null;
}

export function searchGroundedIslamicSnippets(query: string): string {
  const q = query.trim().toLowerCase();
  if (!q) return '';
  const hits: string[] = [];

  for (const s of SURAHS_LIST) {
    if (
      String(s.number) === q ||
      q.includes(s.nameUz.toLowerCase()) ||
      s.meaningUz.toLowerCase().includes(q)
    ) {
      hits.push(`Surah ${s.number}. ${s.nameUz} (${s.meaningUz}, ${s.numberOfAyahs} ayahs, ${s.revelationType}, page ${s.pageNumber})`);
      if (hits.length >= 2) break;
    }
  }

  for (const t of TAFSIRI_HILOL_ENTRIES) {
    if (q.includes(t.surahNameUz.toLowerCase()) || t.tafsirOverview.toLowerCase().includes(q)) {
      hits.push(`Tafsiri Hilol — ${t.surahNameUz}: ${t.tafsirOverview.slice(0, 260)}`);
      break;
    }
  }

  for (const h of AUTHENTIC_HADITHS) {
    const hay = `${h.chapterUz} ${h.translationUz} ${h.keywords.join(' ')}`.toLowerCase();
    if (q.split(/\s+/).some((w) => w.length >= 4 && hay.includes(w))) {
      hits.push(`Hadith (${h.reference}, ${h.grade}): ${h.translationUz.slice(0, 240)}`);
      break;
    }
  }

  for (const d of AUTHENTIC_DHIKRS) {
    const hay = `${d.titleUz} ${d.translationUz} ${d.categoryTitleUz}`.toLowerCase();
    if (q.split(/\s+/).some((w) => w.length >= 4 && hay.includes(w))) {
      hits.push(`Dhikr (${d.titleUz}, ${d.source}): ${d.translationUz.slice(0, 200)}`);
      break;
    }
  }

  for (const a of EDITORIAL_ARTICLES) {
    if (q.split(/\s+/).some((w) => w.length >= 4 && `${a.title} ${a.excerpt}`.toLowerCase().includes(w))) {
      hits.push(`Article (${a.title}): ${a.excerpt.slice(0, 200)}`);
      break;
    }
  }

  return hits.slice(0, 4).join('\n');
}

export class TelegramAiEngine {
  private readonly repo: TelegramRepository;
  private readonly logger?: TelegramLogger;
  private readonly customGenerator?: AiGenerateFn;
  private readonly customTranscriber?: AiTranscribeFn;
  private readonly customTts?: AiTtsFn;
  private readonly activeSessions = new Set<string>();
  private lastProbe: TelegramAiProbeResult | null = null;

  constructor(
    repo: TelegramRepository,
    options?: {
      logger?: TelegramLogger;
      generator?: AiGenerateFn;
      transcriber?: AiTranscribeFn;
      tts?: AiTtsFn;
    }
  ) {
    this.repo = repo;
    this.logger = options?.logger;
    this.customGenerator = options?.generator;
    this.customTranscriber = options?.transcriber;
    this.customTts = options?.tts;
  }

  private getApiKey(): string {
    return (process.env.GEMINI_API_KEY || '').trim();
  }

  private getActiveModels(): {
    primaryModel: string;
    fallbackModel: string | null;
    autoFallbackEnabled: boolean;
  } {
    const s = this.repo.getSettings();
    return {
      primaryModel: (s.aiPrimaryModel || DEFAULT_TELEGRAM_AI_MODEL).trim() || DEFAULT_TELEGRAM_AI_MODEL,
      fallbackModel: s.aiFallbackModel ? String(s.aiFallbackModel).trim() : null,
      autoFallbackEnabled: Boolean(s.aiAutoFallbackEnabled),
    };
  }

  isUserInAiMode(telegramId: string): boolean {
    if (this.activeSessions.has(telegramId)) return true;
    const eng = this.repo.getUserEngagement(telegramId);
    if (eng.aiModeActive) {
      this.activeSessions.add(telegramId);
      return true;
    }
    return false;
  }

  enterAiMode(telegramId: string): void {
    this.activeSessions.add(telegramId);
    const eng = this.repo.getUserEngagement(telegramId);
    if (!eng.aiModeActive) {
      eng.aiModeActive = true;
      this.repo.saveUserEngagement(eng).catch(() => {});
    }
  }

  exitAiMode(telegramId: string): void {
    this.activeSessions.delete(telegramId);
    const eng = this.repo.getUserEngagement(telegramId);
    if (eng.aiModeActive) {
      eng.aiModeActive = false;
      this.repo.saveUserEngagement(eng).catch(() => {});
    }
  }

  private assertAiAccessAllowed(
    telegramId: string,
    locale: TelegramLocale,
    bypassLimits = false
  ): {
    allowed: boolean;
    errorCode?: TelegramAiAnswerResult['errorCode'];
    answerText?: string;
    reason?: string;
  } {
    const dict = getTelegramLocaleBundle(locale);
    const settings = this.repo.getSettings();
    if (!settings.aiAssistantEnabled && !bypassLimits) {
      return {
        allowed: false,
        errorCode: 'AI_DISABLED',
        answerText: dict.aiDisabledNotice,
        reason: 'AI Assistant disabled in telegramSettings.',
      };
    }
    const usage = this.getDailyUsageStats(telegramId);
    const budget = settings.aiDailyBudgetTokens || 500_000;
    const maxPerUser = settings.aiMaxRequestsPerUserPerDay || 40;
    if (!bypassLimits) {
      if (usage.totalTokensToday >= budget) {
        return {
          allowed: false,
          errorCode: 'BUDGET_EXCEEDED',
          answerText: dict.aiBudgetExceededNotice,
          reason: 'Daily AI token budget reached.',
        };
      }
      if (usage.userRequestsToday >= maxPerUser) {
        return {
          allowed: false,
          errorCode: 'USER_CAP_EXCEEDED',
          answerText: dict.aiUserCapNotice,
          reason: `User daily request cap (${maxPerUser}) reached.`,
        };
      }
    }
    return { allowed: true };
  }

  async clearConversationHistory(telegramId: string): Promise<void> {
    const eng = this.repo.getUserEngagement(telegramId);
    eng.aiHistory = [];
    await this.repo.saveUserEngagement(eng);
  }

  private getDailyUsageStats(telegramId?: string): {
    totalTokensToday: number;
    userRequestsToday: number;
  } {
    const todayPrefix = new Date().toISOString().slice(0, 10);
    const logs = this.repo.listAiLogs(500);
    let totalTokensToday = 0;
    let userRequestsToday = 0;
    for (const l of logs) {
      if (!l.createdAt.startsWith(todayPrefix)) continue;
      totalTokensToday += (l.promptTokensEst || 0) + (l.responseTokensEst || 0);
      if (telegramId && l.telegramId === telegramId && l.mode !== 'probe') {
        userRequestsToday++;
      }
    }
    return { totalTokensToday, userRequestsToday };
  }

  getStatus(): TelegramAiStatus {
    const settings = this.repo.getSettings();
    const { primaryModel, fallbackModel, autoFallbackEnabled } = this.getActiveModels();
    const apiKeyConfigured = Boolean(this.customGenerator || this.getApiKey().length > 5);
    const enabled = Boolean(settings.aiAssistantEnabled);
    const { totalTokensToday } = this.getDailyUsageStats();
    const dailyBudgetTokens = settings.aiDailyBudgetTokens || 500_000;
    const maxRequestsPerUserPerDay = settings.aiMaxRequestsPerUserPerDay || 40;
    const ready = enabled && apiKeyConfigured;

    let reason = `AI Intelligence Engine ready (model: ${primaryModel}).`;
    if (!enabled) {
      reason = 'AI Assistant is disabled in telegramSettings (toggle in Admin Panel).';
    } else if (!apiKeyConfigured) {
      reason = 'GEMINI_API_KEY is not configured in server environment variables.';
    } else if (this.lastProbe && this.lastProbe.model === primaryModel && !this.lastProbe.available) {
      reason = `Warning: last live probe for "${primaryModel}" failed (${this.lastProbe.reason}).`;
    }

    return {
      phase: 'super_platform',
      model: primaryModel,
      primaryModel,
      fallbackModel,
      autoFallbackEnabled,
      voiceReplyEnabled: Boolean(settings.aiVoiceReplyEnabled ?? true),
      enabled,
      apiKeyConfigured,
      ready,
      dailyTokensUsed: totalTokensToday,
      dailyBudgetTokens,
      maxRequestsPerUserPerDay,
      lastProbe: this.lastProbe,
      reason,
    };
  }

  /**
   * Honestly probes live Gemini API availability for the specified model ID.
   * NEVER fakes availability; records exact API error / latency.
   */
  async probeModelAvailability(modelId?: string): Promise<TelegramAiProbeResult> {
    const targetModel = (modelId || this.getActiveModels().primaryModel).trim();
    const checkedAt = new Date().toISOString();
    const start = Date.now();
    const apiKey = this.getApiKey();

    if (apiKey.length <= 5) {
      const result: TelegramAiProbeResult = {
        model: targetModel,
        available: false,
        checkedAt,
        latencyMs: Date.now() - start,
        reason: 'GEMINI_API_KEY is missing from server environment.',
      };
      this.lastProbe = result;
      return result;
    }

    try {
      const ai = createGeminiClient(apiKey);
      const response = await ai.models.generateContent({
        model: targetModel,
        contents: 'Respond with exactly one word: OK',
      });
      const text = (response.text || '').trim();
      const result: TelegramAiProbeResult = {
        model: targetModel,
        available: text.length > 0,
        checkedAt,
        latencyMs: Date.now() - start,
        httpStatus: 200,
        reason: text ? `Live verified response received (${text.slice(0, 40)})` : 'Empty response returned',
      };
      this.lastProbe = result;
      await this.repo.appendAiLog({
        telegramId: 'system_probe',
        mode: 'probe',
        modelRequested: targetModel,
        modelUsed: targetModel,
        inputType: 'text',
        locale: 'en',
        latencyMs: result.latencyMs,
        promptTokensEst: 10,
        responseTokensEst: estimateTokens(text),
        ok: result.available,
        ...(result.available ? {} : { errorCode: 'EMPTY_PROBE', errorDetail: result.reason }),
      });
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const statusMatch = msg.match(/\b(400|401|403|404|429|500|503)\b/);
      const httpStatus = statusMatch ? Number(statusMatch[1]) : undefined;
      const result: TelegramAiProbeResult = {
        model: targetModel,
        available: false,
        checkedAt,
        latencyMs: Date.now() - start,
        httpStatus,
        reason: msg.slice(0, 400),
      };
      this.lastProbe = result;
      await this.repo.appendAiLog({
        telegramId: 'system_probe',
        mode: 'probe',
        modelRequested: targetModel,
        inputType: 'text',
        locale: 'en',
        latencyMs: result.latencyMs,
        promptTokensEst: 10,
        responseTokensEst: 0,
        ok: false,
        errorCode: httpStatus ? `HTTP_${httpStatus}` : 'PROBE_ERROR',
        errorDetail: result.reason,
      });
      return result;
    }
  }

  private async invokeModel(
    modelId: string,
    contents: any,
    systemInstruction: string
  ): Promise<string> {
    if (this.customGenerator) {
      const promptStr = typeof contents === 'string' ? contents : JSON.stringify(contents);
      return (await this.customGenerator(promptStr, systemInstruction, modelId)).trim();
    }
    const ai = createGeminiClient(this.getApiKey());
    const response = await ai.models.generateContent({
      model: modelId,
      contents,
      config: { systemInstruction },
    });
    return (response.text || '').trim();
  }

  async handleQuestion(
    telegramId: string,
    locale: TelegramLocale,
    rawPrompt: string,
    options?: { bypassLimits?: boolean; mode?: TelegramAiLogRecord['mode'] }
  ): Promise<TelegramAiAnswerResult> {
    const dict = getTelegramLocaleBundle(locale);
    const settings = this.repo.getSettings();
    const { primaryModel, fallbackModel, autoFallbackEnabled } = this.getActiveModels();
    const prompt = rawPrompt.trim().slice(0, 1800);

    if (!prompt) {
      return {
        handled: false,
        ok: false,
        modelRequested: primaryModel,
        errorCode: 'EMPTY_PROMPT',
        reason: 'Empty question.',
      };
    }

    const access = this.assertAiAccessAllowed(telegramId, locale, Boolean(options?.bypassLimits));
    if (!access.allowed) {
      return {
        handled: true,
        ok: false,
        modelRequested: primaryModel,
        errorCode: access.errorCode,
        answerText: access.answerText,
        reason: access.reason,
      };
    }

    if (!this.customGenerator && this.getApiKey().length <= 5) {
      return {
        handled: true,
        ok: false,
        modelRequested: primaryModel,
        errorCode: 'API_KEY_MISSING',
        answerText: dict.aiMissingKeyNotice,
        reason: 'GEMINI_API_KEY missing in server environment.',
      };
    }

    const routedIntent = detectIntentRoute(prompt);
    const grounding = searchGroundedIslamicSnippets(prompt);
    const systemInstruction = buildSystemInstruction(
      locale,
      grounding,
      settings.aiSystemPromptOverride
    );

    const eng = this.repo.getUserEngagement(telegramId);
    const historyContext = eng.aiHistory
      .slice(-8)
      .map((t) => `${t.role === 'user' ? 'User' : 'Assistant'}: ${t.text}`)
      .join('\n');
    const fullPrompt = historyContext
      ? `Recent conversation context:\n${historyContext}\n\nCurrent question: ${prompt}`
      : prompt;

    const start = Date.now();
    let modelUsed = primaryModel;
    let text = '';

    try {
      text = await this.invokeModel(primaryModel, fullPrompt, systemInstruction);
    } catch (primaryErr: unknown) {
      const primaryMsg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);

      // Only attempt explicit admin-configured fallback when autoFallbackEnabled === true
      if (autoFallbackEnabled && fallbackModel && fallbackModel !== primaryModel) {
        this.logger?.warn('Primary AI model failed; using explicit admin-configured fallback', {
          primaryModel,
          fallbackModel,
          error: primaryMsg.slice(0, 200),
        });
        try {
          modelUsed = fallbackModel;
          text = await this.invokeModel(fallbackModel, fullPrompt, systemInstruction);
        } catch (fallbackErr: unknown) {
          const fbMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
          const log = await this.repo.appendAiLog({
            telegramId,
            mode: options?.mode || 'chat',
            modelRequested: primaryModel,
            modelUsed: fallbackModel,
            inputType: 'text',
            locale,
            latencyMs: Date.now() - start,
            promptTokensEst: estimateTokens(fullPrompt),
            responseTokensEst: 0,
            ok: false,
            errorCode: 'MODEL_UNAVAILABLE',
            errorDetail: `Primary (${primaryModel}): ${primaryMsg.slice(0, 180)} | Fallback (${fallbackModel}): ${fbMsg.slice(0, 180)}`,
          });
          return {
            handled: true,
            ok: false,
            modelRequested: primaryModel,
            errorCode: 'MODEL_UNAVAILABLE',
            answerText: dict.aiErrorNotice,
            reason: log.errorDetail,
            logId: log.id,
          };
        }
      } else {
        const isNotFound = /404|not found|not supported/i.test(primaryMsg);
        const log = await this.repo.appendAiLog({
          telegramId,
          mode: options?.mode || 'chat',
          modelRequested: primaryModel,
          inputType: 'text',
          locale,
          latencyMs: Date.now() - start,
          promptTokensEst: estimateTokens(fullPrompt),
          responseTokensEst: 0,
          ok: false,
          errorCode: isNotFound ? 'MODEL_UNAVAILABLE' : 'UPSTREAM_ERROR',
          errorDetail: primaryMsg.slice(0, 350),
        });
        return {
          handled: true,
          ok: false,
          modelRequested: primaryModel,
          errorCode: isNotFound ? 'MODEL_UNAVAILABLE' : 'UPSTREAM_ERROR',
          answerText: dict.aiErrorNotice,
          reason: primaryMsg,
          logId: log.id,
        };
      }
    }

    if (!text) {
      return {
        handled: true,
        ok: false,
        modelRequested: primaryModel,
        modelUsed,
        errorCode: 'UPSTREAM_ERROR',
        answerText: dict.aiErrorNotice,
        reason: 'Empty response from Gemini API.',
      };
    }

    const finalText = localizeOutput(text, locale);
    const clamped = finalText.length > 3500 ? `${finalText.slice(0, 3490)}…` : finalText;

    // Persist conversation memory in isolated engagement collection
    eng.aiHistory = [
      ...eng.aiHistory.slice(-10),
      { role: 'user' as const, text: prompt.slice(0, 400), timestamp: new Date().toISOString() },
      { role: 'model' as const, text: clamped.slice(0, 700), timestamp: new Date().toISOString() },
    ];
    await this.repo.saveUserEngagement(eng);

    const log = await this.repo.appendAiLog({
      telegramId,
      mode: options?.mode || 'chat',
      modelRequested: primaryModel,
      modelUsed,
      inputType: 'text',
      locale,
      latencyMs: Date.now() - start,
      promptTokensEst: estimateTokens(fullPrompt),
      responseTokensEst: estimateTokens(clamped),
      ok: true,
    });

    await this.repo.appendAuditLog({
      actorTelegramId: telegramId,
      actorRole: 'user',
      action: 'ai_question_answered',
      targetType: 'ai',
      targetId: log.id,
      metadata: {
        locale,
        modelUsed,
        routedIntent: routedIntent || 'none',
        latencyMs: log.latencyMs,
      },
    });

    return {
      handled: true,
      ok: true,
      answerText: clamped,
      modelRequested: primaryModel,
      modelUsed,
      routedIntent,
      logId: log.id,
    };
  }

  /**
   * Voice message pipeline:
   * 1. Transcribes voice audio via `gemini-3.5-transcribe`
   * 2. Generates grounded Islamic answer via active AI model
   * 3. Synthesizes optional WAV voice reply via `gemini-3.8-flash-lite-tts`
   */
  async handleVoiceMessage(params: {
    telegramId: string;
    locale: TelegramLocale;
    audioBuffer: Buffer;
    mimeType?: string;
    synthesizeReply?: boolean;
  }): Promise<TelegramAiVoiceResult> {
    const access = this.assertAiAccessAllowed(params.telegramId, params.locale, false);
    if (!access.allowed) {
      return {
        ok: false,
        errorCode: access.errorCode,
        answerText: access.answerText,
        reason: access.reason,
      };
    }

    const apiKey = this.getApiKey();
    const mimeType = params.mimeType || 'audio/ogg';

    if (!this.customTranscriber && apiKey.length <= 5) {
      return {
        ok: false,
        errorCode: 'API_KEY_MISSING',
        reason: 'GEMINI_API_KEY missing for voice transcription.',
      };
    }

    const start = Date.now();
    let transcript = '';
    try {
      if (this.customTranscriber) {
        transcript = (await this.customTranscriber(params.audioBuffer, mimeType)).trim();
      } else {
        const ai = createGeminiClient(apiKey);
        const resp = await ai.models.generateContent({
          model: TELEGRAM_AI_TRANSCRIBE_MODEL,
          contents: [
            {
              inlineData: {
                mimeType,
                data: params.audioBuffer.toString('base64'),
              },
            },
            'Transcribe this voice message accurately in its original language (Uzbek Latin/Cyrillic, Russian, English, or Arabic phrases). Return only the transcript text.',
          ],
        });
        transcript = (resp.text || '').trim();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.repo.appendAiLog({
        telegramId: params.telegramId,
        mode: 'voice',
        modelRequested: TELEGRAM_AI_TRANSCRIBE_MODEL,
        inputType: 'voice',
        locale: params.locale,
        latencyMs: Date.now() - start,
        promptTokensEst: 150,
        responseTokensEst: 0,
        ok: false,
        errorCode: 'TRANSCRIBE_ERROR',
        errorDetail: msg.slice(0, 300),
      });
      return { ok: false, errorCode: 'TRANSCRIBE_ERROR', reason: msg };
    }

    if (!transcript) {
      return {
        ok: false,
        errorCode: 'EMPTY_TRANSCRIPT',
        reason: 'Could not extract speech from the voice message.',
      };
    }

    const answerRes = await this.handleQuestion(params.telegramId, params.locale, transcript, {
      mode: 'voice',
    });

    if (!answerRes.ok || !answerRes.answerText) {
      return {
        ok: false,
        transcript,
        errorCode: answerRes.errorCode,
        reason: answerRes.reason,
      };
    }

    let ttsAudioBuffer: Buffer | undefined;
    let ttsMimeType: string | undefined;

    const settings = this.repo.getSettings();
    const shouldSpeak = params.synthesizeReply ?? Boolean(settings.aiVoiceReplyEnabled);
    if (shouldSpeak) {
      try {
        if (this.customTts) {
          const custom = await this.customTts(answerRes.answerText);
          if (custom) {
            ttsAudioBuffer = custom.buffer;
            ttsMimeType = custom.mimeType;
          }
        } else if (apiKey.length > 5) {
          const ai = createGeminiClient(apiKey);
          const ttsResp = await ai.models.generateContent({
            model: TELEGRAM_AI_TTS_MODEL,
            contents: `Read calmly and respectfully:\n${answerRes.answerText.slice(0, 900)}`,
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Kore' },
                },
              },
            },
          });
          const dataB64 = ttsResp.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (dataB64) {
            ttsAudioBuffer = ensureWavBuffer(Buffer.from(dataB64, 'base64'));
            ttsMimeType = 'audio/wav';
          }
        }
      } catch (ttsErr: unknown) {
        this.logger?.warn('Optional TTS voice reply failed; returning text answer', {
          error: ttsErr instanceof Error ? ttsErr.message : String(ttsErr),
        });
      }
    }

    return {
      ok: true,
      transcript,
      answerText: answerRes.answerText,
      ttsAudioBuffer,
      ttsMimeType,
    };
  }

  /**
   * Analyzes an uploaded image or document using Gemini multimodal input.
   */
  async handleMediaAnalysis(params: {
    telegramId: string;
    locale: TelegramLocale;
    buffer: Buffer;
    mimeType: string;
    caption?: string;
    inputType: 'photo' | 'document';
  }): Promise<TelegramAiAnswerResult> {
    const dict = getTelegramLocaleBundle(params.locale);
    const { primaryModel } = this.getActiveModels();
    const access = this.assertAiAccessAllowed(params.telegramId, params.locale, false);
    if (!access.allowed) {
      return {
        handled: true,
        ok: false,
        modelRequested: primaryModel,
        errorCode: access.errorCode,
        answerText: access.answerText,
        reason: access.reason,
      };
    }
    const apiKey = this.getApiKey();

    if (!this.customGenerator && apiKey.length <= 5) {
      return {
        handled: true,
        ok: false,
        modelRequested: primaryModel,
        errorCode: 'API_KEY_MISSING',
        answerText: dict.aiMissingKeyNotice,
      };
    }

    const start = Date.now();
    const userPrompt =
      (params.caption || '').trim() ||
      'Please analyze this Islamic educational image/document clearly and concisely.';
    const sys = buildSystemInstruction(params.locale);

    try {
      const text = await this.invokeModel(
        primaryModel,
        [
          {
            inlineData: {
              mimeType: params.mimeType,
              data: params.buffer.toString('base64'),
            },
          },
          userPrompt,
        ],
        sys
      );
      const finalText = localizeOutput(text, params.locale);
      const log = await this.repo.appendAiLog({
        telegramId: params.telegramId,
        mode: 'vision',
        modelRequested: primaryModel,
        modelUsed: primaryModel,
        inputType: params.inputType,
        locale: params.locale,
        latencyMs: Date.now() - start,
        promptTokensEst: 300,
        responseTokensEst: estimateTokens(finalText),
        ok: Boolean(finalText),
      });
      return {
        handled: true,
        ok: Boolean(finalText),
        modelRequested: primaryModel,
        modelUsed: primaryModel,
        answerText: finalText || dict.aiErrorNotice,
        logId: log.id,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.repo.appendAiLog({
        telegramId: params.telegramId,
        mode: 'vision',
        modelRequested: primaryModel,
        inputType: params.inputType,
        locale: params.locale,
        latencyMs: Date.now() - start,
        promptTokensEst: 300,
        responseTokensEst: 0,
        ok: false,
        errorCode: 'UPSTREAM_ERROR',
        errorDetail: msg.slice(0, 300),
      });
      return {
        handled: true,
        ok: false,
        modelRequested: primaryModel,
        errorCode: 'UPSTREAM_ERROR',
        answerText: dict.aiErrorNotice,
        reason: msg,
      };
    }
  }

  /**
   * Transcribes an Arabic Quran recitation voice note using `gemini-3.5-transcribe`
   * for ASAKA ZIYO HIFZ audio word-comparison assistance.
   */
  async transcribeArabicRecitation(params: {
    telegramId: string;
    locale: TelegramLocale;
    audioBuffer: Buffer;
    mimeType?: string;
  }): Promise<{ ok: boolean; transcript?: string; errorCode?: string; reason?: string }> {
    const access = this.assertAiAccessAllowed(params.telegramId, params.locale, false);
    if (!access.allowed) {
      return { ok: false, errorCode: access.errorCode, reason: access.reason };
    }
    const apiKey = this.getApiKey();
    const mimeType = params.mimeType || 'audio/ogg';
    if (!this.customTranscriber && apiKey.length <= 5) {
      return { ok: false, errorCode: 'API_KEY_MISSING', reason: 'GEMINI_API_KEY missing.' };
    }
    const start = Date.now();
    try {
      let transcript = '';
      if (this.customTranscriber) {
        transcript = (await this.customTranscriber(params.audioBuffer, mimeType)).trim();
      } else {
        const ai = createGeminiClient(apiKey);
        const resp = await ai.models.generateContent({
          model: TELEGRAM_AI_TRANSCRIBE_MODEL,
          contents: [
            {
              inlineData: {
                mimeType,
                data: params.audioBuffer.toString('base64'),
              },
            },
            'Transcribe this Arabic Quran recitation faithfully in standard Arabic script without adding commentary or correcting words that were not spoken.',
          ],
        });
        transcript = (resp.text || '').trim();
      }
      await this.repo.appendAiLog({
        telegramId: params.telegramId,
        mode: 'voice',
        modelRequested: TELEGRAM_AI_TRANSCRIBE_MODEL,
        modelUsed: TELEGRAM_AI_TRANSCRIBE_MODEL,
        inputType: 'voice',
        locale: params.locale,
        latencyMs: Date.now() - start,
        promptTokensEst: 160,
        responseTokensEst: estimateTokens(transcript),
        ok: Boolean(transcript),
      });
      return transcript
        ? { ok: true, transcript }
        : { ok: false, errorCode: 'EMPTY_TRANSCRIPT', reason: 'No Arabic speech recognized.' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, errorCode: 'TRANSCRIBE_ERROR', reason: msg };
    }
  }

  /**
   * AI Hifz Coach — produces a personalized memorization/murojaa coaching tip grounded
   * strictly in the user's own Hifz progress, weak surahs, and difficult ayahs.
   */
  async askHifzCoach(params: {
    telegramId: string;
    locale: TelegramLocale;
    hifzContextSummary: string;
    userQuestion?: string;
  }): Promise<{ ok: boolean; advice?: string; errorCode?: string; reason?: string }> {
    const access = this.assertAiAccessAllowed(params.telegramId, params.locale, false);
    if (!access.allowed) {
      return { ok: false, errorCode: access.errorCode, reason: access.reason };
    }
    const { primaryModel } = this.getActiveModels();
    if (!this.customGenerator && this.getApiKey().length <= 5) {
      return { ok: false, errorCode: 'API_KEY_MISSING', reason: 'GEMINI_API_KEY missing.' };
    }

    const langLabel: Record<TelegramLocale, string> = {
      'uz-Latn': 'Uzbek (Latin script)',
      'uz-Cyrl': 'Uzbek (Cyrillic script)',
      'uz-Latn-new': 'Uzbek (Latin script)',
      ru: 'Russian',
      en: 'English',
    };

    const sys =
      'You are the respectful ASAKA ZIYO HIFZ Memorization Coach. ' +
      `Respond warmly, practically, and concisely (under 1100 characters) strictly in ${langLabel[params.locale]}. ` +
      'Give concrete memorization/murojaa tactics (chunking, linking ayah endings, active recall before looking at Mushaf, reviewing weak surahs before new ayahs, managing fatigue). ' +
      'NEVER generate Quran Arabic verses from memory. ' +
      'STRICT FORMATTING RULE: NEVER output any plain Unicode emojis, pictographs, or <tg-emoji> tags. Use clean text and simple bullets (•) only. ' +
      'ALWAYS remind the learner briefly that AI coaching supports planning & motivation, and does NOT replace a qualified Qurʼan teacher (ustoz / Qori) for tajwid and makhraj verification.';

    const prompt = [
      'Student Hifz snapshot:',
      params.hifzContextSummary,
      params.userQuestion
        ? `Student question: ${params.userQuestion.trim().slice(0, 500)}`
        : 'Give a tailored daily memorization & murojaa coaching plan based on their current progress and weak areas.',
    ].join('\n\n');

    const start = Date.now();
    try {
      const text = await this.invokeModel(primaryModel, prompt, sys);
      if (!text) {
        return { ok: false, errorCode: 'UPSTREAM_ERROR', reason: 'Empty Hifz coach response.' };
      }
      const localized = localizeOutput(text, params.locale);
      await this.repo.appendAiLog({
        telegramId: params.telegramId,
        mode: 'chat',
        modelRequested: primaryModel,
        modelUsed: primaryModel,
        inputType: 'text',
        locale: params.locale,
        latencyMs: Date.now() - start,
        promptTokensEst: estimateTokens(prompt),
        responseTokensEst: estimateTokens(localized),
        ok: true,
      });
      return { ok: true, advice: localized.slice(0, 2000) };
    } catch (err) {
      return {
        ok: false,
        errorCode: 'UPSTREAM_ERROR',
        reason: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // ---- Admin AI Studio Helpers ----

  async draftAdminPost(params: {
    adminId: string;
    topic: string;
    category: string;
    locale: TelegramLocale;
  }): Promise<{ ok: boolean; draft?: string; error?: string }> {
    const prompt = `Draft a respectful, high-readability Telegram channel post for ASAKA ZIYO Mosque in category "${params.category}" about: "${params.topic}". Include clean paragraph breaks and 2-3 relevant hashtags at the end.`;
    const res = await this.handleQuestion(params.adminId, params.locale, prompt, {
      bypassLimits: true,
      mode: 'admin_helper',
    });
    return res.ok ? { ok: true, draft: res.answerText } : { ok: false, error: res.reason };
  }

  async translateAcrossFiveLocales(params: {
    adminId: string;
    sourceText: string;
    sourceLocale: TelegramLocale;
  }): Promise<{ ok: boolean; translations?: Partial<Record<TelegramLocale, string>>; error?: string }> {
    const result: Partial<Record<TelegramLocale, string>> = {
      [params.sourceLocale]: params.sourceText,
    };
    if (params.sourceLocale === 'uz-Latn') {
      result['uz-Latn-new'] = toNewUzbekAlphabet(params.sourceText);
    }

    for (const loc of TELEGRAM_SUPPORTED_LOCALES) {
      if (result[loc]) continue;
      if (loc === 'uz-Latn-new' && result['uz-Latn']) {
        result['uz-Latn-new'] = toNewUzbekAlphabet(result['uz-Latn']!);
        continue;
      }
      const res = await this.handleQuestion(
        params.adminId,
        loc,
        `Translate this mosque announcement faithfully without adding commentary:\n\n${params.sourceText}`,
        { bypassLimits: true, mode: 'admin_helper' }
      );
      if (!res.ok || !res.answerText) {
        return { ok: false, error: res.reason || `Failed translating to ${loc}` };
      }
      result[loc] = res.answerText;
    }

    return { ok: true, translations: result };
  }

  async generateQuizQuestion(params: {
    adminId: string;
    category: string;
    locale: TelegramLocale;
  }): Promise<{ ok: boolean; questionJson?: any; raw?: string; error?: string }> {
    const res = await this.handleQuestion(
      params.adminId,
      params.locale,
      `Generate 1 verified Hanafi/Sunni Islamic multiple-choice quiz question in category "${params.category}". Return STRICT JSON ONLY with keys: question, options (array of 4 strings), correctIndex (0-3), explanation, source.`,
      { bypassLimits: true, mode: 'admin_helper' }
    );
    if (!res.ok || !res.answerText) return { ok: false, error: res.reason };
    try {
      const cleaned = res.answerText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      return { ok: true, questionJson: parsed, raw: res.answerText };
    } catch {
      return { ok: true, raw: res.answerText };
    }
  }
}
