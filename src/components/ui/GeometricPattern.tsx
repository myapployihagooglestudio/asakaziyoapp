import React from 'react';

interface GeometricPatternProps {
  className?: string;
  opacity?: number;
}

/**
 * Authentic subtle Islamic geometric pattern (Girih & 12-pointed Samarkand/Asaka star motif)
 * Provides restrained architectural character and layered depth.
 */
export const GeometricPattern: React.FC<GeometricPatternProps> = ({
  className = '',
  opacity = 0.045,
}) => {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden select-none ${className}`}
      style={{ opacity }}
    >
      <svg
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        width="96"
        height="96"
        fill="none"
      >
        <defs>
          <pattern id="girih-pattern-2026" width="96" height="96" patternUnits="userSpaceOnUse">
            <path
              d="M48 4 L58 26 L82 14 L70 38 L92 48 L70 58 L82 82 L58 70 L48 92 L38 70 L14 82 L26 58 L4 48 L26 38 L14 14 L38 26 Z"
              stroke="#C6A45C"
              strokeWidth="0.9"
              fill="none"
            />
            <path
              d="M48 18 L55 35 L73 35 L59 46 L64 64 L48 53 L32 64 L37 46 L23 35 L41 35 Z"
              stroke="#DCC58C"
              strokeWidth="0.5"
              fill="none"
            />
            <path
              d="M0 0 L96 96 M96 0 L0 96 M48 0 L48 96 M0 48 L96 48"
              stroke="#C6A45C"
              strokeWidth="0.4"
              strokeDasharray="2 4"
              fill="none"
            />
            <circle cx="48" cy="48" r="16" stroke="#C6A45C" strokeWidth="0.7" fill="none" />
            <circle cx="48" cy="48" r="5" stroke="#DCC58C" strokeWidth="0.5" fill="none" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#girih-pattern-2026)" />
      </svg>
    </div>
  );
};

export const IslamicStarEmblem: React.FC<{ className?: string; size?: number }> = ({
  className = 'w-6 h-6 text-[#C6A45C]',
  size = 24,
}) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 1.5l2.7 4 4.8-.6 1 4.7 4 2.4-2.4 4 1 4.7-4.8-.6L15.6 24l-3.6-2.7-3.6 2.7-2.7-3.9-4.8.6 1-4.7-2.4-4 4-2.4 1-4.7 4.8.6L12 1.5zm0 6.2a4.3 4.3 0 100 8.6 4.3 4.3 0 000-8.6z" />
  </svg>
);

export const IslamicHairlineDivider: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center gap-4 my-2 ${className}`} aria-hidden="true">
    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#C6A45C]/35 to-[#C6A45C]/35" />
    <IslamicStarEmblem size={14} className="text-[#C6A45C]/75 shrink-0" />
    <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[#C6A45C]/35 to-[#C6A45C]/35" />
  </div>
);

/**
 * Architectural Mihrab Arch Silhouette for Hero and Prayer Sections
 */
export const IslamicMihrabArch: React.FC<{ className?: string; opacity?: number }> = ({
  className = '',
  opacity,
}) => (
  <svg
    viewBox="0 0 400 500"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`pointer-events-none select-none ${className}`}
    style={opacity !== undefined ? { opacity } : undefined}
    aria-hidden="true"
  >
    <path
      d="M20 490 V220 C20 110 110 35 200 12 C290 35 380 110 380 220 V490"
      stroke="url(#mihrab-gold-grad)"
      strokeWidth="1.5"
      strokeOpacity="0.45"
    />
    <path
      d="M36 490 V225 C36 125 118 54 200 32 C282 54 364 125 364 225 V490"
      stroke="url(#mihrab-gold-grad)"
      strokeWidth="0.75"
      strokeDasharray="4 4"
      strokeOpacity="0.3"
    />
    <defs>
      <linearGradient id="mihrab-gold-grad" x1="200" y1="12" x2="200" y2="490" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#DCC58C" />
        <stop offset="50%" stopColor="#C6A45C" />
        <stop offset="100%" stopColor="#C6A45C" stopOpacity="0" />
      </linearGradient>
    </defs>
  </svg>
);

/**
 * Authentic Calligraphic Basmalah Ornament Header
 */
export const CalligraphyBasmalahBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-[#042B25]/70 dark:bg-[#031814]/80 border border-[#C6A45C]/40 backdrop-blur-md shadow-sm ${className}`}
  >
    <IslamicStarEmblem size={13} className="text-[#DCC58C] animate-float-slow" />
    <span
      dir="rtl"
      className="font-arabic text-base sm:text-lg text-[#F8F5EC] tracking-wide leading-none py-0.5"
    >
      بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
    </span>
    <IslamicStarEmblem size={13} className="text-[#DCC58C] animate-float-slow" />
  </div>
);
