# Настройка и запуск

## 1. Создать бота в Telegram (BotFather)

1. Открой [@BotFather](https://t.me/BotFather) → `/newbot` → задай имя и username (`*_bot`).
2. Скопируй **токен** → положи в `.env` как `TELEGRAM_BOT_TOKEN`.
3. Команды меню: `/setcommands` → выбери бота → вставь:
   ```
   start - Запуск и приветствие
   tasks - Задачи на сегодня
   stats - Статистика
   pet - Питомец
   reflect - Вечерний отчёт
   help - Помощь
   ```

## 2. Подключить Mini App

Mini App грузится только по **HTTPS**.

- **Прод:** размести фронт (`apps/miniapp`) на домене с HTTPS, укажи его в `.env` → `MINI_APP_URL`.
- **Локально:** подними фронт (`pnpm dev:miniapp`, порт 5173) и пробрось его через ngrok
  (см. `SELF-HOSTING.md`). Полученный `https://…`-URL → в `MINI_APP_URL`.

Привязка кнопки приложения в BotFather:
`/mybots` → твой бот → **Bot Settings → Menu Button → Configure menu button** → вставь `MINI_APP_URL`.
(Бот также присылает кнопку запуска приложения в сообщениях.)

## 3. Заполнить `.env`

```bash
cp .env.example .env
```
Обязательно: `TELEGRAM_BOT_TOKEN`, `JWT_SECRET` (длинная случайная строка), `MINI_APP_URL`,
`DATABASE_URL`. AI можно оставить `AI_PROVIDER=noop` (коучинг просто не будет добавляться).

## 4. Запуск локально

```bash
pnpm install

# поднять Postgres (через docker) или указать свой DATABASE_URL
docker compose up -d postgres

pnpm db:generate          # сгенерировать Prisma Client
pnpm db:migrate           # применить схему (создаст таблицы)
pnpm --filter @tpc/database seed   # виды питомцев + достижения

pnpm dev:backend          # бот (polling) + API + планировщик
pnpm dev:miniapp          # фронт на :5173 (пробрось туннелем для Mini App)
```

Проверка: напиши боту `/start`. Перечисли задачи сообщением — они сохранятся.

## 5. Весь стек в Docker

```bash
pnpm docker:up
# затем один раз внутри backend-контейнера:
#   pnpm --filter @tpc/database migrate:deploy
#   pnpm --filter @tpc/database seed
```

## 6. Polling vs Webhook

- Dev: `TELEGRAM_USE_WEBHOOK=false` (long-polling, ничего не нужно).
- Прод: `TELEGRAM_USE_WEBHOOK=true` + `TELEGRAM_WEBHOOK_DOMAIN=https://…` +
  `TELEGRAM_WEBHOOK_SECRET`. (Приём webhook-запросов в HTTP-runtime — отдельный шаг деплоя.)
