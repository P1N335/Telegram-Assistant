import type { AchievementDto } from "@tpc/shared";
import type { IAchievementRepository } from "./achievement.repository.js";

/** Каталог достижений со статусом разблокировки для конкретного пользователя. */
export class AchievementService {
  constructor(private readonly achievements: IAchievementRepository) {}

  async listForUser(userId: string): Promise<AchievementDto[]> {
    const [catalog, unlocked] = await Promise.all([
      this.achievements.listActive(),
      this.achievements.findUnlockedMap(userId),
    ]);

    return catalog
      .map((a) => {
        const at = unlocked.get(a.code);
        return {
          code: a.code,
          title: a.title,
          description: a.description,
          icon: a.icon,
          category: a.category,
          unlocked: at !== undefined,
          unlockedAt: at ? at.toISOString() : null,
        };
      })
      // Разблокированные — вперёд.
      .sort((x, y) => Number(y.unlocked) - Number(x.unlocked));
  }
}
