import type { Skill } from "@tpc/database";
import {
  levelFromXp,
  levelProgress,
  type SkillDto,
  type SkillTemplateDto,
  type CreateSkillRequest,
} from "@tpc/shared";
import { ValidationError } from "../../shared/errors/index.js";
import type { ISkillRepository, SkillXpPatch } from "./skill.repository.js";

/**
 * Скиллы пользователя, роадмап (каталог шаблонов) и начисление XP скиллам.
 * XP скилла меняется только здесь (через awardXp), вызывается подписчиком на
 * доменные события (skills/register.ts) — источники о слое скиллов не знают.
 */
export class SkillService {
  constructor(private readonly repo: ISkillRepository) {}

  async listSkills(userId: string): Promise<SkillDto[]> {
    const skills = await this.repo.listByUser(userId);
    return skills.map(SkillService.toDto);
  }

  async listRoadmap(userId: string): Promise<SkillTemplateDto[]> {
    const [templates, owned] = await Promise.all([
      this.repo.listTemplates(),
      this.repo.listByUser(userId),
    ]);
    const ownedCodes = new Set(owned.map((s) => s.code));
    return templates.map((t) => ({
      code: t.code,
      name: t.name,
      icon: t.icon,
      description: t.description,
      category: t.category,
      added: ownedCodes.has(t.code),
    }));
  }

  async addSkill(userId: string, req: CreateSkillRequest): Promise<SkillDto> {
    let code: string;
    let name: string;
    let icon: string | null = null;

    if (req.code) {
      const template = await this.repo.findTemplateByCode(req.code);
      if (!template) throw new ValidationError("Шаблон скилла не найден");
      code = template.code;
      name = template.name;
      icon = template.icon;
    } else {
      name = (req.name ?? "").trim();
      if (!name) throw new ValidationError("Укажите название скилла");
      code = `custom:${name.toLowerCase()}`;
      icon = req.icon ?? null;
    }

    const existing = await this.repo.findByUserAndCode(userId, code);
    if (existing) throw new ValidationError("Такой скилл уже добавлен");

    return SkillService.toDto(await this.repo.create(userId, { code, name, icon }));
  }

  /**
   * Начисление XP скиллу пользователя по его коду (delta может быть отрицательной —
   * возврат при снятии отметки). No-op, если скилл не добавлен пользователем
   * (привязка задачи/привычки сохраняется, но XP пойдёт, когда скилл появится — анти-связность)
   * или delta == 0. XP клампится до 0, уровень пересчитывается формулой из @tpc/shared
   * (может и снизиться). Возвращает обновлённый скилл или null, если начисление не выполнено.
   */
  async awardXp(userId: string, code: string | null | undefined, delta: number): Promise<SkillDto | null> {
    if (!code || delta === 0) return null;

    const skill = await this.repo.findByUserAndCode(userId, code);
    if (!skill) return null;

    const newXp = Math.max(0, skill.xp + delta); // XP скилла не уходит ниже 0
    const newLevel = levelFromXp(newXp);

    const patch: SkillXpPatch = {};
    if (delta > 0) patch.incXp = delta; // атомарный инкремент — безопасно к гонкам
    else patch.setXp = newXp; // штраф/возврат с клампом — перезапись
    if (newLevel !== skill.level) patch.setLevel = newLevel;

    return SkillService.toDto(await this.repo.applyXp(skill.id, patch));
  }

  static toDto(s: Skill): SkillDto {
    const p = levelProgress(s.xp);
    return {
      id: s.id,
      code: s.code,
      name: s.name,
      icon: s.icon,
      xp: s.xp,
      level: s.level,
      xpIntoLevel: p.xpIntoLevel,
      xpForLevelSpan: p.xpForLevelSpan,
      ratio: p.ratio,
    };
  }
}
