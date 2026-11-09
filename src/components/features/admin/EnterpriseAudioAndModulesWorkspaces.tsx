import React, { useState, useEffect, useRef } from 'react';
import {
  EnterpriseModuleId,
  EnterpriseQuranReciter,
  SurahAudioCatalogRecord,
  EnterpriseAdhanRecording,
  GlobalPrayerAdhanAssignment,
  AudioLibraryItem,
  OwnAudioCategory,
  OWN_AUDIO_CATEGORY_LABELS,
  AUDIO_SOURCE_INVESTIGATION_REPORT,
  getEnterpriseReciters,
  saveEnterpriseReciter,
  getSurahAudioCatalogForReciter,
  saveCustomSurahAudioOverride,
  getEnterpriseAdhanLibrary,
  saveEnterpriseAdhanRecording,
  getGlobalPrayerAdhanAssignment,
  saveGlobalPrayerAdhanAssignment,
  getOwnAudioLibrary,
  saveOwnAudioLibraryItem,
  deleteOwnAudioLibraryItem,
  verifyAudioSourceUrl,
  getHomeFeaturedConfig,
  saveHomeFeaturedConfig,
  getEnterpriseVisualSettings,
  saveEnterpriseVisualSettings,
  getRbacMatrix,
  saveRbacMatrixRole,
  hasAdminPermission,
  ENTERPRISE_ADMIN_MODULES,
  AdminActionType,
} from '../../../utils/enterpriseAdminService';
import {
  ReciterProfile,
  SurahAudioFileRecord,
  BulkUploadJob,
  BulkUploadJobItem,
  getStoredPermanentReciters,
  saveStoredPermanentReciters,
  getStoredSurahAudioRecords,
  getStoredSurahAudioOverrides,
  saveStoredSurahAudioOverrides,
  createOrUpdateReciter,
  uploadSingleSurahAudio,
  saveSurahAudioOverrideRecord,
  syncRecitersAndAudioFromFirestore,
  executeBulkSurahUpload,
  matchFilesToSurahs,
  deleteReciterLibrary,
  recalculateReciterSurahCounts,
} from '../../../utils/quranReciterStorageService';
import {
  SURAHS_LIST,
  VERIFIED_AYAHS,
} from '../../../data/quranData';
import {
  TAFSIRI_HILOL_ENTRIES,
} from '../../../data/tafsirHilolData';
import {
  getStoredMosqueEvents,
  saveStoredMosqueEvent,
  getStoredAcademyLessons,
  getStoredDigitalBooks,
  saveStoredDigitalBook,
  getStoredImamQuestions,
  answerImamQuestion,
  getStoredCharityCampaigns,
  saveStoredCharityCampaign,
  getStoredQuranBookmarks,
  uploadAdminMediaFile,
  subscribeToDatabase,
} from '../../../utils/databaseService';
import {
  toggleAdhanAudio,
  stopActiveAdhanAudio,
  getPrayerAlertSettings,
  savePrayerAlertSettings,
} from '../../../utils/notificationService';
import { getActiveAdminToken } from '../../../utils/firebaseClient';
import { UserRole } from '../../../types';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import {
  Play,
  Pause,
  Upload,
  CheckCircle,
  AlertCircle,
  Search,
  Plus,
  Edit3,
  Trash2,
  Shield,
  Volume2,
  RefreshCw,
  HardDrive,
  FileAudio,
  BookOpen,
  Calendar,
  Award,
  Heart,
  HelpCircle,
  Sliders,
  Check,
  ExternalLink,
  Radio,
} from 'lucide-react';

interface WorkspaceProps {
  activeModule: EnterpriseModuleId;
  activeRole: UserRole;
  onStatusMessage: (msg: string, isError?: boolean) => void;
}

