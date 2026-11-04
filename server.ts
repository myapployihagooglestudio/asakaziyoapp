import express, { Request, Response } from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'asaka_ziyo_db.json');

app.use(express.json({ limit: '15mb' }));

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Authentic Hadiths seed for central persistence
const AUTHENTIC_HADITHS_SEED = [
  {
    id: 'h-1',
    collection: 'bukhari',
    collectionNameUz: 'Sahihi Buxoriy',
    number: 1,
    chapterUz: 'Vahiyning boshlanishi va Niyat bobi',
    narratorUz: 'Umar ibn Xattob roziyallohu anhu',
    textAr: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى، فَمَنْ كَانَتْ هِجْرَتُهُ إِلَى دُنْيَا يُصِيبُهَا أَوْ إِلَى امْرَأَةٍ يَنْكِحُهَا، فَهِجْرَتُهُ إِلَى مَا هَاجَرَ إِلَيْهِ',
    translationUz: '«Albatta, amallar niyatlarga bogʻliqdir. Har bir kishi uchun niyat qilgan narsasi boʻladi. Bas, kimning hijrati dunyo matohiga yetishish yoki ayolga uylanish uchun boʻlsa, uning hijrati oʻsha koʻzlangan narsasigadir».',
    grade: 'Sahih',
    reference: 'Sahih al-Buxoriy, 1-hadis',
    keywords: ['niyat', 'amal', 'ixlos', 'hijrat']
  },
  {
    id: 'h-2',
    collection: 'bukhari',
    collectionNameUz: 'Sahihi Buxoriy',
    number: 13,
    chapterUz: 'Iymon kitobi',
    narratorUz: 'Anas ibn Molik roziyallohu anhu',
    textAr: 'لاَ يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ',
    translationUz: '«Sizlardan birortangiz oʻzi uchun yaxshi koʻrgan narsani birodari uchun ham ravo koʻrmaguncha haqiqiy moʻmin boʻla olmaydi».',
    grade: 'Sahih',
    reference: 'Sahih al-Buxoriy, 13-hadis; Sahih Muslim, 45-hadis',
    keywords: ['iymon', 'birodarlik', 'mehr', 'saxovat']
  },
  {
    id: 'h-3',
    collection: 'muslim',
    collectionNameUz: 'Sahihi Muslim',
    number: 38,
    chapterUz: 'Bir-biriga yordam berish va musibatni aritish',
    narratorUz: 'Abu Hurayra roziyallohu anhu',
    textAr: 'مَنْ نَفَّسَ عَنْ مُؤْمِنٍ كُرْبَةً مِنْ كُرَبِ الدُّنْيَا نَفَّسَ اللَّهُ عَنْهُ كُرْبَةً مِنْ كُرَبِ يَوْمِ الْقِيَامَةِ، وَمَنْ يَسَّرَ عَلَى مُعْسِرٍ يَسَّرَ اللَّهُ عَلَيْهِ فِي الدُّنْيَا وَالآخِرَةِ',
    translationUz: '«Kim bir moʻminning dunyo gʻamlaridan birini aritsa, Alloh undan Qiyomat kunining gʻamlaridan birini aritadi. Kim qiyinchilikka uchragan kishiga yengillik tugʻdirsa, Alloh unga dunyo-yu oxiratda yengillik beradi».',
    grade: 'Sahih',
    reference: 'Sahih Muslim, 2699-hadis',
    keywords: ['koʻmak', 'yengillik', 'muruvvat', 'ajr']
  },
  {
    id: 'h-4',
    collection: 'nawawi',
    collectionNameUz: 'Arbaʼin (Navaviy 40 Hadis)',
    number: 18,
    chapterUz: 'Taqvo va goʻzal xulq',
    narratorUz: 'Abu Zarr va Muoz ibn Jabal roziyallohu anhumo',
    textAr: 'اتَّقِ اللَّهَ حَيْثُمَا كُنْتَ، وَأَتْبِعِ السَّيِّئَةَ الْحَسَنَةَ تَمْحُهَا، وَخَالِقِ النَّاسَ بِخُلُقٍ حَسَنٍ',
    translationUz: '«Qayerda boʻlsang ham Allohga taqvo qil! Yomonlik ketidan yaxshilik qil, uni oʻchirib yuboradi. Odamlar bilan goʻzal xulq ila muomala qil!».',
    grade: 'Hasan',
    reference: 'Sunani Termiziy, 1987-hadis; Imom Navaviy toʻplami',
    keywords: ['taqvo', 'tavba', 'goʻzal xulq', 'muomala']
  },
  {
    id: 'h-5',
    collection: 'bukhari',
    collectionNameUz: 'Sahihi Buxoriy',
    number: 6011,
    chapterUz: 'Odob va silai rahm kitobi',
    narratorUz: 'Abdulloh ibn Amr roziyallohu anhu',
    textAr: 'الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ',
    translationUz: '«Haqiqiy musulmon — tili va qoʻlidan boshqa musulmonlar omonda boʻlgan kishidir».',
    grade: 'Sahih',
    reference: 'Sahih al-Buxoriy, 6011-hadis',
    keywords: ['odob', 'omonlik', 'salomatlik', 'tinchlik']
  }
];

