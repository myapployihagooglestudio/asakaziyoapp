# ASAKA ZIYO — Google Play Console Release & Store Package Guide

- **Package Name (`applicationId`)**: `uz.asakaziyo.app`
- **Version Name / Code**: `3.0.0` / `300`
- **Target / Compile SDK**: Android 16 (API 36) · **Min SDK**: Android 7.0 (API 24)
- **Support Contact**: `asakaziyo0@gmail.com`
- **Public Legal URLs (served by Express backend)**:
  - Privacy Policy: `https://<YOUR-DOMAIN>/privacy`
  - Account & Data Deletion: `https://<YOUR-DOMAIN>/delete-account`

---

## 1. Store Listing Texts (Factual, Policy-Compliant)

### App Name (Max 30 chars)
`ASAKA ZIYO`

### Oʻzbekcha (uz)
- **Short Description (Max 80 chars)**:
  `Asaka «MuhammadSolih Hoji» masjidi namoz vaqtlari, Qurʼon, hadis va viktorina.` *(80 chars)*
- **Full Description**:
  `ASAKA ZIYO — Oʻzbekiston Musulmonlari Idorasi, Andijon viloyati Asaka tumani «MuhammadSolih Hoji» jomeʼ masjidi rasmiy maʼrifiy ilovasi.

Asosiy imkoniyatlar:
• Asaka shahri uchun 8 mahal aniq namoz vaqtlari va azon eslatmalari (Asia/Tashkent, UTC+5)
• Qibla kompasi va yoʻnalish koʻrsatkichi (Asaka uchun 241° WSW)
• Qurʼoni Karim 114 surasi, oʻzbekcha maʼnolar tarjimasi va qorilar tilovati
• Kunlik Qurʼon audio viktorinasi va 9:16 vertikal MP4 video eksporti
• Sahih hadislar toʻplami, tonggi-kechki zikrlar va elektron tasbeh
• Hijriy taqvim, Roʻza yordamchisi va Qurʼon xatmi rejalashtiruvchisi
• Masjid yangiliklari, juma eʼlonlari va imomga savol yuborish boʻlimi
• Internet uzilganda ham saqlangan kesh asosida oflayn ishlash imkoniyati`

### Русский (ru)
- **Short Description (Max 80 chars)**:
  `Время намаза в Асаке, Коран, хадисы, зикры и викторина мечети.` *(63 chars)*
- **Full Description**:
  `ASAKA ZIYO — официальное просветительское приложение соборной мечети «МухаммадСолих Ходжи» (г. Асака, Андижанская область).

Основные возможности:
• Точное расписание намаза для Асаки (UTC+5) и настраиваемые напоминания об азане
• Определение направления Киблы (241° WSW для г. Асака)
• 114 сур Священного Корана, переводы смыслов и аудио-чтение чтецов
• Ежедневная аудио-викторина по Корану с экспортом видео в формате MP4
• Сборники достоверных хадисов, утренние и вечерние зикры, электронный тасбих
• Календарь хиджры, планировщик хатма Корана, новости и объявления мечети
• Поддержка офлайн-доступа к сохранённым материалам и расписанию`

### English (en)
- **Short Description (Max 80 chars)**:
  `Asaka mosque prayer times, Quran, hadiths, dhikr, Qibla & audio quiz.` *(69 chars)*
- **Full Description**:
  `ASAKA ZIYO is the official educational and community companion of the "MuhammadSolih Hoji" Jome Mosque (Asaka, Andijan Region, Uzbekistan).

Key Features:
• Accurate prayer times schedule for Asaka (Asia/Tashkent, UTC+5) with customizable prayer and Adhan reminders
• Qibla compass and direction verification (241° WSW for Asaka)
• Complete 114 Surahs of the Holy Quran with Uzbek translations and audio recitations
• Daily Quran Audio Quiz with 9:16 vertical MP4 video export
• Curated Hadith collections, morning/evening Dhikr, digital Tasbih counter, and Hijri calendar
• Mosque news, announcements, and community Q&A with moderation controls
• Offline cache support for saved prayer times, Quran text, hadiths, and dhikr`

---

## 2. Graphic Assets Ready in `store-assets/`
- **App Icon (512 × 512 PNG)**: `store-assets/play-store-icon-512x512.png`
- **Feature Graphic (1024 × 500 PNG)**: `store-assets/feature-graphic-1024x500.png`
- **Adaptive Launcher Icons**: `android/app/src/main/res/mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/ic_launcher*.png`
- **Phone / Tablet / TV Screenshots**: Capture real device/emulator screenshots (`1080×1920` phone, `1920×1080` Smart TV display) after running the release APK/AAB on an Android device or Android Studio Emulator.

---

## 3. Google Play Data Safety Form Answers

- **Does your app collect or share any required user data types?**: **Yes** (Optional account data & user-generated inquiries/comments).
- **Is all user data collected by your app encrypted in transit?**: **Yes** (HTTPS/TLS enforced via `network_security_config.xml` and `MIXED_CONTENT_NEVER_ALLOW`).
- **Do you provide a way for users to request that their data is deleted?**: **Yes** (In-app "Profil -> Akkauntni Butunlay Oʻchirish" + public URL `https://<YOUR-DOMAIN>/delete-account`).
- **Does your app sell user data or contain third-party ads?**: **No** (Zero AdMob/third-party advertising SDKs).
- **Data Types Collected (Optional / User-Initiated)**:
  1. **Personal info → Name & Email address**: Collected only if the user voluntarily signs up/logs in via Firebase Auth (`Google` or `Email/Password`) or submits an inquiry/comment. Purpose: *App functionality & Account management*. Not shared for ads.
  2. **Location → Approximate & Precise location**: Collected ephemerally **on-demand and foreground-only** when the user taps location/Qibla check. Not stored on servers or collected in background.
  3. **Photos / Audio / Files**: System Photo Picker / Scoped MediaStore used only when user selects a profile image, records a voice query (`RECORD_AUDIO`), or saves an exported MP4 quiz video. Broad `READ_MEDIA_IMAGES` / `READ_MEDIA_VIDEO` permissions are **not** declared.
  4. **App activity & Device tokens**: Optional FCM push token and saved prayer/habit preferences.

