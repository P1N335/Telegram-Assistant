/**
 * Token-bucket ограничитель скорости. Чистая логика без зависимостей и без БД —
 * учёт токенов инкапсулирован и тестируется изолированно (часы инъектируются).
 *
 * Зачем: Telegram отклоняет рассылку быстрее ~30 сообщений/с (429 + retry_after).
 * При тысячах пользователей почасовой тик пытается отправить пачку сразу — без
 * троттлинга это упирается в лимит и теряет сообщения. Бакет сглаживает поток:
 * допускает короткий всплеск до `burst`, затем держит устойчивые `ratePerSec`.
 *
 * Масштаб: ограничитель — in-process (один на процесс-отправитель). При нескольких
 * worker'ах суммарная скорость кратна числу процессов; для глобального лимита под
 * 100k+ это выносится в общий лимитер (Redis/BullMQ) — интерфейс `acquire()` при
 * этом не меняется. На текущем одно-процессном планировщике этого достаточно.
 */

export interface RateLimiterOptions {
  /** Устойчивая скорость выдачи токенов (операций в секунду). <=0 → без лимита. */
  ratePerSec: number;
  /** Ёмкость бакета (макс. всплеск). По умолчанию = ratePerSec. */
  burst?: number;
  /** Источник времени в мс (для тестов). По умолчанию Date.now. */
  now?: () => number;
}

export class RateLimiter {
  private readonly capacity: number;
  private readonly refillPerMs: number;
  private readonly now: () => number;
  private readonly unlimited: boolean;

  private tokens: number;
  private lastRefill: number;
  private readonly waiters: Array<() => void> = [];
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(opts: RateLimiterOptions) {
    const rate = Number.isFinite(opts.ratePerSec) ? opts.ratePerSec : 0;
    this.unlimited = rate <= 0;
    this.capacity = Math.max(1, Math.floor(opts.burst ?? rate) || 1);
    this.refillPerMs = rate / 1000;
    this.now = opts.now ?? Date.now;
    this.tokens = this.capacity;
    this.lastRefill = this.now();
  }

  /** Долить токены пропорционально прошедшему времени (но не выше ёмкости). */
  private refill(): void {
    const t = this.now();
    const elapsed = t - this.lastRefill;
    if (elapsed <= 0) return;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerMs);
    this.lastRefill = t;
  }

  /** Сколько мс ждать до появления хотя бы одного токена (0 — уже есть). */
  private msUntilToken(): number {
    if (this.tokens >= 1) return 0;
    if (this.refillPerMs <= 0) return Number.POSITIVE_INFINITY;
    return Math.ceil((1 - this.tokens) / this.refillPerMs);
  }

  /**
   * Запросить «право на отправку». Резолвится сразу при наличии токена, иначе —
   * становится в FIFO-очередь и резолвится по мере доливки. Порядок сохраняется.
   */
  acquire(): Promise<void> {
    if (this.unlimited) return Promise.resolve();
    return new Promise<void>((resolve) => {
      this.waiters.push(resolve);
      this.pump();
    });
  }

  /** Выдать токены ожидающим и при необходимости поставить будильник на доливку. */
  private pump(): void {
    this.refill();
    while (this.waiters.length > 0 && this.tokens >= 1) {
      this.tokens -= 1;
      const resolve = this.waiters.shift();
      resolve?.();
    }
    if (this.waiters.length > 0 && this.timer === null) {
      const wait = this.msUntilToken();
      const delay = Number.isFinite(wait) ? Math.max(1, wait) : 1000;
      this.timer = setTimeout(() => {
        this.timer = null;
        this.pump();
      }, delay);
      // Не держим event loop живым только ради будильника троттлинга.
      (this.timer as { unref?: () => void }).unref?.();
    }
  }
}
