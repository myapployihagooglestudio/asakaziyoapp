import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Must run on port 3000 per AI Studio runtime environment requirements
const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'asaka_ziyo_db.json');

// Read Firebase Applet Config
const FIREBASE_CONFIG_PATH = path.join(__dirname, 'firebase-applet-config.json');
let firebaseConfig: any = {};
try {
  if (fs.existsSync(FIREBASE_CONFIG_PATH)) {
    firebaseConfig = JSON.parse(fs.readFileSync(FIREBASE_CONFIG_PATH, 'utf-8'));
  }
} catch (err) {
  console.warn('[Security] Could not load firebase-applet-config.json:', err);
}

// ---------------------------------------------------------------------------
// 1. SECURITY HEADERS & CORS/CSRF MITIGATION
// ---------------------------------------------------------------------------
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

// ---------------------------------------------------------------------------
// 2. IN-MEMORY RATE LIMITING (Sliding Window per IP)
// ---------------------------------------------------------------------------
interface RateRecord {
  count: number;
  resetAt: number;
}
const rateLimitStore = new Map<string, RateRecord>();

function createRateLimiter(options: { windowMs: number; max: number; message: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      'unknown';
    const key = `${options.max}_${ip}`;
    const now = Date.now();

    const record = rateLimitStore.get(key);
    if (!record || now > record.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    if (record.count >= options.max) {
      return res.status(429).json({
        success: false,
        error: options.message,
        retryAfterMs: Math.max(0, record.resetAt - now),
      });
    }

    record.count += 1;
    next();
  };
}

// Rate limiters
const generalApiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: 'Juda ko‘p so‘rov yuborildi. Iltimos, 1 daqiqa kuting.',
});

const sensitiveActionLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Xavfsizlik yuzasidan so‘rovlar soni cheklandi. Bir ozdan keyin qayta urinib ko‘ring.',
});

app.use('/api/', generalApiLimiter);

// ---------------------------------------------------------------------------
// 3. FIREBASE & ADMIN TOKEN AUTHENTICATION & ROLE VERIFICATION MIDDLEWARE
// ---------------------------------------------------------------------------
export interface VerifiedAdminUser {
  uid: string;
  username?: string;
  email: string;
  role: string;
  isActive: boolean;
}

declare global {
  namespace Express {
    interface Request {
      adminUser?: VerifiedAdminUser;
    }
  }
}

export type AdminAuthCheckResult =
  | { status: 'unauthenticated'; error: string }
  | { status: 'forbidden'; error: string }
  | { status: 'ok'; admin: VerifiedAdminUser };

const AUTHORIZED_ADMIN_EMAIL = 'asakaziyo0@gmail.com';
const AUTHORIZED_ADMIN_USERNAME = 'menageradmin';
const AUTHORIZED_ADMIN_UID = 'admin-asakaziyo0';
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'asaka_ziyo_enterprise_hmac_secret_2026';

// Active server-side admin tokens issued via /api/admin/auth
const activeServerTokens = new Map<string, { admin: VerifiedAdminUser; expiresAt: number }>();

function getConfiguredAdminPassword(): string {
  try {
    if (fs.existsSync(DB_FILE)) {
      const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      if (db.adminCredentials?.passwordHash) {
        return db.adminCredentials.passwordHash;
      }
    }
  } catch {
    // fallback
  }
  return process.env.ADMIN_PASSWORD || 'menageradmin1';
}

function hashPassword(plain: string): string {
  return crypto.createHmac('sha256', ADMIN_SESSION_SECRET).update(plain).digest('hex');
}

function verifyPassword(plain: string): boolean {
  const configured = getConfiguredAdminPassword();
  if (configured.length === 64 && /^[0-9a-f]+$/.test(configured)) {
    return hashPassword(plain) === configured;
  }
  return plain === configured;
}

function issueAdminSessionToken(admin: VerifiedAdminUser): string {
  const randomPart = crypto.randomBytes(24).toString('hex');
  const signature = crypto
    .createHmac('sha256', ADMIN_SESSION_SECRET)
    .update(`${admin.uid}:${admin.email}:${randomPart}`)
    .digest('hex');
  const token = `asaka_admin_${randomPart}.${signature}`;
  activeServerTokens.set(token, {
    admin,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  });
  return token;
}

function verifyServerSessionToken(token: string): VerifiedAdminUser | null {
  const record = activeServerTokens.get(token);
  if (record) {
    if (Date.now() > record.expiresAt) {
      activeServerTokens.delete(token);
      return null;
    }
    return record.admin;
  }

  // Stateless HMAC verification across restarts
  if (token.startsWith('asaka_admin_') && token.includes('.')) {
    const [prefixAndRand, sig] = token.split('.');
    const randomPart = prefixAndRand.replace('asaka_admin_', '');
    const expectedSig = crypto
      .createHmac('sha256', ADMIN_SESSION_SECRET)
      .update(`${AUTHORIZED_ADMIN_UID}:${AUTHORIZED_ADMIN_EMAIL}:${randomPart}`)
      .digest('hex');
    if (sig === expectedSig) {
      return {
        uid: AUTHORIZED_ADMIN_UID,
        username: AUTHORIZED_ADMIN_USERNAME,
        email: AUTHORIZED_ADMIN_EMAIL,
        role: 'SUPER_ADMIN',
        isActive: true,
      };
    }
  }
  return null;
}

/**
 * Verifies Administrator Token:
 * 1) Checks signed server session token issued for menageradmin (asakaziyo0@gmail.com)
 * 2) Or verifies Firebase ID Token using Google Identity Toolkit and inspects Firestore /admins/{uid}
 * Returns 'unauthenticated' (401) for missing/invalid tokens,
 * 'forbidden' (403) for valid Firebase users who are not authorized in /admins/{uid},
 * and 'ok' (200) for verified active administrators.
 */
