# ASAKA ZIYO — Koʻp Tillilik va Lokalizatsiya Qoʻllanmasi (Localization Guide)

Ushbu hujjat **ASAKA ZIYO** platformasining koʻp tillilik arxitekturasi, 5 ta rasmiy lokal va yozuv tizimi, yangi oʻzbek alifbosiga oʻgirish algoritmi va kontentni tarjima qilish qoidalarini belgilaydi.

---

## 1. Qoʻllab-quvvatlanadigan 5 Ta Lokal va Yozuv Tizimi

Asaka Ziyo platformasida quyidagi 5 ta tanlanuvchi lokal toʻliq ajratilgan holda ishlaydi:

| Lokal Kodi | Koʻrinadigan Nomi | Yozuv Tizimi | Manba / Holat |
|------------|-------------------|--------------|---------------|
| `uz-Latn` | **O‘zbekcha (Lotin)** | Standart Lotin yozuvi | Asosiy boshqaruv manbasi (100% qamrov) |
| `uz-Cyrl` | **Ўзбекча (Кирилл)** | Oʻzbek Kirill yozuvi | Toʻliq statik lugʻatlar va kontent |
| `uz-Latn-new`| **Özbekcha (Yangi alifbo)** | Yangi isloh qilingan alifbo (`ş`, `ç`, `ö`, `ğ`) | Dinamik avtomatik konvertatsiya + bevosita tarjima |
| `ru` | **Русский** | Rus tili (Кириллица) | Xalqaro foydalanuvchilar va viloyat jamoati |
| `en` | **English** | Ingliz tili (Latin) | Xalqaro auditoriya va xorijiy mehmonlar |

> **Muhim Qoida:** Standart oʻzbek lotin yozuvi (`uz-Latn`) yangi alifbo (`uz-Latn-new`) bilan aslo aralashtirilmaydi. Til tanlash panelida har ikkalasi alohida mustaqil variant sifatida koʻrsatiladi.

---

## 2. Yangi Oʻzbek Alifbosi Qoidalari va Algoritmi

Yangi alifboga oʻtkazish `/src/utils/newUzbekAlphabet.ts` moduli orqali amalga oshiriladi.

### 2.1 Belgilar Xaritasi (Character Mappings)

| Standart Lotin | Yangi Alifbo | Misol (Standart) | Misol (Yangi) |
|----------------|--------------|------------------|---------------|
| `sh` / `Sh` / `SH` | `ş` / `Ş` / `Ş` | shahar / Shoshilinch | şahar / Şoşilinç |
| `ch` / `Ch` / `CH` | `ç` / `Ç` / `Ç` | chiroyli / Chashma | çiroyli / Çaşma |
| `oʻ` / `Oʻ` | `ö` / `Ö` | oʻzbekiston / Oʻquvchi | özbekiston / Öquvçi |
| `gʻ` / `Gʻ` | `ğ` / `Ğ` | gʻalaba / Gʻafur | ğalaba / Ğafur |

### 2.2 Apostrof Variantlarini Qamrab Olish
Oʻzbek tilidagi yozuvlarda `oʻ` va `gʻ` harflari uchun turli xil apostrof va modifikator belgilar uchraydi. Algoritm ularning barchasini toʻliq taniy oladi:
- `ʻ` (U+02BB - Modifier Letter Turned Comma)
- `'` (U+0027 - Apostrophe)
- `‘` (U+2018 - Left Single Quotation Mark)
- `’` (U+2019 - Right Single Quotation Mark)
- `` ` `` (U+0060 - Grave Accent)
- `ʹ` (U+02B9 - Modifier Letter Prime)
- `ʼ` (U+02BC - Modifier Letter Apostrophe)

### 2.3 Daxlsizlik Qoidalari (Untouchable Text)
Quyidagi matn turlari hech qachon yangi alifboga oʻgirilmaydi va asl holatida saqlanadi:
1. **Muqaddas Arabcha Matnlar:** Qurʼoni Karim oyatlari, hadisi shariflar va zikrlarning arabcha matnlari (`[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]`).
2. **URL manzillari va Emaillar:** `https://...`, `http://...`, `user@example.com`.
3. **HTML teglar va atributlar:** `<span class="...">...</span>`.
4. **Kod identifikatorlari va raqamlar.**
5. **Takroriy konversiya (Double transformation):** Allaqachon `ş`, `ç`, `ö`, `ğ` belgilariga ega matn qayta ishlanmaydi.

