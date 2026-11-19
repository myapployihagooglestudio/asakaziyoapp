/**
 * ASAKA ZIYO — Mobile Configuration Metadata
 * Package Identifier: uz.asakaziyo.app
 * Version: 4.0.0 (Build 400)
 *
 * NOTE: The canonical production Android build uses the native Kotlin + AndroidX WebView +
 * Media3 + AlarmManager + FCM project in /android (not @capacitor/* runtime packages).
 * This file is kept strictly synchronized for metadata parity and security settings.
 */

export interface CapacitorConfig {
  appId: string;
  appName: string;
  webDir: string;
  bundledWebRuntime?: boolean;
  server?: {
    androidScheme?: string;
    cleartext?: boolean;
  };
  android?: {
    allowMixedContent?: boolean;
    captureInput?: boolean;
    webContentsDebuggingEnabled?: boolean;
    backgroundColor?: string;
  };
  plugins?: Record<string, any>;
}

const config: CapacitorConfig = {
  appId: 'uz.asakaziyo.app',
  appName: 'ASAKA ZIYO',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    backgroundColor: '#031814',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: '#04120e',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#04120e',
      overlaysWebView: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_asaka_ziyo',
      iconColor: '#C9A84C',
      sound: 'adhan_notification.wav',
    },
  },
};

export default config;
