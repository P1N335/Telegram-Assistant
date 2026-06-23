/**
 * Доступ к данным рейтинга. Ранжирование — по UserStatistics.xp (уровень производен от XP).
 * Счётчики (countAll/countWithXpAbove) держатся на одной таблице UserStatistics без join'а
 * к User — это позволяет использовать индекс @@index([xp]) и не лочить identity-строки под 100k+.
 * Идентичность (имя/username) подтягивается только для небольшой страницы топа.
 */
export interface LeaderboardRow {
  userId: string;
  xp: number;
  level: number;
  firstName: string | null;
  username: string | null;
}

export interface ILeaderboardRepository {
  /** Страница топа по xp DESC (обратный скан индекса), с идентичностью пользователя. */
  topByXp(limit: number, offset: number): Promise<LeaderboardRow[]>;
  /** Всего ранжированных пользователей (для «место X из Y»). */
  countAll(): Promise<number>;
  /** Число пользователей со строго большим xp — основа competition-ранга (range-скан по индексу). */
  countWithXpAbove(xp: number): Promise<number>;
  /** Строка статистики + идентичность конкретного пользователя (для его собственного места). */
  getRow(userId: string): Promise<LeaderboardRow | null>;
}
