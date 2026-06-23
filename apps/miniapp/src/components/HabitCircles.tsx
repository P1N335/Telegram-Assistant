import { useCallback, useEffect, useRef, useState } from "react";
import type { HabitDto, HabitCadence, CreateHabitRequest, SkillDto } from "@tpc/shared";
import { api } from "../api/client.js";
import { SkillSelect } from "./SkillSelect.js";

const WEEKDAYS = [
  { id: 1, label: "Пн" },
  { id: 2, label: "Вт" },
  { id: 3, label: "Ср" },
  { id: 4, label: "Чт" },
  { id: 5, label: "Пт" },
  { id: 6, label: "Сб" },
  { id: 7, label: "Вс" },
];

/** Кружок одной привычки: тап = выполнить, долгое нажатие = редактор. */
function HabitCircle({
  habit,
  disabled,
  onTap,
  onLongPress,
}: {
  habit: HabitDto;
  disabled?: boolean;
  onTap: () => void;
  onLongPress: () => void;
}) {
  const timer = useRef<number>();
  const longFired = useRef(false);

  const start = () => {
    longFired.current = false;
    timer.current = window.setTimeout(() => {
      longFired.current = true;
      onLongPress();
    }, 500);
  };
  const finish = () => {
    if (timer.current) window.clearTimeout(timer.current);
    if (!longFired.current) onTap();
  };
  const cancel = () => {
    if (timer.current) window.clearTimeout(timer.current);
  };

  const done = habit.doneToday;
  const dim = !habit.dueToday && !done;

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onPointerDown={start}
        onPointerUp={finish}
        onPointerLeave={cancel}
        onContextMenu={(e) => e.preventDefault()}
        disabled={disabled}
        className={`flex h-16 w-16 select-none items-center justify-center rounded-full border-2 text-lg font-semibold transition ${
          done
            ? "border-tg-link bg-tg-link text-white"
            : "border-tg-hint bg-tg-secondaryBg text-tg-text"
        } ${dim ? "opacity-40" : ""}`}
      >
        {done ? "✓" : habit.title.trim().charAt(0).toUpperCase() || "•"}
      </button>
      <span className="text-tg-hint w-16 truncate text-center text-[11px]">{habit.title}</span>
    </div>
  );
}

function AddCircle({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={onClick}
        className="border-tg-hint text-tg-hint flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed text-2xl"
      >
        +
      </button>
      <span className="text-tg-hint text-[11px]">Добавить</span>
    </div>
  );
}

interface EditorState {
  mode: "create" | "edit";
  habit?: HabitDto;
}

export function HabitCircles({ onChanged }: { onChanged?: () => void }) {
  const [habits, setHabits] = useState<HabitDto[]>([]);
  const [skills, setSkills] = useState<SkillDto[]>([]);
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);

  const load = useCallback(async () => {
    setHabits((await api.getHabits()).habits);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Скиллы для привязки привычки — грузим один раз.
  useEffect(() => {
    void api.getSkills().then((r) => setSkills(r.skills)).catch(() => setSkills([]));
  }, []);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      await load();
      onChanged?.();
    } finally {
      setBusy(false);
    }
  };

  const onTap = (h: HabitDto) => {
    if (h.doneToday) void run(() => api.uncompleteHabit(h.id));
    else if (h.dueToday) void run(() => api.completeHabit(h.id));
  };

  return (
    <section>
      <h2 className="mb-2 font-semibold">Привычки</h2>
      <div className="grid grid-cols-4 gap-3">
        {habits.map((h) => (
          <HabitCircle
            key={h.id}
            habit={h}
            disabled={busy}
            onTap={() => onTap(h)}
            onLongPress={() => setEditor({ mode: "edit", habit: h })}
          />
        ))}
        <AddCircle onClick={() => setEditor({ mode: "create" })} />
      </div>

      {editor && (
        <HabitEditor
          state={editor}
          busy={busy}
          skills={skills}
          onClose={() => setEditor(null)}
          onSubmit={async (body) => {
            await run(() =>
              editor.mode === "edit" && editor.habit
                ? api.updateHabit(editor.habit.id, body)
                : api.createHabit(body),
            );
            setEditor(null);
          }}
          onDelete={
            editor.mode === "edit" && editor.habit
              ? async () => {
                  await run(() => api.deleteHabit(editor.habit!.id));
                  setEditor(null);
                }
              : undefined
          }
        />
      )}
    </section>
  );
}

