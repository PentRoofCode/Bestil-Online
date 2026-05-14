import { timingSafeEqual } from "crypto";
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "@/config/env";
import { ApiError } from "@/utils/ApiError";

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export function adminOrApiKey(req: Request, _res: Response, next: NextFunction) {
  const apiKey = req.headers["x-api-key"] as string | undefined;
  if (apiKey) {
    const keyBuf = Buffer.from(apiKey);
    const envBuf = Buffer.from(env.API_KEY ?? "");
    const keyInvalid =
      !env.API_KEY ||
      keyBuf.length !== envBuf.length ||
      !timingSafeEqual(keyBuf, envBuf);
    if (keyInvalid) {
      return next(ApiError.unauthorized("Invalid API key"));
    }
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next(ApiError.unauthorized("Authentication required"));
  }

  try {
    const payload = jwt.verify(authHeader.slice(7), env.JWT_SECRET) as JwtPayload;
    if (payload.role !== "ADMIN" && payload.role !== "SUPER_ADMIN") {
      return next(ApiError.forbidden());
    }
    req.user = { id: payload.sub, email: payload.email, role: payload.role as never };
    return next();
  } catch {
    return next(ApiError.unauthorized("Invalid token"));
  }
}