// Authentic Dhikrs seed for central persistence
const AUTHENTIC_DHIKRS_SEED = [
  {
    id: 'd-1',
    category: 'sayyidul_istigfor',
    categoryTitleUz: 'Sayyidul Istigʻfor',
    titleUz: 'Istigʻforlarning Sayyidi (eng ulugʻi)',
    textAr: 'اللَّهُمَّ أَنْتَ رَبِّي لاَ إِلَهَ إِلاَّ أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لاَ يَغْفِرُ الذُّنُوبَ إِلاَّ أَنْتَ',
    transliterationUz: 'Allohumma Anta Robbiy laa ilaha illa Anta, xolaqtaniy va ana ʻabduka, va ana ʻala ʻahdika va vaʼdika mastataʼtu, aʼuzu bika min sharri ma sonaʼtu, abuuʼu laka biniʼmatika ʻalayya va abuuʼu bizanbiy fagʻfir liy, fainnahu laa yagʻfiruz-zunuba illa Anta.',
    translationUz: '«Yo Alloh! Sen mening Robbimsan, Sendan oʻzga iloh yoʻq. Meni Sen yaratding va men Sening qulingman. Men qurbim yetguncha Sening ahding va vaʼdangdaman. Qilgan ishlarim yomonligidan Sendan panoh soʻrayman. Menga bergan neʼmatingni eʼtirof qilaman va gunohlarimni tan olaman. Bas, meni magʻfirat qilgin, chunki gunohlarni faqat Sengina kechirasan».',
    targetCount: 1,
    virtueUz: 'Rasululloh ﷺ: «Kim bu duoni kunduzi sidqidildan aytsa va shu kuni kech kirgunicha vafot etsa, jannat ahlidan boʻladi. Kim uni kechasi sidqidildan aytib, tong otguncha vafot etsa, u ham jannat ahlidandir».',
    source: 'Sahih al-Buxoriy, 6306-hadis'
  },
  {
    id: 'd-2',
    category: 'namozdan_keyin',
    categoryTitleUz: 'Namozdan keyingi tasbeh',
    titleUz: 'Subhanalloh (33 marta)',
    textAr: 'سُبْحَانَ اللَّهِ',
    transliterationUz: 'Subhanalloh',
    translationUz: '«Alloh barcha ayb-nuqsonlardan pokdir».',
    targetCount: 33,
    virtueUz: 'Farz namozlardan soʻng aytiladigan mashhur tasbehning birinchi qismi.',
    source: 'Sahih Muslim, 597-hadis'
  },
  {
    id: 'd-3',
    category: 'namozdan_keyin',
    categoryTitleUz: 'Namozdan keyingi tasbeh',
    titleUz: 'Alhamdulilloh (33 marta)',
    textAr: 'الْحَمْدُ لِلَّهِ',
    transliterationUz: 'Alhamdulilloh',
    translationUz: '«Barcha hamd va shukronalar Allohga xosdir».',
    targetCount: 33,
    virtueUz: 'Qalbga shukr va xotirjamlik bagʻishlaydigan ulugʻ kalima.',
    source: 'Sahih Muslim, 597-hadis'
  },
  {
    id: 'd-4',
    category: 'namozdan_keyin',
    categoryTitleUz: 'Namozdan keyingi tasbeh',
    titleUz: 'Allohu Akbar (33 marta)',
    textAr: 'اللَّهُ أَكْبَرُ',
    transliterationUz: 'Allohu Akbar',
    translationUz: '«Alloh har narsadan Buyukdir».',
    targetCount: 33,
    virtueUz: '33 martadan takrorlanib, yuzinchisida tavhid kalimasi bilan yakunlanadi.',
    source: 'Sahih Muslim, 597-hadis'
  },
  {
    id: 'd-5',
    category: 'tonggi',
    categoryTitleUz: 'Tonggi zikrlar',
    titleUz: 'Tonggi shukronalik va panoh duosi',
    textAr: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    transliterationUz: 'Asbahna va asbahal mulku lillah, valhamdu lillah, laa ilaha illallohu vahdahu laa shariyka lah, lahul mulku va lahul hamdu va huva ʻala kulli shayʼin qodiyr.',
    translationUz: '«Biz ham tong ottirdik, butun mulk ham Allohnikiligicha tong ottirdi. Barcha hamd Allohga xosdir. Yagona Allohdan oʻzga iloh yoʻq, Uning sherigi ham yoʻqdir. Mulk ham, maqtov ham Unikidir va U har narsaga qodirdir».',
    targetCount: 1,
    virtueUz: 'Kunning xayr-barakasi va har qanday zarardan omonda boʻlish uchun moʻtabar tonggi duo.',
    source: 'Sahih Muslim, 2723-hadis'
  }
];

