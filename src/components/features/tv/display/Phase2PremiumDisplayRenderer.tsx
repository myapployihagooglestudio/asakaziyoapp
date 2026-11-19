import React from 'react';
import { SupportedLocale } from '../../../../types';
import {
  ScheduleValidationResult,
  SmartDisplaySettings,
  SmartDisplayTimeline,
  formatTimeForClockFormat,
} from '../../../../utils/smartMosqueDisplayEngine';
import { SmartDisplayLocaleBundle } from '../../../../utils/smartMosqueDisplayI18n';
import { DisplayResponsiveLayout } from '../../../../utils/smartMosqueResponsiveEngine';
import { DisplayAnnouncementBar } from './DisplayAnnouncementBar';
import { DisplayPrayerRowItem, DisplayProfileTheme } from './displayProfiles';

export type Phase2GalleryProfileId =
  | 'sultan_royal'
  | 'noor_classic'
  | 'midnight_premium'
  | 'vision_modern'
  | 'islamic_heritage';

export interface Phase2PremiumDisplayProps {
  profileId: Phase2GalleryProfileId;
  theme: DisplayProfileTheme;
  layout: DisplayResponsiveLayout;
  settings: SmartDisplaySettings;
  timeline: SmartDisplayTimeline;
  prayers: DisplayPrayerRowItem[];
  sunriseTime: string;
  ishraqTime: string;
  jumaTime: string;
  jumaIqamahTime: string;
  tahajjudTime: string;
  subhTime: string;
  mosqueTitle: string;
  locationLabel: string;
  gregorianMonth: string;
  gregorianYear: string;
  localizedWeekday: string;
  hijriLocalized: string;
  nextPrayerLabel: string;
  iqamahPrayerLabel: string;
  announcementKey: string;
  announcementTitle: string;
  announcementBody: string;
  announcementMediaUrl?: string;
  totalAnnouncements: number;
  activeAnnouncementIndex: number;
  isOnline: boolean;
  scheduleValidation: ScheduleValidationResult;
  activeLocale: SupportedLocale;
  t: SmartDisplayLocaleBundle;
}

/** Restrained architectural 8-point corner ornament used in Sultan Royal and Islamic Heritage */
const GeometricCornerOrnament: React.FC<{ color: string; className?: string }> = ({
  color,
  className = '',
}) => (
  <svg
    viewBox="0 0 64 64"
    aria-hidden="true"
    className={`pointer-events-none select-none ${className}`}
  >
    <path
      d="M4 4 H60 M4 4 V60 M12 12 H44 M12 12 V44"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      opacity="0.55"
    />
    <polygon
      points="12,12 22,12 22,22 12,22"
      fill="none"
      stroke={color}
      strokeWidth="1.2"
      opacity="0.7"
    />
    <polygon
      points="17,8 26,17 17,26 8,17"
      fill="none"
      stroke={color}
      strokeWidth="1.1"
      opacity="0.5"
    />
  </svg>
);

/**
 * Renders the 5 independent Phase 2 Premium Design Systems:
 * 1. sultan_royal     — Deep royal emerald + gold geometry + sovereign architectural presence
 * 2. noor_classic     — Warm ivory + white marble elegance + champagne gold hairlines
 * 3. midnight_premium — Deep navy + dark emerald calm night mode + crisp silver/white contrast
 * 4. vision_modern    — Pure architectural alabaster + bold geometric timetable focus
 * 5. islamic_heritage — Deep emerald outer sanctuary frame + warm ivory inner panel + gold motifs
 *
 * Strictly 5 official ASAKA ZIYO languages (ZERO Arabic script anywhere).
 * Automatically adapts to mobile portrait, mobile landscape, tablet, 4:3, 16:9, 21:9, portrait TV, and 4K/8K.
 */
