import { levelFromXp, type PetDto } from "@tpc/shared";
import { NotFoundError } from "../../shared/errors/index.js";
import type { IPetRepository, PetWithRelations } from "./pet.repository.js";
import { applyDecay, boost, pickPhrase, selectMoodLabel, stageFor } from "./pet.rules.js";

export interface PetReward {
  xp: number;
  moodBoost: number;
  energyBoost: number;
}

/**
 * Сервис питомца. Состояние читается с ленивым decay (без cron),
 * растёт на доменных событиях. Расширяемость видов — через PetSpecies (seed).
 */
export class PetService {
  constructor(
    private readonly repo: IPetRepository,
    private readonly defaultSpeciesCode: string = "cat",
  ) {}

  /** Находит питомца пользователя или создаёт при первом обращении (онбординг). */
  async getOrCreate(userId: string): Promise<PetWithRelations> {
    const existing = await this.repo.findByUserId(userId);
    if (existing) return existing;

    const species = await this.repo.findSpeciesByCode(this.defaultSpeciesCode);
    if (!species) {
      throw new NotFoundError(`Вид питомца "${this.defaultSpeciesCode}" не найден — запусти seed`);
    }
    return this.repo.createForUser(userId, species.id, species.name);
  }

  /** Текущее состояние для UI (decay вычисляется на чтении, без записи в БД). */
  async getView(userId: string, now: Date = new Date()): Promise<PetDto> {
    const pet = await this.getOrCreate(userId);
    const state = pet.state ?? { mood: 80, energy: 80, lastInteractionAt: pet.createdAt };
    const current = applyDecay(state.mood, state.energy, state.lastInteractionAt, now);
    return this.toDto(pet, current);
  }

  /**
   * Награда за активность: материализуем decay до now, добавляем буст и опыт,
   * пересчитываем уровень, сбрасываем точку отсчёта decay.
   */
  async reward(userId: string, reward: PetReward, now: Date = new Date()): Promise<void> {
    const pet = await this.getOrCreate(userId);
    const state = pet.state ?? { mood: 80, energy: 80, lastInteractionAt: pet.createdAt };

    const decayed = applyDecay(state.mood, state.energy, state.lastInteractionAt, now);
    await this.repo.updateState(pet.id, {
      mood: boost(decayed.mood, reward.moodBoost),
      energy: boost(decayed.energy, reward.energyBoost),
      lastInteractionAt: now,
    });

    const newXp = pet.xp + reward.xp;
    const newLevel = levelFromXp(newXp);
    if (newXp !== pet.xp || newLevel !== pet.level) {
      await this.repo.updatePet(pet.id, { xp: newXp, level: newLevel });
    }
  }

  private toDto(pet: PetWithRelations, current: { mood: number; energy: number }): PetDto {
    const stage = stageFor(pet.species.stages, pet.level);
    const moodLabel = selectMoodLabel(current.mood, current.energy);
    return {
      name: pet.name,
      speciesCode: pet.species.code,
      emoji: stage.emoji,
      stageTitle: stage.title,
      level: pet.level,
      xp: pet.xp,
      mood: current.mood,
      energy: current.energy,
      moodLabel,
      phrase: pickPhrase(pet.species.phrases, moodLabel),
    };
  }
}
