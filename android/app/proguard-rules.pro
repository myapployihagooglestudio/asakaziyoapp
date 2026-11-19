# ASAKA ZIYO v4.0.0 — R8 / ProGuard Release Rules
-keepattributes *Annotation*
-keepattributes Signature,InnerClasses,EnclosingMethod

# Keep ALL Android WebView @JavascriptInterface methods intact (fixes R8 stripping of AsakaNativeBridge)
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class uz.asakaziyo.app.MainActivity$AsakaNativeBridge { *; }
-keep class uz.asakaziyo.app.MainActivity$AsakaAndroidBridge { *; }
-keep class uz.asakaziyo.app.MainActivity { *; }
-keep class uz.asakaziyo.app.AsakaMediaPlaybackService { *; }
-keep class uz.asakaziyo.app.AsakaFirebaseMessagingService { *; }
-keep class uz.asakaziyo.app.AsakaPrayerAlarmReceiver { *; }
-keep class uz.asakaziyo.app.AsakaBootReceiver { *; }

# AndroidX WebKit, SplashScreen & Media3
-keep class androidx.webkit.** { *; }
-keep class androidx.core.splashscreen.** { *; }
-keep class androidx.media3.** { *; }

# Firebase & Play Services
-keepattributes Exceptions
-dontwarn com.google.firebase.**
-dontwarn androidx.webkit.**
