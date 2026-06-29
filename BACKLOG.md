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
- [x] **Кастомизация пета (премиум)**: набор вариантов внешнего вида/имени; гейт `PET_CUSTOMIZATION`
      (`requireFeature` на бэке, `PremiumGate` на фронте). Бесплатным — дефолт.
- [x] **Мульти-петы**: возможность иметь/выбирать несколько питомцев (премиум для >1), активный пет.
- [x] **i18n (англ)**: вынести строки UI в словарь (ru/en), выбор по `languageCode` Telegram; бот-тексты — позже.
- [x] **AI-компаньон / утренние мотивационные тексты**: использовать `LLMProvider` для генерации
      утреннего текста на основе привычек/скиллов/стрика (через очередь/планировщик, graceful degradation).
- [x] **Месячный ревайнд**: агрегированный отчёт за месяц (выполнено, стрик, рост скиллов), раздаётся
      в конце месяца через планировщик (идемпотентно по `dedupeKey`).
- [x] **Надёжность/масштаб**: троттлинг рассылки под лимит Telegram (~30 msg/s) + оптимизация скана
      привычек (выбирать только попадающие в окно времени), чтобы тянуть десятки тысяч пользователей.
- [x] **Красивый UI / события**: анимации пета, событие level-up, событие «все привычки/задачи закрыты сегодня».

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
- 2026-06-24 — Реализована **Кастомизация пета (премиум)**. «Внешний вид» = выбор вида
  (`PetSpecies`) из каталога — переиспользует существующую модель, уровень/XP/состояние
  сохраняются, каталог расширяется через seed (без миграций). Schema Prisma **НЕ менялась**
  (`Pet` уже имеет `name`+`speciesId`) → **`db push` НЕ нужен**. `@tpc/shared`: новый
  `config/pet.ts` (`PET_NAME_MIN/MAX_LENGTH=1..24`); DTO `PetCustomizationOptionDto`/
  `PetCustomizationDto`/`UpdatePetRequest`. Backend (модуль `pet`): чистая `sanitizePetName`
  (trim+схлоп+длина) в `pet.rules.ts`; репозиторий — `listSpecies` (только `isActive`) +
  `updateAppearance` (частичный patch имени/вида, возвращает с relations); сервис —
  `getCustomization` (превью эмодзи под текущий уровень) и `customize` (валидация имени и
  существования вида, идемпотентно, общий помощник `currentState` с decay). Контроллер:
  `GET /api/pet/customization` (всем), `PATCH /api/pet` за `requireFeature(PET_CUSTOMIZATION)`
  (free → 402 FEATURE_LOCKED); в `http.runtime` проброшен `entitlements`. Frontend:
  `api.getPetCustomization`/`api.updatePet`; в `ProfileScreen` секция питомца вынесена в
  `PetSection` с кнопкой «Кастомизация ›» → модалка `PetCustomizationModal` (имя + сетка
  `VariantGrid`), для free — `PremiumGate` (превью+замок, форма скрыта); сохранение зовёт
  `onChanged` (refresh Home). Seed: добавлены виды `fox`/`penguin` (идемпотентный upsert) —
  богаче набор вариантов. Чистая логика `sanitizePetName` проверена изолированно
  (`node --experimental-strip-types`, 8/8 PASS), скрипт импортов — без MISSING.
  **`db push` НЕ нужен.** Рекомендуется (опц.) повторно запустить seed, чтобы появились
  новые виды fox/penguin (cat/dragon работают и без этого).
