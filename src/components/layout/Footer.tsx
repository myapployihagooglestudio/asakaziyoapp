import React from 'react';
import { NavigationTab } from '../../types';
import { IslamicStarEmblem } from '../ui/GeometricPattern';
import { MapPin, BookOpen, Compass, Shield, Heart } from 'lucide-react';

interface FooterProps {
  onSelectTab: (tab: NavigationTab) => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectTab }) => {
  return (
    <footer className="w-full border-t border-stone-200 dark:border-emerald-950/80 bg-stone-100/60 dark:bg-[#05110f] text-stone-600 dark:text-stone-400 py-12 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Col 1: Brand & Regional Identity */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-950/40 flex items-center justify-center border border-[#c5a869]/30">
                <IslamicStarEmblem size={16} className="text-[#c5a869]" />
              </div>
              <span className="font-display text-lg font-bold text-stone-900 dark:text-stone-100 tracking-wider">
                ASAKA ZIYO
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              Asaka shahri va Fargʻona vodiysi ahli uchun moʻljallangan ilmiy-maʼrifiy, islomiy raqamli platforma.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-[#c5a869]">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>Asaka shahri, Andijon viloyati</span>
            </div>
          </div>

          {/* Col 2: Asosiy bo'limlar */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-900 dark:text-stone-200 mb-3">
              Ilmiy-diniy manbalar
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onSelectTab('quran')}
                  className="hover:text-[#c5a869] transition-colors cursor-pointer"
                >
                  Qurʼoni Karim (Tilovat va tarjima)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('hadith')}
                  className="hover:text-[#c5a869] transition-colors cursor-pointer"
                >
                  Sahihi Buxoriy va Hadislar toʻplami
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('dhikr')}
                  className="hover:text-[#c5a869] transition-colors cursor-pointer"
                >
                  Zikr va duolar (Hisnul Muslim)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('articles')}
                  className="hover:text-[#c5a869] transition-colors cursor-pointer"
                >
                  Tahririy maqolalar va hikmatlar
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Shahar va jamoat */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-900 dark:text-stone-200 mb-3">
              Shahar va Jamoat
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onSelectTab('prayer')}
                  className="hover:text-[#c5a869] transition-colors cursor-pointer"
                >
                  Asaka namoz vaqtlari jadvali
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('announcements')}
                  className="hover:text-[#c5a869] transition-colors cursor-pointer"
                >
                  Masjid eʼlonlari va juma maʼruzalari
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('news')}
                  className="hover:text-[#c5a869] transition-colors cursor-pointer"
                >
                  Diniy-maʼrifiy yangiliklar
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('favorites')}
                  className="hover:text-[#c5a869] transition-colors cursor-pointer"
                >
                  Saqlangan oyat va duolar
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Tizim me'moriyati */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-900 dark:text-stone-200 mb-3">
              Tizim va Maʼmuriyat
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onSelectTab('admin')}
                  className="hover:text-[#c5a869] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Maʼmuriyat konsoli (Kirish)</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectTab('settings')}
                  className="hover:text-[#c5a869] transition-colors cursor-pointer"
                >
                  Tizim sozlamalari va shriftlar
                </button>
              </li>
              <li className="pt-2">
                <span className="text-[11px] text-stone-400 dark:text-stone-500 block">
                  Vaqt mintaqasi: Asia/Tashkent (UTC+5)
                </span>
                <span className="text-[11px] text-stone-400 dark:text-stone-500 block">
                  Qibla yoʻnalishi: 241° (Gʻarb-Janubi-Gʻarb)
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Quiet copyright & attribution */}
        <div className="pt-8 border-t border-stone-200 dark:border-emerald-950/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500 dark:text-stone-500">
          <p>© {new Date().getFullYear()} ASAKA ZIYO. Barcha huquqlar himoyalangan.</p>
          <div className="flex items-center gap-4">
            <span className="text-stone-400 dark:text-stone-600">·</span>
            <span>Islomiy qadriyatlar va ilmiy meros uygʻunligi</span>
            <span className="text-stone-400 dark:text-stone-600">·</span>
            <span className="text-[#c5a869]/80">Phase 1 Foundation</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
