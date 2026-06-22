import { useEffect, useState } from "react";
import type { AchievementDto, HomeResponse } from "@tpc/shared";
import { api } from "../api/client.js";
import { Card, Chip } from "../components/ui.js";
import { PetCard } from "../components/PetCard.js";
import { getTelegramPhotoUrl } from "../lib/telegram.js";

export function ProfileScreen({ data }: { data: HomeResponse; onChanged?: () => void }) {
  const { user, statistics, pet, premium } = data;
  const [achievements, setAchievements] = useState<AchievementDto[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    void api.getAchievements().then((r) => setAchievements(r.achievements));
  }, []);

  const photo = getTelegramPhotoUrl();
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Пользователь";
  const initial = (user.firstName ?? "?").charAt(0).toUpperCase();
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="space-y-4 p-4">
      {/* Шапка */}
      <div className="flex items-center gap-4">
        <div className="bg-tg-button flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full text-2xl font-bold text-white">
          {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : initial}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold">{fullName}</h1>
          {user.username && <p className="text-tg-hint text-sm">@{user.username}</p>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip icon="⭐️" label={`Уровень ${statistics.level}`} />
        <Chip icon="🔥" label={`${statistics.currentStreak} дней`} />
        <Chip icon="✨" label={`${statistics.xp} XP`} />
        {premium.active && <Chip icon="💎" label="Premium" />}
      </div>

      {/* Скиллы (заглушка) */}
      <section>
        <h2 className="text-tg-hint mb-2 text-sm font-semibold uppercase">Скиллы</h2>
        <Card>
          <p className="text-tg-hint text-sm">Система навыков скоро появится 🛠️</p>
        </Card>
      </section>

      {/* Статистика */}
      <section>
        <h2 className="text-tg-hint mb-2 text-sm font-semibold uppercase">Статистика</h2>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Выполнено" value={`${statistics.tasksCompleted}`} />
          <Stat label="Процент" value={`${Math.round(statistics.completionRate * 100)}%`} />
          <Stat label="Создано" value={`${statistics.tasksCreated}`} />
          <Stat label="Серия" value={`${statistics.currentStreak}`} />
          <Stat label="Рекорд" value={`${statistics.longestStreak}`} />
          <Stat label="Уровень" value={`${statistics.level}`} />
        </div>
      </section>

      {/* Достижения */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-tg-hint text-sm font-semibold uppercase">
            Достижения {achievements.length > 0 && `· ${unlockedCount}/${achievements.length}`}
          </h2>
          {achievements.length > 0 && (
            <button onClick={() => setShowAll(true)} className="text-tg-link text-sm">
              Все ›
            </button>
          )}
        </div>
        <div className="grid grid-cols-4 gap-3">
          {achievements.slice(0, 8).map((a) => (
            <Badge key={a.code} achievement={a} />
          ))}
        </div>
      </section>

      {/* Питомец */}
      <section>
        <h2 className="text-tg-hint mb-2 text-sm font-semibold uppercase">Питомец</h2>
        <PetCard pet={pet} />
      </section>

      {showAll && <AchievementsModal items={achievements} onClose={() => setShowAll(false)} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-tg-secondaryBg rounded-xl py-3 text-center">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-tg-hint text-xs">{label}</div>
    </div>
  );
}

function Badge({ achievement }: { achievement: AchievementDto }) {
  const { unlocked, icon } = achievement;
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
          unlocked ? "bg-tg-button/10 border-tg-link border-2" : "bg-tg-secondaryBg opacity-50 grayscale"
        }`}
      >
        {unlocked ? (icon ?? "🏅") : "🔒"}
      </div>
      <span className="text-tg-hint w-14 truncate text-center text-[10px]">{achievement.title}</span>
    </div>
  );
}

function AchievementsModal({ items, onClose }: { items: AchievementDto[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-tg-bg max-h-[80vh] w-full overflow-y-auto rounded-t-2xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 font-semibold">Достижения</h3>
        <div className="space-y-2">
          {items.map((a) => (
            <div key={a.code} className={`flex items-center gap-3 rounded-xl p-2 ${a.unlocked ? "" : "opacity-50"}`}>
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl ${
                  a.unlocked ? "bg-tg-button/10" : "bg-tg-secondaryBg grayscale"
                }`}
              >
                {a.unlocked ? (a.icon ?? "🏅") : "🔒"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">{a.title}</p>
                <p className="text-tg-hint truncate text-xs">{a.description}</p>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="bg-tg-secondaryBg mt-3 w-full rounded-xl py-2.5 text-sm">
          Закрыть
        </button>
      </div>
    </div>
  );
}
