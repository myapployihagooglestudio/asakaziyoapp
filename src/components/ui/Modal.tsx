import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion, PanInfo, useReducedMotion } from 'motion/react';
import { GESTURE_THRESHOLDS, MOTION_SPRINGS } from '../../utils/motionSystem';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

/**
 * ASAKA ZIYO NEO 2026 — Spatial Liquid Glass Modal & Gesture-Based Mobile Bottom Sheet
 * Supports swipe-down-to-dismiss on touch sheets while preserving desktop center spatial elevation.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth,
  size,
}) => {
  const effectiveSize = size || maxWidth || 'lg';
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const maxWidthClasses: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (
      info.offset.y > GESTURE_THRESHOLDS.sheetDismissPx ||
      info.velocity.y > 420
    ) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReduced ? 0 : 0.2 }}
            className="fixed inset-0 bg-[#020605]/74 backdrop-blur-md"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            initial={prefersReduced ? { opacity: 1 } : { opacity: 0, scale: 0.96, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 20 }}
            transition={prefersReduced ? { duration: 0 } : MOTION_SPRINGS.spatialModal}
            drag={prefersReduced ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 260 }}
            dragElastic={{ top: 0.04, bottom: 0.35 }}
            onDragEnd={handleDragEnd}
            className={`relative w-full ${maxWidthClasses[effectiveSize]} az-liquid-glass-modal rounded-t-[32px] sm:rounded-[32px] z-10 overflow-hidden sm:my-auto pb-safe`}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            {/* Mobile Gesture Grabber */}
            <div className="sm:hidden flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
              <div className="w-11 h-1.5 rounded-full bg-[#064E3B]/22 dark:bg-white/24" />
            </div>

            <div className="flex items-start justify-between gap-3 px-5 sm:px-6 py-4 border-b border-[#064E3B]/10 dark:border-white/[0.08]">
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-display font-bold text-[#091813] dark:text-[#F7F4EC] tracking-[-0.018em] leading-snug">
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-xs text-[#4A635B] dark:text-[#9AB0A7] mt-0.5 leading-relaxed">
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center text-[#4A635B] hover:text-[#091813] dark:text-[#9AB0A7] dark:hover:text-white rounded-full bg-[#064E3B]/6 hover:bg-[#064E3B]/12 dark:bg-white/[0.06] dark:hover:bg-white/[0.14] transition-colors cursor-pointer shrink-0"
                aria-label="Yopish"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 sm:p-6 max-h-[82vh] overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
