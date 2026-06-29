import type { PetDto } from "@tpc/shared";
import { Card, ProgressBar } from "./ui.js";
import { useI18n } from "../i18n/index.js";

export function PetCard({ pet, compact = false }: { pet: PetDto; compact?: boolean }) {
  const { t } = useI18n();
  return (
    <Card>
      <div className="flex items-center gap-4">
        <span className={`pet-emoji pet-anim-${pet.moodLabel} ${compact ? "text-4xl" : "text-6xl"}`}>
          {pet.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{pet.name}</p>
            <span className="text-tg-hint text-xs">
              {t("pet.levelStage", { level: pet.level, stage: pet.stageTitle })}
            </span>
          </div>
          {!compact && <p className="text-tg-hint mt-0.5 text-sm italic">«{pet.phrase}»</p>}
          <div className="mt-3 space-y-2">
            <Stat
              label={`${t("pet.mood")} · ${t(`pet.moodLabel.${pet.moodLabel}`)}`}
              value={pet.mood}
            />
            <Stat label={t("pet.energy")} value={pet.energy} />
          </div>
        </div>
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-tg-hint mb-1 flex justify-between text-xs">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <ProgressBar value={value / 100} />
    </div>
  );
}