function HabitEditor({
  state,
  busy,
  skills,
  onClose,
  onSubmit,
  onDelete,
}: {
  state: EditorState;
  busy?: boolean;
  skills: SkillDto[];
  onClose: () => void;
  onSubmit: (body: CreateHabitRequest) => void;
  onDelete?: () => void;
}) {
  const h = state.habit;
  const [title, setTitle] = useState(h?.title ?? "");
  const [time, setTime] = useState(h?.timeOfDay ?? "09:00");
  const [cadence, setCadence] = useState<HabitCadence>(h?.cadence ?? "DAILY");
  const [intervalDays, setIntervalDays] = useState(h?.intervalDays ?? 2);
  const [weekdays, setWeekdays] = useState<number[]>(h?.weekdays ?? []);
  const [skillCode, setSkillCode] = useState(h?.skillCode ?? "");

  const toggleWeekday = (id: number) =>
    setWeekdays((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id]));

  const valid = title.trim().length > 0 && !(cadence === "WEEKLY" && weekdays.length === 0);

  const submit = () =>
    onSubmit({
      title: title.trim(),
      timeOfDay: time,
      cadence,
      intervalDays: cadence === "EVERY_N_DAYS" ? intervalDays : undefined,
      weekdays: cadence === "WEEKLY" ? weekdays : undefined,
      skillCode: skillCode || null,
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-tg-bg w-full max-w-sm space-y-3 rounded-2xl p-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold">{state.mode === "edit" ? "Привычка" : "Новая привычка"}</h3>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Название"
          className="bg-tg-secondaryBg w-full rounded-xl px-3 py-2 text-sm outline-none"
        />

        <div className="flex items-center gap-2">
          <span className="text-tg-hint text-sm">Время</span>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="bg-tg-secondaryBg rounded-xl px-3 py-2 text-sm outline-none"
          />
        </div>

        <div className="grid grid-cols-3 gap-1">
          {(["DAILY", "EVERY_N_DAYS", "WEEKLY"] as HabitCadence[]).map((c) => (
            <button
              key={c}
              onClick={() => setCadence(c)}
              className={`rounded-lg py-1.5 text-xs ${cadence === c ? "bg-tg-button text-tg-buttonText" : "bg-tg-secondaryBg"}`}
            >
              {c === "DAILY" ? "Каждый день" : c === "EVERY_N_DAYS" ? "Раз в N дн." : "По дням"}
            </button>
          ))}
        </div>

        {cadence === "EVERY_N_DAYS" && (
          <div className="flex items-center gap-2">
            <span className="text-tg-hint text-sm">Каждые</span>
            <input
              type="number"
              min={1}
              value={intervalDays}
              onChange={(e) => setIntervalDays(Math.max(1, Number(e.target.value)))}
              className="bg-tg-secondaryBg w-16 rounded-xl px-2 py-1 text-sm outline-none"
            />
            <span className="text-tg-hint text-sm">дн.</span>
          </div>
        )}

        {cadence === "WEEKLY" && (
          <div className="flex flex-wrap gap-1">
            {WEEKDAYS.map((w) => (
              <button
                key={w.id}
                onClick={() => toggleWeekday(w.id)}
                className={`rounded-lg px-2.5 py-1 text-xs ${weekdays.includes(w.id) ? "bg-tg-button text-tg-buttonText" : "bg-tg-secondaryBg"}`}
              >
                {w.label}
              </button>
            ))}
          </div>
        )}

        {skills.length > 0 && (
          <div className="space-y-1">
            <span className="text-tg-hint text-sm">Скилл</span>
            <SkillSelect
              skills={skills}
              value={skillCode}
              onChange={setSkillCode}
              disabled={busy}
              className="bg-tg-secondaryBg"
            />
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={submit}
            disabled={busy || !valid}
            className="bg-tg-button text-tg-buttonText flex-1 rounded-xl py-2.5 text-sm font-medium disabled:opacity-40"
          >
            Сохранить
          </button>
          {onDelete && (
            <button onClick={onDelete} disabled={busy} className="bg-tg-secondaryBg rounded-xl px-4 py-2.5 text-sm">
              🗑
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
