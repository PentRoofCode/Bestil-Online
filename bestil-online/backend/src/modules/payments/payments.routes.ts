import { Router } from "express";
import { paymentsController } from "./payments.controller";
import { authenticate } from "@/middleware/auth.middleware";
import { requireRole } from "@/middleware/role.middleware";

const router = Router();

// Raw body is parsed in app.ts before this route
router.post("/webhook", paymentsController.webhook);
router.post("/:orderId/refund", authenticate, requireRole("ADMIN", "SUPER_ADMIN"), paymentsController.refund);

export default router;
