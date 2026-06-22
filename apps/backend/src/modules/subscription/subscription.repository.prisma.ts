import type { PrismaClient, Subscription, SubscriptionStatus } from "@tpc/database";
import type { ISubscriptionRepository, UpsertSubscriptionData } from "./subscription.repository.js";

export class PrismaSubscriptionRepository implements ISubscriptionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByUserId(userId: string): Promise<Subscription | null> {
    return this.prisma.subscription.findUnique({ where: { userId } });
  }

  upsert(userId: string, data: UpsertSubscriptionData): Promise<Subscription> {
    const payload = {
      plan: data.plan,
      status: data.status,
      provider: data.provider,
      currentPeriodEnd: data.currentPeriodEnd,
      externalId: data.externalId ?? null,
    };
    return this.prisma.subscription.upsert({
      where: { userId },
      create: { userId, ...payload },
      update: payload,
    });
  }

  async setStatus(userId: string, status: SubscriptionStatus): Promise<void> {
    await this.prisma.subscription.update({ where: { userId }, data: { status } });
  }
}
