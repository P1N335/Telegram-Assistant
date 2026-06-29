import type { Skill } from "@tpc/database";
import { SKILL_XP_REWARDS, levelFromXp, type RewindSkillDto } from "@tpc/shared";

/**
 * Чистая логика месячного ревайнда (без БД и времени-в-рантайме) — изолированно тестируема.
 * Источники роста скиллов зеркалят skills/register.ts: задача за выполнение даёт
 * фиксированный SKILL_XP_REWARDS.TASK_COMPLETED, привычка — собственный xpReward.
 */

const pad2 = (n: number): string => String(n).padStart(2, "0");

/** Якорь предыдущего месяца относительно локальной даты YYYY-MM-DD. */
export interface PreviousMonth {
  year: number; // год отчётного (предыдущего) месяца
  month: number; // 1..12
  anchor: string; // первый день отчётного месяца, YYYY-MM-01
  nextAnchor: string; // первый день месяца, следующего за отчётным (граница [start,end))
  label: string; // "YYYY-MM" отчётного месяца (для dedupeKey и DTO.month)
}

/**
 * По локальной дате (обычно 1-е число текущего месяца, локальная полночь) возвращает
 * якоря ПРЕДЫДУЩЕГО месяца. Чистая арифметика над YYYY-MM-DD, без Date/таймзон.
 */
export function previousMonthAnchor(localDate: string): PreviousMonth {
  const [y, m] = localDate.split("-").map(Number) as [number, number, number];
  const year = m === 1 ? y - 1 : y;
  const month = m === 1 ? 12 : m - 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return {
    year,
    month,
    anchor: `${year}-${pad2(month)}-01`,
    nextAnchor: `${nextYear}-${pad2(nextMonth)}-01`,
    label: `${year}-${pad2(month)}`,
  };
}

/** Сырые блоки агрегата из репозитория (DB-сцепленная часть). */
export interface RewindRaw {
  tasksCompleted: number;
  /** Кол-во выполненных за месяц задач, сгруппированных по скиллу (skillCode != null). */
  taskSkillCounts: Array<{ skillCode: string; count: number }>;
  /** Отметки привычек за месяц со скиллом и наградой самой привычки. */
  habitCompletions: Array<{ skillCode: string | null; xpReward: number }>;
}

/** Ревайнд считается пустым (не шлём), если за месяц не было ни задач, ни привычек. */
export function isEmptyRewind(raw: RewindRaw): boolean {
  return raw.tasksCompleted === 0 && raw.habitCompletions.length === 0;
}

/**
 * XP, начисленный скиллам за месяц, по коду скилла. Зеркало правил начисления:
 *   задача → +SKILL_XP_REWARDS.TASK_COMPLETED за каждое выполнение в месяце;
 *   привычка → +xpReward за каждую отметку.
 * Приближение: повторные выполнения одной задачи в месяце скиллу XP не дают (начисление
 * только за первое), но в агрегате каждая completedAt учитывается — редкий случай, отмечен.
 */
export function skillXpGains(raw: RewindRaw): Map<string, number> {
  const gains = new Map<string, number>();
  const add = (code: string, xp: number) => {
    if (xp > 0) gains.set(code, (gains.get(code) ?? 0) + xp);
  };
  for (const t of raw.taskSkillCounts) add(t.skillCode, t.count * SKILL_XP_REWARDS.TASK_COMPLETED);
  for (const h of raw.habitCompletions) if (h.skillCode) add(h.skillCode, h.xpReward);
  return gains;
}

/**
 * Топ скиллов месяца: по набранному XP (убыв.), затем по уровню/имени для стабильности.
 * Имя/иконка/уровень берутся из текущих скиллов пользователя; скиллы без роста и без
 * соответствующей записи (код есть в gains, но скилл не добавлен) отбрасываются.
 */
export function topSkills(gains: Map<string, number>, skills: Skill[], limit: number): RewindSkillDto[] {
  const byCode = new Map(skills.map((s) => [s.code, s]));
  const rows: RewindSkillDto[] = [];
  for (const [code, xpGained] of gains) {
    const s = byCode.get(code);
    if (!s || xpGained <= 0) continue;
    rows.push({ code, name: s.name, icon: s.icon, level: levelFromXp(s.xp), xpGained });
  }
  rows.sort(
    (a, b) => b.xpGained - a.xpGained || b.level - a.level || a.name.localeCompare(b.name),
  );
  return rows.slice(0, Math.max(0, limit));
}

/** Суммарный рост XP по всем скиллам за месяц. */
export function totalSkillXpGained(gains: Map<string, number>): number {
  let total = 0;
  for (const xp of gains.values()) total += xp;
  return total;
}