async function evaluateFirebaseAdminToken(token?: string): Promise<AdminAuthCheckResult> {
  if (!token || !token.trim()) {
    return {
      status: 'unauthenticated',
      error: 'Ruxsat etilmagan: Administrator autentifikatsiya tokeni talab qilinadi.',
    };
  }

  // 0. Check signed server session token for menageradmin (asakaziyo0@gmail.com)
  const serverSessionAdmin = verifyServerSessionToken(token.trim());
  if (serverSessionAdmin) {
    if (serverSessionAdmin.email.toLowerCase() !== AUTHORIZED_ADMIN_EMAIL || !serverSessionAdmin.isActive) {
      return {
        status: 'forbidden',
        error: 'Kirish rad etildi: Ushbu hisob administrator huquqiga ega emas (403 Forbidden).',
      };
    }
    return {
      status: 'ok',
      admin: serverSessionAdmin,
    };
  }

  if (!firebaseConfig.apiKey) {
    return {
      status: 'unauthenticated',
      error: 'Ruxsat etilmagan: Administrator autentifikatsiya tokeni yaroqsiz.',
    };
  }

  try {
    // 1. Verify ID token with Google Identity Toolkit
    const lookupUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`;
    const lookupRes = await fetch(lookupUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
    });

    if (!lookupRes.ok) {
      return {
        status: 'unauthenticated',
        error: 'Ruxsat etilmagan: Firebase autentifikatsiya tokeni yaroqsiz yoki muddati tugagan.',
      };
    }

    const lookupData = await lookupRes.json();
    const user = lookupData.users?.[0];
    if (!user || !user.localId) {
      return {
        status: 'unauthenticated',
        error: 'Ruxsat etilmagan: Foydalanuvchi sessiyasi topilmadi.',
      };
    }

    const uid = user.localId;
    const email = (user.email || '').toLowerCase();

    // Enforce single authorized administrator account email
    if (email !== AUTHORIZED_ADMIN_EMAIL) {
      return {
        status: 'forbidden',
        error: 'Kirish rad etildi: Ushbu hisob administrator huquqiga ega emas (403 Forbidden).',
      };
    }

    // 2. Query Firestore REST API for /admins/{uid}
    const projectId = firebaseConfig.projectId;
    const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/admins/${uid}`;

    const fsRes = await fetch(firestoreUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!fsRes.ok) {
      console.warn(`[Security] User ${uid} authenticated but is not present in /admins Firestore collection.`);
      return {
        status: 'forbidden',
        error: 'Kirish rad etildi: Firestore /admins/{uid} tasdiqlovi topilmadi (403 Forbidden).',
      };
    }

    const fsData = await fsRes.json();
    const fields = fsData.fields || {};
    const role = fields.role?.stringValue || 'VIEWER';
    const isActive = fields.isActive?.booleanValue !== false;

    if (!isActive) {
      console.warn(`[Security] Admin ${uid} is marked as inactive.`);
      return {
        status: 'forbidden',
        error: 'Kirish rad etildi: Administrator hisobi faol emas (403 Forbidden).',
      };
    }

    return {
      status: 'ok',
      admin: { uid, username: AUTHORIZED_ADMIN_USERNAME, email, role, isActive },
    };
  } catch (err) {
    console.error('[Security] Token verification failure:', err);
    return {
      status: 'unauthenticated',
      error: 'Autentifikatsiya tekshiruvida xatolik yuz berdi.',
    };
  }
}

async function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Ruxsat etilmagan: Administrator autentifikatsiya tokeni talab qilinadi.',
    });
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  const check = await evaluateFirebaseAdminToken(token);

  if (check.status === 'unauthenticated') {
    return res.status(401).json({
      success: false,
      error: check.error,
    });
  }

  if (check.status === 'forbidden') {
    return res.status(403).json({
      success: false,
      error: check.error,
    });
  }

  req.adminUser = check.admin;
  next();
}

// ---------------------------------------------------------------------------
// 4. PERSISTENT JSON CACHE & DATA NORMALIZATION
// ---------------------------------------------------------------------------
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getDefaultDatabase() {
  return {
    prayerSchedule: {
      date: '2026-11-04',
      formattedDateUz: '4-Noyabr, Chorshanba, 2026',
      hijriDate: '24 Jumodul avval, 1448',
      location: 'Asaka shahri, Andijon viloyati',
      qiblaAngleDeg: 241,
      timezone: 'Asia/Tashkent',
      isAdministratorPublished: false,
      publishedBy: '',
      verifiedAt: '',
      disclaimer: 'Namoz vaqtlari faqat Asaka Jome Masjidi maʼmuriyati tomonidan tasdiqlangach eʼlon qilinadi.',
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
    articles: [],
    mediaPosts: [],
    hadiths: [],
    dhikrs: [],
    inquiries: [],
    notifications: [],
    drafts: [],
    telegramConfig: {
      botToken: process.env.TELEGRAM_BOT_TOKEN || '',
      channelId: process.env.TELEGRAM_CHANNEL_ID || '@Asaka_Ziyo',
      channel2: '@muhiddinsahhofuz',
      channelTitle: 'ASAKA ZIYO Rasmiy Kanali'
    },
    supabaseConfig: {
      url: process.env.VITE_SUPABASE_URL || '',
      anonKey: '',
      adminEmail: 'asakaziyo0@gmail.com',
      isEnabled: false,
      lastSync: null
    },
    updatedAt: new Date().toISOString()
  };
}

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

  // Ensure all arrays exist
  if (!data.prayerSchedule || !Array.isArray(data.prayerSchedule.times)) {
    data.prayerSchedule = defaultData.prayerSchedule;
  }
  if (!Array.isArray(data.articles)) data.articles = defaultData.articles;
  if (!Array.isArray(data.mediaPosts)) data.mediaPosts = defaultData.mediaPosts;
  if (!Array.isArray(data.hadiths)) data.hadiths = defaultData.hadiths;
  if (!Array.isArray(data.dhikrs)) data.dhikrs = defaultData.dhikrs;
  if (!Array.isArray(data.inquiries)) data.inquiries = defaultData.inquiries;
  if (!Array.isArray(data.notifications)) data.notifications = defaultData.notifications;
  if (!Array.isArray(data.drafts)) data.drafts = defaultData.drafts;
  if (!data.telegramConfig) data.telegramConfig = defaultData.telegramConfig;
  if (!data.supabaseConfig) data.supabaseConfig = defaultData.supabaseConfig;

  return data;
}

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

