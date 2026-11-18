import React, { useState } from 'react';
import { Modal } from '../../ui/Modal';
import { Shield, Lock, Trash2, Mail, Globe, CheckCircle2, FileText } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAccountDelete?: () => void;
}

type PolicyLang = 'uz' | 'ru' | 'en';

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
  onOpenAccountDelete,
}) => {
  const [lang, setLang] = useState<PolicyLang>('uz');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ASAKA ZIYO — Maxfiylik Siyosati & Maʼlumotlar Xavfsizligi"
      subtitle="«MuhammadSolih Hoji» jomeʼ masjidi rasmiy ilovasi · Google Play Data Safety"
      maxWidth="2xl"
    >
      <div className="space-y-5 text-xs sm:text-sm text-stone-700 dark:text-stone-200 leading-relaxed">
        {/* Language switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-emerald-950">
          <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
            <Globe className="w-4 h-4 text-[#DFBD69]" />
            <span>Tilni tanlang / Язык / Language:</span>
          </div>
          <div className="flex items-center gap-1.5">
            {[
              { id: 'uz' as const, label: 'Oʻzbekcha' },
              { id: 'ru' as const, label: 'Русский' },
              { id: 'en' as const, label: 'English' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setLang(item.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  lang === item.id
                    ? 'bg-[#DFBD69] text-[#010906] shadow-sm'
                    : 'bg-stone-100 dark:bg-white/5 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-white/10'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {lang === 'uz' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-950/10 dark:bg-emerald-950/50 border border-emerald-500/25 space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#063D32] dark:text-[#DFBD69]">
                <Shield className="w-4 h-4" />
                <span>1. Umumiy Qoidalar va Yigʻiladigan Maʼlumotlar</span>
              </div>
              <p>
                <strong>ASAKA ZIYO</strong> — Oʻzbekiston Musulmonlari Idorasi, Andijon viloyati Asaka tumani
                «MuhammadSolih Hoji» jomeʼ masjidi rasmiy ilmiy-maʼrifiy ilovasidir. Biz foydalanuvchilar
                maxfiyligini qadrlaymiz va Google Play User Data siyosatiga toʻliq amal qilamiz.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>
                  <strong>Ixtiyoriy Akkaunt:</strong> Email, ism va profil surati (faqat foydalanuvchi Google yoki Email
                  orqali roʻyxatdan oʻtsa saqlanadi; ilovaning 95% qismidan mehmon sifatida foydalanish mumkin).
                </li>
                <li>
                  <strong>Shaxsiy Ibadat Yozuvlari:</strong> Sevimli oyatlar, Qurʼon xatmi rejasi, namoz kundaligi va
                  zikr hisoblagichi qurilmada yoki foydalanuvchi roziligi bilan Firebase bulutida saqlanadi.
                </li>
                <li>
                  <strong>Joylashuv (Ixtiyoriy):</strong> Faqat ilova ochiq paytda Asaka/mahalliy namoz vaqtlari va 241°
                  Qibla yoʻnalishini hisoblash uchun ishlatiladi; orqa fonda kuzatilmaydi va serverga sotilmaydi.
                </li>
                <li>
                  <strong>Kamera, Mikrofon va Media:</strong> Faqat siz profil rasmi, ovozli savol/qidiruv yoki MP4
                  viktorina saqlash tugmasini bosganingizda ishlatiladi. Barcha maʼlumotlar HTTPS/TLS orqali shifrlanadi.
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-stone-100 dark:bg-black/30 border border-stone-200 dark:border-white/10 space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#063D32] dark:text-[#DFBD69]">
                <Lock className="w-4 h-4" />
                <span>2. Uchinchi Tomon Xizmatlari va Reklama Yoʻqligi</span>
              </div>
              <p className="text-xs">
                Ilovada uchinchi tomon reklamalari, reklama SDK-lari (AdMob/Ads) yoki yashirin kuzatuv trekerlari yoʻq.
                Foydalanuvchi maʼlumotlari hech qachon sotilmaydi. Cloud autentifikatsiya va saqlash uchun Google
                Firebase, Qurʼon audiosi uchun EveryAyah / rasmiy masjid serverlari ishlatiladi.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-600 dark:text-rose-300">
                <Trash2 className="w-4 h-4" />
                <span>3. Akkaunt va Shaxsiy Maʼlumotlarni Oʻchirish</span>
              </div>
              <p className="text-xs">
                Istalgan vaqtda «Shaxsiy Profil → Akkauntni Butunlay Oʻchirish» boʻlimi orqali yoki{' '}
                <a href="/delete-account" className="underline font-bold">
                  /delete-account
                </a>{' '}
                sahifasi hamda <strong>asakaziyo0@gmail.com</strong> pochtasi orqali barcha shaxsiy maʼlumotlaringizni
                butunlay oʻchirib tashlashingiz mumkin.
              </p>
            </div>
          </div>
        )}

        {lang === 'ru' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-950/10 dark:bg-emerald-950/50 border border-emerald-500/25 space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#063D32] dark:text-[#DFBD69]">
                <Shield className="w-4 h-4" />
                <span>1. Политика конфиденциальности и сбор данных</span>
              </div>
              <p>
                <strong>ASAKA ZIYO</strong> — официальное образовательно-просветительское приложение соборной мечети
                «МухаммадСолих Ходжи» (г. Асака, Андижанская область). Мы строго соблюдаем политику Google Play в
                отношении данных пользователей.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>
                  <strong>Аккаунт (по желанию):</strong> Email и имя сохраняются только при входе через Google или
                  Email; приложение полностью работает и в гостевом режиме.
                </li>
                <li>
                  <strong>Геолокация:</strong> Используется только при открытом приложении для расчёта времени
                  намаза и направления Киблы; не отслеживается в фоне и не передаётся рекламным сетям.
                </li>
                <li>
                  <strong>Камера, микрофон и медиа:</strong> Запрашиваются строго по действию пользователя (аватар,
                  голосовой вопрос/поиск, экспорт MP4 викторины через Android Photo Picker / Scoped MediaStore).
                </li>
                <li>
                  <strong>Без рекламы:</strong> Приложение не содержит рекламных SDK и не продаёт данные третьим лицам.
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-600 dark:text-rose-300">
                <Trash2 className="w-4 h-4" />
                <span>2. Удаление аккаунта и данных</span>
              </div>
              <p className="text-xs">
                Вы можете навсегда удалить аккаунт и связанные данные в разделе «Профиль → Удалить аккаунт» или по
                ссылке{' '}
                <a href="/delete-account" className="underline font-bold">
                  /delete-account
                </a>{' '}
                и по адресу <strong>asakaziyo0@gmail.com</strong>.
              </p>
            </div>
          </div>
        )}

        {lang === 'en' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-950/10 dark:bg-emerald-950/50 border border-emerald-500/25 space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#063D32] dark:text-[#DFBD69]">
                <Shield className="w-4 h-4" />
                <span>1. Privacy Policy & Google Play Data Safety</span>
              </div>
              <p>
                <strong>ASAKA ZIYO</strong> is the official Islamic educational & community companion of «MuhammadSolih
                Hoji» Jome Mosque (Asaka, Andijan, Uzbekistan). We adhere strictly to Google Play User Data &
                Permissions policies.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>
                  <strong>Optional Account Info:</strong> Email and display name are collected only if you sign in via
                  Google or Email/Password; core features work without creating an account.
                </li>
                <li>
                  <strong>Foreground Location Only:</strong> Used solely on request to verify local prayer times and
                  Qibla direction; never collected in the background.
                </li>
                <li>
                  <strong>Minimal Permissions:</strong> Camera (profile capture), Microphone (voice search/questions),
                  Notifications (prayer/adhan alerts), and system Photo Picker (no broad gallery read permissions).
                </li>
                <li>
                  <strong>Encryption & Zero Ads:</strong> All network transfers use HTTPS/TLS. Zero third-party ads or
                  data selling.
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-600 dark:text-rose-300">
                <Trash2 className="w-4 h-4" />
                <span>2. Account & Data Deletion</span>
              </div>
              <p className="text-xs">
                Users may permanently delete their account and personal cloud records at any time from Profile settings
                or via{' '}
                <a href="/delete-account" className="underline font-bold">
                  /delete-account
                </a>{' '}
                and <strong>asakaziyo0@gmail.com</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Footer action strip */}
        <div className="pt-3 border-t border-stone-200 dark:border-emerald-950 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400">
            <Mail className="w-3.5 h-3.5 text-[#DFBD69]" />
            <span>Aloqa: asakaziyo0@gmail.com</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-300 dark:border-white/15 font-semibold hover:border-[#DFBD69]"
            >
              <FileText className="w-3.5 h-3.5 text-[#DFBD69]" />
              <span>Public URL (/privacy)</span>
            </a>
            {onOpenAccountDelete && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAccountDelete();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-500 dark:text-rose-300 font-bold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Akkauntni oʻchirish</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#DFBD69] text-[#010906] font-bold cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Yopish</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
