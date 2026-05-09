import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { logger } from "@/utils/logger";
import { sendSuccess } from "@/utils/ApiResponse";
import { errorMiddleware } from "@/middleware/error.middleware";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
      credentials: true,
    }),
  );
  app.use(pinoHttp({ logger }));
  app.use(express.json());
  app.use(cookieParser());

  app.get("/api/v1/healthz", (_req, res) => {
    sendSuccess(res, { status: "ok" });
  });

  app.use(errorMiddleware);

  return app;
}
