import React from 'react';
import {
  SmartDisplaySettings,
  SmartDisplayTimeline,
  formatTimeForClockFormat,
} from '../../../../utils/smartMosqueDisplayEngine';
import {
  SmartDisplayLocaleBundle,
  getDisplayLocaleBundle,
  localizeHijriDate,
  sanitizeDisplayDynamicText,
} from '../../../../utils/smartMosqueDisplayI18n';
import { DisplayResponsiveLayout } from '../../../../utils/smartMosqueResponsiveEngine';
import { DisplayPrayerRowItem, parseHijriParts } from './displayProfiles';

export interface MasjidAlNabawiDisplayProps {
  /** 'uz_cyrl_locked' enforces 100% Uzbek Cyrillic only (/masjid-tv & masjid_namoz_tablosa_uz_cyrl); 'multilingual' supports all 5 project languages (masjid_al_nabawi) */
  languageMode: 'multilingual' | 'uz_cyrl_locked';
  layout: DisplayResponsiveLayout;
  settings: SmartDisplaySettings;
  timeline: SmartDisplayTimeline;
  prayers: DisplayPrayerRowItem[];
  sunriseTime: string;
  ishraqTime: string;
  jumaTime: string;
  mosqueTitle: string;
  locationLabel: string;
  hijriLocalized: string;
  rawHijriDate?: string;
  t: SmartDisplayLocaleBundle;
  showAnnouncementStrip?: boolean;
  announcementTitle?: string;
  announcementBody?: string;
  isOnline?: boolean;
}

