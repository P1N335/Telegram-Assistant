import type { TaskDto } from "@tpc/shared";

const STATUS_EMOJI: Record<TaskDto["status"], string> = {
  PENDING: "⬜️",
  COMPLETED: "✅",
  SKIPPED: "⏭️",
  POSTPONED: "⌛️",
};

interface Props {
  task: TaskDto;
  onStatus: (id: string, status: TaskDto["status"]) => void;
  disabled?: boolean;
}

export function TaskItem({ task, onStatus, disabled }: Props) {
  const done = task.status === "COMPLETED";
  return (
    <div className="bg-tg-secondaryBg flex items-center gap-3 rounded-xl p-3">
      <span className="text-lg">{STATUS_EMOJI[task.status]}</span>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm ${done ? "text-tg-hint line-through" : ""}`}>{task.title}</p>
        {task.description && <p className="text-tg-hint truncate text-xs">{task.description}</p>}
      </div>
      <div className="flex gap-1">
        <ActionButton label="✅" active={done} disabled={disabled} onClick={() => onStatus(task.id, done ? "PENDING" : "COMPLETED")} />
        <ActionButton label="⏭️" active={task.status === "SKIPPED"} disabled={disabled} onClick={() => onStatus(task.id, "SKIPPED")} />
        <ActionButton label="⌛️" active={task.status === "POSTPONED"} disabled={disabled} onClick={() => onStatus(task.id, "POSTPONED")} />
      </div>
    </div>
  );
}

function ActionButton({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-2 py-1 text-sm transition ${active ? "border border-tg-link bg-tg-bg" : "bg-tg-bg"} disabled:opacity-40`}
    >
      {label}
    </button>
  );
}
