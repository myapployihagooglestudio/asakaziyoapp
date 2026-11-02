import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { IslamicStarEmblem } from '../../ui/GeometricPattern';
import { usePWAInstall } from '../../../hooks/usePWAInstall';
import { toNewUzbekAlphabet } from '../../../utils/newUzbekAlphabet';
import { SupportedLocale } from '../../../types';
import { Download, X, Smartphone } from 'lucide-react';

interface AppInstallBannerProps {
  onOpenInstallModal: () => void;
}

export const AppInstallBanner: React.FC<AppInstallBannerProps> = ({
  onOpenInstallModal,
}) => {
  const { t, i18n } = useTranslation('common');
  const currentLocale = (i18n.language as SupportedLocale) || 'uz-Latn';
  const { isInstalled } = usePWAInstall();

  const [dismissed, setDismissed] = useState(true);

  const getLocalized = (text: string) => {
    if (currentLocale === 'uz-Latn-new') {
      return toNewUzbekAlphabet(text);
    }
    return text;
  };

  useEffect(() => {
    // Only show if not installed and not dismissed in this session
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const isDismissed = sessionStorage.getItem('asaka_ziyo_install_dismissed');
        if (!isDismissed && !isInstalled) {
          // Delay appearance by 1.5s for polished UX
          const timer = setTimeout(() => {
            setDismissed(false);
          }, 1500);
          return () => clearTimeout(timer);
        }
      }
    } catch (e) {
      // Storage access policy fallback
    }
  }, [isInstalled]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem('asaka_ziyo_install_dismissed', 'true');
      }
    } catch (e) {
      // ignore
    }
  };

  if (dismissed || isInstalled) {
    return null;
  }

  return (
    <aside
      aria-label={getLocalized("Ilovani yuklab olish")}
      className="fixed bottom-14 lg:bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-40 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#031d17]/95 text-white border border-[#c5a869]/40 shadow-2xl backdrop-blur-md">
        <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-[#c5a869]/30 flex items-center justify-center shrink-0">
          <IslamicStarEmblem size={20} className="text-[#c5a869]" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-display text-xs font-bold tracking-wide text-white">
              ASAKA ZIYO
            </span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#c5a869] text-[#071614]">
              APK v1.0
            </span>
          </div>
          <p className="text-[11px] text-stone-300 truncate mt-0.5">
            {getLocalized("Ilovani oʻrnatish yoki APK yuklab olish")}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onOpenInstallModal}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#c5a869] text-[#071614] text-xs font-bold hover:bg-[#d8bd7e] transition-colors shadow-sm cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{getLocalized("Oʻrnatish")}</span>
          </button>

          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label={t('close', 'Yopish')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
