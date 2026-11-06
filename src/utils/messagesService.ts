/**
 * ASAKA ZIYO — Telegram/YouTube-style Messages & Channel Inbox Service
 * Handles persistent message stream, broadcast announcements, direct admin-user threads,
 * read states, and real-time Firestore synchronization.
 */

import { InboxMessageItem, MessageCategory } from '../types';
import {
  syncDocToFirestore,
  fetchCollectionFromFirestore,
  deleteDocFromFirestore,
  isAdminAuthenticated,
} from './firebaseClient';

const STORAGE_KEY = 'asaka_ziyo_inbox_messages_v1';

// Initial canonical channel messages from Asaka Jome Mosque Administration
const CANONICAL_INITIAL_MESSAGES: InboxMessageItem[] = [
  {
    id: 'msg-welcome-01',
    title: 'Asaka Ziyo rasmiy xabarlar va maʼrifat kanaliga xush kelibsiz!',
    body: 'Assalomu alaykum va rahmatullohi va barakotuh! Asaka shahri va vodiy ahli uchun moʻljallangan «ASAKA ZIYO» platformasining rasmiy xabarlar boʻlimi ishga tushirildi. Bu yerda jome masjidi eʼlonlari, muftiyot qarorlari, tasdiqlangan namoz vaqtlari oʻzgarishi hamda muhim maʼruzalar toʻgʻridan-toʻgʻri yetkaziladi.',
    category: 'announcement',
    senderName: 'Asaka Jome Masjidi Maʼmuriyati',
    senderRole: 'Bosh tahririyat',
    createdAt: 'Bugun, 08:00',
    timestampMs: Date.now() - 3600000 * 4,
    read: false,
    isBroadcast: true,
    linkTab: 'home',
    priority: 'high',
    imageUrl: '/images/asaka_islamic_architecture_1793634657962.jpg',
  },
  {
    id: 'msg-prayer-02',
    title: 'Asaka shahri uchun tasdiqlangan 8 ta namoz vaqtlari jadvali',
    body: 'Hurmatli namozxonlar! Asaka hududi uchun joriy haftalik namoz vaqtlari imom-xatib tomonidan tasdiqlangan holda yangilandi. Bomdod, Peshin, Asr, Shom, Xufton hamda Tahajjud va Subh (saharlik) vaqtlarini ilovada tekshirib borishingiz mumkin.',
    category: 'prayer',
    senderName: 'Namoz vaqtlari hayʼati',
    senderRole: 'Asaka masjid taqvimi',
    createdAt: 'Bugun, 09:30',
    timestampMs: Date.now() - 3600000 * 2,
    read: false,
    isBroadcast: true,
    linkTab: 'prayer',
    priority: 'normal',
  },
  {
    id: 'msg-quiz-03',
    title: 'Kunlik Islomiy Viktorina: Bugungi 10 ta yangi savol tayyor!',
    body: 'Bugungi kunlik diniy bilim testi yangilandi. Qurʼon, Hadis, Fiqh va Islom tarixi boʻyicha 10 ta savolga javob bering, manbalarni oʻrganing va natijalaringizni arxivda saqlang.',
    category: 'quiz',
    senderName: 'Ilmiy tahririyat',
    senderRole: 'Maʼrifiy boʻlim',
    createdAt: 'Bugun, 10:15',
    timestampMs: Date.now() - 3600000,
    read: false,
    isBroadcast: true,
    linkTab: 'quiz',
    priority: 'normal',
  },
];

let cachedMessages: InboxMessageItem[] | null = null;
const subscribers = new Set<(messages: InboxMessageItem[]) => void>();

export function subscribeToMessages(callback: (messages: InboxMessageItem[]) => void): () => void {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

function notifySubscribers(list: InboxMessageItem[]) {
  subscribers.forEach((cb) => cb(list));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('asaka-ziyo-messages-updated', { detail: list }));
  }
}

export function getStoredInboxMessages(): InboxMessageItem[] {
  if (cachedMessages) return cachedMessages;

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          cachedMessages = parsed;
          return parsed;
        }
      }
    }
  } catch {
    // fallback
  }

  cachedMessages = CANONICAL_INITIAL_MESSAGES;
  return CANONICAL_INITIAL_MESSAGES;
}

export function saveLocalMessages(messages: InboxMessageItem[]): void {
  cachedMessages = messages;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  } catch {
    // ignore
  }
  notifySubscribers(messages);
}

/**
 * Sync messages with Firestore Cloud
 */
