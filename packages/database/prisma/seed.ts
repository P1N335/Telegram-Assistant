import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Идемпотентный seed: виды питомцев и каталог достижений.
 * Запуск: pnpm --filter @tpc/database seed
 */
async function main() {
  // ── Виды питомцев (расширяемо: добавляй новые записи без миграций) ──
  await prisma.petSpecies.upsert({
    where: { code: "cat" },
    update: {},
    create: {
      code: "cat",
      name: "Котёнок",
      description: "Дружелюбный спутник продуктивности",
      baseEnergy: 100,
      stages: [
        { minLevel: 1, emoji: "🥚", title: "Яйцо" },
        { minLevel: 3, emoji: "🐱", title: "Котёнок" },
        { minLevel: 8, emoji: "🐈", title: "Кот" },
        { minLevel: 15, emoji: "🦁", title: "Лев продуктивности" },
      ],
      phrases: {
        happy: ["Мур! Отличный день 🐾", "Я горжусь тобой!", "Так держать!"],
        neutral: ["Чем займёмся сегодня?", "Какой план на день?"],
        sad: ["Скучаю по тебе…", "Давно тебя не было 🥺"],
        tired: ["Я немного устал…", "Нужно восстановить энергию"],
      },
    },
  });

  await prisma.petSpecies.upsert({
    where: { code: "dragon" },
    update: {},
    create: {
      code: "dragon",
      name: "Дракончик",
      description: "Растёт вместе с твоими амбициями",
      baseEnergy: 120,
      stages: [
        { minLevel: 1, emoji: "🥚", title: "Яйцо" },
        { minLevel: 4, emoji: "🐲", title: "Дракончик" },
        { minLevel: 12, emoji: "🐉", title: "Дракон" },
      ],
      phrases: {
        happy: ["🔥 Мы в огне!", "Невероятный прогресс!"],
        neutral: ["Готов покорять день?", "С чего начнём?"],
        sad: ["Моё пламя угасает без тебя…"],
        tired: ["Нужен отдых, чтобы снова разгореться"],
      },
    },
  });

  // ── Каталог достижений ──
  const achievements = [
    { code: "first_plan", title: "Первый план", description: "Создан первый план дня", icon: "📝", category: "tasks", threshold: 1, xpReward: 20 },
    { code: "first_reflection", title: "Рефлексия", description: "Заполнен первый вечерний отчёт", icon: "🌙", category: "reflection", threshold: 1, xpReward: 20 },
    { code: "streak_3", title: "Разогрев", description: "3 дня подряд", icon: "🔥", category: "streak", threshold: 3, xpReward: 30 },
    { code: "streak_7", title: "Неделя силы", description: "7 дней подряд", icon: "⚡", category: "streak", threshold: 7, xpReward: 70 },
    { code: "streak_30", title: "Привычка", description: "30 дней подряд", icon: "🏆", category: "streak", threshold: 30, xpReward: 300 },
    { code: "tasks_50", title: "Деятель", description: "50 выполненных задач", icon: "✅", category: "tasks", threshold: 50, xpReward: 100 },
    { code: "level_10", title: "Опытный", description: "Достигнут 10 уровень", icon: "⭐", category: "level", threshold: 10, xpReward: 100 },
    { code: "perfect_day", title: "Идеальный день", description: "Все задачи дня выполнены", icon: "💯", category: "tasks", threshold: 1, xpReward: 50 },
  ];

  for (const a of achievements) {
    await prisma.achievement.upsert({
      where: { code: a.code },
      update: { title: a.title, description: a.description, icon: a.icon, category: a.category, threshold: a.threshold, xpReward: a.xpReward },
      create: a,
    });
  }

  // eslint-disable-next-line no-console
  console.log("✅ Seed готов: виды питомцев и достижения");
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
