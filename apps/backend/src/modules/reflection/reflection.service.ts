import type { DailyReport } from "@tpc/database";
import { TaskStatus } from "@tpc/shared";
import { NotFoundError } from "../../shared/errors/index.js";
import type { Logger } from "../../shared/logger.js";
import { getLocalDateString, toDateOnly } from "../../shared/time.js";
import type { LLMProvider } from "../../shared/ai/llm-provider.js";
import type { EventBus } from "../../shared/events/event-bus.js";
import type { IUserRepository } from "../users/user.repository.js";
import type { ITaskRepository } from "../tasks/task.repository.js";
import type { IReflectionRepository, ReflectionData } from "./reflection.repository.js";

export interface SubmitResult {
  report: DailyReport;
  insight: string | null;
}

/**
 * Вечерняя рефлексия: сохраняет отчёт и генерирует коучинг-инсайт через LLM.
 * AI не блокирует сохранение — при сбое провайдера отчёт всё равно записан (graceful degradation).
 */
export class ReflectionService {
  constructor(
    private readonly reflections: IReflectionRepository,
    private readonly tasks: ITaskRepository,
    private readonly users: IUserRepository,
    private readonly ai: LLMProvider,
    private readonly events: EventBus,
    private readonly logger: Logger,
  ) {}

  async submit(userId: string, data: ReflectionData, dateStr?: string): Promise<SubmitResult> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError("Пользователь не найден");

    const day = dateStr ?? getLocalDateString(user.timezone);
    const date = toDateOnly(day);

    // Сохраняем сразу — это источник правды, AI вторичен.
    const report = await this.reflections.upsert(userId, date, data);

    await this.events.emit({
      type: "ReflectionSubmitted",
      userId,
      localDate: day,
      rating: data.rating,
      mood: data.mood ?? null,
      productivity: data.productivity ?? null,
    });

    let insight: string | null = null;
    if (this.ai.name !== "noop") {
      try {
        const dayTasks = await this.tasks.findByDay(userId, date);
        const text = await this.ai.generateCoaching({
          howWasDay: data.howWasDay,
          goodThings: data.goodThings,
          difficulties: data.difficulties,
          rating: data.rating,
          completedTasks: dayTasks.filter((t) => t.status === TaskStatus.COMPLETED).map((t) => t.title),
          pendingTasks: dayTasks.filter((t) => t.status === TaskStatus.PENDING).map((t) => t.title),
          locale: user.languageCode ?? "ru",
        });
        if (text) {
          insight = text;
          await this.reflections.setInsight(report.id, text);
        }
      } catch (err) {
        this.logger.warn({ err, userId }, "AI-инсайт не сгенерирован");
      }
    }

    return { report, insight };
  }
}
