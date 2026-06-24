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

  await prisma.petSpecies.upsert({
    where: { code: "fox" },
    update: {},
    create: {
      code: "fox",
      name: "Лисёнок",
      description: "Хитрый и шустрый помощник в делах",
      baseEnergy: 110,
      stages: [
        { minLevel: 1, emoji: "🥚", title: "Яйцо" },
        { minLevel: 3, emoji: "🦊", title: "Лисёнок" },
        { minLevel: 10, emoji: "🦊", title: "Лис" },
      ],
      phrases: {
        happy: ["Хитро придумано! 🦊", "Мы всех опередим!"],
        neutral: ["Какой план на сегодня?", "С чего начнём охоту за делами?"],
        sad: ["Без тебя норка пустеет…"],
        tired: ["Передохну минутку…"],
      },
    },
  });

  await prisma.petSpecies.upsert({
    where: { code: "penguin" },
    update: {},
    create: {
      code: "penguin",
      name: "Пингвинёнок",
      description: "Спокойный и упорный — шаг за шагом к цели",
      baseEnergy: 100,
      stages: [
        { minLevel: 1, emoji: "🥚", title: "Яйцо" },
        { minLevel: 3, emoji: "🐧", title: "Пингвинёнок" },
        { minLevel: 10, emoji: "🐧", title: "Пингвин" },
      ],
      phrases: {
        happy: ["Шаг за шагом — и мы на вершине! 🐧", "Отличный темп!"],
        neutral: ["Какой план на сегодня?", "Двигаемся дальше?"],
        sad: ["На льдине одиноко без тебя…"],
        tired: ["Нужно согреться и отдохнуть"],
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

  // ── Шаблоны скиллов (роадмап) ──
  const skillTemplates = [
    { code: "sport", name: "Спорт", icon: "🏋️", category: "Здоровье", sortOrder: 1 },
    { code: "health", name: "Здоровье", icon: "🧘", category: "Здоровье", sortOrder: 2 },
    { code: "study", name: "Учёба", icon: "📚", category: "Развитие", sortOrder: 3 },
    { code: "productivity", name: "Продуктивность", icon: "⚡", category: "Развитие", sortOrder: 4 },
    { code: "creativity", name: "Творчество", icon: "🎨", category: "Развитие", sortOrder: 5 },
    { code: "finance", name: "Финансы", icon: "💰", category: "Жизнь", sortOrder: 6 },
    { code: "mind", name: "Осознанность", icon: "🧠", category: "Жизнь", sortOrder: 7 },
  ];
  for (const t of skillTemplates) {
    await prisma.skillTemplate.upsert({
      where: { code: t.code },
      update: { name: t.name, icon: t.icon, category: t.category, sortOrder: t.sortOrder },
      create: t,
    });
  }

  // eslint-disable-next-line no-console
  console.log("✅ Seed готов: виды питомцев, достижения, шаблоны скиллов");
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
