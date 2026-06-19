export interface ParsedTask {
  title: string;
  description?: string;
}

/**
 * Эвристический парсер плана дня (без LLM — дёшево и быстро на масштабе).
 * Понимает списки по строкам с маркерами: "-", "*", "•", "1.", "1)", "[ ]", эмодзи.
 * "Заголовок — описание" / "Заголовок: описание" разбивается на title + description.
 */
export class TaskParser {
  private static readonly MAX_TASKS = 50;
  private static readonly MAX_TITLE = 200;
  private static readonly BULLET = /^\s*(?:[-*•·–]|\d+[.)]|\[\s?\]|✅|☑️|✔️|▫️|◦)\s+/u;

  parse(raw: string): ParsedTask[] {
    if (!raw?.trim()) return [];

    const seen = new Set<string>();
    const tasks: ParsedTask[] = [];

    for (const lineRaw of raw.split(/\r?\n/)) {
      let line = lineRaw.replace(TaskParser.BULLET, "").trim();
      if (!line) continue;

      let description: string | undefined;
      const sep = line.match(/\s+[—–-]\s+|:\s+/);
      const sepFull = sep?.[0];
      if (sep && sepFull && sep.index !== undefined && sep.index > 0) {
        description = line.slice(sep.index + sepFull.length).trim() || undefined;
        line = line.slice(0, sep.index).trim();
      }

      const title = line.slice(0, TaskParser.MAX_TITLE).trim();
      if (!title) continue;

      const key = title.toLowerCase();
      if (seen.has(key)) continue; // дедуп
      seen.add(key);

      tasks.push(description ? { title, description } : { title });
      if (tasks.length >= TaskParser.MAX_TASKS) break;
    }

    return tasks;
  }
}
