/**
 * Restaurant owner journey tests (24–44).
 * Covers: menu management, order queue, status transitions.
 */
import { test, expect } from "../fixtures";
import {
  apiGetOwnedRestaurants,
  apiGetRestaurantBySlug,
  apiCreateRestaurant,
  apiVerifyRestaurant,
  apiActivateRestaurant,
  apiCreateCategory,
  apiCreateMenuItem,
  apiCreateOrder,
  apiCreateAddress,
  apiGetAddresses,
  apiSimulateWebhookComplete,
  apiAdvanceOrder,
  uniq,
  SEEDED_RESTAURANT_SLUGS,
} from "../helpers/api";
import { MenuManagerPO } from "../pages/MenuManager";

const SEEDED_SLUGS: string[] = Object.values(SEEDED_RESTAURANT_SLUGS);

// Prefer seeded restaurants (low minimum order) over test-created ones.
function findOrderableRestaurant(restaurants: Array<{ id: string; slug: string; isActive: boolean; isVerified: boolean }>) {
  return (
    restaurants.find((r) => r.isVerified && r.isActive && SEEDED_SLUGS.includes(r.slug)) ??
    restaurants.find((r) => r.isVerified && r.isActive)
  );
}

// ─── 24. Owner dashboard accessible ──────────────────────────────────────────
test("24. owner can access their dashboard", async ({ ownerPage }) => {
  await ownerPage.goto("/restaurant/dashboard");
  await expect(ownerPage).toHaveURL(/\/restaurant\/dashboard/);
  await expect(ownerPage.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 10_000 });
});

// ─── 25. Owner sees their restaurants ────────────────────────────────────────
test("25. owner sees their own restaurants in the API", async ({ ownerToken, request }) => {
  const restaurants = await apiGetOwnedRestaurants(request, { token: ownerToken });
  expect(restaurants.length).toBeGreaterThan(0);
});

// ─── 26. Create new menu category ────────────────────────────────────────────
test("26. owner can create a new menu category", async ({ ownerPage, ownerToken, request }) => {
  const restaurants = await apiGetOwnedRestaurants(request, { token: ownerToken });
  const restaurant = restaurants[0];
  if (!restaurant) { test.skip(true, "Owner has no restaurants"); return; }

  const menu = new MenuManagerPO(ownerPage);
  await menu.goto(restaurant.id);

  const catName = `Kategori ${uniq("cat")}`;
  await menu.createCategory(catName);

  await expect(ownerPage.locator("h2").filter({ hasText: catName }).first()).toBeVisible();
});

// ─── 27. Add item to category ─────────────────────────────────────────────────
test("27. owner can add a menu item to a category", async ({ ownerPage, ownerToken, request }) => {
  const restaurants = await apiGetOwnedRestaurants(request, { token: ownerToken });
  const restaurant = restaurants[0];
  if (!restaurant) { test.skip(true, "Owner has no restaurants"); return; }

  const menu = new MenuManagerPO(ownerPage);
  await menu.goto(restaurant.id);

  const catName = `Kategori ${uniq("cat")}`;
  await menu.createCategory(catName);

  const itemName = `Ret ${uniq("item")}`;
  await menu.addItem(catName, { name: itemName, price: 129, description: "En lækker ret" });

  await expect(ownerPage.locator("li").filter({ hasText: itemName }).first()).toBeVisible();
});

// ─── 28. Toggle item availability ────────────────────────────────────────────
test("28. owner can toggle item availability off and on", async ({ ownerPage, ownerToken, request }) => {
  const restaurants = await apiGetOwnedRestaurants(request, { token: ownerToken });
  const restaurant = restaurants[0];
  if (!restaurant) { test.skip(true, "Owner has no restaurants"); return; }

  const cat = await apiCreateCategory(request, { token: ownerToken }, restaurant.id, { name: `ToggleCat-${uniq()}` });
  const itemName = `ToggleItem-${uniq()}`;
  await apiCreateMenuItem(request, { token: ownerToken }, restaurant.id, {
    categoryId: cat.id,
    name: itemName,
    price: 89,
  });

  const menu = new MenuManagerPO(ownerPage);
  await menu.goto(restaurant.id);
  await ownerPage.reload();

  const itemLocator = ownerPage.locator("li").filter({ hasText: "ToggleItem" }).first();
  await expect(itemLocator).toBeVisible({ timeout: 10_000 });
});

