import type { Request, Response } from "express";
import { ordersService } from "./orders.service";
import { asyncHandler } from "@/utils/asyncHandler";
import { sendSuccess, sendCreated } from "@/utils/ApiResponse";

export const ordersController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const result = await ordersService.create(req.user!.id, req.body);
    sendCreated(res, result);
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await ordersService.listByUser(req.user!.id, req.query as never);
    sendSuccess(res, result.data, 200, result.meta);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const order = await ordersService.getById(req.params.id as string, req.user!.id, req.user!.role);
    sendSuccess(res, order);
  }),

  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    const order = await ordersService.updateStatus(
      req.params.id as string,
      req.user!.id,
      req.user!.role,
      req.body,
    );
    sendSuccess(res, order);
  }),

  cancel: asyncHandler(async (req: Request, res: Response) => {
    await ordersService.cancel(req.params.id as string, req.user!.id, req.user!.role, req.body?.reason);
    sendSuccess(res, null, 204);
  }),

  listByRestaurant: asyncHandler(async (req: Request, res: Response) => {
    const result = await ordersService.listByRestaurant(
      req.params.id as string,
      req.user!.id,
      req.user!.role,
      req.query as never,
    );
    sendSuccess(res, result.data, 200, result.meta);
  }),
};
