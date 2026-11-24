/**
 * ASAKA ZIYO AI AGENT — Unified Intelligent Ecosystem Core (2026)
 *
 * Shared multi-channel AI Agent engine powering:
 *  - Web App (/api/agent/chat & /api/ai/chat)
 *  - Android Mobile App (Capacitor WebView -> /api/agent/*)
 *  - Telegram Bot (TelegramAiEngine integration)
 *
 * Architecture:
 *  - Strict server-side `@google/genai` SDK with `User-Agent: 'aistudio-build'`
 *  - Multi-tier Gemini Model Router:
 *      * Primary Intelligent / Agentic Model: `gemini-4-hydrogen` (ThinkingLevel.MEDIUM / HIGH + Function Calling)
 *      * Economical / Low-Latency Model: `gemini-3.1-flash-lite` (quick lookups & simple queries)
 *  - 8 Real Permitted Function Calling Tools (Prayer Times, Quran/Tafsiri Hilol, Sahih Hadith,
 *    Dhikr/Duas, Mosque News/Articles, Qibla/Mosque Info, Safe App Navigation, Imam/Admin Escalation)
 *  - Scholarly Hanafi / Uzbekistan Muslim Board safety guardrails & zero fabricated citations
 *  - 5-locale support (`uz-Latn`, `uz-Cyrl`, `uz-Latn-new` with Arabic preservation, `ru`, `en`)
 */

import {
  GoogleGenAI,
  ThinkingLevel,
  Type,
  type FunctionDeclaration,
} from '@google/genai';
import { SURAHS_LIST } from '../src/data/quranData';
import { TAFSIRI_HILOL_ENTRIES } from '../src/data/tafsirHilolData';
import { AUTHENTIC_HADITHS } from '../src/data/hadithData';
import { AUTHENTIC_DHIKRS } from '../src/data/dhikrData';
import { EDITORIAL_ARTICLES } from '../src/data/articlesData';
import { toNewUzbekAlphabet } from '../src/utils/newUzbekAlphabet';

export const AGENT_PRIMARY_MODEL = 'gemini-4-hydrogen';
export const AGENT_FAST_MODEL = 'gemini-3.1-flash-lite';

export type AgentChannel = 'web' | 'android' | 'telegram';
export type AgentRoutingMode = 'auto' | 'deep' | 'fast';
export type AgentReasoningTier = 'fast' | 'intelligent' | 'deep';

export interface AgentChatMessage {
  id?: string;
  role: 'user' | 'model';
  content: string;
}

export interface AgentToolTraceItem {
  id: string;
  name: string;
  labelUz: string;
  status: 'completed' | 'failed';
  summary: string;
  durationMs: number;
}

export interface AgentActionDirective {
  id: string;
  type: 'navigate' | 'open_imam_form' | 'open_search' | 'open_tv_mode' | 'toggle_theme';
  targetTab?: string;
  label: string;
  subtitle?: string;
  params?: Record<string, string | number>;
}

export interface AgentSourceCitation {
  type: 'quran' | 'tafsir' | 'hadith' | 'dhikr' | 'prayer' | 'article' | 'mosque';
  title: string;
  reference: string;
}

export interface AgentEscalationRecord {
  created: boolean;
  ticketId: string;
  target: 'imam' | 'admin';
  category: string;
  summary: string;
  createdAt: string;
}

export interface AgentModelDescriptor {
  id: string;
  tier: AgentReasoningTier;
  label: string;
  descriptionUz: string;
  supportsTools: boolean;
  supportsThinking: boolean;
  defaultFor: string;
}

export interface AgentProbeResult {
  model: string;
  available: boolean;
  latencyMs: number;
  checkedAt: string;
  httpStatus?: number;
  detail: string;
}

export interface AgentRunInput {
  messages: AgentChatMessage[];
  locale?: string;
  channel?: AgentChannel;
  routingMode?: AgentRoutingMode;
  userId?: string;
  userName?: string;
  preferredModel?: string;
}

export interface AgentRunResult {
  success: boolean;
  reply: string;
  modelUsed: string;
  routingMode: AgentRoutingMode;
  reasoningTier: AgentReasoningTier;
  channel: AgentChannel;
  toolTrace: AgentToolTraceItem[];
  actions: AgentActionDirective[];
  sources: AgentSourceCitation[];
  escalation?: AgentEscalationRecord;
  sensitiveFatwaDetected: boolean;
  latencyMs: number;
  timestamp: string;
}

export type AgentStreamEvent =
  | { type: 'meta'; modelUsed: string; routingMode: AgentRoutingMode; reasoningTier: AgentReasoningTier; channel: AgentChannel }
  | { type: 'tool_start'; id: string; name: string; labelUz: string }
  | { type: 'tool_done'; item: AgentToolTraceItem }
  | { type: 'action'; action: AgentActionDirective }
  | { type: 'escalation'; escalation: AgentEscalationRecord }
  | { type: 'text'; text: string }
  | { type: 'done'; result: AgentRunResult }
  | { type: 'error'; error: string; aiUnavailable?: boolean; model?: string };

export interface AgentHostDependencies {
  readDatabase: () => any;
  createEscalationTicket: (payload: {
    target: 'imam' | 'admin';
    category: string;
    questionSummary: string;
    userName: string;
    userId: string;
    channel: AgentChannel;
    locale: string;
  }) => Promise<AgentEscalationRecord>;
}

/**
 * Strict whitelist of permitted user-facing navigation tabs the AI Agent may direct to.
 * Admin/privileged panels are explicitly excluded from autonomous navigation.
 */
export const PERMITTED_AGENT_TABS: Record<
  string,
  { labelUz: string; subtitleUz: string }
