import React from 'react';

export const DEVELOPER_ATTRIBUTION_TEXT = 'Dev by Ulug‘bek Mirzayev';
export const DEVELOPER_ATTRIBUTION_URL = 'https://t.me/Ulugbek_Mirzayev_uz';

interface DeveloperAttributionProps {
  className?: string;
  compact?: boolean;
}

/**
 * ASAKA ZIYO — Unified Cross-Platform Developer Attribution
 * Small, subtle, high-contrast clickable attribution consistent across all locales,
 * light/dark themes, mobile, tablet, desktop, TV, and Telegram Mini App.
 */
export const DeveloperAttribution: React.FC<DeveloperAttributionProps> = ({
  className = '',
  compact = false,
}) => {
  return (
    <div
      className={`w-full flex items-center justify-center ${
        compact ? 'py-2' : 'pt-4 pb-1'
      } ${className}`}
    >
      <a
        href={DEVELOPER_ATTRIBUTION_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Dev by Ulug‘bek Mirzayev — Telegram"
        className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-medium tracking-[0.02em] text-[#5F776F]/85 dark:text-[#8FA69D]/80 hover:text-[#064E3B] dark:hover:text-[#D8BC78] transition-colors duration-200 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A85E]/60 rounded-md px-2 py-0.5"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#C8A85E]/70 shrink-0" aria-hidden="true" />
        <span>{DEVELOPER_ATTRIBUTION_TEXT}</span>
      </a>
    </div>
  );
};
