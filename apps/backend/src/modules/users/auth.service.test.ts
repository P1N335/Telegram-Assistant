import crypto from "node:crypto";
import { describe, it, expect } from "vitest";
import { AuthService } from "./auth.service.js";
import type { UserService } from "./user.service.js";

const TOKEN = "123456:TEST_BOT_TOKEN";
const JWT_SECRET = "test-secret-key-1234567890";

// userService не нужен для проверки подписи/токена — подставляем заглушку.
const svc = new AuthService(TOKEN, JWT_SECRET, "15m", {} as unknown as UserService);

function buildInitData(user: object, authDate: number): string {
  const params = new URLSearchParams();
  params.set("user", JSON.stringify(user));
  params.set("auth_date", String(authDate));
  params.set("query_id", "AAH");
  const dcs = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(TOKEN).digest();
  const hash = crypto.createHmac("sha256", secret).update(dcs).digest("hex");
  params.set("hash", hash);
  return params.toString();
}

describe("AuthService.validateInitData", () => {
  const now = Math.floor(Date.now() / 1000);

  it("принимает корректную подпись и возвращает пользователя", () => {
    const initData = buildInitData({ id: 42, first_name: "Ник", username: "p1n" }, now);
    const user = svc.validateInitData(initData);
    expect(user.id).toBe(42);
    expect(user.username).toBe("p1n");
  });

  it("отклоняет подделанную подпись", () => {
    const initData = buildInitData({ id: 42 }, now).replace(/hash=[a-f0-9]+/, "hash=deadbeef");
    expect(() => svc.validateInitData(initData)).toThrow();
  });

  it("отклоняет устаревший auth_date", () => {
    const initData = buildInitData({ id: 42 }, now - 60 * 60 * 48); // 48ч назад
    expect(() => svc.validateInitData(initData)).toThrow();
  });

  it("отклоняет initData без hash", () => {
    expect(() => svc.validateInitData("user=%7B%7D&auth_date=1")).toThrow();
  });
});

describe("AuthService JWT", () => {
  it("issue → verify сохраняет sub и tg", () => {
    const token = svc.issueToken("user-id-1", "42");
    const payload = svc.verifyToken(token);
    expect(payload.sub).toBe("user-id-1");
    expect(payload.tg).toBe("42");
  });

  it("отклоняет битый токен", () => {
    expect(() => svc.verifyToken("not.a.jwt")).toThrow();
  });
});
