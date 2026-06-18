# Деплой Mini App на GitHub Pages

GitHub Pages раздаёт **только статику** — это фронт (`apps/miniapp`).
Бэкенд (бот, API, БД, планировщик) Pages не запускает, он хостится отдельно,
а фронт ходит в него по HTTPS. Схема:

```
Telegram ──webhook──▶ Backend (Railway/Render/Fly/VPS) ──▶ PostgreSQL
                          ▲
                          │ HTTPS + CORS (REST /api)
                          │
Mini App (GitHub Pages, статика) ◀── кнопка из бота
```

## 1. Захостить бэкенд (один раз)

Подними `apps/backend` где угодно с HTTPS (Railway, Render, Fly.io, VPS). Нужно:

- переменные окружения как в `.env.example` (`DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `JWT_SECRET`, …);
- `CORS_ORIGINS=https://<username>.github.io` (origin Pages, без пути и без слэша на конце);
- применить миграции и seed: `pnpm --filter @tpc/database migrate:deploy && pnpm --filter @tpc/database seed`;
- бот в прод-режиме: `TELEGRAM_USE_WEBHOOK=true`, `TELEGRAM_WEBHOOK_DOMAIN=https://<твой-бэкенд>`.

Запиши публичный URL API, например `https://tpc-api.onrender.com`.

## 2. Включить Pages и задать переменную

1. Settings → **Pages** → Source: **GitHub Actions**.
2. Settings → Secrets and variables → **Actions** → вкладка **Variables** → **New variable**:
   - имя `API_BASE_URL`
   - значение — URL бэкенда **с `/api`**, напр. `https://tpc-api.onrender.com/api`

Workflow `.github/workflows/deploy-pages.yml` сам подставит `base = /<repo>/`.

## 3. Задеплоить

Запушь в `main` (или Actions → Deploy Mini App → Run workflow).
Адрес фронта: `https://<username>.github.io/<repo>/`.

## 4. Привязать Mini App к боту

В [@BotFather](https://t.me/BotFather): `/mybots` → бот → **Bot Settings → Menu Button**
→ вставь `https://<username>.github.io/<repo>/`.
(Тот же URL — в `MINI_APP_URL` бэкенда, чтобы бот слал правильную кнопку.)

## Проверка

- Открой бота → кнопка приложения → Mini App грузится с Pages, данные тянет с бэкенда.
- Если данные не грузятся — почти всегда это CORS: проверь, что `CORS_ORIGINS` на бэке
  точно равен origin Pages (`https://<username>.github.io`, без `/<repo>` и без слэша).

## Локально это не нужно

В dev фронт берёт API c относительного `/api` (проксируется Vite), `VITE_API_BASE_URL` пуст —
ничего настраивать не надо.
