import type { NotificationType } from "@tpc/database";
import type { Logger } from "../../shared/logger.js";
import type { INotificationRepository } from "./notification.repository.js";
import type { IMessageSender, OutboundOptions } from "./message-sender.js";

export interface SendOnceParams {
  userId: string;
  chatId: number;
  type: NotificationType;
  dedupeKey: string;
  text: string;
  options?: OutboundOptions;
}

/**
 * Отправка «ровно один раз»: сначала резервируем dedupeKey (атомарно в БД),
 * затем шлём. Защищает от двойных пингов при нескольких worker'ах/повторных тиках.
 */
export class NotificationService {
  constructor(
    private readonly repo: INotificationRepository,
    private readonly sender: IMessageSender,
    private readonly logger: Logger,
  ) {}

  async sendOnce(p: SendOnceParams): Promise<boolean> {
    const pending = await this.repo.createPending(p.userId, p.type, p.dedupeKey);
    if (!pending) return false; // уже отправляли — пропускаем

    try {
      await this.sender.sendMessage(p.chatId, p.text, p.options);
      await this.repo.markSent(pending.id);
      return true;
    } catch (err) {
      await this.repo.markFailed(pending.id, String(err));
      this.logger.warn({ err, userId: p.userId, type: p.type }, "Отправка не удалась");
      return false;
    }
  }
}
