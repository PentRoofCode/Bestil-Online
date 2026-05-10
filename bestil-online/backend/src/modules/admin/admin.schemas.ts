import { z } from "zod";

export const listRestaurantsAdminSchema = z.object({
  status: z.enum(["pending", "verified", "all"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const suspendRestaurantSchema = z.object({
  reason: z.string().min(1),
});

export const listOrdersAdminSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  restaurantId: z.string().optional(),
});

export const listUsersAdminSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: z.string().optional(),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export const revenueReportSchema = z.object({
  from: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  to: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  groupBy: z.enum(["day", "week", "month"]).default("day"),
});

export type ListRestaurantsAdminQuery = z.infer<typeof listRestaurantsAdminSchema>;
export type SuspendRestaurantBody = z.infer<typeof suspendRestaurantSchema>;
export type ListOrdersAdminQuery = z.infer<typeof listOrdersAdminSchema>;
export type ListUsersAdminQuery = z.infer<typeof listUsersAdminSchema>;
export type UpdateUserStatusBody = z.infer<typeof updateUserStatusSchema>;
export type RevenueReportQuery = z.infer<typeof revenueReportSchema>;
