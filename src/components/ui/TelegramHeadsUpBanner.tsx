import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  HeadsUpNotificationPayload,
  subscribeToHeadsUpNotifications,
  dismissHeadsUpNotification,
  stopActiveAdhanAudio,
  subscribeToAdhanPlayerState,
} from '../../utils/notificationService';
import { NavigationTab } from '../../types';
import { Bell, VolumeX, X, ArrowRight, Clock } from 'lucide-react';

interface TelegramHeadsUpBannerProps {
  onNavigate: (tab: NavigationTab) => void;
}

export const TelegramHeadsUpBanner: React.FC<TelegramHeadsUpBannerProps> = ({ onNavigate }) => {
  const [payload, setPayload] = useState<HeadsUpNotificationPayload | null>(null);
  const [isAdhanPlaying, setIsAdhanPlaying] = useState(false);

  useEffect(() => {
    const unsubHeadsUp = subscribeToHeadsUpNotifications((item) => {
      setPayload(item);
    });
    const unsubAdhan = subscribeToAdhanPlayerState((state) => {
      setIsAdhanPlaying(Boolean(state.isPlaying || state.isLoading));
    });
    return () => {
      unsubHeadsUp();
      unsubAdhan();
    };
  }, []);

  useEffect(() => {
    if (!payload) return;
    // Keep banner visible longer if Adhan is actively playing so user can stop it or open prayer screen
    const timeoutMs = isAdhanPlaying ? 25000 : 8500;
    const timer = setTimeout(() => {
      dismissHeadsUpNotification();
    }, timeoutMs);
    return () => clearTimeout(timer);
  }, [payload, isAdhanPlaying]);

  const handleOpenTarget = () => {
    if (!payload) return;
    const targetTab = (payload.routeTab as NavigationTab) || 'prayer';
    dismissHeadsUpNotification();
    onNavigate(targetTab);
  };

  return (
    <AnimatePresence>
      {payload && (
        <motion.div
          key={payload.id}
          initial={{ opacity: 0, y: -72, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -60, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          className="fixed top-3 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg z-[95] pointer-events-auto"
          role="alert"
          aria-live="assertive"
        >
          <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(145deg,#041D13_0%,#03170F_55%,#010906_100%)] border-2 border-[#DFBD69]/80 shadow-[0_22px_60px_rgba(0,0,0,0.85),0_0_28px_rgba(223,189,105,0.28)] backdrop-blur-2xl p-3.5 sm:p-4 text-[#FFF8E8]">
            {/* Top Metallic Gold Shimmer Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 az-gold-foil-bg" />

            <div className="flex items-start gap-3.5">
              {/* Official ASAKA ZIYO Brand Logo */}
              <button
                type="button"
                onClick={handleOpenTarget}
                className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-[#DFBD69] shadow-lg shrink-0 bg-[#041D13] cursor-pointer"
              >
                <img
                  src="/assets/aistudio/IMG_20261114_084331_924_8f6ccba1.jpg"
                  alt="ASAKA ZIYO"
                  className="w-full h-full object-cover"
                />
              </button>

              {/* Notification Content */}
              <div
                onClick={handleOpenTarget}
                className="flex-1 min-w-0 cursor-pointer space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-display text-xs font-extrabold tracking-wider text-[#DFBD69] truncate">
                      ASAKA ZIYO
                    </span>
                    {payload.badgeText && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold az-gold-foil-bg text-[#010906] shrink-0">
                        {payload.badgeText}
                      </span>
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-[11px] font-mono-numbers text-[#DFBD69]/90 shrink-0">
                    <Clock className="w-3 h-3" />
                    <span>{payload.timestamp}</span>
                  </span>
                </div>

                <h4 className="text-sm font-bold text-[#FFF8E8] leading-snug line-clamp-1">
                  {payload.title}
                </h4>

                <p className="text-xs text-[#FFF8E8]/85 leading-relaxed line-clamp-2">
                  {payload.message}
                </p>

                <div className="pt-1.5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#DFBD69] hover:underline">
                    <span>Sahifani ochish</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>

                  {isAdhanPlaying && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        stopActiveAdhanAudio();
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white text-[11px] font-bold shadow-xs cursor-pointer"
                    >
                      <VolumeX className="w-3 h-3" />
                      <span>Azonni toʻxtatish</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Close button */}
              <button
                type="button"
                onClick={() => dismissHeadsUpNotification()}
                className="p-1.5 rounded-xl text-[#FFF8E8]/60 hover:text-[#FFF8E8] hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                aria-label="Yopish"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