// ---------------------------------------------------------------------------
// 5. REST API ENDPOINTS
// ---------------------------------------------------------------------------

// 1. Health & Server Ping
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'ASAKA ZIYO',
    serverTime: new Date().toISOString(),
    firestoreReady: Boolean(firebaseConfig.projectId),
  });
});

// 1.5 Administrator Authentication & Password Management
app.post('/api/admin/auth', sensitiveActionLimiter, (req: Request, res: Response) => {
  const { username, email, password } = req.body || {};
  const loginNorm = String(username || email || '').trim().toLowerCase();

  if (loginNorm !== AUTHORIZED_ADMIN_USERNAME && loginNorm !== AUTHORIZED_ADMIN_EMAIL) {
    return res.status(403).json({
      success: false,
      error: 'Administrator foydalanuvchi nomi (login) yoki parol noto‘g‘ri kiritildi.',
    });
  }

  if (!password || !verifyPassword(String(password))) {
    return res.status(401).json({
      success: false,
      error: 'Administrator foydalanuvchi nomi (login) yoki parol noto‘g‘ri kiritildi.',
    });
  }

  const admin: VerifiedAdminUser = {
    uid: AUTHORIZED_ADMIN_UID,
    username: AUTHORIZED_ADMIN_USERNAME,
    email: AUTHORIZED_ADMIN_EMAIL,
    role: 'SUPER_ADMIN',
    isActive: true,
  };

  const token = issueAdminSessionToken(admin);

  return res.json({
    success: true,
    token,
    admin: {
      ...admin,
      displayName: 'Asaka Ziyo Bosh Maʼmuri',
      lastLoginAt: new Date().toISOString(),
    },
  });
});

app.post('/api/admin/change-password', sensitiveActionLimiter, requireAdminAuth, (req: Request, res: Response) => {
  const { newPassword } = req.body || {};
  if (!newPassword || String(newPassword).length < 8) {
    return res.status(400).json({
      success: false,
      error: 'Yangi parol kamida 8 ta belgidan iborat bo‘lishi shart.',
    });
  }

  const db = readDatabase();
  db.adminCredentials = {
    username: AUTHORIZED_ADMIN_USERNAME,
    email: AUTHORIZED_ADMIN_EMAIL,
    passwordHash: hashPassword(String(newPassword)),
    updatedAt: new Date().toISOString(),
  };
  writeDatabase(db);

  return res.json({
    success: true,
    email: AUTHORIZED_ADMIN_EMAIL,
    message: 'Administrator paroli muvaffaqiyatli yangilandi.',
  });
});

// 1.6 Administrator File Upload Endpoint (Images, Videos, Audio)
app.post('/api/upload', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { fileName, mimeType, base64Data } = req.body || {};
    if (!base64Data || typeof base64Data !== 'string') {
      return res.status(400).json({ success: false, error: 'Yuklanadigan fayl maʼlumoti topilmadi.' });
    }

    const safeMime = String(mimeType || 'application/octet-stream').toLowerCase();
    const isAllowed =
      safeMime.startsWith('image/') ||
      safeMime.startsWith('video/') ||
      safeMime.startsWith('audio/');
    if (!isAllowed) {
      return res.status(400).json({
        success: false,
        error: 'Faqat rasm (JPG/PNG/WebP), video (MP4/WebM) yoki audio (MP3/WAV) fayllar yuklanishi mumkin.',
      });
    }

    const rawBase64 = base64Data.includes('base64,') ? base64Data.split('base64,')[1] : base64Data;
    const buffer = Buffer.from(rawBase64, 'base64');

    const extMatch = String(fileName || '').match(/\.[a-zA-Z0-9]{2,5}$/);
    let ext = extMatch ? extMatch[0].toLowerCase() : '';
    if (!ext) {
      if (safeMime.includes('png')) ext = '.png';
      else if (safeMime.includes('webp')) ext = '.webp';
      else if (safeMime.includes('mp4')) ext = '.mp4';
      else if (safeMime.includes('webm')) ext = '.webm';
      else if (safeMime.includes('mp3') || safeMime.includes('mpeg')) ext = '.mp3';
      else ext = '.jpg';
    }

    const cleanName = String(fileName || 'media')
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 40);
    const savedFileName = `${Date.now()}_${cleanName}${ext}`;
    const filePath = path.join(UPLOADS_DIR, savedFileName);

    fs.writeFileSync(filePath, buffer);

    const mediaType: 'image' | 'video' | 'audio' = safeMime.startsWith('video/')
      ? 'video'
      : safeMime.startsWith('audio/')
      ? 'audio'
      : 'image';

    return res.json({
      success: true,
      url: `/uploads/${savedFileName}`,
      fileName: savedFileName,
      mediaType,
      sizeBytes: buffer.length,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Faylni saqlashda xatolik yuz berdi.',
    });
  }
});

// 2. Public Safe Data Endpoint (No private inquiries, drafts, or tokens!)
app.get('/api/database', (_req: Request, res: Response) => {
  const db = readDatabase();

  // Return ONLY public, non-archived data
  const publicData = {
    prayerSchedule: db.prayerSchedule,
    articles: (db.articles || []).filter((a: any) => !a.isArchived),
    mediaPosts: (db.mediaPosts || []).filter((m: any) => !m.isArchived && m.isPublished !== false),
    hadiths: (db.hadiths || []).filter((h: any) => !h.isArchived),
    dhikrs: (db.dhikrs || []).filter((d: any) => !d.isArchived),
    notifications: (db.notifications || []).filter((n: any) => !n.isArchived),
    telegramConfig: {
      channelId: db.telegramConfig?.channelId || '@Asaka_Ziyo',
      channel2: db.telegramConfig?.channel2 || '@muhiddinsahhofuz',
      channelTitle: db.telegramConfig?.channelTitle || 'ASAKA ZIYO',
    },
    updatedAt: db.updatedAt,
  };

  res.json({ success: true, data: publicData });
});

