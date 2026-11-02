import React from 'react';
import { useTranslation } from 'react-i18next';
import { AppSettings, SupportedLocale } from '../../../types';
import { QURAN_RECITERS } from '../../../data/quranData';
import { Card } from '../../ui/Card';
import { GeometricPattern } from '../../ui/GeometricPattern';
import { LanguageSelector } from '../../ui/LanguageSelector';
import { toNewUzbekAlphabet } from '../../../utils/newUzbekAlphabet';
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
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
} from 'lucide-react';
import { usePWAInstall } from '../../../hooks/usePWAInstall';
import { triggerApkDownload, ASAKA_ZIYO_APK_RELEASE } from '../../../utils/apkPackage';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onOpenAdmin: () => void;
  onOpenInstallModal?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onOpenAdmin,
  onOpenInstallModal,
}) => {
  const { isInstalled, isStandalone } = usePWAInstall();
  const { t, i18n } = useTranslation();
  const currentLocale = (i18n.language as SupportedLocale) || 'uz-Latn';

  const getLocalizedText = (text: string) => {
    if (currentLocale === 'uz-Latn-new') {
      return toNewUzbekAlphabet(text);
    }
    return text;
  };

  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto">
      {/* Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-[#c5a869]/30 bg-gradient-to-r from-[#031d17] to-[#071614] text-white p-6 sm:p-10">
        <GeometricPattern opacity={0.05} />
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#c5a869] uppercase tracking-wider">
            <SettingsIcon className="w-3.5 h-3.5" />
            <span>{t('settings:systemCustomization')}</span>
            <span aria-hidden="true">·</span>
            <span>{t('settings:configuration')}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-white">
            {t('settings:title')}
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            {t('settings:subtitle')}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* 1. Language & Writing System (5 Distinct Locales) */}
        <Card elevated className="p-6 space-y-4 border-[#c5a869]/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/20 flex items-center justify-center text-[#c5a869]">
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

        {/* 2. Visual Theme */}
        <Card elevated className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/20 flex items-center justify-center text-[#c5a869]">
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

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => onUpdateSettings({ theme: 'dark' })}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                settings.theme === 'dark'
                  ? 'border-[#c5a869] bg-[#071614] text-[#c5a869] shadow-sm'
                  : 'border-stone-200 dark:border-emerald-950 text-stone-600 dark:text-stone-400'
              }`}
            >
              <Moon className="w-4 h-4" />
              <span>{t('settings:darkTheme')}</span>
            </button>

            <button
              onClick={() => onUpdateSettings({ theme: 'light' })}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                settings.theme === 'light'
                  ? 'border-[#c5a869] bg-stone-100 text-[#071614] shadow-sm'
                  : 'border-stone-200 dark:border-emerald-950 text-stone-600 dark:text-stone-400'
              }`}
            >
              <Sun className="w-4 h-4" />
              <span>{t('settings:lightTheme')}</span>
            </button>
          </div>
        </Card>

        {/* 3. Arabic Font Size */}
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

        {/* 4. Audio Reciter Selection */}
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
            {QURAN_RECITERS.map((reciter) => {
              const isSelected = settings.activeReciterId === reciter.id;
              return (
                <button
                  key={reciter.id}
                  onClick={() => onUpdateSettings({ activeReciterId: reciter.id })}
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

        {/* 5. Toggles: Haptics, Audio, Notifications */}
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

        {/* 6. Mobile App & Standalone APK v1.0 */}
        <Card elevated className="p-6 space-y-4 border-[#c5a869]/40 bg-gradient-to-r from-emerald-950/20 via-transparent to-transparent">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#c5a869]/20 flex items-center justify-center text-[#c5a869]">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    {getLocalizedText("Mobil Ilova va APK Version 1.0")}
                  </h3>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#c5a869] text-[#071614]">
                    v1.0.0
                  </span>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {getLocalizedText(
                    "Telefonga mustaqil APK oʻrnatish yoki bosh ekranga qoʻshish (PWA)"
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {isInstalled || isStandalone ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{getLocalizedText("Oʻrnatilgan")}</span>
                </>
              ) : (
                <span className="text-stone-400">{getLocalizedText("Brauzerda ishlamoqda")}</span>
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-stone-100/70 dark:bg-black/20 border border-stone-200 dark:border-white/5 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-stone-500">{getLocalizedText("Fayl nomi va hajmi:")}</span>
              <span className="font-mono text-stone-800 dark:text-stone-200">
                Asaka-Ziyo-v1.0.0.apk ({ASAKA_ZIYO_APK_RELEASE.fileSizeDisplay})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">{getLocalizedText("Paket nomi:")}</span>
              <span className="font-mono text-stone-800 dark:text-stone-200">
                {ASAKA_ZIYO_APK_RELEASE.packageId}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">{getLocalizedText("Oflayn ishlash:")}</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                {getLocalizedText("100% internet talab qilmaydi")}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={() => triggerApkDownload()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#c5a869] text-[#071614] text-xs font-bold hover:bg-[#d8bd7e] transition-all shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{getLocalizedText("APK Version 1 Yuklab Olish")}</span>
            </button>

            {onOpenInstallModal && (
              <button
                onClick={onOpenInstallModal}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#c5a869]/50 text-stone-700 dark:text-stone-300 text-xs font-semibold hover:border-[#c5a869] transition-all cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-[#c5a869]" />
                <span>{getLocalizedText("Oʻrnatish Yoʻriqnomasi")}</span>
              </button>
            )}
          </div>
        </Card>

        {/* 7. Regional & Architecture Information */}
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
              <span className="font-semibold">ASAKA ZIYO v2.0 · Multilingual 5-Locale</span>
            </div>
          </div>

          <div className="pt-2">
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
