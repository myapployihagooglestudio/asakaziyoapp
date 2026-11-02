import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Ayah, NavigationTab, QuranReciter, Surah, SupportedLocale } from '../../../types';
import { SURAHS_LIST, VERIFIED_AYAHS, QURAN_RECITERS } from '../../../data/quranData';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { GeometricPattern } from '../../ui/GeometricPattern';
import { toNewUzbekAlphabet } from '../../../utils/newUzbekAlphabet';
import {
  Search,
  BookOpen,
  Volume2,
  Bookmark,
  Share2,
  Check,
  Info,
  Languages,
} from 'lucide-react';

interface QuranViewProps {
  onToggleFavorite: (item: {
    id: string;
    type: 'ayah';
    title: string;
    subtitle: string;
    snippet: string;
    routeTab: NavigationTab;
    routeId: string;
  }) => void;
  isFavorited: (id: string) => boolean;
  arabicFontSize: 'standard' | 'large' | 'huge';
}

export const QuranView: React.FC<QuranViewProps> = ({
  onToggleFavorite,
  isFavorited,
  arabicFontSize,
}) => {
  const { t, i18n } = useTranslation();
  const currentLocale = (i18n.language as SupportedLocale) || 'uz-Latn';

  const [selectedSurahNumber, setSelectedSurahNumber] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [playingAyahId, setPlayingAyahId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const selectedSurah =
    SURAHS_LIST.find((s) => s.number === selectedSurahNumber) || SURAHS_LIST[0];

  const currentAyahs = VERIFIED_AYAHS[selectedSurahNumber] || [];

  // Localized surah name helper
  const getLocalizedSurahName = (surah: Surah) => {
    if (currentLocale === 'uz-Latn-new') {
      return toNewUzbekAlphabet(surah.nameUz);
    }
    return surah.nameUz;
  };

  const getLocalizedSurahMeaning = (surah: Surah) => {
    if (currentLocale === 'uz-Latn-new') {
      return toNewUzbekAlphabet(surah.meaningUz);
    }
    return surah.meaningUz;
  };

  // Localized Ayah translation resolution with fallback chain
  const getAyahTranslation = (ayah: Ayah): { text: string; translator: string } => {
    // 1. Direct locale translation in metadata
    const localizedMeta = ayah.translations?.[currentLocale];
    if (localizedMeta && localizedMeta.text) {
      return { text: localizedMeta.text, translator: localizedMeta.translator };
    }

    // 2. Dynamic conversion for New Uzbek Alphabet
    if (currentLocale === 'uz-Latn-new') {
      const baseUz = ayah.translations?.['uz-Latn']?.text || ayah.translationUz;
      return {
        text: toNewUzbekAlphabet(baseUz),
        translator: toNewUzbekAlphabet('Shayx Muhammad Sodiq Muhammad Yusuf'),
      };
    }

    // 3. Fallback to default Uzbek Latin
    return {
      text: ayah.translationUz,
      translator: 'Shayx Muhammad Sodiq Muhammad Yusuf',
    };
  };

  const filteredSurahs = SURAHS_LIST.filter((s) => {
    const locName = getLocalizedSurahName(s).toLowerCase();
    const locMeaning = getLocalizedSurahMeaning(s).toLowerCase();
    const query = searchQuery.toLowerCase();
    return (
      locName.includes(query) ||
      locMeaning.includes(query) ||
      s.number.toString().includes(query)
    );
  });

  const handlePlayAudio = (ayah: Ayah) => {
    if (playingAyahId === ayah.id && audioElement) {
      try {
        audioElement.pause();
      } catch (e) {
        // ignore
      }
      setPlayingAyahId(null);
      return;
    }

    if (audioElement) {
      try {
        audioElement.pause();
      } catch (e) {
        // ignore
      }
    }

    if (ayah.audioUrl) {
      try {
        const audio = new Audio(ayah.audioUrl);
        audio.onended = () => setPlayingAyahId(null);
        audio.onerror = () => setPlayingAyahId(null);
        const p = audio.play();
        if (p !== undefined) {
          p.catch(() => setPlayingAyahId(null));
        }
        setAudioElement(audio);
        setPlayingAyahId(ayah.id);
      } catch (e) {
        setPlayingAyahId(null);
      }
    }
  };

  const handleCopyAyah = (ayah: Ayah) => {
    const translation = getAyahTranslation(ayah);
    const surahName = getLocalizedSurahName(selectedSurah);
    const text = `${ayah.textAr}\n\n«${translation.text}»\n(${surahName} ${t('quran:surahSuffix')}, ${ayah.numberInSurah}-${t('quran:ayahSuffix')})\n[${translation.translator}]`;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text).catch(() => {});
      }
    } catch (e) {
      // ignore
    }
    setCopiedId(ayah.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fontSizeClass = {
    standard: 'text-2xl sm:text-3xl leading-loose',
    large: 'text-3xl sm:text-4xl leading-loose',
    huge: 'text-4xl sm:text-5xl leading-loose',
  }[arabicFontSize];

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-[#c5a869]/30 bg-gradient-to-r from-[#031d17] to-[#071614] text-white p-6 sm:p-10">
        <GeometricPattern opacity={0.05} />
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#c5a869] uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{t('quran:kalomulloh')}</span>
            <span aria-hidden="true">·</span>
            <span>{t('quran:mushafSharif')}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-white">
            {t('quran:title')}
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            {t('quran:subtitle')}
          </p>
        </div>
      </div>

      {/* Main Grid: Surah Selector + Ayahs List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Surah List (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('quran:searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18] text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#c5a869]"
            />
          </div>

          <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-1">
            {filteredSurahs.map((surah) => {
              const isSelected = surah.number === selectedSurahNumber;
              const surahName = getLocalizedSurahName(surah);
              const surahMeaning = getLocalizedSurahMeaning(surah);

              return (
                <button
                  key={surah.number}
                  onClick={() => setSelectedSurahNumber(surah.number)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#c5a869] bg-[#c5a869]/10 text-stone-900 dark:text-white'
                      : 'border-stone-200/80 dark:border-emerald-950/70 bg-white dark:bg-[#0d211e]/70 hover:border-[#c5a869]/40 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-emerald-950 flex items-center justify-center font-mono-numbers text-xs font-semibold text-stone-600 dark:text-[#c5a869]">
                      {surah.number}
                    </span>
                    <div>
                      <div className="text-sm font-semibold">{surahName}</div>
                      <div className="text-xs text-stone-400 dark:text-stone-500">
                        {surahMeaning} · {surah.numberOfAyahs} {t('quran:ayahSuffix')}
                      </div>
                    </div>
                  </div>
                  <span className="font-arabic text-lg text-[#c5a869]">{surah.nameAr}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Surah Reading Pane (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Surah Header Card */}
          <Card elevated className="p-6 text-center relative overflow-hidden border-[#c5a869]/30">
            <GeometricPattern opacity={0.04} />
            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-center gap-2 text-xs text-stone-500 dark:text-stone-400 uppercase tracking-widest">
                <span>{selectedSurah.revelationType === 'Makkah' ? t('quran:makkah') : t('quran:madinah')}</span>
                <span aria-hidden="true">·</span>
                <span>{selectedSurah.numberOfAyahs} {t('quran:ayahSuffix')}</span>
                <span aria-hidden="true">·</span>
                <span>{selectedSurah.pageNumber}-{t('quran:pageSuffix')}</span>
              </div>

              <h2 className="text-3xl font-display font-bold text-stone-900 dark:text-stone-100">
                {getLocalizedSurahName(selectedSurah)} {t('quran:surahSuffix')}
              </h2>

              <p className="font-arabic text-4xl text-[#c5a869] py-1">{selectedSurah.nameAr}</p>

              {/* Bismillah (except for Surah At-Tawbah) */}
              {selectedSurah.number !== 9 && (
                <div className="pt-2">
                  <p className="font-arabic text-2xl text-stone-700 dark:text-amber-100/90">
                    بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                  </p>
                  <p className="text-xs text-stone-400 dark:text-stone-500 font-editorial italic mt-1">
                    {t('quran:bismillahTranslation')}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Ayahs Display */}
          {currentAyahs.length > 0 ? (
            <div className="space-y-4">
              {currentAyahs.map((ayah) => {
                const isPlaying = playingAyahId === ayah.id;
                const isSaved = isFavorited(ayah.id);
                const { text: ayahTranslationText, translator: translatorName } =
                  getAyahTranslation(ayah);
                const surahName = getLocalizedSurahName(selectedSurah);

                return (
                  <Card
                    key={ayah.id}
                    className={`p-6 space-y-4 transition-all ${
                      isPlaying
                        ? 'border-[#c5a869] ring-1 ring-[#c5a869]/40 bg-gradient-to-b from-[#c5a869]/5 to-transparent'
                        : ''
                    }`}
                  >
                    {/* Top action row */}
                    <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 border-b border-stone-100 dark:border-emerald-950/60 pb-3">
                      <div className="flex items-center gap-2 font-mono-numbers">
                        <span className="w-6 h-6 rounded-md bg-stone-100 dark:bg-emerald-950 flex items-center justify-center font-bold text-[#c5a869]">
                          {ayah.numberInSurah}
                        </span>
                        <span>{surahName} : {ayah.numberInSurah}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handlePlayAudio(ayah)}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            isPlaying
                              ? 'bg-[#c5a869] text-[#071614] border-[#c5a869]'
                              : 'text-stone-500 hover:text-[#c5a869] border-stone-200 dark:border-emerald-950'
                          }`}
                          title={isPlaying ? t('common:stop') : t('common:listen')}
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() =>
                            onToggleFavorite({
                              id: ayah.id,
                              type: 'ayah',
                              title: `${surahName} ${t('quran:surahSuffix')}, ${ayah.numberInSurah}-${t('quran:ayahSuffix')}`,
                              subtitle: ayah.transliterationUz,
                              snippet: ayahTranslationText,
                              routeTab: 'quran',
                              routeId: ayah.id,
                            })
                          }
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            isSaved
                              ? 'bg-[#c5a869]/20 text-[#c5a869] border-[#c5a869]'
                              : 'text-stone-500 hover:text-[#c5a869] border-stone-200 dark:border-emerald-950'
                          }`}
                          title={t('common:save')}
                        >
                          <Bookmark className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleCopyAyah(ayah)}
                          className="p-1.5 rounded-lg border border-stone-200 dark:border-emerald-950 text-stone-500 hover:text-[#c5a869] transition-colors cursor-pointer"
                          title={t('common:copy')}
                        >
                          {copiedId === ayah.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Arabic Text (Authentic, never altered by localization) */}
                    <p
                      dir="rtl"
                      className={`font-arabic text-stone-900 dark:text-amber-100/95 text-right ${fontSizeClass}`}
                    >
                      {ayah.textAr}
                      <span className="inline-block mx-2 text-sm font-mono-numbers text-[#c5a869] border border-[#c5a869]/40 rounded-full w-7 h-7 leading-7 text-center align-middle">
                        {ayah.numberInSurah}
                      </span>
                    </p>

                    {/* Localized Translation */}
                    <div className="space-y-1.5 pt-2">
                      <p className="text-sm sm:text-base text-stone-800 dark:text-stone-200 font-editorial leading-relaxed">
                        «{ayahTranslationText}»
                      </p>
                      <div className="flex items-center justify-between text-xs text-stone-400 dark:text-stone-500 pt-1">
                        <span className="italic">{ayah.transliterationUz}</span>
                        <span className="flex items-center gap-1 text-[11px] text-[#c5a869]">
                          <Languages className="w-3 h-3" />
                          <span>{translatorName}</span>
                        </span>
                      </div>
                    </div>

                    {ayah.tafsirSummaryUz && (
                      <div className="text-xs text-stone-500 dark:text-stone-400 border-t border-stone-100 dark:border-emerald-950/40 pt-2.5">
                        <span className="font-semibold text-stone-700 dark:text-stone-300">{t('quran:tafsir')}: </span>
                        {currentLocale === 'uz-Latn-new' ? toNewUzbekAlphabet(ayah.tafsirSummaryUz) : ayah.tafsirSummaryUz}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-8 text-center space-y-3">
              <Info className="w-8 h-8 text-[#c5a869] mx-auto" />
              <h4 className="text-base font-semibold text-stone-900 dark:text-stone-100">
                {t('quran:inProgressTitle')}
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto">
                {t('quran:inProgressDesc')}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedSurahNumber(1)}
              >
                {t('quran:openFatiha')}
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
