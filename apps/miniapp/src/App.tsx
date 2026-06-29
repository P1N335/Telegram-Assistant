import { useCallback, useEffect, useRef, useState } from "react";
import type { HomeResponse, TaskDto } from "@tpc/shared";
import { api, authenticate, ApiError } from "./api/client.js";
import { initTelegram, isInsideTelegram } from "./lib/telegram.js";
import { useI18n } from "./i18n/index.js";
import { BottomNav, type Tab } from "./components/BottomNav.js";
import { Loader, ErrorState } from "./components/ui.js";
import { CelebrationOverlay, type Celebration } from "./components/Celebration.js";
import { HomeScreen } from "./screens/HomeScreen.js";
import { TasksScreen } from "./screens/TasksScreen.js";
import { ProfileScreen } from "./screens/ProfileScreen.js";

type Status = "loading" | "ready" | "error" | "no-telegram";

/** Элемент очереди празднований с уникальным id (нужен как React key при ремаунте). */
interface QueuedCelebration {
  id: number;
  celebration: Celebration;
}

export function App() {
  const { t } = useI18n();
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [data, setData] = useState<HomeResponse | null>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [busy, setBusy] = useState(false);

  // Очередь UI-празднований (level-up / «всё закрыто»). Триггерится переходами
  // значений Home между обновлениями; первая загрузка лишь ставит базлайн.
  const [celebrations, setCelebrations] = useState<QueuedCelebration[]>([]);
  const prevLevel = useRef<number | null>(null);
  const prevAllDone = useRef<boolean | null>(null);
  const celebrationId = useRef(0);

  const boot = useCallback(async () => {
    setStatus("loading");
    if (!isInsideTelegram()) {
      setStatus("no-telegram");
      return;
    }
    try {
      await authenticate();
      setData(await api.getHome());
      setStatus("ready");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("app.loadError"));
      setStatus("error");
    }
  }, [t]);

  useEffect(() => {
    initTelegram();
    void boot();
  }, [boot]);

  const refresh = useCallback(async () => {
    setData(await api.getHome());
  }, []);

  // Детектор празднований: сравниваем уровень и «всё закрыто» с предыдущим снимком.
  // На первой загрузке (prev === null) только фиксируем базлайн — не празднуем то,
  // что уже было выполнено при открытии приложения.
  useEffect(() => {
    if (!data) return;
    const level = data.statistics.level;
    // Опциональная цепочка — защита от рассинхрона деплоя (Pages мог обновиться
    // раньше бэкенда, который ещё не отдаёт daily): тогда празднований просто нет.
    const allDone = data.daily?.allDone ?? false;

    if (prevLevel.current === null) {
      prevLevel.current = level;
      prevAllDone.current = allDone;
      return;
    }

    const queued: QueuedCelebration[] = [];
    if (level > prevLevel.current) {
      queued.push({ id: celebrationId.current++, celebration: { kind: "levelup", level } });
    }
    if (allDone && prevAllDone.current === false) {
      queued.push({ id: celebrationId.current++, celebration: { kind: "alldone" } });
    }

    prevLevel.current = level;
    prevAllDone.current = allDone;
    if (queued.length > 0) setCelebrations((q) => [...q, ...queued]);
  }, [data]);

  const handleStatus = useCallback(
    async (id: string, newStatus: TaskDto["status"]) => {
      setBusy(true);
      try {
        await api.setTaskStatus(id, newStatus);
        await refresh();
      } catch {
        /* можно показать тост; пока тихо */
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const handlePlan = useCallback(
    async (text: string) => {
      setBusy(true);
      try {
        await api.planDay({ text });
        await refresh();
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  if (status === "loading") return <Loader />;
  if (status === "no-telegram")
    return <ErrorState message={t("app.noTelegram")} />;
  if (status === "error" || !data)
    return <ErrorState message={error} onRetry={() => void boot()} />;

  const current = celebrations[0];

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      <main className="flex-1 pb-2">
        {tab === "home" && (
          <HomeScreen
            data={data}
            onStatus={handleStatus}
            onPlan={handlePlan}
            onChanged={refresh}
            busy={busy}
          />
        )}
        {tab === "tasks" && <TasksScreen onChanged={refresh} />}
        {tab === "profile" && <ProfileScreen data={data} onChanged={refresh} />}
      </main>
      <BottomNav active={tab} onChange={(next) => (next === "home" ? (setTab(next), void refresh()) : setTab(next))} />
      {current && (
        <CelebrationOverlay
          key={current.id}
          celebration={current.celebration}
          onDone={() => setCelebrations((q) => q.slice(1))}
        />
      )}
    </div>
  );
}
