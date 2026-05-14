import { Router } from "express";
import { menusController } from "./menus.controller";
import { authenticate } from "@/middleware/auth.middleware";
import { requireRole } from "@/middleware/role.middleware";
import { validate } from "@/middleware/validate.middleware";
import {
  createCategorySchema,
  updateCategorySchema,
  createMenuItemSchema,
  updateMenuItemSchema,
  createOptionGroupSchema,
  availabilitySchema,
} from "./menus.schemas";

const router = Router({ mergeParams: true });

const ownerAuth = [authenticate, requireRole("RESTAURANT_OWNER", "ADMIN", "SUPER_ADMIN")];

router.get("/", menusController.getMenu);
router.get("/manage", ...ownerAuth, menusController.getMenuForOwner);
router.post("/categories", ...ownerAuth, validate(createCategorySchema), menusController.createCategory);
router.patch("/categories/:id", ...ownerAuth, validate(updateCategorySchema), menusController.updateCategory);
router.delete("/categories/:id", ...ownerAuth, menusController.deleteCategory);
router.post("/items", ...ownerAuth, validate(createMenuItemSchema), menusController.createItem);
router.patch("/items/:id", ...ownerAuth, validate(updateMenuItemSchema), menusController.updateItem);
router.patch("/items/:id/availability", ...ownerAuth, validate(availabilitySchema), menusController.setAvailability);
router.delete("/items/:id", ...ownerAuth, menusController.deleteItem);
router.post("/items/:id/option-groups", ...ownerAuth, validate(createOptionGroupSchema), menusController.createOptionGroup);

export default router;
