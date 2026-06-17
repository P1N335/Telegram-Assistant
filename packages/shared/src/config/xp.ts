/** Награды XP за действия. Конфиг — не хардкод в хендлерах (правила меняются здесь). */
export const XP_REWARDS = {
  PLAN_CREATED: 10, // первый план дня
  TASK_COMPLETED: 15, // выполнение задачи
  REFLECTION_SUBMITTED: 20, // вечерний отчёт
  DAY_COMPLETED: 50, // полностью выполненный день
} as const;

export type XpAction = keyof typeof XP_REWARDS;