// 3. Admin Full Database Endpoint (Requires Verified Admin Auth)
app.get('/api/admin/database', requireAdminAuth, (_req: Request, res: Response) => {
  const db = readDatabase();
  const safeConfig = {
    ...db.telegramConfig,
    botToken: db.telegramConfig?.botToken ? '••••••••••••••••' : '',
  };

  res.json({
    success: true,
    data: {
      ...db,
      telegramConfig: safeConfig,
    },
  });
});

// 4. Save Prayer Times (Admin Auth Required)
app.post('/api/database/prayer', requireAdminAuth, (req: Request, res: Response) => {
  const { schedule } = req.body;
  if (!schedule || !Array.isArray(schedule.times) || schedule.times.length < 5) {
    return res.status(400).json({ success: false, error: 'Yaroqsiz namoz vaqtlari maʼlumoti.' });
  }

  const db = readDatabase();
  db.prayerSchedule = {
    ...schedule,
    updatedAt: new Date().toISOString(),
    publishedBy: req.adminUser?.email || 'Administrator',
  };
  writeDatabase(db);

  res.json({ success: true, schedule: db.prayerSchedule, updatedAt: db.updatedAt });
});

// 5. Articles Management (CRUD, Soft Delete & Interactions)
app.post('/api/database/articles', async (req: Request, res: Response) => {
  const { action, article, id, rating, comment, archiveReason } = req.body;
  const db = readDatabase();
  if (!Array.isArray(db.articles)) db.articles = [];

  // Public user interactions: like, rate, comment
  if (action === 'like') {
    const art = db.articles.find((a: any) => a.id === id);
    if (art) art.likesCount = (art.likesCount || 0) + 1;
    writeDatabase(db);
    return res.json({ success: true, likesCount: art?.likesCount || 0 });
  }

  if (action === 'rate') {
    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ success: false, error: 'Baho 1 dan 5 gacha bo‘lishi lozim' });
    }
    const art = db.articles.find((a: any) => a.id === id);
    if (art) {
      const curCount = art.ratingsCount || 0;
      const curRating = art.rating || 5;
      const newCount = curCount + 1;
      art.rating = parseFloat(((curRating * curCount + numRating) / newCount).toFixed(1));
      art.ratingsCount = newCount;
      writeDatabase(db);
      return res.json({ success: true, rating: art.rating, ratingsCount: art.ratingsCount });
    }
    return res.status(404).json({ success: false, error: 'Maqola topilmadi' });
  }

  if (action === 'comment') {
    const text = comment?.text?.trim()?.slice(0, 500);
    const authorName = comment?.authorName?.trim()?.slice(0, 100) || 'Foydalanuvchi';
    if (!text) {
      return res.status(400).json({ success: false, error: 'Sharh matni kiritilishi shart' });
    }
    const art = db.articles.find((a: any) => a.id === id);
    if (art) {
      if (!Array.isArray(art.comments)) art.comments = [];
      const newComment = {
        id: `comm-${Date.now()}`,
        authorName,
        text,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      };
      art.comments.push(newComment);
      writeDatabase(db);
      return res.json({ success: true, comment: newComment });
    }
    return res.status(404).json({ success: false, error: 'Maqola topilmadi' });
  }

  // Administrative actions: save, archive, restore, permanent delete
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split('Bearer ')[1]?.trim() : undefined;
  const authCheck = await evaluateFirebaseAdminToken(token);

  if (authCheck.status === 'unauthenticated') {
    return res.status(401).json({ success: false, error: authCheck.error });
  }
  if (authCheck.status === 'forbidden') {
    return res.status(403).json({ success: false, error: authCheck.error });
  }
  const verifiedAdmin = authCheck.admin;

  switch (action) {
    case 'save':
    case 'create': {
      if (!article || !article.title || !article.excerpt) {
        return res.status(400).json({ success: false, error: 'Maqola sarlavhasi va mazmuni kiritilishi shart' });
      }
      const existingIdx = db.articles.findIndex((a: any) => a.id === article.id);
      if (existingIdx >= 0) {
        db.articles[existingIdx] = {
          ...db.articles[existingIdx],
          ...article,
          updatedAt: new Date().toISOString(),
          updatedBy: verifiedAdmin.email,
        };
      } else {
        db.articles.unshift({
          ...article,
          id: article.id || `art-${Date.now()}`,
          isArchived: false,
          createdAt: new Date().toISOString(),
          createdBy: verifiedAdmin.email,
        });
      }
      break;
    }
    case 'archive': {
      const art = db.articles.find((a: any) => a.id === id);
      if (!art) return res.status(404).json({ success: false, error: 'Maqola topilmadi' });
      art.isArchived = true;
      art.archivedAt = new Date().toISOString();
      art.archivedBy = verifiedAdmin.email;
      art.archiveReason = archiveReason || 'Administrator tomonidan arxivlandi';
      break;
    }
    case 'restore': {
      const art = db.articles.find((a: any) => a.id === id);
      if (!art) return res.status(404).json({ success: false, error: 'Maqola topilmadi' });
      art.isArchived = false;
      art.restoredAt = new Date().toISOString();
      art.restoredBy = verifiedAdmin.email;
      break;
    }
    case 'delete': {
      // Safe Soft Delete: always archive rather than purge unless SUPER_ADMIN explicitly forces it
      const art = db.articles.find((a: any) => a.id === id);
      if (art) {
        art.isArchived = true;
        art.archivedAt = new Date().toISOString();
        art.archivedBy = verifiedAdmin.email;
      }
      break;
    }
    default:
      return res.status(400).json({ success: false, error: 'Nomaʼlum maqola amali' });
  }

  writeDatabase(db);
  res.json({ success: true, articles: db.articles });
});

