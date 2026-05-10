import { Router } from "express";
import { reviewsController } from "./reviews.controller";
import { authenticate } from "@/middleware/auth.middleware";
import { requireRole } from "@/middleware/role.middleware";
import { validate } from "@/middleware/validate.middleware";
import { createReviewSchema, listReviewsSchema } from "./reviews.schemas";

const router = Router();

// POST /orders/:orderId/review
router.post(
  "/orders/:orderId/review",
  authenticate,
  requireRole("CUSTOMER"),
  validate(createReviewSchema),
  reviewsController.create,
);

// GET /restaurants/:restaurantId/reviews
router.get(
  "/restaurants/:restaurantId/reviews",
  validate(listReviewsSchema, "query"),
  reviewsController.listByRestaurant,
);

export default router;
