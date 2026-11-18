import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ArabesqueCornerOrnaments, IslamicStarEmblem } from './GeometricPattern';

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
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-[#010906]/78 backdrop-blur-md"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className={`relative w-full ${maxWidthClasses[effectiveSize]} bg-[#FFF8E8] dark:bg-[linear-gradient(155deg,#041D13_0%,#03170F_55%,#010906_100%)] border border-[#DFBD69]/45 rounded-t-3xl sm:rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,246,200,0.22)] z-10 overflow-hidden sm:my-auto`}
            role="dialog"
            aria-modal="true"
          >
            <ArabesqueCornerOrnaments size={22} />

            {/* Mobile drag indicator */}
            <div className="sm:hidden w-12 h-1.5 bg-[#DFBD69]/45 rounded-full mx-auto mt-3" />

            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#063D32]/14 dark:border-[#DFBD69]/25 bg-[#F8F5EC]/60 dark:bg-[#092E1F]/35">
              <div className="pr-3">
                <div className="flex items-center gap-2">
                  <IslamicStarEmblem size={15} className="text-[#DFBD69] shrink-0" />
                  <h3 className="text-lg font-bold text-[#03170F] dark:text-[#FFF8E8] font-display tracking-wide">
                    {title}
                  </h3>
                </div>
                {subtitle && (
                  <p className="text-xs text-[#526B62] dark:text-[#9CB5AC] mt-0.5 pl-6">{subtitle}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="min-w-[42px] min-h-[42px] flex items-center justify-center text-[#526B62] hover:text-[#03170F] dark:text-[#DFBD69] dark:hover:text-[#FFF8E8] rounded-xl border border-transparent hover:border-[#DFBD69]/35 hover:bg-[#063D32]/8 dark:hover:bg-white/8 transition-all cursor-pointer shrink-0"
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

