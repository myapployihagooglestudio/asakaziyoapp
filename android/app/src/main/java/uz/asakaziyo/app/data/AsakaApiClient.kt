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
 * ASAKA ZIYO v5.0.0 — Unified Central Backend REST Client
 *
 * Zero secrets, zero API keys, zero hardcoded credentials inside APK.
 * All Prayer Times (Asaka MANUAL_ADMIN + 14 UZ Regions + Global AUTO), Weather, Qaris & 114-Surah Audio,
 * Education/Tajweed, Free/Premium Subscriptions, Promo Codes, Fair Random Draws, Account Linking,
 * and Gemini AI Assistant queries go strictly through the central ASAKA ZIYO backend.
 */
object AsakaApiClient {
    private val baseUrl: String = BuildConfig.BACKEND_BASE_URL.trimEnd('/')

    @Volatile
    var lastApiLatencyMs: Long = 0L
        private set

    @Volatile
    var lastApiError: String = ""
        private set

    private suspend fun requestJson(
        method: String,
        urlString: String,
        body: JSONObject? = null,
        timeoutMs: Int = 15_000,
        maxRetries: Int = 2
    ): Pair<Int, JSONObject?> = withContext(Dispatchers.IO) {
        val attempts = if (method == "GET") (maxRetries + 1) else 1
        var lastCode = 0
        var lastJson: JSONObject? = null
        for (attempt in 0 until attempts) {
            val startedAt = System.currentTimeMillis()
            var conn: HttpURLConnection? = null
            try {
                conn = (URL(urlString).openConnection() as HttpURLConnection).apply {
                    requestMethod = method
                    connectTimeout = timeoutMs
                    readTimeout = timeoutMs
                    setRequestProperty("Accept", "application/json")
                    setRequestProperty("User-Agent", "AsakaZiyo-Android/${BuildConfig.VERSION_NAME}")
                    if (body != null) {
                        doOutput = true
                        setRequestProperty("Content-Type", "application/json; charset=utf-8")
                    }
                }
                if (body != null) {
                    OutputStreamWriter(conn.outputStream, Charsets.UTF_8).use { writer ->
                        writer.write(body.toString())
                        writer.flush()
                    }
                }
                val code = conn.responseCode
                lastApiLatencyMs = (System.currentTimeMillis() - startedAt).coerceAtLeast(1L)
                val stream = if (code in 200..299) conn.inputStream else conn.errorStream
                val text = stream?.let { s ->
                    BufferedReader(InputStreamReader(s, Charsets.UTF_8)).use { it.readText() }
                }.orEmpty()
                val parsed = if (text.trim().startsWith("{")) JSONObject(text) else null
                lastCode = code
                lastJson = parsed
                if (code in 200..299) {
                    lastApiError = ""
                    return@withContext code to parsed
                }
                if (code == 429) {
                    lastApiError = "HTTP 429: Soʻrovlar chegarasi — kesh ishlatilmoqda"
                    return@withContext code to parsed
                }
                if (code in 400..499) {
                    lastApiError = "HTTP $code"
                    return@withContext code to parsed
                }
                lastApiError = "HTTP $code"
            } catch (e: Exception) {
                lastApiLatencyMs = (System.currentTimeMillis() - startedAt).coerceAtLeast(1L)
                lastApiError = e.message ?: "Tarmoq xatoligi"
                lastCode = 0
                lastJson = null
            } finally {
                try {
                    conn?.disconnect()
                } catch (_: Exception) {}
            }
            if (attempt < attempts - 1) {
                try {
                    Thread.sleep(350L * (1 shl attempt))
                } catch (_: InterruptedException) {
                    break
                }
            }
        }
        lastCode to lastJson
    }