- 2026-06-24 — Реализованы **Мульти-петы**. Schema: `Pet.userId` больше НЕ `@unique`
  (1:N), добавлено `isActive Boolean @default(true)` (активный = показываемый/растущий
  питомец), индекс `@@index([userId, isActive])` (выборка активного + список/счётчик по
  userId как prefix), связь `User.pet Pet?` → `User.pets Pet[]`. Инвариант «ровно один
  активный на пользователя» держится на уровне приложения (атомарные транзакции), т.к.
  Prisma не выражает частично-уникальные индексы. Обратносовместимо: существующие
  питомцы получают `isActive=true` (становятся активными). `@tpc/shared`: фича
  `PremiumFeature.MULTI_PET` (в `PLAN_FEATURES.PREMIUM`); константа `MAX_PETS_PER_USER=10`
  (жёсткий потолок строк/пользователя — защита масштаба); DTO `PetSummaryDto`/
  `PetCollectionDto`/`CreatePetRequest`. Backend (модуль `pet`): репозиторий —
  `findActiveByUserId` (бывш. `findByUserId`, теперь `findFirst isActive`), `listByUserId`,
  `countByUserId`, `findByIdForUser` (ownership), `createForUser(...,activate)` (в tx гасит
  активность прочих), `setActive(userId,petId)` (tx). Сервис: `getOrCreate` теперь
  активный-aware + самовосстановление (если активного нет, но питомцы есть — промоут
  старейшего); `getCollection`/`createPet`/`activatePet`/`toSummary`; премиум сервис не
  знает — гейт на роуте. Контроллер: `GET /api/pet/collection` (всем), `POST
  /api/pet/collection` за `requireFeature(MULTI_PET)` (free→402), `POST
  /api/pet/collection/:id/activate` (всем — выбор среди своих, чтобы downgrade не запирал
  доступ). Награды (`reward`) идут активному питомцу (через `getOrCreate`). Frontend:
  `api.getPetCollection/createPet/activatePet`; в `ProfileScreen` секция питомца получила
  ссылку «Питомцы ›» → модалка `PetsModal` (список с выбором активного, бейдж «активный»,
  «N/max») + `AddPetForm` (имя + вид из каталога) для премиума, для free —
  `PremiumGate`-заглушка; смена активного зовёт `onChanged` (refresh Home/PetCard). Чистая
  логика (инвариант одного активного, промоут, потолок, дефолты имени/вида, ownership,
  идемпотентность активации) проверена изолированно (`node --experimental-strip-types`,
  24/24 PASS); скрипт импортов — без MISSING. **Требуется `db push`** (изменена схема
  Prisma: снят unique, новое поле `isActive`, новый индекс, связь 1:N).
- 2026-06-24 — Реализован **i18n (ru/en)** для Mini App. Механизм — в `@tpc/shared`
  (`config/i18n.ts`): тип `Locale`/`SUPPORTED_LOCALES`/`DEFAULT_LOCALE='ru'`,
  `resolveLocale(languageCode)` (берёт первичный сабтег, фолбэк ru — консервативно/
  обратносовместимо), `interpolate('{name}')`, `INTL_LOCALE` (BCP-47 для Intl) +
  vitest-тест `i18n.test.ts`. Контент словарей — в приложении
  (`apps/miniapp/src/i18n/strings.ts`): `ru` — источник правды по набору ключей
  (`type TranslationKey = keyof typeof ru`), `en: Record<TranslationKey,string>`
  обязан иметь те же ключи (компайл-тайм проверка паритета); плюрализуемые единицы
  хранят все CLDR-формы (one/few/many/other). Провайдер/хук — `i18n/index.tsx`:
  `I18nProvider` (язык резолвится 1 раз из Telegram `language_code`), `useI18n()` →
  `{ locale, t, plural, formatDateTime }`; `plural` через `Intl.PluralRules` (без
  зависимостей, корректные русские формы 1/2/5/11/21), `formatDateTime` — локаль-зависимый;
  синглтон `getI18n()` доступен и вне React (используется в `api/client.ts` для фолбэка
  HTTP-ошибки). В `lib/telegram.ts` добавлен `getLanguageCode()`; `<App/>` обёрнут в
  `I18nProvider` (`main.tsx`). Все хардкод-строки UI заменены на `t()` в App, BottomNav,
  ui (Loader/ErrorState), Home/Tasks/Profile, TaskCard/TaskItem-не-треб, HabitCircles,
  PetCard, PremiumGate, SkillSelect (даты — `formatDateTime`, числительные — `plural`,
  параметры — `{placeholders}`). Бэкенд-контент (имена скиллов, стадии/фразы питомца,
  тексты достижений) НЕ локализуется — это «бот-тексты», поздний этап. `lib/pet-view.ts`
  (метки настроения) опустошён — перенесено в словарь (`pet.moodLabel.*`). Чистая логика
  (resolveLocale/interpolate/plural ru+en/паритет ключей) проверена изолированно
  (`node --experimental-strip-types`, 34/34 PASS); скрипт импортов — без MISSING.
  Изменён только фронт + `@tpc/shared`; **схема Prisma НЕ менялась → `db push` НЕ нужен.**
