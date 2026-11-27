import React, { useEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MOTION_EASING, MOTION_SPRINGS, triggerTactileHaptic } from '../../utils/motionSystem';

export { MOTION_EASING, MOTION_SPRINGS };
export const PREMIUM_EASE: [number, number, number, number] = MOTION_EASING.expoOut;

/**
 * Detects whether the current device has a fine hover-capable pointer (desktop/trackpad).
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

/* ============================================================================
   1. STAGGER GRID & CARD REVEALS
   ============================================================================ */
interface StaggerGridProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}

export const StaggerGrid: React.FC<StaggerGridProps> = ({
  children,
  className = '',
  staggerDelay = 0.042,
}) => {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.08 }}
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
        hidden: { opacity: 0, y: 14, scale: 0.985 },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            duration: 0.38,
            ease: PREMIUM_EASE,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
};

/* ============================================================================
   2. ADVANCED SCROLL ANIMATION ENGINE (PROGRESS, PARALLAX, ZOOM, 3D PANEL,
      STICKY PEEL STACK, SVG PATH DRAWING, HORIZONTAL DECK)
   ============================================================================ */

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

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className = '',
  delay = 0,
  yOffset = 18,
}) => {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: yOffset, scale: 0.99 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.46, delay, ease: PREMIUM_EASE }}
    >
      {children}
    </motion.div>
  );
};

interface ParallaxLayerProps {
  children: React.ReactNode;
  className?: string;
  offsetY?: number;
}

/**
 * Multi-layer GPU scroll parallax driven by Framer Motion useScroll + useTransform.
 */
export const ParallaxLayer: React.FC<ParallaxLayerProps> = ({
  children,
  className = '',
  offsetY = 36,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [offsetY, -offsetY]);

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y }} className="will-change-transform">
        {children}
      </motion.div>
    </div>
  );
};

interface ScrollZoomHeroProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Scroll Zoom Hero: smoothly scales and adds spatial depth as user scrolls past the hero.
 */
export const ScrollZoomHero: React.FC<ScrollZoomHeroProps> = ({
  children,
  className = '',
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.965]);
  const y = useTransform(scrollYProgress, [0, 1], [0, 26]);
  const opacity = useTransform(scrollYProgress, [0, 0.85, 1], [1, 0.96, 0.86]);

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div ref={ref} className={className}>
      <motion.div
        style={{ scale, y, opacity }}
        className="origin-top will-change-transform"
      >
        {children}
      </motion.div>
    </div>
  );
};

interface PerspectiveScrollPanelProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Perspective 3D Panel: glides from a subtle 3D forward tilt into flush architectural plane on scroll.
 */
export const PerspectiveScrollPanel: React.FC<PerspectiveScrollPanelProps> = ({
  children,
  className = '',
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'center center'],
  });

  const rotateX = useTransform(scrollYProgress, [0, 1], [7, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.97, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.45, 1], [0.55, 0.92, 1]);

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div ref={ref} style={{ perspective: 1200 }} className={className}>
      <motion.div
        style={{ rotateX, scale, opacity, transformStyle: 'preserve-3d' }}
        className="will-change-transform"
      >
        {children}
      </motion.div>
    </div>
  );
};

interface ScrollSvgPathProps {
  className?: string;
}

/**
 * Scroll-Driven SVG Islamic Geometric Arch & Ribbon Path Drawing.
 */
export const ScrollSvgPath: React.FC<ScrollSvgPathProps> = ({ className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 92%', 'end 38%'],
  });
  const pathLength = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <div ref={ref} aria-hidden="true" className={`w-full overflow-hidden ${className}`}>
      <svg
        viewBox="0 0 1200 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-9"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="azScrollPathGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.15" />
            <stop offset="35%" stopColor="#10B981" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#C8A85E" stopOpacity="1" />
            <stop offset="65%" stopColor="#10B981" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#C8A85E" stopOpacity="0.15" />
          </linearGradient>
        </defs>
        <motion.path
          d="M0 22 H460 L490 8 L520 22 L560 22 L582 6 L600 22 L618 6 L640 22 L680 22 L710 8 L740 22 H1200"
          stroke="url(#azScrollPathGrad)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={prefersReduced ? undefined : { pathLength }}
        />
        <motion.path
          d="M0 22 H460 L490 36 L520 22 L560 22 L582 38 L600 22 L618 38 L640 22 L680 22 L710 36 L740 22 H1200"
          stroke="url(#azScrollPathGrad)"
          strokeWidth="1"
          strokeOpacity="0.48"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={prefersReduced ? undefined : { pathLength }}
        />
      </svg>
    </div>
  );
};

interface HorizontalScrollDeckProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

