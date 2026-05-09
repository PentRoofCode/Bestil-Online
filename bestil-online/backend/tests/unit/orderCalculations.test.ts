import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";

// Mirror the calculation logic from orders.service.ts
function calculateOrderTotals(
  items: { price: string; quantity: number; optionExtras: number[] }[],
  deliveryFee: string,
  vatRate: number,
  commissionRate: string,
) {
  let subtotal = new Decimal(0);

  for (const item of items) {
    const optionExtra = item.optionExtras.reduce((s, v) => s.plus(v), new Decimal(0));
    const unitPrice = new Decimal(item.price).plus(optionExtra);
    subtotal = subtotal.plus(unitPrice.mul(item.quantity));
  }

  const delivery = new Decimal(deliveryFee);
  const tax = subtotal.mul(vatRate).toDecimalPlaces(2);
  const commission = subtotal.mul(commissionRate).toDecimalPlaces(2);
  const payout = subtotal.minus(commission).toDecimalPlaces(2);
  const total = subtotal.plus(delivery).plus(tax).toDecimalPlaces(2);

  return { subtotal, tax, commission, payout, total, delivery };
}

describe("order total calculations", () => {
  it("computes subtotal correctly for simple items", () => {
    const { subtotal } = calculateOrderTotals(
      [{ price: "89.00", quantity: 2, optionExtras: [] }],
      "0",
      0.25,
      "0.15",
    );
    expect(subtotal.toFixed(2)).toBe("178.00");
  });

  it("adds option price modifiers to unit price", () => {
    const { subtotal } = calculateOrderTotals(
      [{ price: "109.00", quantity: 1, optionExtras: [30] }],
      "0",
      0.25,
      "0.15",
    );
    expect(subtotal.toFixed(2)).toBe("139.00");
  });

  it("adds delivery fee to total", () => {
    const { total } = calculateOrderTotals(
      [{ price: "89.00", quantity: 1, optionExtras: [] }],
      "29.00",
      0.25,
      "0.15",
    );
    // subtotal=89, tax=89*0.25=22.25, delivery=29 → total=140.25
    expect(total.toFixed(2)).toBe("140.25");
  });

  it("applies 25% VAT on subtotal (not including delivery)", () => {
    const { tax, subtotal } = calculateOrderTotals(
      [{ price: "100.00", quantity: 1, optionExtras: [] }],
      "20.00",
      0.25,
      "0.15",
    );
    expect(subtotal.toFixed(2)).toBe("100.00");
    expect(tax.toFixed(2)).toBe("25.00");
  });

  it("computes commission and restaurant payout", () => {
    const { commission, payout, subtotal } = calculateOrderTotals(
      [{ price: "100.00", quantity: 1, optionExtras: [] }],
      "0",
      0.25,
      "0.15",
    );
    expect(commission.toFixed(2)).toBe("15.00");
    expect(payout.toFixed(2)).toBe("85.00");
    expect(subtotal.plus(0).toFixed(2)).toBe("100.00");
  });

  it("handles multiple items and multiple options", () => {
    const { subtotal } = calculateOrderTotals(
      [
        { price: "89.00", quantity: 2, optionExtras: [10] },  // (89+10)*2 = 198
        { price: "119.00", quantity: 1, optionExtras: [] },    // 119
      ],
      "0",
      0.25,
      "0.15",
    );
    expect(subtotal.toFixed(2)).toBe("317.00");
  });

  it("uses Decimal arithmetic — no floating-point drift", () => {
    const { total } = calculateOrderTotals(
      [{ price: "33.33", quantity: 3, optionExtras: [] }],
      "0",
      0.25,
      "0.15",
    );
    // 33.33*3 = 99.99; tax = 99.99*0.25 = 24.9975 → rounded = 25.00; total = 124.99
    expect(total.toFixed(2)).toBe("124.99");
  });
});
