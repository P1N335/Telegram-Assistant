import type { Subscription, SubscriptionPlan, SubscriptionProvider, SubscriptionStatus } from "@tpc/database";

export interface UpsertSubscriptionData {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  provider: SubscriptionProvider;
  currentPeriodEnd: Date | null;
  externalId?: string | null;
}

export interface ISubscriptionRepository {
  findByUserId(userId: string): Promise<Subscription | null>;
  upsert(userId: string, data: UpsertSubscriptionData): Promise<Subscription>;
  setStatus(userId: string, status: SubscriptionStatus): Promise<void>;
}
