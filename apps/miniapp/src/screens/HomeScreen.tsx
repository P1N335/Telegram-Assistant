import { useState } from "react";
import type { HomeResponse, TaskDto } from "@tpc/shared";
import { levelProgress } from "@tpc/shared";
import { Card, Chip, ProgressBar } from "../components/ui.js";
import { TaskItem } from "../components/TaskItem.js";
import { PetCard } from "../components/PetCard.js";

interface Props {
  data: HomeResponse;
  onStatus: (id: string, status: TaskDto["status"]) => void;
  onPlan: (text: string) => Promise<void>;
  busy?: boolean;
}

export function HomeScreen({ data, onStatus, onPlan, busy }: Props) {
  const { user, statistics, tasks } = data;
  const [draft, setDraft] = useState("");

  const completed = tasks.filter((t) => t.status === "COMPLETED").length;
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
          <p className="text-tg-hint text-sm">С возвращением,</p>
          <h1 className="text-xl font-bold">{user.firstName ?? "друг"} 👋</h1>
        </div>
        <div className="bg-tg-button text-tg-buttonText rounded-2xl px-3 py-1.5 text-center">
          <div className="text-xs opacity-80">уровень</div>
          <div className="text-lg font-bold leading-none">{statistics.level}</div>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <Chip icon="✨" label={`${statistics.xp} XP`} />
        <Chip icon="🔥" label={`${statistics.currentStreak} дней`} />
        <Chip icon="📈" label={`${Math.round(statistics.completionRate * 100)}%`} />
      </div>

      <Card>
        <div className="text-tg-hint mb-2 flex justify-between text-sm">
          <span>До уровня {lvl.level + 1}</span>
          <span>
            {lvl.xpIntoLevel} / {lvl.xpForLevelSpan} XP
          </span>
        </div>
        <ProgressBar value={lvl.ratio} />
      </Card>

      <Card>
        <div className="text-tg-hint mb-2 flex justify-between text-sm">
          <span>Прогресс дня</span>
          <span>
            {completed} / {tasks.length}
          </span>
        </div>
        <ProgressBar value={dayProgress} />
      </Card>

      <PetCard pet={data.pet} compact />

      <section>
        <h2 className="mb-2 font-semibold">Задачи на сегодня</h2>
        {tasks.length === 0 ? (
          <p className="text-tg-hint text-sm">Пока пусто. Добавь задачи ниже 👇</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((t) => (
              <TaskItem key={t.id} task={t} onStatus={onStatus} disabled={busy} />
            ))}
          </div>
        )}
      </section>

      <Card>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={"Новый план — по задаче на строку:\nЗакончить диплом\nСходить в зал"}
          rows={3}
          className="bg-tg-bg w-full resize-none rounded-xl p-3 text-sm outline-none"
        />
        <button
          onClick={submitPlan}
          disabled={busy || !draft.trim()}
          className="bg-tg-button text-tg-buttonText mt-2 w-full rounded-xl py-2.5 text-sm font-medium disabled:opacity-40"
        >
          Добавить в план
        </button>
      </Card>
    </div>
  );
}
