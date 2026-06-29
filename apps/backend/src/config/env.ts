import { z } from "zod";

/**
 * Единая, провалидированная точка доступа к переменным окружения.
 * Падаем на старте, если конфиг некорректен (fail-fast), а не в рантайме.
 */
const EnvSchema = z.object({
  RUN_MODE: z.enum(["all", "api", "bot", "worker"]).default("all"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  DATABASE_URL: z.string().min(1),

  TELEGRAM_BOT_TOKEN: z.string().min(1),
  // ВАЖНО: z.coerce.boolean() трактует строку "false" как true — поэтому парсим явно.
  TELEGRAM_USE_WEBHOOK: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  TELEGRAM_WEBHOOK_DOMAIN: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  MINI_APP_URL: z.string().url(),

  // Троттлинг рассылки под лимит Telegram (≈30 msg/s глобально на бота). Сглаживает
  // почасовой всплеск, чтобы не словить 429. 0 = без лимита. Бакет допускает короткий
  // всплеск до TELEGRAM_SEND_BURST, затем держит устойчивые TELEGRAM_MAX_MSGS_PER_SEC.
  TELEGRAM_MAX_MSGS_PER_SEC: z.coerce.number().min(0).max(1000).default(30),
  // Ёмкость бакета (макс. мгновенный всплеск). По умолчанию = скорости. 0 → = скорости.
  TELEGRAM_SEND_BURST: z.coerce.number().min(0).max(1000).default(30),

  JWT_SECRET: z.string().min(16),
  JWT_TTL: z.string().default("15m"),

  // Секрет для admin-эндпоинтов (выдача премиума). Пусто = админка выключена.
  ADMIN_TOKEN: z.string().optional(),

  // Разрешённые Origin'ы для кросс-доменного фронта (GitHub Pages и т.п.).
  // Список через запятую; пусто = CORS выключен (same-origin). "*" = разрешить всем.
  CORS_ORIGINS: z
    .string()
    .optional()
    .default("")
    .transform((s) => s.split(",").map((x) => x.trim()).filter(Boolean)),

  AI_PROVIDER: z.enum(["openai", "ollama", "noop"]).default("noop"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  OLLAMA_BASE_URL: z.string().optional(),
  OLLAMA_MODEL: z.string().optional(),

  // AI-утро: персонализация утренней рассылки текстом от LLMProvider. Строго opt-in —
  // по умолчанию выкл., чтобы не менять текущее поведение и не тратить токены без спроса.
  // Работает только при AI_PROVIDER != noop. Парсим boolean явно (см. TELEGRAM_USE_WEBHOOK).
  AI_MORNING_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  // Бюджет времени на один LLM-вызов в тике (мс): превышение → фолбэк на статичный текст.
  AI_MORNING_TIMEOUT_MS: z.coerce.number().int().positive().default(4000),
  // Параллелизм генерации внутри тика: не открываем тысячи одновременных запросов под 100k+.
  AI_MORNING_CONCURRENCY: z.coerce.number().int().min(1).max(50).default(4),

  DEFAULT_TIMEZONE: z.string().default("Europe/Moscow"),
  MORNING_HOUR: z.coerce.number().int().min(0).max(23).default(8),
  EVENING_HOUR: z.coerce.number().int().min(0).max(23).default(21),

  // Сдвиг "текущего времени" в минутах (если часы хоста неверны). Напр. -180 = на 3 часа назад.
  CLOCK_OFFSET_MINUTES: z.coerce.number().int().default(0),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error("❌ Некорректная конфигурация окружения:", parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  cached = parsed.data;
  return cached;
}
