import type { Habit } from "@tpc/database";
import { HabitCadence, type HabitDto, type CreateHabitRequest, type UpdateHabitRequest } from "@tpc/shared";
import { ForbiddenError, NotFoundError, ValidationError } from "../../shared/errors/index.js";
import { getLocalDateString, toDateOnly } from "../../shared/time.js";
import { now } from "../../shared/clock.js";
import type { EventBus } from "../../shared/events/event-bus.js";
import type { IUserRepository } from "../users/user.repository.js";
import type { IHabitRepository } from "./habit.repository.js";
import { isDueOn } from "./habit.rules.js";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export class HabitService {
  constructor(
    private readonly habits: IHabitRepository,
    private readonly users: IUserRepository,
    private readonly events: EventBus,
  ) {}

  async createHabit(userId: string, req: CreateHabitRequest): Promise<HabitDto> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError("Пользователь не найден");

    const norm = HabitService.normalize(req);
    const today = getLocalDateString(user.timezone, now());
    const created = await this.habits.create(userId, {
      title: norm.title,
      timeOfDay: req.timeOfDay,
      cadence: req.cadence,
      intervalDays: norm.intervalDays,
      weekdays: norm.weekdays,
      startDate: toDateOnly(today),
      xpReward: req.xpReward ?? 5,
      xpPenalty: req.xpPenalty ?? 10,
    });

    return HabitService.toDto(created, isDueOn(toSchedule(created), today), false);
  }

  async updateHabit(userId: string, habitId: string, req: UpdateHabitRequest): Promise<HabitDto> {
    const habit = await this.requireOwn(userId, habitId);
    const user = await this.users.findById(userId);
    const norm = HabitService.normalize(req);

    const updated = await this.habits.update(habitId, {
      title: norm.title,
      timeOfDay: req.timeOfDay,
      cadence: req.cadence,
      intervalDays: norm.intervalDays,
      weekdays: norm.weekdays,
      xpReward: req.xpReward ?? habit.xpReward,
      xpPenalty: req.xpPenalty ?? habit.xpPenalty,
    });

    const today = getLocalDateString(user!.timezone, now());
    const done = await this.habits.hasCompletion(habitId, toDateOnly(today));
    return HabitService.toDto(updated, isDueOn(toSchedule(updated), today), done);
  }

  async listForToday(userId: string): Promise<HabitDto[]> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError("Пользователь не найден");

    const today = getLocalDateString(user.timezone, now());
    const [habits, completed] = await Promise.all([
      this.habits.listActiveByUser(userId),
      this.habits.completedHabitIds(userId, toDateOnly(today)),
    ]);

    return habits.map((h) =>
      HabitService.toDto(h, isDueOn(toSchedule(h), today), completed.has(h.id)),
    );
  }

  async complete(userId: string, habitId: string): Promise<HabitDto> {
    const habit = await this.requireOwn(userId, habitId);
    const user = await this.users.findById(userId);
    const today = getLocalDateString(user!.timezone, now());

    const created = await this.habits.createCompletionIfAbsent(habitId, toDateOnly(today));
    if (created) {
      await this.events.emit({ type: "HabitCompleted", userId, habitId, xp: habit.xpReward });
    }
    return HabitService.toDto(habit, isDueOn(toSchedule(habit), today), true);
  }

  async uncomplete(userId: string, habitId: string): Promise<HabitDto> {
    const habit = await this.requireOwn(userId, habitId);
    const user = await this.users.findById(userId);
    const today = getLocalDateString(user!.timezone, now());

    const removed = await this.habits.deleteCompletion(habitId, toDateOnly(today));
    if (removed) {
      await this.events.emit({ type: "HabitUncompleted", userId, habitId, xp: habit.xpReward });
    }
    return HabitService.toDto(habit, isDueOn(toSchedule(habit), today), false);
  }

  async deleteHabit(userId: string, habitId: string): Promise<void> {
    await this.requireOwn(userId, habitId);
    await this.habits.delete(habitId);
  }

  private async requireOwn(userId: string, habitId: string): Promise<Habit> {
    const habit = await this.habits.findById(habitId);
    if (!habit) throw new NotFoundError("Привычка не найдена");
    if (habit.userId !== userId) throw new ForbiddenError("Чужая привычка");
    return habit;
  }

  /** Валидация и нормализация полей расписания (общая для create/update). */
  static normalize(req: CreateHabitRequest): { title: string; intervalDays: number | null; weekdays: number[] } {
    const title = req.title.trim();
    if (!title) throw new ValidationError("Пустой заголовок привычки");
    if (!TIME_RE.test(req.timeOfDay)) throw new ValidationError("Время в формате ЧЧ:ММ");
    if (req.cadence === HabitCadence.EVERY_N_DAYS && (!req.intervalDays || req.intervalDays < 1)) {
      throw new ValidationError("Укажите интервал в днях (>= 1)");
    }
    if (req.cadence === HabitCadence.WEEKLY && (!req.weekdays || req.weekdays.length === 0)) {
      throw new ValidationError("Выберите хотя бы один день недели");
    }
    return {
      title,
      intervalDays: req.cadence === HabitCadence.EVERY_N_DAYS ? req.intervalDays! : null,
      weekdays: req.cadence === HabitCadence.WEEKLY ? [...new Set(req.weekdays)].sort((a, b) => a - b) : [],
    };
  }

  static toDto(h: Habit, dueToday: boolean, doneToday: boolean): HabitDto {
    return {
      id: h.id,
      title: h.title,
      timeOfDay: h.timeOfDay,
      cadence: h.cadence as HabitDto["cadence"],
      intervalDays: h.intervalDays,
      weekdays: h.weekdays,
      xpReward: h.xpReward,
      xpPenalty: h.xpPenalty,
      dueToday,
      doneToday,
    };
  }
}

/** Habit → расписание для правил. */
export function toSchedule(h: Habit) {
  return {
    cadence: h.cadence as HabitCadence,
    intervalDays: h.intervalDays,
    weekdays: h.weekdays,
    startDate: h.startDate.toISOString().slice(0, 10),
  };
}
