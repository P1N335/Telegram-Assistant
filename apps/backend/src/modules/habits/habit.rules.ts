import type { HabitCadence } from "@tpc/shared";

/** Чистые правила расписания привычек — тестируются без БД. */

/** ISO-день недели локальной даты: 1=Пн .. 7=Вс. */
export function isoWeekday(localDate: string): number {
  const d = new Date(`${localDate}T00:00:00.000Z`);
  return ((d.getUTCDay() + 6) % 7) + 1;
}

/** Количество полных дней между двумя локальными датами (to - from). */
export function daysBetween(fromStr: string, toStr: string): number {
  const a = new Date(`${fromStr}T00:00:00.000Z`).getTime();
  const b = new Date(`${toStr}T00:00:00.000Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

export interface HabitSchedule {
  cadence: HabitCadence;
  intervalDays: number | null;
  weekdays: number[];
  startDate: string; // YYYY-MM-DD
}

/** Нужно ли выполнять привычку в указанный локальный день. */
export function isDueOn(h: HabitSchedule, localDate: string): boolean {
  switch (h.cadence) {
    case "DAILY":
      return true;
    case "EVERY_N_DAYS": {
      const n = h.intervalDays ?? 1;
      if (n <= 0) return false;
      const diff = daysBetween(h.startDate, localDate);
      return diff >= 0 && diff % n === 0;
    }
    case "WEEKLY":
      return h.weekdays.includes(isoWeekday(localDate));
    default:
      return false;
  }
}
