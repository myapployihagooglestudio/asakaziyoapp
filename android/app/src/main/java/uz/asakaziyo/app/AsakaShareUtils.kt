package uz.asakaziyo.app

import android.content.Context
import android.content.Intent

/**
 * ASAKA ZIYO v6.0.0 — Native Android Share Sheet & Deep Link Utility
 */
object AsakaShareUtils {

    fun shareText(
        context: Context,
        title: String,
        body: String,
        deepLinkView: String = "home"
    ) {
        val deepLink = "${BuildConfig.BACKEND_BASE_URL.trimEnd('/')}/?view=$deepLinkView"
        val composed = buildString {
            if (title.isNotBlank()) {
                append(title.trim())
                append("\n\n")
            }
            append(body.trim())
            append("\n\n— ASAKA ZIYO (Android v${BuildConfig.VERSION_NAME})\n")
            append(deepLink)
        }
        val sendIntent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_SUBJECT, title.ifBlank { "ASAKA ZIYO" })
            putExtra(Intent.EXTRA_TEXT, composed)
        }
        val chooser = Intent.createChooser(sendIntent, "ASAKA ZIYO orqali ulashish").apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        try {
            context.startActivity(chooser)
        } catch (_: Exception) {}
    }
}
