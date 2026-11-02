import React, { useState } from 'react';
import { Ayah, NavigationTab, QuranReciter, Surah } from '../../../types';
import { SURAHS_LIST, VERIFIED_AYAHS, QURAN_RECITERS } from '../../../data/quranData';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { GeometricPattern, IslamicStarEmblem } from '../../ui/GeometricPattern';
import {
  Search,
  BookOpen,
  Volume2,
  VolumeX,
  Bookmark,
  Share2,
  Check,
  ChevronDown,
  Info,
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
  const [selectedSurahNumber, setSelectedSurahNumber] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [playingAyahId, setPlayingAyahId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [selectedReciter, setSelectedReciter] = useState<QuranReciter>(QURAN_RECITERS[0]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const selectedSurah =
    SURAHS_LIST.find((s) => s.number === selectedSurahNumber) || SURAHS_LIST[0];

  const currentAyahs = VERIFIED_AYAHS[selectedSurahNumber] || [];

  const filteredSurahs = SURAHS_LIST.filter(
    (s) =>
      s.nameUz.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.meaningUz.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.number.toString().includes(searchQuery)
  );

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
    const text = `${ayah.textAr}\n\n«${ayah.translationUz}»\n(${selectedSurah.nameUz} surasi, ${ayah.numberInSurah}-oyat)`;
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
            <span>Kalomulloh</span>
            <span aria-hidden="true">·</span>
            <span>Musʼhafi Sharif</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-white">
            Qurʼoni Karim Tilovati va Maʼnolari
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            Asl arabiy qiroat, Shayx Muhammad Sodiq Muhammad Yusuf rahmatullohi alayh maʼnolari tarjimasi hamda moʻtabar qorilar audio tilovati.
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
              placeholder="Sura nomi yoki raqamini qidiring..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18] text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#c5a869]"
            />
          </div>

          <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-1">
            {filteredSurahs.map((surah) => {
              const isSelected = surah.number === selectedSurahNumber;
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
                      <div className="text-sm font-semibold">{surah.nameUz}</div>
                      <div className="text-xs text-stone-400 dark:text-stone-500">
                        {surah.meaningUz} · {surah.numberOfAyahs} oyat
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
                <span>{selectedSurah.revelationType} surasi</span>
                <span aria-hidden="true">·</span>
                <span>{selectedSurah.numberOfAyahs} oyat</span>
                <span aria-hidden="true">·</span>
                <span>{selectedSurah.pageNumber}-sahifa</span>
              </div>

              <h2 className="text-3xl font-display font-bold text-stone-900 dark:text-stone-100">
                {selectedSurah.nameUz} surasi
              </h2>

              <p className="font-arabic text-4xl text-[#c5a869] py-1">{selectedSurah.nameAr}</p>

              {/* Bismillah (except for Surah At-Tawbah) */}
              {selectedSurah.number !== 9 && (
                <div className="pt-2">
                  <p className="font-arabic text-2xl text-stone-700 dark:text-amber-100/90">
                    بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                  </p>
                  <p className="text-xs text-stone-400 dark:text-stone-500 font-editorial italic mt-1">
                    Mehribon va rahmli Allohning nomi ila boshlayman
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
                        <span>{selectedSurah.nameUz} : {ayah.numberInSurah}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handlePlayAudio(ayah)}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            isPlaying
                              ? 'bg-[#c5a869] text-[#071614] border-[#c5a869]'
                              : 'text-stone-500 hover:text-[#c5a869] border-stone-200 dark:border-emerald-950'
                          }`}
                          title={isPlaying ? "Toʻxtatish" : "Tinglash"}
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() =>
                            onToggleFavorite({
                              id: ayah.id,
                              type: 'ayah',
                              title: `${selectedSurah.nameUz} surasi, ${ayah.numberInSurah}-oyat`,
                              subtitle: ayah.transliterationUz,
                              snippet: ayah.translationUz,
                              routeTab: 'quran',
                              routeId: ayah.id,
                            })
                          }
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            isSaved
                              ? 'bg-[#c5a869]/20 text-[#c5a869] border-[#c5a869]'
                              : 'text-stone-500 hover:text-[#c5a869] border-stone-200 dark:border-emerald-950'
                          }`}
                          title="Sevimlilarga qoʻshish"
                        >
                          <Bookmark className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleCopyAyah(ayah)}
                          className="p-1.5 rounded-lg border border-stone-200 dark:border-emerald-950 text-stone-500 hover:text-[#c5a869] transition-colors cursor-pointer"
                          title="Nusxa olish"
                        >
                          {copiedId === ayah.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Arabic Text */}
                    <p
                      dir="rtl"
                      className={`font-arabic text-stone-900 dark:text-amber-100/95 text-right ${fontSizeClass}`}
                    >
                      {ayah.textAr}
                      <span className="inline-block mx-2 text-sm font-mono-numbers text-[#c5a869] border border-[#c5a869]/40 rounded-full w-7 h-7 leading-7 text-center align-middle">
                        {ayah.numberInSurah}
                      </span>
                    </p>

                    {/* Uzbek Translation */}
                    <div className="space-y-1.5 pt-2">
                      <p className="text-sm sm:text-base text-stone-800 dark:text-stone-200 font-editorial leading-relaxed">
                        «{ayah.translationUz}»
                      </p>
                      <p className="text-xs text-stone-400 dark:text-stone-500 italic">
                        {ayah.transliterationUz}
                      </p>
                    </div>

                    {ayah.tafsirSummaryUz && (
                      <div className="text-xs text-stone-500 dark:text-stone-400 border-t border-stone-100 dark:border-emerald-950/40 pt-2.5">
                        <span className="font-semibold text-stone-700 dark:text-stone-300">Tafsir maʼnosi: </span>
                        {ayah.tafsirSummaryUz}
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
                Ushbu sura matni toʻliq maʼlumotlar bazasiga kiritilmoqda
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto">
                Hozirda Fotiha, Ixlos va Mulk suralari toʻliq arabiy qiroat va maʼnolari bilan koʻrish uchun tayyorlangan.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedSurahNumber(1)}
              >
                Fotiha surasini ochish
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
