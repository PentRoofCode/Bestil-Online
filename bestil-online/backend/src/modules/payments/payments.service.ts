import { Prisma } from "@prisma/client";
import Stripe from "stripe";
import { prisma } from "@/config/db";
import { env } from "@/config/env";
import { logger } from "@/utils/logger";
import { ApiError } from "@/utils/ApiError";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-03-25.dahlia" as Stripe.LatestApiVersion,
});

export const paymentsService = {
  async handleWebhook(rawBody: Buffer, signature: string) {
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch {
      throw ApiError.badRequest("Webhook signature verification failed");
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      // We stored session.id in stripePaymentIntentId at order creation
      const payment = await prisma.payment.findUnique({
        where: { stripePaymentIntentId: session.id },
        include: { order: true },
      });
      if (!payment) {
        logger.warn({ sessionId: session.id }, "Webhook: payment not found");
        return;
      }
      if (payment.status === "COMPLETED") return; // idempotent

      // Update stripePaymentIntentId to the actual PaymentIntent ID so refunds work
      const paymentIntentId = typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
            ...(paymentIntentId && { stripePaymentIntentId: paymentIntentId }),
          },
        }),
        prisma.order.update({
          where: { id: payment.orderId },
          data: { status: "PENDING_CONFIRMATION" },
        }),
      ]);
      logger.info({ orderId: payment.orderId }, "Checkout session completed, order pending confirmation");
    }

    if (event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const payment = await prisma.payment.findUnique({
        where: { stripePaymentIntentId: session.id },
      });
      if (!payment || payment.status === "FAILED") return;

      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: { status: "FAILED", failureReason: "Payment failed" },
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
