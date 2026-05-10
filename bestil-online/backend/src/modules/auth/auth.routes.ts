import { Router } from "express";
import { authController } from "./auth.controller";
import { validate } from "@/middleware/validate.middleware";
import { authenticate } from "@/middleware/auth.middleware";
import { rateLimitByIp } from "@/middleware/rateLimit.middleware";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "./auth.schemas";

const router = Router();

const authRateLimit = rateLimitByIp(5, 60);

router.post("/register", authRateLimit, validate(registerSchema), authController.register);
router.post("/login", authRateLimit, validate(loginSchema), authController.login);
router.post("/logout", authenticate, authController.logout);
router.post("/refresh", authController.refresh);
router.get("/me", authenticate, authController.me);

router.get("/verify-email", authController.verifyEmail);
router.post("/forgot-password", authRateLimit, validate(forgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), authController.resetPassword);
router.post("/change-password", authenticate, validate(changePasswordSchema), authController.changePassword);

export default router;
