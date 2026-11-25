package uz.asakaziyo.app.data

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import org.json.JSONArray
import org.json.JSONObject

/**
 * ASAKA ZIYO v5.0.0 — Offline-First Local SQLite Database
 *
 * Strictly used as a resilient offline cache & pending sync queue — NEVER replaces the central
 * Firestore/Cloud Run server database.
 *
 * Tables:
 * - cached_prayers: Offline prayer schedule per cityId (preserves exact localDate so stale data is flagged honestly)
 * - cached_mushaf: Offline Uthmani Arabic + Uzbek translation per Surah (1..114)
 * - bookmarks: User saved Ayah bookmarks & personal notes
 * - hifz_items: Offline-capable Hifz & Muroja'a spaced repetition progress
 * - sync_queue: Pending mutations queued offline and replayed automatically by AsakaOfflineSyncWorker
 */
class AsakaLocalDatabase(context: Context) : SQLiteOpenHelper(context, DB_NAME, null, DB_VERSION) {

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS cached_prayers (
                city_id TEXT PRIMARY KEY,
                payload_json TEXT NOT NULL,
                local_date TEXT NOT NULL,
                updated_at INTEGER NOT NULL
            )
            """.trimIndent()
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS cached_mushaf (
                surah_number INTEGER PRIMARY KEY,
                ayahs_json TEXT NOT NULL,
                updated_at INTEGER NOT NULL
            )
            """.trimIndent()
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS bookmarks (
                id TEXT PRIMARY KEY,
                surah_number INTEGER NOT NULL,
                surah_name TEXT NOT NULL,
                ayah_number INTEGER NOT NULL,
                note TEXT NOT NULL DEFAULT '',
                created_at INTEGER NOT NULL
            )
            """.trimIndent()
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS hifz_items (
                id TEXT PRIMARY KEY,
                surah_number INTEGER NOT NULL,
                surah_name TEXT NOT NULL,
                ayah_from INTEGER NOT NULL,
                ayah_to INTEGER NOT NULL,
                mastery_score INTEGER NOT NULL,
                next_review_iso TEXT NOT NULL,
                repetitions INTEGER NOT NULL
            )
            """.trimIndent()
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS sync_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action_type TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                attempts INTEGER NOT NULL DEFAULT 0
            )
            """.trimIndent()
        )
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        onCreate(db)
    }

    // --- Prayer Cache (Honest Date Labelling) ---
    fun savePrayerSnapshot(snapshot: PrayerScheduleSnapshot) {
        val obj = JSONObject().apply {
            put("cityId", snapshot.cityId)
            put("cityName", snapshot.cityName)
            put("regionName", snapshot.regionName)
            put("sourceMode", snapshot.sourceMode)
            put("localDate", snapshot.localDate)
            put("hijriDate", snapshot.hijriDate)
            put("fajr", snapshot.fajr)
            put("sunrise", snapshot.sunrise)
            put("dhuhr", snapshot.dhuhr)
            put("asr", snapshot.asr)
            put("maghrib", snapshot.maghrib)
            put("isha", snapshot.isha)
            put("tahajjud", snapshot.tahajjud)
            put("nextPrayerName", snapshot.nextPrayerName)
            put("nextPrayerTime", snapshot.nextPrayerTime)
            put("fetchedAt", snapshot.fetchedAt)
        }
        val cv = ContentValues().apply {
            put("city_id", snapshot.cityId)
            put("payload_json", obj.toString())
            put("local_date", snapshot.localDate)
            put("updated_at", System.currentTimeMillis())
        }
        writableDatabase.insertWithOnConflict("cached_prayers", null, cv, SQLiteDatabase.CONFLICT_REPLACE)
    }

    fun getCachedPrayerSnapshot(cityId: String, todayIsoDate: String): PrayerScheduleSnapshot? {
        readableDatabase.rawQuery(
            "SELECT payload_json, local_date FROM cached_prayers WHERE city_id = ?",
            arrayOf(cityId)
        ).use { cursor ->
            if (!cursor.moveToFirst()) return null
            return try {
                val obj = JSONObject(cursor.getString(0))
                val savedDate = cursor.getString(1)
                PrayerScheduleSnapshot(
                    cityId = obj.optString("cityId", cityId),
                    cityName = obj.optString("cityName", "Asaka"),
                    regionName = obj.optString("regionName", ""),
                    sourceMode = obj.optString("sourceMode", "MANUAL_ADMIN"),
                    localDate = savedDate,
                    hijriDate = obj.optString("hijriDate", ""),
                    fajr = obj.optString("fajr", "--:--"),
                    sunrise = obj.optString("sunrise", "--:--"),
                    dhuhr = obj.optString("dhuhr", "--:--"),
                    asr = obj.optString("asr", "--:--"),
                    maghrib = obj.optString("maghrib", "--:--"),
                    isha = obj.optString("isha", "--:--"),
                    tahajjud = obj.optString("tahajjud", ""),
                    nextPrayerName = obj.optString("nextPrayerName", ""),
                    nextPrayerTime = obj.optString("nextPrayerTime", ""),
                    isStaleCache = savedDate.isNotBlank() && savedDate != todayIsoDate,
                    fetchedAt = obj.optString("fetchedAt", "")
                )
            } catch (_: Exception) {
                null
            }
        }
    }

    // --- Offline Mushaf Cache ---
    fun saveMushafSurah(surahNumber: Int, ayahs: List<MushafAyah>) {
        val arr = JSONArray()
        ayahs.forEach { a ->
            arr.put(JSONObject().apply {
                put("n", a.numberInSurah)
                put("ar", a.arabicText)
                put("uz", a.translationUz)
            })
        }
        val cv = ContentValues().apply {
            put("surah_number", surahNumber)
            put("ayahs_json", arr.toString())
            put("updated_at", System.currentTimeMillis())
        }
        writableDatabase.insertWithOnConflict("cached_mushaf", null, cv, SQLiteDatabase.CONFLICT_REPLACE)
    }

    fun getCachedMushafSurah(surahNumber: Int): List<MushafAyah>? {
        readableDatabase.rawQuery(
            "SELECT ayahs_json FROM cached_mushaf WHERE surah_number = ?",
            arrayOf(surahNumber.toString())
        ).use { cursor ->
            if (!cursor.moveToFirst()) return null
            return try {
                val arr = JSONArray(cursor.getString(0))
                val out = ArrayList<MushafAyah>(arr.length())
                for (i in 0 until arr.length()) {
                    val o = arr.getJSONObject(i)
                    out.add(
                        MushafAyah(
                            numberInSurah = o.optInt("n", i + 1),
                            arabicText = o.optString("ar", ""),
                            translationUz = o.optString("uz", "")
                        )
                    )
                }
                out
            } catch (_: Exception) {
                null
            }
        }
    }

    fun getCachedMushafSurahCount(): Int {
        readableDatabase.rawQuery("SELECT COUNT(*) FROM cached_mushaf", null).use { c ->
            return if (c.moveToFirst()) c.getInt(0) else 0
        }
    }

    // --- Bookmarks & Notes ---
    fun saveBookmark(surahNumber: Int, surahName: String, ayahNumber: Int, note: String = "") {
        val id = "${surahNumber}:${ayahNumber}"
        val cv = ContentValues().apply {
            put("id", id)
            put("surah_number", surahNumber)
            put("surah_name", surahName)
            put("ayah_number", ayahNumber)
            put("note", note.trim().take(400))
            put("created_at", System.currentTimeMillis())
        }
        writableDatabase.insertWithOnConflict("bookmarks", null, cv, SQLiteDatabase.CONFLICT_REPLACE)
    }

    fun listBookmarks(): List<Triple<Int, Int, String>> {
        val out = mutableListOf<Triple<Int, Int, String>>()
        readableDatabase.rawQuery(
            "SELECT surah_number, ayah_number, surah_name FROM bookmarks ORDER BY created_at DESC LIMIT 60",
            null
        ).use { c ->
            while (c.moveToNext()) {
                out.add(Triple(c.getInt(0), c.getInt(1), c.getString(2)))
            }
        }
        return out
    }

    // --- Hifz & Muroja'a Items ---
    fun upsertHifzItem(item: HifzItem) {
        val id = "${item.surahNumber}_${item.ayahFrom}_${item.ayahTo}"
        val cv = ContentValues().apply {
            put("id", id)
            put("surah_number", item.surahNumber)
            put("surah_name", item.surahNameUz)
            put("ayah_from", item.ayahFrom)
            put("ayah_to", item.ayahTo)
            put("mastery_score", item.masteryScore.coerceIn(0, 100))
            put("next_review_iso", item.nextReviewIso)
            put("repetitions", item.repetitions)
        }
        writableDatabase.insertWithOnConflict("hifz_items", null, cv, SQLiteDatabase.CONFLICT_REPLACE)
    }

    fun listHifzItems(): List<HifzItem> {
        val out = mutableListOf<HifzItem>()
        readableDatabase.rawQuery(
            "SELECT surah_number, surah_name, ayah_from, ayah_to, mastery_score, next_review_iso, repetitions FROM hifz_items ORDER BY surah_number ASC",
            null
        ).use { c ->
            while (c.moveToNext()) {
                out.add(
                    HifzItem(
                        surahNumber = c.getInt(0),
                        surahNameUz = c.getString(1),
                        ayahFrom = c.getInt(2),
                        ayahTo = c.getInt(3),
                        masteryScore = c.getInt(4),
                        nextReviewIso = c.getString(5),
                        repetitions = c.getInt(6)
                    )
                )
            }
        }
        return out
    }

    // --- Offline Sync Queue ---
    fun enqueueSyncMutation(actionType: String, payload: JSONObject) {
        val cv = ContentValues().apply {
            put("action_type", actionType)
            put("payload_json", payload.toString())
            put("created_at", System.currentTimeMillis())
            put("attempts", 0)
        }
        writableDatabase.insert("sync_queue", null, cv)
    }

    fun listPendingSyncItems(): List<Triple<Long, String, String>> {
        val out = mutableListOf<Triple<Long, String, String>>()
        readableDatabase.rawQuery(
            "SELECT id, action_type, payload_json FROM sync_queue ORDER BY id ASC LIMIT 50",
            null
        ).use { c ->
            while (c.moveToNext()) {
                out.add(Triple(c.getLong(0), c.getString(1), c.getString(2)))
            }
        }
        return out
    }

    fun getPendingSyncCount(): Int {
        readableDatabase.rawQuery("SELECT COUNT(*) FROM sync_queue", null).use { c ->
            return if (c.moveToFirst()) c.getInt(0) else 0
        }
    }

    fun removeSyncItem(id: Long) {
        writableDatabase.delete("sync_queue", "id = ?", arrayOf(id.toString()))
    }

    companion object {
        private const val DB_NAME = "asaka_ziyo_offline_v5.db"
        private const val DB_VERSION = 1
    }
}
