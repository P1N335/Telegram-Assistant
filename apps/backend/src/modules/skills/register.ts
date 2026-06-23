import { TaskStatus, SKILL_XP_REWARDS } from "@tpc/shared";
import type { Logger } from "../../shared/logger.js";
import type { EventBus } from "../../shared/events/event-bus.js";
import type { SkillService } from "./skill.service.js";

/**
 * Скиллы растут на тех же доменных событиях, что геймификация и питомец — отдельным
 * подписчиком (Open/Closed: источники событий о скиллах не знают). Начисление
 * fire-and-forget: точный XP скилла не критичен для немедленного ответа, а падение
 * обработчика изолировано в EventBus и не валит запрос.
 *
 * Правила (зеркало логики XP пользователя):
 *  - задача: XP скиллу только за ПЕРВОЕ выполнение (анти-фарм по галочке), без возврата
 *    при снятии — как и глобальный XP за задачу не отнимается;
 *  - привычка: начисляем при выполнении (xp привычки) и возвращаем при снятии отметки;
 *    пропуск (HabitMissed) скилл не штрафует — пункт бэклога про «начисление при выполнении».
 */
export function registerSkills(bus: EventBus, skills: SkillService, logger: Logger): void {
  const safe = (p: Promise<unknown>) =>
    void p.catch((err) => logger.warn({ err }, "skill xp award failed"));

  bus.on("TaskStatusChanged", (e) => {
    if (e.status === TaskStatus.COMPLETED && e.firstCompletion && e.skillCode) {
      safe(skills.awardXp(e.userId, e.skillCode, SKILL_XP_REWARDS.TASK_COMPLETED));
    }
  });

  bus.on("HabitCompleted", (e) => {
    if (e.skillCode) safe(skills.awardXp(e.userId, e.skillCode, e.xp));
  });

  bus.on("HabitUncompleted", (e) => {
    if (e.skillCode) safe(skills.awardXp(e.userId, e.skillCode, -e.xp));
  });
}
