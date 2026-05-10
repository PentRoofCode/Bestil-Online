import { z } from "zod";

const selectedOptionSchema = z.object({
  groupName: z.string(),
  optionName: z.string(),
  priceModifier: z.number(),
});

const orderItemSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().min(1),
  selectedOptions: z.array(selectedOptionSchema).optional().default([]),
  specialInstructions: z.string().max(500).optional(),
});

export const createOrderSchema = z.object({
  restaurantId: z.string().uuid(),
  deliveryAddressId: z.string().uuid(),
  items: z.array(orderItemSchema).min(1),
  specialInstructions: z.string().max(1000).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum([
    "PENDING_CONFIRMATION",
    "CONFIRMED",
    "PREPARING",
    "READY_FOR_PICKUP",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
    "REFUNDED",
  ]),
  cancellationReason: z.string().optional(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const listOrdersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
});

export type CreateOrderBody = z.infer<typeof createOrderSchema>;
export type UpdateStatusBody = z.infer<typeof updateStatusSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersSchema>;
