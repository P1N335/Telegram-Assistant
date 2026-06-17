# Telegram Productivity Companion

Telegram-бот + Telegram Mini App с геймификацией, привычками и AI-коучингом.
Пользователь каждое утро планирует день, вечером проводит рефлексию, копит статистику,
получает XP / уровни / streak и развивает виртуального питомца.

## Архитектура

Modular monolith, спроектированный под разделение на сервисы (готовность к 100k+ пользователей).

```
telegram-productivity-companion/
├── apps/
│   ├── backend/      # Node + Express + grammY. Один процесс, режимы RUN_MODE=all|api|bot|worker
│   │   └── src/
│   │       ├── config/      # env (zod), composition root (DI)
│   │       ├── runtimes/    # http / bot / scheduler — точки входа, разделяемые позже
│   │       ├── shared/      # logger, errors, event-bus, DI-токены
│   │       └── modules/     # feature-based: users, tasks, reflection,
│   │                        #   gamification, pet, statistics, notifications
│   └── miniapp/      # React + Vite + TypeScript + Tailwind + Telegram Mini App SDK
├── packages/
│   ├── shared/       # общие типы, DTO, zod-схемы, доменные события (источник правды)
│   └── database/     # Prisma schema + сгенерированный клиент
├── docker-compose.yml
└── pnpm-workspace.yaml
```

### Ключевые архитектурные решения

- **Разделение процессов через `RUN_MODE`** — один кодовый base, но HTTP API, бот и
  планировщик стартуют независимо. На старте `all` (один контейнер), при росте
  разносятся на отдельные контейнеры без переписывания кода.
- **Repository Pattern + Service Layer + DI** — модули зависят от интерфейсов, а не
  от Prisma напрямую. Composition root собирает зависимости. Нет God Objects.
- **Event-driven геймификация** — доменные события (`PlanCreated`, `TaskCompleted`,
  `ReflectionSubmitted`, `DayCompleted`) обрабатываются отдельным слоем правил.
- **Ленивый decay питомца** — состояние вычисляется при чтении из `lastInteractionAt`,
  без cron-перебора всех питомцев.
- **Гибридный AI** — парсинг списка задач эвристикой (без LLM); LLM через интерфейс
  `LLMProvider` (OpenAI → Ollama) только для коучинга и инсайтов рефлексии.
- **Mini App auth** — валидация Telegram `initData` (HMAC) на бэкенде → краткоживущий JWT.

## Стек

Frontend: React, TypeScript, Vite, Telegram Mini App SDK, TailwindCSS
Backend: Node.js, TypeScript, Express, grammY, PostgreSQL, Prisma ORM
AI: абстракция провайдера (OpenAI / Ollama)
Deploy: Docker, Docker Compose

## Быстрый старт (после реализации этапов)

```bash
cp .env.example .env      # заполнить TELEGRAM_BOT_TOKEN и т.д.
pnpm install
pnpm db:migrate
pnpm dev:backend          # отдельный терминал
pnpm dev:miniapp          # отдельный терминал
# или весь стек в Docker:
pnpm docker:up
```

## Тесты

Юнит-тесты на чистую доменную логику (vitest):

```bash
pnpm test                      # все пакеты
pnpm --filter @tpc/backend test
pnpm --filter @tpc/shared test
```

Покрыто: парсер плана (`TaskParser`), формула уровней (`levelFromXp`/`levelProgress`),
streak-переходы и критерии достижений, ленивый decay питомца, валидация Telegram `initData` и JWT.

## Прогресс реализации

- [x] Этап 1 — структура проекта
- [x] Этап 2 — Prisma schema
- [x] Этап 3 — Backend API
- [x] Этап 4 — Telegram bot
- [x] Этап 5 — Mini App
- [x] Этап 6 — геймификация
- [x] Этап 7 — питомец
- [x] Этап 8 — тесты
