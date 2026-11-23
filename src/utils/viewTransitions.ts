/**
 * ASAKA ZIYO — Progressive View Transitions API helper (2026)
 * Smoothly transitions DOM state updates on supporting browsers (Chrome/Edge/Safari 18+)
 * while falling back cleanly and respecting prefers-reduced-motion.
 */

export function navigateWithViewTransition(update: () => void): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    update();
    return;
  }

  const prefersReduced =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => { finished: Promise<void> };
  };

  if (!prefersReduced && typeof doc.startViewTransition === 'function') {
    try {
      doc.startViewTransition(() => {
        update();
      });
      return;
    } catch {
      // Fall through to synchronous update
    }
  }

  update();
}
