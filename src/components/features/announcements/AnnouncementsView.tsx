import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SupportedLocale, AnnouncementItem } from '../../../types';
import { getStoredAnnouncements, subscribeToDatabase, isPubliclyPublished } from '../../../utils/databaseService';
import { Card } from '../../ui/Card';
import { PageHero } from '../../ui/PageHero';
import { StaggerGrid, StaggerCard } from '../../ui/MotionPrimitives';
import { toNewUzbekAlphabet } from '../../../utils/newUzbekAlphabet';
import { Calendar, MapPin, Clock, User } from 'lucide-react';

export const AnnouncementsView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentLocale = (i18n.language as SupportedLocale) || 'uz-Latn';
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(() =>
    getStoredAnnouncements().filter(isPubliclyPublished)
  );

  useEffect(() => {
    const unsubscribe = subscribeToDatabase((event) => {
      if (event.type === 'ANNOUNCEMENTS_UPDATED') {
        setAnnouncements(getStoredAnnouncements().filter(isPubliclyPublished));
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
      <PageHero
        variant="editorial"
        kicker={`${t('announcements:communityNews', 'Jome Masjidi Eʼlonlari')} · ${t('announcements:mosqueLife', 'Masjid hayoti')}`}
        title={t('announcements:title', 'Rasmiy Eʼlonlar va Tadbirlar')}
        subtitle={t(
          'announcements:subtitle',
          'Asaka markaziy jome masjidi va maʼmuriyati tomonidan eʼlon qilinadigan juma maʼruzalari, darslar va muhim tadbirlar.'
        )}
        imageSrc="/images/asaka_islamic_architecture_1793634657962.jpg"
        imageAlt="Masjid eʼlonlari"
      />

      {/* Announcements List */}
      <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {announcements.map((item) => {
          const locTitle = getLocalizedText(item.title);
          const locDesc = getLocalizedText(item.description);
          const locType = getLocalizedText(item.typeLabelUz);
          const locOrganizer = item.organizer ? getLocalizedText(item.organizer) : undefined;
          const locLocation = item.location ? getLocalizedText(item.location) : undefined;

          return (
            <StaggerCard key={item.id}>
              <Card
                elevated={item.isPinned}
                className={`p-6 h-full flex flex-col justify-between space-y-5 ${
                  item.isPinned ? 'border-[#C8A85E]/55 ring-1 ring-[#C8A85E]/25' : ''
                }`}
              >
                <div className="space-y-3">
                  {/* Unboxed typographic metadata */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-[#8B6B2E] dark:text-[#C8A85E]">
                      {locType}
                    </span>
                    {item.isPinned && (
                      <span className="font-semibold text-[#064E3B] dark:text-[#34D399]">
                        Muhim · Qadalgan
                      </span>
                    )}
                  </div>

                  <h3 className="text-base sm:text-lg font-display font-bold text-[#091813] dark:text-[#F7F4EC] leading-snug">
                    {locTitle}
                  </h3>

                  <p className="text-sm text-[#3B554D] dark:text-[#A4B9B1] leading-relaxed">
                    {locDesc}
                  </p>
                </div>

                {/* Metadata */}
                <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.08] space-y-2 text-xs text-[#587068] dark:text-[#9CAFA7]">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-[#C8A85E] shrink-0" />
                    <span className="font-semibold font-mono-numbers text-[#091813] dark:text-[#F7F4EC]">
                      {item.date}
                    </span>
                  </div>
                  {item.time && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-[#C8A85E] shrink-0" />
                      <span className="font-mono-numbers">{item.time}</span>
                    </div>
                  )}
                  {locLocation && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#C8A85E] shrink-0" />
                      <span>{locLocation}</span>
                    </div>
                  )}
                  {locOrganizer && (
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-[#C8A85E] shrink-0" />
                      <span>Masʼul: {locOrganizer}</span>
                    </div>
                  )}
                </div>
              </Card>
            </StaggerCard>
          );
        })}
      </StaggerGrid>
    </div>
  );
};
