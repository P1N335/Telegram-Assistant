import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HomeResponse } from "@tpc/shared";
import { Card, Chip } from "../components/ui.js";

interface Props {
  data: HomeResponse;
}

export function StatsScreen({ data }: Props) {
  const { statistics, tasks } = data;
  const completedToday = tasks.filter((t) => t.status === "COMPLETED").length;
  const pct = Math.round(statistics.completionRate * 100);

  const donut = [
    { name: "Выполнено", value: statistics.tasksCompleted },
    { name: "Остальное", value: Math.max(0, statistics.tasksCreated - statistics.tasksCompleted) },
  ];
  const DONUT_COLORS = ["var(--tg-theme-button-color, #2481cc)", "var(--tg-theme-hint-color, #cccccc)"];

  // История за неделю: реальный сегодняшний день + заглушка прошлых.
  // Полноценная история активности появится с эндпоинтом статистики на Этапе 6.
  const week = buildWeek(completedToday);

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">Статистика</h1>

      <div className="flex flex-wrap gap-2">
        <Chip icon="⭐️" label={`Уровень ${statistics.level}`} />
        <Chip icon="✨" label={`${statistics.xp} XP`} />
        <Chip icon="🔥" label={`Серия ${statistics.currentStreak}`} />
        <Chip icon="🏆" label={`Рекорд ${statistics.longestStreak}`} />
      </div>

      <Card>
        <h2 className="mb-2 font-semibold">Процент выполнения</h2>
        <div className="flex items-center gap-4">
          <div className="relative h-32 w-32 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donut} dataKey="value" innerRadius={42} outerRadius={60} startAngle={90} endAngle={-270}>
                  {donut.map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold">{pct}%</div>
          </div>
          <div className="text-sm">
            <p>
              Выполнено: <b>{statistics.tasksCompleted}</b>
            </p>
            <p className="text-tg-hint">из {statistics.tasksCreated} созданных</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Активность за неделю</h2>
          <span className="text-tg-hint text-xs">демо · история с Этапа 6</span>
        </div>
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={week}>
              <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide allowDecimals={false} />
              <Tooltip cursor={{ fill: "transparent" }} />
              <Bar dataKey="completed" radius={[4, 4, 0, 0]} fill="var(--tg-theme-button-color, #2481cc)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function buildWeek(todayCompleted: number): Array<{ day: string; completed: number }> {
  const labels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const todayIdx = (new Date().getDay() + 6) % 7; // 0 = Пн
  return labels.map((day, i) => ({ day, completed: i === todayIdx ? todayCompleted : 0 }));
}
