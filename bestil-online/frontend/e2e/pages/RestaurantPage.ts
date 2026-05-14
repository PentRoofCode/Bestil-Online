import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";

export class RestaurantPagePO {
  constructor(private readonly page: Page) {}

  async goto(slug: string): Promise<void> {
    await this.page.goto(`/restaurants/${slug}`);
    await expect(this.page.getByRole("heading", { level: 1 })).toBeVisible();
  }

  async openItem(name: string): Promise<void> {
    await this.page.getByRole("button", { name: new RegExp(`^\\s*${escapeRegex(name)}`, "i") }).first().click();
    await expect(this.page.locator("h3").filter({ hasText: name }).first()).toBeVisible();
  }

  /**
   * Add a simple item by name. The modal must be open via openItem first.
   * Assumes no required option groups.
   */
  async addOpenItemToCart(): Promise<void> {
    await this.page.getByRole("button", { name: /^Tilføj —/ }).click();
  }

  async selectOption(groupName: string, optionName: string): Promise<void> {
    // Find the label that has the option name; clicking it toggles the input.
    await this.page.getByRole("dialog").getByText(groupName, { exact: false }).waitFor({ state: "visible" }).catch(() => {});
    // Use label text matching to find the right option line.
    const optionLabel = this.page.locator("label").filter({ hasText: optionName }).first();
    await optionLabel.click();
  }

  async setQuantity(qty: number): Promise<void> {
    // The modal has − and + buttons around the qty display.
    // Click + qty-1 times relative to default 1, or − to decrement.
    if (qty <= 0) return;
    const incButton = this.page.getByRole("button", { name: "+", exact: true }).first();
    const decButton = this.page.getByRole("button", { name: "−", exact: true }).first();
    // Read current value
    const current = await this.page.locator("span.min-w-\\[1\\.5rem\\]").innerText().catch(() => "1");
    let curr = Number(current) || 1;
    while (curr < qty) {
      await incButton.click();
      curr += 1;
    }
    while (curr > qty) {
      await decButton.click();
      curr -= 1;
    }
  }

  async closeItemModal(): Promise<void> {
    await this.page.getByRole("button", { name: /^Luk$/ }).click();
  }

  get conflictDialog(): Locator {
    return this.page.getByRole("dialog", { name: /Start ny ordre/ });
  }

  async confirmCartSwitch(): Promise<void> {
    await this.page.getByRole("button", { name: "Ryd kurv og tilføj" }).click();
  }

  async cancelCartSwitch(): Promise<void> {
    await this.page.getByRole("button", { name: "Annullér" }).click();
  }

  async openCart(): Promise<void> {
    await this.page.getByRole("button", { name: /^Se kurv/ }).click();
  }

  get cartCountBadge(): Locator {
    return this.page.locator("button", { hasText: /^Se kurv \(\d+\)$/ });
  }

  async cartCount(): Promise<number> {
    const btn = this.cartCountBadge;
    if (!(await btn.isVisible().catch(() => false))) return 0;
    const text = await btn.innerText();
    const m = text.match(/\((\d+)\)/);
    return m ? Number(m[1]) : 0;
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
