/**
 * Абстракция платёжного провайдера (на будущее). Конкретный провайдер
 * (Telegram Stars / Stripe / …) реализует интерфейс, а его вебхук после
 * успешной оплаты вызовет EntitlementService.grant(userId, { until, provider, externalId }).
 * Сейчас платежи не подключены — выдача только через admin-эндпоинт.
 */
export interface CreateInvoiceInput {
  userId: string;
  plan: string;
  days: number;
}

export interface PaymentProvider {
  readonly name: string;
  createInvoice(input: CreateInvoiceInput): Promise<{ url?: string; payload: string }>;
}

export class NoopPaymentProvider implements PaymentProvider {
  readonly name = "noop";
  async createInvoice(): Promise<{ url?: string; payload: string }> {
    throw new Error("Платежи ещё не подключены");
  }
}
