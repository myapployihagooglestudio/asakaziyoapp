import React, { useEffect, useState, useCallback } from 'react';
import { NavigationTab } from '../../../types';
import { QuranView } from './QuranView';
import { SURAHS_LIST } from '../../../data/quranData';
import {
  playGlobalQuranTrack,
  subscribeGlobalQuranPlayer,
  GlobalQuranPlayerState,
} from '../../../utils/quranPlayerStore';
import {
  subscribeToOfflineManager,
  startOfflineDownload,
  pauseOfflineDownload,
  removeOfflineDownload,
  triggerOfflineSmartSync,
  formatBytes,
  OfflineStorageStats,
  OfflineDownloadTask,
} from '../../../utils/offlineStorageService';
import { getActiveEcosystemUserId, detectClientPlatform } from '../../../utils/userIdentityClient';
import {
  useUserEntitlements,
  ClientFeatureDecision,
} from '../../../utils/entitlementClient';
import { PremiumGateModal } from '../../ui/PremiumGateModal';
import {
  BookOpen,
  Headphones,
  ListMusic,
  Download,
  GraduationCap,
  Flame,
  Play,
  Pause,
  CheckCircle2,
  Plus,
  Trash2,
  Share2,
  WifiOff,
  RefreshCw,
  Award,
  Sparkles,
  Volume2,
  HardDrive,
  Search,
  Lock,
} from 'lucide-react';

interface QuranEcosystemHubProps {
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
  onOpenPremium?: () => void;
}

type HubSection = 'mushaf' | 'qorilar' | 'playlists' | 'offline' | 'tajvid' | 'hifz';