// Default initial database schema
const getDefaultDatabase = () => ({
  prayerSchedule: {
    date: '2026-11-03',
    formattedDateUz: '3-Noyabr, Seshanba, 2026',
    hijriDate: '23 Jumodul avval, 1448',
    location: 'Asaka shahri, Andijon viloyati',
    qiblaAngleDeg: 241,
    timezone: 'Asia/Tashkent',
    isAdministratorPublished: true,
    publishedBy: 'Asaka Jome Masjidi Maʼmuriyati',
    verifiedAt: '2026-11-03 05:00',
    disclaimer: 'Asaka shahri va mintaqa uchun rasmiy tasdiqlangan namoz vaqtlari jadvali.',
    times: [
      { id: 'p-0', key: 'tahajjud', nameUz: 'Tahajjud', nameAr: 'التَّهَجُّد', time: '03:45', descriptionUz: 'Kechasi uyqudan uygʻonib oʻqiladigan qimmatli nafl namozi' },
      { id: 'p-01', key: 'subh', nameUz: 'Subh (Saharlik)', nameAr: 'الصُّبْح', time: '04:40', descriptionUz: 'Subhi sodiq kirishi, saharlik (imsoq) toʻxtash vaqti' },
      { id: 'p-1', key: 'bomdod', nameUz: 'Bomdod', nameAr: 'الفَجْر', time: '05:22', iqamahTime: '05:50', descriptionUz: 'Tong yorishishidan quyosh chiqishigacha boʻlgan vaqt' },
      { id: 'p-2', key: 'quyosh', nameUz: 'Quyosh', nameAr: 'الشُّرُوق', time: '06:46', descriptionUz: 'Quyosh koʻtarilishi (namoz oʻqish makruh boʻlgan vaqt)' },
      { id: 'p-3', key: 'peshin', nameUz: 'Peshin', nameAr: 'الظُّهْر', time: '12:05', iqamahTime: '12:25', descriptionUz: 'Quyosh tikkadan oqqandan asrgacha boʻlgan vaqt' },
      { id: 'p-4', key: 'asr', nameUz: 'Asr', nameAr: 'العَصْر', time: '15:10', iqamahTime: '15:30', descriptionUz: 'Har bir narsaning soyasi oʻziga teng boʻlgandan quyosh botguncha' },
      { id: 'p-5', key: 'shom', nameUz: 'Shom', nameAr: 'المَغْرِب', time: '17:21', iqamahTime: '17:26', descriptionUz: 'Quyosh toʻliq botgandan soʻnggi shafaq yoʻqolguncha' },
      { id: 'p-6', key: 'xufton', nameUz: 'Xufton', nameAr: 'العِشَاء', time: '18:42', iqamahTime: '19:05', descriptionUz: 'Qizil shafaq botgandan soʻnggi tong otguncha boʻlgan vaqt' }
    ]
  },
  articles: [
    {
      id: 'art-1',
      title: 'Qurʼon qiroati va tadabbur odoblari: Qalbni nurlantiruvchi amallar',
      subtitle: 'Kalomullohni shunchaki til bilan emas, butun vujud va tafakkur bilan oʻqishning ruhiy sirlari',
      category: 'Axloq',
      author: 'Abdulloh domla Oʻrinboyev',
      authorRole: 'Islomshunos, Imom-xatib',
      publishedDate: '1-Noyabr, 2026',
      readTimeMinutes: 6,
      featuredImage: '/images/quran_illumination_art_1793634658336.jpg',
      isFeatured: true,
      likesCount: 24,
      ratingsCount: 8,
      rating: 4.9,
      excerpt: 'Qurʼoni Karim — bashariyat uchun hidoyat, shifo va najot manbaidir. Uni oʻqish va tadabbur qilish orqali inson qalbi xotirjamlik topadi.',
      keyQuote: '«Qurʼonni tartil bilan, dona-dona va tushunib oʻqing. Zero, qalb undan quvvat oladi».',
      bodyParagraphs: [
        'Alloh taoloning Kalomi boʻlmish Qurʼoni Karim bandalarga nozil qilingan eng ulugʻ ilohiy dasturdir. Har bir moʻmin uchun ushbu kitobni tilovati va uning maʼnolariga chuqur nazar solish qalb xotirjamligining asosiy sababidir.',
        'Ulamolarimiz bayon qilganlaridek, Qurʼon tilovat qilishning zohiriy va botiniy odoblari mavjud. Zohiriy odoblarga tahoratli boʻlish, pokiza kiyimda, qiblaga yuzlanib, xushuʼ ila oʻtirish kirsa; botiniy odoblarga qalbni dunyoviy gʻalvalardan forigʻ qilish va har bir oyat xitobini aynan oʻziga tegishli deb qabul qilish xosdir.'
      ],
      comments: [
        { id: 'c-1', authorName: 'Ziyovuddin qori', text: 'Mashalloh, juda manfaatli maqola boʻlibdi. Alloh rozi boʻlsin!', timestamp: '2026-11-02 14:20' }
      ]
    },
    {
      id: 'art-2',
      title: 'Islomda vaqt va umr neʼmatining qadri',
      subtitle: 'Boy berilgan soniyalarning oʻrni toʻldirilmasligi va muvozanatli kun tartibi',
      category: 'Hikmat',
      author: 'Ustoz Muzaffarxon Qosimov',
      authorRole: 'Mudarris, tadqiqotchi',
      publishedDate: '28-Oktyabr, 2026',
      readTimeMinutes: 5,
      featuredImage: '/images/islamic_scholarship_library_1793634659800.jpg',
      isFeatured: false,
      likesCount: 19,
      ratingsCount: 5,
      rating: 5.0,
      excerpt: 'Inson hayoti unga berilgan cheklangan nafaslar yigʻindisidir. Har bir oʻtgan kun insonning bir boʻlagi ketganini anglatadi.',
      keyQuote: 'Hasan Basriy: «Ey Odam bolasi! Sen kunlardan iboratsan. Bir kuning ketsa, bir qisming ketdi demakdir».',
      bodyParagraphs: [
        'Alloh taolo bir necha suralarda vaqtga qasam ichadi: «Asrga qasamki...», «Tongga qasamki...», «Kechaga qasamki...». Zotining ulugʻligi bilan vaqtga qasam ichishi uning naqadar qimmatbaho ekanligiga dalolat qiladi.'
      ],
      comments: []
    },
    {
      id: 'art-3',
      title: 'Fargʻona vodiysi va Andijon allomalari: Ilmiy meros va anʼana',
      subtitle: 'Movarounnahr zaminida yetishib chiqqan buyuk faqihlar, muhaddislar va mufassirlar hayotidan lavhalar',
      category: 'Tarix',
      author: 'Faxriddin domla Mamasaidov',
      authorRole: 'Tarixchi-sharqshunos',
      publishedDate: '24-Oktyabr, 2026',
      readTimeMinutes: 8,
      featuredImage: '/images/asaka_islamic_architecture_1793634657962.jpg',
      isFeatured: false,
      likesCount: 31,
      ratingsCount: 9,
      rating: 4.8,
      excerpt: 'Andijon va Asaka zamini azaldan ilm-fan, fiqh va hadis maktablari gullab-yashnagan muqaddas maskanlardan biridir.',
      keyQuote: '«Ilm oʻrganing, chunki u qorongʻulikda mayoq, kimsasizlikda doʻstdir».',
      bodyParagraphs: [
        'Movarounnahr mintaqasi, xususan Fargʻona vodiysi asrlar davomida butun islom olamiga mayoq boʻlgan olimlar beshigi boʻlib kelgan. Imom Margʻinoniyning «Hidoya»si butun dunyoda fiqhning eng nufuzli manbasi sifatida oʻrganiladi.'
      ],
      comments: []
    }
  ],
  mediaPosts: [
    {
      id: 'post-1',
      title: 'Asaka Jome Masjidi: Qalbni junbushga keltiruvchi xushovoz qiroat',
      type: 'reel',
      category: 'Qurʼon qiroati',
      author: 'Asaka Jome Masjidi Imomi',
      publishedDate: 'Bugun, 14:30',
      mediaUrl: 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=1200&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=600&q=80',
      caption: '«Qurʼon oʻqilganda unga jim turib quloq soling, shoyad rahm qilinsangiz». Asaka shahrida juma namozi oldidan oʻqilgan goʻzal tilovat.',
      likesCount: 142,
      commentsCount: 2,
      isPublished: true,
      comments: [
        {
          id: 'c-1',
          targetType: 'post',
          targetId: 'post-1',
          authorName: 'Muzaffarbek (Asaka)',
          text: 'MashaAlloh, juda chiroyli qiroat boʻlibdi. Alloh rozi boʻlsin!',
          createdAt: 'Bugun, 15:10',
          likesCount: 12
        },
        {
          id: 'c-2',
          targetType: 'post',
          targetId: 'post-1',
          authorName: 'Hojiakbar',
          text: 'Asaka masjidimiz yanada obod boʻlsin, qorilarimiz koʻpaysin.',
          createdAt: 'Bugun, 15:45',
          likesCount: 8
        }
      ]
    },
    {
      id: 'post-2',
      title: 'Tahajjud namozining fazilati va duolar qabul boʻladigan palla',
      type: 'video',
      category: 'Nasihat',
      author: 'Ustoz Maʼrufxon',
      publishedDate: 'Kecha',
      mediaUrl: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=1200&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=600&q=80',
      caption: 'Kechasi odamlar uxlaganda oʻqilgan ikki rakaat namoz dunyo va undagi barcha narsalardan yaxshiroqdir. Tahajjud vaqti Asaka jadvalida aks etdi.',
      likesCount: 98,
      commentsCount: 1,
      isPublished: true,
      comments: [
        {
          id: 'c-3',
          targetType: 'post',
          targetId: 'post-2',
          authorName: 'Dilshodbek',
          text: 'Tahajjud va Subh vaqtini ilovaga qoʻshganingiz juda ajoyib boʻlibdi!',
          createdAt: 'Kecha, 21:00',
          likesCount: 5
        }
      ]
    },
    {
      id: 'post-3',
      title: 'Vodiy allomalari: Asakiy va Andijoniy ulamolar merosi haqida',
      type: 'image',
      category: 'Tarix',
      author: 'Tahririyat Hayʼati',
      publishedDate: '30-Oktabr',
      mediaUrl: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&w=1200&q=80',
      thumbnail: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&w=600&q=80',
      caption: 'Movarounnahr faqihlari va Fargʻona vodiysi ulamolari butun dunyo islom ilmiga ulkan hissa qoʻshganlar.',
      likesCount: 67,
      commentsCount: 0,
      isPublished: true,
      comments: []
    }
  ],
  inquiries: [
    {
      id: 'inq-1',
      userName: 'Otabek Mirzayev',
      userPhone: '+998 91 123 45 67',
      subject: 'Asaka namoz vaqtlari boʻyicha savol',
      message: 'Assalomu alaykum. Masjidimizda juma namozi iqomati soat nechada aytiladi? Yangi taqvim boʻyicha maʼlumot bersangiz.',
      createdAt: 'Bugun, 09:30',
      status: 'answered',
      adminReply: 'Va alaykum assalom. Juma namozi Asaka markaziy jome masjidida Peshin vaqti kirishi bilan boshlanadi. Maʼruza 12:20 da, farz namozi 12:45 da oʻqiladi.',
      repliedAt: 'Bugun, 10:15',
      repliedBy: 'Asaka Jome Masjidi Imom-xatibi'
    },
    {
      id: 'inq-2',
      userName: 'Sobirjon',
      userPhone: '',
      subject: 'Qiroat darslari va tajvid toʻgaragi',
      message: 'Yoshlar uchun tajvid va Qurʼon qiroati darslari qaysi kunlari boʻladi?',
      createdAt: 'Kecha, 16:40',
      status: 'new'
    }
  ],
  hadiths: AUTHENTIC_HADITHS_SEED,
  dhikrs: AUTHENTIC_DHIKRS_SEED,
  notifications: [
    {
      id: 'notif-welcome',
      title: 'Asaka Ziyo tizimiga xush kelibsiz!',
      message: 'Asaka jome masjidi rasmiy mobil va veb portaliga xush kelibsiz. 8 namoz vaqtlari va Qurʼon qiroatlari yangilandi.',
      category: 'system',
      priority: 'high',
      timestamp: 'Bugun, 06:00',
      read: false
    },
    {
      id: 'notif-pwa',
      title: 'Ilovani smartfonga oʻrnatish',
      message: 'Tezkor kirish uchun "Bosh ekranga qoʻshish" yoki "APK v1.0" orqali ilovani smartfoningizga oʻrnating.',
      category: 'announcement',
      priority: 'normal',
      timestamp: 'Bugun, 08:00',
      read: false
    }
  ],
  telegramConfig: {
    botToken: '',
    channelId: '@Asaka_Ziyo',
    channel2: '@muhiddinsahhofuz',
    channelTitle: 'ASAKA ZIYO Rasmiy Kanali'
  },
  supabaseConfig: {
    url: '',
    anonKey: '',
    isEnabled: false,
    lastSync: null
  },
  drafts: [
    {
      id: 'draft-1',
      sourceChannel: '@Asaka_Ziyo',
      targetSection: 'prayer',
      title: 'Haftalik Asaka namoz vaqtlari yangilanishi',
      content: 'Hurmatli namozxonlar, Asaka jome masjidi uchun yangi haftalik taqvim: Bomdod 05:22, Peshin 12:05, Asr 15:10, Shom 17:21, Xufton 18:42, Tahajjud 03:45, Subh 04:40.',
      prayerTimesDraft: {
        tahajjud: '03:45',
        subh: '04:40',
        bomdod: '05:22',
        quyosh: '06:46',
        peshin: '12:05',
        asr: '15:10',
        shom: '17:21',
        xufton: '18:42'
      },
      receivedAt: 'Bugun, 08:30',
      status: 'pending'
    },
    {
      id: 'draft-2',
      sourceChannel: '@muhiddinsahhofuz',
      targetSection: 'articles',
      title: 'Ilm va odob: Ustoz Muhiddin Sahhof maʼruzalari asosida',
      content: 'Ilm talab qilish har bir musulmon erkak va ayolga farzdir. Ammo ilmdan oldin odob oʻrganilishi lozim. Abu Hanifa rahmatullohi alayh oʻz shogirdlariga avvalo goʻzal xulqni oʻrgatganlar...',
      mediaUrl: 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=1200&q=80',
      receivedAt: 'Bugun, 09:15',
      status: 'pending'
    }
  ],
  updatedAt: new Date().toISOString()
});

