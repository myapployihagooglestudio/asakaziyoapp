/**
 * ASAKA ZIYO — NEO 2026 Centralized Motion & Spatial Physics Engine
 * Compositor-only (transform + opacity + filter) motion tokens, custom cubic-bezier curves,
 * spring physics presets, device-aware quality scaling, haptic helpers, and reduced-motion fallbacks.
 */

import { useEffect, useState } from 'react';
import type { Variants, Transition } from 'motion/react';

export const MOTION_DURATIONS = {
  instant: 0.09,
  fast: 0.16,
  normal: 0.26,
  cinematic: 0.48,
  slow: 0.72,
} as const;

export const MOTION_EASING = {
  // Architectural exponential out curve (Apple/Linear precision)
  expoOut: [0.16, 1, 0.3, 1] as [number, number, number, number],
  // Smooth editorial cubic-bezier
  editorial: [0.22, 1, 0.36, 1] as [number, number, number, number],
  // Liquid morph curve
  liquid: [0.32, 0.72, 0, 1] as [number, number, number, number],
  // Crisp exit curve
  crispIn: [0.4, 0, 1, 1] as [number, number, number, number],
  // Balanced standard curve
  standard: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
} as const;

export const MOTION_SPRINGS: Record<string, Transition> = {
  gentle: {
    type: 'spring',
    stiffness: 240,
    damping: 28,
    mass: 0.9,
  },
  snappy: {
    type: 'spring',
    stiffness: 400,
    damping: 32,
    mass: 0.68,
  },
  elastic: {
    type: 'spring',
    stiffness: 340,
    damping: 22,
    mass: 0.78,
  },
  spatialModal: {
    type: 'spring',
    stiffness: 310,
    damping: 30,
    mass: 0.85,
  },
  magnetic: {
    type: 'spring',
    stiffness: 260,
    damping: 20,
    mass: 0.42,
  },
};

export const GESTURE_THRESHOLDS = {
  swipeDistancePx: 56,
  swipeVelocity: 0.35,
  sheetDismissPx: 92,
  longPressMs: 450,
} as const;

/**
 * Spatial depth page transition variants (compositor-only)
 */
export const pageTransitionVariants: Variants = {
  initial: {
    opacity: 0,
    y: 10,
    scale: 0.996,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: MOTION_DURATIONS.normal,
      ease: MOTION_EASING.expoOut,
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    scale: 0.996,
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
      staggerChildren: 0.042,
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
    y: 12,
    scale: 0.988,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
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
    scale: 0.955,
    y: 14,
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
    y: 8,
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
    scale: 0.98,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: MOTION_DURATIONS.normal,
      ease: MOTION_EASING.expoOut,
    },
  },
  exit: {
    opacity: 0,
    y: 20,
    scale: 0.985,
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
  whileTap: { scale: 0.975 },
  transition: { duration: MOTION_DURATIONS.instant },
};

/**
 * Trigger light haptic pulse on supported Android/mobile devices only
 */
export function triggerTactileHaptic(pattern: number | number[] = 10): void {
  try {
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.vibrate === 'function' &&
      typeof window !== 'undefined' &&
      window.matchMedia?.('(pointer: coarse)').matches
    ) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Disallowed in sandboxed iframes or unsupported platforms
  }
}

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

/**
 * Dynamic quality scaling hook: detects low-power / constrained devices & coarse touch pointers
 */
export function useMotionCapability(): {
  reducedMotion: boolean;
  isFinePointer: boolean;
  isLowPower: boolean;
  allow3D: boolean;
} {
  const reducedMotion = usePrefersReducedMotion();
  const [isFinePointer, setIsFinePointer] = useState(false);
  const [isLowPower, setIsLowPower] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia?.('(hover: hover) and (pointer: fine)');
    const updatePointer = () => setIsFinePointer(Boolean(mq?.matches));
    updatePointer();
    mq?.addEventListener?.('change', updatePointer);

    const nav = navigator as Navigator & { deviceMemory?: number };
    const lowCores = typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 2;
    const lowMem = typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2;
    setIsLowPower(lowCores || lowMem);

    return () => {
      mq?.removeEventListener?.('change', updatePointer);
    };
  }, []);

  return {
    reducedMotion,
    isFinePointer,
    isLowPower,
    allow3D: !reducedMotion && !isLowPower,
  };
}
