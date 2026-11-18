import React from 'react';

interface GeometricPatternProps {
  className?: string;
  opacity?: number;
}

/**
 * Authentic subtle Islamic geometric pattern (Girih & 16-pointed Samarkand/Mamluk/Timurid star motif)
 * Provides restrained architectural character and layered depth.
 */
export const GeometricPattern: React.FC<GeometricPatternProps> = ({
  className = '',
  opacity = 0.048,
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
        width="104"
        height="104"
        fill="none"
      >
        <defs>
          <linearGradient id="girih-metallic-gold" x1="0" y1="0" x2="104" y2="104" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#8A6621" />
            <stop offset="28%" stopColor="#DFBD69" />
            <stop offset="52%" stopColor="#FFF6C8" />
            <stop offset="78%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#7A5818" />
          </linearGradient>
          <pattern id="girih-pattern-2026" width="104" height="104" patternUnits="userSpaceOnUse">
            <path
              d="M52 4 L63 28 L88 15 L75 40 L100 52 L75 64 L88 89 L63 76 L52 100 L41 76 L16 89 L29 64 L4 52 L29 40 L16 15 L41 28 Z"
              stroke="url(#girih-metallic-gold)"
              strokeWidth="0.95"
              fill="none"
            />
            <path
              d="M52 20 L60 38 L79 38 L64 50 L69 69 L52 57 L35 69 L40 50 L25 38 L44 38 Z"
              stroke="#DFBD69"
              strokeWidth="0.55"
              fill="none"
            />
            <path
              d="M0 0 L104 104 M104 0 L0 104 M52 0 L52 104 M0 52 L104 52"
              stroke="#D4AF37"
              strokeWidth="0.38"
              strokeDasharray="2 4"
              fill="none"
            />
            <circle cx="52" cy="52" r="18" stroke="url(#girih-metallic-gold)" strokeWidth="0.7" fill="none" />
            <circle cx="52" cy="52" r="5.5" stroke="#FFF6C8" strokeWidth="0.5" fill="none" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#girih-pattern-2026)" />
      </svg>
    </div>
  );
};

export const IslamicStarEmblem: React.FC<{ className?: string; size?: number }> = ({
  className = 'w-6 h-6 text-[#DFBD69]',
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
    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#DFBD69]/45 to-[#D4AF37]/45" />
    <IslamicStarEmblem size={14} className="text-[#DFBD69] shrink-0" />
    <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[#DFBD69]/45 to-[#D4AF37]/45" />
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
      strokeWidth="1.6"
      strokeOpacity="0.55"
    />
    <path
      d="M36 490 V225 C36 125 118 54 200 32 C282 54 364 125 364 225 V490"
      stroke="url(#mihrab-gold-grad)"
      strokeWidth="0.85"
      strokeDasharray="4 4"
      strokeOpacity="0.38"
    />
    <defs>
      <linearGradient id="mihrab-gold-grad" x1="200" y1="12" x2="200" y2="490" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFF6C8" />
        <stop offset="45%" stopColor="#DFBD69" />
        <stop offset="80%" stopColor="#D4AF37" />
        <stop offset="100%" stopColor="#8A6621" stopOpacity="0" />
      </linearGradient>
    </defs>
  </svg>
);

/**
 * Authentic Calligraphic Basmalah Ornament Header
 */
export const CalligraphyBasmalahBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-[#03170F]/85 border border-[#DFBD69]/50 backdrop-blur-md shadow-[0_6px_20px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,246,200,0.2)] ${className}`}
  >
    <IslamicStarEmblem size={13} className="text-[#DFBD69] animate-float-slow" />
    <span
      dir="rtl"
      className="font-arabic text-base sm:text-lg text-[#FFF8E8] tracking-wide leading-none py-0.5 drop-shadow-[0_2px_8px_rgba(223,189,105,0.3)]"
    >
      بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
    </span>
    <IslamicStarEmblem size={13} className="text-[#DFBD69] animate-float-slow" />
  </div>
);

/**
 * 4-Corner Oriental Islamic Arabesque Ornaments (SVG Metallic Gold Filigree)
 */
export const ArabesqueCornerOrnaments: React.FC<{
  size?: number;
  className?: string;
}> = ({ size = 26, className = '' }) => {
  const corners = [
    'top-2.5 left-2.5 rotate-0',
    'top-2.5 right-2.5 rotate-90',
    'bottom-2.5 right-2.5 rotate-180',
    'bottom-2.5 left-2.5 -rotate-90',
  ];
  return (
    <>
      {corners.map((pos, idx) => (
        <svg
          key={idx}
          viewBox="0 0 36 36"
          width={size}
          height={size}
          fill="none"
          aria-hidden="true"
          className={`pointer-events-none absolute ${pos} opacity-75 select-none ${className}`}
        >
          <path
            d="M2 34 V12 C2 6.5 6.5 2 12 2 H34"
            stroke="#DFBD69"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M6 26 V13 C6 9.1 9.1 6 13 6 H26"
            stroke="#FFF6C8"
            strokeWidth="0.9"
            strokeOpacity="0.65"
            strokeLinecap="round"
          />
          <path d="M11 7 L14 10 L11 13 L8 10 Z" fill="#DFBD69" />
          <circle cx="5.5" cy="5.5" r="1.8" fill="#FFF6C8" />
        </svg>
      ))}
    </>
  );
};

/**
 * 8-Pointed Rub el Hizb Star Badge for numbers, ranks, and icons
 */
export const RubElHizbBadge: React.FC<{
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  className?: string;
}> = ({ children, size = 'md', active = false, className = '' }) => {
  const dims =
    size === 'sm' ? 'w-7 h-7 text-[11px]' : size === 'lg' ? 'w-11 h-11 text-sm' : 'w-9 h-9 text-xs';
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${dims} ${className}`}>
      <svg viewBox="0 0 40 40" className="absolute inset-0 w-full h-full" aria-hidden="true">
        <g transform="translate(20,20)">
          <rect
            x="-12"
            y="-12"
            width="24"
            height="24"
            rx="2.5"
            fill={active ? 'rgba(16,185,129,0.28)' : 'rgba(223,189,105,0.14)'}
            stroke={active ? '#FFF6C8' : '#DFBD69'}
            strokeWidth="1.4"
          />
          <rect
            x="-12"
            y="-12"
            width="24"
            height="24"
            rx="2.5"
            transform="rotate(45)"
            fill={active ? 'rgba(4,120,87,0.45)' : 'rgba(3,23,15,0.72)'}
            stroke={active ? '#FFF6C8' : '#DFBD69'}
            strokeWidth="1.4"
          />
        </g>
      </svg>
      <span className="relative z-10 font-bold text-[#FFF6C8] leading-none">{children}</span>
    </div>
  );
};

/**
 * Subtle Volumetric God-Rays for Hero Sections
 */
export const VolumetricGodRays: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    aria-hidden="true"
    className={`pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[130%] h-[360px] select-none opacity-65 mix-blend-screen ${className}`}
    style={{
      background:
        'conic-gradient(from 180deg at 50% 0%, transparent 0deg, rgba(223, 189, 105, 0.14) 18deg, transparent 36deg, rgba(52, 211, 153, 0.12) 55deg, rgba(255, 246, 200, 0.18) 72deg, transparent 95deg, rgba(223, 189, 105, 0.12) 115deg, transparent 140deg)',
      filter: 'blur(26px)',
    }}
  />
);