export const QuranEcosystemHub: React.FC<QuranEcosystemHubProps> = ({
  onToggleFavorite,
  isFavorited,
  arabicFontSize,
  onOpenPremium,
}) => {
  const [section, setSection] = useState<HubSection>('mushaf');
  const [userId] = useState<string>(() => getActiveEcosystemUserId());

  // Player & Offline state
  const [playerState, setPlayerState] = useState<GlobalQuranPlayerState | null>(null);
  const [offlineStats, setOfflineStats] = useState<OfflineStorageStats | null>(null);
  const [offlineTasks, setOfflineTasks] = useState<OfflineDownloadTask[]>([]);
  const [storageEstimate, setStorageEstimate] = useState<{ usage: number; quota: number } | null>(null);

  // Server Qorilar & 114 Surah Catalog
  const [qaris, setQaris] = useState<any[]>([]);
  const [selectedQariId, setSelectedQariId] = useState<string>('mishary');
  const [surahCatalog, setSurahCatalog] = useState<any[]>([]);
  const [surahQuery, setSurahQuery] = useState('');
  const [loadingQaris, setLoadingQaris] = useState(false);

  // Playlists
  const [officialPlaylists, setOfficialPlaylists] = useState<any[]>([]);
  const [personalPlaylists, setPersonalPlaylists] = useState<any[]>([]);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [newPlaylistSurah, setNewPlaylistSurah] = useState<number>(36);
  const [playlistFeedback, setPlaylistFeedback] = useState<string | null>(null);

  // Tajvid, Alphabet & Quizzes
  const [alphabet, setAlphabet] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [eduSubTab, setEduSubTab] = useState<'alphabet' | 'lessons' | 'quiz'>('alphabet');
  const [selectedLetter, setSelectedLetter] = useState<any | null>(null);
  const [activeLesson, setActiveLesson] = useState<any | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Cross-platform User Profile (Hifz, Progress, Certificates)
  const [profile, setProfile] = useState<any | null>(null);
  const { isPremium: liveIsPremium, checkFeature } = useUserEntitlements();
  const [isPremium, setIsPremium] = useState(false);
  const [gateDecision, setGateDecision] = useState<ClientFeatureDecision | null>(null);
  const [hifzSurah, setHifzSurah] = useState(112);
  const [hifzStart, setHifzStart] = useState(1);
  const [hifzEnd, setHifzEnd] = useState(4);

  useEffect(() => {
    setIsPremium(liveIsPremium);
  }, [liveIsPremium]);

  useEffect(() => {
    const unsubPlayer = subscribeGlobalQuranPlayer(setPlayerState);
    const unsubOffline = subscribeToOfflineManager((st, tasks) => {
      setOfflineStats(st);
      setOfflineTasks(tasks);
    });
    if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
      navigator.storage
        .estimate()
        .then((est) => setStorageEstimate({ usage: est.usage || 0, quota: est.quota || 0 }))
        .catch(() => {});
    }
    return () => {
      unsubPlayer();
      unsubOffline();
    };
  }, []);

  const loadEcosystemData = useCallback(async () => {
    setLoadingQaris(true);
    try {
      const [qRes, plRes, eduRes, profRes, subRes] = await Promise.all([
        fetch('/api/quran-ecosystem/qaris').then((r) => r.json()).catch(() => null),
        fetch(`/api/quran-ecosystem/playlists?userId=${encodeURIComponent(userId)}`).then((r) => r.json()).catch(() => null),
        fetch('/api/quran-ecosystem/education').then((r) => r.json()).catch(() => null),
        fetch(`/api/quran-ecosystem/profile/${encodeURIComponent(userId)}`).then((r) => r.json()).catch(() => null),
        fetch(`/api/subscriptions/me/${encodeURIComponent(userId)}`).then((r) => r.json()).catch(() => null),
      ]);
      if (qRes?.success && Array.isArray(qRes.qaris)) {
        setQaris(qRes.qaris);
        if (qRes.qaris.length > 0 && !qRes.qaris.some((q: any) => q.id === selectedQariId)) {
          setSelectedQariId(qRes.qaris[0].id);
        }
      }
      if (plRes?.success) {
        setOfficialPlaylists(plRes.official || []);
        setPersonalPlaylists(plRes.personal || []);
      }
      if (eduRes?.success) {
        setAlphabet(eduRes.alphabet || []);
        setLessons(eduRes.lessons || []);
        setQuizzes(eduRes.quizzes || []);
      }
      if (profRes?.success) setProfile(profRes.profile);
      if (subRes?.success) setIsPremium(Boolean(subRes.subscription?.isPremium));
    } finally {
      setLoadingQaris(false);
    }
  }, [userId, selectedQariId]);

  useEffect(() => {
    void loadEcosystemData();
  }, [loadEcosystemData]);

  useEffect(() => {
    if (!selectedQariId) return;
    fetch(`/api/quran-ecosystem/qaris/${encodeURIComponent(selectedQariId)}/surahs`)
      .then((r) => r.json())
      .then((json) => {
        if (json?.success && Array.isArray(json.surahs)) {
          setSurahCatalog(json.surahs);
        }
      })
      .catch(() => {});
  }, [selectedQariId]);

  const activeQari = qaris.find((q) => q.id === selectedQariId) || qaris[0];

  const handlePlaySurah = (surahItem: any) => {
    if (!surahItem.audioUrl || !activeQari) return;
    const queue = surahCatalog
      .filter((s) => Boolean(s.audioUrl))
      .map((s) => ({
        qariId: activeQari.id,
        qariNameUz: activeQari.nameUz,
        surahNumber: s.surahNumber,
        surahNameUz: s.nameUz,
        surahNameAr: s.nameAr,
        audioUrl: s.audioUrl,
      }));
    const target = queue.find((t) => t.surahNumber === surahItem.surahNumber);
    if (target) {
      void playGlobalQuranTrack(target, queue);
    }
  };

  const handleDownloadSurah = async (surahItem: any) => {
    if (!surahItem.audioUrl || !activeQari) return;
    const check = await checkFeature('unlimited_offline_downloads', true);
    if (!check.ok) {
      setGateDecision(
        check.decision || {
          allowed: false,
          featureKey: 'unlimited_offline_downloads',
          module: 'offline',
          reasonCode: 'USAGE_LIMIT_REACHED',
          messageUz: check.error || 'Kunlik bepul oflayn yuklash limitingiz tugadi.',
          access: 'premium',
          isPremiumUser: false,
          subscriptionStatus: 'FREE',
          limitPeriod: 'daily',
          limit: 3,
          used: 3,
          remaining: 0,
        }
      );
      return;
    }
    await startOfflineDownload({
      id: `quran_${activeQari.id}_${surahItem.surahNumber}`,
      type: 'quran_audio',
      title: `${surahItem.surahNumber}. ${surahItem.nameUz}`,
      subtitle: activeQari.nameUz,
      sourceUrl: surahItem.audioUrl,
      reciterId: activeQari.id,
      surahNumber: surahItem.surahNumber,
      quality: '128kbps',
    });
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistTitle.trim()) return;
    setPlaylistFeedback(null);
    const res = await fetch('/api/quran-ecosystem/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        platform: detectClientPlatform(),
        titleUz: newPlaylistTitle.trim(),
        descriptionUz: 'Shaxsiy Qurʼon tilovatlari roʻyxati',
        category: 'custom',
        tracks: [{ qariId: selectedQariId || 'mishary', surahNumber: newPlaylistSurah }],
      }),
    });
    const json = await res.json();
    if (!json.success) {
      if (res.status === 403) {
        setGateDecision(
          json.entitlement || {
            allowed: false,
            featureKey: 'unlimited_playlists',
            module: 'audio',
            reasonCode: json.code || 'PREMIUM_REQUIRED',
            messageUz: json.error || 'Cheksiz playlistlar uchun Premium faollashtiring.',
            access: 'premium',
            isPremiumUser: false,
            subscriptionStatus: 'FREE',
            limitPeriod: 'unlimited',
            limit: 2,
            used: 2,
            remaining: 0,
          }
        );
      }
      setPlaylistFeedback(json.error || 'Playlist yaratib boʻlmadi.');
      return;
    }
    setNewPlaylistTitle('');
    setPlaylistFeedback('Playlist muvaffaqiyatli yaratildi va barcha qurilmalarga saqlandi.');
    void loadEcosystemData();
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    await fetch(`/api/quran-ecosystem/playlists/${encodeURIComponent(playlistId)}?userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
    void loadEcosystemData();
  };

  const handlePlayPlaylist = async (playlist: any) => {
    if (!Array.isArray(playlist.tracks) || playlist.tracks.length === 0) return;
    const tracksQueue = playlist.tracks
      .map((tr: any) => {
        const q = qaris.find((x) => x.id === tr.qariId) || activeQari;
        const s = SURAHS_LIST.find((x) => x.number === tr.surahNumber);
        if (!q || !s) return null;
        const base = q.externalSurahBaseUrl;
        const url = base ? `${base.replace(/\/$/, '')}/${String(s.number).padStart(3, '0')}.mp3` : '';
        if (!url) return null;
        return {
          qariId: q.id,
          qariNameUz: q.nameUz,
          surahNumber: s.number,
          surahNameUz: s.nameUz,
          surahNameAr: s.nameAr,
          audioUrl: url,
        };
      })
      .filter(Boolean);

    if (tracksQueue.length > 0) {
      await playGlobalQuranTrack(tracksQueue[0], tracksQueue);
    }
  };

  const saveProfilePatch = async (patch: Record<string, any>) => {
    const res = await fetch(`/api/quran-ecosystem/profile/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const json = await res.json();
    if (json?.success) setProfile(json.profile);
  };

  const toggleMasteredLetter = (letterId: string) => {
    const list: string[] = profile?.masteredLetterIds || [];
    const next = list.includes(letterId) ? list.filter((x) => x !== letterId) : [...list, letterId];
    void saveProfilePatch({ masteredLetterIds: next });
  };

  const toggleCompletedLesson = (lessonId: string) => {
    const list: string[] = profile?.completedLessonIds || [];
    const next = list.includes(lessonId) ? list.filter((x) => x !== lessonId) : [...list, lessonId];
    void saveProfilePatch({ completedLessonIds: next });
  };

  const handleSubmitEduQuiz = () => {
    setQuizSubmitted(true);
    const total = quizzes.length;
    if (total === 0) return;
    let score = 0;
    for (const q of quizzes) {
      if (quizAnswers[q.id] === q.correctIndex) score += 1;
    }
    const prevScores = Array.isArray(profile?.quizScores) ? profile.quizScores : [];
    void saveProfilePatch({
      quizScores: [
        {
          id: `qs_${Date.now()}`,
          category: 'tajweed_academy',
          score,
          total,
          percentage: Math.round((score / total) * 100),
          completedAt: new Date().toISOString(),
        },
        ...prevScores.slice(0, 29),
      ],
    });
  };

  const handleAddHifzRange = () => {
    const surahInfo = SURAHS_LIST.find((s) => s.number === hifzSurah);
    if (!surahInfo) return;
    const s = Math.max(1, Math.min(hifzStart, surahInfo.numberOfAyahs));
    const e = Math.max(s, Math.min(hifzEnd, surahInfo.numberOfAyahs));
    const nextReviewDate = new Date(Date.now() + 86400 * 1000).toISOString().slice(0, 10);
    const existing = Array.isArray(profile?.hifzRanges) ? profile.hifzRanges : [];
    void saveProfilePatch({
      hifzRanges: [
        {
          id: `hifz_${Date.now()}`,
          surahNumber: hifzSurah,
          startAyah: s,
          endAyah: e,
          memorizedCount: e - s + 1,
          repeatCount: 1,
          masteryPercent: 25,
          isDifficult: false,
          nextReviewDate,
          reviewStage: 0,
          lastReviewedAt: new Date().toISOString(),
        },
        ...existing,
      ],
    });
  };

  const handleReviewHifzRange = (rangeId: string) => {
    const intervals = [1, 3, 7, 16, 35];
    const existing = Array.isArray(profile?.hifzRanges) ? profile.hifzRanges : [];
    const next = existing.map((r: any) => {
      if (r.id !== rangeId) return r;
      const nextStage = Math.min(intervals.length - 1, (r.reviewStage || 0) + 1);
      const nextDate = new Date(Date.now() + intervals[nextStage] * 86400 * 1000).toISOString().slice(0, 10);
      return {
        ...r,
        repeatCount: (r.repeatCount || 0) + 1,
        reviewStage: nextStage,
        masteryPercent: Math.min(100, (r.masteryPercent || 25) + 20),
        nextReviewDate: nextDate,
        lastReviewedAt: new Date().toISOString(),
      };
    });
    void saveProfilePatch({ hifzRanges: next });
  };

  const filteredSurahs = surahCatalog.filter((s) => {
    const q = surahQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      String(s.surahNumber) === q ||
      s.nameUz.toLowerCase().includes(q) ||
      s.nameAr.includes(q) ||
      (s.meaningUz || '').toLowerCase().includes(q)
    );
  });

  const navItems: Array<{ id: HubSection; label: string; icon: React.ReactNode; count?: number }> = [
    { id: 'mushaf', label: 'Mushaf (114 Sura)', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'qorilar', label: 'Qorilar & Audio', icon: <Headphones className="w-4 h-4" />, count: qaris.length },
    { id: 'playlists', label: 'Playlistlar', icon: <ListMusic className="w-4 h-4" />, count: officialPlaylists.length + personalPlaylists.length },
    { id: 'offline', label: 'Yuklab olinganlar', icon: <Download className="w-4 h-4" />, count: offlineStats?.downloadedAudioCount || 0 },
    { id: 'tajvid', label: 'Tajvid & Alifbo', icon: <GraduationCap className="w-4 h-4" />, count: lessons.length },
    { id: 'hifz', label: 'Hifz & Murojaʼa', icon: <Flame className="w-4 h-4" />, count: profile?.hifzRanges?.length || 0 },
  ];

  return (
    <div className="space-y-5">
      {/* Unified Qur'on Ecosystem Sub-Navigation Bar */}
      <div className="rounded-3xl az-liquid-glass p-2.5 border border-[#064E3B]/12 dark:border-white/[0.09]">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {navItems.map((tab) => {
            const active = section === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSection(tab.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  active
                    ? 'bg-[#064E3B] dark:bg-[#10B981] text-white dark:text-[#04120D] shadow-sm'
                    : 'text-[#334F46] dark:text-[#C5D4CE] hover:bg-[#064E3B]/8 dark:hover:bg-white/[0.07]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono-numbers ${
                      active ? 'bg-black/20 text-white dark:text-[#04120D]' : 'bg-[#064E3B]/10 dark:bg-white/10'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 1: CANONICAL MUSHAF (Preserves existing full QuranView 100%) */}
      {section === 'mushaf' && (
        <QuranView
          onToggleFavorite={onToggleFavorite}
          isFavorited={isFavorited}
          arabicFontSize={arabicFontSize}
        />
      )}

      {/* SECTION 2: QORILAR & 114-SURAH PERSISTENT AUDIO LIBRARY */}
      {section === 'qorilar' && (
        <div className="space-y-5">
          <div className="rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-[#06281E] via-[#071A14] to-[#050D0B] text-[#F7F4EC] border border-[#C8A85E]/25">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-[#C8A85E] font-bold">
                  ASAKA ZIYO · Qorilar Kutubxonasi
                </div>
                <h2 className="mt-1 text-xl sm:text-2xl font-display font-extrabold">
                  Tasdiqlangan Qorilar va 114 Sura Tilovati
                </h2>
                <p className="mt-1 text-xs text-[#A3B8B0] max-w-2xl">
                  Admin panel orqali yuklangan doimiy server audiolari hamda rasmiy qiroatlar. Har bir surani bir bosishda tinglang yoki offline xotiraga saqlang.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadEcosystemData()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold cursor-pointer self-start sm:self-center"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingQaris ? 'animate-spin' : ''}`} />
                <span>Yangilash</span>
              </button>
            </div>
          </div>

          {/* Qari Selector Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {qaris.map((q) => {
              const selected = q.id === selectedQariId;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setSelectedQariId(q.id)}
                  className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                    selected
                      ? 'bg-[#064E3B] text-white border-[#C8A85E] shadow-md'
                      : 'az-liquid-glass border-[#064E3B]/12 dark:border-white/[0.09] hover:border-[#064E3B]/35'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm">{q.nameUz}</div>
                      <div className="font-arabic text-base opacity-85 mt-0.5">{q.nameAr}</div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-black/15 dark:bg-white/10">
                      {q.styleUz}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] opacity-80">
                    <span>{q.countryUz}</span>
                    <span className="font-mono-numbers">
                      {q.publishedSurahsCount > 0
                        ? `${q.publishedSurahsCount} server audio`
                        : q.externalSurahBaseUrl
                        ? '114 sura tayyor'
                        : 'Yuklanmoqda'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 114-Surah Search & Tracklist */}
          <div className="rounded-3xl az-liquid-glass p-4 sm:p-5 border border-[#064E3B]/12 dark:border-white/[0.09] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-base text-[#091813] dark:text-[#F7F4EC]">
                  {activeQari?.nameUz} — 114 Sura Roʻyxati
                </h3>
                <p className="text-xs text-[#5F776F] dark:text-[#8FA69D]">
                  Pleyer boshqa boʻlimlarga oʻtganda ham toʻxtamasdan ijro etishda davom etadi.
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5F776F]" />
                <input
                  type="text"
                  value={surahQuery}
                  onChange={(e) => setSurahQuery(e.target.value)}
                  placeholder="Sura nomi yoki raqami (1-114)..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs focus:outline-none focus:border-[#064E3B]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[540px] overflow-y-auto pr-1">
              {filteredSurahs.map((s) => {
                const isCurrent =
                  playerState?.currentTrack?.qariId === activeQari?.id &&
                  playerState?.currentTrack?.surahNumber === s.surahNumber;
                const taskId = `quran_${activeQari?.id}_${s.surahNumber}`;
                const dlTask = offlineTasks.find((t) => t.id === taskId);
                const isDownloaded = dlTask?.status === 'completed';

                return (
                  <div
                    key={s.surahNumber}
                    className={`flex items-center justify-between gap-3 p-3 rounded-2xl border transition-colors ${
                      isCurrent
                        ? 'bg-[#064E3B]/12 dark:bg-emerald-500/15 border-[#064E3B] dark:border-emerald-400/40'
                        : 'bg-white/60 dark:bg-white/[0.03] border-[#064E3B]/10 dark:border-white/[0.07]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-8 h-8 rounded-xl bg-[#064E3B]/10 dark:bg-white/10 text-[#064E3B] dark:text-[#C8A85E] font-mono-numbers text-xs font-bold flex items-center justify-center shrink-0">
                        {s.surahNumber}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#091813] dark:text-[#F7F4EC] truncate">
                            {s.nameUz}
                          </span>
                          <span className="font-arabic text-sm text-[#8A6B2D] dark:text-[#C8A85E] shrink-0">
                            {s.nameAr}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#5F776F] dark:text-[#8FA69D] flex items-center gap-2">
                          <span>{s.numberOfAyahs} oyat</span>
                          <span>·</span>
                          <span>
                            {s.audioSource === 'uploaded_persistent'
                              ? 'Server MP3'
                              : s.audioSource === 'verified_cdn'
                              ? 'Rasmiy audio'
                              : 'Yuklanmagan'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {s.audioUrl ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handlePlaySurah(s)}
                            className="w-9 h-9 rounded-xl bg-[#064E3B] dark:bg-[#10B981] text-white dark:text-[#04120D] flex items-center justify-center cursor-pointer hover:opacity-90"
                            title="Tinglash"
                          >
                            {isCurrent && playerState?.isPlaying ? (
                              <Pause className="w-4 h-4 fill-current" />
                            ) : (
                              <Play className="w-4 h-4 fill-current ml-0.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDownloadSurah(s)}
                            disabled={isDownloaded}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center border cursor-pointer ${
                              isDownloaded
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500'
                                : 'border-[#064E3B]/15 dark:border-white/15 hover:bg-[#064E3B]/10'
                            }`}
                            title={isDownloaded ? 'Offline saqlangan' : 'Offline yuklab olish'}
                          >
                            {isDownloaded ? <CheckCircle2 className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] text-[#5F776F] px-2">Kutilmoqda</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: OFFICIAL & PERSONAL PLAYLISTS */}
      {section === 'playlists' && (
        <div className="space-y-5">
          <div className="rounded-3xl az-liquid-glass p-5 border border-[#064E3B]/12 dark:border-white/[0.09] space-y-3">
            <h3 className="font-bold text-base text-[#091813] dark:text-[#F7F4EC] flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#064E3B] dark:text-emerald-400" />
              <span>Yangi Shaxsiy Playlist Yaratish</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                value={newPlaylistTitle}
                onChange={(e) => setNewPlaylistTitle(e.target.value)}
                placeholder="Masalan: Bomdoddan keyingi suralar..."
                className="px-3.5 py-2.5 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs"
              />
              <select
                value={newPlaylistSurah}
                onChange={(e) => setNewPlaylistSurah(Number(e.target.value))}
                className="px-3.5 py-2.5 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs"
              >
                {SURAHS_LIST.map((s) => (
                  <option key={s.number} value={s.number}>
                    {s.number}. {s.nameUz}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void handleCreatePlaylist()}
                className="px-4 py-2.5 rounded-xl bg-[#064E3B] dark:bg-[#10B981] text-white dark:text-[#04120D] font-bold text-xs cursor-pointer hover:opacity-95"
              >
                Playlistni Saqlash
              </button>
            </div>
            {playlistFeedback && (
              <div className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                <span>{playlistFeedback}</span>
                {!isPremium && onOpenPremium && playlistFeedback.includes('Premium') && (
                  <button
                    type="button"
                    onClick={onOpenPremium}
                    className="px-2.5 py-1 rounded-lg bg-[#C8A85E] text-[#050C09] font-bold text-[11px] cursor-pointer"
                  >
                    Premium
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Official Admin Playlists */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#5F776F] dark:text-[#8FA69D]">
                Rasmiy ASAKA ZIYO Playlistlari ({officialPlaylists.length})
              </h4>
              {officialPlaylists.map((pl) => (
                <div
                  key={pl.id}
                  className="p-4 rounded-2xl az-liquid-glass border border-[#C8A85E]/25 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-bold text-sm text-[#091813] dark:text-[#F7F4EC]">{pl.titleUz}</div>
                    <p className="text-xs text-[#5F776F] dark:text-[#8FA69D] mt-0.5">{pl.descriptionUz}</p>
                    <div className="text-[11px] text-[#8A6B2D] dark:text-[#C8A85E] mt-1 font-mono-numbers">
                      {pl.tracks?.length || 0} ta sura · Rasmiy toʻplam
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => void handlePlayPlaylist(pl)}
                      className="px-3.5 py-2 rounded-xl bg-[#064E3B] dark:bg-[#10B981] text-white dark:text-[#04120D] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Tinglash</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Personal Playlists */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#5F776F] dark:text-[#8FA69D]">
                Shaxsiy Playlistlarim ({personalPlaylists.length})
              </h4>
              {personalPlaylists.length === 0 ? (
                <div className="p-6 rounded-2xl az-liquid-glass border border-dashed border-[#064E3B]/20 text-center text-xs text-[#5F776F] dark:text-[#8FA69D]">
                  Hozircha shaxsiy playlist yoʻq. Yuqoridan birinchi playlistingizni yarating.
                </div>
              ) : (
                personalPlaylists.map((pl) => (
                  <div
                    key={pl.id}
                    className="p-4 rounded-2xl az-liquid-glass border border-[#064E3B]/12 dark:border-white/10 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-sm text-[#091813] dark:text-[#F7F4EC]">{pl.titleUz}</div>
                      <div className="text-[11px] text-[#5F776F] dark:text-[#8FA69D] mt-0.5">
                        {pl.tracks?.length || 0} ta sura
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void handlePlayPlaylist(pl)}
                        className="p-2 rounded-xl bg-[#064E3B] dark:bg-[#10B981] text-white dark:text-[#04120D] cursor-pointer"
                        title="Ijro etish"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const shareUrl = `${window.location.origin}/?playlist=${encodeURIComponent(pl.shareSlug)}`;
                          navigator.clipboard?.writeText(shareUrl).catch(() => {});
                          setPlaylistFeedback('Playlist havolasi nusxalandi!');
                        }}
                        className="p-2 rounded-xl bg-white/10 border border-[#064E3B]/15 cursor-pointer"
                        title="Ulashish"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeletePlaylist(pl.id)}
                        className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                        title="Oʻchirish"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: OFFLINE DOWNLOAD CENTER ("Yuklab olinganlar") */}
      {section === 'offline' && (
        <div className="space-y-4">
          <div className="rounded-3xl az-liquid-glass p-5 border border-[#064E3B]/15 dark:border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg text-[#091813] dark:text-[#F7F4EC] flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-[#064E3B] dark:text-emerald-400" />
                  <span>Yuklab olinganlar va Offline Markazi</span>
                </h3>
                <p className="text-xs text-[#5F776F] dark:text-[#8FA69D] mt-1">
                  Barcha yuklangan Qurʼon audiolari, 114 sura Mushaf matni, 40 ta hadis va Asaka namoz jadvali internetsiz ishlaydi.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void triggerOfflineSmartSync()}
                className="px-4 py-2.5 rounded-xl bg-[#064E3B] dark:bg-[#10B981] text-white dark:text-[#04120D] text-xs font-bold inline-flex items-center gap-2 cursor-pointer self-start"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Offline bazani sinxronlash</span>
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-2xl bg-[#F7F5F0] dark:bg-white/[0.04]">
                <div className="text-[11px] text-[#5F776F] dark:text-[#8FA69D]">Yuklangan Audio</div>
                <div className="text-lg font-mono-numbers font-extrabold text-[#064E3B] dark:text-emerald-400">
                  {offlineStats?.downloadedAudioCount || 0} ta
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-[#F7F5F0] dark:bg-white/[0.04]">
                <div className="text-[11px] text-[#5F776F] dark:text-[#8FA69D]">Band Hajm</div>
                <div className="text-lg font-mono-numbers font-extrabold text-[#091813] dark:text-[#F7F4EC]">
                  {offlineStats?.formattedSize || '0 KB'}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-[#F7F5F0] dark:bg-white/[0.04]">
                <div className="text-[11px] text-[#5F776F] dark:text-[#8FA69D]">Mushaf Offline</div>
                <div className="text-lg font-mono-numbers font-extrabold text-[#8A6B2D] dark:text-[#C8A85E]">
                  114 sura
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-[#F7F5F0] dark:bg-white/[0.04]">
                <div className="text-[11px] text-[#5F776F] dark:text-[#8FA69D]">Qurilma Xotirasi</div>
                <div className="text-sm font-mono-numbers font-bold text-[#091813] dark:text-[#F7F4EC] mt-1">
                  {storageEstimate ? `${formatBytes(storageEstimate.usage)} / ${formatBytes(storageEstimate.quota)}` : 'Tayyor'}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl az-liquid-glass p-5 border border-[#064E3B]/12 dark:border-white/[0.09] space-y-3">
            <h4 className="font-bold text-sm text-[#091813] dark:text-[#F7F4EC]">
              Yuklab olingan fayllar roʻyxati ({offlineTasks.length})
            </h4>
            {offlineTasks.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#5F776F] dark:text-[#8FA69D] space-y-2">
                <WifiOff className="w-8 h-8 mx-auto opacity-40" />
                <p>Hozircha offline audio yuklanmagan. «Qorilar & Audio» boʻlimidan istalgan surani yuklab oling.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {offlineTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3.5 rounded-2xl bg-white/60 dark:bg-white/[0.03] border border-[#064E3B]/10 dark:border-white/[0.07] flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-[#091813] dark:text-[#F7F4EC] truncate">{task.title}</div>
                      <div className="text-[11px] text-[#5F776F] dark:text-[#8FA69D] flex items-center gap-2">
                        <span>{task.subtitle}</span>
                        <span>·</span>
                        <span className="font-mono-numbers">{formatBytes(task.totalBytes || task.downloadedBytes)}</span>
                        <span>·</span>
                        <span className="uppercase font-semibold">{task.status}</span>
                      </div>
                      {task.status === 'downloading' && (
                        <div className="mt-1.5 h-1.5 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${task.progressPercent}%` }} />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {task.status === 'completed' && task.reciterId && task.surahNumber && (
                        <button
                          type="button"
                          onClick={() =>
                            void playGlobalQuranTrack({
                              qariId: task.reciterId!,
                              qariNameUz: task.subtitle,
                              surahNumber: task.surahNumber!,
                              surahNameUz: task.title,
                              audioUrl: task.sourceUrl,
                            })
                          }
                          className="px-3 py-1.5 rounded-xl bg-[#064E3B] dark:bg-[#10B981] text-white dark:text-[#04120D] text-xs font-bold cursor-pointer"
                        >
                          Offline tinglash
                        </button>
                      )}
                      {task.status === 'downloading' && (
                        <button
                          type="button"
                          onClick={() => pauseOfflineDownload(task.id)}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-300 text-xs font-semibold cursor-pointer"
                        >
                          Pauza
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void removeOfflineDownload(task.id)}
                        className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                        title="Oʻchirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 5: TAJWEED ACADEMY, 28 ARABIC LETTERS & MAKHARIJ + INTERACTIVE QUIZ */}
      {section === 'tajvid' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {[
                { id: 'alphabet' as const, label: `Arab alifbosi & Maxraj (${alphabet.length})` },
                { id: 'lessons' as const, label: `Tajvid darslari (${lessons.length})` },
                { id: 'quiz' as const, label: `Tajvid testlari (${quizzes.length})` },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setEduSubTab(t.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                    eduSubTab === t.id
                      ? 'bg-[#064E3B] dark:bg-[#10B981] text-white dark:text-[#04120D]'
                      : 'az-liquid-glass text-[#334F46] dark:text-[#C5D4CE]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {profile?.certificates?.length > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#C8A85E]/20 text-[#8A6B2D] dark:text-[#E6CE8A] text-xs font-bold">
                <Award className="w-4 h-4" />
                <span>{profile.certificates.length} ta Sertifikat</span>
              </div>
            )}
          </div>

          {/* 5A. 28 ARABIC LETTERS & MAKHARIJ */}
          {eduSubTab === 'alphabet' && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5" dir="rtl">
                {alphabet.map((lt) => {
                  const mastered = (profile?.masteredLetterIds || []).includes(lt.id);
                  const active = selectedLetter?.id === lt.id;
                  return (
                    <button
                      key={lt.id}
                      type="button"
                      onClick={() => setSelectedLetter(lt)}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                        active
                          ? 'bg-[#064E3B] text-white border-[#C8A85E] scale-[1.03]'
                          : mastered
                          ? 'bg-emerald-500/15 border-emerald-500/35 text-[#091813] dark:text-[#F7F4EC]'
                          : 'az-liquid-glass border-[#064E3B]/12 dark:border-white/10'
                      }`}
                    >
                      <div className="font-arabic text-3xl leading-none">{lt.letter}</div>
                      <div className="text-[11px] font-semibold mt-2" dir="ltr">
                        {lt.nameUz}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedLetter && (
                <div className="rounded-3xl az-liquid-glass p-5 border border-[#C8A85E]/30 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs text-[#8A6B2D] dark:text-[#C8A85E] font-bold">
                        {selectedLetter.order}-harf · {selectedLetter.makhrajGroupUz}
                      </div>
                      <h4 className="text-xl font-bold text-[#091813] dark:text-[#F7F4EC]">
                        {selectedLetter.nameUz} ({selectedLetter.nameAr})
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleMasteredLetter(selectedLetter.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 ${
                        (profile?.masteredLetterIds || []).includes(selectedLetter.id)
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#064E3B]/10 dark:bg-white/10 text-[#064E3B] dark:text-emerald-300'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {(profile?.masteredLetterIds || []).includes(selectedLetter.id)
                          ? 'Oʻzlashtirildi'
                          : 'Oʻrgandim deb belgilash'}
                      </span>
                    </button>
                  </div>

                  {/* 4 Letter Positional Forms */}
                  <div className="grid grid-cols-4 gap-2.5 text-center" dir="rtl">
                    {[
                      { label: 'Alohida', val: selectedLetter.isolated },
                      { label: 'Soʻz boshida', val: selectedLetter.initial },
                      { label: 'Soʻz oʻrtasida', val: selectedLetter.medial },
                      { label: 'Soʻz oxirida', val: selectedLetter.final },
                    ].map((form) => (
                      <div key={form.label} className="p-3 rounded-2xl bg-[#F7F5F0] dark:bg-white/[0.04]">
                        <div className="font-arabic text-3xl text-[#064E3B] dark:text-[#E6CE8A]">{form.val}</div>
                        <div className="text-[10px] text-[#5F776F] dark:text-[#8FA69D] mt-1" dir="ltr">
                          {form.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-[#F7F5F0] dark:bg-white/[0.04]">
                      <div className="font-bold text-[#064E3B] dark:text-emerald-400">Maxraj (Chiqish oʻrni)</div>
                      <p className="mt-1 leading-relaxed">{selectedLetter.makhrajDetailUz}</p>
                      <div className="mt-2 text-[11px] opacity-80">Sifatlari: {selectedLetter.sifatUz}</div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[#F7F5F0] dark:bg-white/[0.04] flex flex-col justify-between">
                      <div className="font-bold text-[#8A6B2D] dark:text-[#C8A85E]">Qurʼoniy misol</div>
                      <div className="font-arabic text-3xl text-right my-2" dir="rtl">
                        {selectedLetter.exampleWordAr}
                      </div>
                      <div className="text-xs font-semibold">Oʻqilishi: {selectedLetter.exampleReadingUz}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5B. TAJWEED LESSONS */}
          {eduSubTab === 'lessons' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {lessons.map((ls) => {
                const locked = ls.isPremium && !isPremium;
                const completed = (profile?.completedLessonIds || []).includes(ls.id);
                return (
                  <div
                    key={ls.id}
                    className="p-5 rounded-3xl az-liquid-glass border border-[#064E3B]/12 dark:border-white/[0.09] space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="uppercase font-bold text-[#064E3B] dark:text-emerald-400">
                          {ls.level === 'beginner' ? 'Boshlangʻich' : ls.level === 'intermediate' ? 'Oʻrta' : 'Yuqori'} · {ls.durationMinutes} daqiqa
                        </span>
                        {ls.isPremium ? (
                          <span className="px-2 py-0.5 rounded-md bg-[#C8A85E]/20 text-[#8A6B2D] dark:text-[#E6CE8A] font-bold">
                            Premium
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 font-bold">
                            Bepul
                          </span>
                        )}
                      </div>
                      <h4 className="mt-1.5 font-bold text-base text-[#091813] dark:text-[#F7F4EC]">{ls.titleUz}</h4>
                      {ls.titleAr && (
                        <div className="font-arabic text-base text-right text-[#8A6B2D] dark:text-[#C8A85E]" dir="rtl">
                          {ls.titleAr}
                        </div>
                      )}
                      <p className="mt-2 text-xs text-[#5F776F] dark:text-[#9AB0A7] leading-relaxed">{ls.summaryUz}</p>

                      {activeLesson?.id === ls.id && !locked && (
                        <div className="mt-3 pt-3 border-t border-[#064E3B]/10 dark:border-white/10 space-y-3 text-xs">
                          <div className="whitespace-pre-line leading-relaxed text-[#091813] dark:text-[#E5ECE9]">
                            {ls.contentUz}
                          </div>
                          {Array.isArray(ls.examples) && ls.examples.length > 0 && (
                            <div className="space-y-2">
                              {ls.examples.map((ex: any, i: number) => (
                                <div key={i} className="p-3 rounded-xl bg-[#F7F5F0] dark:bg-white/[0.04]">
                                  <div className="font-arabic text-2xl text-right" dir="rtl">
                                    {ex.arabic}
                                  </div>
                                  <div className="font-bold mt-1">{ex.readingUz}</div>
                                  <div className="text-[11px] opacity-80">{ex.ruleNoteUz}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2">
                      {locked ? (
                        <button
                          type="button"
                          onClick={onOpenPremium}
                          className="w-full py-2.5 rounded-xl bg-[#C8A85E] text-[#050C09] font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Premium bilan ochish</span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setActiveLesson(activeLesson?.id === ls.id ? null : ls)}
                            className="px-4 py-2 rounded-xl bg-[#064E3B] dark:bg-[#10B981] text-white dark:text-[#04120D] font-bold text-xs cursor-pointer"
                          >
                            {activeLesson?.id === ls.id ? 'Darsni yopish' : 'Darsni oʻqish'}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleCompletedLesson(ls.id)}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                              completed
                                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300'
                                : 'bg-[#064E3B]/10 dark:bg-white/10'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{completed ? 'Tugatilgan' : 'Tugatdim'}</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 5C. INTERACTIVE TAJWEED & QURAN QUIZ */}
          {eduSubTab === 'quiz' && (
            <div className="space-y-4">
              {quizzes.map((q, idx) => (
                <div key={q.id} className="p-5 rounded-3xl az-liquid-glass border border-[#064E3B]/12 dark:border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-[#5F776F] dark:text-[#8FA69D]">
                    <span>Savol #{idx + 1} · {q.category}</span>
                    <span className="uppercase">{q.difficulty}</span>
                  </div>
                  <div className="font-bold text-sm text-[#091813] dark:text-[#F7F4EC]">{q.questionUz}</div>
                  {q.arabicPrompt && (
                    <div className="font-arabic text-2xl text-right text-[#8A6B2D] dark:text-[#C8A85E]" dir="rtl">
                      {q.arabicPrompt}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.optionsUz.map((opt: string, optIdx: number) => {
                      const picked = quizAnswers[q.id] === optIdx;
                      const isCorrect = quizSubmitted && optIdx === q.correctIndex;
                      const isWrong = quizSubmitted && picked && optIdx !== q.correctIndex;
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          disabled={quizSubmitted}
                          onClick={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: optIdx }))}
                          className={`p-3 rounded-xl border text-left text-xs font-medium cursor-pointer transition-colors ${
                            isCorrect
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-200 font-bold'
                              : isWrong
                              ? 'bg-rose-500/20 border-rose-500 text-rose-700 dark:text-rose-200'
                              : picked
                              ? 'bg-[#064E3B] text-white border-[#064E3B]'
                              : 'bg-[#F7F5F0] dark:bg-white/[0.04] border-[#064E3B]/12 dark:border-white/10'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {quizSubmitted && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 text-xs text-[#091813] dark:text-[#E5ECE9]">
                      <strong>Izoh:</strong> {q.explanationUz} <span className="opacity-70">({q.sourceRef})</span>
                    </div>
                  )}
                </div>
              ))}
              <div className="flex items-center gap-3">
                {!quizSubmitted ? (
                  <button
                    type="button"
                    onClick={handleSubmitEduQuiz}
                    className="px-6 py-3 rounded-xl bg-[#064E3B] dark:bg-[#10B981] text-white dark:text-[#04120D] font-bold text-xs cursor-pointer"
                  >
                    Natijani Tekshirish
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setQuizAnswers({});
                      setQuizSubmitted(false);
                    }}
                    className="px-6 py-3 rounded-xl bg-[#064E3B]/15 dark:bg-white/10 font-bold text-xs cursor-pointer"
                  >
                    Qayta yechish
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 6: HIFZ & MUROJA'A (SPACED REPETITION + PERSONAL PROFILE) */}
      {section === 'hifz' && (
        <div className="space-y-5">
          <div className="rounded-3xl az-liquid-glass p-5 border border-[#064E3B]/12 dark:border-white/10 space-y-4">
            <h3 className="font-bold text-base text-[#091813] dark:text-[#F7F4EC] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C8A85E]" />
              <span>Yangi Hifz (Yodlash) Oraligʻi Qoʻshish</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <select
                value={hifzSurah}
                onChange={(e) => setHifzSurah(Number(e.target.value))}
                className="px-3 py-2.5 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs"
              >
                {SURAHS_LIST.map((s) => (
                  <option key={s.number} value={s.number}>
                    {s.number}. {s.nameUz} ({s.numberOfAyahs} oyat)
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={hifzStart}
                onChange={(e) => setHifzStart(Number(e.target.value))}
                placeholder="Boshlanish oyat"
                className="px-3 py-2.5 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs"
              />
              <input
                type="number"
                min={1}
                value={hifzEnd}
                onChange={(e) => setHifzEnd(Number(e.target.value))}
                placeholder="Tugash oyat"
                className="px-3 py-2.5 rounded-xl bg-[#F7F5F0] dark:bg-[#0D1915] border border-[#064E3B]/15 dark:border-white/10 text-xs"
              />
              <button
                type="button"
                onClick={handleAddHifzRange}
                className="px-4 py-2.5 rounded-xl bg-[#064E3B] dark:bg-[#10B981] text-white dark:text-[#04120D] font-bold text-xs cursor-pointer"
              >
                Hifzga Qoʻshish
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(profile?.hifzRanges || []).length === 0 ? (
              <div className="md:col-span-2 p-8 rounded-3xl az-liquid-glass text-center text-xs text-[#5F776F] dark:text-[#8FA69D]">
                Hali yodlangan oyat oraligʻi qoʻshilmagan. Yuqoridan sura va oyat oraligʻini qoʻshing — tizim avtomatik 1/3/7/16/35 kunlik Murojaʼa jadvalini tuzadi.
              </div>
            ) : (
              (profile?.hifzRanges || []).map((r: any) => {
                const surah = SURAHS_LIST.find((s) => s.number === r.surahNumber);
                return (
                  <div
                    key={r.id}
                    className="p-4 rounded-2xl az-liquid-glass border border-[#064E3B]/12 dark:border-white/10 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-sm text-[#091813] dark:text-[#F7F4EC]">
                          {r.surahNumber}. {surah?.nameUz} ({r.startAyah}–{r.endAyah}-oyatlar)
                        </div>
                        <div className="text-[11px] text-[#5F776F] dark:text-[#8FA69D]">
                          Keyingi murojaʼa: <strong className="font-mono-numbers">{r.nextReviewDate}</strong> · Takror: {r.repeatCount}x
                        </div>
                      </div>
                      <span className="font-mono-numbers text-xs font-extrabold text-[#064E3B] dark:text-emerald-400">
                        {r.masteryPercent}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${r.masteryPercent}%` }} />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleReviewHifzRange(r.id)}
                        className="px-3 py-1.5 rounded-xl bg-[#064E3B] dark:bg-[#10B981] text-white dark:text-[#04120D] text-xs font-bold cursor-pointer"
                      >
                        Murojaʼa qildim (+1 bosqich)
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <PremiumGateModal
        open={Boolean(gateDecision)}
        decision={gateDecision}
        onClose={() => setGateDecision(null)}
        onUpgrade={onOpenPremium}
      />
    </div>
  );
};
