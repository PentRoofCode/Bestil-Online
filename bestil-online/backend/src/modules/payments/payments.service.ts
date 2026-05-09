import { Prisma } from "@prisma/client";
import Stripe from "stripe";
import { prisma } from "@/config/db";
import { env } from "@/config/env";
import { logger } from "@/utils/logger";
import { ApiError } from "@/utils/ApiError";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2025-02-24.acacia" as const });

export const paymentsService = {
  async handleWebhook(rawBody: Buffer, signature: string) {
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch {
      throw ApiError.badRequest("Webhook signature verification failed");
    }

    const pi = event.data.object as Stripe.PaymentIntent;

    if (event.type === "payment_intent.succeeded") {
      const payment = await prisma.payment.findUnique({
        where: { stripePaymentIntentId: pi.id },
        include: { order: true },
      });
      if (!payment) {
        logger.warn({ piId: pi.id }, "Webhook: payment not found");
        return;
      }
      if (payment.status === "COMPLETED") return; // idempotent

      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: { status: "COMPLETED", completedAt: new Date(), stripeChargeId: pi.latest_charge as string },
        }),
        prisma.order.update({
          where: { id: payment.orderId },
          data: { status: "PENDING_CONFIRMATION" },
        }),
      ]);
      logger.info({ orderId: payment.orderId }, "Payment succeeded, order pending confirmation");
    }

    if (event.type === "payment_intent.payment_failed") {
      const payment = await prisma.payment.findUnique({
        where: { stripePaymentIntentId: pi.id },
      });
      if (!payment || payment.status === "FAILED") return;

      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "FAILED",
            failureReason: pi.last_payment_error?.message ?? "Payment failed",
          },
        }),
        prisma.order.update({ where: { id: payment.orderId }, data: { status: "PAYMENT_FAILED" } }),
      ]);
    }
  },

  async refund(orderId: string) {
    const payment = await prisma.payment.findUnique({ where: { orderId } });
    if (!payment?.stripePaymentIntentId) throw ApiError.notFound("Payment not found");
    if (payment.status !== "COMPLETED") {
      throw new ApiError(409, "CONFLICT", "Payment is not completed");
    }

    const refund = await stripe.refunds.create({ payment_intent: payment.stripePaymentIntentId });
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: "REFUNDED", refundedAmount: new Prisma.Decimal(refund.amount / 100) },
      }),
      prisma.order.update({ where: { id: orderId }, data: { status: "REFUNDED" } }),
    ]);
  },
};
