import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CharityCampaign, UserDonationPledge } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { IslamicHairlineDivider, IslamicStarEmblem } from '../../ui/GeometricPattern';
import {
  getStoredCharityCampaigns,
  recordDonationPledge,
} from '../../../utils/databaseService';
import {
  Heart,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Building,
  CreditCard,
  FileText,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

export const CharityView: React.FC = () => {
  const { t } = useTranslation();
  const userId = 'asaka_user_current';

  const [campaigns, setCampaigns] = useState<CharityCampaign[]>(() => getStoredCharityCampaigns());
  const [pledgeModalCampaign, setPledgeModalCampaign] = useState<CharityCampaign | null>(null);
  const [pledgeAmount, setPledgeAmount] = useState<number>(50000);
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const handleMakePledge = () => {
    if (!pledgeModalCampaign) return;

    const newPledge: UserDonationPledge = {
      id: `pledge_${Date.now()}`,
      userId,
      campaignId: pledgeModalCampaign.id,
      campaignTitle: pledgeModalCampaign.title,
      amountUzs: pledgeAmount,
      status: 'pledged',
      transactionReference: `ASAKA-EHSON-${Math.floor(100000 + Math.random() * 900000)}`,
      donatedAt: new Date().toISOString(),
      isAnonymous,
    };

    recordDonationPledge(newPledge);
    setCampaigns(getStoredCharityCampaigns());
    setPledgeModalCampaign(null);
    setSuccessNotice(
      `Alhamdulillah! Sizning ${pledgeAmount.toLocaleString()} soʻmlik ehson niyati qayd qilindi. Kvitansiya raqami: ${newPledge.transactionReference}`
    );
    setTimeout(() => setSuccessNotice(null), 5000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-in fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#064e3b] via-[#052b22] to-[#041d18] border border-[#c5a869]/30 p-6 sm:p-8 text-white shadow-xl">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#d4af37]">
            <Heart className="w-4 h-4 text-[#d4af37]" />
            <span>Shaffof Saxovat & Xayriya Platformasi</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-white">
            Ehson va Sadaqa Loyihalari
          </h1>
          <p className="text-xs sm:text-sm text-stone-200 leading-relaxed">
            Asaka shahri masjidlarini taʼmirlash va ijtimoiy ehtiyojmandlarga koʻmaklashish uchun rasmiy, ochiq moliyaviy hisobotli xayriyalar.
          </p>
        </div>
      </div>

      {successNotice && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {campaigns.map((camp) => {
          const totalTarget = camp.targetAmountUzs;
          const collected = camp.collectedAmountUzs;
          const percent = Math.min(100, Math.round((collected / totalTarget) * 100));

          return (
            <Card
              key={camp.id}
              elevated
              className="p-6 space-y-5 border-stone-200/90 dark:border-[#c5a869]/30 bg-white dark:bg-[#0B1F1C] flex flex-col justify-between"
            >
              <div className="space-y-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Tasdiqlangan Loyiha</span>
                  </span>
                  <div className="flex items-center gap-1 text-stone-500 font-mono-numbers">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Muddati: {camp.deadlineDate}</span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-stone-900 dark:text-white leading-snug">
                  {camp.title}
                </h3>

                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                  {camp.description}
                </p>

                {/* Progress Bar & Financial Figures */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-stone-500 dark:text-stone-400">Yigʻilgan mablagʻ:</span>
                    <span className="font-bold font-mono-numbers text-emerald-600 dark:text-emerald-400">
                      {collected.toLocaleString()} soʻm ({percent}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-stone-100 dark:bg-emerald-950/80 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-stone-500 font-mono-numbers">
                    <span>Moʻljal: {totalTarget.toLocaleString()} soʻm</span>
                    <span>Niyat qilingan: {camp.pledgedAmountUzs.toLocaleString()} soʻm</span>
                  </div>
                </div>

                {/* Bank / Provider Instructions Note */}
                <div className="p-3.5 rounded-xl bg-[#F3EFE6]/60 dark:bg-[#071614] border border-stone-200/80 dark:border-white/5 text-xs text-stone-700 dark:text-stone-300 space-y-1">
                  <div className="font-bold text-[#9E7F3C] dark:text-[#c5a869] flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Toʻlov usuli: {camp.paymentInstructions.providerName}</span>
                  </div>
                  <p className="text-[11px]">Hisob belgisi: <strong>{camp.paymentInstructions.accountReference}</strong></p>
                  <p className="text-[11px] text-stone-500">{camp.paymentInstructions.legalEntityName}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-stone-200/80 dark:border-white/10 flex items-center justify-between">
                <div className="text-[11px] text-stone-500">
                  Audit yozuvlari: {camp.financialAuditRecords.length} ta
                </div>
                <Button
                  size="sm"
                  variant="emerald"
                  onClick={() => setPledgeModalCampaign(camp)}
                  className="min-h-[40px] text-xs font-bold"
                >
                  <Heart className="w-3.5 h-3.5 mr-1.5" />
                  <span>Ehson Qilish</span>
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Donation Pledge Modal */}
      {pledgeModalCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0B1F1C] border border-stone-200 dark:border-[#c5a869]/30 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-white/10 pb-3">
              <h3 className="text-base font-bold text-stone-900 dark:text-white">
                Ehson Qilish: {pledgeModalCampaign.title}
              </h3>
              <button
                onClick={() => setPledgeModalCampaign(null)}
                className="text-stone-400 hover:text-stone-100 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Ehson miqdorini tanlang:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[20000, 50000, 100000, 200000, 500000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setPledgeAmount(amt)}
                    className={`p-2.5 rounded-xl border text-xs font-bold font-mono-numbers transition-all cursor-pointer ${
                      pledgeAmount === amt
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                        : 'border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    {amt.toLocaleString()} soʻm
                  </button>
                ))}
              </div>

              <div className="space-y-1 pt-2">
                <label className="text-xs text-stone-600 dark:text-stone-400">Yoki oʻz miqdoringizni kiriting:</label>
                <input
                  type="number"
                  min="5000"
                  step="5000"
                  value={pledgeAmount}
                  onChange={(e) => setPledgeAmount(parseInt(e.target.value) || 10000)}
                  className="w-full p-2.5 text-xs font-bold font-mono-numbers rounded-xl border border-stone-300 dark:border-emerald-800 bg-stone-50 dark:bg-[#071614]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1 text-xs">
                <input
                  type="checkbox"
                  id="anonCheck"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="anonCheck" className="text-stone-600 dark:text-stone-400 cursor-pointer">
                  Ehsonni anonim (ism koʻrsatmasdan) amalga oshirish
                </label>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-stone-600 dark:text-stone-300">
                <strong>Eslatma:</strong> Bank kartasi maʼlumotlari ilovada saqlanmaydi. Rasmiy bank toʻlovi yoki Click/Payme ilovasi orqali toʻgʻridan-toʻgʻri amalga oshiriladi.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-200 dark:border-white/10">
              <Button variant="outline" size="sm" onClick={() => setPledgeModalCampaign(null)}>
                Bekor qilish
              </Button>
              <Button variant="emerald" size="sm" onClick={handleMakePledge}>
                Niyatni Tasdiqlash
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
