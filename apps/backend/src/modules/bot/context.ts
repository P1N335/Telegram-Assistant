import type { Context, SessionFlavor } from "grammy";

export interface ReflectionAnswers {
  howWasDay: string;
  summary: string;
  goodThings: string;
  difficulties: string;
  rating: number;
}

export interface SessionData {
  /** Активный пошаговый диалог вечерней рефлексии. */
  reflection?: {
    step: number;
    answers: Partial<ReflectionAnswers>;
  };
}

export function initialSession(): SessionData {
  return {};
}

export type BotContext = Context & SessionFlavor<SessionData>;