    // Pure parser exposed for JUnit tests & Asaka MANUAL_ADMIN integrity checks
    fun parsePrayerScheduleJson(json: JSONObject, fallbackCityId: String = "uz-andijan-asaka"): PrayerScheduleSnapshot {
        val rec = json.optJSONObject("record") ?: json.optJSONObject("schedule") ?: json
        val timesObj = rec.optJSONObject("times")
        val timesArr = rec.optJSONArray("times")
        val arrayTimesMap = mutableMapOf<String, String>()
        if (timesArr != null) {
            for (i in 0 until timesArr.length()) {
                val item = timesArr.optJSONObject(i) ?: continue
                val key = item.optString("id", item.optString("key", "")).lowercase()
                val t = item.optString("time", "")
                if (key.isNotBlank() && t.isNotBlank()) arrayTimesMap[key] = t
            }
        }
        fun pickTime(vararg keys: String, defaultVal: String = "--:--"): String {
            for (k in keys) {
                val direct = rec.optString(k, "").trim()
                if (direct.isNotBlank()) return direct
                val fromObj = timesObj?.optString(k, "")?.trim().orEmpty()
                if (fromObj.isNotBlank()) return fromObj
                val fromArr = arrayTimesMap[k.lowercase()]?.trim().orEmpty()
                if (fromArr.isNotBlank()) return fromArr
            }
            return defaultVal
        }
        val nextObj = rec.optJSONObject("nextPrayer") ?: json.optJSONObject("nextPrayer")
        val resolvedCityId = rec.optString("cityId", rec.optString("locationId", fallbackCityId)).ifBlank { fallbackCityId }
        val defaultMode = if (resolvedCityId == "uz-andijan-asaka") "MANUAL_ADMIN" else "AUTO_CALCULATED"
        return PrayerScheduleSnapshot(
            cityId = resolvedCityId,
            cityName = rec.optString("cityName", "Asaka").ifBlank { "Asaka" },
            regionName = rec.optString("regionName", ""),
            sourceMode = rec.optString("sourceMode", defaultMode).ifBlank { defaultMode },
            localDate = rec.optString("localDate", rec.optString("date", "")),
            hijriDate = rec.optString("hijriDate", ""),
            fajr = pickTime("fajr", "bomdod"),
            sunrise = pickTime("sunrise", "quyosh"),
            dhuhr = pickTime("dhuhr", "peshin"),
            asr = pickTime("asr"),
            maghrib = pickTime("maghrib", "shom"),
            isha = pickTime("isha", "xufton"),
            tahajjud = pickTime("tahajjud", defaultVal = ""),
            nextPrayerName = nextObj?.optString("nameUz", nextObj.optString("name", "")) ?: "",
            nextPrayerTime = nextObj?.optString("time", "") ?: "",
            isStaleCache = false,
            fetchedAt = rec.optString("updatedAt", json.optString("fetchedAt", ""))
        )
    }

    // --- 1. Global Prayer Times & Weather (Respecting Asaka MANUAL_ADMIN) ---
    suspend fun fetchTodayPrayer(cityId: String): PrayerScheduleSnapshot? {
        val encoded = URLEncoder.encode(cityId, "UTF-8")
        val (code, json) = requestJson("GET", "$baseUrl/api/global-prayer/schedule?locationId=$encoded")
        if (code != 200 || json == null) return null
        return parsePrayerScheduleJson(json, cityId)
    }

    suspend fun fetchWeather(cityId: String): WeatherSnapshot? {
        val encoded = URLEncoder.encode(cityId, "UTF-8")
        val (code, json) = requestJson("GET", "$baseUrl/api/weather?locationId=$encoded")
        if (code != 200 || json == null) return null
        val w = json.optJSONObject("weather") ?: json
        val current = w.optJSONObject("current") ?: return null
        return WeatherSnapshot(
            cityName = w.optString("locationLabel", w.optString("cityName", "Asaka")).ifBlank { "Asaka" },
            tempC = current.optDouble("temperatureC", current.optDouble("tempC", 0.0)),
            conditionUz = current.optString("conditionUz", current.optString("descriptionUz", "")),
            humidity = current.optInt("humidityPct", current.optInt("relativeHumidity", current.optInt("humidity", 0))),
            windKmh = current.optDouble("windSpeedKmh", current.optDouble("windKmh", 0.0)),
            isStale = w.optBoolean("isStale", false),
            attribution = w.optString("attribution", "Open-Meteo (CC BY 4.0)")
        )
    }