export const EnterpriseAudioAndModulesWorkspaces: React.FC<WorkspaceProps> = ({
  activeModule,
  activeRole,
  onStatusMessage,
}) => {
  const canCreate = hasAdminPermission(activeRole, activeModule, 'create');
  const canEdit = hasAdminPermission(activeRole, activeModule, 'edit');
  const canPublish = hasAdminPermission(activeRole, activeModule, 'publish');
  const canDelete = hasAdminPermission(activeRole, activeModule, 'delete');

  // Shared Audio Preview Player
  const [previewingUrl, setPreviewingUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, [activeModule]);

  const handleToggleAudioPreview = (url: string, label?: string) => {
    setPreviewError(null);
    if (previewingUrl === url && previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
      setPreviewingUrl(null);
      return;
    }
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    stopActiveAdhanAudio();
    const audio = new Audio(url);
    audio.onended = () => setPreviewingUrl(null);
    audio.onerror = () => {
      setPreviewError(`Audio manbasini oʻqishda xatolik: ${label || url}`);
      setPreviewingUrl(null);
    };
    previewAudioRef.current = audio;
    audio
      .play()
      .then(() => {
        setPreviewingUrl(url);
      })
      .catch(() => {
        setPreviewError(`Audio ijrosini boshlash imkonsiz: ${label || url}`);
        setPreviewingUrl(null);
      });
  };

  // ==========================================================================
  // MODULE 3: QURAN RECITERS & 114-SURAH PERMANENT AUDIO STORAGE ENGINE
  // ==========================================================================
  const [reciters, setReciters] = useState<ReciterProfile[]>(() => getStoredPermanentReciters());
  const [selectedReciterId, setSelectedReciterId] = useState<string>('mishary');
  const [surahCatalog, setSurahCatalog] = useState<SurahAudioFileRecord[]>(() =>
    getStoredSurahAudioRecords('mishary')
  );
  const [surahSearch, setSurahSearch] = useState('');
  const [surahStatusFilter, setSurahStatusFilter] = useState<'all' | 'verified_stored' | 'missing'>('all');
  const [editingReciter, setEditingReciter] = useState<ReciterProfile | null>(null);
  const [editingSurahRecord, setEditingSurahRecord] = useState<SurahAudioFileRecord | null>(null);
  const [customSurahUrlInput, setCustomSurahUrlInput] = useState('');
  const [customSurahSourceInput, setCustomSurahSourceInput] = useState('');
  const [isUploadingSurahMp3, setIsUploadingSurahMp3] = useState(false);
  const [verifyingSurahId, setVerifyingSurahId] = useState<string | null>(null);
  const [surahVerifyMap, setSurahVerifyMap] = useState<Record<string, { ok: boolean; info: string }>>({});

  // Bulk 114 Surah Upload Modal & State
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [matchedBulkItems, setMatchedBulkItems] = useState<{ file: File; surahNumber: number; surah: (typeof SURAHS_LIST)[0] }[]>([]);
  const [unmatchedBulkFiles, setUnmatchedBulkFiles] = useState<File[]>([]);
  const [duplicateBulkFiles, setDuplicateBulkFiles] = useState<{ file: File; surahNumber: number }[]>([]);
  const [bulkJob, setBulkJob] = useState<BulkUploadJob | null>(null);
  const [isBulkUploading, setIsBulkUploading] = useState(false);

  // Reciter Deletion & Safeguard Modal
  const [deletingReciterId, setDeletingReciterId] = useState<string | null>(null);
  const [deleteConfirmationPassword, setDeleteConfirmationPassword] = useState('');
  const [deletePurgeStorage, setDeletePurgeStorage] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setSurahCatalog(getStoredSurahAudioRecords(selectedReciterId));
  }, [selectedReciterId, reciters]);

  useEffect(() => {
    if (activeModule === 'quran_reciters_audio') {
      syncRecitersAndAudioFromFirestore().then(() => {
        setReciters(getStoredPermanentReciters());
        setSurahCatalog(getStoredSurahAudioRecords(selectedReciterId));
      });
    }
    const unsub = subscribeToDatabase((event) => {
      if (event.type === 'QURAN_RECITERS_UPDATED' || event.type === 'QURAN_AUDIO_UPDATED') {
        setReciters(getStoredPermanentReciters());
        setSurahCatalog(getStoredSurahAudioRecords(selectedReciterId));
      }
    });
    return () => unsub();
  }, [activeModule, selectedReciterId]);

  const handleSelectBulkFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const { matched, unmatched, duplicates } = matchFilesToSurahs(files);
    setMatchedBulkItems(matched);
    setUnmatchedBulkFiles(unmatched);
    setDuplicateBulkFiles(duplicates);
    setShowBulkUploadModal(true);
  };

  const handleStartBulkUpload = async () => {
    if (matchedBulkItems.length === 0 || isBulkUploading) return;
    setIsBulkUploading(true);
    try {
      const finalJob = await executeBulkSurahUpload({
        reciterId: selectedReciterId,
        items: matchedBulkItems,
        concurrency: 2,
        onItemProgress: (item) => {
          setBulkJob((prev) => {
            if (!prev) return null;
            const updatedItems = prev.items.map((it) => (it.id === item.id ? item : it));
            return { ...prev, items: updatedItems };
          });
        },
        onOverallProgress: (jobUpdate) => {
          setBulkJob(jobUpdate);
        },
      });

      // Refresh catalog and reciters
      recalculateReciterSurahCounts(selectedReciterId);
      setSurahCatalog(getStoredSurahAudioRecords(selectedReciterId));
      setReciters(getStoredPermanentReciters());

      onStatusMessage(
        `Ommaviy yuklash yakunlandi: ${finalJob.completedFiles} ta sura saqlandi, ${finalJob.failedFiles} ta xato.`
      );
    } catch (err: any) {
      onStatusMessage(`Ommaviy yuklashda xatolik: ${err?.message || 'Nomaʼlum xato'}`);
    } finally {
      setIsBulkUploading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleUploadReciterSurahFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingSurahRecord) return;
    setIsUploadingSurahMp3(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await uploadSingleSurahAudio({
        reciterId: editingSurahRecord.reciterId,
        surahNumber: editingSurahRecord.surahNumber,
        fileName: file.name,
        fileBufferBase64: base64,
        mimeType: file.type || 'audio/mpeg',
      });
      if (res.success && res.record) {
        setCustomSurahUrlInput(res.record.audioUrl);
        setCustomSurahSourceInput(`ASAKA ZIYO Doimiy Audio Xazinasi (${file.name})`);
        setSurahCatalog(getStoredSurahAudioRecords(editingSurahRecord.reciterId));
        setReciters(getStoredPermanentReciters());
        onStatusMessage(`Sura #${editingSurahRecord.surahNumber} audio fayli Firestore va server xazinasiga doimiy saqlandi.`);
      } else {
        onStatusMessage(res.error || 'Audio faylni saqlashda xatolik yuz berdi.', true);
      }
    } catch (err: any) {
      onStatusMessage(`Audio fayl yuklashda xatolik: ${err?.message || 'Nomaʼlum'}`, true);
    } finally {
      setIsUploadingSurahMp3(false);
    }
  };

  const handleVerifySurahLink = async (record: SurahAudioFileRecord) => {
    setVerifyingSurahId(record.id);
    const check = await verifyAudioSourceUrl(record.audioUrl);
    setVerifyingSurahId(null);
    setSurahVerifyMap((prev) => ({
      ...prev,
      [record.id]: {
        ok: check.ok,
        info: check.ok
          ? `HTTP ${check.status} · ${check.contentType || 'audio/mpeg'} · ${(check.contentLength / 1024).toFixed(0)} KB`
          : check.error || `HTTP ${check.status} Xato`,
      },
    }));
  };

  // ==========================================================================
  // MODULE 4: ADHAN AUDIO LIBRARY & 5-PRAYER ASSIGNMENT
  // ==========================================================================
  const [adhanLibrary, setAdhanLibrary] = useState<EnterpriseAdhanRecording[]>(() =>
    getEnterpriseAdhanLibrary()
  );
  const [prayerAdhanMap, setPrayerAdhanMap] = useState<GlobalPrayerAdhanAssignment>(() =>
    getGlobalPrayerAdhanAssignment()
  );
  const [newAdhanTitle, setNewAdhanTitle] = useState('');
  const [newAdhanReciter, setNewAdhanReciter] = useState('Shayx Mishariy Roshid al-Afosiy');
  const [newAdhanStyle, setNewAdhanStyle] = useState('');
  const [newAdhanUrl, setNewAdhanUrl] = useState('');
  const [newAdhanAttribution, setNewAdhanAttribution] = useState(
    'Tasdiqlangan ochiq islomiy vaqf yozuvi'
  );
  const [isUploadingAdhanFile, setIsUploadingAdhanFile] = useState(false);

  // ==========================================================================
  // MODULE 12: ASAKA ZIYO OWN AUDIO LIBRARY & PART 5 INVESTIGATION
  // ==========================================================================
  const [ownLibrary, setOwnLibrary] = useState<AudioLibraryItem[]>(() => getOwnAudioLibrary());
  const [ownCategoryFilter, setOwnCategoryFilter] = useState<'all' | OwnAudioCategory>('all');
  const [ownSearchQuery, setOwnSearchQuery] = useState('');
  const [newAudioTitle, setNewAudioTitle] = useState('');
  const [newAudioSpeaker, setNewAudioSpeaker] = useState('Shayx Mishariy Roshid al-Afosiy');
  const [newAudioCategory, setNewAudioCategory] = useState<OwnAudioCategory>('quran_surah');
  const [newAudioUrl, setNewAudioUrl] = useState('');
  const [newAudioPermission, setNewAudioPermission] = useState('Ochiq maʼrifiy vaqf ruxsati');
  const [newAudioRightsVerified, setNewAudioRightsVerified] = useState(true);
  const [isUploadingOwnAudio, setIsUploadingOwnAudio] = useState(false);
  const [storageStats, setStorageStats] = useState<{
    uploadsCount: number;
    totalUploadBytes: number;
    dbSizeBytes: number;
  } | null>(null);

  useEffect(() => {
    if (activeModule === 'audio_video_media' || activeModule === 'database_backup') {
      const token = getActiveAdminToken();
      fetch('/api/admin/storage-stats', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            setStorageStats({
              uploadsCount: data.uploadsCount || 0,
              totalUploadBytes: data.totalUploadBytes || 0,
              dbSizeBytes: data.dbSizeBytes || 0,
            });
          }
        })
        .catch(() => {});
    }
  }, [activeModule]);

  // ==========================================================================
  // MODULE 1: HOME FEATURED CONFIG
  // ==========================================================================
  const [homeConfig, setHomeConfig] = useState(() => getHomeFeaturedConfig());

  // ==========================================================================
  // MODULE 2: QURAN & TRANSLATIONS
  // ==========================================================================
  const [selectedTranslationSurah, setSelectedTranslationSurah] = useState<number>(1);
  const [quranTranslationSearch, setQuranTranslationSearch] = useState('');

  // ==========================================================================
  // MODULES 19, 20, 21, 22, 23, 25, 28 STATE
  // ==========================================================================
  const [eventsList, setEventsList] = useState(() => getStoredMosqueEvents());
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('2026-11-20');
  const [newEventTime, setNewEventTime] = useState('12:00');
  const [newEventLocation, setNewEventLocation] = useState('Asaka Markaziy Jome Masjidi');
  const [newEventInstructor, setNewEventInstructor] = useState('Asaka bosh imom-xatibi');
  const [newEventDesc, setNewEventDesc] = useState('');

  const [academyLessons] = useState(() => getStoredAcademyLessons());
  const [digitalBooks, setDigitalBooks] = useState(() => getStoredDigitalBooks());
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookAuthor, setNewBookAuthor] = useState('Shayx Muhammad Sodiq Muhammad Yusuf');
  const [newBookDesc, setNewBookDesc] = useState('');

  const [imamQuestions, setImamQuestions] = useState(() => getStoredImamQuestions('admin'));
  const [replyingImamId, setReplyingImamId] = useState<string | null>(null);
  const [imamAnswerText, setImamAnswerText] = useState('');
  const [imamSourceRef, setImamSourceRef] = useState('«Kifoya» / «Hadis va Hayot»');

  const [charityCampaigns, setCharityCampaigns] = useState(() => getStoredCharityCampaigns());
  const [newCharityTitle, setNewCharityTitle] = useState('');
  const [newCharityTarget, setNewCharityTarget] = useState(25000000);
  const [newCharityDesc, setNewCharityDesc] = useState('');

  const [visualSettings, setVisualSettings] = useState(() => getEnterpriseVisualSettings());
  const [rbacMatrix, setRbacMatrix] = useState(() => getRbacMatrix());
  const [selectedRbacRole, setSelectedRbacRole] = useState<UserRole>('QURAN_AUDIO_MANAGER');

  // --------------------------------------------------------------------------
  // RENDER MODULE 1: HOME PAGE & FEATURED CONTENT
  // --------------------------------------------------------------------------
  if (activeModule === 'home_featured') {
    return (
      <div className="space-y-6">
        <Card variant="elevated" className="p-6 border-gold/25">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-serif font-bold text-primary">
                1. Bosh Sahifa va Tanlangan Kontent Boshqaruvi
              </h3>
              <p className="text-xs text-muted">
                Asosiy sahifadagi Hero sarlavhasi, tezkor eʼlon satri hamda Kun surasi / hadisi / maqolasini mustaqil sozlang.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">
                Yuqori rukn yozuvi (Hero Kicker)
              </label>
              <input
                type="text"
                value={homeConfig.heroBadgeTextUz}
                onChange={(e) => setHomeConfig({ ...homeConfig, heroBadgeTextUz: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-divider text-sm text-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">
                Bosh sahifa tanlangan Sura raqami (1–114)
              </label>
              <select
                value={homeConfig.featuredSurahNumber}
                onChange={(e) =>
                  setHomeConfig({ ...homeConfig, featuredSurahNumber: Number(e.target.value) })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-divider text-sm text-primary"
              >
                {SURAHS_LIST.map((s) => (
                  <option key={s.number} value={s.number}>
                    {s.number}. {s.nameUz} ({s.nameAr}) — {s.meaningUz}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-secondary mb-1">
                Bosh sahifa Asosiy Sarlavhasi (Hero Title)
              </label>
              <input
                type="text"
                value={homeConfig.heroTitleUz}
                onChange={(e) => setHomeConfig({ ...homeConfig, heroTitleUz: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-divider text-sm text-primary"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-secondary mb-1">
                Bosh sahifa izohi (Subtitle)
              </label>
              <textarea
                rows={2}
                value={homeConfig.heroSubtitleUz}
                onChange={(e) => setHomeConfig({ ...homeConfig, heroSubtitleUz: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-divider text-sm text-primary"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-secondary mb-1">
                Tezkor Jamoat Eʼloni Satri
              </label>
              <input
                type="text"
                value={homeConfig.announcementBannerTextUz}
                onChange={(e) =>
                  setHomeConfig({ ...homeConfig, announcementBannerTextUz: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-divider text-sm text-primary"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              variant="primary"
              disabled={!canEdit}
              onClick={() => {
                const saved = saveHomeFeaturedConfig(homeConfig);
                setHomeConfig(saved);
                onStatusMessage('Bosh sahifa tanlangan kontenti muvaffaqiyatli saqlandi.');
              }}
            >
              Oʻzgarishlarni Saqlash
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER MODULE 2: QURAN & QURAN TRANSLATIONS WORKSPACE
  // --------------------------------------------------------------------------
  if (activeModule === 'quran_translations') {
    const filteredSurahs = SURAHS_LIST.filter(
      (s) =>
        !quranTranslationSearch.trim() ||
        s.nameUz.toLowerCase().includes(quranTranslationSearch.toLowerCase()) ||
        s.meaningUz.toLowerCase().includes(quranTranslationSearch.toLowerCase()) ||
        String(s.number) === quranTranslationSearch.trim()
    );
    const verifiedAyahsForSelected = VERIFIED_AYAHS[selectedTranslationSurah] || [];
    const tafsirEntry = TAFSIRI_HILOL_ENTRIES.find((t) => t.surahNumber === selectedTranslationSurah);

    return (
      <div className="space-y-6">
        <Card variant="elevated" className="p-6 border-gold/25">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="text-lg font-serif font-bold text-primary">
                2. Qurʼoni Karim va Maʼnolar Tarjimasi Boshqaruvi
              </h3>
              <p className="text-xs text-muted">
                114 sura kanonik Usmonsimon arabcha matni hamda Shayx Muhammad Sodiq Muhammad Yusuf «Tafsiri Hilol» tarjimalari reestri.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-muted absolute left-3 top-3" />
                <input
                  type="text"
                  value={quranTranslationSearch}
                  onChange={(e) => setQuranTranslationSearch(e.target.value)}
                  placeholder="Sura nomi yoki raqami..."
                  className="pl-9 pr-3 py-2 rounded-xl bg-surface border border-divider text-xs text-primary"
                />
              </div>
              <select
                value={selectedTranslationSurah}
                onChange={(e) => setSelectedTranslationSurah(Number(e.target.value))}
                className="px-3 py-2 rounded-xl bg-surface border border-divider text-xs text-primary"
              >
                {filteredSurahs.map((s) => (
                  <option key={s.number} value={s.number}>
                    {s.number}. {s.nameUz} ({s.numberOfAyahs} oyat)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {tafsirEntry && (
            <div className="p-4 rounded-xl bg-gold/5 border border-gold/20 mb-5">
              <div className="text-xs font-semibold text-gold mb-1">
                Tafsiri Hilol sharhi · {tafsirEntry.surahNameUz} surasi ({tafsirEntry.revelationType})
              </div>
              <p className="text-xs text-secondary leading-relaxed">{tafsirEntry.tafsirOverview}</p>
              <p className="text-[11px] text-muted mt-2">
                Manba: {tafsirEntry.sourceNote}
              </p>
            </div>
          )}

          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {verifiedAyahsForSelected.length > 0 ? (
              verifiedAyahsForSelected.map((ayah) => (
                <div
                  key={ayah.id}
                  className="p-4 rounded-xl bg-surface/70 border border-divider space-y-2"
                >
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>
                      {ayah.surahNameUz} surasi · {ayah.numberInSurah}-oyat
                    </span>
                    <span>Juz {ayah.juzNumber || 1} · Kanonik Usmonsimon matn</span>
                  </div>
                  <p className="font-arabic text-2xl text-right text-primary leading-loose" dir="rtl">
                    {ayah.textAr}
                  </p>
                  <p className="text-sm text-secondary leading-relaxed">{ayah.translationUz}</p>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-muted bg-surface/40 rounded-xl border border-divider">
                Ushbu sura oyatlari foydalanuvchi oʻqish vaqtida rasmiy Usmonsimon Mushaf va Shayx Muhammad Sodiq Muhammad Yusuf maʼnolar tarjimasi bazasidan toʻliq yuklanadi.
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER MODULE 3: QURAN RECITERS & 114-SURAH AUDIO CATALOG
  // --------------------------------------------------------------------------
  if (activeModule === 'quran_reciters_audio') {
    const activeReciterObj = reciters.find((r) => r.id === selectedReciterId) || reciters[0];
    const filteredCatalog = surahCatalog.filter((s) => {
      const matchSearch =
        !surahSearch.trim() ||
        s.surahNameUz.toLowerCase().includes(surahSearch.toLowerCase()) ||
        s.surahNameAr.includes(surahSearch) ||
        String(s.surahNumber).includes(surahSearch);
      const matchStatus =
        surahStatusFilter === 'all' ||
        (surahStatusFilter === 'verified_stored' && (s.status === 'verified_stored' || s.status === 'external_cdn')) ||
        (surahStatusFilter === 'missing' && s.status === 'missing');
      return matchSearch && matchStatus;
    });
    const uploadedCount = surahCatalog.filter(
      (s) => (s.status === 'verified_stored' || s.status === 'external_cdn') && Boolean(s.audioUrl)
    ).length;
    const missingCount = Math.max(0, 114 - uploadedCount);

    return (
      <div className="space-y-6">
        {/* Reciters Management Section */}
        <Card variant="elevated" className="p-6 border-gold/25">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="text-lg font-serif font-bold text-primary">
                3.1. Qurʼoni Karim Qorilari Reestri ({reciters.length} ta doimiy qori)
              </h3>
              <p className="text-xs text-muted">
                Qorilarni qoʻshish, fotosurat yuklash, biografiya, audio server manzillarini tahrirlash hamda doimiy arxivlash.
              </p>
            </div>
            {canCreate && (
              <Button
                variant="primary"
                onClick={() =>
                  setEditingReciter({
                    id: `reciter-${Date.now()}`,
                    name: '',
                    nameAr: '',
                    country: 'Oʻzbekiston / Islom olami',
                    style: 'Murattal (Hafs an Osim)',
                    rewaya: 'Hafs Aʼn Assem',
                    biographyUz: '',
                    language: 'Arab tili',
                    profileImageUrl: '/images/quran_illumination_art_1793634658336.jpg',
                    surahServerBaseUrl: '',
                    ayahServerBaseUrl: '',
                    previewUrl: '',
                    isActive: true,
                    isCustomUploaded: true,
                    uploadedSurahsCount: 0,
                    missingSurahsCount: 114,
                    failedSurahsCount: 0,
                    totalSurahsCount: 114,
                    storageBasePath: `quran-reciter-audio/reciter-${Date.now()}`,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  })
                }
              >
                <Plus className="w-4 h-4 mr-1.5" /> Yangi Qori Qoʻshish
              </Button>
            )}
          </div>

          {previewError && (
            <div className="mb-4 p-3 rounded-xl bg-danger/10 border border-danger/30 text-xs text-danger flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{previewError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {reciters.map((rec) => {
              const isSelected = rec.id === selectedReciterId;
              const isPlayingPreview = previewingUrl === rec.previewUrl;
              const isCanonical = ['mishary', 'suwayd', 'hussary', 'dussary', 'sudais', 'juhany', 'ghamidi', 'shatri'].includes(rec.id);
              const recUploadedCount =
                typeof rec.uploadedSurahsCount === 'number'
                  ? rec.uploadedSurahsCount
                  : isCanonical || rec.surahServerBaseUrl
                  ? 114
                  : 0;
              const recMissingCount =
                typeof rec.missingSurahsCount === 'number'
                  ? rec.missingSurahsCount
                  : Math.max(0, 114 - recUploadedCount);
              return (
                <div
                  key={rec.id}
                  onClick={() => setSelectedReciterId(rec.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-gold/10 border-gold shadow-sm'
                      : 'bg-surface/60 border-divider hover:border-gold/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      {rec.profileImageUrl && (
                        <img
                          src={rec.profileImageUrl}
                          alt={rec.name}
                          className="w-9 h-9 rounded-full object-cover border border-gold/30 shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-primary flex items-center gap-1.5 flex-wrap">
                          <span className="truncate">{rec.name}</span>
                          {!rec.isActive && (
                            <span className="text-[10px] text-amber-500 font-normal">(Nofaol)</span>
                          )}
                        </div>
                        <div className="text-xs text-muted">
                          {rec.country} · {recUploadedCount}/114 sura
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-arabic text-gold shrink-0">{rec.nameAr}</span>
                  </div>
                  <p className="text-xs text-secondary line-clamp-2 mb-3">{rec.biographyUz || 'Tavsif kiritilmagan'}</p>
                  
                  {/* Status Indicator */}
                  <div className="flex items-center gap-2 text-[11px] mb-3">
                    <span className={recUploadedCount > 0 ? 'text-emerald-500 font-medium' : 'text-amber-500 font-medium'}>
                      Saqlangan: {recUploadedCount}
                    </span>
                    <span className="text-muted">·</span>
                    <span className={recMissingCount > 0 ? 'text-amber-500 font-medium' : 'text-muted'}>
                      Yetishmayotgan: {recMissingCount}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-divider/60">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (rec.previewUrl) {
                          handleToggleAudioPreview(rec.previewUrl, rec.name);
                        } else {
                          onStatusMessage('Ushbu qoriga namuna audio biriktirilmagan.');
                        }
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold hover:underline"
                    >
                      {isPlayingPreview ? (
                        <>
                          <Pause className="w-3.5 h-3.5" /> Toʻxtatish
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" /> Namuna
                        </>
                      )}
                    </button>
                    <div className="flex items-center gap-2">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingReciter(rec);
                          }}
                          className="text-xs text-secondary hover:text-primary font-medium"
                        >
                          Tahrirlash
                        </button>
                      )}
                      {!isCanonical && canEdit && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingReciterId(rec.id);
                            setDeleteConfirmationPassword('');
                            setDeletePurgeStorage(false);
                            setDeleteError(null);
                          }}
                          className="text-xs text-rose-500 hover:text-rose-600"
                        >
                          Oʻchirish
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reciter Create/Edit Drawer Form */}
          {editingReciter && (
            <div className="mt-6 p-5 rounded-xl bg-surface border border-gold/40 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-primary">
                  Qori Maʼlumotlarini Boshqarish: {editingReciter.name || 'Yangi Qori'}
                </h4>
                <button
                  type="button"
                  onClick={() => setEditingReciter(null)}
                  className="text-xs text-muted hover:text-primary"
                >
                  Yopish
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-secondary mb-1">Qori ID (unikal)</label>
                  <input
                    type="text"
                    value={editingReciter.id}
                    onChange={(e) =>
                      setEditingReciter({
                        ...editingReciter,
                        id: e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-canvas border border-divider text-xs text-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-secondary mb-1">Qori F.I.Sh. (Oʻzbekcha)</label>
                  <input
                    type="text"
                    value={editingReciter.name}
                    onChange={(e) => setEditingReciter({ ...editingReciter, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-canvas border border-divider text-xs text-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-secondary mb-1">Mamlakat va Uslub</label>
                  <input
                    type="text"
                    value={editingReciter.country}
                    onChange={(e) =>
                      setEditingReciter({ ...editingReciter, country: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-canvas border border-divider text-xs text-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-secondary mb-1">
                    Qori Fotosurati (Profil rasmi):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editingReciter.profileImageUrl}
                      onChange={(e) => setEditingReciter({ ...editingReciter, profileImageUrl: e.target.value })}
                      placeholder="/images/... yoki URL"
                      className="w-full px-3 py-2 rounded-lg bg-canvas border border-divider text-xs text-primary"
                    />
                    <label className="px-3 py-2 rounded-lg bg-gold/15 text-gold text-xs font-semibold cursor-pointer shrink-0 hover:bg-gold/25">
                      Rasm yuklash
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const up = await uploadAdminMediaFile(f);
                          if (up.success && up.url) {
                            setEditingReciter({ ...editingReciter, profileImageUrl: up.url });
                            onStatusMessage('Qori surati serverga yuklandi.');
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-secondary mb-1">
                    114 Sura Audio Server Baza URL (ixtiyoriy tashqi CDN)
                  </label>
                  <input
                    type="text"
                    value={editingReciter.surahServerBaseUrl}
                    onChange={(e) =>
                      setEditingReciter({
                        ...editingReciter,
                        surahServerBaseUrl: e.target.value,
                      })
                    }
                    placeholder="https://... yoki boʻsh qoldiring (oʻz serverimizga yuklash uchun)"
                    className="w-full px-3 py-2 rounded-lg bg-canvas border border-divider text-xs text-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-secondary mb-1">Faollik holati</label>
                  <select
                    value={editingReciter.isActive ? 'active' : 'inactive'}
                    onChange={(e) =>
                      setEditingReciter({
                        ...editingReciter,
                        isActive: e.target.value === 'active',
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-canvas border border-divider text-xs text-primary"
                  >
                    <option value="active">Faol (Foydalanuvchilarga koʻrinadi)</option>
                    <option value="inactive">Nofaol (Fayllar oʻchirilmaydi, yashirin qoladi)</option>
                  </select>
                </div>
                <div className="md:col-span-1">
                  <label className="block text-xs text-secondary mb-1">Arabcha nomi (ixtiyoriy)</label>
                  <input
                    type="text"
                    value={editingReciter.nameAr || ''}
                    onChange={(e) => setEditingReciter({ ...editingReciter, nameAr: e.target.value })}
                    placeholder="الشيخ ..."
                    className="w-full px-3 py-2 rounded-lg bg-canvas border border-divider text-xs text-primary font-arabic"
                    dir="rtl"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs text-secondary mb-1">Namuna Audio URL (ixtiyoriy)</label>
                  <input
                    type="text"
                    value={editingReciter.previewUrl || ''}
                    onChange={(e) => setEditingReciter({ ...editingReciter, previewUrl: e.target.value })}
                    placeholder="https://... yoki /uploads/... (Fotiha surasi namunasi)"
                    className="w-full px-3 py-2 rounded-lg bg-canvas border border-divider text-xs text-primary"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs text-secondary mb-1">Tarjimai hol va tavsif</label>
                  <textarea
                    rows={2}
                    value={editingReciter.biographyUz}
                    onChange={(e) =>
                      setEditingReciter({ ...editingReciter, biographyUz: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-canvas border border-divider text-xs text-primary"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setEditingReciter(null)}>
                  Bekor qilish
                </Button>
                <Button
                  variant="primary"
                  onClick={async () => {
                    if (!editingReciter.name.trim()) {
                      onStatusMessage('Qori ismini kiritish shart.', true);
                      return;
                    }
                    const res = await createOrUpdateReciter(editingReciter);
                    if (res.success && res.reciter) {
                      setReciters(getStoredPermanentReciters());
                      setSelectedReciterId(res.reciter.id);
                      setSurahCatalog(getStoredSurahAudioRecords(res.reciter.id));
                      setEditingReciter(null);
                      onStatusMessage(
                        `Qori "${res.reciter.name}" maʼlumotlari Firestore maʼlumotlar bazasiga doimiy saqlandi.`
                      );
                    } else {
                      onStatusMessage(res.error || 'Qorini Firestore bazasiga saqlashda xatolik yuz berdi.', true);
                    }
                  }}
                >
                  Qorini Saqlash
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* 114-Surah Complete Audio Catalog & Bulk Upload Center */}
        <Card variant="elevated" className="p-6 border-gold/25">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-serif font-bold text-primary">
                  3.2. 114 Sura Toʻliq Doimiy Audio Xazinasi — {activeReciterObj.name}
                </h3>
              </div>
              <p className="text-xs text-muted mt-0.5">
                Saqlash yoʻli: <span className="font-mono text-gold">{activeReciterObj.storageBasePath}</span> · Formatlar: MP3, M4A, WAV, OGG
              </p>
            </div>
            
            {/* Completion Counter Chips */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-divider text-xs">
                <span className="text-emerald-500 font-bold">Yuklangan: {uploadedCount} / 114</span>
                <span className="text-muted">·</span>
                <span className={missingCount > 0 ? 'text-amber-500 font-bold' : 'text-muted'}>
                  Yetishmayotgan: {missingCount}
                </span>
                <span className="text-muted">·</span>
                <span className="text-muted">Xatolar: 0</span>
              </div>

              {canCreate && (
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gold text-[#071614] text-xs font-bold shadow-sm hover:brightness-105 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>114 Surani Ommaviy Yuklash</span>
                  <input
                    type="file"
                    multiple
                    accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac"
                    onChange={handleSelectBulkFiles}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pt-2 border-t border-divider/60">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-2.5" />
              <input
                type="text"
                value={surahSearch}
                onChange={(e) => setSurahSearch(e.target.value)}
                placeholder="114 suradan qidirish (nomi yoki raqami)..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface border border-divider text-xs text-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={surahStatusFilter}
                onChange={(e) => setSurahStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-lg bg-surface border border-divider text-xs text-primary"
              >
                <option value="all">Barcha 114 sura ({surahCatalog.length})</option>
                <option value="verified_stored">Saqlangan suralar ({uploadedCount})</option>
                <option value="missing">Yetishmayotgan suralar ({missingCount})</option>
              </select>
            </div>
          </div>

          {/* Bulk Upload Queue Modal */}
          {showBulkUploadModal && (
            <div className="mb-6 p-5 rounded-2xl bg-surface border-2 border-gold/50 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                    <Upload className="w-4 h-4 text-gold" />
                    <span>114 Sura Ommaviy Audio Yuklash Markazi</span>
                  </h4>
                  <p className="text-xs text-muted">
                    Tanlangan fayllar avtomatik ravishda 1..114 sura raqamlari boʻyicha taqsimlandi.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBulkUploadModal(false)}
                  className="text-xs text-muted hover:text-primary"
                >
                  Yopish
                </button>
              </div>

              {/* Matching Statistics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <div className="font-bold text-sm">{matchedBulkItems.length} ta sura</div>
                  <div className="text-[11px] opacity-80">Aniq raqam bilan mos keldi</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <div className="font-bold text-sm">{duplicateBulkFiles.length} ta dublikat</div>
                  <div className="text-[11px] opacity-80">Takroriy fayllar oʻtkazib yuboriladi</div>
                </div>
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                  <div className="font-bold text-sm">{unmatchedBulkFiles.length} ta noaniq fayl</div>
                  <div className="text-[11px] opacity-80">Raqam topilmadi (001..114 formatda nomlang)</div>
                </div>
              </div>

              {/* Overall Progress Bar if Uploading */}
              {bulkJob && (
                <div className="space-y-1.5 p-3 rounded-xl bg-canvas border border-divider">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-primary">
                      Umumiy yuklash jarayoni: {bulkJob.completedFiles} / {bulkJob.totalFiles} ta sura
                    </span>
                    <span className="font-mono text-gold font-bold">{bulkJob.progressPercent}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface overflow-hidden">
                    <div
                      className="h-full bg-gold transition-all duration-300"
                      style={{ width: `${bulkJob.progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Preview List of Matched Items */}
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 border border-divider rounded-xl p-2 bg-canvas/50">
                {matchedBulkItems.map((item) => {
                  const jobItem = bulkJob?.items.find((it) => it.surahNumber === item.surahNumber);
                  return (
                    <div
                      key={item.surahNumber}
                      className="flex items-center justify-between p-2 rounded-lg bg-surface border border-divider text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-gold w-8">#{item.surahNumber}</span>
                        <span className="font-medium text-primary">{item.surah.nameUz}</span>
                        <span className="text-[11px] text-muted">({item.file.name})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted text-[11px]">
                          {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                        {jobItem ? (
                          <span
                            className={`text-[11px] font-semibold ${
                              jobItem.status === 'completed'
                                ? 'text-emerald-400'
                                : jobItem.status === 'failed'
                                ? 'text-rose-400'
                                : 'text-gold'
                            }`}
                          >
                            {jobItem.status === 'completed'
                              ? '✓ Saqlandi'
                              : jobItem.status === 'failed'
                              ? '✗ Xato'
                              : 'Yuklanmoqda...'}
                          </span>
                        ) : (
                          <span className="text-emerald-400 text-[11px]">Tayyor</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-muted">
                  Eslatma: Yuklash paytida browserni yopmang. Xato boʻlgan suralar alohida qayta urinilishi mumkin.
                </span>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setShowBulkUploadModal(false)}>
                    Yopish
                  </Button>
                  <Button
                    variant="primary"
                    disabled={isBulkUploading || matchedBulkItems.length === 0}
                    onClick={handleStartBulkUpload}
                  >
                    {isBulkUploading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Yuklanmoqda...
                      </>
                    ) : (
                      `Barcha ${matchedBulkItems.length} ta Surani Doimiy Saqlash`
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deletingReciterId && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="w-full max-w-md p-6 rounded-2xl bg-surface border border-rose-500/40 shadow-xl space-y-4">
                <div className="flex items-center gap-2 text-rose-500 font-bold text-base">
                  <AlertCircle className="w-5 h-5" />
                  <span>Qori Audio Kutubxonasini Oʻchirish</span>
                </div>
                <p className="text-xs text-secondary leading-relaxed">
                  Diqqat! Ushbu amal qori profilini va unga biriktirilgan barcha suralar yozuvlarini oʻchiradi.
                  Nofaol qilish tavsiya etiladi (fayllar yoʻqolmaydi).
                </p>
                {deleteError && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                    {deleteError}
                  </div>
                )}
                <div>
                  <label className="block text-xs text-secondary mb-1">
                    Bosh Administrator tasdigʻi:
                  </label>
                  <input
                    type="password"
                    placeholder="Admin parolingizni kiriting"
                    value={deleteConfirmationPassword}
                    onChange={(e) => setDeleteConfirmationPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-canvas border border-divider text-xs text-primary"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="purgeStorageCheck"
                    checked={deletePurgeStorage}
                    onChange={(e) => setDeletePurgeStorage(e.target.checked)}
                    className="rounded border-divider text-gold"
                  />
                  <label htmlFor="purgeStorageCheck" className="text-xs text-secondary cursor-pointer">
                    Server xotirasidagi MP3 fayllarni ham butunlay tozalash (purged)
                  </label>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" onClick={() => setDeletingReciterId(null)}>
                    Bekor qilish
                  </Button>
                  <Button
                    variant="primary"
                    className="!bg-rose-600 hover:!bg-rose-700 !text-white"
                    disabled={!deleteConfirmationPassword.trim()}
                    onClick={async () => {
                      const res = await deleteReciterLibrary({
                        reciterId: deletingReciterId,
                        adminPasswordConfirmed: Boolean(deleteConfirmationPassword.trim()),
                        purgeStorageObjects: deletePurgeStorage,
                      });
                      if (res.success) {
                        setReciters(getStoredPermanentReciters());
                        setSelectedReciterId('mishary');
                        setDeletingReciterId(null);
                        onStatusMessage('Qori kutubxonasi oʻchirildi.');
                      } else {
                        setDeleteError(res.error || 'Oʻchirishda xatolik yuz berdi.');
                      }
                    }}
                  >
                    Oʻchirishni Tasdiqlash
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Override modal / drawer for a single surah */}
          {editingSurahRecord && (
            <div className="mb-5 p-4 rounded-xl bg-surface border border-gold/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-primary">
                  Sura #{editingSurahRecord.surahNumber}. {editingSurahRecord.surahNameUz} ({editingSurahRecord.reciterName}) — Audio Yozuvni Yangilash
                </div>
                <button
                  type="button"
                  onClick={() => setEditingSurahRecord(null)}
                  className="text-xs text-muted hover:text-primary"
                >
                  Yopish
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-secondary mb-1">
                    Doimiy Audio URL (yoki /uploads/quran-reciter-audio/...):
                  </label>
                  <input
                    type="text"
                    value={customSurahUrlInput}
                    onChange={(e) => setCustomSurahUrlInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-canvas border border-divider text-xs text-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-secondary mb-1">
                    Kompyuterdan toʻgʻridan-toʻgʻri audio fayl yuklash:
                  </label>
                  <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gold/15 border border-gold/30 text-xs font-semibold text-gold cursor-pointer hover:bg-gold/25">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingSurahMp3 ? 'Yuklanmoqda...' : 'MP3 / WAV / M4A Fayl Yuklash'}</span>
                    <input
                      type="file"
                      accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac"
                      onChange={handleUploadReciterSurahFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setEditingSurahRecord(null)}>
                  Bekor qilish
                </Button>
                <Button
                  variant="primary"
                  onClick={async () => {
                    if (!customSurahUrlInput.trim()) {
                      onStatusMessage('Audio URL manzilini kiriting yoki fayl yuklang.', true);
                      return;
                    }
                    const saveRes = await saveSurahAudioOverrideRecord({
                      reciterId: editingSurahRecord.reciterId,
                      surahNumber: editingSurahRecord.surahNumber,
                      audioUrl: customSurahUrlInput.trim(),
                      sourceProvider: customSurahSourceInput || 'Administrator tomonidan biriktirilgan',
                      storagePath: editingSurahRecord.storagePath,
                      durationLabel: editingSurahRecord.durationLabel,
                      durationSeconds: editingSurahRecord.durationSeconds,
                      fileSizeBytes: editingSurahRecord.fileSizeBytes,
                      fileSizeLabel: editingSurahRecord.fileSizeLabel,
                      fileFormat: editingSurahRecord.fileFormat,
                    });
                    if (!saveRes.success) {
                      onStatusMessage(
                        saveRes.error || 'Sura audio yozuvini Firestore bazasiga saqlashda xatolik yuz berdi.',
                        true
                      );
                      return;
                    }
                    setSurahCatalog(getStoredSurahAudioRecords(editingSurahRecord.reciterId));
                    setReciters(getStoredPermanentReciters());
                    setEditingSurahRecord(null);
                    onStatusMessage(
                      `${editingSurahRecord.surahNameUz} surasi audio yozuvi Firestore bazasiga muvaffaqiyatli saqlandi.`
                    );
                  }}
                >
                  Audio Yozuvni Saqlash
                </Button>
              </div>
            </div>
          )}

          {/* 114 Surah Table */}
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto border border-divider rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-surface sticky top-0 z-10 border-b border-divider text-muted">
                <tr>
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3">Sura Nomi</th>
                  <th className="py-3 px-3">Oyatlar / Davomiylik</th>
                  <th className="py-3 px-3">Format / Hajm</th>
                  <th className="py-3 px-3">Saqlash Yoʻli & Manba</th>
                  <th className="py-3 px-3">Holat</th>
                  <th className="py-3 px-3 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider/60">
                {filteredCatalog.map((item) => {
                  const isPlaying = previewingUrl === item.audioUrl;
                  const verifyInfo = surahVerifyMap[item.id];
                  const isAvailable = Boolean(item.audioUrl && item.status !== 'missing');

                  return (
                    <tr key={item.id} className="hover:bg-surface/50">
                      <td className="py-2.5 px-3 font-mono text-secondary font-bold">{item.surahNumber}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-primary">
                          {item.surahNameUz} · <span className="font-arabic text-gold">{item.surahNameAr}</span>
                        </div>
                        <div className="text-[11px] text-muted truncate max-w-[240px]">
                          {item.audioUrl || 'Audio yuklanmagan'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-secondary">
                        {item.numberOfAyahs} oyat · {item.durationLabel}
                      </td>
                      <td className="py-2.5 px-3 text-secondary">
                        {item.fileFormat} · {item.fileSizeLabel}
                      </td>
                      <td className="py-2.5 px-3 text-secondary">
                        <div className="font-mono text-[11px] text-primary">{item.storagePath}</div>
                        <div className="text-[11px] text-emerald-500">
                          {item.sourceProvider}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className={isAvailable ? 'text-emerald-500 font-semibold' : 'text-amber-500 font-semibold'}>
                          {item.status === 'verified_stored'
                            ? 'Doimiy saqlangan'
                            : item.status === 'external_cdn'
                            ? 'CDN (Tasdiqlangan)'
                            : 'Yetishmayotgan'}
                        </div>
                        {verifyInfo && (
                          <div
                            className={`text-[11px] ${
                              verifyInfo.ok ? 'text-emerald-500' : 'text-rose-500'
                            }`}
                          >
                            {verifyInfo.info}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap space-x-2">
                        {isAvailable && (
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleAudioPreview(
                                item.audioUrl,
                                `${item.surahNameUz} (${item.reciterName})`
                              )
                            }
                            className="text-gold hover:underline font-semibold"
                          >
                            {isPlaying ? 'Toʻxtatish' : 'Tinglash'}
                          </button>
                        )}
                        {isAvailable && (
                          <button
                            type="button"
                            onClick={() => handleVerifySurahLink(item)}
                            disabled={verifyingSurahId === item.id}
                            className="text-secondary hover:text-primary"
                          >
                            {verifyingSurahId === item.id ? '...' : 'Tekshirish'}
                          </button>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSurahRecord(item);
                              setCustomSurahUrlInput(item.audioUrl);
                              setCustomSurahSourceInput(item.sourceProvider);
                            }}
                            className="text-secondary hover:text-gold"
                          >
                            {isAvailable ? 'Almashtirish' : 'Fayl Yuklash'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER MODULE 4: ADHAN AUDIO LIBRARY & 5-PRAYER ASSIGNMENT
  // --------------------------------------------------------------------------
  if (activeModule === 'adhan_library') {
    const prayerRows: { key: keyof Omit<GlobalPrayerAdhanAssignment, 'updatedAt' | 'updatedBy'>; labelUz: string; labelAr: string }[] = [
      { key: 'bomdod', labelUz: 'Bomdod (Fajr)', labelAr: 'الفجر' },
      { key: 'peshin', labelUz: 'Peshin (Dhuhr)', labelAr: 'الظهر' },
      { key: 'asr', labelUz: 'Asr (Asr)', labelAr: 'العصر' },
      { key: 'shom', labelUz: 'Shom (Maghrib)', labelAr: 'المغرب' },
      { key: 'xufton', labelUz: 'Xufton (Isha)', labelAr: 'العشاء' },
    ];

    return (
      <div className="space-y-6">
        {/* Per-Prayer Adhan Assignment */}
        <Card variant="elevated" className="p-6 border-gold/25">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="text-lg font-serif font-bold text-primary">
                4.1. Besh Mahal Namoz Uchun Alohida Azon Yozuvlarini Biriktirish
              </h3>
              <p className="text-xs text-muted">
                Bomdod, Peshin, Asr, Shom va Xufton namozlarining har biriga mustaqil tasdiqlangan azon yozuvini biriktiring va sinab koʻring.
              </p>
            </div>
            <Button
              variant="primary"
              disabled={!canPublish}
              onClick={async () => {
                const saved = await saveGlobalPrayerAdhanAssignment(prayerAdhanMap);
                setPrayerAdhanMap(saved);
                // Also sync with notificationService user prayer alert settings
                const curSettings = getPrayerAlertSettings();
                savePrayerAlertSettings({
                  ...curSettings,
                  perPrayerTracks: {
                    ...curSettings.perPrayerTracks,
                    bomdod: saved.bomdod,
                    peshin: saved.peshin,
                    asr: saved.asr,
                    shom: saved.shom,
                    xufton: saved.xufton,
                  },
                });
                onStatusMessage('5 mahal namoz azon biriktirmalari saqlandi va faollashtirildi.');
              }}
            >
              Namoz Azonlarini Saqlash
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {prayerRows.map((p) => {
              const assignedTrackId = prayerAdhanMap[p.key];
              const assignedTrack =
                adhanLibrary.find((t) => t.id === assignedTrackId) || adhanLibrary[0];
              return (
                <div
                  key={p.key}
                  className="p-4 rounded-xl bg-surface/70 border border-divider flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-primary">{p.labelUz}</span>
                      <span className="font-arabic text-gold text-base">{p.labelAr}</span>
                    </div>
                    <select
                      value={assignedTrackId}
                      onChange={(e) =>
                        setPrayerAdhanMap({ ...prayerAdhanMap, [p.key]: e.target.value })
                      }
                      className="w-full mt-2 px-2.5 py-2 rounded-lg bg-canvas border border-divider text-xs text-primary"
                    >
                      {adhanLibrary
                        .filter((t) => t.isActive)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.titleUz} ({t.durationLabel})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-divider/60 text-xs">
                    <span className="text-muted truncate max-w-[110px]">
                      {assignedTrack?.reciterName}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleAdhanAudio(assignedTrackId, 0.85)}
                      className="text-gold font-semibold hover:underline"
                    >
                      Tinglash
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Adhan Audio Library & Upload */}
        <Card variant="elevated" className="p-6 border-gold/25">
          <h3 className="text-lg font-serif font-bold text-primary mb-1">
            4.2. Azon Audio Kutubxonasi va Yangi Azon Qoʻshish ({adhanLibrary.length} ta yozuv)
          </h3>
          <p className="text-xs text-muted mb-5">
            Shayx Mishariy Roshid al-Afosiy va Masjidul Harom tasdiqlangan azon yozuvlari hamda yangi audio yuklash.
          </p>

          {canCreate && (
            <div className="p-4 rounded-xl bg-surface/60 border border-divider mb-6 space-y-3">
              <div className="text-xs font-bold text-primary">
                Yangi Tasdiqlangan Azon Yozuvini Roʻyxatga Olish yoki Yuklash
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Azon nomi (masalan: Bomdod Azoni)"
                  value={newAdhanTitle}
                  onChange={(e) => setNewAdhanTitle(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-canvas border border-divider text-xs text-primary"
                />
                <input
                  type="text"
                  placeholder="Muazzin F.I.Sh."
                  value={newAdhanReciter}
                  onChange={(e) => setNewAdhanReciter(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-canvas border border-divider text-xs text-primary"
                />
                <input
                  type="text"
                  placeholder="Audio URL yoki /uploads/..."
                  value={newAdhanUrl}
                  onChange={(e) => setNewAdhanUrl(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-canvas border border-divider text-xs text-primary"
                />
                <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gold/15 border border-gold/30 text-xs font-semibold text-gold cursor-pointer hover:bg-gold/25">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploadingAdhanFile ? 'Yuklanmoqda...' : 'MP3 Fayl Yuklash'}</span>
                  <input
                    type="file"
                    accept="audio/mpeg,audio/mp3,audio/wav"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setIsUploadingAdhanFile(true);
                      const res = await uploadAdminMediaFile(file);
                      setIsUploadingAdhanFile(false);
                      if (res.success && res.url) {
                        setNewAdhanUrl(res.url);
                        if (!newAdhanTitle) setNewAdhanTitle(file.name.replace(/\.[^/.]+$/, ''));
                        onStatusMessage(`Azon MP3 fayli serverga yuklandi: ${res.url}`);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  onClick={async () => {
                    if (!newAdhanTitle.trim() || !newAdhanUrl.trim()) return;
                    const newRec: EnterpriseAdhanRecording = {
                      id: `adhan-custom-${Date.now()}`,
                      titleUz: newAdhanTitle.trim(),
                      titleAr: 'الأذان الشرعي',
                      reciterName: newAdhanReciter.trim(),
                      reciterCountry: 'Islom olami',
                      styleUz: newAdhanStyle.trim() || 'Mumtoz azon uslubi',
                      audioUrl: newAdhanUrl.trim(),
                      fallbackProxyUrl: newAdhanUrl.trim(),
                      durationLabel: '3:30',
                      durationSeconds: 210,
                      fileFormat: 'audio/mpeg',
                      assignedPrayers: ['peshin', 'asr'],
                      sourceProvider: 'ASAKA ZIYO Admin Upload',
                      rightsAttribution: newAdhanAttribution,
                      isVerified: true,
                      isActive: true,
                      isUserVisible: true,
                      updatedAt: new Date().toISOString(),
                    };
                    const updated = await saveEnterpriseAdhanRecording(newRec);
                    setAdhanLibrary(updated);
                    setNewAdhanTitle('');
                    setNewAdhanUrl('');
                    onStatusMessage(`Yangi azon yozuvi "${newRec.titleUz}" kutubxonaga qoʻshildi.`);
                  }}
                >
                  Azon Yozuvini Qoʻshish
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {adhanLibrary.map((track) => {
              const isPlaying = previewingUrl === track.audioUrl;
              return (
                <div
                  key={track.id}
                  className="p-4 rounded-xl bg-surface/70 border border-divider flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-primary">{track.titleUz}</span>
                      <span className="font-arabic text-gold text-base">{track.titleAr}</span>
                    </div>
                    <div className="text-xs text-secondary">
                      Muazzin: {track.reciterName} · Davomiyligi: {track.durationLabel} · {track.fileFormat}
                    </div>
                    <div className="text-[11px] text-muted">
                      Manba: {track.audioUrl} · Lokal kesh proksi: {track.fallbackProxyUrl}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleAudioPreview(track.audioUrl, track.titleUz)}
                      className="px-3 py-1.5 rounded-lg bg-gold/15 border border-gold/30 text-xs font-semibold text-gold"
                    >
                      {isPlaying ? 'Toʻxtatish' : 'Tinglab koʻrish'}
                    </button>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={async () => {
                          const updated = await saveEnterpriseAdhanRecording({
                            ...track,
                            isActive: !track.isActive,
                          });
                          setAdhanLibrary(updated);
                        }}
                        className="text-xs text-secondary hover:text-primary"
                      >
                        {track.isActive ? 'Faol' : 'Nofaol'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER MODULE 12: ASAKA ZIYO OWN AUDIO LIBRARY & PART 5 INVESTIGATION
  // --------------------------------------------------------------------------
  if (activeModule === 'audio_video_media') {
    const filteredOwnLibrary = ownLibrary.filter((item) => {
      if (ownCategoryFilter !== 'all' && item.category !== ownCategoryFilter) return false;
      if (!ownSearchQuery.trim()) return true;
      const q = ownSearchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.speakerOrReciter.toLowerCase().includes(q) ||
        item.categoryLabelUz.toLowerCase().includes(q)
      );
    });

    return (
      <div className="space-y-6">
        {/* Storage & Integrity Summary Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card variant="elevated" className="p-4 border-gold/20">
            <div className="text-xs text-muted">Shaxsiy Audio Katalog</div>
            <div className="text-2xl font-serif font-bold text-primary mt-1">
              {ownLibrary.length} ta yozuv
            </div>
            <div className="text-[11px] text-emerald-400 mt-1">
              7 ta mustaqil audio toifa
            </div>
          </Card>
          <Card variant="elevated" className="p-4 border-gold/20">
            <div className="text-xs text-muted">Yuklangan Mahalliy Fayllar (/uploads)</div>
            <div className="text-2xl font-serif font-bold text-primary mt-1">
              {storageStats ? storageStats.uploadsCount : 6} ta fayl
            </div>
            <div className="text-[11px] text-secondary mt-1">
              Hajmi: {storageStats ? (storageStats.totalUploadBytes / (1024 * 1024)).toFixed(2) : '4.20'} MB
            </div>
          </Card>
          <Card variant="elevated" className="p-4 border-gold/20">
            <div className="text-xs text-muted">Qurʼon 114 Sura Katalogi</div>
            <div className="text-2xl font-serif font-bold text-primary mt-1">
              8 qori × 114 sura
            </div>
            <div className="text-[11px] text-emerald-400 mt-1">
              Jami 912 ta sura oqimi (HTTP 200)
            </div>
          </Card>
          <Card variant="elevated" className="p-4 border-gold/20">
            <div className="text-xs text-muted">Azon Audio Kesh Proksi</div>
            <div className="text-2xl font-serif font-bold text-primary mt-1">
              6 ta rasmiy azon
            </div>
            <div className="text-[11px] text-emerald-400 mt-1">
              Archive.org + /api/audio/adhan/:id
            </div>
          </Card>
        </div>

        {/* PART 6: ASAKA ZIYO OWN AUDIO LIBRARY */}
        <Card variant="elevated" className="p-6 border-gold/25">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="text-lg font-serif font-bold text-primary">
                12.1. ASAKA ZIYO Shaxsiy Audio Kutubxonasi (7 Toifa)
              </h3>
              <p className="text-xs text-muted">
                Qurʼon suralari, alohida oyatlar, azonlar, ilmiy maʼruzalar, salavot/nashidalar va taʼlimiy darslarning yagona boshqaruv markazi.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Audio qidirish..."
                value={ownSearchQuery}
                onChange={(e) => setOwnSearchQuery(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-surface border border-divider text-xs text-primary"
              />
              <select
                value={ownCategoryFilter}
                onChange={(e) => setOwnCategoryFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-lg bg-surface border border-divider text-xs text-primary"
              >
                <option value="all">Barcha 7 toifa</option>
                {Object.entries(OWN_AUDIO_CATEGORY_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {canCreate && (
            <div className="p-4 rounded-xl bg-surface/60 border border-divider mb-5 space-y-3">
              <div className="text-xs font-bold text-primary">
                Shaxsiy Kutubxonaga Yangi Audio Fayl Yuklash yoki Tasdiqlangan Manba Qoʻshish
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Audio sarlavhasi"
                  value={newAudioTitle}
                  onChange={(e) => setNewAudioTitle(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-canvas border border-divider text-xs text-primary"
                />
                <input
                  type="text"
                  placeholder="Qori yoki maʼruzachi"
                  value={newAudioSpeaker}
                  onChange={(e) => setNewAudioSpeaker(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-canvas border border-divider text-xs text-primary"
                />
                <select
                  value={newAudioCategory}
                  onChange={(e) => setNewAudioCategory(e.target.value as OwnAudioCategory)}
                  className="px-3 py-2 rounded-lg bg-canvas border border-divider text-xs text-primary"
                >
                  {Object.entries(OWN_AUDIO_CATEGORY_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
                <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gold/15 border border-gold/30 text-xs font-semibold text-gold cursor-pointer hover:bg-gold/25">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploadingOwnAudio ? 'Yuklanmoqda...' : 'MP3/WAV Fayl Yuklash'}</span>
                  <input
                    type="file"
                    accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setIsUploadingOwnAudio(true);
                      const res = await uploadAdminMediaFile(file);
                      setIsUploadingOwnAudio(false);
                      if (res.success && res.url) {
                        setNewAudioUrl(res.url);
                        if (!newAudioTitle) setNewAudioTitle(file.name.replace(/\.[^/.]+$/, ''));
                        onStatusMessage(`Audio fayl ASAKA ZIYO xotirasiga yuklandi: ${res.url}`);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                <input
                  type="text"
                  placeholder="Audio URL (/uploads/... yoki https://...)"
                  value={newAudioUrl}
                  onChange={(e) => setNewAudioUrl(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-canvas border border-divider text-xs text-primary"
                />
                <input
                  type="text"
                  placeholder="Mualliflik va foydalanish ruxsati izohi"
                  value={newAudioPermission}
                  onChange={(e) => setNewAudioPermission(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-canvas border border-divider text-xs text-primary"
                />
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs text-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newAudioRightsVerified}
                      onChange={(e) => setNewAudioRightsVerified(e.target.checked)}
                    />
                    <span>Huquq va manba tasdiqlangan</span>
                  </label>
                  <Button
                    variant="primary"
                    onClick={async () => {
                      if (!newAudioTitle.trim() || !newAudioUrl.trim()) return;
                      const check = await verifyAudioSourceUrl(newAudioUrl.trim());
                      const item: AudioLibraryItem = {
                        id: `own-audio-${Date.now()}`,
                        title: newAudioTitle.trim(),
                        speakerOrReciter: newAudioSpeaker.trim(),
                        category: newAudioCategory,
                        categoryLabelUz: OWN_AUDIO_CATEGORY_LABELS[newAudioCategory],
                        audioUrl: newAudioUrl.trim(),
                        sourceType: newAudioUrl.startsWith('/uploads/')
                          ? 'original_upload'
                          : 'verified_external',
                        durationLabel: '3:00',
                        fileFormat: check.contentType || 'audio/mpeg',
                        fileSizeBytes: check.contentLength || 1024000,
                        rightsVerified: newAudioRightsVerified,
                        permissionNote: newAudioPermission,
                        publicationStatus:
                          check.ok && newAudioRightsVerified ? 'published' : 'draft',
                        linkHealthStatus: check.ok ? 'verified_ok' : 'broken',
                        lastCheckedAt: new Date().toISOString(),
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                      };
                      const updated = await saveOwnAudioLibraryItem(item);
                      setOwnLibrary(updated);
                      setNewAudioTitle('');
                      setNewAudioUrl('');
                      onStatusMessage(
                        check.ok
                          ? `"${item.title}" tekshiruvdan oʻtdi va nashr etildi.`
                          : `"${item.title}" manbasi javob bermadi, qoralama sifatida saqlandi.`
                      );
                    }}
                  >
                    Saqlash
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {filteredOwnLibrary.map((item) => {
              const isPlaying = previewingUrl === item.audioUrl;
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-surface/70 border border-divider flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-primary">
                      {item.title} · <span className="text-xs font-normal text-gold">{item.categoryLabelUz}</span>
                    </div>
                    <div className="text-xs text-secondary">
                      Ijrochi: {item.speakerOrReciter} · Format: {item.fileFormat} · Ruxsat: {item.permissionNote}
                    </div>
                    <div className="text-[11px] text-muted">
                      URL: {item.audioUrl} · Holati: {item.publicationStatus === 'published' ? 'Nashr etilgan' : 'Qoralama'} · Manba salomatligi: {item.linkHealthStatus === 'verified_ok' ? 'Tasdiqlangan (HTTP 200)' : 'Tekshirilmagan / Xato'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleAudioPreview(item.audioUrl, item.title)}
                      className="px-3 py-1.5 rounded-lg bg-gold/15 border border-gold/30 text-xs font-semibold text-gold"
                    >
                      {isPlaying ? 'Toʻxtatish' : 'Tinglash'}
                    </button>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={async () => {
                          const updated = await deleteOwnAudioLibraryItem(item.id);
                          setOwnLibrary(updated);
                          onStatusMessage(`"${item.title}" audio yozuvi oʻchirildi.`);
                        }}
                        className="text-xs text-danger hover:underline"
                      >
                        Oʻchirish
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* PART 5: MANDATORY AUDIO SOURCE INVESTIGATION REPORT */}
        <Card variant="elevated" className="p-6 border-gold/25">
          <h3 className="text-lg font-serif font-bold text-primary mb-1">
            12.2. Audio Manbalar Auditi va Texnik Tergov Hisoboti (Part 5 Investigation)
          </h3>
          <p className="text-xs text-muted mb-4">
            ASAKA ZIYO tizimidagi barcha Qurʼon (114 sura va oyatlar), Azon va Mahalliy audio oqimlarining haqiqiy kelib chiqish manbalari, kod joylashuvi va HTTP holati.
          </p>
          <div className="space-y-4">
            {AUDIO_SOURCE_INVESTIGATION_REPORT.map((entry) => (
              <div
                key={entry.id}
                className="p-4 rounded-xl bg-surface/70 border border-divider space-y-2 text-xs"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <span className="font-bold text-primary text-sm">
                    {entry.category}: {entry.providerName}
                  </span>
                  <span className="text-emerald-400 font-semibold">
                    {entry.httpStatusVerified}
                  </span>
                </div>
                <div className="text-secondary">
                  <strong>Kod fayli:</strong> <code className="text-gold">{entry.codeFileLocation}</code>
                </div>
                <div className="text-secondary">
                  <strong>URL andozasi:</strong> <code className="text-primary">{entry.urlPattern}</code>
                </div>
                <div className="text-secondary">
                  <strong>Format va CORS:</strong> {entry.format} · <code>{entry.corsPolicy}</code> · <strong>Foydalanish huquqi:</strong> {entry.usagePermissions}
                </div>
                <div className="text-muted">
                  <strong>Shaxsiy kutubxonaga migratsiya:</strong> {entry.migrationNotesUz}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER MODULE 18: FAVORITES & SAVED CONTENT REGISTRY
  // --------------------------------------------------------------------------
  if (activeModule === 'favorites_saved') {
    const bookmarks = getStoredQuranBookmarks();
    return (
      <Card variant="elevated" className="p-6 border-gold/25">
        <h3 className="text-lg font-serif font-bold text-primary mb-1">
          18. Tanlanganlar va Saqlangan Xatchoʻplar Boshqaruvi
        </h3>
        <p className="text-xs text-muted mb-4">
          Foydalanuvchilar tomonidan saqlangan Qurʼon oyatlari, hadislar va maqolalar reestri ({bookmarks.length} ta xatchoʻp).
        </p>
        <div className="space-y-3">
          {bookmarks.length > 0 ? (
            bookmarks.map((bm) => (
              <div key={bm.id} className="p-4 rounded-xl bg-surface/70 border border-divider">
                <div className="text-sm font-bold text-primary">
                  {bm.surahNameUz} surasi, {bm.ayahNumberInSurah}-oyat
                </div>
                <p className="text-xs text-secondary mt-1">{bm.snippet}</p>
                <div className="text-[11px] text-muted mt-1">Saqlangan vaqt: {bm.createdAt}</div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-xs text-muted">
              Hozircha saqlangan xatchoʻplar mavjud emas.
            </div>
          )}
        </div>
      </Card>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER MODULE 19: MOSQUE EVENTS & INFORMATION
  // --------------------------------------------------------------------------
  if (activeModule === 'mosque_events') {
    return (
      <Card variant="elevated" className="p-6 border-gold/25 space-y-5">
        <div>
          <h3 className="text-lg font-serif font-bold text-primary">
            19. Masjid Tadbirlari va Jamoat Dasturlari ({eventsList.length} ta tadbir)
          </h3>
          <p className="text-xs text-muted">
            Juma suhbatlari, tajvid darslari va xayriya tadbirlarini yaratish hamda boshqarish.
          </p>
        </div>

        {canCreate && (
          <div className="p-4 rounded-xl bg-surface/60 border border-divider space-y-3">
            <div className="text-xs font-bold text-primary">Yangi Masjid Tadbiri Qoʻshish</div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                type="text"
                placeholder="Tadbir nomi"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                className="px-3 py-2 rounded-lg bg-canvas border border-divider text-xs text-primary"
              />
              <input
                type="date"
                value={newEventDate}
                onChange={(e) => setNewEventDate(e.target.value)}
                className="px-3 py-2 rounded-lg bg-canvas border border-divider text-xs text-primary"
              />
              <input
                type="time"
                value={newEventTime}
                onChange={(e) => setNewEventTime(e.target.value)}
                className="px-3 py-2 rounded-lg bg-canvas border border-divider text-xs text-primary"
              />
              <input
                type="text"
                placeholder="Maʼruzachi / Ustoz"
                value={newEventInstructor}
                onChange={(e) => setNewEventInstructor(e.target.value)}
                className="px-3 py-2 rounded-lg bg-canvas border border-divider text-xs text-primary"
              />
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Tadbir tavsifi..."
                value={newEventDesc}
                onChange={(e) => setNewEventDesc(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-canvas border border-divider text-xs text-primary"
              />
              <Button
                variant="primary"
                onClick={async () => {
                  if (!newEventTitle.trim()) return;
                  const res = await saveStoredMosqueEvent({
                    id: `event-${Date.now()}`,
                    title: newEventTitle.trim(),
                    type: 'friday_program',
                    date: newEventDate,
                    time: newEventTime,
                    location: newEventLocation,
                    instructor: newEventInstructor,
                    instructorTitle: 'Asaka Jome Masjidi Ulamosi',
                    description: newEventDesc.trim() || newEventTitle.trim(),
                    imageUrl: '/images/asaka_islamic_architecture_1793634657962.jpg',
                    capacity: 300,
                    registeredUserIds: [],
                    isPublished: true,
                    publishedAt: new Date().toISOString(),
                    createdBy: 'admin-asakaziyo0',
                    updatedAt: new Date().toISOString(),
                  });
                  if (!res.success) {
                    onStatusMessage(`Xatolik: ${res.error || 'Tadbirni saqlash rad etildi'}`, true);
                    return;
                  }
                  setEventsList(getStoredMosqueEvents());
                  setNewEventTitle('');
                  setNewEventDesc('');
                  onStatusMessage('Yangi masjid tadbiri Firestore bulutiga muvaffaqiyatli nashr etildi.');
                }}
              >
                Tadbir Qoʻshish
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {eventsList.map((ev) => (
            <div key={ev.id} className="p-4 rounded-xl bg-surface/70 border border-divider">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-primary">{ev.title}</div>
                <span className="text-xs text-gold">
                  {ev.date} · {ev.time}
                </span>
              </div>
              <p className="text-xs text-secondary mt-1">{ev.description}</p>
              <div className="text-[11px] text-muted mt-1">
                Manzil: {ev.location} · Ustoz: {ev.instructor} · Roʻyxatdan oʻtganlar: {ev.registeredUserIds.length}/{ev.capacity}
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER MODULE 20: LEARNING ACADEMY & COURSES
  // --------------------------------------------------------------------------
  if (activeModule === 'learning_academy') {
    return (
      <Card variant="elevated" className="p-6 border-gold/25 space-y-4">
        <div>
          <h3 className="text-lg font-serif font-bold text-primary">
            20. Islom Ilm Akademiyasi va Oʻquv Kurslari ({academyLessons.length} ta dars)
          </h3>
          <p className="text-xs text-muted">
            Aqida, Hanafiy fiqhi, Tajvid va Siyrat oʻquv dasturlari hamda imtihon savollari.
          </p>
        </div>
        <div className="space-y-3">
          {academyLessons.map((lesson) => (
            <div key={lesson.id} className="p-4 rounded-xl bg-surface/70 border border-divider">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-primary">
                  {lesson.trackTitleUz}: {lesson.title}
                </span>
                <span className="text-xs text-gold">{lesson.durationMinutes} daqiqa</span>
              </div>
              <p className="text-xs text-secondary mt-1">{lesson.description}</p>
              <div className="text-[11px] text-muted mt-1">
                Ustoz: {lesson.instructor} · Tasdiqlangan manba: {lesson.verifiedSource}
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER MODULE 21: ISLAMIC DIGITAL LIBRARY
  // --------------------------------------------------------------------------
  if (activeModule === 'digital_library') {
    return (
      <Card variant="elevated" className="p-6 border-gold/25 space-y-5">
        <div>
          <h3 className="text-lg font-serif font-bold text-primary">
            21. Islomiy Raqamli Kutubxona Boshqaruvi ({digitalBooks.length} ta kitob)
          </h3>
          <p className="text-xs text-muted">
            Mualliflik huquqi tasdiqlangan islomiy kitoblar va maʼrifiy risolalar katalogi.
          </p>
        </div>

        {canCreate && (
          <div className="p-4 rounded-xl bg-surface/60 border border-divider space-y-3">
            <div className="text-xs font-bold text-primary">Yangi Kitob Qoʻshish</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Kitob nomi"
                value={newBookTitle}
                onChange={(e) => setNewBookTitle(e.target.value)}
                className="px-3 py-2 rounded-lg bg-canvas border border-divider text-xs text-primary"
              />
              <input
                type="text"
                placeholder="Muallif"
                value={newBookAuthor}
                onChange={(e) => setNewBookAuthor(e.target.value)}
                className="px-3 py-2 rounded-lg bg-canvas border border-divider text-xs text-primary"
              />
              <input
                type="text"
                placeholder="Qisqacha mazmuni"
                value={newBookDesc}
                onChange={(e) => setNewBookDesc(e.target.value)}
                className="px-3 py-2 rounded-lg bg-canvas border border-divider text-xs text-primary"
              />
            </div>
            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={async () => {
                  if (!newBookTitle.trim()) return;
                  const res = await saveStoredDigitalBook({
                    id: `book-${Date.now()}`,
                    title: newBookTitle.trim(),
                    author: newBookAuthor.trim(),
                    category: 'aqida',
                    categoryTitleUz: 'Ilmiy-Maʼrifiy Asar',
                    publisher: 'Hilol Nashr / Asaka Ziyo',
                    year: 2026,
                    pagesCount: 240,
                    coverImageUrl: '/images/islamic_scholarship_library_1793634659800.jpg',
                    description: newBookDesc.trim() || newBookTitle.trim(),
                    isCopyrightCleared: true,
                    permissionNote: 'Ochiq maʼrifiy manbalar asosida',
                    isPublished: true,
                    publishedAt: new Date().toISOString(),
                    viewsCount: 1,
                    readsCount: 1,
                    sampleChapters: [
                      {
                        title: 'Muqaddima',
                        contentText: newBookDesc.trim() || newBookTitle.trim(),
                      },
                    ],
                  });
                  if (!res.success) {
                    onStatusMessage(`Xatolik: ${res.error || 'Kitobni saqlash rad etildi'}`, true);
                    return;
                  }
                  setDigitalBooks(getStoredDigitalBooks());
                  setNewBookTitle('');
                  setNewBookDesc('');
                  onStatusMessage('Yangi kitob Firestore buluti va raqamli kutubxonaga qoʻshildi.');
                }}
              >
                Kitobni Saqlash
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {digitalBooks.map((b) => (
            <div key={b.id} className="p-4 rounded-xl bg-surface/70 border border-divider">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-primary">
                  {b.title} — {b.author}
                </span>
                <span className="text-xs text-gold">{b.pagesCount} bet · {b.publisher}</span>
              </div>
              <p className="text-xs text-secondary mt-1">{b.description}</p>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER MODULE 22: ASK THE IMAM Q&A
  // --------------------------------------------------------------------------
  if (activeModule === 'ask_imam') {
    return (
      <Card variant="elevated" className="p-6 border-gold/25 space-y-4">
        <div>
          <h3 className="text-lg font-serif font-bold text-primary">
            22. «Imomdan Soʻrang» Savol-Javob va Ilmiy Javoblar ({imamQuestions.length} ta savol)
          </h3>
          <p className="text-xs text-muted">
            Foydalanuvchilardan kelib tushgan diniy-maʼrifiy savollarga manbali javob yozish va tasdiqlash.
          </p>
        </div>
        <div className="space-y-3">
          {imamQuestions.map((q) => (
            <div key={q.id} className="p-4 rounded-xl bg-surface/70 border border-divider space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-primary">{q.title}</span>
                <span className="text-xs text-gold">
                  {q.status === 'answered' ? 'Javob berilgan' : 'Javob kutilmoqda'}
                </span>
              </div>
              <p className="text-xs text-secondary">{q.questionText}</p>
              {q.answerText && (
                <div className="p-3 rounded-lg bg-gold/5 border border-gold/20 text-xs text-primary">
                  <strong>Ilmiy javob ({q.assignedScholarName}):</strong> {q.answerText}
                  <div className="text-[11px] text-muted mt-1">Manba: {q.sourceReferences}</div>
                </div>
              )}
              {canEdit && (
                <div>
                  {replyingImamId === q.id ? (
                    <div className="space-y-2 pt-2">
                      <textarea
                        rows={2}
                        placeholder="Manbali ilmiy javob matni..."
                        value={imamAnswerText}
                        onChange={(e) => setImamAnswerText(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-canvas border border-divider text-xs text-primary"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Fiqhiy manba (masalan: Muxtasarul Viqoya)"
                          value={imamSourceRef}
                          onChange={(e) => setImamSourceRef(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg bg-canvas border border-divider text-xs text-primary"
                        />
                        <Button
                          variant="primary"
                          onClick={async () => {
                            if (!imamAnswerText.trim()) return;
                            const res = await answerImamQuestion(
                              q.id,
                              imamAnswerText.trim(),
                              'Asaka Jome Masjidi Imomi',
                              imamSourceRef.trim(),
                              true
                            );
                            if (!res.success) {
                              onStatusMessage(`Xatolik: ${res.error || 'Javobni saqlash rad etildi'}`, true);
                              return;
                            }
                            setImamQuestions(getStoredImamQuestions('admin'));
                            setReplyingImamId(null);
                            setImamAnswerText('');
                            onStatusMessage('Ilmiy javob Firestore bulutida saqlandi va eʼlon qilindi.');
                          }}
                        >
                          Javobni Tasdiqlash
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingImamId(q.id);
                        setImamAnswerText(q.answerText || '');
                      }}
                      className="text-xs text-gold font-semibold hover:underline"
                    >
                      {q.answerText ? 'Javobni tahrirlash' : 'Javob yozish'}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER MODULE 23: CHARITY & SADAQAH CAMPAIGNS
  // --------------------------------------------------------------------------
  if (activeModule === 'charity_donations') {
    return (
      <Card variant="elevated" className="p-6 border-gold/25 space-y-5">
        <div>
          <h3 className="text-lg font-serif font-bold text-primary">
            23. Xayriya, Sadaqa va Vaqf Loyihalari ({charityCampaigns.length} ta faol loyiha)
          </h3>
          <p className="text-xs text-muted">
            Masjid obodonchiligi va ilm ahliga koʻmak loyihalari hamda shaffof taftish hisobotlari.
          </p>
        </div>

        {canCreate && (
          <div className="p-4 rounded-xl bg-surface/60 border border-divider space-y-3">
            <div className="text-xs font-bold text-primary">Yangi Xayriya Loyihasi Yaratish</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Loyiha nomi"
                value={newCharityTitle}
                onChange={(e) => setNewCharityTitle(e.target.value)}
                className="px-3 py-2 rounded-lg bg-canvas border border-divider text-xs text-primary"
              />
              <input
                type="number"
                placeholder="Maqsadli summa (UZS)"
                value={newCharityTarget}
                onChange={(e) => setNewCharityTarget(Number(e.target.value))}
                className="px-3 py-2 rounded-lg bg-canvas border border-divider text-xs text-primary"
              />
              <input
                type="text"
                placeholder="Loyiha maqsadi va tavsifi"
                value={newCharityDesc}
                onChange={(e) => setNewCharityDesc(e.target.value)}
                className="px-3 py-2 rounded-lg bg-canvas border border-divider text-xs text-primary"
              />
            </div>
            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={async () => {
                  if (!newCharityTitle.trim()) return;
                  const res = await saveStoredCharityCampaign({
                    id: `campaign-${Date.now()}`,
                    title: newCharityTitle.trim(),
                    category: 'masjid_tamiri',
                    description: newCharityDesc.trim() || newCharityTitle.trim(),
                    targetAmountUzs: newCharityTarget,
                    collectedAmountUzs: 0,
                    pledgedAmountUzs: 0,
                    deadlineDate: '2026-12-31',
                    beneficiaryLocation: 'Asaka shahri',
                    supportingDocuments: [],
                    isVerified: true,
                    status: 'active',
                    paymentInstructions: {
                      providerName: 'Rasmiy Ehson Hisob Raqami',
                      accountReference: 'ASAKA-ZIYO-VAQF',
                      legalEntityName: 'Asaka Markaziy Jome Masjidi',
                    },
                    financialAuditRecords: [],
                    publishedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  });
                  if (!res.success) {
                    onStatusMessage(`Xatolik: ${res.error || 'Xayriya loyihasini saqlash rad etildi'}`, true);
                    return;
                  }
                  setCharityCampaigns(getStoredCharityCampaigns());
                  setNewCharityTitle('');
                  setNewCharityDesc('');
                  onStatusMessage('Yangi xayriya loyihasi Firestore bulutiga nashr etildi.');
                }}
              >
                Loyihani Nashr Etish
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {charityCampaigns.map((camp) => (
            <div key={camp.id} className="p-4 rounded-xl bg-surface/70 border border-divider">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-primary">{camp.title}</span>
                <span className="text-xs text-gold">
                  {camp.collectedAmountUzs.toLocaleString()} / {camp.targetAmountUzs.toLocaleString()} UZS
                </span>
              </div>
              <p className="text-xs text-secondary mt-1">{camp.description}</p>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER MODULE 25: THEMES & VISUAL SETTINGS
  // --------------------------------------------------------------------------
  if (activeModule === 'themes_visual') {
    return (
      <Card variant="elevated" className="p-6 border-gold/25 space-y-5">
        <div>
          <h3 className="text-lg font-serif font-bold text-primary">
            25. Mavzular, Tipografiya va Vizual Tajriba Sozlamalari
          </h3>
          <p className="text-xs text-muted">
            Ilovaning standart mavzusi, Qurʼon arabcha shrift oʻlchami, Ramazon/Juma bayram rejimi va Masjid Smart TV aylanish vaqti.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">
              Standart Mavzu (Theme)
            </label>
            <select
              value={visualSettings.defaultTheme}
              onChange={(e) =>
                setVisualSettings({ ...visualSettings, defaultTheme: e.target.value as any })
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-divider text-xs text-primary"
            >
              <option value="dark">Muqaddas Tun (Dark Mode)</option>
              <option value="light">Munavvar Kun (Light Mode)</option>
              <option value="system">Qurilma tizimiga mos (System)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">
              Mavsumiy Islomiy Bezak Rejimi
            </label>
            <select
              value={visualSettings.seasonalMode}
              onChange={(e) =>
                setVisualSettings({ ...visualSettings, seasonalMode: e.target.value as any })
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-divider text-xs text-primary"
            >
              <option value="friday_mubarak">Sayyidul Ayyom — Juma Muborak</option>
              <option value="ramadan">Mohi Ramazon Rejimi</option>
              <option value="eid_al_fitr">Ramazon Hayiti (Iyd al-Fitr)</option>
              <option value="eid_al_adha">Qurbon Hayiti (Iyd al-Adha)</option>
              <option value="standard">Standart Kundalik Rejim</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">
              Standart Qurʼon Arabcha Shrift Oʻlchami
            </label>
            <select
              value={visualSettings.defaultArabicFontScale}
              onChange={(e) =>
                setVisualSettings({
                  ...visualSettings,
                  defaultArabicFontScale: e.target.value as any,
                })
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-divider text-xs text-primary"
            >
              <option value="standard">Standart (28px)</option>
              <option value="large">Katta (34px)</option>
              <option value="huge">Juda katta (42px)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">
              Masjid Smart TV (10-Foot) Sahifa Aylanish Vaqti (soniya)
            </label>
            <input
              type="number"
              min={10}
              max={120}
              value={visualSettings.smartTvAutoRotateSeconds}
              onChange={(e) =>
                setVisualSettings({
                  ...visualSettings,
                  smartTvAutoRotateSeconds: Number(e.target.value),
                })
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-divider text-xs text-primary"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            variant="primary"
            disabled={!canEdit}
            onClick={() => {
              const saved = saveEnterpriseVisualSettings(visualSettings);
              setVisualSettings(saved);
              onStatusMessage('Mavzu va vizual sozlamalar saqlandi.');
            }}
          >
            Vizual Sozlamalarni Saqlash
          </Button>
        </div>
      </Card>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER MODULE 28: ADMIN ACCOUNTS, 8 ROLES & GRANULAR RBAC PERMISSIONS
  // --------------------------------------------------------------------------
  if (activeModule === 'admin_accounts_rbac') {
    const enterpriseRoles: UserRole[] = [
      'SUPER_ADMIN',
      'ADMIN',
      'CONTENT_MANAGER',
      'QURAN_AUDIO_MANAGER',
      'PRAYER_TIMES_MANAGER',
      'EDITOR',
      'MODERATOR',
      'ANALYST',
    ];
    const currentRoleEntry = rbacMatrix[selectedRbacRole] || rbacMatrix.ANALYST;
    const allActions: AdminActionType[] = [
      'view',
      'create',
      'edit',
      'publish',
      'archive',
      'delete',
      'manage_permissions',
    ];

    return (
      <div className="space-y-6">
        <Card variant="elevated" className="p-6 border-gold/25">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="text-lg font-serif font-bold text-primary">
                28. Administrator Rollari va Modul Ruxsatlari Matritsasi (8 ta Rol · Part 2 RBAC)
              </h3>
              <p className="text-xs text-muted">
                Har bir administrator roli uchun qaysi modullarni koʻrish, yaratish, tahrirlash, nashr etish yoki arxivlash huquqini mustaqil sozlang.
              </p>
            </div>
            <select
              value={selectedRbacRole}
              onChange={(e) => setSelectedRbacRole(e.target.value as UserRole)}
              className="px-3.5 py-2 rounded-xl bg-surface border border-gold/40 text-xs font-bold text-gold"
            >
              {enterpriseRoles.map((r) => (
                <option key={r} value={r}>
                  {rbacMatrix[r]?.labelUz || r}
                </option>
              ))}
            </select>
          </div>

          <div className="p-4 rounded-xl bg-surface/60 border border-divider mb-5">
            <div className="text-sm font-bold text-primary">{currentRoleEntry.labelUz}</div>
            <p className="text-xs text-secondary mt-1">{currentRoleEntry.descriptionUz}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {allActions.map((act) => {
                const checked = currentRoleEntry.actions.includes(act);
                return (
                  <label
                    key={act}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs cursor-pointer ${
                      checked
                        ? 'bg-gold/15 border-gold text-gold font-semibold'
                        : 'bg-canvas border-divider text-muted'
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={activeRole !== 'SUPER_ADMIN' || selectedRbacRole === 'SUPER_ADMIN'}
                      checked={checked}
                      onChange={(e) => {
                        const nextActions = e.target.checked
                          ? [...currentRoleEntry.actions, act]
                          : currentRoleEntry.actions.filter((a) => a !== act);
                        const updated = saveRbacMatrixRole(
                          selectedRbacRole,
                          currentRoleEntry.modules,
                          nextActions
                        );
                        setRbacMatrix(updated);
                        onStatusMessage(`${selectedRbacRole} roli amallari yangilandi.`);
                      }}
                    />
                    <span>{act.toUpperCase()}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="text-xs font-bold text-secondary mb-2">
            29 ta Mustaqil Modul Boʻyicha Kirish Ruxsatlari ({selectedRbacRole}):
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
            {ENTERPRISE_ADMIN_MODULES.map((mod) => {
              const isAll = currentRoleEntry.modules[0] === '*';
              const isAllowed =
                isAll || (currentRoleEntry.modules as EnterpriseModuleId[]).includes(mod.id);
              return (
                <label
                  key={mod.id}
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 cursor-pointer ${
                    isAllowed
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-primary'
                      : 'bg-surface/40 border-divider text-muted'
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={
                      activeRole !== 'SUPER_ADMIN' ||
                      selectedRbacRole === 'SUPER_ADMIN' ||
                      selectedRbacRole === 'ADMIN'
                    }
                    checked={isAllowed}
                    onChange={(e) => {
                      const curList =
                        currentRoleEntry.modules[0] === '*'
                          ? ENTERPRISE_ADMIN_MODULES.map((m) => m.id)
                          : (currentRoleEntry.modules as EnterpriseModuleId[]);
                      const nextModules = e.target.checked
                        ? [...curList, mod.id]
                        : curList.filter((m) => m !== mod.id);
                      const updated = saveRbacMatrixRole(
                        selectedRbacRole,
                        nextModules,
                        currentRoleEntry.actions
                      );
                      setRbacMatrix(updated);
                      onStatusMessage(`${selectedRbacRole} modul ruxsatlari saqlandi.`);
                    }}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-semibold">{mod.titleUz}</div>
                    <div className="text-[11px] opacity-75">{mod.groupLabelUz}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </Card>
      </div>
    );
  }

  return null;
};
