package uz.asakaziyo.app

import android.content.Context
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.concurrent.Executors

/**
 * ASAKA ZIYO — Native Android Offline Qur'on Audio Download Manager
 *
 * Stores downloaded Surah recitations safely inside app-private storage (`filesDir/quran_offline/`),
 * verifies optional SHA-256 checksums, avoids partial/corrupt files via atomic `.part` rename,
 * and exposes clean storage quota inspection and deletion for the WebView bridge.
 */
object AsakaOfflineDownloadManager {
    private const val TAG = "ASAKA_OFFLINE_DL"
    private const val DIR_NAME = "quran_offline"
    private val executor = Executors.newFixedThreadPool(2)

    private fun getOfflineDir(context: Context): File {
        val dir = File(context.filesDir, DIR_NAME)
        if (!dir.exists()) {
            dir.mkdirs()
        }
        return dir
    }

    private fun sanitizeTrackKey(rawKey: String): String {
        val cleaned = rawKey.trim().replace(Regex("[^a-zA-Z0-9._-]"), "_")
        return if (cleaned.isBlank()) "track_unknown" else cleaned.take(96)
    }

    fun getLocalFile(context: Context, trackKey: String): File {
        return File(getOfflineDir(context), "${sanitizeTrackKey(trackKey)}.audio")
    }

    fun isDownloaded(context: Context, trackKey: String): Boolean {
        val file = getLocalFile(context, trackKey)
        return file.exists() && file.length() > 1024L
    }

    fun deleteTrack(context: Context, trackKey: String): Boolean {
        val file = getLocalFile(context, trackKey)
        return if (file.exists()) file.delete() else false
    }

    fun clearAll(context: Context): Int {
        val files = getOfflineDir(context).listFiles() ?: return 0
        var removed = 0
        for (f in files) {
            if (f.isFile && f.delete()) removed++
        }
        return removed
    }

    fun getStorageStatsJson(context: Context): String {
        val dir = getOfflineDir(context)
        val files = dir.listFiles()?.filter { it.isFile && !it.name.endsWith(".part") } ?: emptyList()
        var totalBytes = 0L
        val keys = JSONArray()
        for (f in files) {
            totalBytes += f.length()
            keys.put(f.name.removeSuffix(".audio"))
        }
        return JSONObject().apply {
            put("count", files.size)
            put("totalBytes", totalBytes)
            put("totalMb", Math.round((totalBytes / (1024.0 * 1024.0)) * 100.0) / 100.0)
            put("freeSpaceBytes", dir.usableSpace)
            put("trackKeys", keys)
        }.toString()
    }

    fun downloadTrackAsync(
        context: Context,
        trackKey: String,
        urlString: String,
        expectedSha256: String?,
        onComplete: (ok: Boolean, localPath: String?, error: String?) -> Unit
    ) {
        val trimmedUrl = urlString.trim()
        if (!trimmedUrl.startsWith("https://") && !trimmedUrl.startsWith("http://")) {
            onComplete(false, null, "Yaroqsiz audio havola.")
            return
        }

        executor.execute {
            val target = getLocalFile(context, trackKey)
            val temp = File(target.parentFile, "${target.name}.part")
            var conn: HttpURLConnection? = null
            try {
                val url = URL(trimmedUrl)
                conn = (url.openConnection() as HttpURLConnection).apply {
                    connectTimeout = 15_000
                    readTimeout = 30_000
                    requestMethod = "GET"
                    instanceFollowRedirects = true
                }
                val code = conn.responseCode
                if (code !in 200..299) {
                    onComplete(false, null, "HTTP xatolik: $code")
                    return@execute
                }

                val digest = MessageDigest.getInstance("SHA-256")
                conn.inputStream.use { input ->
                    FileOutputStream(temp).use { output ->
                        val buffer = ByteArray(16 * 1024)
                        while (true) {
                            val read = input.read(buffer)
                            if (read <= 0) break
                            digest.update(buffer, 0, read)
                            output.write(buffer, 0, read)
                        }
                        output.flush()
                    }
                }

                val actualSha = digest.digest().joinToString("") { "%02x".format(it) }
                if (!expectedSha256.isNullOrBlank() && !actualSha.equals(expectedSha256.trim(), ignoreCase = true)) {
                    temp.delete()
                    onComplete(false, null, "SHA-256 nazorat summasi mos kelmadi.")
                    return@execute
                }

                if (target.exists()) target.delete()
                if (!temp.renameTo(target)) {
                    temp.copyTo(target, overwrite = true)
                    temp.delete()
                }
                onComplete(true, target.absolutePath, null)
            } catch (e: Exception) {
                Log.w(TAG, "Offline audio download failed: ${e.message}")
                try {
                    if (temp.exists()) temp.delete()
                } catch (_: Exception) {}
                onComplete(false, null, e.message ?: "Yuklab olishda xatolik yuz berdi.")
            } finally {
                try {
                    conn?.disconnect()
                } catch (_: Exception) {}
            }
        }
    }
}
