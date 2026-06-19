/** Утилиты времени с учётом таймзоны пользователя (без внешних зависимостей). */

/** Локальная дата пользователя в формате YYYY-MM-DD. */
export function getLocalDateString(timezone: string, at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** Локальное время пользователя в формате HH:MM (для напоминаний). */
export function getLocalTimeString(timezone: string, at: Date = new Date()): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(at);
}

/** Локальный час (0..23) пользователя — нужен планировщику рассылок. */
export function getLocalHour(timezone: string, at: Date = new Date()): number {
  const hh = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    hour12: false,
  }).format(at);
  return Number(hh) % 24;
}

/** YYYY-MM-DD → Date (полночь UTC) для хранения в полях @db.Date. */
export function toDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

type Period = "DAY" | "WEEK" | "MONTH" | "YEAR";

/**
 * Якорь периода из локальной даты (YYYY-MM-DD):
 *   DAY → сам день, WEEK → понедельник недели, MONTH → 1-е число, YEAR → 1 января.
 * Возвращает Date (полночь UTC) для хранения в planDate (@db.Date).
 */
export function periodAnchor(period: Period, localDate: string): Date {
  const [y, m, d] = localDate.split("-").map(Number) as [number, number, number];
  const pad = (n: number) => String(n).padStart(2, "0");

  switch (period) {
    case "MONTH":
      return toDateOnly(`${y}-${pad(m)}-01`);
    case "YEAR":
      return toDateOnly(`${y}-01-01`);
    case "WEEK": {
      const dt = new Date(Date.UTC(y, m - 1, d));
      const mondayOffset = (dt.getUTCDay() + 6) % 7; // 0 = понедельник
      dt.setUTCDate(dt.getUTCDate() - mondayOffset);
      return toDateOnly(dt.toISOString().slice(0, 10));
    }
    default:
      return toDateOnly(localDate);
  }
}
