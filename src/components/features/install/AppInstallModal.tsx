import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { IslamicStarEmblem } from '../../ui/GeometricPattern';
import { usePWAInstall } from '../../../hooks/usePWAInstall';
import {
  ASAKA_ZIYO_APK_RELEASE,
  triggerApkDownload,
} from '../../../utils/apkPackage';
import { toNewUzbekAlphabet } from '../../../utils/newUzbekAlphabet';
import { SupportedLocale } from '../../../types';
import {
  Download,
  Smartphone,
  CheckCircle2,
  Copy,
  Check,
  Share2,
  PlusSquare,
  ShieldCheck,
  Wifi,
  WifiOff,
  ExternalLink,
  Info,
  Layers,
} from 'lucide-react';

interface AppInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppInstallModal: React.FC<AppInstallModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t, i18n } = useTranslation(['common', 'settings']);
  const currentLocale = (i18n.language as SupportedLocale) || 'uz-Latn';

  const { isInstallable, isInstalled, isIOS, isAndroid, promptInstall, isOnline } =
    usePWAInstall();

  const [activeTab, setActiveTab] = useState<'apk' | 'pwa' | 'features'>('apk');
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  const getLocalized = (text: string) => {
    if (currentLocale === 'uz-Latn-new') {
      return toNewUzbekAlphabet(text);
    }
    return text;
  };

  const handleDownloadAPK = () => {
    setDownloadStarted(true);
    triggerApkDownload();
    setTimeout(() => {
      setDownloadStarted(false);
    }, 4000);
  };

  const handleCopyHash = () => {
    navigator.clipboard?.writeText(ASAKA_ZIYO_APK_RELEASE.sha256Checksum);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2500);
  };

  const handlePromptInstall = async () => {
    const success = await promptInstall();
    if (success) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getLocalized("Asaka Ziyo Ilovasini Oʻrnatish")}
      subtitle={getLocalized("Android APK Version 1.0 va Bosh ekranga tezkor oʻrnatish")}
      size="lg"
    >
      <div className="space-y-6 text-stone-800 dark:text-stone-200">
        {/* App identity showcase */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-[#071614] to-emerald-950/20 border border-[#c5a869]/30">
          <div className="w-16 h-16 rounded-2xl bg-[#031d17] border border-[#c5a869]/40 flex items-center justify-center shrink-0 shadow-lg">
            <IslamicStarEmblem size={32} className="text-[#c5a869]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg font-bold text-white tracking-wide truncate">
                ASAKA ZIYO
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-[#c5a869] text-[#071614]">
                v1.0.0 APK
              </span>
            </div>
            <p className="text-xs text-stone-300 line-clamp-1 mt-0.5">
              {getLocalized("Asaka shahri va mintaqa uchun ilmiy-maʼrifiy ekotizim")}
            </p>
            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#c5a869] font-mono-numbers">
              <span>{ASAKA_ZIYO_APK_RELEASE.fileSizeDisplay}</span>
              <span>·</span>
              <span>{ASAKA_ZIYO_APK_RELEASE.packageId}</span>
              <span>·</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-3 h-3" />
                {getLocalized("Oflayn tayyor")}
              </span>
            </div>
          </div>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-stone-200 dark:border-emerald-950/80 gap-2">
          <button
            onClick={() => setActiveTab('apk')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'apk'
                ? 'border-[#c5a869] text-[#c5a869]'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>APK Version 1.0 (Android)</span>
          </button>
          <button
            onClick={() => setActiveTab('pwa')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pwa'
                ? 'border-[#c5a869] text-[#c5a869]'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>{getLocalized("Bosh ekranga oʻrnatish (PWA)")}</span>
          </button>
          <button
            onClick={() => setActiveTab('features')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'features'
                ? 'border-[#c5a869] text-[#c5a869]'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{getLocalized("Imkoniyatlar")}</span>
          </button>
        </div>

        {/* TAB 1: APK DOWNLOAD */}
        {activeTab === 'apk' && (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/30 text-xs text-stone-300 space-y-3">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-[#c5a869] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-stone-900 dark:text-stone-100 text-sm">
                    {getLocalized("Toʻgʻridan-toʻgʻri rasmiy APK Version 1")}
                  </h4>
                  <p className="text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
                    {getLocalized(
                      "Google Studio yoki Bolt.new web ilovalaridan mustaqil ravishda smartfoningizga doimiy oʻrnatiladi. 100% oflayn ishlaydi, internet talab qilmaydi."
                    )}
                  </p>
                </div>
              </div>

              {/* Main Download CTA */}
              <div className="pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleDownloadAPK}
                  disabled={downloadStarted}
                  className="w-full justify-center text-sm font-bold tracking-wide py-3.5 shadow-lg shadow-[#c5a869]/10"
                >
                  <Download className={`w-5 h-5 mr-2 ${downloadStarted ? 'animate-bounce' : ''}`} />
                  {downloadStarted
                    ? getLocalized("Yuklab olinmoqda...")
                    : getLocalized("APK Version 1 Yuklab olish (8.4 MB)")}
                </Button>
              </div>

              {downloadStarted && (
                <div className="text-center text-xs text-[#c5a869] font-medium animate-pulse">
                  {getLocalized("Fayl yuklanmoqda... Yuklab boʻlingach uni oching va oʻrnating.")}
                </div>
              )}
            </div>

            {/* Install steps guide */}
            <div className="space-y-3">
              <h5 className="text-xs uppercase font-bold text-stone-500 tracking-wider">
                {getLocalized("Telefonga oʻrnatish boʻyicha 3 ta oson qadam")}
              </h5>
              <div className="space-y-2.5">
                {ASAKA_ZIYO_APK_RELEASE.installStepsUz.map((s) => (
                  <div
                    key={s.step}
                    className="flex items-start gap-3 p-3 rounded-xl bg-stone-100/70 dark:bg-white/5 border border-stone-200 dark:border-white/5"
                  >
                    <span className="w-6 h-6 rounded-full bg-[#c5a869] text-[#071614] font-bold text-xs flex items-center justify-center shrink-0">
                      {s.step}
                    </span>
                    <div className="text-xs">
                      <div className="font-bold text-stone-900 dark:text-stone-100">
                        {getLocalized(s.title)}
                      </div>
                      <div className="text-stone-500 dark:text-stone-400 mt-0.5 leading-relaxed">
                        {getLocalized(s.desc)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Package details */}
            <div className="p-3.5 rounded-xl border border-stone-200 dark:border-white/5 bg-stone-50 dark:bg-black/20 text-xs space-y-2">
              <div className="flex justify-between items-center text-stone-500 dark:text-stone-400">
                <span>{getLocalized("Paket identifikatori:")}</span>
                <span className="font-mono text-stone-900 dark:text-stone-200">
                  {ASAKA_ZIYO_APK_RELEASE.packageId}
                </span>
              </div>
              <div className="flex justify-between items-center text-stone-500 dark:text-stone-400">
                <span>{getLocalized("Talab qilinadigan tizim:")}</span>
                <span className="text-stone-900 dark:text-stone-200">
                  {ASAKA_ZIYO_APK_RELEASE.minAndroid}
                </span>
              </div>
              <div className="flex justify-between items-center text-stone-500 dark:text-stone-400">
                <span>{getLocalized("Chiqarilgan sana:")}</span>
                <span className="text-stone-900 dark:text-stone-200">
                  {ASAKA_ZIYO_APK_RELEASE.releaseDate}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-stone-200 dark:border-white/5 text-[11px]">
                <span className="text-stone-500 dark:text-stone-400">SHA-256:</span>
                <div className="flex items-center gap-1.5 font-mono text-stone-600 dark:text-stone-300">
                  <span>{ASAKA_ZIYO_APK_RELEASE.sha256Checksum.slice(0, 16)}...</span>
                  <button
                    onClick={handleCopyHash}
                    className="p-1 hover:text-[#c5a869] transition-colors cursor-pointer"
                    title="Nusxa olish"
                  >
                    {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PWA WEB APP INSTALL */}
        {activeTab === 'pwa' && (
          <div className="space-y-4">
            {isInstalled ? (
              <div className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="text-base font-bold text-white">
                  {getLocalized("Asaka Ziyo allaqachon oʻrnatilgan")}
                </h4>
                <p className="text-xs text-stone-300 max-w-sm mx-auto">
                  {getLocalized(
                    "Ilova sizning telefoningiz bosh ekranida joylashgan va toʻliq oflayn ishlamoqda."
                  )}
                </p>
              </div>
            ) : isInstallable ? (
              <div className="p-5 rounded-2xl bg-emerald-950/20 border border-[#c5a869]/40 space-y-4">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-8 h-8 text-[#c5a869]" />
                  <div>
                    <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                      {getLocalized("Bir marta bosishda bosh ekranga oʻrnatish")}
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {getLocalized("Brauzer orqali avtomatik tarzda smartfon ilovasi sifatida saqlanadi.")}
                    </p>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handlePromptInstall}
                  className="w-full justify-center text-sm font-bold py-3.5"
                >
                  <Smartphone className="w-5 h-5 mr-2" />
                  {getLocalized("Bosh ekranga oʻrnatish (1-klik)")}
                </Button>
              </div>
            ) : isIOS ? (
              <div className="p-4 rounded-xl bg-stone-100 dark:bg-white/5 border border-stone-200 dark:border-white/10 space-y-3">
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-[#c5a869]" />
                  {getLocalized("iPhone (Safari) uchun oʻrnatish yoʻriqnomasi")}
                </h4>
                <ol className="text-xs text-stone-600 dark:text-stone-300 space-y-2 pl-4 list-decimal">
                  <li>
                    {getLocalized(
                      "Safari brauzerining pastki qismidagi \"Ulashish\" (Share / kvadratdan chiqayotgan o'qcha) tugmasini bosing."
                    )}
                  </li>
                  <li>
                    {getLocalized(
                      "Ochilgan menyuni biroz pastga aylantirib, \"Bosh ekranga qo'shish\" (Add to Home Screen) opsiyasini tanlang."
                    )}
                  </li>
                  <li>
                    {getLocalized(
                      "Yuqori o'ng burchakdagi \"Qo'shish\" (Add) tugmasini bosing. Ilova bosh ekranda paydo bo'ladi."
                    )}
                  </li>
                </ol>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-stone-100 dark:bg-white/5 border border-stone-200 dark:border-white/10 space-y-4">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-8 h-8 text-[#c5a869] shrink-0" />
                  <div>
                    <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                      {getLocalized("Bosh ekranga oʻrnatish")}
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {getLocalized("Ilovani brauzer orqali ekranga qoʻshing yoki toʻgʻridan-toʻgʻri APK Version 1 oʻrnating.")}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handlePromptInstall}
                    className="w-full justify-center text-xs font-bold py-3"
                  >
                    <Smartphone className="w-4 h-4 mr-1.5" />
                    {getLocalized("Ekranga qoʻshishni urinish")}
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    onClick={handleDownloadAPK}
                    className="w-full justify-center text-xs font-bold py-3 border-[#c5a869] text-[#c5a869]"
                  >
                    <Download className="w-4 h-4 mr-1.5" />
                    {getLocalized("APK v1.0 Yuklab olish (8.4MB)")}
                  </Button>
                </div>

                <div className="pt-2 border-t border-stone-200 dark:border-white/10">
                  <h5 className="font-semibold text-xs text-stone-700 dark:text-stone-300 mb-2">
                    {getLocalized("Qoʻlda oʻrnatish boʻyicha yoʻriqnoma:")}
                  </h5>
                  <ol className="text-xs text-stone-600 dark:text-stone-400 space-y-1.5 pl-4 list-decimal">
                    <li>
                      {getLocalized(
                        "Brauzeringiz (Chrome / Samsung / Edge) yuqori yoki pastki menyusidagi ⋮ (uch nuqta) tugmasini bosing."
                      )}
                    </li>
                    <li>
                      {getLocalized(
                        "\"Ilovani oʻrnatish\" yoki \"Bosh ekranga qoʻshish\" (Install app / Add to Home screen) bandini tanlang."
                      )}
                    </li>
                    <li>
                      {getLocalized(
                        "Tasdiqlangandan soʻng, Asaka Ziyo telefoningiz bosh ekranida mustaqil ilova boʻlib ishga tushadi."
                      )}
                    </li>
                  </ol>
                </div>
              </div>
            )}

            {/* Offline status banner */}
            <div className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 dark:border-white/5 bg-stone-50 dark:bg-black/20 text-xs">
              {isOnline ? (
                <>
                  <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-stone-600 dark:text-stone-300">
                    {getLocalized(
                      "Internet faol. Oʻrnatilgan barcha maʼlumotlar oflayn xotiraga yuklab olinmoqda."
                    )}
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-stone-600 dark:text-stone-300">
                    {getLocalized(
                      "Hozir oflayn rejimdasiz. Barcha oldin yuklangan Qurʼon suralari va namoz vaqtlari ishlamoqda."
                    )}
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: FEATURES */}
        {activeTab === 'features' && (
          <div className="space-y-4">
            <h4 className="text-xs uppercase font-bold text-stone-500 tracking-wider">
              {getLocalized("Asaka Ziyo v1.0 imkoniyatlari toʻplami")}
            </h4>
            <div className="grid grid-cols-1 gap-2.5">
              {ASAKA_ZIYO_APK_RELEASE.featuresUz.map((feat, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-stone-100/60 dark:bg-white/5 border border-stone-200 dark:border-white/5 text-xs text-stone-700 dark:text-stone-300"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#c5a869] shrink-0 mt-0.5" />
                  <span>{getLocalized(feat)}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="primary" onClick={handleDownloadAPK}>
                <Download className="w-4 h-4 mr-1.5" />
                {getLocalized("APK Yuklab olish")}
              </Button>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-3 border-t border-stone-200 dark:border-emerald-950/80 text-xs">
          <span className="text-stone-400">
            {getLocalized("Asaka Ziyo Ekotizimi · 2026")}
          </span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t('common:close', 'Yopish')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
