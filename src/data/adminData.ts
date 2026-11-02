import { AdminRoleConfig, AuditLogEntry, UserRole } from '../types';

export const ADMIN_ROLES_CONFIG: AdminRoleConfig[] = [
  {
    role: 'SUPER_ADMIN',
    labelUz: 'Bosh Maʼmur (Super Admin)',
    descriptionUz: 'Tizimning barcha modullari, xavfsizlik, foydalanuvchilar va maʼlumotlar bazasi ustidan toʻliq nazorat.',
    permissions: ['all_access', 'manage_users', 'assign_roles', 'publish_prayer_schedule', 'manage_content', 'broadcast_notifications', 'view_audit_logs'],
  },
  {
    role: 'PRAYER_ADMIN',
    labelUz: 'Namoz Vaqtlari Masʼuli',
    descriptionUz: 'Asaka shahri namoz vaqtlari taqvimi, OʻMI tasdiqlari va iqomat vaqtlarini kiritish va tasdiqlash huquqi.',
    permissions: ['edit_prayer_schedule', 'publish_prayer_schedule', 'preview_prayer_times'],
  },
  {
    role: 'CONTENT_ADMIN',
    labelUz: 'Kontent Boshqaruvchisi',
    descriptionUz: 'Maqolalar, hadis sharhlari, eʼlonlar va diniy yangiliklarni nashr etish va boshqarish.',
    permissions: ['create_article', 'edit_article', 'publish_article', 'manage_announcements', 'manage_hadiths'],
  },
  {
    role: 'EDITOR',
    labelUz: 'Muharrir (Editor)',
    descriptionUz: 'Kiritilgan matnlarni tahrirlash, imlo va uslubiy tuzatishlar kiritish (qoralama holatida).',
    permissions: ['edit_drafts', 'suggest_edits', 'review_content'],
  },
  {
    role: 'NOTIFICATION_ADMIN',
    labelUz: 'Xabarnomalar Boshqaruvchisi',
    descriptionUz: 'Telegram bot tarqatmalari, mobil push bildirishnomalari va favqulodda eʼlonlar yuborish.',
    permissions: ['broadcast_notifications', 'send_telegram_alerts', 'schedule_announcements'],
  },
  {
    role: 'VIEWER',
    labelUz: 'Kuzatuvchi (Auditor)',
    descriptionUz: 'Barcha maʼlumotlar, jurnallar va tahlillarni faqat koʻrish huquqi (oʻzgartirishsiz).',
    permissions: ['view_dashboard', 'view_reports', 'view_audit_logs'],
  },
];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'log-1',
    timestamp: '2026-11-02 08:30:14',
    user: 'Olimov M. (SuperAdmin)',
    role: 'SUPER_ADMIN',
    action: 'DRAFT_PRAYER_SCHEDULE_SAVED',
    resource: 'Namoz vaqtlari: Asaka (Noyabr 2026)',
    status: 'SUCCESS',
    detailsUz: 'Noyabr oyi uchun qoralama namoz vaqtlari kiritildi. Tasdiq kutilmoqda.',
  },
  {
    id: 'log-2',
    timestamp: '2026-11-02 07:15:22',
    user: 'Qosimov M. (ContentAdmin)',
    role: 'CONTENT_ADMIN',
    action: 'ARTICLE_PUBLISHED',
    resource: 'Maqola: Qurʼon qiroati va tadabbur odoblari',
    status: 'SUCCESS',
    detailsUz: 'Axloq ruknidagi yangi ilmiy maqola nashr qilindi.',
  },
  {
    id: 'log-3',
    timestamp: '2026-11-01 19:40:02',
    user: 'Tizim Xavfsizlik Xizmati',
    role: 'SUPER_ADMIN',
    action: 'ROLE_POLICY_EVALUATED',
    resource: 'RBAC Avtorizatsiya Qoidalari',
    status: 'SECURITY',
    detailsUz: 'Serverga ulanish oldidan rol huquqlari tekshiruvi amalga oshirildi.',
  },
  {
    id: 'log-4',
    timestamp: '2026-11-01 14:10:00',
    user: 'Xoliqov S. (NotificationAdmin)',
    role: 'NOTIFICATION_ADMIN',
    action: 'TELEGRAM_BROADCAST_QUEUED',
    resource: 'Telegram Bot Kanal (@asaka_ziyo_bot)',
    status: 'INFO' as any,
    detailsUz: 'Juma maʼruzasi eʼloni tarqatish navbatiga qoʻyildi.',
  },
];
