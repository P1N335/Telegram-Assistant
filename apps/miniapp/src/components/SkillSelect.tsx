import type { SkillDto } from "@tpc/shared";

/**
 * Опциональный выбор скилла для привязки задачи/привычки. Пустое значение ("") —
 * «без скилла». Скрывается, если у пользователя ещё нет ни одного скилла.
 */
export function SkillSelect({
  skills,
  value,
  onChange,
  disabled,
  className = "bg-tg-bg",
}: {
  skills: SkillDto[];
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  if (skills.length === 0) return null;
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`${className} w-full rounded-xl px-3 py-2 text-sm outline-none`}
    >
      <option value="">🎯 Без скилла</option>
      {skills.map((s) => (
        <option key={s.code} value={s.code}>
          {(s.icon ? `${s.icon} ` : "") + s.name}
        </option>
      ))}
    </select>
  );
}
