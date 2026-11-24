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
import { AudioWaveformBars } from './MotionPrimitives';
import { triggerTactileHaptic } from '../../utils/motionSystem';

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
      title="ASAKA ZIYO — Xush kelibsiz"
      subtitle="Ilovani oʻzingizga qulay til, mavzu va azon eslatmalari bilan moslab oling (Roʻyxatdan oʻtish majburiy emas)"
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Brand Identity Banner */}
        <div className="p-4 sm:p-5 rounded-2xl az-aurora-surface border border-white/[0.12] flex items-center gap-4 text-[#F7F4EC]">
          <div className="w-12 h-12 rounded-2xl bg-[#10B981]/15 border border-[#10B981]/35 flex items-center justify-center shrink-0">
            <IslamicStarEmblem size={22} className="text-[#10B981]" />
          </div>
          <div className="text-xs leading-relaxed text-[#C2D1CB]">
            <div className="font-semibold text-sm text-[#F7F4EC] mb-0.5">
              «MuhammadSolih Hoji» Jomeʼ Masjidi raqamli ekotizimi
            </div>
            Aniq namoz vaqtlari, Shayx Mishari Roshid Al-Afosiy azoni, Qurʼoni Karim (Tafsiri Hilol bilan), sahih hadislar va kunlik viktorina.
          </div>
        </div>

        {/* 1. 5-Language Selector */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-[#091813] dark:text-[#F7F4EC] flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#064E3B] dark:text-[#10B981]" />
            <span>1. Ilova tilini tanlang (5 xil alifbo va til)</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {LANGUAGES.map((l) => {
              const active = selectedLang === l.code;
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => {
                    triggerTactileHaptic(6);
                    handleSelectLanguage(l.code);
                  }}
                  className={`min-h-[48px] p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    active
                      ? 'bg-[#064E3B]/[0.09] dark:bg-[#10B981]/15 border-[#064E3B] dark:border-[#10B981] text-[#064E3B] dark:text-[#F7F4EC] shadow-sm'
                      : 'bg-[#F7F4EC] dark:bg-[#0D1613] border-[#064E3B]/[0.09] dark:border-white/[0.08] text-[#091813] dark:text-[#E5ECE9] hover:border-[#064E3B]/30 dark:hover:border-white/20'
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold">{l.label}</div>
                    <div className="text-[11px] text-[#5F736C] dark:text-[#8EA39B]">{l.sub}</div>
                  </div>
                  {active && <CheckCircle2 className="w-4 h-4 text-[#064E3B] dark:text-[#10B981] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Theme Mode Selector (Light, Dark, System) */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-[#091813] dark:text-[#F7F4EC] flex items-center gap-2">
            <Sun className="w-4 h-4 text-[#C8A85E]" />
            <span>2. Koʻrinish mavzusi</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                triggerTactileHaptic(6);
                onUpdateSettings({ theme: 'light' });
              }}
              className={`min-h-[44px] p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                settings.theme === 'light'
                  ? 'bg-[#064E3B] text-[#F7F4EC] border-[#064E3B]'
                  : 'bg-[#F7F4EC] dark:bg-[#0D1613] border-[#064E3B]/[0.09] dark:border-white/[0.08] text-[#4B635B] dark:text-[#C2D1CB]'
              }`}
            >
              <Sun className="w-4 h-4" />
              <span>Yorugʻ</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerTactileHaptic(6);
                onUpdateSettings({ theme: 'dark' });
              }}
              className={`min-h-[44px] p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                settings.theme === 'dark'
                  ? 'bg-[#064E3B] dark:bg-[#10B981] text-[#F7F4EC] dark:text-[#030706] border-[#064E3B] dark:border-[#10B981]'
                  : 'bg-[#F7F4EC] dark:bg-[#0D1613] border-[#064E3B]/[0.09] dark:border-white/[0.08] text-[#4B635B] dark:text-[#C2D1CB]'
              }`}
            >
              <Moon className="w-4 h-4" />
              <span>Tungi</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerTactileHaptic(6);
                onUpdateSettings({ theme: 'system' });
              }}
              className={`min-h-[44px] p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                settings.theme === 'system'
                  ? 'bg-[#064E3B] dark:bg-[#10B981] text-[#F7F4EC] dark:text-[#030706] border-[#064E3B] dark:border-[#10B981]'
                  : 'bg-[#F7F4EC] dark:bg-[#0D1613] border-[#064E3B]/[0.09] dark:border-white/[0.08] text-[#4B635B] dark:text-[#C2D1CB]'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Tizim</span>
            </button>
          </div>
        </div>

        {/* 3. Adhan Audio & Notification Permission */}
        <div className="p-4 rounded-2xl az-liquid-glass border border-[#064E3B]/[0.09] dark:border-white/[0.08] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-[#091813] dark:text-[#F7F4EC] flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#064E3B] dark:text-[#10B981]" />
                <span>3. Azon ovozi va namoz eslatmalari</span>
                {isTestingAdhan && (
                  <AudioWaveformBars isPlaying={true} barCount={4} barClassName="bg-[#10B981]" />
                )}
              </div>
              <p className="text-[11px] text-[#5F736C] dark:text-[#8EA39B] mt-0.5">
                Namoz vaqti kirganda Shayx Mishari Roshid Al-Afosiy azonini eshitish
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestAdhan}
                className="text-xs"
              >
                <Volume2 className="w-3.5 h-3.5 mr-1" />
                <span>{isTestingAdhan ? 'Toʻxtatish' : 'Azonni sinash'}</span>
              </Button>
              <Button
                variant={notifGranted ? 'outline' : 'primary'}
                size="sm"
                onClick={handleEnableNotifications}
                className="text-xs"
              >
                {notifGranted ? 'Ruxsat berilgan' : 'Eslatmani yoqish'}
              </Button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#064E3B]/[0.08] dark:border-white/[0.08]">
          <button
            type="button"
            onClick={handleFinish}
            className="text-xs text-[#5F736C] dark:text-[#8EA39B] hover:text-[#091813] dark:hover:text-[#F7F4EC] underline cursor-pointer"
          >
            Oʻtkazib yuborish (Mehmon rejimi)
          </button>
          <Button variant="primary" size="sm" onClick={handleFinish} className="gap-1.5">
            <span>Tayyor, boshlash</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Modal>
  );
};
