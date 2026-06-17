/**
 * Прогрессивная формула уровней. Один источник правды для backend (начисление)
 * и Mini App (отрисовка прогресса), чтобы значения никогда не расходились.
 *
 * totalXpForLevel(L) — суммарный XP, необходимый для ДОСТИЖЕНИЯ уровня L.
 * Уровень 1 соответствует 0 XP; дальше расходимость растёт по степенному закону.
 */
const BASE = 100;
const POWER = 1.5;

export function totalXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(BASE * Math.pow(level - 1, POWER));
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (totalXpForLevel(level + 1) <= xp) level += 1;
  return level;
}

export interface LevelProgress {
  level: number;
  xpIntoLevel: number; // сколько XP набрано внутри текущего уровня
  xpForLevelSpan: number; // ширина текущего уровня в XP
  ratio: number; // 0..1 прогресс до следующего уровня
  nextLevelXp: number; // суммарный XP для следующего уровня
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelFromXp(xp);
  const cur = totalXpForLevel(level);
  const next = totalXpForLevel(level + 1);
  const span = Math.max(1, next - cur);
  return {
    level,
    xpIntoLevel: xp - cur,
    xpForLevelSpan: next - cur,
    ratio: Math.min(1, (xp - cur) / span),
    nextLevelXp: next,
  };
}