// 6. Media Management (CRUD & Soft Delete)
app.post('/api/database/media', async (req: Request, res: Response) => {
  const { action, post, id, comment } = req.body;
  const db = readDatabase();
  if (!Array.isArray(db.mediaPosts)) db.mediaPosts = [];

  // Public interactions: like, comment
  if (action === 'like') {
    const item = db.mediaPosts.find((p: any) => p.id === id);
    if (item) item.likesCount = (item.likesCount || 0) + 1;
    writeDatabase(db);
    return res.json({ success: true, likesCount: item?.likesCount || 0 });
  }

  if (action === 'comment') {
    const text = comment?.text?.trim()?.slice(0, 500);
    const authorName = comment?.authorName?.trim()?.slice(0, 100) || 'Foydalanuvchi';
    if (!text) {
      return res.status(400).json({ success: false, error: 'Sharh matni kiritilishi shart' });
    }
    const item = db.mediaPosts.find((p: any) => p.id === id);
    if (item) {
      if (!Array.isArray(item.comments)) item.comments = [];
      const newComment = {
        id: `mc-${Date.now()}`,
        authorName,
        text,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      };
      item.comments.push(newComment);
      item.commentsCount = item.comments.length;
      writeDatabase(db);
      return res.json({ success: true, comment: newComment });
    }
    return res.status(404).json({ success: false, error: 'Media topilmadi' });
  }

  // Administrative actions
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split('Bearer ')[1]?.trim() : undefined;
  const authCheck = await evaluateFirebaseAdminToken(token);

  if (authCheck.status === 'unauthenticated') {
    return res.status(401).json({ success: false, error: authCheck.error });
  }
  if (authCheck.status === 'forbidden') {
    return res.status(403).json({ success: false, error: authCheck.error });
  }
  const verifiedAdmin = authCheck.admin;

  switch (action) {
    case 'save':
    case 'create': {
      if (!post || !post.title || !post.mediaUrl) {
        return res.status(400).json({ success: false, error: 'Media sarlavhasi va havolasi kiritilishi shart' });
      }
      const existingIdx = db.mediaPosts.findIndex((p: any) => p.id === post.id);
      if (existingIdx >= 0) {
        db.mediaPosts[existingIdx] = {
          ...db.mediaPosts[existingIdx],
          ...post,
          updatedAt: new Date().toISOString(),
          updatedBy: verifiedAdmin.email,
        };
      } else {
        db.mediaPosts.unshift({
          ...post,
          id: post.id || `post-${Date.now()}`,
          isArchived: false,
          createdAt: new Date().toISOString(),
          createdBy: verifiedAdmin.email,
        });
      }
      break;
    }
    case 'archive':
    case 'delete': {
      const item = db.mediaPosts.find((p: any) => p.id === id);
      if (item) {
        item.isArchived = true;
        item.archivedAt = new Date().toISOString();
        item.archivedBy = verifiedAdmin.email;
      }
      break;
    }
    case 'restore': {
      const item = db.mediaPosts.find((p: any) => p.id === id);
      if (item) {
        item.isArchived = false;
        item.restoredAt = new Date().toISOString();
      }
      break;
    }
    default:
      return res.status(400).json({ success: false, error: 'Nomaʼlum media amali' });
  }

  writeDatabase(db);
  res.json({ success: true, mediaPosts: db.mediaPosts });
});

// 7. Hadiths & Dhikrs Management (Admin Auth Required for mutations)
app.post('/api/database/hadiths', requireAdminAuth, (req: Request, res: Response) => {
  const { action, hadith, id } = req.body;
  const db = readDatabase();
  if (!Array.isArray(db.hadiths)) db.hadiths = [];

  switch (action) {
    case 'save':
    case 'create': {
      if (!hadith || !hadith.textAr || !hadith.translationUz) {
        return res.status(400).json({ success: false, error: 'Hadis matni va tarjimasi kiritilishi shart' });
      }
      const existingIdx = db.hadiths.findIndex((h: any) => h.id === hadith.id);
      if (existingIdx >= 0) {
        db.hadiths[existingIdx] = { ...db.hadiths[existingIdx], ...hadith };
      } else {
        db.hadiths.unshift({ ...hadith, id: hadith.id || `h-${Date.now()}`, isArchived: false });
      }
      break;
    }
    case 'archive':
    case 'delete': {
      const h = db.hadiths.find((item: any) => item.id === id);
      if (h) {
        h.isArchived = true;
        h.archivedAt = new Date().toISOString();
      }
      break;
    }
    case 'restore': {
      const h = db.hadiths.find((item: any) => item.id === id);
      if (h) h.isArchived = false;
      break;
    }
    default:
      return res.status(400).json({ success: false, error: 'Nomaʼlum hadis amali' });
  }

  writeDatabase(db);
  res.json({ success: true, hadiths: db.hadiths });
});

app.post('/api/database/dhikrs', requireAdminAuth, (req: Request, res: Response) => {
  const { action, dhikr, id } = req.body;
  const db = readDatabase();
  if (!Array.isArray(db.dhikrs)) db.dhikrs = [];

  switch (action) {
    case 'save':
    case 'create': {
      if (!dhikr || !dhikr.titleUz || !dhikr.textAr) {
        return res.status(400).json({ success: false, error: 'Zikr nomi va arabcha matni kiritilishi shart' });
      }
      const existingIdx = db.dhikrs.findIndex((d: any) => d.id === dhikr.id);
      if (existingIdx >= 0) {
        db.dhikrs[existingIdx] = { ...db.dhikrs[existingIdx], ...dhikr };
      } else {
        db.dhikrs.unshift({ ...dhikr, id: dhikr.id || `d-${Date.now()}`, isArchived: false });
      }
      break;
    }
    case 'archive':
    case 'delete': {
      const d = db.dhikrs.find((item: any) => item.id === id);
      if (d) {
        d.isArchived = true;
        d.archivedAt = new Date().toISOString();
      }
      break;
    }
    case 'restore': {
      const d = db.dhikrs.find((item: any) => item.id === id);
      if (d) d.isArchived = false;
      break;
    }
    default:
      return res.status(400).json({ success: false, error: 'Nomaʼlum zikr amali' });
  }

  writeDatabase(db);
  res.json({ success: true, dhikrs: db.dhikrs });
});

