# ASAKA ZIYO — Muhit Oʻzgaruvchilari (ENVIRONMENT_VARIABLES.md)

Ushbu hujjat loyihada kelgusida ishlatiladigan muhit oʻzgaruvchilari (Environment Variables) roʻyxati va ularning vazifasini tushuntiradi.

> **Xavfsizlik eslatmasi**: Ushbu faylda hech qachon maxfiy kalitlar (secrets) saqlanmaydi. Haqiqiy kalitlar faqat server muhitida yoki `.env.local` faylida saqlanadi va Gitga yuklanmaydi.

---

## 🔑 Rejalashtirilgan Oʻzgaruvchilar

### 1. Supabase (Backend & Auth)
- `VITE_SUPABASE_URL`: Supabase loyihasining API manzili (masalan: `https://xyzcompany.supabase.co`).
- `VITE_SUPABASE_ANON_KEY`: Brauzer orqali ruxsat etilgan ochiq anonim kalit (Row Level Security bilan himoyalangan).
- `SUPABASE_SERVICE_ROLE_KEY`: Faqat server tomonida (Edge Functions) ishlatiladigan toʻliq boshqaruv kaliti (hech qachon brauzerga chiqarilmaydi).

### 2. Telegram Bot Integratsiyasi
- `TELEGRAM_BOT_TOKEN`: `@BotFather` tomonidan taqdim etilgan bot tokeni (masalan: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`).
- `TELEGRAM_CHANNEL_ID`: Asaka jome masjidi rasmiy kanali identifikatori (masalan: `@asaka_ziyo_rasmiy` yoki `-1001234567890`).

### 3. Umumiy Ilova Sozlamalari
- `APP_URL`: Ilovaning rasmiy domen manzili.
- `VITE_PRAYER_API_ENDPOINT`: Namoz vaqtlari OʻMI bazasidan avtomatik olinadigan API manzili (ixtiyoriy).
