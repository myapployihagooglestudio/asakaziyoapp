package uz.asakaziyo.app

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import androidx.core.content.ContextCompat

/**
 * Safely renders the adaptive launcher icon (mipmap-anydpi-v26 XML or legacy PNG)
 * into a crisp ARGB_8888 Bitmap for Android 8-16 NotificationCompat.setLargeIcon().
 * Avoids the Android API 26+ bug where BitmapFactory.decodeResource(res, R.mipmap.ic_launcher)
 * returns null for XML <adaptive-icon> resources.
 */
object AsakaIconUtils {
    fun renderLauncherBitmap(context: Context, sizePx: Int = 192): Bitmap? {
        return try {
            val drawable = ContextCompat.getDrawable(context, R.mipmap.ic_launcher) ?: return null
            if (drawable is BitmapDrawable && drawable.bitmap != null && !drawable.bitmap.isRecycled) {
                return drawable.bitmap
            }
            val width = if (drawable.intrinsicWidth > 0) drawable.intrinsicWidth else sizePx
            val height = if (drawable.intrinsicHeight > 0) drawable.intrinsicHeight else sizePx
            val bitmap = Bitmap.createBitmap(width.coerceAtLeast(sizePx), height.coerceAtLeast(sizePx), Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)
            drawable.setBounds(0, 0, canvas.width, canvas.height)
            drawable.draw(canvas)
            bitmap
        } catch (_: Exception) {
            null
        }
    }
}
