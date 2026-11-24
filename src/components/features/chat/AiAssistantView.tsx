import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bot,
  Send,
  Sparkles,
  Trash2,
  BookOpen,
  HelpCircle,
  Globe,
  ShieldAlert,
  User,
  Check,
  Copy,
  Square,
  Plus,
  MessageSquare,
  RotateCcw,
  Compass,
  Clock,
  Heart,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Brain,
  ArrowUpRight,
  Wrench,
  UserCheck,
  ShieldCheck,
  X,
  Activity,
  Loader2,
} from 'lucide-react';
import { NavigationTab, SupportedLocale } from '../../../types';
import { auth, db } from '../../../utils/firebaseClient';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { GeometricPattern } from '../../ui/GeometricPattern';
import { AiThinkingWave, PREMIUM_EASE } from '../../ui/MotionPrimitives';

export type AgentRoutingMode = 'auto' | 'deep' | 'fast';

export interface AgentToolTraceItem {
  id: string;
  name: string;
  labelUz: string;
  status: 'running' | 'completed' | 'failed';
  summary?: string;
  durationMs?: number;
}

export interface AgentActionDirective {
  id: string;
  type: 'navigate' | 'open_imam_form' | 'open_search' | 'open_tv_mode' | 'toggle_theme';
  targetTab?: string;
  label: string;
  subtitle?: string;
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

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  isError?: boolean;
  modelUsed?: string;
  reasoningTier?: 'fast' | 'intelligent' | 'deep';
  toolTrace?: AgentToolTraceItem[];
  actions?: AgentActionDirective[];
  sources?: AgentSourceCitation[];
  escalation?: AgentEscalationRecord | null;
}

export interface AiConversationRecord {
  id: string;
  userId: string;
  title: string;
  locale: SupportedLocale;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface AiAssistantViewProps {
  onNavigate?: (tab: NavigationTab) => void;
  onOpenSearch?: () => void;
  onOpenTvMode?: () => void;
  onToggleTheme?: () => void;
}

const LOCAL_CONVERSATIONS_KEY = 'asaka_ziyo_ai_conversations_v2';
const GUEST_USER_ID_KEY = 'asaka_ziyo_guest_uid_v1';

function detectClientChannel(): 'web' | 'android' {
  if (typeof window === 'undefined') return 'web';
  const cap = (window as any).Capacitor;
  if (cap?.isNativePlatform?.() || window.location.hostname === 'appassets.androidplatform.net') {
    return 'android';
  }
  return 'web';
}

function getActiveConversationOwnerId(): string {
  if (auth.currentUser?.uid) {
    return auth.currentUser.uid;
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      let guestId = window.localStorage.getItem(GUEST_USER_ID_KEY);
      if (!guestId) {
        guestId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        window.localStorage.setItem(GUEST_USER_ID_KEY, guestId);
      }
      return guestId;
    }
  } catch {
    // ignore
  }
  return 'guest_default_user';
}

