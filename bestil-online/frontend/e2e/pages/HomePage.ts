import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class HomePagePO {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto("/");
    // wait for the restaurant grid or empty state
    await this.page.waitForLoadState("networkidle");
  }

  async searchByName(query: string): Promise<void> {
    const searchInput = this.page.getByPlaceholder(/Søg|Search/);
    if (await searchInput.count() > 0) {
      await searchInput.first().fill(query);
    }
  }

  async filterByCity(city: string): Promise<void> {
    const cityFilter = this.page.getByRole("combobox").or(this.page.getByPlaceholder(/by|city/i));
    if (await cityFilter.count() > 0) {
      await cityFilter.first().fill(city);
    }
  }

  async openRestaurant(slug: string): Promise<void> {
    const link = this.page.locator(`a[href*="/restaurants/${slug}"]`).first();
    if (await link.count() > 0) {
      await link.click();
    } else {
      await this.page.goto(`/restaurants/${slug}`);
    }
    await expect(this.page).toHaveURL(new RegExp(`/restaurants/${slug}`));
  }

  async restaurantVisible(name: string): Promise<boolean> {
    return await this.page.getByText(name, { exact: false }).first().isVisible().catch(() => false);
  }
}
