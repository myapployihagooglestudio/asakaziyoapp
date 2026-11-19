import React from 'react';
import {
  CanonicalDisplayProfileId,
  SmartDisplaySettings,
  SmartDisplayTimeline,
} from '../../../../utils/smartMosqueDisplayEngine';
import { SmartDisplayLocaleBundle } from '../../../../utils/smartMosqueDisplayI18n';
import { DisplayProfileTheme } from './displayProfiles';

interface DisplayCountdownBandProps {
  profileId: CanonicalDisplayProfileId;
  theme: DisplayProfileTheme;
  settings: SmartDisplaySettings;
  timeline: SmartDisplayTimeline;
  sunriseTime: string;
  ishraqTime: string;
  jumaTime: string;
  jumaIqamahTime: string;
  tahajjudTime: string;
  subhTime: string;
  nextPrayerLabel: string;
  iqamahPrayerLabel: string;
  t: SmartDisplayLocaleBundle;
}

export const DisplayCountdownBand: React.FC<DisplayCountdownBandProps> = ({
  profileId,
  theme,
  settings,
  timeline,
  sunriseTime,
  ishraqTime,
  jumaTime,
  jumaIqamahTime,
  tahajjudTime,
  subhTime,
  nextPrayerLabel,
  iqamahPrayerLabel,
  t,
}) => {
  const showAuxiliaryMeta =
    (settings.showTahajjud && Boolean(tahajjudTime)) || (settings.showSubh && Boolean(subhTime));

  // =========================================================================
  // 1. MADINA PORTRAIT (9:16 Vertical Pillar — Masjid an-Nabawi Lower Stack)
  // =========================================================================
  if (profileId === 'madina_portrait') {
    const bandCols =
      settings.showJuma && settings.showIqamahCountdown
        ? 'grid-cols-3'
        : settings.showJuma || settings.showIqamahCountdown
          ? 'grid-cols-2'
          : 'grid-cols-1';

    return (
      <div className="shrink-0">
        {/* Clean 1px Hairline + Twin Solar Times (Ishraq & Sunrise) */}
        <section
          aria-label="Sunrise and Ishraq"
          className={`border-t ${theme.accentHairline} px-[clamp(18px,3vw,42px)] py-[clamp(10px,1.5vh,22px)]`}
        >
          <div className={`grid ${settings.showIshraq ? 'grid-cols-2' : 'grid-cols-1'} gap-4 items-center text-center`}>
            {settings.showIshraq && (
              <div>
                <div dir="rtl" className={`font-arabic-signage font-bold text-[clamp(1rem,1.8vh,1.9rem)] ${theme.inkSecondary}`}>
                  ابتداء وقت الضحى
                </div>
                <div className={`text-[clamp(0.68rem,1.05vh,1.1rem)] font-bold uppercase tracking-[0.1em] ${theme.inkMuted}`}>
                  {t.ishraqLabel}
                </div>
                <div className={`mt-1 font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(1.75rem,3.6vh,3.8rem)] ${theme.inkPrimary}`}>
                  {ishraqTime}
                </div>
              </div>
            )}
            <div className={settings.showIshraq ? `border-l ${theme.hairline}` : ''}>
              <div dir="rtl" className={`font-arabic-signage font-bold text-[clamp(1rem,1.8vh,1.9rem)] ${theme.inkSecondary}`}>
                الشروق
              </div>
              <div className={`text-[clamp(0.68rem,1.05vh,1.1rem)] font-bold uppercase tracking-[0.1em] ${theme.inkMuted}`}>
                {t.sunriseLabel}
              </div>
              <div className={`mt-1 font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(1.75rem,3.6vh,3.8rem)] ${theme.inkPrimary}`}>
                {sunriseTime}
              </div>
            </div>
          </div>

          {showAuxiliaryMeta && (
            <div className={`mt-2 pt-2 border-t ${theme.hairline} flex items-center justify-center gap-6 text-[clamp(0.72rem,1.15vh,1.2rem)] ${theme.inkSecondary}`}>
              {settings.showTahajjud && tahajjudTime && (
                <span>
                  <span className={`font-semibold ${theme.inkMuted}`}>{t.tahajjudLabel}: </span>
                  <strong className="font-mono-numbers tabular-nums">{tahajjudTime}</strong>
                </span>
              )}
              {settings.showSubh && subhTime && (
                <span>
                  <span className={`font-semibold ${theme.inkMuted}`}>{t.subhLabel}: </span>
                  <strong className="font-mono-numbers tabular-nums">{subhTime}</strong>
                </span>
              )}
            </div>
          )}
        </section>

        {/* Signature Masjid an-Nabawi Solid Royal Mosque Green Band */}
        <section
          aria-label="Juma and Prayer Countdowns"
          className={`${theme.greenBandBg} px-[clamp(14px,2.5vw,36px)] py-[clamp(12px,1.85vh,26px)]`}
        >
          <div className={`grid ${bandCols} items-center gap-x-3 text-center`}>
            {settings.showJuma && (
              <div>
                <div dir="rtl" className={`font-arabic-signage font-bold text-[clamp(1.05rem,2vh,2.05rem)] ${theme.greenBandAccent}`}>
                  الجمعة
                </div>
                <div className="text-[clamp(0.66rem,1vh,1.05rem)] font-bold uppercase tracking-wider text-white/85">
                  {t.jumaLabel}
                </div>
                <div className="mt-1 font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(1.55rem,3.4vh,3.5rem)] text-white">
                  {jumaTime}
                </div>
                {jumaIqamahTime && jumaIqamahTime !== jumaTime && (
                  <div className="mt-1 text-[clamp(0.62rem,0.9vh,0.95rem)] font-mono-numbers text-white/75">
                    {t.iqamahColumnLabel}: {jumaIqamahTime}
                  </div>
                )}
              </div>
            )}

            <div className={settings.showJuma ? 'border-l border-white/20 pl-2' : ''}>
              <div dir="rtl" className={`font-arabic-signage font-bold text-[clamp(1.05rem,2vh,2.05rem)] ${theme.greenBandAccent}`}>
                الأذان التالي بعد
              </div>
              <div className="text-[clamp(0.66rem,1vh,1.05rem)] font-bold uppercase tracking-wider text-white/90 truncate">
                {nextPrayerLabel}
              </div>
              <div className="mt-1 font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(1.55rem,3.4vh,3.5rem)] text-white">
                {timeline.nextAzanCountdown}
              </div>
              <div className="mt-1 text-[clamp(0.62rem,0.9vh,0.95rem)] font-mono-numbers text-white/75">
                {timeline.nextAzanTime}
                {timeline.isNextAzanTomorrow ? ` · ${t.tomorrowPrefix}` : ''}
              </div>
            </div>

            {settings.showIqamahCountdown && (
              <div
                className={`border-l border-white/20 pl-2 rounded-lg transition-colors ${
                  timeline.isBetweenAzanAndIqamah ? 'bg-[#F3D788]/18 py-1.5 ring-1 ring-[#F3D788]/70' : ''
                }`}
              >
                <div dir="rtl" className={`font-arabic-signage font-bold text-[clamp(1.05rem,2vh,2.05rem)] ${theme.greenBandAccent}`}>
                  الإقامة بعد
                </div>
                <div className="text-[clamp(0.66rem,1vh,1.05rem)] font-bold uppercase tracking-wider text-white/90 truncate">
                  {timeline.isBetweenAzanAndIqamah ? t.iqamahWaitingLabel : iqamahPrayerLabel}
                </div>
                <div
                  className={`mt-1 font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(1.55rem,3.4vh,3.5rem)] ${
                    timeline.isBetweenAzanAndIqamah ? theme.greenBandAccent : 'text-white'
                  }`}
                >
                  {timeline.iqamahCountdown}
                </div>
                <div className="mt-1 text-[clamp(0.62rem,0.9vh,0.95rem)] font-mono-numbers text-white/75 truncate">
                  {t.iqamahColumnLabel}: {timeline.iqamahTime}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  // =========================================================================
  // 2. EMERALD ROYAL (Left Sanctuary Column Stack — Countdowns + Solar Metrics)
  // =========================================================================
  if (profileId === 'emerald_royal') {
    return (
      <section aria-label="Countdowns and Solar Times" className="flex-1 min-h-0 flex flex-col justify-between gap-4 pt-[clamp(14px,2vh,26px)]">
        {/* Stacked Primary Countdowns */}
        <div className="space-y-[clamp(10px,1.6vh,20px)]">
          {/* Next Azan Countdown */}
          <div className="rounded-2xl bg-[#093424] border border-[#DFBD69]/28 px-[clamp(14px,1.6vw,26px)] py-[clamp(12px,1.8vh,22px)]">
            <div className="flex items-baseline justify-between gap-2">
              <span className={`text-[clamp(0.7rem,0.88vw,1.1rem)] font-bold uppercase tracking-[0.12em] ${theme.inkSecondary}`}>
                {t.nextAzanLabel} · {nextPrayerLabel}
              </span>
              <span dir="rtl" className={`font-arabic-signage font-bold text-[clamp(1rem,1.25vw,1.65rem)] ${theme.goldText}`}>
                الأذان التالي بعد
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between gap-3">
              <div className="font-mono-numbers tabular-nums font-extrabold leading-none tracking-[-0.03em] text-[clamp(2.2rem,3.6vw,5rem)] text-white">
                {timeline.nextAzanCountdown}
              </div>
              <div className={`text-right font-mono-numbers font-bold text-[clamp(0.85rem,1.1vw,1.45rem)] ${theme.goldText}`}>
                {timeline.nextAzanTime}
                {timeline.isNextAzanTomorrow ? ` (${t.tomorrowPrefix})` : ''}
              </div>
            </div>
          </div>

          {/* Iqamah Countdown */}
          {settings.showIqamahCountdown && (
            <div
              className={`rounded-2xl px-[clamp(14px,1.6vw,26px)] py-[clamp(12px,1.8vh,22px)] border transition-colors ${
                timeline.isBetweenAzanAndIqamah
                  ? 'bg-[#0E5E38] border-[#FFE498]/75'
                  : 'bg-[#07291C] border-[#DFBD69]/20'
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[clamp(0.7rem,0.88vw,1.1rem)] font-bold uppercase tracking-[0.12em] text-white/85 truncate">
                  {timeline.isBetweenAzanAndIqamah
                    ? t.iqamahWaitingLabel
                    : `${t.iqamahColumnLabel} · ${iqamahPrayerLabel}`}
                </span>
                <span dir="rtl" className={`font-arabic-signage font-bold text-[clamp(1rem,1.25vw,1.65rem)] ${theme.goldText}`}>
                  الإقامة بعد
                </span>
              </div>
              <div className="mt-1.5 flex items-baseline justify-between gap-3">
                <div
                  className={`font-mono-numbers tabular-nums font-extrabold leading-none tracking-[-0.03em] text-[clamp(2rem,3.2vw,4.5rem)] ${
                    timeline.isBetweenAzanAndIqamah ? 'text-[#FFE498]' : 'text-white'
                  }`}
                >
                  {timeline.iqamahCountdown}
                </div>
                <div className="text-right font-mono-numbers font-bold text-[clamp(0.85rem,1.1vw,1.45rem)] text-white/80">
                  {timeline.iqamahTime}
                </div>
              </div>
              {timeline.isBetweenAzanAndIqamah && (
                <div className="mt-2 text-[clamp(0.72rem,0.88vw,1.1rem)] font-semibold text-[#FFE498]">
                  {t.iqamahPrepareNotice}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Clean Aligned Sunrise / Ishraq / Juma Footer Metrics */}
        <div className={`pt-[clamp(10px,1.4vh,18px)] border-t ${theme.hairline}`}>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className={`text-[clamp(0.62rem,0.75vw,0.95rem)] font-bold uppercase tracking-[0.1em] ${theme.inkMuted}`}>
                {t.sunriseLabel}
              </div>
              <div className={`mt-1 font-mono-numbers tabular-nums font-extrabold text-[clamp(1.25rem,1.85vw,2.6rem)] ${theme.inkPrimary}`}>
                {sunriseTime}
              </div>
            </div>

            {settings.showIshraq && (
              <div className={`border-l ${theme.hairline}`}>
                <div className={`text-[clamp(0.62rem,0.75vw,0.95rem)] font-bold uppercase tracking-[0.1em] ${theme.inkMuted}`}>
                  {t.ishraqLabel}
                </div>
                <div className={`mt-1 font-mono-numbers tabular-nums font-extrabold text-[clamp(1.25rem,1.85vw,2.6rem)] ${theme.inkPrimary}`}>
                  {ishraqTime}
                </div>
              </div>
            )}

            {settings.showJuma && (
              <div className={`border-l ${theme.hairline}`}>
                <div className={`text-[clamp(0.62rem,0.75vw,0.95rem)] font-bold uppercase tracking-[0.1em] ${theme.goldText}`}>
                  {t.jumaLabel}
                </div>
                <div className={`mt-1 font-mono-numbers tabular-nums font-extrabold text-[clamp(1.25rem,1.85vw,2.6rem)] ${theme.goldText}`}>
                  {jumaTime}
                </div>
              </div>
            )}
          </div>

          {showAuxiliaryMeta && (
            <div className={`mt-2.5 pt-2 border-t ${theme.hairline} flex items-center justify-center gap-6 text-[clamp(0.72rem,0.85vw,1.08rem)] ${theme.inkSecondary}`}>
              {settings.showTahajjud && tahajjudTime && (
                <span>
                  <span className={theme.inkMuted}>{t.tahajjudLabel}: </span>
                  <strong className="font-mono-numbers tabular-nums">{tahajjudTime}</strong>
                </span>
              )}
              {settings.showSubh && subhTime && (
                <span>
                  <span className={theme.inkMuted}>{t.subhLabel}: </span>
                  <strong className="font-mono-numbers tabular-nums">{subhTime}</strong>
                </span>
              )}
            </div>
          )}
        </div>
      </section>
    );
  }

  // =========================================================================
  // 3. MODERN MINIMAL (Clean Horizontal 5-Metric Hairline Strip)
  // =========================================================================
  if (profileId === 'modern_minimal') {
    return (
      <section
        aria-label="Solar Times and Countdowns"
        className="shrink-0 px-[clamp(20px,3vw,56px)] pb-[clamp(12px,1.6vh,24px)]"
      >
        <div
          className={`grid grid-cols-2 lg:grid-cols-5 items-center border ${theme.hairline} divide-x ${theme.hairline} bg-[#F5F4EF]`}
        >
          {/* Sunrise */}
          <div className="px-[clamp(12px,1.4vw,24px)] py-[clamp(10px,1.4vh,20px)]">
            <div className="flex items-baseline justify-between gap-2">
              <span className={`text-[clamp(0.65rem,0.8vw,1rem)] font-bold uppercase tracking-[0.12em] ${theme.inkMuted}`}>
                {t.sunriseLabel}
              </span>
              <span dir="rtl" className={`font-arabic-signage text-[clamp(0.95rem,1.15vw,1.5rem)] ${theme.inkSecondary}`}>
                الشروق
              </span>
            </div>
            <div className={`mt-1 font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(1.5rem,2.3vw,3.3rem)] ${theme.inkPrimary}`}>
              {sunriseTime}
            </div>
          </div>

          {/* Ishraq */}
          {settings.showIshraq && (
            <div className="px-[clamp(12px,1.4vw,24px)] py-[clamp(10px,1.4vh,20px)]">
              <div className="flex items-baseline justify-between gap-2">
                <span className={`text-[clamp(0.65rem,0.8vw,1rem)] font-bold uppercase tracking-[0.12em] ${theme.inkMuted}`}>
                  {t.ishraqLabel}
                </span>
                <span dir="rtl" className={`font-arabic-signage text-[clamp(0.95rem,1.15vw,1.5rem)] ${theme.inkSecondary}`}>
                  الضحى
                </span>
              </div>
              <div className={`mt-1 font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(1.5rem,2.3vw,3.3rem)] ${theme.inkPrimary}`}>
                {ishraqTime}
              </div>
            </div>
          )}

          {/* Juma */}
          {settings.showJuma && (
            <div className="px-[clamp(12px,1.4vw,24px)] py-[clamp(10px,1.4vh,20px)]">
              <div className="flex items-baseline justify-between gap-2">
                <span className={`text-[clamp(0.65rem,0.8vw,1rem)] font-bold uppercase tracking-[0.12em] ${theme.goldText}`}>
                  {t.jumaLabel}
                </span>
                <span dir="rtl" className={`font-arabic-signage text-[clamp(0.95rem,1.15vw,1.5rem)] ${theme.goldText}`}>
                  الجمعة
                </span>
              </div>
              <div className={`mt-1 font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(1.5rem,2.3vw,3.3rem)] ${theme.inkPrimary}`}>
                {jumaTime}
              </div>
            </div>
          )}

          {/* Next Azan Countdown */}
          <div className="px-[clamp(12px,1.4vw,24px)] py-[clamp(10px,1.4vh,20px)] bg-[#0B4C2E] text-white">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[clamp(0.65rem,0.8vw,1rem)] font-bold uppercase tracking-[0.12em] text-white/80 truncate">
                {t.nextAzanLabel} · {nextPrayerLabel}
              </span>
            </div>
            <div className="mt-1 font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(1.5rem,2.3vw,3.3rem)] text-white">
              {timeline.nextAzanCountdown}
            </div>
          </div>

          {/* Iqamah Countdown */}
          {settings.showIqamahCountdown && (
            <div
              className={`px-[clamp(12px,1.4vw,24px)] py-[clamp(10px,1.4vh,20px)] ${
                timeline.isBetweenAzanAndIqamah ? 'bg-[#0E5E38] text-[#F3D88E]' : 'bg-[#0A3D25] text-white'
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[clamp(0.65rem,0.8vw,1rem)] font-bold uppercase tracking-[0.12em] text-white/80 truncate">
                  {timeline.isBetweenAzanAndIqamah
                    ? t.iqamahWaitingLabel
                    : `${t.iqamahColumnLabel} · ${iqamahPrayerLabel}`}
                </span>
              </div>
              <div className="mt-1 font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(1.5rem,2.3vw,3.3rem)]">
                {timeline.iqamahCountdown}
              </div>
            </div>
          )}
        </div>

        {showAuxiliaryMeta && (
          <div className={`mt-2 flex items-center justify-end gap-6 text-[clamp(0.72rem,0.85vw,1.08rem)] ${theme.inkMuted}`}>
            {settings.showTahajjud && tahajjudTime && (
              <span>
                {t.tahajjudLabel}: <strong className={`font-mono-numbers ${theme.inkPrimary}`}>{tahajjudTime}</strong>
              </span>
            )}
            {settings.showSubh && subhTime && (
              <span>
                {t.subhLabel}: <strong className={`font-mono-numbers ${theme.inkPrimary}`}>{subhTime}</strong>
              </span>
            )}
          </div>
        )}
      </section>
    );
  }

  // =========================================================================
  // 4. ROYAL IVORY (16:9 Architectural Split Lower Band)
  // =========================================================================
  return (
    <section
      aria-label="Solar Times, Juma and Countdowns"
      className="shrink-0 px-[clamp(20px,3vw,56px)] pb-[clamp(12px,1.6vh,22px)]"
    >
      <div className="grid grid-cols-12 gap-[clamp(12px,1.5vw,24px)] items-stretch">
        {/* Left 4 columns: Clean Sunrise & Ishraq (+ optional Tahajjud/Subh) */}
        <div
          className={`col-span-12 lg:col-span-4 rounded-2xl border ${theme.hairline} ${theme.secondarySurfaceBg} px-[clamp(14px,1.6vw,26px)] py-[clamp(10px,1.5vh,20px)] flex flex-col justify-center`}
        >
          <div className={`grid ${settings.showIshraq ? 'grid-cols-2' : 'grid-cols-1'} gap-4 items-center text-center`}>
            <div>
              <div dir="rtl" className={`font-arabic-signage font-bold text-[clamp(1rem,1.25vw,1.65rem)] ${theme.inkSecondary}`}>
                الشروق
              </div>
              <div className={`text-[clamp(0.64rem,0.78vw,0.98rem)] font-bold uppercase tracking-[0.1em] ${theme.inkMuted}`}>
                {t.sunriseLabel}
              </div>
              <div className={`mt-1 font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(1.6rem,2.4vw,3.4rem)] ${theme.inkPrimary}`}>
                {sunriseTime}
              </div>
            </div>

            {settings.showIshraq && (
              <div className={`border-l ${theme.hairline} pl-3`}>
                <div dir="rtl" className={`font-arabic-signage font-bold text-[clamp(1rem,1.25vw,1.65rem)] ${theme.inkSecondary}`}>
                  ابتداء وقت الضحى
                </div>
                <div className={`text-[clamp(0.64rem,0.78vw,0.98rem)] font-bold uppercase tracking-[0.1em] ${theme.inkMuted}`}>
                  {t.ishraqLabel}
                </div>
                <div className={`mt-1 font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(1.6rem,2.4vw,3.4rem)] ${theme.inkPrimary}`}>
                  {ishraqTime}
                </div>
              </div>
            )}
          </div>

          {showAuxiliaryMeta && (
            <div className={`mt-2 pt-2 border-t ${theme.hairline} flex items-center justify-center gap-5 text-[clamp(0.68rem,0.82vw,1.04rem)] ${theme.inkSecondary}`}>
              {settings.showTahajjud && tahajjudTime && (
                <span>
                  <span className={theme.inkMuted}>{t.tahajjudLabel}: </span>
                  <strong className="font-mono-numbers tabular-nums">{tahajjudTime}</strong>
                </span>
              )}
              {settings.showSubh && subhTime && (
                <span>
                  <span className={theme.inkMuted}>{t.subhLabel}: </span>
                  <strong className="font-mono-numbers tabular-nums">{subhTime}</strong>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right 8 columns: Signature Solid Royal Mosque Green Band */}
        <div
          className={`col-span-12 lg:col-span-8 rounded-2xl ${theme.greenBandBg} px-[clamp(16px,2vw,34px)] py-[clamp(12px,1.6vh,22px)] flex items-center`}
        >
          <div
            className={`w-full grid items-center gap-x-[clamp(12px,1.8vw,30px)] text-center ${
              settings.showJuma && settings.showIqamahCountdown
                ? 'grid-cols-3'
                : settings.showJuma || settings.showIqamahCountdown
                  ? 'grid-cols-2'
                  : 'grid-cols-1'
            }`}
          >
            {settings.showJuma && (
              <div>
                <div dir="rtl" className={`font-arabic-signage font-bold text-[clamp(1.05rem,1.4vw,1.95rem)] ${theme.greenBandAccent}`}>
                  الجمعة
                </div>
                <div className="text-[clamp(0.66rem,0.82vw,1.05rem)] font-bold uppercase tracking-[0.1em] text-white/85">
                  {t.jumaLabel}
                </div>
                <div className="mt-1 font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(1.65rem,2.6vw,3.7rem)] text-white">
                  {jumaTime}
                </div>
                {jumaIqamahTime && jumaIqamahTime !== jumaTime && (
                  <div className="mt-1 text-[clamp(0.64rem,0.78vw,0.98rem)] font-mono-numbers text-white/75">
                    {t.iqamahColumnLabel}: {jumaIqamahTime}
                  </div>
                )}
              </div>
            )}

            <div className={settings.showJuma ? 'border-l border-white/20 pl-3' : ''}>
              <div dir="rtl" className={`font-arabic-signage font-bold text-[clamp(1.05rem,1.4vw,1.95rem)] ${theme.greenBandAccent}`}>
                الأذان التالي بعد
              </div>
              <div className="text-[clamp(0.66rem,0.82vw,1.05rem)] font-bold uppercase tracking-[0.1em] text-white/90 truncate">
                {t.nextAzanLabel} · {nextPrayerLabel}
              </div>
              <div className="mt-1 font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(1.65rem,2.6vw,3.7rem)] text-white">
                {timeline.nextAzanCountdown}
              </div>
              <div className="mt-1 text-[clamp(0.64rem,0.78vw,0.98rem)] font-mono-numbers text-white/75">
                {t.azanColumnLabel}: {timeline.nextAzanTime}
                {timeline.isNextAzanTomorrow ? ` (${t.tomorrowPrefix})` : ''}
              </div>
            </div>

            {settings.showIqamahCountdown && (
              <div
                className={`border-l border-white/20 pl-3 rounded-xl transition-colors ${
                  timeline.isBetweenAzanAndIqamah ? 'bg-[#F3D788]/18 py-1.5 px-2 ring-1 ring-[#F3D788]/70' : ''
                }`}
              >
                <div dir="rtl" className={`font-arabic-signage font-bold text-[clamp(1.05rem,1.4vw,1.95rem)] ${theme.greenBandAccent}`}>
                  الإقامة بعد
                </div>
                <div className="text-[clamp(0.66rem,0.82vw,1.05rem)] font-bold uppercase tracking-[0.1em] text-white/90 truncate">
                  {timeline.isBetweenAzanAndIqamah
                    ? t.iqamahWaitingLabel
                    : `${t.iqamahColumnLabel} · ${iqamahPrayerLabel}`}
                </div>
                <div
                  className={`mt-1 font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(1.65rem,2.6vw,3.7rem)] ${
                    timeline.isBetweenAzanAndIqamah ? theme.greenBandAccent : 'text-white'
                  }`}
                >
                  {timeline.iqamahCountdown}
                </div>
                <div className="mt-1 text-[clamp(0.64rem,0.78vw,0.98rem)] font-mono-numbers text-white/75 truncate">
                  {timeline.isBetweenAzanAndIqamah
                    ? t.iqamahPrepareNotice
                    : `${t.iqamahColumnLabel}: ${timeline.iqamahTime}`}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
