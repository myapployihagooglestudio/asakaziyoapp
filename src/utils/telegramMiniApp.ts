import { NavigationTab } from '../types';

export interface TelegramWebAppThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
  header_bg_color?: string;
  bottom_bar_bg_color?: string;
}

export interface TelegramSafeAreaInset {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

export interface TelegramBackButton {
  isVisible?: boolean;
  show: () => void;
  hide: () => void;
  onClick: (cb: () => void) => void;
  offClick: (cb: () => void) => void;
}

export interface TelegramHapticFeedback {
  impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
  notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
  selectionChanged: () => void;
}

export interface TelegramWebApp {
  initData?: string;
  initDataUnsafe?: {
    start_param?: string;
    user?: {
      id?: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
  };
  version?: string;
  platform?: string;
  colorScheme?: 'light' | 'dark';
  themeParams?: TelegramWebAppThemeParams;
  isExpanded?: boolean;
  viewportHeight?: number;
  viewportStableHeight?: number;
  safeAreaInset?: TelegramSafeAreaInset;
  contentSafeAreaInset?: TelegramSafeAreaInset;
  BackButton?: TelegramBackButton;
  HapticFeedback?: TelegramHapticFeedback;
  ready?: () => void;
  expand?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  setBottomBarColor?: (color: string) => void;
  enableClosingConfirmation?: () => void;
  disableClosingConfirmation?: () => void;
  onEvent?: (eventType: string, callback: () => void) => void;
  offEvent?: (eventType: string, callback: () => void) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export type TelegramHapticKind = 'selection' | 'light' | 'medium' | 'success' | 'warning';

const TAB_ALIAS_MAP: Record<string, NavigationTab> = {
  home: 'home',
  bosh: 'home',
  prayer: 'prayer',
  namoz: 'prayer',
  vaqt: 'prayer',
  taqvim: 'calendar',
  calendar: 'calendar',
  hijri: 'calendar',
  qibla: 'prayer',
  quran: 'quran',
  quron: 'quran',
  sura: 'quran',
  hifz: 'hifz_istiqomat',
  hifz_istiqomat: 'hifz_istiqomat',
  yodlash: 'hifz_istiqomat',
  academy: 'academy',
  tajvid: 'academy',
  khatm: 'khatm_planner',
  khatm_planner: 'khatm_planner',
  hadith: 'hadith',
  hadis: 'hadith',
  dhikr: 'dhikr',
  zikr: 'dhikr',
  duo: 'dhikr',
  tasbeh: 'dhikr',
  ai: 'ai_assistant',
  ai_assistant: 'ai_assistant',
  ustoz: 'ai_assistant',
  library: 'library',
  kutubxona: 'library',
  scholars: 'scholars',
  olimlar: 'scholars',
  media: 'media_center',
  media_center: 'media_center',
  reels: 'media_center',
  quiz: 'quiz',
  viktorina: 'quiz',
  quran_quiz: 'quran_quiz',
  mosques: 'mosques',
  masjid: 'mosques',
  ask_imam: 'ask_imam',
  fatvo: 'ask_imam',
  articles: 'articles',
  maqolalar: 'articles',
  news: 'news',
  announcements: 'announcements',
  favorites: 'favorites',
  admin: 'admin',
  profile: 'profile',
  profil: 'profile',
  settings: 'settings',
  sozlamalar: 'settings',
  'masjid-tv': 'masjid_tv',
  masjid_tv: 'masjid_tv',
  masjidtv: 'masjid_tv',
  display: 'display',
  tv: 'masjid_tv',
};

let activeBackHandler: (() => void) | null = null;

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null;
  const webApp = window.Telegram?.WebApp;
  if (!webApp) return null;
  const hasRealContext =
    Boolean(webApp.initData) ||
    Boolean(webApp.initDataUnsafe?.user?.id) ||
    Boolean(webApp.initDataUnsafe?.start_param) ||
    (Boolean(webApp.platform) && webApp.platform !== 'unknown');
  return hasRealContext ? webApp : null;
}

export function isTelegramMiniApp(): boolean {
  return getTelegramWebApp() !== null;
}

export function normalizeDeepLinkTab(raw?: string | null): NavigationTab | null {
  if (!raw) return null;
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/^#\/?/, '')
    .replace(/^tab[_:-]/, '')
    .replace(/^open[_:-]/, '');
  if (!cleaned) return null;
  return TAB_ALIAS_MAP[cleaned] || null;
}

export function resolveInitialDeepLinkTab(): NavigationTab | null {
  if (typeof window === 'undefined') return null;

  try {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') || params.get('view') || params.get('screen');
    const fromQuery = normalizeDeepLinkTab(tabParam);
    if (fromQuery) return fromQuery;

    const startParam =
      params.get('tgWebAppStartParam') ||
      window.Telegram?.WebApp?.initDataUnsafe?.start_param ||
      null;
    const fromStartParam = normalizeDeepLinkTab(startParam);
    if (fromStartParam) return fromStartParam;

    const fromHash = normalizeDeepLinkTab(window.location.hash);
    if (fromHash) return fromHash;
  } catch {
    return null;
  }

  return null;
}

export function applyTelegramThemeChrome(isDark: boolean): void {
  const webApp = getTelegramWebApp();
  if (!webApp) return;

  const headerColor = isDark ? '#071410' : '#063B2C';
  const bgColor = isDark ? '#050F0C' : '#FBF8F1';
  const bottomBarColor = isDark ? '#071410' : '#FBF8F1';

  try {
    webApp.setHeaderColor?.(headerColor);
  } catch {
    // Older Telegram clients ignore custom hex header colors
  }
  try {
    webApp.setBackgroundColor?.(bgColor);
  } catch {
    // Ignore unsupported method
  }
  try {
    webApp.setBottomBarColor?.(bottomBarColor);
  } catch {
    // Ignore unsupported method
  }
}

function applySafeAreaCssVariables(webApp: TelegramWebApp): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const topInset =
    (webApp.safeAreaInset?.top ?? 0) + (webApp.contentSafeAreaInset?.top ?? 0);
  const bottomInset =
    (webApp.safeAreaInset?.bottom ?? 0) + (webApp.contentSafeAreaInset?.bottom ?? 0);

