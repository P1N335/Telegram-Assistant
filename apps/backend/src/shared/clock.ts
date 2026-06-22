/**
 * Единый источник «текущего времени» процесса с настраиваемым сдвигом.
 * Нужен, если часы хоста идут неверно (например, спешат на 3 часа):
 * выставляем CLOCK_OFFSET_MINUTES=-180 и не правим логику по всему коду.
 * Правильное долгосрочное решение — корректные часы/NTP на хосте.
 */
let offsetMs = 0;

export function configureClock(offsetMinutes: number): void {
  offsetMs = offsetMinutes * 60_000;
}

/** Текущее время с учётом сдвига. Использовать вместо new Date() в доменной логике. */
export function now(): Date {
  return new Date(Date.now() + offsetMs);
}
