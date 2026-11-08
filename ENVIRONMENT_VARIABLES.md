# ASAKA ZIYO — Muhit Oʻzgaruvchilari (ENVIRONMENT_VARIABLES.md)

## 📌 Muhim Tamoyil: 100% Ixtiyoriylik va Maxfiylik Kafolati

Ushbu loyihada **hech qanday majburiy Environment Variable yoki Secret Value yoʻq**. Ilova barcha muhitlarda (shu jumladan AI Studio, Docker, Vercel yoki mahalliy kompyuterda) tashqi kalitlarsiz toʻliq, mustaqil va mustahkam ishlaydi:
- Hech qanday soxta API kaliti yaratilmagan.
- `SUPABASE_SERVICE_ROLE_KEY` hech qachon brauzer (frontend) kodiga kiritilmaydi va faqat server tarafida ixtiyoriy ravishda ishlatilishi mumkin.
- Agar Supabase yoki tashqi API ulanmagan boʻlsa, ilova avtomatik tarzda markaziy JSON bazasi (`/data/asaka_ziyo_db.json`) hamda brauzer `localStorage` / `BroadcastChannel` orqali toʻliq avtonom rejimda ishlaydi. Barcha oʻzgarishlar (8 namoz vaqti, maqolalar, Reels, hadislar, zikrlar, savollar, bildirishnomalar) sahifa yangilanganda ham saqlanadi.

---

## 🔑 Ixtiyoriy Oʻzgaruvchilar Roʻyxati

### 1. Google Cloud Firebase & Firestore (`basic-petal-001dl`)
- **Asosiy Maʼlumotlar Bazasi**: `ai-studio-asakaziyoapp-1ea697da-bde1-4c61-a495-c8b1e8c8ca94` (`firebase-applet-config.json` va `firebase.json` orqali ulangan).
- `FIREBASE_SERVICE_ACCOUNT_KEY` (Ixtiyoriy, faqat serverda): JSON formatidagi yoki Base64 kodlangan Firebase Admin Service Account kaliti. Agar kiritilsa, `server.ts` `firebase-admin` SDK orqali ishlaydi; kiritilmasa, `server.ts` `/data/.android_signing_key.pem` kriptografik imzosi bilan himoyalangan **Server-Gate Atomic Batch** orqali toʻgʻridan-toʻgʻri `ai-studio-asakaziyoapp-1ea697da-bde1-4c61-a495-c8b1e8c8ca94` bazasiga xavfsiz yozadi. Hech qachon frontend kodiga chiqarilmaydi.

### 2. Administrator Autentifikatsiyasi (Server-Side Session)
- `ADMIN_SESSION_SECRET`: HMAC-SHA256 sessiya imzolash kaliti (kiritilmasa avtomatik generatsiya qilinadi).
- `ADMIN_INITIAL_USERNAME`: `menageradmin`
- `ADMIN_INITIAL_PASSWORD`: `menageradmin1`

### 3. Telegram Integratsiyasi (Ixtiyoriy)
- `TELEGRAM_BOT_TOKEN`: Telegram bot tokeni (masalan, `@BotFather` orqali olinadi). Agar kiritilmasa, admin panelidagi xabarlar simulyatsiya qilinadi va qoralama sifatida saqlanadi.
- `TELEGRAM_CHANNEL_ID`: Rasmiy kanal identifikatori:
  - `@Asaka_Ziyo` (`https://t.me/Asaka_Ziyo`)
  - `@muhiddinsahhofuz` (`https://t.me/muhiddinsahhofuz`)

### 4. Supabase (Ixtiyoriy Ikkilamchi Bulutli Zaxira)
- `SUPABASE_URL` / `VITE_SUPABASE_URL`: Supabase loyihasining URL manzili (masalan: `https://xyzcompany.supabase.co`).
- `VITE_SUPABASE_ANON_KEY`: Brauzer orqali ruxsat etilgan anonim kalit (RLS bilan himoyalangan).
- `SUPABASE_SERVICE_ROLE_KEY`: **XAVFSIZLIK**: Faqat backend/serverda (`server.ts`) haqiqiy Firestore maʼlumotlarini ikkilamchi zaxiralash va qayta oʻqib tekshirish (`read-back verification`) uchun ishlatiladi. Hech qachon frontendga chiqarilmaydi.

### 5. Namoz Vaqtlari API (Ixtiyoriy)
- `VITE_PRAYER_API_ENDPOINT`: Tashqi API manzili. Agar kiritilmasa, Oʻzbekiston musulmonlari idorasi standartlari va Asaka shahri aniq astronomik koordinatalari boʻyicha hisob-kitob qilinadi.

### 6. Server Sozlamalari
- `PORT`: Server porti (sukut boʻyicha `3000`).
- `NODE_ENV`: Ishga tushirish muhiti (`development` yoki `production`).
