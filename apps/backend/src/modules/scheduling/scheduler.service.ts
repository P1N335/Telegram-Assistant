import type { User } from "@tpc/database";
import type { Env } from "../../config/env.js";
import type { Logger } from "../../shared/logger.js";
import {
  addLocalDays,
  getLocalDateString,
  getLocalHour,
  getLocalTimeString,
  localDateTimeToUtc,
  toDateOnly,
} from "../../shared/time.js";
import { now as clockNow } from "../../shared/clock.js";
import type { EventBus } from "../../shared/events/event-bus.js";
import type { IUserRepository } from "../users/user.repository.js";
import type { ITaskRepository } from "../tasks/task.repository.js";
import type { IHabitRepository, HabitWithUser } from "../habits/habit.repository.js";
import { isDueOn } from "../habits/habit.rules.js";
import type { NotificationService } from "../notifications/notification.service.js";
import { morningKeyboard, eveningKeyboard } from "../bot/keyboards.js";
import { TEXT } from "../bot/text.js";

type Kind = "morning" | "evening";

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
   */
  async runHabitReminders(now: Date = clockNow()): Promise<void> {
    const habits = await this.habits.listAllActiveWithUser();
    for (const habit of habits) {
      const tz = habit.user.timezone;
      const today = getLocalDateString(tz, now);
      if (!isDueOn(scheduleOf(habit), today)) continue;
      if (await this.habits.hasCompletion(habit.id, toDateOnly(today))) continue;

      const scheduled = localDateTimeToUtc(today, habit.timeOfDay, tz).getTime();
      const t = now.getTime();
      const chatId = Number(habit.user.telegramId);

      if (t >= scheduled - 15 * 60_000 && t < scheduled) {
        await this.notifications.sendOnce({
          userId: habit.userId,
          chatId,
          type: "HABIT_REMINDER",
          dedupeKey: `habit:${habit.id}:r15:${today}`,
          text: `⏰ Через 15 минут: ${habit.title} (в ${habit.timeOfDay})`,
        });
      } else if (t >= scheduled + 60 * 60_000) {
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
   * Конец дня: для привычек, которые были должны вчера и не отмечены, —
   * штраф один раз (dedupeKey по дню). Запускается в час локальной полуночи.
   */
  async runHabitRollover(now: Date = clockNow()): Promise<void> {
    const habits = await this.habits.listAllActiveWithUser();
    for (const habit of habits) {
      const tz = habit.user.timezone;
      if (getLocalHour(tz, now) !== 0) continue; // только в первый час новых суток

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

  private async run(kind: Kind, now: Date): Promise<void> {
    const globalHour = kind === "morning" ? this.env.MORNING_HOUR : this.env.EVENING_HOUR;

    const timezones = await this.users.findDistinctActiveTimezones();
    const dueTimezones = timezones.filter((tz) => safeLocalHour(tz, now) === globalHour);

    const defaults = dueTimezones.length ? await this.users.findDefaultDue(kind, dueTimezones) : [];
    const overridden = (await this.users.findOverriddenDue(kind)).filter((u) => {
      const h = kind === "morning" ? u.morningHour : u.eveningHour;
      return h !== null && safeLocalHour(u.timezone, now) === h;
    });

    const due = dedupeById([...defaults, ...overridden]);
    if (due.length === 0) return;

    this.logger.info({ kind, count: due.length }, "Планировщик: рассылка");

    for (const user of due) {
      await this.sendTo(user, kind, now);
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
      text: isMorning ? TEXT.morning : TEXT.evening,
      options: {
        reply_markup: isMorning
          ? morningKeyboard(this.env.MINI_APP_URL)
          : eveningKeyboard(this.env.MINI_APP_URL),
      },
    });
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
