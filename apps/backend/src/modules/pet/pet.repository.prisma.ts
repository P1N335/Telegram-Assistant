import type { PrismaClient, PetSpecies } from "@tpc/database";
import type { IPetRepository, PetWithRelations } from "./pet.repository.js";

export class PrismaPetRepository implements IPetRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByUserId(userId: string): Promise<PetWithRelations | null> {
    return this.prisma.pet.findUnique({
      where: { userId },
      include: { species: true, state: true },
    });
  }

  findSpeciesByCode(code: string): Promise<PetSpecies | null> {
    return this.prisma.petSpecies.findUnique({ where: { code } });
  }

  createForUser(userId: string, speciesId: string, name: string): Promise<PetWithRelations> {
    return this.prisma.pet.create({
      data: { userId, speciesId, name, state: { create: {} } },
      include: { species: true, state: true },
    });
  }

  async updateState(
    petId: string,
    data: { mood: number; energy: number; lastInteractionAt: Date },
  ): Promise<void> {
    await this.prisma.petState.update({ where: { petId }, data });
  }

  async updatePet(petId: string, data: { xp: number; level: number }): Promise<void> {
    await this.prisma.pet.update({ where: { id: petId }, data });
  }
}
