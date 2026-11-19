/**
 * ASAKA ZIYO — Smart Mosque Display Automatic Universal Responsive Layout Engine
 *
 * Shared layout engine powering ALL 11 display profiles across:
 * - Large Smart TVs, Android TVs, LED mosque displays, 4K & 8K screens (1920x1080 .. 7680x4320)
 * - Desktop & laptop monitors (1024x768, 1280x720, 1366x768, 1440x900, 1600x900, 2560x1440)
 * - Ultra-wide displays (21:9, 2560x1080, 3440x1440)
 * - Portrait monitors & vertical LED pillars (1080x1920, 2160x3840)
 * - Tablets (768x1024, 1024x768)
 * - Android smartphones & iPhones (320x568, 360x640, 375x667, 390x844, 412x915, 640x360, 800x480)
 *
 * CRITICAL ARCHITECTURAL GUARANTEE:
 * Responsive layout selection is strictly INDEPENDENT of the user's chosen design profile.
 * Resizing the viewport adapts layout geometry, density, columns, and typographic scale,
 * without ever switching or overwriting the active design profile.
 */

import { useEffect, useMemo, useState } from 'react';

export type DisplayOrientation = 'portrait' | 'landscape' | 'square';

export type DisplayAspectCategory =
  | 'portrait_9_16'
  | 'portrait_tablet'
  | 'square_4_3'
  | 'landscape_16_10'
  | 'landscape_16_9'
  | 'ultrawide_21_9';

export type DisplayDeviceTier =
  | 'mobile_portrait'
  | 'mobile_landscape'
  | 'tablet_portrait'
  | 'tablet_landscape'
  | 'desktop_compact'
  | 'tv_fhd'
  | 'tv_4k_8k'
  | 'portrait_tv'
  | 'ultrawide';

export type DisplayLayoutComposition =
  | 'compact_mobile'
  | 'portrait_vertical'
  | 'landscape_standard'
  | 'landscape_split'
  | 'ultrawide_framed';

export interface DisplayResponsiveLayout {
  width: number;
  height: number;
  devicePixelRatio: number;
  aspectRatio: number;
  orientation: DisplayOrientation;
  aspectCategory: DisplayAspectCategory;
  deviceTier: DisplayDeviceTier;
  composition: DisplayLayoutComposition;
  isMobile: boolean;
  isCompactHeight: boolean;
  isPortrait: boolean;
  isUltraWide: boolean;
  is4KOrHigher: boolean;
  allowVerticalScrollFallback: boolean;
  contentMaxWidthPx: number | null;
  typeScaleMultiplier: number;
  density: 'compact' | 'comfortable' | 'monumental';
}

