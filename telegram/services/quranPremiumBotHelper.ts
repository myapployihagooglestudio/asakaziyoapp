/**
 * ASAKA ZIYO — Telegram Bot Qur'on Ecosystem & Premium Subscription Helper
 *
 * Strictly isolated inside `/telegram/services/`.
 * Connects Telegram Bot commands (`/premium`, `/promo`, `/tanlov`, `/link`, `/qorilar`, `/about`)
 * and inline callbacks (`draw_join:*`, `premium:*`, `quran_pro:*`) to the single central
 * `QuranEcosystemService` and `SubscriptionEcosystemService`.
 */

import type { QuranEcosystemService } from '../../src/services/quranEcosystemServer';
import type { SubscriptionEcosystemService } from '../../src/services/subscriptionEcosystemServer';
import { TelegramPlatformConfig } from '../config';
import { TelegramInlineKeyboardMarkup, TelegramMessageEntity } from '../types';

export const DEVELOPER_ATTRIBUTION_LABEL = 'Dev by Ulug‘bek Mirzayev';
export const DEVELOPER_ATTRIBUTION_URL = 'https://t.me/Ulugbek_Mirzayev_uz';
export const TELEGRAM_DEV_ATTRIBUTION_HTML = `\n\n<i><a href="${DEVELOPER_ATTRIBUTION_URL}">${DEVELOPER_ATTRIBUTION_LABEL}</a></i>`;

/**
 * Appends compact, clickable developer attribution using Telegram Bot API entities
 * so it works seamlessly alongside Custom Emoji entities without conflicting parse_mode.
 */
export function appendDeveloperAttributionEntity(formatted: {
  text: string;
  entities: TelegramMessageEntity[];
}): { text: string; entities: TelegramMessageEntity[] } {
  const prefix = '\n\n';
  const offset = formatted.text.length + prefix.length;
  const label = DEVELOPER_ATTRIBUTION_LABEL;
  const nextText = `${formatted.text}${prefix}${label}`;
  const nextEntities: TelegramMessageEntity[] = [
    ...formatted.entities,
    {
      type: 'text_link',
      offset,
      length: label.length,
      url: DEVELOPER_ATTRIBUTION_URL,
    },
    {
      type: 'italic',
      offset,
      length: label.length,
    },
  ];
  return { text: nextText, entities: nextEntities };
}

export function getTelegramCanonicalUserKey(telegramId: string | number): string {
  return `tg:${String(telegramId)}`;
}

