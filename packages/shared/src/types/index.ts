/**
 * Доменные строковые типы — единый словарь для backend и Mini App.
 * Значения совпадают строка-в-строку с enum'ами Prisma, поэтому фронтенду
 * не нужно импортировать @prisma/client.
 */

export const TaskStatus = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  SKIPPED: "SKIPPED",
  POSTPONED: "POSTPONED",
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TaskPeriod = {
  DAY: "DAY",
  WEEK: "WEEK",
  MONTH: "MONTH",
  YEAR: "YEAR",
} as const;
export type TaskPeriod = (typeof TaskPeriod)[keyof typeof TaskPeriod];

export const HabitCadence = {
  DAILY: "DAILY",
  EVERY_N_DAYS: "EVERY_N_DAYS",
  WEEKLY: "WEEKLY",
} as const;
export type HabitCadence = (typeof HabitCadence)[keyof typeof HabitCadence];

export const NotificationType = {
  MORNING_PLAN: "MORNING_PLAN",
  EVENING_REFLECTION: "EVENING_REFLECTION",
  PET_REMINDER: "PET_REMINDER",
  TASK_REMINDER: "TASK_REMINDER",
  STREAK_WARNING: "STREAK_WARNING",
  ACHIEVEMENT_UNLOCKED: "ACHIEVEMENT_UNLOCKED",
  CUSTOM: "CUSTOM",
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const NotificationStatus = {
  PENDING: "PENDING",
  SENT: "SENT",
  FAILED: "FAILED",
  SKIPPED: "SKIPPED",
} as const;
export type NotificationStatus = (typeof NotificationStatus)[keyof typeof NotificationStatus];

/** Производная метка настроения питомца из числового значения 0..100. */
export type PetMoodLabel = "happy" | "neutral" | "sad" | "tired";

export const SubscriptionPlan = {
  FREE: "FREE",
  PREMIUM: "PREMIUM",
} as const;
export type SubscriptionPlan = (typeof SubscriptionPlan)[keyof typeof SubscriptionPlan];

/** Реестр платных фич. Добавление новой механики = новая запись здесь. */
export const PremiumFeature = {
  PET_CUSTOMIZATION: "PET_CUSTOMIZATION",
  /** Несколько питомцев (>1). Бесплатно — ровно один авто-созданный питомец. */
  MULTI_PET: "MULTI_PET",
} as const;
export type PremiumFeature = (typeof PremiumFeature)[keyof typeof PremiumFeature];
