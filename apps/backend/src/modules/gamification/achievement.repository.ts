import type { Achievement } from "@tpc/database";

export interface IAchievementRepository {
  listActive(): Promise<Achievement[]>;
  findUnlockedCodes(userId: string): Promise<Set<string>>;
  /** code → дата разблокировки (для экрана достижений). */
  findUnlockedMap(userId: string): Promise<Map<string, Date>>;
  /** Возвращает true, если достижение разблокировано впервые (false при дубле). */
  unlock(userId: string, achievementId: string): Promise<boolean>;
}