// Load database from file or initialize & migrate
function readDatabase(): any {
  let data: any = null;
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      data = JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading database file, re-initializing:', err);
  }

  const defaultData = getDefaultDatabase();
  if (!data) {
    writeDatabase(defaultData);
    return defaultData;
  }

  // Safe non-destructive normalization and migration
  let needsSave = false;

  if (!data.prayerSchedule || !Array.isArray(data.prayerSchedule.times)) {
    data.prayerSchedule = defaultData.prayerSchedule;
    needsSave = true;
  }

  if (!Array.isArray(data.articles)) {
    data.articles = defaultData.articles;
    needsSave = true;
  }

  if (!Array.isArray(data.mediaPosts)) {
    data.mediaPosts = defaultData.mediaPosts;
    needsSave = true;
  } else {
    // Normalize media post fields to canonical MediaPost interface
    data.mediaPosts = data.mediaPosts.map((p: any) => ({
      id: p.id || `post-${Date.now()}`,
      title: p.title || 'Asaka Ziyo Media',
      type: p.type || p.mediaType || 'reel',
      mediaUrl: p.mediaUrl || '',
      thumbnail: p.thumbnail || p.mediaUrl || '',
      caption: p.caption || p.description || '',
      author: p.author || 'Asaka Jome Masjidi Imomi',
      publishedDate: p.publishedDate || 'Bugun',
      category: p.category || 'Ijtimoiy',
      likesCount: p.likesCount || 0,
      commentsCount: p.commentsCount || (Array.isArray(p.comments) ? p.comments.length : 0),
      isPublished: p.isPublished !== undefined ? p.isPublished : true,
      comments: Array.isArray(p.comments) ? p.comments : []
    }));
  }

  if (!Array.isArray(data.hadiths)) {
    data.hadiths = defaultData.hadiths;
    needsSave = true;
  }

  if (!Array.isArray(data.dhikrs)) {
    data.dhikrs = defaultData.dhikrs;
    needsSave = true;
  }

  if (!Array.isArray(data.inquiries)) {
    data.inquiries = defaultData.inquiries;
    needsSave = true;
  }

  if (!Array.isArray(data.notifications)) {
    data.notifications = defaultData.notifications;
    needsSave = true;
  }

  if (!Array.isArray(data.drafts)) {
    data.drafts = defaultData.drafts;
    needsSave = true;
  }

  if (!data.telegramConfig) {
    data.telegramConfig = defaultData.telegramConfig;
    needsSave = true;
  }

  if (!data.supabaseConfig) {
    data.supabaseConfig = defaultData.supabaseConfig;
    needsSave = true;
  }

  if (needsSave) {
    writeDatabase(data);
  }

  return data;
}

