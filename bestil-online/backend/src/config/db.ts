import { PrismaClient } from "@prisma/client";
import { logger } from "@/utils/logger";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? [{ emit: "event", level: "query" }]
        : [],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

prisma.$on("query" as never, (e: { query: string; duration: number }) => {
  logger.debug({ query: e.query, duration: e.duration }, "DB query");
});
