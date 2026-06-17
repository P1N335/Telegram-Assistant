import { Api, type InlineKeyboard } from "grammy";

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