// Write database atomically to disk
function writeDatabase(data: any): boolean {
  try {
    data.updatedAt = new Date().toISOString();
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
    return true;
  } catch (err) {
    console.error('Error writing database to disk:', err);
    return false;
  }
}

// ---------------- REST API ENDPOINTS ----------------

// 1. Health & Server Ping
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'ASAKA ZIYO',
    serverTime: new Date().toISOString(),
    databasePersisted: fs.existsSync(DB_FILE)
  });
});

// 2. Full Central Database Sync
app.get('/api/database', (_req: Request, res: Response) => {
  const db = readDatabase();
  res.json({ success: true, data: db });
});

// 3. Save / Update 8 Prayer Times
app.post('/api/database/prayer', (req: Request, res: Response) => {
  const { schedule } = req.body;
  if (!schedule || !schedule.times) {
    return res.status(400).json({ success: false, error: 'Invalid prayer schedule payload' });
  }

  const db = readDatabase();
  db.prayerSchedule = schedule;
  writeDatabase(db);

  res.json({ success: true, schedule: db.prayerSchedule, updatedAt: db.updatedAt });
});

// 4. Articles Management & Interaction (CRUD, Like, Rate, Comment)
app.post('/api/database/articles', (req: Request, res: Response) => {
  const { action, article, id, rating, comment } = req.body;
  const db = readDatabase();
  if (!Array.isArray(db.articles)) db.articles = [];

  switch (action) {
    case 'create':
    case 'save': {
      if (!article || !article.title) {
        return res.status(400).json({ success: false, error: 'Article payload required' });
      }
      const existingIdx = db.articles.findIndex((a: any) => a.id === article.id);
      if (existingIdx >= 0) {
        db.articles[existingIdx] = { ...db.articles[existingIdx], ...article };
      } else {
        db.articles.unshift(article);
      }
      break;
    }
    case 'delete': {
      db.articles = db.articles.filter((a: any) => a.id !== id);
      break;
    }
    case 'like': {
      const art = db.articles.find((a: any) => a.id === id);
      if (art) art.likesCount = (art.likesCount || 0) + 1;
      break;
    }
    case 'rate': {
      const art = db.articles.find((a: any) => a.id === id);
      if (art) {
        const curCount = art.ratingsCount || 0;
        const curRating = art.rating || 5;
        const newCount = curCount + 1;
        art.rating = parseFloat(((curRating * curCount + Number(rating)) / newCount).toFixed(1));
        art.ratingsCount = newCount;
      }
      break;
    }
    case 'comment': {
      const art = db.articles.find((a: any) => a.id === id);
      if (art) {
        if (!Array.isArray(art.comments)) art.comments = [];
        art.comments.push({
          id: `comm-${Date.now()}`,
          authorName: comment?.authorName || 'Foydalanuvchi',
          text: comment?.text || '',
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16)
        });
      }
      break;
    }
    default:
      return res.status(400).json({ success: false, error: 'Unknown articles action' });
  }

  writeDatabase(db);
  res.json({ success: true, articles: db.articles });
});

