import { useCallback, useEffect, useState } from "react";
import type { HabitDto, HabitCadence } from "@tpc/shared";
import { api } from "../api/client.js";
import { Card, Loader } from "../components/ui.js";

const WEEKDAYS = [
  { id: 1, label: "Пн" },
  { id: 2, label: "Вт" },
  { id: 3, label: "Ср" },
  { id: 4, label: "Чт" },
  { id: 5, label: "Пт" },
  { id: 6, label: "Сб" },
  { id: 7, label: "Вс" },
];

function cadenceLabel(h: HabitDto): string {
  if (h.cadence === "DAILY") return "каждый день";
  if (h.cadence === "EVERY_N_DAYS") return `каждые ${h.intervalDays ?? "?"} дн.`;
  return WEEKDAYS.filter((w) => h.weekdays.includes(w.id)).map((w) => w.label).join(", ");
}

export function HabitsScreen({ onChanged }: { onChanged?: () => void }) {
  const [habits, setHabits] = useState<HabitDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [time, setTime] = useState("09:00");
  const [cadence, setCadence] = useState<HabitCadence>("DAILY");
  const [intervalDays, setIntervalDays] = useState(2);
  const [weekdays, setWeekdays] = useState<number[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setHabits((await api.getHabits()).habits);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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

  const toggleWeekday = (id: number) =>
    setWeekdays((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id]));

  const create = async () => {
    const t = title.trim();
    if (!t) return;
    if (cadence === "WEEKLY" && weekdays.length === 0) return;
    await run(() =>
      api.createHabit({
        title: t,
        timeOfDay: time,
        cadence,
        intervalDays: cadence === "EVERY_N_DAYS" ? intervalDays : undefined,
        weekdays: cadence === "WEEKLY" ? weekdays : undefined,
      }),
    );
    setTitle("");
    setFormOpen(false);
  };

  return (
    <div className="space-y-4 p-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Привычки</h1>
          <p className="text-tg-hint text-sm">Регулярные дела с напоминаниями</p>
        </div>
        <button
          onClick={() => setFormOpen((v) => !v)}
          className="bg-tg-button text-tg-buttonText rounded-xl px-3 py-2 text-sm font-medium"
        >
          + Новая
        </button>
      </header>

      {formOpen && (
        <Card>
          <div className="space-y-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Название привычки"
              className="bg-tg-bg w-full rounded-xl px-3 py-2 text-sm outline-none"
            />
            <div className="flex items-center gap-2">
              <span className="text-tg-hint text-sm">Время</span>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="bg-tg-bg rounded-xl px-3 py-2 text-sm outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-1">
              {(["DAILY", "EVERY_N_DAYS", "WEEKLY"] as HabitCadence[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCadence(c)}
                  className={`rounded-lg py-1.5 text-xs ${cadence === c ? "bg-tg-button text-tg-buttonText" : "bg-tg-bg"}`}
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
                  className="bg-tg-bg w-16 rounded-xl px-2 py-1 text-sm outline-none"
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
                    className={`rounded-lg px-2.5 py-1 text-xs ${weekdays.includes(w.id) ? "bg-tg-button text-tg-buttonText" : "bg-tg-bg"}`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            )}

            <p className="text-tg-hint text-xs">
              Бот напомнит за 15 минут до времени и ещё раз через час, если не отмечено. За пропуск
              списывается XP.
            </p>
            <button
              onClick={create}
              disabled={busy || !title.trim() || (cadence === "WEEKLY" && weekdays.length === 0)}
              className="bg-tg-button text-tg-buttonText w-full rounded-xl py-2.5 text-sm font-medium disabled:opacity-40"
            >
              Создать привычку
            </button>
          </div>
        </Card>
      )}

      {loading ? (
        <Loader />
      ) : habits.length === 0 ? (
        <p className="text-tg-hint py-8 text-center text-sm">Пока нет привычек. Создайте первую!</p>
      ) : (
        <div className="space-y-2">
          {habits.map((h) => (
            <Card key={h.id}>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => !h.doneToday && h.dueToday && run(() => api.completeHabit(h.id))}
                  disabled={busy || h.doneToday || !h.dueToday}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                    h.doneToday ? "border-tg-link bg-tg-link text-white" : "border-tg-hint"
                  } ${!h.dueToday ? "opacity-40" : ""}`}
                >
                  {h.doneToday ? "✓" : ""}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${h.doneToday ? "text-tg-hint line-through" : ""}`}>{h.title}</p>
                  <p className="text-tg-hint text-xs">
                    🕒 {h.timeOfDay} · {cadenceLabel(h)} · +{h.xpReward}/−{h.xpPenalty} XP
                    {!h.dueToday && " · не сегодня"}
                  </p>
                </div>
                <button onClick={() => run(() => api.deleteHabit(h.id))} disabled={busy} className="text-tg-hint text-sm">
                  🗑
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
