import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppSettings, SupportedLocale } from '../../types';
import { Modal } from './Modal';
import { Button } from './Button';
import { IslamicStarEmblem } from './GeometricPattern';
import {
  requestBrowserNotificationPermission,
  getPrayerAlertSettings,
  savePrayerAlertSettings,
  toggleAdhanAudio,
  stopActiveAdhanAudio,
} from '../../utils/notificationService';
import { Globe, Sun, Moon, Bell, Volume2, CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
}

const LANGUAGES: { code: SupportedLocale; label: string; sub: string }[] = [
  { code: 'uz-Latn', label: 'Oʻzbekcha (Lotin)', sub: 'Standart oʻzbek lotin yozuvi' },
  { code: 'uz-Cyrl', label: 'Ўзбекча (Кирилл)', sub: 'Кирилл алифбосидаги нашр' },
  { code: 'uz-Latn-new', label: 'Yangi Oʻzbek Lotin (Ş/Ç/Ö/Ğ)', sub: 'Zamonaviy diakritik lotin alifbosi' },
  { code: 'ru', label: 'Русский язык', sub: 'Интерфейс и переводы на русском' },
  { code: 'en', label: 'English', sub: 'International English interface' },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  const { i18n } = useTranslation();
  const [selectedLang, setSelectedLang] = useState<SupportedLocale>(
    (i18n.language as SupportedLocale) || 'uz-Latn'
  );
  const [notifGranted, setNotifGranted] = useState<boolean>(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );
  const [isTestingAdhan, setIsTestingAdhan] = useState(false);

  const handleSelectLanguage = (lang: SupportedLocale) => {
    setSelectedLang(lang);
    i18n.changeLanguage(lang);
    localStorage.setItem('asaka_ziyo_locale', lang);
  };

  const handleEnableNotifications = async () => {
    const perm = await requestBrowserNotificationPermission();
    setNotifGranted(perm === 'granted');
    const currentAlerts = getPrayerAlertSettings();
    savePrayerAlertSettings({ ...currentAlerts, enabled: true, soundEnabled: true });
  };

  const handleTestAdhan = async () => {
    if (isTestingAdhan) {
      stopActiveAdhanAudio();
      setIsTestingAdhan(false);
    } else {
      setIsTestingAdhan(true);
      await toggleAdhanAudio('mishary-alafasy-standard', 0.85);
    }
  };

  const handleFinish = () => {
    stopActiveAdhanAudio();
    try {
      localStorage.setItem('asaka_ziyo_onboarded_v1', 'true');
    } catch {
      // ignore
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleFinish}
      title="ASAKA ZIYO — Xush Kelibsiz!"
      subtitle="Ilovani oʻzingizga qulay til, mavzu va azon eslatmalari bilan moslab oling (Roʻyxatdan oʻtish majburiy emas)"
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Brand Identity Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#04241d] via-[#063127] to-[#031d17] border border-[#c5a869]/40 flex items-center gap-4 text-white">
          <div className="w-12 h-12 rounded-2xl bg-[#c5a869]/20 border border-[#c5a869] flex items-center justify-center shrink-0">
            <IslamicStarEmblem size={24} className="text-[#c5a869]" />
          </div>
          <div className="text-xs leading-relaxed text-stone-200">
            <div className="font-bold text-sm text-[#e6ce8a] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#c5a869]" />
              <span>Asaka Markaziy Jome Masjidi va Raqamli Islomiy Ekotizimi</span>
            </div>
            Aniq namoz vaqtlari, Shayx Mishari Roshid Al-Afosiy azoni, Qurʼoni Karim (Tafsiri Hilol bilan), sahih hadislar va kunlik viktorina.
          </div>
        </div>

        {/* 1. 5-Language Selector */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-[#c5a869] flex items-center gap-1.5">
            <Globe className="w-4 h-4" />
            <span>1. Ilova Tilini Tanlang (5 xil alifbo va til)</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {LANGUAGES.map((l) => {
              const active = selectedLang === l.code;
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => handleSelectLanguage(l.code)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    active
                      ? 'bg-[#c5a869]/20 border-[#c5a869] text-white'
                      : 'bg-white/5 border-white/10 text-stone-300 hover:border-white/30'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-white">{l.label}</div>
                    <div className="text-[10px] text-stone-400">{l.sub}</div>
                  </div>
                  {active && <CheckCircle2 className="w-4 h-4 text-[#c5a869] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Theme Mode Selector (Light, Dark, System) */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-[#c5a869] flex items-center gap-1.5">
            <Sun className="w-4 h-4" />
            <span>2. Koʻrinish Mavzusi (Yorugʻ / Tungi / Tizim)</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onUpdateSettings({ theme: 'light' })}
              className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                settings.theme === 'light'
                  ? 'bg-[#FBF9F5] text-[#14221B] border-[#c5a869] shadow'
                  : 'bg-white/5 border-white/10 text-stone-300'
              }`}
            >
              <Sun className="w-4 h-4 text-amber-500" />
              <span>Yorugʻ</span>
            </button>
            <button
              type="button"
              onClick={() => onUpdateSettings({ theme: 'dark' })}
              className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                settings.theme === 'dark'
                  ? 'bg-[#064e3b] text-white border-[#c5a869] shadow'
                  : 'bg-white/5 border-white/10 text-stone-300'
              }`}
            >
              <Moon className="w-4 h-4 text-[#c5a869]" />
              <span>Tungi</span>
            </button>
            <button
              type="button"
              onClick={() => onUpdateSettings({ theme: 'system' })}
              className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                settings.theme === 'system'
                  ? 'bg-[#c5a869] text-[#051210] border-[#c5a869] shadow'
                  : 'bg-white/5 border-white/10 text-stone-300'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Tizim</span>
            </button>
          </div>
        </div>

        {/* 3. Adhan Audio & Notification Permission */}
        <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-[#c5a869]" />
                <span>3. Azon Ovozi va Namoz Eslatmalari</span>
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Namoz vaqti kirganda Shayx Mishari Roshid Al-Afosiy azonini eshitish
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestAdhan}
                className="text-xs border-[#c5a869]/50 text-[#c5a869]"
              >
                <Volume2 className="w-3.5 h-3.5 mr-1" />
                <span>{isTestingAdhan ? 'Toʻxtatish' : 'Azonni Sinash'}</span>
              </Button>
              <Button
                variant={notifGranted ? 'outline' : 'primary'}
                size="sm"
                onClick={handleEnableNotifications}
                className="text-xs"
              >
                {notifGranted ? 'Ruxsat berilgan ✓' : 'Eslatmani Yoqish'}
              </Button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={handleFinish}
            className="text-xs text-stone-400 hover:text-white underline cursor-pointer"
          >
            Oʻtkazib yuborish (Mehmon rejimi)
          </button>
          <Button variant="primary" size="sm" onClick={handleFinish} className="gap-1.5">
            <span>Tayyor, Boshlash</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Modal>
  );
};
