import type { MonthlyRewindDto, PetDto, StatisticsDto, TaskDto } from "@tpc/shared";
import { TaskStatus } from "@tpc/shared";

const MONTH_NAMES_RU = [
  "январь", "февраль", "март", "апрель", "май", "июнь",
  "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
];

/** "YYYY-MM" → «Июнь 2026» (для заголовка ревайнда). */
function monthTitleRu(month: string): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const name = MONTH_NAMES_RU[(m - 1) % 12] ?? month;
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}`;
}

const STATUS_EMOJI: Record<string, string> = {
  PENDING: "⬜️",
  COMPLETED: "✅",
  SKIPPED: "⏭️",
  POSTPONED: "⌛️",
};

export const TEXT = {
  start: (name: string) =>
    `Привет, ${name}! 👋\n\n` +
    "Я — твой компаньон продуктивности. Каждое утро спрошу планы на день, вечером помогу подвести итоги, " +
    "а ещё ты будешь растить виртуального питомца 🐾\n\n" +
    "Команды:\n/tasks — задачи на сегодня\n/stats — статистика\n/pet — питомец\n/help — помощь\n\n" +
    "Напиши планы на сегодня списком — и я их сохраню.",

  help:
    "Что я умею:\n\n" +
    "🌅 Утром спрашиваю план дня — просто перечисли задачи сообщением.\n" +
    "✅ /tasks — отметить выполнение.\n" +
    "🌙 Вечером помогу с рефлексией.\n" +
    "📊 /stats — XP, уровень, streak.\n" +
    "🐾 /pet — твой питомец.\n" +
    "🌙 /itogi — вкл/выкл вечернее подведение итогов.\n" +
    "📱 Открой приложение для полной картины.",

  itogiToggled: (enabled: boolean) =>
    enabled
      ? "🌙 Вечернее подведение итогов включено — буду напоминать вечером."
      : "🔕 Вечернее подведение итогов выключено. Включить снова: /itogi on",

  morning:
    "Доброе утро! ☀️\n\nКакие задачи на сегодня? Просто перечисли их сообщением — каждую с новой строки.",

  // CTA-хвост, который добавляется к AI-мотивации (когда AI-утро включено): сам призыв
  // спланировать день без дублирующего приветствия (приветствие даёт LLM).
  morningCta: "Какие задачи на сегодня? Просто перечисли их сообщением — каждую с новой строки. 🎯",

  evening: "Как прошёл день? 🌙\nДавай подведём итоги — это займёт минуту.",

  planSaved: (tasks: TaskDto[]) =>
    `Записал ${tasks.length} ${plural(tasks.length, "задачу", "задачи", "задач")} на сегодня:\n` +
    tasks.map((t, i) => `${i + 1}. ${t.title}`).join("\n") +
    "\n\nХорошего дня! Отмечай выполнение в /tasks 🎯",

  noTasks: "На сегодня задач пока нет. Напиши их списком, и я сохраню 📝",

  tasksList: (tasks: TaskDto[]) =>
    "Задачи на сегодня:\n\n" +
    tasks
      .map((t, i) => `${STATUS_EMOJI[t.status] ?? "⬜️"} ${i + 1}. ${t.title}`)
      .join("\n"),

  stats: (s: StatisticsDto) =>
    "📊 Твоя статистика:\n\n" +
    `⭐️ Уровень: ${s.level}\n` +
    `✨ XP: ${s.xp}\n` +
    `🔥 Серия: ${s.currentStreak} (рекорд ${s.longestStreak})\n` +
    `✅ Выполнено задач: ${s.tasksCompleted} из ${s.tasksCreated}\n` +
    `📈 Процент выполнения: ${Math.round(s.completionRate * 100)}%`,

  pet: (p: PetDto) =>
    `${p.emoji} ${p.name} — ${p.stageTitle}\n\n` +
    `«${p.phrase}»\n\n` +
    `⭐️ Уровень: ${p.level}\n` +
    `😊 Настроение: ${p.mood}%\n` +
    `⚡️ Энергия: ${p.energy}%\n\n` +
    "Выполняй задачи и заполняй отчёты — питомец растёт вместе с тобой 🐾",

  rewind: (r: MonthlyRewindDto) => {
    const lines = [
      `📅 Итоги месяца — ${monthTitleRu(r.month)}`,
      "",
      `✅ Выполнено задач: ${r.tasksCompleted}`,
      `🔁 Отметок привычек: ${r.habitsCompleted}`,
      `🔥 Серия: ${r.currentStreak} ${plural(r.currentStreak, "день", "дня", "дней")} (рекорд ${r.longestStreak})`,
    ];

    if (r.topSkills.length) {
      lines.push("", "📈 Рост скиллов:");
      for (const s of r.topSkills) {
        lines.push(`${s.icon ? `${s.icon} ` : ""}${s.name}: +${s.xpGained} XP (ур. ${s.level})`);
      }
    }

    lines.push("", "Новый месяц — новый разгон. Спланируй его в приложении 🚀");
    return lines.join("\n");
  },

  reflection: {
    questions: [
      "1/5. Как прошёл день?",
      "2/5. Какие задачи удалось выполнить?",
      "3/5. Что хорошего произошло?",
      "4/5. Что было сложным?",
      "5/5. Оцени день от 1 до 10.",
    ],
    badRating: "Нужно число от 1 до 10. Попробуй ещё раз 🙂",
    done: "Спасибо, отчёт сохранён! 🌙",
    insight: (text: string) => `\n\n💡 ${text}`,
  },
};

function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

export { STATUS_EMOJI, TaskStatus };
