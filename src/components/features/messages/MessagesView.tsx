import React, { useState, useEffect } from 'react';
import { NavigationTab, InboxMessageItem } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { PageHero } from '../../ui/PageHero';
import { IslamicStarEmblem } from '../../ui/GeometricPattern';
import { MorphingTabs, StaggerGrid, StaggerCard } from '../../ui/MotionPrimitives';
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
  Share2,
  Check,
  Search,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface MessagesViewProps {
  onNavigate: (tab: NavigationTab) => void;
}

export const MessagesView: React.FC<MessagesViewProps> = ({ onNavigate }) => {
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
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).catch(() => {});
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
        return { label: 'Namoz vaqtlari', color: 'text-[#064E3B] dark:text-[#34D399]' };
      case 'announcement':
        return { label: 'Muhim eʼlon', color: 'text-[#8B6B2E] dark:text-[#C8A85E]' };
      case 'quiz':
        return { label: 'Kunlik viktorina', color: 'text-amber-600 dark:text-amber-400' };
      case 'content':
        return { label: 'Yangi nashr', color: 'text-sky-600 dark:text-sky-400' };
      case 'direct':
        return { label: 'Shaxsiy javob', color: 'text-purple-600 dark:text-purple-400' };
      default:
        return { label: 'Umumiy', color: 'text-[#587068] dark:text-[#9CAFA7]' };
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      <PageHero
        variant="sanctuary"
        kicker="@Asaka_Ziyo · Asaka Markaziy Jome Masjidi"
        title="ASAKA ZIYO Rasmiy Kanali"
        subtitle="Jome masjidi eʼlonlari, muftiyot qarorlari, tasdiqlangan namoz vaqtlari va maʼrifiy suhbatlar toʻgʻridan-toʻgʻri kanali."
        actions={
          unreadCount > 0 ? (
            <Button variant="primary" size="sm" onClick={handleMarkAllRead}>
              <CheckCheck className="w-4 h-4 mr-1.5" />
              <span>Barchasini oʻqilgan qilish ({unreadCount})</span>
            </Button>
          ) : undefined
        }
      />

      {actionNotice && (
        <div className="p-4 rounded-2xl bg-emerald-500/12 border border-emerald-500/30 text-[#064E3B] dark:text-[#34D399] text-sm font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Search & Categories Bar */}
      <div className="space-y-3">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-[#587068] dark:text-[#9CAFA7] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Xabarlardan qidirish..."
            className="w-full pl-10 pr-4 py-2.5 min-h-[44px] text-sm rounded-2xl az-liquid-glass-pill text-[#091813] dark:text-[#F7F4EC] placeholder:text-[#6B827A] dark:placeholder:text-[#7E968D] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </div>

        <MorphingTabs
          items={[
            { id: 'all', label: 'Barchasi', count: messages.length },
            { id: 'unread', label: 'Oʻqilmagan', count: unreadCount },
            { id: 'announcement', label: 'Eʼlonlar' },
            { id: 'prayer', label: 'Namoz vaqti' },
            { id: 'quiz', label: 'Viktorina' },
            { id: 'content', label: 'Maqola va darslar' },
          ]}
          activeId={selectedCategory}
          onChange={setSelectedCategory}
          layoutId="messages-category-tabs"
        />
      </div>

      {/* Messages Feed */}
      {filteredMessages.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] mx-auto flex items-center justify-center text-[#587068] dark:text-[#9CAFA7]">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h3 className="text-base font-display font-bold text-[#091813] dark:text-[#F7F4EC]">
            Ushbu toifada xabar topilmadi
          </h3>
          <p className="text-sm text-[#587068] dark:text-[#9CAFA7] max-w-sm mx-auto">
            Maʼmuriyat yangi xabar joylaganda ushbu boʻlimda aks etadi.
          </p>
        </Card>
      ) : (
        <StaggerGrid className="space-y-4">
          {filteredMessages.map((msg) => {
            const meta = getCategoryMeta(msg.category);
            return (
              <StaggerCard key={msg.id}>
                <Card
                  elevated={!msg.read}
                  onClick={() => handleMarkOneRead(msg.id)}
                  className={`p-5 sm:p-6 transition-all cursor-pointer ${
                    !msg.read ? 'border-[#C8A85E]/50 ring-1 ring-[#C8A85E]/20' : ''
                  }`}
                >
                  <div className="space-y-4">
                    {/* Sender Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#C8A85E]/15 border border-[#C8A85E]/35 flex items-center justify-center shrink-0">
                          <IslamicStarEmblem size={18} className="text-[#C8A85E]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-[#091813] dark:text-[#F7F4EC]">
                              {msg.senderName}
                            </span>
                            <ShieldCheck className="w-4 h-4 text-[#C8A85E]" />
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[#587068] dark:text-[#9CAFA7]">
                            <span className={`font-semibold ${meta.color}`}>{meta.label}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono-numbers">{msg.createdAt}</span>
                            {!msg.read && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-[#8B6B2E] dark:text-[#C8A85E] font-bold">Yangi</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleShare(msg, e)}
                          className="w-9 h-9 rounded-xl az-liquid-glass-pill flex items-center justify-center text-[#587068] dark:text-[#9CAFA7] hover:text-[#C8A85E] cursor-pointer"
                          title="Ulashish"
                          aria-label="Ulashish"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Share2 className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(msg.id, e)}
                          className="w-9 h-9 rounded-xl az-liquid-glass-pill flex items-center justify-center text-[#587068] dark:text-[#9CAFA7] hover:text-rose-500 cursor-pointer"
                          title="Oʻchirish"
                          aria-label="Oʻchirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Message Title & Body */}
                    <div className="space-y-2">
                      <h3 className="text-base sm:text-lg font-display font-bold text-[#091813] dark:text-[#F7F4EC] leading-snug">
                        {msg.title}
                      </h3>
                      <p className="text-sm text-[#3B554D] dark:text-[#A4B9B1] leading-relaxed whitespace-pre-line">
                        {msg.body}
                      </p>
                    </div>

                    {msg.imageUrl && (
                      <div className="rounded-2xl overflow-hidden border border-black/[0.08] dark:border-white/[0.08] max-h-72">
                        <img
                          src={msg.imageUrl}
                          alt={msg.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}

                    {msg.linkTab && (
                      <div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkOneRead(msg.id);
                            onNavigate(msg.linkTab as NavigationTab);
                          }}
                        >
                          <span>Boʻlimga oʻtish</span>
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    )}

                    {msg.userReply && (
                      <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-xs space-y-1">
                        <div className="flex items-center justify-between text-[#064E3B] dark:text-[#34D399] font-semibold">
                          <span>Sizning javobingiz</span>
                          <span className="font-mono-numbers text-[#587068] dark:text-[#9CAFA7]">
                            {msg.userRepliedAt}
                          </span>
                        </div>
                        <p className="text-[#091813] dark:text-[#F7F4EC]">{msg.userReply}</p>
                      </div>
                    )}

                    {/* Quick Reply Form */}
                    <div
                      className="pt-3 border-t border-black/[0.06] dark:border-white/[0.08]"
                      onClick={(e) => e.stopPropagation()}
                    >
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
                          className="flex-1 px-3.5 py-2 min-h-[42px] text-sm rounded-xl az-liquid-glass-pill text-[#091813] dark:text-[#F7F4EC] placeholder:text-[#6B827A] dark:placeholder:text-[#7E968D] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        />
                        <Button
                          variant="emerald"
                          size="sm"
                          onClick={() => handleSendReply(msg.id)}
                          disabled={submittingReplyId === msg.id || !replyInputs[msg.id]?.trim()}
                        >
                          <Send className="w-3.5 h-3.5 mr-1.5" />
                          <span>Yuborish</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </StaggerCard>
            );
          })}
        </StaggerGrid>
      )}
    </div>
  );
};