- 2026-06-24 — Реализован **AI-компаньон / утренние мотивационные тексты**. Расширен
  `LLMProvider`: новый `MorningInput` + метод `generateMorningMotivation` (реализован в
  Noop/OpenAI/Ollama; в OpenAI/Ollama выделен общий приватный `chat()` — транспорт не
  дублируется между коучингом и утром); `buildMorningPrompt(input)` в `ai/prompt.ts`
  (локаль-зависимый system ru/en через первичный сабтег, мягкая деградация при пустых
  привычках/скиллах). Новый сервис `modules/companion/MorningCompanionService`
  (`buildMorningText(user, localDate) → string | null`): собирает стрик
  (`UserStatistics`), привычки на сегодня (`listActiveByUser` + `isDueOn`, без БД-правил),
  топ-3 скилла (сорт по level↓, xp↓), локаль (`resolveLocale`), зовёт LLM под таймаут,
  возвращает текст или `null` (фолбэк). Изолирован как отдельный сервис → при росте его
  дёргает BullMQ-воркер per-user без правки логики. Планировщик: утро персонализируется
  (`MORNING_PLAN`-сообщение = AI-текст + `TEXT.morningCta`, либо статичный `TEXT.morning`);
  генерация идёт с ограниченным параллелизмом (`mapWithConcurrency`) и таймаутом
  (`withTimeout`) — новые чистые утилиты `shared/async.ts`, чтобы дорогой LLM не блокировал
  почасовой тик под 100k+. Идемпотентность не изменена (`dedupeKey = userId:morning:date`,
  одно сообщение в любой ветке). Фича строго **opt-in** и обратносовместима: env
  `AI_MORNING_ENABLED=false` по умолчанию + требует `AI_PROVIDER != noop` → текущая утренняя
  рассылка не меняется, пока владелец не включит; добавлены `AI_MORNING_TIMEOUT_MS=4000`,
  `AI_MORNING_CONCURRENCY=4` (только в `.env.example`). DI: сервис собран в
  `config/container.ts` и описан в `shared/di/container.ts` (`services.morningCompanion`).
  Фронтенд не требуется (доставка — бот, не Mini App). Чистая логика (withTimeout/
  mapWithConcurrency/buildMorningPrompt ru+en/гейтинг+фолбэк+сбор контекста сервиса)
  проверена изолированно на верных копиях (`node --experimental-transform-types`, 29/29
  PASS — strip-only режим не поддерживает parameter properties); скрипт импортов — без
  MISSING. **Схема Prisma НЕ менялась → `db push` НЕ нужен.**
