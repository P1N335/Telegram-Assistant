import { useEffect, useMemo } from "react";
import { useI18n } from "../i18n/index.js";
import { triggerHaptic } from "../lib/telegram.js";

/** Тип события празднования (UI-only): новый уровень либо «всё на сегодня закрыто». */
export type Celebration = { kind: "levelup"; level: number } | { kind: "alldone" };

const CONFETTI_COLORS = ["#FFC700", "#FF5C5C", "#2DD4BF", "#6366F1", "#F472B6", "#34D399"];
const CONFETTI_COUNT = 18;
const DISMISS_MS = 2600;

/**
 * Полупрозрачный оверлей с «поп»-карточкой и падающим конфетти. Появляется при
 * переходе (level-up / закрытие дня), сам гаснет через ~2.6 c, закрывается тапом.
 * Без зависимостей: конфетти — чистый CSS. Уважает prefers-reduced-motion (см. index.css).
 */
export function CelebrationOverlay({
  celebration,
  onDone,
}: {
  celebration: Celebration;
  onDone: () => void;
}) {
  const { t } = useI18n();

  // Параметры конфетти фиксируем на маунт (не пересчитываются на ре-рендере).
  const pieces = useMemo(
    () =>
      Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
        left: Math.round((i / CONFETTI_COUNT) * 100 + (Math.random() * 6 - 3)),
        delay: Math.round(Math.random() * 600),
        duration: 1600 + Math.round(Math.random() * 1200),
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotate: Math.round(Math.random() * 360),
      })),
    [],
  );

  useEffect(() => {
    triggerHaptic("success");
    const id = window.setTimeout(onDone, DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [onDone]);

  const icon = celebration.kind === "levelup" ? "🎉" : "✅";
  const title =
    celebration.kind === "levelup" ? t("celebrate.levelUp.title") : t("celebrate.allDone.title");
  const subtitle =
    celebration.kind === "levelup"
      ? t("celebrate.levelUp.subtitle", { level: celebration.level })
      : t("celebrate.allDone.subtitle");

  return (
    <div
      onClick={onDone}
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-black/40 p-6"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {pieces.map((p, i) => (
          <span
            key={i}
            className="confetti-piece"
            style={{
              left: `${p.left}%`,
              backgroundColor: p.color,
              animationDelay: `${p.delay}ms`,
              animationDuration: `${p.duration}ms`,
              transform: `rotate(${p.rotate}deg)`,
            }}
          />
        ))}
      </div>

      <div className="celebrate-card bg-tg-bg relative max-w-xs rounded-2xl px-8 py-6 text-center shadow-xl">
        <div className="text-5xl">{icon}</div>
        <h3 className="mt-3 text-lg font-bold">{title}</h3>
        <p className="text-tg-hint mt-1 text-sm">{subtitle}</p>
      </div>
    </div>
  );
}
