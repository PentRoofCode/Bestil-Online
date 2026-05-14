import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class AdminDashboardPO {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto("/admin/dashboard");
    await this.page.waitForLoadState("networkidle");
    await expect(this.page.getByRole("heading", { level: 1 })).toBeVisible();
  }

  async gotoRestaurants(): Promise<void> {
    await this.page.goto("/admin/restaurants");
    await this.page.waitForLoadState("networkidle");
  }

  async gotoOrders(): Promise<void> {
    await this.page.goto("/admin/orders");
    await this.page.waitForLoadState("networkidle");
  }

  async gotoUsers(): Promise<void> {
    await this.page.goto("/admin/users");
    await this.page.waitForLoadState("networkidle");
  }

  async gotoReports(): Promise<void> {
    await this.page.goto("/admin/reports");
    await this.page.waitForLoadState("networkidle");
  }

  async gotoReviews(): Promise<void> {
    await this.page.goto("/admin/reviews");
    await this.page.waitForLoadState("networkidle");
  }

  async verifyRestaurant(restaurantName: string): Promise<void> {
    const row = this.page.locator("tr,div").filter({ hasText: restaurantName }).first();
    await row.getByRole("button", { name: /Verificér|Verificer/i }).click();
  }

  async suspendRestaurant(restaurantName: string, reason: string): Promise<void> {
    const row = this.page.locator("tr,div").filter({ hasText: restaurantName }).first();
    await row.getByRole("button", { name: /Suspender|Suspendér/i }).click();
    const reasonInput = this.page.getByLabel(/Begrundelse|Reason/i);
    if (await reasonInput.count() > 0) {
      await reasonInput.fill(reason);
      await this.page.getByRole("button", { name: /Bekræft|Suspend/i }).click();
    }
  }
}
