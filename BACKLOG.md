# BACKLOG — автономная очередь работ

Этот файл — единственный источник правды для автономных (запланированных) прогонов.
Каждый запуск стартует «с холодного старта» и не помнит чат — действуй строго по этому файлу.

## Протокол одного прогона

1. Прочитай этот файл и осмотри связанный код (структура — ниже).
2. Возьми **первый невыполненный** пункт из «Очередь» (верхний `[ ]`).
3. Реализуй его **полностью** (schema → shared → backend → frontend), следуя «Конвенциям».
4. Проверь, что относительные импорты резолвятся (скрипт в «Проверка»).
5. Отметь пункт `[x]`, допиши строку в «Журнал прогресса» (дата + что сделано + нужен ли `db push`).
6. Делай **один пункт за прогон**. Не начинай следующий.
7. Короткий итог в финальном сообщении.

## Guardrails (строго)

- НЕ делать `git commit`/`git push`, НЕ деплоить, НЕ запускать `docker build`/Pages — это ревью владельца утром.
- Все текущие функции остаются **бесплатными**; новые платные — только за `requireFeature`/`PremiumGate`, по умолчанию выключены.
- Только обратносовместимые изменения; не ломать существующие API/экраны.
- Не трогать прод-данные; секреты не коммитить; `.env` не править (только `.env.example` при необходимости).
- Полный `tsc`/сборку в песочнице не прогнать (npm-реестр заблокирован, 403). Проверять: ревью + скрипт импортов + при наличии чистой логики — изолированный тест в `/tmp` через `node --experimental-strip-types`.
- Изменения схемы Prisma применяются у владельца через `db push` — обязательно укажи это в итоге.

## Конвенции проекта

- Монорепо pnpm: `apps/backend`, `apps/miniapp`, `packages/shared`, `packages/database`.
- Backend: feature-модули в `apps/backend/src/modules/<feature>` — `*.repository.ts` (интерфейс) + `*.repository.prisma.ts` + `*.service.ts` + `*.controller.ts`. Связывание — composition root `apps/backend/src/config/container.ts`; типы контейнера — `apps/backend/src/shared/di/container.ts`.
- Доменные события: `apps/backend/src/shared/events`. Подписчики (геймификация, питомец) — `register.ts` в модулях. XP меняется только через `GamificationService` (события). Отрицательный XP — кламп до 0, уровень может падать.
- Контракты DTO/типы/конфиги — в `@tpc/shared` (`packages/shared/src`), и backend, и frontend импортируют оттуда. Формула уровней — `levelProgress/levelFromXp` в `@tpc/shared`.
- Время: брать `now()` из `apps/backend/src/shared/clock.ts` (учитывает `CLOCK_OFFSET_MINUTES`), а не `new Date()`. Таймзона пользователя — `getLocalDateString/periodAnchor/periodRange/localDateTimeToUtc` из `shared/time.ts`.
- Идемпотентность рассылок/штрафов — через `Notification.dedupeKey` (`NotificationService.sendOnce`).
- HTTP: контроллеры — фабрики, отдающие `Router`; защищённые роуты за `auth` middleware; ошибки через `AppError`/`asyncHandler`.
- Frontend: экраны в `apps/miniapp/src/screens`, переиспользуемое — `components`; API — `apps/miniapp/src/api/client.ts`; относительные импорты с расширением `.js`. Навигация — `components/BottomNav.tsx` (сейчас 3 вкладки: Главная/Задачи/Профиль). Тема Telegram — классы `tg-*`.
- Premium-гейт: `EntitlementService.hasFeature` / `requireFeature` (backend), `PremiumGate`/`hasFeature` (frontend), реестр фич — `@tpc/shared` `PLAN_FEATURES`.

## Проверка (после изменений)

```
cd "/sessions/<session>/mnt/Telegram Assistant"   # путь mount см. в Shell access
for app in apps/backend/src apps/miniapp/src; do
  (cd "$app"; while IFS= read -r f; do
    grep -oE "from \"(\.{1,2}/[^\"]+)\"" "$f" | sed -E 's/from "//; s/"//' | while read -r s; do
      b="$(dirname "$f")"; t="$b/${s%.js}"
      [ -f "$t.ts" ] || [ -f "$t.tsx" ] || echo "MISSING: $f -> $s"
    done
  done < <(find . -name '*.ts' -o -name '*.tsx'); )
done
```