// 8. User Inquiries / Questions (Public Submission with Rate Limiting, Admin Reply/Management)
app.post('/api/database/inquiries', sensitiveActionLimiter, async (req: Request, res: Response) => {
  const { action, inquiry, id, replyText } = req.body;
  const db = readDatabase();
  if (!Array.isArray(db.inquiries)) db.inquiries = [];

  // Public user submission
  if (action === 'submit') {
    const message = inquiry?.message?.trim()?.slice(0, 2000);
    const userName = inquiry?.userName?.trim()?.slice(0, 150) || 'Foydalanuvchi';
    const userPhone = inquiry?.userPhone?.trim()?.slice(0, 30) || '';
    const subject = inquiry?.subject?.trim()?.slice(0, 200) || 'Diniy savol';

    if (!message) {
      return res.status(400).json({ success: false, error: 'Murojaat matni kiritilishi shart' });
    }

    const newInquiry = {
      id: `inq-${Date.now()}`,
      userName,
      userPhone,
      subject,
      message,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: 'pending',
      isArchived: false,
    };

    db.inquiries.unshift(newInquiry);
    writeDatabase(db);
    return res.json({ success: true, message: 'Murojaatingiz muvaffaqiyatli qabul qilindi' });
  }

  // Admin reply / archive actions
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split('Bearer ')[1]?.trim() : undefined;
  const authCheck = await evaluateFirebaseAdminToken(token);

  if (authCheck.status === 'unauthenticated') {
    return res.status(401).json({ success: false, error: authCheck.error });
  }
  if (authCheck.status === 'forbidden') {
    return res.status(403).json({ success: false, error: authCheck.error });
  }
  const verifiedAdmin = authCheck.admin;

  if (action === 'reply') {
    const inq = db.inquiries.find((item: any) => item.id === id);
    if (inq) {
      inq.adminReply = replyText;
      inq.status = 'answered';
      inq.repliedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
      inq.repliedBy = verifiedAdmin.email;
      writeDatabase(db);
      return res.json({ success: true, inquiry: inq });
    }
    return res.status(404).json({ success: false, error: 'Murojaat topilmadi' });
  }

  if (action === 'archive' || action === 'delete') {
    const inq = db.inquiries.find((item: any) => item.id === id);
    if (inq) {
      inq.isArchived = true;
      inq.archivedAt = new Date().toISOString();
      writeDatabase(db);
      return res.json({ success: true });
    }
  }

  res.status(400).json({ success: false, error: 'Nomaʼlum murojaat amali' });
});

// 9. Telegram Configuration & Server-Side Broadcasting (Admin Auth Strictly Required)
app.post('/api/database/telegram', requireAdminAuth, (req: Request, res: Response) => {
  const { botToken, channelId, channel2 } = req.body;
  const db = readDatabase();

  // If a new bot token is explicitly provided, update it securely on server
  if (botToken && botToken.trim() && !botToken.includes('••••')) {
    db.telegramConfig.botToken = botToken.trim();
  }
  if (channelId) db.telegramConfig.channelId = channelId.trim();
  if (channel2) db.telegramConfig.channel2 = channel2.trim();

  writeDatabase(db);

  res.json({
    success: true,
    telegramConfig: {
      channelId: db.telegramConfig.channelId,
      channel2: db.telegramConfig.channel2,
      botToken: db.telegramConfig.botToken ? '••••••••••••••••' : '',
    },
  });
});

