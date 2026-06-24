import {
  levelFromXp,
  MAX_PETS_PER_USER,
  PET_NAME_MAX_LENGTH,
  PET_NAME_MIN_LENGTH,
  type CreatePetRequest,
  type PetCollectionDto,
  type PetCustomizationDto,
  type PetDto,
  type PetSummaryDto,
  type UpdatePetRequest,
} from "@tpc/shared";
import { NotFoundError, ValidationError } from "../../shared/errors/index.js";
import { now as clockNow } from "../../shared/clock.js";
import type { IPetRepository, PetAppearancePatch, PetWithRelations } from "./pet.repository.js";
import { applyDecay, boost, pickPhrase, sanitizePetName, selectMoodLabel, stageFor } from "./pet.rules.js";

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

  /**
   * Находит активного питомца пользователя или создаёт при первом обращении (онбординг).
   * Самовосстановление инварианта: если активного нет, но питомцы есть (legacy/рассинхрон) —
   * назначает активным самого старого. Горячий путь (активный есть) — один запрос.
   */
  async getOrCreate(userId: string): Promise<PetWithRelations> {
    const active = await this.repo.findActiveByUserId(userId);
    if (active) return active;

    const existing = await this.repo.listByUserId(userId);
    if (existing.length > 0) {
      const promote = existing[0]!;
      await this.repo.setActive(userId, promote.id);
      return (await this.repo.findActiveByUserId(userId)) ?? promote;
    }

    const species = await this.repo.findSpeciesByCode(this.defaultSpeciesCode);
    if (!species) {
      throw new NotFoundError(`Вид питомца "${this.defaultSpeciesCode}" не найден — запусти seed`);
    }
    return this.repo.createForUser(userId, species.id, species.name, true);
  }

  /** Текущее состояние для UI (decay вычисляется на чтении, без записи в БД). */
  async getView(userId: string, now: Date = clockNow()): Promise<PetDto> {
    const pet = await this.getOrCreate(userId);
    return this.toDto(pet, this.currentState(pet, now));
  }

  /**
   * Доступные варианты внешнего вида (виды из каталога) + текущий выбор.
   * Доступно всем (показ каталога); смена применяется только премиум-фичей
   * PET_CUSTOMIZATION (гейт `requireFeature` на роуте PATCH). Превью эмодзи —
   * под текущий уровень питомца, чтобы пользователь видел актуальный вид.
   */
  async getCustomization(userId: string): Promise<PetCustomizationDto> {
    const pet = await this.getOrCreate(userId);
    const species = await this.repo.listSpecies();
    return {
      options: species.map((s) => ({
        speciesCode: s.code,
        name: s.name,
        emoji: stageFor(s.stages, pet.level).emoji,
        description: s.description,
      })),
      current: { speciesCode: pet.species.code, name: pet.name },
    };
  }

  /**
   * Кастомизация имени и/или внешнего вида (премиум). Валидирует имя (trim/длина)
   * и существование вида; уровень/XP/состояние сохраняются. Идемпотентна (PUT-семантика).
   * Гейтинг доступа — на уровне роута (`requireFeature`), сервис не знает о подписке.
   */
  async customize(userId: string, req: UpdatePetRequest, now: Date = clockNow()): Promise<PetDto> {
    const pet = await this.getOrCreate(userId);
    const patch: PetAppearancePatch = {};

    if (req.name !== undefined) {
      const { ok, value } = sanitizePetName(req.name, PET_NAME_MAX_LENGTH);
      if (!ok) throw new ValidationError(`Имя должно быть от 1 до ${PET_NAME_MAX_LENGTH} символов`);
      patch.name = value;
    }

    if (req.speciesCode !== undefined) {
      const species = await this.repo.findSpeciesByCode(req.speciesCode);
      if (!species || !species.isActive) throw new ValidationError("Такой вид недоступен");
      patch.speciesId = species.id;
    }

    if (patch.name === undefined && patch.speciesId === undefined) {
      throw new ValidationError("Нечего менять: укажите имя или вид");
    }

    const updated = await this.repo.updateAppearance(pet.id, patch);
    return this.toDto(updated, this.currentState(updated, now));
  }

  // ── Мульти-петы (премиум: PremiumFeature.MULTI_PET) ───────────────────────
  // Гейтинг доступа — на уровне роута (`requireFeature`), сервис подписку не знает.
  // Сервис держит инвариант «ровно один активный» и жёсткий потолок MAX_PETS_PER_USER.

  /** Коллекция питомцев пользователя (гарантирует наличие хотя бы одного активного). */
  async getCollection(userId: string): Promise<PetCollectionDto> {
    await this.getOrCreate(userId); // гарантирует ≥1 питомца и активного среди них
    const pets = await this.repo.listByUserId(userId);
    const active = pets.find((p) => p.isActive) ?? pets[0]!;
    return {
      pets: pets.map((p) => this.toSummary(p)),
      activePetId: active.id,
      maxPets: MAX_PETS_PER_USER,
      canAddMore: pets.length < MAX_PETS_PER_USER,
    };
  }

  /**
   * Создать дополнительного питомца (премиум). Новый питомец становится активным.
   * Валидирует имя (или берёт имя вида) и существование вида; держит потолок.
   */
  async createPet(userId: string, req: CreatePetRequest): Promise<PetCollectionDto> {
    const count = await this.repo.countByUserId(userId);
    if (count >= MAX_PETS_PER_USER) {
      throw new ValidationError(`Достигнут лимит питомцев (${MAX_PETS_PER_USER})`);
    }

    const speciesCode = req.speciesCode ?? this.defaultSpeciesCode;
    const species = await this.repo.findSpeciesByCode(speciesCode);
    if (!species || !species.isActive) throw new ValidationError("Такой вид недоступен");

    let name = species.name;
    if (req.name !== undefined) {
      const { ok, value } = sanitizePetName(req.name, PET_NAME_MAX_LENGTH);
      if (!ok) {
        throw new ValidationError(
          `Имя должно быть от ${PET_NAME_MIN_LENGTH} до ${PET_NAME_MAX_LENGTH} символов`,
        );
      }
      name = value;
    }

    await this.repo.createForUser(userId, species.id, name, true);
    return this.getCollection(userId);
  }

  /**
   * Сделать выбранного (уже принадлежащего пользователю) питомца активным.
   * Не гейтится премиумом: пользователь лишь выбирает среди своих питомцев
   * (важно, чтобы downgrade не запирал доступ к уже созданным питомцам).
   */
  async activatePet(userId: string, petId: string): Promise<PetCollectionDto> {
    const pet = await this.repo.findByIdForUser(petId, userId);
    if (!pet) throw new NotFoundError("Питомец не найден");
    if (!pet.isActive) await this.repo.setActive(userId, petId);
    return this.getCollection(userId);
  }

  private toSummary(pet: PetWithRelations): PetSummaryDto {
    const stage = stageFor(pet.species.stages, pet.level);
    return {
      id: pet.id,
      name: pet.name,
      speciesCode: pet.species.code,
      emoji: stage.emoji,
      stageTitle: stage.title,
      level: pet.level,
      xp: pet.xp,
      isActive: pet.isActive,
    };
  }

  /** Текущее mood/energy с ленивым decay (общий помощник для чтения и кастомизации). */
  private currentState(pet: PetWithRelations, now: Date): { mood: number; energy: number } {
    const state = pet.state ?? { mood: 80, energy: 80, lastInteractionAt: pet.createdAt };
    return applyDecay(state.mood, state.energy, state.lastInteractionAt, now);
  }

  /**
   * Награда за активность: материализуем decay до now, добавляем буст и опыт,
   * пересчитываем уровень, сбрасываем точку отсчёта decay.
   */
  async reward(userId: string, reward: PetReward, now: Date = clockNow()): Promise<void> {
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
