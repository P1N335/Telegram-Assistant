import { PremiumFeature, type SubscriptionPlan } from "../types/index.js";

/**
 * Карта «план → доступные фичи». Единый источник правды для backend (гейтинг)
 * и Mini App (показ замков). Новая платная механика = добавить её код в нужный план.
 */
export const PLAN_FEATURES: Record<SubscriptionPlan, PremiumFeature[]> = {
  FREE: [],
  PREMIUM: [PremiumFeature.PET_CUSTOMIZATION],
};
