import React, { useEffect, useState } from 'react';
import {
  getPublicEmojiCatalog,
  PublicEmojiCatalogState,
  subscribePublicEmojiCatalog,
} from '../../utils/premiumEmojiService';

interface PremiumEmojiProps {
  slotKey: string;
  size?: number;
  className?: string;
  /** Optional custom React vector icon fallback (NEVER a plain Unicode emoji) */
  fallbackIcon?: React.ReactNode;
  alt?: string;
}

/**
 * Renders a verified Telegram Premium Custom Emoji asset in Web App & Android WebView
 * via the server-side cached proxy (`/api/telegram/platform/emojis/:key/asset`).
 *
 * STRICT HONESTY & ZERO-PLAIN-EMOJI RULE:
 * - Supports static WebP/PNG (`<img>`) and animated WebM (`<video autoPlay loop muted playsInline>`).
 * - If the sticker format is unsupported (e.g. raw `.tgs` without WebP thumbnail), unconfigured,
 *   or disabled, renders `fallbackIcon` (Lucide SVG) or nothing — NEVER plain Unicode emojis!
 */
export const PremiumEmoji: React.FC<PremiumEmojiProps> = ({
  slotKey,
  size = 20,
  className = '',
  fallbackIcon = null,
  alt,
}) => {
  const [catalog, setCatalog] = useState<PublicEmojiCatalogState>(() => getPublicEmojiCatalog());
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    return subscribePublicEmojiCatalog(setCatalog);
  }, [slotKey]);

  const item = catalog.emojis[slotKey];
  if (!item || !item.enabled || !item.customEmojiId || !item.webAssetUrl || failed) {
    return fallbackIcon ? <span className={`inline-flex items-center ${className}`}>{fallbackIcon}</span> : null;
  }

  const versionedUrl = `${item.webAssetUrl}?v=${encodeURIComponent(item.customEmojiId)}`;

  if (item.webAssetFormat === 'webm') {
    return (
      <video
        src={versionedUrl}
        width={size}
        height={size}
        autoPlay
        loop
        muted
        playsInline
        aria-label={alt || item.description || slotKey}
        onError={() => setFailed(true)}
        className={`inline-block align-middle object-contain ${className}`}
      />
    );
  }

  if (item.webAssetFormat === 'tgs' && !item.webRenderable) {
    return fallbackIcon ? <span className={`inline-flex items-center ${className}`}>{fallbackIcon}</span> : null;
  }

  return (
    <img
      src={versionedUrl}
      width={size}
      height={size}
      alt={alt || item.description || slotKey}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`inline-block align-middle object-contain ${className}`}
    />
  );
};