// 5. Media & Reels Posts Management (CRUD, Like, Comment)
app.post('/api/database/media', (req: Request, res: Response) => {
  const { action, post, id, comment } = req.body;
  const db = readDatabase();
  if (!Array.isArray(db.mediaPosts)) db.mediaPosts = [];

  switch (action) {
    case 'create':
    case 'save': {
      if (!post || !post.title) {
        return res.status(400).json({ success: false, error: 'Media post payload required' });
      }
      const canonicalPost = {
        id: post.id || `post-${Date.now()}`,
        title: post.title,
        type: post.type || post.mediaType || 'reel',
        mediaUrl: post.mediaUrl || '',
        thumbnail: post.thumbnail || post.mediaUrl || '',
        caption: post.caption || post.description || '',
        author: post.author || 'Asaka Ziyo Studiyasi',
        publishedDate: post.publishedDate || 'Bugun',
        category: post.category || 'Qurʼon qiroati',
        likesCount: post.likesCount || 0,
        commentsCount: post.commentsCount || (Array.isArray(post.comments) ? post.comments.length : 0),
        isPublished: post.isPublished !== undefined ? post.isPublished : true,
        comments: Array.isArray(post.comments) ? post.comments : []
      };

      const existingIdx = db.mediaPosts.findIndex((p: any) => p.id === canonicalPost.id);
      if (existingIdx >= 0) {
        db.mediaPosts[existingIdx] = { ...db.mediaPosts[existingIdx], ...canonicalPost };
      } else {
        db.mediaPosts.unshift(canonicalPost);
      }
      break;
    }
    case 'delete': {
      db.mediaPosts = db.mediaPosts.filter((p: any) => p.id !== id);
      break;
    }
    case 'like': {
      const p = db.mediaPosts.find((item: any) => item.id === id);
      if (p) p.likesCount = (p.likesCount || 0) + 1;
      break;
    }
    case 'comment': {
      const p = db.mediaPosts.find((item: any) => item.id === id);
      if (p) {
        if (!Array.isArray(p.comments)) p.comments = [];
        p.comments.push({
          id: `mc-${Date.now()}`,
          authorName: comment?.authorName || 'Foydalanuvchi',
          text: comment?.text || '',
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16)
        });
        p.commentsCount = p.comments.length;
      }
      break;
    }
    default:
      return res.status(400).json({ success: false, error: 'Unknown media action' });
  }

  writeDatabase(db);
  res.json({ success: true, mediaPosts: db.mediaPosts });
});

