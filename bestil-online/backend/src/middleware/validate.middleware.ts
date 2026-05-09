import type { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

type Target = "body" | "query" | "params";

export function validate(schema: ZodSchema, target: Target = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      return next({
        statusCode: 400,
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: result.error.flatten().fieldErrors,
        name: "ApiError",
      });
    }
    req[target] = result.data;
    return next();
  };
}