function getWelcomeMessage(locale: SupportedLocale): ChatMessage {
  const textMap: Record<SupportedLocale, string> = {
    'uz-Latn':
      'Assalomu alaykum va rahmatullohi va barakatuh! Men ASAKA ZIYO AI AGENT — yagona aqlli islomiy ekotizim yordamchisiman. Men Asaka 8 mahal namoz taqvimini jonli tekshiraman, Qurʼoni Karim va Tafsiri Hilol manbalaridan izlayman, sahih hadis va duolarni topaman, ilova boʻlimlarini ochib beraman hamda murakkab sharʼiy masalalarda sizni Imom-xatib yoki maʼmuriyatga yoʻnaltiraman.',
    'uz-Cyrl':
      'Ассалому алайкум ва раҳматуллоҳи ва баракатуҳ! Мен АСАКА ЗИЁ AI AGENT — ягона ақлли исломий экотизим ёрдамчисиман. Асака 8 маҳал намоз тақвимини жонли текшираман, Қуръони Карим ва Тафсири Ҳилолдан излайман, саҳиҳ ҳадис ва дуоларни топаман, илова бўлимларини очиб бераман ҳамда зарур ҳолда Имом-хатибга йўналтираман.',
    'uz-Latn-new':
      'Assalomu alaykum va rahmatullohi va barakatuh! Men ASAKA ZIYO AI AGENT — yagona aqlli islomiy ekotizim yordamchisiman. Men Asaka 8 mahal namoz taqvimini jonli tekshiraman, Qurʼoni Karim va Tafsiri Hilol manbalaridan izlayman, sahih hadis va duolarni topaman, ilova boʻlimlarini ochib beraman hamda zarur holda Imom-xatibga yoʻnaltiraman.',
    ru: 'Ассаляму алейкум ва рахматуллахи ва баракатух! Я — ASAKA ZIYO AI AGENT. Проверяю актуальное расписание намазов Асаки, ищу по Корану (Тафсири Хилал), достоверным хадисам и дуа, открываю нужные разделы приложения и при необходимости направляю обращение имаму или администратору.',
    en: 'Assalamu Alaikum wa Rahmatullahi wa Barakatuh! I am ASAKA ZIYO AI AGENT — your unified intelligent Islamic ecosystem agent. I verify live Asaka prayer schedules, search Quran & Tafsiri Hilol, authentic Hadiths and Duas, launch permitted app sections, and escalate personal Shariah inquiries to our Imam or Mosque Administration when needed.',
  };

  return {
    id: 'msg-welcome',
    role: 'model',
    content: textMap[locale] || textMap['uz-Latn'],
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

interface AgentStarter {
  id: string;
  labelUz: string;
  badgeUz: string;
  icon: React.ReactNode;
  prompt: Record<SupportedLocale, string>;
}

const AGENT_STARTERS: AgentStarter[] = [
  {
    id: 'prayer',
    labelUz: 'Bugungi Asaka namoz vaqtlari',
    badgeUz: 'Jonli jadval',
    icon: <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
    prompt: {
      'uz-Latn': 'Asaka shahri uchun bugungi 8 mahal namoz vaqtlarini tekshirib bering va Namoz vaqtlari boʻlimini ochish tugmasini tayyorlang.',
      'uz-Cyrl': 'Асака шаҳри учун бугунги 8 маҳал намоз вақтларини текшириб беринг ва Намоз вақтлари бўлимини очиш тугмасини тайёрланг.',
      'uz-Latn-new': 'Asaka shahri uchun bugungi 8 mahal namoz vaqtlarini tekshirib bering va Namoz vaqtlari boʻlimini ochish tugmasini tayyorlang.',
      ru: 'Проверь сегодняшнее расписание 8 намазов в Асаке и подготовь переход в раздел расписания.',
      en: 'Check today’s verified 8-time prayer schedule for Asaka and provide quick navigation to Prayer Times.',
    },
  },
  {
    id: 'quran',
    labelUz: 'Yosin surasi va Tafsiri Hilol',
    badgeUz: 'Qurʼon + Tafsir',
    icon: <BookOpen className="w-4 h-4 text-[#C8A85E]" />,
    prompt: {
      'uz-Latn': 'Yosin surasi (36-sura) haqida Tafsiri Hilol asosida qisqacha maʼlumot bering va Qurʼoni Karim boʻlimiga oʻtishni taklif qiling.',
      'uz-Cyrl': 'Ёсин сураси (36-сура) ҳақида Тафсири Ҳилол асосида қисқача маълумот беринг ва Қуръони Карим бўлимига ўтишни таклиф қилинг.',
      'uz-Latn-new': 'Yosin surasi (36-sura) haqida Tafsiri Hilol asosida qisqacha maʼlumot bering va Qurʼoni Karim boʻlimiga oʻtishni taklif qiling.',
      ru: 'Дай краткий обзор суры Ясин (36) на основе Тафсири Хилал и открой раздел Корана.',
      en: 'Provide an overview of Surah Yasin (36) from Tafsiri Hilol and link me to the Quran section.',
    },
  },
  {
    id: 'hadith',
    labelUz: 'Ilm va sabr haqida Sahih hadislar',
    badgeUz: 'Buxoriy & Muslim',
    icon: <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
    prompt: {
      'uz-Latn': 'Ilm olish va sabr fazilati haqida bazamizdagi sahih hadislarni izlab keltiring.',
      'uz-Cyrl': 'Илм олиш ва сабр фазилати ҳақида базамиздаги саҳиҳ ҳадисларни излаб келтиринг.',
      'uz-Latn-new': 'Ilm olish va sabr fazilati haqida bazamizdagi sahih hadislarni izlab keltiring.',
      ru: 'Найди достоверные хадисы из нашей базы о поиске знаний и терпении.',
      en: 'Search our verified database for authentic Hadiths about seeking knowledge and patience.',
    },
  },
  {
    id: 'dua',
    labelUz: 'Tonggi zikrlar va Raqamli Tasbeh',
    badgeUz: 'Zikr + Tasbeh',
    icon: <Heart className="w-4 h-4 text-[#C8A85E]" />,
    prompt: {
      'uz-Latn': 'Tonggi zikr va duolardan eng muhimlarini arabcha matni bilan topib bering va Tasbeh boʻlimini ochish imkonini bering.',
      'uz-Cyrl': 'Тонгги зикр ва дуолардан энг муҳимларини арабча матни билан топиб беринг ва Тасбеҳ бўлимини очиш имконини беринг.',
      'uz-Latn-new': 'Tonggi zikr va duolardan eng muhimlarini arabcha matni bilan topib bering va Tasbeh boʻlimini ochish imkonini bering.',
      ru: 'Найди важные утренние азкары с арабским текстом и открой раздел цифрового тасбиха.',
      en: 'Find authentic morning adhkar with Arabic text and open the Digital Tasbih section.',
    },
  },
  {
    id: 'qibla',
    labelUz: 'Qibla yoʻnalishi va Asaka masjidi',
    badgeUz: '241° WSW',
    icon: <Compass className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
    prompt: {
      'uz-Latn': 'Asaka shahrida Qibla yoʻnalishi necha gradus va «MuhammadSolih Hoji» jomeʼ masjidi haqida maʼlumot bering.',
      'uz-Cyrl': 'Асака шаҳрида Қибла йўналиши неча градус ва «МуҳаммадСолиҳ Ҳожи» жомеъ масжиди ҳақида маълумот беринг.',
      'uz-Latn-new': 'Asaka shahrida Qibla yoʻnalishi necha gradus va «MuhammadSolih Hoji» jomeʼ masjidi haqida maʼlumot bering.',
      ru: 'Какой угол Киблы в городе Асака и какая информация есть о мечети МухаммадСолих Ходжи?',
      en: 'What is the Qibla direction in Asaka and details about MuhammadSolih Hoji Mosque?',
    },
  },
];

export const AiAssistantView: React.FC<AiAssistantViewProps> = ({
  onNavigate,
  onOpenSearch,
  onOpenTvMode,
  onToggleTheme,
}) => {
  const [locale, setLocale] = useState<SupportedLocale>('uz-Latn');
  const [routingMode, setRoutingMode] = useState<AgentRoutingMode>('auto');
  const [conversations, setConversations] = useState<AiConversationRecord[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([getWelcomeMessage('uz-Latn')]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [liveToolStatus, setLiveToolStatus] = useState<AgentToolTraceItem[]>([]);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateTarget, setEscalateTarget] = useState<'imam' | 'admin'>('imam');
  const [escalateCategory, setEscalateCategory] = useState('Fiqh va Sharʼiy savol');
  const [escalateText, setEscalateText] = useState('');
  const [escalateSubmitting, setEscalateSubmitting] = useState(false);
  const [escalateFeedback, setEscalateFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const [showProbeModal, setShowProbeModal] = useState(false);
  const [probeLoading, setProbeLoading] = useState(false);
  const [probeResults, setProbeResults] = useState<
    Array<{ model: string; available: boolean; latencyMs: number; detail: string; checkedAt: string }>
  >([]);

  const [aiStatus, setAiStatus] = useState<{
    connected: boolean;
    model: string;
    primaryModel: string;
    fastModel: string;
    toolsCount: number;
    checked?: boolean;
  }>({
    connected: false,
    model: 'gemini-4-hydrogen',
    primaryModel: 'gemini-4-hydrogen',
    fastModel: 'gemini-3.1-flash-lite',
    toolsCount: 8,
    checked: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    fetch('/api/ai/status')
      .then((r) => r.json())
      .then((data) => {
        if (mounted && data) {
          setAiStatus({
            connected: Boolean(data.connected),
            model: data.model || 'gemini-4-hydrogen',
            primaryModel: data.primaryModel || 'gemini-4-hydrogen',
            fastModel: data.fastModel || 'gemini-3.1-flash-lite',
            toolsCount: Number(data.toolsCount || 8),
            checked: true,
          });
        }
      })
      .catch(() => {
        if (mounted) {
          setAiStatus((prev) => ({ ...prev, connected: false, checked: true }));
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const loadSavedConversations = useCallback(async () => {
    const userId = getActiveConversationOwnerId();
    let loaded: AiConversationRecord[] = [];

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(`${LOCAL_CONVERSATIONS_KEY}_${userId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) loaded = parsed;
        }
      }
    } catch {
      // ignore
    }

    try {
      const resp = await fetch(`/api/ai/conversations?userId=${encodeURIComponent(userId)}`);
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data.conversations) && data.conversations.length > 0) {
          loaded = data.conversations;
        }
      }
    } catch {
      // fallback to local
    }

    if (loaded.length > 0) {
      setConversations(loaded);
      const first = loaded[0];
      setActiveConversationId(first.id);
      setMessages(
        Array.isArray(first.messages) && first.messages.length > 0
          ? first.messages
          : [getWelcomeMessage(locale)]
      );
    } else {
      const initialId = `conv-${Date.now()}`;
      const initialConv: AiConversationRecord = {
        id: initialId,
        userId,
        title: 'Yangi agent suhbati',
        locale,
        messages: [getWelcomeMessage(locale)],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setConversations([initialConv]);
      setActiveConversationId(initialId);
      setMessages(initialConv.messages);
    }
  }, [locale]);

  useEffect(() => {
    loadSavedConversations();
  }, [loadSavedConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, liveToolStatus]);

  const persistConversation = useCallback(
    async (convId: string, updatedMessages: ChatMessage[], currentLocale: SupportedLocale) => {
      const userId = getActiveConversationOwnerId();
      const firstUserMsg = updatedMessages.find((m) => m.role === 'user');
      const derivedTitle = firstUserMsg
        ? firstUserMsg.content.slice(0, 52) + (firstUserMsg.content.length > 52 ? '...' : '')
        : 'Yangi agent suhbati';

      const nowIso = new Date().toISOString();
      const updatedRecord: AiConversationRecord = {
        id: convId,
        userId,
        title: derivedTitle,
        locale: currentLocale,
        messages: updatedMessages,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      setConversations((prev) => {
        const exists = prev.some((c) => c.id === convId);
        const next = exists
          ? prev.map((c) => (c.id === convId ? { ...c, ...updatedRecord, createdAt: c.createdAt } : c))
          : [updatedRecord, ...prev];
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(`${LOCAL_CONVERSATIONS_KEY}_${userId}`, JSON.stringify(next));
          }
        } catch {
          // ignore
        }
        return next;
      });

      try {
        await fetch('/api/ai/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, conversation: updatedRecord }),
        });
      } catch {
        // ignore offline
      }

      if (auth.currentUser?.uid) {
        try {
          await setDoc(
            doc(db, 'aiConversations', convId),
            {
              ...updatedRecord,
              userId: auth.currentUser.uid,
            },
            { merge: true }
          );
        } catch {
          // ignore
        }
      }
    },
    []
  );

  const handleStartNewConversation = () => {
    if (isLoading) return;
    const userId = getActiveConversationOwnerId();
    const newId = `conv-${Date.now()}`;
    const welcome = getWelcomeMessage(locale);
    const newConv: AiConversationRecord = {
      id: newId,
      userId,
      title: 'Yangi agent suhbati',
      locale,
      messages: [welcome],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newId);
    setMessages([welcome]);
  };

  const handleSelectConversation = (conv: AiConversationRecord) => {
    if (isLoading) return;
    setActiveConversationId(conv.id);
    setMessages(
      Array.isArray(conv.messages) && conv.messages.length > 0
        ? conv.messages
        : [getWelcomeMessage(locale)]
    );
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const userId = getActiveConversationOwnerId();
    const remaining = conversations.filter((c) => c.id !== convId);

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(`${LOCAL_CONVERSATIONS_KEY}_${userId}`, JSON.stringify(remaining));
      }
      await fetch(`/api/ai/conversations/${encodeURIComponent(convId)}?userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });
      if (auth.currentUser?.uid) {
        await deleteDoc(doc(db, 'aiConversations', convId)).catch(() => {});
      }
    } catch {
      // ignore
    }

    if (remaining.length === 0) {
      handleStartNewConversation();
    } else {
      setConversations(remaining);
      if (activeConversationId === convId) {
        setActiveConversationId(remaining[0].id);
        setMessages(remaining[0].messages);
      }
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setIsStreaming(false);
    setLiveToolStatus([]);
  };

  const executeDirective = (action: AgentActionDirective) => {
    if (action.type === 'navigate' && action.targetTab && onNavigate) {
      onNavigate(action.targetTab as NavigationTab);
    } else if (action.type === 'open_imam_form') {
      setEscalateTarget('imam');
      setShowEscalateModal(true);
    } else if (action.type === 'open_search' && onOpenSearch) {
      onOpenSearch();
    } else if (action.type === 'open_tv_mode' && onOpenTvMode) {
      onOpenTvMode();
    } else if (action.type === 'toggle_theme' && onToggleTheme) {
      onToggleTheme();
    }
  };

  const handleSend = async (textToSend?: string, overrideHistory?: ChatMessage[]) => {
    const query = (textToSend ?? inputVal).trim();
    if (!query || isLoading) return;

    const convId = activeConversationId || `conv-${Date.now()}`;
    if (!activeConversationId) {
      setActiveConversationId(convId);
    }

    const baseMessages = overrideHistory || messages;
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedWithUser = [...baseMessages, userMsg];
    setMessages(updatedWithUser);
    if (!textToSend) setInputVal('');
    setIsLoading(true);
    setIsStreaming(true);
    setLiveToolStatus([]);

    const streamingModelId = `mod-${Date.now()}`;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const historyPayload = updatedWithUser
        .filter((m) => m.id !== 'msg-welcome' && !m.isError)
        .map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        }));

      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyPayload,
          locale,
          routingMode,
          channel: detectClientChannel(),
          userId: getActiveConversationOwnerId(),
          userName: auth.currentUser?.displayName || 'ASAKA ZIYO Foydalanuvchisi',
          stream: true,
        }),
        signal: controller.signal,
      });

      const contentType = res.headers.get('content-type') || '';

      if (res.ok && contentType.includes('text/event-stream') && res.body) {
        const placeholderMsg: ChatMessage = {
          id: streamingModelId,
          role: 'model',
          content: '',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          toolTrace: [],
          actions: [],
          sources: [],
        };
        setMessages((prev) => [...prev, placeholderMsg]);

        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let accumulated = '';
        let finalModelUsed = aiStatus.primaryModel;
        let finalTier: 'fast' | 'intelligent' | 'deep' = 'intelligent';
        let collectedTools: AgentToolTraceItem[] = [];
        let collectedActions: AgentActionDirective[] = [];
        let collectedSources: AgentSourceCitation[] = [];
        let collectedEscalation: AgentEscalationRecord | null = null;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const rawJson = trimmed.slice(5).trim();
            if (!rawJson) continue;
            try {
              const parsed = JSON.parse(rawJson);
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              if (parsed.type === 'meta') {
                finalModelUsed = parsed.modelUsed || finalModelUsed;
                finalTier = parsed.reasoningTier || finalTier;
              } else if (parsed.type === 'tool_start') {
                const runningItem: AgentToolTraceItem = {
                  id: parsed.id,
                  name: parsed.name,
                  labelUz: parsed.labelUz || parsed.name,
                  status: 'running',
                };
                setLiveToolStatus((prev) => [...prev.filter((t) => t.id !== parsed.id), runningItem]);
              } else if (parsed.type === 'tool_done' && parsed.item) {
                collectedTools = [
                  ...collectedTools.filter((t) => t.id !== parsed.item.id),
                  parsed.item,
                ];
                setLiveToolStatus((prev) =>
                  prev.map((t) => (t.id === parsed.item.id ? parsed.item : t))
                );
              } else if (parsed.type === 'action' && parsed.action) {
                if (!collectedActions.some((a) => a.id === parsed.action.id)) {
                  collectedActions = [...collectedActions, parsed.action];
                }
              } else if (parsed.type === 'escalation' && parsed.escalation) {
                collectedEscalation = parsed.escalation;
              } else if (parsed.text) {
                accumulated += parsed.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === streamingModelId
                      ? {
                          ...m,
                          content: accumulated,
                          modelUsed: finalModelUsed,
                          reasoningTier: finalTier,
                          toolTrace: collectedTools,
                          actions: collectedActions,
                          escalation: collectedEscalation,
                        }
                      : m
                  )
                );
              }
              if (parsed.done) {
                if (parsed.fullText && !accumulated) {
                  accumulated = parsed.fullText;
                }
                if (parsed.modelUsed || parsed.model) {
                  finalModelUsed = parsed.modelUsed || parsed.model;
                }
                if (parsed.reasoningTier) {
                  finalTier = parsed.reasoningTier;
                }
                if (Array.isArray(parsed.toolTrace)) {
                  collectedTools = parsed.toolTrace;
                }
                if (Array.isArray(parsed.actions)) {
                  collectedActions = parsed.actions;
                }
                if (Array.isArray(parsed.sources)) {
                  collectedSources = parsed.sources;
                }
                if (parsed.escalation) {
                  collectedEscalation = parsed.escalation;
                }
              }
            } catch (parseErr: any) {
              if (parseErr?.message && !parseErr.message.includes('JSON')) {
                throw parseErr;
              }
            }
          }
        }

        const finalContent = accumulated.trim() || 'Alhamdulillah, javob tayyorlandi.';
        const finalMsg: ChatMessage = {
          id: streamingModelId,
          role: 'model',
          content: finalContent,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed: finalModelUsed,
          reasoningTier: finalTier,
          toolTrace: collectedTools,
          actions: collectedActions,
          sources: collectedSources,
          escalation: collectedEscalation,
        };
        const finalHistory = [...updatedWithUser, finalMsg];
        setMessages(finalHistory);
        await persistConversation(convId, finalHistory, locale);
      } else {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'AI Agent xizmatida xatolik yuz berdi.');
        }

        const modelMsg: ChatMessage = {
          id: streamingModelId,
          role: 'model',
          content: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed: data.modelUsed || data.model,
          reasoningTier: data.reasoningTier,
          toolTrace: data.toolTrace || [],
          actions: data.actions || [],
          sources: data.sources || [],
          escalation: data.escalation || null,
        };
        const finalHistory = [...updatedWithUser, modelMsg];
        setMessages(finalHistory);
        await persistConversation(convId, finalHistory, locale);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return;
      }
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        isError: true,
        content:
          locale === 'uz-Latn' || locale === 'uz-Latn-new'
            ? `Kechirasiz, soʻrovni bajarishda xatolik yuz berdi: ${err?.message || 'Tarmoq xatosi'}. Qaytadan urinib koʻring yoki Imomga murojaat qiling.`
            : locale === 'uz-Cyrl'
            ? `Кечирасиз, сўровни бажаришда хатолик юз берди: ${err?.message || 'Тармоқ хатоси'}. Қайтадан уриниб кўринг.`
            : `Sorry, an error occurred while processing your request: ${err?.message || 'Network error'}.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev.filter((m) => m.id !== streamingModelId), errorMsg]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setLiveToolStatus([]);
      abortControllerRef.current = null;
    }
  };

  const handleRegenerateLast = () => {
    if (isLoading) return;
    const lastUserIdx = [...messages].map((m) => m.role).lastIndexOf('user');
    if (lastUserIdx === -1) return;
    const lastUserMessage = messages[lastUserIdx];
    const historyBeforeLastUser = messages.slice(0, lastUserIdx);
    handleSend(lastUserMessage.content, historyBeforeLastUser);
  };

  const handleCopyMessage = async (msg: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopiedMsgId(msg.id);
      setTimeout(() => setCopiedMsgId(null), 2000);
    } catch {
      // ignore
    }
  };

  const confirmClearHistory = async () => {
    setShowClearConfirm(false);
    const welcome = getWelcomeMessage(locale);
    setMessages([welcome]);
    if (activeConversationId) {
      await persistConversation(activeConversationId, [welcome], locale);
    }
  };

  const handleSubmitEscalation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalateText.trim() || escalateSubmitting) return;
    setEscalateSubmitting(true);
    setEscalateFeedback(null);

    try {
      const resp = await fetch('/api/agent/escalate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: escalateTarget,
          category: escalateCategory,
          questionSummary: escalateText.trim(),
          userId: getActiveConversationOwnerId(),
          userName: auth.currentUser?.displayName || 'ASAKA ZIYO Foydalanuvchisi',
          channel: detectClientChannel(),
          locale,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'Murojaatni yuborib boʻlmadi.');
      }
      setEscalateFeedback({
        ok: true,
        msg: data.message || `Murojaat yuborildi (${data.escalation?.ticketId})`,
      });
      setEscalateText('');
    } catch (err: any) {
      setEscalateFeedback({
        ok: false,
        msg: err?.message || 'Tarmoq xatoligi yuz berdi.',
      });
    } finally {
      setEscalateSubmitting(false);
    }
  };

  const handleRunLiveModelProbe = async () => {
    setProbeLoading(true);
    try {
      const resp = await fetch('/api/agent/probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ models: [aiStatus.primaryModel, aiStatus.fastModel] }),
      });
      const data = await resp.json();
      if (data?.results && Array.isArray(data.results)) {
        setProbeResults(data.results);
      }
    } catch {
      // ignore
    } finally {
      setProbeLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-1 sm:px-2 py-2 space-y-6">
      {/* Apple 2026/2027 Liquid Glass + Aurora Obsidian AI Agent Hero */}
      <div className="relative rounded-[32px] overflow-hidden az-aurora-surface text-[#F7F5F0] p-6 sm:p-8">
        <GeometricPattern opacity={0.04} />
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#9CAFA7]">
              <span className="font-bold text-[#10B981] tracking-wide">ASAKA ZIYO AI AGENT</span>
              <span aria-hidden="true" className="text-white/25">·</span>
              <span>Web · Android · Telegram</span>
              <span aria-hidden="true" className="text-white/25">·</span>
              <span className="text-[#C8A85E] font-medium">
                {aiStatus.connected ? `${aiStatus.toolsCount} ta jonli vosita faol` : 'Oflayn holat'}
              </span>
            </div>
            <h1 className="az-type-page text-[#F7F5F0]">
              Yagona Aqlli Islomiy AI Agent
            </h1>
            <p className="text-xs sm:text-sm text-[#C2D1CB] leading-relaxed">
              Tabiiy tildagi murojaatni tushunadi, Asaka 8 mahal namoz taqvimi va Tafsiri Hilol bazasidan
              tekshirib javob beradi, ruxsat etilgan ilova boʻlimlarini boshqaradi hamda zarur holda Imom-xatibga yoʻnaltiradi.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5">
            {/* Apple 2026 Liquid Glass Segmented Model Mode Selector */}
            <div
              role="group"
              aria-label="AI Agent fikrlash rejimi"
              className="inline-flex items-center p-1 rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/[0.14] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]"
            >
              {(
                [
                  { id: 'auto', label: 'Avto', icon: <Sparkles className="w-3.5 h-3.5" /> },
                  { id: 'deep', label: 'Chuqur', icon: <Brain className="w-3.5 h-3.5" /> },
                  { id: 'fast', label: 'Tezkor', icon: <Zap className="w-3.5 h-3.5" /> },
                ] as { id: AgentRoutingMode; label: string; icon: React.ReactNode }[]
              ).map((opt) => {
                const active = routingMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRoutingMode(opt.id)}
                    className={`relative min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                      active ? 'text-[#05140F]' : 'text-[#C2D1CB] hover:text-white'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="agent-mode-pill"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                        className="absolute inset-0 rounded-xl bg-[#10B981] shadow-[0_1px_0_rgba(255,255,255,0.35)_inset]"
                      />
                    )}
                    <span className="relative z-10">{opt.icon}</span>
                    <span className="relative z-10">{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Language Selector */}
            <div className="min-h-[44px] flex items-center gap-2 bg-white/[0.08] backdrop-blur-xl px-3.5 py-2 rounded-2xl border border-white/[0.14] text-xs text-[#F7F5F0]">
              <Globe size={15} className="text-[#10B981] shrink-0" />
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as SupportedLocale)}
                aria-label="Muloqot tilini tanlash"
                className="bg-transparent text-[#F7F5F0] font-semibold focus:outline-none cursor-pointer"
              >
                <option value="uz-Latn" className="bg-[#0B1411] text-[#F7F5F0]">Oʻzbekcha (Lotin)</option>
                <option value="uz-Cyrl" className="bg-[#0B1411] text-[#F7F5F0]">Ўзбекча (Кирилл)</option>
                <option value="uz-Latn-new" className="bg-[#0B1411] text-[#F7F5F0]">Oʻzbekcha (Yangi alifbo)</option>
                <option value="ru" className="bg-[#0B1411] text-[#F7F5F0]">Русский</option>
                <option value="en" className="bg-[#0B1411] text-[#F7F5F0]">English</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleStartNewConversation}
                className="min-h-[44px] flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#C8A85E] hover:bg-[#D6B974] text-[#05140F] font-bold text-xs transition-all shadow-[0_1px_0_rgba(255,255,255,0.45)_inset] cursor-pointer whitespace-nowrap"
              >
                <Plus size={15} />
                <span>Yangi suhbat</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEscalateFeedback(null);
                  setShowEscalateModal(true);
                }}
                title="Imom yoki Administratorga yoʻnaltirish"
                className="min-h-[44px] px-3.5 inline-flex items-center gap-1.5 rounded-2xl bg-white/[0.08] hover:bg-white/[0.15] text-[#F7F5F0] border border-white/[0.14] text-xs font-semibold transition-colors cursor-pointer"
              >
                <UserCheck size={15} className="text-[#C8A85E]" />
                <span className="hidden sm:inline">Imom / Admin</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowProbeModal(true);
                  if (probeResults.length === 0) handleRunLiveModelProbe();
                }}
                title="Gemini Model holatini tekshirish"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl bg-white/[0.08] hover:bg-white/[0.15] text-[#C2D1CB] hover:text-white border border-white/[0.14] transition-colors cursor-pointer"
              >
                <Activity size={16} />
              </button>

              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                title="Suhbat tarixini tozalash"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl bg-white/[0.08] hover:bg-rose-500/25 text-[#C2D1CB] hover:text-rose-200 border border-white/[0.14] hover:border-rose-400/40 transition-colors cursor-pointer"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scholarly Advisory Bar — Liquid Glass */}
      <div className="rounded-[22px] az-liquid-glass-card p-4 text-xs text-[#334F46] dark:text-[#9CAFA7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <ShieldAlert size={18} className="text-[#C8A85E] shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold text-[#0B1B16] dark:text-[#F7F5F0]">Ilmiy va sharʼiy xavfsizlik:</span>{' '}
            AI Agent ishonchli manbalar (Qurʼoni Karim, Tafsiri Hilol, Sahih hadislar va Asaka jadvali) asosida ishlaydi.
            Nikoh, taloq va meros kabi shaxsiy fatvo masalalarida sizni bevosita Imom-xatibga yoʻnaltiradi.
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setEscalateTarget('imam');
            setEscalateFeedback(null);
            setShowEscalateModal(true);
          }}
          className="shrink-0 self-start sm:self-center inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#064E3B]/10 dark:bg-[#C8A85E]/15 text-[#064E3B] dark:text-[#F4E6C1] border border-[#064E3B]/15 dark:border-[#C8A85E]/30 font-semibold hover:brightness-110 transition-all cursor-pointer"
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Imomga yuborish</span>
        </button>
      </div>

      {/* Main Liquid Glass Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Conversations + Agentic Missions */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          <div className="rounded-[26px] az-liquid-glass-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-[#0B1B16] dark:text-[#F7F5F0] flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-[#064E3B] dark:text-[#10B981]" />
                <span className="tabular-nums">Suhbatlar ({conversations.length})</span>
              </h2>
              <button
                type="button"
                onClick={handleStartNewConversation}
                className="text-xs font-semibold text-[#064E3B] dark:text-[#10B981] hover:opacity-80 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Yangi
              </button>
            </div>

            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {conversations.map((conv) => {
                const isActive = conv.id === activeConversationId;
                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`group flex items-center justify-between gap-2 px-3 py-2.5 rounded-2xl text-xs transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-[#064E3B]/12 dark:bg-[#10B981]/18 border-[#064E3B]/28 dark:border-[#10B981]/40 text-[#064E3B] dark:text-[#F7F5F0] font-semibold shadow-xs'
                        : 'bg-white/45 dark:bg-white/[0.03] border-transparent text-[#334F46] dark:text-[#9CAFA7] hover:bg-white/75 dark:hover:bg-white/[0.07]'
                    }`}
                  >
                    <div className="truncate flex-1">
                      <div className="truncate">{conv.title || 'Yangi agent suhbati'}</div>
                      <div className="text-[11px] text-[#5F736C] dark:text-[#7A9088] mt-0.5 tabular-nums">
                        {conv.messages?.length || 1} ta xabar
                      </div>
                    </div>
                    {conversations.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteConversation(conv.id, e)}
                        className="opacity-60 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-500/15 text-[#5F736C] dark:text-[#8EA39B] hover:text-rose-500 cursor-pointer"
                        title="Suhbatni oʻchirish"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Agentic Quick Missions */}
          <div className="rounded-[26px] az-liquid-glass-card p-4 space-y-3">
            <h2 className="text-xs font-bold text-[#0B1B16] dark:text-[#F7F5F0] flex items-center gap-2">
              <HelpCircle className="w-3.5 h-3.5 text-[#C8A85E]" />
              <span>Agent tezkor vazifalari</span>
            </h2>
            <div className="space-y-2">
              {AGENT_STARTERS.map((starter) => (
                <button
                  key={starter.id}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleSend(starter.prompt[locale] || starter.prompt['uz-Latn'])}
                  className="w-full text-left px-3.5 py-2.5 rounded-2xl bg-white/55 dark:bg-white/[0.04] hover:bg-white/85 dark:hover:bg-white/[0.09] border border-[#064E3B]/[0.09] dark:border-white/[0.09] transition-all flex items-center justify-between gap-2 text-xs text-[#0B1B16] dark:text-[#E5ECE9] cursor-pointer disabled:opacity-50"
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className="shrink-0">{starter.icon}</span>
                    <span className="font-semibold truncate">{starter.labelUz}</span>
                  </span>
                  <span className="text-[10px] font-semibold text-[#5F776F] dark:text-[#8FA69D] shrink-0">
                    {starter.badgeUz}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Agentic Liquid Glass Stream */}
        <div className="lg:col-span-8 xl:col-span-9">
          <div className="rounded-[30px] az-liquid-glass-elevated flex flex-col h-[670px] overflow-hidden">
            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 max-w-[94%] sm:max-w-[85%] ${
                    m.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                      m.role === 'user'
                        ? 'bg-[#064E3B] dark:bg-[#C8A85E] text-white dark:text-[#04120D]'
                        : 'az-liquid-glass-pill text-[#064E3B] dark:text-[#10B981]'
                    }`}
                  >
                    {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>

                  <div className="space-y-2 min-w-0 flex-1">
                    {/* Tool Trace Chips (when agent invoked verified ASAKA ZIYO tools) */}
                    {m.role === 'model' && Array.isArray(m.toolTrace) && m.toolTrace.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {m.toolTrace.map((t) => (
                          <span
                            key={t.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full az-liquid-glass-pill text-[11px] font-medium text-[#064E3B] dark:text-emerald-300"
                          >
                            <Wrench className="w-3 h-3 shrink-0" />
                            <span>{t.labelUz}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={`p-4 rounded-[22px] text-sm leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-[#064E3B]/94 dark:bg-[#142922]/90 text-[#F7F5F0] rounded-tr-md border border-white/15 shadow-[0_12px_28px_-12px_rgba(6,78,59,0.5)]'
                          : m.isError
                          ? 'bg-rose-50/90 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 rounded-tl-md border border-rose-300/60 dark:border-rose-500/35'
                          : 'az-liquid-glass-card text-[#0B1B16] dark:text-[#EEF3F1] rounded-tl-md'
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">{m.content}</div>

                      {/* Official Escalation Ticket Card */}
                      {m.escalation?.created && (
                        <div className="mt-3.5 p-3.5 rounded-2xl bg-[#C8A85E]/15 border border-[#C8A85E]/40 flex items-start gap-3 text-xs">
                          <ShieldCheck className="w-4 h-4 text-[#9A7A3A] dark:text-[#F4E6C1] shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <div className="font-bold text-[#0B1B16] dark:text-[#F7F5F0]">
                              {m.escalation.target === 'imam'
                                ? 'Imom-xatibga rasmiy murojaat yuborildi'
                                : 'Administratorga rasmiy murojaat yuborildi'}
                            </div>
                            <div className="text-[#334F46] dark:text-[#C2D1CB]">
                              Murojaat raqami:{' '}
                              <span className="font-mono-numbers font-bold text-[#064E3B] dark:text-[#F4E6C1]">
                                {m.escalation.ticketId}
                              </span>{' '}
                              · Boʻlim: {m.escalation.category}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Interactive Permitted App Action Buttons */}
                      {m.role === 'model' && Array.isArray(m.actions) && m.actions.length > 0 && (
                        <div className="mt-3.5 pt-3 border-t border-[#064E3B]/10 dark:border-white/[0.09] flex flex-wrap gap-2">
                          {m.actions.map((act) => (
                            <button
                              key={act.id}
                              type="button"
                              onClick={() => executeDirective(act)}
                              className="group inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#064E3B] hover:bg-[#053E2F] dark:bg-[#C8A85E] dark:hover:bg-[#D6B974] text-[#F7F5F0] dark:text-[#05140F] text-xs font-bold shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                            >
                              <span>{act.label}</span>
                              <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Verified Sources Strip */}
                      {m.role === 'model' && Array.isArray(m.sources) && m.sources.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-[#064E3B]/10 dark:border-white/[0.08] space-y-1">
                          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#5F776F] dark:text-[#8FA69D]">
                            Tekshirilgan manbalar
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {m.sources.map((src, idx) => (
                              <span
                                key={`${src.title}-${idx}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/60 dark:bg-white/[0.06] border border-[#064E3B]/10 dark:border-white/[0.09] text-[11px] text-[#334F46] dark:text-[#C2D1CB]"
                              >
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span className="font-semibold">{src.title}</span>
                                <span className="opacity-70">· {src.reference}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Message Meta Footer */}
                    <div
                      className={`flex items-center gap-3 text-[11px] text-[#5F736C] dark:text-[#7A9088] px-1 ${
                        m.role === 'user' ? 'justify-end' : 'justify-between'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums">{m.timestamp}</span>
                        {m.modelUsed && (
                          <span className="font-mono-numbers text-[10px] px-2 py-0.5 rounded-full bg-white/50 dark:bg-white/[0.06] border border-[#064E3B]/10 dark:border-white/[0.08]">
                            {m.modelUsed === 'gemini-4-hydrogen' ? 'Gemini 4' : 'Flash-Lite'}
                          </span>
                        )}
                      </div>
                      {m.role === 'model' && m.content && (
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(m)}
                          className="inline-flex items-center gap-1 text-[#5F736C] dark:text-[#8EA39B] hover:text-[#064E3B] dark:hover:text-[#10B981] transition-colors cursor-pointer"
                          title="Javobdan nusxa olish"
                        >
                          {copiedMsgId === m.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#10B981]" />
                              <span className="text-[#064E3B] dark:text-[#10B981]">Nusxalandi</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Nusxa olish</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 max-w-[88%] mr-auto items-start">
                  <div className="w-9 h-9 rounded-2xl az-liquid-glass-pill text-[#064E3B] dark:text-[#10B981] flex items-center justify-center shrink-0">
                    <Bot size={16} />
                  </div>
                  <div className="az-liquid-glass-card px-4 py-3 rounded-[22px] rounded-tl-md space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <AiThinkingWave
                        label={
                          liveToolStatus.length > 0
                            ? liveToolStatus[liveToolStatus.length - 1].labelUz
                            : isStreaming
                            ? 'ASAKA ZIYO AI Agent tahlil qilmoqda...'
                            : 'Manbalar tekshirilmoqda...'
                        }
                      />
                      <button
                        type="button"
                        onClick={handleStopGeneration}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-xs font-semibold cursor-pointer"
                      >
                        <Square className="w-3 h-3" />
                        <span>Toʻxtatish</span>
                      </button>
                    </div>
                    {liveToolStatus.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {liveToolStatus.map((item) => (
                          <span
                            key={item.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/12 text-emerald-800 dark:text-emerald-300 text-[11px] font-medium"
                          >
                            {item.status === 'running' ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                            <span>{item.labelUz}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Action Bar */}
            <div className="px-4 py-2.5 bg-white/35 dark:bg-black/20 backdrop-blur-md border-t border-[#064E3B]/[0.08] dark:border-white/[0.08] flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-[#5F736C] dark:text-[#8EA39B] min-w-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                <span className="truncate">
                  Faol rejim: {routingMode === 'deep' ? 'Chuqur (Gemini 4)' : routingMode === 'fast' ? 'Tezkor (Flash-Lite)' : 'Avto (Gemini 4 + Flash-Lite)'}
                </span>
              </div>
              {messages.some((m) => m.role === 'user') && !isLoading && (
                <button
                  type="button"
                  onClick={handleRegenerateLast}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl az-liquid-glass-pill text-[#0B1B16] dark:text-[#E5ECE9] transition-colors shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Qayta javob</span>
                </button>
              )}
            </div>

            {/* Apple 2026 Liquid Glass Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3.5 bg-white/50 dark:bg-black/25 backdrop-blur-2xl border-t border-[#064E3B]/[0.09] dark:border-white/[0.09] flex items-center gap-2.5"
            >
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Savol bering yoki vazifa ayting (masalan: Asaka namoz vaqtlari, Yosin surasi, Tasbehni och)..."
                className="flex-1 min-h-[48px] bg-white/75 dark:bg-white/[0.06] backdrop-blur-xl text-[#0B1B16] dark:text-[#F7F5F0] placeholder-[#5F736C] dark:placeholder-[#7A9088] px-4 py-3 rounded-2xl border border-[#064E3B]/[0.14] dark:border-white/[0.12] focus:outline-none focus:border-[#064E3B] dark:focus:border-[#10B981] text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:shadow-none"
              />
              {isLoading ? (
                <button
                  type="button"
                  onClick={handleStopGeneration}
                  className="min-h-[48px] bg-rose-600 hover:bg-rose-700 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 transition-colors shrink-0 text-xs cursor-pointer"
                >
                  <Square size={15} />
                  <span>Toʻxtatish</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputVal.trim()}
                  className="min-h-[48px] bg-[#064E3B] hover:bg-[#04392B] dark:bg-[#C8A85E] dark:hover:bg-[#D6B974] disabled:opacity-40 text-white dark:text-[#04120D] px-5 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-[0_1px_0_rgba(255,255,255,0.3)_inset] shrink-0 text-xs cursor-pointer"
                >
                  <span>Yuborish</span>
                  <Send size={15} />
                </button>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Clear History Confirmation Modal — Liquid Glass */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.2, ease: PREMIUM_EASE }}
              className="w-full max-w-md rounded-[28px] az-liquid-glass-modal p-6 space-y-4"
            >
              <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="text-base font-bold text-[#0B1B16] dark:text-[#F7F5F0]">Suhbat tarixini tozalash</h3>
              </div>
              <p className="text-xs text-[#334F46] dark:text-[#9CAFA7] leading-relaxed">
                Joriy suhbatdagi barcha savol va javoblarni oʻchirib, yangi sahifadan boshlashni tasdiqlaysizmi?
              </p>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="min-h-[40px] px-4 py-2 rounded-xl az-liquid-glass-pill text-[#0B1B16] dark:text-[#E5ECE9] text-xs font-semibold cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  onClick={confirmClearHistory}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                >
                  Ha, tozalash
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Direct Imam / Administrator Escalation Modal — Liquid Glass */}
      <AnimatePresence>
        {showEscalateModal && (
          <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.22, ease: PREMIUM_EASE }}
              className="w-full max-w-lg rounded-[30px] az-liquid-glass-modal p-6 space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[#0B1B16] dark:text-[#F7F5F0]">
                    Imom-xatib yoki Administratorga yoʻnaltirish
                  </h3>
                  <p className="text-xs text-[#4A635B] dark:text-[#9CAFA7] mt-0.5">
                    Murojaatingiz rasmiy raqam bilan saqlanadi va masʼul shaxsga yetkaziladi.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEscalateModal(false)}
                  className="min-w-[36px] min-h-[36px] rounded-full az-liquid-glass-pill flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitEscalation} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: 'imam', label: 'Imom-xatib (Sharʼiy savol)' },
                      { id: 'admin', label: 'Administrator (Yordam)' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setEscalateTarget(opt.id);
                        setEscalateCategory(opt.id === 'imam' ? 'Fiqh va Sharʼiy savol' : 'Texnik va platforma yordami');
                      }}
                      className={`min-h-[42px] px-3 py-2 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                        escalateTarget === opt.id
                          ? 'bg-[#064E3B] dark:bg-[#C8A85E] text-white dark:text-[#05140F] border-transparent'
                          : 'az-liquid-glass-pill text-[#334F46] dark:text-[#C2D1CB]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={escalateCategory}
                  onChange={(e) => setEscalateCategory(e.target.value)}
                  placeholder="Mavzu toifasi"
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-2xl bg-white/70 dark:bg-white/[0.06] border border-[#064E3B]/15 dark:border-white/[0.12] text-xs text-[#0B1B16] dark:text-[#F7F5F0] focus:outline-none focus:border-[#064E3B] dark:focus:border-[#10B981]"
                />

                <textarea
                  rows={4}
                  value={escalateText}
                  onChange={(e) => setEscalateText(e.target.value)}
                  placeholder="Savolingiz yoki murojaatingizni batafsil yozing..."
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white/70 dark:bg-white/[0.06] border border-[#064E3B]/15 dark:border-white/[0.12] text-xs text-[#0B1B16] dark:text-[#F7F5F0] focus:outline-none focus:border-[#064E3B] dark:focus:border-[#10B981]"
                />

                {escalateFeedback && (
                  <div
                    className={`p-3 rounded-2xl text-xs font-semibold ${
                      escalateFeedback.ok
                        ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-700 dark:text-rose-200 border border-rose-500/30'
                    }`}
                  >
                    {escalateFeedback.msg}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowEscalateModal(false)}
                    className="min-h-[42px] px-4 py-2 rounded-2xl az-liquid-glass-pill text-xs font-semibold cursor-pointer"
                  >
                    Yopish
                  </button>
                  <button
                    type="submit"
                    disabled={escalateSubmitting || escalateText.trim().length < 5}
                    className="min-h-[42px] px-5 py-2 rounded-2xl bg-[#064E3B] dark:bg-[#C8A85E] text-white dark:text-[#05140F] text-xs font-bold disabled:opacity-45 cursor-pointer"
                  >
                    {escalateSubmitting ? 'Yuborilmoqda...' : 'Rasmiy yuborish'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Live Gemini Model Availability Probe Modal — Liquid Glass */}
      <AnimatePresence>
        {showProbeModal && (
          <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.22, ease: PREMIUM_EASE }}
              className="w-full max-w-lg rounded-[30px] az-liquid-glass-modal p-6 space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[#0B1B16] dark:text-[#F7F5F0]">
                    Gemini AI Agent Model Arxitekturasi
                  </h3>
                  <p className="text-xs text-[#4A635B] dark:text-[#9CAFA7] mt-0.5">
                    Asosiy va tezkor modellarning jonli server tekshiruvi
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProbeModal(false)}
                  className="min-w-[36px] min-h-[36px] rounded-full az-liquid-glass-pill flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5">
                {probeLoading ? (
                  <div className="p-6 flex items-center justify-center gap-2.5 text-xs text-[#4A635B] dark:text-[#9CAFA7]">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                    <span>Modellar jonli tekshirilmoqda...</span>
                  </div>
                ) : (
                  probeResults.map((r) => (
                    <div
                      key={r.model}
                      className="p-3.5 rounded-2xl az-liquid-glass-card flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-mono-numbers font-bold text-[#0B1B16] dark:text-[#F7F5F0]">
                          {r.model}
                        </div>
                        <div className="text-[11px] text-[#4A635B] dark:text-[#9CAFA7] truncate mt-0.5">
                          {r.detail}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            r.available
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {r.available ? 'Faol' : 'Mavjud emas'}
                        </span>
                        <div className="text-[10px] font-mono-numbers text-[#5F776F] dark:text-[#8FA69D] mt-1">
                          {r.latencyMs} ms
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={probeLoading}
                  onClick={handleRunLiveModelProbe}
                  className="min-h-[40px] px-4 py-2 rounded-2xl bg-[#064E3B] dark:bg-[#C8A85E] text-white dark:text-[#05140F] text-xs font-bold disabled:opacity-50 cursor-pointer"
                >
                  Qayta tekshirish
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
