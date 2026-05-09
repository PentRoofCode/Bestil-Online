import { describe, it, expect } from "vitest";
import { generateOrderNumber } from "@/utils/orderNumber";

describe("generateOrderNumber", () => {
  it("matches format BO-YYYYMMDD-XXXXXX", () => {
    const num = generateOrderNumber();
    expect(num).toMatch(/^BO-\d{8}-[A-Z0-9]{6}$/);
  });

  it("contains today's date", () => {
    const num = generateOrderNumber();
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    expect(num).toContain(`BO-${today}-`);
  });

  it("generates unique values", () => {
    const nums = Array.from({ length: 100 }, () => generateOrderNumber());
    const unique = new Set(nums);
    // With 36^6 space, collision probability is negligible
    expect(unique.size).toBeGreaterThan(95);
  });
});
