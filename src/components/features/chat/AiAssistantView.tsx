import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  RefreshCw,
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
} from 'lucide-react';
import { SupportedLocale } from '../../../types';
import { auth, db } from '../../../utils/firebaseClient';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { GeometricPattern, IslamicStarEmblem } from '../../ui/GeometricPattern';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  isError?: boolean;
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

const LOCAL_CONVERSATIONS_KEY = 'asaka_ziyo_ai_conversations_v2';
const GUEST_USER_ID_KEY = 'asaka_ziyo_guest_uid_v1';

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
      'Assalomu alaykum va rahmatullohi va barakatuh! Men ASAKA ZIYO rasmiy sunʼiy intellekt yordamchisiman (Google Gemini AI). Qurʼoni Karim oyatlari, Tafsiri Hilol sharhlari, sahih hadislar, Asaka 8 mahal namoz taqvimi hamda kundalik duolar boʻyicha savollaringizga ishonchli manbalar asosida javob berishga tayyorman.',
    'uz-Cyrl':
      'Ассалому алайкум ва раҳматуллоҳи ва баракатуҳ! Мен АСАКА ЗИЁ расмий сунъий интеллект ёрдамчисиман (Google Gemini AI). Қуръони Карим оятлари, Тафсири Ҳилол шарҳлари, саҳиҳ ҳадислар, Асака 8 маҳал намоз тақвими ҳамда кундалик дуолар бўйича саволларингизга ишончли манбалар асосида жавоб беришга тайёрман.',
    'uz-Latn-new':
      'Assalomu alaykum va rahmatullohi va barakatuh! Men ASAKA ZIYO rasmiy sunʼiy intellekt yordamchisiman (Google Gemini AI). Qurʼoni Karim oyatlari, Tafsiri Hilol sharhlari, sahih hadislar, Asaka 8 mahal namoz taqvimi hamda kundalik duolar boʻyicha savollaringizga ishonchli manbalar asosida javob berishga tayyorman.',
    ru: 'Ассаляму алейкум ва рахматуллахи ва баракатух! Я официальный ИИ-ассистент ASAKA ZIYO на базе Google Gemini AI. Готов ответить на ваши вопросы по аятам Священного Корана (Тафсири Хилал), достоверным хадисам, расписанию намазов города Асака и ежедневным дуа.',
    en: 'Assalamu Alaikum wa Rahmatullahi wa Barakatuh! I am the official ASAKA ZIYO Intelligent Islamic AI Assistant powered by Google Gemini AI. How can I assist you with Quranic verses (Tafsiri Hilol), authentic Hadiths, Asaka prayer schedules, and daily Duas today?',
  };

  return {
    id: 'msg-welcome',
    role: 'model',
    content: textMap[locale] || textMap['uz-Latn'],
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

interface TopicCategory {
  id: string;
  labelUz: string;
  icon: React.ReactNode;
  prompt: Record<SupportedLocale, string>;
}

const TOPIC_CATEGORIES: TopicCategory[] = [
  {
    id: 'prayer',
    labelUz: 'Namoz vaqtlari va tartibi',
    icon: <Clock className="w-3.5 h-3.5 text-[#c9a84c]" />,
    prompt: {
      'uz-Latn': 'Asaka shahri uchun bugungi 8 mahal namoz vaqtlari qanday va Bomdod namozi qanday oʻqiladi?',
      'uz-Cyrl': 'Асака шаҳри учун бугунги 8 маҳал намоз вақтлари қандай ва Бомдод намози қандай ўқилади?',
      'uz-Latn-new': 'Asaka shahri uchun bugungi 8 mahal namoz vaqtlari qanday va Bomdod namozi qanday oʻqiladi?',
      ru: 'Каково сегодняшнее расписание 8 намазов в городе Асака и как совершается утренний намаз (Фаджр)?',
      en: 'What is today’s 8-time prayer schedule for Asaka and how is the Fajr prayer performed?',
    },
  },
  {
    id: 'quran',
    labelUz: 'Qurʼon va Tafsiri Hilol',
    icon: <BookOpen className="w-3.5 h-3.5 text-[#c9a84c]" />,
    prompt: {
      'uz-Latn': 'Baqara surasi 255-oyat (Oyatul Kursiy) arabcha matni, maʼnosi va fazilati haqida Tafsiri Hilol asosida maʼlumot bering.',
      'uz-Cyrl': 'Бақара сураси 255-оят (Оятул Курсий) арабча матни, маъноси ва фазилати ҳақида Тафсири Ҳилол асосида маълумот беринг.',
      'uz-Latn-new': 'Baqara surasi 255-oyat (Oyatul Kursiy) arabcha matni, maʼnosi va fazilati haqida Tafsiri Hilol asosida maʼlumot bering.',
      ru: 'Расскажите об Аятуль Курси (Сура Аль-Бакара, 255): арабский текст, перевод смысла и достоинства.',
      en: 'Explain Ayat al-Kursi (Surah Al-Baqarah 2:255) with its Arabic text, translation, and virtues.',
    },
  },
  {
    id: 'hadith',
    labelUz: 'Sahih Hadislar',
    icon: <Sparkles className="w-3.5 h-3.5 text-[#c9a84c]" />,
    prompt: {
      'uz-Latn': 'Ilm olish va ota-onaga yaxshilik qilish haqida Imom Buxoriy va Imom Muslim rivoyat qilgan sahih hadislardan keltiring.',
      'uz-Cyrl': 'Илм олиш ва ота-онага яхшилик қилиш ҳақида Имом Бухорий ва Имом Муслим ривоят қилган саҳиҳ ҳадислардан келтиринг.',
      'uz-Latn-new': 'Ilm olish va ota-onaga yaxshilik qilish haqida Imom Buxoriy va Imom Muslim rivoyat qilgan sahih hadislardan keltiring.',
      ru: 'Приведите достоверные хадисы из Сахих аль-Бухари о получении знаний и благочестии к родителям.',
      en: 'Share authentic Hadiths from Sahih al-Bukhari and Sahih Muslim about seeking knowledge and kindness to parents.',
    },
  },
  {
    id: 'dua',
    labelUz: 'Kunlik Zikr va Duolar',
    icon: <Heart className="w-3.5 h-3.5 text-[#c9a84c]" />,
    prompt: {
      'uz-Latn': 'Tonggi va kechki zikrlar hamda namozdan keyin oʻqiladigan eng muhim duolarni arabcha matni va maʼnosi bilan yozib bering.',
      'uz-Cyrl': 'Тонгги ва кечки зикрлар ҳамда намоздан кейин ўқиладиган энг муҳим дуоларни арабча матни ва маъноси билан ёзиб беринг.',
      'uz-Latn-new': 'Tonggi va kechki zikrlar hamda namozdan keyin oʻqiladigan eng muhim duolarni arabcha matni va maʼnosi bilan yozib bering.',
      ru: 'Напишите утренние и вечерние азкары и дуа после намаза с арабским текстом и переводом.',
      en: 'Provide the authentic morning and evening adhkar and post-prayer duas with Arabic text and meaning.',
    },
  },
  {
    id: 'fasting',
    labelUz: 'Roʻza va Zakot ilmi',
    icon: <Compass className="w-3.5 h-3.5 text-[#c9a84c]" />,
    prompt: {
      'uz-Latn': 'Hanafiy mazhabida roʻza tutish shartlari, saharlik va iftorlik duolari hamda roʻzani buzadigan amallar qaysilar?',
      'uz-Cyrl': 'Ҳанафий мазҳабида рўза тутиш шартлари, саҳарлик ва ифторлик дуолари ҳамда рўзани бузадиган амаллар қайсилар?',
      'uz-Latn-new': 'Hanafiy mazhabida roʻza tutish shartlari, saharlik va iftorlik duolari hamda roʻzani buzadigan amallar qaysilar?',
      ru: 'Каковы условия поста по ханафитскому мазхабу, дуа сухура и ифтара, а также действия, нарушающие пост?',
      en: 'What are the rules of fasting in the Hanafi school, suhoor and iftar duas, and actions that invalidate fasting?',
    },
  },
];

export const AiAssistantView: React.FC = () => {
  const [locale, setLocale] = useState<SupportedLocale>('uz-Latn');
  const [conversations, setConversations] = useState<AiConversationRecord[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([getWelcomeMessage('uz-Latn')]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [aiStatus, setAiStatus] = useState<{ connected: boolean; model: string; checked?: boolean }>({
    connected: false,
    model: 'gemini-3.8-flash',
    checked: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check backend Gemini AI status on mount — never fake connected: true
  useEffect(() => {
    let mounted = true;
    fetch('/api/ai/status')
      .then((r) => r.json())
      .then((data) => {
        if (mounted && data) {
          setAiStatus({
            connected: Boolean(data.connected),
            model: data.model || 'gemini-3.8-flash',
            checked: true,
          });
        }
      })
      .catch(() => {
        if (mounted) {
          setAiStatus({
            connected: false,
            model: 'gemini-3.8-flash',
            checked: true,
          });
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Load user's saved conversations from local storage + backend
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
        title: 'Yangi ilmiy suhbat',
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
  }, [messages, isLoading]);

  const persistConversation = useCallback(
    async (convId: string, updatedMessages: ChatMessage[], currentLocale: SupportedLocale) => {
      const userId = getActiveConversationOwnerId();
      const firstUserMsg = updatedMessages.find((m) => m.role === 'user');
      const derivedTitle = firstUserMsg
        ? firstUserMsg.content.slice(0, 52) + (firstUserMsg.content.length > 52 ? '...' : '')
        : 'Yangi ilmiy suhbat';

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

      // Persist to backend API
      try {
        await fetch('/api/ai/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, conversation: updatedRecord }),
        });
      } catch {
        // ignore offline
      }

      // Persist to Firestore if authenticated Firebase user
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
      title: 'Yangi ilmiy suhbat',
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

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyPayload,
          locale,
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
        };
        setMessages((prev) => [...prev, placeholderMsg]);

        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let accumulated = '';

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
              if (parsed.text) {
                accumulated += parsed.text;
                setMessages((prev) =>
                  prev.map((m) => (m.id === streamingModelId ? { ...m, content: accumulated } : m))
                );
              }
              if (parsed.done && parsed.fullText && !accumulated) {
                accumulated = parsed.fullText;
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
        };
        const finalHistory = [...updatedWithUser, finalMsg];
        setMessages(finalHistory);
        await persistConversation(convId, finalHistory, locale);
      } else {
        // Fallback to standard JSON response
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'AI xizmatida xatolik yuz berdi.');
        }

        const modelMsg: ChatMessage = {
          id: streamingModelId,
          role: 'model',
          content: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
            ? `Kechirasiz, soʻrovni bajarishda xatolik yuz berdi: ${err?.message || 'Tarmoq xatosi'}. Iltimos, qayta urinib koʻring.`
            : locale === 'uz-Cyrl'
            ? `Кечирасиз, сўровни бажаришда хатолик юз берди: ${err?.message || 'Тармоқ хатоси'}. Илтимос, қайта уриниб кўринг.`
            : `Sorry, an error occurred while processing your request: ${err?.message || 'Network error'}.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev.filter((m) => m.id !== streamingModelId), errorMsg]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
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

  return (
    <div className="max-w-7xl mx-auto px-1 sm:px-2 py-2 space-y-6">
      {/* 2026 Architectural AI Workspace Header */}
      <div className="relative rounded-[28px] overflow-hidden border border-white/[0.1] bg-[#071410] text-[#F7F5F0] p-6 sm:p-8 shadow-[0_24px_64px_-20px_rgba(3,10,8,0.55)]">
        <GeometricPattern opacity={0.04} />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#9CAFA7]">
              <span className="font-medium text-[#10B981]">ASAKA ZIYO</span>
              <span aria-hidden="true" className="text-white/25">·</span>
              <span>Islomiy ilmiy suhbat</span>
              <span aria-hidden="true" className="text-white/25">·</span>
              <span className="text-[#C8A85E]">{aiStatus.connected ? 'Faol ulanish' : 'Mahalliy rejim'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold tracking-[-0.03em] text-[#F7F5F0] text-balance leading-[1.12]">
              Ilmiy va Maʼrifiy Islomiy AI Yordamchi
            </h1>
            <p className="text-xs sm:text-sm text-[#C2D1CB] leading-relaxed">
              Qurʼoni Karim oyatlari, Shayx Muhammad Sodiq Muhammad Yusufning «Tafsiri Hilol» va «Hadis va Hayot»
              asarlari, sahih hadislar hamda Asaka shahri 8 mahal namoz taqvimi asosida jonli ilmiy suhbat.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Language Switcher */}
            <div className="min-h-[44px] flex items-center gap-2 bg-white/[0.06] px-3.5 py-2 rounded-xl border border-white/[0.1] text-xs text-[#F7F5F0]">
              <Globe size={15} className="text-[#10B981] shrink-0" />
              <select
                value={locale}
                onChange={(e) => {
                  const nextLoc = e.target.value as SupportedLocale;
                  setLocale(nextLoc);
                }}
                aria-label="Muloqot tilini tanlash"
                className="bg-transparent text-[#F7F5F0] font-semibold focus:outline-none cursor-pointer"
              >
                <option value="uz-Latn" className="bg-[#0B1411] text-[#F7F5F0]">
                  Oʻzbekcha (Lotin)
                </option>
                <option value="uz-Cyrl" className="bg-[#0B1411] text-[#F7F5F0]">
                  Ўзбекча (Кирилл)
                </option>
                <option value="uz-Latn-new" className="bg-[#0B1411] text-[#F7F5F0]">
                  Oʻzbekcha (Yangi alifbo)
                </option>
                <option value="ru" className="bg-[#0B1411] text-[#F7F5F0]">
                  Русский
                </option>
                <option value="en" className="bg-[#0B1411] text-[#F7F5F0]">
                  English
                </option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleStartNewConversation}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-[#04120D] font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus size={15} />
              <span>Yangi suhbat</span>
            </button>

            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              title="Suhbat tarixini tozalash"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/[0.06] hover:bg-rose-500/20 text-[#C2D1CB] hover:text-rose-200 border border-white/[0.1] hover:border-rose-500/40 transition-colors cursor-pointer"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Religious Scholarly Advisory Note */}
      <div className="rounded-2xl bg-white dark:bg-[#0B1411] border border-[#064E3B]/[0.1] dark:border-white/[0.08] p-4 text-xs text-[#4B635B] dark:text-[#9CAFA7] flex items-start gap-3">
        <ShieldAlert size={18} className="text-[#C8A85E] shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold text-[#0B1B16] dark:text-[#F7F5F0]">Fiqhiy va ilmiy eslatma:</span> Ushbu sunʼiy intellekt
          yordamchisi ishonchli islomiy manbalar asosida maʼrifiy maʼlumot beradi. Nikoh, taloq, meros taqsimoti va
          shaxsiy sharʼiy fatvolar boʻyicha Oʻzbekiston musulmonlari idorasi yoki Asaka Jome masjidi imom-xatiblariga
          murojaat qiling.
        </div>
      </div>

      {/* Main Workspace: Sidebar Conversations + Chat Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar: Saved Conversations & Topic Starters */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          <div className="rounded-2xl bg-white dark:bg-[#0B1411] border border-[#064E3B]/[0.1] dark:border-white/[0.08] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-[#0B1B16] dark:text-[#F7F5F0] flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-[#064E3B] dark:text-[#10B981]" />
                <span className="tabular-nums">Suhbatlar tarixi ({conversations.length})</span>
              </h2>
              <button
                type="button"
                onClick={handleStartNewConversation}
                className="text-xs font-semibold text-[#064E3B] dark:text-[#10B981] hover:opacity-80 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Yangi
              </button>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {conversations.map((conv) => {
                const isActive = conv.id === activeConversationId;
                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`group flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-[#064E3B]/[0.08] dark:bg-[#10B981]/15 border-[#064E3B]/25 dark:border-[#10B981]/35 text-[#064E3B] dark:text-[#F7F5F0] font-semibold'
                        : 'bg-[#F7F5F0] dark:bg-[#0F1A16] border-transparent text-[#4B635B] dark:text-[#9CAFA7] hover:border-[#064E3B]/15 dark:hover:border-white/15'
                    }`}
                  >
                    <div className="truncate flex-1">
                      <div className="truncate">{conv.title || 'Yangi ilmiy suhbat'}</div>
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

          {/* Quick Islamic Knowledge Categories */}
          <div className="rounded-2xl bg-white dark:bg-[#0B1411] border border-[#064E3B]/[0.1] dark:border-white/[0.08] p-4 space-y-3">
            <h2 className="text-xs font-semibold text-[#0B1B16] dark:text-[#F7F5F0] flex items-center gap-2">
              <HelpCircle className="w-3.5 h-3.5 text-[#C8A85E]" />
              <span>Ilmiy mavzular</span>
            </h2>
            <div className="space-y-2">
              {TOPIC_CATEGORIES.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleSend(topic.prompt[locale] || topic.prompt['uz-Latn'])}
                  className="w-full min-h-[42px] text-left px-3.5 py-2.5 rounded-xl bg-[#F7F5F0] dark:bg-[#0F1A16] hover:bg-[#ECE8DF] dark:hover:bg-[#14241E] border border-[#064E3B]/[0.08] dark:border-white/[0.07] transition-colors flex items-center gap-2.5 text-xs text-[#0B1B16] dark:text-[#E5ECE9] cursor-pointer disabled:opacity-50"
                >
                  {topic.icon}
                  <span className="font-medium">{topic.labelUz}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Conversational Stream */}
        <div className="lg:col-span-8 xl:col-span-9">
          <div className="rounded-3xl bg-white dark:bg-[#0B1411] border border-[#064E3B]/[0.1] dark:border-white/[0.08] flex flex-col h-[640px] overflow-hidden shadow-xs">
            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 max-w-[92%] sm:max-w-[82%] ${
                    m.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      m.role === 'user'
                        ? 'bg-[#064E3B] dark:bg-[#10B981] text-white dark:text-[#04120D]'
                        : 'bg-[#F2EFE9] dark:bg-[#14241E] text-[#064E3B] dark:text-[#10B981] border border-[#064E3B]/[0.1] dark:border-white/[0.08]'
                    }`}
                  >
                    {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>

                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div
                      className={`p-4 rounded-2xl text-sm leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-[#064E3B] dark:bg-[#14241E] text-[#F7F5F0] rounded-tr-sm border border-[#064E3B] dark:border-[#10B981]/25'
                          : m.isError
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 rounded-tl-sm border border-rose-200 dark:border-rose-500/30'
                          : 'bg-[#F7F5F0] dark:bg-[#0F1A16] text-[#0B1B16] dark:text-[#EEF3F1] rounded-tl-sm border border-[#064E3B]/[0.08] dark:border-white/[0.07]'
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">{m.content}</div>
                    </div>

                    <div
                      className={`flex items-center gap-3 text-[11px] text-[#5F736C] dark:text-[#7A9088] px-1 ${
                        m.role === 'user' ? 'justify-end' : 'justify-between'
                      }`}
                    >
                      <span className="tabular-nums">{m.timestamp}</span>
                      {m.role === 'model' && m.content && (
                        <div className="flex items-center gap-2">
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
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 max-w-[80%] mr-auto items-center">
                  <div className="w-9 h-9 rounded-xl bg-[#F2EFE9] dark:bg-[#14241E] text-[#064E3B] dark:text-[#10B981] border border-[#064E3B]/[0.1] dark:border-white/[0.08] flex items-center justify-center shrink-0">
                    <RefreshCw size={15} className="animate-spin" />
                  </div>
                  <div className="bg-[#F7F5F0] dark:bg-[#0F1A16] px-4 py-3 rounded-2xl rounded-tl-sm border border-[#064E3B]/[0.1] dark:border-white/[0.08] text-xs text-[#4B635B] dark:text-[#C2D1CB] flex items-center gap-3">
                    <span>
                      {isStreaming
                        ? 'Jonli javob tayyorlanmoqda...'
                        : 'ASAKA ZIYO manbalarni tahlil qilmoqda...'}
                    </span>
                    <button
                      type="button"
                      onClick={handleStopGeneration}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-semibold cursor-pointer"
                    >
                      <Square className="w-3 h-3" />
                      <span>Toʻxtatish</span>
                    </button>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Action Bar: Regenerate & Sources */}
            <div className="px-4 py-2.5 bg-[#F7F5F0] dark:bg-[#08100D] border-t border-[#064E3B]/[0.08] dark:border-white/[0.08] flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-[#5F736C] dark:text-[#8EA39B] min-w-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                <span className="truncate">
                  Manba: Qurʼoni Karim, Tafsiri Hilol, Sahih al-Buxoriy va Asaka 8 namoz taqvimi
                </span>
              </div>
              {messages.some((m) => m.role === 'user') && !isLoading && (
                <button
                  type="button"
                  onClick={handleRegenerateLast}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#14241E] hover:bg-[#ECE8DF] dark:hover:bg-[#1B2F27] text-[#0B1B16] dark:text-[#E5ECE9] border border-[#064E3B]/[0.1] dark:border-white/[0.08] transition-colors shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Qayta javob olish</span>
                </button>
              )}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3.5 bg-white dark:bg-[#0B1411] border-t border-[#064E3B]/[0.08] dark:border-white/[0.08] flex items-center gap-2.5"
            >
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Diniy savolingizni yozing (masalan: Bomdod namozi, Oyatul Kursiy, Asaka namoz vaqti)..."
                className="flex-1 min-h-[46px] bg-[#F7F5F0] dark:bg-[#0F1A16] text-[#0B1B16] dark:text-[#F7F5F0] placeholder-[#5F736C] dark:placeholder-[#7A9088] px-4 py-3 rounded-xl border border-[#064E3B]/[0.12] dark:border-white/[0.1] focus:outline-none focus:border-[#064E3B] dark:focus:border-[#10B981] text-sm"
              />
              {isLoading ? (
                <button
                  type="button"
                  onClick={handleStopGeneration}
                  className="min-h-[46px] bg-rose-600 hover:bg-rose-700 text-white px-5 py-3 rounded-xl font-semibold flex items-center gap-2 transition-colors shrink-0 text-xs cursor-pointer"
                >
                  <Square size={15} />
                  <span>Toʻxtatish</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputVal.trim()}
                  className="min-h-[46px] bg-[#064E3B] hover:bg-[#04392B] dark:bg-[#10B981] dark:hover:bg-[#059669] disabled:opacity-40 text-white dark:text-[#04120D] px-5 py-3 rounded-xl font-semibold flex items-center gap-2 transition-colors shrink-0 text-xs cursor-pointer"
                >
                  <span>Yuborish</span>
                  <Send size={15} />
                </button>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Clear Conversation Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0B1411] border border-[#064E3B]/[0.12] dark:border-white/[0.12] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold text-[#0B1B16] dark:text-[#F7F5F0]">Suhbat tarixini tozalash</h3>
            </div>
            <p className="text-xs text-[#4B635B] dark:text-[#9CAFA7] leading-relaxed">
              Joriy suhbatdagi barcha savol va javoblarni oʻchirib, yangi sahifadan boshlashni tasdiqlaysizmi?
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-[#F2EFE9] dark:bg-white/[0.08] hover:bg-[#E6E1D6] dark:hover:bg-white/[0.14] text-[#0B1B16] dark:text-[#E5ECE9] text-xs font-semibold cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={confirmClearHistory}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
              >
                Ha, tozalash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
