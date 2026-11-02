import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NewsItem, SupportedLocale } from '../../../types';
import { COMMUNITY_NEWS } from '../../../data/newsAndAnnouncementsData';
import { Card } from '../../ui/Card';
import { Modal } from '../../ui/Modal';
import { GeometricPattern } from '../../ui/GeometricPattern';
import { getLocalizedField } from '../../../utils/localizedContent';
import { Newspaper, Calendar, Building, ArrowRight } from 'lucide-react';

export const NewsView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentLocale = (i18n.language as SupportedLocale) || 'uz-Latn';
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  return (
    <div className="space-y-8 pb-16">
      {/* Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-[#c5a869]/30 bg-gradient-to-r from-[#031d17] to-[#071614] text-white p-6 sm:p-10">
        <GeometricPattern opacity={0.05} />
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#c5a869] uppercase tracking-wider">
            <Newspaper className="w-3.5 h-3.5" />
            <span>{t('news:pressService')}</span>
            <span aria-hidden="true">·</span>
            <span>{t('news:region')}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-white">
            {t('news:title')}
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            {t('news:subtitle')}
          </p>
        </div>
      </div>

      {/* News list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {COMMUNITY_NEWS.map((item) => {
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
                  <div className="aspect-[16/9] overflow-hidden bg-stone-100 dark:bg-stone-900">
                    <img
                      src={item.imageUrl}
                      alt={locTitle}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}
                <div className="p-6 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                    <span className="text-[#c5a869] font-medium">{item.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-numbers">{item.publishedDate}</span>
                  </div>

                  <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 group-hover:text-[#c5a869] transition-colors line-clamp-2">
                    {locTitle}
                  </h3>

                  <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-3 leading-relaxed">
                    {locContent}
                  </p>
                </div>
              </div>

              <div className="px-6 pb-6 pt-2 flex items-center justify-between text-xs text-[#c5a869] font-semibold border-t border-stone-100 dark:border-emerald-950/60">
                <span>{t('news:readMore')}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Reader Modal */}
      {selectedNews && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedNews(null)}
          title={getLocalizedField(selectedNews, 'title', currentLocale)}
          size="xl"
        >
          <div className="space-y-5">
            {selectedNews.imageUrl && (
              <div className="aspect-[16/9] rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-900">
                <img
                  src={selectedNews.imageUrl}
                  alt={getLocalizedField(selectedNews, 'title', currentLocale)}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400 border-b border-stone-100 dark:border-emerald-950/60 pb-3">
              <span className="font-semibold text-[#c5a869]">{selectedNews.category}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-numbers">{selectedNews.publishedDate}</span>
              <span aria-hidden="true">·</span>
              <span>{selectedNews.source}</span>
            </div>

            <div className="text-sm sm:text-base text-stone-800 dark:text-stone-200 font-editorial leading-relaxed whitespace-pre-line">
              {getLocalizedField(selectedNews, 'content', currentLocale)}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
