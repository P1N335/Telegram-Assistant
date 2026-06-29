import { TaskStatus, type DailyCompletionDto, type HabitDto, type TaskDto } from "@tpc/shared";

/**
 * Чистая агрегация выполнения дня для главного экрана: дневные задачи + привычки,
 * запланированные на сегодня. Источник UI-события «всё на сегодня закрыто».
 *
 * Правила «закрытости» зеркалят семантику «идеального дня» (DayCompleted):
 *   - задача закрыта при статусе COMPLETED (SKIPPED/POSTPONED не считаются);
 *   - привычка закрыта, если отмечена сегодня среди запланированных (dueToday);
 *   - привычки вне расписания на сегодня (dueToday=false) в знаменатель не входят.
 *
 * `allDone` — только если есть хотя бы один пункт (пустой день не «закрыт»).
 * Вход — уже посчитанные DTO (та же выборка, что отдаётся в Home), без доп. запросов.
 */
export function computeDailyCompletion(tasks: TaskDto[], habits: HabitDto[]): DailyCompletionDto {
  const tasksTotal = tasks.length;
  const tasksDone = tasks.filter((t) => t.status === TaskStatus.COMPLETED).length;

  const dueHabits = habits.filter((h) => h.dueToday);
  const habitsTotal = dueHabits.length;
  const habitsDone = dueHabits.filter((h) => h.doneToday).length;

  const allDone =
    tasksTotal + habitsTotal > 0 && tasksDone === tasksTotal && habitsDone === habitsTotal;

  return { tasksTotal, tasksDone, habitsTotal, habitsDone, allDone };
}
