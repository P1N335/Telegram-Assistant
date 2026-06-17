import { describe, it, expect } from "vitest";
import { TaskParser } from "./task.parser.js";

const parser = new TaskParser();

describe("TaskParser", () => {
  it("разбивает список по строкам и убирает маркеры", () => {
    const tasks = parser.parse("- Закончить диплом\n* Провести занятие\n1. Сходить в зал");
    expect(tasks.map((t) => t.title)).toEqual(["Закончить диплом", "Провести занятие", "Сходить в зал"]);
  });

  it("игнорирует пустые строки и пробелы", () => {
    expect(parser.parse("\n\n  \nЗадача\n  ")).toEqual([{ title: "Задача" }]);
  });

  it("дедуплицирует без учёта регистра", () => {
    const tasks = parser.parse("Зал\nзал\nЗАЛ");
    expect(tasks).toHaveLength(1);
  });

  it("разбивает заголовок и описание", () => {
    expect(parser.parse("Диплом — написать главу 3")).toEqual([
      { title: "Диплом", description: "написать главу 3" },
    ]);
    expect(parser.parse("Зал: ноги")).toEqual([{ title: "Зал", description: "ноги" }]);
  });

  it("пустой ввод → пустой список", () => {
    expect(parser.parse("")).toEqual([]);
    expect(parser.parse("   ")).toEqual([]);
  });

  it("ограничивает количество задач (50)", () => {
    const many = Array.from({ length: 80 }, (_, i) => `Задача ${i}`).join("\n");
    expect(parser.parse(many)).toHaveLength(50);
  });
});
