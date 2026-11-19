import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavigationTab } from '../../types';
import { IslamicStarEmblem } from '../ui/GeometricPattern';
import { MapPin, Shield, ExternalLink } from 'lucide-react';

interface FooterProps {
  onSelectTab: (tab: NavigationTab) => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectTab }) => {
  const { t } = useTranslation(['navigation', 'common', 'home']);

  return (
    <footer className="relative w-full border-t border-[#063D32]/15 dark:border-[#DFBD69]/28 bg-[#F1EBDD]/95 dark:bg-[#010906] text-[#1E3F35] dark:text-[#9CB5AC] py-14 transition-colors overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Col 1: Brand & Regional Identity */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#DFBD69]/85 shadow-md shrink-0 bg-white">
                <img
                  src="/assets/aistudio/IMG_20261114_084331_924_8f6ccba1.jpg"
                  alt="ASAKA ZIYO — MuhammadSolih Hoji Jome Masjidi Rasmiy Logosi"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <span className="font-display text-lg font-extrabold text-[#03170F] dark:text-[#FFF8E8] tracking-wider block leading-tight">
                  {t('common:appName', 'ASAKA ZIYO')}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A6621] dark:text-[#DFBD69]">
                  «MuhammadSolih Hoji» Jomeʼ Masjidi
                </span>
              </div>
            </div>
            <p className="text-xs text-[#1E3F35] dark:text-[#9CB5AC] leading-relaxed max-w-xs">
              {t(
                'home:heroSubtitle',
                'Oʻzbekiston Musulmonlari Idorasi · Andijon viloyati, Asaka tumani «MuhammadSolih Hoji» jomeʼ masjidi rasmiy ilmiy-maʼrifiy raqamli ekotizimi.'
              )}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-[#063D32] dark:text-[#DFBD69] font-bold">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{t('common:location', 'Asaka shahri, Andijon viloyati')}</span>
            </div>

            <div className="pt-2 space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#526B62] dark:text-[#DFBD69]/80 block">
                Rasmiy Telegram Kanallar
              </span>
              <div className="flex flex-col gap-1 text-xs">
                <a
                  href="https://t.me/Asaka_Ziyo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#063D32] dark:text-emerald-400 hover:underline font-semibold"
                >
                  <span>@Asaka_Ziyo</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
                <a
                  href="https://t.me/muhiddinsahhofuz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#8A6621] dark:text-[#DFBD69] hover:underline font-semibold"
                >
                  <span>@muhiddinsahhofuz</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              </div>
            </div>
          </div>

          {/* Col 2: Spiritual Sources */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#03170F] dark:text-[#FFF8E8] mb-3.5">
              {t('home:libraryKicker', 'Ilmiy-diniy manbalar')}
            </h4>
            <ul className="space-y-2.5 text-xs font-medium">
              <li>
                <button
                  onClick={() => onSelectTab('quran')}
                  className="hover:text-[#063D32] dark:hover:text-[#DFBD69] transition-colors cursor-pointer"
                >
                  {t('navigation:quran', 'Qurʼoni Karim')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('quran_quiz')}
                  className="hover:text-[#063D32] dark:hover:text-[#DFBD69] transition-colors cursor-pointer"
                >
                  Qurʼon Viktorinasi (9:16 Shorts)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('hadith')}
                  className="hover:text-[#063D32] dark:hover:text-[#DFBD69] transition-colors cursor-pointer"
                >
                  {t('navigation:hadith', 'Hadislar toʻplami')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('dhikr')}
                  className="hover:text-[#063D32] dark:hover:text-[#DFBD69] transition-colors cursor-pointer"
                >
                  {t('navigation:dhikr', 'Zikr va duolar')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('articles')}
                  className="hover:text-[#063D32] dark:hover:text-[#DFBD69] transition-colors cursor-pointer"
                >
                  {t('navigation:articles', 'Ilmiy maqolalar')}
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Community & Mosque */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#03170F] dark:text-[#FFF8E8] mb-3.5">
              {t('home:announcementsTitle', 'Shahar va Jamoat')}
            </h4>
            <ul className="space-y-2.5 text-xs font-medium">
              <li>
                <button
                  onClick={() => onSelectTab('prayer')}
                  className="hover:text-[#063D32] dark:hover:text-[#DFBD69] transition-colors cursor-pointer"
                >
                  {t('navigation:prayer', 'Namoz vaqtlari jadvali')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('announcements')}
                  className="hover:text-[#063D32] dark:hover:text-[#DFBD69] transition-colors cursor-pointer"
                >
                  {t('navigation:announcements', 'Eʼlonlar')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('news')}
                  className="hover:text-[#063D32] dark:hover:text-[#DFBD69] transition-colors cursor-pointer"
                >
                  {t('navigation:news', 'Yangiliklar')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('favorites')}
                  className="hover:text-[#063D32] dark:hover:text-[#DFBD69] transition-colors cursor-pointer"
                >
                  {t('navigation:favorites', 'Sevimlilar')}
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: System and Admin */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#03170F] dark:text-[#FFF8E8] mb-3.5">
              {t('navigation:admin', 'Tizim va Maʼmuriyat')}
            </h4>
            <ul className="space-y-2.5 text-xs font-medium">
              <li>
                <button
                  onClick={() => onSelectTab('admin')}
                  className="hover:text-[#063D32] dark:hover:text-[#DFBD69] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5 text-[#DFBD69]" />
                  <span>{t('navigation:admin', 'Maʼmuriyat konsoli')}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('settings')}
                  className="hover:text-[#063D32] dark:hover:text-[#DFBD69] transition-colors cursor-pointer"
                >
                  {t('navigation:settings', 'Sozlamalar')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('asaka-open-privacy-modal'))}
                  className="hover:text-[#063D32] dark:hover:text-[#DFBD69] transition-colors cursor-pointer"
                >
                  Maxfiylik siyosati (Privacy Policy)
                </button>
              </li>
              <li>
                <a
                  href="/delete-account"
                  className="hover:text-[#063D32] dark:hover:text-[#DFBD69] transition-colors inline-flex items-center gap-1"
                >
                  <span>Akkauntni oʻchirish</span>
                </a>
              </li>
              <li className="pt-2 space-y-1 text-[11px] text-[#526B62] dark:text-[#9CB5AC] font-mono-numbers">
                <div>UTC+5 · Asia/Tashkent</div>
                <div>Qibla: 241° (WSW)</div>
              </li>
            </ul>
          </div>
        </div>

        {/* Quiet copyright */}
        <div className="pt-7 border-t border-[#063D32]/12 dark:border-[#DFBD69]/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#526B62] dark:text-[#9CB5AC]">
          <p>© {new Date().getFullYear()} ASAKA ZIYO. Barcha huquqlar himoyalangan.</p>
          <div className="flex flex-wrap items-center gap-4 font-semibold text-[#8A6621] dark:text-[#DFBD69]">
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:underline">
              Maxfiylik siyosati
            </a>
            <span>{t('common:appTagline')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

