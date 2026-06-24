import { useState } from "react";
import type { HomeResponse, TaskDto } from "@tpc/shared";
import { levelProgress } from "@tpc/shared";
import { Card, Chip, ProgressBar } from "../components/ui.js";
import { TaskItem } from "../components/TaskItem.js";
import { PetCard } from "../components/PetCard.js";
import { HabitCircles } from "../components/HabitCircles.js";
import { useI18n } from "../i18n/index.js";

interface Props {
  data: HomeResponse;
  onStatus: (id: string, status: TaskDto["status"]) => void;
  onPlan: (text: string) => Promise<void>;
  onChanged?: () => void;
  busy?: boolean;
}

export function HomeScreen({ data, onStatus, onPlan, onChanged, busy }: Props) {
  const { t, plural } = useI18n();
  const { user, statistics, tasks } = data;
  const [draft, setDraft] = useState("");

  const completed = tasks.filter((task) => task.status === "COMPLETED").length;
  const dayProgress = tasks.length > 0 ? completed / tasks.length : 0;
  const lvl = levelProgress(statistics.xp);

  const submitPlan = async () => {
    const text = draft.trim();
    if (!text) return;
    await onPlan(text);
    setDraft("");
  };

  return (
    <div className="space-y-4 p-4">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-tg-hint text-sm">{t("home.greeting")}</p>
          <h1 className="text-xl font-bold">{user.firstName ?? t("home.friend")} 👋</h1>
        </div>
        <div className="bg-tg-button text-tg-buttonText rounded-2xl px-3 py-1.5 text-center">
          <div className="text-xs opacity-80">{t("home.levelLabel")}</div>
          <div className="text-lg font-bold leading-none">{statistics.level}</div>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <Chip icon="✨" label={t("chip.xp", { xp: statistics.xp })} />
        <Chip icon="🔥" label={plural(statistics.currentStreak, "units.day")} />
        <Chip icon="📈" label={`${Math.round(statistics.completionRate * 100)}%`} />
        {data.premium.active && <Chip icon="⭐" label="Premium" />}
      </div>

      <Card>
        <div className="text-tg-hint mb-2 flex justify-between text-sm">
          <span>{t("home.progressToLevel", { level: lvl.level + 1 })}</span>
          <span>
            {lvl.xpIntoLevel} / {lvl.xpForLevelSpan} XP
          </span>
        </div>
        <ProgressBar value={lvl.ratio} />
      </Card>

      <Card>
        <div className="text-tg-hint mb-2 flex justify-between text-sm">
          <span>{t("home.dayProgress")}</span>
          <span>
            {completed} / {tasks.length}
          </span>
        </div>
        <ProgressBar value={dayProgress} />
      </Card>

      <HabitCircles onChanged={onChanged} />

      <PetCard pet={data.pet} compact />

      <section>
        <h2 className="mb-2 font-semibold">{t("home.todayTasks")}</h2>
        {tasks.length === 0 ? (
          <p className="text-tg-hint text-sm">{t("home.tasksEmpty")}</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskItem key={task.id} task={task} onStatus={onStatus} disabled={busy} />
            ))}
          </div>
        )}
      </section>

      <Card>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("home.planPlaceholder")}
          rows={3}
          className="bg-tg-bg w-full resize-none rounded-xl p-3 text-sm outline-none"
        />
        <button
          onClick={submitPlan}
          disabled={busy || !draft.trim()}
          className="bg-tg-button text-tg-buttonText mt-2 w-full rounded-xl py-2.5 text-sm font-medium disabled:opacity-40"
        >
          {t("home.addToPlan")}
        </button>
      </Card>
    </div>
  );
}
