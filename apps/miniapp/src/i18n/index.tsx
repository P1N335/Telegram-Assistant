import { createContext, useContext, useMemo, type ReactNode } from "react";
import { resolveLocale, interpolate, INTL_LOCALE, type Locale } from "@tpc/shared";
import { dictionaries, type TranslationKey } from "./strings.js";
import { getLanguageCode } from "../lib/telegram.js";

type Params = Record<string, string | number>;

export interface I18n {
  locale: Locale;
  /** Перевод по ключу с подстановкой `{name}`-плейсхолдеров. */
  t: (key: TranslationKey, params?: Params) => string;
  /**
   * Плюрализация: `base` — префикс ключа (напр. "units.day"), по CLDR-категории
   * (Intl.PluralRules) берётся `${base}.${one|few|many|other}`. `{n}` подставляется.
   */
  plural: (n: number, base: string) => string;
  /** Локаль-зависимое форматирование даты-времени (день/месяц/часы/минуты). */
  formatDateTime: (iso: string) => string;
}

const I18nContext = createContext<I18n | null>(null);

function createI18n(locale: Locale): I18n {
  const dict = dictionaries[locale];
  const intlLocale = INTL_LOCALE[locale];
  const pluralRules = new Intl.PluralRules(intlLocale);

  const t = (key: TranslationKey, params?: Params): string =>
    interpolate(dict[key] ?? key, params);

  const plural = (n: number, base: string): string => {
    const category = pluralRules.select(n);
    const dictAny = dict as unknown as Record<string, string | undefined>;
    const template =
      dictAny[`${base}.${category}`] ??
      dictAny[`${base}.other`] ??
      dictAny[`${base}.many`] ??
      base;
    return interpolate(template, { n });
  };

  const formatDateTime = (iso: string): string =>
    new Date(iso).toLocaleString(intlLocale, {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  return { locale, t, plural, formatDateTime };
}

/**
 * Синглтон локали на сессию. Язык резолвится один раз из Telegram `language_code`
 * (Mini App переоткрывается при каждом запуске, динамическая смена не нужна).
 * Доступен и вне React-дерева — например, в слое API (`api/client.ts`).
 */
let singleton: I18n | null = null;
export function getI18n(): I18n {
  if (!singleton) singleton = createI18n(resolveLocale(getLanguageCode()));
  return singleton;
}

/** Провайдер локали для React-дерева. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const value = useMemo(() => getI18n(), []);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Доступ к переводам. Вне провайдера — синглтон-фолбэк (без падения). */
export function useI18n(): I18n {
  return useContext(I18nContext) ?? getI18n();
}
