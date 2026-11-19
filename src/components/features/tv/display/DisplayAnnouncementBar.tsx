import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, WifiOff } from 'lucide-react';
import { SupportedLocale } from '../../../../types';
import { ScheduleValidationResult } from '../../../../utils/smartMosqueDisplayEngine';
import { SmartDisplayLocaleBundle } from '../../../../utils/smartMosqueDisplayI18n';
import { DisplayProfileTheme } from './displayProfiles';

interface DisplayAnnouncementBarProps {
  theme: DisplayProfileTheme;
  showAnnouncements: boolean;
  announcementKey: string;
  title: string;
  body: string;
  mediaUrl?: string;
  totalAnnouncements: number;
  activeIndex: number;
  isOnline: boolean;
  scheduleValidation: ScheduleValidationResult;
  activeLocale: SupportedLocale;
  t: SmartDisplayLocaleBundle;
}

export const DisplayAnnouncementBar: React.FC<DisplayAnnouncementBarProps> = ({
  theme,
  showAnnouncements,
  announcementKey,
  title,
  body,
  mediaUrl,
  totalAnnouncements,
  activeIndex,
  isOnline,
  scheduleValidation,
  activeLocale,
  t,
}) => {
  const showWarning = !isOnline || scheduleValidation.isExpired || scheduleValidation.isUnpublished;

  return (
    <footer className="shrink-0">
      {/* Non-intrusive notice bar shown ONLY when offline or schedule expired/unpublished */}
      {showWarning && (
        <div className="px-[clamp(16px,2.4vw,44px)] py-1.5 bg-amber-900/90 text-amber-100 text-[clamp(0.68rem,0.85vw,1.02rem)] font-semibold flex items-center justify-center gap-3">
          {!isOnline && (
            <span className="inline-flex items-center gap-1.5">
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
              <span>{t.offlineNotice}</span>
            </span>
          )}
          {scheduleValidation.isExpired && (
            <span className="inline-flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{t.scheduleExpiredWarning}</span>
            </span>
          )}
          {!scheduleValidation.isExpired && scheduleValidation.isUnpublished && (
            <span className="inline-flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{t.scheduleUnpublishedNotice}</span>
            </span>
          )}
        </div>
      )}

      {/* Slim Single-Line Mosque Announcement Ribbon */}
      <div
        className={`border-t ${theme.hairline} ${theme.footerBg} px-[clamp(18px,2.6vw,52px)] py-[clamp(8px,1.15vh,16px)] flex items-center justify-between gap-4`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {showAnnouncements && mediaUrl && (
            <img
              src={mediaUrl}
              alt={title}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-lg object-cover border border-[#B08533]/45 shrink-0"
            />
          )}
          <div className="min-w-0 flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${announcementKey}-${activeLocale}`}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.25 }}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 min-w-0"
              >
                <span className={`font-extrabold text-[clamp(0.76rem,0.95vw,1.25rem)] shrink-0 ${theme.goldText}`}>
                  {showAnnouncements ? title : t.etiquetteTitle}
                </span>
                <span className="text-[clamp(0.74rem,0.92vw,1.2rem)] opacity-85 truncate">
                  {showAnnouncements ? body : t.etiquetteSubtitle}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Quiet dot indicator when multiple announcements rotate */}
        {showAnnouncements && totalAnnouncements > 1 && (
          <div className="hidden sm:flex items-center gap-1.5 shrink-0" aria-hidden="true">
            {Array.from({ length: totalAnnouncements }).map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === activeIndex % totalAnnouncements
                    ? 'w-5 bg-[#B08533]'
                    : 'w-1.5 bg-current opacity-25'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </footer>
  );
};
