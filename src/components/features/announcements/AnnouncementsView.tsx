import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SupportedLocale, AnnouncementItem } from '../../../types';
import { getStoredAnnouncements, subscribeToDatabase } from '../../../utils/databaseService';
import { Card } from '../../ui/Card';
import { GeometricPattern } from '../../ui/GeometricPattern';
import { toNewUzbekAlphabet } from '../../../utils/newUzbekAlphabet';
import { Calendar, MapPin, Clock, User, Phone, Megaphone } from 'lucide-react';

export const AnnouncementsView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentLocale = (i18n.language as SupportedLocale) || 'uz-Latn';
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(() => getStoredAnnouncements());

  useEffect(() => {
    const unsubscribe = subscribeToDatabase((event) => {
      if (event.type === 'ANNOUNCEMENTS_UPDATED') {
        setAnnouncements(getStoredAnnouncements());
      }
    });
    return unsubscribe;
  }, []);

  const getLocalizedText = (text: string) => {
    if (currentLocale === 'uz-Latn-new') {
      return toNewUzbekAlphabet(text);
    }
    return text;
  };

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto">
      {/* Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-[#c5a869]/30 bg-gradient-to-r from-[#031d17] via-[#071614] to-[#04241d] text-white p-6 sm:p-10 shadow-xl">
        <img
          src="/images/asaka_islamic_architecture_1793634657962.jpg"
          alt="Asaka Islamic Architecture"
          className="absolute inset-0 w-full h-full object-cover object-center brightness-75"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#031d17]/95 via-[#031d17]/85 to-transparent" />
        <GeometricPattern opacity={0.05} />
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#c5a869] uppercase tracking-wider">
            <Megaphone className="w-3.5 h-3.5" />
            <span>{t('announcements:communityNews', 'Jome Masjidi Eʼlonlari')}</span>
            <span aria-hidden="true">·</span>
            <span>{t('announcements:mosqueLife', 'Masjid hayoti')}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-white">
            {t('announcements:title', 'Rasmiy Eʼlonlar va Tadbirlar')}
          </h1>
          <p className="text-xs sm:text-sm text-stone-200 leading-relaxed">
            {t('announcements:subtitle', 'Asaka markaziy jome masjidi va maʼmuriyati tomonidan eʼlon qilinadigan juma maʼruzalari, darslar va muhim tadbirlar.')}
          </p>
        </div>
      </div>

      {/* Announcements List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {announcements.map((item) => {
          const locTitle = getLocalizedText(item.title);
          const locDesc = getLocalizedText(item.description);
          const locType = getLocalizedText(item.typeLabelUz);
          const locOrganizer = item.organizer ? getLocalizedText(item.organizer) : undefined;
          const locLocation = item.location ? getLocalizedText(item.location) : undefined;

          return (
            <Card
              key={item.id}
              elevated={item.isPinned}
              className={`p-6 flex flex-col justify-between space-y-4 ${
                item.isPinned ? 'border-[#c5a869]/60 ring-1 ring-[#c5a869]/20' : ''
              }`}
            >
              <div className="space-y-3">
                {/* Header Badge */}
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#c5a869]/15 text-[#c5a869] text-[11px] font-bold border border-[#c5a869]/30">
                    {locType}
                  </span>
                  {item.isPinned && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Muhim / Qadalgan
                    </span>
                  )}
                </div>

                <h3 className="text-base font-display font-bold text-stone-900 dark:text-stone-100">
                  {locTitle}
                </h3>

                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                  {locDesc}
                </p>
              </div>

              {/* Metadata */}
              <div className="pt-4 border-t border-stone-200 dark:border-emerald-950/60 space-y-2 text-xs text-stone-500 dark:text-stone-400">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-[#c5a869]" />
                  <span className="font-medium text-stone-800 dark:text-stone-200">{item.date}</span>
                </div>
                {item.time && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-[#c5a869]" />
                    <span>{item.time}</span>
                  </div>
                )}
                {locLocation && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#c5a869]" />
                    <span>{locLocation}</span>
                  </div>
                )}
                {locOrganizer && (
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-[#c5a869]" />
                    <span>Mas’ul: {locOrganizer}</span>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