export const Phase2PremiumDisplayRenderer: React.FC<Phase2PremiumDisplayProps> = ({
  profileId,
  theme,
  layout,
  settings,
  timeline,
  prayers,
  sunriseTime,
  ishraqTime,
  jumaTime,
  mosqueTitle,
  locationLabel,
  gregorianMonth,
  gregorianYear,
  localizedWeekday,
  hijriLocalized,
  nextPrayerLabel,
  iqamahPrayerLabel,
  announcementKey,
  announcementTitle,
  announcementBody,
  announcementMediaUrl,
  totalAnnouncements,
  activeAnnouncementIndex,
  isOnline,
  scheduleValidation,
  activeLocale,
  t,
}) => {
  const clockFmt = settings.clockFormat === '12h' ? '12h' : '24h';
  const gregorianDay = String(timeline.clock.day).padStart(2, '0');
  const rawClockMain = `${timeline.clock.hh}:${timeline.clock.mm}`;
  const formattedClockMain = formatTimeForClockFormat(rawClockMain, clockFmt);
  const hasHijri = settings.showHijriDate && Boolean(hijriLocalized);

  const isPortrait = layout.isPortrait;
  const isMobilePortrait = layout.deviceTier === 'mobile_portrait';
  const isMobileLandscape = layout.deviceTier === 'mobile_landscape';
  const isHeritage = profileId === 'islamic_heritage';
  const isSultan = profileId === 'sultan_royal';
  const isNoor = profileId === 'noor_classic';
  const isMidnight = profileId === 'midnight_premium';
  const isVision = profileId === 'vision_modern';

  const outerStyle: React.CSSProperties = layout.contentMaxWidthPx
    ? { maxWidth: `${layout.contentMaxWidthPx}px` }
    : {};

  // Surface styling tailored distinctly to each of the 5 design profiles
  const canvasBackdropStyle: React.CSSProperties = isNoor
    ? {
        background:
          'linear-gradient(145deg, #FDFCFA 0%, #F6F2E9 48%, #FAF8F2 100%)',
      }
    : isMidnight
      ? {
          background:
            'radial-gradient(ellipse 85% 75% at 18% 12%, rgba(12, 58, 56, 0.42) 0%, rgba(7, 17, 36, 0.96) 62%, #050C1B 100%)',
        }
      : isSultan
        ? {
            background:
              'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(14, 78, 50, 0.45) 0%, #041D14 58%, #02120C 100%)',
          }
        : {};

  const announcementBar = (
    <DisplayAnnouncementBar
      theme={theme}
      showAnnouncements={settings.showAnnouncements}
      announcementKey={announcementKey}
      title={announcementTitle}
      body={announcementBody}
      mediaUrl={announcementMediaUrl}
      totalAnnouncements={totalAnnouncements}
      activeIndex={activeAnnouncementIndex}
      isOnline={isOnline}
      scheduleValidation={scheduleValidation}
      activeLocale={activeLocale}
      t={t}
    />
  );

  // =========================================================================
  // COMPACT SMARTPHONE PORTRAIT COMPOSITION (320x568 .. 430x932)
  // Dedicated vertical layout — never squeezes desktop columns onto narrow phones!
  // =========================================================================
  if (isMobilePortrait) {
    return (
      <div
        className={`relative w-full h-full flex flex-col ${theme.pageBg} ${theme.inkPrimary} ${
          layout.allowVerticalScrollFallback ? 'overflow-y-auto' : 'overflow-hidden'
        }`}
      >
        <div
          style={canvasBackdropStyle}
          className={`relative flex-1 flex flex-col min-h-0 ${
            isHeritage ? 'm-2 rounded-xl border border-[#C2953B]/55 overflow-hidden ' + theme.surfaceBg : theme.surfaceBg
          }`}
        >
          {/* Compact Mobile Header: Brand + Live Clock + Dates */}
          <header className={`shrink-0 px-4 pt-3 pb-2.5 border-b ${theme.accentHairline}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className={`font-display font-extrabold tracking-[0.14em] uppercase text-[11px] ${theme.goldText}`}>
                  {t.brandTitle}
                </span>
                <h1 className="font-display font-bold text-xs truncate opacity-90">{mosqueTitle}</h1>
              </div>
              {timeline.clock.isFriday && (
                <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${theme.greenBandBg}`}>
                  {t.fridayTag}
                </span>
              )}
            </div>

            <div className="mt-2 flex items-baseline justify-between gap-2">
              <div className="font-mono-numbers tabular-nums font-extrabold tracking-[-0.03em] leading-none text-[clamp(2.2rem,11vw,3.1rem)]">
                {formattedClockMain}
                {settings.showSeconds && (
                  <span className={`text-[0.55em] font-bold ml-0.5 ${theme.goldText}`}>
                    :{timeline.clock.ss}
                  </span>
                )}
              </div>
              <div className="text-right min-w-0">
                <div className="font-display font-extrabold text-sm leading-tight truncate">
                  {localizedWeekday}
                </div>
                <div className={`text-[11px] font-medium truncate ${theme.inkSecondary}`}>
                  {gregorianDay} {gregorianMonth} {gregorianYear}
                </div>
                {hasHijri && (
                  <div className={`text-[11px] font-semibold truncate ${theme.goldText}`}>
                    {hijriLocalized}
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Primary Countdown Strip */}
          <div className={`shrink-0 px-4 py-2.5 ${theme.greenBandBg}`}>
            <div className="grid grid-cols-2 gap-2 items-center">
              <div className="min-w-0">
                <div className={`text-[10px] font-bold uppercase tracking-wider truncate ${theme.greenBandAccent}`}>
                  {t.nextAzanLabel} · {nextPrayerLabel}
                </div>
                <div className="font-mono-numbers tabular-nums font-extrabold text-2xl leading-tight text-white">
                  {timeline.nextAzanCountdown}
                </div>
              </div>
              {settings.showIqamahCountdown && (
                <div className="text-right border-l border-white/20 pl-2 min-w-0">
                  <div className={`text-[10px] font-bold uppercase tracking-wider truncate ${theme.greenBandAccent}`}>
                    {timeline.isBetweenAzanAndIqamah ? t.iqamahWaitingLabel : t.iqamahColumnLabel}
                  </div>
                  <div className="font-mono-numbers tabular-nums font-extrabold text-2xl leading-tight text-white">
                    {timeline.iqamahCountdown}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 5 Readable Prayer Rows */}
          <main className="flex-1 min-h-0 flex flex-col px-3 py-2">
            <div className={`grid grid-cols-[1.25fr_1fr_0.9fr] px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider border-b ${theme.hairline} ${theme.inkMuted}`}>
              <span>{t.prayerColumnLabel}</span>
              <span className="text-center">{t.azanColumnLabel}</span>
              <span className="text-right">{t.iqamahColumnLabel}</span>
            </div>
            <div className={`flex-1 min-h-0 flex flex-col justify-between divide-y ${theme.hairline}`}>
              {prayers.map((prayer) => {
                const isActive = prayer.isCurrent;
                const isNext = prayer.isNext && !isActive;
                return (
                  <div
                    key={prayer.key}
                    className={`flex-1 min-h-0 grid grid-cols-[1.25fr_1fr_0.9fr] items-center px-2.5 rounded-lg my-[1px] ${
                      isActive ? theme.activeRowClass : isNext ? theme.nextRowClass : ''
                    }`}
                  >
                    <div className="min-w-0 pr-1">
                      <div className="font-display font-extrabold uppercase text-[clamp(0.92rem,4.1vw,1.15rem)] truncate">
                        {prayer.label}
                      </div>
                    </div>
                    <div className="text-center font-mono-numbers tabular-nums font-extrabold text-[clamp(1.2rem,5.4vw,1.65rem)]">
                      {formatTimeForClockFormat(prayer.azanTime, clockFmt)}
                    </div>
                    <div
                      className={`text-right font-mono-numbers tabular-nums font-bold text-[clamp(0.95rem,4.2vw,1.25rem)] ${
                        isActive ? theme.activeAccentText : theme.inkSecondary
                      }`}
                    >
                      {prayer.iqamahTime ? formatTimeForClockFormat(prayer.iqamahTime, clockFmt) : '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          </main>

          {/* Compact Sunrise / Ishraq / Juma Footer Bar */}
          <div className={`shrink-0 grid grid-cols-3 gap-1 px-3 py-2 border-t ${theme.hairline} ${theme.secondarySurfaceBg} text-center`}>
            <div>
              <div className={`text-[9px] font-bold uppercase truncate ${theme.inkMuted}`}>{t.sunriseLabel}</div>
              <div className="font-mono-numbers tabular-nums font-extrabold text-sm">
                {formatTimeForClockFormat(sunriseTime, clockFmt)}
              </div>
            </div>
            <div className={`border-x ${theme.hairline}`}>
              <div className={`text-[9px] font-bold uppercase truncate ${theme.inkMuted}`}>{t.ishraqLabel}</div>
              <div className="font-mono-numbers tabular-nums font-extrabold text-sm">
                {formatTimeForClockFormat(ishraqTime, clockFmt)}
              </div>
            </div>
            <div>
              <div className={`text-[9px] font-bold uppercase truncate ${theme.goldText}`}>{t.jumaLabel}</div>
              <div className={`font-mono-numbers tabular-nums font-extrabold text-sm ${theme.goldText}`}>
                {formatTimeForClockFormat(jumaTime, clockFmt)}
              </div>
            </div>
          </div>

          {announcementBar}
        </div>
      </div>
    );
  }

  // =========================================================================
  // PORTRAIT MONITOR / TABLET VERTICAL COMPOSITION (768x1024, 1080x1920, 2160x3840)
  // =========================================================================
  if (isPortrait) {
    return (
      <div className={`relative w-full h-full flex flex-col overflow-hidden ${theme.pageBg} ${theme.inkPrimary}`}>
        <div
          style={canvasBackdropStyle}
          className={`relative flex-1 min-h-0 flex flex-col overflow-hidden ${
            isHeritage
              ? 'm-[clamp(10px,1.5vh,28px)] rounded-2xl border-2 border-[#C2953B]/60 shadow-2xl ' + theme.surfaceBg
              : theme.surfaceBg
          }`}
        >
          {(isSultan || isHeritage) && (
            <>
              <GeometricCornerOrnament color={theme.goldHex} className="absolute top-3 left-3 w-12 h-12 z-10" />
              <GeometricCornerOrnament color={theme.goldHex} className="absolute top-3 right-3 w-12 h-12 rotate-90 z-10" />
            </>
          )}

          {/* Header: Brand + Giant Centered Clock + Localized Calendar */}
          <header className={`relative z-10 shrink-0 px-[clamp(22px,4vw,56px)] pt-[clamp(18px,2.8vh,46px)] pb-[clamp(14px,2vh,32px)] border-b ${theme.accentHairline} text-center`}>
            <div className="flex items-center justify-center gap-3">
              <img
                src="/assets/aistudio/IMG_20261114_084331_924_8f6ccba1.jpg"
                alt="ASAKA ZIYO"
                className="w-[clamp(32px,3.2vh,54px)] h-[clamp(32px,3.2vh,54px)] rounded-full object-cover border border-[#DFBD69]/60"
              />
              <span className={`font-display font-extrabold tracking-[0.18em] uppercase text-[clamp(0.85rem,1.35vh,1.5rem)] ${theme.goldText}`}>
                {t.brandTitle}
              </span>
            </div>
            <h1 className="mt-1.5 font-display font-bold text-[clamp(1.05rem,1.8vh,2.2rem)] truncate">
              {mosqueTitle}
            </h1>

            <div className="mt-[clamp(12px,2vh,30px)] font-mono-numbers tabular-nums font-extrabold tracking-[-0.03em] leading-none text-[clamp(3.6rem,8.4vh,9.2rem)]">
              {formattedClockMain}
              {settings.showSeconds && (
                <span className={`text-[0.52em] font-bold ml-1 ${theme.goldText}`}>
                  :{timeline.clock.ss}
                </span>
              )}
            </div>

            <div className="mt-[clamp(10px,1.6vh,24px)] grid grid-cols-3 items-center gap-3 text-center">
              <div className="text-left">
                <div className={`text-[clamp(0.66rem,0.95vh,1rem)] font-bold uppercase tracking-[0.12em] ${theme.inkMuted}`}>
                  {t.milodiyLabel}
                </div>
                <div className="font-display font-bold text-[clamp(0.95rem,1.6vh,1.9rem)]">
                  {gregorianDay} {gregorianMonth} {gregorianYear}
                </div>
              </div>
              <div>
                <div className={`font-display font-extrabold uppercase tracking-[0.06em] text-[clamp(1.1rem,2.1vh,2.5rem)] ${theme.goldText}`}>
                  {localizedWeekday}
                </div>
              </div>
              <div className="text-right">
                {hasHijri ? (
                  <>
                    <div className={`text-[clamp(0.66rem,0.95vh,1rem)] font-bold uppercase tracking-[0.12em] ${theme.inkMuted}`}>
                      {t.hijriyLabel}
                    </div>
                    <div className={`font-display font-bold text-[clamp(0.95rem,1.6vh,1.9rem)] truncate ${theme.goldText}`}>
                      {hijriLocalized}
                    </div>
                  </>
                ) : (
                  <div className={`text-[clamp(0.82rem,1.25vh,1.35rem)] truncate ${theme.inkMuted}`}>
                    {locationLabel}
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* 5 Monumental Prayer Rows */}
          <main className="relative z-10 flex-1 min-h-0 flex flex-col px-[clamp(20px,4vw,56px)] py-[clamp(12px,1.8vh,28px)]">
            <div className={`grid grid-cols-[1.4fr_1fr_1fr] px-4 pb-2.5 border-b ${theme.accentHairline} text-[clamp(0.75rem,1.1vh,1.35rem)] font-bold uppercase tracking-[0.14em] ${theme.inkMuted}`}>
              <span>{t.prayerColumnLabel}</span>
              <span className="text-center">{t.azanColumnLabel}</span>
              <span className="text-right">{t.iqamahColumnLabel}</span>
            </div>
            <div className={`flex-1 min-h-0 flex flex-col justify-between divide-y ${theme.hairline}`}>
              {prayers.map((prayer) => {
                const isActive = prayer.isCurrent;
                const isNext = prayer.isNext && !isActive;
                return (
                  <div
                    key={prayer.key}
                    className={`flex-1 min-h-0 grid grid-cols-[1.4fr_1fr_1fr] items-center px-4 rounded-xl my-1 transition-colors ${
                      isActive ? theme.activeRowClass : isNext ? theme.nextRowClass : ''
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-display font-extrabold uppercase tracking-[0.05em] leading-none text-[clamp(1.4rem,2.85vh,3.4rem)] truncate">
                        {prayer.label}
                      </div>
                      {(isActive || isNext) && (
                        <div className={`mt-1.5 text-[clamp(0.68rem,1.05vh,1.2rem)] font-bold uppercase tracking-[0.1em] ${isActive ? theme.activeAccentText : theme.goldText}`}>
                          {isActive ? t.currentPrayerBadge : t.nextPrayerBadge}
                        </div>
                      )}
                    </div>
                    <div className="text-center font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(2.15rem,4.7vh,5.5rem)]">
                      {formatTimeForClockFormat(prayer.azanTime, clockFmt)}
                    </div>
                    <div className={`text-right font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(1.65rem,3.4vh,4rem)] ${isActive ? theme.activeAccentText : theme.inkSecondary}`}>
                      {prayer.iqamahTime ? formatTimeForClockFormat(prayer.iqamahTime, clockFmt) : '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          </main>

          {/* Sunrise · Ishraq · Juma + Live Countdowns */}
          <section className={`relative z-10 shrink-0 border-t ${theme.hairline} ${theme.secondarySurfaceBg} px-[clamp(20px,4vw,56px)] py-[clamp(12px,1.7vh,26px)]`}>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className={`text-[clamp(0.72rem,1.15vh,1.3rem)] font-bold uppercase tracking-[0.1em] ${theme.inkMuted}`}>{t.sunriseLabel}</div>
                <div className="mt-1 font-mono-numbers tabular-nums font-extrabold text-[clamp(1.75rem,3.4vh,3.9rem)]">
                  {formatTimeForClockFormat(sunriseTime, clockFmt)}
                </div>
              </div>
              <div className={`border-x ${theme.hairline}`}>
                <div className={`text-[clamp(0.72rem,1.15vh,1.3rem)] font-bold uppercase tracking-[0.1em] ${theme.inkMuted}`}>{t.ishraqLabel}</div>
                <div className="mt-1 font-mono-numbers tabular-nums font-extrabold text-[clamp(1.75rem,3.4vh,3.9rem)]">
                  {formatTimeForClockFormat(ishraqTime, clockFmt)}
                </div>
              </div>
              <div>
                <div className={`text-[clamp(0.72rem,1.15vh,1.3rem)] font-bold uppercase tracking-[0.1em] ${theme.goldText}`}>{t.jumaLabel}</div>
                <div className={`mt-1 font-mono-numbers tabular-nums font-extrabold text-[clamp(1.75rem,3.4vh,3.9rem)] ${theme.goldText}`}>
                  {formatTimeForClockFormat(jumaTime, clockFmt)}
                </div>
              </div>
            </div>
          </section>

          <section className={`relative z-10 shrink-0 ${theme.greenBandBg} px-[clamp(20px,4vw,56px)] py-[clamp(14px,2vh,32px)]`}>
            <div className="grid grid-cols-2 gap-4 items-center text-center divide-x divide-white/20">
              <div>
                <div className={`text-[clamp(0.75rem,1.2vh,1.35rem)] font-extrabold uppercase tracking-[0.1em] ${theme.greenBandAccent} truncate`}>
                  {t.nextAzanLabel} · {nextPrayerLabel}
                </div>
                <div className="mt-1 font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(2rem,4.2vh,4.8rem)] text-white">
                  {timeline.nextAzanCountdown}
                </div>
              </div>
              {settings.showIqamahCountdown && (
                <div className="pl-3">
                  <div className={`text-[clamp(0.75rem,1.2vh,1.35rem)] font-extrabold uppercase tracking-[0.1em] ${theme.greenBandAccent} truncate`}>
                    {timeline.isBetweenAzanAndIqamah ? t.iqamahWaitingLabel : `${t.iqamahColumnLabel} · ${iqamahPrayerLabel}`}
                  </div>
                  <div className="mt-1 font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(2rem,4.2vh,4.8rem)] text-white">
                    {timeline.iqamahCountdown}
                  </div>
                </div>
              )}
            </div>
          </section>

          {announcementBar}
        </div>
      </div>
    );
  }

  // =========================================================================
  // LANDSCAPE / TV / DESKTOP / 4K / ULTRAWIDE COMPOSITIONS
  // Each of the 5 Phase 2 systems has a genuinely distinct architectural structure!
  // =========================================================================

  // -------------------------------------------------------------------------
  // VISION MODERN — Architectural 5-Column Contemporary Signage (Prayer Timetable Hero)
  // -------------------------------------------------------------------------
  if (isVision) {
    return (
      <div className={`relative w-full h-full flex items-center justify-center ${theme.pageBg} ${theme.inkPrimary} overflow-hidden`}>
        <div style={outerStyle} className={`w-full h-full flex flex-col ${theme.surfaceBg} overflow-hidden`}>
          {/* Crisp Top Structural Rail */}
          <header className={`shrink-0 px-[clamp(20px,3.2vw,60px)] py-[clamp(12px,2vh,30px)] border-b-2 border-[#0F5C3B]/20 flex items-center justify-between gap-6`}>
            <div className="min-w-0 max-w-[34%]">
              <div className="flex items-center gap-2.5">
                <span className="font-display font-extrabold tracking-[0.18em] uppercase text-[clamp(0.78rem,1vw,1.3rem)] text-[#0F5C3B]">
                  {t.brandTitle}
                </span>
                {timeline.clock.isFriday && (
                  <span className="px-2 py-0.5 rounded bg-[#0F5C3B] text-white text-[clamp(0.62rem,0.75vw,0.95rem)] font-bold uppercase">
                    {t.fridayTag}
                  </span>
                )}
              </div>
              <h1 className="mt-0.5 font-display font-extrabold text-[clamp(1.05rem,1.6vw,2.35rem)] truncate text-[#0F172A]">
                {mosqueTitle}
              </h1>
              <p className="text-[clamp(0.72rem,0.9vw,1.15rem)] text-[#64748B] truncate">{locationLabel}</p>
            </div>

            <div className="text-center shrink-0">
              <div className="font-display font-extrabold uppercase tracking-[0.06em] text-[clamp(1.1rem,1.65vw,2.4rem)] text-[#0F172A]">
                {localizedWeekday}
              </div>
              <div className="mt-0.5 flex items-center justify-center gap-3 text-[clamp(0.85rem,1.15vw,1.65rem)] font-semibold text-[#334155]">
                <span>{gregorianDay} {gregorianMonth} {gregorianYear}</span>
                {hasHijri && (
                  <>
                    <span className="opacity-35">·</span>
                    <span className="text-[#0F5C3B]">{hijriLocalized}</span>
                  </>
                )}
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="font-mono-numbers tabular-nums font-extrabold tracking-[-0.035em] leading-none text-[clamp(2.5rem,4.9vw,7.4rem)] text-[#0F172A]">
                {formattedClockMain}
                {settings.showSeconds && (
                  <span className="text-[0.54em] font-bold text-[#0F5C3B] ml-1">:{timeline.clock.ss}</span>
                )}
              </div>
            </div>
          </header>

          {/* Dominant 5-Column Architectural Prayer Grid */}
          <main className="flex-1 min-h-0 px-[clamp(20px,3.2vw,60px)] py-[clamp(14px,2.2vh,34px)] flex flex-col">
            <div className="flex-1 min-h-0 grid grid-cols-5 gap-[clamp(10px,1.4vw,24px)]">
              {prayers.map((prayer) => {
                const isActive = prayer.isCurrent;
                const isNext = prayer.isNext && !isActive;
                return (
                  <div
                    key={prayer.key}
                    className={`flex flex-col justify-between rounded-2xl border p-[clamp(14px,1.9vw,34px)] transition-colors ${
                      isActive
                        ? 'bg-[#0F5C3B] text-white border-[#0F5C3B] shadow-lg'
                        : isNext
                          ? 'bg-[#F0F7F4] text-[#0F172A] border-[#0F5C3B]/50'
                          : 'bg-[#F8F9F7] text-[#0F172A] border-[#0F172A]/10'
                    }`}
                  >
                    <div>
                      <div className="font-display font-extrabold uppercase tracking-[0.06em] text-[clamp(1.1rem,1.8vw,2.65rem)] truncate">
                        {prayer.label}
                      </div>
                      <div className={`mt-1 min-h-[1.25em] text-[clamp(0.68rem,0.9vw,1.15rem)] font-bold uppercase tracking-[0.1em] ${isActive ? 'text-[#A7F3D0]' : 'text-[#0F5C3B]'}`}>
                        {isActive ? t.currentPrayerBadge : isNext ? t.nextPrayerBadge : ''}
                      </div>
                    </div>

                    <div className="my-auto py-3">
                      <div className={`text-[clamp(0.66rem,0.85vw,1.08rem)] font-bold uppercase tracking-[0.14em] ${isActive ? 'text-white/75' : 'text-[#64748B]'}`}>
                        {t.azanColumnLabel}
                      </div>
                      <div className="mt-1 font-mono-numbers tabular-nums font-extrabold tracking-[-0.03em] leading-none text-[clamp(2.2rem,4.3vw,6.4rem)]">
                        {formatTimeForClockFormat(prayer.azanTime, clockFmt)}
                      </div>
                    </div>

                    <div className={`pt-3 border-t flex items-baseline justify-between gap-2 ${isActive ? 'border-white/25' : 'border-[#0F172A]/12'}`}>
                      <span className={`text-[clamp(0.68rem,0.9vw,1.15rem)] font-bold uppercase tracking-[0.1em] ${isActive ? 'text-white/80' : 'text-[#64748B]'}`}>
                        {t.iqamahColumnLabel}
                      </span>
                      <span className={`font-mono-numbers tabular-nums font-extrabold text-[clamp(1.35rem,2.3vw,3.4rem)] ${isActive ? 'text-[#D1FAE5]' : 'text-[#334155]'}`}>
                        {prayer.iqamahTime ? formatTimeForClockFormat(prayer.iqamahTime, clockFmt) : '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </main>

          {/* Clean Aligned Lower Strip: Sunrise · Ishraq · Juma · Next Azan · Iqamah */}
          <section className="shrink-0 px-[clamp(20px,3.2vw,60px)] pb-[clamp(12px,1.8vh,26px)]">
            <div className="grid grid-cols-5 gap-[clamp(10px,1.4vw,24px)]">
              <div className="rounded-xl bg-[#F1F2EE] border border-[#0F172A]/10 px-4 py-3">
                <div className="text-[clamp(0.66rem,0.84vw,1.05rem)] font-bold uppercase tracking-[0.1em] text-[#64748B]">{t.sunriseLabel}</div>
                <div className="mt-1 font-mono-numbers tabular-nums font-extrabold text-[clamp(1.5rem,2.3vw,3.3rem)] text-[#0F172A]">
                  {formatTimeForClockFormat(sunriseTime, clockFmt)}
                </div>
              </div>
              <div className="rounded-xl bg-[#F1F2EE] border border-[#0F172A]/10 px-4 py-3">
                <div className="text-[clamp(0.66rem,0.84vw,1.05rem)] font-bold uppercase tracking-[0.1em] text-[#64748B]">{t.ishraqLabel}</div>
                <div className="mt-1 font-mono-numbers tabular-nums font-extrabold text-[clamp(1.5rem,2.3vw,3.3rem)] text-[#0F172A]">
                  {formatTimeForClockFormat(ishraqTime, clockFmt)}
                </div>
              </div>
              <div className="rounded-xl bg-[#F1F2EE] border border-[#0F5C3B]/25 px-4 py-3">
                <div className="text-[clamp(0.66rem,0.84vw,1.05rem)] font-bold uppercase tracking-[0.1em] text-[#0F5C3B]">{t.jumaLabel}</div>
                <div className="mt-1 font-mono-numbers tabular-nums font-extrabold text-[clamp(1.5rem,2.3vw,3.3rem)] text-[#0F5C3B]">
                  {formatTimeForClockFormat(jumaTime, clockFmt)}
                </div>
              </div>
              <div className="rounded-xl bg-[#0F5C3B] text-white px-4 py-3">
                <div className="text-[clamp(0.66rem,0.84vw,1.05rem)] font-bold uppercase tracking-[0.1em] text-[#D1FAE5] truncate">
                  {t.nextAzanLabel} · {nextPrayerLabel}
                </div>
                <div className="mt-1 font-mono-numbers tabular-nums font-extrabold text-[clamp(1.5rem,2.3vw,3.3rem)]">
                  {timeline.nextAzanCountdown}
                </div>
              </div>
              <div className="rounded-xl bg-[#0B412A] text-white px-4 py-3">
                <div className="text-[clamp(0.66rem,0.84vw,1.05rem)] font-bold uppercase tracking-[0.1em] text-[#D1FAE5] truncate">
                  {timeline.isBetweenAzanAndIqamah ? t.iqamahWaitingLabel : `${t.iqamahColumnLabel} · ${iqamahPrayerLabel}`}
                </div>
                <div className="mt-1 font-mono-numbers tabular-nums font-extrabold text-[clamp(1.5rem,2.3vw,3.3rem)]">
                  {timeline.iqamahCountdown}
                </div>
              </div>
            </div>
          </section>

          {announcementBar}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // SULTAN ROYAL · NOOR CLASSIC · MIDNIGHT PREMIUM · ISLAMIC HERITAGE
  // Distinct Royal / Marble / Night / Architectural Heritage Compositions
  // -------------------------------------------------------------------------
  const useTwoColumnSanctuary = isMidnight || isSultan;

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center ${theme.pageBg} ${theme.inkPrimary} ${
        layout.allowVerticalScrollFallback ? 'overflow-y-auto' : 'overflow-hidden'
      }`}
    >
      <div
        style={{ ...outerStyle, ...canvasBackdropStyle }}
        className={`relative w-full h-full flex flex-col overflow-hidden ${
          isHeritage
            ? 'm-[clamp(8px,1.3vw,24px)] rounded-2xl border-2 border-[#C2953B]/65 shadow-[0_24px_70px_rgba(0,0,0,0.45)] ' + theme.surfaceBg
            : theme.surfaceBg
        }`}
      >
        {/* Restrained Architectural Gold Corner Geometry (Sultan Royal & Islamic Heritage only) */}
        {(isSultan || isHeritage) && (
          <>
            <GeometricCornerOrnament color={theme.goldHex} className="absolute top-3 left-3 w-[clamp(36px,4vw,64px)] h-[clamp(36px,4vw,64px)] z-10" />
            <GeometricCornerOrnament color={theme.goldHex} className="absolute top-3 right-3 w-[clamp(36px,4vw,64px)] h-[clamp(36px,4vw,64px)] rotate-90 z-10" />
          </>
        )}

        {/* Subtle Top Gold Hairline Accent for Noor Classic */}
        {isNoor && (
          <div aria-hidden="true" className="h-[4px] w-full bg-gradient-to-r from-[#B88E3D]/30 via-[#B88E3D] to-[#B88E3D]/30 shrink-0" />
        )}

        {useTwoColumnSanctuary ? (
          /* ASYMMETRIC TWO-COLUMN SANCTUARY (Sultan Royal & Midnight Premium) */
          <div className="relative z-10 flex-1 min-h-0 grid grid-cols-12">
            {/* Left Sanctuary Column (5 cols): Brand, Monumental Clock, Dates & Illuminated Countdowns */}
            <aside
              className={`col-span-5 flex flex-col justify-between min-h-0 border-r ${theme.accentHairline} px-[clamp(20px,2.8vw,52px)] py-[clamp(16px,2.4vh,38px)] ${
                isMidnight ? 'bg-[#071122]/70' : 'bg-[#031A12]/65'
              }`}
            >
              <div>
                <div className="flex items-center gap-3">
                  <img
                    src="/assets/aistudio/IMG_20261114_084331_924_8f6ccba1.jpg"
                    alt="ASAKA ZIYO"
                    className={`w-[clamp(38px,3.4vw,64px)] h-[clamp(38px,3.4vw,64px)] rounded-full object-cover border shrink-0 ${
                      isMidnight ? 'border-[#CBD5E1]/45' : 'border-[#E5C36A]/65'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className={`font-display font-extrabold tracking-[0.18em] uppercase text-[clamp(0.72rem,0.95vw,1.25rem)] ${theme.goldText}`}>
                      {t.brandTitle}
                    </div>
                    <h1 className="font-display font-bold leading-tight truncate text-[clamp(0.95rem,1.35vw,1.9rem)]">
                      {mosqueTitle}
                    </h1>
                    <p className={`text-[clamp(0.7rem,0.86vw,1.1rem)] truncate ${theme.inkMuted}`}>
                      {locationLabel}
                    </p>
                  </div>
                </div>

                {/* Sophisticated Digital Clock */}
                <div className="mt-[clamp(14px,2.4vh,34px)]">
                  <div className="font-mono-numbers tabular-nums font-extrabold tracking-[-0.03em] leading-none text-[clamp(2.9rem,5.4vw,7.8rem)]">
                    {formattedClockMain}
                    {settings.showSeconds && (
                      <span className={`text-[0.55em] font-bold ml-1 ${theme.goldText}`}>
                        :{timeline.clock.ss}
                      </span>
                    )}
                  </div>
                </div>

                {/* Localized Calendar Strip */}
                <div className={`mt-[clamp(10px,1.6vh,22px)] pb-[clamp(10px,1.6vh,20px)] border-b ${theme.hairline} flex items-end justify-between gap-3`}>
                  <div>
                    <div className={`font-display font-extrabold uppercase tracking-[0.06em] text-[clamp(1rem,1.45vw,2.1rem)] ${theme.goldText}`}>
                      {localizedWeekday}
                    </div>
                    <div className="mt-0.5 font-mono-numbers font-bold text-[clamp(0.9rem,1.2vw,1.7rem)]">
                      {gregorianDay} {gregorianMonth} {gregorianYear}
                    </div>
                  </div>
                  {hasHijri && (
                    <div className="text-right min-w-0">
                      <div className={`text-[clamp(0.65rem,0.8vw,1rem)] font-bold uppercase tracking-[0.1em] ${theme.inkMuted}`}>
                        {t.hijriyLabel}
                      </div>
                      <div className={`font-display font-bold text-[clamp(0.88rem,1.18vw,1.6rem)] truncate ${theme.inkSecondary}`}>
                        {hijriLocalized}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Countdowns */}
              <div className="space-y-[clamp(10px,1.5vh,20px)] my-auto py-3">
                <div
                  className={`rounded-2xl border px-[clamp(14px,1.8vw,28px)] py-[clamp(12px,1.8vh,24px)] ${
                    isMidnight
                      ? 'bg-[#0C2038]/85 border-[#CBD5E1]/20'
                      : 'bg-[#083424]/90 border-[#E5C36A]/35'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={`text-[clamp(0.72rem,0.95vw,1.25rem)] font-extrabold uppercase tracking-[0.12em] truncate ${theme.goldText}`}>
                      {t.nextAzanLabel} · {nextPrayerLabel}
                    </span>
                    <span className="font-mono-numbers font-bold text-[clamp(0.8rem,1.05vw,1.35rem)] opacity-80 shrink-0">
                      {formatTimeForClockFormat(timeline.nextAzanTime, clockFmt)}
                    </span>
                  </div>
                  <div className="mt-1.5 font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(2.2rem,3.9vw,5.6rem)] text-white">
                    {timeline.nextAzanCountdown}
                  </div>
                </div>

                {settings.showIqamahCountdown && (
                  <div
                    className={`rounded-2xl border px-[clamp(14px,1.8vw,28px)] py-[clamp(12px,1.8vh,24px)] ${
                      timeline.isBetweenAzanAndIqamah
                        ? 'bg-[#0F5D42] border-[#FFE69D]/70'
                        : isMidnight
                          ? 'bg-[#0A2530]/80 border-[#D6B66C]/25'
                          : 'bg-[#06271C]/90 border-[#E5C36A]/22'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[clamp(0.72rem,0.95vw,1.25rem)] font-extrabold uppercase tracking-[0.12em] text-white/90 truncate">
                        {timeline.isBetweenAzanAndIqamah
                          ? t.iqamahWaitingLabel
                          : `${t.iqamahLabel} · ${iqamahPrayerLabel}`}
                      </span>
                      <span className="font-mono-numbers font-bold text-[clamp(0.8rem,1.05vw,1.35rem)] opacity-80 shrink-0">
                        {formatTimeForClockFormat(timeline.iqamahTime, clockFmt)}
                      </span>
                    </div>
                    <div className="mt-1.5 font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(2rem,3.5vw,5rem)] text-white">
                      {timeline.iqamahCountdown}
                    </div>
                  </div>
                )}
              </div>

              {/* Solar & Juma Triad */}
              <div className={`grid grid-cols-3 gap-2 pt-[clamp(10px,1.4vh,18px)] border-t ${theme.hairline} text-center`}>
                <div>
                  <div className={`text-[clamp(0.64rem,0.8vw,1rem)] font-bold uppercase tracking-[0.1em] ${theme.inkMuted}`}>{t.sunriseLabel}</div>
                  <div className="mt-1 font-mono-numbers tabular-nums font-extrabold text-[clamp(1.25rem,1.95vw,2.7rem)]">
                    {formatTimeForClockFormat(sunriseTime, clockFmt)}
                  </div>
                </div>
                <div className={`border-x ${theme.hairline}`}>
                  <div className={`text-[clamp(0.64rem,0.8vw,1rem)] font-bold uppercase tracking-[0.1em] ${theme.inkMuted}`}>{t.ishraqLabel}</div>
                  <div className="mt-1 font-mono-numbers tabular-nums font-extrabold text-[clamp(1.25rem,1.95vw,2.7rem)]">
                    {formatTimeForClockFormat(ishraqTime, clockFmt)}
                  </div>
                </div>
                <div>
                  <div className={`text-[clamp(0.64rem,0.8vw,1rem)] font-bold uppercase tracking-[0.1em] ${theme.goldText}`}>{t.jumaLabel}</div>
                  <div className={`mt-1 font-mono-numbers tabular-nums font-extrabold text-[clamp(1.25rem,1.95vw,2.7rem)] ${theme.goldText}`}>
                    {formatTimeForClockFormat(jumaTime, clockFmt)}
                  </div>
                </div>
              </div>
            </aside>

            {/* Right Monumental Prayer Ledger (7 cols) */}
            <main className="col-span-7 flex flex-col min-h-0 px-[clamp(22px,3.2vw,60px)] py-[clamp(16px,2.4vh,38px)]">
              <div className={`grid grid-cols-[1.4fr_1fr_1fr] px-[clamp(14px,2vw,34px)] pb-3 border-b ${theme.accentHairline} text-[clamp(0.72rem,0.95vw,1.3rem)] font-bold uppercase tracking-[0.16em] ${theme.goldText}`}>
                <span>{t.prayerColumnLabel}</span>
                <span className="text-center">{t.azanColumnLabel}</span>
                <span className="text-right">{t.iqamahColumnLabel}</span>
              </div>

              <div className={`flex-1 min-h-0 flex flex-col justify-between divide-y ${theme.hairline}`}>
                {prayers.map((prayer) => {
                  const isActive = prayer.isCurrent;
                  const isNext = prayer.isNext && !isActive;
                  return (
                    <div
                      key={prayer.key}
                      className={`flex-1 min-h-0 grid grid-cols-[1.4fr_1fr_1fr] items-center px-[clamp(14px,2vw,34px)] rounded-xl my-[3px] transition-colors ${
                        isActive ? theme.activeRowClass : isNext ? theme.nextRowClass : ''
                      }`}
                    >
                      <div className="min-w-0 pr-3">
                        <div
                          className={`font-display font-extrabold uppercase tracking-[0.06em] leading-none truncate ${
                            isMobileLandscape
                              ? 'text-[clamp(1rem,2.3vw,1.6rem)]'
                              : 'text-[clamp(1.55rem,2.6vw,3.9rem)]'
                          }`}
                        >
                          {prayer.label}
                        </div>
                        {(isActive || isNext) && (
                          <div className={`mt-1.5 text-[clamp(0.66rem,0.88vw,1.15rem)] font-bold uppercase tracking-[0.12em] ${isActive ? theme.activeAccentText : theme.goldText}`}>
                            {isActive ? t.currentPrayerBadge : t.nextPrayerBadge}
                          </div>
                        )}
                      </div>
                      <div
                        className={`text-center font-mono-numbers tabular-nums font-extrabold tracking-[-0.025em] leading-none ${
                          isMobileLandscape
                            ? 'text-[clamp(1.4rem,3.4vw,2.4rem)]'
                            : 'text-[clamp(2.3rem,4.3vw,6.4rem)]'
                        }`}
                      >
                        {formatTimeForClockFormat(prayer.azanTime, clockFmt)}
                      </div>
                      <div
                        className={`text-right font-mono-numbers tabular-nums font-extrabold tracking-[-0.02em] leading-none ${
                          isMobileLandscape
                            ? 'text-[clamp(1.1rem,2.6vw,1.8rem)]'
                            : 'text-[clamp(1.7rem,3.1vw,4.6rem)]'
                        } ${isActive ? theme.activeAccentText : theme.inkSecondary}`}
                      >
                        {prayer.iqamahTime ? formatTimeForClockFormat(prayer.iqamahTime, clockFmt) : '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </main>
          </div>
        ) : (
          /* FULL-WIDTH LUXURY HORIZONTAL ARCHITECTURE (Noor Classic & Islamic Heritage) */
          <div className="relative z-10 flex-1 min-h-0 flex flex-col">
            {/* Editorial Header with Mosque Identity · Localized Calendar · Live Clock */}
            <header className={`shrink-0 px-[clamp(22px,3.4vw,60px)] py-[clamp(12px,1.9vh,28px)] border-b ${theme.accentHairline} flex items-center justify-between gap-6`}>
              <div className="flex items-center gap-3.5 min-w-0 max-w-[34%]">
                <img
                  src="/assets/aistudio/IMG_20261114_084331_924_8f6ccba1.jpg"
                  alt="ASAKA ZIYO"
                  className="w-[clamp(42px,3.6vw,70px)] h-[clamp(42px,3.6vw,70px)] rounded-full object-cover border-2 border-[#B88E3D]/70 shrink-0"
                />
                <div className="min-w-0">
                  <div className={`font-display font-extrabold tracking-[0.18em] uppercase text-[clamp(0.75rem,0.95vw,1.25rem)] ${theme.goldText}`}>
                    {t.brandTitle}
                  </div>
                  <h1 className="font-display font-extrabold leading-tight truncate text-[clamp(1.05rem,1.5vw,2.2rem)]">
                    {mosqueTitle}
                  </h1>
                  <p className={`text-[clamp(0.72rem,0.88vw,1.15rem)] truncate ${theme.inkMuted}`}>
                    {locationLabel}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-[clamp(16px,2.2vw,42px)] shrink-0">
                <div className="text-right">
                  <div className={`text-[clamp(0.64rem,0.78vw,0.98rem)] font-bold uppercase tracking-[0.12em] ${theme.inkMuted}`}>
                    {t.milodiyLabel}
                  </div>
                  <div className="font-display font-bold text-[clamp(0.95rem,1.35vw,1.9rem)]">
                    {gregorianDay} {gregorianMonth} {gregorianYear}
                  </div>
                </div>
                <div className={`px-[clamp(14px,1.8vw,32px)] border-x ${theme.accentHairline} text-center`}>
                  <div className="font-display font-extrabold uppercase tracking-[0.06em] text-[clamp(1.1rem,1.6vw,2.35rem)]">
                    {localizedWeekday}
                  </div>
                </div>
                {hasHijri && (
                  <div className="text-left">
                    <div className={`text-[clamp(0.64rem,0.78vw,0.98rem)] font-bold uppercase tracking-[0.12em] ${theme.inkMuted}`}>
                      {t.hijriyLabel}
                    </div>
                    <div className={`font-display font-bold text-[clamp(0.95rem,1.35vw,1.9rem)] ${theme.goldText}`}>
                      {hijriLocalized}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-right shrink-0">
                <div className="font-mono-numbers tabular-nums font-extrabold tracking-[-0.03em] leading-none text-[clamp(2.5rem,4.7vw,7rem)]">
                  {formattedClockMain}
                  {settings.showSeconds && (
                    <span className={`text-[0.55em] font-bold ml-1 ${theme.goldText}`}>
                      :{timeline.clock.ss}
                    </span>
                  )}
                </div>
              </div>
            </header>

            {/* Monumental 3-Column Prayer Timetable */}
            <main className="flex-1 min-h-0 flex flex-col px-[clamp(24px,3.6vw,68px)] py-[clamp(10px,1.6vh,24px)]">
              <div className={`grid grid-cols-[1.45fr_1fr_1fr] px-[clamp(16px,2.2vw,38px)] pb-2 border-b ${theme.accentHairline} text-[clamp(0.72rem,0.95vw,1.25rem)] font-bold uppercase tracking-[0.15em] ${theme.inkMuted}`}>
                <span>{t.prayerColumnLabel}</span>
                <span className="text-center">{t.azanColumnLabel}</span>
                <span className="text-right">{t.iqamahColumnLabel}</span>
              </div>

              <div className={`flex-1 min-h-0 flex flex-col justify-between divide-y ${theme.hairline}`}>
                {prayers.map((prayer) => {
                  const isActive = prayer.isCurrent;
                  const isNext = prayer.isNext && !isActive;
                  return (
                    <div
                      key={prayer.key}
                      className={`flex-1 min-h-0 grid grid-cols-[1.45fr_1fr_1fr] items-center px-[clamp(16px,2.2vw,38px)] rounded-xl my-[2px] transition-colors ${
                        isActive ? theme.activeRowClass : isNext ? theme.nextRowClass : ''
                      }`}
                    >
                      <div className="min-w-0 pr-3">
                        <div className="font-display font-extrabold uppercase tracking-[0.06em] leading-none text-[clamp(1.5rem,2.65vw,4rem)] truncate">
                          {prayer.label}
                        </div>
                        {(isActive || isNext) && (
                          <div className={`mt-1 text-[clamp(0.68rem,0.88vw,1.15rem)] font-bold uppercase tracking-[0.12em] ${isActive ? theme.activeAccentText : theme.goldText}`}>
                            {isActive ? t.currentPrayerBadge : t.nextPrayerBadge}
                          </div>
                        )}
                      </div>
                      <div className="text-center font-mono-numbers tabular-nums font-extrabold tracking-[-0.025em] leading-none text-[clamp(2.35rem,4.55vw,6.8rem)]">
                        {formatTimeForClockFormat(prayer.azanTime, clockFmt)}
                      </div>
                      <div className={`text-right font-mono-numbers tabular-nums font-extrabold tracking-[-0.02em] leading-none text-[clamp(1.75rem,3.25vw,4.9rem)] ${isActive ? theme.activeAccentText : theme.inkSecondary}`}>
                        {prayer.iqamahTime ? formatTimeForClockFormat(prayer.iqamahTime, clockFmt) : '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </main>

            {/* Lower Architectural Split Band (Sunrise/Ishraq + Royal Green Juma/Countdowns) */}
            <section className="shrink-0 px-[clamp(24px,3.6vw,68px)] pb-[clamp(12px,1.6vh,24px)]">
              <div className="grid grid-cols-12 gap-[clamp(12px,1.6vw,24px)] items-stretch">
                <div className={`col-span-4 rounded-2xl border ${theme.accentHairline} ${theme.secondarySurfaceBg} px-5 py-3.5 grid grid-cols-2 items-center text-center divide-x ${theme.hairline}`}>
                  <div>
                    <div className={`text-[clamp(0.68rem,0.88vw,1.12rem)] font-extrabold uppercase tracking-[0.1em] ${theme.inkSecondary}`}>
                      {t.sunriseLabel}
                    </div>
                    <div className="mt-1 font-mono-numbers tabular-nums font-extrabold text-[clamp(1.65rem,2.55vw,3.6rem)]">
                      {formatTimeForClockFormat(sunriseTime, clockFmt)}
                    </div>
                  </div>
                  <div className="pl-2">
                    <div className={`text-[clamp(0.68rem,0.88vw,1.12rem)] font-extrabold uppercase tracking-[0.1em] ${theme.inkSecondary}`}>
                      {t.ishraqLabel}
                    </div>
                    <div className="mt-1 font-mono-numbers tabular-nums font-extrabold text-[clamp(1.65rem,2.55vw,3.6rem)]">
                      {formatTimeForClockFormat(ishraqTime, clockFmt)}
                    </div>
                  </div>
                </div>

                <div className={`col-span-8 rounded-2xl ${theme.greenBandBg} px-6 py-3.5 grid grid-cols-3 items-center text-center divide-x divide-white/20`}>
                  <div>
                    <div className={`text-[clamp(0.68rem,0.9vw,1.15rem)] font-extrabold uppercase tracking-[0.1em] ${theme.greenBandAccent}`}>
                      {t.jumaLabel}
                    </div>
                    <div className="mt-1 font-mono-numbers tabular-nums font-extrabold text-[clamp(1.75rem,2.75vw,3.9rem)] text-white">
                      {formatTimeForClockFormat(jumaTime, clockFmt)}
                    </div>
                  </div>
                  <div className="pl-2">
                    <div className={`text-[clamp(0.68rem,0.9vw,1.15rem)] font-extrabold uppercase tracking-[0.1em] ${theme.greenBandAccent} truncate`}>
                      {t.nextAzanLabel} · {nextPrayerLabel}
                    </div>
                    <div className="mt-1 font-mono-numbers tabular-nums font-extrabold text-[clamp(1.75rem,2.75vw,3.9rem)] text-white">
                      {timeline.nextAzanCountdown}
                    </div>
                  </div>
                  <div className="pl-2">
                    <div className={`text-[clamp(0.68rem,0.9vw,1.15rem)] font-extrabold uppercase tracking-[0.1em] ${theme.greenBandAccent} truncate`}>
                      {timeline.isBetweenAzanAndIqamah ? t.iqamahWaitingLabel : `${t.iqamahColumnLabel} · ${iqamahPrayerLabel}`}
                    </div>
                    <div className="mt-1 font-mono-numbers tabular-nums font-extrabold text-[clamp(1.75rem,2.75vw,3.9rem)] text-white">
                      {timeline.iqamahCountdown}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {announcementBar}
      </div>
    </div>
  );
};
