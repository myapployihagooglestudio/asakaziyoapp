/**
 * ASAKA ZIYO — Unified Super App Domain Datasets
 * Grounded Islamic Education (At-Tartil & Al Quran), Scholars & Literature (Hasanayn),
 * and Mosque Directory (Muftiy.uz) baseline data synchronized with Firestore primary storage.
 */

export interface ArabicLetterItem {
  id: string;
  order: number;
  letter: string;
  nameUz: string;
  translit: string;
  isolated: string;
  initial: string;
  medial: string;
  final: string;
  makhrajZone: 'Halq (Tomoq)' | 'Lison (Til)' | 'Shafatan (Lab)' | 'Javf (Boʻshliq)' | 'Xayshum (Dimogʻ)';
  makhrajDetailUz: string;
  exampleAr: string;
  exampleUz: string;
}

export interface TajweedRuleItem {
  id: string;
  titleUz: string;
  titleAr: string;
  colorHex: string;
  colorLabelUz: string;
  summaryUz: string;
  lettersAr: string;
  exampleAr: string;
  exampleRef: string;
  practiceTipUz: string;
}

export interface MuallimiSoniyLesson {
  id: string;
  level: number;
  titleUz: string;
  subtitleUz: string;
  durationMin: number;
  objectivesUz: string[];
  drillItems: { ar: string; read: string; note: string }[];
  isKidsFriendly?: boolean;
}

export interface AcademyQuizQuestion {
  id: string;
  topic: 'alifbo' | 'maxraj' | 'tajvid' | 'muallimi_soniy';
  questionUz: string;
  options: string[];
  correctIndex: number;
  explanationUz: string;
}

export interface ScholarProfile {
  id: string;
  name: string;
  honorific: string;
  field: 'Tafsir va Fiqh' | 'Qurʼon va Tajvid' | 'Hadis va Sunnat' | 'Maʼnaviyat va Adabiyot';
  region: string;
  years?: string;
  shortBioUz: string;
  biographyParagraphsUz: string[];
  notableWorks: string[];
  quotesUz: string[];
  poemsUz?: { title: string; lines: string[] }[];
  avatarFallbackInitials: string;
  imageUrl?: string;
  relatedTab?: 'quran' | 'library' | 'articles' | 'media_center';
}

export interface MosqueDirectoryItem {
  id: string;
  name: string;
  district: string;
  region: string;
  address: string;
  imamName: string;
  jumaTime: string;
  lat: number;
  lng: number;
  qiblaDeg: number;
  capacity?: number;
  facilities: string[];
  descriptionUz: string;
  isPrimary?: boolean;
  phone?: string;
}