    suspend fun fetchUzbekistanAndGlobalCities(): List<CityOption> {
        val out = LinkedHashMap<String, CityOption>()
        val (code, json) = requestJson("GET", "$baseUrl/api/global-prayer/locations")
        if (code != 200 || json == null) return emptyList()

        fun addCity(city: JSONObject, fallbackRegion: String = "", fallbackCountry: String = "") {
            val id = city.optString("id", "").trim()
            if (id.isBlank() || out.containsKey(id)) return
            out[id] = CityOption(
                id = id,
                cityName = city.optString("cityName", "").ifBlank { id },
                regionName = city.optString("regionName", fallbackRegion),
                countryName = city.optString("countryName", fallbackCountry),
                latitude = city.optDouble("latitude", 40.6415),
                longitude = city.optDouble("longitude", 72.2387),
                isManualAdmin = id == "uz-andijan-asaka" || city.optString("sourceMode", "") == "MANUAL_ADMIN"
            )
        }

        val regions = json.optJSONArray("uzbekistanRegions") ?: JSONArray()
        for (i in 0 until regions.length()) {
            val reg = regions.optJSONObject(i) ?: continue
            val regName = reg.optString("regionName", reg.optString("nameUz", ""))
            val cities = reg.optJSONArray("cities") ?: continue
            for (j in 0 until cities.length()) {
                val city = cities.optJSONObject(j) ?: continue
                addCity(city, fallbackRegion = regName, fallbackCountry = "Oʻzbekiston")
            }
        }
        listOf("haramainFeatured", "centralAsiaCities", "globalCities").forEach { key ->
            val arr = json.optJSONArray(key) ?: return@forEach
            for (i in 0 until arr.length()) {
                val city = arr.optJSONObject(i) ?: continue
                addCity(city)
            }
        }
        return out.values.toList()
    }

    suspend fun resolveNearestCity(lat: Double, lon: Double): CityOption? {
        val (code, json) = requestJson("GET", "$baseUrl/api/global-prayer/resolve-gps?lat=$lat&lon=$lon")
        if (code != 200 || json == null) return null
        val loc = json.optJSONObject("location") ?: json.optJSONObject("city") ?: return null
        val id = loc.optString("id", "uz-andijan-asaka")
        return CityOption(
            id = id,
            cityName = loc.optString("cityName", "Asaka"),
            regionName = loc.optString("regionName", ""),
            countryName = loc.optString("countryName", ""),
            latitude = loc.optDouble("latitude", lat),
            longitude = loc.optDouble("longitude", lon),
            isManualAdmin = id == "uz-andijan-asaka"
        )
    }

    // --- 2. Qur'on Ecosystem (Qorilar, 114-Surah Audio, Playlists, Education, User Profile) ---
    suspend fun fetchQaris(): List<QariProfile> {
        val (code, json) = requestJson("GET", "$baseUrl/api/quran-ecosystem/qaris")
        if (code != 200 || json == null) return emptyList()
        val arr = json.optJSONArray("qaris") ?: return emptyList()
        val out = mutableListOf<QariProfile>()
        for (i in 0 until arr.length()) {
            val q = arr.getJSONObject(i)
            val extBase = q.optString("externalSurahBaseUrl", "").ifBlank { null }
            val publishedCount = q.optInt("publishedSurahsCount", 0)
            val rawAvatar = q.optString("avatarUrl", "")
            val resolvedAvatar = if (rawAvatar.startsWith("/")) "$baseUrl$rawAvatar" else rawAvatar
            val missingCount = q.optInt(
                "missingSurahsCount",
                if (extBase != null) 0 else (114 - publishedCount).coerceAtLeast(0)
            )
            val isCompleteReady = q.optBoolean(
                "isCompleteReady",
                extBase != null || publishedCount >= 114
            )
            out.add(
                QariProfile(
                    id = q.optString("id", ""),
                    nameUz = q.optString("nameUz", ""),
                    nameAr = q.optString("nameAr", ""),
                    countryUz = q.optString("countryUz", ""),
                    styleUz = q.optString("styleUz", "Murattal"),
                    bioUz = q.optString("biographyUz", q.optString("bioUz", "")),
                    publishedSurahsCount = publishedCount,
                    externalSurahBaseUrl = extBase,
                    avatarUrl = resolvedAvatar,
                    isCompleteReady = isCompleteReady,
                    missingSurahsCount = missingCount,
                    isProtectedPermanent = q.optBoolean("isProtectedPermanent", false)
                )
            )
        }
        return out
    }