> = {
  home: { labelUz: 'Bosh sahifa', subtitleUz: 'Asosiy boshqaruv paneli' },
  prayer: { labelUz: 'Namoz vaqtlari va Qibla', subtitleUz: 'Asaka 8 mahal jadvali va 3D Qibla' },
  quran: { labelUz: 'Qurʼoni Karim', subtitleUz: '114 sura, Tafsiri Hilol va qorilar' },
  hadith: { labelUz: 'Sahih Hadislar', subtitleUz: 'Imom Buxoriy va Muslim toʻplamlari' },
  dhikr: { labelUz: 'Zikr, Duolar va Tasbeh', subtitleUz: 'Tonggi-kechki zikrlar va raqamli tasbeh' },
  hifz_istiqomat: { labelUz: 'Hifz va Istiqomat', subtitleUz: 'Qurʼon yodlash va murojaʼa tizimi' },
  academy: { labelUz: 'Tajvid Akademiyasi', subtitleUz: 'Bosqichma-bosqich Qurʼon darslari' },
  khatm_planner: { labelUz: 'Xatm Rejasi', subtitleUz: '30 juzlik shaxsiy xatm taqvimi' },
  quiz: { labelUz: 'Islomiy Viktorina', subtitleUz: 'Bilimingizni sinash testlari' },
  quran_quiz: { labelUz: 'Kunlik Qurʼon Viktorinasi', subtitleUz: 'Audio oyatli kunlik 10 savol' },
  articles: { labelUz: 'Ilmiy Maqolalar', subtitleUz: 'Tahririyat maʼrifiy maqolalari' },
  library: { labelUz: 'Islomiy Kutubxona', subtitleUz: 'Raqamli kitoblar va manbalar' },
  scholars: { labelUz: 'Ulamolar va Qorilar', subtitleUz: 'Ustozlar va mashhur qorilar' },
  mosques: { labelUz: 'Masjidlar va Manzil', subtitleUz: 'Asaka tumani masjidlari xaritasi' },
  media_center: { labelUz: 'Media Markaz', subtitleUz: 'Audio va video maʼruzalar' },
  calendar: { labelUz: 'Hijriy Taqvim', subtitleUz: 'Muhim islomiy sanalar taqvimi' },
  fasting: { labelUz: 'Roʻza Yordamchisi', subtitleUz: 'Saharlik, iftorlik va nafl roʻzalar' },
  ask_imam: { labelUz: 'Imomga Savol', subtitleUz: 'Rasmiy imom-xatibga shaxsiy murojaat' },
  favorites: { labelUz: 'Sevimlilar', subtitleUz: 'Saqlangan oyat, hadis va duolar' },
  notifications: { labelUz: 'Bildirishnomalar', subtitleUz: 'Masjid eʼlonlari va eslatmalar' },
  settings: { labelUz: 'Sozlamalar', subtitleUz: 'Til, mavzu va bildirishnoma sozlamalari' },
};

export const AGENT_MODEL_CATALOG: AgentModelDescriptor[] = [
  {
    id: AGENT_PRIMARY_MODEL,
    tier: 'intelligent',
    label: 'Gemini 4 Hydrogen (Asosiy Agent)',
    descriptionUz:
      'Murakkab fiqhiy-ilmiy tahlil, koʻp bosqichli vositalarni (Function Calling) boshqarish va chuqur tafsir uchun asosiy model.',
    supportsTools: true,
    supportsThinking: true,
    defaultFor: 'auto_complex_and_deep',
  },
  {
    id: AGENT_FAST_MODEL,
    tier: 'fast',
    label: 'Gemini 3.1 Flash-Lite (Tezkor)',
    descriptionUz:
      'Namoz vaqtlari, qisqa zikrlar va oddiy savollarga eng tez va tejamkor javob beruvchi model.',
    supportsTools: true,
    supportsThinking: false,
    defaultFor: 'fast_and_simple',
  },
];

const ALLOWED_MODEL_IDS = new Set<string>([AGENT_PRIMARY_MODEL, AGENT_FAST_MODEL]);

const TOOL_LABELS_UZ: Record<string, string> = {
  get_prayer_times: 'Asaka namoz taqvimi tekshirildi',
  search_quran_and_tafsir: 'Qurʼon va Tafsiri Hilol qidirildi',
  search_authentic_hadith: 'Sahih hadislar bazasi tekshirildi',
  search_dhikr_and_duas: 'Zikr va duolar toʻplami qidirildi',
  search_articles_and_mosque_news: 'Maqola va masjid eʼlonlari tekshirildi',
  get_qibla_and_mosque_info: 'Masjid va Qibla maʼlumotlari olindi',
  navigate_app_section: 'Ilova boʻlimiga tezkor oʻtish tayyorlandi',
  escalate_to_imam_or_admin: 'Imom / Maʼmuriyatga rasmiy murojaat yaratildi',
};

const SENSITIVE_FATWA_REGEX =
  /(taloq|talak|талоқ|талак|развод|divorce|nikoh.*buz|nikoh.*qayta|meros\s+taqsim|наследств|inheritance\s+share|qarz\s+nizo|sud\s+ish|fatvo\s+ber|фатво|idda\s+muddat|xula|zihar|qasos|qotillik|oʻz\s+joniga)/i;

const COMPLEX_QUERY_REGEX =
  /(tafsir|sharh|qiyosla|farqi\s+nima|dalil|fiqh|mazhab|hanafiy|shofi|aqida|moturid|hikmat|sabab|bosqich|reja|tuzib\s+ber|tahlil|imomga|administrator|murojaat|ochib\s+ber|oʻtkaz|koʻrsat|compare|explain\s+in\s+detail|подробно|сравни|тафсир)/i;

const ACTION_INTENT_REGEX =
  /(ochib\s+ber|oʻtish|oʻtkaz|sahifasiga|boʻlimini\s+och|imomga\s+yubor|imomga\s+savol|adminga|masjid\s+tv|qiblani\s+och|namoz\s+vaqt|bomdod|peshin|asr|shom|xufton|saharlik|iftorlik|surasi|oyat|hadis|zikr|duo|maqola|yangilik|eʼlon)/i;

export function resolveConfiguredPrimaryModel(): string {
  const envRaw = (process.env.GEMINI_MODEL || '').trim();
  if (envRaw && ALLOWED_MODEL_IDS.has(envRaw)) {
    return envRaw;
  }
  return AGENT_PRIMARY_MODEL;
}

export function isSensitiveFatwaTopic(text: string): boolean {
  return SENSITIVE_FATWA_REGEX.test(text || '');
}

