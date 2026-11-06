import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { NavigationTab, InboxMessageItem, MessageCategory } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { GeometricPattern, IslamicStarEmblem } from '../../ui/GeometricPattern';
import {
  getStoredInboxMessages,
  markMessageAsRead,
  markAllMessagesAsRead,
  deleteMessage,
  replyToMessage,
  subscribeToMessages,
  syncMessagesWithFirestore,
} from '../../../utils/messagesService';
import {
  MessageSquare,
  CheckCheck,
  Send,
  Trash2,
  Clock,
  Sparkles,
  Radio,
  BookOpen,
  HelpCircle,
  Share2,
  Check,
  Search,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  BellRing,
} from 'lucide-react';

interface MessagesViewProps {
  onNavigate: (tab: NavigationTab) => void;
}

export const MessagesView: React.FC<MessagesViewProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<InboxMessageItem[]>(() => getStoredInboxMessages());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [submittingReplyId, setSubmittingReplyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    syncMessagesWithFirestore().then((synced) => {
      setMessages(synced);
    });

    const unsubscribe = subscribeToMessages((newList) => {
      setMessages(newList);
    });
    return unsubscribe;
  }, []);

  const unreadCount = messages.filter((m) => !m.read).length;

  const handleMarkAllRead = () => {
    const updated = markAllMessagesAsRead();
    setMessages(updated);
    setActionNotice('Barcha xabarlar oʻqilgan deb belgilandi.');
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleMarkOneRead = (id: string) => {
    const updated = markMessageAsRead(id);
    setMessages(updated);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = await deleteMessage(id);
    setMessages(updated);
  };

  const handleSendReply = async (messageId: string) => {
    const text = replyInputs[messageId]?.trim();
    if (!text) return;

    setSubmittingReplyId(messageId);
    const res = await replyToMessage(messageId, text);
    setSubmittingReplyId(null);

    if (res.success) {
      setReplyInputs((prev) => ({ ...prev, [messageId]: '' }));
      setActionNotice('Javobingiz maʼmuriyatga muvaffaqiyatli yetkazildi!');
      setTimeout(() => setActionNotice(null), 3500);
      setMessages(getStoredInboxMessages());
    }
  };

  const handleShare = (msg: InboxMessageItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const shareText = `${msg.title}\n\n${msg.body}\n\n— ASAKA ZIYO Rasmiy Kanali`;
    if (navigator.share) {
      navigator.share({ title: msg.title, text: shareText }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText);
      setCopiedId(msg.id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const filteredMessages = messages.filter((m) => {
    if (selectedCategory === 'unread') return !m.read;
    if (selectedCategory !== 'all' && m.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        m.title.toLowerCase().includes(q) ||
        m.body.toLowerCase().includes(q) ||
        m.senderName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getCategoryMeta = (cat: string) => {
    switch (cat) {
      case 'prayer':
        return { label: 'Namoz vaqtlari', color: 'text-emerald-400' };
      case 'announcement':
        return { label: 'Muhim eʼlon', color: 'text-[#c5a869]' };
      case 'quiz':
        return { label: 'Kunlik viktorina', color: 'text-amber-400' };
      case 'content':
        return { label: 'Yangi nashr', color: 'text-blue-400' };
      case 'direct':
        return { label: 'Shaxsiy javob', color: 'text-purple-400' };
      default:
        return { label: 'Umumiy', color: 'text-stone-400' };
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      {/* Telegram/YouTube Channel Header */}
      <div className="relative rounded-3xl overflow-hidden border border-[#c5a869]/30 bg-gradient-to-r from-[#031d17] via-[#071614] to-[#04241d] p-6 sm:p-8 text-white shadow-xl">
        <GeometricPattern opacity={0.06} />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#c5a869]/30 to-[#04241d] border border-[#c5a869]/60 flex items-center justify-center shrink-0 shadow-lg">
              <IslamicStarEmblem size={32} className="text-[#c5a869]" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-display font-bold text-white tracking-wide">
                  ASAKA ZIYO Rasmiy Kanali
                </h1>
                <span title="Tasdiqlangan rasmiy kanal">
                  <ShieldCheck className="w-5 h-5 text-[#c5a869] shrink-0" />
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-300">
                <span>@Asaka_Ziyo</span>
                <span aria-hidden="true">·</span>
                <span>Asaka Markaziy Jome Masjidi</span>
                {unreadCount > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-rose-400 font-bold">{unreadCount} ta oʻqilmagan</span>
                  </>
                )}
              </div>
              <p className="text-xs text-stone-400 max-w-lg leading-relaxed pt-1">
                Jome masjidi eʼlonlari, muftiyot qarorlari, tasdiqlangan namoz vaqtlari va maʼrifiy suhbatlar toʻgʻridan-toʻgʻri kanali.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllRead}
                className="text-xs border-[#c5a869]/40 text-[#c5a869] hover:bg-[#c5a869]/15"
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
                <span>Barchasini oʻqilgan qilish</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Action Notice Toast */}
      {actionNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn shadow-md">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Search & Categories Bar */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Xabarlardan qidirish..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-stone-100 dark:bg-stone-900/60 border border-stone-200 dark:border-emerald-950/80 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:border-[#c5a869]"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {[
            { id: 'all', label: 'Barchasi', count: messages.length },
            { id: 'unread', label: 'Oʻqilmagan', count: unreadCount },
            { id: 'announcement', label: 'Eʼlonlar' },
            { id: 'prayer', label: 'Namoz vaqti' },
            { id: 'quiz', label: 'Viktorina' },
            { id: 'content', label: 'Maqola va darslar' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-[#c5a869] text-[#071614] font-semibold shadow-sm'
                  : 'bg-stone-100 dark:bg-stone-900/50 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <span>{cat.label}</span>
              {typeof cat.count === 'number' && cat.count > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/10 font-mono-numbers">
                  {cat.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Feed */}
      <div className="space-y-4">
        {filteredMessages.length === 0 ? (
          <Card className="p-12 text-center space-y-3 bg-stone-50/50 dark:bg-[#071614]/40">
            <div className="w-12 h-12 rounded-full bg-stone-200 dark:bg-emerald-950/40 mx-auto flex items-center justify-center text-stone-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200">
              Ushbu toifada xabar topilmadi
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Maʼmuriyat yangi xabar joylaganda ushbu boʻlimda aks etadi.
            </p>
          </Card>
        ) : (
          filteredMessages.map((msg) => {
            const meta = getCategoryMeta(msg.category);
            return (
              <Card
                key={msg.id}
                elevated={!msg.read}
                onClick={() => handleMarkOneRead(msg.id)}
                className={`p-5 sm:p-6 transition-all relative overflow-hidden border ${
                  !msg.read
                    ? 'border-[#c5a869]/50 bg-gradient-to-br from-emerald-950/30 via-[#071614] to-[#04241d]/20'
                    : 'border-stone-200 dark:border-emerald-950/60 bg-white/60 dark:bg-[#071614]/60'
                }`}
              >
                {!msg.read && (
                  <span className="absolute top-0 left-0 bottom-0 w-1 bg-[#c5a869]" />
                )}

                <div className="space-y-4">
                  {/* Sender Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#c5a869]/20 border border-[#c5a869]/40 flex items-center justify-center shrink-0">
                        <IslamicStarEmblem size={18} className="text-[#c5a869]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                            {msg.senderName}
                          </span>
                          <ShieldCheck className="w-3.5 h-3.5 text-[#c5a869]" />
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400">
                          <span className={meta.color}>{meta.label}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-numbers">{msg.createdAt}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => handleShare(msg, e)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-[#c5a869] hover:bg-[#c5a869]/10 transition-colors"
                        title="Ulashish"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Share2 className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={(e) => handleDelete(msg.id, e)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title="Oʻchirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Message Title & Body */}
                  <div className="space-y-2">
                    <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 leading-snug">
                      {msg.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed whitespace-pre-line">
                      {msg.body}
                    </p>
                  </div>

                  {/* Optional Attached Image */}
                  {msg.imageUrl && (
                    <div className="rounded-2xl overflow-hidden border border-stone-200 dark:border-emerald-950/80 max-h-72">
                      <img
                        src={msg.imageUrl}
                        alt={msg.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  {/* Action Link Button if configured */}
                  {msg.linkTab && (
                    <div className="pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkOneRead(msg.id);
                          onNavigate(msg.linkTab as NavigationTab);
                        }}
                        className="text-xs border-[#c5a869]/40 text-[#c5a869] hover:bg-[#c5a869]/15"
                      >
                        <span>Boʻlimga oʻtish</span>
                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  )}

                  {/* Existing User Reply Thread */}
                  {msg.userReply && (
                    <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-emerald-400 font-semibold">
                        <span>Sizning javobingiz</span>
                        <span className="font-mono-numbers text-stone-400">{msg.userRepliedAt}</span>
                      </div>
                      <p className="text-stone-200">{msg.userReply}</p>
                    </div>
                  )}

                  {/* Quick Reply Form to Mosque Admin */}
                  <div className="pt-2 border-t border-stone-200 dark:border-emerald-950/40">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={replyInputs[msg.id] || ''}
                        onChange={(e) =>
                          setReplyInputs((prev) => ({ ...prev, [msg.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSendReply(msg.id);
                        }}
                        placeholder="Maʼmuriyatga javob yoki savol yozing..."
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-stone-100 dark:bg-stone-900/60 border border-stone-200 dark:border-emerald-950 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:border-[#c5a869]"
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleSendReply(msg.id)}
                        disabled={submittingReplyId === msg.id || !replyInputs[msg.id]?.trim()}
                        className="text-xs shrink-0"
                      >
                        <Send className="w-3 h-3 mr-1" />
                        <span>Yuborish</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
