package uz.asakaziyo.app

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.util.Log
import android.view.Window
import android.webkit.ConsoleMessage
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import java.io.ByteArrayInputStream
import java.io.InputStream

/**
 * ASAKA ZIYO — Main Native Android Activity (2026)
 * Hosts the bundled offline-capable application via a virtual HTTPS origin
 * (https://appassets.androidplatform.net/index.html) with root-relative asset resolution,
 * hardware acceleration, system bar styling, hardware back-button support, and native bridges.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var triedFileFallback = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        requestWindowFeature(Window.FEATURE_NO_TITLE)
        supportRequestWindowFeature(Window.FEATURE_NO_TITLE)
        super.onCreate(savedInstanceState)
        supportActionBar?.hide()

        // Deep Emerald status and navigation bars (#031814)
        window.statusBarColor = Color.parseColor("#031814")
        window.navigationBarColor = Color.parseColor("#031814")

        WebView.setWebContentsDebuggingEnabled(true)

        webView = WebView(this)
        webView.setBackgroundColor(Color.parseColor("#031814"))
        setContentView(webView)

        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        @Suppress("DEPRECATION")
        settings.allowFileAccessFromFileURLs = true
        @Suppress("DEPRECATION")
        settings.allowUniversalAccessFromFileURLs = true
        settings.loadsImagesAutomatically = true
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.javaScriptCanOpenWindowsAutomatically = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

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
                val url = request?.url?.toString() ?: return false
                if (url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("https://t.me/")) {
                    try {
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                        return true
                    } catch (_: Exception) {}
                }
                return false
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                if (request?.isForMainFrame == true && !triedFileFallback) {
                    triedFileFallback = true
                    view?.loadUrl("file:///android_asset/public/index.html")
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(cm: ConsoleMessage?): Boolean {
                if (cm != null) {
                    Log.d("ASAKA_ZIYO_WEBVIEW", "[${cm.messageLevel()}] ${cm.message()} (${cm.sourceId()}:${cm.lineNumber()})")
                }
                return true
            }
        }

        webView.addJavascriptInterface(AsakaNativeBridge(), "AsakaAndroidBridge")

        // Load bundled production application over virtual HTTPS origin
        webView.loadUrl("https://appassets.androidplatform.net/index.html")

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

    private fun handleAssetIntercept(rawUrl: String): WebResourceResponse? {
        var cleanUrl = rawUrl
        val qIdx = cleanUrl.indexOf('?')
        if (qIdx != -1) cleanUrl = cleanUrl.substring(0, qIdx)
        val hIdx = cleanUrl.indexOf('#')
        if (hIdx != -1) cleanUrl = cleanUrl.substring(0, hIdx)

        var assetRelPath: String? = null
        if (cleanUrl.startsWith("https://appassets.androidplatform.net")) {
            assetRelPath = cleanUrl.removePrefix("https://appassets.androidplatform.net")
        } else if (cleanUrl.startsWith("http://appassets.androidplatform.net")) {
            assetRelPath = cleanUrl.removePrefix("http://appassets.androidplatform.net")
        } else if (
            cleanUrl.startsWith("file:///assets/") ||
            cleanUrl.startsWith("file:///images/") ||
            cleanUrl.startsWith("file:///pwa-") ||
            cleanUrl.startsWith("file:///icon.svg") ||
            cleanUrl.startsWith("file:///apple-touch-icon.png") ||
            cleanUrl.startsWith("file:///favicon.ico") ||
            cleanUrl.startsWith("file:///manifest.")
        ) {
            assetRelPath = cleanUrl.removePrefix("file://")
        }

        if (assetRelPath == null) return null

        while (assetRelPath!!.startsWith("/")) {
            assetRelPath = assetRelPath.substring(1)
        }
        if (assetRelPath.isEmpty()) {
            assetRelPath = "index.html"
        }

        if (assetRelPath.startsWith("api/")) {
            val jsonBytes = "{\"success\":true,\"offline\":true,\"data\":{}}".toByteArray(Charsets.UTF_8)
            return WebResourceResponse(
                "application/json",
                "UTF-8",
                200,
                "OK",
                mapOf("Access-Control-Allow-Origin" to "*"),
                ByteArrayInputStream(jsonBytes)
            )
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
                    "Access-Control-Allow-Origin" to "*",
                    "Cache-Control" to "no-cache"
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
                mapOf("Access-Control-Allow-Origin" to "*"),
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
        fun getAppVersion(): String = "2.0.0"

        @JavascriptInterface
        fun isNativeApp(): Boolean = true
    }
}

