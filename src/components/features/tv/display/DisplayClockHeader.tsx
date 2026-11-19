import React from 'react';
import { CanonicalDisplayProfileId, TashkentClockParts } from '../../../../utils/smartMosqueDisplayEngine';
import { SmartDisplayLocaleBundle } from '../../../../utils/smartMosqueDisplayI18n';
import { DisplayProfileTheme } from './displayProfiles';

interface DisplayClockHeaderProps {
  profileId: CanonicalDisplayProfileId;
  theme: DisplayProfileTheme;
  clock: TashkentClockParts;
  showSeconds: boolean;
  showHijriDate: boolean;
  mosqueTitle: string;
  locationLabel: string;
  gregorianMonth: string;
  gregorianYear: string;
  localizedWeekday: string;
  arabicWeekday: string;
  hijriRaw: string;
  hijriParts: { day: string; month: string; year: string };
  t: SmartDisplayLocaleBundle;
}

/** Crisp octagonal day medallion used exclusively in Madina Portrait to mirror Masjid an-Nabawi pillar screens */
const PillarDayOctagon: React.FC<{
  value: string;
  stroke: string;
  fill: string;
  textColor: string;
}> = ({ value, stroke, fill, textColor }) => {
  if (!value) return null;
  return (
    <div className="relative inline-flex items-center justify-center shrink-0 w-[clamp(48px,6.4vh,92px)] h-[clamp(48px,6.4vh,92px)]">
      <svg viewBox="0 0 100 100" aria-hidden="true" className="absolute inset-0 w-full h-full">
        <polygon
          points="30,4 70,4 96,30 96,70 70,96 30,96 4,70 4,30"
          fill={fill}
          stroke={stroke}
          strokeWidth="2.5"
        />
      </svg>
      <span
        className="relative z-10 font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(1.25rem,2.6vh,2.45rem)]"
        style={{ color: textColor }}
      >
        {value}
      </span>
    </div>
  );
};

