import type { PremiumStatusDto, PremiumFeature } from "@tpc/shared";

/** Есть ли у пользователя доступ к платной фиче (единая проверка для UI). */
export function hasFeature(premium: PremiumStatusDto | undefined, feature: PremiumFeature): boolean {
  return premium?.features.includes(feature) ?? false;
}
