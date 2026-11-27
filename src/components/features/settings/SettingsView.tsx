import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AppSettings, QuranReciter, SupportedLocale, PrayerSchedule } from '../../../types';
import { getActiveQuranReciters } from '../../../data/quranData';
import { subscribeToDatabase, getStoredPrayerSchedule } from '../../../utils/databaseService';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { PageHero } from '../../ui/PageHero';
import { LanguageSelector } from '../../ui/LanguageSelector';
import { toNewUzbekAlphabet } from '../../../utils/newUzbekAlphabet';
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  Monitor,
  Type,
  Volume2,
  Bell,
  Smartphone,
  MapPin,
  Shield,
  Info,
  Languages,
  Download,
  CheckCircle2,
  Camera,
  Mic,
  Phone,
  Image as ImageIcon,
  Music,
  ExternalLink,
  Clock,
  Sparkles,
  Send,
} from 'lucide-react';
import { usePWAInstall } from '../../../hooks/usePWAInstall';
import { triggerApkDownload, fetchVerifiedApkInfo, ASAKA_ZIYO_APK_RELEASE, APKReleaseInfo } from '../../../utils/apkPackage';
import {
  AppPermissionKey,
  AppPermissionItem,
  PermissionStatusValue,
  PERMISSION_METADATA,
  getAllPermissionsStatus,
  requestAppPermission,
  subscribeToPermissions,
  openAndroidAppSettings,
} from '../../../utils/permissionsService';
import {
  PrayerAlertSettings,
  PrayerPreReminderOffset,
  PrayerExactMode,
  getPrayerAlertSettings,
  savePrayerAlertSettings,
  subscribeToPrayerAlertSettings,
  syncPrayerScheduleAlarms,
  triggerTelegramHeadsUpNotification,
} from '../../../utils/notificationService';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onOpenAdmin: () => void;
  onOpenInstallModal?: () => void;
}

const PERMISSION_KEYS_ORDER: AppPermissionKey[] = [
  'notifications',
  'camera',
  'microphone',
  'phone',
  'photos_videos',
  'location',
  'music_audio',
];