---

## Определение «скиллов» (чтобы не разойтись)

Скиллы = развиваемые области пользователя (RPG-стиль): «Спорт», «Учёба», «Здоровье» и т.п.
У скилла есть `xp` и `level` (формула из `@tpc/shared`). Шаблоны скиллов (роадмап) — каталог,
из которого пользователь добавляет себе скиллы. Начисление XP скиллам (привязка к
задачам/привычкам) — отдельный поздний пункт; на старте скиллы просто заводятся и отображаются.

---

## Очередь (приоритет сверху вниз)

- [x] **Skills — frontend**: в профиле заменить заглушку «Скиллы» на список скиллов пользователя
      (карточки с уровнем и прогресс-баром `levelProgress`) + раздел «Роадмап» (доступные шаблоны,
      кнопка «добавить»). API уже есть (`/api/skills`, `/api/skills/roadmap`, `POST /api/skills`).
- [x] **Skills — начисление XP**: добавить скиллу опциональную связь, награждать XP скилла при
      выполнении задач/привычек, отмеченных этим скиллом (минимально: поле `skillCode` у задачи/привычки,
      событие → `Skill.xp += reward`, пересчёт уровня). Обновить градацию уровней.
- [x] **Лидерборд**: `GET /api/leaderboard` (топ по уровню/XP, и место пользователя),
      экран/блок в профиле «рейтинг». Учесть масштаб (индекс, лимит, пагинация).
- [ ] **Кастомизация пета (премиум)**: набор вариантов внешнего вида/имени; гейт `PET_CUSTOMIZATION`
      (`requireFeature` на бэке, `PremiumGate` на фронте). Бесплатным — дефолт.
- [ ] **Мульти-петы**: возможность иметь/выбирать несколько питомцев (премиум для >1), активный пет.
- [ ] **i18n (англ)**: вынести строки UI в словарь (ru/en), выбор по `languageCode` Telegram; бот-тексты — позже.
- [ ] **AI-компаньон / утренние мотивационные тексты**: использовать `LLMProvider` для генерации
      утреннего текста на основе привычек/скиллов/стрика (через очередь/планировщик, graceful degradation).
- [ ] **Месячный ревайнд**: агрегированный отчёт за месяц (выполнено, стрик, рост скиллов), раздаётся
      в конце месяца через планировщик (идемпотентно по `dedupeKey`).
- [ ] **Надёжность/масштаб**: троттлинг рассылки под лимит Telegram (~30 msg/s) + оптимизация скана
      привычек (выбирать только попадающие в окно времени), чтобы тянуть десятки тысяч пользователей.
- [ ] **Красивый UI / события**: анимации пета, событие level-up, событие «все привычки/задачи закрыты сегодня».

## Журнал прогресса

- 2026-06-19 — Заведён BACKLOG + автозапуск (каждые 5 ч). Реализована **Skills — backend foundation**
  (модели `Skill`/`SkillTemplate`, seed-шаблоны, `@tpc/shared` DTO, модуль `skills`, API
  `/api/skills`, `/api/skills/roadmap`, `POST /api/skills`). Требуется `db push`. Frontend скиллов — следующий пункт.
- 2026-06-23 — Реализован **Skills — frontend**. В `ProfileScreen.tsx` заглушка «Скиллы» заменена на
  секцию `SkillsSection`: список скиллов карточками `SkillCard` (иконка, уровень, прогресс-бар `ProgressBar`
  по `ratio`, `xpIntoLevel/xpForLevelSpan`), кнопка «Роадмап ›» и bottom-sheet `SkillRoadmapModal` с
  доступными (не добавленными) шаблонами и кнопкой «Добавить». Данные грузятся независимо от Home через
  `api.getSkills/getSkillRoadmap/addSkill` (методы уже были в `client.ts`), есть состояния загрузки/ошибки/пустоты.
  Изменён только фронт (`apps/miniapp/src/screens/ProfileScreen.tsx`). Схема Prisma НЕ менялась — `db push` НЕ нужен.