---

## 3. Fayllar Tuzilishi va Leksikonlar

Lokalizatsiya manbalari `/src/locales/` papkasida 14 ta namespace boʻyicha taqsimlangan:

```text
/src/
  ├── i18n.ts                     # i18next boshlangʻich sozlamasi
  ├── locales/
  │   ├── uz-Latn/index.ts        # Standart oʻzbek lotin lugʻati
  │   ├── uz-Cyrl/index.ts        # Oʻzbek kirill lugʻati
  │   ├── ru/index.ts             # Rus tili lugʻati
  │   └── en/index.ts             # Ingliz tili lugʻati
  └── utils/
      ├── newUzbekAlphabet.ts     # Yangi alifbo konvertori
      ├── newUzbekAlphabet.test.ts # 18 ta qatʼiy test toʻplami
      └── localizedContent.ts     # Dinamik fallback zanjiri
```

### 14 Ta Standart Namespace:
1. `common` — Tugmalar, yuklash holatlari, umumiy harakatlar.
2. `navigation` — Bosh menyu, mobil panel, boʻlimlar sarlavhalari.
3. `home` — Bosh sahifa bloki, tabriklar, tezkor tugmalar.
4. `quran` — Suralar, qorilar, oyatlar, tafsir va tilovat.
5. `hadith` — Toʻplamlar, isnod, roviylar, sahih darajalari.
6. `dhikr` — Sanagich, toifalar, fazilatlar, ovoz/vibratsiya.
7. `prayer` — Namoz nomlari, jamoat vaqtlari, taqvim, Qibla.
8. `articles` — Ilmiy maqolalar, mualliflar, oʻqish vaqti.
9. `news` — Masjid yangiliklari, viloyat xabarlari.
10. `announcements` — Jamoat tadbirlari, juma maʼruzalari.
11. `settings` — Mavzu, shrift, til va konfiguratsiya.
12. `admin` — Maʼmuriyat konsoli, rollar, audit.
13. `notifications` — Bildirishnomalar va eslatmalar.
14. `errors` — Xatolar va kutilmagan holatlar.

---

## 4. Dinamik Kontent Fallback Zanjiri (Content Resolution)

Tahririyat maqolalari, yangiliklar va oyatlar uchun `/src/utils/localizedContent.ts` quyidagi zanjir boʻyicha ishlaydi:

1. **Toʻgʻridan-toʻgʻri Tarjima:** Agar `item.translations[locale]` mavjud boʻlsa, u taqdim etiladi.
2. **Yangi Alifbo Avto-generatsiyasi:** Agar soʻralgan til `uz-Latn-new` boʻlsa va `uz-Latn` matni mavjud boʻlsa, u `toNewUzbekAlphabet()` orqali oʻgirilib qaytariladi.
3. **Birlamchi Fallback:** Agar tarjima yoʻq boʻlsa, standart `uz-Latn` matni taqdim etiladi (hech qachon boʻsh qolmaydi).

---

## 5. Komponentlarda Ishlatish Qoʻllanmasi

### Statik interfeys matnlari uchun:
```tsx
import { useTranslation } from 'react-i18next';

export const MyComponent = () => {
  const { t } = useTranslation();
  return <h1>{t('prayer:bomdod')}</h1>;
};
```

### Dinamik tahririyat kontenti uchun:
```tsx
import { useTranslation } from 'react-i18next';
import { getLocalizedField } from '../utils/localizedContent';
import { SupportedLocale } from '../types';

export const ArticleCard = ({ article }) => {
  const { i18n } = useTranslation();
  const currentLocale = (i18n.language as SupportedLocale) || 'uz-Latn';
  
  const title = getLocalizedField(article, 'title', currentLocale);
  return <h3>{title}</h3>;
};
```
