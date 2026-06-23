import type { Skill, SkillTemplate } from "@tpc/database";

export interface CreateSkillData {
  code: string;
  name: string;
  icon?: string | null;
}

/**
 * Патч XP/уровня скилла. incXp атомарен (без гонок) для наград; setXp — перезапись
 * для штрафа с клампом до 0; setLevel — пересчитанный уровень. Зеркало StatsPatch.
 */
export interface SkillXpPatch {
  incXp?: number;
  setXp?: number;
  setLevel?: number;
}

export interface ISkillRepository {
  listByUser(userId: string): Promise<Skill[]>;
  findByUserAndCode(userId: string, code: string): Promise<Skill | null>;
  create(userId: string, data: CreateSkillData): Promise<Skill>;
  applyXp(skillId: string, patch: SkillXpPatch): Promise<Skill>;

  listTemplates(): Promise<SkillTemplate[]>;
  findTemplateByCode(code: string): Promise<SkillTemplate | null>;
}
