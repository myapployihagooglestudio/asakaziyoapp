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
  // 1. MADINA PORTRAIT (9:16 Vertical Pillar — Clean Localized Lower Stack)
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
        {/* Clean 1px Hairline + Twin Solar Times (Sunrise & Ishraq) */}
        <section
          aria-label={`${t.sunriseLabel} & ${t.ishraqLabel}`}
          className={`border-t ${theme.accentHairline} px-[clamp(18px,3vw,42px)] py-[clamp(12px,1.7vh,24px)]`}
        >
          <div
            className={`grid ${settings.showIshraq ? 'grid-cols-2' : 'grid-cols-1'} gap-4 items-center text-center`}
          >
            <div>
              <div
                className={`text-[clamp(0.75rem,1.25vh,1.35rem)] font-extrabold uppercase tracking-[0.12em] ${theme.inkSecondary}`}
              >
                {t.sunriseLabel}
              </div>
              <div
                className={`mt-1.5 font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(1.9rem,3.9vh,4.1rem)] ${theme.inkPrimary}`}
              >
                {sunriseTime}
              </div>
            </div>

            {settings.showIshraq && (
              <div className={`border-l ${theme.hairline}`}>
                <div
                  className={`text-[clamp(0.75rem,1.25vh,1.35rem)] font-extrabold uppercase tracking-[0.12em] ${theme.inkSecondary}`}
                >
                  {t.ishraqLabel}
                </div>
                <div
                  className={`mt-1.5 font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(1.9rem,3.9vh,4.1rem)] ${theme.inkPrimary}`}
                >
                  {ishraqTime}
                </div>
              </div>
            )}
          </div>

          {showAuxiliaryMeta && (
            <div
              className={`mt-2.5 pt-2 border-t ${theme.hairline} flex items-center justify-center gap-6 text-[clamp(0.74rem,1.2vh,1.25rem)] ${theme.inkSecondary}`}
            >
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

        {/* Signature Solid Royal Mosque Green Band */}
        <section
          aria-label={`${t.jumaLabel} & ${t.nextAzanLabel}`}
          className={`${theme.greenBandBg} px-[clamp(14px,2.5vw,36px)] py-[clamp(14px,2vh,28px)]`}
        >
          <div className={`grid ${bandCols} items-center gap-x-3 text-center`}>
            {settings.showJuma && (
              <div>
                <div
                  className={`text-[clamp(0.74rem,1.25vh,1.32rem)] font-extrabold uppercase tracking-[0.1em] ${theme.greenBandAccent}`}
                >
                  {t.jumaLabel}
                </div>
                <div className="mt-1.5 font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(1.7rem,3.7vh,3.8rem)] text-white">
                  {jumaTime}
                </div>
                {jumaIqamahTime && jumaIqamahTime !== jumaTime && (
                  <div className="mt-1.5 text-[clamp(0.64rem,0.95vh,1rem)] font-mono-numbers text-white/80">
                    {t.iqamahColumnLabel}: {jumaIqamahTime}
                  </div>
                )}
              </div>
            )}

            <div className={settings.showJuma ? 'border-l border-white/20 pl-2' : ''}>
              <div
                className={`text-[clamp(0.74rem,1.25vh,1.32rem)] font-extrabold uppercase tracking-[0.1em] ${theme.greenBandAccent} truncate`}
              >
                {t.nextAzanLabel}
              </div>
              <div className="text-[clamp(0.66rem,1vh,1.05rem)] font-bold text-white/90 truncate mt-0.5">
                {nextPrayerLabel}
              </div>
              <div className="mt-1 font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(1.7rem,3.7vh,3.8rem)] text-white">
                {timeline.nextAzanCountdown}
              </div>
              <div className="mt-1 text-[clamp(0.64rem,0.95vh,1rem)] font-mono-numbers text-white/80">
                {timeline.nextAzanTime}
                {timeline.isNextAzanTomorrow ? ` · ${t.tomorrowPrefix}` : ''}
              </div>
            </div>

            {settings.showIqamahCountdown && (
              <div
                className={`border-l border-white/20 pl-2 rounded-lg transition-colors ${
                  timeline.isBetweenAzanAndIqamah
                    ? 'bg-[#F3D788]/18 py-1.5 ring-1 ring-[#F3D788]/70'
                    : ''
                }`}
              >
                <div
                  className={`text-[clamp(0.74rem,1.25vh,1.32rem)] font-extrabold uppercase tracking-[0.1em] ${theme.greenBandAccent} truncate`}
                >
                  {timeline.isBetweenAzanAndIqamah ? t.iqamahWaitingLabel : t.iqamahColumnLabel}
                </div>
                <div className="text-[clamp(0.66rem,1vh,1.05rem)] font-bold text-white/90 truncate mt-0.5">
                  {iqamahPrayerLabel}
                </div>
                <div
                  className={`mt-1 font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(1.7rem,3.7vh,3.8rem)] ${
                    timeline.isBetweenAzanAndIqamah ? theme.greenBandAccent : 'text-white'
                  }`}
                >
                  {timeline.iqamahCountdown}
                </div>
                <div className="mt-1 text-[clamp(0.64rem,0.95vh,1rem)] font-mono-numbers text-white/80 truncate">
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
      <section
        aria-label={`${t.nextAzanLabel} & ${t.iqamahLabel}`}
        className="flex-1 min-h-0 flex flex-col justify-between gap-4 pt-[clamp(14px,2vh,26px)]"
      >
        {/* Stacked Primary Countdowns */}
        <div className="space-y-[clamp(12px,1.8vh,22px)]">
          {/* Next Azan Countdown */}
          <div className="rounded-2xl bg-[#093424] border border-[#DFBD69]/28 px-[clamp(16px,1.8vw,28px)] py-[clamp(14px,2vh,26px)]">
            <div className="flex items-baseline justify-between gap-2">
              <span
                className={`text-[clamp(0.76rem,0.98vw,1.25rem)] font-extrabold uppercase tracking-[0.12em] ${theme.goldText} truncate`}
              >
                {t.nextAzanLabel} · {nextPrayerLabel}
              </span>
              <span className="font-mono-numbers font-bold text-[clamp(0.85rem,1.08vw,1.4rem)] text-white/80 shrink-0">
                {timeline.nextAzanTime}
                {timeline.isNextAzanTomorrow ? ` (${t.tomorrowPrefix})` : ''}
              </span>
            </div>
            <div className="mt-2 font-mono-numbers tabular-nums font-extrabold leading-none tracking-[-0.03em] text-[clamp(2.35rem,3.9vw,5.4rem)] text-white">
              {timeline.nextAzanCountdown}
            </div>
          </div>

          {/* Iqamah Countdown */}
          {settings.showIqamahCountdown && (
            <div
              className={`rounded-2xl px-[clamp(16px,1.8vw,28px)] py-[clamp(14px,2vh,26px)] border transition-colors ${
                timeline.isBetweenAzanAndIqamah
                  ? 'bg-[#0E5E38] border-[#FFE498]/75'
                  : 'bg-[#07291C] border-[#DFBD69]/20'
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[clamp(0.76rem,0.98vw,1.25rem)] font-extrabold uppercase tracking-[0.12em] text-white/90 truncate">
                  {timeline.isBetweenAzanAndIqamah
                    ? t.iqamahWaitingLabel
                    : `${t.iqamahLabel} · ${iqamahPrayerLabel}`}
                </span>
                <span className="font-mono-numbers font-bold text-[clamp(0.85rem,1.08vw,1.4rem)] text-white/80 shrink-0">
                  {timeline.iqamahTime}
                </span>
              </div>
              <div
                className={`mt-2 font-mono-numbers tabular-nums font-extrabold leading-none tracking-[-0.03em] text-[clamp(2.1rem,3.45vw,4.8rem)] ${
                  timeline.isBetweenAzanAndIqamah ? 'text-[#FFE498]' : 'text-white'
                }`}
              >
                {timeline.iqamahCountdown}
              </div>
              {timeline.isBetweenAzanAndIqamah && (
                <div className="mt-2 text-[clamp(0.74rem,0.9vw,1.15rem)] font-semibold text-[#FFE498]">
                  {t.iqamahPrepareNotice}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Clean Aligned Sunrise / Ishraq / Juma Footer Metrics */}
        <div className={`pt-[clamp(12px,1.6vh,20px)] border-t ${theme.hairline}`}>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div
                className={`text-[clamp(0.66rem,0.8vw,1.02rem)] font-bold uppercase tracking-[0.1em] ${theme.inkMuted}`}
              >
                {t.sunriseLabel}
              </div>
              <div
                className={`mt-1 font-mono-numbers tabular-nums font-extrabold text-[clamp(1.35rem,2vw,2.8rem)] ${theme.inkPrimary}`}
              >
                {sunriseTime}
              </div>
            </div>

            {settings.showIshraq && (
              <div className={`border-l ${theme.hairline}`}>
                <div
                  className={`text-[clamp(0.66rem,0.8vw,1.02rem)] font-bold uppercase tracking-[0.1em] ${theme.inkMuted}`}
                >
                  {t.ishraqLabel}
                </div>
                <div
                  className={`mt-1 font-mono-numbers tabular-nums font-extrabold text-[clamp(1.35rem,2vw,2.8rem)] ${theme.inkPrimary}`}
                >
                  {ishraqTime}
                </div>
              </div>
            )}

            {settings.showJuma && (
              <div className={`border-l ${theme.hairline}`}>
                <div
                  className={`text-[clamp(0.66rem,0.8vw,1.02rem)] font-bold uppercase tracking-[0.1em] ${theme.goldText}`}
                >
                  {t.jumaLabel}
                </div>
                <div
                  className={`mt-1 font-mono-numbers tabular-nums font-extrabold text-[clamp(1.35rem,2vw,2.8rem)] ${theme.goldText}`}
                >
                  {jumaTime}
                </div>
              </div>
            )}
          </div>

          {showAuxiliaryMeta && (
            <div
              className={`mt-2.5 pt-2 border-t ${theme.hairline} flex items-center justify-center gap-6 text-[clamp(0.72rem,0.85vw,1.08rem)] ${theme.inkSecondary}`}
            >
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
        aria-label={`${t.sunriseLabel}, ${t.ishraqLabel}, ${t.jumaLabel}`}
        className="shrink-0 px-[clamp(20px,3vw,56px)] pb-[clamp(12px,1.6vh,24px)]"
      >
        <div
          className={`grid grid-cols-2 lg:grid-cols-5 items-center border ${theme.hairline} divide-x ${theme.hairline} bg-[#F5F4EF]`}
        >
          {/* Sunrise */}
          <div className="px-[clamp(14px,1.5vw,26px)] py-[clamp(12px,1.5vh,22px)]">
            <div
              className={`text-[clamp(0.68rem,0.85vw,1.08rem)] font-bold uppercase tracking-[0.12em] ${theme.inkMuted}`}
            >
              {t.sunriseLabel}
            </div>
            <div
              className={`mt-1.5 font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(1.6rem,2.45vw,3.5rem)] ${theme.inkPrimary}`}
            >
              {sunriseTime}
            </div>
          </div>

          {/* Ishraq */}
          {settings.showIshraq && (
            <div className="px-[clamp(14px,1.5vw,26px)] py-[clamp(12px,1.5vh,22px)]">
              <div
                className={`text-[clamp(0.68rem,0.85vw,1.08rem)] font-bold uppercase tracking-[0.12em] ${theme.inkMuted}`}
              >
                {t.ishraqLabel}
              </div>
              <div
                className={`mt-1.5 font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(1.6rem,2.45vw,3.5rem)] ${theme.inkPrimary}`}
              >
                {ishraqTime}
              </div>
            </div>
          )}

          {/* Juma */}
          {settings.showJuma && (
            <div className="px-[clamp(14px,1.5vw,26px)] py-[clamp(12px,1.5vh,22px)]">
              <div
                className={`text-[clamp(0.68rem,0.85vw,1.08rem)] font-bold uppercase tracking-[0.12em] ${theme.goldText}`}
              >
                {t.jumaLabel}
              </div>
              <div
                className={`mt-1.5 font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(1.6rem,2.45vw,3.5rem)] ${theme.inkPrimary}`}
              >
                {jumaTime}
              </div>
            </div>
          )}

          {/* Next Azan Countdown */}
          <div className="px-[clamp(14px,1.5vw,26px)] py-[clamp(12px,1.5vh,22px)] bg-[#0B4C2E] text-white">
            <div className="text-[clamp(0.68rem,0.85vw,1.08rem)] font-bold uppercase tracking-[0.12em] text-white/85 truncate">
              {t.nextAzanLabel} · {nextPrayerLabel}
            </div>
            <div className="mt-1.5 font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(1.6rem,2.45vw,3.5rem)] text-white">
              {timeline.nextAzanCountdown}
            </div>
          </div>

          {/* Iqamah Countdown */}
          {settings.showIqamahCountdown && (
            <div
              className={`px-[clamp(14px,1.5vw,26px)] py-[clamp(12px,1.5vh,22px)] ${
                timeline.isBetweenAzanAndIqamah
                  ? 'bg-[#0E5E38] text-[#F3D88E]'
                  : 'bg-[#0A3D25] text-white'
              }`}
            >
              <div className="text-[clamp(0.68rem,0.85vw,1.08rem)] font-bold uppercase tracking-[0.12em] text-white/85 truncate">
                {timeline.isBetweenAzanAndIqamah
                  ? t.iqamahWaitingLabel
                  : `${t.iqamahColumnLabel} · ${iqamahPrayerLabel}`}
              </div>
              <div className="mt-1.5 font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(1.6rem,2.45vw,3.5rem)]">
                {timeline.iqamahCountdown}
              </div>
            </div>
          )}
        </div>

        {showAuxiliaryMeta && (
          <div
            className={`mt-2 flex items-center justify-end gap-6 text-[clamp(0.72rem,0.85vw,1.08rem)] ${theme.inkMuted}`}
          >
            {settings.showTahajjud && tahajjudTime && (
              <span>
                {t.tahajjudLabel}:{' '}
                <strong className={`font-mono-numbers ${theme.inkPrimary}`}>{tahajjudTime}</strong>
              </span>
            )}
            {settings.showSubh && subhTime && (
              <span>
                {t.subhLabel}:{' '}
                <strong className={`font-mono-numbers ${theme.inkPrimary}`}>{subhTime}</strong>
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
      aria-label={`${t.sunriseLabel}, ${t.jumaLabel} & ${t.nextAzanLabel}`}
      className="shrink-0 px-[clamp(20px,3vw,56px)] pb-[clamp(12px,1.6vh,22px)]"
    >
      <div className="grid grid-cols-12 gap-[clamp(12px,1.5vw,24px)] items-stretch">
        {/* Left 4 columns: Clean Sunrise & Ishraq (+ optional Tahajjud/Subh) */}
        <div
          className={`col-span-12 lg:col-span-4 rounded-2xl border ${theme.hairline} ${theme.secondarySurfaceBg} px-[clamp(14px,1.6vw,26px)] py-[clamp(12px,1.6vh,22px)] flex flex-col justify-center`}
        >
          <div
            className={`grid ${settings.showIshraq ? 'grid-cols-2' : 'grid-cols-1'} gap-4 items-center text-center`}
          >
            <div>
              <div
                className={`text-[clamp(0.72rem,0.9vw,1.15rem)] font-extrabold uppercase tracking-[0.1em] ${theme.inkSecondary}`}
              >
                {t.sunriseLabel}
              </div>
              <div
                className={`mt-1.5 font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(1.75rem,2.65vw,3.7rem)] ${theme.inkPrimary}`}
              >
                {sunriseTime}
              </div>
            </div>

            {settings.showIshraq && (
              <div className={`border-l ${theme.hairline} pl-3`}>
                <div
                  className={`text-[clamp(0.72rem,0.9vw,1.15rem)] font-extrabold uppercase tracking-[0.1em] ${theme.inkSecondary}`}
                >
                  {t.ishraqLabel}
                </div>
                <div
                  className={`mt-1.5 font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(1.75rem,2.65vw,3.7rem)] ${theme.inkPrimary}`}
                >
                  {ishraqTime}
                </div>
              </div>
            )}
          </div>

          {showAuxiliaryMeta && (
            <div
              className={`mt-2.5 pt-2 border-t ${theme.hairline} flex items-center justify-center gap-5 text-[clamp(0.7rem,0.85vw,1.08rem)] ${theme.inkSecondary}`}
            >
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
          className={`col-span-12 lg:col-span-8 rounded-2xl ${theme.greenBandBg} px-[clamp(16px,2vw,34px)] py-[clamp(14px,1.8vh,24px)] flex items-center`}
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
                <div
                  className={`text-[clamp(0.72rem,0.92vw,1.18rem)] font-extrabold uppercase tracking-[0.1em] ${theme.greenBandAccent}`}
                >
                  {t.jumaLabel}
                </div>
                <div className="mt-1.5 font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(1.8rem,2.85vw,4rem)] text-white">
                  {jumaTime}
                </div>
                {jumaIqamahTime && jumaIqamahTime !== jumaTime && (
                  <div className="mt-1.5 text-[clamp(0.66rem,0.82vw,1.04rem)] font-mono-numbers text-white/80">
                    {t.iqamahColumnLabel}: {jumaIqamahTime}
                  </div>
                )}
              </div>
            )}

            <div className={settings.showJuma ? 'border-l border-white/20 pl-3' : ''}>
              <div
                className={`text-[clamp(0.72rem,0.92vw,1.18rem)] font-extrabold uppercase tracking-[0.1em] ${theme.greenBandAccent} truncate`}
              >
                {t.nextAzanLabel} · {nextPrayerLabel}
              </div>
              <div className="mt-1.5 font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(1.8rem,2.85vw,4rem)] text-white">
                {timeline.nextAzanCountdown}
              </div>
              <div className="mt-1.5 text-[clamp(0.66rem,0.82vw,1.04rem)] font-mono-numbers text-white/80">
                {t.azanColumnLabel}: {timeline.nextAzanTime}
                {timeline.isNextAzanTomorrow ? ` (${t.tomorrowPrefix})` : ''}
              </div>
            </div>

            {settings.showIqamahCountdown && (
              <div
                className={`border-l border-white/20 pl-3 rounded-xl transition-colors ${
                  timeline.isBetweenAzanAndIqamah
                    ? 'bg-[#F3D788]/18 py-1.5 px-2 ring-1 ring-[#F3D788]/70'
                    : ''
                }`}
              >
                <div
                  className={`text-[clamp(0.72rem,0.92vw,1.18rem)] font-extrabold uppercase tracking-[0.1em] ${theme.greenBandAccent} truncate`}
                >
                  {timeline.isBetweenAzanAndIqamah
                    ? t.iqamahWaitingLabel
                    : `${t.iqamahColumnLabel} · ${iqamahPrayerLabel}`}
                </div>
                <div
                  className={`mt-1.5 font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(1.8rem,2.85vw,4rem)] ${
                    timeline.isBetweenAzanAndIqamah ? theme.greenBandAccent : 'text-white'
                  }`}
                >
                  {timeline.iqamahCountdown}
                </div>
                <div className="mt-1.5 text-[clamp(0.66rem,0.82vw,1.04rem)] font-mono-numbers text-white/80 truncate">
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
