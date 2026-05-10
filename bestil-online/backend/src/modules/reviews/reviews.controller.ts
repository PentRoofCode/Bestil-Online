import type { Request, Response } from "express";
import { reviewsService } from "./reviews.service";
import { asyncHandler } from "@/utils/asyncHandler";
import { sendCreated, sendSuccess } from "@/utils/ApiResponse";

export const reviewsController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const review = await reviewsService.create(req.params.orderId as string, req.user!.id, req.body);
    sendCreated(res, review);
  }),

  listByRestaurant: asyncHandler(async (req: Request, res: Response) => {
    const result = await reviewsService.listByRestaurant(req.params.restaurantId as string, req.query as never);
    sendSuccess(res, result.data, 200, result.meta);
  }),
};
