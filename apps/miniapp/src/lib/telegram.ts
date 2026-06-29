/** Тонкая обёртка над глобальным Telegram.WebApp. */

export function getWebApp(): TelegramWebApp | undefined {
  return window.Telegram?.WebApp;
}

/** Подпись initData для аутентификации на бэкенде. */
export function getInitData(): string {
  return getWebApp()?.initData ?? "";
}

export function getTelegramUserName(): string {
  return getWebApp()?.initDataUnsafe?.user?.first_name ?? "друг";
}

/** Код языка пользователя из Telegram (напр. "en", "ru", "en-US"), если передан. */
export function getLanguageCode(): string | undefined {
  return getWebApp()?.initDataUnsafe?.user?.language_code;
}

/** URL аватарки из Telegram, если клиент его передал (доступен не всегда). */
export function getTelegramPhotoUrl(): string | undefined {
  return getWebApp()?.initDataUnsafe?.user?.photo_url;
}

/** Готовность приложения + развернуть на весь экран + подхватить тему. */
export function initTelegram(): void {
  const wa = getWebApp();
  if (!wa) return;
  wa.ready();
  wa.expand();
}

export function isInsideTelegram(): boolean {
  return Boolean(getWebApp()?.initData);
}

/** Тактильный отклик (если клиент поддерживает). Безопасен вне Telegram — no-op. */
export function triggerHaptic(type: "success" | "warning" | "error" = "success"): void {
  try {
    getWebApp()?.HapticFeedback?.notificationOccurred(type);
  } catch {
    /* HapticFeedback недоступен — игнорируем */
  }
}
