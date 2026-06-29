/**
 * Утилиты асинхронной обработки под масштаб. Чистые, без зависимостей и без БД —
 * тестируются изолированно. Используются планировщиком, чтобы дорогие операции
 * (вызовы LLM) не блокировали почасовой тик и не валили его при единичных сбоях.
 */

/** Сигнал истечения таймаута (отличим от прочих ошибок). */
export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Операция не уложилась в ${ms} мс`);
    this.name = "TimeoutError";
  }
}

/**
 * Ограничивает время ожидания промиса. По истечении `ms` промис-обёртка
 * отклоняется TimeoutError (исходный промис не отменяется — fetch завершится
 * в фоне, его результат игнорируется). Таймер всегда очищается.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  if (!Number.isFinite(ms) || ms <= 0) return promise; // 0/невалид → без лимита
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * Применяет асинхронную функцию к элементам с ограничением параллелизма.
 * Сохраняет порядок результатов. `limit<=1` → последовательная обработка.
 * Под 100k+: не даём одному тику открыть тысячи одновременных соединений к LLM/БД.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const n = items.length;
  if (n === 0) return [];
  const max = Math.max(1, Math.min(Math.floor(limit) || 1, n));
  const results = new Array<R>(n);
  let next = 0;

  async function worker(): Promise<void> {
    while (true) {
      const i = next++;
      if (i >= n) return;
      results[i] = await fn(items[i] as T, i);
    }
  }

  await Promise.all(Array.from({ length: max }, () => worker()));
  return results;
}
