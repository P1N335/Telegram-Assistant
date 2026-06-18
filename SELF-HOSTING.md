# Self-hosting на своём ПК через ngrok

ngrok публикует локальный backend наружу по HTTPS — без белого IP, без проброса портов,
работает за NAT/CGNAT. Фронт (Mini App) лежит на GitHub Pages и ходит в этот HTTPS-адрес.

```
Telegram ─▶ ngrok ─(туннель)─▶ backend:3000 ─▶ Postgres        (всё на твоём ПК)
Mini App (GitHub Pages) ─HTTPS─▶ https://<твой-адрес>.ngrok-free.app/api
```

> Бот в режиме polling работает и без туннеля. ngrok нужен, чтобы **браузерный Mini App
> с Pages** мог достучаться до API (и для webhook-режима бота).

---

## 1. Регистрация и authtoken

1. Зарегистрируйся: **https://dashboard.ngrok.com/signup** (бесплатно).
2. Скопируй свой токен: **https://dashboard.ngrok.com/get-started/your-authtoken**
3. Впиши в `.env`:
   ```
   NGROK_AUTHTOKEN=<твой токен>
   ```

## 2. Запуск

```bash
docker compose --profile tunnel up -d --build
```
Поднимутся Postgres + backend + ngrok. Узнать выданный адрес:

- веб-инспектор **http://localhost:4040** (вкладка Status / Tunnels), или
- `docker compose logs ngrok` → строка `url=https://....ngrok-free.app`

Проверка: открой `https://<адрес>.ngrok-free.app/health` → `{"ok":true}`.

## 3. Постоянный адрес (рекомендуется)

На бесплатном плане ngrok даёт **один статический домен** — адрес не будет меняться при
перезапуске (важно, т.к. `MINI_APP_URL`/webhook должны быть стабильны).

1. Создай домен: **https://dashboard.ngrok.com/domains** → получишь вид `имя.ngrok-free.app`.
2. В `docker-compose.yml` в сервисе `ngrok` укажи его:
   ```yaml
   command: ["http", "backend:3000", "--url=имя.ngrok-free.app"]
   ```
3. Перезапусти: `docker compose --profile tunnel up -d`.

---

## 4. Связать с Mini App и ботом

Подставь HTTPS-адрес ngrok как базу API:

1. **GitHub Pages** (Settings → Secrets and variables → Actions → Variables):
   `API_BASE_URL = https://<адрес>.ngrok-free.app/api` (с `/api`). Передеплой фронта.
2. **CORS на бэке** (`.env`): `CORS_ORIGINS=https://<username>.github.io` → перезапусти backend.
3. **BotFather**: Menu Button → URL = адрес Mini App на Pages (`https://<username>.github.io/<repo>/`).
   Тот же URL в `.env` → `MINI_APP_URL`.
4. (Опционально) Webhook вместо polling: в `.env`
   `TELEGRAM_USE_WEBHOOK=true`, `TELEGRAM_WEBHOOK_DOMAIN=https://<адрес>.ngrok-free.app`.

---

## Важно помнить

- **ПК должен работать 24/7** — иначе бот офлайн и утренние/вечерние пуши не уходят.
- Бесплатный ngrok показывает страницу-предупреждение при первом заходе в браузере; для
  API-запросов (fetch с заголовком) это не мешает. Свой статический домен убирает неудобство.
- Наружу открыт только backend (туннель смотрит на `backend:3000`), не вся машина.
- Для продакшена на большую нагрузку домашний хост не подходит (аптайм/канал) — там VPS/PaaS.
