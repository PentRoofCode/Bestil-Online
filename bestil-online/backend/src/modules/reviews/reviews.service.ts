import { prisma } from "@/config/db";
import { ApiError } from "@/utils/ApiError";
import type { CreateReviewBody, ListReviewsQuery } from "./reviews.schemas";

type TxClient = Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

async function recomputeRestaurantRating(tx: TxClient, restaurantId: string) {
  const stats = await tx.review.aggregate({
    where: { restaurantId, isVisible: true },
    _avg: { rating: true },
    _count: { id: true },
  });
  await tx.restaurant.update({
    where: { id: restaurantId },
    data: {
      avgRating: stats._avg.rating ?? 0,
      reviewCount: stats._count.id,
    },
  });
}

export const reviewsService = {
  async create(orderId: string, userId: string, data: CreateReviewBody) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { review: true },
    });

    if (!order) throw ApiError.notFound("Order not found");
    if (order.userId !== userId) throw ApiError.forbidden();
    if (order.status !== "DELIVERED") {
      throw new ApiError(422, "VALIDATION_ERROR", "Order must be delivered before reviewing");
    }
    if (order.review) {
      throw ApiError.conflict("Order has already been reviewed");
    }

    return prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          orderId,
          userId,
          restaurantId: order.restaurantId,
          ...data,
        },
      });
      await recomputeRestaurantRating(tx as TxClient, order.restaurantId);
      return review;
    });
  },

  async listByRestaurant(restaurantId: string, query: ListReviewsQuery) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;
    const where = { restaurantId, isVisible: true };

    const [data, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { firstName: true, lastName: true } } },
      }),
      prisma.review.count({ where }),
    ]);

    return {
      data,
      meta: { pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
    };
  },
};

export { recomputeRestaurantRating };