// 6. Hadiths Management (CRUD)
app.post('/api/database/hadiths', (req: Request, res: Response) => {
  const { action, hadith, id } = req.body;
  const db = readDatabase();
  if (!Array.isArray(db.hadiths)) db.hadiths = [];

  switch (action) {
    case 'create':
    case 'save': {
      if (!hadith || !hadith.textAr) {
        return res.status(400).json({ success: false, error: 'Hadith payload required' });
      }
      const existingIdx = db.hadiths.findIndex((h: any) => h.id === hadith.id);
      if (existingIdx >= 0) {
        db.hadiths[existingIdx] = { ...db.hadiths[existingIdx], ...hadith };
      } else {
        db.hadiths.unshift(hadith);
      }
      break;
    }
    case 'delete': {
      db.hadiths = db.hadiths.filter((h: any) => h.id !== id);
      break;
    }
    default:
      return res.status(400).json({ success: false, error: 'Unknown hadith action' });
  }

  writeDatabase(db);
  res.json({ success: true, hadiths: db.hadiths });
});

// 7. Dhikrs Management (CRUD)
app.post('/api/database/dhikrs', (req: Request, res: Response) => {
  const { action, dhikr, id } = req.body;
  const db = readDatabase();
  if (!Array.isArray(db.dhikrs)) db.dhikrs = [];

  switch (action) {
    case 'create':
    case 'save': {
      if (!dhikr || !dhikr.titleUz) {
        return res.status(400).json({ success: false, error: 'Dhikr payload required' });
      }
      const existingIdx = db.dhikrs.findIndex((d: any) => d.id === dhikr.id);
      if (existingIdx >= 0) {
        db.dhikrs[existingIdx] = { ...db.dhikrs[existingIdx], ...dhikr };
      } else {
        db.dhikrs.unshift(dhikr);
      }
      break;
    }
    case 'delete': {
      db.dhikrs = db.dhikrs.filter((d: any) => d.id !== id);
      break;
    }
    default:
      return res.status(400).json({ success: false, error: 'Unknown dhikr action' });
  }

  writeDatabase(db);
  res.json({ success: true, dhikrs: db.dhikrs });
});

// 8. Notifications Broadcast & Management
app.get('/api/database/notifications', (_req: Request, res: Response) => {
  const db = readDatabase();
  res.json({ success: true, notifications: db.notifications || [] });
});

app.post('/api/database/notifications', (req: Request, res: Response) => {
  const { action, notification, id } = req.body;
  const db = readDatabase();
  if (!Array.isArray(db.notifications)) db.notifications = [];

  switch (action) {
    case 'create':
    case 'save':
    case 'broadcast': {
      if (!notification || !notification.title) {
        return res.status(400).json({ success: false, error: 'Notification payload required' });
      }
      const newNotif = {
        id: notification.id || `notif-${Date.now()}`,
        title: notification.title,
        message: notification.message || '',
        category: notification.category || 'announcement',
        priority: notification.priority || 'high',
        timestamp: notification.timestamp || new Date().toISOString().replace('T', ' ').slice(0, 16),
        read: false
      };
      db.notifications.unshift(newNotif);
      break;
    }
    case 'delete': {
      db.notifications = db.notifications.filter((n: any) => n.id !== id);
      break;
    }
    default:
      return res.status(400).json({ success: false, error: 'Unknown notification action' });
  }

  writeDatabase(db);
  res.json({ success: true, notifications: db.notifications });
});

// 9. User Inquiries & Support Chat (User Submit, Admin Reply, Delete)
app.post('/api/database/inquiries', (req: Request, res: Response) => {
  const { action, inquiry, id, replyText } = req.body;
  const db = readDatabase();
  if (!Array.isArray(db.inquiries)) db.inquiries = [];

  switch (action) {
    case 'submit': {
      if (!inquiry || !inquiry.message) {
        return res.status(400).json({ success: false, error: 'Inquiry message required' });
      }
      const newInq = {
        id: `inq-${Date.now()}`,
        userName: inquiry.userName || 'Foydalanuvchi',
        userPhone: inquiry.userPhone || '',
        subject: inquiry.subject || 'Diniy-maʼrifiy savol',
        message: inquiry.message,
        createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        status: 'pending'
      };
      db.inquiries.unshift(newInq);
      break;
    }
    case 'reply': {
      const inq = db.inquiries.find((item: any) => item.id === id);
      if (inq) {
        inq.adminReply = replyText;
        inq.status = 'answered';
        inq.repliedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
      }
      break;
    }
    case 'delete': {
      db.inquiries = db.inquiries.filter((item: any) => item.id !== id);
      break;
    }
    default:
      return res.status(400).json({ success: false, error: 'Unknown inquiry action' });
  }

  writeDatabase(db);
  res.json({ success: true, inquiries: db.inquiries });
});

// 10. Telegram Configuration & Server-Side Broadcasting
app.post('/api/database/telegram', (req: Request, res: Response) => {
  const { botToken, channelId, channel2 } = req.body;
  const db = readDatabase();
  db.telegramConfig = {
    ...db.telegramConfig,
    botToken: botToken !== undefined ? botToken : db.telegramConfig.botToken,
    channelId: channelId || '@Asaka_Ziyo',
    channel2: channel2 || '@muhiddinsahhofuz'
  };
  writeDatabase(db);
  res.json({ success: true, telegramConfig: db.telegramConfig });
});

