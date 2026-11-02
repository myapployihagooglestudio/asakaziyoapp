import React from 'react';
import { useTranslation } from 'react-i18next';
import { FavoriteItem, NavigationTab } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { GeometricPattern } from '../../ui/GeometricPattern';
import { Bookmark, Trash2, ArrowRight } from 'lucide-react';

interface FavoritesViewProps {
  favorites: FavoriteItem[];
  onRemoveFavorite: (id: string) => void;
  onClearAll: () => void;
  onNavigate: (tab: NavigationTab) => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  favorites,
  onRemoveFavorite,
  onClearAll,
  onNavigate,
}) => {
  const { t } = useTranslation();

  const typeLabels = {
    ayah: t('favorites:typeAyah'),
    hadith: t('favorites:typeHadith'),
    dhikr: t('favorites:typeDhikr'),
    article: t('favorites:typeArticle'),
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-[#c5a869]/30 bg-gradient-to-r from-[#031d17] to-[#071614] text-white p-6 sm:p-10">
        <GeometricPattern opacity={0.05} />
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#c5a869] uppercase tracking-wider">
            <Bookmark className="w-3.5 h-3.5" />
            <span>{t('favorites:bannerTag')}</span>
            <span aria-hidden="true">·</span>
            <span>{t('favorites:savedItems')}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-white">
            {t('favorites:title')}
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            {t('favorites:subtitle')}
          </p>
        </div>
      </div>

      {favorites.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
            <span>
              {t('favorites:totalSaved')}: <strong className="font-mono-numbers">{favorites.length}</strong> {t('favorites:itemCountSuffix')}
            </span>
            <button
              onClick={onClearAll}
              className="hover:text-red-500 transition-colors cursor-pointer"
            >
              {t('favorites:clearAll')}
            </button>
          </div>

          <div className="space-y-3">
            {favorites.map((item) => (
              <Card
                key={item.id}
                elevated
                className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-[#c5a869] uppercase tracking-wider">
                      {typeLabels[item.type] || item.type}
                    </span>
                    <span aria-hidden="true" className="text-stone-400">·</span>
                    <span className="font-mono-numbers text-stone-400 text-[11px]">
                      {new Date(item.savedAt || item.timestamp || Date.now()).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    {item.title}
                  </h3>

                  <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed">
                    «{item.snippet}»
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => onNavigate(item.routeTab)}
                  >
                    <span>{t('favorites:openItem')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>

                  <button
                    onClick={() => onRemoveFavorite(item.id)}
                    className="p-2 rounded-xl border border-stone-200 dark:border-emerald-950 text-stone-400 hover:text-red-500 hover:border-red-400/40 transition-colors cursor-pointer"
                    title={t('favorites:remove')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          title={t('favorites:emptyTitle')}
          description={t('favorites:emptyDesc')}
          action={{
            label: t('favorites:openQuran'),
            onClick: () => onNavigate('quran'),
          }}
        />
      )}
    </div>
  );
};
