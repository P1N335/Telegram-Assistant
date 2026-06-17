import { Prisma, type Notification, type NotificationType, type PrismaClient } from "@tpc/database";
import type { INotificationRepository } from "./notification.repository.js";

export class PrismaNotificationRepository implements INotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createPending(
    userId: string,
    type: NotificationType,
    dedupeKey: string,
  ): Promise<Notification | null> {
    try {
      return await this.prisma.notification.create({
        data: { userId, type, dedupeKey, status: "PENDING" },
      });
    } catch (err) {
      // P2002 = нарушение unique(dedupeKey) → уведомление уже создано, дубль не шлём.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return null;
      }
      throw err;
    }
  }

  async markSent(id: string): Promise<void> {
    await this.prisma.notification.update({ where: { id }, data: { status: "SENT", sentAt: new Date() } });
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.prisma.notification.update({
      where: { id },
      data: { status: "FAILED", error: error.slice(0, 500) },
    });
  }
}
