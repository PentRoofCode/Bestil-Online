import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";

export class MenuManagerPO {
  constructor(private readonly page: Page) {}

  async goto(restaurantId: string): Promise<void> {
    await this.page.goto(`/restaurant/${restaurantId}/menu`);
    await expect(this.page.getByRole("heading", { name: "Menu" })).toBeVisible({ timeout: 20_000 });
  }

  async createCategory(name: string): Promise<void> {
    await this.page.getByRole("button", { name: /Ny kategori/ }).click();
    // Label "Navn" has no htmlFor/id — target by input type
    await this.page.locator('input[type="text"]').fill(name);
    await this.page.getByRole("button", { name: /^Gem$/ }).click();
    await expect(this.page.locator("h2").filter({ hasText: name }).first()).toBeVisible();
  }

  async addItem(categoryName: string, item: { name: string; description?: string; price: number; vegetarian?: boolean }): Promise<void> {
    // Navigate from the category h2 → parent (flex row) → parent (card div)
    const heading = this.page.getByRole("heading", { name: new RegExp(`^${escape(categoryName)}$`), level: 2 });
    await heading.locator("xpath=../..").getByRole("button", { name: /Tilføj vare/ }).click();

    // Labels "Navn" and "Beskrivelse" have no htmlFor/id — target by element type
    await this.page.locator('input[type="text"]').fill(item.name);
    if (item.description) await this.page.locator('textarea').fill(item.description);
    // Label "Pris (kr)" is unassociated; target the number input directly
    await this.page.locator('input[type="number"]').fill(String(item.price));
    if (item.vegetarian) await this.page.getByLabel("Vegetarisk").check();
    await this.page.getByRole("button", { name: /^Gem$/ }).click();
    await expect(this.page.locator("li").filter({ hasText: item.name }).first()).toBeVisible();
  }

  async toggleAvailability(itemName: string): Promise<void> {
    const row = this.page.locator("li").filter({ hasText: itemName }).first();
    await row.locator("button[title*='Sæt']").click();
  }

  async editItemPrice(itemName: string, newPrice: number): Promise<void> {
    const row = this.page.locator("li").filter({ hasText: itemName }).first();
    await row.locator("button[title='Rediger vare']").click();
    // Label "Pris (kr)" is unassociated; target the number input directly
    await this.page.locator('input[type="number"]').fill(String(newPrice));
    await this.page.getByRole("button", { name: /^Gem$/ }).click();
  }

  async deleteCategory(name: string): Promise<void> {
    this.page.once("dialog", (d) => d.accept());
    // Navigate from h2 → parent (flex row) → parent (card div), find the unique delete button
    const heading = this.page.getByRole("heading", { name: new RegExp(`^${escape(name)}$`), level: 2 });
    await heading.locator("xpath=../..").locator("button[title='Slet kategori']").click();
  }

  async deleteItem(itemName: string): Promise<void> {
    this.page.once("dialog", (d) => d.accept());
    const row = this.page.locator("li").filter({ hasText: itemName }).first();
    await row.locator("button[title='Slet vare']").click();
  }

  errorBox(): Locator {
    return this.page.locator("text=/Fejl ved indlæsning af menu/");
  }
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
