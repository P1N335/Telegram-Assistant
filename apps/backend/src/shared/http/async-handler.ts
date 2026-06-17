import type { Request, Response, NextFunction, RequestHandler } from "express";

/** Оборачивает async-контроллер, перенаправляя reject в next() → error-handler. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
