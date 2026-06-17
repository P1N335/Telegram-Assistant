import type { HomeResponse } from "@tpc/shared";
import { levelProgress } from "@tpc/shared";
import { Card, ProgressBar } from "../components/ui.js";
import { PetCard } from "../components/PetCard.js";

interface Props {
  data: HomeResponse;
}

export function PetScreen({ data }: Props) {
  const { pet, statistics } = data;
  const lvl = levelProgress(pet.xp);

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">Питомец</h1>

      <PetCard pet={pet} />

      <Card>
        <div className="text-tg-hint mb-2 flex justify-between text-sm">
          <span>Опыт питомца</span>
          <span>
            {lvl.xpIntoLevel} / {lvl.xpForLevelSpan} XP
          </span>
        </div>
        <ProgressBar value={lvl.ratio} />
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">Как развивать</h2>
        <p className="text-tg-hint text-sm">
          Питомец растёт вместе с тобой: выполняй задачи, создавай план дня и заполняй вечерние отчёты —
          это поднимает его уровень, настроение и энергию. Если пропадать надолго, он заскучает и
          подустанет, так что заглядывай почаще 🐾
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Mini label="Уровень" value={`${pet.level}`} />
          <Mini label="Твоя серия" value={`${statistics.currentStreak}`} />
          <Mini label="Твой уровень" value={`${statistics.level}`} />
        </div>
      </Card>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-tg-bg rounded-xl py-3">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-tg-hint text-xs">{label}</div>
    </div>
  );
}
