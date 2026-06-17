import { describe, it, expect } from "vitest";
import type { Achievement } from "@tpc/database";
import { previousDate, nextStreak, runningAverage, meetsCriteria } from "./gamification.rules.js";
import type { AchievementContext } from "./gamification.rules.js";

describe("previousDate", () => {
  it("возвращает предыдущий день (учёт месяца)", () => {
    expect(previousDate("2026-06-14")).toBe("2026-06-13");
    expect(previousDate("2026-07-01")).toBe("2026-06-30");
  });
});

describe("nextStreak", () => {
  it("активность в тот же день не меняет streak", () => {
    expect(nextStreak(3, 5, "2026-06-14", "2026-06-14")).toEqual({
      currentStreak: 3,
      longestStreak: 5,
      isNewActiveDay: false,
    });
  });

  it("вчера → +1 и обновляет рекорд", () => {
    expect(nextStreak(5, 5, "2026-06-13", "2026-06-14")).toEqual({
      currentStreak: 6,
      longestStreak: 6,
      isNewActiveDay: true,
    });
  });

  it("пропуск дня → сброс к 1", () => {
    expect(nextStreak(7, 9, "2026-06-10", "2026-06-14")).toEqual({
      currentStreak: 1,
      longestStreak: 9,
      isNewActiveDay: true,
    });
  });

  it("первая активность (null)", () => {
    expect(nextStreak(0, 0, null, "2026-06-14")).toEqual({
      currentStreak: 1,
      longestStreak: 1,
      isNewActiveDay: true,
    });
  });
});

describe("runningAverage", () => {
  it("первое значение", () => expect(runningAverage(null, 0, 8)).toBe(8));
  it("скользящее среднее", () => expect(runningAverage(8, 1, 6)).toBe(7));
});

describe("meetsCriteria", () => {
  const ctx: AchievementContext = {
    level: 10,
    currentStreak: 7,
    plansCreated: 2,
    reflectionsDone: 1,
    tasksCompleted: 50,
  };
  const ach = (p: Partial<Achievement>): Achievement => ({ threshold: null, ...p } as Achievement);

  it("streak / level / tasks по порогу", () => {
    expect(meetsCriteria(ach({ category: "streak", threshold: 7 }), ctx)).toBe(true);
    expect(meetsCriteria(ach({ category: "streak", threshold: 30 }), ctx)).toBe(false);
    expect(meetsCriteria(ach({ category: "level", threshold: 10 }), ctx)).toBe(true);
    expect(meetsCriteria(ach({ category: "tasks", code: "tasks_50", threshold: 50 }), ctx)).toBe(true);
  });

  it("first_plan и reflection", () => {
    expect(meetsCriteria(ach({ category: "tasks", code: "first_plan" }), ctx)).toBe(true);
    expect(meetsCriteria(ach({ category: "reflection", threshold: 1 }), ctx)).toBe(true);
  });

  it("perfect_day не выдаётся по метрикам (только через DayCompleted)", () => {
    expect(meetsCriteria(ach({ category: "tasks", code: "perfect_day" }), ctx)).toBe(false);
  });
});
