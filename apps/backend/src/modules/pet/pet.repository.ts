import type { Pet, PetSpecies, PetState } from "@tpc/database";

export type PetWithRelations = Pet & { species: PetSpecies; state: PetState | null };

/** Изменение внешнего вида/имени питомца (кастомизация). Поля опциональны. */
export interface PetAppearancePatch {
  name?: string;
  speciesId?: string;
}

export interface IPetRepository {
  /** Активный питомец пользователя (показываемый/растущий), либо null. */
  findActiveByUserId(userId: string): Promise<PetWithRelations | null>;
  /** Все питомцы пользователя (для коллекции), старые → новые. */
  listByUserId(userId: string): Promise<PetWithRelations[]>;
  /** Сколько питомцев у пользователя (для проверки лимита). */
  countByUserId(userId: string): Promise<number>;
  /** Питомец по id с проверкой владельца (ownership) — иначе null. */
  findByIdForUser(petId: string, userId: string): Promise<PetWithRelations | null>;
  findSpeciesByCode(code: string): Promise<PetSpecies | null>;
  /** Каталог доступных видов (для выбора внешнего вида), только активные. */
  listSpecies(): Promise<PetSpecies[]>;
  /**
   * Создать питомца. Если `activate` — в той же транзакции снимает активность
   * с прочих питомцев пользователя (инвариант «ровно один активный»).
   */
  createForUser(
    userId: string,
    speciesId: string,
    name: string,
    activate?: boolean,
  ): Promise<PetWithRelations>;
  /** Сделать `petId` единственным активным питомцем пользователя (атомарно). */
  setActive(userId: string, petId: string): Promise<void>;
  updateState(petId: string, data: { mood: number; energy: number; lastInteractionAt: Date }): Promise<void>;
  updatePet(petId: string, data: { xp: number; level: number }): Promise<void>;
  /** Применить кастомизацию (имя и/или вид); возвращает обновлённого питомца с relations. */
  updateAppearance(petId: string, patch: PetAppearancePatch): Promise<PetWithRelations>;
}
