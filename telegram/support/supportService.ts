/**
 * ASAKA ZIYO — Two-Way Confidential Support & Imam Inquiry Ticket System
 *
 * Allows users to submit tickets (`TKT-...`) with categories, priority,
 * text & media attachments (`photo`, `video`, `audio`, `voice`, `document`),
 * and enables Admins/Support Managers to inspect, assign, reply directly
 * back to the user's Telegram chat, and close tickets.
 */

import crypto from 'crypto';
import {
  TelegramLocale,
  TelegramSupportMessageEntry,
  TelegramSupportPriority,
  TelegramSupportStatus,
  TelegramSupportTicketCategory,
  TelegramSupportTicketRecord,
  TelegramUserRecord,
} from '../types';
import { TelegramRepository } from '../database/telegramRepository';
import { TelegramApiClient } from '../api/telegramApiClient';
import { CustomEmojiRegistry } from '../emoji/customEmojiRegistry';
import { getTelegramLocaleBundle } from '../locales';
import { buildSupportTicketUserReplyKeyboard } from '../keyboards/keyboards';

export class TelegramSupportService {
  private readonly repo: TelegramRepository;
  private readonly apiClient: TelegramApiClient;
  private readonly emojiRegistry: CustomEmojiRegistry;

  constructor(
    repo: TelegramRepository,
    apiClient: TelegramApiClient,
    emojiRegistry: CustomEmojiRegistry
  ) {
    this.repo = repo;
    this.apiClient = apiClient;
    this.emojiRegistry = emojiRegistry;
  }

  private generateTicketId(): string {
    return `TKT-${Date.now().toString(36).toUpperCase().slice(-5)}-${crypto
      .randomBytes(2)
      .toString('hex')
      .toUpperCase()}`;
  }