// Proxy route for Telegram message sending to avoid browser CORS and hide keys
app.post('/api/telegram/broadcast', async (req: Request, res: Response) => {
  const { message, token, channel } = req.body;
  const db = readDatabase();
  const effectiveToken = token || db.telegramConfig?.botToken;
  const targetChannel = channel || db.telegramConfig?.channelId || '@Asaka_Ziyo';

  if (!effectiveToken) {
    return res.status(400).json({
      success: false,
      error: 'Telegram Bot Token belgilanmagan. Iltimos, BotFather orqali olingan tokenni kiriting.'
    });
  }

  try {
    const url = `https://api.telegram.org/bot${effectiveToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChannel,
        text: message,
        parse_mode: 'HTML'
      })
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      return res.status(400).json({
        success: false,
        error: data.description || 'Telegram API xatosi'
      });
    }

    res.json({ success: true, result: data.result, targetChannel });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Tarmoq xatosi' });
  }
});

// 11. Supabase Configuration & Status
app.post('/api/database/supabase', (req: Request, res: Response) => {
  const { url, anonKey, isEnabled } = req.body;
  const db = readDatabase();
  db.supabaseConfig = {
    url: url || '',
    anonKey: anonKey || '',
    isEnabled: Boolean(isEnabled),
    lastSync: isEnabled ? new Date().toISOString() : null
  };
  writeDatabase(db);
  res.json({ success: true, supabaseConfig: db.supabaseConfig });
});

// 12. Telegram Channel Drafts & Moderation Queue
app.get('/api/database/drafts', (_req: Request, res: Response) => {
  const db = readDatabase();
  res.json({ success: true, drafts: db.drafts || [] });
});

app.post('/api/database/drafts', (req: Request, res: Response) => {
  const { action, draft, id, reviewer } = req.body;
  const db = readDatabase();
  if (!Array.isArray(db.drafts)) db.drafts = [];

  switch (action) {
    case 'create': {
      if (!draft || !draft.title) {
        return res.status(400).json({ success: false, error: 'Draft payload required' });
      }
      const newDraft = {
        id: `draft-${Date.now()}`,
        sourceChannel: draft.sourceChannel || '@Asaka_Ziyo',
        targetSection: draft.targetSection || 'prayer',
        title: draft.title,
        content: draft.content || '',
        prayerTimesDraft: draft.prayerTimesDraft,
        mediaUrl: draft.mediaUrl,
        receivedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        status: 'pending'
      };
      db.drafts.unshift(newDraft);
      break;
    }
    case 'approve': {
      const target = db.drafts.find((d: any) => d.id === id);
      if (!target) {
        return res.status(404).json({ success: false, error: 'Draft topilmadi' });
      }
      target.status = 'approved';
      target.reviewedBy = reviewer || 'Bosh Administrator';
      target.reviewedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);

      // Apply to exact destination
      if (target.targetSection === 'prayer' && target.prayerTimesDraft) {
        const pDraft = target.prayerTimesDraft;
        db.prayerSchedule.times = db.prayerSchedule.times.map((item: any) => {
          if (pDraft[item.key]) {
            return { ...item, time: pDraft[item.key] };
          }
          return item;
        });
        db.prayerSchedule.isAdministratorPublished = true;
        db.prayerSchedule.publishedBy = `${target.sourceChannel} orqali tasdiqlandi`;
        db.prayerSchedule.verifiedAt = target.reviewedAt;
      } else if (target.targetSection === 'articles') {
        if (!Array.isArray(db.articles)) db.articles = [];
        db.articles.unshift({
          id: `art-${Date.now()}`,
          title: target.title,
          subtitle: `${target.sourceChannel} rasmiy kanalidan tasdiqlangan nashr`,
          category: 'Axloq',
          author: target.sourceChannel === '@muhiddinsahhofuz' ? 'Ustoz Muhiddin Sahhof' : 'Asaka Jome Masjidi Imomi',
          authorRole: 'Rasmiy kanal tahririyati',
          publishedDate: 'Bugun',
          readTimeMinutes: 4,
          featuredImage: target.mediaUrl || '/images/quran_illumination_art_1793634658336.jpg',
          isFeatured: true,
          likesCount: 15,
          ratingsCount: 3,
          rating: 5.0,
          excerpt: target.content.slice(0, 160) + '...',
          keyQuote: '«Ilm va odob har bir moʻmin uchun fazilatdir».',
          bodyParagraphs: [target.content],
          comments: []
        });
      } else if (target.targetSection === 'media') {
        if (!Array.isArray(db.mediaPosts)) db.mediaPosts = [];
        db.mediaPosts.unshift({
          id: `post-${Date.now()}`,
          title: target.title,
          type: 'reel',
          category: 'Ijtimoiy',
          author: target.sourceChannel,
          publishedDate: 'Bugun',
          mediaUrl: target.mediaUrl || 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=800&q=80',
          thumbnail: target.mediaUrl || 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=600&q=80',
          caption: target.content,
          likesCount: 10,
          commentsCount: 0,
          isPublished: true,
          comments: []
        });
      }
      break;
    }
    case 'reject': {
      const target = db.drafts.find((d: any) => d.id === id);
      if (target) {
        target.status = 'rejected';
        target.reviewedBy = reviewer || 'Bosh Administrator';
        target.reviewedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
      }
      break;
    }
    case 'delete': {
      db.drafts = db.drafts.filter((d: any) => d.id !== id);
      break;
    }
    default:
      return res.status(400).json({ success: false, error: 'Unknown drafts action' });
  }

  writeDatabase(db);
  res.json({
    success: true,
    drafts: db.drafts,
    prayerSchedule: db.prayerSchedule,
    articles: db.articles,
    mediaPosts: db.mediaPosts
  });
});

// ---------------- DEVELOPMENT & PRODUCTION VITE MOUNTING ----------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const httpServer = http.createServer(app);

  if (!isProd) {
    // In dev: mount Vite middlewares inside Express and attach HMR to httpServer
    const { createServer } = await import('vite');
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server: httpServer },
      }
    });
    app.use(vite.middlewares);
  } else {
    // In production: serve built dist assets
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[ASAKA ZIYO] Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
