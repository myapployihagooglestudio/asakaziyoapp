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
