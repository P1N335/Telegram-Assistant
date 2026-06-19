export type Tab = "home" | "tasks" | "stats" | "pet";

const TABS: Array<{ id: Tab; icon: string; label: string }> = [
  { id: "home", icon: "🏠", label: "Главная" },
  { id: "tasks", icon: "📋", label: "Задачи" },
  { id: "stats", icon: "📊", label: "Статистика" },
  { id: "pet", icon: "🐾", label: "Питомец" },
];

export function BottomNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="bg-tg-secondaryBg sticky bottom-0 grid grid-cols-4 border-t border-black/5">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex flex-col items-center gap-0.5 py-2.5 text-xs transition ${
            active === t.id ? "text-tg-link" : "text-tg-hint"
          }`}
        >
          <span className="text-xl">{t.icon}</span>
          {t.label}
        </button>
      ))}
    </nav>
  );
}
