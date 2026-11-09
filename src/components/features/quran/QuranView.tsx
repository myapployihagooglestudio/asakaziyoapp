import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Ayah,
  NavigationTab,
  Surah,
  SupportedLocale,
  QuranBookmark,
  QuranNote,
  QuranReadingProgress,
  QuranReciter,
} from '../../../types';
import {
  SURAHS_LIST,
  VERIFIED_AYAHS,
  QURAN_RECITERS,
  JUZ_LIST,
  JuzInfo,
  getActiveQuranReciters,
  getReciterSurahAudioUrl,
  getReciterAyahAudioUrl,
  getAyahAudioUrl,
  isSurahAudioAvailableForReciter,
  isCustomSurahAudioOverride,
} from '../../../data/quranData';
import {
  TAFSIRI_HILOL_ENTRIES,
  TafsirSurahEntry,
  searchTafsirHilol,
  getTafsirEntryForSurah,
} from '../../../data/tafsirHilolData';
import {
  getStoredQuranProgress,
  saveStoredQuranProgress,
  getStoredQuranBookmarks,
  toggleStoredQuranBookmark,
  getStoredQuranNotes,
  saveStoredQuranNote,
  deleteStoredQuranNote,
  subscribeToDatabase,
} from '../../../utils/databaseService';
import { syncRecitersAndAudioFromFirestore } from '../../../utils/quranReciterStorageService';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { GeometricPattern, IslamicMihrabArch, CalligraphyBasmalahBadge } from '../../ui/GeometricPattern';
import { toNewUzbekAlphabet } from '../../../utils/newUzbekAlphabet';
import { getOfflineAudioBlobUrl, startOfflineDownload } from '../../../utils/offlineStorageService';
import { updateNativeMediaSession, updateNativeMediaPositionState } from '../../../utils/nativeMobileBridge';
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
  Download,
  Flame,
  Award,
  Edit3,
  Trash2,
  Moon,
  Sun,
  Maximize2,
  List,
  Layers,
  Heart,
  Calendar,
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
  arabicFontSize: initialArabicFontSize,
}) => {
  const { t, i18n } = useTranslation();
  const currentLocale = (i18n.language as SupportedLocale) || 'uz-Latn';

  // Navigation mode: 1. Mushaf, 2. Tafsiri Hilol, 3. Xatm & Mutolaa Tracker, 4. Xatcho'plar & Izohlar
  const [activeQuranTab, setActiveQuranTab] = useState<'mushaf' | 'tafsir_hilol' | 'tracker' | 'bookmarks_notes'>('mushaf');

  // Surah navigation vs Juz navigation mode
  const [directoryMode, setDirectoryMode] = useState<'surah' | 'juz'>('surah');
  const [selectedJuzNumber, setSelectedJuzNumber] = useState<number>(1);

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

  // Arabic Font Size overrides: 'standard' (28px), 'large' (34px), 'huge' (42px)
  const [fontSizeChoice, setFontSizeChoice] = useState<'standard' | 'large' | 'huge'>(
    initialArabicFontSize || 'standard'
  );

  // Night reading mode for comfortable night recitation
  const [nightReadingMode, setNightReadingMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('asaka_ziyo_quran_night_mode') === 'true';
    } catch {
      return false;
    }
  });

  // Reading progress and Khatm Tracker
  const [readingProgress, setReadingProgress] = useState<QuranReadingProgress>(() => getStoredQuranProgress());
  const [bookmarks, setBookmarks] = useState<QuranBookmark[]>(() => getStoredQuranBookmarks());
  const [notes, setNotes] = useState<QuranNote[]>(() => getStoredQuranNotes());

  // Note Modal state
  const [activeNoteAyah, setActiveNoteAyah] = useState<Ayah | null>(null);
  const [noteInputText, setNoteInputText] = useState('');
  const [savedItemsSubTab, setSavedItemsSubTab] = useState<'bookmarks' | 'notes'>('bookmarks');
  const [khatmFilter, setKhatmFilter] = useState<'all' | 'completed' | 'uncompleted'>('all');

  // Dynamic Reciters from Firestore + Canonical Reciters
  const [availableReciters, setAvailableReciters] = useState<QuranReciter[]>(() => getActiveQuranReciters());
  const [audioCatalogVersion, setAudioCatalogVersion] = useState<number>(0);
  const [surahAudioFilter, setSurahAudioFilter] = useState<'all' | 'available' | 'missing'>('all');
  const [hasCompletedInitialReciterSync, setHasCompletedInitialReciterSync] = useState<boolean>(false);

  const [selectedReciterId, setSelectedReciterId] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('asaka_ziyo_reciter');
        if (saved && saved.trim()) return saved.trim();
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
  const shouldAutoPlayNextSurahRef = useRef<boolean>(false);

  // Single Ayah playback & Repeat options
  const [playingAyahId, setPlayingAyahId] = useState<string | null>(null);
  const [repeatAyahCount, setRepeatAyahCount] = useState<number>(1); // 1 = play once, 2 = 2 times, 3 = 3 times
  const currentRepeatRemainingRef = useRef<number>(1);
  const ayahAudioRef = useRef<HTMLAudioElement | null>(null);
  const surahAudioRef = useRef<HTMLAudioElement | null>(null);

  // Repeat range (Start Ayah -> End Ayah)
  const [isRangeRepeatActive, setIsRangeRepeatActive] = useState(false);
  const [rangeStartAyah, setRangeStartAyah] = useState<number>(1);
  const [rangeEndAyah, setRangeEndAyah] = useState<number>(7);
  const currentRangePointerRef = useRef<number>(1);

  // Highlighted Ayah on scroll / search jump
  const [highlightedAyahNumber, setHighlightedAyahNumber] = useState<number | null>(null);

  // Share Ayah notification
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [fetchedAyahs, setFetchedAyahs] = useState<Ayah[] | null>(null);
  const [isLoadingAyahs, setIsLoadingAyahs] = useState(false);

  // Sync Reciters & 114 Surah Audio Overrides from Firestore in real time
  useEffect(() => {
    let mounted = true;
    syncRecitersAndAudioFromFirestore().then(() => {
      if (!mounted) return;
      setAvailableReciters(getActiveQuranReciters());
      setAudioCatalogVersion((v) => v + 1);
      setHasCompletedInitialReciterSync(true);
    });

    const unsub = subscribeToDatabase((event) => {
      if (
        event.type === 'QURAN_RECITERS_UPDATED' ||
        event.type === 'QURAN_AUDIO_UPDATED'
      ) {
        setAvailableReciters(getActiveQuranReciters());
        setAudioCatalogVersion((v) => v + 1);
      }
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  // Ensure selectedReciterId falls back gracefully if deactivated by admin
  useEffect(() => {
    if (!hasCompletedInitialReciterSync) return;
    if (availableReciters.length > 0 && !availableReciters.some((r) => r.id === selectedReciterId)) {
      const fallbackId = availableReciters[0].id || 'mishary';
      setSelectedReciterId(fallbackId);
      try {
        localStorage.setItem('asaka_ziyo_reciter', fallbackId);
      } catch {
        // ignore
      }
    }
  }, [availableReciters, selectedReciterId, hasCompletedInitialReciterSync]);

  const selectedSurah =
    SURAHS_LIST.find((s) => s.number === selectedSurahNumber) || SURAHS_LIST[0];

  const activeReciter =
    availableReciters.find((r) => r.id === selectedReciterId) ||
    availableReciters[0] ||
    QURAN_RECITERS[0];

  const isCurrentSurahAudioReady = isSurahAudioAvailableForReciter(
    activeReciter.id,
    selectedSurahNumber
  );

  // Remember last surah in localStorage and reading progress
  useEffect(() => {
    try {
      localStorage.setItem('asaka_ziyo_last_surah', String(selectedSurahNumber));
    } catch {
      // ignore
    }
    // Update last read position in progress tracker
    const updated = saveStoredQuranProgress({
      lastReadSurah: selectedSurahNumber,
      lastReadAyah: 1,
    });
    setReadingProgress(updated);
  }, [selectedSurahNumber]);

  useEffect(() => {
    try {
      localStorage.setItem('asaka_ziyo_quran_night_mode', String(nightReadingMode));
    } catch {
      // ignore
    }
  }, [nightReadingMode]);

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
    setIsRangeRepeatActive(false);

    if (!VERIFIED_AYAHS[selectedSurahNumber]) {
      fetchSurahAyahs(selectedSurahNumber);
    } else {
      setFetchedAyahs(null);
      setIsLoadingAyahs(false);
    }

    if (shouldAutoPlayNextSurahRef.current) {
      shouldAutoPlayNextSurahRef.current = false;
      setTimeout(() => {
        if (isSurahAudioAvailableForReciter(activeReciter.id, selectedSurahNumber)) {
          handleToggleSurahAudio();
        }
      }, 150);
    }
  }, [selectedSurahNumber, selectedReciterId, audioCatalogVersion]);

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
          (arAyah: { number: number; numberInSurah: number; text: string; juz?: number }, idx: number) => {
            const uzText = uzEdition.ayahs[idx]?.text || '';
            return {
              id: `${surahNum}-${arAyah.numberInSurah}`,
              number: arAyah.number,
              numberInSurah: arAyah.numberInSurah,
              surahNumber: surahNum,
              surahNameUz: selectedSurah.nameUz,
              juzNumber: arAyah.juz,
              textAr: arAyah.text,
              translationUz: uzText,
              transliterationUz: `${selectedSurah.nameUz} surasi, ${arAyah.numberInSurah}-oyat`,
              audioUrl: getReciterAyahAudioUrl(selectedReciterId, surahNum, arAyah.numberInSurah),
              tafsirSummaryUz: '',
              translations: {
                'uz-Latn': {
                  language: 'uz-Latn',
                  translator: 'Shayx Muhammad Sodiq Muhammad Yusuf',
                  source: 'Tafsiri Hilol (Hilol Nashr)',
                  version: '2021',
                  text: uzText,
                },
                'uz-Latn-new': {
                  language: 'uz-Latn-new',
                  translator: 'Şayx Muhammad Sodiq Muhammad Yusuf',
                  source: 'Tafsiri Hilol (Hilol Naşr)',
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

  const handleToggleSurahAudio = async () => {
    setAudioError(null);
    if (isSurahAudioPlaying && surahAudioRef.current) {
      surahAudioRef.current.pause();
      setIsSurahAudioPlaying(false);
      return;
    }

    if (!surahAudioRef.current) {
      const offlineBlobUrl = await getOfflineAudioBlobUrl(activeReciter.id, selectedSurahNumber);
      const audioUrl = offlineBlobUrl || getReciterSurahAudioUrl(activeReciter.id, selectedSurahNumber);

      if (!audioUrl || !audioUrl.trim()) {
        setAudioError(
          `Ushbu sura (${selectedSurah.number}. ${selectedSurah.nameUz}) uchun «${activeReciter.name}» qiroati audio fayli hali yuklanmagan.`
        );
        setIsSurahAudioPlaying(false);
        return;
      }

      const audio = new Audio(audioUrl);
      audio.playbackRate = playbackSpeed;
      audio.loop = isLooping;

      audio.ontimeupdate = () => {
        if (audio.duration && !isNaN(audio.duration)) {
          setSurahAudioProgress((audio.currentTime / audio.duration) * 100);
          setCurrentTimeSec(Math.round(audio.currentTime));
          setDurationSec(Math.round(audio.duration));
          updateNativeMediaPositionState(audio.duration, audio.currentTime, audio.playbackRate);
        }
      };

      audio.onended = () => {
        if (!isLooping) {
          setIsSurahAudioPlaying(false);
          setSurahAudioProgress(0);
          // Auto increment khatm completed surahs
          const curProg = getStoredQuranProgress();
          if (!curProg.khatmCompletedSurahs.includes(selectedSurahNumber)) {
            const updated = saveStoredQuranProgress({
              khatmCompletedSurahs: [...curProg.khatmCompletedSurahs, selectedSurahNumber],
            });
            setReadingProgress(updated);
          }
          // Find next surah with available audio for continuous playback
          for (let nextNum = selectedSurahNumber + 1; nextNum <= 114; nextNum++) {
            if (isSurahAudioAvailableForReciter(activeReciter.id, nextNum)) {
              shouldAutoPlayNextSurahRef.current = true;
              setSelectedSurahNumber(nextNum);
              break;
            }
          }
        }
      };

      audio.onerror = () => {
        setAudioError(
          `${activeReciter.name} qiroati audio manbasini oʻqishda xatolik yuz berdi (${audioUrl}).`
        );
        setIsSurahAudioPlaying(false);
      };

      updateNativeMediaSession(
        {
          title: `${selectedSurah.number}. ${selectedSurah.nameUz} surasi`,
          artist: activeReciter.name,
          album: 'ASAKA ZIYO — Qurʼoni Karim Tilovati',
          artworkUrl: activeReciter.profileImageUrl || '/pwa-512x512.png',
        },
        {
          onPlay: () => {
            audio.play().then(() => setIsSurahAudioPlaying(true)).catch(() => {});
          },
          onPause: () => {
            audio.pause();
            setIsSurahAudioPlaying(false);
          },
          onPreviousTrack: () => {
            if (selectedSurahNumber > 1) setSelectedSurahNumber((p) => p - 1);
          },
          onNextTrack: () => {
            if (selectedSurahNumber < 114) setSelectedSurahNumber((p) => p + 1);
          },
          onSeekTo: (sec) => {
            audio.currentTime = sec;
          },
        },
        'playing'
      );

      surahAudioRef.current = audio;
    }

    surahAudioRef.current
      .play()
      .then(() => setIsSurahAudioPlaying(true))
      .catch(() => {
        setAudioError('Audio ijrosini boshlashda xatolik yuz berdi. Audio manzili yoki brauzer ovoz ruxsatini tekshiring.');
        setIsSurahAudioPlaying(false);
      });
  };

  const handleChangeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (surahAudioRef.current) {
      surahAudioRef.current.playbackRate = speed;
    }
    if (ayahAudioRef.current) {
      ayahAudioRef.current.playbackRate = speed;
    }
  };

  const handleDownloadAudio = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      a.remove();
    } catch {
      window.location.href = url;
    }
  };

  const handleDownloadSurahAudio = async () => {
    const audioUrl = getReciterSurahAudioUrl(activeReciter.id, selectedSurahNumber);
    if (!audioUrl || !audioUrl.trim()) {
      setAudioError(
        `Ushbu sura (${selectedSurah.number}. ${selectedSurah.nameUz}) uchun «${activeReciter.name}» audio fayli hali yuklanmagan.`
      );
      return;
    }
    const filename = `${selectedSurah.number}_${selectedSurah.nameUz}_${activeReciter.id}.mp3`;
    try {
      startOfflineDownload({
        id: `surah_${activeReciter.id}_${selectedSurahNumber}`,
        type: 'quran_audio',
        title: `${String(selectedSurah.number).padStart(3, '0')}. ${selectedSurah.nameUz} surasi — ${activeReciter.name}`,
        subtitle: 'Oflayn tinglash uchun saqlangan tilovat',
        sourceUrl: audioUrl,
        reciterId: activeReciter.id,
        surahNumber: selectedSurahNumber,
      }).catch(() => {});
    } catch {
      // ignore
    }
    handleDownloadAudio(audioUrl, filename);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSurahAudioProgress(val);
    if (surahAudioRef.current && surahAudioRef.current.duration) {
      surahAudioRef.current.currentTime = (val / 100) * surahAudioRef.current.duration;
    }
  };

  // Play individual Ayah with repeat count support
  const handlePlayAyah = (ayah: Ayah, repeatTotal: number = repeatAyahCount) => {
    if (playingAyahId === ayah.id && ayahAudioRef.current && !isRangeRepeatActive) {
      ayahAudioRef.current.pause();
      setPlayingAyahId(null);
      return;
    }

    if (ayahAudioRef.current) {
      ayahAudioRef.current.pause();
    }

    currentRepeatRemainingRef.current = repeatTotal;
    const audioUrl = getReciterAyahAudioUrl(selectedReciterId, ayah.surahNumber, ayah.numberInSurah);
    const audio = new Audio(audioUrl);
    audio.playbackRate = playbackSpeed;

    audio.onended = () => {
      currentRepeatRemainingRef.current -= 1;
      if (currentRepeatRemainingRef.current > 0) {
        audio.currentTime = 0;
        audio.play().catch(() => setPlayingAyahId(null));
      } else {
        setPlayingAyahId(null);
        // Track daily read ayahs
        const cur = getStoredQuranProgress();
        const updated = saveStoredQuranProgress({
          todayAyahsRead: (cur.todayAyahsRead || 0) + 1,
          lastReadSurah: ayah.surahNumber,
          lastReadAyah: ayah.numberInSurah,
        });
        setReadingProgress(updated);

        // If in range repeat mode, continue to next ayah in range
        if (isRangeRepeatActive && ayah.numberInSurah < rangeEndAyah) {
          const nextAyahNum = ayah.numberInSurah + 1;
          const nextAyah = currentAyahs.find((a) => a.numberInSurah === nextAyahNum);
          if (nextAyah) {
            handlePlayAyah(nextAyah, repeatAyahCount);
          }
        } else if (isRangeRepeatActive && ayah.numberInSurah >= rangeEndAyah) {
          setIsRangeRepeatActive(false);
        }
      }
    };

    audio.onerror = () => {
      setPlayingAyahId(null);
    };

    audio.play().then(() => setPlayingAyahId(ayah.id)).catch(() => setPlayingAyahId(null));
    ayahAudioRef.current = audio;
  };

  const handleStartRangeRepeat = () => {
    const start = Math.min(rangeStartAyah, rangeEndAyah);
    const end = Math.max(rangeStartAyah, rangeEndAyah);
    setIsRangeRepeatActive(true);
    const firstAyah = currentAyahs.find((a) => a.numberInSurah === start);
    if (firstAyah) {
      handlePlayAyah(firstAyah, repeatAyahCount);
    }
  };

  const handleStopRangeRepeat = () => {
    setIsRangeRepeatActive(false);
    if (ayahAudioRef.current) {
      ayahAudioRef.current.pause();
      setPlayingAyahId(null);
    }
  };

  const handleToggleBookmark = (ayah: Ayah) => {
    const res = toggleStoredQuranBookmark({
      surahNumber: ayah.surahNumber,
      ayahNumberInSurah: ayah.numberInSurah,
      surahNameUz: selectedSurah.nameUz,
      snippet: ayah.translationUz.slice(0, 80) + '...',
      snippetAr: ayah.textAr,
      snippetUz: ayah.translationUz,
    });
    setBookmarks(res.list);
  };

  const handleRemoveBookmark = (bm: QuranBookmark) => {
    const res = toggleStoredQuranBookmark({
      surahNumber: bm.surahNumber,
      ayahNumberInSurah: bm.ayahNumberInSurah,
      surahNameUz: bm.surahNameUz,
      snippet: bm.snippet,
      snippetAr: bm.snippetAr,
      snippetUz: bm.snippetUz,
    });
    setBookmarks(res.list);
  };

  const handleOpenNoteModal = (ayah: Ayah) => {
    setActiveNoteAyah(ayah);
    const existing = notes.find(
      (n) => n.surahNumber === ayah.surahNumber && n.ayahNumberInSurah === ayah.numberInSurah
    );
    setNoteInputText(existing ? existing.noteText : '');
  };

  const handleSaveNote = () => {
    if (!activeNoteAyah) return;
    const updated = saveStoredQuranNote(
      activeNoteAyah.surahNumber,
      activeNoteAyah.numberInSurah,
      selectedSurah.nameUz,
      activeNoteAyah.translationUz.slice(0, 100),
      noteInputText
    );
    setNotes(updated);
    setActiveNoteAyah(null);
    setNoteInputText('');
  };

  const handleDeleteNote = (noteId: string) => {
    const updated = deleteStoredQuranNote(noteId);
    setNotes(updated);
  };

  const handleShareAyah = (ayah: Ayah) => {
    const shareText = `«${ayah.textAr}»\n\n«${ayah.translationUz}»\n\n— Qurʼoni Karim, ${selectedSurah.nameUz} surasi, ${ayah.numberInSurah}-oyat.\nTarjima: Shayx Muhammad Sodiq Muhammad Yusuf (Tafsiri Hilol)\nIlova: Asaka Ziyo Portali`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: `${selectedSurah.nameUz} surasi, ${ayah.numberInSurah}-oyat`,
        text: shareText,
      }).catch(() => {});
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      setCopiedId(ayah.id);
      setTimeout(() => setCopiedId(null), 3000);
    }
  };

  const handleJumpToJuz = (juz: JuzInfo) => {
    setSelectedJuzNumber(juz.juzNumber);
    setSelectedSurahNumber(juz.startSurah);
    setHighlightedAyahNumber(juz.startAyah);
    setTimeout(() => {
      const el = document.getElementById(`ayah-${juz.startSurah}-${juz.startAyah}`);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 500);
  };

  const handleToggleKhatmSurah = (surahNum: number) => {
    const currentCompleted = readingProgress.khatmCompletedSurahs || [];
    const exists = currentCompleted.includes(surahNum);
    const updatedSurahs = exists
      ? currentCompleted.filter((n) => n !== surahNum)
      : [...currentCompleted, surahNum];
    const updated = saveStoredQuranProgress({
      khatmCompletedSurahs: updatedSurahs,
    });
    setReadingProgress(updated);
  };

  const handleUpdateDailyGoal = (goal: number) => {
    const updated = saveStoredQuranProgress({
      dailyGoalAyahs: goal,
    });
    setReadingProgress(updated);
  };

  const handleIncrementTodayAyahs = (count: number) => {
    const updated = saveStoredQuranProgress({
      todayAyahsRead: (readingProgress.todayAyahsRead || 0) + count,
    });
    setReadingProgress(updated);
  };

  const handleJumpToAyah = (surahNum: number, ayahNum: number) => {
    setSelectedSurahNumber(surahNum);
    setHighlightedAyahNumber(ayahNum);
    setActiveQuranTab('mushaf');
    setTimeout(() => {
      const el = document.getElementById(`ayah-${surahNum}-${ayahNum}`);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 400);
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

  const availableSurahsCountForReciter = SURAHS_LIST.filter((s) =>
    isSurahAudioAvailableForReciter(activeReciter.id, s.number)
  ).length;
  const missingSurahsCountForReciter = Math.max(0, 114 - availableSurahsCountForReciter);

  // Search by Surah Name, Meaning, Number OR Ayah Text (Arabic / Translation) + Audio Filter
  const filteredSurahs = SURAHS_LIST.filter((s) => {
    const locName = getLocalizedSurahName(s).toLowerCase();
    const locMeaning = getLocalizedSurahMeaning(s).toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !query ||
      locName.includes(query) ||
      locMeaning.includes(query) ||
      s.number.toString().includes(query) ||
      s.nameAr.includes(query);
    if (!matchesQuery) return false;
    if (surahAudioFilter === 'available') {
      return isSurahAudioAvailableForReciter(activeReciter.id, s.number);
    }
    if (surahAudioFilter === 'missing') {
      return !isSurahAudioAvailableForReciter(activeReciter.id, s.number);
    }
    return true;
  });

  const getArabicFontClass = () => {
    switch (fontSizeChoice) {
      case 'huge':
        return 'text-4xl sm:text-5xl leading-[2.6]';
      case 'large':
        return 'text-3xl sm:text-4xl leading-[2.4]';
      case 'standard':
      default:
        return 'text-2xl sm:text-3xl leading-[2.2]';
    }
  };

  const activeTafsirEntry = getTafsirEntryForSurah(selectedSurahNumber);
  const filteredTafsirList = searchTafsirHilol(tafsirSearchQuery);

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto">
      {/* 1. 2026 LUXURY ARCHITECTURAL HEADER BANNER */}
      <div className="relative rounded-3xl overflow-hidden border border-[#C6A45C]/35 bg-gradient-to-br from-[#063D32] via-[#042B25] to-[#031814] p-6 sm:p-10 text-white shadow-2xl">
        <img
          src="/images/quran_illumination_art_1793634658336.jpg"
          alt="Quran Illumination Art"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-25 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#042B25]/95 via-[#063D32]/85 to-transparent" />
        <GeometricPattern opacity={0.07} />
        <IslamicMihrabArch opacity={0.14} className="right-6 max-w-[280px] ml-auto hidden md:block" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <CalligraphyBasmalahBadge />
            <div className="flex items-center gap-2 text-xs font-bold text-[#C6A45C] uppercase tracking-wider">
              <BookOpen className="w-4 h-4" />
              <span>Kalomulloh Ekotizimi</span>
              <span aria-hidden="true">·</span>
              <span>114 Ta Sura · {availableReciters.length} Ta Faol Qori · Tafsiri Hilol</span>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold tracking-tight text-[#F8F5EC]">
            Qurʼoni Karim va Tafsir Maskani
          </h1>
          <p className="text-xs sm:text-sm text-[#DCC58C]/90 leading-relaxed max-w-2xl">
            114 ta suraning toʻliq arabcha matni, {availableReciters.length} ta mashhur va maxsus qorilar audio qiroati, Shayx Muhammad Sodiq Muhammad Yusuf hazratlarining «Tafsiri Hilol» asari va audio darslari.
          </p>
        </div>
      </div>

      {/* 2. Mode Selector: 4 Tabs (Mushaf, Tafsiri Hilol, Xatm & Tracker, Xatcho'plar & Qaydlar) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2D9C5] dark:border-[#124237] pb-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-[#F1EBDD] dark:bg-[#06241E] border border-[#E2D9C5] dark:border-[#124237]">
          <button
            onClick={() => setActiveQuranTab('mushaf')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeQuranTab === 'mushaf'
                ? 'bg-gradient-to-r from-[#C6A45C] to-[#DCC58C] text-[#042B25] shadow-md'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Mushaf & Tilovat</span>
          </button>

          <button
            onClick={() => setActiveQuranTab('tafsir_hilol')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeQuranTab === 'tafsir_hilol'
                ? 'bg-gradient-to-r from-[#C6A45C] to-[#DCC58C] text-[#042B25] shadow-md'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Tafsiri Hilol</span>
          </button>

          <button
            onClick={() => setActiveQuranTab('tracker')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeQuranTab === 'tracker'
                ? 'bg-gradient-to-r from-[#C6A45C] to-[#DCC58C] text-[#042B25] shadow-md'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            <Award className="w-4 h-4 text-emerald-500" />
            <span>Xatm & Mutolaa Tracker</span>
          </button>

          <button
            onClick={() => setActiveQuranTab('bookmarks_notes')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeQuranTab === 'bookmarks_notes'
                ? 'bg-gradient-to-r from-[#C6A45C] to-[#DCC58C] text-[#042B25] shadow-md'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            <Bookmark className="w-4 h-4 text-blue-400" />
            <span>Xatchoʻplar & Qaydlar ({bookmarks.length + notes.length})</span>
          </button>
        </div>

        {/* Top Control Bar: Reciter, Night Mode, Font Size */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Night Reading Mode Toggle */}
          <button
            onClick={() => setNightReadingMode(!nightReadingMode)}
            className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition-colors cursor-pointer ${
              nightReadingMode
                ? 'bg-indigo-950/80 border-indigo-500/60 text-indigo-300'
                : 'bg-white dark:bg-[#091a18] border-stone-200 dark:border-emerald-950 text-stone-600 dark:text-stone-300'
            }`}
            title="Tungi oʻqish rejimi (koʻzni toliqtirmaydi)"
          >
            {nightReadingMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Tungi rejim</span>
          </button>

          {/* Arabic Font Size: Kichik, Oʻrta, Katta */}
          <div className="flex items-center gap-1 bg-white dark:bg-[#091a18] p-1 rounded-xl border border-stone-200 dark:border-emerald-950">
            <span className="text-[10px] text-stone-400 px-1 font-semibold">Shrift:</span>
            {(['standard', 'large', 'huge'] as const).map((sz) => (
              <button
                key={sz}
                onClick={() => setFontSizeChoice(sz)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                  fontSizeChoice === sz
                    ? 'bg-[#c5a869] text-[#071614]'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                {sz === 'standard' ? 'Oʻrta' : sz === 'large' ? 'Katta' : 'Ulkan'}
              </button>
            ))}
          </div>

          {/* Reciter Selector */}
          {activeQuranTab === 'mushaf' && (
            <div className="flex items-center gap-1.5 text-xs">
              <Headphones className="w-3.5 h-3.5 text-[#c5a869]" />
              <select
                value={activeReciter.id}
                onChange={(e) => {
                  setSelectedReciterId(e.target.value);
                  try {
                    localStorage.setItem('asaka_ziyo_reciter', e.target.value);
                  } catch {
                    // ignore
                  }
                }}
                className="px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18] text-stone-900 dark:text-stone-100 font-semibold text-xs focus:ring-1 focus:ring-[#c5a869] cursor-pointer"
              >
                {availableReciters.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({typeof r.uploadedSurahsCount === 'number' ? r.uploadedSurahsCount : 114}/114)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ---------------- TAB 1: MUSHAF & TILOVAT ---------------- */}
      {activeQuranTab === 'mushaf' && (
        <div className="space-y-6">
          {/* Active Reciter Profile & Quick Reciter Switcher Bar */}
          <Card className="p-4 sm:p-5 border-[#c5a869]/30 bg-white/90 dark:bg-[#081b18]/90 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <img
                  src={activeReciter.profileImageUrl || '/images/quran_illumination_art_1793634658336.jpg'}
                  alt={activeReciter.name}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-[#c5a869]/50 shadow-md shrink-0"
                />
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#c5a869]/20 text-[#c5a869]">
                      Tanlangan Qori
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white">
                      {activeReciter.name}
                    </h3>
                    {activeReciter.nameAr && (
                      <span className="font-arabic text-base text-[#c5a869]">{activeReciter.nameAr}</span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {activeReciter.subtext}
                    {activeReciter.rewaya ? ` · Rivoyat: ${activeReciter.rewaya}` : ''}
                  </p>
                  {activeReciter.biographyUz && (
                    <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed max-w-3xl">
                      {activeReciter.biographyUz}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs">
                  <div className="text-[10px] text-stone-400 uppercase font-semibold">114 Sura Audio Xazinasi</div>
                  <div className="font-bold text-emerald-500">
                    Mavjud: {availableSurahsCountForReciter} / 114 sura
                    {missingSurahsCountForReciter > 0 && (
                      <span className="text-amber-500 ml-1.5">
                        (Yuklanmagan: {missingSurahsCountForReciter})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Reciter Quick Selection Chips (All Active Reciters from Firestore) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2 border-t border-stone-200/60 dark:border-emerald-950/60">
              <span className="text-[11px] font-semibold text-stone-400 shrink-0">
                Qorilar ({availableReciters.length}):
              </span>
              {availableReciters.map((rec) => {
                const isSelected = rec.id === activeReciter.id;
                const recCount =
                  typeof rec.uploadedSurahsCount === 'number' ? rec.uploadedSurahsCount : 114;
                return (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => {
                      setSelectedReciterId(rec.id);
                      try {
                        localStorage.setItem('asaka_ziyo_reciter', rec.id);
                      } catch {
                        // ignore
                      }
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#c5a869] text-[#071614] border-[#c5a869] shadow-sm'
                        : 'bg-stone-100/80 dark:bg-emerald-950/40 border-stone-200 dark:border-emerald-900/40 text-stone-700 dark:text-stone-300 hover:border-[#c5a869]/50'
                    }`}
                  >
                    {rec.profileImageUrl && (
                      <img
                        src={rec.profileImageUrl}
                        alt={rec.name}
                        className="w-4 h-4 rounded-full object-cover"
                      />
                    )}
                    <span>{rec.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded ${
                        isSelected
                          ? 'bg-black/20 text-[#071614]'
                          : recCount > 0
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : 'bg-amber-500/15 text-amber-500'
                      }`}
                    >
                      {recCount}/114
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: 114 Surahs Directory & 30 Juz Navigation (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Directory Switcher: Suralar (114) vs Poralar / Juzlar (30) */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-stone-100 dark:bg-emerald-950/40 border border-stone-200 dark:border-emerald-900/40">
              <button
                onClick={() => setDirectoryMode('surah')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  directoryMode === 'surah'
                    ? 'bg-[#c5a869] text-[#071614] shadow'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>114 Ta Sura</span>
              </button>

              <button
                onClick={() => setDirectoryMode('juz')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  directoryMode === 'juz'
                    ? 'bg-[#c5a869] text-[#071614] shadow'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>30 Ta Pora (Juz)</span>
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={directoryMode === 'surah' ? "Sura nomi, raqami yoki arabchasini qidiring..." : "Pora nomi yoki raqamini qidiring..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-stone-200 dark:border-emerald-950 bg-white dark:bg-[#091a18] text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#c5a869]"
              />
            </div>

            {directoryMode === 'surah' && missingSurahsCountForReciter > 0 && (
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-stone-100 dark:bg-emerald-950/40 border border-stone-200 dark:border-emerald-900/40 text-[11px]">
                <button
                  type="button"
                  onClick={() => setSurahAudioFilter('all')}
                  className={`py-1 rounded-lg font-semibold cursor-pointer ${
                    surahAudioFilter === 'all'
                      ? 'bg-[#c5a869] text-[#071614]'
                      : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                  }`}
                >
                  Barchasi (114)
                </button>
                <button
                  type="button"
                  onClick={() => setSurahAudioFilter('available')}
                  className={`py-1 rounded-lg font-semibold cursor-pointer ${
                    surahAudioFilter === 'available'
                      ? 'bg-emerald-500 text-white'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  Audio bor ({availableSurahsCountForReciter})
                </button>
                <button
                  type="button"
                  onClick={() => setSurahAudioFilter('missing')}
                  className={`py-1 rounded-lg font-semibold cursor-pointer ${
                    surahAudioFilter === 'missing'
                      ? 'bg-amber-500 text-[#071614]'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  Yoʻq ({missingSurahsCountForReciter})
                </button>
              </div>
            )}

            {/* List by Mode */}
            <div className="space-y-1.5 max-h-[640px] overflow-y-auto pr-1">
              {directoryMode === 'juz' ? (
                JUZ_LIST.filter(j =>
                  j.nameUz.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  j.juzNumber.toString().includes(searchQuery) ||
                  j.nameAr.includes(searchQuery)
                ).map((juz) => {
                  const isCurrent = selectedJuzNumber === juz.juzNumber;
                  const startSurahObj = SURAHS_LIST.find(s => s.number === juz.startSurah);
                  return (
                    <button
                      key={juz.juzNumber}
                      onClick={() => handleJumpToJuz(juz)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isCurrent
                          ? 'border-[#c5a869] bg-[#c5a869]/10 text-stone-900 dark:text-white ring-1 ring-[#c5a869]/30'
                          : 'border-stone-200/80 dark:border-emerald-950/70 bg-white dark:bg-[#0d211e]/70 hover:border-[#c5a869]/40 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-emerald-950 flex items-center justify-center font-mono-numbers text-xs font-semibold text-stone-600 dark:text-[#c5a869]">
                          {juz.juzNumber}
                        </span>
                        <div>
                          <div className="text-sm font-semibold">{juz.juzNumber}-Pora: {juz.nameUz}</div>
                          <div className="text-[11px] text-stone-400">
                            {startSurahObj?.nameUz} ({juz.startAyah}-oyatdan)
                          </div>
                        </div>
                      </div>
                      <span className="font-arabic text-lg text-[#c5a869]">{juz.nameAr}</span>
                    </button>
                  );
                })
              ) : (
                filteredSurahs.map((surah) => {
                  const isSelected = surah.number === selectedSurahNumber;
                  const hasSurahAudio = isSurahAudioAvailableForReciter(activeReciter.id, surah.number);
                  const isCustomAudio = isCustomSurahAudioOverride(activeReciter.id, surah.number);
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
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-arabic text-lg text-[#c5a869]">{surah.nameAr}</span>
                      {hasSurahAudio ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {isCustomAudio ? 'Maxsus Audio' : 'Audio tayyor'}
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          Audio yoʻq
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
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

                  <button
                    onClick={handleDownloadSurahAudio}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                    title="Butun surani MP3 formatida yuklab olish (Offline)"
                  >
                    <Download className="w-4 h-4 text-[#c5a869]" />
                    <span>Yuklab olish</span>
                  </button>

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

                {!isCurrentSurahAudioReady && (
                  <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-center gap-2">
                    <Info className="w-4 h-4 shrink-0 text-amber-300" />
                    <span>
                      Ushbu sura ({selectedSurah.number}. {selectedSurah.nameUz}) uchun «{activeReciter.name}» tilovati audio fayli hali biriktirilmagan.
                    </span>
                  </div>
                )}

                {audioError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs">
                    {audioError}
                  </div>
                )}
              </div>
            </Card>

            {/* Repeat Range & Study Controller */}
            <div className="p-4 rounded-2xl border border-stone-200 dark:border-emerald-950 bg-white/70 dark:bg-stone-900/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-[#c5a869]" />
                <span className="font-bold text-stone-800 dark:text-stone-200">Oyatlar oraligʻini takrorlash (Hifz rejimi):</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-stone-500">Oraliq:</span>
                <input
                  type="number"
                  min="1"
                  max={selectedSurah.numberOfAyahs}
                  value={rangeStartAyah}
                  onChange={(e) => setRangeStartAyah(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-14 p-1 text-center font-mono font-bold rounded-lg border border-stone-300 dark:border-white/10 bg-white dark:bg-[#071614]"
                />
                <span className="text-stone-400">—</span>
                <input
                  type="number"
                  min="1"
                  max={selectedSurah.numberOfAyahs}
                  value={rangeEndAyah}
                  onChange={(e) => setRangeEndAyah(Math.min(selectedSurah.numberOfAyahs, parseInt(e.target.value, 10) || 1))}
                  className="w-14 p-1 text-center font-mono font-bold rounded-lg border border-stone-300 dark:border-white/10 bg-white dark:bg-[#071614]"
                />

                <span className="text-stone-500 ml-1">Takror:</span>
                <select
                  value={repeatAyahCount}
                  onChange={(e) => setRepeatAyahCount(parseInt(e.target.value, 10))}
                  className="p-1 rounded-lg border border-stone-300 dark:border-white/10 bg-white dark:bg-[#071614] font-bold text-xs"
                >
                  <option value={1}>1 marta</option>
                  <option value={2}>2 marta</option>
                  <option value={3}>3 marta</option>
                  <option value={5}>5 marta</option>
                </select>

                {isRangeRepeatActive ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStopRangeRepeat}
                    className="text-xs border-rose-500 text-rose-500 hover:bg-rose-500/10"
                  >
                    Toʻxtatish
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleStartRangeRepeat}
                    className="text-xs gap-1"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Takrorlashni Boshlash</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Verses Reading List */}
            <div className={`space-y-4 ${nightReadingMode ? 'p-4 rounded-3xl bg-[#030d0b] border border-emerald-950/80 shadow-2xl' : ''}`}>
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
                  const isAyahBookmarked = bookmarks.some(
                    (b) => b.surahNumber === ayah.surahNumber && b.ayahNumberInSurah === ayah.numberInSurah
                  );
                  const hasNote = notes.some(
                    (n) => n.surahNumber === ayah.surahNumber && n.ayahNumberInSurah === ayah.numberInSurah
                  );
                  const isHighlighted = highlightedAyahNumber === ayah.numberInSurah;

                  return (
                    <Card
                      id={`ayah-${ayah.surahNumber}-${ayah.numberInSurah}`}
                      key={ayah.id}
                      elevated={isPlayingThisAyah || isHighlighted}
                      className={`p-5 sm:p-6 space-y-4 transition-all ${
                        nightReadingMode
                          ? 'bg-[#061714] border-emerald-900/40 text-stone-200'
                          : ''
                      } ${
                        isPlayingThisAyah
                          ? 'border-[#c5a869] ring-2 ring-[#c5a869]/40 bg-[#c5a869]/10'
                          : isHighlighted
                          ? 'border-[#c5a869]/70 ring-1 ring-[#c5a869]/30 bg-[#c5a869]/5'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-stone-100 dark:border-emerald-950/60 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono-numbers px-2.5 py-0.5 rounded-lg bg-stone-100 dark:bg-emerald-950 text-xs font-bold text-[#c5a869]">
                            {selectedSurah.number}:{ayah.numberInSurah}
                          </span>
                          {ayah.juzNumber && (
                            <span className="text-[10px] text-stone-600 dark:text-stone-400 font-semibold px-2 py-0.5 rounded bg-stone-100 dark:bg-black/20">
                              {ayah.juzNumber}-pora
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Play Ayah */}
                          {ayah.audioUrl && (
                            <>
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
                              <button
                                onClick={() => handleDownloadAudio(ayah.audioUrl!, `${selectedSurah.nameUz}_${ayah.numberInSurah}.mp3`)}
                                className="p-1.5 rounded-lg border border-stone-200 dark:border-emerald-950 text-stone-500 hover:text-[#c5a869] transition-colors cursor-pointer"
                                title="Oyatni oflayn yuklab olish"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {/* Quick Bookmark Toggle */}
                          <button
                            onClick={() => handleToggleBookmark(ayah)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              isAyahBookmarked
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                : 'text-stone-500 hover:text-amber-400 border-stone-200 dark:border-emerald-950'
                            }`}
                            title="Xatchoʻp qoʻyish"
                          >
                            <Bookmark className={`w-4 h-4 ${isAyahBookmarked ? 'fill-current' : ''}`} />
                          </button>

                          {/* Personal Note */}
                          <button
                            onClick={() => handleOpenNoteModal(ayah)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              hasNote
                                ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40'
                                : 'text-stone-500 hover:text-indigo-400 border-stone-200 dark:border-emerald-950'
                            }`}
                            title="Shaxsiy izoh / eslatma"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Share with source */}
                          <button
                            onClick={() => handleShareAyah(ayah)}
                            className="p-1.5 rounded-lg border border-stone-200 dark:border-emerald-950 text-stone-500 hover:text-[#c5a869] transition-colors cursor-pointer"
                            title="Oyatni manbasi bilan ulashish"
                          >
                            {copiedId === ayah.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                          </button>

                          {/* Global Favorite */}
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
                            <Heart className={`w-4 h-4 ${isAyahFav ? 'fill-[#c5a869] text-[#c5a869]' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {/* Arabic text with Uthmani script and adjustable typography */}
                      <p
                        dir="rtl"
                        className={`font-arabic text-right ${getArabicFontClass()} ${
                          nightReadingMode
                            ? 'text-amber-100/95 font-medium'
                            : 'text-stone-900 dark:text-amber-100/95'
                        }`}
                      >
                        {ayah.textAr}
                      </p>

                      {/* Translation by Shayx Muhammad Sodiq Muhammad Yusuf */}
                      <p className={`text-xs sm:text-sm leading-relaxed font-editorial italic ${
                        nightReadingMode ? 'text-stone-300' : 'text-stone-700 dark:text-stone-300'
                      }`}>
                        «{ayah.translationUz}»
                      </p>

                      <div className="text-[11px] text-stone-400 dark:text-stone-500 border-t border-stone-100 dark:border-emerald-950/60 pt-2 flex flex-wrap items-center justify-between gap-2">
                        <span>Tarjima: Shayx Muhammad Sodiq Muhammad Yusuf (Tafsiri Hilol)</span>
                        <button
                          onClick={() => {
                            setActiveQuranTab('tafsir_hilol');
                            setTafsirSearchQuery(selectedSurah.nameUz);
                          }}
                          className="text-[#c5a869] hover:underline cursor-pointer"
                        >
                          Tafsirini oʻqish →
                        </button>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
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

      {/* ==================================================================== */}
      {/* TAB 3: XATM & MUTOLAA TRACKER                                         */}
      {/* ==================================================================== */}
      {activeQuranTab === 'tracker' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Tracker Hero & Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Khatm Completion Card */}
            <Card className="p-5 bg-white dark:bg-[#071614] border border-stone-200/80 dark:border-emerald-950 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                  Qurʼon Xatmi
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#c5a869]/20 text-[#c5a869]">
                  {Math.round(((readingProgress.khatmCompletedSurahs?.length || 0) / 114) * 100)}%
                </span>
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-3xl font-extrabold text-stone-900 dark:text-white">
                    {readingProgress.khatmCompletedSurahs?.length || 0}
                  </span>
                  <span className="text-sm font-semibold text-stone-400">/ 114 sura oʻqildi</span>
                </div>
                <div className="w-full bg-stone-100 dark:bg-emerald-950/60 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#c5a869] to-amber-400 h-2.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.round(((readingProgress.khatmCompletedSurahs?.length || 0) / 114) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-stone-100 dark:border-emerald-950 flex items-center justify-between text-xs">
                <span className="text-stone-500 dark:text-stone-400">
                  Qolgan suralar:
                </span>
                <span className="font-bold text-stone-800 dark:text-stone-200">
                  {114 - (readingProgress.khatmCompletedSurahs?.length || 0)} ta
                </span>
              </div>
            </Card>

            {/* Daily Reading Goal Card */}
            <Card className="p-5 bg-white dark:bg-[#071614] border border-stone-200/80 dark:border-emerald-950 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                  Kunlik Mutolaa Rejasi
                </span>
                <Flame className="w-4 h-4 text-amber-500" />
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-3xl font-extrabold text-stone-900 dark:text-white">
                    {readingProgress.todayAyahsRead || 0}
                  </span>
                  <span className="text-sm font-semibold text-stone-400">
                    / {readingProgress.dailyGoalAyahs || 20} oyat bugun
                  </span>
                </div>
                <div className="w-full bg-stone-100 dark:bg-emerald-950/60 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-600 to-[#c5a869] h-2.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          ((readingProgress.todayAyahsRead || 0) / (readingProgress.dailyGoalAyahs || 20)) * 100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Goal adjustment & quick log */}
              <div className="pt-2 border-t border-stone-100 dark:border-emerald-950 flex items-center justify-between gap-1 text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-stone-400 mr-1">Reja:</span>
                  {[10, 20, 50].map((goal) => (
                    <button
                      key={goal}
                      onClick={() => handleUpdateDailyGoal(goal)}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                        readingProgress.dailyGoalAyahs === goal
                          ? 'bg-[#c5a869] text-[#071614]'
                          : 'bg-stone-100 dark:bg-emerald-950 text-stone-600 dark:text-stone-300'
                      }`}
                    >
                      {goal}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => handleIncrementTodayAyahs(5)}
                  className="px-2 py-0.5 rounded bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-600/25 transition-all"
                  title="Bugungi hisobga +5 oyat qoʻshish"
                >
                  +5 oyat
                </button>
              </div>
            </Card>

            {/* Last Read Position & Quick Resume */}
            <Card className="p-5 bg-gradient-to-br from-emerald-950/30 to-stone-900/40 border border-[#c5a869]/30 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[#c5a869] uppercase tracking-wider">
                    Soʻnggi Oʻqilgan Oyat
                  </span>
                  <BookOpen className="w-4 h-4 text-[#c5a869]" />
                </div>
                <div className="text-lg font-bold text-stone-900 dark:text-white">
                  {SURAHS_LIST.find((s) => s.number === (readingProgress.lastReadSurah || 1))?.nameUz || 'Fotiha'}{' '}
                  surasi
                </div>
                <div className="text-xs text-stone-500 dark:text-stone-300">
                  {readingProgress.lastReadAyah || 1}-oyat
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() =>
                  handleJumpToAyah(readingProgress.lastReadSurah || 1, readingProgress.lastReadAyah || 1)
                }
                className="w-full bg-[#c5a869] text-[#071614] hover:brightness-105 font-bold flex items-center justify-center gap-2"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Oʻqishni Davom Ettirish</span>
              </Button>
            </Card>
          </div>

          {/* 114 Surahs Khatm Checklist */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#c5a869]" />
                  <span>114 Ta Sura Boʻyicha Xatm Nazorati</span>
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Har bir surani oʻqib boʻlgach belgilang va butun Qurʼoni Karim xatmiga bosqichma-bosqich yeting.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-1.5 self-start sm:self-auto p-1 bg-stone-100 dark:bg-emerald-950/60 rounded-xl border border-stone-200 dark:border-emerald-900 text-xs">
                <button
                  onClick={() => setKhatmFilter('all')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                    khatmFilter === 'all'
                      ? 'bg-white dark:bg-[#071614] text-[#c5a869] shadow-xs'
                      : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  Barchasi (114)
                </button>
                <button
                  onClick={() => setKhatmFilter('completed')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                    khatmFilter === 'completed'
                      ? 'bg-white dark:bg-[#071614] text-emerald-500 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  Oʻqilgan ({readingProgress.khatmCompletedSurahs?.length || 0})
                </button>
                <button
                  onClick={() => setKhatmFilter('uncompleted')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                    khatmFilter === 'uncompleted'
                      ? 'bg-white dark:bg-[#071614] text-amber-500 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  Oʻqilmagan ({114 - (readingProgress.khatmCompletedSurahs?.length || 0)})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {SURAHS_LIST.filter((s) => {
                const isCompleted = readingProgress.khatmCompletedSurahs?.includes(s.number);
                if (khatmFilter === 'completed') return isCompleted;
                if (khatmFilter === 'uncompleted') return !isCompleted;
                return true;
              }).map((surah) => {
                const isCompleted = readingProgress.khatmCompletedSurahs?.includes(surah.number);
                return (
                  <Card
                    key={surah.number}
                    className={`p-3.5 border transition-all ${
                      isCompleted
                        ? 'bg-emerald-950/15 border-emerald-500/40 dark:border-emerald-600/40'
                        : 'bg-white dark:bg-[#071614] border-stone-200/80 dark:border-emerald-950/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isCompleted
                              ? 'bg-emerald-600 text-white'
                              : 'bg-stone-100 dark:bg-emerald-950 text-stone-600 dark:text-stone-300'
                          }`}
                        >
                          {surah.number}
                        </span>
                        <div>
                          <div className="font-bold text-sm text-stone-900 dark:text-white line-clamp-1">
                            {surah.nameUz}
                          </div>
                          <div className="text-[11px] text-stone-400">
                            {surah.numberOfAyahs} oyat
                          </div>
                        </div>
                      </div>

                      <span dir="rtl" className="font-arabic text-base text-[#c5a869]">
                        {surah.nameAr}
                      </span>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-stone-100 dark:border-emerald-950/60 flex items-center justify-between gap-2 text-xs">
                      <button
                        onClick={() => handleJumpToAyah(surah.number, 1)}
                        className="text-[11px] text-[#c5a869] hover:underline font-semibold"
                      >
                        Mutolaa qilish
                      </button>

                      <button
                        onClick={() => handleToggleKhatmSurah(surah.number)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                          isCompleted
                            ? 'bg-emerald-600 text-white'
                            : 'bg-stone-100 dark:bg-emerald-950/80 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                        }`}
                      >
                        {isCompleted ? (
                          <>
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Tugallandi</span>
                          </>
                        ) : (
                          <span>Belgilash</span>
                        )}
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: XATCHOʻPLAR & SHAXSIY QAYDLAR                                  */}
      {/* ==================================================================== */}
      {activeQuranTab === 'bookmarks_notes' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Sub-tabs header */}
          <div className="flex items-center gap-2 border-b border-stone-200 dark:border-emerald-950 pb-3">
            <button
              onClick={() => setSavedItemsSubTab('bookmarks')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                savedItemsSubTab === 'bookmarks'
                  ? 'bg-[#c5a869] text-[#071614] shadow-sm'
                  : 'bg-stone-100 dark:bg-emerald-950 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              <span>Saqlangan Xatchoʻplar ({bookmarks.length})</span>
            </button>

            <button
              onClick={() => setSavedItemsSubTab('notes')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                savedItemsSubTab === 'notes'
                  ? 'bg-[#c5a869] text-[#071614] shadow-sm'
                  : 'bg-stone-100 dark:bg-emerald-950 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span>Shaxsiy Qaydlar ({notes.length})</span>
            </button>
          </div>

          {/* Bookmarks Section */}
          {savedItemsSubTab === 'bookmarks' && (
            <div>
              {bookmarks.length === 0 ? (
                <Card className="p-12 text-center bg-white dark:bg-[#071614] border border-stone-200/80 dark:border-emerald-950 space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-stone-100 dark:bg-emerald-950 flex items-center justify-center text-stone-400">
                    <Bookmark className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-stone-900 dark:text-white">
                    Hozircha saqlangan xatchoʻplar mavjud emas
                  </h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto">
                    Mushaf mutolaasi davomida har bir oyat kartasidagi xatchoʻp tugmasini bosib, siz uchun muhim boʻlgan oyatlarni bu yerda toʻplashingiz mumkin.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveQuranTab('mushaf')}
                    className="border-[#c5a869] text-[#c5a869] font-bold"
                  >
                    Mushafga Oʻtish
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bookmarks.map((bm) => (
                    <Card
                      key={bm.id}
                      className="p-4 bg-white dark:bg-[#071614] border border-stone-200/80 dark:border-emerald-950 shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bookmark className="w-4 h-4 text-[#c5a869] fill-current" />
                          <span className="font-bold text-sm text-stone-900 dark:text-white">
                            {bm.surahNameUz} surasi, {bm.ayahNumberInSurah}-oyat
                          </span>
                        </div>
                        <span className="text-[11px] text-stone-400">
                          {new Date(bm.createdAt).toLocaleDateString('uz-UZ')}
                        </span>
                      </div>

                      {bm.snippetAr && (
                        <p dir="rtl" className="font-arabic text-base text-right text-[#c5a869] line-clamp-2">
                          {bm.snippetAr}
                        </p>
                      )}

                      <p className="text-xs text-stone-600 dark:text-stone-300 italic line-clamp-2">
                        «{bm.snippetUz}»
                      </p>

                      <div className="pt-2 border-t border-stone-100 dark:border-emerald-950 flex items-center justify-between">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleJumpToAyah(bm.surahNumber, bm.ayahNumberInSurah)}
                          className="text-xs text-[#c5a869] hover:bg-[#c5a869]/10 font-bold p-0 h-auto"
                        >
                          Oyatga Oʻtish &rarr;
                        </Button>
                        <button
                          onClick={() => handleRemoveBookmark(bm)}
                          className="text-xs text-stone-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Oʻchirish</span>
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notes Section */}
          {savedItemsSubTab === 'notes' && (
            <div>
              {notes.length === 0 ? (
                <Card className="p-12 text-center bg-white dark:bg-[#071614] border border-stone-200/80 dark:border-emerald-950 space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-stone-100 dark:bg-emerald-950 flex items-center justify-center text-stone-400">
                    <Edit3 className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-stone-900 dark:text-white">
                    Hozircha shaxsiy qaydlar mavjud emas
                  </h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto">
                    Qurʼon oyatlarini oʻqiyotganda qalam (izoh) tugmasini bosib, shaxsiy tadabbur, ibrat va eslatmalaringizni yozib qoldiring.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveQuranTab('mushaf')}
                    className="border-[#c5a869] text-[#c5a869] font-bold"
                  >
                    Mushafga Oʻtish
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {notes.map((note) => (
                    <Card
                      key={note.id}
                      className="p-4 bg-white dark:bg-[#071614] border border-stone-200/80 dark:border-emerald-950 shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Edit3 className="w-4 h-4 text-[#c5a869]" />
                          <span className="font-bold text-sm text-stone-900 dark:text-white">
                            {note.surahNameUz} surasi, {note.ayahNumberInSurah}-oyat
                          </span>
                        </div>
                        <span className="text-[11px] text-stone-400">
                          {new Date(note.updatedAt || note.createdAt).toLocaleDateString('uz-UZ')}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-emerald-950/40 text-xs text-stone-500 dark:text-stone-400 italic line-clamp-2">
                        «{note.ayahSnippet}»
                      </div>

                      <div className="p-3 rounded-lg bg-amber-50/50 dark:bg-[#091a18] border border-amber-200/40 dark:border-emerald-900/60 text-xs text-stone-800 dark:text-stone-200 whitespace-pre-wrap">
                        {note.noteText}
                      </div>

                      <div className="pt-2 border-t border-stone-100 dark:border-emerald-950 flex items-center justify-between">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleJumpToAyah(note.surahNumber, note.ayahNumberInSurah)}
                          className="text-xs text-[#c5a869] hover:bg-[#c5a869]/10 font-bold p-0 h-auto"
                        >
                          Oyatga Oʻtish &rarr;
                        </Button>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setActiveNoteAyah({
                                id: `${note.surahNumber}-${note.ayahNumberInSurah}`,
                                number: note.ayahNumberInSurah,
                                numberInSurah: note.ayahNumberInSurah,
                                surahNumber: note.surahNumber,
                                surahNameUz: note.surahNameUz,
                                textAr: '',
                                translationUz: note.ayahSnippet,
                                transliterationUz: '',
                                audioUrl: '',
                                tafsirSummaryUz: '',
                              });
                              setNoteInputText(note.noteText);
                            }}
                            className="text-xs text-[#c5a869] hover:underline flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Tahrirlash</span>
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-xs text-stone-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Oʻchirish</span>
                          </button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* PERSONAL NOTE EDITING MODAL                                          */}
      {/* ==================================================================== */}
      {activeNoteAyah && (
        <Modal
          isOpen={Boolean(activeNoteAyah)}
          onClose={() => {
            setActiveNoteAyah(null);
            setNoteInputText('');
          }}
          title={`Oyat boʻyicha shaxsiy qayd (${selectedSurah.nameUz}, ${activeNoteAyah.numberInSurah}-oyat)`}
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-stone-100 dark:bg-emerald-950/60 border border-stone-200 dark:border-emerald-800 space-y-1.5">
              {activeNoteAyah.textAr && (
                <p dir="rtl" className="font-arabic text-lg text-stone-900 dark:text-amber-100 text-right">
                  {activeNoteAyah.textAr}
                </p>
              )}
              <p className="text-xs text-stone-600 dark:text-stone-300 italic">
                «{activeNoteAyah.translationUz}»
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                Shaxsiy tadabbur, ibrat yoki eslatmangiz:
              </label>
              <textarea
                value={noteInputText}
                onChange={(e) => setNoteInputText(e.target.value)}
                placeholder="Ushbu oyatdan olgan xulosangiz, eslatma yoki shaxsiy duongizni yozing..."
                rows={4}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-300 dark:border-emerald-800 bg-white dark:bg-[#071614] text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#c5a869]"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveNoteAyah(null);
                  setNoteInputText('');
                }}
              >
                Bekor qilish
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveNote}
                disabled={!noteInputText.trim()}
                className="bg-[#c5a869] text-[#071614] hover:brightness-105 font-bold"
              >
                Saqlash
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
