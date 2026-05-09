import type { Request, Response } from "express";
import { paymentsService } from "./payments.service";
import { asyncHandler } from "@/utils/asyncHandler";
import { sendSuccess } from "@/utils/ApiResponse";
import { ApiError } from "@/utils/ApiError";

export const paymentsController = {
  webhook: asyncHandler(async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"] as string | undefined;
    if (!sig) throw ApiError.badRequest("Missing stripe-signature header");
    await paymentsService.handleWebhook(req.body as Buffer, sig);
    sendSuccess(res, { received: true });
  }),

  refund: asyncHandler(async (req: Request, res: Response) => {
    await paymentsService.refund(req.params.orderId as string);
    sendSuccess(res, null, 204);
  }),
};
