import React, { useState } from 'react';
import { Card } from '../../ui/Card';
import { PageHero } from '../../ui/PageHero';
import {
  MorphingTabs,
  StaggerGrid,
  StaggerCard,
} from '../../ui/MotionPrimitives';
import { Star, Bell, Calendar as CalendarIcon } from 'lucide-react';

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
      <PageHero
        variant="sanctuary"
        kicker="Hijriy Qamariy Taqvim · 1448-yil"
        title="Islomiy Taqvim va Muhim Sanalar"
        subtitle="1448-hijriy yilning muborak oylari, hayit bayramlari, qadr kechalari va tarixiy sanalar taqvimi."
        aside={
          <div className="rounded-2xl bg-white/[0.06] border border-white/[0.12] p-5 backdrop-blur-md space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#C8A85E]">
              <CalendarIcon className="w-4 h-4" />
              <span>Faol eslatmalar</span>
            </div>
            <div className="text-2xl font-display font-bold font-mono-numbers text-[#F7F4EC]">
              {Object.values(reminders).filter(Boolean).length} / {ISLAMIC_EVENTS.length}
            </div>
            <p className="text-xs text-[#A4B9B1]">Muborak kunlar uchun bildirishnoma holati</p>
          </div>
        }
      />

      {/* Category Filters */}
      <MorphingTabs
        items={[
          { id: 'all', label: 'Barcha sanalar', count: ISLAMIC_EVENTS.length },
          { id: 'bayram', label: 'Bayramlar' },
          { id: 'muborak_kecha', label: 'Muborak kechalar' },
          { id: 'muhim_sana', label: 'Muhim sanalar' },
        ]}
        activeId={selectedCategory}
        onChange={setSelectedCategory}
        layoutId="calendar-category-tabs"
      />

      {/* Events List */}
      <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredEvents.map((ev) => {
          const isReminded = reminders[ev.id];

          return (
            <StaggerCard key={ev.id}>
              <Card elevated className="p-6 space-y-4 h-full flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2 border-b border-black/[0.06] dark:border-white/[0.08] pb-3 text-xs font-mono-numbers">
                    <span className="font-bold text-[#8B6B2E] dark:text-[#C8A85E]">
                      {ev.hijriDate}
                    </span>
                    <span className="text-[#587068] dark:text-[#9CAFA7]">
                      {ev.gregorianDate}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-display font-bold text-[#091813] dark:text-[#F7F4EC] flex items-center gap-2">
                      <Star className="w-4 h-4 text-[#C8A85E] shrink-0" />
                      <span>{ev.titleUz}</span>
                    </h3>
                    <p className="text-sm text-[#3B554D] dark:text-[#A4B9B1] leading-relaxed">
                      {ev.descriptionUz}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F4EFE3]/75 dark:bg-[#06120E]/85 border border-[#C8A85E]/20 text-xs text-[#3B554D] dark:text-[#C2D4CD] space-y-1">
                    <div className="font-bold text-[#8B6B2E] dark:text-[#C8A85E]">
                      Fazilati va tavsiya
                    </div>
                    <p className="italic leading-relaxed">{ev.virtueUz}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-black/[0.06] dark:border-white/[0.08] text-xs">
                  <span className="text-[#587068] dark:text-[#9CAFA7]">Eslatma holati</span>
                  <button
                    type="button"
                    onClick={() => toggleReminder(ev.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl font-bold transition-all cursor-pointer ${
                      isReminded
                        ? 'bg-[#064E3B] dark:bg-[#10B981] text-[#F7F4EC] dark:text-[#04120D] shadow-sm'
                        : 'az-liquid-glass-pill text-[#091813] dark:text-[#F7F4EC] hover:border-emerald-500/40'
                    }`}
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>{isReminded ? 'Eslatma oʻrnatildi' : 'Eslatib turish'}</span>
                  </button>
                </div>
              </Card>
            </StaggerCard>
          );
        })}
      </StaggerGrid>
    </div>
  );
};
