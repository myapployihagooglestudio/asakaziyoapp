import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { GeometricPattern } from '../../ui/GeometricPattern';
import {
  Calendar as CalendarIcon,
  Moon,
  Sparkles,
  Clock,
  Star,
  CheckCircle2,
  Bell,
  Bookmark,
} from 'lucide-react';

interface IslamicEvent {
  id: string;
  titleUz: string;
  hijriDate: string;
  gregorianDate: string;
  descriptionUz: string;
  virtueUz: string;
  category: 'bayram' | 'muborak_kecha' | 'muhim_sana';
}

const ISLAMIC_EVENTS: IslamicEvent[] = [
  {
    id: 'ev-1',
    titleUz: 'Ramazon oyi boshlanishi',
    hijriDate: '1 Ramazon, 1448',
    gregorianDate: 'Taxminan 2027-yil Fevral',
    descriptionUz: 'Olamlarga rahmat boʻlib nozil qilingan Qurʼon oyi, roʻza tutish va savobli amallarni koʻpaytirish oyi.',
    virtueUz: 'Rasululloh ﷺ: «Kim Ramazon oyida iymon va savob umidida roʻza tutsa, uning oʻtgan gunohlari magʻfirat qilinadi».',
    category: 'bayram',
  },
  {
    id: 'ev-2',
    titleUz: 'Laylatul Qadr (Qadr kechasi)',
    hijriDate: '27 Ramazon, 1448',
    gregorianDate: 'Taxminan 2027-yil Mart',
    descriptionUz: 'Ming oydan ham yaxshiroq boʻlgan, farishtalar va Ruh nozil boʻladigan muborak kecha.',
    virtueUz: '«Qadr kechasi ming oydan yaxshiroqdir. Farishtalar va Ruh oʻsha kechada Robblarining izni bilan barcha ishlar uchun tusharlar...» (Qadr surasi).',
    category: 'muborak_kecha',
  },
  {
    id: 'ev-3',
    titleUz: 'Iyd al-Fitr (Ramazon Hayiti)',
    hijriDate: '1 Shawwal, 1448',
    gregorianDate: 'Taxminan 2027-yil Mart',
    descriptionUz: 'Bir oylik Ramazon roʻzasi yakunida Alloh taoloning mukofoti oʻlaroq nishonlanadigan shukrona bayrami.',
    virtueUz: 'Hayit namozini oʻqish, qarindosh-urugʻlarni ziyorat qilish va muhtojlarga sadaqai fitr ulashish sunnatdir.',
    category: 'bayram',
  },
  {
    id: 'ev-4',
    titleUz: 'Arafa kuni va Qurbon Hayiti',
    hijriDate: '9-10 Dhu al-Hijjah, 1448',
    gregorianDate: 'Taxminan 2027-yil Iyun',
    descriptionUz: 'Zulhijja oyining 9-kuni Arafa, 10-kuni esa Iyd al-Adha (Qurbon hayiti) bayrami.',
    virtueUz: 'Rasululloh ﷺ: «Arafa kuni tutilgan roʻza oʻtgan va kelgusi bir yillik gunohlarga kafforat boʻlishini Allohdan umid qilaman».',
    category: 'bayram',
  },
  {
    id: 'ev-5',
    titleUz: 'Ashuro kuni',
    hijriDate: '10 Muharram, 1448',
    gregorianDate: 'Taxminan 2027-yil Iyul',
    descriptionUz: 'Muharram oyining oʻninchi kuni. Muso alayhissalom va qavmlari Firʼavndan najot topgan muborak kun.',
    virtueUz: 'Ashuro kunida bir kun oldin yoki keyin qoʻshib roʻza tutish oʻtgan yilgi gunohlarga kafforatdir.',
    category: 'muhim_sana',
  },
];

const CALENDAR_REMINDERS_KEY = 'asaka_ziyo_calendar_reminders_v1';

export const CalendarView: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [reminders, setReminders] = useState<Record<string, boolean>>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem(CALENDAR_REMINDERS_KEY);
        if (saved) return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return {};
  });

  const toggleReminder = (id: string) => {
    setReminders((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(CALENDAR_REMINDERS_KEY, JSON.stringify(next));
        }
      } catch {
        // ignore
      }
      if (next[id] && typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
      return next;
    });
  };

  const filteredEvents = ISLAMIC_EVENTS.filter(
    (ev) => selectedCategory === 'all' || ev.category === selectedCategory
  );

  return (
    <div className="space-y-8 pb-16 max-w-5xl mx-auto">
      {/* Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-[#c5a869]/30 bg-gradient-to-r from-[#031d17] via-[#071614] to-[#04241d] p-6 sm:p-10 text-white shadow-xl">
        <GeometricPattern opacity={0.06} />
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#c5a869] uppercase tracking-wider">
            <CalendarIcon className="w-4 h-4 text-[#c5a869]" />
            <span>Hijriy Qamariy Taqvim & Muborak Kechalar</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-white">
            Islomiy Taqvim va Muhim Sanalar
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            1448-hijriy yilning muborak oylari, hayit bayramlari, qadr kechalari va tarixiy sanalar taqvimi.
          </p>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'all', label: 'Barcha sanalar' },
          { id: 'bayram', label: 'Bayramlar' },
          { id: 'muborak_kecha', label: 'Muborak kechalar' },
          { id: 'muhim_sana', label: 'Muhim sanalar' },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 min-h-[40px] rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-[#c5a869] text-[#071614] shadow-md'
                : 'bg-white dark:bg-[#0B1F1C] text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-emerald-950/60 border border-stone-200 dark:border-[#c5a869]/20'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Events List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredEvents.map((ev) => {
          const isReminded = reminders[ev.id];

          return (
            <Card
              key={ev.id}
              elevated
              className="p-6 space-y-4 border-stone-200/90 dark:border-[#c5a869]/30 bg-white dark:bg-[#0B1F1C] hover:border-[#c5a869] transition-all"
            >
              <div className="flex items-center justify-between border-b border-stone-200/80 dark:border-white/10 pb-3">
                <span className="px-3 py-1 rounded-full bg-[#c5a869]/15 dark:bg-[#c5a869]/20 text-[#9E7F3C] dark:text-[#c5a869] text-xs font-bold font-mono-numbers">
                  {ev.hijriDate}
                </span>
                <span className="text-xs text-stone-500 dark:text-stone-400 font-mono-numbers">
                  {ev.gregorianDate}
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
                  <Star className="w-4 h-4 text-[#9E7F3C] dark:text-[#c5a869] shrink-0" />
                  <span>{ev.titleUz}</span>
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                  {ev.descriptionUz}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F3EFE6]/70 dark:bg-[#051d18] border border-stone-200/80 dark:border-[#c5a869]/30 text-xs text-stone-700 dark:text-stone-300 space-y-1">
                <div className="font-bold text-[#9E7F3C] dark:text-[#c5a869]">Fazilati va Tavsiya:</div>
                <p className="italic leading-relaxed">{ev.virtueUz}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-200/80 dark:border-white/10 text-xs">
                <span className="text-stone-500 dark:text-stone-400">Eslatma oʻrnatish:</span>
                <button
                  onClick={() => toggleReminder(ev.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-lg font-bold transition-all cursor-pointer ${
                    isReminded
                      ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-black shadow'
                      : 'bg-stone-100 dark:bg-white/10 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-white/20'
                  }`}
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>{isReminded ? 'Eslatma oʻrnatildi' : 'Eslatib turish'}</span>
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
