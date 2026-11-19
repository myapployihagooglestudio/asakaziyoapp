package uz.asakaziyo.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.provider.Settings
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.WindowInsetsControllerCompat
import java.io.ByteArrayInputStream
import java.io.InputStream

/**
 * ASAKA ZIYO — Main Native Android Activity (v4.0.0 · Build 400 · Target API 36)
 * Hosts the bundled offline-capable application via a virtual HTTPS origin
 * (https://appassets.androidplatform.net/index.html) with Android 12+ SplashScreen API,
 * hardened WebView security, deep link & notification targetView routing,
 * Android 10–16 runtime permissions bridge, Photo Picker support,
 * real AlarmManager prayer notifications, and dynamic system bar styling.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var pageFinished = false
    private var triedReloadFallback = false
    private var pendingTargetView: String? = null
    private var pendingPermissionGroupKey: String? = null
    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val callback = fileUploadCallback
        fileUploadCallback = null
        if (callback == null) return@registerForActivityResult

        if (result.resultCode != Activity.RESULT_OK || result.data == null) {
            callback.onReceiveValue(null)
            return@registerForActivityResult
        }

        val data = result.data!!
        val uris = mutableListOf<Uri>()
        data.clipData?.let { clip ->
            for (i in 0 until clip.itemCount) {
                clip.getItemAt(i).uri?.let { uris.add(it) }
            }
        } ?: data.data?.let { uris.add(it) }

        callback.onReceiveValue(if (uris.isEmpty()) null else uris.toTypedArray())
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        // Android 12+ SplashScreen API (must be called before super.onCreate)
        installSplashScreen()
        super.onCreate(savedInstanceState)
        supportActionBar?.hide()

        // Deep Emerald status and navigation bars (#031814) with light icons
        applySystemBarsTheme(isDark = true)

        ensureHighImportanceNotificationChannels()

        // Enable WebView remote inspection strictly in debug builds (never in Play Store release)
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)

        webView = WebView(this)
        webView.setBackgroundColor(Color.parseColor("#031814"))
        setContentView(webView)

        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.allowFileAccess = false
        settings.allowContentAccess = true
        settings.loadsImagesAutomatically = true
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.javaScriptCanOpenWindowsAutomatically = false
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        settings.textZoom = 100

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?
            ): WebResourceResponse? {
                val url = request?.url?.toString() ?: return null
                return handleAssetIntercept(url) ?: super.shouldInterceptRequest(view, request)
            }

            @Deprecated("Deprecated in Java")
            override fun shouldInterceptRequest(view: WebView?, url: String?): WebResourceResponse? {
                if (url != null) {
                    val res = handleAssetIntercept(url)
                    if (res != null) return res
                }
                @Suppress("DEPRECATION")
                return super.shouldInterceptRequest(view, url)
            }

            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val uri = request?.url ?: return false
                val url = uri.toString()
                val host = (uri.host ?: "").lowercase()

                // Keep virtual bundled app origin & Firebase auth flows inside WebView
                if (
                    host == "appassets.androidplatform.net" ||
                    host == "asakaziyo.uz" ||
                    host.endsWith(".asakaziyo.uz") ||
                    host == "asakaziyo.ai.studio" ||
                    host.endsWith(".firebaseapp.com") ||
                    host == "accounts.google.com"
                ) {
                    return false
                }

                // Route phone, mail, Telegram, and external web links to the appropriate Android app
                if (
                    url.startsWith("tel:") ||
                    url.startsWith("mailto:") ||
                    url.startsWith("tg:") ||
                    url.startsWith("https://") ||
                    url.startsWith("http://")
                ) {
                    try {
                        val action = if (url.startsWith("tel:")) Intent.ACTION_DIAL else Intent.ACTION_VIEW
                        startActivity(Intent(action, uri))
                        return true
                    } catch (_: Exception) {}
                }
                return false
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                pageFinished = true
                pendingTargetView?.let { target ->
                    pendingTargetView = null
                    dispatchNavigationToWebView(target)
                }
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                if (request?.isForMainFrame == true) {
                    if (!triedReloadFallback) {
                        triedReloadFallback = true
                        view?.loadUrl("https://appassets.androidplatform.net/index.html")
                    } else {
                        view?.loadDataWithBaseURL(
                            "https://appassets.androidplatform.net/",
                            buildOfflineFallbackHtml(),
                            "text/html",
                            "UTF-8",
                            null
                        )
                    }
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(cm: ConsoleMessage?): Boolean {
                if (BuildConfig.DEBUG && cm != null) {
                    Log.d("ASAKA_ZIYO_WEBVIEW", "[${cm.messageLevel()}] ${cm.message()} (${cm.sourceId()}:${cm.lineNumber()})")
                }
                return true
            }

            override fun onPermissionRequest(request: PermissionRequest?) {
                if (request == null) return
                val originStr = request.origin?.toString() ?: ""
                if (!originStr.startsWith("https://appassets.androidplatform.net")) {
                    request.deny()
                    return
                }
                val grantable = mutableListOf<String>()
                for (resource in request.resources) {
                    when (resource) {
                        PermissionRequest.RESOURCE_VIDEO_CAPTURE -> {
                            if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                                grantable.add(resource)
                            }
                        }
                        PermissionRequest.RESOURCE_AUDIO_CAPTURE -> {
                            if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                                grantable.add(resource)
                            }
                        }
                    }
                }
                if (grantable.isNotEmpty()) {
                    request.grant(grantable.toTypedArray())
                } else {
                    request.deny()
                }
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                fileUploadCallback?.onReceiveValue(null)
                fileUploadCallback = filePathCallback
                return try {
                    val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                        addCategory(Intent.CATEGORY_OPENABLE)
                        type = "*/*"
                    }
                    fileChooserLauncher.launch(intent)
                    true
                } catch (e: Exception) {
                    fileUploadCallback?.onReceiveValue(null)
                    fileUploadCallback = null
                    false
                }
            }
        }

        webView.addJavascriptInterface(AsakaNativeBridge(), "AsakaAndroidBridge")

        // Capture any notification targetView or deep link passed on initial launch
        extractTargetViewFromIntent(intent)?.let { pendingTargetView = it }

        // Load bundled production application over virtual HTTPS origin
        val initialHash = pendingTargetView?.let { "#$it" } ?: ""
        webView.loadUrl("https://appassets.androidplatform.net/index.html$initialHash")

        // Handle Android Hardware Back Navigation cleanly
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val target = extractTargetViewFromIntent(intent) ?: return
        if (pageFinished) {
            dispatchNavigationToWebView(target)
        } else {
            pendingTargetView = target
        }
    }

    private fun extractTargetViewFromIntent(intent: Intent?): String? {
        if (intent == null) return null
        val extraView = intent.getStringExtra("targetView")?.trim()
        if (!extraView.isNullOrEmpty()) {
            return sanitizeRouteSlug(extraView)
        }
        val data: Uri = intent.data ?: return null
        val fragment = data.fragment?.trim()
        if (!fragment.isNullOrEmpty()) {
            return sanitizeRouteSlug(fragment)
        }
        val firstSegment = data.pathSegments?.firstOrNull()?.trim()
        if (!firstSegment.isNullOrEmpty()) {
            return sanitizeRouteSlug(firstSegment)
        }
        return null
    }

    private fun sanitizeRouteSlug(raw: String): String {
        return raw.replace(Regex("[^a-zA-Z0-9_-]"), "").take(48)
    }

    private fun dispatchNavigationToWebView(targetView: String) {
        val safe = sanitizeRouteSlug(targetView)
        if (safe.isEmpty()) return
        webView.post {
            webView.evaluateJavascript(
                "try{window.location.hash='#$safe';window.dispatchEvent(new CustomEvent('asaka-native-navigate',{detail:{targetView:'$safe'}}));}catch(e){}",
                null
            )
        }
    }

    private fun applySystemBarsTheme(isDark: Boolean) {
        val barColor = if (isDark) Color.parseColor("#031814") else Color.parseColor("#F8F5EC")
        window.statusBarColor = barColor
        window.navigationBarColor = barColor
        val insetsController = WindowInsetsControllerCompat(window, window.decorView)
        insetsController.isAppearanceLightStatusBars = !isDark
        insetsController.isAppearanceLightNavigationBars = !isDark
    }

    private fun buildOfflineFallbackHtml(): String {
        return """
            <!doctype html>
            <html lang="uz">
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width,initial-scale=1" />
              <title>ASAKA ZIYO</title>
              <style>
                body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#031814;color:#f8f5ec;font-family:sans-serif;text-align:center;padding:24px;}
                .card{max-width:340px;padding:28px 22px;border-radius:18px;background:#071614;border:1px solid rgba(198,164,92,.45);}
                h1{margin:0 0 8px;color:#c6a45c;font-size:22px;letter-spacing:.08em;}
                p{margin:0 0 18px;font-size:14px;line-height:1.5;color:#d6d3d1;}
                button{background:#c6a45c;color:#031814;border:none;border-radius:12px;padding:12px 20px;font-weight:700;font-size:14px;}
              </style>
            </head>
            <body>
              <div class="card">
                <h1>ASAKA ZIYO</h1>
                <p>Ilova resurslarini qayta yuklash talab qilinadi. Iltimos, quyidagi tugmani bosing.</p>
                <button onclick="location.href='https://appassets.androidplatform.net/index.html'">Qayta yuklash</button>
              </div>
            </body>
            </html>
        """.trimIndent()
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 7001) {
            val groupKey = pendingPermissionGroupKey ?: return
            pendingPermissionGroupKey = null
            val granted = grantResults.isNotEmpty() && grantResults.all { it == PackageManager.PERMISSION_GRANTED }
            val statusStr = if (granted) "granted" else "denied"
            webView.post {
                val safeKey = groupKey.replace("'", "")
                webView.evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('asaka-native-permission-result',{detail:{key:'$safeKey',status:'$statusStr'}}));",
                    null
                )
            }
        }
    }

    private fun ensureHighImportanceNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val channels = listOf(
                NotificationChannel(
                    "asaka_ziyo_prayer_pre_reminder",
                    getString(R.string.channel_prayer_pre_reminder),
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Namoz vaqti kirishidan oldin eslatma"
                    enableVibration(true)
                },
                NotificationChannel(
                    "asaka_ziyo_prayer_adhan",
                    getString(R.string.channel_prayer_adhan),
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Namoz vaqti kirganda Azon va bildirishnoma"
                    enableVibration(true)
                },
                NotificationChannel(
                    "asaka_ziyo_announcements",
                    getString(R.string.channel_announcements),
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Asaka Jomeʼ masjidi muhim eʼlonlari"
                    enableVibration(true)
                },
                NotificationChannel(
                    "asaka_ziyo_news_articles",
                    getString(R.string.channel_news_articles),
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Yangi maqola, yangilik va maʼrifiy postlar"
                    enableVibration(true)
                },
                NotificationChannel(
                    "asaka_ziyo_chat_messages",
                    getString(R.string.channel_chat_messages),
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Jamoat suhbat xonasi va Imom javoblari"
                    enableVibration(true)
                }
            )
            channels.forEach { manager.createNotificationChannel(it) }
        }
    }

    private fun handleAssetIntercept(rawUrl: String): WebResourceResponse? {
        var cleanUrl = rawUrl
        val qIdx = cleanUrl.indexOf('?')
        if (qIdx != -1) cleanUrl = cleanUrl.substring(0, qIdx)
        val hIdx = cleanUrl.indexOf('#')
        if (hIdx != -1) cleanUrl = cleanUrl.substring(0, hIdx)

        var assetRelPath: String? = null
        if (cleanUrl.startsWith("https://appassets.androidplatform.net")) {
            assetRelPath = cleanUrl.removePrefix("https://appassets.androidplatform.net")
        }

        if (assetRelPath == null) return null

        while (assetRelPath.startsWith("/")) {
            assetRelPath = assetRelPath.substring(1)
        }
        if (assetRelPath.isEmpty()) {
            assetRelPath = "index.html"
        }

        // Prevent path traversal outside assets/public/
        if (assetRelPath.contains("..")) {
            return WebResourceResponse("text/plain", "UTF-8", 403, "Forbidden", emptyMap(), ByteArrayInputStream(ByteArray(0)))
        }

        // Never fake API success responses for /api/* routes — let network/fetch layer handle API calls
        if (assetRelPath.startsWith("api/")) {
            return null
        }

        return try {
            val stream: InputStream = try {
                assets.open("public/$assetRelPath")
            } catch (e: Exception) {
                if (!assetRelPath.contains(".")) {
                    assetRelPath = "index.html"
                    assets.open("public/index.html")
                } else {
                    throw e
                }
            }
            val mime = resolveMimeType(assetRelPath)
            val encoding = if (isTextMime(mime)) "UTF-8" else null
            WebResourceResponse(
                mime,
                encoding,
                200,
                "OK",
                mapOf(
                    "Cache-Control" to "no-cache",
                    "Access-Control-Allow-Origin" to "https://appassets.androidplatform.net"
                ),
                stream
            )
        } catch (e: Exception) {
            Log.w("ASAKA_ZIYO_WEBVIEW", "Asset not found: public/$assetRelPath")
            WebResourceResponse(
                "text/plain",
                "UTF-8",
                404,
                "Not Found",
                emptyMap(),
                ByteArrayInputStream(ByteArray(0))
            )
        }
    }

    private fun resolveMimeType(path: String): String {
        val lower = path.lowercase()
        return when {
            lower.endsWith(".html") || lower.endsWith(".htm") -> "text/html"
            lower.endsWith(".js") || lower.endsWith(".mjs") -> "text/javascript"
            lower.endsWith(".css") -> "text/css"
            lower.endsWith(".json") || lower.endsWith(".webmanifest") -> "application/json"
            lower.endsWith(".svg") -> "image/svg+xml"
            lower.endsWith(".png") -> "image/png"
            lower.endsWith(".jpg") || lower.endsWith(".jpeg") -> "image/jpeg"
            lower.endsWith(".webp") -> "image/webp"
            lower.endsWith(".ico") -> "image/x-icon"
            lower.endsWith(".mp3") -> "audio/mpeg"
            lower.endsWith(".wav") -> "audio/wav"
            lower.endsWith(".woff") -> "font/woff"
            lower.endsWith(".woff2") -> "font/woff2"
            else -> "application/octet-stream"
        }
    }

    private fun isTextMime(mime: String): Boolean {
        return mime.startsWith("text/") || mime == "application/json" || mime == "image/svg+xml"
    }

    private fun mapPermissionGroupToAndroidStrings(groupKey: String): Array<String> {
        return when (groupKey) {
            "notifications" -> {
                if (Build.VERSION.SDK_INT >= 33) arrayOf(Manifest.permission.POST_NOTIFICATIONS)
                else emptyArray()
            }
            "camera" -> arrayOf(Manifest.permission.CAMERA)
            "microphone" -> arrayOf(Manifest.permission.RECORD_AUDIO)
            "location" -> arrayOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            )
            // Photos/videos & online streaming Quran audio use Photo Picker / MediaStore scoped storage
            "photos_videos", "music_audio", "phone" -> emptyArray()
            else -> emptyArray()
        }
    }

    inner class AsakaNativeBridge {
        @JavascriptInterface
        fun shareText(title: String, text: String) {
            val sendIntent = Intent().apply {
                action = Intent.ACTION_SEND
                putExtra(Intent.EXTRA_TITLE, title)
                putExtra(Intent.EXTRA_TEXT, text)
                type = "text/plain"
            }
            startActivity(Intent.createChooser(sendIntent, title))
        }

        @JavascriptInterface
        fun vibrate(durationMs: Long) {
            val vibrator = getSystemService(VIBRATOR_SERVICE) as? Vibrator ?: return
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createOneShot(durationMs, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(durationMs)
            }
        }

        @JavascriptInterface
        fun checkPermissionStatus(groupKey: String): String {
            if (groupKey == "notifications" && Build.VERSION.SDK_INT < 33) {
                val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                return if (nm.areNotificationsEnabled()) "granted" else "denied"
            }
            val perms = mapPermissionGroupToAndroidStrings(groupKey)
            if (perms.isEmpty()) return "granted"
            val allGranted = perms.all {
                ContextCompat.checkSelfPermission(this@MainActivity, it) == PackageManager.PERMISSION_GRANTED
            }
            return if (allGranted) "granted" else "prompt"
        }

        @JavascriptInterface
        fun requestRuntimePermission(groupKey: String): String {
            val perms = mapPermissionGroupToAndroidStrings(groupKey)
            if (perms.isEmpty()) return "granted"
            val missing = perms.filter {
                ContextCompat.checkSelfPermission(this@MainActivity, it) != PackageManager.PERMISSION_GRANTED
            }
            if (missing.isEmpty()) return "granted"
            pendingPermissionGroupKey = groupKey
            ActivityCompat.requestPermissions(this@MainActivity, missing.toTypedArray(), 7001)
            return "prompt"
        }

        // Legacy method aliases preserved for compatibility
        @JavascriptInterface
        fun checkPermission(groupKey: String): String = checkPermissionStatus(groupKey)

        @JavascriptInterface
        fun requestPermission(groupKey: String): String = requestRuntimePermission(groupKey)

        @JavascriptInterface
        fun openAppSettings() {
            try {
                val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.fromParts("package", packageName, null)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                startActivity(intent)
            } catch (_: Exception) {}
        }

        @JavascriptInterface
        fun openDialer(phone: String) {
            try {
                val sanitized = phone.replace(Regex("[^+0-9*#]"), "")
                if (sanitized.isBlank()) return
                val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$sanitized")).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                startActivity(intent)
            } catch (_: Exception) {}
        }

        @JavascriptInterface
        fun dialPhoneNumber(phone: String) = openDialer(phone)

        @JavascriptInterface
        fun showHeadsUpNotification(title: String, body: String, channelId: String, targetView: String) {
            try {
                val intent = Intent(this@MainActivity, MainActivity::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                    putExtra("targetView", targetView)
                }
                val pendingIntent = PendingIntent.getActivity(
                    this@MainActivity,
                    (System.currentTimeMillis() % 10000).toInt(),
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                val resolvedChannel = if (channelId.isNotBlank()) channelId else "asaka_ziyo_prayer_adhan"
                val largeIcon = AsakaIconUtils.renderLauncherBitmap(this@MainActivity)
                val builder = NotificationCompat.Builder(this@MainActivity, resolvedChannel)
                    .setSmallIcon(R.drawable.ic_stat_asaka_ziyo)
                    .setLargeIcon(largeIcon)
                    .setColor(ContextCompat.getColor(this@MainActivity, R.color.asaka_emerald_primary))
                    .setContentTitle(title)
                    .setContentText(body)
                    .setStyle(NotificationCompat.BigTextStyle().bigText(body))
                    .setPriority(NotificationCompat.PRIORITY_MAX)
                    .setCategory(NotificationCompat.CATEGORY_ALARM)
                    .setDefaults(NotificationCompat.DEFAULT_ALL)
                    .setAutoCancel(true)
                    .setContentIntent(pendingIntent)

                val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                manager.notify((System.currentTimeMillis() % 100000).toInt(), builder.build())
            } catch (e: Exception) {
                Log.w("ASAKA_ZIYO_NOTIFY", "Failed to show heads-up notification: ${e.message}")
            }
        }

        @JavascriptInterface
        fun schedulePrayerNotification(
            alarmId: Int,
            triggerAtMillis: Long,
            title: String,
            body: String,
            channelId: String,
            playAdhan: Boolean
        ) {
            AsakaPrayerAlarmReceiver.scheduleExactAlarm(
                context = applicationContext,
                alarmId = alarmId,
                triggerAtMillis = triggerAtMillis,
                title = title,
                body = body,
                channelId = channelId,
                playAdhan = playAdhan
            )
        }

        @JavascriptInterface
        fun cancelScheduledPrayerNotifications() {
            AsakaPrayerAlarmReceiver.cancelAllAlarms(applicationContext)
        }

        @JavascriptInterface
        fun setSystemBarsTheme(isDark: Boolean) {
            runOnUiThread {
                applySystemBarsTheme(isDark)
            }
        }

        @JavascriptInterface
        fun getAppVersion(): String = BuildConfig.VERSION_NAME

        @JavascriptInterface
        fun getVersionCode(): Int = BuildConfig.VERSION_CODE

        @JavascriptInterface
        fun isNativeApp(): Boolean = true
    }
}
