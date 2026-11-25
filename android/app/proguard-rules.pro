# ASAKA ZIYO v5.0.0 — R8 / ProGuard Release Rules
-keepattributes *Annotation*
-keepattributes Signature,InnerClasses,EnclosingMethod

# Keep ALL Android WebView @JavascriptInterface methods intact for Admin/Web Portal screen
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class uz.asakaziyo.app.MainActivity$AsakaNativeBridge { *; }
-keep class uz.asakaziyo.app.MainActivity$AsakaAndroidBridge { *; }
-keep class uz.asakaziyo.app.MainActivity { *; }
-keep class uz.asakaziyo.app.AsakaWebPortalActivity { *; }
-keep class uz.asakaziyo.app.AsakaWebPortalActivity$AsakaNativeBridge { *; }
-keep class uz.asakaziyo.app.AsakaMediaPlaybackService { *; }
-keep class uz.asakaziyo.app.AsakaFirebaseMessagingService { *; }
-keep class uz.asakaziyo.app.AsakaPrayerAlarmReceiver { *; }
-keep class uz.asakaziyo.app.AsakaBootReceiver { *; }
-keep class uz.asakaziyo.app.AsakaPrayerWidgetProvider { *; }
-keep class uz.asakaziyo.app.AsakaNextPrayerWidgetProvider { *; }
-keep class uz.asakaziyo.app.AsakaQuranWidgetProvider { *; }
-keep class uz.asakaziyo.app.AsakaDhikrWidgetProvider { *; }
-keep class uz.asakaziyo.app.data.AsakaOfflineSyncWorker { *; }

# AndroidX WebKit, SplashScreen, Media3, Biometric & Security
-keep class androidx.webkit.** { *; }
-keep class androidx.core.splashscreen.** { *; }
-keep class androidx.media3.** { *; }
-keep class androidx.biometric.** { *; }
-keep class androidx.security.crypto.** { *; }

# Firebase & Play Services
-keepattributes Exceptions
-dontwarn com.google.firebase.**
-dontwarn androidx.webkit.**
-dontwarn com.google.crypto.tink.**
