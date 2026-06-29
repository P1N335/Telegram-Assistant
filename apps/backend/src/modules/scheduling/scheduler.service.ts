import type { User } from "@tpc/database";
import type { Env } from "../../config/env.js";
import type { Logger } from "../../shared/logger.js";
import {
  addLocalDays,
  getLocalDateString,
  getLocalHhmm,
  getLocalHour,
  getLocalTimeString,
  localDateTimeToUtc,
  toDateOnly,
} from "../../shared/time.js";
import { now as clockNow } from "../../shared/clock.js";
import type { EventBus } from "../../shared/events/event-bus.js";
import type { IUserRepository } from "../users/user.repository.js";
import type { ITaskRepository } from "../tasks/task.repository.js";
import type { IHabitRepository, HabitWithUser, HabitDueWindow } from "../habits/habit.repository.js";
import {
  isDueOn,
  reminderBand,
  HABIT_REMINDER_LOOKAHEAD_MIN,
  HABIT_MISSED_AFTER_MIN,
  HABIT_MISSED_WINDOW_MIN,
} from "../habits/habit.rules.js";
import type { NotificationService } from "../notifications/notification.service.js";
import type { MorningCompanionService } from "../companion/morning-companion.service.js";
import type { MonthlyRewindService } from "../rewind/monthly-rewind.service.js";
import { mapWithConcurrency } from "../../shared/async.js";
import { morningKeyboard, eveningKeyboard, miniAppButton } from "../bot/keyboards.js";
import { TEXT } from "../bot/text.js";

type Kind = "morning" | "evening";

/**
 * Параллелизм рассылки месячного ревайнда внутри тика (DB-агрегация per-user):
 * ограничиваем число одновременных запросов к БД под 100k+. Константа, а не env —
 * чистый DB-конвейер без внешних вызовов (в отличие от AI-утра с настраиваемым лимитом).
 */
const REWIND_CONCURRENCY = 8;

// Те же пороги напоминаний, что и окно выборки (habit.rules), но в миллисекундах —
// планировщик применяет их точно к каждой привычке из оконного предфильтра.
const MIN = 60_000;
const LOOKAHEAD_MS = HABIT_REMINDER_LOOKAHEAD_MIN * MIN;
const MISSED_AFTER_MS = HABIT_MISSED_AFTER_MIN * MIN;
const MISSED_WINDOW_MS = HABIT_MISSED_WINDOW_MIN * MIN;

/**
 * Планировщик рассылок с учётом таймзоны пользователя.
 * Тик (раз в час): берём уникальные таймзоны → отбираем «должные» по локальному часу
 * → шлём через NotificationService (идемпотентно по dedupeKey = userId:kind:date).
 * Интерфейс стабилен: при росте node-cron заменяется на BullMQ без правки логики.
 */
export class SchedulerService {
  constructor(
    private readonly users: IUserRepository,
    private readonly tasks: ITaskRepository,
    private readonly habits: IHabitRepository,
    private readonly notifications: NotificationService,
    private readonly morning: MorningCompanionService,
    private readonly rewind: MonthlyRewindService,
    private readonly events: EventBus,
    private readonly env: Env,
    private readonly logger: Logger,
  ) {}

  async tick(now: Date = clockNow()): Promise<void> {
    await this.run("morning", now);
    await this.run("evening", now);
  }

  /**
   * Напоминания о дедлайнах: задачи, у которых дедлайн в ближайшие 60 минут,
   * ещё не выполнены и без отметки напоминания. Шлём один раз (dedupeKey + reminderSentAt).
   */
  async runReminders(now: Date = clockNow()): Promise<void> {
    const to = new Date(now.getTime() + 60 * 60 * 1000);
    const due = await this.tasks.findDueForReminder(now, to);
    if (due.length === 0) return;

    this.logger.info({ count: due.length }, "Планировщик: напоминания о дедлайнах");

    for (const task of due) {
      if (!task.dueDate) continue;
      const time = getLocalTimeString(task.user.timezone, task.dueDate);
      const sent = await this.notifications.sendOnce({
        userId: task.userId,
        chatId: Number(task.user.telegramId),
        type: "TASK_REMINDER",
        dedupeKey: `task:${task.id}:reminder`,
        text: `⏰ Скоро дедлайн (в ${time}): ${task.title}`,
      });
      if (sent) await this.tasks.markReminderSent(task.id);
    }
  }

