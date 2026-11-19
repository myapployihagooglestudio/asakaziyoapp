/**
 * ASAKA ZIYO — Telegram Premium HTML & Visual Formatter
 *
 * Provides safe HTML escaping and clean, scannable Telegram typography
 * matching ASAKA ZIYO's Deep Emerald / Warm Ivory / Subtle Gold aesthetic.
 * Note: Telegram Bot API rejects combining `parse_mode` and explicit `entities`
 * when sending messages; therefore, when `CustomEmojiRegistry` emits `custom_emoji`
 * entities, callers send plain text + UTF-16 `entities`, OR when using HTML without
 * custom entities, clean structured HTML (`<b>`, `<i>`, `<code>`, `<blockquote>`) is used.
 */

export function escapeTelegramHtml(input: string): string {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function stripHtmlTagsForPlain(html: string): string {
  return String(html || '')
    .replace(/<\/?b>/gi, '')
    .replace(/<\/?i>/gi, '')
    .replace(/<\/?u>/gi, '')
    .replace(/<\/?s>/gi, '')
    .replace(/<\/?code>/gi, '')
    .replace(/<\/?pre>/gi, '')
    .replace(/<\/?blockquote>/gi, '')
    .replace(/<a\s+href="[^"]*">([^<]*)<\/a>/gi, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export const TELEGRAM_DIVIDER = '────────────────────';

export function buildCardBlock(params: {
  title: string;
  subtitle?: string;
  sections?: Array<{ heading?: string; lines: string[] }>;
  footer?: string;
}): string {
  const parts: string[] = [params.title];
  if (params.subtitle) {
    parts.push(params.subtitle);
  }
  if (params.sections && params.sections.length > 0) {
    for (const sec of params.sections) {
      parts.push('');
      if (sec.heading) {
        parts.push(sec.heading);
      }
      parts.push(...sec.lines);
    }
  }
  if (params.footer) {
    parts.push('', TELEGRAM_DIVIDER, params.footer);
  }
  return parts.join('\n').trim();
}