    suspend fun fetchQariSurahs(qari: QariProfile): List<QariSurahTrack> {
        val encoded = URLEncoder.encode(qari.id, "UTF-8")
        val (code, json) = requestJson("GET", "$baseUrl/api/quran-ecosystem/qaris/$encoded/surahs")
        if (code != 200 || json == null) return emptyList()
        val arr = json.optJSONArray("surahs") ?: return emptyList()
        val out = mutableListOf<QariSurahTrack>()
        for (i in 0 until arr.length()) {
            val s = arr.getJSONObject(i)
            val surahNum = s.optInt("surahNumber", i + 1)
            val serverAudio = s.optJSONObject("uploadedRecord") ?: s.optJSONObject("audio")
            val audioId = serverAudio?.optString("id", "")?.ifBlank { null }
            val rawAudioUrl = s.optString("audioUrl", s.optString("externalFallbackUrl", "")).ifBlank { null }
            val resolvedStream = when {
                rawAudioUrl != null && rawAudioUrl.startsWith("/") -> "$baseUrl$rawAudioUrl"
                rawAudioUrl != null -> rawAudioUrl
                audioId != null -> "$baseUrl/api/quran-ecosystem/audio-stream/$audioId"
                else -> ""
            }
            val audioSource = s.optString(
                "audioSource",
                if (audioId != null) "uploaded_persistent" else if (resolvedStream.isNotBlank()) "verified_cdn" else "unavailable"
            )
            val surahTitle = s.optString("nameUz", s.optString("surahNameUz", "Sura #$surahNum"))
            out.add(
                QariSurahTrack(
                    trackKey = "${qari.id}_${surahNum}",
                    qariId = qari.id,
                    qariName = qari.nameUz,
                    surahNumber = surahNum,
                    surahNameUz = surahTitle,
                    audioId = audioId,
                    streamUrl = resolvedStream,
                    sha256 = serverAudio?.optString("sha256", "")?.ifBlank { null },
                    durationSec = serverAudio?.optInt("durationSeconds", serverAudio.optInt("durationSec", 0)) ?: 0,
                    isServerHosted = audioSource == "uploaded_persistent" || audioId != null,
                    isAvailable = resolvedStream.isNotBlank(),
                    audioSource = audioSource,
                    version = serverAudio?.optInt("version", 1) ?: 1
                )
            )
        }
        return out
    }

    suspend fun fetchPlaylists(userId: String): List<QuranPlaylist> {
        val encoded = URLEncoder.encode(userId, "UTF-8")
        val (code, json) = requestJson("GET", "$baseUrl/api/quran-ecosystem/playlists?userId=$encoded")
        if (code != 200 || json == null) return emptyList()
        val out = mutableListOf<QuranPlaylist>()
        fun parseArr(arr: JSONArray?, official: Boolean) {
            if (arr == null) return
            for (i in 0 until arr.length()) {
                val p = arr.getJSONObject(i)
                val tracks = p.optJSONArray("tracks") ?: JSONArray()
                val firstSurah = if (tracks.length() > 0) tracks.getJSONObject(0).optInt("surahNumber", 1) else 1
                out.add(
                    QuranPlaylist(
                        id = p.optString("id", ""),
                        titleUz = p.optString("titleUz", ""),
                        descriptionUz = p.optString("descriptionUz", ""),
                        isOfficial = official,
                        trackCount = tracks.length(),
                        firstSurahNumber = firstSurah
                    )
                )
            }
        }
        parseArr(json.optJSONArray("official"), true)
        parseArr(json.optJSONArray("personal"), false)
        return out
    }