const PRAYER_SCHEDULE_KEYS = [
  { key: 'tahajjud', label: 'Tahajjud namozi' },
  { key: 'subh', label: 'Subhi sodiq (Saharlik)' },
  { key: 'bomdod', label: 'Bomdod namozi' },
  { key: 'peshin', label: 'Peshin namozi' },
  { key: 'asr', label: 'Asr namozi' },
  { key: 'shom', label: 'Shom namozi' },
  { key: 'xufton', label: 'Xufton namozi' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onOpenAdmin,
  onOpenInstallModal,
}) => {
  const { isInstalled, isStandalone } = usePWAInstall();
  const { t, i18n } = useTranslation();
  const currentLocale = (i18n.language as SupportedLocale) || 'uz-Latn';
  const [availableReciters, setAvailableReciters] = useState<QuranReciter[]>(() => getActiveQuranReciters());
  const [permissionsList, setPermissionsList] = useState<AppPermissionItem[]>(() =>
    getAllPermissionsStatus()
  );
  const [requestingKey, setRequestingKey] = useState<AppPermissionKey | null>(null);
  const [permissionFeedback, setPermissionFeedback] = useState<string | null>(null);

  const [alertSettings, setAlertSettings] = useState<PrayerAlertSettings>(() => getPrayerAlertSettings());
  const [prayerSchedule, setPrayerSchedule] = useState<PrayerSchedule>(() => getStoredPrayerSchedule());
  const [apkInfo, setApkInfo] = useState<APKReleaseInfo>(ASAKA_ZIYO_APK_RELEASE);

  useEffect(() => {
    void fetchVerifiedApkInfo().then((info) => setApkInfo(info));
  }, []);

  useEffect(() => {
    const unsubDb = subscribeToDatabase((event) => {
      if (event.type === 'QURAN_RECITERS_UPDATED' || event.type === 'QURAN_AUDIO_UPDATED') {
        setAvailableReciters(getActiveQuranReciters());
      }
      if (event.type === 'PRAYER_UPDATED') {
        setPrayerSchedule(getStoredPrayerSchedule());
      }
    });
    const unsubPerms = subscribeToPermissions((items) => {
      setPermissionsList(items);
    });
    const unsubAlerts = subscribeToPrayerAlertSettings((updated) => {
      setAlertSettings(updated);
    });
    return () => {
      unsubDb();
      unsubPerms();
      unsubAlerts();
    };
  }, []);

  const getLocalizedText = (text: string) => {
    if (currentLocale === 'uz-Latn-new') {
      return toNewUzbekAlphabet(text);
    }
    return text;
  };

  const handleRequestSinglePermission = async (key: AppPermissionKey) => {
    setRequestingKey(key);
    setPermissionFeedback(null);
    const result = await requestAppPermission(key);
    setRequestingKey(null);
    if (result.messageUz) {
      setPermissionFeedback(result.messageUz);
    }
    if (key === 'notifications' && result.status === 'granted') {
      onUpdateSettings({ prayerAlertsEnabled: true });
      const updated = { ...alertSettings, enabled: true };
      savePrayerAlertSettings(updated);
      syncPrayerScheduleAlarms(prayerSchedule, true);
    }
  };

  const handleUpdateAlertSettings = (patch: Partial<PrayerAlertSettings>) => {
    const updated: PrayerAlertSettings = {
      ...alertSettings,
      ...patch,
    };
    setAlertSettings(updated);
    savePrayerAlertSettings(updated);
    syncPrayerScheduleAlarms(prayerSchedule, true);
  };

  const getPermissionIcon = (key: AppPermissionKey) => {
    const cls = 'w-4 h-4 text-[#064E3B] dark:text-[#C8A85E]';
    switch (key) {
      case 'notifications':
        return <Bell className={cls} />;
      case 'camera':
        return <Camera className={cls} />;
      case 'microphone':
        return <Mic className={cls} />;
      case 'phone':
        return <Phone className={cls} />;
      case 'photos_videos':
        return <ImageIcon className={cls} />;
      case 'location':
        return <MapPin className={cls} />;
      case 'music_audio':
        return <Music className={cls} />;
    }
  };

  const getStatusLabel = (status: PermissionStatusValue) => {
    switch (status) {
      case 'granted':
        return (
          <span className="text-[11px] font-semibold text-[#064E3B] dark:text-[#34D399]">
            {getLocalizedText('Ruxsat berilgan')}
          </span>
        );
      case 'limited':
        return (
          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
            {getLocalizedText('Cheklangan')}
          </span>
        );
      case 'denied':
        return (
          <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
            {getLocalizedText('Ruxsat berilmagan')}
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-medium text-[#587068] dark:text-[#9CAFA7]">
            {getLocalizedText('Soʻralmagan')}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto">
      <PageHero
        variant="sanctuary"
        kicker={`${t('settings:systemCustomization')} · ${t('settings:configuration')}`}
        title={t('settings:title')}
        subtitle={t('settings:subtitle')}
        aside={
          <div className="flex items-center sm:justify-end">
            <div className="rounded-2xl bg-white/[0.06] border border-white/[0.12] backdrop-blur-md p-3.5 flex items-center gap-3.5">
              <img
                src="/assets/aistudio/IMG_20261114_084331_924_8f6ccba1.jpg"
                alt="ASAKA ZIYO — MuhammadSolih Hoji Jome Masjidi Rasmiy Logosi"
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-2xl object-cover bg-white ring-1 ring-[#C8A85E]/50 shrink-0"
              />
              <div className="space-y-0.5 pr-1">
                <div className="text-xs font-bold text-[#F7F4EC]">ASAKA ZIYO v{apkInfo.version || '5.0.0'}</div>
                <div className="text-[11px] text-[#C8A85E] font-mono-numbers">
                  Asia/Tashkent · UTC+5
                </div>
                <div className="text-[11px] text-[#C2D4CD]">Build {apkInfo.buildCode || 500} · Native v5</div>
              </div>
            </div>
          </div>
        }
      />

      <div className="space-y-6">
        {/* 1. Language & Writing System (5 Distinct Locales) */}
        <Card elevated className="p-6 space-y-4 border-[#C6A45C]/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#063D32]/10 dark:bg-[#C6A45C]/15 flex items-center justify-center text-[#063D32] dark:text-[#C6A45C]">
              <Languages className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                {t('settings:language')}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {t('settings:languageDesc')}
              </p>
            </div>
          </div>

          <div className="pt-2">
            <LanguageSelector variant="full" />
          </div>
        </Card>

        {/* 2. COMPLETE ANDROID & WEB APP PERMISSIONS MANAGEMENT (7 CATEGORIES) */}
        <Card elevated className="p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl az-liquid-glass-pill flex items-center justify-center text-[#064E3B] dark:text-[#C8A85E]">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-[#091813] dark:text-[#F7F4EC]">
                    {getLocalizedText('Ilova Ruxsatlari (Android 10–16 & Web Permissions)')}
                  </h3>
                  <span aria-hidden="true" className="text-[#587068]/50 dark:text-[#9CAFA7]/50">
                    ·
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#9E7F3C] dark:text-[#C8A85E]">
                    7 ta ruxsat
                  </span>
                </div>
                <p className="text-xs text-[#587068] dark:text-[#9CAFA7]">
                  {getLocalizedText(
                    'Har bir ruxsat faqat tegishli funksiya ishlatilganda soʻraladi va real tizimga ulangan'
                  )}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openAndroidAppSettings()}
              className="min-h-[44px] self-start sm:self-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{getLocalizedText('Android Sozlamalari')}</span>
            </Button>
          </div>

          {permissionFeedback && (
            <div className="p-3.5 rounded-xl bg-emerald-500/12 border border-emerald-500/35 text-[#064E3B] dark:text-emerald-200 text-xs flex items-center justify-between gap-2">
              <span>{getLocalizedText(permissionFeedback)}</span>
              <button
                type="button"
                onClick={() => setPermissionFeedback(null)}
                className="text-[#064E3B] dark:text-emerald-300 font-bold text-xs cursor-pointer px-2"
              >
                ✕
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3">
            {PERMISSION_KEYS_ORDER.map((permKey) => {
              const meta = PERMISSION_METADATA[permKey];
              const item = permissionsList.find((p) => p.key === permKey);
              const status = item?.status || 'prompt';
              const isRequesting = requestingKey === permKey;

              return (
                <div
                  key={permKey}
                  className="p-4 rounded-2xl border border-black/[0.07] dark:border-white/[0.08] bg-white/50 dark:bg-white/[0.025] hover:border-[#064E3B]/35 dark:hover:border-[#C8A85E]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl az-liquid-glass-pill flex items-center justify-center shrink-0 mt-0.5">
                      {getPermissionIcon(permKey)}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-[#091813] dark:text-[#F7F4EC]">
                          {getLocalizedText(meta.titleUz)}
                        </span>
                        <span aria-hidden="true" className="text-[#587068]/50 dark:text-[#9CAFA7]/50">
                          ·
                        </span>
                        {getStatusLabel(status)}
                      </div>
                      <p className="text-xs text-[#3B554D] dark:text-[#A4B9B1] leading-relaxed">
                        {getLocalizedText(meta.purposeUz)}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-0.5 text-[10px] font-mono text-[#587068] dark:text-[#9CAFA7]">
                        {meta.androidPermissions.map((ap) => (
                          <span key={ap}>{ap.replace('android.permission.', '')}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {status === 'denied' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openAndroidAppSettings()}
                        className="min-h-[42px] text-rose-600 dark:text-rose-300 border-rose-500/35"
                      >
                        {getLocalizedText('Sozlamalarni ochish')}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant={status === 'granted' ? 'outline' : 'primary'}
                      size="sm"
                      disabled={isRequesting}
                      onClick={() => handleRequestSinglePermission(permKey)}
                      className="min-h-[42px]"
                    >
                      {isRequesting
                        ? getLocalizedText('Tekshirilmoqda...')
                        : status === 'granted'
                        ? getLocalizedText('Qayta tekshirish')
                        : getLocalizedText('Ruxsat berish')}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* 3. TELEGRAM-STYLE HEADS-UP NOTIFICATIONS & SMART 7-PRAYER REMINDER ENGINE */}
        <Card elevated className="p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl az-liquid-glass-pill flex items-center justify-center text-[#064E3B] dark:text-[#C8A85E]">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-[#091813] dark:text-[#F7F4EC]">
                    {getLocalizedText('Telegram Uslubidagi Bildirishnomalar va Namoz Eslatmalari')}
                  </h3>
                  <span aria-hidden="true" className="text-[#587068]/50 dark:text-[#9CAFA7]/50">
                    ·
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#064E3B] dark:text-[#10B981]">
                    Heads-Up
                  </span>
                </div>
                <p className="text-xs text-[#587068] dark:text-[#9CAFA7]">
                  {getLocalizedText(
                    'Har bir namoz uchun oldindan eslatma (5/10/15/30 daqiqa) va namoz vaqti kirganda Azon/Ohang/Vibratsiya'
                  )}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() =>
                triggerTelegramHeadsUpNotification({
                  title: 'ASAKA ZIYO — Telegram Uslubidagi Bildirishnoma',
                  body: 'Yuqoridan tushuvchi Heads-Up banner, ovoz va tebranish tizimi muvaffaqiyatli ishlamoqda!',
                  category: 'prayer_exact',
                  targetView: 'prayer',
                  playChime: true,
                })
              }
              className="min-h-[44px] self-start sm:self-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{getLocalizedText('Heads-Up Sinovi')}</span>
            </Button>
          </div>

          {/* Notification Category Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                key: 'headsUpBannerEnabled' as const,
                title: 'Telegram uslubidagi yuqori qalqib chiquvchi banner',
                desc: 'Xabar kelganda ekranning yuqori qismidan ravon tushuvchi Heads-Up oyna',
              },
              {
                key: 'announcementAlertsEnabled' as const,
                title: 'Masjid va Admin muhim eʼlonlari',
                desc: 'Juma mavzulari, jamoat eʼlonlari va tezkor xabarnomalar',
              },
              {
                key: 'newsAlertsEnabled' as const,
                title: 'Yangiliklar va Ilmiy maqolalar',
                desc: 'Yangi maqola, hadis yoki yangilik joylanganda bildirishnoma',
              },
              {
                key: 'chatAlertsEnabled' as const,
                title: 'Suhbat va Savol-javob xabarlari',
                desc: 'Imom javoblari va jamoat suhbat xabarlari eslatmasi',
              },
            ].map((item) => {
              const isChecked = alertSettings[item.key] !== false;
              return (
                <div
                  key={item.key}
                  className="p-3.5 rounded-2xl border border-black/[0.07] dark:border-white/[0.08] bg-white/50 dark:bg-white/[0.025] flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-xs font-bold text-[#091813] dark:text-[#F7F4EC]">
                      {getLocalizedText(item.title)}
                    </div>
                    <div className="text-[11px] text-[#587068] dark:text-[#9CAFA7]">
                      {getLocalizedText(item.desc)}
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isChecked}
                    onClick={() => handleUpdateAlertSettings({ [item.key]: !isChecked })}
                    className={`w-12 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                      isChecked
                        ? 'bg-[#064E3B] dark:bg-[#10B981]'
                        : 'bg-black/15 dark:bg-white/15'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform absolute top-1 ${
                        isChecked ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Per-Prayer Pre-Reminder & Exact Entry Configuration */}
          <div className="space-y-2.5 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="az-type-overline text-[#9E7F3C] dark:text-[#C8A85E] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{getLocalizedText('7 Mahal Namoz Uchun Individual Vaqt va Azon Sozlamalari')}</span>
              </h4>
              <span className="text-[11px] text-[#064E3B] dark:text-[#10B981] font-mono-numbers">
                Asia/Tashkent (UTC+5) · Avto-sinxron
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {PRAYER_SCHEDULE_KEYS.map((pItem) => {
                const scheduleTime =
                  prayerSchedule.times.find((t) => t.key === pItem.key)?.time || '--:--';
                const currentPreOffset: PrayerPreReminderOffset =
                  alertSettings.preReminderMinutes?.[pItem.key] ?? 15;
                const currentExactMode: PrayerExactMode =
                  alertSettings.perPrayerMode?.[pItem.key] ?? 'sound';

                return (
                  <div
                    key={pItem.key}
                    className="p-3.5 rounded-2xl border border-black/[0.07] dark:border-white/[0.08] bg-white/50 dark:bg-white/[0.025] flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-xl az-liquid-glass-pill font-mono-numbers text-xs font-bold text-[#064E3B] dark:text-[#C8A85E]">
                        {scheduleTime}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-[#091813] dark:text-[#F7F4EC]">
                        {getLocalizedText(pItem.label)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full md:w-auto">
                      {/* Pre-reminder offset select */}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#587068] dark:text-[#9CAFA7] whitespace-nowrap">
                          {getLocalizedText('Oldindan:')}
                        </span>
                        <select
                          value={currentPreOffset}
                          onChange={(e) => {
                            const val = Number(e.target.value) as PrayerPreReminderOffset;
                            handleUpdateAlertSettings({
                              preReminderMinutes: {
                                ...(alertSettings.preReminderMinutes || {}),
                                [pItem.key]: val,
                              },
                            });
                          }}
                          className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-[#081510] border border-black/[0.1] dark:border-white/[0.12] text-xs text-[#091813] dark:text-[#F7F4EC] font-semibold focus:outline-none focus:border-[#064E3B] dark:focus:border-[#10B981]"
                        >
                          <option value={0}>{getLocalizedText('Oʻchirilgan')}</option>
                          <option value={5}>{getLocalizedText('5 daqiqa oldin')}</option>
                          <option value={10}>{getLocalizedText('10 daqiqa oldin')}</option>
                          <option value={15}>{getLocalizedText('15 daqiqa oldin')}</option>
                          <option value={30}>{getLocalizedText('30 daqiqa oldin')}</option>
                        </select>
                      </div>

                      {/* Exact time mode select */}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#587068] dark:text-[#9CAFA7] whitespace-nowrap">
                          {getLocalizedText('Vaqt kirganda:')}
                        </span>
                        <select
                          value={currentExactMode}
                          onChange={(e) => {
                            const mode = e.target.value as PrayerExactMode;
                            handleUpdateAlertSettings({
                              perPrayerMode: {
                                ...(alertSettings.perPrayerMode || {}),
                                [pItem.key]: mode,
                              },
                            });
                          }}
                          className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-[#081510] border border-black/[0.1] dark:border-white/[0.12] text-xs text-[#091813] dark:text-[#F7F4EC] font-semibold focus:outline-none focus:border-[#064E3B] dark:focus:border-[#10B981]"
                        >
                          <option value="sound">{getLocalizedText('Toʻliq Azon Audio')}</option>
                          <option value="chime">{getLocalizedText('Qisqa Ohang (Chime)')}</option>
                          <option value="silent">{getLocalizedText('Faqat Vibratsiya')}</option>
                          <option value="off">{getLocalizedText('Oʻchirilgan')}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* 4. Visual Theme */}
        <Card elevated className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#063D32]/10 dark:bg-[#C6A45C]/15 flex items-center justify-center text-[#063D32] dark:text-[#C6A45C]">
              {settings.theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                {t('settings:themeTitle')}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {t('settings:themeDesc')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <button
              onClick={() => onUpdateSettings({ theme: 'dark' })}
              className={`flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                settings.theme === 'dark'
                  ? 'border-[#C6A45C] bg-[#031814] text-[#C6A45C] shadow-md'
                  : 'border-[#E2D9C5] dark:border-[#124237] text-[#3E524B] dark:text-[#9BB5AC] hover:border-[#C6A45C]/50'
              }`}
            >
              <Moon className="w-4 h-4 shrink-0" />
              <span>{t('settings:darkTheme', 'Qorongʻi (#031814)')}</span>
            </button>

            <button
              onClick={() => onUpdateSettings({ theme: 'light' })}
              className={`flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                settings.theme === 'light'
                  ? 'border-[#063D32] bg-[#F8F5EC] text-[#063D32] shadow-md'
                  : 'border-[#E2D9C5] dark:border-[#124237] text-[#3E524B] dark:text-[#9BB5AC] hover:border-[#063D32]/50'
              }`}
            >
              <Sun className="w-4 h-4 shrink-0" />
              <span>{t('settings:lightTheme', 'Yorugʻ (Warm Ivory)')}</span>
            </button>

            <button
              onClick={() => onUpdateSettings({ theme: 'system' })}
              className={`flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                settings.theme === 'system'
                  ? 'border-[#C6A45C] bg-[#C6A45C]/15 text-[#063D32] dark:text-[#C6A45C] shadow-md'
                  : 'border-[#E2D9C5] dark:border-[#124237] text-[#3E524B] dark:text-[#9BB5AC] hover:border-[#C6A45C]/50'
              }`}
            >
              <Monitor className="w-4 h-4 shrink-0" />
              <span>{t('settings:systemTheme', 'Tizim (Avto)')}</span>
            </button>
          </div>
        </Card>

        {/* 5. Arabic Font Size */}
        <Card elevated className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/20 flex items-center justify-center text-[#c5a869]">
              <Type className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                {t('settings:arabicFontSize')}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {t('settings:fontSizeDesc')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { id: 'standard', label: `${t('settings:fontStandard')} (28px)` },
              { id: 'large', label: `${t('settings:fontLarge')} (36px)` },
              { id: 'huge', label: `${t('settings:fontHuge')} (44px)` },
            ].map((size) => {
              const isSelected = settings.arabicFontSize === size.id;
              return (
                <button
                  key={size.id}
                  onClick={() =>
                    onUpdateSettings({
                      arabicFontSize: size.id as 'standard' | 'large' | 'huge',
                    })
                  }
                  className={`p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#c5a869] bg-[#c5a869]/10 text-[#c5a869]'
                      : 'border-stone-200 dark:border-emerald-950 text-stone-600 dark:text-stone-400'
                  }`}
                >
                  {size.label}
                </button>
              );
            })}
          </div>

          {/* Live Preview */}
          <div className="p-4 rounded-xl bg-stone-50 dark:bg-[#071614] border border-stone-200/60 dark:border-emerald-950/60 text-center">
            <span className="text-[11px] text-stone-400 block mb-1">
              {t('settings:previewLabel')}:
            </span>
            <p
              dir="rtl"
              className={`font-arabic text-stone-900 dark:text-amber-100/90 ${
                settings.arabicFontSize === 'standard'
                  ? 'text-2xl'
                  : settings.arabicFontSize === 'large'
                  ? 'text-3xl'
                  : 'text-4xl'
              }`}
            >
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </p>
          </div>
        </Card>

        {/* 6. Audio Reciter Selection */}
        <Card elevated className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/20 flex items-center justify-center text-[#c5a869]">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                {t('settings:reciterTitle')}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {t('settings:reciterDesc')}
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            {availableReciters.map((reciter) => {
              const isSelected = settings.activeReciterId === reciter.id;
              return (
                <button
                  key={reciter.id}
                  onClick={() => {
                    onUpdateSettings({ activeReciterId: reciter.id });
                    try {
                      localStorage.setItem('asaka_ziyo_reciter', reciter.id);
                    } catch {
                      // ignore
                    }
                  }}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#c5a869] bg-[#c5a869]/10 text-stone-900 dark:text-white'
                      : 'border-stone-200 dark:border-emerald-950 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <div>
                    <div className="text-sm font-semibold">{reciter.name}</div>
                    <div className="text-xs text-stone-400 dark:text-stone-500">
                      {reciter.subtext}
                    </div>
                  </div>
                  {isSelected && (
                    <span className="text-xs font-semibold text-[#c5a869]">{t('settings:selected')}</span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* 7. Toggles: Haptics, Audio, Notifications */}
        <Card elevated className="p-6 divide-y divide-stone-100 dark:divide-emerald-950/60">
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                {t('settings:tasbihSoundTitle')}
              </div>
              <div className="text-xs text-stone-400">
                {t('settings:tasbihSoundDesc')}
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ tasbihSound: !settings.tasbihSound })}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                settings.tasbihSound ? 'bg-[#c5a869]' : 'bg-stone-300 dark:bg-stone-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  settings.tasbihSound ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                {t('settings:hapticFeedbackTitle')}
              </div>
              <div className="text-xs text-stone-400">
                {t('settings:hapticFeedbackDesc')}
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ hapticFeedback: !settings.hapticFeedback })}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                settings.hapticFeedback ? 'bg-[#c5a869]' : 'bg-stone-300 dark:bg-stone-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  settings.hapticFeedback ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                {t('settings:prayerAlertsTitle')}
              </div>
              <div className="text-xs text-stone-400">
                {t('settings:prayerAlertsDesc')}
              </div>
            </div>
            <button
              onClick={() =>
                onUpdateSettings({ prayerAlertsEnabled: !settings.prayerAlertsEnabled })
              }
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                settings.prayerAlertsEnabled ? 'bg-[#c5a869]' : 'bg-stone-300 dark:bg-stone-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  settings.prayerAlertsEnabled ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>
        </Card>

        {/* 8. Mobile App & Standalone APK v3.0.0 */}
        <Card elevated className="p-6 space-y-4 border-[#c5a869]/40 bg-gradient-to-r from-emerald-950/20 via-transparent to-transparent">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src="/assets/aistudio/IMG_20261114_084331_924_8f6ccba1.jpg"
                alt="ASAKA ZIYO Mobil Ilovasi Rasmiy Logosi"
                className="w-11 h-11 rounded-full object-cover bg-white border-2 border-[#DFBD69]/70"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    {getLocalizedText(`Mobil Ilova va Rasmiy Android APK v${apkInfo.version || '5.0.0'}`)}
                  </h3>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#c5a869] text-[#071614]">
                    v{apkInfo.version || '5.0.0'} (Build {apkInfo.buildCode || 500})
                  </span>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {getLocalizedText(
                    'Yangi avlod native Kotlin + Jetpack Compose (Android 7.0–16, API 24–36) mobil ilovasi, Media3 fon pleeri va oflayn tizim'
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {isInstalled || isStandalone ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{getLocalizedText('Oʻrnatilgan')}</span>
                </>
              ) : (
                <span className="text-stone-400">{getLocalizedText('Brauzerda ishlamoqda')}</span>
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-stone-100/70 dark:bg-black/20 border border-stone-200 dark:border-white/5 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-stone-500">{getLocalizedText('Fayl nomi va holati:')}</span>
              <span className="font-mono text-stone-800 dark:text-stone-200">
                {apkInfo.apkFilename} ({apkInfo.fileSizeDisplay})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">{getLocalizedText('Paket nomi:')}</span>
              <span className="font-mono text-stone-800 dark:text-stone-200">
                {apkInfo.packageId}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">{getLocalizedText('Oflayn ishlash:')}</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                {getLocalizedText('100% internet talab qilmaydi')}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={() => {
                if (onOpenInstallModal) {
                  onOpenInstallModal();
                } else {
                  void triggerApkDownload(apkInfo.apkFilename || 'Asaka-Ziyo-v5.0.0.apk');
                }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#c5a869] text-[#071614] text-xs font-bold hover:bg-[#d8bd7e] transition-all shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{getLocalizedText(`APK v${apkInfo.version || '5.0.0'} Yuklab Olish Markazi`)}</span>
            </button>

            {onOpenInstallModal && (
              <button
                onClick={onOpenInstallModal}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#c5a869]/50 text-stone-700 dark:text-stone-300 text-xs font-semibold hover:border-[#c5a869] transition-all cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-[#c5a869]" />
                <span>{getLocalizedText('Oʻrnatish Yoʻriqnomasi')}</span>
              </button>
            )}
          </div>
        </Card>

        {/* 9. Regional & Architecture Information */}
        <Card className="p-6 space-y-3 bg-stone-100/60 dark:bg-[#071614]/60">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#c5a869] uppercase tracking-wider">
            <Info className="w-3.5 h-3.5" />
            <span>{t('settings:regionalInfo')}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-stone-600 dark:text-stone-300">
            <div>
              <span className="text-stone-400 block">{t('settings:regionLabel')}:</span>
              <span className="font-semibold">{t('prayer:regionCity')}, {t('prayer:regionProvince')}</span>
            </div>
            <div>
              <span className="text-stone-400 block">{t('settings:timezoneLabel')}:</span>
              <span className="font-semibold font-mono-numbers">Asia/Tashkent (UTC+5)</span>
            </div>
            <div>
              <span className="text-stone-400 block">{t('settings:qiblaLabel')}:</span>
              <span className="font-semibold font-mono-numbers">241° WSW</span>
            </div>
            <div>
              <span className="text-stone-400 block">{t('settings:platformVersion')}:</span>
              <span className="font-semibold">ASAKA ZIYO v{apkInfo.version || '5.0.0'} · Build {apkInfo.buildCode || 500}</span>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('asaka-open-privacy-modal'))}
              className="text-xs text-[#c5a869] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{getLocalizedText('Maxfiylik siyosati & Maʼlumotlar xavfsizligi')}</span>
            </button>
            <a
              href="/delete-account"
              className="text-xs text-rose-400 hover:underline font-semibold flex items-center gap-1"
            >
              <span>{getLocalizedText('Akkaunt va maʼlumotlarni oʻchirish')}</span>
            </a>
            <button
              onClick={onOpenAdmin}
              className="text-xs text-[#c5a869] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{t('settings:adminPortalLink')}</span>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};
