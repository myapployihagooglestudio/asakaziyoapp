import { useState, useEffect, useCallback } from 'react';

export type DeviceFormFactor =
  | 'smartphone'
  | 'foldable'
  | 'tablet'
  | 'desktop'
  | 'ultrawide'
  | 'tv';

export interface DeviceProfile {
  formFactor: DeviceFormFactor;
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  pointer: 'coarse' | 'fine';
  isTouch: boolean;
  isTvMode: boolean;
  toggleTvMode: () => void;
  setTvMode: (enabled: boolean) => void;
}

function detectFormFactor(width: number, height: number, isTvForced: boolean): DeviceFormFactor {
  if (isTvForced) return 'tv';
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent || '';
    if (/SmartTV|SMART-TV|Tizen|Web0S|BRAVIA|AFT|Android TV|GoogleTV|AppleTV/i.test(ua)) {
      return 'tv';
    }
  }
  if (width >= 2400) return 'ultrawide';
  if (width >= 1024) return 'desktop';
  if (width >= 600) {
    // Detect unfolded square-ish foldables (aspect ratio near 1:1)
    const ratio = Math.max(width, height) / Math.max(1, Math.min(width, height));
    if (width <= 840 && ratio <= 1.28) return 'foldable';
    return 'tablet';
  }
  return 'smartphone';
}

function getFocusableElements(): HTMLElement[] {
  if (typeof document === 'undefined') return [];
  const selector = [
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  return Array.from(document.querySelectorAll<HTMLElement>(selector)).filter((el) => {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== 'hidden' &&
      style.display !== 'none'
    );
  });
}

function moveSpatialFocus(direction: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'): boolean {
  const focusables = getFocusableElements();
  if (focusables.length === 0) return false;

  const active = document.activeElement as HTMLElement | null;
  if (!active || !focusables.includes(active)) {
    focusables[0].focus();
    focusables[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return true;
  }

  const origin = active.getBoundingClientRect();
  const ox = origin.left + origin.width / 2;
  const oy = origin.top + origin.height / 2;

  let best: HTMLElement | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const el of focusables) {
    if (el === active) continue;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = cx - ox;
    const dy = cy - oy;

    const inDirection =
      (direction === 'ArrowRight' && dx > 12) ||
      (direction === 'ArrowLeft' && dx < -12) ||
      (direction === 'ArrowDown' && dy > 12) ||
      (direction === 'ArrowUp' && dy < -12);

    if (!inDirection) continue;

    const primary =
      direction === 'ArrowLeft' || direction === 'ArrowRight' ? Math.abs(dx) : Math.abs(dy);
    const orthogonal =
      direction === 'ArrowLeft' || direction === 'ArrowRight' ? Math.abs(dy) : Math.abs(dx);

    // Weight orthogonal offset heavily so focus stays aligned in rows/columns
    const score = primary + orthogonal * 2.4;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }

  if (best) {
    best.focus();
    best.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    return true;
  }
  return false;
}

export function useDeviceProfile(): DeviceProfile {
  const [isTvMode, setIsTvModeState] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        return localStorage.getItem('asaka_ziyo_tv_focus_mode') === '1';
      }
    } catch {
      // ignore
    }
    return false;
  });

  const [metrics, setMetrics] = useState(() => {
    if (typeof window === 'undefined') {
      return {
        width: 1280,
        height: 800,
        pointer: 'fine' as 'coarse' | 'fine',
        isTouch: false,
      };
    }
    const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      pointer: (coarse ? 'coarse' : 'fine') as 'coarse' | 'fine',
      isTouch: coarse || 'ontouchstart' in window,
    };
  });

  const setTvMode = useCallback((enabled: boolean) => {
    setIsTvModeState(enabled);
    try {
      localStorage.setItem('asaka_ziyo_tv_focus_mode', enabled ? '1' : '0');
    } catch {
      // ignore
    }
  }, []);

  const toggleTvMode = useCallback(() => {
    setIsTvModeState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('asaka_ziyo_tv_focus_mode', next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
      setMetrics({
        width: window.innerWidth,
        height: window.innerHeight,
        pointer: coarse ? 'coarse' : 'fine',
        isTouch: coarse || 'ontouchstart' in window,
      });
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync .tv-mode class on documentElement for 10-foot typography & focus rings
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('tv-mode', isTvMode);
  }, [isTvMode]);

  // Global D-Pad / Remote arrow key spatial focus navigation when in TV mode
  useEffect(() => {
    if (!isTvMode || typeof window === 'undefined') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight'
      ) {
        const moved = moveSpatialFocus(e.key);
        if (moved) {
          e.preventDefault();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTvMode]);

  const formFactor = detectFormFactor(metrics.width, metrics.height, isTvMode);

  return {
    formFactor,
    width: metrics.width,
    height: metrics.height,
    orientation: metrics.width >= metrics.height ? 'landscape' : 'portrait',
    pointer: metrics.pointer,
    isTouch: metrics.isTouch,
    isTvMode,
    toggleTvMode,
    setTvMode,
  };
}
