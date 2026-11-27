package uz.asakaziyo.app

import android.content.Context
import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import org.json.JSONArray
import org.json.JSONObject
import uz.asakaziyo.app.data.DownloadTaskState
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * ASAKA ZIYO v5.0.0 — Native Android Offline Download Manager
 *
 * Features:
 * - Real-time progress % & byte tracking exposed via StateFlow<Map<String, DownloadTaskState>>
 * - Queue, Pause/Cancel, Retry, Atomic .part rename, SHA-256 integrity verification
 * - Low storage warning (< 50 MB) before starting downloads
 * - Clean storage usage summary & per-file / clear-all deletion
 */
object AsakaOfflineDownloadManager {
    private const val TAG = "ASAKA_OFFLINE_DL"
    private const val DIR_NAME = "quran_offline"
    private const val MIN_REQUIRED_FREE_BYTES = 50L * 1024L * 1024L // 50 MB
    private val executor = Executors.newFixedThreadPool(2)
    private val cancelFlags = ConcurrentHashMap<String, AtomicBoolean>()

    private val _downloadTasks = MutableStateFlow<Map<String, DownloadTaskState>>(emptyMap())
    val downloadTasks: StateFlow<Map<String, DownloadTaskState>> = _downloadTasks.asStateFlow()

    private fun getOfflineDir(context: Context): File {
        val dir = File(context.filesDir, DIR_NAME)
        if (!dir.exists()) dir.mkdirs()
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

    fun listDownloadedTracks(context: Context): List<Pair<String, Long>> {
        val files = getOfflineDir(context).listFiles()
            ?.filter { it.isFile && !it.name.endsWith(".part") && it.length() > 1024L }
            ?: return emptyList()
        return files.map { it.name.removeSuffix(".audio") to it.length() }
            .sortedBy { it.first }
    }

    fun getUsableSpaceBytes(context: Context): Long = getOfflineDir(context).usableSpace

    fun isLowStorage(context: Context): Boolean = getUsableSpaceBytes(context) < MIN_REQUIRED_FREE_BYTES

    fun deleteTrack(context: Context, trackKey: String): Boolean {
        cancelDownload(trackKey)
        val file = getLocalFile(context, trackKey)
        val ok = if (file.exists()) file.delete() else false
        _downloadTasks.update { it - trackKey }
        return ok
    }

    fun clearAll(context: Context): Int {
        cancelFlags.values.forEach { it.set(true) }
        val files = getOfflineDir(context).listFiles() ?: return 0
        var removed = 0
        for (f in files) {
            if (f.isFile && f.delete()) removed++
        }
        _downloadTasks.value = emptyMap()
        return removed
    }

    fun cancelDownload(trackKey: String) {
        cancelFlags[trackKey]?.set(true)
        _downloadTasks.update { map ->
            val current = map[trackKey] ?: return@update map
            map + (trackKey to current.copy(status = "PAUSED"))
        }
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
            put("lowStorage", dir.usableSpace < MIN_REQUIRED_FREE_BYTES)
            put("trackKeys", keys)
        }.toString()
    }