export const ARABIC_ALPHABET: ArabicLetterItem[] = [
  { id: 'alif', order: 1, letter: 'ا', nameUz: 'Alif', translit: 'a / ā', isolated: 'ا', initial: 'ا', medial: 'ـا', final: 'ـا', makhrajZone: 'Javf (Boʻshliq)', makhrajDetailUz: 'Ogʻiz va tomoq boʻshligʻidan choʻzib talaffuz qilinadi.', exampleAr: 'أَحَدٌ', exampleUz: 'Ahadun (Yagona)' },
  { id: 'ba', order: 2, letter: 'ب', nameUz: 'Ba', translit: 'b', isolated: 'ب', initial: 'بـ', medial: 'ـبـ', final: 'ـب', makhrajZone: 'Shafatan (Lab)', makhrajDetailUz: 'Ikki labning ichki nam qismini bir-biriga tekkizish bilan chiqadi.', exampleAr: 'بِسْمِ', exampleUz: 'Bismi (Nomi bilan)' },
  { id: 'ta', order: 3, letter: 'ت', nameUz: 'Ta', translit: 't', isolated: 'ت', initial: 'تـ', medial: 'ـتـ', final: 'ـت', makhrajZone: 'Lison (Til)', makhrajDetailUz: 'Til uchi yuqori old tishlarning ildiz qismiga tegadi.', exampleAr: 'تَوْبَةٌ', exampleUz: 'Tavbatun (Tavba)' },
  { id: 'tha', order: 4, letter: 'ث', nameUz: 'Sa (peltek)', translit: 'th', isolated: 'ث', initial: 'ثـ', medial: 'ـثـ', final: 'ـث', makhrajZone: 'Lison (Til)', makhrajDetailUz: 'Til uchini yuqori old tishlarning chetiga yumshoq tekkizib chiqariladi.', exampleAr: 'ثَوَابٌ', exampleUz: 'Savobun (Savob)' },
  { id: 'jim', order: 5, letter: 'ج', nameUz: 'Jim', translit: 'j', isolated: 'ج', initial: 'جـ', medial: 'ـجـ', final: 'ـج', makhrajZone: 'Lison (Til)', makhrajDetailUz: 'Tilning oʻrta qismi yuqori tanglayning oʻrtasiga koʻtariladi.', exampleAr: 'جَنَّةٌ', exampleUz: 'Jannatun (Jannat)' },
  { id: 'ha_sharp', order: 6, letter: 'ح', nameUz: 'Ha (halqiy)', translit: 'ḥ', isolated: 'ح', initial: 'حـ', medial: 'ـحـ', final: 'ـح', makhrajZone: 'Halq (Tomoq)', makhrajDetailUz: 'Tomoqning oʻrta qismidan sof, havo oqimli holda chiqadi.', exampleAr: 'حَمْدٌ', exampleUz: 'Hamdun (Hamd)' },
  { id: 'kha', order: 7, letter: 'خ', nameUz: 'Xo', translit: 'kh', isolated: 'خ', initial: 'خـ', medial: 'ـخـ', final: 'ـخ', makhrajZone: 'Halq (Tomoq)', makhrajDetailUz: 'Tomoqning eng yuqori qismidan yoʻgʻon talaffuz qilinadi.', exampleAr: 'خَيْرٌ', exampleUz: 'Xoyrun (Yaxshilik)' },
  { id: 'dal', order: 8, letter: 'د', nameUz: 'Dal', translit: 'd', isolated: 'د', initial: 'د', medial: 'ـد', final: 'ـد', makhrajZone: 'Lison (Til)', makhrajDetailUz: 'Til uchi yuqori old tishlarning ildiziga tegadi; sukunli holatda qalqala boʻladi.', exampleAr: 'دِينٌ', exampleUz: 'Diynun (Din)' },
  { id: 'dhal', order: 9, letter: 'ذ', nameUz: 'Zal', translit: 'dh', isolated: 'ذ', initial: 'ذ', medial: 'ـذ', final: 'ـذ', makhrajZone: 'Lison (Til)', makhrajDetailUz: 'Til uchi yuqori old tishlar qirrasiga yumshoq tegadi.', exampleAr: 'ذِكْرٌ', exampleUz: 'Zikrun (Zikr)' },
  { id: 'ra', order: 10, letter: 'ر', nameUz: 'Ro', translit: 'r', isolated: 'ر', initial: 'ر', medial: 'ـر', final: 'ـر', makhrajZone: 'Lison (Til)', makhrajDetailUz: 'Til uchi va ustki qismi yuqori tish milkiga yaqinlashib titraydi.', exampleAr: 'رَحْمَةٌ', exampleUz: 'Rohmatun (Rahmat)' },
  { id: 'zay', order: 11, letter: 'ز', nameUz: 'Zay', translit: 'z', isolated: 'ز', initial: 'ز', medial: 'ـز', final: 'ـز', makhrajZone: 'Lison (Til)', makhrajDetailUz: 'Til uchi pastki old tishlarning ichki yuzasiga yaqinlashadi.', exampleAr: 'زَكَاةٌ', exampleUz: 'Zakatun (Zakot)' },
  { id: 'sin', order: 12, letter: 'س', nameUz: 'Sin', translit: 's', isolated: 'س', initial: 'سـ', medial: 'ـسـ', final: 'ـس', makhrajZone: 'Lison (Til)', makhrajDetailUz: 'Til uchi pastki tishlar ortida turib, ingichka hushtakli tovush beradi.', exampleAr: 'سَلَامٌ', exampleUz: 'Salamun (Salom)' },
  { id: 'shin', order: 13, letter: 'ش', nameUz: 'Shin', translit: 'sh', isolated: 'ش', initial: 'شـ', medial: 'ـشـ', final: 'ـش', makhrajZone: 'Lison (Til)', makhrajDetailUz: 'Til oʻrtasi yuqori tanglayga yaqinlashib, havo ogʻiz boʻylab yoyiladi.', exampleAr: 'شُكْرٌ', exampleUz: 'Shukrun (Shukr)' },
  { id: 'sad', order: 14, letter: 'ص', nameUz: 'Sod', translit: 'ṣ', isolated: 'ص', initial: 'صـ', medial: 'ـصـ', final: 'ـص', makhrajZone: 'Lison (Til)', makhrajDetailUz: 'Til orqasi koʻtarilib, yoʻgʻon va toʻliq (istilo) holda talaffuz qilinadi.', exampleAr: 'صَلَاةٌ', exampleUz: 'Solatun (Namoz)' },
  { id: 'dad', order: 15, letter: 'ض', nameUz: 'Dod', translit: 'ḍ', isolated: 'ض', initial: 'ضـ', medial: 'ـضـ', final: 'ـض', makhrajZone: 'Lison (Til)', makhrajDetailUz: 'Tilning bir yoki ikki yon cheti yuqori oziq tishlarga tegadi.', exampleAr: 'ضُحَى', exampleUz: 'Duha (Choshgoh)' },
  { id: 'ta_emph', order: 16, letter: 'ط', nameUz: 'To', translit: 'ṭ', isolated: 'ط', initial: 'طـ', medial: 'ـطـ', final: 'ـط', makhrajZone: 'Lison (Til)', makhrajDetailUz: 'Til uchi yuqori tish ildiziga tegib, til orqasi yuqoriga koʻtariladi.', exampleAr: 'طَيِّبٌ', exampleUz: 'Toyyibun (Pokiza)' },
  { id: 'za_emph', order: 17, letter: 'ظ', nameUz: 'Zo', translit: 'ẓ', isolated: 'ظ', initial: 'ظـ', medial: 'ـظـ', final: 'ـظ', makhrajZone: 'Lison (Til)', makhrajDetailUz: 'Til uchi yuqori tish chetiga tegib, til orqasi yoʻgʻon koʻtariladi.', exampleAr: 'ظِلٌّ', exampleUz: 'Zillun (Soya)' },
  { id: 'ayn', order: 18, letter: 'ع', nameUz: 'Ayn', translit: '‘', isolated: 'ع', initial: 'عـ', medial: 'ـعـ', final: 'ـع', makhrajZone: 'Halq (Tomoq)', makhrajDetailUz: 'Tomoqning oʻrta qismidan chuqur va ravon chiqadi.', exampleAr: 'عِلْمٌ', exampleUz: 'Ilmun (Ilm)' },
  { id: 'ghayn', order: 19, letter: 'غ', nameUz: 'Gʻayn', translit: 'gh', isolated: 'غ', initial: 'غـ', medial: 'ـغـ', final: 'ـغ', makhrajZone: 'Halq (Tomoq)', makhrajDetailUz: 'Tomoqning yuqori qismidan oʻzbekcha «gʻ» ga yaqin, yumshoq chiqadi.', exampleAr: 'غَفُورٌ', exampleUz: 'Gʻofurun (Magʻfiratli)' },
  { id: 'fa', order: 20, letter: 'ف', nameUz: 'Fa', translit: 'f', isolated: 'ف', initial: 'فـ', medial: 'ـفـ', final: 'ـف', makhrajZone: 'Shafatan (Lab)', makhrajDetailUz: 'Yuqori old tishlarning cheti pastki labning ichki qismiga tegadi.', exampleAr: 'فَجْرٌ', exampleUz: 'Fajrun (Tong)' },
  { id: 'qaf', order: 21, letter: 'ق', nameUz: 'Qof', translit: 'q', isolated: 'ق', initial: 'قـ', medial: 'ـقـ', final: 'ـق', makhrajZone: 'Lison (Til)', makhrajDetailUz: 'Tilning eng orqa qismi yumshoq tanglayga tegib, yoʻgʻon chiqadi.', exampleAr: 'قُرْآنٌ', exampleUz: 'Qurʼanun (Qurʼon)' },
  { id: 'kaf', order: 22, letter: 'ك', nameUz: 'Kaf', translit: 'k', isolated: 'ك', initial: 'كـ', medial: 'ـكـ', final: 'ـك', makhrajZone: 'Lison (Til)', makhrajDetailUz: 'Til orqasi Qof maxrajidan biroz oldinroqda qattiq tanglayga tegadi.', exampleAr: 'كِتَابٌ', exampleUz: 'Kitabun (Kitob)' },
  { id: 'lam', order: 23, letter: 'ل', nameUz: 'Lam', translit: 'l', isolated: 'ل', initial: 'لـ', medial: 'ـلـ', final: 'ـل', makhrajZone: 'Lison (Til)', makhrajDetailUz: 'Tilning oldingi chetlari yuqori tish milkiga tegadi.', exampleAr: 'لَيْلٌ', exampleUz: 'Laylun (Kecha)' },
  { id: 'mim', order: 24, letter: 'م', nameUz: 'Mim', translit: 'm', isolated: 'م', initial: 'مـ', medial: 'ـمـ', final: 'ـم', makhrajZone: 'Xayshum (Dimogʻ)', makhrajDetailUz: 'Ikki lab yopiladi va dimogʻdan gʻunna tovushi chiqadi.', exampleAr: 'مَسْجِدٌ', exampleUz: 'Masjidun (Masjid)' },
  { id: 'nun', order: 25, letter: 'ن', nameUz: 'Nun', translit: 'n', isolated: 'ن', initial: 'نـ', medial: 'ـنـ', final: 'ـن', makhrajZone: 'Xayshum (Dimogʻ)', makhrajDetailUz: 'Til uchi yuqori tish milkiga tegadi va dimogʻdan gʻunna qoʻshiladi.', exampleAr: 'نُورٌ', exampleUz: 'Nurun (Nur)' },
  { id: 'ha_soft', order: 26, letter: 'ه', nameUz: 'Ha (yumshoq)', translit: 'h', isolated: 'ه', initial: 'هـ', medial: 'ـهـ', final: 'ـه', makhrajZone: 'Halq (Tomoq)', makhrajDetailUz: 'Tomoqning eng pastki qismidan yumshoq nafas bilan chiqadi.', exampleAr: 'هُدًى', exampleUz: 'Hudan (Hidoyat)' },
  { id: 'waw', order: 27, letter: 'و', nameUz: 'Vov', translit: 'w / ū', isolated: 'و', initial: 'و', medial: 'ـو', final: 'ـو', makhrajZone: 'Shafatan (Lab)', makhrajDetailUz: 'Ikki lab doira shaklida oldinga choʻziladi.', exampleAr: 'وَحْيٌ', exampleUz: 'Vahyun (Vahiy)' },
  { id: 'ya', order: 28, letter: 'ي', nameUz: 'Ya', translit: 'y / ī', isolated: 'ي', initial: 'يـ', medial: 'ـيـ', final: 'ـي', makhrajZone: 'Lison (Til)', makhrajDetailUz: 'Til oʻrtasi yuqori tanglayga koʻtarilib, choʻziq holatda Javfdan chiqadi.', exampleAr: 'يَقِينٌ', exampleUz: 'Yaqinun (Ishonch)' },
];

