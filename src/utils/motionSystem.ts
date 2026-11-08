/**
 * ASAKA ZIYO — 2026 Next-Generation Centralized Motion Design Engine
 * Provides compositor-only (transform + opacity) motion tokens, easing curves,
 * spring presets, stagger patterns, gesture thresholds, and reduced-motion fallbacks.
 */

import { useEffect, useState } from 'react';
import type { Variants, Transition } from 'motion/react';

export const MOTION_DURATIONS = {
  instant: 0.08,
  fast: 0.16,
  normal: 0.26,
  cinematic: 0.42,
  slow: 0.65,
} as const;

export const MOTION_EASING = {
  // Architectural exponential out curve
  expoOut: [0.16, 1, 0.3, 1] as [number, number, number, number],
  // Smooth editorial cubic-bezier
  editorial: [0.22, 1, 0.36, 1] as [number, number, number, number],
  // Crisp exit curve
  crispIn: [0.4, 0, 1, 1] as [number, number, number, number],
  // Balanced standard curve
  standard: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
} as const;

export const MOTION_SPRINGS: Record<string, Transition> = {
  gentle: {
    type: 'spring',
    stiffness: 260,
    damping: 28,
    mass: 0.9,
  },
  snappy: {
    type: 'spring',
    stiffness: 380,
    damping: 32,
    mass: 0.7,
  },
  spatialModal: {
    type: 'spring',
    stiffness: 310,
    damping: 30,
    mass: 0.85,
  },
};

export const GESTURE_THRESHOLDS = {
  swipeDistancePx: 56,
  swipeVelocity: 0.35,
  longPressMs: 450,
} as const;

/**
 * Page transition variants (compositor-safe opacity + translateY)
 */
export const pageTransitionVariants: Variants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_DURATIONS.normal,
      ease: MOTION_EASING.editorial,
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: {
      duration: MOTION_DURATIONS.fast,
      ease: MOTION_EASING.crispIn,
    },
  },
};

/**
 * Staggered container variants for grids and lists
 */
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.02,
    },
  },
};

/**
 * Card / list item entrance variants
 */
export const cardRevealVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_DURATIONS.normal,
      ease: MOTION_EASING.expoOut,
    },
  },
};

/**
 * Spatial modal expansion variants
 */
export const modalExpandVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.96,
    y: 10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: MOTION_DURATIONS.normal,
      ease: MOTION_EASING.expoOut,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 6,
    transition: {
      duration: MOTION_DURATIONS.fast,
      ease: MOTION_EASING.crispIn,
    },
  },
};

/**
 * Drawer / Bottom Sheet slide variants
 */
export const drawerSlideVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 28,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_DURATIONS.normal,
      ease: MOTION_EASING.expoOut,
    },
  },
  exit: {
    opacity: 0,
    y: 20,
    transition: {
      duration: MOTION_DURATIONS.fast,
      ease: MOTION_EASING.crispIn,
    },
  },
};

/**
 * Micro-interaction button press props
 */
export const microPressProps = {
  whileTap: { scale: 0.98 },
  transition: { duration: MOTION_DURATIONS.instant },
};

/**
 * Hook that detects prefers-reduced-motion media query in real time
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduced;
}
