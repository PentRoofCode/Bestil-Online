import { Router } from "express";
import { adminController } from "./admin.controller";
import { authenticate } from "@/middleware/auth.middleware";
import { requireRole } from "@/middleware/role.middleware";
import { validate } from "@/middleware/validate.middleware";
import {
  listRestaurantsAdminSchema,
  suspendRestaurantSchema,
  listOrdersAdminSchema,
  listUsersAdminSchema,
  updateUserStatusSchema,
  revenueReportSchema,
} from "./admin.schemas";

const router = Router();

router.use(authenticate, requireRole("ADMIN", "SUPER_ADMIN"));

router.get("/stats/overview", adminController.getStats);

router.get("/restaurants", validate(listRestaurantsAdminSchema, "query"), adminController.listRestaurants);
router.post("/restaurants/:id/verify", adminController.verifyRestaurant);
router.post("/restaurants/:id/suspend", validate(suspendRestaurantSchema), adminController.suspendRestaurant);

router.get("/orders", validate(listOrdersAdminSchema, "query"), adminController.listOrders);
router.get("/payments", adminController.listPayments);

router.get("/users", validate(listUsersAdminSchema, "query"), adminController.listUsers);
router.patch(
  "/users/:id/status",
  requireRole("SUPER_ADMIN"),
  validate(updateUserStatusSchema),
  adminController.setUserStatus,
);

router.get("/reports/revenue", validate(revenueReportSchema, "query"), adminController.revenueReport);

export default router;
