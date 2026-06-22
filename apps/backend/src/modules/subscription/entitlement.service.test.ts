import { describe, it, expect } from "vitest";
import { EntitlementService } from "./entitlement.service.js";
import type { ISubscriptionRepository } from "./subscription.repository.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sub = (over: Record<string, unknown> = {}): any => ({
  id: "s",
  userId: "u",
  plan: "PREMIUM",
  status: "ACTIVE",
  provider: "MANUAL",
  externalId: null,
  currentPeriodEnd: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
});

const repo = (found: ReturnType<typeof sub> | null): ISubscriptionRepository => ({
  findByUserId: async () => found,
  upsert: async () => sub(),
  setStatus: async () => undefined,
});

describe("EntitlementService.isActive", () => {
  it("нет подписки → false", () => expect(EntitlementService.isActive(null)).toBe(false));
  it("ACTIVE без срока → true", () => expect(EntitlementService.isActive(sub())).toBe(true));
  it("истёкший срок → false", () =>
    expect(EntitlementService.isActive(sub({ currentPeriodEnd: new Date(Date.now() - 1000) }))).toBe(false));
  it("будущий срок → true", () =>
    expect(EntitlementService.isActive(sub({ currentPeriodEnd: new Date(Date.now() + 1_000_000) }))).toBe(true));
  it("CANCELED → false", () => expect(EntitlementService.isActive(sub({ status: "CANCELED" }))).toBe(false));
});

describe("EntitlementService.getStatus", () => {
  it("нет подписки → FREE без фич", async () => {
    const status = await new EntitlementService(repo(null)).getStatus("u");
    expect(status.plan).toBe("FREE");
    expect(status.active).toBe(false);
    expect(status.features).toEqual([]);
  });

  it("активная PREMIUM → фичи плана", async () => {
    const status = await new EntitlementService(repo(sub())).getStatus("u");
    expect(status.plan).toBe("PREMIUM");
    expect(status.active).toBe(true);
    expect(status.features).toContain("PET_CUSTOMIZATION");
  });

  it("истёкшая PREMIUM → FREE без фич", async () => {
    const expired = repo(sub({ currentPeriodEnd: new Date(Date.now() - 1000) }));
    const status = await new EntitlementService(expired).getStatus("u");
    expect(status.plan).toBe("FREE");
    expect(status.features).toEqual([]);
  });
});
