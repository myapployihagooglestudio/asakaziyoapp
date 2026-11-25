/**
 * ASAKA ZIYO — Global Persistent Qur'on Audio Player Store (2026)
 *
 * Persists across all navigation tabs and integrates:
 * - Offline-first IndexedDB audio Blob playback (`getOfflineAudioBlobUrl`)
 * - Server Range-streamed audio + verified reciter CDN playback
 * - Speed control (0.5x – 2.0x), Repeat (off / one / all), Shuffle, Sleep Timer
 * - Queue / Playlist playback & OS Lock-Screen MediaSession controls
 * - Native Android ExoPlayer Media3 bridge handoff when available
 */

import { getOfflineAudioBlobUrl } from './offlineStorageService';
import { updateNativeMediaSession, updateNativeMediaPositionState } from './nativeMobileBridge';
import { stopActiveAdhanAudio } from './notificationService';

export interface QuranQueueTrack {
  qariId: string;
  qariNameUz: string;
  surahNumber: number;
  surahNameUz: string;
  surahNameAr?: string;
  audioUrl: string;
}

export type RepeatMode = 'off' | 'one' | 'all';

export interface GlobalQuranPlayerState {
  currentTrack: QuranQueueTrack | null;
  queue: QuranQueueTrack[];
  currentIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  isOfflinePlayback: boolean;
  currentTime: number;
  duration: number;
  playbackSpeed: number;
  repeatMode: RepeatMode;
  shuffle: boolean;
  sleepTimerMinutes: number | null;
  sleepTimerEndsAt: number | null;
  volume: number;
  error: string | null;
}

type Listener = (state: GlobalQuranPlayerState) => void;
const listeners = new Set<Listener>();

let audioEl: HTMLAudioElement | null = null;
let activeBlobUrl: string | null = null;
let sleepTimerHandle: ReturnType<typeof setTimeout> | null = null;

let state: GlobalQuranPlayerState = {
  currentTrack: null,
  queue: [],
  currentIndex: -1,
  isPlaying: false,
  isLoading: false,
  isOfflinePlayback: false,
  currentTime: 0,
  duration: 0,
  playbackSpeed: 1.0,
  repeatMode: 'off',
  shuffle: false,
  sleepTimerMinutes: null,
  sleepTimerEndsAt: null,
  volume: 0.9,
  error: null,
};

function notify() {
  const snapshot = { ...state };
  listeners.forEach((fn) => {
    try {
      fn(snapshot);
    } catch {
      // ignore subscriber errors
    }
  });
}

function ensureAudioElement(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = 'metadata';
    audioEl.volume = state.volume;

    audioEl.addEventListener('timeupdate', () => {
      if (!audioEl) return;
      state.currentTime = audioEl.currentTime || 0;
      state.duration = Number.isFinite(audioEl.duration) ? audioEl.duration : state.duration;
      updateNativeMediaPositionState(state.duration, state.currentTime, state.playbackSpeed);
      notify();
    });

    audioEl.addEventListener('loadedmetadata', () => {
      if (!audioEl) return;
      state.duration = Number.isFinite(audioEl.duration) ? audioEl.duration : 0;
      state.isLoading = false;
      notify();
    });

    audioEl.addEventListener('playing', () => {
      state.isPlaying = true;
      state.isLoading = false;
      state.error = null;
      syncMediaSession('playing');
      notify();
    });

    audioEl.addEventListener('pause', () => {
      state.isPlaying = false;
      syncMediaSession('paused');
      notify();
    });

    audioEl.addEventListener('ended', () => {
      if (state.repeatMode === 'one' && audioEl) {
        audioEl.currentTime = 0;
        audioEl.play().catch(() => {});
        return;
      }
      playNextQuranTrack(true);
    });

    audioEl.addEventListener('error', () => {
      state.isPlaying = false;
      state.isLoading = false;
      state.error = 'Audio faylni ijro etib boʻlmadi. Internet aloqasini yoki offline yuklamani tekshiring.';
      notify();
    });
  }
  return audioEl;
}