  /**
   * Напоминания о привычках: за 15 минут до времени и повторно через час,
   * если ещё не отмечена выполненной. Один раз каждое (dedupeKey по дню).
   *
   * Масштаб: вместо скана всех активных привычек берём из БД только те, чьё
   * локальное `timeOfDay` попадает в окно текущего тика (см. `reminderBand`).
   * Таймзоны с одинаковым локальным временем делят одно окно — минимум запросов.
   * Точные условия r15/r60 ниже применяются к предотобранному (узкому) набору.
   */
  async runHabitReminders(now: Date = clockNow()): Promise<void> {
    const windows = await this.buildReminderWindows(now);
    if (windows.length === 0) return;

    const habits = await this.habits.listActiveDueInWindows(windows);
    for (const habit of habits) {
      const tz = habit.user.timezone;
      const today = getLocalDateString(tz, now);
      if (!isDueOn(scheduleOf(habit), today)) continue;
      if (await this.habits.hasCompletion(habit.id, toDateOnly(today))) continue;

      const scheduled = localDateTimeToUtc(today, habit.timeOfDay, tz).getTime();
      const t = now.getTime();
      const chatId = Number(habit.user.telegramId);

      if (t >= scheduled - LOOKAHEAD_MS && t < scheduled) {
        await this.notifications.sendOnce({
          userId: habit.userId,
          chatId,
          type: "HABIT_REMINDER",
          dedupeKey: `habit:${habit.id}:r15:${today}`,
          text: `⏰ Через 15 минут: ${habit.title} (в ${habit.timeOfDay})`,
        });
      } else if (t >= scheduled + MISSED_AFTER_MS && t < scheduled + MISSED_AFTER_MS + MISSED_WINDOW_MS) {
        await this.notifications.sendOnce({
          userId: habit.userId,
          chatId,
          type: "HABIT_REMINDER",
          dedupeKey: `habit:${habit.id}:r60:${today}`,
          text: `⏳ Не отмечено: ${habit.title}. Выполни и отметь в приложении.`,
        });
      }
    }
  }

  /**
   * Группирует активные таймзоны по совпадающему окну напоминаний (таймзоны с
   * одинаковым текущим локальным временем дают одно окно → минимум запросов к БД).
   * Невалидные таймзоны пропускаются. Список уникальных таймзон мал → дёшево.
   */
  private async buildReminderWindows(now: Date): Promise<HabitDueWindow[]> {
    const timezones = await this.users.findDistinctActiveTimezones();
    const groups = new Map<string, HabitDueWindow>();
    for (const tz of timezones) {
      let localNow: string;
      try {
        localNow = getLocalHhmm(tz, now);
      } catch {
        continue; // некорректная таймзона — пропускаем
      }
      const band = reminderBand(localNow);
      const key = `${band.gte}|${band.lte}`;
      const existing = groups.get(key);
      if (existing) existing.timezones.push(tz);
      else groups.set(key, { timezones: [tz], gte: band.gte, lte: band.lte });
    }
    return [...groups.values()];
  }

  /**
   * Конец дня: для привычек, которые были должны вчера и не отмечены, —
   * штраф один раз (dedupeKey по дню). Запускается в час локальной полуночи.
   *
   * Масштаб: сначала отбираем таймзоны, где сейчас локальная полночь (их единицы),
   * и тянем привычки только их пользователей — вместо скана всей таблицы каждый час.
   */
  async runHabitRollover(now: Date = clockNow()): Promise<void> {
    const timezones = await this.users.findDistinctActiveTimezones();
    const midnightTz = timezones.filter((tz) => safeLocalHour(tz, now) === 0);
    if (midnightTz.length === 0) return; // вне локальной полуночи — нечего делать

    const habits = await this.habits.listActiveByTimezones(midnightTz);
    for (const habit of habits) {
      const tz = habit.user.timezone;
      // tz уже гарантированно в локальной полуночи (отфильтровано на выборке).
      const yesterday = addLocalDays(getLocalDateString(tz, now), -1);
      if (!isDueOn(scheduleOf(habit), yesterday)) continue;
      if (await this.habits.hasCompletion(habit.id, toDateOnly(yesterday))) continue;

      const penalized = await this.notifications.sendOnce({
        userId: habit.userId,
        chatId: Number(habit.user.telegramId),
        type: "HABIT_REMINDER",
        dedupeKey: `habit:${habit.id}:missed:${yesterday}`,
        text: `😔 Привычка не выполнена: ${habit.title} (−${habit.xpPenalty} XP)`,
      });
      if (penalized) {
        await this.events.emit({
          type: "HabitMissed",
          userId: habit.userId,
          habitId: habit.id,
          penalty: habit.xpPenalty,
        });
      }
    }
  }

