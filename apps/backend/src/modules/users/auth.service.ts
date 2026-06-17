import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { TelegramAuthResponse } from "@tpc/shared";
import { UnauthorizedError } from "../../shared/errors/index.js";
import { UserService } from "./user.service.js";

interface TelegramInitUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
}

export interface AuthTokenPayload {
  sub: string; // user.id
  tg: string; // telegramId
}

/**
 * Аутентификация Mini App: проверка подписи Telegram initData (HMAC по bot-token)
 * и выпуск краткоживущего JWT. Без валидной подписи доступ невозможен.
 */
export class AuthService {
  private static readonly MAX_AGE_SEC = 24 * 60 * 60; // окно свежести auth_date

  constructor(
    private readonly botToken: string,
    private readonly jwtSecret: string,
    private readonly jwtTtl: string,
    private readonly userService: UserService,
  ) {}

  async authenticate(initData: string): Promise<TelegramAuthResponse> {
    const tgUser = this.validateInitData(initData);
    const user = await this.userService.authenticateOrCreate({
      telegramId: BigInt(tgUser.id),
      username: tgUser.username ?? null,
      firstName: tgUser.first_name ?? null,
      lastName: tgUser.last_name ?? null,
      languageCode: tgUser.language_code ?? null,
    });
    return { token: this.issueToken(user.id, user.telegramId.toString()), user: UserService.toDto(user) };
  }

  /** Проверка целостности и подлинности initData. Бросает UnauthorizedError при провале. */
  validateInitData(initData: string): TelegramInitUser {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) throw new UnauthorizedError("initData без hash");
    params.delete("hash");

    const dataCheckString = [...params.entries()]
      .map(([k, v]) => `${k}=${v}`)
      .sort()
      .join("\n");

    const secretKey = crypto.createHmac("sha256", "WebAppData").update(this.botToken).digest();
    const computed = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

    // timingSafeEqual защищает от атак по времени сравнения.
    const a = Buffer.from(computed, "hex");
    const b = Buffer.from(hash, "hex");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new UnauthorizedError("Неверная подпись initData");
    }

    const authDate = Number(params.get("auth_date") ?? 0);
    if (!authDate || Date.now() / 1000 - authDate > AuthService.MAX_AGE_SEC) {
      throw new UnauthorizedError("initData устарел");
    }

    const rawUser = params.get("user");
    if (!rawUser) throw new UnauthorizedError("initData без пользователя");
    return JSON.parse(rawUser) as TelegramInitUser;
  }

  issueToken(userId: string, telegramId: string): string {
    const payload: AuthTokenPayload = { sub: userId, tg: telegramId };
    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtTtl } as jwt.SignOptions);
  }

  verifyToken(token: string): AuthTokenPayload {
    try {
      return jwt.verify(token, this.jwtSecret) as AuthTokenPayload;
    } catch {
      throw new UnauthorizedError("Невалидный или истёкший токен");
    }
  }
}
