import type { Page, Locator } from "@playwright/test";

export class CartDrawerPO {
  constructor(private readonly page: Page) {}

  get drawer(): Locator {
    // The drawer contains "Din ordre" header
    return this.page.locator("div").filter({ has: this.page.getByText("Din ordre", { exact: true }) }).first();
  }

  async goToCheckout(): Promise<void> {
    await this.page.getByRole("button", { name: "Gå til betaling" }).click();
  }

  async incrementItem(itemName: string): Promise<void> {
    const row = this.page.locator("li").filter({ hasText: itemName }).first();
    await row.getByRole("button", { name: "+" }).click();
  }

  async decrementItem(itemName: string): Promise<void> {
    const row = this.page.locator("li").filter({ hasText: itemName }).first();
    await row.getByRole("button", { name: "−" }).click();
  }

  async removeItem(itemName: string): Promise<void> {
    const row = this.page.locator("li").filter({ hasText: itemName }).first();
    await row.locator("button:has(svg)").last().click();
  }

  async subtotal(): Promise<number> {
    const text = await this.page.locator("text=/Subtotal/").locator("..").innerText();
    const m = text.match(/(\d+)\s*kr/);
    return m ? Number(m[1]) : 0;
  }

  async clear(): Promise<void> {
    this.page.once("dialog", (d) => d.accept());
    await this.page.getByRole("button", { name: /Ryd kurv/ }).click();
  }
}
