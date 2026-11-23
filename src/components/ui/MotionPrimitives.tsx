import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

export const PREMIUM_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

interface StaggerGridProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}

export const StaggerGrid: React.FC<StaggerGridProps> = ({
  children,
  className = '',
  staggerDelay = 0.045,
}) => {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
};

interface StaggerCardProps {
  children: React.ReactNode;
  className?: string;
}

export const StaggerCard: React.FC<StaggerCardProps> = ({
  children,
  className = '',
}) => {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.36,
            ease: PREMIUM_EASE,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
};

interface AnimatedProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  trackClassName?: string;
  strokeColor?: string;
  secondaryStrokeColor?: string;
  className?: string;
  children?: React.ReactNode;
}

export const AnimatedProgressRing: React.FC<AnimatedProgressRingProps> = ({
  progress,
  size = 176,
  strokeWidth = 7,
  trackClassName = 'stroke-white/15',
  strokeColor = '#D4AF37',
  secondaryStrokeColor = '#10B981',
  className = '',
  children,
}) => {
  const prefersReduced = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, Number.isFinite(progress) ? progress : 0));
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clamped / 100) * circumference;
  const gradientId = React.useId();

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90 overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={strokeColor} />
            <stop offset="100%" stopColor={secondaryStrokeColor} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={trackClassName}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          stroke={`url(#${gradientId})`}
          strokeDasharray={circumference}
          initial={false}
          animate={{ strokeDashoffset: dashOffset }}
          transition={
            prefersReduced
              ? { duration: 0 }
              : { type: 'spring', stiffness: 110, damping: 22, mass: 0.9 }
          }
        />
      </svg>
      {children ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
          {children}
        </div>
      ) : null}
    </div>
  );
};

interface AudioWaveformBarsProps {
  isPlaying: boolean;
  className?: string;
  barClassName?: string;
}

const BAR_PROFILES = [
  { rest: 0.35, active: [0.35, 0.95, 0.45, 0.85, 0.35], duration: 0.9 },
  { rest: 0.6, active: [0.6, 0.3, 1.0, 0.4, 0.6], duration: 0.78 },
  { rest: 0.45, active: [0.45, 0.9, 0.35, 0.95, 0.45], duration: 0.86 },
  { rest: 0.55, active: [0.55, 0.4, 0.85, 0.3, 0.55], duration: 0.72 },
];

export const AudioWaveformBars: React.FC<AudioWaveformBarsProps> = ({
  isPlaying,
  className = '',
  barClassName = 'bg-amber-400',
}) => {
  const prefersReduced = useReducedMotion();

  return (
    <div
      className={`flex items-end gap-[2.5px] h-4 ${className}`}
      aria-hidden="true"
    >
      {BAR_PROFILES.map((bar, idx) => (
        <motion.span
          key={idx}
          className={`w-[3px] h-full rounded-full origin-bottom ${barClassName}`}
          initial={false}
          animate={
            isPlaying && !prefersReduced
              ? { scaleY: bar.active }
              : { scaleY: isPlaying ? 0.72 : bar.rest }
          }
          transition={
            isPlaying && !prefersReduced
              ? {
                  duration: bar.duration,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }
              : { duration: 0.25, ease: PREMIUM_EASE }
          }
        />
      ))}
    </div>
  );
};

interface ArchitecturalDividerProps {
  className?: string;
}

export const ArchitecturalDivider: React.FC<ArchitecturalDividerProps> = ({
  className = '',
}) => (
  <div
    className={`flex items-center gap-3 w-full ${className}`}
    aria-hidden="true"
  >
    <span className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/35 to-amber-500/15" />
    <span className="w-1.5 h-1.5 rotate-45 border border-amber-500/50 bg-amber-400/20" />
    <span className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-500/35 to-amber-500/15" />
  </div>
);
