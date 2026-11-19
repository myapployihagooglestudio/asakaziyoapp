/**
 * ASAKA ZIYO — Content Studio & Scheduled Channel Queue Service
 *
 * Manages multilingual drafts (`article`, `news`, `hadith`, `ayah`, `dhikr`,
 * `dua`, `announcement`, `media`, `event`), approval statuses, scheduled
 * publishing queue, and channel dispatch with duplicate-prevention idempotency.
 */

import crypto from 'crypto';
import {
  TelegramContentDraftRecord,
  TelegramContentStatus,
  TelegramContentType,
  TelegramLocale,
} from '../types';
import { TelegramRepository } from '../database/telegramRepository';
import { TelegramPublishingService } from '../publishing/publishingService';

export class TelegramContentStudio {
  private readonly repo: TelegramRepository;
  private readonly publishingService: TelegramPublishingService;

  constructor(repo: TelegramRepository, publishingService: TelegramPublishingService) {
    this.repo = repo;
    this.publishingService = publishingService;
  }

  async createDraft(params: {
    type: TelegramContentType;
    title: string;
    defaultBody: string;
    bodyByLocale?: Partial<Record<TelegramLocale, string>>;
    tags?: string[];
    targetChannelIds?: string[];
    scheduledAt?: string;
    mediaUrl?: string;
    createdBy: string;
  }): Promise<TelegramContentDraftRecord> {
    const nowIso = new Date().toISOString();
    const id = `draft_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
    const draft: TelegramContentDraftRecord = {
      id,
      type: params.type,
      status: params.scheduledAt ? 'scheduled' : 'draft',
      title: params.title.slice(0, 260),
      defaultBody: params.defaultBody,
      bodyByLocale: params.bodyByLocale || {},
      tags: params.tags || [],
      targetChannelIds:
        params.targetChannelIds && params.targetChannelIds.length > 0
          ? params.targetChannelIds
          : ['asaka-ziyo-main'],
      scheduledAt: params.scheduledAt,
      mediaUrl: params.mediaUrl,
      createdBy: params.createdBy,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await this.repo.saveContentDraft(draft);
    await this.repo.appendAuditLog({
      actorTelegramId: params.createdBy,
      actorRole: 'admin',
      action: 'content_draft_created',
      targetType: 'content',
      targetId: id,
      metadata: { type: params.type },
    });
    return draft;
  }

  async updateDraftStatus(
    draftId: string,
    status: TelegramContentStatus,
    actorId: string,
    scheduledAt?: string
  ): Promise<TelegramContentDraftRecord | null> {
    const draft = this.repo.getContentDraft(draftId);
    if (!draft) return null;
    draft.status = status;
    if (status === 'approved') draft.approvedBy = actorId;
    if (scheduledAt !== undefined) draft.scheduledAt = scheduledAt;
    draft.updatedAt = new Date().toISOString();
    await this.repo.saveContentDraft(draft);
    await this.repo.appendAuditLog({
      actorTelegramId: actorId,
      actorRole: 'admin',
      action: 'content_draft_status_updated',
      targetType: 'content',
      targetId: draftId,
      metadata: { status },
    });
    return draft;
  }

  async publishDraftToChannels(draftId: string, actorId: string) {
    const draft = this.repo.getContentDraft(draftId);
    if (!draft) return { ok: false, results: [], error: 'Draft not found' };

    const results = [];
    for (const chId of draft.targetChannelIds) {
      const ch = this.repo.getChannel(chId);
      const lang: TelegramLocale = ch?.language || 'uz-Latn';
      const body = draft.bodyByLocale[lang] || draft.defaultBody;
      const category =
        draft.type === 'news'
          ? 'news'
          : draft.type === 'hadith'
            ? 'hadith'
            : draft.type === 'ayah'
              ? 'ayah'
              : draft.type === 'media'
                ? 'media'
                : 'announcement';

      const idempotencyKey = `draft_pub_${draft.id}_${chId}`;
      const res = await this.publishingService.publishToChannel({
        channelId: chId,
        category,
        language: lang,
        templateText: `${draft.title}\n\n${body}`,
        createdBy: actorId,
        idempotencyKey,
      });
      results.push(res);
    }

    const anySucceeded = results.some((r) => r.success);
    if (anySucceeded) {
      draft.status = 'published';
      draft.publishedAt = new Date().toISOString();
      draft.updatedAt = draft.publishedAt;
      await this.repo.saveContentDraft(draft);
    }

    return { ok: anySucceeded, results };
  }

  async processDueScheduledDrafts(now: Date = new Date()): Promise<number> {
    const nowMs = now.getTime();
    const due = this.repo
      .listContentDrafts()
      .filter(
        (d) =>
          (d.status === 'scheduled' || d.status === 'approved') &&
          d.scheduledAt &&
          Date.parse(d.scheduledAt) <= nowMs
      );
    let sent = 0;
    for (const d of due) {
      const res = await this.publishDraftToChannels(d.id, 'scheduler');
      if (res.ok) sent++;
    }
    return sent;
  }
}