/**
 * Horizontal Inertial Scroll Section with smooth track buttons & scroll-linked progress indicator.
 */
export const HorizontalScrollDeck: React.FC<HorizontalScrollDeckProps> = ({
  children,
  className = '',
  title,
  subtitle,
  action,
}) => {
  const railRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  const handleScroll = () => {
    const el = railRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 0) {
      setProgress(0);
      return;
    }
    setProgress(Math.min(1, Math.max(0, el.scrollLeft / max)));
  };

  const scrollByStep = (dir: -1 | 1) => {
    const el = railRef.current;
    if (!el) return;
    const step = Math.max(300, Math.round(el.clientWidth * 0.72));
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {(title || subtitle || action) && (
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="space-y-1">
            {subtitle && (
              <span className="az-type-overline text-[#064E3B] dark:text-[#10B981] block">
                {subtitle}
              </span>
            )}
            {title && (
              <h2 className="az-type-page text-[#091813] dark:text-[#F7F4EC]">
                {title}
              </h2>
            )}
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => scrollByStep(-1)}
              aria-label="Chapga surish"
              className="w-9 h-9 rounded-full az-liquid-glass-pill flex items-center justify-center text-[#091813] dark:text-[#F7F4EC] hover:border-emerald-500/40 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollByStep(1)}
              aria-label="Oʻngga surish"
              className="w-9 h-9 rounded-full az-liquid-glass-pill flex items-center justify-center text-[#091813] dark:text-[#F7F4EC] hover:border-emerald-500/40 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {action}
          </div>
        </div>
      )}

      <div
        ref={railRef}
        onScroll={handleScroll}
        className="az-horizontal-rail gap-4 pb-2 -mx-1 px-1"
      >
        {children}
      </div>

      {/* Hairline horizontal scroll progress rail */}
      <div className="h-[2px] w-full rounded-full bg-[#064E3B]/10 dark:bg-white/[0.08] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#10B981] to-[#C8A85E] transition-transform duration-150 origin-left"
          style={{ transform: `scaleX(${Math.max(0.14, progress)})` }}
        />
      </div>
    </div>
  );
};

interface StickyPeelCardProps {
  children: React.ReactNode;
  index: number;
  className?: string;
}

/**
 * Layered Sticky Peel Card for Scrollytelling stacks (pinned feel without scroll-jacking).
 */
export const StickyPeelCard: React.FC<StickyPeelCardProps> = ({
  children,
  index,
  className = '',
}) => {
  const prefersReduced = useReducedMotion();
  const topOffset = 84 + index * 18;

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.16 }}
      transition={{ duration: 0.44, ease: PREMIUM_EASE }}
      style={{ top: `${topOffset}px` }}
      className={`lg:sticky ${className}`}
    >
      {children}
    </motion.div>
  );
};

/* ============================================================================
   3. KINETIC & MASKED TYPOGRAPHY PRIMITIVES
   ============================================================================ */

interface MaskedSplitTextProps {
  text: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  delay?: number;
}

/**
 * Word-by-word masked cinematic headline reveal (GPU translateY + clip container).
 */
