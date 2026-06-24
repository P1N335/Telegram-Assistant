import type { Locale } from "@tpc/shared";

/**
 * Словари строк UI Mini App. `ru` — источник правды по набору ключей: тип
 * `TranslationKey` выводится из него, а `en` обязан иметь РОВНО те же ключи
 * (иначе ошибка типов). Плейсхолдеры — `{name}` (см. interpolate в @tpc/shared).
 *
 * Плюрализуемые единицы хранят все CLDR-формы (one/few/many/other); нужную форму
 * выбирает Intl.PluralRules в хелпере `plural` (i18n/index.tsx). Для en few/many
 * дублируют other — они не выбираются, но держат набор ключей одинаковым.
 *
 * Контент, приходящий с бэкенда (имена скиллов, названия стадий питомца, тексты
 * достижений, фразы питомца), не локализуется здесь — это «бот-тексты», отдельный
 * (поздний) этап.
 */
const ru = {
  "common.loading": "Загрузка…",
  "common.close": "Закрыть",
  "common.retry": "Повторить",
  "common.save": "Сохранить",
  "common.saving": "Сохранение…",
  "common.cancel": "Отмена",
  "common.add": "Добавить",
  "common.create": "Создать",
  "common.loadMore": "Показать ещё",
  "common.loadError": "Не удалось загрузить",
  "common.saveError": "Не удалось сохранить",
  "common.httpError": "Ошибка {status}",
  "common.all": "Все ›",

  "app.noTelegram": "Откройте приложение через Telegram-бота.",
  "app.loadError": "Не удалось загрузить данные",

  "nav.home": "Главная",
  "nav.tasks": "Задачи",
  "nav.profile": "Профиль",

  "units.day.one": "{n} день",
  "units.day.few": "{n} дня",
  "units.day.many": "{n} дней",
  "units.day.other": "{n} дней",

  "home.greeting": "С возвращением,",
  "home.friend": "друг",
  "home.levelLabel": "уровень",
  "home.progressToLevel": "До уровня {level}",
  "home.dayProgress": "Прогресс дня",
  "home.todayTasks": "Задачи на сегодня",
  "home.tasksEmpty": "Пока пусто. Добавь задачи ниже 👇",
  "home.planPlaceholder": "Новый план — по задаче на строку:\nЗакончить диплом\nСходить в зал",
  "home.addToPlan": "Добавить в план",

  "chip.level": "Уровень {level}",
  "chip.xp": "{xp} XP",

  "stats.title": "Статистика",
  "stats.completed": "Выполнено",
  "stats.rate": "Процент",
  "stats.created": "Создано",
  "stats.streak": "Серия",
  "stats.record": "Рекорд",
  "stats.level": "Уровень",

  "tasks.title": "Мои задачи",
  "tasks.subtitle": "Планируйте задачи на разные периоды",
  "tasks.listTitle": "Задачи: {period}",
  "tasks.counts": "{active} активных, {completed} выполнено",
  "tasks.new": "+ Новая задача",
  "tasks.titlePlaceholder": "Что нужно сделать?",
  "tasks.reminderHint": "Если указать дату и время — бот напомнит примерно за час до дедлайна.",
  "tasks.empty": "Нет задач. Создайте первую задачу!",

  "period.DAY": "День",
  "period.WEEK": "Неделя",
  "period.MONTH": "Месяц",
  "period.YEAR": "Год",

  "taskCard.reschedule": "перенести",
  "taskCard.rescheduleConfirm": "Перенести",
  "taskCard.subtasks": "подзадачи {done}/{total}",
  "taskCard.addSubtask": "+ подзадача",
  "taskCard.subtaskPlaceholder": "Новая подзадача",

  "habits.title": "Привычки",
  "habits.editTitle": "Привычка",
  "habits.createTitle": "Новая привычка",
  "habits.namePlaceholder": "Название",
  "habits.time": "Время",
  "habits.cadence.DAILY": "Каждый день",
  "habits.cadence.EVERY_N_DAYS": "Раз в N дн.",
  "habits.cadence.WEEKLY": "По дням",
  "habits.everyPrefix": "Каждые",
  "habits.daysShort": "дн.",
  "habits.skill": "Скилл",

  "weekday.mon": "Пн",
  "weekday.tue": "Вт",
  "weekday.wed": "Ср",
  "weekday.thu": "Чт",
  "weekday.fri": "Пт",
  "weekday.sat": "Сб",
  "weekday.sun": "Вс",

  "skills.title": "Скиллы",
  "skills.roadmap": "Роадмап ›",
  "skills.loadError": "Не удалось загрузить скиллы",
  "skills.addError": "Не удалось добавить скилл",
  "skills.empty": "Прокачивайте навыки — «Спорт», «Учёба», «Здоровье» и другие.",
  "skills.openRoadmap": "Открыть роадмап",
  "skills.levelAbbr": "Ур. {level}",
  "skills.xpOf": "{into} / {span} XP",
  "skills.roadmapTitle": "Роадмап навыков",
  "skills.allAdded": "Все доступные навыки уже добавлены 🎉",

  "achievements.title": "Достижения",

  "leaderboard.title": "Рейтинг",
  "leaderboard.seeAll": "Весь рейтинг ›",
  "leaderboard.loadError": "Не удалось загрузить рейтинг",
  "leaderboard.empty": "Пока никого нет в рейтинге — выполняйте задачи и поднимайтесь ⭐️",
  "leaderboard.yourPlace": "Ваше место: {rank} из {total}",
  "leaderboard.you": " (вы)",
  "leaderboard.modalTitle": "Рейтинг · {total}",

  "pet.title": "Питомец",
  "pet.collection": "Питомцы ›",
  "pet.customize": "Кастомизация ›",
  "pet.myPets": "Мои питомцы",
  "pet.levelStage": "ур. {level} · {stage}",
  "pet.active": "активный",
  "pet.limitReached": "Достигнут лимит питомцев",
  "pet.addPet": "+ Завести питомца",
  "pet.multiLocked": "🔒 Несколько питомцев доступны по подписке Premium",
  "pet.loadError": "Не удалось загрузить питомцев",
  "pet.switchError": "Не удалось переключить",
  "pet.newPet": "Новый питомец",
  "pet.nameOptional": "Имя (необязательно)",
  "pet.namePlaceholder": "Имя питомца",
  "pet.species": "Вид",
  "pet.speciesLoadError": "Не удалось загрузить виды",
  "pet.createError": "Не удалось создать",
  "pet.creating": "Создание…",
  "pet.create": "Завести",
  "pet.appearance": "Внешний вид",
  "pet.customizeTitle": "Кастомизация питомца",
  "pet.optionsLoadError": "Не удалось загрузить варианты",
  "pet.customizeLocked": "🔒 Смена имени и внешнего вида доступна по подписке Premium",
  "pet.name": "Имя",
  "pet.mood": "Настроение",
  "pet.energy": "Энергия",
  "pet.moodLabel.happy": "Счастлив",
  "pet.moodLabel.neutral": "В норме",
  "pet.moodLabel.sad": "Грустит",
  "pet.moodLabel.tired": "Устал",

  "premium.locked": "🔒 Доступно по подписке Premium",

  "skillSelect.none": "🎯 Без скилла",

  "profile.user": "Пользователь",
} as const;

