import React from 'react';
import { CanonicalDisplayProfileId } from '../../../../utils/smartMosqueDisplayEngine';
import { SmartDisplayLocaleBundle } from '../../../../utils/smartMosqueDisplayI18n';
import { DisplayPrayerRowItem, DisplayProfileTheme } from './displayProfiles';

interface DisplayPrayerLedgerProps {
  profileId: CanonicalDisplayProfileId;
  theme: DisplayProfileTheme;
  prayers: DisplayPrayerRowItem[];
  t: SmartDisplayLocaleBundle;
}

export const DisplayPrayerLedger: React.FC<DisplayPrayerLedgerProps> = ({
  profileId,
  theme,
  prayers,
  t,
}) => {
  // =========================================================================
  // 1. MODERN MINIMAL — 5-Column Swiss-Editorial Architectural Prayer Strip
  // =========================================================================
  if (profileId === 'modern_minimal') {
    return (
      <section
        aria-label="Prayer Times"
        className="flex-1 min-h-0 flex flex-col px-[clamp(20px,3vw,56px)] py-[clamp(14px,2vh,32px)]"
      >
        <div
          className={`flex-1 min-h-0 grid grid-cols-5 border-y ${theme.hairline} divide-x ${theme.hairline}`}
        >
          {prayers.map((prayer) => {
            const isActive = prayer.isCurrent;
            const isNext = prayer.isNext && !isActive;

            return (
              <div
                key={prayer.key}
                className={`relative flex flex-col justify-between px-[clamp(12px,1.8vw,32px)] py-[clamp(18px,3vh,46px)] transition-colors duration-300 ${
                  isActive
                    ? theme.activeRowClass
                    : isNext
                      ? theme.nextRowClass
                      : ''
                }`}
              >
                {/* Top indicator bar for Next Prayer */}
                {isNext && (
                  <div className="absolute inset-x-0 top-0 h-[4px] bg-[#9C752C]" />
                )}

                {/* Top: Arabic Calligraphy + Localized Prayer Name */}
                <div className="space-y-1.5">
                  <div
                    dir="rtl"
                    className={`font-arabic-signage font-bold text-right text-[clamp(1.6rem,2.6vw,3.9rem)] ${
                      isActive ? theme.activeAccentText : theme.inkPrimary
                    }`}
                  >
                    {prayer.nameAr}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`font-display font-extrabold uppercase tracking-[0.08em] text-[clamp(0.95rem,1.45vw,2.1rem)] truncate ${
                        isActive ? 'text-white' : theme.inkPrimary
                      }`}
                    >
                      {prayer.label}
                    </span>
                  </div>
                  <div className="min-h-[1.3em]">
                    {(isActive || isNext) && (
                      <span
                        className={`inline-block text-[clamp(0.65rem,0.82vw,1.05rem)] font-bold uppercase tracking-[0.12em] ${
                          isActive ? theme.activeAccentText : theme.goldText
                        }`}
                      >
                        {isActive ? t.currentPrayerBadge : t.nextPrayerBadge}
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle: Monumental Azan Time */}
                <div className="my-auto py-3">
                  <div
                    className={`text-[clamp(0.64rem,0.78vw,0.98rem)] font-bold uppercase tracking-[0.14em] mb-1 ${
                      isActive ? 'text-white/70' : theme.inkMuted
                    }`}
                  >
                    {t.azanColumnLabel}
                  </div>
                  <div
                    className={`font-mono-numbers tabular-nums font-extrabold tracking-[-0.03em] leading-none text-[clamp(2.2rem,4.1vw,6.2rem)] ${
                      isActive ? 'text-white' : theme.inkPrimary
                    }`}
                  >
                    {prayer.azanTime}
                  </div>
                </div>

                {/* Bottom: Crisp Iqamah Row */}
                <div
                  className={`pt-3 border-t flex items-baseline justify-between gap-2 ${
                    isActive ? 'border-white/20' : theme.hairline
                  }`}
                >
                  <span
                    className={`text-[clamp(0.68rem,0.85vw,1.1rem)] font-bold uppercase tracking-[0.12em] ${
                      isActive ? 'text-white/75' : theme.inkMuted
                    }`}
                  >
                    {t.iqamahColumnLabel}
                  </span>
                  <span
                    className={`font-mono-numbers tabular-nums font-bold leading-none text-[clamp(1.25rem,2vw,3rem)] ${
                      isActive ? theme.activeAccentText : theme.inkSecondary
                    }`}
                  >
                    {prayer.iqamahTime || '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  // =========================================================================
  // 2. ROYAL IVORY · EMERALD ROYAL · MADINA PORTRAIT (Monumental 5-Row Ledger)
  // =========================================================================
  const isPortrait = profileId === 'madina_portrait';
  const isSanctuary = profileId === 'emerald_royal';

  return (
    <section
      aria-label="Prayer Times"
      className={`flex-1 min-h-0 flex flex-col ${
        isSanctuary
          ? 'px-[clamp(22px,3vw,54px)] py-[clamp(18px,2.8vh,40px)]'
          : isPortrait
            ? 'px-[clamp(16px,2.8vw,38px)] py-[clamp(8px,1.2vh,18px)]'
            : 'px-[clamp(20px,3vw,56px)] py-[clamp(10px,1.5vh,22px)]'
      }`}
    >
      {/* Subtle 4-column header bar */}
      <div
        className={`grid grid-cols-[1.2fr_1.05fr_0.85fr_1.1fr] items-center px-[clamp(12px,1.8vw,32px)] pb-[clamp(6px,0.9vh,12px)] border-b ${theme.accentHairline} ${theme.inkMuted} text-[clamp(0.66rem,0.85vw,1.15rem)] font-bold uppercase tracking-[0.14em]`}
      >
        <span>{t.timeColumnLabel}</span>
        <span className="text-center">{t.azanColumnLabel}</span>
        <span className="text-center">{t.iqamahColumnLabel}</span>
        <span dir="rtl" className="text-right font-arabic-signage normal-case tracking-normal text-[1.3em]">
          الصلاة
        </span>
      </div>

      {/* 5 Spacious Dominant Prayer Rows */}
      <div className={`flex-1 min-h-0 flex flex-col justify-between divide-y ${theme.hairline}`}>
        {prayers.map((prayer) => {
          const isActive = prayer.isCurrent;
          const isNext = prayer.isNext && !isActive;

          return (
            <div
              key={prayer.key}
              className={`flex-1 min-h-0 grid grid-cols-[1.2fr_1.05fr_0.85fr_1.1fr] items-center px-[clamp(12px,1.8vw,32px)] transition-colors duration-300 ${
                isActive
                  ? `${theme.activeRowClass} rounded-xl my-[2px]`
                  : isNext
                    ? `${theme.nextRowClass} rounded-xl my-[2px]`
                    : ''
              }`}
            >
              {/* Col 1: Localized Prayer Name + Quiet Active/Next Cue */}
              <div className="min-w-0 pr-2">
                <div
                  className={`font-display font-extrabold uppercase tracking-[0.06em] leading-none truncate ${
                    isPortrait
                      ? 'text-[clamp(1.2rem,2.45vh,2.75rem)]'
                      : isSanctuary
                        ? 'text-[clamp(1.35rem,2.2vw,3.3rem)]'
                        : 'text-[clamp(1.4rem,2.35vw,3.5rem)]'
                  } ${isActive ? 'text-white' : theme.inkPrimary}`}
                >
                  {prayer.label}
                </div>
                {(isActive || isNext) && (
                  <div
                    className={`mt-1 text-[clamp(0.62rem,0.78vw,1.02rem)] font-bold uppercase tracking-[0.1em] truncate ${
                      isActive ? theme.activeAccentText : theme.goldText
                    }`}
                  >
                    {isActive ? t.currentPrayerBadge : t.nextPrayerBadge}
                  </div>
                )}
              </div>

              {/* Col 2: GIANT Azan Time */}
              <div
                className={`text-center font-mono-numbers tabular-nums font-extrabold tracking-[-0.025em] leading-none ${
                  isPortrait
                    ? 'text-[clamp(1.85rem,4.25vh,4.5rem)]'
                    : isSanctuary
                      ? 'text-[clamp(2.1rem,3.9vw,5.8rem)]'
                      : 'text-[clamp(2.2rem,4.1vw,6.1rem)]'
                } ${isActive ? 'text-white' : theme.inkPrimary}`}
              >
                {prayer.azanTime}
              </div>

              {/* Col 3: Crisp Iqamah Time */}
              <div
                className={`text-center font-mono-numbers tabular-nums font-bold tracking-[-0.02em] leading-none ${
                  isPortrait
                    ? 'text-[clamp(1.2rem,2.55vh,2.7rem)]'
                    : isSanctuary
                      ? 'text-[clamp(1.35rem,2.3vw,3.4rem)]'
                      : 'text-[clamp(1.35rem,2.35vw,3.5rem)]'
                } ${isActive ? theme.activeAccentText : theme.inkSecondary}`}
              >
                {prayer.iqamahTime || '—'}
              </div>

              {/* Col 4: RTL Arabic Calligraphic Title */}
              <div
                dir="rtl"
                className={`text-right font-arabic-signage font-bold ${
                  isPortrait
                    ? 'text-[clamp(1.65rem,3.8vh,4.1rem)]'
                    : isSanctuary
                      ? 'text-[clamp(1.85rem,3.3vw,4.9rem)]'
                      : 'text-[clamp(1.9rem,3.4vw,5.1rem)]'
                } ${isActive ? theme.activeAccentText : theme.inkPrimary}`}
              >
                {prayer.nameAr}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
