import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { NavigationTab, SupportedLocale } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { PageHero } from '../../ui/PageHero';
import {
  MorphingTabs,
  StaggerGrid,
  StaggerCard,
  InteractiveCounter,
  MagneticWrapper,
} from '../../ui/MotionPrimitives';
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
  Clock,
  Check,
  Radio,
} from 'lucide-react';

interface NotificationsViewProps {
  onNavigate: (tab: NavigationTab) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onNavigate }) => {
  const { i18n } = useTranslation(['common']);
  const _currentLocale = (i18n.language as SupportedLocale) || 'uz-Latn';
  void _currentLocale;

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
  const dailyCount = notifications.filter((n) => n.category === 'prayer' || n.category === 'system').length;
  const announcementCount = notifications.filter(
    (n) => n.category === 'announcement' || n.category === 'news'
  ).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'daily') return n.category === 'prayer' || n.category === 'system';
    if (filter === 'announcements') return n.category === 'announcement' || n.category === 'news';
    return true;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'prayer':
        return <Clock className="w-4 h-4 text-[#064E3B] dark:text-[#10B981]" />;
      case 'announcement':
        return <Radio className="w-4 h-4 text-[#9E7F3C] dark:text-[#C8A85E]" />;
      case 'news':
        return <BookOpen className="w-4 h-4 text-sky-600 dark:text-sky-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-[#9E7F3C] dark:text-[#C8A85E]" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'prayer':
        return 'Namoz / Kunlik';
      case 'announcement':
        return 'Muhim Eʼlon';
      case 'news':
        return 'Ilmiy Maqola';
      default:
        return 'Tizim';
    }
  };

  const filterTabs = [
    { id: 'all', label: 'Barchasi', count: notifications.length },
    { id: 'unread', label: 'Oʻqilmagan', count: unreadCount },
    { id: 'daily', label: 'Kunlik Diniy', count: dailyCount },
    { id: 'announcements', label: 'Eʼlon va Maqola', count: announcementCount },
  ];

  return (
    <div className="space-y-6 pb-16 max-w-4xl mx-auto">
      <PageHero
        variant="sanctuary"
        kicker={
          unreadCount > 0
            ? `ASAKA ZIYO Bildirishnomalar Markazi · ${unreadCount} ta yangi`
            : 'ASAKA ZIYO Bildirishnomalar Markazi'
        }
        title="Xabarnomalar va Kunlik Yangiliklar"
        subtitle="Asaka jome masjidi eʼlonlari, tasdiqlangan namoz vaqtlari oʻzgarishi, har kunlik oyat, hadis va zikrlar bildirishnomalari."
        actions={
          unreadCount > 0 ? (
            <MagneticWrapper strength={4}>
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllRead}
                className="min-h-[44px] border-[#C8A85E]/45 text-[#F7F4EC] hover:bg-[#C8A85E]/15"
              >
                <CheckCheck className="w-4 h-4 mr-1.5 text-[#C8A85E]" />
                <span>Barchasini oʻqilgan qilish</span>
              </Button>
            </MagneticWrapper>
          ) : undefined
        }
        aside={
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/[0.06] border border-white/[0.12] backdrop-blur-md p-4">
              <div className="text-[11px] uppercase tracking-wider text-[#9CAFA7]">Jami xabar</div>
              <div className="text-2xl font-display font-extrabold text-[#F7F4EC] mt-1">
                <InteractiveCounter value={notifications.length} />
              </div>
            </div>
            <div className="rounded-2xl bg-white/[0.06] border border-[#C8A85E]/30 backdrop-blur-md p-4">
              <div className="text-[11px] uppercase tracking-wider text-[#C8A85E]">Oʻqilmagan</div>
              <div className="text-2xl font-display font-extrabold text-[#C8A85E] mt-1">
                <InteractiveCounter value={unreadCount} />
              </div>
            </div>
          </div>
        }
      />

      {/* Web Push Permission Card */}
      {pushStatus !== 'granted' && (
        <Card elevated className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#064E3B] dark:bg-[#C8A85E]/15 border border-[#C8A85E]/30 flex items-center justify-center shrink-0">
              <BellRing className="w-5 h-5 text-[#E5C97B] dark:text-[#C8A85E]" />
            </div>
            <div className="space-y-0.5">
              <div className="text-sm font-semibold text-[#091813] dark:text-[#F7F4EC]">
                Brauzer va Smartfon Push Bildirishnomalari
              </div>
              <p className="text-[#3B554D] dark:text-[#A4B9B1] text-xs leading-relaxed">
                Ertalabki Kun Oyati, kunduzgi Kun Hadisi va kechki Kun Zikrini oʻz vaqtida qabul qilish uchun push ruxsatini yoqing.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleRequestPush}
            disabled={isRequestingPush}
            className="text-xs shrink-0 self-end sm:self-center min-h-[44px]"
          >
            <BellRing className="w-3.5 h-3.5 mr-1.5" />
            <span>Push-ni Yoqish</span>
          </Button>
        </Card>
      )}

      {/* Action feedback toast */}
      {actionNotice && (
        <div
          role="status"
          className="p-3.5 rounded-2xl bg-emerald-500/12 border border-emerald-500/35 text-[#064E3B] dark:text-emerald-200 text-xs font-medium flex items-center gap-2.5"
        >
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* FLIP Morphing Filter Bar */}
      <div className="overflow-x-auto pb-1 no-scrollbar">
        <MorphingTabs
          items={filterTabs}
          activeId={filter}
          onChange={(id) => setFilter(id as 'all' | 'unread' | 'daily' | 'announcements')}
          layoutId="az-notifications-filter"
        />
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <Card className="p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl az-liquid-glass-pill mx-auto flex items-center justify-center text-[#587068] dark:text-[#9CAFA7]">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-[#091813] dark:text-[#F7F4EC]">
            Hech qanday bildirishnoma mavjud emas
          </h3>
          <p className="text-xs text-[#587068] dark:text-[#9CAFA7] max-w-sm mx-auto leading-relaxed">
            Hozircha tanlangan toifadagi xabarnomalar yoʻq. Yangi eʼlon yoki maʼlumot eʼlon qilinganda bu yerda aks etadi.
          </p>
        </Card>
      ) : (
        <StaggerGrid className="space-y-3">
          {filteredNotifications.map((notif) => (
            <StaggerCard key={notif.id}>
              <Card
                elevated={!notif.read}
                interactive
                onClick={() => {
                  handleMarkOneRead(notif.id);
                  if (notif.category === 'prayer') onNavigate('prayer');
                  else if (notif.category === 'announcement' || notif.category === 'news') {
                    onNavigate('articles');
                  }
                }}
                className={`p-4 sm:p-5 cursor-pointer group ${
                  !notif.read
                    ? 'ring-1 ring-[#C8A85E]/45 dark:ring-[#C8A85E]/40'
                    : 'opacity-85 hover:opacity-100'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl az-liquid-glass-pill flex items-center justify-center shrink-0 mt-0.5">
                      {getCategoryIcon(notif.category)}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-[#064E3B] dark:text-[#C8A85E]">
                          {getCategoryLabel(notif.category)}
                        </span>
                        {!notif.read && (
                          <>
                            <span aria-hidden="true" className="text-[#587068]/50 dark:text-[#9CAFA7]/50">
                              ·
                            </span>
                            <span className="font-semibold text-[#9E7F3C] dark:text-[#E5C97B]">
                              Yangi
                            </span>
                          </>
                        )}
                        <span aria-hidden="true" className="text-[#587068]/50 dark:text-[#9CAFA7]/50">
                          ·
                        </span>
                        <span className="text-[#587068] dark:text-[#9CAFA7] font-mono-numbers">
                          {notif.timestamp}
                        </span>
                      </div>
                      <h4 className="text-sm sm:text-[15px] font-bold text-[#091813] dark:text-[#F7F4EC] group-hover:text-[#064E3B] dark:group-hover:text-[#C8A85E] transition-colors">
                        {notif.title}
                      </h4>
                      <p className="text-xs sm:text-sm text-[#3B554D] dark:text-[#A4B9B1] leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDelete(notif.id, e)}
                    className="w-10 h-10 rounded-xl text-[#587068] dark:text-[#9CAFA7] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                    title="Oʻchirish"
                    aria-label="Bildirishnomani oʻchirish"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            </StaggerCard>
          ))}
        </StaggerGrid>
      )}
    </div>
  );
};
