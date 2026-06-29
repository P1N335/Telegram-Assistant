import type {
  TaskStatus,
  TaskPeriod,
  HabitCadence,
  PetMoodLabel,
  SubscriptionPlan,
  PremiumFeature,
} from "../types/index.js";

export interface PremiumStatusDto {
  plan: SubscriptionPlan;
  active: boolean;
  until: string | null; // ISO, null = бессрочно/нет
  features: PremiumFeature[];
}

/** Контракты REST API между backend и Mini App. */

export interface SubtaskDto {
  id: string;
  title: string;
  isDone: boolean;
  order: number;
}

export interface PetDto {
  name: string;
  speciesCode: string;
  emoji: string;
  stageTitle: string;
  level: number;
  xp: number;
  mood: number; // 0..100, с учётом ленивого decay
  energy: number; // 0..100
  moodLabel: PetMoodLabel;
  phrase: string;
}

// ── Кастомизация питомца (премиум: PremiumFeature.PET_CUSTOMIZATION) ──
// «Внешний вид» = выбор вида (PetSpecies) из каталога; уровень/XP/состояние сохраняются.
// Каталог расширяется через seed (без миграций). Бесплатным — дефолт (без изменения).

/** Вариант внешнего вида питомца (вид из каталога) с превью под текущий уровень. */
export interface PetCustomizationOptionDto {
  speciesCode: string;
  name: string; // имя вида («Котёнок», «Дракончик»…)
  emoji: string; // превью на текущем уровне питомца
  description: string | null;
}

/** Доступные варианты + текущий выбор пользователя. */
export interface PetCustomizationDto {
  options: PetCustomizationOptionDto[];
  current: { speciesCode: string; name: string };
}

/** Изменение имени и/или внешнего вида (вид) питомца. Поля опциональны. */
export interface UpdatePetRequest {
  name?: string; // 1..PET_NAME_MAX_LENGTH после trim
  speciesCode?: string; // код вида из каталога
}

// ── Мульти-петы (премиум: PremiumFeature.MULTI_PET) ──
// У пользователя может быть несколько питомцев; ровно один активен (растёт и
// показывается на главной). Создание >1 — премиум; переключение активного среди
// уже имеющихся — бесплатно (downgrade не запирает доступ к собственным питомцам).

/** Краткая карточка питомца в коллекции пользователя. */
export interface PetSummaryDto {
  id: string;
  name: string;
  speciesCode: string;
  emoji: string; // превью на уровне этого питомца
  stageTitle: string;
  level: number;
  xp: number;
  isActive: boolean;
}

/** Коллекция питомцев пользователя + активный + лимиты. */
export interface PetCollectionDto {
  pets: PetSummaryDto[];
  activePetId: string;
  maxPets: number; // потолок (MAX_PETS_PER_USER) — для UI «N / max»
  canAddMore: boolean; // pets.length < maxPets (премиум-гейт всё равно на сервере)
}

/** Создание дополнительного питомца (премиум). Поля опциональны (есть дефолты). */
export interface CreatePetRequest {
  name?: string; // 1..PET_NAME_MAX_LENGTH после trim; по умолчанию — имя вида
  speciesCode?: string; // код вида из каталога; по умолчанию — вид по умолчанию
}

export interface UserDto {
  id: string;
  telegramId: string; // BigInt сериализуется строкой
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  timezone: string;
}

export interface StatisticsDto {
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  tasksCreated: number;
  tasksCompleted: number;
  completionRate: number; // 0..1
}

export interface TaskDto {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  period: TaskPeriod;
  planDate: string; // YYYY-MM-DD (якорь периода)
  dueDate: string | null; // ISO
  order: number;
  completedAt: string | null; // ISO
  skillCode: string | null; // привязка к скиллу (Skill.code), null = без скилла
  subtasks: SubtaskDto[];
}

// ── Requests / Responses ──────────────────────────────────────

export interface TelegramAuthRequest {
  initData: string;
}

export interface TelegramAuthResponse {
  token: string;
  user: UserDto;
}

export interface PlanDayRequest {
  /** Сырой текст плана (бот) — будет распознан эвристикой. */
  text?: string;
  /** Либо готовый список (Mini App). */
  tasks?: Array<{ title: string; description?: string }>;
  /** YYYY-MM-DD; по умолчанию — сегодня в таймзоне пользователя. */
  date?: string;
}

export interface UpdateTaskStatusRequest {
  status: TaskStatus;
}

/** Создание одиночной задачи из Mini App. */
export interface CreateTaskRequest {
  title: string;
  description?: string;
  period: TaskPeriod;
  /** Дедлайн (ISO с временем). */
  dueDate?: string | null;
  /** Опорная дата для якоря периода (YYYY-MM-DD); по умолчанию — сегодня. */
  date?: string;
  /** Заголовки подзадач. */
  subtasks?: string[];
  /** Привязка к скиллу (Skill.code); null/пусто — без скилла. */
  skillCode?: string | null;
}

/** Частичное редактирование задачи. */
export interface UpdateTaskRequest {
  title?: string;
  dueDate?: string | null;
  /** Привязка к скиллу (Skill.code); null — снять привязку. */
  skillCode?: string | null;
}

export interface CreateSubtaskRequest {
  title: string;
}