  root.style.setProperty('--tg-safe-top', `${Math.max(0, topInset)}px`);
  root.style.setProperty('--tg-safe-bottom', `${Math.max(0, bottomInset)}px`);
  if (typeof webApp.viewportStableHeight === 'number' && webApp.viewportStableHeight > 0) {
    root.style.setProperty('--tg-viewport-stable-height', `${webApp.viewportStableHeight}px`);
  }
  root.dataset.telegramMiniApp = 'true';
}

export function initTelegramMiniApp(
  isDark: boolean,
  onNavigateTab?: (tab: NavigationTab) => void,
): () => void {
  const webApp = getTelegramWebApp();
  if (!webApp) {
    return () => undefined;
  }

  try {
    webApp.ready?.();
    webApp.expand?.();
  } catch {
    // Ignore non-fatal Mini App bridge errors
  }

  applySafeAreaCssVariables(webApp);
  applyTelegramThemeChrome(isDark);

  const startTab = normalizeDeepLinkTab(webApp.initDataUnsafe?.start_param);
  if (startTab && onNavigateTab) {
    onNavigateTab(startTab);
  }

  const handleViewportChange = () => applySafeAreaCssVariables(webApp);
  try {
    webApp.onEvent?.('viewportChanged', handleViewportChange);
    webApp.onEvent?.('safeAreaChanged', handleViewportChange);
    webApp.onEvent?.('contentSafeAreaChanged', handleViewportChange);
  } catch {
    // Ignore if client lacks event subscription
  }

  return () => {
    try {
      webApp.offEvent?.('viewportChanged', handleViewportChange);
      webApp.offEvent?.('safeAreaChanged', handleViewportChange);
      webApp.offEvent?.('contentSafeAreaChanged', handleViewportChange);
    } catch {
      // Ignore cleanup errors
    }
    if (activeBackHandler && webApp.BackButton) {
      try {
        webApp.BackButton.offClick(activeBackHandler);
        webApp.BackButton.hide();
      } catch {
        // Ignore cleanup errors
      }
      activeBackHandler = null;
    }
  };
}

export function syncTelegramBackButton(canGoBack: boolean, onBack: () => void): void {
  const webApp = getTelegramWebApp();
  const backButton = webApp?.BackButton;
  if (!backButton) return;

  try {
    if (activeBackHandler) {
      backButton.offClick(activeBackHandler);
      activeBackHandler = null;
    }

    if (canGoBack) {
      activeBackHandler = onBack;
      backButton.onClick(onBack);
      backButton.show();
    } else {
      backButton.hide();
    }
  } catch {
    // Ignore BackButton errors on older clients
  }
}

export function triggerTelegramHaptic(kind: TelegramHapticKind = 'selection'): void {
  const haptic = getTelegramWebApp()?.HapticFeedback;
  if (!haptic) return;

  try {
    if (kind === 'selection') {
      haptic.selectionChanged();
    } else if (kind === 'light' || kind === 'medium') {
      haptic.impactOccurred(kind);
    } else if (kind === 'success' || kind === 'warning') {
      haptic.notificationOccurred(kind);
    }
  } catch {
    // Ignore unsupported haptic calls
  }
}
