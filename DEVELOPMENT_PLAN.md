# ASAKA ZIYO — Rivojlanish Rejasi (DEVELOPMENT_PLAN.md)

Ushbu reja loyihaning keyingi bosqichlardagi taraqqiyoti va joriy holatini aks ettiradi.

---

## 📌 Phase 1: Poydevor, Dizayn Tizimi va Ilova Qobigʻi (YAKUNLANDI ✅)

- [x] Mustahkam dizayn tizimi (Ziyo Emerald, Champagne Gold, Paper Ivory).
- [x] Ilova qobigʻi va toʻliq navigatsiya tizimi (10 ta boʻlim + Maʼmuriyat konsoli).
- [x] Bosh sahifa (Editorial Home): kunlik oyat, hadis, Asaka namoz vaqtlari, tezkor xizmatlar.
- [x] Qurʼoni Karim qiroati, Shayx Muhammad Sodiq Muhammad Yusuf tarjimalari va audio pleyer.
- [x] Sahihi Buxoriy, Muslim va Navaviy toʻplamlaridan tasdiqlangan hadislar.
- [x] Zikr va duolar (Hisnul Muslim) hamda interaktiv elektron tasbeh (ovoz va tebranish bilan).
- [x] Asaka shahri namoz vaqtlari (countdown, Qibla azimuti 241°, oylik taqvim, maʼmuriyat preview ogohlantirishi).
- [x] Ilmiy maqolalar, yangiliklar va masjid jamoati eʼlonlari.
- [x] Sevimlilar (localStorage) va tizim sozlamalari (Dark/Light mavzu, shrift kattaligi).
- [x] Maʼmuriyat konsoli (RBAC rollari, namoz jadvalini tasdiqlash, Telegram simulyatsiyasi, audit loglari).
- [x] GitHub va Bolt.new uchun toʻliq portativ arxitektura va hujjatlar.

---

## 📌 Phase 1.5: 5 Tilli Lokalizatsiya va Yangi Oʻzbek Alifbosi (YAKUNLANDI ✅)

- [x] 5 ta mustaqil lokal va yozuv tizimi: `uz-Latn`, `uz-Cyrl`, `uz-Latn-new`, `ru`, `en`.
- [x] Yangi Oʻzbek Alifbosi transformatsiya algoritmi (`sh`→`ş`, `ch`→`ç`, `oʻ`→`ö`, `gʻ`→`ğ`).
- [x] Barcha apostrof variantlari (ʻ, ', ‘, ’, `, ʹ, ʼ) va bosh/kichik harflar bilan toʻliq 18/18 unit test qamrovi.
- [x] Arabcha Qurʼon va Hadis matnlari daxlsizligi (100% himoyalangan).
- [x] 14 ta toʻliq namespace lugʻatlari (common, navigation, home, quran, hadith, dhikr, prayer, articles, news, announcements, settings, admin, notifications, errors).
- [x] Har bir boʻlimda (Quran, Hadith, Dhikr, Prayer, Articles, News, Announcements, Favorites, Settings, Admin) toʻliq `useTranslation` va dinamik konversiya integratsiyasi.
- [x] Sozlamalar boʻlimida toʻliq koʻrinishdagi `<LanguageSelector variant="full" />` paneli.
- [x] Maʼmuriyat konsolida yangi alifbo konvertatsiyasi jonli sinov dastgohi va statistikasi.
- [x] `LOCALIZATION_GUIDE.md` va `MIGRATION_GUIDE.md` toʻliq qoʻllanmalari.

---

## 📌 Phase 2: Backend, Autentifikatsiya va PostgreSQL Integratsiyasi (KUTILMOQDA 🔄)

- [ ] **Supabase Loyihasini Ulash**:
  - PostgreSQL maʼlumotlar bazasi sxemasini yaratish (`prayers`, `articles`, `hadiths`, `announcements`, `users`, `audit_logs`).
  - Row Level Security (RLS) qoidalarini joriy etish.
- [ ] **Haqiqiy Autentifikatsiya**:
  - Imom-xatiblar va maʼmurlar uchun xavfsiz Email/Parol va 2FA kirish.
  - Foydalanuvchilar uchun ixtiyoriy profil va sinxronizatsiya.
- [ ] **Supabase Storage**:
  - Maqolalar va audio tilovatlarni bulutda saqlash.

---

## 📌 Phase 3: Haqiqiy Telegram Bot va Push Bildirishnomalari (KUTILMOQDA 🔄)

- [ ] Telegram Bot API orqali rasmiy `@asaka_ziyo_bot` yaratish va webhook sozlash.
- [ ] Namoz vaqtlari avtomatik cron orqali kanalga yuborilishi.
- [ ] Web Push (Service Worker) va mobil FCM bildirishnomalari.

---

## 📌 Phase 4: PWA va Mobil Ilova (Capacitor) (KUTILMOQDA 🔄)

- [ ] Offline rejim uchun Service Worker va Web App Manifest.
- [ ] Capacitor orqali Android va iOS ilovalarini toʻplash.
- [ ] Qurilma kompas sensori orqali jonli Qibla yoʻnalishini koʻrsatish.
