import { useCallback, useEffect, useState } from "react";
import type { HomeResponse, TaskDto } from "@tpc/shared";
import { api, authenticate, ApiError } from "./api/client.js";
import { initTelegram, isInsideTelegram } from "./lib/telegram.js";
import { useI18n } from "./i18n/index.js";
import { BottomNav, type Tab } from "./components/BottomNav.js";
import { Loader, ErrorState } from "./components/ui.js";
import { HomeScreen } from "./screens/HomeScreen.js";
import { TasksScreen } from "./screens/TasksScreen.js";
import { ProfileScreen } from "./screens/ProfileScreen.js";

type Status = "loading" | "ready" | "error" | "no-telegram";

export function App() {
  const { t } = useI18n();
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [data, setData] = useState<HomeResponse | null>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [busy, setBusy] = useState(false);

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
    </div>
  );
}