export const TAJWEED_COLOR_RULES: TajweedRuleItem[] = [
  {
    id: 'ghunnah',
    titleUz: 'Gʻunna (Dimogʻ tovushi)',
    titleAr: 'الغُنَّة',
    colorHex: '#10B981',
    colorLabelUz: 'Zumrad yashil',
    summaryUz: 'Tashdidli «نّ» (Nun) va «مّ» (Mim) harflarida ovozni dimogʻda 2 harakat (1 alif) miqdorida ushlab turish.',
    lettersAr: 'نّ  مّ',
    exampleAr: 'إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ',
    exampleRef: 'Kavsar surasi, 1-oyat',
    practiceTipUz: 'Lablar va til oʻz maxrajida turib, tovush dimogʻ orqali mayin choʻziladi.',
  },
  {
    id: 'ikhfa',
    titleUz: 'Ixfo (Yashirib oʻqish)',
    titleAr: 'الإِخْفَاء',
    colorHex: '#D97706',
    colorLabelUz: 'Oltin qahrabo',
    summaryUz: 'Sukunli nun (نْ) yoki tanvindan keyin 15 ta ixfo harfi kelsa, nun izhor va idgʻom oʻrtasida gʻunna bilan yashiriladi.',
    lettersAr: 'ت ث ج د ذ ز س ش ص ض ط ظ ف ق ك',
    exampleAr: 'مِنْ شَرِّ مَا خَلَقَ',
    exampleRef: 'Falaq surasi, 2-oyat',
    practiceTipUz: 'Til uchi yuqori milkka toʻliq tegmasdan, keyingi harf maxrajiga tayyorlanadi.',
  },
  {
    id: 'idgham',
    titleUz: 'Idgʻom (Kirgizib oʻqish)',
    titleAr: 'الإِدْغَام',
    colorHex: '#2563EB',
    colorLabelUz: 'Koʻk lojuvard',
    summaryUz: 'Sukunli nun yoki tanvindan soʻng «ي ر م ل و ن» (Yarmalun) harflaridan biri kelsa, ikki harf birlashib oʻqiladi.',
    lettersAr: 'ي ر م ل و ن',
    exampleAr: 'فَمَنْ يَعْمَلْ مِثْقَالَ ذَرَّةٍ خَيْرًا يَرَهُ',
    exampleRef: 'Zalzala surasi, 7-oyat',
    practiceTipUz: '«ي ن م و» bilan gʻunnali, «ل ر» harflarida esa gʻunnasiz toʻliq kirgiziladi.',
  },
  {
    id: 'qalqalah',
    titleUz: 'Qalqala (Tebratib oʻqish)',
    titleAr: 'القَلْقَلَة',
    colorHex: '#DC2626',
    colorLabelUz: 'Yoqut qizil',
    summaryUz: '«ق ط ب ج د» (Qutbu Jaddin) harflari sukunli kelganda maxrajidan yengil aks-sado bilan ajratib oʻqiladi.',
    lettersAr: 'ق ط ب ج د',
    exampleAr: 'قُلْ هُوَ اللَّهُ أَحَدٌ',
    exampleRef: 'Ixlos surasi, 1-oyat',
    practiceTipUz: 'Oyat oxirida toʻxtaganda (vaqf) qalqala aniqroq eshitiladi (Qalqalai kubro).',
  },
  {
    id: 'iqlab',
    titleUz: 'Iqlob (Mim harfiga aylantirish)',
    titleAr: 'الإِقْلَاب',
    colorHex: '#7C3AED',
    colorLabelUz: 'Binafsha',
    summaryUz: 'Sukunli nun yoki tanvindan keyin «ب» (Ba) harfi kelsa, nun harfi gʻunnali «م» (Mim) ga aylanib oʻqiladi.',
    lettersAr: 'نْ + ب',
    exampleAr: 'مِنْ بَعْدِ مَا جَاءَتْهُمُ الْبَيِّنَةُ',
    exampleRef: 'Bayyina surasi, 4-oyat',
    practiceTipUz: 'Ikki lab orasida juda yengil tegish bilan 2 harakat gʻunna qilinadi.',
  },
  {
    id: 'madd',
    titleUz: 'Madd (Choʻzib oʻqish)',
    titleAr: 'المَدّ',
    colorHex: '#0D9488',
    colorLabelUz: 'Firuzarang',
    summaryUz: 'Madd harflari (ا و ي) dan keyin hamza yoki sukun kelishiga qarab 2, 4, 5 yoki 6 harakat choʻzib oʻqiladi.',
    lettersAr: 'ا  و  ي',
    exampleAr: 'وَلَا الضَّالِّينَ',
    exampleRef: 'Fotiha surasi, 7-oyat',
    practiceTipUz: 'Maddi lozim (tashdid oldidan) toʻliq 6 harakat teng ohangda choʻziladi.',
  },
];