    suspend fun fetchEducationCatalog(): Pair<List<ArabicLetterItem>, List<TajweedLesson>> {
        val (code, json) = requestJson("GET", "$baseUrl/api/quran-ecosystem/education")
        if (code != 200 || json == null) return emptyList<ArabicLetterItem>() to emptyList()
        val letters = mutableListOf<ArabicLetterItem>()
        val lessons = mutableListOf<TajweedLesson>()
        val alphaArr = json.optJSONArray("alphabet") ?: JSONArray()
        for (i in 0 until alphaArr.length()) {
            val l = alphaArr.getJSONObject(i)
            letters.add(
                ArabicLetterItem(
                    order = l.optInt("order", i + 1),
                    letter = l.optString("letter", ""),
                    nameUz = l.optString("nameUz", ""),
                    makhrajUz = l.optString("makhrajUz", ""),
                    pronunciationUz = l.optString("pronunciationUz", "")
                )
            )
        }
        val lesArr = json.optJSONArray("lessons") ?: JSONArray()
        for (i in 0 until lesArr.length()) {
            val ls = lesArr.getJSONObject(i)
            lessons.add(
                TajweedLesson(
                    id = ls.optString("id", ""),
                    titleUz = ls.optString("titleUz", ""),
                    level = ls.optString("level", "beginner"),
                    summaryUz = ls.optString("summaryUz", ""),
                    contentUz = ls.optString("contentUz", "")
                )
            )
        }
        return letters to lessons
    }

    suspend fun syncUserQuranProfile(userId: String, payload: JSONObject): Boolean {
        val encoded = URLEncoder.encode(userId, "UTF-8")
        val (code, json) = requestJson("PUT", "$baseUrl/api/quran-ecosystem/profile/$encoded", payload)
        return code == 200 && json?.optBoolean("success", false) == true
    }

    // Verified Uthmani Mushaf text + Uzbek translation (NEVER generated/altered by AI)
    suspend fun fetchMushafSurah(surahNumber: Int): List<MushafAyah>? {
        val safeNum = surahNumber.coerceIn(1, 114)
        val (code, json) = requestJson(
            "GET",
            "https://api.alquran.cloud/v1/surah/$safeNum/editions/quran-uthmani,uz.sodik",
            timeoutMs = 18_000
        )
        if (code != 200 || json == null) return null
        val data = json.optJSONArray("data") ?: return null
        if (data.length() < 2) return null
        val arAyahs = data.getJSONObject(0).optJSONArray("ayahs") ?: return null
        val uzAyahs = data.getJSONObject(1).optJSONArray("ayahs") ?: return null
        val out = ArrayList<MushafAyah>(arAyahs.length())
        for (i in 0 until arAyahs.length()) {
            val ar = arAyahs.getJSONObject(i)
            val uz = if (i < uzAyahs.length()) uzAyahs.getJSONObject(i) else null
            out.add(
                MushafAyah(
                    numberInSurah = ar.optInt("numberInSurah", i + 1),
                    arabicText = ar.optString("text", ""),
                    translationUz = uz?.optString("text", "") ?: ""
                )
            )
        }
        return out
    }