export function selectAgentModelAndTier(
  userQuery: string,
  routingMode: AgentRoutingMode = 'auto',
  preferredModel?: string
): { model: string; tier: AgentReasoningTier; thinkingLevel?: ThinkingLevel } {
  if (preferredModel && ALLOWED_MODEL_IDS.has(preferredModel)) {
    if (preferredModel === AGENT_FAST_MODEL) {
      return { model: AGENT_FAST_MODEL, tier: 'fast' };
    }
    return {
      model: AGENT_PRIMARY_MODEL,
      tier: routingMode === 'deep' ? 'deep' : 'intelligent',
      thinkingLevel: routingMode === 'deep' ? ThinkingLevel.HIGH : ThinkingLevel.MEDIUM,
    };
  }

  if (routingMode === 'fast') {
    return { model: AGENT_FAST_MODEL, tier: 'fast' };
  }

  if (routingMode === 'deep') {
    return {
      model: resolveConfiguredPrimaryModel(),
      tier: 'deep',
      thinkingLevel: ThinkingLevel.HIGH,
    };
  }

  // 'auto' intelligent routing:
  // Route complex reasoning, sensitive fatwa guidance, multi-step tool/action requests,
  // or longer queries to Gemini 4 Hydrogen; keep short, simple conversational turns fast on Flash-Lite.
  const trimmed = (userQuery || '').trim();
  const needsPrimary =
    trimmed.length >= 90 ||
    COMPLEX_QUERY_REGEX.test(trimmed) ||
    ACTION_INTENT_REGEX.test(trimmed) ||
    SENSITIVE_FATWA_REGEX.test(trimmed);

  if (needsPrimary) {
    return {
      model: resolveConfiguredPrimaryModel(),
      tier: 'intelligent',
      thinkingLevel: ThinkingLevel.MEDIUM,
    };
  }

  return {
    model: AGENT_FAST_MODEL,
    tier: 'fast',
  };
}

export function createGeminiServerClient(apiKey?: string): GoogleGenAI {
  const resolvedKey = (apiKey ?? process.env.GEMINI_API_KEY ?? '').trim();
  if (!resolvedKey) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
  }
  return new GoogleGenAI({
    apiKey: resolvedKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export const AGENT_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'get_prayer_times',
    description:
      'Returns the verified real-time Asaka (Andijan, Uzbekistan) 8-time prayer schedule (Tahajjud, Bomdod, Quyosh, Peshin, Asr, Shom, Xufton), Iqamah times, Hijri date, and Qibla angle.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        prayerKey: {
          type: Type.STRING,
          description:
            'Optional specific prayer name or key to highlight (e.g. bomdod, peshin, asr, shom, xufton, tahajjud, all).',
        },
      },
    },
  },
  {
    name: 'search_quran_and_tafsir',
    description:
      'Searches the verified ASAKA ZIYO Quran Surah index (114 Surahs) and Tafsiri Hilol scholarly overviews by Surah name, number, or topic keyword.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: 'Surah name, Surah number (1-114), or Quranic topic keyword (e.g. Baqara, Yosin, Fotiha, 36, Oyatul Kursiy).',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_authentic_hadith',
    description:
      'Searches verified authentic Hadiths (Sahih al-Bukhari, Sahih Muslim, Riyozus Solihiyn) stored in the ASAKA ZIYO database by topic or keyword.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: 'Topic or keyword to search (e.g. ilm, ota-ona, sabr, niyat, namoz, sadaqa).',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_dhikr_and_duas',
    description:
      'Searches verified morning/evening adhkar, post-prayer duas, and daily remembrances with Arabic text, transliteration, and Uzbek meaning.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: 'Dhikr or Dua topic (e.g. tonggi, kechki, istigfor, safar, uyqu, namozdan keyin).',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_articles_and_mosque_news',
    description:
      'Searches published ASAKA ZIYO scholarly articles, community news, and official MuhammadSolih Hoji Mosque announcements.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: 'Optional topic keyword to filter articles, news, and announcements.',
        },
      },
    },
  },
  {
    name: 'get_qibla_and_mosque_info',
    description:
      'Returns official MuhammadSolih Hoji Jome Mosque (Asaka) details, exact Qibla azimuth (241° WSW), coordinates, and official Telegram channels.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        topic: {
          type: Type.STRING,
          description: 'Optional focus: qibla, address, channels, or all.',
        },
      },
    },
  },
  {
    name: 'navigate_app_section',
    description:
      'Creates a safe one-tap navigation action button for the user to open a permitted ASAKA ZIYO app module (e.g. prayer, quran, hadith, dhikr, hifz_istiqomat, academy, khatm_planner, quiz, quran_quiz, articles, library, scholars, mosques, media_center, calendar, fasting, ask_imam, favorites, settings). NEVER use for admin.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        targetTab: {
          type: Type.STRING,
          description:
            'Permitted tab ID: home, prayer, quran, hadith, dhikr, hifz_istiqomat, academy, khatm_planner, quiz, quran_quiz, articles, library, scholars, mosques, media_center, calendar, fasting, ask_imam, favorites, notifications, settings.',
        },
        reasonUz: {
          type: Type.STRING,
          description: 'Short clear Uzbek description of why opening this section helps the user.',
        },
      },
      required: ['targetTab'],
    },
  },
  {
    name: 'escalate_to_imam_or_admin',
    description:
      'Escalates a user inquiry to a qualified Imam at MuhammadSolih Hoji Mosque or to the ASAKA ZIYO platform Administrator, creating a tracked official ticket. Use when the user explicitly asks to contact an Imam/Admin OR asks a personal fatwa / sensitive fiqh dispute (divorce/talaq, inheritance, marriage contract) and wants official review.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        target: {
          type: Type.STRING,
          description: 'Destination: "imam" for religious/fatwa guidance or "admin" for technical/mosque platform support.',
        },
        category: {
          type: Type.STRING,
          description: 'Short category label (e.g. "Fiqh va Fatvo", "Oila masalasi", "Texnik yordam", "Masjid murojaati").',
        },
        questionSummary: {
          type: Type.STRING,
          description: 'Clear concise summary of the user question to forward to the Imam or Administrator.',
        },
      },
      required: ['target', 'questionSummary'],
    },
  },
];

