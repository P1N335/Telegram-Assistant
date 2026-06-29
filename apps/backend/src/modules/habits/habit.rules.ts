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

// ── Окно напоминаний о привычках (для оконной выборки под масштаб) ──
//
// Раньше планировщик грузил ВСЕ активные привычки каждые 5 минут и фильтровал в
// памяти — под десятки тысяч пользователей это сотни тысяч строк за тик. Теперь из
// БД берутся только привычки, чьё локальное время `timeOfDay` попадает в окно, в
// котором это напоминание МОЖЕТ сработать в текущий тик. Точную проверку делает
// планировщик (пересчитывает scheduled и применяет условия r15/r60); диапазон — лишь
// надмножество-предфильтр, поэтому небольшая «щедрость» границ безопасна.

/** За сколько минут ДО времени привычки шлём предупреждение («через 15 минут»). */
export const HABIT_REMINDER_LOOKAHEAD_MIN = 15;
/** Через сколько минут ПОСЛЕ времени шлём «не отмечено», если не выполнена. */
export const HABIT_MISSED_AFTER_MIN = 60;
/**
 * Ширина окна, в течение которого ещё допустимо отправить «не отмечено» (минуты
 * после порога +60). Раньше пинг мог уйти в любой момент до конца дня (один раз
 * через dedupe); теперь — в пределах окна, что и бьёт по охвату при пропуске тиков,
 * но даёт устойчивость к ~12 пропущенным тикам (cron каждые 5 минут) и резко
 * сокращает скан. Идемпотентность не меняется (dedupeKey = habit:id:r60:date).
 */
export const HABIT_MISSED_WINDOW_MIN = 60;

export interface ReminderWindowConfig {
  lookaheadMin: number;
  missedAfterMin: number;
  missedWindowMin: number;
}

export const DEFAULT_REMINDER_WINDOW: ReminderWindowConfig = {
  lookaheadMin: HABIT_REMINDER_LOOKAHEAD_MIN,
  missedAfterMin: HABIT_MISSED_AFTER_MIN,
  missedWindowMin: HABIT_MISSED_WINDOW_MIN,
};

/** "HH:MM" → минуты от локальной полуночи (с защитой от "24:00"). */
export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((x) => Number(x));
  return ((h ?? 0) % 24) * 60 + (m ?? 0);
}

/** Минуты от полуночи → zero-padded "HH:MM", с клампом в [00:00, 23:59]. */
export function minutesToHhmm(min: number): string {
  const clamped = Math.max(0, Math.min(1439, Math.floor(min)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Инклюзивный диапазон "HH:MM" локального времени дня, покрывающий все привычки,
 * чьё напоминание (r15 ИЛИ r60) может сработать при текущем локальном времени.
 * Нижняя граница = now − (missedAfter + missedWindow), верхняя = now + lookahead.
 * Кламп к границам суток (без перехода через полночь): планировщик всё равно
 * якорит scheduled на текущую локальную дату, поэтому «вчерашне-поздние» и
 * «завтрашне-ранние» привычки он бы и так отверг — потери охвата нет.
 */
export function reminderBand(
  localNowHhmm: string,
  cfg: ReminderWindowConfig = DEFAULT_REMINDER_WINDOW,
): { gte: string; lte: string } {
  const nowMin = hhmmToMinutes(localNowHhmm);
  const lower = nowMin - (cfg.missedAfterMin + cfg.missedWindowMin);
  const upper = nowMin + cfg.lookaheadMin;
  return { gte: minutesToHhmm(lower), lte: minutesToHhmm(upper) };
}
