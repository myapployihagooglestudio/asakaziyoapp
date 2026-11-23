import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavigationTab } from '../../types';
import { MapPin, Shield, ExternalLink } from 'lucide-react';

interface FooterProps {
  onSelectTab: (tab: NavigationTab) => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectTab }) => {
  const { t } = useTranslation(['navigation', 'common', 'home']);

  return (
    <footer className="relative w-full border-t border-[#064E3B]/10 dark:border-white/[0.07] bg-[#F2EFE9]/80 dark:bg-[#050908] text-[#334F46] dark:text-[#8FA69D] py-14 pb-28 lg:pb-14 transition-colors overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Col 1: Brand & Regional Identity */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl overflow-hidden ring-1 ring-[#064E3B]/15 dark:ring-white/15 shrink-0 bg-white">
                <img
                  src="/assets/aistudio/IMG_20261114_084331_924_8f6ccba1.jpg"
                  alt="ASAKA ZIYO"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <span className="font-display text-base font-extrabold text-[#0B1B16] dark:text-[#F7F5F0] tracking-[-0.02em] block leading-tight">
                  {t('common:appName', 'ASAKA ZIYO')}
                </span>
                <span className="text-[11px] font-medium text-[#5F776F] dark:text-[#8FA69D]">
                  «MuhammadSolih Hoji» Jomeʼ Masjidi
                </span>
              </div>
            </div>
            <p className="text-xs leading-relaxed max-w-xs">
              {t(
                'home:heroSubtitle',
                'Andijon viloyati, Asaka tumani «MuhammadSolih Hoji» jomeʼ masjidi rasmiy ilmiy-maʼrifiy raqamli ekotizimi.'
              )}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-[#064E3B] dark:text-emerald-400 font-semibold">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{t('common:location', 'Asaka shahri, Andijon viloyati')}</span>
            </div>

            <div className="pt-1 flex flex-wrap gap-3 text-xs">
              <a
                href="https://t.me/Asaka_Ziyo"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#064E3B] dark:text-emerald-400 hover:underline font-semibold"
              >
                <span>@Asaka_Ziyo</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
              <a
                href="https://t.me/muhiddinsahhofuz"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#8A6B2D] dark:text-[#C8A85E] hover:underline font-semibold"
              >
                <span>@muhiddinsahhofuz</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
            </div>
          </div>

          {/* Col 2: Spiritual Sources */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B1B16] dark:text-[#F7F5F0] mb-3.5">
              {t('home:libraryKicker', 'Ilmiy-diniy manbalar')}
            </h4>
            <ul className="space-y-2.5 text-xs font-medium">
              {[
                { id: 'quran' as NavigationTab, label: t('navigation:quran', 'Qurʼoni Karim') },
                { id: 'hifz_istiqomat' as NavigationTab, label: 'Hifz va Murojaʼa' },
                { id: 'hadith' as NavigationTab, label: t('navigation:hadith', 'Hadislar toʻplami') },
                { id: 'dhikr' as NavigationTab, label: t('navigation:dhikr', 'Zikr va duolar') },
                { id: 'articles' as NavigationTab, label: t('navigation:articles', 'Ilmiy maqolalar') },
              ].map((link) => (
                <li key={link.id}>
                  <button
                    type="button"
                    onClick={() => onSelectTab(link.id)}
                    className="hover:text-[#064E3B] dark:hover:text-white transition-colors cursor-pointer"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Community & Mosque */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B1B16] dark:text-[#F7F5F0] mb-3.5">
              {t('home:announcementsTitle', 'Shahar va Jamoat')}
            </h4>
            <ul className="space-y-2.5 text-xs font-medium">
              {[
                { id: 'prayer' as NavigationTab, label: t('navigation:prayer', 'Namoz vaqtlari jadvali') },
                { id: 'mosques' as NavigationTab, label: 'Masjidlar va Qibla' },
                { id: 'announcements' as NavigationTab, label: t('navigation:announcements', 'Eʼlonlar') },
                { id: 'news' as NavigationTab, label: t('navigation:news', 'Yangiliklar') },
                { id: 'favorites' as NavigationTab, label: t('navigation:favorites', 'Sevimlilar') },
              ].map((link) => (
                <li key={link.id}>
                  <button
                    type="button"
                    onClick={() => onSelectTab(link.id)}
                    className="hover:text-[#064E3B] dark:hover:text-white transition-colors cursor-pointer"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: System and Admin */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B1B16] dark:text-[#F7F5F0] mb-3.5">
              {t('navigation:admin', 'Tizim va Maʼmuriyat')}
            </h4>
            <ul className="space-y-2.5 text-xs font-medium">
              <li>
                <button
                  type="button"
                  onClick={() => onSelectTab('admin')}
                  className="hover:text-[#064E3B] dark:hover:text-white transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5 text-[#C8A85E]" />
                  <span>{t('navigation:admin', 'Maʼmuriyat konsoli')}</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onSelectTab('settings')}
                  className="hover:text-[#064E3B] dark:hover:text-white transition-colors cursor-pointer"
                >
                  {t('navigation:settings', 'Sozlamalar')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('asaka-open-privacy-modal'))}
                  className="hover:text-[#064E3B] dark:hover:text-white transition-colors cursor-pointer"
                >
                  Maxfiylik siyosati
                </button>
              </li>
              <li>
                <a
                  href="/delete-account"
                  className="hover:text-[#064E3B] dark:hover:text-white transition-colors"
                >
                  Akkauntni oʻchirish
                </a>
              </li>
              <li className="pt-2 space-y-1 text-[11px] text-[#5F776F] dark:text-[#7D968D] font-mono-numbers">
                <div>UTC+5 · Asia/Tashkent</div>
                <div>Qibla: 241° (WSW)</div>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-[#064E3B]/10 dark:border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5F776F] dark:text-[#7D968D]">
          <p>© {new Date().getFullYear()} ASAKA ZIYO. Barcha huquqlar himoyalangan.</p>
          <div className="flex flex-wrap items-center gap-4 font-medium">
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
