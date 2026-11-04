import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Ayah, NavigationTab, Surah, SupportedLocale } from '../../../types';
import {
  SURAHS_LIST,
  VERIFIED_AYAHS,
  QURAN_RECITERS,
  getSurahAudioUrl,
  getAyahAudioUrl,
} from '../../../data/quranData';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { GeometricPattern } from '../../ui/GeometricPattern';
import { toNewUzbekAlphabet } from '../../../utils/newUzbekAlphabet';
import {
  Search,
  BookOpen,
  Volume2,
  VolumeX,
  Bookmark,
  Share2,
  Check,
  Languages,
  Download,
  Play,
  Pause,
  Loader2,
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
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Full Surah audio player state
  const [isSurahAudioPlaying, setIsSurahAudioPlaying] = useState(false);
  const [surahAudioElement, setSurahAudioElement] = useState<HTMLAudioElement | null>(null);
  const [surahAudioProgress, setSurahAudioProgress] = useState(0);

  // Dynamic remote ayahs for surahs not in static VERIFIED_AYAHS
  const [fetchedAyahs, setFetchedAyahs] = useState<Ayah[] | null>(null);
  const [isLoadingAyahs, setIsLoadingAyahs] = useState(false);

  const selectedSurah =
    SURAHS_LIST.find((s) => s.number === selectedSurahNumber) || SURAHS_LIST[0];

  // Stop audio on surah change
  useEffect(() => {
    if (audioElement) {
      try {
        audioElement.pause();
      } catch (e) {
        // ignore
      }
      setPlayingAyahId(null);
    }
    if (surahAudioElement) {
      try {
        surahAudioElement.pause();
      } catch (e) {
        // ignore
      }
      setIsSurahAudioPlaying(false);
      setSurahAudioProgress(0);
    }

    // Check if we need to fetch remote ayahs for surahs not in VERIFIED_AYAHS
    if (!VERIFIED_AYAHS[selectedSurahNumber]) {
      fetchSurahAyahs(selectedSurahNumber);
    } else {
      setFetchedAyahs(null);
      setIsLoadingAyahs(false);
    }
  }, [selectedSurahNumber]);

  const fetchSurahAyahs = async (surahNum: number) => {
    setIsLoadingAyahs(true);
    try {
      const response = await fetch(
        `https://api.alquran.cloud/v1/surah/${surahNum}/editions/quran-uthmani,uz.sodik`
      );
      if (!response.ok) throw new Error('Network error');
      const data = await response.json();
      if (data.code === 200 && data.data && data.data.length >= 2) {
        const arEdition = data.data[0];
        const uzEdition = data.data[1];

        const mapped: Ayah[] = arEdition.ayahs.map((arAyah: { number: number; numberInSurah: number; text: string }, idx: number) => {
          const uzText = uzEdition.ayahs[idx]?.text || '';
          return {
            id: `${surahNum}-${arAyah.numberInSurah}`,
            number: arAyah.number,
            numberInSurah: arAyah.numberInSurah,
            surahNumber: surahNum,
            surahNameUz: selectedSurah.nameUz,
            textAr: arAyah.text,
            translationUz: uzText,
            transliterationUz: `${selectedSurah.nameUz} surasi, ${arAyah.numberInSurah}-oyat`,
            audioUrl: getAyahAudioUrl(surahNum, arAyah.numberInSurah),
            tafsirSummaryUz: '',
            translations: {
              'uz-Latn': {
                language: 'uz-Latn',
                translator: 'Shayx Muhammad Sodiq Muhammad Yusuf',
                source: 'Tafsiri Hilol',
                version: '2021',
                text: uzText,
              },
              'uz-Latn-new': {
                language: 'uz-Latn-new',
                translator: 'Şayx Muhammad Sodiq Muhammad Yusuf',
                source: 'Tafsiri Hilol',
                version: '2021',
                text: toNewUzbekAlphabet(uzText),
              },
            },
          };
        });
        setFetchedAyahs(mapped);
      } else {
        setFetchedAyahs(null);
      }
    } catch (e) {
      setFetchedAyahs(null);
    } finally {
      setIsLoadingAyahs(false);
    }
  };

  const currentAyahs: Ayah[] =
    VERIFIED_AYAHS[selectedSurahNumber] || fetchedAyahs || [];

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
    const localizedMeta = ayah.translations?.[currentLocale];
    if (localizedMeta && localizedMeta.text) {
      return { text: localizedMeta.text, translator: localizedMeta.translator };
    }

    if (currentLocale === 'uz-Latn-new') {
      const baseUz = ayah.translations?.['uz-Latn']?.text || ayah.translationUz;
      return {
        text: toNewUzbekAlphabet(baseUz),
        translator: toNewUzbekAlphabet('Shayx Muhammad Sodiq Muhammad Yusuf'),
      };
    }

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

  const handlePlayAyahAudio = (ayah: Ayah) => {
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

    if (surahAudioElement && isSurahAudioPlaying) {
      surahAudioElement.pause();
      setIsSurahAudioPlaying(false);
    }

    const audioUrl = ayah.audioUrl || getAyahAudioUrl(selectedSurahNumber, ayah.numberInSurah);
    try {
      const audio = new Audio(audioUrl);
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
  };

  // Full surah audio playback
  const handleToggleSurahAudio = () => {
    const surahUrl = getSurahAudioUrl(selectedSurahNumber);

    if (isSurahAudioPlaying && surahAudioElement) {
      surahAudioElement.pause();
      setIsSurahAudioPlaying(false);
      return;
    }

    if (audioElement && playingAyahId) {
      audioElement.pause();
      setPlayingAyahId(null);
    }

    try {
      let audio = surahAudioElement;
      if (!audio || audio.src !== surahUrl) {
        audio = new Audio(surahUrl);
        audio.ontimeupdate = () => {
          if (audio && audio.duration) {
            setSurahAudioProgress((audio.currentTime / audio.duration) * 100);
          }
        };
        audio.onended = () => {
          setIsSurahAudioPlaying(false);
          setSurahAudioProgress(0);
        };
        audio.onerror = () => {
          setIsSurahAudioPlaying(false);
        };
        setSurahAudioElement(audio);
      }

      const p = audio.play();
      if (p !== undefined) {
        p.catch(() => setIsSurahAudioPlaying(false));
      }
      setIsSurahAudioPlaying(true);
    } catch (e) {
      setIsSurahAudioPlaying(false);
    }
  };

  // Generic audio download trigger
  const handleDownloadAudio = async (url: string, fileName: string, id: string) => {
    setDownloadingId(id);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      // Fallback direct link
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setTimeout(() => setDownloadingId(null), 1000);
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
            <span>Kalomulloh</span>
            <span aria-hidden="true">·</span>
            <span>114 Ta Sura Toʻliq Mushafi Sharif</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-white">
            Qurʼoni Karim
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            Qurʼoni Karimning 114 ta surasini asl arabcha matni, tafsir maʼnolari, qiroat tinglash va MP3 audiolarni yuklab olish imkoniyati.
          </p>
        </div>
      </div>

      {/* Main Grid: Surah Selector (114 Surahs) + Active Surah Reading Pane */}
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

          <div className="space-y-1.5 max-h-[620px] overflow-y-auto pr-1">
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
                      ? 'border-[#c5a869] bg-[#c5a869]/10 text-stone-900 dark:text-white ring-1 ring-[#c5a869]/30'
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
                        {surahMeaning} · {surah.numberOfAyahs} oyat
                      </div>
                    </div>
                  </div>
                  <span className="font-arabic text-lg text-[#c5a869]">{surah.nameAr}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Surah Reading & Audio Center (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Surah Header Card with Full Audio Player & Audio Download */}
          <Card elevated className="p-6 text-center relative overflow-hidden border-[#c5a869]/30 space-y-4">
            <GeometricPattern opacity={0.04} />
            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-center gap-2 text-xs text-stone-500 dark:text-stone-400 uppercase tracking-widest">
                <span>{selectedSurah.revelationType === 'Makkah' ? 'Makkiy' : 'Madaniy'}</span>
                <span aria-hidden="true">·</span>
                <span>{selectedSurah.numberOfAyahs} oyat</span>
                <span aria-hidden="true">·</span>
                <span>{selectedSurah.pageNumber}-sahifa</span>
              </div>

              <h2 className="text-3xl font-display font-bold text-stone-900 dark:text-stone-100">
                {getLocalizedSurahName(selectedSurah)} surasi
              </h2>

              <p className="font-arabic text-4xl text-[#c5a869] py-1">{selectedSurah.nameAr}</p>

              {/* Bismillah (except for Surah At-Tawbah) */}
              {selectedSurah.number !== 9 && (
                <div className="pt-2">
                  <p className="font-arabic text-2xl text-stone-700 dark:text-amber-100/90">
                    بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                  </p>
                  <p className="text-xs text-stone-400 dark:text-stone-500 italic mt-1">
                    Mehribon va rahmli Allohning nomi ila boshlayman
                  </p>
                </div>
              )}
            </div>

            {/* Audio player & Download Controller for Full Surah */}
            <div className="relative z-10 pt-4 border-t border-stone-200/60 dark:border-emerald-950/60 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#c5a869]/5 p-4 rounded-xl">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleToggleSurahAudio}
                  className="w-10 h-10 rounded-full bg-[#c5a869] text-[#071614] flex items-center justify-center hover:opacity-90 transition-all cursor-pointer shadow-md"
                  title={isSurahAudioPlaying ? 'Qiroatni toʻxtatish' : 'Toʻliq sura qiroatini tinglash'}
                >
                  {isSurahAudioPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>
                <div className="text-left">
                  <div className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    {isSurahAudioPlaying ? 'Qiroat ijro etilmoqda...' : 'Toʻliq sura qiroati'}
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400">
                    Shayx Mishariy al-Afosiy (Murattal)
                  </div>
                </div>
              </div>

              {/* Download Surah MP3 Button */}
              <button
                onClick={() =>
                  handleDownloadAudio(
                    getSurahAudioUrl(selectedSurah.number),
                    `Asaka-Ziyo-Sura-${selectedSurah.number}-${selectedSurah.nameUz}.mp3`,
                    `surah-${selectedSurah.number}`
                  )
                }
                disabled={downloadingId === `surah-${selectedSurah.number}`}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-stone-900 dark:bg-stone-800 text-[#c5a869] hover:bg-stone-800 dark:hover:bg-stone-700 border border-[#c5a869]/30 flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer transition-all shadow-sm"
              >
                {downloadingId === `surah-${selectedSurah.number}` ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Yuklanmoqda...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-[#c5a869]" />
                    <span>Surani yuklab olish (MP3)</span>
                  </>
                )}
              </button>
            </div>
          </Card>

          {/* Ayahs List Display */}
          {isLoadingAyahs ? (
            <Card className="p-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#c5a869] animate-spin mx-auto" />
              <div className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                {selectedSurah.nameUz} surasi oyatlari yuklanmoqda...
              </div>
              <p className="text-xs text-stone-400">
                Asl arabcha xattotlik matni va oʻzbekcha tafsir maʼnolari tayyorlanmoqda.
              </p>
            </Card>
          ) : currentAyahs.length > 0 ? (
            <div className="space-y-4">
              {currentAyahs.map((ayah) => {
                const isPlaying = playingAyahId === ayah.id;
                const isSaved = isFavorited(ayah.id);
                const { text: ayahTranslationText, translator: translatorName } =
                  getAyahTranslation(ayah);
                const surahName = getLocalizedSurahName(selectedSurah);
                const ayahAudio = ayah.audioUrl || getAyahAudioUrl(selectedSurahNumber, ayah.numberInSurah);

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
                        {/* Play Ayah */}
                        <button
                          onClick={() => handlePlayAyahAudio(ayah)}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            isPlaying
                              ? 'bg-[#c5a869] text-[#071614] border-[#c5a869]'
                              : 'text-stone-500 hover:text-[#c5a869] border-stone-200 dark:border-emerald-950'
                          }`}
                          title={isPlaying ? 'Toʻxtatish' : 'Oyatni tinglash'}
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>

                        {/* Download Ayah MP3 */}
                        <button
                          onClick={() =>
                            handleDownloadAudio(
                              ayahAudio,
                              `Asaka-Ziyo-${selectedSurah.nameUz}-oyat-${ayah.numberInSurah}.mp3`,
                              ayah.id
                            )
                          }
                          className="p-1.5 rounded-lg border border-stone-200 dark:border-emerald-950 text-stone-500 hover:text-[#c5a869] transition-colors cursor-pointer"
                          title="Oyat audiosini yuklab olish (MP3)"
                        >
                          {downloadingId === ayah.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-[#c5a869]" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>

                        {/* Save to Favorites */}
                        <button
                          onClick={() =>
                            onToggleFavorite({
                              id: ayah.id,
                              type: 'ayah',
                              title: `${surahName} surasi, ${ayah.numberInSurah}-oyat`,
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
                          title="Saqlash"
                        >
                          <Bookmark className="w-4 h-4" />
                        </button>

                        {/* Copy / Share */}
                        <button
                          onClick={() => handleCopyAyah(ayah)}
                          className="p-1.5 rounded-lg border border-stone-200 dark:border-emerald-950 text-stone-500 hover:text-[#c5a869] transition-colors cursor-pointer"
                          title="Nusxa olish"
                        >
                          {copiedId === ayah.id ? (
                            <Check className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Share2 className="w-4 h-4" />
                          )}
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
                        <span className="font-semibold text-stone-700 dark:text-stone-300">Tafsir: </span>
                        {currentLocale === 'uz-Latn-new' ? toNewUzbekAlphabet(ayah.tafsirSummaryUz) : ayah.tafsirSummaryUz}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-8 text-center space-y-4">
              <BookOpen className="w-10 h-10 text-[#c5a869] mx-auto" />
              <h4 className="text-base font-semibold text-stone-900 dark:text-stone-100">
                {selectedSurah.nameUz} surasi qiroati tayyor
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto">
                Ushbu surani yuqoridagi audio pleer orqali toʻliq tinglashingiz yoki &quot;Surani yuklab olish (MP3)&quot; tugmasi orqali qurilmangizga yuklab olishingiz mumkin.
              </p>
              <div className="flex justify-center gap-3">
                <Button variant="primary" size="sm" onClick={handleToggleSurahAudio}>
                  <Play className="w-4 h-4 mr-1.5" />
                  <span>Qiroatni boshlash</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleDownloadAudio(
                      getSurahAudioUrl(selectedSurah.number),
                      `Asaka-Ziyo-Sura-${selectedSurah.number}-${selectedSurah.nameUz}.mp3`,
                      `surah-${selectedSurah.number}`
                    )
                  }
                >
                  <Download className="w-4 h-4 mr-1.5 text-[#c5a869]" />
                  <span>MP3 yuklab olish</span>
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
