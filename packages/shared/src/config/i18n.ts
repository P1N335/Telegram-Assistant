/**
 * Локализация UI — общий механизм выбора языка. Единый источник правды для
 * Mini App (выбор по Telegram `language_code`) и, позже, backend/бота (бот-тексты
 * локализуются отдельным словарём, но язык резолвится этой же функцией).
 *
 * Здесь — только МЕХАНИЗМ (тип локали, резолвер, интерполяция). КОНТЕНТ словарей
 * UI лежит в приложении (`apps/miniapp/src/i18n`), чтобы не раздувать общий пакет
 * фронтовыми строками. Добавление языка = новая запись в SUPPORTED_LOCALES + словарь.
 */

/** Поддерживаемые локали UI. Первая — язык по умолчанию (текущий язык приложения). */
export const SUPPORTED_LOCALES = ["ru", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Язык по умолчанию = `ru`. Используется как фолбэк для любых кодов, кроме явно
 * поддержанных — консервативно и обратносовместимо: пользователи, чей язык не
 * распознан, продолжают видеть текущий (русский) интерфейс.
 */
export const DEFAULT_LOCALE: Locale = "ru";

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Выбор локали по коду языка (Telegram `language_code`, напр. "en", "ru", "en-US").
 * Берём первичный сабтег (до "-"/"_"); если он поддержан — используем его, иначе
 * DEFAULT_LOCALE. Пустой/неизвестный код → ru (как сейчас).
 */
export function resolveLocale(languageCode?: string | null): Locale {
  const primary = (languageCode ?? "").trim().toLowerCase().split(/[-_]/)[0] ?? "";
  return isLocale(primary) ? primary : DEFAULT_LOCALE;
}

/**
 * Подстановка плейсхолдеров вида `{name}` в шаблон значениями из `params`.
 * Неизвестные плейсхолдеры остаются как есть (диагностируемо, без падений).
 */
export function interpolate(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
}

/** BCP-47 коды для Intl (форматирование дат/чисел и плюрализация). */
export const INTL_LOCALE: Record<Locale, string> = {
  ru: "ru-RU",
  en: "en-US",
};
