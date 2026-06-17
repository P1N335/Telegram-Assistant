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
