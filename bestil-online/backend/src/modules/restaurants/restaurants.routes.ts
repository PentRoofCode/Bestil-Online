import { Router } from "express";
import { restaurantsController } from "./restaurants.controller";
import { authenticate } from "@/middleware/auth.middleware";
import { requireRole } from "@/middleware/role.middleware";
import { validate } from "@/middleware/validate.middleware";
import {
  createRestaurantSchema,
  updateRestaurantSchema,
  listRestaurantsSchema,
} from "./restaurants.schemas";

const router = Router();

router.get("/", validate(listRestaurantsSchema, "query"), restaurantsController.list);
router.get("/me", authenticate, requireRole("RESTAURANT_OWNER"), restaurantsController.getOwned);
router.get("/:slug", restaurantsController.getBySlug);
router.post(
  "/",
  authenticate,
  requireRole("RESTAURANT_OWNER"),
  validate(createRestaurantSchema),
  restaurantsController.create,
);
router.patch(
  "/:id",
  authenticate,
  requireRole("RESTAURANT_OWNER", "ADMIN", "SUPER_ADMIN"),
  validate(updateRestaurantSchema),
  restaurantsController.update,
);

export default router;