---

## 4. Permissions Declaration & Justification (`AndroidManifest.xml`)

| Manifest Permission | Purpose in ASAKA ZIYO | Play Store Policy Compliance |
|---|---|---|
| `INTERNET`, `ACCESS_NETWORK_STATE` | Sync prayer times, mosque news, Quran recitations, and Firebase Auth | Standard |
| `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`, `RECEIVE_BOOT_COMPLETED`, `VIBRATE` | Exact prayer & Adhan reminders and mosque announcements (`AsakaPrayerAlarmReceiver` + `AsakaBootReceiver`) | Core scheduling feature; requested on demand |
| `CAMERA` | Optional profile photo capture when initiated by user | Requested on demand only |
| `RECORD_AUDIO` | Voice search & voice inquiry recording when tapped by user | Requested on demand only |
| `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION` | Foreground prayer times verification & Qibla compass | Foreground only; zero background location |
| `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `WAKE_LOCK`, `READ_MEDIA_AUDIO` | Background Quran tilovat & Adhan audio playback (`Media3` / `MediaSession`) | Required for continuous Quran audio playback |
| *Removed*: `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_MEDIA_VISUAL_USER_SELECTED`, `READ_PHONE_STATE` | Replaced by Android System Photo Picker (`onShowFileChooser`), Scoped MediaStore, and safe `ACTION_DIAL` intent | Complies with Google Play Photo & Video Permissions policy |

---

## 5. Content Rating, Target Audience & Copyright Audit

- **Target Audience**: Ages **13+** / General audience (not marketed specifically as a Children's app under Families Policy).
- **Content Rating (IARC)**: Educational / Religious Reference (`3+` / `Everyone`), with user-generated comments in Articles protected by:
  - In-app **Report ("Shikoyat qilish")** button wired to `POST /api/ugc/report` (`ugcReports` collection)
  - In-app **Block User ("Bloklash")** button hiding comments from blocked authors immediately
  - Comment length & spam-link filter
- **Copyright & Attribution**:
  - **Quranic Arabic Text**: Standard Uthmani text (accurate, unedited).
  - **Uzbek Translation / Tafsir**: Attributed to Shayx Muhammad Sodiq Muhammad Yusuf («Tafsiri Hilol» / Hilol Nashr). Ensure formal written distribution permission is retained if required by rightsholder before wide commercial distribution.
  - **Quran Audio Streams**: Standard EveryAyah / public reciter CDNs and administrator-uploaded official mosque recitations.
  - **Brand Identity & Logos**: Official «MuhammadSolih Hoji» Jomeʼ Mosque and `@Asaka_Ziyo` brand assets supplied by the project owner.

---

## 6. App Access Instructions for Google Play Reviewers

- **Guest Access**: All core features (Prayer Times, Quran, Hadith, Dhikr, Qibla, Hijri Calendar, Daily Quiz, Smart TV display, Mosque News & Announcements) work immediately **without logging in**.
- **User Account Testing**: Reviewers may test Firebase Email/Password registration or Google Sign-In directly on the `Profil` screen, and test full in-app deletion via `Akkauntni Butunlay Oʻchirish`.
- **Admin Console Testing**: If Play Reviewers request Admin Console credentials during review, create a temporary dedicated reviewer credential via server environment configuration (`ADMIN_USERNAME` / `ADMIN_PASSWORD`) in Play Console "App access" — **never commit real credentials to Git or source code**.

---

## 7. Building the Signed `.aab` Bundle for Play Console

*Note: This sandbox container does not have JDK 17 or Android SDK installed, so `.aab` compilation must run via the configured GitHub Actions workflow (`.github/workflows/android-release.yml`) or on a local machine with Android Studio / JDK 17 + Android SDK 36.*

### Step A — Generate Upload Keystore (Run Locally Once, Keep Private!)
```bash
keytool -genkey -v -keystore asaka-ziyo-upload.jks \
  -alias asaka-ziyo \
  -keyalg RSA -keysize 2048 -validity 10000
```
Store the `.jks` file safely outside Git (`.gitignore` already excludes `*.jks`, `*.keystore`, and `keystore.properties`).

### Step B — Build Web Bundle & Android `.aab` Locally
```bash
npm ci
npm run build
rm -rf android/app/src/main/assets/public
mkdir -p android/app/src/main/assets/public
cp -r dist/* android/app/src/main/assets/public/
cd android
gradle bundleRelease --no-daemon
```
Output bundle path: `android/app/build/outputs/bundle/release/app-release.aab`

### Step C — Or Build via GitHub Actions CI
Add the following repository secrets in GitHub Settings → Secrets and variables → Actions:
- `ANDROID_KEYSTORE_BASE64` (`base64 -w0 asaka-ziyo-upload.jks`)
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS` (`asaka-ziyo`)
- `ANDROID_KEY_PASSWORD`
- `VITE_API_BASE_URL` (your deployed production HTTPS backend origin, e.g. `https://api.asakaziyo.uz`)

Trigger the **ASAKA ZIYO Android Release Bundle (.aab)** workflow to download the signed `app-release.aab` artifact and upload it to Google Play Console (**Internal Testing → Closed Testing → Production**).
