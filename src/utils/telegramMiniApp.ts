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
  accent_text_color?: string;
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

export interface TelegramMainButton {
  text?: string;
  color?: string;
  textColor?: string;
  isVisible?: boolean;
  isActive?: boolean;
  setText: (text: string) => void;
  setParams?: (params: {
    text?: string;
    color?: string;
    text_color?: string;
    is_active?: boolean;
    is_visible?: boolean;
  }) => void;
  show: () => void;
  hide: () => void;
  enable?: () => void;
  disable?: () => void;
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
  isFullscreen?: boolean;
  viewportHeight?: number;
  viewportStableHeight?: number;
  safeAreaInset?: TelegramSafeAreaInset;
  contentSafeAreaInset?: TelegramSafeAreaInset;
  BackButton?: TelegramBackButton;
  MainButton?: TelegramMainButton;
  HapticFeedback?: TelegramHapticFeedback;
  ready?: () => void;
  expand?: () => void;
  close?: () => void;
  requestFullscreen?: () => void;
  exitFullscreen?: () => void;
  openTelegramLink?: (url: string) => void;
  openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
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
  qibla: 'prayer',
  prayer_journal: 'prayer_journal',
  namoz_jurnali: 'prayer_journal',
  reminder_dashboard: 'reminder_dashboard',
  eslatmalar: 'reminder_dashboard',
  taqvim: 'calendar',
  calendar: 'calendar',
  hijri: 'calendar',
  fasting: 'fasting',
  roza: 'fasting',
  ramazon: 'fasting',
  mosque_events: 'mosque_events',
  tadbirlar: 'mosque_events',
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
  yangiliklar: 'news',
  announcements: 'announcements',
  elonlar: 'announcements',
  daily_archive: 'daily_archive',
  arxiv: 'daily_archive',
  messages: 'messages',
  xabarlar: 'messages',
  notifications: 'notifications',
  bildirishnomalar: 'notifications',
  favorites: 'favorites',
  sevimlilar: 'favorites',
  achievements: 'achievements',
  yutuqlar: 'achievements',
  search: 'search',
  qidiruv: 'search',
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
  premium: 'premium',
  obuna: 'premium',
  tarif: 'premium',
  tanlov: 'premium',
};

let activeBackHandler: (() => void) | null = null;
let activeMainButtonHandler: (() => void) | null = null;

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

  if (typeof document !== 'undefined' && webApp.themeParams) {
    const root = document.documentElement;
    const tp = webApp.themeParams;
    if (tp.bg_color) root.style.setProperty('--tg-theme-bg-color', tp.bg_color);
    if (tp.text_color) root.style.setProperty('--tg-theme-text-color', tp.text_color);
    if (tp.hint_color) root.style.setProperty('--tg-theme-hint-color', tp.hint_color);
    if (tp.button_color) root.style.setProperty('--tg-theme-button-color', tp.button_color);
    if (tp.secondary_bg_color) {
      root.style.setProperty('--tg-theme-secondary-bg-color', tp.secondary_bg_color);
    }
  }
}

function applySafeAreaCssVariables(webApp: TelegramWebApp): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const topInset =
    (webApp.safeAreaInset?.top ?? 0) + (webApp.contentSafeAreaInset?.top ?? 0);
  const bottomInset =
    (webApp.safeAreaInset?.bottom ?? 0) + (webApp.contentSafeAreaInset?.bottom ?? 0);
  const leftInset =
    (webApp.safeAreaInset?.left ?? 0) + (webApp.contentSafeAreaInset?.left ?? 0);
  const rightInset =
    (webApp.safeAreaInset?.right ?? 0) + (webApp.contentSafeAreaInset?.right ?? 0);

  root.style.setProperty('--tg-safe-top', `${Math.max(0, topInset)}px`);
  root.style.setProperty('--tg-safe-bottom', `${Math.max(0, bottomInset)}px`);
  root.style.setProperty('--tg-safe-left', `${Math.max(0, leftInset)}px`);
  root.style.setProperty('--tg-safe-right', `${Math.max(0, rightInset)}px`);
  if (typeof webApp.viewportStableHeight === 'number' && webApp.viewportStableHeight > 0) {
    root.style.setProperty('--tg-viewport-stable-height', `${webApp.viewportStableHeight}px`);
  }
  root.dataset.telegramMiniApp = 'true';
  if (webApp.platform) {
    root.dataset.telegramPlatform = webApp.platform;
  }
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
    // Enable fullscreen cleanly on Bot API 8.0+ mobile Telegram clients when supported
    if (
      typeof webApp.requestFullscreen === 'function' &&
      (webApp.platform === 'android' || webApp.platform === 'ios')
    ) {
      webApp.requestFullscreen();
    }
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
  const handleThemeChange = () => {
    const darkNow = document.documentElement.classList.contains('dark');
    applyTelegramThemeChrome(darkNow);
  };
  try {
    webApp.onEvent?.('viewportChanged', handleViewportChange);
    webApp.onEvent?.('safeAreaChanged', handleViewportChange);
    webApp.onEvent?.('contentSafeAreaChanged', handleViewportChange);
    webApp.onEvent?.('themeChanged', handleThemeChange);
  } catch {
    // Ignore if client lacks event subscription
  }

  return () => {
    try {
      webApp.offEvent?.('viewportChanged', handleViewportChange);
      webApp.offEvent?.('safeAreaChanged', handleViewportChange);
      webApp.offEvent?.('contentSafeAreaChanged', handleViewportChange);
      webApp.offEvent?.('themeChanged', handleThemeChange);
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
    if (activeMainButtonHandler && webApp.MainButton) {
      try {
        webApp.MainButton.offClick(activeMainButtonHandler);
        webApp.MainButton.hide();
      } catch {
        // Ignore cleanup errors
      }
      activeMainButtonHandler = null;
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

export function syncTelegramMainButton(options: {
  visible: boolean;
  text?: string;
  onClick?: () => void;
  color?: string;
  textColor?: string;
}): void {
  const webApp = getTelegramWebApp();
  const mainButton = webApp?.MainButton;
  if (!mainButton) return;

  try {
    if (activeMainButtonHandler) {
      mainButton.offClick(activeMainButtonHandler);
      activeMainButtonHandler = null;
    }

    if (options.visible && options.text && options.onClick) {
      activeMainButtonHandler = options.onClick;
      if (mainButton.setParams) {
        mainButton.setParams({
          text: options.text,
          color: options.color || '#10B981',
          text_color: options.textColor || '#04120D',
          is_active: true,
          is_visible: true,
        });
      } else {
        mainButton.setText(options.text);
        mainButton.show();
      }
      mainButton.onClick(options.onClick);
    } else {
      mainButton.hide();
    }
  } catch {
    // Ignore MainButton errors on older clients
  }
}

export function shareViaTelegram(text: string, url = 'https://asakaziyo.ai.studio'): boolean {
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  const webApp = getTelegramWebApp();
  if (webApp?.openTelegramLink) {
    try {
      webApp.openTelegramLink(shareUrl);
      return true;
    } catch {
      // fall through
    }
  }
  return false;
}

export function openSafeTelegramLink(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    const webApp = getTelegramWebApp();
    if (webApp) {
      if (parsed.hostname === 't.me' && webApp.openTelegramLink) {
        webApp.openTelegramLink(url);
        return true;
      }
      if (webApp.openLink) {
        webApp.openLink(url);
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

export function closeTelegramMiniApp(): void {
  try {
    getTelegramWebApp()?.close?.();
  } catch {
    // Ignore
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
