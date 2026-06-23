/** Награды XP за действия. Конфиг — не хардкод в хендлерах (правила меняются здесь). */
export const XP_REWARDS = {
  PLAN_CREATED: 10, // первый план дня
  TASK_COMPLETED: 15, // выполнение задачи
  REFLECTION_SUBMITTED: 20, // вечерний отчёт
  DAY_COMPLETED: 50, // полностью выполненный день
} as const;

export type XpAction = keyof typeof XP_REWARDS;

/**
 * Награды XP скиллам (отдельный пул прогрессии RPG-скиллов, не путать с XP пользователя).
 * Задача за первое выполнение даёт фиксированный SKILL_TASK_COMPLETED; привычка —
 * собственный xpReward (динамически из самой привычки), поэтому здесь его нет.
 */
export const SKILL_XP_REWARDS = {
  TASK_COMPLETED: 15,
} as const;

export type SkillXpAction = keyof typeof SKILL_XP_REWARDS;
