import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { logger } from "@/utils/logger";
import { sendSuccess } from "@/utils/ApiResponse";
import { errorMiddleware } from "@/middleware/error.middleware";
import authRoutes from "@/modules/auth/auth.routes";
import restaurantsRoutes from "@/modules/restaurants/restaurants.routes";
import menusRoutes from "@/modules/menus/menus.routes";
import ordersRoutes from "@/modules/orders/orders.routes";
import paymentsRoutes from "@/modules/payments/payments.routes";
import usersRoutes from "@/modules/users/users.routes";
import adminRoutes from "@/modules/admin/admin.routes";
import { ordersController } from "@/modules/orders/orders.controller";
import { authenticate } from "@/middleware/auth.middleware";
import { requireRole } from "@/middleware/role.middleware";
import { validate } from "@/middleware/validate.middleware";
import { listOrdersSchema } from "@/modules/orders/orders.schemas";

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
  app.use(cookieParser());

  // Stripe webhook needs raw body — mount before express.json()
  app.use(
    "/api/v1/payments/webhook",
    express.raw({ type: "application/json" }),
  );

  app.use(express.json());

  // Health check
  app.get("/api/v1/healthz", (_req, res) => {
    sendSuccess(res, { status: "ok" });
  });

  // Routes
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/restaurants", restaurantsRoutes);
  app.use("/api/v1/restaurants/:restaurantId/menu", menusRoutes);
  app.use("/api/v1/orders", ordersRoutes);
  app.use("/api/v1/payments", paymentsRoutes);
  app.use("/api/v1/users", usersRoutes);
  app.use("/api/v1/admin", adminRoutes);

  // Restaurant order queue
  app.get(
    "/api/v1/restaurants/:id/orders",
    authenticate,
    requireRole("RESTAURANT_OWNER", "ADMIN", "SUPER_ADMIN"),
    validate(listOrdersSchema, "query"),
    ordersController.listByRestaurant,
  );

  app.use(errorMiddleware);

  return app;
}
