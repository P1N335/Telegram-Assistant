import type { Logger } from "../logger.js";
import type { DomainEvent, DomainEventType, EventOf } from "./domain-events.js";

type AnyHandler = (event: DomainEvent) => void | Promise<void>;

/**
 * Простой типизированный in-process event-bus.
 * Обработчики изолированы: падение одного не ломает остальные и не валит запрос.
 * Интерфейс стабилен — при росте заменяется на брокер (Redis/Kafka) без правки источников.
 */
export class EventBus {
  private readonly handlers = new Map<DomainEventType, AnyHandler[]>();

  constructor(private readonly logger: Logger) {}

  on<T extends DomainEventType>(type: T, handler: (event: EventOf<T>) => void | Promise<void>): void {
    const list = this.handlers.get(type) ?? [];
    list.push(handler as AnyHandler);
    this.handlers.set(type, list);
  }

  async emit(event: DomainEvent): Promise<void> {
    const list = this.handlers.get(event.type);
    if (!list) return;
    for (const handler of list) {
      try {
        await handler(event);
      } catch (err) {
        this.logger.error({ err, type: event.type }, "Сбой обработчика события");
      }
    }
  }
}