    // --- 3. Unified Free + Premium Subscription, Promo, Draws & 6-Digit Account Linking ---
    suspend fun fetchSubscriptionCatalog(): Triple<List<SubscriptionPlan>, ManualCardConfig, List<RandomDrawItem>> {
        val (code, json) = requestJson("GET", "$baseUrl/api/subscriptions/catalog")
        if (code != 200 || json == null) return Triple(emptyList(), ManualCardConfig(), emptyList())
        val plans = mutableListOf<SubscriptionPlan>()
        val pArr = json.optJSONArray("plans") ?: JSONArray()
        for (i in 0 until pArr.length()) {
            val p = pArr.getJSONObject(i)
            plans.add(
                SubscriptionPlan(
                    id = p.optString("id", ""),
                    nameUz = p.optString("nameUz", ""),
                    durationDays = p.optInt("durationDays", 30),
                    priceUzs = p.optLong("priceUzs", 0L),
                    badgeUz = p.optString("badgeUz", ""),
                    descriptionUz = p.optString("descriptionUz", "")
                )
            )
        }
        val cObj = json.optJSONObject("cardSettings")
        val card = ManualCardConfig(
            isActive = cObj?.optBoolean("isActive", false) ?: false,
            cardholderName = cObj?.optString("cardholderName", "") ?: "",
            cardNumber = cObj?.optString("cardNumber", "") ?: "",
            bankName = cObj?.optString("bankName", "") ?: "",
            instructionsUz = cObj?.optString("instructionsUz", "") ?: "",
            supportTelegramUrl = cObj?.optString("supportTelegramUrl", "") ?: ""
        )
        val draws = mutableListOf<RandomDrawItem>()
        val dArr = json.optJSONArray("randomDraws") ?: JSONArray()
        for (i in 0 until dArr.length()) {
            val d = dArr.getJSONObject(i)
            draws.add(
                RandomDrawItem(
                    id = d.optString("id", ""),
                    titleUz = d.optString("titleUz", ""),
                    descriptionUz = d.optString("descriptionUz", ""),
                    prizeDays = d.optInt("prizeDays", 30),
                    winnersCount = d.optInt("winnersCount", 1),
                    entriesCount = d.optInt("entriesCount", 0),
                    status = d.optString("status", "OPEN")
                )
            )
        }
        return Triple(plans, card, draws)
    }

    suspend fun fetchUserSubscription(userId: String): EffectiveSubscription? {
        val encoded = URLEncoder.encode(userId, "UTF-8")
        val (code, json) = requestJson("GET", "$baseUrl/api/subscriptions/me/$encoded?platform=android")
        if (code != 200 || json == null) return null
        val s = json.optJSONObject("subscription") ?: return null
        val aliases = mutableListOf<String>()
        val aArr = s.optJSONArray("linkedAliases")
        if (aArr != null) {
            for (i in 0 until aArr.length()) aliases.add(aArr.optString(i))
        }
        return EffectiveSubscription(
            userId = s.optString("userId", userId),
            status = s.optString("status", "FREE"),
            planId = s.optString("planId", "free"),
            isPremium = s.optBoolean("isPremium", false),
            daysRemaining = s.optInt("daysRemaining", 0),
            expiresAt = s.optString("expiresAt", "").ifBlank { null },
            linkedAliases = aliases
        )
    }

    suspend fun fetchUserEntitlements(userId: String): Pair<EffectiveSubscription?, List<FeatureEntitlementItem>> {
        val encoded = URLEncoder.encode(userId, "UTF-8")
        val (code, json) = requestJson("GET", "$baseUrl/api/subscriptions/entitlements/$encoded?platform=android")
        if (code != 200 || json == null) return null to emptyList()
        val s = json.optJSONObject("subscription")
        val sub = if (s != null) {
            val aliases = mutableListOf<String>()
            val aArr = s.optJSONArray("linkedAliases")
            if (aArr != null) {
                for (i in 0 until aArr.length()) aliases.add(aArr.optString(i))
            }
            EffectiveSubscription(
                userId = s.optString("userId", userId),
                status = s.optString("status", "FREE"),
                planId = s.optString("planId", "free"),
                isPremium = s.optBoolean("isPremium", false),
                daysRemaining = s.optInt("daysRemaining", 0),
                expiresAt = s.optString("expiresAt", "").ifBlank { null },
                linkedAliases = aliases
            )
        } else null

        val features = mutableListOf<FeatureEntitlementItem>()
        val fObj = json.optJSONObject("features")
        if (fObj != null) {
            val keys = fObj.keys()
            while (keys.hasNext()) {
                val key = keys.next()
                val d = fObj.optJSONObject(key) ?: continue
                val meta = d.optJSONObject("feature")
                val limitVal = d.optInt("limit", -1)
                val remVal = d.optInt("remaining", -1)
                features.add(
                    FeatureEntitlementItem(
                        key = d.optString("featureKey", key),
                        module = d.optString("module", meta?.optString("module", "home") ?: "home"),
                        titleUz = meta?.optString("labelUz", key) ?: key,
                        descriptionUz = meta?.optString("descriptionUz", "") ?: "",
                        access = d.optString("access", "free"),
                        isEnabled = meta?.optBoolean("isEnabled", true) ?: true,
                        allowed = d.optBoolean("allowed", true),
                        reasonCode = d.optString("reasonCode", "OK"),
                        limit = if (limitVal < 0) null else limitVal,
                        limitPeriod = d.optString("limitPeriod", "daily"),
                        usedCount = d.optInt("used", 0),
                        remaining = if (remVal < 0) null else remVal,
                        userNoticeUz = meta?.optString("userNoticeUz", d.optString("messageUz", "")) ?: ""
                    )
                )
            }
        }
        return sub to features
    }

