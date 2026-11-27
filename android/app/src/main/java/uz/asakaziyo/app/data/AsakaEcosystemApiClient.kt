package uz.asakaziyo.app.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import uz.asakaziyo.app.BuildConfig
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/**
 * ASAKA ZIYO v5.0.0 — Full Ecosystem & Role-Protected Admin REST Client
 *
 * Connects the native Android app directly to ALL central ASAKA ZIYO backend endpoints:
 * - Real-time Content Manifest (`GET /api/content/manifest` with ETag / HTTP 304)
 * - Central Database (`GET /api/database`, `/api/database/scholars`, `/api/database/mosques`, `/api/database/istiqomat`)
 * - Daily Qur'an Quiz (`/api/quran-quiz/by-date/:date`, `/api/quran-quiz/attempt`)
 * - Community Chat (`/api/messages`), Imam Q&A (`/api/database/inquiries`), Article Likes/Comments
 * - UGC Report (`/api/ugc/report`) & Account Deletion (`/api/user/delete-account`)
 * - Full Role-Protected Super Admin API (`POST /api/admin/auth` + `Authorization: Bearer <token>`):
 *   Asaka Prayer Editor, Article/News/Announcement/Hadith/Dhikr Publisher, Qari Manager,
 *   Home Blocks & Global Banner, Subscriptions/Orders/Promo/Feature Flags, Push & Telegram Broadcast, Backups.
 *
 * ZERO hardcoded credentials, ZERO API keys inside APK.
 */
object AsakaEcosystemApiClient {
    private val baseUrl: String = BuildConfig.BACKEND_BASE_URL.trimEnd('/')

    @Volatile
    var lastSyncLatencyMs: Long = 0L
        private set

    @Volatile
    var lastSyncError: String = ""
        private set

    private data class RawHttpResult(
        val code: Int,
        val json: JSONObject?,
        val etag: String = ""
    )

    private suspend fun requestRaw(
        method: String,
        pathOrUrl: String,
        body: JSONObject? = null,
        bearerToken: String? = null,
        ifNoneMatch: String? = null,
        timeoutMs: Int = 16_000,
        maxRetries: Int = 2
    ): RawHttpResult = withContext(Dispatchers.IO) {
        val fullUrl = if (pathOrUrl.startsWith("http")) pathOrUrl else "$baseUrl$pathOrUrl"
        val attempts = if (method == "GET") (maxRetries + 1) else 1
        var lastResult = RawHttpResult(0, null, "")
        for (attempt in 0 until attempts) {
            val startedAt = System.currentTimeMillis()
            var conn: HttpURLConnection? = null
            try {
                conn = (URL(fullUrl).openConnection() as HttpURLConnection).apply {
                    requestMethod = method
                    connectTimeout = timeoutMs
                    readTimeout = timeoutMs
                    setRequestProperty("Accept", "application/json")
                    setRequestProperty("User-Agent", "AsakaZiyo-Android/${BuildConfig.VERSION_NAME}")
                    if (!bearerToken.isNullOrBlank()) {
                        setRequestProperty("Authorization", "Bearer $bearerToken")
                    }
                    if (!ifNoneMatch.isNullOrBlank()) {
                        setRequestProperty("If-None-Match", ifNoneMatch)
                    }
                    if (body != null) {
                        doOutput = true
                        setRequestProperty("Content-Type", "application/json; charset=utf-8")
                    }
                }
                if (body != null) {
                    OutputStreamWriter(conn.outputStream, Charsets.UTF_8).use { w ->
                        w.write(body.toString())
                        w.flush()
                    }
                }
                val code = conn.responseCode
                lastSyncLatencyMs = (System.currentTimeMillis() - startedAt).coerceAtLeast(1L)
                val etag = conn.getHeaderField("ETag") ?: ""
                if (code == 304) {
                    lastSyncError = ""
                    return@withContext RawHttpResult(304, null, etag)
                }
                val stream = if (code in 200..299) conn.inputStream else conn.errorStream
                val text = stream?.let { s ->
                    BufferedReader(InputStreamReader(s, Charsets.UTF_8)).use { it.readText() }
                }.orEmpty().trim()
                val parsed = when {
                    text.startsWith("{") -> JSONObject(text)
                    text.startsWith("[") -> JSONObject().put("items", JSONArray(text))
                    else -> null
                }
                lastResult = RawHttpResult(code, parsed, etag)
                if (code in 200..299) {
                    lastSyncError = ""
                    return@withContext lastResult
                }
                if (code == 429 || code in 400..499) {
                    lastSyncError = if (code == 429) "HTTP 429: Soʻrovlar limiti" else "HTTP $code"
                    return@withContext lastResult
                }
                lastSyncError = "HTTP $code"
            } catch (e: Exception) {
                lastSyncLatencyMs = (System.currentTimeMillis() - startedAt).coerceAtLeast(1L)
                lastSyncError = e.message ?: "Tarmoq xatoligi"
                lastResult = RawHttpResult(0, null, "")
            } finally {
                try { conn?.disconnect() } catch (_: Exception) {}
            }
            if (attempt < attempts - 1) {
                try {
                    Thread.sleep(350L * (1 shl attempt))
                } catch (_: InterruptedException) {
                    break
                }
            }
        }
        lastResult
    }

