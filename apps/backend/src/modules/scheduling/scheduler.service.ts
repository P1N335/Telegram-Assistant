import type { User } from "@tpc/database";
import type { Env } from "../../config/env.js";
import type { Logger } from "../../shared/logger.js";
import { getLocalDateString, getLocalHour } from "../../shared/time.js";
import type { IUserRepository } from "../users/user.repository.js";
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
    private readonly notifications: NotificationService,
    private readonly env: Env,
    private readonly logger: Logger,
  ) {}

  async tick(now: Date = new Date()): Promise<void> {
    await this.run("morning", now);
    await this.run("evening", now);
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
