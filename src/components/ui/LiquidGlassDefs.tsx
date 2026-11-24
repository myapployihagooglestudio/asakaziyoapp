import React, { useEffect, useRef } from 'react';
import { useMotionCapability } from '../../utils/motionSystem';

type AtmosphericPhase = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

const PHASE_PALETTE: Record<AtmosphericPhase, { glowA: string; glowB: string }> = {
  fajr: {
    glowA: 'rgba(16, 185, 129, 0.14)',
    glowB: 'rgba(200, 168, 94, 0.10)',
  },
  dhuhr: {
    glowA: 'rgba(16, 185, 129, 0.16)',
    glowB: 'rgba(52, 211, 153, 0.08)',
  },
  asr: {
    glowA: 'rgba(200, 168, 94, 0.14)',
    glowB: 'rgba(16, 185, 129, 0.11)',
  },
  maghrib: {
    glowA: 'rgba(200, 168, 94, 0.16)',
    glowB: 'rgba(6, 78, 59, 0.18)',
  },
  isha: {
    glowA: 'rgba(16, 185, 129, 0.10)',
    glowB: 'rgba(200, 168, 94, 0.07)',
  },
};

function resolveTashkentPhase(): AtmosphericPhase {
  try {
    const now = new Date();
    const hourStr = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      hour12: false,
      timeZone: 'Asia/Tashkent',
    }).format(now);
    const hour = Number(hourStr);
    if (hour >= 4 && hour < 8) return 'fajr';
    if (hour >= 8 && hour < 15) return 'dhuhr';
    if (hour >= 15 && hour < 18) return 'asr';
    if (hour >= 18 && hour < 20) return 'maghrib';
    return 'isha';
  } catch {
    return 'isha';
  }
}

/**
 * ASAKA ZIYO — NEO 2026 Global Optical Material Definitions
 * 1. SVG Liquid Glass optical refraction & specular highlight filters (#az-liquid-refraction)
 * 2. Ambient Contextual Pointer Light-Field Follower + Precision Cursor Ring (desktop fine-pointer only, zero React re-renders)
 * 3. Time-Based 4D Spatial Atmosphere (modulates ambient CSS variables according to Asia/Tashkent prayer time phase)
 */
export const LiquidGlassDefs: React.FC = () => {
  const { isFinePointer, reducedMotion } = useMotionCapability();
  const glowRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  // 4D Time-Based Spatial Atmosphere
  useEffect(() => {
    const applyPhase = () => {
      const phase = resolveTashkentPhase();
      const root = document.documentElement;
      root.dataset.azTimePhase = phase;
      root.style.setProperty('--az-time-glow-a', PHASE_PALETTE[phase].glowA);
      root.style.setProperty('--az-time-glow-b', PHASE_PALETTE[phase].glowB);
    };
    applyPhase();
    const timer = window.setInterval(applyPhase, 10 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Ambient Light-Field + Contextual Precision Cursor Follower
  useEffect(() => {
    if (!isFinePointer || reducedMotion) return;
    const glow = glowRef.current;
    const ring = ringRef.current;
    if (!glow || !ring) return;

    let rafId = 0;
    let targetX = -400;
    let targetY = -400;
    let glowX = -400;
    let glowY = -400;
    let ringX = -400;
    let ringY = -400;
    let ringScale = 1;
    let targetScale = 1;
    let visible = false;

    const animate = () => {
      glowX += (targetX - glowX) * 0.12;
      glowY += (targetY - glowY) * 0.12;
      ringX += (targetX - ringX) * 0.28;
      ringY += (targetY - ringY) * 0.28;
      ringScale += (targetScale - ringScale) * 0.22;

      glow.style.transform = `translate3d(${glowX - 240}px, ${glowY - 240}px, 0)`;
      ring.style.transform = `translate3d(${ringX - 16}px, ${ringY - 16}px, 0) scale(${ringScale.toFixed(3)})`;

      const moving =
        Math.abs(targetX - glowX) > 0.5 ||
        Math.abs(targetY - glowY) > 0.5 ||
        Math.abs(targetX - ringX) > 0.4 ||
        Math.abs(targetY - ringY) > 0.4 ||
        Math.abs(targetScale - ringScale) > 0.01;

      if (moving) {
        rafId = requestAnimationFrame(animate);
      } else {
        rafId = 0;
      }
    };

    const onMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      const target = e.target as HTMLElement | null;
      const isInteractive = Boolean(
        target?.closest('a, button, [role="button"], [role="tab"], input, select, textarea')
      );
      targetScale = isInteractive ? 1.48 : 1;
      ring.style.borderColor = isInteractive
        ? 'rgba(200, 168, 94, 0.55)'
        : 'rgba(16, 185, 129, 0.34)';

      if (!visible) {
        visible = true;
        glowX = targetX;
        glowY = targetY;
        ringX = targetX;
        ringY = targetY;
        glow.style.opacity = '1';
        ring.style.opacity = '0.85';
      }
      if (!rafId) {
        rafId = requestAnimationFrame(animate);
      }
    };

    const onDown = () => {
      targetScale = 0.82;
      if (!rafId) rafId = requestAnimationFrame(animate);
    };

    const onUp = () => {
      targetScale = 1;
      if (!rafId) rafId = requestAnimationFrame(animate);
    };

    const onLeave = () => {
      visible = false;
      glow.style.opacity = '0';
      ring.style.opacity = '0';
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    document.addEventListener('pointerleave', onLeave, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointerleave', onLeave);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isFinePointer, reducedMotion]);

  return (
    <>
      {/* Hidden SVG Optical Refraction & Liquid Specular Filter Primitives */}
      <svg
        aria-hidden="true"
        className="pointer-events-none fixed w-0 h-0 overflow-hidden"
        focusable="false"
      >
        <defs>
          <filter id="az-liquid-refraction" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.014 0.022"
              numOctaves="2"
              seed="7"
              result="noise"
            />
            <feGaussianBlur in="noise" stdDeviation="2.5" result="smoothNoise" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="smoothNoise"
              scale="6"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
          <filter id="az-soft-bloom" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* Contextual Desktop Ambient Light-Field + Subtle Precision Cursor Ring */}
      {isFinePointer && !reducedMotion && (
        <>
          <div
            ref={glowRef}
            aria-hidden="true"
            className="pointer-events-none fixed top-0 left-0 z-30 w-[480px] h-[480px] rounded-full opacity-0 transition-opacity duration-500 will-change-transform mix-blend-screen dark:mix-blend-lighten"
            style={{
              background:
                'radial-gradient(circle, var(--az-time-glow-a, rgba(16, 185, 129, 0.09)) 0%, var(--az-time-glow-b, rgba(200, 168, 94, 0.045)) 38%, transparent 68%)',
            }}
          />
          <div
            ref={ringRef}
            aria-hidden="true"
            className="pointer-events-none fixed top-0 left-0 z-[70] w-8 h-8 rounded-full border border-emerald-500/35 opacity-0 transition-opacity duration-300 will-change-transform"
          />
        </>
      )}
    </>
  );
};