    suspend fun checkFeatureEntitlement(
        userId: String,
        featureKey: String,
        consume: Boolean = false
    ): FeatureCheckResult {
        val body = JSONObject().apply {
            put("userId", userId)
            put("featureKey", featureKey)
            put("platform", "android")
            put("consume", consume)
        }
        val (code, json) = requestJson("POST", "$baseUrl/api/subscriptions/entitlements/check", body)
        if (json == null) {
            return FeatureCheckResult(
                allowed = false,
                featureKey = featureKey,
                reasonCode = "NETWORK_ERROR",
                messageUz = "Server bilan bogʻlanib boʻlmadi. Internet aloqasini tekshiring."
            )
        }
        val ent = json.optJSONObject("decision") ?: json.optJSONObject("entitlement") ?: json
        val limitVal = ent.optInt("limit", -1)
        val remVal = ent.optInt("remaining", -1)
        return FeatureCheckResult(
            allowed = code == 200 && ent.optBoolean("allowed", false),
            featureKey = ent.optString("featureKey", featureKey),
            reasonCode = ent.optString("reasonCode", if (code == 200) "OK" else "PREMIUM_REQUIRED"),
            messageUz = ent.optString("messageUz", json.optString("error", "")),
            isPremium = ent.optBoolean("isPremiumUser", ent.optBoolean("isPremium", false)),
            limit = if (limitVal < 0) null else limitVal,
            usedCount = ent.optInt("used", ent.optInt("usedCount", 0)),
            remaining = if (remVal < 0) null else remVal
        )
    }

    suspend fun submitManualCardOrder(
        userId: String,
        displayName: String,
        planId: String,
        receiptReference: String,
        promoCode: String? = null
    ): Pair<Boolean, String> {
        val body = JSONObject().apply {
            put("userId", userId)
            put("userDisplayName", displayName)
            put("platform", "android")
            put("planId", planId)
            put("receiptReference", receiptReference)
            if (!promoCode.isNullOrBlank()) put("promoCode", promoCode.trim().uppercase())
        }
        val (code, json) = requestJson("POST", "$baseUrl/api/subscriptions/orders", body)
        return if (code == 200 && json?.optBoolean("success", false) == true) {
            val orderId = json.optJSONObject("order")?.optString("orderId", "") ?: ""
            true to "Soʻrov yuborildi ($orderId). Admin tekshiruvidan soʻng Premium faollashadi."
        } else {
            false to (json?.optString("error", "Buyurtma yuborishda xatolik") ?: "Tarmoq xatoligi")
        }
    }

    suspend fun redeemPromoCode(userId: String, promoCode: String): Pair<Boolean, String> {
        val body = JSONObject().apply {
            put("code", promoCode.trim().uppercase())
            put("userId", userId)
            put("redeemNow", true)
        }
        val (code, json) = requestJson("POST", "$baseUrl/api/subscriptions/promo/apply", body)
        return if (code == 200 && json?.optBoolean("success", false) == true) {
            true to "Promokod muvaffaqiyatli faollashtirildi!"
        } else {
            false to (json?.optString("error", "Promokod yaroqsiz") ?: "Tarmoq xatoligi")
        }
    }

