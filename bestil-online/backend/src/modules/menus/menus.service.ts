import { Prisma } from "@prisma/client";
import { prisma } from "@/config/db";
import { redis } from "@/config/redis";
import { ApiError } from "@/utils/ApiError";
import type {
  CreateCategoryBody,
  UpdateCategoryBody,
  CreateMenuItemBody,
  UpdateMenuItemBody,
  CreateOptionGroupBody,
} from "./menus.schemas";

const MENU_TTL = 300; // 5 min

function menuKey(restaurantId: string) {
  return `menu:${restaurantId}`;
}

async function invalidateMenuCache(restaurantId: string) {
  await redis.del(menuKey(restaurantId));
}

async function assertOwnership(restaurantId: string, userId: string, role: string) {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) throw ApiError.notFound("Restaurant not found");
  if (role !== "ADMIN" && role !== "SUPER_ADMIN" && restaurant.ownerId !== userId) {
    throw ApiError.forbidden("You do not own this restaurant");
  }
  return restaurant;
}

export const menusService = {
  async getFullMenu(restaurantId: string) {
    const cached = await redis.get(menuKey(restaurantId));
    if (cached) return JSON.parse(cached) as unknown;

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { isActive: true, isVerified: true },
    });
    if (!restaurant) throw ApiError.notFound("Restaurant not found");

    const categories = await prisma.menuCategory.findMany({
      where: { restaurantId, isActive: true },
      orderBy: { displayOrder: "asc" },
      include: {
        menuItems: {
          where: { isAvailable: true },
          orderBy: { displayOrder: "asc" },
          include: {
            optionGroups: {
              orderBy: { displayOrder: "asc" },
              include: { options: { orderBy: { displayOrder: "asc" } } },
            },
          },
        },
      },
    });

    await redis.set(menuKey(restaurantId), JSON.stringify(categories), "EX", MENU_TTL);
    return categories;
  },

  async createCategory(restaurantId: string, userId: string, role: string, data: CreateCategoryBody) {
    await assertOwnership(restaurantId, userId, role);
    const category = await prisma.menuCategory.create({
      data: { ...data, restaurantId },
    });
    await invalidateMenuCache(restaurantId);
    return category;
  },

  async updateCategory(
    restaurantId: string,
    categoryId: string,
    userId: string,
    role: string,
    data: UpdateCategoryBody,
  ) {
    await assertOwnership(restaurantId, userId, role);
    const category = await prisma.menuCategory.findFirst({
      where: { id: categoryId, restaurantId },
    });
    if (!category) throw ApiError.notFound("Category not found");
    const updated = await prisma.menuCategory.update({ where: { id: categoryId }, data });
    await invalidateMenuCache(restaurantId);
    return updated;
  },

  async deleteCategory(restaurantId: string, categoryId: string, userId: string, role: string) {
    await assertOwnership(restaurantId, userId, role);
    const category = await prisma.menuCategory.findFirst({
      where: { id: categoryId, restaurantId },
      include: { _count: { select: { menuItems: true } } },
    });
    if (!category) throw ApiError.notFound("Category not found");
    if (category._count.menuItems > 0) {
      await prisma.menuCategory.update({ where: { id: categoryId }, data: { isActive: false } });
    } else {
      await prisma.menuCategory.delete({ where: { id: categoryId } });
    }
    await invalidateMenuCache(restaurantId);
  },

  async createMenuItem(restaurantId: string, userId: string, role: string, data: CreateMenuItemBody) {
    await assertOwnership(restaurantId, userId, role);
    const category = await prisma.menuCategory.findFirst({
      where: { id: data.categoryId, restaurantId },
    });
    if (!category) throw ApiError.notFound("Category not found in this restaurant");
    const { price, ...rest } = data;
    const item = await prisma.menuItem.create({
      data: { ...rest, restaurantId, price: new Prisma.Decimal(price) },
    });
    await invalidateMenuCache(restaurantId);
    return item;
  },

  async updateMenuItem(
    restaurantId: string,
    itemId: string,
    userId: string,
    role: string,
    data: UpdateMenuItemBody,
  ) {
    await assertOwnership(restaurantId, userId, role);
    const item = await prisma.menuItem.findFirst({ where: { id: itemId, restaurantId } });
    if (!item) throw ApiError.notFound("Menu item not found");
    const { price, ...rest } = data;
    const updated = await prisma.menuItem.update({
      where: { id: itemId },
      data: { ...rest, ...(price !== undefined && { price: new Prisma.Decimal(price) }) },
    });
    await invalidateMenuCache(restaurantId);
    return updated;
  },

  async setAvailability(
    restaurantId: string,
    itemId: string,
    userId: string,
    role: string,
    isAvailable: boolean,
  ) {
    await assertOwnership(restaurantId, userId, role);
    const item = await prisma.menuItem.findFirst({ where: { id: itemId, restaurantId } });
    if (!item) throw ApiError.notFound("Menu item not found");
    const updated = await prisma.menuItem.update({ where: { id: itemId }, data: { isAvailable } });
    await invalidateMenuCache(restaurantId);
    return updated;
  },

  async deleteMenuItem(restaurantId: string, itemId: string, userId: string, role: string) {
    await assertOwnership(restaurantId, userId, role);
    const item = await prisma.menuItem.findFirst({ where: { id: itemId, restaurantId } });
    if (!item) throw ApiError.notFound("Menu item not found");
    await prisma.menuItem.delete({ where: { id: itemId } });
    await invalidateMenuCache(restaurantId);
  },

  async createOptionGroup(
    restaurantId: string,
    itemId: string,
    userId: string,
    role: string,
    data: CreateOptionGroupBody,
  ) {
    await assertOwnership(restaurantId, userId, role);
    const item = await prisma.menuItem.findFirst({ where: { id: itemId, restaurantId } });
    if (!item) throw ApiError.notFound("Menu item not found");
    const { options, ...groupData } = data;
    const group = await prisma.menuItemOptionGroup.create({
      data: {
        ...groupData,
        menuItemId: itemId,
        options: {
          create: options.map((o) => ({
            name: o.name,
            priceModifier: new Prisma.Decimal(o.priceModifier),
            displayOrder: o.displayOrder,
          })),
        },
      },
      include: { options: true },
    });
    await invalidateMenuCache(restaurantId);
    return group;
  },
};
