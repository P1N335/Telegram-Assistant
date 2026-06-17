/** Доменные ошибки с HTTP-кодом. Маппятся в JSON единым error-handler'ом. */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string = "APP_ERROR",
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message = "Некорректные данные") {
    super(400, message, "VALIDATION");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Не авторизован") {
    super(401, message, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Доступ запрещён") {
    super(403, message, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Не найдено") {
    super(404, message, "NOT_FOUND");
  }
}
