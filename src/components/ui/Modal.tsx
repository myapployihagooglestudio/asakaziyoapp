import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { PREMIUM_EASE } from './MotionPrimitives';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReduced ? 0 : 0.18 }}
            className="fixed inset-0 bg-[#040807]/72 backdrop-blur-md"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            initial={prefersReduced ? { opacity: 1 } : { opacity: 0, scale: 0.97, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 16 }}
            transition={
              prefersReduced
                ? { duration: 0 }
                : { duration: 0.26, ease: PREMIUM_EASE }
            }
            className={`relative w-full ${maxWidthClasses[effectiveSize]} bg-[#FAF8F4] dark:bg-[#0B1411] border border-[#064E3B]/12 dark:border-white/[0.1] rounded-t-[28px] sm:rounded-[28px] shadow-[0_32px_90px_-16px_rgba(0,0,0,0.65)] z-10 overflow-hidden sm:my-auto pb-safe`}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            {/* Mobile Bottom Sheet Grabber */}
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[#064E3B]/20 dark:bg-white/20" />
            </div>

            <div className="flex items-start justify-between gap-3 px-5 sm:px-6 py-4 border-b border-[#064E3B]/9 dark:border-white/[0.07]">
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-[#0B1B16] dark:text-[#F7F5F0] tracking-[-0.015em] leading-snug">
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
                className="min-w-[40px] min-h-[40px] flex items-center justify-center text-[#4A635B] hover:text-[#0B1B16] dark:text-[#9AB0A7] dark:hover:text-white rounded-full bg-[#064E3B]/5 hover:bg-[#064E3B]/10 dark:bg-white/[0.05] dark:hover:bg-white/[0.12] transition-colors cursor-pointer shrink-0"
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
