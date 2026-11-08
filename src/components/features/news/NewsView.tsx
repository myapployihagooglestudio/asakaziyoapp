import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { NewsItem, SupportedLocale } from '../../../types';
import { getStoredNews, subscribeToDatabase, isPubliclyPublished } from '../../../utils/databaseService';
import { Card } from '../../ui/Card';
import { Modal } from '../../ui/Modal';
import { GeometricPattern, IslamicMihrabArch, CalligraphyBasmalahBadge } from '../../ui/GeometricPattern';
import { getLocalizedField } from '../../../utils/localizedContent';
import { Newspaper, Calendar, Building, ArrowRight } from 'lucide-react';

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
      {/* 2026 Luxury Architectural Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-[#C6A45C]/35 bg-gradient-to-br from-[#063D32] via-[#042B25] to-[#031814] text-white p-6 sm:p-10 shadow-2xl">
        <img
          src="/images/islamic_scholarship_library_1793634659800.jpg"
          alt="Islamic Scholarship Library"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-25 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#042B25]/95 via-[#063D32]/85 to-transparent" />
        <GeometricPattern opacity={0.07} />
        <IslamicMihrabArch opacity={0.14} className="right-6 max-w-[260px] ml-auto hidden md:block" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <CalligraphyBasmalahBadge />
            <div className="flex items-center gap-2 text-xs font-bold text-[#C6A45C] uppercase tracking-wider">
              <Newspaper className="w-3.5 h-3.5" />
              <span>{t('news:pressService', 'Matbuot xizmati')}</span>
              <span aria-hidden="true">·</span>
              <span>{t('news:region', 'Andijon va Asaka')}</span>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold tracking-tight text-[#F8F5EC]">
            {t('news:title', 'Asaka Ziyo Yangiliklari')}
          </h1>
          <p className="text-xs sm:text-sm text-[#DCC58C]/90 leading-relaxed max-w-xl">
            {t('news:subtitle', 'Asaka shahri va mintaqadagi maʼrifiy tadbirlar, masjid yangiliklari va jamiyat hayotiga oid soʻnggi xabarlar.')}
          </p>
        </div>
      </div>

      {/* News list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {newsList.map((item) => {
          const locTitle = getLocalizedField(item, 'title', currentLocale);
          const locContent = getLocalizedField(item, 'content', currentLocale);

          return (
            <Card
              key={item.id}
              elevated
              interactive
              onClick={() => setSelectedNews(item)}
              className="flex flex-col justify-between group cursor-pointer"
            >
              <div className="space-y-3">
                {item.imageUrl && (
                  <div className="aspect-[16/9] overflow-hidden bg-stone-100 dark:bg-stone-900 rounded-t-xl">
                    <img
                      src={item.imageUrl}
                      alt={locTitle}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-stone-500">
                    <span className="font-bold text-[#c5a869]">{item.category}</span>
                    <span className="flex items-center gap-1 font-mono-numbers">
                      <Calendar className="w-3 h-3" />
                      {item.publishedDate}
                    </span>
                  </div>

                  <h3 className="text-base font-display font-bold text-stone-900 dark:text-stone-100 group-hover:text-[#c5a869] transition-colors line-clamp-2">
                    {locTitle}
                  </h3>

                  <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-3 leading-relaxed">
                    {item.summary || locContent}
                  </p>
                </div>
              </div>

              <div className="px-5 pb-5 pt-2 flex items-center justify-between border-t border-stone-200 dark:border-emerald-950/60 text-xs font-bold text-[#c5a869]">
                <span>Batafsil oʻqish</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Card>
          );
        })}
      </div>

      {/* News Detail Modal */}
      <Modal
        isOpen={selectedNews !== null}
        onClose={() => setSelectedNews(null)}
        title={selectedNews ? getLocalizedField(selectedNews, 'title', currentLocale) : ''}
        subtitle={selectedNews ? `${selectedNews.publishedDate} • ${selectedNews.category}` : ''}
        maxWidth="lg"
      >
        {selectedNews && (
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {selectedNews.imageUrl && (
              <div className="rounded-xl overflow-hidden aspect-[16/9] border border-stone-200 dark:border-emerald-950">
                <img
                  src={selectedNews.imageUrl}
                  alt={getLocalizedField(selectedNews, 'title', currentLocale)}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-line space-y-3">
              {getLocalizedField(selectedNews, 'content', currentLocale)}
            </div>
            {selectedNews.source && (
              <div className="pt-3 border-t border-stone-200 dark:border-emerald-950/60 text-xs text-stone-400">
                Manba: {selectedNews.source}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
