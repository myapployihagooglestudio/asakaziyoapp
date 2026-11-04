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

  return (
    <div className="space-y-8 pb-16">
      {/* Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-[#c5a869]/30 bg-gradient-to-r from-[#031d17] to-[#071614] text-white p-6 sm:p-10">
        <GeometricPattern opacity={0.05} />
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#c5a869] uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5" />
            <span>{t('prayer:regionCity')}</span>
            <span aria-hidden="true">·</span>
            <span>{t('prayer:regionProvince')}</span>
            <span aria-hidden="true">·</span>
            <span>Asia/Tashkent (UTC+5)</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-white">
            {t('prayer:title')}
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            {t('prayer:subtitle')}
          </p>
        </div>
      </div>

      {/* Verification Status Banner */}
      <div
        className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          schedule.isAdministratorPublished
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
            : 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200'
        }`}
      >
        <div className="flex items-center gap-3">
          {schedule.isAdministratorPublished ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
          )}
          <div className="text-xs sm:text-sm">
            <div className="font-semibold">
              {schedule.isAdministratorPublished
                ? t('prayer:statusVerified')
                : t('prayer:statusPending')}
            </div>
            <div className="opacity-80 text-[11px] font-mono-numbers">
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
          className="text-xs shrink-0 self-end sm:self-center"
        >
          {t('prayer:verifyButton')}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200 dark:border-emerald-950/80 gap-2">
        <button
          onClick={() => setActiveTab('daily')}
          className={`pb-3 px-4 text-xs sm:text-sm font-semibold transition-colors border-b-2 cursor-pointer ${
            activeTab === 'daily'
              ? 'border-[#c5a869] text-[#c5a869]'
              : 'border-transparent text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{t('prayer:tabDaily')}</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('monthly')}
          className={`pb-3 px-4 text-xs sm:text-sm font-semibold transition-colors border-b-2 cursor-pointer ${
            activeTab === 'monthly'
              ? 'border-[#c5a869] text-[#c5a869]'
              : 'border-transparent text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{t('prayer:tabMonthly')}</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('qibla')}
          className={`pb-3 px-4 text-xs sm:text-sm font-semibold transition-colors border-b-2 cursor-pointer ${
            activeTab === 'qibla'
              ? 'border-[#c5a869] text-[#c5a869]'
              : 'border-transparent text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4" />
            <span>{t('prayer:tabQibla')}</span>
          </div>
        </button>
      </div>

      {/* TAB 1: DAILY */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {/* Active Countdown Card */}
          <Card elevated className="p-6 text-center bg-gradient-to-br from-[#051d18] to-[#082620] text-white border-[#c5a869]/40 relative overflow-hidden">
            <GeometricPattern opacity={0.05} />
            <div className="relative z-10 space-y-2">
              <span className="text-xs font-semibold text-[#c5a869] uppercase tracking-widest">
                {t('prayer:nextPrayer')}:{' '}
                {prayerCalculation.nextPrayer
                  ? getLocalizedPrayerName(
                      prayerCalculation.nextPrayer.key,
                      prayerCalculation.nextPrayer.nameUz
                    )
                  : t('prayer:peshin')}{' '}
                {prayerCalculation.isTomorrow && `(${getLocalizedText('Ertangi')})`}
              </span>
              <div className="text-4xl sm:text-5xl font-mono-numbers font-bold text-white tracking-wider">
                {prayerCalculation.countdownText}
              </div>
              <p className="text-xs text-stone-300">
                {t('prayer:countdownSubtext')}
              </p>
            </div>
          </Card>

          {/* Today's 8 Prayer Times Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
            {schedule.times.map((item) => {
              const isNext = prayerCalculation.nextPrayer?.key === item.key;
              const localizedName = getLocalizedPrayerName(item.key, item.nameUz);

              return (
                <Card
                  key={item.key}
                  elevated={isNext}
                  className={`p-3 sm:p-4 text-center space-y-2 transition-all ${
                    isNext
                      ? 'border-[#c5a869] ring-2 ring-[#c5a869]/40 bg-gradient-to-b from-[#c5a869]/15 to-transparent'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-stone-500 dark:text-stone-400">
                    <span className="truncate">{localizedName}</span>
                    {isNext && (
                      <span className="w-2 h-2 rounded-full bg-[#c5a869] animate-pulse shrink-0 ml-1" />
                    )}
                  </div>
                  <div className="font-arabic text-base sm:text-lg text-[#c5a869]">{item.nameAr}</div>
                  <div className="text-xl sm:text-2xl font-bold font-mono-numbers text-stone-900 dark:text-stone-100">
                    {item.time}
                  </div>
                  {item.iqamahTime && (
                    <div className="text-[11px] text-stone-400 border-t border-stone-100 dark:border-emerald-950/60 pt-1.5">
                      {t('prayer:iqamah')}: <span className="font-mono-numbers font-semibold text-stone-600 dark:text-stone-300">{item.iqamahTime}</span>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Regional Verification Disclaimer Card */}
          <Card className="p-4 bg-stone-100/60 dark:bg-[#071614]/60 text-xs text-stone-600 dark:text-stone-400 flex items-start gap-3">
            <Info className="w-4 h-4 text-[#c5a869] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {getLocalizedText(schedule.disclaimer)}
            </p>
          </Card>
        </div>
      )}

      {/* TAB 2: MONTHLY CALENDAR PREVIEW */}
      {activeTab === 'monthly' && (
        <Card elevated className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {t('prayer:monthlyTitle')}
            </h3>
            <span className="text-xs text-[#c5a869] font-mono-numbers">
              {t('prayer:monthlyHijri')}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-stone-200 dark:border-emerald-950 text-stone-400 text-xs uppercase tracking-wider">
                  <th className="py-2.5 px-3">{t('prayer:tableDay')}</th>
                  <th className="py-2.5 px-3">{t('prayer:tableDate')}</th>
                  <th className="py-2.5 px-3">{t('prayer:tahajjud')}</th>
                  <th className="py-2.5 px-3">{t('prayer:subh')}</th>
                  <th className="py-2.5 px-3">{t('prayer:bomdod')}</th>
                  <th className="py-2.5 px-3">{t('prayer:quyosh')}</th>
                  <th className="py-2.5 px-3">{t('prayer:peshin')}</th>
                  <th className="py-2.5 px-3">{t('prayer:asr')}</th>
                  <th className="py-2.5 px-3">{t('prayer:shom')}</th>
                  <th className="py-2.5 px-3">{t('prayer:xufton')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-emerald-950/60 font-mono-numbers">
                {MONTHLY_CALENDAR_PREVIEW.map((row) => (
                  <tr
                    key={row.day}
                    className="hover:bg-[#c5a869]/5 transition-colors text-stone-700 dark:text-stone-300"
                  >
                    <td className="py-2.5 px-3 font-semibold text-[#c5a869]">{row.day}</td>
                    <td className="py-2.5 px-3 text-stone-500 font-mono-numbers">2026-11-{String(row.day).padStart(2, '0')}</td>
                    <td className="py-2.5 px-3 text-emerald-500">{row.tahajjud}</td>
                    <td className="py-2.5 px-3 text-teal-500">{row.subh}</td>
                    <td className="py-2.5 px-3">{row.bomdod}</td>
                    <td className="py-2.5 px-3 text-stone-400">{row.quyosh}</td>
                    <td className="py-2.5 px-3 font-semibold">{row.peshin}</td>
                    <td className="py-2.5 px-3">{row.asr}</td>
                    <td className="py-2.5 px-3 font-semibold">{row.shom}</td>
                    <td className="py-2.5 px-3">{row.xufton}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: QIBLA COMPASS */}
      {activeTab === 'qibla' && (
        <Card elevated className="p-8 text-center max-w-lg mx-auto space-y-6">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#c5a869] uppercase tracking-wider">
              {t('prayer:qiblaDirectionTitle')}
            </span>
            <h3 className="text-2xl font-display font-bold text-stone-900 dark:text-stone-100">
              {t('prayer:qiblaFromAsaka')}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {t('prayer:qiblaCoordinates')}
            </p>
          </div>

          {/* Compass Visual Instrument */}
          <div className="relative w-64 h-64 mx-auto rounded-full border-4 border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614] flex items-center justify-center shadow-inner">
            <div className="absolute inset-2 rounded-full border border-dashed border-[#c5a869]/40" />

            {/* Cardinal marks */}
            <span className="absolute top-2 text-xs font-bold text-stone-400">N (0°)</span>
            <span className="absolute right-2 text-xs font-bold text-stone-400">E (90°)</span>
            <span className="absolute bottom-2 text-xs font-bold text-stone-400">S (180°)</span>
            <span className="absolute left-2 text-xs font-bold text-stone-400">W (270°)</span>

            {/* Qibla Needle pointing at 241 degrees */}
            <div
              className="absolute w-1 h-32 origin-bottom transition-transform"
              style={{ transform: 'rotate(241deg)' }}
            >
              <div className="w-0 h-0 border-l-6 border-l-transparent border-r-6 border-r-transparent border-b-14 border-b-[#c5a869] mx-auto" />
              <div className="w-1 h-20 bg-gradient-to-t from-stone-400 to-[#c5a869] mx-auto rounded-full" />
            </div>

            {/* Center Dial */}
            <div className="w-8 h-8 rounded-full bg-[#c5a869] text-[#071614] flex items-center justify-center font-bold text-xs shadow-md z-10">
              <Compass className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-3xl font-bold font-mono-numbers text-[#c5a869]">
              241° WSW
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {t('prayer:qiblaCompassTip')}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};
