import type { Subscription, SubscriptionPlan, SubscriptionProvider } from "@tpc/database";
import { PLAN_FEATURES, type PremiumFeature, type PremiumStatusDto } from "@tpc/shared";
import { now } from "../../shared/clock.js";
import type { ISubscriptionRepository } from "./subscription.repository.js";

export interface GrantOptions {
  plan?: SubscriptionPlan;
  until?: Date | null;
  provider?: SubscriptionProvider;
  externalId?: string | null;
}

/**
 * Единая точка проверки доступа к платным фичам.
 * Доступ выводится из плана подписки (PLAN_FEATURES). Никаких разбросанных isPremium.
 */
export class EntitlementService {
  constructor(private readonly repo: ISubscriptionRepository) {}

  async getStatus(userId: string): Promise<PremiumStatusDto> {
    const sub = await this.repo.findByUserId(userId);
    const active = EntitlementService.isActive(sub);
    const plan: SubscriptionPlan = active && sub ? sub.plan : "FREE";
    return {
      plan,
      active,
      until: sub?.currentPeriodEnd?.toISOString() ?? null,
      features: PLAN_FEATURES[plan],
    };
  }

  async hasFeature(userId: string, feature: PremiumFeature): Promise<boolean> {
    const status = await this.getStatus(userId);
    return status.features.includes(feature);
  }

  /** Выдать/продлить подписку (вызовет admin-эндпоинт или, в будущем, платёжный вебхук). */
  async grant(userId: string, opts: GrantOptions = {}): Promise<void> {
    await this.repo.upsert(userId, {
      plan: opts.plan ?? "PREMIUM",
      status: "ACTIVE",
      provider: opts.provider ?? "MANUAL",
      currentPeriodEnd: opts.until ?? null,
      externalId: opts.externalId ?? null,
    });
  }

  async revoke(userId: string): Promise<void> {
    await this.repo.setStatus(userId, "CANCELED");
  }

  static isActive(sub: Subscription | null): boolean {
    if (!sub) return false;
    if (sub.status !== "ACTIVE" && sub.status !== "TRIAL") return false;
    if (sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() < now().getTime()) return false;
    return true;
  }
}
