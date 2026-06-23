import { useState } from "react";
import type { TaskDto } from "@tpc/shared";
import { Card } from "./ui.js";

interface Props {
  task: TaskDto;
  busy?: boolean;
  /** Скилл, к которому привязана задача (для отображения метки), если есть. */
  skill?: { name: string; icon: string | null };
  onToggle: (task: TaskDto) => void;
  onDelete: (id: string) => void;
  onReschedule: (id: string, dueDateIso: string) => void;
  onAddSubtask: (taskId: string, title: string) => void;
  onToggleSubtask: (id: string, isDone: boolean) => void;
  onDeleteSubtask: (id: string) => void;
}

function formatDue(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function splitIso(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export function TaskCard({
  task,
  busy,
  skill,
  onToggle,
  onDelete,
  onReschedule,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}: Props) {
  const done = task.status === "COMPLETED";
  const [subDraft, setSubDraft] = useState("");
  const [openSubs, setOpenSubs] = useState(false);

  const [openMove, setOpenMove] = useState(false);
  const init = splitIso(task.dueDate);
  const [mDate, setMDate] = useState(init.date);
  const [mTime, setMTime] = useState(init.time || "09:00");

  const doneCount = task.subtasks.filter((s) => s.isDone).length;

  const addSub = () => {
    const t = subDraft.trim();
    if (!t) return;
    onAddSubtask(task.id, t);
    setSubDraft("");
  };

  const saveMove = () => {
    if (!mDate) return;
    onReschedule(task.id, new Date(`${mDate}T${mTime || "09:00"}:00`).toISOString());
    setOpenMove(false);
  };

  return (
    <Card>
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggle(task)}
          disabled={busy}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs ${
            done ? "border-tg-link bg-tg-link text-white" : "border-tg-hint"
          }`}
          aria-label="toggle"
        >
          {done ? "✓" : ""}
        </button>

        <div className="min-w-0 flex-1">
          <p className={`text-sm ${done ? "text-tg-hint line-through" : ""}`}>{task.title}</p>

          <div className="text-tg-hint mt-1 flex flex-wrap items-center gap-2 text-xs">
            {skill && (
              <span className="bg-tg-bg text-tg-text inline-flex items-center gap-1 rounded-full px-2 py-0.5">
                <span>{skill.icon ?? "🎯"}</span>
                <span className="max-w-24 truncate">{skill.name}</span>
              </span>
            )}
            {task.dueDate && <span>🕒 {formatDue(task.dueDate)}</span>}
            <button onClick={() => setOpenMove((v) => !v)} className="underline">
              перенести
            </button>
            <button onClick={() => setOpenSubs((v) => !v)} className="underline">
              {task.subtasks.length > 0 ? `подзадачи ${doneCount}/${task.subtasks.length}` : "+ подзадача"}
            </button>
          </div>

          {openMove && (
            <div className="bg-tg-bg mt-2 space-y-2 rounded-xl p-2">
              <div className="flex gap-2">
                <input
                  type="date"
                  value={mDate}
                  onChange={(e) => setMDate(e.target.value)}
                  className="bg-tg-secondaryBg flex-1 rounded-lg px-2 py-1 text-sm outline-none"
                />
                <input
                  type="time"
                  value={mTime}
                  onChange={(e) => setMTime(e.target.value)}
                  className="bg-tg-secondaryBg w-24 rounded-lg px-2 py-1 text-sm outline-none"
                />
              </div>
              <button
                onClick={saveMove}
                disabled={busy || !mDate}
                className="bg-tg-button text-tg-buttonText w-full rounded-lg py-1.5 text-sm disabled:opacity-40"
              >
                Перенести
              </button>
            </div>
          )}

          {openSubs && (
            <div className="mt-2 space-y-1.5">
              {task.subtasks.map((s) => (
                <div key={s.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={s.isDone}
                    disabled={busy}
                    onChange={() => onToggleSubtask(s.id, !s.isDone)}
                  />
                  <span className={`flex-1 text-sm ${s.isDone ? "text-tg-hint line-through" : ""}`}>
                    {s.title}
                  </span>
                  <button onClick={() => onDeleteSubtask(s.id)} className="text-tg-hint text-xs">
                    ✕
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  value={subDraft}
                  onChange={(e) => setSubDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addSub()}
                  placeholder="Новая подзадача"
                  className="bg-tg-bg flex-1 rounded-lg px-2 py-1 text-sm outline-none"
                />
                <button onClick={addSub} disabled={busy} className="text-tg-link text-sm">
                  Добавить
                </button>
              </div>
            </div>
          )}
        </div>

        <button onClick={() => onDelete(task.id)} disabled={busy} className="text-tg-hint text-sm">
          🗑
        </button>
      </div>
    </Card>
  );
}