function syncMediaSession(playbackState: 'playing' | 'paused' | 'none') {
  if (!state.currentTrack) return;
  updateNativeMediaSession(
    {
      title: `${state.currentTrack.surahNumber}. ${state.currentTrack.surahNameUz}`,
      artist: state.currentTrack.qariNameUz,
      album: 'ASAKA ZIYO — Qurʼoni Karim',
      artworkUrl: '/pwa-512x512.png',
    },
    {
      onPlay: () => toggleGlobalQuranPlayback(),
      onPause: () => toggleGlobalQuranPlayback(),
      onStop: () => stopGlobalQuranPlayback(),
      onPreviousTrack: () => playPrevQuranTrack(),
      onNextTrack: () => playNextQuranTrack(false),
      onSeekTo: (sec) => seekGlobalQuranAudio(sec),
    },
    playbackState
  );
}

export function subscribeGlobalQuranPlayer(listener: Listener): () => void {
  listeners.add(listener);
  listener({ ...state });
  return () => {
    listeners.delete(listener);
  };
}

export function getGlobalQuranPlayerState(): GlobalQuranPlayerState {
  return { ...state };
}

export async function playGlobalQuranTrack(track: QuranQueueTrack, queue?: QuranQueueTrack[]): Promise<void> {
  const el = ensureAudioElement();
  if (!el) return;

  try {
    stopActiveAdhanAudio();
  } catch {
    // ignore
  }

  if (queue && queue.length > 0) {
    state.queue = queue;
    const idx = queue.findIndex((t) => t.qariId === track.qariId && t.surahNumber === track.surahNumber);
    state.currentIndex = idx >= 0 ? idx : 0;
  } else {
    const idx = state.queue.findIndex((t) => t.qariId === track.qariId && t.surahNumber === track.surahNumber);
    if (idx >= 0) {
      state.currentIndex = idx;
    } else {
      state.queue = [track];
      state.currentIndex = 0;
    }
  }

  state.currentTrack = track;
  state.isLoading = true;
  state.error = null;
  state.currentTime = 0;
  state.duration = 0;
  notify();

  // Check offline IndexedDB blob first for zero-network instant playback
  if (activeBlobUrl) {
    try {
      URL.revokeObjectURL(activeBlobUrl);
    } catch {
      // ignore
    }
    activeBlobUrl = null;
  }

  let resolvedSrc = track.audioUrl;
  let offline = false;
  try {
    const blobUrl = await getOfflineAudioBlobUrl(track.qariId, track.surahNumber);
    if (blobUrl) {
      activeBlobUrl = blobUrl;
      resolvedSrc = blobUrl;
      offline = true;
    }
  } catch {
    // fallback to network URL
  }

  state.isOfflinePlayback = offline;

  // Notify Android native Media3 bridge if running inside Android APK
  try {
    const bridge = (window as any).AsakaNativeBridge;
    if (bridge && typeof bridge.notifyMediaPlaybackState === 'function') {
      bridge.notifyMediaPlaybackState(
        JSON.stringify({
          title: `${track.surahNumber}. ${track.surahNameUz}`,
          artist: track.qariNameUz,
          audioUrl: track.audioUrl,
          isOffline: offline,
          speed: state.playbackSpeed,
        })
      );
    }
  } catch {
    // ignore
  }

  el.src = resolvedSrc;
  el.playbackRate = state.playbackSpeed;
  el.volume = state.volume;

  try {
    await el.play();
    state.isPlaying = true;
    state.isLoading = false;
  } catch (err: any) {
    state.isPlaying = false;
    state.isLoading = false;
    state.error = err?.message || 'Ijroni boshlashda xatolik yuz berdi.';
  }
  notify();
}

