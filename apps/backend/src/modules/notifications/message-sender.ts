import { Api, type InlineKeyboard } from "grammy";
import type { RateLimiter } from "../../shared/rate-limiter.js";

export interface OutboundOptions {
  reply_markup?: InlineKeyboard;
  parse_mode?: "HTML" | "MarkdownV2";
}

/** Абстракция отправки сообщений — отвязывает рассылку от конкретного бот-фреймворка. */
export interface IMessageSender {
  sendMessage(chatId: number, text: string, opts?: OutboundOptions): Promise<void>;
}

/** Реализация поверх grammY Api (можно слать без поднятия Bot/polling). */
export class GrammyApiSender implements IMessageSender {
  private readonly api: Api;
  constructor(botToken: string) {
    this.api = new Api(botToken);
  }
  async sendMessage(chatId: number, text: string, opts?: OutboundOptions): Promise<void> {
    await this.api.sendMessage(chatId, text, opts);
  }
}

/**
 * Декоратор: пропускает отправку через {@link RateLimiter}, удерживая глобальную
 * скорость под лимитом Telegram (~30 msg/s). Прозрачен для вызывающих — они видят
 * тот же `IMessageSender`. Применяется ко всем рассылкам (утро/вечер/напоминания/
 * ревайнд), т.к. весь трафик идёт через NotificationService → IMessageSender.
 */
export class RateLimitedSender implements IMessageSender {
  constructor(
    private readonly inner: IMessageSender,
    private readonly limiter: RateLimiter,
  ) {}
  async sendMessage(chatId: number, text: string, opts?: OutboundOptions): Promise<void> {
    await this.limiter.acquire();
    await this.inner.sendMessage(chatId, text, opts);
  }
}