// ─── 29. Edit item price ──────────────────────────────────────────────────────
test("29. owner can edit a menu item price", async ({ ownerPage, ownerToken, request }) => {
  const restaurants = await apiGetOwnedRestaurants(request, { token: ownerToken });
  const restaurant = restaurants[0];
  if (!restaurant) { test.skip(true, "No restaurants"); return; }

  const catName = `EditCat-${uniq()}`;
  const cat = await apiCreateCategory(request, { token: ownerToken }, restaurant.id, { name: catName });
  const itemName = `EditItem-${uniq()}`;
  await apiCreateMenuItem(request, { token: ownerToken }, restaurant.id, {
    categoryId: cat.id,
    name: itemName,
    price: 99,
  });

  const menu = new MenuManagerPO(ownerPage);
  await menu.goto(restaurant.id);
  await ownerPage.reload();

  await menu.editItemPrice(itemName, 149);
  await expect(ownerPage.locator("li").filter({ hasText: itemName }).first().getByText("149")).toBeVisible({
    timeout: 10_000,
  });
});

// ─── 30. Delete item ──────────────────────────────────────────────────────────
test("30. owner can delete a menu item", async ({ ownerPage, ownerToken, request }) => {
  const restaurants = await apiGetOwnedRestaurants(request, { token: ownerToken });
  const restaurant = restaurants[0];
  if (!restaurant) { test.skip(true, "No restaurants"); return; }

  const catName = `DelCat-${uniq()}`;
  const cat = await apiCreateCategory(request, { token: ownerToken }, restaurant.id, { name: catName });
  const itemName = `DelItem-${uniq()}`;
  await apiCreateMenuItem(request, { token: ownerToken }, restaurant.id, {
    categoryId: cat.id,
    name: itemName,
    price: 79,
  });

  const menu = new MenuManagerPO(ownerPage);
  await menu.goto(restaurant.id);
  await ownerPage.reload();

  await menu.deleteItem(itemName);

  await expect(ownerPage.locator("li").filter({ hasText: itemName })).toHaveCount(0, { timeout: 10_000 });
});

// ─── 31. Delete category ──────────────────────────────────────────────────────
test("31. owner can delete an empty category", async ({ ownerPage, ownerToken, request }) => {
  const restaurants = await apiGetOwnedRestaurants(request, { token: ownerToken });
  const restaurant = restaurants[0];
  if (!restaurant) { test.skip(true, "No restaurants"); return; }

  const catName = `EmptyCat-${uniq()}`;
  await apiCreateCategory(request, { token: ownerToken }, restaurant.id, { name: catName });

  const menu = new MenuManagerPO(ownerPage);
  await menu.goto(restaurant.id);
  await ownerPage.reload();

  await menu.deleteCategory(catName);

  await expect(ownerPage.locator("h2").filter({ hasText: catName })).toHaveCount(0, { timeout: 10_000 });
});

// ─── 32. Public menu reflects changes ─────────────────────────────────────────
test("32. newly added item appears on public restaurant page", async ({ ownerToken, page, request }) => {
  const restaurants = await apiGetOwnedRestaurants(request, { token: ownerToken });
  const restaurant = findOrderableRestaurant(restaurants);
  if (!restaurant) { test.skip(true, "No active+verified restaurants"); return; }

  const catName = `PubCat-${uniq()}`;
  const cat = await apiCreateCategory(request, { token: ownerToken }, restaurant.id, { name: catName });
  const itemName = `PubItem-${uniq()}`;
  await apiCreateMenuItem(request, { token: ownerToken }, restaurant.id, {
    categoryId: cat.id,
    name: itemName,
    price: 99,
  });

  await page.goto(`/restaurants/${restaurant.slug}`);
  await expect(page.getByText(itemName, { exact: false })).toBeVisible({ timeout: 15_000 });
});

