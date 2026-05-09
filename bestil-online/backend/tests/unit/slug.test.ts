import { describe, it, expect, vi, beforeEach } from "vitest";

// Test the pure kebab-case logic without DB calls
function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-|-$/g, "");
}

describe("toKebabCase", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(toKebabCase("La Bella Italia")).toBe("la-bella-italia");
  });

  it("strips special characters", () => {
    expect(toKebabCase("Café & Bistro!")).toBe("caf-bistro");
  });

  it("collapses multiple spaces", () => {
    expect(toKebabCase("Burger   Byen")).toBe("burger-byen");
  });

  it("strips leading/trailing hyphens", () => {
    expect(toKebabCase("  Sushi Zen  ")).toBe("sushi-zen");
  });

  it("collapses double hyphens", () => {
    expect(toKebabCase("A--B")).toBe("a-b");
  });

  it("handles already kebab-case input", () => {
    expect(toKebabCase("pizza-palace")).toBe("pizza-palace");
  });

  it("handles single word", () => {
    expect(toKebabCase("Burgerbyen")).toBe("burgerbyen");
  });
});