function buildUnifiedAgentSystemInstruction(
  locale: string,
  channel: AgentChannel,
  sensitiveFatwa: boolean
): string {
  const channelRules =
    channel === 'telegram'
      ? 'CHANNEL FORMAT (TELEGRAM): Keep response crisp (under 1400 chars), clean plain text with simple bullet points (•). NEVER output raw Unicode emojis or <tg-emoji> tags.'
      : 'CHANNEL FORMAT (WEB & ANDROID LIQUID GLASS UI): Use clean structured headings, short readable paragraphs, Arabic verses clearly separated on their own line when relevant, and concise scholarly clarity.';

  const fatwaBlock = sensitiveFatwa
    ? `\nSENSITIVE PERSONAL FATWA NOTICE: The user's message touches on a sensitive personal Shariah ruling (e.g. talaq, nikoh, inheritance, or dispute). You MUST:
  1. Never issue a binding personal fatwa.
  2. Briefly explain general Hanafi principles if helpful.
  3. Recommend consulting the Uzbekistan Muslim Board (Oʻzbekiston musulmonlari idorasi) or MuhammadSolih Hoji Jome Mosque Imam-Khatib, AND offer/invoke the 'navigate_app_section' tool for 'ask_imam' (or 'escalate_to_imam_or_admin' if the user asked to submit it directly).`
    : '';

  return `You are ASAKA ZIYO AI AGENT — the official, autonomous, scholarly Islamic Digital Ecosystem Agent for MuhammadSolih Hoji Jome Mosque (Asaka, Andijan Region, Uzbekistan).

CORE IDENTITY & CAPABILITIES:
- You are NOT a generic chatbot. You are a real tool-equipped AI Agent integrated into the ASAKA ZIYO Web App, Android Mobile App, and Telegram Bot.
- ALWAYS use your verified tools before answering questions about:
  * Asaka prayer times / Saharlik / Iftorlik -> call \`get_prayer_times\`
  * Quran Surahs, Ayah counts, Tafsiri Hilol -> call \`search_quran_and_tafsir\`
  * Authentic Hadiths -> call \`search_authentic_hadith\`
  * Morning/evening Dhikr & Duas -> call \`search_dhikr_and_duas\`
  * Mosque announcements, articles, or news -> call \`search_articles_and_mosque_news\`
  * Qibla angle or Mosque address/channels -> call \`get_qibla_and_mosque_info\`
  * When the user wants to open or use an app feature (e.g., "Tasbehni och", "Qurʼon oʻqish", "Namoz jadvalini koʻrsat", "Imomga savol") -> call \`navigate_app_section\`
  * When the user explicitly requests to submit a message/question to an Imam or Admin -> call \`escalate_to_imam_or_admin\`

LANGUAGE & SCRIPT DISCIPLINE:
- Active UI locale: "${locale}".
- Match the user's message language naturally; if ambiguous, reply in "${locale}":
  * "uz-Latn" / "uz-Latn-new": Literary Uzbek Latin script.
  * "uz-Cyrl": Uzbek Cyrillic script.
  * "ru": Russian.
  * "en": English.
- Preserve authentic Arabic script with proper diacritics when quoting Quranic verses or Duas.

SCHOLARLY INTEGRITY & SAFETY:
1. Follow Sunni Moturidiy aqida and Hanafi fiqh (Oʻzbekiston musulmonlari idorasi standard), referencing Tafsiri Hilol (Shayx Muhammad Sodiq Muhammad Yusuf), Sahih al-Bukhari, Sahih Muslim, and Riyozus Solihiyn.
2. NEVER invent Quranic verses, Hadith texts, isnads, or prayer times. Rely on tool outputs for live Asaka data.
3. Clearly distinguish Quranic verse vs. Hadith vs. scholarly explanation.
4. Maintain a serene, warm, respectful, deeply trustworthy tone.
${channelRules}${fatwaBlock}`;
}

function normalizeConversationHistory(
  messages: AgentChatMessage[]
): Array<{ role: 'user' | 'model'; parts: Array<Record<string, any>> }> {
  const cleaned: Array<{ role: 'user' | 'model'; parts: Array<Record<string, any>> }> = [];
  for (const m of messages || []) {
    const text = String(m?.content || '').trim();
    if (!text) continue;
    if (m?.id === 'msg-welcome') continue;
    const role: 'user' | 'model' = m?.role === 'user' ? 'user' : 'model';
    if (cleaned.length === 0 && role === 'model') continue;
    if (cleaned.length > 0 && cleaned[cleaned.length - 1].role === role) {
      cleaned[cleaned.length - 1].parts[0].text += `\n\n${text}`;
    } else {
      cleaned.push({ role, parts: [{ text }] });
    }
  }
  return cleaned;
}

function localizeIfNewUzbek(text: string, locale: string): string {
  if (locale === 'uz-Latn-new') {
    return toNewUzbekAlphabet(text);
  }
  return text;
}

/**
 * Executes a permitted ASAKA ZIYO Agent tool safely on the server.
 */
