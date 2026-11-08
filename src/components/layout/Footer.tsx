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
    <footer className="w-full border-t border-[#E2D9C5] dark:border-[#124237] bg-[#F1EBDD]/90 dark:bg-[#031814] text-[#3E524B] dark:text-[#9BB5AC] py-14 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Col 1: Brand & Regional Identity */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#063D32] to-[#042B25] flex items-center justify-center border border-[#C6A45C]/45 shadow-md">
                <IslamicStarEmblem size={17} className="text-[#C6A45C]" />
              </div>
              <span className="font-display text-lg font-bold text-[#0F241E] dark:text-[#F8F5EC] tracking-wider">
                {t('common:appName', 'ASAKA ZIYO')}
              </span>
            </div>
            <p className="text-xs text-[#3E524B] dark:text-[#9BB5AC] leading-relaxed max-w-xs">
              {t(
                'home:heroSubtitle',
                'Asaka shahri va Fargʻona vodiysi ahli uchun moʻljallangan ilmiy-maʼrifiy, islomiy raqamli platforma.'
              )}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-[#063D32] dark:text-[#C6A45C] font-semibold">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{t('common:location', 'Asaka shahri, Andijon viloyati')}</span>
            </div>

            <div className="pt-2 space-y-1.5">
              <span className="text-[11px] font-semibold tracking-wide text-[#6C7C73] dark:text-[#8FA199] block">
                Rasmiy Telegram Kanallar
              </span>
              <div className="flex flex-col gap-1 text-xs">
                <a
                  href="https://t.me/Asaka_Ziyo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#064e3b] dark:text-emerald-400 hover:underline font-medium"
                >
                  <span>@Asaka_Ziyo</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
                <a
                  href="https://t.me/muhiddinsahhofuz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#8f6f2b] dark:text-[#c5a869] hover:underline font-medium"
                >
                  <span>@muhiddinsahhofuz</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              </div>
            </div>
          </div>

          {/* Col 2: Spiritual Sources */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#14221B] dark:text-[#F4F1EA] mb-3.5">
              {t('home:libraryKicker', 'Ilmiy-diniy manbalar')}
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button
                  onClick={() => onSelectTab('quran')}
                  className="hover:text-[#064e3b] dark:hover:text-[#c5a869] transition-colors cursor-pointer"
                >
                  {t('navigation:quran', 'Qurʼoni Karim')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('hadith')}
                  className="hover:text-[#064e3b] dark:hover:text-[#c5a869] transition-colors cursor-pointer"
                >
                  {t('navigation:hadith', 'Hadislar toʻplami')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('dhikr')}
                  className="hover:text-[#064e3b] dark:hover:text-[#c5a869] transition-colors cursor-pointer"
                >
                  {t('navigation:dhikr', 'Zikr va duolar')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('articles')}
                  className="hover:text-[#064e3b] dark:hover:text-[#c5a869] transition-colors cursor-pointer"
                >
                  {t('navigation:articles', 'Ilmiy maqolalar')}
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Community & Mosque */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#14221B] dark:text-[#F4F1EA] mb-3.5">
              {t('home:announcementsTitle', 'Shahar va Jamoat')}
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button
                  onClick={() => onSelectTab('prayer')}
                  className="hover:text-[#064e3b] dark:hover:text-[#c5a869] transition-colors cursor-pointer"
                >
                  {t('navigation:prayer', 'Namoz vaqtlari jadvali')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('announcements')}
                  className="hover:text-[#064e3b] dark:hover:text-[#c5a869] transition-colors cursor-pointer"
                >
                  {t('navigation:announcements', 'Eʼlonlar')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('news')}
                  className="hover:text-[#064e3b] dark:hover:text-[#c5a869] transition-colors cursor-pointer"
                >
                  {t('navigation:news', 'Yangiliklar')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('favorites')}
                  className="hover:text-[#064e3b] dark:hover:text-[#c5a869] transition-colors cursor-pointer"
                >
                  {t('navigation:favorites', 'Sevimlilar')}
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: System and Admin */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#14221B] dark:text-[#F4F1EA] mb-3.5">
              {t('navigation:admin', 'Tizim va Maʼmuriyat')}
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button
                  onClick={() => onSelectTab('admin')}
                  className="hover:text-[#064e3b] dark:hover:text-[#c5a869] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>{t('navigation:admin', 'Maʼmuriyat konsoli')}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('settings')}
                  className="hover:text-[#064e3b] dark:hover:text-[#c5a869] transition-colors cursor-pointer"
                >
                  {t('navigation:settings', 'Sozlamalar')}
                </button>
              </li>
              <li className="pt-2 space-y-1 text-[11px] text-[#6C7C73] dark:text-[#8FA199] font-mono-numbers">
                <div>UTC+5 · Asia/Tashkent</div>
                <div>Qibla: 241° (WSW)</div>
              </li>
            </ul>
          </div>
        </div>

        {/* Quiet copyright */}
        <div className="pt-7 border-t border-stone-200/90 dark:border-emerald-950/70 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6C7C73] dark:text-[#8FA199]">
          <p>© {new Date().getFullYear()} ASAKA ZIYO. Barcha huquqlar himoyalangan.</p>
          <div className="flex items-center gap-3">
            <span>{t('common:appTagline')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
