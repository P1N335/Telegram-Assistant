import type { ReactNode } from "react";
import { useI18n } from "../i18n/index.js";

export function Loader({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-tg-hint border-t-tg-button" />
      <span className="text-tg-hint text-sm">{label ?? t("common.loading")}</span>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-tg-secondaryBg rounded-2xl p-4 ${className}`}>{children}</div>
  );
}

export function Chip({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="bg-tg-secondaryBg flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm">
      <span>{icon}</span>
      <span className="font-medium">{label}</span>
    </div>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="bg-tg-bg h-2.5 w-full overflow-hidden rounded-full">
      <div
        className="h-full rounded-full bg-tg-button transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="text-3xl">😕</span>
      <p className="text-tg-hint text-sm">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="bg-tg-button text-tg-buttonText rounded-xl px-4 py-2 text-sm">
          {t("common.retry")}
        </button>
      )}
    </div>
  );
}