export function computeDisplayLayoutProfile(
  rawWidth: number,
  rawHeight: number,
  rawDpr = 1,
  orientationPreference: 'auto' | 'portrait' | 'landscape' = 'auto'
): DisplayResponsiveLayout {
  const width = Math.max(280, Math.round(rawWidth || 1920));
  const height = Math.max(280, Math.round(rawHeight || 1080));
  const devicePixelRatio = Math.max(0.5, Math.min(4, Number.isFinite(rawDpr) ? rawDpr : 1));
  const aspectRatio = Number((width / height).toFixed(3));

  const detectedOrientation: DisplayOrientation =
    aspectRatio < 0.92 ? 'portrait' : aspectRatio > 1.12 ? 'landscape' : 'square';

  const orientation: DisplayOrientation =
    orientationPreference === 'portrait'
      ? 'portrait'
      : orientationPreference === 'landscape'
        ? 'landscape'
        : detectedOrientation;

  const isPortrait = orientation === 'portrait';
  const isUltraWide = !isPortrait && aspectRatio >= 2.1;
  const is4KOrHigher = Math.max(width, height) >= 3200;

  let aspectCategory: DisplayAspectCategory;
  if (aspectRatio < 0.68) {
    aspectCategory = 'portrait_9_16';
  } else if (aspectRatio < 0.95) {
    aspectCategory = 'portrait_tablet';
  } else if (aspectRatio < 1.42) {
    aspectCategory = 'square_4_3';
  } else if (aspectRatio < 1.66) {
    aspectCategory = 'landscape_16_10';
  } else if (aspectRatio < 2.1) {
    aspectCategory = 'landscape_16_9';
  } else {
    aspectCategory = 'ultrawide_21_9';
  }

  let deviceTier: DisplayDeviceTier;
  if (isPortrait) {
    if (width <= 540) {
      deviceTier = 'mobile_portrait';
    } else if (width <= 960 && height <= 1450) {
      deviceTier = 'tablet_portrait';
    } else {
      deviceTier = 'portrait_tv';
    }
  } else {
    if (height <= 520 && width <= 960) {
      deviceTier = 'mobile_landscape';
    } else if (isUltraWide) {
      deviceTier = 'ultrawide';
    } else if (width >= 3200) {
      deviceTier = 'tv_4k_8k';
    } else if (width >= 1800) {
      deviceTier = 'tv_fhd';
    } else if (width >= 1200) {
      deviceTier = 'desktop_compact';
    } else {
      deviceTier = 'tablet_landscape';
    }
  }

  const isMobile = deviceTier === 'mobile_portrait' || deviceTier === 'mobile_landscape';
  const isCompactHeight = height <= 680 || (isPortrait && height <= 700);

  let composition: DisplayLayoutComposition;
  if (deviceTier === 'mobile_portrait') {
    composition = 'compact_mobile';
  } else if (isPortrait) {
    composition = 'portrait_vertical';
  } else if (deviceTier === 'ultrawide') {
    composition = 'ultrawide_framed';
  } else if (deviceTier === 'mobile_landscape' || aspectCategory === 'square_4_3') {
    composition = 'landscape_standard';
  } else {
    composition = 'landscape_split';
  }

  // Only allow subtle overflow-y auto on extremely short phones (e.g. 320x568 / 640x360) so nothing clips
  const allowVerticalScrollFallback =
    (width <= 380 && height <= 600) || (height <= 430 && width <= 860);

  // Constrain ultra-wide 21:9 content rail so typography maintains balanced horizontal rhythm
  const contentMaxWidthPx = isUltraWide ? Math.round(height * 1.92) : null;

  let density: 'compact' | 'comfortable' | 'monumental';
  let typeScaleMultiplier = 1;

  if (isMobile || height <= 640) {
    density = 'compact';
    typeScaleMultiplier = width <= 340 ? 0.88 : 0.94;
  } else if (is4KOrHigher) {
    density = 'monumental';
    typeScaleMultiplier = 1.12;
  } else if (deviceTier === 'tv_fhd' || deviceTier === 'portrait_tv') {
    density = 'monumental';
    typeScaleMultiplier = 1.02;
  } else {
    density = 'comfortable';
    typeScaleMultiplier = 1;
  }

  return {
    width,
    height,
    devicePixelRatio,
    aspectRatio,
    orientation,
    aspectCategory,
    deviceTier,
    composition,
    isMobile,
    isCompactHeight,
    isPortrait,
    isUltraWide,
    is4KOrHigher,
    allowVerticalScrollFallback,
    contentMaxWidthPx,
    typeScaleMultiplier,
    density,
  };
}

export function useDisplayResponsiveLayout(
  orientationPreference: 'auto' | 'portrait' | 'landscape' = 'auto'
): DisplayResponsiveLayout {
  const readMetrics = () => {
    if (typeof window === 'undefined') {
      return { w: 1920, h: 1080, dpr: 1 };
    }
    const vv = window.visualViewport;
    return {
      w: Math.round(vv?.width || window.innerWidth || 1920),
      h: Math.round(vv?.height || window.innerHeight || 1080),
      dpr: window.devicePixelRatio || 1,
    };
  };

  const [metrics, setMetrics] = useState<{ w: number; h: number; dpr: number }>(readMetrics);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let rafId: number | null = null;
    const handleResize = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => {
        setMetrics(readMetrics());
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, []);

  return useMemo(
    () =>
      computeDisplayLayoutProfile(metrics.w, metrics.h, metrics.dpr, orientationPreference),
    [metrics.w, metrics.h, metrics.dpr, orientationPreference]
  );
}
