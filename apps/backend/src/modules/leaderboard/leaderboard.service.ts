import type { LeaderboardEntryDto, LeaderboardResponse } from "@tpc/shared";
import type { ILeaderboardRepository, LeaderboardRow } from "./leaderboard.repository.js";

/** Параметры пагинации рейтинга (клампятся, чтобы тяжёлый запрос нельзя было заказать). */
export const LEADERBOARD_DEFAULT_LIMIT = 20;
export const LEADERBOARD_MAX_LIMIT = 100;

export interface LeaderboardQuery {
  limit?: number;
  offset?: number;
}

/**
 * Рейтинг пользователей по XP. Только чтение. Ранг — competition-style по xp
 * (равный XP → равное место). Для топа ранг позиционный (offset + i + 1), что
 * совпадает с порядком сортировки; для собственного места — count(xp > my)+1,
 * но если пользователь попал на текущую страницу, переиспользуем его позиционный
 * ранг (консистентность при ничьих). Ранжирование по всем UserStatistics (без
 * фильтра isActive) — счётчики на одной таблице, индекс-дружелюбно под 100k+.
 */
export class LeaderboardService {
  constructor(private readonly repo: ILeaderboardRepository) {}

  async getLeaderboard(userId: string, query: LeaderboardQuery = {}): Promise<LeaderboardResponse> {
    const limit = clamp(query.limit ?? LEADERBOARD_DEFAULT_LIMIT, 1, LEADERBOARD_MAX_LIMIT);
    const offset = Math.max(0, Math.floor(query.offset ?? 0));

    const [rows, total, myRow] = await Promise.all([
      this.repo.topByXp(limit, offset),
      this.repo.countAll(),
      this.repo.getRow(userId),
    ]);

    const top = rows.map((row, i) => toEntry(row, offset + i + 1, row.userId === userId));

    let me: LeaderboardEntryDto | null = null;
    if (myRow) {
      const onPage = top.find((e) => e.userId === userId);
      // На странице — берём уже посчитанный позиционный ранг; иначе competition-ранг.
      const rank = onPage ? onPage.rank : (await this.repo.countWithXpAbove(myRow.xp)) + 1;
      me = toEntry(myRow, rank, true);
    }

    return { top, me, total, limit, offset };
  }
}

function toEntry(row: LeaderboardRow, rank: number, isMe: boolean): LeaderboardEntryDto {
  return {
    rank,
    userId: row.userId,
    name: displayName(row),
    username: row.username,
    level: row.level,
    xp: row.xp,
    isMe,
  };
}

/** Имя для рейтинга: firstName → @username → «Пользователь». telegramId/фамилию не раскрываем. */
function displayName(row: LeaderboardRow): string {
  const first = row.firstName?.trim();
  if (first) return first;
  if (row.username) return `@${row.username}`;
  return "Пользователь";
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}