async function executeAgentTool(
  toolName: string,
  args: Record<string, any>,
  ctx: {
    deps: AgentHostDependencies;
    locale: string;
    channel: AgentChannel;
    userId: string;
    userName: string;
    actions: AgentActionDirective[];
    sources: AgentSourceCitation[];
    setEscalation: (rec: AgentEscalationRecord) => void;
  }
): Promise<{ output: Record<string, any>; summary: string }> {
  const db = ctx.deps.readDatabase() || {};

  if (toolName === 'get_prayer_times') {
    const schedule = db.prayerSchedule || {};
    const times = Array.isArray(schedule.times) ? schedule.times : [];
    const prayerKey = String(args?.prayerKey || 'all').toLowerCase();
    const filtered =
      prayerKey && prayerKey !== 'all'
        ? times.filter(
            (t: any) =>
              String(t.key || '').toLowerCase().includes(prayerKey) ||
              String(t.nameUz || '').toLowerCase().includes(prayerKey)
          )
        : times;

    ctx.sources.push({
      type: 'prayer',
      title: schedule.location || 'Asaka shahri 8 mahal namoz taqvimi',
      reference: `${schedule.date || 'Bugun'} · Hijriy ${schedule.hijriDate || '1448'}`,
    });

    if (!ctx.actions.some((a) => a.targetTab === 'prayer')) {
      ctx.actions.push({
        id: `act-prayer-${Date.now()}`,
        type: 'navigate',
        targetTab: 'prayer',
        label: 'Namoz vaqtlari jadvalini ochish',
        subtitle: 'Asaka 8 mahal taqvimi va 3D Qibla',
      });
    }

    return {
      summary: `${times.length} mahal Asaka namoz jadvali olindi`,
      output: {
        location: schedule.location || 'Asaka shahri, Andijon viloyati',
        mosque: '«MuhammadSolih Hoji» jomeʼ masjidi',
        date: schedule.date || new Date().toISOString().slice(0, 10),
        hijriDate: schedule.hijriDate || '',
        qiblaAngleDeg: schedule.qiblaAngleDeg || 241,
        timezone: 'Asia/Tashkent (UTC+5)',
        times: (filtered.length > 0 ? filtered : times).map((t: any) => ({
          key: t.key,
          nameUz: t.nameUz,
          time: t.time,
          iqamahTime: t.iqamahTime || null,
        })),
      },
    };
  }

  if (toolName === 'search_quran_and_tafsir') {
    const q = String(args?.query || '').trim().toLowerCase();
    const numQuery = parseInt(q, 10);
    const matchedSurahs = SURAHS_LIST.filter((s) => {
      if (!q) return false;
      if (!Number.isNaN(numQuery) && s.number === numQuery) return true;
      return (
        s.nameUz.toLowerCase().includes(q) ||
        s.nameAr.includes(q) ||
        s.meaningUz.toLowerCase().includes(q) ||
        q.includes(s.nameUz.toLowerCase())
      );
    }).slice(0, 4);

    const matchedTafsirs = TAFSIRI_HILOL_ENTRIES.filter((t) => {
      if (!q) return false;
      if (!Number.isNaN(numQuery) && t.surahNumber === numQuery) return true;
      return (
        t.surahNameUz.toLowerCase().includes(q) ||
        q.includes(t.surahNameUz.toLowerCase()) ||
        t.tafsirOverview.toLowerCase().includes(q)
      );
    }).slice(0, 3);

    for (const s of matchedSurahs.slice(0, 2)) {
      ctx.sources.push({
        type: 'quran',
        title: `${s.number}. ${s.nameUz} surasi (${s.meaningUz})`,
        reference: `${s.numberOfAyahs} oyat · ${s.revelationType} · ${s.pageNumber}-sahifa`,
      });
    }
    for (const t of matchedTafsirs.slice(0, 1)) {
      ctx.sources.push({
        type: 'tafsir',
        title: `Tafsiri Hilol — ${t.surahNameUz}`,
        reference: 'Shayx Muhammad Sodiq Muhammad Yusuf',
      });
    }

    if (!ctx.actions.some((a) => a.targetTab === 'quran')) {
      ctx.actions.push({
        id: `act-quran-${Date.now()}`,
        type: 'navigate',
        targetTab: 'quran',
        label: matchedSurahs[0]
          ? `${matchedSurahs[0].nameUz} surasini Qurʼon boʻlimida ochish`
          : 'Qurʼoni Karim boʻlimini ochish',
        subtitle: 'Arabcha matn, Tafsiri Hilol va qorilar tilovati',
      });
    }

    return {
      summary: `${matchedSurahs.length} ta sura va ${matchedTafsirs.length} ta tafsir yozuvi topildi`,
      output: {
        query: args?.query || '',
        surahs: matchedSurahs.map((s) => ({
          number: s.number,
          nameUz: s.nameUz,
          nameAr: s.nameAr,
          meaningUz: s.meaningUz,
          numberOfAyahs: s.numberOfAyahs,
          revelationType: s.revelationType,
          pageNumber: s.pageNumber,
        })),
        tafsirHilol: matchedTafsirs.map((t) => ({
          surahNumber: t.surahNumber,
          surahNameUz: t.surahNameUz,
          overview: t.tafsirOverview.slice(0, 500),
          keyThemes: t.keyThemes || [],
        })),
      },
    };
  }

  if (toolName === 'search_authentic_hadith') {
    const q = String(args?.query || '').trim().toLowerCase();
    const tokens = q.split(/\s+/).filter((w) => w.length >= 3);
    const dbHadiths = Array.isArray(db.hadiths) ? db.hadiths.filter((h: any) => !h.isArchived) : [];
    const combined = [...AUTHENTIC_HADITHS, ...dbHadiths];

    const matches = combined
      .filter((h: any) => {
        if (tokens.length === 0) return true;
        const hay = `${h.chapterUz || ''} ${h.translationUz || ''} ${h.narrator || ''} ${(h.keywords || []).join(' ')} ${h.reference || h.source || ''}`.toLowerCase();
        return tokens.some((tok) => hay.includes(tok));
      })
      .slice(0, 4);

    for (const h of matches.slice(0, 2)) {
      ctx.sources.push({
        type: 'hadith',
        title: h.chapterUz || 'Sahih Hadis',
        reference: `${h.reference || h.source || 'Sahih toʻplam'} (${h.grade || 'Sahih'})`,
      });
    }

    if (!ctx.actions.some((a) => a.targetTab === 'hadith')) {
      ctx.actions.push({
        id: `act-hadith-${Date.now()}`,
        type: 'navigate',
        targetTab: 'hadith',
        label: 'Sahih Hadislar toʻplamini ochish',
        subtitle: 'Manba, roviy va sharhlari bilan',
      });
    }

    return {
      summary: `${matches.length} ta ishonchli hadis topildi`,
      output: {
        count: matches.length,
        hadiths: matches.map((h: any) => ({
          chapterUz: h.chapterUz || '',
          narrator: h.narrator || '',
          reference: h.reference || h.source || '',
          grade: h.grade || 'Sahih',
          arabic: (h.arabic || '').slice(0, 320),
          translationUz: (h.translationUz || '').slice(0, 420),
        })),
      },
    };
  }

  if (toolName === 'search_dhikr_and_duas') {
    const q = String(args?.query || '').trim().toLowerCase();
    const tokens = q.split(/\s+/).filter((w) => w.length >= 3);
    const dbDhikrs = Array.isArray(db.dhikrs) ? db.dhikrs.filter((d: any) => !d.isArchived) : [];
    const combined = [...AUTHENTIC_DHIKRS, ...dbDhikrs];

    const matches = combined
      .filter((d: any) => {
        if (tokens.length === 0) return true;
        const hay = `${d.titleUz || ''} ${d.translationUz || ''} ${d.categoryTitleUz || ''} ${d.category || ''} ${d.transliteration || ''}`.toLowerCase();
        return tokens.some((tok) => hay.includes(tok));
      })
      .slice(0, 4);

    for (const d of matches.slice(0, 2)) {
      ctx.sources.push({
        type: 'dhikr',
        title: d.titleUz || 'Kunlik Zikr',
        reference: d.source || 'Hisnul Muslim',
      });
    }

    if (!ctx.actions.some((a) => a.targetTab === 'dhikr')) {
      ctx.actions.push({
        id: `act-dhikr-${Date.now()}`,
        type: 'navigate',
        targetTab: 'dhikr',
        label: 'Zikr, Duolar va Raqamli Tasbehni ochish',
        subtitle: 'Taktil tasbeh va sahih duolar',
      });
    }

    return {
      summary: `${matches.length} ta zikr va duo topildi`,
      output: {
        count: matches.length,
        dhikrs: matches.map((d: any) => ({
          titleUz: d.titleUz,
          category: d.categoryTitleUz || d.category,
          arabic: d.arabic,
          transliteration: d.transliteration,
          translationUz: d.translationUz,
          count: d.count || d.recommendedCount || 33,
          source: d.source,
        })),
      },
    };
  }

  if (toolName === 'search_articles_and_mosque_news') {
    const q = String(args?.query || '').trim().toLowerCase();
    const tokens = q.split(/\s+/).filter((w) => w.length >= 3);
    const dbArticles = Array.isArray(db.articles) ? db.articles.filter((a: any) => !a.isArchived) : [];
    const articlesPool = dbArticles.length > 0 ? dbArticles : EDITORIAL_ARTICLES;
    const newsPool = Array.isArray(db.news) ? db.news.filter((n: any) => !n.isArchived) : [];
    const announcementsPool = Array.isArray(db.announcements)
      ? db.announcements.filter((a: any) => !a.isArchived)
      : [];

    const filterItems = (items: any[]) =>
      items
        .filter((item) => {
          if (tokens.length === 0) return true;
          const hay = `${item.title || ''} ${item.excerpt || ''} ${item.content || ''} ${item.category || ''}`.toLowerCase();
          return tokens.some((tok) => hay.includes(tok));
        })
        .slice(0, 3);

    const matchedArticles = filterItems(articlesPool);
    const matchedNews = filterItems(newsPool);
    const matchedAnnouncements = filterItems(announcementsPool);

    for (const a of matchedArticles.slice(0, 2)) {
      ctx.sources.push({
        type: 'article',
        title: a.title,
        reference: a.category || 'ASAKA ZIYO Maqola',
      });
    }

    if (!ctx.actions.some((a) => a.targetTab === 'articles')) {
      ctx.actions.push({
        id: `act-articles-${Date.now()}`,
        type: 'navigate',
        targetTab: 'articles',
        label: 'Maqolalar va eʼlonlar boʻlimini ochish',
        subtitle: 'Ilmiy maqolalar va masjid yangiliklari',
      });
    }

    return {
      summary: `${matchedArticles.length} maqola, ${matchedNews.length} yangilik, ${matchedAnnouncements.length} eʼlon tekshirildi`,
      output: {
        articles: matchedArticles.map((a: any) => ({
          title: a.title,
          category: a.category,
          excerpt: (a.excerpt || '').slice(0, 240),
        })),
        news: matchedNews.map((n: any) => ({
          title: n.title,
          excerpt: (n.excerpt || n.body || '').slice(0, 200),
        })),
        announcements: matchedAnnouncements.map((a: any) => ({
          title: a.title,
          body: (a.body || a.excerpt || '').slice(0, 200),
        })),
      },
    };
  }

  if (toolName === 'get_qibla_and_mosque_info') {
    const schedule = db.prayerSchedule || {};
    ctx.sources.push({
      type: 'mosque',
      title: '«MuhammadSolih Hoji» jomeʼ masjidi',
      reference: 'Asaka shahri, Andijon · Qibla 241° WSW',
    });

    if (!ctx.actions.some((a) => a.targetTab === 'mosques')) {
      ctx.actions.push({
        id: `act-mosques-${Date.now()}`,
        type: 'navigate',
        targetTab: 'mosques',
        label: 'Masjidlar va Qibla boʻlimini ochish',
        subtitle: 'Asaka masjidlari va 241° Qibla kompasi',
      });
    }

    return {
      summary: 'Asaka jomeʼ masjidi va Qibla (241°) maʼlumotlari olindi',
      output: {
        mosqueName: '«MuhammadSolih Hoji» jomeʼ masjidi',
        city: 'Asaka shahri, Andijon viloyati, Oʻzbekiston',
        coordinates: { latitude: 40.6415, longitude: 72.2387 },
        qiblaAngleDeg: schedule.qiblaAngleDeg || 241,
        qiblaDirection: 'Janubi-gʻarb (WSW · 241°)',
        telegramChannels: ['@Asaka_Ziyo', '@muhiddinsahhofuz'],
      },
    };
  }

  if (toolName === 'navigate_app_section') {
    const rawTab = String(args?.targetTab || '').trim();
    const meta = PERMITTED_AGENT_TABS[rawTab];
    if (!meta) {
      return {
        summary: `Ruxsat etilmagan boʻlim rad etildi (${rawTab})`,
        output: {
          allowed: false,
          error: `Tab "${rawTab}" is not in the permitted user navigation whitelist.`,
          permittedTabs: Object.keys(PERMITTED_AGENT_TABS),
        },
      };
    }

    if (!ctx.actions.some((a) => a.targetTab === rawTab)) {
      ctx.actions.push({
        id: `act-nav-${rawTab}-${Date.now()}`,
        type: 'navigate',
        targetTab: rawTab,
        label: `${meta.labelUz} boʻlimini ochish`,
        subtitle: String(args?.reasonUz || meta.subtitleUz),
      });
    }

    return {
      summary: `«${meta.labelUz}» boʻlimiga tezkor oʻtish tugmasi tayyorlandi`,
      output: {
        allowed: true,
        targetTab: rawTab,
        label: meta.labelUz,
      },
    };
  }

  if (toolName === 'escalate_to_imam_or_admin') {
    const target: 'imam' | 'admin' = String(args?.target || '').toLowerCase() === 'admin' ? 'admin' : 'imam';
    const category = String(args?.category || (target === 'imam' ? 'Fiqh va Sharʼiy savol' : 'Platforma yordami')).slice(0, 80);
    const questionSummary = String(args?.questionSummary || '').trim().slice(0, 1200);

    const record = await ctx.deps.createEscalationTicket({
      target,
      category,
      questionSummary: questionSummary || 'Foydalanuvchi AI Agent orqali murojaat yubordi.',
      userName: ctx.userName || 'ASAKA ZIYO Foydalanuvchisi',
      userId: ctx.userId || 'guest_agent_user',
      channel: ctx.channel,
      locale: ctx.locale,
    });

    ctx.setEscalation(record);

    if (!ctx.actions.some((a) => a.targetTab === 'ask_imam')) {
      ctx.actions.push({
        id: `act-escalate-${Date.now()}`,
        type: 'navigate',
        targetTab: 'ask_imam',
        label: target === 'imam' ? '«Imomga Savol» boʻlimini ochish' : 'Murojaatlar boʻlimini ochish',
        subtitle: `Murojaat raqami: ${record.ticketId}`,
      });
    }

    return {
      summary: `${target === 'imam' ? 'Imom-xatibga' : 'Administratorga'} rasmiy murojaat yaratildi (${record.ticketId})`,
      output: {
        escalated: true,
        ticketId: record.ticketId,
        target: record.target,
        category: record.category,
        createdAt: record.createdAt,
      },
    };
  }

  return {
    summary: `Nomaʼlum vosita: ${toolName}`,
    output: { error: `Unknown tool: ${toolName}` },
  };
}