  /**
   * Месячный ревайнд: в локальную полночь 1-го числа шлём отчёт за прошедший месяц.
   * Дёшево на «холостых» тиках: берём только таймзоны, где сейчас локальный час 0 и
   * локальная дата — 1-е число (почти всегда пусто → ранний выход без обхода юзеров).
   * Идемпотентность — dedupeKey = userId:rewind:YYYY-MM (один отчёт на месяц).
   */
  async runMonthlyRewind(now: Date = clockNow()): Promise<void> {
    const timezones = await this.users.findDistinctActiveTimezones();
    const dueTimezones = timezones.filter(
      (tz) => safeLocalHour(tz, now) === 0 && getLocalDateString(tz, now).endsWith("-01"),
    );
    if (dueTimezones.length === 0) return;

    const users = await this.users.findActiveByTimezones(dueTimezones);
    if (users.length === 0) return;

    this.logger.info({ count: users.length }, "Планировщик: месячный ревайнд");

    // DB-агрегация per-user — ограничиваем параллелизм, чтобы не залить пул соединений.
    await mapWithConcurrency(users, REWIND_CONCURRENCY, (user) => this.sendRewind(user, now));
  }

  private async sendRewind(user: User, now: Date): Promise<void> {
    const localToday = getLocalDateString(user.timezone, now);
    const dto = await this.rewind.buildRewind(user, localToday);
    if (!dto) return; // нет активности за месяц — пустой отчёт не шлём

    await this.notifications.sendOnce({
      userId: user.id,
      chatId: Number(user.telegramId),
      type: "MONTHLY_REWIND",
      dedupeKey: `${user.id}:rewind:${dto.month}`,
      text: TEXT.rewind(dto),
      options: { reply_markup: miniAppButton(this.env.MINI_APP_URL) },
    });
  }

  private async run(kind: Kind, now: Date): Promise<void> {
    const globalHour = kind === "morning" ? this.env.MORNING_HOUR : this.env.EVENING_HOUR;

    const timezones = await this.users.findDistinctActiveTimezones();
    const dueTimezones = timezones.filter((tz) => safeLocalHour(tz, now) === globalHour);

    const defaults = dueTimezones.length ? await this.users.findDefaultDue(kind, dueTimezones) : [];
    const overridden = (await this.users.findOverriddenDue(kind)).filter((u) => {
      const h = kind === "morning" ? u.morningHour : u.eveningHour;
      return h !== null && safeLocalHour(u.timezone, now) === h;
    });

    let due = dedupeById([...defaults, ...overridden]);
    // Вечернее подведение итогов можно отключить командой /itogi.
    if (kind === "evening") due = due.filter((u) => u.eveningEnabled);
    if (due.length === 0) return;

    this.logger.info({ kind, count: due.length }, "Планировщик: рассылка");

    // Утро может звать LLM на пользователя (AI-компаньон) — обрабатываем с ограниченным
    // параллелизмом, чтобы не открыть тысячи одновременных запросов и не растянуть тик.
    // Вечер — дёшево (статичный текст), идём последовательно.
    if (kind === "morning" && this.morning.enabled) {
      await mapWithConcurrency(due, this.env.AI_MORNING_CONCURRENCY, (user) =>
        this.sendTo(user, kind, now),
      );
    } else {
      for (const user of due) {
        await this.sendTo(user, kind, now);
      }
    }
  }

  private async sendTo(user: User, kind: Kind, now: Date): Promise<void> {
    const date = getLocalDateString(user.timezone, now);
    const isMorning = kind === "morning";
    await this.notifications.sendOnce({
      userId: user.id,
      chatId: Number(user.telegramId),
      type: isMorning ? "MORNING_PLAN" : "EVENING_REFLECTION",
      dedupeKey: `${user.id}:${kind}:${date}`,
      text: isMorning ? await this.morningText(user, date) : TEXT.evening,
      options: {
        reply_markup: isMorning
          ? morningKeyboard(this.env.MINI_APP_URL)
          : eveningKeyboard(this.env.MINI_APP_URL),
      },
    });
  }

  /**
   * Текст утреннего сообщения: персональная AI-мотивация + призыв спланировать день,
   * либо (если AI выключен/недоступен/упал/превысил таймаут) — обычный статичный текст.
   * dedupeKey не зависит от ветки → сообщение в любом случае одно.
   */
  private async morningText(user: User, date: string): Promise<string> {
    const ai = await this.morning.buildMorningText(user, date);
    return ai ? `${ai}\n\n${TEXT.morningCta}` : TEXT.morning;
  }
}

function scheduleOf(h: HabitWithUser) {
  return {
    cadence: h.cadence,
    intervalDays: h.intervalDays,
    weekdays: h.weekdays,
    startDate: h.startDate.toISOString().slice(0, 10),
  };
}

function safeLocalHour(tz: string, now: Date): number {
  try {
    return getLocalHour(tz, now);
  } catch {
    return -1; // некорректная таймзона — никогда не «должная»
  }
}

function dedupeById(users: User[]): User[] {
  const map = new Map<string, User>();
  for (const u of users) map.set(u.id, u);
  return [...map.values()];
}
