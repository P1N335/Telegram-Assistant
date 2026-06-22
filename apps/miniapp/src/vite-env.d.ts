/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** База API для прод-сборки (GitHub Pages). Должна включать /api. */
  readonly VITE_API_BASE_URL?: string;
}

/** Минимальные типы официального Telegram WebApp SDK (telegram-web-app.js). */
interface TelegramWebAppUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: { user?: TelegramWebAppUser };
  colorScheme: "light" | "dark";
  themeParams: Record<string, string>;
  ready: () => void;
  expand: () => void;
  setHeaderColor?: (color: string) => void;
  HapticFeedback?: { impactOccurred: (style: string) => void; notificationOccurred: (type: string) => void };
}

interface Window {
  Telegram?: { WebApp: TelegramWebApp };
}
