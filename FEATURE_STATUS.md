# ASAKA ZIYO — Feature Status & Project Audit (FEATURE_STATUS.md)

Audit Date: 2026-11-02
Version: Phase 1.5 — Multilingual Architecture & Ecosystem Foundation

This document provides a comprehensive audit of all modules, components, and integrations in ASAKA ZIYO.

---

## 1. Feature Audit Matrix

| Module / Feature | Status | Notes & Verification |
|---|---|---|
| **Dizayn Tizimi (Design System)** | ✅ Complete and tested | Zero-pill discipline, 60-30-10 color balance, luxury emerald/gold theme, dark/light mode with `@custom-variant dark`. |
| **Top Bar & Navigation Shell** | ✅ Complete and tested | Conforms strictly to Top Bar Contract (Wordmark, single-line nav links, action trigger, responsive mobile drawer). |
| **Bosh Sahifa (Editorial Home)** | ✅ Complete and tested | Asaka location, Tashkent time, Hijri date, next prayer countdown, daily ayah, daily hadith, quick shortcuts. |
| **Qurʼoni Karim (Quran Module)** | ✅ Complete and tested | Arabic text with Amiri ligatures, Shayx Muhammad Sodiq Muhammad Yusuf translation, multi-reciter audio streaming (EveryAyah CDN), search, bookmarks, copy. |
| **Hadislar Toʻplami (Hadith Module)**| ✅ Complete and tested | Sahihi Buxoriy, Muslim, Navaviy 40 hadis. Arabic text, isnod, grading (Sahih/Hasan), keywords, search, bookmarks. |
| **Zikr va Duolar (Dhikr Module)** | ✅ Complete and tested | Tonggi, kechki, namozdan keyingi zikrlar, Sayyidul Istigʻfor. Interaktiv tasbeh, Web Audio sintezlangan chertish ovozi, haptic tebranish. |
| **Asaka Namoz Vaqtlari** | ✅ Complete and tested | Asaka koordinatalari (40.6415° N, 72.2387° E), 241° Qibla azimuti kompas koʻrsatkichi, kunlik va oylik taqvim, maʼmuriyat preview ogohlantirishi. |
| **Ilmiy Maqolalar (Articles)** | ✅ Complete and tested | Tahririy jurnal tartibi, ruknlar (Aqoid, Fiqh, Axloq, Tarix), drop cap ochilishi, iqtiboslar, toʻliq oʻqish modali. |
| **Diniy Yangiliklar (News)** | ✅ Complete and tested | Asaka jome masjidi va vodiy yangiliklari, manbasi, modalli toʻliq koʻrinish. |
| **Jamoat Eʼlonlari (Announcements)**| ✅ Complete and tested | Juma suhbatlari, tajvid kurslari, hashar tadbirlari, manzil va aloqa maʼlumotlari. |
| **Sevimlilar (Favorites Collection)** | ✅ Complete and tested | localStorage orqali saqlash, oʻchirish, tozalash va toʻgʻridan-toʻgʻri oʻsha boʻlimga oʻtish. |
| **Foydalanuvchi Sozlamalari (Settings)**| ✅ Complete and tested | Til tanlash (5 ta yozuv varianti), qorongʻi/yorugʻ mavzu, arabcha shrift oʻlchami, qori tanlovi, audio va tebranish sozlamalari. |
| **5 Tillik / Yozuvli Arxitektura (i18n)**| ✅ Complete and tested | uz-Latn, uz-Cyrl, uz-Latn-new, ru, en. Yangi oʻzbek alifbosi transliteratsiya dvigateli va 18 ta unit testlar bilan qoplangan. |
| **Maʼmuriyat Konsoli (Admin Portal)** | 🟡 Interface only (Design ready)| 6 ta rol (SuperAdmin, ContentAdmin, PrayerAdmin, Editor, NotificationAdmin, Viewer), namoz taqvimi tahririyati, audit jurnali, Telegram simulyatori. Backend bogʻlanishi Phase 2 ga rejalashtirilgan. |
| **Supabase Auth & Database (PostgreSQL)**| ⏳ Blocked by missing backend | Phase 2 da ulanadi. Hozirda barcha maʼlumotlar modellari va interfeyslari tayyor. |
| **Telegram Bot API Jonli Xabar** | 🟡 Interface only (Simulation) | Phase 2 da `@asaka_ziyo_bot` tokeni va Webhook ulanadi. |
| **Web Push / FCM Bildirishnomalari** | ⏳ Blocked by missing backend | Service Worker va Push server talab etiladi (Phase 3). |
| **Mobil Ilova (Capacitor)** | ⏳ Not implemented (Phase 4) | Veb platforma toʻliq tayyor boʻlgach, Capacitor orqali APK/IPA toʻplanadi. |

---

## 2. Aniqlangan Kamchiliklar va Kiritilgan Tuzatishlar (Audit & Fixes)

1. **Til tanlash imkoniyati cheklangan edi**:
   - Dastlab faqat oʻzbek tili matnlari mavjud edi. Endi 5 ta toʻliq tanlanuvchi yozuv/til tizimi joriy qilindi:
     * O‘zbekcha (Lotin) — `uz-Latn`
     * Ўзбекча (Кирилл) — `uz-Cyrl`
     * Özbekcha (Yangi alifbo) — `uz-Latn-new`
     * Русский — `ru`
     * English — `en`
2. **Yangi Oʻzbek Alifbosi maxsus qoidalari kiritildi**:
   - `sh -> ş`, `ch -> ç`, `oʻ -> ö`, `gʻ -> ğ` harflari barcha registrlarda va tutuq belgisi turlarida xatosiz almashtiriladi.
   - Qurʼon arabiy matnlari, havolalar, elektron pochtalar va texnik kodlar mutlaqo tegilmaydi.
3. **Komponentlardagi qattiq yozilgan matnlar ajratildi**:
   - Barcha foydalanuvchi interfeysi matnlari i18n kalitlariga oʻtkazildi.
