import type { DailyReport } from "@tpc/database";

export interface ReflectionData {
  howWasDay?: string | null;
  summary?: string | null;
  goodThings?: string | null;
  difficulties?: string | null;
  rating: number;
  mood?: number | null;
  productivity?: number | null;
  aiInsight?: string | null;
}

/** Контракт доступа к вечерним отчётам (DIP). */
export interface IReflectionRepository {
  /** Один отчёт на день: создать или обновить (userId+date уникальны). */
  upsert(userId: string, date: Date, data: ReflectionData): Promise<DailyReport>;
  findByDay(userId: string, date: Date): Promise<DailyReport | null>;
  setInsight(id: string, insight: string): Promise<void>;
}