/**
 * Main Unified ASAKA ZIYO AI Agent Runner.
 * Supports multi-step Gemini Function Calling + streaming events across Web, Android, and Telegram.
 */
export async function runAsakaZiyoAgent(
  input: AgentRunInput,
  deps: AgentHostDependencies,
  onEvent?: (ev: AgentStreamEvent) => void
): Promise<AgentRunResult> {
  const startedAt = Date.now();
  const locale = String(input.locale || 'uz-Latn');
  const channel: AgentChannel = input.channel || 'web';
  const routingMode: AgentRoutingMode = input.routingMode || 'auto';

  const contents = normalizeConversationHistory(input.messages);
  if (contents.length === 0) {
    throw new Error('Foydalanuvchi savoli topilmadi.');
  }

  const lastUserText =
    [...contents].reverse().find((c) => c.role === 'user')?.parts?.[0]?.text || '';
  const sensitiveFatwaDetected = isSensitiveFatwaTopic(lastUserText);

  const selection = selectAgentModelAndTier(lastUserText, routingMode, input.preferredModel);
  const modelUsed = selection.model;
  const reasoningTier = selection.tier;

  onEvent?.({
    type: 'meta',
    modelUsed,
    routingMode,
    reasoningTier,
    channel,
  });

  const ai = createGeminiServerClient();
  const systemInstruction = buildUnifiedAgentSystemInstruction(
    locale,
    channel,
    sensitiveFatwaDetected
  );

  const toolTrace: AgentToolTraceItem[] = [];
  const actions: AgentActionDirective[] = [];
  const sources: AgentSourceCitation[] = [];
  let escalation: AgentEscalationRecord | undefined;

  const baseConfig: Record<string, any> = {
    systemInstruction,
    tools: [{ functionDeclarations: AGENT_TOOL_DECLARATIONS }],
  };
  if (selection.thinkingLevel && modelUsed === AGENT_PRIMARY_MODEL) {
    baseConfig.thinkingConfig = { thinkingLevel: selection.thinkingLevel };
  }

  const conversationTurns: Array<any> = [...contents];
  let activeModel = modelUsed;
  let finalReply = '';
  const MAX_TOOL_ROUNDS = 4;

  const isTransientUpstreamError = (err: any): boolean => {
    const msg = String(err?.message || err || '');
    return /\b(503|500|502|504)\b|UNAVAILABLE|high demand|UPSTREAM_GEMINI_TIMEOUT|overloaded/i.test(msg);
  };

  const callGeminiWithRetry = async (
    turns: Array<any>,
    useTools: boolean
  ) => {
    const candidateModels = [
      activeModel,
      activeModel === AGENT_PRIMARY_MODEL ? AGENT_FAST_MODEL : AGENT_PRIMARY_MODEL,
    ];
    let lastErr: any = null;

    for (const candidate of candidateModels) {
      const cfg: Record<string, any> = { systemInstruction };
      if (useTools) {
        cfg.tools = [{ functionDeclarations: AGENT_TOOL_DECLARATIONS }];
      }
      if (selection.thinkingLevel && candidate === AGENT_PRIMARY_MODEL) {
        cfg.thinkingConfig = { thinkingLevel: selection.thinkingLevel };
      }

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const resp = await Promise.race([
            ai.models.generateContent({
              model: candidate,
              contents: turns,
              config: cfg,
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('UPSTREAM_GEMINI_TIMEOUT')), 24000)
            ),
          ]);
          activeModel = candidate;
          return resp;
        } catch (err: any) {
          lastErr = err;
          if (!isTransientUpstreamError(err)) {
            throw err;
          }
          if (attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 650));
          }
        }
      }
    }
    throw lastErr || new Error('Gemini API vaqtincha javob bermadi.');
  };

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await callGeminiWithRetry(conversationTurns, true);

    const candidateContent = response.candidates?.[0]?.content;
    const functionCalls = response.functionCalls;

    if (Array.isArray(functionCalls) && functionCalls.length > 0 && candidateContent) {
      // Preserve exact model turn (including thoughtSignature & toolCall parts)
      conversationTurns.push(candidateContent);
      const responseParts: Array<Record<string, any>> = [];

      for (const call of functionCalls) {
        const callName = String(call.name || '');
        const callId = call.id || `call_${round}_${Date.now()}`;
        const labelUz = TOOL_LABELS_UZ[callName] || callName;

        onEvent?.({
          type: 'tool_start',
          id: callId,
          name: callName,
          labelUz,
        });

        const t0 = Date.now();
        try {
          const execRes = await executeAgentTool(
            callName,
            (call.args as Record<string, any>) || {},
            {
              deps,
              locale,
              channel,
              userId: input.userId || 'guest_agent_user',
              userName: input.userName || 'Foydalanuvchi',
              actions,
              sources,
              setEscalation: (rec) => {
                escalation = rec;
                onEvent?.({ type: 'escalation', escalation: rec });
              },
            }
          );

          const traceItem: AgentToolTraceItem = {
            id: callId,
            name: callName,
            labelUz,
            status: 'completed',
            summary: execRes.summary,
            durationMs: Date.now() - t0,
          };
          toolTrace.push(traceItem);
          onEvent?.({ type: 'tool_done', item: traceItem });

          responseParts.push({
            functionResponse: {
              id: call.id,
              name: callName,
              response: execRes.output,
            },
          });
        } catch (toolErr: any) {
          const traceItem: AgentToolTraceItem = {
            id: callId,
            name: callName,
            labelUz,
            status: 'failed',
            summary: toolErr?.message || 'Vosita xatoligi',
            durationMs: Date.now() - t0,
          };
          toolTrace.push(traceItem);
          onEvent?.({ type: 'tool_done', item: traceItem });

          responseParts.push({
            functionResponse: {
              id: call.id,
              name: callName,
              response: { error: toolErr?.message || 'Tool execution error' },
            },
          });
        }
      }

      // Emit any newly registered UI actions
      for (const act of actions) {
        onEvent?.({ type: 'action', action: act });
      }

      conversationTurns.push({
        role: 'user',
        parts: responseParts,
      });
      continue;
    }

    finalReply = (response.text || '').trim();
    break;
  }

  // If all tool rounds completed without a final synthesis turn, synthesize cleanly now
  if (!finalReply) {
    const synthesisResp = await callGeminiWithRetry(conversationTurns, false);
    finalReply = (synthesisResp.text || '').trim();
  }

  if (!finalReply) {
    throw new Error('AI Agent boʻsh javob qaytardi. Iltimos, qaytadan urinib koʻring.');
  }

  // If sensitive fatwa topic detected, ensure an Ask Imam action button is always available
  if (sensitiveFatwaDetected && !actions.some((a) => a.targetTab === 'ask_imam')) {
    const imamAction: AgentActionDirective = {
      id: `act-imam-guard-${Date.now()}`,
      type: 'navigate',
      targetTab: 'ask_imam',
      label: 'Imom-xatibga shaxsiy savol yuborish',
      subtitle: 'Shaxsiy sharʼiy fatvo masalalari uchun rasmiy kanal',
    };
    actions.push(imamAction);
    onEvent?.({ type: 'action', action: imamAction });
  }

  finalReply = localizeIfNewUzbek(finalReply, locale);

  // Deduplicate actions & sources
  const uniqueActions = Array.from(
    new Map(actions.map((a) => [`${a.type}:${a.targetTab || a.label}`, a])).values()
  );
  const uniqueSources = Array.from(
    new Map(sources.map((s) => [`${s.type}:${s.title}`, s])).values()
  );

  // Stream text smoothly in natural word/sentence chunks for fluid Liquid Glass UI rendering
  if (onEvent) {
    const words = finalReply.split(/(\s+)/);
    const chunkSize = 8;
    for (let i = 0; i < words.length; i += chunkSize) {
      const piece = words.slice(i, i + chunkSize).join('');
      if (piece) {
        onEvent({ type: 'text', text: piece });
      }
    }
  }

  const result: AgentRunResult = {
    success: true,
    reply: finalReply,
    modelUsed: activeModel,
    routingMode,
    reasoningTier,
    channel,
    toolTrace,
    actions: uniqueActions,
    sources: uniqueSources,
    ...(escalation ? { escalation } : {}),
    sensitiveFatwaDetected,
    latencyMs: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
  };

  onEvent?.({ type: 'done', result });
  return result;
}

