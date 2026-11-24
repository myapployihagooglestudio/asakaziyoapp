import React, { useEffect, useRef, useState } from 'react';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
} from 'motion/react';

export const PREMIUM_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Detects whether the current device has a fine hover-capable pointer (desktop/trackpad).
 * Keeps mobile touch devices 100% free of unnecessary pointer-tracking work.
 */
function useFinePointer(): boolean {
  const [isFine, setIsFine] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setIsFine(mq.matches);
    update();
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    }
    return undefined;
  }, []);

  return isFine;
}

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

/**
 * Scroll-linked hairline reading progress bar pinned cleanly to the viewport top edge.
 * Uses GPU scaleX transform via useScroll + useSpring.
 */
export const ScrollProgressBar: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  const prefersReduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 240,
    damping: 32,
    restDelta: 0.001,
  });

  if (prefersReduced) return null;

  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX }}
      className={`fixed top-0 left-0 right-0 h-[2.5px] origin-left z-[60] pointer-events-none bg-gradient-to-r from-[#10B981] via-[#34D399] to-[#C8A85E] ${className}`}
    />
  );
};

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  yOffset?: number;
}

/**
 * Calm Apple-inspired viewport entrance reveal. GPU transform + opacity only.
 */
export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className = '',
  delay = 0,
  yOffset = 14,
}) => {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: yOffset }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.42, delay, ease: PREMIUM_EASE }}
    >
      {children}
    </motion.div>
  );
};

interface MagneticWrapperProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}

/**
 * Subtle magnetic cursor attraction for flagship desktop CTAs.
 * Automatically disabled on touch devices and prefers-reduced-motion.
 */
export const MagneticWrapper: React.FC<MagneticWrapperProps> = ({
  children,
  className = '',
  strength = 6,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const isFinePointer = useFinePointer();

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 260, damping: 20, mass: 0.4 });
  const y = useSpring(rawY, { stiffness: 260, damping: 20, mass: 0.4 });

  if (prefersReduced || !isFinePointer) {
    return <div className={`inline-block ${className}`}>{children}</div>;
  }

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width - 0.5;
    const relY = (e.clientY - rect.top) / rect.height - 0.5;
    rawX.set(relX * strength * 2);
    rawY.set(relY * strength * 2);
  };

  const handleLeave = () => {
    rawX.set(0);
    rawY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      style={{ x, y }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`inline-block will-change-transform ${className}`}
    >
      {children}
    </motion.div>
  );
};

interface SpatialTiltCardProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  glowColor?: string;
  onClick?: () => void;
}

/**
 * Spatial 3D perspective card with subtle pointer-tracked light reflection.
 * Strictly capped to ±maxTilt degrees (default 3.5deg), desktop fine-pointer only.
 */
export const SpatialTiltCard: React.FC<SpatialTiltCardProps> = ({
  children,
  className = '',
  maxTilt = 3.5,
  glowColor = 'rgba(16, 185, 129, 0.16)',
  onClick,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const isFinePointer = useFinePointer();
  const [spotlight, setSpotlight] = useState<{ x: number; y: number; active: boolean }>({
    x: 50,
    y: 50,
    active: false,
  });

  const rawRotateX = useMotionValue(0);
  const rawRotateY = useMotionValue(0);
  const rotateX = useSpring(rawRotateX, { stiffness: 220, damping: 24, mass: 0.6 });
  const rotateY = useSpring(rawRotateY, { stiffness: 220, damping: 24, mass: 0.6 });

  const enabled = !prefersReduced && isFinePointer;

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    rawRotateX.set((0.5 - py) * maxTilt * 2);
    rawRotateY.set((px - 0.5) * maxTilt * 2);
    setSpotlight({ x: Math.round(px * 100), y: Math.round(py * 100), active: true });
  };

  const handleLeave = () => {
    if (!enabled) return;
    rawRotateX.set(0);
    rawRotateY.set(0);
    setSpotlight((prev) => ({ ...prev, active: false }));
  };

  return (
    <div style={enabled ? { perspective: 1000 } : undefined} className="h-full">
      <motion.div
        ref={ref}
        onClick={onClick}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        style={enabled ? { rotateX, rotateY, transformStyle: 'preserve-3d' } : undefined}
        className={`relative h-full will-change-transform ${className}`}
      >
        {enabled && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300 z-10"
            style={{
              opacity: spotlight.active ? 1 : 0,
              background: `radial-gradient(420px circle at ${spotlight.x}% ${spotlight.y}%, ${glowColor}, transparent 65%)`,
            }}
          />
        )}
        {children}
      </motion.div>
    </div>
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
  strokeColor = '#C8A85E',
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
  barClassName = 'bg-[#C8A85E]',
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

interface AiThinkingWaveProps {
  label?: string;
  className?: string;
}

/**
 * Refined AI Ustoz thinking/streaming indicator — smooth emerald/champagne wave pulses.
 */
export const AiThinkingWave: React.FC<AiThinkingWaveProps> = ({
  label = 'Tahlil qilinmoqda...',
  className = '',
}) => {
  const prefersReduced = useReducedMotion();
  const dots = [0, 0.14, 0.28, 0.42];

  return (
    <div className={`inline-flex items-center gap-3 ${className}`} role="status" aria-live="polite">
      <div className="flex items-center gap-1 h-4" aria-hidden="true">
        {dots.map((delay, i) => (
          <motion.span
            key={i}
            className={`w-1.5 rounded-full ${
              i % 2 === 0 ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-[#C8A85E]'
            }`}
            style={{ height: i % 2 === 0 ? 14 : 10 }}
            animate={
              prefersReduced
                ? { opacity: 0.7 }
                : { scaleY: [0.45, 1.15, 0.45], opacity: [0.5, 1, 0.5] }
            }
            transition={
              prefersReduced
                ? { duration: 0 }
                : {
                    duration: 1.05,
                    repeat: Infinity,
                    delay,
                    ease: 'easeInOut',
                  }
            }
          />
        ))}
      </div>
      <span className="text-xs font-medium text-[#5F776F] dark:text-[#9CAFA7]">
        {label}
      </span>
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
    <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#C8A85E]/35 to-[#C8A85E]/15" />
    <span className="w-1.5 h-1.5 rotate-45 border border-[#C8A85E]/50 bg-[#C8A85E]/20" />
    <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[#C8A85E]/35 to-[#C8A85E]/15" />
  </div>
);
