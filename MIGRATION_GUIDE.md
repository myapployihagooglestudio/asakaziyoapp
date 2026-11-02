# ASAKA ZIYO — Portativlik va Migratsiya Qoʻllanmasi (Migration Guide)

Ushbu qoʻllanma **ASAKA ZIYO** loyihasini Google AI Studio muhitidan **GitHub** omboriga eksport qilish, **Bolt.new**, **Vercel**, **Netlify** yoki **Cloudflare Pages** kabi istalgan zamonaviy platformalarga koʻchirish va ishlab chiqarish (production) serverlarida ishga tushirish jarayonini yoritadi.

---

## 1. Arxitekturaviy Portativlik (Portability Architecture)

ASAKA ZIYO hech qanday yopiq xususiy API yoki platformaga bogʻlanmagan holda **100% ochiq standartlar** asosida qurilgan:

- **Freymvork:** React 19 + TypeScript + Vite 8
- **Stil Tizimi:** Tailwind CSS v4 (`@import "tailwindcss";`)
- **Ikonkalar:** Lucide React (barcha platformalarda mos)
- **Koʻp Tillilik:** i18next + react-i18next
- **Lokal Xotira:** Sandboxed iframe xavfsizligi hisobga olingan holda `window.localStorage` xato tutuvchilari (`try/catch`) bilan himoyalangan.
- **Audio Dvigateli:** Standart Web Audio API va HTML5 Audio (tashqi ogʻir kutubxonalarga bogʻlanmagan).

---

## 2. GitHub Omboriga Joylash

Loyihani GitHub omboriga yuklash:

```bash
# 1. Git omborini ishga tushirish (agar mavjud boʻlmasa)
git init
git add .
git commit -m "feat: ASAKA ZIYO v2.0 - 5-locale multilingual architecture & premium design system"

# 2. Masofaviy omborga ulash
git branch -M main
git remote add origin https://github.com/SIZNING_PROFILINGIZ/asaka-ziyo.git

# 3. Yuklash
git push -u origin main
```

---

## 3. Bolt.new Muhitida Ishga Tushirish

Bolt.new muhitida loyihani ishga tushirish uchun:

1. [bolt.new](https://bolt.new) saytiga oʻting.
2. GitHub omboringiz manzilini kiriting (`https://github.com/USER/asaka-ziyo`) yoki fayllarni toʻgʻridan-toʻgʻri yuklang.
3. Loyiha avtomatik ravishda `package.json` dagi skriptlarni taniydi:
   ```bash
   npm install
   npm run dev
   ```
4. Loyiha darhol port `3000` yoki `5173` da ishga tushadi.

---

## 4. Muhit Oʻzgaruvchilari (Environment Variables)

Loyiha ildizidagi `.env.example` namunasi:

```env
# Server yoki Cloud Run domeni
APP_URL="http://localhost:3000"

# Sunʼiy intellekt xizmatlari (agar kelajakda yoqilsa, server-side proksi orqali)
GEMINI_API_KEY=""

# Doimiy Maʼlumotlar Bazasi (Ixtiyoriy - Phase 2 Supabase / Cloud SQL uchun)
# VITE_SUPABASE_URL="https://your-project.supabase.co"
# VITE_SUPABASE_ANON_KEY="your-anon-key"
```

> **Eslatma:** Frontend kodida hech qanday sirli kalitlar (API Secret, Private Key) saqlanmaydi.

---

## 5. Doimiy Maʼlumotlar Bazasi Integratsiyasi (Backend Readiness)

Loyiha maʼlumotlar modellari (`/src/types/index.ts`) PostgreSQL, Supabase yoki Firebase Firestore bilan toʻgʻridan-toʻgʻri moslashishga toʻliq tayyorlangan:

- `PrayerSchedule` — Maslahatlashgan jadvallar va imom tasdigʻi (`isAdministratorPublished: boolean`, `verifiedAt: string`, `publishedBy: string`).
- `Article`, `NewsItem`, `AnnouncementItem` — `translations` obyekti bilan 5 ta lokal boʻyicha tahririyat holatini (`PUBLISHED`, `TRANSLATED`, `IN_REVIEW`, `DRAFT`) saqlash imkoniyati.
- `AuditLogEntry` — Xavfsizlik harakatlari va roviylarni qayd etuvchi audit jurnali.

---

## 6. Ishlab Chiqarishga Joylash (Production Build)

Loyihani ishlab chiqarish uchun kompilyatsiya qilish:

```bash
# 1. Kutubxonalarni oʻrnatish
npm install

# 2. Kod sintaksisini tekshirish
npm run lint

# 3. Ishlab chiqarish buildini yaratish
npm run build
```

Natijada `/dist` papkasida yuqori tezlikda yuklanuvchi, optimallashgan statik resurslar hosil boʻladi. Ularni **Vercel**, **Netlify**, **Cloudflare Pages**, yoki **AWS S3 + CloudFront** ga bir necha soniyada joylashtirish mumkin.
