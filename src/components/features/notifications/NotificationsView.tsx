import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { NavigationTab, SupportedLocale } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { GeometricPattern, IslamicMihrabArch, CalligraphyBasmalahBadge } from '../../ui/GeometricPattern';
import {
  getStoredBroadcastNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  deleteNotification,
  subscribeToDatabase,
} from '../../../utils/databaseService';
import {
  requestPushPermission,
  AppNotification,
} from '../../../utils/notificationService';
import {
  Bell,
  BellRing,
  CheckCheck,
  Trash2,
  BookOpen,
  Sparkles,
  Calendar,
  Clock,
  ExternalLink,
  ShieldCheck,
  Check,
  Info,
  Radio,
} from 'lucide-react';

interface NotificationsViewProps {
  onNavigate: (tab: NavigationTab) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onNavigate }) => {
  const { t, i18n } = useTranslation(['common']);
  const currentLocale = (i18n.language as SupportedLocale) || 'uz-Latn';

  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    getStoredBroadcastNotifications()
  );
  const [filter, setFilter] = useState<'all' | 'unread' | 'daily' | 'announcements'>('all');
  const [pushStatus, setPushStatus] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });
  const [isRequestingPush, setIsRequestingPush] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Synchronize with database service across tabs & broadcasts
  useEffect(() => {
    const unsubscribe = subscribeToDatabase((event) => {
      if (event.type === 'NOTIFICATIONS_UPDATED') {
        setNotifications(getStoredBroadcastNotifications());
      }
    });
    return unsubscribe;
  }, []);

  const handleRequestPush = async () => {
    setIsRequestingPush(true);
    const granted = await requestPushPermission();
    setIsRequestingPush(false);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushStatus(Notification.permission);
    }
    if (granted) {
      setActionNotice('Web Push bildirishnomalari muvaffaqiyatli yoqildi!');
    } else {
      setActionNotice('Bildirishnoma ruxsati berilmadi. Ilova ichidagi xabarlar koʻrinishda davom etadi.');
    }
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleMarkAllRead = () => {
    const updated = markAllNotificationsRead();
    setNotifications(updated);
    setActionNotice('Barcha bildirishnomalar oʻqilgan deb belgilandi.');
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleMarkOneRead = (id: string) => {
    const updated = markNotificationRead(id);
    setNotifications(updated);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteNotification(id);
    setNotifications(updated);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'daily') return n.category === 'prayer' || n.category === 'system';
    if (filter === 'announcements') return n.category === 'announcement' || n.category === 'news';
    return true;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'prayer':
        return <Clock className="w-4 h-4 text-emerald-400" />;
      case 'announcement':
        return <Radio className="w-4 h-4 text-[#C6A45C]" />;
      case 'news':
        return <BookOpen className="w-4 h-4 text-blue-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-amber-400" />;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'prayer':
        return { label: 'Namoz / Kunlik', bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
      case 'announcement':
        return { label: 'Muhim Eʼlon', bg: 'bg-[#C6A45C]/15 text-[#C6A45C] border-[#C6A45C]/30' };
      case 'news':
        return { label: 'Ilmiy Maqola', bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30' };
      default:
        return { label: 'Tizim', bg: 'bg-stone-500/15 text-stone-300 border-stone-500/30' };
    }
  };

  return (
    <div className="space-y-6 pb-16 max-w-4xl mx-auto">
      {/* 2026 Luxury Architectural Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-[#C6A45C]/35 bg-gradient-to-br from-[#063D32] via-[#042B25] to-[#031814] p-6 sm:p-8 text-white shadow-2xl">
        <GeometricPattern opacity={0.07} />
        <IslamicMihrabArch opacity={0.14} className="right-6 max-w-[240px] ml-auto hidden md:block" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <CalligraphyBasmalahBadge />
              <div className="flex items-center gap-2 text-xs font-bold text-[#C6A45C] tracking-wider uppercase">
                <Bell className="w-4 h-4" />
                <span>ASAKA ZIYO Bildirishnomalar Markazi</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                    {unreadCount} ta yangi
                  </span>
                )}
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-[#F8F5EC] tracking-wide">
              Xabarnomalar va Kunlik Yangiliklar
            </h1>
            <p className="text-xs sm:text-sm text-[#DCC58C]/90 max-w-xl leading-relaxed">
              Asaka jome masjidi eʼlonlari, tasdiqlangan namoz vaqtlari oʻzgarishi, har kunlik oyat, hadis va zikrlar bildirishnomalari.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllRead}
                className="text-xs border-[#C6A45C]/45 text-[#C6A45C] hover:bg-[#C6A45C]/15"
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
                <span>Barchasini oʻqilgan qilish</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Web Push Permission Card */}
      {pushStatus !== 'granted' && (
        <Card elevated className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#064e3b] dark:bg-[#c5a869]/15 border border-[#9e7f3c]/30 dark:border-[#c5a869]/35 flex items-center justify-center shrink-0">
              <BellRing className="w-5 h-5 text-[#d4af37] dark:text-[#c5a869]" />
            </div>
            <div className="text-xs space-y-0.5">
              <div className="font-semibold text-[#14221B] dark:text-[#F4F1EA]">
                Brauzer va Smartfon Push Bildirishnomalari
              </div>
              <p className="text-[#4A5B52] dark:text-[#8FA199] text-xs leading-relaxed">
                Ertalabki Kun Oyati, kunduzgi Kun Hadisi va kechki Kun Zikrini oʻz vaqtida qabul qilish uchun push ruxsatini yoqing.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleRequestPush}
            disabled={isRequestingPush}
            className="text-xs shrink-0 self-end sm:self-center"
          >
            <BellRing className="w-3.5 h-3.5 mr-1.5" />
            <span>Push-ni Yoqish</span>
          </Button>
        </Card>
      )}

      {/* Action feedback toast */}
      {actionNotice && (
        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-emerald-950/80 pb-3">
        <div className="flex items-center gap-1.5">
          {[
            { id: 'all', label: 'Barchasi', count: notifications.length },
            { id: 'unread', label: 'Oʻqilmagan', count: unreadCount },
            { id: 'daily', label: 'Kunlik Diniy', count: notifications.filter((n) => n.category === 'prayer' || n.category === 'system').length },
            { id: 'announcements', label: 'Eʼlon va Maqola', count: notifications.filter((n) => n.category === 'announcement' || n.category === 'news').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                filter === tab.id
                  ? 'bg-[#c5a869] text-[#071614] shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-white/5'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  filter === tab.id ? 'bg-[#071614] text-[#c5a869]' : 'bg-stone-200 dark:bg-white/10 text-stone-700 dark:text-stone-300'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <Card className="p-10 text-center space-y-3 bg-stone-50/50 dark:bg-[#071614]/40">
            <div className="w-12 h-12 rounded-full bg-stone-200 dark:bg-emerald-950/40 mx-auto flex items-center justify-center text-stone-400">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200">
              Hech qanday bildirishnoma mavjud emas
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Hozircha tanlangan toifadagi xabarnomalar yoʻq. Yangi eʼlon yoki maʼlumot eʼlon qilinganda bu yerda aks etadi.
            </p>
          </Card>
        ) : (
          filteredNotifications.map((notif) => {
            const badge = getCategoryBadge(notif.category);
            return (
              <Card
                key={notif.id}
                elevated={!notif.read}
                onClick={() => {
                  handleMarkOneRead(notif.id);
                  if (notif.category === 'prayer') onNavigate('prayer');
                  else if (notif.category === 'announcement' || notif.category === 'news') onNavigate('articles');
                }}
                className={`p-4 sm:p-5 transition-all cursor-pointer relative overflow-hidden group ${
                  !notif.read
                    ? 'border-[#c5a869]/60 bg-gradient-to-r from-[#c5a869]/10 via-transparent to-transparent'
                    : 'opacity-85 hover:opacity-100'
                }`}
              >
                {!notif.read && (
                  <span className="absolute top-0 left-0 bottom-0 w-1 bg-[#c5a869]" />
                )}

                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-stone-100 dark:bg-emerald-950/60 border border-stone-200 dark:border-emerald-800/40 shrink-0 mt-0.5">
                      {getCategoryIcon(notif.category)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-[#064e3b] dark:text-[#c5a869]">
                          {badge.label}
                        </span>
                        {!notif.read && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-amber-700 dark:text-[#e6ce8a]">Yangi</span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span className="text-[#6C7C73] dark:text-[#8FA199] font-mono-numbers">
                          {notif.timestamp}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 group-hover:text-[#c5a869] transition-colors">
                        {notif.title}
                      </h4>
                      <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                    <button
                      onClick={(e) => handleDelete(notif.id, e)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                      title="Oʻchirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
