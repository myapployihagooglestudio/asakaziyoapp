import React, { useState } from 'react';
import { NewsItem } from '../../../types';
import { COMMUNITY_NEWS } from '../../../data/newsAndAnnouncementsData';
import { Card } from '../../ui/Card';
import { Modal } from '../../ui/Modal';
import { GeometricPattern } from '../../ui/GeometricPattern';
import { Newspaper, Calendar, Building, ArrowRight } from 'lucide-react';

export const NewsView: React.FC = () => {
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  return (
    <div className="space-y-8 pb-16">
      {/* Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-[#c5a869]/30 bg-gradient-to-r from-[#031d17] to-[#071614] text-white p-6 sm:p-10">
        <GeometricPattern opacity={0.05} />
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#c5a869] uppercase tracking-wider">
            <Newspaper className="w-3.5 h-3.5" />
            <span>Axborot Xizmati</span>
            <span aria-hidden="true">·</span>
            <span>Asaka va Mintaqa</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-white">
            Diniy-Maʼrifiy Yangiliklar
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            Asaka shahri jome masjidi yangiliklari, viloyatdagi maʼrifiy tadbirlar, qorilar musobaqasi va ijtimoiy xayriya faoliyatlari.
          </p>
        </div>
      </div>

      {/* News list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {COMMUNITY_NEWS.map((item) => (
          <Card
            key={item.id}
            elevated
            interactive
            onClick={() => setSelectedNews(item)}
            className="flex flex-col justify-between group"
          >
            <div className="space-y-3">
              {item.imageUrl && (
                <div className="aspect-[16/9] overflow-hidden bg-stone-100 dark:bg-stone-900">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              )}
              <div className="p-6 space-y-2">
                <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                  <span className="text-[#c5a869] font-medium">{item.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{item.publishedDate}</span>
                </div>

                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 group-hover:text-[#c5a869] transition-colors leading-snug">
                  {item.title}
                </h3>

                <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-3 leading-relaxed">
                  {item.summary}
                </p>
              </div>
            </div>

            <div className="px-6 pb-6 pt-2 flex items-center justify-between border-t border-stone-100 dark:border-emerald-950/60 mt-auto text-xs">
              <span className="text-stone-400">Manba: {item.source}</span>
              <span className="text-[#c5a869] font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Batafsil <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* News Reading Modal */}
      {selectedNews && (
        <Modal
          isOpen={!!selectedNews}
          onClose={() => setSelectedNews(null)}
          title={selectedNews.title}
          subtitle={`${selectedNews.category} · ${selectedNews.publishedDate} · Manba: ${selectedNews.source}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            {selectedNews.imageUrl && (
              <div className="rounded-xl overflow-hidden aspect-[16/9]">
                <img
                  src={selectedNews.imageUrl}
                  alt={selectedNews.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <p className="text-sm font-medium text-stone-900 dark:text-stone-100 leading-relaxed">
              {selectedNews.summary}
            </p>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              {selectedNews.content}
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};