export async function syncMessagesWithFirestore(): Promise<InboxMessageItem[]> {
  try {
    const res = await fetchCollectionFromFirestore<InboxMessageItem>('messages');
    if (res.success && res.data.length > 0) {
      // Merge with local read states
      const local = getStoredInboxMessages();
      const readMap = new Map(local.map((m) => [m.id, m.read]));

      const merged = res.data.map((remote) => ({
        ...remote,
        read: readMap.has(remote.id) ? (readMap.get(remote.id) as boolean) : remote.read,
      }));

      merged.sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));
      saveLocalMessages(merged);
      return merged;
    }
  } catch (e) {
    console.warn('[Messages] Firestore sync notice:', e);
  }
  return getStoredInboxMessages();
}

/**
 * Send a new broadcast or targeted message (Admin)
 */
export async function sendAdminMessage(params: {
  title: string;
  body: string;
  category: MessageCategory;
  senderName?: string;
  senderRole?: string;
  imageUrl?: string;
  linkTab?: any;
  linkUrl?: string;
  isBroadcast?: boolean;
  targetUserId?: string;
  priority?: 'normal' | 'high' | 'urgent';
}): Promise<{ success: boolean; message: InboxMessageItem; error?: string }> {
  const now = new Date();
  const formattedDate = `Bugun, ${now.getHours().toString().padStart(2, '0')}:${now
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;

  const newMsg: InboxMessageItem = {
    id: `msg-${Date.now()}`,
    title: params.title.trim(),
    body: params.body.trim(),
    category: params.category,
    senderName: params.senderName || 'Asaka Jome Masjidi Maʼmuriyati',
    senderRole: params.senderRole || 'Bosh Administrator',
    createdAt: formattedDate,
    timestampMs: Date.now(),
    read: false,
    isBroadcast: params.isBroadcast ?? true,
    targetUserId: params.targetUserId,
    imageUrl: params.imageUrl,
    linkTab: params.linkTab,
    linkUrl: params.linkUrl,
    priority: params.priority || 'normal',
  };

  // 1. Primary write to Firestore Cloud
  if (isAdminAuthenticated()) {
    const fsRes = await syncDocToFirestore('messages', newMsg.id, newMsg);
    if (!fsRes.success) {
      console.warn('[Messages] Firestore write returned:', fsRes.error);
    }
  }

  // 2. Local store & notify
  const current = getStoredInboxMessages();
  const updated = [newMsg, ...current.filter((m) => m.id !== newMsg.id)];
  saveLocalMessages(updated);

  return { success: true, message: newMsg };
}

/**
 * Send user reply to a message thread (User <-> Admin)
 */
export async function replyToMessage(
  messageId: string,
  replyText: string
): Promise<{ success: boolean; error?: string }> {
  const current = getStoredInboxMessages();
  const target = current.find((m) => m.id === messageId);
  if (!target) return { success: false, error: 'Xabar topilmadi' };

  const now = new Date();
  const nowStr = `Bugun, ${now.getHours().toString().padStart(2, '0')}:${now
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;

  const updatedItem: InboxMessageItem = {
    ...target,
    userReply: replyText.trim(),
    userRepliedAt: nowStr,
  };

  const updated = current.map((m) => (m.id === messageId ? updatedItem : m));
  saveLocalMessages(updated);

  // Send to Firestore if connection available
  try {
    await syncDocToFirestore('messages', messageId, updatedItem);
  } catch {
    // ignore
  }

  return { success: true };
}

export function markMessageAsRead(id: string): InboxMessageItem[] {
  const current = getStoredInboxMessages();
  const updated = current.map((m) => (m.id === id ? { ...m, read: true } : m));
  saveLocalMessages(updated);
  return updated;
}

export function markAllMessagesAsRead(): InboxMessageItem[] {
  const current = getStoredInboxMessages();
  const updated = current.map((m) => ({ ...m, read: true }));
  saveLocalMessages(updated);
  return updated;
}

export async function deleteMessage(id: string): Promise<InboxMessageItem[]> {
  const current = getStoredInboxMessages();
  const updated = current.filter((m) => m.id !== id);
  saveLocalMessages(updated);

  if (isAdminAuthenticated()) {
    try {
      await deleteDocFromFirestore('messages', id);
    } catch {
      // ignore
    }
  }

  return updated;
}

export function getUnreadMessagesCount(): number {
  const current = getStoredInboxMessages();
  return current.filter((m) => !m.read).length;
}