    // --- 1. Real-Time Admin Change Auto-Sync Manifest (ETag / HTTP 304) ---
    suspend fun fetchContentManifest(currentEtag: String = ""): ContentManifestSnapshot? {
        val res = requestRaw("GET", "/api/content/manifest", ifNoneMatch = currentEtag.ifBlank { null })
        if (res.code == 304) {
            return ContentManifestSnapshot(etag = currentEtag, notModified = true)
        }
        val json = res.json ?: return null
        if (res.code != 200) return null
        val countsMap = mutableMapOf<String, Int>()
        val cats = json.optJSONObject("categories")
        if (cats != null) {
            val keys = cats.keys()
            while (keys.hasNext()) {
                val k = keys.next()
                val obj = cats.optJSONObject(k)
                countsMap[k] = obj?.optInt("count", 0) ?: 0
            }
        }
        val hb = json.optJSONObject("homeConfig")
        val orderArr = hb?.optJSONArray("blockOrder")
        val blockOrder = mutableListOf<String>()
        if (orderArr != null) {
            for (i in 0 until orderArr.length()) {
                val item = orderArr.optString(i, "")
                if (item.isNotBlank()) blockOrder.add(item)
            }
        }
        val homeCfg = AdminHomeConfig(
            bannerTitleUz = hb?.optString("bannerTitleUz", "") ?: "",
            bannerBodyUz = hb?.optString("bannerBodyUz", "") ?: "",
            bannerVisible = hb?.optBoolean("bannerVisible", false) ?: false,
            bannerCtaModule = hb?.optString("bannerCtaModule", "articles") ?: "articles",
            pinnedAnnouncementId = hb?.optString("pinnedAnnouncementId", "") ?: "",
            blockOrder = blockOrder.ifEmpty { listOf("prayer", "quran", "audio", "hifz", "wisdom", "ai") },
            updatedAt = hb?.optString("updatedAt", "") ?: ""
        )
        return ContentManifestSnapshot(
            contentVersion = json.optString("contentVersion", ""),
            etag = res.etag.ifBlank { json.optString("etag", "") },
            generatedAt = json.optString("generatedAt", ""),
            notModified = false,
            counts = countsMap,
            homeConfig = homeCfg
        )
    }

    // --- 2. Central Database Snapshot (All Public Web App Modules) ---
    suspend fun fetchCentralDatabaseRawJson(): String? {
        val res = requestRaw("GET", "/api/database", timeoutMs = 20_000)
        if (res.code != 200 || res.json == null) return null
        return res.json.toString()
    }

    fun parseCentralDatabaseJson(rawJson: String): CentralDatabaseSnapshot {
        return try {
            val envelope = JSONObject(rawJson)
            val root = envelope.optJSONObject("data") ?: envelope
            val articles = parseArticles(root.optJSONArray("articles"))
            val news = parseNews(root.optJSONArray("news"))
            val announcements = parseAnnouncements(root.optJSONArray("announcements"))
            val notifications = parseNotifications(root.optJSONArray("notifications"))
            val mediaPosts = parseMediaPosts(root.optJSONArray("mediaPosts"))
            val adhan = parseAdhanLibrary(root.optJSONArray("adhanLibrary"))
            val books = parseDigitalBooks(root.optJSONArray("digitalBooks"))
            val lessons = parseAcademyLessons(root.optJSONArray("academyLessons"))
            val events = parseMosqueEvents(root.optJSONArray("mosqueEvents"))
            val charity = parseCharityCampaigns(root.optJSONArray("charityCampaigns"))
            val quizzes = parseQuizQuestions(root.optJSONArray("quizQuestions") ?: root.optJSONArray("dailyQuizzes"))
            val messages = parseMessages(root.optJSONArray("messages"))
            val inquiries = parseInquiries(root.optJSONArray("imamQuestions"))
            val hadiths = parseDynamicHadiths(root.optJSONArray("hadiths"))
            val dhikrs = parseDynamicDhikrs(root.optJSONArray("dhikrs"))
            val dailyObj = root.optJSONObject("dailyContent")
            val dailyWisdom = if (dailyObj != null) {
                val ayah = dailyObj.optJSONObject("ayah")
                val hadith = dailyObj.optJSONObject("hadith")
                val dua = dailyObj.optJSONObject("dua")
                DailyWisdomItem(
                    dateIso = dailyObj.optString("dateIso", dailyObj.optString("date", "")),
                    ayahArabic = ayah?.optString("arabic", dailyObj.optString("ayahArabic", "")) ?: "",
                    ayahTranslation = ayah?.optString("translation", dailyObj.optString("ayahTranslation", "")) ?: "",
                    ayahRef = ayah?.optString("reference", dailyObj.optString("ayahRef", "")) ?: "",
                    hadithText = hadith?.optString("text", dailyObj.optString("hadithText", "")) ?: "",
                    hadithSource = hadith?.optString("source", dailyObj.optString("hadithSource", "")) ?: "",
                    duaArabic = dua?.optString("arabic", dailyObj.optString("duaArabic", "")) ?: "",
                    duaTranslation = dua?.optString("translation", dailyObj.optString("duaTranslation", "")) ?: ""
                )
            } else null

            CentralDatabaseSnapshot(
                articles = articles,
                news = news,
                announcements = announcements,
                notifications = notifications,
                mediaPosts = mediaPosts,
                adhanLibrary = adhan,
                digitalBooks = books,
                academyLessons = lessons,
                mosqueEvents = events,
                charityCampaigns = charity,
                quizQuestions = quizzes,
                communityMessages = messages,
                imamInquiries = inquiries,
                dynamicHadiths = hadiths,
                dynamicDhikrs = dhikrs,
                dailyWisdom = dailyWisdom,
                updatedAt = root.optString("updatedAt", "")
            )
        } catch (_: Exception) {
            CentralDatabaseSnapshot()
        }
    }

