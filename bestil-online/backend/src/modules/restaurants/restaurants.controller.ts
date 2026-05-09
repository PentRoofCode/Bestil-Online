import type { Request, Response } from "express";
import { restaurantsService } from "./restaurants.service";
import { asyncHandler } from "@/utils/asyncHandler";
import { sendSuccess, sendCreated } from "@/utils/ApiResponse";

export const restaurantsController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await restaurantsService.list(req.query as never);
    sendSuccess(res, result.data, 200, result.meta);
  }),

  getBySlug: asyncHandler(async (req: Request, res: Response) => {
    const restaurant = await restaurantsService.getBySlug(req.params.slug as string);
    sendSuccess(res, restaurant);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const restaurant = await restaurantsService.create(req.user!.id, req.body);
    sendCreated(res, restaurant);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const restaurant = await restaurantsService.update(
      req.params.id as string,
      req.user!.id,
      req.user!.role,
      req.body,
    );
    sendSuccess(res, restaurant);
  }),

  getOwned: asyncHandler(async (req: Request, res: Response) => {
    const restaurants = await restaurantsService.getOwned(req.user!.id);
    sendSuccess(res, restaurants);
  }),
};