export const MaskedSplitText: React.FC<MaskedSplitTextProps> = ({
  text,
  className = '',
  as: Tag = 'h1',
  delay = 0.04,
}) => {
  const prefersReduced = useReducedMotion();
  const words = text.split(/\s+/).filter(Boolean);

  if (prefersReduced || words.length <= 1) {
    return <Tag className={className}>{text}</Tag>;
  }

  return (
    <Tag className={className} aria-label={text}>
      {words.map((word, idx) => (
        <span
          key={`${word}-${idx}`}
          className="inline-block overflow-hidden align-bottom mr-[0.26em] last:mr-0"
          aria-hidden="true"
        >
          <motion.span
            className="inline-block will-change-transform"
            initial={{ y: '105%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            transition={{
              duration: 0.52,
              delay: delay + idx * 0.045,
              ease: PREMIUM_EASE,
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
};

interface BlurToSharpRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export const BlurToSharpReveal: React.FC<BlurToSharpRevealProps> = ({
  children,
  className = '',
  delay = 0,
}) => {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, delay, ease: PREMIUM_EASE }}
    >
      {children}
    </motion.div>
  );
};

interface InteractiveCounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

/**
 * Smooth tabular spring counter for metrics & statistics.
 */
export const InteractiveCounter: React.FC<InteractiveCounterProps> = ({
  value,
  suffix = '',
  prefix = '',
  className = '',
}) => {
  const prefersReduced = useReducedMotion();
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (prefersReduced) {
      setDisplay(value);
      return;
    }
    const startVal = Math.max(0, Math.round(value * 0.65));
    const startTime = performance.now();
    const duration = 520;
    let rafId = 0;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(startVal + (value - startVal) * eased));
      if (t < 1) {
        rafId = requestAnimationFrame(step);
      }
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [value, prefersReduced]);

  return (
    <span className={`font-mono-numbers tabular-nums ${className}`}>
      {prefix}
      {display.toLocaleString()}
      {suffix}
    </span>
  );
};

interface ScrambleTextProps {
  text: string;
  className?: string;
  durationMs?: number;
}

const SCRAMBLE_GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·°';

/**
 * Scramble / Decoding kinetic text effect (respects prefers-reduced-motion, clean RAF loop).
 */
export const ScrambleText: React.FC<ScrambleTextProps> = ({
  text,
  className = '',
  durationMs = 460,
}) => {
  const prefersReduced = useReducedMotion();
  const [rendered, setRendered] = useState(text);

  useEffect(() => {
    if (prefersReduced || !text) {
      setRendered(text);
      return;
    }

    let rafId = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const lockedCount = Math.floor(progress * text.length);

      let out = '';
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (i < lockedCount || ch === ' ' || ch === ':' || ch === '°' || ch === '·') {
          out += ch;
        } else {
          out += SCRAMBLE_GLYPHS[(i * 7 + Math.floor(now / 36)) % SCRAMBLE_GLYPHS.length];
        }
      }
      setRendered(out);
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setRendered(text);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [text, durationMs, prefersReduced]);

  return <span className={className}>{rendered}</span>;
};

export interface MorphingTabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface MorphingTabsProps {
  items: MorphingTabItem[];
  activeId: string;
  onChange: (id: string) => void;
  layoutId?: string;
  className?: string;
}

/**
 * Apple Liquid Glass FLIP / shared-element segmented tab bar with spring physics.
 */
export const MorphingTabs: React.FC<MorphingTabsProps> = ({
  items,
  activeId,
  onChange,
  layoutId,
  className = '',
}) => {
  const prefersReduced = useReducedMotion();
  const fallbackId = React.useId();
  const sharedId = layoutId || `az-morph-tab-${fallbackId}`;

  return (
    <div
      role="tablist"
      className={`inline-flex flex-wrap items-center gap-1 p-1.5 rounded-2xl az-liquid-glass-pill ${className}`}
    >
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => {
              triggerTactileHaptic(6);
              onChange(item.id);
            }}
            className={`relative px-3.5 py-2 min-h-[40px] rounded-xl text-xs sm:text-[13px] font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
              isActive
                ? 'text-[#F7F4EC] dark:text-[#04120D]'
                : 'text-[#3B554D] dark:text-[#A4B9B1] hover:text-[#091813] dark:hover:text-[#F7F4EC]'
            }`}
          >
            {isActive && (
              <motion.span
                layoutId={sharedId}
                transition={prefersReduced ? { duration: 0 } : MOTION_SPRINGS.snappy}
                className="absolute inset-0 rounded-xl bg-[#064E3B] dark:bg-[#10B981] shadow-[0_6px_18px_-4px_rgba(16,185,129,0.45)]"
                aria-hidden="true"
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {item.icon}
              <span>{item.label}</span>
              {typeof item.count === 'number' && (
                <span
                  className={`text-[11px] font-mono-numbers opacity-80 ${
                    isActive ? 'text-[#F7F4EC]/90 dark:text-[#04120D]/80' : ''
                  }`}
                >
                  {item.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
};

/* ============================================================================
   4. MAGNETIC & SPATIAL 3D TILT INTERACTION PRIMITIVES
   ============================================================================ */

interface MagneticWrapperProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}

export const MagneticWrapper: React.FC<MagneticWrapperProps> = ({
  children,
  className = '',
  strength = 7,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const isFinePointer = useFinePointer();

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, MOTION_SPRINGS.magnetic);
  const y = useSpring(rawY, MOTION_SPRINGS.magnetic);

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
 * Spatial 3D Perspective Card with pointer-tracked radial light reflection & luminous border glow.
 */
export const SpatialTiltCard: React.FC<SpatialTiltCardProps> = ({
  children,
  className = '',
  maxTilt = 4,
  glowColor = 'rgba(16, 185, 129, 0.2)',
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

  const handleClick = () => {
    if (onClick) {
      triggerTactileHaptic(8);
      onClick();
    }
  };

  return (
    <div style={enabled ? { perspective: 1050 } : undefined} className="h-full">
      <motion.div
        ref={ref}
        onClick={handleClick}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        whileTap={onClick ? { scale: 0.99 } : undefined}
        style={enabled ? { rotateX, rotateY, transformStyle: 'preserve-3d' } : undefined}
        className={`relative h-full will-change-transform ${className}`}
      >
        {enabled && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300 z-10"
            style={{
              opacity: spotlight.active ? 1 : 0,
              background: `radial-gradient(440px circle at ${spotlight.x}% ${spotlight.y}%, ${glowColor}, transparent 64%)`,
            }}
          />
        )}
        {children}
      </motion.div>
    </div>
  );
};

/* ============================================================================
   5. PROGRESS RING, AUDIO WAVEFORM, AI THINKING WAVE & ARCHITECTURAL DIVIDER
   ============================================================================ */

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
  barCount?: number;
}

const BAR_PROFILES = [
  { rest: 0.35, active: [0.32, 0.96, 0.44, 0.88, 0.32], duration: 0.9 },
  { rest: 0.58, active: [0.58, 0.28, 1.0, 0.42, 0.58], duration: 0.78 },
  { rest: 0.44, active: [0.44, 0.92, 0.36, 0.96, 0.44], duration: 0.86 },
  { rest: 0.56, active: [0.56, 0.38, 0.86, 0.3, 0.56], duration: 0.72 },
  { rest: 0.4, active: [0.4, 0.95, 0.52, 0.82, 0.4], duration: 0.82 },
  { rest: 0.62, active: [0.62, 0.34, 0.9, 0.46, 0.62], duration: 0.76 },
];

export const AudioWaveformBars: React.FC<AudioWaveformBarsProps> = ({
  isPlaying,
  className = '',
  barClassName = 'bg-[#C8A85E]',
  barCount = 4,
}) => {
  const prefersReduced = useReducedMotion();
  const bars = BAR_PROFILES.slice(0, Math.min(BAR_PROFILES.length, Math.max(3, barCount)));

  return (
    <div
      className={`flex items-end gap-[2.5px] h-4 ${className}`}
      aria-hidden="true"
    >
      {bars.map((bar, idx) => (
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
      <span className="text-xs font-medium text-[#587068] dark:text-[#9CAFA7]">
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

/* ============================================================================
   6. CINEMATIC SPLASH SCREEN ENTRANCE (BRIEF, SESSION-SCOPED, ZERO BLOCKING)
   ============================================================================ */
export const CinematicSplashOverlay: React.FC = () => {
  const prefersReduced = useReducedMotion();
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      if (sessionStorage.getItem('az_neo_splash_seen') === '1') return false;
      const p = window.location.pathname.toLowerCase();
      if (p.startsWith('/display') || p.startsWith('/masjid-tv')) return false;
      return true;
    } catch {
      return false;
    }
  });
  const [hardDismissed, setHardDismissed] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (prefersReduced) {
      setVisible(false);
      setHardDismissed(true);
      return;
    }
    const timer = window.setTimeout(() => {
      setVisible(false);
      try {
        sessionStorage.setItem('az_neo_splash_seen', '1');
      } catch {
        // ignore
      }
    }, 680);
    // Hard failsafe unmount in case AnimatePresence exit stalls in throttled background/iframe tab
    const hardTimer = window.setTimeout(() => {
      setVisible(false);
      setHardDismissed(true);
    }, 1350);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(hardTimer);
    };
  }, [visible, prefersReduced]);

  if (hardDismissed) return null;

  return (
    <AnimatePresence onExitComplete={() => setHardDismissed(true)}>
      {visible && (
        <motion.div
          key="az-cinematic-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03, pointerEvents: 'none' }}
          transition={{ duration: 0.42, ease: PREMIUM_EASE }}
          onClick={() => {
            setVisible(false);
            setHardDismissed(true);
          }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#030706] text-[#F7F4EC] cursor-pointer select-none"
          aria-label="ASAKA ZIYO kirish ekrani"
        >
          <div className="absolute inset-0 az-aurora-waves opacity-60 pointer-events-none" />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, ease: PREMIUM_EASE }}
            className="relative z-10 flex flex-col items-center gap-4 text-center px-6"
          >
            <div className="w-20 h-20 rounded-[26px] overflow-hidden ring-1 ring-[#C8A85E]/45 bg-[#09120F] shadow-[0_24px_64px_rgba(16,185,129,0.28)]">
              <img
                src="/assets/aistudio/IMG_20261114_084331_924_8f6ccba1.jpg"
                alt="ASAKA ZIYO"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-1">
              <div className="font-display text-2xl font-extrabold tracking-[-0.03em] az-gradient-headline">
                ASAKA ZIYO
              </div>
              <div className="text-xs text-[#9CAFA7] font-medium">
                «MuhammadSolih Hoji» Jomeʼ Masjidi · Islomiy Raqamli Ekotizim
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