    private fun parseArticles(arr: JSONArray?): List<ArticleItem> {
        if (arr == null) return emptyList()
        val out = mutableListOf<ArticleItem>()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            val commentsArr = o.optJSONArray("comments")
            val comments = mutableListOf<ArticleCommentItem>()
            if (commentsArr != null) {
                for (c in 0 until commentsArr.length()) {
                    val co = commentsArr.optJSONObject(c) ?: continue
                    comments.add(
                        ArticleCommentItem(
                            id = co.optString("id", "$i-$c"),
                            author = co.optString("author", co.optString("userName", "Foydalanuvchi")),
                            text = co.optString("text", co.optString("content", "")),
                            date = co.optString("date", co.optString("createdAt", ""))
                        )
                    )
                }
            }
            out.add(
                ArticleItem(
                    id = o.optString("id", "art-$i"),
                    title = o.optString("title", ""),
                    category = o.optString("category", "Maqola"),
                    author = o.optString("author", "Asaka Ziyo"),
                    excerpt = o.optString("excerpt", o.optString("summary", "")),
                    content = o.optString("content", o.optString("body", "")),
                    imageUrl = o.optString("imageUrl", o.optString("image", "")),
                    date = o.optString("date", o.optString("createdAt", "")),
                    likesCount = o.optInt("likes", o.optInt("likesCount", 0)),
                    viewsCount = o.optInt("views", o.optInt("viewsCount", 0)),
                    comments = comments
                )
            )
        }
        return out
    }

    private fun parseNews(arr: JSONArray?): List<NewsItem> {
        if (arr == null) return emptyList()
        val out = mutableListOf<NewsItem>()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            out.add(
                NewsItem(
                    id = o.optString("id", "news-$i"),
                    title = o.optString("title", ""),
                    summary = o.optString("summary", o.optString("excerpt", "")),
                    content = o.optString("content", o.optString("body", "")),
                    category = o.optString("category", "Yangilik"),
                    imageUrl = o.optString("imageUrl", o.optString("image", "")),
                    date = o.optString("date", o.optString("createdAt", "")),
                    isUrgent = o.optBoolean("isUrgent", false)
                )
            )
        }
        return out
    }

    private fun parseAnnouncements(arr: JSONArray?): List<AnnouncementItem> {
        if (arr == null) return emptyList()
        val out = mutableListOf<AnnouncementItem>()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            out.add(
                AnnouncementItem(
                    id = o.optString("id", "ann-$i"),
                    title = o.optString("title", "Eʼlon"),
                    message = o.optString("message", o.optString("content", o.optString("text", ""))),
                    type = o.optString("type", "info"),
                    date = o.optString("date", o.optString("createdAt", "")),
                    isActive = o.optBoolean("isActive", true)
                )
            )
        }
        return out
    }

    private fun parseNotifications(arr: JSONArray?): List<NotificationItem> {
        if (arr == null) return emptyList()
        val out = mutableListOf<NotificationItem>()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            out.add(
                NotificationItem(
                    id = o.optString("id", "notif-$i"),
                    title = o.optString("title", "Bildirishnoma"),
                    body = o.optString("body", o.optString("message", o.optString("content", ""))),
                    category = o.optString("category", o.optString("type", "general")),
                    createdAt = o.optString("createdAt", o.optString("date", ""))
                )
            )
        }
        return out
    }

    private fun parseMediaPosts(arr: JSONArray?): List<MediaPostItem> {
        if (arr == null) return emptyList()
        val out = mutableListOf<MediaPostItem>()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            out.add(
                MediaPostItem(
                    id = o.optString("id", "med-$i"),
                    title = o.optString("title", ""),
                    description = o.optString("description", ""),
                    type = o.optString("type", "audio"),
                    url = o.optString("url", o.optString("mediaUrl", o.optString("audioUrl", ""))),
                    thumbnailUrl = o.optString("thumbnailUrl", o.optString("thumbnail", "")),
                    author = o.optString("author", "Asaka Ziyo"),
                    duration = o.optString("duration", ""),
                    category = o.optString("category", "Maʼruza")
                )
            )
        }
        return out
    }

    private fun parseAdhanLibrary(arr: JSONArray?): List<AdhanTrackItem> {
        if (arr == null) return emptyList()
        val out = mutableListOf<AdhanTrackItem>()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            val url = o.optString("url", o.optString("audioUrl", ""))
            if (url.isNotBlank()) {
                out.add(
                    AdhanTrackItem(
                        id = o.optString("id", "adhan-$i"),
                        title = o.optString("title", o.optString("name", "Azon")),
                        muezzin = o.optString("muezzin", o.optString("reciter", "")),
                        city = o.optString("city", o.optString("origin", "")),
                        url = url,
                        duration = o.optString("duration", "")
                    )
                )
            }
        }
        return out
    }

    private fun parseDigitalBooks(arr: JSONArray?): List<DigitalBookItem> {
        if (arr == null) return emptyList()
        val out = mutableListOf<DigitalBookItem>()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            out.add(
                DigitalBookItem(
                    id = o.optString("id", "book-$i"),
                    title = o.optString("title", ""),
                    author = o.optString("author", ""),
                    category = o.optString("category", "Kitob"),
                    description = o.optString("description", ""),
                    pages = o.optInt("pages", 0),
                    url = o.optString("url", o.optString("fileUrl", o.optString("pdfUrl", ""))),
                    contentPreview = o.optString("content", o.optString("excerpt", ""))
                )
            )
        }
        return out
    }

    private fun parseAcademyLessons(arr: JSONArray?): List<AcademyLessonItem> {
        if (arr == null) return emptyList()
        val out = mutableListOf<AcademyLessonItem>()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            out.add(
                AcademyLessonItem(
                    id = o.optString("id", "les-$i"),
                    title = o.optString("title", ""),
                    category = o.optString("category", "Fiqh"),
                    instructor = o.optString("instructor", o.optString("author", "Ustoz")),
                    duration = o.optString("duration", "15 daqiqa"),
                    summary = o.optString("summary", o.optString("description", "")),
                    content = o.optString("content", o.optString("body", "")),
                    level = o.optString("level", "Boshlangʻich")
                )
            )
        }
        return out
    }

    private fun parseMosqueEvents(arr: JSONArray?): List<MosqueEventItem> {
        if (arr == null) return emptyList()
        val out = mutableListOf<MosqueEventItem>()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            out.add(
                MosqueEventItem(
                    id = o.optString("id", "evt-$i"),
                    title = o.optString("title", ""),
                    mosqueName = o.optString("mosqueName", o.optString("mosque", "Asaka Markaziy Masjidi")),
                    date = o.optString("date", ""),
                    time = o.optString("time", ""),
                    description = o.optString("description", ""),
                    location = o.optString("location", "")
                )
            )
        }
        return out
    }

    private fun parseCharityCampaigns(arr: JSONArray?): List<CharityCampaignItem> {
        if (arr == null) return emptyList()
        val out = mutableListOf<CharityCampaignItem>()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            out.add(
                CharityCampaignItem(
                    id = o.optString("id", "ch-$i"),
                    title = o.optString("title", ""),
                    description = o.optString("description", ""),
                    targetAmount = o.optLong("targetAmount", o.optLong("goal", 0L)),
                    raisedAmount = o.optLong("raisedAmount", o.optLong("raised", 0L)),
                    organizer = o.optString("organizer", "Asaka Ziyo"),
                    cardInfo = o.optString("cardInfo", o.optString("cardNumber", ""))
                )
            )
        }
        return out
    }

    private fun parseQuizQuestions(arr: JSONArray?): List<QuizQuestionItem> {
        if (arr == null) return emptyList()
        val out = mutableListOf<QuizQuestionItem>()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            val optsArr = o.optJSONArray("options") ?: continue
            val opts = mutableListOf<String>()
            for (k in 0 until optsArr.length()) opts.add(optsArr.optString(k, ""))
            if (opts.size >= 2) {
                out.add(
                    QuizQuestionItem(
                        id = o.optString("id", "q-$i"),
                        question = o.optString("question", ""),
                        options = opts,
                        correctIndex = o.optInt("correctIndex", o.optInt("correctAnswer", 0)),
                        explanation = o.optString("explanation", ""),
                        category = o.optString("category", "Islomiy bilim")
                    )
                )
            }
        }
        return out
    }

    private fun parseMessages(arr: JSONArray?): List<CommunityMessageItem> {
        if (arr == null) return emptyList()
        val out = mutableListOf<CommunityMessageItem>()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            val txt = o.optString("text", o.optString("content", o.optString("message", "")))
            if (txt.isNotBlank()) {
                out.add(
                    CommunityMessageItem(
                        id = o.optString("id", "msg-$i"),
                        authorName = o.optString("authorName", o.optString("sender", o.optString("userName", "Foydalanuvchi"))),
                        text = txt,
                        createdAt = o.optString("createdAt", o.optString("timestamp", "")),
                        role = o.optString("role", "member")
                    )
                )
            }
        }
        return out
    }

    private fun parseInquiries(arr: JSONArray?): List<ImamInquiryItem> {
        if (arr == null) return emptyList()
        val out = mutableListOf<ImamInquiryItem>()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            val q = o.optString("question", o.optString("text", ""))
            if (q.isNotBlank()) {
                out.add(
                    ImamInquiryItem(
                        id = o.optString("id", "inq-$i"),
                        authorName = o.optString("authorName", o.optString("name", "Savol beruvchi")),
                        question = q,
                        answer = o.optString("answer", ""),
                        status = o.optString("status", if (o.optString("answer", "").isNotBlank()) "answered" else "pending"),
                        createdAt = o.optString("createdAt", o.optString("date", ""))
                    )
                )
            }
        }
        return out
    }

    private fun parseDynamicHadiths(arr: JSONArray?): List<DynamicHadithItem> {
        if (arr == null) return emptyList()
        val out = mutableListOf<DynamicHadithItem>()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            val text = o.optString("text", o.optString("translation", o.optString("content", "")))
            if (text.isNotBlank()) {
                out.add(
                    DynamicHadithItem(
                        id = o.optString("id", "had-$i"),
                        title = o.optString("title", o.optString("topic", "Hadisi sharif")),
                        text = text,
                        arabic = o.optString("arabic", ""),
                        source = o.optString("source", o.optString("narrator", "")),
                        category = o.optString("category", "Umumiy")
                    )
                )
            }
        }
        return out
    }

    private fun parseDynamicDhikrs(arr: JSONArray?): List<DynamicDhikrItem> {
        if (arr == null) return emptyList()
        val out = mutableListOf<DynamicDhikrItem>()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            val title = o.optString("title", o.optString("name", ""))
            if (title.isNotBlank()) {
                out.add(
                    DynamicDhikrItem(
                        id = o.optString("id", "dhk-$i"),
                        title = title,
                        arabic = o.optString("arabic", ""),
                        transliteration = o.optString("transliteration", o.optString("reading", "")),
                        translation = o.optString("translation", o.optString("meaning", "")),
                        count = o.optInt("count", 33),
                        category = o.optString("category", "Kunlik")
                    )
                )
            }
        }
        return out
    }

    // --- 3. Scholars, Mosques, Istiqomat & Daily Qur'an Quiz ---
    suspend fun fetchScholars(): List<ScholarItem> {
        val res = requestRaw("GET", "/api/database/scholars")
        if (res.code != 200 || res.json == null) return emptyList()
        val arr = res.json.optJSONArray("scholars") ?: res.json.optJSONArray("items") ?: return emptyList()
        val out = mutableListOf<ScholarItem>()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            val worksArr = o.optJSONArray("famousWorks") ?: o.optJSONArray("works")
            val works = mutableListOf<String>()
            if (worksArr != null) {
                for (w in 0 until worksArr.length()) works.add(worksArr.optString(w, ""))
            }
            out.add(
                ScholarItem(
                    id = o.optString("id", "sch-$i"),
                    name = o.optString("name", ""),
                    title = o.optString("title", o.optString("epithet", "")),
                    era = o.optString("era", o.optString("years", "")),
                    bio = o.optString("bio", o.optString("biography", "")),
                    famousWorks = works
                )
            )
        }
        return out
    }

    suspend fun fetchMosques(): List<MosqueItem> {
        val res = requestRaw("GET", "/api/database/mosques")
        if (res.code != 200 || res.json == null) return emptyList()
        val arr = res.json.optJSONArray("mosques") ?: res.json.optJSONArray("items") ?: return emptyList()
        val out = mutableListOf<MosqueItem>()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            out.add(
                MosqueItem(
                    id = o.optString("id", "msq-$i"),
                    name = o.optString("name", ""),
                    address = o.optString("address", ""),
                    imam = o.optString("imam", ""),
                    city = o.optString("city", "Asaka"),
                    phone = o.optString("phone", ""),
                    latitude = o.optDouble("latitude", 40.6415),
                    longitude = o.optDouble("longitude", 72.2387)
                )
            )
        }
        return out
    }

    suspend fun fetchDailyQuranQuiz(dateIso: String): DailyQuranQuizItem? {
        fun parseQuizObj(root: JSONObject, resolvedDate: String): DailyQuranQuizItem? {
            val setObj = root.optJSONObject("quiz") ?: root.optJSONObject("day") ?: root
            val questionsArr = setObj.optJSONArray("questions")
            val q = if (questionsArr != null && questionsArr.length() > 0) {
                questionsArr.optJSONObject(0) ?: setObj
            } else setObj
            val optsArr = q.optJSONArray("options") ?: return null
            val opts = mutableListOf<String>()
            for (i in 0 until optsArr.length()) opts.add(optsArr.optString(i, ""))
            if (opts.size < 2) return null
            return DailyQuranQuizItem(
                dateIso = resolvedDate,
                id = q.optString("id", setObj.optString("id", resolvedDate)),
                question = q.optString("question", q.optString("promptUz", "")),
                surahRef = q.optString("surahRef", q.optString("reference", q.optString("surahName", ""))),
                options = opts,
                correctIndex = q.optInt("correctIndex", q.optInt("correctAnswer", 0)),
                explanation = q.optString("explanation", q.optString("explanationUz", ""))
            )
        }

        val encoded = URLEncoder.encode(dateIso, "UTF-8")
        val res = requestRaw("GET", "/api/quran-quiz/by-date/$encoded")
        if (res.code == 200 && res.json != null) {
            parseQuizObj(res.json, dateIso)?.let { return it }
        }
        // Fallback: load latest archived date when today's quiz isn't published yet
        val archiveRes = requestRaw("GET", "/api/quran-quiz/archive")
        if (archiveRes.code == 200 && archiveRes.json != null) {
            val items = archiveRes.json.optJSONArray("items") ?: archiveRes.json.optJSONArray("archive")
            val latest = items?.optJSONObject(0)
            val latestDate = latest?.optString("dateIso", latest.optString("date", ""))?.trim().orEmpty()
            if (latestDate.isNotBlank()) {
                val encLatest = URLEncoder.encode(latestDate, "UTF-8")
                val latestRes = requestRaw("GET", "/api/quran-quiz/by-date/$encLatest")
                if (latestRes.code == 200 && latestRes.json != null) {
                    return parseQuizObj(latestRes.json, latestDate)
                }
            }
        }
        return null
    }

    suspend fun submitQuranQuizAttempt(userId: String, quizId: String, selectedIndex: Int, isCorrect: Boolean): Boolean {
        val body = JSONObject().apply {
            put("userId", userId)
            put("quizId", quizId)
            put("selectedIndex", selectedIndex)
            put("isCorrect", isCorrect)
            put("platform", "android")
        }
        val res = requestRaw("POST", "/api/quran-quiz/attempt", body)
        return res.code in 200..299
    }

    // --- 4. Interactive User Actions (Chat, Imam Q&A, UGC Report, Account Deletion, Istiqomat) ---
    suspend fun postCommunityMessage(userId: String, authorName: String, text: String): Pair<Boolean, String> {
        val body = JSONObject().apply {
            put("userId", userId)
            put("authorName", authorName)
            put("sender", authorName)
            put("text", text)
            put("content", text)
            put("platform", "android")
        }
        val res = requestRaw("POST", "/api/messages", body)
        return if (res.code in 200..299) true to "Xabaringiz yuborildi." else false to (res.json?.optString("error", "Xabar yuborilmadi") ?: "Tarmoq xatoligi")
    }

    suspend fun submitImamInquiry(authorName: String, question: String): Pair<Boolean, String> {
        val body = JSONObject().apply {
            put("authorName", authorName)
            put("name", authorName)
            put("question", question)
            put("platform", "android")
        }
        val res = requestRaw("POST", "/api/database/inquiries", body)
        return if (res.code in 200..299) true to "Savolingiz imom-xatiblarga yuborildi." else false to (res.json?.optString("error", "Savol yuborilmadi") ?: "Tarmoq xatoligi")
    }

    suspend fun submitUgcReport(targetType: String, targetId: String, reason: String, reporterId: String): Pair<Boolean, String> {
        val body = JSONObject().apply {
            put("targetType", targetType)
            put("targetId", targetId)
            put("reason", reason)
            put("reporterId", reporterId)
            put("platform", "android")
        }
        val res = requestRaw("POST", "/api/ugc/report", body)
        return if (res.code in 200..299) true to "Shikoyat qabul qilindi va moderatorlarga yuborildi." else false to "Yuborib boʻlmadi."
    }

    suspend fun requestAccountDeletion(userId: String, reason: String): Pair<Boolean, String> {
        val body = JSONObject().apply {
            put("userId", userId)
            put("reason", reason)
            put("platform", "android")
        }
        val res = requestRaw("POST", "/api/user/delete-account", body)
        return if (res.code in 200..299) true to "Hisobni oʻchirish soʻrovi yuborildi." else false to (res.json?.optString("error", "Soʻrov yuborilmadi") ?: "Tarmoq xatoligi")
    }

    suspend fun syncIstiqomatDay(userId: String, day: IstiqomatDay): Boolean {
        val body = JSONObject().apply {
            put("userId", userId)
            put("date", day.dateIso)
            put("fajr", day.fajr)
            put("dhuhr", day.dhuhr)
            put("asr", day.asr)
            put("maghrib", day.maghrib)
            put("isha", day.isha)
            put("quranRead", day.quranRead)
            put("morningDhikr", day.morningDhikr)
            put("charity", day.charity)
        }
        val res = requestRaw("POST", "/api/database/istiqomat", body)
        return res.code in 200..299
    }

    // --- 5. Role-Protected Super Admin Panel API (Bearer Token via POST /api/admin/auth) ---
    suspend fun adminLogin(username: String, password: String): Pair<AdminSession?, String> {
        val body = JSONObject().apply {
            put("username", username.trim())
            put("password", password)
        }
        val res = requestRaw("POST", "/api/admin/auth", body)
        if (res.code == 200 && res.json != null && res.json.optBoolean("success", false)) {
            val token = res.json.optString("token", "")
            val adm = res.json.optJSONObject("admin")
            val session = AdminSession(
                isAuthenticated = token.isNotBlank(),
                token = token,
                username = adm?.optString("username", username) ?: username,
                email = adm?.optString("email", "") ?: "",
                role = adm?.optString("role", "SUPER_ADMIN") ?: "SUPER_ADMIN"
            )
            return session to "Super Admin paneliga xush kelibsiz!"
        }
        return null to (res.json?.optString("error", "Login yoki parol notoʻgʻri") ?: "Server bilan bogʻlanib boʻlmadi")
    }

    suspend fun verifyAdminSession(token: String): AdminSession? {
        if (token.isBlank()) return null
        val res = requestRaw("GET", "/api/admin/session", bearerToken = token)
        if (res.code == 200 && res.json != null && res.json.optBoolean("authenticated", res.json.optBoolean("success", false))) {
            val adm = res.json.optJSONObject("admin")
            return AdminSession(
                isAuthenticated = true,
                token = token,
                username = adm?.optString("username", "admin") ?: "admin",
                email = adm?.optString("email", "") ?: "",
                role = adm?.optString("role", "SUPER_ADMIN") ?: "SUPER_ADMIN"
            )
        }
        return null
    }

    suspend fun adminSaveAsakaPrayer(
        token: String,
        fajr: String,
        sunrise: String,
        dhuhr: String,
        asr: String,
        maghrib: String,
        isha: String,
        tahajjud: String
    ): Pair<Boolean, String> {
        val times = JSONArray().apply {
            if (tahajjud.isNotBlank()) put(JSONObject().put("id", "tahajjud").put("name", "Tahajjud").put("time", tahajjud))
            put(JSONObject().put("id", "fajr").put("name", "Bomdod").put("time", fajr))
            put(JSONObject().put("id", "sunrise").put("name", "Quyosh").put("time", sunrise))
            put(JSONObject().put("id", "dhuhr").put("name", "Peshin").put("time", dhuhr))
            put(JSONObject().put("id", "asr").put("name", "Asr").put("time", asr))
            put(JSONObject().put("id", "maghrib").put("name", "Shom").put("time", maghrib))
            put(JSONObject().put("id", "isha").put("name", "Xufton").put("time", isha))
        }
        val body = JSONObject().apply {
            put("schedule", JSONObject().apply {
                put("cityId", "uz-andijan-asaka")
                put("cityName", "Asaka")
                put("sourceMode", "MANUAL_ADMIN")
                put("times", times)
            })
        }
        val res = requestRaw("POST", "/api/database/prayer", body, bearerToken = token)
        return if (res.code in 200..299) true to "Asaka MANUAL_ADMIN namoz vaqtlari yangilandi va barcha platformalarga uzatildi!"
        else false to (res.json?.optString("error", "Saqlab boʻlmadi") ?: "Xatolik")
    }

    suspend fun adminPublishArticle(token: String, title: String, category: String, author: String, content: String): Pair<Boolean, String> {
        val id = "art_${System.currentTimeMillis()}"
        val body = JSONObject().apply {
            put("action", "create")
            put("article", JSONObject().apply {
                put("id", id)
                put("title", title)
                put("category", category)
                put("author", author.ifBlank { "Asaka Ziyo" })
                put("excerpt", content.take(140))
                put("content", content)
                put("date", java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date()))
            })
        }
        val res = requestRaw("POST", "/api/database/articles", body, bearerToken = token)
        return if (res.code in 200..299) true to "Maqola chop etildi!" else false to (res.json?.optString("error", "Xatolik") ?: "Xatolik")
    }

    suspend fun adminPublishNews(token: String, title: String, content: String, isUrgent: Boolean): Pair<Boolean, String> {
        val body = JSONObject().apply {
            put("action", "create")
            put("item", JSONObject().apply {
                put("id", "news_${System.currentTimeMillis()}")
                put("title", title)
                put("summary", content.take(140))
                put("content", content)
                put("isUrgent", isUrgent)
                put("date", java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date()))
            })
        }
        val res = requestRaw("POST", "/api/database/news", body, bearerToken = token)
        return if (res.code in 200..299) true to "Yangilik eʼlon qilindi!" else false to (res.json?.optString("error", "Xatolik") ?: "Xatolik")
    }

    suspend fun adminPublishAnnouncement(token: String, title: String, message: String, type: String): Pair<Boolean, String> {
        val body = JSONObject().apply {
            put("action", "create")
            put("announcement", JSONObject().apply {
                put("id", "ann_${System.currentTimeMillis()}")
                put("title", title)
                put("message", message)
                put("type", type)
                put("isActive", true)
                put("date", java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date()))
            })
        }
        val res = requestRaw("POST", "/api/database/announcements", body, bearerToken = token)
        return if (res.code in 200..299) true to "Eʼlon saqlandi!" else false to (res.json?.optString("error", "Xatolik") ?: "Xatolik")
    }

    suspend fun adminPublishHadith(token: String, title: String, text: String, source: String): Pair<Boolean, String> {
        val body = JSONObject().apply {
            put("action", "create")
            put("hadith", JSONObject().apply {
                put("id", "had_${System.currentTimeMillis()}")
                put("title", title)
                put("text", text)
                put("source", source)
            })
        }
        val res = requestRaw("POST", "/api/database/hadiths", body, bearerToken = token)
        return if (res.code in 200..299) true to "Hadis bazaga qoʻshildi!" else false to (res.json?.optString("error", "Xatolik") ?: "Xatolik")
    }

    suspend fun adminPublishDhikr(token: String, title: String, arabic: String, translation: String, count: Int): Pair<Boolean, String> {
        val body = JSONObject().apply {
            put("action", "create")
            put("dhikr", JSONObject().apply {
                put("id", "dhk_${System.currentTimeMillis()}")
                put("title", title)
                put("arabic", arabic)
                put("translation", translation)
                put("count", count)
            })
        }
        val res = requestRaw("POST", "/api/database/dhikrs", body, bearerToken = token)
        return if (res.code in 200..299) true to "Zikr bazaga qoʻshildi!" else false to (res.json?.optString("error", "Xatolik") ?: "Xatolik")
    }

    suspend fun adminAddQari(token: String, nameUz: String, nameAr: String, countryUz: String, styleUz: String, bioUz: String): Pair<Boolean, String> {
        val body = JSONObject().apply {
            put("nameUz", nameUz)
            put("nameAr", nameAr)
            put("countryUz", countryUz.ifBlank { "Oʻzbekiston" })
            put("styleUz", styleUz.ifBlank { "Murattal" })
            put("bioUz", bioUz)
            put("isPublished", true)
        }
        val res = requestRaw("POST", "/api/admin/quran-ecosystem/qaris", body, bearerToken = token)
        return if (res.code in 200..299) true to "Yangi qori qoʻshildi va barcha ilovalarga sinxronlandi!" else false to (res.json?.optString("error", "Xatolik") ?: "Xatolik")
    }

    suspend fun adminSaveHomeBlocks(token: String, config: AdminHomeConfig): Pair<Boolean, String> {
        val body = JSONObject().apply {
            put("bannerTitleUz", config.bannerTitleUz)
            put("bannerBodyUz", config.bannerBodyUz)
            put("bannerVisible", config.bannerVisible)
            put("bannerCtaModule", config.bannerCtaModule)
            put("pinnedAnnouncementId", config.pinnedAnnouncementId)
            put("blockOrder", JSONArray(config.blockOrder))
        }
        val res = requestRaw("POST", "/api/admin/home-blocks", body, bearerToken = token)
        return if (res.code in 200..299) true to "Bosh sahifa banneri va bloklari yangilandi!" else false to (res.json?.optString("error", "Xatolik") ?: "Xatolik")
    }

    suspend fun adminFetchOrdersAndFeatures(token: String): Pair<List<AdminOrderItem>, List<AdminFeatureFlag>> {
        val overviewRes = requestRaw("GET", "/api/admin/subscriptions/overview", bearerToken = token)
        val orders = mutableListOf<AdminOrderItem>()
        val oArr = overviewRes.json?.optJSONArray("orders") ?: overviewRes.json?.optJSONArray("paymentOrders")
        if (oArr != null) {
            for (i in 0 until oArr.length()) {
                val o = oArr.optJSONObject(i) ?: continue
                orders.add(
                    AdminOrderItem(
                        orderId = o.optString("orderId", o.optString("id", "")),
                        userId = o.optString("userId", ""),
                        userDisplayName = o.optString("userDisplayName", ""),
                        planId = o.optString("planId", ""),
                        finalPriceUzs = o.optLong("finalPriceUzs", o.optLong("amountUzs", 0L)),
                        receiptReference = o.optString("receiptReference", ""),
                        status = o.optString("status", "PENDING"),
                        platform = o.optString("platform", "android"),
                        createdAt = o.optString("createdAt", "")
                    )
                )
            }
        }
        val features = mutableListOf<AdminFeatureFlag>()
        val fArr = overviewRes.json?.optJSONArray("featureGates") ?: overviewRes.json?.optJSONArray("features")
        if (fArr != null) {
            for (i in 0 until fArr.length()) {
                val f = fArr.optJSONObject(i) ?: continue
                val lim = f.optInt("freeLimit", -1)
                features.add(
                    AdminFeatureFlag(
                        key = f.optString("key", ""),
                        module = f.optString("module", ""),
                        labelUz = f.optString("labelUz", f.optString("key", "")),
                        access = f.optString("access", "free"),
                        isEnabled = f.optBoolean("isEnabled", true),
                        freeLimit = if (lim < 0) null else lim
                    )
                )
            }
        }
        return orders to features
    }

    suspend fun adminReviewOrder(token: String, orderId: String, approve: Boolean): Pair<Boolean, String> {
        val encoded = URLEncoder.encode(orderId, "UTF-8")
        val action = if (approve) "approve" else "reject"
        val body = JSONObject().apply {
            put("note", if (approve) "Android Admin tasdiqladi" else "Rad etildi")
            put("reason", if (approve) "Android Admin tasdiqladi" else "Toʻlov tasdiqlanmadi")
        }
        val res = requestRaw("POST", "/api/admin/subscriptions/orders/$encoded/$action", body, bearerToken = token)
        return if (res.code in 200..299) true to (if (approve) "Buyurtma tasdiqlandi va Premium yoqildi!" else "Buyurtma rad etildi.")
        else false to (res.json?.optString("error", "Xatolik") ?: "Xatolik")
    }

    suspend fun adminToggleFeature(token: String, featureKey: String, newAccess: String, isEnabled: Boolean): Pair<Boolean, String> {
        val encoded = URLEncoder.encode(featureKey, "UTF-8")
        val body = JSONObject().apply {
            put("access", newAccess)
            put("isEnabled", isEnabled)
        }
        val res = requestRaw("PUT", "/api/admin/subscriptions/feature-gates/$encoded", body, bearerToken = token)
        return if (res.code in 200..299) true to "$featureKey -> ${newAccess.uppercase()} saqlandi!"
        else false to (res.json?.optString("error", "Xatolik") ?: "Xatolik")
    }

    suspend fun adminGrantPremium(token: String, targetUserId: String, days: Int, note: String): Pair<Boolean, String> {
        val encoded = URLEncoder.encode(targetUserId.trim(), "UTF-8")
        val body = JSONObject().apply {
            put("action", "grant")
            put("days", days.coerceIn(1, 3650))
            put("reason", note.ifBlank { "Admin sovgʻa Premium" })
            put("isGift", true)
        }
        val res = requestRaw("POST", "/api/admin/subscriptions/users/$encoded/modify", body, bearerToken = token)
        return if (res.code in 200..299) true to "$targetUserId uchun $days kunlik Premium berildi!"
        else false to (res.json?.optString("error", "Xatolik") ?: "Xatolik")
    }

    suspend fun adminCreatePromoCode(token: String, code: String, discountPercent: Int, bonusDays: Int): Pair<Boolean, String> {
        val body = JSONObject().apply {
            put("code", code.trim().uppercase())
            put("discountPercent", discountPercent.coerceIn(0, 100))
            put("bonusDays", bonusDays.coerceIn(0, 365))
            put("maxUses", 100)
            put("isActive", true)
        }
        val res = requestRaw("POST", "/api/admin/subscriptions/promos", body, bearerToken = token)
        return if (res.code in 200..299) true to "Promokod ${code.uppercase()} yaratildi!"
        else false to (res.json?.optString("error", "Xatolik") ?: "Xatolik")
    }

    suspend fun adminBroadcastPush(token: String, title: String, bodyText: String): Pair<Boolean, String> {
        val body = JSONObject().apply {
            put("title", title)
            put("body", bodyText)
            put("message", bodyText)
        }
        val res = requestRaw("POST", "/api/notifications/broadcast", body, bearerToken = token)
        return if (res.code in 200..299) true to "Push bildirishnoma yuborildi!"
        else false to (res.json?.optString("error", "Xatolik") ?: "Xatolik")
    }

    suspend fun adminBroadcastTelegram(token: String, message: String): Pair<Boolean, String> {
        val body = JSONObject().apply { put("message", message) }
        val res = requestRaw("POST", "/api/telegram/broadcast", body, bearerToken = token)
        return if (res.code in 200..299) true to "Telegram Bot foydalanuvchilariga xabar yuborildi!"
        else false to (res.json?.optString("error", "Xatolik") ?: "Xatolik")
    }

    suspend fun adminCreateBackup(token: String): Pair<Boolean, String> {
        val res = requestRaw("POST", "/api/backup/create", JSONObject(), bearerToken = token)
        return if (res.code in 200..299) true to "Bulut zaxira nusxasi (Backup) muvaffaqiyatli yaratildi!"
        else false to (res.json?.optString("error", "Xatolik") ?: "Xatolik")
    }

    suspend fun adminReplyInquiry(token: String, inquiryId: String, replyText: String): Pair<Boolean, String> {
        val body = JSONObject().apply {
            put("action", "reply")
            put("id", inquiryId)
            put("replyText", replyText.trim())
        }
        val res = requestRaw("POST", "/api/database/inquiries", body, bearerToken = token)
        return if (res.code in 200..299) true to "Imom javobi muvaffaqiyatli saqlandi va nashr qilindi!"
        else false to (res.json?.optString("error", "Javobni saqlashda xatolik") ?: "Xatolik")
    }

    suspend fun adminArchiveInquiry(token: String, inquiryId: String): Pair<Boolean, String> {
        val body = JSONObject().apply {
            put("action", "archive")
            put("id", inquiryId)
        }
        val res = requestRaw("POST", "/api/database/inquiries", body, bearerToken = token)
        return if (res.code in 200..299) true to "Murojaat arxivlandi."
        else false to (res.json?.optString("error", "Arxivlashda xatolik") ?: "Xatolik")
    }
}
