import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PrayerSchedule, PrayerTimeEntry, SupportedLocale } from '../../../types';
import { MONTHLY_CALENDAR_PREVIEW } from '../../../data/prayerTimesData';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { GeometricPattern } from '../../ui/GeometricPattern';
import { toNewUzbekAlphabet } from '../../../utils/newUzbekAlphabet';
import { getNextPrayerCalculation, NextPrayerInfo } from '../../../utils/prayerTimeUtils';
import {
  Clock,
  Compass,
  AlertCircle,
  Calendar,
  CheckCircle2,
  ShieldAlert,
  Info,
  MapPin,
  Navigation,
  RotateCw,
  Smartphone,
  Sparkles,
  Sun,
  Moon,
  Sunrise,
  Sunset,
} from 'lucide-react';

interface PrayerTimesViewProps {
  schedule: PrayerSchedule;
  onOpenAdmin: () => void;
}

export const PrayerTimesView: React.FC<PrayerTimesViewProps> = ({
  schedule,
  onOpenAdmin,
}) => {
  const { t, i18n } = useTranslation();
  const currentLocale = (i18n.language as SupportedLocale) || 'uz-Latn';

  const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'qibla'>('daily');
  const [prayerCalculation, setPrayerCalculation] = useState<NextPrayerInfo>(() =>
    getNextPrayerCalculation(schedule.times)
  );

  // Live dynamic countdown calculation for the actual next prayer
  useEffect(() => {
    const updateCountdown = () => {
      setPrayerCalculation(getNextPrayerCalculation(schedule.times));
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [schedule.times]);

  const getLocalizedPrayerName = (key: string, defaultName: string) => {
    return t(`prayer:${key}`, { defaultValue: defaultName });
  };

  const getLocalizedText = (text: string) => {
    if (currentLocale === 'uz-Latn-new') {
      return toNewUzbekAlphabet(text);
    }
    return text;
  };

  const getPrayerIcon = (key: string) => {
    switch (key) {
      case 'tahajjud':
      case 'xufton':
        return <Moon className="w-5 h-5 text-indigo-400" />;
      case 'subh':
      case 'bomdod':
        return <Sunrise className="w-5 h-5 text-amber-400" />;
      case 'quyosh':
        return <Sun className="w-5 h-5 text-yellow-400" />;
      case 'peshin':
      case 'asr':
        return <Sun className="w-5 h-5 text-[#c5a869]" />;
      case 'shom':
        return <Sunset className="w-5 h-5 text-orange-400" />;
      default:
        return <Clock className="w-5 h-5 text-[#c5a869]" />;
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto">
      {/* 1. HERO BANNER */}
      <div className="relative rounded-3xl overflow-hidden border border-[#c5a869]/40 bg-gradient-to-r from-[#031d17] to-[#071614] text-white p-6 sm:p-10 shadow-2xl">
        <img
          src="/images/asaka_dawn_spiritual_1793634658872.jpg"
          alt="Asaka Dawn Spiritual"
          className="absolute inset-0 w-full h-full object-cover object-center brightness-75 scale-105 transition-transform duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#031d17]/95 via-[#031d17]/85 to-transparent" />
        <GeometricPattern opacity={0.06} />
        
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#c5a869] uppercase tracking-wider bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-[#c5a869]/30 w-fit shadow-lg">
            <MapPin className="w-3.5 h-3.5 text-[#c5a869]" />
            <span>{t('prayer:regionCity')}</span>
            <span aria-hidden="true">·</span>
            <span>{t('prayer:regionProvince')}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-numbers text-emerald-400">Asia/Tashkent (UTC+5)</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold tracking-tight text-white leading-tight">
            {t('prayer:title')}
          </h1>

          <p className="text-xs sm:text-sm text-stone-200 max-w-2xl leading-relaxed">
            {t('prayer:subtitle')}
          </p>
        </div>
      </div>

      {/* 2. VERIFICATION & PUBLICATION STATUS BANNER */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg ${
          schedule.isAdministratorPublished
            ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-100 backdrop-blur-md'
            : 'border-amber-500/40 bg-amber-950/40 text-amber-100 backdrop-blur-md'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${schedule.isAdministratorPublished ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
            {schedule.isAdministratorPublished ? (
              <CheckCircle2 className="w-5 h-5 animate-pulse" />
            ) : (
              <ShieldAlert className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="font-bold text-sm sm:text-base">
              {schedule.isAdministratorPublished
                ? t('prayer:statusVerified')
                : t('prayer:statusPending')}
            </div>
            <div className="opacity-80 text-xs font-mono-numbers mt-0.5">
              {schedule.isAdministratorPublished
                ? `${t('prayer:verifiedByLabel')}: ${schedule.publishedBy} · ${schedule.verifiedAt}`
                : t('prayer:pendingDisclaimer')}
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenAdmin}
          className="text-xs shrink-0 self-end sm:self-center border-[#c5a869]/50 text-[#c5a869] hover:bg-[#c5a869]/10"
        >
          {t('prayer:verifyButton')}
        </Button>
      </div>

      {/* 3. LUXURY TABS */}
      <div className="flex border-b border-stone-200 dark:border-emerald-950/80 gap-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('daily')}
          className={`pb-3.5 px-5 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2.5 whitespace-nowrap ${
            activeTab === 'daily'
              ? 'border-[#c5a869] text-[#c5a869] bg-[#c5a869]/5 rounded-t-xl'
              : 'border-transparent text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{t('prayer:tabDaily')}</span>
        </button>

        <button
          onClick={() => setActiveTab('monthly')}
          className={`pb-3.5 px-5 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2.5 whitespace-nowrap ${
            activeTab === 'monthly'
              ? 'border-[#c5a869] text-[#c5a869] bg-[#c5a869]/5 rounded-t-xl'
              : 'border-transparent text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>{t('prayer:tabMonthly')}</span>
        </button>

        <button
          onClick={() => setActiveTab('qibla')}
          className={`pb-3.5 px-5 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2.5 whitespace-nowrap ${
            activeTab === 'qibla'
              ? 'border-[#c5a869] text-[#c5a869] bg-[#c5a869]/5 rounded-t-xl'
              : 'border-transparent text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>{t('prayer:tabQibla')}</span>
        </button>
      </div>

      {/* TAB 1: DAILY PRAYER SCHEDULE & COUNTDOWN */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {/* Active Countdown Card with Glowing Aura */}
          <Card elevated className="p-6 sm:p-8 text-center bg-gradient-to-br from-[#051d18] via-[#072620] to-[#031d17] text-white border-[#c5a869]/50 relative overflow-hidden shadow-2xl">
            <GeometricPattern opacity={0.06} />
            <div className="relative z-10 space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#c5a869]/20 text-[#c5a869] text-xs font-bold uppercase tracking-widest border border-[#c5a869]/30">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>
                  {t('prayer:nextPrayer')}:{' '}
                  {prayerCalculation.nextPrayer
                    ? getLocalizedPrayerName(
                        prayerCalculation.nextPrayer.key,
                        prayerCalculation.nextPrayer.nameUz
                      )
                    : t('prayer:peshin')}{' '}
                  {prayerCalculation.isTomorrow && `(${getLocalizedText('Ertangi')})`}
                </span>
              </div>
              <div className="text-4xl sm:text-6xl font-mono-numbers font-extrabold text-white tracking-wider drop-shadow-lg">
                {prayerCalculation.countdownText}
              </div>
              <p className="text-xs sm:text-sm text-stone-300 max-w-md mx-auto">
                {t('prayer:countdownSubtext')}
              </p>
            </div>
          </Card>

          {/* Today's 8 Prayer Times Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {schedule.times.map((item) => {
              const isNext = prayerCalculation.nextPrayer?.key === item.key;
              const localizedName = getLocalizedPrayerName(item.key, item.nameUz);

              return (
                <Card
                  key={item.key}
                  elevated={isNext}
                  className={`p-5 space-y-3 transition-all duration-300 relative overflow-hidden ${
                    isNext
                      ? 'border-2 border-[#c5a869] ring-4 ring-[#c5a869]/30 bg-gradient-to-br from-[#052620] to-[#071614] shadow-2xl scale-[1.02]'
                      : 'hover:border-[#c5a869]/60 hover:shadow-xl bg-stone-900/40 backdrop-blur-md'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#c5a869]/15 flex items-center justify-center shrink-0">
                        {getPrayerIcon(item.key)}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-stone-100">{localizedName}</div>
                        <div className="text-xs font-arabic text-[#c5a869]">{item.nameAr}</div>
                      </div>
                    </div>
                    {isNext && (
                      <span className="px-2.5 py-1 rounded-full bg-[#c5a869] text-[#071614] text-[10px] font-black uppercase tracking-wider animate-pulse shadow">
                        Keyingi
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs">
                    <div>
                      <div className="text-[10px] text-stone-400 uppercase font-semibold">Azon vaqti</div>
                      <div className="text-xl sm:text-2xl font-bold font-mono-numbers text-white tracking-tight">
                        {item.time}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-[#c5a869] uppercase font-semibold">Iqomat vaqti</div>
                      <div className="text-xl sm:text-2xl font-bold font-mono-numbers text-[#c5a869]">
                        {item.iqamahTime || '—'}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Regional Verification Disclaimer Card */}
          <Card className="p-5 bg-stone-900/60 dark:bg-[#071614]/80 border-[#c5a869]/30 text-xs text-stone-300 flex items-start gap-3.5 shadow-lg">
            <Info className="w-5 h-5 text-[#c5a869] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {getLocalizedText(schedule.disclaimer)}
            </p>
          </Card>
        </div>
      )}

      {/* TAB 2: MONTHLY CALENDAR PREVIEW */}
      {activeTab === 'monthly' && (
        <Card elevated className="p-6 sm:p-8 space-y-6 shadow-2xl bg-stone-950/60 backdrop-blur-md border-[#c5a869]/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-display font-bold text-white">
                {t('prayer:monthlyTitle')}
              </h3>
              <p className="text-xs text-stone-400">Asaka shahri va tumanlar uchun tasdiqlangan oylik jadval</p>
            </div>
            <span className="px-3 py-1.5 rounded-xl bg-[#c5a869]/20 text-[#c5a869] text-xs font-bold font-mono-numbers w-fit">
              {t('prayer:monthlyHijri')}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#051d18] text-[#c5a869] text-xs uppercase tracking-wider font-semibold border-b border-white/10">
                  <th className="py-3 px-3.5">{t('prayer:tableDay')}</th>
                  <th className="py-3 px-3.5">{t('prayer:tableDate')}</th>
                  <th className="py-3 px-3.5">{t('prayer:tahajjud')}</th>
                  <th className="py-3 px-3.5">{t('prayer:subh')}</th>
                  <th className="py-3 px-3.5">{t('prayer:bomdod')}</th>
                  <th className="py-3 px-3.5">{t('prayer:quyosh')}</th>
                  <th className="py-3 px-3.5">{t('prayer:peshin')}</th>
                  <th className="py-3 px-3.5">{t('prayer:asr')}</th>
                  <th className="py-3 px-3.5">{t('prayer:shom')}</th>
                  <th className="py-3 px-3.5">{t('prayer:xufton')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono-numbers text-stone-200">
                {MONTHLY_CALENDAR_PREVIEW.map((row) => (
                  <tr
                    key={row.day}
                    className="hover:bg-[#c5a869]/10 transition-colors"
                  >
                    <td className="py-3 px-3.5 font-bold text-[#c5a869]">{row.day}</td>
                    <td className="py-3 px-3.5 text-stone-400">2026-11-{String(row.day).padStart(2, '0')}</td>
                    <td className="py-3 px-3.5 text-emerald-400 font-semibold">{row.tahajjud}</td>
                    <td className="py-3 px-3.5 text-teal-300">{row.subh}</td>
                    <td className="py-3 px-3.5 font-bold">{row.bomdod}</td>
                    <td className="py-3 px-3.5 text-stone-400">{row.quyosh}</td>
                    <td className="py-3 px-3.5 font-semibold text-white">{row.peshin}</td>
                    <td className="py-3 px-3.5">{row.asr}</td>
                    <td className="py-3 px-3.5 font-semibold text-white">{row.shom}</td>
                    <td className="py-3 px-3.5 text-indigo-300">{row.xufton}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: QIBLA COMPASS */}
      {activeTab === 'qibla' && (
        <Card elevated className="p-8 sm:p-12 text-center max-w-xl mx-auto space-y-8 shadow-2xl bg-gradient-to-br from-[#051d18] via-[#071614] to-black border-[#c5a869]/50 relative overflow-hidden">
          <GeometricPattern opacity={0.05} />
          
          <div className="relative z-10 space-y-2">
            <span className="text-xs font-semibold text-[#c5a869] uppercase tracking-widest bg-[#c5a869]/20 px-3.5 py-1 rounded-full border border-[#c5a869]/30">
              {t('prayer:qiblaDirectionTitle')}
            </span>
            <h3 className="text-2xl sm:text-3xl font-display font-bold text-white">
              {t('prayer:qiblaFromAsaka')}
            </h3>
            <p className="text-xs sm:text-sm text-stone-300">
              {t('prayer:qiblaCoordinates')}
            </p>
          </div>

          {/* Compass Visual Instrument with Glowing Needle */}
          <div className="relative w-72 h-72 mx-auto rounded-full border-4 border-[#c5a869]/40 bg-gradient-to-b from-[#071614] to-[#02110e] flex items-center justify-center shadow-2xl animate-pulse-glow">
            <div className="absolute inset-3 rounded-full border border-dashed border-[#c5a869]/30" />

            {/* Cardinal marks */}
            <span className="absolute top-3 text-xs font-bold text-[#c5a869] tracking-widest">N (0°)</span>
            <span className="absolute right-3 text-xs font-bold text-stone-400 tracking-widest">E (90°)</span>
            <span className="absolute bottom-3 text-xs font-bold text-stone-400 tracking-widest">S (180°)</span>
            <span className="absolute left-3 text-xs font-bold text-stone-400 tracking-widest">W (270°)</span>

            {/* Qibla Needle pointing at 241 degrees */}
            <div
              className="absolute w-1.5 h-36 origin-bottom transition-transform duration-1000 ease-out"
              style={{ transform: 'rotate(241deg)' }}
            >
              <div className="w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-16 border-b-[#c5a869] mx-auto filter drop-shadow-[0_0_8px_#c5a869]" />
              <div className="w-1.5 h-24 bg-gradient-to-t from-stone-500 via-[#c5a869] to-[#c5a869] mx-auto rounded-full shadow-lg" />
            </div>

            {/* Center Dial */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#c5a869] to-[#9e7f3c] text-[#071614] flex items-center justify-center font-bold text-xs shadow-2xl z-10 border-2 border-white/30">
              <Compass className="w-6 h-6 animate-spin duration-1000" />
            </div>
          </div>

          <div className="relative z-10 space-y-2">
            <div className="text-4xl font-extrabold font-mono-numbers text-[#c5a869] tracking-wider">
              241° WSW
            </div>
            <p className="text-xs sm:text-sm text-stone-300 max-w-md mx-auto leading-relaxed">
              {t('prayer:qiblaCompassTip')}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};
