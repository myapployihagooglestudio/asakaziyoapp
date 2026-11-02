# ASAKA ZIYO — Premium Islamic Digital Ecosystem

**ASAKA ZIYO** — Asaka shahri (Andijon viloyati) va butun Fargʻona vodiysi ahli uchun moʻljallangan xalqaro darajadagi zamonaviy, ishonchli va yuqori sifatli islomiy raqamli platforma.

---

## 🌟 Mahsulot Viziyasi va Xususiyatlari

Platforma oddiy veb-sayt yoki shablon emas, balki qatʼiy dizayn tizimi va mustahkam arxitekturaga ega boʻlgan raqamli ekotizimdir.

1. **Bosh Sahifa (Editorial Home)**:
   - Shahar lokatsiyasi: *Asaka shahri, Andijon viloyati*.
   - Sana: Oʻzbekcha milodiy va hijriy sana hisobi (Toshkent vaqti: `Asia/Tashkent`).
   - Kunlik oyat va roviysi tasdiqlangan kun hadisi.
   - Tezkor maʼrifiy xizmatlar va jamoat eʼlonlari.
2. **Qurʼoni Karim (Tilovat va Tafsir)**:
   - Asl arabiy matn va xattotlik ligaturalari (`Amiri` mumtoz qiroat shrifti).
   - Shayx Muhammad Sodiq Muhammad Yusuf rahmatullohi alayh maʼnolari tarjimasi va transliteratsiyasi.
   - Sura va oyatlar boʻyicha qidiruv, audio tilovat tinglash (Shayx Mishariy al-Afosiy, Shayx Husariy, Shayx Abdulbosit).
3. **Hadislar Toʻplami (Sunnat)**:
   - Sahihi Buxoriy, Sahihi Muslim, Imom Navaviyning «Arbaʼin» (40 hadis) toʻplamlari.
   - Asl arabiy matni, isnodi, roviysi, sahihlik darajasi (Sahih / Hasan) va mavzular boʻyicha filtrlash.
4. **Zikr va Duolar (Hisnul Muslim)**:
   - Tonggi va kechki zikrlar, namozdan keyingi tasbehlar, Sayyidul Istigʻfor.
   - **Interaktiv Elektron Tasbeh**: 33 va 99 martalik hisoblagich, akustik chertish tovushi (Web Audio API), tebranish (haptic feedback), taraqqiyot aylanasi.
5. **Asaka Namoz Vaqtlari**:
   - Asaka koordinatalari: `40.6415° N, 72.2387° E`.
   - Qibla azimuti: **241°** (Gʻarb-Janubi-Gʻarb).
   - Keyingi namozga qolgan vaqt sanogʻi (countdown timer).
   - Kunlik besh vaqt namoz, quyosh chiqishi va jamoat iqomat vaqtlari.
   - Oylik taqvim namunasi.
   - **Qatʼiy Fiqhiy Talab**: Namoz vaqtlari tasdiqlanmaguncha "Koʻrgazmali qoralama (preview)" maqomida boʻladi. Rasmiy tasdiq faqat vakolatli maʼmurlar tomonidan amalga oshiriladi.
6. **Ilmiy Maqolalar (Editorial Journal)**:
   - Aqoid, fiqh, axloq, oila va Movarounnahr allomalari merosi.
   - Matbaa sifatidagi bosh harf (drop cap) va iqtiboslar bilan toʻliq mutolaa oynasi.
7. **Yangiliklar va Jamoat Eʼlonlari**:
   - Asaka markaziy jome masjidi hayoti, juma suhbatlari, tajvid kurslari va xayriya tashabbuslari.
8. **Sevimlilar va Shaxsiy Toʻplam**:
   - Foydalanuvchi tanlagan oyat, hadis, duo va maqolalarni qurilmada xotirlab qolish (`localStorage`).
9. **Sozlamalar va Moslashuvchanlik**:
   - Tizim mavzusi (Dark Emerald / Light Ivory).
   - Arabcha matn oʻlchamini moslash (Standart, Katta, Juda katta).
   - Qiroat qorisini tanlash, ovoz va vibratsiyani yoqish/oʻchirish.
10. **Maʼmuriyat Konsoli (Admin Portal)**:
    - 6 ta rejalashtirilgan rol: `SUPER_ADMIN`, `CONTENT_ADMIN`, `PRAYER_ADMIN`, `EDITOR`, `NOTIFICATION_ADMIN`, `VIEWER`.
    - Namoz jadvali tahririyati va rasmiy tasdiqlash statusi.
    - RBAC huquqlar matritsasi va xavfsizlik audit jurnali.
    - Telegram bot xabarnomalar simulyatsiyasi (`@asaka_ziyo_bot`).

---

## 🛠 Texnologik Stek

- **Asosiy Fraymvork**: React 19 + TypeScript (qatʼiy tiplar).
- **Yigʻuvchi**: Vite 8.
- **Stillar**: Tailwind CSS v4 (`@import "tailwindcss";`, `@custom-variant dark`).
- **Ikonkalar**: Lucide React.
- **Tipografiya**:
  - `Cinzel` & `Cormorant Garamond` — Muhtasham sarlavhalar va tahririyat matnlari.
  - `Plus Jakarta Sans` — Zamonaviy, toza interfeys matnlari.
  - `Amiri` — Mumtoz arabiy xattotlik va Qurʼon ligaturalari.
  - `JetBrains Mono` — Tabular raqamlar va vaqt koʻrsatkichlari.

---

## 🚀 Oʻrnatish va Ishga Tushirish

```bash
# Bogʻliqliklarni oʻrnatish
npm install

# Dasturchi serverini ishga tushirish (port 3000)
npm run dev

# Ishlab chiqarish uchun yigʻish
npm run build

# TypeScript xatolarini tekshirish
npm run lint
```

---

## 🌐 Portativlik (GitHub & Bolt.new)

Loyiha Google AI Studio sandboksidan tashqari toʻliq mustaqil ishlaydigan standart web arxitekturasida tuzilgan. Loyihani GitHub orqali Bolt.new yoki har qanday zamonaviy bulut serveriga (Cloud Run, Vercel, Netlify) toʻgʻridan-toʻgʻri import qilish mumkin.
