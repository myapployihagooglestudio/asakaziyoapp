import React from 'react';

interface GeometricPatternProps {
  className?: string;
  opacity?: number;
}

/**
 * Authentic subtle Islamic geometric pattern (Girih & 8-pointed star motif)
 * Provides restrained cultural character without cluttering content.
 */
export const GeometricPattern: React.FC<GeometricPatternProps> = ({
  className = '',
  opacity = 0.04,
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
        width="80"
        height="80"
        fill="none"
      >
        <defs>
          <pattern id="girih-pattern" width="80" height="80" patternUnits="userSpaceOnUse">
            {/* 8-pointed star rosette */}
            <path
              d="M40 0 L49 21 L70 12 L61 33 L80 40 L61 47 L70 68 L49 59 L40 80 L31 59 L10 68 L19 47 L0 40 L19 33 L10 12 L31 21 Z"
              stroke="#c5a869"
              strokeWidth="1"
              fill="none"
            />
            {/* Interlacing structural lines */}
            <path
              d="M0 0 L80 80 M80 0 L0 80 M40 0 L40 80 M0 40 L80 40"
              stroke="#c5a869"
              strokeWidth="0.5"
              strokeDasharray="2 3"
              fill="none"
            />
            <circle cx="40" cy="40" r="14" stroke="#c5a869" strokeWidth="0.75" fill="none" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#girih-pattern)" />
      </svg>
    </div>
  );
};

export const IslamicStarEmblem: React.FC<{ className?: string; size?: number }> = ({
  className = 'w-6 h-6 text-[#c5a869]',
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
    <path d="M12 2l2.6 3.8 4.6-.5 1 4.5 4 2.2-2.2 4 1 4.5-4.6-.5L15.8 24l-3.8-2.6-3.8 2.6-2.6-3.9-4.6.5 1-4.5-4-2.2 2.2-4-1-4.5 4.6.5L8.2 2 12 4.6 12 2z" />
  </svg>
);
