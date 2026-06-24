import { useCallback, useEffect, useMemo, useState } from "react";
import type { SkillDto, TaskDto, TaskPeriod } from "@tpc/shared";
import { api } from "../api/client.js";
import { Loader } from "../components/ui.js";
import { TaskCard } from "../components/TaskCard.js";
import { SkillSelect } from "../components/SkillSelect.js";
import { useI18n } from "../i18n/index.js";

const PERIODS: TaskPeriod[] = ["DAY", "WEEK", "MONTH", "YEAR"];

export function TasksScreen({ onChanged }: { onChanged?: () => void }) {
  const { t } = useI18n();
  const [period, setPeriod] = useState<TaskPeriod>("DAY");
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [skillCode, setSkillCode] = useState("");

  const [skills, setSkills] = useState<SkillDto[]>([]);
  const skillByCode = useMemo(() => new Map(skills.map((s) => [s.code, s])), [skills]);

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

  // Скиллы грузим один раз — для выбора при создании и для меток на карточках.
  useEffect(() => {
    void api.getSkills().then((r) => setSkills(r.skills)).catch(() => setSkills([]));
  }, []);

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
    await run(() => api.createTask({ title: t, period, dueDate, skillCode: skillCode || null }));
    setTitle("");
    setDate("");
    setTime("");
    setSkillCode("");
    setFormOpen(false);
  };

  const active = tasks.filter((tk) => tk.status !== "COMPLETED").length;
  const completed = tasks.filter((tk) => tk.status === "COMPLETED").length;

  return (
    <div className="space-y-4 p-4">
      <header>
        <h1 className="text-xl font-bold">{t("tasks.title")}</h1>
        <p className="text-tg-hint text-sm">{t("tasks.subtitle")}</p>
      </header>

      <div className="bg-tg-secondaryBg grid grid-cols-4 gap-1 rounded-2xl p-1">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-xl py-2 text-sm font-medium transition ${
              period === p ? "bg-tg-bg shadow-sm" : "text-tg-hint"
            }`}
          >
            {t(`period.${p}`)}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">{t("tasks.listTitle", { period: t(`period.${period}`) })}</h2>
          <p className="text-tg-hint text-xs">{t("tasks.counts", { active, completed })}</p>
        </div>
        <button
          onClick={() => setFormOpen((v) => !v)}
          className="bg-tg-button text-tg-buttonText rounded-xl px-3 py-2 text-sm font-medium"
        >
          {t("tasks.new")}
        </button>
      </div>

      {formOpen && (
        <div className="bg-tg-secondaryBg space-y-2 rounded-2xl p-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("tasks.titlePlaceholder")}
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
          <SkillSelect skills={skills} value={skillCode} onChange={setSkillCode} disabled={busy} />
          <p className="text-tg-hint text-xs">{t("tasks.reminderHint")}</p>
          <button
            onClick={createTask}
            disabled={busy || !title.trim()}
            className="bg-tg-button text-tg-buttonText w-full rounded-xl py-2.5 text-sm font-medium disabled:opacity-40"
          >
            {t("common.create")}
          </button>
        </div>
      )}

      {loading ? (
        <Loader />
      ) : tasks.length === 0 ? (
        <p className="text-tg-hint py-8 text-center text-sm">{t("tasks.empty")}</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((tk) => (
            <TaskCard
              key={tk.id}
              task={tk}
              busy={busy}
              skill={tk.skillCode ? skillByCode.get(tk.skillCode) : undefined}
              onToggle={(task) =>
                run(() =>
                  api.setTaskStatus(task.id, task.status === "COMPLETED" ? "PENDING" : "COMPLETED"),
                )
              }
              onDelete={(id) => run(() => api.deleteTask(id))}
              onReschedule={(id, dueDate) => run(() => api.updateTask(id, { dueDate }))}
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
