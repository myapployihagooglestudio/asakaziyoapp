import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

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
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-black/65 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={`relative w-full ${maxWidthClasses[effectiveSize]} bg-[#FBF9F5] dark:bg-[#0B1F1C] border border-stone-200 dark:border-[#c5a869]/30 rounded-t-3xl sm:rounded-2xl shadow-2xl z-10 overflow-hidden sm:my-auto`}
            role="dialog"
            aria-modal="true"
          >
            {/* Mobile drag indicator */}
            <div className="sm:hidden w-10 h-1 bg-stone-300 dark:bg-emerald-900 rounded-full mx-auto mt-3" />

            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-stone-200/80 dark:border-emerald-950/80">
              <div className="pr-3">
                <h3 className="text-lg font-semibold text-[#14221B] dark:text-[#F4F1EA] font-editorial">
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-xs text-[#6C7C73] dark:text-[#8FA199] mt-0.5">{subtitle}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#6C7C73] hover:text-[#14221B] dark:text-[#8FA199] dark:hover:text-[#F4F1EA] rounded-xl hover:bg-stone-200/60 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                aria-label="Yopish"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 sm:p-6 max-h-[82vh] overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
