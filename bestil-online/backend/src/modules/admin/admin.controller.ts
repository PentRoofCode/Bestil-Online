import type { Request, Response } from "express";
import { adminService } from "./admin.service";
import { sendSuccess } from "@/utils/ApiResponse";
import { asyncHandler } from "@/utils/asyncHandler";

export const adminController = {
  getStats: asyncHandler(async (_req: Request, res: Response) => {
    const stats = await adminService.getStats();
    sendSuccess(res, stats);
  }),

  listRestaurants: asyncHandler(async (req: Request, res: Response) => {
    const result = await adminService.listRestaurants(req.query as never);
    sendSuccess(res, result.data, 200, result.meta);
  }),

  verifyRestaurant: asyncHandler(async (req: Request, res: Response) => {
    const restaurant = await adminService.verifyRestaurant(req.params.id as string);
    sendSuccess(res, restaurant);
  }),

  suspendRestaurant: asyncHandler(async (req: Request, res: Response) => {
    const restaurant = await adminService.suspendRestaurant(req.params.id as string, req.body.reason as string | undefined);
    sendSuccess(res, restaurant);
  }),

  reactivateRestaurant: asyncHandler(async (req: Request, res: Response) => {
    const restaurant = await adminService.reactivateRestaurant(req.params.id as string);
    sendSuccess(res, restaurant);
  }),

  listOrders: asyncHandler(async (req: Request, res: Response) => {
    const result = await adminService.listOrders(req.query as never);
    sendSuccess(res, result.data, 200, result.meta);
  }),

  listPayments: asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await adminService.listPayments(page, limit);
    sendSuccess(res, result.data, 200, result.meta);
  }),

  listUsers: asyncHandler(async (req: Request, res: Response) => {
    const result = await adminService.listUsers(req.query as never);
    sendSuccess(res, result.data, 200, result.meta);
  }),

  setUserStatus: asyncHandler(async (req: Request, res: Response) => {
    const user = await adminService.setUserStatus(req.params.id as string, req.body.isActive as boolean);
    sendSuccess(res, user);
  }),

  revenueReport: asyncHandler(async (req: Request, res: Response) => {
    const rows = await adminService.revenueReport(req.query as never);
    sendSuccess(res, rows);
  }),

  listReviews: asyncHandler(async (req: Request, res: Response) => {
    const result = await adminService.listReviews(req.query as never);
    sendSuccess(res, result.data, 200, result.meta);
  }),

  setReviewVisibility: asyncHandler(async (req: Request, res: Response) => {
    const review = await adminService.setReviewVisibility(
      req.params.id as string,
      req.body.isVisible as boolean,
    );
    sendSuccess(res, review);
  }),
};