function escapeHtml(input: string): string {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatMoneyUzs(amount: number): string {
  return `${Math.round(amount).toLocaleString('ru-RU')} soʻm`;
}

function buildMiniAppTabUrl(config: TelegramPlatformConfig, tab: string): string {
  const base = (config.miniAppUrl || 'https://asakaziyo.ai.studio').replace(/\/+$/, '');
  return `${base}/?tab=${encodeURIComponent(tab)}`;
}

export function formatTelegramPremiumMessage(params: {
  subscriptionService: SubscriptionEcosystemService;
  telegramId: string | number;
  config: TelegramPlatformConfig;
  miniAppEnabled: boolean;
}): { html: string; reply_markup: TelegramInlineKeyboardMarkup } {
  const { subscriptionService, telegramId, config, miniAppEnabled } = params;
  const tgKey = getTelegramCanonicalUserKey(telegramId);
  const entData = subscriptionService.getUserEntitlements(tgKey, 'telegram_bot');
  const subState = entData.subscription;
  const catalog = subscriptionService.getPublicCatalog();
  const activePlans = catalog.plans.filter((p) => p.isActive && p.id !== 'free');
  const activePlanObj = catalog.plans.find((p) => p.id === subState.planId);

  const statusEmoji = subState.isPremium ? '👑' : '🆓';
  const statusLabel = subState.isPremium
    ? `${subState.status} (${activePlanObj?.nameUz || subState.planId})`
    : 'Bepul (Free)';
  const expiryLine =
    subState.isPremium && subState.expiresAt
      ? `\n⏳ Amal qilish muddati: <b>${subState.expiresAt.slice(0, 10)}</b> (${subState.daysRemaining} kun qoldi)`
      : '';

  const linkedLine =
    subState.userId !== tgKey
      ? `\n🔗 Bogʻlangan yagona hisob: <code>${escapeHtml(subState.userId)}</code>`
      : '\n🔗 Web/Android bilan bogʻlash: <code>/link KOD</code>';

  const fmtQuota = (key: string): string => {
    const d = entData.features[key];
    if (!d) return '—';
    if (!d.feature?.isEnabled) return '⛔ Oʻchirilgan';
    if (d.limit < 0) return '♾ Cheksiz';
    if (d.limit === 0) return '🔒 Faqat Premium';
    return `${d.remaining}/${d.limit} qoldi`;
  };

  const quotaLines = [
    `• 🤖 AI Ustoz: <b>${fmtQuota('ai_ustoz_unlimited')}</b>`,
    `• 📥 Offline Qori yuklash: <b>${fmtQuota('unlimited_offline_downloads')}</b>`,
    `• 🧠 Hifz AI & Murojaʼa: <b>${fmtQuota('hifz_ai_voice_check')}</b>`,
    `• 🎯 Qurʼon Viktorinasi: <b>${fmtQuota('quran_quiz_unlimited')}</b>`,
    `• 🎓 Tajvid & Kurslar: <b>${fmtQuota('advanced_tajweed_academy')}</b>`,
  ];

  const planLines = activePlans.map((p) => {
    const badgeNote = p.badgeUz ? ` · <i>${escapeHtml(p.badgeUz)}</i>` : '';
    return `• <b>${escapeHtml(p.nameUz)}</b> (${p.durationDays} kun) — <b>${formatMoneyUzs(p.priceUzs)}</b>${badgeNote}`;
  });

  const activeCampaignLines = (catalog.campaigns || [])
    .slice(0, 2)
    .map(
      (c) =>
        `🎁 <b>${escapeHtml(c.titleUz)}</b>${c.promoCode ? ` — Promokod: <code>${escapeHtml(c.promoCode)}</code>` : ''}`
    );

  const html =
    `<b>👑 ASAKA ZIYO — Yagona Premium Obuna Markazi</b>\n\n` +
    `${statusEmoji} Joriy holat: <b>${escapeHtml(statusLabel)}</b>` +
    `${expiryLine}${linkedLine}\n\n` +
    `<b>📊 Barcha boʻlimlar boʻyicha joriy imkoniyatlaringiz:</b>\n` +
    `${quotaLines.join('\n')}\n\n` +
    `<b>💎 Tariflar (Web, Android, Mini App va Botda yagona):</b>\n` +
    (planLines.length > 0 ? planLines.join('\n') : '• Tariflar hozircha sozlanmoqda') +
    (activeCampaignLines.length > 0 ? `\n\n<b>🔥 Faol aksiyalar:</b>\n${activeCampaignLines.join('\n')}` : '') +
    `\n\n📌 <b>Buyruqlar:</b>\n` +
    `• <code>/promo KOD</code> — Promokod faollashtirish\n` +
    `• <code>/tanlov</code> — Bepul hadya tanlovlari\n` +
    `• <code>/link 123456</code> — Web/Android hisobni ulash` +
    (catalog.cardSettings.isActive
      ? `\n\n💳 Karta orqali toʻlov Mini App ichida xavfsiz qabul qilinadi (PIN/CVV/SMS kod hech qachon soʻralmaydi).`
      : '');

  const rows: TelegramInlineKeyboardMarkup['inline_keyboard'] = [];
  if (miniAppEnabled) {
    rows.push([
      {
        text: '👑 Premium / Toʻlovni ochish',
        web_app: { url: buildMiniAppTabUrl(config, 'premium') },
      },
    ]);
  }
  rows.push([
    { text: '🎁 Bepul Tanlovlar', callback_data: 'premium:draws' },
    { text: '🎙 Qorilar Kutubxonasi', callback_data: 'quran_pro:qaris' },
  ]);
  rows.push([{ text: '🔄 Holatni yangilash', callback_data: 'premium:overview' }]);

  return { html, reply_markup: { inline_keyboard: rows } };
}

export function formatTelegramRandomDrawsMessage(params: {
  subscriptionService: SubscriptionEcosystemService;
  telegramId: string | number;
  config: TelegramPlatformConfig;
  miniAppEnabled: boolean;
}): { html: string; reply_markup: TelegramInlineKeyboardMarkup } {
  const { subscriptionService, telegramId, config, miniAppEnabled } = params;
  const tgKey = getTelegramCanonicalUserKey(telegramId);
  const canonical = subscriptionService.resolveCanonicalUserId(tgKey);
  const catalog = subscriptionService.getPublicCatalog();
  const openDraws = (catalog.randomDraws || []).filter((d) => d.status === 'OPEN');

  if (openDraws.length === 0) {
    const rows: TelegramInlineKeyboardMarkup['inline_keyboard'] = [];
    if (miniAppEnabled) {
      rows.push([
        {
          text: '👑 Premium boʻlimini ochish',
          web_app: { url: buildMiniAppTabUrl(config, 'premium') },
        },
      ]);
    }
    rows.push([{ text: '⬅️ Premium markazi', callback_data: 'premium:overview' }]);
    return {
      html:
        `<b>🎁 ASAKA ZIYO — Bepul Hadya Tanlovlari</b>\n\n` +
        `Hozirda ochiq bepul tanlov mavjud emas. Yangi Ramazon yoki Juma tanlovlari eʼlon qilinganda shu yerda paydo boʻladi.\n\n` +
        `<i>Barcha tanlovlar 100% bepul (FREE_ONLY), gʻoliblar server tomonidan halol kriptografik tasodif (CSPRNG) bilan tanlanadi.</i>`,
      reply_markup: { inline_keyboard: rows },
    };
  }

  const lines = openDraws.map((d, idx) => {
    return (
      `${idx + 1}. <b>${escapeHtml(d.titleUz)}</b>\n` +
      `   🏆 Mukofot: <b>${d.prizeDays} kun Premium</b> (${d.winnersCount} gʻolib)\n` +
      `   👥 Ishtirokchilar: <b>${d.entriesCount}</b> • 🟢 Ochiq (100% Bepul)`
    );
  });

  const rows: TelegramInlineKeyboardMarkup['inline_keyboard'] = [];
  for (const d of openDraws.slice(0, 5)) {
    rows.push([
      {
        text: `🎁 Bepul qatnashish: ${d.titleUz.slice(0, 28)}`,
        callback_data: `draw_join:${d.id}`,
      },
    ]);
  }
  rows.push([{ text: '⬅️ Premium markazi', callback_data: 'premium:overview' }]);

  return {
    html:
      `<b>🎁 ASAKA ZIYO — Bepul Hadya Tanlovlari</b>\n\n` +
      `${lines.join('\n\n')}\n\n` +
      `🔗 Hisob: <code>${escapeHtml(canonical)}</code>\n` +
      `<i>⚖️ Adolatli qoida: 1 foydalanuvchi = 1 imkoniyat. Hech qanday pul tikilmaydi, gʻoliblar server CSPRNG orqali aniqlanadi.</i>`,
    reply_markup: { inline_keyboard: rows },
  };
}

export function formatTelegramQarisLibraryMessage(params: {
  quranService: QuranEcosystemService;
  config: TelegramPlatformConfig;
  miniAppEnabled: boolean;
}): { html: string; reply_markup: TelegramInlineKeyboardMarkup } {
  const { quranService, config, miniAppEnabled } = params;
  const qaris = quranService.listQaris(false);
  const education = quranService.getEducationCatalog(false);
  const playlists = quranService.listPlaylists();

  const qariLines = qaris.slice(0, 12).map((q, idx) => {
    const cat = quranService.getQariSurahCatalog(q.id, false);
    const verifiedCount = cat ? cat.publishedCount : q.publishedSurahsCount;
    return (
      `${idx + 1}. <b>${escapeHtml(q.nameUz)}</b> (${escapeHtml(q.countryUz)})\n` +
      `   🎧 Nashr qilingan suralar: <b>${verifiedCount}/114</b> • ${escapeHtml(q.styleUz || 'Murattal')}`
    );
  });

  const rows: TelegramInlineKeyboardMarkup['inline_keyboard'] = [];
  if (miniAppEnabled) {
    rows.push([
      {
        text: '📖 Qurʼon & Audio Pleerni ochish',
        web_app: { url: buildMiniAppTabUrl(config, 'quran') },
      },
    ]);
  }
  rows.push([{ text: '👑 Premium & Oflayn Rejim', callback_data: 'premium:overview' }]);

  return {
    html:
      `<b>🎙 ASAKA ZIYO — Qorilar & Qurʼon Ekotizimi</b>\n\n` +
      (qariLines.length > 0
        ? qariLines.join('\n')
        : 'Hozircha faol qorilar roʻyxati tayyorlanmoqda.') +
      `\n\n📚 <b>Taʼlim va Pleylistlar:</b>\n` +
      `• Rasmiy pleylistlar: <b>${playlists.official.length}</b> ta\n` +
      `• 28 ta Arab harfi va maxrajlari + <b>${education.lessons.length}</b> ta Tajvid darsi\n` +
      `• Interaktiv testlar: <b>${education.quizzes.length}</b> ta\n\n` +
      `<i>Mini App ichida oflayn yuklab olish, 0.5x–2.0x tezlik, uyqu taymeri va Hifz takrorlash rejimi mavjud.</i>`,
    reply_markup: { inline_keyboard: rows },
  };
}

export function formatTelegramAboutMessage(params: {
  config: TelegramPlatformConfig;
  miniAppEnabled: boolean;
}): { html: string; reply_markup: TelegramInlineKeyboardMarkup } {
  const { config, miniAppEnabled } = params;
  const rows: TelegramInlineKeyboardMarkup['inline_keyboard'] = [];
  if (miniAppEnabled) {
    rows.push([
      {
        text: '🌐 ASAKA ZIYO Mini App',
        web_app: { url: buildMiniAppTabUrl(config, 'home') },
      },
    ]);
  }
  rows.push([
    {
      text: `👨‍💻 ${DEVELOPER_ATTRIBUTION_LABEL}`,
      url: DEVELOPER_ATTRIBUTION_URL,
    },
  ]);

  return {
    html:
      `<b>🕌 ASAKA ZIYO — Yagona Islomiy Ekotizim 2026</b>\n\n` +
      `Web App, PWA, Android ilova, Telegram Bot va Telegram Mini App bitta markaziy tizimda ishlaydi:\n` +
      `• 🕌 Asaka (Admin tasdiqlagan) + Oʻzbekiston 14 hududi + Jahon namoz vaqtlari va ob-havo\n` +
      `• 📖 114 sura Mushaf, Qorilar audio kutubxonasi, Oflayn yuklab olish, Tajvid & Hifz\n` +
      `• 👑 Yagona Free + Premium obuna va bepul hadya tanlovlari\n` +
      `• 🔗 <code>/link KOD</code> orqali barcha qurilmalarda yagona profil` +
      TELEGRAM_DEV_ATTRIBUTION_HTML,
    reply_markup: { inline_keyboard: rows },
  };
}
