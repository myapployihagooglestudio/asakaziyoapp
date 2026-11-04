# ASAKA ZIYO — Muhit Oʻzgaruvchilari (ENVIRONMENT_VARIABLES.md)

## 📌 Muhim Tamoyil: 100% Ixtiyoriylik va Maxfiylik Kafolati

Ushbu loyihada **hech qanday majburiy Environment Variable yoki Secret Value yoʻq**. Ilova barcha muhitlarda (shu jumladan AI Studio, Docker, Vercel yoki mahalliy kompyuterda) tashqi kalitlarsiz toʻliq, mustaqil va mustahkam ishlaydi:
- Hech qanday soxta API kaliti yaratilmagan.
- `SUPABASE_SERVICE_ROLE_KEY` hech qachon brauzer (frontend) kodiga kiritilmaydi va faqat server tarafida ixtiyoriy ravishda ishlatilishi mumkin.
- Agar Supabase yoki tashqi API ulanmagan boʻlsa, ilova avtomatik tarzda markaziy JSON bazasi (`/data/asaka_ziyo_db.json`) hamda brauzer `localStorage` / `BroadcastChannel` orqali toʻliq avtonom rejimda ishlaydi. Barcha oʻzgarishlar (8 namoz vaqti, maqolalar, Reels, hadislar, zikrlar, savollar, bildirishnomalar) sahifa yangilanganda ham saqlanadi.

---

## 🔑 Ixtiyoriy Oʻzgaruvchilar Roʻyxati

### 1. Telegram Integratsiyasi (Ixtiyoriy)
- `TELEGRAM_BOT_TOKEN`: Telegram bot tokeni (masalan, `@BotFather` orqali olinadi). Agar kiritilmasa, admin panelidagi xabarlar simulyatsiya qilinadi va qoralama sifatida saqlanadi.
- `TELEGRAM_CHANNEL_ID`: Rasmiy kanal identifikatori:
  - `@Asaka_Ziyo` (`https://t.me/Asaka_Ziyo`)
  - `@muhiddinsahhofuz` (`https://t.me/muhiddinsahhofuz`)

### 2. Supabase (Ixtiyoriy Bulutli Baza)
- `VITE_SUPABASE_URL`: Supabase loyihasining URL manzili (masalan: `https://xyzcompany.supabase.co`).
- `VITE_SUPABASE_ANON_KEY`: Brauzer orqali ruxsat etilgan anonim kalit (RLS bilan himoyalangan).
- `SUPABASE_SERVICE_ROLE_KEY`: **XAVFSIZLIK**: Faqat backend/serverda xavfsiz muhitda ishlatilishi mumkin boʻlgan kalit. Hech qachon frontendga chiqarilmaydi.

### 3. Namoz Vaqtlari API (Ixtiyoriy)
- `VITE_PRAYER_API_ENDPOINT`: Tashqi API manzili. Agar kiritilmasa, Oʻzbekiston musulmonlari idorasi standartlari va Asaka shahri aniq astronomik koordinatalari boʻyicha hisob-kitob qilinadi.

### 4. Server Sozlamalari
- `PORT`: Server porti (sukut boʻyicha `3000`).
- `NODE_ENV`: Ishga tushirish muhiti (`development` yoki `production`).
