import { useState, useEffect, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface Window {
    __asaka_deferred_pwa_prompt?: BeforeInstallPromptEvent | null;
  }
}

// Global listener captured as early as possible so early browser events are not lost
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.__asaka_deferred_pwa_prompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new CustomEvent('asaka:pwa-ready'));
  });
}

export interface UsePWAInstallReturn {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isStandalone: boolean;
  isOnline: boolean;
  promptInstall: () => Promise<boolean>;
}

export function usePWAInstall(): UsePWAInstallReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window !== 'undefined' && window.__asaka_deferred_pwa_prompt) {
      return window.__asaka_deferred_pwa_prompt;
    }
    return null;
  });

  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Platform checks
  const isIOS =
    typeof window !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  const isAndroid =
    typeof window !== 'undefined' && /Android/i.test(navigator.userAgent);

  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://'));

  useEffect(() => {
    setIsInstalled(isStandalone);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const pwaEvt = e as BeforeInstallPromptEvent;
      window.__asaka_deferred_pwa_prompt = pwaEvt;
      setDeferredPrompt(pwaEvt);
    };

    const handlePwaReady = () => {
      if (window.__asaka_deferred_pwa_prompt) {
        setDeferredPrompt(window.__asaka_deferred_pwa_prompt);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      window.__asaka_deferred_pwa_prompt = null;
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('asaka:pwa-ready', handlePwaReady);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleDisplayModeChange);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('asaka:pwa-ready', handlePwaReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleDisplayModeChange);
      }
    };
  }, [isStandalone]);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    const prompt = deferredPrompt || (typeof window !== 'undefined' ? window.__asaka_deferred_pwa_prompt : null);
    if (!prompt) {
      return false;
    }

    try {
      await prompt.prompt();
      const choiceResult = await prompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        window.__asaka_deferred_pwa_prompt = null;
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Install prompt error:', err);
      return false;
    }
  }, [deferredPrompt]);

  return {
    isInstallable: !!deferredPrompt || (typeof window !== 'undefined' && !!window.__asaka_deferred_pwa_prompt),
    isInstalled,
    isIOS,
    isAndroid,
    isStandalone,
    isOnline,
    promptInstall,
  };
}