export const MUALLIMI_SONIY_LESSONS: MuallimiSoniyLesson[] = [
  {
    id: 'ms-1',
    level: 1,
    titleUz: '1-dars: Harflar va Fatha (a) harakati',
    subtitleUz: 'Boshlangʻich oʻquvchilar va bolalar uchun eng birinchi qadam',
    durationMin: 10,
    isKidsFriendly: true,
    objectivesUz: [
      'Fatha ( ـَ ) belgisi harf ustiga qoʻyilishi va «a» tovushi berishini bilish',
      'Qisqa harakatni choʻzmasdan aniq oʻqish',
    ],
    drillItems: [
      { ar: 'بَ تَ ثَ', read: 'Ba - Ta - Sa', note: 'Har bir harf qisqa 1 harakatda oʻqiladi' },
      { ar: 'دَ رَ سَ', read: 'Da - Ra - Sa', note: '«Darasa» — oʻqidi' },
      { ar: 'كَ تَ بَ', read: 'Ka - Ta - Ba', note: '«Kataba» — yozdi' },
    ],
  },
  {
    id: 'ms-2',
    level: 2,
    titleUz: '2-dars: Kasra (i) va Zamma (u) harakatlari',
    subtitleUz: 'Uch asosiy harakatni farqlash va soʻzlarda qoʻllash',
    durationMin: 12,
    isKidsFriendly: true,
    objectivesUz: [
      'Kasra ( ـِ ) harf ostida turib «i», Zamma ( ـُ ) ustida turib «u» berishini oʻrganish',
      'Lablarni zamma paytida aniq doira shakliga keltirish',
    ],
    drillItems: [
      { ar: 'بِ بُ بَ', read: 'Bi - Bu - Ba', note: 'Bir harfda uch harakat mashqi' },
      { ar: 'عُ لِ مَ', read: 'U - li - ma', note: '«Ulima» — bilindi' },
      { ar: 'قُ رِ ئَ', read: 'Qu - ri - a', note: '«Quria» — oʻqildi' },
    ],
  },
  {
    id: 'ms-3',
    level: 3,
    titleUz: '3-dars: Sukun ( ـْ ) va boʻgʻin qoʻshish',
    subtitleUz: 'Harakatsiz harfni oldingi harfga qoʻshib oʻqish qoidasi',
    durationMin: 15,
    isKidsFriendly: true,
    objectivesUz: [
      'Sukun belgisi harfni toʻxtatishini tushunish',
      'Qalqala harflarida sukun talaffuzini toʻgʻri chiqarish',
    ],
    drillItems: [
      { ar: 'أَبْ  أَخْ  مِنْ', read: 'Ab - Ax - Min', note: 'Ikki harfli yopiq boʻgʻinlar' },
      { ar: 'اَلْحَمْدُ', read: 'Al-ham-du', note: 'Fotiha surasidan ilk mashq' },
      { ar: 'لَمْ يَلِدْ', read: 'Lam ya-lid', note: '«دْ» harfida yengil qalqala' },
    ],
  },
  {
    id: 'ms-4',
    level: 4,
    titleUz: '4-dars: Tanvin ( ـً ـٍ ـٌ ) va Tashdid ( ـّ )',
    subtitleUz: 'Qoʻshaloq harakatlar va harfni ikkilantirib oʻqish',
    durationMin: 15,
    isKidsFriendly: false,
    objectivesUz: [
      'Tanvin oxirida sukunli «n» tovushi qoʻshilishini bilish',
      'Tashdidli harfni birinchi sukunli, ikkinchi harakatli qilib oʻqish',
    ],
    drillItems: [
      { ar: 'عَلِيمٌ حَكِيمٌ', read: 'Aliymun Hakiymun', note: 'Zammali tanvin mashqi' },
      { ar: 'رَبِّ الْعَالَمِينَ', read: 'Rabbil-aalamiyn', note: 'Tashdidli «بّ» mustahkam bosiladi' },
      { ar: 'إِيَّاكَ نَعْبُدُ', read: 'Iyyaka naʼbudu', note: 'Tashdidli «يّ» aniq ajratiladi' },
    ],
  },
  {
    id: 'ms-5',
    level: 5,
    titleUz: '5-dars: Madd harflari va choʻzish meʼyori',
    subtitleUz: 'Tabiiy madd (2 harakat) va uzun maddlarga kirish',
    durationMin: 15,
    isKidsFriendly: true,
    objectivesUz: [
      'Alif, Vov va Ya choʻzish shartlarini farqlash',
      'Fotiha va qisqa suralarda ritmik muvozanatni ushlash',
    ],
    drillItems: [
      { ar: 'قَالَ  يَقُولُ  قِيلَ', read: 'Qoola - Yaquulu - Qiyla', note: 'Uchta tabiiy madd koʻrinishi' },
      { ar: 'مَالِكِ يَوْمِ الدِّينِ', read: 'Maaliki yavmid-diyn', note: 'Oyat oxirida maddi oriz' },
    ],
  },
  {
    id: 'ms-6',
    level: 6,
    titleUz: '6-dars: Bolalar uchun qisqa suralar (Fotiha, Ixlos, Falaq, Nos)',
    subtitleUz: 'Boʻlib-boʻlib yodlash va ota-ona nazoratida mashq',
    durationMin: 20,
    isKidsFriendly: true,
    objectivesUz: [
      'Har oyatni 3 marta sekin va aniq qaytarish',
      'Namozda oʻqiladigan dastlabki 4 surani tajvid bilan mustahkamlash',
    ],
    drillItems: [
      { ar: 'قُلْ هُوَ اللَّهُ أَحَدٌ', read: 'Qul huvallohu ahad', note: 'Ixlos surasi, 1-oyat' },
      { ar: 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ', read: 'Qul aʼuzu birobbil-falaq', note: 'Falaq surasi, 1-oyat' },
      { ar: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ', read: 'Qul aʼuzu birobbin-nas', note: 'Nos surasi, 1-oyat — gʻunnali nun' },
    ],
  },
];

export const ACADEMY_QUIZ_QUESTIONS: AcademyQuizQuestion[] = [
  {
    id: 'aq-1',
    topic: 'tajvid',
    questionUz: 'Qalqala harflari nechta va qaysi soʻzda jamlangan?',
    options: ['5 ta — ق ط ب ج د (Qutbu Jaddin)', '6 ta — ي ر م ل و ن (Yarmalun)', '4 ta — ا و ي ن', '15 ta — ixfo harflari'],
    correctIndex: 0,
    explanationUz: 'Qalqala harflari 5 ta boʻlib, ularni eslab qolish uchun «قُطْبُ جَدٍّ» (Qutbu Jaddin) iborasi ishlatiladi.',
  },
  {
    id: 'aq-2',
    topic: 'tajvid',
    questionUz: 'Tashdidli «نّ» va «مّ» harflarida qaysi tajvid qoidasi qoʻllanadi?',
    options: ['Qalqala', 'Gʻunna (2 harakat dimogʻda ushlash)', 'Izhor', 'Iqlob'],
    correctIndex: 1,
    explanationUz: 'Tashdidli nun va mim harflarida albatta 2 harakat miqdorida gʻunna qilinadi.',
  },
  {
    id: 'aq-3',
    topic: 'maxraj',
    questionUz: '«ع» (Ayn) va «ح» (Ha) harflari qaysi maxrajdan chiqadi?',
    options: ['Ikki labdan (Shafatan)', 'Tomoqning oʻrta qismidan (Vasatul-halq)', 'Til uchidan', 'Dimogʻdan (Xayshum)'],
    correctIndex: 1,
    explanationUz: 'Ayn va Ha harflari tomoqning oʻrta qismidan (vasatul-halq) chiqadigan halqiy harflardir.',
  },
  {
    id: 'aq-4',
    topic: 'tajvid',
    questionUz: 'Sukunli nundan keyin «ب» (Ba) harfi kelsa qaysi qoida bajariladi?',
    options: ['Iqlob (Mim tovushiga aylanadi)', 'Idgʻom bila gʻunna', 'Qalqalai sugʻro', 'Maddi tabiiy'],
    correctIndex: 0,
    explanationUz: 'Sukunli nun yoki tanvindan soʻng Ba harfi kelsa, Iqlob qoidasiga koʻra gʻunnali Mim tovushiga aylanadi.',
  },
  {
    id: 'aq-5',
    topic: 'muallimi_soniy',
    questionUz: 'Maddi lozim (masalan, «وَلَا الضَّالِّينَ») necha harakat choʻzib oʻqiladi?',
    options: ['1 harakat', '2 harakat', '4 harakat', '6 harakat'],
    correctIndex: 3,
    explanationUz: 'Madd harfidan keyin asliy sukun yoki tashdid kelsa, u Maddi lozim boʻlib 6 harakat choʻziladi.',
  },
  {
    id: 'aq-6',
    topic: 'alifbo',
    questionUz: 'Arab alifbosida nechta asosiy harf mavjud?',
    options: ['26 ta', '28 ta', '32 ta', '24 ta'],
    correctIndex: 1,
    explanationUz: 'Arab alifbosida 28 ta asosiy harf mavjud (Hamza alohida sanalganda 29 ta deb ham keltiriladi).',
  },
];

export const BASELINE_SCHOLARS: ScholarProfile[] = [
  {
    id: 'scholar-shayx-msmy',
    name: 'Shayx Muhammad Sodiq Muhammad Yusuf',
    honorific: 'Rahimahulloh · Alloma va Mufassir',
    field: 'Tafsir va Fiqh',
    region: 'Andijon / Toshkent, Oʻzbekiston',
    years: '1952 – 2015',
    shortBioUz: 'Zamonaviy oʻzbek islom ilmiy merosining buyuk peshvosi, «Tafsiri Hilol», «Hadis va Hayot» hamda «Kifoya» asarlari muallifi.',
    biographyParagraphsUz: [
      'Shayx Muhammad Sodiq Muhammad Yusuf hazratlari 1952-yilda Andijon viloyatida tavallud topganlar. Buxorodagi «Mir Arab» madrasasi, Toshkent Islom instituti va Liviyadagi «Daʼvati Islomiya» kulliyotida tahsil olganlar.',
      'U zot 100 dan ziyod moʻtabar diniy-maʼrifiy kitoblar yozib, Ahli Sunna val Jamoa eʼtiqodi va Hanafiy mazhabi asoslarini oʻzbek kitobxonlariga tushunarli va ilmiy asosda yetkazganlar.',
    ],
    notableWorks: ['Tafsiri Hilol (6 jild)', 'Hadis va Hayot (39 juz)', 'Kifoya (Sharhi Muxtasari Viqoya)', 'Iymon', 'Ruhiy tarbiya (3 jild)'],
    quotesUz: [
      'Ilm — insoniyatni zulmatdan nurga olib chiquvchi eng buyuk neʼmatdir.',
      'Islom — bagʻrikenglik, maʼrifat, poklik va goʻzal axloq dinidir.',
    ],
    avatarFallbackInitials: 'MS',
    imageUrl: '/images/islamic_scholarship_library_1793634659800.jpg',
    relatedTab: 'library',
  },
  {
    id: 'scholar-hasanxon',
    name: 'Hasanxon Yahyo Abdulmajid',
    honorific: 'Qori va Islom ilmlari tadqiqotchisi',
    field: 'Qurʼon va Tajvid',
    region: 'Andijon / Toshkent, Oʻzbekiston',
    shortBioUz: 'Qurʼon ilmlari, tajvid, hadis sharhi va ruhiy tarbiya boʻyicha sermahsul ustoz, xalqaro Qurʼon musobaqalari ishtirokchisi.',
    biographyParagraphsUz: [
      'Hasanxon Yahyo Abdulmajid Qurʼoni Karimni yoshlikdan yod olib, Shayx Muhammad Sodiq Muhammad Yusuf rahimahullohning shogirdlari safida ilm tahsil qilganlar.',
      '«Shamoili Muhammadiya», «Arbaʼin Navaviya» sharhlari, taroveh tilovatlari, ilmiy suhbatlar va maʼrifiy kitoblar orqali keng jamoatchilikka xizmat qilib kelmoqdalar.',
    ],
    notableWorks: ['Qurʼoni Karim tilovatlari va tajvid suhbatlari', 'Shamoili Muhammadiya sharhlari', 'Navoiydan bahra va maʼnaviy hikmatlar'],
    quotesUz: [
      'Qurʼon bilan ulfat boʻlgan qalb hech qachon yolgʻiz qolmaydi.',
      'Har bir oyatni tadabbur bilan oʻqish qalbning shifosidir.',
    ],
    poemsUz: [
      {
        title: 'Ilm va Qalb Nuri',
        lines: [
          'Qalbga ziyo berar Kalomi Rabboniy,',
          'Har harfida bordir hikmati subhoniy.',
          'Istiqomat bilan yursa kim bu yoʻldan,',
          'Topar ikki dunyo saodati joniy.',
        ],
      },
    ],
    avatarFallbackInitials: 'HY',
    imageUrl: '/images/quran_illumination_art_1793634658336.jpg',
    relatedTab: 'media_center',
  },
  {
    id: 'scholar-husaynxon',
    name: 'Husaynxon Yahyo Abdulmajid',
    honorific: 'Qori va Maʼrifatparvar Ustoz',
    field: 'Maʼnaviyat va Adabiyot',
    region: 'Andijon / Toshkent, Oʻzbekiston',
    shortBioUz: 'Qurʼoni Karim qorisi, maʼnaviy suhbatlar, adabiy-irfoniy maqolalar va yoshlar tarbiyasi boʻyicha ustoz.',
    biographyParagraphsUz: [
      'Husaynxon Yahyo Abdulmajid Qurʼon hifzi, adabiyot va maʼrifiy suhbatlar yoʻnalishida faoliyat olib boruvchi taniqli ustozlardan biridir.',
      'U kishining xushovoz tilovatlari, hikmatli maʼruzalari va adabiy mulohazalari koʻplab yoshlarning Qurʼonga muhabbatini oshirishga xizmat qilmoqda.',
    ],
    notableWorks: ['Maʼrifiy suhbatlar turkumi', 'Qurʼon tilovati va duolar', 'Axloqiy va adabiy maqolalar'],
    quotesUz: [
      'Goʻzal xulq — ilmning eng oliy mevasidir.',
    ],
    avatarFallbackInitials: 'HA',
    imageUrl: '/images/asaka_dawn_spiritual_1793634658872.jpg',
    relatedTab: 'articles',
  },
  {
    id: 'scholar-alijon-qori',
    name: 'Shayx Alijon qori',
    honorific: 'Qurʼon va Tajvid Ustozi',
    field: 'Qurʼon va Tajvid',
    region: 'Oʻzbekiston',
    shortBioUz: '«Muallimi Soniy» video darslari, «Al-Fatiha» loyihasi va 114 sura murattal qiroati muallifi.',
    biographyParagraphsUz: [
      'Shayx Alijon qori Oʻzbekistonda Qurʼon savodxonligi va tajvid ilmini ommalashtirish yoʻlida ulkan hissa qoʻshgan ustozlardan biri hisoblanadi.',
      'U kishining 114 suralik toʻliq qiroati ASAKA ZIYO Qurʼon markazida ham tinglash uchun taqdim etilgan.',
    ],
    notableWorks: ['114 sura Murattal Qiroat', 'Muallimi Soniy darsliklari', 'Tajvid asoslari'],
    quotesUz: [
      'Qurʼonni toʻgʻri tajvid bilan oʻqishni oʻrganish har bir moʻmin uchun sharafdir.',
    ],
    avatarFallbackInitials: 'AQ',
    imageUrl: '/images/quran_illumination_art_1793634658336.jpg',
    relatedTab: 'quran',
  },
  {
    id: 'scholar-jahongir-qori',
    name: 'Jahongir qori Neʼmatov',
    honorific: 'Hofizi Qurʼon va Tajvid Muallimi',
    field: 'Qurʼon va Tajvid',
    region: 'Oʻzbekiston',
    shortBioUz: 'Tajvid nazariyasi, harflar maxraji, hifz va murojaʼa uslubiyoti boʻyicha taniqli qori va ustoz.',
    biographyParagraphsUz: [
      'Jahongir qori Neʼmatov Qurʼonni tartil bilan oʻqish, tajvid qoidalarini amaliy tatbiq etish hamda Hifz va Murojaʼa tizimi boʻyicha koʻplab shogirdlar yetishtirgan ustozdir.',
      'ASAKA ZIYO Qurʼon markazida Jahongir qori Neʼmatovning 114 surasi uchun maxsus alohida qiroat kutubxonasi ajratilgan.',
    ],
    notableWorks: ['Tajvid va Maxraj amaliy darslari', '114 sura alohida qiroat toʻplami', 'Hifz va Murojaʼa metodikasi'],
    quotesUz: [
      'Murojaʼa — yodlangan Qurʼonni qalbda mustahkam saqlovchi qalʼadir.',
    ],
    avatarFallbackInitials: 'JN',
    imageUrl: '/images/asaka_islamic_architecture_1793634657962.jpg',
    relatedTab: 'quran',
  },
];

export const BASELINE_MOSQUES: MosqueDirectoryItem[] = [
  {
    id: 'mosque-muhammadsolih-hoji',
    name: '«MuhammadSolih Hoji» jomeʼ masjidi',
    district: 'Asaka shahri',
    region: 'Andijon viloyati',
    address: 'Asaka shahri markazi, Andijon viloyati, Oʻzbekiston',
    imamName: 'Asaka tumani jomeʼ masjidi maʼmuriyati',
    jumaTime: '12:45 (Maʼruza) · 13:15 (Juma namozi)',
    lat: 40.6415,
    lng: 72.2387,
    qiblaDeg: 241,
    capacity: 2500,
    facilities: ['Tahoratxona (issiq suv)', 'Kutubxona va tajvid xonasi', 'Smart Mosque TV Tablo', 'Avtoturargoh', 'Imkoniyati cheklanganlar uchun pandus'],
    descriptionUz: 'ASAKA ZIYO platformasining bosh maʼrifiy markazi. Rasmiy kunlik namoz vaqtlari, Juma maʼruzalari va diniy-maʼrifiy eʼlonlar aynan ushbu masjid maʼmuriyati tomonidan yuritiladi.',
    isPrimary: true,
  },
  {
    id: 'mosque-asaka-xolid',
    name: '«Xolid ibn Valid» jomeʼ masjidi',
    district: 'Asaka tumani',
    region: 'Andijon viloyati',
    address: 'Asaka tumani, Oʻzbekiston koʻchasi',
    imamName: 'Jomeʼ masjidi imom-xatibi',
    jumaTime: '12:45 · 13:15',
    lat: 40.6378,
    lng: 72.2442,
    qiblaDeg: 241,
    capacity: 1500,
    facilities: ['Zamonaviy tahoratxona', 'Keng xonaqoh', 'Avtoturargoh'],
    descriptionUz: 'Asaka tumanidagi yirik va fayzli jomeʼ masjidlaridan biri. Besh vaqt va Juma namozlari muntazam ado etiladi.',
  },
  {
    id: 'mosque-asaka-qadim',
    name: '«Qadimiy Asaka» jomeʼ masjidi',
    district: 'Asaka shahri',
    region: 'Andijon viloyati',
    address: 'Asaka shahri, Markaziy mahalla',
    imamName: 'Jomeʼ masjidi imom-xatibi',
    jumaTime: '12:45 · 13:15',
    lat: 40.6461,
    lng: 72.2314,
    qiblaDeg: 241,
    capacity: 1100,
    facilities: ['Tahoratxona', 'Ayvon', 'Kutubxona burchagi'],
    descriptionUz: 'Tarixiy anʼanalarga boy, mahalla ahlining maʼnaviy-maʼrifiy maskani.',
  },
  {
    id: 'mosque-andijon-devonaboy',
    name: '«Devonaboy» markaziy jomeʼ masjidi',
    district: 'Andijon shahri',
    region: 'Andijon viloyati',
    address: 'Andijon shahri, Bobur shohkoʻchasi yaqinida',
    imamName: 'Andijon viloyati bosh imom-xatibligi',
    jumaTime: '12:45 · 13:15',
    lat: 40.7834,
    lng: 72.3442,
    qiblaDeg: 241,
    capacity: 5000,
    facilities: ['Katta jomeʼ xonaqoh', 'Issiq tahoratxona', 'Avtoturargoh', 'Tarixiy meʼmoriy majmua'],
    descriptionUz: 'Andijon viloyatining eng yirik va mashhur markaziy jomeʼ masjidi.',
  },
];
