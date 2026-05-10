import { z } from "zod";

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  foodRating: z.number().int().min(1).max(5).optional(),
  deliveryRating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(1000).optional(),
});

export const listReviewsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type CreateReviewBody = z.infer<typeof createReviewSchema>;
export type ListReviewsQuery = z.infer<typeof listReviewsSchema>;
