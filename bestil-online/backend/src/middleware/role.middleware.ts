import type { Request, Response, NextFunction } from "express";
import type { UserRole } from "@prisma/client";
import { ApiError } from "@/utils/ApiError";

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role as UserRole)) {
      return next(ApiError.forbidden("Insufficient permissions"));
    }
    return next();
  };
}
