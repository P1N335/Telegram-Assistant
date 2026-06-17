/**
 * @tpc/database — обёртка над Prisma Client.
 * Реэкспортирует типизированный клиент и singleton-инстанс,
 * чтобы backend-модули зависели от пакета, а не от пути к сгенерированному клиенту.
 *
 * Реальная схема и клиент появятся на Этапе 2 (prisma/schema.prisma).
 */

export * from "@prisma/client";

import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient | undefined;

/** Singleton PrismaClient (один пул соединений на процесс). */
export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}
