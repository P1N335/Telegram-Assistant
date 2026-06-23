import type { PrismaClient, Skill, SkillTemplate } from "@tpc/database";
import type { CreateSkillData, ISkillRepository, SkillXpPatch } from "./skill.repository.js";

export class PrismaSkillRepository implements ISkillRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listByUser(userId: string): Promise<Skill[]> {
    return this.prisma.skill.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  }

  findByUserAndCode(userId: string, code: string): Promise<Skill | null> {
    return this.prisma.skill.findUnique({ where: { userId_code: { userId, code } } });
  }

  create(userId: string, data: CreateSkillData): Promise<Skill> {
    return this.prisma.skill.create({
      data: { userId, code: data.code, name: data.name, icon: data.icon ?? null },
    });
  }

  applyXp(skillId: string, patch: SkillXpPatch): Promise<Skill> {
    return this.prisma.skill.update({
      where: { id: skillId },
      data: {
        ...(patch.incXp !== undefined ? { xp: { increment: patch.incXp } } : {}),
        ...(patch.setXp !== undefined ? { xp: patch.setXp } : {}),
        ...(patch.setLevel !== undefined ? { level: patch.setLevel } : {}),
      },
    });
  }

  listTemplates(): Promise<SkillTemplate[]> {
    return this.prisma.skillTemplate.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  }

  findTemplateByCode(code: string): Promise<SkillTemplate | null> {
    return this.prisma.skillTemplate.findUnique({ where: { code } });
  }
}
