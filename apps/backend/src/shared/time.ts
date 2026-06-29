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

/**
 * Локальное время пользователя как zero-padded "HH:MM" (00:00..23:59).
 * Лексикографически сравнимо с `Habit.timeOfDay` → используется планировщиком для
 * оконной выборки привычек по времени дня. hourCycle h23 + `%24` страхуют от "24:00".
 */
export function getLocalHhmm(timezone: string, at: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const hh = String(Number(get("hour")) % 24).padStart(2, "0");
  return `${hh}:${get("minute")}`;
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

// ── Диапазон периода как абсолютные UTC-инстанты (для фильтра по dueDate) ──

function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function mondayStr(dateStr: string): string {
  return periodAnchor("WEEK", dateStr).toISOString().slice(0, 10);
}

/** Смещение таймзоны (минуты) для конкретного инстанта. */
function tzOffsetMinutes(timezone: string, at: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p = Object.fromEntries(dtf.formatToParts(at).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year!, +p.month! - 1, +p.day!, +p.hour!, +p.minute!, +p.second!);
  return (asUtc - at.getTime()) / 60000;
}

/** Локальное «настенное» время (YYYY-MM-DDTHH:mm:ss) в таймзоне → UTC-инстант. */
function zonedTimeToUtc(wallClock: string, timezone: string): Date {
  const naive = new Date(`${wallClock}Z`);
  const offset = tzOffsetMinutes(timezone, naive);
  return new Date(naive.getTime() - offset * 60000);
}

/** Локальная дата (YYYY-MM-DD) + время (HH:MM) в таймзоне → UTC-инстант. */
export function localDateTimeToUtc(localDate: string, timeHHMM: string, timezone: string): Date {
  return zonedTimeToUtc(`${localDate}T${timeHHMM}:00`, timezone);
}

/** Сдвиг локальной даты YYYY-MM-DD на n дней (n может быть отрицательным). */
export function addLocalDays(dateStr: string, n: number): string {
  return addDaysStr(dateStr, n);
}

/**
 * Полуинтервал [start, end) периода, содержащего localDate, в виде UTC-инстантов —
 * границы соответствуют локальной полуночи пользователя. Используется для фильтра dueDate.
 */
export function periodRange(period: Period, timezone: string, localDate: string): { start: Date; end: Date } {
  const [y, m] = localDate.split("-").map(Number) as [number, number, number];
  const pad = (n: number) => String(n).padStart(2, "0");

  let startStr: string;
  let endStr: string;
  switch (period) {
    case "WEEK": {
      startStr = mondayStr(localDate);
      endStr = addDaysStr(startStr, 7);
      break;
    }
    case "MONTH": {
      startStr = `${y}-${pad(m)}-01`;
      endStr = m === 12 ? `${y + 1}-01-01` : `${y}-${pad(m + 1)}-01`;
      break;
    }
    case "YEAR": {
      startStr = `${y}-01-01`;
      endStr = `${y + 1}-01-01`;
      break;
    }
    default: {
      startStr = localDate;
      endStr = addDaysStr(localDate, 1);
    }
  }

  return {
    start: zonedTimeToUtc(`${startStr}T00:00:00`, timezone),
    end: zonedTimeToUtc(`${endStr}T00:00:00`, timezone),
  };
}
