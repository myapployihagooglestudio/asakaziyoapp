import React from 'react';
import { useTranslation } from 'react-i18next';
import { FavoriteItem, NavigationTab } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { PageHero } from '../../ui/PageHero';
import { EmptyState } from '../../ui/EmptyState';
import {
  StaggerGrid,
  StaggerCard,
  InteractiveCounter,
  MagneticWrapper,
} from '../../ui/MotionPrimitives';
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

  const typeLabels: Record<string, string> = {
    ayah: t('favorites:typeAyah'),
    hadith: t('favorites:typeHadith'),
    dhikr: t('favorites:typeDhikr'),
    article: t('favorites:typeArticle'),
  };

  return (
    <div className="space-y-8 pb-16">
      <PageHero
        variant="editorial"
        kicker={`${t('favorites:bannerTag')} · ${t('favorites:savedItems')}`}
        title={t('favorites:title')}
        subtitle={t('favorites:subtitle')}
        aside={
          <div className="az-liquid-glass-card rounded-2xl p-5 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="az-type-overline text-[#587068] dark:text-[#9CAFA7]">
                {t('favorites:totalSaved')}
              </div>
              <div className="text-3xl font-display font-extrabold text-[#064E3B] dark:text-[#C8A85E]">
                <InteractiveCounter value={favorites.length} />
                <span className="text-sm font-semibold ml-1.5 text-[#587068] dark:text-[#9CAFA7]">
                  {t('favorites:itemCountSuffix')}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl az-liquid-glass-pill flex items-center justify-center text-[#064E3B] dark:text-[#C8A85E]">
              <Bookmark className="w-5 h-5" />
            </div>
          </div>
        }
      />

      {favorites.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[#587068] dark:text-[#9CAFA7] px-1">
            <span>
              {t('favorites:totalSaved')}:{' '}
              <strong className="font-mono-numbers text-[#091813] dark:text-[#F7F4EC]">
                {favorites.length}
              </strong>{' '}
              {t('favorites:itemCountSuffix')}
            </span>
            <button
              type="button"
              onClick={onClearAll}
              className="font-semibold hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer min-h-[36px] px-2"
            >
              {t('favorites:clearAll')}
            </button>
          </div>

          <StaggerGrid className="space-y-3">
            {favorites.map((item) => (
              <StaggerCard key={item.id}>
                <Card
                  elevated
                  interactive
                  className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-[#064E3B] dark:text-[#C8A85E] uppercase tracking-wider">
                        {typeLabels[item.type] || item.type}
                      </span>
                      <span aria-hidden="true" className="text-[#587068]/50 dark:text-[#9CAFA7]/50">
                        ·
                      </span>
                      <span className="font-mono-numbers text-[#587068] dark:text-[#9CAFA7] text-[11px]">
                        {new Date(item.savedAt || item.timestamp || Date.now()).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-[#091813] dark:text-[#F7F4EC] leading-snug">
                      {item.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-[#3B554D] dark:text-[#A4B9B1] line-clamp-2 leading-relaxed">
                      «{item.snippet}»
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <MagneticWrapper strength={4}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 min-h-[44px]"
                        onClick={() => onNavigate(item.routeTab)}
                      >
                        <span>{t('favorites:openItem')}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </MagneticWrapper>

                    <button
                      type="button"
                      onClick={() => onRemoveFavorite(item.id)}
                      className="w-11 h-11 rounded-xl az-liquid-glass-pill flex items-center justify-center text-[#587068] dark:text-[#9CAFA7] hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-400/40 transition-colors cursor-pointer"
                      title={t('favorites:remove')}
                      aria-label={t('favorites:remove')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              </StaggerCard>
            ))}
          </StaggerGrid>
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
