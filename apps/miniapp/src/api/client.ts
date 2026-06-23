import type {
  ApiErrorResponse,
  HomeResponse,
  TaskDto,
  SubtaskDto,
  TaskPeriod,
  TelegramAuthResponse,
  PlanDayRequest,
  CreateTaskRequest,
  UpdateTaskRequest,
  HabitDto,
  CreateHabitRequest,
  AchievementDto,
  SkillDto,
  SkillTemplateDto,
  CreateSkillRequest,
  LeaderboardResponse,
} from "@tpc/shared";
import { getInitData } from "../lib/telegram.js";

// В dev — относительный "/api" (проксируется Vite). На GitHub Pages фронт статичен и
// ходит на отдельный бэкенд: задаётся при сборке через VITE_API_BASE_URL (вкл. /api),
// напр. https://your-backend.example.com/api
const BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

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
  // Пропускаем interstitial-страницу бесплатного ngrok (иначе вместо JSON придёт HTML).
  headers.set("ngrok-skip-browser-warning", "true");
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
  if (res.status === 204) return undefined as T; // нет тела (DELETE)
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

  getTasks: (period: TaskPeriod, date?: string) =>
    request<{ tasks: TaskDto[] }>(`/tasks?period=${period}${date ? `&date=${date}` : ""}`),
  planDay: (body: PlanDayRequest) =>
    request<{ tasks: TaskDto[] }>("/tasks/plan", { method: "POST", body: JSON.stringify(body) }),
  createTask: (body: CreateTaskRequest) =>
    request<{ task: TaskDto }>("/tasks", { method: "POST", body: JSON.stringify(body) }),
  updateTask: (id: string, body: UpdateTaskRequest) =>
    request<{ task: TaskDto }>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteTask: (id: string) => request<void>(`/tasks/${id}`, { method: "DELETE" }),
  setTaskStatus: (id: string, status: TaskDto["status"]) =>
    request<{ task: TaskDto }>(`/tasks/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  addSubtask: (taskId: string, title: string) =>
    request<{ subtask: SubtaskDto }>(`/tasks/${taskId}/subtasks`, {
      method: "POST",
      body: JSON.stringify({ title }),
    }),
  updateSubtask: (id: string, body: { title?: string; isDone?: boolean }) =>
    request<{ subtask: SubtaskDto }>(`/subtasks/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteSubtask: (id: string) => request<void>(`/subtasks/${id}`, { method: "DELETE" }),

  getHabits: () => request<{ habits: HabitDto[] }>("/habits"),
  createHabit: (body: CreateHabitRequest) =>
    request<{ habit: HabitDto }>("/habits", { method: "POST", body: JSON.stringify(body) }),
  updateHabit: (id: string, body: CreateHabitRequest) =>
    request<{ habit: HabitDto }>(`/habits/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  completeHabit: (id: string) =>
    request<{ habit: HabitDto }>(`/habits/${id}/complete`, { method: "POST" }),
  uncompleteHabit: (id: string) =>
    request<{ habit: HabitDto }>(`/habits/${id}/complete`, { method: "DELETE" }),
  deleteHabit: (id: string) => request<void>(`/habits/${id}`, { method: "DELETE" }),

  getAchievements: () => request<{ achievements: AchievementDto[] }>("/achievements"),

  getSkills: () => request<{ skills: SkillDto[] }>("/skills"),
  getSkillRoadmap: () => request<{ roadmap: SkillTemplateDto[] }>("/skills/roadmap"),
  addSkill: (body: CreateSkillRequest) =>
    request<{ skill: SkillDto }>("/skills", { method: "POST", body: JSON.stringify(body) }),

  getLeaderboard: (limit?: number, offset?: number) => {
    const q = new URLSearchParams();
    if (limit !== undefined) q.set("limit", String(limit));
    if (offset !== undefined) q.set("offset", String(offset));
    const qs = q.toString();
    return request<LeaderboardResponse>(`/leaderboard${qs ? `?${qs}` : ""}`);
  },
};
