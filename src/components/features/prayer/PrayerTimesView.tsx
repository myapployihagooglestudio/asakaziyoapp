import React, { useState, useEffect } from 'react';
import { PrayerSchedule, PrayerTimeEntry } from '../../../types';
import { MONTHLY_CALENDAR_PREVIEW } from '../../../data/prayerTimesData';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { GeometricPattern } from '../../ui/GeometricPattern';
import {
  Clock,
  Compass,
  AlertCircle,
  Calendar,
  CheckCircle2,
  ShieldAlert,
  Info,
  MapPin,
} from 'lucide-react';

interface PrayerTimesViewProps {
  schedule: PrayerSchedule;
  onOpenAdmin: () => void;
}

export const PrayerTimesView: React.FC<PrayerTimesViewProps> = ({
  schedule,
  onOpenAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'qibla'>('daily');
  const [countdownText, setCountdownText] = useState<string>('02:44:18');

  // Realistic countdown calculation simulation for next prayer
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const secondsLeft = 3600 * 2 + 60 * 44 - (now.getSeconds() % 60);
      const h = Math.floor(secondsLeft / 3600);
      const m = Math.floor((secondsLeft % 3600) / 60);
      const s = secondsLeft % 60;
      setCountdownText(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-8 pb-16">
      {/* Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-[#c5a869]/30 bg-gradient-to-r from-[#031d17] to-[#071614] text-white p-6 sm:p-10">
        <GeometricPattern opacity={0.05} />
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#c5a869] uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5" />
            <span>Asaka Shahri</span>
            <span aria-hidden="true">·</span>
            <span>Andijon Viloyati</span>
            <span aria-hidden="true">·</span>
            <span>Asia/Tashkent (UTC+5)</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-white">
            Namoz Vaqtlari Jadvali
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            Asaka shahri koordinatalari (40.6415° N, 72.2387° E) boʻyicha kunlik besh vaqt namoz, quyosh chiqishi va jamoat iqomat vaqtlari.
          </p>
        </div>
      </div>

      {/* Strict Compliance Disclaimer */}
      <div className="p-4 sm:p-5 rounded-2xl border border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs sm:text-sm space-y-2 leading-relaxed">
        <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Muhim eslatma: Maʼmuriyat tomonidan tasdiqlanish tartibi</span>
        </div>
        <p className="text-stone-700 dark:text-amber-100/90 text-xs">
          {schedule.disclaimer}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-amber-500/20 text-xs">
          <span>
            Holat: <strong className="text-amber-700 dark:text-amber-400">Koʻrgazmali qoralama (Preview)</strong>
          </span>
          <button
            onClick={onOpenAdmin}
            className="text-[#c5a869] hover:underline font-semibold cursor-pointer"
          >
            Maʼmuriyat konsolida jadvalni boshqarish →
          </button>
        </div>
      </div>

      {/* Segmented Mode Tabs per §1.A */}
      <div className="flex items-center gap-1.5 p-1 bg-stone-100 dark:bg-[#091a18] rounded-xl border border-stone-200 dark:border-emerald-950 w-fit">
        <button
          onClick={() => setActiveTab('daily')}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            activeTab === 'daily'
              ? 'bg-white dark:bg-[#0d211e] text-[#c5a869] shadow-sm font-semibold border border-[#c5a869]/30'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
          }`}
        >
          Bugungi jadval
        </button>
        <button
          onClick={() => setActiveTab('monthly')}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            activeTab === 'monthly'
              ? 'bg-white dark:bg-[#0d211e] text-[#c5a869] shadow-sm font-semibold border border-[#c5a869]/30'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
          }`}
        >
          Oylik taqvim (Noyabr)
        </button>
        <button
          onClick={() => setActiveTab('qibla')}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            activeTab === 'qibla'
              ? 'bg-white dark:bg-[#0d211e] text-[#c5a869] shadow-sm font-semibold border border-[#c5a869]/30'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
          }`}
        >
          Asaka Qiblasi (241°)
        </button>
      </div>

      {/* Tab 1: Daily Schedule View */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {/* Next Prayer Countdown Card */}
          <Card elevated className="p-6 sm:p-8 relative overflow-hidden border-[#c5a869]/30 bg-gradient-to-r from-stone-900 to-[#071614] text-white">
            <GeometricPattern opacity={0.04} />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-widest text-[#c5a869] font-medium">
                  Navbatdagi namoz
                </span>
                <h3 className="text-2xl sm:text-3xl font-display font-bold text-white">
                  Peshin namozi
                </h3>
                <p className="text-xs text-stone-300">
                  Kirish vaqti: <span className="font-mono-numbers font-semibold">12:05</span> · Jamoat iqomati: <span className="font-mono-numbers font-semibold">12:25</span>
                </p>
              </div>

              <div className="sm:text-right">
                <span className="text-xs text-stone-400 block mb-1">Kirishiga qoldi:</span>
                <div className="text-3xl sm:text-4xl font-mono-numbers font-bold text-[#c5a869] tracking-tight">
                  {countdownText}
                </div>
              </div>
            </div>
          </Card>

          {/* Daily Table of Times */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {schedule.times.map((p) => {
              const isPeshin = p.key === 'peshin';
              return (
                <Card
                  key={p.id}
                  elevated={isPeshin}
                  className={`p-5 sm:p-6 space-y-3 ${
                    isPeshin
                      ? 'border-[#c5a869] ring-1 ring-[#c5a869]/40 bg-[#c5a869]/5'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-bold text-stone-900 dark:text-stone-100">
                        {p.nameUz}
                      </h4>
                      <p className="text-xs text-stone-400 dark:text-stone-500">{p.descriptionUz}</p>
                    </div>
                    <span className="font-arabic text-2xl text-[#c5a869]">{p.nameAr}</span>
                  </div>

                  <div className="pt-2 border-t border-stone-100 dark:border-emerald-950/60 flex items-baseline justify-between">
                    <div>
                      <span className="text-xs text-stone-400 block">Kirish vaqti:</span>
                      <span className="text-2xl font-bold font-mono-numbers text-stone-900 dark:text-stone-100">
                        {p.time}
                      </span>
                    </div>

                    {p.iqamahTime && (
                      <div className="text-right">
                        <span className="text-xs text-stone-400 block">Jamoat iqomati:</span>
                        <span className="text-lg font-semibold font-mono-numbers text-[#c5a869]">
                          {p.iqamahTime}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Monthly Calendar Preview */}
      {activeTab === 'monthly' && (
        <Card elevated className="p-6 overflow-x-auto">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">
              Noyabr 2026 — Asaka Namoz Taqvim Namunasi
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Haftalik va oylik davrlar boʻyicha oʻzgarish grafigi. Maʼmuriyat tasdiqlashi bilan yangilanadi.
            </p>
          </div>

          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-stone-200 dark:border-emerald-950 text-stone-500 dark:text-stone-400 uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Kun</th>
                <th className="py-2.5 px-3">Bomdod</th>
                <th className="py-2.5 px-3">Quyosh</th>
                <th className="py-2.5 px-3">Peshin</th>
                <th className="py-2.5 px-3">Asr</th>
                <th className="py-2.5 px-3">Shom</th>
                <th className="py-2.5 px-3">Xufton</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-emerald-950/60 font-mono-numbers text-stone-700 dark:text-stone-300">
              {MONTHLY_CALENDAR_PREVIEW.map((row) => (
                <tr
                  key={row.day}
                  className={`hover:bg-stone-50 dark:hover:bg-emerald-950/30 ${
                    row.day === 2 ? 'bg-[#c5a869]/10 font-semibold text-stone-900 dark:text-white' : ''
                  }`}
                >
                  <td className="py-2.5 px-3">
                    {row.day}-noyabr {row.day === 2 && <span className="text-[#c5a869] text-xs ml-1">(Bugun)</span>}
                  </td>
                  <td className="py-2.5 px-3">{row.bomdod}</td>
                  <td className="py-2.5 px-3">{row.quyosh}</td>
                  <td className="py-2.5 px-3">{row.peshin}</td>
                  <td className="py-2.5 px-3">{row.asr}</td>
                  <td className="py-2.5 px-3">{row.shom}</td>
                  <td className="py-2.5 px-3">{row.xufton}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Tab 3: Qibla Compass for Asaka */}
      {activeTab === 'qibla' && (
        <Card elevated className="p-8 max-w-xl mx-auto text-center space-y-6">
          <div className="space-y-1">
            <span className="text-xs uppercase tracking-widest text-[#c5a869] font-medium">
              Kaʼba yoʻnalishi
            </span>
            <h3 className="text-2xl font-display font-bold text-stone-900 dark:text-stone-100">
              Asaka Shahridan Qibla Azimuti
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto">
              Asaka shahri (Andijon) markazidan Kaʼbai Muazzamagacha boʻlgan yoʻnalish <strong>241°</strong> (Gʻarb-Janubi-Gʻarb) burchagida joylashgan.
            </p>
          </div>

          {/* Compass Dial Graphic */}
          <div className="relative w-64 h-64 mx-auto my-4 flex items-center justify-center">
            {/* Outer Dial Ring */}
            <div className="absolute inset-0 rounded-full border-2 border-[#c5a869]/30 bg-stone-100 dark:bg-[#071614] shadow-inner" />

            {/* Compass Cardinal Points */}
            <span className="absolute top-2 font-bold text-xs text-stone-500">N (Shimol)</span>
            <span className="absolute bottom-2 font-bold text-xs text-stone-500">S (Janub)</span>
            <span className="absolute right-3 font-bold text-xs text-stone-500">E (Sharq)</span>
            <span className="absolute left-3 font-bold text-xs text-stone-500">W (Gʻarb)</span>

            {/* Qibla Needle at 241 degrees */}
            <div
              className="absolute w-full h-full flex items-center justify-center pointer-events-none transition-transform duration-700"
              style={{ transform: `rotate(${schedule.qiblaAngleDeg}deg)` }}
            >
              <div className="w-1.5 h-28 bg-gradient-to-t from-transparent via-[#c5a869] to-[#d4af37] rounded-full relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-x-6 border-x-transparent border-b-10 border-b-[#d4af37]" />
              </div>
            </div>

            {/* Center Pivot */}
            <div className="relative z-10 w-8 h-8 rounded-full bg-[#071614] border-2 border-[#c5a869] flex items-center justify-center shadow-md">
              <div className="w-2 h-2 rounded-full bg-[#c5a869]" />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-stone-100 dark:bg-emerald-950/40 text-xs text-stone-600 dark:text-stone-300">
            Masofa: taxminan <strong className="font-mono-numbers">3,920 km</strong> · Koordinatalar: <span className="font-mono-numbers">40°38′ N, 72°14′ E</span>
          </div>
        </Card>
      )}
    </div>
  );
};
