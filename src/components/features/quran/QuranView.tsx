import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Ayah, NavigationTab, Surah, SupportedLocale } from '../../../types';
import {
  SURAHS_LIST,
  VERIFIED_AYAHS,
  QURAN_RECITERS,
  getReciterSurahAudioUrl,
  getAyahAudioUrl,
} from '../../../data/quranData';
import {
  TAFSIRI_HILOL_ENTRIES,
  TafsirSurahEntry,
  searchTafsirHilol,
  getTafsirEntryForSurah,
} from '../../../data/tafsirHilolData';
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
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  FastForward,
  Headphones,
  ExternalLink,
  Sparkles,
  Info,
  CheckCircle,
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

  // Sub-tabs: 1. Mushaf & Recitation (114 Surahs), 2. Shayx Muhammad Sodiq Muhammad Yusuf Tafsiri Hilol
  const [activeQuranTab, setActiveQuranTab] = useState<'mushaf' | 'tafsir_hilol'>('mushaf');

  // Selected Surah with localStorage memory
  const [selectedSurahNumber, setSelectedSurahNumber] = useState<number>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('asaka_ziyo_last_surah');
        if (saved) {
          const num = parseInt(saved, 10);
          if (num >= 1 && num <= 114) return num;
        }
      }
    } catch {
      // fallback
    }
    return 1;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [tafsirSearchQuery, setTafsirSearchQuery] = useState('');

  // 8 Canonical Reciters
  const [selectedReciterId, setSelectedReciterId] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('asaka_ziyo_reciter');
        if (saved && QURAN_RECITERS.some((r) => r.id === saved)) return saved;
      }
    } catch {
      // fallback
    }
    return 'mishary';
  });

  // Audio Playback State
  const [isSurahAudioPlaying, setIsSurahAudioPlaying] = useState(false);
  const [surahAudioProgress, setSurahAudioProgress] = useState(0);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isLooping, setIsLooping] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Single Ayah playback
  const [playingAyahId, setPlayingAyahId] = useState<string | null>(null);
  const ayahAudioRef = useRef<HTMLAudioElement | null>(null);
  const surahAudioRef = useRef<HTMLAudioElement | null>(null);

  // Tafsir Audio lecture playback
  const [playingTafsirLesson, setPlayingTafsirLesson] = useState<number | null>(null);
  const tafsirAudioRef = useRef<HTMLAudioElement | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [fetchedAyahs, setFetchedAyahs] = useState<Ayah[] | null>(null);
  const [isLoadingAyahs, setIsLoadingAyahs] = useState(false);

  const selectedSurah =
    SURAHS_LIST.find((s) => s.number === selectedSurahNumber) || SURAHS_LIST[0];

  const activeReciter =
    QURAN_RECITERS.find((r) => r.id === selectedReciterId) || QURAN_RECITERS[0];

  // Remember last surah in localStorage
  useEffect(() => {
    try {
      localStorage.setItem('asaka_ziyo_last_surah', String(selectedSurahNumber));
    } catch {
      // ignore
    }
  }, [selectedSurahNumber]);

  // Clean audio on surah switch
  useEffect(() => {
    if (surahAudioRef.current) {
      surahAudioRef.current.pause();
      surahAudioRef.current = null;
      setIsSurahAudioPlaying(false);
      setSurahAudioProgress(0);
      setCurrentTimeSec(0);
      setDurationSec(0);
    }
    if (ayahAudioRef.current) {
      ayahAudioRef.current.pause();
      ayahAudioRef.current = null;
      setPlayingAyahId(null);
    }
    setAudioError(null);

    if (!VERIFIED_AYAHS[selectedSurahNumber]) {
      fetchSurahAyahs(selectedSurahNumber);
    } else {
      setFetchedAyahs(null);
      setIsLoadingAyahs(false);
    }
  }, [selectedSurahNumber, selectedReciterId]);

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

        const mapped: Ayah[] = arEdition.ayahs.map(
          (arAyah: { number: number; numberInSurah: number; text: string }, idx: number) => {
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
          }
        );
        setFetchedAyahs(mapped);
      } else {
        setFetchedAyahs(null);
      }
    } catch {
      setFetchedAyahs(null);
    } finally {
      setIsLoadingAyahs(false);
    }
  };

  const handleToggleSurahAudio = () => {
    setAudioError(null);
    if (isSurahAudioPlaying && surahAudioRef.current) {
      surahAudioRef.current.pause();
      setIsSurahAudioPlaying(false);
      return;
    }

    if (!surahAudioRef.current) {
      const audioUrl = getReciterSurahAudioUrl(selectedReciterId, selectedSurahNumber);
      const audio = new Audio(audioUrl);
      audio.playbackRate = playbackSpeed;
      audio.loop = isLooping;

      audio.ontimeupdate = () => {
        if (audio.duration && !isNaN(audio.duration)) {
          setSurahAudioProgress((audio.currentTime / audio.duration) * 100);
          setCurrentTimeSec(Math.round(audio.currentTime));
          setDurationSec(Math.round(audio.duration));
        }
      };

      audio.onended = () => {
        if (!isLooping) {
          setIsSurahAudioPlaying(false);
          setSurahAudioProgress(0);
          // auto play next surah if available
          if (selectedSurahNumber < 114) {
            setSelectedSurahNumber((prev) => prev + 1);
          }
        }
      };

      audio.onerror = () => {
        setAudioError(`${activeReciter.name} qiroatini yuklashda tarmoq xatoligi yuz berdi. Boshqa qorini tanlab koʻrishingiz mumkin.`);
        setIsSurahAudioPlaying(false);
      };

      surahAudioRef.current = audio;
    }

    surahAudioRef.current
      .play()
      .then(() => setIsSurahAudioPlaying(true))
      .catch((err) => {
        setAudioError('Audio ijrosini boshlashda xatolik yuz berdi.');
        setIsSurahAudioPlaying(false);
      });
  };

  const handleChangeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (surahAudioRef.current) {
      surahAudioRef.current.playbackRate = speed;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSurahAudioProgress(val);
    if (surahAudioRef.current && surahAudioRef.current.duration) {
      surahAudioRef.current.currentTime = (val / 100) * surahAudioRef.current.duration;
    }
  };

  const handlePlayAyah = (ayah: Ayah) => {
    if (playingAyahId === ayah.id && ayahAudioRef.current) {
      ayahAudioRef.current.pause();
      setPlayingAyahId(null);
      return;
    }

    if (ayahAudioRef.current) {
      ayahAudioRef.current.pause();
    }

    if (ayah.audioUrl) {
      const audio = new Audio(ayah.audioUrl);
      audio.playbackRate = playbackSpeed;
      audio.onended = () => setPlayingAyahId(null);
      audio.onerror = () => setPlayingAyahId(null);
      audio.play().then(() => setPlayingAyahId(ayah.id)).catch(() => setPlayingAyahId(null));
      ayahAudioRef.current = audio;
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentAyahs: Ayah[] =
    VERIFIED_AYAHS[selectedSurahNumber] || fetchedAyahs || [];

  const getLocalizedSurahName = (surah: Surah) => {
    if (currentLocale === 'uz-Latn-new') return toNewUzbekAlphabet(surah.nameUz);
    return surah.nameUz;
  };

  const getLocalizedSurahMeaning = (surah: Surah) => {
    if (currentLocale === 'uz-Latn-new') return toNewUzbekAlphabet(surah.meaningUz);
    return surah.meaningUz;
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

  const activeTafsirEntry = getTafsirEntryForSurah(selectedSurahNumber);
  const filteredTafsirList = searchTafsirHilol(tafsirSearchQuery);

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto">
      {/* 1. Header Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-[#c5a869]/30 bg-gradient-to-r from-[#031d17] via-[#071614] to-[#04241d] p-6 sm:p-10 text-white shadow-xl">
        <img
          src="/images/quran_illumination_art_1793634658336.jpg"
          alt="Quran Illumination Art"
          className="absolute inset-0 w-full h-full object-cover object-center brightness-75"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#031d17]/95 via-[#031d17]/85 to-transparent" />
        <GeometricPattern opacity={0.06} />
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#c5a869] uppercase tracking-wider">
            <BookOpen className="w-4 h-4" />
            <span>Kalomulloh Ekotizimi</span>
            <span aria-hidden="true">·</span>
            <span>114 Ta Sura · 8 Mashhur Qori · Tafsiri Hilol</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-white">
            Qurʼoni Karim va Tafsir Maskani
          </h1>
          <p className="text-xs sm:text-sm text-stone-200 leading-relaxed max-w-2xl">
            114 ta suraning toʻliq arabcha matni, 8 ta mashhur qorilar audio qiroati, Shayx Muhammad Sodiq Muhammad Yusuf hazratlarining «Tafsiri Hilol» asari va audio darslari.
          </p>
        </div>
      </div>

      {/* 2. Mode Selector: 1. Mushafi Sharif vs 2. Tafsiri Hilol */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-emerald-950 pb-3">
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-stone-100 dark:bg-emerald-950/40 border border-stone-200/80 dark:border-emerald-900/40">
          <button
            onClick={() => setActiveQuranTab('mushaf')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeQuranTab === 'mushaf'
                ? 'bg-[#c5a869] text-[#071614] shadow-md'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Mushaf va Tilovat (114 Sura)</span>
          </button>

          <button
            onClick={() => setActiveQuranTab('tafsir_hilol')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeQuranTab === 'tafsir_hilol'
                ? 'bg-[#c5a869] text-[#071614] shadow-md'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Tafsiri Hilol & Hazrat Merosi</span>
          </button>
        </div>

        {/* Reciter Selector (When in Mushaf tab) */}
        {activeQuranTab === 'mushaf' && (
          <div className="flex items-center gap-2 text-xs">
            <Headphones className="w-4 h-4 text-[#c5a869]" />
            <span className="font-semibold text-stone-600 dark:text-stone-300 hidden sm:inline">
              Qori:
            </span>
            <select
              value={selectedReciterId}
              onChange={(e) => {
                setSelectedReciterId(e.target.value);
                try {
                  localStorage.setItem('asaka_ziyo_reciter', e.target.value);
                } catch {
                  // ignore
                }
              }}
              className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18] text-stone-900 dark:text-stone-100 font-semibold text-xs focus:ring-1 focus:ring-[#c5a869] cursor-pointer"
            >
              {QURAN_RECITERS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ---------------- TAB 1: MUSHAF & TILOVAT ---------------- */}
      {activeQuranTab === 'mushaf' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: 114 Surahs Directory (4 cols) */}
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

            <div className="space-y-1.5 max-h-[640px] overflow-y-auto pr-1">
              {filteredSurahs.map((surah) => {
                const isSelected = surah.number === selectedSurahNumber;
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
                        <div className="text-sm font-semibold">{getLocalizedSurahName(surah)}</div>
                        <div className="text-xs text-stone-400 dark:text-stone-500">
                          {getLocalizedSurahMeaning(surah)} · {surah.numberOfAyahs} oyat
                        </div>
                      </div>
                    </div>
                    <span className="font-arabic text-lg text-[#c5a869]">{surah.nameAr}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Surah Player & Verses Reading Pane (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Surah Header & Premium Audio Controller */}
            <Card elevated className="p-6 text-center relative overflow-hidden border-[#c5a869]/40 space-y-4 bg-gradient-to-br from-stone-900 via-[#071614] to-stone-900 text-white">
              <GeometricPattern opacity={0.05} />
              <div className="relative z-10 space-y-2">
                <div className="flex items-center justify-center gap-2 text-xs text-[#c5a869] uppercase tracking-widest font-semibold">
                  <span>{selectedSurah.revelationType === 'Makkah' ? 'Makkiy' : 'Madaniy'}</span>
                  <span>·</span>
                  <span>{selectedSurah.numberOfAyahs} oyat</span>
                  <span>·</span>
                  <span>{selectedSurah.pageNumber}-sahifa</span>
                </div>

                <h2 className="text-3xl font-display font-bold text-white">
                  {getLocalizedSurahName(selectedSurah)} surasi
                </h2>

                <p className="font-arabic text-4xl text-[#c5a869] py-1">{selectedSurah.nameAr}</p>

                {selectedSurah.number !== 9 && (
                  <div className="pt-2">
                    <p className="font-arabic text-2xl text-amber-100/90">
                      بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                    </p>
                    <p className="text-xs text-stone-400 italic mt-0.5">
                      Mehribon va rahmli Allohning nomi ila boshlayman
                    </p>
                  </div>
                )}
              </div>

              {/* Advanced Audio Player Bar */}
              <div className="relative z-10 pt-4 border-t border-white/10 space-y-3 bg-black/40 p-4 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between text-xs text-stone-300">
                  <div className="flex items-center gap-2">
                    <Headphones className="w-3.5 h-3.5 text-[#c5a869]" />
                    <span className="font-semibold">{activeReciter.name}</span>
                  </div>
                  <div className="font-mono text-[11px] text-[#c5a869]">
                    {formatSeconds(currentTimeSec)} / {formatSeconds(durationSec)}
                  </div>
                </div>

                {/* Progress Scrub Bar */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  value={surahAudioProgress}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-[#c5a869]"
                />

                {/* Controls row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  {/* Prev / Play / Next */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => selectedSurahNumber > 1 && setSelectedSurahNumber((n) => n - 1)}
                      disabled={selectedSurahNumber <= 1}
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors"
                      title="Oldingi sura"
                    >
                      <SkipBack className="w-4 h-4" />
                    </button>

                    <button
                      onClick={handleToggleSurahAudio}
                      className="w-11 h-11 rounded-full bg-[#c5a869] text-[#071614] flex items-center justify-center font-bold hover:scale-105 transition-all shadow-md cursor-pointer"
                      title={isSurahAudioPlaying ? 'Pauza' : 'Qiroatni tinglash'}
                    >
                      {isSurahAudioPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </button>

                    <button
                      onClick={() => selectedSurahNumber < 114 && setSelectedSurahNumber((n) => n + 1)}
                      disabled={selectedSurahNumber >= 114}
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors"
                      title="Keyingi sura"
                    >
                      <SkipForward className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Speed Controls: 0.75x, 1x, 1.25x, 1.5x */}
                  <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl">
                    {[0.75, 1, 1.25, 1.5].map((sp) => (
                      <button
                        key={sp}
                        onClick={() => handleChangeSpeed(sp)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono transition-all ${
                          playbackSpeed === sp
                            ? 'bg-[#c5a869] text-[#071614]'
                            : 'text-stone-300 hover:text-white'
                        }`}
                      >
                        {sp}x
                      </button>
                    ))}
                  </div>

                  {/* Loop Toggle */}
                  <button
                    onClick={() => setIsLooping(!isLooping)}
                    className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-colors ${
                      isLooping
                        ? 'border-[#c5a869] bg-[#c5a869]/20 text-[#c5a869]'
                        : 'border-white/10 text-stone-400 hover:text-white'
                    }`}
                    title="Takrorlash rejimi"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Takrorlash</span>
                  </button>
                </div>

                {audioError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs">
                    {audioError}
                  </div>
                )}
              </div>
            </Card>

            {/* Verses Reading List */}
            <div className="space-y-4">
              {isLoadingAyahs ? (
                <Card className="p-12 text-center text-xs text-stone-500">
                  Sura oyatlari va tarjimasi yuklanmoqda...
                </Card>
              ) : currentAyahs.length === 0 ? (
                <Card className="p-10 text-center text-xs text-stone-500">
                  Ushbu sura oyatlari tez orada toʻliq namoyish etiladi.
                </Card>
              ) : (
                currentAyahs.map((ayah) => {
                  const isPlayingThisAyah = playingAyahId === ayah.id;
                  const isAyahFav = isFavorited(ayah.id);

                  return (
                    <Card
                      key={ayah.id}
                      elevated={isPlayingThisAyah}
                      className={`p-5 sm:p-6 space-y-4 transition-all ${
                        isPlayingThisAyah ? 'border-[#c5a869] ring-2 ring-[#c5a869]/40 bg-[#c5a869]/5' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-stone-100 dark:border-emerald-950/60 pb-3">
                        <span className="font-mono-numbers px-2.5 py-0.5 rounded-lg bg-stone-100 dark:bg-emerald-950 text-xs font-bold text-[#c5a869]">
                          {selectedSurah.number}:{ayah.numberInSurah}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {ayah.audioUrl && (
                            <button
                              onClick={() => handlePlayAyah(ayah)}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                isPlayingThisAyah
                                  ? 'bg-[#c5a869] text-[#071614] border-[#c5a869]'
                                  : 'text-stone-500 hover:text-[#c5a869] border-stone-200 dark:border-emerald-950'
                              }`}
                              title="Oyatni tinglash"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() =>
                              onToggleFavorite({
                                id: ayah.id,
                                type: 'ayah',
                                title: `${selectedSurah.nameUz}, ${ayah.numberInSurah}-oyat`,
                                subtitle: selectedSurah.nameAr,
                                snippet: ayah.translationUz,
                                routeTab: 'quran',
                                routeId: ayah.id,
                              })
                            }
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              isAyahFav
                                ? 'bg-[#c5a869]/20 text-[#c5a869] border-[#c5a869]'
                                : 'text-stone-500 hover:text-[#c5a869] border-stone-200 dark:border-emerald-950'
                            }`}
                            title="Sevimlilarga qoʻshish"
                          >
                            <Bookmark className={`w-4 h-4 ${isAyahFav ? 'fill-[#c5a869]' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {/* Arabic text with beautiful Amiri typography */}
                      <p
                        dir="rtl"
                        className="font-arabic text-2xl sm:text-3xl text-stone-900 dark:text-amber-100/95 leading-loose text-right"
                      >
                        {ayah.textAr}
                      </p>

                      {/* Translation by Shayx Muhammad Sodiq Muhammad Yusuf */}
                      <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed font-editorial italic">
                        «{ayah.translationUz}»
                      </p>

                      <div className="text-[11px] text-stone-400 dark:text-stone-500 border-t border-stone-100 dark:border-emerald-950/60 pt-2 flex items-center justify-between">
                        <span>Tarjima: Shayx Muhammad Sodiq Muhammad Yusuf (Tafsiri Hilol)</span>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- TAB 2: SHAYX MUHAMMAD SODIQ MUHAMMAD YUSUF TAFSIRI HILOL ---------------- */}
      {activeQuranTab === 'tafsir_hilol' && (
        <div className="space-y-6">
          {/* Tafsir Search Bar */}
          <div className="relative max-w-xl mx-auto">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tafsir mavzulari yoki suralar boʻyicha qidiring..."
              value={tafsirSearchQuery}
              onChange={(e) => setTafsirSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18] text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#c5a869]"
            />
          </div>

          {/* Tafsir Overview Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTafsirList.map((entry) => (
              <Card
                key={entry.surahNumber}
                elevated
                className="p-6 space-y-4 border-[#c5a869]/30 bg-stone-50/50 dark:bg-[#071614]/50"
              >
                <div className="flex items-center justify-between border-b border-stone-200 dark:border-emerald-950 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-[#c5a869]/15 text-[#c5a869] font-bold text-xs flex items-center justify-center font-mono">
                      {entry.surahNumber}
                    </span>
                    <div>
                      <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
                        {entry.surahNameUz} surasi tafsiri
                      </h3>
                      <div className="text-xs text-stone-400">
                        {entry.revelationType === 'Makkah' ? 'Makkiy' : 'Madaniy'} · {entry.totalAyahs} oyat
                      </div>
                    </div>
                  </div>
                  <span className="font-arabic text-2xl text-[#c5a869]">{entry.nameAr}</span>
                </div>

                <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                  {entry.tafsirOverview}
                </p>

                {/* Key Themes tags */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-[#c5a869]">Asosiy mavzular:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {entry.keyThemes.map((theme, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-emerald-950 text-stone-700 dark:text-stone-300 text-[11px]"
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Sample Ayah Tafsir Excerpt */}
                {entry.sampleAyahTafsir.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-white dark:bg-[#091a18] border border-stone-200/80 dark:border-emerald-950 space-y-2 text-xs">
                    <div className="font-bold text-[#c5a869] flex items-center justify-between">
                      <span>{entry.sampleAyahTafsir[0].ayahNumber}-oyat sharhi (Tafsiri Hilol):</span>
                    </div>
                    <p dir="rtl" className="font-arabic text-base text-stone-900 dark:text-amber-100">
                      {entry.sampleAyahTafsir[0].textAr}
                    </p>
                    <p className="italic text-stone-600 dark:text-stone-400">
                      «{entry.sampleAyahTafsir[0].translationUz}»
                    </p>
                    <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
                      {entry.sampleAyahTafsir[0].tafsirHilolBody[0]}
                    </p>
                  </div>
                )}

                {/* Audio Lesson & Attributions */}
                <div className="pt-3 border-t border-stone-200 dark:border-emerald-950 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="text-[11px] text-stone-400">
                    {entry.sourceNote}
                  </div>
                  {entry.audioLessonUrl && (
                    <a
                      href={entry.audioLessonUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#c5a869] text-[#071614] font-bold text-xs shadow-sm hover:brightness-105 transition-all"
                    >
                      <Headphones className="w-3.5 h-3.5" />
                      <span>Audio Tafsirni Tinglash</span>
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Institutional Heritage Acknowledgement */}
          <Card className="p-6 bg-gradient-to-r from-emerald-950/40 via-[#071614] to-emerald-950/40 border border-[#c5a869]/30 text-xs sm:text-sm text-stone-300 space-y-2">
            <div className="font-bold text-[#c5a869] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#c5a869]" />
              <span>Mualliflik huquqi va maʼrifiy manbalar eslatmasi</span>
            </div>
            <p className="leading-relaxed">
              Fazilatli shayx Muhammad Sodiq Muhammad Yusuf rahimahullohning Qurʼoni Karim maʼnolari tarjimasi va «Tafsiri Hilol» asari matnlari «Hilol Nashr» nashriyotining rasmiy ruxsati va islom.uz portali manbalari asosida taqdim etilmoqda.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
};