/**
 * Honestly probes live Gemini API availability for configured Agent models.
 * Never fakes availability.
 */
export async function probeAgentModels(
  modelsToCheck: string[] = [AGENT_PRIMARY_MODEL, AGENT_FAST_MODEL]
): Promise<AgentProbeResult[]> {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  const checkedAt = new Date().toISOString();

  if (apiKey.length <= 5) {
    return modelsToCheck.map((model) => ({
      model,
      available: false,
      latencyMs: 0,
      checkedAt,
      detail: 'GEMINI_API_KEY server muhitida sozlanmagan.',
    }));
  }

  const ai = createGeminiServerClient(apiKey);
  const results: AgentProbeResult[] = [];

  for (const model of modelsToCheck) {
    const t0 = Date.now();
    try {
      const resp = await Promise.race([
        ai.models.generateContent({
          model,
          contents: 'Respond with exactly one word: OK',
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('PROBE_TIMEOUT')), 12000)
        ),
      ]);
      const text = (resp.text || '').trim();
      results.push({
        model,
        available: text.length > 0,
        latencyMs: Date.now() - t0,
        checkedAt,
        httpStatus: 200,
        detail: text ? `Jonli tasdiqlandi (${text.slice(0, 24)})` : 'Boʻsh javob qaytdi',
      });
    } catch (err: any) {
      const msg = err?.message || String(err);
      const statusMatch = msg.match(/\b(400|401|403|404|429|500|503)\b/);
      results.push({
        model,
        available: false,
        latencyMs: Date.now() - t0,
        checkedAt,
        httpStatus: statusMatch ? Number(statusMatch[1]) : undefined,
        detail: msg.slice(0, 220),
      });
    }
  }

  return results;
}
