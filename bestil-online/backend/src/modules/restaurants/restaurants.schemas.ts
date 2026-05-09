import { z } from "zod";

const openingHoursDay = z.object({
  open: z.string().regex(/^\d{2}:\d{2}$/),
  close: z.string().regex(/^\d{2}:\d{2}$/),
  closed: z.boolean().optional(),
});

const openingHoursSchema = z.object({
  mon: openingHoursDay,
  tue: openingHoursDay,
  wed: openingHoursDay,
  thu: openingHoursDay,
  fri: openingHoursDay,
  sat: openingHoursDay,
  sun: openingHoursDay,
});

export const createRestaurantSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(1000).optional(),
  phone: z.string().min(8),
  email: z.string().email(),
  street: z.string().min(1),
  city: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().default("DK"),
  cuisines: z.array(z.string()).min(1).max(10),
  openingHours: openingHoursSchema,
  deliveryTimeMin: z.number().int().min(0).default(30),
  deliveryFee: z.number().min(0).default(0),
  minimumOrderAmount: z.number().min(0).default(0),
});

export const updateRestaurantSchema = createRestaurantSchema
  .partial()
  .extend({ isActive: z.boolean().optional() });

export const listRestaurantsSchema = z.object({
  city: z.string().optional(),
  cuisine: z.string().optional(),
  search: z.string().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateRestaurantBody = z.infer<typeof createRestaurantSchema>;
export type UpdateRestaurantBody = z.infer<typeof updateRestaurantSchema>;
export type ListRestaurantsQuery = z.infer<typeof listRestaurantsSchema>;