/** Octagonal decorative day badge faithfully echoing the Masjid Al-Nabawi monitor reference */
const ReferenceDayBadge: React.FC<{ value: string; compact?: boolean }> = ({
  value,
  compact = false,
}) => {
  if (!value) return null;
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${
        compact
          ? 'w-[clamp(36px,9vw,48px)] h-[clamp(36px,9vw,48px)]'
          : 'w-[clamp(48px,6.4vh,104px)] h-[clamp(48px,6.4vh,104px)]'
      }`}
    >
      <svg viewBox="0 0 100 100" aria-hidden="true" className="absolute inset-0 w-full h-full">
        <polygon
          points="29,4 71,4 96,29 96,71 71,96 29,96 4,71 4,29"
          fill="rgba(255,255,255,0.34)"
          stroke="#9D835C"
          strokeWidth="3.5"
        />
        <polygon
          points="32,10 68,10 90,32 90,68 68,90 32,90 10,68 10,32"
          fill="none"
          stroke="#9D835C"
          strokeWidth="1.2"
          opacity="0.55"
        />
      </svg>
      <span
        className={`relative z-10 font-mono-numbers tabular-nums font-extrabold leading-none text-[#8C5B32] ${
          compact
            ? 'text-[clamp(0.95rem,3.6vw,1.35rem)]'
            : 'text-[clamp(1.2rem,2.75vh,2.7rem)]'
        }`}
      >
        {value}
      </span>
    </div>
  );
};

/** Ultra-subtle mosque dome & minaret silhouette watermark — kept at ~5% opacity so legibility is 100% preserved */
const SubtleMosqueBackdrop: React.FC<{ visible: boolean }> = ({ visible }) => {
  if (!visible) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Soft architectural marble tonal gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 60% at 50% 18%, rgba(255,255,255,0.72) 0%, rgba(226,233,237,0.55) 55%, rgba(213,222,228,0.7) 100%)',
        }}
      />
      {/* Ultra-faint architectural dome & minaret silhouette matching reference lower-middle depth */}
      <svg
        viewBox="0 0 1080 1920"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-x-0 bottom-0 w-full h-[78%] opacity-[0.065]"
      >
        <g fill="#233731">
          {/* Central dome */}
          <path d="M540 620 C410 620 340 760 340 880 L740 880 C740 760 670 620 540 620 Z" />
          <rect x="534" y="545" width="12" height="80" />
          <circle cx="540" cy="540" r="14" />
          {/* Left minaret */}
          <rect x="165" y="470" width="44" height="460" />
          <polygon points="187,390 160,472 214,472" />
          <rect x="155" y="560" width="64" height="16" />
          <rect x="155" y="690" width="64" height="16" />
          {/* Right minaret */}
          <rect x="871" y="470" width="44" height="460" />
          <polygon points="893,390 866,472 920,472" />
          <rect x="861" y="560" width="64" height="16" />
          <rect x="861" y="690" width="64" height="16" />
          {/* Sanctuary colonnade arches */}
          <rect x="80" y="880" width="920" height="480" />
          <path d="M180 1360 L180 1060 Q240 990 300 1060 L300 1360 Z" fill="#EDF1F3" opacity="0.55" />
          <path d="M360 1360 L360 1060 Q420 990 480 1060 L480 1360 Z" fill="#EDF1F3" opacity="0.55" />
          <path d="M600 1360 L600 1060 Q660 990 720 1060 L720 1360 Z" fill="#EDF1F3" opacity="0.55" />
          <path d="M780 1360 L780 1060 Q840 990 900 1060 L900 1360 Z" fill="#EDF1F3" opacity="0.55" />
        </g>
      </svg>
    </div>
  );
};

/**
 * Faithful reproduction of the user-uploaded Masjid Al-Nabawi prayer timetable monitor.
 * Powers BOTH:
 * - `masjid_al_nabawi` (5 official ASAKA ZIYO languages, zero Arabic script)
 * - `masjid_namoz_tablosa_uz_cyrl` / `/masjid-tv` (strictly Uzbek Cyrillic ONLY, zero Arabic/Latin)
 */
export const MasjidAlNabawiDisplay: React.FC<MasjidAlNabawiDisplayProps> = ({
  languageMode,
  layout,
  settings,
  timeline,
  prayers,
  sunriseTime,
  ishraqTime,
  jumaTime,
  mosqueTitle,
  hijriLocalized,
  rawHijriDate,
  t,
  isOnline = true,
}) => {
  const isCyrlLocked = languageMode === 'uz_cyrl_locked';
  const cyrlBundle = isCyrlLocked ? getDisplayLocaleBundle('uz-Cyrl') : t;
  const clockFmt = settings.clockFormat === '12h' ? '12h' : '24h';
  const showTexture = settings.showBackgroundTexture !== false;
  const showSideBadges = settings.showSideIndicators !== false;

  // Strictly enforce Uzbek Cyrillic strings when in uz_cyrl_locked mode (zero Latin/Arabic/Russian/English)
  const brandLabel = isCyrlLocked ? 'АСАКА ЗИЁ' : t.brandTitle;
  const gregorianMonth = cyrlBundle.months[timeline.clock.monthIndex] || '';
  const gregorianYear = String(timeline.clock.year);
  const gregorianDay = String(timeline.clock.day).padStart(2, '0');
  const weekdayLabel = cyrlBundle.weekdays[timeline.clock.weekdayIndex] || '';

  const effectiveHijri = isCyrlLocked
    ? localizeHijriDate(rawHijriDate || hijriLocalized, 'uz-Cyrl')
    : hijriLocalized;
  const hijriParts = parseHijriParts(effectiveHijri);
  const hijriDayDisplay = hijriParts.day ? hijriParts.day.padStart(2, '0') : '';

  const duhaLabel = isCyrlLocked ? 'ЗУҲО ВАҚТИ' : t.duhaStartsAtLabel;
  const sunriseLabel = isCyrlLocked ? 'ҚУЁШ ЧИҚИШИ' : t.sunriseLabel;
  const jumaLabel = isCyrlLocked ? 'ЖУМА НАМОЗИ' : t.jumaLabel;
  const nextAzanLabel = isCyrlLocked ? 'КЕЙИНГИ АЗОНГАЧА' : t.nextAzanAfterLabel;
  const offlineBannerLabel = isCyrlLocked
    ? 'Интернет узилган · Сўнгги тасдиқланган жадвал кўрсатилмоқда'
    : t.offlineNotice;

  // Format clock respecting 12h/24h preference
  const rawClockStr = settings.showSeconds
    ? `${timeline.clock.hh}:${timeline.clock.mm}:${timeline.clock.ss}`
    : `${timeline.clock.hh}:${timeline.clock.mm}`;
  const displayClock = formatTimeForClockFormat(rawClockStr, clockFmt);

  // Format countdown cleanly as HH:MM (matching reference monitor) or HH:MM:SS when seconds enabled
  const countdownParts = (timeline.nextAzanCountdown || '00:00:00').split(':');
  const countdownShort =
    countdownParts.length >= 2 ? `${countdownParts[0]}:${countdownParts[1]}` : timeline.nextAzanCountdown;
  const countdownSec = countdownParts.length >= 3 ? countdownParts[2] : '';

  const displayPrayers = prayers.map((p) => ({
    ...p,
    label: isCyrlLocked ? cyrlBundle.prayerNames[p.key] || p.label : p.label,
    formattedAzan: formatTimeForClockFormat(p.azanTime, clockFmt),
    formattedIqamah: p.iqamahTime ? formatTimeForClockFormat(p.iqamahTime, clockFmt) : '',
  }));

  const safeDisplayMosque = isCyrlLocked
    ? sanitizeDisplayDynamicText(
        /[A-Za-z]/.test(mosqueTitle) ? cyrlBundle.mosqueSubtitleDefault : mosqueTitle,
        'uz-Cyrl',
        cyrlBundle.mosqueSubtitleDefault
      )
    : mosqueTitle;

  const formattedDuha = formatTimeForClockFormat(ishraqTime, clockFmt);
  const formattedSunrise = formatTimeForClockFormat(sunriseTime, clockFmt);
  const formattedJuma = formatTimeForClockFormat(jumaTime, clockFmt);

  const isPortraitLayout = layout.isPortrait;
  const isCompactMobile = layout.deviceTier === 'mobile_portrait';
  const isMobileLandscape = layout.deviceTier === 'mobile_landscape';

  const containerStyle: React.CSSProperties = layout.contentMaxWidthPx
    ? { maxWidth: `${layout.contentMaxWidthPx}px` }
    : {};

  // =========================================================================
  // LANDSCAPE ADAPTIVE COMPOSITION (Smart TV 16:9, 4K, Desktop, 4:3, Ultrawide)
  // Retains 100% of the reference visual identity, marble surface, typography,
  // Duha/Sunrise divider section, and signature full-width #1E6B38 bottom banner!
  // =========================================================================
  if (!isPortraitLayout) {
    return (
      <div
        className={`relative w-full h-full flex items-center justify-center bg-[#E4EAEF] text-[#1C262B] ${
          layout.allowVerticalScrollFallback ? 'overflow-y-auto' : 'overflow-hidden'
        }`}
      >
        <div
          style={containerStyle}
          className="relative w-full h-full flex flex-col bg-[#E8EEF1] overflow-hidden shadow-2xl"
        >
          <SubtleMosqueBackdrop visible={showTexture} />

          {!isOnline && (
            <div className="relative z-20 px-4 py-1 bg-amber-900/90 text-amber-100 text-xs font-bold text-center">
              {offlineBannerLabel}
            </div>
          )}

          {/* Main 2-Zone Horizontal Body */}
          <div className="relative z-10 flex-1 min-h-0 grid grid-cols-12">
            {/* LEFT ZONE (5 cols): Centered Clock with Side Indicators + 3-Col Dates + Duha/Sunrise */}
            <section className="col-span-5 flex flex-col justify-between border-r border-[#23313A]/20 px-[clamp(16px,2.5vw,52px)] py-[clamp(12px,2.2vh,36px)]">
              {/* Quiet Top Brand */}
              <div className="flex items-center justify-between gap-2 text-[#45565F]">
                <span className="font-display font-extrabold tracking-[0.14em] text-[clamp(0.72rem,1vw,1.35rem)] text-[#1E6B38]">
                  {brandLabel}
                </span>
                <span className="text-[clamp(0.68rem,0.92vw,1.2rem)] font-semibold truncate max-w-[68%] text-right">
                  {safeDisplayMosque}
                </span>
              </div>

              {/* Monumental Centered Clock + Twin Decorative Day Indicators */}
              <div className="flex items-center justify-center gap-[clamp(10px,1.5vw,28px)] my-auto py-2">
                {showSideBadges && (
                  <ReferenceDayBadge value={gregorianDay} compact={isMobileLandscape} />
                )}
                <div
                  className={`font-mono-numbers tabular-nums font-extrabold tracking-[-0.03em] leading-none text-[#1D2B2F] ${
                    isMobileLandscape
                      ? 'text-[clamp(2rem,5.4vw,3.1rem)]'
                      : 'text-[clamp(2.5rem,4.6vw,6.8rem)]'
                  }`}
                >
                  {displayClock}
                </div>
                {showSideBadges && settings.showHijriDate && hijriDayDisplay && (
                  <ReferenceDayBadge value={hijriDayDisplay} compact={isMobileLandscape} />
                )}
              </div>

              {/* 3-Column Date Band (Gregorian Left · Weekday Center · Hijri Right) */}
              <div className="grid grid-cols-3 items-center gap-2 py-[clamp(8px,1.4vh,20px)] border-y border-[#23313A]/22 text-center">
                <div className="text-left">
                  <div className="font-display font-bold leading-tight text-[clamp(0.85rem,1.25vw,1.85rem)] text-[#232F36]">
                    {gregorianMonth}
                  </div>
                  <div className="font-mono-numbers tabular-nums font-extrabold text-[clamp(0.95rem,1.35vw,1.95rem)] text-[#1D272E]">
                    {gregorianYear}
                  </div>
                </div>

                <div className="text-center">
                  <div className="font-display font-extrabold leading-tight text-[clamp(1rem,1.55vw,2.25rem)] text-[#1B252B]">
                    {weekdayLabel}
                  </div>
                </div>

                <div className="text-right">
                  {settings.showHijriDate && effectiveHijri ? (
                    <>
                      <div className="font-display font-bold leading-tight text-[clamp(0.82rem,1.18vw,1.75rem)] text-[#232F36] truncate">
                        {hijriParts.month || effectiveHijri}
                        {hijriParts.day ? ` ${hijriParts.day}` : ''}
                      </div>
                      {hijriParts.year && (
                        <div className="font-mono-numbers tabular-nums font-extrabold text-[clamp(0.95rem,1.35vw,1.95rem)] text-[#1D272E]">
                          {hijriParts.year}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="font-mono-numbers font-bold text-[clamp(0.85rem,1.15vw,1.5rem)] text-[#4B5A64]">
                      {gregorianDay}.{String(timeline.clock.monthIndex + 1).padStart(2, '0')}
                    </div>
                  )}
                </div>
              </div>

              {/* Secondary Solar Times: Left = Duha/Ishraq, Right = Sunrise (Exact Reference Order) */}
              <div className="grid grid-cols-2 gap-4 pt-[clamp(10px,1.6vh,22px)] text-center">
                <div>
                  <div className="font-display font-extrabold uppercase tracking-[0.07em] text-[clamp(0.72rem,1vw,1.4rem)] text-[#26363D]">
                    {duhaLabel}
                  </div>
                  <div className="mt-1 font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(1.7rem,3vw,4.5rem)] text-[#1A5836]">
                    {formattedDuha}
                  </div>
                </div>

                <div className="border-l border-[#23313A]/18 pl-2">
                  <div className="font-display font-extrabold uppercase tracking-[0.07em] text-[clamp(0.72rem,1vw,1.4rem)] text-[#26363D]">
                    {sunriseLabel}
                  </div>
                  <div className="mt-1 font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(1.7rem,3vw,4.5rem)] text-[#62192A]">
                    {formattedSunrise}
                  </div>
                </div>
              </div>
            </section>

            {/* RIGHT ZONE (7 cols): 5 Monumental Vertically Aligned Prayer Rows */}
            <section className="col-span-7 flex flex-col justify-between px-[clamp(20px,3.2vw,64px)] py-[clamp(12px,2.2vh,34px)]">
              <div className="flex-1 min-h-0 flex flex-col justify-between divide-y divide-[#23313A]/14">
                {displayPrayers.map((prayer) => {
                  const isActive = prayer.isCurrent;
                  const isNext = prayer.isNext && !isActive;

                  return (
                    <div
                      key={prayer.key}
                      className={`flex-1 min-h-0 flex items-center justify-between gap-4 px-[clamp(12px,1.8vw,32px)] rounded-lg transition-colors ${
                        isActive
                          ? 'bg-[#1E6B38]/12 ring-1 ring-[#1E6B38]/30'
                          : isNext
                            ? 'bg-[#62192A]/[0.065]'
                            : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <span
                          className={`font-display font-extrabold uppercase tracking-[0.05em] leading-none block truncate ${
                            isMobileLandscape
                              ? 'text-[clamp(1.05rem,2.4vw,1.6rem)]'
                              : 'text-[clamp(1.55rem,2.75vw,4.2rem)]'
                          } ${isActive ? 'text-[#144B27]' : 'text-[#1D252C]'}`}
                        >
                          {prayer.label}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-[clamp(12px,2vw,34px)] shrink-0">
                        <span
                          className={`font-mono-numbers tabular-nums font-extrabold tracking-[-0.025em] leading-none ${
                            isMobileLandscape
                              ? 'text-[clamp(1.45rem,3.6vw,2.4rem)]'
                              : 'text-[clamp(2.25rem,4.3vw,6.4rem)]'
                          } ${isActive ? 'text-[#14552D]' : 'text-[#5E1828]'}`}
                        >
                          {prayer.formattedAzan}
                        </span>

                        {!isCyrlLocked && prayer.formattedIqamah && (
                          <span className="font-mono-numbers tabular-nums font-bold text-[clamp(1rem,1.65vw,2.5rem)] text-[#455661] min-w-[3.4ch] text-right">
                            {prayer.formattedIqamah}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* SIGNATURE FULL-WIDTH #1E6B38 BOTTOM GREEN BANNER (Exact Reference Color & 2-Column Hierarchy) */}
          <section className="relative z-10 shrink-0 bg-[#1E6B38] text-white px-[clamp(20px,4vw,76px)] py-[clamp(10px,1.8vh,28px)] mb-[clamp(4px,0.9vh,14px)]">
            <div className="grid grid-cols-2 items-center text-center divide-x divide-white/25">
              <div className="pr-4">
                <div className="font-display font-bold uppercase tracking-[0.08em] text-[clamp(0.85rem,1.45vw,2.2rem)] text-white/95">
                  {jumaLabel}
                </div>
                <div className="mt-1 font-mono-numbers tabular-nums font-extrabold leading-none tracking-[-0.02em] text-[clamp(1.9rem,3.9vw,5.8rem)] text-white">
                  {formattedJuma}
                </div>
              </div>

              <div className="pl-4">
                <div className="font-display font-bold uppercase tracking-[0.08em] text-[clamp(0.85rem,1.45vw,2.2rem)] text-white/95 truncate">
                  {nextAzanLabel}
                </div>
                <div className="mt-1 font-mono-numbers tabular-nums font-extrabold leading-none tracking-[-0.02em] text-[clamp(1.9rem,3.9vw,5.8rem)] text-white">
                  {countdownShort}
                  {settings.showSeconds && countdownSec && (
                    <span className="text-[0.58em] text-white/85 ml-1">:{countdownSec}</span>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // =========================================================================
  // PRIMARY PORTRAIT COMPOSITION (1080x1920, 2160x3840, 768x1024, 390x844, 320x568)
  // Exact Top-to-Bottom Faithfulness to the Uploaded Masjid Al-Nabawi Monitor Photo
  // =========================================================================
  return (
    <div
      className={`relative w-full h-full flex flex-col bg-[#E8EEF1] text-[#1D252B] ${
        layout.allowVerticalScrollFallback ? 'overflow-y-auto' : 'overflow-hidden'
      }`}
    >
      <SubtleMosqueBackdrop visible={showTexture} />

      {!isOnline && (
        <div className="relative z-20 px-3 py-1 bg-amber-900/90 text-amber-100 text-[11px] font-bold text-center">
          {offlineBannerLabel}
        </div>
      )}

      {/* A. TOP DIGITAL CLOCK SECTION WITH TWIN DECORATIVE DAY INDICATORS */}
      <header className="relative z-10 shrink-0 px-[clamp(12px,4vw,54px)] pt-[clamp(10px,2.2vh,44px)] pb-[clamp(6px,1.2vh,22px)]">
        {/* Subtle top mosque brand hairline */}
        <div className="flex items-center justify-between gap-2 mb-[clamp(6px,1vh,18px)] text-[#4B5A63]">
          <span className="font-display font-extrabold tracking-[0.14em] text-[clamp(0.65rem,1.15vh,1.35rem)] text-[#1E6B38]">
            {brandLabel}
          </span>
          <span className="font-semibold text-[clamp(0.65rem,1.1vh,1.3rem)] truncate text-right">
            {safeDisplayMosque}
          </span>
        </div>

        {/* Centerpiece Live Digital Clock flanked by Left & Right Octagonal Indicators */}
        <div className="flex items-center justify-center gap-[clamp(10px,3vw,42px)]">
          {showSideBadges && <ReferenceDayBadge value={gregorianDay} compact={isCompactMobile} />}
          <div
            className={`font-mono-numbers tabular-nums font-extrabold tracking-[-0.03em] leading-none text-[#1D2B2F] ${
              isCompactMobile
                ? 'text-[clamp(2.1rem,11vw,3.4rem)]'
                : 'text-[clamp(3.1rem,6.4vh,7.6rem)]'
            }`}
          >
            {displayClock}
          </div>
          {showSideBadges && settings.showHijriDate && hijriDayDisplay && (
            <ReferenceDayBadge value={hijriDayDisplay} compact={isCompactMobile} />
          )}
        </div>

        {/* B. THREE-COLUMN DATE SECTION (Gregorian Left · Weekday Center · Hijri Right) */}
        <div className="grid grid-cols-3 items-center gap-2 mt-[clamp(10px,1.8vh,34px)]">
          {/* Left: Gregorian Month & Year */}
          <div className="text-left">
            <div className="font-display font-bold leading-tight text-[clamp(0.82rem,1.85vh,2.25rem)] text-[#232F36] truncate">
              {gregorianMonth}
            </div>
            <div className="font-mono-numbers tabular-nums font-extrabold leading-tight text-[clamp(0.9rem,1.95vh,2.35rem)] text-[#1D272E]">
              {gregorianYear}
            </div>
          </div>

          {/* Center: Current Weekday */}
          <div className="text-center">
            <div className="font-display font-extrabold leading-tight text-[clamp(0.95rem,2.2vh,2.75rem)] text-[#1B252B] truncate">
              {weekdayLabel}
            </div>
          </div>

          {/* Right: Hijri Month, Day & Year */}
          <div className="text-right">
            {settings.showHijriDate && effectiveHijri ? (
              <>
                <div className="font-display font-bold leading-tight text-[clamp(0.78rem,1.7vh,2.05rem)] text-[#232F36] truncate">
                  {hijriParts.month || effectiveHijri}
                  {hijriParts.day ? ` ${hijriParts.day}` : ''}
                </div>
                {hijriParts.year && (
                  <div className="font-mono-numbers tabular-nums font-extrabold leading-tight text-[clamp(0.9rem,1.95vh,2.35rem)] text-[#1D272E]">
                    {hijriParts.year}
                  </div>
                )}
              </>
            ) : (
              <div className="font-mono-numbers font-bold text-[clamp(0.85rem,1.6vh,1.9rem)] text-[#4B5A64]">
                {gregorianDay}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* C. FIVE LARGE VERTICALLY ALIGNED PRAYER ROWS */}
      <main className="relative z-10 flex-1 min-h-0 flex flex-col justify-evenly px-[clamp(14px,4.8vw,66px)] py-[clamp(4px,1vh,20px)]">
        {displayPrayers.map((prayer) => {
          const isActive = prayer.isCurrent;
          const isNext = prayer.isNext && !isActive;

          return (
            <div
              key={prayer.key}
              className={`flex items-center justify-between gap-3 px-[clamp(8px,2vw,24px)] py-[clamp(4px,0.9vh,16px)] rounded-xl transition-colors ${
                isActive
                  ? 'bg-[#1E6B38]/12 ring-1 ring-[#1E6B38]/30'
                  : isNext
                    ? 'bg-[#62192A]/[0.065]'
                    : ''
              }`}
            >
              {/* Left: Large Bold Prayer Name */}
              <div className="min-w-0">
                <span
                  className={`font-display font-extrabold uppercase tracking-[0.04em] leading-none block truncate ${
                    isCompactMobile
                      ? 'text-[clamp(1.15rem,5.4vw,1.7rem)]'
                      : 'text-[clamp(1.55rem,3.1vh,3.85rem)]'
                  } ${isActive ? 'text-[#144B27]' : 'text-[#1F272E]'}`}
                >
                  {prayer.label}
                </span>
              </div>

              {/* Right / Center-Right: Monumental Prayer Time */}
              <div className="flex items-baseline gap-[clamp(8px,2.2vw,26px)] shrink-0">
                <span
                  className={`font-mono-numbers tabular-nums font-extrabold tracking-[-0.025em] leading-none ${
                    isCompactMobile
                      ? 'text-[clamp(1.65rem,8vw,2.45rem)]'
                      : 'text-[clamp(2.35rem,4.9vh,6.1rem)]'
                  } ${isActive ? 'text-[#14552D]' : 'text-[#5E1828]'}`}
                >
                  {prayer.formattedAzan}
                </span>

                {!isCyrlLocked && !isCompactMobile && prayer.formattedIqamah && (
                  <span className="font-mono-numbers tabular-nums font-bold text-[clamp(0.95rem,1.9vh,2.25rem)] text-[#4B5B66] min-w-[3.4ch] text-right">
                    {prayer.formattedIqamah}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </main>

      {/* D. ADDITIONAL PRAYER TIMES SECTION (Thin Dividing Line + Left Duha, Right Sunrise) */}
      <section className="relative z-10 shrink-0 border-t border-[#1D2B2F]/35 px-[clamp(14px,4.5vw,60px)] py-[clamp(10px,1.8vh,30px)]">
        <div className="grid grid-cols-2 gap-4 items-center text-center">
          {/* LEFT: DUHA / ISHRAQ (Green Numerals as in Reference) */}
          <div>
            <div className="font-display font-extrabold uppercase tracking-[0.06em] text-[clamp(0.72rem,1.45vh,1.75rem)] text-[#243239]">
              {duhaLabel}
            </div>
            <div
              className={`mt-1 font-mono-numbers tabular-nums font-extrabold leading-none text-[#1A5836] ${
                isCompactMobile
                  ? 'text-[clamp(1.6rem,7.8vw,2.35rem)]'
                  : 'text-[clamp(2.2rem,4.7vh,5.7rem)]'
              }`}
            >
              {formattedDuha}
            </div>
          </div>

          {/* RIGHT: SUNRISE (Deep Burgundy Numerals as in Reference) */}
          <div>
            <div className="font-display font-extrabold uppercase tracking-[0.06em] text-[clamp(0.72rem,1.45vh,1.75rem)] text-[#243239]">
              {sunriseLabel}
            </div>
            <div
              className={`mt-1 font-mono-numbers tabular-nums font-extrabold leading-none text-[#62192A] ${
                isCompactMobile
                  ? 'text-[clamp(1.6rem,7.8vw,2.35rem)]'
                  : 'text-[clamp(2.2rem,4.7vh,5.7rem)]'
              }`}
            >
              {formattedSunrise}
            </div>
          </div>
        </div>
      </section>

      {/* E. BOTTOM FULL-WIDTH #1E6B38 GREEN BANNER (Left Juma, Right Next Azan After Countdown) */}
      <section className="relative z-10 shrink-0 bg-[#1E6B38] text-white px-[clamp(12px,3.5vw,52px)] py-[clamp(12px,2.2vh,36px)] mb-[clamp(8px,1.4vh,26px)]">
        <div className="grid grid-cols-2 items-center text-center divide-x divide-white/20">
          {/* LEFT: FRIDAY / JUMA PRAYER */}
          <div className="pr-2">
            <div className="font-display font-bold uppercase tracking-[0.06em] text-[clamp(0.76rem,1.65vh,2.05rem)] text-white/95 truncate">
              {jumaLabel}
            </div>
            <div
              className={`mt-1.5 font-mono-numbers tabular-nums font-extrabold leading-none tracking-[-0.02em] text-white ${
                isCompactMobile
                  ? 'text-[clamp(1.65rem,8.2vw,2.45rem)]'
                  : 'text-[clamp(2.3rem,5vh,6.2rem)]'
              }`}
            >
              {formattedJuma}
            </div>
          </div>

          {/* RIGHT: NEXT AZAN AFTER COUNTDOWN */}
          <div className="pl-2">
            <div className="font-display font-bold uppercase tracking-[0.06em] text-[clamp(0.76rem,1.65vh,2.05rem)] text-white/95 truncate">
              {nextAzanLabel}
            </div>
            <div
              className={`mt-1.5 font-mono-numbers tabular-nums font-extrabold leading-none tracking-[-0.02em] text-white ${
                isCompactMobile
                  ? 'text-[clamp(1.65rem,8.2vw,2.45rem)]'
                  : 'text-[clamp(2.3rem,5vh,6.2rem)]'
              }`}
            >
              {countdownShort}
              {settings.showSeconds && countdownSec && !isCompactMobile && (
                <span className="text-[0.52em] text-white/85 ml-1">:{countdownSec}</span>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
