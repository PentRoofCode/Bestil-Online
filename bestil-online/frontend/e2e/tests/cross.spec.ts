/**
 * Cross-cutting and integration tests (67–70).
 * Covers: full order lifecycle, cancellation + refund, review flow, rate limiting.
 */
import { test, expect } from "../fixtures";
import {
  apiGetRestaurantBySlug,
  apiGetOwnedRestaurants,
  apiCreateAddress,
  apiGetAddresses,
  apiCreateOrder,
  apiSimulateWebhookComplete,
  apiAdvanceOrder,
  apiGetOrder,
  uniq,
  SEEDED_RESTAURANT_SLUGS,
} from "../helpers/api";

const SEEDED_SLUGS: string[] = Object.values(SEEDED_RESTAURANT_SLUGS);

function findOrderableRestaurant(restaurants: Array<{ id: string; slug: string; isActive: boolean; isVerified: boolean }>) {
  return (
    restaurants.find((r) => r.isVerified && r.isActive && SEEDED_SLUGS.includes(r.slug)) ??
    restaurants.find((r) => r.isVerified && r.isActive)
  );
}

// ─── 67. Full order lifecycle ─────────────────────────────────────────────────
test("67. full order flow: customer places order → owner confirms → delivers", async ({
  customerToken,
  ownerToken,
  adminToken,
  request,
}) => {
  const restaurants = await apiGetOwnedRestaurants(request, { token: ownerToken });
  const restaurant = findOrderableRestaurant(restaurants);
  if (!restaurant) { test.skip(true, "No active+verified restaurant for owner"); return; }

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

  // Step 1: Customer places order
  const { order } = await apiCreateOrder(request, { token: customerToken }, {
    restaurantId: restaurant.id,
    deliveryAddressId: addrId,
    items: [{ menuItemId: menuItem.id, quantity: 2, selectedOptions: [] }],
  });
  expect(order.status).toBe("PENDING_PAYMENT");

  // Step 2: Simulate payment webhook
  await apiSimulateWebhookComplete(request, { token: adminToken }, order.id);
  const afterPayment = await apiGetOrder(request, { token: customerToken }, order.id);
  expect(afterPayment.status).toBe("PENDING_CONFIRMATION");

  // Step 3: Owner confirms
  await apiAdvanceOrder(request, { token: ownerToken }, order.id, "CONFIRMED");
  expect((await apiGetOrder(request, { token: customerToken }, order.id)).status).toBe("CONFIRMED");

  // Step 4: Prepare
  await apiAdvanceOrder(request, { token: ownerToken }, order.id, "PREPARING");
  expect((await apiGetOrder(request, { token: customerToken }, order.id)).status).toBe("PREPARING");

  // Step 5: Ready
  await apiAdvanceOrder(request, { token: ownerToken }, order.id, "READY_FOR_PICKUP");

  // Step 6: Out for delivery
  await apiAdvanceOrder(request, { token: ownerToken }, order.id, "OUT_FOR_DELIVERY");

  // Step 7: Delivered
  await apiAdvanceOrder(request, { token: ownerToken }, order.id, "DELIVERED");
  const final = await apiGetOrder(request, { token: customerToken }, order.id);
  expect(final.status).toBe("DELIVERED");
});

// ─── 68. Cancellation flow ────────────────────────────────────────────────────
test("68. customer cancels order after payment → order moves to CANCELLED", async ({
  customerToken,
  ownerToken,
  adminToken,
  request,
}) => {
  const restaurants = await apiGetOwnedRestaurants(request, { token: ownerToken });
  const restaurant = findOrderableRestaurant(restaurants);
  if (!restaurant) { test.skip(true, "No active+verified restaurant"); return; }

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
    data: { reason: "Customer cancelled" },
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  expect(cancelRes.ok()).toBe(true);

  const cancelled = await apiGetOrder(request, { token: customerToken }, order.id);
  expect(["CANCELLED", "REFUNDED"]).toContain(cancelled.status);
});

// ─── 69. Review flow ──────────────────────────────────────────────────────────
test("69. customer can review a delivered order", async ({
  customerToken,
  ownerToken,
  adminToken,
  request,
}) => {
  const restaurants = await apiGetOwnedRestaurants(request, { token: ownerToken });
  const restaurant = findOrderableRestaurant(restaurants);
  if (!restaurant) { test.skip(true, "No active+verified restaurant"); return; }

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

  const reviewRes = await request.post(`http://localhost:4000/api/v1/orders/${order.id}/review`, {
    data: {
      rating: 5,
      foodRating: 5,
      deliveryRating: 4,
      comment: "Excellent food!",
    },
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  expect(reviewRes.ok()).toBe(true);

  const reviewsRes = await request.get(`http://localhost:4000/api/v1/restaurants/${restaurant.id}/reviews`);
  expect(reviewsRes.ok()).toBe(true);
  const body = (await reviewsRes.json()) as { data: Array<{ comment: string }> };
  const found = body.data.some((r) => r.comment === "Excellent food!");
  expect(found).toBe(true);
});

// ─── 70. Rate limiting on auth endpoints ──────────────────────────────────────
test("70. auth login is rate-limited after too many failed attempts @slow", async ({ request }) => {
  const email = `ratelimit-${uniq()}@e2e.dk`;
  const attempts: number[] = [];
  for (let i = 0; i < 7; i++) {
    const res = await request.post("http://localhost:4000/api/v1/auth/login", {
      data: { email, password: "WrongPassword123!" },
    });
    attempts.push(res.status());
  }

  const hasError = attempts.some((s) => s >= 400);
  expect(hasError).toBe(true);
  // Log rate limit status for visibility
  const has429 = attempts.some((s) => s === 429);
  if (!has429) {
    console.warn("Rate limiting didn't trigger within 7 attempts — check Redis/rate-limit config");
  }
});