app.post('/api/telegram/broadcast', sensitiveActionLimiter, requireAdminAuth, async (req: Request, res: Response) => {
  const { message, channel } = req.body;
  const db = readDatabase();
  const effectiveToken = process.env.TELEGRAM_BOT_TOKEN || db.telegramConfig?.botToken;
  const targetChannel = channel || db.telegramConfig?.channelId || '@Asaka_Ziyo';

  if (!effectiveToken) {
    return res.status(400).json({
      success: false,
      error: 'Telegram Bot Token belgilanmagan. Iltimos, Telegram sozlamalaridan tokenni kiriting.',
    });
  }

  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, error: 'Tarqatish uchun xabar matni kiritilmadi.' });
  }

  try {
    const url = `https://api.telegram.org/bot${effectiveToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChannel,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      return res.status(400).json({
        success: false,
        error: data.description || 'Telegram API xatosi',
      });
    }

    res.json({ success: true, result: data.result, targetChannel });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Tarmoq xatosi' });
  }
});

// 10. Notifications Broadcast & Management
app.post('/api/database/notifications', requireAdminAuth, (req: Request, res: Response) => {
  const { action, notification, id } = req.body;
  const db = readDatabase();
  if (!Array.isArray(db.notifications)) db.notifications = [];

  switch (action) {
    case 'create':
    case 'broadcast': {
      if (!notification || !notification.title) {
        return res.status(400).json({ success: false, error: 'Bildirishnoma sarlavhasi kiritilishi shart' });
      }
      db.notifications.unshift({
        id: notification.id || `notif-${Date.now()}`,
        title: notification.title,
        message: notification.message || '',
        category: notification.category || 'announcement',
        priority: notification.priority || 'high',
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        read: false,
        isArchived: false,
      });
      break;
    }
    case 'archive':
    case 'delete': {
      const n = db.notifications.find((item: any) => item.id === id);
      if (n) {
        n.isArchived = true;
        n.archivedAt = new Date().toISOString();
      }
      break;
    }
    default:
      return res.status(400).json({ success: false, error: 'Nomaʼlum bildirishnoma amali' });
  }

  writeDatabase(db);
  res.json({ success: true, notifications: db.notifications });
});

// 11. Telegram Drafts Moderation Queue (Admin Auth Strictly Required)
app.post('/api/database/drafts', requireAdminAuth, (req: Request, res: Response) => {
  const { action, id, reviewer } = req.body;
  const db = readDatabase();
  if (!Array.isArray(db.drafts)) db.drafts = [];

  const target = db.drafts.find((d: any) => d.id === id);
  if (!target) {
    return res.status(404).json({ success: false, error: 'Qoralama topilmadi' });
  }

  if (action === 'approve') {
    target.status = 'approved';
    target.reviewedBy = reviewer || req.adminUser?.email || 'Bosh Administrator';
    target.reviewedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);

    // Apply to schedule or articles if relevant
    if (target.targetSection === 'prayer' && target.prayerTimesDraft) {
      const pDraft = target.prayerTimesDraft;
      db.prayerSchedule.times = db.prayerSchedule.times.map((item: any) => {
        if (pDraft[item.key]) {
          return { ...item, time: pDraft[item.key] };
        }
        return item;
      });
      db.prayerSchedule.verifiedAt = target.reviewedAt;
    }
  } else if (action === 'reject') {
    target.status = 'rejected';
    target.reviewedBy = reviewer || req.adminUser?.email || 'Bosh Administrator';
    target.reviewedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
  } else if (action === 'archive' || action === 'delete') {
    target.isArchived = true;
    target.archivedAt = new Date().toISOString();
  }

  writeDatabase(db);
  res.json({ success: true, drafts: db.drafts, prayerSchedule: db.prayerSchedule });
});

// 12. Secondary Backup: Supabase Cloud Backup Status & Server-Side Snapshot (Admin Auth Required)
app.post(['/api/backup/supabase', '/api/database/supabase'], requireAdminAuth, async (req: Request, res: Response) => {
  const bodyUrl = req.body?.url?.trim();
  const bodyKey = req.body?.anonKey?.trim();
  const supabaseUrl = bodyUrl || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = bodyKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

  const db = readDatabase();
  db.supabaseConfig = {
    url: supabaseUrl,
    anonKey: supabaseKey && !supabaseKey.includes('••••') ? supabaseKey : db.supabaseConfig?.anonKey || '',
    adminEmail: AUTHORIZED_ADMIN_EMAIL,
    isEnabled: Boolean(req.body?.isEnabled ?? Boolean(supabaseUrl && supabaseKey)),
    lastSync: new Date().toISOString(),
  };
  writeDatabase(db);

  if (!supabaseUrl || !supabaseKey) {
    return res.json({
      success: false,
      configured: false,
      adminEmail: AUTHORIZED_ADMIN_EMAIL,
      role: 'secondary_backup_only',
      message: 'Supabase zaxira nusxa xizmati sozlanmagan (ixtiyoriy ikkilamchi zaxira). Asosiy maʼlumotlar bazasi: Firebase Firestore (asakaziyo0@gmail.com).',
    });
  }

  return res.json({
    success: true,
    configured: true,
    adminEmail: AUTHORIZED_ADMIN_EMAIL,
    role: 'secondary_backup_only',
    lastSync: db.supabaseConfig.lastSync,
    requestedBy: req.adminUser?.email || AUTHORIZED_ADMIN_EMAIL,
  });
});

// 12.1 List Backups & Queue Status (Admin Auth Required)
app.get('/api/backup/list', requireAdminAuth, (_req: Request, res: Response) => {
  const db = readDatabase();
  const backups = Array.isArray(db.backups) ? db.backups : [];
  const supabaseConfigured = Boolean(
    (db.supabaseConfig?.url || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) &&
      (db.supabaseConfig?.anonKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY)
  );
  return res.json({
    success: true,
    supabaseConfigured,
    adminEmail: AUTHORIZED_ADMIN_EMAIL,
    lastSync: db.supabaseConfig?.lastSync || null,
    backups: backups.map((b: any) => ({
      id: b.id,
      label: b.label,
      createdAt: b.createdAt,
      createdBy: b.createdBy,
      destination: b.destination,
      status: b.status,
      counts: b.counts,
    })),
  });
});

// 12.2 Create Full Backup Snapshot (Admin Auth Required)
app.post('/api/backup/create', requireAdminAuth, async (req: Request, res: Response) => {
  const db = readDatabase();
  if (!Array.isArray(db.backups)) db.backups = [];

  const payload = req.body?.snapshot || {};
  const label = req.body?.label || 'Administrator tomonidan yaratilgan zaxira nusxa';
  const nowIso = new Date().toISOString();

  const snapshotData = {
    prayerSchedule: payload.prayerSchedule || db.prayerSchedule,
    articles: Array.isArray(payload.articles) ? payload.articles : db.articles || [],
    mediaPosts: Array.isArray(payload.mediaPosts) ? payload.mediaPosts : db.mediaPosts || [],
    hadiths: Array.isArray(payload.hadiths) ? payload.hadiths : db.hadiths || [],
    dhikrs: Array.isArray(payload.dhikrs) ? payload.dhikrs : db.dhikrs || [],
    announcements: Array.isArray(payload.announcements) ? payload.announcements : db.announcements || [],
    news: Array.isArray(payload.news) ? payload.news : db.news || [],
    inquiries: Array.isArray(payload.inquiries) ? payload.inquiries : db.inquiries || [],
    drafts: Array.isArray(payload.drafts) ? payload.drafts : db.drafts || [],
    notifications: Array.isArray(payload.notifications) ? payload.notifications : db.notifications || [],
  };

  // Update server mirror with latest Firestore snapshot
  db.prayerSchedule = snapshotData.prayerSchedule;
  db.articles = snapshotData.articles;
  db.mediaPosts = snapshotData.mediaPosts;
  db.hadiths = snapshotData.hadiths;
  db.dhikrs = snapshotData.dhikrs;
  db.announcements = snapshotData.announcements;
  db.news = snapshotData.news;
  db.inquiries = snapshotData.inquiries;
  db.drafts = snapshotData.drafts;

  const counts = {
    prayerTimes: snapshotData.prayerSchedule?.times?.length || 8,
    articles: snapshotData.articles.length,
    mediaPosts: snapshotData.mediaPosts.length,
    hadiths: snapshotData.hadiths.length,
    dhikrs: snapshotData.dhikrs.length,
    announcements: snapshotData.announcements.length,
    news: snapshotData.news.length,
    inquiries: snapshotData.inquiries.length,
  };

  let destination = 'server_vault';
  let supabaseSynced = false;
  const supabaseUrl = db.supabaseConfig?.url || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey =
    (db.supabaseConfig?.anonKey && !db.supabaseConfig.anonKey.includes('••••') ? db.supabaseConfig.anonKey : '') ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    '';

  if (supabaseUrl && supabaseKey && db.supabaseConfig?.isEnabled) {
    try {
      const sbResp = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/asaka_ziyo_backups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          backup_id: `bk-${Date.now()}`,
          label,
          admin_email: AUTHORIZED_ADMIN_EMAIL,
          created_at: nowIso,
          payload: snapshotData,
        }),
      });
      if (sbResp.ok || sbResp.status === 201) {
        destination = 'supabase_and_server_vault';
        supabaseSynced = true;
      }
    } catch {
      // Fallback to server vault
    }
  }

  const newBackup = {
    id: `bk-${Date.now()}`,
    label,
    createdAt: nowIso,
    createdBy: req.adminUser?.email || AUTHORIZED_ADMIN_EMAIL,
    destination,
    status: supabaseSynced ? 'SUPABASE_VAULT_SYNCED' : 'LOCAL_SERVER_VAULT_SAVED',
    counts,
    data: snapshotData,
  };

  db.backups.unshift(newBackup);
  if (db.backups.length > 20) {
    db.backups = db.backups.slice(0, 20);
  }
  if (db.supabaseConfig) {
    db.supabaseConfig.lastSync = nowIso;
  }
  writeDatabase(db);

  return res.json({
    success: true,
    backup: {
      id: newBackup.id,
      label: newBackup.label,
      createdAt: newBackup.createdAt,
      createdBy: newBackup.createdBy,
      destination: newBackup.destination,
      status: newBackup.status,
      counts: newBackup.counts,
    },
  });
});

// 12.3 Restore Backup with Pre-Restore Safety Snapshot (Admin Auth Required)
app.post('/api/backup/restore', requireAdminAuth, (req: Request, res: Response) => {
  const { backupId } = req.body || {};
  const db = readDatabase();
  if (!Array.isArray(db.backups)) db.backups = [];

  const targetBackup = db.backups.find((b: any) => b.id === backupId);
  if (!targetBackup || !targetBackup.data) {
    return res.status(404).json({
      success: false,
      error: 'Tanlangan zaxira nusxasi topilmadi.',
    });
  }

  // 1. Create automatic pre-restore safety snapshot
  const nowIso = new Date().toISOString();
  const preRestoreSnapshot = {
    id: `bk-prerestore-${Date.now()}`,
    label: `Avtomatik himoya nusxasi (${targetBackup.id} tiklanishidan oldin)`,
    createdAt: nowIso,
    createdBy: req.adminUser?.email || AUTHORIZED_ADMIN_EMAIL,
    destination: 'server_vault',
    status: 'PRE_RESTORE_SAFETY_SNAPSHOT',
    counts: {
      prayerTimes: db.prayerSchedule?.times?.length || 8,
      articles: (db.articles || []).length,
      mediaPosts: (db.mediaPosts || []).length,
      hadiths: (db.hadiths || []).length,
      dhikrs: (db.dhikrs || []).length,
      announcements: (db.announcements || []).length,
      news: (db.news || []).length,
      inquiries: (db.inquiries || []).length,
    },
    data: {
      prayerSchedule: db.prayerSchedule,
      articles: db.articles || [],
      mediaPosts: db.mediaPosts || [],
      hadiths: db.hadiths || [],
      dhikrs: db.dhikrs || [],
      announcements: db.announcements || [],
      news: db.news || [],
      inquiries: db.inquiries || [],
      drafts: db.drafts || [],
      notifications: db.notifications || [],
    },
  };
  db.backups.unshift(preRestoreSnapshot);

  // 2. Restore data
  const restored = targetBackup.data;
  if (restored.prayerSchedule) db.prayerSchedule = restored.prayerSchedule;
  if (Array.isArray(restored.articles)) db.articles = restored.articles;
  if (Array.isArray(restored.mediaPosts)) db.mediaPosts = restored.mediaPosts;
  if (Array.isArray(restored.hadiths)) db.hadiths = restored.hadiths;
  if (Array.isArray(restored.dhikrs)) db.dhikrs = restored.dhikrs;
  if (Array.isArray(restored.announcements)) db.announcements = restored.announcements;
  if (Array.isArray(restored.news)) db.news = restored.news;
  if (Array.isArray(restored.inquiries)) db.inquiries = restored.inquiries;
  if (Array.isArray(restored.drafts)) db.drafts = restored.drafts;

  writeDatabase(db);

  return res.json({
    success: true,
    restoredBackupId: targetBackup.id,
    preRestoreBackupId: preRestoreSnapshot.id,
    data: restored,
  });
});

// ---------------------------------------------------------------------------
// 6. DEVELOPMENT & PRODUCTION VITE MOUNTING
// ---------------------------------------------------------------------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const httpServer = http.createServer(app);

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[ASAKA ZIYO] Secure Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
