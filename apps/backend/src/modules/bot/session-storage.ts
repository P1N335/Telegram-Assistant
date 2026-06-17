import { Prisma, type PrismaClient } from "@tpc/database";
import type { StorageAdapter } from "grammy";

/**
 * Хранилище сессий grammY в PostgreSQL (таблица BotSession).
 * В отличие от in-memory, переживает рестарт и работает при нескольких инстансах бота.
 */
export class PrismaSessionStorage<T> implements StorageAdapter<T> {
  constructor(private readonly prisma: PrismaClient) {}

  async read(key: string): Promise<T | undefined> {
    const row = await this.prisma.botSession.findUnique({ where: { key } });
    return row ? (row.data as T) : undefined;
  }

  async write(key: string, value: T): Promise<void> {
    const data = value as unknown as Prisma.InputJsonValue;
    await this.prisma.botSession.upsert({
      where: { key },
      create: { key, data },
      update: { data },
    });
  }

  async delete(key: string): Promise<void> {
    await this.prisma.botSession.delete({ where: { key } }).catch(() => undefined);
  }
}
