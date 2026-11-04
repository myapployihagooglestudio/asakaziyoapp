import express, { Request, Response } from 'express';
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
      id: 'reel-1',
      title: 'Subh namozining fazilati va barakasi',
      description: 'Tong paytidagi xushuʼ va bomdod namozining jamoat bilan oʻqilishining ajrlari haqida qisqa eslatma.',
      mediaUrl: 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=800&q=80',
      mediaType: 'video',
      author: 'Asaka Jome Masjidi Imomi',
      publishedDate: 'Bugun',
      duration: '0:58',
      likesCount: 42,
      viewsCount: 380,
      comments: [
        { id: 'mc-1', authorName: 'Hasanboy', text: 'Alloh manfaatli qilsin!', timestamp: '2026-11-03 06:10' }
      ]
    },
    {
      id: 'reel-2',
      title: 'Zikr va qalb xotirjamligi',
      description: '«Albatta, Allohning zikri ila qalblar orom olur» (Raʼd surasi, 28-oyat)',
      mediaUrl: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=800&q=80',
      mediaType: 'image',
      author: 'Tahririyat Hayʼati',
      publishedDate: 'Kecha',
      duration: 'Rasm/Post',
      likesCount: 29,
      viewsCount: 215,
      comments: []
    }
  ],
  inquiries: [
    {
      id: 'inq-1',
      userName: 'Rustamjon',
      userPhone: '+998 90 123 45 67',
      subject: 'Tahajjud namozi vaqti haqida',
      message: 'Assalomu alaykum. Asaka shahrida tahajjud namozini qaysi vaqtgacha oʻqisa afzal boʻladi?',
      createdAt: '2026-11-02 21:15',
      status: 'answered',
      adminReply: 'Va alaykum assalom. Tahajjud namozi kechaning oxirgi uchdan birida, Subh (bomdod kirmasidan oldin) oʻqilishi eng afzaldir. Asaka taqvimida koʻrsatilgan 03:45 vaqti ayni shunga muvofiq keladi.',
      repliedAt: '2026-11-03 05:40'
    }
  ],
  hadiths: [],
  dhikrs: [],
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
      receivedAt: '2026-11-03 08:30',
      status: 'pending'
    },
    {
      id: 'draft-2',
      sourceChannel: '@muhiddinsahhofuz',
      targetSection: 'articles',
      title: 'Ilm va odob: Ustoz Muhiddin Sahhof maʼruzalari asosida',
      content: 'Ilm talab qilish har bir musulmon erkak va ayolga farzdir. Ammo ilmdan oldin odob oʻrganilishi lozim...',
      mediaUrl: 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=1200&q=80',
      receivedAt: '2026-11-03 09:15',
      status: 'pending'
    }
  ],
  updatedAt: new Date().toISOString()
});

// Load database from file or initialize
function readDatabase(): any {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading database file, re-initializing:', err);
  }
  const defaultData = getDefaultDatabase();
  writeDatabase(defaultData);
  return defaultData;
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
      const existingIdx = db.mediaPosts.findIndex((p: any) => p.id === post.id);
      if (existingIdx >= 0) {
        db.mediaPosts[existingIdx] = { ...db.mediaPosts[existingIdx], ...post };
      } else {
        db.mediaPosts.unshift(post);
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
      }
      break;
    }
    default:
      return res.status(400).json({ success: false, error: 'Unknown media action' });
  }

  writeDatabase(db);
  res.json({ success: true, mediaPosts: db.mediaPosts });
});

// 6. User Inquiries & Support Chat (User Submit, Admin Reply, Delete)
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

// 7. Telegram Configuration & Server-Side Broadcasting
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

    res.json({ success: true, result: data.result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Tarmoq xatosi' });
  }
});

// 8. Supabase Configuration & Status
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

// 9. Telegram Channel Drafts & Moderation Queue
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
          id: `reel-${Date.now()}`,
          title: target.title,
          description: target.content,
          mediaUrl: target.mediaUrl || 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=800&q=80',
          mediaType: 'image',
          author: target.sourceChannel,
          publishedDate: 'Bugun',
          duration: 'Post',
          likesCount: 10,
          viewsCount: 120,
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

  if (!isProd) {
    // In dev: mount Vite middlewares inside Express
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true }
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ASAKA ZIYO] Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
