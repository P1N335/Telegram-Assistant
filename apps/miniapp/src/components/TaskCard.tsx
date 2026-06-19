import { useState } from "react";
import type { TaskDto } from "@tpc/shared";
import { Card } from "./ui.js";

interface Props {
  task: TaskDto;
  busy?: boolean;
  onToggle: (task: TaskDto) => void;
  onDelete: (id: string) => void;
  onAddSubtask: (taskId: string, title: string) => void;
  onToggleSubtask: (id: string, isDone: boolean) => void;
  onDeleteSubtask: (id: string) => void;
}

function formatDue(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function TaskCard({
  task,
  busy,
  onToggle,
  onDelete,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}: Props) {
  const done = task.status === "COMPLETED";
  const [subDraft, setSubDraft] = useState("");
  const [open, setOpen] = useState(false);

  const doneCount = task.subtasks.filter((s) => s.isDone).length;

  const addSub = () => {
    const t = subDraft.trim();
    if (!t) return;
    onAddSubtask(task.id, t);
    setSubDraft("");
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
            {task.dueDate && <span>🕒 {formatDue(task.dueDate)}</span>}
            {task.subtasks.length > 0 && (
              <button onClick={() => setOpen((v) => !v)} className="underline">
                подзадачи {doneCount}/{task.subtasks.length}
              </button>
            )}
            {task.subtasks.length === 0 && (
              <button onClick={() => setOpen((v) => !v)} className="underline">
                + подзадача
              </button>
            )}
          </div>

          {open && (
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
