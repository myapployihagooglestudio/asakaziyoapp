/**
 * ASAKA ZIYO — Native Android & Mobile Bridge (2026)
 * Provides:
 * - Native Lock-Screen & Notification MediaSession controls (Play/Pause/Next/Prev/Seek)
 * - Native Android Share Sheet (navigator.share + clipboard fallback)
 * - Native Haptic Feedback (navigator.vibrate)
 * - Android Hardware Back-Button & Deep-Link Handling
 */

export interface MediaMetadataPayload {
  title: string;
  artist: string;
  album?: string;
  artworkUrl?: string;
}

export interface MediaSessionHandlers {
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onPreviousTrack?: () => void;
  onNextTrack?: () => void;
  onSeekTo?: (seconds: number) => void;
}

/**
 * Configures Android / OS lock-screen and notification bar playback controls
 */
export function updateNativeMediaSession(
  metadata: MediaMetadataPayload,
  handlers: MediaSessionHandlers,
  playbackState: 'playing' | 'paused' | 'none' = 'playing'
): void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
    return;
  }

  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: metadata.title,
      artist: metadata.artist,
      album: metadata.album || 'ASAKA ZIYO — Qurʼon va Azon Kutubxonasi',
      artwork: [
        {
          src: metadata.artworkUrl || '/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: metadata.artworkUrl || '/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    });

    navigator.mediaSession.playbackState = playbackState;

    if (handlers.onPlay) {
      navigator.mediaSession.setActionHandler('play', handlers.onPlay);
    }
    if (handlers.onPause) {
      navigator.mediaSession.setActionHandler('pause', handlers.onPause);
    }
    if (handlers.onStop) {
      navigator.mediaSession.setActionHandler('stop', handlers.onStop);
    }
    if (handlers.onPreviousTrack) {
      navigator.mediaSession.setActionHandler('previoustrack', handlers.onPreviousTrack);
    }
    if (handlers.onNextTrack) {
      navigator.mediaSession.setActionHandler('nexttrack', handlers.onNextTrack);
    }
    if (handlers.onSeekTo) {
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (typeof details.seekTime === 'number') {
          handlers.onSeekTo?.(details.seekTime);
        }
      });
    }
  } catch {
    // Ignore unsupported mediaSession action handlers on older browsers
  }
}

export function updateNativeMediaPositionState(duration: number, currentTime: number, playbackRate = 1.0): void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  if (!Number.isFinite(duration) || duration <= 0) return;

  try {
    navigator.mediaSession.setPositionState({
      duration: Math.max(0, duration),
      playbackRate: playbackRate > 0 ? playbackRate : 1.0,
      position: Math.min(Math.max(0, currentTime), duration),
    });
  } catch {
    // ignore
  }
}

/**
 * Triggers subtle native Android haptic vibration
 */
export function triggerNativeHaptic(pattern: number | number[] = 18): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    // ignore
  }
}

/**
 * Opens the native Android Share sheet or copies to clipboard as fallback
 */
export async function shareContentNative(params: {
  title: string;
  text: string;
  url?: string;
}): Promise<{ shared: boolean; method: 'native' | 'clipboard' }> {
  const shareUrl = params.url || (typeof window !== 'undefined' ? window.location.href : 'https://asakaziyo.uz');
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share({
        title: params.title,
        text: params.text,
        url: shareUrl,
      });
      return { shared: true, method: 'native' };
    }
  } catch {
    // fallback to clipboard
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(`${params.title}\n\n${params.text}\n${shareUrl}`);
      return { shared: true, method: 'clipboard' };
    }
  } catch {
    // ignore
  }
  return { shared: false, method: 'clipboard' };
}