export interface UpdateSubtaskRequest {
  title?: string;
  isDone?: boolean;
}

// ── Привычки ──

export interface HabitDto {
  id: string;
  title: string;
  timeOfDay: string; // HH:MM
  cadence: HabitCadence;
  intervalDays: number | null;
  weekdays: number[]; // ISO 1=Пн..7=Вс
  xpReward: number;
  xpPenalty: number;
  skillCode: string | null; // привязка к скиллу (Skill.code), null = без скилла
  dueToday: boolean; // нужно ли выполнять сегодня по расписанию
  doneToday: boolean; // отмечена ли сегодня
}

export interface CreateHabitRequest {
  title: string;
  timeOfDay: string; // HH:MM
  cadence: HabitCadence;
  intervalDays?: number; // для EVERY_N_DAYS
  weekdays?: number[]; // для WEEKLY (ISO 1..7)
  xpReward?: number;
  xpPenalty?: number;
  /** Привязка к скиллу (Skill.code); null/пусто — без скилла. */
  skillCode?: string | null;
}

/** Редактирование привычки — полный набор полей (как при создании, без startDate). */
export type UpdateHabitRequest = CreateHabitRequest;

export interface SkillDto {
  id: string;
  code: string;
  name: string;
  icon: string | null;
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpForLevelSpan: number;
  ratio: number; // 0..1 прогресс до след. уровня
}

export interface SkillTemplateDto {
  code: string;
  name: string;
  icon: string | null;
  description: string | null;
  category: string | null;
  added: boolean; // уже добавлен пользователем
}

/** Добавление скилла: из шаблона (code) или кастомный (name + icon). */
export interface CreateSkillRequest {
  code?: string;
  name?: string;
  icon?: string;
}

export interface AchievementDto {
  code: string;
  title: string;
  description: string;
  icon: string | null;
  category: string | null;
  unlocked: boolean;
  unlockedAt: string | null; // ISO
}

// ── Лидерборд ──
// Рейтинг по XP (уровень — производная от XP, поэтому XP — более точный ключ сортировки).
// Ранжирование идёт по всем пользователям (без фильтра isActive) — счётчики держатся на
// одной таблице UserStatistics (без join к User), что индекс-дружелюбно под 100k+.

export interface LeaderboardEntryDto {
  rank: number; // 1-based место в рейтинге
  userId: string;
  name: string; // отображаемое имя (firstName → @username → «Пользователь»)
  username: string | null;
  level: number;
  xp: number;
  isMe: boolean; // строка текущего пользователя (для подсветки)
}

export interface LeaderboardResponse {
  top: LeaderboardEntryDto[]; // страница рейтинга (limit/offset)
  me: LeaderboardEntryDto | null; // место текущего пользователя (даже если вне страницы)
  total: number; // всего ранжированных пользователей (для «место X из Y»)
  limit: number;
  offset: number;
}

// ── Месячный ревайнд ──────────────────────────────────────────
// Агрегированный отчёт за прошедший месяц (выполнено задач/привычек, стрик, рост
// скиллов). Доставляется ботом в начале месяца через планировщик (идемпотентно по
// dedupeKey). Бесплатная фича. DTO держим в @tpc/shared — переиспользуемо, если позже
// появится экран ревайнда в Mini App; сейчас рендерится в текст бота.

/** Скилл месяца: набранный за месяц XP + текущий уровень (после роста). */
export interface RewindSkillDto {
  code: string;
  name: string;
  icon: string | null;
  level: number; // текущий уровень скилла на момент отчёта
  xpGained: number; // XP, начисленный скиллу за отчётный месяц
}

/** Отчёт за один календарный месяц пользователя. */
export interface MonthlyRewindDto {
  month: string; // отчётный месяц "YYYY-MM" (в таймзоне пользователя)
  tasksCompleted: number; // задач выполнено за месяц
  habitsCompleted: number; // отметок привычек за месяц
  currentStreak: number; // текущая серия (снимок на момент отчёта)
  longestStreak: number; // рекорд серии
  topSkills: RewindSkillDto[]; // топ скиллов по росту за месяц (REWIND_TOP_SKILLS)
  totalSkillXpGained: number; // суммарный рост XP по всем скиллам за месяц
}

// ── Сводка выполнения дня ──────────────────────────────────────
// Производные счётчики (задачи + привычки на сегодня) для главного экрана.
// Источник UI-события «всё на сегодня закрыто»: фронт сравнивает allDone между
// обновлениями Home и показывает празднование при переходе false→true. Чисто
// вычисляемое поле (без записи в БД), поэтому схема Prisma не затрагивается.

export interface DailyCompletionDto {
  tasksTotal: number; // дневных задач на сегодня
  tasksDone: number; // из них со статусом COMPLETED
  habitsTotal: number; // привычек, запланированных на сегодня (dueToday)
  habitsDone: number; // из них отмеченных сегодня
  /** Есть хотя бы один пункт и все они закрыты (зеркало семантики «идеального дня»). */
  allDone: boolean;
}

export interface HomeResponse {
  user: UserDto;
  statistics: StatisticsDto;
  tasks: TaskDto[];
  pet: PetDto;
  premium: PremiumStatusDto;
  daily: DailyCompletionDto;
}

export interface ApiErrorResponse {
  error: { code: string; message: string };
}
