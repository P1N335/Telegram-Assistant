import { describe, it, expect } from "vitest";
import { totalXpForLevel, levelFromXp, levelProgress } from "./leveling.js";

describe("leveling", () => {
  it("уровень 1 при 0 XP", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(totalXpForLevel(1)).toBe(0);
  });

  it("пороги монотонно растут", () => {
    expect(totalXpForLevel(2)).toBeGreaterThan(totalXpForLevel(1));
    expect(totalXpForLevel(3)).toBeGreaterThan(totalXpForLevel(2));
    expect(totalXpForLevel(10)).toBeGreaterThan(totalXpForLevel(9));
  });

  it("levelFromXp согласован с порогами", () => {
    const xp5 = totalXpForLevel(5);
    expect(levelFromXp(xp5)).toBe(5);
    expect(levelFromXp(xp5 - 1)).toBe(4);
    expect(levelFromXp(xp5 + 1)).toBe(5);
  });

  it("levelProgress остаётся в [0,1] и согласован по уровню", () => {
    for (const xp of [0, 50, 100, 333, 1500]) {
      const p = levelProgress(xp);
      expect(p.ratio).toBeGreaterThanOrEqual(0);
      expect(p.ratio).toBeLessThanOrEqual(1);
      expect(p.level).toBe(levelFromXp(xp));
      expect(p.nextLevelXp).toBe(totalXpForLevel(p.level + 1));
    }
  });
});
