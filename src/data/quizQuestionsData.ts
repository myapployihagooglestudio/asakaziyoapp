/**
 * ASAKA ZIYO — Canonical Islamic Quiz Question Bank & Deterministic Daily Generator
 * Verified against authentic classical sources:
 * - Qur'oni Karim
 * - Sahihi Buxoriy (Imom Buxoriy)
 * - Sahihi Muslim (Imom Muslim)
 * - Sunani Termiziy (Imom Termiziy)
 * - Mukhtasarul Viqoya (Hanafiy fiqhi)
 * - Siyratun Nabaviya (Ibn Hishom, Muborakfuriy)
 * - Siyaru A'lomin Nubalo (Imom Zahabiy)
 */

export type QuizCategory =
  | 'Qurʼon'
  | 'Hadis'
  | 'Aqoid'
  | 'Fiqh'
  | 'Siyrat'
  | 'Islom tarixi'
  | 'Sahobalar'
  | 'Axloq va Odob'
  | 'Zikr va Duolar';

export const QUIZ_CATEGORIES: QuizCategory[] = [
  'Qurʼon',
  'Hadis',
  'Aqoid',
  'Fiqh',
  'Siyrat',
  'Islom tarixi',
  'Sahobalar',
  'Axloq va Odob',
];

export interface QuizQuestionItem {
  id: string;
  category: QuizCategory;
  questionUz: string;
  optionsUz: [string, string, string, string];
  correctIndex: number;
  explanationUz: string;
  source: string;
  reference?: string;
  difficulty: 'oson' | 'orta' | 'murakkab';
  publishedDate: string;
  isApproved: boolean;
  sourceVerified: boolean;
  status?: 'approved' | 'pending' | 'rejected';
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface DailyQuizSet {
  id: string; // YYYY-MM-DD
  dateStr: string; // YYYY-MM-DD
  questions: QuizQuestionItem[]; // Always 10 questions
  questionIds: string[];
  isScheduledByAdmin?: boolean;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
  schemaVersion?: number;
}

export const VERIFIED_QUIZ_BANK: QuizQuestionItem[] = [
  {
    id: 'q-001',
    category: 'Qurʼon',
    questionUz: 'Qurʼoni Karimning qaysi surasi «Qurʼonning onasi» (Ummul Qurʼon) deb ataladi?',
    optionsUz: ['Baqara surasi', 'Fotiha surasi', 'Yosin surasi', 'Ixlos surasi'],
    correctIndex: 1,
    explanationUz: 'Fotiha surasi namozning har bir rakatida oʻqilishi va Qurʼon maʼnolarining asosini oʻz ichiga olgani uchun «Ummul Qurʼon» va «Ummul Kitob» deb nomlangan.',
    source: 'Sahihi Termiziy; Tafsiri Hilol',
    reference: '1-juz, Fotiha surasi muqaddimasi',
    difficulty: 'oson',
    publishedDate: '2026-11-01',
    isApproved: true,
    sourceVerified: true,
    status: 'approved',
  },
  {
    id: 'q-002',
    category: 'Qurʼon',
    questionUz: 'Qurʼoni Karimdagi eng uzun oyat qaysi va u nima haqida?',
    optionsUz: [
      'Oyatul Kursiy (Allohning sifati)',
      'Mudoyana (qarz oldi-berdisi) oyati',
      'Nur surasidagi hijob oyati',
      'Moida surasidagi hukm oyati',
    ],
    correctIndex: 1,
    explanationUz: 'Baqara surasining 282-oyati Qurʼondagi eng uzun oyat boʻlib, u qarz va moliyaviy muomalalarni yozib borish hamda guvohlar tayinlash qoidalarini belgilaydi.',
    source: 'Qurʼoni Karim',
    reference: 'Baqara surasi, 282-oyat',
    difficulty: 'orta',
    publishedDate: '2026-11-01',
    isApproved: true,
    sourceVerified: true,
    status: 'approved',
  },
  {
    id: 'q-003',
    category: 'Hadis',
    questionUz: '«Albatta, amallar niyatlarga bogʻliqdir...» hadisini Rasulullohdan (s.a.v.) qaysi sahoba rivoyat qilgan?',
    optionsUz: ['Abu Hurayra (r.a.)', 'Umar ibn Xattob (r.a.)', 'Ali ibn Abu Tolib (r.a.)', 'Anas ibn Molik (r.a.)'],
    correctIndex: 1,
    explanationUz: 'Bu mashhur va buyuk hadis Hazrati Umar ibn Xattob roziyallohu anhudan rivoyat qilingan boʻlib, Imom Buxoriy oʻz sahih toʻplamlarini aynan shu hadis bilan boshlaganlar.',
    source: 'Sahihi Buxoriy; Sahihi Muslim',
    reference: 'Buxoriy 1-hadis; Muslim 1907-hadis',
    difficulty: 'oson',
    publishedDate: '2026-11-01',
    isApproved: true,
    sourceVerified: true,
    status: 'approved',
  },
  {
    id: 'q-004',
    category: 'Fiqh',
    questionUz: 'Tahoratning farzlari nechta va ular qaysilar?',
    optionsUz: [
      '3 ta: yuz, qoʻllar, oyoqlar',
      '4 ta: yuzni yuvish, qoʻllarni tirsak bilan yuvish, boshga mash tortish, oyoqlarni toʻpigʻi bilan yuvish',
      '5 ta: ogʻiz, burun, yuz, qoʻl, oyoq',
      '6 ta: niyat, yuz, qoʻl, bosh, quloq, oyoq',
    ],
    correctIndex: 1,
    explanationUz: 'Moida surasining 6-oyatiga asosan hanafiy mazhabida tahoratning farzi toʻrttadir: yuzni bir marta toʻliq yuvish, ikki qoʻlni tirsaklari bilan yuvish, boshning toʻrtdan biriga mash tortish va ikki oyoqni toʻpiqlari bilan yuvish.',
    source: 'Mukhtasarul Viqoya',
    reference: 'Tahorat bobi; Moida surasi, 6-oyat',
    difficulty: 'oson',
    publishedDate: '2026-11-01',
    isApproved: true,
    sourceVerified: true,
    status: 'approved',
  },
  {
    id: 'q-005',
    category: 'Siyrat',
    questionUz: 'Paygʻambarimiz Muhammad sollallohu alayhi vasallam Madinaga hijrat qilganlarida ularni oʻz uylarida birinchi boʻlib kim kutib olgan?',
    optionsUz: ['Abu Bakr Siddiq (r.a.)', 'Saʼd ibn Muoz (r.a.)', 'Abu Ayyub al-Ansoriy (r.a.)', 'Usmon ibn Affon (r.a.)'],
    correctIndex: 2,
    explanationUz: 'Paygʻambarimiz sollallohu alayhi vasallamning tuyalari Abu Ayyub al-Ansoriy roziyallohu anhuning uylari oldiga choʻkkan va u zot u yerda Masjidi Nabaviy qurilgunga qadar yashaganlar.',
    source: 'Sahihi Buxoriy; Ar-Rahiqul Maxtum',
    reference: 'Hijrat bobi, 3906-hadis',
    difficulty: 'orta',
    publishedDate: '2026-11-01',
    isApproved: true,
    sourceVerified: true,
    status: 'approved',
  },
  {
    id: 'q-006',
    category: 'Aqoid',
    questionUz: 'Islom eʼtiqodida imonning ruknlari nechta?',
    optionsUz: ['3 ta', '5 ta', '6 ta', '7 ta'],
    correctIndex: 2,
    explanationUz: 'Mashhur «Jabroil hadisi»ga binoan imonning ruknlari 6 tadir: Allohga, farishtalariga, kitoblariga, paygʻambarlariga, oxirat kuniga va qadarning yaxshiyu yomoni Allohdan ekaniga ishonish.',
    source: 'Sahihi Muslim',
    reference: 'Imon kitobi, 1-hadis (Jabroil hadisi)',
    difficulty: 'oson',
    publishedDate: '2026-11-01',
    isApproved: true,
    sourceVerified: true,
    status: 'approved',
  },
  {
    id: 'q-007',
    category: 'Fiqh',
    questionUz: 'Bomdod namozining farzidan oldin oʻqiladigan 2 rakat sunnat qanday hukmga ega?',
    optionsUz: ['Muboh', 'Mustahab', 'Sunnati muakkada (taʼkidlangan sunnat)', 'Vojib'],
    correctIndex: 2,
    explanationUz: 'Bomdod namozining sunnati sunnatlar ichida eng quvvatlisi (muakkada) boʻlib, Rasululloh (s.a.v.) uni safarda ham, muqimlikda ham deyarli tark qilmaganlar.',
    source: 'Sahihi Muslim; Mukhtasarul Viqoya',
    reference: 'Musofirlar namozi bobi, 725-hadis',
    difficulty: 'orta',
    publishedDate: '2026-11-01',
    isApproved: true,
    sourceVerified: true,
    status: 'approved',
  },
  {
    id: 'q-008',
    category: 'Hadis',
    questionUz: '«Musulmon — boshqa musulmonlar uning ... va ...dan omonda boʻlgan kishidir». Hadisdagi boʻsh oʻrinlarni toʻldiring.',
    optionsUz: ['koʻzi va qulogʻi', 'tili va qoʻli', 'mol-mulki va obroʻsi', 'qalbi va niyati'],
    correctIndex: 1,
    explanationUz: 'Rasululloh sollallohu alayhi vasallam: «Haqiqiy musulmon — odamlar uning tili (gʻiybat, chaqimchilik, soʻkish) va qoʻli (zulm, zarar)dan omonda boʻlgan kishidir», deganlar.',
    source: 'Sahihi Buxoriy; Sahihi Muslim',
    reference: 'Buxoriy 10-hadis; Muslim 40-hadis',
    difficulty: 'oson',
    publishedDate: '2026-11-01',
    isApproved: true,
    sourceVerified: true,
    status: 'approved',
  },
  {
    id: 'q-009',
    category: 'Islom tarixi',
    questionUz: 'Islom olamining eng mashhur muhaddisi Imom Abu Abdulloh Muhammad ibn Ismoil al-Buxoriy qaysi yili tavallud topganlar?',
    optionsUz: ['Hijriy 150 yili', 'Hijriy 194 yili (milodiy 810)', 'Hijriy 204 yili', 'Hijriy 256 yili'],
    correctIndex: 1,
    explanationUz: 'Imom Buxoriy hijriy 194-yil 13-shavvol (milodiy 810-yil 21-iyul) juma kuni Buxoro shahrida tavallud topganlar.',
    source: 'Siyaru Aʼlomin Nubalo (Imom Zahabiy)',
    reference: '12-juz, Imom Buxoriy tarjimai holi',
    difficulty: 'orta',
    publishedDate: '2026-11-01',
    isApproved: true,
    sourceVerified: true,
    status: 'approved',
  },
  {
    id: 'q-010',
    category: 'Zikr va Duolar',
    questionUz: '«Sayyidul istigʻfor» duosini ixlos bilan kechqurun oʻqib, tong otmasdan vafot etgan kishi haqida Paygʻambarimiz (s.a.v.) nima deganlar?',
    optionsUz: ['Haj qilgan savobini oladi', 'Jannat ahlidan boʻladi', 'Shahid maqomiga yetadi', 'Qabr azobidan omonda boʻladi'],
    correctIndex: 1,
    explanationUz: 'Shaddod ibn Avs roziyallohu anhudan rivoyat: Rasululloh (s.a.v.): «Kimki bu duoni kechqurun ishonch bilan aytsa va shu kechada vafot etsa, u jannat ahlidandir», deganlar.',
    source: 'Sahihi Buxoriy',
    reference: 'Daʼavot kitobi, 6306-hadis',
    difficulty: 'orta',
    publishedDate: '2026-11-01',
    isApproved: true,
    sourceVerified: true,
    status: 'approved',
  },
  {
    id: 'q-011',
    category: 'Qurʼon',
    questionUz: 'Qurʼoni Karimdagi qaysi sura «Bismillahir Rohmanir Rohiym»siz boshlanadi?',
    optionsUz: ['Tavba surasi', 'Anfol surasi', 'Naml surasi', 'Kafirun surasi'],
    correctIndex: 0,
    explanationUz: 'Tavba (Baroat) surasi mushriklarga nisbatan qatʼiy ogohlantirish bilan boshlangani va Anfol surasining davomi sifatida tushgani sababli avvalida bismillah yozilmaydi.',
    source: 'Sahihi Termiziy; Tafsiri Jalolayn',
    reference: 'Tafsir kitobi, 3086-hadis',
    difficulty: 'oson',
    publishedDate: '2026-11-02',
    isApproved: true,
    sourceVerified: true,
    status: 'approved',
  },
  {
    id: 'q-012',
    category: 'Qurʼon',
    questionUz: 'Qurʼoni Karimda ikki marta «Bismillahir Rohmanir Rohiym» kelgan sura qaysi?',
    optionsUz: ['Yosin surasi', 'Naml surasi', 'Rahmon surasi', 'Fatx surasi'],
    correctIndex: 1,
    explanationUz: 'Naml surasining boshida va 30-oyatida Sulaymon alayhissalomning malika Bilqisga yozgan maktubi zikrida («Innahu min Sulaymana va innahu Bismillahir Rohmanir Rohiym») keladi.',
    source: 'Qurʼoni Karim',
    reference: 'Naml surasi, 30-oyat',
    difficulty: 'orta',
    publishedDate: '2026-11-02',
    isApproved: true,
    sourceVerified: true,
    status: 'approved',
  },
  {
    id: 'q-013',
    category: 'Fiqh',
    questionUz: 'Ramazon oyida uzrsiz roʻzani qasddan buzgan kishining kafforati qanday belgilanadi?',
    optionsUz: [
      'Faqat 1 kun qazo tutish',
      'Bir qul ozod qilish, topolmasa ketma-ket 60 kun roʻza tutish, qodir boʻlmasa 60 miskinni toʻydirish',
      '10 miskinni kiyintirish',
      'Masjidga zakot berish',
    ],
    correctIndex: 1,
    explanationUz: 'Qasddan oziqlanish yoki yaqinlik sababli roʻzasini buzgan kishi 1 kun qazo bilan birga buyurilgan tartibda kafforat (ketma-ket 60 kun roʻza) ado etishi vojib boʻladi.',
    source: 'Sahihi Buxoriy; Mukhtasarul Viqoya',
    reference: 'Buxoriy 1936-hadis; Roʻza kafforati bobi',
    difficulty: 'murakkab',
    publishedDate: '2026-11-02',
    isApproved: true,
    sourceVerified: true,
    status: 'approved',
  },
  {
    id: 'q-014',
    category: 'Axloq va Odob',
    questionUz: 'Islomda ota-onaga yaxshilik qilish va ularga «uf» ham demaslik qaysi surada buyurilgan?',
    optionsUz: ['Isro surasi, 23-oyat', 'Luqmon surasi, 14-oyat', 'Niso surasi, 36-oyat', 'Ahqof surasi, 15-oyat'],
    correctIndex: 0,
    explanationUz: 'Isro surasining 23-oyatida: «Parvardigoringiz faqat Oʻzigagina ibodat qilishingizni va ota-onaga yaxshilik qilishni amr etdi. Agar ulardan biri yoki ikkalasi huzuringizda qarilik yoshiga yetsa, ularga uf dema...», deb buyurilgan.',
    source: 'Qurʼoni Karim',
    reference: 'Isro surasi, 23-oyat',
    difficulty: 'oson',
    publishedDate: '2026-11-02',
    isApproved: true,
    sourceVerified: true,
    status: 'approved',
  },
  {
    id: 'q-015',
    category: 'Siyrat',
    questionUz: 'Paygʻambarimiz (s.a.v.) Ahzob jangi oldidan Madinani himoya qilish uchun xandaq qazish fikrini qaysi sahobaning taklifi bilan qabul qilganlar?',
    optionsUz: ['Salmon Forsiy (r.a.)', 'Xolid ibn Valid (r.a.)', 'Bilol Habashiy (r.a.)', 'Abu Ubayda (r.a.)'],
    correctIndex: 0,
    explanationUz: 'Hijriy 5-yili Ahzob (Xandaq) jangi oldidan Salmon Forsiy roziyallohu anhu shaharni himoyalash uchun xandaq qazish tajribasini taklif qilganlar va bu gʻalaba sababchisi boʻlgan.',
    source: 'Ibn Hishom, As-Siyratun Nabaviya',
    reference: 'Gʻazotul Xandaq bobi',
    difficulty: 'oson',
    publishedDate: '2026-11-02',
    isApproved: true,
    sourceVerified: true,
    status: 'approved',
  },
  {
    id: 'q-016',
    category: 'Hadis',
    questionUz: '«Sizlarning eng yaxshilaringiz — ... va uni boshqalarga oʻrgatganlaringizdir». Hadisni toʻldiring.',
    optionsUz: ['ilm izlagan', 'Qurʼonni oʻrgangan', 'juda koʻp sadaqa bergan', 'namozni toʻliq oʻqigan'],
    correctIndex: 1,
    explanationUz: 'Usmon ibn Affon roziyallohu anhudan rivoyat: Rasululloh sollallohu alayhi vasallam: «Sizlarning eng yaxshingiz Qurʼonni oʻrganib, soʻng uni boshqalarga oʻrgatgan kishidir», deganlar.',
    source: 'Sahihi Buxoriy',
    reference: 'Fazoilul Qurʼon kitobi, 5027-hadis',
    difficulty: 'oson',
    publishedDate: '2026-11-02',
    isApproved: true,
    sourceVerified: true,
    status: 'approved',
  },
  {
    id: 'q-017',
    category: 'Fiqh',
    questionUz: 'Tahajjud namozi kechaning qaysi pallasida oʻqilishi eng fazilatli hisoblanadi?',
    optionsUz: [
      'Xufton namozidan soʻng darhol',
      'Yarim kechadan oldin',
      'Kechaning oxirgi uchdan birida (subhdan oldin)',
      'Faqat quyosh chiqishiga 5 daqiqa qolganda',
    ],
    correctIndex: 2,
    explanationUz: 'Kechaning oxirgi uchdan birida Alloh taoloning rahmati yer osmoniga tushib: «Kim duo qilsa, ijobat qilaman, kim magʻfirat soʻrasa, kechiraman», degan pallada tahajjud oʻqish eng fazilatlidir.',
    source: 'Sahihi Buxoriy; Sahihi Muslim',
    reference: 'Buxoriy 1145-hadis; Muslim 758-hadis',
    difficulty: 'orta',
    publishedDate: '2026-11-03',
    isApproved: true,
    sourceVerified: true,
    status: 'approved',
  },
  {
    id: 'q-018',
    category: 'Islom tarixi',
    questionUz: 'Movarounnahr va Fargʻona vodiysi faqihlari hanafiy mazhabida qaysi mashhur kitobni asosiy fatvo manbai sifatida oʻrganishgan?',
    optionsUz: ['Al-Hidoya (Burhoniddin Margʻinoniy)', 'Al-Muvatto (Imom Molik)', 'Risolatul Qushayriy', 'Kitobul Um (Imom Shofeʼiy)'],
    correctIndex: 0,
    explanationUz: 'Vodiy va butun Movarounnahrda Burhoniddin Margʻinoniy hazratlarining «Al-Hidoya» asari islom huquqi (fiqh) boʻyicha eng ishonchli va bosh qomus sifatida oʻrganilgan.',
    source: 'Kashfuz Zunun (Hoji Xalifa)',
    reference: 'Al-Hidoya fi sharhi Bidayatil Mubtadiy',
    difficulty: 'orta',
    publishedDate: '2026-11-03',
    isApproved: true,
    sourceVerified: true,
    status: 'approved',
  },
  {
    id: 'q-019',
    category: 'Zikr va Duolar',
    questionUz: '«Subhanallohi va bihamdihi» zikrini bir kunda 100 marta aytgan insonning mukofoti qanday boʻlishi hadisda aytilgan?',
    optionsUz: [
      'Barcha qarzlaridan qutiladi',
      'Dengiz koʻpigicha boʻlsa ham gunohlari kechiriladi',
      'Unga 100 ta qul ozod qilgan savobi yoziladi',
      'Bir kechada Qurʼonni xatm qilgan hisoblanadi',
    ],
    correctIndex: 1,
    explanationUz: 'Abu Hurayra (r.a.) rivoyat qiladi: Rasululloh (s.a.v.): «Kim bir kunda yuz marta «Subhanallohi va bihamdihi» desa, uning xatolari dengiz koʻpigicha boʻlsa ham oʻchiriladi», deganlar.',
    source: 'Sahihi Buxoriy; Sahihi Muslim',
    reference: 'Buxoriy 6405-hadis; Muslim 2691-hadis',
    difficulty: 'oson',
    publishedDate: '2026-11-03',
    isApproved: true,
    sourceVerified: true,
    status: 'approved',
  },
  {
    id: 'q-020',
    category: 'Aqoid',
    questionUz: 'Paygʻambarlarga xos boʻlgan sifatlar (sidq, omonat, fatonat, ismat, tabligh) ichida «ismat» nimani anglatadi?',
    optionsUz: [
      'Toʻgʻrisoʻzlik',
      'Aqlli va ziyrak boʻlish',
      'Gunoh va maʼsiyatlardan mutlaq saqlanganlik (maʼsumlik)',
      'Omonatdorlik',
    ],
    correctIndex: 2,
    explanationUz: 'Ismat — Alloh taolo Oʻz paygʻambarlarini nubuvvatdan oldin ham, keyin ham har qanday gunoh va fahsh ishlardan saqlashidir.',
    source: 'Aqoidun Nasafiyya sharhi (Imom Taftazoniy)',
    reference: 'Nubuvvat va Risolat bobi',
    difficulty: 'murakkab',
    publishedDate: '2026-11-03',
    isApproved: true,
    sourceVerified: true,
    status: 'approved',
  },
  {
    id: 'q-021',
    category: 'Qurʼon',
    questionUz: 'Qurʼoni Karimda ismi eng koʻp zikr qilingan paygʻambar kim?',
    optionsUz: ['Ibrohim (a.s.)', 'Musa (a.s.)', 'Iso (a.s.)', 'Nuh (a.s.)'],
    correctIndex: 1,
    explanationUz: 'Musa alayhissalomning muborak ismlari Qurʼoni Karimning turli suralarida jami 136 marta zikr etilgan.',
    source: 'Al-Itqon fi Ulumil Qurʼon (Jaloliddin Suyutiy)',
    reference: 'Qurʼondagi ismlar bobi',
    difficulty: 'orta',
    publishedDate: '2026-11-03',
    isApproved: true,
    sourceVerified: true,
    status: 'approved',
  },
  {
    id: 'q-022',
    category: 'Fiqh',
    questionUz: 'Namozda «Qaʼdaʼi oxir»da (oxirgi oʻtirishda) «Attahiyyot» miqdoricha oʻtirish qanday amal hisoblanadi?',
    optionsUz: ['Sunnat', 'Mustahab', 'Farz (rukn)', 'Vojib'],
    correctIndex: 2,
    explanationUz: 'Namozning oxirgi oʻtirishida «Tashahhud» duosini oʻqish miqdoricha oʻtirish hanafiy mazhabida namozning farzlaridandir, uni tark qilinsa namoz buziladi.',
    source: 'Mukhtasarul Viqoya',
    reference: 'Namoz farzlari bobi',
    difficulty: 'orta',
    publishedDate: '2026-11-04',
    isApproved: true,
    sourceVerified: true,
    status: 'approved',
  },
  {
    id: 'q-023',
    category: 'Hadis',
    questionUz: 'Rasululloh (s.a.v.) juma kunida qaysi surani oʻqishni tavsiya qilganlar va uning fazilati nima?',
    optionsUz: [
      'Kahf surasi (ikki juma oraligʻida nur boʻladi)',
      'Mulk surasi (qabr azobidan saqlaydi)',
      'Voqea surasi (faqirlikdan saqlaydi)',
      'Sajda surasi (qalbni poklaydi)',
    ],
    correctIndex: 0,
    explanationUz: 'Abu Said al-Xudriy roziyallohu anhudan rivoyat: «Kim juma kuni Kahf surasini oʻqisa, uning uchun ikki juma orasi nurga toʻladi», deganlar.',
    source: 'Sunani Bayhaqiy; Mustadraki Hokim',
    reference: 'Juma kitobi, 5996-hadis',
    difficulty: 'oson',
    publishedDate: '2026-11-04',
    isApproved: true,
    sourceVerified: true,
    status: 'approved',
  },
  {
    id: 'q-024',
    category: 'Sahobalar',
    questionUz: 'Paygʻambarimiz (s.a.v.) Makkadan Madinaga hijrat qilganlarida Savr gʻorida hamroh boʻlgan va Qurʼonda «gʻordagi ikkining biri» deb zikr etilgan sahoba kim?',
    optionsUz: ['Umar ibn Xattob (r.a.)', 'Abu Bakr Siddiq (r.a.)', 'Usmon ibn Affon (r.a.)', 'Ali ibn Abu Tolib (r.a.)'],
    correctIndex: 1,
    explanationUz: 'Tavba surasining 40-oyatida «Gʻordagi ikkining biri» deb taʼriflangan zot Hazrati Abu Bakr Siddiq roziyallohu anhudir.',
    source: 'Qurʼoni Karim; Sahihi Buxoriy',
    reference: 'Tavba surasi, 40-oyat; Buxoriy 3653-hadis',
    difficulty: 'oson',
    publishedDate: '2026-11-04',
    isApproved: true,
    sourceVerified: true,
    status: 'approved',
  },
  {
    id: 'q-025',
    category: 'Axloq va Odob',
    questionUz: 'Islomda birodarining aybini berkitgan kishi haqida hadisda qanday bashorat berilgan?',
    optionsUz: [
      'Unga 1000 tillo savob beriladi',
      'Alloh qiyomat kunida uning aybini berkitadi',
      'U barcha gunohlardan poklanadi',
      'U doʻzax oʻtini koʻrmaydi',
    ],
    correctIndex: 1,
    explanationUz: 'Abu Hurayra (r.a.) rivoyat qiladi: Rasululloh (s.a.v.): «Kim bir musulmonning aybini berkitsa, Alloh qiyomat kuni uning aybini berkitadi», deganlar.',
    source: 'Sahihi Muslim',
    reference: 'Birr va Sila kitobi, 2699-hadis',
    difficulty: 'oson',
    publishedDate: '2026-11-04',
    isApproved: true,
    sourceVerified: true,
    status: 'approved',
  },
  {
    id: 'q-026',
    category: 'Qurʼon',
    questionUz: '«Oyatul Kursiy» Qurʼoni Karimning qaysi surasida joylashgan va nechanchi oyat?',
    optionsUz: ['Oli Imron surasi, 18-oyat', 'Baqara surasi, 255-oyat', 'Moida surasi, 55-oyat', 'Yosin surasi, 12-oyat'],
    correctIndex: 1,
    explanationUz: 'Oyatul Kursiy — Baqara surasining 255-oyati boʻlib, u Qurʼondagi eng ulugʻ oyat hisoblanadi.',
    source: 'Sahihi Muslim',
    reference: 'Musofirlar namozi kitobi, 810-hadis',
    difficulty: 'oson',
    publishedDate: '2026-11-04',
    isApproved: true,
    sourceVerified: true,
    status: 'approved',
  },
  {
    id: 'q-027',
    category: 'Fiqh',
    questionUz: 'Quyosh chiqayotgan, qiyomga kelgan va botayotgan paytlarda namoz oʻqish hukmi qanday?',
    optionsUz: ['Muboh', 'Mustahab', 'Tahrimiy makruh (man qilingan)', 'Vojib'],
    correctIndex: 2,
    explanationUz: 'Uqba ibn Omir (r.a.) aytganlar: «Rasululloh sollallohu alayhi vasallam uch vaqtda namoz oʻqishimiz va janoza oʻqishimizdan qaytarganlar: quyosh chiqa boshlaganda, qiyomda tikkalaganda va botishga qarab egilganda».',
    source: 'Sahihi Muslim; Mukhtasarul Viqoya',
    reference: 'Muslim 831-hadis; Namoz vaqtlari bobi',
    difficulty: 'orta',
    publishedDate: '2026-11-05',
    isApproved: true,
    sourceVerified: true,
    status: 'approved',
  },
  {
    id: 'q-028',
    category: 'Siyrat',
    questionUz: 'Paygʻambarimiz (s.a.v.) ilk vahiy nozil boʻlganda qaysi gʻorda edilar va qaysi soʻz bilan boshlangan?',
    optionsUz: ['Savr gʻori, «Qul huvalloh»', 'Hiro gʻori, «Iqroʼ» (Oʻqi)', 'Uhud gʻori, «Alhamdu lillah»', 'Qubo gʻori, «Subhanalloh»'],
    correctIndex: 1,
    explanationUz: 'Ramazon oyining Qadr kechasida Jabroil alayhissalom Hiro gʻorida Paygʻambarimizga (s.a.v.) ilk bor Alaq surasining dastlabki 5 oyatini keltirganlar.',
    source: 'Sahihi Buxoriy',
    reference: 'Badʼul Vahy kitobi, 3-hadis',
    difficulty: 'oson',
    publishedDate: '2026-11-05',
    isApproved: true,
    sourceVerified: true,
    status: 'approved',
  },
  {
    id: 'q-029',
    category: 'Sahobalar',
    questionUz: 'Islomda ilk azon aytgan va Rasulullohning (s.a.v.) muazzinlari boʻlgan buyuk sahoba kim?',
    optionsUz: ['Salmon Forsiy (r.a.)', 'Bilol ibn Raboh al-Habashiy (r.a.)', 'Abdulloh ibn Ummu Maktum (r.a.)', 'Abu Mahzura (r.a.)'],
    correctIndex: 1,
    explanationUz: 'Hazrati Bilol ibn Raboh roziyallohu anhu islom tarixidagi eng birinchi muazzin boʻlib, yoqimli va jarangdor ovozlari bilan azon aytganlar.',
    source: 'Siyaru Aʼlomin Nubalo; Sahihi Buxoriy',
    reference: 'Azon kitobi, 604-hadis',
    difficulty: 'oson',
    publishedDate: '2026-11-05',
    isApproved: true,
    sourceVerified: true,
    status: 'approved',
  },
  {
    id: 'q-030',
    category: 'Zikr va Duolar',
    questionUz: 'Masjidga kirayotganda oʻng oyoq bilan kirib qanday duo oʻqiladi?',
    optionsUz: [
      'Allohumma inniy asʼaluka min fazlik',
      'Allohummaftah liy abvaba rohmatik (Allohim, menga rahmating eshiklarini ochgin)',
      'Bismillahi tavakkaltu alalloh',
      'Subhanallohi val hamdu lillah',
    ],
    correctIndex: 1,
    explanationUz: 'Abu Humayd yoki Abu Usayd (r.a.) rivoyati: Rasululloh (s.a.v.): «Sizlardan birortangiz masjidga kirsa: «Allohummaftah liy abvaba rohmatik», deb aytsin», deganlar.',
    source: 'Sahihi Muslim',
    reference: 'Musofirlar namozi kitobi, 713-hadis',
    difficulty: 'orta',
    publishedDate: '2026-11-05',
    isApproved: true,
    sourceVerified: true,
    status: 'approved',
  },
  {
    id: 'q-031',
    category: 'Sahobalar',
    questionUz: 'Paygʻambarimizning (s.a.v.) ikki qizlariga (Ruqayya va Ummu Kulsumga) uylanganlari uchun «Zunnurayn» (ikki nur sohibi) unvonini olgan sahoba kim?',
    optionsUz: ['Ali ibn Abu Tolib (r.a.)', 'Usmon ibn Affon (r.a.)', 'Talha ibn Ubaydulloh (r.a.)', 'Zubayr ibn Avvom (r.a.)'],
    correctIndex: 1,
    explanationUz: 'Hazrati Usmon ibn Affon roziyallohu anhu avval Ruqayya (r.a.)ga, u zot vafot etganlaridan keyin esa Ummu Kulsum (r.a.)ga uylanganlari uchun «Zunnurayn» deb nomlanganlar.',
    source: 'Siyaru Aʼlomin Nubalo (Imom Zahabiy)',
    reference: 'Xulafoyi Roshidin: Usmon ibn Affon bobi',
    difficulty: 'oson',
    publishedDate: '2026-11-05',
    isApproved: true,
    sourceVerified: true,
    status: 'approved',
  },
  {
    id: 'q-032',
    category: 'Sahobalar',
    questionUz: 'Vahiy kotibi boʻlgan va Hazrati Abu Bakr hamda Usmon (r.a.) davrlarida Qurʼoni Karimni jamlash ishiga boshchilik qilgan sahoba kim?',
    optionsUz: ['Abdulloh ibn Masʼud (r.a.)', 'Zayd ibn Sobit (r.a.)', 'Ubay ibn Kaʼb (r.a.)', 'Muoz ibn Jabal (r.a.)'],
    correctIndex: 1,
    explanationUz: 'Zayd ibn Sobit roziyallohu anhu yosh va zukko vahiy kotibi boʻlib, Abu Bakr Siddiq (r.a.) buyrugʻi bilan Qurʼon sahifalarini birinchi bor jamlaganlar.',
    source: 'Sahihi Buxoriy',
    reference: 'Fazoilul Qurʼon kitobi, 4986-hadis',
    difficulty: 'orta',
    publishedDate: '2026-11-05',
    isApproved: true,
    sourceVerified: true,
    status: 'approved',
  },
  {
    id: 'q-033',
    category: 'Sahobalar',
    questionUz: 'Rasululloh (s.a.v.) Yaman ahliga muallim va qozi qilib yuborgan, «ummatimning halol va haromni eng yaxshi biluvchisi» deb maqtagan sahoba kim?',
    optionsUz: ['Muoz ibn Jabal (r.a.)', 'Abu Muso al-Ashʼariy (r.a.)', 'Amr ibn Os (r.a.)', 'Huzayfa ibn Yamon (r.a.)'],
    correctIndex: 0,
    explanationUz: 'Muoz ibn Jabal roziyallohu anhuni Paygʻambarimiz (s.a.v.) Yamanga yuborayotib Qurʼon, Sunnat va ijtihod bilan hukm chiqarish haqida mashhur suhbat oʻtkazganlar.',
    source: 'Sahihi Buxoriy; Sunani Termiziy',
    reference: 'Buxoriy 1458-hadis; Termiziy 3790-hadis',
    difficulty: 'orta',
    publishedDate: '2026-11-05',
    isApproved: true,
    sourceVerified: true,
    status: 'approved',
  },
  {
    id: 'q-034',
    category: 'Sahobalar',
    questionUz: 'Islomni qabul qilishi bilan Makkadagi musulmonlar Kaʼba oldida ochiq namoz oʻqiy boshlagan va «Al-Foruq» unvonini olgan sahoba kim?',
    optionsUz: ['Hamza ibn Abdulmuttalib (r.a.)', 'Umar ibn Xattob (r.a.)', 'Saʼd ibn Abu Vaqqos (r.a.)', 'Abdurrahmon ibn Avf (r.a.)'],
    correctIndex: 1,
    explanationUz: 'Abdulloh ibn Masʼud (r.a.) aytadilar: «Umar Islomga kirganidan beri biz hamisha aziz (quvvatli) boʻldik». U zot haq bilan botilni ajratuvchi «Al-Foruq» deb atalganlar.',
    source: 'Sahihi Buxoriy',
    reference: 'Manoqibus Sahoba kitobi, 3684-hadis',
    difficulty: 'oson',
    publishedDate: '2026-11-05',
    isApproved: true,
    sourceVerified: true,
    status: 'approved',
  },
];

/**
 * Verifies that a question has a valid, non-empty source reference,
 * is approved, and is not rejected.
 */
export function isQuestionPublishable(q: QuizQuestionItem): boolean {
  if (!q || !q.isApproved || q.status === 'rejected') {
    return false;
  }
  if (q.sourceVerified === false) {
    return false;
  }
  if (!q.source || q.source.trim().length < 3) {
    return false;
  }
  if (!q.questionUz || q.questionUz.trim().length === 0) {
    return false;
  }
  if (!Array.isArray(q.optionsUz) || q.optionsUz.length !== 4) {
    return false;
  }
  return true;
}

/**
 * Deterministic PRNG seeded by date string (e.g. "2026-11-05")
 */
function createDateSeed(dateStr: string): () => number {
  let seed = 2166136261;
  for (let i = 0; i < dateStr.length; i++) {
    seed ^= dateStr.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function deterministicShuffle<T>(items: T[], rand: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generates a deterministic, non-repeating 10-question DailyQuizSet for a given date (YYYY-MM-DD).
 * - Filters out unapproved or unverified-source questions.
 * - Deduplicates by ID and normalized question text.
 * - Avoids recently used question IDs when enough fresh questions exist.
 */
export function generateDeterministicDailyQuiz(
  dateStr: string,
  customQuestions: QuizQuestionItem[] = [],
  recentQuestionIds: Set<string> = new Set()
): DailyQuizSet {
  const combined = [...customQuestions, ...VERIFIED_QUIZ_BANK];
  const uniqueMap = new Map<string, QuizQuestionItem>();
  const seenTexts = new Set<string>();

  for (const q of combined) {
    if (!isQuestionPublishable(q)) continue;
    const normText = q.questionUz.trim().toLowerCase();
    if (!uniqueMap.has(q.id) && !seenTexts.has(normText)) {
      uniqueMap.set(q.id, q);
      seenTexts.add(normText);
    }
  }

  const allPublishable = Array.from(uniqueMap.values());
  const freshPool = allPublishable.filter((q) => !recentQuestionIds.has(q.id));
  const fallbackPool = allPublishable.filter((q) => recentQuestionIds.has(q.id));

  const rand = createDateSeed(dateStr);
  const shuffledFresh = deterministicShuffle(freshPool, rand);
  const shuffledFallback = deterministicShuffle(fallbackPool, rand);

  const selected = [...shuffledFresh, ...shuffledFallback].slice(0, 10);
  const nowIso = new Date().toISOString();
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });

  return {
    id: dateStr,
    dateStr,
    questions: selected,
    questionIds: selected.map((q) => q.id),
    isScheduledByAdmin: false,
    isArchived: dateStr < todayStr,
    createdAt: nowIso,
    updatedAt: nowIso,
    schemaVersion: 1,
  };
}

/**
 * Returns exactly 10 deterministic, non-repeating questions for a given calendar date (YYYY-MM-DD).
 */
export function getDailyQuizQuestionsForDate(
  dateStr: string,
  customQuestions: QuizQuestionItem[] = []
): QuizQuestionItem[] {
  return generateDeterministicDailyQuiz(dateStr, customQuestions).questions;
}

export function getAllQuizQuestions(): QuizQuestionItem[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('asaka_ziyo_quiz_questions_v5_admin');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map<string, QuizQuestionItem>();
          for (const q of [...parsed, ...VERIFIED_QUIZ_BANK]) {
            if (!map.has(q.id)) map.set(q.id, q);
          }
          return Array.from(map.values());
        }
      }
    }
  } catch {
    // fallback
  }
  return VERIFIED_QUIZ_BANK;
}

export function addCustomQuizQuestion(q: Omit<QuizQuestionItem, 'id'>): QuizQuestionItem {
  const newItem: QuizQuestionItem = {
    ...q,
    id: `q-custom-${Date.now()}`,
    isApproved: q.isApproved ?? true,
    sourceVerified: q.sourceVerified ?? Boolean(q.source && q.source.trim().length >= 3),
    status: q.status || 'approved',
    publishedDate: q.publishedDate || new Date().toISOString().slice(0, 10),
  };
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('asaka_ziyo_custom_quiz_questions');
      const list: QuizQuestionItem[] = saved ? JSON.parse(saved) : [];
      list.push(newItem);
      localStorage.setItem('asaka_ziyo_custom_quiz_questions', JSON.stringify(list));
    }
  } catch {
    // fallback
  }
  return newItem;
}
