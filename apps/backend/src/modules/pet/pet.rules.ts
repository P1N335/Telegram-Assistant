import { PET_NAME_MAX_LENGTH, PET_NAME_MIN_LENGTH, type PetMoodLabel } from "@tpc/shared";

/** Чистые правила питомца — тестируются без БД. */

/**
 * Нормализация и валидация имени питомца (кастомизация, премиум). Чистая функция:
 * trim + схлопывание пробелов + контроль длины. `ok=false` — имя пустое/слишком длинное.
 */
export function sanitizePetName(
  raw: string,
  max: number = PET_NAME_MAX_LENGTH,
): { ok: boolean; value: string } {
  const value = raw.replace(/\s+/g, " ").trim();
  const ok = value.length >= PET_NAME_MIN_LENGTH && value.length <= max;
  return { ok, value };
}

/** Скорость угасания за час отсутствия взаимодействия. */
export const DECAY = { moodPerHour: 1, energyPerHour: 1.5 };

export interface PetStage {
  minLevel: number;
  emoji: string;
  title: string;
}

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

export function hoursBetween(from: Date, to: Date): number {
  return Math.max(0, (to.getTime() - from.getTime()) / 3_600_000);
}

/** Ленивый decay: текущее состояние из якорных значений и времени последнего контакта. */
export function applyDecay(
  mood: number,
  energy: number,
  lastInteractionAt: Date,
  now: Date,
): { mood: number; energy: number } {
  const h = hoursBetween(lastInteractionAt, now);
  return {
    mood: clamp(mood - DECAY.moodPerHour * h),
    energy: clamp(energy - DECAY.energyPerHour * h),
  };
}

export function boost(value: number, by: number): number {
  return clamp(value + by);
}

function asStages(json: unknown): PetStage[] {
  return Array.isArray(json) ? (json as PetStage[]) : [];
}

function asPhrases(json: unknown): Record<string, string[]> {
  return json && typeof json === "object" ? (json as Record<string, string[]>) : {};
}

export function stageFor(stagesJson: unknown, level: number): PetStage {
  const stages = asStages(stagesJson)
    .filter((s) => s.minLevel <= level)
    .sort((a, b) => b.minLevel - a.minLevel);
  return stages[0] ?? { minLevel: 1, emoji: "🥚", title: "Питомец" };
}

export function selectMoodLabel(mood: number, energy: number): PetMoodLabel {
  if (energy < 30) return "tired";
  if (mood >= 70) return "happy";
  if (mood >= 40) return "neutral";
  return "sad";
}

export function pickPhrase(phrasesJson: unknown, label: PetMoodLabel): string {
  const phrases = asPhrases(phrasesJson);
  const pool = phrases[label] ?? phrases["neutral"] ?? [];
  return pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)]! : "…";
}
