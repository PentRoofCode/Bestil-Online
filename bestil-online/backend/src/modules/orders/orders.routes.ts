import { Router } from "express";
import { ordersController } from "./orders.controller";
import { authenticate } from "@/middleware/auth.middleware";
import { requireRole } from "@/middleware/role.middleware";
import { validate } from "@/middleware/validate.middleware";
import { createOrderSchema, updateStatusSchema, cancelOrderSchema, listOrdersSchema } from "./orders.schemas";

const router = Router();

router.post("/", authenticate, requireRole("CUSTOMER"), validate(createOrderSchema), ordersController.create);
router.get("/", authenticate, requireRole("CUSTOMER"), validate(listOrdersSchema, "query"), ordersController.list);
router.get("/:id", authenticate, ordersController.getById);
router.patch(
  "/:id/status",
  authenticate,
  requireRole("RESTAURANT_OWNER", "ADMIN", "SUPER_ADMIN"),
  validate(updateStatusSchema),
  ordersController.updateStatus,
);
router.post("/:id/cancel", authenticate, validate(cancelOrderSchema), ordersController.cancel);

export default router;
