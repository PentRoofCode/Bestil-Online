import { Router } from "express";
import { adminController } from "./admin.controller";
import { authenticate } from "@/middleware/auth.middleware";
import { requireRole } from "@/middleware/role.middleware";
import { validate } from "@/middleware/validate.middleware";
import { adminOrApiKey } from "@/middleware/apiKey.middleware";
import {
  listRestaurantsAdminSchema,
  suspendRestaurantSchema,
  listOrdersAdminSchema,
  listUsersAdminSchema,
  updateUserStatusSchema,
  revenueReportSchema,
  listReviewsAdminSchema,
  updateReviewVisibilitySchema,
} from "./admin.schemas";

const router = Router();

// PATCH /reviews/:id/visibility — must be defined BEFORE router.use(authenticate)
// because it accepts either an admin JWT OR an external X-Api-Key header.
// Placing it first ensures the router-level auth middleware doesn't intercept API-key requests.
router.patch(
  "/reviews/:id/visibility",
  adminOrApiKey,
  validate(updateReviewVisibilitySchema),
  adminController.setReviewVisibility,
);

// All remaining routes require a valid admin JWT
router.use(authenticate, requireRole("ADMIN", "SUPER_ADMIN"));

router.get("/stats/overview", adminController.getStats);

router.get("/restaurants", validate(listRestaurantsAdminSchema, "query"), adminController.listRestaurants);
router.post("/restaurants/:id/verify", adminController.verifyRestaurant);
router.post("/restaurants/:id/suspend", validate(suspendRestaurantSchema), adminController.suspendRestaurant);
router.post("/restaurants/:id/reactivate", adminController.reactivateRestaurant);

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

router.get("/reviews", validate(listReviewsAdminSchema, "query"), adminController.listReviews);

export default router;