- 2026-06-23 — Реализован **Skills — начисление XP**. Schema: добавлено опц. поле `skillCode String?`
  в `Task` и `Habit` (+ индекс `Task @@index([userId, skillCode])`), не FK (скилл может появиться позже —
  начисление просто no-op). `@tpc/shared`: `skillCode` в `TaskDto`/`HabitDto`/`CreateTaskRequest`/
  `UpdateTaskRequest`/`CreateHabitRequest`; новый конфиг `SKILL_XP_REWARDS` в `config/xp.ts`. Backend:
  доменные события `TaskStatusChanged`/`HabitCompleted`/`HabitUncompleted` несут `skillCode`; новый
  подписчик `skills/register.ts` (по образцу `pet/register.ts`, fire-and-forget) начисляет XP скиллу;
  `SkillService.awardXp(userId, code, delta)` — кламп до 0 + пересчёт уровня `levelFromXp` (зеркало
  `GamificationService`: атомарный `incXp` на награду, `setXp` на возврат); репозиторий — `applyXp`/
  `SkillXpPatch`; `TaskService`/`HabitService` пробрасывают `skillCode` в создание/редактирование и в
  события; контроллеры (zod) принимают `skillCode`; подписка добавлена в `config/container.ts`.
  Правила: задача даёт XP скиллу только за ПЕРВОЕ выполнение (без возврата при снятии — как глоб. XP);
  привычка — `xpReward` при отметке и возврат при снятии; пропуск привычки скилл НЕ штрафует.
  Frontend: новый `components/SkillSelect.tsx`; выбор скилла в форме задачи (`TasksScreen.tsx`) и в
  редакторе привычки (`HabitCircles.tsx`); метка скилла на `TaskCard.tsx`. Чистая логика начисления
  проверена изолированно (`node --experimental-strip-types`, все кейсы PASS). **Требуется `db push`**
  (изменена схема Prisma).
- 2026-06-23 — Реализован **Лидерборд**. Schema: добавлен `@@index([xp])` на `UserStatistics`
  (обратный скан под `ORDER BY xp DESC` + range-скан под `COUNT(xp > :me)` — иначе full scan под 100k+).
  `@tpc/shared`: DTO `LeaderboardEntryDto`/`LeaderboardResponse`. Backend: новый модуль `leaderboard`
  (`leaderboard.repository.ts` интерфейс `ILeaderboardRepository` — `topByXp`/`countAll`/
  `countWithXpAbove`/`getRow`; `*.prisma.ts`; `leaderboard.service.ts`; `leaderboard.controller.ts`).
  `GET /api/leaderboard?limit&offset` (zod-coerce query, `limit` кламп 1..100 деф.20, `offset>=0`),
  возвращает `{ top, me, total, limit, offset }`. Ранжирование по `xp DESC` (уровень производен), по
  всем `UserStatistics` без join/фильтра isActive (счётчики на одной таблице — индекс-дружелюбно).
  Ранг топа — позиционный (`offset+i+1`); собственное место `me` — competition-ранг `count(xp>my)+1`,
  но если пользователь на странице — переиспользуется его позиционный ранг (консистентность при ничьих).
  Приватность: отдаём только `firstName`/`@username` (фолбэк «Пользователь»), без telegramId/фамилии.
  Фича бесплатная (без premium-гейта). DI: репозиторий+сервис в `shared/di/container.ts` и
  `config/container.ts`; контроллер примонтирован в `http.runtime.ts`. Frontend: `api.getLeaderboard`
  в `client.ts`; секция `LeaderboardSection` в `ProfileScreen.tsx` (топ-10 строками `LeaderboardRow`
  с медалями 🥇🥈🥉, подсветкой своей строки, «Ваше место: N из Total») + модалка `LeaderboardModal`
  с подгрузкой по страницам (limit/offset, «Показать ещё»). Чистая логика ранга/клампа/пагинации
  проверена изолированно (`node --experimental-strip-types`, 22/22 PASS). **Требуется `db push`**
  (изменена схема Prisma — новый индекс).
