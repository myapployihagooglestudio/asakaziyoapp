/**
 * ASAKA ZIYO — Telegram AI Bridge (Exports Super Platform TelegramAiEngine)
 */
export {
  TELEGRAM_AI_MODEL,
  TELEGRAM_AI_TRANSCRIBE_MODEL,
  TELEGRAM_AI_TTS_MODEL,
  TelegramAiEngine as TelegramAiBridge,
  TelegramAiEngine,
  detectIntentRoute,
  searchGroundedIslamicSnippets,
  type TelegramAiStatus,
  type TelegramAiProbeResult,
  type TelegramAiAnswerResult,
  type TelegramAiVoiceResult,
  type AiGenerateFn,
  type AiTranscribeFn,
  type AiTtsFn,
} from './aiEngine';
