import { Prisma } from "@prisma/client";
import { prisma } from "@/config/db";
import { ApiError } from "@/utils/ApiError";
import { generateSlug } from "@/utils/slug";
import type {
  CreateRestaurantBody,
  UpdateRestaurantBody,
  ListRestaurantsQuery,
} from "./restaurants.schemas";

export const restaurantsService = {
  async list(query: ListRestaurantsQuery) {
    const { city, cuisine, search, minRating, page, limit } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.RestaurantWhereInput = {
      isActive: true,
      isVerified: true,
      ...(city && { city: { contains: city, mode: "insensitive" } }),
      ...(cuisine && { cuisines: { has: cuisine } }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { city: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(minRating && { avgRating: { gte: minRating } }),
    };

    const [data, total] = await Promise.all([
      prisma.restaurant.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ avgRating: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          logoUrl: true,
          bannerUrl: true,
          city: true,
          cuisines: true,
          avgRating: true,
          reviewCount: true,
          deliveryTimeMin: true,
          deliveryFee: true,
          minimumOrderAmount: true,
        },
      }),
      prisma.restaurant.count({ where }),
    ]);

    return { data, meta: { pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } };
  },

  async getBySlug(slug: string) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
      include: {
        categories: {
          where: { isActive: true },
          orderBy: { displayOrder: "asc" },
          include: {
            menuItems: {
              where: { isAvailable: true },
              orderBy: { displayOrder: "asc" },
              include: { optionGroups: { orderBy: { displayOrder: "asc" }, include: { options: { orderBy: { displayOrder: "asc" } } } } },
            },
          },
        },
      },
    });
    if (!restaurant || !restaurant.isActive || !restaurant.isVerified) {
      throw ApiError.notFound("Restaurant not found");
    }
    return restaurant;
  },

  async create(ownerId: string, data: CreateRestaurantBody) {
    const slug = await generateSlug(data.name);
    return prisma.restaurant.create({
      data: {
        ...data,
        slug,
        ownerId,
        deliveryFee: new Prisma.Decimal(data.deliveryFee),
        minimumOrderAmount: new Prisma.Decimal(data.minimumOrderAmount),
        openingHours: data.openingHours as Prisma.InputJsonValue,
      },
    });
  },

  async update(id: string, requesterId: string, requesterRole: string, data: UpdateRestaurantBody) {
    const restaurant = await prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) throw ApiError.notFound("Restaurant not found");
    if (requesterRole !== "ADMIN" && requesterRole !== "SUPER_ADMIN" && restaurant.ownerId !== requesterId) {
      throw ApiError.forbidden("You do not own this restaurant");
    }
    const { deliveryFee, minimumOrderAmount, openingHours, ...rest } = data;
    return prisma.restaurant.update({
      where: { id },
      data: {
        ...rest,
        ...(deliveryFee !== undefined && { deliveryFee: new Prisma.Decimal(deliveryFee) }),
        ...(minimumOrderAmount !== undefined && { minimumOrderAmount: new Prisma.Decimal(minimumOrderAmount) }),
        ...(openingHours && { openingHours: openingHours as Prisma.InputJsonValue }),
      },
    });
  },

  async getOwned(ownerId: string) {
    return prisma.restaurant.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
    });
  },

  async getById(id: string) {
    const restaurant = await prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) throw ApiError.notFound("Restaurant not found");
    return restaurant;
  },
};
