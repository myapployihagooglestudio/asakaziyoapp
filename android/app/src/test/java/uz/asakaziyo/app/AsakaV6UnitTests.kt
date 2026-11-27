package uz.asakaziyo.app

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import uz.asakaziyo.app.data.AsakaApiClient
import uz.asakaziyo.app.data.AsakaCatalogData
import uz.asakaziyo.app.data.AsakaEcosystemApiClient
import uz.asakaziyo.app.data.QariProfile
import uz.asakaziyo.app.i18n.AsakaLocale
import uz.asakaziyo.app.i18n.resolveAsakaStrings
import uz.asakaziyo.app.i18n.toNewUzbekLatin

/**
 * ASAKA ZIYO Android v7.0.0 — Automated JVM Unit Test Suite
 *
 * Verifies:
 * 1. All 5 languages + strict New Uzbek Latin transliteration (sh->ş, ch->ç, oʻ->ö, gʻ->ğ)
 * 2. Central /api/database JSON envelope (`{"success":true,"data":{...}}`) unwrapping + DailyWisdomItem.dateIso + imamInquiries
 * 3. Asaka MANUAL_ADMIN prayer schedule parsing & preservation
 * 4. Complete 114-surah Qur'an catalog integrity & Odiljon qori honest readiness model
 * 5. Push notification event deduplication (ring buffer)
 */
class AsakaV6UnitTests {

    @Test
    fun testNewUzbekLatinStrictTransliteration() {
        assertEquals("Özbekiston", toNewUzbekLatin("Oʻzbekiston"))
        assertEquals("ğazal", toNewUzbekLatin("gʻazal"))
        assertEquals("Şahar va çiroy", toNewUzbekLatin("Shahar va chiroy"))
        assertEquals("Qöşiq va oğir", toNewUzbekLatin("Qoʻshiq va ogʻir"))
    }

    @Test
    fun testAllFiveLocalesResolveWithoutBlankStrings() {
        assertEquals(5, AsakaLocale.entries.size)
        AsakaLocale.entries.forEach { locale ->
            val s = resolveAsakaStrings(locale)
            assertEquals(locale, s.locale)
            assertTrue(s.appTitle.isNotBlank())
            assertTrue(s.navHome.isNotBlank())
            assertTrue(s.navQuran.isNotBlank())
            assertTrue(s.prayerTimes.isNotBlank())
            assertTrue(s.developerAttribution.contains("Ulug"))
        }
    }

    @Test
    fun testCentralDatabaseDataEnvelopeUnwrapping() {
        val raw = JSONObject().apply {
            put("success", true)
            put("data", JSONObject().apply {
                put("articles", JSONArray().apply {
                    put(JSONObject().apply {
                        put("id", "art_1")
                        put("title", "Namoz fazilati")
                        put("category", "Fiqh")
                        put("content", "Namoz dinning ustunidir.")
                    })
                })
                put("hadiths", JSONArray().apply {
                    put(JSONObject().apply {
                        put("id", "had_1")
                        put("title", "Niyat hadisi")
                        put("text", "Amallar niyatlarga bogʻliqdir.")
                        put("source", "Imom Buxoriy")
                    })
                })
                put("news", JSONArray().apply {
                    put(JSONObject().apply {
                        put("id", "news_1")
                        put("title", "Asaka Ziyo yangiligi")
                        put("content", "Yangi darslar qoʻshildi.")
                    })
                })
                put("updatedAt", "2026-11-25T12:00:00Z")
            })
        }.toString()

        val parsed = AsakaEcosystemApiClient.parseCentralDatabaseJson(raw)
        assertEquals(1, parsed.articles.size)
        assertEquals("Namoz fazilati", parsed.articles[0].title)
        assertEquals(1, parsed.dynamicHadiths.size)
        assertEquals("Imom Buxoriy", parsed.dynamicHadiths[0].source)
        assertEquals(1, parsed.news.size)
        assertEquals("2026-11-25T12:00:00Z", parsed.updatedAt)
    }

