import type { Notification, NotificationType } from "@tpc/database";

/** Контракт доступа к уведомлениям (DIP). */
export interface INotificationRepository {
  /**
   * Создаёт PENDING-уведомление с уникальным dedupeKey.
   * Возвращает null, если запись с таким ключом уже существует (идемпотентность рассылок).
   */
  createPending(userId: string, type: NotificationType, dedupeKey: string): Promise<Notification | null>;
  markSent(id: string): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
}
