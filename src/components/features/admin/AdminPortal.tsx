import React, { useState } from 'react';
import {
  AdminRoleConfig,
  AuditLogEntry,
  NavigationTab,
  PrayerSchedule,
  PrayerTimeEntry,
  UserRole,
} from '../../../types';
import { ADMIN_ROLES_CONFIG, INITIAL_AUDIT_LOGS } from '../../../data/adminData';
import { EDITORIAL_ARTICLES } from '../../../data/articlesData';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { GeometricPattern } from '../../ui/GeometricPattern';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Clock,
  FileText,
  Users,
  Send,
  Bell,
  Sliders,
  History,
  AlertTriangle,
  CheckCircle,
  Radio,
  Lock,
  ArrowLeft,
  ExternalLink,
  Plus,
  RefreshCw,
} from 'lucide-react';

interface AdminPortalProps {
  currentSchedule: PrayerSchedule;
  onUpdateSchedule: (newSchedule: PrayerSchedule) => void;
  onExitAdmin: () => void;
}

type AdminTab =
  | 'dashboard'
  | 'prayer_schedule'
  | 'content'
  | 'users'
  | 'roles'
  | 'telegram'
  | 'notifications'
  | 'audit_logs'
  | 'settings';

export const AdminPortal: React.FC<AdminPortalProps> = ({
  currentSchedule,
  onUpdateSchedule,
  onExitAdmin,
}) => {
  const [activeRole, setActiveRole] = useState<UserRole>('SUPER_ADMIN');
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);

  // Prayer times editing state
  const [editableTimes, setEditableTimes] = useState<PrayerTimeEntry[]>(
    currentSchedule.times
  );
  const [isPublished, setIsPublished] = useState<boolean>(
    currentSchedule.isAdministratorPublished
  );
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Telegram broadcast preview state
  const [telegramMessage, setTelegramMessage] = useState(
    'Asaka Jome Masjidi: Bugungi Peshin namozi vaqti 12:05 da kirdi. Jamoat iqomati: 12:25.'
  );
  const [telegramStatus, setTelegramStatus] = useState<string | null>(null);

  const activeRoleConfig =
    ADMIN_ROLES_CONFIG.find((r) => r.role === activeRole) || ADMIN_ROLES_CONFIG[0];

  const handleTimeChange = (
    key: 'bomdod' | 'quyosh' | 'peshin' | 'asr' | 'shom' | 'xufton',
    field: 'time' | 'iqamahTime',
    val: string
  ) => {
    setEditableTimes((prev) =>
      prev.map((item) => (item.key === key ? { ...item, [field]: val } : item))
    );
  };

  const handleSaveSchedule = () => {
    const updated: PrayerSchedule = {
      ...currentSchedule,
      times: editableTimes,
      isAdministratorPublished: isPublished,
      verifiedAt: isPublished ? new Date().toISOString() : undefined,
      publishedBy: isPublished
        ? `Tasdiqlandi: ${activeRoleConfig.labelUz}`
        : 'Asaka Jome Masjidi Maʼmuriyati (Qoralama)',
      disclaimer: isPublished
        ? 'Ushbu namoz vaqtlari Asaka jome masjidi maʼmuriyati tomonidan rasman tasdiqlangan va joriy etilgan jadvaldir.'
        : 'DIQQAT: Ushbu jadval Phase 1 bosqichidagi koʻrgazmali namuna (preview) hisoblanadi. Namoz vaqtlari Oʻzbekiston musulmonlari idorasi va Asaka masjidi masʼul maʼmurlari tomonidan tasdiqlanib kiritiladi.',
    };

    onUpdateSchedule(updated);

    // Record audit log
    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      user: `Admin (${activeRole})`,
      role: activeRole,
      action: isPublished ? 'PRAYER_SCHEDULE_PUBLISHED' : 'PRAYER_SCHEDULE_DRAFT_UPDATED',
      resource: 'Asaka Namoz Jadvali',
      status: 'SUCCESS',
      detailsUz: isPublished
        ? 'Jadval rasmiy tasdiqlangan maqomida eʼlon qilindi.'
        : 'Jadval qoralama shaklida saqlandi.',
    };
    setAuditLogs([newLog, ...auditLogs]);

    setSaveSuccessMsg(
      isPublished
        ? 'Namoz vaqtlari rasmiy tasdiqlangan maqomida saqlandi!'
        : 'Qoralama jadval yangilandi.'
    );
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleSendTelegramSimulation = () => {
    setTelegramStatus('Telegram API ga yuborish soʻrovi shakllantirildi...');
    setTimeout(() => {
      setTelegramStatus(
        'Simulyatsiya: @asaka_ziyo_bot kanaliga xabarnoma tayyorlandi (Server integratsiyasi kutilmoqda).'
      );
    }, 1000);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Header Banner & Safety Architecture Disclaimer */}
      <div className="relative rounded-2xl overflow-hidden border border-[#c5a869]/40 bg-gradient-to-r from-[#031d17] via-[#091a18] to-[#071614] text-white p-6 sm:p-8">
        <GeometricPattern opacity={0.05} />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#c5a869] uppercase tracking-wider">
              <Shield className="w-3.5 h-3.5" />
              <span>Maʼmuriyat Boshqaruv Markazi</span>
              <span aria-hidden="true">·</span>
              <span>Asaka Ziyo Admin Console</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-white">
              Boshqaruv Konsoli & Arxitektura
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 max-w-2xl leading-relaxed">
              Asaka shahri namoz taqvimi, ilmiy kontent, xodimlar huquqlari va jamoat eʼlonlarini markazlashgan boshqarish paneli.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onExitAdmin}
              className="bg-black/30 border-stone-600 text-stone-200 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              <span>Ilovaga qaytish</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Mandatory Backend & Security Disclaimer per §8 & §10 */}
      <div className="p-4 sm:p-5 rounded-2xl border border-sky-500/40 bg-sky-500/10 text-sky-900 dark:text-sky-200 text-xs sm:text-sm space-y-2">
        <div className="flex items-center gap-2 font-semibold text-sky-800 dark:text-sky-300">
          <Lock className="w-4 h-4 shrink-0" />
          <span>Xavfsizlik va Maʼlumotlar Bazasi Integratsiyasi Haqida Ogohlantirish</span>
        </div>
        <p className="text-stone-700 dark:text-sky-100/90 leading-relaxed text-xs">
          Ushbu bosqichda (Phase 1) maʼmuriyat konsolining barcha interfeysi va rol boshqaruvi meʼmoriy jihatdan toʻliq tayyorlangan. Backend tizimi (Supabase Auth, PostgreSQL, Realtime) ulanmaguncha frontenddagi oʻzgarishlar sessiya darajasida saqlanadi. Haqiqiy xavfsiz avtorizatsiya va huquqlar tekshiruvi server tarafida (Row Level Security & Edge Functions) amalga oshiriladi.
        </p>
      </div>

      {/* 3. Role Switcher (Previewing Planned Roles) */}
      <Card elevated className="p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-emerald-950/60 pb-3">
          <div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              Faol Maʼmuriy Rolni Tanlash (Preview Simulyatsiyasi)
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Har bir rol oʻziga tegishli huquq va ruxsatnomalar doirasida interfeysni koʻradi.
            </p>
          </div>
          <span className="text-xs font-mono-numbers text-[#c5a869] font-semibold bg-[#c5a869]/10 px-2.5 py-1 rounded-md border border-[#c5a869]/30">
            Rol: {activeRoleConfig.role}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {ADMIN_ROLES_CONFIG.map((rc) => {
            const isSelected = activeRole === rc.role;
            return (
              <button
                key={rc.role}
                onClick={() => setActiveRole(rc.role)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#c5a869] bg-[#c5a869] text-[#071614] font-bold shadow-sm'
                    : 'border-stone-200 dark:border-emerald-950 bg-stone-50 dark:bg-[#071614] text-stone-700 dark:text-stone-300 hover:border-[#c5a869]/40'
                }`}
              >
                {rc.labelUz}
              </button>
            );
          })}
        </div>
      </Card>

      {/* 4. Admin Layout: Navigation Tabs + Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Tab Menu (3 cols) */}
        <div className="lg:col-span-3 space-y-1">
          {[
            { id: 'dashboard', label: 'Boshqaruv paneli', icon: <Sliders className="w-4 h-4" /> },
            { id: 'prayer_schedule', label: 'Namoz vaqtlari boshqaruvi', icon: <Clock className="w-4 h-4" /> },
            { id: 'content', label: 'Kontent boshqaruvi', icon: <FileText className="w-4 h-4" /> },
            { id: 'users', label: 'Foydalanuvchilar va imomlar', icon: <Users className="w-4 h-4" /> },
            { id: 'roles', label: 'Rollar va huquqlar matritsasi', icon: <ShieldCheck className="w-4 h-4" /> },
            { id: 'telegram', label: 'Telegram integratsiyasi', icon: <Send className="w-4 h-4" /> },
            { id: 'notifications', label: 'Xabarnomalar navbati', icon: <Bell className="w-4 h-4" /> },
            { id: 'audit_logs', label: 'Xavfsizlik va audit jurnali', icon: <History className="w-4 h-4" /> },
          ].map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#c5a869] text-[#071614] font-semibold shadow-sm'
                    : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Tab Contents (9 cols) */}
        <div className="lg:col-span-9 space-y-6">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stat Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card elevated className="p-5 space-y-1">
                  <div className="text-xs text-stone-500 dark:text-stone-400">
                    Namoz Jadvali Holati
                  </div>
                  <div className="text-lg font-bold font-mono-numbers text-stone-900 dark:text-stone-100">
                    {currentSchedule.isAdministratorPublished ? (
                      <span className="text-emerald-500 flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4" /> Tasdiqlangan
                      </span>
                    ) : (
                      <span className="text-amber-500 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" /> Qoralama (Preview)
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-stone-400 pt-1">
                    Hudud: Asaka shahri, Andijon
                  </div>
                </Card>

                <Card elevated className="p-5 space-y-1">
                  <div className="text-xs text-stone-500 dark:text-stone-400">
                    Faol Maqolalar
                  </div>
                  <div className="text-2xl font-bold font-mono-numbers text-stone-900 dark:text-stone-100">
                    {EDITORIAL_ARTICLES.length} ta
                  </div>
                  <div className="text-[11px] text-stone-400 pt-1">
                    Nashr navbatida: 2 ta qoralama
                  </div>
                </Card>

                <Card elevated className="p-5 space-y-1">
                  <div className="text-xs text-stone-500 dark:text-stone-400">
                    Audit Yozuvlari
                  </div>
                  <div className="text-2xl font-bold font-mono-numbers text-stone-900 dark:text-stone-100">
                    {auditLogs.length} ta
                  </div>
                  <div className="text-[11px] text-stone-400 pt-1">
                    Oxirgi amal: 14 daqiqa oldin
                  </div>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card elevated className="p-6 space-y-4">
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  Tezkor Boshqaruv Harakatlari
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('prayer_schedule')}
                    className="justify-start gap-2"
                  >
                    <Clock className="w-4 h-4 text-[#c5a869]" />
                    <span>Namoz vaqtlarini tahrirlash</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('telegram')}
                    className="justify-start gap-2"
                  >
                    <Send className="w-4 h-4 text-[#c5a869]" />
                    <span>Telegram kanalga xabar yoʻllash</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('content')}
                    className="justify-start gap-2"
                  >
                    <FileText className="w-4 h-4 text-[#c5a869]" />
                    <span>Yangi maqola yoki eʼlon qoʻshish</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('audit_logs')}
                    className="justify-start gap-2"
                  >
                    <History className="w-4 h-4 text-[#c5a869]" />
                    <span>Audit jurnali va xavfsizlikni koʻrish</span>
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 2: PRAYER SCHEDULE MANAGEMENT */}
          {activeTab === 'prayer_schedule' && (
            <div className="space-y-6">
              <Card elevated className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 dark:border-emerald-950/60 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                      Asaka Shahri Namoz Vaqtlari Boshqaruvi
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Vaqtlar OʻMI meʼyorlari va Asaka jome masjidi masʼullari tomonidan kiritiladi.
                    </p>
                  </div>

                  {/* Verification Publish Toggle */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                      {isPublished ? 'Rasmiy Tasdiqlangan' : 'Qoralama (Preview)'}
                    </span>
                    <button
                      onClick={() => setIsPublished(!isPublished)}
                      className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                        isPublished ? 'bg-emerald-600' : 'bg-stone-400 dark:bg-stone-700'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                          isPublished ? 'left-7' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {saveSuccessMsg && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>{saveSuccessMsg}</span>
                  </div>
                )}

                {/* Times Input Form */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {editableTimes.map((entry) => (
                    <div
                      key={entry.key}
                      className="p-4 rounded-xl border border-stone-200 dark:border-emerald-950 bg-stone-50/50 dark:bg-[#071614]/50 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-stone-900 dark:text-stone-100">
                          {entry.nameUz}
                        </span>
                        <span className="font-arabic text-[#c5a869] text-base">{entry.nameAr}</span>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <label className="text-[11px] text-stone-400 block mb-1">
                            Kirish vaqti (hh:mm):
                          </label>
                          <input
                            type="time"
                            value={entry.time}
                            onChange={(e) => handleTimeChange(entry.key, 'time', e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#0d211e] font-mono-numbers text-sm text-stone-900 dark:text-stone-100"
                          />
                        </div>

                        {entry.key !== 'quyosh' && (
                          <div>
                            <label className="text-[11px] text-stone-400 block mb-1">
                              Jamoat iqomati (hh:mm):
                            </label>
                            <input
                              type="time"
                              value={entry.iqamahTime || ''}
                              onChange={(e) =>
                                handleTimeChange(entry.key, 'iqamahTime', e.target.value)
                              }
                              className="w-full px-3 py-1.5 rounded-lg border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#0d211e] font-mono-numbers text-sm text-stone-900 dark:text-stone-100"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100 dark:border-emerald-950/60">
                  <Button variant="primary" size="md" onClick={handleSaveSchedule}>
                    <span>Jadvalni Saqlash va Qoʻllash</span>
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 3: CONTENT MANAGEMENT */}
          {activeTab === 'content' && (
            <Card elevated className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                    Maqolalar va Diniy Matnlar Tahririyati
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Nashr etilgan va koʻrib chiqilayotgan ilmiy maqolalar roʻyxati.
                  </p>
                </div>
                <Button variant="primary" size="sm" className="gap-1.5">
                  <Plus className="w-4 h-4" />
                  <span>Yangi maqola yozish</span>
                </Button>
              </div>

              <div className="divide-y divide-stone-100 dark:divide-emerald-950/60">
                {EDITORIAL_ARTICLES.map((article) => (
                  <div key={article.id} className="py-4 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-stone-400">
                        <span className="font-semibold text-[#c5a869]">{article.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{article.author}</span>
                        <span aria-hidden="true">·</span>
                        <span>{article.publishedDate}</span>
                      </div>
                      <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                        {article.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Nashr qilingan
                      </span>
                      <Button variant="outline" size="sm">
                        Tahrirlash
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* TAB 4: USERS MANAGEMENT */}
          {activeTab === 'users' && (
            <Card elevated className="p-6 space-y-4">
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Masjid Xodimlari va Maʼmurlar Roʻyxati
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Tizimga kirish huquqiga ega boʻlgan imom-xatiblar va texnik xodimlar.
              </p>

              <div className="divide-y divide-stone-100 dark:divide-emerald-950/60 text-xs sm:text-sm">
                {[
                  { name: 'Olimov M.', role: 'SUPER_ADMIN', title: 'Tizim Bosh Arxitektori' },
                  { name: 'Qosimov M.', role: 'CONTENT_ADMIN', title: 'Bosh Muharrir, Imom noibi' },
                  { name: 'Xoliqov S.', role: 'PRAYER_ADMIN', title: 'Muazzin, Vaqt hisobchisi' },
                  { name: 'Rahmonov D.', role: 'NOTIFICATION_ADMIN', title: 'Axborot xizmati masʼuli' },
                ].map((user) => (
                  <div key={user.name} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-stone-900 dark:text-stone-100">{user.name}</div>
                      <div className="text-xs text-stone-400">{user.title}</div>
                    </div>
                    <span className="font-mono-numbers text-xs font-semibold px-2.5 py-1 rounded-md bg-[#c5a869]/10 text-[#c5a869] border border-[#c5a869]/30">
                      {user.role}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* TAB 5: ROLES AND PERMISSIONS MATRIX */}
          {activeTab === 'roles' && (
            <Card elevated className="p-6 space-y-4">
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                RBAC Rollar va Ruxsatnomalar Matritsasi
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Server darajasidagi PostgreSQL RLS (Row Level Security) qoidalari uchun moʻljallangan meʼmoriy taqsimot.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {ADMIN_ROLES_CONFIG.map((rc) => (
                  <div
                    key={rc.role}
                    className="p-4 rounded-xl border border-stone-200 dark:border-emerald-950 space-y-2 bg-stone-50/50 dark:bg-[#071614]/50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-stone-900 dark:text-stone-100">
                        {rc.labelUz}
                      </span>
                      <span className="text-[10px] font-mono-numbers text-[#c5a869] font-bold">
                        {rc.role}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400">{rc.descriptionUz}</p>
                    <div className="flex flex-wrap gap-1 pt-2">
                      {rc.permissions.map((p) => (
                        <span
                          key={p}
                          className="text-[10px] font-mono-numbers bg-stone-200/80 dark:bg-emerald-950 px-2 py-0.5 rounded text-stone-700 dark:text-stone-300"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* TAB 6: TELEGRAM INTEGRATION */}
          {activeTab === 'telegram' && (
            <Card elevated className="p-6 space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#c5a869] uppercase tracking-wider">
                  <Send className="w-3.5 h-3.5" />
                  <span>Telegram Bot Integratsiyasi</span>
                </div>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  @asaka_ziyo_bot Kanali va Guruhlar
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Har namoz vaqtidan 15 daqiqa oldin avtomatik eslatma va juma eʼlonlarini tarqatish moduli.
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block">
                  Tarqatiladigan xabar matni:
                </label>
                <textarea
                  rows={4}
                  value={telegramMessage}
                  onChange={(e) => setTelegramMessage(e.target.value)}
                  className="w-full p-3 text-xs sm:text-sm rounded-xl border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#071614] text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-[#c5a869]"
                />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-400">
                    Kanal: <strong>@asaka_ziyo_rasmiy</strong>
                  </span>
                  <Button variant="primary" size="sm" onClick={handleSendTelegramSimulation}>
                    <span>Xabarni yuborish (Simulyatsiya)</span>
                  </Button>
                </div>

                {telegramStatus && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium pt-1">
                    {telegramStatus}
                  </p>
                )}
              </div>
            </Card>
          )}

          {/* TAB 7: NOTIFICATIONS QUEUE */}
          {activeTab === 'notifications' && (
            <Card elevated className="p-6 space-y-4">
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Push Bildirishnomalari Navbati
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Web Push & FCM xabarlar rejalashtiruvchisi.
              </p>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-lg border border-stone-200 dark:border-emerald-950 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-stone-800 dark:text-stone-200">
                      Peshin namozi eslatmasi
                    </span>
                    <p className="text-stone-400">11:50 da yuborilishi rejalashtirilgan</p>
                  </div>
                  <span className="text-emerald-500 font-semibold font-mono-numbers">Kutilmoqda</span>
                </div>

                <div className="p-3 rounded-lg border border-stone-200 dark:border-emerald-950 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-stone-800 dark:text-stone-200">
                      Juma maʼruzasi eʼloni
                    </span>
                    <p className="text-stone-400">Payshanba 18:00 da yuboriladi</p>
                  </div>
                  <span className="text-stone-400 font-mono-numbers">Rejalashtirilgan</span>
                </div>
              </div>
            </Card>
          )}

          {/* TAB 8: AUDIT LOGS */}
          {activeTab === 'audit_logs' && (
            <Card elevated className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                    Xavfsizlik va Maʼmuriy Audit Jurnali
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Tizimda amalga oshirilgan barcha muhim harakatlar qayd etiladi.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAuditLogs([...INITIAL_AUDIT_LOGS])}
                  className="gap-1 text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Yangilash</span>
                </Button>
              </div>

              <div className="divide-y divide-stone-100 dark:divide-emerald-950/60 font-mono-numbers text-xs">
                {auditLogs.map((log) => (
                  <div key={log.id} className="py-3 space-y-1">
                    <div className="flex items-center justify-between text-stone-400 text-[11px]">
                      <span>{log.timestamp}</span>
                      <span className="font-semibold text-[#c5a869]">{log.user}</span>
                    </div>
                    <div className="font-bold text-stone-800 dark:text-stone-200">
                      [{log.action}] — {log.resource}
                    </div>
                    <div className="text-stone-500 dark:text-stone-400 font-sans text-xs">
                      {log.detailsUz}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
