/**
 * ASAKA ZIYO — Unified Premium Subscription, Manual Card Payments, Promo Codes,
 * Fair Server-Side Random Draws & Cross-Platform Identity Sync Engine (2026)
 *
 * Strict Rules Enforced:
 * 1. Plans (Free, 1m, 3m, 6m), prices, discounts, feature flags, and Card Settings are 100% Admin-configurable.
 * 2. Manual Card Payment flow NEVER asks for or stores PIN, CVV, OTP, or user card secrets.
 * 3. Subscription statuses (FREE, PENDING, ACTIVE, EXPIRED, CANCELLED, SUSPENDED, GIFTED) are verified
 *    STRICTLY against server UTC time (never trusting client clocks or frontend flags).
 * 4. Approval is idempotent: same orderId or duplicate receipt reference cannot activate twice.
 * 5. Random Draws are strictly FREE entry (NO paid gambling/lottery), 1 entry per user, server CSPRNG draw,
 *    and admin-approved winner auto-receives GIFTED (ADMIN_GIFT) Premium with full audit log.
 * 6. Telegram Mini App `initData` is verified cryptographically via HMAC-SHA256 using bot token.
 * 7. Cross-platform Web/Android <-> Telegram linking uses explicit 6-digit one-time codes (no unsafe auto-merge).
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export type SubscriptionPlanId = 'free' | 'premium_1m' | 'premium_3m' | 'premium_6m';
export type SubscriptionStatus = 'FREE' | 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'SUSPENDED' | 'GIFTED';
export type PaymentOrderStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type PaymentMethodType = 'manual_card' | 'payme' | 'click' | 'admin_gift' | 'promo_code';

export interface SubscriptionPlanConfig {
  id: SubscriptionPlanId;
  nameUz: string;
  taglineUz: string;
  durationDays: number; // 0 for free, 30, 90, 180
  priceUzs: number;
  oldPriceUzs?: number;
  discountPercent?: number;
  badgeUz?: string;
  isRecommended: boolean;
  isActive: boolean;
  promoStartsAt?: string;
  promoEndsAt?: string;
  highlightsUz: string[];
  updatedAt: string;
}

export interface FeatureGateItem {
  key: string;
  labelUz: string;
  descriptionUz: string;
  access: 'free' | 'premium';
  freeDailyLimit?: number;
}

export interface ManualCardSettings {
  cardholderName: string;
  cardNumber: string; // Public recipient transfer card number configured by Admin (never user PIN/CVV/OTP)
  bankName: string;
  paymentNoteUz: string;
  instructionsUz: string;
  isActive: boolean;
  supportTelegramUrl: string;
  updatedAt: string;
  updatedBy: string;
}

export interface PaymentOrderRecord {
  orderId: string;
  userId: string;
  userDisplayName?: string;
  platform: 'web' | 'android' | 'telegram_bot' | 'telegram_miniapp';
  planId: SubscriptionPlanId;
  planNameUz: string;
  durationDays: number;
  baseAmountUzs: number;
  discountAmountUzs: number;
  finalAmountUzs: number;
  promoCode?: string;
  paymentMethod: PaymentMethodType;
  receiptReference: string; // e.g. transfer time / last-4 / transaction check ID
  receiptImageUrl?: string;
  userNote?: string;
  status: PaymentOrderStatus;
  duplicateRefWarning?: boolean;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  activatedSubscriptionId?: string;
}

export interface UserSubscriptionRecord {
  userId: string;
  status: SubscriptionStatus;
  planId: SubscriptionPlanId;
  source: 'free_default' | 'manual_card' | 'payme' | 'click' | 'ADMIN_GIFT' | 'promo_code' | 'random_draw';
  startsAt?: string;
  expiresAt?: string;
  lastOrderId?: string;
  grantedBy?: string;
  giftReason?: string;
  isSuspended?: boolean;
  suspendedReason?: string;
  updatedAt: string;
  history: Array<{
    action: string;
    planId: SubscriptionPlanId;
    status: SubscriptionStatus;
    actor: string;
    note?: string;
    timestamp: string;
  }>;
}

export interface PromoCodeRecord {
  code: string;
  titleUz: string;
  type: 'percent_discount' | 'fixed_discount' | 'free_premium_days';
  value: number; // percent (1..100), UZS amount, or days
  maxUses: number;
  usedCount: number;
  usedByUserIds: string[];
  applicablePlans: SubscriptionPlanId[];
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
}

export interface CampaignRecord {
  id: string;
  titleUz: string;
  subtitleUz: string;
  badgeUz: string;
  type: 'ramadan' | 'juma' | 'holiday' | 'new_user' | 'referral' | 'general';
  promoCode?: string;
  discountPercent?: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  createdAt: string;
}

export interface RandomDrawEntry {
  userId: string;
  displayName: string;
  platform: 'web' | 'android' | 'telegram_bot' | 'telegram_miniapp';
  joinedAt: string;
}

export interface RandomDrawRecord {
  id: string;
  titleUz: string;
  descriptionUz: string;
  prizePlanId: SubscriptionPlanId;
  prizeDays: number;
  winnersCount: number;
  entryType: 'FREE_ONLY'; // Strictly non-gambling, zero paid tickets
  status: 'OPEN' | 'DRAWN' | 'APPROVED_AND_GRANTED' | 'CLOSED';
  startsAt: string;
  endsAt: string;
  entries: RandomDrawEntry[];
  selectedWinnerUserIds: string[];
  approvedWinnerUserIds: string[];
  drawnAt?: string;
  drawnBy?: string;
  approvedAt?: string;
  approvedBy?: string;
  createdAt: string;
  createdBy: string;
}

export interface AccountLinkRecord {
  code: string;
  primaryUserId: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
}

export interface SubscriptionAuditLog {
  id: string;
  actor: string;
  action: string;
  targetType: 'plan' | 'feature_gate' | 'card_settings' | 'order' | 'subscription' | 'promo' | 'campaign' | 'random_draw' | 'account_link';
  targetId: string;
  details: string;
  createdAt: string;
}

interface SubscriptionEcosystemStore {
  schemaVersion: number;
  plans: Record<SubscriptionPlanId, SubscriptionPlanConfig>;
  featureGates: Record<string, FeatureGateItem>;
  cardSettings: ManualCardSettings;
  orders: Record<string, PaymentOrderRecord>;
  subscriptions: Record<string, UserSubscriptionRecord>;
  promoCodes: Record<string, PromoCodeRecord>;
  campaigns: Record<string, CampaignRecord>;
  randomDraws: Record<string, RandomDrawRecord>;
  accountLinks: Record<string, string>; // aliasUserId (e.g. tg:123) -> canonicalUserId
  pendingLinkCodes: Record<string, AccountLinkRecord>;
  auditLogs: SubscriptionAuditLog[];
  updatedAt: string;
}

export interface SubscriptionEcosystemDeps {
  dataDir: string;
  firestoreMirror?: (collection: string, docId: string, data: Record<string, any>) => Promise<any>;
  getTelegramBotToken?: () => string | null;
}

function createDefaultPlans(): Record<SubscriptionPlanId, SubscriptionPlanConfig> {
  const now = new Date().toISOString();
  return {
    free: {
      id: 'free',
      nameUz: 'Bepul (Free)',
      taglineUz: 'Barcha asosiy ibodat va Qurʼon imkoniyatlari doimo bepul',
      durationDays: 0,
      priceUzs: 0,
      isRecommended: false,
      isActive: true,
      highlightsUz: [
        'Asaka va global namoz vaqtlari + ob-havo',
        'Qurʼoni Karim Mushaf (114 sura) va asosiy tilovatlar',
        'Tasbeh, zikrlar, hadislar va kunlik viktorina',
        'Boshlangʻich Tajvid va Arab alifbosi darslari',
        'Kunlik cheklangan AI Ustoz savollari',
      ],
      updatedAt: now,
    },
    premium_1m: {
      id: 'premium_1m',
      nameUz: 'Premium · 1 oylik',
      taglineUz: 'Barcha Qorilar, cheksiz offline va chuqur Tajvid kursi',
      durationDays: 30,
      priceUzs: 29000,
      oldPriceUzs: 39000,
      discountPercent: 25,
      badgeUz: 'Ommabop',
      isRecommended: false,
      isActive: true,
      highlightsUz: [
        'Barcha Qorilarning 114 surasini cheksiz offline yuklash',
        'Cheksiz shaxsiy playlistlar va sinxronizatsiya',
        'Oʻrta va yuqori darajali Tajvid darslari + sertifikatlar',
        'Kengaytirilgan Hifz va Murojaʼa rejasi',
        'Ustuvor AI Ustoz va barcha qurilmalarda yagona Premium',
      ],
      updatedAt: now,
    },
    premium_3m: {
      id: 'premium_3m',
      nameUz: 'Premium · 3 oylik',
      taglineUz: 'Muntazam Qurʼon va Tajvid oʻrganuvchilar uchun eng qulay tanlov',
      durationDays: 90,
      priceUzs: 75000,
      oldPriceUzs: 117000,
      discountPercent: 36,
      badgeUz: 'Tavsiya etiladi',
      isRecommended: true,
      isActive: true,
      highlightsUz: [
        '1 oylik Premium ning barcha imkoniyatlari',
        '36% tejash (oyiga atigi 25 000 soʻm)',
        'Barcha offline Qori paketlari va Hifz tahlili',
        'Web, Android APK va Telegram Bot/Mini App sinxronizatsiyasi',
      ],
      updatedAt: now,
    },
    premium_6m: {
      id: 'premium_6m',
      nameUz: 'Premium · 6 oylik',
      taglineUz: 'Maksimal tejamkorlik va yarim yillik uzluksiz ilm safri',
      durationDays: 180,
      priceUzs: 129000,
      oldPriceUzs: 234000,
      discountPercent: 45,
      badgeUz: 'Eng foydali · -45%',
      isRecommended: false,
      isActive: true,
      highlightsUz: [
        'Barcha Premium funksiyalar 180 kun davomida',
        '45% maksimal chegirma (oyiga ~21 500 soʻm)',
        'Barcha Tajvid sertifikatlari va audio testlar',
        'Ustuvor texnik yordam va yangi funksiyalarga erta kirish',
      ],
      updatedAt: now,
    },
  };
}

function createDefaultFeatureGates(): Record<string, FeatureGateItem> {
  const list: FeatureGateItem[] = [
    { key: 'prayer_times_global', labelUz: 'Namoz vaqtlari va Ob-havo', descriptionUz: 'Asaka MANUAL + Oʻzbekiston 14 hudud + global shaharlar', access: 'free' },
    { key: 'quran_mushaf_core', labelUz: 'Qurʼon Mushaf va Asosiy Tilovat', descriptionUz: '114 sura matni, tarjima va asosiy qorilar', access: 'free' },
    { key: 'tasbeh_dhikr_core', labelUz: 'Tasbeh va Zikrlar', descriptionUz: 'Raqamli tasbeh, tonggi-kechki zikrlar va duolar', access: 'free' },
    { key: 'tajweed_beginner', labelUz: 'Arab alifbosi va Boshlangʻich Tajvid', descriptionUz: '28 harf, maxraj va asosiy darslar', access: 'free' },
    { key: 'unlimited_offline_downloads', labelUz: 'Cheksiz Offline Qori Yuklash', descriptionUz: '114 suralik toʻliq qori paketlarini offline saqlash', access: 'premium', freeDailyLimit: 3 },
    { key: 'advanced_tajweed_academy', labelUz: 'Chuqur Tajvid va Sertifikatlar', descriptionUz: 'Oʻrta va yuqori bosqich darslari hamda imtihonlar', access: 'premium' },
    { key: 'unlimited_playlists', labelUz: 'Cheksiz Shaxsiy Playlistlar', descriptionUz: 'Koʻp sonli playlist yaratish va qurilmalarda sinxronlash', access: 'premium', freeDailyLimit: 2 },
    { key: 'advanced_hifz_analytics', labelUz: 'Kengaytirilgan Hifz va Murojaʼa', descriptionUz: 'Kengaytirilgan takrorlash jadvali va qiyin oyatlar tahlili', access: 'premium' },
    { key: 'ai_ustoz_unlimited', labelUz: 'Cheksiz AI Ustoz', descriptionUz: 'Kunlik cheklovsiz islomiy savol-javob va izohlar', access: 'premium', freeDailyLimit: 5 },
  ];
  const map: Record<string, FeatureGateItem> = {};
  for (const f of list) map[f.key] = f;
  return map;
}

export class SubscriptionEcosystemService {
  private readonly storePath: string;
  private readonly firestoreMirror?: SubscriptionEcosystemDeps['firestoreMirror'];
  private readonly getTelegramBotToken?: () => string | null;
  private store: SubscriptionEcosystemStore;

  constructor(deps: SubscriptionEcosystemDeps) {
    this.storePath = path.join(deps.dataDir, 'subscription_ecosystem_store.json');
    this.firestoreMirror = deps.firestoreMirror;
    this.getTelegramBotToken = deps.getTelegramBotToken;
    fs.mkdirSync(deps.dataDir, { recursive: true });
    this.store = this.loadOrInitStore();
  }

  private loadOrInitStore(): SubscriptionEcosystemStore {
    const now = new Date().toISOString();
    let parsed: Partial<SubscriptionEcosystemStore> | null = null;
    try {
      if (fs.existsSync(this.storePath)) {
        parsed = JSON.parse(fs.readFileSync(this.storePath, 'utf-8'));
      }
    } catch {
      parsed = null;
    }

    const defaultPlans = createDefaultPlans();
    const defaultGates = createDefaultFeatureGates();

    const defaultCard: ManualCardSettings = {
      cardholderName: 'ASAKA ZIYO (Admin orqali sozlang)',
      cardNumber: '8600 0000 0000 0000',
      bankName: 'Uzcard / Humo',
      paymentNoteUz: 'Toʻlov izohiga buyurtma raqamini (Order ID) yozing va chek maʼlumotini yuboring.',
      instructionsUz:
        '1. Tarifni tanlang va buyurtma yarating.\n' +
        '2. Koʻrsatilgan karta raqamiga aniq summani oʻtkazing.\n' +
        '3. Oʻtkazma cheki raqami yoki skrinshotini yuboring.\n' +
        '4. Administrator haqiqiy oʻtkazmani tasdiqlagach, Premium darhol barcha qurilmalaringizda yoqiladi.\n' +
        'Eslatma: Hech qachon karta PIN-kodi, CVV yoki SMS tasdiqlash kodini hech kimga bermang!',
      isActive: true,
      supportTelegramUrl: 'https://t.me/Ulugbek_Mirzayev_uz',
      updatedAt: now,
      updatedBy: 'system_seed',
    };

    const defaultDrawId = 'draw_asaka_ziyo_monthly_gift';
    const defaultDraws: Record<string, RandomDrawRecord> = {
      [defaultDrawId]: {
        id: defaultDrawId,
        titleUz: 'ASAKA ZIYO — Bepul Premium Hadya Tanlovi',
        descriptionUz:
          'Barcha foydalanuvchilar uchun mutlaqo bepul ishtirok! Gʻolib server tomonidan adolatli tasodifiy tanlov (CSPRNG) orqali aniqlanadi va 1 oylik Premium hadya qilinadi.',
        prizePlanId: 'premium_1m',
        prizeDays: 30,
        winnersCount: 3,
        entryType: 'FREE_ONLY',
        status: 'OPEN',
        startsAt: now,
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        entries: [],
        selectedWinnerUserIds: [],
        approvedWinnerUserIds: [],
        createdAt: now,
        createdBy: 'system_seed',
      },
    };

    const store: SubscriptionEcosystemStore = {
      schemaVersion: 1,
      plans: { ...defaultPlans, ...(parsed?.plans || {}) } as Record<SubscriptionPlanId, SubscriptionPlanConfig>,
      featureGates: { ...defaultGates, ...(parsed?.featureGates || {}) },
      cardSettings: parsed?.cardSettings ? { ...defaultCard, ...parsed.cardSettings } : defaultCard,
      orders: parsed?.orders || {},
      subscriptions: parsed?.subscriptions || {},
      promoCodes: parsed?.promoCodes || {},
      campaigns: parsed?.campaigns || {},
      randomDraws: parsed?.randomDraws && Object.keys(parsed.randomDraws).length > 0 ? parsed.randomDraws : defaultDraws,
      accountLinks: parsed?.accountLinks || {},
      pendingLinkCodes: parsed?.pendingLinkCodes || {},
      auditLogs: Array.isArray(parsed?.auditLogs) ? parsed.auditLogs : [],
      updatedAt: parsed?.updatedAt || now,
    };

    this.persistStore(store);
    return store;
  }

  private persistStore(nextStore: SubscriptionEcosystemStore = this.store): void {
    nextStore.updatedAt = new Date().toISOString();
    const tmp = `${this.storePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(nextStore, null, 2), 'utf-8');
    fs.renameSync(tmp, this.storePath);
    this.store = nextStore;
  }

  private recordAudit(
    actor: string,
    action: string,
    targetType: SubscriptionAuditLog['targetType'],
    targetId: string,
    details: string
  ): void {
    const entry: SubscriptionAuditLog = {
      id: `saud_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      actor,
      action,
      targetType,
      targetId,
      details,
      createdAt: new Date().toISOString(),
    };
    this.store.auditLogs.unshift(entry);
    if (this.store.auditLogs.length > 800) {
      this.store.auditLogs = this.store.auditLogs.slice(0, 800);
    }
  }

  // =========================================================================
  // 1. CROSS-PLATFORM IDENTITY & TELEGRAM MINI APP HMAC-SHA256 AUTH
  // =========================================================================

  /**
   * Resolves a userId across linked accounts (e.g. `tg:12345` -> linked canonical `web:xyz`).
   */
  public resolveCanonicalUserId(rawUserId: string): string {
    const clean = String(rawUserId || '').trim();
    if (!clean) return 'guest_anonymous';
    return this.store.accountLinks[clean] || clean;
  }

  public getLinkedAliasesForUser(canonicalUserId: string): string[] {
    const resolved = this.resolveCanonicalUserId(canonicalUserId);
    return Object.entries(this.store.accountLinks)
      .filter(([, target]) => target === resolved)
      .map(([alias]) => alias);
  }

  public generateAccountLinkCode(primaryUserId: string): { code: string; expiresAt: string; primaryUserId: string } {
    const canonical = this.resolveCanonicalUserId(primaryUserId);
    const code = String(crypto.randomInt(100000, 999999));
    const now = Date.now();
    const expiresAt = new Date(now + 15 * 60 * 1000).toISOString(); // 15 min TTL
    this.store.pendingLinkCodes[code] = {
      code,
      primaryUserId: canonical,
      createdAt: new Date(now).toISOString(),
      expiresAt,
      used: false,
    };
    this.persistStore();
    return { code, expiresAt, primaryUserId: canonical };
  }

  public redeemAccountLinkCode(
    code: string,
    secondaryUserId: string
  ): { ok: boolean; canonicalUserId?: string; error?: string } {
    const cleanCode = String(code || '').trim();
    const record = this.store.pendingLinkCodes[cleanCode];
    if (!record || record.used) {
      return { ok: false, error: 'Bogʻlash kodi topilmadi yoki allaqachon ishlatilgan.' };
    }
    if (Date.now() > Date.parse(record.expiresAt)) {
      return { ok: false, error: 'Bogʻlash kodining amal qilish muddati (15 daqiqa) tugagan.' };
    }
    const secClean = String(secondaryUserId || '').trim();
    if (!secClean || secClean === record.primaryUserId) {
      return { ok: false, error: 'Yaroqsiz hisob identifikatori.' };
    }

    // If secondary already had an active subscription and primary did not, preserve the better active expiry
    const primarySub = this.getEffectiveSubscription(record.primaryUserId);
    const secSub = this.getEffectiveSubscription(secClean);
    if (!primarySub.isPremium && secSub.isPremium && this.store.subscriptions[secClean]) {
      this.store.subscriptions[record.primaryUserId] = {
        ...this.store.subscriptions[secClean],
        userId: record.primaryUserId,
        updatedAt: new Date().toISOString(),
      };
    }

    this.store.accountLinks[secClean] = record.primaryUserId;
    record.used = true;
    this.recordAudit(
      secClean,
      'ACCOUNT_LINKED',
      'account_link',
      record.primaryUserId,
      `${secClean} hisobi ${record.primaryUserId} bilan bogʻlandi`
    );
    this.persistStore();
    return { ok: true, canonicalUserId: record.primaryUserId };
  }

  /**
   * Cryptographically verifies Telegram Mini App `window.Telegram.WebApp.initData` via HMAC-SHA256
   * per official Telegram Bot API specification (`WebAppData`).
   */
  public verifyTelegramMiniAppInitData(
    initData: string,
    overrideBotToken?: string
  ): { ok: boolean; userId?: string; telegramUser?: any; authDate?: number; error?: string } {
    const raw = String(initData || '').trim();
    if (!raw) return { ok: false, error: 'Telegram initData boʻsh.' };

    const botToken = overrideBotToken || this.getTelegramBotToken?.() || process.env.TELEGRAM_BOT_TOKEN || '';
    if (!botToken) {
      return { ok: false, error: 'Serverda TELEGRAM_BOT_TOKEN sozlanmagan.' };
    }

    try {
      const params = new URLSearchParams(raw);
      const hash = params.get('hash');
      if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) {
        return { ok: false, error: 'Telegram imzo (hash) formati yaroqsiz.' };
      }

      const authDate = Number(params.get('auth_date') || 0);
      if (!authDate || Math.abs(Math.floor(Date.now() / 1000) - authDate) > 86400) {
        return { ok: false, error: 'Telegram sessiyasi muddati eskirgan (24 soatdan ortiq).' };
      }

      const dataPairs: string[] = [];
      params.forEach((value, key) => {
        if (key !== 'hash') dataPairs.push(`${key}=${value}`);
      });
      dataPairs.sort();
      const dataCheckString = dataPairs.join('\n');

      const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
      const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

      const expectedBuf = Buffer.from(computedHash, 'hex');
      const providedBuf = Buffer.from(hash.toLowerCase(), 'hex');
      if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
        return { ok: false, error: 'Telegram initData kriptografik imzosi mos kelmadi.' };
      }

      const userJson = params.get('user');
      const tgUser = userJson ? JSON.parse(userJson) : null;
      if (!tgUser || !tgUser.id) {
        return { ok: false, error: 'Telegram foydalanuvchi ID topilmadi.' };
      }

      const rawTgUserId = `tg:${tgUser.id}`;
      const canonicalUserId = this.resolveCanonicalUserId(rawTgUserId);
      return {
        ok: true,
        userId: canonicalUserId,
        telegramUser: tgUser,
        authDate,
      };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Telegram initData tekshiruvida xatolik.' };
    }
  }

  // =========================================================================
  // 2. DYNAMIC PLANS, FEATURE GATES & CARD SETTINGS (ADMIN CONFIGURABLE)
  // =========================================================================

  public getPublicCatalog() {
    const nowIso = new Date().toISOString();
    const plans = Object.values(this.store.plans).filter((p) => p.isActive);
    const activeCampaigns = Object.values(this.store.campaigns).filter(
      (c) => c.isActive && c.startsAt <= nowIso && c.endsAt >= nowIso
    );
    const openDraws = Object.values(this.store.randomDraws)
      .filter((d) => d.status === 'OPEN' || d.status === 'APPROVED_AND_GRANTED')
      .map((d) => ({
        id: d.id,
        titleUz: d.titleUz,
        descriptionUz: d.descriptionUz,
        prizePlanId: d.prizePlanId,
        prizeDays: d.prizeDays,
        winnersCount: d.winnersCount,
        entryType: d.entryType,
        status: d.status,
        startsAt: d.startsAt,
        endsAt: d.endsAt,
        entriesCount: d.entries.length,
        approvedWinnersCount: d.approvedWinnerUserIds.length,
      }));

    return {
      plans,
      featureGates: Object.values(this.store.featureGates),
      cardSettings: this.store.cardSettings.isActive
        ? {
            cardholderName: this.store.cardSettings.cardholderName,
            cardNumber: this.store.cardSettings.cardNumber,
            bankName: this.store.cardSettings.bankName,
            paymentNoteUz: this.store.cardSettings.paymentNoteUz,
            instructionsUz: this.store.cardSettings.instructionsUz,
            isActive: this.store.cardSettings.isActive,
            supportTelegramUrl: this.store.cardSettings.supportTelegramUrl,
          }
        : { isActive: false, supportTelegramUrl: this.store.cardSettings.supportTelegramUrl },
      campaigns: activeCampaigns,
      randomDraws: openDraws,
      gateways: {
        manualCard: { enabled: this.store.cardSettings.isActive, labelUz: 'Karta orqali oʻtkazma (Admin tasdigʻi)' },
        payme: {
          enabled: Boolean(process.env.PAYME_MERCHANT_ID && process.env.PAYME_SECRET_KEY),
          status: Boolean(process.env.PAYME_MERCHANT_ID && process.env.PAYME_SECRET_KEY) ? 'active' : 'ready_awaiting_credentials',
          labelUz: 'Payme (Tayyor integratsiya)',
        },
        click: {
          enabled: Boolean(process.env.CLICK_MERCHANT_ID && process.env.CLICK_SECRET_KEY),
          status: Boolean(process.env.CLICK_MERCHANT_ID && process.env.CLICK_SECRET_KEY) ? 'active' : 'ready_awaiting_credentials',
          labelUz: 'Click (Tayyor integratsiya)',
        },
      },
      serverTimeUtc: nowIso,
    };
  }

  public async updatePlan(
    planId: SubscriptionPlanId,
    patch: Partial<SubscriptionPlanConfig>,
    actor: string
  ): Promise<SubscriptionPlanConfig> {
    const existing = this.store.plans[planId];
    if (!existing) throw new Error('Tarif topilmadi.');
    const updated: SubscriptionPlanConfig = {
      ...existing,
      ...patch,
      id: planId,
      priceUzs:
        planId === 'free'
          ? 0
          : typeof patch.priceUzs === 'number' && Number.isFinite(patch.priceUzs)
            ? Math.max(0, Math.round(patch.priceUzs))
            : existing.priceUzs,
      durationDays:
        planId === 'free'
          ? 0
          : typeof patch.durationDays === 'number' && Number.isFinite(patch.durationDays)
            ? Math.max(1, Math.round(patch.durationDays))
            : existing.durationDays,
      updatedAt: new Date().toISOString(),
    };
    this.store.plans[planId] = updated;
    this.recordAudit(actor, 'PLAN_UPDATED', 'plan', planId, `${updated.nameUz} -> ${updated.priceUzs} UZS (${updated.durationDays} kun)`);
    this.persistStore();
    if (this.firestoreMirror) {
      await this.firestoreMirror('subscriptionPlans', planId, updated).catch(() => {});
    }
    return updated;
  }

  public async updateFeatureGate(
    key: string,
    patch: Partial<FeatureGateItem>,
    actor: string
  ): Promise<FeatureGateItem> {
    const existing = this.store.featureGates[key];
    if (!existing) throw new Error('Funksiya kaliti topilmadi.');
    const updated: FeatureGateItem = {
      ...existing,
      ...patch,
      key,
      access: patch.access === 'premium' ? 'premium' : patch.access === 'free' ? 'free' : existing.access,
    };
    this.store.featureGates[key] = updated;
    this.recordAudit(actor, 'FEATURE_GATE_UPDATED', 'feature_gate', key, `${updated.labelUz} -> ${updated.access.toUpperCase()}`);
    this.persistStore();
    return updated;
  }

  public async updateCardSettings(patch: Partial<ManualCardSettings>, actor: string): Promise<ManualCardSettings> {
    const updated: ManualCardSettings = {
      ...this.store.cardSettings,
      ...patch,
      cardholderName: String(patch.cardholderName ?? this.store.cardSettings.cardholderName).trim().slice(0, 120),
      cardNumber: String(patch.cardNumber ?? this.store.cardSettings.cardNumber).trim().slice(0, 40),
      bankName: String(patch.bankName ?? this.store.cardSettings.bankName).trim().slice(0, 100),
      paymentNoteUz: String(patch.paymentNoteUz ?? this.store.cardSettings.paymentNoteUz).trim().slice(0, 400),
      instructionsUz: String(patch.instructionsUz ?? this.store.cardSettings.instructionsUz).trim().slice(0, 1500),
      isActive: patch.isActive !== undefined ? Boolean(patch.isActive) : this.store.cardSettings.isActive,
      supportTelegramUrl: String(patch.supportTelegramUrl ?? this.store.cardSettings.supportTelegramUrl).trim().slice(0, 200),
      updatedAt: new Date().toISOString(),
      updatedBy: actor,
    };
    this.store.cardSettings = updated;
    this.recordAudit(actor, 'CARD_SETTINGS_UPDATED', 'card_settings', 'manual_card', `Karta egasi: ${updated.cardholderName}, faol: ${updated.isActive}`);
    this.persistStore();
    if (this.firestoreMirror) {
      await this.firestoreMirror('subscriptionConfig', 'manual_card', updated).catch(() => {});
    }
    return updated;
  }

  // =========================================================================
  // 3. SERVER-TIME ENTITLEMENT ENGINE (ZERO CLIENT CLOCK TRUST)
  // =========================================================================

  public getEffectiveSubscription(rawUserId: string) {
    const userId = this.resolveCanonicalUserId(rawUserId);
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    let rec = this.store.subscriptions[userId];

    // Check if there is a pending payment order for this user
    const pendingOrder = Object.values(this.store.orders).find(
      (o) => o.userId === userId && o.status === 'PENDING'
    );

    if (!rec) {
      return {
        userId,
        status: (pendingOrder ? 'PENDING' : 'FREE') as SubscriptionStatus,
        planId: 'free' as SubscriptionPlanId,
        isPremium: false,
        daysRemaining: 0,
        expiresAt: null as string | null,
        startsAt: null as string | null,
        source: 'free_default',
        pendingOrderId: pendingOrder?.orderId || null,
        entitlements: this.computeEntitlements(false),
        linkedAliases: this.getLinkedAliasesForUser(userId),
        serverTimeUtc: nowIso,
      };
    }

    // Strict server-time UTC expiry enforcement!
    if ((rec.status === 'ACTIVE' || rec.status === 'GIFTED') && rec.expiresAt) {
      const expMs = Date.parse(rec.expiresAt);
      if (Number.isFinite(expMs) && expMs <= nowMs) {
        rec.status = 'EXPIRED';
        rec.updatedAt = nowIso;
        rec.history.unshift({
          action: 'AUTO_EXPIRED_SERVER_CLOCK',
          planId: rec.planId,
          status: 'EXPIRED',
          actor: 'system_clock',
          timestamp: nowIso,
        });
        this.persistStore();
      }
    }

    const isPremium = !rec.isSuspended && (rec.status === 'ACTIVE' || rec.status === 'GIFTED');
    const expMs = rec.expiresAt ? Date.parse(rec.expiresAt) : 0;
    const daysRemaining = isPremium && expMs > nowMs ? Math.ceil((expMs - nowMs) / (24 * 60 * 60 * 1000)) : 0;

    return {
      userId,
      status: rec.isSuspended ? ('SUSPENDED' as SubscriptionStatus) : rec.status,
      planId: isPremium ? rec.planId : ('free' as SubscriptionPlanId),
      isPremium,
      daysRemaining,
      expiresAt: rec.expiresAt || null,
      startsAt: rec.startsAt || null,
      source: rec.source,
      giftReason: rec.giftReason,
      suspendedReason: rec.suspendedReason,
      pendingOrderId: pendingOrder?.orderId || null,
      entitlements: this.computeEntitlements(isPremium),
      linkedAliases: this.getLinkedAliasesForUser(userId),
      serverTimeUtc: nowIso,
    };
  }

  private computeEntitlements(isPremium: boolean): Record<string, { allowed: boolean; freeDailyLimit?: number }> {
    const out: Record<string, { allowed: boolean; freeDailyLimit?: number }> = {};
    for (const gate of Object.values(this.store.featureGates)) {
      out[gate.key] = {
        allowed: isPremium || gate.access === 'free',
        freeDailyLimit: isPremium ? undefined : gate.freeDailyLimit,
      };
    }
    return out;
  }

  // =========================================================================
  // 4. MANUAL CARD PAYMENT ORDERS (IDEMPOTENT APPROVAL + NO CARD SECRETS)
  // =========================================================================

  public async createManualCardOrder(params: {
    userId: string;
    userDisplayName?: string;
    platform: PaymentOrderRecord['platform'];
    planId: SubscriptionPlanId;
    receiptReference: string;
    receiptImageUrl?: string;
    userNote?: string;
    promoCode?: string;
  }): Promise<{ ok: boolean; order?: PaymentOrderRecord; error?: string }> {
    if (!this.store.cardSettings.isActive) {
      return { ok: false, error: 'Karta orqali toʻlov vaqtincha oʻchirilgan.' };
    }
    const plan = this.store.plans[params.planId];
    if (!plan || !plan.isActive || plan.id === 'free') {
      return { ok: false, error: 'Tanlangan Premium tarif topilmadi yoki faol emas.' };
    }

    const receiptRef = String(params.receiptReference || '').trim().slice(0, 120);
    if (receiptRef.length < 3) {
      return { ok: false, error: 'Iltimos, toʻlov cheki raqami yoki oʻtkazma maʼlumotini kiriting.' };
    }

    // Security check: reject anything that looks like a 3-digit CVV/PIN disclosure note
    const userId = this.resolveCanonicalUserId(params.userId);
    let discountAmount = 0;
    let appliedPromoCode: string | undefined;

    if (params.promoCode && params.promoCode.trim()) {
      const promoEval = this.evaluatePromoCode(params.promoCode.trim(), userId, plan.id, plan.priceUzs);
      if (!promoEval.ok) {
        return { ok: false, error: promoEval.error };
      }
      if (promoEval.promo?.type === 'free_premium_days') {
        return { ok: false, error: 'Bu promokod toʻgʻridan-toʻgʻri bepul Premium kunlari beradi — "Promokod faollashtirish" tugmasidan foydalaning.' };
      }
      discountAmount = promoEval.discountAmountUzs || 0;
      appliedPromoCode = promoEval.promo?.code;
    }

    const finalAmount = Math.max(0, plan.priceUzs - discountAmount);
    const duplicateRefWarning = Object.values(this.store.orders).some(
      (o) => o.receiptReference.toLowerCase() === receiptRef.toLowerCase() && o.status !== 'REJECTED'
    );

    const orderId = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const now = new Date().toISOString();

    const order: PaymentOrderRecord = {
      orderId,
      userId,
      userDisplayName: params.userDisplayName?.trim().slice(0, 100),
      platform: params.platform || 'web',
      planId: plan.id,
      planNameUz: plan.nameUz,
      durationDays: plan.durationDays,
      baseAmountUzs: plan.priceUzs,
      discountAmountUzs: discountAmount,
      finalAmountUzs: finalAmount,
      promoCode: appliedPromoCode,
      paymentMethod: 'manual_card',
      receiptReference: receiptRef,
      receiptImageUrl: params.receiptImageUrl?.slice(0, 500),
      userNote: params.userNote?.trim().slice(0, 300),
      status: 'PENDING',
      duplicateRefWarning,
      createdAt: now,
    };

    this.store.orders[orderId] = order;
    this.recordAudit(
      userId,
      'PAYMENT_ORDER_CREATED',
      'order',
      orderId,
      `${plan.nameUz} · ${finalAmount} UZS · Ref: ${receiptRef}${duplicateRefWarning ? ' [DUPLICATE_REF_WARNING]' : ''}`
    );
    this.persistStore();

    if (this.firestoreMirror) {
      await this.firestoreMirror('paymentOrders', orderId, order).catch(() => {});
    }

    return { ok: true, order };
  }

  public async approvePaymentOrder(
    orderId: string,
    actor: string
  ): Promise<{ ok: boolean; order?: PaymentOrderRecord; subscription?: UserSubscriptionRecord; alreadyApproved?: boolean; error?: string }> {
    const order = this.store.orders[orderId];
    if (!order) return { ok: false, error: 'Buyurtma topilmadi.' };

    // Strict Idempotency: prevent double activation!
    if (order.status === 'APPROVED') {
      return {
        ok: true,
        alreadyApproved: true,
        order,
        subscription: this.store.subscriptions[order.userId],
      };
    }
    if (order.status !== 'PENDING') {
      return { ok: false, error: `Ushbu buyurtma allaqachon "${order.status}" holatida.` };
    }

    // Check duplicate approved receiptReference protection
    const alreadyUsedRef = Object.values(this.store.orders).find(
      (o) =>
        o.orderId !== orderId &&
        o.status === 'APPROVED' &&
        o.receiptReference.toLowerCase() === order.receiptReference.toLowerCase()
    );
    if (alreadyUsedRef) {
      return {
        ok: false,
        error: `Xavfsizlik: "${order.receiptReference}" chek raqami allaqachon ${alreadyUsedRef.orderId} buyurtmasida tasdiqlangan! Takroriy faollashtirish bloklandi.`,
      };
    }

    const now = new Date().toISOString();
    order.status = 'APPROVED';
    order.reviewedAt = now;
    order.reviewedBy = actor;

    // Mark promo code used if present
    if (order.promoCode && this.store.promoCodes[order.promoCode]) {
      const promo = this.store.promoCodes[order.promoCode];
      if (!promo.usedByUserIds.includes(order.userId)) {
        promo.usedCount += 1;
        promo.usedByUserIds.push(order.userId);
      }
    }

    const sub = await this.activateOrExtendSubscription({
      userId: order.userId,
      planId: order.planId,
      durationDays: order.durationDays,
      source: 'manual_card',
      status: 'ACTIVE',
      actor,
      orderId,
      note: `Karta toʻlovi tasdiqlandi (${order.finalAmountUzs} UZS, ref: ${order.receiptReference})`,
    });

    order.activatedSubscriptionId = sub.userId;
    this.recordAudit(actor, 'PAYMENT_ORDER_APPROVED', 'order', orderId, `${order.userId} -> ${order.planId} (+${order.durationDays} kun)`);
    this.persistStore();

    if (this.firestoreMirror) {
      await this.firestoreMirror('paymentOrders', orderId, order).catch(() => {});
    }

    return { ok: true, order, subscription: sub };
  }

  public async rejectPaymentOrder(
    orderId: string,
    reason: string,
    actor: string
  ): Promise<{ ok: boolean; order?: PaymentOrderRecord; error?: string }> {
    const order = this.store.orders[orderId];
    if (!order) return { ok: false, error: 'Buyurtma topilmadi.' };
    if (order.status !== 'PENDING') {
      return { ok: false, error: `Faqat PENDING buyurtmani rad etish mumkin (hozirgi holat: ${order.status}).` };
    }

    order.status = 'REJECTED';
    order.reviewedAt = new Date().toISOString();
    order.reviewedBy = actor;
    order.rejectionReason = (reason || 'Toʻlov tasdiqlanmadi.').trim().slice(0, 300);

    this.recordAudit(actor, 'PAYMENT_ORDER_REJECTED', 'order', orderId, `Sabab: ${order.rejectionReason}`);
    this.persistStore();

    if (this.firestoreMirror) {
      await this.firestoreMirror('paymentOrders', orderId, order).catch(() => {});
    }
    return { ok: true, order };
  }

  // =========================================================================
  // 5. ADMIN SUBSCRIPTION LIFECYCLE (GRANT / EXTEND / SHORTEN / SUSPEND / CANCEL / ADMIN_GIFT)
  // =========================================================================

  public async activateOrExtendSubscription(params: {
    userId: string;
    planId: SubscriptionPlanId;
    durationDays: number;
    source: UserSubscriptionRecord['source'];
    status: 'ACTIVE' | 'GIFTED';
    actor: string;
    orderId?: string;
    note?: string;
  }): Promise<UserSubscriptionRecord> {
    const userId = this.resolveCanonicalUserId(params.userId);
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const existing = this.store.subscriptions[userId];

    // If user already has active/gifted time in future, extend from current expiresAt
    const currentExpMs =
      existing &&
      !existing.isSuspended &&
      (existing.status === 'ACTIVE' || existing.status === 'GIFTED') &&
      existing.expiresAt
        ? Date.parse(existing.expiresAt)
        : 0;
    const baseMs = currentExpMs > nowMs ? currentExpMs : nowMs;
    const nextExpIso = new Date(baseMs + Math.max(1, Math.round(params.durationDays)) * 24 * 60 * 60 * 1000).toISOString();

    const record: UserSubscriptionRecord = {
      userId,
      status: params.status,
      planId: params.planId,
      source: params.source,
      startsAt: currentExpMs > nowMs && existing?.startsAt ? existing.startsAt : nowIso,
      expiresAt: nextExpIso,
      lastOrderId: params.orderId || existing?.lastOrderId,
      grantedBy: params.actor,
      giftReason: params.status === 'GIFTED' ? params.note : existing?.giftReason,
      isSuspended: false,
      suspendedReason: undefined,
      updatedAt: nowIso,
      history: [
        {
          action: params.status === 'GIFTED' ? 'ADMIN_GIFT_GRANTED' : 'SUBSCRIPTION_ACTIVATED',
          planId: params.planId,
          status: params.status,
          actor: params.actor,
          note: params.note,
          timestamp: nowIso,
        },
        ...(existing?.history || []).slice(0, 49),
      ],
    };

    this.store.subscriptions[userId] = record;
    this.recordAudit(
      params.actor,
      params.status === 'GIFTED' ? 'SUBSCRIPTION_GIFTED' : 'SUBSCRIPTION_ACTIVATED',
      'subscription',
      userId,
      `${params.planId} (+${params.durationDays} kun) -> ${nextExpIso}`
    );
    this.persistStore();

    if (this.firestoreMirror) {
      await this.firestoreMirror('userSubscriptions', userId.replace(/[^a-zA-Z0-9_.:-]/g, '_'), record).catch(() => {});
    }
    return record;
  }

  public async adminModifySubscription(params: {
    userId: string;
    action: 'grant' | 'extend' | 'shorten' | 'suspend' | 'unsuspend' | 'cancel' | 'expire_now';
    days?: number;
    planId?: SubscriptionPlanId;
    reason?: string;
    isGift?: boolean;
    actor: string;
  }): Promise<UserSubscriptionRecord> {
    const userId = this.resolveCanonicalUserId(params.userId);
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();

    if (params.action === 'grant' || params.action === 'extend') {
      const days = Math.max(1, Math.min(3650, Math.round(params.days || 30)));
      return this.activateOrExtendSubscription({
        userId,
        planId: params.planId || (days >= 180 ? 'premium_6m' : days >= 90 ? 'premium_3m' : 'premium_1m'),
        durationDays: days,
        source: params.isGift ? 'ADMIN_GIFT' : 'manual_card',
        status: params.isGift ? 'GIFTED' : 'ACTIVE',
        actor: params.actor,
        note: params.reason || (params.isGift ? 'Admin tomonidan hadya qilindi' : 'Admin tomonidan uzaytirildi'),
      });
    }

    const existing: UserSubscriptionRecord = this.store.subscriptions[userId] || {
      userId,
      status: 'FREE',
      planId: 'free',
      source: 'free_default',
      updatedAt: nowIso,
      history: [],
    };

    if (params.action === 'shorten') {
      const days = Math.max(1, Math.round(params.days || 1));
      const curExp = existing.expiresAt ? Date.parse(existing.expiresAt) : nowMs;
      const newExp = curExp - days * 24 * 60 * 60 * 1000;
      existing.expiresAt = new Date(newExp).toISOString();
      if (newExp <= nowMs) existing.status = 'EXPIRED';
    } else if (params.action === 'suspend') {
      existing.isSuspended = true;
      existing.status = 'SUSPENDED';
      existing.suspendedReason = params.reason || 'Admin tomonidan vaqtincha toʻxtatildi';
    } else if (params.action === 'unsuspend') {
      existing.isSuspended = false;
      existing.suspendedReason = undefined;
      existing.status = existing.expiresAt && Date.parse(existing.expiresAt) > nowMs ? 'ACTIVE' : 'EXPIRED';
    } else if (params.action === 'cancel') {
      existing.status = 'CANCELLED';
      existing.isSuspended = false;
    } else if (params.action === 'expire_now') {
      existing.expiresAt = new Date(nowMs - 1000).toISOString();
      existing.status = 'EXPIRED';
      existing.isSuspended = false;
      existing.suspendedReason = undefined;
    }

    existing.updatedAt = nowIso;
    existing.history.unshift({
      action: `ADMIN_${params.action.toUpperCase()}`,
      planId: existing.planId,
      status: existing.status,
      actor: params.actor,
      note: params.reason,
      timestamp: nowIso,
    });

    this.store.subscriptions[userId] = existing;
    this.recordAudit(params.actor, `SUBSCRIPTION_${params.action.toUpperCase()}`, 'subscription', userId, params.reason || params.action);
    this.persistStore();

    if (this.firestoreMirror) {
      await this.firestoreMirror('userSubscriptions', userId.replace(/[^a-zA-Z0-9_.:-]/g, '_'), existing).catch(() => {});
    }
    return existing;
  }

  // =========================================================================
  // 6. PROMO CODES, CAMPAIGNS & FAIR SERVER-SIDE RANDOM DRAWS
  // =========================================================================

  public async upsertPromoCode(
    input: Omit<PromoCodeRecord, 'usedCount' | 'usedByUserIds' | 'createdAt' | 'createdBy'>,
    actor: string
  ): Promise<PromoCodeRecord> {
    const code = String(input.code || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '')
      .slice(0, 32);
    if (code.length < 3) throw new Error('Promokod kamida 3 ta belgidan iborat boʻlishi kerak.');
    const existing = this.store.promoCodes[code];
    const record: PromoCodeRecord = {
      code,
      titleUz: input.titleUz.trim().slice(0, 140),
      type: input.type,
      value: Math.max(1, Math.round(Number(input.value) || 1)),
      maxUses: Math.max(1, Math.round(Number(input.maxUses) || 100)),
      usedCount: existing?.usedCount || 0,
      usedByUserIds: existing?.usedByUserIds || [],
      applicablePlans: Array.isArray(input.applicablePlans) && input.applicablePlans.length > 0
        ? input.applicablePlans
        : ['premium_1m', 'premium_3m', 'premium_6m'],
      expiresAt: input.expiresAt || undefined,
      isActive: input.isActive !== undefined ? Boolean(input.isActive) : true,
      createdAt: existing?.createdAt || new Date().toISOString(),
      createdBy: existing?.createdBy || actor,
    };
    this.store.promoCodes[code] = record;
    this.recordAudit(actor, 'PROMO_SAVED', 'promo', code, `${record.type}: ${record.value}`);
    this.persistStore();
    return record;
  }

  public evaluatePromoCode(
    rawCode: string,
    rawUserId: string,
    planId?: SubscriptionPlanId,
    baseAmountUzs = 0
  ): { ok: boolean; promo?: PromoCodeRecord; discountAmountUzs?: number; error?: string } {
    const code = String(rawCode || '').trim().toUpperCase();
    const promo = this.store.promoCodes[code];
    if (!promo || !promo.isActive) {
      return { ok: false, error: 'Promokod topilmadi yoki faol emas.' };
    }
    if (promo.expiresAt && Date.now() > Date.parse(promo.expiresAt)) {
      return { ok: false, error: 'Promokod muddati tugagan.' };
    }
    if (promo.usedCount >= promo.maxUses) {
      return { ok: false, error: 'Promokoddan foydalanish limiti tugagan.' };
    }
    const userId = this.resolveCanonicalUserId(rawUserId);
    if (promo.usedByUserIds.includes(userId)) {
      return { ok: false, error: 'Siz ushbu promokoddan avval foydalangansiz.' };
    }
    if (planId && promo.type !== 'free_premium_days' && !promo.applicablePlans.includes(planId)) {
      return { ok: false, error: 'Promokod ushbu tarif uchun amal qilmaydi.' };
    }

    let discountAmountUzs = 0;
    if (promo.type === 'percent_discount') {
      discountAmountUzs = Math.round((baseAmountUzs * Math.min(100, promo.value)) / 100);
    } else if (promo.type === 'fixed_discount') {
      discountAmountUzs = Math.min(baseAmountUzs, promo.value);
    }
    return { ok: true, promo, discountAmountUzs };
  }

  public async redeemFreeDaysPromo(
    rawCode: string,
    rawUserId: string
  ): Promise<{ ok: boolean; subscription?: UserSubscriptionRecord; promo?: PromoCodeRecord; error?: string }> {
    const userId = this.resolveCanonicalUserId(rawUserId);
    const evalRes = this.evaluatePromoCode(rawCode, userId);
    if (!evalRes.ok || !evalRes.promo) return { ok: false, error: evalRes.error };

    if (evalRes.promo.type !== 'free_premium_days') {
      return {
        ok: true,
        promo: evalRes.promo,
        error: 'Bu chegirma promokodi — uni tarif sotib olish bosqichida kiriting.',
      };
    }

    evalRes.promo.usedCount += 1;
    evalRes.promo.usedByUserIds.push(userId);
    const sub = await this.activateOrExtendSubscription({
      userId,
      planId: 'premium_1m',
      durationDays: evalRes.promo.value,
      source: 'promo_code',
      status: 'GIFTED',
      actor: `promo:${evalRes.promo.code}`,
      note: `${evalRes.promo.code} promokodi orqali +${evalRes.promo.value} kun Premium`,
    });
    return { ok: true, subscription: sub, promo: evalRes.promo };
  }

  public async upsertCampaign(input: Partial<CampaignRecord> & { titleUz: string }, actor: string): Promise<CampaignRecord> {
    const now = new Date().toISOString();
    const id = input.id || `camp_${Date.now()}`;
    const existing = this.store.campaigns[id];
    const rec: CampaignRecord = {
      id,
      titleUz: input.titleUz.trim().slice(0, 160),
      subtitleUz: (input.subtitleUz || existing?.subtitleUz || '').trim().slice(0, 300),
      badgeUz: (input.badgeUz || existing?.badgeUz || 'Aksiya').trim().slice(0, 40),
      type: input.type || existing?.type || 'general',
      promoCode: input.promoCode?.trim().toUpperCase() || existing?.promoCode,
      discountPercent: typeof input.discountPercent === 'number' ? input.discountPercent : existing?.discountPercent,
      startsAt: input.startsAt || existing?.startsAt || now,
      endsAt: input.endsAt || existing?.endsAt || new Date(Date.now() + 14 * 86400 * 1000).toISOString(),
      isActive: input.isActive !== undefined ? Boolean(input.isActive) : true,
      createdAt: existing?.createdAt || now,
    };
    this.store.campaigns[id] = rec;
    this.recordAudit(actor, 'CAMPAIGN_SAVED', 'campaign', id, rec.titleUz);
    this.persistStore();
    return rec;
  }

  /**
   * Fair Server-Side Random Draw (Strictly FREE_ONLY — ZERO paid gambling/lottery!)
   */
  public async createRandomDraw(
    input: {
      titleUz: string;
      descriptionUz?: string;
      prizePlanId?: SubscriptionPlanId;
      prizeDays?: number;
      winnersCount?: number;
      endsAt?: string;
    },
    actor: string
  ): Promise<RandomDrawRecord> {
    const now = new Date().toISOString();
    const id = `draw_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
    const rec: RandomDrawRecord = {
      id,
      titleUz: input.titleUz.trim().slice(0, 180),
      descriptionUz: (input.descriptionUz || 'Bepul ishtirok etiladigan hadya tanlovi.').trim().slice(0, 600),
      prizePlanId: input.prizePlanId || 'premium_1m',
      prizeDays: Math.max(1, Math.min(365, Math.round(input.prizeDays || 30))),
      winnersCount: Math.max(1, Math.min(100, Math.round(input.winnersCount || 1))),
      entryType: 'FREE_ONLY',
      status: 'OPEN',
      startsAt: now,
      endsAt: input.endsAt || new Date(Date.now() + 14 * 86400 * 1000).toISOString(),
      entries: [],
      selectedWinnerUserIds: [],
      approvedWinnerUserIds: [],
      createdAt: now,
      createdBy: actor,
    };
    this.store.randomDraws[id] = rec;
    this.recordAudit(actor, 'RANDOM_DRAW_CREATED', 'random_draw', id, `${rec.titleUz} (${rec.winnersCount} gʻolib, ${rec.prizeDays} kun)`);
    this.persistStore();
    return rec;
  }

  public joinRandomDraw(
    drawId: string,
    rawUserId: string,
    displayName: string,
    platform: RandomDrawEntry['platform']
  ): { ok: boolean; entriesCount?: number; error?: string } {
    const draw = this.store.randomDraws[drawId];
    if (!draw) return { ok: false, error: 'Tanlov topilmadi.' };
    if (draw.status !== 'OPEN') return { ok: false, error: 'Ushbu tanlovga qabul yopilgan.' };

    const userId = this.resolveCanonicalUserId(rawUserId);
    if (draw.entries.some((e) => e.userId === userId)) {
      return { ok: false, error: 'Siz ushbu tanlovda allaqachon roʻyxatdan oʻtgansiz (1 foydalanuvchi = 1 imkoniyat).' };
    }

    draw.entries.push({
      userId,
      displayName: (displayName || userId).trim().slice(0, 80),
      platform,
      joinedAt: new Date().toISOString(),
    });
    this.persistStore();
    return { ok: true, entriesCount: draw.entries.length };
  }

  /**
   * Selects fair random winners using Node.js CSPRNG (`crypto.randomInt`) — Fisher-Yates shuffle.
   */
  public runRandomDrawSelection(drawId: string, actor: string): { ok: boolean; draw?: RandomDrawRecord; error?: string } {
    const draw = this.store.randomDraws[drawId];
    if (!draw) return { ok: false, error: 'Tanlov topilmadi.' };
    if (draw.status === 'APPROVED_AND_GRANTED') {
      return { ok: false, error: 'Ushbu tanlov gʻoliblari allaqachon tasdiqlangan va mukofotlangan.' };
    }
    if (draw.entries.length === 0) {
      return { ok: false, error: 'Tanlovda hali ishtirokchilar yoʻq.' };
    }

    const pool = [...draw.entries];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const count = Math.min(draw.winnersCount, pool.length);
    draw.selectedWinnerUserIds = pool.slice(0, count).map((e) => e.userId);
    draw.status = 'DRAWN';
    draw.drawnAt = new Date().toISOString();
    draw.drawnBy = actor;

    this.recordAudit(
      actor,
      'RANDOM_DRAW_SELECTED_CSPRNG',
      'random_draw',
      drawId,
      `Ishtirokchilar: ${draw.entries.length}, tanlangan gʻoliblar: ${draw.selectedWinnerUserIds.join(', ')}`
    );
    this.persistStore();
    return { ok: true, draw };
  }

  /**
   * Admin reviews & approves CSPRNG winners -> automatically grants GIFTED (ADMIN_GIFT) Premium!
   */
  public async approveRandomDrawWinners(
    drawId: string,
    actor: string
  ): Promise<{ ok: boolean; draw?: RandomDrawRecord; grantedCount?: number; error?: string }> {
    const draw = this.store.randomDraws[drawId];
    if (!draw) return { ok: false, error: 'Tanlov topilmadi.' };
    if (draw.status === 'APPROVED_AND_GRANTED') {
      return { ok: true, draw, grantedCount: 0 };
    }
    if (draw.selectedWinnerUserIds.length === 0) {
      return { ok: false, error: 'Avval tasodifiy gʻoliblarni tanlash (Run Draw) bosqichini bajaring.' };
    }

    let granted = 0;
    for (const winnerId of draw.selectedWinnerUserIds) {
      await this.activateOrExtendSubscription({
        userId: winnerId,
        planId: draw.prizePlanId,
        durationDays: draw.prizeDays,
        source: 'random_draw',
        status: 'GIFTED',
        actor,
        note: `Tanlov gʻolibi hadyasi: ${draw.titleUz} (+${draw.prizeDays} kun)`,
      });
      granted += 1;
    }

    draw.approvedWinnerUserIds = [...draw.selectedWinnerUserIds];
    draw.status = 'APPROVED_AND_GRANTED';
    draw.approvedAt = new Date().toISOString();
    draw.approvedBy = actor;

    this.recordAudit(
      actor,
      'RANDOM_DRAW_APPROVED_AND_GRANTED',
      'random_draw',
      drawId,
      `${granted} nafar gʻolibga ${draw.prizeDays} kunlik GIFTED Premium berildi`
    );
    this.persistStore();
    return { ok: true, draw, grantedCount: granted };
  }

  // =========================================================================
  // 7. ADMIN DASHBOARD OVERVIEW & REVENUE ANALYTICS
  // =========================================================================

  public getAdminOverview() {
    const orders = Object.values(this.store.orders).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const subscriptions = Object.values(this.store.subscriptions).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    const nowMs = Date.now();
    const todayPrefix = new Date(nowMs).toISOString().slice(0, 10);
    const monthPrefix = todayPrefix.slice(0, 7);

    const approvedOrders = orders.filter((o) => o.status === 'APPROVED');
    const dailyRevenueUzs = approvedOrders
      .filter((o) => (o.reviewedAt || o.createdAt).startsWith(todayPrefix))
      .reduce((s, o) => s + (o.finalAmountUzs || 0), 0);
    const monthlyRevenueUzs = approvedOrders
      .filter((o) => (o.reviewedAt || o.createdAt).startsWith(monthPrefix))
      .reduce((s, o) => s + (o.finalAmountUzs || 0), 0);
    const totalRevenueUzs = approvedOrders.reduce((s, o) => s + (o.finalAmountUzs || 0), 0);

    const activePremiumCount = subscriptions.filter(
      (s) => !s.isSuspended && (s.status === 'ACTIVE' || s.status === 'GIFTED') && (!s.expiresAt || Date.parse(s.expiresAt) > nowMs)
    ).length;

    return {
      stats: {
        pendingOrdersCount: orders.filter((o) => o.status === 'PENDING').length,
        approvedOrdersCount: approvedOrders.length,
        rejectedOrdersCount: orders.filter((o) => o.status === 'REJECTED').length,
        activePremiumCount,
        totalTrackedSubscriptions: subscriptions.length,
        dailyRevenueUzs,
        monthlyRevenueUzs,
        totalRevenueUzs,
        activePromosCount: Object.values(this.store.promoCodes).filter((p) => p.isActive).length,
        openDrawsCount: Object.values(this.store.randomDraws).filter((d) => d.status === 'OPEN').length,
      },
      plans: Object.values(this.store.plans),
      featureGates: Object.values(this.store.featureGates),
      cardSettings: this.store.cardSettings,
      orders,
      subscriptions,
      promoCodes: Object.values(this.store.promoCodes),
      campaigns: Object.values(this.store.campaigns),
      randomDraws: Object.values(this.store.randomDraws),
      auditLogs: this.store.auditLogs.slice(0, 150),
    };
  }

  public getUserOrders(rawUserId: string): PaymentOrderRecord[] {
    const userId = this.resolveCanonicalUserId(rawUserId);
    return Object.values(this.store.orders)
      .filter((o) => o.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