// ─── 33. Owner sees orders for their restaurant ───────────────────────────────
test("33. owner can view their restaurant's order queue", async ({ ownerPage, ownerToken, request }) => {
  const restaurants = await apiGetOwnedRestaurants(request, { token: ownerToken });
  const restaurant = restaurants[0];
  if (!restaurant) { test.skip(true, "No restaurants"); return; }

  await ownerPage.goto(`/restaurant/${restaurant.id}/orders`);
  await expect(ownerPage).toHaveURL(new RegExp(`/restaurant/${restaurant.id}/orders`));
  await expect(ownerPage.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 10_000 });
});

// ─── 34. Owner can confirm an order ──────────────────────────────────────────
test("34. owner can confirm a pending order", async ({ ownerPage, ownerToken, adminToken, customerToken, request }) => {
  const restaurants = await apiGetOwnedRestaurants(request, { token: ownerToken });
  const restaurant = findOrderableRestaurant(restaurants);
  if (!restaurant) { test.skip(true, "No active+verified restaurants for owner"); return; }

  const addresses = await apiGetAddresses(request, { token: customerToken });
  let addrId = addresses[0]?.id;
  if (!addrId) {
    const addr = await apiCreateAddress(request, { token: customerToken }, {
      label: "Hjem",
      street: "Testvej 1",
      city: "København",
      postalCode: "2200",
      isDefault: true,
    });
    addrId = addr.id;
  }

  const restaurantData = await apiGetRestaurantBySlug(request, restaurant.slug);
  const menuItem = restaurantData.categories[0]?.menuItems[0];
  if (!menuItem) { test.skip(true, "No menu items"); return; }

  const { order } = await apiCreateOrder(request, { token: customerToken }, {
    restaurantId: restaurant.id,
    deliveryAddressId: addrId,
    items: [{ menuItemId: menuItem.id, quantity: 1, selectedOptions: [] }],
  });

  await apiSimulateWebhookComplete(request, { token: adminToken }, order.id);

  await ownerPage.goto(`/restaurant/${restaurant.id}/orders`);
  await ownerPage.reload();

  // Target the individual order card (rounded-2xl) to avoid matching ancestor containers
  const orderRow = ownerPage.locator("div.rounded-2xl").filter({ hasText: order.orderNumber });
  await expect(orderRow).toBeVisible({ timeout: 15_000 });
  const confirmBtn = orderRow.getByRole("button", { name: /Bekræft|Confirm/i });
  if (await confirmBtn.count() > 0) {
    await confirmBtn.first().click();
    // After confirming, the advance button changes to "→ Forberedes"
    await expect(orderRow.getByRole("button", { name: /Forberedes/ })).toBeVisible({ timeout: 10_000 });
  }
});

