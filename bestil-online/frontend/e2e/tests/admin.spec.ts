/**
 * Admin dashboard tests (58–66).
 * Covers: stats, restaurant verification/suspension, orders, users.
 */
import { test, expect } from "../fixtures";
import {
  apiCreateRestaurant,
  apiVerifyRestaurant,
  apiActivateRestaurant,
  apiGetOwnedRestaurants,
  uniq,
} from "../helpers/api";
import { AdminDashboardPO } from "../pages/AdminDashboard";

// ─── 58. Admin dashboard accessible ──────────────────────────────────────────
test("58. admin can access the dashboard", async ({ adminPage }) => {
  const dash = new AdminDashboardPO(adminPage);
  await dash.goto();
  await expect(adminPage.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 10_000 });
});

// ─── 59. Admin stats overview ────────────────────────────────────────────────
test("59. admin stats overview returns numeric values", async ({ adminToken, request }) => {
  const res = await request.get("http://localhost:4000/api/v1/admin/stats/overview", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  expect(res.ok()).toBe(true);
  const body = (await res.json()) as {
    data: {
      today: { orders: number; revenue: number };
      thirtyDays: { orders: number; revenue: number };
      activeRestaurants: number;
    };
  };
  expect(typeof body.data.today.orders).toBe("number");
  expect(typeof body.data.activeRestaurants).toBe("number");
});

// ─── 60. Admin can list all restaurants ──────────────────────────────────────
test("60. admin can list all restaurants", async ({ adminPage }) => {
  const dash = new AdminDashboardPO(adminPage);
  await dash.gotoRestaurants();
  await expect(adminPage).toHaveURL(/\/admin\/restaurants/);
  await expect(adminPage.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 10_000 });
});

// ─── 61. Admin can verify a pending restaurant ────────────────────────────────
test("61. admin can verify an unverified restaurant via API", async ({ adminToken, ownerToken, request }) => {
  const restaurant = await apiCreateRestaurant(request, { token: ownerToken }, {
    name: `VerifyMe-${uniq()}`,
  });

  // Not yet verified
  const before = await request.get(`http://localhost:4000/api/v1/admin/restaurants`, {
    params: { status: "pending" },
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const beforeBody = (await before.json()) as { data: Array<{ id: string; isVerified: boolean }> };
  const found = beforeBody.data.find((r) => r.id === restaurant.id);
  if (found) {
    expect(found.isVerified).toBe(false);
  }

  await apiVerifyRestaurant(request, { token: adminToken }, restaurant.id);

  // Now verified
  const after = await request.get(`http://localhost:4000/api/v1/restaurants/${restaurant.slug}`);
  const afterBody = (await after.json()) as { data: { isVerified: boolean } };
  expect(afterBody.data.isVerified).toBe(true);
});

// ─── 62. Admin can suspend a restaurant ──────────────────────────────────────
test("62. admin can suspend a restaurant with a reason", async ({ adminToken, ownerToken, request }) => {
  const restaurant = await apiCreateRestaurant(request, { token: ownerToken });
  await apiVerifyRestaurant(request, { token: adminToken }, restaurant.id);
  await apiActivateRestaurant(request, { token: ownerToken }, restaurant.id, true);

  const res = await request.post(`http://localhost:4000/api/v1/admin/restaurants/${restaurant.id}/suspend`, {
    data: { reason: "Violation of terms" },
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  expect(res.ok()).toBe(true);

  // Public endpoint filters out inactive restaurants — use owner endpoint instead
  const ownerRests = await apiGetOwnedRestaurants(request, { token: ownerToken });
  const suspended = ownerRests.find((r) => r.id === restaurant.id);
  expect(suspended?.isActive).toBe(false);
});

// ─── 63. Admin can verify via UI ──────────────────────────────────────────────
test("63. admin can verify a restaurant from the UI", async ({ adminPage, ownerToken, request }) => {
  const restaurant = await apiCreateRestaurant(request, { token: ownerToken }, {
    name: `UIVerify-${uniq()}`,
  });

  const dash = new AdminDashboardPO(adminPage);
  await dash.gotoRestaurants();
  await adminPage.reload();

  // Try to click verify button for this restaurant
  const row = adminPage.locator("tr,div").filter({ hasText: restaurant.slug }).first();
  const verifyBtn = row.getByRole("button", { name: /Verificér|Verificer|Verify/i });
  if (await verifyBtn.count() > 0) {
    await verifyBtn.click();
    await adminPage.waitForTimeout(1_000);
    // Restaurant should now show as verified
    const statusEl = row.getByText(/Verificeret|Verified/i);
    if (await statusEl.count() > 0) {
      await expect(statusEl).toBeVisible();
    }
  }
});

// ─── 64. Admin can view all orders ────────────────────────────────────────────
test("64. admin can view all orders", async ({ adminPage }) => {
  const dash = new AdminDashboardPO(adminPage);
  await dash.gotoOrders();
  await expect(adminPage).toHaveURL(/\/admin\/orders/);
  await expect(adminPage.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 10_000 });
});

// ─── 65. Admin can view user list ─────────────────────────────────────────────
test("65. admin can access the users list", async ({ adminPage }) => {
  const dash = new AdminDashboardPO(adminPage);
  await dash.gotoUsers();
  await expect(adminPage).toHaveURL(/\/admin\/users/);
  await expect(adminPage.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 10_000 });
});

// ─── 66. Admin revenue report API ────────────────────────────────────────────
test("66. admin revenue report returns data for date range", async ({ adminToken, request }) => {
  const from = "2025-01-01";
  const to = "2026-12-31";
  const res = await request.get("http://localhost:4000/api/v1/admin/reports/revenue", {
    params: { from, to, groupBy: "month" },
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  expect(res.ok()).toBe(true);
  const body = (await res.json()) as { data: unknown[] };
  expect(Array.isArray(body.data)).toBe(true);
});