/** Ключ перевода — производный от русского словаря (источник правды по набору). */
export type TranslationKey = keyof typeof ru;

/** Английский словарь обязан содержать те же ключи, что и `ru`. */
const en: Record<TranslationKey, string> = {
  "common.loading": "Loading…",
  "common.close": "Close",
  "common.retry": "Try again",
  "common.save": "Save",
  "common.saving": "Saving…",
  "common.cancel": "Cancel",
  "common.add": "Add",
  "common.create": "Create",
  "common.loadMore": "Show more",
  "common.loadError": "Failed to load",
  "common.saveError": "Failed to save",
  "common.httpError": "Error {status}",
  "common.all": "All ›",

  "app.noTelegram": "Open the app through the Telegram bot.",
  "app.loadError": "Failed to load data",

  "nav.home": "Home",
  "nav.tasks": "Tasks",
  "nav.profile": "Profile",

  "units.day.one": "{n} day",
  "units.day.few": "{n} days",
  "units.day.many": "{n} days",
  "units.day.other": "{n} days",

  "home.greeting": "Welcome back,",
  "home.friend": "friend",
  "home.levelLabel": "level",
  "home.progressToLevel": "To level {level}",
  "home.dayProgress": "Daily progress",
  "home.todayTasks": "Today's tasks",
  "home.tasksEmpty": "Nothing yet. Add tasks below 👇",
  "home.planPlaceholder": "New plan — one task per line:\nFinish the thesis\nGo to the gym",
  "home.addToPlan": "Add to plan",

  "chip.level": "Level {level}",
  "chip.xp": "{xp} XP",

  "stats.title": "Statistics",
  "stats.completed": "Completed",
  "stats.rate": "Rate",
  "stats.created": "Created",
  "stats.streak": "Streak",
  "stats.record": "Record",
  "stats.level": "Level",

  "tasks.title": "My tasks",
  "tasks.subtitle": "Plan tasks for different periods",
  "tasks.listTitle": "Tasks: {period}",
  "tasks.counts": "{active} active, {completed} done",
  "tasks.new": "+ New task",
  "tasks.titlePlaceholder": "What needs to be done?",
  "tasks.reminderHint": "Set a date and time and the bot will remind you about an hour before the deadline.",
  "tasks.empty": "No tasks. Create your first task!",

  "period.DAY": "Day",
  "period.WEEK": "Week",
  "period.MONTH": "Month",
  "period.YEAR": "Year",

  "taskCard.reschedule": "reschedule",
  "taskCard.rescheduleConfirm": "Reschedule",
  "taskCard.subtasks": "subtasks {done}/{total}",
  "taskCard.addSubtask": "+ subtask",
  "taskCard.subtaskPlaceholder": "New subtask",

  "habits.title": "Habits",
  "habits.editTitle": "Habit",
  "habits.createTitle": "New habit",
  "habits.namePlaceholder": "Name",
  "habits.time": "Time",
  "habits.cadence.DAILY": "Every day",
  "habits.cadence.EVERY_N_DAYS": "Every N days",
  "habits.cadence.WEEKLY": "On set days",
  "habits.everyPrefix": "Every",
  "habits.daysShort": "days",
  "habits.skill": "Skill",

  "weekday.mon": "Mon",
  "weekday.tue": "Tue",
  "weekday.wed": "Wed",
  "weekday.thu": "Thu",
  "weekday.fri": "Fri",
  "weekday.sat": "Sat",
  "weekday.sun": "Sun",

  "skills.title": "Skills",
  "skills.roadmap": "Roadmap ›",
  "skills.loadError": "Failed to load skills",
  "skills.addError": "Failed to add skill",
  "skills.empty": "Level up your skills — Sport, Study, Health and more.",
  "skills.openRoadmap": "Open roadmap",
  "skills.levelAbbr": "Lv. {level}",
  "skills.xpOf": "{into} / {span} XP",
  "skills.roadmapTitle": "Skills roadmap",
  "skills.allAdded": "All available skills are already added 🎉",

  "achievements.title": "Achievements",

  "leaderboard.title": "Ranking",
  "leaderboard.seeAll": "Full ranking ›",
  "leaderboard.loadError": "Failed to load ranking",
  "leaderboard.empty": "No one is ranked yet — complete tasks and climb up ⭐️",
  "leaderboard.yourPlace": "Your rank: {rank} of {total}",
  "leaderboard.you": " (you)",
  "leaderboard.modalTitle": "Ranking · {total}",

  "pet.title": "Pet",
  "pet.collection": "Pets ›",
  "pet.customize": "Customize ›",
  "pet.myPets": "My pets",
  "pet.levelStage": "lv. {level} · {stage}",
  "pet.active": "active",
  "pet.limitReached": "Pet limit reached",
  "pet.addPet": "+ Get a pet",
  "pet.multiLocked": "🔒 Multiple pets are available with Premium",
  "pet.loadError": "Failed to load pets",
  "pet.switchError": "Failed to switch",
  "pet.newPet": "New pet",
  "pet.nameOptional": "Name (optional)",
  "pet.namePlaceholder": "Pet name",
  "pet.species": "Species",
  "pet.speciesLoadError": "Failed to load species",
  "pet.createError": "Failed to create",
  "pet.creating": "Creating…",
  "pet.create": "Get",
  "pet.appearance": "Appearance",
  "pet.customizeTitle": "Pet customization",
  "pet.optionsLoadError": "Failed to load options",
  "pet.customizeLocked": "🔒 Changing name and appearance is available with Premium",
  "pet.name": "Name",
  "pet.mood": "Mood",
  "pet.energy": "Energy",
  "pet.moodLabel.happy": "Happy",
  "pet.moodLabel.neutral": "OK",
  "pet.moodLabel.sad": "Sad",
  "pet.moodLabel.tired": "Tired",

  "premium.locked": "🔒 Available with Premium",

  "skillSelect.none": "🎯 No skill",

  "profile.user": "User",
};

/** Словари по локали. ru — дефолт/фолбэк. */
export const dictionaries: Record<Locale, Record<TranslationKey, string>> = {
  ru,
  en,
};
