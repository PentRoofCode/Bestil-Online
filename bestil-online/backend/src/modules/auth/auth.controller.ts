import type { Request, Response } from "express";
import { authService } from "./auth.service";
import { sendSuccess, sendCreated } from "@/utils/ApiResponse";
import { asyncHandler } from "@/utils/asyncHandler";
import { env } from "@/config/env";

const COOKIE_NAME = "refreshToken";
const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  domain: env.COOKIE_DOMAIN,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.register(req.body);
    sendCreated(res, user);
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const { accessToken, refreshToken, user } = await authService.login(req.body);
    res.cookie(COOKIE_NAME, refreshToken, cookieOptions);
    sendSuccess(res, { accessToken, user });
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies[COOKIE_NAME] as string | undefined;
    if (token) await authService.logout(token);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: 0 });
    sendSuccess(res, null, 204);
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies[COOKIE_NAME] as string | undefined;
    if (!token) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "No refresh token" },
      });
    }
    const { accessToken, refreshToken } = await authService.refresh(token);
    res.cookie(COOKIE_NAME, refreshToken, cookieOptions);
    sendSuccess(res, { accessToken });
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.me(req.user!.id);
    sendSuccess(res, user);
  }),

  verifyEmail: asyncHandler(async (req: Request, res: Response) => {
    const token = req.query.token as string | undefined;
    if (!token) return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Missing token" } });
    await authService.verifyEmail(token);
    sendSuccess(res, { verified: true });
  }),

  forgotPassword: asyncHandler(async (req: Request, res: Response) => {
    await authService.forgotPassword(req.body);
    sendSuccess(res, { sent: true });
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    await authService.resetPassword(req.body);
    sendSuccess(res, { reset: true });
  }),

  changePassword: asyncHandler(async (req: Request, res: Response) => {
    await authService.changePassword(req.user!.id, req.body);
    sendSuccess(res, null, 204);
  }),
};
