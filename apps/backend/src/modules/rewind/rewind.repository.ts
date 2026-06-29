import type { RewindRaw } from "./rewind.rules.js";

/**
 * Границы отчётного месяца. Два типа границ, т.к. поля хранятся по-разному:
 *  - tsStart/tsEnd — UTC-инстанты локальных границ месяца, для Task.completedAt (timestamptz);
 *  - dateStart/dateEnd — полночь-UTC дат YYYY-MM-01, для HabitCompletion.date (@db.Date).
 */
export interface RewindRange {
  tsStart: Date;
  tsEnd: Date;
  dateStart: Date;
  dateEnd: Date;
}

/** Доступ к агрегатам месячного ревайнда (DIP). Реализация — PrismaRewindRepository. */
export interface IRewindRepository {
  /** Сырые агрегаты за месяц для одного пользователя (счётчики + источники роста скиллов). */
  aggregateMonth(userId: string, range: RewindRange): Promise<RewindRaw>;
}
