import React from 'react';
import { useTranslation } from 'react-i18next';
import { SupportedLocale } from '../../../types';
import { COMMUNITY_ANNOUNCEMENTS } from '../../../data/newsAndAnnouncementsData';
import { Card } from '../../ui/Card';
import { GeometricPattern } from '../../ui/GeometricPattern';
import { toNewUzbekAlphabet } from '../../../utils/newUzbekAlphabet';
import { Calendar, MapPin, Clock, User, Phone, Megaphone } from 'lucide-react';

export const AnnouncementsView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentLocale = (i18n.language as SupportedLocale) || 'uz-Latn';

  const getLocalizedText = (text: string) => {
    if (currentLocale === 'uz-Latn-new') {
      return toNewUzbekAlphabet(text);
    }
    return text;
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-[#c5a869]/30 bg-gradient-to-r from-[#031d17] to-[#071614] text-white p-6 sm:p-10">
        <GeometricPattern opacity={0.05} />
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#c5a869] uppercase tracking-wider">
            <Megaphone className="w-3.5 h-3.5" />
            <span>{t('announcements:communityNews')}</span>
            <span aria-hidden="true">·</span>
            <span>{t('announcements:mosqueLife')}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-white">
            {t('announcements:title')}
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            {t('announcements:subtitle')}
          </p>
        </div>
      </div>

      {/* Announcements List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {COMMUNITY_ANNOUNCEMENTS.map((item) => {
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
                {/* Unboxed Metadata */}
                <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                  <span className="font-semibold text-[#c5a869]">{locType}</span>
                  {item.isPinned && (
                    <span className="text-xs text-amber-500 font-medium">{t('announcements:pinned')}</span>
                  )}
                </div>

                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 leading-snug">
                  {locTitle}
                </h3>

                <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                  {locDesc}
                </p>
              </div>

              <div className="pt-4 border-t border-stone-100 dark:border-emerald-950/60 space-y-2 text-xs text-stone-500 dark:text-stone-400">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-[#c5a869]" />
                  <span className="font-medium text-stone-800 dark:text-stone-200">{item.date}</span>
                </div>

                {item.time && (
                  <div className="flex items-center gap-2 font-mono-numbers">
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
                    <span>{locOrganizer}</span>
                  </div>
                )}

                {item.contactPhone && (
                  <div className="flex items-center gap-2 font-mono-numbers">
                    <Phone className="w-3.5 h-3.5 text-[#c5a869]" />
                    <span>{item.contactPhone}</span>
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
