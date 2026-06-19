import { useCallback, useEffect, useState } from "react";
import type { TaskDto, TaskPeriod } from "@tpc/shared";
import { api } from "../api/client.js";
import { Loader } from "../components/ui.js";
import { TaskCard } from "../components/TaskCard.js";

const PERIODS: Array<{ id: TaskPeriod; label: string }> = [
  { id: "DAY", label: "День" },
  { id: "WEEK", label: "Неделя" },
  { id: "MONTH", label: "Месяц" },
  { id: "YEAR", label: "Год" },
];

export function TasksScreen({ onChanged }: { onChanged?: () => void }) {
  const [period, setPeriod] = useState<TaskPeriod>("DAY");
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const load = useCallback(async (p: TaskPeriod) => {
    setLoading(true);
    try {
      const res = await api.getTasks(p);
      setTasks(res.tasks);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(period);
  }, [period, load]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      await load(period);
      onChanged?.();
    } finally {
      setBusy(false);
    }
  };

  const createTask = async () => {
    const t = title.trim();
    if (!t) return;
    let dueDate: string | null = null;
    if (date) dueDate = new Date(`${date}T${time || "09:00"}:00`).toISOString();
    await run(() => api.createTask({ title: t, period, dueDate }));
    setTitle("");
    setDate("");
    setTime("");
    setFormOpen(false);
  };

  const active = tasks.filter((t) => t.status !== "COMPLETED").length;
  const completed = tasks.filter((t) => t.status === "COMPLETED").length;

  return (
    <div className="space-y-4 p-4">
      <header>
        <h1 className="text-xl font-bold">Мои задачи</h1>
        <p className="text-tg-hint text-sm">Планируйте задачи на разные периоды</p>
      </header>

      <div className="bg-tg-secondaryBg grid grid-cols-4 gap-1 rounded-2xl p-1">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`rounded-xl py-2 text-sm font-medium transition ${
              period === p.id ? "bg-tg-bg shadow-sm" : "text-tg-hint"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Задачи: {PERIODS.find((p) => p.id === period)?.label}</h2>
          <p className="text-tg-hint text-xs">
            {active} активных, {completed} выполнено
          </p>
        </div>
        <button
          onClick={() => setFormOpen((v) => !v)}
          className="bg-tg-button text-tg-buttonText rounded-xl px-3 py-2 text-sm font-medium"
        >
          + Новая задача
        </button>
      </div>

      {formOpen && (
        <div className="bg-tg-secondaryBg space-y-2 rounded-2xl p-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Что нужно сделать?"
            className="bg-tg-bg w-full rounded-xl px-3 py-2 text-sm outline-none"
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-tg-bg flex-1 rounded-xl px-3 py-2 text-sm outline-none"
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="bg-tg-bg w-28 rounded-xl px-3 py-2 text-sm outline-none"
            />
          </div>
          <p className="text-tg-hint text-xs">
            Если указать дату и время — бот напомнит примерно за час до дедлайна.
          </p>
          <button
            onClick={createTask}
            disabled={busy || !title.trim()}
            className="bg-tg-button text-tg-buttonText w-full rounded-xl py-2.5 text-sm font-medium disabled:opacity-40"
          >
            Создать
          </button>
        </div>
      )}

      {loading ? (
        <Loader />
      ) : tasks.length === 0 ? (
        <p className="text-tg-hint py-8 text-center text-sm">Нет задач. Создайте первую задачу!</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              busy={busy}
              onToggle={(task) =>
                run(() =>
                  api.setTaskStatus(task.id, task.status === "COMPLETED" ? "PENDING" : "COMPLETED"),
                )
              }
              onDelete={(id) => run(() => api.deleteTask(id))}
              onAddSubtask={(taskId, st) => run(() => api.addSubtask(taskId, st))}
              onToggleSubtask={(id, isDone) => run(() => api.updateSubtask(id, { isDone }))}
              onDeleteSubtask={(id) => run(() => api.deleteSubtask(id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
