import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { NewsItem, SupportedLocale } from '../../../types';
import { getStoredNews, subscribeToDatabase, isPubliclyPublished } from '../../../utils/databaseService';
import { Card } from '../../ui/Card';
import { Modal } from '../../ui/Modal';
import { PageHero } from '../../ui/PageHero';
import { StaggerGrid, StaggerCard, SpatialTiltCard } from '../../ui/MotionPrimitives';
import { getLocalizedField } from '../../../utils/localizedContent';
import { Calendar, ArrowRight } from 'lucide-react';

export const NewsView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentLocale = (i18n.language as SupportedLocale) || 'uz-Latn';
  const [newsList, setNewsList] = useState<NewsItem[]>(() => getStoredNews().filter(isPubliclyPublished));
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToDatabase((event) => {
      if (event.type === 'NEWS_UPDATED') {
        setNewsList(getStoredNews().filter(isPubliclyPublished));
      }
    });
    return unsubscribe;
  }, []);

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto">
      <PageHero
        variant="editorial"
        kicker={`${t('news:pressService', 'Matbuot xizmati')} · ${t('news:region', 'Andijon va Asaka')}`}
        title={t('news:title', 'Asaka Ziyo Yangiliklari')}
        subtitle={t(
          'news:subtitle',
          'Asaka shahri va mintaqadagi maʼrifiy tadbirlar, masjid yangiliklari va jamiyat hayotiga oid soʻnggi xabarlar.'
        )}
        imageSrc="/images/islamic_scholarship_library_1793634659800.jpg"
        imageAlt="Asaka Ziyo yangiliklari"
      />

      {/* News list */}
      <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {newsList.map((item) => {
          const locTitle = getLocalizedField(item, 'title', currentLocale);
          const locContent = getLocalizedField(item, 'content', currentLocale);

          return (
            <StaggerCard key={item.id}>
              <SpatialTiltCard maxTilt={3}>
                <Card
                  elevated
                  interactive
                  onClick={() => setSelectedNews(item)}
                  className="h-full flex flex-col justify-between group cursor-pointer overflow-hidden"
                >
                  <div>
                    {item.imageUrl && (
                      <div className="aspect-[16/9] overflow-hidden bg-black/5 dark:bg-white/5">
                        <img
                          src={item.imageUrl}
                          alt={locTitle}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    )}
                    <div className="p-5 sm:p-6 space-y-3">
                      <div className="flex items-center justify-between text-xs text-[#587068] dark:text-[#9CAFA7]">
                        <span className="font-bold text-[#8B6B2E] dark:text-[#C8A85E]">{item.category}</span>
                        <span className="flex items-center gap-1 font-mono-numbers">
                          <Calendar className="w-3.5 h-3.5" />
                          {item.publishedDate}
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-display font-bold text-[#091813] dark:text-[#F7F4EC] group-hover:text-[#064E3B] dark:group-hover:text-[#34D399] transition-colors line-clamp-2 leading-snug">
                        {locTitle}
                      </h3>

                      <p className="text-sm text-[#3B554D] dark:text-[#A4B9B1] line-clamp-3 leading-relaxed">
                        {item.summary || locContent}
                      </p>
                    </div>
                  </div>

                  <div className="px-5 sm:px-6 py-4 flex items-center justify-between border-t border-black/[0.06] dark:border-white/[0.08] text-xs font-bold text-[#064E3B] dark:text-[#34D399]">
                    <span>Batafsil oʻqish</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Card>
              </SpatialTiltCard>
            </StaggerCard>
          );
        })}
      </StaggerGrid>

      {/* News Detail Modal */}
      <Modal
        isOpen={selectedNews !== null}
        onClose={() => setSelectedNews(null)}
        title={selectedNews ? getLocalizedField(selectedNews, 'title', currentLocale) : ''}
        subtitle={selectedNews ? `${selectedNews.publishedDate} · ${selectedNews.category}` : ''}
        maxWidth="lg"
      >
        {selectedNews && (
          <div className="space-y-4">
            {selectedNews.imageUrl && (
              <div className="rounded-2xl overflow-hidden aspect-[16/9] border border-black/[0.08] dark:border-white/[0.1]">
                <img
                  src={selectedNews.imageUrl}
                  alt={getLocalizedField(selectedNews, 'title', currentLocale)}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="font-editorial text-sm sm:text-[15px] text-[#091813] dark:text-[#F7F4EC]/92 leading-[1.85] whitespace-pre-line">
              {getLocalizedField(selectedNews, 'content', currentLocale)}
            </div>
            {selectedNews.source && (
              <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.08] text-xs text-[#587068] dark:text-[#9CAFA7]">
                Manba: {selectedNews.source}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
