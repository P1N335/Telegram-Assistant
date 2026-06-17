/**
 * @tpc/shared — единый источник правды для типов, DTO, zod-схем и доменных событий,
 * переиспользуемых между backend и Mini App.
 *
 * Наполняется на следующих этапах:
 *   - types/   — доменные типы (TaskStatus, PetMood, ...)
 *   - dto/     — контракты REST API (request/response)
 *   - events/  — имена и payload'ы доменных событий
 *   - config/  — общие константы (правила XP, формула уровней)
 */

export const SHARED_PACKAGE = "@tpc/shared";

export * from "./types/index.js";
export * from "./dto/index.js";
export * from "./config/leveling.js";
export * from "./config/xp.js";
