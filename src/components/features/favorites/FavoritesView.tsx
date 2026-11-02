import React from 'react';
import { FavoriteItem, NavigationTab } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { GeometricPattern } from '../../ui/GeometricPattern';
import { Bookmark, Trash2, ArrowRight, BookOpen } from 'lucide-react';

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
  const typeLabels = {
    ayah: 'Qurʼon oyati',
    hadith: 'Hadisi sharif',
    dhikr: 'Zikr / Duo',
    article: 'Ilmiy maqola',
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-[#c5a869]/30 bg-gradient-to-r from-[#031d17] to-[#071614] text-white p-6 sm:p-10">
        <GeometricPattern opacity={0.05} />
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#c5a869] uppercase tracking-wider">
            <Bookmark className="w-3.5 h-3.5" />
            <span>Shaxsiy Toʻplam</span>
            <span aria-hidden="true">·</span>
            <span>Saqlanganlar</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-white">
            Sevimlilar
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            Siz saqlab qoʻygan oyatlar, hadislar, zikrlar va maqolalar roʻyxati. Maʼlumotlar qurilmangizda saqlanadi.
          </p>
        </div>
      </div>

      {favorites.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
            <span>Jami saqlanganlar: <strong className="font-mono-numbers">{favorites.length}</strong> ta</span>
            <button
              onClick={onClearAll}
              className="hover:text-red-500 transition-colors cursor-pointer"
            >
              Barchasini tozalash
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {favorites.map((item) => (
              <Card key={item.id} elevated className="p-6 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-stone-400">
                    <span className="font-semibold text-[#c5a869]">
                      {typeLabels[item.type]}
                    </span>
                    <button
                      onClick={() => onRemoveFavorite(item.id)}
                      className="p-1 hover:text-red-500 transition-colors cursor-pointer"
                      title="Oʻchirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h4 className="text-base font-bold text-stone-900 dark:text-stone-100">
                    {item.title}
                  </h4>
                  {item.subtitle && (
                    <p className="text-xs text-stone-500 dark:text-stone-400">{item.subtitle}</p>
                  )}
                  <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-3 leading-relaxed font-editorial italic">
                    «{item.snippet}»
                  </p>
                </div>

                <div className="pt-3 border-t border-stone-100 dark:border-emerald-950/60">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigate(item.routeTab)}
                    className="p-0 text-xs text-[#c5a869] hover:text-[#d4af37]"
                  >
                    <span>Asl manbaga oʻtish</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<BookOpen className="w-6 h-6" />}
          title="Hozircha saqlangan maʼlumotlar yoʻq"
          description="Qurʼon oyatlari, hadislar, zikrlar yoki maqolalardagi xatchoʻp (bookmark) belgisini bosib, ularni bu yerda toʻplashingiz mumkin."
          actionLabel="Qurʼon boʻlimini ochish"
          onAction={() => onNavigate('quran')}
        />
      )}
    </div>
  );
};
