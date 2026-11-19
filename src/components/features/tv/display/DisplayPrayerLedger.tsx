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
        aria-label={t.prayerColumnLabel}
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
                className={`relative flex flex-col justify-between px-[clamp(14px,2vw,36px)] py-[clamp(20px,3.2vh,50px)] transition-colors duration-300 ${
                  isActive
                    ? theme.activeRowClass
                    : isNext
                      ? theme.nextRowClass
                      : ''
                }`}
              >
                {/* Top indicator bar for Next Prayer */}
                {isNext && <div className="absolute inset-x-0 top-0 h-[4px] bg-[#9C752C]" />}

                {/* Top: Localized Prayer Name + Active / Next Status */}
                <div className="space-y-2">
                  <div
                    className={`font-display font-extrabold uppercase tracking-[0.08em] leading-tight text-[clamp(1.15rem,1.9vw,2.85rem)] truncate ${
                      isActive ? 'text-white' : theme.inkPrimary
                    }`}
                  >
                    {prayer.label}
                  </div>
                  <div className="min-h-[1.4em]">
                    {(isActive || isNext) && (
                      <span
                        className={`inline-block text-[clamp(0.7rem,0.92vw,1.2rem)] font-bold uppercase tracking-[0.12em] ${
                          isActive ? theme.activeAccentText : theme.goldText
                        }`}
                      >
                        {isActive ? t.currentPrayerBadge : t.nextPrayerBadge}
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle: Monumental Azan Time */}
                <div className="my-auto py-4">
                  <div
                    className={`text-[clamp(0.68rem,0.86vw,1.1rem)] font-bold uppercase tracking-[0.14em] mb-1.5 ${
                      isActive ? 'text-white/75' : theme.inkMuted
                    }`}
                  >
                    {t.azanColumnLabel}
                  </div>
                  <div
                    className={`font-mono-numbers tabular-nums font-extrabold tracking-[-0.03em] leading-none text-[clamp(2.4rem,4.5vw,6.8rem)] ${
                      isActive ? 'text-white' : theme.inkPrimary
                    }`}
                  >
                    {prayer.azanTime}
                  </div>
                </div>

                {/* Bottom: Large, High-Contrast Iqamah Row */}
                <div
                  className={`pt-4 border-t flex items-baseline justify-between gap-2 ${
                    isActive ? 'border-white/25' : theme.hairline
                  }`}
                >
                  <span
                    className={`text-[clamp(0.72rem,0.92vw,1.2rem)] font-bold uppercase tracking-[0.12em] ${
                      isActive ? 'text-white/80' : theme.inkMuted
                    }`}
                  >
                    {t.iqamahColumnLabel}
                  </span>
                  <span
                    className={`font-mono-numbers tabular-nums font-extrabold leading-none text-[clamp(1.45rem,2.45vw,3.7rem)] ${
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
  // 2. ROYAL IVORY · EMERALD ROYAL · MADINA PORTRAIT (Balanced 3-Column Ledger)
  //    Columns: 1) Prayer Name   2) Giant Azan Time   3) Large Iqamah Time
  // =========================================================================
  const isPortrait = profileId === 'madina_portrait';
  const isSanctuary = profileId === 'emerald_royal';

  return (
    <section
      aria-label={t.prayerColumnLabel}
      className={`flex-1 min-h-0 flex flex-col ${
        isSanctuary
          ? 'px-[clamp(24px,3.2vw,58px)] py-[clamp(18px,2.8vh,40px)]'
          : isPortrait
            ? 'px-[clamp(18px,3vw,42px)] py-[clamp(10px,1.4vh,20px)]'
            : 'px-[clamp(24px,3.4vw,64px)] py-[clamp(12px,1.6vh,24px)]'
      }`}
    >
      {/* Crisp 3-Column Header Bar */}
      <div
        className={`grid grid-cols-[1.4fr_1fr_1fr] items-center px-[clamp(16px,2.2vw,38px)] pb-[clamp(8px,1vh,14px)] border-b ${theme.accentHairline} ${theme.inkMuted} text-[clamp(0.72rem,0.95vw,1.28rem)] font-bold uppercase tracking-[0.14em]`}
      >
        <span>{t.prayerColumnLabel}</span>
        <span className="text-center">{t.azanColumnLabel}</span>
        <span className="text-right">{t.iqamahColumnLabel}</span>
      </div>

      {/* 5 Spacious Dominant Prayer Rows (Zero Empty Columns) */}
      <div className={`flex-1 min-h-0 flex flex-col justify-between divide-y ${theme.hairline}`}>
        {prayers.map((prayer) => {
          const isActive = prayer.isCurrent;
          const isNext = prayer.isNext && !isActive;

          return (
            <div
              key={prayer.key}
              className={`flex-1 min-h-0 grid grid-cols-[1.4fr_1fr_1fr] items-center px-[clamp(16px,2.2vw,38px)] transition-colors duration-300 ${
                isActive
                  ? `${theme.activeRowClass} rounded-xl my-[3px]`
                  : isNext
                    ? `${theme.nextRowClass} rounded-xl my-[3px]`
                    : ''
              }`}
            >
              {/* Col 1: Bold Localized Prayer Name + Crisp Active / Next Status */}
              <div className="min-w-0 pr-3">
                <div
                  className={`font-display font-extrabold uppercase tracking-[0.06em] leading-none truncate ${
                    isPortrait
                      ? 'text-[clamp(1.35rem,2.75vh,3.15rem)]'
                      : isSanctuary
                        ? 'text-[clamp(1.55rem,2.55vw,3.85rem)]'
                        : 'text-[clamp(1.65rem,2.75vw,4.1rem)]'
                  } ${isActive ? 'text-white' : theme.inkPrimary}`}
                >
                  {prayer.label}
                </div>
                {(isActive || isNext) && (
                  <div
                    className={`mt-1.5 text-[clamp(0.68rem,0.88vw,1.15rem)] font-bold uppercase tracking-[0.12em] truncate ${
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
                    ? 'text-[clamp(2.05rem,4.6vh,4.95rem)]'
                    : isSanctuary
                      ? 'text-[clamp(2.35rem,4.35vw,6.4rem)]'
                      : 'text-[clamp(2.45rem,4.65vw,6.9rem)]'
                } ${isActive ? 'text-white' : theme.inkPrimary}`}
              >
                {prayer.azanTime}
              </div>

              {/* Col 3: LARGE, Crisp Iqamah Time */}
              <div
                className={`text-right font-mono-numbers tabular-nums font-extrabold tracking-[-0.02em] leading-none ${
                  isPortrait
                    ? 'text-[clamp(1.55rem,3.35vh,3.65rem)]'
                    : isSanctuary
                      ? 'text-[clamp(1.75rem,3.15vw,4.7rem)]'
                      : 'text-[clamp(1.85rem,3.35vw,5rem)]'
                } ${isActive ? theme.activeAccentText : theme.inkSecondary}`}
              >
                {prayer.iqamahTime || '—'}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
