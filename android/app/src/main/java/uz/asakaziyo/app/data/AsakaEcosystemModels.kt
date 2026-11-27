package uz.asakaziyo.app.data

/**
 * ASAKA ZIYO v5.0.0 — Full Web App Parity Ecosystem Models
 * Maps 1:1 to the central Firestore + Express server (`server.ts`) collections:
 * Articles, News, Announcements, Notifications, Media, Adhan Library, Digital Books,
 * Academy Lessons, Scholars, Mosques, Mosque Events, Charity Campaigns, Quiz & Daily Qur'an Quiz,
 * Community Messages, Imam Q&A, Dynamic Hadiths & Dhikrs, Daily Wisdom, Istiqomat Tracker,
 * Admin Home Config, Content Manifest (ETag real-time sync), and Role-Protected Admin Panel.
 */

data class ContentManifestSnapshot(
    val contentVersion: String = "",
    val etag: String = "",
    val generatedAt: String = "",
    val notModified: Boolean = false,
    val counts: Map<String, Int> = emptyMap(),
    val homeConfig: AdminHomeConfig = AdminHomeConfig()
)

data class AdminHomeConfig(
    val bannerTitleUz: String = "",
    val bannerBodyUz: String = "",
    val bannerVisible: Boolean = false,
    val bannerCtaModule: String = "articles",
    val pinnedAnnouncementId: String = "",
    val blockOrder: List<String> = listOf("prayer", "quran", "audio", "hifz", "wisdom", "ai"),
    val updatedAt: String = ""
)

data class ArticleItem(
    val id: String,
    val title: String,
    val category: String = "Maqola",
    val author: String = "Asaka Ziyo",
    val excerpt: String = "",
    val content: String = "",
    val imageUrl: String = "",
    val date: String = "",
    val likesCount: Int = 0,
    val viewsCount: Int = 0,
    val comments: List<ArticleCommentItem> = emptyList()
)

data class ArticleCommentItem(
    val id: String,
    val author: String,
    val text: String,
    val date: String = ""
)

data class NewsItem(
    val id: String,
    val title: String,
    val summary: String = "",
    val content: String = "",
    val category: String = "Yangilik",
    val imageUrl: String = "",
    val date: String = "",
    val isUrgent: Boolean = false
)

data class AnnouncementItem(
    val id: String,
    val title: String,
    val message: String,
    val type: String = "info", // info | warning | event | urgent
    val date: String = "",
    val isActive: Boolean = true
)

data class NotificationItem(
    val id: String,
    val title: String,
    val body: String,
    val category: String = "general",
    val createdAt: String = ""
)

data class MediaPostItem(
    val id: String,
    val title: String,
    val description: String = "",
    val type: String = "audio", // audio | video | podcast
    val url: String = "",
    val thumbnailUrl: String = "",
    val author: String = "Asaka Ziyo",
    val duration: String = "",
    val category: String = "Maʼruza"
)

data class AdhanTrackItem(
    val id: String,
    val title: String,
    val muezzin: String = "",
    val city: String = "",
    val url: String = "",
    val duration: String = ""
)

data class DigitalBookItem(
    val id: String,
    val title: String,
    val author: String = "",
    val category: String = "Kitob",
    val description: String = "",
    val pages: Int = 0,
    val url: String = "",
    val contentPreview: String = ""
)

data class AcademyLessonItem(
    val id: String,
    val title: String,
    val category: String = "Fiqh",
    val instructor: String = "",
    val duration: String = "",
    val summary: String = "",
    val content: String = "",
    val level: String = "Boshlangʻich"
)

data class ScholarItem(
    val id: String,
    val name: String,
    val title: String = "",
    val era: String = "",
    val bio: String = "",
    val famousWorks: List<String> = emptyList()
)

data class MosqueItem(
    val id: String,
    val name: String,
    val address: String = "",
    val imam: String = "",
    val city: String = "Asaka",
    val phone: String = "",
    val latitude: Double = 40.6415,
    val longitude: Double = 72.2387
)

