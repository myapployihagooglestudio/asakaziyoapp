# ASAKA ZIYO — Arxitektura Hujjati (ARCHITECTURE.md)

Ushbu hujjat **ASAKA ZIYO** platformasining texnik arxitekturasi, maʼlumotlar oqimi, xavfsizlik modeli va kelgusidagi backend integratsiyalarini belgilaydi.

---

## 1. Tizim Dizayni va Qatlamlar

Loyiha qatʼiy qatlamli (layered) arxitekturaga ega:

```
┌────────────────────────────────────────────────────────┐
│                   Foydalanuvchi Qatlami                │
│    (Mobile Web, Desktop Browser, PWA, Capacitor)      │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│                 Taqdimot Qatlami (UI)                  │
│  - Design Tokens (Emerald, Gold, Paper Ivory)          │
│  - Reusable Primitives (Card, Button, Modal, Pattern)  │
│  - Layout Shell (Header [Top Bar Contract], Footer)   │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│               Ilova Mantiqi (Application Logic)        │
│  - Quran Audio Controller (Web Audio / EveryAyah)      │
│  - Prayer Schedule State & Countdown Engine            │
│  - Digital Tasbih Haptic & Sound Engine                │
│  - Favorites & Local Storage Persistence               │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│                Xizmatlar Qatlami (Services)            │
│  - Types & Contracts (`/src/types/index.ts`)           │
│  - Static Verified Repositories (`/src/data/*`)        │
│  - Future Backend Clients (Supabase, Telegram, FCM)    │
└────────────────────────────────────────────────────────┘
```

---

## 2. Dizayn Tizimi Qoidalari (Design Constitution)

1. **Zero-Pill Discipline**:
   - Statik maʼlumotlar (sanalar, ruknlar, roviylar, hisoblar) hech qachon quti yoki rangli tabletka (pill) ichiga olinmaydi.
   - Ular tipografik ajratkichlar (`·`, `/`) bilan toza matn shaklida beriladi.
2. **Top Bar Contract**:
   - Header qatʼiy 3 zonadan iborat:
     - `Zone 1`: Yagona brend nomi (`ASAKA ZIYO` — wordmark).
     - `Zone 2`: 4-5 ta bir qatorli qisqa navigatsiya havolalari.
     - `Zone 3`: 1 ta asosiy harakat tugmasi + yordamchi menyu.
3. **Ranglar Nisbati (60-30-10)**:
   - 60% Neytral zamin (`#071614` quyuq zumrad-tungi fon yoki `#FAF8F5` fil suyagi oqi).
   - 30% Strukturaviy yuzalar (`#0D211E` nozik chegarali kartalar).
   - 10% Oltin urgʻu (`#C5A869` / `#D4AF37` champan-oltin).
4. **Anti-Slop Qoidalari**:
   - Soxta dasturchi izohlari (`// 01_SECTION`) taqiqlangan.
   - Sunʼiy telemetriya satrlari yoki miltillovchi yashil nuqtalar (`animate-pulse`) qoʻllanmaydi.
   - Qalin chap chiziqlar (`border-l-4`) oʻrniga barcha tomondan nozik (hairline) chegaralar ishlatiladi.

---

## 3. Kelajakdagi Backend Mosligi (Phase 2 & 3)

Platforma quyidagi xizmatlar bilan oson integratsiya qilinishi uchun tayyorlangan:

| Xizmat | Maqsadi | Rejalashtirilgan Integratsiya |
|---|---|---|
| **Supabase Auth** | Xavfsiz tizimga kirish (JWT) | Adminlar va jamoat aʼzolari uchun sessiya boshqaruvi |
| **PostgreSQL & RLS** | Maʼlumotlar bazasi | Row Level Security orqali har bir rolga xos huquqlar |
| **Supabase Storage** | Fayllar va audiolar | Juma maʼruzalari MP3 yozuvlari va maqola suratlari |
| **Telegram Bot API** | Bildirishnomalar | `@asaka_ziyo_bot` orqali namoz vaqtlari va eʼlonlar tarqatmasi |
| **Web Push / FCM** | Mobil xabarnomalar | Aholiga namoz kirishi eslatmalari |
| **Capacitor** | Mobil ilova | Android va iOS uchun APK/IPA toʻplamlari |

---

## 4. Xavfsizlik va Avtorizatsiya Modeli (RBAC)

- **SUPER_ADMIN**: Tizimning toʻliq arxitekturasi va maʼlumotlar bazasi boshqaruvi.
- **PRAYER_ADMIN**: Asaka shahri namoz vaqtlari, OʻMI tasdiqlari va taqvim jadvallari.
- **CONTENT_ADMIN**: Maqolalar, hadislar va kutubxona materiallari tahriri.
- **EDITOR**: Qoralamalarni koʻrish va tahrir qilish.
- **NOTIFICATION_ADMIN**: Telegram kanali va Push bildirishnomalarini boshqarish.
- **VIEWER**: Hisobotlar va audit jurnallarini oʻqish.

> **Muhim**: Frontendda rol oʻzgartirish koʻrgazmali simulyatsiya hisoblanadi. Haqiqiy xavfsizlik faqat server tarafida (Server-side validation) taʼminlanadi.

---

## 5. Koʻp Tillilik Arxitekturasi (5-Locale Multilingual Architecture)

Loyiha toʻliq ajratilgan 5 ta lokal va yozuv tizimini qoʻllab-quvvatlaydi:
1. `uz-Latn`: Standart Oʻzbek Lotin yozuvi (asosiy boshqaruv bazasi).
2. `uz-Cyrl`: Oʻzbek Kirill yozuvi.
3. `uz-Latn-new`: Yangi isloh qilingan Oʻzbek alifbosi (`ş`, `ç`, `ö`, `ğ`).
4. `ru`: Rus tili.
5. `en`: Ingliz tili.

### Yangi Oʻzbek Alifbosi Xususiyatlari:
- `toNewUzbekAlphabet` moduli matndagi `sh` → `ş`, `ch` → `ç`, `oʻ` → `ö`, `gʻ` → `ğ` oʻzgarishlarini barcha bosh/kichik harflar va apostrof turlari (ʻ, ', ‘, ’, `, ʹ, ʼ) boʻyicha hisobga oladi.
- Arabcha manbalar (oyat va hadislar), URL, email va HTML teglari konversiyadan himoyalangan (daxlsiz).
- Takroriy konversiya xatosi boʻlmaydi.
- Fallback zanjiri: `requestedLocale` → `uz-Latn-new (auto-transform)` → `uz-Latn (source)`.

