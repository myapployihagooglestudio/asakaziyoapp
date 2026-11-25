import React from 'react';
import { Crown, X, Sparkles, Check, ShieldCheck, ArrowRight, Lock } from 'lucide-react';
import { ClientFeatureDecision, dispatchNavigateToPremium } from '../../utils/entitlementClient';

export interface PremiumGateModalProps {
  open: boolean;
  onClose: () => void;
  onUpgrade?: () => void;
  decision?: ClientFeatureDecision | null;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

const CROSS_MODULE_HIGHLIGHTS = [
  'Cheksiz AI Islomiy Yordamchi va chuqur tahlil rejimi',
  '114 suralik Qorilar oflayn yuklash va cheksiz playlistlar',
  'AI Hifz tekshiruvi, shaxsiy Murojaʼa rejasi va statistika',
  'Chuqur Tajvid akademiyasi, kurslar, viktorina va sertifikatlar',
  'Web, Android APK, Telegram Bot va Mini Appda yagona Premium',
];

export const PremiumGateModal: React.FC<PremiumGateModalProps> = ({
  open,
  onClose,
  onUpgrade,
  decision,
  fallbackTitle,
  fallbackMessage,
}) => {
  // Never spam users who already have active Premium (except disabled/platform notices)
  if (!open) return null;
  if (decision?.isPremiumUser && decision.reasonCode === 'OK') return null;

  const isDisabled = decision?.reasonCode === 'FEATURE_DISABLED';
  const isLimitReached = decision?.reasonCode === 'USAGE_LIMIT_REACHED';
  const title = decision?.feature?.labelUz || fallbackTitle || 'Premium Imkoniyat';
  const message =
    decision?.messageUz ||
    fallbackMessage ||
    'Ushbu kengaytirilgan imkoniyat Premium obunachilar uchun moʻljallangan.';

  const handleGoPremium = () => {
    onClose();
    if (onUpgrade) {
      onUpgrade();
    } else {
      dispatchNavigateToPremium();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#030A07]/70 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="premium-gate-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl overflow-hidden bg-[#FDFBF7] dark:bg-[#081712] border border-[#C8A85E]/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Sacred Emerald + Gold Header */}
        <div className="relative p-6 bg-gradient-to-br from-[#072B21] via-[#061A14] to-[#040E0A] text-[#F7F4EC]">
          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#E6CE8A]">
            {isDisabled ? <Lock className="w-3.5 h-3.5" /> : <Crown className="w-4 h-4" />}
            <span>{isDisabled ? 'Vaqtincha Cheklangan' : 'ASAKA ZIYO · Premium'}</span>
          </div>

          <h3 id="premium-gate-title" className="mt-2 text-lg sm:text-xl font-display font-extrabold leading-snug">
            {title}
          </h3>

          {isLimitReached && decision && decision.limit > 0 && (
            <div className="mt-3 flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-white/[0.08] border border-white/10">
              <span className="text-[#C5D4CE]">Bepul limit sarfi:</span>
              <span className="font-mono-numbers font-extrabold text-[#E6CE8A]">
                {decision.used} / {decision.limit}
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <p className="text-xs sm:text-sm text-[#2E463E] dark:text-[#C5D4CE] leading-relaxed">
            {message}
          </p>

          {!isDisabled && (
            <div className="p-4 rounded-2xl bg-[#F4F1EA] dark:bg-white/[0.04] border border-[#064E3B]/12 dark:border-white/10 space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#064E3B] dark:text-[#E6CE8A] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Premium bilan barcha boʻlimlar ochiladi:</span>
              </div>
              <ul className="space-y-1.5 text-xs text-[#1B332B] dark:text-[#DDE7E2]">
                {CROSS_MODULE_HIGHLIGHTS.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-2 text-[11px] text-[#5F776F] dark:text-[#8FA69D]">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Asosiy Qurʼon oʻqish, namoz vaqtlari, tasbeh va duolar doimo bepul qoladi.</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            {!isDisabled && (
              <button
                type="button"
                onClick={handleGoPremium}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#064E3B] to-[#0B6B51] dark:from-[#C8A85E] dark:to-[#E2C478] text-white dark:text-[#050C09] font-extrabold text-xs inline-flex items-center justify-center gap-2 cursor-pointer hover:brightness-105 shadow-md"
              >
                <Crown className="w-4 h-4" />
                <span>Premiumga Oʻtish</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 rounded-xl bg-[#064E3B]/10 dark:bg-white/10 text-[#091813] dark:text-[#F7F4EC] font-bold text-xs cursor-pointer hover:bg-[#064E3B]/15"
            >
              Yopish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