    @Test
    fun testAsakaManualAdminPrayerSchedulePreserved() {
        val liveJson = JSONObject().apply {
            put("success", true)
            put("record", JSONObject().apply {
                put("cityId", "uz-andijan-asaka")
                put("cityName", "Asaka")
                put("regionName", "Andijon")
                put("sourceMode", "MANUAL_ADMIN")
                put("localDate", "2026-11-25")
                put("hijriDate", "1448-yil")
                put("fajr", "05:52")
                put("sunrise", "07:14")
                put("dhuhr", "12:15")
                put("asr", "15:10")
                put("maghrib", "17:02")
                put("isha", "18:24")
                put("tahajjud", "04:15")
            })
        }

        val parsed = AsakaApiClient.parsePrayerScheduleJson(liveJson, "uz-andijan-asaka")
        assertEquals("uz-andijan-asaka", parsed.cityId)
        assertEquals("Asaka", parsed.cityName)
        assertEquals("MANUAL_ADMIN", parsed.sourceMode)
        assertEquals("05:52", parsed.fajr)
        assertEquals("12:15", parsed.dhuhr)
        assertEquals("18:24", parsed.isha)
        assertEquals("04:15", parsed.tahajjud)
    }

    @Test
    fun testQuran114SurahCatalogIntegrity() {
        val surahs = AsakaCatalogData.allSurahs
        assertEquals(114, surahs.size)
        assertEquals(1, surahs.first().number)
        assertEquals(7, surahs.first().ayahCount)
        assertEquals(114, surahs.last().number)
        assertEquals(6, surahs.last().ayahCount)
        assertTrue(surahs.all { it.nameUz.isNotBlank() && it.nameAr.isNotBlank() && it.ayahCount > 0 })
    }

    @Test
    fun testFcmNotificationDeduplicationRingBuffer() {
        val (firstAccept, csv1) = AsakaNotificationDeduplicator.shouldAcceptAndRecord("", "evt_1001")
        assertTrue(firstAccept)
        val (dupAccept, csv2) = AsakaNotificationDeduplicator.shouldAcceptAndRecord(csv1, "evt_1001")
        assertFalse(dupAccept)
        assertEquals(csv1, csv2)
        val (secondAccept, csv3) = AsakaNotificationDeduplicator.shouldAcceptAndRecord(csv2, "evt_1002")
        assertTrue(secondAccept)
        assertTrue(csv3.contains("evt_1001") && csv3.contains("evt_1002"))
    }

    @Test
    fun testV7DailyWisdomDateIsoAndOdiljonQoriReadinessModel() {
        val raw = JSONObject().apply {
            put("success", true)
            put("data", JSONObject().apply {
                put("dailyContent", JSONObject().apply {
                    put("dateIso", "2026-11-27")
                    put("ayah", JSONObject().apply {
                        put("arabic", "بِسْمِ اللَّهِ")
                        put("translation", "Mehribon va rahmli Alloh nomi bilan")
                    })
                })
                put("imamQuestions", JSONArray().apply {
                    put(JSONObject().apply {
                        put("id", "inq_1")
                        put("authorName", "Foydalanuvchi")
                        put("question", "Tahajjud namozi vaqti qachon?")
                        put("status", "pending")
                    })
                })
            })
        }.toString()

        val parsed = AsakaEcosystemApiClient.parseCentralDatabaseJson(raw)
        assertEquals("2026-11-27", parsed.dailyWisdom?.dateIso)
        assertEquals(1, parsed.imamInquiries.size)

        val odiljonPartial = QariProfile(
            id = "odiljon_qori",
            nameUz = "Odiljon qori",
            nameAr = "عادل جان قاري",
            countryUz = "Oʻzbekiston",
            styleUz = "Murattal",
            bioUz = "Doimiy 114 sura audio katalogi",
            publishedSurahsCount = 0,
            isCompleteReady = false,
            missingSurahsCount = 114,
            isProtectedPermanent = true
        )
        assertFalse(odiljonPartial.isCompleteReady)
        assertEquals(114, odiljonPartial.missingSurahsCount)
        assertTrue(odiljonPartial.isProtectedPermanent)
    }
}
