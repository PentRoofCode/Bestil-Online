import { Prisma, OrderStatus } from "@prisma/client";
import { prisma } from "@/config/db";
import { ApiError } from "@/utils/ApiError";
import type {
  ListRestaurantsAdminQuery,
  ListOrdersAdminQuery,
  ListUsersAdminQuery,
  RevenueReportQuery,
} from "./admin.schemas";

export const adminService = {
  async getStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      todayOrders,
      todayRevenue,
      monthOrders,
      monthRevenue,
      activeRestaurants,
      pendingRestaurants,
    ] = await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.order.aggregate({
        where: { createdAt: { gte: todayStart }, status: { notIn: ["CANCELLED", "PAYMENT_FAILED", "REFUNDED"] } },
        _sum: { totalAmount: true },
      }),
      prisma.order.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.order.aggregate({
        where: { createdAt: { gte: monthStart }, status: { notIn: ["CANCELLED", "PAYMENT_FAILED", "REFUNDED"] } },
        _sum: { totalAmount: true },
        _avg: { totalAmount: true },
      }),
      prisma.restaurant.count({ where: { isActive: true, isVerified: true } }),
      prisma.restaurant.count({ where: { isVerified: false } }),
    ]);

    return {
      today: {
        orders: todayOrders,
        revenue: Number(todayRevenue._sum.totalAmount ?? 0),
      },
      month: {
        orders: monthOrders,
        revenue: Number(monthRevenue._sum.totalAmount ?? 0),
        aov: Number(monthRevenue._avg.totalAmount ?? 0),
      },
      activeRestaurants,
      pendingRestaurants,
    };
  },

  async listRestaurants(query: ListRestaurantsAdminQuery) {
    const { status, page, limit } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.RestaurantWhereInput =
      status === "pending"
        ? { isVerified: false }
        : status === "verified"
          ? { isVerified: true }
          : {};

    const [data, total] = await Promise.all([
      prisma.restaurant.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isVerified: "asc" }, { createdAt: "desc" }],
        include: { owner: { select: { email: true, firstName: true, lastName: true } } },
      }),
      prisma.restaurant.count({ where }),
    ]);
    return { data, meta: { pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } };
  },

  async verifyRestaurant(id: string) {
    const restaurant = await prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) throw ApiError.notFound("Restaurant not found");
    return prisma.restaurant.update({ where: { id }, data: { isVerified: true, isActive: true } });
  },

  async suspendRestaurant(id: string, reason: string) {
    const restaurant = await prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) throw ApiError.notFound("Restaurant not found");
    return prisma.restaurant.update({
      where: { id },
      data: { isActive: false, description: restaurant.description ? `${restaurant.description} [Suspended: ${reason}]` : `[Suspended: ${reason}]` },
    });
  },

  async listOrders(query: ListOrdersAdminQuery) {
    const { page, limit, status, restaurantId } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.OrderWhereInput = {
      ...(status && { status: status as OrderStatus }),
      ...(restaurantId && { restaurantId }),
    };
    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          restaurant: { select: { name: true } },
          user: { select: { email: true, firstName: true, lastName: true } },
          payment: { select: { status: true, amount: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);
    return { data, meta: { pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } };
  },

  async listPayments(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prisma.payment.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { order: { select: { orderNumber: true, totalAmount: true } } },
      }),
      prisma.payment.count(),
    ]);
    return { data, meta: { pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } };
  },

  async listUsers(query: ListUsersAdminQuery) {
    const { page, limit, role } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.UserWhereInput = role ? { role: role as never } : {};
    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, email: true, firstName: true, lastName: true,
          role: true, isActive: true, emailVerified: true, createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);
    return { data, meta: { pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } };
  },

  async setUserStatus(id: string, isActive: boolean) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw ApiError.notFound("User not found");
    return prisma.user.update({ where: { id }, data: { isActive }, select: { id: true, isActive: true } });
  },

  async revenueReport(query: RevenueReportQuery) {
    const { from, to, groupBy } = query;
    const fromDate = new Date(from);
    const toDate = new Date(to);

    type Row = { period: Date; revenue: number; orders: bigint };

    let format: string;
    if (groupBy === "day") format = "YYYY-MM-DD";
    else if (groupBy === "week") format = "IYYY-IW";
    else format = "YYYY-MM";

    const rows = await prisma.$queryRaw<Row[]>`
      SELECT
        TO_CHAR(DATE_TRUNC(${groupBy}, "createdAt"), ${format}) AS period,
        SUM("totalAmount")::float AS revenue,
        COUNT(*) AS orders
      FROM "Order"
      WHERE "createdAt" >= ${fromDate}
        AND "createdAt" <= ${toDate}
        AND status NOT IN ('CANCELLED','PAYMENT_FAILED','REFUNDED')
      GROUP BY DATE_TRUNC(${groupBy}, "createdAt")
      ORDER BY DATE_TRUNC(${groupBy}, "createdAt") ASC
    `;

    return rows.map((r) => ({ period: r.period, revenue: r.revenue ?? 0, orders: Number(r.orders) }));
  },
};