data class MosqueEventItem(
    val id: String,
    val title: String,
    val mosqueName: String = "Asaka Markaziy Masjidi",
    val date: String = "",
    val time: String = "",
    val description: String = "",
    val location: String = ""
)

data class CharityCampaignItem(
    val id: String,
    val title: String,
    val description: String = "",
    val targetAmount: Long = 0L,
    val raisedAmount: Long = 0L,
    val organizer: String = "Asaka Ziyo Xayriya",
    val cardInfo: String = ""
)

data class QuizQuestionItem(
    val id: String,
    val question: String,
    val options: List<String>,
    val correctIndex: Int,
    val explanation: String = "",
    val category: String = "Islomiy bilim"
)

data class DailyQuranQuizItem(
    val dateIso: String,
    val id: String = "",
    val question: String = "",
    val surahRef: String = "",
    val options: List<String> = emptyList(),
    val correctIndex: Int = 0,
    val explanation: String = ""
)

data class CommunityMessageItem(
    val id: String,
    val authorName: String,
    val text: String,
    val createdAt: String = "",
    val role: String = "member"
)

data class ImamInquiryItem(
    val id: String,
    val authorName: String,
    val question: String,
    val answer: String = "",
    val status: String = "pending",
    val createdAt: String = ""
)

data class DynamicHadithItem(
    val id: String,
    val title: String,
    val text: String,
    val arabic: String = "",
    val source: String = "",
    val category: String = "Umumiy"
)

data class DynamicDhikrItem(
    val id: String,
    val title: String,
    val arabic: String = "",
    val transliteration: String = "",
    val translation: String = "",
    val count: Int = 33,
    val category: String = "Kunlik"
)

data class DailyWisdomItem(
    val dateIso: String = "",
    val ayahArabic: String = "",
    val ayahTranslation: String = "",
    val ayahRef: String = "",
    val hadithText: String = "",
    val hadithSource: String = "",
    val duaArabic: String = "",
    val duaTranslation: String = ""
)

data class IstiqomatDay(
    val dateIso: String,
    val fajr: Boolean = false,
    val dhuhr: Boolean = false,
    val asr: Boolean = false,
    val maghrib: Boolean = false,
    val isha: Boolean = false,
    val quranRead: Boolean = false,
    val morningDhikr: Boolean = false,
    val charity: Boolean = false
)

data class CentralDatabaseSnapshot(
    val articles: List<ArticleItem> = emptyList(),
    val news: List<NewsItem> = emptyList(),
    val announcements: List<AnnouncementItem> = emptyList(),
    val notifications: List<NotificationItem> = emptyList(),
    val mediaPosts: List<MediaPostItem> = emptyList(),
    val adhanLibrary: List<AdhanTrackItem> = emptyList(),
    val digitalBooks: List<DigitalBookItem> = emptyList(),
    val academyLessons: List<AcademyLessonItem> = emptyList(),
    val mosqueEvents: List<MosqueEventItem> = emptyList(),
    val charityCampaigns: List<CharityCampaignItem> = emptyList(),
    val quizQuestions: List<QuizQuestionItem> = emptyList(),
    val communityMessages: List<CommunityMessageItem> = emptyList(),
    val imamInquiries: List<ImamInquiryItem> = emptyList(),
    val dynamicHadiths: List<DynamicHadithItem> = emptyList(),
    val dynamicDhikrs: List<DynamicDhikrItem> = emptyList(),
    val dailyWisdom: DailyWisdomItem? = null,
    val updatedAt: String = ""
)

data class AdminSession(
    val isAuthenticated: Boolean = false,
    val token: String = "",
    val username: String = "",
    val email: String = "",
    val role: String = ""
)

data class AdminOrderItem(
    val orderId: String,
    val userId: String,
    val userDisplayName: String,
    val planId: String,
    val finalPriceUzs: Long,
    val receiptReference: String,
    val status: String,
    val platform: String,
    val createdAt: String
)

data class AdminFeatureFlag(
    val key: String,
    val module: String,
    val labelUz: String,
    val access: String, // free | premium
    val isEnabled: Boolean,
    val freeLimit: Int? = null
)
