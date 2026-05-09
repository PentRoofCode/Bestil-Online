import { describe, it, expect } from "vitest";
import type { OrderStatus } from "@prisma/client";

// Mirror TRANSITIONS from orders.service.ts
const TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PENDING_PAYMENT: ["PAYMENT_FAILED", "PENDING_CONFIRMATION"],
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

describe("order status transitions", () => {
  it("allows PENDING_PAYMENT → PENDING_CONFIRMATION", () => {
    expect(canTransition("PENDING_PAYMENT", "PENDING_CONFIRMATION")).toBe(true);
  });

  it("allows PENDING_PAYMENT → PAYMENT_FAILED", () => {
    expect(canTransition("PENDING_PAYMENT", "PAYMENT_FAILED")).toBe(true);
  });

  it("allows full happy-path progression", () => {
    const path: OrderStatus[] = [
      "PENDING_PAYMENT",
      "PENDING_CONFIRMATION",
      "CONFIRMED",
      "PREPARING",
      "READY_FOR_PICKUP",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
    ];
    for (let i = 0; i < path.length - 1; i++) {
      expect(canTransition(path[i], path[i + 1])).toBe(true);
    }
  });

  it("blocks skipping a step (CONFIRMED → READY_FOR_PICKUP)", () => {
    expect(canTransition("CONFIRMED", "READY_FOR_PICKUP")).toBe(false);
  });

  it("blocks backward transitions (PREPARING → PENDING_CONFIRMATION)", () => {
    expect(canTransition("PREPARING", "PENDING_CONFIRMATION")).toBe(false);
  });

  it("allows cancellation from PENDING_CONFIRMATION", () => {
    expect(canTransition("PENDING_CONFIRMATION", "CANCELLED")).toBe(true);
  });

  it("allows cancellation from CONFIRMED", () => {
    expect(canTransition("CONFIRMED", "CANCELLED")).toBe(true);
  });

  it("blocks cancellation once OUT_FOR_DELIVERY", () => {
    expect(canTransition("OUT_FOR_DELIVERY", "CANCELLED")).toBe(false);
  });

  it("allows CANCELLED → REFUNDED (for post-payment cancellations)", () => {
    expect(canTransition("CANCELLED", "REFUNDED")).toBe(true);
  });

  it("allows DELIVERED → REFUNDED (admin edge case)", () => {
    expect(canTransition("DELIVERED", "REFUNDED")).toBe(true);
  });

  it("blocks PAYMENT_FAILED from any further transition except none defined", () => {
    expect(canTransition("PAYMENT_FAILED", "PENDING_CONFIRMATION")).toBe(false);
    expect(canTransition("PAYMENT_FAILED", "CANCELLED")).toBe(false);
  });

  it("blocks REFUNDED from any transition", () => {
    expect(canTransition("REFUNDED", "CANCELLED")).toBe(false);
    expect(canTransition("REFUNDED", "DELIVERED")).toBe(false);
  });
});
