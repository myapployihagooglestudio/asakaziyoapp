import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { GeometricPattern } from './GeometricPattern';
import { MaskedSplitText, PREMIUM_EASE } from './MotionPrimitives';

export type PageHeroVariant =
  | 'sanctuary'
  | 'mushaf'
  | 'editorial'
  | 'spatial'
  | 'studio'
  | 'saas';

interface PageHeroProps {
  variant?: PageHeroVariant;
  kicker?: string;
  title: string;
  subtitle?: string;
  meta?: string[];
  imageSrc?: string;
  imageUrl?: string;
  imageAlt?: string;
  actions?: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<PageHeroVariant, string> = {
  sanctuary:
    'az-aurora-surface text-[#F7F4EC] border-white/[0.12]',
  mushaf:
    'bg-gradient-to-br from-[#081C15] via-[#06130E] to-[#030706] text-[#F7F4EC] border-[#C8A85E]/22 shadow-[0_28px_70px_-24px_rgba(2,10,7,0.78)]',
  editorial:
    'az-liquid-glass-elevated text-[#091813] dark:text-[#F7F4EC]',
  spatial:
    'az-aurora-surface text-[#F7F4EC] border-emerald-400/20',
  studio:
    'bg-gradient-to-br from-[#091E17] via-[#06110D] to-[#030706] text-[#F7F4EC] border-white/[0.12] shadow-[0_28px_72px_-20px_rgba(0,0,0,0.82)]',
  saas:
    'az-liquid-glass-elevated text-[#091813] dark:text-[#F7F4EC]',
};

/**
 * ASAKA ZIYO NEO 2026 — Domain-Specific Page Art Direction Hero
 * Prevents repetitive identical banners by matching surface material, typography, and ambient lighting
 * to each screen's distinct functional identity (Mushaf, Editorial, Studio, Spatial, Sanctuary, SaaS).
 */
export const PageHero: React.FC<PageHeroProps> = ({
  variant = 'sanctuary',
  kicker,
  title,
  subtitle,
  meta,
  imageSrc,
  imageUrl,
  imageAlt = '',
  actions,
  aside,
  className = '',
}) => {
  const prefersReduced = useReducedMotion();
  const isDarkSurface = variant !== 'editorial' && variant !== 'saas';
  const resolvedImageSrc = imageSrc || imageUrl;

  return (
    <motion.section
      initial={prefersReduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: PREMIUM_EASE }}
      className={`relative rounded-[28px] overflow-hidden border p-6 sm:p-8 lg:p-10 ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {resolvedImageSrc && (
        <>
          <img
            src={resolvedImageSrc}
            alt={imageAlt}
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover object-center opacity-[0.16] mix-blend-luminosity scale-[1.03] pointer-events-none"
          />
          <div
            aria-hidden="true"
            className={`absolute inset-0 pointer-events-none ${
              isDarkSurface
                ? 'bg-gradient-to-r from-[#030706]/94 via-[#061510]/86 to-[#072118]/72'
                : 'bg-gradient-to-r from-[#FAF8F2]/94 via-[#FAF8F2]/86 to-[#FAF8F2]/70 dark:from-[#060E0B]/94 dark:via-[#081410]/86 dark:to-[#0A1A14]/75'
            }`}
          />
        </>
      )}

      {isDarkSurface && <GeometricPattern opacity={0.04} />}

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className={`${aside ? 'lg:col-span-7' : 'lg:col-span-10'} space-y-3`}>
          {kicker && (
            <div
              className={`az-type-overline ${
                isDarkSurface
                  ? 'text-[#34D399]'
                  : 'text-[#064E3B] dark:text-[#10B981]'
              }`}
            >
              {kicker}
            </div>
          )}

          <MaskedSplitText
            as="h1"
            text={title}
            className={`az-type-hero ${
              isDarkSurface
                ? 'text-[#F7F4EC]'
                : 'text-[#091813] dark:text-[#F7F4EC]'
            }`}
          />

          {subtitle && (
            <p
              className={`az-type-body max-w-2xl ${
                isDarkSurface
                  ? 'text-[#C2D4CD]'
                  : 'text-[#3B554D] dark:text-[#A4B9B1]'
              }`}
            >
              {subtitle}
            </p>
          )}

          {meta && meta.length > 0 && (
            <div
              className={`flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] font-mono-numbers uppercase tracking-[0.12em] ${
                isDarkSurface
                  ? 'text-[#C8A85E]'
                  : 'text-[#6A7F77] dark:text-[#9AB2A8]'
              }`}
            >
              {meta.map((item, idx) => (
                <React.Fragment key={`${item}-${idx}`}>
                  {idx > 0 && <span aria-hidden="true" className="opacity-45">·</span>}
                  <span>{item}</span>
                </React.Fragment>
              ))}
            </div>
          )}

          {actions && (
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              {actions}
            </div>
          )}
        </div>

        {aside && <div className="lg:col-span-5">{aside}</div>}
      </div>
    </motion.section>
  );
};
