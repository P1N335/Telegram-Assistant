import type {
  ApiErrorResponse,
  HomeResponse,
  TaskDto,
  TelegramAuthResponse,
  PlanDayRequest,
} from "@tpc/shared";
import { getInitData } from "../lib/telegram.js";

const BASE = "/api";

/** JWT хранится в памяти страницы: Mini App переавторизуется при каждом открытии. */
let token: string | null = null;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    let code = "HTTP_ERROR";
    let message = `Ошибка ${res.status}`;
    try {
      const body = (await res.json()) as ApiErrorResponse;
      code = body.error?.code ?? code;
      message = body.error?.message ?? message;
    } catch {
      /* тело не JSON */
    }
    throw new ApiError(res.status, code, message);
  }
  return (await res.json()) as T;
}

/** Обмен Telegram initData на JWT. Сохраняет токен в памяти. */
export async function authenticate(): Promise<TelegramAuthResponse> {
  const result = await request<TelegramAuthResponse>("/auth/telegram", {
    method: "POST",
    body: JSON.stringify({ initData: getInitData() }),
  });
  token = result.token;
  return result;
}

export const api = {
  getHome: () => request<HomeResponse>("/home"),
  getTasks: (date?: string) =>
    request<{ tasks: TaskDto[] }>(`/tasks${date ? `?date=${date}` : ""}`),
  planDay: (body: PlanDayRequest) =>
    request<{ tasks: TaskDto[] }>("/tasks/plan", { method: "POST", body: JSON.stringify(body) }),
  setTaskStatus: (id: string, status: TaskDto["status"]) =>
    request<{ task: TaskDto }>(`/tasks/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};
