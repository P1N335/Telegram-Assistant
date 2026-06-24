import type { ReactNode } from "react";
import type { PremiumStatusDto, PremiumFeature } from "@tpc/shared";
import { hasFeature } from "../lib/premium.js";
import { useI18n } from "../i18n/index.js";

interface Props {
  premium: PremiumStatusDto | undefined;
  feature: PremiumFeature;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Обёртка для будущих платных блоков: показывает контент только при наличии фичи,
 * иначе — заглушку с предложением подписки. Сейчас не используется (всё бесплатно),
 * но готова к встраиванию новых платных механик.
 */
export function PremiumGate({ premium, feature, children, fallback }: Props) {
  const { t } = useI18n();
  if (hasFeature(premium, feature)) return <>{children}</>;
  return (
    <>
      {fallback ?? (
        <div className="bg-tg-secondaryBg text-tg-hint rounded-2xl p-4 text-center text-sm">
          {t("premium.locked")}
        </div>
      )}
    </>
  );
}
