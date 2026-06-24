import type { PrismaClient, PetSpecies } from "@tpc/database";
import type { IPetRepository, PetAppearancePatch, PetWithRelations } from "./pet.repository.js";

export class PrismaPetRepository implements IPetRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findActiveByUserId(userId: string): Promise<PetWithRelations | null> {
    return this.prisma.pet.findFirst({
      where: { userId, isActive: true },
      orderBy: { createdAt: "asc" }, // детерминизм при гипотетических дубликатах
      include: { species: true, state: true },
    });
  }

  listByUserId(userId: string): Promise<PetWithRelations[]> {
    return this.prisma.pet.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: { species: true, state: true },
    });
  }

  countByUserId(userId: string): Promise<number> {
    return this.prisma.pet.count({ where: { userId } });
  }

  findByIdForUser(petId: string, userId: string): Promise<PetWithRelations | null> {
    return this.prisma.pet.findFirst({
      where: { id: petId, userId },
      include: { species: true, state: true },
    });
  }

  findSpeciesByCode(code: string): Promise<PetSpecies | null> {
    return this.prisma.petSpecies.findUnique({ where: { code } });
  }

  listSpecies(): Promise<PetSpecies[]> {
    return this.prisma.petSpecies.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
    });
  }

  async createForUser(
    userId: string,
    speciesId: string,
    name: string,
    activate = true,
  ): Promise<PetWithRelations> {
    const create = (tx: PrismaClient): Promise<PetWithRelations> =>
      tx.pet.create({
        data: { userId, speciesId, name, isActive: activate, state: { create: {} } },
        include: { species: true, state: true },
      });

    if (!activate) return create(this.prisma);

    // Атомарно: гасим активность прочих питомцев и создаём нового активным.
    return this.prisma.$transaction(async (tx) => {
      await tx.pet.updateMany({ where: { userId, isActive: true }, data: { isActive: false } });
      return create(tx as unknown as PrismaClient);
    });
  }

  async setActive(userId: string, petId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.pet.updateMany({ where: { userId, isActive: true }, data: { isActive: false } }),
      this.prisma.pet.update({ where: { id: petId }, data: { isActive: true } }),
    ]);
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

  updateAppearance(petId: string, patch: PetAppearancePatch): Promise<PetWithRelations> {
    return this.prisma.pet.update({
      where: { id: petId },
      data: {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.speciesId !== undefined ? { speciesId: patch.speciesId } : {}),
      },
      include: { species: true, state: true },
    });
  }
}
