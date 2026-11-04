/**
 * ASAKA ZIYO — Shayx Muhammad Sodiq Muhammad Yusuf (rahimahulloh) Ilmiy Merosi
 * Tafsiri Hilol, Qur'on ma'nolari tarjimasi, va audio tafsir darslari.
 * Rasmiy ma'rifiy manbalar: islom.uz, hilolnashr.uz
 */

export interface TafsirSurahEntry {
  surahNumber: number;
  surahNameUz: string;
  nameAr: string;
  totalAyahs: number;
  revelationType: 'Makkah' | 'Madina';
  tafsirOverview: string;
  keyThemes: string[];
  virtuesUz: string;
  sampleAyahTafsir: {
    ayahNumber: number;
    textAr: string;
    translationUz: string;
    tafsirHilolBody: string[];
  }[];
  audioLessonUrl?: string;
  audioDuration?: string;
  sourceNote: string;
}

export const TAFSIRI_HILOL_ENTRIES: TafsirSurahEntry[] = [
  {
    surahNumber: 1,
    surahNameUz: 'Fotiha',
    nameAr: 'الفَاتِحَة',
    totalAyahs: 7,
    revelationType: 'Makkah',
    tafsirOverview: '«Fotiha» soʻzi «ochuvchi», «boshlovchi» degan maʼnoni anglatadi. Qurʼoni Karim ushbu sura bilan ochilgani uchun shunday nomlangan. Ushbu sura «Ummul Kitob» (Kitobning onasi), «Sabʼul masoniy» (yetti takrorlanuvchi oyat) deb ham ataladi.',
    keyThemes: ['Tavhid va Robbiylik', 'Mehribonlik va Rahmat', 'Qiyomat kuni hukmronligi', 'Ibodat va faqat Allohdan yordam soʻrash', 'Toʻgʻri yoʻl (Sirotul mustaqiym)'],
    virtuesUz: 'Rasululloh ﷺ bu surani «Qurʼondagi eng ulugʻ sura» deb ataganlar. Har bir namozning har rakaatida oʻqilishi farz / vojib hisoblanadi.',
    sampleAyahTafsir: [
      {
        ayahNumber: 1,
        textAr: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
        translationUz: 'Mehribon va rahmli Allohning ismi ila boshlayman.',
        tafsirHilolBody: [
          '«Bismilloh» har bir ezgu va xayrli ishning boshidir. Musulmon kishi har bir amalni Alloh taoloning ismi bilan boshlashi orqali oʻz ojizligini, barcha quvvat va baraka faqat Allohdan ekanligini eʼtirof etadi.',
          '«Ar-Rohman» — bu dunyoda barcha maxluqotlarga: moʻminga ham, kofirga ham neʼmat beruvchi Zot. «Ar-Rohiym» — oxiratda faqat moʻmin bandalariga Oʻz rahmati ila muomala qiluvchi Zotdir.'
        ]
      },
      {
        ayahNumber: 2,
        textAr: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
        translationUz: 'Hamd olamlarning Robbi Allohgadir.',
        tafsirHilolBody: [
          '«Alhamdulillah» — barcha shukr, maqtov va sano yagona Allohga xosdir. «Robb» — barcha borliqni yoʻqdan bor qilib, tarbiyalovchi, unga hayot va rizq beruvchi Zotdir.',
          'Olamlar (al-ʻolamiyn) — insonlar, farishtalar, jinlar, nabotot, hayvonot va biz bilmagan son-sanoqsiz koinot olamlaridir.'
        ]
      },
      {
        ayahNumber: 5,
        textAr: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
        translationUz: 'Faqat Sengagina ibodat qilamiz va faqat Sendangina yordam soʻraymiz!',
        tafsirHilolBody: [
          'Ushbu oyat islom aqidasining magʻzidir. Banda hech bir maxluqqa, boylikka yoki mansabga qul boʻlmay, faqat Parvardigoriga bandalik qilishini va barcha qiyinchiliklarda faqat Allohdan madad kutishini eʼlon qiladi.'
        ]
      }
    ],
    audioLessonUrl: 'https://archive.org/download/TafsirHilolAudio/001_Fotiha_tafsiri.mp3',
    audioDuration: '28 daqiqa',
    sourceNote: '«Tafsiri Hilol», 1-juz, Shayx Muhammad Sodiq Muhammad Yusuf (Hilol Nashr, 2021)',
  },
  {
    surahNumber: 2,
    surahNameUz: 'Baqara',
    nameAr: 'البَقَرَة',
    totalAyahs: 286,
    revelationType: 'Madina',
    tafsirOverview: 'Qurʼoni Karimning eng uzun surasi. Unda eʼtiqod, ibodat, ijtimoiy muomala, roʻza, haj, infoq, qarz oldi-berdisi, oilaviy munosabatlar va jamiyat huquqlarining asosiy qonun-qoidalari bayon etilgan.',
    keyThemes: ['Taqvo egalarining sifatlari', 'Muso (a.s.) va Isroil avlodi qissasi', 'Odam (a.s.)ning yaratilishi', 'Oyatul Kursiy — eng ulugʻ oyat', 'Riboning haromligi va infoq fazilati'],
    virtuesUz: 'Rasululloh ﷺ: «Uylaringizni qabristonga aylantirmanglar. Albatta, Baqara surasi oʻqilgan uyga shayton kirmaydi», deganlar.',
    sampleAyahTafsir: [
      {
        ayahNumber: 255,
        textAr: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ...',
        translationUz: 'Alloh — Undan oʻzga iloh yoʻq, U Tirik va Qayyumdir...',
        tafsirHilolBody: [
          'Oyatul Kursiy Qurʼondagi eng ulugʻ oyat hisoblanadi. Unda Alloh taoloning 10 dan ortiq goʻzal ism va sifatlari jamlangan. Uni tadabbur qilgan inson qalbida Parvardigorning cheksiz qudrati va ilmi oʻrnashadi.'
        ]
      }
    ],
    audioLessonUrl: 'https://archive.org/download/TafsirHilolAudio/002_Baqara_tafsiri_kirish.mp3',
    audioDuration: '45 daqiqa',
    sourceNote: '«Tafsiri Hilol», 1-juz, Shayx Muhammad Sodiq Muhammad Yusuf (Hilol Nashr, 2021)',
  },
  {
    surahNumber: 36,
    surahNameUz: 'Yosin',
    nameAr: 'يس',
    totalAyahs: 83,
    revelationType: 'Makkah',
    tafsirOverview: 'Yosin surasi «Qurʼonning qalbi» deb taʼriflanadi. Unda qayta tirilish, qiyomat xabarlari, koinotdagi ilohiy moʻjizalar va paygʻambarlik haqiqatlari chuqur his-tuygʻular ila ifodalangan.',
    keyThemes: ['Qurʼonning ilohiy vahiy ekani', 'Antokiya shahri elchilari qissasi', 'Tabiatdagi ilohiy belgilar (quyosh va oy harakati)', 'Qayta tirilish va hisob-kitob'],
    virtuesUz: 'Hazrati Paygʻambarimiz ﷺ: «Har bir narsaning qalbi bor, Qurʼonning qalbi Yosindir», deb marhamat qilganlar.',
    sampleAyahTafsir: [
      {
        ayahNumber: 82,
        textAr: 'إِنَّمَا أَمْرُهُ إِذَا أَرَادَ شَيْئًا أَن يَقُولَ لَهُ كُن فَيَكُونُ',
        translationUz: 'Qachon biror narsani iroda qilsa, Uning amri faqatgina: «Boʻl!» demoqlikdir, xolos. Bas, u narsa darhol boʻlur.',
        tafsirHilolBody: [
          'Alloh taolo bir narsani yaratish yoki amalga oshirish uchun hech qanday vositaga, mehnatga muhtoj emas. U zotning xohishi va irodasi koinotdagi barcha qonunlardan ustundir.'
        ]
      }
    ],
    audioLessonUrl: 'https://archive.org/download/TafsirHilolAudio/036_Yosin_tafsiri.mp3',
    audioDuration: '38 daqiqa',
    sourceNote: '«Tafsiri Hilol», 5-juz, Shayx Muhammad Sodiq Muhammad Yusuf (Hilol Nashr, 2021)',
  },
  {
    surahNumber: 67,
    surahNameUz: 'Mulk',
    nameAr: 'المُلْك',
    totalAyahs: 30,
    revelationType: 'Makkah',
    tafsirOverview: '«Taborak» surasi nomi bilan ham mashhur. Unda butun koinot mulki Allohning qoʻlida ekanligi, hayot va oʻlim insonlarni sinash uchun yaratilgani taʼkidlanadi.',
    keyThemes: ['Hayot va oʻlim hikmati', 'Koinotning benuqson yaratilishi', 'Qabr azobidan najot beruvchi sura'],
    virtuesUz: 'Rasululloh ﷺ: «Qurʼonda oʻttiz oyatli bir sura borki, u oʻz oʻquvchisini gunohlari magʻfirat qilingunicha shafoat qiladi. U Taborakallaziy biyadihil mulk surasidir», deganlar.',
    sampleAyahTafsir: [
      {
        ayahNumber: 2,
        textAr: 'الَّذِي خَلَقَ الْمَوْتَ وَالْحَيَاةَ لِيَبْلُوَكُمْ أَيُّكُمْ أَحْسَنُ عَمَلًا',
        translationUz: 'U sizlarning qaysilaringiz amalda yaxshiroq ekaningizni sinash uchun oʻlim va hayotni yaratgan Zotdir.',
        tafsirHilolBody: [
          'Inson bu dunyoga bekorga kelmagan. Hayot ham, oʻlim ham Alloh taolo tomonidan imtihon vositasi qilib berilgan. Asosiy maqsad — kim koʻp emas, balki kim eng goʻzal va ixlosli amal qilishidir.'
        ]
      }
    ],
    audioLessonUrl: 'https://archive.org/download/TafsirHilolAudio/067_Mulk_tafsiri.mp3',
    audioDuration: '32 daqiqa',
    sourceNote: '«Tafsiri Hilol», 6-juz, Shayx Muhammad Sodiq Muhammad Yusuf (Hilol Nashr, 2021)',
  },
  {
    surahNumber: 112,
    surahNameUz: 'Ixlos',
    nameAr: 'الإِخْلَاص',
    totalAyahs: 4,
    revelationType: 'Makkah',
    tafsirOverview: 'Sof tavhid surasi. Alloh taoloning yagonaligi, tengsizligi va hech narsaga muhtoj emasligini eng qisqa va mukammal soʻzlar ila ifoda etadi.',
    keyThemes: ['Tavhid (Yakkaxudolik)', 'As-Somad sifati (Hech kimga muhtoj emas, barcha Unga muhtoj)', 'Tengsizlik va abadiylik'],
    virtuesUz: 'Rasululloh ﷺ: «Ixlos surasi Qurʼonning uchdan biriga tengdir», deb marhamat qilganlar.',
    sampleAyahTafsir: [
      {
        ayahNumber: 1,
        textAr: 'قُلْ هُوَ اللَّهُ أَحَدٌ',
        translationUz: 'Ayt: «U Alloh Yagonadir».',
        tafsirHilolBody: [
          'Bu soʻz shirkning har qanday koʻrinishini rad etadi. Alloh zotida ham, sifatlarida ham, feʼllarida ham sheriksiz yagonadir.'
        ]
      }
    ],
    audioLessonUrl: 'https://archive.org/download/TafsirHilolAudio/112_Ixlos_tafsiri.mp3',
    audioDuration: '18 daqiqa',
    sourceNote: '«Tafsiri Hilol», 6-juz, Shayx Muhammad Sodiq Muhammad Yusuf (Hilol Nashr, 2021)',
  }
];

export function getTafsirEntryForSurah(surahNumber: number): TafsirSurahEntry | undefined {
  return TAFSIRI_HILOL_ENTRIES.find((entry) => entry.surahNumber === surahNumber);
}

export function searchTafsirHilol(query: string): TafsirSurahEntry[] {
  if (!query.trim()) return TAFSIRI_HILOL_ENTRIES;
  const q = query.toLowerCase();
  return TAFSIRI_HILOL_ENTRIES.filter(
    (e) =>
      e.surahNameUz.toLowerCase().includes(q) ||
      e.tafsirOverview.toLowerCase().includes(q) ||
      e.keyThemes.some((theme) => theme.toLowerCase().includes(q))
  );
}
