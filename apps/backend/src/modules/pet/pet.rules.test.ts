import { describe, it, expect } from "vitest";
import { applyDecay, boost, selectMoodLabel, stageFor, pickPhrase } from "./pet.rules.js";

const STAGES = [
  { minLevel: 1, emoji: "🥚", title: "Яйцо" },
  { minLevel: 3, emoji: "🐱", title: "Котёнок" },
  { minLevel: 8, emoji: "🐈", title: "Кот" },
];

describe("applyDecay", () => {
  const last = new Date("2026-06-14T00:00:00.000Z");

  it("снижает mood/energy пропорционально часам", () => {
    const now = new Date("2026-06-14T10:00:00.000Z"); // 10ч
    expect(applyDecay(80, 80, last, now)).toEqual({ mood: 70, energy: 65 });
  });

  it("не уходит ниже нуля", () => {
    const now = new Date("2026-06-20T00:00:00.000Z"); // далеко
    expect(applyDecay(80, 80, last, now)).toEqual({ mood: 0, energy: 0 });
  });

  it("без прошедшего времени — без изменений", () => {
    expect(applyDecay(80, 75, last, last)).toEqual({ mood: 80, energy: 75 });
  });
});

describe("boost", () => {
  it("ограничивает диапазон 0..100", () => {
    expect(boost(95, 10)).toBe(100);
    expect(boost(5, -10)).toBe(0);
    expect(boost(50, 10)).toBe(60);
  });
});

describe("selectMoodLabel", () => {
  it("tired при низкой энергии (приоритет)", () => expect(selectMoodLabel(90, 20)).toBe("tired"));
  it("happy / neutral / sad по mood", () => {
    expect(selectMoodLabel(80, 80)).toBe("happy");
    expect(selectMoodLabel(50, 80)).toBe("neutral");
    expect(selectMoodLabel(10, 80)).toBe("sad");
  });
});

describe("stageFor", () => {
  it("берёт наивысшую достигнутую стадию", () => {
    expect(stageFor(STAGES, 1).emoji).toBe("🥚");
    expect(stageFor(STAGES, 5).emoji).toBe("🐱");
    expect(stageFor(STAGES, 12).emoji).toBe("🐈");
  });
  it("fallback при пустых стадиях", () => {
    expect(stageFor([], 5).title).toBe("Питомец");
  });
});

describe("pickPhrase", () => {
  it("берёт реплику из нужной категории", () => {
    expect(["a", "b"]).toContain(pickPhrase({ happy: ["a", "b"] }, "happy"));
  });
  it("fallback на neutral / заглушку", () => {
    expect(pickPhrase({ neutral: ["n"] }, "happy")).toBe("n");
    expect(pickPhrase({}, "happy")).toBe("…");
  });
});
