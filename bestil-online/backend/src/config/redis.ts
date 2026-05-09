import Redis from "ioredis";
import { logger } from "@/utils/logger";

export const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
});

redis.on("error", (err) => {
  logger.error({ err }, "Redis error");
});

redis.on("connect", () => {
  logger.info("Redis connected");
});