- 2026-06-24 — Реализован **Месячный ревайнд**. Schema: добавлено значение `MONTHLY_REWIND`
  в enum `NotificationType` (аддитивно, обратносовместимо). `@tpc/shared`: новый
  `config/rewind.ts` (`REWIND_TOP_SKILLS=3`); DTO `MonthlyRewindDto`/`RewindSkillDto`
  (контракт держим в shared — переиспользуемо, если позже появится экран ревайнда; сейчас
  рендерится в текст бота). Backend — новый модуль `rewind`: чистый `rewind.rules.ts`
  (`previousMonthAnchor` — арифметика якорей предыдущего месяца над YYYY-MM-DD, с
  переходом года; `skillXpGains` — XP скиллам за месяц, зеркало `skills/register.ts`:
  задача `+SKILL_XP_REWARDS.TASK_COMPLETED`, привычка `+xpReward`; `topSkills` — топ по
  росту с фолбэком уровня/имени; `isEmptyRewind`, `totalSkillXpGained`); репозиторий
  `IRewindRepository.aggregateMonth` (+`*.prisma.ts`): `tasksCompleted` (count по
  `completedAt`∈месяц), `taskSkillCounts` (groupBy `skillCode`), `habitCompletions`
  (отметки за месяц + `habit.skillCode/xpReward`) — две разные границы: ts-инстанты
  (`periodRange` MONTH) для `Task.completedAt`, и `@db.Date`-границы (`toDateOnly`
  YYYY-MM-01) для `HabitCompletion.date`; все запросы префиксованы `userId`.
  `MonthlyRewindService.buildRewind(user, localToday)` собирает DTO (стрик из
  `UserStatistics`, имена/уровни из `Skill`), возвращает `null` при пустом месяце
  (пустой отчёт не шлём) и никогда не бросает. Планировщик: `runMonthlyRewind` гейтит
  себя на локальную полночь 1-го числа (только таймзоны, где `localHour==0` и дата
  оканчивается на `-01` → почти всегда ранний выход без обхода юзеров), затем
  `findActiveByTimezones` + рассылка с `mapWithConcurrency(REWIND_CONCURRENCY=8)` под
  лимит соединений; идемпотентность — `dedupeKey=userId:rewind:YYYY-MM`, тип
  `MONTHLY_REWIND`, кнопка `miniAppButton`. Добавлен `IUserRepository.findActiveByTimezones`.
  DI: репозиторий+сервис в `config/container.ts` и `shared/di/container.ts`
  (`repositories.rewind`, `services.monthlyRewind`), сервис проброшен в `SchedulerService`;
  hourly-cron в `scheduler.runtime.ts` зовёт `runMonthlyRewind`. Фронтенд не требуется
  (доставка — бот). Бот-текст `TEXT.rewind` — RU (локализация бот-текстов — поздний этап).
  Чистая логика проверена изолированно (`node --experimental-strip-types`, 19/19 PASS);
  скрипт импортов — без MISSING. **Требуется `db push`** (изменена схема Prisma — новое
  значение enum).
- 2026-06-25 — Реализована **Надёжность/масштаб** (троттлинг рассылки + оконный скан
  привычек). (1) Троттлинг: новый чистый `shared/rate-limiter.ts` (token-bucket с
  инъекцией часов — `acquire()`, всплеск до `burst`, затем устойчивые `ratePerSec`,
  FIFO-очередь ожидающих, `unref`-таймер) + декоратор `RateLimitedSender` в
  `notifications/message-sender.ts` (прозрачно оборачивает `IMessageSender`). Весь
  трафик (утро/вечер/напоминания/ревайнд) идёт через `NotificationService →
  IMessageSender`, поэтому лимит — глобальный на процесс. Env: `TELEGRAM_MAX_MSGS_PER_SEC`
  (деф. 30), `TELEGRAM_SEND_BURST` (деф. 30); 0 = без лимита; в `config/container.ts`
  декоратор подключается только при rate>0 (обратносовместимо, в `.env.example`
  задокументировано). Архитектурная заметка: in-process лимитер достаточен для текущего
  одно-процессного планировщика; при нескольких worker-процессах под 100k+ выносится в
  общий лимитер (Redis/BullMQ) — интерфейс `acquire()` не меняется. (2) Оконный скан:
  раньше `runHabitReminders`/`runHabitRollover` тянули ВСЕ активные привычки каждый тик.
  Теперь — выборка по окну: новый `time.ts` `getLocalHhmm` (zero-padded "HH:MM" с защитой
  от "24:00"); чистые `habit.rules.ts` `hhmmToMinutes`/`minutesToHhmm`/`reminderBand`
  (+ конфиг `HABIT_REMINDER_LOOKAHEAD_MIN=15`/`HABIT_MISSED_AFTER_MIN=60`/
  `HABIT_MISSED_WINDOW_MIN=60`) строят инклюзивный диапазон `timeOfDay`, покрывающий
  все привычки, чьё напоминание (r15/r60) может сработать в этот тик. Планировщик
  группирует активные таймзоны по совпадающему окну (`buildReminderWindows`) и зовёт
  новый репозиторий `listActiveDueInWindows(windows)` (OR групп «таймзоны+диапазон
  timeOfDay»); rollover зовёт `listActiveByTimezones` только для таймзон в локальной
  полуночи. Точные условия r15/r60 применяются к узкому предотобранному набору; окно —
  надмножество, поэтому границы можно слегка «щедрить». **Изменение поведения (намеренно,
  под масштаб):** пинг «не отмечено» (r60) теперь шлётся в окне [+60..+120) мин после
  времени (устойчиво к ~12 пропущенным тикам), а не «в любой момент до конца дня»;
  идемпотентность не изменена (`dedupeKey=habit:id:r60:date`). Убран неиспользуемый
  `IHabitRepository.listAllActiveWithUser`. Schema: добавлен индекс
  `Habit @@index([isActive, timeOfDay])` (range-скан окна вместо полного скана).
  Чистая логика проверена изолированно на верных копиях (`node --experimental-strip-types`):
  RateLimiter (всплеск/устойчивая скорость/FIFO/unlimited) — 6/6 PASS; band/hhmm/
  getLocalHhmm/группировка/свойство-надмножество/ограниченный r60 — 27/27 PASS (итого
  33/33). Скрипт импортов — без MISSING. **Требуется `db push`** (изменена схема Prisma —
  новый индекс).
