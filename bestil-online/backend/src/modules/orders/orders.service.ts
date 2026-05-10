import Decimal from "decimal.js";
import { Prisma, OrderStatus } from "@prisma/client";
import { prisma } from "@/config/db";
import { ApiError } from "@/utils/ApiError";
import { generateOrderNumber } from "@/utils/orderNumber";
import { env } from "@/config/env";
import Stripe from "stripe";
import type { CreateOrderBody, UpdateStatusBody, ListOrdersQuery } from "./orders.schemas";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2025-02-24.acacia" as const });

// Allowed status transitions
const TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PENDING_PAYMENT: ["PAYMENT_FAILED", "PENDING_CONFIRMATION", "CANCELLED"],
  PENDING_CONFIRMATION: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY_FOR_PICKUP", "CANCELLED"],
  READY_FOR_PICKUP: ["OUT_FOR_DELIVERY", "DELIVERED"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: ["REFUNDED"],
};

function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

const CANCELLABLE_BY_CUSTOMER: OrderStatus[] = ["PENDING_PAYMENT", "PENDING_CONFIRMATION"];

export const ordersService = {
  async create(userId: string, data: CreateOrderBody) {
    const { restaurantId, deliveryAddressId, items, specialInstructions } = data;

    // Validate restaurant
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant || !restaurant.isActive || !restaurant.isVerified) {
      throw ApiError.notFound("Restaurant not available");
    }

    // Validate address belongs to user
    const address = await prisma.address.findFirst({ where: { id: deliveryAddressId, userId } });
    if (!address) throw ApiError.notFound("Delivery address not found");

    // Fetch and validate menu items
    const menuItemIds = items.map((i) => i.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, restaurantId, isAvailable: true },
    });

    if (menuItems.length !== menuItemIds.length) {
      throw ApiError.badRequest("One or more items are unavailable or not from this restaurant");
    }

    const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

    // Compute order totals
    let subtotal = new Decimal(0);
    const orderItems = items.map((item) => {
      const mi = menuItemMap.get(item.menuItemId)!;
      const optionExtra = item.selectedOptions.reduce(
        (sum, o) => sum.plus(o.priceModifier),
        new Decimal(0),
      );
      const unitPrice = new Decimal(mi.price.toString()).plus(optionExtra);
      const itemTotal = unitPrice.mul(item.quantity);
      subtotal = subtotal.plus(itemTotal);
      return {
        menuItemId: mi.id,
        menuItemName: mi.name,
        quantity: item.quantity,
        unitPrice: new Prisma.Decimal(unitPrice.toFixed(2)),
        itemTotal: new Prisma.Decimal(itemTotal.toFixed(2)),
        selectedOptions: item.selectedOptions.length ? (item.selectedOptions as Prisma.InputJsonValue) : Prisma.JsonNull,
        specialInstructions: item.specialInstructions,
      };
    });

    if (subtotal.lt(restaurant.minimumOrderAmount.toString())) {
      throw ApiError.badRequest(
        `Minimum order amount is ${restaurant.minimumOrderAmount} DKK`,
      );
    }

    const deliveryFee = new Decimal(restaurant.deliveryFee.toString());
    const vatRate = new Decimal(env.VAT_RATE);
    const tax = subtotal.mul(vatRate).toDecimalPlaces(2);
    const platformCommission = subtotal
      .mul(restaurant.commissionRate.toString())
      .toDecimalPlaces(2);
    const restaurantPayout = subtotal.minus(platformCommission).toDecimalPlaces(2);
    const totalAmount = subtotal.plus(deliveryFee).plus(tax).toDecimalPlaces(2);

    const orderNumber = generateOrderNumber();

    // Create Stripe PaymentIntent (amount in øre — smallest DKK unit)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount.toNumber() * 100),
      currency: env.STRIPE_CURRENCY.toLowerCase(),
      metadata: { orderNumber },
    });

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          restaurantId,
          deliveryAddressId,
          specialInstructions,
          subtotal: new Prisma.Decimal(subtotal.toFixed(2)),
          deliveryFee: new Prisma.Decimal(deliveryFee.toFixed(2)),
          tax: new Prisma.Decimal(tax.toFixed(2)),
          totalAmount: new Prisma.Decimal(totalAmount.toFixed(2)),
          platformCommission: new Prisma.Decimal(platformCommission.toFixed(2)),
          restaurantPayout: new Prisma.Decimal(restaurantPayout.toFixed(2)),
          items: { create: orderItems },
        },
        include: { items: true },
      });

      await tx.payment.create({
        data: {
          orderId: newOrder.id,
          amount: new Prisma.Decimal(totalAmount.toFixed(2)),
          method: "CARD",
          stripePaymentIntentId: paymentIntent.id,
        },
      });

      return newOrder;
    });

    return { order, clientSecret: paymentIntent.client_secret };
  },

  async listByUser(userId: string, query: ListOrdersQuery) {
    const { page, limit, status } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.OrderWhereInput = {
      userId,
      ...(status && { status: status as OrderStatus }),
    };
    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { restaurant: { select: { name: true, slug: true, logoUrl: true } }, items: true },
      }),
      prisma.order.count({ where }),
    ]);
    return { data, meta: { pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } };
  },

  async getById(id: string, userId: string, userRole: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        payment: true,
        restaurant: { select: { id: true, name: true, slug: true, ownerId: true, logoUrl: true } },
        deliveryAddress: true,
      },
    });
    if (!order) throw ApiError.notFound("Order not found");

    const isOwner = order.userId === userId;
    const isRestaurantOwner = order.restaurant.ownerId === userId;
    const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";
    if (!isOwner && !isRestaurantOwner && !isAdmin) throw ApiError.forbidden();

    return order;
  },

  async updateStatus(id: string, userId: string, userRole: string, data: UpdateStatusBody) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { restaurant: { select: { ownerId: true } }, payment: true },
    });
    if (!order) throw ApiError.notFound("Order not found");

    const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";
    const isRestaurantOwner = order.restaurant.ownerId === userId;
    if (!isAdmin && !isRestaurantOwner) throw ApiError.forbidden();

    if (!canTransition(order.status, data.status as OrderStatus)) {
      throw new ApiError(409, "CONFLICT", `Cannot transition from ${order.status} to ${data.status}`);
    }

    const now = new Date();
    const tsMap: Record<string, Prisma.OrderUpdateInput> = {
      CONFIRMED: { confirmedAt: now },
      PREPARING: { preparingAt: now },
      READY_FOR_PICKUP: { readyAt: now },
      DELIVERED: { deliveredAt: now },
      CANCELLED: { cancelledAt: now },
    };
    const timestamps: Prisma.OrderUpdateInput = tsMap[data.status] ?? {};

    return prisma.order.update({
      where: { id },
      data: {
        status: data.status as OrderStatus,
        cancellationReason: data.cancellationReason,
        ...timestamps,
      },
    });
  },

  async cancel(id: string, userId: string, userRole: string, reason?: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { payment: true },
    });
    if (!order) throw ApiError.notFound("Order not found");

    const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";
    const isOwner = order.userId === userId;
    if (!isOwner && !isAdmin) throw ApiError.forbidden();
    if (isOwner && !CANCELLABLE_BY_CUSTOMER.includes(order.status)) {
      throw new ApiError(409, "CONFLICT", "Order cannot be cancelled at this stage");
    }

    if (!canTransition(order.status, "CANCELLED")) {
      throw new ApiError(409, "CONFLICT", `Cannot cancel order in status ${order.status}`);
    }

    let finalStatus: "CANCELLED" | "REFUNDED" = "CANCELLED";

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: { status: "CANCELLED", cancelledAt: new Date(), cancellationReason: reason },
      });

      // Refund if payment completed
      if (order.payment?.stripePaymentIntentId && order.payment.status === "COMPLETED") {
        await stripe.refunds.create({ payment_intent: order.payment.stripePaymentIntentId });
        await tx.payment.update({
          where: { id: order.payment.id },
          data: { status: "REFUNDED", refundedAmount: order.payment.amount },
        });
        await tx.order.update({ where: { id }, data: { status: "REFUNDED" } });
        finalStatus = "REFUNDED";
      }
    });

    return prisma.order.findUnique({ where: { id } });
  },

  async listByRestaurant(restaurantId: string, userId: string, userRole: string, query: ListOrdersQuery) {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) throw ApiError.notFound("Restaurant not found");

    const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";
    if (!isAdmin && restaurant.ownerId !== userId) throw ApiError.forbidden();

    const { page, limit, status } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.OrderWhereInput = {
      restaurantId,
      ...(status && { status: status as OrderStatus }),
    };
    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { items: true, user: { select: { firstName: true, lastName: true, phone: true } } },
      }),
      prisma.order.count({ where }),
    ]);
    return { data, meta: { pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } };
  },
};
