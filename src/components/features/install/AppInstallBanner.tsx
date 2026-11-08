import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { IslamicStarEmblem } from '../../ui/GeometricPattern';
import { usePWAInstall } from '../../../hooks/usePWAInstall';
import { toNewUzbekAlphabet } from '../../../utils/newUzbekAlphabet';
import { SupportedLocale } from '../../../types';
import { Download, Smartphone, X } from 'lucide-react';

interface AppInstallBannerProps {
  onOpenInstallModal: () => void;
}

export const AppInstallBanner: React.FC<AppInstallBannerProps> = ({
  onOpenInstallModal,
}) => {
  const { t, i18n } = useTranslation('common');
  const currentLocale = (i18n.language as SupportedLocale) || 'uz-Latn';
  const { isInstalled, isInstallable, isIOS, promptInstall } = usePWAInstall();

  const [dismissed, setDismissed] = useState(true);

  const getLocalized = (text: string) => {
    if (currentLocale === 'uz-Latn-new') {
      return toNewUzbekAlphabet(text);
    }
    return text;
  };

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const isDismissed = sessionStorage.getItem('asaka_ziyo_install_dismissed');
        if (!isDismissed && !isInstalled) {
          const timer = setTimeout(() => {
            setDismissed(false);
          }, 1500);
          return () => clearTimeout(timer);
        }
      }
    } catch {
      // ignore
    }
  }, [isInstalled]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem('asaka_ziyo_install_dismissed', 'true');
      }
    } catch {
      // ignore
    }
  };

  if (dismissed || isInstalled) {
    return null;
  }

  return (
    <aside
      aria-label={getLocalized("Ilovani oʻrnatish yoki yuklab olish")}
      className="fixed bottom-16 lg:bottom-5 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-lg z-40 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#04120e]/95 text-white border border-[#c9a84c]/45 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#071a14] border border-[#c9a84c]/35 flex items-center justify-center shrink-0">
            <IslamicStarEmblem size={20} className="text-[#c9a84c]" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-display text-xs font-bold tracking-wide text-white">
                ASAKA ZIYO
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-600 text-white">
                PWA
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#c9a84c] text-[#04120e]">
                APK v2.0.0
              </span>
            </div>
            <p className="text-[11px] text-stone-300 truncate mt-0.5">
              {getLocalized("Bosh ekranga oʻrnatish (PWA) yoki rasmiy Android APK yuklash")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
          {isInstallable ? (
            <button
              type="button"
              onClick={async () => {
                const ok = await promptInstall();
                if (ok) setDismissed(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-colors shadow-sm cursor-pointer whitespace-nowrap"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-300" />
              <span>{getLocalized("Oʻrnatish (PWA)")}</span>
            </button>
          ) : isIOS ? (
            <button
              type="button"
              onClick={onOpenInstallModal}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-colors shadow-sm cursor-pointer whitespace-nowrap"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-300" />
              <span>{getLocalized("iOS Oʻrnatish")}</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={onOpenInstallModal}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#c9a84c] text-[#04120e] text-xs font-bold hover:bg-[#d8b85c] transition-colors shadow-sm cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{getLocalized("APK Yuklash")}</span>
          </button>

          <button
            type="button"
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
