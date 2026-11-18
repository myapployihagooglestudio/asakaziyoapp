# ASAKA ZIYO — R8 / ProGuard Release Rules
-keepattributes *Annotation*
-keepattributes Signature,InnerClasses,EnclosingMethod

# Keep Android WebView JavaScript Bridge methods intact
-keepclassmembers class uz.asakaziyo.app.MainActivity$AsakaAndroidBridge {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class uz.asakaziyo.app.MainActivity { *; }
-keep class uz.asakaziyo.app.AsakaMediaPlaybackService { *; }
-keep class uz.asakaziyo.app.AsakaFirebaseMessagingService { *; }
-keep class uz.asakaziyo.app.AsakaPrayerAlarmReceiver { *; }
-keep class uz.asakaziyo.app.AsakaBootReceiver { *; }

# AndroidX WebKit & Media3
-keep class androidx.webkit.** { *; }
-keep class androidx.media3.** { *; }

# Firebase & Play Services
-keepattributes Exceptions
-dontwarn com.google.firebase.**
-dontwarn androidx.webkit.**
