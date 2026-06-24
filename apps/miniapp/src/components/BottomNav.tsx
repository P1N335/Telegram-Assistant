import { useI18n } from "../i18n/index.js";
import type { TranslationKey } from "../i18n/strings.js";

export type Tab = "home" | "tasks" | "profile";

const TABS: Array<{ id: Tab; icon: string; labelKey: TranslationKey }> = [
  { id: "home", icon: "🏠", labelKey: "nav.home" },
  { id: "tasks", icon: "📋", labelKey: "nav.tasks" },
  { id: "profile", icon: "👤", labelKey: "nav.profile" },
];

export function BottomNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const { t } = useI18n();
  return (
    <nav className="bg-tg-secondaryBg sticky bottom-0 grid grid-cols-3 border-t border-black/5">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex flex-col items-center gap-0.5 py-2.5 text-xs transition ${
            active === tab.id ? "text-tg-link" : "text-tg-hint"
          }`}
        >
          <span className="text-xl">{tab.icon}</span>
          {t(tab.labelKey)}
        </button>
      ))}
    </nav>
  );
}