export function toggleGlobalQuranPlayback(): void {
  const el = ensureAudioElement();
  if (!el || !state.currentTrack) return;
  if (state.isPlaying) {
    el.pause();
  } else {
    el.play().catch((err: any) => {
      state.error = err?.message || 'Ijro etib boʻlmadi.';
      notify();
    });
  }
}

export function stopGlobalQuranPlayback(): void {
  if (audioEl) {
    audioEl.pause();
    audioEl.currentTime = 0;
    audioEl.removeAttribute('src');
    audioEl.load();
  }
  if (sleepTimerHandle) {
    clearTimeout(sleepTimerHandle);
    sleepTimerHandle = null;
  }
  state = {
    ...state,
    currentTrack: null,
    isPlaying: false,
    isLoading: false,
    currentTime: 0,
    duration: 0,
    sleepTimerMinutes: null,
    sleepTimerEndsAt: null,
    error: null,
  };
  notify();
}

export function seekGlobalQuranAudio(seconds: number): void {
  if (!audioEl || !Number.isFinite(seconds)) return;
  audioEl.currentTime = Math.max(0, Math.min(seconds, state.duration || seconds));
  state.currentTime = audioEl.currentTime;
  notify();
}

export function setGlobalQuranSpeed(speed: number): void {
  const clamped = Math.max(0.5, Math.min(2.0, speed));
  state.playbackSpeed = clamped;
  if (audioEl) audioEl.playbackRate = clamped;
  notify();
}

export function setGlobalQuranVolume(vol: number): void {
  const clamped = Math.max(0, Math.min(1, vol));
  state.volume = clamped;
  if (audioEl) audioEl.volume = clamped;
  notify();
}

export function cycleGlobalQuranRepeatMode(): void {
  const next: RepeatMode = state.repeatMode === 'off' ? 'one' : state.repeatMode === 'one' ? 'all' : 'off';
  state.repeatMode = next;
  notify();
}

export function toggleGlobalQuranShuffle(): void {
  state.shuffle = !state.shuffle;
  notify();
}

export function setGlobalQuranSleepTimer(minutes: number | null): void {
  if (sleepTimerHandle) {
    clearTimeout(sleepTimerHandle);
    sleepTimerHandle = null;
  }
  if (!minutes || minutes <= 0) {
    state.sleepTimerMinutes = null;
    state.sleepTimerEndsAt = null;
    notify();
    return;
  }
  state.sleepTimerMinutes = minutes;
  state.sleepTimerEndsAt = Date.now() + minutes * 60 * 1000;
  sleepTimerHandle = setTimeout(() => {
    if (audioEl) audioEl.pause();
    state.isPlaying = false;
    state.sleepTimerMinutes = null;
    state.sleepTimerEndsAt = null;
    notify();
  }, minutes * 60 * 1000);
  notify();
}

export function playNextQuranTrack(autoTriggered = false): void {
  if (state.queue.length === 0) return;
  let nextIdx = state.currentIndex + 1;
  if (state.shuffle && state.queue.length > 1) {
    nextIdx = Math.floor(Math.random() * state.queue.length);
    if (nextIdx === state.currentIndex) nextIdx = (nextIdx + 1) % state.queue.length;
  } else if (nextIdx >= state.queue.length) {
    if (state.repeatMode === 'all' || !autoTriggered) {
      nextIdx = 0;
    } else {
      state.isPlaying = false;
      notify();
      return;
    }
  }
  const track = state.queue[nextIdx];
  if (track) {
    void playGlobalQuranTrack(track, state.queue);
  }
}

export function playPrevQuranTrack(): void {
  if (state.queue.length === 0) return;
  if (audioEl && audioEl.currentTime > 4) {
    audioEl.currentTime = 0;
    return;
  }
  const prevIdx = state.currentIndex > 0 ? state.currentIndex - 1 : state.queue.length - 1;
  const track = state.queue[prevIdx];
  if (track) {
    void playGlobalQuranTrack(track, state.queue);
  }
}