export const DisplayClockHeader: React.FC<DisplayClockHeaderProps> = ({
  profileId,
  theme,
  clock,
  showSeconds,
  showHijriDate,
  mosqueTitle,
  locationLabel,
  gregorianMonth,
  gregorianYear,
  localizedWeekday,
  arabicWeekday,
  hijriRaw,
  hijriParts,
  t,
}) => {
  const gregorianDay = String(clock.day).padStart(2, '0');
  const clockMain = `${clock.hh}:${clock.mm}`;

  // =========================================================================
  // 1. MADINA PORTRAIT (9:16 Vertical Pillar — Masjid an-Nabawi Layout)
  // =========================================================================
  if (profileId === 'madina_portrait') {
    return (
      <header className={`shrink-0 border-b ${theme.hairline} px-[clamp(18px,3.2vw,42px)] pt-[clamp(12px,1.8vh,26px)] pb-[clamp(10px,1.5vh,22px)]`}>
        {/* Quiet top mosque brand bar */}
        <div className="flex items-center justify-between gap-3 mb-[clamp(8px,1.2vh,18px)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/assets/aistudio/IMG_20261114_084331_924_8f6ccba1.jpg"
              alt="ASAKA ZIYO"
              className="w-[clamp(28px,3vh,46px)] h-[clamp(28px,3vh,46px)] rounded-full object-cover border border-[#B38A3B]/60 shrink-0"
            />
            <div className="min-w-0">
              <span className={`font-display font-extrabold tracking-[0.14em] uppercase text-[clamp(0.7rem,1.05vh,1.15rem)] ${theme.goldText}`}>
                {t.brandTitle}
              </span>
              <span className={`mx-2 opacity-35 ${theme.inkMuted}`}>·</span>
              <span className={`font-semibold text-[clamp(0.72rem,1.15vh,1.2rem)] truncate ${theme.inkSecondary}`}>
                {mosqueTitle}
              </span>
            </div>
          </div>
          {clock.isFriday && (
            <span className="shrink-0 px-2.5 py-0.5 rounded bg-[#0E5A35] text-[#F3D788] text-[clamp(0.65rem,0.95vh,1rem)] font-bold uppercase tracking-wider">
              {t.fridayTag}
            </span>
          )}
        </div>

        {/* Centerpiece Clock flanked by Twin Day Octagons */}
        <div className="flex items-center justify-center gap-[clamp(14px,2.8vw,38px)]">
          <PillarDayOctagon
            value={gregorianDay}
            stroke={theme.medallionStroke}
            fill={theme.medallionFill}
            textColor={theme.medallionText}
          />
          <div className={`font-mono-numbers tabular-nums font-extrabold tracking-[-0.03em] leading-none text-[clamp(2.9rem,7.2vh,7.4rem)] ${theme.inkPrimary}`}>
            {clockMain}
            {showSeconds && (
              <span className="opacity-75">:{clock.ss}</span>
            )}
          </div>
          {showHijriDate && (
            <PillarDayOctagon
              value={hijriParts.day || '--'}
              stroke={theme.medallionStroke}
              fill={theme.medallionFill}
              textColor={theme.medallionText}
            />
          )}
        </div>

        {/* Clean 3-Column Calendar Strip */}
        <div className="grid grid-cols-3 items-center gap-2 mt-[clamp(10px,1.4vh,20px)]">
          <div className="text-left">
            <div className={`font-display font-bold leading-tight text-[clamp(0.95rem,1.7vh,1.9rem)] ${theme.inkPrimary}`}>
              {gregorianMonth}
            </div>
            <div className={`font-mono-numbers font-bold leading-tight text-[clamp(0.9rem,1.55vh,1.7rem)] ${theme.inkSecondary}`}>
              {gregorianYear}
            </div>
          </div>

          <div className="text-center">
            <div
              dir="rtl"
              className={`font-arabic-signage font-bold text-[clamp(1.3rem,2.45vh,2.6rem)] ${theme.inkPrimary}`}
            >
              {arabicWeekday}
            </div>
            <div className={`font-semibold text-[clamp(0.82rem,1.4vh,1.5rem)] ${theme.inkSecondary}`}>
              {localizedWeekday}
            </div>
          </div>

          <div className="text-right">
            {showHijriDate ? (
              <>
                <div className={`font-display font-bold leading-tight text-[clamp(0.9rem,1.6vh,1.8rem)] ${theme.inkPrimary} truncate`}>
                  {hijriParts.month || hijriRaw}
                </div>
                {hijriParts.year && (
                  <div className={`font-mono-numbers font-bold leading-tight text-[clamp(0.9rem,1.55vh,1.7rem)] ${theme.inkSecondary}`}>
                    {hijriParts.year}
                  </div>
                )}
              </>
            ) : (
              <div className={`text-[clamp(0.75rem,1.2vh,1.3rem)] font-medium ${theme.inkMuted} truncate`}>
                {locationLabel}
              </div>
            )}
          </div>
        </div>
      </header>
    );
  }

  // =========================================================================
  // 2. EMERALD ROYAL (Left Sanctuary Column Stack — 38% width pane)
  // =========================================================================
  if (profileId === 'emerald_royal') {
    return (
      <header className={`shrink-0 pb-[clamp(14px,2vh,26px)] border-b ${theme.hairline}`}>
        {/* Brand & Mosque Identity */}
        <div className="flex items-center gap-3.5">
          <img
            src="/assets/aistudio/IMG_20261114_084331_924_8f6ccba1.jpg"
            alt="ASAKA ZIYO"
            className="w-[clamp(42px,3.6vw,68px)] h-[clamp(42px,3.6vw,68px)] rounded-full object-cover border border-[#DFBD69]/55 shrink-0"
          />
          <div className="min-w-0">
            <div className={`font-display font-extrabold tracking-[0.16em] uppercase text-[clamp(0.75rem,0.95vw,1.25rem)] ${theme.goldText}`}>
              {t.brandTitle}
            </div>
            <h1 className={`font-display font-bold leading-tight truncate text-[clamp(1rem,1.35vw,1.85rem)] ${theme.inkPrimary}`}>
              {mosqueTitle}
            </h1>
            <p className={`text-[clamp(0.72rem,0.88vw,1.1rem)] truncate ${theme.inkMuted}`}>
              {locationLabel}
            </p>
          </div>
        </div>

        {/* Monumental Live Clock */}
        <div className="mt-[clamp(14px,2.4vh,30px)]">
          <div className={`font-mono-numbers tabular-nums font-extrabold tracking-[-0.03em] leading-none text-[clamp(3.1rem,5.4vw,7.6rem)] ${theme.inkPrimary}`}>
            {clockMain}
            {showSeconds && (
              <span className={`text-[0.58em] font-bold ml-1 ${theme.goldText}`}>:{clock.ss}</span>
            )}
          </div>
        </div>

        {/* Clean Structured Calendar Row */}
        <div className="mt-[clamp(12px,1.8vh,22px)] grid grid-cols-2 gap-4 items-end">
          <div>
            <div className="flex items-baseline gap-2.5">
              <span dir="rtl" className={`font-arabic-signage font-bold text-[clamp(1.25rem,1.7vw,2.3rem)] ${theme.goldText}`}>
                {arabicWeekday}
              </span>
              <span className={`font-semibold text-[clamp(0.85rem,1.05vw,1.4rem)] ${theme.inkSecondary}`}>
                {localizedWeekday}
              </span>
            </div>
            <div className={`mt-1 font-mono-numbers font-bold text-[clamp(0.95rem,1.2vw,1.65rem)] ${theme.inkPrimary}`}>
              {gregorianDay} {gregorianMonth} {gregorianYear}
            </div>
          </div>

          {showHijriDate && hijriRaw && (
            <div className={`text-right pl-3 border-l ${theme.hairline}`}>
              <div className={`text-[clamp(0.68rem,0.8vw,1rem)] font-bold uppercase tracking-[0.12em] ${theme.inkMuted}`}>
                {t.hijriyLabel}
              </div>
              <div className={`mt-0.5 font-display font-bold text-[clamp(0.92rem,1.15vw,1.55rem)] ${theme.goldText} truncate`}>
                {hijriRaw}
              </div>
            </div>
          )}
        </div>
      </header>
    );
  }

  // =========================================================================
  // 3. ROYAL IVORY & MODERN MINIMAL (Clean Horizontal 16:9 Architectural Bar)
  // =========================================================================
  const isMinimal = profileId === 'modern_minimal';

  return (
    <header
      className={`shrink-0 border-b ${isMinimal ? theme.hairline : theme.accentHairline} px-[clamp(20px,3vw,56px)] py-[clamp(12px,1.8vh,28px)] flex items-center justify-between gap-6`}
    >
      {/* Left: ASAKA ZIYO Crest & Mosque Name */}
      <div className="flex items-center gap-4 min-w-0 max-w-[34%]">
        <img
          src="/assets/aistudio/IMG_20261114_084331_924_8f6ccba1.jpg"
          alt="ASAKA ZIYO"
          className={`w-[clamp(44px,3.8vw,74px)] h-[clamp(44px,3.8vw,74px)] rounded-full object-cover shrink-0 ${
            isMinimal ? 'border border-[#0A1D16]/20' : 'border-2 border-[#B08533]/65'
          }`}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-display font-extrabold tracking-[0.16em] uppercase text-[clamp(0.75rem,0.95vw,1.3rem)] ${theme.goldText}`}>
              {t.brandTitle}
            </span>
            {clock.isFriday && (
              <span className="px-2 py-0.5 rounded bg-[#0D5A35] text-[#F3D788] text-[clamp(0.62rem,0.75vw,0.95rem)] font-bold uppercase tracking-wider">
                {t.fridayTag}
              </span>
            )}
          </div>
          <h1 className={`font-display font-extrabold leading-tight truncate text-[clamp(1.05rem,1.5vw,2.2rem)] ${theme.inkPrimary}`}>
            {mosqueTitle}
          </h1>
          <p className={`text-[clamp(0.72rem,0.88vw,1.15rem)] truncate ${theme.inkMuted}`}>
            {locationLabel}
          </p>
        </div>
      </div>

      {/* Center: Clean Milodiy · Arabic/Local Weekday · Hijriy Calendar */}
      <div className="hidden md:flex items-center gap-[clamp(18px,2.4vw,44px)] shrink-0">
        <div className="text-right">
          <div className={`text-[clamp(0.64rem,0.76vw,0.95rem)] font-bold uppercase tracking-[0.12em] ${theme.inkMuted}`}>
            {t.milodiyLabel}
          </div>
          <div className={`font-display font-bold leading-tight text-[clamp(1rem,1.35vw,1.95rem)] ${theme.inkPrimary}`}>
            {gregorianDay} {gregorianMonth} {gregorianYear}
          </div>
        </div>

        <div className={`px-[clamp(14px,1.8vw,30px)] border-x ${theme.hairline} text-center`}>
          <div dir="rtl" className={`font-arabic-signage font-bold text-[clamp(1.35rem,1.9vw,2.75rem)] ${theme.inkPrimary}`}>
            {arabicWeekday}
          </div>
          <div className={`font-semibold text-[clamp(0.78rem,0.98vw,1.3rem)] ${theme.inkSecondary}`}>
            {localizedWeekday}
          </div>
        </div>

        {showHijriDate && hijriRaw && (
          <div className="text-left">
            <div className={`text-[clamp(0.64rem,0.76vw,0.95rem)] font-bold uppercase tracking-[0.12em] ${theme.inkMuted}`}>
              {t.hijriyLabel}
            </div>
            <div className={`font-display font-bold leading-tight text-[clamp(1rem,1.35vw,1.95rem)] ${theme.goldText}`}>
              {hijriRaw}
            </div>
          </div>
        )}
      </div>

      {/* Right: Crisp Monumental Live Digital Clock */}
      <div className="shrink-0 text-right">
        <div
          className={`font-mono-numbers tabular-nums font-extrabold tracking-[-0.03em] leading-none text-[clamp(2.5rem,4.6vw,6.8rem)] ${theme.inkPrimary}`}
        >
          {clockMain}
          {showSeconds && (
            <span className={`text-[0.56em] font-bold ml-1 ${theme.goldText}`}>:{clock.ss}</span>
          )}
        </div>
      </div>
    </header>
  );
};
