import type { Pet, PetSpecies, PetState } from "@tpc/database";

export type PetWithRelations = Pet & { species: PetSpecies; state: PetState | null };

export interface IPetRepository {
  findByUserId(userId: string): Promise<PetWithRelations | null>;
  findSpeciesByCode(code: string): Promise<PetSpecies | null>;
  createForUser(userId: string, speciesId: string, name: string): Promise<PetWithRelations>;
  updateState(petId: string, data: { mood: number; energy: number; lastInteractionAt: Date }): Promise<void>;
  updatePet(petId: string, data: { xp: number; level: number }): Promise<void>;
}
