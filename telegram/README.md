# ASAKA ZIYO — Telegram Platform Module (Phase 1 Foundation)

Isolated Telegram Bot Platform running inside the unified **ASAKA ZIYO** repository alongside the existing **Web App** and **Mobile App** without altering any existing routes, UI components, authentication, or database collections.

## Module Architecture

```
/telegram/
  config.ts                     # Independent environment-driven configuration (zero hardcoded secrets)
  types.ts                      # Isolated Bot API and domain types
  /api/telegramApiClient.ts     # Zero-dependency typed Telegram Bot API client
  /bot/
    telegramBotEngine.ts        # Core update dispatcher, error boundary, rate limiter & command sync
    router.ts                   # Isolated Express router mounted at /api/telegram/platform/*
  /handlers/
    commandHandlers.ts          # /start, /help, /language, /settings
    callbackHandlers.ts         # Structured inline keyboard callback routing
  /keyboards/keyboards.ts       # 5-language inline keyboards with CustomEmojiRegistry integration
  /middlewares/
    logger.ts                   # Secret-redacting structured JSON logger
    rateLimiter.ts              # Sliding-window per-user rate limiter
    securityMiddleware.ts       # Timing-safe X-Telegram-Bot-Api-Secret-Token & RBAC validation
  /locales/index.ts             # 5 official languages (uz-Latn, uz-Cyrl, uz-Latn-new, ru, en)
  /emoji/customEmojiRegistry.ts # Centralized Premium Custom Emoji registry + Unicode fallback
  /database/telegramRepository.ts # Strictly allowlisted telegram* collections + isolated local store
  /services/userService.ts      # Telegram user registration & language preference persistence
  /channels/channelService.ts   # Scoped Telegram channel configurations (@Asaka_Ziyo, @muhiddinsahhofuz)
  /publishing/publishingService.ts # Formatted channel publishing & publication history
  /prayer/prayerAdapter.ts      # Strictly READ-ONLY bridge to official Asaka prayer schedule
  /admin/adminService.ts        # Isolated Telegram owner/admin RBAC & audit log queries
  /ai/aiBridge.ts               # Phase 2+ AI seam (disabled in Phase 1)
  /miniapp/miniAppConfig.ts     # Phase 2+ Telegram Mini App URL builder & initData HMAC verifier
  /jobs/jobScheduler.ts         # Optional polling loop & future scheduled jobs lifecycle
  /tests/telegramPlatform.test.ts # Comprehensive Phase 1 automated verification suite
```

## Security & Database Isolation

- **Least-Privilege Collection Allowlist**: `TelegramRepository` permits writes/deletes ONLY to:
  - `telegramUsers`
  - `telegramSettings`
  - `telegramChannels`
  - `telegramAdmins`
  - `telegramPublications`
  - `telegramAuditLogs`
  - `telegramCustomEmojis`
- Attempts to write to any existing Web/Mobile collection (`users`, `admins`, `schedules`, `articles`, etc.) throw a runtime security error and are blocked by `firestore.rules`.
- Local fallback persistence uses `/data/telegram_platform_store.json` (completely separate from `/data/asaka_ziyo_db.json`).
- Webhook endpoint (`POST /api/telegram/platform/webhook`) strictly requires a matching `X-Telegram-Bot-Api-Secret-Token` header verified with `crypto.timingSafeEqual`.

## Required Environment Variables (Server-Side Only)

Set these in your server environment (never commit to Git, never prefix with `VITE_`):

- `TELEGRAM_BOT_TOKEN` — Bot token from `@BotFather`
- `TELEGRAM_BOT_USERNAME` — Bot username (without `@`)
- `TELEGRAM_WEBHOOK_SECRET` — Random high-entropy secret token (32+ chars) passed to `setWebhook`
- `TELEGRAM_WEBHOOK_URL` — Public HTTPS URL ending in `/api/telegram/platform/webhook`
- `TELEGRAM_OWNER_ID` — Numeric Telegram user ID of the platform owner
- `TELEGRAM_ADMIN_IDS` — Comma-separated numeric Telegram admin IDs
- `TELEGRAM_MODE` — Optional: `webhook` (default when deployed), `polling` (local dev), or `disabled`

## Premium Custom Emoji Setup

No fake `custom_emoji_id` values are hardcoded. To enable Premium Custom Emojis once your bot is live:
1. Ensure the bot holds Telegram Bot API eligibility for custom emoji rendering.
2. Register real numeric `custom_emoji_id` values per semantic key via `POST /api/telegram/platform/emojis` (admin auth required).
3. Run `POST /api/telegram/platform/emojis/verify` to validate each ID live via `getCustomEmojiStickers` and enable Premium entity/icon rendering automatically. Any unverified key stays cleanly on its Unicode fallback.

## Running Tests

```bash
npx tsx telegram/tests/telegramPlatform.test.ts
```
