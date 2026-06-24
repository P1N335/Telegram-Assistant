import { describe, it, expect } from "vitest";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  isLocale,
  resolveLocale,
  interpolate,
} from "./i18n.js";

describe("i18n mechanism", () => {
  it("ru — язык по умолчанию", () => {
    expect(DEFAULT_LOCALE).toBe("ru");
    expect(SUPPORTED_LOCALES).toContain("ru");
    expect(SUPPORTED_LOCALES).toContain("en");
  });

  it("isLocale распознаёт только поддержанные", () => {
    expect(isLocale("ru")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("de")).toBe(false);
    expect(isLocale("")).toBe(false);
  });

  it("resolveLocale выбирает по первичному сабтегу", () => {
    expect(resolveLocale("ru")).toBe("ru");
    expect(resolveLocale("en")).toBe("en");
    expect(resolveLocale("en-US")).toBe("en");
    expect(resolveLocale("ru-RU")).toBe("ru");
    expect(resolveLocale("EN_GB")).toBe("en");
  });

  it("resolveLocale фолбэк на ru для неизвестных/пустых", () => {
    expect(resolveLocale("de")).toBe("ru");
    expect(resolveLocale("uk")).toBe("ru");
    expect(resolveLocale("")).toBe("ru");
    expect(resolveLocale(undefined)).toBe("ru");
    expect(resolveLocale(null)).toBe("ru");
  });

  it("interpolate подставляет плейсхолдеры", () => {
    expect(interpolate("Уровень {level}", { level: 3 })).toBe("Уровень 3");
    expect(interpolate("{a} из {b}", { a: 2, b: 10 })).toBe("2 из 10");
    expect(interpolate("без параметров")).toBe("без параметров");
    expect(interpolate("{unknown} остаётся", {})).toBe("{unknown} остаётся");
  });
});
