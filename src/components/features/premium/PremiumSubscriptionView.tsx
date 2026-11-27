import React, { useEffect, useState, useCallback } from 'react';
import {
  getActiveEcosystemUserId,
  setCanonicalEcosystemUserId,
  detectClientPlatform,
} from '../../../utils/userIdentityClient';
import { notifyEntitlementsChanged } from '../../../utils/entitlementClient';
import {
  Crown,
  Check,
  Copy,
  CreditCard,
  Gift,
  Sparkles,
  ShieldCheck,
  Clock,
  Tag,
  Link2,
  Send,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lock,
  Infinity as InfinityIcon,
} from 'lucide-react';

function fmtUzs(val: number): string {
  return `${new Intl.NumberFormat('uz-UZ').format(val || 0)} soʻm`;
}

export const PremiumSubscriptionView: React.FC = () => {
  const [userId, setUserId] = useState<string>(() => getActiveEcosystemUserId());
  const [catalog, setCatalog] = useState<any | null>(null);
  const [mySub, setMySub] = useState<any | null>(null);
  const [myFeatures, setMyFeatures] = useState<Record<string, any>>({});
  const [moduleLabelsUz, setModuleLabelsUz] = useState<Record<string, string>>({});
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [justActivated, setJustActivated] = useState(false);
  const [showExtendCheckout, setShowExtendCheckout] = useState(false);

  // Checkout state
  const [selectedPlanId, setSelectedPlanId] = useState<string>('premium_3m');
  const [receiptRef, setReceiptRef] = useState('');
  const [userDisplayName, setUserDisplayName] = useState('');
  const [userNote, setUserNote] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountAmountUzs: number; titleUz: string } | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [copiedCard, setCopiedCard] = useState(false);

  // Cross-platform Telegram account linking code
  const [linkCodeData, setLinkCodeData] = useState<{ code: string; expiresAt: string } | null>(null);
  const [redeemCodeInput, setRedeemCodeInput] = useState('');
  const [redeemingCode, setRedeemingCode] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const platform = detectClientPlatform();
      const [catRes, meRes] = await Promise.all([
        fetch('/api/subscriptions/catalog').then((r) => r.json()),
        fetch(`/api/subscriptions/me/${encodeURIComponent(userId)}?platform=${encodeURIComponent(platform)}`).then((r) => r.json()),
      ]);
      if (catRes?.success) {
        setCatalog(catRes);
        if (catRes.moduleLabelsUz) setModuleLabelsUz(catRes.moduleLabelsUz);
      }
      if (meRes?.success) {
        setMySub(meRes.subscription);
        setMyFeatures(meRes.features || {});
        if (meRes.moduleLabelsUz) setModuleLabelsUz(meRes.moduleLabelsUz);
        setMyOrders(meRes.orders || []);
      }
    } catch {
      // ignore offline
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const paidPlans = (catalog?.plans || []).filter((p: any) => p.id !== 'free');
  const activePlan = paidPlans.find((p: any) => p.id === selectedPlanId) || paidPlans[0];

  const handleCopyCard = () => {
    const num = catalog?.cardSettings?.cardNumber || '';
    if (!num) return;
    navigator.clipboard?.writeText(num.replace(/\s+/g, '')).catch(() => {});
    setCopiedCard(true);
    setTimeout(() => setCopiedCard(false), 2000);
  };

  const handleApplyPromo = async (redeemNow = false) => {
    if (!promoInput.trim()) return;
    setFeedback(null);
    const res = await fetch('/api/subscriptions/promo/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: promoInput.trim(),
        userId,
        planId: selectedPlanId,
        redeemNow,
      }),
    });
    const json = await res.json();
    if (!json.success) {
      setFeedback({ type: 'err', text: json.error || 'Promokod qabul qilinmadi.' });
      return;
    }
    if (redeemNow && json.subscription) {
      setJustActivated(true);
      setTimeout(() => setJustActivated(false), 6500);
      setFeedback({ type: 'ok', text: `Tabriklaymiz! ${promoInput.toUpperCase()} promokodi bilan Premium faollashtirildi va barcha boʻlimlar ochildi!` });
      setPromoInput('');
      notifyEntitlementsChanged();
      void loadAll();
      return;
    }
    if (json.promo?.type === 'free_premium_days') {
      // Auto-redeem free days
      await handleApplyPromo(true);
      return;
    }
    setAppliedPromo({
      code: json.promo.code,
      titleUz: json.promo.titleUz,
      discountAmountUzs: json.discountAmountUzs || 0,
    });
    setFeedback({
      type: 'ok',
      text: `Promokod qoʻllandi! Chegirma: ${fmtUzs(json.discountAmountUzs || 0)}`,
    });
  };

  const handleSubmitCardOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlan) return;
    setFeedback(null);
    const res = await fetch('/api/subscriptions/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        userDisplayName: userDisplayName.trim() || undefined,
        platform: detectClientPlatform(),
        planId: activePlan.id,
        receiptReference: receiptRef.trim(),
        userNote: userNote.trim() || undefined,
        promoCode: appliedPromo?.code,
      }),
    });
    const json = await res.json();
    if (!json.success) {
      setFeedback({ type: 'err', text: json.error || 'Buyurtma yuborishda xatolik.' });
      return;
    }
    setReceiptRef('');
    setUserNote('');
    setAppliedPromo(null);
    setFeedback({
      type: 'ok',
      text: `Buyurtma #${json.order.orderId} qabul qilindi (PENDING). Administrator oʻtkazmani tasdiqlagach Premium avtomatik yoqiladi.`,
    });
    void loadAll();
  };

  const handleJoinDraw = async (drawId: string) => {
    setFeedback(null);
    const res = await fetch(`/api/subscriptions/random-draws/${encodeURIComponent(drawId)}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        displayName: userDisplayName.trim() || userId,
        platform: detectClientPlatform(),
      }),
    });
    const json = await res.json();
    if (!json.success) {
      setFeedback({ type: 'err', text: json.error || 'Ishtirok etib boʻlmadi.' });
      return;
    }
    setFeedback({ type: 'ok', text: `Bepul tanlovga muvaffaqiyatli qoʻshildingiz! Jami ishtirokchilar: ${json.entriesCount}` });
    void loadAll();
  };

  const handleGenerateLinkCode = async () => {
    const res = await fetch('/api/account-link/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const json = await res.json();
    if (json?.success) {
      setLinkCodeData({ code: json.code, expiresAt: json.expiresAt });
    }
  };

  const handleRedeemLinkCode = async () => {
    const cleanCode = redeemCodeInput.replace(/\D/g, '').slice(0, 6);
    if (cleanCode.length !== 6) {
      setFeedback({ type: 'err', text: '6 xonali bogʻlash kodini toʻliq kiriting.' });
      return;
    }
    setRedeemingCode(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/account-link/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleanCode, aliasUserId: userId }),
      });
      const json = await res.json();
      if (json?.success && json?.canonicalUserId) {
        setCanonicalEcosystemUserId(json.canonicalUserId);
        setUserId(json.canonicalUserId);
        setRedeemCodeInput('');
        notifyEntitlementsChanged();
        setFeedback({
          type: 'ok',
          text: `Hisob muvaffaqiyatli bogʻlandi! Yagona ID: ${json.canonicalUserId}`,
        });
      } else {
        setFeedback({ type: 'err', text: json?.error || 'Bogʻlash kodi notoʻgʻri yoki muddati tugagan.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'err', text: err?.message || 'Hisobni bogʻlashda xatolik.' });
    } finally {
      setRedeemingCode(false);
    }
  };

  const finalPrice = activePlan
    ? Math.max(0, activePlan.priceUzs - (appliedPromo?.discountAmountUzs || 0))
    : 0;

  return (
    <div className="space-y-6 pb-8">
      {/* Hero Subscription Status Banner */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#072B21] via-[#061812] to-[#040C09] text-[#F7F4EC] border border-[#C8A85E]/30 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#C8A85E]">
              <Crown className="w-4 h-4" />
              <span>ASAKA ZIYO · Yagona Premium Ekotizim</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold">
              Bitta Obuna — Web, Android va Telegramda
            </h1>
            <p className="text-xs sm:text-sm text-[#A5BAB2] max-w-2xl leading-relaxed">
              Namoz vaqtlari, Qurʼon Mushaf, Tasbeh, Hadislar, Duolar va Qibla doimo bepul qoladi. Premium obuna esa barcha 17 boʻlimdagi kengaytirilgan imkoniyatlarni — cheksiz AI Ustoz, offline Qori yuklash, AI Hifz, Tajvid akademiyasi, viktorina va shaxsiy statistikani barcha qurilmalarda ochadi.
            </p>
          </div>

          {/* Live Server-Verified Status Box */}
          <div className="p-4 rounded-2xl bg-white/[0.06] border border-white/[0.12] min-w-[240px] space-y-1.5">
            <div className="text-[11px] uppercase tracking-wider text-[#9AB0A7]">Joriy Holatingiz</div>
            <div className="flex items-center gap-2">
              <span
                className={`text-lg font-extrabold ${
                  mySub?.isPremium ? 'text-[#E6CE8A]' : mySub?.status === 'PENDING' ? 'text-amber-300' : 'text-emerald-300'
                }`}
              >
                {mySub?.status || (loading ? '...' : 'FREE')}
              </span>
              {mySub?.isPremium && (
                <span className="text-xs font-mono-numbers text-emerald-300">
                  ({mySub.daysRemaining} kun qoldi)
                </span>
              )}
            </div>
            {mySub?.expiresAt && mySub?.isPremium && (
              <div className="text-[11px] text-[#9AB0A7] font-mono-numbers">
                Tugash sanasi: {new Date(mySub.expiresAt).toLocaleDateString('uz-UZ')}
              </div>
            )}
            <div className="text-[10px] font-mono-numbers text-[#7D968D] truncate">ID: {userId}</div>
          </div>
        </div>
      </div>

      {/* Celebratory Activation Banner */}
      {justActivated && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-600/20 via-[#C8A85E]/25 to-emerald-600/20 border border-[#C8A85E]/50 text-[#091813] dark:text-[#F7F4EC] flex items-center gap-4 shadow-lg animate-pulse">
          <div className="w-11 h-11 rounded-2xl bg-[#C8A85E] text-[#050C09] flex items-center justify-center shrink-0">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <div className="font-extrabold text-sm sm:text-base">Muborak boʻlsin! ASAKA ZIYO Premium Faollashdi!</div>
            <div className="text-xs opacity-85">
              Endi Web, Android APK, Telegram Bot va Mini Appdagi barcha Premium boʻlimlar siz uchun cheksiz ochiq.
            </div>
          </div>
        </div>
      )}

      {/* Active Premium Member Summary (Zero Spam — Clean Management View) */}
      {mySub?.isPremium && (
        <div className="p-5 rounded-3xl az-liquid-glass border border-[#C8A85E]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-extrabold text-[#8A6B2D] dark:text-[#E6CE8A]">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Sizda faol Premium obuna mavjud ({mySub.daysRemaining} kun qoldi)</span>
            </div>
            <p className="text-xs text-[#5F776F] dark:text-[#9AB0A7]">
              Barcha 17 boʻlimdagi Premium imkoniyatlar — AI Ustoz, Offline Qorilar, Hifz, Tajvid, Viktorina va Statistika ochiq.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowExtendCheckout((v) => !v)}
            className="px-4 py-2 rounded-xl bg-[#064E3B]/15 dark:bg-white/10 text-xs font-bold cursor-pointer whitespace-nowrap hover:bg-[#064E3B]/25"
          >
            {showExtendCheckout ? 'Uzaytirish oynasini yopish' : 'Muddatni oldindan uzaytirish'}
          </button>
        </div>
      )}

      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2.5 ${
            feedback.type === 'ok'
              ? 'bg-emerald-500/12 border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-500/12 border-rose-500/30 text-rose-800 dark:text-rose-200'
          }`}
        >
          {feedback.type === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Dynamic Plans Grid (Hidden for active Premium unless user opens Extend) */}
      {(!mySub?.isPremium || showExtendCheckout) && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {paidPlans.map((plan: any) => {
          const isSelected = activePlan?.id === plan.id;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => {
                setSelectedPlanId(plan.id);
                setAppliedPromo(null);
              }}
              className={`text-left p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-[#06281E] text-[#F7F4EC] border-[#C8A85E] shadow-lg ring-2 ring-[#C8A85E]/35'
                  : 'az-liquid-glass border-[#064E3B]/15 dark:border-white/10 hover:border-[#C8A85E]/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-base">{plan.nameUz}</span>
                  {plan.badgeUz && (
                    <span className="px-2 py-0.5 rounded-lg bg-[#C8A85E] text-[#050C09] text-[10px] font-extrabold">
                      {plan.badgeUz}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-mono-numbers font-extrabold">{fmtUzs(plan.priceUzs)}</span>
                  {plan.oldPriceUzs && plan.oldPriceUzs > plan.priceUzs && (
                    <span className="text-xs line-through opacity-60 font-mono-numbers">
                      {fmtUzs(plan.oldPriceUzs)}
                    </span>
                  )}
                </div>
                <div className="text-[11px] opacity-75 mt-1">{plan.durationDays} kun · {plan.taglineUz}</div>

                <ul className="mt-4 space-y-2 text-xs">
                  {(plan.highlightsUz || []).map((hl: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="opacity-90">{hl}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5 pt-3 border-t border-white/10 text-xs font-bold text-center">
                {isSelected ? 'Tanlangan tarif' : 'Shu tarifni tanlash'}
              </div>
            </button>
          );
        })}
      </div>
      )}

      {/* Manual Card Checkout + Promo Code + Payme/Click Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Card Payment Details & Receipt Submission */}
        <div className="rounded-3xl az-liquid-glass p-5 sm:p-6 border border-[#064E3B]/15 dark:border-white/10 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-base text-[#091813] dark:text-[#F7F4EC] flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#064E3B] dark:text-emerald-400" />
              <span>Karta orqali Toʻlov (Admin tasdigʻi)</span>
            </h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
              Xavfsiz · PIN/CVV soʻralmaydi
            </span>
          </div>

          {catalog?.cardSettings?.isActive ? (
            <>
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#072B21] to-[#0B1E17] text-[#F7F4EC] border border-[#C8A85E]/30 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-[#C8A85E]">
                  <span>{catalog.cardSettings.bankName}</span>
                  <span>Rasmiy qabul kartasi</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono-numbers text-lg sm:text-xl font-extrabold tracking-wider">
                    {catalog.cardSettings.cardNumber}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCard}
                    className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedCard ? 'Nusxalandi' : 'Nusxalash'}</span>
                  </button>
                </div>
                <div className="text-xs text-[#C5D4CE]">Karta egasi: <strong>{catalog.cardSettings.cardholderName}</strong></div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="whitespace-pre-line">{catalog.cardSettings.instructionsUz}</span>
              </div>

              {/* Promo Code Box */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#5F776F]" />
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    placeholder="Promokod kiriting (ixtiyoriy)"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs font-mono-numbers uppercase"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void handleApplyPromo(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#064E3B]/15 dark:bg-white/10 text-xs font-bold cursor-pointer hover:bg-[#064E3B]/25"
                >
                  Qoʻllash
                </button>
              </div>

              <form onSubmit={handleSubmitCardOrder} className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#F7F5F0] dark:bg-white/[0.04] text-xs">
                  <span>Toʻlov summasi ({activePlan?.nameUz}):</span>
                  <strong className="font-mono-numbers text-sm text-[#064E3B] dark:text-[#E6CE8A]">
                    {fmtUzs(finalPrice)}
                  </strong>
                </div>

                <input
                  type="text"
                  required
                  value={receiptRef}
                  onChange={(e) => setReceiptRef(e.target.value)}
                  placeholder="Chek raqami / oʻtkazma vaqti / tranzaksiya ID (majburiy)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={userDisplayName}
                    onChange={(e) => setUserDisplayName(e.target.value)}
                    placeholder="Ismingiz (ixtiyoriy)"
                    className="px-3.5 py-2.5 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs"
                  />
                  <input
                    type="text"
                    value={userNote}
                    onChange={(e) => setUserNote(e.target.value)}
                    placeholder="Qoʻshimcha izoh (ixtiyoriy)"
                    className="px-3.5 py-2.5 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#064E3B] dark:bg-[#10B981] text-white dark:text-[#04120D] font-bold text-xs inline-flex items-center justify-center gap-2 cursor-pointer hover:opacity-95"
                >
                  <Send className="w-4 h-4" />
                  <span>Toʻlov chekini yuborish va Tasdiqlashga joʻnatish</span>
                </button>
              </form>
            </>
          ) : (
            <div className="p-4 rounded-xl bg-amber-500/10 text-xs">
              Karta orqali toʻlov hozircha faol emas.
            </div>
          )}

          {/* Payme / Click Ready Status */}
          <div className="pt-3 border-t border-[#064E3B]/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#5F776F] dark:text-[#8FA69D]">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Payme & Click server integratsiyasi tayyor (merchant kalitlari kutilmoqda)</span>
            </span>
          </div>
        </div>

        {/* Right: Free Random Draws + Cross-Platform Telegram Account Link + My Orders */}
        <div className="space-y-5">
          {/* Fair Free Random Draws */}
          <div className="rounded-3xl az-liquid-glass p-5 border border-[#C8A85E]/25 space-y-3">
            <h3 className="font-bold text-base text-[#091813] dark:text-[#F7F4EC] flex items-center gap-2">
              <Gift className="w-5 h-5 text-[#C8A85E]" />
              <span>Bepul Hadya Tanlovlari (Adolatli Random)</span>
            </h3>
            {(catalog?.randomDraws || []).length === 0 ? (
              <p className="text-xs text-[#5F776F] dark:text-[#8FA69D]">Hozircha faol tanlov yoʻq.</p>
            ) : (
              (catalog?.randomDraws || []).map((draw: any) => (
                <div
                  key={draw.id}
                  className="p-4 rounded-2xl bg-[#F7F5F0] dark:bg-white/[0.04] border border-[#C8A85E]/20 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-[#091813] dark:text-[#F7F4EC]">{draw.titleUz}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 text-[10px] font-bold">
                      100% BEPUL
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5F776F] dark:text-[#9AB0A7]">{draw.descriptionUz}</p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-mono-numbers text-[#8A6B2D] dark:text-[#C8A85E]">
                      {draw.winnersCount} gʻolib · +{draw.prizeDays} kun · {draw.entriesCount} ishtirokchi
                    </span>
                    {draw.status === 'OPEN' ? (
                      <button
                        type="button"
                        onClick={() => void handleJoinDraw(draw.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#C8A85E] text-[#050C09] font-bold text-xs cursor-pointer hover:brightness-105"
                      >
                        Bepul qatnashish
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold text-emerald-500">Gʻoliblar taqdirlangan</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cross-Platform Account Linking (Web/Android <-> Telegram Bot) */}
          <div className="rounded-3xl az-liquid-glass p-5 border border-[#064E3B]/15 dark:border-white/10 space-y-3">
            <h3 className="font-bold text-sm text-[#091813] dark:text-[#F7F4EC] flex items-center gap-2">
              <Link2 className="w-4 h-4 text-[#064E3B] dark:text-emerald-400" />
              <span>Telegram Bot va Android bilan yagona hisob bogʻlash</span>
            </h3>
            <p className="text-xs text-[#5F776F] dark:text-[#8FA69D]">
              Premium obunangiz, playlistlar va Hifz natijalaringiz Telegram Botda ham bir xil ishlashi uchun 6 xonali kod oling va Botda <code className="font-mono-numbers font-bold">/link KOD</code> deb yuboring.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handleGenerateLinkCode()}
                className="px-4 py-2 rounded-xl bg-[#064E3B] dark:bg-[#10B981] text-white dark:text-[#04120D] text-xs font-bold cursor-pointer"
              >
                6 xonali bogʻlash kodi olish
              </button>
              {linkCodeData && (
                <div className="px-3.5 py-2 rounded-xl bg-[#C8A85E]/20 border border-[#C8A85E]/40 font-mono-numbers font-extrabold text-sm tracking-widest text-[#8A6B2D] dark:text-[#E6CE8A]">
                  /link {linkCodeData.code}
                </div>
              )}
            </div>
            <div className="pt-2 border-t border-[#064E3B]/10 dark:border-white/10 flex flex-wrap items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={redeemCodeInput}
                onChange={(e) => setRedeemCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Boshqa qurilma kodi (6 raqam)"
                className="px-3 py-2 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs font-mono-numbers tracking-widest w-52"
              />
              <button
                type="button"
                disabled={redeemingCode || redeemCodeInput.length !== 6}
                onClick={() => void handleRedeemLinkCode()}
                className="px-3.5 py-2 rounded-xl bg-[#064E3B]/15 dark:bg-white/10 hover:bg-[#064E3B]/25 text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                {redeemingCode ? 'Bogʻlanmoqda...' : 'Kodni tasdiqlash'}
              </button>
            </div>
            {mySub?.linkedAliases?.length > 0 && (
              <div className="text-[11px] text-emerald-600 dark:text-emerald-300 font-semibold">
                Bogʻlangan qurilmalar: {mySub.linkedAliases.join(', ')}
              </div>
            )}
          </div>

          {/* User's Payment Orders History */}
          {myOrders.length > 0 && (
            <div className="rounded-3xl az-liquid-glass p-5 border border-[#064E3B]/12 dark:border-white/10 space-y-2.5">
              <h4 className="font-bold text-sm text-[#091813] dark:text-[#F7F4EC] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#C8A85E]" />
                <span>Mening Toʻlov Soʻrovlarim ({myOrders.length})</span>
              </h4>
              {myOrders.map((ord) => (
                <div
                  key={ord.orderId}
                  className="p-3 rounded-xl bg-[#F7F5F0] dark:bg-white/[0.04] flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold font-mono-numbers">{ord.orderId} · {ord.planNameUz}</div>
                    <div className="text-[11px] opacity-75">
                      {fmtUzs(ord.finalAmountUzs)} · Chek: {ord.receiptReference}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                      ord.status === 'APPROVED'
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300'
                        : ord.status === 'REJECTED'
                        ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300'
                        : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    {ord.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full Cross-Module Free vs Premium Comparison Matrix (Dynamic from Admin, Grouped by Module) */}
      <div className="rounded-3xl az-liquid-glass p-5 sm:p-6 border border-[#064E3B]/15 dark:border-white/10 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-base text-[#091813] dark:text-[#F7F4EC] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C8A85E]" />
              <span>Barcha Boʻlimlar Boʻyicha Free vs Premium Imkoniyatlari</span>
            </h3>
            <p className="text-[11px] text-[#5F776F] dark:text-[#8FA69D] mt-0.5">
              Har bir boʻlimning limit va huquqlari markaziy tizimdan jonli sinxronlanadi (Web · Android · Telegram).
            </p>
          </div>
          <span className="text-[11px] font-mono-numbers font-bold px-2.5 py-1 rounded-lg bg-[#064E3B]/10 dark:bg-white/10">
            {(catalog?.featureGates || []).length} ta funksiya
          </span>
        </div>

        {(() => {
          const grouped: Record<string, any[]> = {};
          for (const g of catalog?.featureGates || []) {
            const mod = g.module || 'quran';
            if (!grouped[mod]) grouped[mod] = [];
            grouped[mod].push(g);
          }
          const periodLabel = (p: string) =>
            p === 'daily' ? 'kunlik' : p === 'weekly' ? 'haftalik' : p === 'monthly' ? 'oylik' : '';
          const fmtLimit = (val: number, period: string) => {
            if (val < 0) return 'Cheksiz';
            if (val === 0) return 'Yopiq';
            return `${val} ta ${periodLabel(period)}`.trim();
          };
          return (
            <div className="space-y-4">
              {Object.entries(grouped).map(([modKey, items]) => (
                <div key={modKey} className="space-y-2">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-[#064E3B] dark:text-[#E6CE8A] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C8A85E]" />
                    <span>{moduleLabelsUz[modKey] || modKey}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {items.map((g: any) => {
                      const liveDecision = myFeatures[g.key];
                      return (
                        <div
                          key={g.key}
                          className={`p-3.5 rounded-2xl border space-y-2 ${
                            !g.isEnabled
                              ? 'bg-rose-500/5 border-rose-500/20 opacity-65'
                              : g.access === 'free'
                                ? 'bg-[#F7F5F0] dark:bg-white/[0.03] border-[#064E3B]/10 dark:border-white/10'
                                : 'bg-[#F7F5F0] dark:bg-white/[0.05] border-[#C8A85E]/25'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-xs text-[#091813] dark:text-[#F7F4EC] leading-snug">
                              {g.labelUz}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold shrink-0 ${
                                !g.isEnabled
                                  ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300'
                                  : g.access === 'free'
                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-[#C8A85E]/25 text-[#8A6B2D] dark:text-[#E6CE8A]'
                              }`}
                            >
                              {!g.isEnabled ? 'Oʻchiq' : g.access === 'free' ? 'Bepul' : 'Premium'}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#5F776F] dark:text-[#8FA69D] leading-relaxed">
                            {g.descriptionUz}
                          </p>
                          <div className="pt-1.5 border-t border-[#064E3B]/10 dark:border-white/10 flex items-center justify-between text-[10px] font-mono-numbers">
                            <span className="text-[#5F776F] dark:text-[#9AB0A7]">
                              Free: <strong>{fmtLimit(g.freeLimit ?? (g.access === 'free' ? -1 : 0), g.limitPeriod)}</strong>
                            </span>
                            <span className="text-[#8A6B2D] dark:text-[#E6CE8A] inline-flex items-center gap-1">
                              {g.premiumLimit < 0 ? (
                                <>
                                  <InfinityIcon className="w-3 h-3" />
                                  <strong>Cheksiz</strong>
                                </>
                              ) : (
                                <strong>{fmtLimit(g.premiumLimit, g.limitPeriod)}</strong>
                              )}
                            </span>
                          </div>
                          {liveDecision && (
                            <div className="flex items-center justify-between text-[10px] font-semibold">
                              <span className={liveDecision.allowed ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-300'}>
                                {liveDecision.allowed ? (
                                  <span className="inline-flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Sizda ochiq
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1">
                                    <Lock className="w-3 h-3" /> Premium talab qilinadi
                                  </span>
                                )}
                              </span>
                              {liveDecision.limit > 0 && (
                                <span className="font-mono-numbers opacity-80">
                                  Qoldi: {liveDecision.remaining}/{liveDecision.limit}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
};
