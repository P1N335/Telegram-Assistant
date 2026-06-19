import { describe, it, expect } from "vitest";
import { periodAnchor, toDateOnly } from "./time.js";

const iso = (d: Date) => d.toISOString().slice(0, 10);

describe("periodAnchor", () => {
  it("DAY — сам день", () => {
    expect(iso(periodAnchor("DAY", "2026-06-19"))).toBe("2026-06-19");
  });
  it("MONTH — первое число", () => {
    expect(iso(periodAnchor("MONTH", "2026-06-19"))).toBe("2026-06-01");
  });
  it("YEAR — первое января", () => {
    expect(iso(periodAnchor("YEAR", "2026-06-19"))).toBe("2026-01-01");
  });
  it("WEEK — понедельник той же недели", () => {
    const anchor = periodAnchor("WEEK", "2026-06-19");
    expect(anchor.getUTCDay()).toBe(1); // 1 = понедельник
    const diffDays = (toDateOnly("2026-06-19").getTime() - anchor.getTime()) / 86_400_000;
    expect(diffDays).toBeGreaterThanOrEqual(0);
    expect(diffDays).toBeLessThan(7);
  });
});