  async createTicket(params: {
    user: TelegramUserRecord;
    category: TelegramSupportTicketCategory;
    subject: string;
    text: string;
    priority?: TelegramSupportPriority;
    mediaType?: TelegramSupportMessageEntry['mediaType'];
    telegramFileId?: string;
    notifyAdmins?: string[];
  }): Promise<TelegramSupportTicketRecord> {
    const nowIso = new Date().toISOString();
    const id = this.generateTicketId();
    const userName = [params.user.firstName, params.user.lastName].filter(Boolean).join(' ');

    const ticket: TelegramSupportTicketRecord = {
      id,
      userId: params.user.telegramId,
      userName: params.user.username ? `${userName} (@${params.user.username})` : userName,
      userLanguage: params.user.language,
      category: params.category,
      priority: params.priority || (params.category === 'prayer_issue' ? 'high' : 'normal'),
      status: 'new',
      subject: params.subject.slice(0, 140),
      messages: [
        {
          id: `msg_${Date.now().toString(36)}`,
          senderRole: 'user',
          senderId: params.user.telegramId,
          senderName: userName,
          text: params.text.slice(0, 2000),
          mediaType: params.mediaType,
          telegramFileId: params.telegramFileId,
          createdAt: nowIso,
        },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await this.repo.saveSupportTicket(ticket);
    await this.repo.appendAuditLog({
      actorTelegramId: params.user.telegramId,
      actorRole: 'user',
      action: 'support_ticket_created',
      targetType: 'support',
      targetId: id,
      metadata: { category: params.category, priority: ticket.priority },
    });

    // Notify designated admins/moderators if Telegram API is active
    if (params.notifyAdmins && params.notifyAdmins.length > 0 && this.apiClient.isConfigured) {
      const notice = this.emojiRegistry.formatMessage(
        `{{emoji:support}} Yangi murojaat [${ticket.id}]\n` +
          `{{emoji:profile}} ${ticket.userName} (ID: ${ticket.userId})\n` +
          `{{emoji:support}} Kategoriya: ${ticket.category} | Ustuvorlik: ${ticket.priority}\n\n` +
          `${params.text.slice(0, 600)}\n\n` +
          `Javob berish uchun /admin -> Murojaatlar boʻlimiga kiring.`
      );
      for (const adminId of params.notifyAdmins.slice(0, 5)) {
        await this.apiClient.sendMessage({
          chat_id: adminId,
          text: notice.text,
          ...(notice.entities.length > 0 ? { entities: notice.entities } : {}),
        });
      }
    }

    return ticket;
  }

  async addUserReply(params: {
    ticketId: string;
    user: TelegramUserRecord;
    text: string;
    mediaType?: TelegramSupportMessageEntry['mediaType'];
    telegramFileId?: string;
  }): Promise<TelegramSupportTicketRecord | null> {
    const ticket = this.repo.getSupportTicket(params.ticketId);
    if (!ticket || ticket.userId !== params.user.telegramId) return null;
    const nowIso = new Date().toISOString();
    const userName = [params.user.firstName, params.user.lastName].filter(Boolean).join(' ');

    ticket.messages.push({
      id: `msg_${Date.now().toString(36)}`,
      senderRole: 'user',
      senderId: params.user.telegramId,
      senderName: userName,
      text: params.text.slice(0, 2000),
      mediaType: params.mediaType,
      telegramFileId: params.telegramFileId,
      createdAt: nowIso,
    });
    if (ticket.status === 'answered' || ticket.status === 'closed') {
      ticket.status = 'in_progress';
    }
    ticket.updatedAt = nowIso;
    await this.repo.saveSupportTicket(ticket);
    return ticket;
  }

  async replyFromAdmin(params: {
    ticketId: string;
    adminId: string;
    adminName: string;
    replyText: string;
    markStatus?: TelegramSupportStatus;
  }): Promise<{
    ok: boolean;
    ticket?: TelegramSupportTicketRecord;
    deliveredToUser: boolean;
    error?: string;
  }> {
    const ticket = this.repo.getSupportTicket(params.ticketId);
    if (!ticket) {
      return { ok: false, deliveredToUser: false, error: 'Ticket topilmadi.' };
    }

    const nowIso = new Date().toISOString();
    ticket.messages.push({
      id: `msg_${Date.now().toString(36)}`,
      senderRole: 'admin',
      senderId: params.adminId,
      senderName: params.adminName,
      text: params.replyText.slice(0, 2000),
      createdAt: nowIso,
    });
    ticket.assignedTo = ticket.assignedTo || params.adminId;
    ticket.status = params.markStatus || 'answered';
    if (ticket.status === 'closed') ticket.closedAt = nowIso;
    ticket.updatedAt = nowIso;

    await this.repo.saveSupportTicket(ticket);
    await this.repo.appendAuditLog({
      actorTelegramId: params.adminId,
      actorRole: 'admin',
      action: 'support_ticket_replied',
      targetType: 'support',
      targetId: ticket.id,
      metadata: { targetUserId: ticket.userId, status: ticket.status },
    });

    // Deliver directly to the exact user in their preferred language
    const userLocale: TelegramLocale =
      this.repo.getUser(ticket.userId)?.language || ticket.userLanguage || 'uz-Latn';
    const dict = getTelegramLocaleBundle(userLocale);
    const formatted = this.emojiRegistry.formatMessage(
      `${dict.supportReplyHeader} [${ticket.id}]\n\n${params.replyText}`
    );

    const sendRes = await this.apiClient.sendMessage({
      chat_id: ticket.userId,
      text: formatted.text,
      ...(formatted.entities.length > 0 ? { entities: formatted.entities } : {}),
      reply_markup: buildSupportTicketUserReplyKeyboard(userLocale, ticket.id, this.emojiRegistry),
    });

    return {
      ok: true,
      ticket,
      deliveredToUser: sendRes.ok,
      error: sendRes.ok ? undefined : sendRes.description,
    };
  }

  async updateTicketStatus(
    ticketId: string,
    adminId: string,
    status: TelegramSupportStatus,
    assignedTo?: string
  ): Promise<TelegramSupportTicketRecord | null> {
    const ticket = this.repo.getSupportTicket(ticketId);
    if (!ticket) return null;
    ticket.status = status;
    if (assignedTo !== undefined) ticket.assignedTo = assignedTo;
    if (status === 'closed') ticket.closedAt = new Date().toISOString();
    ticket.updatedAt = new Date().toISOString();
    await this.repo.saveSupportTicket(ticket);
    await this.repo.appendAuditLog({
      actorTelegramId: adminId,
      actorRole: 'admin',
      action: 'support_ticket_status_updated',
      targetType: 'support',
      targetId: ticketId,
      metadata: { status },
    });
    return ticket;
  }

  listUserTickets(userId: string): TelegramSupportTicketRecord[] {
    return this.repo.listSupportTickets().filter((t) => t.userId === userId);
  }

  listAllTickets(status?: TelegramSupportStatus): TelegramSupportTicketRecord[] {
    const all = this.repo.listSupportTickets();
    return status ? all.filter((t) => t.status === status) : all;
  }
}
