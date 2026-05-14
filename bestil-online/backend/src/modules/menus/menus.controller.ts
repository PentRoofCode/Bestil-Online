import type { Request, Response } from "express";
import { menusService } from "./menus.service";
import { asyncHandler } from "@/utils/asyncHandler";
import { sendSuccess, sendCreated } from "@/utils/ApiResponse";

export const menusController = {
  getMenu: asyncHandler(async (req: Request, res: Response) => {
    const menu = await menusService.getFullMenu(req.params.restaurantId as string);
    sendSuccess(res, menu);
  }),

  getMenuForOwner: asyncHandler(async (req: Request, res: Response) => {
    const menu = await menusService.getFullMenuForOwner(
      req.params.restaurantId as string,
      req.user!.id,
      req.user!.role,
    );
    sendSuccess(res, menu);
  }),

  createCategory: asyncHandler(async (req: Request, res: Response) => {
    const cat = await menusService.createCategory(
      req.params.restaurantId as string,
      req.user!.id,
      req.user!.role,
      req.body,
    );
    sendCreated(res, cat);
  }),

  updateCategory: asyncHandler(async (req: Request, res: Response) => {
    const cat = await menusService.updateCategory(
      req.params.restaurantId as string,
      req.params.id as string,
      req.user!.id,
      req.user!.role,
      req.body,
    );
    sendSuccess(res, cat);
  }),

  deleteCategory: asyncHandler(async (req: Request, res: Response) => {
    await menusService.deleteCategory(
      req.params.restaurantId as string,
      req.params.id as string,
      req.user!.id,
      req.user!.role,
    );
    sendSuccess(res, null, 204);
  }),

  createItem: asyncHandler(async (req: Request, res: Response) => {
    const item = await menusService.createMenuItem(
      req.params.restaurantId as string,
      req.user!.id,
      req.user!.role,
      req.body,
    );
    sendCreated(res, item);
  }),

  updateItem: asyncHandler(async (req: Request, res: Response) => {
    const item = await menusService.updateMenuItem(
      req.params.restaurantId as string,
      req.params.id as string,
      req.user!.id,
      req.user!.role,
      req.body,
    );
    sendSuccess(res, item);
  }),

  setAvailability: asyncHandler(async (req: Request, res: Response) => {
    const item = await menusService.setAvailability(
      req.params.restaurantId as string,
      req.params.id as string,
      req.user!.id,
      req.user!.role,
      req.body.isAvailable,
    );
    sendSuccess(res, item);
  }),

  deleteItem: asyncHandler(async (req: Request, res: Response) => {
    await menusService.deleteMenuItem(
      req.params.restaurantId as string,
      req.params.id as string,
      req.user!.id,
      req.user!.role,
    );
    sendSuccess(res, null, 204);
  }),

  createOptionGroup: asyncHandler(async (req: Request, res: Response) => {
    const group = await menusService.createOptionGroup(
      req.params.restaurantId as string,
      req.params.id as string,
      req.user!.id,
      req.user!.role,
      req.body,
    );
    sendCreated(res, group);
  }),
};