    fun downloadTrackAsync(
        context: Context,
        trackKey: String,
        urlString: String,
        expectedSha256: String?,
        title: String = trackKey,
        onComplete: (ok: Boolean, localPath: String?, error: String?) -> Unit = { _, _, _ -> }
    ) {
        val trimmedUrl = urlString.trim()
        if (!trimmedUrl.startsWith("https://") && !trimmedUrl.startsWith("http://")) {
            onComplete(false, null, "Yaroqsiz audio havola.")
            return
        }
        if (isLowStorage(context)) {
            val err = "Qurilma xotirasida kamida 50 MB boʻsh joy talab qilinadi."
            _downloadTasks.update {
                it + (trackKey to DownloadTaskState(
                    trackKey = trackKey,
                    title = title,
                    url = trimmedUrl,
                    expectedSha256 = expectedSha256,
                    status = "FAILED",
                    error = err
                ))
            }
            onComplete(false, null, err)
            return
        }

        val flag = AtomicBoolean(false)
        cancelFlags[trackKey] = flag
        _downloadTasks.update {
            it + (trackKey to DownloadTaskState(
                trackKey = trackKey,
                title = title,
                url = trimmedUrl,
                expectedSha256 = expectedSha256,
                progressPercent = 0,
                status = "QUEUED"
            ))
        }

        executor.execute {
            val target = getLocalFile(context, trackKey)
            val temp = File(target.parentFile, "${target.name}.part")
            var conn: HttpURLConnection? = null
            try {
                if (flag.get()) {
                    onComplete(false, null, "Yuklash toʻxtatildi.")
                    return@execute
                }
                _downloadTasks.update { map ->
                    val prev = map[trackKey] ?: return@update map
                    map + (trackKey to prev.copy(status = "DOWNLOADING", error = null))
                }
                val url = URL(trimmedUrl)
                conn = (url.openConnection() as HttpURLConnection).apply {
                    connectTimeout = 15_000
                    readTimeout = 30_000
                    requestMethod = "GET"
                    instanceFollowRedirects = true
                }
                val code = conn.responseCode
                if (code !in 200..299) {
                    val err = "HTTP xatolik: $code"
                    _downloadTasks.update { map ->
                        val prev = map[trackKey] ?: return@update map
                        map + (trackKey to prev.copy(status = "FAILED", error = err))
                    }
                    onComplete(false, null, err)
                    return@execute
                }

                val totalBytes = conn.contentLengthLong
                var downloaded = 0L
                var lastReportedPct = -1
                val digest = MessageDigest.getInstance("SHA-256")
                conn.inputStream.use { input ->
                    FileOutputStream(temp).use { output ->
                        val buffer = ByteArray(16 * 1024)
                        while (true) {
                            if (flag.get()) {
                                temp.delete()
                                onComplete(false, null, "Yuklash pauza qilindi.")
                                return@execute
                            }
                            val read = input.read(buffer)
                            if (read <= 0) break
                            digest.update(buffer, 0, read)
                            output.write(buffer, 0, read)
                            downloaded += read
                            val pct = if (totalBytes > 0) {
                                ((downloaded * 100L) / totalBytes).toInt().coerceIn(0, 99)
                            } else 50
                            if (pct != lastReportedPct) {
                                lastReportedPct = pct
                                _downloadTasks.update { map ->
                                    val prev = map[trackKey] ?: return@update map
                                    map + (trackKey to prev.copy(
                                        progressPercent = pct,
                                        bytesDownloaded = downloaded,
                                        totalBytes = totalBytes,
                                        status = "DOWNLOADING"
                                    ))
                                }
                            }
                        }
                        output.flush()
                    }
                }

                val actualSha = digest.digest().joinToString("") { "%02x".format(it) }
                if (!expectedSha256.isNullOrBlank() && !actualSha.equals(expectedSha256.trim(), ignoreCase = true)) {
                    temp.delete()
                    val err = "SHA-256 fayl yaxlitligi tasdiqlanmadi."
                    _downloadTasks.update { map ->
                        val prev = map[trackKey] ?: return@update map
                        map + (trackKey to prev.copy(status = "FAILED", error = err))
                    }
                    onComplete(false, null, err)
                    return@execute
                }

                if (target.exists()) target.delete()
                if (!temp.renameTo(target)) {
                    temp.copyTo(target, overwrite = true)
                    temp.delete()
                }
                _downloadTasks.update { map ->
                    val prev = map[trackKey] ?: return@update map
                    map + (trackKey to prev.copy(
                        progressPercent = 100,
                        bytesDownloaded = target.length(),
                        totalBytes = target.length(),
                        status = "COMPLETED",
                        error = null
                    ))
                }
                onComplete(true, target.absolutePath, null)
            } catch (e: Exception) {
                Log.w(TAG, "Offline audio download failed: ${e.message}")
                try {
                    if (temp.exists()) temp.delete()
                } catch (_: Exception) {}
                val err = e.message ?: "Yuklab olishda xatolik yuz berdi."
                _downloadTasks.update { map ->
                    val prev = map[trackKey] ?: return@update map
                    map + (trackKey to prev.copy(status = "FAILED", error = err))
                }
                onComplete(false, null, err)
            } finally {
                try {
                    conn?.disconnect()
                } catch (_: Exception) {}
            }
        }
    }
}