    suspend fun joinRandomDraw(drawId: String, userId: String, displayName: String): Pair<Boolean, String> {
        val encoded = URLEncoder.encode(drawId, "UTF-8")
        val body = JSONObject().apply {
            put("userId", userId)
            put("displayName", displayName)
            put("platform", "android")
        }
        val (code, json) = requestJson("POST", "$baseUrl/api/subscriptions/random-draws/$encoded/join", body)
        return if (code == 200 && json?.optBoolean("success", false) == true) {
            true to "Tanlovda muvaffaqiyatli roʻyxatdan oʻtdingiz!"
        } else {
            false to (json?.optString("error", "Ishtirok etib boʻlmadi") ?: "Tarmoq xatoligi")
        }
    }

    suspend fun generateTelegramLinkCode(userId: String): Pair<String?, String?> {
        val body = JSONObject().apply { put("userId", userId) }
        val (code, json) = requestJson("POST", "$baseUrl/api/account-link/generate", body)
        return if (code == 200 && json?.optBoolean("success", false) == true) {
            json.optString("code", "").ifBlank { null } to null
        } else {
            null to (json?.optString("error", "Kod yaratishda xatolik") ?: "Tarmoq xatoligi")
        }
    }

    suspend fun redeemAccountLinkCode(codeInput: String, secondaryUserId: String): Pair<String?, String?> {
        val body = JSONObject().apply {
            put("code", codeInput.trim())
            put("secondaryUserId", secondaryUserId)
            put("platform", "android")
        }
        val (code, json) = requestJson("POST", "$baseUrl/api/account-link/redeem", body)
        return if (code == 200 && json?.optBoolean("success", false) == true) {
            val canonical = json.optString("canonicalUserId", "").ifBlank { null }
            canonical to null
        } else {
            null to (json?.optString("error", "6 xonali kod yaroqsiz yoki muddati tugagan") ?: "Tarmoq xatoligi")
        }
    }

    suspend fun fetchUnifiedUserSyncState(userId: String): JSONObject? {
        val encoded = URLEncoder.encode(userId, "UTF-8")
        val (code, json) = requestJson("GET", "$baseUrl/api/user/sync-state/$encoded")
        return if (code == 200 && json?.optBoolean("success", false) == true) json else null
    }

    suspend fun pushUnifiedUserSyncState(userId: String, payload: JSONObject): Boolean {
        val encoded = URLEncoder.encode(userId, "UTF-8")
        val body = JSONObject(payload.toString()).apply {
            put("platform", "android")
        }
        val (code, json) = requestJson("PUT", "$baseUrl/api/user/sync-state/$encoded", body)
        return code == 200 && json?.optBoolean("success", false) == true
    }

    // --- 4. Server-Side Gemini AI Assistant Proxy (ZERO API Keys in APK, Server-Enforced Entitlements!) ---
    suspend fun askAiAssistant(
        prompt: String,
        languageCode: String,
        userId: String = "android_guest"
    ): String {
        val msgObj = JSONObject().apply {
            put("role", "user")
            put("content", prompt)
        }
        val messages = JSONArray().apply { put(msgObj) }
        val body = JSONObject().apply {
            put("messages", messages)
            put("locale", languageCode)
            put("channel", "android")
            put("platform", "android")
            put("userId", userId)
            put("stream", false)
        }
        val (code, json) = requestJson("POST", "$baseUrl/api/ai/chat", body, timeoutMs = 25_000)
        if (code == 403 && json != null) {
            val entitlementMsg = json.optJSONObject("entitlement")?.optString("messageUz", "") ?: ""
            val err = entitlementMsg.ifBlank { json.optString("error", "") }
            if (err.isNotBlank()) return err
            return "AI Ustoz bepul limiti tugadi. Cheksiz foydalanish uchun ASAKA ZIYO Premium obunasini faollashtiring."
        }
        if (code == 200 && json != null) {
            val answer = json.optString("reply", json.optString("answer", json.optString("text", "")))
            if (answer.isNotBlank()) return answer
        }
        return "AI Yordamchi bilan bogʻlanishda vaqtinchalik uzilish yuz berdi. Internet ulanishini tekshirib qayta urinib koʻring. Murakkab fatvo va fiqhiy masalalarda doimo Oʻzbekiston Musulmonlari Idorasi Fatvo Markazi (fatvo.uz) yoki mahalliy imom-xatiblarga murojaat qiling."
    }
}
