import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MosqueEventItem } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { IslamicHairlineDivider, IslamicStarEmblem } from '../../ui/GeometricPattern';
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
  Sparkles,
  Search,
  Tag,
  Share2,
} from 'lucide-react';

export const MosqueEventsView: React.FC = () => {
  const { t } = useTranslation();
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
    const matchesQuery =
      ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.instructor.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesQuery;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-in fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#064e3b] via-[#052b22] to-[#041d18] border border-[#c5a869]/30 p-6 sm:p-8 text-white shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#d4af37]">
            <Calendar className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>Asaka Jamoat Hayoti & Diniy Tadbirlar</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-white">
            Masjid Tadbirlari va Maʼrifiy Darslar
          </h1>
          <p className="text-xs sm:text-sm text-stone-200 leading-relaxed max-w-xl">
            Asaka shahri jome masjidlarida oʻtkaziladigan juma suhbatlari, tajvid kurslari, maʼruzalar va xayriya tadbirlaridan xabardor boʻling.
          </p>
        </div>
      </div>

      {registeredSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{registeredSuccessMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: 'Barcha tadbirlar' },
            { id: 'friday_program', label: 'Juma suhbatlari' },
            { id: 'tajwid', label: 'Tajvid & Tartil' },
            { id: 'charity_drive', label: 'Saxovat tadbirlari' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedType(cat.id)}
              className={`px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedType === cat.id
                  ? 'bg-[#c5a869] text-[#071614] shadow-xs'
                  : 'bg-white dark:bg-[#0B1F1C] border border-stone-200 dark:border-emerald-950 text-stone-700 dark:text-stone-300'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
          <input
            type="text"
            placeholder="Tadbirni qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#0B1F1C] text-stone-900 dark:text-white"
          />
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredEvents.map((ev) => {
          const isRegistered = ev.registeredUserIds.includes(userId);
          const spotsLeft = ev.capacity ? Math.max(0, ev.capacity - ev.registeredUserIds.length) : null;

          return (
            <Card
              key={ev.id}
              elevated
              className="p-6 space-y-4 border-stone-200/90 dark:border-[#c5a869]/30 bg-white dark:bg-[#0B1F1C] flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-3 py-1 rounded-full bg-[#c5a869]/15 text-[#9E7F3C] dark:text-[#c5a869] font-bold border border-[#c5a869]/30">
                    {ev.type === 'friday_program'
                      ? 'Juma Dasturi'
                      : ev.type === 'tajwid'
                      ? 'Tajvid Darsi'
                      : 'Saxovat Tadbiri'}
                  </span>
                  <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400 font-mono-numbers">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{ev.date}</span>
                    <span aria-hidden="true">·</span>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{ev.time}</span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-stone-900 dark:text-white leading-snug">
                  {ev.title}
                </h3>

                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                  {ev.description}
                </p>

                <div className="space-y-1.5 pt-2 text-xs text-stone-600 dark:text-stone-300">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#9E7F3C] dark:text-[#c5a869] shrink-0" />
                    <span>{ev.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Ustoz/Tashkilotchi: <strong>{ev.instructor}</strong></span>
                  </div>
                  {spotsLeft !== null && (
                    <div className="text-[11px] text-stone-500 font-mono-numbers">
                      Qolgan oʻrinlar: {spotsLeft} ta / {ev.capacity} ta
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-stone-200/80 dark:border-white/10 flex items-center justify-between">
                <Button
                  size="sm"
                  variant={isRegistered ? 'outline' : 'emerald'}
                  onClick={() => handleRegister(ev.id)}
                  className="min-h-[40px] text-xs font-bold"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  <span>{isRegistered ? 'Roʻyxatdan oʻtildi (Bekor qilish)' : 'Roʻyxatdan oʻtish'}</span>
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
