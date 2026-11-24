import React, { useState } from 'react';
import { MosqueEventItem } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { PageHero } from '../../ui/PageHero';
import {
  MorphingTabs,
  StaggerGrid,
  StaggerCard,
} from '../../ui/MotionPrimitives';
import {
  getStoredMosqueEvents,
  toggleEventRegistration,
} from '../../../utils/databaseService';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  Search,
} from 'lucide-react';

export const MosqueEventsView: React.FC = () => {
  const userId = 'asaka_user_current';

  const [events, setEvents] = useState<MosqueEventItem[]>(() => getStoredMosqueEvents());
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [registeredSuccessMsg, setRegisteredSuccessMsg] = useState<string | null>(null);

  const handleRegister = (eventId: string) => {
    const isNowRegistered = toggleEventRegistration(eventId, userId);
    setEvents(getStoredMosqueEvents());
    setRegisteredSuccessMsg(
      isNowRegistered
        ? 'Tadbirga roʻyxatdan oʻtdingiz! Eslatma oʻrnatildi.'
        : 'Roʻyxatdan oʻtish bekor qilindi.'
    );
    setTimeout(() => setRegisteredSuccessMsg(null), 3500);
  };

  const filteredEvents = events.filter((ev) => {
    const matchesType = selectedType === 'all' || ev.type === selectedType;
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      !q ||
      ev.title.toLowerCase().includes(q) ||
      ev.description.toLowerCase().includes(q) ||
      ev.instructor.toLowerCase().includes(q);
    return matchesType && matchesQuery;
  });

  return (
    <div className="max-w-6xl mx-auto pb-16 space-y-8">
      <PageHero
        variant="sanctuary"
        kicker="Asaka Jamoat Hayoti · Diniy va Maʼrifiy Tadbirlar"
        title="Masjid Tadbirlari va Maʼrifiy Darslar"
        subtitle="Asaka shahri jome masjidlarida oʻtkaziladigan juma suhbatlari, tajvid kurslari, maʼruzalar va xayriya tadbirlaridan xabardor boʻling."
      />

      {registeredSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/12 border border-emerald-500/30 text-[#064E3B] dark:text-[#34D399] text-sm font-semibold flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{registeredSuccessMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <MorphingTabs
          items={[
            { id: 'all', label: 'Barcha tadbirlar', count: events.length },
            { id: 'friday_program', label: 'Juma suhbatlari' },
            { id: 'tajwid', label: 'Tajvid va Tartil' },
            { id: 'charity_drive', label: 'Saxovat tadbirlari' },
          ]}
          activeId={selectedType}
          onChange={setSelectedType}
          layoutId="mosque-events-tabs"
        />

        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#587068] dark:text-[#9CAFA7] pointer-events-none" />
          <input
            type="text"
            placeholder="Tadbirni qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 min-h-[44px] text-sm rounded-2xl az-liquid-glass-pill text-[#091813] dark:text-[#F7F4EC] placeholder:text-[#6B827A] dark:placeholder:text-[#7E968D] focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </div>
      </div>

      {/* Events Grid */}
      <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredEvents.map((ev) => {
          const isRegistered = ev.registeredUserIds.includes(userId);
          const spotsLeft = ev.capacity ? Math.max(0, ev.capacity - ev.registeredUserIds.length) : null;

          return (
            <StaggerCard key={ev.id}>
              <Card elevated className="p-6 h-full flex flex-col justify-between space-y-5">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-black/[0.06] dark:border-white/[0.08] pb-3">
                    <span className="font-bold text-[#8B6B2E] dark:text-[#C8A85E]">
                      {ev.type === 'friday_program'
                        ? 'Juma dasturi'
                        : ev.type === 'tajwid'
                        ? 'Tajvid darsi'
                        : 'Saxovat tadbiri'}
                    </span>
                    <div className="flex items-center gap-1.5 text-[#587068] dark:text-[#9CAFA7] font-mono-numbers">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{ev.date}</span>
                      <span aria-hidden="true">·</span>
                      <Clock className="w-3.5 h-3.5" />
                      <span>{ev.time}</span>
                    </div>
                  </div>

                  <h3 className="text-lg font-display font-bold text-[#091813] dark:text-[#F7F4EC] leading-snug">
                    {ev.title}
                  </h3>

                  <p className="text-sm text-[#3B554D] dark:text-[#A4B9B1] leading-relaxed">
                    {ev.description}
                  </p>

                  <div className="space-y-1.5 pt-2 text-xs text-[#3B554D] dark:text-[#A4B9B1]">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#C8A85E] shrink-0" />
                      <span>{ev.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-[#064E3B] dark:text-[#34D399] shrink-0" />
                      <span>
                        Ustoz / Tashkilotchi: <strong className="text-[#091813] dark:text-[#F7F4EC]">{ev.instructor}</strong>
                      </span>
                    </div>
                    {spotsLeft !== null && (
                      <div className="text-xs text-[#587068] dark:text-[#9CAFA7] font-mono-numbers">
                        Qolgan oʻrinlar: {spotsLeft} / {ev.capacity}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
                  <Button
                    size="sm"
                    variant={isRegistered ? 'outline' : 'emerald'}
                    onClick={() => handleRegister(ev.id)}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    <span>{isRegistered ? 'Roʻyxatdan oʻtildi (Bekor qilish)' : 'Roʻyxatdan oʻtish'}</span>
                  </Button>
                </div>
              </Card>
            </StaggerCard>
          );
        })}
      </StaggerGrid>
    </div>
  );
};