- 2026-06-25 — Реализован **Красивый UI / события** (последний пункт очереди). Три части,
  все обратносовместимо и без правки схемы Prisma. (1) **Анимации пета**: чистый CSS в
  `apps/miniapp/src/index.css` (кейфреймы `pet-idle/pet-happy/pet-sad` + классы
  `.pet-anim-<moodLabel>`), `PetCard.tsx` навешивает класс по `pet.moodLabel`
  (happy/neutral/sad/tired); уважается `prefers-reduced-motion` (анимации выключаются).
  (2) **Событие level-up** и (3) **событие «всё закрыто сегодня»** — UI-празднования
  (оверлей с «поп»-карточкой + CSS-конфетти, без зависимостей): новый
  `components/Celebration.tsx` (`CelebrationOverlay` + тип `Celebration`), авто-гашение
  ~2.6 c, тап для закрытия, тактильный отклик `triggerHaptic` (новый хелпер в
  `lib/telegram.ts`, безопасный no-op вне Telegram). Детектор в `App.tsx`: сравнивает
  `statistics.level` и `daily.allDone` между обновлениями Home через `useRef`-снимок;
  первая загрузка лишь ставит базлайн (не празднуем уже-выполненное при открытии),
  level-up — при росте уровня, all-done — при переходе false→true; очередь празднований
  с уникальными id (React key → корректный ремаунт/перезапуск таймера). Источник флага
  «всё закрыто» — новое производное поле `HomeResponse.daily` (DTO `DailyCompletionDto`
  в `@tpc/shared`): счётчики дневных задач (COMPLETED) и привычек на сегодня (dueToday/
  doneToday) + `allDone` (есть ≥1 пункт и все закрыты — зеркало семантики «идеального
  дня»). Бэкенд: чистый `shared/http/daily-completion.ts` (`computeDailyCompletion(tasks,
  habits)`), `home.controller.ts` теперь инжектит `HabitService` (`listForToday`) и кладёт
  `daily` в ответ; в `http.runtime.ts` проброшен `c.services.habits`. На главной — баннер
  «всё закрыто» (`home.allDoneBanner`). Новые ключи i18n (ru/en): `home.allDoneBanner`,
  `celebrate.levelUp.*`, `celebrate.allDone.*`. Архзаметка: «событие» трактуется как
  UI-празднование (производное от `daily.allDone`/уровня), без нового доменного события и
  без дубля бот-уведомлений (level-up в бот уже шлёт `gamification/register.ts`). Защита
  от рассинхрона деплоя (Pages раньше бэкенда): чтения `daily` через опц. цепочку
  (`data.daily?.allDone`). Чистая логика проверена изолированно (`node
  --experimental-strip-types`): `computeDailyCompletion` — 10/10 PASS, детектор переходов
  празднований — 9/9 PASS. Скрипт импортов — без MISSING. **`db push` НЕ нужен** (схема
  Prisma не менялась). Контракт `HomeResponse` расширен аддитивно — нужна пересборка
  бэкенда и Pages (см. итог запуска). Очередь пуста — бэклог завершён.
