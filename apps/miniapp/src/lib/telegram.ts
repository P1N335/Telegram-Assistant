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
