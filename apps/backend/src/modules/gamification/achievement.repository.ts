import type { Achievement } from "@tpc/database";

export interface IAchievementRepository {
  listActive(): Promise<Achievement[]>;
  findUnlockedCodes(userId: string): Promise<Set<string>>;
  /** Возвращает true, если достижение разблокировано впервые (false при дубле). */
  unlock(userId: string, achievementId: string): Promise<boolean>;
}
