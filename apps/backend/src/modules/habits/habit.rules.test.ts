import { describe, it, expect } from "vitest";
import { isDueOn, isoWeekday, daysBetween, type HabitSchedule } from "./habit.rules.js";

describe("isoWeekday", () => {
  it("понедельник = 1, воскресенье = 7", () => {
    expect(isoWeekday("2026-06-15")).toBe(1); // Пн
    expect(isoWeekday("2026-06-21")).toBe(7); // Вс
  });
});

describe("daysBetween", () => {
  it("считает дни", () => {
    expect(daysBetween("2026-06-19", "2026-06-21")).toBe(2);
    expect(daysBetween("2026-06-21", "2026-06-19")).toBe(-2);
  });
});

describe("isDueOn", () => {
  const base: HabitSchedule = { cadence: "DAILY", intervalDays: null, weekdays: [], startDate: "2026-06-19" };

  it("DAILY — всегда", () => {
    expect(isDueOn(base, "2026-06-19")).toBe(true);
    expect(isDueOn(base, "2026-07-01")).toBe(true);
  });

  it("EVERY_N_DAYS — каждые 2 дня от старта", () => {
    const h: HabitSchedule = { ...base, cadence: "EVERY_N_DAYS", intervalDays: 2 };
    expect(isDueOn(h, "2026-06-19")).toBe(true); // diff 0
    expect(isDueOn(h, "2026-06-20")).toBe(false); // diff 1
    expect(isDueOn(h, "2026-06-21")).toBe(true); // diff 2
  });

  it("WEEKLY — только в выбранные дни", () => {
    const h: HabitSchedule = { ...base, cadence: "WEEKLY", weekdays: [1, 3] }; // Пн, Ср
    expect(isDueOn(h, "2026-06-15")).toBe(true); // Пн
    expect(isDueOn(h, "2026-06-16")).toBe(false); // Вт
    expect(isDueOn(h, "2026-06-17")).toBe(true); // Ср
  });
});
