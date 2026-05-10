import type { Request, Response, NextFunction } from "express";
import { redis } from "@/config/redis";

export function rateLimitByIp(maxRequests: number, windowSeconds: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip ?? "unknown";
    const key = `ratelimit:${ip}:${req.path}`;
    try {
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, windowSeconds);
      if (count > maxRequests) {
        res.status(429).json({
          success: false,
          error: { code: "RATE_LIMITED", message: "For mange forsøg. Prøv igen om lidt." },
        });
        return;
      }
    } catch {
      // Redis failure → don't block the request
    }
    next();
  };
}