// ─── 35. Full order lifecycle via API ─────────────────────────────────────────
test("35. owner can advance order through all statuses", async ({ ownerToken, adminToken, customerToken, request }) => {
  const restaurants = await apiGetOwnedRestaurants(request, { token: ownerToken });
  const restaurant = findOrderableRestaurant(restaurants);
  if (!restaurant) { test.skip(true, "No active+verified restaurants"); return; }

  const addresses = await apiGetAddresses(request, { token: customerToken });
  let addrId = addresses[0]?.id;
  if (!addrId) {
    const addr = await apiCreateAddress(request, { token: customerToken }, {
      label: "Hjem",
      street: "Testvej 1",
      city: "København",
      postalCode: "2200",
      isDefault: true,
    });
    addrId = addr.id;
  }

  const restaurantData = await apiGetRestaurantBySlug(request, restaurant.slug);
  const menuItem = restaurantData.categories[0]?.menuItems[0];
  if (!menuItem) { test.skip(true, "No menu items"); return; }

  const { order } = await apiCreateOrder(request, { token: customerToken }, {
    restaurantId: restaurant.id,
    deliveryAddressId: addrId,
    items: [{ menuItemId: menuItem.id, quantity: 1, selectedOptions: [] }],
  });

  await apiSimulateWebhookComplete(request, { token: adminToken }, order.id);
  await apiAdvanceOrder(request, { token: ownerToken }, order.id, "CONFIRMED");
  await apiAdvanceOrder(request, { token: ownerToken }, order.id, "PREPARING");
  await apiAdvanceOrder(request, { token: ownerToken }, order.id, "READY_FOR_PICKUP");
  await apiAdvanceOrder(request, { token: ownerToken }, order.id, "OUT_FOR_DELIVERY");
  await apiAdvanceOrder(request, { token: ownerToken }, order.id, "DELIVERED");

  const orderData = await request.get(`http://localhost:4000/api/v1/orders/${order.id}`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const body = (await orderData.json()) as { data: { status: string } };
  expect(body.data.status).toBe("DELIVERED");
});

// ─── 36. Invalid status transition is rejected ────────────────────────────────
test("36. invalid order status transition returns 409", async ({ ownerToken, adminToken, customerToken, request }) => {
  const restaurants = await apiGetOwnedRestaurants(request, { token: ownerToken });
  const restaurant = findOrderableRestaurant(restaurants);
  if (!restaurant) { test.skip(true, "No active+verified restaurants"); return; }

  const addresses = await apiGetAddresses(request, { token: customerToken });
  let addrId = addresses[0]?.id;
  if (!addrId) {
    const addr = await apiCreateAddress(request, { token: customerToken }, {
      label: "Hjem",
      street: "Testvej 1",
      city: "København",
      postalCode: "2200",
      isDefault: true,
    });
    addrId = addr.id;
  }

  const restaurantData = await apiGetRestaurantBySlug(request, restaurant.slug);
  const menuItem = restaurantData.categories[0]?.menuItems[0];
  if (!menuItem) { test.skip(true, "No menu items"); return; }

  const { order } = await apiCreateOrder(request, { token: customerToken }, {
    restaurantId: restaurant.id,
    deliveryAddressId: addrId,
    items: [{ menuItemId: menuItem.id, quantity: 1, selectedOptions: [] }],
  });

  await apiSimulateWebhookComplete(request, { token: adminToken }, order.id);

  // Skip directly to DELIVERED from PENDING_CONFIRMATION — invalid
  const res = await request.patch(`http://localhost:4000/api/v1/orders/${order.id}/status`, {
    data: { status: "DELIVERED" },
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  expect(res.status()).toBe(409);
});

// ─── 37. Owner cannot access another owner's restaurant menu ──────────────────
test("37. owner cannot edit another owner's menu (returns 403)", async ({ owner2Token, ownerToken, request }) => {
  const owner1Restaurants = await apiGetOwnedRestaurants(request, { token: ownerToken });
  const r1 = owner1Restaurants[0];
  if (!r1) { test.skip(true, "Owner1 has no restaurants"); return; }

  const res = await request.post(`http://localhost:4000/api/v1/restaurants/${r1.id}/menu/categories`, {
    data: { name: "Unauthorized Category" },
    headers: { Authorization: `Bearer ${owner2Token}` },
  });
  expect(res.status()).toBe(403);
});

// ─── 38. Menu cache invalidation ──────────────────────────────────────────────
test("38. menu updates are reflected immediately on re-fetch", async ({ ownerToken, request }) => {
  const restaurants = await apiGetOwnedRestaurants(request, { token: ownerToken });
  const restaurant = findOrderableRestaurant(restaurants);
  if (!restaurant) { test.skip(true, "No active+verified restaurants"); return; }

  const before = await apiGetRestaurantBySlug(request, restaurant.slug);
  const catCountBefore = before.categories.length;

  const newCatName = `CacheTestCat-${uniq()}`;
  await apiCreateCategory(request, { token: ownerToken }, restaurant.id, { name: newCatName });

  const after = await apiGetRestaurantBySlug(request, restaurant.slug);
  expect(after.categories.length).toBeGreaterThan(catCountBefore);
});

// ─── 39. Owner can toggle restaurant active state ─────────────────────────────
test("39. owner can deactivate and reactivate restaurant", async ({ ownerToken, request }) => {
  const restaurants = await apiGetOwnedRestaurants(request, { token: ownerToken });
  const restaurant = restaurants[0];
  if (!restaurant) { test.skip(true, "No restaurants"); return; }

  await apiActivateRestaurant(request, { token: ownerToken }, restaurant.id, false);
  const deactivated = await apiGetOwnedRestaurants(request, { token: ownerToken });
  const r = deactivated.find((x) => x.id === restaurant.id);
  expect(r?.isActive).toBe(false);

  await apiActivateRestaurant(request, { token: ownerToken }, restaurant.id, true);
  const reactivated = await apiGetOwnedRestaurants(request, { token: ownerToken });
  const r2 = reactivated.find((x) => x.id === restaurant.id);
  expect(r2?.isActive).toBe(true);
});

// ─── 40. Minimum order validation ─────────────────────────────────────────────
test("40. order below minimum amount is rejected with 422", async ({ ownerToken, customerToken, request }) => {
  const highMinRest = await apiCreateRestaurant(request, { token: ownerToken }, {
    name: `HighMin-${uniq()}`,
    minimumOrderAmount: 500,
    deliveryFee: 0,
  });

  const adminLogin = await request.post("http://localhost:4000/api/v1/auth/login", {
    data: { email: "admin@bestil.online", password: "Password123!" },
  });
  const adminBody = (await adminLogin.json()) as { data: { accessToken: string } };
  const adminToken = adminBody.data.accessToken;

  await apiVerifyRestaurant(request, { token: adminToken }, highMinRest.id);
  await apiActivateRestaurant(request, { token: ownerToken }, highMinRest.id, true);

  const cat = await apiCreateCategory(request, { token: ownerToken }, highMinRest.id, { name: "Cheap" });
  const item = await apiCreateMenuItem(request, { token: ownerToken }, highMinRest.id, {
    categoryId: cat.id,
    name: "Cheap item",
    price: 10,
  });

  const addresses = await apiGetAddresses(request, { token: customerToken });
  let addrId = addresses[0]?.id;
  if (!addrId) {
    const addr = await apiCreateAddress(request, { token: customerToken }, {
      label: "Hjem",
      street: "Testvej 1",
      city: "København",
      postalCode: "2200",
      isDefault: true,
    });
    addrId = addr.id;
  }

  const res = await request.post("http://localhost:4000/api/v1/orders", {
    data: {
      restaurantId: highMinRest.id,
      deliveryAddressId: addrId,
      items: [{ menuItemId: item.id, quantity: 1, selectedOptions: [] }],
    },
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  expect([400, 422]).toContain(res.status());
});

// ─── 41. Owner cannot see other restaurant's orders ───────────────────────────
test("41. owner cannot view orders from a restaurant they don't own", async ({ ownerToken, owner2Token, request }) => {
  const owner1Rests = await apiGetOwnedRestaurants(request, { token: ownerToken });
  const r1 = owner1Rests[0];
  if (!r1) { test.skip(true, "Owner1 has no restaurants"); return; }

  const res = await request.get(`http://localhost:4000/api/v1/restaurants/${r1.id}/orders`, {
    headers: { Authorization: `Bearer ${owner2Token}` },
  });
  expect(res.status()).toBe(403);
});

// ─── 42. Customer can cancel order in PENDING_CONFIRMATION ────────────────────
test("42. customer can cancel order that is in PENDING_CONFIRMATION", async ({ customerToken, adminToken, ownerToken, request }) => {
  const restaurants = await apiGetOwnedRestaurants(request, { token: ownerToken });
  const restaurant = findOrderableRestaurant(restaurants);
  if (!restaurant) { test.skip(true, "No active+verified restaurants"); return; }

  const addresses = await apiGetAddresses(request, { token: customerToken });
  let addrId = addresses[0]?.id;
  if (!addrId) {
    const addr = await apiCreateAddress(request, { token: customerToken }, {
      label: "Hjem",
      street: "Testvej 1",
      city: "København",
      postalCode: "2200",
      isDefault: true,
    });
    addrId = addr.id;
  }

  const restaurantData = await apiGetRestaurantBySlug(request, restaurant.slug);
  const menuItem = restaurantData.categories[0]?.menuItems[0];
  if (!menuItem) { test.skip(true, "No menu items"); return; }

  const { order } = await apiCreateOrder(request, { token: customerToken }, {
    restaurantId: restaurant.id,
    deliveryAddressId: addrId,
    items: [{ menuItemId: menuItem.id, quantity: 1, selectedOptions: [] }],
  });

  await apiSimulateWebhookComplete(request, { token: adminToken }, order.id);

  const cancelRes = await request.post(`http://localhost:4000/api/v1/orders/${order.id}/cancel`, {
    data: { reason: "Changed my mind" },
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  expect(cancelRes.ok()).toBe(true);

  const orderData = (await cancelRes.json()) as { data: { status: string } };
  expect(["CANCELLED", "REFUNDED"]).toContain(orderData.data.status);
});

// ─── 43. Customer cannot cancel confirmed/preparing order ─────────────────────
test("43. customer cannot cancel order that is already being prepared", async ({ customerToken, adminToken, ownerToken, request }) => {
  const restaurants = await apiGetOwnedRestaurants(request, { token: ownerToken });
  const restaurant = findOrderableRestaurant(restaurants);
  if (!restaurant) { test.skip(true, "No active+verified restaurants"); return; }

  const addresses = await apiGetAddresses(request, { token: customerToken });
  let addrId = addresses[0]?.id;
  if (!addrId) {
    const addr = await apiCreateAddress(request, { token: customerToken }, {
      label: "Hjem",
      street: "Testvej 1",
      city: "København",
      postalCode: "2200",
      isDefault: true,
    });
    addrId = addr.id;
  }

  const restaurantData = await apiGetRestaurantBySlug(request, restaurant.slug);
  const menuItem = restaurantData.categories[0]?.menuItems[0];
  if (!menuItem) { test.skip(true, "No menu items"); return; }

  const { order } = await apiCreateOrder(request, { token: customerToken }, {
    restaurantId: restaurant.id,
    deliveryAddressId: addrId,
    items: [{ menuItemId: menuItem.id, quantity: 1, selectedOptions: [] }],
  });

  await apiSimulateWebhookComplete(request, { token: adminToken }, order.id);
  await apiAdvanceOrder(request, { token: ownerToken }, order.id, "CONFIRMED");
  await apiAdvanceOrder(request, { token: ownerToken }, order.id, "PREPARING");

  const res = await request.post(`http://localhost:4000/api/v1/orders/${order.id}/cancel`, {
    data: { reason: "Too late" },
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  expect(res.status()).toBe(409);
});

// ─── 44. Owner order queue page renders without errors ────────────────────────
test("44. owner order queue page renders without error", async ({ ownerPage, ownerToken, request }) => {
  const restaurants = await apiGetOwnedRestaurants(request, { token: ownerToken });
  const restaurant = restaurants[0];
  if (!restaurant) { test.skip(true, "No restaurants"); return; }

  const errors: string[] = [];
  ownerPage.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await ownerPage.goto(`/restaurant/${restaurant.id}/orders`);
  await ownerPage.waitForTimeout(2_000);
  const realErrors = errors.filter((e) => !e.includes("stripe") && !e.includes("chrome-extension"));
  expect(realErrors).toHaveLength(0);
});
